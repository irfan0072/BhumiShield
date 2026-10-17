# BhumiShield role and workflow audit — 17 October 2026

## Scope and confidence

Target: http://localhost:5175. Logged in separately as citizen, registrar, acland, bank, and admin using the project's synthetic demo accounts. Reviewed UI actions, API adapters, route guards, domain controllers, ownership relationships, and ledger behavior. Antigravity was editing during this audit; revalidate each finding against the latest code before fixing it.

Evidence labels: **UI** = exercised in browser; **Probe** = reproduced against a separately seeded temporary SQLite database; **Code** = traced in implementation, without applying the consequential action to the running application. This is broad role/workflow coverage, not a claim that every destructive button and every possible input combination was clicked.

No product source was edited. The audit added documentation and screenshots. In the running demo, plot 101 was locked then unlocked; its original unlocked state was verified. Synthetic objection DISP-2026-301, tagged AUDIT-20261017, was filed and then resolved through AC Land. These actions remain in the audit trail. No live deed approval, mortgage release, reconciliation, account deletion, password change, role grant, or security-policy change was performed. Logged out at completion.

## Coverage

| Area | Exercised in UI | Additional inspection / limits |
|---|---|---|
| Public portal | Desktop/mobile review from first pass; all 8 scenario buttons in this pass; manual wizard, back/reset, negative-area input, certificate open/close; FAQ expand; language switch | Browser history, scanned QR deep links, invalid inputs, and source handlers reviewed; no camera permission granted |
| Citizen | Login/logout, vault, demo profile, deed-proof button, sale lock/unlock, public propagation, objection filing | Identity and ownership enforcement reproduced in isolated fixtures; profile mutation not applied |
| Registrar | Login/logout, pre-check, register tab, search, fee calculator, Hiba selection, challan preview/close | Registration, hold release/reject, state consistency, fractions and validation inspected; mutation-affecting probes isolated |
| AC Land | Login/logout, mutation list, hearing modal/close, reconciliation list, tribunal, audit objection dismissal | Tampered/repeated approvals and reconciliation arithmetic reproduced in isolated fixtures |
| Bank | Login/logout, collateral check, status filter, ACTIVE and RELEASED NOC previews | Creation/release authorization, bank ownership and concurrency inspected; existing active liens not released |
| Admin/auditor | Login/logout, RBAC, ledger lab, scenarios, scenario 7, OCR, directory, settings, audit log, chart range, global search, direct role-switch attempt | User create/delete/disable/role controls, password and security settings inspected only; no live privilege changes |
| Automated checks | Existing 18 backend tests pass; production build passes | Existing suite uses its own temporary DB. Build output was directed to /private/tmp. Build reports a >500 KB JS chunk. These checks do not cover the failures below. |

## Critical and high-priority findings

### F01 — P0: ACTIVE mortgage receives a signed release certificate [UI, Probe]

Reproduce: Bank → first ACTIVE mortgage, Bangladesh Krishi Bank, plot 115 → Digital NOC. The certificate states that no financial claim/lien remains and describes the loan as repaid, while its own status is ACTIVE. A release date is fabricated using the current time. The response includes a signature and hash.

Cause: `RoleControlController.php:445` (`generateLienNoc`) does not require RELEASED status; `released_at` falls back to `gmdate`. `BankOfficerPage.tsx` offers NOC for every row and unconditionally prints the release assertion.

Fix: enforce RELEASED plus persisted release metadata at the API; refuse active-lien issuance; show an explicit unavailable state in the UI; persist a stable certificate and verify its hash/signature and lifecycle. Screenshot: `audit-evidence-2026-10-17/active-lien-noc.png`.

### F02 — P0: Tampered deed mutation can be approved [Probe, Code]

Fixture deed 5 verifies false, yet mutation case 3 accepts APPROVED. The live hearing modal for MUT-2026-502 offers approval for the tampered 25-decimal record without showing integrity evidence.

Cause: `WorkflowController.php:474` (`decideMutationCase`) updates ownership without rechecking the signed deed, plot restrictions, seller balance or case eligibility.

Fix: validate current case/deed state and integrity server-side before any ownership change. Surface the same evidence in the hearing modal. Block invalid cases even if a caller bypasses the UI.

