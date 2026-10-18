# BhumiShield software quality audit — 18 October 2026

**Release verdict: blocked for real public service.** The application builds and the existing tests are green, but fresh adversarial tests reproduce privacy leaks, incorrect party selection, unenforced consent, incorrect office scope, and unsupported payment/title-document claims. Do not equate a green build or a signed application record with government approval.

বাংলা সারসংক্ষেপ: ভুল ক্রেতার নামে দলিল তৈরি, লগইন ছাড়া মামলা দাখিল, ব্যক্তিগত তথ্য প্রকাশ, সম্মতি ছাড়া ধাপ অগ্রসর হওয়া এবং নামজারির আগেই পরিশোধিত সরকারি রসিদ দেখানো—এই সমস্যাগুলো আগে ঠিক করতে হবে। এই অডিটে product source বা মূল business records পরিবর্তন করা হয়নি।

## Scope, evidence and limits

- Audited a stable source snapshot. `quality-audit-2026-10-18/source-hashes.json` and `source-drift.json` record the source state; final comparison found **no product source changes** during this audit.
- All write-based probes, sign-ins and UI tests used copied source and disposable databases under `/private/tmp/bhumishield-quality-audit-20261018/`. Existing servers on 5175/8008 were left alone. The pre-existing source collector worker was left alone.
- Read-only usable-database checks: SQLite integrity **ok**, **zero foreign-key violations**; 25 users, 47 persons, 61 plots, 248 ownership rows, 88 deeds, 7 transfers, 12 offices. These counts establish scale, not data authenticity. Some probe databases contain extra explicitly synthetic fixtures.
- Opened the landing workspace for **22 distinct roles**, including admin and system_admin. Inspected citizen, transfer, guide, map, directory, notices, marketplace, blog, checker, verification, profile and not-found screens. Role screenshots/heading inventory are in `role-visual-coverage.json` and `role-*.png`.
- Manually reproduced the premature DCR viewer and office navigation defects; inspected task-specific screens and public pages. This is **not** a claim that every button, every combination of permissions or every legal workflow has passed.
- At an audit breakpoint of 390×844, the citizen, transfer, map and linked-office pages had document width equal to viewport content width (384 px). No horizontal overflow was measured on these four views. Reset the temporary viewport afterwards. Actual font family was Hind Siliguri / Noto Sans Bengali; do not invent a different-font defect.
- No external government submissions, actual payments, NID verification or physical biometric hardware tests were performed. Test database settings enable simulated providers by design; simulated successes are not evidence of operational government integrations.

## Gates and what they prove

| Check | Fresh result |
|---|---|
| TypeScript typecheck | PASS |
| Frontend production build | PASS; main chunk 535.60 kB / 149.09 kB gzip, admin chunk 609.78 kB / 111.96 kB gzip |
| Standard `php artisan test` | 128 existing checks passed across 13 suites |
| Separate lawyer suite | 8 checks passed; returns a passed count rather than failure count and is absent from the standard runner |
| Source intelligence | 57 checks passed |
| Map workspace | 21 checks passed |
| Parcel design | 25 checks passed |
| Owner allocation | 28 checks passed |
| Python collectors | 11 + 2 checks passed |
| **Existing automated checks total** | **280 passed** |
| Fresh negative/security probes | **Confirmed the defects below despite the green suite** |

Logs are in `quality-audit-2026-10-18/`. The source/map/parcel gates validate useful invariants and must be preserved. They do not cover all sensitive legacy endpoints.

## Prioritized findings

