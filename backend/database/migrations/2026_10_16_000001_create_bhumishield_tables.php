<?php

declare(strict_types=1);

namespace Database\Migrations;

use App\Support\DB;

/**
 * Laravel Migration creating all 14 BhumiShield tables (including plot sale locks & citizen disputes).
 */
final class CreateBhumishieldTables
{
    public function up(bool $fresh = false): void
    {
        $pdo = DB::connection();
        if ($fresh) {
            $this->down();
        }

        $ddl = <<<'SQL'
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    full_name_bn TEXT NOT NULL,
    full_name_en TEXT NOT NULL,
    role TEXT NOT NULL,
    office_bn TEXT NOT NULL,
    office_en TEXT NOT NULL,
    phone_dummy TEXT DEFAULT '01700-000000',
    nid TEXT DEFAULT '9900001001',
    is_active INTEGER NOT NULL DEFAULT 1,
    password_hash TEXT NOT NULL,
    last_login_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value_json TEXT NOT NULL,
    description_bn TEXT NOT NULL,
    description_en TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    division_bn TEXT NOT NULL,
    division_en TEXT NOT NULL,
    district_bn TEXT NOT NULL,
    district_en TEXT NOT NULL,
    upazila_bn TEXT NOT NULL,
    upazila_en TEXT NOT NULL,
    mouza_bn TEXT NOT NULL,
    mouza_en TEXT NOT NULL,
    jl_no TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS persons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_bn TEXT NOT NULL,
    name_en TEXT NOT NULL,
    father_name_bn TEXT NOT NULL,
    father_name_en TEXT NOT NULL,
    mother_name_bn TEXT NOT NULL,
    nid TEXT UNIQUE NOT NULL,
    phone_dummy TEXT NOT NULL,
    is_deceased INTEGER NOT NULL DEFAULT 0,
    heirs_recorded INTEGER NOT NULL DEFAULT 1,
    address_bn TEXT NOT NULL,
    address_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    dag_no TEXT NOT NULL,
    dag_no_bn TEXT NOT NULL,
    land_type_bn TEXT NOT NULL,
    land_type_en TEXT NOT NULL,
    total_area_decimal REAL NOT NULL,
    owner_sale_locked INTEGER NOT NULL DEFAULT 0,
    locked_by_nid TEXT,
    notes_bn TEXT,
    notes_en TEXT
);

CREATE TABLE IF NOT EXISTS khatian_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    survey_type TEXT NOT NULL,
    khatian_no TEXT NOT NULL,
    khatian_no_bn TEXT NOT NULL,
    recorded_area_decimal REAL NOT NULL,
    survey_year INTEGER NOT NULL,
    parent_khatian_no TEXT,
    status TEXT NOT NULL DEFAULT 'VALID',
    remarks_bn TEXT,
    remarks_en TEXT
);

CREATE TABLE IF NOT EXISTS ownerships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    khatian_id INTEGER NOT NULL REFERENCES khatian_records(id),
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    person_id INTEGER NOT NULL REFERENCES persons(id),
    share_fraction TEXT NOT NULL,
    share_float REAL NOT NULL,
    area_decimal REAL NOT NULL,
    is_latest INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS deeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deed_no TEXT UNIQUE NOT NULL,
    deed_type TEXT NOT NULL,
    seller_id INTEGER NOT NULL REFERENCES persons(id),
    buyer_id INTEGER NOT NULL REFERENCES persons(id),
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    share_fraction TEXT NOT NULL,
    area_decimal REAL NOT NULL,
    price_bdt INTEGER NOT NULL,
    status TEXT NOT NULL,
    content_json TEXT NOT NULL,
    original_content_json TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    prev_hash TEXT NOT NULL,
    signature TEXT NOT NULL,
    chain_index INTEGER UNIQUE NOT NULL,
    registered_by TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mutations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_no TEXT UNIQUE NOT NULL,
    deed_id INTEGER NOT NULL REFERENCES deeds(id),
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    seller_id INTEGER NOT NULL REFERENCES persons(id),
    buyer_id INTEGER NOT NULL REFERENCES persons(id),
    area_decimal REAL NOT NULL,
    status TEXT NOT NULL,
    decision_reason_bn TEXT,
    decision_reason_en TEXT,
    decided_by TEXT,
    decided_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mortgages_liens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    borrower_id INTEGER NOT NULL REFERENCES persons(id),
    bank_name_bn TEXT NOT NULL,
    bank_name_en TEXT NOT NULL,
    branch_bn TEXT NOT NULL,
    amount_bdt INTEGER NOT NULL,
    area_mortgaged_decimal REAL NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    released_at TEXT
);

CREATE TABLE IF NOT EXISTS disputes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_no TEXT UNIQUE NOT NULL,
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    complainant_name_bn TEXT NOT NULL,
    complainant_nid TEXT NOT NULL,
    dispute_type TEXT NOT NULL,
    description_bn TEXT NOT NULL,
    description_en TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'REVIEW',
    status TEXT NOT NULL DEFAULT 'OPEN',
    resolution_notes_bn TEXT,
    resolved_by TEXT,
    created_at TEXT NOT NULL,
    resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_username TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details_json TEXT NOT NULL,
    entry_hash TEXT NOT NULL,
    prev_hash TEXT NOT NULL,
    chain_index INTEGER UNIQUE NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS risk_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    deed_id INTEGER,
    seller_id INTEGER,
    buyer_id INTEGER,
    requested_area_decimal REAL NOT NULL,
    verdict TEXT NOT NULL,
    risk_score INTEGER NOT NULL,
    flags_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS demo_scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scenario_no INTEGER UNIQUE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    title_bn TEXT NOT NULL,
    title_en TEXT NOT NULL,
    expected_verdict TEXT NOT NULL,
    badge_bn TEXT NOT NULL,
    badge_en TEXT NOT NULL,
    description_bn TEXT NOT NULL,
    description_en TEXT NOT NULL,
    plot_id INTEGER NOT NULL,
    deed_id INTEGER,
    seller_id INTEGER NOT NULL,
    buyer_id INTEGER NOT NULL,
    requested_area_decimal REAL NOT NULL,
    seller_nid_override TEXT,
    recommended_view TEXT NOT NULL
);
SQL;

        if (DB::isPostgres()) {
            $pgDdl = str_replace('INTEGER PRIMARY KEY AUTOINCREMENT', 'SERIAL PRIMARY KEY', $ddl);
            foreach (array_filter(array_map('trim', explode(';', $pgDdl))) as $stmt) {
                DB::execRaw($stmt . ';');
            }
        } else {
            $pdo->exec($ddl);
        }
    }

    public function down(): void
    {
        $tables = [
            'demo_scenarios',
            'risk_reports',
            'audit_log',
            'disputes',
            'mortgages_liens',
            'mutations',
            'deeds',
            'ownerships',
            'khatian_records',
            'plots',
            'persons',
            'locations',
            'site_settings',
            'users',
        ];
        foreach ($tables as $tbl) {
            if (DB::isPostgres()) {
                DB::execRaw("DROP TABLE IF EXISTS {$tbl} CASCADE;");
            } else {
                DB::execRaw("DROP TABLE IF EXISTS {$tbl};");
            }
        }
    }
}