### F03 — P0: Repeat mutation approval duplicates ownership [Probe]

In a clean fixture, create a 4-decimal transfer on plot 13. Approve its mutation twice. The buyer then owns two latest rows totaling 8 decimals for the same transfer. Approval has no terminal-state/idempotency guard. Rejecting an already approved case also lacks a compensating ownership transition.

Cause: `WorkflowController.php:474–523` always subtracts and inserts again.

Fix: explicit state machine, transactional row locking, one transfer application per case, unique constraints, and conflict/idempotent responses. Test approve twice, approve then reject, and concurrent decisions.

### F04 — P0: Freeze Plot does not stop transfers [Probe, Code]

Create a dispute on clean plot 13, resolve it as UPHELD_FROZEN, and run registrar pre-check. Actual verdict: SAFE, with no flags.

Cause: `RoleControlController.php:395` changes only dispute status; `FraudRulesEngine.php:451` considers only OPEN disputes. Moving a case to frozen removes its risk flag.

Fix: model a durable transfer restriction, enforce it in all checks and writes, and provide an audited unfreeze workflow. Frozen must remain blocking until explicitly released.

### F05 — P0: Citizen can lock another person's plot [Probe]

Citizen person 1 can enable the lock on plot 6, whose latest owner is person 11. The controller checks the role but never checks plot ownership or the existing lock owner.

Cause: `RoleControlController.php:78` (`togglePlotSaleLock`).

Fix: bind the actor to verified latest ownership; enforce co-owner/lock-owner rules; prevent arbitrary unlocks; use explicit desired lock state instead of a retry-sensitive toggle. Add non-owner, former-owner and co-owner tests.

### F06 — P0: Reconciliation can double jointly owned land [Probe]

Plot 3 has 24 decimals across two owners. Reconcile with total area 24. Total latest ownership becomes 48 because every owner receives the entire plot area.

Cause: `RoleControlController.php:341` updates every latest ownership to `reconciledArea`. It also sets heirs_recorded for existing owners without recording heirs or distribution. The live UI performs reconciliation directly with a canned note and no editable allocations/evidence.

Fix: preserve total-area invariants and distribute validated owner shares; record actual heirs and an officer order; separate survey correction from succession. Never mark unresolved succession complete by flipping a flag alone.

### F07 — P0, conditional: Missing authentication can fall back to an admin actor [Probe, Code]

In a clean seeded fixture with strict RBAC unset and no Authorization header, `RoleMiddleware::authorize(['admin'])` returns an admin actor. The fallback is described as test support but has no CLI/test-only boundary. HTTP routes call the same guard.

Location: `RoleMiddleware.php:94–110`; `backend/routes/api.php`.

Fix: protected HTTP actions must fail closed regardless of a UI/config setting. Inject explicit actors in tests rather than using anonymous production fallback. Test actual router requests without credentials, with malformed tokens, and with the wrong role. This probe does not assert that a destructive anonymous HTTP request was executed against the running server.

### F08 — P1: Open disputes produce different verdicts across roles [Probe, UI, Code]

Same clean plot 13 and open objection: registrar domain pre-check returns REVIEW; public check returns SAFE; bank collateral returns SAFE. The registrar UI itself calls the public check adapter, explaining why the newly filed objection was absent from its pre-check result.

Locations: `WorkflowController.php:179`, `:251`, `:573`; `SubRegistrarPage.tsx:89`; `frontend/src/api/client.ts:424`.

Fix: use one shared eligibility evaluation with disputes/restrictions supplied everywhere. Registrar must call the registrar pre-check endpoint with all transaction fields. Public, bank, registrar and mutation paths must agree on active restrictions.

### F09 — P1: Invalid quantities and misleading fractions [Probe, UI, Code]

Negative deed area -4 and negative price are accepted into PENDING_MUTATION in an isolated fixture. The public wizard accepts -1; it silently substitutes a default positive area for evaluation but prints -1 in the certificate. Registration derives every non-full-plot transfer as 1/2; mutation inserts hardcoded 1/2; the client drops the registrar's editable share_fraction.

Locations: `WorkflowController.php:303`, `:474`; `CheckBeforeBuyPage.tsx:68`; `api/client.ts:474`, `:getMutations`.

