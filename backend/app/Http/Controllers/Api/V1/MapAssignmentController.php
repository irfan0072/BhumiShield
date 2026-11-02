<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Middleware\RoleMiddleware;
use App\Support\DB;
use Database\Migrations\CreateMapFeaturesAndAssignments;
use Database\Seeders\DatabaseSeeder;

/**
 * Controller for Cadastral Task Assignments and Workflow Management.
 * Supports task assignment by administrators/AC Land to designated field officers,
 * personal task queues ("My Assignments"), map position navigation, and status tracking.
 */
final class MapAssignmentController
{
    public const CREATOR_ROLES = [
        'admin',
        'system_admin',
        'ac_land',
    ];

    public const OFFICER_ROLES = [
        'admin',
        'system_admin',
        'ac_land',
        'land_office_assistant',
        'field_verification_officer',
        'settlement_records_officer',
        'settlement_checker',
    ];

    public const VALID_TASK_TYPES = [
        'MOUZA_SURVEY',
        'PLOT_DRAWING',
        'BOUNDARY_VERIFICATION',
    ];

    public const VALID_PRIORITIES = [
        'LOW',
        'NORMAL',
        'HIGH',
        'URGENT',
    ];

    public const VALID_STATUSES = [
        'pending',
        'in_progress',
        'completed',
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
        $res = [
            'id' => (int) $row['id'],
            'task_code' => (string) $row['task_code'],
            'title' => (string) $row['title'],
            'task_type' => (string) $row['task_type'],
            'location_id' => (int) $row['location_id'],
            'plot_id' => isset($row['plot_id']) && $row['plot_id'] !== null ? (int) $row['plot_id'] : null,
            'assigned_by_user_id' => (int) $row['assigned_by_user_id'],
            'assigned_to_user_id' => (int) $row['assigned_to_user_id'],
            'priority' => (string) $row['priority'],
            'status' => (string) $row['status'],
            'due_date' => isset($row['due_date']) ? (string) $row['due_date'] : null,
            'notes' => isset($row['notes']) ? (string) $row['notes'] : null,
            'completion_note' => isset($row['completion_note']) ? (string) $row['completion_note'] : null,
            'completed_at' => isset($row['completed_at']) ? (string) $row['completed_at'] : null,
            'created_at' => (string) $row['created_at'],
            'updated_at' => (string) $row['updated_at'],
        ];

        // Joined location details
        if (isset($row['loc_mouza_bn'])) {
            $res['location'] = [
                'id' => (int) $row['location_id'],
                'mouza_bn' => (string) $row['loc_mouza_bn'],
                'mouza_en' => (string) ($row['loc_mouza_en'] ?? ''),
                'upazila_bn' => (string) ($row['loc_upazila_bn'] ?? ''),
                'upazila_en' => (string) ($row['loc_upazila_en'] ?? ''),
                'district_bn' => (string) ($row['loc_district_bn'] ?? ''),
                'district_en' => (string) ($row['loc_district_en'] ?? ''),
                'division_bn' => (string) ($row['loc_division_bn'] ?? ''),
                'latitude' => isset($row['loc_latitude']) && $row['loc_latitude'] !== null ? (float) $row['loc_latitude'] : null,
                'longitude' => isset($row['loc_longitude']) && $row['loc_longitude'] !== null ? (float) $row['loc_longitude'] : null,
            ];
        }

        // Joined plot details
        if (isset($row['plt_dag_no'])) {
            $res['plot'] = [
                'id' => (int) $row['plot_id'],
                'plot_code' => (string) ($row['plt_plot_code'] ?? ''),
                'dag_no' => (string) $row['plt_dag_no'],
                'dag_no_bn' => (string) ($row['plt_dag_no_bn'] ?? ''),
                'total_area_decimal' => isset($row['plt_area']) ? (float) $row['plt_area'] : null,
            ];
        }

        // Joined assigned_to user details
        if (isset($row['to_username'])) {
            $res['assigned_to'] = [
                'id' => (int) $row['assigned_to_user_id'],
                'username' => (string) $row['to_username'],
                'full_name_bn' => (string) ($row['to_full_name_bn'] ?? ''),
                'full_name_en' => (string) ($row['to_full_name_en'] ?? ''),
                'role' => (string) ($row['to_role'] ?? ''),
                'office_bn' => (string) ($row['to_office_bn'] ?? ''),
            ];
        }

        // Joined assigned_by user details
        if (isset($row['by_username'])) {
            $res['assigned_by'] = [
                'id' => (int) $row['assigned_by_user_id'],
                'username' => (string) $row['by_username'],
                'full_name_bn' => (string) ($row['by_full_name_bn'] ?? ''),
                'full_name_en' => (string) ($row['by_full_name_en'] ?? ''),
                'role' => (string) ($row['by_role'] ?? ''),
            ];
        }

        return $res;
    }

