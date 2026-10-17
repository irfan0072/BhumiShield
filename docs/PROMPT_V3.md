<USER_REQUEST>
# BHUMISHIELD (ভূমি সুরক্ষা) — UPGRADE PROMPT v2 (for Antigravity)

You are continuing an existing project, not starting a new one. A first version was already built from an earlier prompt. Your job is to **audit what exists, then upgrade it** to the v2 specification below. Work autonomously, state assumptions in one line, and ask questions only if something truly blocks you.

Context: LandTech Innovation Hackathon 2026 (Daffodil International University), track "Digital Land Records, Verification & Digitization". **Round 1 submission is 18 October 2026. Final is tentatively 24 October.** Scope is tiered (section 9). Do Tier A first and keep the app demo-ready after every phase.

---

## 0. FIRST: audit before you change anything

1. Read the whole repo. Write `docs/CURRENT_STATE.md`: stack and versions, folder structure, routes (API and UI), database tables, roles and how they are stored, seed scenarios, tests, what works, what is stubbed or broken.
2. Compare with this spec and write `docs/GAP_REPORT.md` with three lists: **KEEP** (already correct), **MODIFY** (exists but must change; see section 3), **ADD** (new).
3. Do **not** rewrite working code for style. Do not break the 8 seeded demo scenarios (clean sale, double sale, area exceeded, seller not owner, tampered deed, double mortgage, khatian chain break, inheritance review) or the existing tests. Keep tests green after every phase.
4. Commit in small steps with clear messages. Never rewrite git history.

---

## 1. Fixed stack (do not debate)

- **Backend: Laravel 11 (PHP 8.3), JSON API only.** Eloquent, migrations, seeders, factories, FormRequests, API Resources, Policies/Gates, queues for notifications. **Sanctum** auth. **spatie/laravel-permission** for RBAC. libsodium for Ed25519. `endroid/qr-code` for QR. `dedoc/scramble` for OpenAPI. Business logic in `app/Services/*`.
  - **If the existing backend is FastAPI (or anything other than Laravel), port it to Laravel while keeping the API contract the React app already uses.** Do this first, behind the same endpoints, then continue. Record the port in the GAP_REPORT.
- **Database: PostgreSQL + PostGIS** (for the map).
- **Frontend: React (Vite) + TypeScript + Tailwind**, React Router, TanStack Query, `react-i18next`, **MapLibre GL JS** for the map, `html5-qrcode` for scanning.
- Docker Compose for everything; `php artisan migrate:fresh --seed` for demo data; Pest/PHPUnit for tests.

**Keep every rule from the v1 prompt that is already implemented**, in particular: Bangla-first with English toggle; Bangladesh flag theme (green `#006A4E`, red `#F42A41`, amber for warnings); 18px base font, 48px touch targets, one task per screen, text-size and high-contrast controls, read-aloud button; no colour-only status (icon + Bangla word); PWA; WCAG AA contrast; rate limiting instead of CAPTCHA. New screens must follow the same design system.

## 2. Hackathon rules (still binding)

- **Dummy data only.** No real names, NIDs, phone numbers, land records, or **biometrics**. Map polygons are **synthetic**, not real cadastral data.
- No scraping or bulk download of government sites. No calls to live government systems. NID and biometric providers are **mocks** behind interfaces.
- **Never store face images or fingerprint templates**, even in demo. Camera frames stay in browser memory; store only a result record (transaction id, match yes/no, score, time, terminal id, officer id).
- README must list how to run, data used (dummy), libraries used, **AI tools used (Antigravity and others)**, and the list of changes since Round 1 once we reach the Final.
- Code must stay explainable by the two students. Comment non-obvious parts (hashing, signing, state machine, permissions).

---

## 3. MODIFICATIONS needed to the existing build (do these explicitly)