Fix: validate all quantities, prices, fractions and parties at the API boundary. Reject nonpositive/nonfinite/out-of-range values. Derive exact fractions consistently from the accepted transaction, and display precisely the values actually evaluated. Test 4/23, partial co-owner sales, equal seller/buyer and zero/negative amounts.

### F10 — P1: Held/rejected/mutated deed status changes lack transition safeguards [Code]

`RoleControlController.php:243` accepts arbitrary statuses, performs no fresh risk/integrity check, and does not consistently synchronize existing mutation cases. Rejecting a deed with a pending case can leave that case actionable; rejecting a mutated deed does not undo ownership. Release can queue a case without resolving its underlying risk.

Correction to an earlier preliminary concern: the CURRENT client already maps REGISTERED → PENDING_MUTATION in `api/client.ts:314`; that specific mapping is not a confirmed defect. Preserve it while fixing actual lifecycle issues.

### F11 — P1: Multi-record writes and identifiers are not concurrency-safe [Code]

Registration reads the last chain index before insert, mutation approval updates multiple records independently, lien creation checks before inserting, and audit entries are appended separately. No surrounding transaction/locking protects these sequences. Concurrent requests can oversell/duplicate, and partial failure can leave deed, mutation, ownership and audit inconsistent.

Locations: `WorkflowController.php:303`, `:474`, `:611`; `RoleControlController.php:243`, `:341`; `DatabaseSeeder::appendAuditEntry`.

Fix: transactional workflows, scoped locks and database constraints; test races using isolated fixtures. Do not rely on disabled UI buttons.

### F12 — P1: Bank authority is not scoped to its own liens [Code]

The bank account is described as Sonali Bank, but sees release/NOC actions for Bangladesh Krishi Bank and Agrani Bank as well. `releaseMortgageLien` checks only lien existence, not actor bank/office ownership. Any bank role has the same release scope.

Fix: persist and enforce bank/branch authorization for mutation actions and certificate issuance; retain appropriately scoped cross-bank risk visibility. Repeated release must not replace the original release timestamp.

### F13 — P1: Identity/vault relationships are not trustworthy [UI, Probe, Code]

Unknown NID lookup returns person 1 instead of not-found. Demo labels identify Abdur Rahim, Meherun Nesa and Tanvir while current records for those NIDs are Rafiqul, Rabeya and Abdul Karim. Citizen lookup can target other identities. Public registration accepts an existing person's NID and links the new account without verification/uniqueness safeguards.

Locations: `SystemAdminController.php:35`, `:196`; `CitizenHome.tsx:demo profile buttons`; `api/client.ts:279`.

Fix: distinguish public record lookup from private owner control. Bind account ownership to a verified synthetic identity flow; enforce account/NID policy; return honest not-found; derive profile labels/counts from records. Test impersonation through reused NIDs in an isolated database.

### F14 — P1: Printed verification report asserts unearned proof [UI, Code]

A HIGH_RISK report with an unresolved khatian and a negative requested area still prints “Ed25519 Verified”, “CS → SA → RS → BS Verified”, and a generic hash-protected footer. The certificate reference depends only on plot/year, not a distinct persisted evaluation. Certificate uses component seller/area state, which can differ from the scenario report.

Locations: `CheckBeforeBuyPage.tsx:477`, `:529`, certificate fields. Screenshot: `audit-evidence-2026-10-17/invalid-verification-certificate.png`.

Fix: use a persisted report snapshot with unique ID/time, accepted inputs, actual check outcomes and real proof when present. Never imply the report itself was signed unless a verifiable signed artifact exists. Keep prototype/demo labeling visible.

### F15 — P1: Admin role switch fails and leaves a poisoned session [UI, Code]

Admin → Citizen direct access: no visible change; console reports “Super Admin direct login failed AxiosError: Network Error”. Before the request, original admin token is saved. The API interceptor adds X-Admin-Supervisor-Token; CORS does not allow it. Subsequent requests can also fail. Logout does not remove supervisor/mode keys.

Locations: `NavbarAndLayout.tsx:handleSuperAdminDirectLogin`; `api/client.ts:request interceptor`; `backend/public/index.php:9`; `i18n/index.tsx:109`.

