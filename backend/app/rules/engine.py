"""Pure, independent fraud and discrepancy rules engine for BhumiShield.

Every rule function is pure (takes plain dicts/lists, performs no network or DB I/O)
and returns either `None` (when clean) or a structured flag dict:
`{rule_id, severity, score_delta, title_bn, title_en, message_bn, message_en, evidence}`.

IMPORTANT DESIGN PRINCIPLE:
BhumiShield is an advisory trust layer. It flags risk for a human officer to decide
and never declares final legal truth.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from app.config import RAPID_RESALE_DAYS
from app.ledger.crypto import verify_deed_record
from app.rules.mock_nid import verify_mock_nid

BN_DIGITS = str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")


def _bn(val: Any) -> str:
    return str(val).translate(BN_DIGITS)


def check_seller_not_owner(
    seller_id: Optional[int],
    latest_ownerships: list[dict[str, Any]],
    seller_person: Optional[dict[str, Any]] = None,
    latest_khatian_no: str = "",
) -> Optional[dict[str, Any]]:
    """Rule 1 (`SELLER_NOT_OWNER`): Checks if the seller is a recorded owner on the latest BS khatian."""
    if seller_id is None:
        return None
    owner_ids = {int(o["person_id"]) for o in latest_ownerships if float(o.get("area_decimal", 0)) > 0}
    if int(seller_id) in owner_ids:
        return None

    seller_name_bn = (seller_person or {}).get("name_bn", f"ব্যক্তি #{_bn(seller_id)}")
    seller_name_en = (seller_person or {}).get("name_en", f"Person #{seller_id}")
    recorded_names_bn = ", ".join(o.get("owner_name_bn", "") for o in latest_ownerships if o.get("owner_name_bn"))
    recorded_names_en = ", ".join(o.get("owner_name_en", "") for o in latest_ownerships if o.get("owner_name_en"))

    return {
        "rule_id": "SELLER_NOT_OWNER",
        "severity": "HIGH_RISK",
        "score_delta": 85,
        "title_bn": "বিক্রেতা সর্বশেষ খতিয়ানের মালিক নন",
        "title_en": "Seller Is Not Recorded Owner on Latest Khatian",
        "message_bn": (
            f"সর্বশেষ বিএস খতিয়ান নং {_bn(latest_khatian_no or 'N/A')}-এ বিক্রেতা ({seller_name_bn})-এর নাম নেই। "
            f"রেকর্ডকৃত বর্তমান মালিক: {recorded_names_bn or 'অন্য ব্যক্তি'}।"
        ),
        "message_en": (
            f"Seller ({seller_name_en}) is not listed on latest BS Khatian {latest_khatian_no or 'N/A'}. "
            f"Recorded current owner(s): {recorded_names_en or 'Another party'}."
        ),
        "evidence": {
            "seller_id": seller_id,
            "seller_name_bn": seller_name_bn,
            "seller_name_en": seller_name_en,
            "latest_khatian_no": latest_khatian_no,
            "recorded_owner_ids": sorted(owner_ids),
            "recorded_owners_bn": recorded_names_bn,
            "recorded_owners_en": recorded_names_en,
        },
    }


def check_area_exceeds_owned(
    seller_id: Optional[int],
    requested_area_decimal: float,
    latest_ownerships: list[dict[str, Any]],
    existing_deeds: list[dict[str, Any]],
) -> Optional[dict[str, Any]]:
    """Rule 2 (`AREA_EXCEEDS_OWNED`): Checks if requested sale area exceeds seller's owned or remaining share."""
    if seller_id is None or requested_area_decimal <= 0:
        return None

    seller_rows = [o for o in latest_ownerships if int(o["person_id"]) == int(seller_id)]
    if not seller_rows:
        # Handled by SELLER_NOT_OWNER
        return None

    owned_area = sum(float(o["area_decimal"]) for o in seller_rows)
    share_fractions = ", ".join(str(o.get("share_fraction", "1/1")) for o in seller_rows)

    # Calculate area already committed in pending/unmutated sale deeds by this seller
    pending_sold = sum(
        float(d["area_decimal"])
        for d in existing_deeds
        if int(d.get("seller_id", 0)) == int(seller_id)
        and d.get("deed_type") == "SALE"
        and d.get("status") in ("PENDING_MUTATION", "REGISTERED")
    )
    available_area = max(0.0, owned_area - pending_sold)

    if requested_area_decimal <= available_area + 1e-6:
        return None

    return {
        "rule_id": "AREA_EXCEEDS_OWNED",
        "severity": "HIGH_RISK",
        "score_delta": 80,
        "title_bn": "মালিকানাধীন অংশের চেয়ে বেশি জমি বিক্রয়ের চেষ্টা",
        "title_en": "Requested Area Exceeds Seller's Owned / Available Share",
        "message_bn": (
            f"বিক্রেতার মালিকানাধীন অংশ {_bn(share_fractions)} (মোট {_bn(f'{owned_area:.2f}')} শতাংশ; "
            f"অবশিষ্ট বিক্রয়যোগ্য {_bn(f'{available_area:.2f}')} শতাংশ), কিন্তু {_bn(f'{requested_area_decimal:.2f}')} শতাংশ "
            f"বিক্রির আবেদন করা হয়েছে।"
        ),
        "message_en": (
            f"Seller owns share {share_fractions} ({owned_area:.2f} decimals total; "
            f"{available_area:.2f} decimals available after pending deeds), "
            f"but attempted to transfer {requested_area_decimal:.2f} decimals."
        ),
        "evidence": {
            "seller_id": seller_id,
            "share_fraction": share_fractions,
            "owned_area_decimal": round(owned_area, 2),
            "pending_committed_area_decimal": round(pending_sold, 2),
            "available_area_decimal": round(available_area, 2),
            "requested_area_decimal": round(requested_area_decimal, 2),
        },
    }


