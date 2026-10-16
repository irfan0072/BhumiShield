"""Seeds the BhumiShield database with realistic dummy Bangladeshi land records.

HARD RULE COMPLIANCE:
- 100% synthetic dummy data (fake names, dummy NIDs starting with 990000..., dummy phones 01700-0000...).
- Creates:
  * 5 role-based demo accounts (citizen, sub_registrar, ac_land, bank_officer, admin)
  * 3 mouzas across Dhaka, Gazipur, and Narayanganj
  * 60 plots (20 per mouza) with full CS -> SA -> RS -> BS khatian chains (240 khatian records)
  * 42 synthetic persons with mock NID records
  * 80 hash-chained, Ed25519-signed deeds (including deliberate tampered deed #5)
  * Active & released mortgages, mutation queue cases, hash-chained audit logs
  * All 8 deliberate hackathon demo scenarios tagged in `demo_scenarios`
"""
from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from typing import Any

from app.database import DBConnection, db_session, init_db
from app.ledger.crypto import (
    GENESIS_HASH,
    compute_audit_hash,
    compute_deed_hash,
    sign_hash,
)

BN_DIGITS = str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")


def to_bn_num(val: int | float | str) -> str:
    return str(val).translate(BN_DIGITS)


def hash_password(password: str) -> str:
    """Simple deterministic PBKDF2-HMAC-SHA256 password hash for demo accounts."""
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), b"bhumishield-salt-2026", 10000)
    return dk.hex()


def verify_password(password: str, stored_hash: str) -> bool:
    return hash_password(password) == stored_hash


DEMO_USERS = [
    {
        "username": "citizen",
        "password": "demo123",
        "full_name_bn": "মো. রফিকুল ইসলাম (নাগরিক)",
        "full_name_en": "Md. Rafiqul Islam (Citizen)",
        "role": "citizen",
        "office_bn": "নাগরিক পোর্টাল — সাভার, ঢাকা",
        "office_en": "Citizen Portal — Savar, Dhaka",
    },
    {
        "username": "registrar",
        "password": "demo123",
        "full_name_bn": "ফারহানা ইয়াসমিন (সাব-রেজিস্ট্রার)",
        "full_name_en": "Farhana Yasmin (Sub-Registrar)",
        "role": "sub_registrar",
        "office_bn": "সাব-রেজিস্ট্রি অফিস, সাভার, ঢাকা",
        "office_en": "Sub-Registry Office, Savar, Dhaka",
    },
    {
        "username": "acland",
        "password": "demo123",
        "full_name_bn": "তানভীর আহমেদ (সহকারী কমিশনার - ভূমি)",
        "full_name_en": "Tanvir Ahmed (AC Land)",
        "role": "ac_land",
        "office_bn": "উপজেলা ভূমি অফিস, সাভার, ঢাকা",
        "office_en": "Upazila Land Office, Savar, Dhaka",
    },
    {
        "username": "bank",
        "password": "demo123",
        "full_name_bn": "নাজমুল হাসান (ব্যাংক কর্মকর্তা)",
        "full_name_en": "Nazmul Hasan (Bank Officer)",
        "role": "bank_officer",
        "office_bn": "সোনালী ব্যাংক পিএলসি, সাভার শাখা (ডেমো)",
        "office_en": "Sonali Bank PLC, Savar Branch (Demo)",
    },
    {
        "username": "admin",
        "password": "demo123",
        "full_name_bn": "সিস্টেম অডিটর (ভূমি সুরক্ষা অ্যাডমিন)",
        "full_name_en": "System Auditor (BhumiShield Admin)",
        "role": "admin",
        "office_bn": "কেন্দ্রীয় লেজার মনিটরিং সেল (ডেমো)",
        "office_en": "Central Ledger Monitoring Cell (Demo)",
    },
]

MOUZAS = [
    {
        "division_bn": "ঢাকা",
        "division_en": "Dhaka",
        "district_bn": "ঢাকা",
        "district_en": "Dhaka",
        "upazila_bn": "সাভার",
        "upazila_en": "Savar",
        "mouza_bn": "বিরুলিয়া",
        "mouza_en": "Birulia",
        "jl_no": "12",
    },
    {
        "division_bn": "ঢাকা",
        "division_en": "Dhaka",
        "district_bn": "গাজীপুর",
        "district_en": "Gazipur",
        "upazila_bn": "গাজীপুর সদর",
        "upazila_en": "Gazipur Sadar",
        "mouza_bn": "বাসন",
        "mouza_en": "Bason",
        "jl_no": "08",
    },
    {
        "division_bn": "ঢাকা",
        "division_en": "Dhaka",
        "district_bn": "নারায়ণগঞ্জ",
        "district_en": "Narayanganj",
        "upazila_bn": "সোনারগাঁও",
        "upazila_en": "Sonargaon",
        "mouza_bn": "পানাম",
        "mouza_en": "Panam",
        "jl_no": "15",
    },
]

