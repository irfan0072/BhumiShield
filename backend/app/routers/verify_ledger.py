"""Tamper-evident deed verification, full ledger audit, QR generation, and live tamper demo endpoints."""
from __future__ import annotations

import json
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_optional_user
from app.database import DBConnection, get_db
from app.ledger.crypto import verify_deed_record, verify_entire_ledger
from app.ledger.qr import build_verify_url, generate_qr_svg_data_uri
from app.seed.seed_data import append_audit_entry

router = APIRouter(tags=["Ledger & Verification"])


class TamperRequest(BaseModel):
    new_area_decimal: Optional[float] = None
    new_price_bdt: Optional[int] = None


def _get_deed_with_context(db: DBConnection, deed_id_or_no: str) -> dict[str, Any]:
    if str(deed_id_or_no).isdigit():
        deed = db.fetchone("SELECT * FROM deeds WHERE id = ?", (int(deed_id_or_no),))
    else:
        deed = db.fetchone("SELECT * FROM deeds WHERE deed_no = ?", (str(deed_id_or_no).strip(),))

    if not deed:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "DEED_NOT_FOUND",
                "message_bn": f"দলিল নং '{deed_id_or_no}' খুঁজে পাওয়া যায়নি। সঠিক দলিল নম্বর বা QR কোড ব্যবহার করুন।",
                "message_en": f"Deed '{deed_id_or_no}' was not found. Please check the deed number or QR code.",
            },
        )
    return deed


