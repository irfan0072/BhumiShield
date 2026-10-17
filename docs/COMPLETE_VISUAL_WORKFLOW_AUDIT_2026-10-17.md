# BhumiShield visual, role and workflow audit — 17 October 2026

**Release verdict: do not expose this version to real users.** An unauthenticated request can mark a new transfer COMPLETED; private workflow collections are publicly readable; important officer screens crash. Passing the current tests does not establish production readiness.

## Method, version and limits

This is an audit, not an implementation round. Product source and the working database were not repaired or reseeded. Synthetic accounts and records were used on a separate SQLite database and local frontend/API. No government, payment, email or SMS submission was made. No password or permission was changed.

The working source changed during inspection, so the reproducible browser pass used a frozen copy at `/private/tmp/bhumishield-complete-audit-20261017/snapshot`, frontend port 62367 and API port 62366. Source manifests, screenshots, accessibility snapshots, HTTP results and control inventories are preserved in the audit evidence directory. Antigravity must compare each finding against its newest source before editing; a later change may already resolve one.

Coverage includes all 23 seeded logins through the UI, 299 API route checks (13 per account), public pages, citizen feature tabs, registry tabs, land-office tabs, bank precheck/register views, admin feature tabs, English/Bangla typography, desktop and narrow mobile views. Repeated row controls were grouped by handler. **This is not a claim that every button on every record, every screen size, or every possible state was executed.** Physical printing, camera access, real OTP/NID/biometrics, real payments, credential changes, permission grants, external links/submissions and destructive operations were excluded. Untested paths are identified below and must remain open verification work. There are 25 prioritized findings: 1 critical, 11 high, 11 medium and 2 low.

Final source comparison found only `frontend/src/components/NavbarAndLayout.tsx` changed since the freeze. Therefore shell appearance must be rechecked on the latest working source; the cited backend/page defects were still present at that comparison. See `working-source-changes-since-freeze.json`.

## Priority findings

### F01 — CRITICAL: anonymous transfer advancement and false completion

Reproduction in the isolated database: create a new citizen transfer, then POST `/api/v1/transfers/TR-2026-000104/advance` without an Authorization header, with `{"target_step":13}`. Response: 200. Stored state changes directly from step 1 to step 13, `COMPLETED`. The UI says “DCR & New Khatian Issued” and “Biometrics: Verified.” Deeds remain 80, mutations 3, ownership rows 241 and biometric verifications 2 before and after. No actual ownership change was demonstrated; the proven failure is unauthorized case mutation and a false completed-service claim.

Cause: `backend/app/Services/TransferStateMachine.php:166`, especially line 178's fallback citizen actor and lines 182–206. The only transition check allows any higher step up to 13. Step 8 uses a mock provider; skipped stages are not checked. `frontend/src/pages/CitizenHome.tsx:228` also sends biometric/liveness booleans without capture.

Repair acceptance: anonymous 401; unauthorized role/object/office 403; non-adjacent or unsupported transition 409/422; server-owned evidence for each stage; atomic, idempotent completion tied to actual deed/mutation/ownership/output records. Never derive biometric verification from reaching a step number. Add direct HTTP regression tests, not just controller calls with supplied actors.

Evidence: `boundary-probes.json`, `anonymous-completed-transfer-visible.png` and matching AX snapshot.

### F02 — HIGH: workflow records lack authentication and object scope

Anonymous GETs return 200 for `/transfers` (4 cases at probe time), one transfer detail, `/tickets` (2), `/tickets/{known-code}` including messages/events, `/plots/1/documents` (10 items) and `/appeals` (1). Masking a national ID does not authorize disclosure of a person's complaint, documents, messages or transfer case. A second citizen's UI also lists the first citizen's transfer cases.

