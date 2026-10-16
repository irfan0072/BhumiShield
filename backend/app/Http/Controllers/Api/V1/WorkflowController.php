<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Services\FraudRulesEngine;
use App\Services\JwtAuthService;
use App\Services\LedgerService;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Laravel Controller for Role Workflows: Locations, Plots, Citizen Check-Before-You-Buy,
 * Sub-Registrar, AC Land Mutations, Bank Mortgages, Scenarios, and Bangla Khatian OCR.
 */
final class WorkflowController
{
    public static function loadPlotBundle(int $plotId): array
    {
        $plot = DB::selectOne('SELECT * FROM plots WHERE id = ?', [$plotId]);
        if (!$plot) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'PLOT_NOT_FOUND',
                'message_bn' => 'নির্বাচিত দাগ নম্বরটি খুঁজে পাওয়া যায়নি। মৌজা ও দাগ নম্বর পুনরায় যাচাই করুন।',
                'message_en' => 'Selected plot (Dag) was not found. Please check Mouza and Dag number.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $location = DB::selectOne('SELECT * FROM locations WHERE id = ?', [$plot['location_id']]);
        $khatians = DB::select('SELECT * FROM khatian_records WHERE plot_id = ? ORDER BY survey_year ASC', [$plotId]);
        $ownerships = DB::select(
            'SELECT o.*, p.name_bn AS owner_name_bn, p.name_en AS owner_name_en,
                    p.father_name_bn, p.father_name_en, p.nid, p.is_deceased, p.heirs_recorded,
                    k.survey_type, k.khatian_no, k.khatian_no_bn
             FROM ownerships o
             JOIN persons p ON p.id = o.person_id
             JOIN khatian_records k ON k.id = o.khatian_id
             WHERE o.plot_id = ?
             ORDER BY o.is_latest DESC, o.id ASC',
            [$plotId]
        );

        $latestOwnerships = array_values(array_filter($ownerships, fn(array $o) => ((int) ($o['is_latest'] ?? 0)) === 1));
        $latestOwnerPersons = [];
        foreach ($latestOwnerships as $o) {
            $pr = DB::selectOne('SELECT * FROM persons WHERE id = ?', [$o['person_id']]);
            if ($pr) {
                $latestOwnerPersons[] = $pr;
            }
        }

        $deeds = DB::select(
            'SELECT d.*,
                    s.name_bn AS seller_name_bn, s.name_en AS seller_name_en,
                    b.name_bn AS buyer_name_bn, b.name_en AS buyer_name_en
             FROM deeds d
             JOIN persons s ON s.id = d.seller_id
             JOIN persons b ON b.id = d.buyer_id
             WHERE d.plot_id = ?
             ORDER BY d.chain_index DESC',
            [$plotId]
        );
        foreach ($deeds as &$d) {
            $ver = LedgerService::verifyDeedRecord($d);
            $d['ledger_valid'] = $ver['is_valid'];
            $d['verify_url'] = LedgerService::buildVerifyUrl((int) $d['id'], (string) $d['content_hash']);
        }
        unset($d);

        $mortgages = DB::select(
            'SELECT m.*, p.name_bn AS borrower_name_bn, p.name_en AS borrower_name_en
             FROM mortgages_liens m
             JOIN persons p ON p.id = m.borrower_id
             WHERE m.plot_id = ?
             ORDER BY m.id DESC',
            [$plotId]
        );

        $mutations = DB::select(
            'SELECT mu.*, d.deed_no,
                    s.name_bn AS seller_name_bn, s.name_en AS seller_name_en,
                    b.name_bn AS buyer_name_bn, b.name_en AS buyer_name_en
             FROM mutations mu
             JOIN deeds d ON d.id = mu.deed_id
             JOIN persons s ON s.id = mu.seller_id
             JOIN persons b ON b.id = mu.buyer_id
             WHERE mu.plot_id = ?
             ORDER BY mu.id DESC',
            [$plotId]
        );

        return [
            'plot' => $plot,
            'location' => $location,
            'khatians' => $khatians,
            'ownerships' => $ownerships,
            'latest_ownerships' => $latestOwnerships,
            'latest_owner_persons' => $latestOwnerPersons,
            'deeds' => $deeds,
            'mortgages' => $mortgages,
            'mutations' => $mutations,
            'disputes' => DB::select('SELECT * FROM disputes WHERE plot_id = ? ORDER BY id DESC', [$plotId]),
        ];
    }

