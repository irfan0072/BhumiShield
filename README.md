# ভূমি সুরক্ষা (BhumiShield) — LandTech Innovation Hackathon 2026

> **Track:** Digital Land Records, Verification & Digitization (Daffodil International University)  
> **Pitch Line:** *"Registration and mutation don't talk to each other. We built the layer that checks every deed before it is registered, and proves afterwards that it was never tampered with."*

**ভূমি সুরক্ষা (BhumiShield)** হলো একটি স্বাধীন প্রাক-নিবন্ধন যাচাই ও ক্রিপ্টোগ্রাফিক হ্যাশ-চেইন লেজার প্রোটোটাইপ, যা বাংলাদেশের সাব-রেজিস্ট্রি (দলিল নিবন্ধন) এবং এসি ল্যান্ড (ই-নামজারি) সিস্টেমের মধ্যকার তথ্যগত বিচ্ছিন্নতা দূর করে।

> ⚖️ **আইনি নীতি (Advisory Role Only):** ভূমি সুরক্ষা শুধুমাত্র সম্ভাব্য ঝুঁকি ও অসামঞ্জস্যতা চিহ্নিত করে মানব কর্মকর্তাকে (সাব-রেজিস্ট্রার / এসি ল্যান্ড) সিদ্ধান্ত নিতে সহায়তা করে; এটি কখনোই চূড়ান্ত আইনি সত্য বা মালিকানা ঘোষণা করে না।  
> 🛡️ **হ্যাকাথন ডেটা নীতি (100% Dummy Data):** এই প্রোটোটাইপে ব্যবহৃত সকল নাম, এনআইডি নম্বর (`9900001001`–`9900001042`), ফোন নম্বর (`01700-001001`...), মৌজা, খতিয়ান ও দলিল **১০০% কাল্পনিক (Synthetic Dummy Data)**। কোনো সরকারি ওয়েবসাইট স্ক্র্যাপ করা হয়নি এবং কোনো লাইভ সরকারি সার্ভারে কল করা হয় না।

## ১. প্রজেক্টটি কীভাবে চালাবেন (How to Run)

### পদ্ধতি ক: Docker Compose দিয়ে (১ কমান্ডে সব চালু)

```bash
cp .env.example .env
docker compose up --build
```
- **Frontend Web App:** `http://localhost:5173`
- **Backend FastAPI & Swagger Docs:** `http://localhost:8000/docs`
- *(Docker Compose চালু হলে স্বয়ংক্রিয়ভাবে `python -m app.seed` রান হয়ে ৬০টি দাগ, ২৪০টি খতিয়ান, ৮০টি স্বাক্ষরিত দলিল ও ৮টি ডেমো সিনারিও তৈরি হয়।)*

### পদ্ধতি খ: লোকাল মেশিনে সরাসরি চালানো (Zero-Config SQLite / PostgreSQL)

**১. ব্যাকএন্ড (FastAPI) সিড ও চালু করা:**
```bash
cd backend
python3 -m app.seed
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**২. ফ্রন্টএন্ড (React + Vite + TypeScript + Tailwind CSS) চালু করা:**
```bash
cd frontend
npm install
npm run dev
```
এরপর ব্রাউজারে খুলুন: `http://localhost:5173`

**৩. টেস্ট স্যুট (`pytest`) চালানো:**
```bash
cd backend
python3 -m pytest
```

## ২. ডেমো লগইন অ্যাকাউন্টসমূহ (Demo Logins)

ইউজার ইন্টারফেসের উপরের হেডারে **১-ক্লিক রোল সুইচার (Role Switcher)** দেওয়া আছে, যাতে বিচারকগণ লগইন ফর্ম ছাড়াই তাৎক্ষণিক যেকোনো ভূমিকা পরীক্ষা করতে পারেন। এছাড়া `/api/v1/auth/login` এন্ডপয়েন্টে নিচের ডেমো ক্রেডেনশিয়ালগুলো কাজ করে:

| ভূমিকা (Role) | ইউজারনেম (`username`) | পাসওয়ার্ড (`password`) | কার্যালয় (ডেমো) |
| :--- | :--- | :--- | :--- |
| **নাগরিক (Citizen)** | `citizen` | `demo123` | নাগরিক পোর্টাল — সাভার, ঢাকা |
| **সাব-রেজিস্ট্রার (Sub-Registrar)** | `registrar` | `demo123` | সাব-রেজিস্ট্রি অফিস, সাভার, ঢাকা |
| **এসি ল্যান্ড (AC Land)** | `acland` | `demo123` | উপজেলা ভূমি অফিস, সাভার, ঢাকা |
| **ব্যাংক কর্মকর্তা (Bank Officer)** | `bank` | `demo123` | সোনালী ব্যাংক পিএলসি, সাভার শাখা |
| **অ্যাডমিন ও অডিটর (Admin)** | `admin` | `demo123` | কেন্দ্রীয় লেজার মনিটরিং সেল |

