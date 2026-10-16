# আর্কিটেকচার ও কনসেপ্ট নোট — ভূমি সুরক্ষা (BhumiShield)

> **পিচ লাইন (Pitch Line):**  
> *"Registration and mutation don't talk to each other. We built the layer that checks every deed before it is registered, and proves afterwards that it was never tampered with."*  
> *(সাব-রেজিস্ট্রি ও ই-নামজারি সিস্টেম একে অপরের সাথে কথা বলে না। আমরা এমন একটি স্বাধীন বিশ্বাস স্তর তৈরি করেছি যা নিবন্ধনের আগেই প্রতিটি দলিল যাচাই করে এবং নিবন্ধনের পরে প্রমাণ করে যে দলিলের কোনো তথ্য পরিবর্তন করা হয়নি।)*

## ১. এক পাতার কনসেপ্ট নোট সারাংশ (One-Page Concept Note Summary)

### সমস্যা (The Problem)
বাংলাদেশে ই-নামজারি (e-Mutation), ডিজিটাল রেকর্ড রুম (DRR) এবং অনলাইন দলিল ডিজিটাইজেশন চালু থাকলেও:
1. **বিচ্ছিন্ন সিস্টেম:** দলিল নিবন্ধন (সাব-রেজিস্ট্রি অফিস, আইন মন্ত্রণালয়) এবং নামজারি/খতিয়ান হালনাগাদ (এসি ল্যান্ড অফিস, ভূমি মন্ত্রণালয়) দুটি ভিন্ন সিস্টেমে পরিচালিত হয়।
2. **নিবন্ধন-পূর্ব যাচাইয়ের অভাব:** দলিল রেজিস্ট্রির মুহূর্তে সাব-রেজিস্ট্রারের কাছে স্বয়ংক্রিয়ভাবে সর্বশেষ বিএস খতিয়ানের মালিকানা অংশ, পূর্ববর্তী অনিষ্পন্ন বিক্রয় দলিল বা ব্যাংকের সক্রিয় বন্ধক (Lien) যাচাইয়ের রিয়েল-টাইম টুল নেই।
3. **নিবন্ধন-পরবর্তী টেম্পারিং ও জালিয়াতি:** জাল দলিল তৈরি, একই জমি একাধিক ক্রেতার কাছে বিক্রি (Double Sale), নিজের অংশের চেয়ে বেশি জমি বিক্রি, এবং বালাম/ডাটাবেজে জমির পরিমাণ গোপনে পরিবর্তন করার ঝুঁকি থেকে যায়।

### সমাধান: ভূমি সুরক্ষা (BhumiShield)
**ভূমি সুরক্ষা (BhumiShield)** কোনো বিদ্যমান সরকারি সিস্টেমকে প্রতিস্থাপন করে না; বরং একটি **স্বাধীন ক্রিপ্টোগ্রাফিক ট্রাস্ট ও ভেরিফিকেশন লেয়ার (Independent Trust Layer)** হিসেবে তাদের মধ্যে সংযোগ স্থাপন করে:
1. **নিবন্ধন-পূর্ব মালিকানা ও জালিয়াতি যাচাই (Pre-Registration Fraud Engine):** দলিল স্বাক্ষরের আগেই ৯টি স্বয়ংক্রিয় নিয়মের মাধ্যমে সিএস→এসএ→আরএস→বিএস খতিয়ান চেইন, মালিকানা ভগ্নাংশ (`১/২`, `১/১`), ডাবল সেল, ব্যাংক মর্টগেজ এবং মক এনআইডি যাচাই করে।
2. **টেম্পার-এভিডেন্ট হ্যাশ-চেইন লেজার ও Ed25519 স্বাক্ষর:** প্রতিটি নিবন্ধিত দলিল ক্যানোনিকাল JSON আকারে `SHA-256` হ্যাশ করে পূর্ববর্তী দলিলের হ্যাশের (`prev_hash`) সাথে যুক্ত করা হয় এবং সাব-রেজিস্ট্রারের `Ed25519` প্রাইভেট কি দিয়ে ডিজিটাল স্বাক্ষর করা হয়। সাথে একটি ডেইলি মার্কেল রুট (Daily Merkle Root Anchor) এবং পাবলিক কিউআর কোড (`QR Code`) তৈরি হয়।
3. **নাগরিকদের জন্য সহজ বাংলায় ‘জমি কেনার আগে যাচাই’ (Check Before You Buy):** যেকোনো সাধারণ নাগরিক লগইন ছাড়াই QR কোড স্ক্যান করে বা মৌজা-দাগ নম্বর দিয়ে এক পাতার সহজ বাংলা রিপোর্ট (ও `🔊 শুনুন` অডিও পাঠ) পেতে পারেন।

