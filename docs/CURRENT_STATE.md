# BhumiShield (ভূমি সুরক্ষা) — Current State Audit

**Audit Date:** 2026-10-17  
**Project:** BhumiShield (ভূমি সুরক্ষা) — National Land Trust Layer & Fraud Prevention Engine  
**Event:** LandTech Innovation Hackathon 2026 (Daffodil International University)  
**Track:** Digital Land Records, Verification & Digitization  
**Specification Reference:** Upgrade Prompt v2 (Antigravity)

---

## 1. Stack and Exact Versions

### 1.1 Backend
- **Framework:** Laravel 11.0.x (`laravel/framework: ^11.0`)
- **PHP Version:** PHP 8.4.3 (CLI & Built-in Server) with `declare(strict_types=1)`
- **Core Extensions:** `ext-pdo`, `ext-json`, `ext-sodium` (libsodium for Ed25519 digital signatures)
- **Database Abstraction:** Custom PDO wrapper `App\Support\DB` supporting:
  - SQLite 3 (WAL mode, foreign keys enabled) at `backend/database/bhumishield.sqlite` (development/demo)
  - PostgreSQL 16+ / PostGIS (`pdo_pgsql`) with automatic connection pooling and fallback
- **Authentication:** Custom HMAC-SHA256 JWT service (`App\Services\JwtAuthService`) with bcrypt password hashing, token versioning, and single-session revocation
- **Cryptographic Services:** 
  - SHA-256 hash chaining (`LedgerService`) for deeds and immutable audit logs
  - Ed25519 digital signatures via libsodium (`sodium_crypto_sign_detached`)
- **API Architecture:** RESTful JSON API (`/api/v1/*` and `/api/*`) with `RoleMiddleware` role and scope enforcement

### 1.2 Frontend
- **Framework:** React 19.3.1 (`react`, `react-dom`)
- **Build Tool:** Vite 6.4.4
- **Language:** TypeScript 5.7.3 (`@types/react: ^19.3.0`, `@types/react-dom: ^19.3.0`)
- **Styling:** Tailwind CSS 4.3.3 (`@tailwindcss/vite: 4.3.3`)
- **Icons:** Lucide React 0.475.0
- **HTTP Client:** Axios 1.20.0 with automatic Bearer token injection
- **Design Tokens:** Bangladesh National Flag Palette (`#006A4E` deep green, `#F42A41` red, `#C4891A` amber) and `Hind Siliguri` Bangla typography
- **Automated Verification:** Puppeteer Core 24.43.1

---

## 2. Directory Layout & Folder Structure