| ID | Priority | Exact defect | Evidence class |
|---|---|---|---|
| A01 | P1 | Anonymous caller can file an attributed lawyer case on an arbitrary plot | Route-level reproduction |
| A02 | P1 | Public lawyer verification discloses full NID, phone and email | Route-level reproduction |
| A03 | P1 | Deed execution substitutes a different buyer | Persisted wrong-buyer reproduction |
| A04 | P1 | Seller can advance the buyer-confirmation transition | Route-level reproduction |
| A05 | P1 | A plain note substitutes for co-owner consent | Route-level reproduction |
| A06 | P1 | Pending transfer generates PAID DCR/porcha and completed UI | API + manual UI reproduction |
| A07 | P1 | Configured mouza restrictions are ignored for common office types | Two-mouza fixture reproduction |
| A08 | P1 | Provided public deployment configuration uses a committed signing seed and automatic seeding | Static deployment release blocker |
| A09 | P1 | Default backend image cannot find source manifests/collector assets | Static packaging + equivalent-layout reproduction |
| A10 | P2 | Invalid appointment data becomes BOOKED; unrelated guests collide under invented NID | Route-level reproduction |
| A11 | P2 | Invalid phone contact is accepted during registration | Route-level reproduction |
| A12 | P2 | Transfer tracking codes are replaced with `TR-<id>`; canonical-code deep links fail | API contract + manual UI |
| A13 | P2 | Office map navigation ignores its coordinates/office ID | Manual UI + source trace |
| A14 | P2 | Show-all offices leaves the old office filter in URL | Manual refresh reproduction |
| A15 | P2 | system_admin is rejected where admin can advance the same early transfer step | Comparative route reproduction |
| A16 | P2 | Readiness claims implemented WebAuthn/passkeys without implementation | API + repository trace |
| A17 | P2 | Every admin-role screen polls 26 modules every 8 seconds; legacy geography fetches all plots | Static performance defect; no national load claim |
| A18 | P2 | Default runner misses feature suites and unsafe expectations pass | Fresh test inventory and negative probes |
| A19 | P1 | Public geography/plot endpoints disclose a lock owner's full NID | Authenticated lock then anonymous-read reproduction |
| A20 | P1 | Bank officer receives the entire person directory with full identity/address/parent data | Authenticated role-level reproduction |

P1 means fix before service exposure. P2 means consequential reliability, correctness, usability or release assurance work. Conditional deployment findings are distinguished from bugs reproduced on the copied running app.

### A01 — Anonymous attributed lawyer case filing

[backend/routes/api.php:221](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/routes/api.php:221>), [backend/routes/api.php:224](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/routes/api.php:224>), [backend/app/Http/Controllers/Api/V1/LawyerPortalController.php:77](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/app/Http/Controllers/Api/V1/LawyerPortalController.php:77>). Both POST routes call the controller without authentication. `fileCase` checks only that a supplied public bar number exists and is active; it never binds that lawyer to the caller or requires an authenticated filing account, authorization, source court order or independent review.

Copied-app probe: anonymous `/lawyers/file-case` returned 200 and inserted one `OPEN` dispute while no authentication or evidence was supplied. The pre-check treats OPEN disputes as blockers, so an untrusted allegation can obstruct service. The audit used a synthetic suit reference and did not file anything with a court.

Fix: bind an authenticated actor to the authorized advocate; validate role, matter, scope and evidence. Separate unverified intake from an enforceable restriction. Review lawful restrictions through the competent role. Do not remove genuine dispute protection to hide this bug. Proof: `adversarial-probes.json`.

### A02 — Public lawyer identity disclosure

[backend/app/Http/Controllers/Api/V1/LawyerPortalController.php:19](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/app/Http/Controllers/Api/V1/LawyerPortalController.php:19>), [backend/app/Http/Controllers/Api/V1/LawyerPortalController.php:63](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/app/Http/Controllers/Api/V1/LawyerPortalController.php:63>). Anonymous verification returns `lawyer.nid`, phone and email alongside the active-license result. Probe confirmed all three are returned unredacted. A license number is an identifier, not an authentication secret.

Fix: define a minimal public verification projection; move sensitive identity/contact fields behind authenticated, purpose-specific authorization. Rate-limit identifier lookup. Do not publish raw personal identifiers in error responses or audit artifacts. Proof: `adversarial-probes.json`.

### A03 — Wrong buyer persisted into a deed

[backend/app/Services/TransferStateMachine.php:636](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/app/Services/TransferStateMachine.php:636>). `advanceStepInside` reads `$buyerParty`, but this variable exists only in `getTransfer`, a different method. PHP warns and the fallback selects the first person whose NID differs from the seller. It does not resolve the transfer's BUYER party.

Fresh isolated fixture: intended buyer ID **42**, fallback/persisted deed buyer ID **1**, response **200**, warning **Undefined variable $buyerParty**. This is a demonstrated incorrect write, not only a static suspicion. No usable-database deed was created.

Fix: load persisted parties inside the execution transaction; require the correct, eligible buyer(s), shares and current confirmations; fail when missing or ambiguous. Remove arbitrary first-person fallbacks for both parties. Preserve deed integrity and ownership-conservation checks. Proof: `buyer-execution-proof.json`.

