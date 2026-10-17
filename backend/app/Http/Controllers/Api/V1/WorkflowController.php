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
 * Laravel Controller for Role Workflows: Locations, Plots, Citizen Check-Before-You-Buy,
 * Sub-Registrar, AC Land Mutations, Bank Mortgages, Risk Rules, and Bangla Khatian OCR.
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
        if ($ident === '' || !isset($body['password']) || trim((string) $body['password']) === '') {
            throw new \RuntimeException(json_encode([
                'status' => 401,
                'code' => 'INVALID_CREDENTIALS',
                'message_bn' => 'ইউজারনেম এবং পাসওয়ার্ড উভয়ই আবশ্যক।',
                'message_en' => 'Both username and password are required.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $password = (string) $body['password'];
        $user = DB::selectOne('SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?', [$ident, $ident]);

        if (!$user || !JwtAuthService::verifyPassword($password, (string) $user['password_hash'])) {
            throw new \RuntimeException(json_encode([
                'status' => 401,
                'code' => 'INVALID_CREDENTIALS',
                'message_bn' => "ইউজারনেম বা পাসওয়ার্ড সঠিক নয়।",
                'message_en' => "Invalid username or password.",
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

        // Automatic rehash of legacy PBKDF2 hashes upon successful authentication
        if (JwtAuthService::needsRehash((string) $user['password_hash'])) {
            $upgraded = JwtAuthService::hashPassword($password);
            DB::statement('UPDATE users SET password_hash = ? WHERE id = ?', [$upgraded, $user['id']]);
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

    public static function listPersons(?array $query = null): array
    {
        $user = JwtAuthService::getAuthenticatedUser();
        $isOfficial = $user && in_array($user['role'] ?? '', ['sub_registrar', 'ac_land', 'bank_officer', 'admin'], true);

        $plotId = !empty($query['plot_id']) ? (int) $query['plot_id'] : null;

        if ($plotId !== null) {
            $rows = DB::select(
                'SELECT DISTINCT p.* FROM persons p
                 JOIN ownerships o ON o.person_id = p.id
                 WHERE o.plot_id = ? AND o.is_latest = 1
                 ORDER BY p.id ASC',
                [$plotId]
            );
        } elseif ($isOfficial) {
            $rows = DB::select('SELECT * FROM persons ORDER BY id ASC');
        } else {
            // Minimal public directory to support demo pre-check, strictly masked (I04)
            $rows = DB::select('SELECT id, name_bn, name_en, nid, is_deceased FROM persons ORDER BY id ASC LIMIT 25');
        }

        // Apply privacy masking for non-officials (I04)
        foreach ($rows as &$p) {
            $raw = (string) ($p['nid'] ?? '');
            if (!$isOfficial) {
                $masked = strlen($raw) >= 6 ? (substr($raw, 0, 4) . '****' . substr($raw, -2)) : '****';
                $p['nid'] = $masked;
                $p['nid_mock'] = $masked;
                $p['phone_mock'] = '';
                unset(
                    $p['address_bn'],
                    $p['address_en'],
                    $p['phone_dummy'],
                    $p['email_dummy'],
                    $p['father_name_bn'],
                    $p['father_name_en'],
                    $p['mother_name_bn'],
                    $p['mother_name_en']
                );
            } else {
                $p['nid_mock'] = $raw;
                $p['phone_mock'] = (string) ($p['phone_dummy'] ?? '');
            }
        }
        unset($p);

        return ['items' => $rows, 'total' => count($rows)];
    }

    public static function getPlotDetails(int|string $plotCodeOrId): array
    {
        $plot = \App\Services\LookupService::resolvePlot($plotCodeOrId);
        if (!$plot) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'PLOT_NOT_FOUND',
                'message_bn' => 'জমির প্লট বা দাগ নম্বরটি পাওয়া যায়নি।',
                'message_en' => 'Plot not found.',
            ], JSON_UNESCAPED_UNICODE));
        }
        $bundle = self::loadPlotBundle((int) $plot['id']);
        return \App\Services\PublicRecordService::forViewer([
            'plot' => $bundle['plot'],
            'location' => $bundle['location'],
            'current_owners' => $bundle['latest_ownerships'],
            'khatian_chain' => $bundle['khatians'],
            'ownership_history' => $bundle['ownerships'],
            'deeds' => $bundle['deeds'],
            'mortgages' => $bundle['mortgages'],
            'disputes' => $bundle['disputes'],
        ]);
    }

    public static function citizenCheckBeforeYouBuy(int|string $plotId, ?float $requestedAreaDecimal = null, ?int $sellerId = null): array
    {
        if ($requestedAreaDecimal !== null && ($requestedAreaDecimal <= 0.0 || !is_finite($requestedAreaDecimal))) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_AREA',
                'message_bn' => 'জমির পরিমাণ শূন্য বা ঋণাত্মক হতে পারে না।',
                'message_en' => 'Requested area must be positive and finite.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $plot = \App\Services\LookupService::resolvePlot($plotId);
        if (!$plot) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'PLOT_NOT_FOUND',
                'message_bn' => 'জমির প্লট বা দাগ নম্বরটি পাওয়া যায়নি।',
                'message_en' => 'Plot not found.',
            ], JSON_UNESCAPED_UNICODE));
        }
        $resolvedPlotId = (int) $plot['id'];

        $bundle = self::loadPlotBundle($resolvedPlotId);
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
            true,
            $bundle['disputes']
        );

        return \App\Services\PublicRecordService::forViewer([
            'plot' => $bundle['plot'],
            'location' => $bundle['location'],
            'current_owners' => $bundle['latest_ownerships'],
            'khatian_chain' => $bundle['khatians'],
            'ownership_history' => $bundle['ownerships'],
            'deeds' => $bundle['deeds'],
            'mutations' => $bundle['mutations'],
            'mortgages' => $bundle['mortgages'],
            'risk_report' => $risk,
        ]);
    }



    public static function subRegistrarPreCheck(array $req): array
    {
        $plotId = (int) ($req['plot_id'] ?? 1);
        $sellerId = (int) ($req['seller_id'] ?? ($req['seller_person_id'] ?? 1));
        $buyerId = (int) ($req['buyer_id'] ?? ($req['buyer_person_id'] ?? 2));
        $requestedArea = (float) ($req['requested_area_decimal'] ?? ($req['area_decimal'] ?? 10.0));

        if ($requestedArea <= 0.0 || !is_finite($requestedArea)) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_AREA',
                'message_bn' => 'জমির পরিমাণ শূন্য বা ঋণাত্মক হতে পারে না।',
                'message_en' => 'Requested area must be positive and finite.',
            ], JSON_UNESCAPED_UNICODE));
        }

        if ($sellerId === $buyerId) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_PARTIES',
                'message_bn' => 'একই ব্যক্তি একই সাথে বিক্রেতা ও ক্রেতা হতে পারেন না।',
                'message_en' => 'Seller and buyer cannot be the same person.',
            ], JSON_UNESCAPED_UNICODE));
        }

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
        $actor = RoleMiddleware::authorize(['sub_registrar', 'admin'], $user);
        $registrarUsername = (string) ($actor['username'] ?? 'registrar');

        $checkRes = self::subRegistrarPreCheck($req);
        $risk = $checkRes['risk_report'];

        $plotId = (int) $req['plot_id'];
        $sellerId = (int) ($req['seller_id'] ?? ($req['seller_person_id'] ?? 0));
        $buyerId = (int) ($req['buyer_id'] ?? ($req['buyer_person_id'] ?? 0));
        $requestedArea = round((float) ($req['requested_area_decimal'] ?? ($req['area_decimal'] ?? 0.0)), 2);
        $priceBdt = max(0, (int) ($req['price_bdt'] ?? ($req['declared_value_bdt'] ?? 1500000)));
        $deedType = (string) ($req['deed_type'] ?? 'SALE');
        $forceHold = !empty($req['force_hold']);

        if ($requestedArea <= 0.0 || !is_finite($requestedArea)) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_AREA',
                'message_bn' => 'জমির পরিমাণ অবশ্যই ধনাত্মক হতে হবে।',
                'message_en' => 'Deed area must be positive and finite.',
            ], JSON_UNESCAPED_UNICODE));
        }

        if ($sellerId === $buyerId) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_PARTIES',
                'message_bn' => 'একই ব্যক্তি একই সাথে বিক্রেতা ও ক্রেতা হতে পারেন না।',
                'message_en' => 'Seller and buyer cannot be the same person.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // Check for active dispute freeze (UPHELD_FROZEN)
        $frozenDispute = DB::selectOne("SELECT case_no FROM disputes WHERE plot_id = ? AND status = 'UPHELD_FROZEN'", [$plotId]);
        if ($frozenDispute) {
            if (!$forceHold) {
                throw new \RuntimeException(json_encode([
                    'status' => 422,
                    'code' => 'PLOT_TRANSFER_FROZEN',
                    'message_bn' => "এই দাগে সক্রিয় ট্রাইব্যুনাল স্থগিতাদেশ (কেস নং: {$frozenDispute['case_no']}) রয়েছে; দলিল নিবন্ধন নিষিদ্ধ।",
                    'message_en' => "Plot transfer is frozen under Tribunal Case {$frozenDispute['case_no']}. Registration blocked.",
                ], JSON_UNESCAPED_UNICODE));
            }
        }

        $totalArea = max(0.01, (float) $checkRes['plot']['total_area_decimal']);

        // Derive precise fraction consistently
        if (!empty($req['share_fraction']) && is_string($req['share_fraction']) && str_contains($req['share_fraction'], '/')) {
            $shareStr = trim($req['share_fraction']);
        } elseif (abs($requestedArea - $totalArea) < 0.01) {
            $shareStr = '1/1';
        } else {
            $shareStr = round($requestedArea, 2) . '/' . round($totalArea, 2);
        }

        $status = ($forceHold || $risk['verdict'] === 'HIGH_RISK') ? 'HELD' : 'PENDING_MUTATION';

        return DB::transaction(function () use (
            $plotId, $sellerId, $buyerId, $requestedArea, $priceBdt, $deedType,
            $shareStr, $status, $forceHold, $risk, $registrarUsername, $actor, $req
        ) {
            $lastDeed = DB::selectOne('SELECT content_hash, chain_index FROM deeds ORDER BY chain_index DESC LIMIT 1');
            $prevHash = $lastDeed ? (string) $lastDeed['content_hash'] : LedgerService::GENESIS_HASH;
            $nextIndex = $lastDeed ? ((int) $lastDeed['chain_index'] + 1) : 1;
            $deedNo = 'DL-2026-' . (1000 + $nextIndex);
            $nowIso = gmdate('c');

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

            // Auto-queue e-Mutation check from site_settings (F17)
            $autoQueueRow = DB::selectOne("SELECT setting_value_json FROM site_settings WHERE setting_key = 'auto_queue_emutation'");
            $autoQueue = $autoQueueRow ? (json_decode((string) $autoQueueRow['setting_value_json'], true) !== false) : true;

            $mutationCaseNo = null;
            if ($status === 'PENDING_MUTATION' && $autoQueue) {
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
                    'share_fraction' => $shareStr,
                    'mutation_case_no' => $mutationCaseNo,
                    'note_bn' => ($status === 'HELD')
                        ? "দলিল নং {$deedNo} ঝুঁকি শনাক্ত হওয়ায় আটক (HELD) রাখা হয়েছে।"
                        : "দলিল নং {$deedNo} সফলভাবে নিবন্ধিত ও ডিজিটাল স্বাক্ষরিত হয়েছে।",
                ],
                $nowIso
            );

            $verifyUrl = LedgerService::buildVerifyUrl($deedId, $contentHash);

            return [
                'deed_id' => $deedId,
                'deed_no' => $deedNo,
                'chain_index' => $nextIndex,
                'status' => $status,
                'content_hash' => $contentHash,
                'signature' => $signature,
                'verify_url' => $verifyUrl,
                'qr_svg_data_uri' => LedgerService::generateQrSvgDataUri($verifyUrl),
                'mutation_case_no' => $mutationCaseNo,
                'message_bn' => ($status === 'HELD')
                    ? "দলিল নং {$deedNo} নিবন্ধিত হলেও ঝুঁকি থাকায় সাময়িক স্থগিত (HELD) রাখা হয়েছে।"
                    : "দলিল নং {$deedNo} সফলভাবে নিবন্ধিত ও ই-নামজারির জন্য প্রেরণ করা হয়েছে।",
                'message_en' => ($status === 'HELD')
                    ? "Deed {$deedNo} registered on HOLD due to detected risk."
                    : "Deed {$deedNo} registered and queued for AC Land e-Mutation.",
            ];
        });
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
        $actor = RoleMiddleware::authorize(['ac_land'], $user);

        $decision = strtoupper(trim((string) ($req['decision'] ?? 'APPROVED')));
        if (!in_array($decision, ['APPROVED', 'REJECTED'], true)) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_DECISION',
                'message_bn' => 'সিদ্ধান্ত অবশ্যই APPROVED অথবা REJECTED হতে হবে।',
                'message_en' => 'Decision must be APPROVED or REJECTED.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $reasonBn = (string) ($req['reason_bn'] ?? '');
        $reasonEn = (string) ($req['reason_en'] ?? $reasonBn);
        $nowIso = gmdate('c');
        $officer = (string) ($actor['username'] ?? 'acland');

        return DB::transaction(function () use ($mutationId, $decision, $reasonBn, $reasonEn, $officer, $nowIso, $actor) {
            // 1. Fetch case fresh inside transaction
            $mut = DB::selectOne('SELECT * FROM mutations WHERE id = ?', [$mutationId]);
            if (!$mut) {
                throw new \RuntimeException(json_encode([
                    'status' => 404,
                    'code' => 'MUTATION_NOT_FOUND',
                    'message_bn' => 'নামজারি কেসটি পাওয়া যায়নি।',
                    'message_en' => 'Mutation case not found.',
                ], JSON_UNESCAPED_UNICODE));
            }

            // 2. Atomic Compare-And-Swap: Only transition if status is currently PENDING (I08)
            $affected = DB::statement(
                "UPDATE mutations SET status = ?, decision_reason_bn = ?, decision_reason_en = ?, decided_by = ?, decided_at = ? WHERE id = ? AND status = 'PENDING'",
                [$decision, $reasonBn, $reasonEn, $officer, $nowIso, $mutationId]
            );

            if ($affected === 0) {
                throw new \RuntimeException(json_encode([
                    'status' => 409,
                    'code' => 'MUTATION_ALREADY_DECIDED',
                    'message_bn' => "এই নামজারি কেসটি ইতিমধ্যে {$mut['status']} অবস্থায় আছে। পুনরায় সিদ্ধান্ত দেওয়া যাবে না।",
                    'message_en' => "Mutation case {$mut['case_no']} has already been decided ({$mut['status']}).",
                ], JSON_UNESCAPED_UNICODE));
            }

            if ($decision === 'APPROVED') {
                // F03: Verify deed cryptographic integrity before approval
                $deed = DB::selectOne('SELECT * FROM deeds WHERE id = ?', [$mut['deed_id']]);
                if (!$deed) {
                    throw new \RuntimeException(json_encode([
                        'status' => 404,
                        'code' => 'DEED_NOT_FOUND',
                        'message_bn' => 'সম্পর্কিত দলিলটি পাওয়া যায়নি।',
                        'message_en' => 'Associated deed not found.',
                    ], JSON_UNESCAPED_UNICODE));
                }

                $deedVer = LedgerService::verifyDeedRecord($deed);
                if (!$deedVer['is_valid']) {
                    throw new \RuntimeException(json_encode([
                        'status' => 422,
                        'code' => 'DEED_VERIFICATION_FAILED',
                        'message_bn' => 'দলিলের ক্রিপ্টোগ্রাফিক যাচাই ব্যর্থ হয়েছে (হ্যাশ বা ডিজিটাল স্বাক্ষর অসামঞ্জস্যপূর্ণ)। নামজারি অনুমোদন ব্লক করা হয়েছে।',
                        'message_en' => 'Deed cryptographic integrity check failed. Mutation approval blocked.',
                    ], JSON_UNESCAPED_UNICODE));
                }

                // F04: Check dispute freeze
                $freezeDispute = DB::selectOne(
                    "SELECT id, case_no FROM disputes WHERE plot_id = ? AND status = 'UPHELD_FROZEN'",
                    [$mut['plot_id']]
                );
                if ($freezeDispute) {
                    throw new \RuntimeException(json_encode([
                        'status' => 422,
                        'code' => 'PLOT_TRANSFER_FROZEN',
                        'message_bn' => "দাগ নংটিতে আপহোল্ড বিরোধ মামলা ({$freezeDispute['case_no']}) চলমান থাকায় নামজারি অনুমোদন স্থগিত রয়েছে।",
                        'message_en' => "Plot transfer is frozen by upheld dispute case {$freezeDispute['case_no']}.",
                    ], JSON_UNESCAPED_UNICODE));
                }

                // F02 / F09: Verify seller's current ownership and balance
                $plot = DB::selectOne('SELECT * FROM plots WHERE id = ?', [$mut['plot_id']]);
                $bsKhatian = DB::selectOne("SELECT * FROM khatian_records WHERE plot_id = ? AND survey_type = 'BS'", [$mut['plot_id']]);
                if (!$plot || !$bsKhatian) {
                    throw new \RuntimeException(json_encode([
                        'status' => 422,
                        'code' => 'KHATIAN_OR_PLOT_MISSING',
                        'message_bn' => 'জমির প্লট অথবা বিএস খতিয়ান পাওয়া যায়নি।',
                        'message_en' => 'Plot or BS khatian record missing.',
                    ], JSON_UNESCAPED_UNICODE));
                }

                $sellerOwn = DB::selectOne(
                    'SELECT * FROM ownerships WHERE plot_id = ? AND person_id = ? AND is_latest = 1',
                    [$mut['plot_id'], $mut['seller_id']]
                );
                $transferArea = (float) $mut['area_decimal'];
                if (!$sellerOwn || ((float) $sellerOwn['area_decimal'] < $transferArea - 0.001)) {
                    $avail = $sellerOwn ? (float) $sellerOwn['area_decimal'] : 0.0;
                    throw new \RuntimeException(json_encode([
                        'status' => 422,
                        'code' => 'SELLER_INSUFFICIENT_AREA',
                        'message_bn' => "বিক্রেতার বর্তমান মালিকানায় পর্যাপ্ত জমি নেই (প্রয়োজন: {$transferArea} শতাংশ, অবশিষ্ট: {$avail} শতাংশ)।",
                        'message_en' => "Seller has insufficient ownership area (needs {$transferArea} dec, has {$avail} dec).",
                    ], JSON_UNESCAPED_UNICODE));
                }

                $totalArea = max(0.01, (float) $plot['total_area_decimal']);
                $newSellerArea = max(0.0, round((float) $sellerOwn['area_decimal'] - $transferArea, 2));
                $sellerFraction = self::formatConservedFraction($newSellerArea, $totalArea);

                // Update deed status to MUTATED
                DB::statement("UPDATE deeds SET status = 'MUTATED' WHERE id = ?", [$mut['deed_id']]);

                // M3: Ownership records mutated strictly under AC Land ApproveMutation context
                \App\Services\OwnershipGuard::executeInMutationContext(
                    (string) $mut['case_no'],
                    $officer,
                    (string) ($actor['role'] ?? 'ac_land'),
                    static function () use ($newSellerArea, $sellerFraction, $totalArea, $sellerOwn, $mut, $transferArea, $bsKhatian): void {
                        // I07: Update seller ownership with exact conserved fraction (e.g. 19/23)
                        if ($newSellerArea <= 0.01) {
                            DB::statement("UPDATE ownerships SET is_latest = 0, area_decimal = 0, share_float = 0, share_fraction = '0/1' WHERE id = ?", [$sellerOwn['id']]);
                        } else {
                            DB::statement(
                                'UPDATE ownerships SET area_decimal = ?, share_float = ?, share_fraction = ? WHERE id = ?',
                                [$newSellerArea, round($newSellerArea / $totalArea, 4), $sellerFraction, $sellerOwn['id']]
                            );
                        }

                        // I07: Buyer ownership consolidation: if buyer already has an active latest holding on this plot, consolidate it
                        $existingBuyerOwn = DB::selectOne(
                            'SELECT * FROM ownerships WHERE plot_id = ? AND person_id = ? AND is_latest = 1',
                            [$mut['plot_id'], $mut['buyer_id']]
                        );

                        if ($existingBuyerOwn) {
                            $aggArea = round((float) $existingBuyerOwn['area_decimal'] + $transferArea, 2);
                            $aggFloat = round($aggArea / $totalArea, 4);
                            $buyerFraction = WorkflowController::formatConservedFraction($aggArea, $totalArea);

                            // Retire previous buyer row
                            DB::statement('UPDATE ownerships SET is_latest = 0 WHERE id = ?', [$existingBuyerOwn['id']]);

                            // Insert consolidated latest row
                            DB::insert(
                                'INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, ?, ?, ?, 1)',
                                [$bsKhatian['id'], $mut['plot_id'], $mut['buyer_id'], $buyerFraction, $aggFloat, $aggArea]
                            );
                        } else {
                            $buyerFraction = WorkflowController::formatConservedFraction($transferArea, $totalArea);

                            DB::insert(
                                'INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, ?, ?, ?, 1)',
                                [$bsKhatian['id'], $mut['plot_id'], $mut['buyer_id'], $buyerFraction, round($transferArea / $totalArea, 4), round($transferArea, 2)]
                            );
                        }
                    }
                );

                // Append audit entry
                DatabaseSeeder::appendAuditEntry(
                    $officer,
                    (string) ($actor['role'] ?? 'ac_land'),
                    'MUTATION_APPROVED',
                    'mutation',
                    (string) $mutationId,
                    [
                        'case_no' => $mut['case_no'],
                        'deed_id' => $mut['deed_id'],
                        'plot_id' => $mut['plot_id'],
                        'decision' => $decision,
                        'transferred_area' => $transferArea,
                        'buyer_id' => $mut['buyer_id'],
                        'reason_bn' => $reasonBn,
                    ],
                    $nowIso
                );

                return [
                    'mutation_id' => $mutationId,
                    'case_no' => $mut['case_no'],
                    'status' => 'APPROVED',
                    'decided_by' => $officer,
                    'decided_at' => $nowIso,
                    'message_bn' => "নামজারি কেস নং {$mut['case_no']} অনুমোদিত হয়েছে এবং বিএস খতিয়ানে ক্রেতার মালিকানা হালনাগাদ করা হয়েছে।",
                    'message_en' => "Mutation case {$mut['case_no']} approved and BS khatian ownership updated.",
                ];
            }

            // Rejection path
            DB::statement("UPDATE deeds SET status = 'REJECTED' WHERE id = ?", [$mut['deed_id']]);

            DatabaseSeeder::appendAuditEntry(
                $officer,
                (string) ($actor['role'] ?? 'ac_land'),
                'MUTATION_REJECTED',
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
                'status' => 'REJECTED',
                'decided_by' => $officer,
                'decided_at' => $nowIso,
                'message_bn' => "নামজারি কেস নং {$mut['case_no']} না-মঞ্জুর (বাতিল) করা হয়েছে।",
                'message_en' => "Mutation case {$mut['case_no']} rejected.",
            ];
        });
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
        $actor = RoleMiddleware::authorize(['bank_officer', 'bank_manager', 'admin', 'auditor']);
        if (($actor['role'] ?? '') !== 'admin' && ($actor['role'] ?? '') !== 'auditor') {
            $rows = array_values(array_filter($rows, static function (array $row) use ($actor): bool {
                try { \App\Services\BankScopeService::assertCanManage($actor, (string) $row['bank_name_en']); return true; }
                catch (\RuntimeException) { return false; }
            }));
        }
        return ['items' => $rows, 'total' => count($rows)];
    }

    public static function bankCollateralCheck(array $req): array
    {
        $plotId = (int) ($req['plot_id'] ?? 6);
        $borrowerId = (int) ($req['borrower_id'] ?? 11);
        $areaMortgaged = (float) ($req['area_mortgaged_decimal'] ?? 15.0);

        if ($areaMortgaged <= 0.0 || !is_finite($areaMortgaged)) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_AREA',
                'message_bn' => 'বন্ধকী জমির পরিমাণ শূন্য বা ঋণাত্মক হতে পারে না।',
                'message_en' => 'Mortgaged area must be positive and finite.',
            ], JSON_UNESCAPED_UNICODE));
        }

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

        // F04 / F08: Supply disputes so UPHELD_FROZEN is evaluated!
        $risk = FraudRulesEngine::evaluatePlotAndTransaction(
            $bundle['plot'],
            $bundle['khatians'],
            $bundle['latest_ownerships'],
            $bundle['latest_owner_persons'],
            $bundle['deeds'],
            $bundle['mortgages'],
            $borrower,
            $areaMortgaged,
            null,
            null,
            false,
            $bundle['disputes']
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
        $actor = $user ?? JwtAuthService::getAuthenticatedUser();
        \App\Services\BankScopeService::assertCanManage($actor, (string) ($req['bank_name_en'] ?? 'Sonali Bank PLC'));
        $check = self::bankCollateralCheck($req);
        if (!$check['can_create_lien']) {
            $firstFlag = $check['risk_report']['flags'][0] ?? null;
            throw new \RuntimeException(json_encode([
                'status' => 409,
                'code' => 'COLLATERAL_HIGH_RISK_BLOCKED',
                'message_bn' => $firstFlag['message_bn'] ?? 'এই জমিতে ইতিমধ্যে সক্রিয় বন্ধক বা মালিকানা ঝুঁকি থাকায় নতুন ঋণ বন্ধক ব্লক করা হয়েছে।',
                'message_en' => $firstFlag['message_en'] ?? 'Double mortgage or ownership risk detected; collateral lien creation blocked.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // F04 / F11: Also check if plot is frozen by UPHELD_FROZEN dispute
        $freezeDispute = DB::selectOne(
            "SELECT id, case_no FROM disputes WHERE plot_id = ? AND status = 'UPHELD_FROZEN'",
            [(int) $req['plot_id']]
        );
        if ($freezeDispute) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'PLOT_TRANSFER_FROZEN',
                'message_bn' => "দাগ নংটিতে আপহোল্ড বিরোধ মামলা ({$freezeDispute['case_no']}) চলমান থাকায় বন্ধক নিবন্ধন ব্লক করা হয়েছে।",
                'message_en' => "Plot collateral is frozen by upheld dispute case {$freezeDispute['case_no']}.",
            ], JSON_UNESCAPED_UNICODE));
        }

        $nowIso = gmdate('c');
        $plotId = (int) $req['plot_id'];
        $borrowerId = (int) $req['borrower_id'];
        $loanBdt = (int) ($req['requested_loan_bdt'] ?? $req['loan_amount_bdt'] ?? 0);
        if ($loanBdt <= 0) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_LOAN_AMOUNT',
                'message_bn' => 'ঋণের পরিমাণ ধনাত্মক সংখ্যা হতে হবে।',
                'message_en' => 'Loan amount must be a positive integer.',
            ], JSON_UNESCAPED_UNICODE));
        }
        $areaDec = (float) $req['area_mortgaged_decimal'];
        $bankBn = (string) ($req['bank_name_bn'] ?? 'সোনালী ব্যাংক পিএলসি');
        $bankEn = (string) ($req['bank_name_en'] ?? 'Sonali Bank PLC');
        $branchBn = (string) ($req['branch_bn'] ?? 'সাভার শাখা, ঢাকা');

        return DB::transaction(function () use ($plotId, $borrowerId, $bankBn, $bankEn, $branchBn, $loanBdt, $areaDec, $nowIso, $user, $check) {
            // I08: In-transaction fresh check to prevent concurrent race condition duplicates
            $activeLien = DB::selectOne(
                "SELECT id FROM mortgages_liens WHERE plot_id = ? AND status = 'ACTIVE'",
                [$plotId]
            );
            if ($activeLien) {
                throw new \RuntimeException(json_encode([
                    'status' => 409,
                    'code' => 'DUPLICATE_ACTIVE_LIEN',
                    'message_bn' => 'এই দাগে ইতিমধ্যে একটি সক্রিয় ব্যাংক বন্ধক বিদ্যমান রয়েছে। নতুন বন্ধক নিবন্ধন করা যাবে না।',
                    'message_en' => 'An active mortgage lien already exists on this plot. Cannot create duplicate active lien.',
                ], JSON_UNESCAPED_UNICODE));
            }

            try {
                $lienId = DB::insert(
                    "INSERT INTO mortgages_liens (plot_id, borrower_id, bank_name_bn, bank_name_en, branch_bn, amount_bdt, area_mortgaged_decimal, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)",
                    [$plotId, $borrowerId, $bankBn, $bankEn, $branchBn, $loanBdt, $areaDec, $nowIso]
                );
            } catch (\PDOException $pe) {
                if (
                    str_contains($pe->getMessage(), 'UNIQUE') ||
                    str_contains($pe->getMessage(), 'duplicate') ||
                    str_contains($pe->getMessage(), 'idx_active_mortgage_per_plot')
                ) {
                    throw new \RuntimeException(json_encode([
                        'status' => 409,
                        'code' => 'DUPLICATE_ACTIVE_LIEN',
                        'message_bn' => 'এই দাগে ইতিমধ্যে একটি সক্রিয় ব্যাংক বন্ধক বিদ্যমান রয়েছে। নতুন বন্ধক নিবন্ধন করা যাবে না।',
                        'message_en' => 'An active mortgage lien already exists on this plot. Cannot create duplicate active lien.',
                    ], JSON_UNESCAPED_UNICODE));
                }
                throw $pe;
            }

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
        });
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

        $actor = $user ?? JwtAuthService::getAuthenticatedUser() ?? ['username' => 'bank', 'role' => 'bank_officer'];

        \App\Services\BankScopeService::assertCanManage($actor, (string) ($lien['bank_name_en'] ?? ''));

        // F12: Repeated release must NOT overwrite the original release timestamp!
        if ($lien['status'] === 'RELEASED') {
            return [
                'lien_id' => $lienId,
                'status' => 'RELEASED',
                'released_at' => $lien['released_at'],
                'message_bn' => 'ব্যাংক বন্ধকটি ইতিমধ্যে অবমুক্ত (Released) অবস্থায় রয়েছে।',
                'message_en' => 'Bank mortgage lien is already released.',
            ];
        }

        $nowIso = gmdate('c');
        DB::statement("UPDATE mortgages_liens SET status = 'RELEASED', released_at = ? WHERE id = ?", [$nowIso, $lienId]);

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
                    'dag_no' => ['value' => '101', 'confidence' => 0.99, 'low_confidence' => false],
                    'dag_no_bn' => ['value' => '১০১', 'confidence' => 0.99, 'low_confidence' => false],
                    'survey_type' => ['value' => 'BS', 'confidence' => 0.98, 'low_confidence' => false],
                    'khatian_no' => ['value' => '4101', 'confidence' => 0.97, 'low_confidence' => false],
                    'khatian_no_bn' => ['value' => '৪১০১', 'confidence' => 0.97, 'low_confidence' => false],
                    'mouza_bn' => ['value' => 'বিরুলিয়া', 'confidence' => 0.96, 'low_confidence' => false],
                    'mouza_en' => ['value' => 'Birulia', 'confidence' => 0.95, 'low_confidence' => false],
                    'jl_no' => ['value' => '12', 'confidence' => 0.95, 'low_confidence' => false],
                    'upazila_bn' => ['value' => 'সাভার', 'confidence' => 0.97, 'low_confidence' => false],
                    'district_bn' => ['value' => 'ঢাকা', 'confidence' => 0.98, 'low_confidence' => false],
                    'owner_name_bn' => ['value' => 'মো. রফিকুল ইসলাম', 'confidence' => 0.94, 'low_confidence' => false],
                    'father_name_bn' => ['value' => 'মৃত হাজী আবদুল জব্বার', 'confidence' => 0.92, 'low_confidence' => false],
                    'share_fraction' => ['value' => '1/1', 'confidence' => 0.95, 'low_confidence' => false],
                    'land_type_bn' => ['value' => 'ভিটা (আবাসিক)', 'confidence' => 0.93, 'low_confidence' => false],
                    'area_decimal' => ['value' => '20.00', 'confidence' => 0.96, 'low_confidence' => false],
                    'matched_plot_id' => ['value' => '1', 'confidence' => 0.99, 'low_confidence' => false],
                ],
            ],
            'bs_4107_mismatch' => [
                'raw_ocr_text_bn' => "বাংলাদেশ ফরম নং ৫৪৬২ (সংশোধিত)\nবিএস খতিয়ান নং: ৪১০৭ | মৌজা: বিরুলিয়া | জে.এল নং: ১২ | উপজেলা: সাভার | জেলা: ঢাকা\nমালিকের নাম: মো. শহিদুল ইসলাম, পিতা: মৃত ইসমাইল হোসেন\nঅংশ: ১/১ | দাগ নং: ১০৭ | জমির শ্রেণী: ভিটা | মোট পরিমাণ: ২৬.০০ শতাংশ (আরএস খতিয়ানে ছিল ১৮.০০ শতাংশ)",
                'structured' => [
                    'dag_no' => ['value' => '107', 'confidence' => 0.97, 'low_confidence' => false],
                    'dag_no_bn' => ['value' => '১০৭', 'confidence' => 0.97, 'low_confidence' => false],
                    'survey_type' => ['value' => 'BS', 'confidence' => 0.96, 'low_confidence' => false],
                    'khatian_no' => ['value' => '4107', 'confidence' => 0.95, 'low_confidence' => false],
                    'khatian_no_bn' => ['value' => '৪১০৭', 'confidence' => 0.95, 'low_confidence' => false],
                    'mouza_bn' => ['value' => 'বিরুলিয়া', 'confidence' => 0.94, 'low_confidence' => false],
                    'mouza_en' => ['value' => 'Birulia', 'confidence' => 0.93, 'low_confidence' => false],
                    'jl_no' => ['value' => '12', 'confidence' => 0.93, 'low_confidence' => false],
                    'upazila_bn' => ['value' => 'সাভার', 'confidence' => 0.95, 'low_confidence' => false],
                    'district_bn' => ['value' => 'ঢাকা', 'confidence' => 0.96, 'low_confidence' => false],
                    'owner_name_bn' => ['value' => 'মো. শহিদুল ইসলাম', 'confidence' => 0.91, 'low_confidence' => false],
                    'father_name_bn' => ['value' => 'মৃত ইসমাইল হোসেন', 'confidence' => 0.89, 'low_confidence' => true],
                    'share_fraction' => ['value' => '1/1', 'confidence' => 0.94, 'low_confidence' => false],
                    'land_type_bn' => ['value' => 'ভিটা (আবাসিক)', 'confidence' => 0.90, 'low_confidence' => false],
                    'area_decimal' => ['value' => '26.00', 'confidence' => 0.82, 'low_confidence' => true],
                    'matched_plot_id' => ['value' => '7', 'confidence' => 0.98, 'low_confidence' => false],
                ],
            ],
        ];
        $chosen = $presets[$presetId] ?? $presets['bs_4101'];
        return [
            'engine' => 'Tesseract OCR (ben) + BhumiShield Field Parser (Demo Simulation)',
            'preset_id' => $presetId,
            'raw_ocr_text_bn' => $req['raw_bangla_text'] ?? $chosen['raw_ocr_text_bn'],
            'extracted_fields' => $chosen['structured'],
            'confidence' => 0.96,
            'message_bn' => 'ডামি খতিয়ান স্ক্যান হতে বাংলা টেক্সট ও ফিল্ডসমূহ সফলভাবে এক্সট্রাক্ট করা হয়েছে।',
            'message_en' => 'Bangla text and structured fields extracted from dummy khatian scan.',
        ];
    }

    public static function formatConservedFraction(float $area, float $totalArea): string
    {
        $iNum = (int) round($area);
        $iDen = (int) round($totalArea);
        if ($iNum > 0 && $iDen > 0 && abs($area - $iNum) < 0.01 && abs($totalArea - $iDen) < 0.01) {
            $g = self::gcd($iNum, $iDen);
            return ($iNum / $g) . '/' . ($iDen / $g);
        }
        return round($area, 2) . '/' . round($totalArea, 2);
    }

    private static function gcd(int $a, int $b): int
    {
        $a = abs($a);
        $b = abs($b);
        while ($b > 0) {
            $t = $b;
            $b = $a % $b;
            $a = $t;
        }
        return $a ?: 1;
    }
}
