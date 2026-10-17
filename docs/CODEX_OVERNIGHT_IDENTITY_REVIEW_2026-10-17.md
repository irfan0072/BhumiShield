# Additional overnight identity/privacy findings

Observed after the 33-test baseline passed, around 03:13 Dhaka 17 October 2026. These probes used only a separately seeded disposable SQLite DB, never the live database. They are supplementary to the original role audit and must be revalidated after current agy changes.

Reproducer: `/private/tmp/bhumishield-overnight-20261017/identity_probes.php`.

## I01 — Unclaimed NID can claim an existing owner's portfolio

Public registration with a new username and synthetic NID9900001003 (present in persons but not yet in users) succeeds as citizen. The new account's vault links to that existing person and exposes two owned plots. Account-level NID uniqueness alone does not establish identity authority.

Required: unverified registration cannot gain owner authority through a self-declared NID. In demo mode, preserve usable seeded identities with an explicit synthetic verification path. Production must require an authorized verification workflow/provider or verified operator enrollment; no fake successful live check. Vault/lock/transaction permissions must use verified linked identity, not free-text claimed NID.

## I02 — Suspended admin can create an admin via public registration

Create a valid admin token in fixture, set that account is_active=0, then POST /auth/register with role=admin and a fresh NID. Actual result creates an admin. The public route calls registerUser, which trusts getAuthenticatedUser's role without the active-account check enforced by RoleMiddleware on protected routes.

Required: centralized authentication eligibility, including active account and session state, at every path that interprets an authenticated user. Public citizen registration must not allow optional invalid/inactive bearer credentials to gain officer provisioning authority. Test the real router paths, not only isolated role middleware.

## I03 — Password changes do not revoke old sessions

In fixture, obtain citizen token, change password with the correct old password, then reuse the old token. getAuthenticatedUser still accepts it. Token has no revocable session/version binding.

Required: persisted token/session version or revocation mechanism; invalidate previous sessions on password reset/change, deactivation or security-sensitive identity/role changes. Keep regular logout/revocation behavior defined and tested. Legacy local fixtures and active test actors need explicit migration-safe handling; never print tokens/secret values.

## I04 — Anonymous /persons endpoint exposes private directory fields

Anonymous GET /persons returns42 synthetic rows containing raw NID and address fields. These are synthetic currently, but the same code path would expose a real directory if populated with real records.

Required: safe public DTOs and scoped authenticated person search. Preserve the public pre-purchase workflow by looking up eligible recorded owners for the selected plot or taking a declared seller identity; do not expose the full private NID/address directory to populate a public dropdown. Mask/minimize public proof/vault/report identity fields as appropriate. Demo mode may expose clearly synthetic samples through a separate explicitly gated surface.

## Acceptance

Add focused isolated regressions for all four failures, including inactive-admin /auth/register, unverified existing-person linkage, old-token revocation and anonymous field exposure. Keep core public verification usable. Do not resolve a privacy defect by deleting all user-facing verification functionality. Existing test suites passing is not proof these flows are secure.

## I05 — Invalid/missing risk response can render as SAFE [source trace]

`frontend/src/api/client.ts` normalizeRiskBundle defaults missing verdict/status to SAFE, maps every unknown status to SAFE, and synthesizes ALL_CHECKS_PASSED if flags are absent. An empty/malformed response must instead become a useful verification-unavailable/error state. Required: validate the response contract, accept only known statuses with required evidence, never synthesize a successful integrity finding from missing data. Add malformed/empty/unknown-status adapter tests; preserve valid SAFE responses. This finding is source-traced rather than an injected browser-state test.

## Toolchain gap [source inspection]

Frontend strict tsconfig exists, but package scripts only run Vite build, and no local tsc binary is installed. The production bundler does not prove TypeScript type correctness. Add an intentional typecheck command and the minimal needed reputable dev dependencies if absent; Codex can install through npm after the editor identifies the required package changes. Do not silence meaningful type errors with blanket ts-ignore/strict=false. Keep this a targeted quality gate rather than an unrelated lint/tooling migration.

## Production configuration proof

Independent subprocess probes in production mode with temporary storage showed all four cases improperly accepted before phase1 completed: empty JWT secret, known demo JWT secret, empty Ed25519 seed, unreachable configured PostgreSQL silently falling back to SQLite. Reproducer/results: `/private/tmp/bhumishield-overnight-20261017/production_config_probes.py` and `production-config-probes.results.json`. These are explicit fail-closed release gates, not optional warnings. Test in subprocesses because keypair/config state can be cached in-process. Respect DB_PORT when supplied.

## I06 — Full HTTP workflow exposes public NOC route mismatch during edits

Expanded independent HTTP acceptance to43 assertions. It successfully prechecked/registered a4-decimal transfer on plot13, created exactly one mutation, approved it, conserved23 total decimals with seller19/buyer4, reflected the buyer vault and intact signature, created a new lien, rejected duplicate active lien, released it and issued a stable signed NOC. Public GET /verify/noc/{new_id}?h={prefix} then returned500: routes/api.php passes urldecode string to verifyLienNoc(int ...), with strict_types=1. This was observed while phase1 edits are in flight; do not interfere with that writer. Revalidate when the round completes, then repair any remaining route/controller contract mismatch. Details are in http-acceptance.results.json and http-e2e-baseline.log under the overnight temp folder.

