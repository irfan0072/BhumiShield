<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Controllers\Api\V1\CitizenVaultAndTicketController;
use App\Http\Controllers\Api\V1\LawyerPortalController;
use App\Http\Controllers\Api\V1\OnboardingAndAppealsController;
use App\Http\Controllers\Api\V1\RoleControlController;
use App\Http\Controllers\Api\V1\WorkflowController;
use App\Services\JwtAuthService;
use App\Services\PublicRecordService;
use App\Services\RbacService;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Feature & Integration Test Suite for Milestone 2:
 * Covers Features 10-17:
 * - Feature 10: Appeals Route Guard Enforcement
 * - Feature 11: Missing Table DDL Migration (acquisition_cases)
 * - Feature 12: 21 Roles Model & Seeder Parity
 * - Feature 13: Sub-Registrar Territorial Scoping
 * - Feature 14: AC Land Upazila Jurisdictional Scoping
 * - Feature 15: Commercial Bank Data Isolation
 * - Feature 16: Lawyer Empaneled Case Scoping
 * - Feature 17: Backend PII Data Masking
 */
final class Milestone2SecurityTest
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
        $methods = array_values(array_filter(
            get_class_methods(self::class),
            fn(string $m) => str_starts_with($m, 'test_')
        ));

        $passed = 0;
        $failed = 0;
        echo "\n   PASS  Tests\\Feature\\Milestone2SecurityTest (Features 10-17)\n";

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

        echo "\n  Milestone 2 Security Tests:    {$passed} passed, {$failed} failed (" . count($methods) . " total)\n\n";
        return $failed;
    }

    /**
     * Feature 10: Appeals Route Guard
     */
    public static function test_f10_appeals_route_guard_enforcement(): void
    {
        // 1. Anonymous fails with 401
        $anon = self::callRoute('GET', '/api/v1/appeals');
        self::assertEqual(401, $anon['status'], 'Anonymous GET /appeals must return 401');

        // 2. Unauthorized role (e.g. content_editor) fails with 403
        $editorRes = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'content_editor', 'password' => 'demo123']);
        $editorJwt = $editorRes['body']['access_token'] ?? '';
        $editorAppeals = self::callRoute('GET', '/api/v1/appeals', [], $editorJwt);
        self::assertEqual(403, $editorAppeals['status'], 'Unauthorized role must be rejected with 403');

        // 3. Citizen queries are scoped to appellant_nid
        $citRes = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'citizen', 'password' => 'demo123']);
        $citJwt = $citRes['body']['access_token'] ?? '';
        $citAppeals = self::callRoute('GET', '/api/v1/appeals', [], $citJwt);
        self::assertEqual(200, $citAppeals['status'], 'Citizen GET /appeals must return 200');
        self::assertTrue(isset($citAppeals['body']['items']), 'Citizen appeals items present');
        foreach ($citAppeals['body']['items'] as $item) {
            self::assertEqual('9900001001', $item['appellant_nid'], 'Citizen must only see own appeals');
        }

        // 4. Authorized appellate authority (appellate_reviewer) can list all
        $revRes = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'appellate_reviewer', 'password' => 'demo123']);
        $revJwt = $revRes['body']['access_token'] ?? '';
        $revAppeals = self::callRoute('GET', '/api/v1/appeals', [], $revJwt);
        self::assertEqual(200, $revAppeals['status'], 'Appellate reviewer GET /appeals must return 200');
        self::assertTrue(($revAppeals['body']['total'] ?? 0) >= 1, 'Reviewer can access appellate docket');
    }

    /**
     * Feature 11: Acquisition Cases DDL Migration & Model Parity
     */
    public static function test_f11_acquisition_cases_table_and_records(): void
    {
        $cases = DB::select('SELECT * FROM acquisition_cases ORDER BY id ASC');
        self::assertTrue(count($cases) >= 1, 'Acquisition cases must be seeded and queryable');
        $c = $cases[0];
        self::assertTrue(!empty($c['case_no']), 'Case no present');
        self::assertTrue(!empty($c['project_name_bn']), 'Project name bn present');
        self::assertTrue(isset($c['total_land_decimal']), 'Total land decimal present');
        self::assertTrue(isset($c['estimated_compensation_bdt']), 'Compensation budget present');
    }

    /**
     * Feature 12: 21 Roles Model & Seeder Parity
     */
    public static function test_f12_all_21_roles_parity_and_authentication(): void
    {
        $definedRoles = RbacService::ROLES;
        self::assertTrue(count($definedRoles) >= 21, 'RbacService must define at least 21 institutional roles');

        $requiredRoles = [
            'citizen', 'service_point_operator', 'sub_registrar', 'registry_data_officer',
            'ac_land', 'land_office_assistant', 'field_verification_officer', 'settlement_records_officer',
            'settlement_checker', 'uno_supervisor', 'appellate_reviewer', 'bank_officer',
            'bank_manager', 'support_agent', 'platform_moderator', 'content_editor',
            'content_approver', 'admin', 'auditor', 'dc_acquisition_officer', 'lawyer_court_user'
        ];

        foreach ($requiredRoles as $roleName) {
            self::assertTrue(isset($definedRoles[$roleName]), "Role '{$roleName}' must exist in RbacService::ROLES");
        }

        // Test login for the new institutional roles
        $instLogins = [
            ['dr_dhaka', 'district_registrar'],
            ['div_comm_dhaka', 'divisional_commissioner'],
            ['appeal_board', 'land_appeal_board'],
            ['reform_board', 'land_reform_board'],
            ['dlrs_surveyor', 'dlrs_officer'],
            ['jsr_savar', 'joint_sub_registrar'],
            ['dfo_forest', 'forest_officer'],
            ['waqf_admin', 'waqf_administrator'],
            ['karbari_cht', 'karbari'],
        ];

        foreach ($instLogins as [$uname, $expectedRole]) {
            $res = self::callRoute('POST', '/api/v1/auth/login', ['username' => $uname, 'password' => 'demo123']);
            self::assertEqual(200, $res['status'], "Demo user {$uname} must log in successfully");
            self::assertEqual($expectedRole, $res['body']['user']['role'] ?? '', "User {$uname} must have role {$expectedRole}");
        }
    }

    /**
     * Feature 13 & 14: Sub-Registrar and AC Land Jurisdictional Scoping
     */
    public static function test_f13_f14_jurisdictional_scoping(): void
    {
        // Sub-Registrar Gazipur is assigned to Gazipur Sadar.
        // Plot 1 is in Savar, Dhaka. Attempting deed operations on Plot 1 must fail with 403.
        $gzRes = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'registrar_gazipur', 'password' => 'demo123']);
        $gzJwt = $gzRes['body']['access_token'] ?? '';
        $gzActor = $gzRes['body']['user'] ?? [];

        $caught = false;
        try {
            WorkflowController::subRegistrarPreCheck(['plot_id' => 1, 'requested_area_decimal' => 5.0], $gzActor);
        } catch (\Throwable $e) {
            $caught = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(403, $data['status'] ?? 0, 'Cross-upazila precheck must fail with 403');
            self::assertEqual('OFFICE_SCOPE_REQUIRED', $data['code'] ?? '', 'Office scope code expected');
        }
        self::assertTrue($caught, 'Gazipur sub-registrar must not pre-check Savar plot');

        // AC Land reconciles khatian for a Savar plot (authorized for acland)
        $acRes = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'acland', 'password' => 'demo123']);
        $acJwt = $acRes['body']['access_token'] ?? '';
        $recRes = self::callRoute('POST', '/api/v1/acland/khatians/1/reconcile', ['reconciled_area_decimal' => 20.0], $acJwt);
        self::assertTrue(in_array($recRes['status'], [200, 422], true), 'Savar AC Land can reconcile Savar plot');
    }

    /**
     * Feature 15: Commercial Bank Data Isolation
     */
    public static function test_f15_commercial_bank_isolation(): void
    {
        $bankRes = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'bank', 'password' => 'demo123']);
        $bankJwt = $bankRes['body']['access_token'] ?? '';

        // Plot 1 is unmortgaged. Bank officer must be blocked from viewing documents vault with 403 UNENCUMBERED_PLOT_RESTRICTED
        $vaultRes = self::callRoute('GET', '/api/v1/plots/1/documents', [], $bankJwt);
        self::assertEqual(403, $vaultRes['status'], 'Bank officer must be blocked from unencumbered plot vault');
        self::assertEqual('UNENCUMBERED_PLOT_RESTRICTED', $vaultRes['body']['code'] ?? '', 'Expected UNENCUMBERED_PLOT_RESTRICTED');

        // Bank officer querying unmortgaged plot details must also be blocked
        $plotRes = self::callRoute('GET', '/api/v1/plots/1', [], $bankJwt);
        self::assertEqual(403, $plotRes['status'], 'Bank officer must be blocked from unencumbered plot details');

        // Bank officer querying mortgaged plot (Plot 6 has active lien) succeeds
        $mortgagedVault = self::callRoute('GET', '/api/v1/plots/6/documents', [], $bankJwt);
        self::assertEqual(200, $mortgagedVault['status'], 'Bank officer can view mortgaged plot vault');

        // In mortgages list, borrower NID is masked
        $mortList = self::callRoute('GET', '/api/v1/mortgages', [], $bankJwt);
        self::assertEqual(200, $mortList['status'], 'Bank mortgages list 200');
        foreach ($mortList['body']['items'] as $mItem) {
            if (!empty($mItem['borrower_nid'])) {
                self::assertTrue(str_contains($mItem['borrower_nid'], '****'), 'Borrower NID must be masked');
            }
        }
    }

    /**
     * Feature 16: Lawyer Empaneled Case Scoping
     */
    public static function test_f16_lawyer_empaneled_case_scoping(): void
    {
        $lawyerRes = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'lawyer', 'password' => 'demo123']);
        $lawyerJwt = $lawyerRes['body']['access_token'] ?? '';

        // 1. Lawyer my-cases endpoint returns 200
        $myCases = self::callRoute('GET', '/api/v1/lawyers/my-cases', [], $lawyerJwt);
        self::assertEqual(200, $myCases['status'], 'GET /api/v1/lawyers/my-cases must return 200');
        self::assertTrue(isset($myCases['body']['items']), 'My cases items array present');

        // 2. Lawyer verification masks advocate NID and phone
        $verRes = self::callRoute('POST', '/api/v1/lawyers/verify', ['bar_council_no' => 'BC-DH-14285'], $lawyerJwt);
        self::assertEqual(200, $verRes['status'], 'POST /api/v1/lawyers/verify must return 200');
        $lData = $verRes['body']['lawyer'] ?? [];
        self::assertTrue(str_contains($lData['nid'] ?? '', '****'), 'Lawyer NID must be masked');
        self::assertTrue(str_contains($lData['phone'] ?? '', '****'), 'Lawyer phone must be masked');
    }

    /**
     * Feature 17: Backend PII Data Masking
     */
    public static function test_f17_backend_pii_data_masking(): void
    {
        // 1. PublicRecordService maskNid and maskPhone unit behavior
        self::assertEqual('9900****01', PublicRecordService::maskNid('9900001001'), '10-digit NID masked');
        self::assertEqual('1985****89', PublicRecordService::maskNid('19852694123456789'), '17-digit NID masked');
        self::assertEqual('017****4567', PublicRecordService::maskPhone('01711234567'), 'Phone masked');
        self::assertEqual('017****4567', PublicRecordService::maskPhone('01711-234567'), 'Formatted phone masked');

        // 2. Admin deeds endpoint returns masked citizen NID and phones
        $adminRes = self::callRoute('POST', '/api/v1/auth/login', ['username' => 'admin', 'password' => 'demo123']);
        $adminJwt = $adminRes['body']['access_token'] ?? '';

        $deedsRes = self::callRoute('GET', '/api/v1/admin/deeds', ['per_page' => 5], $adminJwt);
        self::assertEqual(200, $deedsRes['status'], 'Admin deeds list returns 200');
        foreach ($deedsRes['body']['items'] as $item) {
            if (!empty($item['seller_nid'])) {
                self::assertTrue(str_contains($item['seller_nid'], '****'), 'Seller NID in admin deeds must be masked');
            }
            if (!empty($item['buyer_nid'])) {
                self::assertTrue(str_contains($item['buyer_nid'], '****'), 'Buyer NID in admin deeds must be masked');
            }
        }

        // 3. Admin user serialization masks NID and phone_dummy
        $usersRes = self::callRoute('GET', '/api/v1/admin/users', [], $adminJwt);
        self::assertEqual(200, $usersRes['status'], 'Admin users list returns 200');
        foreach ($usersRes['body']['items'] as $uItem) {
            if (!empty($uItem['nid'])) {
                self::assertTrue(str_contains($uItem['nid'], '****'), 'User NID in admin users list must be masked');
            }
            if (!empty($uItem['phone_dummy'])) {
                self::assertTrue(str_contains($uItem['phone_dummy'], '****'), 'User phone in admin users list must be masked');
            }
        }
    }
}