Locations: `TransferStateMachine.php:93,137`; `CitizenVaultAndTicketController.php:252,278`; `OnboardingAndAppealsController.php:263`. The ticket detail query returns every message without an internal-note filter. The fixture had zero internal notes, so internal-note disclosure is a **source-level risk, not a runtime-proven leak**.

Repair acceptance: explicitly separate a minimal public proof DTO from private case endpoints. Require identity and owner/party/assigned-office scope for list/detail/documents/messages/appeals. Apply equivalent scope to writes and attachments. Test anonymous, unrelated citizen, unrelated office, support and auditor paths.

### F03 — HIGH: transfer creation accepts a non-owner and invalid values

Authenticated citizen created a transfer on non-owned, mortgaged plot 6 with area -8, price -90 and deed type `INVALID`. API returned 200 and persisted area 0.01, price 0 and type INVALID. This silently transforms invalid input into a plausible case.

Location: `TransferStateMachine.php:39–91`. Citizen “New Transfer Intent” also immediately creates fixed area 5 and price 850000 with no party/terms form (`CitizenHome.tsx:245`). Its zero price displays as 850000 in the current UI due to fallback handling.

Repair acceptance: validate enums and finite positive area/price; reject invalid input instead of clamping; establish parties and authority; enforce ownership/share/encumbrance rules at the appropriate stages; show user-entered terms and persisted values accurately.

### F04 — HIGH: document upload reports success without file bytes

Document Vault → Upload Scan offers a filename text box, not a file chooser. Entering `AUDIT-no-bytes.pdf` and completing upload increases the document count from 5 to 6. No file bytes were selected. Backend fabricates a path, default byte size and hash.

Locations: `CitizenHome.tsx:300–315,1900–1940`; `CitizenVaultAndTicketController.php:118–170`. Upload authorization checks roles but not ownership of the resolved plot in this function.

Repair acceptance: actual authorized file ingestion/storage, server-computed byte hash/size, safe type/size validation, scan status, authorized download and failure feedback. Never call filename metadata an uploaded or verified document. Test another citizen's plot and missing bytes.

### F05 — HIGH: most expanded roles log into an unauthorized citizen page

`AuthPage.tsx:21–27,76` maps only citizen, sub_registrar, ac_land, bank_officer and admin; other roles fall back to home. Confirmed Access Denied for registry data officer, land assistant, field verifier, settlement maker/checker, UNO, appellate reviewer, bank manager, support agent, moderator, content editor/approver, auditor, acquisition officer and lawyer. Service-point operator enters home but its citizen property API returns 403.

Repair acceptance: a shared role-to-workspace/capability definition covering every supported role; correct login, My Workspace and My Own Dashboard destination; explicitly mark unsupported roles inactive rather than presenting a working service.

### F06 — HIGH: frontend permissions disagree with backend permissions

Manually opening the appropriate workspace sometimes gets past F05, but legacy routes still reject its data requests: registry maker → registrar deeds 403; land assistant/field/survey/UNO/appellate roles → mutation data 403; bank manager → mortgages 403; support/content/moderator/auditor → admin users 403. Screens can show empty queues instead of a permission/error state.

Locations: `frontend/src/App.tsx` workspace guards; `backend/routes/api.php:262` onward; page data loaders. Broadening all routes to all staff is not an acceptable repair. Define each capability, object and jurisdiction separately and load only data the role needs.

### F07 — HIGH: onboarding and appeals tabs crash the whole application

Registrar → Approve Staging Batches displays `(undefined)`, then throws `onboardingBatches.map is not a function`. AC Land → Appeals also displays `(undefined)` and crashes. The error boundary inaccurately describes this as a session/cache issue and offers a reset.

Cause: API methods return `{items,total}`, while these pages store the envelope as an array. Locations: `frontend/src/api/client.ts:947,957`; `SubRegistrarPage.tsx:78,950`; `AcLandPage.tsx:114–115,1414` and appeals rendering.

