# BhumiShield overnight release audit — 17 October 2026

**Decision: improved and tested codebase, with release blockers remaining. Do not label it fully production ready or claim every role/button was audited.** Implementation rounds stopped before09:00 Dhaka. Final verification and cleanup were performed when queued heartbeats were processed at12:09 onward. The heartbeat is now paused and normal display/idle sleep is restored.

## Backup and preservation

Original full workspace archive and consistent SQLite backup: `/Users/apple/BhumiShield-Backups/2026-10-17_03-01-19/`. Archive SHA256: `be5d1664c02a709761e86003cf2815d2bab3b65d4cdd9c5a54fa20f7894de52e`. Archive readability and separate-database restore/migration were checked. An extra `pre-additive-upgrade.sqlite` precedes the later safe guidance initialization. That upgrade preserved every original row/value across original columns:60plots,80deeds,7users. These figures describe that preservation checkpoint, not all later edits by other work.

No working database reset/reseed, real password change, identity/security grant, external deployment, payment or government submission was performed by this overnight audit. All consequential workflow tests used separate synthetic databases. Existing work and later changes were preserved.

## Implemented and independently verified

- Native salted password hashes and legacy successful-login rehash; explicit password requirement, inactive-account rejection, session revocation and verified-identity gating. Claimed NID alone no longer grants portfolio authority.
- Current-owner restrictions, dispute freezes, tampered-deed blocks, controlled mutation decisions, conserved partial ownership, repeated acquisition/resale and concurrent write conflict protections.
- Stable released-only NOC, actual decoded workflow QR payloads, configured-origin deep links and short-hash validation.
- Bank scope now uses assigned institution consistently for creation/release/NOC. Removed the Sonali-specific cross-bank bypass. Non-admin profile updates cannot self-reassign institution. Bank lists are scoped; missing assignment and generic bank names fail closed. Approved comma/em-dash office formats remain supported.
- Public risk/proof responses now remove private contacts, addresses, parent details and raw signed payloads, while masking NIDs after internal verification. Public dispute views minimize foreign complaint details. Actual signature verification remains valid.
- Source-linked service guidance and versioned fees. New services default to draft; publish/archive adapters match actual routes. Unverified registration assessment is unavailable in production. Official service/fee research is in the companion research document.
- Shared homepage typography uses Hind Siliguri for Bengali and Manrope for English, with intentional monospace identifiers. Removed competing serif display styles. Some expanded pages still need final visual QA.
- Persisted analytics replaced invented counts/trends/trust scores; CSV export uses actual data. Quick-action destinations were repaired. Bank form sends selected borrower/area and assigned bilingual institution instead of a generic bank and fixed area.
- Production admin loads real data independently of disabled demo requests. Demo switches/simulators were gated from the compiled UI. Profile UI now supplies current-password input for a credential change; no real credential was changed during testing.
- Printed risk assessment no longer uses a government header, reused certificate number or SAFE→Ed25519 proof assertion. Bad QR-link hashes have distinct messaging. Final rendered copies still need browser review.
- Production requests no longer migrate/reseed storage. Readiness validates schema/configuration. Added compiled Nginx/Apache runtime, persistent SQLite volume, additive startup migration and explicit first-operator enrollment without a default production account.

Antigravity applied the final scoped file edits through exact, independently prepared replacements after broad CLI sessions repeatedly read files without editing. File-edit capability was verified first. Denied Git-status and historical temporary-report access were never retried or bypassed; permission settings were not changed. Milestone reports were not treated as test proof.

## Final verification

| Check | Result | Limit |
|---|---|---|
| PHP suites | **61passed**:20domain,29role regression,6Tier B,6Tier C | Automated coverage; not every workflow combination |
| HTTP acceptance | **88/88passed** | Isolated synthetic database; last-admin target identified dynamically after role expansion |
| Auxiliary groups | **6/6passed** | Concurrent writes, production configuration, actual QR decoding, passwords, backup-copy migration, malformed risk adapter |
| Public-response privacy | **8/8passed** | Representative directory, plot-risk, proof, ledger and dispute responses; real signatures preserved |
| Production runtime/bootstrap | **17/17passed** | Separate fixture; no production account created on working DB |
| Strict TypeScript / Vite build | **Passed** | Large JS chunk warning remains; no final browser proof implied |
| Docker image build/runtime | **14/14passed earlier** | Earlier image snapshot; images were not rebuilt after the last source repairs |

Durable selected reports and log hashes: `docs/verification/2026-10-17/manifest.json`. The historically denied concurrency report was not accessed or copied; new concurrent observations were emitted by fresh tests.

The first cutoff HTTP run reported86/88 because a stale fixed user ID now pointed to a registrar, not the administrator. The test was corrected to resolve the administrator by username; the same full run then passed88/88. No application guard was weakened to pass it.

## Browser evidence and coverage

Browser QA used a separate synthetic database on5176 and a disposable Docker stack. Citizen login/vault/proof dialog, registrar held/fees navigation, bank filtering/authorization denial, AC Land queue/details/approved filter, and admin service creation plus persisted fee edit/history were exercised. Homepage1280 fonts/no overflow and proof reloads were checked in both languages. Mobile390 exposed a header overflow, which was patched in source. Original broader coverage is in `CODEX_ROLE_AUDIT_2026-10-17.md`; final discoveries are in `CODEX_FINAL_UI_FINDINGS_2026-10-17.md`.

The final60frontend replacements were independently checked present and typechecked/built, but the complete browser matrix was not rerun afterward. Additional role/staging/appeal changes appeared after09:00, including seed/type changes at10:31/11:25. Those changes were preserved and included in available final automated checks. The original five-role browser audit does not certify all newly added roles or modules.

## Remaining release blockers

1. **Dynamic site content is incomplete.** Help FAQ/glossary remain hardcoded. Generic site-settings updates still lack a bounded typed allowlist and some fields have no public consumer. Complete usable bilingual admin controls, safe rendering, atomic validation and reload persistence.
2. **AC Land action feedback remains incomplete.** Current decision/reconciliation handlers still await requests without local error handling and use canned completed-hearing notes. Add visible modal/page denials, pending guards and entered reasons/evidence.
3. **Content/editor completeness and accuracy need review.** Expose all supported bilingual catalogue/fee fields and publication controls; remove remaining universal survey-sequence and official-integration claims. Revalidate printed assessments, QR mismatch copy and official source currency in both languages.
4. **Final role/mobile/production browser verification is outstanding.** Cover the added roles, staging/appeal workflows, object scope, keyboard/high contrast, mobile dialogs and actual compiled production admin. Rebuild final Docker images and rerun runtime/browser tests.
5. **Real-service operations and provider authority are not supplied.** Domain/TLS/hosting, official records/identity enrollment, authorized government/bank/payment adapters and callbacks, recovery/SMS if offered, privacy/retention, monitoring/abuse controls, accountable stewardship and release sign-off remain operator gates. PostgreSQL/key rotation are not deployment-certified.

No complete official-service integration or legal-title assurance is claimed. The supplied code and tests are a substantial improvement, but these blockers prevent a truthful declaration that the entire project is dynamic and service ready.

## Handoff and shutdown

Copyable continuation instructions: `docs/ANTIGRAVITY_FINAL_HANDOFF_2026-10-17.md`. Use a newly authorized work session; no new implementation round was started after the cutoff. Read the current code first and preserve newer work.

Heartbeat paused. Overnight caffeinate process87078 and isolated test processes9872/9873 stopped after identity checks. Disposable QA containers stopped; their volume/evidence was retained. Only the audit's temporary browser tabs were closed. User-facing project servers were not stopped by cleanup.
