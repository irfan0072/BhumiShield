# Prompt: Redesign the Citizen Portal

Copy everything below the line into the agent.

---

You are redesigning the **logged-in citizen portal** of a Bangladesh land-records web app (React 19 + Vite + Tailwind v4 + shadcn/ui, Leaflet maps). The super admin panel and the officials portal were already redesigned in a compact, clean style. Make the citizen portal match them and make it even simpler: the users are ordinary Bangladeshi citizens with little technical knowledge, mostly on phones.

Workspace root: `/Applications/XAMPP/xamppfiles/htdocs/landtech hackathon ` (note the **trailing space**; always quote paths). Frontend is in `frontend/`. Backend (PHP) runs at `http://127.0.0.1:8000`, frontend dev server at `http://localhost:5175`.

## 1. Read first (mandatory)

- `frontend/src/components/admin/README.md`: the design rules. Follow them exactly.
- `frontend/src/components/admin/kit.tsx` is the shared kit. Reuse it; do not create a second design system. It provides `AdminPage` (with `fill`), `PageToolbar`, `Section` (with `fill`), `StatGrid`, `StatCard`, `StatusBadge`, `StatusCode`, `DataTable` (inner scroll, edge fades, infinite batches, `hasMore`/`onEndReached`), `LoadingRows`, `EmptyRow`, `EmptyState`, `DetailList`, `DetailSheet`, `FormDialog`, `Field`, `inputCls`, `ConfirmDialog`, `notify`, `apiMessage` and `useCreateIntent`.
- `frontend/src/components/officials/OfficialWorkspaceShell.tsx` is the reference shell. It has the sidebar, Ctrl+K search, breadcrumb, language switch, account menu, mobile bottom bar, `Toaster`, and the `body.admin-mode` density class.
- Reference pages:
  - `frontend/src/pages/admin/AdminOverviewPage.tsx` for a dashboard.
  - `frontend/src/pages/acland/MutationsSection.tsx` for a list with a detail sheet and a decision dialog.
  - `frontend/src/components/OfficerKhatianExplorer.tsx` for a list next to a detail panel with the khatian chain timeline.
- The map: `frontend/src/pages/CadastralMapPage.tsx` (Leaflet, about 2000 lines) and `frontend/src/components/map/mapApi.ts`.

## 2. What exists today (facts)

**Routing** is in `frontend/src/App.tsx` (custom tab router, no react-router). The citizen tabs are `home` → `pages/CitizenHome.tsx`, `applications` → `pages/ApplicationsPage.tsx`, `profile` → `pages/CitizenProfilePage.tsx` and `settings` → `pages/CitizenSettingsPage.tsx`. All four sit behind `AuthGuard` (roles citizen, service_point_operator, admin, system_admin; profile and settings allow all roles) and render inside `components/NavbarAndLayout.tsx`.

**`NavbarAndLayout.tsx`** (about 1800 lines) has two layouts:
- A public one: government strip, top nav, footer.
- A logged-in one: a hand-made sidebar `<aside>`, a Sheet drawer on mobile, and an h-16 header with a breadcrumb and `NotificationCenter`.
- It has no bottom navigation bar on mobile.

**`CitizenHome.tsx`** is about 3480 lines in one component.
- Its sections are `overview | plots | docs | deeds | transfers | disputes | tickets`. The section is chosen through `useAppUI().activeSubTab`; the value `'vault'` maps to `plots`.
- It contains a fake `MiniSparkline` and many inline modals.
- APIs it calls:
  - `getMyVault` → `{ person, owned_plots[], deeds[] }`
  - `togglePlotSaleLock(plotId, reason_bn)`
  - `listDisputes`, `fileDispute`
  - `listTransfers`
  - `listTickets`, `getTicket`, `createTicket`, `replyTicket`
  - `requestMissingDocument`
  - raw axios calls: `POST /plots/{id}/documents`, `GET /plots/{id}/documents`, `GET /plots/{id}/documents/{doc}/download`
- Child modals: `LandHealthPassportModal`, `CitizenProblemTriageModal`, `CitizenVerificationModal`, `JargonTooltip` and `AddressCascader`.
- Map pages can pass ticket context through `?map_plot_id=&map_dag=&map_location=`, and that must keep working.

**Other citizen pages:**
- **`ApplicationsPage.tsx`** (about 1780 lines) is the 13-step land transfer. It calls `getMyVault`, `listTransfers`, `getTransfer`, `createTransfer` and `advanceTransfer`.
- **`CitizenProfilePage.tsx`** (about 460 lines) only calls `updateProfile`.
- **`CitizenSettingsPage.tsx`** (about 600 lines) calls no API; everything is local or UI-only.

