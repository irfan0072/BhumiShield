<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Controllers\Api\V1\LedgerVerificationController;
use App\Http\Controllers\Api\V1\RoleControlController;
use App\Http\Middleware\RoleMiddleware;
use App\Http\Controllers\Api\V1\SystemAdminController;
use App\Http\Controllers\Api\V1\WorkflowController;
use App\Services\FraudRulesEngine;
use App\Services\LedgerService;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Automated Feature & Unit Test Suite for BhumiShield Laravel Backend.
 * Executed via `php artisan test`.
 */
final class RulesAndLedgerTest
{
    private static array $seedSummary = [];

    private static function assertTrue(bool $cond, string $message = 'Assertion failed'): void
    {
        if (!$cond) {
            throw new \RuntimeException($message);
        }
    }

    public static function runAll(): int
    {
        $tmpDb = sys_get_temp_dir() . '/bhumishield_laravel_test_' . getmypid() . '.sqlite';
        putenv("BHUMISHIELD_TEST_DB={$tmpDb}");
        $_ENV['BHUMISHIELD_TEST_DB'] = $tmpDb;
        DB::resetConnection();

        self::$seedSummary = (new DatabaseSeeder())->run(true);

        $methods = array_values(array_filter(
            get_class_methods(self::class),
            fn(string $m) => str_starts_with($m, 'test_')
        ));

        $passed = 0;
        $failed = 0;
        echo "\n   PASS  Tests\\Feature\\RulesAndLedgerTest (Laravel 11 / PHP " . PHP_VERSION . ")\n";

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

        @unlink($tmpDb);
        echo "\n  Tests:    {$passed} passed" . ($failed > 0 ? ", {$failed} failed" : '') . " ({$passed} assertions)\n\n";
        return $failed === 0 ? 0 : 1;
    }

    public static function test_01_seed_counts_and_dummy_data(): void
    {
        self::assertTrue(self::$seedSummary['plots'] === 60, 'Expected 60 plots');
        self::assertTrue(self::$seedSummary['khatian_records'] === 240, 'Expected 240 khatians');
        self::assertTrue(self::$seedSummary['deeds'] === 80, 'Expected 80 deeds');
        self::assertTrue(self::$seedSummary['scenarios'] === 8, 'Expected 8 demo scenarios');
    }

    public static function test_02_rule_seller_not_owner(): void
    {
        $latestOwnerships = [['person_id' => 8, 'area_decimal' => 16.0, 'owner_name_bn' => 'ফাতেমা বেগম']];
        $flag = FraudRulesEngine::checkSellerNotOwner(
            9,
            $latestOwnerships,
            ['id' => 9, 'name_bn' => 'মো. সাইফুল ইসলাম', 'name_en' => 'Md. Saiful Islam'],
            '4104'
        );
        self::assertTrue($flag !== null && $flag['rule_id'] === 'SELLER_NOT_OWNER');
        self::assertTrue($flag['severity'] === 'HIGH_RISK');

        $clean = FraudRulesEngine::checkSellerNotOwner(8, $latestOwnerships, ['id' => 8], '4104');
        self::assertTrue($clean === null);
    }

    public static function test_03_rule_area_exceeds_owned(): void
    {
        $latestOwnerships = [
            ['person_id' => 6, 'share_fraction' => '1/2', 'area_decimal' => 12.0],
            ['person_id' => 7, 'share_fraction' => '1/2', 'area_decimal' => 12.0],
        ];
        $flag = FraudRulesEngine::checkAreaExceedsOwned(6, 18.0, $latestOwnerships, []);
        self::assertTrue($flag !== null && $flag['rule_id'] === 'AREA_EXCEEDS_OWNED');

        $clean = FraudRulesEngine::checkAreaExceedsOwned(6, 10.0, $latestOwnerships, []);
        self::assertTrue($clean === null);
    }

    public static function test_04_rule_double_sale(): void
    {
        $latestOwnerships = [['person_id' => 3, 'share_fraction' => '1/1', 'area_decimal' => 15.0]];
        $existingDeeds = [[
            'id' => 2,
            'deed_no' => 'DL-2026-1002',
            'deed_type' => 'SALE',
            'seller_id' => 3,
            'area_decimal' => 15.0,
            'status' => 'PENDING_MUTATION',
        ]];
        $flag = FraudRulesEngine::checkDoubleSale(3, 10.0, $latestOwnerships, $existingDeeds);
        self::assertTrue($flag !== null && $flag['rule_id'] === 'DOUBLE_SALE');
    }