def check_double_sale(
    seller_id: Optional[int],
    requested_area_decimal: float,
    latest_ownerships: list[dict[str, Any]],
    existing_deeds: list[dict[str, Any]],
) -> Optional[dict[str, Any]]:
    """Rule 3 (`DOUBLE_SALE`): Detects active/pending sale deeds on the same plot with overlapping share."""
    if seller_id is None:
        return None

    seller_rows = [o for o in latest_ownerships if int(o["person_id"]) == int(seller_id)]
    owned_area = sum(float(o["area_decimal"]) for o in seller_rows)

    overlapping_deeds = [
        d
        for d in existing_deeds
        if int(d.get("seller_id", 0)) == int(seller_id)
        and d.get("deed_type") == "SALE"
        and d.get("status") in ("PENDING_MUTATION", "REGISTERED")
    ]
    if not overlapping_deeds:
        return None

    already_sold = sum(float(d["area_decimal"]) for d in overlapping_deeds)
    if requested_area_decimal > 0 and (already_sold + requested_area_decimal <= owned_area + 1e-6):
        return None

    first_deed = overlapping_deeds[0]
    deed_nos = ", ".join(str(d["deed_no"]) for d in overlapping_deeds)
    return {
        "rule_id": "DOUBLE_SALE",
        "severity": "HIGH_RISK",
        "score_delta": 95,
        "title_bn": "একই জমি একাধিক ক্রেতার নিকট বিক্রয়ের চেষ্টা (ডাবল সেল)",
        "title_en": "Double Sale Detected (Active/Pending Deed Already Exists)",
        "message_bn": (
            f"এই দাগে বিক্রেতা ইতিমধ্যে দলিল নং {deed_nos} মূলে {_bn(f'{already_sold:.2f}')} শতাংশ জমি "
            f"বিক্রয় করেছেন (নামজারি প্রক্রিয়াধীন)। একই অংশ পুনরায় বিক্রয় করা যাবে না।"
        ),
        "message_en": (
            f"Seller already executed active/pending Sale Deed ({deed_nos}) for {already_sold:.2f} decimals "
            f"on this plot (mutation pending). Overlapping transfer blocked."
        ),
        "evidence": {
            "existing_deed_nos": [d["deed_no"] for d in overlapping_deeds],
            "first_conflicting_deed_id": first_deed.get("id"),
            "already_sold_area_decimal": round(already_sold, 2),
            "requested_area_decimal": round(requested_area_decimal, 2),
            "owned_area_decimal": round(owned_area, 2),
        },
    }