**Maps:**
- Only `leaflet ^1.9.4` is installed (no react-leaflet).
- The satellite basemap already exists: Esri World Imagery, `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`, maxZoom 19, attribution `© Esri & Earthstar Geographics`. CARTO Voyager and OSM are also available.
- Plot geometry comes from three places:
  - `mapApi.workspace(location_id, q, page)` returns `{locations[] (with latitude/longitude), plots: MapPlot[] (id, dag_no, owner_sale_locked, is_admin_frozen, has_active_lien)}`.
  - `mapApi.layers(location_id)` followed by `mapApi.geometry(layerId)` returns a GeoJSON FeatureCollection whose features carry `properties.plot_id` and sometimes `dag_no`.
  - `parcelApi.list(location_id, true)` (public view) returns parcel designs with `plot_id`, `dag_no` and `geometry`.
  - The hard-coded fallback polygons are `ALL_MOUZA_CADASTRAL_PLOTS[location]` in `frontend/src/data/bangladeshGeo.ts`, matched by `dag_no`.
- The map page supports the URL params `mouza`, `q`, `lat`, `lng`. It has **no** way to focus one plot from the URL. Do **not** use `plot_id` as a URL param: `App.tsx` sends any URL containing `plot_id` to the `check` page.

**Demo logins** (password `demo123`): `citizen` (Md. Rafiqul Islam), `rabeya` (Mst. Rabeya Khatun) and `spo_birulia` (service point operator). The vault endpoint returns **403 for `spo_birulia`**, so that role needs a graceful empty or alternative state, not an error page.

## 3. Goal

Build a citizen portal where a first-time user understands everything without reading:

- Short text: labels of 1–3 words, at most one short muted hint line where needed.
- No duplicates: each feature lives in exactly one place. The dashboard must **not** repeat the menu as big tiles.
- Narrow, calm, premium layout: slate neutrals, brand green `#006A4E` only for primary or active elements, no gradients or emoji.
- Phone first: a bottom tab bar, large tap targets, a sheet or drawer for details.
- A **satellite map of the citizen's own land** as a central feature.
- Built from shadcn components/blocks plus the existing kit.

## 4. Information architecture (one place per feature)

Create `frontend/src/components/citizen/CitizenShell.tsx` modelled on `OfficialWorkspaceShell` (sidebar, Ctrl+K command search, breadcrumb, language switch, account menu, toasts, `admin-mode` density, mobile bottom bar). Use it for the `home`, `applications`, `profile` and `settings` tabs instead of the logged-in branch of `NavbarAndLayout`. Leave the public layout for public pages untouched.

Menu (sub-page ids in brackets):

| Group | Item | Content |
|---|---|---|
| — | ড্যাশবোর্ড `overview` | summary |
| আমার জমি | জমি ও ম্যাপ `plots` | list plus satellite map (main page) |
| | দলিল `deeds` | my registered deeds |
| | কাগজপত্র `docs` | porcha / khatian / uploaded documents per plot |
| আবেদন | জমি হস্তান্তর `transfers` | opens the 13-step flow (ApplicationsPage) and lists my transfers |
| | আপত্তি `disputes` | file or track disputes |
| সহায়তা | অভিযোগ ও সাহায্য `tickets` | 16122 tickets |
| — | profile, settings | live in the **account menu only**, not as menu items |

Mobile bottom bar has 5 items: হোম, আমার জমি, আবেদন, সাহায্য, মেনু.

Keep the URLs working: `/bn/home`, `/bn/home?section=…` through `activeSubTab`, `/bn/my/land`, `/bn/applications`. Back and forward must work; copy how `OfficialWorkspaceShell.select()` handles `setActiveSubTab`'s `?section=` param.

Split `CitizenHome.tsx` into a thin container that loads `getMyVault` once and keeps it fresh quietly, plus section files under `frontend/src/pages/citizen/` (for example `OverviewSection.tsx`, `PlotsSection.tsx`, `DeedsSection.tsx`, `DocsSection.tsx`, `TransfersSection.tsx`, `DisputesSection.tsx`, `TicketsSection.tsx`, `shared.tsx`). Keep the exported names (`CitizenHome`, `CitizenSection`).

## 5. Pages

**Dashboard (`overview`)**
- A greeting line with the name and a verified badge (one line).
- Up to 4 real KPI `StatCard`s: আমার জমি (plot count), মোট জমি (decimals), চলমান আবেদন, খোলা অভিযোগ. Each card is clickable and opens its section.
- **A small satellite map card showing all my plots**, using the same map component as §6 in compact mode. Clicking it opens the "জমি ও ম্যাপ" page.
- "জরুরি কাজ": real items only. Examples: a plot without a sale lock, a transfer waiting for my step, a ticket reply, a missing document.
- 3–4 quick actions at most: বিক্রয় লক, জমি হস্তান্তর, অভিযোগ দিন, দলিল যাচাই.
- Remove the fake sparklines and any hard-coded numbers.