Repair acceptance: typed response contracts and validated adapters; loading/empty/error states; zero undefined counters; no crash with empty, populated, forbidden or malformed responses; browser tests for both tabs.

### F08 — HIGH: field reports and SLA dispatch are client-only success messages

Source-confirmed: `AcLandPage.tsx:165` sets submitted state and a report-success message without an API call. `:208` sets an SLA-sent flag and claims a directive was dispatched without persistence/delivery. Field inspection's plot choices and UNO overdue cases are hardcoded. These submit buttons were not executed in this audit; the implementation is sufficient to establish missing persistence.

Repair acceptance: persist assigned case/report/evidence/author/timestamps, sign only supported records, refresh/relogin recovery, audited escalation and honest delivery status. Otherwise label and disable as a simulation.

### F09 — HIGH: notices invent government signature assurance and PDF downloads

Notice → PDF & QR Seal claims “Cryptographically verified & signed by Government of Bangladesh,” shows a filename, 512 KB and a hash, plus a `bhumishield.gov.bd` URL. Download Notice points only to `#download-2`. No real downloadable signed PDF or government trust proof is used by this modal.

Locations: `NoticeboardPage.tsx:325,339`. The decorative QR graphic and printed URL do not establish a verified notice seal. The surrounding footer's prototype disclaimer does not correct the specific modal claim.

Repair acceptance: real document source URL/blob, version and source date; hash derived from real bytes; only state signature validity after verification against an approved trust source. Synthetic notices must be explicitly labeled. Do not invent government affiliation or domains.

### F10 — HIGH: appointment booking is not a booking

Offices → Book Appointment → synthetic details → Confirm Booking displays success. `OfficeLocatorPage.tsx:123–132` only toggles success and resets after 2200 ms; there is no booking API, slot reservation or persistence.

Repair acceptance: persisted appointment, availability checks, reference number and lifecycle, or an honest unavailable/demo state. Success must survive reload and be visible to the responsible office.

### F11 — HIGH: map-to-verification navigation renders a blank main area

Map → Audit Plot in BhumiShield changes URL to `/en/check?dag=101` but the main content is blank. Reload renders the verification page. `CadastralMapPage.tsx:1630` sends a query string as a tab key; `App.tsx:81` stores it literally, while rendering compares `activeTab === 'check'`.

Repair acceptance: structured route/navigation model; preserve plot identity and query values; test map→check, map→sale, listing→check, browser back/forward, reload, both languages and direct links. Unknown routes need a real not-found state.

### F12 — HIGH: registrar deed list is global rather than office-scoped

Gazipur registrar sees all 80 deeds, including Birulia and Panam. `RoleControlController.php:270` joins all deeds and applies only optional status/search filters, no actor/jurisdiction predicate. Raw party national IDs are selected. This is a read-scope failure; a cross-office status mutation was not attempted.

Repair acceptance: scope lists/details/exports/search and decisions consistently to authorized office and assigned cases. National oversight requires a separate explicit capability. Add Savar/Gazipur cross-office HTTP tests.

### F13 — MEDIUM: subtab state survives role changes without capability validation

After admin Direct Role Access was selected, support and auditor manual workspace navigation displayed that same Super Admin panel although their navigation offers fewer tabs. Page initializers accept shared `activeSubTab` before verifying current-role allowed tabs.

Locations: `AdminDashboardPage.tsx` allowed tabs/default initializer; `SubRegistrarPage.tsx:31`; `AcLandPage.tsx:47`. No passwordless role-switch button was executed in this audit.

Repair acceptance: clear workspace state on identity change and validate requested tabs against current capability on every render/navigation. Do not mistake hiding a menu for access control.

### F14 — MEDIUM: mutation rejection is invisible to the operator

AC Land → Details for tampered deed DL-2026-1005 → Approve & Mutate returns 422; the dialog remains with no useful visible explanation. Backend denial is correct. `AcLandPage.tsx:217` awaits the action without a catch/pending/error UX. Reconcile/dispute actions use similar patterns and fixed hearing notes.

