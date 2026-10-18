<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Middleware\RoleMiddleware;
use App\Services\JwtAuthService;
use App\Services\PublicRecordService;
use App\Support\DB;

/**
 * Tier C Controller: Maker-Checker Staging Data Onboarding & Appellate Review Mirror.
 * Implements Specification Sections 7, 8.7, and 8.8.
 */
final class OnboardingAndAppealsController
{
    // -------------------------------------------------------------------------
    // 1. MAKER-CHECKER STAGING ONBOARDING (Section 8.7)
    // -------------------------------------------------------------------------

    public static function listBatches(array $query = [], ?array $actor = null): array
    {
        $user = $actor ?? RoleMiddleware::authorize([
            'registry_data_officer',
            'land_office_assistant',
            'settlement_records_officer',
            'settlement_checker',
            'sub_registrar',
            'ac_land',
            'admin',
            'system_admin',
            'auditor',
        ], $actor);

        $sql = 'SELECT b.*,
                       um.full_name_bn AS maker_name_bn, um.role AS maker_role,
                       uc.full_name_bn AS checker_name_bn, uc.role AS checker_role,
                       (SELECT COUNT(*) FROM onboarding_items oi WHERE oi.batch_id = b.id) AS item_count
                FROM onboarding_batches b
                JOIN users um ON um.id = b.maker_user_id
                LEFT JOIN users uc ON uc.id = b.checker_user_id WHERE b.record_type <> \'OPENING_RECORD\'';
        $params = [];

        if (!empty($query['status'])) {
            $sql .= ' AND b.status = ?';
            $params[] = $query['status'];
        }

        $sql .= ' ORDER BY b.id DESC';
        $rows = DB::select($sql, $params);

        // Strict jurisdiction filtering: only return batches within officer's competent office/jurisdiction
        $accessible = array_values(array_filter($rows, static fn(array $r): bool => \App\Services\OfficeScopeService::canAccessBatch($r, $user)));

        return [
            'items' => $accessible,
            'total' => count($accessible),
        ];
    }

    public static function getBatch(string|int $idOrBatchNo, ?array $actor = null): array
    {
        $user = $actor ?? RoleMiddleware::authorize([
            'registry_data_officer',
            'land_office_assistant',
            'settlement_records_officer',
            'settlement_checker',
            'sub_registrar',
            'ac_land',
            'admin',
            'system_admin',
            'auditor',
        ], $actor);

        $batch = null;
        if (is_numeric($idOrBatchNo)) {
            $batch = DB::selectOne(
                'SELECT b.*,
                        um.full_name_bn AS maker_name_bn, um.role AS maker_role,
                        uc.full_name_bn AS checker_name_bn, uc.role AS checker_role
                 FROM onboarding_batches b
                 JOIN users um ON um.id = b.maker_user_id
                 LEFT JOIN users uc ON uc.id = b.checker_user_id
                 WHERE b.id = ?',
                [(int) $idOrBatchNo]
            );
        }
        if (!$batch) {
            $batch = DB::selectOne(
                'SELECT b.*,
                        um.full_name_bn AS maker_name_bn, um.role AS maker_role,
                        uc.full_name_bn AS checker_name_bn, uc.role AS checker_role
                 FROM onboarding_batches b
                 JOIN users um ON um.id = b.maker_user_id
                 LEFT JOIN users uc ON uc.id = b.checker_user_id
                 WHERE b.batch_no = ?',
                [(string) $idOrBatchNo]
            );
        }

        if (!$batch) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'BATCH_NOT_FOUND',
                'message_bn' => 'অনবোর্ডিং ব্যাচটি খুঁজে পাওয়া যায়নি।',
                'message_en' => 'Onboarding batch not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        if ($batch['record_type'] === 'OPENING_RECORD') throw new \RuntimeException(json_encode(['status'=>403,'code'=>'DEDICATED_RECORD_REVIEW_REQUIRED','message_en'=>'Use the scoped opening-record workspace to review this document.','message_bn'=>'প্রারম্ভিক রেকর্ড কর্মক্ষেত্রে নথি পর্যালোচনা করুন।'],JSON_UNESCAPED_UNICODE));

        // Enforce strict office and jurisdiction scope check (N05)
        \App\Services\OfficeScopeService::requireBatch($batch, $user);

        $items = DB::select('SELECT * FROM onboarding_items WHERE batch_id = ? ORDER BY id ASC', [(int) $batch['id']]);
        $decodedItems = array_map(static function (array $it): array {
            $it['payload'] = json_decode((string) $it['item_payload_json'], true) ?: [];
            return $it;
        }, $items);

        $batch['proof_package'] = json_decode((string) ($batch['proof_package_json'] ?? '{}'), true) ?: [];

        return [
            'batch' => $batch,
            'items' => $decodedItems,
            'total_items' => count($decodedItems),
        ];
    }