**জমি ও ম্যাপ (`plots`)**: a single-screen page (`AdminPage fill`).
- **Desktop:** a two-column grid. On the left is a list of my plots: compact cards or a `DataTable` showing dag, mouza, my share in decimals, and a status badge (নিরাপদ / বিক্রয় লক / বন্ধক / বিরোধ / আটকানো). On the right is a large satellite map (`Section fill`).
- **Phone:** the map sits on top at about 45vh with the list below. The selected plot opens in a shadcn `Drawer` (vaul) bottom sheet.
- Selecting a plot in the list flies the map to that parcel and highlights it. Clicking a parcel on the map selects it in the list.
- The plot detail (sheet or drawer) shows: মৌজা, জেএল নং, দাগ, জমির ধরন, আমার অংশ, মোট জমি, and co-owners. The CS → SA → RS → BS khatian chain is a compact timeline; reuse the style from `OfficerKhatianExplorer`.
- Actions in the detail:
  - **বিক্রয় লক চালু / বন্ধ** via `ConfirmDialog` with a reason, calling `togglePlotSaleLock`.
  - কাগজপত্র (opens `docs` filtered to this plot).
  - জমি হস্তান্তর (opens the transfer flow with this plot preselected).
  - আপত্তি দিন.
  - "বড় ম্যাপে দেখুন" (opens `map?mouza=<location_id>&q=<dag_no>`).
  - Land health passport (the existing `LandHealthPassportModal`).

**দলিল (`deeds`)**: a single-screen list. A row opens a `DetailSheet` with deed details and a "যাচাই করুন" action that goes to the `qr` tab with `?code=`. Do not use `deed_no` as the param: that param routes to the public page.

**কাগজপত্র (`docs`)**: a plot picker at the top (shadcn `Select` or a small segmented list), then a document list. Upload uses a `FormDialog` with file and type fields, and "request missing document" calls `requestMissingDocument`. Download and preview open in a `Dialog`. Keep the existing endpoints.

**জমি হস্তান্তর (`transfers`)**
- The list of my transfers uses the 13-step progress style from `pages/admin/SuperAdminTransfersTab.tsx`: a stage badge, `n/13`, and a step-list detail sheet.
- The primary button "নতুন হস্তান্তর" opens `ApplicationsPage`.
- Redesign `ApplicationsPage` with the same kit: a compact stepper card with one step at a time, Back/Next in a footer, and rare fields in an Accordion "আরও তথ্য". Keep `createTransfer` and `advanceTransfer` and their payloads exactly. Make sure the flow can be reached from the plot detail with that plot preselected.

**আপত্তি (`disputes`)** and **অভিযোগ (`tickets`)**
- Both are single-screen lists with a primary create button, a `FormDialog` for creating, and a `DetailSheet` showing status and history.
- Ticket replies appear as a simple message thread inside the sheet, with a reply box at the bottom.
- Keep the `?map_plot_id` prefill and add `useCreateIntent`.

**Profile and settings**
- Profile is a compact `Dialog` or page with Tabs (প্রোফাইল / পাসওয়ার্ড). You may reuse `components/admin/AdminProfileModal.tsx` if it fits citizens.
- Settings is short: language, text size, notifications. Remove any control that does nothing; it calls no API.

**Service point operator (`spo_birulia`)**: the vault returns 403 for this role. Show a friendly empty state ("এই অ্যাকাউন্টে নিজের জমি নেই") and keep the help and verify tools working.

## 6. Satellite map component

Create `frontend/src/components/citizen/MyLandMap.tsx`: a reusable, plain-Leaflet component following the same pattern as `CadastralMapPage`.

**Props:**
- `plots`: the vault `owned_plots`.
- `selectedPlotId?` and `onSelect(plotId)`.
- `compact?`: the dashboard card. It hides controls and turns off scroll-zoom until the user clicks.
- `className?`

**Basemap:**
- Esri World Imagery satellite is the default.
- A small shadcn `ToggleGroup` switches between স্যাটেলাইট and মানচিত্র (CARTO Voyager).
- Put a thin labels overlay on top of the satellite, e.g. Esri `World_Boundaries_and_Places`.
- Keep the attributions.

