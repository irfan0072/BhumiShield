"""Enterprise Auth, User Registration, Admin User Management, Dynamic Site Settings & Analytics Router."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import create_access_token, get_optional_user
from app.database import DBConnection, get_db
from app.ledger.crypto import verify_entire_ledger
from app.seed.seed_data import append_audit_entry, hash_password, verify_password

router = APIRouter(tags=["Auth, Users Management, Settings & Analytics"])


class RegisterUserRequest(BaseModel):
    username: str = Field(min_length=3, max_length=48)
    email: Optional[str] = None
    password: str = Field(min_length=4, max_length=64)
    full_name_bn: str = Field(min_length=2)
    full_name_en: str = Field(min_length=2)
    role: str = "citizen"
    office_bn: str = "নাগরিক পোর্টাল — ঢাকা"
    office_en: str = "Citizen Portal — Dhaka"
    phone_dummy: str = "01700-009999"
    nid: str = "9900009999"


class UpdateProfileRequest(BaseModel):
    full_name_bn: Optional[str] = None
    full_name_en: Optional[str] = None
    email: Optional[str] = None
    phone_dummy: Optional[str] = None
    office_bn: Optional[str] = None
    office_en: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=4)


class AdminUpdateUserRequest(BaseModel):
    full_name_bn: Optional[str] = None
    full_name_en: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    office_bn: Optional[str] = None
    office_en: Optional[str] = None
    phone_dummy: Optional[str] = None
    nid: Optional[str] = None
    is_active: Optional[int] = None
    new_password: Optional[str] = None


class UpdateSettingsRequest(BaseModel):
    settings: dict[str, Any]


def _serialize_user(u: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": u["id"],
        "username": u["username"],
        "email": u.get("email") or f"{u['username']}@demo.bhumishield.gov.bd",
        "full_name_bn": u["full_name_bn"],
        "full_name_en": u["full_name_en"],
        "role": u["role"],
        "office_bn": u["office_bn"],
        "office_en": u["office_en"],
        "phone_dummy": u.get("phone_dummy", "01700-001001"),
        "nid": u.get("nid", "9900001001"),
        "is_active": int(u.get("is_active", 1)),
        "last_login_at": u.get("last_login_at"),
        "created_at": u.get("created_at"),
    }


@router.post("/auth/register")
def register_user(
    req: RegisterUserRequest,
    db: DBConnection = Depends(get_db),
) -> dict[str, Any]:
    """Registers a new Citizen or Officer account and returns a JWT token."""
    uname = req.username.strip().lower()
    existing = db.fetchone("SELECT id FROM users WHERE username = ?", (uname,))
    if existing:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "USERNAME_EXISTS",
                "message_bn": f"'{uname}' ইউজারনেমটি ইতিমধ্যে ব্যবহৃত হয়েছে। অনুগ্রহ করে অন্য ইউজারনেম দিন।",
                "message_en": f"Username '{uname}' is already registered. Please choose another username.",
            },
        )

    allowed_roles = {"citizen", "sub_registrar", "ac_land", "bank_officer", "admin"}
    role = req.role if req.role in allowed_roles else "citizen"
    now_iso = datetime.now(timezone.utc).isoformat()
    email = (req.email or f"{uname}@demo.bhumishield.gov.bd").strip().lower()

    user_id = db.insert(
        """
        INSERT INTO users (
            username, email, full_name_bn, full_name_en, role,
            office_bn, office_en, phone_dummy, nid, is_active,
            password_hash, last_login_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
        """,
        (
            uname,
            email,
            req.full_name_bn.strip(),
            req.full_name_en.strip(),
            role,
            req.office_bn.strip(),
            req.office_en.strip(),
            req.phone_dummy.strip(),
            req.nid.strip(),
            hash_password(req.password),
            now_iso,
            now_iso,
        ),
    )

    existing_person = db.fetchone("SELECT id FROM persons WHERE nid = ?", (req.nid.strip(),))
    if not existing_person:
        db.insert(
            """
            INSERT INTO persons (
                name_bn, name_en, father_name_bn, father_name_en, mother_name_bn,
                nid, phone_dummy, is_deceased, heirs_recorded, address_bn, address_en
            ) VALUES (?, ?, 'মো. আবদুল করিম (ডেমো)', 'Md. Abdul Karim (Demo)', 'রোকেয়া বেগম', ?, ?, 0, 1, ?, ?)
            """,
            (
                req.full_name_bn.strip(),
                req.full_name_en.strip(),
                req.nid.strip(),
                req.phone_dummy.strip(),
                req.office_bn.strip(),
                req.office_en.strip(),
            ),
        )

    append_audit_entry(
        db,
        actor_username=uname,
        actor_role=role,
        action="USER_REGISTERED",
        entity_type="user",
        entity_id=str(user_id),
        details={
            "username": uname,
            "role": role,
            "nid": req.nid.strip(),
            "note_bn": f"নতুন ব্যবহারকারী নিবন্ধন: {req.full_name_bn.strip()} ({role})",
        },
        created_at=now_iso,
    )
    db.commit()

    user_row = db.fetchone("SELECT * FROM users WHERE id = ?", (user_id,))
    token = create_access_token({"sub": uname, "role": role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _serialize_user(user_row),
        "message_bn": "আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে এবং লগইন সম্পন্ন হয়েছে।",
        "message_en": "Your account has been created and signed in.",
    }


@router.get("/auth/me")
def get_current_user_profile(
    user: Optional[dict[str, Any]] = Depends(get_optional_user),
    db: DBConnection = Depends(get_db),
) -> dict[str, Any]:
    if not isinstance(user, dict) or not user.get("username"):
        raise HTTPException(
            status_code=401,
            detail={
                "code": "NOT_AUTHENTICATED",
                "message_bn": "অনুগ্রহ করে প্রথমে লগইন করুন।",
                "message_en": "Please sign in first.",
            },
        )
    full_user = db.fetchone("SELECT * FROM users WHERE username = ?", (user["username"],))
    if not full_user:
        raise HTTPException(
            status_code=404,
            detail={"code": "USER_NOT_FOUND", "message_bn": "ব্যবহারকারী পাওয়া যায়নি।", "message_en": "User not found."},
        )
    return {"user": _serialize_user(full_user)}


@router.put("/auth/profile")
def update_my_profile(
    req: UpdateProfileRequest,
    user: Optional[dict[str, Any]] = Depends(get_optional_user),
    db: DBConnection = Depends(get_db),
) -> dict[str, Any]:
    user_dict = user if isinstance(user, dict) else None
    if not user_dict:
        raise HTTPException(
            status_code=401,
            detail={"code": "AUTH_REQUIRED", "message_bn": "প্রোফাইল আপডেট করতে লগইন করুন।", "message_en": "Sign in to update profile."},
        )

    curr = db.fetchone("SELECT * FROM users WHERE id = ?", (user_dict["id"],))
    if not curr:
        raise HTTPException(
            status_code=404,
            detail={"code": "USER_NOT_FOUND", "message_bn": "ব্যবহারকারী পাওয়া যায়নি।", "message_en": "User not found."},
        )

    db.execute(
        """
        UPDATE users
        SET full_name_bn = ?, full_name_en = ?, email = ?, phone_dummy = ?, office_bn = ?, office_en = ?
        WHERE id = ?
        """,
        (
            req.full_name_bn or curr["full_name_bn"],
            req.full_name_en or curr["full_name_en"],
            req.email or curr.get("email"),
            req.phone_dummy or curr.get("phone_dummy"),
            req.office_bn or curr["office_bn"],
            req.office_en or curr["office_en"],
            curr["id"],
        ),
    )
    db.commit()
    updated = db.fetchone("SELECT * FROM users WHERE id = ?", (curr["id"],))
    return {
        "user": _serialize_user(updated),
        "message_bn": "প্রোফাইল তথ্য সফলভাবে হালনাগাদ করা হয়েছে।",
        "message_en": "Profile updated successfully.",
    }


@router.post("/auth/change-password")
def change_my_password(
    req: ChangePasswordRequest,
    user: Optional[dict[str, Any]] = Depends(get_optional_user),
    db: DBConnection = Depends(get_db),
) -> dict[str, Any]:
    user_dict = user if isinstance(user, dict) else None
    if not user_dict:
        raise HTTPException(
            status_code=401,
            detail={"code": "AUTH_REQUIRED", "message_bn": "পাসওয়ার্ড পরিবর্তন করতে লগইন করুন।", "message_en": "Sign in to change password."},
        )

    curr = db.fetchone("SELECT * FROM users WHERE id = ?", (user_dict["id"],))
    if not curr or not verify_password(req.current_password, curr["password_hash"]):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "WRONG_CURRENT_PASSWORD",
                "message_bn": "বর্তমান পাসওয়ার্ডটি সঠিক নয়।",
                "message_en": "Current password is incorrect.",
            },
        )
    db.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(req.new_password), curr["id"]))
    db.commit()
    return {
        "message_bn": "পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।",
        "message_en": "Password changed successfully.",
    }


@router.get("/citizen/my-properties")
def get_citizen_linked_properties(
    nid: Optional[str] = None,
    user: Optional[dict[str, Any]] = Depends(get_optional_user),
    db: DBConnection = Depends(get_db),
) -> dict[str, Any]:
    """Returns plots, BS khatians, and deeds linked to a citizen's Mock NID."""
    user_dict = user if isinstance(user, dict) else {}
    target_nid = (nid or user_dict.get("nid") or "9900001001").strip()
    person = db.fetchone("SELECT * FROM persons WHERE nid = ?", (target_nid,))
    if not person:
        person = db.fetchone("SELECT * FROM persons WHERE id = 1")

    owned_plots = db.fetchall(
        """
        SELECT o.share_fraction, o.area_decimal, o.is_latest,
               p.id AS plot_id, p.dag_no, p.dag_no_bn, p.land_type_bn, p.land_type_en, p.total_area_decimal,
               k.survey_type, k.khatian_no, k.khatian_no_bn,
               l.mouza_bn, l.mouza_en, l.upazila_bn, l.upazila_en, l.district_bn, l.district_en
        FROM ownerships o
        JOIN plots p ON p.id = o.plot_id
        JOIN khatian_records k ON k.id = o.khatian_id
        JOIN locations l ON l.id = p.location_id
        WHERE o.person_id = ? AND o.is_latest = 1
        ORDER BY p.id ASC
        """,
        (person["id"],),
    )

    deeds = db.fetchall(
        """
        SELECT d.*, p.dag_no, p.dag_no_bn, l.mouza_bn, l.mouza_en,
               s.name_bn AS seller_name_bn, s.name_en AS seller_name_en,
               b.name_bn AS buyer_name_bn, b.name_en AS buyer_name_en
        FROM deeds d
        JOIN plots p ON p.id = d.plot_id
        JOIN locations l ON l.id = p.location_id
        JOIN persons s ON s.id = d.seller_id
        JOIN persons b ON b.id = d.buyer_id
        WHERE d.seller_id = ? OR d.buyer_id = ?
        ORDER BY d.chain_index DESC
        """,
        (person["id"], person["id"]),
    )

    return {
        "person": person,
        "owned_plots": owned_plots,
        "deeds": deeds,
    }


@router.get("/admin/users")
def admin_list_users(
    role: Optional[str] = None,
    q: Optional[str] = None,
    db: DBConnection = Depends(get_db),
) -> dict[str, Any]:
    rows = db.fetchall("SELECT * FROM users ORDER BY id ASC")
    items = [_serialize_user(r) for r in rows]
    if role:
        items = [u for u in items if u["role"] == role]
    if q:
        q_low = q.strip().lower()
        items = [
            u
            for u in items
            if q_low in u["username"].lower()
            or q_low in u["full_name_bn"].lower()
            or q_low in u["full_name_en"].lower()
            or q_low in u["nid"].lower()
            or q_low in u["office_bn"].lower()
        ]
    return {"items": items, "total": len(items)}


@router.post("/admin/users")
def admin_create_user(
    req: RegisterUserRequest,
    db: DBConnection = Depends(get_db),
) -> dict[str, Any]:
    return register_user(req, db=db)


@router.put("/admin/users/{target_user_id}")
def admin_update_user(
    target_user_id: int,
    req: AdminUpdateUserRequest,
    user: Optional[dict[str, Any]] = Depends(get_optional_user),
    db: DBConnection = Depends(get_db),
) -> dict[str, Any]:
    curr = db.fetchone("SELECT * FROM users WHERE id = ?", (target_user_id,))
    if not curr:
        raise HTTPException(
            status_code=404,
            detail={"code": "USER_NOT_FOUND", "message_bn": "ব্যবহারকারী পাওয়া যায়নি।", "message_en": "User not found."},
        )

    new_pass_hash = hash_password(req.new_password) if req.new_password else curr["password_hash"]
    db.execute(
        """
        UPDATE users
        SET full_name_bn = ?, full_name_en = ?, email = ?, role = ?,
            office_bn = ?, office_en = ?, phone_dummy = ?, nid = ?,
            is_active = ?, password_hash = ?
        WHERE id = ?
        """,
        (
            req.full_name_bn if req.full_name_bn is not None else curr["full_name_bn"],
            req.full_name_en if req.full_name_en is not None else curr["full_name_en"],
            req.email if req.email is not None else curr.get("email"),
            req.role if req.role is not None else curr["role"],
            req.office_bn if req.office_bn is not None else curr["office_bn"],
            req.office_en if req.office_en is not None else curr["office_en"],
            req.phone_dummy if req.phone_dummy is not None else curr.get("phone_dummy"),
            req.nid if req.nid is not None else curr.get("nid"),
            int(req.is_active) if req.is_active is not None else int(curr.get("is_active", 1)),
            new_pass_hash,
            target_user_id,
        ),
    )

    actor = user if isinstance(user, dict) else {}
    append_audit_entry(
        db,
        actor_username=actor.get("username", "admin"),
        actor_role=actor.get("role", "admin"),
        action="ADMIN_USER_UPDATED",
        entity_type="user",
        entity_id=str(target_user_id),
        details={
            "username": curr["username"],
            "new_role": req.role or curr["role"],
            "is_active": int(req.is_active) if req.is_active is not None else int(curr.get("is_active", 1)),
            "note_bn": f"ব্যবহারকারী '{curr['username']}'-এর প্রোফাইল/ভূমিকা হালনাগাদ করা হয়েছে",
        },
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.commit()
    updated = db.fetchone("SELECT * FROM users WHERE id = ?", (target_user_id,))
    return {
        "user": _serialize_user(updated),
        "message_bn": "ব্যবহারকারীর তথ্য সফলভাবে হালনাগাদ করা হয়েছে।",
        "message_en": "User updated successfully.",
    }


@router.delete("/admin/users/{target_user_id}")
def admin_delete_user(
    target_user_id: int,
    user: Optional[dict[str, Any]] = Depends(get_optional_user),
    db: DBConnection = Depends(get_db),
) -> dict[str, Any]:
    curr = db.fetchone("SELECT * FROM users WHERE id = ?", (target_user_id,))
    if not curr:
        raise HTTPException(
            status_code=404,
            detail={"code": "USER_NOT_FOUND", "message_bn": "ব্যবহারকারী পাওয়া যায়নি।", "message_en": "User not found."},
        )
    if curr["username"] in ("admin", "citizen", "registrar", "acland", "bank"):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "CORE_DEMO_USER_PROTECTED",
                "message_bn": "হ্যাকাথনের মূল ৫টি ডেমো অ্যাকাউন্ট মুছে ফেলা যাবে না (আপনি নতুন তৈরি করা ইউজার মুছতে পারেন)।",
                "message_en": "Core hackathon demo accounts cannot be deleted (you can delete newly created accounts).",
            },
        )
    db.execute("DELETE FROM users WHERE id = ?", (target_user_id,))
    actor = user if isinstance(user, dict) else {}
    append_audit_entry(
        db,
        actor_username=actor.get("username", "admin"),
        actor_role=actor.get("role", "admin"),
        action="ADMIN_USER_DELETED",
        entity_type="user",
        entity_id=str(target_user_id),
        details={"username": curr["username"], "note_bn": f"ব্যবহারকারী '{curr['username']}' অপসারণ করা হয়েছে"},
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.commit()
    return {
        "deleted_id": target_user_id,
        "message_bn": "ব্যবহারকারী সফলভাবে অপসারণ করা হয়েছে।",
        "message_en": "User removed successfully.",
    }


@router.get("/settings")
def get_site_settings(db: DBConnection = Depends(get_db)) -> dict[str, Any]:
    rows = db.fetchall("SELECT * FROM site_settings ORDER BY id ASC")
    kv: dict[str, Any] = {}
    items: list[dict[str, Any]] = []
    for r in rows:
        try:
            val = json.loads(r["setting_value_json"])
        except Exception:
            val = r["setting_value_json"]
        kv[r["setting_key"]] = val
        items.append(
            {
                "id": r["id"],
                "key": r["setting_key"],
                "value": val,
                "description_bn": r["description_bn"],
                "description_en": r["description_en"],
                "updated_by": r["updated_by"],
                "updated_at": r["updated_at"],
            }
        )
    return {"settings": kv, "items": items}


@router.put("/settings")
def update_site_settings(
    req: UpdateSettingsRequest,
    user: Optional[dict[str, Any]] = Depends(get_optional_user),
    db: DBConnection = Depends(get_db),
) -> dict[str, Any]:
    actor = user if isinstance(user, dict) else {}
    actor_name = actor.get("username", "admin")
    now_iso = datetime.now(timezone.utc).isoformat()

    for key, val in req.settings.items():
        val_json = json.dumps(val, ensure_ascii=False)
        existing = db.fetchone("SELECT id FROM site_settings WHERE setting_key = ?", (key,))
        if existing:
            db.execute(
                "UPDATE site_settings SET setting_value_json = ?, updated_by = ?, updated_at = ? WHERE setting_key = ?",
                (val_json, actor_name, now_iso, key),
            )
        else:
            db.insert(
                """
                INSERT INTO site_settings (setting_key, setting_value_json, description_bn, description_en, updated_by, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (key, val_json, key, key, actor_name, now_iso),
            )

    append_audit_entry(
        db,
        actor_username=actor_name,
        actor_role=actor.get("role", "admin"),
        action="SITE_SETTINGS_UPDATED",
        entity_type="site_settings",
        entity_id="GLOBAL",
        details={
            "updated_keys": list(req.settings.keys()),
            "note_bn": "সিস্টেম ও রুল ইঞ্জিন সেটিংস হালনাগাদ করা হয়েছে",
        },
        created_at=now_iso,
    )
    db.commit()
    return {
        **get_site_settings(db=db),
        "message_bn": "সাইট ও রুল ইঞ্জিন সেটিংস সফলভাবে সংরক্ষিত হয়েছে।",
        "message_en": "Site and rules engine settings saved successfully.",
    }


@router.get("/analytics/summary")
def get_analytics_summary(db: DBConnection = Depends(get_db)) -> dict[str, Any]:
    plots_cnt = int((db.fetchone("SELECT COUNT(*) AS c FROM plots") or {}).get("c", 0))
    khatians_cnt = int((db.fetchone("SELECT COUNT(*) AS c FROM khatian_records") or {}).get("c", 0))
    persons_cnt = int((db.fetchone("SELECT COUNT(*) AS c FROM persons") or {}).get("c", 0))
    users_cnt = int((db.fetchone("SELECT COUNT(*) AS c FROM users") or {}).get("c", 0))

    all_deeds = db.fetchall("SELECT * FROM deeds ORDER BY chain_index ASC")
    ledger_status = verify_entire_ledger(all_deeds)

    pending_mut = int((db.fetchone("SELECT COUNT(*) AS c FROM mutations WHERE status = 'PENDING'") or {}).get("c", 0))
    approved_mut = int((db.fetchone("SELECT COUNT(*) AS c FROM mutations WHERE status = 'APPROVED'") or {}).get("c", 0))
    rejected_mut = int((db.fetchone("SELECT COUNT(*) AS c FROM mutations WHERE status = 'REJECTED'") or {}).get("c", 0))

    active_liens = db.fetchall("SELECT * FROM mortgages_liens WHERE status = 'ACTIVE'")
    released_liens = db.fetchall("SELECT * FROM mortgages_liens WHERE status = 'RELEASED'")
    total_active_mortgage_bdt = sum(int(m.get("amount_bdt", 0)) for m in active_liens)

    mouza_stats = db.fetchall(
        """
        SELECT l.id, l.mouza_bn, l.mouza_en, l.upazila_bn, l.upazila_en, l.district_bn, l.district_en,
               COUNT(p.id) AS plot_count,
               SUM(p.total_area_decimal) AS total_area_decimal
        FROM locations l
        LEFT JOIN plots p ON p.location_id = l.id
        GROUP BY l.id, l.mouza_bn, l.mouza_en, l.upazila_bn, l.upazila_en, l.district_bn, l.district_en
        ORDER BY l.id ASC
        """
    )

    role_counts = db.fetchall("SELECT role, COUNT(*) AS count FROM users GROUP BY role")

    return {
        "kpis": {
            "total_plots": plots_cnt,
            "total_khatians": khatians_cnt,
            "total_persons": persons_cnt,
            "total_users": users_cnt,
            "total_deeds": len(all_deeds),
            "ledger_is_valid": ledger_status["is_valid"],
            "ledger_verified_deeds": ledger_status["verified_count"],
            "ledger_broken_deeds": ledger_status["broken_count"],
            "merkle_root": ledger_status["merkle_root"],
            "pending_mutations": pending_mut,
            "approved_mutations": approved_mut,
            "rejected_mutations": rejected_mut,
            "active_mortgages_count": len(active_liens),
            "released_mortgages_count": len(released_liens),
            "active_mortgages_bdt": total_active_mortgage_bdt,
        },
        "mouza_breakdown": mouza_stats,
        "role_breakdown": role_counts,
    }