    public static function createBatch(array $payload, ?array $actor = null): array
    {
        $maker = RoleMiddleware::authorize([
            'registry_data_officer',
            'land_office_assistant',
            'settlement_records_officer',
            'admin',
            'system_admin',
        ], $actor);

        $recordType = strtoupper(trim((string) ($payload['record_type'] ?? 'DEED_DRAFT')));
        $rawItems = (array) ($payload['items'] ?? []);

        if (empty($rawItems)) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'EMPTY_BATCH',
                'message_bn' => 'ব্যাচে ন্যূনতম ১টি রেকর্ড প্রদান করা আবশ্যক।',
                'message_en' => 'Batch must contain at least one item.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $count = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM onboarding_batches')['c'] ?? 0);
        $batchNo = sprintf('ONB-2026-%04d', $count + 1);
        $now = gmdate('c');

        // Calculate SHA-256 batch hash over canonical item payloads
        $canonicalStrings = [];
        $validatedItems = [];

        foreach ($rawItems as $idx => $it) {
            $itArr = is_array($it) ? $it : ['raw' => (string) $it];
            $valid = true;
            $validationErrors = [];

            // Validation rule: NID format if present
            if (!empty($itArr['nid']) && strlen(trim((string) $itArr['nid'])) < 10) {
                $valid = false;
                $validationErrors[] = 'NID must be at least 10 digits';
            }

            // Validation rule: Area must be positive
            if (isset($itArr['area_decimal']) && (float) $itArr['area_decimal'] <= 0) {
                $valid = false;
                $validationErrors[] = 'Area decimal must be positive';
            }

            $itArr['_validation_errors'] = $validationErrors;
            $itemJson = json_encode($itArr, JSON_UNESCAPED_UNICODE);
            $canonicalStrings[] = $itemJson;

            $validatedItems[] = [
                'json' => $itemJson,
                'status' => $valid ? 'VALID' : 'INVALID',
            ];
        }

        $batchHash = hash('sha256', implode('|', $canonicalStrings));

        $batchId = DB::insert(
            'INSERT INTO onboarding_batches (batch_no, record_type, maker_user_id, status, proof_package_json, batch_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                $batchNo,
                $recordType,
                (int) $maker['id'],
                'SUBMITTED',
                json_encode(['maker_username' => $maker['username'], 'item_count' => count($validatedItems)], JSON_UNESCAPED_UNICODE),
                $batchHash,
                $now,
            ]
        );

        foreach ($validatedItems as $vIt) {
            DB::insert(
                'INSERT INTO onboarding_items (batch_id, item_payload_json, validation_status, created_at) VALUES (?, ?, ?, ?)',
                [
                    $batchId,
                    $vIt['json'],
                    $vIt['status'],
                    $now,
                ]
            );
        }

        return self::getBatch($batchId, $maker);
    }

    public static function decideBatch(string|int $idOrBatchNo, array $payload, ?array $actor = null): array
    {
        $checker = RoleMiddleware::authorize([
            'sub_registrar',
            'ac_land',
            'settlement_checker',
            'admin',
            'system_admin',
        ], $actor);

        $batchRes = self::getBatch($idOrBatchNo, $checker);
        $batch = $batchRes['batch'];
        if ($batch['record_type'] === 'OPENING_RECORD') return OpeningRecordController::decide((int)$batch['id'], ['decision'=>$payload['decision']??'', 'reason'=>$payload['reason_bn']??$payload['notes_bn']??''], $checker);

        // Separation of duties check: Maker cannot check their own batch (unconditional check)
        if ((int) $batch['maker_user_id'] === (int) $checker['id']) {
            throw new \RuntimeException(json_encode([
                'status' => 403,
                'code' => 'SEPARATION_OF_DUTIES_VIOLATION',
                'message_bn' => 'মেকার-চেকার নীতি লঙ্ঘন: যিনি ডাটা এন্ট্রি করেছেন তিনি নিজের ব্যাচ অনুমোদন করতে পারেন না।',
                'message_en' => 'Separation of duties violation: Maker cannot approve their own batch.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $rawDecision = trim((string) ($payload['decision'] ?? ''));
        $decision = strtoupper($rawDecision);
        if (!in_array($decision, ['APPROVED', 'REJECTED', 'RETURNED'], true)) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_DECISION',
                'message_bn' => 'অনুমোদন সিদ্ধান্তটি অবশ্যই APPROVED, RETURNED অথবা REJECTED হতে হবে।',
                'message_en' => 'Decision must be explicitly APPROVED, RETURNED, or REJECTED.',
            ], JSON_UNESCAPED_UNICODE));
        }

        if (($batch['status'] ?? '') !== 'SUBMITTED') {
            throw new \RuntimeException(json_encode([
                'status' => 409,
                'code' => 'INVALID_BATCH_STATUS',
                'message_bn' => 'শুধুমাত্র জমাকৃত (SUBMITTED) ব্যাচেই অনুমোদন বা প্রত্যাখ্যান সিদ্ধান্ত দেওয়া সম্ভব। বর্তমান অবস্থা: ' . ($batch['status'] ?? 'UNKNOWN'),
                'message_en' => 'Only batches in SUBMITTED state can be decided. Current status: ' . ($batch['status'] ?? 'UNKNOWN'),
            ], JSON_UNESCAPED_UNICODE));
        }

        $notes = trim((string) ($payload['notes_bn'] ?? ($payload['reason_bn'] ?? ($payload['checker_notes'] ?? ''))));

        if ($decision === 'RETURNED' && strlen($notes) < 5) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'CORRECTION_NOTES_REQUIRED',
                'message_bn' => 'সংশোধনের জন্য ফেরত পাঠাতে সুনির্দিষ্ট কারণ বা নির্দেশনামূলক নোট প্রদান করা আবশ্যক (ন্যূনতম ৫ অক্ষর)।',
                'message_en' => 'Correction notes explaining requested revisions are required when returning a batch.',
            ], JSON_UNESCAPED_UNICODE));
        }

        if ($decision === 'APPROVED') {
            $invalidCount = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM onboarding_items WHERE batch_id = ? AND validation_status = 'INVALID'", [$batch['id']])['c'] ?? 0);
            if ($invalidCount > 0) {
                throw new \RuntimeException(json_encode([
                    'status' => 422,
                    'code' => 'CANNOT_APPROVE_INVALID_ITEMS',
                    'message_bn' => 'এই ব্যাচে ত্রুটিপূর্ণ (INVALID) রেকর্ড বিদ্যমান। ত্রুটিপূর্ণ রেকর্ডসহ ব্যাচ অনুমোদন করা যাবে না।',
                    'message_en' => 'Batch contains invalid records and cannot be approved.',
                ], JSON_UNESCAPED_UNICODE));
            }
        }

        $now = gmdate('c');
        $proofPkg = json_decode((string) ($batch['proof_package_json'] ?? '{}'), true) ?: [];
        if ($decision === 'RETURNED') {
            $proofPkg['correction_notes'] = $notes;
            $proofPkg['returned_at'] = $now;
            $proofPkg['returned_by'] = $checker['username'] ?? 'checker';
        }
        $proofPkgJson = json_encode($proofPkg, JSON_UNESCAPED_UNICODE);

        DB::statement(
            'UPDATE onboarding_batches SET status = ?, checker_user_id = ?, proof_package_json = ?, decided_at = ? WHERE id = ?',
            [
                $decision,
                (int) $checker['id'],
                $proofPkgJson,
                $now,
                (int) $batch['id'],
            ]
        );

        \Database\Seeders\DatabaseSeeder::appendAuditEntry(
            (string) ($checker['username'] ?? 'checker'),
            (string) ($checker['role'] ?? 'checker'),
            'ONBOARDING_BATCH_' . $decision,
            'onboarding_batch',
            (string) $batch['id'],
            [
                'batch_no' => $batch['batch_no'],
                'record_type' => $batch['record_type'],
                'decision' => $decision,
                'checker_user_id' => (int) $checker['id'],
                'maker_user_id' => (int) $batch['maker_user_id'],
                'notes_bn' => $notes,
            ],
            $now
        );

        return [
            'batch_no' => $batch['batch_no'],
            'status' => $decision,
            'checker_user_id' => (int) $checker['id'],
            'checker_notes' => $notes,
            'decided_at' => $now,
            'message_bn' => $decision === 'RETURNED'
                ? 'ব্যাচটি সংশোধনের জন্য সফলভাবে মেকারের কাছে ফেরত পাঠানো হয়েছে।'
                : ($decision === 'APPROVED' ? 'ব্যাচটি সফলভাবে অনুমোদিত হয়েছে।' : 'ব্যাচটি বাতিল করা হয়েছে।'),
        ];
    }

    /**
     * Allows Maker to update and resubmit a RETURNED batch with corrected items.
     */
    public static function resubmitBatch(string|int $idOrBatchNo, array $payload, ?array $actor = null): array
    {
        $maker = RoleMiddleware::authorize([
            'registry_data_officer',
            'land_office_assistant',
            'settlement_records_officer',
            'admin',
            'system_admin',
        ], $actor);

        $batchRes = self::getBatch($idOrBatchNo, $maker);
        $batch = $batchRes['batch'];

        if (($batch['status'] ?? '') !== 'RETURNED') {
            throw new \RuntimeException(json_encode([
                'status' => 409,
                'code' => 'BATCH_NOT_RETURNED',
                'message_bn' => 'শুধুমাত্র সংশোধনের জন্য ফেরত (RETURNED) ব্যাচ পুনরায় দাখিল করা যাবে। বর্তমান অবস্থা: ' . ($batch['status'] ?? ''),
                'message_en' => 'Only batches in RETURNED state can be resubmitted.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // Only the original maker (or admin) can resubmit
        if ((int) $batch['maker_user_id'] !== (int) $maker['id'] && !in_array($maker['role'], ['admin', 'system_admin'], true)) {
            throw new \RuntimeException(json_encode([
                'status' => 403,
                'code' => 'NOT_BATCH_MAKER',
                'message_bn' => 'শুধুমাত্র মূল ডাটা এন্ট্রি কর্মকর্তা (মেকার) সংশোধিত ব্যাচ পুনরায় দাখিল করতে পারেন।',
                'message_en' => 'Only the original maker can resubmit the returned batch.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $rawItems = (array) ($payload['items'] ?? []);
        if (empty($rawItems)) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'EMPTY_BATCH',
                'message_bn' => 'সংশোধিত ব্যাচে ন্যূনতম ১টি রেকর্ড প্রদান করা আবশ্যক।',
                'message_en' => 'Resubmitted batch must contain at least one item.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $now = gmdate('c');
        $canonicalStrings = [];
        $validatedItems = [];

        foreach ($rawItems as $it) {
            $itArr = is_array($it) ? $it : ['raw' => (string) $it];
            $valid = true;
            $validationErrors = [];

            if (!empty($itArr['nid']) && strlen(trim((string) $itArr['nid'])) < 10) {
                $valid = false;
                $validationErrors[] = 'NID must be at least 10 digits';
            }
            if (isset($itArr['area_decimal']) && (float) $itArr['area_decimal'] <= 0) {
                $valid = false;
                $validationErrors[] = 'Area decimal must be positive';
            }

            $itArr['_validation_errors'] = $validationErrors;
            $itemJson = json_encode($itArr, JSON_UNESCAPED_UNICODE);
            $canonicalStrings[] = $itemJson;
            $validatedItems[] = ['json' => $itemJson, 'status' => $valid ? 'VALID' : 'INVALID'];
        }

        $batchHash = hash('sha256', implode('|', $canonicalStrings));

        // Delete old items and insert updated items
        DB::statement('DELETE FROM onboarding_items WHERE batch_id = ?', [(int) $batch['id']]);
        foreach ($validatedItems as $vIt) {
            DB::insert(
                'INSERT INTO onboarding_items (batch_id, item_payload_json, validation_status, created_at) VALUES (?, ?, ?, ?)',
                [(int) $batch['id'], $vIt['json'], $vIt['status'], $now]
            );
        }

        $proofPkg = json_decode((string) ($batch['proof_package_json'] ?? '{}'), true) ?: [];
        $proofPkg['resubmitted_at'] = $now;
        $proofPkg['resubmitted_by'] = $maker['username'];
        $proofPkg['resubmit_notes'] = trim((string) ($payload['notes_bn'] ?? 'সংশোধনপূর্বক পুনরায় জমা দেওয়া হলো'));
        $proofPkgJson = json_encode($proofPkg, JSON_UNESCAPED_UNICODE);

        DB::statement(
            'UPDATE onboarding_batches SET status = "SUBMITTED", checker_user_id = NULL, decided_at = NULL, batch_hash = ?, proof_package_json = ? WHERE id = ?',
            [$batchHash, $proofPkgJson, (int) $batch['id']]
        );

        \Database\Seeders\DatabaseSeeder::appendAuditEntry(
            (string) ($maker['username'] ?? 'maker'),
            (string) ($maker['role'] ?? 'maker'),
            'ONBOARDING_BATCH_RESUBMITTED',
            'onboarding_batch',
            (string) $batch['id'],
            [
                'batch_no' => $batch['batch_no'],
                'resubmitted_by' => $maker['username'],
                'items_count' => count($validatedItems),
            ],
            $now
        );

        return self::getBatch((int) $batch['id'], $maker);
    }

    // -------------------------------------------------------------------------
    // 2. APPELLATE REVIEW MIRROR & LEGAL ROLES (Section 8.8)
    // -------------------------------------------------------------------------

    public static function listAppeals(array $query = [], ?array $actor = null): array
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

        $sql = 'SELECT a.*, p.plot_code, p.dag_no, p.dag_no_bn,
                       m.case_no, m.status AS mutation_status
                FROM appeals a
                JOIN plots p ON p.id = a.plot_id
                JOIN mutations m ON m.id = a.mutation_id
                WHERE 1=1';
        $params = [];

        // Scope to appellant if citizen (F02)
        if ($user['role'] === 'citizen') {
            $sql .= ' AND a.appellant_nid = ?';
            $params[] = (string) ($user['nid'] ?? '');
        }

        if (!empty($query['status'])) {
            $sql .= ' AND a.status = ?';
            $params[] = $query['status'];
        }

        $sql .= ' ORDER BY a.id DESC';
        $rows = DB::select($sql, $params);

        return [
            'items' => array_map([PublicRecordService::class, 'forViewer'], $rows),
            'total' => count($rows),
        ];
    }

    public static function getAppeal(string|int $idOrCode, ?array $actor = null): array
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

        $appeal = null;
        if (is_numeric($idOrCode)) {
            $appeal = DB::selectOne(
                'SELECT a.*, p.plot_code, p.dag_no, p.dag_no_bn, m.case_no, m.status AS mutation_status
                 FROM appeals a
                 JOIN plots p ON p.id = a.plot_id
                 JOIN mutations m ON m.id = a.mutation_id
                 WHERE a.id = ?',
                [(int) $idOrCode]
            );
        }
        if (!$appeal) {
            $appeal = DB::selectOne(
                'SELECT a.*, p.plot_code, p.dag_no, p.dag_no_bn, m.case_no, m.status AS mutation_status
                 FROM appeals a
                 JOIN plots p ON p.id = a.plot_id
                 JOIN mutations m ON m.id = a.mutation_id
                 WHERE a.appeal_code = ?',
                [(string) $idOrCode]
            );
        }

        if (!$appeal) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'APPEAL_NOT_FOUND',
                'message_bn' => 'আপিল রেকর্ডটি পাওয়া যায়নি।',
                'message_en' => 'Appeal record not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // Scope check for citizen (F02)
        if ($user['role'] === 'citizen') {
            if (($appeal['appellant_nid'] ?? '') !== ($user['nid'] ?? '')) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'FORBIDDEN',
                    'message_bn' => 'এই আপিল রেকর্ড দেখার অনুমতি আপনার নেই।',
                    'message_en' => 'You are not authorized to view this appeal record.',
                ], JSON_UNESCAPED_UNICODE));
            }
        }

        return ['appeal' => PublicRecordService::forViewer($appeal)];
    }

    public static function createAppeal(array $payload, ?array $actor = null): array
    {
        $user = RoleMiddleware::authorize(['citizen', 'appellate_reviewer', 'admin', 'system_admin'], $actor);

        $mutationId = (int) ($payload['mutation_id'] ?? 0);
        $plotId = (int) ($payload['plot_id'] ?? 0);
        $appellantName = trim((string) ($payload['appellant_name_bn'] ?? ($user['full_name_bn'] ?? '')));
        $appellantNid = trim((string) ($payload['appellant_nid'] ?? ($user['nid'] ?? '')));
        $reason = trim((string) ($payload['reason_bn'] ?? 'সহকারী কমিশনার (ভূমি) কর্তৃক প্রদত্ত আদেশের বিরুদ্ধে অতিরিক্ত জেলা প্রশাসক (রাজস্ব) বরাবর রিভিউ আপিল।'));

        $cnt = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM appeals')['c'] ?? 0);
        $appealCode = sprintf('APL-2026-%04d', $cnt + 1);
        $now = gmdate('c');

        $appealId = DB::insert(
            'INSERT INTO appeals (appeal_code, mutation_id, plot_id, appellant_nid, appellant_name_bn, reason_bn, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $appealCode,
                $mutationId,
                $plotId,
                $appellantNid,
                $appellantName,
                $reason,
                'FILED',
                $now,
            ]
        );

        return self::getAppeal($appealId, ['role' => $user['role'] ?? 'citizen', 'nid' => $appellantNid, 'username' => $user['username'] ?? 'citizen']);
    }

    public static function decideAppeal(string|int $idOrCode, array $payload, ?array $actor = null): array
    {
        $judge = RoleMiddleware::authorize(['appellate_reviewer', 'uno_supervisor', 'admin', 'system_admin'], $actor);

        $appealRes = self::getAppeal($idOrCode, $judge);
        $appeal = $appealRes['appeal'];

        $status = strtoupper(trim((string) ($payload['status'] ?? 'HEARING_SCHEDULED')));
        $validStatuses = ['FILED', 'HEARING_SCHEDULED', 'STAY_ORDER_GRANTED', 'UPHELD', 'OVERTURNED'];
        if (!in_array($status, $validStatuses, true)) throw new \RuntimeException(json_encode(['status'=>422,'code'=>'INVALID_APPEAL_STATUS','message_bn'=>'সঠিক আপিলের অবস্থা নির্বাচন করুন।','message_en'=>'Choose a valid appeal status.'], JSON_UNESCAPED_UNICODE));

        $note = trim((string) ($payload['decision_note_bn'] ?? 'আপিল আদালতের সিদ্ধান্ত রেকর্ডভুক্ত করা হলো।'));
        $now = gmdate('c');

        DB::statement(
            'UPDATE appeals SET status = ?, reviewer_username = ?, decision_note_bn = ?, decided_at = ? WHERE id = ?',
            [
                $status,
                $judge['username'],
                $note,
                $now,
                (int) $appeal['id'],
            ]
        );

        // If a stay order is granted, record alert state on plot
        if ($status === 'STAY_ORDER_GRANTED') {
            DB::statement(
                'UPDATE plots SET owner_sale_locked = 1 WHERE id = ?',
                [(int) $appeal['plot_id']]
            );
        }

        return [
            'appeal_code' => $appeal['appeal_code'],
            'status' => $status,
            'reviewer' => $judge['username'],
            'decided_at' => $now,
            'message_bn' => "✔ আপিল স্ট্যাটাস সফলভাবে হালনাগাদ করা হয়েছে ({$status})।",
            'message_en' => "✔ Appeal status updated successfully to {$status}.",
        ];
    }
}
