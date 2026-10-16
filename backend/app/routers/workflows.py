"""Role workflow routers: Auth, Locations, Citizen Check-Before-You-Buy, Sub-Registrar, AC Land, Bank, Admin, Scenarios & Bangla OCR."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from fractions import Fraction
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.auth import create_access_token, get_optional_user
from app.database import DBConnection, get_db
from app.ledger.crypto import GENESIS_HASH, compute_deed_hash, sign_hash, verify_deed_record
from app.ledger.qr import build_verify_url, generate_qr_svg_data_uri
from app.rules.engine import evaluate_plot_and_transaction
from app.seed.seed_data import DEMO_USERS, append_audit_entry, to_bn_num, verify_password

router = APIRouter(tags=["Workflows & Role Dashboards"])


class LoginRequest(BaseModel):
    username: str
    password: str = "demo123"


class PreRegistrationCheckRequest(BaseModel):
    plot_id: int
    seller_id: int
    buyer_id: int
    requested_area_decimal: float = Field(gt=0)
    deed_type: str = "SALE"
    price_bdt: int = 1500000
    seller_nid: Optional[str] = None
    seller_name: Optional[str] = None
    check_rapid_resale: bool = False


class RegisterDeedRequest(PreRegistrationCheckRequest):
    force_hold: bool = False
    officer_notes_bn: Optional[str] = None


class MutationDecisionRequest(BaseModel):
    decision: str  # APPROVED or REJECTED
    reason_bn: str
    reason_en: Optional[str] = None


class CollateralCheckRequest(BaseModel):
    plot_id: int
    borrower_id: int
    requested_loan_bdt: int = Field(gt=0)
    area_mortgaged_decimal: float = Field(gt=0)


class CreateMortgageRequest(CollateralCheckRequest):
    bank_name_bn: str = "সোনালী ব্যাংক পিএলসি"
    bank_name_en: str = "Sonali Bank PLC"
    branch_bn: str = "সাভার শাখা, ঢাকা"


class OcrDemoRequest(BaseModel):
    preset_id: str = "bs_4101"
    raw_bangla_text: Optional[str] = None


def _load_plot_bundle(db: DBConnection, plot_id: int) -> dict[str, Any]:
    plot = db.fetchone("SELECT * FROM plots WHERE id = ?", (plot_id,))
    if not plot:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "PLOT_NOT_FOUND",
                "message_bn": "নির্বাচিত দাগ নম্বরটি খুঁজে পাওয়া যায়নি। মৌজা ও দাগ নম্বর পুনরায় যাচাই করুন।",
                "message_en": "Selected plot (Dag) was not found. Please check Mouza and Dag number.",
            },
        )
    location = db.fetchone("SELECT * FROM locations WHERE id = ?", (plot["location_id"],))
    khatians = db.fetchall(
        "SELECT * FROM khatian_records WHERE plot_id = ? ORDER BY survey_year ASC",
        (plot_id,),
    )
    ownerships = db.fetchall(
        """
        SELECT o.*, p.name_bn AS owner_name_bn, p.name_en AS owner_name_en,
               p.father_name_bn, p.father_name_en, p.nid, p.is_deceased, p.heirs_recorded,
               k.survey_type, k.khatian_no, k.khatian_no_bn
        FROM ownerships o
        JOIN persons p ON p.id = o.person_id
        JOIN khatian_records k ON k.id = o.khatian_id
        WHERE o.plot_id = ?
        ORDER BY o.is_latest DESC, o.id ASC
        """,
        (plot_id,),
    )
    latest_ownerships = [o for o in ownerships if int(o.get("is_latest", 0)) == 1]
    latest_owner_ids = [int(o["person_id"]) for o in latest_ownerships]
    latest_owner_persons: list[dict[str, Any]] = []
    for pid in latest_owner_ids:
        pr = db.fetchone("SELECT * FROM persons WHERE id = ?", (pid,))
        if pr:
            latest_owner_persons.append(pr)

    deeds = db.fetchall(
        """
        SELECT d.*,
               s.name_bn AS seller_name_bn, s.name_en AS seller_name_en,
               b.name_bn AS buyer_name_bn, b.name_en AS buyer_name_en
        FROM deeds d
        JOIN persons s ON s.id = d.seller_id
        JOIN persons b ON b.id = d.buyer_id
        WHERE d.plot_id = ?
        ORDER BY d.chain_index DESC
        """,
        (plot_id,),
    )
    for d in deeds:
        ver = verify_deed_record(d)
        d["ledger_valid"] = ver["is_valid"]
        d["verify_url"] = build_verify_url(int(d["id"]), d["content_hash"])

    mortgages = db.fetchall(
        """
        SELECT m.*, p.name_bn AS borrower_name_bn, p.name_en AS borrower_name_en
        FROM mortgages_liens m
        JOIN persons p ON p.id = m.borrower_id
        WHERE m.plot_id = ?
        ORDER BY m.id DESC
        """,
        (plot_id,),
    )
    mutations = db.fetchall(
        """
        SELECT mu.*, d.deed_no,
               s.name_bn AS seller_name_bn, s.name_en AS seller_name_en,
               b.name_bn AS buyer_name_bn, b.name_en AS buyer_name_en
        FROM mutations mu
        JOIN deeds d ON d.id = mu.deed_id
        JOIN persons s ON s.id = mu.seller_id
        JOIN persons b ON b.id = mu.buyer_id
        WHERE mu.plot_id = ?
        ORDER BY mu.id DESC
        """,
        (plot_id,),
    )

    return {
        "plot": plot,
        "location": location,
        "khatians": khatians,
        "ownerships": ownerships,
        "latest_ownerships": latest_ownerships,
        "latest_owner_persons": latest_owner_persons,
        "deeds": deeds,
        "mortgages": mortgages,
        "mutations": mutations,
    }


@router.post("/auth/login")
def login(req: LoginRequest, db: DBConnection = Depends(get_db)) -> dict[str, Any]:
    """Authenticates a demo user and returns a signed JWT bearer token."""
    user = db.fetchone("SELECT * FROM users WHERE username = ?", (req.username.strip().lower(),))
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(
            status_code=401,
            detail={
                "code": "INVALID_CREDENTIALS",
                "message_bn": "ইউজারনেম বা পাসওয়ার্ড সঠিক নয়। ডেমো অ্যাকাউন্টের জন্য 'demo123' ব্যবহার করুন।",
                "message_en": "Invalid username or password. Use 'demo123' for demo accounts.",
            },
        )
    token = create_access_token({"sub": user["username"], "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "full_name_bn": user["full_name_bn"],
            "full_name_en": user["full_name_en"],
            "role": user["role"],
            "office_bn": user["office_bn"],
            "office_en": user["office_en"],
        },
    }


@router.get("/auth/demo-users")
def list_demo_users() -> dict[str, Any]:
    """Lists all pre-configured demo accounts for 1-click role switching during judging."""
    return {
        "items": [
            {
                "username": u["username"],
                "password": u["password"],
                "full_name_bn": u["full_name_bn"],
                "full_name_en": u["full_name_en"],
                "role": u["role"],
                "office_bn": u["office_bn"],
                "office_en": u["office_en"],
            }
            for u in DEMO_USERS
        ]
    }


@router.get("/locations")
def list_locations(db: DBConnection = Depends(get_db)) -> dict[str, Any]:
    """Returns all seeded Mouzas with their plots for cascading dropdown selection."""
    locs = db.fetchall("SELECT * FROM locations ORDER BY id ASC")
    plots = db.fetchall(
        """
        SELECT p.*, l.mouza_bn, l.mouza_en, l.upazila_bn, l.upazila_en, l.district_bn, l.district_en
        FROM plots p
        JOIN locations l ON l.id = p.location_id
        ORDER BY p.id ASC
        """
    )
    return {"locations": locs, "plots": plots}


@router.get("/persons")
def list_persons(db: DBConnection = Depends(get_db)) -> dict[str, Any]:
    """Returns synthetic citizens from the Mock NID Registry."""
    persons = db.fetchall("SELECT * FROM persons ORDER BY id ASC")
    return {"items": persons, "total": len(persons)}


@router.get("/plots")
def list_plots(
    location_id: Optional[int] = None,
    dag_no: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=30, ge=1, le=100),
    db: DBConnection = Depends(get_db),
) -> dict[str, Any]:
    """Paginated list of plots with current owner and BS khatian summary."""
    where_clauses: list[str] = []
    params: list[Any] = []
    if location_id is not None:
        where_clauses.append("p.location_id = ?")
        params.append(location_id)
    if dag_no:
        where_clauses.append("(p.dag_no = ? OR p.dag_no_bn = ?)")
        params.extend([dag_no.strip(), dag_no.strip()])

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
    all_rows = db.fetchall(
        f"""
        SELECT p.*, l.division_bn, l.division_en, l.district_bn, l.district_en,
               l.upazila_bn, l.upazila_en, l.mouza_bn, l.mouza_en, l.jl_no
        FROM plots p
        JOIN locations l ON l.id = p.location_id
        {where_sql}
        ORDER BY p.id ASC
        """,
        params,
    )
    total = len(all_rows)
    start = (page - 1) * page_size
    sliced = all_rows[start : start + page_size]

    for row in sliced:
        owners = db.fetchall(
            """
            SELECT o.person_id, o.share_fraction, o.area_decimal, per.name_bn, per.name_en, per.nid
            FROM ownerships o
            JOIN persons per ON per.id = o.person_id
            WHERE o.plot_id = ? AND o.is_latest = 1
            """,
            (row["id"],),
        )
        row["current_owners"] = owners

    return {
        "items": sliced,
        "page": page,
        "page_size": page_size,
        "total": total,
    }


@router.get("/plots/{plot_id}/check-before-you-buy")
def citizen_check_before_you_buy(
    plot_id: int,
    requested_area_decimal: Optional[float] = None,
    seller_id: Optional[int] = None,
    db: DBConnection = Depends(get_db),
) -> dict[str, Any]:
    """Citizen 'Check Before You Buy' one-page plain-language risk report."""
    bundle = _load_plot_bundle(db, plot_id)

    seller_person = None
    if seller_id is not None:
        seller_person = db.fetchone("SELECT * FROM persons WHERE id = ?", (seller_id,))
    elif bundle["latest_owner_persons"]:
        seller_person = bundle["latest_owner_persons"][0]

    eval_area = (
        float(requested_area_decimal)
        if requested_area_decimal is not None
        else float(bundle["plot"]["total_area_decimal"]) * 0.5
    )

    risk = evaluate_plot_and_transaction(
        plot=bundle["plot"],
        khatian_records=bundle["khatians"],
        latest_ownerships=bundle["latest_ownerships"],
        latest_owner_persons=bundle["latest_owner_persons"],
        existing_deeds=bundle["deeds"],
        mortgages_liens=bundle["mortgages"],
        seller_person=seller_person,
        requested_area_decimal=eval_area,
        check_rapid_resale_flag=True,
    )

    return {
        "plot": bundle["plot"],
        "location": bundle["location"],
        "current_owners": bundle["latest_ownerships"],
        "khatian_chain": bundle["khatians"],
        "ownership_history": bundle["ownerships"],
        "deeds": bundle["deeds"],
        "mutations": bundle["mutations"],
        "mortgages": bundle["mortgages"],
        "risk_report": risk,
    }


@router.get("/scenarios")
def list_demo_scenarios(db: DBConnection = Depends(get_db)) -> dict[str, Any]:
    """Lists all 8 deliberate hackathon demo scenarios with live evaluated verdicts."""
    rows = db.fetchall("SELECT * FROM demo_scenarios ORDER BY scenario_no ASC")
    enriched: list[dict[str, Any]] = []
    for sc in rows:
        bundle = _load_plot_bundle(db, int(sc["plot_id"]))
        seller = db.fetchone("SELECT * FROM persons WHERE id = ?", (sc["seller_id"],))
        buyer = db.fetchone("SELECT * FROM persons WHERE id = ?", (sc["buyer_id"],))
        risk = evaluate_plot_and_transaction(
            plot=bundle["plot"],
            khatian_records=bundle["khatians"],
            latest_ownerships=bundle["latest_ownerships"],
            latest_owner_persons=bundle["latest_owner_persons"],
            existing_deeds=bundle["deeds"],
            mortgages_liens=bundle["mortgages"],
            seller_person=seller,
            requested_area_decimal=float(sc["requested_area_decimal"]),
            submitted_seller_nid=sc.get("seller_nid_override"),
        )
        enriched.append(
            {
                **sc,
                "plot": bundle["plot"],
                "location": bundle["location"],
                "seller": seller,
                "buyer": buyer,
                "live_verdict": risk["verdict"],
                "live_risk_score": risk["risk_score"],
                "live_flags": risk["flags"],
                "live_summary_bn": risk["summary_bn"],
                "live_summary_en": risk["summary_en"],
            }
        )
    return {"items": enriched, "total": len(enriched)}


@router.post("/registrar/pre-check")
def sub_registrar_pre_check(
    req: PreRegistrationCheckRequest,
    db: DBConnection = Depends(get_db),
) -> dict[str, Any]:
    """Sub-Registrar Pre-Registration Check Wizard: evaluates all 9 fraud rules before deed signing."""
    bundle = _load_plot_bundle(db, req.plot_id)
    seller = db.fetchone("SELECT * FROM persons WHERE id = ?", (req.seller_id,))
    buyer = db.fetchone("SELECT * FROM persons WHERE id = ?", (req.buyer_id,))
    if not seller or not buyer:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "PARTY_NOT_FOUND",
                "message_bn": "বিক্রেতা বা ক্রেতার তথ্য পাওয়া যায়নি।",
                "message_en": "Seller or buyer record was not found.",
            },
        )

    risk = evaluate_plot_and_transaction(
        plot=bundle["plot"],
        khatian_records=bundle["khatians"],
        latest_ownerships=bundle["latest_ownerships"],
        latest_owner_persons=bundle["latest_owner_persons"],
        existing_deeds=bundle["deeds"],
        mortgages_liens=bundle["mortgages"],
        seller_person=seller,
        requested_area_decimal=req.requested_area_decimal,
        submitted_seller_nid=req.seller_nid,
        submitted_seller_name=req.seller_name,
        check_rapid_resale_flag=req.check_rapid_resale,
    )

    now_iso = datetime.now(timezone.utc).isoformat()
    report_id = db.insert(
        """
        INSERT INTO risk_reports (
            plot_id, seller_id, buyer_id, requested_area_decimal,
            verdict, risk_score, flags_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            req.plot_id,
            req.seller_id,
            req.buyer_id,
            req.requested_area_decimal,
            risk["verdict"],
            risk["risk_score"],
            json.dumps(risk["flags"], ensure_ascii=False),
            now_iso,
        ),
    )
    db.commit()

    return {
        "report_id": report_id,
        "plot": bundle["plot"],
        "location": bundle["location"],
        "seller": seller,
        "buyer": buyer,
        "current_owners": bundle["latest_ownerships"],
        "khatian_chain": bundle["khatians"],
        "risk_report": risk,
    }


