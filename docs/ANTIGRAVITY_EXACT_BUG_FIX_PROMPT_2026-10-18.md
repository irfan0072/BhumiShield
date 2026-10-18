# Antigravity prompt — exact BhumiShield defect repairs

You are repairing the existing BhumiShield repository at:

`/Applications/XAMPP/xamppfiles/htdocs/landtech hackathon `

Read `docs/SOFTWARE_QUALITY_AUDIT_2026-10-18.md` completely before editing. Use its A01–A20 findings and the evidence in `docs/quality-audit-2026-10-18/`. The audit used a stable source snapshot, 22 role landing-screen inspections, manual workflow/navigation checks, 280 passing existing checks and additional adversarial reproductions. A green test count did NOT prevent the confirmed defects. Reproduce the relevant behavior and inspect the current source; do not repeat superseded findings from older reports.

Deliver targeted repairs to these exact defects. Do not rebuild the site or add unrelated features. Preserve the current homepage visual identity, database-backed map, parcel designer, owner allocation, source-review pipeline and existing useful authorization/conservation/provider boundaries.

## Working boundaries

- Before editing, preserve a recoverable snapshot and consistent database archive. Coordinate file ownership with any concurrent editor. Never reset, reseed, purge or replace the usable database to make tests pass. Keep every fixture and destructive test operation in a named disposable database and preferably a copied backend/storage directory.
- Do not expose credentials, raw NIDs, private source documents or tokens in screenshots, reports or public logs.
- Do not change account passwords, silently grant new roles/access, disable permission safeguards, weaken TLS/robots checks, deploy externally, submit government applications or make actual payments.
- Correct sensitive behavior at the server/controller/service boundary; hiding a button is insufficient. Preserve role and office scope, independent review, atomic writes, idempotency and ownership/area conservation. A platform administrator's operational support powers must not manufacture citizen consent or bypass competent ownership approval.
- Treat unconfigured government/biometric/payment connections as unavailable. Never activate simulated providers in service mode just to complete an E2E demonstration. Any operator-held credentials, physical device, dataset license or government approval dependency must remain an explicit blocker.

## First: identity privacy and unauthorized legal-case writes

**A01 — Lawyer case filing:** `backend/routes/api.php` sends POST `/lawyers/file-case` and its alias directly to `LawyerPortalController::fileCase` without authentication. A public bar number alone creates an attributed OPEN dispute. Implement authenticated lawyer/account binding, active authorization, legitimate matter/party/scope checks and required evidence. Distinguish unreviewed allegation intake from an enforceable restriction. Do not allow an anonymous or unrelated account to freeze/obstruct another plot by asserting a court order. Preserve legitimate complaint intake and review rather than deleting dispute protection.

Acceptance: anonymous filing returns 401; unrelated citizen/lawyer cannot impersonate another registered advocate; neither attempt changes disputes or plot/transfer state. A properly authorized submission enters a truthful review lifecycle. Only the competent authorized decision can impose the relevant enforced hold, with evidence and history.

**A02 — Lawyer lookup privacy:** anonymous POST `/lawyers/verify` currently returns full NID, phone and email. Return only the minimal non-sensitive public verification result, or require appropriate authentication for private fields. Restrict and audit sensitive lookup; add sensible enumeration protection. A bar/license identifier is not a login credential.

**A19 — Public plot/geography privacy:** `WorkflowController::listLocations` SELECTs `p.*`; `/plots` reuses it. After an owner legitimately locks a plot, anonymous responses disclose `locked_by_nid`, together with internal fields. Replace raw-table responses with explicit public DTOs. Retain legitimate lock status and public map references, but exclude identity, internal notes and internal actor metadata. Do not rely on initially NULL private columns.

**A20 — Staff person-directory privacy:** `/persons` gives any bank_officer the full persons table, including raw NID, address and parent names. Replace the `isOfficial` blanket permission with purpose-bound, role/case/office/bank scope and minimal projections. Use authorized exact lookup or a relevant matter, not a downloadable national identity directory. Do not break required scoped registrar/land-office workflows.

Acceptance for A02/A19/A20: inspect anonymous, unrelated citizen, out-of-scope bank/staff and authorized task responses; test full recursive JSON privacy, errors and downloads. No sensitive fields should escape via aliases or nested payloads. Audit evidence must not contain real raw identifiers.

## Second: land transaction correctness and truthful documents

**A03 — Wrong buyer in deed execution:** in `TransferStateMachine::advanceStepInside`, `$buyerParty` is undefined. The fallback selects the first non-seller person and can persist a deed for the wrong buyer. The audit fixture selected buyer 42 but persisted buyer 1 with HTTP 200 and an undefined-variable warning.

Load the persisted BUYER party/parties inside the execution transaction. Validate identities, roles, shares and current transfer confirmations. Use exactly those parties. Reject missing/ambiguous/ineligible parties; remove arbitrary first-person fallbacks for both buyer and seller. Preserve the competent registrar/ownership authority and cryptographic/integrity gates.

