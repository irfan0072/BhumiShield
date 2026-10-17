<?php

declare(strict_types=1);

namespace App\Services;

use App\Http\Middleware\RoleMiddleware;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * 13-Step End-to-End Land Transfer State Machine with 5 Citizen-Facing Stages.
 *
 * Citizen Stages:
 *  1. START    (Steps 1-3: Intent Declaration, Parties Specification, Deed & Plot Details)
 *  2. VERIFY   (Steps 4-6: Automated Fraud & Khatian Pre-Check, Co-Owner Consent, Stamp Duty Assessment)
 *  3. REGISTER (Steps 7-9: Appointment Scheduling, Counter Biometric Match, Deed Registration with Ed25519)
 *  4. REVIEW   (Steps 10-11: e-Mutation Queueing, Hearing / Field Verification)
 *  5. DONE     (Steps 12-13: AC Land Mutation Approval & Ownership Mutation, DCR & Khatian Delivery)
 */
final class TransferStateMachine
{
    public const STAGES = [
        1  => ['stage' => 'START',    'name_bn' => 'আবেদন ও জমি নির্বাচন',        'name_en' => 'Intent & Land Selection'],
        2  => ['stage' => 'START',    'name_bn' => 'ক্রেতা-বিক্রেতার তথ্য প্রদান', 'name_en' => 'Parties Information'],
        3  => ['stage' => 'START',    'name_bn' => 'জমির পরিমাণ ও দলিলের ধরন',   'name_en' => 'Area & Deed Type'],
        4  => ['stage' => 'VERIFY',   'name_bn' => 'স্বয়ংক্রিয় ভূমি ও খতিয়ান যাচাই', 'name_en' => 'Automated Lineage & Lien Scan'],
        5  => ['stage' => 'VERIFY',   'name_bn' => 'ওয়ারিশ ও সহ-মালিকের সম্মতি', 'name_en' => 'Co-Owner / Heir Consent'],
        6  => ['stage' => 'VERIFY',   'name_bn' => 'রেজিস্ট্রি শুল্ক ও ফি নির্ধারণ', 'name_en' => 'Duty & Fee Assessment'],
        7  => ['stage' => 'REGISTER', 'name_bn' => 'সাব-রেজিস্ট্রি অ্যাপয়েন্টমেন্ট', 'name_en' => 'Registry Appointment Booking'],
        8  => ['stage' => 'REGISTER', 'name_bn' => 'কাউন্টার বায়োমেট্রিক ও লাইভনেস', 'name_en' => 'Counter Biometric & Liveness'],
        9  => ['stage' => 'REGISTER', 'name_bn' => 'দলিল সম্পাদন ও ডিজিটাল স্বাক্ষর', 'name_en' => 'Deed Execution with Ed25519'],
        10 => ['stage' => 'REVIEW',   'name_bn' => 'স্বয়ংক্রিয় ই-নামজারি কিউ',   'name_en' => 'e-Mutation Queued to AC Land'],
        11 => ['stage' => 'REVIEW',   'name_bn' => 'ভূমি সহকারী নোটিশ ও শুনানি',   'name_en' => 'Hearing & Notice Service'],
        12 => ['stage' => 'DONE',     'name_bn' => 'এসি ল্যান্ড নামজারি অনুমোদন',   'name_en' => 'AC Land Mutation Approval'],
        13 => ['stage' => 'DONE',     'name_bn' => 'ডিসিআর ও নতুন বিএস খতিয়ান প্রদান', 'name_en' => 'DCR & New Khatian Issued'],
    ];