## I07 — Seller fraction is stale after partial transfer [source trace / acceptance extension]

The mutation code updates seller area_decimal and share_float but leaves share_fraction at its pre-transfer value. For a23-decimal full owner selling4 decimals, the remaining19 should display19/23, not1/1. The HTTP acceptance harness now includes a44th check that every latest row's stored fraction agrees with its area/plot total. Also review buyers who already own a share: inserting multiple latest rows for one person is inconsistent with mutation's later selectOne seller balance, and can prevent a valid subsequent sale of aggregated holdings. Consolidate or deliberately support multiple lots with correct aggregate debiting; never discard ownership history.

## I08 — Concurrent requests bypass sequential guards [isolated real HTTP]

Around03:24 Dhaka, four simultaneous requests were sent through four PHP CLI HTTP workers against a disposable seeded SQLite DB. Mutation approvals returned200,409,200,200. Latest holdings became seller15 + buyer12 =27 decimals on a23-decimal plot. Four simultaneous duplicate-lien requests returned409,200,200,200 and persisted3ACTIVE liens on the same plot. Sequential duplicate tests had passed; they did not establish race safety.

Reproducer: `/private/tmp/bhumishield-overnight-20261017/concurrency_acceptance.py`; results `concurrency-acceptance.results.json`. The harness starts a separate process group and always terminates the server/workers; it never touches the live DB. Registration identifier/chain checks passed in this one run, but that is not a general database concurrency guarantee.

Required: transactional fresh state checks plus appropriate locking/conditional state transitions and constraints. Approval must have exactly one winner and conserved ownership; competing decisions return a domain conflict. Lien creation must have one winner, with a persisted uniqueness invariant matching the application's one-active-lien-per-plot policy; duplicate conflicts must not expose500. Audit append must remain in the same committed transaction. Test using real concurrent workers, not only sequential calls or disabled UI buttons. Preserve additive migration safety/history, and explicitly state supported DB adapters rather than claiming untested PostgreSQL correctness.

## Dependency audit snapshot

`npm audit --json` on the current lockfile reported7high advisories, all in the development-only puppeteer-core transitive tree (`extract-zip`, proxy/FTP dependencies); no production dependency advisories in this snapshot. Raw evidence: `/private/tmp/bhumishield-overnight-20261017/npm-audit-baseline.json`. Do not blindly apply the suggested major downgrade to Puppeteer19 or run audit fix--force. Assess actual tool use and current reputable compatible fixes; this installed development browser package is not used for Codex browser control. Preserve source scripts unless deliberately replacing/removing obsolete tooling with documented rationale. Runtime production risk and development tooling findings must be reported separately.

## I09 — Real QR URL fails on initial page load [browser verified]

After phase1, public API GET on the existing synthetic deed1 returns is_valid=true and verify_url `http://localhost:5175/verify/1?h=d8bf4d44ee45`. Opening exactly that returned URL through cua shows the input as `d8bf4d44ee45` and a record-not-found error. `VerifyDeedQrPage` currently chooses searchParamsh as queryDeed before extracting the path identifier; hash prefix is incorrectly used as a deed number. The NOC path with?h suffers the same precedence. Its API adapter also omits forwarding hash prefix.

Required: parse resource kind, path identifier and hash prefix separately. Support existing `/verify/{id}`, canonical `/verify/deed/{id-or-code}`, and `/verify/noc/{id-or-code}` as intended, preserve textual deed/NOC entry, forward and enforce optional hash prefix, and do not let stale session search override a direct proof URL. Numeric NOC identifiers must use NOC API rather than deed API. Reload/new-page URL verification must pass for valid stored proofs and fail clearly for bad hashes/tampering/unknown record; no synthesized proof success on missing fields. Screenshot: `/private/tmp/bhumishield-overnight-20261017/evidence/deed-qr-deeplink-before.png`.

### Phase1 verification outcome

Actual backend total35passed/2failed (18original +17/19audit), frontend buildpasses, HTTP43/44passes with stalefractionfailure. Two PHP failures are brittle old expectations: NOC URI assertsutf8 although generator uses validbase64SVG, and expectednumericNOCURL while implementation now returns persistednoc_no. Repair tests to validate the actual contract (configured origin, correct identifier, real decoded SVG and working route), not merely change working code to satisfy arbitrary encoding prefixes. The stalefraction and browserdeep-link defects are application failures. Phase1 report overstates support for allQR EClevels (source onlyLevelL) and claims noexternalbinary despite shell_execqrencodefirst in LedgerService; final docs must match source and independent evidence. `.env.example` stillpointsPUBLIC_VERIFY_BASE_URL at5173 and must align supportedlocalconfig whileproductionusesitsconfiguredorigin.

## I10 — Password storage and missing-password login remain demo-grade [source trace]

