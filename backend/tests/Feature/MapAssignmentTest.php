<?php

declare(strict_types=1);

namespace Tests\Feature;

require_once __DIR__ . '/../../vendor/autoload.php';

use App\Http\Controllers\Api\V1\MapAssignmentController as C;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

final class MapAssignmentTest
{
    public static function runAll(): int
    {
        $createdTemp = false;
        $origDb = getenv('BHUMISHIELD_TEST_DB');
        $tmpDb = null;
        if (!$origDb) {
            $tmpDb = sys_get_temp_dir() . '/bhumishield_ma_test_' . getmypid() . '_' . bin2hex(random_bytes(4)) . '.sqlite';
            putenv("BHUMISHIELD_TEST_DB={$tmpDb}");
            $_ENV['BHUMISHIELD_TEST_DB'] = $tmpDb;
            putenv('APP_ENV=testing');
            DB::resetConnection();
            (new DatabaseSeeder())->run(true);
            $createdTemp = true;
        }

        echo "\n   PASS  Tests\\Feature\\MapAssignmentTest (Cadastral Task Assignments & User Workflow Management)\n";

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
        $acLand = DB::selectOne("SELECT * FROM users WHERE role = 'ac_land' LIMIT 1");
        $fvo = DB::selectOne("SELECT * FROM users WHERE role = 'field_verification_officer' LIMIT 1");
        $sro = DB::selectOne("SELECT * FROM users WHERE role = 'settlement_records_officer' LIMIT 1");
        $citizen = DB::selectOne("SELECT * FROM users WHERE role = 'citizen' LIMIT 1");
        $loc = DB::selectOne("SELECT * FROM locations WHERE mouza_en = 'Birulia' LIMIT 1")
            ?: DB::selectOne("SELECT * FROM locations LIMIT 1");
        $plot = DB::selectOne("SELECT * FROM plots WHERE location_id = ? LIMIT 1", [$loc['id']]);

        $check($admin && $acLand && $fvo && $sro && $citizen && $loc, 'Required user and location fixtures loaded');

        $locId = (int) $loc['id'];
        $plotId = $plot ? (int) $plot['id'] : null;

        // 2. Role-Based Access Control on Task Creation
        $taskPayload = [
            'title' => 'বিরুলিয়া মৌজা দাগ ১০১ সরেজমিন সীমানা নির্ধারণ',
            'task_type' => 'PLOT_DRAWING',
            'location_id' => $locId,
            'plot_id' => $plotId,
            'assigned_to_user_id' => (int) $fvo['id'],
            'priority' => 'HIGH',
            'due_date' => '2026-11-20',
            'notes' => 'মৌজা নকশা অনুযায়ী দাগের সীমানা চিহ্নিত করুন এবং জিপিএস পিলার স্থাপন করুন।',
        ];

        // Non-creators cannot assign tasks
        $deny(fn() => C::create($taskPayload, $citizen), 'FORBIDDEN_ROLE');
        $deny(fn() => C::create($taskPayload, $fvo), 'FORBIDDEN_ROLE');
        $deny(fn() => C::create($taskPayload, null), 'AUTH_REQUIRED');

        // Validation failures
        $invalidType = $taskPayload;
        $invalidType['task_type'] = 'INVALID_TYPE';
        $deny(fn() => C::create($invalidType, $admin), 'INVALID_TASK_TYPE');

        $invalidLoc = $taskPayload;
        $invalidLoc['location_id'] = 999999;
        $deny(fn() => C::create($invalidLoc, $admin), 'LOCATION_NOT_FOUND');

        $invalidUser = $taskPayload;
        $invalidUser['assigned_to_user_id'] = 999999;
        $deny(fn() => C::create($invalidUser, $admin), 'ASSIGNED_USER_INVALID');

        // 3. Admin successfully creates task 1 for FVO
        $createdTask1 = C::create($taskPayload, $admin);
        $check($createdTask1['success'] === true, 'Admin successfully creates and assigns mapping task');
        $t1 = $createdTask1['data'];
        $taskId1 = (int) $t1['id'];

        $check($taskId1 > 0, 'Generated valid auto-increment task id');
        $check(str_starts_with($t1['task_code'], 'TSK-'), 'Generated task_code with TSK- prefix');
        $check($t1['status'] === 'pending', 'Initial task status is pending');
        $check($t1['priority'] === 'HIGH', 'Saved priority is HIGH');
        $check($t1['assigned_to_user_id'] === (int) $fvo['id'], 'Assigned to FVO user ID');
        $check($t1['assigned_by_user_id'] === (int) $admin['id'], 'Assigned by admin user ID');
        $check(isset($t1['location']['latitude']), 'Returns joined location latitude');
        $check(isset($t1['location']['longitude']), 'Returns joined location longitude');
        $check($t1['location']['mouza_bn'] === $loc['mouza_bn'], 'Returns joined location mouza_bn');
        $check($t1['assigned_to']['username'] === $fvo['username'], 'Returns joined assigned_to user profile');

        // 4. AC Land creates task 2 for SRO (MOUZA_SURVEY)
        $taskPayload2 = [
            'title' => 'বিরুলিয়া মৌজা বিএস জরিপ পূর্ণাঙ্গ সীমানা যাচাই',
            'task_type' => 'MOUZA_SURVEY',
            'location_id' => $locId,
            'assigned_to_user_id' => (int) $sro['id'],
            'priority' => 'URGENT',
            'due_date' => '2026-11-25',
            'notes' => 'উপজেলা নির্বাহী কর্মকর্তার নির্দেশে জরুরি সীমানা পরিদর্শন।',
        ];
        $createdTask2 = C::create($taskPayload2, $acLand);
        $check($createdTask2['success'] === true, 'AC Land creates mouza survey assignment');
        $t2 = $createdTask2['data'];
        $taskId2 = (int) $t2['id'];
        $check($t2['task_type'] === 'MOUZA_SURVEY', 'Task type is MOUZA_SURVEY');
        $check($t2['task_code'] !== $t1['task_code'], 'Unique task codes generated');

        // 5. Admin lists assignments with filters
        $allTasks = C::list([], $admin);
        $check($allTasks['success'] === true, 'Admin lists all assignments');
        $check($allTasks['count'] >= 2, 'Found at least 2 assignments');

        $fvoFilter = C::list(['assigned_to_user_id' => $fvo['id']], $admin);
        $check($fvoFilter['count'] >= 1, 'Filter assignments by assigned_to_user_id');
        $check($fvoFilter['data'][0]['assigned_to_user_id'] === (int) $fvo['id'], 'Matches assigned user');

        $statusFilter = C::list(['status' => 'pending'], $admin);
        $check($statusFilter['count'] >= 2, 'Filter assignments by status pending');

        $typeFilter = C::list(['task_type' => 'MOUZA_SURVEY'], $admin);
        $check($typeFilter['count'] >= 1, 'Filter assignments by task_type MOUZA_SURVEY');

        // 6. User personal task queue ("My Assignments")
        // FVO checks their personal queue
        $fvoMyTasks = C::myAssignments([], $fvo);
        $check($fvoMyTasks['success'] === true, 'FVO queries my-assignments');
        $check($fvoMyTasks['count'] >= 1, 'FVO sees their assigned task');
        $check($fvoMyTasks['data'][0]['id'] === $taskId1, 'Task matches assigned task ID');

        // Verify location coordinates exist for direct map navigation
        $myLoc = $fvoMyTasks['data'][0]['location'];
        $check(is_float($myLoc['latitude']) || is_numeric($myLoc['latitude']), 'Location latitude is present for map navigation');
        $check(is_float($myLoc['longitude']) || is_numeric($myLoc['longitude']), 'Location longitude is present for map navigation');

        // SRO checks their personal queue
        $sroMyTasks = C::myAssignments([], $sro);
        $check($sroMyTasks['count'] >= 1, 'SRO sees their assigned task');
        $check($sroMyTasks['data'][0]['id'] === $taskId2, 'SRO task ID matches');

        // Verify task segregation: FVO does not see SRO's tasks in my-assignments
        $fvoTaskIds = array_column($fvoMyTasks['data'], 'id');
        $check(!in_array($taskId2, $fvoTaskIds, true), 'FVO personal queue excludes tasks assigned to SRO');

        // 7. Status Lifecycle Updates
        // Another officer (SRO) attempts to update FVO's task -> rejected
        $deny(fn() => C::updateStatus($taskId1, ['status' => 'in_progress'], $sro), 'FORBIDDEN_TASK_ACCESS');

        // Invalid status rejected
        $deny(fn() => C::updateStatus($taskId1, ['status' => 'UNKNOWN_STATUS'], $fvo), 'INVALID_STATUS');

        // FVO updates task 1: pending -> in_progress
        $statusRes1 = C::updateStatus($taskId1, ['status' => 'in_progress'], $fvo);
        $check($statusRes1['success'] === true, 'FVO transitions status to in_progress');
        $check($statusRes1['data']['status'] === 'in_progress', 'Task status is now in_progress');
        $check($statusRes1['data']['completed_at'] === null, 'completed_at is null while in_progress');

        // FVO updates task 1: in_progress -> completed
        $completionNote = 'সরেজমিন পরিদর্শন ও ড্রয়িং সম্পন্ন। নকশা সাবমিট করা হয়েছে।';
        $statusRes2 = C::updateStatus($taskId1, [
            'status' => 'completed',
            'completion_note' => $completionNote,
        ], $fvo);
        $check($statusRes2['success'] === true, 'FVO transitions status to completed');
        $check($statusRes2['data']['status'] === 'completed', 'Task status is now completed');
        $check($statusRes2['data']['completed_at'] !== null, 'completed_at is recorded');
        $check($statusRes2['data']['completion_note'] === $completionNote, 'completion_note is recorded');

        // Admin can also update task 2 status
        $adminUpdate = C::updateStatus($taskId2, ['status' => 'in_progress'], $admin);
        $check($adminUpdate['success'] === true, 'Admin can update status of task assigned to SRO');
        $check($adminUpdate['data']['status'] === 'in_progress', 'Task 2 is in_progress');

        // 8. Audit verification
        $taskAudits = DB::select("SELECT * FROM audit_log WHERE entity_type = 'map_task_assignment'");
        $check(count($taskAudits) >= 4, 'Audit trail records all task assignment and status lifecycle transitions');

        echo "\n  Map Assignment Tests: {$n} passed, 0 failed ({$n} total)\n\n";

        if ($createdTemp && $tmpDb && file_exists($tmpDb)) {
            @unlink($tmpDb);
        }

        return 0;
    }
}

if (PHP_SAPI === 'cli' && isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    exit(MapAssignmentTest::runAll());
}
