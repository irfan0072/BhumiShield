# BhumiShield recheck — 18 October 2026

**Verdict: not ready for a service launch.** This is a review of the current checkout and the site on localhost:5175, not a continuation of the previous implementation. Product source and business records were not edited during this recheck. Signing into existing test accounts necessarily refreshed their sessions/last-login metadata.

## What was checked

- Manually opened the current homepage, citizen vault, transfer entry point, support navigation, land checker, deed verification, marketplace/inquiry form, office directory/appointment form, notices, blog/reader and map.
- Signed into 21 available role accounts and inspected their landing screens. Screenshots and accessibility snapshots are in `docs/audit-evidence-2026-10-18/`. This is role-screen coverage, **not a claim that every action or permission passed**. A separate `system_admin` account was not present; no new account was created for this audit.
- Inspected administrator account creation without submitting it. Inspected inquiry and appointment forms without submitting them. Reproduced the bank address-filter error without submitting a lien.
- Checked desktop at 1280 × 900 and citizen/transfer mobile layouts at 390 × 844; restored the viewport afterward. Restored the citizen account and Bangla homepage.
- Ran fresh TypeScript verification and a Vite build into a temporary output directory. Read SQLite counts, integrity and foreign-key checks using read-only connections. Did **not** rerun seed-based backend suites against the usable database.
- Reviewed current route mapping, role provisioning, transfer gates, onboarding decisions and provider boundaries.

## Checks that passed or improved

- SQLite integrity reports `ok`; the foreign-key check returned no violations.
- The Vite bundle builds. This does not mean TypeScript validation passes.
- An existing deed lookup displays its stored signature/hash result, masked national IDs and a notice limiting verification to local records.
- Public marketplace, directory, notices and guide screens render, and their inquiry/appointment/reader dialogs open.
- Measured homepage/mobile body and controls use **Manrope / Hind Siliguri**. The remaining visual inconsistency is mainly layout, branding, scale, spacing, colours and mixed language, rather than proof that every page has a different font family.
- Preserve the existing backend controls for buyer confirmation, identity review, AC Land ownership writes, office checks on protected writes, and fail-closed provider adapters. Do not remove them to make the UI or old tests pass.

## Findings

### R01 — P1: Transfer navigation renders no application page

Reproduction: citizen vault → **Apply for Transfer**. URL becomes `/en/applications?new=1`, but only the shell/footer renders. Both desktop and mobile were reproduced. `CitizenHome.tsx` navigates to `applications`, while `App.tsx` has no corresponding route/page. The current pages directory has no ApplicationsPage. Unknown paths fall back to the homepage on route resolution.

Fix: restore/integrate a real authenticated application list, creation form, detail, parties, progress, next action and history. Connect it to the existing transfer API. Add an explicit not-found route. Test direct URLs, refresh, back/forward, language changes and the same-page query transition.

Evidence: `transfer-navigation.png`, `transfer-mobile.png`.

### R02 — P1: Citizen support and other sidebar destinations are aliases without matching content

From the blank transfer shell, **Support Tickets** returned to `/en/home` and rendered the overview, not a support conversation. Sidebar IDs include `vault`, `transfers`, `tickets`, while the citizen component renders `overview`, `plots`, `docs`, `deeds`, `disputes`. Route/subsection selection is split across the shell and pages.

Fix: establish one route/section contract and implement real ticket list/detail/reply screens using the existing `/tickets` endpoints. Each navigation item must select distinct, relevant content and survive reload.

### R03 — P1: The cadastral map is a separate hardcoded world

`CadastralMapPage.tsx` contains `ADMIN_DATA`, static parcel arrays and SVG boundaries. `BhumiApi` is imported but the parcel view does not use it. Unsupported mouzas can fall back to Birulia.

Observed contradictions:

| Item | Other current screen | Map |
|---|---|---|
| Plot 113, Birulia | Citizen: 23 decimals, unlocked | 45 decimals, locked |
| Plot 101 asking price | Marketplace: BDT 2,400,000 | BDT 4,500,000 |
| Plot 105 | Checker: 20 decimals, unlocked | 32 decimals, locked |

Fix: consume persisted parcel records and documented geometry/provenance; share identifiers and current locks/liens/listing prices across all screens. Missing geometry must have an honest unavailable state. Never draw a substitute parcel or silently change the selected mouza.

Evidence: `map-inconsistent-data.ax.txt`, `map-inconsistent-data.png`; constants near the beginning and parcel arrays in `CadastralMapPage.tsx`.

### R04 — P1: Synthetic data and official-looking content remain in the usable installation