    public static function test_05_rule_khatian_chain_break(): void
    {
        $khatians = [
            ['survey_type' => 'CS', 'khatian_no' => '1007', 'recorded_area_decimal' => 18.0, 'status' => 'VALID'],
            ['survey_type' => 'SA', 'khatian_no' => '2007', 'recorded_area_decimal' => 18.0, 'status' => 'VALID'],
            ['survey_type' => 'RS', 'khatian_no' => '3007', 'recorded_area_decimal' => 18.0, 'status' => 'VALID'],
            ['survey_type' => 'BS', 'khatian_no' => '4107', 'recorded_area_decimal' => 26.0, 'status' => 'CHAIN_BREAK'],
        ];
        $flag = FraudRulesEngine::checkKhatianChainBreak($khatians);
        self::assertTrue($flag !== null && $flag['rule_id'] === 'KHATIAN_CHAIN_BREAK');
        self::assertTrue($flag['severity'] === 'REVIEW');
    }

    public static function test_06_rule_deed_tampered_and_ed25519_ledger(): void
    {
        $content = ['deed_no' => 'DL-TEST-1', 'area_decimal' => 10.0, 'seller_id' => 1, 'buyer_id' => 2];
        $h = LedgerService::computeDeedHash($content, LedgerService::GENESIS_HASH, 1);
        $sig = LedgerService::signHash($h);
        self::assertTrue(LedgerService::verifySignature($h, $sig));

        $intactRow = [
            'id' => 99,
            'deed_no' => 'DL-TEST-1',
            'chain_index' => 1,
            'prev_hash' => LedgerService::GENESIS_HASH,
            'content_hash' => $h,
            'signature' => $sig,
            'content_json' => LedgerService::canonicalJson($content),
            'original_content_json' => LedgerService::canonicalJson($content),
        ];
        self::assertTrue(FraudRulesEngine::checkDeedTampered([$intactRow]) === null);

        $tamperedRow = $intactRow;
        $tamperedContent = $content;
        $tamperedContent['area_decimal'] = 25.0;
        $tamperedRow['content_json'] = LedgerService::canonicalJson($tamperedContent);
        $flag = FraudRulesEngine::checkDeedTampered([$tamperedRow]);
        self::assertTrue($flag !== null && $flag['rule_id'] === 'DEED_TAMPERED');
    }

    public static function test_07_rule_plot_mortgaged(): void
    {
        $liens = [[
            'id' => 1,
            'bank_name_bn' => 'সোনালী ব্যাংক পিএলসি',
            'bank_name_en' => 'Sonali Bank PLC',
            'branch_bn' => 'সাভার শাখা',
            'amount_bdt' => 2500000,
            'status' => 'ACTIVE',
        ]];
        $flag = FraudRulesEngine::checkPlotMortgaged($liens);
        self::assertTrue($flag !== null && $flag['rule_id'] === 'PLOT_MORTGAGED');
    }

    public static function test_08_rule_rapid_resale(): void
    {
        $deeds = [[
            'deed_no' => 'DL-2026-1007',
            'deed_type' => 'SALE',
            'created_at' => '2026-10-12T16:00:00+06:00',
        ]];
        $flag = FraudRulesEngine::checkRapidResale($deeds, 30, '2026-10-16T18:00:00+06:00');
        self::assertTrue($flag !== null && $flag['rule_id'] === 'RAPID_RESALE');
    }

    public static function test_09_rule_inheritance_unresolved(): void
    {
        $deceasedOwner = [
            'id' => 14,
            'name_bn' => 'আলহাজ্ব নূরুল হক',
            'name_en' => 'Alhaj Nurul Haque',
            'is_deceased' => 1,
            'heirs_recorded' => 0,
        ];
        $flag = FraudRulesEngine::checkInheritanceUnresolved($deceasedOwner, [$deceasedOwner], []);
        self::assertTrue($flag !== null && $flag['rule_id'] === 'INHERITANCE_UNRESOLVED');
    }

