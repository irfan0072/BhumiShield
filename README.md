# ভূমি সুরক্ষা (BhumiShield) — LandTech Innovation Hackathon 2026

> *"Registration and mutation don't talk to each other. We built the layer that checks every deed before it is registered, and proves afterwards that it was never tampered with."*

## 1. Overview & Legal Disclaimer
**BhumiShield ("ভূমি সুরক্ষা")** is an independent pre-registration verification and tamper-evident hash-chained ledger layer connecting Sub-Registry (Ministry of Law), AC Land (Ministry of Land), and Banks.
- **Legal Disclaimer:** BhumiShield flags risk for a human officer to decide. It never declares final legal truth.
- **Hackathon Compliance:** Uses **100% synthetic dummy data (`Demo / ডেমো ডেটা`)**, an internal Mock NID service, and makes zero calls to live government servers.

## 2. Upgraded Role-Based Middleware & Role-Wise Controlling Systems
- **Laravel 11 RBAC Middleware (`app/Http/Middleware/RoleMiddleware.php`)**: Enforces JWT authentication, active user status (`is_active = 1`), and granular role permissions across all 5 roles (`citizen`, `sub_registrar`, `ac_land`, `bank_officer`, `admin`).
- **5 Dedicated Role Dashboards & Controlling Systems**:
  1. **Citizen (`citizen`)**: Land Vault with live **Plot Sale Protection Lock (`🔒 বিক্রয় লক`)** toggle (`POST /api/v1/citizen/plots/{id}/toggle-lock`), **Citizen Land Fraud / Dispute Filing** (`POST /api/v1/citizen/disputes`), QR Deed Scanner, and 3-Step Check-Before-You-Buy Wizard.
  2. **Sub-Registrar (`sub_registrar`)**: 11-Rule Pre-Registration Gatekeeper, **Government Stamp Duty & Registration Fee Calculator** (`GET /api/v1/registrar/calculate-fees`), and **Deed Registry Hold/Release/Reject Control Table** (`POST /api/v1/registrar/deeds/{id}/status`).
  3. **AC Land Officer (`ac_land`)**: e-Mutation Queue (`POST /api/v1/mutations/{id}/decision`), **Flagged BS Khatian Chain & Heirs Reconciliation Panel** (`POST /api/v1/acland/khatians/{plot_id}/reconcile`), and **Citizen Dispute Tribunal** (`POST /api/v1/acland/disputes/{id}/resolve`).
  4. **Bank Officer (`bank_officer`)**: Collateral Verification, Lien Lock, Lien Release, and **Printable QR-Signed Digital NOC Certificate** (`GET /api/v1/mortgages/{id}/noc`).
  5. **Admin & Auditor (`admin`)**: **Interactive RBAC Permission Matrix** (`GET /api/v1/auth/permissions`), Users CRUD (`GET/POST/PUT/DELETE /api/v1/users`), Dynamic Site & Rules Engine Settings (`enforce_strict_rbac`), Live Tamper Simulator, 8 Demo Scenarios, Legacy OCR Assist, and Append-Only Hash-Chained Audit Log.

## 3. How to Run Locally (Mac / XAMPP / CLI)

### Backend (Laravel 11 / PHP 8.4)
```bash
cd backend
php artisan migrate:fresh --seed
php artisan test
php artisan serve --host=127.0.0.1 --port=8000
```

### Frontend (React 19 + TypeScript + Tailwind CSS v4)
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

## 4. Open-Source Libraries & AI Tools Disclosure
- **Backend:** PHP 8.4, Laravel 11 structure, PHP `ext-sodium` (Ed25519 signatures), `hash('sha256')`, PDO SQLite/PostgreSQL.
- **Frontend:** React 19, Vite 6, TypeScript, Tailwind CSS v4, Lucide Icons, Axios, Web Speech API (`bn-BD`).
- **AI Tools Used:** Gemini coding assistant used for architecture scaffolding, synthetic Bangladeshi land dataset generation, and automated test authoring during the LandTech Innovation Hackathon 2026.