| # | Modify | Why |
|---|---|---|
| M1 | Backend framework → Laravel (if not already) | Team decision |
| M2 | Replace any simple `role` column/enum with **RBAC** (roles + permissions via spatie). Seed one demo user per role in section 4 | v2 has about 18 roles |
| M3 | **Remove every code path that writes ownership except `ApproveMutation`** (role `ac_land`). Citizens, registrar, bank, admin, support must not be able to change ownership by API or DB policy. Add a DB-level guard (trigger or restricted writer) and a test proving it | Only the authority changes ownership |
| M4 | Turn the old "register deed → mutation" flow into the **13-step transfer state machine** (section 5). Link existing deeds and mutations to `transfer_requests` in a migration; keep old demo data valid | New workflow |
| M5 | Re-check public vs citizen vs officer **masking** (section 4.3) on every endpoint and page | New tiers |
| M6 | Replace ID-based URLs with **public codes and slugs** and language prefix `/bn` `/en` (section 8). Add 301 redirects from any old URLs | Friendly URLs |
| M7 | Navigation: public nav adds Map, Sale, Notices, Blog, Offices, Help. Citizen nav: My Land, My Transfers, My Tickets, Alerts. Officer nav per role | New modules |
| M8 | Extend schema with the new tables in section 7 (do not drop existing ones) | New features |
| M9 | Add Bangla and English strings for every new screen; no hard-coded text | Bangla-first |
| M10 | Extend the seeder: offices, service points, users per role, documents with all statuses, tickets, listings, notices, blog posts, synthetic plot polygons, a few transfers at different steps | Demo |
| M11 | Update `README.md`, `docs/ARCHITECTURE.md` (Mermaid), `docs/INTEGRATION.md` (EC NID adapter, Land Service Gateway adapter, biometric provider), `docs/RULES.md`, `docs/DEMO_SCRIPT.md` (v2) | Judging |
| M12 | Tests for: ownership guard, transfer state machine transitions, permission matrix, masking, ticket SLA, listing eligibility, biometric result handling | Safety |

---

## 4. Roles, permissions and access

### 4.1 Access tiers
T0 Guest (no login). T1 Citizen (phone OTP + mock NID). T2 Officer (organisation account, role and jurisdiction scoped, 2-step code, 15-minute idle timeout, step-up auth before approvals). T3 Admin/Auditor (cannot edit land data).

### 4.2 Roles (create all; MVP depth in brackets)
`guest`, `citizen` (owner, seller, buyer, heir), `service_point_operator`, `sub_registrar`, `registry_data_officer` (maker), `ac_land`, `land_office_assistant` (maker), `field_verification_officer`, `settlement_records_officer` (maker and checker as two permission sets), `uno_supervisor`, `appellate_reviewer`, `bank_officer`, `bank_manager`, `support_agent`, `platform_moderator`, `content_editor`, `content_approver`, `system_admin`, `auditor`. Phase 2 only (create role and stub screen): `dc_acquisition_officer`, `lawyer_court_user`.

Each officer role is scoped by `office_id` and jurisdiction (division, district, upazila, mouza set). Enforce scope in Policies, not in the UI.

### 4.3 Public vs login (enforce exactly)
- **Public (no login):** deed QR/number verification (verdict, deed type, date, office, mouza + dag, short fingerprint; no names or price); ledger health counts; plot traffic-light plus flag **categories** only; map with public layers; sale listings (browse); mutation stage lookup by application number; notices; blog; offices; help and glossary; anonymous fraud report (rate-limited); OpenAPI docs.
- **Citizen (login):** full plot risk report; My Land and plot documents; ownership timeline; transfers; appointments; tickets; alerts and watchlist; access log ("who viewed my plot", by organisation); create and manage listings; express interest; watermarked PDF report with QR; revocable 7-day share link.
- **Masking:** NID last 4 only to the owner, never to others; phone never shown to others; other people's names as first name + masked rest; price only to parties and to the Sub-Registrar and AC Land on that case; banks see collateral value only.

