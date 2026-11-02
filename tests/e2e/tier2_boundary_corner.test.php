<?php

declare(strict_types=1);

namespace Tests\E2E;

require_once __DIR__ . '/E2ETestHelper.php';

use Tests\E2E\E2ETestHelper as H;
use App\Support\DB;
use App\Services\JwtAuthService;
use App\Services\ParcelGeometry;

final class Tier2BoundaryCornerTest
{
    public static function runAll(): array
    {
        $tests = [
            'test_01_unauthenticated_request_fails_closed_401' => 'Anonymous request to protected routes fails closed with 401 AUTH_REQUIRED',
            'test_02_unauthorized_role_access_fails_closed_403' => 'Unauthorized roles blocked with 403 FORBIDDEN_ROLE',
            'test_03_rule_m3_admin_cannot_edit_land_data_or_approve_mutations_403' => 'Rule M3: Admin cannot mutate land data or approve transfers (403 ADMIN_CANNOT_EDIT_LAND_DATA)',
            'test_04_suspended_account_fails_closed_403' => 'Suspended accounts fail closed with 403 ACCOUNT_SUSPENDED',
            'test_05_maker_checker_segregation_policy_422' => 'Maker-checker segregation prevents self-approval of own work',
            'test_06_invalid_negative_or_zero_areas_rejected_422' => 'Negative and zero land areas strictly rejected with 422',
            'test_07_invalid_geometry_and_polygon_constraints_422' => 'Self-intersecting polygons and invalid GeoJSON rejected with 422',
            'test_08_tampered_deed_cryptographic_verification_detects_hash_mismatch' => 'Cryptographic ledger detects tampered deed content hash mismatch',
            'test_09_nonexistent_resources_return_honest_404' => 'Non-existent plots, deeds, lawyers and notices return honest 404',
            'test_10_missing_required_payload_fields_return_422' => 'Incomplete request payloads return 422 validation errors',
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
            'tier' => 'Tier 2 - Boundary & Corner Cases (Security & Invariants)',
            'total' => count($tests),
            'passed' => $passed,
            'failed' => $failed,
            'results' => $results,
        ];
    }

    public static function test_01_unauthenticated_request_fails_closed_401(): void
    {
        $endpoints = [
            ['GET', '/api/v1/citizen/my-properties'],
            ['GET', '/api/v1/mutations'],
            ['GET', '/api/v1/mortgages'],
            ['POST', '/api/v1/lawyers/file-case', ['plot_id' => 1]],
            ['GET', '/api/v1/admin/users'],
            ['GET', '/api/v1/field-reports'],
        ];

        foreach ($endpoints as $ep) {
            $method = $ep[0];
            $uri = $ep[1];
            $body = $ep[2] ?? [];
            $res = H::callRoute($method, $uri, $body, null);
            H::assertStatus(401, $res, "Unauthenticated access to {$uri}");
            H::assertEqual('AUTH_REQUIRED', $res['code'] ?? $res['data']['code'] ?? '', "Expected AUTH_REQUIRED for {$uri}");
        }
    }

    public static function test_02_unauthorized_role_access_fails_closed_403(): void
    {
        // Citizen accessing AC Land mutations docket
        $citToken = H::loginAs('citizen');
        $res1 = H::callRoute('GET', '/api/v1/mutations', [], $citToken);
        H::assertStatus(403, $res1, 'Citizen accessing mutations');
        H::assertEqual('FORBIDDEN_ROLE', $res1['code'] ?? $res1['data']['code'] ?? '');

        // Citizen accessing Bank mortgages
        $res2 = H::callRoute('GET', '/api/v1/mortgages', [], $citToken);
        H::assertStatus(403, $res2, 'Citizen accessing mortgages');
        H::assertEqual('FORBIDDEN_ROLE', $res2['code'] ?? $res2['data']['code'] ?? '');

        // Bank officer updating Sub-Registrar deed status
        $bankToken = H::loginAs('bank_officer');
        $res3 = H::callRoute('POST', '/api/v1/registrar/deeds/1/status', ['status' => 'REJECTED'], $bankToken);
        H::assertStatus(403, $res3, 'Bank officer mutating deed status');
        H::assertEqual('FORBIDDEN_ROLE', $res3['code'] ?? $res3['data']['code'] ?? '');

        // FVO deciding mutation case
        $fvoToken = H::loginAs('field_verification_officer');
        $res4 = H::callRoute('POST', '/api/v1/mutations/1/decision', ['decision' => 'APPROVED'], $fvoToken);
        H::assertStatus(403, $res4, 'FVO approving mutation');
        H::assertEqual('FORBIDDEN_ROLE', $res4['code'] ?? $res4['data']['code'] ?? '');
    }

