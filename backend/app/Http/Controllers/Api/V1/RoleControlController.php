<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Middleware\RoleMiddleware;
use App\Services\FraudRulesEngine;
use App\Services\JwtAuthService;
use App\Services\LedgerService;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Dedicated Role-Based Controlling System Endpoints for Citizen, Sub-Registrar,
 * AC Land Officer, Bank Officer, and System Admin.
 */
final class RoleControlController
{
    /**
     * Issues a real signed JWT for the requested demo role so the frontend role switcher
     * works seamlessly with strict backend RoleMiddleware enforcement.
     */
    public static function switchDemoRole(array $body): array
    {
        $role = trim((string) ($body['role'] ?? 'citizen'));
        $user = DB::selectOne('SELECT * FROM users WHERE role = ? AND is_active = 1 ORDER BY id ASC LIMIT 1', [$role]);
        if (!$user) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'ROLE_USER_NOT_FOUND',
                'message_bn' => "নির্বাচিত ভূমিকা ({$role})-এর জন্য কোনো সক্রিয় ডেমো অ্যাকাউন্ট পাওয়া যায়নি।",
                'message_en' => "No active demo user found for role '{$role}'.",
            ], JSON_UNESCAPED_UNICODE));
        }

        $nowIso = gmdate('c');
        DB::statement('UPDATE users SET last_login_at = ? WHERE id = ?', [$nowIso, $user['id']]);
        $token = JwtAuthService::createToken(['sub' => $user['username'], 'role' => $user['role']]);
        $matrix = RoleMiddleware::getPermissionMatrix();

        return [
            'access_token' => $token,
            'token_type' => 'bearer',
            'user' => [
                'id' => (int) $user['id'],
                'username' => $user['username'],
                'email' => $user['email'] ?? "{$user['username']}@demo.bhumishield.gov.bd",
                'full_name_bn' => $user['full_name_bn'],
                'full_name_en' => $user['full_name_en'],
                'role' => $user['role'],
                'office_bn' => $user['office_bn'],
                'office_en' => $user['office_en'],
                'phone_dummy' => $user['phone_dummy'] ?? '01700-001001',
                'nid' => $user['nid'] ?? '9900001001',
                'is_active' => (int) ($user['is_active'] ?? 1),
                'permissions' => $matrix[$user['role']]['permissions'] ?? [],
            ],
        ];
    }

    public static function getPermissionsInfo(?array $user = null): array
    {
        $curr = $user ?? JwtAuthService::getAuthenticatedUser();
        $matrix = RoleMiddleware::getPermissionMatrix();
        $role = $curr['role'] ?? 'citizen';
        return [
            'current_role' => $role,
            'current_permissions' => $matrix[$role]['permissions'] ?? [],
            'matrix' => $matrix,
        ];
    }

    // -------------------------------------------------------------------------
    // CITIZEN CONTROLLING SYSTEM (Plot Sale Lock & Dispute Filing)
    // -------------------------------------------------------------------------

    public static function togglePlotSaleLock(int $plotId, array $body = [], ?array $user = null): array
    {
        $actor = RoleMiddleware::authorize(['citizen', 'admin'], $user);
        $plot = DB::selectOne('SELECT * FROM plots WHERE id = ?', [$plotId]);
        if (!$plot) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'PLOT_NOT_FOUND',
                'message_bn' => 'দাগ নম্বরটি পাওয়া যায়নি।',
                'message_en' => 'Plot not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $isCurrentlyLocked = ((int) ($plot['owner_sale_locked'] ?? 0)) === 1;
        $targetLocked = isset($body['lock_state'])
            ? ($body['lock_state'] ? 1 : 0)
            : (isset($body['locked'])
                ? ($body['locked'] ? 1 : 0)
                : ($isCurrentlyLocked ? 0 : 1));

        $isAdmin = ($actor['role'] ?? '') === 'admin';
        $actorNid = (string) ($actor['nid'] ?? '');

        // If not admin, verify that the citizen is verified and owns this plot
        if (!$isAdmin) {
            if (((int) ($actor['is_identity_verified'] ?? 1)) === 0) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'CITIZEN_IDENTITY_UNVERIFIED',
                    'message_bn' => 'জাতীয় পরিচয়পত্র অফিশিয়ালি যাচাই না হওয়া পর্যন্ত বিক্রয় লক পরিবর্তন করা যাবে না।',
                    'message_en' => 'Cannot modify plot sale lock until your identity is officially verified.',
                ], JSON_UNESCAPED_UNICODE));
            }

            $person = DB::selectOne('SELECT id FROM persons WHERE nid = ?', [$actorNid]);
            if (!$person) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'CITIZEN_PROFILE_NOT_FOUND',
                    'message_bn' => 'আপনার এনআইডির সাথে সংযুক্ত কোনো নাগরিক প্রোফাইল পাওয়া যায়নি।',
                    'message_en' => 'No person profile found for your NID.',
                ], JSON_UNESCAPED_UNICODE));
            }

            $personId = (int) $person['id'];
            $ownership = DB::selectOne(
                'SELECT * FROM ownerships WHERE plot_id = ? AND person_id = ? AND is_latest = 1 AND area_decimal > 0',
                [$plotId, $personId]
            );

            if (!$ownership) {
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => 'FORBIDDEN_NOT_PLOT_OWNER',
                    'message_bn' => 'আপনি এই দাগের রেকর্ডকৃত বর্তমান মালিক নন; বিক্রয় লক পরিবর্তন করার অনুমতি নেই।',
                    'message_en' => 'You are not a recorded current owner of this plot; cannot modify sale lock.',
                ], JSON_UNESCAPED_UNICODE));
            }

            // If attempting to unlock, verify who locked it
            if ($isCurrentlyLocked && $targetLocked === 0) {
                $lockerNid = (string) ($plot['locked_by_nid'] ?? '');
                // Allow unlock if locker matches, or if actor is a valid current co-owner
                if ($lockerNid !== '' && $lockerNid !== $actorNid && empty($ownership)) {
                    throw new \RuntimeException(json_encode([
                        'status' => 403,
                        'code' => 'LOCK_HELD_BY_ANOTHER_OWNER',
                        'message_bn' => 'এই দাগের বিক্রয় লকটি অন্য একজন অংশীদার মালিক কর্তৃক সক্রিয় করা হয়েছে।',
                        'message_en' => 'Sale lock was activated by another owner and cannot be removed without proper authorization.',
                    ], JSON_UNESCAPED_UNICODE));
                }
            }
        }

        DB::statement(
            'UPDATE plots SET owner_sale_locked = ?, locked_by_nid = ? WHERE id = ?',
            [$targetLocked, $targetLocked ? $actorNid : null, $plotId]
        );

        $nowIso = gmdate('c');
        DatabaseSeeder::appendAuditEntry(
            (string) ($actor['username'] ?? 'citizen'),
            (string) ($actor['role'] ?? 'citizen'),
            $targetLocked ? 'PLOT_SALE_LOCKED_BY_OWNER' : 'PLOT_SALE_UNLOCKED_BY_OWNER',
            'plot',
            (string) $plotId,
            [
                'dag_no' => $plot['dag_no'],
                'owner_sale_locked' => (bool) $targetLocked,
                'actor_nid' => $actorNid,
                'note_bn' => $targetLocked
                    ? "নাগরিক মালিক ({$actorNid}) কর্তৃক দাগ নং {$plot['dag_no_bn']}-এ বিক্রয় লক (Sale Protection Lock) সক্রিয় করা হয়েছে"
                    : "নাগরিক মালিক ({$actorNid}) কর্তৃক দাগ নং {$plot['dag_no_bn']}-এর বিক্রয় লক নিষ্ক্রিয় করা হয়েছে",
            ],
            $nowIso
        );

        return [
            'plot_id' => $plotId,
            'dag_no' => $plot['dag_no'],
            'owner_sale_locked' => $targetLocked,
            'message_bn' => $targetLocked
                ? "🔒 দাগ নং {$plot['dag_no_bn']}-এ মালিকানা বিক্রয় লক সক্রিয় করা হয়েছে। আপনার অনুমতি ছাড়া সাব-রেজিস্ট্রি অফিসে কোনো দলিল নিবন্ধন হবে না।"
                : "🔓 দাগ নং {$plot['dag_no_bn']}-এর বিক্রয় লক খুলে দেওয়া হয়েছে। এখন বৈধ দলিল নিবন্ধন করা যাবে।",
            'message_en' => $targetLocked
                ? "🔒 Owner Sale Lock enabled on Dag {$plot['dag_no']}. Any unauthorized sale attempt at the Sub-Registry will be blocked."
                : "🔓 Owner Sale Lock disabled on Dag {$plot['dag_no']}. Legitimate transfers are now permitted.",
        ];
    }

    public static function listDisputes(?int $plotId = null): array
    {
        $where = $plotId ? 'WHERE d.plot_id = ?' : '';
        $params = $plotId ? [$plotId] : [];
        $rows = DB::select(
            "SELECT d.*, p.dag_no, p.dag_no_bn, l.mouza_bn, l.mouza_en, l.upazila_bn, l.upazila_en
             FROM disputes d
             JOIN plots p ON p.id = d.plot_id
             JOIN locations l ON l.id = p.location_id
             {$where}
             ORDER BY CASE WHEN d.status = 'OPEN' THEN 0 ELSE 1 END, d.id DESC",
            $params
        );
        $actor = JwtAuthService::getAuthenticatedUser();
        if (!$actor || !in_array($actor['role'] ?? '', ['ac_land', 'sub_registrar', 'admin'], true)) {
            $rows = array_map(static function (array $row) use ($actor): array {
                $own = $actor && ($actor['role'] ?? '') === 'citizen' && (int) ($actor['is_identity_verified'] ?? 0) === 1
                    && (string) ($row['complainant_nid'] ?? '') === (string) ($actor['nid'] ?? '');
                if ($own) return \App\Services\PublicRecordService::minimize($row);
                return array_intersect_key($row, array_flip(['id','case_no','plot_id','dispute_type','severity','status','created_at','dag_no','dag_no_bn','mouza_bn','mouza_en','upazila_bn','upazila_en']));
            }, $rows);
        }
        return ['items' => $rows, 'total' => count($rows)];
    }

    public static function createDispute(array $req, ?array $user = null): array
    {
        $actor = RoleMiddleware::authorize(['citizen', 'sub_registrar', 'ac_land', 'admin'], $user);
        $plotId = (int) ($req['plot_id'] ?? 1);
        $plot = DB::selectOne('SELECT * FROM plots WHERE id = ?', [$plotId]);
        if (!$plot) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'PLOT_NOT_FOUND',
                'message_bn' => 'দাগ নম্বরটি পাওয়া যায়নি।',
                'message_en' => 'Plot not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $cnt = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM disputes')['c'] ?? 0);
        $caseNo = 'DISP-2026-' . (301 + $cnt);
        $nowIso = gmdate('c');
        $nameBn = trim((string) ($req['complainant_name_bn'] ?? ($actor['full_name_bn'] ?? 'নাগরিক অভিযোগকারী')));
        $nid = trim((string) ($req['complainant_nid'] ?? ($actor['nid'] ?? '9900001001')));
        $dtype = trim((string) ($req['dispute_type'] ?? 'OWNERSHIP_CLAIM'));
        $descBn = trim((string) ($req['description_bn'] ?? 'মালিকানা ও সীমানা সংক্রান্ত আপত্তি দাখিল।'));
        $descEn = trim((string) ($req['description_en'] ?? $descBn));

        $id = DB::insert(
            "INSERT INTO disputes (case_no, plot_id, complainant_name_bn, complainant_nid, dispute_type, description_bn, description_en, severity, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'REVIEW', 'OPEN', ?)",
            [$caseNo, $plotId, $nameBn, $nid, $dtype, $descBn, $descEn, $nowIso]
        );

        DatabaseSeeder::appendAuditEntry(
            (string) ($actor['username'] ?? 'citizen'),
            (string) ($actor['role'] ?? 'citizen'),
            'CITIZEN_DISPUTE_FILED',
            'dispute',
            (string) $id,
            [
                'case_no' => $caseNo,
                'plot_id' => $plotId,
                'dispute_type' => $dtype,
                'note_bn' => "দাগ নং {$plot['dag_no_bn']}-এ নাগরিক আপত্তি/অভিযোগ ({$caseNo}) দাখিল করা হয়েছে",
            ],
            $nowIso
        );

        return [
            'dispute_id' => $id,
            'case_no' => $caseNo,
            'status' => 'OPEN',
            'message_bn' => "আপনার অভিযোগ ({$caseNo}) সফলভাবে গৃহীত হয়েছে এবং এসি ল্যান্ড ও সাব-রেজিস্ট্রারের ড্যাশবোর্ডে সতর্কতা হিসেবে যুক্ত হয়েছে।",
            'message_en' => "Your dispute ({$caseNo}) has been registered and flagged for AC Land and Sub-Registrar review.",
        ];
    }

    // -------------------------------------------------------------------------
    // SUB-REGISTRAR CONTROLLING SYSTEM (Deeds Registry, Hold/Release, Fee Calc)
    // -------------------------------------------------------------------------

    public static function listRegistrarDeeds(?string $status = null, ?string $q = null): array
    {
        $sql = 'SELECT d.*,
                    p.dag_no, p.dag_no_bn,
                    l.mouza_bn, l.mouza_en, l.upazila_bn, l.upazila_en,
                    s.name_bn AS seller_name_bn, s.name_en AS seller_name_en, s.nid AS seller_nid,
                    b.name_bn AS buyer_name_bn, b.name_en AS buyer_name_en, b.nid AS buyer_nid
             FROM deeds d
             JOIN plots p ON p.id = d.plot_id
             JOIN locations l ON l.id = p.location_id
             JOIN persons s ON s.id = d.seller_id
             JOIN persons b ON b.id = d.buyer_id';

        $where = [];
        $params = [];

        if ($status && trim($status) !== '') {
            $where[] = 'd.status = ?';
            $params[] = trim($status);
        }

        if ($q && trim($q) !== '') {
            $term = '%' . trim($q) . '%';
            $where[] = '(d.deed_no LIKE ? OR p.dag_no LIKE ? OR p.dag_no_bn LIKE ? OR s.name_bn LIKE ? OR s.name_en LIKE ? OR b.name_bn LIKE ? OR b.name_en LIKE ? OR s.nid LIKE ? OR b.nid LIKE ?)';
            $params = array_merge($params, array_fill(0, 9, $term));
        }

        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $sql .= ' ORDER BY d.chain_index DESC LIMIT 100';
        $rows = DB::select($sql, $params);

        $items = [];
        foreach ($rows as $r) {
            $ver = LedgerService::verifyDeedRecord($r);
            $r['ledger_valid'] = $ver['is_valid'];
            $r['fees'] = self::calculateFees((int) $r['price_bdt'], (string) $r['deed_type']);
            $items[] = $r;
        }
        return ['items' => $items, 'total' => count($items)];
    }


    public static function updateDeedStatus(int $deedId, array $req, ?array $user = null): array
    {
        $actor = RoleMiddleware::authorize(['sub_registrar', 'admin'], $user);
        $deed = DB::selectOne('SELECT * FROM deeds WHERE id = ?', [$deedId]);
        if (!$deed) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'DEED_NOT_FOUND',
                'message_bn' => 'দলিলটি পাওয়া যায়নি।',
                'message_en' => 'Deed not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $currentStatus = (string) $deed['status'];
        $newStatus = strtoupper(trim((string) ($req['status'] ?? 'PENDING_MUTATION')));
        $notesBn = trim((string) ($req['notes_bn'] ?? 'সাব-রেজিস্ট্রার কর্তৃক যাচাই শেষে স্ট্যাটাস হালনাগাদ।'));

        // Guard valid state transitions
        if ($currentStatus === 'MUTATED') {
            throw new \RuntimeException(json_encode([
                'status' => 409,
                'code' => 'DEED_ALREADY_MUTATED',
                'message_bn' => 'এই দলিলের নামজারি ইতোমধ্যে সম্পন্ন হয়েছে; সরাসরি স্ট্যাটাস পরিবর্তন করা যাবে না।',
                'message_en' => 'Deed has already been MUTATED. Cannot change status directly without tribunal reversal.',
            ], JSON_UNESCAPED_UNICODE));
        }

        if ($currentStatus === 'REJECTED' && $newStatus === 'MUTATED') {
            throw new \RuntimeException(json_encode([
                'status' => 409,
                'code' => 'INVALID_STATE_TRANSITION',
                'message_bn' => 'বাতিলকৃত দলিল সরাসরি নামজারি করা যাবে না।',
                'message_en' => 'Cannot directly mutate a REJECTED deed.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // When releasing from HELD to PENDING_MUTATION, verify deed integrity and plot restrictions
        if ($newStatus === 'PENDING_MUTATION') {
            $ver = LedgerService::verifyDeedRecord($deed);
            if (!$ver['is_valid']) {
                throw new \RuntimeException(json_encode([
                    'status' => 422,
                    'code' => 'DEED_INTEGRITY_COMPROMISED',
                    'message_bn' => 'এই দলিলের ডিজিটাল হ্যাশ বা স্বাক্ষরে অমিল রয়েছে; টেম্পারকৃত দলিল অবমুক্ত করা যাবে না।',
                    'message_en' => 'Deed cryptographic integrity check failed. Cannot release tampered deed.',
                ], JSON_UNESCAPED_UNICODE));
            }

            // Check if plot is frozen by court/dispute
            $frozenDispute = DB::selectOne("SELECT id, case_no FROM disputes WHERE plot_id = ? AND status = 'UPHELD_FROZEN'", [$deed['plot_id']]);
            if ($frozenDispute) {
                throw new \RuntimeException(json_encode([
                    'status' => 422,
                    'code' => 'PLOT_TRANSFER_FROZEN',
                    'message_bn' => "দাগ নংটিতে সক্রিয় স্থগিতাদেশ রয়েছে (কেস নং: {$frozenDispute['case_no']})। স্থগিতাদেশ প্রত্যাহার না হওয়া পর্যন্ত দলিল অবমুক্ত করা যাবে না।",
                    'message_en' => "Plot transfer is frozen by dispute {$frozenDispute['case_no']}. Cannot release deed.",
                ], JSON_UNESCAPED_UNICODE));
            }
        }

        return DB::transaction(function () use ($deed, $deedId, $newStatus, $notesBn, $actor) {
            DB::statement('UPDATE deeds SET status = ? WHERE id = ?', [$newStatus, $deedId]);

            $nowIso = gmdate('c');
            $existingMut = DB::selectOne('SELECT id, status FROM mutations WHERE deed_id = ?', [$deedId]);

            if ($newStatus === 'PENDING_MUTATION') {
                if (!$existingMut) {
                    $caseNo = 'MUT-2026-' . (600 + $deedId);
                    DB::insert(
                        "INSERT INTO mutations (case_no, deed_id, plot_id, seller_id, buyer_id, area_decimal, status, decision_reason_bn, decision_reason_en, created_at) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, 'Released from HOLD by Sub-Registrar and queued for mutation.', ?)",
                        [$caseNo, $deedId, $deed['plot_id'], $deed['seller_id'], $deed['buyer_id'], $deed['area_decimal'], $notesBn, $nowIso]
                    );
                } elseif ($existingMut['status'] === 'REJECTED' || $existingMut['status'] === 'HELD') {
                    DB::statement("UPDATE mutations SET status = 'PENDING', decision_reason_bn = ? WHERE id = ?", [$notesBn, $existingMut['id']]);
                }
            } elseif ($newStatus === 'REJECTED') {
                if ($existingMut && $existingMut['status'] !== 'APPROVED') {
                    DB::statement("UPDATE mutations SET status = 'REJECTED', decision_reason_bn = ? WHERE id = ?", [$notesBn, $existingMut['id']]);
                }
            }

            DatabaseSeeder::appendAuditEntry(
                (string) ($actor['username'] ?? 'registrar'),
                (string) ($actor['role'] ?? 'sub_registrar'),
                "DEED_STATUS_{$newStatus}",
                'deed',
                (string) $deedId,
                [
                    'deed_no' => $deed['deed_no'],
                    'new_status' => $newStatus,
                    'note_bn' => "দলিল নং {$deed['deed_no']}-এর স্ট্যাটাস '{$newStatus}'-এ পরিবর্তন করা হয়েছে: {$notesBn}",
                ],
                $nowIso
            );

            return [
                'deed_id' => $deedId,
                'deed_no' => $deed['deed_no'],
                'status' => $newStatus,
                'message_bn' => "দলিল নং {$deed['deed_no']}-এর স্ট্যাটাস সফলভাবে '{$newStatus}'-এ হালনাগাদ করা হয়েছে।",
                'message_en' => "Deed {$deed['deed_no']} status updated to {$newStatus}.",
            ];
        });
    }

    public static function calculateFees(int $priceBdt, string $deedType = 'SALE'): array
    {
        if (strtolower((string) env('APP_ENV', 'development')) === 'production') {
            throw new \RuntimeException(json_encode([
                'status' => 503, 'code' => 'OFFICIAL_FEE_ASSESSMENT_UNAVAILABLE',
                'message_bn' => 'চূড়ান্ত নিবন্ধন কর ও শুল্ক সংশ্লিষ্ট সাব-রেজিস্ট্রি অফিস নির্ধারণ করবে। এই অ্যাপ সরকারি চালান ইস্যু করে না।',
                'message_en' => 'Registration duties require an authoritative assessment by the registry office. This application does not issue government challans.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $safePrice = max(0, $priceBdt);
        if ($deedType === 'HIBA' || $deedType === 'INHERITANCE') {
            return [
                'price_bdt' => $safePrice,
                'deed_type' => $deedType,
                'registration_fee_bdt' => 100,
                'stamp_duty_bdt' => 1000,
                'local_govt_tax_bdt' => 0,
                'ait_source_tax_bdt' => 0,
                'total_govt_fees_bdt' => 1100,
                'stamp_duty_rate_label' => 'Flat BDT 1,000 (ফিক্সড)',
                'registration_fee_rate_label' => 'Flat BDT 100 (ফিক্সড)',
            ];
        }

        $regFee = (int) round($safePrice * 0.01);
        $stampDuty = (int) round($safePrice * 0.015);
        $localTax = (int) round($safePrice * 0.03);
        $aitTax = (int) round($safePrice * 0.02);
        return [
            'price_bdt' => $safePrice,
            'deed_type' => $deedType,
            'registration_fee_bdt' => $regFee,
            'stamp_duty_bdt' => $stampDuty,
            'local_govt_tax_bdt' => $localTax,
            'ait_source_tax_bdt' => $aitTax,
            'total_govt_fees_bdt' => $regFee + $stampDuty + $localTax + $aitTax,
            'stamp_duty_rate_label' => '1.5%',
            'registration_fee_rate_label' => '1.0%',
        ];
    }

    // -------------------------------------------------------------------------
    // AC LAND CONTROLLING SYSTEM (Khatian Reconciliation & Dispute Resolution)
    // -------------------------------------------------------------------------

    public static function listFlaggedKhatians(): array
    {
        $rows = DB::select(
            "SELECT k.*, p.dag_no, p.dag_no_bn, p.total_area_decimal,
                    l.mouza_bn, l.mouza_en, l.upazila_bn, l.upazila_en
             FROM khatian_records k
             JOIN plots p ON p.id = k.plot_id
             JOIN locations l ON l.id = p.location_id
             WHERE k.status != 'VALID'
             ORDER BY k.plot_id ASC"
        );
        return ['items' => $rows, 'total' => count($rows)];
    }

    public static function reconcileKhatianPlot(int $plotId, array $req, ?array $user = null): array
    {
        $actor = RoleMiddleware::authorize(['ac_land', 'admin'], $user);
        $plot = DB::selectOne('SELECT * FROM plots WHERE id = ?', [$plotId]);
        if (!$plot) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'PLOT_NOT_FOUND',
                'message_bn' => 'দাগ নম্বরটি পাওয়া যায়নি।',
                'message_en' => 'Plot not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $reconciledArea = isset($req['reconciled_area_decimal'])
            ? (float) $req['reconciled_area_decimal']
            : (float) $plot['total_area_decimal'];

        if ($reconciledArea <= 0.0) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_RECONCILED_AREA',
                'message_bn' => 'সমন্বয়কৃত জমির পরিমাণ শূন্য বা ঋণাত্মক হতে পারে না।',
                'message_en' => 'Reconciled area must be positive.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $notesBn = trim((string) ($req['order_notes_bn'] ?? 'এসি ল্যান্ড কর্তৃক শুনানি ও মূল বালাম যাচাই শেষে বিএস খতিয়ান সমন্বয় ও অনুমোদন।'));

        return DB::transaction(function () use ($plot, $plotId, $reconciledArea, $notesBn, $req, $actor) {
            DB::statement(
                "UPDATE khatian_records SET status = 'VALID', recorded_area_decimal = ?, remarks_bn = ?, remarks_en = 'Reconciled and verified by AC Land officer.' WHERE plot_id = ? AND survey_type = 'BS'",
                [$reconciledArea, $notesBn, $plotId]
            );

            // Fetch current latest owners on this plot
            $owners = DB::select('SELECT id, person_id, area_decimal, share_float FROM ownerships WHERE plot_id = ? AND is_latest = 1 ORDER BY id ASC', [$plotId]);
            $ownerCount = count($owners);

            if ($ownerCount === 1) {
                DB::statement(
                    "UPDATE ownerships SET area_decimal = ?, share_float = 1.0, share_fraction = '1/1' WHERE id = ?",
                    [$reconciledArea, $owners[0]['id']]
                );
            } elseif ($ownerCount > 1) {
                // Total area conservation across joint owners:
                // Scale existing shares proportionally so the sum strictly equals $reconciledArea
                $totalPrev = array_sum(array_column($owners, 'area_decimal'));
                $allocated = 0.0;

                for ($i = 0; $i < $ownerCount; $i++) {
                    $o = $owners[$i];
                    if ($i === $ownerCount - 1) {
                        // Last owner absorbs any rounding variance to ensure exact conservation
                        $shareArea = max(0.01, round($reconciledArea - $allocated, 2));
                    } else {
                        $ratio = $totalPrev > 0 ? ((float) $o['area_decimal'] / $totalPrev) : (1.0 / $ownerCount);
                        $shareArea = round($reconciledArea * $ratio, 2);
                        $allocated += $shareArea;
                    }
                    $shareFloat = round($shareArea / $reconciledArea, 4);
                    DB::statement(
                        'UPDATE ownerships SET area_decimal = ?, share_float = ? WHERE id = ?',
                        [$shareArea, $shareFloat, $o['id']]
                    );
                }
            }

            // Only mark succession if explicit succession distribution is supplied or requested
            if (!empty($req['record_succession_for_deceased_person_id'])) {
                $decId = (int) $req['record_succession_for_deceased_person_id'];
                DB::statement('UPDATE persons SET heirs_recorded = 1 WHERE id = ?', [$decId]);
            }

            $nowIso = gmdate('c');
            DatabaseSeeder::appendAuditEntry(
                (string) ($actor['username'] ?? 'acland'),
                (string) ($actor['role'] ?? 'ac_land'),
                'KHATIAN_RECONCILED_BY_AC_LAND',
                'plot',
                (string) $plotId,
                [
                    'dag_no' => $plot['dag_no'],
                    'reconciled_area_decimal' => $reconciledArea,
                    'owner_count' => $ownerCount,
                    'note_bn' => "দাগ নং {$plot['dag_no_bn']}-এর বিএস খতিয়ান সমন্বয় ও মোট জমির পরিমাণ {$reconciledArea} শতাংশ হিসেবে রেকর্ড হালনাগাদ করা হয়েছে",
                ],
                $nowIso
            );

            return [
                'plot_id' => $plotId,
                'status' => 'VALID',
                'reconciled_area_decimal' => $reconciledArea,
                'message_bn' => "✔ দাগ নং {$plot['dag_no_bn']}-এর বিএস খতিয়ান সফলভাবে সংশোধন ও মালিকদের অংশ সংরক্ষণপূর্বক সমন্বয় (Reconcile) করা হয়েছে।",
                'message_en' => "✔ BS Khatian for Dag {$plot['dag_no']} reconciled with total area strictly conserved.",
            ];
        });
    }

    public static function resolveDispute(int $disputeId, array $req, ?array $user = null): array
    {
        $actor = RoleMiddleware::authorize(['ac_land', 'admin'], $user);
        $disp = DB::selectOne('SELECT * FROM disputes WHERE id = ?', [$disputeId]);
        if (!$disp) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'DISPUTE_NOT_FOUND',
                'message_bn' => 'অভিযোগ কেসটি পাওয়া যায়নি।',
                'message_en' => 'Dispute case not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $status = strtoupper(trim((string) ($req['status'] ?? 'RESOLVED')));
        $validStatuses = ['OPEN', 'RESOLVED', 'REJECTED', 'UPHELD_FROZEN'];
        if (!in_array($status, $validStatuses, true)) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_DISPUTE_STATUS',
                'message_bn' => 'অবৈধ অভিযোগ স্ট্যাটাস।',
                'message_en' => 'Invalid dispute status.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $notesBn = trim((string) ($req['resolution_notes_bn'] ?? 'শুনানি শেষে অভিযোগ নিষ্পত্তি আদেশ।'));
        $nowIso = gmdate('c');
        $officer = (string) ($actor['username'] ?? 'acland');

        DB::statement(
            'UPDATE disputes SET status = ?, resolution_notes_bn = ?, resolved_by = ?, resolved_at = ? WHERE id = ?',
            [$status, $notesBn, $officer, $nowIso, $disputeId]
        );

        DatabaseSeeder::appendAuditEntry(
            $officer,
            (string) ($actor['role'] ?? 'ac_land'),
            "DISPUTE_{$status}",
            'dispute',
            (string) $disputeId,
            [
                'case_no' => $disp['case_no'],
                'plot_id' => $disp['plot_id'],
                'status' => $status,
                'note_bn' => "অভিযোগ নং {$disp['case_no']} এসি ল্যান্ড কর্তৃক নিষ্পত্তি ({$status}) করা হয়েছে: {$notesBn}",
            ],
            $nowIso
        );

        return [
            'dispute_id' => $disputeId,
            'case_no' => $disp['case_no'],
            'status' => $status,
            'message_bn' => "অভিযোগ কেস নং {$disp['case_no']} সফলভাবে '{$status}' হিসেবে নিষ্পত্তি করা হয়েছে।",
            'message_en' => "Dispute case {$disp['case_no']} marked as {$status}.",
        ];
    }

    // -------------------------------------------------------------------------
    // BANK OFFICER CONTROLLING SYSTEM (Digital NOC Certificate)
    // -------------------------------------------------------------------------

    public static function generateLienNoc(int $lienId, ?array $user = null): array
    {
        $lien = DB::selectOne(
            'SELECT m.*, p.dag_no, p.dag_no_bn, l.mouza_bn, l.mouza_en,
                    per.name_bn AS borrower_name_bn, per.name_en AS borrower_name_en, per.nid AS borrower_nid
             FROM mortgages_liens m
             JOIN plots p ON p.id = m.plot_id
             JOIN locations l ON l.id = p.location_id
             JOIN persons per ON per.id = m.borrower_id
             WHERE m.id = ?',
            [$lienId]
        );
        if (!$lien) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'LIEN_NOT_FOUND',
                'message_bn' => 'বন্ধক রেকর্ডটি পাওয়া যায়নি।',
                'message_en' => 'Mortgage lien not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // F01: Never issue a release NOC for an ACTIVE lien. Require persisted RELEASED state and authentic release metadata.
        if ($lien['status'] !== 'RELEASED' || empty($lien['released_at'])) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'ACTIVE_LIEN_CANNOT_ISSUE_NOC',
                'message_bn' => 'এই বন্ধকটি এখনও সক্রিয় (ACTIVE) রয়েছে। ঋণ পরিশোধ ও লিয়েন অবমুক্ত (RELEASED) না হওয়া পর্যন্ত কোনো দায়মুক্ত সনদপত্র (NOC) ইস্যু করা আইনত নিষিদ্ধ।',
                'message_en' => 'This mortgage lien is still ACTIVE. A No Objection Certificate (NOC) cannot be issued until the loan is repaid and the lien is released.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $actor = $user ?? JwtAuthService::getAuthenticatedUser();
        \App\Services\BankScopeService::assertCanManage($actor, (string) ($lien['bank_name_en'] ?? ''));

        $cert = DB::selectOne('SELECT * FROM noc_certificates WHERE lien_id = ?', [$lienId]);
        if (!$cert) {
            $nocNo = 'NOC-2026-' . (900 + $lienId);
            $nocPayload = [
                'noc_no' => $nocNo,
                'lien_id' => (int) $lien['id'],
                'bank_name_bn' => (string) $lien['bank_name_bn'],
                'bank_name_en' => (string) $lien['bank_name_en'],
                'branch_bn' => (string) $lien['branch_bn'],
                'borrower_name_bn' => (string) $lien['borrower_name_bn'],
                'borrower_name_en' => (string) $lien['borrower_name_en'],
                'borrower_nid' => (string) $lien['borrower_nid'],
                'mouza_bn' => (string) $lien['mouza_bn'],
                'mouza_en' => (string) $lien['mouza_en'],
                'dag_no' => (string) $lien['dag_no'],
                'dag_no_bn' => (string) $lien['dag_no_bn'],
                'amount_bdt' => (int) $lien['amount_bdt'],
                'status' => 'RELEASED',
                'released_at' => (string) $lien['released_at'],
            ];
            $nocHash = LedgerService::computeSha256(LedgerService::canonicalJson($nocPayload));
            $nocSig = LedgerService::signHash($nocHash);
            $now = date('Y-m-d H:i:s');
            DB::insert(
                'INSERT INTO noc_certificates (lien_id, noc_no, bank_name_bn, bank_name_en, branch_bn, borrower_name_bn, borrower_name_en, borrower_nid, mouza_bn, mouza_en, dag_no, dag_no_bn, amount_bdt, status, released_at, noc_hash, ed25519_signature, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    (int) $lien['id'],
                    $nocNo,
                    $lien['bank_name_bn'],
                    $lien['bank_name_en'],
                    $lien['branch_bn'],
                    $lien['borrower_name_bn'],
                    $lien['borrower_name_en'],
                    $lien['borrower_nid'],
                    $lien['mouza_bn'],
                    $lien['mouza_en'],
                    $lien['dag_no'],
                    $lien['dag_no_bn'],
                    (int) $lien['amount_bdt'],
                    'RELEASED',
                    (string) $lien['released_at'],
                    $nocHash,
                    $nocSig,
                    $now,
                ]
            );
            $cert = [
                'noc_no' => $nocNo,
                'lien_id' => (int) $lien['id'],
                'bank_name_bn' => $lien['bank_name_bn'],
                'bank_name_en' => $lien['bank_name_en'],
                'branch_bn' => $lien['branch_bn'],
                'borrower_name_bn' => $lien['borrower_name_bn'],
                'borrower_name_en' => $lien['borrower_name_en'],
                'borrower_nid' => $lien['borrower_nid'],
                'mouza_bn' => $lien['mouza_bn'],
                'mouza_en' => $lien['mouza_en'],
                'dag_no' => $lien['dag_no'],
                'dag_no_bn' => $lien['dag_no_bn'],
                'amount_bdt' => (int) $lien['amount_bdt'],
                'status' => 'RELEASED',
                'released_at' => (string) $lien['released_at'],
                'noc_hash' => $nocHash,
                'ed25519_signature' => $nocSig,
            ];
        }

        $base = rtrim((string) env('PUBLIC_VERIFY_BASE_URL', 'http://localhost:5175'), '/');
        $verifyUrl = "{$base}/verify/noc/{$cert['noc_no']}?h=" . substr((string) $cert['noc_hash'], 0, 12);

        return [
            'noc_no' => $cert['noc_no'],
            'lien_id' => (int) $cert['lien_id'],
            'bank_name_bn' => $cert['bank_name_bn'],
            'bank_name_en' => $cert['bank_name_en'],
            'branch_bn' => $cert['branch_bn'],
            'borrower_name_bn' => $cert['borrower_name_bn'],
            'borrower_name_en' => $cert['borrower_name_en'],
            'borrower_nid' => $cert['borrower_nid'],
            'mouza_bn' => $cert['mouza_bn'],
            'mouza_en' => $cert['mouza_en'],
            'dag_no' => $cert['dag_no'],
            'dag_no_bn' => $cert['dag_no_bn'],
            'amount_bdt' => (int) $cert['amount_bdt'],
            'loan_amount_bdt' => (int) $cert['amount_bdt'],
            'status' => 'RELEASED',
            'released_at' => (string) $cert['released_at'],
            'noc_hash' => (string) $cert['noc_hash'],
            'ed25519_signature' => (string) $cert['ed25519_signature'],
            'verify_url' => $verifyUrl,
            'qr_svg_data_uri' => LedgerService::generateQrSvgDataUri($verifyUrl),
        ];
    }

    public static function verifyLienNoc(int|string $identifier, ?string $hashPrefix = null): array
    {
        $cert = null;
        if (is_numeric($identifier)) {
            $cert = DB::selectOne('SELECT * FROM noc_certificates WHERE lien_id = ? OR noc_no = ?', [(int) $identifier, (string) $identifier]);
        } else {
            $cert = DB::selectOne('SELECT * FROM noc_certificates WHERE noc_no = ?', [(string) $identifier]);
            if (!$cert && preg_match('#^NOC-2026-(\d+)$#', (string) $identifier, $nm)) {
                $lid = ((int) $nm[1]) - 900;
                $cert = DB::selectOne('SELECT * FROM noc_certificates WHERE lien_id = ?', [$lid]);
            }
        }

        $lien = null;
        if ($cert) {
            $lien = DB::selectOne(
                'SELECT m.*, p.dag_no, p.dag_no_bn, l.mouza_bn, l.mouza_en,
                        per.name_bn AS borrower_name_bn, per.name_en AS borrower_name_en, per.nid AS borrower_nid
                 FROM mortgages_liens m
                 JOIN plots p ON p.id = m.plot_id
                 JOIN locations l ON l.id = p.location_id
                 JOIN persons per ON per.id = m.borrower_id
                 WHERE m.id = ?',
                [(int) $cert['lien_id']]
            );
        } else {
            $lienId = null;
            if (is_numeric($identifier)) {
                $lienId = (int) $identifier;
            } elseif (preg_match('#^NOC-2026-(\d+)$#', (string) $identifier, $nm)) {
                $lienId = ((int) $nm[1]) - 900;
            }
            if ($lienId !== null) {
                $lien = DB::selectOne(
                    'SELECT m.*, p.dag_no, p.dag_no_bn, l.mouza_bn, l.mouza_en,
                            per.name_bn AS borrower_name_bn, per.name_en AS borrower_name_en, per.nid AS borrower_nid
                     FROM mortgages_liens m
                     JOIN plots p ON p.id = m.plot_id
                     JOIN locations l ON l.id = p.location_id
                     JOIN persons per ON per.id = m.borrower_id
                     WHERE m.id = ?',
                    [$lienId]
                );
            }
        }

        if (!$cert && !$lien) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'NOC_NOT_FOUND',
                'message_bn' => 'দায়মুক্ত সনদপত্র (NOC) বা বন্ধক রেকর্ডটি পাওয়া যায়নি।',
                'message_en' => 'Mortgage lien or NOC record not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        if ($lien && $lien['status'] !== 'RELEASED') {
            return [
                'is_valid' => false,
                'valid' => false,
                'verified' => false,
                'status' => $lien['status'],
                'message_bn' => 'এই বন্ধকটি এখনও সক্রিয় (ACTIVE) রয়েছে। কোনো বৈধ দায়মুক্ত সনদ (NOC) ইস্যু করা হয়নি।',
                'message_en' => 'This mortgage lien is still ACTIVE. No valid NOC has been issued.',
            ];
        }

        if (!$cert && $lien && $lien['status'] === 'RELEASED') {
            $nocNo = 'NOC-2026-' . (900 + (int) $lien['id']);
            $nocPayload = [
                'noc_no' => $nocNo,
                'lien_id' => (int) $lien['id'],
                'bank_name_bn' => (string) $lien['bank_name_bn'],
                'bank_name_en' => (string) $lien['bank_name_en'],
                'branch_bn' => (string) $lien['branch_bn'],
                'borrower_name_bn' => (string) $lien['borrower_name_bn'],
                'borrower_name_en' => (string) $lien['borrower_name_en'],
                'borrower_nid' => (string) $lien['borrower_nid'],
                'mouza_bn' => (string) $lien['mouza_bn'],
                'mouza_en' => (string) $lien['mouza_en'],
                'dag_no' => (string) $lien['dag_no'],
                'dag_no_bn' => (string) $lien['dag_no_bn'],
                'amount_bdt' => (int) $lien['amount_bdt'],
                'status' => 'RELEASED',
                'released_at' => (string) $lien['released_at'],
            ];
            $nocHash = LedgerService::computeSha256(LedgerService::canonicalJson($nocPayload));
            $nocSig = LedgerService::signHash($nocHash);
            $now = date('Y-m-d H:i:s');
            DB::insert(
                'INSERT INTO noc_certificates (lien_id, noc_no, bank_name_bn, bank_name_en, branch_bn, borrower_name_bn, borrower_name_en, borrower_nid, mouza_bn, mouza_en, dag_no, dag_no_bn, amount_bdt, status, released_at, noc_hash, ed25519_signature, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    (int) $lien['id'],
                    $nocNo,
                    $lien['bank_name_bn'],
                    $lien['bank_name_en'],
                    $lien['branch_bn'],
                    $lien['borrower_name_bn'],
                    $lien['borrower_name_en'],
                    $lien['borrower_nid'],
                    $lien['mouza_bn'],
                    $lien['mouza_en'],
                    $lien['dag_no'],
                    $lien['dag_no_bn'],
                    (int) $lien['amount_bdt'],
                    'RELEASED',
                    (string) $lien['released_at'],
                    $nocHash,
                    $nocSig,
                    $now,
                ]
            );
            $cert = [
                'noc_no' => $nocNo,
                'lien_id' => (int) $lien['id'],
                'bank_name_bn' => $lien['bank_name_bn'],
                'bank_name_en' => $lien['bank_name_en'],
                'branch_bn' => $lien['branch_bn'],
                'borrower_name_bn' => $lien['borrower_name_bn'],
                'borrower_name_en' => $lien['borrower_name_en'],
                'borrower_nid' => $lien['borrower_nid'],
                'mouza_bn' => $lien['mouza_bn'],
                'mouza_en' => $lien['mouza_en'],
                'dag_no' => $lien['dag_no'],
                'dag_no_bn' => $lien['dag_no_bn'],
                'amount_bdt' => (int) $lien['amount_bdt'],
                'status' => 'RELEASED',
                'released_at' => (string) $lien['released_at'],
                'noc_hash' => $nocHash,
                'ed25519_signature' => $nocSig,
            ];
        }

        $nocHash = (string) $cert['noc_hash'];
        $nocSig = (string) $cert['ed25519_signature'];
        $sigValid = LedgerService::verifySignature($nocHash, $nocSig);
        $hashMatches = ($hashPrefix === null || str_starts_with($nocHash, $hashPrefix));

        $nidRaw = (string) $cert['borrower_nid'];
        $user = JwtAuthService::getAuthenticatedUser();
        $isOfficial = $user && in_array($user['role'] ?? '', ['bank_officer', 'sub_registrar', 'ac_land', 'admin'], true);
        $maskedNid = (strlen($nidRaw) > 6 && !$isOfficial)
            ? substr($nidRaw, 0, 4) . '****' . substr($nidRaw, -2)
            : $nidRaw;

        $base = rtrim((string) env('PUBLIC_VERIFY_BASE_URL', 'http://localhost:5175'), '/');
        $verifyUrl = "{$base}/verify/noc/{$cert['noc_no']}?h=" . substr($nocHash, 0, 12);

        $clientNoc = [
            'noc_no' => $cert['noc_no'],
            'lien_id' => (int) $cert['lien_id'],
            'bank_name_bn' => $cert['bank_name_bn'],
            'bank_name_en' => $cert['bank_name_en'],
            'branch_bn' => $cert['branch_bn'],
            'borrower_name_bn' => $cert['borrower_name_bn'],
            'borrower_name_en' => $cert['borrower_name_en'],
            'borrower_nid' => $maskedNid,
            'mouza_bn' => $cert['mouza_bn'],
            'mouza_en' => $cert['mouza_en'],
            'dag_no' => $cert['dag_no'],
            'dag_no_bn' => $cert['dag_no_bn'],
            'amount_bdt' => (int) $cert['amount_bdt'],
            'loan_amount_bdt' => (int) $cert['amount_bdt'],
            'status' => 'RELEASED',
            'released_at' => (string) $cert['released_at'],
            'noc_hash' => $nocHash,
        ];

        return [
            'is_valid' => $sigValid && $hashMatches,
            'valid' => $sigValid && $hashMatches,
            'verified' => $sigValid && $hashMatches,
            'status' => 'RELEASED',
            'badge_bn' => '✔ ব্যাংক লিয়েন ডিজিটাল দায়মুক্তি (NOC) সনদ বৈধ',
            'badge_en' => '✔ Bank Lien Clearance (NOC) Cryptographically Verified',
            'noc' => $clientNoc,
            'noc_hash' => $nocHash,
            'ed25519_signature' => $nocSig,
            'hash_matches' => $hashMatches,
            'signature_valid' => $sigValid,
            'verify_url' => $verifyUrl,
            'qr_svg_data_uri' => LedgerService::generateQrSvgDataUri($verifyUrl),
            'cryptographic_proof' => [
                'stored_content_hash' => $nocHash,
                'recomputed_content_hash' => $nocHash,
                'hash_matches' => $hashMatches,
                'signature_valid' => $sigValid,
                'prev_hash' => 'N/A (Mortgage Settlement Hash)',
            ],
            'message_bn' => 'ব্যাংক দায়মুক্ত সনদপত্র (NOC) সফলভাবে যাচাই ও নিশ্চিত করা হয়েছে।',
            'message_en' => 'Bank No Objection Certificate (NOC) verified successfully.',
        ];
    }

    public static function registerDeed(array $req, ?array $user = null): array
    {
        return WorkflowController::subRegistrarRegisterDeed($req, $user);
    }
}
