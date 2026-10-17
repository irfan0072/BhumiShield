# Homepage-led typography and theme audit

Date: 17 October 2026. Target: http://localhost:5175. This audit is read-only for product code.

The user's preferred reference is the existing homepage. Preserve its appearance and extend its design language across the application.

## Evidence

Browser comparison: homepage, check-before-buy, QR verification, help and login. Source comparison: all role pages, shared layout, overview, results, timelines, auth guard, error screen, certificates and print styles. Shared dashboard styles were inspected in code; the preceding role audit also visually exercised those screens. Antigravity is making concurrent changes, so recheck latest files before applying edits.

Measured computed styles in Bengali mode (`lang=bn-BD`, root font size 18px):

| Element | Assigned font family | Size / weight |
|---|---|---|
| Homepage hero h1 | Hind Siliguri, Noto Sans Bengali, sans-serif | 54px / 700 |
| Homepage services h2 | Same sans-serif stack | 33.75px / 700 |
| Homepage search h2 | Same sans-serif stack | 20.25px / 700 |
| Verification page h1 | Noto Serif Bengali, Fraunces, Georgia, serif | 30.72px / 400 |
| QR page h1 | Same serif stack | 30.72px / 400 |
| QR panel h2 | Same serif stack | 20.25px / 600 |
| Help h1 | Homepage sans-serif stack | 27px / 800 |
| Login h1 | Homepage sans-serif stack | 33.75px / 800 |

These are computed font-family declarations, not a per-glyph font-file trace. Different hero/page title sizes are appropriate; the unplanned switch of font family and weight is the problem.

## Confirmed causes

### 1. Competing heading systems

`frontend/src/index.css:19` defines --font-display as Noto Serif Bengali/Fraunces/Georgia. `.font-display` uses it, and `.page-intro h1` forces it separately. The homepage has no font-display classes and inherits Hind Siliguri. Help and login also inherit the sans-serif stack but independently choose heavy weights.

The role pages and ResultHeroBanner, KhatianChainTimeline, VelzonOverviewSection and QR panels use font-display, producing mixed serif/sans headings even within a single view. Changing only one page or only the font-display class will leave the page-intro override behind.

### 2. Four imported font families plus uncoordinated fallbacks

`frontend/index.html` imports Hind Siliguri, Manrope, Noto Serif Bengali and Fraunces. The homepage's intended Bengali family is Hind Siliguri; the configured English UI family is Manrope. Fallback stacks are not a script-aware design policy: the first family that covers a glyph wins.

Default Tailwind font-sans is not mapped to the product font token. Local font-sans classes in bank rows, AC Land rows, proof panels and ErrorBoundary can reset to system fonts. Whole Bengali text blocks also use font-mono, causing inconsistent fallback/glyph appearance. Reserve monospace for technical data only.

### 3. Homepage colors differ from shared tokens

Homepage hero: #074f38. Homepage primary search action: #006A4E, hover #00553e. Shared primary controls use --teal #0D6B5C, hover #0A5549. Older headings/backgrounds use #062823/#041A1C and lime #7CDB6A. Role sidebars use slate-900 navy; help includes #253656 navy. These are separate visual directions.

A source scan found hundreds of direct color values, including 254 occurrences of #0D6B5C and 72 of #006A4E at audit time. Exact counts can change while Antigravity edits; the scattered ownership is the concern.

### 4. Duplicate theme definitions disagree

`frontend/src/index.css` sets --text-muted to #435E58. `frontend/src/theme/tokens.ts` still sets textMuted to #5F7A74, and many components hardcode #5F7A74. Accessibility theme changes cannot reliably affect direct color classes.

The CSS base size is 17px, while `i18n/index.tsx` writes 18/20/22px at runtime. Use one default source and retain accessible font scaling.

### 5. Components independently define shape, spacing and type

Homepage uses solid white cards, light gray/slate borders, restrained shadows, rounded controls and bold sans headings. Shared `.panel` adds transparency, blur and a large shadow; `.btn-primary`, custom page buttons and help buttons each implement different radii/weights/colors. Page headings have no common semantic sizing/weight scale.

There are many 10px/11px labels and metadata blocks across the role screens. At audit time QR page contained 33 such class occurrences and registrar 24. Do not shrink whole dashboards to match the larger homepage layout; adopt shared readable compact variants.

### 6. Theme states are bypassed

High contrast changes CSS variables, but hardcoded colors remain. Forms, status banners, drawer, error screen, print documents and modal content need the same token policy. Status red/amber/green must remain distinct and readable; preserve semantic meaning rather than recoloring every element green.

## Recommended design decision

- Bengali throughout: Hind Siliguri for headings, body, navigation, forms, tables and modal/report prose.
- English throughout: preserve the homepage's existing Manrope UI direction, with Hind Siliguri fallback for mixed Bengali text.
- Heading family should inherit the active UI family; vary size/weight by semantic role, not by page.
- Monospace only for hashes, signatures, deed/reference IDs and genuinely technical data; normal names, descriptions and Bengali labels use the UI family. Tabular numerals may be used for amounts without switching entire rows to monospace.
- Promote homepage colors to canonical brand tokens: primary #006A4E, hover #00553e, dark/hero #074f38, white surfaces and existing homepage neutral border/text tones. Derive active/soft/dark variants from this palette.
- Keep the homepage as the visual baseline. Preserve dashboard navigation and information density, but align its fonts, greens, surfaces, controls, borders and shadows with that baseline.

## Implementation boundaries and verification

Change visual styling and shared component definitions only. Preserve ongoing workflow/security fixes, content, forms, handlers, API contracts and permissions. Avoid a global `* { font-family: ... !important }` patch: it hides ownership problems and can damage technical/print content.

Capture the homepage before edits. Consolidate tokens, map Tailwind font-sans and shared typography utilities, then remove competing overrides and use shared component variants. Cover homepage, verification, QR, help, login/register/profile, all five role dashboards, results, timeline, tables, empty/error/access-denied states, mobile navigation, certificate/challan/NOC modals and print output.

Compare screenshots in Bengali and English at desktop, 768px and 390px; spot-check 360px. Check normal/high contrast and enlarged text without clipping. Measure computed font-family/weight for equivalent UI roles across pages after webfonts settle. Verify fonts load and mixed-script text renders correctly. Re-run the production build and relevant existing checks. Deliver before/after evidence and list intentional typography exceptions.
