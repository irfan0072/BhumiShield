# BhumiShield (ভূমি সুরক্ষা) — Current State Audit (v3 Production Baseline)

**Audit Date:** 2026-10-17  
**Project:** BhumiShield (ভূমি সুরক্ষা) — National Land Records Trust Layer & Fraud Prevention Engine  
**Event:** LandTech Innovation Hackathon 2026 (Daffodil International University)  
**Track:** Digital Land Records, Verification & Digitization  
**Specification:** PRODUCTION CONVERSION PROMPT v3 (for Antigravity)

---

## 1. System Stack & Architecture

### 1.1 Backend
- **Framework & Runtime:** Laravel 11.0.x / Custom PSR-4 Microframework on PHP 8.4 (macOS / Linux) with `declare(strict_types=1)`
- **Core Extensions:** `ext-pdo`, `ext-json`, `ext-sodium` (libsodium for Ed25519 digital signatures)
- **Database Abstraction:** Custom PDO wrapper `App\Support\DB` supporting:
  - SQLite 3 (WAL mode, foreign keys enabled) at `backend/database/bhumishield.sqlite`
  - PostgreSQL 16+ / PostGIS (`pdo_pgsql`) with automatic connection pooling and fallback
- **Authentication & RBAC:**
  - HMAC-SHA256 JWT service (`App\Services\JwtAuthService`) with token versioning (`ver`), bcrypt/argon password hashing, and immediate revocation on password change
  - Granular RBAC (`App\Http\Middleware\RoleMiddleware`, `App\Services\RbacService`) covering 18+ roles
- **Cryptographic Services:**
  - SHA-256 hash chaining (`App\Services\LedgerService`) for deed blocks and immutable audit trail
  - Ed25519 digital signatures via libsodium (`sodium_crypto_sign_detached`)
  - Canonical JSON serialization with recursive key sorting
- **Domain Services:**
  - `OwnershipGuard`: Strictly enforces that **only `ApproveMutation` (role `ac_land`)** can mutate `ownerships`; all other roles and direct writes fail closed
  - `FraudRulesEngine`: 9 automated, deterministic fraud detection rules computing verdicts dynamically at request time
  - `TransferStateMachine`: 13-step transaction state machine (`transfer_requests`, `transfer_events`, `transfer_parties`, `transfer_consents`)
  - `BankScopeService`: Institutional data scoping for financial institutions (mortgage registration, lien release, NOC certificates)
  - `PublicRecordService`: PII redaction and privacy masking (NID last 4 only, phone hidden from third parties)
  - `PdfSealService`: Cryptographically sealed PDF document generator with Ed25519 signatures and SHA-256 verification envelopes

### 1.2 Frontend
- **Framework:** React 19.3.1 (`react`, `react-dom`)
- **Build Tool:** Vite 6.4.4
- **Language:** TypeScript 5.7.3 (`npx tsc --noEmit` clean with 0 errors)
- **Styling:** Tailwind CSS 4.3.3 (`@tailwindcss/vite: 4.3.3`)
- **Icons:** Lucide React 0.475.0
- **HTTP Client:** Axios with automatic Bearer token injection and error interception
- **Branding & Accessibility:**
  - Bangladesh National Flag Palette: Bottle Green (`#006A4E`), National Red (`#F42A41`), Amber (`#C4891A`)
  - Typography: `Hind Siliguri` primary Bengali typography with 18px base text size and 48px touch targets
  - High-contrast mode toggle (`bs_hc`), font size zoom steps (`bs_font`), WCAG 2.1 AA compliant
- **Routing & Navigation:**
  - Bilingual URL prefixes (`/bn/*`, `/en/*`) with public alphanumeric codes and slugs
  - Role-protected workspaces guarded by `<AuthGuard>`

---

## 2. Current Routes & Endpoints

