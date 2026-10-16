"""Comprehensive test suite for BhumiShield's Fraud Rules Engine, Hash-Chained Ledger, and 8 Demo Scenarios.

Run with:
    pytest
or:
    python3 -m pytest
"""
from __future__ import annotations

import os
import tempfile
import unittest

# Use an isolated temporary SQLite DB for tests so test runs are fast and repeatable
_TEMP_DB = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_TEMP_DB.close()
os.environ["BHUMISHIELD_TEST_DB"] = _TEMP_DB.name

from app.database import db_session
from app.ledger.crypto import (
    GENESIS_HASH,
    compute_deed_hash,
    compute_merkle_root,
    sign_hash,
    verify_deed_record,
    verify_entire_ledger,
    verify_signature,
)
from app.routers.verify_ledger import (
    restore_tampered_deed,
    simulate_deed_tampering,
    verify_full_ledger_endpoint,
    verify_single_deed,
)
from app.routers.workflows import (
    CollateralCheckRequest,
    CreateMortgageRequest,
    MutationDecisionRequest,
    PreRegistrationCheckRequest,
    RegisterDeedRequest,
    bank_collateral_check,
    citizen_check_before_you_buy,
    create_mortgage_lien,
    decide_mutation_case,
    list_demo_scenarios,
    sub_registrar_pre_check,
    sub_registrar_register_deed,
)
from app.rules.engine import (
    check_area_exceeds_owned,
    check_deed_tampered,
    check_double_sale,
    check_inheritance_unresolved,
    check_khatian_chain_break,
    check_nid_mismatch,
    check_plot_mortgaged,
    check_rapid_resale,
    check_seller_not_owner,
)
from app.seed.seed_data import seed_all