    public static function createTransfer(array $payload, ?array $actor = null): array
    {
        $user = RoleMiddleware::authorize(['citizen', 'service_point_operator', 'admin'], $actor);
        $plotId = (int) ($payload['plot_id'] ?? 1);
        $plot = LookupService::resolvePlot($payload['plot_code'] ?? $plotId);
        if (!$plot) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'PLOT_NOT_FOUND',
                'message_bn' => 'চিহ্নিত দাগ বা জমির প্লট পাওয়া যায়নি।',
                'message_en' => 'Specified plot not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $cnt = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM transfer_requests')['c'] ?? 0);
        $transferCode = sprintf('TR-2026-%06d', $cnt + 101);
        $now = gmdate('c');
        $area = max(0.01, (float) ($payload['transfer_area_decimal'] ?? 10.0));
        $price = max(0, (int) ($payload['proposed_price_bdt'] ?? 1500000));
        $deedType = trim((string) ($payload['deed_type'] ?? 'SALE'));

        $transferId = DB::insert(
            'INSERT INTO transfer_requests (transfer_code, plot_id, current_step, public_stage, transfer_area_decimal, proposed_price_bdt, deed_type, service_point_id, home_office_id, status, created_by_nid, created_at, updated_at)
             VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $transferCode,
                (int) $plot['id'],
                'START',
                $area,
                $price,
                $deedType,
                !empty($payload['service_point_id']) ? (int) $payload['service_point_id'] : null,
                !empty($payload['home_office_id']) ? (int) $payload['home_office_id'] : 3,
                'DRAFT',
                (string) ($user['nid'] ?? '9900001001'),
                $now,
                $now,
            ]
        );

        // Record initial event
        self::recordEvent(
            $transferId,
            0,
            1,
            'TRANSFER_INITIALIZED',
            $user['username'] ?? 'citizen',
            $user['role'] ?? 'citizen',
            'হস্তান্তর আবেদন প্রাথমিক খসড়া (Step 1) হিসেবে দাখিল করা হয়েছে।'
        );

        return self::getTransfer($transferId, $user);
    }

    public static function getTransfer(string|int $codeOrId, ?array $actor = null): array
    {
        $t = LookupService::resolveTransfer($codeOrId);
        if (!$t) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'TRANSFER_NOT_FOUND',
                'message_bn' => 'হস্তান্তর কেসটি খুঁজে পাওয়া যায়নি।',
                'message_en' => 'Transfer request not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $plot = DB::selectOne('SELECT p.*, l.mouza_bn, l.mouza_en, l.upazila_bn, l.upazila_en, l.district_bn, l.district_en FROM plots p JOIN locations l ON l.id = p.location_id WHERE p.id = ?', [$t['plot_id']]);
        $events = DB::select('SELECT * FROM transfer_events WHERE transfer_id = ? ORDER BY id ASC', [$t['id']]);
        $parties = DB::select('SELECT tp.*, p.name_bn, p.name_en, p.nid FROM transfer_parties tp JOIN persons p ON p.id = tp.person_id WHERE tp.transfer_id = ?', [$t['id']]);
        $biometrics = DB::select('SELECT id, transaction_id, party_nid, party_role, modality, match_status, match_score, terminal_id, verified_at, notes_bn FROM biometric_verifications WHERE transfer_id = ?', [$t['id']]);

        $step = (int) $t['current_step'];
        $stepInfo = self::STAGES[$step] ?? ['stage' => 'START', 'name_bn' => 'অজ্ঞাত ধাপ', 'name_en' => 'Unknown Step'];

        $result = [
            'id' => (int) $t['id'],
            'transfer_code' => $t['transfer_code'],
            'plot_id' => (int) $t['plot_id'],
            'current_step' => $step,
            'total_steps' => 13,
            'public_stage' => $stepInfo['stage'],
            'step_name_bn' => $stepInfo['name_bn'],
            'step_name_en' => $stepInfo['name_en'],
            'status' => $t['status'],
            'transfer_area_decimal' => (float) $t['transfer_area_decimal'],
            'proposed_price_bdt' => (int) $t['proposed_price_bdt'],
            'deed_type' => $t['deed_type'],
            'plot' => $plot,
            'parties' => $parties,
            'events' => $events,
            'biometrics' => $biometrics,
            'created_at' => $t['created_at'],
            'updated_at' => $t['updated_at'],
        ];

        return PublicRecordService::forViewer($result);
    }

    public static function listTransfers(array $filters = [], ?array $actor = null): array
    {
        $sql = 'SELECT t.*, p.plot_code, p.dag_no, p.dag_no_bn, l.mouza_bn, l.mouza_en FROM transfer_requests t JOIN plots p ON p.id = t.plot_id JOIN locations l ON l.id = p.location_id WHERE 1=1';
        $params = [];

        if (!empty($filters['status'])) {
            $sql .= ' AND t.status = ?';
            $params[] = $filters['status'];
        }

        if (!empty($filters['public_stage'])) {
            $sql .= ' AND t.public_stage = ?';
            $params[] = $filters['public_stage'];
        }

        $sql .= ' ORDER BY t.id DESC';
        $rows = DB::select($sql, $params);

        $items = array_map(static function (array $r): array {
            $step = (int) $r['current_step'];
            $stInfo = self::STAGES[$step] ?? ['stage' => 'START', 'name_bn' => 'ধাপ ' . $step, 'name_en' => 'Step ' . $step];
            $r['step_name_bn'] = $stInfo['name_bn'];
            $r['step_name_en'] = $stInfo['name_en'];
            return PublicRecordService::forViewer($r);
        }, $rows);

        return ['items' => $items, 'total' => count($items)];
    }

    public static function advanceStep(string|int $codeOrId, array $payload, ?array $actor = null): array
    {
        $t = LookupService::resolveTransfer($codeOrId);
        if (!$t) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'TRANSFER_NOT_FOUND',
                'message_bn' => 'হস্তান্তর কেসটি খুঁজে পাওয়া যায়নি।',
                'message_en' => 'Transfer request not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $user = $actor ?? JwtAuthService::getAuthenticatedUser() ?? ['username' => 'citizen', 'role' => 'citizen'];
        $currStep = (int) $t['current_step'];
        $targetStep = isset($payload['target_step']) ? (int) $payload['target_step'] : ($currStep + 1);

        if ($targetStep <= $currStep || $targetStep > 13) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_STATE_TRANSITION',
                'message_bn' => "ধাপ {$currStep} থেকে ধাপ {$targetStep}-এ ট্রানজিশন অনুমোদনযোগ্য নয়।",
                'message_en' => "Transition from step {$currStep} to {$targetStep} is not allowed.",
            ], JSON_UNESCAPED_UNICODE));
        }

        // If stepping into Step 8 (Biometrics), run mock provider
        if ($targetStep === 8) {
            $bioProvider = new MockBiometricProvider();
            $bioProvider->verifyCounterBiometrics(
                ['nid' => $t['created_by_nid'], 'role' => 'SELLER'],
                ['transfer_id' => $t['id'], 'officer_id' => $user['username'] ?? 'registrar']
            );
        }

        $targetStage = self::STAGES[$targetStep]['stage'] ?? 'START';
        $newStatus = ($targetStep === 13) ? 'COMPLETED' : (($targetStep >= 12) ? 'APPROVED' : (($targetStep >= 9) ? 'REGISTERED' : 'PROCESSING'));

        $now = gmdate('c');
        DB::statement(
            'UPDATE transfer_requests SET current_step = ?, public_stage = ?, status = ?, updated_at = ? WHERE id = ?',
            [$targetStep, $targetStage, $newStatus, $now, $t['id']]
        );

        $actionName = "STEP_{$targetStep}_ADVANCED";
        $note = (string) ($payload['notes_bn'] ?? ("ধাপ {$targetStep} (" . (self::STAGES[$targetStep]['name_bn'] ?? '') . ') সম্পন্ন হয়েছে।'));

        self::recordEvent(
            (int) $t['id'],
            $currStep,
            $targetStep,
            $actionName,
            (string) ($user['username'] ?? 'officer'),
            (string) ($user['role'] ?? 'officer'),
            $note
        );

        return self::getTransfer($t['id'], $user);
    }

    private static function recordEvent(
        int $transferId,
        int $fromStep,
        int $toStep,
        string $eventType,
        string $actorUser,
        string $actorRole,
        string $notesBn
    ): void {
        DB::insert(
            'INSERT INTO transfer_events (transfer_id, from_step, to_step, actor_username, actor_role, reason_bn, reason_en, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $transferId,
                $fromStep,
                $toStep,
                $actorUser,
                $actorRole,
                $notesBn,
                "Transfer step {$fromStep} -> {$toStep} ({$eventType})",
                json_encode(['event_type' => $eventType], JSON_UNESCAPED_UNICODE),
                gmdate('c'),
            ]
        );
    }
}
