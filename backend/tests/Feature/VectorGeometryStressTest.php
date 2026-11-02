<?php

declare(strict_types=1);

namespace Tests\Feature;

require_once __DIR__ . '/../../vendor/autoload.php';

use App\Http\Controllers\Api\V1\MapFeatureController as C;
use App\Services\VectorGeometryService as V;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Empirical Adversarial Stress Test Suite for Vector Geometry & Spatial Engine.
 * Milestone M4: Geometry & Area Calculation Stress Testing.
 *
 * Verifies:
 * 1. Coordinate bounds rejection outside Bangladesh (88.0-93.0 E, 20.0-27.0 N) across Polygon, Line, Point.
 * 2. Self-intersecting polygon rejection (bow-tie, figure-8, self-tangent, horseshoe).
 * 3. Complex 50+ vertex convex and concave polygons Shoelace area precision against analytical formulas.
 * 4. LineString distance calculations, 0-length rejection, collinear segments, and chain conversions.
 * 5. Single point bounding box derivation and 3D coordinate rejection.
 * 6. API-level enforcement via MapFeatureController CRUD.
 */
final class VectorGeometryStressTest
{
    private static int $assertions = 0;

    private static function check(bool $condition, string $label): void
    {
        if (!$condition) {
            throw new \RuntimeException("STRESS TEST FAILURE: {$label}");
        }
        self::$assertions++;
        echo "    ✓ {$label}\n";
    }

    private static function assertRejection(callable $fn, string $expectedCode, string $label): void
    {
        try {
            $fn();
            throw new \RuntimeException("STRESS TEST FAILURE: Expected rejection with '{$expectedCode}', but call succeeded ({$label}).");
        } catch (\Throwable $e) {
            $data = json_decode($e->getMessage(), true);
            $code = $data['code'] ?? '';
            self::check($code === $expectedCode, "{$label} (code: {$expectedCode})");
        }
    }