> **আইনি নীতি (Legal Advisory Principle):**  
> ভূমি সুরক্ষা শুধুমাত্র সম্ভাব্য ঝুঁকি ও তথ্যের অমিল চিহ্নিত করে মানব কর্মকর্তাকে (সাব-রেজিস্ট্রার / এসি ল্যান্ড) সিদ্ধান্ত নিতে সহায়তা করে; এটি কখনোই চূড়ান্ত আইনি মালিকানা ঘোষণা করে না।

## ২. সিস্টেম আর্কিটেকচার ডায়াগ্রাম (Mermaid Architecture Diagram)

```mermaid
flowchart TB
    subgraph Citizens_And_Officers["ব্যবহারকারী ইন্টারফেস (React + Vite + Tailwind PWA)"]
        C["👤 নাগরিক পোর্টাল\n(QR স্ক্যান ও কেনার আগে যাচাই)"]
        SR["🖋️ সাব-রেজিস্ট্রার\n(প্রাক-নিবন্ধন উইজার্ড)"]
        AC["🏛️ এসি ল্যান্ড\n(ই-নামজারি কিউ)"]
        BK["🏦 ব্যাংক কর্মকর্তা\n(জামানত ও বন্ধক যাচাই)"]
        AD["🛡️ অ্যাডমিন ও অডিটর\n(লেজার ও লাইভ টেম্পার সিমুলেটর)"]
    end

    subgraph BhumiShield_Core["ভূমি সুরক্ষা কোর API (FastAPI + Pydantic v2)"]
        GW["REST API Gateway (/api/v1/*)\nJWT RBAC + Bilingual JSON"]
        RE["Fraud Rules Engine (app/rules/)\n9 Pure Independent Rules"]
        LC["Cryptographic Ledger (app/ledger/)\nSHA-256 Hash Chain + Ed25519 + Merkle Root"]
        OCR["Bangla Khatian OCR (Tesseract ben)"]
    end

    subgraph Mock_Adapters["ইন্টারঅপারেবিলিটি অ্যাডাপ্টার (ডেমো / মক)"]
        NID["Mock NID Registry\n(100% Synthetic Data)"]
        DRR["CS -> SA -> RS -> BS\nKhatian Chain Store"]
        DB[("PostgreSQL 16 / SQLite\nTamper-Evident Tables")]
    end

    C & SR & AC & BK & AD --> GW
    GW --> RE
    GW --> LC
    GW --> OCR
    RE --> NID
    RE --> DRR
    LC --> DB
    RE --> DB
```

## ৩. ক্রিপ্টোগ্রাফিক হ্যাশ-চেইন ও ভেরিফিকেশন ফ্লো (Sequence Diagram)

```mermaid
sequenceDiagram
    participant SR as সাব-রেজিস্ট্রার (Sub-Registrar)
    participant API as BhumiShield API
    participant Engine as Fraud Rules Engine
    participant Ledger as Ed25519 Hash-Chain Ledger
    participant Citizen as নাগরিক (QR Scanner)

    SR->>API: POST /api/v1/registrar/pre-check (Plot, Seller, Buyer, Area)
    API->>Engine: Evaluate 9 Fraud Rules (CS->BS chain, shares, liens, double sale)
    Engine-->>API: Verdict (SAFE / REVIEW / HIGH_RISK) + Bangla Reasons
    API-->>SR: Display Banner & Evidence

    SR->>API: POST /api/v1/registrar/register-deed
    API->>Ledger: Canonicalize JSON + Link prev_hash + Compute SHA-256
    Ledger->>Ledger: Sign content_hash with Registrar Ed25519 Private Key
    Ledger-->>API: Stored Deed + QR SVG (/verify/{deed_id}?h={short_hash})
    API-->>SR: Signed Deed Receipt + Auto-Created AC Land Mutation Case

    Citizen->>API: GET /api/v1/verify/deed/{deed_id} (Scan QR)
    API->>Ledger: Recompute SHA-256 from stored JSON & verify Ed25519 signature
    Ledger-->>Citizen: ✔ নিরাপদ (Intact) OR ✖ ঝুঁকিপূর্ণ (Tampered Field Diff)
```
