Audit and repair the existing BhumiShield project at http://localhost:5175. Read docs/CODEX_ROLE_AUDIT_2026-10-17.md first, including all 27 findings, evidence labels, code locations, coverage limits, and screenshots in docs/audit-evidence-2026-10-17/.

You are already making changes. Reproduce each finding against your latest code and mark it fixed, still reproducible, superseded, or unverified. Preserve your existing valid work. Do not assume a cosmetic fix resolves a workflow defect. The existing 18 backend tests and production build passed during the audit despite these failures.

Implement fixes, not just a plan. Work in this order:

1. Protect ownership and eligibility (F01–F09).
- Never issue a release NOC for an ACTIVE lien. Require persisted RELEASED state and authentic release metadata. Verify the signed certificate end to end.
- Block mutation approval for tampered/ineligible deeds. Make repeated or concurrent decisions idempotent/conflict-safe; one approval must apply one transfer exactly once.
- Enforce UPHELD_FROZEN as a durable transfer restriction across public, registrar, bank, registration and mutation paths. Supply open disputes to every evaluator. The registrar UI must use registrar pre-check, not the public shortcut.
- Require actual current ownership for citizen sale-lock actions, with defined co-owner and unlock rules.
- Reconciliation must conserve total land and owner shares, and must record real heir allocations rather than marking a deceased owner's heirs flag complete.
- Remove anonymous role fallback from protected HTTP requests. Tests should inject actors explicitly. Reject missing/invalid/expired/suspended credentials irrespective of optional settings.
- Reject negative/zero/nonfinite/out-of-range quantities, inconsistent fractions, invalid parties and invalid financial inputs. Do not silently evaluate different values from those shown in a report.

2. Repair lifecycle and authority boundaries (F10–F18).
- Use validated deed/mutation/dispute/lien state transitions, fresh eligibility checks, database transactions, scoped locks and uniqueness constraints. Keep ownership, signed deed, mutation queue and audit events consistent.
- Scope bank mutations to the authorized bank/branch while allowing appropriate cross-bank risk visibility.
- Fix unknown-NID fallback and unverified account linkage to existing NIDs. Separate public record lookup from private owner control.
- Fix admin direct-role switching: X-Admin-Supervisor-Token is omitted from allowed CORS headers; failed switching leaves the saved token attached to later requests. Implement atomic switch/rollback, active-supervisor validation, visible errors, and complete logout/expiry cleanup. Never fake authorization by changing client role state.
- Implement refresh-safe deed and NOC verification URLs using the actual configured origin. Preserve and verify QR hash parameters. Use real decodable QR output; remove decorative-QR fallback.
- Generate certificates from authoritative report snapshots with unique reference/time and actual outcomes. Remove unconditional Ed25519/chain-verified claims when no such proof exists.
- Wire supported policy settings to actual behavior and behavior tests. Keep authentication mandatory. Consolidate secure password-change validation and protect the final active admin.

3. Complete the UI and evidence (F19–F27).
- Render citizen deed proof/loading/error states; normalize OCR field/value/confidence contracts so no NaN appears.
- Remove silent dataset truncation. Search and paginate all eligible plots, people, deeds and cases; preserve selected record context.
- Map every dashboard action to its labeled destination. Global search must transfer and resolve its query. Chart range controls must filter data.
- Derive scoped dashboard metrics from records or clearly label demo samples; remove invented live trust percentages.
- Isolate/reset demo fixtures and target tamper/restore by authoritative record identity. Do not disable integrity checks to make a scenario green. Preserve the current REGISTERED-to-PENDING_MUTATION adapter mapping; that mapping already exists.
- Display full broken-ledger results separately from sampled preview blocks.
- Finish responsive, keyboard, modal, error-feedback, Bengali/English and print checks. Align OTP/biometric/OCR/official-certificate claims and fee-rate labels with actual supported demo behavior.

Validation is required before completion:
- Add meaningful HTTP-level and domain regressions for each critical issue in an isolated database; never reseed the running demo to run tests.
- Prove register → exactly one mutation → one approval → conserved seller/buyer ownership → updated citizen vault → verifiable deed.
- Prove citizen lock and dispute/freeze → consistent public/registrar/bank restriction → audited authorized release.
- Prove bank lien → duplicate-lien rejection → authorized release → stable signed NOC → public verification.
- Prove non-owner, wrong-role, anonymous, suspended, repeated and concurrent requests cannot bypass these rules.
- Log in separately as all five roles, test every distinct button/action destination, and record a coverage matrix. Explicitly identify anything not exercised.
- Check desktop and 360/390/430/768px layouts, modal scrolling, fixed navigation, long identifiers, both languages and print output.
- Re-run all tests and the production build. Deliver before/after screenshots, root causes, changes, exact validation results and remaining limitations. Do not declare completion solely because the old suite passes.

Keep the current Bengali/green identity and existing legitimate behavior. Avoid unrelated redesigns, speculative integrations and dependency upgrades. Do not erase audit history. The audit's synthetic objection DISP-2026-301 is already RESOLVED and plot 101 was restored to unlocked.