### 4.4 Permission matrix (implement as permission names)
| Capability | Allowed | Never |
|---|---|---|
| `ownership.approve` | `ac_land` (also executes appellate/court orders) | all others |
| `deed.register` | `sub_registrar` | all others |
| `transfer.start` | verified owner(s), all co-owners consent | buyer alone, officers, bank |
| `biometric.capture` | `service_point_operator`, `sub_registrar` at a registered terminal | remote citizens for the final check |
| `khatian.enter` / `khatian.verify` | settlement maker / checker (never the same person on the same entry) | admin, citizen, bank |
| `deed_record.enter` / `deed_record.verify` | `registry_data_officer` / `sub_registrar` | others |
| `document.upload` | owner, co-owner, service point on behalf | guests |
| `document.verify` | the responsible officer | the uploader |
| `lien.prepare` / `lien.approve` | `bank_officer` / `bank_manager` | others |
| `listing.create` | verified owners, unanimous consent | buyers, officers, guests |
| `listing.moderate` | `platform_moderator`, owner (own), `ac_land` (disputed) | others |
| `ticket.triage` / `ticket.resolve_general` | `support_agent` | cannot resolve record-change tickets |
| `ticket.resolve_record` | the verifying authority, with a signed note | `support_agent` |
| `notice.draft` / `notice.publish` | `content_editor` / `content_approver` (different people) | admin without role |
| `rules.configure` | `system_admin` (versioned; never rewrites past verdicts) | officers |
| `audit.view` | `auditor`, `system_admin` (masked) | citizens see only own access log |
| delete registered records | **nobody**; corrections are amendment records | everyone |

### 4.5 Role summaries (build the screens these imply)
- **Citizen:** My Land → plot → documents; start/accept transfer; consent; book appointment at any office; track transfer and appeal; listings; tickets; alerts.
- **Service Point Operator:** identify citizen, run biometric terminal, scan and attach documents, create tickets and referrals on behalf of a citizen (after on-screen consent), print receipts, view **case-scoped** status only.
- **Sub-Registrar:** pre-registration check, counter biometric confirmation, register deed (hash, signature, QR), hold, amendment deed. Hard blocks cannot be overridden; soft flags need a written reason and a second officer.
- **AC Land:** mutation queue with 45-day countdown, packet review, notices, hearings, request documents, approve/reject with signed decision, implement court/appeal orders, resolve land tickets. **Only role with `ownership.approve`.**
- **Field Verification Officer:** field and possession report with geotag/photo (dummy), LD tax holding sync.
- **Settlement/Records Officer, Registry Data Officer, Land Office Assistant:** maker–checker data entry into a **staging area** with proof packages (section 6).
- **UNO Supervisor:** escalation dashboard, overdue cases. **Appellate Reviewer:** record appeal outcomes only for cases on appeal.
- **Bank Officer/Manager:** collateral check, certificate, lien prepare/approve/release, portfolio watch; own portfolio only.
- **Support Agent, Platform Moderator, Content Editor/Approver:** tickets, listing moderation, notices and blog.
- **Admin and Auditor:** users, roles, offices, keys, versioned rules, integrity runs, audit log, analytics. Cannot edit land data.

---

## 5. Ownership transfer workflow (13 steps, strictly enforced)

Each transfer has a code like `TR-2026-000123`. Citizens see 5 friendly stages (Start, Verify, Register, Review, Done); officers see all 13. Implement as a state machine with a `transfer_events` table (who, when, from, to, reason). Illegal transitions throw and are tested.

1. **Intent** — seller picks owned plot and share, names buyer. **Every co-owner confirms by OTP.**
2. **Buyer accepts** — login, sees the risk report, accepts.
3. **Automatic checks** — fraud rules, liens, pending mutations. Hard blocks stop here with plain Bangla reasons.
4. **Documents ready** — checklist; official documents pulled in automatically; uploads marked L1; missing item opens a ticket.
5. **Appointment** — pick **any** nearest registry office or service point and a slot.
6. **Biometric verification** — seller and buyer at the counter terminal, officer present: face + fingerprint through `BiometricProvider` (mock). Liveness challenge, one-time nonce, terminal-bound, replay-proof. After 3 failures: manual ID check with supervisor override, logged.
7. **Deed registration** — Sub-Registrar registers; hash, signature, QR. Soft flags need reason + second officer. **Registration is blocked until both biometric results are `match`.**
8. **Mutation case auto-created** and routed to the AC Land office of the plot's jurisdiction with the full packet.
9. **Field verification** — report from the Field Verification Officer.
10. **Notice and objections** — AC Land issues notice (simulated); hearing if there is an objection.
11. **Decision** — **AC Land approves or rejects** with a signed reason. Pre-conditions enforced: no open hard block, shares at most 100%, area at most plot area, biometric-verified deed present.
12. **Record updated** — ownership updated, mutation khatian and QR issued, ledger appended, all parties and watchers notified.
13. **Appeal (optional)** — rejected or objecting party appeals; the Appellate Reviewer records the outcome; AC Land implements it.

