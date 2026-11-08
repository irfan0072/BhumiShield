# Super admin panel: design rules

Users are non-technical. Every screen must be understandable at a glance, with almost no reading.

## Layout
- The shell (`AdminWorkspaceShell.tsx`) already shows the page name and breadcrumb. **Pages must not render their own big title, intro paragraph, hero banner or help text.**
- Page root is always `<AdminPage>` from `./kit`. (Use `wide` only for very wide tables.)
- Order on a page: optional `StatGrid` (max 4 `StatCard`s, real numbers only) → `PageToolbar` → `Section` with the list → dialogs/sheets.
- One primary action per page (e.g. "নতুন যোগ করুন"), placed in `PageToolbar` `actions`, `Button size="sm" className="h-9"` with an icon.
- Sub-views use shadcn `Tabs` (`TabsList className="h-9"`), not stacked sections.

## Single-screen list pages
- Any page whose main content is a table uses `<AdminPage fill>` and puts that table in `<Section fill>`. On tablet/desktop the page never scrolls; only the table scrolls inside the card (sticky header, soft top/bottom fades, rows load in batches as you scroll).
- Everything above the table (StatGrid, toolbar, tabs) must be short enough to leave room for the table. Keep at most one StatGrid row.
- Server-paged lists pass `hasMore`, `loadingMore` and `onEndReached` to `DataTable` instead of Prev/Next buttons.
- Two tables side by side: wrap them in `<div className="grid gap-4 md:min-h-0 md:flex-1 md:grid-cols-[…] md:grid-rows-[minmax(0,1fr)]">` and give each `<Section fill>`.
- Form/detail pages (wizards, settings) do not use `fill`; they scroll normally.

## Lists
- `Section` + `DataTable`. Max 4–5 columns. Put secondary info as a second muted line inside a cell (`text-xs text-slate-500`).
- Clicking a row (or an eye icon button) opens a `DetailSheet` with a `DetailList`.
- Row actions: 1–2 → small ghost icon buttons with a `Tooltip`; 3+ → a `DropdownMenu` behind a `MoreHorizontal` icon.
- Loading → `LoadingRows`; nothing → `EmptyRow` / `EmptyState`.
- Status → `StatusCode` (maps backend codes) or `StatusBadge`.

## Forms and actions
- Create/edit → `FormDialog` with `Field` + `inputCls` (or shadcn `Input`/`Select` with `className="h-9 rounded-lg"`).
- Put rarely used fields in a collapsed shadcn `Accordion` item "আরও তথ্য" inside the dialog.
- Risky actions (delete, freeze, suspend, decide) → `ConfirmDialog` (use `askReason` when the backend needs a reason).
- Feedback: `notify.ok('সংরক্ষণ হয়েছে')` / `notify.err(e, lang)`. No inline success banners. Always refresh the list after a change.
- Pages that have a "create" form call `useCreateIntent(() => setCreateOpen(true))` so the dashboard and Ctrl+K quick actions can open it.

## Text and style
- Labels 1–3 words. Descriptions at most ~6 words and only when truly needed. No paragraphs, no emoji, no "✔", no English in brackets inside Bangla text.
- Always bilingual: `t('বাংলা', 'English')`.
- Body `text-sm`, secondary `text-xs`. Never `text-[8px]`–`text-[10px]`. Headings `font-semibold` at most (no `font-black`/`font-extrabold`).
- Neutral slate colours; brand green `#006A4E` only for primary buttons/active state; colour otherwise comes from status badges and small icon tiles.
- `rounded-xl` cards, `rounded-lg` controls. No gradients, no heavy shadows, no decorative illustrations.
- Never show made-up numbers or demo fallback data. Show "—" or an empty state instead.