Repair acceptance: translate structured backend reason into an accessible inline error; disable duplicate submission; collect actual decision reason/evidence; preserve inputs and never display success on failure. Test integrity, stale state, scope and network denials.

### F15 — MEDIUM: map geography and trust labels contradict real selected data

Selecting Chattogram and Go to Plot still combines that district with Birulia JL-12/plot 101 details. Map parcels are hardcoded Birulia geometry. Satellite/zoning/trust modes need explicit data-source and simulation labels; a CSS/SVG view is not evidence of a national cadastral dataset. Map footer claims a nationwide Ministry portal while site footer calls BhumiShield independent.

Locations: `CadastralMapPage.tsx` static BIRULIA_PARCELS and selected-location/detail composition. Repair: stable location/plot identifiers, real geographic relationships, explicit unavailable regions, provenance and honest mode capabilities. Do not use dag number alone as a national plot key.

### F16 — MEDIUM: listing enquiry loses plot identity and lacks a demonstrated seller workflow

Listing 201 Details → Express Interest modal shows blank dag/mouza. Synthetic enquiry submission stores a row, but source inspection found no enquiry retrieval/reply/notification interface for the owner; the toast promises owner review/notification.

Locations: `PublicSalePage.tsx` detail/enquiry state mapping; `PublicMarketplaceAndPortalController.php:190–218`; `frontend/src/api/client.ts:942`. Repair: consistent listing DTO; authenticated or verified inquiry policy, owner inbox, status/reply/notification lifecycle, accurate delivery language. Full seller-side completion remains unverified until implemented/exposed.

### F17 — MEDIUM: trust/document counters are inconsistent

Listing details show total documents 0 and verified 0 alongside a stored BS Khatian indicator. Backend vault summary's `verified_count` counts existing document types, not documents with a verified status (`CitizenVaultAndTicketController.php:111`). Citizen uploaded L1 data must not become a verified count by existence alone.

Repair acceptance: one shared status/trust-level contract and derived counts; missing/uploaded/reviewed/verified/rejected are distinct; listing cards, details, citizen vault and officer review agree after reload.

### F18 — MEDIUM: office map action does not locate the office

Office → View on Map navigates to a default Birulia map/plot rather than the selected office coordinates or marker. Repair using office ID/coordinates and an explicit unavailable state when coordinates are missing.

### F19 — MEDIUM: typography improved, but page composition remains inconsistent

Observed English content uses Manrope with Hind Siliguri fallback; Bangla uses Hind Siliguri. A sweeping font replacement is not justified by this pass. Preserve homepage typography. Remaining differences: public navigation wraps into two rows at 1280px with truncated brand text; public/citizen/staff shells use different brand treatments; map has an unrelated government-branded microsite/footer; dense staff tabs/tables and tiny metadata lack the homepage's hierarchy. Transfer stage titles truncate critical workflow descriptions.

Locations: `frontend/src/index.css:24–40`; `NavbarAndLayout.tsx`; map/staff/citizen page styles. Repair through shared tokens/components for spacing, headings, forms, buttons, badges, dialogs and tables while retaining role-specific navigation. Test 390, 768, 1280 and 1440px, 200% zoom and both languages. Existing desktop and narrow snapshots did not show document-wide horizontal overflow; that is not full responsive acceptance.

### F20 — MEDIUM: English pages contain substantial untranslated content

English public map selectors/help links, profile/demo labels, authentication guidance and many workflow statuses remain Bangla or mixed. Actual proper names may remain in Bangla, but interface instructions and status labels need deliberate localization. Repair via shared translation keys, locale-aware numbers/units/dates and tested language switching with preserved context.

### F21 — MEDIUM: unlabeled controls and incomplete dialog semantics

