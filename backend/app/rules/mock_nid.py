"""Mock NID Verification Service (100% offline, synthetic dummy data only).

HARD RULE COMPLIANCE:
- Never calls any live government server or external NID API.
- Validates against BhumiShield's synthetic `persons` table.
"""
from __future__ import annotations

from typing import Any, Optional


def verify_mock_nid(
    person_record: Optional[dict[str, Any]],
    submitted_nid: Optional[str] = None,
    submitted_name: Optional[str] = None,
) -> dict[str, Any]:
    """Checks a person's NID and name against the internal synthetic NID registry."""
    if not person_record:
        return {
            "verified": False,
            "reason_code": "PERSON_NOT_FOUND",
            "message_bn": "জাতীয় পরিচয়পত্র (ডেমো রেজিস্ট্রি)-তে এই ব্যক্তির কোনো তথ্য পাওয়া যায়নি।",
            "message_en": "No matching citizen found in the Mock NID Registry.",
        }

    expected_nid = str(person_record.get("nid", "")).strip()
    if submitted_nid is not None and str(submitted_nid).strip() != "" and str(submitted_nid).strip() != expected_nid:
        return {
            "verified": False,
            "reason_code": "NID_NUMBER_MISMATCH",
            "expected_nid": expected_nid,
            "submitted_nid": str(submitted_nid).strip(),
            "message_bn": (
                f"প্রদত্ত এনআইডি নম্বর ({submitted_nid}) ডেমো এনআইডি রেজিস্ট্রির তথ্যের ({expected_nid}) সাথে মিলছে না।"
            ),
            "message_en": (
                f"Submitted NID ({submitted_nid}) does not match Mock NID Registry record ({expected_nid})."
            ),
        }

    if submitted_name is not None and submitted_name.strip() != "":
        norm_sub = submitted_name.strip().lower()
        norm_bn = str(person_record.get("name_bn", "")).strip().lower()
        norm_en = str(person_record.get("name_en", "")).strip().lower()
        if norm_sub not in (norm_bn, norm_en):
            return {
                "verified": False,
                "reason_code": "NID_NAME_MISMATCH",
                "expected_name_bn": person_record.get("name_bn"),
                "expected_name_en": person_record.get("name_en"),
                "submitted_name": submitted_name,
                "message_bn": "প্রদত্ত নামের সাথে ডেমো এনআইডি রেজিস্ট্রির নাম মিলছে না।",
                "message_en": "Submitted name does not match the Mock NID Registry record.",
            }

    return {
        "verified": True,
        "reason_code": "VERIFIED",
        "nid": expected_nid,
        "name_bn": person_record.get("name_bn"),
        "name_en": person_record.get("name_en"),
        "is_deceased": bool(person_record.get("is_deceased", 0)),
        "message_bn": "ডেমো এনআইডি যাচাই সফল হয়েছে।",
        "message_en": "Mock NID verification succeeded.",
    }