    private static function generateTaskCode(): string
    {
        for ($i = 0; $i < 10; $i++) {
            $code = 'TSK-' . gmdate('Ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 4));
            $exists = DB::selectOne('SELECT id FROM map_task_assignments WHERE task_code = ?', [$code]);
            if (!$exists) {
                return $code;
            }
        }
        return 'TSK-' . gmdate('Ymd') . '-' . bin2hex(random_bytes(4));
    }

    /**
     * POST /api/v1/map/assignments
     * Admin/AC Land creates mapping task and assigns to user.
     */
    public static function create(array $body, ?array $actor = null): array
    {
        self::migrate();
        $u = RoleMiddleware::authorize(self::CREATOR_ROLES, $actor);

        $title = trim((string) ($body['title'] ?? ''));
        if (mb_strlen($title) < 3) {
            self::fail('TITLE_REQUIRED', 'কাজের শিরোনাম (title) কমপক্ষে ৩ অক্ষরের হতে হবে।', 'Task title must be at least 3 characters.');
        }

        $taskType = strtoupper(trim((string) ($body['task_type'] ?? '')));
        if (!in_array($taskType, self::VALID_TASK_TYPES, true)) {
            $validTypesStr = implode(', ', self::VALID_TASK_TYPES);
            self::fail('INVALID_TASK_TYPE', "কাজের ধরন সঠিক নয়। অনুমোদিত: {$validTypesStr}", "Invalid task_type. Allowed: {$validTypesStr}");
        }

        $locationId = (int) ($body['location_id'] ?? 0);
        $loc = DB::selectOne('SELECT id FROM locations WHERE id = ?', [$locationId]);
        if (!$loc) {
            self::fail('LOCATION_NOT_FOUND', 'মৌজাটি পাওয়া যায়নি।', 'Location not found.', 404);
        }

        $assignedToUserId = (int) ($body['assigned_to_user_id'] ?? 0);
        $assignedUser = DB::selectOne('SELECT id, is_active FROM users WHERE id = ?', [$assignedToUserId]);
        if (!$assignedUser || (int) $assignedUser['is_active'] === 0) {
            self::fail('ASSIGNED_USER_INVALID', 'বরাদ্দকৃত কর্মকর্তা অ্যাকাউন্টটি সক্রিয় নেই।', 'Assigned user does not exist or is inactive.');
        }

        $plotId = !empty($body['plot_id']) ? (int) $body['plot_id'] : null;
        if ($plotId !== null) {
            $plot = DB::selectOne('SELECT id FROM plots WHERE id = ? AND location_id = ?', [$plotId, $locationId]);
            if (!$plot) {
                self::fail('PLOT_LOCATION_MISMATCH', 'প্লটটি এই মৌজার অন্তর্ভুক্ত নয়।', 'Plot does not belong to specified location.');
            }
        }

        $priority = strtoupper(trim((string) ($body['priority'] ?? 'NORMAL')));
        if (!in_array($priority, self::VALID_PRIORITIES, true)) {
            $priority = 'NORMAL';
        }

        $dueDate = !empty($body['due_date']) ? trim((string) $body['due_date']) : null;
        $notes = !empty($body['notes']) ? trim((string) $body['notes']) : null;

        $taskCode = self::generateTaskCode();
        $now = gmdate('c');

        $taskId = DB::insert(
            'INSERT INTO map_task_assignments (task_code, title, task_type, location_id, plot_id, assigned_by_user_id, assigned_to_user_id, priority, status, due_date, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $taskCode,
                $title,
                $taskType,
                $locationId,
                $plotId,
                (int) $u['id'],
                $assignedToUserId,
                $priority,
                'pending',
                $dueDate,
                $notes,
                $now,
                $now,
            ]
        );

        DatabaseSeeder::appendAuditEntry(
            $u['username'],
            $u['role'],
            'MAP_TASK_ASSIGNED',
            'map_task_assignment',
            (string) $taskId,
            [
                'task_code' => $taskCode,
                'task_type' => $taskType,
                'assigned_to_user_id' => $assignedToUserId,
                'location_id' => $locationId,
                'plot_id' => $plotId,
            ],
            $now
        );

        return self::getSingleTaskWithJoins($taskId);
    }

