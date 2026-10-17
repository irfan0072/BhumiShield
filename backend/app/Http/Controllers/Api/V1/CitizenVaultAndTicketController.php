<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Middleware\RoleMiddleware;
use App\Services\JwtAuthService;
use App\Services\LookupService;
use App\Services\PublicRecordService;
use App\Support\DB;

/**
 * Citizen Document Vault (Trust Levels L0-L3) & SLA-Tracked Support Ticket Controller.
 */
final class CitizenVaultAndTicketController
{
    // -------------------------------------------------------------------------
    // CITIZEN DOCUMENTS VAULT (Section 8.1)
    // -------------------------------------------------------------------------

    public static function listPlotDocuments(string|int $plotCodeOrId, ?array $actor = null): array
    {
        $plot = LookupService::resolvePlot($plotCodeOrId);
        if (!$plot) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'PLOT_NOT_FOUND',
                'message_bn' => 'জমির প্লট বা দাগ নম্বরটি পাওয়া যায়নি।',
                'message_en' => 'Plot not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $plotId = (int) $plot['id'];
        $user = $actor ?? JwtAuthService::getAuthenticatedUser();

        // 1. Fetch official document templates
        $templates = DB::select('SELECT * FROM document_templates ORDER BY display_order ASC');

        // 2. Fetch existing uploaded/verified documents for this plot
        $existingDocs = DB::select('SELECT * FROM plot_documents WHERE plot_id = ? ORDER BY id DESC', [$plotId]);
        $docsByType = [];
        foreach ($existingDocs as $doc) {
            $t = (string) $doc['document_type'];
            if (!isset($docsByType[$t])) {
                $docsByType[$t] = $doc;
            }
        }

        // 3. Assemble unified checklist with L0-L3 trust levels
        $items = [];
        foreach ($templates as $tmpl) {
            $docType = (string) $tmpl['document_type'];
            if (isset($docsByType[$docType])) {
                $d = $docsByType[$docType];
                $items[] = [
                    'id' => (int) $d['id'],
                    'template_id' => (int) $tmpl['id'],
                    'document_type' => $docType,
                    'title_bn' => $d['title_bn'],
                    'title_en' => $d['title_en'],
                    'trust_level' => $d['trust_level'], // L1, L2, or L3
                    'status' => $d['status'],
                    'is_required' => (int) ($tmpl['is_mandatory'] ?? 1) === 1,
                    'file_path' => $d['file_path'],
                    'file_name' => $d['file_name'],
                    'file_size_bytes' => (int) $d['file_size_bytes'],
                    'file_hash' => $d['file_hash'],
                    'verified_by' => $d['verified_by'],
                    'verified_at' => $d['verified_at'],
                    'created_at' => $d['created_at'],
                    'ticket_eligible' => false,
                ];
            } else {
                // Missing document -> Level L0
                $items[] = [
                    'id' => null,
                    'template_id' => (int) $tmpl['id'],
                    'document_type' => $docType,
                    'title_bn' => $tmpl['title_bn'] ?? $docType,
                    'title_en' => $tmpl['title_en'] ?? $docType,
                    'trust_level' => 'L0', // MISSING
                    'status' => 'MISSING',
                    'is_required' => (int) ($tmpl['is_mandatory'] ?? 1) === 1,
                    'file_path' => null,
                    'file_name' => null,
                    'file_size_bytes' => 0,
                    'file_hash' => null,
                    'verified_by' => null,
                    'verified_at' => null,
                    'created_at' => null,
                    'ticket_eligible' => true,
                    'ticket_prefill' => [
                        'plot_id' => $plotId,
                        'plot_code' => $plot['plot_code'],
                        'document_type' => $docType,
                        'title_bn' => "অনুপস্থিত দলিল অনুরোধ: " . ($tmpl['title_bn'] ?? $docType) . " (দাগ নং {$plot['dag_no_bn']})",
                        'title_en' => "Missing Document Request: " . ($tmpl['title_en'] ?? $docType) . " (Plot {$plot['dag_no']})",
                        'category' => 'MISSING_DOCUMENT',
                        'priority' => ((int) ($tmpl['is_mandatory'] ?? 1) === 1) ? 'HIGH' : 'NORMAL',
                    ],
                ];
            }
        }

        $res = [
            'plot' => [
                'id' => $plotId,
                'plot_code' => $plot['plot_code'],
                'dag_no' => $plot['dag_no'],
                'dag_no_bn' => $plot['dag_no_bn'],
                'total_area_decimal' => (float) $plot['total_area_decimal'],
            ],
            'items' => $items,
            'total' => count($items),
            'verified_count' => count($docsByType),
            'missing_count' => count($items) - count($docsByType),
        ];

        return PublicRecordService::forViewer($res);
    }

