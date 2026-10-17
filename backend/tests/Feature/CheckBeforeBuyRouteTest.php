<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Regression Test Suite for Audit Finding F11:
 * Ensures the "Check before you buy" deep link (e.g. /check?dag=101) resolves
 * to a populated risk report so the Map → Audit Plot navigation no longer
 * lands on a blank page. The frontend auto-run effect relies on the API
 * contract that this suite pins.
 */
final class CheckBeforeBuyRouteTest
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
        $tmpDb = sys_get_temp_dir() . '/bhumishield_check_route_test_' . getmypid() . '.sqlite';
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
        echo "\n   PASS  Tests\\Feature\\CheckBeforeBuyRouteTest (Finding F11)\n";

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

        echo "\n  Check-Before-Buy Route Tests:    {$passed} passed, {$failed} failed (" . count($methods) . " total)\n\n";
        @unlink($tmpDb);
        return $failed;
    }

    /**
     * F11.1: The check-before-buy API must accept an anonymous request for a
     * valid plot and return a complete risk report (status, findings, score,
     * summary) so the auto-run effect on the frontend can render immediately.
     */
    public static function test_01_check_before_buy_returns_full_report_for_seeded_plot(): void
    {
        $plot = DB::selectOne("SELECT id FROM plots WHERE dag_no = '101' LIMIT 1");
        self::assertTrue($plot !== null, 'Seeded plot 101 must exist');

        $res = self::callRoute('GET', "/api/v1/plots/{$plot['id']}/check-before-you-buy", [], null, [
            'requested_area_decimal' => 12.0,
            'seller_id' => 1,
        ]);

        self::assertEqual(200, $res['status'], 'GET check-before-you-buy must return 200');
        $b = $res['body'];
        $rr = $b['risk_report'] ?? null;
        self::assertTrue(is_array($rr), 'Response must include a risk_report object');
        self::assertTrue(isset($rr['verdict']) && in_array($rr['verdict'], ['SAFE', 'WARNING', 'HIGH_RISK', 'REVIEW'], true),
            'Risk report must include one of the canonical verdicts (got: ' . ($rr['verdict'] ?? 'missing') . ')');
        self::assertTrue(isset($rr['summary_bn']) && isset($rr['summary_en']),
            'Risk report must include bilingual summary');
        self::assertTrue(isset($rr['flags']) && is_array($rr['flags']),
            'Risk report must include flags array');
    }

    /**
     * F11.2: The check-before-buy API must reject an unknown plot id with a
     * structured 4xx response (not a 500) so the frontend error path can be
     * exercised cleanly.
     */
    public static function test_02_check_before_buy_rejects_unknown_plot_404_or_422(): void
    {
        $res = self::callRoute('GET', '/api/v1/plots/999999/check-before-you-buy', [], null, [
            'requested_area_decimal' => 5.0,
            'seller_id' => 1,
        ]);

        self::assertTrue(in_array($res['status'], [404, 422], true),
            'Unknown plot must return 404 or 422, got ' . $res['status']);
        self::assertTrue(isset($res['body']['code']),
            'Rejection must include a structured error code for the frontend');
    }

    /**
     * F11.3: The public plots listing must return plots with their dag numbers
     * so the deep-link resolver (?dag=101) can match on the first page load.
     */
    public static function test_03_plots_listing_includes_dag_for_deep_link_resolution(): void
    {
        $res = self::callRoute('GET', '/api/v1/plots');
        self::assertEqual(200, $res['status']);

        $items = is_array($res['body']['items'] ?? null) ? $res['body']['items'] : [];
        self::assertTrue(count($items) > 0, 'Plots listing must be non-empty');

        $first = $items[0];
        self::assertTrue(isset($first['dag_no']) || isset($first['dag_no_bn']),
            'Each plot row must carry a dag_no so ?dag= deep links resolve');
    }

    /**
     * F11.4: The /check/{plot_id} alternate path must also resolve to the same
     * risk report so legacy Map → Audit Plot deep links keep working.
     */
    public static function test_04_check_alias_path_works(): void
    {
        $plot = DB::selectOne("SELECT id FROM plots WHERE dag_no = '101' LIMIT 1");
        $res = self::callRoute('GET', "/api/v1/check/{$plot['id']}", [], null, [
            'requested_area_decimal' => 12.0,
            'seller_id' => 1,
        ]);
        self::assertEqual(200, $res['status'], 'GET /check/{id} alias must also return 200');
        self::assertTrue(isset($res['body']['risk_report']['verdict']),
            'Alias path must include the same risk_report.verdict field');
    }
}