**Biometric design:** interface `BiometricProvider { verify(party, challenge): Result }`. `MockProvider` for the demo (browser camera liveness demo; a button simulates the fingerprint scanner; synthetic profiles). `EcNidProvider` is a documented placeholder for production (needs authorised access from the Election Commission, which we do not have). Store only the result record. A phone's device unlock (e.g. WebAuthn) may be a login step-up but never replaces counter verification.

**Security for all steps:** maker–checker where specified, 2-step login for officers, step-up auth before approvals, hash-chained audit log, consent logs, least privilege, break-glass access logged and flagged to the auditor.

---

## 6. Nearest-office service and production data entry

### 6.1 Home Office vs Service Point
- **Home Office** = jurisdiction responsible for the plot's records; it decides.
- **Service Point** = any land office, registry office, Union Digital Centre or approved private centre; it facilitates.
- Citizen picks the nearest Service Point (office finder: location, services, hours, appointment availability).
- Service Point **may**: identify citizen, capture biometrics, scan and attach documents, mark "original seen" (L1→L2 when authorised), submit forms, print receipts, track the case, open referrals/tickets to the Home Office.
- Service Point **may not**: decide, change records, or see plot data outside the case.
- Implement a **case-scoped access grant** (`case_access_grants`): time-limited (default 7 days), limited to one case, logged, revoked on completion.

### 6.2 Proof-backed production data entry (Tier C, but design the tables now)
Principle: no data enters production without a named authority, a proof package (dalil), and a second person verifying. Admin can never enter data.

| Record | Maker | Checker | Proof required |
|---|---|---|---|
| Khatian (CS/SA/RS/BS) | settlement records data officer | assistant settlement officer | scan, register/volume no., survey type and year |
| Mouza map / plot polygon | GIS/records officer | assistant settlement officer | sheet no., georeference |
| Registered deed | `registry_data_officer` | `sub_registrar` | deed no., book, volume, year, scan, party NIDs via EC (mock) |
| Mutation case/khatian | `land_office_assistant` | `ac_land` | case no., order sheet, notice proof |
| LD tax | `field_verification_officer` | `ac_land` (spot audit) | holding no., receipt |
| Lien | `bank_officer` | `bank_manager` | loan reference, mortgage deed reference |
| Court order | `land_office_assistant` | `ac_land` | certified copy, case no. |

Flow: batch (CSV + scans) → **staging** → checker approves or rejects with reason → publish to the ledger with a **batch hash**. Corrections are amendment records. **Document trust levels** everywhere: L3 Official, L2 Verified copy, L1 Citizen-uploaded, L0 Missing.

---

## 7. New data model (add; do not drop existing)

`offices` (type: registry, ac_land, union_land, settlement, service_point; geo point; jurisdiction), `office_user` (assignments), `appointments`, `case_access_grants`, `transfer_requests`, `transfer_parties`, `transfer_consents`, `transfer_events`, `biometric_verifications` (result only), `plot_documents` (type, status, trust_level, file path, hash, verified_by, verified_at), `document_templates` (expected documents per acquisition type), `tickets`, `ticket_messages` (public or internal), `ticket_events`, `sla_policies`, `listings`, `listing_enquiries`, `plot_geometries` (PostGIS polygon), `notices`, `notice_attachments` (hash, QR), `blog_posts`, `blog_categories`, `onboarding_batches`, `onboarding_items` (staging), `appeals` (mirror records). Public identifiers: `plot_code` (e.g. `PLT-DHK-ASH-1234`), `deed_code` (`D-8F3K2Q`), `transfer_code`, `ticket_code`, `mutation_code`, `notice_slug`, `post_slug`. **Never expose integer IDs.**

---

## 8. Feature specs

### 8.1 Citizen land documents vault
In My Land every plot is a link to `/bn/my/land/{plot_code}/documents`. The page lists, for that plot: current khatian (BS) and earlier khatians (CS, SA, RS); mutation khatian/porcha; registered deed and baya deed chain; LD tax receipts (last 3 years); mouza map sheet; heir certificate (if inherited); lien/NOC papers (if any); court order (if any). "Expected" comes from `document_templates` by acquisition type (sale, inheritance, gift, original survey).

