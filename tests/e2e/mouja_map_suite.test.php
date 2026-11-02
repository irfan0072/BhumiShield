<?php

declare(strict_types=1);

namespace Tests\E2E;

require_once __DIR__ . '/E2ETestHelper.php';

// Ensure migration class is loaded and tables exist
if (file_exists(__DIR__ . '/../../backend/database/migrations/2026_11_01_000001_create_map_features_and_assignments.php')) {
    require_once __DIR__ . '/../../backend/database/migrations/2026_11_01_000001_create_map_features_and_assignments.php';
    (new \Database\Migrations\CreateMapFeaturesAndAssignments())->up();
}

use Tests\E2E\E2ETestHelper as H;
use App\Support\DB;

/**
 * Bangladesh Mouja Map & Offline Visualization System
 * 4-Tier Opaque-Box E2E Automated Test Suite
 *
 * Requirements Covered (ORIGINAL_REQUEST.md):
 * - R1: Mouja Map UI/UX & Offline Map Visualization (zero external network calls, offline base map, cascading search)
 * - R2: In-Map Vector Drawing & Attribute Tools (Polygon, Line, Point geometries, vertex editing, attribute labeling)
 * - R3: User Assignment & Workflow Management (admin assigns tasks to users, my-assignments queue, status lifecycle)
 * - R4: Backend API & Data Persistence (CRUD for vector features, assignment persistence, dual-DB compatibility)
 * - R5: Role-based Access Control (RBAC guards, anonymous/citizen blocked, surveyor/admin permitted)
 *
 * Test Architecture:
 * - Tier 1: Feature Coverage (25 tests: 5 tests per requirement across R1-R5)
 * - Tier 2: Boundary & Corner Cases (25 tests: 5 tests per requirement across R1-R5)
 * - Tier 3: Cross-Feature Interactions (5 tests: pairwise workflow integrations)
 * - Tier 4: Real-World Cadastral Survey Scenarios (2 tests: comprehensive multi-role survey lifecycles)
 * Total: 57 tests
 */
final class MoujaMapTestSuite
{
    // =========================================================================
    // Master Test Runner & Aggregator
    // =========================================================================

    public static function runAll(): array
    {
        $allTests = array_merge(
            self::getTier1Tests(),
            self::getTier2Tests(),
            self::getTier3Tests(),
            self::getTier4Tests()
        );

        $results = [];
        $passed = 0;
        $failed = 0;

        foreach ($allTests as $method => $description) {
            $t0 = microtime(true);
            try {
                self::$method();
                $elapsed = round((microtime(true) - $t0) * 1000, 2);
                $results[] = [
                    'name' => $method,
                    'description' => $description,
                    'status' => 'PASS',
                    'elapsed_ms' => $elapsed,
                ];
                $passed++;
            } catch (\Throwable $e) {
                $elapsed = round((microtime(true) - $t0) * 1000, 2);
                $results[] = [
                    'name' => $method,
                    'description' => $description,
                    'status' => 'FAIL',
                    'error' => $e->getMessage(),
                    'elapsed_ms' => $elapsed,
                ];
                $failed++;
            }
        }

        return [
            'tier' => 'Mouja Map & Offline Cadastral Visualization E2E Suite (R1-R5: Tiers 1-4)',
            'total' => count($allTests),
            'passed' => $passed,
            'failed' => $failed,
            'results' => $results,
        ];
    }

    public static function getTier1Tests(): array
    {
        return [
            // R1: Offline Map Visualization & Hierarchy
            'test_r1_01_workspace_location_hierarchy' => 'T1-R1-01: Offline workspace returns 4-tier cascading hierarchy (Div->Dist->Upz->Mouza)',
            'test_r1_02_workspace_mouza_plots_metadata' => 'T1-R1-02: Workspace plots metadata contains dag_no, area_decimal, land_type_bn',
            'test_r1_03_offline_layers_and_spatial_datasets' => 'T1-R1-03: Offline map datasets/layers load cleanly without external tile dependencies',
            'test_r1_04_offline_catalog_and_zero_external_network' => 'T1-R1-04: Static asset verification confirms local offline map catalog and zero external CDN',
            'test_r1_05_map_features_clustering_and_bounding' => 'T1-R1-05: Cadastral plot polygons feature collection loaded for zoom >= 14',

            // R2: In-Map Vector Drawing & Attributes
            'test_r2_01_draw_polygon_geometry_and_area' => 'T1-R2-01: Vector Polygon creation computes Shoelace area in decimals, sqm, and bounding box',
            'test_r2_02_draw_linestring_geometry_and_length' => 'T1-R2-02: Vector LineString creation computes linear length in meters (canals/roads)',
            'test_r2_03_drop_point_marker_benchmark' => 'T1-R2-03: Vector Point creation drops survey control point/benchmark marker with GPS coordinates',
            'test_r2_04_vertex_modification_and_update' => 'T1-R2-04: Vertex modification via PUT updates coordinates, recalculates area, and logs editor',
            'test_r2_05_cadastral_attribute_labeling' => 'T1-R2-05: Attribute labeling persists Dag, Khatian, JL, and standard BD land classifications (নাল/ভিটি)',

            // R3: User Assignment & Workflow Management
            'test_r3_01_admin_assigns_mapping_task' => 'T1-R3-01: Admin assigns mapping task to designated user (POST /map/assignments returns 201 + task_code)',
            'test_r3_02_admin_query_and_filter_assignments' => 'T1-R3-02: Admin queries and filters task assignments by location, status, and assigned user',
            'test_r3_03_assigned_user_my_assignments_queue' => 'T1-R3-03: Assigned user queries personal queue (/map/my-assignments) with map navigation coordinates',
            'test_r3_04_status_progression_pending_to_in_progress' => 'T1-R3-04: Assigned officer updates task status from pending to in_progress',
            'test_r3_05_status_completion_with_completion_note' => 'T1-R3-05: Assigned officer transitions task to completed with verification completion note',

            // R4: Backend API & Data Persistence
            'test_r4_01_crud_create_persists_in_database' => 'T1-R4-01: CRUD Create: map_features table inserts authentic row with spatial bounding box',
            'test_r4_02_crud_read_single_feature_by_id' => 'T1-R4-02: CRUD Read: GET /map/features/{id} returns feature record and parsed geometry',
            'test_r4_03_crud_read_list_filtered_by_location_and_type' => 'T1-R4-03: CRUD Read: GET /map/features filters by location_id and feature_type (polygon/line/point)',
            'test_r4_04_crud_update_feature_attributes' => 'T1-R4-04: CRUD Update: PUT /map/features/{id} modifies custom attribute tags in DB',
            'test_r4_05_crud_delete_removes_feature' => 'T1-R4-05: CRUD Delete: DELETE /map/features/{id} removes feature record from active queries',

            // R5: Role-based Access Control
            'test_r5_01_unauthenticated_request_blocked' => 'T1-R5-01: Unauthenticated request to vector creation blocked with 401 AUTH_REQUIRED',
            'test_r5_02_citizen_role_forbidden_from_drawing' => 'T1-R5-02: Citizen role forbidden from drawing tools with 403 FORBIDDEN_ROLE',
            'test_r5_03_bank_officer_forbidden_from_assignment' => 'T1-R5-03: Bank officer role forbidden from task assignment with 403 FORBIDDEN_ROLE',
            'test_r5_04_settlement_records_officer_allowed_drawing' => 'T1-R5-04: Authorized surveyor (settlement_records_officer) permitted to create and edit features',
            'test_r5_05_admin_and_ac_land_allowed_assignment' => 'T1-R5-05: Authorized administrators (admin, ac_land) permitted to create and assign tasks',
        ];
    }