Control inventories show unnamed icon buttons, including modal close and refresh actions. Many inputs have visual labels but no programmatic association. Several dialogs are containers rather than accessible dialog regions. Print risk preview Escape/focus return worked; this should be the shared standard. Repair accessible names, label associations, focus trap/return, keyboard operation, error announcements, contrast and touch targets. High-contrast toggle was exercised on mobile map, but WCAG contrast compliance was not measured/certified.

### F22 — MEDIUM: demo tools remain visible where backend rejects them

Guest deed verification exposes tamper/restore simulation; guest tamper is rejected by the backend. Citizen screens expose fixed demo profiles; public pages contain seeded scenario claims. `CadastralMapPage.tsx:855` also has an empty click handler. Gate evaluator tools by environment and capability on both sides; remove no-op controls or explain unavailable functions. Production preview must have no tamper, reseed, passwordless demo entry or fake identity workflow.

### F23 — LOW: article reading depth does not match the presentation

The first blog article displays a one-sentence body despite an eight-minute reading label. Helpful voting changed to “Thank you / 1” and a repeat click did not increment again. Improve body/source/editorial completeness and calculate read time from content; retain working vote behavior.

### F24 — LOW: large initial frontend bundle

Frozen production build succeeds, but JavaScript is approximately 1,046 KB uncompressed / 248 KB gzip and Vite warns about chunks over 500 KB. Split route workspaces and optional heavy viewers. Measure actual slow-mobile loading before setting performance targets; no performance score was collected.

### F25 — MEDIUM: documentation and service-readiness claims exceed implementation

README references React 18/Laravel 11 while package/runtime inspection shows React 19 and a custom PHP router. Successful local checks do not mean real government/provider integration. Update setup/runtime documentation and publish an honest capability matrix: implemented local workflow, simulated adapter, official external link, unavailable integration. Production blockers include F01–F12 plus independently verified deployment, secure provider configuration, backups/recovery, monitoring, privacy/retention and actual authorized service integrations.

## Role and relationship audit

| Account / role group | UI login result | Important follow-up |
|---|---|---|
| citizen, rabeya | Citizen home renders | Cross-citizen transfer leakage; upload and transfer defects above |
| spo_birulia | Home renders, zero property view | Property API 403; assisted citizen consent/case workflow missing |
| registrar, registrar_gazipur | Registrar workspace | Global deed read; staging crash; precheck/fees/lineage tabs open |
| rdo_savar | Access Denied at home | Manual registrar route opens maker screen; legacy data/API denied |
| acland | AC Land workspace | Mutations render; tampered approval denied; appeals crash |
| loa_savar, fvo_savar | Access Denied at home | Manual field workspace available; field report persistence absent |
| sro_dhaka, aso_dhaka | Access Denied at home | Survey maker/checker route/data contracts need end-to-end proof |
| uno_savar, appellate_reviewer | Access Denied at home | SLA fake dispatch; appellate list contract broken |
| bank | Bank maker workspace | Existing lien precheck and register view open |
| bank_manager | Access Denied at home | Manual bank screen shows empty queue while API denies mortgages |
| support_agent, platform_moderator | Access Denied at home | Admin API mismatch; no demonstrated complete ticket triage flow |
| content_editor, content_approver | Access Denied at home | Content maker/approver lifecycle not established in UI pass |
| admin | Admin workspace and all major tabs open | Do not reuse broad admin forms as limited-role tools |
| lead_auditor | Access Denied at home | Manual admin route; stale admin tab leak; preserve read-only capability |
| dc_la, lawyer | Access Denied at home | Unsupported frontend role entries; label/inactivate or implement scope |

Required relationship invariants: user↔person identity; owner↔plot↔khatian shares; plot↔mouza↔jurisdiction; transfer↔parties↔deed↔mutation↔new ownership; document↔stored bytes↔review; maker↔checker separation; bank↔branch↔lien↔release↔NOC; dispute/appeal↔case↔stay↔sale eligibility; listing↔owner↔inquiry; ticket↔requester↔assigned staff↔private messages. Current independent endpoints and badges do not establish these chains.