    public static function login(array $body): array
    {
        $ident = strtolower(trim((string) ($body['username'] ?? '')));
        $password = (string) ($body['password'] ?? 'demo123');
        $user = DB::selectOne('SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?', [$ident, $ident]);

        if (!$user || !JwtAuthService::verifyPassword($password, (string) $user['password_hash'])) {
            throw new \RuntimeException(json_encode([
                'status' => 401,
                'code' => 'INVALID_CREDENTIALS',
                'message_bn' => "ইউজারনেম বা পাসওয়ার্ড সঠিক নয়। ডেমো অ্যাকাউন্টের জন্য 'demo123' ব্যবহার করুন।",
                'message_en' => "Invalid username or password. Use 'demo123' for demo accounts.",
            ], JSON_UNESCAPED_UNICODE));
        }

        if (((int) ($user['is_active'] ?? 1)) === 0) {
            throw new \RuntimeException(json_encode([
                'status' => 403,
                'code' => 'ACCOUNT_SUSPENDED',
                'message_bn' => 'আপনার অ্যাকাউন্টটি বর্তমানে স্থগিত রয়েছে। সিস্টেম অ্যাডমিনের সাথে যোগাযোগ করুন।',
                'message_en' => 'Your account is currently suspended. Please contact the system administrator.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $nowIso = gmdate('c');
        DB::statement('UPDATE users SET last_login_at = ? WHERE id = ?', [$nowIso, $user['id']]);
        $token = JwtAuthService::createToken(['sub' => $user['username'], 'role' => $user['role']]);

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
                'last_login_at' => $nowIso,
            ],
        ];
    }

    public static function listDemoUsers(): array
    {
        return ['items' => DatabaseSeeder::DEMO_USERS];
    }

    public static function listLocations(): array
    {
        $locs = DB::select('SELECT * FROM locations ORDER BY id ASC');
        $plots = DB::select(
            'SELECT p.*, l.mouza_bn, l.mouza_en, l.upazila_bn, l.upazila_en, l.district_bn, l.district_en
             FROM plots p
             JOIN locations l ON l.id = p.location_id
             ORDER BY p.id ASC'
        );
        return ['locations' => $locs, 'plots' => $plots];
    }

    public static function listPersons(): array
    {
        $persons = DB::select('SELECT * FROM persons ORDER BY id ASC');
        return ['items' => $persons, 'total' => count($persons)];
    }

    public static function citizenCheckBeforeYouBuy(int $plotId, ?float $requestedAreaDecimal = null, ?int $sellerId = null): array
    {
        $bundle = self::loadPlotBundle($plotId);
        $sellerPerson = null;
        if ($sellerId !== null) {
            $sellerPerson = DB::selectOne('SELECT * FROM persons WHERE id = ?', [$sellerId]);
        } elseif (!empty($bundle['latest_owner_persons'])) {
            $sellerPerson = $bundle['latest_owner_persons'][0];
        }

        $evalArea = $requestedAreaDecimal ?? ((float) $bundle['plot']['total_area_decimal'] * 0.5);
        $risk = FraudRulesEngine::evaluatePlotAndTransaction(
            $bundle['plot'],
            $bundle['khatians'],
            $bundle['latest_ownerships'],
            $bundle['latest_owner_persons'],
            $bundle['deeds'],
            $bundle['mortgages'],
            $sellerPerson,
            (float) $evalArea,
            null,
            null,
            true
        );

        return [
            'plot' => $bundle['plot'],
            'location' => $bundle['location'],
            'current_owners' => $bundle['latest_ownerships'],
            'khatian_chain' => $bundle['khatians'],
            'ownership_history' => $bundle['ownerships'],
            'deeds' => $bundle['deeds'],
            'mutations' => $bundle['mutations'],
            'mortgages' => $bundle['mortgages'],
            'risk_report' => $risk,
        ];
    }

    public static function listDemoScenarios(): array
    {
        $rows = DB::select('SELECT * FROM demo_scenarios ORDER BY scenario_no ASC');
        $enriched = [];
        foreach ($rows as $sc) {
            $bundle = self::loadPlotBundle((int) $sc['plot_id']);
            $seller = DB::selectOne('SELECT * FROM persons WHERE id = ?', [$sc['seller_id']]);
            $buyer = DB::selectOne('SELECT * FROM persons WHERE id = ?', [$sc['buyer_id']]);
            $risk = FraudRulesEngine::evaluatePlotAndTransaction(
                $bundle['plot'],
                $bundle['khatians'],
                $bundle['latest_ownerships'],
                $bundle['latest_owner_persons'],
                $bundle['deeds'],
                $bundle['mortgages'],
                $seller,
                (float) $sc['requested_area_decimal'],
                $sc['seller_nid_override'] ?? null
            );
            $enriched[] = array_merge($sc, [
                'plot' => $bundle['plot'],
                'location' => $bundle['location'],
                'seller' => $seller,
                'buyer' => $buyer,
                'live_verdict' => $risk['verdict'],
                'live_risk_score' => $risk['risk_score'],
                'live_flags' => $risk['flags'],
                'live_summary_bn' => $risk['summary_bn'],
                'live_summary_en' => $risk['summary_en'],
            ]);
        }
        return ['items' => $enriched, 'total' => count($enriched)];
    }

    public static function subRegistrarPreCheck(array $req): array
    {
        $plotId = (int) ($req['plot_id'] ?? 1);
        $sellerId = (int) ($req['seller_id'] ?? 1);
        $buyerId = (int) ($req['buyer_id'] ?? 2);
        $requestedArea = (float) ($req['requested_area_decimal'] ?? 10.0);

        $bundle = self::loadPlotBundle($plotId);
        $seller = DB::selectOne('SELECT * FROM persons WHERE id = ?', [$sellerId]);
        $buyer = DB::selectOne('SELECT * FROM persons WHERE id = ?', [$buyerId]);
        if (!$seller || !$buyer) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'PARTY_NOT_FOUND',
                'message_bn' => 'বিক্রেতা বা ক্রেতার তথ্য পাওয়া যায়নি।',
                'message_en' => 'Seller or buyer record was not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $risk = FraudRulesEngine::evaluatePlotAndTransaction(
            $bundle['plot'],
            $bundle['khatians'],
            $bundle['latest_ownerships'],
            $bundle['latest_owner_persons'],
            $bundle['deeds'],
            $bundle['mortgages'],
            $seller,
            $requestedArea,
            isset($req['seller_nid']) ? (string) $req['seller_nid'] : null,
            isset($req['seller_name']) ? (string) $req['seller_name'] : null,
            !empty($req['check_rapid_resale']),
            $bundle['disputes']
        );

        $nowIso = gmdate('c');
        $reportId = DB::insert(
            'INSERT INTO risk_reports (plot_id, seller_id, buyer_id, requested_area_decimal, verdict, risk_score, flags_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [$plotId, $sellerId, $buyerId, $requestedArea, $risk['verdict'], $risk['risk_score'], LedgerService::canonicalJson($risk['flags']), $nowIso]
        );

        return [
            'report_id' => $reportId,
            'plot' => $bundle['plot'],
            'location' => $bundle['location'],
            'seller' => $seller,
            'buyer' => $buyer,
            'current_owners' => $bundle['latest_ownerships'],
            'khatian_chain' => $bundle['khatians'],
            'risk_report' => $risk,
        ];
    }

    public static function subRegistrarRegisterDeed(array $req, ?array $user = null): array
    {
        $checkRes = self::subRegistrarPreCheck($req);
        $risk = $checkRes['risk_report'];

        $lastDeed = DB::selectOne('SELECT content_hash, chain_index FROM deeds ORDER BY chain_index DESC LIMIT 1');
        $prevHash = $lastDeed ? (string) $lastDeed['content_hash'] : LedgerService::GENESIS_HASH;
        $nextIndex = $lastDeed ? ((int) $lastDeed['chain_index'] + 1) : 1;
        $deedNo = 'DL-2026-' . (1000 + $nextIndex);
        $nowIso = gmdate('c');

        $plotId = (int) $req['plot_id'];
        $sellerId = (int) $req['seller_id'];
        $buyerId = (int) $req['buyer_id'];
        $requestedArea = round((float) $req['requested_area_decimal'], 2);
        $priceBdt = (int) ($req['price_bdt'] ?? 1500000);
        $deedType = (string) ($req['deed_type'] ?? 'SALE');
        $forceHold = !empty($req['force_hold']);

        $totalArea = max(0.01, (float) $checkRes['plot']['total_area_decimal']);
        $shareStr = (abs($requestedArea - $totalArea) < 0.05) ? '1/1' : '1/2';
        $status = ($forceHold || $risk['verdict'] === 'HIGH_RISK') ? 'HELD' : 'PENDING_MUTATION';

        $actor = $user ?? JwtAuthService::getAuthenticatedUser() ?? ['username' => 'registrar', 'role' => 'sub_registrar'];
        $registrarUsername = (string) ($actor['username'] ?? 'registrar');

        $contentObj = [
            'deed_no' => $deedNo,
            'deed_type' => $deedType,
            'seller_id' => $sellerId,
            'buyer_id' => $buyerId,
            'plot_id' => $plotId,
            'share_fraction' => $shareStr,
            'area_decimal' => $requestedArea,
            'price_bdt' => $priceBdt,
            'registered_by' => $registrarUsername,
            'created_at' => $nowIso,
        ];
        $canonicalStr = LedgerService::canonicalJson($contentObj);
        $contentHash = LedgerService::computeDeedHash($contentObj, $prevHash, $nextIndex);
        $signature = LedgerService::signHash($contentHash);

        $deedId = DB::insert(
            'INSERT INTO deeds (deed_no, deed_type, seller_id, buyer_id, plot_id, share_fraction, area_decimal, price_bdt, status, content_json, original_content_json, content_hash, prev_hash, signature, chain_index, registered_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$deedNo, $deedType, $sellerId, $buyerId, $plotId, $shareStr, $requestedArea, $priceBdt, $status, $canonicalStr, $canonicalStr, $contentHash, $prevHash, $signature, $nextIndex, $registrarUsername, $nowIso]
        );

        $mutationCaseNo = null;
        if ($status === 'PENDING_MUTATION') {
            $mutationCaseNo = 'MUT-2026-' . (500 + $nextIndex);
            DB::insert(
                "INSERT INTO mutations (case_no, deed_id, plot_id, seller_id, buyer_id, area_decimal, status, decision_reason_bn, decision_reason_en, created_at) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, 'Registered by Sub-Registrar and queued for AC Land e-Mutation.', ?)",
                [$mutationCaseNo, $deedId, $plotId, $sellerId, $buyerId, $requestedArea, $req['officer_notes_bn'] ?? 'সাব-রেজিস্ট্রার কর্তৃক নিবন্ধিত ও ই-নামজারির জন্য প্রেরিত।', $nowIso]
            );
        }

        DatabaseSeeder::appendAuditEntry(
            $registrarUsername,
            (string) ($actor['role'] ?? 'sub_registrar'),
            ($status === 'HELD') ? 'DEED_HELD' : 'DEED_REGISTERED',
            'deed',
            (string) $deedId,
            [
                'deed_no' => $deedNo,
                'status' => $status,
                'verdict' => $risk['verdict'],
                'area_decimal' => $requestedArea,
                'mutation_case_no' => $mutationCaseNo,
            ],
            $nowIso
        );

        $verifyUrl = LedgerService::buildVerifyUrl($deedId, $contentHash);
        return [
            'deed_id' => $deedId,
            'deed_no' => $deedNo,
            'status' => $status,
            'chain_index' => $nextIndex,
            'content_hash' => $contentHash,
            'prev_hash' => $prevHash,
            'signature' => $signature,
            'verify_url' => $verifyUrl,
            'qr_svg_data_uri' => LedgerService::generateQrSvgDataUri($verifyUrl),
            'mutation_case_no' => $mutationCaseNo,
            'risk_report' => $risk,
            'message_bn' => ($status === 'HELD')
                ? "দলিল নং {$deedNo} ঝুঁকিপূর্ণ হওয়ায় স্থগিত (HOLD) রাখা হয়েছে।"
                : "দলিল নং {$deedNo} সফলভাবে ডিজিটাল স্বাক্ষরসহ লেজারে নিবন্ধিত হয়েছে এবং ই-নামজারি কেস ({$mutationCaseNo}) খোলা হয়েছে।",
            'message_en' => ($status === 'HELD')
                ? "Deed {$deedNo} placed on HOLD due to high fraud risk."
                : "Deed {$deedNo} cryptographically signed and registered; e-Mutation case ({$mutationCaseNo}) queued.",
        ];
    }

    public static function listMutations(?string $status = null): array
    {
        $where = $status ? 'WHERE m.status = ?' : '';
        $params = $status ? [$status] : [];
        $rows = DB::select(
            "SELECT m.*,
                    d.deed_no, d.deed_type, d.content_json, d.original_content_json,
                    d.content_hash, d.prev_hash, d.signature, d.chain_index,
                    p.dag_no, p.dag_no_bn, p.total_area_decimal,
                    l.mouza_bn, l.mouza_en, l.upazila_bn, l.upazila_en,
                    s.name_bn AS seller_name_bn, s.name_en AS seller_name_en, s.nid AS seller_nid,
                    b.name_bn AS buyer_name_bn, b.name_en AS buyer_name_en, b.nid AS buyer_nid
             FROM mutations m
             JOIN deeds d ON d.id = m.deed_id
             JOIN plots p ON p.id = m.plot_id
             JOIN locations l ON l.id = p.location_id
             JOIN persons s ON s.id = m.seller_id
             JOIN persons b ON b.id = m.buyer_id
             {$where}
             ORDER BY CASE WHEN m.status = 'PENDING' THEN 0 ELSE 1 END, m.id DESC",
            $params
        );

        $items = [];
        foreach ($rows as $row) {
            $deedVer = LedgerService::verifyDeedRecord($row);
            $bundle = self::loadPlotBundle((int) $row['plot_id']);
            $sellerPerson = DB::selectOne('SELECT * FROM persons WHERE id = ?', [$row['seller_id']]);
            $existingDeeds = $deedVer['is_valid']
                ? array_values(array_filter($bundle['deeds'], fn(array $d) => (int) $d['id'] !== (int) $row['deed_id']))
                : $bundle['deeds'];

            $risk = FraudRulesEngine::evaluatePlotAndTransaction(
                $bundle['plot'],
                $bundle['khatians'],
                $bundle['latest_ownerships'],
                $bundle['latest_owner_persons'],
                $existingDeeds,
                $bundle['mortgages'],
                $sellerPerson,
                (float) $row['area_decimal']
            );

            $items[] = [
                'id' => (int) $row['id'],
                'case_no' => $row['case_no'],
                'deed_id' => (int) $row['deed_id'],
                'deed_no' => $row['deed_no'],
                'plot_id' => (int) $row['plot_id'],
                'dag_no' => $row['dag_no'],
                'dag_no_bn' => $row['dag_no_bn'],
                'mouza_bn' => $row['mouza_bn'],
                'mouza_en' => $row['mouza_en'],
                'upazila_bn' => $row['upazila_bn'],
                'upazila_en' => $row['upazila_en'],
                'seller_id' => (int) $row['seller_id'],
                'seller_name_bn' => $row['seller_name_bn'],
                'seller_name_en' => $row['seller_name_en'],
                'seller_nid' => $row['seller_nid'],
                'buyer_id' => (int) $row['buyer_id'],
                'buyer_name_bn' => $row['buyer_name_bn'],
                'buyer_name_en' => $row['buyer_name_en'],
                'buyer_nid' => $row['buyer_nid'],
                'area_decimal' => (float) $row['area_decimal'],
                'status' => $row['status'],
                'decision_reason_bn' => $row['decision_reason_bn'],
                'decision_reason_en' => $row['decision_reason_en'],
                'decided_by' => $row['decided_by'],
                'decided_at' => $row['decided_at'],
                'created_at' => $row['created_at'],
                'deed_verification' => $deedVer,
                'risk_report' => $risk,
            ];
        }
        return ['items' => $items, 'total' => count($items)];
    }

    public static function decideMutationCase(int $mutationId, array $req, ?array $user = null): array
    {
        $mut = DB::selectOne('SELECT * FROM mutations WHERE id = ?', [$mutationId]);
        if (!$mut) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'MUTATION_NOT_FOUND',
                'message_bn' => 'নামজারি কেসটি পাওয়া যায়নি।',
                'message_en' => 'Mutation case not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $decision = strtoupper(trim((string) ($req['decision'] ?? 'APPROVED')));
        $reasonBn = (string) ($req['reason_bn'] ?? '');
        $reasonEn = (string) ($req['reason_en'] ?? $reasonBn);
        $nowIso = gmdate('c');
        $actor = $user ?? JwtAuthService::getAuthenticatedUser() ?? ['username' => 'acland', 'role' => 'ac_land'];
        $officer = (string) ($actor['username'] ?? 'acland');

        DB::statement(
            'UPDATE mutations SET status = ?, decision_reason_bn = ?, decision_reason_en = ?, decided_by = ?, decided_at = ? WHERE id = ?',
            [$decision, $reasonBn, $reasonEn, $officer, $nowIso, $mutationId]
        );

        if ($decision === 'APPROVED') {
            DB::statement("UPDATE deeds SET status = 'MUTATED' WHERE id = ?", [$mut['deed_id']]);
            $plot = DB::selectOne('SELECT * FROM plots WHERE id = ?', [$mut['plot_id']]);
            $bsKhatian = DB::selectOne("SELECT * FROM khatian_records WHERE plot_id = ? AND survey_type = 'BS'", [$mut['plot_id']]);
            if ($plot && $bsKhatian) {
                $totalArea = max(0.01, (float) $plot['total_area_decimal']);
                $transferArea = (float) $mut['area_decimal'];
                $sellerOwn = DB::selectOne(
                    'SELECT * FROM ownerships WHERE plot_id = ? AND person_id = ? AND is_latest = 1',
                    [$mut['plot_id'], $mut['seller_id']]
                );
                if ($sellerOwn) {
                    $newSellerArea = max(0.0, round((float) $sellerOwn['area_decimal'] - $transferArea, 2));
                    if ($newSellerArea <= 0.01) {
                        DB::statement('UPDATE ownerships SET is_latest = 0, area_decimal = 0 WHERE id = ?', [$sellerOwn['id']]);
                    } else {
                        DB::statement('UPDATE ownerships SET area_decimal = ?, share_float = ? WHERE id = ?', [$newSellerArea, round($newSellerArea / $totalArea, 4), $sellerOwn['id']]);
                    }
                }
                DB::insert(
                    "INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, '1/2', ?, ?, 1)",
                    [$bsKhatian['id'], $mut['plot_id'], $mut['buyer_id'], round($transferArea / $totalArea, 4), round($transferArea, 2)]
                );
            }
        } else {
            DB::statement("UPDATE deeds SET status = 'REJECTED' WHERE id = ?", [$mut['deed_id']]);
        }

        DatabaseSeeder::appendAuditEntry(
            $officer,
            (string) ($actor['role'] ?? 'ac_land'),
            "MUTATION_{$decision}",
            'mutation',
            (string) $mutationId,
            [
                'case_no' => $mut['case_no'],
                'deed_id' => $mut['deed_id'],
                'plot_id' => $mut['plot_id'],
                'decision' => $decision,
                'reason_bn' => $reasonBn,
            ],
            $nowIso
        );

        return [
            'mutation_id' => $mutationId,
            'case_no' => $mut['case_no'],
            'status' => $decision,
            'decided_by' => $officer,
            'decided_at' => $nowIso,
            'message_bn' => ($decision === 'APPROVED')
                ? "নামজারি কেস নং {$mut['case_no']} অনুমোদিত হয়েছে এবং বিএস খতিয়ানে ক্রেতার মালিকানা হালনাগাদ করা হয়েছে।"
                : "নামজারি কেস নং {$mut['case_no']} না-মঞ্জুর (বাতিল) করা হয়েছে।",
            'message_en' => ($decision === 'APPROVED')
                ? "Mutation case {$mut['case_no']} approved and BS khatian ownership updated."
                : "Mutation case {$mut['case_no']} rejected.",
        ];
    }

    public static function listMortgages(): array
    {
        $rows = DB::select(
            "SELECT m.*,
                    p.dag_no, p.dag_no_bn, p.total_area_decimal,
                    l.mouza_bn, l.mouza_en, l.upazila_bn, l.upazila_en,
                    per.name_bn AS borrower_name_bn, per.name_en AS borrower_name_en, per.nid AS borrower_nid
             FROM mortgages_liens m
             JOIN plots p ON p.id = m.plot_id
             JOIN locations l ON l.id = p.location_id
             JOIN persons per ON per.id = m.borrower_id
             ORDER BY CASE WHEN m.status = 'ACTIVE' THEN 0 ELSE 1 END, m.id DESC"
        );
        return ['items' => $rows, 'total' => count($rows)];
    }

    public static function bankCollateralCheck(array $req): array
    {
        $plotId = (int) ($req['plot_id'] ?? 6);
        $borrowerId = (int) ($req['borrower_id'] ?? 11);
        $areaMortgaged = (float) ($req['area_mortgaged_decimal'] ?? 15.0);

        $bundle = self::loadPlotBundle($plotId);
        $borrower = DB::selectOne('SELECT * FROM persons WHERE id = ?', [$borrowerId]);
        if (!$borrower) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'BORROWER_NOT_FOUND',
                'message_bn' => 'ঋণগ্রহীতার তথ্য পাওয়া যায়নি।',
                'message_en' => 'Borrower not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $risk = FraudRulesEngine::evaluatePlotAndTransaction(
            $bundle['plot'],
            $bundle['khatians'],
            $bundle['latest_ownerships'],
            $bundle['latest_owner_persons'],
            $bundle['deeds'],
            $bundle['mortgages'],
            $borrower,
            $areaMortgaged
        );

        return [
            'plot' => $bundle['plot'],
            'location' => $bundle['location'],
            'borrower' => $borrower,
            'active_mortgages' => array_values(array_filter($bundle['mortgages'], fn(array $m) => $m['status'] === 'ACTIVE')),
            'risk_report' => $risk,
            'can_create_lien' => $risk['verdict'] === 'SAFE',
        ];
    }

