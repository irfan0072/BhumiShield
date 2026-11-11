# Prompt for Antigravity: Redesign the Public Pages

Copy everything below the line into Antigravity.

---

You are a senior product designer and frontend engineer. Redesign the **public (logged-out) pages** of **BhumiShield · ভূমি সুরক্ষা**, a Bangla-first land-fraud prevention prototype for the **LandTech Innovation Hackathon 2026**. The track is "Digital Land Records, Verification & Digitization" and the focus is **P3: Catch Fraud & Double-Selling**.

The goal is a product that judges remember. It should be clear in 5 seconds, its main idea should be demonstrable in 3 minutes, and it should look trustworthy, modern and simple enough for any Bangladeshi citizen.

## 0. Project facts (read before changing anything)

**Stack and environment:**
- React 19, Vite 6, Tailwind CSS v4 (CSS-first `@theme` in `frontend/src/index.css`, no tailwind.config) and shadcn/ui (`frontend/src/components/ui/*`, Radix based).
- Other libraries: lucide-react, recharts, sonner, @tanstack/react-query, and Leaflet 1.9 (plain, no react-leaflet).
- Workspace root: `/Applications/XAMPP/xamppfiles/htdocs/landtech hackathon ` (note the **trailing space** in the folder name; always quote paths). Frontend is in `frontend/`.
- Dev servers: frontend `npm run dev` on port 5175, backend PHP API at `http://127.0.0.1:8000/api/v1`.
- Routing is a custom tab router in `frontend/src/App.tsx` (`getInitialTab()`, `setActiveTab('tab?query')`), not react-router. Keep it.
- Public layout: `frontend/src/components/NavbarAndLayout.tsx`, the `isPublicTab()` branch. It has a green government strip, a sticky top nav, a mobile dropdown and a large footer. The logged-in branches of this file belong to other teams; **do not touch them**.

**Public pages (all in `frontend/src/pages/`):**

| Tab | File | Lines | Main API / hooks |
|---|---|---|---|
| landing | LandingPage.tsx | 834 | `useSiteSettingsQuery`, `useLocationsQuery`, `useLandingStats` (in `components/publicHooks.ts`) |
| check | CheckBeforeBuyPage.tsx | 892 | `getLocations`, `getPlots`, `getPersons`, `checkBeforeBuy` → risk report (uses `ResultHeroBanner`, `KhatianChainTimeline`) |
| qr | VerifyDeedQrPage.tsx | 781 | `verifyDeedByCode`, `verifyNocByCode`, demo `tamperDeedDemo` / `restoreDeedDemo` |
| map | CadastralMapPage.tsx | 2025 | Leaflet; basemaps satellite (Esri World Imagery, the default), CARTO, OSM, dark, offline grid; `components/map/mapApi.ts`; URL params `mouza`, `q`, `lat`, `lng` |
| sale | PublicSalePage.tsx | 711 | `listListings`, `createListingEnquiry`, hierarchy filters |
| notices | NoticeboardPage.tsx | 576 | `listNotices`; has a TTS read-aloud feature |
| blog | EducationalBlogPage.tsx | 712 | `listBlogPosts`, `markBlogPostHelpful`; e-mutation guide and Faraiz inheritance simulator |
| offices | OfficeLocatorPage.tsx | 649 | `listOffices`, `createAppointment` |
| help | HelpPage.tsx | 266 | uses `components/help/*` (FAQ, glossary, fee calculator, problem triage, contact) |
| auth | AuthPage.tsx | 1279 | `login`, `register`; demo accounts list |
| notfound | NotFoundPage.tsx | 179 | — |

Global pieces: `PersistentHelpModal` (16122 helpline), floating action buttons (`lib/floatingButtons.ts`), `CitizenProductTour`, `JargonTooltip`, `FaraizCalculatorModal` and `AddressCascader`.

**Design system to reuse.** Do not invent a second one.
- `frontend/src/components/admin/kit.tsx` provides StatusBadge, StatusCode, DetailList, DetailSheet, FormDialog, Field, inputCls, ConfirmDialog, notify, EmptyState, Section and StatCard.
- `frontend/src/components/admin/README.md` holds the rules: short labels, bilingual `t(bn, en)`, slate neutrals, brand green `#006A4E`, `rounded-xl` cards, no gradients or emoji, no tiny text.
- The logged-in portals were already redesigned with these rules. The public site must feel like the **same product**: same type scale, colours, radius, badges and buttons.