**Geometry (group plots by `location_id`; for each mouza fetch once and cache):**
1. Try `mapApi.layers(location_id)` and then `mapApi.geometry(layer.id)`. Match on `feature.properties.plot_id === plot.plot_id`.
2. If that finds nothing, try `parcelApi.list(location_id, true)` and match on `plot_id`, then on `dag_no`.
3. If that finds nothing, use `ALL_MOUZA_CADASTRAL_PLOTS[location_id]` matched on `dag_no`.
4. If nothing matches, show a marker at the mouza's `latitude/longitude` from `mapApi.workspace`, with the note "নকশা পাওয়া যায়নি".

**Styling:**
- My parcels: green outline with a light fill.
- Locked or frozen: red. Mortgaged: amber.
- Selected: thicker outline plus a soft pulse.
- Other parcels in the same mouza may show faintly in grey for context.
- Each parcel gets a tooltip `দাগ ১০৫ · ২০ শতাংশ`.

**Behaviour:**
- `fitBounds` to all my parcels on load. `flyToBounds` to the selected parcel.
- A "আমার সব জমি" button refits to all parcels.
- A locate-me button using `navigator.geolocation`, optional and only on a user click.
- A measure tool is optional; skip it if it adds clutter.

**Performance and hygiene:**
- Lazy-load the map (`React.lazy`) so the dashboard stays fast.
- Destroy the Leaflet map on unmount.
- Handle resize with `map.invalidateSize()` when its container size changes; use a `ResizeObserver`.
- No API calls on every pan.
- Never block the page if tiles fail. Show a small inline "ম্যাপ লোড হয়নি" with a retry button.

Optional, small change: add a `focus` param to `CadastralMapPage` (for example `map?mouza=1&q=105&focus=1`) that auto-selects the single search match and zooms to it. Do not use `plot_id`.

## 7. shadcn components and blocks to use

Already in `frontend/src/components/ui`: `sidebar`, `command`, `collapsible`, `sheet`, `drawer` (vaul), `dialog`, `tabs`, `accordion`, `card`, `badge`, `button`, `select`, `toggle-group`, `tooltip`, `dropdown-menu`, `avatar`, `chart`, `skeleton`, `switch`, `checkbox`, `progress`, `breadcrumb`, `separator`, `sonner`.

- If you need a missing primitive, add it with the shadcn CLI and keep the existing style (for example `npx shadcn@latest add scroll-area hover-card carousel`). Check that it builds.
- Good block patterns to imitate: sidebar-07 (collapsible icon sidebar with an account footer), dashboard-01 (KPI cards and a list), and a mobile bottom navigation with a `Drawer` for details.

## 8. Rules

- Bilingual everywhere: `t('বাংলা','English')`. Bangla is the default.
- Body text is `text-sm`, secondary text `text-xs`. Never use 8–10px text, `font-black`/`extrabold`, emoji, ✔/⚡ symbols, or English in brackets inside Bangla.
- No inline success or error banners: use `notify.ok` / `notify.err`. Every change shows a toast and reloads the data.
- No fake or fallback demo data. Show "—" or an empty state instead.
- List pages use `<AdminPage fill>` with `<Section fill>`. The page itself must not scroll on desktop; only the table or list scrolls inside, with fades.
- Keep every real API call and payload. If a frontend payload doesn't match the backend (`backend/routes/api.php`, `backend/app/Http/Controllers/Api/V1/*`), fix it on the frontend and report it.
- Do not change the admin or officials files, `kit.tsx`, `api/client.ts` or the backend. If the kit really needs something, add a small local helper in `components/citizen/`.
- Accessibility:
  - Visible focus.
  - `aria-label` on icon buttons.
  - Tap targets of at least 40px on mobile.
  - Map controls usable by keyboard.

## 9. Verify before saying done

1. From `frontend/`: `npx tsc --noEmit` and `npx vite build` both pass.
2. Log in as `citizen`, `rabeya` and `spo_birulia`. Use puppeteer-core at `frontend/node_modules/puppeteer-core` with Brave at `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`. Get the token with `POST /api/v1/auth/login`, then set `bs_token`, `bs_user`, `bs_role` and `bs_lang=bn` in localStorage.
3. Take screenshots at 1440×900 and 390×844 of: `/bn/home`, each section, `/bn/applications`, and the plot detail drawer on mobile.
4. Check on every page:
   - No HTTP ≥400 except the known `spo_birulia` vault 403, which must be handled gracefully.
   - No console errors.
   - On desktop list pages, the main content doesn't scroll.
   - The satellite map shows **my** parcels highlighted and zoomed.
5. Click through the menu and the bottom bar, then press Back. The URL and the page must stay in sync.
6. Do not send POST/PUT/DELETE requests while testing, except through the UI flows you are deliberately testing, and say which ones you sent.

**Report at the end:** the files changed or created, the workflow and payload fixes, which plots matched real geometry and which fell back, and anything not done.