    public static function test_10_rule_nid_mismatch(): void
    {
        $person = [
            'id' => 1,
            'name_bn' => 'মো. রফিকুল ইসলাম',
            'name_en' => 'Md. Rafiqul Islam',
            'nid' => '9900001001',
        ];
        $flag = FraudRulesEngine::checkNidMismatch($person, '9999999999');
        self::assertTrue($flag !== null && $flag['rule_id'] === 'NID_MISMATCH');
        self::assertTrue(FraudRulesEngine::checkNidMismatch($person, '9900001001') === null);
    }

    public static function test_11_all_8_seeded_demo_scenarios_produce_expected_verdicts(): void
    {
        $res = WorkflowController::listDemoScenarios();
        self::assertTrue(count($res['items']) === 8, 'Expected 8 scenarios');
        foreach ($res['items'] as $sc) {
            self::assertTrue(
                $sc['live_verdict'] === $sc['expected_verdict'],
                "Scenario {$sc['scenario_no']} ({$sc['code']}) expected {$sc['expected_verdict']} got {$sc['live_verdict']}"
            );
        }
    }

    public static function test_12_live_tamper_and_restore_workflow(): void
    {
        $before = LedgerVerificationController::verifySingleDeed('1');
        self::assertTrue($before['verification']['is_valid'] === true);

        $tampered = LedgerVerificationController::simulateTampering(1);
        self::assertTrue($tampered['verification']['is_valid'] === false);
        self::assertTrue($tampered['verification']['verdict'] === 'HIGH_RISK');

        $restored = LedgerVerificationController::restoreTamperedDeed(1);
        self::assertTrue($restored['verification']['is_valid'] === true);

        LedgerVerificationController::restoreTamperedDeed(5);
        $fullClean = LedgerVerificationController::verifyFullLedger();
        self::assertTrue($fullClean['is_valid'] === true);

        LedgerVerificationController::simulateTampering(5, ['new_area_decimal' => 25.0]);
        $fullBroken = LedgerVerificationController::verifyFullLedger();
        self::assertTrue($fullBroken['is_valid'] === false);
        self::assertTrue($fullBroken['first_broken_deed_no'] === 'DL-2026-1005');
    }

    public static function test_13_end_to_end_role_workflows(): void
    {
        $cRep = WorkflowController::citizenCheckBeforeYouBuy(1, 5.0);
        self::assertTrue($cRep['risk_report']['verdict'] === 'SAFE');

        $regRes = WorkflowController::subRegistrarRegisterDeed([
            'plot_id' => 13,
            'seller_id' => 1,
            'buyer_id' => 2,
            'requested_area_decimal' => 4.0,
            'price_bdt' => 800000,
        ], ['username' => 'registrar', 'role' => 'sub_registrar']);
        self::assertTrue($regRes['status'] === 'PENDING_MUTATION');
        self::assertTrue(str_starts_with($regRes['qr_svg_data_uri'], 'data:image/svg+xml;base64,'));

        $colCheck = WorkflowController::bankCollateralCheck([
            'plot_id' => 6,
            'borrower_id' => 11,
            'requested_loan_bdt' => 1000000,
            'area_mortgaged_decimal' => 10.0,
        ]);
        self::assertTrue($colCheck['can_create_lien'] === false);
        self::assertTrue($colCheck['risk_report']['verdict'] === 'HIGH_RISK');
    }

    public static function test_14_user_registration_login_and_admin_management(): void
    {
        $reg = SystemAdminController::registerUser([
            'username' => 'new_union_officer',
            'email' => 'union@demo.bhumishield.gov.bd',
            'password' => 'secret123',
            'full_name_bn' => 'মো. আরিফুল ইসলাম',
            'full_name_en' => 'Md. Ariful Islam',
            'role' => 'citizen',
            'office_bn' => 'বিরুলিয়া ইউনিয়ন ভূমি অফিস',
            'office_en' => 'Birulia Union Land Office',
            'phone_dummy' => '01700-008888',
            'nid' => '9900008888',
        ]);
        self::assertTrue(!empty($reg['access_token']));
        $uid = (int) $reg['user']['id'];

        $logged = WorkflowController::login(['username' => 'new_union_officer', 'password' => 'secret123']);
        self::assertTrue($logged['user']['username'] === 'new_union_officer');

        $updated = SystemAdminController::adminUpdateUser($uid, ['role' => 'sub_registrar', 'is_active' => 1]);
        self::assertTrue($updated['user']['role'] === 'sub_registrar');

        $deleted = SystemAdminController::adminDeleteUser($uid);
        self::assertTrue($deleted['deleted_id'] === $uid);
    }