```
.
├── backend/
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/V1/
│   │   │   │   ├── LedgerVerificationController.php  # Deed & ledger cryptographic verification
│   │   │   │   ├── RoleControlController.php        # Role switching, locks, disputes, fees
│   │   │   │   ├── ServiceCatalogueController.php   # Service catalogue & statutory fees
│   │   │   │   ├── SystemAdminController.php        # RBAC, user admin, settings, analytics
│   │   │   │   └── WorkflowController.php           # Core verification, pre-check, mutation
│   │   │   └── Middleware/
│   │   │       └── RoleMiddleware.php               # JWT auth & RBAC permissions guard
│   │   ├── Models/
│   │   │   └── DomainModels.php                     # Static Eloquent-style domain entities
│   │   ├── Services/
│   │   │   ├── BankScopeService.php                 # Bank institutional scoping
│   │   │   ├── FraudRulesEngine.php                 # 9 automated fraud detection rules
│   │   │   ├── JwtAuthService.php                   # Token generation, decoding & revocation
│   │   │   ├── LedgerService.php                    # SHA-256 hash chain & Ed25519 signing
│   │   │   ├── MockNidService.php                   # Synthetic NID validator
│   │   │   ├── PublicRecordService.php              # PII privacy masking & redaction
│   │   │   ├── QrCodeService.php                    # QR payload generator
│   │   │   └── ReadinessService.php                 # Health & deployment inspection
│   │   └── Support/
│   │       └── DB.php                               # PDO SQLite / PostgreSQL bridge
│   ├── database/
│   │   ├── bhumishield.sqlite                       # Active demo database
│   │   ├── migrations/
│   │   │   └── 2026_10_16_000001_create_bhumishield_tables.php # 14 DDL schema definitions
│   │   └── seeders/
│   │       └── DatabaseSeeder.php                   # 60 plots, 80 deeds, 8 demo scenarios
│   ├── routes/
│   │   └── api.php                                  # API route dispatcher & permission gates
│   ├── tests/
│   │   └── Feature/
│   │       ├── RulesAndLedgerTest.php               # 18 unit/feature tests
│   │       └── RoleAuditRegressionTest.php          # 29 regression tests
│   ├── artisan                                      # CLI runner (migrate, seed, test, serve)
│   ├── composer.json                                # PHP dependencies
│   └── Dockerfile                                   # Production containerization
├── frontend/
│   ├── public/
│   │   └── assets/                                  # Emblems, SVG seals, hero graphics
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts                            # Axios API client & type definitions
│   │   ├── components/
│   │   │   ├── AuthGuard.tsx                        # Role-based workspace protection
│   │   │   ├── ErrorBoundary.tsx                    # React runtime error boundary
│   │   │   ├── KhatianChainTimeline.tsx             # CS -> SA -> RS -> BS visualizer
│   │   │   ├── NavbarAndLayout.tsx                  # Header, footer, language & theme toggles
│   │   │   ├── OfficerDeedVerifier.tsx              # In-panel Ed25519 & ledger verifier
│   │   │   ├── OfficerKhatianExplorer.tsx           # In-panel historical khatian lineage
│   │   │   ├── ResultHeroBanner.tsx                 # Risk traffic-light verdict banner
│   │   │   └── VelzonOverviewSection.tsx            # KPI statistics panel
│   │   ├── i18n/
│   │   │   └── index.tsx                            # Bangla & English translations
│   │   ├── pages/
│   │   │   ├── AcLandPage.tsx                       # AC Land e-mutation & dispute console
│   │   │   ├── AdminDashboardPage.tsx               # National system administration console
│   │   │   ├── AuthPage.tsx                         # Login, registration, profile
│   │   │   ├── BankOfficerPage.tsx                  # Bank collateral & mortgage NOC console
│   │   │   ├── CheckBeforeBuyPage.tsx               # "জমি যাচাই" pre-purchase fraud check
│   │   │   ├── CitizenHome.tsx                      # Citizen personal property vault
│   │   │   ├── HelpPage.tsx                         # Citizen FAQ, help, service directory
│   │   │   ├── LandingPage.tsx                      # Public landing page
│   │   │   ├── SubRegistrarPage.tsx                 # Sub-Registrar deed registration console
│   │   │   └── VerifyDeedQrPage.tsx                 # QR deed verification tool
│   │   ├── theme/
│   │   │   └── tokens.ts                            # Color, spacing, and typography tokens
│   │   ├── App.tsx                                  # Root application & routing
│   │   ├── index.css                                # Tailwind directives & font imports
│   │   └── main.tsx                                 # React application entrypoint
│   ├── package.json                                 # Frontend dependencies
│   ├── tsconfig.json                                # TypeScript configuration
│   └── vite.config.ts                               # Vite build configuration
├── docs/                                            # Research, architecture & audit docs
└── tests/
    └── browser_verification.cjs                     # Puppeteer end-to-end browser test
```

---

## 3. Database Tables (14 Active Tables)

| # | Table Name | Records (Seeded) | Purpose & Constraints |
|---|---|---|---|
| 1 | `users` | 7 demo accounts | User credentials, roles, offices, dummy NID, dummy phone, token version, identity verification status. |
| 2 | `site_settings` | 9 configurations | Global system parameters (portal titles, helpline, rapid resale days, NID enforcement, auto e-mutation, public QR setting). |
| 3 | `locations` | 3 mouzas | Mouza, JL number, upazila, district, division hierarchy (Birulia/Savar, Bason/Gazipur, Panam/Sonargaon). |
| 4 | `persons` | 42 persons | Synthetic citizens with Bangla/English names, parentage, NID, dummy phone, deceased flag, heir succession flag. |
| 5 | `plots` | 60 plots | Dag numbers, land classifications, total decimal areas, citizen sale lock status (`owner_sale_locked`, `locked_by_nid`). |
| 6 | `khatian_records` | 240 records | 4 survey eras per plot (CS 1915, SA 1960, RS 1982, BS 2015), recorded areas, parent references, reconciliation statuses. |
| 7 | `ownerships` | 60+ holdings | Joint and sole holding shares, fractions (e.g. `1/2`, `1/1`), decimals, `is_latest` active flags. |
| 8 | `deeds` | 80 deeds | Registered deeds, seller, buyer, plot, decimal area, BDT price, status, SHA-256 hash chain, Ed25519 digital signature. |
| 9 | `mutations` | 3 cases | AC Land e-mutation cases, deed link, plot link, seller, buyer, transfer area, status (PENDING, APPROVED, REJECTED). |
| 10 | `mortgages_liens` | 3 liens | Bank collateral liens, bank name, branch, amount, area, status (ACTIVE, RELEASED), partial unique index on active plot liens. |
| 11 | `disputes` | 0 initial | Citizen dispute complaints, plot link, complainant NID, dispute type, severity, status (OPEN, UPHELD_FROZEN, RESOLVED). |
| 12 | `audit_log` | 4 initial + runtime | Append-only cryptographically chained audit log (SHA-256) tracking all administrative actions. |
| 13 | `risk_reports` | Dynamic | Persisted pre-purchase and pre-registration fraud risk evaluation reports. |
| 14 | `demo_scenarios` | 8 scenarios | Pre-configured deliberate hackathon demonstration scenarios. |
| 15 | `noc_certificates` | 1 initial + runtime | Cryptographically signed bank mortgage release certificates with Ed25519 signatures. |
| 16 | `service_catalogue` | 6 services | Official Ministry of Land and Registration Directorate services with direct official URLs. |
| 17 | `service_fees_registry`| 6 registries | Statutory fee schedules with versioning, breakdown components, and legal circular references. |

