# BhumiShield (ভূমি সুরক্ষা) — Test Infrastructure & Architecture

This document describes the end-to-end (E2E) automated test infrastructure for **BhumiShield (ভূমি সুরক্ষা)**, a sovereign land fraud prevention platform designed for Bangladesh's Ministry of Land and Land Administration.

---

## 1. Test Architecture Overview

The BhumiShield E2E test harness (`tests/e2e/E2ETestHelper.php`) operates as an **opaque-box in-process HTTP dispatcher**. It drives requests directly through the application's actual routing stack, JWT authentication middleware, role-based access controllers, database transaction handlers, and cryptographic verification services.

```
                           +----------------------------------------+
                           |       E2E Test Runner (CLI / Node)     |
                           |       (tests/e2e/run_all.php)          |
                           +-------------------+--------------------+
                                               |
             +---------------------------------+---------------------------------+
             |                                 |                                 |
             v                                 v                                 v
+------------------------+        +------------------------+        +------------------------+
| Tier 1: Feature Match  |        | Tier 2: Boundary/Guard |        | Tier 3: Cross-Feature  |
| 21 Role Portals + Web  |        | Role M3, 401/403/422   |        | Map, Liens, Appeals    |
+------------------------+        +------------------------+        +------------------------+
                                               |
                                               v
                                  +------------------------+
                                  | Tier 4: Real-World E2E |
                                  | Citizen->Registrar->   |
                                  | AC Land->Bank->Auditor |
                                  +------------------------+
                                               |
                                               v
                        +-----------------------------------------------+
                        |       In-Process Router & Middleware Engine   |
                        |              backend/routes/api.php           |
                        +----------------------+------------------------+
                                               |
                  +----------------------------+----------------------------+
                  |                                                         |
                  v                                                         v
   +------------------------------+                          +------------------------------+
   |   Cryptographic Services     |                          |   SQLite / PostgreSQL DB     |
   |   - Ed25519 Signatures       |                          |   - Rule M3 Ownership Guard  |
   |   - SHA-256 Hash Chains      |                          |   - Maker-Checker Segregation|
   |   - Merkle Tree Proofs       |                          |   - Deterministic Fraud Engine
   +------------------------------+                          +------------------------------+
```

### Key Architectural Advantages
1. **Zero-Mock Opaque-Box Execution**: Tests never mock controllers or database tables. All requests run through authentic business logic, database migrations, cryptographic signing (libsodium Ed25519), and fraud detection rules.
2. **Deterministic & Isolated**: Each test maintains self-contained state. Operations modifying state cleanly clean up their artifacts or operate via idempotent transactions.
3. **Sandbox Resilience**: Eliminates local TCP network socket collisions (`EPERM` / port conflicts) by utilizing direct in-process router invocation while preserving full HTTP request/response semantics.

---

## 2. Four-Tier Test Matrix

The test suite is structured into four progressive tiers:

| Tier | File | Test Count | Focus Area | Status |
|------|------|:----------:|------------|:------:|
| **Tier 1** | `tests/e2e/tier1_feature_coverage.test.php` | 23 | Happy-path isolation across all 21 role portals & public portals | **23/23 PASS** |
| **Tier 2** | `tests/e2e/tier2_boundary_corner.test.php` | 10 | Security boundaries, 401/403/422 guards, Rule M3 ownership lock | **10/10 PASS** |
| **Tier 3** | `tests/e2e/tier3_cross_feature.test.php` | 6 | Pairwise cross-feature interactions (GIS maker-checker, liens, appeals) | **6/6 PASS** |
| **Tier 4** | `tests/e2e/tier4_real_world_scenarios.test.php` | 4 | Complete multi-role end-to-end operational lifecycles | **4/4 PASS** |
| **Total** | `tests/e2e/run_all.php` | **43** | Full-Platform Automated Verification | **43/43 PASS (100%)** |

---

## 3. Tier Breakdown & Coverage Details