Fix: intentional cross-origin header handling or same-origin transport; atomic supervisor session switching with rollback and visible errors; clear every auth/supervisor key on logout/expiry. Validate the supervisor account remains active and authorized. Do not fall back to a client-only role change on failure.

### F16 — P1: QR end-to-end verification is incomplete [Code]

Deed QR URL builder defaults to localhost:5173/verify/{id}?h=..., whereas this project runs at 5175. App.tsx uses only activeTab state and does not parse /verify routes or h. NOC QR encodes NOC:number:hash without a verification endpoint/page. If qrencode is unavailable, a decorative SVG is returned as if it were a QR code.

Locations: `LedgerService.php:134`, `:141`; `App.tsx`; `RoleControlController.php:generateLienNoc`.

Fix: configure the actual origin, implement refresh-safe deed/NOC verification routes, consume and validate the hash parameter, and use a dependable QR encoder. Decode generated images in a test and follow the decoded URLs. Show a genuine error if encoding fails.

### F17 — P1: Policy switches can save without affecting behavior [Code]

Settings expose rapid_resale_days, require_mock_nid_check, auto_queue_emutation and public_qr_verification_enabled. The inspected evaluation/workflow code does not read those values; mutation queueing is unconditional for PENDING_MUTATION, rapid resale uses its own default, and public QR routes are unconditional.

Fix: explicitly bind supported policy keys to behavior with validation, consistent JSON types, and behavior tests. Remove or mark unsupported settings. Authentication enforcement must not become optional.

### F18 — P1: Password-change and administrator lifecycle safeguards incomplete [Code]

`updateProfile` accepts new_password without the current-password check used by the dedicated password endpoint. User-role updates do not validate roles or protect the final active admin from self-demotion/deactivation. Some user lookup/update paths do not centrally enforce active-account state.

Locations: `SystemAdminController.php:155`, `:adminUpdateUser`, `:registerUser`; `JwtAuthService.php`.

Fix: consolidate password changes behind current-credential verification and validation; revoke affected sessions; validate role enums and protect the last active admin. Keep seeded demo credentials explicitly isolated from any non-demo mode. These actions were not applied to live accounts.

## UI, navigation and completeness findings

### F19 — P2: Citizen proof button has no rendered result [UI, Code]

Click any vault deed's “QR কোড ও প্রমাণ দেখুন”. Request completes but no modal/result appears. CitizenHome stores selectedDeedModal/loadingDeedModal and never renders them. Add proof modal/loading/error UI or navigate to the matching deed detail.

### F20 — P2: OCR renders empty fields and NaN% [UI, Code]

Admin → cases/OCR displays keys with Confidence: NaN% and no extracted values. Backend returns scalar extracted_fields plus top-level confidence; UI expects each value to have value/confidence properties. Normalize one typed contract. Clearly label the current preset mock; no actual image-upload/human-review persistence workflow is implemented in this screen.

### F21 — P2: Operational selectors and search omit much of the dataset [UI, Code]

Registrar displays only the first 30 deeds from the backend default and local search cannot find older deed DL-2024-1001. Plot selectors use slice(0,25), bank slice(0,20), people slice(0,15/20), citizen deed history slice(0,5) with no pagination. Bank cannot select plots in the other two mouzas; objections cannot target later plots.

Fix: searchable/paginated controls over all eligible records. Search server-side before pagination, return total counts, and preserve selected record context.

### F22 — P2: Dashboard actions ignore their labels [Code]

Registrar passes every overview action to setSubTab('deeds'); AC Land sends every action to 'khatians'; admin sends every action to 'ledger'; bank maps every action to collateral check. Thus “calculate fees”, “review tribunal”, “download NOC”, and new verification shortcuts can perform unrelated actions.

Locations: SubRegistrarPage.tsx:224; AcLandPage.tsx:163; AdminDashboardPage.tsx:182; BankOfficerPage.tsx:196. Map each named action explicitly and test each unique destination. Global search also merely changes tabs without transferring/looking up its query.

### F23 — P2: Dashboard ranges and trust metrics are presentation-only [UI, Code]

