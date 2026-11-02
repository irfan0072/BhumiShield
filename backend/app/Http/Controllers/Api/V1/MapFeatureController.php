<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Middleware\RoleMiddleware;
use App\Services\VectorGeometryService;
use App\Support\DB;
use Database\Migrations\CreateMapFeaturesAndAssignments;
use Database\Seeders\DatabaseSeeder;

/**
 * Controller for Cadastral Vector Drawing Features (Polygons, Lines, Points).
 * Provides REST API persistence for vector geometries and custom attribute labeling.
 */
final class MapFeatureController
{
    public const ALLOWED_ROLES = [
        'admin',
        'system_admin',
        'ac_land',
        'land_office_assistant',
        'field_verification_officer',
        'settlement_records_officer',
        'settlement_checker',
    ];

    private static function fail(string $code, string $messageBn, string $messageEn = '', int $status = 422): never
    {
        $en = $messageEn !== '' ? $messageEn : $messageBn;
        throw new \RuntimeException(json_encode([
            'status' => $status,
            'code' => $code,
            'message_bn' => $messageBn,
            'message_en' => $en,
        ], JSON_UNESCAPED_UNICODE));
    }

    public static function migrate(): void
    {
        if (!class_exists(\Database\Migrations\CreateMapFeaturesAndAssignments::class)) {
            $path = database_path('migrations/2026_11_01_000001_create_map_features_and_assignments.php');
            if (file_exists($path)) {
                require_once $path;
            }
        }
        (new CreateMapFeaturesAndAssignments())->up();
    }

    private static function formatRow(array $row): array
    {
        $geom = is_string($row['geometry']) ? json_decode($row['geometry'], true) : $row['geometry'];
        $attr = is_string($row['attributes']) ? json_decode($row['attributes'], true) : $row['attributes'];

        return [
            'id' => (int) $row['id'],
            'location_id' => (int) $row['location_id'],
            'office_id' => isset($row['office_id']) && $row['office_id'] !== null ? (int) $row['office_id'] : null,
            'plot_id' => isset($row['plot_id']) && $row['plot_id'] !== null ? (int) $row['plot_id'] : null,
            'feature_type' => (string) $row['feature_type'],
            'geometry' => is_array($geom) ? $geom : [],
            'attributes' => is_array($attr) ? $attr : [],
            'area_decimal' => isset($row['area_decimal']) && $row['area_decimal'] !== null ? (float) $row['area_decimal'] : null,
            'area_sqm' => isset($row['area_sqm']) && $row['area_sqm'] !== null ? (float) $row['area_sqm'] : null,
            'length_meters' => isset($row['length_meters']) && $row['length_meters'] !== null ? (float) $row['length_meters'] : null,
            'bbox_xmin' => (float) $row['bbox_xmin'],
            'bbox_ymin' => (float) $row['bbox_ymin'],
            'bbox_xmax' => (float) $row['bbox_xmax'],
            'bbox_ymax' => (float) $row['bbox_ymax'],
            'status' => (string) $row['status'],
            'created_by' => (string) $row['created_by'],
            'updated_by' => isset($row['updated_by']) ? (string) $row['updated_by'] : null,
            'created_at' => (string) $row['created_at'],
            'updated_at' => (string) $row['updated_at'],
        ];
    }

    /**
     * GET /api/v1/map/features
     * Query features by location_id, feature_type, status, plot_id.
     */
    public static function list(array $query): array
    {
        self::migrate();

        $where = ['1=1'];
        $bindings = [];

        if (!empty($query['location_id'])) {
            $where[] = 'location_id = ?';
            $bindings[] = (int) $query['location_id'];
        }

        if (!empty($query['feature_type'])) {
            $where[] = 'feature_type = ?';
            $bindings[] = strtolower(trim((string) $query['feature_type']));
        }

        if (!empty($query['plot_id'])) {
            $where[] = 'plot_id = ?';
            $bindings[] = (int) $query['plot_id'];
        }

        $status = strtolower(trim((string) ($query['status'] ?? 'active')));
        if ($status !== 'all') {
            $where[] = 'LOWER(status) = ?';
            $bindings[] = $status;
        }

        $sql = 'SELECT * FROM map_features WHERE ' . implode(' AND ', $where) . ' ORDER BY id DESC LIMIT 500';
        $rows = DB::select($sql, $bindings);

        $data = array_map(self::formatRow(...), $rows);

        return [
            'success' => true,
            'count' => count($data),
            'data' => $data,
        ];
    }

