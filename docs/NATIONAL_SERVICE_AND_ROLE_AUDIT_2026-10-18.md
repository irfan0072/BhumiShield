# BhumiShield: nationwide offices, remote citizens, identity and role workflow audit

Audit date: 18 October 2026. Verdict: **not ready for nationwide service delivery**.

## Scope and evidence

Reviewed the current local homepage at port 5175, then tested a frozen source snapshot against a consistent copy of the current SQLite database. Isolated frontend: `127.0.0.1:5188`; API: `127.0.0.1:8058`. Snapshot and disposable databases: `/private/tmp/bhumishield-national-audit-20261018/`. No product repairs, main database reset, live government submission, real biometric capture, or external deployment were performed.

Created one synthetic citizen through the UI, without NID/phone, using an example.invalid email. Exercised citizen → support → citizen reply; seller → buyer → seller transfer handoff; survey maker → checker → maker correction handoff. Inspected workspaces for all 22 authenticated role identifiers, including both admin and system_admin, and additional buyer/new-citizen accounts. Inspected officer creation form without provisioning new security access. Read source/schema and ran isolated backend probes for office boundaries and staff transfers.

**This is not a claim that every feature passed end to end.** Transfer stopped at step 5; survey correction/resubmission stopped after rejection; specialist actions are placeholders. Other role screens were smoke-tested, not every approval/payment/export/destructive action. Cross-office probe is a direct backend test, not a browser exploit. No real fingerprint scanner, face/NID provider, massive-load benchmark, or accessibility study with actual nontechnical participants was available.

Evidence: `docs/national-audit-2026-10-18/`. Its manifest records source hashes matching the tested snapshot. Main database still has 25 users, 7 offices, 60 plots, 7 transfers, 7 survey batches and 8 tickets; the new audit user is absent from it. Test writes remained isolated.

## 1. Official service research: why the land's area matters

Residence and property location must be separate. Living in Dhaka does not automatically move responsibility for Cumilla land to a Dhaka office. Equally, involvement of the Cumilla office does not mean a physical visit is always required.

Sources below establish different functions for registration offices, AC Land offices, union land offices, settlement offices and district record rooms. A nearby digital centre can assist with submission without acquiring the competent office's decision-making authority.

| Citizen problem | Responsible service/office and attendance distinction | Current project coverage | Required upgrade |
|---|---|---|---|
| Purchased land needs mutation; application is pending | Property-area AC Land process; online filing/tracking is available. Correct documents need not automatically trigger a hearing. [S1, S2] | Transfer/mutation components exist, but fresh browser transfer stalls at step 5 | Separate mutation service journey; property-based routing, reasons for delay, case owner and next action |
| Name, NID, area, classification or documents do not match | Relevant reviewing office requests clarification/evidence; hearing may be necessary for a particular discrepancy. [S1] | General support and record review exist; no clear citizen correction/notice-response journey demonstrated | Structured deficiency notice, requested document, deadline, online reply, review and reasoned decision |
| Inherited property / joint interests | Mutation guidance requires applicable inheritance evidence; representative and applicant information are distinct. [S2] | HEIR choice/calculator exists; complete multi-heir case not verified | Evidence-led inheritance intake, parties/shares and applicable legal rules; do not force one calculator or document rule on every family/case |
| Holding not linked or tax information wrong | Relevant union land office verifies and reconciles submitted holding information. [S3] | Homepage points to official tax portal; no complete internal reconciliation workflow found | Link/claim request, office queue, correction, reason and status; label external tax services honestly |
| Needs old certified khatian/map | Completed survey records and ongoing draft survey records have different custodians. [S4, S5] | Vault and links exist; source retrieval/delivery not end-to-end | Record-series-aware routing, copy request tracking and delivery/collection choice where available |
| Lost deed / certified deed copy / deed search | Relevant registration record room and registration service, not a generic AC Land visit. Cumilla district's Daudkandi registration service list identifies copy/search services. [S6] | Document support tickets exist | Structured deed search/copy request with office, year/reference, required information and outcome |
| Survey draft has wrong name, boundary or share | Relevant survey stage/camp/settlement authority handles objections/appeals. [S4, S7] | Maker/checker pages now exist; correction loop incomplete | Survey stage, objection/appeal deadline, evidence, notice and return/resubmit workflow |
| Deed execution / authorised representation | Registration Act s28 determines relevant registration location; ss32–34 address presentation, identity, representatives and appearance. Do not promise home-based digital completion for every case. [S8, S9] | Transfer steps name appointment/biometrics but no complete counter journey | Correct office selection, explicit attendance requirement, required parties/originals, lawful representation and exceptional arrangements |
| Acquisition notice, ownership proof or compensation enquiry | District LA branch handles acquisition-related services. Exact charter and case notice determine documents/attendance. [S10] | LA workspace contains synthetic KPIs and alert-only action | Real LA case/notice/document/referral workflow; payment/official issuance remains integration/authority dependent |
| Court restriction, dispute, adverse decision or delay | Competent court/revenue/appeal authority differs by issue; a generic support agent cannot decide title. [S4] | Support round trip works; court action is alert-only | Triage, authenticated order intake, competent review, tracked referral/appeal and no automatic title decision from an uploaded file |

