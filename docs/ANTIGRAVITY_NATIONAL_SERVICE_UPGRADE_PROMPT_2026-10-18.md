# Antigravity implementation prompt: nationwide offices and complete citizen/role services

Implement the following BhumiShield upgrades using the existing architecture. Read `docs/NATIONAL_SERVICE_AND_ROLE_AUDIT_2026-10-18.md` and its evidence folder first. Revalidate findings against current source before editing; preserve improvements already delivered. This is an implementation and acceptance task, not a dashboard decoration task.

## Outcome

A citizen residing in Dhaka with property in Cumilla must be able to identify their problem, locate the competent property-area office, submit the correct request remotely where allowed, understand exactly when/why attendance is required, respond to notices, and follow the case across authorised staff. Super Admin must administer the configured national office/staff/service network from one workspace. An administrative interface must not misrepresent control over actual government offices that have not been onboarded or integrated.

All roles must have usable task queues and connected workflows. Where lawful authority, approved provider, hardware or policy is missing, expose a specific blocked dependency and honest next step; do not substitute fake completion.

## Safety and preservation

- Verify recoverable source/database/upload backup before migrations. Keep current accounts, records, ownership history and audit events.
- No live reset/reseed, blanket deletion, external deployment, real biometric collection or actual government/payment submissions.
- Test accounts, fictional records and load datasets belong only in isolated environments. Do not copy them to the usable service.
- Respect denied commands/resources; do not bypass restrictions or change permission settings.
- Do not disable office/identity/evidence guards to satisfy stale tests. Update legitimate fixtures to model real office assignments.
- Reuse existing components/services. Do not introduce microservices or rewrite the application without a demonstrated need.

## Phase A — fix reproduced blockers first

1. **Admin overview contract:** Unify backend `counts/queues.my_actions/problematic_risky` with frontend `department_workload/queues.my_tasks/problematic` through a typed canonical response. Merge per-key defaults safely; distinguish loading, unknown, error and confirmed-zero. True aggregate totals must not be counts of LIMITed samples. Test admin and system_admin after network data arrives, reload and partial API failure.

2. **Staff transfer:** `transferOfficer` currently writes nonexistent `users.office_id` and does not update authoritative `office_user`. Establish one assignment source of truth; compatible migrations/backfill; atomic effective-dated membership changes, token revocation, case handover and audit event. Verify loss of old-office authority and acquisition of only intended new-office duties. Do not swallow audit failures on sensitive actions.

3. **Transfer journey:** Restore all required actions after step 5. Generate actions from server-validated role/case/state capabilities. Connect registry and land-office queues to the same case. Fix seller/buyer identity, plot ID vs dag number, missing fields and audit labels. Never substitute logged-in identity for a case party. Buyer confirmation must remain exclusive to the appropriate buyer. No generic “buyer confirmation” button for every early step.

4. **Editor route:** Stop mapping content_editor to the checker/notices branch. Provide a canonical maker draft/edit/submit route and independent approver review/publication route.

5. **Survey corrections:** Separate RETURNED from final REJECTED. Persist reasons, requested corrections, versioned edits and resubmission of the same case. Maker cannot approve their own batch. Required evidence/valid items, authorised checker, jurisdiction and concurrent-decision conflict protection must apply.

6. **Specialist actions:** Replace alert-only acquisition/injunction “success” and hardcoded KPIs with persisted cases, evidence, competent review and real state. If a specific action remains unimplemented, label it unavailable with a next step.

## Phase B — competent offices and staff across Bangladesh

Build a coherent office lifecycle, not just geography CRUD:

- Stable identifiers and authoritative names/parent relationships for administrative areas. Keep geography separate from service jurisdiction: settlement zones, registration areas and bank branches need not follow a single identical tree.
- Office code, type, parent/oversight relationship, verified contact/address, active period, source URL and last verification date.
- Service-specific area coverage down to applicable mouza/JL; support multiple areas per office and explicit effective dates. Resolve ambiguous overlaps without choosing the first office silently.
- Harmonise office type enums across seed data, APIs, forms and filters (`registry/sub_registry`, `bank_branch/bank`, `admin_cell/platform`). Preserve compatibility for existing records.
- Office create/edit/activate/deactivate/reorganise screens. Prevent deletion of historically referenced offices; keep aliases/history on renaming or merging.
- Staff invitation/provisioning, compatible role and office type, primary/temporary assignments, effective dates, active/inactive status, supervisor and workload handover.
- Validate officer roles against competent office/service type on frontend and backend. Existing mismatched assignments require a reviewed migration report.
- Reassignment must validate the destination office and employee, competence, status, jurisdiction and current case state. An audit trail must show previous/new responsibility and reason.
- Source-verified directory import with validation/preview/deduplication/rollback. Missing regions must show a clear coverage gap; do not invent government contact details to fill the map.