    /**
     * GET /api/v1/map/features/{id}
     * Retrieve single feature.
     */
    public static function get(int $id): array
    {
        self::migrate();

        $row = DB::selectOne('SELECT * FROM map_features WHERE id = ?', [$id]);
        if (!$row) {
            self::fail('FEATURE_NOT_FOUND', 'ম্যাপ ফিচার পাওয়া যায়নি।', 'Map feature not found.', 404);
        }

        return [
            'success' => true,
            'data' => self::formatRow($row),
        ];
    }

    /**
     * POST /api/v1/map/features
     * Create vector feature (Polygon, Line, Point).
     */
    public static function create(array $body, ?array $actor = null): array
    {
        self::migrate();
        $u = RoleMiddleware::authorize(self::ALLOWED_ROLES, $actor);

        $locationId = (int) ($body['location_id'] ?? 0);
        if ($locationId <= 0) {
            self::fail('LOCATION_REQUIRED', 'বৈধ মৌজা (location_id) নির্বাচন করুন।', 'Valid location_id is required.');
        }

        $loc = DB::selectOne('SELECT id FROM locations WHERE id = ?', [$locationId]);
        if (!$loc) {
            self::fail('LOCATION_NOT_FOUND', 'মৌজাটি পাওয়া যায়নি।', 'Location not found.', 404);
        }

        if (empty($body['geometry']) || !is_array($body['geometry'])) {
            self::fail('GEOMETRY_REQUIRED', 'জ্যামিতি তথ্য (geometry) প্রদান করুন।', 'Geometry object is required.');
        }

        $geomValidation = VectorGeometryService::validate(
            $body['geometry'],
            isset($body['feature_type']) ? (string) $body['feature_type'] : null
        );

        $featureType = $geomValidation['feature_type'];
        $geometryJson = json_encode($geomValidation['geometry'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        
        $attributes = is_array($body['attributes'] ?? null) ? $body['attributes'] : [];
        $attributesJson = json_encode($attributes, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $plotId = !empty($body['plot_id']) ? (int) $body['plot_id'] : null;
        if ($plotId !== null) {
            $plot = DB::selectOne('SELECT id FROM plots WHERE id = ? AND location_id = ?', [$plotId, $locationId]);
            if (!$plot) {
                self::fail('PLOT_LOCATION_MISMATCH', 'প্লটটি এই মৌজার অন্তর্ভুক্ত নয়।', 'Plot does not belong to this location.');
            }
        }

        $officeId = !empty($body['office_id']) ? (int) $body['office_id'] : null;
        $status = strtoupper(trim((string) ($body['status'] ?? 'ACTIVE')));
        if (!in_array($status, ['ACTIVE', 'ARCHIVED', 'DRAFT', 'DELETED'], true)) {
            $status = 'ACTIVE';
        }

        $bbox = $geomValidation['bbox'];
        $now = gmdate('c');

        $featureId = DB::insert(
            'INSERT INTO map_features (location_id, office_id, plot_id, feature_type, geometry, attributes, area_decimal, area_sqm, length_meters, bbox_xmin, bbox_ymin, bbox_xmax, bbox_ymax, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $locationId,
                $officeId,
                $plotId,
                $featureType,
                $geometryJson,
                $attributesJson,
                $geomValidation['area_decimal'],
                $geomValidation['area_sqm'],
                $geomValidation['length_meters'],
                $bbox[0],
                $bbox[1],
                $bbox[2],
                $bbox[3],
                $status,
                $u['username'],
                $now,
                $now,
            ]
        );

        $row = DB::selectOne('SELECT * FROM map_features WHERE id = ?', [$featureId]);

        DatabaseSeeder::appendAuditEntry(
            $u['username'],
            $u['role'],
            'MAP_FEATURE_CREATED',
            'map_feature',
            (string) $featureId,
            [
                'location_id' => $locationId,
                'feature_type' => $featureType,
                'attributes' => $attributes,
            ],
            $now
        );

        return [
            'success' => true,
            'data' => self::formatRow($row),
        ];
    }

    /**
     * PUT /api/v1/map/features/{id}
     * Update vector feature geometry or attributes.
     */
    public static function update(int $id, array $body, ?array $actor = null): array
    {
        self::migrate();
        $u = RoleMiddleware::authorize(self::ALLOWED_ROLES, $actor);

        $existing = DB::selectOne('SELECT * FROM map_features WHERE id = ?', [$id]);
        if (!$existing) {
            self::fail('FEATURE_NOT_FOUND', 'ম্যাপ ফিচার পাওয়া যায়নি।', 'Map feature not found.', 404);
        }

        $now = gmdate('c');
        $updates = [];
        $bindings = [];

        // If geometry is updated
        if (isset($body['geometry']) && is_array($body['geometry'])) {
            $geomValidation = VectorGeometryService::validate(
                $body['geometry'],
                isset($body['feature_type']) ? (string) $body['feature_type'] : $existing['feature_type']
            );
            $bbox = $geomValidation['bbox'];

            $updates[] = 'feature_type = ?';
            $bindings[] = $geomValidation['feature_type'];

            $updates[] = 'geometry = ?';
            $bindings[] = json_encode($geomValidation['geometry'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            $updates[] = 'area_decimal = ?';
            $bindings[] = $geomValidation['area_decimal'];

            $updates[] = 'area_sqm = ?';
            $bindings[] = $geomValidation['area_sqm'];

            $updates[] = 'length_meters = ?';
            $bindings[] = $geomValidation['length_meters'];

            $updates[] = 'bbox_xmin = ?';
            $bindings[] = $bbox[0];

            $updates[] = 'bbox_ymin = ?';
            $bindings[] = $bbox[1];

            $updates[] = 'bbox_xmax = ?';
            $bindings[] = $bbox[2];

            $updates[] = 'bbox_ymax = ?';
            $bindings[] = $bbox[3];
        }

        // If attributes updated
        if (isset($body['attributes']) && is_array($body['attributes'])) {
            $oldAttr = is_string($existing['attributes']) ? json_decode($existing['attributes'], true) : [];
            $newAttr = array_merge(is_array($oldAttr) ? $oldAttr : [], $body['attributes']);
            $updates[] = 'attributes = ?';
            $bindings[] = json_encode($newAttr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }

        if (isset($body['status'])) {
            $status = strtoupper(trim((string) $body['status']));
            if (in_array($status, ['ACTIVE', 'ARCHIVED', 'DRAFT', 'DELETED'], true)) {
                $updates[] = 'status = ?';
                $bindings[] = $status;
            }
        }

        if (array_key_exists('plot_id', $body)) {
            $plotId = !empty($body['plot_id']) ? (int) $body['plot_id'] : null;
            $updates[] = 'plot_id = ?';
            $bindings[] = $plotId;
        }

        $updates[] = 'updated_by = ?';
        $bindings[] = $u['username'];

        $updates[] = 'updated_at = ?';
        $bindings[] = $now;

        $bindings[] = $id;

        DB::statement('UPDATE map_features SET ' . implode(', ', $updates) . ' WHERE id = ?', $bindings);

        $updated = DB::selectOne('SELECT * FROM map_features WHERE id = ?', [$id]);

        DatabaseSeeder::appendAuditEntry(
            $u['username'],
            $u['role'],
            'MAP_FEATURE_UPDATED',
            'map_feature',
            (string) $id,
            [
                'updated_fields' => array_keys($body),
            ],
            $now
        );

        return [
            'success' => true,
            'data' => self::formatRow($updated),
        ];
    }

    /**
     * DELETE /api/v1/map/features/{id}
     * Remove or soft-delete vector feature.
     */
    public static function delete(int $id, ?array $actor = null): array
    {
        self::migrate();
        $u = RoleMiddleware::authorize(self::ALLOWED_ROLES, $actor);

        $existing = DB::selectOne('SELECT * FROM map_features WHERE id = ?', [$id]);
        if (!$existing) {
            self::fail('FEATURE_NOT_FOUND', 'ম্যাপ ফিচার পাওয়া যায়নি।', 'Map feature not found.', 404);
        }

        DB::statement('DELETE FROM map_features WHERE id = ?', [$id]);

        DatabaseSeeder::appendAuditEntry(
            $u['username'],
            $u['role'],
            'MAP_FEATURE_DELETED',
            'map_feature',
            (string) $id,
            [
                'location_id' => $existing['location_id'],
                'feature_type' => $existing['feature_type'],
            ],
            gmdate('c')
        );

        return [
            'success' => true,
            'message' => 'Feature deleted',
            'id' => $id,
        ];
    }
}