Current database counts: **23 users, 42 persons, 60 plots, 241 ownership rows, 80 deeds, 3 mutations, 3 transfer requests, 1 ticket, 7 offices, 5 posts and 5 notices**. Homepage still displays sample deed buttons, a prefilled sample deed and seeded KPIs. Development registration preloads a shared password, synthetic NID and phone through `import.meta.env.DEV`.

The map says “NATIONAL PORTAL,” “Ministry of Land,” and uses a Ministry copyright. Seeded notices appear under a Ministry/Registration noticeboard, including an “Official Gazette” and biometric mandate. The footer's prototype disclaimer does not make these individual records sourced or official.

Fix: investigate the reseeding path; preserve and verify a full archive before any authorised clean-database switch. Keep fixtures in a named isolated testing database. Remove sample identities, presets, simulated official notices and fabricated offices from service mode. Keep legitimate source-linked guidance/reference definitions separate from business fixtures. Label local records and independent application functions accurately; use official branding only with actual authority and provenance.

### R05 — P1: Bank address filters throw at runtime; TypeScript gate fails

Fresh `tsc --noEmit` fails at `BankOfficerPage.tsx:575,579,743,747`. Both AddressCascader usages provide `onSelect`, but `AddressCascaderProps` requires `onChange`. A number-or-empty mouza ID is also assigned to string state.

Reproduction: bank officer → first jurisdiction dropdown → choose Dhaka. Browser logs **TypeError: onChange is not a function** in `AddressCascader.handleDivisionChange`.

Fix both callers using the component's actual contract and consistent ID types; prove the entire cascade works in both bank sections. Do not suppress the errors or bypass type checking.

### R06 — P1: Officer creation form cannot satisfy the backend office contract

Admin → All Users & Officers → Add New Officer/User shows a free-text “Office / Location” and no active-office selector. `handleCreateUser` sends `office_name`, not `office_id`. Backend `SystemAdminController` requires a positive `office_id` for institutional roles and creates `office_user` assignments from that ID.

The form offers only a subset of the defined roles. System-admin permissions also need a consistent decision: some routes treat admin/system_admin as equivalent while role provisioning and identity review explicitly require `admin`.

Fix: one authoritative role catalogue; active-office setup and selection; validated role/office compatibility; explicit jurisdiction assignment and review. Show backend validation messages. Verify officers created through the admin UI can sign in and see their own jurisdiction's tasks. Do not silently grant roles or substitute identities.

### R07 — P1: Survey maker/checker workspaces have no main task renderer

Survey maker and checker accounts sign in, but get the AC Land heading, unrelated counters and an empty task area. `AcLandPage` recognises `survey_batches` and `onboarding` in its state/defaults but has no corresponding `subTab === ...` renderer.

Fix: structured source-record preparation, source evidence, submitted package list/detail, validation, independent review, reasons and status history. Reuse existing onboarding APIs without presenting status-only approval as an ownership update.

Evidence: `sro_dhaka.png`, `aso_dhaka.png` and their AX snapshots.

### R08 — P1: Support, publishing and moderation roles receive generic admin modules

Support agent, content editor, content approver, moderator and auditor landing views repeat User Directory, Land Control, Policy, Ledger, Onboarding, Outbox and other admin overview cards. These are not their advertised role tasks. Dedicated support/content backend controllers exist, but matching current frontend pages/routes do not.

Fix: role-specific work queues and actions: support conversations with internal-note isolation; editor draft/edit/submit; a different approver publish/reject; listing moderation with reasons; auditor read-only inspection. Hide irrelevant capabilities and retain backend enforcement. Do not solve UI errors by broadening permissions.

Evidence: role screenshots/AX, particularly `support_agent.png`.

### R09 — P1: DC acquisition and lawyer accounts authenticate into an access-denied loop

Both existing accounts sign in successfully, then route to `home`, whose AuthGuard excludes their roles. The page says **Access Denied — Insufficient Role Privileges**. The login code's claimed fallback to citizen resources is therefore inconsistent with the guard.

Fix: explicitly implement the agreed role capability or provide an honest supported-services/availability page with public navigation and help. Never impersonate a citizen or grant another role to hide the missing feature. “My Own Dashboard” must not return to the same denial.

Evidence: `dc_la.png`, `lawyer.png`.

### R10 — P1: Backend workflow states still need real evidence gates

Static review: transfer steps 5/6/8 check role membership but do not themselves verify the claimed record/consent/appointment evidence before advancing. Later deed checks and buyer confirmation are useful but do not prove all earlier workflow claims. Assisted filing remains blocked pending an authorised citizen-assistance session. Real NID/biometric/payment/gateway adapters remain unconfigured and correctly fail closed outside isolated testing.