    /**
     * GET /api/v1/map/assignments
     * List all assignments with filtering.
     */
    public static function list(array $query, ?array $actor = null): array
    {
        self::migrate();
        $u = RoleMiddleware::authorize(self::OFFICER_ROLES, $actor);

        $where = ['1=1'];
        $bindings = [];

        if (!empty($query['location_id'])) {
            $where[] = 't.location_id = ?';
            $bindings[] = (int) $query['location_id'];
        }

        if (!empty($query['assigned_to_user_id'])) {
            $where[] = 't.assigned_to_user_id = ?';
            $bindings[] = (int) $query['assigned_to_user_id'];
        }

        if (!empty($query['status'])) {
            $where[] = 'LOWER(t.status) = ?';
            $bindings[] = strtolower(trim((string) $query['status']));
        }

        if (!empty($query['task_type'])) {
            $where[] = 'UPPER(t.task_type) = ?';
            $bindings[] = strtoupper(trim((string) $query['task_type']));
        }

        if (!empty($query['priority'])) {
            $where[] = 'UPPER(t.priority) = ?';
            $bindings[] = strtoupper(trim((string) $query['priority']));
        }

        $sql = 'SELECT t.*,
            l.mouza_bn AS loc_mouza_bn, l.mouza_en AS loc_mouza_en, l.upazila_bn AS loc_upazila_bn, l.upazila_en AS loc_upazila_en, l.district_bn AS loc_district_bn, l.district_en AS loc_district_en, l.division_bn AS loc_division_bn, l.latitude AS loc_latitude, l.longitude AS loc_longitude,
            p.plot_code AS plt_plot_code, p.dag_no AS plt_dag_no, p.dag_no_bn AS plt_dag_no_bn, p.total_area_decimal AS plt_area,
            tu.username AS to_username, tu.full_name_bn AS to_full_name_bn, tu.full_name_en AS to_full_name_en, tu.role AS to_role, tu.office_bn AS to_office_bn,
            bu.username AS by_username, bu.full_name_bn AS by_full_name_bn, bu.full_name_en AS by_full_name_en, bu.role AS by_role
            FROM map_task_assignments t
            JOIN locations l ON l.id = t.location_id
            LEFT JOIN plots p ON p.id = t.plot_id
            JOIN users tu ON tu.id = t.assigned_to_user_id
            JOIN users bu ON bu.id = t.assigned_by_user_id
            WHERE ' . implode(' AND ', $where) . '
            ORDER BY t.id DESC LIMIT 500';

        $rows = DB::select($sql, $bindings);
        $data = array_map(self::formatRow(...), $rows);

        return [
            'success' => true,
            'count' => count($data),
            'data' => $data,
        ];
    }

    /**
     * GET /api/v1/map/my-assignments
     * Personal tasks queue for authenticated user with map coordinates for navigation.
     */
    public static function myAssignments(array $query = [], ?array $actor = null): array
    {
        self::migrate();
        $u = RoleMiddleware::authorize([], $actor);

        $where = ['t.assigned_to_user_id = ?'];
        $bindings = [(int) $u['id']];

        if (!empty($query['status'])) {
            $where[] = 'LOWER(t.status) = ?';
            $bindings[] = strtolower(trim((string) $query['status']));
        }

        $sql = 'SELECT t.*,
            l.mouza_bn AS loc_mouza_bn, l.mouza_en AS loc_mouza_en, l.upazila_bn AS loc_upazila_bn, l.upazila_en AS loc_upazila_en, l.district_bn AS loc_district_bn, l.district_en AS loc_district_en, l.division_bn AS loc_division_bn, l.latitude AS loc_latitude, l.longitude AS loc_longitude,
            p.plot_code AS plt_plot_code, p.dag_no AS plt_dag_no, p.dag_no_bn AS plt_dag_no_bn, p.total_area_decimal AS plt_area,
            tu.username AS to_username, tu.full_name_bn AS to_full_name_bn, tu.full_name_en AS to_full_name_en, tu.role AS to_role, tu.office_bn AS to_office_bn,
            bu.username AS by_username, bu.full_name_bn AS by_full_name_bn, bu.full_name_en AS by_full_name_en, bu.role AS by_role
            FROM map_task_assignments t
            JOIN locations l ON l.id = t.location_id
            LEFT JOIN plots p ON p.id = t.plot_id
            JOIN users tu ON tu.id = t.assigned_to_user_id
            JOIN users bu ON bu.id = t.assigned_by_user_id
            WHERE ' . implode(' AND ', $where) . '
            ORDER BY t.id DESC LIMIT 500';

        $rows = DB::select($sql, $bindings);
        $data = array_map(self::formatRow(...), $rows);

        return [
            'success' => true,
            'count' => count($data),
            'data' => $data,
        ];
    }