## ৩. প্রাক-নির্মিত ৮টি হ্যাকাথন ডেমো সিনারিও (8 Seeded Demo Scenarios)

`python -m app.seed` কমান্ডটি ৩টি মৌজায় (বিরুলিয়া, বাসন, পানাম) ৬০টি দাগ, ২৪০টি `CS→SA→RS→BS` খতিয়ান, ৪২ জন কাল্পনিক ব্যক্তি, ৮০টি হ্যাশ-চেইন দলিল এবং নিচের **৮টি বিশেষ ডেমো সিনারিও** তৈরি করে:

| নং | কোড (`code`) | দাগ ও দলিল | প্রত্যাশিত ফলাফল | কী পরীক্ষা করে? |
| :--- | :--- | :--- | :--- | :--- |
| **১** | `CLEAN_SALE` | দাগ ১০১ (`DL-2024-1001`) | **✔ নিরাপদ (`SAFE`)** | বৈধ মালিক ২০ শতাংশের মধ্যে ১০ শতাংশ বিক্রি করছেন; সকল খতিয়ান ও স্বাক্ষর সঠিক। |
| **২** | `DOUBLE_SALE` | দাগ ১০২ (`DL-2026-1002`) | **✖ ঝুঁকিপূর্ণ (`HIGH_RISK`)** | বিক্রেতা ইতিমধ্যে ১৫ শতাংশ বিক্রি করেছেন (নামজারি প্রক্রিয়াধীন), আবার দ্বিতীয় ক্রেতার কাছে বিক্রির চেষ্টা। |
| **৩** | `AREA_EXCEEDS_OWNED` | দাগ ১০৩ | **✖ ঝুঁকিপূর্ণ (`HIGH_RISK`)** | বিক্রেতা ১/২ অংশের (১২ শতাংশ) মালিক হয়ে ১৮ শতাংশ বিক্রির চেষ্টা করছেন। |
| **৪** | `SELLER_NOT_OWNER` | দাগ ১০৪ | **✖ ঝুঁকিপূর্ণ (`HIGH_RISK`)** | সর্বশেষ বিএস খতিয়ান ৪১০৪-এ বিক্রেতার নাম নেই (ভুয়া মালিক)। |
| **৫** | `DEED_TAMPERED` | দাগ ১০৫ (`DL-2026-1005`) | **✖ ঝুঁকিপূর্ণ (`HIGH_RISK`)** | নিবন্ধনের সময় ১০ শতাংশ জমি স্বাক্ষরিত হলেও পরবর্তীতে ডাটাবেজে ২৫ শতাংশ করা হয়েছে (SHA-256 হ্যাশ অমিল)। |
| **৬** | `PLOT_MORTGAGED` | দাগ ১০৬ (`DL-2026-1006`) | **✖ ঝুঁকিপূর্ণ (`HIGH_RISK`)** | সোনালী ব্যাংকে ২৫ লক্ষ টাকার সক্রিয় বন্ধক থাকা জমি পুনরায় বন্ধক বা বিক্রির চেষ্টা। |
| **৭** | `KHATIAN_CHAIN_BREAK` | দাগ ১০৭ | **⚠ সতর্কতা (`REVIEW`)** | সিএস, এসএ ও আরএস খতিয়ানে ১৮ শতাংশ কিন্তু বিএস খতিয়ানে কোনো দলিল ছাড়াই ২৬ শতাংশ রেকর্ডকৃত। |
| **৮** | `INHERITANCE_UNRESOLVED` | দাগ ১০৮ | **⚠ সতর্কতা (`REVIEW`)** | রেকর্ডীয় মালিক মৃত (`is_deceased=1`), কিন্তু ওয়ারিশ সনদ ও ওয়ারিশান নামজারি অমীমাংসিত। |

## ৪. রিপোজিটরি কাঠামো (Repo Structure)

