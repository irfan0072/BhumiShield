# Render PostgreSQL recovery — 19 October 2026

## Cause
The API was healthy but its Free Render web instance used ephemeral SQLite. Public data endpoints returned empty datasets after the service recreated its schema. Free web service storage does not persist across restarts/deploys.

## Preservation and compatibility
A read-only SQLite snapshot was archived before recovery. The explicit recovery tool refuses a nonempty PostgreSQL target and checks all source/target row counts and normalized SHA-256 row digests inside one transaction. The archived source has 67 tables and 1,370 rows, including 25 accounts, 61 plots, 12 offices and 88 deeds. This restores the available local snapshot; it cannot recover records already lost from an earlier ephemeral remote instance.

PostgreSQL compatibility corrections retain double-precision areas, adapt simulator identities, protect ownership writes with database triggers, and avoid PostgreSQL reserved xmin/xmax column names in parcel bounds. Hosted staging/production fails visibly when PostgreSQL is unreachable, instead of silently creating SQLite. Public map DTO field names remain unchanged.

## Verification
- Local PostgreSQL 18: all 67 tables/1,370 rows matched the archive by counts and row digests.
- Repeated core/map migrations, ownership write guard, public data, source collection OFF and precision: 10 checks passed.
- Parcel design, office scope, maker/checker, overlap, publication and revision workflow on PostgreSQL: 25 checks passed.
- Same parcel workflow on an isolated SQLite snapshot: 25 checks passed.
- Remote recovery connection uses certificate-verified TLS. Live application uses Render private networking and TLS.

## Operations
The manually provisioned free PostgreSQL database is bhumishield-judging-db in Singapore. Render reports expiration on 18 November 2026. Export before expiry or migrate/upgrade deliberately. Keep JWT and ledger signing secrets unchanged; disable synthetic seeding. The blueprint requires manually configured host/user/password to avoid committing secrets or creating duplicate database resources.

Recovery utility: tools/recovery/sqlite_to_postgres.php. Config is a private JSON file with host, port, database, user, password and sslmode=verify-full for external connections. Never commit credentials, database files or per-row data. Existing nonempty targets are deliberately refused.

Database persistence does not make local uploaded files durable. Free web instance file storage still requires a separate durable upload storage solution. Keep the original SQLite archive for rollback; do not erase either database during rollback.

## Final live result and repository instruction
- Render deployment dep-dbarn749v7es739mr50g succeeded and is live using the recovery image (7d30449).
- Health ready/database connected; public endpoints return 4 locations, 61 plots, 12 offices and 8 published services. DL-2026-1001 verification responds 200. Safari citizen checker visibly loads parcel data.
- Ledger has 86 verified and 2 broken records; the original archived SQLite snapshot returns exactly the same 88/86/2 result. Existing integrity findings were preserved, not repaired or concealed.
- The user prohibited further GitHub changes because submission closed and then explicitly requested removal of the earlier recovery push. GitHub main was restored, with an exact force-with-lease, to its pre-push 89f48b173b9508d14d93de3d8dadcdc94f20b624 revision. Remote revision was independently verified. No new changes should be published without new explicit authorization. GitHub activity/notifications may retain evidence of the push; removal is not proof that it never happened.
- Render API auto-deploy is OFF and Blueprint auto-sync is NO to preserve the working deployed image and PostgreSQL settings when repository main reverts. Do not deploy repository main or sync its old SQLite blueprint without a deliberate compatibility plan. The live deployment intentionally differs from repository main; tested recovery source is preserved locally in the recovery worktree and current workspace.
- Temporary external recovery access was restricted to the workstation IP /32; internal Render connections remain available. No paid services, password changes or signing-key rotations were performed.
- Disposable local PostgreSQL test instance stopped. Original live local SQLite and archived backup retained.
