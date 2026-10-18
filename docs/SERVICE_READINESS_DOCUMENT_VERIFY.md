# Service Readiness: Document Verification (Deed & NOC)

## 1. Executive Summary

This document details the service readiness, refactoring actions, schema corrections, and operational limits for the document verification workflow in **BhumiShield**. 

In accordance with strict operational boundaries:
- Only `frontend/src/pages/VerifyDeedQrPage.tsx` and `frontend/src/components/OfficerDeedVerifier.tsx` were modified.
- All default sample document numbers, preset quick-select rows, tamper/restore simulation commands, and fabricated government/immutability claims were purged.
- Both components now start blank and do not execute automated verification unless the URL path or query parameters explicitly provide a deed or NOC identifier.
- Deep linking (`qr?deed_no=...`, `verify/{id}?h=...`, and `noc/{code}?h=...`) is fully supported without losing document identity or cryptographic hash prefix across page reloads or language switches (Bengali/English).
- NOC (Bank No Objection Certificate) records are handled through their own dedicated schema (Bank, Branch, Borrower Name, Borrower NID, Discharged Loan Amount BDT, Release Date, Status) and are never erroneously mapped into deed properties (such as mapping loan amount to land area or branch to NID).
- Technical hashes are concealed within optional disclosures, surfacing clear status states (Success, Failure, Unknown, Loading) and explicit "What To Do Next" guidance.
- Local verification is labeled honestly without false claims of national government authority or mathematical immutability.

---

## 2. Exact Changes Implemented

### 2.1 `frontend/src/pages/VerifyDeedQrPage.tsx`

1. **State Initialization & Blank Default:**
   - Changed `useState('DL-2026-1001')` to `useState('')`.
   - Removed fallback that forced `targetCode = 'DL-2026-1001'`. The component now mounts cleanly with an empty search input and does not trigger automated API verification unless specified in the URL.
2. **Deep-Link & URL State Synchronization:**
   - Implemented `parseVerificationUrl()` to resolve:
     - Route paths: `/verify/noc/:code`, `/noc/:code`, `/verify/deed/:id`, `/verify/:id`.
     - Query parameters: `?deed_no=...`, `?noc_no=...`, `?code=...`, and optional cryptographic hash prefix `?h=...`.
     - Supports route language prefixes (`/bn/...` and `/en/...`).
   - Integrated `window.history.replaceState` on manual search and verification to sync `deed_no` or `noc_no` and `h` into URL query parameters. This guarantees that page reloads or toggling language via `useAppUI().setLang` retains the exact document identity and hash query.
   - Added `popstate` listener to synchronize state with browser Back/Forward navigation.
3. **Purged Simulation Controls & Fabricated Claims:**
   - Removed the quick-preset buttons (`DL-2026-1001`, `DL-2026-1005`, `DL-2026-1002`).
   - Removed operator drill CLI instructions (`php artisan bhumi:drill:tamper ...`).
   - Removed exaggerated statements asserting that database modifications are "mathematically impossible" or "100% immutable".
   - Replaced national government emblems and headers ("গণপ্রজাতন্ত্রী বাংলাদেশ সরকার", "ভূমি মন্ত্রণালয় • নিবন্ধন পরিদপ্তর") with honest system labeling: "ভূমি সুরক্ষা (BhumiShield) • ডিজিটাল নথি যাচাইকরণ রেকর্ড" (BhumiShield Local Document Verification Record).
4. **Dedicated NOC Schema Handling:**
   - Restructured the result payload for NOCs to retain their native attributes:
     - `bank_name_bn` / `bank_name_en` (Financing Bank)
     - `branch_bn` (Bank Branch — kept distinct, never mapped to seller NID)
     - `borrower_name_bn` / `borrower_name_en` (Borrower Name)
     - `borrower_nid` (Borrower NID — kept as actual citizen NID)
     - `loan_amount_bdt` (Settled Loan Amount in BDT — kept as currency, never mapped to land area)
     - `released_at` (Release Date)
     - `status` (`RELEASED`)
     - `mortgaged_area_decimal` (Reported as cleared mortgaged area only when present, completely separate from loan amount)
5. **Technical Hashes Optional Disclosure:**
   - Encapsulated technical hashes (`STORED_CONTENT_HASH`, `RECOMPUTED_HASH`, `ED25519_SIGNATURE`, `PREV_BLOCK_HASH`, and hash matching status) inside an HTML `<details>` disclosure with summary "কারিগরি হ্যাশ ও ক্রিপ্টোগ্রাফিক বিবরণ (ঐচ্ছিক)" / "Technical Hashes & Cryptographic Proof (Optional)".
   - Default view presents clear, uncluttered results: Hero status card, Plain Status, Document Attributes, and Actionable Guidance.
