# সরকারি উৎস সংগ্রহ ও নাগরিক সহায়িকা — ১৮ অক্টোবর ২০২৬

## কী চালু হয়েছে

১. মন্ত্রণালয়ের পরিপত্র ও প্রকাশিত ফি পেজের পরিবর্তন পর্যবেক্ষণ। সূচির পৃথক সারিও পর্যালোচনার তথ্য হিসেবে আসে; অন্য হোস্টে থাকা PDF স্বয়ংক্রিয়ভাবে নামানো হয় না।
২. অফিস/সিটিজেন চার্টারের প্রকাশ্য তথ্য ও লিংক সংগ্রহ। অ্যাডমিন যাচাই করে বিদ্যমান অফিস ও মৌজার সঙ্গে তথ্য যুক্ত করতে পারেন। কোনো কর্মকর্তা বা এখতিয়ার নিজে থেকে বদলায় না।
৩. সরকারি নির্দেশিকা থেকে প্রকাশ্য পেজের তথ্য সংগ্রহ এবং পর্যালোচকের মাধ্যমে সেবাভিত্তিক কাগজপত্র, করণীয় ধাপ ও উপস্থিতির নির্দেশনা প্রকাশ।
৪. সরকারি ম্যাপপ্রাপ্তির তথ্য ও পোর্টালের উৎসতালিকা; প্রকাশিত তথ্যকে নিবন্ধিত মৌজার ম্যাপের সঙ্গে যুক্ত করার ব্যবস্থা।
৫. প্রকাশ্য নোটিশ সংগ্রহ, অ্যাডমিন-নির্ধারিত মৌজা ও সময়সীমা, মেয়াদোত্তীর্ণ চিহ্ন এবং নাগরিকের মৌজা অনুসরণ। অনুসরণ করা এলাকার ও সাধারণ নোটিশ ফিল্টার করে দেখা যায়; ইমেইল/SMS পাঠানো হয় না।
৬. বিদ্যমান service catalogue-এর সরকারি URL আলাদা link monitor হিসেবে যোগ করা। সফল HTTPS public-page response মানে পেজটি খোলা গেছে; আবেদন/পেমেন্ট ব্যবস্থা সচল থাকার নিশ্চয়তা নয়।

সুপার অ্যাডমিন: `/bn/admin?section=integrations` → **সরকারি উৎস ও তথ্য হালনাগাদ**।
নাগরিক: `/bn/help` → **আমার জমির পরবর্তী করণীয়**।
যাচাইকৃত অফিস, নোটিশ ও ম্যাপের তথ্য সংশ্লিষ্ট পেজেও দেখা যায়।

## প্রকাশের নিয়ম

- সংগ্রহ → PENDING → মূল উৎস পড়া → নিজের ভাষায় সারাংশ/প্রযোজ্য তারিখ/সেবা/এলাকা নির্ধারণ → প্রকাশ।
- পরিপত্র/ফি প্রকাশে স্মারক ও কার্যকারিতার তারিখ প্রয়োজন। GUIDE প্রকাশে সেবা, কাগজপত্র, ধাপ ও উপস্থিতির নির্দেশনা প্রয়োজন।
- আগে প্রকাশিত তথ্যের নতুন সংস্করণ এলে UPDATE_PENDING দেখায়। সর্বশেষ সীমিত সংগ্রহে পুরোনো তথ্য পাওয়া না গেলে SOURCE_MISSING দেখায়। এটিকে সরকারি নথি বাতিল হওয়ার প্রমাণ বলা হয় না।
- উৎস অপ্রাপ্য বা সময়সীমা অতিক্রান্ত হলে STALE; শেষ অনুমোদিত তথ্য থাকে।
- প্রত্যাহার, পুরোনো সংস্করণ ফিরিয়ে আনা, সিদ্ধান্তের কারণ ও ইতিহাস রয়েছে। নতুন অমীমাংসিত পরিবর্তন থাকলে পুরোনো তথ্য পুনঃপ্রকাশ আটকে যায়।
- একই সময়ে পরিবর্তন রোধে version check ও transaction; PostgreSQL-এ monitor-row lock আছে। PostgreSQL-এ বাস্তব পরীক্ষা করা হয়নি।
- প্রকাশ করলে বিদ্যমান transaction fee, ownership, office jurisdiction বা permission বদলায় না। ফি রেজিস্ট্রি তুলনার জন্য দেখানো হয়; সংশোধন বিদ্যমান সেবা ও ফি মডিউলে করতে হয়।

## নাগরিকের ব্যবহারপথ