    public static function test_03_rule_m3_admin_cannot_edit_land_data_or_approve_mutations_403(): void
    {
        $adminToken = H::loginAs('admin');

        // Admin attempting to approve mutation
        $res = H::callRoute('POST', '/api/v1/mutations/1/decision', [
            'decision' => 'APPROVED',
            'reason_bn' => 'প্রশাসনিক বিশেষ অনুমোদন',
        ], $adminToken);

        H::assertStatus(403, $res, 'Admin mutation approval');
        H::assertEqual('ADMIN_CANNOT_EDIT_LAND_DATA', $res['code'] ?? $res['data']['code'] ?? '', 'Rule M3 enforced');
    }

    public static function test_04_suspended_account_fails_closed_403(): void
    {
        $user = DB::selectOne("SELECT * FROM users WHERE username = 'rabeya'");
        H::assertTrue(!empty($user), 'Rabeya user exists');

        DB::statement("UPDATE users SET is_active = 0 WHERE username = 'rabeya'");

        try {
            $suspendedToken = JwtAuthService::createToken([
                'sub' => 'rabeya',
                'role' => 'citizen',
                'is_active' => 0,
                'exp' => time() + 3600,
                'ver' => (int) ($user['token_version'] ?? 1),
            ]);

            $res = H::callRoute('GET', '/api/v1/citizen/my-properties', [], $suspendedToken);
            H::assertStatus(403, $res, 'Suspended user property vault access');
            H::assertEqual('ACCOUNT_SUSPENDED', $res['code'] ?? $res['data']['code'] ?? '');
        } finally {
            DB::statement("UPDATE users SET is_active = 1 WHERE username = 'rabeya'");
        }
    }

    public static function test_05_maker_checker_segregation_policy_422(): void
    {
        $sroToken = H::loginAs('settlement_records_officer');
        $user = DB::selectOne("SELECT * FROM users WHERE role = 'settlement_records_officer' LIMIT 1");

        $makerId = (int) ($user['id'] ?? 1);
        $res = H::callRoute('POST', '/api/v1/onboarding/batches/1/decide', [
            'decision' => 'APPROVED',
            'remarks_bn' => 'স্ব-অনুমোদন নীতি লঙ্ঘন পরীক্ষা',
            'maker_user_id' => $makerId,
            'checker_user_id' => $makerId,
        ], $sroToken);

        H::assertTrue($res['status'] === 422 || $res['status'] === 403, 'Maker self-approval blocked');
    }

    public static function test_06_invalid_negative_or_zero_areas_rejected_422(): void
    {
        $regToken = H::loginAs('sub_registrar');

        // Negative requested area
        $resNeg = H::callRoute('POST', '/api/v1/registrar/register-deed', [
            'plot_id' => 1,
            'seller_id' => 1,
            'buyer_id' => 2,
            'requested_area_decimal' => -5.0,
            'price_bdt' => 100000,
            'deed_type' => 'বিক্রয় দলিল (KABALA)',
        ], $regToken);
        H::assertStatus(422, $resNeg, 'Negative requested area rejected');

        // Zero requested area
        $resZero = H::callRoute('POST', '/api/v1/registrar/register-deed', [
            'plot_id' => 1,
            'seller_id' => 1,
            'buyer_id' => 2,
            'requested_area_decimal' => 0.0,
            'price_bdt' => 100000,
            'deed_type' => 'বিক্রয় দলিল (KABALA)',
        ], $regToken);
        H::assertStatus(422, $resZero, 'Zero requested area rejected');
    }

    public static function test_07_invalid_geometry_and_polygon_constraints_422(): void
    {
        $x = 90.318;
        $y = 23.858;

        // 1. Self-intersecting bow-tie polygon
        $bow = [
            'type' => 'Polygon',
            'coordinates' => [[
                [$x, $y],
                [$x + 0.001, $y + 0.001],
                [$x + 0.001, $y],
                [$x, $y + 0.001],
                [$x, $y],
            ]],
        ];

        $caughtBow = false;
        try {
            ParcelGeometry::validate($bow);
        } catch (\Throwable $e) {
            $caughtBow = true;
            $err = json_decode($e->getMessage(), true);
            H::assertEqual(422, $err['status'] ?? 0, 'Bowtie status 422');
            H::assertEqual('SELF_INTERSECTION', $err['code'] ?? '', 'Bowtie code SELF_INTERSECTION');
        }
        H::assertTrue($caughtBow, 'ParcelGeometry rejects self-intersecting polygon');

        // 2. Malformed geometry missing valid polygon coordinates
        $caughtSingle = false;
        try {
            ParcelGeometry::validate(['type' => 'Polygon', 'coordinates' => 'not-an-array']);
        } catch (\Throwable $e) {
            $caughtSingle = true;
            $err = json_decode($e->getMessage(), true);
            H::assertEqual(422, $err['status'] ?? 0, 'Single polygon status 422');
            H::assertEqual('SINGLE_POLYGON_REQUIRED', $err['code'] ?? '', 'SINGLE_POLYGON_REQUIRED code');
        }
        H::assertTrue($caughtSingle, 'ParcelGeometry rejects malformed polygon coordinates');
    }