6. **Plain Outcomes & "What To Do Next":**
   - **Loading:** Shows clean spinner with contextual description.
   - **Unknown / Error (404/500):** Clear alert with actionable guidance on checking format and contacting issuing offices.
   - **Success (Verified):** Green banner with verified badge and explicit next steps (e.g. verifying physical volume and checking mutation status with AC Land).
   - **Failure (Tampered/Discrepancy):** Red banner warning against financial disbursement or mutation approval, directing parties to the Sub-Registry office.
7. **Printable Certificate Modal:**
   - Preserved `window.print()` and dynamic SVG QR rendering.
   - Replaced government headers with honest local verification labeling.
   - Certificate renders appropriate schema depending on whether the document is an NOC or a deed.

---

### 2.2 `frontend/src/components/OfficerDeedVerifier.tsx`

1. **State Initialization & Mounting:**
   - Default parameter `initialCode` updated from `'DL-2026-1001'` to `''`.
   - Initial state `deedCode` initialized from `initialCode` or URL search parameters; if empty, it starts blank.
   - Disabled automatic verification on mount when `deedCode` is empty.
2. **Purged Mock Presets & Fake Cryptographic Constants:**
   - Removed quick-select preset row (`DL-2026-1001`, `DL-2024-1001`, `DL-2025-1004`, `NOC-2026-0001`).
   - Removed hardcoded fake signatures and hashes (`'0xed25519_authentic_bank_sig'`, `'0xledger_authentic_hash'`, `'0xsha256_block_hash_verified_immutable'`).
   - All cryptographic values are now sourced exclusively from actual backend verification returns (`res.cryptographic_proof`, `res.ed25519_signature`, etc.).
3. **NOC Schema Integrity:**
   - Removed deed-property mapping hacks (`seller_nid: res.noc?.branch_bn`, `declared_value_bdt: res.noc?.loan_amount_bdt`).
   - Built a dedicated NOC metadata display rendering bank name, bank branch, borrower details, discharged loan amount in BDT, release date, and clearance status.
4. **Officer Action & Guidance Section:**
   - Added dedicated officer-level guidance banner advising reviewing officers on required manual checks:
     - For verified deeds: Check physical volume and mutation records.
     - For flagged deeds: Hold mutation and inspect physical volume immediately.
     - For verified NOCs: Proceed with registration actions subject to standard physical verification.
     - For invalid NOCs: Halt transfer until authenticated clearance from the lending branch is secured.
5. **Technical Disclosure & Certificate Modal:**
   - Enclosed cryptographic proof details within a collapsible `<details>` panel.
   - Cleaned print certificate modal of all national government authority claims, framing it transparently as a local software audit record.

---

## 3. Data Schema Matrix

| Field | Deed Record | Bank Lien Clearance (NOC) Record |
| :--- | :--- | :--- |
| **Identifier** | `deed_no` (e.g., `DL-2026-1001`) | `noc_no` (e.g., `NOC-2026-0001`) |
| **Primary Type** | `deed_type` (e.g., `SAF_KABALA`, `HIBA`) | `BANK_NOC` / `Bank Clearance` |
| **Financial Value** | `price_bdt` / `declared_value_bdt` (Sale value) | `loan_amount_bdt` / `amount_bdt` (Discharged loan BDT) |
| **First Party** | `seller_name_bn` (Seller / Grantor) | `bank_name_bn` & `branch_bn` (Financing Bank & Branch) |
| **Second Party** | `buyer_name_bn` (Buyer / Grantee) | `borrower_name_bn` & `borrower_nid` (Discharged Borrower) |
| **Land Dimension** | `area_decimal` & `share_fraction` | `mortgaged_area_decimal` (if applicable; never loan amount) |
| **Status Field** | `status` (`REGISTERED`, `PENDING_MUTATION`) | `status` (`RELEASED`) |
| **Timestamp** | `registered_at` / `created_at` | `released_at` (Release Date) |

---

## 4. Untested Limits & Operational Boundaries

1. **Physical Print Layouts Across Browsers:**
   - `window.print()` styles depend on browser-specific print rendering engines. While `@media print` rules hide UI controls and display the certificate card, user print settings (e.g., "Print Background Graphics", paper size A4 vs. Letter) can affect page breaks.
2. **API Timeout and Network Partitions:**
   - `BhumiApi` utilizes Axios with a 12-second timeout. If the backend experiences database deadlocks or network latency exceeding 12,000ms, a generic server connection error is surfaced.
3. **Public Rate Limiting and Offline Caching:**
   - Verification routes require active network connectivity to the backend service. If the server is offline or unreachable, local caching of verification proofs is not supported.
4. **Historical Legacy Deeds Without Cryptographic Signatures:**
   - Very old or legacy deed records that have not been back-filled with Ed25519 signatures will fail closed to `INVALID` / `MISMATCH` if queried directly. Officers must inspect physical volumes for such historical records.
5. **Masked NID Resolution:**
   - For public visitors (unauthenticated sessions), citizen NIDs are masked by the backend (`9900****01`). The frontend faithfully displays the masked string returned by the API; unmasking occurs only when viewed by authenticated officials with requisite RBAC permissions.