FIRST_NAMES = [
    ("মো. রফিকুল ইসলাম", "Md. Rafiqul Islam", "মৃত হাজী আবদুল জব্বার", "Late Haji Abdul Jabbar", "হালিমা খাতুন"),
    ("মোসা. রাবেয়া খাতুন", "Mst. Rabeya Khatun", "মো. শামসুল হক", "Md. Shamsul Haque", "আমেনা বেগম"),
    ("আবদুল করিম", "Abdul Karim", "মৃত কফিল উদ্দিন", "Late Kafil Uddin", "জোহরা বেগম"),
    ("মো. জাহাঙ্গীর আলম", "Md. Jahangir Alam", "মো. মোবারক আলী", "Md. Mobarak Ali", "রহিমা খাতুন"),
    ("মো. কামরুল হাসান", "Md. Kamrul Hasan", "মো. লুৎফর রহমান", "Md. Lutfor Rahman", "সালমা বেগম"),
    ("মো. আনোয়ার হোসেন", "Md. Anwar Hossain", "মৃত সিরাজুল ইসলাম", "Late Sirajul Islam", "নূরজাহান বেগম"),
    ("মো. দেলোয়ার হোসেন", "Md. Delwar Hossain", "মৃত সিরাজুল ইসলাম", "Late Sirajul Islam", "নূরজাহান বেগম"),
    ("ফাতেমা বেগম", "Fatema Begum", "মো. ফজলুল করিম", "Md. Fazlul Karim", "আনোয়ারা বেগম"),
    ("মো. সাইফুল ইসলাম", "Md. Saiful Islam", "মো. হাবিবুর রহমান", "Md. Habibur Rahman", "রোকেয়া বেগম"),
    ("মো. মনিরুজ্জামান", "Md. Moniruzzaman", "মৃত আবদুর রশিদ", "Late Abdur Rashid", "হাসিনা বানু"),
    ("মো. মাহবুবুর রহমান", "Md. Mahbubur Rahman", "মৃত আজিজুল হক", "Late Azizul Haque", "মর্জিনা বেগম"),
    ("সালমা আক্তার", "Salma Akter", "মো. নুরুল ইসলাম", "Md. Nurul Islam", "খাদিজা খাতুন"),
    ("মো. শহিদুল ইসলাম", "Md. Shahidul Islam", "মৃত ইসমাইল হোসেন", "Late Ismail Hossain", "সায়েরা খাতুন"),
    ("আলহাজ্ব নূরুল হক", "Alhaj Nurul Haque", "মৃত হাতেম আলী", "Late Hatem Ali", "রাবেয়া বানু"),
    ("মো. তারেক আজিজ", "Md. Tariq Aziz", "আলহাজ্ব নূরুল হক", "Alhaj Nurul Haque", "বিলকিস বেগম"),
    ("নাসরিন সুলতানা", "Nasrin Sultana", "মো. খলিলুর রহমান", "Md. Khalilur Rahman", "ফিরোজা বেগম"),
    ("মো. মিজানুর রহমান", "Md. Mizanur Rahman", "মৃত আবদুল মালেক", "Late Abdul Malek", "জাহানারা বেগম"),
    ("মো. হুমায়ুন কবির", "Md. Humayun Kabir", "মো. তোফাজ্জল হোসেন", "Md. Tofazzal Hossain", "মনোয়ারা বেগম"),
    ("শিরিন আক্তার", "Shirin Akter", "মো. গোলাম মোস্তফা", "Md. Golam Mostafa", "মমতাজ বেগম"),
    ("মো. জাকির হোসেন", "Md. Zakir Hossain", "মৃত আবুল কাশেম", "Late Abul Kashem", "রওশন আরা"),
    ("মো. গোলাম রব্বানী", "Md. Golam Rabbani", "মৃত সোলায়মান মিয়া", "Late Solaiman Mia", "আসমা খাতুন"),
    ("মোসা. রেহানা পারভীন", "Mst. Rehana Parvin", "মো. আমিনুল ইসলাম", "Md. Aminul Islam", "সুফিয়া খাতুন"),
    ("মো. শফিকুল আলম", "Md. Shafiqul Alam", "মৃত মতিউর রহমান", "Late Matiur Rahman", "কুলসুম বেগম"),
    ("মো. খোরশেদ আলম", "Md. Khorshed Alam", "মো. বজলুর রহমান", "Md. Bazlur Rahman", "লতিফা বেগম"),
    ("মো. আশরাফুল ইসলাম", "Md. Ashraful Islam", "মৃত ইউসুফ আলী", "Late Yusuf Ali", "মাহমুদা খাতুন"),
    ("রোকসানা ইয়াসমিন", "Roksana Yasmin", "মো. মোশাররফ হোসেন", "Md. Mosharraf Hossain", "নাজমা বেগম"),
    ("মো. আবুল বাশার", "Md. Abul Bashar", "মৃত জহির উদ্দিন", "Late Zahir Uddin", "ছকিনা খাতুন"),
    ("মো. সাইদুর রহমান", "Md. Saidur Rahman", "মো. আকবর আলী", "Md. Akbar Ali", "রিজিয়া বেগম"),
    ("মো. নাজমুল হুদা", "Md. Nazmul Huda", "মৃত সামছুল আলম", "Late Samsul Alam", "হোসনে আরা"),
    ("মোসা. শারমিন আক্তার", "Mst. Sharmin Akter", "মো. ওবায়দুল হক", "Md. Obaidul Haque", "নূরন্নাহার"),
    ("মো. ফারুক আহমেদ", "Md. Faruque Ahmed", "মৃত গিয়াস উদ্দিন", "Late Gias Uddin", "আয়েশা সিদ্দিকা"),
    ("মো. মোস্তাফিজুর রহমান", "Md. Mostafizur Rahman", "মো. সিদ্দিকুর রহমান", "Md. Siddiqur Rahman", "রুবিনা ইয়াসমিন"),
    ("মো. ইকবাল হোসেন", "Md. Iqbal Hossain", "মৃত শামসুদ্দিন আহমেদ", "Late Shamsuddin Ahmed", "তাহমিনা খাতুন"),
    ("মোসা. নাজমা খাতুন", "Mst. Nazma Khatun", "মো. আলাউদ্দিন মিয়া", "Md. Alauddin Mia", "জমিলা খাতুন"),
    ("মো. এনামুল হক", "Md. Enamul Haque", "মৃত মজিবুর রহমান", "Late Mojibur Rahman", "রাশিদা বেগম"),
    ("মো. হারুন অর রশিদ", "Md. Harun Or Rashid", "মো. জালাল উদ্দিন", "Md. Jalal Uddin", "ফরিদা ইয়াসমিন"),
    ("মো. কামাল উদ্দিন", "Md. Kamal Uddin", "মৃত নাজির আহমেদ", "Late Nazir Ahmed", "সেলিনা বেগম"),
    ("মোসা. তানজিলা আক্তার", "Mst. Tanjila Akter", "মো. রমিজ উদ্দিন", "Md. Ramiz Uddin", "শাহানাজ পারভীন"),
    ("মো. জসিম উদ্দিন", "Md. Jasim Uddin", "মৃত ফয়েজ আহমেদ", "Late Foyez Ahmed", "রহিমা বানু"),
    ("মো. বাবুল আক্তার", "Md. Babul Akter", "মো. নওয়াব আলী", "Md. Nawab Ali", "হাজেরা খাতুন"),
    ("মো. সোহেল রানা", "Md. Sohel Rana", "মো. রুহুল আমিন", "Md. Ruhul Amin", "মিলি আক্তার"),
    ("মোসা. পারভীন সুলতানা", "Mst. Parvin Sultana", "মো. আনিসুর রহমান", "Md. Anisur Rahman", "নূরজাহান"),
]

LAND_TYPES = [
    ("ভিটা (আবাসিক)", "Homestead (Vita)"),
    ("নাল (কৃষি)", "Agricultural (Nal)"),
    ("চালা (উঁচু জমি)", "Highland (Chala)"),
    ("বাগান", "Orchard (Bagan)"),
]