**Honesty rules from the README and the Competition Rule Book. These are mandatory.**
- This is an independent student prototype. It is **not** a government portal, not an official title certificate, and not a substitute for a land-office decision. **Do not** show "Government of the People's Republic of Bangladesh • Ministry of Land" as if the site were official, and do not use the national emblem as the site logo.
- Show a small, calm, always-visible prototype note, for example in the footer and once near the hero: t('শিক্ষার্থী প্রোটোটাইপ · সরকারি সেবা নয়', 'Student prototype · not a government service').
- All data is synthetic demo data. Never invent statistics such as "10 lakh users" or "99.9% accuracy". Numbers must come from the API (`useLandingStats` / `getStatsSummary`) or be omitted.
- Do not add any scraping or bulk downloading of government websites. Do not add external analytics or trackers.

## 1. Product story the pages must tell

One sentence: **"জমি কেনার আগে ঝুঁকি জানুন"** (Know the risk before you buy land). BhumiShield checks a plot's ownership chain, double-sale, mortgage, dispute and sale-lock *before* money changes hands, and explains every result in plain Bangla.

The 3-minute judge demo path must be effortless and visible from the landing page:

1. **Check land** (`check`): pick a mouza and dag, then pick the seller. You get a risk verdict (Safe / Review / High risk) with the reasons in plain words and the CS → SA → RS → BS khatian chain.
2. **See it on the map** (`map`): a satellite view with the parcel highlighted and risk colours.
3. **Verify a deed** (`qr`): enter a deed number or scan a QR to see whether it is genuine. The demo "tamper" button then shows the hash mismatch being caught.
4. **Sign in** to the citizen or officer portals, using the demo accounts on the auth page.

## 2. Information architecture (no duplicates)

**Top nav, at most 5 items plus actions:**
- জমি যাচাই (`check`)
- ম্যাপ (`map`)
- দলিল যাচাই (`qr`)
- সেবা ও সহায়তা, a dropdown or mega menu containing: নোটিশ, ভূমি সহায়িকা (blog), অফিস খুঁজুন, বিক্রয় তালিকা (sale), সাহায্য ১৬১২২.

On the right: the language switch (বাং / EN), a "লগইন" button, and a green "জমি যাচাই করুন" button that hides on the check page.

**Mobile:** a slim header with the logo, language switch and a menu `Sheet`, plus a **bottom bar** with হোম · যাচাই · ম্যাপ · দলিল · মেনু.

**Footer:**
- Columns: Services, Help, About the prototype.
- The 16122 helpline and the prototype disclaimer.
- A data and source note.
- Keep it short; no giant link farms.

Remove duplicates: the same "services" list must not appear in the hero, the cards, the footer *and* the floating buttons. Pick one primary place for each; the footer can hold a compact copy.

## 3. Page by page

**Landing (`landing`).** Make this the showpiece. Keep it short, at most 6 sections.

1. **Hero:**
   - Headline: "জমি কেনার আগে ঝুঁকি জানুন". One sub-line, at most 12 words.
   - An **inline mini checker**: an AddressCascader for mouza, a dag input and a "যাচাই" button. Submitting it calls `setActiveTab('check?q=<dag>&mouza=<id>')`, so the main feature is usable right in the hero.
   - Beside it, on desktop, a live **satellite mini-map** of the demo mouza (Birulia, location id 1) with risk-coloured parcels. Reuse the Esri imagery and the `mapApi` data and keep it lightweight; lazy-load it.
2. **"কী কী ধরা পড়ে"** (what we catch): 6 small cards with an icon, 2–3 words and a one-line example. The six are double sale, seller not owner, mortgage or lien, ongoing dispute, sale lock, and tampered deed. These are real rule codes from the backend fraud engine.
3. **How it works:** 3 steps on one line (দাগ বাছুন → বিক্রেতা বাছুন → ফলাফল দেখুন) with a short looping preview made in CSS/SVG. No video files.
4. **Live numbers:** at most 4 `StatCard`s from `useLandingStats` (plots checked, deeds verified, risks blocked, mouzas). Hide any card whose value is missing.
5. **For officers:** one compact band saying that sub-registry, AC Land and bank desks share the same records, with a "দাপ্তরিক লগইন" link.
6. **FAQ:** a shadcn `Accordion` with 5 questions at most, then the footer.

