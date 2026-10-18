<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Middleware\RoleMiddleware;
use App\Services\JwtAuthService;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * F08: Field operations controller.
 *
 * Provides persistent storage and listing for:
 *   - field_reports: a signed possession / boundary / LD-tax report a
 *     Field Verification Officer files after visiting a plot.
 *   - sla_dispatches: an escalation notice a UNO Supervisor or AC Land
 *     issues against a case (e.g. overdue mutation review).
 *
 * All writes run inside DB::transaction() so that the row insert and the
 * matching audit_log entry commit together or roll back together.
 */
final class FieldOperationsController
{
    /** Roles authorized to file a new field report. */
    private const FIELD_REPORT_AUTHORS = ['field_verification_officer', 'ac_land', 'admin', 'system_admin'];

    /** Roles authorized to issue SLA escalations. */
    private const SLA_DISPATCH_AUTHORS = ['uno_supervisor', 'ac_land', 'admin', 'system_admin'];

    /** Roles allowed to view either table. */
    private const VIEW_ROLES = [
        'field_verification_officer',
        'ac_land',
        'uno_supervisor',
        'admin',
        'system_admin',
        'auditor',
    ];

    /**
     * POST /field-reports — file a new field inspection report.
     */
    public static function createFieldReport(array $payload, ?array $user = null): array
    {
        $actor = RoleMiddleware::authorize(self::FIELD_REPORT_AUTHORS, $user);

        $plotId = (int) ($payload['plot_id'] ?? 0);
        $plot = $plotId > 0 ? DB::selectOne('SELECT id, dag_no, location_id FROM plots WHERE id = ?', [$plotId]) : null;
        if (!$plot) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'PLOT_REQUIRED',
                'message_bn' => 'বৈধ দাগ নির্বাচন করুন।',
                'message_en' => 'A valid plot_id is required to file a field report.',
            ], JSON_UNESCAPED_UNICODE));
        }

        \App\Services\OfficeScopeService::requirePlot((int)$plot['id'], $actor);
        $possession = trim((string) ($payload['possession_status'] ?? ''));
        $boundary = trim((string) ($payload['boundary_status'] ?? ''));
        $tax = trim((string) ($payload['tax_status'] ?? ''));
        $remarks = trim((string) ($payload['remarks_bn'] ?? ($payload['remarks'] ?? '')));
        $lat = isset($payload['latitude']) && is_numeric($payload['latitude']) ? (float) $payload['latitude'] : null;
        $lng = isset($payload['longitude']) && is_numeric($payload['longitude']) ? (float) $payload['longitude'] : null;

        $validPossessions = ['VERIFIED', 'CONTESTED', 'UNOCCUPIED', 'POSSESSED_BY_OWNER', 'PARTIAL_DISPUTE', 'ENCROACHED'];
        $validBoundaries = ['MATCHED', 'DISPUTED', 'INTACT', 'ENCROACHED_NORTH', 'ENCROACHED'];
        $validTaxes = ['PAID', 'DUE', 'NOT_VERIFIED', 'PAID_UP_TO_2026', 'PARTIAL_DUE'];

        if (!in_array($possession, $validPossessions, true) || !in_array($boundary, $validBoundaries, true) || !in_array($tax, $validTaxes, true) || trim($remarks) === '') {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'FIELDS_REQUIRED',
                'message_bn' => 'দখল, সীমানা, ভূমি উন্নয়ন কর এবং মন্তব্য — সবগুলো আবশ্যক।',
                'message_en' => 'possession_status, boundary_status, tax_status and remarks_bn are all required.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $cnt = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM field_reports')['c'] ?? 0);
        $code = sprintf('FR-2026-%04d', $cnt + 101);
        $now = gmdate('c');

        $reportId = DB::transaction(static function () use (
            $code, $plot, $possession, $boundary, $tax, $remarks, $lat, $lng,
            $actor, $now
        ): int {
            $id = (int) DB::insert(
                'INSERT INTO field_reports (
                    report_code, plot_id, dag_no, possession_status, boundary_status, tax_status,
                    latitude, longitude, remarks_bn, signed_by_user_id, signed_by_username, signed_at, status, created_at
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $code,
                    (int) $plot['id'],
                    (string) $plot['dag_no'],
                    $possession,
                    $boundary,
                    $tax,
                    $lat,
                    $lng,
                    $remarks,
                    (int) $actor['id'],
                    (string) $actor['username'],
                    $now,
                    'SUBMITTED',
                    $now,
                ]
            );

            DatabaseSeeder::appendAuditEntry(
                (string) $actor['username'],
                (string) $actor['role'],
                'FIELD_REPORT_FILED',
                'field_report',
                $code,
                [
                    'plot_id' => (int) $plot['id'],
                    'dag_no' => (string) $plot['dag_no'],
                    'possession_status' => $possession,
                    'boundary_status' => $boundary,
                    'tax_status' => $tax,
                ],
                $now
            );
            return $id;
        });

        $row = DB::selectOne('SELECT * FROM field_reports WHERE id = ?', [$reportId]);

        return [
            'status' => 200,
            'field_report' => $row,
            'message_bn' => "ফিল্ড ইন্সপেকশন প্রতিবেদন {$code} সফলভাবে দাখিল ও স্বাক্ষরিত হয়েছে।",
            'message_en' => "Field inspection report {$code} submitted and signed.",
        ];
    }

    /**
     * GET /field-reports — list reports scoped to the caller.
     */
    public static function listFieldReports(array $query = [], ?array $user = null): array
    {
        $actor = RoleMiddleware::authorize(self::VIEW_ROLES, $user);

        $where = '';
        $params = [];
        // FVO sees their own reports; other institutional roles see reports within their assigned office jurisdiction
        if (in_array((string) $actor['role'], ['field_verification_officer'], true)) {
            $where = ' WHERE signed_by_user_id = ?';
            $params[] = (int) $actor['id'];
        }
        if (isset($query['plot_id']) && is_numeric($query['plot_id'])) {
            $where = ($where === '' ? ' WHERE' : ' AND') . ' plot_id = ?';
            $params[] = (int) $query['plot_id'];
        }

        $sql = 'SELECT fr.*, u.full_name_en AS signed_by_name_en, u.full_name_bn AS signed_by_name_bn
                FROM field_reports fr
                LEFT JOIN users u ON u.id = fr.signed_by_user_id'
            . $where
            . ' ORDER BY fr.id DESC LIMIT 200';
        $items = DB::select($sql, $params);

        if (!in_array((string) ($actor['role'] ?? ''), ['admin', 'system_admin', 'auditor', 'field_verification_officer'], true)) {
            $items = array_values(array_filter($items, static fn(array $it): bool => \App\Services\OfficeScopeService::canAccessPlot((int) $it['plot_id'], $actor)));
        }

        return [
            'status' => 200,
            'items' => $items,
            'total' => count($items),
        ];
    }

    /**
     * POST /sla-dispatches — issue an SLA escalation directive.
     */
    public static function createSlaDispatch(array $payload, ?array $user = null): array
    {
        $actor = RoleMiddleware::authorize(self::SLA_DISPATCH_AUTHORS, $user);

        $targetRole = trim((string) ($payload['target_role'] ?? ''));
        $caseRef = trim((string) ($payload['case_reference'] ?? ''));
        $priority = strtoupper(trim((string) ($payload['priority'] ?? 'NORMAL')));
        $dueAt = trim((string) ($payload['due_at'] ?? ''));
        $notes = trim((string) ($payload['notes_bn'] ?? ($payload['notes'] ?? '')));
        $targetUserId = isset($payload['target_user_id']) && is_numeric($payload['target_user_id'])
            ? (int) $payload['target_user_id']
            : null;
        $targetUsername = trim((string) ($payload['target_username'] ?? ''));

        $validRoles = [
            'field_verification_officer', 'land_office_assistant', 'sub_registrar',
            'settlement_records_officer', 'settlement_checker', 'bank_officer',
            'service_point_operator', 'support_agent', 'ac_land',
        ];
        if (!in_array($targetRole, $validRoles, true)) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_TARGET_ROLE',
                'message_bn' => 'অনুমোদিত লক্ষ্য পদবী নয়।',
                'message_en' => 'target_role is not an allowed escalation target.',
            ], JSON_UNESCAPED_UNICODE));
        }
        if (!in_array($priority, ['LOW', 'NORMAL', 'HIGH', 'URGENT'], true)) {
            $priority = 'NORMAL';
        }
        if ($notes === '') {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'NOTES_REQUIRED',
                'message_bn' => 'পাঠানো নোট আবশ্যক।',
                'message_en' => 'A non-empty notes_bn field is required.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // Resolve target username if a user id was provided.
        if ($targetUserId !== null && $targetUsername === '') {
            $tgt = DB::selectOne('SELECT username FROM users WHERE id = ?', [$targetUserId]);
            if ($tgt) {
                $targetUsername = (string) $tgt['username'];
            }
        }

        $cnt = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM sla_dispatches')['c'] ?? 0);
        $code = sprintf('SLA-2026-%04d', $cnt + 101);
        $now = gmdate('c');

        $dispatchId = DB::transaction(static function () use (
            $code, $caseRef, $targetRole, $targetUserId, $targetUsername, $priority, $dueAt, $notes, $actor, $now
        ): int {
            $id = (int) DB::insert(
                'INSERT INTO sla_dispatches (
                    dispatch_code, case_reference, target_role, target_user_id, target_username,
                    priority, due_at, notes_bn, issued_by_user_id, issued_by_username, status, created_at
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $code,
                    $caseRef,
                    $targetRole,
                    $targetUserId,
                    $targetUsername,
                    $priority,
                    $dueAt,
                    $notes,
                    (int) $actor['id'],
                    (string) $actor['username'],
                    'SENT',
                    $now,
                ]
            );
            DatabaseSeeder::appendAuditEntry(
                (string) $actor['username'],
                (string) $actor['role'],
                'SLA_DISPATCH_SENT',
                'sla_dispatch',
                $code,
                [
                    'target_role' => $targetRole,
                    'target_user_id' => $targetUserId,
                    'priority' => $priority,
                    'case_reference' => $caseRef,
                ],
                $now
            );
            return $id;
        });

        $row = DB::selectOne('SELECT * FROM sla_dispatches WHERE id = ?', [$dispatchId]);

        return [
            'status' => 200,
            'sla_dispatch' => $row,
            'message_bn' => "এসএলএ তাগিদপত্র {$code} লক্ষ্য পদবী {$targetRole} বরাবরে প্রেরণ করা হয়েছে।",
            'message_en' => "SLA escalation {$code} dispatched to role {$targetRole}.",
        ];
    }

    /**
     * GET /sla-dispatches — list dispatches scoped to the caller.
     */
    public static function listSlaDispatches(array $query = [], ?array $user = null): array
    {
        $actor = RoleMiddleware::authorize(self::VIEW_ROLES, $user);

        $where = '';
        $params = [];
        if (in_array((string) $actor['role'], ['uno_supervisor'], true)) {
            $where = ' WHERE issued_by_user_id = ?';
            $params[] = (int) $actor['id'];
        }
        if (isset($query['status']) && is_string($query['status'])) {
            $where = ($where === '' ? ' WHERE' : ' AND') . ' status = ?';
            $params[] = (string) $query['status'];
        }
        $sql = 'SELECT sd.*, u.full_name_en AS issued_by_name_en, u.full_name_bn AS issued_by_name_bn
                FROM sla_dispatches sd
                LEFT JOIN users u ON u.id = sd.issued_by_user_id'
            . $where
            . ' ORDER BY sd.id DESC LIMIT 200';
        $items = DB::select($sql, $params);

        return [
            'status' => 200,
            'items' => $items,
            'total' => count($items),
        ];
    }
}