| Method | Path | Controller / Service | Access / Role Guard |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | `RoleControlController::login` | Public |
| `POST` | `/api/v1/auth/register` | `RoleControlController::register` | Public (Citizen self-registration) |
| `GET` | `/api/v1/auth/me` | `RoleControlController::me` | Authenticated (JWT) |
| `POST` | `/api/v1/auth/change-password` | `RoleControlController::changePassword` | Authenticated (Token version increment) |
| `POST` | `/api/v1/check-before-buy` | `WorkflowController::checkBeforeBuy` | Public / Rate-limited |
| `GET` | `/api/v1/verify/deed/{idOrDeedNo}` | `LedgerVerificationController::verifyDeed` | Public (PII redacted) |
| `GET` | `/api/v1/verify/noc/{nocNo}` | `RoleControlController::verifyNoc` | Public |
| `GET` | `/api/v1/plots` | `RoleControlController::listPlots` | Public / Filtered |
| `GET` | `/api/v1/plots/{plotId}` | `WorkflowController::getPlotDetail` | Authenticated / Scoped |
| `POST` | `/api/v1/citizen/plots/{plotId}/toggle-lock` | `RoleControlController::togglePlotSaleLock` | Citizen owner / Admin |
| `POST` | `/api/v1/disputes` | `RoleControlController::fileDispute` | Citizen / Operator |
| `GET` | `/api/v1/transfers` | `WorkflowController::listTransfers` | Citizen / Officer |
| `POST` | `/api/v1/transfers` | `WorkflowController::createTransfer` | Citizen / Operator |
| `POST` | `/api/v1/transfers/{id}/advance` | `WorkflowController::advanceTransfer` | State Machine / Role Guard |
| `POST` | `/api/v1/transfers/{id}/biometric-verify` | `WorkflowController::verifyCounterBiometrics` | Sub-Registrar / SPO |
| `POST` | `/api/v1/registrar/deeds` | `WorkflowController::registerDeed` | Sub-Registrar |
| `GET` | `/api/v1/acland/mutations` | `WorkflowController::listMutations` | AC Land / Assistant |
| `POST` | `/api/v1/acland/mutations/{id}/decide` | `WorkflowController::decideMutation` | **Strictly `ac_land` only** |
| `GET` | `/api/v1/bank/mortgages` | `RoleControlController::listMortgages` | Bank Officer / Manager |
| `POST` | `/api/v1/bank/mortgages` | `RoleControlController::createMortgage` | Bank Officer |
| `POST` | `/api/v1/bank/mortgages/{id}/release` | `RoleControlController::releaseMortgage` | Bank Manager / Officer |
| `GET` | `/api/v1/admin/audit-logs` | `SystemAdminController::listAuditLogs` | Admin / Auditor |
| `GET` | `/api/v1/admin/ledger/verify-all` | `LedgerVerificationController::verifyAll` | Admin / Auditor |
| `GET` | `/api/v1/admin/users` | `SystemAdminController::listUsers` | Admin |
| `GET` | `/api/v1/notices` | `PublicMarketplaceAndPortalController::listNotices` | Public |
| `GET` | `/api/v1/notices/{slug}/pdf` | `PublicMarketplaceAndPortalController::downloadNoticePdf` | Public |
| `GET` | `/api/v1/blog` | `PublicMarketplaceAndPortalController::listBlogPosts` | Public |
| `GET` | `/api/v1/offices` | `PublicMarketplaceAndPortalController::listOffices` | Public |
| `POST` | `/api/v1/offices/{id}/appointments` | `PublicMarketplaceAndPortalController::bookAppointment` | Citizen / Public |
| `GET` | `/api/v1/listings` | `PublicMarketplaceAndPortalController::listMarketplace` | Public |
| `POST` | `/api/v1/listings` | `PublicMarketplaceAndPortalController::createListing` | Citizen Owner |
| `GET` | `/api/v1/citizen/vault` | `CitizenVaultAndTicketController::getVault` | Citizen (Verified NID) |
| `POST` | `/api/v1/citizen/vault/upload` | `CitizenVaultAndTicketController::uploadDocument` | Citizen |
| `GET` | `/api/v1/tickets` | `CitizenVaultAndTicketController::listTickets` | Citizen / Support Agent |
| `POST` | `/api/v1/tickets` | `CitizenVaultAndTicketController::createTicket` | Citizen / Operator |
| `POST` | `/api/v1/onboarding/batches` | `OnboardingAndAppealsController::createBatch` | Settlement Officer |
| `POST` | `/api/v1/onboarding/batches/{id}/approve` | `OnboardingAndAppealsController::approveBatch` | Settlement Checker |
| `GET` | `/api/v1/field-reports` | `FieldOperationsController::listReports` | Field Officer / AC Land |
| `POST` | `/api/v1/field-reports` | `FieldOperationsController::createReport` | Field Verification Officer |

---

## 3. Database Schema Tables