---

## 4. Current Roles & How They Are Stored

### 4.1 Storage Mechanism
- Currently stored as a single `VARCHAR` column `role` in the `users` table.
- Token issued with `role` claim in JWT payload.
- Guarded in `backend/app/Http/Middleware/RoleMiddleware.php`.

### 4.2 Active Roles (5 Core Roles)
1. **`citizen`**: Public citizen / land owner (`rafiqul.citizen`, `rabeya.citizen`). Can view personal vault, toggle sale lock on owned plots, file disputes, check land before purchase.
2. **`sub_registrar`**: Sub-Registry Officer (`sr.savar`, `sr.gazipur`). Can run pre-registration checks, calculate stamp duties, register deeds with Ed25519 signatures, manage held deeds.
3. **`ac_land`**: Assistant Commissioner of Land (`acland.savar`). Can review e-mutation queue, approve/reject mutations, reconcile khatian chains, resolve disputes.
4. **`bank_officer`**: Scheduled commercial bank credit officer (`credit.sonalibank`). Can check collateral, record mortgage liens, release liens, generate digital NOC certificates.
5. **`admin`**: System administrator and ledger auditor (`auditor.admin`). Can manage users, site settings, verify full cryptographic ledger, run integrity diagnostics, inspect audit logs.

---

## 5. Seed Scenarios (8 Hackathon Demonstration Cases)

All 8 scenarios are seeded in `demo_scenarios` table and verified in `RulesAndLedgerTest::test_11_all_8_seeded_demo_scenarios_produce_expected_verdicts`:

| # | Code | Title (Bangla) | Target | Expected Verdict |
|---|---|---|---|---|
| 1 | `CLEAN_SALE` | ১. বৈধ ও নিরাপদ জমি বিক্রয় (সকল যাচাই সফল) | Dag 101, Deed DL-2026-1001 | `SAFE` (সবুজ - নিরাপদ) |
| 2 | `DOUBLE_SALE` | ২. একই জমি দুইবার বিক্রয়ের চেষ্টা (ডাবল সেল জালিয়াতি) | Dag 102, Deed DL-2026-1002 | `HIGH_RISK` (লাল - আটকানো) |
| 3 | `AREA_EXCEEDS_OWNED` | ৩. নিজের অংশের চেয়ে বেশি জমি বিক্রয়ের চেষ্টা | Dag 103, 18 dec vs 12 dec owned | `HIGH_RISK` (লাল - আটকানো) |
| 4 | `SELLER_NOT_OWNER` | ৪. ভুয়া মালিক কর্তৃক জমি বিক্রয়ের চেষ্টা | Dag 104, non-owner seller | `HIGH_RISK` (লাল - আটকানো) |
| 5 | `DEED_TAMPERED` | ৫. নিবন্ধনের পরে দলিলের তথ্য গোপনে পরিবর্তন | Dag 105, Deed DL-2026-1005 | `HIGH_RISK` (লাল - টেম্পারিং সনাক্ত) |
| 6 | `PLOT_MORTGAGED` | ৬. ব্যাংকে বন্ধক থাকা জমি পুনরায় বিক্রির চেষ্টা | Dag 106, Sonali Bank lien | `HIGH_RISK` (লাল - বন্ধককৃত) |
| 7 | `KHATIAN_CHAIN_BREAK` | ৭. খতিয়ান চেইনে অসামঞ্জস্যতা (আরএস → বিএস অমিল) | Dag 107, RS 18 dec vs BS 26 dec | `REVIEW` (হলুদ - সতর্কতা) |
| 8 | `INHERITANCE_UNRESOLVED` | ৮. মৃত মালিকের ওয়ারিশ সনদ ও নামজারি অমীমাংসিত | Dag 108, deceased owner | `REVIEW` (হলুদ - ওয়ারিশ যাচাই) |