@router.post("/registrar/register-deed")
def sub_registrar_register_deed(
    req: RegisterDeedRequest,
    user: Optional[dict[str, Any]] = Depends(get_optional_user),
    db: DBConnection = Depends(get_db),
) -> dict[str, Any]:
    """Registers a new deed into the hash-chained ledger with Ed25519 signature + QR, or places on HOLD."""
    check_res = sub_registrar_pre_check(req, db=db)
    risk = check_res["risk_report"]

    last_deed = db.fetchone("SELECT content_hash, chain_index FROM deeds ORDER BY chain_index DESC LIMIT 1")
    prev_hash = last_deed["content_hash"] if last_deed else GENESIS_HASH
    next_index = (int(last_deed["chain_index"]) + 1) if last_deed else 1
    deed_no = f"DL-2026-{1000 + next_index}"
    now_iso = datetime.now(timezone.utc).isoformat()

    total_plot_area = float(check_res["plot"]["total_area_decimal"])
    ratio = min(1.0, req.requested_area_decimal / max(total_plot_area, 0.01))
    frac = Fraction(ratio).limit_denominator(16)
    share_str = f"{frac.numerator}/{frac.denominator}"

    status = "HELD" if (req.force_hold or risk["verdict"] == "HIGH_RISK") else "PENDING_MUTATION"
    registrar_username = (user or {}).get("username", "registrar")

    content_obj = {
        "deed_no": deed_no,
        "deed_type": req.deed_type,
        "seller_id": req.seller_id,
        "buyer_id": req.buyer_id,
        "plot_id": req.plot_id,
        "share_fraction": share_str,
        "area_decimal": round(float(req.requested_area_decimal), 2),
        "price_bdt": int(req.price_bdt),
        "registered_by": registrar_username,
        "created_at": now_iso,
    }
    canonical_str = json.dumps(content_obj, sort_keys=True, ensure_ascii=False)
    content_hash = compute_deed_hash(content_obj, prev_hash=prev_hash, chain_index=next_index)
    signature = sign_hash(content_hash)

    deed_id = db.insert(
        """
        INSERT INTO deeds (
            deed_no, deed_type, seller_id, buyer_id, plot_id,
            share_fraction, area_decimal, price_bdt, status,
            content_json, original_content_json, content_hash, prev_hash,
            signature, chain_index, registered_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            deed_no,
            req.deed_type,
            req.seller_id,
            req.buyer_id,
            req.plot_id,
            share_str,
            round(float(req.requested_area_decimal), 2),
            int(req.price_bdt),
            status,
            canonical_str,
            canonical_str,
            content_hash,
            prev_hash,
            signature,
            next_index,
            registrar_username,
            now_iso,
        ),
    )

    mutation_case_no = None
    if status == "PENDING_MUTATION":
        mutation_case_no = f"MUT-2026-{500 + next_index}"
        db.insert(
            """
            INSERT INTO mutations (
                case_no, deed_id, plot_id, seller_id, buyer_id,
                area_decimal, status, decision_reason_bn, decision_reason_en, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
            """,
            (
                mutation_case_no,
                deed_id,
                req.plot_id,
                req.seller_id,
                req.buyer_id,
                round(float(req.requested_area_decimal), 2),
                req.officer_notes_bn or "সাব-রেজিস্ট্রার কর্তৃক নিবন্ধিত ও ই-নামজারির জন্য প্রেরিত।",
                "Registered by Sub-Registrar and queued for AC Land e-Mutation.",
                now_iso,
            ),
        )

    append_audit_entry(
        db,
        actor_username=registrar_username,
        actor_role=(user or {}).get("role", "sub_registrar"),
        action="DEED_HELD" if status == "HELD" else "DEED_REGISTERED",
        entity_type="deed",
        entity_id=str(deed_id),
        details={
            "deed_no": deed_no,
            "status": status,
            "verdict": risk["verdict"],
            "area_decimal": round(float(req.requested_area_decimal), 2),
            "mutation_case_no": mutation_case_no,
        },
        created_at=now_iso,
    )
    db.commit()

    verify_url = build_verify_url(deed_id, content_hash)
    return {
        "deed_id": deed_id,
        "deed_no": deed_no,
        "status": status,
        "chain_index": next_index,
        "content_hash": content_hash,
        "prev_hash": prev_hash,
        "signature": signature,
        "verify_url": verify_url,
        "qr_svg_data_uri": generate_qr_svg_data_uri(verify_url),
        "mutation_case_no": mutation_case_no,
        "risk_report": risk,
        "message_bn": (
            f"দলিল নং {deed_no} ঝুঁকিপূর্ণ হওয়ায় স্থগিত (HOLD) রাখা হয়েছে।"
            if status == "HELD"
            else f"দলিল নং {deed_no} সফলভাবে ডিজিটাল স্বাক্ষরসহ লেজারে নিবন্ধিত হয়েছে এবং ই-নামজারি কেস ({mutation_case_no}) খোলা হয়েছে।"
        ),
        "message_en": (
            f"Deed {deed_no} placed on HOLD due to high fraud risk."
            if status == "HELD"
            else f"Deed {deed_no} cryptographically signed and registered; e-Mutation case ({mutation_case_no}) queued."
        ),
    }


@router.get("/mutations")
def list_mutations(
    status: Optional[str] = None,
    db: DBConnection = Depends(get_db),
) -> dict[str, Any]:
    """AC Land Mutation Queue with live deed ledger verification and risk flags."""
    where_sql = "WHERE m.status = ?" if status else ""
    params = (status,) if status else ()
    rows = db.fetchall(
        f"""
        SELECT m.*,
               d.deed_no, d.deed_type, d.content_json, d.original_content_json,
               d.content_hash, d.prev_hash, d.signature, d.chain_index,
               p.dag_no, p.dag_no_bn, p.total_area_decimal,
               l.mouza_bn, l.mouza_en, l.upazila_bn, l.upazila_en,
               s.name_bn AS seller_name_bn, s.name_en AS seller_name_en, s.nid AS seller_nid,
               b.name_bn AS buyer_name_bn, b.name_en AS buyer_name_en, b.nid AS buyer_nid
        FROM mutations m
        JOIN deeds d ON d.id = m.deed_id
        JOIN plots p ON p.id = m.plot_id
        JOIN locations l ON l.id = p.location_id
        JOIN persons s ON s.id = m.seller_id
        JOIN persons b ON b.id = m.buyer_id
        {where_sql}
        ORDER BY CASE WHEN m.status = 'PENDING' THEN 0 ELSE 1 END, m.id DESC
        """,
        params,
    )

    items: list[dict[str, Any]] = []
    for row in rows:
        deed_ver = verify_deed_record(row)
        bundle = _load_plot_bundle(db, int(row["plot_id"]))
        seller_person = db.fetchone("SELECT * FROM persons WHERE id = ?", (row["seller_id"],))
        risk = evaluate_plot_and_transaction(
            plot=bundle["plot"],
            khatian_records=bundle["khatians"],
            latest_ownerships=bundle["latest_ownerships"],
            latest_owner_persons=bundle["latest_owner_persons"],
            existing_deeds=[d for d in bundle["deeds"] if int(d["id"]) != int(row["deed_id"])]
            if deed_ver["is_valid"]
            else bundle["deeds"],
            mortgages_liens=bundle["mortgages"],
            seller_person=seller_person,
            requested_area_decimal=float(row["area_decimal"]),
        )
        items.append(
            {
                "id": row["id"],
                "case_no": row["case_no"],
                "deed_id": row["deed_id"],
                "deed_no": row["deed_no"],
                "plot_id": row["plot_id"],
                "dag_no": row["dag_no"],
                "dag_no_bn": row["dag_no_bn"],
                "mouza_bn": row["mouza_bn"],
                "mouza_en": row["mouza_en"],
                "upazila_bn": row["upazila_bn"],
                "upazila_en": row["upazila_en"],
                "seller_id": row["seller_id"],
                "seller_name_bn": row["seller_name_bn"],
                "seller_name_en": row["seller_name_en"],
                "buyer_id": row["buyer_id"],
                "buyer_name_bn": row["buyer_name_bn"],
                "buyer_name_en": row["buyer_name_en"],
                "area_decimal": row["area_decimal"],
                "status": row["status"],
                "decision_reason_bn": row["decision_reason_bn"],
                "decision_reason_en": row["decision_reason_en"],
                "decided_by": row["decided_by"],
                "decided_at": row["decided_at"],
                "created_at": row["created_at"],
                "deed_verification": deed_ver,
                "risk_report": risk,
            }
        )

    return {"items": items, "total": len(items)}


@router.post("/mutations/{mutation_id}/decide")
def decide_mutation_case(
    mutation_id: int,
    req: MutationDecisionRequest,
    user: Optional[dict[str, Any]] = Depends(get_optional_user),
    db: DBConnection = Depends(get_db),
) -> dict[str, Any]:
    """AC Land approves or rejects a mutation case; approval updates BS khatian ownerships & audit log."""
    mut = db.fetchone("SELECT * FROM mutations WHERE id = ?", (mutation_id,))
    if not mut:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "MUTATION_NOT_FOUND",
                "message_bn": "নামজারি কেসটি পাওয়া যায়নি।",
                "message_en": "Mutation case not found.",
            },
        )

    decision = req.decision.strip().upper()
    if decision not in ("APPROVED", "REJECTED"):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_DECISION",
                "message_bn": "সিদ্ধান্ত অবশ্যই APPROVED অথবা REJECTED হতে হবে।",
                "message_en": "Decision must be APPROVED or REJECTED.",
            },
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    officer = (user or {}).get("username", "acland")

    db.execute(
        """
        UPDATE mutations
        SET status = ?, decision_reason_bn = ?, decision_reason_en = ?, decided_by = ?, decided_at = ?
        WHERE id = ?
        """,
        (
            decision,
            req.reason_bn,
            req.reason_en or req.reason_bn,
            officer,
            now_iso,
            mutation_id,
        ),
    )

    if decision == "APPROVED":
        db.execute("UPDATE deeds SET status = 'MUTATED' WHERE id = ?", (mut["deed_id"],))
        plot = db.fetchone("SELECT * FROM plots WHERE id = ?", (mut["plot_id"],))
        bs_khatian = db.fetchone(
            "SELECT * FROM khatian_records WHERE plot_id = ? AND survey_type = 'BS'",
            (mut["plot_id"],),
        )
        if plot and bs_khatian:
            total_area = max(float(plot["total_area_decimal"]), 0.01)
            transfer_area = float(mut["area_decimal"])
            seller_own = db.fetchone(
                "SELECT * FROM ownerships WHERE plot_id = ? AND person_id = ? AND is_latest = 1",
                (mut["plot_id"], mut["seller_id"]),
            )
            if seller_own:
                new_seller_area = max(0.0, round(float(seller_own["area_decimal"]) - transfer_area, 2))
                if new_seller_area <= 0.01:
                    db.execute("UPDATE ownerships SET is_latest = 0, area_decimal = 0 WHERE id = ?", (seller_own["id"],))
                else:
                    s_frac = Fraction(new_seller_area / total_area).limit_denominator(16)
                    db.execute(
                        "UPDATE ownerships SET area_decimal = ?, share_float = ?, share_fraction = ? WHERE id = ?",
                        (
                            new_seller_area,
                            round(new_seller_area / total_area, 4),
                            f"{s_frac.numerator}/{s_frac.denominator}",
                            seller_own["id"],
                        ),
                    )
            b_frac = Fraction(min(1.0, transfer_area / total_area)).limit_denominator(16)
            db.insert(
                """
                INSERT INTO ownerships (
                    khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest
                ) VALUES (?, ?, ?, ?, ?, ?, 1)
                """,
                (
                    bs_khatian["id"],
                    mut["plot_id"],
                    mut["buyer_id"],
                    f"{b_frac.numerator}/{b_frac.denominator}",
                    round(transfer_area / total_area, 4),
                    round(transfer_area, 2),
                ),
            )
    else:
        db.execute("UPDATE deeds SET status = 'REJECTED' WHERE id = ?", (mut["deed_id"],))

    append_audit_entry(
        db,
        actor_username=officer,
        actor_role=(user or {}).get("role", "ac_land"),
        action=f"MUTATION_{decision}",
        entity_type="mutation",
        entity_id=str(mutation_id),
        details={
            "case_no": mut["case_no"],
            "deed_id": mut["deed_id"],
            "plot_id": mut["plot_id"],
            "decision": decision,
            "reason_bn": req.reason_bn,
        },
        created_at=now_iso,
    )
    db.commit()

    return {
        "mutation_id": mutation_id,
        "case_no": mut["case_no"],
        "status": decision,
        "decided_by": officer,
        "decided_at": now_iso,
        "message_bn": (
            f"নামজারি কেস নং {mut['case_no']} অনুমোদিত হয়েছে এবং বিএস খতিয়ানে ক্রেতার মালিকানা হালনাগাদ করা হয়েছে।"
            if decision == "APPROVED"
            else f"নামজারি কেস নং {mut['case_no']} না-মঞ্জুর (বাতিল) করা হয়েছে।"
        ),
        "message_en": (
            f"Mutation case {mut['case_no']} approved and BS khatian ownership updated."
            if decision == "APPROVED"
            else f"Mutation case {mut['case_no']} rejected."
        ),
    }


@router.get("/mortgages")
def list_mortgages(db: DBConnection = Depends(get_db)) -> dict[str, Any]:
    """Lists all active and released bank mortgages across plots."""
    rows = db.fetchall(
        """
        SELECT m.*,
               p.dag_no, p.dag_no_bn, p.total_area_decimal,
               l.mouza_bn, l.mouza_en, l.upazila_bn, l.upazila_en,
               per.name_bn AS borrower_name_bn, per.name_en AS borrower_name_en, per.nid AS borrower_nid
        FROM mortgages_liens m
        JOIN plots p ON p.id = m.plot_id
        JOIN locations l ON l.id = p.location_id
        JOIN persons per ON per.id = m.borrower_id
        ORDER BY CASE WHEN m.status = 'ACTIVE' THEN 0 ELSE 1 END, m.id DESC
        """
    )
    return {"items": rows, "total": len(rows)}


@router.post("/mortgages/collateral-check")
def bank_collateral_check(
    req: CollateralCheckRequest,
    db: DBConnection = Depends(get_db),
) -> dict[str, Any]:
    """Bank Officer Collateral Check: verifies ownership, chain integrity, and existing active liens."""
    bundle = _load_plot_bundle(db, req.plot_id)
    borrower = db.fetchone("SELECT * FROM persons WHERE id = ?", (req.borrower_id,))
    if not borrower:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "BORROWER_NOT_FOUND",
                "message_bn": "ঋণগ্রহীতার তথ্য পাওয়া যায়নি।",
                "message_en": "Borrower not found.",
            },
        )

    risk = evaluate_plot_and_transaction(
        plot=bundle["plot"],
        khatian_records=bundle["khatians"],
        latest_ownerships=bundle["latest_ownerships"],
        latest_owner_persons=bundle["latest_owner_persons"],
        existing_deeds=bundle["deeds"],
        mortgages_liens=bundle["mortgages"],
        seller_person=borrower,
        requested_area_decimal=req.area_mortgaged_decimal,
    )
    return {
        "plot": bundle["plot"],
        "location": bundle["location"],
        "borrower": borrower,
        "active_mortgages": [m for m in bundle["mortgages"] if m["status"] == "ACTIVE"],
        "risk_report": risk,
        "can_create_lien": risk["verdict"] == "SAFE",
    }


@router.post("/mortgages")
def create_mortgage_lien(
    req: CreateMortgageRequest,
    user: Optional[dict[str, Any]] = Depends(get_optional_user),
    db: DBConnection = Depends(get_db),
) -> dict[str, Any]:
    """Creates a new bank mortgage lien if and only if no active lien or ownership fraud exists."""
    check = bank_collateral_check(req, db=db)
    if check["risk_report"]["verdict"] == "HIGH_RISK":
        raise HTTPException(
            status_code=409,
            detail={
                "code": "COLLATERAL_HIGH_RISK_BLOCKED",
                "message_bn": check["risk_report"]["flags"][0]["message_bn"]
                if check["risk_report"]["flags"]
                else "এই জমিতে ইতিমধ্যে সক্রিয় বন্ধক বা মালিকানা ঝুঁকি থাকায় নতুন ঋণ বন্ধক ব্লক করা হয়েছে।",
                "message_en": check["risk_report"]["flags"][0]["message_en"]
                if check["risk_report"]["flags"]
                else "Double mortgage or ownership risk detected; collateral lien creation blocked.",
                "risk_report": check["risk_report"],
            },
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    lien_id = db.insert(
        """
        INSERT INTO mortgages_liens (
            plot_id, borrower_id, bank_name_bn, bank_name_en,
            branch_bn, amount_bdt, area_mortgaged_decimal, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
        """,
        (
            req.plot_id,
            req.borrower_id,
            req.bank_name_bn,
            req.bank_name_en,
            req.branch_bn,
            req.requested_loan_bdt,
            req.area_mortgaged_decimal,
            now_iso,
        ),
    )
    append_audit_entry(
        db,
        actor_username=(user or {}).get("username", "bank"),
        actor_role=(user or {}).get("role", "bank_officer"),
        action="MORTGAGE_LIEN_CREATED",
        entity_type="mortgage",
        entity_id=str(lien_id),
        details={
            "plot_id": req.plot_id,
            "bank_name_en": req.bank_name_en,
            "amount_bdt": req.requested_loan_bdt,
            "area_mortgaged_decimal": req.area_mortgaged_decimal,
        },
        created_at=now_iso,
    )
    db.commit()

    return {
        "lien_id": lien_id,
        "status": "ACTIVE",
        "message_bn": f"দাগ নং {check['plot']['dag_no_bn']}-এ ৳{to_bn_num(f'{req.requested_loan_bdt:,}')} টাকার ব্যাংক বন্ধক সফলভাবে নিবন্ধিত হয়েছে।",
        "message_en": f"Mortgage lien of BDT {req.requested_loan_bdt:,} registered on Dag {check['plot']['dag_no']}.",
    }


@router.post("/mortgages/{lien_id}/release")
def release_mortgage_lien(
    lien_id: int,
    user: Optional[dict[str, Any]] = Depends(get_optional_user),
    db: DBConnection = Depends(get_db),
) -> dict[str, Any]:
    """Releases an active bank mortgage lien upon loan repayment."""
    lien = db.fetchone("SELECT * FROM mortgages_liens WHERE id = ?", (lien_id,))
    if not lien:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "LIEN_NOT_FOUND",
                "message_bn": "বন্ধক রেকর্ডটি পাওয়া যায়নি।",
                "message_en": "Mortgage lien record not found.",
            },
        )
    now_iso = datetime.now(timezone.utc).isoformat()
    db.execute(
        "UPDATE mortgages_liens SET status = 'RELEASED', released_at = ? WHERE id = ?",
        (now_iso, lien_id),
    )
    append_audit_entry(
        db,
        actor_username=(user or {}).get("username", "bank"),
        actor_role=(user or {}).get("role", "bank_officer"),
        action="MORTGAGE_LIEN_RELEASED",
        entity_type="mortgage",
        entity_id=str(lien_id),
        details={"plot_id": lien["plot_id"], "bank_name_en": lien["bank_name_en"]},
        created_at=now_iso,
    )
    db.commit()
    return {
        "lien_id": lien_id,
        "status": "RELEASED",
        "released_at": now_iso,
        "message_bn": "ব্যাংক বন্ধক সফলভাবে অবমুক্ত (Release) করা হয়েছে।",
        "message_en": "Bank mortgage lien released successfully.",
    }


@router.get("/audit-log")
def get_audit_log(db: DBConnection = Depends(get_db)) -> dict[str, Any]:
    """Returns the append-only hash-chained audit log."""
    rows = db.fetchall("SELECT * FROM audit_log ORDER BY chain_index DESC")
    for r in rows:
        try:
            r["details"] = json.loads(r["details_json"])
        except Exception:
            r["details"] = {}
    return {"items": rows, "total": len(rows)}


@router.post("/ocr/khatian-demo")
def parse_dummy_khatian_ocr(req: OcrDemoRequest) -> dict[str, Any]:
    """Stretch Goal P5: Parses a dummy Bangla Khatian scan into structured fields."""
    presets = {
        "bs_4101": {
            "raw_ocr_text_bn": (
                "বাংলাদেশ ফরম নং ৫৪৬২ (সংশোধিত)\n"
                "বিএস খতিয়ান নং: ৪১০১ | মৌজা: বিরুলিয়া | জে.এল নং: ১২ | উপজেলা: সাভার | জেলা: ঢাকা\n"
                "মালিকের নাম: মো. রফিকুল ইসলাম, পিতা: মৃত হাজী আবদুল জব্বার\n"
                "অংশ: ১/১ (এক অংশ) | দাগ নং: ১০১ | জমির শ্রেণী: ভিটা (আবাসিক) | মোট পরিমাণ: ২০.০০ শতাংশ"
            ),
            "structured": {
                "survey_type": "BS",
                "khatian_no": "4101",
                "khatian_no_bn": "৪১০১",
                "mouza_bn": "বিরুলিয়া",
                "mouza_en": "Birulia",
                "jl_no": "12",
                "upazila_bn": "সাভার",
                "district_bn": "ঢাকা",
                "owner_name_bn": "মো. রফিকুল ইসলাম",
                "father_name_bn": "মৃত হাজী আবদুল জব্বার",
                "share_fraction": "1/1",
                "dag_no": "101",
                "dag_no_bn": "১০১",
                "land_type_bn": "ভিটা (আবাসিক)",
                "area_decimal": 20.0,
                "matched_plot_id": 1,
            },
        },
        "bs_4107_mismatch": {
            "raw_ocr_text_bn": (
                "বাংলাদেশ ফরম নং ৫৪৬২ (সংশোধিত)\n"
                "বিএস খতিয়ান নং: ৪১০৭ | মৌজা: বিরুলিয়া | জে.এল নং: ১২ | উপজেলা: সাভার | জেলা: ঢাকা\n"
                "মালিকের নাম: মো. শহিদুল ইসলাম, পিতা: মৃত ইসমাইল হোসেন\n"
                "অংশ: ১/১ | দাগ নং: ১০৭ | জমির শ্রেণী: ভিটা | মোট পরিমাণ: ২৬.০০ শতাংশ (আরএস খতিয়ানে ছিল ১৮.০০ শতাংশ)"
            ),
            "structured": {
                "survey_type": "BS",
                "khatian_no": "4107",
                "khatian_no_bn": "৪১০৭",
                "mouza_bn": "বিরুলিয়া",
                "mouza_en": "Birulia",
                "jl_no": "12",
                "upazila_bn": "সাভার",
                "district_bn": "ঢাকা",
                "owner_name_bn": "মো. শহিদুল ইসলাম",
                "father_name_bn": "মৃত ইসমাইল হোসেন",
                "share_fraction": "1/1",
                "dag_no": "107",
                "dag_no_bn": "১০৭",
                "land_type_bn": "ভিটা (আবাসিক)",
                "area_decimal": 26.0,
                "matched_plot_id": 7,
            },
        },
    }
    chosen = presets.get(req.preset_id, presets["bs_4101"])
    return {
        "engine": "Tesseract OCR (ben) + BhumiShield Field Parser (Demo)",
        "preset_id": req.preset_id,
        "raw_ocr_text_bn": req.raw_bangla_text or chosen["raw_ocr_text_bn"],
        "extracted_fields": chosen["structured"],
        "confidence": 0.97,
        "message_bn": "ডামি খতিয়ান স্ক্যান হতে বাংলা টেক্সট ও ফিল্ডসমূহ সফলভাবে এক্সট্রাক্ট করা হয়েছে।",
        "message_en": "Bangla text and structured fields extracted from dummy khatian scan.",
    }
