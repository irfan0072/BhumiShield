<?php

declare(strict_types=1);

namespace Tests\Feature;

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../../../tests/e2e/E2ETestHelper.php';

use App\Http\Controllers\Api\V1\MapAssignmentController as C;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;
use Tests\E2E\E2ETestHelper as H;

/**
 * Empirical Adversarial Stress Test Suite for Cadastral Task Assignments & RBAC Security (M4).
 * Covers authorization enforcement, status lifecycle fuzzing, personal queue isolation,
 * coordinate bounds navigation, and input boundary security.
 */
final class MapAssignmentStressTest
{
    private static int $passCount = 0;
    private static int $failCount = 0;

    private static function check(bool $condition, string $label): void
    {
        if ($condition) {
            self::$passCount++;
            echo "  ✓ {$label}\n";
        } else {
            self::$failCount++;
            echo "  ✗ FAIL: {$label}\n";
            throw new \RuntimeException("Stress assertion failed: {$label}");
        }
    }

    public static function runAll(): int
    {
        echo "\n========================================================================================\n";
        echo "   M4 ADVERSARIAL STRESS TEST: USER ASSIGNMENT WORKFLOWS & RBAC SECURITY\n";
        echo "========================================================================================\n";

        // Setup isolated test database environment
        $origDb = getenv('BHUMISHIELD_TEST_DB');
        $tmpDb = null;
        $createdTemp = false;
        if (!$origDb) {
            $tmpDb = sys_get_temp_dir() . '/bhumishield_stress_' . getmypid() . '_' . bin2hex(random_bytes(4)) . '.sqlite';
            putenv("BHUMISHIELD_TEST_DB={$tmpDb}");
            $_ENV['BHUMISHIELD_TEST_DB'] = $tmpDb;
            putenv('APP_ENV=testing');
            DB::resetConnection();
            (new DatabaseSeeder())->run(true);
            $createdTemp = true;
        }

        C::migrate();

        // Load test fixtures
        $adminToken = H::loginAs('admin');
        $acLandToken = H::loginAs('ac_land');
        $fvoToken = H::loginAs('field_verification_officer');
        $sroToken = H::loginAs('settlement_records_officer');
        $loaToken = H::loginAs('land_office_assistant');
        $checkerToken = H::loginAs('settlement_checker');
        $citizenToken = H::loginAs('citizen');
        $bankToken = H::loginAs('bank_officer');

        $fvoUser = DB::selectOne("SELECT id, username FROM users WHERE role = 'field_verification_officer' LIMIT 1");
        $sroUser = DB::selectOne("SELECT id, username FROM users WHERE role = 'settlement_records_officer' LIMIT 1");
        $loaUser = DB::selectOne("SELECT id, username FROM users WHERE role = 'land_office_assistant' LIMIT 1");

        $loc1 = DB::selectOne("SELECT id, mouza_bn, latitude, longitude FROM locations LIMIT 1");
        $loc2 = DB::selectOne("SELECT id, mouza_bn, latitude, longitude FROM locations WHERE id != ? LIMIT 1", [$loc1['id']]);
        $plot1 = DB::selectOne("SELECT id, dag_no, location_id FROM plots WHERE location_id = ? LIMIT 1", [$loc1['id']]);
        $plot2 = DB::selectOne("SELECT id, dag_no, location_id FROM plots WHERE location_id = ? LIMIT 1", [$loc2['id']]);

        self::check($fvoUser && $sroUser && $loaUser && $loc1 && $plot1, 'Fixtures verified in test database');

        // =========================================================================
        // SECTION 1: Adversarial Authorization Enforcement (401 / 403)
        // =========================================================================
        echo "\n--- Section 1: Adversarial Authorization Enforcement ---\n";

        $validPayload = [
            'title' => 'সীমানা ও নকশা সরেজমিন সার্ভে',
            'task_type' => 'MOUZA_SURVEY',
            'location_id' => (int) $loc1['id'],
            'assigned_to_user_id' => (int) $fvoUser['id'],
            'priority' => 'HIGH',
            'due_date' => '2026-12-15',
            'notes' => 'মাঠ পর্যায়ের সীমানা পিলার ও সংযোগ জরিপ।',
        ];

        // 1.1 Unauthenticated guest creation -> expect 401
        $guestRes = H::callRoute('POST', '/api/v1/map/assignments', $validPayload);
        self::check($guestRes['status'] === 401, 'Guest POST /api/v1/map/assignments blocked with 401');
        self::check(($guestRes['code'] ?? '') === 'AUTH_REQUIRED', 'Guest error code is AUTH_REQUIRED');

        // 1.2 Unauthenticated guest list all assignments -> expect 401
        $guestListRes = H::callRoute('GET', '/api/v1/map/assignments');
        self::check($guestListRes['status'] === 401, 'Guest GET /api/v1/map/assignments blocked with 401');

        // 1.3 Unauthenticated guest personal queue -> expect 401
        $guestQueueRes = H::callRoute('GET', '/api/v1/map/my-assignments');
        self::check($guestQueueRes['status'] === 401, 'Guest GET /api/v1/map/my-assignments blocked with 401');

        // 1.4 Unauthenticated guest status update -> expect 401
        $guestPatchRes = H::callRoute('PATCH', '/api/v1/map/assignments/1/status', ['status' => 'in_progress']);
        self::check($guestPatchRes['status'] === 401, 'Guest PATCH /api/v1/map/assignments/{id}/status blocked with 401');

        // 1.5 Citizen role creation -> expect 403
        $citizenCreate = H::callRoute('POST', '/api/v1/map/assignments', $validPayload, $citizenToken);
        self::check($citizenCreate['status'] === 403, 'Citizen POST /api/v1/map/assignments blocked with 403');
        self::check(($citizenCreate['code'] ?? '') === 'FORBIDDEN_ROLE', 'Citizen creation code is FORBIDDEN_ROLE');

        // 1.6 Citizen role list all assignments -> expect 403
        $citizenList = H::callRoute('GET', '/api/v1/map/assignments', [], $citizenToken);
        self::check($citizenList['status'] === 403, 'Citizen GET /api/v1/map/assignments blocked with 403');

        // 1.7 Field Officer (FVO) attempting creation -> expect 403
        $fvoCreate = H::callRoute('POST', '/api/v1/map/assignments', $validPayload, $fvoToken);
        self::check($fvoCreate['status'] === 403, 'FVO (non-creator) blocked from task creation with 403');

        // 1.8 Settlement Records Officer (SRO) attempting creation -> expect 403
        $sroCreate = H::callRoute('POST', '/api/v1/map/assignments', $validPayload, $sroToken);
        self::check($sroCreate['status'] === 403, 'SRO (non-creator) blocked from task creation with 403');

        // 1.9 Land Office Assistant (LOA) attempting creation -> expect 403
        $loaCreate = H::callRoute('POST', '/api/v1/map/assignments', $validPayload, $loaToken);
        self::check($loaCreate['status'] === 403, 'LOA (non-creator) blocked from task creation with 403');

        // 1.10 Bank Officer attempting creation -> expect 403
        $bankCreate = H::callRoute('POST', '/api/v1/map/assignments', $validPayload, $bankToken);
        self::check($bankCreate['status'] === 403, 'Bank Officer blocked from task creation with 403');

        // 1.11 AC Land role creation -> expect 200/201 SUCCESS
        $acLandCreate = H::callRoute('POST', '/api/v1/map/assignments', $validPayload, $acLandToken);
        self::check($acLandCreate['status'] === 200, 'AC Land permitted to create assignment (HTTP 200)');
        $taskByAcLandId = (int) $acLandCreate['data']['data']['id'];

        // 1.12 Admin role creation -> expect 200/201 SUCCESS
        $adminCreate = H::callRoute('POST', '/api/v1/map/assignments', $validPayload, $adminToken);
        self::check($adminCreate['status'] === 200, 'Admin permitted to create assignment (HTTP 200)');
        $taskByAdminId = (int) $adminCreate['data']['data']['id'];

        // =========================================================================
        // SECTION 2: Status Lifecycle Transitions, Reversals & Fuzzing (422)
        // =========================================================================
        echo "\n--- Section 2: Status Lifecycle Transitions, Reversals & Fuzzing ---\n";

        // Create fresh test task assigned to FVO
        $testTaskPayload = [
            'title' => 'মৌজা সীমানা লাইফসাইকেল টেস্ট',
            'task_type' => 'PLOT_DRAWING',
            'location_id' => (int) $loc1['id'],
            'plot_id' => (int) $plot1['id'],
            'assigned_to_user_id' => (int) $fvoUser['id'],
            'priority' => 'URGENT',
        ];
        $tRes = H::callRoute('POST', '/api/v1/map/assignments', $testTaskPayload, $adminToken);
        $taskId = (int) $tRes['data']['data']['id'];
        self::check($tRes['data']['data']['status'] === 'pending', 'Initial status is pending');
        self::check($tRes['data']['data']['completed_at'] === null, 'Initial completed_at is null');

        // 2.1 Non-assigned officer (SRO) attempts status update -> expect 403
        $unauthUpdate = H::callRoute('PATCH', "/api/v1/map/assignments/{$taskId}/status", [
            'status' => 'in_progress',
        ], $sroToken);
        self::check($unauthUpdate['status'] === 403, 'Non-assigned officer status update blocked with 403');
        self::check(($unauthUpdate['code'] ?? '') === 'FORBIDDEN_TASK_ACCESS', 'Error code is FORBIDDEN_TASK_ACCESS');

        // 2.2 Citizen attempts status update -> expect 403
        $citizenUpdate = H::callRoute('PATCH', "/api/v1/map/assignments/{$taskId}/status", [
            'status' => 'in_progress',
        ], $citizenToken);
        self::check($citizenUpdate['status'] === 403, 'Citizen status update blocked with 403');

        // 2.3 Status Fuzzing with invalid values -> expect 422
        $garbageStatuses = [
            '',
            'arbitrary',
            'done',
            'approved',
            'rejected',
            '12345',
            '<script>alert(1)</script>',
            'DROP TABLE map_task_assignments;',
            'closed',
            'canceled',
        ];
        foreach ($garbageStatuses as $gStat) {
            $fuzzRes = H::callRoute('PATCH', "/api/v1/map/assignments/{$taskId}/status", [
                'status' => $gStat,
            ], $fvoToken);
            self::check($fuzzRes['status'] === 422, "Garbage status '{$gStat}' rejected with 422");
            self::check(($fuzzRes['code'] ?? '') === 'INVALID_STATUS', "Error code is INVALID_STATUS for '{$gStat}'");
        }

        // 2.4 Transition 1: pending -> in_progress (valid, assigned officer)
        $pToIp = H::callRoute('PATCH', "/api/v1/map/assignments/{$taskId}/status", [
            'status' => 'in_progress',
        ], $fvoToken);
        self::check($pToIp['status'] === 200, 'Assigned officer transitions to in_progress (HTTP 200)');
        self::check($pToIp['data']['data']['status'] === 'in_progress', 'Status recorded as in_progress');
        self::check($pToIp['data']['data']['completed_at'] === null, 'completed_at is null during in_progress');

        // 2.5 Transition 2: in_progress -> completed with completion note
        $noteText = 'সরেজমিন পরিদর্শন ও সীমানা নির্ধারণ সম্পন্ন। দাগের সঠিক নকশা প্রণয়ন করা হয়েছে।';
        $ipToComp = H::callRoute('PATCH', "/api/v1/map/assignments/{$taskId}/status", [
            'status' => 'completed',
            'completion_note' => $noteText,
        ], $fvoToken);
        self::check($ipToComp['status'] === 200, 'Assigned officer transitions to completed (HTTP 200)');
        self::check($ipToComp['data']['data']['status'] === 'completed', 'Status recorded as completed');
        self::check(!empty($ipToComp['data']['data']['completed_at']), 'completed_at timestamp successfully stamped');
        self::check($ipToComp['data']['data']['completion_note'] === $noteText, 'completion_note stored accurately');

        // Verify timestamp format (ISO 8601 UTC)
        $completedTimestamp = $ipToComp['data']['data']['completed_at'];
        $parsedTime = strtotime($completedTimestamp);
        self::check($parsedTime !== false && $parsedTime > 1700000000, 'completed_at is valid Unix/ISO-8601 timestamp');

        // 2.6 Reversal Transition: completed -> in_progress (reopening task)
        $compToIp = H::callRoute('PATCH', "/api/v1/map/assignments/{$taskId}/status", [
            'status' => 'in_progress',
        ], $fvoToken);
        self::check($compToIp['status'] === 200, 'Reopen task to in_progress (HTTP 200)');
        self::check($compToIp['data']['data']['status'] === 'in_progress', 'Status reopened to in_progress');
        self::check($compToIp['data']['data']['completed_at'] === null, 'completed_at reset to null upon reopening');

        // 2.7 Case normalization: uppercase 'COMPLETED'
        $upperCaseComp = H::callRoute('PATCH', "/api/v1/map/assignments/{$taskId}/status", [
            'status' => 'COMPLETED',
        ], $fvoToken);
        self::check($upperCaseComp['status'] === 200, "Uppercase 'COMPLETED' normalized and accepted");
        self::check($upperCaseComp['data']['data']['status'] === 'completed', "Status saved as lowercase 'completed'");

        // 2.8 Supervisory Override: Admin can update status of task assigned to FVO
        $adminOverride = H::callRoute('PATCH', "/api/v1/map/assignments/{$taskId}/status", [
            'status' => 'in_progress',
            'completion_note' => 'Admin reopened task for additional verification',
        ], $adminToken);
        self::check($adminOverride['status'] === 200, 'Admin supervisory override status update succeeded');
        self::check($adminOverride['data']['data']['status'] === 'in_progress', 'Status changed by admin');

        // 2.9 Supervisory Override: AC Land can update status of task assigned to FVO
        $acLandOverride = H::callRoute('PATCH', "/api/v1/map/assignments/{$taskId}/status", [
            'status' => 'completed',
            'completion_note' => 'AC Land final certification',
        ], $acLandToken);
        self::check($acLandOverride['status'] === 200, 'AC Land supervisory override status update succeeded');
        self::check($acLandOverride['data']['data']['status'] === 'completed', 'Status certified by AC Land');

        // 2.10 Non-existent task ID -> expect 404
        $notFoundRes = H::callRoute('PATCH', '/api/v1/map/assignments/99999999/status', [
            'status' => 'in_progress',
        ], $adminToken);
        self::check($notFoundRes['status'] === 404, 'Non-existent task update returns 404');
        self::check(($notFoundRes['code'] ?? '') === 'TASK_NOT_FOUND', 'Error code is TASK_NOT_FOUND');

        // =========================================================================
        // SECTION 3: Personal Queue Scoping & Navigation Coordinates
        // =========================================================================
        echo "\n--- Section 3: Personal Queue Scoping & Navigation Coordinates ---\n";

        // Create dedicated tasks for Officer 1 (FVO), Officer 2 (SRO), Officer 3 (LOA)
        $fvoPayload = [
            'title' => 'FVO Exclusive Boundary Task',
            'task_type' => 'PLOT_DRAWING',
            'location_id' => (int) $loc1['id'],
            'plot_id' => (int) $plot1['id'],
            'assigned_to_user_id' => (int) $fvoUser['id'],
            'priority' => 'HIGH',
        ];
        $sroPayload = [
            'title' => 'SRO Exclusive Mouza Resurvey',
            'task_type' => 'MOUZA_SURVEY',
            'location_id' => (int) $loc2['id'],
            'assigned_to_user_id' => (int) $sroUser['id'],
            'priority' => 'URGENT',
        ];
        $loaPayload = [
            'title' => 'LOA Exclusive Verification Task',
            'task_type' => 'BOUNDARY_VERIFICATION',
            'location_id' => (int) $loc1['id'],
            'assigned_to_user_id' => (int) $loaUser['id'],
            'priority' => 'NORMAL',
        ];

        $fvoCreated = H::callRoute('POST', '/api/v1/map/assignments', $fvoPayload, $adminToken);
        $sroCreated = H::callRoute('POST', '/api/v1/map/assignments', $sroPayload, $adminToken);
        $loaCreated = H::callRoute('POST', '/api/v1/map/assignments', $loaPayload, $adminToken);

        $fvoTaskId = (int) $fvoCreated['data']['data']['id'];
        $sroTaskId = (int) $sroCreated['data']['data']['id'];
        $loaTaskId = (int) $loaCreated['data']['data']['id'];

        // 3.1 Strict Personal Queue Isolation
        $fvoQueue = H::callRoute('GET', '/api/v1/map/my-assignments', [], $fvoToken);
        self::check($fvoQueue['status'] === 200, 'FVO queries my-assignments (HTTP 200)');
        $fvoTaskIds = array_column($fvoQueue['data']['data'], 'id');
        self::check(in_array($fvoTaskId, $fvoTaskIds, true), 'FVO sees their own assigned task');
        self::check(!in_array($sroTaskId, $fvoTaskIds, true), 'FVO CANNOT see SRO assigned task (Zero Leakage)');
        self::check(!in_array($loaTaskId, $fvoTaskIds, true), 'FVO CANNOT see LOA assigned task (Zero Leakage)');

        $sroQueue = H::callRoute('GET', '/api/v1/map/my-assignments', [], $sroToken);
        self::check($sroQueue['status'] === 200, 'SRO queries my-assignments (HTTP 200)');
        $sroTaskIds = array_column($sroQueue['data']['data'], 'id');
        self::check(in_array($sroTaskId, $sroTaskIds, true), 'SRO sees their own assigned task');
        self::check(!in_array($fvoTaskId, $sroTaskIds, true), 'SRO CANNOT see FVO assigned task (Zero Leakage)');
        self::check(!in_array($loaTaskId, $sroTaskIds, true), 'SRO CANNOT see LOA assigned task (Zero Leakage)');

        $loaQueue = H::callRoute('GET', '/api/v1/map/my-assignments', [], $loaToken);
        self::check($loaQueue['status'] === 200, 'LOA queries my-assignments (HTTP 200)');
        $loaTaskIds = array_column($loaQueue['data']['data'], 'id');
        self::check(in_array($loaTaskId, $loaTaskIds, true), 'LOA sees their own assigned task');
        self::check(!in_array($fvoTaskId, $loaTaskIds, true), 'LOA CANNOT see FVO assigned task (Zero Leakage)');
        self::check(!in_array($sroTaskId, $loaTaskIds, true), 'LOA CANNOT see SRO assigned task (Zero Leakage)');

        // 3.2 Joined Location Coordinates for Map Navigation
        $targetTask = null;
        foreach ($fvoQueue['data']['data'] as $t) {
            if ($t['id'] === $fvoTaskId) {
                $targetTask = $t;
                break;
            }
        }
        self::check($targetTask !== null, 'Target task found in FVO queue');
        self::check(isset($targetTask['location']), 'Task contains joined location object');
        $locData = $targetTask['location'];

        self::check(isset($locData['latitude']) && is_numeric($locData['latitude']), 'Location latitude is present & numeric');
        self::check(isset($locData['longitude']) && is_numeric($locData['longitude']), 'Location longitude is present & numeric');

        $lat = (float) $locData['latitude'];
        $lng = (float) $locData['longitude'];
        // Bangladesh Geographic Bounding Box verification
        self::check($lat >= 20.5 && $lat <= 26.7, "Latitude ({$lat}) within Bangladesh bounds (20.5 - 26.7)");
        self::check($lng >= 88.0 && $lng <= 92.7, "Longitude ({$lng}) within Bangladesh bounds (88.0 - 92.7)");

        self::check(!empty($locData['mouza_bn']), 'Location contains mouza_bn');
        self::check(!empty($locData['upazila_bn']), 'Location contains upazila_bn');
        self::check(!empty($locData['district_bn']), 'Location contains district_bn');

        // 3.3 Joined Plot Navigation details
        self::check(isset($targetTask['plot']), 'Task contains joined plot object');
        $plotData = $targetTask['plot'];
        self::check(!empty($plotData['dag_no']), 'Plot contains dag_no');
        self::check(isset($plotData['total_area_decimal']), 'Plot contains total_area_decimal');

        // 3.4 Mouza-level Task (no plot) returns null plot
        $mouzaTargetTask = null;
        foreach ($sroQueue['data']['data'] as $t) {
            if ($t['id'] === $sroTaskId) {
                $mouzaTargetTask = $t;
                break;
            }
        }
        self::check($mouzaTargetTask !== null, 'SRO Mouza survey task found');
        self::check(!isset($mouzaTargetTask['plot']), 'Mouza-level survey correctly omits plot object');

        // =========================================================================
        // SECTION 4: Input Validation, Boundary Rejections & XSS/SQL Injection
        // =========================================================================
        echo "\n--- Section 4: Boundary Validation, XSS & Injection Stress ---\n";

        // 4.1 Short title (< 3 chars)
        $shortTitleRes = H::callRoute('POST', '/api/v1/map/assignments', [
            'title' => 'ab',
            'task_type' => 'MOUZA_SURVEY',
            'location_id' => (int) $loc1['id'],
            'assigned_to_user_id' => (int) $fvoUser['id'],
        ], $adminToken);
        self::check($shortTitleRes['status'] === 422, 'Short title (<3 chars) rejected with 422');
        self::check(($shortTitleRes['code'] ?? '') === 'TITLE_REQUIRED', 'Error code is TITLE_REQUIRED');

        // 4.2 Invalid task type
        $badTypeRes = H::callRoute('POST', '/api/v1/map/assignments', [
            'title' => 'Valid Title For Bad Type',
            'task_type' => 'NON_EXISTENT_TYPE',
            'location_id' => (int) $loc1['id'],
            'assigned_to_user_id' => (int) $fvoUser['id'],
        ], $adminToken);
        self::check($badTypeRes['status'] === 422, 'Invalid task type rejected with 422');
        self::check(($badTypeRes['code'] ?? '') === 'INVALID_TASK_TYPE', 'Error code is INVALID_TASK_TYPE');

        // 4.3 Non-existent location ID
        $badLocRes = H::callRoute('POST', '/api/v1/map/assignments', [
            'title' => 'Valid Title For Bad Location',
            'task_type' => 'MOUZA_SURVEY',
            'location_id' => 999999,
            'assigned_to_user_id' => (int) $fvoUser['id'],
        ], $adminToken);
        self::check($badLocRes['status'] === 404, 'Non-existent location rejected with 404');
        self::check(($badLocRes['code'] ?? '') === 'LOCATION_NOT_FOUND', 'Error code is LOCATION_NOT_FOUND');

        // 4.4 Non-existent assigned user
        $badUserRes = H::callRoute('POST', '/api/v1/map/assignments', [
            'title' => 'Valid Title For Bad User',
            'task_type' => 'MOUZA_SURVEY',
            'location_id' => (int) $loc1['id'],
            'assigned_to_user_id' => 999999,
        ], $adminToken);
        self::check($badUserRes['status'] === 422, 'Non-existent assigned user rejected with 422');
        self::check(($badUserRes['code'] ?? '') === 'ASSIGNED_USER_INVALID', 'Error code is ASSIGNED_USER_INVALID');

        // 4.5 Inactive assigned user
        DB::statement("UPDATE users SET is_active = 0 WHERE id = ?", [(int) $loaUser['id']]);
        $inactiveUserRes = H::callRoute('POST', '/api/v1/map/assignments', [
            'title' => 'Valid Title For Inactive User',
            'task_type' => 'MOUZA_SURVEY',
            'location_id' => (int) $loc1['id'],
            'assigned_to_user_id' => (int) $loaUser['id'],
        ], $adminToken);
        self::check($inactiveUserRes['status'] === 422, 'Inactive assigned user rejected with 422');
        self::check(($inactiveUserRes['code'] ?? '') === 'ASSIGNED_USER_INVALID', 'Inactive user code is ASSIGNED_USER_INVALID');
        DB::statement("UPDATE users SET is_active = 1 WHERE id = ?", [(int) $loaUser['id']]);

        // 4.6 Plot & Location Mismatch (Plot 2 belongs to Loc 2, not Loc 1)
        if ($plot2 && (int) $plot2['location_id'] !== (int) $loc1['id']) {
            $mismatchRes = H::callRoute('POST', '/api/v1/map/assignments', [
                'title' => 'Mismatch Plot and Location',
                'task_type' => 'PLOT_DRAWING',
                'location_id' => (int) $loc1['id'],
                'plot_id' => (int) $plot2['id'],
                'assigned_to_user_id' => (int) $fvoUser['id'],
            ], $adminToken);
            self::check($mismatchRes['status'] === 422, 'Plot-location mismatch rejected with 422');
            self::check(($mismatchRes['code'] ?? '') === 'PLOT_LOCATION_MISMATCH', 'Error code is PLOT_LOCATION_MISMATCH');
        }

        // 4.7 SQL Injection & XSS Payloads in Title, Notes, and Completion Notes
        $xssTitle = 'মৌজা পরীক্ষা <script>alert("xss")</script> \' OR 1=1 --';
        $xssNotes = 'নোট: \'; DROP TABLE map_task_assignments; <img src="x" onerror="alert(1)">';
        $injectionTaskRes = H::callRoute('POST', '/api/v1/map/assignments', [
            'title' => $xssTitle,
            'task_type' => 'MOUZA_SURVEY',
            'location_id' => (int) $loc1['id'],
            'assigned_to_user_id' => (int) $fvoUser['id'],
            'notes' => $xssNotes,
        ], $adminToken);
        self::check($injectionTaskRes['status'] === 200, 'Malicious payload handled safely (HTTP 200)');
        $injTaskId = (int) $injectionTaskRes['data']['data']['id'];

        $fetchedInj = DB::selectOne("SELECT * FROM map_task_assignments WHERE id = ?", [$injTaskId]);
        self::check($fetchedInj['title'] === $xssTitle, 'Title safely stored without SQL execution');
        self::check($fetchedInj['notes'] === $xssNotes, 'Notes safely stored without SQL execution');

        // =========================================================================
        // SECTION 5: High Volume Sequential Task Code Collision Resistance
        // =========================================================================
        echo "\n--- Section 5: Mass Creation & Unique Task Code Collision Resistance ---\n";

        $taskCodes = [];
        for ($i = 0; $i < 20; $i++) {
            $batchRes = H::callRoute('POST', '/api/v1/map/assignments', [
                'title' => "Batch Sequential Task #{$i}",
                'task_type' => ($i % 2 === 0) ? 'MOUZA_SURVEY' : 'PLOT_DRAWING',
                'location_id' => (int) $loc1['id'],
                'assigned_to_user_id' => (int) $fvoUser['id'],
                'priority' => ($i % 3 === 0) ? 'URGENT' : 'NORMAL',
            ], $adminToken);

            self::check($batchRes['status'] === 200, "Sequential task #{$i} created successfully");
            $code = $batchRes['data']['data']['task_code'];
            self::check(str_starts_with($code, 'TSK-'), "Task code has TSK- prefix: {$code}");
            self::check(!in_array($code, $taskCodes, true), "Task code is strictly unique: {$code}");
            $taskCodes[] = $code;
        }

        self::check(count($taskCodes) === 20, '20 unique task codes generated with zero collisions');

        // Audit Trail Verification
        $auditCount = DB::selectOne("SELECT COUNT(*) AS c FROM audit_log WHERE entity_type = 'map_task_assignment'");
        self::check((int) $auditCount['c'] >= 25, 'Audit log contains complete immutable audit trail of all assignment events');

        echo "\n========================================================================================\n";
        echo "   M4 ADVERSARIAL STRESS TEST SUMMARY\n";
        echo "========================================================================================\n";
        echo " Total Assertions Checked: " . (self::$passCount + self::$failCount) . "\n";
        echo " Passed:                   " . self::$passCount . "\n";
        echo " Failed:                   " . self::$failCount . "\n";
        echo " Result:                   " . (self::$failCount === 0 ? "ALL PASS (VERDICT: APPROVE)" : "FAILURES DETECTED") . "\n";
        echo "========================================================================================\n\n";

        if ($createdTemp && $tmpDb && file_exists($tmpDb)) {
            @unlink($tmpDb);
        }

        return self::$failCount === 0 ? 0 : 1;
    }
}

if (PHP_SAPI === 'cli' && isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    exit(MapAssignmentStressTest::runAll());
}
