<?php

declare(strict_types=1);

namespace Database\Migrations;

use App\Support\DB;

/**
 * Migration creating simulator tables for external boundaries.
 * In PostgreSQL, these can live in the 'sim' schema.
 * In SQLite, prefixed with 'sim_'.
 */
final class CreateSimulatorTables
{
    public function up(bool $fresh = false): void
    {
        $ddl = <<<'SQL'
CREATE TABLE IF NOT EXISTS sim_persons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nid TEXT UNIQUE NOT NULL,
    full_name_bn TEXT NOT NULL,
    full_name_en TEXT NOT NULL,
    dob TEXT NOT NULL,
    father_name_bn TEXT NOT NULL,
    mother_name_bn TEXT NOT NULL,
    address_bn TEXT NOT NULL,
    is_deceased INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sim_biometric_enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nid TEXT UNIQUE NOT NULL,
    enrollment_hash TEXT NOT NULL,
    default_match_score REAL NOT NULL DEFAULT 94.5,
    has_defect INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sim_biometric_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    challenge_nonce TEXT NOT NULL,
    party_type TEXT NOT NULL,
    national_id TEXT NOT NULL,
    terminal_id TEXT NOT NULL,
    officer_user_id INTEGER NOT NULL,
    transfer_id INTEGER,
    attempts_count INTEGER NOT NULL DEFAULT 0,
    is_verified INTEGER NOT NULL DEFAULT 0,
    match_score REAL,
    supervisor_override_by INTEGER,
    override_reason TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    verified_at TEXT
);

CREATE TABLE IF NOT EXISTS sim_sms_outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_phone TEXT NOT NULL,
    message TEXT NOT NULL,
    otp_code TEXT,
    purpose TEXT NOT NULL DEFAULT 'GENERAL',
    category TEXT NOT NULL DEFAULT 'NOTIFICATION',
    status TEXT NOT NULL DEFAULT 'DELIVERED',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sim_mfs_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id TEXT UNIQUE NOT NULL,
    trx_id TEXT UNIQUE,
    payable_type TEXT NOT NULL,
    payable_id TEXT NOT NULL,
    amount_bdt REAL NOT NULL,
    payer_phone TEXT NOT NULL,
    gateway_method TEXT NOT NULL DEFAULT 'BKASH',
    status TEXT NOT NULL DEFAULT 'PENDING',
    receipt_no TEXT,
    created_at TEXT NOT NULL,
    paid_at TEXT
);

CREATE TABLE IF NOT EXISTS sim_gateway_holdings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    holding_no TEXT NOT NULL,
    mouza_code TEXT NOT NULL,
    owner_name_bn TEXT NOT NULL,
    tax_status TEXT NOT NULL DEFAULT 'PAID',
    fiscal_year TEXT NOT NULL,
    last_paid_amount REAL NOT NULL DEFAULT 0.0,
    paid_at TEXT,
    dakhila_qr_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sim_gateway_khatians (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    survey_type TEXT NOT NULL,
    khatian_no TEXT NOT NULL,
    mouza_code TEXT NOT NULL,
    recorded_owner_bn TEXT NOT NULL,
    total_area_decimal REAL NOT NULL,
    verification_token TEXT NOT NULL,
    created_at TEXT NOT NULL
);
SQL;

        DB::execRaw($ddl);
    }

    public function down(): void
    {
        $tables = [
            'sim_gateway_khatians',
            'sim_gateway_holdings',
            'sim_mfs_transactions',
            'sim_sms_outbox',
            'sim_biometric_sessions',
            'sim_biometric_enrollments',
            'sim_persons',
        ];
        foreach ($tables as $tbl) {
            DB::execRaw("DROP TABLE IF EXISTS {$tbl};");
        }
    }
}