### A04 — Seller impersonates buyer confirmation

[backend/app/Services/TransferStateMachine.php:488](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/app/Services/TransferStateMachine.php:488>). The buyer mismatch check explicitly exempts the creator/seller. With distinct recorded parties, the seller's token advanced current step 3 → 4 with 200. No buyer confirmation was supplied.

Fix: authorize the actual buyer or a formally recorded delegation, bind consent to the exact parties/area/price/terms, persist it and invalidate it when terms change. A seller or platform administrator must not manufacture buyer consent. Proof: `adversarial-probes.json`.

### A05 — Co-owner consent can be replaced by free text

[backend/app/Services/TransferStateMachine.php:561](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/app/Services/TransferStateMachine.php:561>). For a plot with multiple current ownership rows, providing any nonempty `notes_bn` satisfies the co-owner gate even without `consent_confirmed` or evidence. The notes-only probe advanced 5 → 6 with 200.

Fix: define when co-owner/heir authority is required and verify the required persisted authorizations, actors, shares, evidence and versions. A note or client boolean is not evidence. Likewise, sensitive later gates must bind biometric evidence to the required parties and current transfer, rather than count any MATCH row. Proof: `adversarial-probes.json`.

### A06 — Unsupported payment and ownership documents

[backend/app/Services/TransferStateMachine.php:343](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/app/Services/TransferStateMachine.php:343>), [backend/app/Services/TransferStateMachine.php:360](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/app/Services/TransferStateMachine.php:360>), [frontend/src/pages/ApplicationsPage.tsx:75](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /frontend/src/pages/ApplicationsPage.tsx:75>), [frontend/src/components/CitizenDcrPorchaModal.tsx:62](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /frontend/src/components/CitizenDcrPorchaModal.tsx:62>), [frontend/src/components/CitizenDcrPorchaModal.tsx:207](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /frontend/src/components/CitizenDcrPorchaModal.tsx:207>). At step >=12, the API invents DCR/transaction numbers, hardcodes `PAID` and produces a khatian projection. The UI calls this fully completed and presents approved government receipts. The modal also manufactures fallback identities, locations, payment values and government record seals.

Fixture: step 12, status PROCESSING, deed_id NULL, mutation_id NULL → returns PAID DCR and owner porcha. The UI simultaneously said completed and “waiting for final mutation order”; the printable DCR claimed BDT 1170 paid with a generated transaction reference. The fixture isolates the guard; the source condition also applies to ordinarily reached step 12 before final approval.

Fix: obtain status from persisted competent approval and validated payment/issued-document evidence. Do not infer completion from a step count. Do not synthesize PAID status, receipts, government authority, identity, survey type or a new owner. A local prototype record must identify its actual issuer and verification scope. Proof: `premature-document-proof.json`, `pending-transfer-document.ax.txt`, `premature-dcr-modal.ax.txt`, screenshots.

### A07 — Mouza and assignment scope bypass

[backend/app/Services/OfficeScopeService.php:58](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/app/Services/OfficeScopeService.php:58>), [backend/app/Services/OfficeScopeService.php:97](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/app/Services/OfficeScopeService.php:97>), [backend/app/Services/TransferStateMachine.php:749](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/app/Services/TransferStateMachine.php:749>). The scope helper reads `jurisdiction_scope_json` but does not enforce its restrictions. A failed mouza match is tolerated for ac_land / sub_registry / registry office types. Transfer `canView` checks only district/upazila equality.

Fixture: office explicitly allowed location 1; a second location 5 was created in the same district/upazila and excluded from both office coverage and assignment scope. Access returned true for both locations. This is not an assertion about statutory jurisdictions; it violates the application's explicit configured restriction.

Fix: one consistent effective-scope service for list/detail/download/write routes, using explicit coverage and duty. Support declared wider jurisdiction deliberately; do not infer it merely from office type. Test two offices/mouzas in one upazila and national oversight exceptions. Proof: `scope-and-admin-proof.json`.

### A08 — Unsafe provided deployment defaults

