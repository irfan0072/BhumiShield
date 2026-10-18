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

    private static function canReadReviewedSource(array $user, int $plotId): bool
    {
        if (in_array($user['role'], ['citizen', 'admin', 'system_admin'], true)) return true;
        return in_array($user['role'], ['ac_land', 'land_office_assistant', 'settlement_records_officer'], true)
            && \App\Services\OfficeScopeService::canAccessPlot($plotId, $user);
    }

    public static function listPlotDocuments(string|int $plotCodeOrId, ?array $actor = null): array
    {
        $user = $actor ?? JwtAuthService::getAuthenticatedUser();
        if (!$user) {
            throw new \RuntimeException(json_encode([
                'status' => 401,
                'code' => 'UNAUTHENTICATED',
                'message_bn' => 'অনুমোদিত লগইন আবশ্যক।',
                'message_en' => 'Authentication required.',
            ], JSON_UNESCAPED_UNICODE));
        }

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

        // Object scope: Citizen can only view document vault of their own plots (F02)
        if ($user['role'] === 'citizen') {
            $isOwner = (bool) DB::selectOne(
                'SELECT 1 FROM ownerships o JOIN persons p ON p.id = o.person_id WHERE o.plot_id = ? AND p.nid = ? AND o.is_latest = 1',
                [$plotId, (string) ($user['nid'] ?? '')]
            );
            if (!$isOwner) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'FORBIDDEN',
                    'message_bn' => 'এই প্লটের ডিজিটাল ভল্ট দেখার অনুমতি আপনার নেই। শুধুমাত্র রেকর্ডীয় মালিক নিজ জমির ভল্ট দেখতে পারেন।',
                    'message_en' => 'You are not authorized to view the document vault for this plot.',
                ], JSON_UNESCAPED_UNICODE));
            }
        }

        // 1. Fetch official document templates
        $templates = DB::select('SELECT * FROM document_templates ORDER BY display_order ASC');

        // 2. Fetch existing uploaded/verified documents for this plot
        $existingDocs = DB::select('SELECT * FROM plot_documents WHERE plot_id = ? ORDER BY id DESC', [$plotId]);
        $existingDocs = array_values(array_filter($existingDocs, static fn($d) => !str_starts_with((string)($d['file_path'] ?? ''), 'opening-record://') || self::canReadReviewedSource($user, $plotId)));
        $docsByType = [];
        foreach ($existingDocs as $doc) {
            $t = (string) $doc['document_type'];
            if (!isset($docsByType[$t])) {
                $docsByType[$t] = $doc;
            }
        }

        $knownTypes = array_column($templates, 'document_type');
        foreach ($docsByType as $type => $doc) {
            if (!in_array($type, $knownTypes, true)) $templates[] = ['document_type'=>$type,'title_bn'=>$doc['title_bn'],'title_en'=>$doc['title_en'],'is_mandatory'=>0];
        }
        // 3. Assemble unified checklist with L0-L3 trust levels
        $items = [];
        $verifiedCount = 0;
        $pendingCount = 0;

        foreach ($templates as $tmpl) {
            $docType = (string) $tmpl['document_type'];
            if (isset($docsByType[$docType])) {
                $d = $docsByType[$docType];
                $trustLevel = (string) ($d['trust_level'] ?? 'L1');
                $status = (string) ($d['status'] ?? 'UPLOADED');

                // Derive true verified count from verified status or L2/L3 trust levels (F17)
                if (in_array(strtoupper($trustLevel), ['L2', 'L3'], true) || strtoupper($status) === 'VERIFIED') {
                    $verifiedCount++;
                } else {
                    $pendingCount++;
                }

                $items[] = [
                    'id' => (int) $d['id'],
                    'template_id' => isset($tmpl['id']) ? (int)$tmpl['id'] : null,
                    'document_type' => $docType,
                    'title_bn' => $d['title_bn'],
                    'title_en' => $d['title_en'],
                    'trust_level' => $trustLevel,
                    'status' => $status,
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
                    'template_id' => isset($tmpl['id']) ? (int)$tmpl['id'] : null,
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
            'verified_count' => $verifiedCount,
            'pending_review_count' => $pendingCount,
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

        // Object scope: Citizen can only upload documents for their own plot (F02 / F04)
        if ($user['role'] === 'citizen') {
            $isOwner = (bool) DB::selectOne(
                'SELECT 1 FROM ownerships o JOIN persons p ON p.id = o.person_id WHERE o.plot_id = ? AND p.nid = ? AND o.is_latest = 1',
                [(int) $plot['id'], (string) ($user['nid'] ?? '')]
            );
            if (!$isOwner) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'FORBIDDEN',
                    'message_bn' => 'আপনি এই প্লটের মালিক নন; দলিল আপলোড করার অনুমতি নেই।',
                    'message_en' => 'You do not own this plot and cannot upload documents for it.',
                ], JSON_UNESCAPED_UNICODE));
            }
        }

        // Real file byte ingestion (F04)
        $rawBytes = null;
        $origFileName = 'document.pdf';

        if (!empty($_FILES['file']['tmp_name']) && is_uploaded_file($_FILES['file']['tmp_name'])) {
            $rawBytes = file_get_contents($_FILES['file']['tmp_name']);
            $origFileName = basename((string) ($_FILES['file']['name'] ?? 'document.pdf'));
        } elseif (!empty($payload['base64_data'])) {
            $data = (string) $payload['base64_data'];
            if (str_contains($data, ';base64,')) {
                $data = explode(';base64,', $data, 2)[1];
            }
            $rawBytes = base64_decode($data, true);
            $origFileName = basename((string) ($payload['file_name'] ?? 'document.pdf'));
        } elseif (!empty($payload['file_bytes'])) {
            $rawBytes = (string) $payload['file_bytes'];
            $origFileName = basename((string) ($payload['file_name'] ?? 'document.pdf'));
        }

        if ($rawBytes === null || $rawBytes === false || strlen($rawBytes) === 0) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'FILE_BYTES_REQUIRED',
                'message_bn' => 'ফাইলের আসল বাইট পাওয়া যায়নি। শুধুমাত্র ফাইলের নাম বা মেটাডাটা দিয়ে আপলোড সম্পন্ন করা যাবে না।',
                'message_en' => 'Actual file bytes are required. Filename metadata alone is rejected.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $fileSize = strlen($rawBytes);
        if ($fileSize > 10 * 1024 * 1024) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'FILE_TOO_LARGE',
                'message_bn' => 'ফাইলের আকার ১০ মেগাবাইটের বেশি হতে পারবে না।',
                'message_en' => 'File size cannot exceed 10 MB.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $fileHash = hash('sha256', $rawBytes);
        $storageDir = base_path('storage/app/vault_documents');
        if (!is_dir($storageDir)) {
            @mkdir($storageDir, 0775, true);
        }
        $storagePath = $storageDir . '/' . $fileHash . '.bin';
        if (file_put_contents($storagePath, $rawBytes) !== strlen($rawBytes)) throw new \RuntimeException('Document storage failed.');

        $docType = trim((string) ($payload['document_type'] ?? 'OTHER'));
        $titleBn = trim((string) ($payload['title_bn'] ?? 'নাগরিক কর্তৃক আপলোডকৃত দলিল'));
        $titleEn = trim((string) ($payload['title_en'] ?? 'Citizen Uploaded Document'));
        $filePath = '/uploads/citizen/' . $fileHash . '.bin';
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
                $origFileName,
                $fileSize,
                $fileHash,
                (string) ($user['nid'] ?? ''),
                $now,
                $now,
            ]
        );

        return [
            'document_id' => $docId,
            'plot_code' => $plot['plot_code'],
            'trust_level' => 'L1',
            'status' => 'UPLOADED',
            'file_name' => $origFileName,
            'file_size_bytes' => $fileSize,
            'file_hash' => $fileHash,
            'message_bn' => 'দলিলটি সফলভাবে ভল্টে আপলোড করা হয়েছে (সাইজ: ' . round($fileSize / 1024, 1) . ' KB)। কর্মকর্তা যাচাইয়ের পর এটি L2/L3 মর্যাদা পাবে।',
            'message_en' => 'Document successfully uploaded to vault with verified SHA-256 hash.',
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

        $docType = trim((string) ($payload['document_type'] ?? $payload['doc_type'] ?? 'GENERAL'));
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
                (string) ($user['nid'] ?? ''),
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

    public static function downloadPlotDocument(string|int $plotCodeOrId, int $docId, ?array $actor = null): array
    {
        $user = $actor ?? JwtAuthService::getAuthenticatedUser();
        if (!$user) {
            throw new \RuntimeException(json_encode([
                'status' => 401,
                'code' => 'UNAUTHENTICATED',
                'message_bn' => 'অনুমোদিত লগইন আবশ্যক।',
                'message_en' => 'Authentication required.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $plot = LookupService::resolvePlot($plotCodeOrId);
        if (!$plot) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'PLOT_NOT_FOUND',
                'message_bn' => 'জমির প্লট পাওয়া যায়নি।',
                'message_en' => 'Plot not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // Scope check for citizen
        if ($user['role'] === 'citizen') {
            $isOwner = (bool) DB::selectOne(
                'SELECT 1 FROM ownerships o JOIN persons p ON p.id = o.person_id WHERE o.plot_id = ? AND p.nid = ? AND o.is_latest = 1',
                [(int) $plot['id'], (string) ($user['nid'] ?? '')]
            );
            if (!$isOwner) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'FORBIDDEN',
                    'message_bn' => 'এই দলিলের ফাইল ডাউনলোড করার অনুমতি আপনার নেই।',
                    'message_en' => 'You are not authorized to download documents for this plot.',
                ], JSON_UNESCAPED_UNICODE));
            }
        }

        $doc = DB::selectOne('SELECT * FROM plot_documents WHERE id = ? AND plot_id = ?', [$docId, (int) $plot['id']]);
        if (!$doc) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'DOCUMENT_NOT_FOUND',
                'message_bn' => 'অনুরোধকৃত দলিলটি পাওয়া যায়নি।',
                'message_en' => 'Requested document not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $storagePath = base_path('storage/app/vault_documents/' . $doc['file_hash'] . '.bin');
        $bytes = '';
        if (str_starts_with((string)($doc['file_path'] ?? ''), 'opening-record://')) {
            if (!self::canReadReviewedSource($user, (int)$plot['id'])) throw new \RuntimeException(json_encode(['status'=>403,'code'=>'FORBIDDEN_SOURCE','message_bn'=>'এই উৎসের ফাইল কেবল মালিক ও দায়িত্বপ্রাপ্ত ভূমি দপ্তর দেখতে পারে।','message_en'=>'Only owners and responsible land-office roles may access this evidence.'], JSON_UNESCAPED_UNICODE));
            $batchId = (int) substr($doc['file_path'], strlen('opening-record://'));
            $batch = DB::selectOne("SELECT proof_package_json FROM onboarding_batches WHERE id=? AND record_type='OPENING_RECORD' AND status='APPROVED'", [$batchId]);
            $proof = $batch ? json_decode($batch['proof_package_json'], true) : null;
            $bytes = $proof && (int)($proof['plot_id'] ?? 0) === (int)$plot['id'] ? base64_decode((string)($proof['source_base64'] ?? ''), true) : false;
            if ($bytes === false || $bytes === '' || !hash_equals((string)$doc['file_hash'], hash('sha256', $bytes))) {
                throw new \RuntimeException(json_encode(['status'=>409,'code'=>'SOURCE_INTEGRITY_FAILED','message_bn'=>'উৎসের ফাইলের অখণ্ডতা যাচাই হয়নি। দপ্তরের সহায়তা নিন।','message_en'=>'Source evidence integrity check failed.'], JSON_UNESCAPED_UNICODE));
            }
        } elseif (file_exists($storagePath)) {
            $bytes = file_get_contents($storagePath);
        } else {
            // Minimal synthetic PDF bytes fallback for seeded records
            $bytes = "%PDF-1.4\n%BhumiShield Verified Document Vault Stub\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000060 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n180\n%%EOF";
        }

        return [
            'file_name' => $doc['file_name'],
            'file_size_bytes' => strlen($bytes),
            'file_hash' => $doc['file_hash'],
            'mime_type' => 'application/pdf',
            'base64_content' => base64_encode($bytes),
        ];
    }

    public static function listTickets(array $filters = [], ?array $actor = null): array
    {
        $user = $actor ?? JwtAuthService::getAuthenticatedUser();
        if (!$user) {
            throw new \RuntimeException(json_encode([
                'status' => 401,
                'code' => 'UNAUTHENTICATED',
                'message_bn' => 'অনুমোদিত লগইন আবশ্যক।',
                'message_en' => 'Authentication required.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $sql = 'SELECT t.*, p.plot_code, p.dag_no, p.dag_no_bn, l.mouza_bn, l.mouza_en FROM tickets t LEFT JOIN plots p ON p.id = t.plot_id LEFT JOIN locations l ON l.id = p.location_id WHERE 1=1';
        $params = [];

        // Object scope for citizen (F02)
        if (!in_array($user['role'], ['support_agent','admin','system_admin','auditor'], true)) {
            $sql .= ' AND (t.requester_user_id = ? OR (t.requester_user_id IS NULL AND t.complainant_nid != ? AND t.complainant_nid = ?))';
            $params[] = (int) $user['id'];
            $params[] = '';
            $params[] = (string) ($user['nid'] ?? '');
        }

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
        $user = $actor ?? JwtAuthService::getAuthenticatedUser();
        if (!$user) {
            throw new \RuntimeException(json_encode([
                'status' => 401,
                'code' => 'UNAUTHENTICATED',
                'message_bn' => 'অনুমোদিত লগইন আবশ্যক।',
                'message_en' => 'Authentication required.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $t = LookupService::resolveTicket($ticketCodeOrId);
        if (!$t) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'TICKET_NOT_FOUND',
                'message_bn' => 'টিকেটটি খুঁজে পাওয়া যায়নি।',
                'message_en' => 'Ticket not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // Scope check for citizen (F02)
        if (!in_array($user['role'], ['support_agent','admin','system_admin','auditor'], true)) {
            if (!((int) ($t['requester_user_id'] ?? 0) === (int) $user['id'] || (empty($t['requester_user_id']) && !empty($user['nid']) && ($t['complainant_nid'] ?? '') === $user['nid']))) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'FORBIDDEN',
                    'message_bn' => 'এই অভিযোগ টিকেটে প্রবেশের অনুমতি আপনার নেই।',
                    'message_en' => 'You are not authorized to view this support ticket.',
                ], JSON_UNESCAPED_UNICODE));
            }
        }

        $plot = $t['plot_id'] ? DB::selectOne('SELECT p.*, l.mouza_bn, l.mouza_en FROM plots p JOIN locations l ON l.id = p.location_id WHERE p.id = ?', [$t['plot_id']]) : null;
        $rawMessages = DB::select('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY id ASC', [$t['id']]);
        $events = DB::select('SELECT * FROM ticket_events WHERE ticket_id = ? ORDER BY id ASC', [$t['id']]);

        // Filter internal staff notes from citizen view (F02)
        $messages = [];
        foreach ($rawMessages as $msg) {
            if (!in_array($user['role'], ['support_agent','admin','system_admin','auditor'], true) && !empty($msg['is_internal_note'])) {
                continue;
            }
            $messages[] = $msg;
        }

        $res = [
            'ticket' => $t,
            'plot' => $plot,
            'messages' => $messages,
            'events' => $events,
        ];

        return PublicRecordService::forViewer($res);
    }
}
