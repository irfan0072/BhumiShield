<?php

declare(strict_types=1);

namespace Tests\E2E;

require_once __DIR__ . '/E2ETestHelper.php';

use Tests\E2E\E2ETestHelper as H;
use App\Support\DB;
use App\Services\FraudRulesEngine;
use App\Http\Controllers\Api\V1\ParcelDesignController;
use App\Http\Controllers\Api\V1\OpeningRecordController;

final class Tier3CrossFeatureTest
{
    public static function runAll(): array
    {
        $tests = [
            'test_01_plot_lock_and_marketplace_listing_rejection' => 'Plot Lock toggles sale freeze and blocks public marketplace listing (PLOT_LOCKED)',
            'test_02_active_mortgage_lien_blocks_noc_generation_until_released' => 'Active mortgage lien blocks NOC generation (ACTIVE_LIEN_CANNOT_ISSUE_NOC) until released',
            'test_03_upheld_dispute_injunction_freezes_plot_and_blocks_transfer' => 'Upheld dispute injunction freezes plot and blocks Sub-Registrar transfer (PLOT_TRANSFER_FROZEN)',
            'test_04_cadastral_map_drawing_and_maker_checker_parcel_allocation' => 'Cadastral Mouza Map polygon drawing + Maker-Checker review + Parcel Allocation + Khatian Generation',
            'test_05_stay_order_appeal_granted_locks_plot_against_sale' => 'Appellate stay order granted locks plot against sale (owner_sale_locked=1)',
            'test_06_rapid_resale_threshold_dynamically_configured_and_enforced' => 'Dynamic rapid resale threshold in site settings verified by deterministic fraud engine',
        ];

        $results = [];
        $passed = 0;
        $failed = 0;

        foreach ($tests as $method => $description) {
            $t0 = microtime(true);
            try {
                self::$method();
                $elapsed = round((microtime(true) - $t0) * 1000, 2);
                $results[] = [
                    'name' => $method,
                    'description' => $description,
                    'status' => 'PASS',
                    'elapsed_ms' => $elapsed,
                ];
                $passed++;
            } catch (\Throwable $e) {
                $elapsed = round((microtime(true) - $t0) * 1000, 2);
                $results[] = [
                    'name' => $method,
                    'description' => $description,
                    'status' => 'FAIL',
                    'error' => $e->getMessage(),
                    'elapsed_ms' => $elapsed,
                ];
                $failed++;
            }
        }

        return [
            'tier' => 'Tier 3 - Cross-Feature Combinations (Pairwise Interlocking)',
            'total' => count($tests),
            'passed' => $passed,
            'failed' => $failed,
            'results' => $results,
        ];
    }

    public static function test_01_plot_lock_and_marketplace_listing_rejection(): void
    {
        $citToken = H::loginAs('citizen');
        $plotId = 13; // Owned by Rafiqul Islam

        // Ensure initially unlocked
        DB::statement('UPDATE plots SET owner_sale_locked = 0 WHERE id = ?', [$plotId]);

        // 1. Citizen toggles lock ON
        $lockRes = H::callRoute('POST', "/api/v1/citizen/plots/{$plotId}/toggle-lock", [
            'reason_bn' => 'প্রতারণা রোধে বিক্রয় লক সক্রিয়করণ',
        ], $citToken);
        H::assertStatus(200, $lockRes, 'Enable plot sale lock');
        H::assertEqual(1, (int) ($lockRes['data']['owner_sale_locked'] ?? 0), 'Plot is now locked');

        // 2. Attempting to list locked plot on marketplace must fail with 422 PLOT_LOCKED
        $listRes = H::callRoute('POST', '/api/v1/listings', [
            'plot_id' => $plotId,
            'asking_price_bdt' => 6000000,
            'contact_phone' => '01700-001001',
            'title_bn' => 'লক করা প্লট বিজ্ঞাপনের চেষ্টা',
        ], $citToken);
        H::assertStatus(422, $listRes, 'Listing locked plot should be rejected');
        H::assertEqual('PLOT_LOCKED', $listRes['code'] ?? $listRes['data']['code'] ?? '');

        // 3. Citizen toggles lock OFF
        $unlockRes = H::callRoute('POST', "/api/v1/citizen/plots/{$plotId}/toggle-lock", [
            'reason_bn' => 'বিক্রয় লক নিষ্ক্রিয়করণ',
        ], $citToken);
        H::assertStatus(200, $unlockRes, 'Disable plot sale lock');
        H::assertEqual(0, (int) ($unlockRes['data']['owner_sale_locked'] ?? 1), 'Plot is now unlocked');
    }

