"""Cryptographic primitives for BhumiShield's tamper-evident deed ledger.

Every registered deed is:
1. Canonicalized into sorted-key JSON (`canonical_json`).
2. Linked to the previous deed's SHA-256 hash (`prev_hash`) and chain index (`chain_index`).
3. Hashed with SHA-256 (`content_hash`).
4. Digitally signed with the Sub-Registrar's Ed25519 private key (`signature`).
"""
from __future__ import annotations

import hashlib
import json
from typing import Any, Optional

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)

from app.config import REGISTRAR_ED25519_SEED_HEX

GENESIS_HASH: str = "0" * 64


def _load_keypair() -> tuple[Ed25519PrivateKey, Ed25519PublicKey]:
    """Derives a deterministic Ed25519 keypair from the configured 32-byte seed."""
    seed_bytes = bytes.fromhex(REGISTRAR_ED25519_SEED_HEX)
    if len(seed_bytes) != 32:
        seed_bytes = hashlib.sha256(seed_bytes).digest()
    priv = Ed25519PrivateKey.from_private_bytes(seed_bytes)
    return priv, priv.public_key()


_PRIVATE_KEY, _PUBLIC_KEY = _load_keypair()


def get_registrar_public_key_hex() -> str:
    """Returns the 32-byte raw Ed25519 public key in hex for transparency."""
    raw = _PUBLIC_KEY.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    return raw.hex()


def canonical_json(data: dict[str, Any]) -> str:
    """Serializes a dictionary into canonical sorted-key JSON with no extra whitespace."""
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def compute_sha256(text: str) -> str:
    """Returns the hex SHA-256 digest of a UTF-8 string."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def compute_deed_hash(content: dict[str, Any], prev_hash: str, chain_index: int) -> str:
    """Computes the SHA-256 hash over the canonical deed envelope."""
    envelope = {
        "chain_index": int(chain_index),
        "prev_hash": str(prev_hash),
        "content": content,
    }
    return compute_sha256(canonical_json(envelope))


def compute_audit_hash(
    actor_username: str,
    action: str,
    entity_type: str,
    entity_id: str,
    details: dict[str, Any],
    prev_hash: str,
    chain_index: int,
) -> str:
    """Computes the SHA-256 hash for an append-only audit log row."""
    envelope = {
        "actor_username": actor_username,
        "action": action,
        "entity_type": entity_type,
        "entity_id": str(entity_id),
        "details": details,
        "prev_hash": prev_hash,
        "chain_index": int(chain_index),
    }
    return compute_sha256(canonical_json(envelope))


def sign_hash(content_hash: str) -> str:
    """Signs a SHA-256 hex digest using the registrar's Ed25519 private key."""
    sig_bytes = _PRIVATE_KEY.sign(content_hash.encode("utf-8"))
    return sig_bytes.hex()


def verify_signature(content_hash: str, signature_hex: str) -> bool:
    """Verifies an Ed25519 signature against the registrar's public key."""
    try:
        sig_bytes = bytes.fromhex(signature_hex)
        _PUBLIC_KEY.verify(sig_bytes, content_hash.encode("utf-8"))
        return True
    except (ValueError, InvalidSignature):
        return False


def compute_merkle_root(hashes: list[str]) -> str:
    """Computes a binary SHA-256 Merkle root over a list of deed hashes (Daily Anchor)."""
    if not hashes:
        return GENESIS_HASH
    layer = list(hashes)
    while len(layer) > 1:
        if len(layer) % 2 == 1:
            layer.append(layer[-1])
        next_layer: list[str] = []
        for i in range(0, len(layer), 2):
            combined = f"{layer[i]}:{layer[i + 1]}"
            next_layer.append(compute_sha256(combined))
        layer = next_layer
    return layer[0]


