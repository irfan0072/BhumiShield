# BhumiShield (ভূমি সুরক্ষা) — Gap Report (v3 Production Conversion)

**Audit Date:** 2026-10-17  
**Project:** BhumiShield (ভূমি সুরক্ষা) — National Land Records Trust Layer & Fraud Prevention Engine  
**Event:** LandTech Innovation Hackathon 2026 (Daffodil International University)  
**Specification:** PRODUCTION CONVERSION PROMPT v3 (for Antigravity)

---

## 1. Executive Summary

This Gap Report defines the strict transition from the hackathon demonstration baseline to a **complete, production-grade land records trust system**. In this architecture, every verdict, risk flag, status, and document is computed at request time from database state by generic domain services. The only fake element in the entire system is the synthetic input data and simulated external interfaces.

---

## 2. KEEP (Proven Production Foundations)

The following core components meet or exceed production-level requirements and will be strictly preserved:

1. **Deterministic Fraud Rules Engine (`FraudRulesEngine.php`):**
   - 9 mathematical, deterministic rules (`SELLER_NOT_OWNER`, `AREA_EXCEEDS_OWNED`, `DOUBLE_SALE`, `KHATIAN_CHAIN_BREAK`, `DEED_TAMPERED`, `PLOT_MORTGAGED`, `RAPID_RESALE`, `INHERITANCE_UNRESOLVED`, `NID_MISMATCH`).
   - Dynamic computation from real database rows without hard-coded IDs or scenario tags.
2. **Inviolable Ownership Guard (`OwnershipGuard.php`):**
   - Strictly enforces that **only AC Land mutation approval (`ac_land`)** can modify `ownerships`.
   - Guaranteed by automated regression tests proving all other roles, controllers, and direct queries fail closed.
3. **Cryptographic Deed Ledger & Audit Engine (`LedgerService.php`):**
   - Canonical JSON serialization with recursive key sorting.
   - SHA-256 hash chaining of deed envelopes and audit entries.
   - Ed25519 digital signatures using native PHP `libsodium` (`sodium_crypto_sign_detached`).
4. **13-Step Transfer State Machine (`TransferStateMachine.php`):**
   - Fully modeled transfer lifecycle with immutable event auditing, multi-party consent, and strict role transition gates.
5. **National Flag Design System & Bangla Accessibility:**
   - Bottle Green (`#006A4E`), National Red (`#F42A41`), Amber (`#C4891A`).
   - `Hind Siliguri` typography, 18px base text size, 48px touch targets, WCAG 2.1 AA compliance, high contrast toggle.
6. **Existing Automated Test Suite:**
   - 119 passing tests covering RBAC authorization, tamper detection, security workflows, and data integrity.

---

## 3. MODIFY (Required Refactorings & Generalizations)

| Area | Current State | Target State (v3) | Rationale |
|---|---|---|---|
| **Scenario Artifacts** | `demo_scenarios` table, routes (`/scenarios`), and UI references in check, landing, and admin pages. | **Complete scenario purge:** Drop `demo_scenarios` table, remove all routes, and eliminate all `scenario` wording across `app/`, `database/`, `routes/`, and `frontend/src/`. | v3 Requirement: No outcome is pre-decided; eliminate all canned demo helpers. |
| **Tamper Simulation** | UI button on deed verifier pages directly modifies the database. | **Console-only tamper drill:** Remove UI buttons; add `php artisan bhumi:drill:tamper {deed_code} --confirm` (runs only in local/demo environment). | Production systems never expose tamper buttons in user interfaces. |
| **Provider Boundaries** | `MockNidService` and `MockBiometricProvider` live inside application services. | **Architectural abstraction:** Define clean interfaces in `app/Contracts/*` (`NidVerificationProvider`, `BiometricProvider`, `SmsProvider`, `PaymentProvider`, `LandServiceGatewayAdapter`) with simulator drivers in `app/Simulators/*`. Core app does not know simulators exist. | Real production boundaries with pluggable drivers. |
| **Data Generation** | Manual static seeder in `DatabaseSeeder.php`. | **Synthetic Data Factory:** `php artisan bhumi:seed-world --profile=pilot --seed=2026 [--fresh]` advancing time over 12 months, executing real domain services as proper role users. | Synthetic data enters the way real data enters: through maker-checker and officer actions. |
| **Biometric Verification** | Basic boolean match helper. | **Production Biometric Session:** Registered terminals, 2-minute challenge nonce, client-side liveness detection (frames never leave browser), presentation token, supervisor override, and audited result persistence. | Realistic, privacy-preserving biometric counter workflow. |
| **Role Dashboards** | Roles have accessible tabs but some rely on static layouts. | **Complete Daily Workflows (J0–J11):** Every role has a complete, working daily workflow with validation, notifications, error handling in Bangla, and automated browser tests. | A role is not done until its journey passes an automated test. |

---

## 4. ADD (New Production Modules & Gates)

1. **CI Scenario Gate (`scripts/ci-gate-no-scenarios.sh`):**
   - Automated build script that scans `backend/app/`, `backend/database/`, `backend/routes/`, and `frontend/src/` for case-insensitive `scenario`. Fails build if any match is found.
2. **Console Drill Command (`php artisan bhumi:drill:tamper`):**
   - CLI-only integrity drill tool for evaluators and security drills that mutates a deed record directly in the DB to test SHA-256 / Ed25519 tamper detection organically.
3. **Provider Contracts & Simulators (`app/Contracts/*` & `app/Simulators/*`):**
   - `NidVerificationProvider` (synthetic registry lookup, realistic latency, timeouts)
   - `BiometricProvider` (presentation token verification against synthetic enrolment)
   - `SmsProvider` (outbox viewer for OTPs at `/admin/dev/outbox`)
   - `PaymentProvider` (simulated MFS payment with receipt and fee ledger callback)
   - `LandServiceGatewayAdapter` (e-porcha and LD tax synthetic gateway)
4. **Biometric Terminal Session Manager:**
   - Terminal registration table, challenge nonce generator, presentation token verifier, supervisor dual-key override.
5. **Synthetic World Seeder (`php artisan bhumi:seed-world`):**
   - Pilot profile generating 2 districts, 5 upazilas, 30 mouzas, 4,000 plots, 6,000 persons, 5,000 deeds, 800 mutations, 200 liens, 120 tickets.
6. **Playwright E2E Test Suite for Journeys J0–J11:**
   - Dedicated browser tests covering complete daily workflows for all user personas.
7. **Production Documentation Suite:**
   - `docs/ARCHITECTURE.md` (Mermaid diagrams)
   - `docs/INTEGRATION.md` (replacing simulators with real production APIs)
   - `docs/SECURITY.md` & `docs/RULES.md`
   - `docs/DEMO_RUNBOOK.md` (timed 3-minute evaluator script without UI helpers)