## Executed coverage and open verification

| Area | Exercised | Result / remaining gap |
|---|---|---|
| Homepage / language | English/Bangla render, navigation, mobile menu | Fonts consistent; composition/localization issues |
| Marketplace | Search 101, detail, inquiry modal and synthetic submit | Blank identity and seller lifecycle gap |
| Cadastral map | Geography cascade, plot lookup, modes, objectives modal, audit crosslink, mobile/contrast | Wrong geography, blank route, unsupported authority claims |
| Check Before Buy | Negative area, valid inputs, all eight risk scenarios, print preview/Escape | Expected scenario categories; broader guarantee wording remains |
| Deed QR | Valid/unknown/tampered lookup, guest simulation denial, actual shared link | Local proof works; demo exposure; canonical URL loses original identity/hash after normalization—reload of a non-default deed still needs proof |
| Notices | List, PDF/QR modal and download target inspection | Placeholder download / false assurance |
| Blog | List/detail/helpful/repeated vote | Vote behavior passed; content depth weak |
| Offices | Locator, appointment form/success, View on Map | Fake booking and default map |
| Help | Page render/content inventory, all six FAQ accordion controls | Guidance-source/legal accuracy is not certified by opening the UI |
| Auth | Invalid login, all 23 seeded valid logins, sign-out cycles | Expanded-role routing failure |
| Citizen | Overview, lock then unlock, plots, document/ticket submit, deeds, transfers/create, disputes form, profile | No actual dispute adjudication submitted; profile password/save excluded |
| Registry | Register/held/precheck form/lineage/verifier/fees/staging tabs | Staging crash; new actual deed sealing not submitted through UI |
| AC Land | Mutation detail and tampered approval, khatian/dispute/explorer/verifier/appeals tabs | Correct integrity denial but missing feedback; valid mutation/reversal not executed through UI |
| Bank | Existing-lien collateral check, lien register/filter views | New lien/release/NOC creation not submitted through UI |
| Admin | Hash lab entry, directory, audit, settings, RBAC, catalogue, onboarding, OCR, direct-role panels | No account grants/disables, policy save, tamper, reseed or permission mutation |
| Mobile/accessibility | 390px public home/map, narrow role entry views, contrast toggle | Full keyboard/screen-reader/zoom/mobile form validation remains open |

This table prevents “button opens” from being confused with “service workflow completes.” The unexecuted positive paths must be added to Antigravity's final browser acceptance run.

## Checks that passed

- Existing backend suite: 20 domain + 29 audit regression + 6 Tier B + 6 Tier C = **61 passed, 0 failed**.
- Frozen frontend typecheck and production build passed; build warning recorded in F24.
- Invalid password rejected; onboard-list anonymous access returned 401.
- Public risk scenarios produced their expected safe/warning/high-risk categories.
- Citizen lock/unlock changed visible state and was restored in the synthetic fixture.
- Synthetic support ticket persisted; helpful vote repeat did not increment.
- Tampered mutation approval returned 422; no claim of bypassing this guard.

The existing tests miss public HTTP authorization, browser envelope errors, complete role navigation and fake-success workflows. Add focused regression tests at those boundaries.

## Evidence

See `docs/audit-2026-10-17/evidence/` for portable screenshots, AX and JSON inventories. Full temporary snapshot/database remain at `/private/tmp/bhumishield-complete-audit-20261017/`. These are synthetic test data. Source line references describe the frozen audit version and should be checked against ongoing changes.

Use the companion `ANTIGRAVITY_COMPLETE_AUDIT_REPAIR_PROMPT_2026-10-17.md` as the implementation brief. Resolve security and truthful state first, then workflow contracts, then visual polish. Do not sign off production while a critical/high finding or an explicitly unverified core completion path remains.
