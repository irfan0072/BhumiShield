<?php

declare(strict_types=1);

namespace Database\Migrations;

use App\Support\DB;

/**
 * Migration creating acquisition_cases table for DC Land Acquisition and Super Admin dashboards.
 * Fully compatible with SQLite and PostgreSQL.
 */
final class CreateAcquisitionCasesTable
{
    public function up(bool $fresh = false): void
    {
        if ($fresh) {
            $this->down();
        }

        $idCol = DB::isPostgres() ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
        $realCol = DB::isPostgres() ? 'DOUBLE PRECISION' : 'REAL';

        $ddl = <<<SQL
CREATE TABLE IF NOT EXISTS acquisition_cases (
    id {$idCol},
    case_no TEXT UNIQUE NOT NULL,
    project_name TEXT NOT NULL DEFAULT '',
    project_name_bn TEXT NOT NULL DEFAULT '',
    project_name_en TEXT NOT NULL DEFAULT '',
    acquiring_agency_bn TEXT NOT NULL DEFAULT 'জেলা প্রশাসন ভূমি অধিগ্রহণ শাখা',
    section_type TEXT NOT NULL DEFAULT 'SECTION_4',
    district_bn TEXT NOT NULL DEFAULT 'ঢাকা',
    district_en TEXT NOT NULL DEFAULT 'Dhaka',
    upazila_bn TEXT NOT NULL DEFAULT 'সাভার',
    upazila_en TEXT NOT NULL DEFAULT 'Savar',
    mouza_bn TEXT NOT NULL DEFAULT 'বিরুলিয়া',
    mouza_name TEXT NOT NULL DEFAULT 'Birulia',
    plot_ids_json TEXT NOT NULL DEFAULT '[]',
    total_plots INTEGER NOT NULL DEFAULT 1,
    total_land_decimal {$realCol} NOT NULL DEFAULT 10.0,
    compensation_budget {$realCol} NOT NULL DEFAULT 0.0,
    estimated_compensation_bdt {$realCol} NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'NOTICE_ISSUED',
    gazette_no TEXT,
    gazette_published_at TEXT,
    created_by_officer TEXT NOT NULL DEFAULT 'dc_la',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
SQL;

        DB::execRaw($ddl);

        // Ensure all required columns exist in case table pre-existed with partial columns
        $acqPatches = [
            'ALTER TABLE acquisition_cases ADD COLUMN project_name TEXT NOT NULL DEFAULT \'\'',
            'ALTER TABLE acquisition_cases ADD COLUMN district_en TEXT NOT NULL DEFAULT \'Dhaka\'',
            'ALTER TABLE acquisition_cases ADD COLUMN upazila_en TEXT NOT NULL DEFAULT \'Savar\'',
            'ALTER TABLE acquisition_cases ADD COLUMN mouza_name TEXT NOT NULL DEFAULT \'Birulia\'',
            'ALTER TABLE acquisition_cases ADD COLUMN total_plots INTEGER NOT NULL DEFAULT 1',
            'ALTER TABLE acquisition_cases ADD COLUMN compensation_budget ' . $realCol . ' NOT NULL DEFAULT 0.0',
        ];

        foreach ($acqPatches as $patch) {
            try {
                DB::execRaw($patch . ';');
            } catch (\Throwable) {
                // Column already exists
            }
        }

        try {
            DB::execRaw('CREATE INDEX IF NOT EXISTS idx_acq_cases_status ON acquisition_cases(status);');
            DB::execRaw('CREATE INDEX IF NOT EXISTS idx_acq_cases_upazila ON acquisition_cases(district_en, upazila_en);');
        } catch (\Throwable) {
            // Index already exists
        }

        // Ensure transfer_requests assignment columns exist for super admin queues in all DB environments
        $transferPatches = [
            'ALTER TABLE transfer_requests ADD COLUMN assigned_to_user_id INTEGER REFERENCES users(id)',
            'ALTER TABLE transfer_requests ADD COLUMN assigned_to_name TEXT',
            'ALTER TABLE transfer_requests ADD COLUMN assigned_office_id INTEGER REFERENCES offices(id)',
            'ALTER TABLE transfer_requests ADD COLUMN assigned_office_bn TEXT',
            'ALTER TABLE transfer_requests ADD COLUMN reassigned_at TEXT',
            'ALTER TABLE transfer_requests ADD COLUMN reassigned_by TEXT',
            'ALTER TABLE transfer_requests ADD COLUMN correction_notes_bn TEXT',
        ];

        foreach ($transferPatches as $patch) {
            try {
                DB::execRaw($patch . ';');
            } catch (\Throwable) {
                // Column already exists
            }
        }
    }

    public function down(): void
    {
        DB::execRaw('DROP TABLE IF EXISTS acquisition_cases;');
    }
}