Acceptance: choose a buyer deliberately different from the first non-seller person; execute through an authorized flow and assert the persisted deed, queued mutation, later ownership result and document reference all identify the intended buyer(s). Assert no warning, no substituted party and no ownership/area inflation. Missing buyer must fail without a deed or mutation write.

**A04 — Buyer consent:** the seller/creator can currently advance step 3→4 despite a different recorded buyer. Require an authenticated confirmation from the actual buyer, or explicitly recorded valid delegation with appropriate review. Bind confirmation to parties, area, price and material terms; invalidate it after relevant changes. Never treat a seller or administrator click as the buyer's consent.

Acceptance: seller attempt is rejected without changing state; intended buyer confirmation succeeds only for the current terms; unrelated citizens are rejected; term edits make old confirmation insufficient.

**A05 — Co-owner/evidence gates:** at step 5→6 any nonempty `notes_bn` substitutes for consent evidence. Define the transaction-specific co-owner/heir authorization requirements, then enforce persisted eligible actors, evidence, shares and versions. Do not use arbitrary notes or client booleans as proof. Review the adjacent sensitive transition gates for the same error. Biometric evidence, when an authorized provider exists, must bind the required parties to the current transaction/terms and current valid challenge; counting any historic MATCH row is insufficient.

Acceptance: missing consent, notes-only consent, stale/wrong-party evidence and conflicting terms are rejected with zero side effects. Valid documented authorization progresses exactly once. Do not weaken fail-closed provider behavior.

**A06 — Fake completion, PAID DCR and porcha:** backend step >=12 creates deterministic receipt/transaction identifiers and hardcodes PAID. The frontend marks that step completed and its document modal fabricates fallback identity, location, amounts and government authority. The audit reproduced a PROCESSING transfer with no deed or mutation returning PAID DCR and owner porcha; the UI simultaneously said completed and waiting for approval.

Remove step-count-based completion and all manufactured official document/payment fallbacks. Gate completion and downloadable documents on the actual persisted competent approval, valid issued-document source and verified payment evidence where applicable. Read existing fee configuration instead of asserting copied amounts. If there is no operational government connector, accurately label any supported independent application record and show the official document as unavailable. Do not claim a government signature, government paid receipt or new legal owner merely because the application computed a hash.

Acceptance: pending, returned, rejected, failed-payment and unissued-document cases never display completed/PAID/official-download-ready. The modal cannot fabricate a fallback document. Valid persisted issued evidence produces matching data and traceable issuer, amount, transaction and verification reference. Recheck vault, transfer detail, printable/downloadable document and map ownership link for consistency.

**A07 — Effective office/mouza scope:** `OfficeScopeService` tolerates a failed explicit mouza match for ac_land/sub_registry/registry, and ignores assignment-level `jurisdiction_scope_json`; transfer visibility has a separate district/upazila-only policy. Use one effective jurisdiction service for lists, detail, evidence downloads and mutations. Explicitly configured restrictions must apply. Wider competence must be declared, not inferred from a matching upazila or convenient office type.

Acceptance: two offices/mouzas inside one upazila, with an officer restricted to the first, cannot read or act on the second. Test user-specific restrictions as well as office coverage, inactive office/assignment, reassignment, regional scope and deliberate national oversight. Preserve the working opening-record maker/checker and owner-allocation boundaries.

## Third: exercise the real deployment layout

**A08 — Signing and seeding defaults:** the supplied `render.yaml` uses staging with a committed signing seed, while `backend/entrypoint.sh` attempts startup seeding. Production-only safeguards do not protect that configuration. Remove committed private signing material and make service deployments fail closed without operator-managed secure configuration. Make synthetic initialization an explicit isolated-demo/test operation, not ordinary startup behavior. Do not silently rotate existing keys or change passwords. Identify confirmed fixtures by provenance and keep user-created data; do not delete every current record.

**A09 — Missing collector assets/runtime in API image:** API builds use `backend` as context, but `SourceIntelligenceController` depends on sibling `../tools/service_sources/sources.json` and Python script. Public source context calls the missing manifest even if a separate worker exists. Package canonical source assets for both API and worker, or relocate them behind a supported packaged resource/service boundary. Declare required runtime dependencies or queue collection to the correctly packaged worker. Consolidate additive schema setup; avoid unexplained DDL/file failures during public GETs.

Acceptance: build and start the actual documented container/deployment layout against a fresh disposable service database, with synthetic seeding disabled. Public source context and guide work; admin collection uses a supported worker/runtime; missing optional connections yield explicit truthful feature status. Health/readiness must not falsely report an unavailable feature as ready. Verify persistence, permissions, rollback, restart and worker liveness. No external deployment is authorized by this prompt.

## Fourth: remaining exact reliability and usability defects

**A10 — Appointment contract:** reject invalid/non-calendar/past dates as appropriate, invalid slot/time, unsupported service type and malformed contact server-side. Never substitute default NID `9900001001`. Distinguish authenticated citizen identity from explicit guest requests. Different guests must not collide under an invented person. Validate actual office capacity/confirmation, or truthfully store REQUESTED until office acceptance. Link transfer appointment advancement to the booking record, not a free-form note/date.