[render.yaml:11](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /render.yaml:11>), [render.yaml:21](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /render.yaml:21>), [backend/entrypoint.sh:15](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/entrypoint.sh:15>), [backend/artisan:156](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/artisan:156>). The provided public-hosting configuration sets APP_ENV=staging and contains a fixed signing seed. Entrypoint automatically attempts `migrate --seed`. Production-only guards therefore do not protect the supplied staging deployment from known demo signing material and seeded identities/content.

No remote deployment was made or attacked. This is a release-configuration finding, not a claim that the user's external host is running it.

Fix: separate service deployment from explicit isolated demonstration setup; do not commit signing secrets or seed business identities on startup. Require operator-managed secrets and fail closed when insecure. Do not silently change user passwords or rotate existing keys during repair. Review existing fixture provenance before any approved cleanup; preserve user-created data.

### A09 — New source features break in the default API image

[backend/app/Http/Controllers/Api/V1/SourceIntelligenceController.php:16](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/app/Http/Controllers/Api/V1/SourceIntelligenceController.php:16>), [backend/app/Http/Controllers/Api/V1/SourceIntelligenceController.php:86](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/app/Http/Controllers/Api/V1/SourceIntelligenceController.php:86>), [backend/Dockerfile:1](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/Dockerfile:1>), [docker-compose.yml:3](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /docker-compose.yml:3>), [render.yaml:6](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /render.yaml:6>). Source methods require a sibling `../tools/service_sources` directory. Both provided API builds use `backend` as their context and copy only that context. The controller's public context path calls `migrate`, which unconditionally reads the missing manifest. Installing a separate worker does not repair this API file dependency. The API Dockerfile also does not declare the Python dependency for its dashboard-triggered collector.

Equivalent backend-only layout probe raised a missing `sources.json` exception. A full Docker image was not built in this audit.

Fix: package canonical manifests and collector assets consistently for API and worker, declare the runtime or queue collection to the packaged worker, centralize additive schema setup, and provide explicit feature readiness/error handling. Verify the actual default image, not only the repository checkout. Proof: `backend-only-deployment-proof.json`.

### A10 — Appointment input and identity contract are invalid

[backend/app/Http/Controllers/Api/V1/PublicMarketplaceAndPortalController.php:759](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/app/Http/Controllers/Api/V1/PublicMarketplaceAndPortalController.php:759>), [backend/app/Http/Controllers/Api/V1/PublicMarketplaceAndPortalController.php:804](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/app/Http/Controllers/Api/V1/PublicMarketplaceAndPortalController.php:804>). Nonempty strings are accepted as date/time/phone. Anonymous booking without NID substitutes `9900001001`. No verified capacity/office acceptance is required before BOOKED.

Probe: date `not-a-date`, time `25:99`, phone `not-a-phone` → 200 / BOOKED. Two different guest names/phones on one future day → first 200, second APPOINTMENT_CONFLICT because both inherited the same invented NID.

Fix: validate calendar dates, allowed slots, contact and service enum server-side; use authenticated identity or explicit guest booking identity. No default citizen NID. Use a truthful request/confirmation lifecycle and office capacity rules. Link transfer appointment advancement to the actual appointment record. Proof: `appointment-validation-proof.json` and A05/A06 workflow evidence.

### A11 — Invalid registration phone accepted

[backend/app/Http/Controllers/Api/V1/SystemAdminController.php:142](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/app/Http/Controllers/Api/V1/SystemAdminController.php:142>). Registration accepts `phone_dummy=not-a-phone` with no email/NID, returns 200 and creates an account. This is contact validation failure, not proof of verified identity takeover.

Fix: normalize and validate supported contact formats and channels; reject invalid data before creating records. Distinguish contact verification, profile completeness and identity verification. Never invent an NID/phone to make onboarding look complete. Proof: `adversarial-probes.json`.

### A12 — Tracking code contract is broken

[frontend/src/pages/ApplicationsPage.tsx:161](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /frontend/src/pages/ApplicationsPage.tsx:161>), [frontend/src/pages/ApplicationsPage.tsx:799](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /frontend/src/pages/ApplicationsPage.tsx:799>), [frontend/src/api/client.ts:1123](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /frontend/src/api/client.ts:1123>). Backend returns `transfer_code`; the page expects `tracking_number`, then invents `TR-<id>`. Detail loading by a canonical transfer code searches the list by the wrong field. The copied UI displayed TR-3; its document viewer displayed the actual TR-2026-000103.