```text
/backend
  ├── app/
  │   ├── ledger/       # SHA-256 hash chain, Ed25519 signing/verification, Merkle root & QR SVG
  │   ├── models/       # SQLAlchemy 2 declarative models (12 tables)
  │   ├── routers/      # REST API v1 endpoints (/verify, /ledger, /registrar, /mutations, /mortgages, /ocr)
  │   ├── rules/        # 9 pure fraud & discrepancy rules + Mock NID verification service
  │   ├── seed/         # Deterministic dummy data generator (`python -m app.seed`)
  │   ├── auth.py       # JWT Bearer authentication & RBAC guards
  │   ├── database.py   # PostgreSQL + SQLite zero-config adapter
  │   └── main.py       # FastAPI application entrypoint
  ├── alembic/          # Database migration scripts
  └── tests/            # Pytest suite for all 9 fraud rules, 8 scenarios & ledger tamper detection
/frontend
  ├── public/           # PWA manifest.json & offline service worker (sw.js)
  └── src/
      ├── api/          # Axios client with bilingual error extraction
      ├── components/   # Flag-themed Navbar, Accessibility toolbar, Hero VerdictBanner with Web Speech API
      ├── i18n/         # Bangla-first (bn-BD) & English toggle, Bangla numeral formatter, A+/A- scaling
      ├── pages/        # CitizenHome, VerifyDeedPage, CheckBeforeYouBuyPage, SubRegistrar, AcLand, Bank, Admin
      └── theme/        # Bangladesh flag design tokens (#006A4E, #F42A41, #B7791F, #FAFBFA)
/docs
  ├── ARCHITECTURE.md   # Mermaid diagrams & 1-page concept note explanation
  ├── INTEGRATION.md    # API Gateway integration with e-Registration, e-Mutation, DRR & Union offline note
  ├── RULES.md          # Complete documentation of all 9 fraud rules
  └── DEMO_SCRIPT.md    # Timed 3-minute hackathon pitch & live demo script
docker-compose.yml
README.md
```

## ৫. ফ্রি হোস্টিংয়ে লাইভ ডিপ্লয় করার ধাপ (Free Live Deployment Steps)

1. **ব্যাকএন্ড ও ডাটাবেজ (Render.com অথবা Railway.app — Free Tier):**
   - গিটহাব রিপোজিটরিটি Render-এ যুক্ত করুন।
   - একটি ফ্রি **PostgreSQL** ইনস্ট্যান্স তৈরি করুন অথবা ফ্রি ওয়েব সার্ভিসে রুট ডিরেক্টরি `backend` দিন।
   - **Build Command:** `pip install -r requirements.txt && python -m app.seed`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
2. **ফ্রন্টএন্ড (Vercel অথবা Netlify — Free Tier):**
   - রুট ডিরেক্টরি হিসেবে `frontend` নির্বাচন করুন।
   - **Build Command:** `npm run build` | **Output Directory:** `dist`
   - এনভায়রনমেন্ট ভেরিয়েবল দিন: `VITE_API_URL=https://your-bhumishield-api.onrender.com/api/v1`

## ৬. ওপেন-সোর্স লাইব্রেরি ক্রেডিট (Open-Source Credits)

- **Backend:** [FastAPI](https://fastapi.tiangolo.com/) (MIT), [SQLAlchemy 2](https://www.sqlalchemy.org/) (MIT), [Alembic](https://alembic.sqlalchemy.org/) (MIT), [Pydantic v2](https://docs.pydantic.dev/) (MIT), [pyca/cryptography](https://cryptography.io/) (Apache-2.0 / BSD), [python-qrcode](https://github.com/lincolnloop/python-qrcode) (BSD), [Pytest](https://pytest.org/) (MIT), [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) (Apache-2.0).
- **Frontend:** [React](https://react.dev/) (MIT), [Vite](https://vitejs.dev/) (MIT), [Tailwind CSS](https://tailwindcss.com/) (MIT), [Lucide Icons](https://lucide.dev/) (ISC), [Axios](https://axios-http.com/) (MIT), [Noto Sans Bengali & Hind Siliguri](https://fonts.google.com/) (OFL).

## ৭. ব্যবহৃত এআই টুলসমূহ (AI Tools Used — Hackathon Disclosure)

হ্যাকাথনের নিয়মাবলী অনুসারে স্বচ্ছতার জন্য উল্লেখ করা হচ্ছে:
- **Google Gemini (Autonomous Coding & UX Assistant):** আর্কিটেকচার ডিজাইন, ফাস্টএপিআই ও রিয়েক্ট কোড জেনারেশন, ৯টি জালিয়াতি শনাক্তকরণ রুল ও টেস্ট স্যুট লেখায়, এবং বাংলা ইউজার ইন্টারফেস ও ডকুমেন্টেশন তৈরিতে ব্যবহৃত হয়েছে।
- প্রজেক্টের সকল লজিক, ক্রিপ্টোগ্রাফিক হ্যাশ চেইন (`SHA-256` + `Ed25519`), এবং ডামি ডেটাসেট সম্পূর্ণভাবে স্থানীয়ভাবে যাচাইকৃত ও পরীক্ষিত।