1. `users` (id, username, email, full_name_bn, full_name_en, role, office_id, office_bn, nid, phone, token_version, is_active, password)
2. `persons` (id, nid, full_name_bn, full_name_en, father_name_bn, phone, dob, address_bn)
3. `plots` (id, plot_code, dag_no, mouza_bn, upazila_bn, district_bn, land_class_bn, total_area_decimal, is_sale_locked, sale_lock_reason, lock_active)
4. `ownerships` (id, plot_id, person_id, khatian_no, share_fraction, acquired_date, acquired_by, is_active)
5. `deeds` (id, deed_code, deed_no, deed_date, registry_office_bn, plot_id, seller_id, buyer_id, deed_type, deed_value_bdt, transferred_area_decimal, is_tampered)
6. `khatians` (id, plot_id, khatian_type, khatian_no, total_recorded_area_decimal, notes)
7. `khatian_shares` (id, khatian_id, person_id, share_fraction, area_decimal)
8. `mortgages` (id, plot_id, bank_id, bank_name_bn, branch_name_bn, mortgage_deed_no, mortgaged_area_decimal, loan_amount_bdt, status, registered_at, released_at)
9. `disputes` (id, plot_id, case_no, court_or_tribunal_bn, claimant_name_bn, dispute_type, status, filed_at, stay_order_granted)
10. `ledger_entries` (id, entry_type, entity_id, block_index, prev_block_hash, block_hash, payload_canonical_json, ed25519_signature, created_at)
11. `audit_logs` (id, actor_id, actor_role, action, target_type, target_id, ip_address, created_at, metadata)
12. `service_catalogues` & `service_fees_registry` (official service definitions, statutory circular fee rates)
13. `site_settings` (dynamic system settings, rapid resale threshold, maintenance gates)
14. `offices` & `office_user` (divisions, districts, upazilas, registry/AC Land offices, service points)
15. `appointments` (citizen appointment booking at land offices)
16. `transfer_requests`, `transfer_parties`, `transfer_consents`, `transfer_events` (13-step transaction state machine)
17. `biometric_verifications` (counter biometric transaction records)
18. `plot_documents` & `document_templates` (L0-L3 citizen property document vault)
19. `tickets` & `ticket_messages` (support, recordroom, dispute resolution tickets)
20. `listings` & `listing_enquiries` (citizen land marketplace)
21. `notices` & `blog_posts` (official circulars with signed PDF attachments, educational posts)
22. `onboarding_batches` & `onboarding_batch_items` (maker-checker settlement record onboarding)
23. `appeals` (UNO and appellate review cases)
24. `field_reports` & `sla_dispatches` (FVO field inspections, UNO SLA monitoring)

---

## 4. Current Test Suite Status

The automated test suite contains **119 passing tests (0 failures)** across 11 test suites:
- `RulesAndLedgerTest` (20 tests)
- `RoleAuditRegressionTest` (29 tests)
- `SecurityWorkflowRegressionTest` (15 tests)
- `FieldOperationsAndSlaTest` (10 tests)
- `SignedNoticePdfTest` (9 tests)
- `RoleRoutingAndSubtabTest` (8 tests)
- `AppointmentBookingTest` (7 tests)
- `TierBPortalAndMarketplaceTest` (6 tests)
- `TierCOnboardingAndAppealsTest` (6 tests)
- `UiEnvelopeAdapterTest` (5 tests)
- `CheckBeforeBuyRouteTest` (4 tests)

---

## 5. What Works vs. What Needs v3 Conversion

| Area | Current Status | v3 Target Requirement |
|---|---|---|
| **Fraud & Risk Detection** | Real deterministic rules engine (`FraudRulesEngine.php`) computes verdicts dynamically. | **Keep & generalize:** Purge legacy `demo_scenarios` table and pre-filled scenario buttons; all verdicts must come purely from real DB rows. |
| **Ownership Guard** | Strict `OwnershipGuard` rejects any non-`ac_land` write to `ownerships`. | **Keep:** Maintain DB/service-level inviolability. |
| **Tamper Simulation** | UI button in `OfficerDeedVerifier` & `VerifyDeedQrPage` directly invokes DB tampering. | **Purge UI button:** Move tamper testing to a console-only drill command (`php artisan bhumi:drill:tamper {code} --confirm`). |
| **External Providers** | Ad-hoc `MockNidService` and `MockBiometricProvider` classes in `app/Services/`. | **Architectural separation:** Move to `app/Contracts/*` interfaces and `app/Simulators/*` drivers in separate `sim` schema. |
| **Biometric Verification** | Simple mock matching method. | **Production protocol:** Registered terminals, 2-minute challenge nonce, browser presentation token, supervisor override, audited results. |
| **Data Seeding** | Mixed static seed script (`DatabaseSeeder.php`). | **Synthetic Data Factory:** Deterministic `php artisan bhumi:seed-world --profile=pilot` creating records through application domain services. |
| **Role Journeys** | 18 roles can log in and view workspaces. | **Complete Journeys (J0–J11):** End-to-end daily workflows with automated browser regression tests for every role. |
| **Scenarios in Codebase** | Legacy `demo_scenarios` table, routes, and UI references exist. | **Step 0 Purge:** Eliminate all occurrences of `scenario` in `app/`, `database/`, `routes/`, and `frontend/src/`. |
