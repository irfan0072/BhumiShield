# Live frontend/backend diagnosis — 19 October 2026

## Confirmed finding

The active frontend is connected to a reachable API. The API currently exposes empty application datasets. This is a data initialization/persistence or database-selection issue, not an observed current frontend API URL/CORS/network outage.

Checks performed around 12:01–12:03 Asia/Dhaka:

| Read-only check | Result |
|---|---|
| Frontend `/` | HTTP 200; 0.49 seconds |
| Backend `/api/v1/health` | HTTP 200; 0.31 seconds; `ready:true`, `database:connected`, mode staging |
| Deployed `/assets/index-BZ0WmOw6.js` | Embeds `https://bhumishield-api.onrender.com/api/v1`, timeout 12,000 ms; no localhost API address found |
| `/api/v1/locations` | HTTP 200; `locations:[]`, `plots:[]` |
| `/api/v1/settings` | HTTP 200; empty settings/map/items |
| `/api/v1/offices` | HTTP 200; zero active public offices |
| `/api/v1/services` | HTTP 200; zero published services |
| `/api/v1/verify/deed/DL-2026-1001` | HTTP 404 `DEED_NOT_FOUND` for the example displayed on the landing page |
| Browser CORS preflight | HTTP 204; allows frontend origin through `*`, GET, authorization and content-type |
| Citizen checker `/bn/check` | Renders successfully, shows zero plots and no mouza/plot options; no warning/error console entries observed |

The offices/services endpoints filter active/published records, so zero there alone would not prove no underlying rows. Combined with empty unfiltered geography/settings and the missing example deed, this establishes an uninitialized/empty exposed dataset. No private user directory or remote database shell was accessed; remote account count is unknown.

## Strongest explanation and limits

The checked-in deployment configuration uses:

- `render.yaml:8`: free API web service.
- `render.yaml:15–18`: SQLite at `/data/bhumishield.sqlite`.
- No persistent disk is declared.
- `backend/entrypoint.sh:10–18`: creates `/data` and runs additive migrations. Synthetic seeding occurs only if `INIT_SYNTHETIC_SEED=true`; default is false.
- A health check validates connectivity/schema, not the presence of an initialized demonstration dataset. It can correctly return `ready:true` on empty tables.

**Strong inference:** a Render restart, redeploy or idle spin-down discarded an ephemeral SQLite file; startup recreated its schema without repopulating the old data. An independently changed DB path/connection or intentional data clearing could also produce the observed responses. Actual Render environment variables, restart/deploy events and startup logs were not available, so the exact historical trigger and active remote database driver/path are not independently certified from HTTP responses alone.

Render documents that free web services use an ephemeral filesystem and local SQLite files are lost on redeploy, restart or spin-down. Free services cannot attach a persistent disk:

- https://render.com/docs/free
- https://render.com/docs/disks

## Recovery direction

1. Check the Render API service's Events/Logs for the last restart/deploy and inspect the actual DB connection/path and initialization settings. Preserve any recoverable database/uploads first.
2. Move persistent application data to an external PostgreSQL database, or use a paid API instance with a persistent disk mounted at the database path. A directory named `/data` alone is not persistent storage.
3. Restore a verified, authorized backup or migrate the intended local dataset after checking schemas, identifiers, signing keys and uploads. Preserve remote changes; do not overwrite an unknown active database without comparison.
4. Confirm expected record counts, actual sign-in behavior, citizen data and workflows; then test persistence across a controlled restart. Maintain a separate backup strategy.
5. Do not treat recurring demo seeding or periodic requests as durable data storage. Do not regenerate signing/JWT keys as part of this diagnosis.

A secondary configuration risk is the 12-second frontend timeout versus Render's documented approximately one-minute cold start. This can explain temporary first-visit timeouts, but current probes were subsecond and the confirmed current failure is empty data. Increasing timeout cannot restore missing records.

## Local recovery material

Read-only inspection of the local SQLite file found **25 users, 4 locations, 61 plots, 12 offices and 10 settings**. This is potential migration/recovery material, not proof it matches every change that occurred on the hosted service last night. No local or remote data was reset, seeded, restored or edited during this investigation.

Evidence: `docs/live-diagnosis-2026-10-19/`. No product-code or Render configuration changes were made.
