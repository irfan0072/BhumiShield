# Production operation and release gates

This is an independent application. Passing local checks does not authorize government records access, identity checks, financial decisions or official submissions. The operator owns institutional approvals, data provenance, identity enrollment, privacy/retention decisions, monitoring and release sign-off.

## Runtime

- PHP8.4 Apache image; `/app/public` is the document root. Authentication headers are forwarded to PHP.
- Compiled React frontend in Nginx. `/api/` proxies internally; other paths fall back to index.html for proof/navigation reloads.
- Supported validated persistence target: SQLite on one application host with a persistent `/data` volume, WAL and serialized write transactions. PostgreSQL adapter is present but requires separate deployment validation; it must not silently fall back in production.
- Requests never migrate or seed storage. Container startup runs additive migration as the application user. Schema/configuration readiness gates production requests.
- Images exclude local environment files and database files. There is no default production account.

## Operator setup

Before starting the stack, provide unique `JWT_SECRET` (at least32characters), private `REGISTRAR_ED25519_SEED_HEX` (exactly64hex characters), and the actual HTTPS `PUBLIC_VERIFY_BASE_URL`. Generate and store these through the operator's secret manager. Do not reuse demonstration values. Preserve signing keys with secure backups; changing a signing key without a key-history migration invalidates verification of earlier signatures.

`docker compose up --build -d` binds the frontend to127.0.0.1:8080 by default. An operator-approved TLS/domain reverse proxy is required for external access. Backend storage uses the named land-data volume; do not remove that volume when updating the application.

Initialize guidance once, without replacing existing content:

```sh
docker compose exec --user www-data api php artisan catalogue:init
```

Enroll the first operator explicitly. Set `BOOTSTRAP_ADMIN_USERNAME` and a password of at least16characters in a private shell environment, then run:

```sh
docker compose exec --user www-data \
  -e BOOTSTRAP_ADMIN_USERNAME -e BOOTSTRAP_ADMIN_PASSWORD \
  api php artisan operator:create --initial-admin
unset BOOTSTRAP_ADMIN_USERNAME BOOTSTRAP_ADMIN_PASSWORD
```

The command refuses to replace an existing administrator. It records an audit event and never verifies a person's NID. Codex exercised this command only on disposable fixtures, not on the user's working database. Subsequent staff and citizen identity enrollment requires an authorized operator and real evidence; never treat a claimed NID or a demo account as identity proof.

## Content and fees

Admins can draft/edit/publish/archive service guidance and edit versioned fee schedules. Source links, amounts, components and effective dates must be reviewed before publication. The generic deed-registration estimate remains a draft because applicable taxes vary and its rates were not verified. Production's demonstration calculator is unavailable; official offices assess registration duties and issue actual payment documents.

Khatian copy guidance: BDT120 (100government+20service); map sheet: BDT545 (520government+25service), per the signed17February2026 circular linked in the research document. Review source currency before a real launch. Informational publication is not a payment integration.

## Backup, update and restore

Back up the database with SQLite's online backup API or the sqlite3 `.backup` facility. Keep signing keys and configuration separately protected. Do not copy only a live SQLite main file while ignoring WAL state. Test restores into a separate location.

Build replacement images, retain the data volume and run additive migration. Verify readiness and supported workflows before routing traffic. Destructive migrations and synthetic seeding are rejected in production. Conflicting legacy active liens require operator review; do not delete evidence to force a constraint installation.

## External release requirements

- Domain/TLS/hosting and an accountable operator.
- Authorized records sources and real identity verification/enrollment.
- SMS delivery/recovery provider if those features are offered.
- Authorized government, bank and payment adapters, signed callbacks and reconciliation before enabling live actions.
- Privacy notices, access review, retention, backup/restore, incident monitoring and acceptance sign-off.
- Separate PostgreSQL/key-rotation validation if those capabilities are selected.

Do not label dummy OCR, simulated government actions, local risk assessments or informational fee previews as live official services. Logout clears the local browser session; password changes revoke prior issued sessions. Set session lifetimes to the operator's requirements. Review the development-only Puppeteer dependency advisories separately from runtime dependencies; do not force a major downgrade merely to silence an audit report.

The final independent audit report is authoritative for actual passed, failed and unverified checks; implementation milestone reports contain intended outcomes and are not test evidence.