def verify_deed_record(
    deed_row: dict[str, Any],
    expected_prev_hash: Optional[str] = None,
) -> dict[str, Any]:
    """Recomputes a deed's SHA-256 hash and verifies its Ed25519 signature and chain link."""
    try:
        content = (
            json.loads(deed_row["content_json"])
            if isinstance(deed_row["content_json"], str)
            else deed_row["content_json"]
        )
    except Exception:
        content = {}

    try:
        original_content = (
            json.loads(deed_row.get("original_content_json") or "{}")
            if isinstance(deed_row.get("original_content_json"), str)
            else (deed_row.get("original_content_json") or {})
        )
    except Exception:
        original_content = {}

    recomputed_hash = compute_deed_hash(
        content=content,
        prev_hash=deed_row["prev_hash"],
        chain_index=int(deed_row["chain_index"]),
    )
    stored_hash = deed_row["content_hash"]
    hash_valid = recomputed_hash == stored_hash
    signature_valid = verify_signature(recomputed_hash, deed_row["signature"])
    chain_valid = (
        True if expected_prev_hash is None else (deed_row["prev_hash"] == expected_prev_hash)
    )

    tampered_fields: list[dict[str, Any]] = []
    if not hash_valid and original_content:
        all_keys = sorted(set(content.keys()) | set(original_content.keys()))
        for k in all_keys:
            if content.get(k) != original_content.get(k):
                tampered_fields.append(
                    {
                        "field": k,
                        "original_value": original_content.get(k),
                        "current_value": content.get(k),
                    }
                )

    is_valid = hash_valid and signature_valid and chain_valid

    if is_valid:
        message_bn = "এই দলিলের সকল তথ্য অপরিবর্তিত এবং ডিজিটাল স্বাক্ষর সত্যায়িত।"
        message_en = "This deed's content is intact and its cryptographic signature is verified."
    elif not hash_valid:
        message_bn = "সতর্কবার্তা: নিবন্ধনের পরে এই দলিলের তথ্য গোপনে পরিবর্তন (টেম্পারিং) করা হয়েছে!"
        message_en = "ALERT: This deed's stored content was altered after registration (hash mismatch)!"
    elif not signature_valid:
        message_bn = "সতর্কবার্তা: এই দলিলের ডিজিটাল স্বাক্ষর অবৈধ!"
        message_en = "ALERT: This deed's digital signature is invalid!"
    else:
        message_bn = "সতর্কবার্তা: পূর্ববর্তী দলিলের হ্যাশ চেইনের সাথে সংযোগ বিচ্ছিন্ন হয়েছে!"
        message_en = "ALERT: Hash chain link to the previous deed is broken!"

    return {
        "deed_id": deed_row.get("id"),
        "deed_no": deed_row.get("deed_no"),
        "chain_index": deed_row.get("chain_index"),
        "is_valid": is_valid,
        "verdict": "SAFE" if is_valid else "HIGH_RISK",
        "badge_bn": "✔ নিরাপদ ও অপরিবর্তিত" if is_valid else "✖ ঝুঁকিপূর্ণ (তথ্য পরিবর্তিত)",
        "badge_en": "✔ Verified & Intact" if is_valid else "✖ High Risk (Tampered)",
        "hash_valid": hash_valid,
        "signature_valid": signature_valid,
        "chain_valid": chain_valid,
        "stored_hash": stored_hash,
        "recomputed_hash": recomputed_hash,
        "prev_hash": deed_row.get("prev_hash"),
        "expected_prev_hash": expected_prev_hash or deed_row.get("prev_hash"),
        "signature": deed_row.get("signature"),
        "public_key_hex": get_registrar_public_key_hex(),
        "tampered_fields": tampered_fields,
        "message_bn": message_bn,
        "message_en": message_en,
    }


def verify_entire_ledger(deed_rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Verifies the entire hash-chained deed ledger from Genesis to the latest deed."""
    ordered = sorted(deed_rows, key=lambda r: int(r["chain_index"]))
    expected_prev = GENESIS_HASH
    broken_links: list[dict[str, Any]] = []
    verified_count = 0
    recomputed_hashes: list[str] = []

    for row in ordered:
        res = verify_deed_record(row, expected_prev_hash=expected_prev)
        recomputed_hashes.append(res["recomputed_hash"])
        if res["is_valid"]:
            verified_count += 1
        else:
            broken_links.append(res)
        # Advance expected_prev to the recomputed hash so downstream links also reflect tampering
        expected_prev = res["recomputed_hash"]

    is_valid = len(broken_links) == 0
    first_broken = broken_links[0] if broken_links else None

    if is_valid:
        msg_bn = f"সম্পূর্ণ লেজার যাচাইকৃত ({len(ordered)}টি দলিলের সবকটিই নিরাপদ ও অপরিবর্তিত)।"
        msg_en = f"Entire ledger verified ({len(ordered)} deeds intact with unbroken hash chain)."
    else:
        msg_bn = (
            f"লেজার চেইনে ত্রুটি ধরা পড়েছে! দলিল নং {first_broken['deed_no']} "
            f"(চেইন ইনডেক্স #{first_broken['chain_index']})-এ তথ্য পরিবর্তন করা হয়েছে।"
        )
        msg_en = (
            f"Ledger integrity breach detected at Deed {first_broken['deed_no']} "
            f"(Chain Index #{first_broken['chain_index']})."
        )

    return {
        "is_valid": is_valid,
        "total_deeds": len(ordered),
        "verified_count": verified_count,
        "broken_count": len(broken_links),
        "first_broken_index": first_broken["chain_index"] if first_broken else None,
        "first_broken_deed_id": first_broken["deed_id"] if first_broken else None,
        "first_broken_deed_no": first_broken["deed_no"] if first_broken else None,
        "broken_links": broken_links,
        "merkle_root": compute_merkle_root(recomputed_hashes),
        "public_key_hex": get_registrar_public_key_hex(),
        "message_bn": msg_bn,
        "message_en": msg_en,
    }