Fix: one typed canonical code/ID contract across creation, list/detail, copied tracking, notifications, direct URL and support lookup. Preserve numeric ID compatibility without displaying invented public codes. Test reload, back/forward and language switches. Evidence: pending-transfer/document AX snapshots.

### A13 — Office map link drops the user's intended destination

[frontend/src/pages/OfficeLocatorPage.tsx:183](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /frontend/src/pages/OfficeLocatorPage.tsx:183>), [frontend/src/pages/CadastralMapPage.tsx:17](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /frontend/src/pages/CadastralMapPage.tsx:17>). Office button navigates to `map?lat=23.534&lng=90.717&office_id=9`. Map reads mouza/q/parcel/manage/design parameters but ignores those office coordinates and ID, leaving a generic map with no selected office destination.

Fix: load the named office, validate coordinates, center/mark it and preserve context, or use the map's supported canonical selection. Do not label a mouza reference center as an office coordinate. Proof: `office-map-navigation.txt`, `office-map-settled.txt/png`.

### A14 — Show all offices does not clear the URL filter

[frontend/src/pages/OfficeLocatorPage.tsx:198](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /frontend/src/pages/OfficeLocatorPage.tsx:198>). The button changes local state only. In manual testing, the page expanded to the full directory (14 headings including its section headings), but its URL retained `office_id=9`; refresh restored the single office.

Fix: update the canonical query and state together. Back/forward, refresh and copied links must reproduce the visible result. Proof: `office-show-all-url.txt`.

### A15 — Inconsistent administrator capability checks

[backend/app/Services/TransferStateMachine.php:488](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/app/Services/TransferStateMachine.php:488>). RoleMiddleware and case visibility treat admin/system_admin as platform administrators, but individual transition role lists accept only literal admin. Identical fixture step 1 → 2: admin 200, system_admin 403 FORBIDDEN.

Fix: use shared capability policy for legitimately shared operational actions. Preserve AC Land ownership authority and actual party consent; do not solve this by broadly granting all land-write roles. Proof: `scope-and-admin-proof.json`.

### A16 — False passkey readiness

[backend/app/Services/ReadinessService.php:63](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/app/Services/ReadinessService.php:63>), [backend/app/Services/ReadinessService.php:72](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/app/Services/ReadinessService.php:72>). `/identity/readiness` declares ACCOUNT_AUTHENTICATION READY with WebAuthn/FIDO2, no unresolved dependencies. Repository search found no credential enrollment, challenge storage, attestation/assertion validation or passkey login routes; the actual login is password/JWT.

Fix: report the implemented password/JWT capability accurately and show passkeys as unavailable until a genuine complete implementation is verified. Keep device biometric unlock distinct from NID proofing and registry counter identity. Proof: readiness output in `adversarial-probes.json` and repository trace.

### A17 — Unbounded data and excessive global polling

[frontend/src/pages/AdminDashboardPage.tsx:505](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /frontend/src/pages/AdminDashboardPage.tsx:505>), [frontend/src/pages/AdminDashboardPage.tsx:886](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /frontend/src/pages/AdminDashboardPage.tsx:886>), [backend/app/Http/Controllers/Api/V1/WorkflowController.php:190](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/app/Http/Controllers/Api/V1/WorkflowController.php:190>), [frontend/src/api/client.ts:830](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /frontend/src/api/client.ts:830>). Every administrative role loads 26 module requests every 8 seconds, including unrelated modules and endpoints the role cannot use; errors are often converted to empty arrays. `/locations` selects every location and plot; legacy `getPlots(mouza_id)` downloads all plots and filters in the browser. The newer map endpoint is bounded and should be preserved.

Fix: role/current-panel data loading, single-flight cancellation, pause/backoff while hidden, bounded server search/pagination/counts and appropriate indexes. Never make unauthorized endpoints succeed merely to remove errors. This audit did not measure national-volume throughput or certify scaling.

### A18 — Green tests omit important behavior

[backend/artisan:156](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/artisan:156>), [backend/tests/Feature/LawyerPortalTest.php:49](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/tests/Feature/LawyerPortalTest.php:49>), [backend/tests/Feature/SecurityWorkflowRegressionTest.php:1](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/tests/Feature/SecurityWorkflowRegressionTest.php:1>). Standard runner omits LawyerPortalTest, SourceIntelligenceTest, MapWorkspaceTest, ParcelDesignTest and ParcelAllocationTest. The lawyer suite expects anonymous verify/file success and returns passed count; wiring it as a failure count would be incorrect. Other tests permit the seller to advance early steps and do not assert the persisted buyer against the chosen BUYER party or require issued payment records for DCR.