### Tier 1: Feature Coverage (Happy-Path Isolation across all 21 Portals)
- **Role 01 (Citizen)**: Citizen property vault, owned plots, biometric status, and deed records (`/api/v1/citizen/my-properties`).
- **Role 02 (Service Point Operator)**: Biometric citizen intake, NID verification, and assisted deed queue (`/api/v1/spo/cases`).
- **Role 03 (Sub-Registrar)**: Statutory fee calculation, pre-check due diligence, deed registration queue (`/api/v1/registrar/deeds`).
- **Role 04 (Registry Data Officer)**: Legacy volume ingestion, Bangla OCR text indexing, volume indexing (`/api/v1/registry/legacy-ingest`).
- **Role 05 (AC Land)**: Mutation application docket, hearing schedule, flagged khatian review (`/api/v1/acland/flagged-khatians`).
- **Role 06 (Land Office Assistant)**: Initial document scrutiny, checklist validation, field inquiry dispatch (`/api/v1/land-office/scrutiny-cases`).
- **Role 07 (Field Verification Officer)**: On-site physical boundary inspection, geo-tagged photo uploads, tax status verification (`/api/v1/field-verification/reports`).
- **Role 08 (Settlement Records Officer)**: Cadastral Mouza map spatial editor, survey revision draft (`/api/v1/settlement/map-revisions`).
- **Role 09 (Settlement Checker)**: Cadastral onboarding staging review, maker-checker separation (`/api/v1/settlement/checker/queue`).
- **Role 10 (UNO Supervisor)**: Upazila SLA dashboard, delayed case escalate, dispatch control (`/api/v1/uno/dashboard-stats`).
- **Role 11 (Appellate Reviewer / ADC Revenue)**: Land mutation appeals docket, hearing notes, stay order decisions (`/api/v1/appeals`).
- **Role 12 (Bank Officer)**: Mortgage collateral check, active lien registry (`/api/v1/mortgages`).
- **Role 13 (Bank Manager)**: Loan clearance verification, mortgage lien release, cryptographic NOC issuance (`/api/v1/mortgages/{id}/noc`).
- **Role 14 (Support Agent)**: Helpline tickets, citizen inquiry resolution, grievance tracking (`/api/v1/support/tickets`).
- **Role 15 (Platform Moderator)**: Public land marketplace listing review, illegal sale rejection (`/api/v1/listings/moderation-queue`).
- **Role 16 (Content Editor)**: Citizen land guidance blog drafting, legal notice draft (`/api/v1/content/guidance/drafts`).
- **Role 17 (Content Approver)**: Public guidance publishing workflow, gazette notice approval (`/api/v1/content/guidance/approvals`).
- **Role 18 (Super Admin)**: System users registry, role management, sovereign DB backup snapshot (`/api/v1/admin/users`).
- **Role 19 (National Cryptographic Auditor)**: End-to-end ledger hash chain verification, tampering detection drill (`/api/v1/ledger/verify-chain`).
- **Role 20 (DC Land Acquisition Officer)**: Section 4 public infrastructure acquisition notice, compensation awards (`/api/v1/acquisition/cases`).
- **Role 21 (Civil Court Advocate)**: Bar Council license verification, court injunction case filing (`/api/v1/lawyers/verify`).
- **Public Portals**: "Check Before You Buy" due diligence, QR Deed validation, QR NOC validation, Mouza map vector parcels, Service catalogue, Fee calculator, Public notices, Land guidance blog, Office directory, Administrative hierarchy.

### Tier 2: Boundary & Corner Cases (Security Invariants)
- **401 `AUTH_REQUIRED`**: Unauthenticated requests fail closed across all protected endpoints.
- **403 `FORBIDDEN_ROLE`**: Strict role-based isolation prevents privilege escalation (e.g., Citizen cannot register deeds; Sub-Registrar cannot approve bank liens).
- **Rule M3 Ownership Inviolability**: `ADMIN_CANNOT_EDIT_LAND_DATA` ensures system administrators cannot directly modify land ownerships or bypass the AC Land `ApproveMutation` legal workflow. Database triggers reject direct `DELETE FROM ownerships`.
- **403 `ACCOUNT_SUSPENDED`**: Inactive or suspended accounts fail closed upon login or token presentation.
- **Maker-Checker Segregation**: Enforces four-eyes principle (author cannot approve their own parcel design or onboarding batch).
- **422 Validation Bounds**: Negative or zero areas, malformed NIDs, and invalid prices fail with precise validation errors.
- **Geometry Invariants**: Self-intersecting polygons and multi-polygons are rejected with `SELF_INTERSECTION` and `SINGLE_POLYGON_REQUIRED`.
- **Cryptographic Tamper Detection**: Tampering with a single byte in `content_json` triggers immediate hash mismatch, Ed25519 signature failure, and chain link break.
- **Honest 404 Responses**: Missing plots, deeds, lawyers, and notices return clean 404s without uncaught exceptions.

### Tier 3: Cross-Feature Combinations (Pairwise Interlocking)
- **Plot Lock + Marketplace**: Locking a plot via the Citizen portal immediately blocks public marketplace listing with `422 PLOT_LOCKED`.
- **Active Lien + NOC Blocking**: Active mortgage lien strictly blocks NOC issuance with `422 ACTIVE_LIEN_CANNOT_ISSUE_NOC` until the lien is released by the bank manager.
- **Injunction Freeze + Transfer Block**: An upheld court dispute immediately freezes plot transfer (`PLOT_TRANSFER_FROZEN`) and blocks deed registration.
- **Cadastral Mouza Map + Parcel Allocation**: Survey polygon drawing, maker-checker submission, publication, multi-owner allocation (12+8=20 decimal), and AC Land opening record approval with reduced simple fractions (`3/5`, `2/5`).
- **Stay Order + Sale Lock**: Appellate stay order granted by UNO/ADC immediately sets `owner_sale_locked=1` in the database.
- **Dynamic Rapid Resale Threshold**: Changing `rapid_resale_days` in site settings dynamically reconfigures the deterministic fraud engine without server restarts.