    public static function uploadPlotDocument(string|int $plotCodeOrId, array $payload, ?array $actor = null): array
    {
        $user = RoleMiddleware::authorize(['citizen', 'service_point_operator', 'admin'], $actor);
        $plot = LookupService::resolvePlot($plotCodeOrId);
        if (!$plot) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'PLOT_NOT_FOUND',
                'message_bn' => 'জমির প্লট পাওয়া যায়নি।',
                'message_en' => 'Plot not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $docType = trim((string) ($payload['document_type'] ?? 'OTHER'));
        $titleBn = trim((string) ($payload['title_bn'] ?? 'নাগরিক কর্তৃক আপলোডকৃত দলিল'));
        $titleEn = trim((string) ($payload['title_en'] ?? 'Citizen Uploaded Document'));
        $fileName = trim((string) ($payload['file_name'] ?? 'document.pdf'));
        $fileSize = max(1024, (int) ($payload['file_size_bytes'] ?? 204800));
        $fileHash = trim((string) ($payload['file_hash'] ?? hash('sha256', $fileName . microtime(true))));
        $filePath = '/uploads/citizen/' . $fileHash . '.pdf';
        $now = gmdate('c');

        $docId = DB::insert(
            'INSERT INTO plot_documents (plot_id, document_type, title_bn, title_en, trust_level, status, file_path, file_name, file_size_bytes, file_hash, uploaded_by_nid, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                (int) $plot['id'],
                $docType,
                $titleBn,
                $titleEn,
                'L1', // Citizen-declared
                'UPLOADED',
                $filePath,
                $fileName,
                $fileSize,
                $fileHash,
                (string) ($user['nid'] ?? '9900001001'),
                $now,
                $now,
            ]
        );