জমির অবস্থান + প্রয়োজন → বিদ্যমান প্রকাশিত সেবা → যাচাইকৃত প্রস্তুতির checklist → রেজিস্ট্রিতে সংরক্ষিত ফি ও উৎস → এলাকার অফিস/যোগাযোগ → সরকারি সেবা/মৌজার ম্যাপ/সহায়তা।

Checklist-এ টিক দেওয়া নথি যাচাই বা আবেদন জমার প্রমাণ নয়। এখনো পর্যালোচক checklist প্রকাশ না করলে সিস্টেম সেটি স্পষ্ট করে, কোনো বানানো তালিকা দেখায় না। এলাকার অফিসকে সুনির্দিষ্ট সরকারি এখতিয়ার বলে দাবি করে না। সংযুক্ত office_id অনুসারে সঠিক অফিস খোলে; “সব অফিস দেখুন” দিয়ে directory-তে ফেরা যায়।

পুরোনো তিনটি fee code-এর সঙ্গে service code-এর অমিল সংশোধন করা হয়েছে। টাকার পরিমাণ বা সরকারি বিধি পরিবর্তন করা হয়নি।

## বাস্তব সংগ্রহের ফল

প্রথম যাচাই শেষে মূল ডাটাবেজে:

- ১২টি monitor: ৮টি প্রাথমিক উৎস + service catalogue-এর ৪টি আলাদা সরকারি লিংক।
- ১১টি উৎস সফলভাবে পরীক্ষা হয়েছে।
- ৫৯টি তথ্য পর্যালোচনার অপেক্ষায়; কোনো সংগৃহীত তথ্য স্বয়ংক্রিয়ভাবে প্রকাশ করা হয়নি।
- DLRS-এর নির্দিষ্ট ম্যাপপ্রাপ্তির পেজে TLS certificate issuer verification ব্যর্থ হয়েছে। যাচাই বন্ধ রাখা হয়েছে; certificate protection দুর্বল করা হয়নি। সরকারি map.land.gov.bd উৎস সফল হয়েছে।
- নোটিশের বাংলা slug URL percent-encode করার সমস্যা সংশোধনের পর ১০টি তথ্য এসেছে।

বর্তমান ফল: `service-intelligence-2026-10-18/live-source-status.json`। ভবিষ্যৎ সংগ্রহে সংখ্যা বদলাবে।

## সংগ্রাহক চালানো

নতুন project worker স্থানীয়ভাবে চালু করা হয়েছে। এটি প্রতি ১৫ মিনিটে দেখে কোন enabled উৎস তার নির্ধারিত ২৪–৭২০ ঘণ্টার ব্যবধান অনুযায়ী পরীক্ষা করা দরকার; প্রতি চক্রে সর্বোচ্চ ২টি উৎস পরীক্ষা করে। এই process/কম্পিউটার বন্ধ হলে সংগ্রহ বন্ধ হবে। OS startup বা বাইরের hosting-এ কিছু স্থাপন করা হয়নি।

Backend `.env`-এ পরীক্ষিত স্থানীয় Python interpreter যুক্ত হয়েছে। অন্য পরিবেশে নিজস্ব absolute Python 3 path দিন।

```sh
# Repository root থেকে; সক্রিয় DB-তে additive source tables তৈরি করে, business data মুছে না।
php tools/service_sources/worker.php --migrate

# বর্তমান প্রকাশিত catalogue-এর সরকারি URL পর্যবেক্ষণে যুক্ত করে।
php tools/service_sources/worker.php --sync-links

# একবার due sources পরীক্ষা; সর্বোচ্চ ১–৮টি।
php tools/service_sources/worker.php --limit=2

# দীর্ঘমেয়াদি project worker; supervisor/container দিয়ে পরিচালনা করা যায়।
php tools/service_sources/worker.php --watch --limit=2

# নির্দিষ্ট উৎসের manual recheck; ৫ মিনিট cooldown প্রযোজ্য।
php tools/service_sources/worker.php --source=notices --limit=1
```

স্বতন্ত্র worker image-এর Dockerfile `tools/service_sources/Dockerfile`; build context repository root। API-র একই database/config এবং উপযুক্ত persistent volume লাগবে। বিদ্যমান API image কেবল backend folder কপি করলে tools folder আলাদাভাবে যুক্ত করতে হবে; dashboard collection-এর জন্য Python executable ও tools path দুটোই প্রয়োজন। Docker image build/deployment এই কাজের অংশ হিসেবে করা হয়নি।

## সীমা ও নিরাপত্তা