`JwtAuthService::hashPassword` uses a fixed shared salt with10000PBKDF2 iterations, so equal passwords produce equal hashes. `WorkflowController::login` substitutes `demo123` when the password is omitted. Production hardening must use PHP's native password_hash/password_verify (Argon2id where supported, or a documented appropriate supported default), automatically generated per-password salt, and password_needs_rehash. Keep verification compatibility for existing local hashes and upgrade after a successful authenticated login/change; never reset live passwords, expose hashes, or replace users. Reject an omitted/empty password; demo buttons may pass their explicit synthetic credential only in demo mode. New registration/password-change hashes must use the modern path.

Primary references: https://www.php.net/manual/en/function.password-hash.php , https://www.php.net/manual/en/function.password-verify.php , https://www.php.net/manual/en/function.password-needs-rehash.php .

Independent `password_acceptance.py` verifies random salts, native algorithm, correct/incorrect password handling and legacy compatibility without DB changes. Expanded HTTP acceptance injects one legacy hash only into its disposable fixture and requires successful login to upgrade it, and rejects an omitted password. Existing-user migration must preserve login access and data; no live password changes or reseeding are authorized.

## I01 migration extension — legacy accounts are automatically trusted

Independent upgrade test on a copy of the verified pre-work SQLite backup inserted one synthetic legacy citizen account linked to existing-person NID003 before running up(false). The new is_identity_verified column defaults1, automatically granting verified identity to an account for which no verification occurred. Restricting new registration alone does not close the legacy linkage path. Default unknown identities to unverified; synthetic demo users may be explicitly verified only through the gated synthetic seed/enrollment policy. Do not automatically trust arbitrary production legacy citizens by username/NID. Preserve their records and provide an accountable verification path; no forced password reset or deletion.

`migration_acceptance.py` currently6/7passes: every original row/value preserved, session-version column installed, repeated upgrade idempotent, conflicting active liens cause a failed migration with evidence preserved. Only automatic legacy identity trust fails. Both schema creation and ALTER/backfill defaults must match the verification policy. Migration tests operate on backup copies exclusively. Source backup stays read-only, live DB untouched.

## I05 regression extension — normalized fast path still bypasses validation

During phase2, the adapter now rejects empty/null responses. Independent source-extracted adapter tests show `{status:'APPROVED',findings:[]}` still returns unsupported APPROVED through the initial fast path; `{status:'SAFE',findings:[]}` and `{risk_report:{verdict:'SAFE'}}` still return SAFE without any supporting record/evidence. A known status alone cannot earn synthetic ownership/signature/lien success. Validate both normalized and bundle shapes, required record/evidence, numeric/array types and known statuses; retain real valid SAFE behavior. Missing evidence should show verification unavailable/error, never a manufactured successful finding.

Harness `risk_adapter_acceptance.py`/`.cjs` reads the current function and transpiles only that pure function using the existing local esbuild; it does not automate a browser, issue HTTP requests or edit source. Empty/null cases pass; three malformed status/evidence cases fail. Positive real-bundle control will be captured from the next isolated HTTP run (`risk-valid-sample.json`), so its current absence is missing test setup rather than a separate application defect. Automatic HTTP auxiliary gate now includes this check. Recheck settled phase2 implementation before final conclusions.

## Existing local upgrade/runtime observations —06:54 Dhaka

Browser on the current user-facing port5175 preserves Hind Siliguri, green homepage theme, no1280px overflow. Actual `/verify/1?h=d8bf4d44ee45` now renders DL-2026-1001 with real stored/recomputed hashes, valid signature, masked NIDs and survives reload. Altered prefix is rejected, but UI incorrectly declares stored deed tampering rather than explaining a URL-hash mismatch; distinguish these failure causes when practical. Screenshots saved by Codex in its evidence folder.

Public API on the existing local backend8008 returns500 for `/services` and `/fees`: no such table service_catalogue. `/health` returns200/ok. Router source calls unimported CreateBhumishieldTables inside a catch-all that silently suppresses initialization failure. Fresh seeded tests did not expose this old-database upgrade path. Deployment must use explicit safe additive migration and schema-aware readiness, with no demo auto-seeding or swallowed upgrade failures. Source-linked reference catalogue/fee content needs a non-destructive explicit initialization path for existing installations, rather than requiring fresh demo database reset. User-facing UI currently falls back to internal cards and category filters do not affect them; show a truthful empty/error state rather than pretending official catalogue loaded. Keep local existing records and accounts intact.

Phase4 is already active with startup/readiness requirements; revalidate current source after its completion before treating these interim observations as unresolved final findings.

## Navigation after proof links — browser/source verified

From a deed proof URL with?h, clicking Help changes only tab=help and leaves the proof pathname/hash. App.getInitialTab prioritizes those proof parameters overtab, so a reload returns to the deed verifier instead of Help. Landing navigation clears pathname but retains proof query parameters, causing similar refresh behavior. Make navigation generate a canonical destination URL and retain only parameters relevant to the destination. Allowlist tab values and ensure back/forward/reload match displayed page. Preserve direct proof URLs until the user deliberately navigates elsewhere. Current App.setActiveTab merely edits tab query, so this is a source-confirmed lifecycle issue. Verify after settled implementation rather than altering live fixtures.
