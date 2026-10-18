<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Controllers\Api\V1\LedgerVerificationController;
use App\Http\Controllers\Api\V1\RoleControlController;
use App\Http\Controllers\Api\V1\ServiceCatalogueController;
use App\Http\Controllers\Api\V1\SystemAdminController;
use App\Http\Controllers\Api\V1\WorkflowController;
use App\Http\Middleware\RoleMiddleware;
use App\Services\FraudRulesEngine;
use App\Services\JwtAuthService;
use App\Services\LedgerService;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Regression Test Suite for Codex Role Audit 2026-10-17 (Findings F01 - F18).
 * Runs on an isolated temporary SQLite database and verifies critical boundaries
 * across Citizen, Sub-Registrar, AC Land, Bank Officer, and System Admin roles.
 */
final class RoleAuditRegressionTest
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

    public static function runAll(): int
    {
        $tmpDb = sys_get_temp_dir() . '/bhumishield_audit_regression_' . getmypid() . '.sqlite';
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
        echo "\n   PASS  Tests\\Feature\\RoleAuditRegressionTest (Findings F01-F18 Regression)\n";

        foreach ($methods as $method) {
            $t0 = microtime(true);
            try {
                unset($_SERVER['HTTP_AUTHORIZATION']);
                (new DatabaseSeeder())->run(true);
                self::$method();
                $ms = round((microtime(true) - $t0) * 1000, 1);
                echo "  ✓ {$method} ({$ms}ms)\n";
                $passed++;
            } catch (\Throwable $e) {
                echo "  ⨯ {$method}: {$e->getMessage()}\n";
                $failed++;
            }
        }

        echo "\n  Audit Regression Tests:    {$passed} passed, {$failed} failed (" . count($methods) . " total)\n\n";
        @unlink($tmpDb);
        return $failed === 0 ? 0 : 1;
    }

    public static function test_f01_citizen_sale_lock_enforces_latest_owner_authority(): void
    {
        // Citizen with person_id 3 is not an owner of plot 1 (owned by person 1)
        $nonOwnerUser = [
            'id' => 991,
            'username' => 'citizen_non_owner',
            'role' => 'citizen',
            'nid' => '9900001003', // person 3
        ];

        $caught = false;
        try {
            RoleControlController::togglePlotSaleLock(1, ['lock_state' => 1], $nonOwnerUser);
        } catch (\Throwable $e) {
            $caught = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(403, $data['status'] ?? 0, 'Non-owner must be forbidden');
            self::assertEqual('FORBIDDEN_NOT_PLOT_OWNER', $data['code'] ?? '', 'Non-owner code mismatch');
        }
        self::assertTrue($caught, 'Non-owner should have thrown 403');

        // Legitimate owner (person 1, NID 9900001001) locks plot 1
        $ownerUser = [
            'id' => 1,
            'username' => 'citizen',
            'role' => 'citizen',
            'nid' => '9900001001',
        ];
        $res = RoleControlController::togglePlotSaleLock(1, ['lock_state' => 1], $ownerUser);
        self::assertEqual(1, $res['owner_sale_locked'], 'Plot 1 must be locked');

        // Unlock by legitimate owner
        $resUnlock = RoleControlController::togglePlotSaleLock(1, ['lock_state' => 0], $ownerUser);
        self::assertEqual(0, $resUnlock['owner_sale_locked'], 'Plot 1 must be unlocked');
    }

    public static function test_f01_f12_noc_forbidden_on_active_lien_and_requires_released_state(): void
    {
        // Plot 6 has active lien 1 (or create an active lien)
        $sonaliOfficer = [
            'username' => 'bank_sonali',
            'role' => 'bank_officer',
            'office_en' => 'Sonali Bank PLC — Savar Branch',
        ];

        // 1. Attempt NOC on active lien
        $caught = false;
        try {
            RoleControlController::generateLienNoc(1, $sonaliOfficer);
        } catch (\Throwable $e) {
            $caught = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(422, $data['status'] ?? 0, 'Active lien cannot issue NOC');
            self::assertEqual('ACTIVE_LIEN_CANNOT_ISSUE_NOC', $data['code'] ?? '', 'Code mismatch');
        }
        self::assertTrue($caught, 'Active lien NOC should have thrown 422');

        // 2. Release the lien legitimately
        $rel = WorkflowController::releaseMortgageLien(1, $sonaliOfficer);
        self::assertEqual('RELEASED', $rel['status']);

        // 3. Generate NOC on RELEASED lien -> now permitted
        $noc = RoleControlController::generateLienNoc(1, $sonaliOfficer);
        self::assertEqual('RELEASED', $noc['status']);
        self::assertTrue(!empty($noc['noc_hash']), 'NOC hash generated');
        self::assertTrue(
            str_contains($noc['verify_url'], ':5175/verify/noc/' . $noc['noc_no']) ||
            str_contains($noc['verify_url'], ':5175/verify/noc/1'),
            'Verify URL points to configured origin with NOC identifier'
        );

        // 4. Verify the issued NOC via public verification endpoint
        $ver = RoleControlController::verifyLienNoc(1, substr($noc['noc_hash'], 0, 12));
        self::assertTrue($ver['is_valid'], 'NOC verification succeeds');
    }

    public static function test_f02_f11_mutation_idempotency_prevents_duplicate_approval(): void
    {
        // Query an already-approved mutation case (MUT-2024-101)
        $approvedMut = DB::selectOne("SELECT id, case_no FROM mutations WHERE status = 'APPROVED' LIMIT 1");
        self::assertTrue($approvedMut !== null, 'Seeded approved mutation must exist');

        $acland = ['username' => 'acland', 'role' => 'ac_land'];
        $caught = false;
        try {
            WorkflowController::decideMutationCase((int) $approvedMut['id'], ['decision' => 'APPROVED'], $acland);
        } catch (\Throwable $e) {
            $caught = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(409, $data['status'] ?? 0, 'Repeat mutation must be 409 conflict');
            self::assertEqual('MUTATION_ALREADY_DECIDED', $data['code'] ?? '');
        }
        self::assertTrue($caught, 'Repeat mutation approval must throw 409');
    }

    public static function test_f03_mutation_approval_blocks_tampered_deed(): void
    {
        // Create an untampered deed and a pending mutation case
        $registrar = ['username' => 'registrar', 'role' => 'sub_registrar'];
        $reg = WorkflowController::subRegistrarRegisterDeed([
            'plot_id' => 1,
            'seller_id' => 1,
            'buyer_id' => 2,
            'requested_area_decimal' => 2.0,
            'area_decimal' => 2.0,
            'price_bdt' => 500000,
            'deed_type' => 'বিক্রয় দলিল (KABALA)',
        ], $registrar);

        $deedId = $reg['deed_id'];

        // Directly tamper the deed's content_json in the database
        DB::statement("UPDATE deeds SET content_json = json_set(content_json, '$.price_bdt', 9999999) WHERE id = ?", [$deedId]);

        // Find the mutation case created for this deed
        $mut = DB::selectOne('SELECT id FROM mutations WHERE deed_id = ?', [$deedId]);
        self::assertTrue($mut !== null, 'Mutation case should exist');

        $acland = ['username' => 'acland', 'role' => 'ac_land'];
        $caught = false;
        try {
            WorkflowController::decideMutationCase((int) $mut['id'], ['decision' => 'APPROVED'], $acland);
        } catch (\Throwable $e) {
            $caught = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(422, $data['status'] ?? 0, 'Tampered deed mutation must fail');
            self::assertEqual('DEED_VERIFICATION_FAILED', $data['code'] ?? '');
        }
        self::assertTrue($caught, 'Tampered deed mutation approval must be blocked');

        // Clean up: restore original content json so test fixture does not corrupt subsequent tests
        DB::statement('UPDATE deeds SET content_json = original_content_json WHERE id = ?', [$deedId]);
    }

    public static function test_f04_upheld_frozen_dispute_blocks_all_plot_operations(): void
    {
        // Insert an UPHELD_FROZEN dispute on Plot 2
        $nowIso = gmdate('c');
        DB::insert(
            "INSERT INTO disputes (case_no, plot_id, complainant_name_bn, complainant_nid, dispute_type, description_bn, description_en, severity, status, resolved_by, resolution_notes_bn, created_at, resolved_at)
             VALUES ('DISP-TEST-FROZEN', 2, 'সৈয়দ আহমেদ', '9900001009', 'LEGAL_DISPUTE', 'আদালতের নিষেধাজ্ঞা', 'Court injunction upheld', 'HIGH_RISK', 'UPHELD_FROZEN', 'admin', 'Freeze confirmed', ?, ?)",
            [$nowIso, $nowIso]
        );

        // 1. Citizen check
        $cit = WorkflowController::citizenCheckBeforeYouBuy(2, 5.0, 2);
        self::assertEqual('HIGH_RISK', $cit['risk_report']['verdict']);
        $citRules = array_map(fn($f) => $f['rule_id'] ?? ($f['code'] ?? ''), $cit['risk_report']['flags']);
        self::assertTrue(in_array('PLOT_TRANSFER_FROZEN', $citRules, true), 'Citizen check must surface PLOT_TRANSFER_FROZEN');

        // 2. Sub-registrar pre-check
        $regCheck = WorkflowController::subRegistrarPreCheck(['plot_id' => 2, 'seller_id' => 2, 'buyer_id' => 3, 'requested_area_decimal' => 5.0]);
        self::assertEqual('HIGH_RISK', $regCheck['risk_report']['verdict']);

        // 3. Sub-registrar register deed -> must throw 422
        $caught = false;
        try {
            WorkflowController::subRegistrarRegisterDeed([
                'plot_id' => 2,
                'seller_id' => 2,
                'buyer_id' => 3,
                'requested_area_decimal' => 5.0,
                'area_decimal' => 5.0,
                'price_bdt' => 300000,
                'deed_type' => 'বিক্রয় দলিল (KABALA)',
            ], ['username' => 'registrar', 'role' => 'sub_registrar']);
        } catch (\Throwable $e) {
            $caught = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(422, $data['status'] ?? 0);
            self::assertEqual('PLOT_TRANSFER_FROZEN', $data['code'] ?? '');
        }
        self::assertTrue($caught, 'Registering deed on frozen plot must be blocked');

        // 4. Bank collateral check
        $bankCheck = WorkflowController::bankCollateralCheck(['plot_id' => 2, 'borrower_id' => 2, 'area_mortgaged_decimal' => 5.0]);
        self::assertEqual('HIGH_RISK', $bankCheck['risk_report']['verdict']);

        // 5. Create mortgage lien -> must throw
        $caughtBank = false;
        try {
            WorkflowController::createMortgageLien([
                'plot_id' => 2,
                'borrower_id' => 2,
                'area_mortgaged_decimal' => 5.0,
                'requested_loan_bdt' => 500000,
            ], ['username' => 'bank', 'role' => 'bank_officer']);
        } catch (\Throwable $e) {
            $caughtBank = true;
        }
        self::assertTrue($caughtBank, 'Collateral creation on frozen plot must be blocked');

        // Cleanup: remove injected frozen dispute so subsequent plot operations are not polluted
        DB::statement("DELETE FROM disputes WHERE case_no = 'DISP-TEST-FROZEN'");
    }

    public static function test_f05_open_disputes_consistently_surface_as_review_across_roles(): void
    {
        // Insert an OPEN dispute on Plot 5
        $nowIso = gmdate('c');
        DB::insert(
            "INSERT INTO disputes (case_no, plot_id, complainant_name_bn, complainant_nid, dispute_type, description_bn, description_en, severity, status, created_at)
             VALUES ('DISP-TEST-OPEN', 5, 'মোহাম্মদ করিম', '9900001008', 'TITLE_CLAIM', 'ওয়ারিশ দাবি', 'Open inheritance claim', 'REVIEW', 'OPEN', ?)",
            [$nowIso]
        );

        $cit = WorkflowController::citizenCheckBeforeYouBuy(5, 5.0, 5);
        $citCodes = array_map(fn($f) => $f['rule_id'] ?? ($f['code'] ?? ''), $cit['risk_report']['flags']);
        self::assertTrue(in_array('ACTIVE_DISPUTE', $citCodes, true), 'Citizen check must surface ACTIVE_DISPUTE');

        $reg = WorkflowController::subRegistrarPreCheck(['plot_id' => 5, 'seller_id' => 5, 'buyer_id' => 6, 'requested_area_decimal' => 5.0]);
        $regCodes = array_map(fn($f) => $f['rule_id'] ?? ($f['code'] ?? ''), $reg['risk_report']['flags']);
        self::assertTrue(in_array('ACTIVE_DISPUTE', $regCodes, true), 'Registrar check must surface ACTIVE_DISPUTE');

        $bank = WorkflowController::bankCollateralCheck(['plot_id' => 5, 'borrower_id' => 5, 'area_mortgaged_decimal' => 5.0]);
        $bankCodes = array_map(fn($f) => $f['rule_id'] ?? ($f['code'] ?? ''), $bank['risk_report']['flags']);
        self::assertTrue(in_array('ACTIVE_DISPUTE', $bankCodes, true), 'Bank check must surface ACTIVE_DISPUTE');

        // Cleanup: remove injected open dispute so subsequent plot operations are not polluted
        DB::statement("DELETE FROM disputes WHERE case_no = 'DISP-TEST-OPEN'");
    }

    public static function test_f06_khatian_reconciliation_conserves_joint_owner_total_area(): void
    {
        // Plot 3 has 24 decimal total area split 12 + 12 between joint owners
        $plotBefore = DB::selectOne('SELECT * FROM plots WHERE id = 3');
        $sumBefore = (float) (DB::selectOne('SELECT SUM(area_decimal) AS s FROM ownerships WHERE plot_id = 3 AND is_latest = 1')['s'] ?? 0);
        self::assertEqual(24.0, (float) $plotBefore['total_area_decimal']);
        self::assertEqual(24.0, round($sumBefore, 2));

        // Reconcile khatian on plot 3 with 24.0 decimal and heirs_recorded = 1
        $rec = RoleControlController::reconcileKhatianPlot(3, [
            'reconciled_area_decimal' => 24.0,
            'heirs_recorded' => 1,
            'decision_notes' => 'Proportional reconciliation test',
        ], ['username' => 'acland', 'role' => 'ac_land']);

        $sumAfter = (float) (DB::selectOne('SELECT SUM(area_decimal) AS s FROM ownerships WHERE plot_id = 3 AND is_latest = 1')['s'] ?? 0);
        self::assertEqual(24.0, round($sumAfter, 2), 'Sum of ownerships must equal reconciled area exactly (not 48!)');
    }

    public static function test_f07_anonymous_role_middleware_fails_closed_with_401(): void
    {
        unset($_SERVER['HTTP_AUTHORIZATION'], $_SERVER['HTTP_X_ADMIN_SUPERVISOR_TOKEN']);

        $caught = false;
        try {
            RoleMiddleware::authorize(['sub_registrar'], null);
        } catch (\Throwable $e) {
            $caught = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(401, $data['status'] ?? 0, 'Unauthenticated request must return 401');
            self::assertEqual('AUTH_REQUIRED', $data['code'] ?? '');
        }
        self::assertTrue($caught, 'RoleMiddleware must fail closed for unauthenticated requests');
    }

    public static function test_f08_negative_and_zero_areas_strictly_rejected(): void
    {
        $caughtRegNeg = false;
        try {
            WorkflowController::subRegistrarRegisterDeed([
                'plot_id' => 1,
                'seller_id' => 1,
                'buyer_id' => 2,
                'requested_area_decimal' => -5.0,
                'price_bdt' => 100000,
                'deed_type' => 'বিক্রয় দলিল (KABALA)',
            ], ['username' => 'registrar', 'role' => 'sub_registrar']);
        } catch (\Throwable $e) {
            $caughtRegNeg = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(422, $data['status'] ?? 0);
            self::assertEqual('INVALID_AREA', $data['code'] ?? '');
        }
        self::assertTrue($caughtRegNeg, 'Negative area deed must throw 422 INVALID_AREA');

        $caughtCitNeg = false;
        try {
            WorkflowController::citizenCheckBeforeYouBuy(1, -10.0, 1);
        } catch (\Throwable $e) {
            $caughtCitNeg = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(422, $data['status'] ?? 0);
            self::assertEqual('INVALID_AREA', $data['code'] ?? '');
        }
        self::assertTrue($caughtCitNeg, 'Negative area citizen check must throw 422');

        $caughtBankNeg = false;
        try {
            WorkflowController::bankCollateralCheck(['plot_id' => 1, 'borrower_id' => 1, 'area_mortgaged_decimal' => 0.0]);
        } catch (\Throwable $e) {
            $caughtBankNeg = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(422, $data['status'] ?? 0);
            self::assertEqual('INVALID_AREA', $data['code'] ?? '');
        }
        self::assertTrue($caughtBankNeg, 'Zero area bank check must throw 422');
    }

    public static function test_f09_mutation_conserves_share_fractions_and_debits_seller(): void
    {
        // Plot 1: seller 1 has 20.0 decimal, total plot area 20.0
        $sellerBefore = DB::selectOne('SELECT * FROM ownerships WHERE plot_id = 1 AND person_id = 1 AND is_latest = 1');
        $areaBefore = (float) $sellerBefore['area_decimal'];

        // Register deed for 5.0 decimal with explicit share_fraction '1/4'
        $reg = WorkflowController::subRegistrarRegisterDeed([
            'plot_id' => 1,
            'seller_id' => 1,
            'buyer_id' => 2,
            'requested_area_decimal' => 5.0,
            'area_decimal' => 5.0,
            'price_bdt' => 1000000,
            'deed_type' => 'বিক্রয় দলিল (KABALA)',
            'share_fraction' => '1/4',
        ], ['username' => 'registrar', 'role' => 'sub_registrar']);

        $mut = DB::selectOne('SELECT id FROM mutations WHERE deed_id = ?', [$reg['deed_id']]);
        self::assertTrue($mut !== null, 'Mutation case should exist');

        // Approve mutation
        WorkflowController::decideMutationCase((int) $mut['id'], ['decision' => 'APPROVED'], ['username' => 'acland', 'role' => 'ac_land']);

        $sellerAfter = DB::selectOne('SELECT * FROM ownerships WHERE plot_id = 1 AND person_id = 1 AND is_latest = 1');
        $buyerAfter = DB::selectOne('SELECT * FROM ownerships WHERE plot_id = 1 AND person_id = 2 AND is_latest = 1');

        self::assertEqual(round($areaBefore - 5.0, 2), (float) $sellerAfter['area_decimal'], 'Seller debited correctly');
        self::assertEqual(5.0, (float) $buyerAfter['area_decimal'], 'Buyer credited 5.0 decimal');
        self::assertTrue(
            $buyerAfter['share_fraction'] === '1/4' || $buyerAfter['share_fraction'] === '5/20',
            'Buyer received exact conserved share fraction'
        );
    }

    public static function test_f12_bank_officer_scoping_and_idempotent_release_timestamp(): void
    {
        // Create an active lien for Sonali Bank
        $lienId = DB::insert(
            "INSERT INTO mortgages_liens (plot_id, borrower_id, bank_name_bn, bank_name_en, branch_bn, amount_bdt, area_mortgaged_decimal, status, created_at)
             VALUES (1, 1, 'সোনালী ব্যাংক পিএলসি', 'Sonali Bank PLC', 'সাভার শাখা', 1000000, 5.0, 'ACTIVE', '2026-01-01T00:00:00Z')"
        );

        // Officer from Agrani Bank attempts to release Sonali Bank lien
        $agraniOfficer = [
            'username' => 'bank_agrani',
            'role' => 'bank_officer',
            'office_en' => 'Agrani Bank PLC — Motijheel Branch',
        ];
        $caught = false;
        try {
            WorkflowController::releaseMortgageLien($lienId, $agraniOfficer);
        } catch (\Throwable $e) {
            $caught = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(403, $data['status'] ?? 0);
            self::assertEqual('UNAUTHORIZED_BANK_SCOPE', $data['code'] ?? '');
        }
        self::assertTrue($caught, 'Cross-bank lien release must be blocked with 403');

        // Sonali Bank officer releases the lien
        $sonaliOfficer = [
            'username' => 'bank_sonali',
            'role' => 'bank_officer',
            'office_en' => 'Sonali Bank PLC — Savar Branch',
        ];
        $rel1 = WorkflowController::releaseMortgageLien($lienId, $sonaliOfficer);
        $t1 = $rel1['released_at'];

        // Release again -> must be idempotent and preserve t1
        $rel2 = WorkflowController::releaseMortgageLien($lienId, $sonaliOfficer);
        self::assertEqual($t1, $rel2['released_at'], 'Release timestamp must be preserved on repeated calls');
    }

    public static function test_f13_honest_404_for_unknown_nid_and_registration_uniqueness(): void
    {
        // 1. Unknown NID lookup must throw 404, never fall back to person 1
        $caught404 = false;
        try {
            SystemAdminController::getCitizenLinkedProperties('9999999999999', ['role' => 'admin']);
        } catch (\Throwable $e) {
            $caught404 = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(404, $data['status'] ?? 0);
            self::assertEqual('NID_NOT_FOUND', $data['code'] ?? '');
        }
        self::assertTrue($caught404, 'Unknown NID must throw 404');

        // 2. Citizen accessing another citizen's vault must throw 403
        $caughtVault = false;
        try {
            SystemAdminController::getCitizenLinkedProperties('9900001002', [
                'role' => 'citizen',
                'nid' => '9900001001',
            ]);
        } catch (\Throwable $e) {
            $caughtVault = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(403, $data['status'] ?? 0);
            self::assertEqual('FORBIDDEN_VAULT_ACCESS', $data['code'] ?? '');
        }
        self::assertTrue($caughtVault, 'Citizen accessing another NID vault must throw 403');

        // 3. User registration with existing user NID must throw 409
        $caughtReg = false;
        try {
            SystemAdminController::registerUser([
                'username' => 'duplicate_nid_user',
                'nid' => '9900001001', // already used by demo 'citizen'
                'full_name_bn' => 'নকল এনআইডি',
                'password' => 'secret123',
            ]);
        } catch (\Throwable $e) {
            $caughtReg = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(409, $data['status'] ?? 0);
            self::assertEqual('NID_ALREADY_REGISTERED', $data['code'] ?? '');
        }
        self::assertTrue($caughtReg, 'Reused NID on registration must throw 409');
    }

    public static function test_f16_urls_and_ports_point_to_5175(): void
    {
        $verifyUrl = LedgerService::buildVerifyUrl(1, 'abcdef123456');
        self::assertTrue(str_contains($verifyUrl, 'http://localhost:5175/verify/1?h=abcdef123456'), 'Port must default to 5175');
    }

    public static function test_f17_dynamic_rapid_resale_days_honored_from_settings(): void
    {
        // Update site setting for rapid_resale_days to 14
        SystemAdminController::updateSiteSettings([
            'settings' => ['rapid_resale_days' => 14],
        ], ['username' => 'admin', 'role' => 'admin']);

        $days = FraudRulesEngine::getRapidResaleDays();
        self::assertEqual(14, $days, 'FraudRulesEngine must dynamically read rapid_resale_days from DB');
    }

    public static function test_f18_profile_password_requires_current_pass_and_protects_last_admin(): void
    {
        $admin = DB::selectOne("SELECT * FROM users WHERE username = 'admin'");

        // 1. updateProfile with wrong current password
        $caughtPass = false;
        try {
            SystemAdminController::updateProfile([
                'current_password' => 'wrong_pass',
                'new_password' => 'new_secret_123',
            ], $admin);
        } catch (\Throwable $e) {
            $caughtPass = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(400, $data['status'] ?? 0);
            self::assertEqual('WRONG_CURRENT_PASSWORD', $data['code'] ?? '');
        }
        self::assertTrue($caughtPass, 'Changing password with wrong current password must throw 400');

        // 2. Demoting the only active admin must be prevented
        $caughtDemote = false;
        try {
            SystemAdminController::adminUpdateUser((int) $admin['id'], [
                'role' => 'citizen',
            ], $admin);
        } catch (\Throwable $e) {
            $caughtDemote = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(400, $data['status'] ?? 0);
            self::assertEqual('CANNOT_DEMOTE_LAST_ADMIN', $data['code'] ?? '');
        }
        self::assertTrue($caughtDemote, 'Demoting last admin must throw 400');

        // 3. Deleting the only active admin must be prevented
        $caughtDelete = false;
        try {
            SystemAdminController::adminDeleteUser((int) $admin['id'], $admin);
        } catch (\Throwable $e) {
            $caughtDelete = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(400, $data['status'] ?? 0);
        }
        self::assertTrue($caughtDelete, 'Deleting last admin must throw 400');
    }

    public static function test_f19_persisted_noc_certificates_and_stable_signature(): void
    {
        $lien2 = DB::selectOne("SELECT * FROM mortgages_liens WHERE status = 'RELEASED' LIMIT 1");
        self::assertTrue($lien2 !== null, 'Seeded released lien must exist');
        $lienId = (int) $lien2['id'];

        $noc1 = RoleControlController::generateLienNoc($lienId, ['username'=>'admin', 'role'=>'admin']);
        self::assertTrue(!empty($noc1['noc_no']), 'NOC number must be generated');
        self::assertTrue(!empty($noc1['noc_hash']), 'NOC hash must be generated');
        self::assertTrue(
            str_starts_with($noc1['qr_svg_data_uri'], 'data:image/svg+xml;base64,') ||
            str_starts_with($noc1['qr_svg_data_uri'], 'data:image/svg+xml;utf8,'),
            'QR must be SVG data URI'
        );

        $persisted = DB::selectOne('SELECT * FROM noc_certificates WHERE lien_id = ?', [$lienId]);
        self::assertTrue($persisted !== null, 'Certificate must be persisted in noc_certificates table');
        self::assertEqual($noc1['noc_no'], $persisted['noc_no']);
        self::assertEqual($noc1['noc_hash'], $persisted['noc_hash']);

        $noc2 = RoleControlController::generateLienNoc($lienId, ['username'=>'admin', 'role'=>'admin']);
        self::assertEqual($noc1['noc_hash'], $noc2['noc_hash'], 'Persisted NOC hash must remain stable');
        self::assertEqual($noc1['ed25519_signature'], $noc2['ed25519_signature'], 'Persisted signature must remain stable');

        $verByNo = RoleControlController::verifyLienNoc($noc1['noc_no']);
        self::assertTrue($verByNo['is_valid'], 'NOC verification by noc_no string must succeed');

        $verById = RoleControlController::verifyLienNoc($lienId);
        self::assertTrue($verById['is_valid'], 'NOC verification by numeric lien_id must succeed');
    }

    public static function test_f20_public_verification_redacts_private_nid(): void
    {
        putenv('HTTP_AUTHORIZATION=');
        unset($_SERVER['HTTP_AUTHORIZATION']);
        $deedRes = LedgerVerificationController::verifySingleDeed('DL-2026-1001');
        $sellerNid = $deedRes['seller']['nid'] ?? '';
        $buyerNid = $deedRes['buyer']['nid'] ?? '';
        self::assertTrue(str_contains($sellerNid, '****'), 'Public seller NID must be redacted with ****');
        self::assertTrue(str_contains($buyerNid, '****'), 'Public buyer NID must be redacted with ****');

        $lien2 = DB::selectOne("SELECT * FROM mortgages_liens WHERE status = 'RELEASED' LIMIT 1");
        $nocRes = RoleControlController::verifyLienNoc((int) $lien2['id']);
        $borrowerNid = $nocRes['noc']['borrower_nid'] ?? '';
        self::assertTrue(str_contains($borrowerNid, '****'), 'Public borrower NID in NOC must be redacted with ****');
    }

    public static function test_f21_registrar_deeds_sql_search_and_filtering(): void
    {
        $searchRes = RoleControlController::listRegistrarDeeds(null, 'DL-2026-1001');
        self::assertTrue(count($searchRes['items']) >= 1, 'Search query must find deed via SQL WHERE');
        self::assertEqual('DL-2026-1001', $searchRes['items'][0]['deed_no']);

        $pendingRes = RoleControlController::listRegistrarDeeds('PENDING_MUTATION', null);
        foreach ($pendingRes['items'] as $item) {
            self::assertEqual('PENDING_MUTATION', $item['status'], 'Status filter in SQL must be strict');
        }
    }

    public static function test_f22_public_qr_verification_setting_gates_routes(): void
    {
        $router = require __DIR__ . '/../../routes/api.php';

        putenv('HTTP_AUTHORIZATION=');
        unset($_SERVER['HTTP_AUTHORIZATION']);
        $publicRes = $router('GET', '/verify/deed/DL-2026-1001', [], []);
        self::assertTrue(isset($publicRes['verification']), 'Default allows public verification');

        SystemAdminController::updateSiteSettings([
            'settings' => ['public_qr_verification_enabled' => false],
        ], ['username' => 'admin', 'role' => 'admin']);

        $caught = false;
        try {
            $router('GET', '/verify/deed/DL-2026-1001', [], []);
        } catch (\Throwable $e) {
            $caught = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(401, $data['status'] ?? 0, 'When public disabled, unauthenticated access throws 401');
        }
        self::assertTrue($caught, 'Should reject unauthenticated when public QR verification disabled');

        SystemAdminController::updateSiteSettings([
            'settings' => ['public_qr_verification_enabled' => true],
        ], ['username' => 'admin', 'role' => 'admin']);
    }

    public static function test_i01_unverified_citizen_vault_access_fails_closed(): void
    {
        $reg = SystemAdminController::registerUser([
            'username' => 'citizen_unverified_i01',
            'password' => 'secretPass123',
            'full_name_bn' => 'অযাচাইকৃত নাগরিক',
            'full_name_en' => 'Unverified Citizen',
            'role' => 'citizen',
            'nid_mock' => '9900001003',
        ]);
        $newUserId = (int) $reg['user']['id'];
        $userRow = DB::selectOne('SELECT * FROM users WHERE id = ?', [$newUserId]);
        self::assertEqual(0, (int) $userRow['is_identity_verified'], 'Public registration must default to is_identity_verified = 0');

        $vaultRes = SystemAdminController::getCitizenLinkedProperties(null, $userRow);
        self::assertTrue($vaultRes['is_verified'] === false, 'Vault response must report is_verified false');
        self::assertEqual(0, count($vaultRes['plots']), 'Unverified citizen must see zero plots in vault');
        self::assertEqual(0, count($vaultRes['deeds']), 'Unverified citizen must see zero deeds in vault');

        $caught = false;
        try {
            RoleControlController::togglePlotSaleLock(1, ['lock_state' => 1], $userRow);
        } catch (\Throwable $e) {
            $caught = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(403, $data['status'] ?? 0);
            self::assertEqual('CITIZEN_IDENTITY_UNVERIFIED', $data['code'] ?? '');
        }
        self::assertTrue($caught, 'Unverified citizen cannot toggle plot sale lock');

        // Admin verifies identity
        $verRes = SystemAdminController::verifyCitizenIdentity($newUserId, DB::selectOne("SELECT * FROM users WHERE username = 'admin'"));
        self::assertEqual(1, $verRes['is_identity_verified'], 'Identity verification must set flag to 1');

        $verifiedUserRow = DB::selectOne('SELECT * FROM users WHERE id = ?', [$newUserId]);
        self::assertEqual(1, (int) $verifiedUserRow['is_identity_verified']);
        $verifiedVaultRes = SystemAdminController::getCitizenLinkedProperties(null, $verifiedUserRow);
        self::assertTrue($verifiedVaultRes['is_verified'] === true, 'Verified citizen vault must report is_verified true');
        self::assertTrue(count($verifiedVaultRes['plots']) > 0, 'Verified citizen with NID 9900001003 must see linked plots');

        // Cleanup: remove newly registered user
        DB::statement('DELETE FROM users WHERE id = ?', [$newUserId]);
    }

    public static function test_i02_suspended_admin_register_blocks_provisioning(): void
    {
        // 1. Inactive admin attempting to provision
        $caught = false;
        try {
            SystemAdminController::registerUser([
                'username' => 'sr_illicit',
                'password' => 'secret123',
                'role' => 'sub_registrar',
            ], ['username' => 'suspended_admin', 'role' => 'admin', 'is_active' => 0]);
        } catch (\Throwable $e) {
            $caught = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(403, $data['status'] ?? 0);
            self::assertEqual('INACTIVE_ADMIN_CANNOT_PROVISION_ROLES', $data['code'] ?? '');
        }
        self::assertTrue($caught, 'Inactive admin must be blocked from provisioning roles');

        // 2. Unauthenticated user attempting to register non-citizen
        $caught2 = false;
        try {
            SystemAdminController::registerUser([
                'username' => 'admin_fake',
                'password' => 'secret123',
                'role' => 'admin',
            ], null);
        } catch (\Throwable $e) {
            $caught2 = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(403, $data['status'] ?? 0);
            self::assertEqual('UNAUTHORIZED_ROLE_PROVISIONING', $data['code'] ?? '');
        }
        self::assertTrue($caught2, 'Unauthenticated public registration cannot create admin role');
    }

    public static function test_i03_password_change_increments_token_version_and_revokes_old_jwt(): void
    {
        $user = DB::selectOne("SELECT * FROM users WHERE username = 'citizen'");
        self::assertTrue($user !== null);
        $initialVer = (int) ($user['token_version'] ?? 1);

        $oldToken = JwtAuthService::issueToken([
            'id' => (int) $user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'token_version' => $initialVer,
        ]);

        $authenticatedUser = JwtAuthService::getAuthenticatedUser('Bearer ' . $oldToken);
        self::assertEqual($user['username'], $authenticatedUser['username']);

        // Change password
        SystemAdminController::changePassword([
            'current_password' => 'demo123',
            'new_password' => 'newCitizenPass123',
        ], $authenticatedUser);

        $freshUser = DB::selectOne('SELECT * FROM users WHERE id = ?', [(int) $user['id']]);
        self::assertEqual($initialVer + 1, (int) $freshUser['token_version'], 'token_version must increment');

        // Old token verification must fail
        $caught = false;
        try {
            JwtAuthService::getAuthenticatedUser('Bearer ' . $oldToken);
        } catch (\Throwable $e) {
            $caught = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(401, $data['status'] ?? 0);
            self::assertEqual('SESSION_REVOKED', $data['code'] ?? '');
        }
        self::assertTrue($caught, 'Old token must be rejected with SESSION_REVOKED');

        // Reset password back for other tests
        DB::statement('UPDATE users SET password_hash = ? WHERE id = ?', [
            password_hash('demo123', PASSWORD_BCRYPT),
            (int) $user['id'],
        ]);
    }

    public static function test_i04_anonymous_persons_directory_masks_nid_and_redacts_privacy_fields(): void
    {
        putenv('HTTP_AUTHORIZATION=');
        unset($_SERVER['HTTP_AUTHORIZATION']);
        $publicPersons = WorkflowController::listPersons();
        self::assertTrue(count($publicPersons['items']) > 0, 'Persons list must return rows');

        foreach ($publicPersons['items'] as $person) {
            self::assertTrue(
                (bool) preg_match('/^\d{4}\*{4}\d{2}$/', $person['nid_mock']),
                "Public NID [{$person['nid_mock']}] must be masked in 9900****01 format"
            );
            self::assertTrue(empty($person['phone_mock']), 'Phone must be redacted for public');
            self::assertTrue(empty($person['address_bn']), 'Address must be redacted for public');
            self::assertTrue(empty($person['father_name_bn']), 'Father name must be redacted for public');
        }

        // Officer receives unmasked
        $officerUser = ['username' => 'sr_savar', 'role' => 'sub_registrar'];
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . JwtAuthService::createToken(['sub' => 'registrar', 'role' => 'sub_registrar']);
        $officerPersons = WorkflowController::listPersons();
        $first = $officerPersons['items'][0];
        self::assertTrue(!str_contains($first['nid_mock'], '****'), 'Officer must receive unmasked NID');
        self::assertTrue(!empty($first['address_bn']), 'Officer must receive address');
    }

    public static function test_i07_seller_fraction_conserved_and_buyer_consolidated(): void
    {
        $registrar = DB::selectOne("SELECT * FROM users WHERE username = 'registrar'");
        $officer = DB::selectOne("SELECT * FROM users WHERE username = 'acland'");
        $transfer = static function (int $seller, int $buyer, float $area) use ($registrar, $officer): void {
            $deed = WorkflowController::subRegistrarRegisterDeed([
                'plot_id' => 13, 'seller_id' => $seller, 'buyer_id' => $buyer,
                'requested_area_decimal' => $area, 'price_bdt' => 800000, 'deed_type' => 'SALE',
            ], $registrar);
            $case = DB::selectOne('SELECT id FROM mutations WHERE deed_id = ?', [$deed['deed_id']]);
            self::assertTrue($case !== null, 'Registration creates a persisted mutation');
            $decision = WorkflowController::decideMutationCase((int) $case['id'], ['decision' => 'APPROVED'], $officer);
            self::assertEqual('APPROVED', $decision['status']);
        };
        $transfer(1, 2, 4.0);
        $seller = DB::selectOne('SELECT * FROM ownerships WHERE plot_id = 13 AND person_id = 1 AND is_latest = 1');
        self::assertEqual(19.0, (float) $seller['area_decimal']);
        self::assertEqual('19/23', $seller['share_fraction']);
        $transfer(1, 2, 4.0);
        $buyerRows = DB::select('SELECT * FROM ownerships WHERE plot_id = 13 AND person_id = 2 AND is_latest = 1');
        self::assertEqual(1, count($buyerRows), 'Repeated acquisition consolidates latest holding');
        self::assertEqual(8.0, (float) $buyerRows[0]['area_decimal']);
        $transfer(2, 3, 6.0);
        $holdings = DB::select('SELECT * FROM ownerships WHERE plot_id = 13 AND is_latest = 1');
        self::assertEqual(23.0, (float) array_sum(array_column($holdings, 'area_decimal')));
        $buyer = DB::selectOne('SELECT * FROM ownerships WHERE plot_id = 13 AND person_id = 2 AND is_latest = 1');
        self::assertEqual(2.0, (float) $buyer['area_decimal'], 'Consolidated holding can be resold');
    }

    public static function test_i08_mutation_and_mortgage_concurrency_conflict_409(): void
    {
        $actorAc = ['username' => 'acland', 'role' => 'ac_land'];
        // Pick any pending mutation
        $pendingMut = DB::selectOne("SELECT * FROM mutations WHERE status = 'PENDING' LIMIT 1");
        self::assertTrue($pendingMut !== null, 'A pending mutation must exist');
        $mId = (int) $pendingMut['id'];

        // First decision succeeds
        $res1 = WorkflowController::decideMutationCase($mId, [
            'decision' => 'REJECTED',
            'reason_bn' => 'প্রত্যাখ্যান',
        ], $actorAc);
        self::assertEqual('REJECTED', $res1['status']);

        // Second decision on same mutation throws 409 conflict
        $caught = false;
        try {
            WorkflowController::decideMutationCase($mId, [
                'decision' => 'APPROVED',
                'reason_bn' => 'পুনরায় অনুমোদন চেষ্টা',
            ], $actorAc);
        } catch (\Throwable $e) {
            $caught = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(409, $data['status'] ?? 0, 'Second decision must conflict with 409');
            self::assertEqual('MUTATION_ALREADY_DECIDED', $data['code'] ?? '');
        }
        self::assertTrue($caught, 'Concurrent duplicate decision on mutation must throw 409');

        // Real clean owner/plot fixture: a denial must be caused by the duplicate lien.
        $actorBank = DB::selectOne("SELECT * FROM users WHERE username = 'bank'");
        $request = [
            'plot_id' => 13, 'borrower_id' => 1, 'requested_loan_bdt' => 100000,
            'area_mortgaged_decimal' => 1, 'bank_name_bn' => 'সোনালী ব্যাংক পিএলসি',
            'bank_name_en' => 'Sonali Bank PLC', 'branch_bn' => 'সাভার শাখা, ঢাকা',
        ];
        $first = WorkflowController::createMortgageLien($request, $actorBank);
        self::assertEqual('ACTIVE', $first['status']);
        $caught = false;
        try {
            WorkflowController::createMortgageLien($request, $actorBank);
        } catch (\Throwable $e) {
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(409, $data['status'] ?? 0);
            self::assertTrue(!empty($data['code']), 'Conflict has a domain error code');
            $caught = true;
        }
        self::assertTrue($caught, 'Duplicate active lien rejected');
        $count = DB::selectOne("SELECT COUNT(*) AS c FROM mortgages_liens WHERE plot_id = 13 AND status = 'ACTIVE'");
        self::assertEqual(1, (int) $count['c'], 'Rejection preserves one active lien');
    }

    public static function test_service_catalogue_and_fee_registry_crud_and_versioning(): void
    {
        $actorAdmin = ['username' => 'admin', 'role' => 'admin'];

        // 1. Public list
        $pubList = ServiceCatalogueController::listPublicServices();
        self::assertTrue($pubList['total'] >= 8, 'Public services list must return seeded services');

        // 2. HTTPS validation: non-HTTPS fails
        $caught = false;
        try {
            ServiceCatalogueController::createService([
                'service_code' => 'TEST_INSECURE',
                'title_bn' => 'অসুরক্ষিত টেস্ট সেবা',
                'external_url' => 'http://insecure-site.com',
            ], $actorAdmin);
        } catch (\Throwable $e) {
            $caught = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(422, $data['status'] ?? 0);
            self::assertEqual('INVALID_HTTPS_URL', $data['code'] ?? '');
        }
        self::assertTrue($caught, 'Non-HTTPS external URL must throw 422');

        // 3. Valid creation
        $created = ServiceCatalogueController::createService([
            'service_code' => 'TEST_OFFICIAL_PORTAL',
            'title_bn' => 'সরকারি পাইলট পোর্টাল',
            'title_en' => 'Government Pilot Portal',
            'category' => 'RECORD_MAPS',
            'service_type' => 'EXTERNAL_OFFICIAL',
            'external_url' => 'https://eporcha.gov.bd',
            'source_url' => 'https://minland.gov.bd',
            'authority_name_bn' => 'ভূমি রেকর্ড ও জরিপ অধিদপ্তর',
            'authority_name_en' => 'DLRS',
            'is_published' => 1,
            'display_order' => 99,
        ], $actorAdmin);
        $newSvcId = (int) $created['service']['id'];
        self::assertTrue($newSvcId > 0);

        // 4. Archive service
        $archRes = ServiceCatalogueController::archiveService($newSvcId, $actorAdmin);
        self::assertEqual(0, $archRes['is_published']);

        // 5. Public should not find archived service
        $pubAfterArch = ServiceCatalogueController::listPublicServices('RECORD_MAPS', 'TEST_OFFICIAL_PORTAL');
        self::assertEqual(0, $pubAfterArch['total'], 'Archived service must not appear in public query');

        // 6. Fee registry versioning
        $fee1 = DB::selectOne("SELECT * FROM service_fees_registry WHERE service_code = 'FEE_EMUTATION_ACLAND'");
        self::assertTrue($fee1 !== null);
        $feeId = (int) $fee1['id'];
        $initialFeeVer = (int) $fee1['version'];

        $updateFeeRes = ServiceCatalogueController::updateFee($feeId, [
            'total_bdt' => 1250.0,
            'circular_no' => '৩১.০০.০০০০.০৪২.৬৮.০১২.২২.৫২-হালনাগাদ',
            'effective_date' => '2026-03-01',
            'source_url' => 'https://minland.gov.bd/circulars/2026-02-17',
            'components' => [
                ['name_bn' => 'আবেদন কোর্ট ফি', 'name_en' => 'Court Fee', 'amount_bdt' => 50, 'type' => 'FEE'],
                ['name_bn' => 'নোটিশ জারি ফি', 'name_en' => 'Notice Fee', 'amount_bdt' => 100, 'type' => 'FEE'],
                ['name_bn' => 'রেকর্ড সংশোধন ও ডিসিআর ফি', 'name_en' => 'DCR Fee', 'amount_bdt' => 1100, 'type' => 'FEE'],
            ],
        ], $actorAdmin);

        self::assertEqual($initialFeeVer + 1, $updateFeeRes['fee']['version'], 'Fee version must increment to next integer');
        self::assertEqual(1250.0, (float) $updateFeeRes['fee']['total_bdt']);
        self::assertTrue(count($updateFeeRes['fee']['history']) >= 1, 'Previous fee state must be archived into history_json');
        self::assertEqual(1170.0, (float) $updateFeeRes['fee']['history'][0]['total_bdt'], 'Archived snapshot must contain original 1170 BDT');

        // 7. Public list does not expose history_json
        $pubFees = ServiceCatalogueController::listPublicFees();
        self::assertTrue($pubFees['total'] >= 3, 'All three sourced fee schedules must be published');
        foreach ($pubFees['items'] as $pf) {
            self::assertTrue(!isset($pf['history_json']), 'Public fee listing must not expose internal history_json');
        }

        // 8. Strict validation: Negative fee amount must throw 422
        $caughtNeg = false;
        try {
            ServiceCatalogueController::updateFee($feeId, [
                'total_bdt' => -100.0,
            ], $actorAdmin);
        } catch (\Throwable $e) {
            $caughtNeg = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(422, $data['status'] ?? 0);
            self::assertEqual('INVALID_FEE_AMOUNT', $data['code'] ?? '');
        }
        self::assertTrue($caughtNeg, 'Negative fee amount must throw 422');

        // 9. Strict validation: Invalid effective date format must throw 422
        $caughtDate = false;
        try {
            ServiceCatalogueController::updateFee($feeId, [
                'total_bdt' => 1250.0,
                'effective_date' => 'invalid-date-format',
            ], $actorAdmin);
        } catch (\Throwable $e) {
            $caughtDate = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(422, $data['status'] ?? 0);
            self::assertEqual('INVALID_EFFECTIVE_DATE', $data['code'] ?? '');
        }
        self::assertTrue($caughtDate, 'Invalid effective date must throw 422');

        // 10. Strict validation: Incoherent component sum must throw 422
        $caughtIncoh = false;
        try {
            ServiceCatalogueController::updateFee($feeId, [
                'total_bdt' => 1250.0,
                'is_estimate' => 0,
                'components' => [
                    ['name_bn' => 'ফি ১', 'name_en' => 'Fee 1', 'amount_bdt' => 100],
                    ['name_bn' => 'ফি ২', 'name_en' => 'Fee 2', 'amount_bdt' => 100],
                ],
            ], $actorAdmin);
        } catch (\Throwable $e) {
            $caughtIncoh = true;
            $data = json_decode($e->getMessage(), true) ?: [];
            self::assertEqual(422, $data['status'] ?? 0);
            self::assertEqual('INCOHERENT_FEE_COMPONENTS', $data['code'] ?? '');
        }
        self::assertTrue($caughtIncoh, 'Incoherent fee component sum must throw 422');
    }
    public static function test_analytics_follow_persisted_records_and_readiness_requires_schema(): void
    {
        $before = SystemAdminController::getAnalyticsSummary();
        self::assertEqual(80, array_sum(array_column($before['monthly_series'], 'deeds')), 'Monthly deed counts reconcile to records');
        $approved = DB::selectOne("SELECT COUNT(*) AS c FROM mutations WHERE status = 'APPROVED'");
        self::assertEqual((int) $approved['c'], array_sum(array_column($before['monthly_series'], 'mutations')));
        DB::insert('INSERT INTO risk_reports (plot_id, seller_id, buyer_id, requested_area_decimal, verdict, risk_score, flags_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [13, 1, 2, 4, 'HIGH_RISK', 100, '[]', gmdate('c')]);
        $after = SystemAdminController::getAnalyticsSummary();
        self::assertEqual(array_sum(array_column($before['monthly_series'], 'blocked_risks')) + 1,
            array_sum(array_column($after['monthly_series'], 'blocked_risks')), 'High-risk counts come from persisted reports');
        $location = DB::selectOne('SELECT location_id FROM plots WHERE id = 13');
        $area = array_values(array_filter($after['mouza_breakdown'], fn(array $m) => (int) $m['id'] === (int) $location['location_id']))[0];
        self::assertEqual(5.0, (float) $area['verification_coverage_pct'], 'One checked plot among20 is5percent coverage');
        self::assertTrue(\App\Services\ReadinessService::inspect()['ready']);
        DB::execRaw('DROP TABLE service_catalogue');
        self::assertTrue(!\App\Services\ReadinessService::inspect()['ready'], 'Missing schema cannot report ready');
        $exists = DB::selectOne("SELECT COUNT(*) AS c FROM sqlite_master WHERE name = 'service_catalogue'");
        self::assertEqual(0, (int) $exists['c'], 'Readiness never migrates or seeds storage');
    }

    public static function test_bank_institution_assignment_and_public_privacy_boundaries(): void
    {
        $bank = DB::selectOne("SELECT * FROM users WHERE username = 'bank'");
        $attempts = [
            fn() => SystemAdminController::updateProfile(['office_en'=>'Bangladesh Krishi Bank, Test'], $bank),
            fn() => WorkflowController::createMortgageLien(['bank_name_en'=>'Bangladesh Krishi Bank'], $bank),
            fn() => WorkflowController::releaseMortgageLien(2, $bank),
            fn() => RoleControlController::generateLienNoc(3, $bank),
            fn() => \App\Services\BankScopeService::assertCanManage(array_merge($bank, ['office_en'=>'']), 'Sonali Bank PLC'),
            fn() => \App\Services\BankScopeService::assertCanManage($bank, 'Bank PLC'),
        ];
        foreach ($attempts as $attempt) {
            $denied = false;
            try { $attempt(); } catch (\RuntimeException $e) {
                $detail = json_decode($e->getMessage(), true);
                $denied = ($detail['status'] ?? 0) === 403;
            }
            self::assertTrue($denied, 'Cross-institution operation or self-reassignment must be denied');
        }
        self::assertEqual('ACTIVE', DB::selectOne('SELECT status FROM mortgages_liens WHERE id = 2')['status']);
        $risk = WorkflowController::citizenCheckBeforeYouBuy(1);
        $json = json_encode($risk);
        self::assertTrue(!str_contains($json, '9900001001') && !str_contains($json, 'father_name'), 'Public risk response minimizes identity fields');
        $proof = LedgerVerificationController::verifySingleDeed(1);
        self::assertTrue($proof['verification']['is_valid'], 'Privacy projection preserves actual signature verification');
        self::assertTrue(!isset($proof['seller']['address_bn']) && !isset($proof['buyer']['phone_dummy']), 'Public proof does not expose contact/address');
    }

    public static function test_rapid_resale_defaults_to_current_time(): void
    {
        $recent = [['deed_type'=>'SALE','created_at'=>gmdate('c', time()-86400),'id'=>999,'deed_no'=>'CLOCK-PROBE']];
        self::assertTrue(FraudRulesEngine::checkRapidResale($recent, 30) !== null, 'Current recent sale must trigger without a fixed reference date');
        $old = [['deed_type'=>'SALE','created_at'=>gmdate('c', time()-86400*60),'id'=>998,'deed_no'=>'OLD-CLOCK-PROBE']];
        self::assertTrue(FraudRulesEngine::checkRapidResale($old, 30) === null, 'Old sale must be outside current warning window');
    }

}