- HTTPS `.gov.bd` প্রকাশ্য text page; credentials/query-bearing URL, login/admin/API/search endpoint বাদ।
- DNS-এর সব resolved address public হতে হয়; সংযোগ সেই IP-তে pin হয় এবং hostname/certificate যাচাই থাকে। redirect একই origin-এ এবং robots policy মেনে হয়।
- robots.txt যাচাই, প্রতিটি host-এ ন্যূনতম বিরতি, bounded requests/timeout, সর্বোচ্চ ২ MB response। ভাঙা/অজানা নথির পরিবর্তে ব্যর্থতার কারণ রাখা হয়।
- ব্যক্তিগত NID, biometric, মালিকানার search result, ব্যক্তিগত মামলা, login/CAPTCHA bypass, map tile bulk download বা সরকারি জমাদান নেই।
- পর্যবেক্ষণে content hashes ও সীমিত extracted evidence থাকে; পুরো PDF/HTML-এর স্থায়ী archival mirror বা OCR ব্যবস্থা নয়। JavaScript/PDF-নির্ভর মূল বিষয়বস্তু HTML-এ না থাকলে পর্যালোচককে মূল নথি পড়তে হবে।
- দেশের সব অফিস/মৌজার authoritative dataset সংগ্রহ হয়নি। বিদ্যমান নিবন্ধিত locations/offices ব্যবহৃত হয়েছে; context-এ প্রতি তালিকায় সর্বোচ্চ ২০০০ এবং review/public list-এ ২৫০ তথ্য। জাতীয় পর্যায়ের catalogue, pagination/indexing ও load validation আলাদাভাবে প্রয়োজন।
- অপ্রকাশিত সংগৃহীত তথ্য যাচাই করা content reviewer-এর কাজ। স্থানীয় ব্যবস্থাটি সম্পন্ন হওয়া মানে সব সরকারি তথ্য বর্তমান ও আইনগতভাবে অনুমোদিত হয়ে গেছে নয়।

## যাচাই

- Source workflow: **৫৭টি পরীক্ষা পাস** — authorization, suspended user, unsafe URL, deduplication, pending visibility, version conflict, date/reference/checklist validation, replacement/rollback/withdrawal, stale/missing source, deadline, subscriptions, service-fee relationship, idempotent link synchronization, fee/ownership/office preservation।
- Python collector: **১১টি পরীক্ষা পাস** — private-IP rejection, robots denial, Unicode URL, circular rows, semantic change, script/external-link exclusion, bounded extraction, configured service-link health check।
- Existing map backend: **২১টি regression পরীক্ষা পাস**; পুরোনো map collector-এর **২টি পরীক্ষা পাস**।
- TypeScript typecheck এবং production frontend build পাস। মোট **৯১টি automated check**।
- আলাদা SQLite database ও আলাদা localhost server-এ manual visual verification: প্রয়োজন → কুমিল্লার মৌজা → নামজারি সেবা → checklist tick ও সঠিক fee association; admin login → source review form → publish confirmation; admin button → real official map collection → pending queue। মোবাইল বিন্যাস দেখা হয়েছে।
- পরীক্ষার ব্যবহারকারী ও প্রকাশিত synthetic guide কেবল disposable DB-তে। মূল ডাটাবেজে QA account/guide যোগ হয়নি।
- স্ক্রিনশট ও logs: `docs/service-intelligence-2026-10-18/`। QA servers বন্ধ করে মূল 5175/8008 server অক্ষত রাখা হয়েছে।

## উৎস ও ব্যাকআপ

- https://minland.gov.bd/pages/static-pages/694032df35ce18e1c0563b8d
- https://lsg-portal.land.gov.bd/vumisheba-fee
- https://minland.gov.bd/pages/static-pages/694032df35ce18e1c0563bde
- https://bhumipedia.land.gov.bd/ebook/view/747
- https://dlrs.gov.bd/pages/static-pages/6922dcc6933eb65569e11fd2
- https://minland.gov.bd/pages/notices
- https://minland.gov.bd/pages/static-pages/694032b235ce18e1c0560c12
- https://map.land.gov.bd/

ব্যাকআপ: `.backups/service-intelligence-2026-10-18/` — consistent SQLite before-copy, প্রাথমিকভাবে পরিবর্তিত integration pages/routes এবং স্থানীয় collector runtime যোগের আগের environment file। কোনো reset/reseed হয়নি। প্রয়োজন হলে পুরো backup DB অন্ধভাবে restore করবেন না; এর পরে হওয়া অন্য কাজ হারাতে পারে।