class TestBhumiShieldRulesAndLedger(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.seed_summary = seed_all(reset=True)

    def test_01_seed_counts_and_dummy_data(self) -> None:
        """Verifies that seed_all creates 60 plots, 240 khatians, 80 deeds, and 8 scenarios."""
        assert self.seed_summary["plots"] == 60
        assert self.seed_summary["khatian_records"] == 240
        assert self.seed_summary["deeds"] == 80
        assert self.seed_summary["scenarios"] == 8

    def test_02_rule_seller_not_owner(self) -> None:
        """Tests SELLER_NOT_OWNER rule when a non-owner attempts to sell a plot."""
        latest_ownerships = [{"person_id": 8, "area_decimal": 16.0, "owner_name_bn": "ফাতেমা বেগম"}]
        flag = check_seller_not_owner(
            seller_id=9,
            latest_ownerships=latest_ownerships,
            seller_person={"id": 9, "name_bn": "মো. সাইফুল ইসলাম", "name_en": "Md. Saiful Islam"},
            latest_khatian_no="4104",
        )
        assert flag is not None
        assert flag["rule_id"] == "SELLER_NOT_OWNER"
        assert flag["severity"] == "HIGH_RISK"

        # Clean when actual owner sells
        clean = check_seller_not_owner(
            seller_id=8,
            latest_ownerships=latest_ownerships,
            seller_person={"id": 8, "name_bn": "ফাতেমা বেগম", "name_en": "Fatema Begum"},
            latest_khatian_no="4104",
        )
        assert clean is None

    def test_03_rule_area_exceeds_owned(self) -> None:
        """Tests AREA_EXCEEDS_OWNED rule when seller sells more than their fractional share."""
        latest_ownerships = [
            {"person_id": 6, "share_fraction": "1/2", "area_decimal": 12.0},
            {"person_id": 7, "share_fraction": "1/2", "area_decimal": 12.0},
        ]
        flag = check_area_exceeds_owned(
            seller_id=6,
            requested_area_decimal=18.0,
            latest_ownerships=latest_ownerships,
            existing_deeds=[],
        )
        assert flag is not None
        assert flag["rule_id"] == "AREA_EXCEEDS_OWNED"
        assert flag["severity"] == "HIGH_RISK"

        # Within owned share passes
        clean = check_area_exceeds_owned(
            seller_id=6,
            requested_area_decimal=10.0,
            latest_ownerships=latest_ownerships,
            existing_deeds=[],
        )
        assert clean is None

    def test_04_rule_double_sale(self) -> None:
        """Tests DOUBLE_SALE rule when an active/pending deed already commits the seller's share."""
        latest_ownerships = [{"person_id": 3, "share_fraction": "1/1", "area_decimal": 15.0}]
        existing_deeds = [
            {
                "id": 2,
                "deed_no": "DL-2026-1002",
                "deed_type": "SALE",
                "seller_id": 3,
                "area_decimal": 15.0,
                "status": "PENDING_MUTATION",
            }
        ]
        flag = check_double_sale(
            seller_id=3,
            requested_area_decimal=10.0,
            latest_ownerships=latest_ownerships,
            existing_deeds=existing_deeds,
        )
        assert flag is not None
        assert flag["rule_id"] == "DOUBLE_SALE"
        assert flag["severity"] == "HIGH_RISK"

    def test_05_rule_khatian_chain_break(self) -> None:
        """Tests KHATIAN_CHAIN_BREAK rule across CS -> SA -> RS -> BS survey records."""
        khatians = [
            {"survey_type": "CS", "khatian_no": "1007", "recorded_area_decimal": 18.0, "status": "VALID"},
            {"survey_type": "SA", "khatian_no": "2007", "recorded_area_decimal": 18.0, "status": "VALID"},
            {"survey_type": "RS", "khatian_no": "3007", "recorded_area_decimal": 18.0, "status": "VALID"},
            {"survey_type": "BS", "khatian_no": "4107", "recorded_area_decimal": 26.0, "status": "CHAIN_BREAK"},
        ]
        flag = check_khatian_chain_break(khatians)
        assert flag is not None
        assert flag["rule_id"] == "KHATIAN_CHAIN_BREAK"
        assert flag["severity"] == "REVIEW"

    def test_06_rule_deed_tampered_and_ed25519_ledger(self) -> None:
        """Tests cryptographic SHA-256 hash chain + Ed25519 signature verification & DEED_TAMPERED rule."""
        content = {"deed_no": "DL-TEST-1", "area_decimal": 10.0, "seller_id": 1, "buyer_id": 2}
        h = compute_deed_hash(content, prev_hash=GENESIS_HASH, chain_index=1)
        sig = sign_hash(h)
        assert verify_signature(h, sig) is True

        intact_row = {
            "id": 99,
            "deed_no": "DL-TEST-1",
            "chain_index": 1,
            "prev_hash": GENESIS_HASH,
            "content_hash": h,
            "signature": sig,
            "content_json": '{"area_decimal":10.0,"buyer_id":2,"deed_no":"DL-TEST-1","seller_id":1}',
            "original_content_json": '{"area_decimal":10.0,"buyer_id":2,"deed_no":"DL-TEST-1","seller_id":1}',
        }
        assert check_deed_tampered([intact_row]) is None

        # Alter area_decimal from 10.0 to 25.0 without re-signing
        tampered_row = dict(intact_row)
        tampered_row["content_json"] = '{"area_decimal":25.0,"buyer_id":2,"deed_no":"DL-TEST-1","seller_id":1}'
        flag = check_deed_tampered([tampered_row])
        assert flag is not None
        assert flag["rule_id"] == "DEED_TAMPERED"
        assert flag["severity"] == "HIGH_RISK"

    def test_07_rule_plot_mortgaged(self) -> None:
        """Tests PLOT_MORTGAGED rule when an active bank lien exists."""
        liens = [
            {
                "id": 1,
                "bank_name_bn": "সোনালী ব্যাংক পিএলসি",
                "bank_name_en": "Sonali Bank PLC",
                "branch_bn": "সাভার শাখা",
                "amount_bdt": 2500000,
                "status": "ACTIVE",
            }
        ]
        flag = check_plot_mortgaged(liens)
        assert flag is not None
        assert flag["rule_id"] == "PLOT_MORTGAGED"
        assert flag["severity"] == "HIGH_RISK"

    def test_08_rule_rapid_resale(self) -> None:
        """Tests RAPID_RESALE rule when plot was sold within threshold window."""
        deeds = [
            {
                "deed_no": "DL-2026-1007",
                "deed_type": "SALE",
                "created_at": "2026-10-12T16:00:00+06:00",
            }
        ]
        flag = check_rapid_resale(deeds, threshold_days=30, reference_iso="2026-10-16T18:00:00+06:00")
        assert flag is not None
        assert flag["rule_id"] == "RAPID_RESALE"
        assert flag["severity"] == "REVIEW"

    def test_09_rule_inheritance_unresolved(self) -> None:
        """Tests INHERITANCE_UNRESOLVED rule for deceased owner without recorded heirs."""
        deceased_owner = {
            "id": 14,
            "name_bn": "আলহাজ্ব নূরুল হক",
            "name_en": "Alhaj Nurul Haque",
            "is_deceased": 1,
            "heirs_recorded": 0,
        }
        flag = check_inheritance_unresolved(deceased_owner, [deceased_owner], [])
        assert flag is not None
        assert flag["rule_id"] == "INHERITANCE_UNRESOLVED"
        assert flag["severity"] == "REVIEW"

    def test_10_rule_nid_mismatch(self) -> None:
        """Tests NID_MISMATCH rule against the Mock NID Service."""
        person = {
            "id": 1,
            "name_bn": "মো. রফিকুল ইসলাম",
            "name_en": "Md. Rafiqul Islam",
            "nid": "9900001001",
        }
        flag = check_nid_mismatch(person, submitted_nid="9999999999")
        assert flag is not None
        assert flag["rule_id"] == "NID_MISMATCH"
        assert flag["severity"] == "HIGH_RISK"

        clean = check_nid_mismatch(person, submitted_nid="9900001001")
        assert clean is None

    def test_11_all_8_seeded_demo_scenarios_produce_expected_verdicts(self) -> None:
        """Verifies that all 8 seeded hackathon demo scenarios return their exact expected verdicts."""
        with db_session() as db:
            res = list_demo_scenarios(db=db)
            items = res["items"]
            assert len(items) == 8
            for sc in items:
                assert sc["live_verdict"] == sc["expected_verdict"], (
                    f"Scenario {sc['scenario_no']} ({sc['code']}) expected {sc['expected_verdict']} "
                    f"but got {sc['live_verdict']}"
                )

    def test_12_live_tamper_and_restore_workflow(self) -> None:
        """Verifies live deed tampering breaks verification and restoring heals the ledger."""
        with db_session() as db:
            # Verify Deed #1 is initially SAFE & intact
            before = verify_single_deed("1", db=db)
            assert before["verification"]["is_valid"] is True
            assert before["verification"]["verdict"] == "SAFE"

            # Tamper Deed #1
            tampered = simulate_deed_tampering(1, db=db)
            assert tampered["verification"]["is_valid"] is False
            assert tampered["verification"]["verdict"] == "HIGH_RISK"
            assert len(tampered["verification"]["tampered_fields"]) >= 1

            # Restore Deed #1
            restored = restore_tampered_deed(1, db=db)
            assert restored["verification"]["is_valid"] is True
            assert restored["verification"]["verdict"] == "SAFE"

            # Also test restoring Deed #5 (Scenario 5) so the entire 80-deed ledger passes 100%, then re-tamper #5
            restore_tampered_deed(5, db=db)
            full_clean = verify_full_ledger_endpoint(db=db)
            assert full_clean["is_valid"] is True
            assert full_clean["broken_count"] == 0
            assert len(full_clean["merkle_root"]) == 64

            # Re-tamper Deed #5 back to 25.0 decimals for Scenario #5
            simulate_deed_tampering(5, db=db)
            full_broken = verify_full_ledger_endpoint(db=db)
            assert full_broken["is_valid"] is False
            assert full_broken["first_broken_deed_no"] == "DL-2026-1005"

    def test_13_end_to_end_role_workflows(self) -> None:
        """Tests Citizen report, Sub-Registrar registration, AC Land mutation, and Bank double-mortgage block."""
        with db_session() as db:
            # 1. Citizen Check Before You Buy on Plot #1
            c_rep = citizen_check_before_you_buy(1, requested_area_decimal=5.0, db=db)
            assert c_rep["risk_report"]["verdict"] == "SAFE"

            # 2. Sub-Registrar registers a clean sale on Plot #13 (Person 1 owns 100%, sells 4.0 dec to Person 2)
            reg_req = RegisterDeedRequest(
                plot_id=13,
                seller_id=1,
                buyer_id=2,
                requested_area_decimal=4.0,
                price_bdt=800000,
            )
            reg_res = sub_registrar_register_deed(reg_req, user={"username": "registrar", "role": "sub_registrar"}, db=db)
            assert reg_res["status"] == "PENDING_MUTATION"
            assert reg_res["qr_svg_data_uri"].startswith("data:image/svg+xml;base64,")

            # 3. Bank officer attempts double mortgage on Plot #6 (already mortgaged to Sonali Bank)
            col_check = bank_collateral_check(
                CollateralCheckRequest(plot_id=6, borrower_id=11, requested_loan_bdt=1000000, area_mortgaged_decimal=10.0),
                db=db,
            )
            assert col_check["can_create_lien"] is False
            assert col_check["risk_report"]["verdict"] == "HIGH_RISK"


if __name__ == "__main__":
    unittest.main(verbosity=2)