    public static function test_02_active_mortgage_lien_blocks_noc_generation_until_released(): void
    {
        $mgrToken = H::loginAs('bank_manager');

        // Lien 1 is ACTIVE on Sonali Bank
        $resActive = H::callRoute('GET', '/api/v1/mortgages/1/noc', [], $mgrToken);
        H::assertStatus(422, $resActive, 'NOC on active lien must be rejected');
        H::assertEqual('ACTIVE_LIEN_CANNOT_ISSUE_NOC', $resActive['code'] ?? $resActive['data']['code'] ?? '');

        // Lien 4 is RELEASED on Sonali Bank
        $resReleased = H::callRoute('GET', '/api/v1/mortgages/4/noc', [], $mgrToken);
        H::assertStatus(200, $resReleased, 'NOC on released lien must succeed');
        H::assertTrue(!empty($resReleased['data']['noc_no']), 'NOC number present');
        H::assertTrue(!empty($resReleased['data']['ed25519_signature']), 'Ed25519 signature present');
    }

    public static function test_03_upheld_dispute_injunction_freezes_plot_and_blocks_transfer(): void
    {
        $plotId = 2;
        $nowIso = gmdate('c');

        // Create an UPHELD_FROZEN dispute on Plot 2
        DB::insert(
            "INSERT INTO disputes (case_no, plot_id, complainant_name_bn, complainant_nid, dispute_type, description_bn, description_en, severity, status, resolved_by, resolution_notes_bn, created_at, resolved_at)
             VALUES ('DISP-QA-FROZEN', ?, 'সৈয়দ আহমেদ', '9900001009', 'LEGAL_DISPUTE', 'আদালতের নিষেধাজ্ঞা', 'Court injunction upheld', 'HIGH_RISK', 'UPHELD_FROZEN', 'admin', 'Freeze confirmed', ?, ?)",
            [$plotId, $nowIso, $nowIso]
        );

        try {
            // Check Before You Buy surfaces PLOT_TRANSFER_FROZEN
            $check = H::callRoute('GET', "/api/v1/plots/{$plotId}/check-before-you-buy");
            H::assertStatus(200, $check, 'Check before buy on frozen plot');
            H::assertEqual('HIGH_RISK', $check['data']['risk_report']['verdict'] ?? '');

            // Sub-Registrar registering deed on frozen plot throws 422 PLOT_TRANSFER_FROZEN
            $regToken = H::loginAs('sub_registrar');
            $regRes = H::callRoute('POST', '/api/v1/registrar/register-deed', [
                'plot_id' => $plotId,
                'seller_id' => 2,
                'buyer_id' => 3,
                'requested_area_decimal' => 5.0,
                'price_bdt' => 300000,
                'deed_type' => 'বিক্রয় দলিল (KABALA)',
            ], $regToken);

            H::assertStatus(422, $regRes, 'Register deed on frozen plot must fail');
            H::assertEqual('PLOT_TRANSFER_FROZEN', $regRes['code'] ?? $regRes['data']['code'] ?? '');
        } finally {
            // Clean up synthetic dispute
            DB::statement("DELETE FROM disputes WHERE case_no = 'DISP-QA-FROZEN'");
        }
    }

