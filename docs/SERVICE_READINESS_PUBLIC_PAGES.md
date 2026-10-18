# Public Pages Service Readiness Summary

This document summarizes the service-readiness changes applied to `LandingPage.tsx` and `AuthPage.tsx` to eliminate mock demo artifacts, ensure clean user input initialization, implement real query forwarding, and align role routing with `workspaceForRole`.

---

## 1. Landing Page (`frontend/src/pages/LandingPage.tsx`)

### Search & Query Forwarding
- **Real Query Navigation:** The hero search form now forwards the actual user input:
  - **Deed search:** navigates to `qr?deed_no=<encoded_deed_number>` (or `qr` if blank).
  - **Plot search:** navigates to `check?plot_id=<encoded_plot_id>` (or `check` if unselected).
- **Blank State Defaults:** 
  - `trackInput` starts empty (`''`).
  - `selectedMouza` and `selectedPlotId` start empty (`''`), eliminating automatic selection of `plot1`.
  - Dropdowns include placeholder options (`মৌজা নির্বাচন করুন` / `Select Mouza` and `দাগ নির্বাচন করুন` / `Select Plot`).
  - Plot dropdown is disabled until a Mouza is chosen.

### Removal of Demo Artifacts & Redundant Sections
- **Sample Records Removed:** Removed the four hardcoded quick preset buttons (`DL-2026-1001 (অক্ষত)`, `DL-2026-1005 (টেম্পার)`, `দাগ ১০১ (ধানমন্ডি)`, `দাগ ১০৬ (বন্ধকী দাগ)`). Replaced with clear instructional guidance text.
- **Redundant Role KPI Strip Removed:** Removed fixed/mock KPI stats counter strip (Plots, Khatians, Deeds, Mortgages, Mutations, Officers).
- **Unused 8-Scenario Array Removed:** Removed dead `coreServices` demo scenario array.
- **Demo Comparisons Table Removed:** Removed the "Manual Registry vs BhumiShield" comparison matrix.

### Role Routing via `workspaceForRole`
- Replaced the local `ROLE_ROUTE` dictionary with `import { workspaceForRole } from '../navigation'`.
- Role portal gateway clicks resolve through `workspaceForRole(targetRole) || 'unavailable'`, ensuring unsupported roles route to `'unavailable'` rather than falling back to citizen home.

### Preserved Core Elements
- Preserved Green/White theme with Manrope and HindSiliguri typography.
- Preserved dynamic bilingual service catalogue fetched from `BhumiApi.listPublicServices()` with category filter pills and official authority badges.
- Preserved the structured 3-step trust pipeline ("Complete Trust in Three Steps").
- Preserved official helpline banner (16122) and official circulars/fees links.

---

## 2. Authentication Page (`frontend/src/pages/AuthPage.tsx`)

### Blank Initial Inputs & Placeholder Sanitization
- **Blank Initial States:** All form fields start empty:
  - Login: `username` (`''`), `password` (`''`).
  - Registration: `regUsername` (`''`), `regPassword` (`''`), `regNameBn` (`''`), `regNameEn` (`''`), `regNid` (`''`), `regPhone` (`''`), `regEmail` (`''`), `regOffice` (`''`).
- **No Mock Credentials or Phone/NID Defaults:**
  - Removed dev-mode autofill (`citizen` / `demo123` / `9900001099` / `01700-000999`).
  - Replaced invented mock contact/ID values in placeholders with standard formatting hints (`01XXXXXXXXX`, `user@example.com`, `10 or 17 digit NID`).

### Role Inspection Directory Removal
- Removed the collapsible `<details>` block that displayed demo credentials and role inspection accounts (`citizen`, `registrar`, `acland`, `bank`).

### Registration Status & Account Wording
- Replaced claims of "Verified Account" with **"Create citizen account / pending identity verification"** (`নাগরিক অ্যাকাউন্ট তৈরি / পরিচয় যাচাইকরণ প্রক্রিয়াধীন`).
- Registration status badge and pending submission screen explicitly inform citizens that identity verification is pending.
- Preserved full registration pathways for both **Phone** and **Email** channels.
- Preserved profile save flow (`BhumiApi.updateProfile`).

### Robust Error Extraction
- Implemented `extractErrorMessage` to inspect:
  - `response.data.message_bn` and `response.data.message_en`
  - `response.data.detail.message_bn` and `response.data.detail.message_en`
  - String `response.data.detail` or `response.data.message`
  - Clean bilingual fallback messages.

### Role Routing via `workspaceForRole`
- Removed duplicated local `ROLE_ROUTE` dictionary and imported `{ workspaceForRole }` from `../navigation`.
- Missing roles map to `'unavailable'` instead of citizen `home`.
- Removed mock success banners for in-development roles.