def check_khatian_chain_break(
    khatian_records: list[dict[str, Any]],
) -> Optional[dict[str, Any]]:
    """Rule 4 (`KHATIAN_CHAIN_BREAK`): Verifies CS -> SA -> RS -> BS survey chain continuity & area reconciliation."""
    if not khatian_records:
        return None

    order_map = {"CS": 1, "SA": 2, "RS": 3, "BS": 4}
    ordered = sorted(khatian_records, key=lambda k: order_map.get(str(k.get("survey_type")), 99))

    explicit_breaks = [k for k in ordered if k.get("status") == "CHAIN_BREAK"]
    area_values = [float(k.get("recorded_area_decimal", 0)) for k in ordered]
    max_diff = (max(area_values) - min(area_values)) if area_values else 0.0

    if not explicit_breaks and max_diff <= 0.05:
        return None

    chain_summary = " → ".join(
        f"{k['survey_type']} ({k['khatian_no']}: {float(k['recorded_area_decimal']):.2f} শতাংশ)"
        for k in ordered
    )
    chain_summary_en = " -> ".join(
        f"{k['survey_type']} (#{k['khatian_no']}: {float(k['recorded_area_decimal']):.2f} dec)"
        for k in ordered
    )

    return {
        "rule_id": "KHATIAN_CHAIN_BREAK",
        "severity": "REVIEW",
        "score_delta": 50,
        "title_bn": "খতিয়ান চেইনে জমির পরিমাণ বা তথ্যের অমিল (CS → SA → RS → BS)",
        "title_en": "Khatian Survey Chain Discrepancy (CS -> SA -> RS -> BS)",
        "message_bn": (
            f"পূর্ববর্তী জরিপের সাথে সর্বশেষ খতিয়ানের জমির পরিমাণে {_bn(f'{max_diff:.2f}')} শতাংশ অমিল পাওয়া গেছে "
            f"({ _bn(chain_summary) })। এসি ল্যান্ড ও সাব-রেজিস্ট্রারের ম্যানুয়াল যাচাই প্রয়োজন।"
        ),
        "message_en": (
            f"Recorded plot area differs by {max_diff:.2f} decimals across survey records "
            f"({chain_summary_en}). Manual verification by AC Land / Sub-Registrar required."
        ),
        "evidence": {
            "max_area_difference_decimal": round(max_diff, 2),
            "survey_chain": [
                {
                    "survey_type": k["survey_type"],
                    "khatian_no": k["khatian_no"],
                    "recorded_area_decimal": float(k["recorded_area_decimal"]),
                    "status": k.get("status"),
                }
                for k in ordered
            ],
        },
    }


