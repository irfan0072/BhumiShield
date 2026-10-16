"""JWT Authentication and Role-Based Access Control (RBAC) for BhumiShield."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any, Optional

from fastapi import Depends, Header, HTTPException

from app.config import JWT_EXPIRE_MINUTES, JWT_SECRET
from app.database import DBConnection, get_db


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    pad = "=" * ((4 - len(s) % 4) % 4)
    return base64.urlsafe_b64decode((s + pad).encode("ascii"))


def create_access_token(payload: dict[str, Any], expires_minutes: int = JWT_EXPIRE_MINUTES) -> str:
    """Creates an HS256 JWT token (compatible with PyJWT and standard RFC 7519)."""
    header = {"alg": "HS256", "typ": "JWT"}
    body = dict(payload)
    body["exp"] = int(time.time()) + (expires_minutes * 60)
    signing_input = (
        f"{_b64url_encode(json.dumps(header, separators=(',', ':')).encode('utf-8'))}."
        f"{_b64url_encode(json.dumps(body, separators=(',', ':')).encode('utf-8'))}"
    )
    sig = hmac.new(JWT_SECRET.encode("utf-8"), signing_input.encode("ascii"), hashlib.sha256).digest()
    return f"{signing_input}.{_b64url_encode(sig)}"


def decode_access_token(token: str) -> dict[str, Any]:
    """Verifies and decodes an HS256 JWT token."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid token format")
        signing_input = f"{parts[0]}.{parts[1]}"
        expected_sig = _b64url_encode(
            hmac.new(JWT_SECRET.encode("utf-8"), signing_input.encode("ascii"), hashlib.sha256).digest()
        )
        if not hmac.compare_digest(parts[2], expected_sig):
            raise ValueError("Signature mismatch")
        payload = json.loads(_b64url_decode(parts[1]).decode("utf-8"))
        if int(payload.get("exp", 0)) < int(time.time()):
            raise ValueError("Token expired")
        return payload
    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail={
                "code": "UNAUTHORIZED",
                "message_bn": "আপনার সেশনের মেয়াদ শেষ হয়েছে বা অনুমোদন নেই। অনুগ্রহ করে আবার লগইন করুন।",
                "message_en": "Invalid or expired authentication token. Please sign in again.",
            },
        ) from exc


def get_optional_user(
    authorization: Optional[str] = Header(default=None),
    db: DBConnection = Depends(get_db),
) -> Optional[dict[str, Any]]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    data = decode_access_token(token)
    user = db.fetchone(
        "SELECT id, username, full_name_bn, full_name_en, role, office_bn, office_en FROM users WHERE username = ?",
        (data.get("sub"),),
    )
    return user


def require_roles(*allowed_roles: str):
    """Dependency factory enforcing role-based access control."""

    def _guard(user: Optional[dict[str, Any]] = Depends(get_optional_user)) -> dict[str, Any]:
        if not user:
            raise HTTPException(
                status_code=401,
                detail={
                    "code": "AUTH_REQUIRED",
                    "message_bn": "এই কাজটি করার জন্য কর্মকর্তা হিসেবে লগইন করা আবশ্যক।",
                    "message_en": "Officer authentication is required to perform this action.",
                },
            )
        if allowed_roles and user["role"] not in allowed_roles and user["role"] != "admin":
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "FORBIDDEN_ROLE",
                    "message_bn": f"আপনার ভূমিকা ({user['role']}) এই কাজের জন্য অনুমোদিত নয়।",
                    "message_en": f"Your role ({user['role']}) is not authorized for this endpoint.",
                },
            )
        return user

    return _guard