    public static function test_15_site_settings_and_analytics_summary(): void
    {
        $st = SystemAdminController::getSiteSettings();
        self::assertTrue((int) $st['settings']['rapid_resale_days'] === 30);

        $upd = SystemAdminController::updateSiteSettings([
            'settings' => ['rapid_resale_days' => 45, 'helpline_number' => '16122'],
        ]);
        self::assertTrue((int) $upd['settings']['rapid_resale_days'] === 45);

        $summary = SystemAdminController::getAnalyticsSummary();
        self::assertTrue($summary['kpis']['total_plots'] === 60);
        self::assertTrue($summary['kpis']['total_khatians'] === 240);
    }

    public static function test_16_rbac_role_middleware_enforces_role_guards(): void
    {
        $subRegActor = RoleMiddleware::authorize(['sub_registrar'], ['id' => 2, 'username' => 'registrar', 'role' => 'sub_registrar', 'is_active' => 1]);
        self::assertTrue($subRegActor['role'] === 'sub_registrar');

        $blocked = false;
        try {
            RoleMiddleware::authorize(['sub_registrar'], ['id' => 1, 'username' => 'citizen', 'role' => 'citizen', 'is_active' => 1]);
        } catch (\Throwable $e) {
            $err = json_decode($e->getMessage(), true);
            $blocked = ($err['code'] ?? '') === 'FORBIDDEN_ROLE';
        }
        self::assertTrue($blocked, 'Expected RoleMiddleware to block citizen from sub_registrar route');

        $switched = RoleControlController::switchDemoRole(['role' => 'ac_land']);
        self::assertTrue($switched['user']['role'] === 'ac_land' && !empty($switched['access_token']));
    }

    public static function test_17_citizen_plot_sale_lock_and_dispute_controls(): void
    {
        $lockRes = RoleControlController::togglePlotSaleLock(1, ['locked' => true], ['username' => 'citizen', 'role' => 'citizen', 'nid' => '9900001001', 'is_active' => 1]);
        self::assertTrue($lockRes['owner_sale_locked'] === 1);

        $preCheck = WorkflowController::subRegistrarPreCheck([
            'plot_id' => 1,
            'seller_id' => 1,
            'buyer_id' => 2,
            'requested_area_decimal' => 5.0,
        ]);
        self::assertTrue($preCheck['risk_report']['verdict'] === 'HIGH_RISK');
        self::assertTrue($preCheck['risk_report']['flags'][0]['rule_id'] === 'OWNER_SALE_LOCKED');

        $unlockRes = RoleControlController::togglePlotSaleLock(1, ['locked' => false], ['username' => 'citizen', 'role' => 'citizen', 'nid' => '9900001001', 'is_active' => 1]);
        self::assertTrue($unlockRes['owner_sale_locked'] === 0);

        $disp = RoleControlController::createDispute([
            'plot_id' => 1,
            'dispute_type' => 'BOUNDARY_CLAIM',
            'description_bn' => 'সীমানা নির্ধারণ সংক্রান্ত আপত্তি।',
        ], ['username' => 'citizen', 'role' => 'citizen', 'is_active' => 1]);
        self::assertTrue($disp['status'] === 'OPEN');

        $resolved = RoleControlController::resolveDispute((int) $disp['dispute_id'], ['status' => 'RESOLVED'], ['username' => 'acland', 'role' => 'ac_land', 'is_active' => 1]);
        self::assertTrue($resolved['status'] === 'RESOLVED');
    }

    public static function test_18_registrar_acland_and_bank_noc_controlling_systems(): void
    {
        $fees = RoleControlController::calculateFees(2000000, 'SALE');
        self::assertTrue($fees['total_govt_fees_bdt'] === 150000);

        $noc = RoleControlController::generateLienNoc(3, ['username'=>'admin', 'role'=>'admin']);
        self::assertTrue(str_starts_with($noc['noc_no'], 'NOC-2026-') && strlen($noc['noc_hash']) === 64);

        $flagged = RoleControlController::listFlaggedKhatians();
        self::assertTrue($flagged['total'] >= 2);
    }
}