    public static function createMortgageLien(array $req, ?array $user = null): array
    {
        $check = self::bankCollateralCheck($req);
        if ($check['risk_report']['verdict'] === 'HIGH_RISK') {
            $firstFlag = $check['risk_report']['flags'][0] ?? null;
            throw new \RuntimeException(json_encode([
                'status' => 409,
                'code' => 'COLLATERAL_HIGH_RISK_BLOCKED',
                'message_bn' => $firstFlag['message_bn'] ?? 'এই জমিতে ইতিমধ্যে সক্রিয় বন্ধক বা মালিকানা ঝুঁকি থাকায় নতুন ঋণ বন্ধক ব্লক করা হয়েছে।',
                'message_en' => $firstFlag['message_en'] ?? 'Double mortgage or ownership risk detected; collateral lien creation blocked.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $nowIso = gmdate('c');
        $plotId = (int) $req['plot_id'];
        $borrowerId = (int) $req['borrower_id'];
        $loanBdt = (int) $req['requested_loan_bdt'];
        $areaDec = (float) $req['area_mortgaged_decimal'];
        $bankBn = (string) ($req['bank_name_bn'] ?? 'সোনালী ব্যাংক পিএলসি');
        $bankEn = (string) ($req['bank_name_en'] ?? 'Sonali Bank PLC');
        $branchBn = (string) ($req['branch_bn'] ?? 'সাভার শাখা, ঢাকা');

        $lienId = DB::insert(
            "INSERT INTO mortgages_liens (plot_id, borrower_id, bank_name_bn, bank_name_en, branch_bn, amount_bdt, area_mortgaged_decimal, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)",
            [$plotId, $borrowerId, $bankBn, $bankEn, $branchBn, $loanBdt, $areaDec, $nowIso]
        );

        $actor = $user ?? JwtAuthService::getAuthenticatedUser() ?? ['username' => 'bank', 'role' => 'bank_officer'];
        DatabaseSeeder::appendAuditEntry(
            (string) ($actor['username'] ?? 'bank'),
            (string) ($actor['role'] ?? 'bank_officer'),
            'MORTGAGE_LIEN_CREATED',
            'mortgage',
            (string) $lienId,
            [
                'plot_id' => $plotId,
                'bank_name_en' => $bankEn,
                'amount_bdt' => $loanBdt,
                'area_mortgaged_decimal' => $areaDec,
            ],
            $nowIso
        );

        $bdtBn = FraudRulesEngine::toBnNum(number_format($loanBdt));
        return [
            'lien_id' => $lienId,
            'status' => 'ACTIVE',
            'message_bn' => "দাগ নং {$check['plot']['dag_no_bn']}-এ ৳{$bdtBn} টাকার ব্যাংক বন্ধক সফলভাবে নিবন্ধিত হয়েছে।",
            'message_en' => 'Mortgage lien of BDT ' . number_format($loanBdt) . " registered on Dag {$check['plot']['dag_no']}.",
        ];
    }

    public static function releaseMortgageLien(int $lienId, ?array $user = null): array
    {
        $lien = DB::selectOne('SELECT * FROM mortgages_liens WHERE id = ?', [$lienId]);
        if (!$lien) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'LIEN_NOT_FOUND',
                'message_bn' => 'বন্ধক রেকর্ডটি পাওয়া যায়নি।',
                'message_en' => 'Mortgage lien record not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $nowIso = gmdate('c');
        DB::statement("UPDATE mortgages_liens SET status = 'RELEASED', released_at = ? WHERE id = ?", [$nowIso, $lienId]);

        $actor = $user ?? JwtAuthService::getAuthenticatedUser() ?? ['username' => 'bank', 'role' => 'bank_officer'];
        DatabaseSeeder::appendAuditEntry(
            (string) ($actor['username'] ?? 'bank'),
            (string) ($actor['role'] ?? 'bank_officer'),
            'MORTGAGE_LIEN_RELEASED',
            'mortgage',
            (string) $lienId,
            ['plot_id' => $lien['plot_id'], 'bank_name_en' => $lien['bank_name_en']],
            $nowIso
        );

        return [
            'lien_id' => $lienId,
            'status' => 'RELEASED',
            'released_at' => $nowIso,
            'message_bn' => 'ব্যাংক বন্ধক সফলভাবে অবমুক্ত (Release) করা হয়েছে।',
            'message_en' => 'Bank mortgage lien released successfully.',
        ];
    }

    public static function getAuditLog(): array
    {
        $rows = DB::select('SELECT * FROM audit_log ORDER BY chain_index DESC');
        foreach ($rows as &$r) {
            $r['details'] = json_decode((string) ($r['details_json'] ?? '{}'), true) ?: [];
        }
        unset($r);
        return ['items' => $rows, 'total' => count($rows)];
    }

    public static function parseDummyKhatianOcr(array $req): array
    {
        $presetId = (string) ($req['preset_id'] ?? 'bs_4101');
        $presets = [
            'bs_4101' => [
                'raw_ocr_text_bn' => "বাংলাদেশ ফরম নং ৫৪৬২ (সংশোধিত)\nবিএস খতিয়ান নং: ৪১০১ | মৌজা: বিরুলিয়া | জে.এল নং: ১২ | উপজেলা: সাভার | জেলা: ঢাকা\nমালিকের নাম: মো. রফিকুল ইসলাম, পিতা: মৃত হাজী আবদুল জব্বার\nঅংশ: ১/১ (এক অংশ) | দাগ নং: ১০১ | জমির শ্রেণী: ভিটা (আবাসিক) | মোট পরিমাণ: ২০.০০ শতাংশ",
                'structured' => [
                    'survey_type' => 'BS',
                    'khatian_no' => '4101',
                    'khatian_no_bn' => '৪১০১',
                    'mouza_bn' => 'বিরুলিয়া',
                    'mouza_en' => 'Birulia',
                    'jl_no' => '12',
                    'upazila_bn' => 'সাভার',
                    'district_bn' => 'ঢাকা',
                    'owner_name_bn' => 'মো. রফিকুল ইসলাম',
                    'father_name_bn' => 'মৃত হাজী আবদুল জব্বার',
                    'share_fraction' => '1/1',
                    'dag_no' => '101',
                    'dag_no_bn' => '১০১',
                    'land_type_bn' => 'ভিটা (আবাসিক)',
                    'area_decimal' => 20.0,
                    'matched_plot_id' => 1,
                ],
            ],
            'bs_4107_mismatch' => [
                'raw_ocr_text_bn' => "বাংলাদেশ ফরম নং ৫৪৬২ (সংশোধিত)\nবিএস খতিয়ান নং: ৪১০৭ | মৌজা: বিরুলিয়া | জে.এল নং: ১২ | উপজেলা: সাভার | জেলা: ঢাকা\nমালিকের নাম: মো. শহিদুল ইসলাম, পিতা: মৃত ইসমাইল হোসেন\nঅংশ: ১/১ | দাগ নং: ১০৭ | জমির শ্রেণী: ভিটা | মোট পরিমাণ: ২৬.০০ শতাংশ (আরএস খতিয়ানে ছিল ১৮.০০ শতাংশ)",
                'structured' => [
                    'survey_type' => 'BS',
                    'khatian_no' => '4107',
                    'khatian_no_bn' => '৪১০৭',
                    'mouza_bn' => 'বিরুলিয়া',
                    'mouza_en' => 'Birulia',
                    'jl_no' => '12',
                    'upazila_bn' => 'সাভার',
                    'district_bn' => 'ঢাকা',
                    'owner_name_bn' => 'মো. শহিদুল ইসলাম',
                    'father_name_bn' => 'মৃত ইসমাইল হোসেন',
                    'share_fraction' => '1/1',
                    'dag_no' => '107',
                    'dag_no_bn' => '১০৭',
                    'land_type_bn' => 'ভিটা (আবাসিক)',
                    'area_decimal' => 26.0,
                    'matched_plot_id' => 7,
                ],
            ],
        ];
        $chosen = $presets[$presetId] ?? $presets['bs_4101'];
        return [
            'engine' => 'Tesseract OCR (ben) + BhumiShield Laravel Field Parser (Demo)',
            'preset_id' => $presetId,
            'raw_ocr_text_bn' => $req['raw_bangla_text'] ?? $chosen['raw_ocr_text_bn'],
            'extracted_fields' => $chosen['structured'],
            'confidence' => 0.97,
            'message_bn' => 'ডামি খতিয়ান স্ক্যান হতে বাংলা টেক্সট ও ফিল্ডসমূহ সফলভাবে এক্সট্রাক্ট করা হয়েছে।',
            'message_en' => 'Bangla text and structured fields extracted from dummy khatian scan.',
        ];
    }
}
