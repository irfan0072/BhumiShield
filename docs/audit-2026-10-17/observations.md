# Raw audit observations — superseded by the finalized audit

Final findings, qualifications and coverage are in `docs/COMPLETE_VISUAL_WORKFLOW_AUDIT_2026-10-17.md`. The notes below retain discovery context and are not the release verdict.

Read-only application audit, synthetic DB and isolated local servers. Current source manifest in /private/tmp/bhumishield-complete-audit-20261017/source-manifest-start.json. Coverage and AX/screenshots saved separately; findings must be finalized with line citations and reproduction.

- R01 Routing: Map → Audit Plot in BhumiShield changes URL to /en/check?dag=101 but renders empty main and citizen sidebar, no error. Both immediate and settled snapshots remain blank. Source likely onNavigate includes query in tab key; verify before final. Evidence map-to-check-loaded.png/txt.
- R02 Map data relationship: select Chattogram (district/upazila/mouza cascades), Go to Plot: details show Chattogram district with Birulia JL12, area20. Static/different geography mixed. Evidence map-geography-mismatch screenshot/AX.
- R03 Map official/trust claims: National Portal, Ministry of Land national project and16122(24/7), cadastral/satellite/trust modes presented as actual government map. Needs data provenance and simulation labeling; inspect implementation/layers. English UI retains Bengali selectors/callouts. Evidence map-en/map-satellite-visible.
- R04 Listing detail→Express Interest: dag/mouza blank in inquiry modal; array item shape differs from loaded detail. Submitted only synthetic local inquiry, not real offer. Details for listing201 show TotalDocs0/Verified0 but BS Khatian ✓stored. Need underlyingvaultdata proof. Evidence market-details/inquiry snapshots.
- Visual:1280 homepage/public navigation wraps Help/CitizenVault to another row, truncates brand tagline. No document horizontal overflow at this viewport; Bengali main fontHindSiliguri/EnglishManrope consistent for inspected pages.
- R05 High: Office booking only sets client `bookingSuccess=true` and resets after2200ms (OfficeLocatorPage122–132); synthetic submission displayed booked-success without API/persisted appointment/slot/provider. Do not claim booking complete.
- R06 High: Notice modal claims verified Government of Bangladesh signature, presents generated hash/file size and a hardcoded .gov.bd QR URL; download target is only #download-2. No real PDF endpoint or signature-verification result used. Evidence notice-seal-modal. Download click timed out at browser transport; actualhref inspected as fragment, not a PDF.
- R07 Medium: Office View on Map navigates generic /en/map at Birulia default plot101, not selected office location. No office marker/directions.
- Blog article detail shows only one-sentence description despite8minute read marker; check backendcontent/UI mapping. Helpful vote once becomesThankYou1 and repeat does notincrement (pass).
- Public risk flow passes negative-area rejection, validreport and all8fraudscenarios expectedstatus; printpreview NIDmasked and corrected independentheader. Still broadSafe&Verified/universalchainlanguage and unsavedreport (scope/copyprecision).
- Guest QR page exposes tamper/restore actions that backendrejects; valid/unknown/tampered lookups displayed results. Needproductionvisibilitytest, misleadingrolegatedcontrols.