Acceptance: `not-a-date`, `25:99`, invalid contact and unavailable slots cannot become BOOKED; two distinct legitimate guests are independent; concurrent capacity conflicts are safe; request/confirm/reschedule/cancel and attendance messages match persisted state.

**A11 — Registration contact:** `phone_dummy=not-a-phone` with no other identity/contact currently creates an account. Normalize and validate the supported phone/email/channel contract before persistence. Keep contact verification distinct from identity proofing; do not invent identifiers. Exercise valid and invalid registration and profile completion using disposable citizen accounts.

**A12 — Transfer identifiers/navigation:** backend uses `transfer_code`; ApplicationsPage expects `tracking_number` and displays fake `TR-<id>` codes. Use a typed consistent canonical code across creation, list, detail, copied tracking, URLs, document viewer, notifications and support lookup. Canonical-code deep links must load the case; preserve numeric-ID compatibility deliberately. Verify reload, back/forward, same-page query navigation and language switch.

**A13 — Office map destination:** OfficeLocatorPage passes `lat/lng/office_id`, but CadastralMapPage ignores them. Resolve and select the named office, validate coordinates, mark/center the actual office and preserve context, or change the link to a supported canonical destination. Do not silently substitute a mouza centroid or unrelated area. Exercise a Daudkandi office while other land is in Dhaka.

**A14 — Show-all office URL:** clearing `linkedOfficeId` only changes React state; `office_id` remains in the URL and refresh reverts to the single office. Keep canonical query and displayed filters synchronized. Verify show-all → refresh/back/forward/share.

**A15 — Administrator policy consistency:** the same early transition permits admin and rejects system_admin, although the shared middleware treats them as equivalent. Centralize shared operational capabilities and test both roles. Do not broadly grant competent land-write roles, bypass genuine party consent or remove separation of duties to fix this.

**A16 — Readiness truth:** `/identity/readiness` marks WebAuthn/FIDO2 READY without enrollment, challenge, assertion/attestation verification or passkey login implementation. Report implemented password/JWT authentication accurately. Passkeys must remain unavailable unless a genuine secure end-to-end implementation is completed and verified. Do not confuse device unlock, government identity proofing and registry counter biometrics.

**A17 — Loading/polling/scale:** AdminDashboardPage loads 26 modules every 8 seconds for all administrative roles; unrelated or unauthorized failures are turned into empty data. Legacy `/locations` and getPlots download the whole plot set. Implement role/current-tab scoped loading, honest loading/error/empty states, single-flight cancellation, hidden-tab pause/backoff, bounded server pagination/search/counts and measured indexes. Preserve the already bounded map API. Validate realistic volumes; do not claim nationwide readiness from a small fixture set. Do not expand endpoint permissions to silence 403s.

**A18 — Test assurance:** integrate the separate lawyer, sources, map, parcel-design and allocation suites into a reliable disposable harness with consistent return semantics. The lawyer suite currently treats anonymous filing as success and returns a passed-count. Correct unsafe expectations rather than merely wiring them unchanged. Add all negative/persistence/privacy/scope scenarios above. Preserve useful existing tests; do not suppress type errors, skip suites, weaken guards or rewrite assertions to match an incorrect response.

## Visual and role acceptance

After functional repairs, retain homepage typography/palette and make the citizen's main actions clear. At 390 px, important service names are truncated; administrative summaries are dense and users switch between public and GovTech OS shells. Improve labels, readable task headings, focus/error feedback and consistent navigation without a wholesale redesign. Existing measurements showed no horizontal overflow on the four tested phone views and used the same Bengali font stack; do not invent a font mismatch.

Recheck all 22 role landings and then exercise relevant actions, not just screenshots: citizen/seller, buyer, assisted service, registry maker/checker, AC Land/assistant/field role, survey maker/checker, oversight/appeals, bank maker/manager, acquisition, lawyer, support, editor/approver, moderator, auditor, admin and system_admin. Ensure every tested action preserves the correct user/office/plot/case relationships. A registration-to-transfer journey must identify the responsible actor and next action at each stage. Stop honestly at unconfigured external government/device boundaries; show availability guidance instead of simulating successful official service.

## Required handover

Provide:

1. An A01–A20 status table: FIXED, NOT REPRODUCIBLE WITH EVIDENCE, or BLOCKED EXTERNALLY. Include before/after proof and exact responsible files.
2. Meaningful automated negative and positive tests, fresh typecheck/build, actual deployment-layout result and privacy/scope assertions. Report every failure accurately.
3. Manual role/workflow matrix distinguishing tested actions from inspected landing screens, plus desktop/mobile evidence.
4. Migration/data-preservation/rollback notes and remaining deployment/government/provider/data-rights blockers.
5. A concise user-facing explanation. Do not say “fully production ready” solely because tests and screenshots pass.

Use the audit's source symbols and evidence to make the smallest correct changes. Finish one coherent high-priority repair group and prove it before broadening scope. Do not execute live destructive operations or external submissions.