### Tier 4: Real-World Scenarios (End-to-End Multi-Role Workflows)
- **Scenario A (Complete Property Transfer & Mutation Lifecycle)**:
  1. Citizen buyer queries public "Check Before You Buy" on Plot 13 (clean risk report).
  2. Sub-Registrar calculates statutory fees (`/api/v1/registrar/calculate-fees`).
  3. Sub-Registrar executes pre-check verification.
  4. Sub-Registrar registers deed in cryptographic ledger; auto-queues e-Mutation.
  5. AC Land lists pending mutations and approves case `MUT-LT-2026-xxx`.
  6. Citizen Property Vault (`/api/v1/citizen/my-properties`) reflects updated holding and deed record.
  7. Deed QR public verification confirms valid Ed25519 signature.
- **Scenario B (Bank Mortgage Lien Collateral Lifecycle)**:
  1. Bank Officer checks collateral eligibility on Plot 40 (`can_create_lien` = true).
  2. Bank Officer registers active mortgage lien with Sonali Bank PLC.
  3. Public "Check Before You Buy" immediately flags `PLOT_MORTGAGED`.
  4. Bank Manager releases mortgage lien upon loan repayment.
  5. Bank Manager issues cryptographically signed NOC.
  6. Public QR verification confirms NOC validity and released status.
- **Scenario C (Civil Court Legal Dispute & Injunction Lifecycle)**:
  1. Lawyer Bar Council license verification (`BC-DH-14285`).
  2. Lawyer files civil court suit on Plot 14.
  3. AC Land reviews and upholds court injunction (`UPHELD_FROZEN`).
  4. Sub-Registrar deed registration attempt fails with 422 `PLOT_TRANSFER_FROZEN`.
  5. Court disposes suit -> AC Land resolves dispute (`RESOLVED`).
  6. Plot transfer restrictions lifted and title returned to clean state.
- **Scenario D (Super Admin Sovereign Control & Emergency Operations)**:
  1. Super Admin runs live cryptographic ledger health check.
  2. Super Admin audits structured system audit log.
  3. Super Admin creates sovereign database snapshot backup with SHA-256 checksum.
  4. Super Admin activates emergency broadcast banner (visible on public endpoints).
  5. Super Admin deactivates broadcast banner.

---

## 4. How to Run the Tests

### Primary Test Runner (PHP Native)
```bash
php tests/e2e/run_all.php
```
*Expected Output*: Returns `exit(0)` on 100% pass, prints formatted summary table, and writes `tests/e2e/results.json`.

### Node Wrapper
```bash
node tests/e2e/run_all.js
```
*Expected Output*: Executes test suite or inspects `results.json`, returns exit code 0.

### Running Individual Tiers
```bash
# Tier 1 only (Feature Coverage)
php -r "require 'tests/e2e/tier1_feature_coverage.test.php'; echo json_encode(Tests\E2E\Tier1FeatureCoverageTest::runAll(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;"

# Tier 2 only (Boundary & Security)
php -r "require 'tests/e2e/tier2_boundary_corner.test.php'; echo json_encode(Tests\E2E\Tier2BoundaryCornerTest::runAll(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;"

# Tier 3 only (Cross-Feature Combinations)
php -r "require 'tests/e2e/tier3_cross_feature.test.php'; echo json_encode(Tests\E2E\Tier3CrossFeatureTest::runAll(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;"

# Tier 4 only (Real-World Scenarios)
php -r "require 'tests/e2e/tier4_real_world_scenarios.test.php'; echo json_encode(Tests\E2E\Tier4RealWorldScenariosTest::runAll(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;"
```

---

## 5. Security & Invariant Checklist

| Invariant | Description | Verification Method |
|-----------|-------------|---------------------|
| **Rule M3** | System administrators cannot edit land data or approve mutations directly | Verified in `Tier 2 Test 03` & `Tier 3 Test 04` |
| **Maker-Checker** | Creators cannot approve their own submissions | Verified in `Tier 2 Test 05` & `Tier 3 Test 04` |
| **Tamper Detection** | Any post-registration change invalidates the hash chain and digital signature | Verified in `Tier 2 Test 08` & `Tier 4 Test 04` |
| **Office Scoping** | Officers cannot operate on plots outside their administrative jurisdiction | Verified in `Tier 4 Test 01` & `E2ETestHelper` |
| **Idempotent Mutations** | Completed mutations cannot be re-approved or duplicated | Verified in `Tier 4 Test 01` & `RoleAuditRegressionTest` |
| **Mortgage Lock** | Active mortgage liens prevent transfer without formal bank release letter | Verified in `Tier 3 Test 02` & `Tier 4 Test 02` |
| **Dispute Injunction** | Court injunctions uphold freeze across registration and collateral pipelines | Verified in `Tier 3 Test 03` & `Tier 4 Test 03` |
