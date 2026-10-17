<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Controllers\Api\V1\OnboardingAndAppealsController;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Feature Test Suite for Tier C Maker-Checker Staging Data Onboarding & Appellate Review Mirror.
 */
final class TierCOnboardingAndAppealsTest
{
    private static function assertTrue(bool $cond, string $message = 'Assertion failed'): void
    {
        if (!$cond) {
            throw new \RuntimeException($message);
        }
    }

    public static function runAll(): int
    {
        $tmpDb = sys_get_temp_dir() . '/bhumishield_tier_c_test_' . getmypid() . '.sqlite';
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
        echo "\n   PASS  Tests\\Feature\\TierCOnboardingAndAppealsTest (Tier C Upgrades)\n";

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

        echo "\n  Tier C Tests:    {$passed} passed, {$failed} failed (" . count($methods) . " total)\n\n";
        @unlink($tmpDb);
        return $failed;
    }

    public static function test_01_maker_submits_onboarding_batch_with_hash_proof_package(): void
    {
        $maker = DB::selectOne("SELECT * FROM users WHERE username = 'rdo_savar'");
        self::assertTrue($maker !== null, 'rdo_savar must exist');

        $payload = [
            'record_type' => 'DEED_DRAFT',
            'items' => [
                [
                    'deed_type' => 'SALE',
                    'dag_no' => '120',
                    'mouza' => 'Birulia',
                    'seller_name' => 'মো. শফিকুল ইসলাম',
                    'buyer_name' => 'মোসা. নাজনীন আক্তার',
                    'area_decimal' => 12.0,
                    'declared_value_bdt' => 2400000,
                ],
            ],
        ];

        $res = OnboardingAndAppealsController::createBatch($payload, $maker);
        self::assertTrue(isset($res['batch']), 'Batch object must be returned');
        self::assertTrue(str_starts_with($res['batch']['batch_no'], 'ONB-2026-'), 'Batch number format');
        self::assertTrue($res['batch']['status'] === 'SUBMITTED', 'Status must be SUBMITTED');
        self::assertTrue(strlen($res['batch']['batch_hash']) === 64, 'SHA-256 batch hash required');
        self::assertTrue($res['total_items'] === 1, 'Total items must be 1');
    }

    public static function test_02_maker_cannot_approve_own_batch_due_to_separation_of_duties(): void
    {
        $maker = DB::selectOne("SELECT * FROM users WHERE username = 'rdo_savar'");
        $batch = DB::selectOne("SELECT * FROM onboarding_batches WHERE maker_user_id = ? AND status = 'SUBMITTED' LIMIT 1", [(int) $maker['id']]);
        self::assertTrue($batch !== null, 'Submitted batch must exist');

        $rejected = false;
        try {
            // Maker attempts to approve own batch
            OnboardingAndAppealsController::decideBatch($batch['id'], ['decision' => 'APPROVED'], $maker);
        } catch (\Throwable $e) {
            $msg = $e->getMessage();
            if (str_contains($msg, 'SEPARATION_OF_DUTIES_VIOLATION') || str_contains($msg, 'FORBIDDEN')) {
                $rejected = true;
            }
        }

        self::assertTrue($rejected, 'Maker must be blocked from approving own batch under Separation of Duties');
    }

    public static function test_03_authorized_checker_approves_onboarding_batch(): void
    {
        $checker = DB::selectOne("SELECT * FROM users WHERE username = 'registrar'");
        self::assertTrue($checker !== null, 'Sub-Registrar checker must exist');

        $batch = DB::selectOne("SELECT * FROM onboarding_batches WHERE status = 'SUBMITTED' LIMIT 1");
        self::assertTrue($batch !== null, 'A submitted batch must exist');

        $res = OnboardingAndAppealsController::decideBatch($batch['id'], ['decision' => 'APPROVED'], $checker);
        self::assertTrue($res['status'] === 'APPROVED', 'Decision must be APPROVED');
        self::assertTrue($res['checker_user_id'] === (int) $checker['id'], 'Checker ID must be recorded');

        // Verify in DB
        $updated = DB::selectOne('SELECT status, checker_user_id, decided_at FROM onboarding_batches WHERE id = ?', [(int) $batch['id']]);
        self::assertTrue($updated['status'] === 'APPROVED', 'Database status updated');
        self::assertTrue((int) $updated['checker_user_id'] === (int) $checker['id'], 'Database checker_user_id updated');
        self::assertTrue(!empty($updated['decided_at']), 'Timestamp recorded');
    }