    public static function test_08_tampered_deed_cryptographic_verification_detects_hash_mismatch(): void
    {
        putenv('APP_ENV=testing');
        $_ENV['APP_ENV'] = 'testing';

        $deed = DB::selectOne("SELECT deed_no FROM deeds WHERE deed_no = 'DL-2026-1001'");
        H::assertTrue(!empty($deed), 'Deed fixture exists');
        $dNo = $deed['deed_no'];

        $adminToken = H::loginAs('admin');
        // Simulate tamper via official drill route
        $tamperRes = H::callRoute('POST', "/api/v1/ledger/tamper/{$dNo}", [
            'tampered_price_bdt' => 99999999,
        ], $adminToken);
        H::assertStatus(200, $tamperRes, 'Simulate deed tampering drill');

        // Verify deed now fails cryptographic hash check
        $verifyRes = H::callRoute('GET', "/api/v1/verify/deed/{$dNo}");
        H::assertStatus(200, $verifyRes, 'Verify tampered deed');
        H::assertTrue(
            ($verifyRes['data']['verification']['is_valid'] ?? true) === false,
            'Tampered deed hash mismatch correctly flagged is_valid=false'
        );

        // Restore deed integrity
        $restoreRes = H::callRoute('POST', "/api/v1/ledger/restore/{$dNo}", [], $adminToken);
        H::assertStatus(200, $restoreRes, 'Restore deed integrity');

        // Verify deed is restored to valid
        $restoredVerify = H::callRoute('GET', "/api/v1/verify/deed/{$dNo}");
        H::assertTrue($restoredVerify['data']['verification']['is_valid'] ?? false, 'Restored deed hash valid');
    }

    public static function test_09_nonexistent_resources_return_honest_404(): void
    {
        // Nonexistent plot
        $resPlot = H::callRoute('GET', '/api/v1/plots/999999');
        H::assertStatus(404, $resPlot, 'Nonexistent plot returns 404');

        // Nonexistent deed
        $resDeed = H::callRoute('GET', '/api/v1/verify/deed/DL-NONEXISTENT-9999');
        H::assertStatus(404, $resDeed, 'Nonexistent deed returns 404');

        // Nonexistent lawyer
        $resLawyer = H::callRoute('POST', '/api/v1/lawyers/verify', ['bar_council_no' => 'BC-NONEXISTENT']);
        H::assertStatus(404, $resLawyer, 'Nonexistent lawyer returns 404');

        // Nonexistent notice
        $resNotice = H::callRoute('GET', '/api/v1/notices/completely-fake-slug-9999');
        H::assertStatus(404, $resNotice, 'Nonexistent notice returns 404');
    }

    public static function test_10_missing_required_payload_fields_return_422(): void
    {
        // Register user missing password
        $resReg = H::callRoute('POST', '/api/v1/auth/register', [
            'username' => 'missing_pass_user',
        ]);
        H::assertStatus(422, $resReg, 'Register missing password');
        H::assertEqual('INVALID_REGISTRATION', $resReg['code'] ?? $resReg['data']['code'] ?? '');

        // Appointment booking missing citizen name
        $resApp = H::callRoute('POST', '/api/v1/appointments', [
            'office_id' => 1,
        ]);
        H::assertStatus(422, $resApp, 'Appointment missing citizen name');
        H::assertEqual('NAME_REQUIRED', $resApp['code'] ?? $resApp['data']['code'] ?? '');

        // SLA dispatch missing notes_bn
        $unoToken = H::loginAs('uno_supervisor');
        $resSla = H::callRoute('POST', '/api/v1/sla-dispatches', [
            'target_role' => 'ac_land',
        ], $unoToken);
        H::assertStatus(422, $resSla, 'SLA dispatch missing notes_bn');
        H::assertEqual('NOTES_REQUIRED', $resSla['code'] ?? $resSla['data']['code'] ?? '');
    }
}
