<?php

declare(strict_types=1);

namespace Tests\Feature;

require_once __DIR__ . '/../../vendor/autoload.php';

use App\Http\Controllers\Api\V1\MapFeatureController as C;
use App\Services\VectorGeometryService as V;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

final class MapFeatureTest
{
    public static function runAll(): int
    {
        $createdTemp = false;
        $origDb = getenv('BHUMISHIELD_TEST_DB');
        $tmpDb = null;
        if (!$origDb) {
            $tmpDb = sys_get_temp_dir() . '/bhumishield_mf_test_' . getmypid() . '_' . bin2hex(random_bytes(4)) . '.sqlite';
            putenv("BHUMISHIELD_TEST_DB={$tmpDb}");
            $_ENV['BHUMISHIELD_TEST_DB'] = $tmpDb;
            putenv('APP_ENV=testing');
            DB::resetConnection();
            (new DatabaseSeeder())->run(true);
            $createdTemp = true;
        }

        echo "\n   PASS  Tests\\Feature\\MapFeatureTest (Cadastral Vector Drawing CRUD & Geometry Validation)\n";

        $n = 0;
        $check = function (bool $condition, string $message) use (&$n): void {
            if (!$condition) {
                throw new \RuntimeException("Assertion failed: {$message}");
            }
            $n++;
            echo "  ✓ {$message}\n";
        };

        $deny = function (callable $fn, string $expectedCode) use ($check): void {
            try {
                $fn();
                throw new \RuntimeException("Expected rejection with {$expectedCode}, but call succeeded.");
            } catch (\Throwable $e) {
                $data = json_decode($e->getMessage(), true);
                $code = $data['code'] ?? '';
                $check($code === $expectedCode, "Reject {$expectedCode}");
            }
        };

        // 1. Fixture loading
        C::migrate();
        $admin = DB::selectOne("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
        $fvo = DB::selectOne("SELECT * FROM users WHERE role = 'field_verification_officer' LIMIT 1");
        $citizen = DB::selectOne("SELECT * FROM users WHERE role = 'citizen' LIMIT 1");
        $loc = DB::selectOne("SELECT * FROM locations WHERE mouza_en = 'Birulia' LIMIT 1")
            ?: DB::selectOne("SELECT * FROM locations LIMIT 1");
        $plot = DB::selectOne("SELECT * FROM plots WHERE location_id = ? LIMIT 1", [$loc['id']]);

        $check($admin && $fvo && $citizen && $loc, 'Required user and location fixtures loaded');

        $locId = (int) $loc['id'];
        $plotId = $plot ? (int) $plot['id'] : null;
        $x = (float) $loc['longitude'];
        $y = (float) $loc['latitude'];

        // 2. Geometry Validator - Polygon Tests
        $validPolygonGeom = [
            'type' => 'Polygon',
            'coordinates' => [
                [
                    [$x, $y],
                    [$x + 0.001, $y],
                    [$x + 0.001, $y + 0.001],
                    [$x, $y + 0.001],
                    [$x, $y],
                ],
            ],
        ];

        $valPoly = V::validate($validPolygonGeom);
        $check($valPoly['feature_type'] === 'polygon', 'Validator identifies Polygon');
        $check($valPoly['area_sqm'] > 1000.0, 'Calculates positive polygon area in sqm');
        $check($valPoly['area_decimal'] > 20.0, 'Calculates positive polygon area in decimals');
        $check($valPoly['length_meters'] > 50.0, 'Calculates polygon perimeter');
        $check(count($valPoly['bbox']) === 4, 'Computes 4-coordinate bounding box');

        // Polygon Rejections
        $unclosedPoly = $validPolygonGeom;
        $unclosedPoly['coordinates'][0][4] = [$x + 0.0005, $y];
        $deny(fn() => V::validate($unclosedPoly), 'UNCLOSED_RING');

        $outOfBoundsPoly = $validPolygonGeom;
        $outOfBoundsPoly['coordinates'][0] = [
            [10.0, 50.0],
            [10.1, 50.0],
            [10.1, 50.1],
            [10.0, 50.1],
            [10.0, 50.0],
        ];
        $deny(fn() => V::validate($outOfBoundsPoly), 'COORDINATE_OUT_OF_BOUNDS');

        $selfIntersectPoly = [
            'type' => 'Polygon',
            'coordinates' => [
                [
                    [$x, $y],
                    [$x + 0.001, $y + 0.001],
                    [$x + 0.001, $y],
                    [$x, $y + 0.001],
                    [$x, $y],
                ],
            ],
        ];
        $deny(fn() => V::validate($selfIntersectPoly), 'SELF_INTERSECTION');

        // 3. Geometry Validator - LineString Tests
        $validLineGeom = [
            'type' => 'LineString',
            'coordinates' => [
                [$x, $y],
                [$x + 0.001, $y + 0.0005],
                [$x + 0.002, $y + 0.001],
            ],
        ];

        $valLine = V::validate($validLineGeom);
        $check($valLine['feature_type'] === 'line', 'Validator identifies LineString');
        $check($valLine['length_meters'] > 50.0, 'Calculates line length in meters');
        $check($valLine['area_sqm'] === null, 'Line area in sqm is null');
        $check($valLine['area_decimal'] === null, 'Line area in decimal is null');

        $shortLine = ['type' => 'LineString', 'coordinates' => [[$x, $y]]];
        $deny(fn() => V::validate($shortLine), 'INVALID_LINE_LENGTH');

        // 4. Geometry Validator - Point Tests
        $validPointGeom = [
            'type' => 'Point',
            'coordinates' => [$x + 0.0005, $y + 0.0005],
        ];

        $valPoint = V::validate($validPointGeom);
        $check($valPoint['feature_type'] === 'point', 'Validator identifies Point');
        $check($valPoint['length_meters'] === null, 'Point length is null');
        $check($valPoint['area_sqm'] === null, 'Point area is null');
        $check($valPoint['bbox'][0] === $valPoint['bbox'][2], 'Point bbox xmin equals xmax');

        // 5. Role-Based Access Control on Feature Creation
        $polyBody = [
            'location_id' => $locId,
            'plot_id' => $plotId,
            'geometry' => $validPolygonGeom,
            'attributes' => [
                'name' => 'মৌজা প্লট সীমানা',
                'dag_no' => '১০১',
                'khatian_no' => '২৫০',
                'jl_no' => (string) ($loc['jl_no'] ?? '12'),
                'land_class' => 'নাল',
                'survey_type' => 'BS',
                'sheet_no' => '০১',
                'notes' => 'ফিল্ড সার্ভে টেস্ট দাগ',
                'feature_category' => 'plot',
            ],
        ];

        // Citizen and unauthenticated cannot create
        $deny(fn() => C::create($polyBody, $citizen), 'FORBIDDEN_ROLE');
        $deny(fn() => C::create($polyBody, null), 'AUTH_REQUIRED');

        // Field Verification Officer and Admin CAN create
        $createdPoly = C::create($polyBody, $fvo);
        $check($createdPoly['success'] === true, 'Officer creates polygon feature');
        $polyId = (int) $createdPoly['data']['id'];
        $check($polyId > 0, 'Generated valid auto-increment feature id');
        $check($createdPoly['data']['feature_type'] === 'polygon', 'Saved as polygon');
        $check($createdPoly['data']['area_decimal'] > 0, 'Persisted area_decimal');
        $check($createdPoly['data']['attributes']['dag_no'] === '১০১', 'Persisted dag_no attribute');
        $check($createdPoly['data']['created_by'] === $fvo['username'], 'Recorded officer username in created_by');

        // Create Line feature (Road/রাস্তা)
        $lineBody = [
            'location_id' => $locId,
            'geometry' => $validLineGeom,
            'attributes' => [
                'name' => 'প্রধান ইউনিয়ন সংযোগ সড়ক',
                'feature_category' => 'road',
                'notes' => 'পাকা রাস্তা',
            ],
        ];
        $createdLine = C::create($lineBody, $admin);
        $check($createdLine['success'] === true, 'Admin creates line feature');
        $lineId = (int) $createdLine['data']['id'];
        $check($createdLine['data']['feature_type'] === 'line', 'Saved as line');
        $check($createdLine['data']['length_meters'] > 0, 'Persisted line length_meters');

        // Create Point feature (Survey Monument / পিলার)
        $pointBody = [
            'location_id' => $locId,
            'geometry' => $validPointGeom,
            'attributes' => [
                'name' => 'সার্ভে ট্রায়াঙ্গুলেশন কন্ট্রোল পিলার',
                'feature_category' => 'control_point',
                'notes' => 'কনক্রিট স্থায়ী পিলার',
            ],
        ];
        $createdPoint = C::create($pointBody, $fvo);
        $check($createdPoint['success'] === true, 'Officer creates point feature');
        $pointId = (int) $createdPoint['data']['id'];
        $check($createdPoint['data']['feature_type'] === 'point', 'Saved as point');

        // 6. Query and Filter Features
        $allFeatures = C::list(['location_id' => $locId]);
        $check($allFeatures['success'] === true, 'List features by location_id');
        $check($allFeatures['count'] >= 3, 'Found created features in location');

        $polygonsOnly = C::list(['location_id' => $locId, 'feature_type' => 'polygon']);
        $check($polygonsOnly['count'] >= 1, 'Filter by polygon feature_type');
        $check($polygonsOnly['data'][0]['feature_type'] === 'polygon', 'Items are polygon only');

        $linesOnly = C::list(['location_id' => $locId, 'feature_type' => 'line']);
        $check($linesOnly['count'] >= 1, 'Filter by line feature_type');
        $check($linesOnly['data'][0]['feature_type'] === 'line', 'Items are line only');

        $pointsOnly = C::list(['location_id' => $locId, 'feature_type' => 'point']);
        $check($pointsOnly['count'] >= 1, 'Filter by point feature_type');
        $check($pointsOnly['data'][0]['feature_type'] === 'point', 'Items are point only');

        // 7. Get Single Feature
        $single = C::get($polyId);
        $check($single['success'] === true && $single['data']['id'] === $polyId, 'Retrieve single feature by ID');
        $check(is_array($single['data']['geometry']), 'Geometry is decoded JSON array');
        $check(is_array($single['data']['attributes']), 'Attributes is decoded JSON array');

        // 8. Update Feature
        $updatedPolyGeom = $validPolygonGeom;
        $updatedPolyGeom['coordinates'][0][1] = [$x + 0.0015, $y];
        $updatedPolyGeom['coordinates'][0][2] = [$x + 0.0015, $y + 0.0015];

        $updateBody = [
            'geometry' => $updatedPolyGeom,
            'attributes' => [
                'notes' => 'হালনাগাদ মাঠ জরিপ সম্পন্ন',
                'land_class' => 'বাড়ি',
            ],
        ];

        // Citizen cannot update
        $deny(fn() => C::update($polyId, $updateBody, $citizen), 'FORBIDDEN_ROLE');

        // Officer updates
        $updatedRes = C::update($polyId, $updateBody, $fvo);
        $check($updatedRes['success'] === true, 'Officer updates feature geometry and attributes');
        $check($updatedRes['data']['attributes']['land_class'] === 'বাড়ি', 'Updated attribute land_class');
        $check($updatedRes['data']['attributes']['dag_no'] === '১০১', 'Preserved existing attributes');
        $check($updatedRes['data']['updated_by'] === $fvo['username'], 'Set updated_by');

        // 9. Delete Feature
        // Citizen cannot delete
        $deny(fn() => C::delete($pointId, $citizen), 'FORBIDDEN_ROLE');

        $delRes = C::delete($pointId, $admin);
        $check($delRes['success'] === true, 'Admin deletes point feature');
        $deny(fn() => C::get($pointId), 'FEATURE_NOT_FOUND');

        // Verify audit log entries
        $auditCount = (int) DB::selectOne("SELECT COUNT(*) AS c FROM audit_log WHERE entity_type = 'map_feature'")['c'];
        $check($auditCount >= 3, 'Audit log records created for feature lifecycle events');

        echo "\n  Map Feature Tests:    {$n} passed, 0 failed ({$n} total)\n\n";

        if ($createdTemp && $tmpDb && file_exists($tmpDb)) {
            @unlink($tmpDb);
        }

        return 0;
    }
}

if (PHP_SAPI === 'cli' && isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    exit(MapFeatureTest::runAll());
}
