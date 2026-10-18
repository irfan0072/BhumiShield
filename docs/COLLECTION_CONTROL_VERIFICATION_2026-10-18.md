# Default-off collection control and README — 18 October 2026

## Delivered

- A database-backed **master collection switch**, OFF when first initialized on both existing and fresh installations. Re-running migration preserves an explicit later choice.
- Active `admin` / `system_admin` users can change it from **Admin → Integrations → Official sources & information updates → Master collection control**. A reason is required; actor, timestamp and reason are retained. Version checks reject stale concurrent updates.
- The authenticated manual collection route checks the master switch before leasing a source or starting a collector. Individual source controls still apply.
- The PHP worker checks it every cycle and skips collection while OFF. A watching worker polls the disabled state every 15 seconds; enabling does not install/start a worker.
- Both the service collector (including the packaged backend copy) and the older map-catalogue collector consult the same PHP/database policy before network requests. They fail closed if that policy cannot be verified. `SOURCE_COLLECTION_PHP` can select the PHP executable.
- Prior observations, publications, review history and business records are retained. OFF does not cancel every already-started request or hide previously published content. API and worker must share the intended database. The switch is not protection against someone modifying source code or bypassing the application as a privileged operator.
- README redesigned with the team-supplied frontend/backend addresses, primary P3 focus, user journey, diagrams, actual stack, local setup, fixture accounts, attribution, actual AI/data disclosure and prototype limits.

## Verification

Evidence folder: `docs/collection-control-2026-10-18/`.

| Check | Result |
|---|---|
| Dedicated collection-control checks | **17 passed**, disposable copied DB; fresh install default, existing install default, anonymous/citizen/suspended denial, validation, admin/system_admin changes, stale-version rejection, history and blocked collection side effects |
| Existing source workflow checks | **58 passed**, newly seeded disposable DB; no live government requests |
| Service Python tests | **15 passed**, parser/network-policy mocks |
| Map Python tests | **3 passed**, parser and collection-OFF network-boundary mocks |
| **Focused backend/Python total** | **93 passed** |
| Direct PHP worker with OFF | Printed OFF and returned without collecting |
| Direct service/map Python entry points with OFF | Refused before network access |
| Source-panel TypeScript check | PASS using a temporary narrow configuration, including actual imports |
| PHP syntax checks | PASS for changed controller, API router and worker |
| README backend setup | Composer autoloader regenerated in a clean temporary backend copy; additive migration and synthetic seeding succeeded in a separate SQLite DB |
| Manual component visual test | Desktop 1200×850 and mobile 390×844; reason validation, activation, deactivation, OFF status and disabled Check now inspected in an isolated fixture |
| Broader backend suite | **125 passed, 3 failed**, exit 1; details below |
| Whole frontend typecheck | **Blocked** by `OfficeLocatorPage.tsx` syntax errors; production build not reached by the chained gate |

The initial source test run against a copied database failed an existing “at least one service link added” assumption because the copy already had synchronized links. A fresh disposable seeded database passed all 58 checks. Neither run contacted government sites. The visual preview used mocked source API responses: it proves component appearance and button state transitions, not full remote integration. Real backend policy/authentication was checked separately.

The full suite does not include the specialized collection scripts; do not claim a clean aggregate release merely by adding the focused passing count to the broader passing count.

### Broader failures outside the changed collection files

- `RulesAndLedgerTest::test_20_public_codes_transfers_and_vault_documents_state_machine`: `BUYER_PARTY_NOT_FOUND`, HTTP 422.
- `SecurityWorkflowRegressionTest::test_04_citizen_cannot_self_verify_counter_biometrics_step_8_403`: fixture expected step-4 advance 200, received 422.
- `SecurityWorkflowRegressionTest::test_13_appointments_creation_and_listing_scoped`: fixture expected appointment 200, received 422.
- Whole frontend: `OfficeLocatorPage.tsx` lines 654–656 report missing `)` / unexpected expressions. An earlier gate also saw an AdminDashboard syntax error that was no longer present at the latest check. These other files changed during this work; no unrelated edit was made to remove these failures or relax guards. They may require fixture updates or implementation repairs; no cause beyond the observed responses is certified here.

## Current state and deployment limits

`local-setting.json` records the local usable database setting: **enabled=false**, version 1. No users, land records or passwords were reset or changed. Temporary synthetic databases were used for all toggle-on tests. The known previously started collector worker had already been stopped in the preceding rulebook review.

The user supplied:

- Frontend: https://bhumishield-web.onrender.com
- Backend: https://bhumishield-api.onrender.com

The external page-reading tool could not access either supplied destination during this task. No deployment/push or remote administrative setting change was performed. Therefore **the Render deployment is not certified updated or OFF**. Deploy this source/backend and frontend together, initialize the shared policy and verify OFF in that environment before judging. No remote readiness certification is implied by the README links.

## Rulebook disclosure

Government scraping is prohibited by supplied Rule Book v1.2. Retaining code while disabling execution follows the user's requested implementation, but does not establish organizer acceptance or undo earlier collection. README records the prior collection and calls for organizer assessment. No collection history was erased or concealed.

## Backup

The six originally targeted files were copied before editing to `/private/tmp/bhumishield-collection-toggle-backup-20261018/`. This is a local temporary targeted-file backup, not a new full project/database archive. Existing project backups were left untouched.