@router.get("/verify/deed/{deed_id_or_no}")
def verify_single_deed(
    deed_id_or_no: str,
    h: Optional[str] = None,
    db: DBConnection = Depends(get_db),
) -> dict[str, Any]:
    """Public endpoint: recomputes SHA-256 hash, checks Ed25519 signature and hash chain linkage."""
    deed = _get_deed_with_context(db, deed_id_or_no)

    # Check previous deed in chain to verify chain linkage
    expected_prev_hash = "0" * 64
    if int(deed["chain_index"]) > 1:
        prev_deed = db.fetchone(
            "SELECT * FROM deeds WHERE chain_index = ?",
            (int(deed["chain_index"]) - 1,),
        )
        if prev_deed:
            prev_ver = verify_deed_record(prev_deed)
            expected_prev_hash = prev_ver["recomputed_hash"]

    verification = verify_deed_record(deed, expected_prev_hash=expected_prev_hash)

    # Check short hash from QR parameter if provided
    qr_short_hash_matches = True
    if h:
        qr_short_hash_matches = verification["recomputed_hash"].startswith(h.strip())
        if not qr_short_hash_matches:
            verification["is_valid"] = False
            verification["verdict"] = "HIGH_RISK"

    plot = db.fetchone("SELECT * FROM plots WHERE id = ?", (deed["plot_id"],))
    loc = db.fetchone("SELECT * FROM locations WHERE id = ?", (plot["location_id"],)) if plot else None
    seller = db.fetchone("SELECT * FROM persons WHERE id = ?", (deed["seller_id"],))
    buyer = db.fetchone("SELECT * FROM persons WHERE id = ?", (deed["buyer_id"],))
    bs_khatian = db.fetchone(
        "SELECT * FROM khatian_records WHERE plot_id = ? AND survey_type = 'BS'",
        (deed["plot_id"],),
    )

    verify_url = build_verify_url(int(deed["id"]), deed["content_hash"])
    qr_svg_uri = generate_qr_svg_data_uri(verify_url)

    reasons_bn: list[str] = []
    reasons_en: list[str] = []
    if verification["is_valid"]:
        reasons_bn = [
            f"দলিল নং {deed['deed_no']}-এর সকল তথ্য সাব-রেজিস্ট্রি লেজারের ডিজিটাল স্বাক্ষরের সাথে হুবহু মিলেছে।",
            f"পূর্ববর্তী দলিলের হ্যাশ চেইন (#{deed['chain_index']}) অক্ষুণ্ণ রয়েছে—নিবন্ধনের পর কোনো তথ্য পরিবর্তন করা হয়নি।",
            f"বিক্রেতা ({seller['name_bn'] if seller else ''}) হতে ক্রেতা ({buyer['name_bn'] if buyer else ''})-এর নিকট {deed['area_decimal']} শতাংশ জমি হস্তান্তর রেকর্ডকৃত।",
        ]
        reasons_en = [
            f"Deed {deed['deed_no']} matches the Sub-Registry cryptographic Ed25519 signature.",
            f"Hash chain link (#{deed['chain_index']}) is unbroken—zero post-registration edits.",
            f"Recorded transfer of {deed['area_decimal']} decimals from {seller['name_en'] if seller else ''} to {buyer['name_en'] if buyer else ''}.",
        ]
        next_steps_bn = [
            "জমি কেনার আগে 'জমি কেনার আগে যাচাই করুন' অপশনে গিয়ে দাগ নম্বর দিয়ে ব্যাংক বন্ধক ও খতিয়ান চেইন দেখে নিন।",
            "নামজারি (মিউটেশন) সম্পন্ন হয়েছে কি না তা এসি ল্যান্ড অফিসের স্ট্যাটাসে যাচাই করুন।",
        ]
        next_steps_en = [
            "Run a 'Check Before You Buy' plot check to inspect bank liens and CS-BS khatian history.",
            "Confirm mutation status with the AC Land office.",
        ]
    else:
        for tf in verification["tampered_fields"]:
            if tf["field"] == "area_decimal":
                reasons_bn.append(
                    f"নিবন্ধনের সময় জমির পরিমাণ ছিল {tf['original_value']} শতাংশ, কিন্তু পরে তা অবৈধভাবে পরিবর্তন করে {tf['current_value']} শতাংশ করা হয়েছে!"
                )
                reasons_en.append(
                    f"Registered area was {tf['original_value']} decimals, but storage was tampered to {tf['current_value']} decimals!"
                )
            else:
                reasons_bn.append(
                    f"'{tf['field']}' তথ্যটি মূল দলিল ({tf['original_value']}) থেকে পরিবর্তন করে ({tf['current_value']}) করা হয়েছে।"
                )
                reasons_en.append(
                    f"Field '{tf['field']}' was altered from '{tf['original_value']}' to '{tf['current_value']}'."
                )
        if not reasons_bn:
            reasons_bn.append("এই দলিলের ডিজিটাল হ্যাশ বা পূর্ববর্তী চেইনের সংযোগ ভেঙে গেছে।")
            reasons_en.append("Cryptographic hash or previous chain link does not match the signed record.")

        next_steps_bn = [
            "এই দলিলের ওপর ভিত্তি করে কোনো আর্থিক লেনদেন বা নামজারি অনুমোদন করবেন না।",
            "নিকটস্থ সাব-রেজিস্ট্রি অফিসে মূল বালাম বহি ও মূল দলিলের কপি ম্যানুয়ালি পরীক্ষা করুন।",
        ]
        next_steps_en = [
            "Do not approve any payment or mutation based on this altered deed record.",
            "Inspect the physical registry volume at the Sub-Registry office immediately.",
        ]

    return {
        "verification": verification,
        "qr_short_hash_matches": qr_short_hash_matches,
        "verify_url": verify_url,
        "qr_svg_data_uri": qr_svg_uri,
        "deed": {
            "id": deed["id"],
            "deed_no": deed["deed_no"],
            "deed_type": deed["deed_type"],
            "status": deed["status"],
            "share_fraction": deed["share_fraction"],
            "area_decimal": float(json.loads(deed["content_json"]).get("area_decimal", deed["area_decimal"])),
            "original_area_decimal": float(
                json.loads(deed["original_content_json"]).get("area_decimal", deed["area_decimal"])
            ),
            "price_bdt": deed["price_bdt"],
            "registered_by": deed["registered_by"],
            "created_at": deed["created_at"],
            "chain_index": deed["chain_index"],
        },
        "plot": plot,
        "location": loc,
        "bs_khatian": bs_khatian,
        "seller": seller,
        "buyer": buyer,
        "reasons_bn": reasons_bn,
        "reasons_en": reasons_en,
        "next_steps_bn": next_steps_bn,
        "next_steps_en": next_steps_en,
        "disclaimer_bn": "বিশেষ দ্রষ্টব্য: ভূমি সুরক্ষা শুধুমাত্র ঝুঁকি চিহ্নিত করে; চূড়ান্ত আইনি সিদ্ধান্ত সংশ্লিষ্ট সরকারি কর্মকর্তার।",
        "disclaimer_en": "Disclaimer: BhumiShield flags risk for a human officer to decide. It never declares final legal truth.",
    }


