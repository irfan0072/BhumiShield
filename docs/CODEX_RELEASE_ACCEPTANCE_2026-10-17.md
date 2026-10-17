# BhumiShield release acceptance and dynamic-control scope

This is the supervisory acceptance contract for the user's overnight request. A production-ready codebase and a government-authorized service deployment are different milestones; report each truthfully.

## Supported product to complete

BhumiShield is an independent bilingual land-record risk and workflow application with local persisted records, five roles, cryptographic proofs and source-linked official-service guidance. Preserve the user's approved homepage font/theme. Existing local transactional workflows must complete end to end. Official government systems remain external unless an approved provider connection is supplied and verified.

## Dynamic controls

| Domain | Required authorized controls | Invariants |
|---|---|---|
| Service catalogue/guidance | Admin draft/publish/archive, bilingual title/description, category, order, destination, availability, reviewed date, source link | External handoff clearly labeled; validated HTTPS destinations; no fabricated API integration |
| Published fees | Versioned components, amounts, authority/source, effective/review dates, draft/published status | No silently overwritten historical quotes; distinguish estimate vs official provider checkout |
| Site content | Brand title, support contact, notice, bilingual help/FAQ and office guidance using shared settings/content seam | Validated lengths/types/URLs, safe rendering; no raw executable HTML |
| Identity/users | Scoped profile, admin user administration, active status/role/office | Verified identity linkage, role allowlist, last-admin protection, current credential verification, session revocation |
| Land records | Search complete location/plot/record/owner dataset; authorized validated ingestion/review | Provenance and survey status; preserve area/share totals; no generic unaudited table editor |
| Registrar | Pre-check, held review, registration, rejection/release with reasons | Fresh shared eligibility; signed content immutable; one mutation case; explicit transitions |
| AC Land | Review queue, info request/hearing/order, controlled decision/reconciliation | One transfer application, conserved ownership; no tampered approval or wholesale co-owner area overwrite |
| Restrictions | Owner lock/unlock, objection, authorized review hold/freeze/unfreeze with source/evidence | Scope and authority explicit; all relevant writes honor restrictions; no permanent restriction from an unauthenticated complaint |
| Bank | Scoped lien/check/release/NOC | No duplicate active lien race; only authorized bank mutates its record; stable RELEASED-only certificate |
| Reports/analytics | Queryable scoped records, working filters, print/export, unique report/proof references | No invented counts/trends/trust scores; private identity data minimized; proof claims earned |
| Integration configuration | Operator setup of supported adapters and status, without showing secret values | Live actions fail closed until configured; no client-set provider success or self-asserted official status |

Security, authentication, signature verification, ownership conservation and audit integrity are mandatory invariants, not ordinary admin-off switches. Avoid interpreting “dynamic” as permission to disable them.

## Independent proof required

1. All backend/domain tests pass on isolated seeded DBs.
2. HTTP route tests cover anonymous, malformed, expired, inactive, wrong-role and object-scope denial plus invalid input and safe errors.
3. Regression tests exercise duplicate mutation decisions, tampered evidence, frozen disputes, unauthorized owner/bank actions, transaction rollback and conservation.
4. Admin content changes persist and appear on public pages; archive/unpublished content is hidden; unauthorized users cannot publish. Versioned fee/history survives edits.
5. Browser QA follows each distinct user journey and action destination in both languages, desktop and mobile, with actual screenshots. UI cannot claim success after a failed request.
6. QR is decoded in a non-browser image test, and its configured-origin verification URL works with a new page/reload. Proof result/status must match the stored record.
7. Production startup is non-destructive, fails closed on missing required secrets/unavailable configured DB, supports safe schema updates, and serves compiled assets/deep links without dev-server assumptions.
8. Restore from a backup into a separate DB is tested. Secrets and synthetic records are not shipped as production identities. No demo auto-seeding, mutation simulator or public internal error details in production.
9. Documentation describes the actual runtime and commands. No nonexistent FastAPI/Swagger/PWA feature claims, no “Laravel 11” assurance if the application is a custom PHP router.

## Real-service release gates

Operator-approved domain/TLS/hosting, provider authorization/contracts, NID/identity access, SMS delivery and recovery, government records/mutation/tax APIs where needed, banking authority/keys, payments and signed callbacks, retention/privacy arrangements, incident monitoring, accountable data stewardship and acceptance sign-off were not supplied. Mark these as externally blocked; do not mark them implemented by substituting mock success.

The overnight work is complete only when local supported acceptance is verified and remaining external gates are specifically listed. Do not continue adding unrelated modules merely to fill time.