Status chips (icon + Bangla word): ✔ Official (L3), ✔ Verified copy (L2), ⓘ Uploaded by you, pending verification (L1), ⌛ Under review, ⚠ Needs renewal, ✖ Missing.

**Missing flow:** the ✖ row has a big button "এই কাগজ নেই — সাহায্য চাই" that opens a **pre-filled ticket** (plot, document type, why expected) routed by record type: khatian → records desk, deed → sub-registry, mutation papers → AC Land, tax → union land office. Ticket status shows inline. A citizen can dispute a wrong "missing" flag (creates a ticket).

Access: owner and co-owners (by share), verified heirs, officers only within an active case, service points only within a case grant. Viewer is watermarked ("informational copy", name, date); downloads carry a QR stamp. Citizens upload (L1) but never verify. File type/size limits, virus scan stub, content hash on every upload.

### 8.2 Support ticket management
Code `TKT-2026-000045`. Created by citizens, by service points on behalf, or anonymously (fraud). Categories and routing: Missing document → record owner; Record mismatch/correction → records officer then AC Land; Mutation delay → AC Land desk then escalation; Biometric failure → service point supervisor; Suspected fraud → auditor + AC Land; Account/NID issue → support agent; Listing complaint → platform moderator; General → support agent. SLA targets (editable): first reply 1–3 days, resolution 2–30 days by category.

Status: New → Triaged → Assigned → In progress → Waiting on citizen → Resolved → Closed (auto after 7 days) → Reopened. **Escalation ladder:** union land assistant → AC Land → UNO → ADC (Revenue)/DC; auto-escalate on SLA breach (SLA clock pauses while waiting on the citizen). Features: attachments; public replies vs internal notes; canned Bangla replies; reassign across offices; merge duplicates; priority and tags; watchers; in-app + mock SMS notifications; satisfaction rating; reopen; audit trail; dashboards (open, overdue, by office, average resolution); anonymised CSV export. Support agents cannot resolve record-change tickets; those close only with the verifying authority's signed note.

### 8.3 Map module (like the ministry's mouza/plot map)
Features: base map; search by mouza, dag number or place; layer toggles (Plots, Mouza boundaries, Land type, Risk indicator, For-sale tags); tap plot → side sheet (bottom sheet on phones) with public-tier summary and buttons (Check before you buy, See documents if you own it, View listing); My Land highlighted when logged in.

**Zoom-aware sale tags:** zoom ≤ 9 → count bubbles per upazila ("১২ বিক্রয়"); 10–13 → clusters with counts per mouza; 14–16 → plot outlines with green "বিক্রয়ের জন্য" tag and area; ≥ 17 → label with dag no., area, asking price, verification badge. Tag states: green For sale (verified and clear), amber Verification in progress, grey Sale in process. Blocked listings are never shown.

Tech: PostGIS polygons (synthetic); one endpoint `GET /api/v1/public/map/features?bbox=...&zoom=...` returns aggregates or features depending on zoom; MapLibre GL JS renders; use a blank or OSM raster basemap. Keep the bundle small and handle slow networks (skeleton + retry).

### 8.4 Sale listings and the selling page
- Only verified owners can list, **all co-owners consent by OTP**. Blocked if: hard block, active lien without NOC, pending mutation, dispute flag. Expires in 90 days; edits logged; moderator can unlist.
- Never show phone numbers. Buyers send an in-app enquiry; seller approves a buyer, which starts the transfer wizard (step 1). A listing is not a legal offer; the page says payment happens only through the registry process.
- Page `/bn/sale`: public browse; filters (district, upazila, mouza, area, land type, price); list/map toggle; cards with area, land type, mouza, price, verification badge, risk verdict; detail page with map, document availability summary (counts only), **Check before you buy**, **Express interest** (login), save search with alerts, share, **Report this listing**.

### 8.5 Noticeboard (নোটিশ বোর্ড)
Public. Types: office notice, circular/policy, holiday/closure, public hearing schedule, system maintenance, fraud alert. Fields: title (bn/en), rich text body, category, scope (national, district, upazila, office), publish and expiry date, pinned/urgent, **attachments** (PDF, DOCX, images, spreadsheets) with size limit, virus-scan stub, content hash and QR stamp so a printed notice can be verified like a deed. Features: search, filters, archive, print view, share, view/download counts, urgent banner on home. Workflow: `content_editor` drafts → `content_approver` (office head) publishes; higher-level notices cascade down.