---

## 6. Test Suite Status

The automated test suite runs via `php artisan test`:
- **`Tests\Feature\RulesAndLedgerTest`:** 18 passed, 0 failed.
  - Tests 01–10: All 9 fraud rules individually.
  - Test 11: End-to-end verification of all 8 demo scenarios.
  - Test 12: Live tampering and restoration workflow.
  - Test 13: Multi-role workflow simulation.
  - Tests 14–18: User registration, settings, RBAC role middleware, citizen sale locks, NOC generation.
- **`Tests\Feature\RoleAuditRegressionTest`:** 29 passed, 0 failed.
  - Tests F01–F22 & I01–I08: Complete role audit regressions (latest owner authority, NOC lien restrictions, mutation idempotency, dispute freezes, joint-owner area conservation, privacy masking, bank boundaries).
- **Total:** 47 automated tests passing cleanly with zero failures.

---

## 7. What Works Well

1. **Automated Fraud Prevention Engine:** All 9 rules in `FraudRulesEngine.php` execute deterministically and generate bilingual explanation findings with recommended actions.
2. **Cryptographic Ledger:** SHA-256 hash chaining and Ed25519 digital signing work end-to-end; tampering with any byte in a stored deed breaks hash verification and halts mutation approvals.
3. **In-Panel Officer Exploration:** Sub-Registrars, AC Lands, and Bank Officers can inspect complete CS → SA → RS → BS khatian lineages and verify deed signatures directly inside their role consoles without leaving the dashboard.
4. **Citizen Security & Property Vault:** Citizens can toggle sale-locks on their own plots and file dispute complaints, which immediately surface in the AC Land and Sub-Registrar queues.
5. **Service Catalogue & Statutory Fees:** Official Bangladesh land services and gazetted circular fees are catalogued and accessible with direct links to government portals.
6. **Bilingual Presentation:** Full Bangla and English support with Hind Siliguri typography and responsive design.

---

## 8. What is Stubbed or Broken (vs v2 Specification)

1. **RBAC Architecture (Spec 4.2):** Currently 5 simple roles stored in a string column; v2 requires 18 granular roles with permissions and jurisdiction scoping (`office_id`, division, district, upazila, mouza).
2. **Ownership Guard (Spec 3, M3):** `ownerships` table writes currently exist in both `WorkflowController::decideMutationCase` and `RoleControlController::reconcileKhatianPlot`. v2 strictly mandates that **only `ApproveMutation` (role `ac_land`)** can mutate ownerships, backed by a DB-level guard/trigger and automated test.
3. **Transfer Workflow (Spec 5, M4):** Currently a basic 2-step register deed → approve mutation flow. v2 mandates the **13-step transfer state machine** (`transfer_requests`, `transfer_parties`, `transfer_consents`, `transfer_events`, `biometric_verifications`) with 5 citizen-facing stages.
4. **Biometric Verification (Spec 5):** Currently no biometric mock provider; v2 requires `BiometricProvider` interface with `MockProvider` (face liveness camera demo + counter fingerprint simulator) storing only audit result records.
5. **URL Architecture (Spec 8.7, M6):** Currently query-string / tab-based routing (`/?tab=check`). v2 mandates friendly public URLs prefixed with `/bn` and `/en` (e.g. `/bn/check/...`, `/bn/verify/...`, `/bn/plots/...`, `/bn/my/land/...`) with 301 redirects.
6. **Citizen Documents Vault (Spec 8.1):** Currently shows basic property list; v2 requires plot documents vault (`/bn/my/land/{plot_code}/documents`) with trust levels L0–L3 and a 2-tap missing-document ticket trigger.
7. **Support Ticket Management (Spec 8.2):** Full ticket lifecycle (`TKT-2026-XXXXXX`), SLA targets, escalation ladder, and canned replies are missing.
8. **Public Codes (Spec 7):** Integer IDs are currently exposed in some API responses; v2 requires speakable public alphanumeric codes (`plot_code`, `deed_code`, `transfer_code`, `ticket_code`, `mutation_code`).
9. **Extended Schema (Spec 7):** 16+ new tables need to be added (`offices`, `appointments`, `case_access_grants`, `transfer_requests`, `biometric_verifications`, `plot_documents`, `tickets`, `listings`, `notices`, `blog_posts`, etc.).
