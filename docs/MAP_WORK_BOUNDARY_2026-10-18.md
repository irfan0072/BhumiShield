# Concurrent work boundary

Codex is implementing the map workspace requested by the user. Antigravity is working on the other roles/workflows concurrently; do not reset or restore shared files wholesale.

Map-owned files: `frontend/src/pages/CadastralMapPage.tsx`, `MapWorkspace.css`, `frontend/src/components/map/*`, `backend/app/Http/Controllers/Api/V1/MapWorkspaceController.php`, `tools/map_sources/*`, `frontend/public/data/map-source-catalog.json`, map tests and map docs.

Small integration edits only: map endpoints in `backend/routes/api.php`; map management link in AdminDashboardPage; map context in CitizenHome, ApplicationsPage and OfficeLocatorPage; Leaflet dependencies in frontend package manifests. Preserve these while making other changes. No general role/workflow repairs are part of Codex's current slice.

Source/database backup before this slice: `.backups/map-upgrade-2026-10-18/`. Validation uses isolated database copies. The main DB is never reseeded. Imported geographic evidence is a separate table; publication does not change legal ownership.