def check_deed_tampered(
    deeds_on_plot: list[dict[str, Any]],
) -> Optional[dict[str, Any]]:
    """Rule 5 (`DEED_TAMPERED`): Recomputes SHA-256 hash and verifies Ed25519 signature on plot deeds."""
    tampered_results: list[dict[str, Any]] = []
    for d in deeds_on_plot:
        res = verify_deed_record(d)
        if not res["is_valid"]:
            tampered_results.append(res)

    if not tampered_results:
        return None

    first = tampered_results[0]
    return {
        "rule_id": "DEED_TAMPERED",
        "severity": "HIGH_RISK",
        "score_delta": 100,
        "title_bn": "এই দলিলের তথ্য নিবন্ধনের পরে পরিবর্তন করা হয়েছে (টেম্পারিং সনাক্ত)",
        "title_en": "Deed Content Altered After Registration (Cryptographic Hash Mismatch)",
        "message_bn": (
            f"দলিল নং {first['deed_no']}-এর সংরক্ষিত তথ্যের সাথে ডিজিটাল স্বাক্ষর ও SHA-256 হ্যাশ মিলছে না! "
            f"নিবন্ধনের পরে অবৈধভাবে জমির পরিমাণ বা তথ্য পরিবর্তন করা হয়েছে।"
        ),
        "message_en": (
            f"Deed {first['deed_no']} failed SHA-256 hash and Ed25519 signature verification! "
            f"Stored fields were modified after registration."
        ),
        "evidence": {
            "deed_id": first["deed_id"],
            "deed_no": first["deed_no"],
            "stored_hash": first["stored_hash"],
            "recomputed_hash": first["recomputed_hash"],
            "tampered_fields": first["tampered_fields"],
        },
    }


def check_plot_mortgaged(
    mortgages_liens: list[dict[str, Any]],
) -> Optional[dict[str, Any]]:
    """Rule 6 (`PLOT_MORTGAGED`): Checks if an active bank mortgage/lien exists on the plot."""
    active = [m for m in mortgages_liens if m.get("status") == "ACTIVE"]
    if not active:
        return None

    first = active[0]
    total_bdt = sum(int(m.get("amount_bdt", 0)) for m in active)
    banks_bn = ", ".join(f"{m['bank_name_bn']} ({m['branch_bn']})" for m in active)
    banks_en = ", ".join(f"{m['bank_name_en']}" for m in active)

    return {
        "rule_id": "PLOT_MORTGAGED",
        "severity": "HIGH_RISK",
        "score_delta": 85,
        "title_bn": "জমিটি বর্তমানে ব্যাংকে বন্ধক (মর্টগেজ) রয়েছে",
        "title_en": "Active Bank Mortgage / Lien Exists on Plot",
        "message_bn": (
            f"এই জমিটি {banks_bn}-এ মোট ৳{_bn(f'{total_bdt:,}')} টাকার ঋণের বিপরীতে সক্রিয়ভাবে বন্ধক রয়েছে। "
            f"ব্যাংকের ঋণ পরিশোধের ছাড়পত্র ছাড়া নতুন বন্ধক বা মালিকানা হস্তান্তর স্থগিত।"
        ),
        "message_en": (
            f"This plot has an active mortgage lien of BDT {total_bdt:,} with {banks_en}. "
            f"Second mortgage or transfer without bank release letter is blocked."
        ),
        "evidence": {
            "active_lien_count": len(active),
            "primary_lien_id": first.get("id"),
            "bank_name_bn": first.get("bank_name_bn"),
            "bank_name_en": first.get("bank_name_en"),
            "total_amount_bdt": total_bdt,
        },
    }


