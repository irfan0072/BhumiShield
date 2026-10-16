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

        $newLocked = ((int) ($plot['owner_sale_locked'] ?? 0)) === 1 ? 0 : 1;
        if (isset($body['locked'])) {
            $newLocked = $body['locked'] ? 1 : 0;
        }
        $nid = (string) ($actor['nid'] ?? '9900001001');

        DB::statement(
            'UPDATE plots SET owner_sale_locked = ?, locked_by_nid = ? WHERE id = ?',
            [$newLocked, $newLocked ? $nid : null, $plotId]
        );

        $nowIso = gmdate('c');
        DatabaseSeeder::appendAuditEntry(
            (string) ($actor['username'] ?? 'citizen'),
            (string) ($actor['role'] ?? 'citizen'),
            $newLocked ? 'PLOT_SALE_LOCKED_BY_OWNER' : 'PLOT_SALE_UNLOCKED_BY_OWNER',
            'plot',
            (string) $plotId,
            [
                'dag_no' => $plot['dag_no'],
                'owner_sale_locked' => (bool) $newLocked,
                'note_bn' => $newLocked
                    ? "নাগরিক মালিক কর্তৃক দাগ নং {$plot['dag_no_bn']}-এ বিক্রয় লক (Sale Protection Lock) সক্রিয় করা হয়েছে"
                    : "নাগরিক মালিক কর্তৃক দাগ নং {$plot['dag_no_bn']}-এর বিক্রয় লক নিষ্ক্রিয় করা হয়েছে",
            ],
            $nowIso
        );

        return [
            'plot_id' => $plotId,
            'dag_no' => $plot['dag_no'],
            'owner_sale_locked' => $newLocked,
            'message_bn' => $newLocked
                ? "🔒 দাগ নং {$plot['dag_no_bn']}-এ মালিকানা বিক্রয় লক সক্রিয় করা হয়েছে। আপনার অনুমতি ছাড়া সাব-রেজিস্ট্রি অফিসে কোনো দলিল নিবন্ধন হবে না।"
                : "🔓 দাগ নং {$plot['dag_no_bn']}-এর বিক্রয় লক খুলে দেওয়া হয়েছে। এখন বৈধ দলিল নিবন্ধন করা যাবে।",
            'message_en' => $newLocked
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
        $rows = DB::select(
            'SELECT d.*,
                    p.dag_no, p.dag_no_bn,
                    l.mouza_bn, l.mouza_en, l.upazila_bn, l.upazila_en,
                    s.name_bn AS seller_name_bn, s.name_en AS seller_name_en, s.nid AS seller_nid,
                    b.name_bn AS buyer_name_bn, b.name_en AS buyer_name_en, b.nid AS buyer_nid
             FROM deeds d
             JOIN plots p ON p.id = d.plot_id
             JOIN locations l ON l.id = p.location_id
             JOIN persons s ON s.id = d.seller_id
             JOIN persons b ON b.id = d.buyer_id
             ORDER BY d.chain_index DESC LIMIT 30'
        );

        $items = [];
        foreach ($rows as $r) {
            if ($status && $r['status'] !== $status) {
                continue;
            }
            if ($q && trim($q) !== '') {
                $qLow = mb_strtolower(trim($q));
                $match = str_contains(mb_strtolower($r['deed_no']), $qLow)
                    || str_contains(mb_strtolower($r['seller_name_bn']), $qLow)
                    || str_contains(mb_strtolower($r['buyer_name_bn']), $qLow)
                    || str_contains(mb_strtolower($r['dag_no']), $qLow);
                if (!$match) {
                    continue;
                }
            }
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

        $newStatus = strtoupper(trim((string) ($req['status'] ?? 'PENDING_MUTATION')));
        $notesBn = trim((string) ($req['notes_bn'] ?? 'সাব-রেজিস্ট্রার কর্তৃক ম্যানুয়াল যাচাই শেষে স্ট্যাটাস হালনাগাদ।'));
        DB::statement('UPDATE deeds SET status = ? WHERE id = ?', [$newStatus, $deedId]);

        $nowIso = gmdate('c');
        if ($newStatus === 'PENDING_MUTATION') {
            $existingMut = DB::selectOne('SELECT id FROM mutations WHERE deed_id = ?', [$deedId]);
            if (!$existingMut) {
                $caseNo = 'MUT-2026-' . (600 + $deedId);
                DB::insert(
                    "INSERT INTO mutations (case_no, deed_id, plot_id, seller_id, buyer_id, area_decimal, status, decision_reason_bn, decision_reason_en, created_at) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, 'Released from HOLD by Sub-Registrar and queued for mutation.', ?)",
                    [$caseNo, $deedId, $deed['plot_id'], $deed['seller_id'], $deed['buyer_id'], $deed['area_decimal'], $notesBn, $nowIso]
                );
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
    }

    public static function calculateFees(int $priceBdt, string $deedType = 'SALE'): array
    {
        if ($deedType === 'HIBA' || $deedType === 'INHERITANCE') {
            return [
                'price_bdt' => $priceBdt,
                'deed_type' => $deedType,
                'registration_fee_bdt' => 100,
                'stamp_duty_bdt' => 1000,
                'local_govt_tax_bdt' => 0,
                'ait_source_tax_bdt' => 0,
                'total_govt_fees_bdt' => 1100,
            ];
        }
        $regFee = (int) round($priceBdt * 0.01);
        $stampDuty = (int) round($priceBdt * 0.015);
        $localTax = (int) round($priceBdt * 0.03);
        $aitTax = (int) round($priceBdt * 0.02);
        return [
            'price_bdt' => $priceBdt,
            'deed_type' => $deedType,
            'registration_fee_bdt' => $regFee,
            'stamp_duty_bdt' => $stampDuty,
            'local_govt_tax_bdt' => $localTax,
            'ait_source_tax_bdt' => $aitTax,
            'total_govt_fees_bdt' => $regFee + $stampDuty + $localTax + $aitTax,
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
        $notesBn = trim((string) ($req['order_notes_bn'] ?? 'এসি ল্যান্ড কর্তৃক ম্যানুয়াল শুনানি ও মূল বালাম যাচাই শেষে খতিয়ান ও ওয়ারিশ রেকর্ড সংশোধিত ও অনুমোদিত।'));

        DB::statement(
            "UPDATE khatian_records SET status = 'VALID', recorded_area_decimal = ?, remarks_bn = ?, remarks_en = 'Reconciled and verified by AC Land officer.' WHERE plot_id = ? AND survey_type = 'BS'",
            [$reconciledArea, $notesBn, $plotId]
        );
        DB::statement('UPDATE ownerships SET area_decimal = ? WHERE plot_id = ? AND is_latest = 1', [$reconciledArea, $plotId]);

        // Also mark any deceased owner on this plot as having heirs_recorded = 1
        $owners = DB::select('SELECT person_id FROM ownerships WHERE plot_id = ? AND is_latest = 1', [$plotId]);
        foreach ($owners as $o) {
            DB::statement('UPDATE persons SET heirs_recorded = 1 WHERE id = ?', [$o['person_id']]);
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
                'note_bn' => "দাগ নং {$plot['dag_no_bn']}-এর বিএস খতিয়ান অসামঞ্জস্যতা / ওয়ারিশ রেকর্ড এসি ল্যান্ড কর্তৃক নিষ্পত্তি করা হয়েছে",
            ],
            $nowIso
        );

        return [
            'plot_id' => $plotId,
            'status' => 'VALID',
            'reconciled_area_decimal' => $reconciledArea,
            'message_bn' => "✔ দাগ নং {$plot['dag_no_bn']}-এর বিএস খতিয়ান ও ওয়ারিশ রেকর্ড সফলভাবে সংশোধন ও সমন্বয় (Reconcile) করা হয়েছে।",
            'message_en' => "✔ BS Khatian and succession record for Dag {$plot['dag_no']} reconciled and marked VALID.",
        ];
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
        $notesBn = trim((string) ($req['resolution_notes_bn'] ?? 'উভয় পক্ষের শুনানি শেষে অভিযোগ নিষ্পত্তি করা হলো।'));
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
                'status' => $status,
                'note_bn' => "অভিযোগ নং {$disp['case_no']} এসি ল্যান্ড কর্তৃক নিষ্পত্তি ({$status}) করা হয়েছে",
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

    public static function generateLienNoc(int $lienId): array
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

        $nocPayload = [
            'noc_no' => 'NOC-2026-' . (900 + $lienId),
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
            'status' => $lien['status'],
            'released_at' => $lien['released_at'] ?? gmdate('c'),
        ];
        $nocHash = LedgerService::computeSha256(LedgerService::canonicalJson($nocPayload));
        $nocSig = LedgerService::signHash($nocHash);

        return array_merge($nocPayload, [
            'noc_hash' => $nocHash,
            'ed25519_signature' => $nocSig,
            'qr_svg_data_uri' => LedgerService::generateQrSvgDataUri("NOC:{$nocPayload['noc_no']}:{$nocHash}"),
        ]);
    }
}