def _append_deed(
    db: DBConnection,
    chain_state: dict[str, Any],
    deed_no: str,
    deed_type: str,
    seller_id: int,
    buyer_id: int,
    plot_id: int,
    share_fraction: str,
    area_decimal: float,
    price_bdt: int,
    status: str,
    created_at: str,
    registered_by: str = "registrar",
    tamper_after_signing_area: float | None = None,
) -> int:
    """Creates a canonical deed, links it to the hash chain, signs it, and optionally tampers it."""
    chain_index = chain_state["next_deed_index"]
    prev_hash = chain_state["last_deed_hash"]

    content_obj = {
        "deed_no": deed_no,
        "deed_type": deed_type,
        "seller_id": seller_id,
        "buyer_id": buyer_id,
        "plot_id": plot_id,
        "share_fraction": share_fraction,
        "area_decimal": round(float(area_decimal), 2),
        "price_bdt": int(price_bdt),
        "registered_by": registered_by,
        "created_at": created_at,
    }
    original_json = json.dumps(content_obj, sort_keys=True, ensure_ascii=False)
    content_hash = compute_deed_hash(content_obj, prev_hash=prev_hash, chain_index=chain_index)
    signature = sign_hash(content_hash)

    stored_json = original_json
    if tamper_after_signing_area is not None:
        # Simulate post-registration database tampering for Demo Scenario #5
        tampered_obj = dict(content_obj)
        tampered_obj["area_decimal"] = round(float(tamper_after_signing_area), 2)
        stored_json = json.dumps(tampered_obj, sort_keys=True, ensure_ascii=False)

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
            deed_type,
            seller_id,
            buyer_id,
            plot_id,
            share_fraction,
            round(float(tamper_after_signing_area or area_decimal), 2),
            int(price_bdt),
            status,
            stored_json,
            original_json,
            content_hash,
            prev_hash,
            signature,
            chain_index,
            registered_by,
            created_at,
        ),
    )

    chain_state["next_deed_index"] = chain_index + 1
    chain_state["last_deed_hash"] = content_hash
    return deed_id


