# Bangladesh land-service research and implementation decisions

Research date: 17 October 2026, Asia/Dhaka. Sources below are official public websites/circulars. This document distinguishes verified public guidance from product design and unverified integration requirements. Do not treat public website availability as permission/API access to protected government records.

## Verified service map

The central land portal lists mutation, land development tax, records/maps, acquisition/requisition, lease/settlement, administration, revenue cases, information services and complaint/technical support. Its public support number is 16122. Product decision: an admin-managed service catalogue may organize these destinations, with each card clearly stating whether it is an internal BhumiShield workflow or an external official service. [Official land portal](https://www.land.gov.bd/?lang=bn)

### Mutation / namjari

The official instructions describe an application and tracking process through AC Land. Submission has separate court and notice fees of BDT 20 and 50; approved applications have a subsequent BDT 1,100 DCR stage. Evidence differs by acquisition basis, including purchase, succession, gift or court decree. Identity/representative evidence, khatian/deed records, inheritance evidence where relevant and the latest tax receipt may be needed. The published instructions describe document-type tagging and file limits. Treat these as linked guidance with review dates rather than embedding universal rules without a source. [Official mutation instructions](https://mutation.land.gov.bd/nirdeshika)

Product decisions: use explicit draft/submitted/review/information-request/hearing/decision lifecycle; preserve officer reasons and time-stamped events. Internal simulated mutation must not imply that an actual government record changed. Never require a hearing in every case merely because the prototype button is named hearing.

### Land development tax

The official tax portal describes holding registration using an active mobile number, NID and birth date, and khatian/tax-receipt information. Its manual is a separate official resource. Product decision: provide source-linked preparation guidance and a link to the real service; do not calculate a legally final tax bill or issue an official dakhila without an authorized provider and verified payment callback. [Official tax portal](https://ldtax.gov.bd/), [manual](https://ldtax.gov.bd/manual)

### Records and mouza maps — material 2026 fee change

An older official service-fee summary still displays BDT 100 online khatian / 140 mailed certified copy and BDT 630 map figures. A newer Ministry circular dated **17 February 2026**, linked from its circular index, sets certified/online khatian copies at **BDT 100 government fee + BDT 20 service fee = BDT 120**, and each mouza-map sheet at **BDT 520 government fee + BDT 25 service fee = BDT 545**. It requires online fee payment. These amounts were visually read from the one-page signed circular; do not carry the older figures into the new catalogue. Shipping, scope or later changes must not be invented. [Older summary](https://lsg-portal.land.gov.bd/vumisheba-fee), [2026 signed circular](https://objectstorage.ap-dcc-gazipur-1.oraclecloud15.com/n/axvjbnqprylg/b/V2Ministry/o/office-minland/2026/1/474d0828-7c66-4f0d-98c3-78105e0009d9.pdf)

The Ministry index also lists subsequent notices affecting joint ownership, missing mutation records and mixed private/government-interest plots. We verified those titles/dates, not their full operative instructions; do not encode substantive rules from a title alone. [Ministry circular index](https://minland.gov.bd/pages/static-pages/694032df35ce18e1c0563b8d)

Product decision: keep a versioned fee catalogue with source URL, authority, effective/review date, status and separate fee components. Present informational estimates; official checkout remains the authoritative payable amount. Never lump mutation fees, deed registration taxes, map fees and BhumiShield charges into one unexplained total.

### Survey record status matters

The settlement portal says it presents khatians for ongoing surveys at publication stages and directs users to the land portal for completed records handed to district administration. Product decision: store survey type/year/status and provenance; a draft survey record must not silently become final evidence. Support actual survey types, including BRS/City/BDS where records warrant; do not enforce a universal CS→SA→RS→BS sequence for every parcel. [Official settlement portal](https://www.settlement.gov.bd/)

### Deed registration fees are a separate authority/source

The Directorate of Registration's published list includes a September 2025 fees/stamp-duty/tax document and earlier amendments. We located the official index but have not verified every rate and exception in the underlying schedules. Product decision: the current universal 7.5% shortcut must be labeled as a demo estimate or replaced with a source/effective-date-driven schedule after full rate verification. Do not claim a legally final government challan. [Official registration fee index](https://rd.portal.gov.bd/pages/static-pages/6922dc81933eb65569e10b8b)

### Complaints versus title disputes

The land portal's manuals index lists 2026 complaint-management guidance and a complaint flowchart. This establishes an official service-support process; it does not establish that a software-generated objection is a court injunction. Product decision: separate service complaints, ownership objections, officer review holds and court/order-backed restrictions, with evidence and authority recorded. A local owner sale lock is a BhumiShield safeguard, not a government registry freeze unless an authorized integration confirms one. [Official manuals index](https://www.land.gov.bd/manual?lang=bn), [Ministry complaint-guidance notice](https://minland.gov.bd/pages/notices/%E0%A6%85%E0%A6%AD%E0%A6%BF%E0%A6%AF%E0%A7%87%E0%A6%BE%E0%A6%97-%E0%A6%AC%E0%A7%8D%E0%A6%AF%E0%A6%AC%E0%A6%B8%E0%A7%8D%E0%A6%A5%E0%A6%BE%E0%A6%AA%E0%A6%A8%E0%A6%BE-%E0%A6%A8%E0%A6%BF%E0%A6%B0%E0%A7%8D%E0%A6%A6%E0%A7%87%E0%A6%B6%E0%A6%BF%E0%A6%95%E0%A6%BE-%E0%A7%A8%E0%A7%A6%E0%A7%A8%E0%A7%AC-vhvoa4-699448a66973d7dc51151d4f)

## What can be delivered locally

- Persisted, authorized BhumiShield workflows and complete administration of supported data/settings/content.
- Clear bilingual service guidance, authoritative external links and versioned informational fee components.
- Real local integrity/signature verification, atomic ownership accounting, scoped audit trails and honest demo/live boundaries.
- Deployment/backup/restore tooling, isolated regression tests and documented operational requirements.

## External prerequisites not established by research

No authorized API contracts, credentials or acceptance environment were supplied for NID verification, government mutation/record/tax systems, bank lien exchange, SMS/OTP or payment processing. Do not invent endpoint URLs or claim connectivity. A source-linked external-service handoff is valid; fake successful provider calls are not.

Release to real users additionally needs operator-approved hosting/domain/TLS, secrets and signing-key custody, retention/access policies, recovery testing, operational monitoring, accountable service ownership and provider authorization. These are release gates, not reasons to leave local features incomplete. Live payments and official submissions must remain disabled until the relevant provider is configured and tested.

## Research limitations

Some official pages rejected direct fetches while their public search index was readable. A staging records site also displayed BDT 120, but it was not used as the authority; the Ministry circular was. Only verified source content above should seed published guidance. Fee metadata must remain reviewable because portals and orders can change.

## Final workflow wording review (07:54 Dhaka)

Official e-mutation guidance describes documentary checks, decisions and record updates; local automatic case queuing is not an actual government mutation submission. The official circular index also describes online verification links between some AC Land and registry offices, so the homepage must not assert that there is universally no connection between offices. Scope product comparisons to the records and adapters actually available here. See [Ministry circular compilation](https://bhumipedia.land.gov.bd/last/act/view/321) and [official application/decision instructions](https://mutation.land.gov.bd/notification_and_rules/notification/E_namjari_system_application_dismiss.pdf). No live submission or new official integration was performed. Glossary content needs legal/content-owner review; avoid conflating Hiba and Hiba Bil Ewaz in generic gift labels.