Remove decorative "ambient glow" or "bento" banners, fake badges, gradients and long paragraphs.

**Check before buy (`check`).** This is the core feature, so make it outstanding.
- A 3-step layout using shadcn `Tabs` or a stepper: জমি → বিক্রেতা → ফলাফল. It must work fully on a phone.
- Accept `?q=` and `?mouza=` from the landing hero to prefill and skip ahead. Remember that `?plot_id` in a URL routes to this page.
- **Result:**
  - A large verdict card with a semicircle gauge or a simple coloured meter: নিরাপদ / যাচাই প্রয়োজন / উচ্চ ঝুঁকি.
  - The score and a one-line summary.
  - A checklist of every rule with a pass or fail icon and a plain-Bangla reason (`JargonTooltip` for legal terms).
  - The khatian chain timeline.
  - The share balance (does the seller own enough).
  - Actions: "ম্যাপে দেখুন", "রিপোর্ট প্রিন্ট" (a clean print stylesheet that prints only the report), and "নতুন যাচাই".
- Show skeletons while loading and a friendly empty state when there is no match.

**Deed verify (`qr`).**
- One input (deed or NOC number) with Tabs for দলিল and ছাড়পত্র, plus optional camera QR scan.
  - Use `BarcodeDetector` when it exists. Otherwise show a file-upload fallback.
  - Do not add a heavy library unless it is small. If you add one, justify it.
- **Result card:** a big badge (সঠিক / পরিবর্তিত / পাওয়া যায়নি), key facts in a `DetailList`, the short hash and the QR.
- Keep the demo "tamper / restore" controls but tuck them into a small "ডেমো" popover that is clearly labelled as a demo, so the demo stays one click away without cluttering the page.
- Drop the long "treasury arch / stamp" decorations, or reduce them to one subtle header.

**Map (`map`).**
- Full-screen satellite map with a compact floating search: mouza plus dag.
- A small layer switch (স্যাটেলাইট / মানচিত্র) and a legend chip row (নিরাপদ / বন্ধক / লক / বিরোধ).
- The selected parcel opens a bottom `Drawer` on mobile and a right side panel on desktop, with a "এই জমি যাচাই করুন" button that goes to check.
- Hide officer-only tools (design, manage, tasks) when logged out. Remove clutter such as the coordinate HUD and too many overlay toggles from the default view; move them into a "আরও" menu.
- Support `?mouza=&q=` and add `&focus=1` to auto-select a single match and zoom to it.
- Performance: no layout shift, lazy-load heavy layers, and destroy the map on unmount.

**Sale listings (`sale`).**
- A clean grid of listing cards: a photo placeholder or a parcel thumbnail from the map, mouza, dag, area, price, and a **"যাচাইকৃত" badge** linking to the check result.
- Filters in a single toolbar (division, district, type, price). The enquiry form is a `FormDialog`.

**Notices and blog.**
- Both are simple lists with a category `Tabs` row and search.
- The reader opens in a `Sheet` or a clean article page. Keep the TTS read-aloud as one small button and the font size control.
- Keep the Faraiz simulator and the e-mutation guide, but present them as two tidy "tools" cards.

**Offices (`offices`).** A list next to a map showing office markers. "Book appointment" opens a `FormDialog`. Add a "আমার কাছের অফিস" option using geolocation, only when the user clicks it.

**Help (`help`).** Five sections in Tabs: FAQ, শব্দকোষ, ফি হিসাব, সমস্যা সমাধান, যোগাযোগ. Make the 16122 helpline prominent but calm. Remove the duplicate "help" entry points elsewhere so the floating help button opens this page or the existing modal, not both.

**Auth (`auth`).**
- A split layout: a simple illustration on the left (desktop only) and the form card on the right.
- Tabs for লগইন and নিবন্ধন.
- A clearly labelled "ডেমো অ্যাকাউন্ট" collapsible listing the demo roles. Clicking a role fills in the username; the password is `demo123`. This lets judges switch roles fast.

**404.** Friendly and short, with 4 shortcut buttons and a search.

## 4. Visual and interaction quality ("winning" polish)

