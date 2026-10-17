<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Controllers\Api\V1\CitizenVaultAndTicketController;
use App\Http\Controllers\Api\V1\RoleControlController;
use App\Http\Controllers\Api\V1\WorkflowController;
use App\Services\JwtAuthService;
use App\Services\TransferStateMachine;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Regression Test Suite for Audit Findings F01-F04 & F12:
 * Covers authentication enforcement, object scoping, adjacent state machine transitions,
 * server-owned biometric and deed evidence, real file bytes ingestion, and registrar office scoping.
 */
final class SecurityWorkflowRegressionTest
{
    private static function assertTrue(bool $cond, string $msg = 'Assertion failed'): void
    {
        if (!$cond) {
            throw new \RuntimeException($msg);
        }
    }

    private static function assertEqual(mixed $expected, mixed $actual, string $msg = ''): void
    {
        if ($expected !== $actual) {
            $eStr = is_scalar($expected) ? (string) $expected : json_encode($expected);
            $aStr = is_scalar($actual) ? (string) $actual : json_encode($actual);
            throw new \RuntimeException("{$msg} Expected [{$eStr}] but got [{$aStr}]");
        }
    }

    private static function callRoute(string $method, string $uri, array $body = [], ?string $jwt = null, array $query = []): array
    {
        $router = require __DIR__ . '/../../routes/api.php';
        if ($jwt !== null) {
            $_SERVER['HTTP_AUTHORIZATION'] = "Bearer {$jwt}";
        } else {
            unset($_SERVER['HTTP_AUTHORIZATION']);
        }

        try {
            $res = $router(strtoupper($method), $uri, $query, $body);
            return ['status' => 200, 'body' => $res];
        } catch (\Throwable $e) {
            $decoded = json_decode($e->getMessage(), true);
            if (is_array($decoded) && isset($decoded['status'])) {
                return ['status' => (int) $decoded['status'], 'body' => $decoded];
            }
            return ['status' => 500, 'error' => $e->getMessage()];
        }
    }

    public static function runAll(): int
    {
        $tmpDb = sys_get_temp_dir() . '/bhumishield_sec_workflow_test_' . getmypid() . '.sqlite';
        putenv("BHUMISHIELD_TEST_DB={$tmpDb}");
        $_ENV['BHUMISHIELD_TEST_DB'] = $tmpDb;
        DB::resetConnection();

        (new DatabaseSeeder())->run(true);

        $methods = array_values(array_filter(
            get_class_methods(self::class),
            fn(string $m) => str_starts_with($m, 'test_')
        ));

        $passed = 0;
        $failed = 0;
        echo "\n   PASS  Tests\\Feature\\SecurityWorkflowRegressionTest (Findings F01-F04 & F12)\n";

        foreach ($methods as $method) {
            $t0 = microtime(true);
            try {
                self::$method();
                $ms = round((microtime(true) - $t0) * 1000, 1);
                echo "  ✓ {$method} ({$ms}ms)\n";
                $passed++;
            } catch (\Throwable $e) {
                echo "  ⨯ {$method}: {$e->getMessage()}\n";
                $failed++;
            }
        }

        echo "\n  Security & Workflow Tests:    {$passed} passed, {$failed} failed (" . count($methods) . " total)\n\n";
        @unlink($tmpDb);
        return $failed;
    }

    public static function test_01_anonymous_transfer_advance_fails_with_401(): void
    {
        $res = self::callRoute('POST', '/api/v1/transfers/TR-2026-000103/advance', ['target_step' => 13], null);
        self::assertEqual(401, $res['status'], 'Anonymous transfer advance must return 401');

        $t = DB::selectOne("SELECT current_step, status FROM transfer_requests WHERE transfer_code = 'TR-2026-000103'");
        self::assertEqual(1, (int) $t['current_step'], 'Step must remain 1 after unauthenticated attempt');
        self::assertTrue($t['status'] !== 'COMPLETED', 'Status must not be COMPLETED');
    }

