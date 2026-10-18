# Map workspace implementation — 18 October 2026

## Delivered
- Replaced the hardcoded SVG parcel picture with Leaflet and attributed OpenStreetMap tiles. Real pan, zoom, extent, scale, basemap switch, approximate distance measurement, print and share controls. Homepage-led green/cream styling and inherited site font. Map code is lazy loaded.
- Database-driven administrative filters, Bengali digit search, bounded 60-record pages, recorded area and live lock/lien/freeze flags. Reference markers are explicitly mouza centres, never fabricated parcel positions.
- Linked selected records to checking, owned-land transfer preparation, prefilled support requests and area-filtered office lookup. No automatic transfer/ticket submission.
- Admin/system_admin map control: authorised GeoJSON import → DRAFT → preview → source/rights review with reason → PUBLISHED → withdrawal preserving history and audit. Public routes exclude drafts and withdrawn geometry.
- Geometry import validates WGS84 Bangladesh-region coordinates, closed rings, supported types, size/count budgets and linked plot/mouza/dag identity; strips unapproved properties. This is not a full GIS topology validator.
- Python public-source catalogue collector: robots.txt, fixed HTTPS origin, bounded size/time, paced requests, raw snapshot/hash and semantic change fingerprint. No owner scraping, protected API replay, tile harvesting or government submissions.

## Additional integration repair found visually
The transfer form called the entire 23-decimal plot the citizen's share, although the vault recorded 13 decimals. ApplicationsPage now normalises the vault's ownership-area fields, displays and prefills 13, and bounds the input to the recorded share. Another person's map parcel produces a clear warning and no substitute parcel is automatically selected. Backend ownership checks remain authoritative.

## Use
- Citizen/public explorer: http://localhost:5175/bn/map
- Signed-in admin: dashboard Map control button, or http://localhost:5175/bn/map?manage=1
- Import only authorised, already georeferenced WGS84 GeoJSON. Specify registered mouza, source HTTPS URL, observation date and rights notes. Preview before publishing. No geometry is included as pretend government data.
- Refresh public source catalogue from repository root:

```sh
python3 tools/map_sources/collect_public_catalog.py --output frontend/public/data/map-source-catalog.json --cache /private/tmp/bhumishield-map-source-cache
```

This collector is a manual operator command, not a scheduled job or a dashboard-triggered process. Admin displays its latest saved catalogue.

## API
Public GET `/map/workspace`, `/map/layers`, `/map/layers/{id}`. Admin GET/POST `/admin/map/layers`, GET `/admin/map/layers/{id}`, POST `/admin/map/layers/{id}/review`. Additive `map_datasets` table is created when map-layer endpoints first run. Source review does not modify legal ownership.

## Verification and evidence
- 21 isolated backend checks passed: role restrictions, draft/public boundaries, property filtering, duplicate data, rights review, state conflicts, withdrawal, audit, date/coordinate validation, plot identity and Bengali search. See `map-upgrade-2026-10-18/backend-map-tests.log`.
- Two offline Python collector tests passed: token changes do not create semantic-change alerts; robots denial stops page fetch.
- Main-project TypeScript and production build passed during concurrent integration. Build log in evidence folder. Earlier temporary AcLand syntax issue is no longer present at this verification.
- Browser: import, published preview, sheet filter, feature summary and withdrawal completed on disposable database; Bengali dag search, measurement and check-record navigation observed; office context and citizen ticket prefill confirmed; owned parcel preselection and non-owned warning confirmed. No transfer or ticket submitted.
- 390px responsive layout visually checked; document client/content widths both 384px, no horizontal page overflow at that viewport.
- Evidence screenshots: desktop map, mobile map, draft preview, synthetic published QA layer. The QA polygon screenshots are explicitly synthetic, not government survey data.
- Backup before map slice: `.backups/map-upgrade-2026-10-18/`; includes SQLite snapshot. Additional ApplicationsPage snapshot precedes ownership-share repair. Main data was not reset/reseeded; QA map imports exist only in disposable copies.

## Limits and remaining work
- Government reference https://map.land.gov.bd/ supports administrative cascading selection, mouza/sheet/plot and land-use/zoning controls. This audit interacted with division, district and upazila controls and inspected public page controls; it did not exercise every government service or purchase map sheets.
- No authorised nationwide cadastral geometry feed was available/imported. The public client references an HTTP GIS service; the implementation does not bypass its controls or proxy it as if authorised. The Python catalogue is not parcel geometry. A licensed export or approved HTTPS GIS integration is still needed for nationwide cadastral boundaries.
- Existing DB coverage is partial. Location response caps at 2,000 and dataset listing at 100; nationwide deployment needs server-side administrative lookup, spatial indexing and vector tiles, plus production tile hosting/provider capacity. No nationwide scale performance test was performed.
- Offices are matched by district/upazila as references, not final jurisdiction. Support record context is text prefill, not a structured case-routing relationship. Other role workflows remain Antigravity's concurrent work.
- No claim of legal title certification, production readiness, government affiliation or biometric verification follows from this map implementation.

## Concurrent work boundary
Keep all map files/routes/dependencies and small integration edits listed in `MAP_WORK_BOUNDARY_2026-10-18.md`. Do not restore shared files wholesale. Antigravity owns the broader role/workflow implementation; this document reports the map slice only.