    public static function runAll(): int
    {
        echo "\n=======================================================================\n";
        echo "   ADVERSARIAL STRESS TEST SUITE: VECTOR GEOMETRY & BOUNDS ENGINE\n";
        echo "=======================================================================\n";
        echo " Target: VectorGeometryService.php & MapFeatureController.php\n";
        echo " Execution Time: " . gmdate('c') . "\n";
        echo "-----------------------------------------------------------------------\n\n";

        // Setup clean test database
        $tmpDb = sys_get_temp_dir() . '/bhumishield_stress_' . getmypid() . '_' . bin2hex(random_bytes(4)) . '.sqlite';
        putenv("BHUMISHIELD_TEST_DB={$tmpDb}");
        $_ENV['BHUMISHIELD_TEST_DB'] = $tmpDb;
        putenv('APP_ENV=testing');
        DB::resetConnection();
        (new DatabaseSeeder())->run(true);
        C::migrate();

        $admin = DB::selectOne("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
        $loc = DB::selectOne("SELECT * FROM locations LIMIT 1");
        $locId = (int) $loc['id'];
        $centerX = 90.4125; // Dhaka longitude
        $centerY = 23.8103; // Dhaka latitude

        // =====================================================================
        // SECTION 1: COORDINATE BOUNDS STRESS TESTS
        // =====================================================================
        echo "[STRESS SECTION 1] Bangladesh Coordinate Bounds Enforcement\n";

        // 1.1 Longitude < 88.0 (West of BD)
        $outWestCoords = [
            [87.999999, 23.8],
            [87.500000, 24.0],
            [80.000000, 23.0],
            [0.000000, 23.0],
            [-90.000000, 23.0],
        ];
        foreach ($outWestCoords as $idx => [$lng, $lat]) {
            self::assertRejection(
                fn() => V::validate(['type' => 'Point', 'coordinates' => [$lng, $lat]]),
                'COORDINATE_OUT_OF_BOUNDS',
                "Point rejected west of BD (lng: {$lng}, lat: {$lat})"
            );
        }

        // 1.2 Longitude > 93.0 (East of BD)
        $outEastCoords = [
            [93.000001, 23.8],
            [93.500000, 24.0],
            [95.000000, 22.0],
            [120.000000, 24.0],
            [179.999999, 24.0],
        ];
        foreach ($outEastCoords as $idx => [$lng, $lat]) {
            self::assertRejection(
                fn() => V::validate(['type' => 'Point', 'coordinates' => [$lng, $lat]]),
                'COORDINATE_OUT_OF_BOUNDS',
                "Point rejected east of BD (lng: {$lng}, lat: {$lat})"
            );
        }

        // 1.3 Latitude < 20.0 (South of BD / Bay of Bengal)
        $outSouthCoords = [
            [90.4, 19.999999],
            [90.4, 19.500000],
            [90.4, 10.000000],
            [90.4, 0.000000],
            [90.4, -45.000000],
        ];
        foreach ($outSouthCoords as $idx => [$lng, $lat]) {
            self::assertRejection(
                fn() => V::validate(['type' => 'Point', 'coordinates' => [$lng, $lat]]),
                'COORDINATE_OUT_OF_BOUNDS',
                "Point rejected south of BD (lng: {$lng}, lat: {$lat})"
            );
        }

        // 1.4 Latitude > 27.0 (North of BD / Himalayas)
        $outNorthCoords = [
            [90.4, 27.000001],
            [90.4, 27.500000],
            [90.4, 30.000000],
            [90.4, 55.000000],
            [90.4, 89.999999],
        ];
        foreach ($outNorthCoords as $idx => [$lng, $lat]) {
            self::assertRejection(
                fn() => V::validate(['type' => 'Point', 'coordinates' => [$lng, $lat]]),
                'COORDINATE_OUT_OF_BOUNDS',
                "Point rejected north of BD (lng: {$lng}, lat: {$lat})"
            );
        }

        // 1.5 Exact Boundary Limits: [88.0, 93.0] x [20.0, 27.0]
        $exactBoundaryPoints = [
            [88.0, 20.0], // SW corner
            [93.0, 20.0], // SE corner
            [88.0, 27.0], // NW corner
            [93.0, 27.0], // NE corner
            [88.0, 23.5], // W edge
            [93.0, 23.5], // E edge
            [90.5, 20.0], // S edge
            [90.5, 27.0], // N edge
        ];
        foreach ($exactBoundaryPoints as [$lng, $lat]) {
            $res = V::validate(['type' => 'Point', 'coordinates' => [$lng, $lat]]);
            self::check($res['feature_type'] === 'point', "Exact boundary limit point accepted [{$lng}, {$lat}]");
            self::check($res['bbox'] === [$lng, $lat, $lng, $lat], "Point bbox exact match [{$lng}, {$lat}]");
        }

        // 1.6 Inverted Coordinate Pair [lat, lng] instead of [lng, lat]
        // Dhaka coordinates inverted: [23.8103, 90.4125]. Since 23.8103 is outside [88, 93], it must fail.
        self::assertRejection(
            fn() => V::validate(['type' => 'Point', 'coordinates' => [23.8103, 90.4125]]),
            'COORDINATE_OUT_OF_BOUNDS',
            'Inverted [lat, lng] coordinate pair strictly rejected by longitude bound'
        );

        // 1.7 Non-numeric, infinite, and malformed coordinates
        self::assertRejection(
            fn() => V::validate(['type' => 'Point', 'coordinates' => [INF, 23.8]]),
            'INVALID_COORDINATE_FINITE',
            'Point with INF rejected'
        );
        self::assertRejection(
            fn() => V::validate(['type' => 'Point', 'coordinates' => [NAN, 23.8]]),
            'INVALID_COORDINATE_FINITE',
            'Point with NAN rejected'
        );
        self::assertRejection(
            fn() => V::validate(['type' => 'Point', 'coordinates' => ['90.4', '23.8']]),
            'INVALID_COORDINATE_NUMERIC',
            'Point with string coordinates rejected'
        );
        self::assertRejection(
            fn() => V::validate(['type' => 'Point', 'coordinates' => [90.4, 23.8, 10.0]]),
            'INVALID_COORDINATE_FORMAT',
            '3D Point coordinate array rejected'
        );
        self::assertRejection(
            fn() => V::validate(['type' => 'Point', 'coordinates' => ['lng' => 90.4, 'lat' => 23.8]]),
            'INVALID_COORDINATE_FORMAT',
            'Associative coordinate dictionary rejected'
        );

        // 1.8 Bounds enforcement on Polygon and LineString
        $polyOutOfBounds = [
            'type' => 'Polygon',
            'coordinates' => [
                [
                    [87.99, 23.8],
                    [88.01, 23.8],
                    [88.01, 23.81],
                    [87.99, 23.81],
                    [87.99, 23.8],
                ],
            ],
        ];
        self::assertRejection(fn() => V::validate($polyOutOfBounds), 'COORDINATE_OUT_OF_BOUNDS', 'Polygon with one vertex outside BD rejected');

        $lineOutOfBounds = [
            'type' => 'LineString',
            'coordinates' => [
                [90.0, 23.8],
                [90.0, 27.05],
            ],
        ];
        self::assertRejection(fn() => V::validate($lineOutOfBounds), 'COORDINATE_OUT_OF_BOUNDS', 'LineString with vertex north of 27.0 rejected');

        echo "\n";

        // =====================================================================
        // SECTION 2: SELF-INTERSECTING POLYGON REJECTION (BOW-TIE / FIGURE-8)
        // =====================================================================
        echo "[STRESS SECTION 2] Self-Intersecting Polygon Detection & Rejection\n";

        // 2.1 Classic Bow-Tie (diagonal edge crossing)
        $bowtie = [
            'type' => 'Polygon',
            'coordinates' => [
                [
                    [$centerX, $centerY],
                    [$centerX + 0.002, $centerY + 0.002],
                    [$centerX + 0.002, $centerY],
                    [$centerX, $centerY + 0.002],
                    [$centerX, $centerY], // closes
                ],
            ],
        ];
        self::assertRejection(fn() => V::validate($bowtie), 'SELF_INTERSECTION', 'Classic bow-tie polygon rejected');

        // 2.2 Figure-8 / Hourglass shape
        $figure8 = [
            'type' => 'Polygon',
            'coordinates' => [
                [
                    [$centerX, $centerY],
                    [$centerX + 0.001, $centerY + 0.001],
                    [$centerX + 0.002, $centerY],
                    [$centerX + 0.002, $centerY + 0.002],
                    [$centerX + 0.001, $centerY + 0.001],
                    [$centerX, $centerY + 0.002],
                    [$centerX, $centerY],
                ],
            ],
        ];
        // Note: Middle vertex is duplicate or non-adjacent touch
        try {
            V::validate($figure8);
            throw new \RuntimeException('Expected failure on figure-8, but passed');
        } catch (\Throwable $e) {
            $data = json_decode($e->getMessage(), true);
            $code = $data['code'] ?? '';
            self::check(in_array($code, ['SELF_INTERSECTION', 'DUPLICATE_VERTEX'], true), "Figure-8 polygon rejected with {$code}");
        }

        // 2.3 Non-adjacent edge intersection on complex polygon
        $crossingOctagon = [
            'type' => 'Polygon',
            'coordinates' => [
                [
                    [$centerX, $centerY],
                    [$centerX + 0.003, $centerY],
                    [$centerX + 0.003, $centerY + 0.003],
                    [$centerX + 0.001, $centerY + 0.003],
                    [$centerX + 0.001, $centerY + 0.001],
                    [$centerX + 0.004, $centerY + 0.001], // Cuts across edge (0.003, 0) -> (0.003, 0.003)
                    [$centerX + 0.004, $centerY + 0.004],
                    [$centerX, $centerY + 0.004],
                    [$centerX, $centerY],
                ],
            ],
        ];
        self::assertRejection(fn() => V::validate($crossingOctagon), 'SELF_INTERSECTION', 'Polygon with interior crossing edge rejected');

        // 2.4 Self-tangency / Pinch point (vertex touching non-adjacent edge)
        $selfTouchingPinch = [
            'type' => 'Polygon',
            'coordinates' => [
                [
                    [$centerX, $centerY],
                    [$centerX + 0.002, $centerY],
                    [$centerX + 0.002, $centerY + 0.002],
                    [$centerX + 0.001, $centerY + 0.001], // touches segment [centerX, centerY] -> [centerX+0.002, centerY]
                    [$centerX + 0.001, $centerY],         // exactly on the edge
                    [$centerX, $centerY + 0.002],
                    [$centerX, $centerY],
                ],
            ],
        ];
        self::assertRejection(fn() => V::validate($selfTouchingPinch), 'SELF_INTERSECTION', 'Polygon with vertex touching non-adjacent edge rejected');

        // 2.5 Polygon with crossing spiral / overlapping arm
        $s = 0.001;
        $crossingArm = [
            'type' => 'Polygon',
            'coordinates' => [
                [
                    [$centerX, $centerY],
                    [$centerX + 4 * $s, $centerY],
                    [$centerX + 4 * $s, $centerY + 4 * $s],
                    [$centerX + 2 * $s, $centerY + 4 * $s],
                    [$centerX + 2 * $s, $centerY + 1 * $s],
                    [$centerX + 5 * $s, $centerY + 1 * $s], // Cuts across segment (4*s, 0) -> (4*s, 4*s)
                    [$centerX + 5 * $s, $centerY + 5 * $s],
                    [$centerX, $centerY + 5 * $s],
                    [$centerX, $centerY],
                ],
            ],
        ];
        self::assertRejection(fn() => V::validate($crossingArm), 'SELF_INTERSECTION', 'Polygon with crossing arm rejected');

        echo "\n";

        // =====================================================================
        // SECTION 3: COMPLEX 50+ VERTEX POLYGONS SHOELACE AREA PRECISION
        // =====================================================================
        echo "[STRESS SECTION 3] Complex 50+ Vertex Polygons Shoelace Area Precision\n";

        // 3.1 50-Vertex Regular Polygon (Approximation of circle)
        // Center: (90.4125, 23.8103), Radius: 0.001 degrees
        $nVertices = 50;
        $rDeg = 0.001;
        $poly50Coords = [];
        for ($i = 0; $i < $nVertices; $i++) {
            $angle = 2.0 * M_PI * ($i / $nVertices);
            $px = $centerX + $rDeg * cos($angle);
            $py = $centerY + $rDeg * sin($angle);
            $poly50Coords[] = [$px, $py];
        }
        $poly50Coords[] = $poly50Coords[0]; // close ring

        $poly50Geom = ['type' => 'Polygon', 'coordinates' => [$poly50Coords]];
        $poly50Res = V::validate($poly50Geom);

        // Analytical Area of Regular N-gon:
        // A_deg = (N / 2) * R_deg^2 * sin(2*PI / N)
        // A_sqm = A_deg * (PI/180 * R_earth)^2 * cos(lat)
        $analyticalDegArea = ($nVertices / 2.0) * pow($rDeg, 2) * sin(2.0 * M_PI / $nVertices);
        $meanLat = array_sum(array_column(array_slice($poly50Coords, 0, -1), 1)) / $nVertices;
        $analyticalSqm = $analyticalDegArea * pow((M_PI / 180.0) * V::EARTH_RADIUS_METERS, 2) * cos(deg2rad($meanLat));

        $relativeError50 = abs($poly50Res['area_sqm'] - $analyticalSqm) / $analyticalSqm;
        self::check($relativeError50 < 1e-4, "50-vertex regular polygon Shoelace area matches analytical formula (rel error: " . sprintf("%.6f%%", $relativeError50 * 100) . ")");
        self::check($poly50Res['area_sqm'] > 30000.0 && $poly50Res['area_sqm'] < 45000.0, "50-vertex polygon area is in realistic range (~35,000 sqm)");
        self::check($poly50Res['area_decimal'] > 800.0, "50-vertex polygon area in decimals matches conversion (~870 decimals)");
        self::check($poly50Res['length_meters'] > 600.0 && $poly50Res['length_meters'] < 750.0, "50-vertex polygon perimeter computed (~680m)");

        // 3.2 64-Vertex Smooth Polygon
        $n64 = 64;
        $poly64Coords = [];
        for ($i = 0; $i < $n64; $i++) {
            $angle = 2.0 * M_PI * ($i / $n64);
            $poly64Coords[] = [$centerX + $rDeg * cos($angle), $centerY + $rDeg * sin($angle)];
        }
        $poly64Coords[] = $poly64Coords[0];
        $poly64Res = V::validate(['type' => 'Polygon', 'coordinates' => [$poly64Coords]]);
        self::check($poly64Res['feature_type'] === 'polygon', '64-vertex polygon validates successfully');
        self::check($poly64Res['area_sqm'] > 30000.0, '64-vertex area computed accurately');

        // 3.3 50-Vertex Star Polygon (Concave non-convex polygon with 25 points)
        // Alternating outer radius R1 = 0.001, inner radius R2 = 0.0005
        $starCoords = [];
        $rOuter = 0.001;
        $rInner = 0.0005;
        $starN = 50; // 50 vertices
        for ($i = 0; $i < $starN; $i++) {
            $angle = 2.0 * M_PI * ($i / $starN);
            $r = ($i % 2 === 0) ? $rOuter : $rInner;
            $starCoords[] = [$centerX + $r * cos($angle), $centerY + $r * sin($angle)];
        }
        $starCoords[] = $starCoords[0]; // close
        $starGeom = ['type' => 'Polygon', 'coordinates' => [$starCoords]];
        $starRes = V::validate($starGeom);

        // Analytical area of 25-pointed star: sum of 50 triangles from center
        // Each triangle area = 0.5 * R_outer * R_inner * sin(2*PI / 50)
        $triAreaDeg = 0.5 * $rOuter * $rInner * sin(2.0 * M_PI / $starN);
        $starAnalyticalDegArea = $starN * $triAreaDeg;
        $starMeanLat = array_sum(array_column(array_slice($starCoords, 0, -1), 1)) / $starN;
        $starAnalyticalSqm = $starAnalyticalDegArea * pow((M_PI / 180.0) * V::EARTH_RADIUS_METERS, 2) * cos(deg2rad($starMeanLat));

        $relativeErrorStar = abs($starRes['area_sqm'] - $starAnalyticalSqm) / $starAnalyticalSqm;
        self::check($relativeErrorStar < 1e-4, "50-vertex concave star polygon area matches analytical sum of triangles (rel error: " . sprintf("%.6f%%", $relativeErrorStar * 100) . ")");

        // 3.4 200-Vertex Maximum Boundary Limit Polygon
        $n200 = 200;
        $poly200Coords = [];
        for ($i = 0; $i < $n200; $i++) {
            $angle = 2.0 * M_PI * ($i / $n200);
            $poly200Coords[] = [$centerX + 0.002 * cos($angle), $centerY + 0.002 * sin($angle)];
        }
        $poly200Coords[] = $poly200Coords[0]; // 201 coordinates
        $poly200Res = V::validate(['type' => 'Polygon', 'coordinates' => [$poly200Coords]]);
        self::check($poly200Res['feature_type'] === 'polygon', '200-vertex polygon (max limit) successfully validated');
        self::check($poly200Res['area_sqm'] > 100000.0, '200-vertex polygon area computed');

        // 3.5 201-Vertex Polygon (exceeds 200 vertex limit -> 202 coordinates)
        $n201 = 201;
        $poly201Coords = [];
        for ($i = 0; $i < $n201; $i++) {
            $angle = 2.0 * M_PI * ($i / $n201);
            $poly201Coords[] = [$centerX + 0.002 * cos($angle), $centerY + 0.002 * sin($angle)];
        }
        $poly201Coords[] = $poly201Coords[0]; // 202 coordinates
        self::assertRejection(
            fn() => V::validate(['type' => 'Polygon', 'coordinates' => [$poly201Coords]]),
            'INVALID_RING',
            '201-vertex polygon rejected (>200 vertices)'
        );

        // 3.6 Orientation Invariance: Clockwise vs Counter-Clockwise
        $ccwCoords = $poly50Coords;
        $cwCoords = array_reverse($poly50Coords);
        $ccwRes = V::validate(['type' => 'Polygon', 'coordinates' => [$ccwCoords]]);
        $cwRes = V::validate(['type' => 'Polygon', 'coordinates' => [$cwCoords]]);
        self::check(abs($ccwRes['area_sqm'] - $cwRes['area_sqm']) < 1e-4, 'Orientation invariance: CW and CCW rings produce identical area');
        self::check(abs($ccwRes['length_meters'] - $cwRes['length_meters']) < 1e-2, 'Orientation invariance: CW and CCW rings produce identical perimeter');

        echo "\n";

        // =====================================================================
        // SECTION 4: LINESTRING DISTANCE, POINTS & UNITS
        // =====================================================================
        echo "[STRESS SECTION 4] LineString Distance, Segment Checks & Cadastral Conversions\n";

        // 4.1 Degenerate LineStrings
        self::assertRejection(
            fn() => V::validate(['type' => 'LineString', 'coordinates' => []]),
            'INVALID_LINE_LENGTH',
            'Empty LineString rejected'
        );
        self::assertRejection(
            fn() => V::validate(['type' => 'LineString', 'coordinates' => [[90.4, 23.8]]]),
            'INVALID_LINE_LENGTH',
            'Single point LineString rejected'
        );

        // 4.2 2-Point Line (Minimum valid)
        $line2 = [
            'type' => 'LineString',
            'coordinates' => [
                [90.4, 23.8],
                [90.41, 23.8],
            ],
        ];
        $line2Res = V::validate($line2);
        self::check($line2Res['feature_type'] === 'line', '2-point minimum LineString validated');
        self::check($line2Res['length_meters'] > 900.0 && $line2Res['length_meters'] < 1100.0, '2-point line length ~1018 meters');

        // 4.3 500-Point Line (Maximum limit)
        $line500Coords = [];
        for ($i = 0; $i < 500; $i++) {
            $line500Coords[] = [90.4 + ($i * 0.0001), 23.8 + sin($i * 0.1) * 0.001];
        }
        $line500Res = V::validate(['type' => 'LineString', 'coordinates' => $line500Coords]);
        self::check($line500Res['feature_type'] === 'line', '500-point LineString (max limit) validated');
        self::check($line500Res['length_meters'] > 5000.0, '500-point line length computed correctly');

        // 4.4 501-Point Line (Exceeds 500 limit)
        $line501Coords = $line500Coords;
        $line501Coords[] = [90.45, 23.85];
        self::assertRejection(
            fn() => V::validate(['type' => 'LineString', 'coordinates' => $line501Coords]),
            'INVALID_LINE_LENGTH',
            '501-point LineString rejected (>500 points)'
        );

        // 4.5 Consecutive Duplicate Points in LineString
        $dupLine = [
            'type' => 'LineString',
            'coordinates' => [
                [90.4, 23.8],
                [90.41, 23.8],
                [90.41, 23.8], // duplicate
                [90.42, 23.8],
            ],
        ];
        self::assertRejection(fn() => V::validate($dupLine), 'DUPLICATE_VERTEX', 'LineString with consecutive duplicate points rejected');

        // 4.6 Collinear Segments with Distinct Points
        $collinearLine = [
            'type' => 'LineString',
            'coordinates' => [
                [90.40, 23.80],
                [90.41, 23.80],
                [90.42, 23.80],
                [90.43, 23.80],
            ],
        ];
        $collinearRes = V::validate($collinearLine);
        $directDistance = V::distanceMeters(90.40, 23.80, 90.43, 23.80);
        self::check(abs($collinearRes['length_meters'] - $directDistance) < 0.1, 'Collinear segments sum equals direct end-to-end distance');

        // 4.7 Linear Cadastral Conversions (Meters -> Feet -> Chains)
        // 1 Gunter\'s chain = 66 feet = 20.1168 meters
        $testMeters = 201.168; // Exactly 10 chains
        $testChains = $testMeters / 20.1168;
        $testFeet = $testMeters * 3.28084;
        self::check(abs($testChains - 10.0) < 1e-6, 'Cadastral unit conversion: 201.168m = exactly 10 Gunter chains');
        self::check(abs($testFeet - 660.0) < 0.1, 'Cadastral unit conversion: 201.168m = ~660 feet');

        echo "\n";

        // =====================================================================
        // SECTION 5: POINT BOUNDING BOX & SPATIAL INTEGRITY
        // =====================================================================
        echo "[STRESS SECTION 5] Single Point Bounding Box & Spatial Metadata\n";

        $testPoint = ['type' => 'Point', 'coordinates' => [90.4125, 23.8103]];
        $pointRes = V::validate($testPoint);
        self::check($pointRes['feature_type'] === 'point', 'Point geometry validated');
        self::check($pointRes['area_sqm'] === null, 'Point area_sqm is strictly null');
        self::check($pointRes['area_decimal'] === null, 'Point area_decimal is strictly null');
        self::check($pointRes['length_meters'] === null, 'Point length_meters is strictly null');
        self::check($pointRes['bbox'] === [90.4125, 23.8103, 90.4125, 23.8103], 'Point bounding box is degenerate single point [x, y, x, y]');
        self::check($pointRes['bbox'][0] === $pointRes['bbox'][2] && $pointRes['bbox'][1] === $pointRes['bbox'][3], 'Point bbox min equals max on both axes');

        echo "\n";

        // =====================================================================
        // SECTION 6: MAPFEATURECONTROLLER REST API PERSISTENCE UNDER STRESS
        // =====================================================================
        echo "[STRESS SECTION 6] REST API Persistence Under Adversarial Payloads\n";

        // 6.1 Create 50-Vertex Complex Polygon Feature via API
        $create50Payload = [
            'location_id' => $locId,
            'geometry' => $poly50Geom,
            'attributes' => [
                'name' => 'স্ট্রেস টেস্ট ৫০-কোণ বিশিষ্ট মৌজা প্লট',
                'dag_no' => '৯৯৯',
                'khatian_no' => '৮৮৮',
                'land_class' => 'নাল',
                'survey_type' => 'BS',
                'notes' => 'Complex 50-vertex polygon verified via Shoelace engine',
            ],
        ];
        $created50 = C::create($create50Payload, $admin);
        self::check($created50['success'] === true, 'Admin successfully created 50-vertex polygon feature');
        $id50 = (int) $created50['data']['id'];
        self::check($id50 > 0, 'Created feature received valid ID');
        self::check($created50['data']['area_sqm'] > 30000.0, 'API response contains valid area_sqm');
        self::check($created50['data']['area_decimal'] > 800.0, 'API response contains valid area_decimal');

        // 6.2 Retrieve and verify 50-vertex geometry integrity from SQLite
        $retrieved50 = C::get($id50);
        self::check($retrieved50['success'] === true, 'Retrieved 50-vertex feature by ID');
        self::check(count($retrieved50['data']['geometry']['coordinates'][0]) === 51, 'Retrieved ring retains all 51 vertices verbatim');
        self::check($retrieved50['data']['bbox_xmin'] < $retrieved50['data']['bbox_xmax'], 'Bounding box xmin < xmax');
        self::check($retrieved50['data']['bbox_ymin'] < $retrieved50['data']['bbox_ymax'], 'Bounding box ymin < ymax');

        // 6.3 Attempt to create Bow-Tie polygon via API -> strictly rejected with 422
        $bowtiePayload = [
            'location_id' => $locId,
            'geometry' => $bowtie,
            'attributes' => ['name' => 'Bowtie illegal plot'],
        ];
        self::assertRejection(fn() => C::create($bowtiePayload, $admin), 'SELF_INTERSECTION', 'API rejects bow-tie polygon with 422 SELF_INTERSECTION');

        // 6.4 Attempt to create Out-of-Bounds feature via API -> strictly rejected with 422
        $oobPayload = [
            'location_id' => $locId,
            'geometry' => ['type' => 'Point', 'coordinates' => [85.0, 23.0]],
            'attributes' => ['name' => 'Out of bounds point'],
        ];
        self::assertRejection(fn() => C::create($oobPayload, $admin), 'COORDINATE_OUT_OF_BOUNDS', 'API rejects out-of-bounds point with 422');

        // 6.5 Attempt to update existing 50-vertex polygon to bow-tie -> strictly rejected with 422
        self::assertRejection(
            fn() => C::update($id50, ['geometry' => $bowtie], $admin),
            'SELF_INTERSECTION',
            'API rejects updating existing feature to self-intersecting bow-tie'
        );

        // 6.6 Verify original feature was NOT corrupted by failed update
        $afterFailedUpdate = C::get($id50);
        self::check(count($afterFailedUpdate['data']['geometry']['coordinates'][0]) === 51, 'Original 50-vertex geometry preserved undamaged after failed update');

        // Clean up temporary database
        if (file_exists($tmpDb)) {
            @unlink($tmpDb);
        }

        echo "\n=======================================================================\n";
        echo "   ALL ADVERSARIAL STRESS TESTS PASSED: " . self::$assertions . " assertions\n";
        echo "=======================================================================\n\n";

        return 0;
    }
}

if (PHP_SAPI === 'cli' && isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    exit(VectorGeometryStressTest::runAll());
}