Chart buttons update chartRange but chart data does not use it. Growth percentages, 98.75%/98.8% integrity and 4.9/5 trust score are constants; date range remains 1–16 October. Citizen's “my plots” KPI differs from its actual vault, since fallback/global metrics are used. Missing data is replaced by plausible sample totals.

Fix: compute and scope metrics from authoritative records or visibly label examples; show unavailable/loading states. A broken ledger must not coexist with an invented trust score. Filters must change the underlying series and summary.

### F24 — P2: Shared demo state and hardcoded IDs cause contradictions [UI, Code]

All 8 public scenario buttons were exercised: #1 returned HIGH_RISK (expected SAFE), #2–#6 HIGH_RISK as advertised, #7–#8 WARNING as advertised. Current deed 1 is persistently tampered. “Intact DL-2026-1001” does not exist; actual deed 1 is DL-2024-1001. The tamper adapter ignores its supplied deed number and always changes ID 1. Restore affects both IDs 1 and 5, altering the independent tamper scenario.

Fix: authoritative fixture references, isolated/resettable demo state, explicit targeted tamper/restore, and accurate expected/live outcome labels. Do not suppress real tamper detection to make a demo green.

### F25 — P2: Ledger detail can omit actual broken records [Code]

The API computes full verification, but the UI builds broken_blocks from chain_sample (first 10 plus last records), not the full broken_links result. A failure in the omitted middle may leave no listed failing block or an incorrect failure count. Sample verification also omits expected predecessor validation. Map full summary/failures separately from preview records.

### F26 — P2: Errors, localization and accessibility need a consistent pass [UI, Code]

Multiple handlers swallow errors or use try/finally without catch, leaving no visible failure feedback. Citizen action errors share green success styling. Drawer/modal close and delete icon buttons lack names. English mode leaves Bengali glossary descriptions and several labels. Earlier visual pass confirmed mobile hero/search clipping and QR input icon overlap; recheck against Antigravity's current changes. Mobile/keyboard modal focus, Escape close, reduced motion, screen-reader status announcements and print-only layouts remain unverified, not claimed as passed.

### F27 — P2: Product claims exceed implemented workflows [UI, Code]

FAQ describes biometric/NID/OTP unlock, but observed lock action is a direct authenticated toggle with no OTP/biometric step. Certificates/challans use official-style headings/seals and “verified” statements despite being synthetic previews. Fee HIBA calculation changes amounts but leaves SALE percentage labels (e.g. 1.5% alongside a flat 1,000 amount). Fix wording and labels to reflect actual supported demo behavior; do not invent integrations or silently hardcode legal conclusions.

## Relationships that must be tested together

1. Citizen account ↔ verified person/NID ↔ latest ownership ↔ permitted lock action.
2. Plot ↔ disputes/freezes/owner locks ↔ public, registrar and bank eligibility.
3. Registration ↔ immutable signed content ↔ held/pending lifecycle ↔ exactly one mutation.
4. Mutation decision ↔ seller debit/buyer credit ↔ conserved area/fractions ↔ citizen vault.
5. Bank/branch actor ↔ its lien ↔ release event ↔ stable NOC ↔ public verification.
6. Admin session ↔ supervised role ↔ CORS/auth headers ↔ logout/revocation.
7. Every domain transition ↔ one consistent audit event, with transaction integrity.

## Validation results and artifacts

- Existing backend suite: 18 tests passed, separate temporary database.
- Production build: passed; large JS chunk warning (~627 KB minified).
- Additional audit probes: 10 isolated checks reproduced non-owner lock, unknown-NID fallback, ACTIVE signed NOC, ignored freeze, inconsistent open-dispute verdicts, repeated mutation transfer, tampered mutation approval, ownership inflation on reconciliation, negative-area registration and conditional anonymous role fallback.
- Probe script: `/private/tmp/bhumishield-audit-20261017/probes.php`. Its database is isolated using BHUMISHIELD_TEST_DB; it does not touch the running demo database.
- Browser screenshots are in `docs/audit-evidence-2026-10-17/`.

Recommended order: F01–F07 first; then shared eligibility, lifecycle/transactions, identity and session issues; then QR/reports, selector coverage, settings, and UI completeness. Re-run browser and HTTP-level regression tests after fixes. Passing the current suite alone is insufficient.