Fix: integrate all suites under a consistent isolated harness, correct unsafe expectations, add the negative and persistence assertions from this report, and preserve useful existing conservation/authorization/provider tests. A 280-pass count does not override the observed defects.

### A19 — Public plot metadata leaks a lock owner's NID

[backend/app/Http/Controllers/Api/V1/WorkflowController.php:190](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/app/Http/Controllers/Api/V1/WorkflowController.php:190>), [backend/routes/api.php:169](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/routes/api.php:169>). `/locations` returns SELECT p.*; `/plots` reuses it. Neither path applies the bounded public map projection or identifier minimization. `locked_by_nid` is one of the returned database columns.

After the real owner activated a sale lock in a disposable fixture through the normal authenticated route, anonymous reads of both endpoints returned one full unmasked lock-owner NID and internal actor fields. No raw identifier is reproduced in the report. Proof: `privacy-proof.json`.

Fix: explicit minimal public DTOs for all plot/geography endpoints, stripping private identifiers, internal notes and actor metadata. Keep legitimate public lock status. Test after lock/unlock, not only initially empty columns.

### A20 — Bank role gets the full person directory

[backend/app/Http/Controllers/Api/V1/WorkflowController.php:202](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /backend/app/Http/Controllers/Api/V1/WorkflowController.php:202>). `isOfficial` is a broad boolean; a bank officer calling `/persons` receives SELECT * for the entire persons table without a relevant plot, purpose-bound exact query, bank matter, office scope or pagination.

Copied-app result: 47 person records, 47 full NIDs, 47 addresses and 46 parent-name records. A bank employee's ability to process an authorized collateral matter does not require downloading every person's identity data.

Fix: restrict this endpoint to explicit authorized tasks and minimal projections. Bank queries must use relevant authorized matter/consent scope. Scoped officers may get necessary identity only for their permitted records; national oversight needs explicit policy and audit. Proof: `privacy-proof.json`.

## Improvements preserved; old reports are not current truth

- All 22 role landing screens rendered; editor/checker/support/moderator/auditor have specific workspaces. The previous blank transfer/map and missing survey renderer findings should not be copied as current bugs.
- Map uses persisted records, source-reviewed layers and office parcel designs rather than the previous hardcoded alternate plot world. New map/parcel/allocation checks passed.
- Survey batches now support RETURNED/resubmission and stronger decision validation. Scope is improved at district/upazila level, while A07 remains.
- Identity/provider fail-closed boundaries, masked public plot detail views and ownership conservation controls exist. Fixing A19 must extend these safeguards to legacy endpoints, not weaken them.
- Mobile pages inspected did not overflow. Remaining UX concerns are truncated citizen service-card names, dense administrative summaries, mixed technical language and the public-to-GovTech-shell switch. Treat these as usability observations, not a measured WCAG compliance failure or an invented font-family defect.

## External/readiness limitations

Operational government NID, physical counter biometrics, government payment/submission connectors, authoritative nationwide cadastral boundaries, source rights and national load testing remain outside what this audit verified. Source observations waiting for human review are not themselves bugs. Do not publish unverified fee/legal guidance or activate simulators to make the service appear complete.

## Repair order and closeout

1. A01/A02/A19/A20: stop unauthorized writes and sensitive data disclosure.
2. A03/A04/A05/A06/A07: correct party selection, evidence gates, documents and effective office scope.
3. A08/A09: secure and exercise the actual deployment layout.
4. A10–A18: reliability, navigation, availability truthfulness, performance and test assurance.

For each ID, provide reproduction-before, changed responsible layer, regression proof and manual result-after. Mark external limitations explicitly. Re-run against disposable databases, inspect every failing test, and produce a role/workflow matrix that distinguishes exercised actions from landing-screen checks.

Full implementation prompt: [docs/ANTIGRAVITY_EXACT_BUG_FIX_PROMPT_2026-10-18.md](</Applications/XAMPP/xamppfiles/htdocs/landtech hackathon /docs/ANTIGRAVITY_EXACT_BUG_FIX_PROMPT_2026-10-18.md>).