Fix: define and enforce each transition's persisted prerequisites, responsible actor, scope, conflict rules and output. Display guidance-only/unavailable states for unconnected services. Do not claim payment, government submission, biometrics, DCR or legal title based on a note, client boolean or step counter. Do not enable test simulators in service mode.

### R11 — P1: Generic onboarding approval can convert invalid input into approval

`OnboardingAndAppealsController::decideBatch` defaults missing/unknown decisions to `APPROVED`, exempts admin from independent-review checking, and updates a batch without requiring its prior state to be SUBMITTED or rejecting INVALID items. This is a source-code finding; no live decision was submitted during the audit.

Fix: explicit enum validation (422), valid items/evidence, appropriate checker, no self-approval, office scope, transaction and compare-and-set status; repeated/conflicting decisions return a conflict without another write.

### R12 — P1: Pending citizens cannot complete the advertised NID path in the profile UI

Registration makes NID optional and says it can be added during profile completion, but the current profile form has no NID control. The backend supports pending-user NID updates; the frontend does not expose it. Transfer creation rejects an empty NID. Identity approval also needs explicit valid-identity/evidence prerequisites rather than only flipping a flag.

Fix: a clear pending-review status and help route, a guarded way to supply/correct unreviewed identity details, duplicate checks, independent identity review and refresh. An already reviewed identity must not be freely reassigned.

### R13 — P1: Complete office scoping across reads as well as writes

OfficeScope checks exist on protected registration/mutation writes. However, `WorkflowController::listMutations` and some field-report/onboarding listing paths do not consistently filter by the caller's assigned jurisdiction. For example, field-report listing scopes FVO to their own reports but gives AC Land/UNO all rows. This is a source-code finding requiring adversarial tests with two offices.

Fix: align list/detail/download/action scope. Test cross-office and unrelated-citizen access with 403/404 and no data disclosure. Preserve AC Land-only ownership authority and bank institution isolation.

### R14 — P2: Appearance and wording are inconsistent even where fonts match

Homepage is green/white; service workspaces use a dark “Central Admin OS” shell, including for citizens. Map adds an entirely different governmental visual identity. English screens mix Bangla controls, field labels and preset values. Staff views contain duplicate sidebar/local tabs, technical labels such as L0–L3/hash lab/13-step tracker and small dense tables.

Fix: reuse homepage Manrope/Hind Siliguri tokens, green palette, headings, spacing, inputs, feedback and accessible controls. Give every role a meaningful heading, task-specific summary and plain-language next action. Keep technical proofs as optional detail. Localise shared components and avoid changing source record text merely to make it look translated.

### R15 — P2: Navigation loses context and scroll position

Footer-to-page navigation often preserves the previous page's scroll offset, so the next screen starts mid-page or near its footer. Blank application routes and subsection aliases do not round-trip reliably. Reader and review details need stable routes where users must return/share/reload.

Fix: a single route map, canonical query parameters, correct current-item state, back/forward and refresh behaviour, scroll/focus management, explicit loading/error/empty/not-found states. Mobile drawers and fixed bottom navigation must not hide actions.

### R16 — P2: Appointment confirmation is stronger than the implemented scheduling contract

The UI asks for a date but no available time. Backend assigns a default `10:30 AM` and persists `BOOKED`. It does not derive a selected slot from an office availability/capacity calendar. The directory uses generic hours and seeded contacts.

Fix: source actual availability and booking authority, or call it a local appointment request pending confirmation. Show the selected/requested slot, case/service and request history; validate office/date/slot and capacity without claiming an official booking that has not been confirmed.

### R17 — P2: Build success hides release-gate failure and a large initial payload

Vite build succeeded with an approximately **1,273.57 kB minified JS bundle (289.61 kB gzip)** and a chunk-size warning. The separate TypeScript gate still fails (R05). Previous backend logs belong to older source states and are not current acceptance evidence.

Fix: make type checking an enforced release prerequisite, run backend checks only against isolated storage, and split role/map/editor code by route after correctness is restored. Return fresh pass/fail/blocked results and exact coverage rather than “all tested.”

## Required acceptance proof after repair

Use an empty isolated test database. Bootstrap only its initial test administrator, then create officers through the admin UI and citizens through registration. Enter new synthetic source records through the actual forms; never silently reseed the usable database. Complete a reviewed opening record → seller application → separate buyer confirmation → registrar review/deed → land-office review → AC Land decision → buyer portfolio/proof/download journey. Demonstrate conservation of plot area and linkage of all outputs. Test rejection, conflict, missing evidence, duplicate submission, reload and unauthorised/cross-office requests. Exercise every advertised role's real task at desktop/mobile widths and Bangla/English. Mark unavailable real integrations and unsupported capabilities as blocked, not passed.