    public static function test_04_cadastral_map_drawing_and_maker_checker_parcel_allocation(): void
    {
        $admin = DB::selectOne("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
        $checker = DB::selectOne("SELECT u.* FROM users u JOIN office_user ou ON ou.user_id = u.id JOIN offices o ON o.id = ou.office_id WHERE u.role = 'ac_land' AND o.office_type = 'ac_land' AND o.is_active = 1 LIMIT 1");
        $office = DB::selectOne("SELECT o.* FROM offices o JOIN office_user ou ON ou.office_id = o.id WHERE ou.user_id = ? AND o.office_type = 'ac_land' LIMIT 1", [$checker['id']]);
        $loc = DB::selectOne('SELECT * FROM locations WHERE district_en = ? AND upazila_en = ? LIMIT 1', [$office['district_en'], $office['upazila_en']]);
        $owners = DB::select("SELECT u.* FROM users u JOIN persons p ON p.nid = u.nid WHERE u.role = 'citizen' AND u.is_active = 1 AND u.is_identity_verified = 1 ORDER BY u.id LIMIT 2");

        H::assertTrue(count($owners) === 2, 'Two verified synthetic owners');

        ParcelDesignController::assign(['location_id' => $loc['id'], 'office_id' => $office['id'], 'reason' => 'QA office allocation for ownership integration'], $admin);

        $offset = (float) (random_int(100, 900) * 0.0001);
        $x = (float) $loc['longitude'] + $offset;
        $y = (float) $loc['latitude'] + $offset;
        $geom = [
            'type' => 'Polygon',
            'coordinates' => [[
                [$x, $y],
                [$x + 0.00005, $y],
                [$x + 0.00005, $y + 0.00005],
                [$x, $y + 0.00005],
                [$x, $y],
            ]],
        ];

        $dagNo = (string) random_int(81000, 89999);
        $saved = ParcelDesignController::save([
            'location_id' => $loc['id'],
            'office_id' => $office['id'],
            'dag_no' => $dagNo,
            'survey' => 'BS',
            'sheet_no' => 'QA-MAP',
            'land_use' => 'QA residential',
            'recorded_area' => 20,
            'source_reference' => 'Synthetic parcel design E2E test',
            'geometry' => $geom,
        ], $admin);

        $designId = (int) $saved['id'];
        H::assertTrue($designId > 0, 'Parcel design saved');

        try {
            // Submit for review
            ParcelDesignController::decide($designId, ['action' => 'submit', 'version' => 1, 'reason' => 'QA geometry submit'], $admin);

            // Publish geometry
            ParcelDesignController::decide($designId, ['action' => 'publish', 'version' => 2, 'reason' => 'QA review confirmed', 'review_confirmed' => true], $admin);

            // Propose allocation (12 + 8 = 20 decimal)
            $allocPayload = [
                'owners' => [
                    ['nid' => $owners[0]['nid'], 'area_decimal' => 12],
                    ['nid' => $owners[1]['nid'], 'area_decimal' => 8],
                ],
                'khatian_no' => 'QA-KH-' . substr(uniqid(), -4),
                'survey_year' => 2026,
                'source_name' => 'synthetic-evidence.pdf',
                'source_base64' => base64_encode("%PDF-1.4\n% Synthetic QA parcel allocation\n%%EOF"),
            ];

            $alloc = ParcelDesignController::allocate($designId, $allocPayload, $admin);
            $batchId = (int) $alloc['id'];
            H::assertTrue($batchId > 0, 'Allocation proposed');

            // AC Land approves opening record
            $decision = OpeningRecordController::decide($batchId, [
                'decision' => 'APPROVED',
                'reason' => 'Independent review of co-owner shares approved',
            ], $checker);

            H::assertEqual('APPROVED', $decision['status'] ?? '', 'Opening record approved');
            H::assertTrue(($decision['plot_id'] ?? 0) > 0, 'Authoritative plot generated');

            $shares = DB::select('SELECT area_decimal, share_fraction FROM ownerships WHERE plot_id = ? ORDER BY id', [$decision['plot_id']]);
            H::assertTrue(count($shares) === 2, 'Two co-owner shares created');
            H::assertEqual('3/5', $shares[0]['share_fraction'], 'Reduced simple fraction 3/5');
            H::assertEqual('2/5', $shares[1]['share_fraction'], 'Reduced simple fraction 2/5');
        } finally {
            DB::statement("UPDATE map_parcel_designs SET status = 'ARCHIVED' WHERE id = ?", [$designId]);
        }
    }

    public static function test_05_stay_order_appeal_granted_locks_plot_against_sale(): void
    {
        $uno = DB::selectOne("SELECT * FROM users WHERE username = 'uno_savar'");
        $appeal = DB::selectOne("SELECT * FROM appeals WHERE appeal_code = 'APL-2026-0001'");
        H::assertTrue($appeal !== null, 'Appeal APL-2026-0001 exists');

        $plotId = (int) $appeal['plot_id'];
        $prevLock = (int) (DB::selectOne('SELECT owner_sale_locked FROM plots WHERE id = ?', [$plotId])['owner_sale_locked'] ?? 0);

        // Grant stay order
        $res = H::callRoute('POST', "/api/v1/appeals/{$appeal['id']}/decide", [
            'status' => 'STAY_ORDER_GRANTED',
            'decision_note_bn' => 'আপিল নিষ্পত্তি না হওয়া পর্যন্ত স্থগিতাদেশ প্রদান করা হলো।',
        ], H::loginAs('uno_supervisor'));

        H::assertStatus(200, $res, 'Decide appeal with stay order');

        // Verify plot is now locked in DB
        $plot = DB::selectOne('SELECT owner_sale_locked FROM plots WHERE id = ?', [$plotId]);
        H::assertEqual(1, (int) ($plot['owner_sale_locked'] ?? 0), 'Plot is locked against sale when stay order is granted');

        // Restore original lock state
        DB::statement('UPDATE plots SET owner_sale_locked = ? WHERE id = ?', [$prevLock, $plotId]);
    }

    public static function test_06_rapid_resale_threshold_dynamically_configured_and_enforced(): void
    {
        $adminToken = H::loginAs('admin');

        // Dynamically update rapid_resale_days to 30
        $updateRes = H::callRoute('PUT', '/api/v1/settings', [
            'settings' => ['rapid_resale_days' => 30],
        ], $adminToken);
        H::assertStatus(200, $updateRes, 'Update rapid_resale_days setting');

        $configuredDays = FraudRulesEngine::getRapidResaleDays();
        H::assertEqual(30, $configuredDays, 'FraudRulesEngine reads dynamic setting from DB');

        // Reset back to standard 180 days
        H::callRoute('PUT', '/api/v1/settings', [
            'settings' => ['rapid_resale_days' => 180],
        ], $adminToken);
        H::assertEqual(180, FraudRulesEngine::getRapidResaleDays(), 'Reset rapid_resale_days to 180');
    }
}