        return [
            'document_id' => $docId,
            'plot_code' => $plot['plot_code'],
            'trust_level' => 'L1',
            'status' => 'UPLOADED',
            'message_bn' => 'দলিলটি সফলভাবে ভল্টে আপলোড করা হয়েছে। কর্মকর্তা যাচাইয়ের পর এটি L2/L3 মর্যাদা পাবে।',
            'message_en' => 'Document successfully uploaded to vault. It will achieve L2/L3 status once verified.',
        ];
    }

    // -------------------------------------------------------------------------
    // 2-TAP MISSING DOCUMENT TICKET & SLA TICKETS (Section 8.2)
    // -------------------------------------------------------------------------

    public static function createMissingDocTicket(string|int $plotCodeOrId, array $payload, ?array $actor = null): array
    {
        $user = RoleMiddleware::authorize(['citizen', 'service_point_operator', 'admin'], $actor);
        $plot = LookupService::resolvePlot($plotCodeOrId);
        if (!$plot) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'PLOT_NOT_FOUND',
                'message_bn' => 'জমির প্লট পাওয়া যায়নি।',
                'message_en' => 'Plot not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $cnt = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM tickets')['c'] ?? 0);
        $ticketCode = sprintf('TKT-2026-%06d', $cnt + 101);

        $docType = trim((string) ($payload['document_type'] ?? 'GENERAL'));
        $titleBn = trim((string) ($payload['title_bn'] ?? "অনুপস্থিত দলিল সংগ্রহ অনুরোধ (দাগ নং {$plot['dag_no_bn']})"));
        $titleEn = trim((string) ($payload['title_en'] ?? "Missing Document Retrieval (Plot {$plot['dag_no']})"));
        $descBn = trim((string) ($payload['description_bn'] ?? "দাগ নং {$plot['dag_no_bn']}-এর জন্য প্রয়োজনীয় {$docType} দলিলটি ডিজিটাল ভল্টে অনুপস্থিত। এটি রেকর্ড রুম হতে সংগ্রহ ও স্ক্যানের অনুরোধ করা হলো।"));
        $descEn = trim((string) ($payload['description_en'] ?? "Required document {$docType} for plot {$plot['dag_no']} is missing. Please retrieve from record room."));
        $priority = strtoupper(trim((string) ($payload['priority'] ?? 'HIGH')));

        // Fetch SLA policy for MISSING_DOCUMENT or default 72h (3 days)
        $sla = DB::selectOne("SELECT * FROM sla_policies WHERE category = 'MISSING_DOCUMENT'");
        $targetHours = $sla ? ((int) ($sla['resolution_target_days'] ?? 3) * 24) : 72;
        $now = gmdate('c');
        $slaResolutionDueAt = gmdate('c', time() + ($targetHours * 3600));
        $firstReplyHours = $sla ? ((int) ($sla['first_reply_target_days'] ?? 1) * 24) : 24;
        $slaFirstReplyDueAt = gmdate('c', time() + ($firstReplyHours * 3600));

        $ticketId = DB::insert(
            'INSERT INTO tickets (ticket_code, category, plot_id, document_type, title_bn, title_en, description_bn, complainant_nid, priority, status, sla_first_reply_due_at, sla_resolution_due_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $ticketCode,
                'MISSING_DOCUMENT',
                (int) $plot['id'],
                $docType,
                $titleBn,
                $titleEn,
                $descBn,
                (string) ($user['nid'] ?? '9900001001'),
                $priority,
                'NEW',
                $slaFirstReplyDueAt,
                $slaResolutionDueAt,
                $now,
                $now,
            ]
        );

        // Record initial event
        DB::insert(
            'INSERT INTO ticket_events (ticket_id, event_type, actor_username, details_json, created_at) VALUES (?, ?, ?, ?, ?)',
            [
                $ticketId,
                'TICKET_CREATED_2TAP',
                (string) ($user['username'] ?? 'citizen'),
                json_encode(['role' => (string) ($user['role'] ?? 'citizen'), 'notes_bn' => 'নাগরিক ভল্ট হতে ২-ট্যাপ স্বয়ংক্রিয় অনুপস্থিত দলিল টিকেট দাখিল।'], JSON_UNESCAPED_UNICODE),
                $now,
            ]
        );

        return [
            'ticket_id' => $ticketId,
            'ticket_code' => $ticketCode,
            'status' => 'NEW',
            'sla_target_hours' => $targetHours,
            'sla_target_at' => $slaResolutionDueAt,
            'message_bn' => "✔ অনুপস্থিত দলিলের আবেদন সফলভাবে দাখিল করা হয়েছে (টিকেট কোড: {$ticketCode})। ভূমি অফিসের সহকারী ৭২ ঘণ্টার মধ্যে এটি সংগ্রহ ও স্ক্যান করবেন।",
            'message_en' => "✔ Missing document ticket {$ticketCode} created with {$targetHours}h SLA tracking.",
        ];
    }

    public static function listTickets(array $filters = [], ?array $actor = null): array
    {
        $user = JwtAuthService::getAuthenticatedUser();
        $sql = 'SELECT t.*, p.plot_code, p.dag_no, p.dag_no_bn, l.mouza_bn, l.mouza_en FROM tickets t LEFT JOIN plots p ON p.id = t.plot_id LEFT JOIN locations l ON l.id = p.location_id WHERE 1=1';
        $params = [];

        if (!empty($filters['status'])) {
            $sql .= ' AND t.status = ?';
            $params[] = $filters['status'];
        }

        if (!empty($filters['category'])) {
            $sql .= ' AND t.category = ?';
            $params[] = $filters['category'];
        }

        $sql .= ' ORDER BY t.id DESC';
        $rows = DB::select($sql, $params);

        $items = array_map(static function (array $r): array {
            return PublicRecordService::forViewer($r);
        }, $rows);

        return ['items' => $items, 'total' => count($items)];
    }

    public static function getTicket(string|int $ticketCodeOrId, ?array $actor = null): array
    {
        $t = LookupService::resolveTicket($ticketCodeOrId);
        if (!$t) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'TICKET_NOT_FOUND',
                'message_bn' => 'টিকেটটি খুঁজে পাওয়া যায়নি।',
                'message_en' => 'Ticket not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $plot = $t['plot_id'] ? DB::selectOne('SELECT p.*, l.mouza_bn, l.mouza_en FROM plots p JOIN locations l ON l.id = p.location_id WHERE p.id = ?', [$t['plot_id']]) : null;
        $messages = DB::select('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY id ASC', [$t['id']]);
        $events = DB::select('SELECT * FROM ticket_events WHERE ticket_id = ? ORDER BY id ASC', [$t['id']]);

        $res = [
            'ticket' => $t,
            'plot' => $plot,
            'messages' => $messages,
            'events' => $events,
        ];

        return PublicRecordService::forViewer($res);
    }
}
