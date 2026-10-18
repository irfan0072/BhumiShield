<?php
declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Middleware\RoleMiddleware;
use App\Services\LedgerService;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

final class SupportWorkflowController
{
    private static function fail(int $status, string $code, string $en): never
    {
        throw new \RuntimeException(json_encode([
            'status' => $status,
            'code' => $code,
            'message_bn' => 'অনুরোধটি যাচাই করুন অথবা সহায়তা নিন।',
            'message_en' => $en,
        ], JSON_UNESCAPED_UNICODE));
    }

    public static function create(array $body): array
    {
        $u = RoleMiddleware::authorize([]);
        $title = trim((string)($body['title'] ?? ''));
        $text = trim((string)($body['message'] ?? ''));
        if (strlen($title) < 3 || strlen($text) < 10 || strlen($text) > 10000) {
            self::fail(422, 'REQUEST_DETAILS_REQUIRED', 'Enter a subject and at least 10 characters describing the help you need.');
        }

        $category = strtoupper(trim((string)($body['category'] ?? 'GENERAL')));
        $validCategories = ['GENERAL', 'LAND_CLAIM', 'MUTATION', 'RECORD_CORRECTION', 'INHERITANCE', 'TAX_HOLDING', 'CERTIFIED_COPY', 'HEARING_NOTICE', 'APPEAL', 'ACQUISITION', 'DISPUTE_INJUNCTION'];
        if (!in_array($category, $validCategories, true)) {
            $category = 'GENERAL';
        }

        $assignedOfficeId = isset($body['assigned_office_id']) ? (int)$body['assigned_office_id'] : null;

        return DB::transaction(function () use ($u, $title, $text, $category, $assignedOfficeId) {
            $now = gmdate('c');
            $prefix = ($category === 'LAND_CLAIM') ? 'CLM' : 'HELP';
            $code = $prefix . '-' . gmdate('Y') . '-' . strtoupper(bin2hex(random_bytes(4)));

            $id = DB::insert(
                'INSERT INTO tickets(ticket_code, category, title_bn, title_en, description_bn, complainant_nid, requester_user_id, assigned_office_id, priority, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                [
                    $code,
                    $category,
                    $title,
                    $title,
                    $text,
                    $u['nid'] ?? '',
                    (int)$u['id'],
                    $assignedOfficeId,
                    'NORMAL',
                    'NEW',
                    $now,
                    $now,
                ]
            );

            DB::insert(
                'INSERT INTO ticket_messages(ticket_id, sender_username, sender_role, is_internal_note, message_bn, message_en, created_at) VALUES(?,?,?,0,?,?,?)',
                [$id, $u['username'], $u['role'], $text, $text, $now]
            );

            LedgerService::recordAuditEntry(
                $u['username'],
                $u['role'],
                'SUPPORT_REQUEST_CREATED',
                'ticket',
                (string)$id,
                ['code' => $code, 'category' => $category, 'assigned_office_id' => $assignedOfficeId]
            );

            return CitizenVaultAndTicketController::getTicket($id, $u);
        });
    }

    public static function reply(string $code, array $body): array
    {
        $u = RoleMiddleware::authorize([]);
        $res = CitizenVaultAndTicketController::getTicket($code, $u);
        $ticket = $res['ticket'];
        $text = trim((string)($body['message'] ?? ''));
        $staff = in_array($u['role'], ['support_agent', 'admin', 'system_admin', 'ac_land', 'land_office_assistant'], true);
        if ($u['role'] === 'auditor') {
            self::fail(403, 'READ_ONLY', 'Auditors can read requests but cannot change them.');
        }

        if (strlen($text) < 2 || strlen($text) > 10000) {
            self::fail(422, 'MESSAGE_REQUIRED', 'Enter a message between 2 and 10,000 characters.');
        }

        $status = $staff ? strtoupper((string)($body['status'] ?? 'IN_PROGRESS')) : 'IN_PROGRESS';
        if (!in_array($status, ['IN_PROGRESS', 'WAITING_CITIZEN', 'RESOLVED'], true)) {
            self::fail(422, 'INVALID_STATUS', 'Choose a valid request status.');
        }
        $internal = $staff && !empty($body['internal_note']);

        return DB::transaction(function () use ($u, $ticket, $text, $staff, $status, $internal) {
            $now = gmdate('c');
            DB::insert(
                'INSERT INTO ticket_messages(ticket_id, sender_username, sender_role, is_internal_note, message_bn, message_en, created_at) VALUES(?,?,?,?,?,?,?)',
                [$ticket['id'], $u['username'], $u['role'], $internal ? 1 : 0, $text, $text, $now]
            );

            if (!$internal) {
                DB::statement(
                    'UPDATE tickets SET status=?, updated_at=?, first_replied_at=COALESCE(first_replied_at,?), resolved_at=? WHERE id=?',
                    [$status, $now, $staff ? $now : null, $status === 'RESOLVED' ? $now : null, $ticket['id']]
                );
            }

            DB::insert(
                'INSERT INTO ticket_events(ticket_id, event_type, actor_username, details_json, created_at) VALUES(?,?,?,?,?)',
                [$ticket['id'], $internal ? 'INTERNAL_NOTE' : 'REPLY', $u['username'], json_encode(['status' => $status]), $now]
            );

            LedgerService::recordAuditEntry(
                $u['username'],
                $u['role'],
                $internal ? 'TICKET_NOTE_ADDED' : 'TICKET_REPLIED',
                'ticket',
                (string)$ticket['id'],
                ['status' => $status]
            );

            return CitizenVaultAndTicketController::getTicket((int)$ticket['id'], $u);
        });
    }

    public static function refer(string $code, array $body): array
    {
        $u = RoleMiddleware::authorize(['support_agent', 'admin', 'system_admin']);
        $res = CitizenVaultAndTicketController::getTicket($code, $u);
        $ticket = $res['ticket'];
        $officeId = (int)($body['office_id'] ?? 0);
        $office = DB::selectOne('SELECT * FROM offices WHERE id = ?', [$officeId]);
        if (!$office) {
            self::fail(404, 'OFFICE_NOT_FOUND', 'Target office was not found.');
        }

        $reason = trim((string)($body['reason_bn'] ?? 'অধিক্ষেত্র অনুযায়ী সংশ্লিষ্ট অফিসে রেফার করা হলো।'));

        return DB::transaction(function () use ($u, $ticket, $office, $reason) {
            $now = gmdate('c');
            DB::statement(
                'UPDATE tickets SET assigned_office_id = ?, status = "IN_PROGRESS", updated_at = ? WHERE id = ?',
                [$office['id'], $now, $ticket['id']]
            );

            DB::insert(
                'INSERT INTO ticket_messages(ticket_id, sender_username, sender_role, is_internal_note, message_bn, message_en, created_at) VALUES(?,?,?,1,?,?,?)',
                [
                    $ticket['id'],
                    $u['username'],
                    $u['role'],
                    "টিকেটটি {$office['name_bn']} দপ্তরে রেফার করা হয়েছে। কারণ: {$reason}",
                    "Ticket referred to {$office['name_en']}. Reason: {$reason}",
                    $now,
                ]
            );

            DB::insert(
                'INSERT INTO ticket_events(ticket_id, event_type, actor_username, details_json, created_at) VALUES(?,?,?,?,?)',
                [$ticket['id'], 'REFERRED_TO_OFFICE', $u['username'], json_encode(['office_id' => $office['id'], 'office_name' => $office['name_bn']]), $now]
            );

            LedgerService::recordAuditEntry(
                $u['username'],
                $u['role'],
                'TICKET_REFERRED',
                'ticket',
                (string)$ticket['id'],
                ['target_office_id' => $office['id']]
            );

            return CitizenVaultAndTicketController::getTicket((int)$ticket['id'], $u);
        });
    }
}
