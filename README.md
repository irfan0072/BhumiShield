# BhumiShield — ভূমি সুরক্ষা

Independent bilingual land-record risk and workflow application. The homepage design uses Hind Siliguri for Bengali, Manrope for English, and the shared green theme.

This repository runs a **custom PHP REST router**, PDO storage and a React/TypeScript/Vite frontend. It does not boot the Laravel framework. Government portals, authoritative identity checks, payments, SMS and institutional banking connections require separate authorization and integration.

## Local setup — preserve existing work

PHP8.4 with PDO SQLite, sodium and mbstring, plus Node24LTS, are the documented runtime targets.

```sh
cd backend
php artisan migrate
php artisan catalogue:init
php artisan serve --host=127.0.0.1 --port=8008
```

In another terminal:

```sh
cd frontend
npm ci --ignore-scripts
VITE_API_URL=http://127.0.0.1:8008/api/v1 npm run dev
```

Open http://localhost:5175. `migrate` is additive. `catalogue:init` initializes missing service/fee guidance only and preserves existing records and edits. Never use a fresh migration or demo seeder on an existing working database. Legacy citizens remain unverified until an authorized operator completes identity enrollment; a self-declared NID does not grant ownership authority.

## Supported workflows

- Five authenticated roles, ownership-scoped sale locks, account suspension, native password hashes, legacy-hash upgrade and password-change session revocation.
- Pre-purchase risk checks, registrar review/registration, mutation decisions with conserved holdings, bank-scoped liens and persistent released-only NOCs.
- Ed25519/SHA256 proof verification, real QR symbols and reloadable proof links. These attest to application records, not government title or legal truth.
- Admin-managed bilingual service catalogue, publication/archive controls, source-linked versioned fee guidance, user administration and system policy settings.
- Dashboard counts, monthly series and pre-check coverage derived from stored data. Coverage is not an ownership assurance score.

The registration-charge calculator is a local demonstration. Production refuses its unverified assessment and never issues government challans. Official khatian/map guidance follows the signed17February2026 Ministry circular; all payments take place on the relevant official service.

## Verification

```sh
cd backend
php artisan test
cd ../frontend
npm run typecheck
npm run build
```

Backend regressions use isolated databases. Operational readiness: `/api/v1/readiness` returns503 when required schema, constraints or production configuration are missing. Requests never migrate or seed storage.

## Production operation

See [production runbook](docs/PRODUCTION_RUNBOOK_2026-10-17.md), [release acceptance](docs/CODEX_RELEASE_ACCEPTANCE_2026-10-17.md) and [official-service research](docs/BANGLADESH_LAND_SERVICES_RESEARCH_2026-10-17.md).

Docker builds an Apache/PHP API and a compiled Nginx frontend, with a persistent SQLite volume and same-origin API proxy. No project database or environment secret is copied into the images. Production blocks demo seeding, destructive migration commands, tamper/restore simulators, demo role switching and dummy OCR. External release requirements and any incomplete verification must be reviewed before real service operation.