@router.get("/ledger/verify")
def verify_full_ledger_endpoint(
    limit: int = 25,
    db: DBConnection = Depends(get_db),
) -> dict[str, Any]:
    """Recomputes hashes and verifies Ed25519 signatures across the entire deed hash chain."""
    all_deeds = db.fetchall("SELECT * FROM deeds ORDER BY chain_index ASC")
    summary = verify_entire_ledger(all_deeds)

    # Include first 12 deeds (where hero demo scenarios live) + most recent deeds for UI chain visualizer
    highlighted_rows = all_deeds[:10] + (all_deeds[-max(0, limit - 10) :] if len(all_deeds) > 10 else [])
    seen_ids: set[int] = set()
    chain_items: list[dict[str, Any]] = []
    for d in highlighted_rows:
        if int(d["id"]) in seen_ids:
            continue
        seen_ids.add(int(d["id"]))
        ver = verify_deed_record(d)
        chain_items.append(
            {
                "id": d["id"],
                "deed_no": d["deed_no"],
                "deed_type": d["deed_type"],
                "plot_id": d["plot_id"],
                "chain_index": d["chain_index"],
                "area_decimal": float(json.loads(d["content_json"]).get("area_decimal", d["area_decimal"])),
                "original_area_decimal": float(
                    json.loads(d["original_content_json"]).get("area_decimal", d["area_decimal"])
                ),
                "created_at": d["created_at"],
                "is_valid": ver["is_valid"],
                "hash_valid": ver["hash_valid"],
                "signature_valid": ver["signature_valid"],
                "stored_hash": ver["stored_hash"],
                "recomputed_hash": ver["recomputed_hash"],
                "prev_hash": ver["prev_hash"],
                "tampered_fields": ver["tampered_fields"],
            }
        )

    summary["chain_sample"] = chain_items
    return summary


@router.post("/ledger/tamper/{deed_id}")
def simulate_deed_tampering(
    deed_id: int,
    body: Optional[TamperRequest] = None,
    user: Optional[dict[str, Any]] = Depends(get_optional_user),
    db: DBConnection = Depends(get_db),
) -> dict[str, Any]:
    """DEMO-ONLY:Directly alters a stored deed's JSON content without updating its Ed25519 signature.

    Used on stage to show live tamper detection turning a deed from Green (Safe) to Red (Tampered).
    """
    deed = db.fetchone("SELECT * FROM deeds WHERE id = ?", (deed_id,))
    if not deed:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "DEED_NOT_FOUND",
                "message_bn": "দলিলটি পাওয়া যায়নি।",
                "message_en": "Deed not found.",
            },
        )

    content = json.loads(deed["content_json"])
    orig_content = json.loads(deed["original_content_json"])
    orig_area = float(orig_content.get("area_decimal", deed["area_decimal"]))
    tampered_area = (
        float(body.new_area_decimal)
        if (body and body.new_area_decimal is not None)
        else round(orig_area + 15.0, 2)
    )
    content["area_decimal"] = tampered_area
    if body and body.new_price_bdt is not None:
        content["price_bdt"] = int(body.new_price_bdt)

    db.execute(
        "UPDATE deeds SET content_json = ?, area_decimal = ? WHERE id = ?",
        (json.dumps(content, sort_keys=True, ensure_ascii=False), tampered_area, deed_id),
    )
    user_dict = user if isinstance(user, dict) else {}
    append_audit_entry(
        db,
        actor_username=user_dict.get("username", "admin"),
        actor_role=user_dict.get("role", "admin"),
        action="DEMO_SIMULATE_TAMPER",
        entity_type="deed",
        entity_id=str(deed_id),
        details={
            "deed_no": deed["deed_no"],
            "original_area_decimal": orig_area,
            "tampered_area_decimal": tampered_area,
            "note_bn": "ডেমো সিমুলেশন: ডাটাবেজে দলিলের জমির পরিমাণ পরিবর্তন করা হয়েছে (হ্যাশ অমিল প্রদর্শনের জন্য)",
        },
    )
    db.commit()
    return verify_single_deed(str(deed_id), db=db)


@router.post("/ledger/restore/{deed_id}")
def restore_tampered_deed(
    deed_id: int,
    user: Optional[dict[str, Any]] = Depends(get_optional_user),
    db: DBConnection = Depends(get_db),
) -> dict[str, Any]:
    """DEMO-ONLY: Restores a tampered deed back to its original signed JSON payload."""
    deed = db.fetchone("SELECT * FROM deeds WHERE id = ?", (deed_id,))
    if not deed:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "DEED_NOT_FOUND",
                "message_bn": "দলিলটি পাওয়া যায়নি।",
                "message_en": "Deed not found.",
            },
        )

    orig_content = json.loads(deed["original_content_json"])
    orig_area = float(orig_content.get("area_decimal", deed["area_decimal"]))

    db.execute(
        "UPDATE deeds SET content_json = ?, area_decimal = ? WHERE id = ?",
        (deed["original_content_json"], orig_area, deed_id),
    )
    user_dict = user if isinstance(user, dict) else {}
    append_audit_entry(
        db,
        actor_username=user_dict.get("username", "admin"),
        actor_role=user_dict.get("role", "admin"),
        action="DEMO_RESTORE_DEED",
        entity_type="deed",
        entity_id=str(deed_id),
        details={
            "deed_no": deed["deed_no"],
            "restored_area_decimal": orig_area,
            "note_bn": "ডেমো সিমুলেশন: দলিলের মূল তথ্য পুনরুদ্ধার করা হয়েছে",
        },
    )
    db.commit()
    return verify_single_deed(str(deed_id), db=db)