    /**
     * PATCH /api/v1/map/assignments/{id}/status
     * Assigned officer (or admin / ac_land) updates task progress status.
     */
    public static function updateStatus(int $id, array $body, ?array $actor = null): array
    {
        self::migrate();
        $u = RoleMiddleware::authorize([], $actor);

        $existing = DB::selectOne('SELECT * FROM map_task_assignments WHERE id = ?', [$id]);
        if (!$existing) {
            self::fail('TASK_NOT_FOUND', 'বরাদ্দকৃত কাজটি পাওয়া যায়নি।', 'Task assignment not found.', 404);
        }

        $isAdminOrAcl = in_array($u['role'] ?? '', ['admin', 'system_admin', 'ac_land'], true);
        $isAssignee = ((int) $existing['assigned_to_user_id'] === (int) $u['id']);

        if (!$isAdminOrAcl && !$isAssignee) {
            self::fail('FORBIDDEN_TASK_ACCESS', 'অন্যের জন্য নির্ধারিত কাজের অবস্থা পরিবর্তনের অনুমতি নেই।', 'Forbidden: You can only update tasks assigned to you.', 403);
        }

        $newStatus = strtolower(trim((string) ($body['status'] ?? '')));
        if (!in_array($newStatus, self::VALID_STATUSES, true)) {
            $validStr = implode(', ', self::VALID_STATUSES);
            self::fail('INVALID_STATUS', "কাজের স্ট্যাটাস সঠিক নয়। অনুমোদিত: {$validStr}", "Invalid status. Allowed: {$validStr}");
        }

        $now = gmdate('c');
        $completionNote = array_key_exists('completion_note', $body)
            ? trim((string) $body['completion_note'])
            : $existing['completion_note'];

        $completedAt = ($newStatus === 'completed')
            ? ($existing['completed_at'] ?: $now)
            : null;

        DB::statement(
            'UPDATE map_task_assignments SET status = ?, completion_note = ?, completed_at = ?, updated_at = ? WHERE id = ?',
            [$newStatus, $completionNote, $completedAt, $now, $id]
        );

        DatabaseSeeder::appendAuditEntry(
            $u['username'],
            $u['role'],
            'MAP_TASK_STATUS_UPDATED',
            'map_task_assignment',
            (string) $id,
            [
                'task_code' => $existing['task_code'],
                'old_status' => $existing['status'],
                'new_status' => $newStatus,
                'completion_note' => $completionNote,
            ],
            $now
        );

        return self::getSingleTaskWithJoins($id);
    }

    private static function getSingleTaskWithJoins(int $id): array
    {
        $sql = 'SELECT t.*,
            l.mouza_bn AS loc_mouza_bn, l.mouza_en AS loc_mouza_en, l.upazila_bn AS loc_upazila_bn, l.upazila_en AS loc_upazila_en, l.district_bn AS loc_district_bn, l.district_en AS loc_district_en, l.division_bn AS loc_division_bn, l.latitude AS loc_latitude, l.longitude AS loc_longitude,
            p.plot_code AS plt_plot_code, p.dag_no AS plt_dag_no, p.dag_no_bn AS plt_dag_no_bn, p.total_area_decimal AS plt_area,
            tu.username AS to_username, tu.full_name_bn AS to_full_name_bn, tu.full_name_en AS to_full_name_en, tu.role AS to_role, tu.office_bn AS to_office_bn,
            bu.username AS by_username, bu.full_name_bn AS by_full_name_bn, bu.full_name_en AS by_full_name_en, bu.role AS by_role
            FROM map_task_assignments t
            JOIN locations l ON l.id = t.location_id
            LEFT JOIN plots p ON p.id = t.plot_id
            JOIN users tu ON tu.id = t.assigned_to_user_id
            JOIN users bu ON bu.id = t.assigned_by_user_id
            WHERE t.id = ?';

        $row = DB::selectOne($sql, [$id]);
        if (!$row) {
            self::fail('TASK_NOT_FOUND', 'বরাদ্দকৃত কাজটি পাওয়া যায়নি।', 'Task not found.', 404);
        }

        return [
            'success' => true,
            'data' => self::formatRow($row),
        ];
    }
}
