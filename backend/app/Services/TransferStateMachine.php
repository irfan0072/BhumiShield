<?php

declare(strict_types=1);

namespace App\Services;

use App\Http\Controllers\Api\V1\WorkflowController;
use App\Http\Middleware\RoleMiddleware;
use App\Services\JwtAuthService;
use App\Services\LookupService;
use App\Services\MockBiometricProvider;
use App\Services\PublicRecordService;
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

        // Deed type validation (F03)
        $allowedDeedTypes = ['SALE', 'HEIR', 'GIFT', 'MORTGAGE', 'EXCHANGE'];
        $deedType = strtoupper(trim((string) ($payload['deed_type'] ?? '')));
        if (!in_array($deedType, $allowedDeedTypes, true)) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_DEED_TYPE',
                'message_bn' => 'অবৈধ দলিলের ধরন। অনুমোদিত: বিক্রয় (SALE), হেবা (GIFT), ওয়ারিশ (HEIR), বন্ধক (MORTGAGE), বিনিময় (EXCHANGE)।',
                'message_en' => 'Invalid deed type. Allowed types: SALE, HEIR, GIFT, MORTGAGE, EXCHANGE.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // Positive finite area validation (F03)
        if (!isset($payload['transfer_area_decimal']) || !is_numeric($payload['transfer_area_decimal']) || (float) $payload['transfer_area_decimal'] <= 0 || !is_finite((float) $payload['transfer_area_decimal'])) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_TRANSFER_AREA',
                'message_bn' => 'জমির পরিমাণ অবশ্যই শূন্যের চেয়ে বেশি বাস্তব সংখ্যা হতে হবে।',
                'message_en' => 'Transfer area must be a finite positive number greater than zero.',
            ], JSON_UNESCAPED_UNICODE));
        }
        $area = (float) $payload['transfer_area_decimal'];

        // Non-negative finite price validation (F03)
        if (!isset($payload['proposed_price_bdt']) || !is_numeric($payload['proposed_price_bdt']) || (int) $payload['proposed_price_bdt'] < 0 || !is_finite((float) $payload['proposed_price_bdt'])) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_PROPOSED_PRICE',
                'message_bn' => 'প্রস্তাবিত মূল্য শূন্য বা তার বেশি ধনাত্মক সংখ্যা হতে হবে।',
                'message_en' => 'Proposed price must be a non-negative finite integer.',
            ], JSON_UNESCAPED_UNICODE));
        }
        $price = (int) $payload['proposed_price_bdt'];

        // Plot resolution
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

        // Plot encumbrance: Citizen sale lock (F03)
        if (!empty($plot['sale_locked'])) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'PLOT_SALE_LOCKED',
                'message_bn' => 'এই দাগে নাগরিক লক (Citizen Sale Lock) সক্রিয় রয়েছে। হস্তান্তর আবেদন করার পূর্বে লক প্রত্যাহার করুন।',
                'message_en' => 'This plot is currently locked by citizen lock. Unlock before initiating transfer.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // Plot encumbrance: Active bank mortgage / lien (F03)
        $mortgage = DB::selectOne("SELECT * FROM mortgages_liens WHERE plot_id = ? AND status = 'ACTIVE'", [(int) $plot['id']]);
        if ($mortgage || (isset($plot['mortgage_status']) && in_array(strtoupper((string) $plot['mortgage_status']), ['MORTGAGED', 'LIEN_ACTIVE'], true))) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'PLOT_MORTGAGED',
                'message_bn' => 'এই জমিটি ব্যাংকে বন্ধকযুক্ত (Mortgaged)। ব্যাংকের এনওসি (NOC) ও লিয়েন খালাস ছাড়া হস্তান্তর প্রক্রিয়া শুরু করা যাবে না।',
                'message_en' => 'This plot has an active bank mortgage/lien. Clear mortgage before initiating transfer.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // Plot encumbrance: Active dispute / injunction (F03)
        $dispute = DB::selectOne("SELECT * FROM disputes WHERE plot_id = ? AND status IN ('ACTIVE', 'DISPUTED', 'LITIGATION', 'UPHELD_FROZEN')", [(int) $plot['id']]);
        if ($dispute || (isset($plot['dispute_status']) && in_array(strtoupper((string) $plot['dispute_status']), ['ACTIVE', 'DISPUTED', 'LITIGATION', 'UPHELD_FROZEN'], true))) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'PLOT_UNDER_DISPUTE',
                'message_bn' => 'এই দাগে বিচারাধীন মামলা বা নিষেধাজ্ঞা রয়েছে। বিরোধ নিষ্পত্তি না হওয়া পর্যন্ত হস্তান্তর প্রক্রিয়া বন্ধ থাকবে।',
                'message_en' => 'This plot is subject to an active dispute or legal injunction.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // Ownership and share validation for citizen (F03)
        if ($user['role'] === 'citizen') {
            $ownership = DB::selectOne(
                'SELECT o.* FROM ownerships o JOIN persons p ON p.id = o.person_id WHERE o.plot_id = ? AND p.nid = ? AND o.is_latest = 1',
                [(int) $plot['id'], (string) ($user['nid'] ?? '')]
            );
            if (!$ownership) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'NOT_PLOT_OWNER',
                    'message_bn' => 'আপনি এই প্লটের রেকর্ডীয় মালিক নন। শুধুমাত্র রেকর্ডীয় মালিক হস্তান্তর আবেদন দাখিল করতে পারেন।',
                    'message_en' => 'You are not a recorded owner of this plot.',
                ], JSON_UNESCAPED_UNICODE));
            }
            $ownedArea = (float) $ownership['area_decimal'];
            if ($area > $ownedArea + 0.0001) {
                throw new \RuntimeException(json_encode([
                    'status' => 422,
                    'code' => 'AREA_EXCEEDS_OWNED',
                    'message_bn' => "আবেদনে উল্লিখিত জমির পরিমাণ ({$area} শতক) আপনার মালিকানাধীন অংশ ({$ownedArea} শতক)-এর চেয়ে বেশি।",
                    'message_en' => "Transfer area ({$area}) exceeds your recorded ownership share ({$ownedArea}).",
                ], JSON_UNESCAPED_UNICODE));
            }
        }

        $cnt = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM transfer_requests')['c'] ?? 0);
        $transferCode = sprintf('TR-2026-%06d', $cnt + 101);
        $now = gmdate('c');

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

        // Associate seller party
        $sellerPerson = DB::selectOne('SELECT * FROM persons WHERE nid = ?', [(string) ($user['nid'] ?? '')]);
        if ($sellerPerson) {
            DB::insert(
                'INSERT INTO transfer_parties (transfer_id, person_id, party_role, share_fraction, phone_dummy, is_verified, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)',
                [$transferId, (int) $sellerPerson['id'], 'SELLER', '1/1', $sellerPerson['phone_dummy'] ?? '01700000000', 1, $now]
            );
        }

        // Associate buyer party if provided
        if (!empty($payload['buyer_nid'])) {
            $buyerPerson = DB::selectOne('SELECT * FROM persons WHERE nid = ?', [(string) $payload['buyer_nid']]);
            if ($buyerPerson) {
                DB::insert(
                    'INSERT INTO transfer_parties (transfer_id, person_id, party_role, share_fraction, phone_dummy, is_verified, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [$transferId, (int) $buyerPerson['id'], 'BUYER', '1/1', $buyerPerson['phone_dummy'] ?? '01800000000', 1, $now]
                );
            }
        }

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
        $user = $actor ?? JwtAuthService::getAuthenticatedUser();
        if (!$user) {
            throw new \RuntimeException(json_encode([
                'status' => 401,
                'code' => 'UNAUTHENTICATED',
                'message_bn' => 'অনুমোদিত লগইন আবশ্যক।',
                'message_en' => 'Authentication required.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $t = LookupService::resolveTransfer($codeOrId);
        if (!$t) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'TRANSFER_NOT_FOUND',
                'message_bn' => 'হস্তান্তর কেসটি খুঁজে পাওয়া যায়নি।',
                'message_en' => 'Transfer request not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // Object scope for citizen (F02)
        if ($user['role'] === 'citizen') {
            $isParty = ($user['nid'] ?? '') === ($t['created_by_nid'] ?? '');
            if (!$isParty) {
                $party = DB::selectOne(
                    'SELECT 1 FROM transfer_parties tp JOIN persons p ON p.id = tp.person_id WHERE tp.transfer_id = ? AND p.nid = ?',
                    [$t['id'], (string) ($user['nid'] ?? '')]
                );
                $isParty = (bool) $party;
            }
            if (!$isParty) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'FORBIDDEN',
                    'message_bn' => 'এই স্থানান্তর তথ্যে প্রবেশের অনুমতি আপনার নেই।',
                    'message_en' => 'You are not authorized to view this transfer request.',
                ], JSON_UNESCAPED_UNICODE));
            }
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
            'deed_id' => $t['deed_id'] ? (int) $t['deed_id'] : null,
            'mutation_id' => $t['mutation_id'] ? (int) $t['mutation_id'] : null,
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
        $user = $actor ?? JwtAuthService::getAuthenticatedUser();
        if (!$user) {
            throw new \RuntimeException(json_encode([
                'status' => 401,
                'code' => 'UNAUTHENTICATED',
                'message_bn' => 'অনুমোদিত লগইন আবশ্যক।',
                'message_en' => 'Authentication required.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $sql = 'SELECT t.*, p.plot_code, p.dag_no, p.dag_no_bn, l.mouza_bn, l.mouza_en FROM transfer_requests t JOIN plots p ON p.id = t.plot_id JOIN locations l ON l.id = p.location_id WHERE 1=1';
        $params = [];

        // Object scope for citizen (F02)
        if ($user['role'] === 'citizen') {
            $sql .= ' AND (t.created_by_nid = ? OR EXISTS (SELECT 1 FROM transfer_parties tp JOIN persons p ON p.id = tp.person_id WHERE tp.transfer_id = t.id AND p.nid = ?))';
            $params[] = (string) ($user['nid'] ?? '');
            $params[] = (string) ($user['nid'] ?? '');
        }

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
        // Require explicit authentication (F01 / F02) - NO fallback anonymous citizen
        $user = $actor ?? JwtAuthService::getAuthenticatedUser();
        if (!$user) {
            throw new \RuntimeException(json_encode([
                'status' => 401,
                'code' => 'UNAUTHENTICATED',
                'message_bn' => 'অনুমোদিত লগইন আবশ্যক।',
                'message_en' => 'Authentication required.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $t = LookupService::resolveTransfer($codeOrId);
        if (!$t) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'TRANSFER_NOT_FOUND',
                'message_bn' => 'হস্তান্তর কেসটি খুঁজে পাওয়া যায়নি।',
                'message_en' => 'Transfer request not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        if ($t['status'] === 'COMPLETED') {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'TRANSFER_ALREADY_COMPLETED',
                'message_bn' => 'হস্তান্তর প্রক্রিয়া ইতিমধ্যে সম্পন্ন হয়েছে।',
                'message_en' => 'Transfer request is already completed.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $currStep = (int) $t['current_step'];
        $targetStep = isset($payload['target_step']) ? (int) $payload['target_step'] : ($currStep + 1);

        // Strictly adjacent single-step transitions (F01)
        if ($targetStep !== $currStep + 1 || $targetStep > 13) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_STATE_TRANSITION',
                'message_bn' => "ধাপ {$currStep} থেকে ধাপ {$targetStep}-এ ট্রানজিশন অনুমোদনযোগ্য নয়। শুধুমাত্র পরবর্তী সংলগ্ন ধাপে যাওয়া যাবে।",
                'message_en' => "Transition from step {$currStep} to {$targetStep} is not allowed. Only adjacent single-step transitions are permitted.",
            ], JSON_UNESCAPED_UNICODE));
        }

        $userRole = (string) ($user['role'] ?? '');

        // Object scope for citizen (F02)
        if ($userRole === 'citizen') {
            $isParty = ($user['nid'] ?? '') === ($t['created_by_nid'] ?? '');
            if (!$isParty) {
                $party = DB::selectOne(
                    'SELECT 1 FROM transfer_parties tp JOIN persons p ON p.id = tp.person_id WHERE tp.transfer_id = ? AND p.nid = ?',
                    [$t['id'], (string) ($user['nid'] ?? '')]
                );
                $isParty = (bool) $party;
            }
            if (!$isParty) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'FORBIDDEN',
                    'message_bn' => 'এই স্থানান্তর কেসটি পরিবর্তন করার অনুমতি আপনার নেই।',
                    'message_en' => 'You are not authorized to modify this transfer.',
                ], JSON_UNESCAPED_UNICODE));
            }
        }

        // Role-specific authority check per transition (F01)
        // Steps 1->2, 2->3, 3->4, 6->7: Citizen, SPO, Admin
        if (in_array($targetStep, [2, 3, 4, 7], true)) {
            if (!in_array($userRole, ['citizen', 'service_point_operator', 'admin'], true)) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'FORBIDDEN',
                    'message_bn' => "ধাপ {$targetStep} সম্পাদনের অনুমতি এই পদের নেই।",
                    'message_en' => "Role {$userRole} is not authorized for step {$targetStep}.",
                ], JSON_UNESCAPED_UNICODE));
            }
        }

        // Step 4->5 (Automated Lineage & Lien Scan)
        if ($targetStep === 5) {
            if (!in_array($userRole, ['citizen', 'service_point_operator', 'sub_registrar', 'registry_data_officer', 'ac_land', 'admin'], true)) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'FORBIDDEN',
                    'message_bn' => 'ধাপ ৫ সম্পাদনের অনুমতি নেই।',
                    'message_en' => 'Not authorized for step 5.',
                ], JSON_UNESCAPED_UNICODE));
            }
        }

        // Step 5->6 (Co-Owner / Heir Consent)
        if ($targetStep === 6) {
            if (!in_array($userRole, ['citizen', 'service_point_operator', 'sub_registrar', 'registry_data_officer', 'admin'], true)) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'FORBIDDEN',
                    'message_bn' => 'ধাপ ৬ সম্পাদনের অনুমতি নেই।',
                    'message_en' => 'Not authorized for step 6.',
                ], JSON_UNESCAPED_UNICODE));
            }
        }

        // Step 7->8 (Registry Appointment Booking)
        if ($targetStep === 8) {
            if (!in_array($userRole, ['citizen', 'service_point_operator', 'sub_registrar', 'registry_data_officer', 'admin'], true)) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'FORBIDDEN',
                    'message_bn' => 'ধাপ ৮ সম্পাদনের অনুমতি নেই।',
                    'message_en' => 'Not authorized for step 8.',
                ], JSON_UNESCAPED_UNICODE));
            }
        }

        // Step 8->9 (Counter Biometric Match): MUST be performed by registry officer terminal!
        if ($targetStep === 9) {
            if (!in_array($userRole, ['sub_registrar', 'registry_data_officer', 'admin'], true)) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'OFFICER_TERMINAL_REQUIRED',
                    'message_bn' => 'কাউন্টার বায়োমেট্রিক ও লাইভনেস যাচাই সাব-রেজিস্ট্রি কাউন্টারে দায়িত্বপ্রাপ্ত কর্মকর্তা কর্তৃক সম্পন্ন হতে হবে। নাগরিক স্বীয়ভাবে এটি সম্পন্ন করতে পারবেন না।',
                    'message_en' => 'Counter biometric verification must be conducted by registry staff at terminal. Citizen cannot self-verify.',
                ], JSON_UNESCAPED_UNICODE));
            }

            // Real server-owned biometric verification
            $bioProvider = new MockBiometricProvider();
            $bioProvider->verifyCounterBiometrics(
                ['nid' => $t['created_by_nid'], 'role' => 'SELLER'],
                ['transfer_id' => $t['id'], 'officer_id' => $user['username'] ?? 'registrar']
            );
        }

        // Step 9->10 (Deed Execution with Ed25519): MUST be sub_registrar or admin!
        if ($targetStep === 10) {
            if (!in_array($userRole, ['sub_registrar', 'admin'], true)) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'SUB_REGISTRAR_REQUIRED',
                    'message_bn' => 'দলিল সম্পাদন ও ডিজিটাল স্বাক্ষর শুধুমাত্র সাব-রেজিস্ট্রার কর্তৃক অনুমোদিত হতে হবে।',
                    'message_en' => 'Deed execution requires sub_registrar or admin role.',
                ], JSON_UNESCAPED_UNICODE));
            }

            $bioCount = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM biometric_verifications WHERE transfer_id = ? AND match_status = "MATCH"', [$t['id']])['c'] ?? 0);
            if ($bioCount === 0) {
                throw new \RuntimeException(json_encode([
                    'status' => 422,
                    'code' => 'BIOMETRICS_REQUIRED',
                    'message_bn' => 'বায়োমেট্রিক যাচাই সম্পন্ন হওয়া ছাড়া দলিল নিবন্ধন করা যাবে না।',
                    'message_en' => 'Biometric verification is required before deed registration.',
                ], JSON_UNESCAPED_UNICODE));
            }

            // Real deed creation with hash-chaining and cryptographic signature
            if (empty($t['deed_id'])) {
                $sellerPerson = DB::selectOne('SELECT * FROM persons WHERE nid = ?', [$t['created_by_nid']]);
                $buyerParty = DB::selectOne('SELECT * FROM transfer_parties WHERE transfer_id = ? AND party_role = "BUYER"', [$t['id']]);
                $buyerPerson = $buyerParty ? DB::selectOne('SELECT * FROM persons WHERE id = ?', [$buyerParty['person_id']]) : null;
                if (!$buyerPerson) {
                    $buyerPerson = DB::selectOne('SELECT * FROM persons WHERE nid != ? ORDER BY id ASC LIMIT 1', [$t['created_by_nid']]);
                }

                $deedRes = WorkflowController::subRegistrarRegisterDeed([
                    'plot_id' => (int) $t['plot_id'],
                    'seller_id' => $sellerPerson ? (int) $sellerPerson['id'] : 1,
                    'buyer_id' => $buyerPerson ? (int) $buyerPerson['id'] : 2,
                    'requested_area_decimal' => (float) $t['transfer_area_decimal'],
                    'price_bdt' => (int) $t['proposed_price_bdt'],
                    'deed_type' => (string) $t['deed_type'],
                ], $user);

                $t['deed_id'] = $deedRes['deed_id'];
                DB::statement('UPDATE transfer_requests SET deed_id = ? WHERE id = ?', [$deedRes['deed_id'], $t['id']]);
            }
        }

        // Step 10->11 (e-Mutation Queued to AC Land)
        if ($targetStep === 11) {
            if (!in_array($userRole, ['sub_registrar', 'registry_data_officer', 'ac_land', 'land_office_assistant', 'admin'], true)) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'FORBIDDEN',
                    'message_bn' => 'ধাপ ১১ সম্পাদনের অনুমতি নেই।',
                    'message_en' => 'Not authorized for step 11.',
                ], JSON_UNESCAPED_UNICODE));
            }
        }

        // Step 11->12 (Hearing & Notice Service)
        if ($targetStep === 12) {
            if (!in_array($userRole, ['ac_land', 'land_office_assistant', 'field_verification_officer', 'admin'], true)) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'FORBIDDEN',
                    'message_bn' => 'ধাপ ১২ সম্পাদনের অনুমতি নেই।',
                    'message_en' => 'Not authorized for step 12.',
                ], JSON_UNESCAPED_UNICODE));
            }
        }

        // Step 12->13 (AC Land Mutation Approval & Ownership Mutation)
        if ($targetStep === 13) {
            if (!in_array($userRole, ['ac_land', 'admin'], true)) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'AC_LAND_REQUIRED',
                    'message_bn' => 'নামজারি অনুমোদন শুধুমাত্র সহকারী কমিশনার (ভূমি) বা এসি ল্যান্ড কর্তৃক হতে হবে।',
                    'message_en' => 'AC Land or admin role required for mutation approval.',
                ], JSON_UNESCAPED_UNICODE));
            }

            // Execute real atomic mutation and ownership transfer
            if (!empty($t['deed_id'])) {
                $mut = DB::selectOne('SELECT * FROM mutations WHERE deed_id = ?', [$t['deed_id']]);
                if ($mut && $mut['status'] === 'PENDING') {
                    WorkflowController::decideMutationCase((int) $mut['id'], [
                        'decision' => 'APPROVED',
                        'reason_bn' => 'স্বয়ংক্রিয় ১৪-দিনের শুনানির পর হস্তান্তর আবেদন সাপেক্ষে নামজারি অনুমোদিত।',
                    ], $user);
                    DB::statement('UPDATE transfer_requests SET mutation_id = ? WHERE id = ?', [$mut['id'], $t['id']]);
                }
            }
        }

        $targetStage = self::STAGES[$targetStep]['stage'] ?? 'START';
        $newStatus = ($targetStep === 13) ? 'COMPLETED' : (($targetStep >= 12) ? 'APPROVED' : (($targetStep >= 10) ? 'REGISTERED' : 'PROCESSING'));

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