def check_rapid_resale(
    existing_deeds: list[dict[str, Any]],
    threshold_days: int = RAPID_RESALE_DAYS,
    reference_iso: str = "2026-10-16T18:00:00+06:00",
) -> Optional[dict[str, Any]]:
    """Rule 7 (`RAPID_RESALE`): Flags plots resold within an unusually short window (`threshold_days`)."""
    if not existing_deeds:
        return None

    try:
        ref_dt = datetime.fromisoformat(reference_iso)
    except ValueError:
        return None

    recent: list[tuple[int, dict[str, Any]]] = []
    for d in existing_deeds:
        if d.get("deed_type") != "SALE":
            continue
        try:
            dt = datetime.fromisoformat(str(d["created_at"]))
            days_ago = (ref_dt.date() - dt.date()).days
            if 0 <= days_ago <= threshold_days:
                recent.append((days_ago, d))
        except Exception:
            continue

    if not recent:
        return None

    days_ago, recent_deed = sorted(recent, key=lambda x: x[0])[0]
    return {
        "rule_id": "RAPID_RESALE",
        "severity": "REVIEW",
        "score_delta": 35,
        "title_bn": f"অস্বাভাবিক দ্রুত হাতবদল ({_bn(days_ago)} দিনের মধ্যে পুনরায় বিক্রয়)",
        "title_en": f"Rapid Resale Within Short Window ({days_ago} Days Since Last Deed)",
        "message_bn": (
            f"এই জমিটি মাত্র {_bn(days_ago)} দিন আগে (দলিল নং {recent_deed['deed_no']}) হস্তান্তরিত হয়েছে। "
            f"{_bn(threshold_days)} দিনের কম সময়ে পুনরায় বিক্রয়ের ক্ষেত্রে সাব-রেজিস্ট্রারের অতিরিক্ত যাচাই আবশ্যক।"
        ),
        "message_en": (
            f"This plot was transferred just {days_ago} days ago (Deed {recent_deed['deed_no']}), "
            f"within the {threshold_days}-day rapid-resale review window."
        ),
        "evidence": {
            "days_since_last_sale": days_ago,
            "threshold_days": threshold_days,
            "recent_deed_no": recent_deed["deed_no"],
            "recent_deed_date": recent_deed["created_at"],
        },
    }


def check_inheritance_unresolved(
    seller_person: Optional[dict[str, Any]],
    latest_owner_persons: list[dict[str, Any]],
    khatian_records: list[dict[str, Any]],
) -> Optional[dict[str, Any]]:
    """Rule 8 (`INHERITANCE_UNRESOLVED`): Flags deceased owners whose heirs/succession mutation are not recorded."""
    deceased_unrecorded: list[dict[str, Any]] = []
    candidates = ([seller_person] if seller_person else []) + list(latest_owner_persons)
    seen_ids: set[int] = set()
    for p in candidates:
        if not p or int(p.get("id", 0)) in seen_ids:
            continue
        seen_ids.add(int(p.get("id", 0)))
        if int(p.get("is_deceased", 0)) == 1 and int(p.get("heirs_recorded", 1)) == 0:
            deceased_unrecorded.append(p)

    khatian_flagged = [k for k in khatian_records if k.get("status") == "UNRESOLVED_HEIRS"]
    if not deceased_unrecorded and not khatian_flagged:
        return None

    deceased_name_bn = (
        deceased_unrecorded[0]["name_bn"] if deceased_unrecorded else "রেকর্ডীয় মৃত মালিক"
    )
    deceased_name_en = (
        deceased_unrecorded[0]["name_en"] if deceased_unrecorded else "Recorded Deceased Owner"
    )

    return {
        "rule_id": "INHERITANCE_UNRESOLVED",
        "severity": "REVIEW",
        "score_delta": 55,
        "title_bn": "মৃত মালিকের ওয়ারিশ সনদ ও ওয়ারিশান নামজারি অমীমাংসিত",
        "title_en": "Deceased Owner with Unresolved Heirs / Succession Mutation",
        "message_bn": (
            f"রেকর্ডীয় মালিক ({deceased_name_bn}) মৃত্যুবরণ করেছেন বলে ডেমো রেজিস্ট্রিতে চিহ্নিত, "
            f"কিন্তু এখনো সকল বৈধ ওয়ারিশের নামজারি ও বণ্টননামা সম্পন্ন হয়নি। ম্যানুয়াল যাচাইয়ের জন্য প্রেরণ করুন।"
        ),
        "message_en": (
            f"Recorded owner ({deceased_name_en}) is marked deceased without completed succession "
            f"mutation for all legal heirs. Route to AC Land / Sub-Registrar for manual review."
        ),
        "evidence": {
            "deceased_owner_name_bn": deceased_name_bn,
            "deceased_owner_name_en": deceased_name_en,
            "heirs_recorded": False,
        },
    }