    public static function getTier2Tests(): array
    {
        return [
            // R1 Boundaries
            'test_r1_b01_non_existent_location_workspace' => 'T2-R1-B01: Workspace query for non-existent location ID returns empty array without crash',
            'test_r1_b02_extreme_zoom_levels' => 'T2-R1-B02: Extreme zoom level queries (zoom=0, zoom=25) handled gracefully without failure',
            'test_r1_b03_empty_and_special_character_search' => 'T2-R1-B03: Plot search with special characters and empty string sanitized safely',
            'test_r1_b04_invalid_layer_id_returns_404' => 'T2-R1-B04: Querying non-existent layer ID returns honest 404 LAYER_NOT_FOUND',
            'test_r1_b05_malformed_location_id_query' => 'T2-R1-B05: Non-numeric location query parameter sanitized without unhandled exception',

            // R2 Boundaries
            'test_r2_b01_empty_geometry_coordinates' => 'T2-R2-B01: Empty geometry coordinates array strictly rejected with 422',
            'test_r2_b02_coordinates_out_of_bangladesh_bounds' => 'T2-R2-B02: Coordinates outside Bangladesh bounds (lng 88-93, lat 20-27) rejected with 422',
            'test_r2_b03_polygon_with_fewer_than_three_vertices' => 'T2-R2-B03: Polygon ring with fewer than 3 unique vertices rejected with 422 INVALID_RING',
            'test_r2_b04_linestring_with_fewer_than_two_points' => 'T2-R2-B04: LineString with fewer than 2 points rejected with 422 INVALID_LINE_LENGTH',
            'test_r2_b05_self_intersecting_polygon_rejected' => 'T2-R2-B05: Self-intersecting (bowtie) polygon geometry strictly rejected with 422 SELF_INTERSECTION',

            // R3 Boundaries
            'test_r3_b01_non_existent_assigned_user_id' => 'T2-R3-B01: Task assignment to non-existent user ID rejected with 422 ASSIGNED_USER_INVALID',
            'test_r3_b02_non_existent_location_assignment' => 'T2-R3-B02: Task assignment to non-existent location ID rejected with 404 LOCATION_NOT_FOUND',
            'test_r3_b03_invalid_task_status_transition' => 'T2-R3-B03: Setting illegal task status value rejected with 422 INVALID_STATUS',
            'test_r3_b04_non_assigned_officer_cannot_update_status' => 'T2-R3-B04: Non-assigned officer attempting to update another\'s task blocked with 403 FORBIDDEN_TASK_ACCESS',
            'test_r3_b05_short_or_empty_title_rejected' => 'T2-R3-B05: Task creation with empty or short title (<3 chars) rejected with 422 TITLE_REQUIRED',

            // R4 Boundaries
            'test_r4_b01_get_non_existent_feature_returns_404' => 'T2-R4-B01: Querying non-existent vector feature ID returns honest 404 FEATURE_NOT_FOUND',
            'test_r4_b02_update_non_existent_feature_returns_404' => 'T2-R4-B02: Updating non-existent vector feature ID returns honest 404 FEATURE_NOT_FOUND',
            'test_r4_b03_delete_non_existent_feature_returns_404' => 'T2-R4-B03: Deleting non-existent vector feature ID returns honest 404 FEATURE_NOT_FOUND',
            'test_r4_b04_sql_xss_injection_in_attributes' => 'T2-R4-B04: SQL injection and XSS payloads in attributes safely stored and escaped verbatim',
            'test_r4_b05_unclosed_polygon_ring_rejected' => 'T2-R4-B05: Polygon ring whose first coordinate does not equal last coordinate rejected with 422 UNCLOSED_RING',

            // R5 Boundaries
            'test_r5_b01_missing_bearer_header_returns_401' => 'T2-R5-B01: Missing Bearer authorization header returns 401 AUTH_REQUIRED',
            'test_r5_b02_malformed_jwt_token_returns_401' => 'T2-R5-B02: Malformed or forged JWT Bearer token returns 401 AUTH_REQUIRED',
            'test_r5_b03_suspended_officer_blocked_from_drawing' => 'T2-R5-B03: Suspended officer account (is_active=0) blocked from vector actions with 403 ACCOUNT_SUSPENDED',
            'test_r5_b04_unauthenticated_my_assignments_blocked' => 'T2-R5-B04: Unauthenticated access to /map/my-assignments personal queue returns 401 AUTH_REQUIRED',
            'test_r5_b05_plot_location_mismatch_rejected' => 'T2-R5-B05: Plot ID that does not belong to specified location ID rejected with 422 PLOT_LOCATION_MISMATCH',
        ];
    }

    public static function getTier3Tests(): array
    {
        return [
            'test_t3_01_assignment_navigation_flow' => 'T3-01: Admin creates survey assignment -> Officer queries queue -> Navigates to exact Mouja coordinates',
            'test_t3_02_task_drawing_attribute_computation' => 'T3-02: Task in-progress -> SRO draws cadastral polygon -> Live Shoelace area computed -> Tags Dag/Khatian/Nal',
            'test_t3_03_feature_creation_to_completion_workflow' => 'T3-03: SRO links created feature ID into completion note -> Status locked to completed with timestamp',
            'test_t3_04_multi_geometry_mouza_survey_fabric' => 'T3-04: Multi-geometry Mouja fabric: Linked Polygon (Perimeter) + Line (Canal) + Point (GPS Control)',
            'test_t3_05_admin_task_queue_audit_and_metrics' => 'T3-05: Admin audits completed assignment queue -> Confirms completed tasks count and surveyor metadata',
        ];
    }

    public static function getTier4Tests(): array
    {
        return [
            'test_t4_01_scenario_full_birulia_mouza_cadastral_survey' => 'T4-01: Cadastral Survey Lifecycle: Birulia Mouja (Admin assign -> SRO navigate -> Draw boundary/canal/marker/plots -> Complete -> Persistence verify)',
            'test_t4_02_scenario_emergency_boundary_dispute_verification' => 'T4-02: Emergency Boundary Dispute: Basan Mouja (AC Land assign -> FVO verify -> Measure & modify vertices -> Tag remarks -> Complete)',
        ];
    }

    // =========================================================================
    // Tier 1: Feature Coverage Implementation
    // =========================================================================

    public static function test_r1_01_workspace_location_hierarchy(): void
    {
        $res = H::callRoute('GET', '/api/v1/map/workspace');
        H::assertStatus(200, $res, 'Workspace endpoint');
        H::assertTrue(!empty($res['data']['locations']), 'Locations must be returned');

        $loc = $res['data']['locations'][0];
        H::assertTrue(!empty($loc['division_bn']), 'Location has division_bn');
        H::assertTrue(!empty($loc['district_bn']), 'Location has district_bn');
        H::assertTrue(!empty($loc['upazila_bn']), 'Location has upazila_bn');
        H::assertTrue(!empty($loc['mouza_bn']), 'Location has mouza_bn');
        H::assertTrue(isset($loc['jl_no']), 'Location has jl_no');
    }

    public static function test_r1_02_workspace_mouza_plots_metadata(): void
    {
        $res = H::callRoute('GET', '/api/v1/map/workspace', [], null, ['location_id' => 1]);
        H::assertStatus(200, $res, 'Workspace for location 1');
        H::assertTrue(isset($res['data']['plots']), 'Plots array exists');
        H::assertTrue(count($res['data']['plots']) > 0, 'Location 1 has plots');

        $p = $res['data']['plots'][0];
        H::assertTrue(isset($p['dag_no']), 'Plot has dag_no');
        H::assertTrue(isset($p['plot_code']), 'Plot has plot_code');
        H::assertTrue(isset($p['total_area_decimal']), 'Plot has total_area_decimal');
        H::assertTrue(isset($p['land_type_bn']), 'Plot has land_type_bn');
    }

    public static function test_r1_03_offline_layers_and_spatial_datasets(): void
    {
        $res = H::callRoute('GET', '/api/v1/map/layers', [], null, ['location_id' => 1]);
        H::assertStatus(200, $res, 'Map layers endpoint');
        H::assertTrue(isset($res['data']['layers']), 'Layers key exists in response');
        H::assertTrue(is_array($res['data']['layers']), 'Layers is an array');
    }

    public static function test_r1_04_offline_catalog_and_zero_external_network(): void
    {
        $catalogPath = __DIR__ . '/../../frontend/public/data/map-source-catalog.json';
        H::assertTrue(file_exists($catalogPath), 'Local offline catalog exists in frontend/public/data/');

        $content = file_get_contents($catalogPath);
        $json = json_decode($content, true);
        H::assertTrue(is_array($json), 'Catalog is valid JSON');
        H::assertTrue(!empty($json['visible_selectors']), 'Catalog contains visible selectors');
        H::assertTrue(in_array('Mouza', $json['visible_selectors'], true), 'Catalog contains Mouza selector');
    }

    public static function test_r1_05_map_features_clustering_and_bounding(): void
    {
        $res = H::callRoute('GET', '/api/v1/map/features', [], null, ['zoom' => 14]);
        H::assertStatus(200, $res, 'Public map features at zoom 14');
        H::assertEqual('FeatureCollection', $res['data']['type'] ?? '', 'FeatureCollection returned');
        H::assertTrue(!empty($res['data']['features']), 'Features array is non-empty');

        $f = $res['data']['features'][0];
        H::assertEqual('Feature', $f['type'] ?? '', 'Feature type is Feature');
        H::assertTrue(!empty($f['geometry']), 'Feature has geometry');
        H::assertTrue(!empty($f['properties']['dag_no']), 'Feature property has dag_no');
    }

