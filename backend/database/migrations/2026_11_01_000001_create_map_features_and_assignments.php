<?php

declare(strict_types=1);

namespace Database\Migrations;

use App\Support\DB;

/**
 * Migration creating map_features and map_task_assignments tables.
 * Fully compatible with SQLite and PostgreSQL.
 */
final class CreateMapFeaturesAndAssignments
{
    public function up(bool $fresh = false): void
    {
        if ($fresh) {
            $this->down();
        }

        $idCol = DB::isPostgres() ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
        $realCol = DB::isPostgres() ? 'DOUBLE PRECISION' : 'REAL';

        $ddl = <<<SQL
CREATE TABLE IF NOT EXISTS map_features (
    id {$idCol},
    location_id INTEGER NOT NULL REFERENCES locations(id),
    office_id INTEGER REFERENCES offices(id),
    plot_id INTEGER REFERENCES plots(id),
    feature_type TEXT NOT NULL,
    geometry TEXT NOT NULL,
    attributes TEXT NOT NULL,
    area_decimal {$realCol},
    area_sqm {$realCol},
    length_meters {$realCol},
    bbox_xmin {$realCol} NOT NULL,
    bbox_ymin {$realCol} NOT NULL,
    bbox_xmax {$realCol} NOT NULL,
    bbox_ymax {$realCol} NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_by TEXT NOT NULL,
    updated_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_map_features_loc_status ON map_features(location_id, status);
CREATE INDEX IF NOT EXISTS idx_map_features_type ON map_features(feature_type);
CREATE INDEX IF NOT EXISTS idx_map_features_bbox ON map_features(bbox_xmin, bbox_ymin, bbox_xmax, bbox_ymax);

CREATE TABLE IF NOT EXISTS map_task_assignments (
    id {$idCol},
    task_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    task_type TEXT NOT NULL,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    plot_id INTEGER REFERENCES plots(id),
    assigned_by_user_id INTEGER NOT NULL REFERENCES users(id),
    assigned_to_user_id INTEGER NOT NULL REFERENCES users(id),
    priority TEXT NOT NULL DEFAULT 'NORMAL',
    status TEXT NOT NULL DEFAULT 'pending',
    due_date TEXT,
    notes TEXT,
    completion_note TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_map_task_assigned_to ON map_task_assignments(assigned_to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_map_task_location ON map_task_assignments(location_id);
SQL;

        DB::execRaw($ddl);
    }

    public function down(): void
    {
        DB::execRaw('DROP TABLE IF EXISTS map_task_assignments;');
        DB::execRaw('DROP TABLE IF EXISTS map_features;');
    }
}