def append_audit_entry(
    db: DBConnection,
    actor_username: str,
    actor_role: str,
    action: str,
    entity_type: str,
    entity_id: str,
    details: dict[str, Any],
    created_at: str = "2026-10-16T09:00:00+06:00",
) -> int:
    """Appends a hash-chained audit log entry."""
    last = db.fetchone("SELECT entry_hash, chain_index FROM audit_log ORDER BY chain_index DESC LIMIT 1")
    prev_hash = last["entry_hash"] if last else GENESIS_HASH
    next_index = (int(last["chain_index"]) + 1) if last else 1

    entry_hash = compute_audit_hash(
        actor_username=actor_username,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        details=details,
        prev_hash=prev_hash,
        chain_index=next_index,
    )
    return db.insert(
        """
        INSERT INTO audit_log (
            actor_username, actor_role, action, entity_type, entity_id,
            details_json, entry_hash, prev_hash, chain_index, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            actor_username,
            actor_role,
            action,
            entity_type,
            str(entity_id),
            json.dumps(details, ensure_ascii=False, sort_keys=True),
            entry_hash,
            prev_hash,
            next_index,
            created_at,
        ),
    )


def seed_all(reset: bool = True) -> dict[str, int]:
    """Populates the database with all dummy data and the 8 hackathon scenarios."""
    init_db(reset=reset)
    with db_session() as db:
        existing = db.fetchone("SELECT COUNT(*) AS cnt FROM plots")
        if existing and int(existing["cnt"]) >= 60 and not reset:
            return {"plots": int(existing["cnt"])}

        # 1. Seed Users
        for u in DEMO_USERS:
            db.insert(
                """
                INSERT INTO users (
                    username, full_name_bn, full_name_en, role,
                    office_bn, office_en, password_hash, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    u["username"],
                    u["full_name_bn"],
                    u["full_name_en"],
                    u["role"],
                    u["office_bn"],
                    u["office_en"],
                    hash_password(u["password"]),
                    "2026-01-01T09:00:00+06:00",
                ),
            )

        # 2. Seed Locations (3 Mouzas)
        location_ids: list[int] = []
        for loc in MOUZAS:
            loc_id = db.insert(
                """
                INSERT INTO locations (
                    division_bn, division_en, district_bn, district_en,
                    upazila_bn, upazila_en, mouza_bn, mouza_en, jl_no
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    loc["division_bn"],
                    loc["division_en"],
                    loc["district_bn"],
                    loc["district_en"],
                    loc["upazila_bn"],
                    loc["upazila_en"],
                    loc["mouza_bn"],
                    loc["mouza_en"],
                    loc["jl_no"],
                ),
            )
            location_ids.append(loc_id)

        # 3. Seed 42 Persons (Dummy NIDs & Phones)
        person_ids: list[int] = []
        for idx, (name_bn, name_en, father_bn, father_en, mother_bn) in enumerate(FIRST_NAMES, start=1):
            nid = f"990000{1000 + idx}"
            phone = f"01700-00{1000 + idx}"
            # Person #14 (Alhaj Nurul Haque) is deceased with unresolved heirs for Scenario #8
            is_deceased = 1 if idx == 14 else 0
            heirs_recorded = 0 if idx == 14 else 1
            m_idx = (idx - 1) % len(MOUZAS)
            addr_bn = f"গ্রাম: {MOUZAS[m_idx]['mouza_bn']}, উপজেলা: {MOUZAS[m_idx]['upazila_bn']}, জেলা: {MOUZAS[m_idx]['district_bn']} (ডেমো)"
            addr_en = f"Village: {MOUZAS[m_idx]['mouza_en']}, Upazila: {MOUZAS[m_idx]['upazila_en']}, District: {MOUZAS[m_idx]['district_en']} (Demo)"

            pid = db.insert(
                """
                INSERT INTO persons (
                    name_bn, name_en, father_name_bn, father_name_en, mother_name_bn,
                    nid, phone_dummy, is_deceased, heirs_recorded, address_bn, address_en
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    name_bn,
                    name_en,
                    father_bn,
                    father_en,
                    mother_bn,
                    nid,
                    phone,
                    is_deceased,
                    heirs_recorded,
                    addr_bn,
                    addr_en,
                ),
            )
            person_ids.append(pid)

        # 4. Seed 60 Plots (20 per mouza) + Full CS -> SA -> RS -> BS Khatian Chains
        plot_ids: list[int] = []
        chain_state = {"next_deed_index": 1, "last_deed_hash": GENESIS_HASH}

        # Specific area configuration for the first 10 plots in Mouza 1 (Birulia) to match scenarios cleanly
        special_areas = {
            1: 20.0,  # Scenario 1: Clean legitimate sale (owner has 20, selling 10)
            2: 15.0,  # Scenario 2: Double sale (owner has 15, already sold 15 in pending deed)
            3: 24.0,  # Scenario 3: Co-owned 1/2 each (12.0 each), seller tries to sell 18.0
            4: 16.0,  # Scenario 4: Seller is not owner on latest BS khatian
            5: 20.0,  # Scenario 5: Deed tampered after registration
            6: 30.0,  # Scenario 6: Plot already mortgaged to Sonali Bank
            7: 18.0,  # Scenario 7: Khatian chain break (RS=18.0 -> BS=26.0 mismatch)
            8: 22.0,  # Scenario 8: Inheritance unresolved (deceased owner, heirs not recorded)
            9: 16.0,  # Rapid resale plot
            10: 25.0,
        }

        for p_idx in range(1, 61):
            loc_idx = (p_idx - 1) // 20
            loc_id = location_ids[loc_idx]
            base_dag = 100 + ((p_idx - 1) % 20) + 1 + (loc_idx * 100)
            dag_str = str(base_dag)
            dag_bn = to_bn_num(dag_str)
            lt_bn, lt_en = LAND_TYPES[(p_idx - 1) % len(LAND_TYPES)]
            area = special_areas.get(p_idx, float(12 + ((p_idx * 3) % 28)))

            notes_bn = "ডেমো রেকর্ড — সিএস, এসএ, আরএস ও বিএস খতিয়ান যাচাইকৃত।"
            notes_en = "Demo record — CS, SA, RS & BS khatian chain recorded."
            if p_idx == 7:
                notes_bn = "সতর্কতা: আরএস খতিয়ানে ১৮ শতাংশ কিন্তু বিএস খতিয়ানে ২৬ শতাংশ রেকর্ডকৃত (অমিল)।"
                notes_en = "Warning: RS khatian records 18 decimals but BS khatian records 26 decimals (mismatch)."
            elif p_idx == 8:
                notes_bn = "সতর্কতা: সর্বশেষ বিএস খতিয়ানের মালিক মৃত; ওয়ারিশ সনদ ও নামজারি অমীমাংসিত।"
                notes_en = "Warning: Recorded BS owner is deceased; succession & mutation unresolved."

            plot_id = db.insert(
                """
                INSERT INTO plots (
                    location_id, dag_no, dag_no_bn, land_type_bn, land_type_en,
                    total_area_decimal, notes_bn, notes_en
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (loc_id, dag_str, dag_bn, lt_bn, lt_en, area, notes_bn, notes_en),
            )
            plot_ids.append(plot_id)

            # Build CS (1915), SA (1960), RS (1982), BS (2016) Khatian chain
            surveys = [
                ("CS", 1915, 1000 + p_idx, None, area, "VALID"),
                ("SA", 1960, 2000 + p_idx, str(1000 + p_idx), area, "VALID"),
                ("RS", 1982, 3000 + p_idx, str(2000 + p_idx), area, "VALID"),
                (
                    "BS",
                    2016,
                    4100 + p_idx,
                    str(3000 + p_idx),
                    26.0 if p_idx == 7 else area,
                    "CHAIN_BREAK" if p_idx == 7 else ("UNRESOLVED_HEIRS" if p_idx == 8 else "VALID"),
                ),
            ]

            khatian_ids: dict[str, int] = {}
            for s_type, s_year, k_no, parent_k, k_area, k_status in surveys:
                rem_bn = "স্বাভাবিক ধারাবাহিক রেকর্ড"
                rem_en = "Consistent survey chain record"
                if p_idx == 7 and s_type == "BS":
                    rem_bn = "আরএস খতিয়ানের (১৮.০০ শতাংশ) সাথে বিএস খতিয়ানের (২৬.০০ শতাংশ) জমির পরিমাণে ৮.০০ শতাংশ অমিল।"
                    rem_en = "Area mismatch of 8.00 decimals between RS (18.00) and BS (26.00) khatian without backing deed."
                elif p_idx == 8 and s_type == "BS":
                    rem_bn = "রেকর্ডীয় মালিক আলহাজ্ব নূরুল হক মৃত; ওয়ারিশগণের নামজারি সম্পন্ন হয়নি।"
                    rem_en = "Recorded owner Alhaj Nurul Haque is deceased; heirs mutation pending."

                kid = db.insert(
                    """
                    INSERT INTO khatian_records (
                        plot_id, survey_type, khatian_no, khatian_no_bn,
                        recorded_area_decimal, survey_year, parent_khatian_no,
                        status, remarks_bn, remarks_en
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        plot_id,
                        s_type,
                        str(k_no),
                        to_bn_num(k_no),
                        k_area,
                        s_year,
                        parent_k,
                        k_status,
                        rem_bn,
                        rem_en,
                    ),
                )
                khatian_ids[s_type] = kid

            # Historical ownerships on CS, SA, RS
            hist_owner_1 = person_ids[(p_idx + 15) % len(person_ids)]
            hist_owner_2 = person_ids[(p_idx + 20) % len(person_ids)]
            for s_type, owner_for_survey in [("CS", hist_owner_1), ("SA", hist_owner_1), ("RS", hist_owner_2)]:
                db.insert(
                    """
                    INSERT INTO ownerships (
                        khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest
                    ) VALUES (?, ?, ?, ?, ?, ?, 0)
                    """,
                    (khatian_ids[s_type], plot_id, owner_for_survey, "1/1", 1.0, area),
                )

            # Latest BS Ownerships tailored to our 8 scenarios
            bs_kid = khatian_ids["BS"]
            if p_idx == 1:
                # Scenario 1: Person 1 owns 100% (20.00 decimals)
                db.insert(
                    "INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, '1/1', 1.0, 20.0, 1)",
                    (bs_kid, plot_id, person_ids[0]),
                )
            elif p_idx == 2:
                # Scenario 2: Person 3 owns 100% (15.00 decimals)
                db.insert(
                    "INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, '1/1', 1.0, 15.0, 1)",
                    (bs_kid, plot_id, person_ids[2]),
                )
            elif p_idx == 3:
                # Scenario 3: Person 6 and Person 7 each own 1/2 share (12.00 decimals each)
                db.insert(
                    "INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, '1/2', 0.5, 12.0, 1)",
                    (bs_kid, plot_id, person_ids[5]),
                )
                db.insert(
                    "INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, '1/2', 0.5, 12.0, 1)",
                    (bs_kid, plot_id, person_ids[6]),
                )
            elif p_idx == 4:
                # Scenario 4: Fatema Begum (person 8) owns 100% (16.00 decimals); Person 9 is NOT owner
                db.insert(
                    "INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, '1/1', 1.0, 16.0, 1)",
                    (bs_kid, plot_id, person_ids[7]),
                )
            elif p_idx == 5:
                # Scenario 5: Person 10 owns 100% (20.00 decimals)
                db.insert(
                    "INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, '1/1', 1.0, 20.0, 1)",
                    (bs_kid, plot_id, person_ids[9]),
                )
            elif p_idx == 6:
                # Scenario 6: Person 11 owns 100% (30.00 decimals), mortgaged to Sonali Bank
                db.insert(
                    "INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, '1/1', 1.0, 30.0, 1)",
                    (bs_kid, plot_id, person_ids[10]),
                )
            elif p_idx == 7:
                # Scenario 7: Person 13 recorded on BS with chain break (26.00 vs 18.00 RS)
                db.insert(
                    "INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, '1/1', 1.0, 26.0, 1)",
                    (bs_kid, plot_id, person_ids[12]),
                )
            elif p_idx == 8:
                # Scenario 8: Deceased owner Alhaj Nurul Haque (Person 14)
                db.insert(
                    "INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, '1/1', 1.0, 22.0, 1)",
                    (bs_kid, plot_id, person_ids[13]),
                )
            elif p_idx == 9:
                # Rapid resale plot: Person 16 owns 16.00 decimals (bought 5 days ago)
                db.insert(
                    "INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, '1/1', 1.0, 16.0, 1)",
                    (bs_kid, plot_id, person_ids[15]),
                )
            else:
                owner_id = person_ids[(p_idx + 3) % len(person_ids)]
                if p_idx == 13:
                    owner_id = person_ids[0]  # make sure person 1 owns plot 13 too
                fract = Fraction(1, 1)
                db.insert(
                    "INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, ?, ?, ?, 1)",
                    (bs_kid, plot_id, owner_id, f"{fract.numerator}/{fract.denominator}", float(fract), area),
                )

        # 5. Seed 80 Deeds in a Cryptographic Hash Chain
        # Deeds 1..5 are the hero deeds for Scenarios 1..5
        # Deed 1: Historical clean acquisition for Plot 1
        deed_1_id = _append_deed(
            db,
            chain_state,
            deed_no="DL-2024-1001",
            deed_type="SALE",
            seller_id=person_ids[16],
            buyer_id=person_ids[0],
            plot_id=plot_ids[0],
            share_fraction="1/1",
            area_decimal=20.0,
            price_bdt=3000000,
            status="MUTATED",
            created_at="2024-03-15T11:20:00+06:00",
        )

        # Deed 2: Active Pending Sale on Plot 2 (causes Scenario 2 DOUBLE_SALE when seller tries to sell again!)
        deed_2_id = _append_deed(
            db,
            chain_state,
            deed_no="DL-2026-1002",
            deed_type="SALE",
            seller_id=person_ids[2],  # Abdul Karim
            buyer_id=person_ids[3],   # Md. Jahangir Alam (First Buyer)
            plot_id=plot_ids[1],      # Plot #2 (15.0 decimals)
            share_fraction="1/1",
            area_decimal=15.0,
            price_bdt=2400000,
            status="PENDING_MUTATION",
            created_at="2026-10-02T14:10:00+06:00",
        )

        # Deed 3: Historical co-ownership deed on Plot 3
        _append_deed(
            db,
            chain_state,
            deed_no="DL-2023-1003",
            deed_type="INHERITANCE",
            seller_id=person_ids[17],
            buyer_id=person_ids[5],
            plot_id=plot_ids[2],
            share_fraction="1/2",
            area_decimal=12.0,
            price_bdt=0,
            status="MUTATED",
            created_at="2023-06-11T10:00:00+06:00",
        )

        # Deed 4: Historical sale on Plot 4 to Fatema Begum (person 8)
        _append_deed(
            db,
            chain_state,
            deed_no="DL-2022-1004",
            deed_type="SALE",
            seller_id=person_ids[8],  # Md. Saiful Islam sold it in 2022!
            buyer_id=person_ids[7],   # Fatema Begum is now current owner
            plot_id=plot_ids[3],
            share_fraction="1/1",
            area_decimal=16.0,
            price_bdt=2100000,
            status="MUTATED",
            created_at="2022-09-20T12:30:00+06:00",
        )

        # Deed 5: Scenario 5 — TAMPERED DEED! Signed for 10.00 decimals, altered in DB to 25.00 decimals
        deed_5_id = _append_deed(
            db,
            chain_state,
            deed_no="DL-2026-1005",
            deed_type="SALE",
            seller_id=person_ids[9],
            buyer_id=person_ids[11],
            plot_id=plot_ids[4],
            share_fraction="1/2",
            area_decimal=10.0,
            price_bdt=1800000,
            status="REGISTERED",
            created_at="2026-09-28T15:45:00+06:00",
            tamper_after_signing_area=25.0,
        )

        # Deed 6: Mortgage deed on Plot 6
        deed_6_id = _append_deed(
            db,
            chain_state,
            deed_no="DL-2026-1006",
            deed_type="MORTGAGE",
            seller_id=person_ids[10],
            buyer_id=person_ids[18],
            plot_id=plot_ids[5],
            share_fraction="1/1",
            area_decimal=30.0,
            price_bdt=2500000,
            status="REGISTERED",
            created_at="2026-08-12T11:00:00+06:00",
        )

        # Deed 7: Recent purchase on Plot 9 (5 days ago — triggers RAPID_RESALE if resold today)
        _append_deed(
            db,
            chain_state,
            deed_no="DL-2026-1007",
            deed_type="SALE",
            seller_id=person_ids[19],
            buyer_id=person_ids[15],
            plot_id=plot_ids[8],
            share_fraction="1/1",
            area_decimal=16.0,
            price_bdt=2800000,
            status="MUTATED",
            created_at="2026-10-12T16:00:00+06:00",
        )

        # Seed 73 additional historical deeds across plots 10..60 to reach 80 total deeds
        deed_types_cycle = ["SALE", "SALE", "HIBA", "SALE", "INHERITANCE"]
        for d_idx in range(8, 81):
            p_target = plot_ids[(d_idx + 2) % len(plot_ids)]
            s_person = person_ids[(d_idx * 3) % len(person_ids)]
            b_person = person_ids[(d_idx * 3 + 5) % len(person_ids)]
            dtype = deed_types_cycle[d_idx % len(deed_types_cycle)]
            year = 2018 + (d_idx % 8)
            month = 1 + (d_idx % 12)
            day = 1 + (d_idx % 27)
            _append_deed(
                db,
                chain_state,
                deed_no=f"DL-{year}-{1000 + d_idx}",
                deed_type=dtype,
                seller_id=s_person,
                buyer_id=b_person,
                plot_id=p_target,
                share_fraction="1/2" if d_idx % 2 == 0 else "1/1",
                area_decimal=8.0 if d_idx % 2 == 0 else 14.0,
                price_bdt=1200000 + (d_idx * 25000),
                status="MUTATED" if d_idx < 76 else "PENDING_MUTATION",
                created_at=f"{year}-{month:02d}-{day:02d}T11:15:00+06:00",
            )

        # 6. Seed Mortgages / Liens
        # Active lien on Plot #6 (Scenario 6)
        db.insert(
            """
            INSERT INTO mortgages_liens (
                plot_id, borrower_id, bank_name_bn, bank_name_en,
                branch_bn, amount_bdt, area_mortgaged_decimal, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
            """,
            (
                plot_ids[5],
                person_ids[10],
                "সোনালী ব্যাংক পিএলসি",
                "Sonali Bank PLC",
                "সাভার শাখা, ঢাকা",
                2500000,
                30.0,
                "2026-08-12T11:30:00+06:00",
            ),
        )
        # Active lien on Plot #15
        db.insert(
            """
            INSERT INTO mortgages_liens (
                plot_id, borrower_id, bank_name_bn, bank_name_en,
                branch_bn, amount_bdt, area_mortgaged_decimal, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
            """,
            (
                plot_ids[14],
                person_ids[18],
                "বাংলাদেশ কৃষি ব্যাংক",
                "Bangladesh Krishi Bank",
                "গাজীপুর সদর শাখা",
                1500000,
                16.0,
                "2026-07-05T10:15:00+06:00",
            ),
        )
        # Released historical lien on Plot #1
        db.insert(
            """
            INSERT INTO mortgages_liens (
                plot_id, borrower_id, bank_name_bn, bank_name_en,
                branch_bn, amount_bdt, area_mortgaged_decimal, status, created_at, released_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'RELEASED', ?, ?)
            """,
            (
                plot_ids[0],
                person_ids[0],
                "অগ্রণী ব্যাংক পিএলসি",
                "Agrani Bank PLC",
                "সাভার শাখা",
                800000,
                20.0,
                "2024-05-10T10:00:00+06:00",
                "2025-11-20T15:00:00+06:00",
            ),
        )

        # 7. Seed Mutation Queue Cases for AC Land
        db.insert(
            """
            INSERT INTO mutations (
                case_no, deed_id, plot_id, seller_id, buyer_id,
                area_decimal, status, decision_reason_bn, decision_reason_en, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
            """,
            (
                "MUT-2026-501",
                deed_2_id,
                plot_ids[1],
                person_ids[2],
                person_ids[3],
                15.0,
                "সাব-রেজিস্ট্রি অফিস হতে প্রাপ্ত দলিল নং DL-2026-1002 নামজারির অপেক্ষায়।",
                "Awaiting AC Land mutation decision for registered deed DL-2026-1002.",
                "2026-10-03T09:30:00+06:00",
            ),
        )
        db.insert(
            """
            INSERT INTO mutations (
                case_no, deed_id, plot_id, seller_id, buyer_id,
                area_decimal, status, decision_reason_bn, decision_reason_en, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
            """,
            (
                "MUT-2026-502",
                deed_5_id,
                plot_ids[4],
                person_ids[9],
                person_ids[11],
                25.0,
                "সতর্কতা: দলিল নং DL-2026-1005-এ হ্যাশ অমিল (তথ্য পরিবর্তনের ঝুঁকি) সনাক্ত হয়েছে।",
                "ALERT: Hash mismatch detected on Deed DL-2026-1005.",
                "2026-09-29T10:15:00+06:00",
            ),
        )
        db.insert(
            """
            INSERT INTO mutations (
                case_no, deed_id, plot_id, seller_id, buyer_id,
                area_decimal, status, decision_reason_bn, decision_reason_en,
                decided_by, decided_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'APPROVED', ?, ?, 'acland', ?, ?)
            """,
            (
                "MUT-2024-101",
                deed_1_id,
                plot_ids[0],
                person_ids[16],
                person_ids[0],
                20.0,
                "মালিকানা চেইন ও দলিলের ডিজিটাল স্বাক্ষর সঠিক থাকায় নামজারি অনুমোদিত।",
                "Ownership chain and digital signature verified; mutation approved.",
                "2024-04-02T14:00:00+06:00",
                "2024-03-16T10:00:00+06:00",
            ),
        )

        # 8. Seed 8 Deliberate Demo Scenarios
        scenarios = [
            {
                "scenario_no": 1,
                "code": "CLEAN_SALE",
                "title_bn": "১. বৈধ ও নিরাপদ জমি বিক্রয় (সকল যাচাই সফল)",
                "title_en": "1. Clean Legitimate Sale (All Checks Pass)",
                "expected_verdict": "SAFE",
                "badge_bn": "✔ নিরাপদ",
                "badge_en": "✔ Safe",
                "description_bn": "বিরুলিয়া মৌজার দাগ নং ১০১-এর প্রকৃত মালিক মো. রফিকুল ইসলাম তাঁর ২০ শতাংশ নিষ্কণ্টক জমি হতে ১০ শতাংশ (১/২ অংশ) মোসা. রাবেয়া খাতুনের নিকট বিক্রয় করছেন। সিএস-এসএ-আরএস-বিএস খতিয়ান ও এনআইডি সম্পূর্ণ সঠিক।",
                "description_en": "Legitimate owner Md. Rafiqul Islam sells 10 decimals (out of 20 decimals owned on BS Khatian 4101, Dag 101, Birulia) to Mst. Rabeya Khatun. Full CS-SA-RS-BS chain intact and no liens.",
                "plot_id": plot_ids[0],
                "deed_id": deed_1_id,
                "seller_id": person_ids[0],
                "buyer_id": person_ids[1],
                "requested_area_decimal": 10.0,
                "seller_nid_override": None,
                "recommended_view": "sub_registrar",
            },
            {
                "scenario_no": 2,
                "code": "DOUBLE_SALE",
                "title_bn": "২. একই জমি দুইবার বিক্রয়ের চেষ্টা (ডাবল সেল জালিয়াতি)",
                "title_en": "2. Double Sale of the Same Plot to Two Buyers",
                "expected_verdict": "HIGH_RISK",
                "badge_bn": "✖ ঝুঁকিপূর্ণ (আটকানো)",
                "badge_en": "✖ High Risk (Blocked)",
                "description_bn": "দাগ নং ১০২-এর মালিক আবদুল করিম ইতিমধ্যে দলিল নং DL-2026-1002 মূলে সম্পূর্ণ ১৫ শতাংশ জমি মো. জাহাঙ্গীর আলমের নিকট বিক্রি করেছেন (নামজারি প্রক্রিয়াধীন)। এখন তিনি আবার একই জমি মো. কামরুল হাসানের কাছে বিক্রির চেষ্টা করছেন।",
                "description_en": "Owner Abdul Karim already sold all 15 decimals of Dag 102 to Md. Jahangir Alam via Deed DL-2026-1002 (mutation pending) and now attempts to sell 10 decimals of the same plot to a second buyer.",
                "plot_id": plot_ids[1],
                "deed_id": deed_2_id,
                "seller_id": person_ids[2],
                "buyer_id": person_ids[4],
                "requested_area_decimal": 10.0,
                "seller_nid_override": None,
                "recommended_view": "sub_registrar",
            },
            {
                "scenario_no": 3,
                "code": "AREA_EXCEEDS_OWNED",
                "title_bn": "৩. নিজের অংশের চেয়ে বেশি জমি বিক্রয়ের চেষ্টা",
                "title_en": "3. Seller Selling More Area Than Owned Share",
                "expected_verdict": "HIGH_RISK",
                "badge_bn": "✖ ঝুঁকিপূর্ণ (আটকানো)",
                "badge_en": "✖ High Risk (Blocked)",
                "description_bn": "দাগ নং ১০৩-এ মোট জমি ২৪ শতাংশ। বিক্রেতা মো. আনোয়ার হোসেন বিএস খতিয়ান ৪১০৩ অনুযায়ী ১/২ অংশের (১২ শতাংশ) মালিক, কিন্তু তিনি ১৮ শতাংশ জমি বিক্রির দলিল নিবন্ধনের চেষ্টা করছেন।",
                "description_en": "Dag 103 has 24 decimals total. Seller Md. Anwar Hossain owns a 1/2 share (12 decimals) on BS Khatian 4103, but attempts to sell 18 decimals.",
                "plot_id": plot_ids[2],
                "deed_id": None,
                "seller_id": person_ids[5],
                "buyer_id": person_ids[4],
                "requested_area_decimal": 18.0,
                "seller_nid_override": None,
                "recommended_view": "sub_registrar",
            },
            {
                "scenario_no": 4,
                "code": "SELLER_NOT_OWNER",
                "title_bn": "৪. ভুয়া মালিক কর্তৃক জমি বিক্রয়ের চেষ্টা (সর্বশেষ খতিয়ানে নাম নেই)",
                "title_en": "4. Seller Is Not the Current Owner on Latest Khatian",
                "expected_verdict": "HIGH_RISK",
                "badge_bn": "✖ ঝুঁকিপূর্ণ (আটকানো)",
                "badge_en": "✖ High Risk (Blocked)",
                "description_bn": "দাগ নং ১০৪-এর বর্তমান বিএস খতিয়ান ৪১০৪-এর একমাত্র মালিক ফাতেমা বেগম। কিন্তু পূর্ববর্তী বিক্রেতা মো. সাইফুল ইসলাম নিজেকে মালিক দাবি করে ৮ শতাংশ জমি বিক্রির চেষ্টা করছেন।",
                "description_en": "Fatema Begum is the sole recorded owner on latest BS Khatian 4104 for Dag 104, but non-owner Md. Saiful Islam attempts to sell 8 decimals.",
                "plot_id": plot_ids[3],
                "deed_id": None,
                "seller_id": person_ids[8],
                "buyer_id": person_ids[9],
                "requested_area_decimal": 8.0,
                "seller_nid_override": None,
                "recommended_view": "sub_registrar",
            },
            {
                "scenario_no": 5,
                "code": "DEED_TAMPERED",
                "title_bn": "৫. নিবন্ধনের পরে দলিলের তথ্য গোপনে পরিবর্তন (হ্যাশ ও স্বাক্ষর অমিল)",
                "title_en": "5. Stored Deed Tampered After Registration (Hash & Signature Mismatch)",
                "expected_verdict": "HIGH_RISK",
                "badge_bn": "✖ ঝুঁকিপূর্ণ (টেম্পারিং সনাক্ত)",
                "badge_en": "✖ High Risk (Tampered)",
                "description_bn": "দলিল নং DL-2026-1005 (দাগ নং ১০৫) মূলত ১০ শতাংশ জমির জন্য নিবন্ধিত ও ডিজিটাল স্বাক্ষরিত হয়েছিল। পরবর্তীতে ডাটাবেজে জমির পরিমাণ পরিবর্তন করে ২৫ শতাংশ করা হয়েছে—যা SHA-256 হ্যাশ চেইনে তাৎক্ষণিক ধরা পড়ে।",
                "description_en": "Deed DL-2026-1005 (Dag 105) was originally signed for 10 decimals, then altered in storage to 25 decimals. Hash chain recomputation catches the tampering immediately.",
                "plot_id": plot_ids[4],
                "deed_id": deed_5_id,
                "seller_id": person_ids[9],
                "buyer_id": person_ids[11],
                "requested_area_decimal": 25.0,
                "seller_nid_override": None,
                "recommended_view": "verify",
            },
            {
                "scenario_no": 6,
                "code": "PLOT_MORTGAGED",
                "title_bn": "৬. ব্যাংকে বন্ধক থাকা জমি পুনরায় বন্ধক বা বিক্রির চেষ্টা (ডাবল মর্টগেজ)",
                "title_en": "6. Plot Already Mortgaged Offered as Collateral Again",
                "expected_verdict": "HIGH_RISK",
                "badge_bn": "✖ ঝুঁকিপূর্ণ (বন্ধককৃত)",
                "badge_en": "✖ High Risk (Mortgaged)",
                "description_bn": "দাগ নং ১০৬-এর ৩০ শতাংশ জমি সোনালী ব্যাংক পিএলসি (সাভার শাখা)-তে ২৫,০০,০০০ টাকার ঋণের বিপরীতে সক্রিয়ভাবে বন্ধক রয়েছে। ঋণ পরিশোধ ও ছাড়পত্র ছাড়া নতুন বন্ধক বা বিক্রয় ব্লক করা হয়েছে।",
                "description_en": "Dag 106 (30 decimals) has an active BDT 2,500,000 mortgage lien with Sonali Bank PLC, Savar Branch. Second mortgage or unencumbered transfer is blocked.",
                "plot_id": plot_ids[5],
                "deed_id": deed_6_id,
                "seller_id": person_ids[10],
                "buyer_id": person_ids[11],
                "requested_area_decimal": 15.0,
                "seller_nid_override": None,
                "recommended_view": "bank",
            },
            {
                "scenario_no": 7,
                "code": "KHATIAN_CHAIN_BREAK",
                "title_bn": "৭. খতিয়ান চেইনে অসামঞ্জস্যতা (আরএস → বিএস জমির পরিমাণ অমিল)",
                "title_en": "7. Khatian Survey Chain Break (RS -> BS Area Discrepancy)",
                "expected_verdict": "REVIEW",
                "badge_bn": "⚠ সতর্কতা (যাচাই প্রয়োজন)",
                "badge_en": "⚠ Warning (Needs Review)",
                "description_bn": "দাগ নং ১০৭-এ সিএস, এসএ এবং আরএস খতিয়ানে জমির পরিমাণ ১৮ শতাংশ থাকলেও সর্বশেষ বিএস খতিয়ানে কোনো দলিল ছাড়াই ২৬ শতাংশ লিপিবদ্ধ হয়েছে। মানব কর্মকর্তার ম্যানুয়াল যাচাইয়ের জন্য ফ্ল্যাগ করা হয়েছে।",
                "description_en": "Dag 107 records 18 decimals across CS, SA, and RS surveys, but jumps to 26 decimals in BS Khatian 4107 without a supporting deed. Flagged for officer review.",
                "plot_id": plot_ids[6],
                "deed_id": None,
                "seller_id": person_ids[12],
                "buyer_id": person_ids[1],
                "requested_area_decimal": 10.0,
                "seller_nid_override": None,
                "recommended_view": "citizen",
            },
            {
                "scenario_no": 8,
                "code": "INHERITANCE_UNRESOLVED",
                "title_bn": "৮. মৃত মালিকের ওয়ারিশ সনদ ও নামজারি অমীমাংসিত (ম্যানুয়াল রিভিউ)",
                "title_en": "8. Inheritance Case with Unresolved Heirs (Manual Review)",
                "expected_verdict": "REVIEW",
                "badge_bn": "⚠ সতর্কতা (ওয়ারিশ যাচাই)",
                "badge_en": "⚠ Warning (Heirs Unresolved)",
                "description_bn": "দাগ নং ১০৮-এর রেকর্ডীয় মালিক আলহাজ্ব নূরুল হক মৃত্যুবরণ করেছেন, কিন্তু এখনো সকল ওয়ারিশের নামজারি ও বণ্টননামা সম্পন্ন হয়নি। এসি ল্যান্ড ও সাব-রেজিস্ট্রারের যৌথ যাচাইয়ের জন্য সতর্কতা প্রদান।",
                "description_en": "Recorded BS owner Alhaj Nurul Haque (Dag 108) is marked deceased in the registry without completed succession mutation for all legal heirs.",
                "plot_id": plot_ids[7],
                "deed_id": None,
                "seller_id": person_ids[13],
                "buyer_id": person_ids[14],
                "requested_area_decimal": 11.0,
                "seller_nid_override": None,
                "recommended_view": "citizen",
            },
        ]

        for sc in scenarios:
            db.insert(
                """
                INSERT INTO demo_scenarios (
                    scenario_no, code, title_bn, title_en, expected_verdict,
                    badge_bn, badge_en, description_bn, description_en,
                    plot_id, deed_id, seller_id, buyer_id, requested_area_decimal,
                    seller_nid_override, recommended_view
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    sc["scenario_no"],
                    sc["code"],
                    sc["title_bn"],
                    sc["title_en"],
                    sc["expected_verdict"],
                    sc["badge_bn"],
                    sc["badge_en"],
                    sc["description_bn"],
                    sc["description_en"],
                    sc["plot_id"],
                    sc["deed_id"],
                    sc["seller_id"],
                    sc["buyer_id"],
                    sc["requested_area_decimal"],
                    sc["seller_nid_override"],
                    sc["recommended_view"],
                ),
            )

        # 9. Initial Audit Log Chain
        append_audit_entry(
            db,
            actor_username="admin",
            actor_role="admin",
            action="LEDGER_GENESIS_SEED",
            entity_type="ledger",
            entity_id="GENESIS",
            details={
                "note_bn": "ভূমি সুরক্ষা ডেমো লেজার ও ৬০টি দাগের খতিয়ান চেইন ইনিশিয়ালাইজড",
                "note_en": "BhumiShield demo ledger initialized with 60 plots and 80 signed deeds",
            },
            created_at="2026-01-01T09:05:00+06:00",
        )
        append_audit_entry(
            db,
            actor_username="registrar",
            actor_role="sub_registrar",
            action="DEED_REGISTERED",
            entity_type="deed",
            entity_id=str(deed_2_id),
            details={
                "deed_no": "DL-2026-1002",
                "plot_dag": "102",
                "area_decimal": 15.0,
                "note_bn": "দলিল নিবন্ধিত ও ই-নামজারির জন্য এসি ল্যান্ড অফিসে প্রেরিত",
            },
            created_at="2026-10-02T14:12:00+06:00",
        )
        append_audit_entry(
            db,
            actor_username="bank",
            actor_role="bank_officer",
            action="MORTGAGE_LIEN_CREATED",
            entity_type="plot",
            entity_id=str(plot_ids[5]),
            details={
                "bank": "Sonali Bank PLC",
                "amount_bdt": 2500000,
                "note_bn": "দাগ নং ১০৬-এ সোনালী ব্যাংকের ২৫ লক্ষ টাকার বন্ধক এন্ট্রি",
            },
            created_at="2026-08-12T11:32:00+06:00",
        )

        db.commit()
        return {
            "users": len(DEMO_USERS),
            "mouzas": len(location_ids),
            "persons": len(person_ids),
            "plots": len(plot_ids),
            "khatian_records": len(plot_ids) * 4,
            "deeds": chain_state["next_deed_index"] - 1,
            "scenarios": len(scenarios),
        }