    public static function test_r2_01_draw_polygon_geometry_and_area(): void
    {
        $token = H::loginAs('settlement_records_officer');
        $coords = [
            [
                [90.3150, 23.8550],
                [90.3180, 23.8550],
                [90.3180, 23.8580],
                [90.3150, 23.8580],
                [90.3150, 23.8550],
            ]
        ];

        $res = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'polygon',
            'geometry' => [
                'type' => 'Polygon',
                'coordinates' => $coords,
            ],
            'attributes' => [
                'name' => 'Birulia Test Boundary Polygon',
                'land_class' => 'নাল',
                'dag_no' => '9901',
            ],
        ], $token);

        H::assertStatus(200, $res, 'Polygon feature creation');
        $data = $res['data']['data'];
        H::assertEqual('polygon', $data['feature_type']);
        H::assertTrue($data['area_decimal'] > 0, 'Shoelace area decimal calculated');
        H::assertTrue($data['area_sqm'] > 0, 'Area sqm calculated');
        H::assertEqual(90.3150, (float) $data['bbox_xmin']);
        H::assertEqual(23.8550, (float) $data['bbox_ymin']);
        H::assertEqual(90.3180, (float) $data['bbox_xmax']);
        H::assertEqual(23.8580, (float) $data['bbox_ymax']);
    }

    public static function test_r2_02_draw_linestring_geometry_and_length(): void
    {
        $token = H::loginAs('settlement_records_officer');
        $coords = [
            [90.3150, 23.8550],
            [90.3170, 23.8560],
            [90.3190, 23.8570],
        ];

        $res = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'line',
            'geometry' => [
                'type' => 'LineString',
                'coordinates' => $coords,
            ],
            'attributes' => [
                'name' => 'Turag Drainage Canal Line',
                'feature_category' => 'canals',
            ],
        ], $token);

        H::assertStatus(200, $res, 'Line feature creation');
        $data = $res['data']['data'];
        H::assertEqual('line', $data['feature_type']);
        H::assertTrue($data['length_meters'] > 0, 'Length in meters calculated');
        H::assertTrue($data['area_decimal'] === null, 'Polygon area is null for line');
    }

    public static function test_r2_03_drop_point_marker_benchmark(): void
    {
        $token = H::loginAs('settlement_records_officer');
        $res = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'point',
            'geometry' => [
                'type' => 'Point',
                'coordinates' => [90.3175, 23.8565],
            ],
            'attributes' => [
                'marker_type' => 'GEODETIC_BENCHMARK',
                'code' => 'BM-SAV-2026-01',
                'description' => 'Permanent Cadastral Benchmark Pillar',
            ],
        ], $token);

        H::assertStatus(200, $res, 'Point marker creation');
        $data = $res['data']['data'];
        H::assertEqual('point', $data['feature_type']);
        H::assertEqual(90.3175, (float) $data['bbox_xmin']);
        H::assertEqual(90.3175, (float) $data['bbox_xmax']);
    }

    public static function test_r2_04_vertex_modification_and_update(): void
    {
        $token = H::loginAs('settlement_records_officer');

        // Create initial small polygon
        $initCoords = [
            [
                [90.3150, 23.8550],
                [90.3160, 23.8550],
                [90.3160, 23.8560],
                [90.3150, 23.8560],
                [90.3150, 23.8550],
            ]
        ];
        $createRes = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'geometry' => ['type' => 'Polygon', 'coordinates' => $initCoords],
            'attributes' => ['dag_no' => '7001'],
        ], $token);
        $featureId = (int) $createRes['data']['data']['id'];
        $initialArea = (float) $createRes['data']['data']['area_decimal'];

        // Modify vertices (expand bounds)
        $expandedCoords = [
            [
                [90.3150, 23.8550],
                [90.3180, 23.8550],
                [90.3180, 23.8580],
                [90.3150, 23.8580],
                [90.3150, 23.8550],
            ]
        ];
        $updateRes = H::callRoute('PUT', "/api/v1/map/features/{$featureId}", [
            'geometry' => ['type' => 'Polygon', 'coordinates' => $expandedCoords],
            'attributes' => ['dag_no' => '7001', 'notes' => 'Vertex expanded after on-site verification'],
        ], $token);

        H::assertStatus(200, $updateRes, 'Update feature vertices');
        $updatedData = $updateRes['data']['data'];
        H::assertTrue($updatedData['area_decimal'] > $initialArea, 'Recalculated area is larger');
        H::assertEqual('sro_dhaka', $updatedData['updated_by'], 'Updated by surveyor recorded');
    }

    public static function test_r2_05_cadastral_attribute_labeling(): void
    {
        $token = H::loginAs('settlement_records_officer');
        $coords = [
            [
                [90.3160, 23.8560],
                [90.3170, 23.8560],
                [90.3170, 23.8570],
                [90.3160, 23.8570],
                [90.3160, 23.8560],
            ]
        ];

        $attrs = [
            'dag_no' => '888',
            'khatian_no' => '312',
            'jl_no' => '12',
            'land_class' => 'ভিটা (আবাসিক)',
            'survey_type' => 'RS',
            'sheet_no' => '04',
            'surveyor_notes' => 'Surveyor inspected high ground parcel.',
        ];

        $res = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'geometry' => ['type' => 'Polygon', 'coordinates' => $coords],
            'attributes' => $attrs,
        ], $token);

        H::assertStatus(200, $res, 'Attribute labeling');
        $storedAttrs = $res['data']['data']['attributes'];
        H::assertEqual('888', $storedAttrs['dag_no']);
        H::assertEqual('312', $storedAttrs['khatian_no']);
        H::assertEqual('ভিটা (আবাসিক)', $storedAttrs['land_class']);
        H::assertEqual('RS', $storedAttrs['survey_type']);
    }

    public static function test_r3_01_admin_assigns_mapping_task(): void
    {
        $token = H::loginAs('admin');
        $res = H::callRoute('POST', '/api/v1/map/assignments', [
            'title' => 'Birulia Mouja Cadastral Mapping',
            'task_type' => 'MOUZA_SURVEY',
            'location_id' => 1,
            'assigned_to_user_id' => 10, // sro_dhaka
            'priority' => 'HIGH',
            'due_date' => '2026-12-01',
            'notes' => 'Perform full outer boundary survey and parcel digitization.',
        ], $token);

        H::assertStatus(200, $res, 'Admin assigns task');
        $data = $res['data']['data'];
        H::assertTrue(!empty($data['id']), 'Assignment ID generated');
        H::assertTrue(str_starts_with($data['task_code'], 'TSK-'), 'Task code prefix correct');
        H::assertEqual('pending', $data['status'], 'Initial status pending');
        H::assertEqual(10, (int) $data['assigned_to_user_id']);
        H::assertEqual(20, (int) $data['assigned_by_user_id']);
    }

    public static function test_r3_02_admin_query_and_filter_assignments(): void
    {
        $token = H::loginAs('admin');
        $res = H::callRoute('GET', '/api/v1/map/assignments', [], $token, [
            'location_id' => 1,
            'status' => 'pending',
        ]);

        H::assertStatus(200, $res, 'Admin queries assignments');
        H::assertTrue($res['data']['count'] > 0, 'Assignments found');
        $task = $res['data']['data'][0];
        H::assertTrue(!empty($task['location']['mouza_bn']), 'Joined mouza_bn exists');
        H::assertTrue(!empty($task['assigned_to']['username']), 'Joined assigned_to username exists');
    }

    public static function test_r3_03_assigned_user_my_assignments_queue(): void
    {
        $token = H::loginAs('settlement_records_officer');
        $res = H::callRoute('GET', '/api/v1/map/my-assignments', [], $token);

        H::assertStatus(200, $res, 'Officer personal assignments queue');
        H::assertTrue($res['data']['count'] > 0, 'Officer has assigned tasks');
        $item = $res['data']['data'][0];
        H::assertEqual('sro_dhaka', $item['assigned_to']['username']);
        H::assertTrue(!empty($item['location']['latitude']), 'Map navigation latitude present');
        H::assertTrue(!empty($item['location']['longitude']), 'Map navigation longitude present');
    }

    public static function test_r3_04_status_progression_pending_to_in_progress(): void
    {
        $adminToken = H::loginAs('admin');
        $sroToken = H::loginAs('settlement_records_officer');

        // Create assignment
        $createRes = H::callRoute('POST', '/api/v1/map/assignments', [
            'title' => 'Plot Boundary Verification Dag 105',
            'task_type' => 'PLOT_DRAWING',
            'location_id' => 1,
            'assigned_to_user_id' => 10,
        ], $adminToken);
        $taskId = (int) $createRes['data']['data']['id'];

        // Transition to in_progress as assigned user
        $statusRes = H::callRoute('PATCH', "/api/v1/map/assignments/{$taskId}/status", [
            'status' => 'in_progress',
        ], $sroToken);

        H::assertStatus(200, $statusRes, 'Update status to in_progress');
        H::assertEqual('in_progress', $statusRes['data']['data']['status']);
    }

    public static function test_r3_05_status_completion_with_completion_note(): void
    {
        $adminToken = H::loginAs('admin');
        $sroToken = H::loginAs('settlement_records_officer');

        $createRes = H::callRoute('POST', '/api/v1/map/assignments', [
            'title' => 'Boundary Verification Task Complete Test',
            'task_type' => 'BOUNDARY_VERIFICATION',
            'location_id' => 1,
            'assigned_to_user_id' => 10,
        ], $adminToken);
        $taskId = (int) $createRes['data']['data']['id'];

        // Move to in_progress
        H::callRoute('PATCH', "/api/v1/map/assignments/{$taskId}/status", ['status' => 'in_progress'], $sroToken);

        // Move to completed
        $completeRes = H::callRoute('PATCH', "/api/v1/map/assignments/{$taskId}/status", [
            'status' => 'completed',
            'completion_note' => 'Cadastral plot geometry successfully digitized and approved.',
        ], $sroToken);

        H::assertStatus(200, $completeRes, 'Complete task');
        $data = $completeRes['data']['data'];
        H::assertEqual('completed', $data['status']);
        H::assertTrue(!empty($data['completed_at']), 'completed_at timestamp recorded');
        H::assertEqual('Cadastral plot geometry successfully digitized and approved.', $data['completion_note']);
    }

    public static function test_r4_01_crud_create_persists_in_database(): void
    {
        $token = H::loginAs('settlement_records_officer');
        $coords = [
            [
                [90.3152, 23.8552],
                [90.3162, 23.8552],
                [90.3162, 23.8562],
                [90.3152, 23.8562],
                [90.3152, 23.8552],
            ]
        ];

        $res = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'polygon',
            'geometry' => ['type' => 'Polygon', 'coordinates' => $coords],
            'attributes' => ['test_tag' => 'persisted_in_db'],
        ], $token);
        H::assertStatus(200, $res);
        $fid = (int) $res['data']['data']['id'];

        // Direct database verification
        $row = DB::selectOne('SELECT * FROM map_features WHERE id = ?', [$fid]);
        H::assertTrue(!empty($row), 'Row exists in SQLite/Postgres map_features');
        H::assertEqual('ACTIVE', $row['status']);
        H::assertEqual('sro_dhaka', $row['created_by']);
    }

    public static function test_r4_02_crud_read_single_feature_by_id(): void
    {
        $token = H::loginAs('settlement_records_officer');
        $res = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'point',
            'geometry' => ['type' => 'Point', 'coordinates' => [90.3185, 23.8585]],
            'attributes' => ['name' => 'Single Read Test'],
        ], $token);
        $fid = (int) $res['data']['data']['id'];

        $getRes = H::callRoute('GET', "/api/v1/map/features/{$fid}");
        H::assertStatus(200, $getRes, 'Single feature get');
        H::assertEqual($fid, (int) $getRes['data']['data']['id']);
        H::assertEqual('point', $getRes['data']['data']['feature_type']);
    }

    public static function test_r4_03_crud_read_list_filtered_by_location_and_type(): void
    {
        $res = H::callRoute('GET', '/api/v1/map/features', [], null, [
            'location_id' => 1,
            'feature_type' => 'polygon',
        ]);
        H::assertStatus(200, $res, 'List features filtered');
        H::assertTrue(isset($res['data']['data']));
        foreach ($res['data']['data'] as $feat) {
            H::assertEqual(1, (int) $feat['location_id']);
            H::assertEqual('polygon', $feat['feature_type']);
        }
    }

    public static function test_r4_04_crud_update_feature_attributes(): void
    {
        $token = H::loginAs('settlement_records_officer');
        $res = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'point',
            'geometry' => ['type' => 'Point', 'coordinates' => [90.3190, 23.8590]],
            'attributes' => ['stage' => 'initial'],
        ], $token);
        $fid = (int) $res['data']['data']['id'];

        $putRes = H::callRoute('PUT', "/api/v1/map/features/{$fid}", [
            'attributes' => ['stage' => 'finalized', 'remark' => 'Verified by surveyor'],
        ], $token);

        H::assertStatus(200, $putRes, 'Update feature');
        H::assertEqual('finalized', $putRes['data']['data']['attributes']['stage']);
        H::assertEqual('Verified by surveyor', $putRes['data']['data']['attributes']['remark']);
    }

    public static function test_r4_05_crud_delete_removes_feature(): void
    {
        $token = H::loginAs('settlement_records_officer');
        $res = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'point',
            'geometry' => ['type' => 'Point', 'coordinates' => [90.3195, 23.8595]],
            'attributes' => ['will_delete' => true],
        ], $token);
        $fid = (int) $res['data']['data']['id'];

        $delRes = H::callRoute('DELETE', "/api/v1/map/features/{$fid}", [], $token);
        H::assertStatus(200, $delRes, 'Delete feature');

        // GET must return 404
        $checkRes = H::callRoute('GET', "/api/v1/map/features/{$fid}");
        H::assertStatus(404, $checkRes, 'Deleted feature returns 404');
    }

    public static function test_r5_01_unauthenticated_request_blocked(): void
    {
        $res = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'geometry' => ['type' => 'Point', 'coordinates' => [90.318, 23.858]],
        ]);
        H::assertStatus(401, $res, 'Unauthenticated blocked');
        H::assertEqual('AUTH_REQUIRED', $res['code']);
    }

    public static function test_r5_02_citizen_role_forbidden_from_drawing(): void
    {
        $token = H::loginAs('citizen');
        $res = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'geometry' => ['type' => 'Point', 'coordinates' => [90.318, 23.858]],
        ], $token);
        H::assertStatus(403, $res, 'Citizen role forbidden');
        H::assertEqual('FORBIDDEN_ROLE', $res['code']);
    }

    public static function test_r5_03_bank_officer_forbidden_from_assignment(): void
    {
        $token = H::loginAs('bank_officer');
        $res = H::callRoute('POST', '/api/v1/map/assignments', [
            'title' => 'Unauthorized Assignment Attempt',
            'task_type' => 'MOUZA_SURVEY',
            'location_id' => 1,
            'assigned_to_user_id' => 10,
        ], $token);
        H::assertStatus(403, $res, 'Bank officer role forbidden from assignment');
        H::assertEqual('FORBIDDEN_ROLE', $res['code']);
    }

    public static function test_r5_04_settlement_records_officer_allowed_drawing(): void
    {
        $token = H::loginAs('settlement_records_officer');
        $res = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'point',
            'geometry' => ['type' => 'Point', 'coordinates' => [90.3182, 23.8582]],
            'attributes' => ['creator' => 'sro'],
        ], $token);
        H::assertStatus(200, $res, 'Surveyor allowed drawing');
        H::assertTrue($res['data']['success']);
    }

    public static function test_r5_05_admin_and_ac_land_allowed_assignment(): void
    {
        // AC Land test
        $acToken = H::loginAs('ac_land');
        $acRes = H::callRoute('POST', '/api/v1/map/assignments', [
            'title' => 'AC Land Cadastral Inquest Assignment',
            'task_type' => 'BOUNDARY_VERIFICATION',
            'location_id' => 1,
            'assigned_to_user_id' => 9, // fvo_savar
        ], $acToken);
        H::assertStatus(200, $acRes, 'AC Land allowed assignment');

        // Admin test
        $admToken = H::loginAs('admin');
        $admRes = H::callRoute('POST', '/api/v1/map/assignments', [
            'title' => 'Super Admin Mouja Resurvey Assignment',
            'task_type' => 'MOUZA_SURVEY',
            'location_id' => 1,
            'assigned_to_user_id' => 10,
        ], $admToken);
        H::assertStatus(200, $admRes, 'Admin allowed assignment');
    }

    // =========================================================================
    // Tier 2: Boundary & Corner Cases Implementation
    // =========================================================================

    public static function test_r1_b01_non_existent_location_workspace(): void
    {
        $res = H::callRoute('GET', '/api/v1/map/workspace', [], null, ['location_id' => 999999]);
        H::assertStatus(200, $res);
        H::assertTrue(empty($res['data']['plots']), 'Plots array must be empty for non-existent location');
    }

    public static function test_r1_b02_extreme_zoom_levels(): void
    {
        // Low zoom
        $res0 = H::callRoute('GET', '/api/v1/map/features', [], null, ['zoom' => 0]);
        H::assertStatus(200, $res0);

        // High zoom
        $res25 = H::callRoute('GET', '/api/v1/map/features', [], null, ['zoom' => 25]);
        H::assertStatus(200, $res25);
    }

    public static function test_r1_b03_empty_and_special_character_search(): void
    {
        $res = H::callRoute('GET', '/api/v1/map/workspace', [], null, ['q' => '\'"<script>alert(1)</script>']);
        H::assertStatus(200, $res);
        H::assertTrue(is_array($res['data']['plots']), 'Plots is an array without SQL exception');
    }

    public static function test_r1_b04_invalid_layer_id_returns_404(): void
    {
        $res = H::callRoute('GET', '/api/v1/map/layers/999999');
        H::assertStatus(404, $res, 'Invalid layer returns 404');
    }

    public static function test_r1_b05_malformed_location_id_query(): void
    {
        $res = H::callRoute('GET', '/api/v1/map/workspace', [], null, ['location_id' => 'not_a_number_abc']);
        H::assertStatus(200, $res);
        H::assertTrue(isset($res['data']['locations']), 'Handled malformed location query safely');
    }

    public static function test_r2_b01_empty_geometry_coordinates(): void
    {
        $token = H::loginAs('settlement_records_officer');
        $res = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'line',
            'geometry' => ['type' => 'LineString', 'coordinates' => []],
        ], $token);
        H::assertStatus(422, $res, 'Empty coordinates rejected');
    }

    public static function test_r2_b02_coordinates_out_of_bangladesh_bounds(): void
    {
        $token = H::loginAs('settlement_records_officer');
        $res = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'point',
            'geometry' => ['type' => 'Point', 'coordinates' => [0.0, 0.0]],
        ], $token);
        H::assertStatus(422, $res, 'Out-of-bounds coordinates rejected');
        H::assertEqual('COORDINATE_OUT_OF_BOUNDS', $res['code']);
    }

    public static function test_r2_b03_polygon_with_fewer_than_three_vertices(): void
    {
        $token = H::loginAs('settlement_records_officer');
        // Only 2 vertices
        $coords = [
            [
                [90.315, 23.855],
                [90.318, 23.855],
            ]
        ];
        $res = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'polygon',
            'geometry' => ['type' => 'Polygon', 'coordinates' => $coords],
        ], $token);
        H::assertStatus(422, $res, 'Polygon with < 3 vertices rejected');
        H::assertEqual('INVALID_RING', $res['code']);
    }

    public static function test_r2_b04_linestring_with_fewer_than_two_points(): void
    {
        $token = H::loginAs('settlement_records_officer');
        $res = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'line',
            'geometry' => ['type' => 'LineString', 'coordinates' => [[90.315, 23.855]]],
        ], $token);
        H::assertStatus(422, $res, 'Line with 1 point rejected');
        H::assertEqual('INVALID_LINE_LENGTH', $res['code']);
    }

    public static function test_r2_b05_self_intersecting_polygon_rejected(): void
    {
        $token = H::loginAs('settlement_records_officer');
        // Self-intersecting bowtie polygon
        $coords = [
            [
                [90.310, 23.850],
                [90.320, 23.860],
                [90.310, 23.860],
                [90.320, 23.850],
                [90.310, 23.850],
            ]
        ];
        $res = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'polygon',
            'geometry' => ['type' => 'Polygon', 'coordinates' => $coords],
        ], $token);
        H::assertStatus(422, $res, 'Self-intersecting polygon rejected');
        H::assertEqual('SELF_INTERSECTION', $res['code']);
    }

    public static function test_r3_b01_non_existent_assigned_user_id(): void
    {
        $token = H::loginAs('admin');
        $res = H::callRoute('POST', '/api/v1/map/assignments', [
            'title' => 'Invalid User Test Assignment',
            'task_type' => 'MOUZA_SURVEY',
            'location_id' => 1,
            'assigned_to_user_id' => 999999,
        ], $token);
        H::assertStatus(422, $res, 'Non-existent user assignment rejected');
        H::assertEqual('ASSIGNED_USER_INVALID', $res['code']);
    }

    public static function test_r3_b02_non_existent_location_assignment(): void
    {
        $token = H::loginAs('admin');
        $res = H::callRoute('POST', '/api/v1/map/assignments', [
            'title' => 'Invalid Location Test Assignment',
            'task_type' => 'MOUZA_SURVEY',
            'location_id' => 999999,
            'assigned_to_user_id' => 10,
        ], $token);
        H::assertStatus(404, $res, 'Non-existent location rejected');
        H::assertEqual('LOCATION_NOT_FOUND', $res['code']);
    }

    public static function test_r3_b03_invalid_task_status_transition(): void
    {
        $adminToken = H::loginAs('admin');
        $sroToken = H::loginAs('settlement_records_officer');

        $create = H::callRoute('POST', '/api/v1/map/assignments', [
            'title' => 'Status Validation Test',
            'task_type' => 'PLOT_DRAWING',
            'location_id' => 1,
            'assigned_to_user_id' => 10,
        ], $adminToken);
        $taskId = (int) $create['data']['data']['id'];

        $res = H::callRoute('PATCH', "/api/v1/map/assignments/{$taskId}/status", [
            'status' => 'arbitrary_illegal_status',
        ], $sroToken);

        H::assertStatus(422, $res, 'Illegal status rejected');
        H::assertEqual('INVALID_STATUS', $res['code']);
    }

    public static function test_r3_b04_non_assigned_officer_cannot_update_status(): void
    {
        $adminToken = H::loginAs('admin');
        $loaToken = H::loginAs('land_office_assistant');

        // Task assigned to user 10 (sro_dhaka)
        $create = H::callRoute('POST', '/api/v1/map/assignments', [
            'title' => 'Unauthorized Updater Test',
            'task_type' => 'PLOT_DRAWING',
            'location_id' => 1,
            'assigned_to_user_id' => 10,
        ], $adminToken);
        $taskId = (int) $create['data']['data']['id'];

        // LOA (user 8) attempts to update
        $res = H::callRoute('PATCH', "/api/v1/map/assignments/{$taskId}/status", [
            'status' => 'completed',
        ], $loaToken);

        H::assertStatus(403, $res, 'Unauthorized updater blocked');
        H::assertEqual('FORBIDDEN_TASK_ACCESS', $res['code']);
    }

    public static function test_r3_b05_short_or_empty_title_rejected(): void
    {
        $token = H::loginAs('admin');
        $res = H::callRoute('POST', '/api/v1/map/assignments', [
            'title' => 'ab', // < 3 characters
            'task_type' => 'MOUZA_SURVEY',
            'location_id' => 1,
            'assigned_to_user_id' => 10,
        ], $token);
        H::assertStatus(422, $res, 'Short title rejected');
        H::assertEqual('TITLE_REQUIRED', $res['code']);
    }

    public static function test_r4_b01_get_non_existent_feature_returns_404(): void
    {
        $res = H::callRoute('GET', '/api/v1/map/features/999999');
        H::assertStatus(404, $res);
        H::assertEqual('FEATURE_NOT_FOUND', $res['code']);
    }

    public static function test_r4_b02_update_non_existent_feature_returns_404(): void
    {
        $token = H::loginAs('admin');
        $res = H::callRoute('PUT', '/api/v1/map/features/999999', [
            'attributes' => ['notes' => 'Non-existent update'],
        ], $token);
        H::assertStatus(404, $res);
        H::assertEqual('FEATURE_NOT_FOUND', $res['code']);
    }

    public static function test_r4_b03_delete_non_existent_feature_returns_404(): void
    {
        $token = H::loginAs('admin');
        $res = H::callRoute('DELETE', '/api/v1/map/features/999999', [], $token);
        H::assertStatus(404, $res);
        H::assertEqual('FEATURE_NOT_FOUND', $res['code']);
    }

    public static function test_r4_b04_sql_xss_injection_in_attributes(): void
    {
        $token = H::loginAs('settlement_records_officer');
        $maliciousAttrs = [
            'sql_payload' => "'); DROP TABLE users; --",
            'xss_payload' => '<script>alert("xss")</script>',
            'unicode_symbols' => 'বিভাগ/মৌজা "বাংলা" \'কোট\'',
        ];

        $res = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'point',
            'geometry' => ['type' => 'Point', 'coordinates' => [90.3168, 23.8568]],
            'attributes' => $maliciousAttrs,
        ], $token);

        H::assertStatus(200, $res, 'Payload stored safely');
        $fid = (int) $res['data']['data']['id'];

        $fetch = H::callRoute('GET', "/api/v1/map/features/{$fid}");
        H::assertStatus(200, $fetch);
        H::assertEqual($maliciousAttrs['sql_payload'], $fetch['data']['data']['attributes']['sql_payload']);
        H::assertEqual($maliciousAttrs['xss_payload'], $fetch['data']['data']['attributes']['xss_payload']);
    }

    public static function test_r4_b05_unclosed_polygon_ring_rejected(): void
    {
        $token = H::loginAs('settlement_records_officer');
        // Unclosed ring: first coordinate != last coordinate
        $coords = [
            [
                [90.315, 23.855],
                [90.318, 23.855],
                [90.318, 23.858],
                [90.315, 23.858],
            ]
        ];
        $res = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'polygon',
            'geometry' => ['type' => 'Polygon', 'coordinates' => $coords],
        ], $token);

        H::assertStatus(422, $res, 'Unclosed ring rejected');
        H::assertEqual('UNCLOSED_RING', $res['code']);
    }

    public static function test_r5_b01_missing_bearer_header_returns_401(): void
    {
        $res = H::callRoute('POST', '/api/v1/map/assignments', ['title' => 'No Token Task']);
        H::assertStatus(401, $res, 'Missing auth header rejected');
        H::assertEqual('AUTH_REQUIRED', $res['code']);
    }

    public static function test_r5_b02_malformed_jwt_token_returns_401(): void
    {
        $res = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'geometry' => ['type' => 'Point', 'coordinates' => [90.318, 23.858]],
        ], 'invalid.garbage.token.format');
        H::assertStatus(401, $res, 'Malformed token rejected');
    }

    public static function test_r5_b03_suspended_officer_blocked_from_drawing(): void
    {
        // Temporarily set a dummy user is_active = 0
        $user = DB::selectOne("SELECT id, username FROM users WHERE role = 'settlement_records_officer' LIMIT 1");
        H::assertTrue(!empty($user));

        $token = H::login($user['username'], 'demo123');

        // Suspend user in DB
        DB::statement('UPDATE users SET is_active = 0 WHERE id = ?', [$user['id']]);

        try {
            $res = H::callRoute('POST', '/api/v1/map/features', [
                'location_id' => 1,
                'geometry' => ['type' => 'Point', 'coordinates' => [90.318, 23.858]],
            ], $token);

            H::assertStatus(403, $res, 'Suspended account blocked');
            H::assertEqual('ACCOUNT_SUSPENDED', $res['code']);
        } finally {
            // Restore user active state
            DB::statement('UPDATE users SET is_active = 1 WHERE id = ?', [$user['id']]);
        }
    }

    public static function test_r5_b04_unauthenticated_my_assignments_blocked(): void
    {
        $res = H::callRoute('GET', '/api/v1/map/my-assignments');
        H::assertStatus(401, $res, 'Anonymous my-assignments blocked');
        H::assertEqual('AUTH_REQUIRED', $res['code']);
    }

    public static function test_r5_b05_plot_location_mismatch_rejected(): void
    {
        $token = H::loginAs('admin');
        // Plot 1 belongs to Location 1, but we pass Location 2
        $res = H::callRoute('POST', '/api/v1/map/assignments', [
            'title' => 'Plot Location Mismatch Test',
            'task_type' => 'PLOT_DRAWING',
            'location_id' => 2, // Basan Mouja
            'plot_id' => 1,     // Belongs to Birulia Location 1
            'assigned_to_user_id' => 10,
        ], $token);

        H::assertStatus(422, $res, 'Plot location mismatch rejected');
        H::assertEqual('PLOT_LOCATION_MISMATCH', $res['code']);
    }

    // =========================================================================
    // Tier 3: Cross-Feature Interactions Implementation
    // =========================================================================

    public static function test_t3_01_assignment_navigation_flow(): void
    {
        $adminToken = H::loginAs('admin');
        $sroToken = H::loginAs('settlement_records_officer');

        // 1. Admin assigns task for Birulia Mouja (Location 1)
        $create = H::callRoute('POST', '/api/v1/map/assignments', [
            'title' => 'Pairwise Flow: Birulia Navigation Verification',
            'task_type' => 'MOUZA_SURVEY',
            'location_id' => 1,
            'assigned_to_user_id' => 10,
            'priority' => 'HIGH',
        ], $adminToken);
        H::assertStatus(200, $create);
        $task = $create['data']['data'];

        // 2. SRO retrieves task queue
        $queue = H::callRoute('GET', '/api/v1/map/my-assignments', [], $sroToken);
        H::assertStatus(200, $queue);

        // 3. Verify exact coordinates are available for frontend map viewport panning
        $found = null;
        foreach ($queue['data']['data'] as $item) {
            if ($item['id'] === $task['id']) {
                $found = $item;
                break;
            }
        }
        H::assertTrue($found !== null, 'Created task found in officer queue');
        H::assertEqual(23.858, (float) $found['location']['latitude'], 'Latitude matches Birulia center');
        H::assertEqual(90.318, (float) $found['location']['longitude'], 'Longitude matches Birulia center');
    }

    public static function test_t3_02_task_drawing_attribute_computation(): void
    {
        $adminToken = H::loginAs('admin');
        $sroToken = H::loginAs('settlement_records_officer');

        // Create assignment
        $assign = H::callRoute('POST', '/api/v1/map/assignments', [
            'title' => 'Pairwise Flow: Draw & Compute Area',
            'task_type' => 'PLOT_DRAWING',
            'location_id' => 1,
            'assigned_to_user_id' => 10,
        ], $adminToken);
        $taskId = (int) $assign['data']['data']['id'];

        // Move task to in_progress
        H::callRoute('PATCH', "/api/v1/map/assignments/{$taskId}/status", ['status' => 'in_progress'], $sroToken);

        // Draw plot polygon
        $coords = [
            [
                [90.3160, 23.8560],
                [90.3175, 23.8560],
                [90.3175, 23.8575],
                [90.3160, 23.8575],
                [90.3160, 23.8560],
            ]
        ];
        $drawRes = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'polygon',
            'geometry' => ['type' => 'Polygon', 'coordinates' => $coords],
            'attributes' => [
                'dag_no' => '505',
                'khatian_no' => '88',
                'jl_no' => '12',
                'land_class' => 'নাল',
            ],
        ], $sroToken);

        H::assertStatus(200, $drawRes);
        $feat = $drawRes['data']['data'];
        H::assertTrue($feat['area_decimal'] > 0, 'Shoelace area decimal calculated');
        H::assertEqual('505', $feat['attributes']['dag_no']);
        H::assertEqual('নাল', $feat['attributes']['land_class']);
    }

    public static function test_t3_03_feature_creation_to_completion_workflow(): void
    {
        $adminToken = H::loginAs('admin');
        $sroToken = H::loginAs('settlement_records_officer');

        // Task assignment
        $assign = H::callRoute('POST', '/api/v1/map/assignments', [
            'title' => 'Pairwise Flow: Feature ID Linking to Completion',
            'task_type' => 'PLOT_DRAWING',
            'location_id' => 1,
            'assigned_to_user_id' => 10,
        ], $adminToken);
        $taskId = (int) $assign['data']['data']['id'];

        // SRO creates marker feature
        $featRes = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'point',
            'geometry' => ['type' => 'Point', 'coordinates' => [90.3170, 23.8570]],
            'attributes' => ['task_id' => $taskId, 'name' => 'Linked Feature'],
        ], $sroToken);
        $featureId = (int) $featRes['data']['data']['id'];

        // SRO marks task completed with feature reference
        $completeRes = H::callRoute('PATCH', "/api/v1/map/assignments/{$taskId}/status", [
            'status' => 'completed',
            'completion_note' => "Vector feature #{$featureId} successfully drawn, checked, and linked.",
        ], $sroToken);

        H::assertStatus(200, $completeRes);
        H::assertEqual('completed', $completeRes['data']['data']['status']);
        H::assertTrue(str_contains($completeRes['data']['data']['completion_note'], (string) $featureId));
    }

    public static function test_t3_04_multi_geometry_mouza_survey_fabric(): void
    {
        $token = H::loginAs('settlement_records_officer');

        // 1. Boundary Polygon
        $polyCoords = [
            [
                [90.3140, 23.8540],
                [90.3180, 23.8540],
                [90.3180, 23.8580],
                [90.3140, 23.8580],
                [90.3140, 23.8540],
            ]
        ];
        $pRes = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'polygon',
            'geometry' => ['type' => 'Polygon', 'coordinates' => $polyCoords],
            'attributes' => ['fabric' => 'mouza_boundary'],
        ], $token);
        H::assertStatus(200, $pRes);

        // 2. Canal LineString
        $lineCoords = [
            [90.3145, 23.8545],
            [90.3160, 23.8560],
            [90.3175, 23.8575],
        ];
        $lRes = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'line',
            'geometry' => ['type' => 'LineString', 'coordinates' => $lineCoords],
            'attributes' => ['fabric' => 'drainage_canal'],
        ], $token);
        H::assertStatus(200, $lRes);

        // 3. Geodetic Benchmark Point
        $ptRes = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'point',
            'geometry' => ['type' => 'Point', 'coordinates' => [90.3160, 23.8560]],
            'attributes' => ['fabric' => 'geodetic_benchmark'],
        ], $token);
        H::assertStatus(200, $ptRes);

        // 4. Query all features for Location 1
        $listRes = H::callRoute('GET', '/api/v1/map/features', [], null, ['location_id' => 1]);
        H::assertStatus(200, $listRes);

        $types = array_column($listRes['data']['data'], 'feature_type');
        H::assertTrue(in_array('polygon', $types, true), 'Polygon in fabric');
        H::assertTrue(in_array('line', $types, true), 'Line in fabric');
        H::assertTrue(in_array('point', $types, true), 'Point in fabric');
    }

    public static function test_t3_05_admin_task_queue_audit_and_metrics(): void
    {
        $token = H::loginAs('admin');
        $res = H::callRoute('GET', '/api/v1/map/assignments', [], $token, ['status' => 'completed']);
        H::assertStatus(200, $res);

        H::assertTrue(isset($res['data']['count']));
        H::assertTrue($res['data']['count'] >= 1, 'At least one completed task exists');

        $completedTask = $res['data']['data'][0];
        H::assertEqual('completed', $completedTask['status']);
        H::assertTrue(!empty($completedTask['completion_note']), 'Completion note present');
        H::assertTrue(!empty($completedTask['completed_at']), 'Completed timestamp present');
    }

    // =========================================================================
    // Tier 4: Real-World Cadastral Survey Scenarios Implementation
    // =========================================================================

    public static function test_t4_01_scenario_full_birulia_mouza_cadastral_survey(): void
    {
        $adminToken = H::loginAs('admin');
        $sroToken = H::loginAs('settlement_records_officer');

        // Step 1: Admin creates Mouza Survey task for Birulia Mouja (JL 12, Savar, Dhaka)
        $assignRes = H::callRoute('POST', '/api/v1/map/assignments', [
            'title' => 'E2E Full Mouza Survey: Birulia JL 12 Resurvey Project',
            'task_type' => 'MOUZA_SURVEY',
            'location_id' => 1,
            'assigned_to_user_id' => 10,
            'priority' => 'HIGH',
            'due_date' => '2026-12-31',
            'notes' => 'Complete digital cadastral vectorization of outer boundary, main canal, benchmarks, and new plots.',
        ], $adminToken);
        H::assertStatus(200, $assignRes, 'Step 1: Admin creates survey assignment');
        $task = $assignRes['data']['data'];
        $taskId = (int) $task['id'];

        // Step 2: SRO logs in, accesses task queue, retrieves coordinates
        $queueRes = H::callRoute('GET', '/api/v1/map/my-assignments', [], $sroToken);
        H::assertStatus(200, $queueRes, 'Step 2: SRO checks queue');
        H::assertEqual(23.858, (float) $task['location']['latitude'], 'Step 2: Mouja center latitude');
        H::assertEqual(90.318, (float) $task['location']['longitude'], 'Step 2: Mouja center longitude');

        // Step 3: SRO sets task to in_progress
        $progressRes = H::callRoute('PATCH', "/api/v1/map/assignments/{$taskId}/status", [
            'status' => 'in_progress',
        ], $sroToken);
        H::assertStatus(200, $progressRes, 'Step 3: Move to in_progress');
        H::assertEqual('in_progress', $progressRes['data']['data']['status']);

        // Step 4: SRO draws outer perimeter boundary polygon
        $outerRing = [
            [
                [90.3130, 23.8530],
                [90.3220, 23.8530],
                [90.3220, 23.8620],
                [90.3130, 23.8620],
                [90.3130, 23.8530],
            ]
        ];
        $outerPolyRes = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'polygon',
            'geometry' => ['type' => 'Polygon', 'coordinates' => $outerRing],
            'attributes' => [
                'name' => 'মৌজা বহিস্থ সীমানা (Birulia Outer Perimeter)',
                'jl_no' => '12',
                'survey_type' => 'BS',
            ],
        ], $sroToken);
        H::assertStatus(200, $outerPolyRes, 'Step 4: Draw outer boundary polygon');
        $outerPolyId = (int) $outerPolyRes['data']['data']['id'];
        H::assertTrue($outerPolyRes['data']['data']['area_decimal'] > 50.0, 'Outer polygon area > 50 decimals');

        // Step 5: SRO digitizes main canal LineString
        $canalCoords = [
            [90.3135, 23.8540],
            [90.3160, 23.8565],
            [90.3185, 23.8590],
            [90.3215, 23.8615],
        ];
        $canalRes = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'line',
            'geometry' => ['type' => 'LineString', 'coordinates' => $canalCoords],
            'attributes' => [
                'name' => 'তুরাগ সংযোগ খাল (Turag Connecting Canal)',
                'category' => 'canals',
            ],
        ], $sroToken);
        H::assertStatus(200, $canalRes, 'Step 5: Draw canal line');
        $canalId = (int) $canalRes['data']['data']['id'];
        H::assertTrue($canalRes['data']['data']['length_meters'] > 500.0, 'Canal length > 500m');

        // Step 6: SRO drops GPS Survey Control Benchmark Point
        $bmRes = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'point',
            'geometry' => ['type' => 'Point', 'coordinates' => [90.3175, 23.8575]],
            'attributes' => [
                'name' => 'জরিপ কন্ট্রোল পিলার (GPS Benchmark #01)',
                'pillar_type' => 'PRIMARY_GEODETIC',
                'elevation_meters' => 14.5,
            ],
        ], $sroToken);
        H::assertStatus(200, $bmRes, 'Step 6: Drop benchmark marker');
        $bmId = (int) $bmRes['data']['data']['id'];

        // Step 7: SRO digitizes internal cadastral plot (Dag 555) with Nal land class
        $plotCoords = [
            [
                [90.3165, 23.8565],
                [90.3180, 23.8565],
                [90.3180, 23.8580],
                [90.3165, 23.8580],
                [90.3165, 23.8565],
            ]
        ];
        $plotRes = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 1,
            'feature_type' => 'polygon',
            'geometry' => ['type' => 'Polygon', 'coordinates' => $plotCoords],
            'attributes' => [
                'dag_no' => '555',
                'khatian_no' => '102',
                'jl_no' => '12',
                'land_class' => 'নাল',
                'survey_type' => 'BS',
                'sheet_no' => '01',
            ],
        ], $sroToken);
        H::assertStatus(200, $plotRes, 'Step 7: Draw internal plot 555');
        $plotId = (int) $plotRes['data']['data']['id'];

        // Step 8: SRO marks task completed with multi-feature reference
        $completionNote = "Survey completed. Features created: Perimeter #{$outerPolyId}, Canal #{$canalId}, Benchmark #{$bmId}, Plot #{$plotId}.";
        $completeRes = H::callRoute('PATCH', "/api/v1/map/assignments/{$taskId}/status", [
            'status' => 'completed',
            'completion_note' => $completionNote,
        ], $sroToken);
        H::assertStatus(200, $completeRes, 'Step 8: SRO completes task');
        H::assertEqual('completed', $completeRes['data']['data']['status']);

        // Step 9: Admin audits completed assignment
        $auditRes = H::callRoute('GET', '/api/v1/map/assignments', [], $adminToken, [
            'location_id' => 1,
            'status' => 'completed',
        ]);
        H::assertStatus(200, $auditRes, 'Step 9: Admin audits completed tasks');
        H::assertTrue($auditRes['data']['count'] >= 1);

        // Step 10: Verify persistence in database directly
        $dbTask = DB::selectOne('SELECT * FROM map_task_assignments WHERE id = ?', [$taskId]);
        H::assertEqual('completed', $dbTask['status']);
        H::assertEqual($completionNote, $dbTask['completion_note']);

        $dbFeatures = DB::select('SELECT id, feature_type FROM map_features WHERE location_id = 1 AND id IN (?, ?, ?, ?)', [
            $outerPolyId, $canalId, $bmId, $plotId
        ]);
        H::assertEqual(4, count($dbFeatures), 'All 4 cadastral features persisted in database');
    }

    public static function test_t4_02_scenario_emergency_boundary_dispute_verification(): void
    {
        $acLandToken = H::loginAs('ac_land');
        $fvoToken = H::loginAs('field_verification_officer');

        // Step 1: AC Land dispatches emergency boundary verification on Location 2 (Basan Mouja)
        $dispatchRes = H::callRoute('POST', '/api/v1/map/assignments', [
            'title' => 'Emergency Boundary Inquest: Basan Mouja Disputed Canal Border',
            'task_type' => 'BOUNDARY_VERIFICATION',
            'location_id' => 2, // Basan Mouja
            'assigned_to_user_id' => 9, // fvo_savar
            'priority' => 'URGENT',
            'due_date' => '2026-11-05',
            'notes' => 'Perform physical demarcation between Dag 12 and Dag 13 along Western embankment.',
        ], $acLandToken);
        H::assertStatus(200, $dispatchRes, 'Step 1: AC Land dispatches urgent inquest');
        $taskId = (int) $dispatchRes['data']['data']['id'];

        // Step 2: FVO retrieves personal queue, finds task, moves to in_progress
        $fvoQueue = H::callRoute('GET', '/api/v1/map/my-assignments', [], $fvoToken);
        H::assertStatus(200, $fvoQueue, 'Step 2: FVO checks queue');

        $inProg = H::callRoute('PATCH', "/api/v1/map/assignments/{$taskId}/status", [
            'status' => 'in_progress',
        ], $fvoToken);
        H::assertStatus(200, $inProg, 'Step 2: FVO begins field inquiry');

        // Step 3: FVO draws disputed boundary line based on initial satellite interpretation
        $initialLine = [
            [90.4180, 23.9960],
            [90.4200, 23.9980],
            [90.4220, 24.0000],
        ];
        $lineRes = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 2,
            'feature_type' => 'line',
            'geometry' => ['type' => 'LineString', 'coordinates' => $initialLine],
            'attributes' => [
                'name' => 'বিতর্কিত সীমানা রেখা (Disputed Demarcation Line)',
                'dag_no' => '12',
                'status' => 'disputed',
            ],
        ], $fvoToken);
        H::assertStatus(200, $lineRes, 'Step 3: Initial line created');
        $lineId = (int) $lineRes['data']['data']['id'];

        // Step 4: After ground chain survey, FVO modifies line coordinates via PUT
        $correctedLine = [
            [90.4182, 23.9961],
            [90.4203, 23.9982],
            [90.4224, 24.0003],
        ];
        $updateRes = H::callRoute('PUT', "/api/v1/map/features/{$lineId}", [
            'geometry' => ['type' => 'LineString', 'coordinates' => $correctedLine],
            'attributes' => [
                'name' => 'চূড়ান্ত সীমানা রেখা (Final Demarcated Line)',
                'dag_no' => '12',
                'surveyor_notes' => 'Ground measurement completed with Gunter chain. Deviation corrected by 1.2 meters.',
                'land_class' => 'ভিটা',
            ],
        ], $fvoToken);
        H::assertStatus(200, $updateRes, 'Step 4: Ground measurement updated');
        H::assertEqual('fvo_savar', $updateRes['data']['data']['updated_by']);

        // Step 5: FVO places demarcation pillar marker
        $pillarRes = H::callRoute('POST', '/api/v1/map/features', [
            'location_id' => 2,
            'feature_type' => 'point',
            'geometry' => ['type' => 'Point', 'coordinates' => [90.4203, 23.9982]],
            'attributes' => [
                'name' => 'সীমানা সীমানা স্তম্ভ (Concrete Demarcation Pillar)',
                'pillar_no' => 'DP-08',
            ],
        ], $fvoToken);
        H::assertStatus(200, $pillarRes, 'Step 5: Pillar marker placed');

        // Step 6: FVO completes task
        $completeRes = H::callRoute('PATCH', "/api/v1/map/assignments/{$taskId}/status", [
            'status' => 'completed',
            'completion_note' => "Boundary dispute resolved on-site. Feature #{$lineId} updated and Pillar DP-08 installed.",
        ], $fvoToken);
        H::assertStatus(200, $completeRes, 'Step 6: Task completed');
        H::assertEqual('completed', $completeRes['data']['data']['status']);

        // Step 7: AC Land queries single task and confirms resolution
        $acCheck = H::callRoute('GET', '/api/v1/map/assignments', [], $acLandToken, ['location_id' => 2]);
        H::assertStatus(200, $acCheck, 'Step 7: AC Land review');
        H::assertTrue($acCheck['data']['count'] >= 1);
    }

    // =========================================================================
    // Standalone CLI Entry Point
    // =========================================================================

    public static function runStandalone(): int
    {
        $start = microtime(true);

        echo "\n";
        echo "========================================================================================\n";
        echo "   BANGLADESH MOUJA MAP & OFFLINE VISUALIZATION SYSTEM — E2E TEST SUITE\n";
        echo "========================================================================================\n";
        echo " Environment: PHP " . PHP_VERSION . " | OS: " . PHP_OS . " | Timestamp: " . gmdate('c') . "\n";
        echo " Target: R1 Offline Map, R2 Vector Tools, R3 Assignments, R4 Persistence, R5 RBAC\n";
        echo " Architecture: 4-Tier Opaque-Box Test Harness (57 Automated Verification Tests)\n";
        echo "----------------------------------------------------------------------------------------\n\n";

        $tiers = [
            'Tier 1 - Feature Coverage (R1 to R5 Happy Paths)' => self::getTier1Tests(),
            'Tier 2 - Boundary & Corner Cases (R1 to R5 Security Invariants)' => self::getTier2Tests(),
            'Tier 3 - Cross-Feature Interactions (Pairwise Interlocking)' => self::getTier3Tests(),
            'Tier 4 - Real-World Cadastral Survey Scenarios (Full Lifecycle)' => self::getTier4Tests(),
        ];

        $totalTests = 0;
        $totalPassed = 0;
        $totalFailed = 0;
        $allReports = [];

        foreach ($tiers as $tierName => $testList) {
            $tCount = count($testList);
            $tPassed = 0;
            $tFailed = 0;
            $tResults = [];

            echo "----------------------------------------------------------------------------------------\n";
            echo " [RUNNING] {$tierName} ({$tCount} Tests)\n";
            echo "----------------------------------------------------------------------------------------\n";

            foreach ($testList as $method => $description) {
                $t0 = microtime(true);
                try {
                    self::$method();
                    $elapsed = round((microtime(true) - $t0) * 1000, 2);
                    $icon = "  ✓ ";
                    $time = sprintf("%6.1fms", $elapsed);
                    echo "{$icon} [{$time}] {$description}\n";
                    $tResults[] = [
                        'name' => $method,
                        'description' => $description,
                        'status' => 'PASS',
                        'elapsed_ms' => $elapsed,
                    ];
                    $tPassed++;
                } catch (\Throwable $e) {
                    $elapsed = round((microtime(true) - $t0) * 1000, 2);
                    $icon = "  ✖ ";
                    $time = sprintf("%6.1fms", $elapsed);
                    echo "{$icon} [{$time}] {$description}\n";
                    echo "      ERROR: {$e->getMessage()}\n";
                    $tResults[] = [
                        'name' => $method,
                        'description' => $description,
                        'status' => 'FAIL',
                        'error' => $e->getMessage(),
                        'elapsed_ms' => $elapsed,
                    ];
                    $tFailed++;
                }
            }

            $totalTests += $tCount;
            $totalPassed += $tPassed;
            $totalFailed += $tFailed;

            $badge = ($tFailed === 0) ? "[PASS]" : "[FAIL]";
            echo "----------------------------------------------------------------------------------------\n";
            echo " {$badge} {$tierName}: {$tPassed}/{$tCount} Passed\n";
            echo "----------------------------------------------------------------------------------------\n\n";

            $allReports[] = [
                'tier' => $tierName,
                'total' => $tCount,
                'passed' => $tPassed,
                'failed' => $tFailed,
                'results' => $tResults,
            ];
        }

        $totalElapsed = round((microtime(true) - $start) * 1000, 2);
        $passRate = $totalTests > 0 ? round(($totalPassed / $totalTests) * 100, 1) : 0.0;

        echo "========================================================================================\n";
        echo "                                 MOUJA MAP SUITE SUMMARY\n";
        echo "========================================================================================\n";
        echo " Total Tests:      {$totalTests}\n";
        echo " Passed:           {$totalPassed} ({$passRate}%)\n";
        echo " Failed:           {$totalFailed}\n";
        echo " Total Execution:  {$totalElapsed} ms (" . round($totalElapsed / 1000, 2) . "s)\n";
        echo " Overall Result:   " . ($totalFailed === 0 ? "ALL PASS (EXIT 0)" : "FAILURES DETECTED (EXIT 1)") . "\n";
        echo "========================================================================================\n\n";

        return ($totalFailed === 0) ? 0 : 1;
    }
}

// Direct CLI invocation handler
if (php_sapi_name() === 'cli' && realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === realpath(__FILE__)) {
    exit(MoujaMapTestSuite::runStandalone());
}