`OfficeScopeService` must use actual area/assignment/service policy rather than district/upazila string equality. Enforce the same policy on list, detail, search, counts, attachments, export and actions. Fix the reproduced Gazipur registrar reading a Savar survey batch. Test same-upazila different-office cases, different districts, regional offices, multiple assignments and transfer/expiry of staff.

Give Super Admin department/region/office filters, coverage gaps, office staffing, unassigned work, overdue cases, service availability and scoped drilldowns. Global oversight is distinct from executing a statutory decision. Administrative actions must retain the true admin identity, evidence gates, independent review and explicit authorisation.

## Phase C — “I live elsewhere and do not know my problem” citizen journey

Add a plain Bangla entry point: **“আপনার কী সাহায্য দরকার?”**

Offer understandable problems, not only department names:
- My land is not visible / link my property.
- I bought land and need mutation.
- Name, area, NID or record information differs.
- I inherited land / need the applicable joint-share process.
- My tax holding is missing or incorrect.
- I need a khatian/map/deed copy.
- I received a hearing, survey objection or correction notice.
- My application is delayed, rejected or under appeal.
- I received an acquisition notice.
- There is a court order/dispute or suspected fraud.

Store residence/contact address separately from property jurisdiction. Resolve service office from property details + service type + effective jurisdiction, not current location or nearest office. Ask for minimum necessary information; allow “আমি জানি না” and assisted triage.

Every service should explain, in plain language:
1. What it does and who decides.
2. Whether internal, an external official service, or assisted preparation.
3. Necessary documents and acceptable alternatives appropriate to the case.
4. Source-reviewed fees/rules with effective date; no invented circulars or universal fees.
5. Online steps, assigned office/person, next action and estimated service policy where verified.
6. Attendance status: not needed / required by a notice / not yet determined; who must attend, why, where, date, originals and authorised alternatives.

Do not make office attendance mandatory for all mutation cases. Use the official research sources in the audit, validate newer instructions and make attendance a reasoned case-specific notice. Conversely, do not promise that a face scan removes registration-law appearance/representation requirements. Provide lawful representative/assisted access with explicit mandate, consent and limited case scope.

Add a reviewed land-record claim/link process with office review and evidence, rather than “visit the relevant office” without identifying it. A support reply alone must not confer ownership. Give missing-coverage escalation without false routing success.

## Phase D — genuine identity/biometric capability

First publish a readiness table: implemented mechanism, provider, permitted environment, supported hardware, required approvals and unresolved dependencies.

Separate three concepts:
- Account login/security, optionally passkeys/WebAuthn.
- Identity proofing using an authorised identity source and applicable evidence.
- Case-specific counter identity/consent verification for the required transaction parties.

WebAuthn local fingerprint/face unlock does not expose biometric templates to the website and does not by itself prove official NID identity. A webcam photograph is not demonstrated liveness. A hash labelled “fingerprint” is not a person's fingerprint verification.

Implement an authorised provider adapter and officer counter UI when credentials/hardware are actually available. Include case/party/terminal/officer binding, challenge expiry, anti-replay, consent, validated provider result, signature verification and state enforcement. Verify all required parties under applicable policy, not existence of any MATCH row. Unify the duplicated simulated biometric interfaces and transfer integration.

Keep simulators confined to visibly labelled test environments. Never count deterministic 98.5% mock scores as real verification. No administrative override may fabricate a biometric match score. Model approved manual exception review as a different evidence/status path, including inability to scan, disability and provider/device failure. Protect access/retention and avoid unnecessary raw biometric storage.

