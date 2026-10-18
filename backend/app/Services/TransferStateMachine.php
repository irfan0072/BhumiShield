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
        1 => ['stage'=>'START','name_bn'=>'আবেদনের খসড়া সংরক্ষিত','name_en'=>'Application draft saved'],
        2 => ['stage'=>'START','name_bn'=>'বিক্রেতা আবেদন নিশ্চিত করেছেন','name_en'=>'Seller confirmed application'],
        3 => ['stage'=>'START','name_bn'=>'পক্ষগুলোর তথ্য নিশ্চিত','name_en'=>'Parties information confirmed'],
        4 => ['stage'=>'VERIFY','name_bn'=>'ক্রেতা পরিমাণ ও শর্ত নিশ্চিত করেছেন','name_en'=>'Buyer confirmed area and terms'],
        5 => ['stage'=>'VERIFY','name_bn'=>'রেকর্ড পর্যালোচনার ধাপ','name_en'=>'Record review recorded'],
        6 => ['stage'=>'VERIFY','name_bn'=>'নিবন্ধনের প্রস্তুতি পর্যালোচিত','name_en'=>'Registration requirements reviewed'],
        7 => ['stage'=>'REGISTER','name_bn'=>'নিবন্ধনের জন্য প্রস্তুত','name_en'=>'Ready for registry review'],
        8 => ['stage'=>'REGISTER','name_bn'=>'রেজিস্ট্রি অফিসে পাঠানো হয়েছে','name_en'=>'Sent to registry office'],
        9 => ['stage'=>'REGISTER','name_bn'=>'কাউন্টারে পরিচয় যাচাই সম্পন্ন','name_en'=>'Counter identity check recorded'],
        10 => ['stage'=>'REVIEW','name_bn'=>'দলিল নিবন্ধিত ও নামজারি অপেক্ষমাণ','name_en'=>'Deed registered; mutation pending'],
        11 => ['stage'=>'REVIEW','name_bn'=>'নামজারি পর্যালোচনায় পাঠানো হয়েছে','name_en'=>'Sent for mutation review'],
        12 => ['stage'=>'REVIEW','name_bn'=>'শুনানির পর্যালোচনা সংরক্ষিত','name_en'=>'Hearing review recorded'],
        13 => ['stage'=>'DONE','name_bn'=>'স্থানীয় মালিকানা রেকর্ড হালনাগাদ','name_en'=>'Local ownership record updated'],
    ];

    public static function createTransfer(array $payload, ?array $actor = null): array
    {
        return DB::transaction(static fn(): array => self::createTransferInside($payload, $actor));
    }

    private static function createTransferInside(array $payload, ?array $actor): array
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
        if (!isset($payload['proposed_price_bdt']) || !is_numeric($payload['proposed_price_bdt']) || (float) $payload['proposed_price_bdt'] < 0 || !is_finite((float) $payload['proposed_price_bdt'])) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_PROPOSED_PRICE',
                'message_bn' => 'প্রস্তাবিত মূল্য শূন্য বা তার বেশি ধনাত্মক সংখ্যা হতে হবে।',
                'message_en' => 'Proposed price must be a non-negative finite integer.',
            ], JSON_UNESCAPED_UNICODE));
        }
        $price = (int) $payload['proposed_price_bdt'];

        // Plot resolution
        $plotId = (int) ($payload['plot_id'] ?? 0);
        $plot = LookupService::resolvePlot($payload['plot_code'] ?? $plotId);
        if (!$plot) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'PLOT_NOT_FOUND',
                'message_bn' => 'চিহ্নিত দাগ বা জমির প্লট পাওয়া যায়নি।',
                'message_en' => 'Specified plot not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // Plot encumbrance: Master Administrative Freeze by Super Admin
        if (!empty($plot['is_admin_frozen'])) {
            $freezeReason = $plot['admin_freeze_reason'] ?: 'আদালত বা তদন্ত স্থগিতাদেশ';
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'PLOT_ADMINISTRATIVELY_FROZEN',
                'message_bn' => "এই দাগে কেন্দ্রীয় প্রশাসনিক স্থগিতাদেশ কার্যকর রয়েছে ({$freezeReason})। কোনো হস্তান্তর আবেদন গ্রহণযোগ্য নয়।",
                'message_en' => 'This plot is under central administrative freeze by Super Admin. Cannot initiate transfer.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // Plot encumbrance: Citizen sale lock (F03)
        if (!empty($plot['owner_sale_locked'])) {
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

        if (!isset($user['is_identity_verified']) && !empty($user['username'])) {
            $dbU = DB::selectOne('SELECT is_identity_verified, nid FROM users WHERE username = ?', [$user['username']]);
            if ($dbU) {
                $user['is_identity_verified'] = (int) $dbU['is_identity_verified'];
                if (empty($user['nid'])) {
                    $user['nid'] = (string) $dbU['nid'];
                }
            }
        }

        if (empty($user['nid']) || (int) ($user['is_identity_verified'] ?? 0) !== 1) {
            self::fail(403, 'IDENTITY_REVIEW_REQUIRED', 'পরিচয় যাচাইয়ের পর আবেদন করুন।', 'Your identity must be reviewed before applying.');
        }

        $buyerNid = trim((string) ($payload['buyer_nid'] ?? ''));
        $buyerPerson = null;
        if ($buyerNid !== '') {
            $buyerPerson = DB::selectOne('SELECT p.* FROM persons p JOIN users u ON u.nid = p.nid WHERE p.nid = ? AND u.is_active = 1', [$buyerNid]);
            if (!$buyerPerson || $buyerNid === (string) $user['nid']) {
                self::fail(422, 'VERIFIED_BUYER_REQUIRED', 'পৃথক যাচাইকৃত ক্রেতার এনআইডি দিন।', 'Enter the national ID of a different, verified buyer.');
            }
        } else {
            $buyerPerson = DB::selectOne('SELECT p.* FROM persons p WHERE p.nid != ? ORDER BY p.id ASC LIMIT 1', [(string) ($user['nid'] ?? '')]);
        }

        $location = DB::selectOne('SELECT l.* FROM locations l JOIN plots p ON p.location_id = l.id WHERE p.id = ?', [(int) $plot['id']]);
        $office = DB::selectOne("SELECT id FROM offices WHERE is_active = 1 AND office_type = 'ac_land' AND district_en = ? AND upazila_en = ? ORDER BY id LIMIT 1", [$location['district_en'] ?? '', $location['upazila_en'] ?? '']);
        $homeOfficeId = $office ? (int) $office['id'] : 3;
        $cnt = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM transfer_requests')['c'] ?? 0);
        $transferCode = sprintf('TR-%s-%06d', gmdate('Y'), $cnt + 101);
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
                $homeOfficeId,
                'DRAFT',
                (string) $user['nid'],
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
                [$transferId, (int) $sellerPerson['id'], 'SELLER', '1/1', $sellerPerson['phone_dummy'] ?? '', 1, $now]
            );
        }

        // Associate buyer party if provided
        if (!empty($payload['buyer_nid'])) {
            $buyerPerson = DB::selectOne('SELECT * FROM persons WHERE nid = ?', [(string) $payload['buyer_nid']]);
            if ($buyerPerson) {
                DB::insert(
                    'INSERT INTO transfer_parties (transfer_id, person_id, party_role, share_fraction, phone_dummy, is_verified, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [$transferId, (int) $buyerPerson['id'], 'BUYER', '1/1', $buyerPerson['phone_dummy'] ?? '', 1, $now]
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

        self::requireScope($t, $user);

        $plot = DB::selectOne('SELECT p.*, l.mouza_bn, l.mouza_en, l.upazila_bn, l.upazila_en, l.district_bn, l.district_en FROM plots p JOIN locations l ON l.id = p.location_id WHERE p.id = ?', [$t['plot_id']]);
        $events = DB::select('SELECT * FROM transfer_events WHERE transfer_id = ? ORDER BY id ASC', [$t['id']]);
        $parties = DB::select('SELECT tp.*, p.name_bn, p.name_en, p.nid FROM transfer_parties tp JOIN persons p ON p.id = tp.person_id WHERE tp.transfer_id = ?', [$t['id']]);
        $biometrics = DB::select('SELECT id, transaction_id, party_nid, party_role, modality, match_status, match_score, terminal_id, verified_at, notes_bn FROM biometric_verifications WHERE transfer_id = ?', [$t['id']]);

        $step = (int) $t['current_step'];
        $stepInfo = self::STAGES[$step] ?? ['stage' => 'START', 'name_bn' => 'অজ্ঞাত ধাপ', 'name_en' => 'Unknown Step'];

        $sellerParty = array_values(array_filter($parties, static fn(array $p): bool => ($p['party_role'] ?? '') === 'SELLER'))[0] ?? null;
        $buyerParty = array_values(array_filter($parties, static fn(array $p): bool => ($p['party_role'] ?? '') === 'BUYER'))[0] ?? null;

        $result = [
            'id' => (int) $t['id'],
            'transfer_code' => $t['transfer_code'],
            'tracking_number' => $t['transfer_code'],
            'tracking_code' => $t['transfer_code'],
            'created_by_nid' => (string) ($t['created_by_nid'] ?? ($sellerParty['nid'] ?? '')),
            'seller_nid' => (string) ($sellerParty['nid'] ?? ($t['created_by_nid'] ?? '')),
            'seller_name_bn' => (string) ($sellerParty['name_bn'] ?? 'বিক্রেতা'),
            'buyer_nid' => (string) ($buyerParty['nid'] ?? ''),
            'buyer_name_bn' => (string) ($buyerParty['name_bn'] ?? 'ক্রেতা'),
            'plot_id' => (int) $t['plot_id'],
            'dag_no' => $plot ? ($plot['dag_no'] ?? '') : '',
            'dag_no_bn' => $plot ? ($plot['dag_no_bn'] ?? '') : '',
            'khatian_no' => $plot ? ($plot['khatian_no'] ?? '') : '',
            'mouza_bn' => $plot ? ($plot['mouza_bn'] ?? '') : '',
            'viewer_is_seller' => ($user['role'] === 'citizen' && ($user['nid'] ?? '') === ($t['created_by_nid'] ?? ($sellerParty['nid'] ?? ''))),
            'viewer_is_buyer' => ($user['role'] === 'citizen' && (bool)array_filter($parties, static fn($p) => $p['party_role']==='BUYER' && $p['nid']===($user['nid']??''))),
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

        // A06: Gate DCR and Porcha strictly on verified completion and approved mutation
        if ($t['status'] === 'COMPLETED' && !empty($t['mutation_id'])) {
            $mutation = DB::selectOne('SELECT * FROM mutations WHERE id = ?', [$t['mutation_id']]);
            $buyerParty = array_values(array_filter($parties, static fn($p) => ($p['party_role'] ?? '') === 'BUYER'))[0] ?? null;
            $sellerParty = array_values(array_filter($parties, static fn($p) => ($p['party_role'] ?? '') === 'SELLER'))[0] ?? null;
            $buyerNameBn = $buyerParty['name_bn'] ?? ($buyerParty['name_en'] ?? 'আবেদনকারী / ক্রেতা');
            $buyerNid = $buyerParty['nid'] ?? '';
            $sellerNameBn = $sellerParty['name_bn'] ?? ($sellerParty['name_en'] ?? 'সাবেক মালিক / বিক্রেতা');

            $mutCaseNo = $mutation['case_number'] ?? ('MUT-' . (!empty($plot['upazila_en']) ? strtoupper(substr($plot['upazila_en'], 0, 3)) : 'SAV') . '-' . date('Y') . '-' . str_pad((string) $t['id'], 4, '0', STR_PAD_LEFT));

            $result['dcr'] = [
                'dcr_number' => 'DCR-' . date('Y') . '-' . str_pad((string) $t['id'], 6, '0', STR_PAD_LEFT),
                'mutation_case_no' => $mutCaseNo,
                'applicant_name_bn' => $buyerNameBn,
                'applicant_nid' => $buyerNid,
                'seller_name_bn' => $sellerNameBn,
                'court_fee_bdt' => 20,
                'notice_fee_bdt' => 50,
                'record_correction_dcr_fee_bdt' => 1100,
                'total_fee_bdt' => 1170,
                'payment_status' => 'PAID',
                'payment_trx_id' => 'TXN-DCR-' . strtoupper(substr(md5($t['transfer_code'] . '|' . $t['id']), 0, 10)),
                'issuing_office_bn' => ($plot['upazila_bn'] ?? 'সাভার') . ' উপজেলা ভূমি অফিস',
                'issued_at' => $mutation['approved_at'] ?? ($t['updated_at'] ?? gmdate('c')),
            ];

            $result['khatian_porcha'] = [
                'porcha_number' => 'BS-' . ($plot['khatian_no_bn'] ?? ($plot['khatian_no'] ?? '৭৮৬')),
                'survey_type' => 'BS (বাংলাদেশ সার্ভে)',
                'district_bn' => $plot['district_bn'] ?? 'ঢাকা',
                'upazila_bn' => $plot['upazila_bn'] ?? 'সাভার',
                'mouza_bn' => $plot['mouza_bn'] ?? 'বিরুলিয়া',
                'jl_no' => $plot['jl_no'] ?? '৮৯',
                'dag_no' => $plot['dag_no_bn'] ?? ($plot['dag_no'] ?? '১০১'),
                'khatian_no' => $plot['khatian_no_bn'] ?? ($plot['khatian_no'] ?? '৭৮৬'),
                'land_class_bn' => $plot['land_class_bn'] ?? 'নাল',
                'transferred_area_decimal' => (float) $t['transfer_area_decimal'],
                'owner_name_bn' => $buyerNameBn,
                'owner_nid' => $buyerNid,
                'former_owner_name_bn' => $sellerNameBn,
                'qr_verification_hash' => hash('sha256', ($t['transfer_code'] ?? 'TR') . '|' . $t['id'] . '|BS_PORCHA'),
                'issued_at' => $mutation['approved_at'] ?? ($t['updated_at'] ?? gmdate('c')),
            ];
        }

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

        $rows = array_values(array_filter($rows, static fn(array $r): bool => self::canView($r, $user)));

        $items = array_map(static function (array $r): array {
            $step = (int) $r['current_step'];
            $stInfo = self::STAGES[$step] ?? ['stage' => 'START', 'name_bn' => 'ধাপ ' . $step, 'name_en' => 'Step ' . $step];
            $r['step_name_bn'] = $stInfo['name_bn'];
            $r['step_name_en'] = $stInfo['name_en'];
            $r['transfer_code'] = (string) ($r['transfer_code'] ?? '');
            $r['tracking_number'] = $r['transfer_code'];
            $r['tracking_code'] = $r['transfer_code'];
            return PublicRecordService::forViewer($r);
        }, $rows);

        return ['items' => $items, 'total' => count($items)];
    }

    public static function advanceStep(string|int $codeOrId, array $payload, ?array $actor = null): array
    {
        return DB::transaction(static fn(): array => self::advanceStepInside($codeOrId, $payload, $actor));
    }

    private static function advanceStepInside(string|int $codeOrId, array $payload, ?array $actor): array
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

        self::requireScope($t, $user);
        $userRole = (string) ($user['role'] ?? '');
        if ($targetStep === 4) {
            $buyer = DB::selectOne(
                'SELECT p.nid, p.name_bn, p.name_en FROM transfer_parties tp JOIN persons p ON p.id = tp.person_id WHERE tp.transfer_id = ? AND tp.party_role = ?',
                [$t['id'], 'BUYER']
            );
            if (!$buyer || empty($buyer['nid'])) {
                self::fail(422, 'BUYER_PARTY_NOT_FOUND', 'স্থানান্তর কেসে কোনো নিবন্ধিত ক্রেতা পাওয়া যায়নি।', 'Registered buyer party not found for this transfer.');
            }
            if ($userRole === 'citizen') {
                if (($user['nid'] ?? '') !== $buyer['nid']) {
                    self::fail(403, 'BUYER_CONFIRMATION_REQUIRED', 'ক্রেতাকে নিজের অ্যাকাউন্ট থেকে পরিমাণ ও শর্ত নিশ্চিত করতে হবে। বিক্রেতা বা অন্য নাগরিক ক্রেতার হয়ে নিশ্চিত করতে পারবেন না।', 'The buyer must confirm the area and terms from their own account. The seller cannot confirm on the buyer\'s behalf.');
                }
            }
        } elseif ($userRole === 'citizen' && ($user['nid'] ?? '') !== $t['created_by_nid']) {
            $isParty = (bool) DB::selectOne('SELECT 1 FROM transfer_parties tp JOIN persons p ON p.id = tp.person_id WHERE tp.transfer_id = ? AND p.nid = ?', [$t['id'], $user['nid'] ?? '']);
            if (!$isParty) {
                self::fail(403, 'SELLER_ACTION_REQUIRED', 'এই ধাপটি বিক্রেতার জন্য।', 'This action belongs to the seller.');
            }
        }

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

        // Role-specific authority check per transition (F01 / A15)
        // Steps 1->2, 2->3, 3->4, 6->7: Citizen, SPO, Admin, System Admin
        if (in_array($targetStep, [2, 3, 4, 7], true)) {
            if (!in_array($userRole, ['citizen', 'service_point_operator', 'admin', 'system_admin'], true)) {
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
            if (!in_array($userRole, ['citizen', 'service_point_operator', 'sub_registrar', 'registry_data_officer', 'ac_land', 'admin', 'system_admin'], true)) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'FORBIDDEN',
                    'message_bn' => 'ধাপ ৫ সম্পাদনের অনুমতি নেই।',
                    'message_en' => 'Not authorized for step 5.',
                ], JSON_UNESCAPED_UNICODE));
            }
            $plotEncumbrance = DB::selectOne(
                "SELECT p.is_admin_frozen, p.admin_freeze_reason,
                        (SELECT COUNT(*) FROM disputes WHERE plot_id = p.id AND status IN ('OPEN', 'HEARING', 'UPHELD_FROZEN')) AS dispute_count
                 FROM plots p WHERE p.id = ?",
                [$t['plot_id']]
            );
            if (!empty($plotEncumbrance['is_admin_frozen'])) {
                self::fail(422, 'PLOT_ADMIN_FROZEN', 'এই দাগে প্রশাসনিক স্থগিতাদেশ বহাল থাকায় রেকর্ড প্রি-চেক ব্যর্থ হয়েছে।', 'Pre-check failed: plot is administratively frozen.');
            }
            if ((int) ($plotEncumbrance['dispute_count'] ?? 0) > 0) {
                self::fail(422, 'PLOT_UNDER_DISPUTE', 'এই দাগে দেওয়ানি বিরোধ বা মামলা বিচারাধীন থাকায় রেকর্ড প্রি-চেক উত্তীর্ণ হয়নি।', 'Pre-check failed: plot has pending disputes.');
            }
        }

        // Step 5->6 (Co-Owner / Heir Consent)
        if ($targetStep === 6) {
            if (!in_array($userRole, ['citizen', 'service_point_operator', 'sub_registrar', 'registry_data_officer', 'admin', 'system_admin'], true)) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'FORBIDDEN',
                    'message_bn' => 'ধাপ ৬ সম্পাদনের অনুমতি নেই।',
                    'message_en' => 'Not authorized for step 6.',
                ], JSON_UNESCAPED_UNICODE));
            }
            $coOwnerCount = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM ownerships WHERE plot_id = ? AND is_latest = 1', [$t['plot_id']])['c'] ?? 0);
            if ($coOwnerCount > 1 && empty($payload['consent_confirmed'])) {
                self::fail(422, 'CO_OWNER_CONSENT_REQUIRED', 'যৌথ মালিকানাধীন জমির ক্ষেত্রে সহ-মালিকানা বা ওয়ারিশ সম্মতি নিশ্চিতকরণ আবশ্যক। শুধুমাত্র নোট দিয়ে সম্মতি নিশ্চিতকরণ এড়ানো যাবে না।', 'Co-owner consent confirmation is required for jointly-owned plots. Notes cannot substitute for consent confirmation.');
            }
        }

        // Step 7->8 (Registry Appointment Booking)
        if ($targetStep === 8) {
            if (!in_array($userRole, ['citizen', 'service_point_operator', 'sub_registrar', 'registry_data_officer', 'admin', 'system_admin'], true)) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'FORBIDDEN',
                    'message_bn' => 'ধাপ ৮ সম্পাদনের অনুমতি নেই।',
                    'message_en' => 'Not authorized for step 8.',
                ], JSON_UNESCAPED_UNICODE));
            }
            $requestedDate = trim((string) ($payload['appointment_date'] ?? ''));
            if ($requestedDate !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $requestedDate)) {
                self::fail(422, 'INVALID_APPOINTMENT_DATE', 'সঠিক তারিখ (YYYY-MM-DD) নির্বাচন করুন।', 'Provide a valid appointment date in YYYY-MM-DD format.');
            }
        }

        // Step 8->9 (Counter Biometric Match): MUST be performed by registry officer terminal!
        if ($targetStep === 9) {
            if (!in_array($userRole, ['sub_registrar', 'registry_data_officer', 'admin', 'system_admin'], true)) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'OFFICER_TERMINAL_REQUIRED',
                    'message_bn' => 'কাউন্টার বায়োমেট্রিক ও লাইভনেস যাচাই সাব-রেজিস্ট্রি কাউন্টারে দায়িত্বপ্রাপ্ত কর্মকর্তা কর্তৃক সম্পন্ন হতে হবে। নাগরিক স্বীয়ভাবে এটি সম্পন্ন করতে পারবেন না।',
                    'message_en' => 'Counter biometric verification must be conducted by registry staff at terminal. Citizen cannot self-verify.',
                ], JSON_UNESCAPED_UNICODE));
            }

            // Test adapter is explicit; an unconfigured usable app fails closed.
            ProviderManager::requireTestProvider('BIOMETRIC_DRIVER');
            $bioProvider = new MockBiometricProvider();
            $bioProvider->verifyCounterBiometrics(
                ['nid' => $t['created_by_nid'], 'role' => 'SELLER'],
                ['transfer_id' => $t['id'], 'officer_id' => $user['username'] ?? 'registrar']
            );
        }

        // Step 9->10 (Deed Execution with Ed25519): MUST be sub_registrar or admin!
        if ($targetStep === 10) {
            if (!in_array($userRole, ['sub_registrar', 'admin', 'system_admin'], true)) {
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

            // A03: Real deed creation with hash-chaining and cryptographic signature, binding intended BUYER and SELLER
            if (empty($t['deed_id'])) {
                $buyerParty = DB::selectOne(
                    'SELECT tp.*, p.id AS person_id, p.nid, p.name_bn, p.name_en
                     FROM transfer_parties tp
                     JOIN persons p ON p.id = tp.person_id
                     WHERE tp.transfer_id = ? AND tp.party_role = ?',
                    [$t['id'], 'BUYER']
                );
                $sellerParty = DB::selectOne(
                    'SELECT tp.*, p.id AS person_id, p.nid, p.name_bn, p.name_en
                     FROM transfer_parties tp
                     JOIN persons p ON p.id = tp.person_id
                     WHERE tp.transfer_id = ? AND tp.party_role = ?',
                    [$t['id'], 'SELLER']
                );

                if (!$buyerParty || empty($buyerParty['person_id'])) {
                    self::fail(422, 'BUYER_PARTY_REQUIRED', 'দলিল সম্পাদনের জন্য হস্তান্তরের নিবন্ধিত ক্রেতার তথ্য আবশ্যক।', 'A verified buyer party is required for deed execution.');
                }
                $buyerPerson = DB::selectOne('SELECT * FROM persons WHERE id = ?', [$buyerParty['person_id']]);

                $sellerPerson = $sellerParty ? DB::selectOne('SELECT * FROM persons WHERE id = ?', [$sellerParty['person_id']]) : null;
                if (!$sellerPerson && !empty($t['created_by_nid'])) {
                    $sellerPerson = DB::selectOne('SELECT * FROM persons WHERE nid = ?', [$t['created_by_nid']]);
                }

                if (!$buyerPerson || !$sellerPerson) {
                    self::fail(422, 'PARTIES_REQUIRED', 'ক্রেতা ও বিক্রেতার যাচাইকৃত তথ্য নিশ্চিত করা সম্ভব হয়নি।', 'Verified buyer and seller records could not be resolved from transfer parties.');
                }

                $deedRes = WorkflowController::subRegistrarRegisterDeed([
                    'plot_id' => (int) $t['plot_id'],
                    'seller_id' => (int) $sellerPerson['id'],
                    'buyer_id' => (int) $buyerPerson['id'],
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
            if (!in_array($userRole, ['sub_registrar', 'registry_data_officer', 'ac_land', 'land_office_assistant', 'admin', 'system_admin'], true)) {
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
            if (!in_array($userRole, ['ac_land', 'land_office_assistant', 'field_verification_officer', 'admin', 'system_admin'], true)) {
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
            if (!in_array($userRole, ['ac_land', 'admin', 'system_admin'], true)) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'AC_LAND_REQUIRED',
                    'message_bn' => 'নামজারি অনুমোদন শুধুমাত্র সহকারী কমিশনার (ভূমি) বা এসি ল্যান্ড কর্তৃক হতে হবে।',
                    'message_en' => 'AC Land or admin role required for mutation approval.',
                ], JSON_UNESCAPED_UNICODE));
            }

            if (empty($t['deed_id'])) self::fail(422, 'REGISTERED_DEED_REQUIRED', 'নিবন্ধিত দলিল ছাড়া আবেদন সম্পন্ন হবে না।', 'A registered deed is required before completion.');
            // Execute real atomic mutation and ownership transfer
            if (!empty($t['deed_id'])) {
                $mut = DB::selectOne('SELECT * FROM mutations WHERE deed_id = ?', [$t['deed_id']]);
                if ($mut && $mut['status'] === 'PENDING') {
                    WorkflowController::decideMutationCase((int) $mut['id'], [
                        'decision' => 'APPROVED',
                        'reason_bn' => trim((string) ($payload['notes_bn'] ?? '')),
                        'reason_en' => trim((string) ($payload['notes_bn'] ?? '')),
                    ], $user);
                    DB::statement('UPDATE transfer_requests SET mutation_id = ? WHERE id = ?', [$mut['id'], $t['id']]);
                }
            }
        }

        if ($targetStep === 13) {
            $approved = DB::selectOne("SELECT id FROM mutations WHERE deed_id = ? AND status = 'APPROVED'", [$t['deed_id']]);
            if (!$approved) self::fail(422, 'APPROVED_MUTATION_REQUIRED', 'অনুমোদিত নামজারি ছাড়া আবেদন সম্পন্ন হবে না।', 'An approved mutation is required before completion.');
            DB::statement('UPDATE transfer_requests SET mutation_id = ? WHERE id = ?', [$approved['id'], $t['id']]);
        }
        $targetStage = self::STAGES[$targetStep]['stage'] ?? 'START';
        $newStatus = ($targetStep === 13) ? 'COMPLETED' : (($targetStep >= 10) ? 'REGISTERED' : 'PROCESSING');

        $now = gmdate('c');
        DB::statement(
            'UPDATE transfer_requests SET current_step = ?, public_stage = ?, status = ?, updated_at = ? WHERE id = ?',
            [$targetStep, $targetStage, $newStatus, $now, $t['id']]
        );

        $actionName = "STEP_{$targetStep}_ADVANCED";
        $note = trim((string) ($payload['notes_bn'] ?? '')) ?: self::STAGES[$targetStep]['name_en'];

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

    private static function fail(int $status, string $code, string $bn, string $en): never
    {
        throw new \RuntimeException(json_encode(['status'=>$status,'code'=>$code,'message_bn'=>$bn,'message_en'=>$en], JSON_UNESCAPED_UNICODE));
    }

    private static function requireScope(array $transfer, array $user): void
    {
        if (!self::canView($transfer, $user)) self::fail(403, 'CASE_SCOPE_REQUIRED', 'এই আবেদনটি আপনার দায়িত্বের অন্তর্ভুক্ত নয়।', 'This application is outside your authorized case or office scope.');
    }

    private static function canView(array $transfer, array $user): bool
    {
        $role = $user['role'] ?? '';
        if (in_array($role, ['admin', 'system_admin', 'auditor'], true)) return true;
        if ($role === 'citizen') {
            if ((string) ($user['nid'] ?? '') === (string) ($transfer['created_by_nid'] ?? '')) return true;
            return (bool) DB::selectOne('SELECT 1 FROM transfer_parties tp JOIN persons p ON p.id = tp.person_id WHERE tp.transfer_id = ? AND p.nid = ?', [$transfer['id'], $user['nid'] ?? '']);
        }

        $plotId = (int) ($transfer['plot_id'] ?? 0);
        if ($plotId <= 0) {
            return false;
        }

        return OfficeScopeService::canAccessPlot($plotId, $user);
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
                $notesBn,
                json_encode(['event_type' => $eventType], JSON_UNESCAPED_UNICODE),
                gmdate('c'),
            ]
        );
    }
}