### Research sources and limits

- **S1:** [Official mutation disposal guidance, 2022 circular compilation](https://bhumipedia.land.gov.bd/uploads/PDF/Act/All_circular_-14-26_kxKEoQD.pdf): correct evidence can eliminate hearing need; union-office attendance is not required merely for information/report preparation. Specific discrepancies can require further evidence/hearing. Historical circular; check newer applicable instructions before implementation.
- **S2:** [Official mutation application instructions](https://mutation.land.gov.bd/nirdeshika): applicant/representative documents, applicable inheritance evidence, filing and online tracking/payment guidance.
- **S3:** [Online land development tax directions](https://bhumipedia.land.gov.bd/ebook/view/283): union land officer's holding verification/reconciliation responsibilities. Search-indexed official text was available; full viewer is JavaScript-only in text retrieval. Do not hardcode old deadlines without revalidation.
- **S4:** [Ministry description of land administration and office responsibilities](https://minland.gov.bd/pages/static-pages/694032b935ce18e1c0561481): registration, mutation, settlement and record-room functions. Use for functional distinctions, not as a fully current organisation chart.
- **S5:** [Official settlement portal](https://settlement.gov.bd/): distinguishes displayed draft ongoing-survey records from records handed to district administration.
- **S6:** [Daudkandi, Cumilla Sub-Registry service list](https://sr.daudkandi.comilla.gov.bd/pages/static-pages/69914381516a96d4de4116bc): deed copy/search services and record-room responsibility.
- **S7:** [Cumilla Zonal Settlement Office citizen charter](https://zso.comilla.gov.bd/pages/static-pages/6990e62e35ce18e1c0725e38): camp/settlement-office service context. Old charter; verify current contacts, stage and schedule before showing them.
- **S8:** [Registration Act 1908, place of registration, s28](https://bdlaws.minlaw.gov.bd/act-90/act-part-print-103.html).
- **S9:** [Registration Act 1908, presentation and appearance, ss32–35](https://bdlaws.minlaw.gov.bd/act-90/act-part-print-104.html). Exceptions/representation require case-specific verification; an app approval does not create legal authority.
- **S10:** [District LA citizen charter example, Tangail](https://www.tangail.gov.bd/bn/site/dcoffice_section/762c-%E0%A6%8F%E0%A6%B2-%E0%A6%8F-%E0%A6%AD%E0%A7%82%E0%A6%AE%E0%A6%BF-%E0%A6%85%E0%A6%A7%E0%A6%BF%E0%A6%97%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A6%A3-%E0%A6%B6%E0%A6%BE%E0%A6%96%E0%A6%BE): ownership-document-based LA service. This is not proof of Cumilla's current schedule or charges.

Do not turn these examples into a universal mandatory-office-visit rule. A source-linked service catalogue and case-specific notice should say **online / remote assistance / physical attendance required / not yet determined**, with reason and issuing office.

## 2. Fresh findings

### N01 — P1: Super Admin overview crashes after its data arrives

Reproduced with system_admin; reload reproduces; admin also reaches error boundary. Error: `Cannot read properties of undefined (reading 'count')` in SuperAdminOverviewQueues.

Frontend expects `queues.my_tasks`, `queues.problematic`, `department_workload` and `overdue_sla`. `SystemAdminController` returns `queues.my_actions`, `queues.problematic_risky` and `counts`. Whole-object fallback does not protect missing members. Initial zeros and “everything safe” statements are also misleading before successful checks.

Evidence: `system-admin-crash.png/.txt`; source `frontend/src/pages/admin/SuperAdminOverviewQueues.tsx:50`, `:337`, `:388`; backend `SystemAdminController.php:1940` onward. Fix one typed API contract; show honest loading/error/unknown states and correct counts, not only optional chaining.

### N02 — P1: Citizen transfer becomes a dead end at step 5

Fresh UI transfer TR-8: seller chose actual plot 113, 1 decimal, existing synthetic buyer; progressed seller steps 1–3, buyer independently confirmed step 4, seller progressed to step 5. At step 5 the action box disappears; no next action, fee preparation, appointment or actionable office handoff is shown. Transfer remains unassigned in copied DB. SubRegistrarPage and AcLandPage have no `advanceTransfer` integration for this case flow.

`ApplicationsPage.tsx:676` renders its only advance action when `current_step <= 4`; the same “buyer confirmation” wording is incorrectly used for seller steps. Seller cannot perform buyer step (correctly blocked), and buyer cannot perform seller step (correctly blocked), but UI encourages both attempts. Complete journey did **not** pass.

Evidence: `transfer-step5-dead-end.png/.txt`, `transfer-seller-cannot-confirm-buyer.txt`.

### N03 — P1: Transfer shows incorrect party/plot identities

Buyer tracker displays internal plot ID 13 as “Dag 13” for actual Dag 113. After buyer confirms, seller identity displays the currently logged-in buyer's NID; buyer NID is N/A. Source uses `created_by_nid || user?.nid` while detail response does not supply the expected top-level property. Audit history is rendered with incomplete event fields. These are display-contract bugs; no backend ownership corruption is established by this observation.

Evidence: `buyer-tracker-wrong-dag.txt`, `buyer-confirmed-wrong-seller-identity.txt`; `ApplicationsPage.tsx:770` onward. Display canonical case parties/location from response; never substitute session identity for another party.

### N04 — P1: Staff transfer fails on current schema; scope relationship is also stale

Isolated direct backend call `transferOfficer` for an existing synthetic registrar fails with SQLite `no such column: office_id`. Current users schema lacks the column written by `SystemAdminController.php:1736`. Method updates users display fields and token version, but never updates `office_user`, which is what OfficeScopeService authorises against. The latter is an additional static defect even after the immediate schema error is repaired. Audit insertion errors are swallowed.

Evidence: `officer-transfer-failure.txt`. Fix compatible schema/relationship ownership, effective-dated assignments, atomic membership/case handover and reliable audit logging. Test old-office revocation and new-office access with fresh and old sessions.

### N05 — P1: Cross-office survey detail access is allowed

Backend probe used existing Gazipur Sadar registrar. OfficeScopeService correctly says this actor cannot access the Savar plot, but `getBatch(8, actor)` returns the Savar survey batch and its item. Generic list/detail methods check a broad role set without equivalent office/case scope; decision paths reuse detail.

Evidence: `cross-office-probe.json`; `OnboardingAndAppealsController.php:22`, `:58`. Enforce jurisdiction, record type and assignment in list/detail/action/export/download/count queries. Do not remove guards to make older tests pass.

### N06 — P1: Nationwide office configuration is incomplete

Current directory has 7 offices. Geography contains 1 division, 3 districts, 3 upazilas and 3 mouzas. Search “কুমিল্লা” returns no office and no useful next step. Directory introduction and upazila choices explicitly focus Savar/Gazipur. Geography CRUD is present, but is not an office lifecycle system. Found backend office list/create endpoints; no frontend caller for `/admin/setup/offices`, and no complete office edit/deactivate/merge/service-area lifecycle demonstrated.

Office create enum uses `sub_registry`, `bank`, `platform`, whereas seeded directory uses `registry`, `bank_branch`, `admin_cell`. Officer form lists all offices regardless of role; existing AC Land account is displayed under Gazipur registry office. Positive office_id validation exists, but role/office-type compatibility is not enforced in registration code.

Evidence: `cumilla-office-missing.png/.txt`, `admin-geography.png/.txt`, `admin-user-office-form.txt`; OfficeSetupController and OfficeLocatorPage. Seven records alone do not prove an architectural capacity limit, but they do prove nationwide coverage has not been configured or verified.

### N07 — P1: Jurisdiction model is too coarse for national operations

`OfficeScopeService.php:8` joins district/upazila English strings. It ignores `mouzas_served_json`, assignment `jurisdiction_scope_json`, office type, service competence and assignment effective dates. Same-upazila offices and regional settlement offices cannot be represented reliably with this equality alone. Geography stores repeated names, not normalised administrative IDs/parent relationships.

Static finding; not every possible cross-office write was exercised. Need versioned service-specific jurisdictions, stable area IDs, office hierarchy and explicit assignment policy, preserving lawful citizen access to property outside residence.

### N08 — P1: No implemented real face/fingerprint verification found

Frontend has biometric API methods but no actual camera/liveness/scanner workflow found in searched components. ProviderManager only resolves simulated biometrics, and correctly refuses unconfigured usable/production provider. Transfer step 9 directly instantiates a second MockBiometricProvider behind the test guard; its deterministic positive score is 0.985 for ordinary nonempty synthetic NIDs. Step 10 checks existence of any MATCH, not a complete required-party/provider proof policy.

This is not evidence of real webcam, fingerprint or official NID matching. Text calling a simple sale lock “biometric” overstates its current mechanism. Do not enable simulators in service mode to close this gap.

Separate: (a) account authentication, (b) identity proofing, (c) transaction/counter consent. A passkey can use an authenticator's local verification without exposing fingerprint data to the website; that is not government identity matching. See [W3C WebAuthn](https://www.w3.org/TR/webauthn-3/).

Real implementation needs authorised provider/hardware, supported browser/terminal integration, explicit consent, case/party/terminal-bound challenges, expiry/replay protection, signed server-verifiable results, accessible alternatives and appropriately protected retention. A face photo alone is not demonstrated liveness. No real biometric data was collected in this audit.

### N09 — P1: New citizen displays invented NID/phone; onboarding text contradicts behaviour

Created citizen with blank NID/phone; copied database confirms both blank and identity unverified, active=1. Success page says login/services depend on Super Admin approval, but login succeeds into limited unverified portal. That limited access is not itself a proven security flaw; the message/policy is inconsistent.

Dashboard substitutes sample NID/phone (`CitizenHome.tsx:558`) for missing values. Shows “official health passport” wording despite prototype context. No clear land-link/claim wizard is provided; transfer says “add land to vault” while overview says visit relevant office or open ticket, without identifying competent office.

Evidence: `registration-pending.png/.txt`, `new-citizen-home.png/.txt`, `new-citizen-transfer-blocked.txt`. Remove fake fallbacks, use missing-information prompts and define access vs verified authority explicitly.

### N10 — P1: No issue-to-service-to-competent-office guided journey

For the actual Dhaka-resident/Cumilla-property scenario, project can create a generic support ticket and show official service links. It cannot resolve Cumilla office from the configured dataset. Ticket form has category/title/body but no structured property jurisdiction/case routing. No verified case-specific “why attend / which office / which documents / who attends / alternatives / appointment status” workflow found.

Need a plain-language problem finder and service intake. A generic support ticket is useful but does not constitute complete mutation, correction, certified-copy, holding or hearing service.

### N11 — P1: Survey correction is rejection with no resubmission

Fresh maker batch ONB-2026-0008 → checker review succeeds. “Return for correction / reject” saves REJECTED. Maker can inspect but cannot edit/revise/resubmit same case; sees checker decision controls instead. Maker self-approval is correctly disabled. Form's hardcoded mouza list includes Savar/Dhamrai/Ashulia rather than authoritative jurisdiction choices. Checker note is not clearly presented as an actionable correction checklist in maker detail.

Evidence: `survey-maker-submitted.txt`, `survey-checker-return.txt`, `survey-maker-return-dead-end.txt`. Separate RETURNED from REJECTED; persisted editable versions, reason and resubmit state. Earlier unsafe default decision/self-approval defects are improved: explicit decision enum, submitted-state and invalid-item checks now exist. Concurrent decision safety still needs proof.

### N12 — P1: Specialist dashboards still simulate core actions

Lawyer/DC roles now open instead of access denied. Their core injunction/acquisition action in SpecialistWorkspacePage uses only `alert('Prototype Mode...success')`; no persisted case, evidence or competent review. Several KPIs are literal constants, including decree counts and 100% integrity.

Evidence: role screenshots/text, `lawyer-detail.txt`; `SpecialistWorkspacePage.tsx:120–185`, `:328`. Restore honest availability and implement reviewable case workflows. Do not turn file upload or lawyer assertion directly into a final legal freeze.

### N13 — P1: Content editor's navigation maps to checker workspace

Content editor defaults to `notices` and clicking its editor tab still maps to `notices` via `mapLegacyToPillar`. That renders the content approver/checker branch; actual draft editor branch requires `subTab === 'content_editor'` and is unreachable through these aliases. No working fresh editor → approver journey was completed.

Evidence: `content-editor-wrong-workspace.txt`; AdminDashboardPage map at `:221` and render branches `:8509`, `:8841`. Resolve role-specific canonical routes rather than merging maker/checker labels.

### N14 — P2: Appointment is not verified office capacity/attendance management

UI now offers service type/time choices (improvement). Backend accepts date/time strings, defaults 10:30, stores BOOKED, checks only same citizen/office/day. No verified office capacity/calendar/holiday/confirmation lifecycle or official booking connector found. Blank-NID citizens collide under the same duplicate key. `COUNT(*) + constant` appointment code generation is concurrency fragile.

Do not label a local request as confirmed official attendance. Use case linkage, required attendees/originals, request/confirmed/rescheduled/cancelled/completed/no-show states, office acceptance and capacity controls.

### N15 — P2: National workload would be fetched/rendered in bulk

Static evidence: office lists and survey batches unpaginated; `/plots` obtains all locations/plots then filters in PHP; specialist downloads all plots for client-side search; geographic tree contains all locations; admin initial fetch preloads many modules; overview counts some LIMITed samples as totals. Relevant copied DB had only uniqueness indexes for several main office/case tables, with no office_user lookup index shown.

Build passed, but main JS is **1,790.06 kB minified / 385.95 kB gzip**, with chunk warning despite vendor/icons chunks. No national-volume load test was performed. Need scoped server pagination/search/counts, measured indexes/query plans, lazy modules, bounded exports and realistic performance tests. Do not claim nationwide scale from 60 plots.

### N16 — P2: Nontechnical/mobile usability is still difficult

390×844 citizen view has no measured horizontal overflow (document/body384, viewport390). Fonts use Hind Siliguri/Noto Sans Bengali; do not invent a font mismatch. But a tall identity/KPI block pushes actual services below the initial screen; technical/legal jargon, “13 steps”, repeated navigation, missing action ownership and confusing empty states impede the first task. Citizen transfer uses Central Admin OS shell while citizen homepage uses public header. A new citizen sees transfer as the primary action despite having no linked land.

Evidence: `new-citizen-mobile.png`, desktop role screenshots. This is expert heuristic inspection, not measured usability research with real citizens. Lead with “আপনার কী সাহায্য দরকার?” and a clear next task; preserve homepage visual tokens.

### N17 — P1 release gate: backend regression suite is not green

TypeScript: PASS. Vite build: PASS with bundle warning. Full backend suite was started only in copied source/databases. Initial run exposed missing migration files in the audit snapshot; copied those harness prerequisites and restarted. Product verdict does not count that harness setup error as a product defect.

Subsequent run completed first suite with **17 passed / 3 failed**; subsequent role regression tests also failed (scope/identity guards and expected status mismatches). Stopped the run after confirmed failures; no full-suite aggregate is claimed. Source: `backend-tests.log`.

Some failures can indicate outdated fixtures/expectations rather than unsafe business logic. Investigate each; do not weaken identity/office guards to obtain green results. Existing tests explicitly checking synthetic seed counts are not proof the usable service is dummy-free.

## 3. Role coverage matrix

| Role/account | Fresh coverage | Result / limit |
|---|---|---|
| citizen / new citizen / buyer | Registration; empty vault; transfer; ticket/reply; mobile | Registration persists; fake identity fallback; transfer dead-end; support round trip passes |
| service_point_operator | Signed-in home and navigation | Citizen-style empty vault; no complete consent-bound assisted filing established |
| registry_data_officer | Signed-in registry workspace | Maker wording exists; transfer handoff not connected |
| sub_registrar | Signed-in registry workspace; Gazipur backend scope probe | Counter biometric journey absent; survey cross-office detail allowed |
| land_office_assistant | Signed-in workspace | Many AC Land controls visible; full authority separation needs negative tests |
| field_verification_officer | Signed-in report workspace | Report entry present; full assignment→report→review not executed |
| ac_land | Signed-in mutation workspace | Fresh transfer did not reach this queue; approval E2E not passed |
| settlement_records_officer | Fresh record staging and submitted batch; returned case inspection | Submission succeeds; no correction/resubmit |
| settlement_checker | Fresh batch review and correction/rejection | Return stores REJECTED; required loop incomplete |
| uno_supervisor | Signed-in SLA workspace | Escalation screen present; complete escalation follow-up not executed |
| appellate_reviewer | Signed-in appeal workspace | Proper decision/notice/enforcement E2E not executed |
| bank_officer | Signed-in maker form; division filter | Previous filter crash fixed; complete lien proposal/release not executed |
| bank_manager | Signed-in checker/NOC workspace | Complete independent approval/NOC flow not executed |
| support_agent | Fresh citizen ticket, reply, changed status | Citizen receives response; competent office referral not demonstrated |
| platform_moderator | Signed-in listing workspace | Role-specific screen exists; fresh seller→moderator flow not executed |
| content_editor | Signed-in + clicked editor route | Lands on checker branch; fresh draft journey blocked |
| content_approver | Signed-in review workspace | End-to-end blocked upstream by editor routing |
| system_admin | Login, overview and reload | Overview reproducibly crashes |
| admin | Login; users, geography, officer form; isolated staff-transfer probe | Overview crashes; office provisioning incomplete; staff transfer backend fails |
| auditor | Signed-in ledger/audit screen | Read-only acceptance and export redaction not exhaustively exercised; backup button visibility differs from backend permission |
| dc_acquisition_officer | Signed-in specialist workspace | Core action alert-only, synthetic KPIs |
| lawyer_court_user | Signed-in selected parcel detail | Core action alert-only, synthetic KPIs |

## 4. Upgrade order

1. Repair current contract/route/schema blockers: admin overview, staff transfer, transfer steps/identities, editor route, survey return/resubmit.
2. Secure scoped reads/actions, stable area IDs, office/role compatibility and real office lifecycle.
3. Build remote citizen triage, land-claim/link, service-specific cases and attendance notices using sourced rules.
4. Provide explicit biometric provider readiness and a real authorised counter integration; preserve fail-closed mode.
5. Complete specialist workflows and connect every handoff with notices, queues and audit evidence.
6. Prove nationwide data handling through isolated scale/security tests and real first-time-user usability tests. Nationwide availability remains blocked until authoritative office coverage and authorised institutional integrations exist.