Until authorised integration exists, show unavailable/assisted-office next steps and list the blocker. Do not manufacture a working-looking camera animation as completion.

## Phase E — complete role relationships

Implement and prove these linked journeys using the same durable case references:
- Citizen/authorised service point → registry maker → Sub-Registrar → land-office preparation/field review → AC Land → citizen result.
- Survey maker → checker → returned correction/resubmission or valid final decision.
- Bank officer → independent manager → lien/release/NOC → consistent parcel status.
- Citizen support → support agent → competent office referral → response/resolution/reopen.
- Content editor → independent approver → published version → correction/unpublish.
- Citizen listing → moderator → published/rejected/reported review.
- Appeal applicant → appellate review → decision → authorised follow-up office.
- Lawyer/court document intake → verified competent reviewer → approved effect; no automatic final freeze solely from unverified upload.
- Acquisition case → affected citizen notice/evidence → competent review/tracking; no simulated official compensation or issuance.
- Supervisor escalation → accountable office/employee → response and resolution.
- Auditor read-only evidence and redacted reports; Admin office/staff lifecycle and operational oversight.

Every role needs its own applicable queue, case detail, history and next action. Hide or explain forbidden actions, but enforce them server-side. Distinguish DRAFT, SUBMITTED, RETURNED, REJECTED, WITHDRAWN and completed states where appropriate; document allowed transitions, actor, prerequisites and side effects.

## Phase F — appointments and remote support

Use verified office calendars/capacity, service duration, holidays, request/office-confirmation/reschedule/cancel/attendance/no-show states and unique concurrency-safe identifiers. Bind to account/case rather than blank NID. Clarify local appointment requests versus confirmed official bookings. Include notice delivery status and failure recovery.

Support requests need optional structured property location, service/case reference, correct referral, accountable office, visible response and escalation. Preserve the already-working citizen↔support round trip and internal-note privacy.

## Phase G — national-volume data and usability

- Server-side scoped pagination/search/sort/counts; do not download the whole national parcel/office/staff history for local filtering.
- Appropriate indexes based on query plans for area, office membership, assignment, status and dates. Avoid per-row queries and truncated-sample totals.
- Load dashboard modules and route code on demand; reduce the 1.79MB main bundle. Bounded/background exports where justified; reliable retries without duplicate business operations.
- No national scale claims from the existing 60-plot dataset. Agree/document a reproducible synthetic benchmark and reference machine. Include substantial multi-region data, many offices/staff/cases, concurrent reads/decisions, latency/error rates, query plans and invariants. Benchmark data stays isolated; performance results must be measured, not invented.
- Keep homepage typography and visual tokens. Citizen pages must not appear as Central Admin OS. Prioritise “my next task” over large technical KPI blocks on mobile.
- Remove fake NID/phone fallbacks, hardcoded integrity/safety KPIs and unsupported “official certificate” claims. Define unverified login access consistently with onboarding messages.
- Plain Bangla, useful empty states, keyboard/focus support, mobile action visibility and consistent back/refresh/direct-link behaviour.

## Acceptance and delivery

Write regression tests for the reproduced API shape, transfer dead end/party mapping, staff transfer, office scope, editor navigation, correction loop and fake biometric completion. Retain separation-of-duties and jurisdiction controls. Typecheck/build and the full corrected isolated backend suite must pass.

Perform manual browser testing after data has loaded, not only initial zero-state screenshots. Create new synthetic citizens through registration and officers through the admin workflow in an isolated environment; explicitly authorised setup only. Test all roles, both admin identifiers, home/property in different districts, same-area different offices, wrong-office requests, transferred staff, returned cases, missing provider, duplicate clicks and concurrent decisions.

Provide:
1. Updated role/action/office permission matrix and state transitions.
2. Source-linked service/office coverage and known missing regions.
3. Role-by-role and journey-by-journey Passed / Failed / Blocked results.
4. Screenshots plus database/audit/next-role queue verification for each claimed end-to-end success.
5. Current test logs and actual scale measurements.
6. Migration/backup verification and remaining provider/authority/policy blockers.

Do not mark the project complete because all roles can log in, every menu has a card, or mock services return success. The stop condition is verified connected workflows for implemented services, with explicit externally blocked capabilities and no false production-readiness claim.
