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
        RoleMiddleware::authorize([
            'registry_data_officer',
            'land_office_assistant',
            'settlement_records_officer',
            'settlement_checker',
            'sub_registrar',
            'ac_land',
            'admin',
            'system_admin',
        ], $actor);

        $sql = 'SELECT b.*,
                       um.full_name_bn AS maker_name_bn, um.role AS maker_role,
                       uc.full_name_bn AS checker_name_bn, uc.role AS checker_role,
                       (SELECT COUNT(*) FROM onboarding_items oi WHERE oi.batch_id = b.id) AS item_count
                FROM onboarding_batches b
                JOIN users um ON um.id = b.maker_user_id
                LEFT JOIN users uc ON uc.id = b.checker_user_id';
        $params = [];

        if (!empty($query['status'])) {
            $sql .= ' WHERE b.status = ?';
            $params[] = $query['status'];
        }

        $sql .= ' ORDER BY b.id DESC';
        $rows = DB::select($sql, $params);

        return [
            'items' => $rows,
            'total' => count($rows),
        ];
    }

    public static function getBatch(string|int $idOrBatchNo, ?array $actor = null): array
    {
        RoleMiddleware::authorize([
            'registry_data_officer',
            'land_office_assistant',
            'settlement_records_officer',
            'settlement_checker',
            'sub_registrar',
            'ac_land',
            'admin',
            'system_admin',
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

        $items = DB::select('SELECT * FROM onboarding_items WHERE batch_id = ? ORDER BY id ASC', [(int) $batch['id']]);
        $decodedItems = array_map(static function (array $it): array {
            $it['payload'] = json_decode((string) $it['item_payload_json'], true) ?: [];
            return $it;
        }, $items);

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
                json_encode(['maker_username' => $maker['username'], 'item_count' => count($validatedItems)]),
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

        // Separation of duties check: Maker cannot check their own batch (unless super admin override in dev)
        if ((int) $batch['maker_user_id'] === (int) $checker['id'] && ($checker['role'] ?? '') !== 'admin') {
            throw new \RuntimeException(json_encode([
                'status' => 403,
                'code' => 'SEPARATION_OF_DUTIES_VIOLATION',
                'message_bn' => 'মেকার-চেকার নীতি লঙ্ঘন: যিনি ডাটা এন্ট্রি করেছেন তিনি নিজের ব্যাচ অনুমোদন করতে পারেন না।',
                'message_en' => 'Separation of duties violation: Maker cannot approve their own batch.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $decision = strtoupper(trim((string) ($payload['decision'] ?? 'APPROVED')));
        if (!in_array($decision, ['APPROVED', 'REJECTED'], true)) {
            $decision = 'APPROVED';
        }

        $now = gmdate('c');
        DB::statement(
            'UPDATE onboarding_batches SET status = ?, checker_user_id = ?, decided_at = ? WHERE id = ?',
            [
                $decision,
                (int) $checker['id'],
                $now,
                (int) $batch['id'],
            ]
        );

        return [
            'batch_no' => $batch['batch_no'],
            'status' => $decision,
            'checker_user_id' => (int) $checker['id'],
            'decided_at' => $now,
            'message_bn' => $decision === 'APPROVED'
                ? '✔ মেকার-চেকার অনুমোদন সম্পন্ন: ব্যাচটি সফলভাবে অনুমোদিত হয়েছে।'
                : '✕ ব্যাচটি প্রত্যাখ্যাত হয়েছে। মেকারকে সংশোধন করার জন্য নির্দেশ দেওয়া হলো।',
            'message_en' => $decision === 'APPROVED'
                ? '✔ Maker-Checker validation approved: Batch verified successfully.'
                : '✕ Batch rejected. Remanded to maker for revision.',
        ];
    }

    // -------------------------------------------------------------------------
    // 2. APPELLATE REVIEW MIRROR & LEGAL ROLES (Section 8.8)
    // -------------------------------------------------------------------------

    public static function listAppeals(array $query = [], ?array $actor = null): array
    {
        $sql = 'SELECT a.*, p.plot_code, p.dag_no, p.dag_no_bn,
                       m.case_no, m.status AS mutation_status
                FROM appeals a
                JOIN plots p ON p.id = a.plot_id
                JOIN mutations m ON m.id = a.mutation_id';
        $params = [];

        if (!empty($query['status'])) {
            $sql .= ' WHERE a.status = ?';
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

        return ['appeal' => PublicRecordService::forViewer($appeal)];
    }

    public static function createAppeal(array $payload, ?array $actor = null): array
    {
        $user = RoleMiddleware::authorize(['citizen', 'appellate_reviewer', 'admin', 'system_admin'], $actor);

        $mutationId = (int) ($payload['mutation_id'] ?? 1);
        $plotId = (int) ($payload['plot_id'] ?? 1);
        $appellantName = trim((string) ($payload['appellant_name_bn'] ?? ($user['full_name_bn'] ?? 'মোসা. রাবেয়া খাতুন')));
        $appellantNid = trim((string) ($payload['appellant_nid'] ?? ($user['nid'] ?? '9900001002')));
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

        return self::getAppeal($appealId, $user);
    }

    public static function decideAppeal(string|int $idOrCode, array $payload, ?array $actor = null): array
    {
        $judge = RoleMiddleware::authorize(['appellate_reviewer', 'uno_supervisor', 'admin', 'system_admin'], $actor);

        $appealRes = self::getAppeal($idOrCode, $judge);
        $appeal = $appealRes['appeal'];

        $status = strtoupper(trim((string) ($payload['status'] ?? 'HEARING_SCHEDULED')));
        $validStatuses = ['FILED', 'HEARING_SCHEDULED', 'STAY_ORDER_GRANTED', 'UPHELD', 'OVERTURNED'];
        if (!in_array($status, $validStatuses, true)) {
            $status = 'HEARING_SCHEDULED';
        }

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