    public static function test_02_non_adjacent_transfer_transition_fails_with_422(): void
    {
        $loginRes = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'citizen', 'password' => 'demo123']);
        $jwt = $loginRes['body']['access_token'] ?? ($loginRes['body']['token'] ?? '');
        self::assertTrue(!empty($jwt), 'Citizen login must succeed');

        // Attempt non-adjacent jump: Step 1 -> Step 13
        $res = self::callRoute('POST', '/api/v1/transfers/TR-2026-000103/advance', ['target_step' => 13], $jwt);
        self::assertEqual(422, $res['status'], 'Step 1 -> 13 non-adjacent jump must return 422');
        self::assertEqual('INVALID_STATE_TRANSITION', $res['body']['code'] ?? '');

        // Attempt non-adjacent jump: Step 1 -> Step 3
        $res2 = self::callRoute('POST', '/api/v1/transfers/TR-2026-000103/advance', ['target_step' => 3], $jwt);
        self::assertEqual(422, $res2['status'], 'Step 1 -> 3 non-adjacent jump must return 422');

        $t = DB::selectOne("SELECT current_step FROM transfer_requests WHERE transfer_code = 'TR-2026-000103'");
        self::assertEqual(1, (int) $t['current_step'], 'Step must remain 1');
    }

    public static function test_03_wrong_citizen_cannot_view_or_advance_other_citizens_transfer_403(): void
    {
        $loginRes = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'rabeya', 'password' => 'demo123']);
        $jwt = $loginRes['body']['access_token'] ?? ($loginRes['body']['token'] ?? '');
        self::assertTrue(!empty($jwt), 'Rabeya login must succeed');

        // Rabeya tries to GET transfer created by 'citizen'
        $getRes = self::callRoute('GET', '/api/v1/transfers/TR-2026-000103', [], $jwt);
        self::assertEqual(403, $getRes['status'], 'Citizen cannot view another citizen transfer');

        // Rabeya tries to advance transfer created by 'citizen'
        $advRes = self::callRoute('POST', '/api/v1/transfers/TR-2026-000103/advance', ['target_step' => 2], $jwt);
        self::assertEqual(403, $advRes['status'], 'Citizen cannot advance another citizen transfer');
    }

    public static function test_04_citizen_cannot_self_verify_counter_biometrics_step_8_403(): void
    {
        $loginRes = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'citizen', 'password' => 'demo123']);
        $citizenJwt = $loginRes['body']['access_token'] ?? '';

        // Advance 1->2->3->4->5->6->7->8
        for ($s = 2; $s <= 8; $s++) {
            $r = self::callRoute('POST', '/api/v1/transfers/TR-2026-000103/advance', ['target_step' => $s], $citizenJwt);
            self::assertEqual(200, $r['status'], "Step {$s} advance must succeed for citizen");
        }

        // Citizen attempts to advance Step 8->9 (Biometric match)
        $bioAttempt = self::callRoute('POST', '/api/v1/transfers/TR-2026-000103/advance', ['target_step' => 9], $citizenJwt);
        self::assertEqual(403, $bioAttempt['status'], 'Citizen cannot self-certify counter biometrics');
        self::assertEqual('OFFICER_TERMINAL_REQUIRED', $bioAttempt['body']['code'] ?? '');

        // Authorized registrar advances Step 8->9 at counter terminal
        $regLogin = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'registrar', 'password' => 'demo123']);
        $regJwt = $regLogin['body']['access_token'] ?? '';
        $regBio = self::callRoute('POST', '/api/v1/transfers/TR-2026-000103/advance', ['target_step' => 9], $regJwt);
        self::assertEqual(200, $regBio['status'], 'Registrar counter biometric advance must succeed');

        $bioRow = DB::selectOne("SELECT * FROM biometric_verifications WHERE transfer_id = (SELECT id FROM transfer_requests WHERE transfer_code = 'TR-2026-000103')");
        self::assertTrue(!empty($bioRow), 'Biometric row must be created');
        self::assertEqual('MATCH', $bioRow['match_status']);
    }

    public static function test_05_transfer_creation_rejects_invalid_deed_enum_422(): void
    {
        $loginRes = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'citizen', 'password' => 'demo123']);
        $jwt = $loginRes['body']['access_token'] ?? ($loginRes['body']['token'] ?? '');

        $res = self::callRoute('POST', '/api/v1/transfers', [
            'plot_id' => 1,
            'transfer_area_decimal' => 5.0,
            'proposed_price_bdt' => 500000,
            'deed_type' => 'INVALID_ENUM',
        ], $jwt);

        self::assertEqual(422, $res['status'], 'Invalid deed enum must return 422');
        self::assertEqual('INVALID_DEED_TYPE', $res['body']['code'] ?? '');
    }

    public static function test_06_transfer_creation_rejects_negative_or_zero_area_and_price_422(): void
    {
        $loginRes = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'citizen', 'password' => 'demo123']);
        $jwt = $loginRes['body']['access_token'] ?? ($loginRes['body']['token'] ?? '');

        // Negative area
        $res = self::callRoute('POST', '/api/v1/transfers', [
            'plot_id' => 1,
            'transfer_area_decimal' => -8.0,
            'proposed_price_bdt' => 500000,
            'deed_type' => 'SALE',
        ], $jwt);
        self::assertEqual(422, $res['status'], 'Negative area must return 422');
        self::assertEqual('INVALID_TRANSFER_AREA', $res['body']['code'] ?? '');

        // Negative price
        $res2 = self::callRoute('POST', '/api/v1/transfers', [
            'plot_id' => 1,
            'transfer_area_decimal' => 5.0,
            'proposed_price_bdt' => -90,
            'deed_type' => 'SALE',
        ], $jwt);
        self::assertEqual(422, $res2['status'], 'Negative price must return 422');
        self::assertEqual('INVALID_PROPOSED_PRICE', $res2['body']['code'] ?? '');
    }

    public static function test_07_transfer_creation_rejects_non_owned_or_mortgaged_plot_403_or_422(): void
    {
        $loginRes = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'citizen', 'password' => 'demo123']);
        $jwt = $loginRes['body']['access_token'] ?? ($loginRes['body']['token'] ?? '');

        // Plot 6 is mortgaged
        $resMortgaged = self::callRoute('POST', '/api/v1/transfers', [
            'plot_id' => 6,
            'transfer_area_decimal' => 2.0,
            'proposed_price_bdt' => 300000,
            'deed_type' => 'SALE',
        ], $jwt);
        self::assertEqual(422, $resMortgaged['status'], 'Mortgaged plot transfer must return 422');
        self::assertEqual('PLOT_MORTGAGED', $resMortgaged['body']['code'] ?? '');

        // Plot 3 is owned by someone else
        $resNotOwner = self::callRoute('POST', '/api/v1/transfers', [
            'plot_id' => 3,
            'transfer_area_decimal' => 2.0,
            'proposed_price_bdt' => 300000,
            'deed_type' => 'SALE',
        ], $jwt);
        self::assertEqual(403, $resNotOwner['status'], 'Non-owner citizen must return 403');
        self::assertEqual('NOT_PLOT_OWNER', $resNotOwner['body']['code'] ?? '');
    }

    public static function test_08_anonymous_access_to_workflow_records_returns_401(): void
    {
        self::assertEqual(401, self::callRoute('GET', '/api/v1/transfers', [], null)['status']);
        self::assertEqual(401, self::callRoute('GET', '/api/v1/tickets', [], null)['status']);
        self::assertEqual(401, self::callRoute('GET', '/api/v1/plots/1/documents', [], null)['status']);
        self::assertEqual(401, self::callRoute('GET', '/api/v1/appeals', [], null)['status']);
    }

    public static function test_09_document_upload_rejects_missing_file_bytes_422(): void
    {
        $loginRes = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'citizen', 'password' => 'demo123']);
        $jwt = $loginRes['body']['access_token'] ?? ($loginRes['body']['token'] ?? '');

        $res = self::callRoute('POST', '/api/v1/plots/1/documents', [
            'file_name' => 'AUDIT-no-bytes.pdf',
            'document_type' => 'WARISH_SANAD',
        ], $jwt);

        self::assertEqual(422, $res['status'], 'Upload without bytes must return 422');
        self::assertEqual('FILE_BYTES_REQUIRED', $res['body']['code'] ?? '');
    }

    public static function test_10_document_upload_with_bytes_persists_hash_and_size_and_serves_scoped_download(): void
    {
        $loginRes = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'citizen', 'password' => 'demo123']);
        $jwt = $loginRes['body']['access_token'] ?? ($loginRes['body']['token'] ?? '');

        $dummyContent = '%PDF-1.4 Real bytes for deed audit verification ' . microtime(true);
        $expectedHash = hash('sha256', $dummyContent);
        $expectedSize = strlen($dummyContent);

        $res = self::callRoute('POST', '/api/v1/plots/1/documents', [
            'file_name' => 'verified_khatian_scan.pdf',
            'document_type' => 'WARISH_SANAD',
            'base64_data' => base64_encode($dummyContent),
        ], $jwt);

        self::assertEqual(200, $res['status'], 'Upload with valid bytes must return 200');
        self::assertEqual($expectedHash, $res['body']['file_hash'] ?? '');
        self::assertEqual($expectedSize, (int) ($res['body']['file_size_bytes'] ?? 0));
        $docId = (int) ($res['body']['document_id'] ?? 0);
        self::assertTrue($docId > 0, 'Document ID must be positive');

        // Download by owner
        $dlRes = self::callRoute('GET', "/api/v1/plots/1/documents/{$docId}/download", [], $jwt);
        self::assertEqual(200, $dlRes['status'], 'Owner download must return 200');
        self::assertEqual($expectedHash, $dlRes['body']['file_hash'] ?? '');

        // Download by another citizen (Rabeya)
        $rabeyaLogin = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'rabeya', 'password' => 'demo123']);
        $rabeyaJwt = $rabeyaLogin['body']['access_token'] ?? ($rabeyaLogin['body']['token'] ?? '');
        $dlForbidden = self::callRoute('GET', "/api/v1/plots/1/documents/{$docId}/download", [], $rabeyaJwt);
        self::assertEqual(403, $dlForbidden['status'], 'Unrelated citizen download must return 403');
    }

    public static function test_11_registrar_deeds_scoped_by_office_and_masks_nids(): void
    {
        $loginRes = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'registrar_gazipur', 'password' => 'demo123']);
        $jwt = $loginRes['body']['access_token'] ?? ($loginRes['body']['token'] ?? '');
        self::assertTrue(!empty($jwt), 'Gazipur registrar login must succeed');

        $res = self::callRoute('GET', '/api/v1/registrar/deeds', [], $jwt);
        self::assertEqual(200, $res['status'], 'Registrar deeds list must return 200');

        $items = $res['body']['items'] ?? [];
        self::assertTrue(count($items) > 0, 'Gazipur registrar should see their own jurisdiction deeds');

        foreach ($items as $item) {
            $upazila = $item['upazila_en'] ?? '';
            $district = $item['district_en'] ?? '';
            self::assertTrue($upazila === 'Gazipur Sadar' || $district === 'Gazipur', "Deed must be scoped to Gazipur jurisdiction, got {$upazila}/{$district}");

            // Verify NID masking
            $sellerNid = (string) ($item['seller_nid'] ?? '');
            $buyerNid = (string) ($item['buyer_nid'] ?? '');
            self::assertTrue(str_contains($sellerNid, '*'), "Seller NID must be masked, got {$sellerNid}");
            self::assertTrue(str_contains($buyerNid, '*'), "Buyer NID must be masked, got {$buyerNid}");
        }
    }

    public static function test_12_expanded_roles_authorized_on_appropriate_endpoints(): void
    {
        // Registry data officer
        $rdoLogin = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'rdo_savar', 'password' => 'demo123']);
        $rdoJwt = $rdoLogin['body']['access_token'] ?? '';
        self::assertTrue(!empty($rdoJwt));
        $rdoDeeds = self::callRoute('GET', '/api/v1/registrar/deeds', [], $rdoJwt);
        self::assertEqual(200, $rdoDeeds['status'], 'RDO must be authorized to view registrar deeds');

        // Land office assistant
        $loaLogin = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'loa_savar', 'password' => 'demo123']);
        $loaJwt = $loaLogin['body']['access_token'] ?? '';
        self::assertTrue(!empty($loaJwt));
        $loaMutations = self::callRoute('GET', '/api/v1/mutations', [], $loaJwt);
        self::assertEqual(200, $loaMutations['status'], 'LOA must be authorized to view mutations');

        // Bank manager
        $bmLogin = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'bank_manager', 'password' => 'demo123']);
        $bmJwt = $bmLogin['body']['access_token'] ?? '';
        self::assertTrue(!empty($bmJwt));
        $bmMortgages = self::callRoute('GET', '/api/v1/mortgages', [], $bmJwt);
        self::assertEqual(200, $bmMortgages['status'], 'Bank manager must be authorized to view mortgages');
    }

    public static function test_13_appointments_creation_and_listing_scoped(): void
    {
        $res = self::callRoute('POST', '/api/v1/appointments', [
            'office_id' => 1,
            'citizen_name_bn' => 'মো. শফিকুল ইসলাম',
            'citizen_phone' => '01711-223344',
            'slot_date' => '2026-10-25',
            'slot_time' => '11:00 AM',
            'service_type' => 'DEED_REGISTRATION',
        ]);
        self::assertEqual(200, $res['status'], 'Appointment creation must return 200');
        $code = $res['body']['appointment']['appointment_code'] ?? '';
        self::assertTrue(str_starts_with($code, 'APT-2026-'), "Code must start with APT-2026-, got {$code}");

        $citLogin = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'citizen', 'password' => 'demo123']);
        $citJwt = $citLogin['body']['access_token'] ?? '';
        $list = self::callRoute('GET', '/api/v1/appointments', [], $citJwt, ['office_id' => 1]);
        self::assertEqual(200, $list['status'], 'Appointment list must return 200');
        self::assertTrue(count($list['body']['items'] ?? []) > 0, 'Appointments list must contain created appointment');
    }

    public static function test_14_marketplace_listing_enquiries_flow(): void
    {
        // Citizen login
        $citLogin = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'citizen', 'password' => 'demo123']);
        $citJwt = $citLogin['body']['access_token'] ?? '';
        self::assertTrue(!empty($citJwt));

        // Create enquiry
        $enqRes = self::callRoute('POST', '/api/v1/listings/LST-2026-000101/enquire', [
            'buyer_name' => 'আব্দুর রহিম',
            'buyer_phone' => '01811-998877',
            'offered_price_bdt' => 3800000,
            'message' => 'আমি দাগ নং ১০১ এর এই জমিটি কিনতে আগ্রহী।',
        ], $citJwt);
        self::assertEqual(200, $enqRes['status'], 'Enquiry submission must return 200');
        $enqId = $enqRes['body']['enquiry_id'] ?? 0;
        self::assertTrue($enqId > 0, 'Enquiry ID must be positive');

        // List enquiries as admin
        $adminLogin = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'admin', 'password' => 'demo123']);
        $adminJwt = $adminLogin['body']['access_token'] ?? '';
        $listRes = self::callRoute('GET', '/api/v1/listings/LST-2026-000101/enquiries', [], $adminJwt);
        self::assertEqual(200, $listRes['status'], 'Admin/Seller can list enquiries');
        self::assertTrue(count($listRes['body']['items'] ?? []) > 0, 'Enquiries list must contain the enquiry');

        // Update enquiry status
        $patchRes = self::callRoute('PATCH', "/api/v1/listings/LST-2026-000101/enquiries/{$enqId}", ['status' => 'ACCEPTED'], $adminJwt);
        self::assertEqual(200, $patchRes['status'], 'Enquiry status update must return 200');
        self::assertEqual('ACCEPTED', $patchRes['body']['status'] ?? '', 'Status must be updated to ACCEPTED');
    }

    public static function test_15_noc_verification_includes_mortgaged_area_and_loan_amount(): void
    {
        $res = self::callRoute('GET', '/api/v1/verify/noc/NOC-2026-8801');
        self::assertEqual(200, $res['status'], 'NOC verification must return 200');
        self::assertTrue($res['body']['is_valid'] ?? false, 'NOC must be cryptographically valid');
        $noc = $res['body']['noc'] ?? [];
        self::assertTrue(isset($noc['mortgaged_area_decimal']), 'NOC must include mortgaged_area_decimal');
        self::assertTrue(isset($noc['loan_amount_bdt']), 'NOC must include loan_amount_bdt');
        self::assertTrue($noc['loan_amount_bdt'] > 0, 'Loan amount must be positive');
    }
}