### 8.6 Blog (ব্লগ)
Public. Categories: how-to guides, fraud awareness, legal explainers, success stories, announcements. Fields: title, slug, cover image, body, tags, author, language, reading time, date. Workflow: editor drafts → approver publishes. Comments off by default; use "Was this helpful?" and a contact link. Legal explainers show reviewer name and review date. Seed 5 posts and 5 notices (with one PDF attachment each).

### 8.7 Friendly URLs
All pages prefixed `/bn` or `/en`. Examples: `/bn/verify/D-8F3K2Q`, `/bn/check/dhaka/savar/ashulia/1234`, `/bn/plots/PLT-DHK-ASH-1234`, `/bn/map`, `/bn/map/dhaka/savar/ashulia`, `/bn/sale`, `/bn/sale/{slug}`, `/bn/notices`, `/bn/notices/{slug}`, `/bn/blog`, `/bn/blog/{slug}`, `/bn/offices`, `/bn/offices/dhaka/savar`, `/bn/help/{slug}`, `/bn/my/land`, `/bn/my/land/{plot_code}/documents`, `/bn/my/transfers/{transfer_code}`, `/bn/my/tickets/{ticket_code}`, `/bn/office/mutations/{mutation_code}`, `/bn/admin/audit`. API under `/api/v1/` with the same public codes. Transliterate Bangla titles to readable Latin slugs with a short id suffix; keep old slugs and 301-redirect on rename; codes must be speakable over the phone. Use Laravel route model binding on public code or slug.

---

## 9. Priority tiers and phases

**Tier A (finish before the 18 October submission):**
- Phase 1: audit, `CURRENT_STATE.md`, `GAP_REPORT.md`; port backend to Laravel if needed; keep tests green.
- Phase 2: RBAC with all roles and seeded users; ownership guard (M3) with test.
- Phase 3: friendly URLs and language prefix with redirects; public/citizen/officer masking check.
- Phase 4: transfer state machine (all 13 steps, mock biometric, AC Land as sole approver).
- Phase 5: documents vault with statuses, missing-document flag, pre-filled ticket; basic ticket list/detail.
- Phase 6: README, docs, new 3-minute demo script, quick responsive and accessibility pass.

**Tier B (before the Final):** map with zoom-aware sale tags; sale listings and selling page; full ticket management (SLA, escalation, dashboards); noticeboard; blog; Service Point and nearest-office routing with case grants and appointments.

**Tier C (roadmap, build only the tables and a stub screen now):** staging-based data onboarding with maker–checker; appeal mirror; DC Acquisition and Lawyer roles; production EC NID adapter.

If time runs short, cut from the bottom of the tiers, never the ownership guard, the transfer state machine, the ledger/QR verification, the fraud rules, or the Bangla-first citizen screens.

## 10. Definition of done (per tier)
- `docker compose up` + `php artisan migrate:fresh --seed` yields a working app with a demo-login list per role in the README.
- All 8 original scenarios still give the same verdicts.
- A live demo shows: seller starts transfer → co-owner OTP → checks → mock biometric for both → deed registered → AC Land approves → ownership changes; and a test proves no other role can change ownership.
- Citizen sees a missing document and raises a pre-filled ticket in two taps.
- Layout verified at 360, 768 and 1280 px; Bangla default; no horizontal scroll; AA contrast.
- Tests pass: ownership guard, state machine, permissions, masking, SLA, listing eligibility.
- `docs/DEMO_SCRIPT.md` is a timed 3-minute script: problem (20s) → transfer with biometric and AC Land decision → tampered deed fails verification → missing-document ticket → map/sale (if Tier B is done).

## 11. Style
Simple, readable PHP with `declare(strict_types=1)`, typed properties and return types, PSR-12 (Laravel Pint). Small services, thin controllers. Explain non-obvious decisions in one-line comments. No unnecessary dependencies. After each phase print a 5-line status: what works, what is stubbed, how to run it.

**Begin with Step 0 (the audit) now.**
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-10-17T08:59:00+06:00.
</ADDITIONAL_METADATA>