    public static function test_04_citizen_files_appeal_with_masked_appellant_nid(): void
    {
        $citizen = DB::selectOne("SELECT * FROM users WHERE username = 'citizen'");
        self::assertTrue($citizen !== null, 'Citizen user must exist');

        $appealRes = OnboardingAndAppealsController::createAppeal([
            'mutation_id' => 1,
            'plot_id' => 8,
            'appellant_name_bn' => 'মোসা. হালিমা বেগম',
            'appellant_nid' => '9900001002',
            'reason_bn' => 'নামজারি খারিজের আদেশের বিরুদ্ধে অতিরিক্ত জেলা প্রশাসক (রাজস্ব) মহোদয় সমীপে আপিল।',
        ], $citizen);

        self::assertTrue(isset($appealRes['appeal']), 'Appeal object must be returned');
        self::assertTrue(str_starts_with($appealRes['appeal']['appeal_code'], 'APL-2026-'), 'Appeal code format');
        self::assertTrue($appealRes['appeal']['status'] === 'FILED', 'Initial status must be FILED');
        self::assertTrue(isset($appealRes['appeal']['appellant_nid_masked']), 'Appellant NID must be masked for public view');
        self::assertTrue(!str_contains($appealRes['appeal']['appellant_nid_masked'], '000010'), 'Middle digits of NID masked');
    }

    public static function test_05_stay_order_granted_locks_plot_against_sale(): void
    {
        $supervisor = DB::selectOne("SELECT * FROM users WHERE username = 'uno_savar'");
        self::assertTrue($supervisor !== null, 'UNO supervisor user must exist');

        $appeal = DB::selectOne("SELECT * FROM appeals WHERE appeal_code = 'APL-2026-0001'");
        self::assertTrue($appeal !== null, 'Seeded appeal APL-2026-0001 must exist');

        $plotId = (int) $appeal['plot_id'];

        // Decide with STAY_ORDER_GRANTED
        $dec = OnboardingAndAppealsController::decideAppeal($appeal['id'], [
            'status' => 'STAY_ORDER_GRANTED',
            'decision_note_bn' => 'আপিল নিষ্পত্তি না হওয়া পর্যন্ত দাগে যেকোনো প্রকার হস্তান্তর স্থগিতাদেশ প্রদান করা হলো।',
        ], $supervisor);

        self::assertTrue($dec['status'] === 'STAY_ORDER_GRANTED', 'Status must be STAY_ORDER_GRANTED');

        // Verify plot owner_sale_locked is now 1 in database
        $plot = DB::selectOne('SELECT owner_sale_locked FROM plots WHERE id = ?', [$plotId]);
        self::assertTrue((int) ($plot['owner_sale_locked'] ?? 0) === 1, 'Plot must be locked against sale when stay order is granted');
    }

    public static function test_06_unauthorized_role_cannot_decide_appeals(): void
    {
        $citizen = DB::selectOne("SELECT * FROM users WHERE username = 'citizen'");
        $appeal = DB::selectOne("SELECT * FROM appeals LIMIT 1");

        $blocked = false;
        try {
            OnboardingAndAppealsController::decideAppeal($appeal['id'], ['status' => 'OVERTURNED'], $citizen);
        } catch (\Throwable $e) {
            if (str_contains($e->getMessage(), 'FORBIDDEN')) {
                $blocked = true;
            }
        }

        self::assertTrue($blocked, 'Citizen must not be authorized to decide legal appeals');
    }
}