- **Typography:** Bangla first, using the current "Noto Sans Bengali" / "Hind Siliguri" stack. Use a clear scale: hero 40–48px desktop / 28–32px mobile, then 20, 16, 14 and 12px. Line-height 1.5 for Bangla. Never go below 12px.
- **Colour:** white and slate-50 surfaces, slate text, brand `#006A4E` for primary elements, and emerald, amber and rose only for status. Keep contrast at WCAG AA or better.
- **Layout:** max-w-6xl content, generous but not wasteful spacing, consistent 8px rhythm, `rounded-xl` cards, 1px slate-200 borders, very soft shadows.
- **Motion:** subtle only. A 150–250ms fade or slide on section enter, a gauge needle animation on the risk result, and parcel highlight pulses. Respect `prefers-reduced-motion`.
- **Microcopy:** 1–3 word labels, at most one helper line, no jargon without a `JargonTooltip`, and every Bangla string paired with English through `t()`.
- **States:** every async view needs a skeleton, an empty state and an error toast (`notify.err`); no inline red walls of text.
- **Accessibility:**
  - Keyboard navigable, with visible focus rings.
  - `aria-label` on icon buttons.
  - Map controls usable by keyboard.
  - Tap targets of at least 40px.
  - A skip-to-content link.
- **Performance:**
  - Lazy-load the map and recharts.
  - Images get width and height set and are lazy-loaded.
  - Avoid long main-thread work on landing.
  - Target a Lighthouse score of 90 or more for Performance, Accessibility and Best Practices on landing and check, mobile profile.
- **SEO and share:**
  - Per-page `document.title`.
  - Meta description, and Open Graph tags in `index.html` (title, description, a simple OG image generated as SVG/PNG in `public/`).
  - `lang` attribute synced to bn or en.
- **Print:** the check report and the deed verification result print cleanly on A4. A print stylesheet already exists in index.css; extend it.

Use shadcn blocks and components: `navigation-menu` (add it if missing), `sheet`, `drawer`, `tabs`, `accordion`, `card`, `badge`, `tooltip`, `dialog`, `command` (a Ctrl+K "খুঁজুন" for public pages is a nice touch), `toggle-group`, `skeleton` and `chart`. Add any missing primitive with `npx shadcn@latest add <name>` and keep the current style tokens.

## 5. Constraints

- Keep every working API call and payload. If something is broken (wrong field or shape), fix it on the frontend and list it in your report.
- Do not edit: logged-in shells and pages (`components/admin/*` except reading the kit, `components/officials/*`, `pages/admin/*`, `pages/acland/*`, `pages/registrar/*`, `pages/bank/*`, `pages/specialist/*`, `pages/lawyer/*`, the citizen portal files), `api/client.ts`, or the backend.
- Large files (`CadastralMapPage.tsx`, `AuthPage.tsx`, `LandingPage.tsx`) may be split into folders such as `pages/landing/`, `pages/check/` and `pages/map/`. Keep the default exports and names that `App.tsx` imports.
- No new heavy dependencies without a reason; prefer CSS/SVG for illustrations.
- Bangla is the default language; every screen must also work in English.

## 6. Verify before you say "done"

1. In `frontend/`, run `npx tsc --noEmit` and `npx vite build`. Both must pass with no new errors.
2. Start the app (`npm run dev`, backend on 8000) and check every public route at **1440×900** and **390×844**: `/bn`, `/bn/check`, `/bn/qr`, `/bn/map`, `/bn/sale`, `/bn/notices`, `/bn/blog`, `/bn/offices`, `/bn/help`, `/bn/auth`, a 404 URL, and the same routes in `/en`. Take screenshots, look at them, and fix anything misaligned, cramped or empty.
3. Run the judge demo path end to end:
   - landing hero mini-check, then the check result, then "ম্যাপে দেখুন", then the deed verify demo with tamper, restore and verify;
   - log in with a demo account.
4. Check that there are no console errors, no HTTP ≥400 (other than intentional "not found" tests), no horizontal scroll on mobile, and that the prototype disclaimer is visible.
5. Run Lighthouse in mobile mode on landing and check, and report the scores.

**Final report:**
- Files changed or created.
- Before/after screenshots for landing, check, qr and map.
- Lighthouse scores.
- Any API or payload fixes.
- A suggested 3-minute demo script, step by step, with which demo data to use (mouza, dag and deed number that show a High-risk case and a Safe case).