def check_nid_mismatch(
    seller_person: Optional[dict[str, Any]],
    submitted_nid: Optional[str] = None,
    submitted_name: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    """Rule 9 (`NID_MISMATCH`): Validates seller's NID/name against the internal Mock NID Service."""
    if seller_person is None and submitted_nid is None:
        return None

    nid_res = verify_mock_nid(seller_person, submitted_nid=submitted_nid, submitted_name=submitted_name)
    if nid_res["verified"]:
        return None

    return {
        "rule_id": "NID_MISMATCH",
        "severity": "HIGH_RISK",
        "score_delta": 90,
        "title_bn": "জাতীয় পরিচয়পত্র (এনআইডি) তথ্যের অমিল",
        "title_en": "National ID (Mock NID Service) Verification Mismatch",
        "message_bn": nid_res["message_bn"],
        "message_en": nid_res["message_en"],
        "evidence": nid_res,
    }


def evaluate_plot_and_transaction(
    *,
    plot: dict[str, Any],
    khatian_records: list[dict[str, Any]],
    latest_ownerships: list[dict[str, Any]],
    latest_owner_persons: list[dict[str, Any]],
    existing_deeds: list[dict[str, Any]],
    mortgages_liens: list[dict[str, Any]],
    seller_person: Optional[dict[str, Any]] = None,
    requested_area_decimal: float = 0.0,
    submitted_seller_nid: Optional[str] = None,
    submitted_seller_name: Optional[str] = None,
    check_rapid_resale_flag: bool = False,
) -> dict[str, Any]:
    """Runs all applicable BhumiShield fraud and discrepancy rules and returns a unified verdict."""
    seller_id = int(seller_person["id"]) if seller_person and seller_person.get("id") else None
    bs_khatians = [k for k in khatian_records if k.get("survey_type") == "BS"]
    latest_khatian_no = bs_khatians[0]["khatian_no"] if bs_khatians else ""

    raw_flags = [
        check_deed_tampered(existing_deeds),
        check_seller_not_owner(seller_id, latest_ownerships, seller_person, latest_khatian_no),
        check_double_sale(seller_id, requested_area_decimal, latest_ownerships, existing_deeds),
        check_area_exceeds_owned(seller_id, requested_area_decimal, latest_ownerships, existing_deeds),
        check_plot_mortgaged(mortgages_liens),
        check_nid_mismatch(seller_person, submitted_nid=submitted_seller_nid, submitted_name=submitted_seller_name),
        check_khatian_chain_break(khatian_records),
        check_inheritance_unresolved(seller_person, latest_owner_persons, khatian_records),
        check_rapid_resale(existing_deeds) if check_rapid_resale_flag else None,
    ]
    flags = [f for f in raw_flags if f is not None]

    has_high = any(f["severity"] == "HIGH_RISK" for f in flags)
    has_review = any(f["severity"] == "REVIEW" for f in flags)

    if has_high:
        verdict = "HIGH_RISK"
        badge_bn = "✖ ঝুঁকিপূর্ণ (আটকানো)"
        badge_en = "✖ High Risk (Hold / Block)"
        summary_bn = (
            "এই জমির লেনদেনে গুরুতর ঝুঁকি বা জালিয়াতির লক্ষণ পাওয়া গেছে। এখনই নিবন্ধন বা অর্থ পরিশোধ করবেন না।"
        )
        summary_en = (
            "Critical fraud or encumbrance risk detected on this plot/transaction. Do not proceed with registration or payment."
        )
        next_steps_bn = [
            "কোনো অবস্থাতেই এখন অগ্রিম টাকা বা বায়না পরিশোধ করবেন না।",
            "উপজেলা ভূমি অফিস (এসি ল্যান্ড) এবং সাব-রেজিস্ট্রি অফিসে মূল খতিয়ান ও বালাম বহি যাচাই করুন।",
            "ব্যাংক বন্ধক থাকলে সংশ্লিষ্ট ব্যাংকের ঋণমুক্তির প্রত্যয়নপত্র (Release Letter) সংগ্রহ করুন।",
        ]
        next_steps_en = [
            "Do not pay any advance or earnest money at this stage.",
            "Verify original khatian and register volume at the AC Land and Sub-Registry offices.",
            "If mortgaged, require an official Bank Lien Release Certificate before proceeding.",
        ]
    elif has_review:
        verdict = "REVIEW"
        badge_bn = "⚠ সতর্কতা (যাচাই প্রয়োজন)"
        badge_en = "⚠ Warning (Needs Review)"
        summary_bn = (
            "এই জমির রেকর্ডে কিছু অসামঞ্জস্যতা রয়েছে যা মানব কর্মকর্তার (এসি ল্যান্ড / সাব-রেজিস্ট্রার) ম্যানুয়াল যাচাই প্রয়োজন।"
        )
        summary_en = (
            "This plot has record discrepancies that require manual review by a human officer (AC Land / Sub-Registrar)."
        )
        next_steps_bn = [
            "সংশ্লিষ্ট ইউনিয়ন ভূমি অফিস বা এসি ল্যান্ড অফিসে সিএস-এসএ-আরএস-বিএস খতিয়ান মিলিয়ে দেখুন।",
            "মালিক মৃত হলে ইউনিয়ন পরিষদের ওয়ারিশ সনদ ও ওয়ারিশান নামজারি খতিয়ান সম্পন্ন করুন।",
            "সাব-রেজিস্ট্রার কর্তৃক ম্যানুয়াল রিভিউ অনুমোদনের পরই কেবল দলিল নিবন্ধন করুন।",
        ]
        next_steps_en = [
            "Reconcile CS, SA, RS, and BS khatian records at the Upazila Land (AC Land) Office.",
            "If the recorded owner is deceased, complete Succession Certificate and Heirs Mutation first.",
            "Proceed with registration only after manual officer review and sign-off.",
        ]
    else:
        verdict = "SAFE"
        badge_bn = "✔ নিরাপদ"
        badge_en = "✔ Safe & Verified"
        summary_bn = (
            "মালিকানা চেইন (CS→SA→RS→BS), দলিলের ডিজিটাল স্বাক্ষর এবং ব্যাংক বন্ধক যাচাইয়ে কোনো ঝুঁকি পাওয়া যায়নি।"
        )
        summary_en = (
            "Ownership chain (CS->SA->RS->BS), cryptographic deed ledger, and bank lien checks passed with zero flags."
        )
        next_steps_bn = [
            "সাব-রেজিস্ট্রি অফিসে প্রাক-নিবন্ধন যাচাই সম্পন্ন করে দলিল নিবন্ধন করতে পারেন।",
            "নিবন্ধনের পর কিউআর (QR) কোডযুক্ত দলিল সংগ্রহ করুন এবং ই-নামজারির আবেদন করুন।",
        ]
        next_steps_en = [
            "You may proceed with deed registration at the Sub-Registry office.",
            "Collect your QR-coded digital deed receipt after registration and apply for e-Mutation.",
        ]

    risk_score = min(100, sum(int(f["score_delta"]) for f in flags))

    return {
        "plot_id": plot.get("id"),
        "dag_no": plot.get("dag_no"),
        "dag_no_bn": plot.get("dag_no_bn"),
        "verdict": verdict,
        "risk_score": risk_score,
        "badge_bn": badge_bn,
        "badge_en": badge_en,
        "summary_bn": summary_bn,
        "summary_en": summary_en,
        "flags": flags,
        "flag_count": len(flags),
        "next_steps_bn": next_steps_bn,
        "next_steps_en": next_steps_en,
        "disclaimer_bn": "বিশেষ দ্রষ্টব্য: ভূমি সুরক্ষা শুধুমাত্র সম্ভাব্য ঝুঁকি চিহ্নিত করে; চূড়ান্ত আইনি সিদ্ধান্ত সংশ্লিষ্ট সরকারি কর্মকর্তার।",
        "disclaimer_en": "Disclaimer: BhumiShield flags risk for a human officer to decide. It never declares final legal truth.",
    }
