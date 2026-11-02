<?php

declare(strict_types=1);

namespace Database\Migrations;

use App\Support\DB;

/**
 * Migration creating sim_otp_challenges table for NID Porichoy two-factor verification.
 * Fully compatible with SQLite and PostgreSQL.
 */
final class CreateSimOtpChallengesTable
{
    public function up(bool $fresh = false): void
    {
        if ($fresh) {
            $this->down();
        }

        $ddl = <<<'SQL'
CREATE TABLE IF NOT EXISTS sim_otp_challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT UNIQUE NOT NULL,
    nid TEXT NOT NULL,
    phone TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT NOT NULL,
    verified_at TEXT DEFAULT NULL,
    created_at TEXT NOT NULL
);
SQL;

        if (DB::isPostgres()) {
            $ddl = str_replace('INTEGER PRIMARY KEY AUTOINCREMENT', 'SERIAL PRIMARY KEY', $ddl);
        }

        DB::execRaw($ddl);
    }

    public function down(): void
    {
        DB::execRaw('DROP TABLE IF EXISTS sim_otp_challenges;');
    }
}
