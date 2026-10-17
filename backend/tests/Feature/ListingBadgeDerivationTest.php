<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Regression Test Suite for Audit Finding F16:
 *
 * The marketplace listing's `verification_badge` must be derived from real
 * signals (field reports on the plot) rather than always being hard-coded
 * to VERIFIED_CLEAR. The contract:
 *   - plot has at least one DISPUTED boundary OR ENCROACHED possession → FLAGGED
 *   - plot has at least one field report, none flagging → VERIFIED_CLEAR
 *   - plot has no field reports at all → NEEDS_REVIEW
 */
final class ListingBadgeDerivationTest
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

    private static function loginAs(string $username): string
    {
        $res = self::callRoute('POST', '/api/v1/auth/login', ['username' => $username, 'password' => 'demo123']);
        $jwt = (string) ($res['body']['access_token'] ?? '');
        if ($jwt === '') {
            throw new \RuntimeException("Login as {$username} failed: " . json_encode($res));
        }
        return $jwt;
    }

    public static function runAll(): int
    {
        $tmpDb = sys_get_temp_dir() . '/bhumishield_badge_test_' . getmypid() . '.sqlite';
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
        echo "\n   PASS  Tests\\Feature\\ListingBadgeDerivationTest (Finding F16)\n";

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

        echo "\n  Listing Badge Derivation Tests:    {$passed} passed, {$failed} failed (" . count($methods) . " total)\n\n";
        @unlink($tmpDb);
        return $failed;
    }

    /**
     * Pick a plot id that has NOT been claimed by any seeded listing, so the
     * test can attach a fresh listing to it without colliding with the
     * plot_id UNIQUE constraint.
     */
    private static function pickUnlistedPlot(): int
    {
        $row = DB::selectOne(
            "SELECT p.id FROM plots p
             LEFT JOIN listings l ON l.plot_id = p.id
             WHERE l.id IS NULL
             ORDER BY p.id ASC LIMIT 1"
        );
        if (!$row) {
            throw new \RuntimeException('No unlisted plot available in seed data');
        }
        return (int) $row['id'];
    }

    /**
     * F16.1: a listing on a plot with NO field reports must derive a
     * NEEDS_REVIEW badge — not the hard-coded VERIFIED_CLEAR.
     */
    public static function test_01_listing_on_unverified_plot_gets_needs_review(): void
    {
        $plotId = self::pickUnlistedPlot();
        $jwt = self::loginAs('citizen');
        $res = self::callRoute('POST', '/api/v1/listings', [
            'plot_id' => $plotId,
            'asking_price_bdt' => 2500000,
            'area_decimal' => 12.0,
            'description_bn' => 'পরীক্ষামূলক বিজ্ঞাপন',
            'description_en' => 'Test listing',
        ], $jwt);
        self::assertTrue(in_array($res['status'], [200, 201], true),
            'Listing must be accepted; got ' . $res['status'] . ' body=' . json_encode($res['body']));
        $badge = (string) ($res['body']['listing']['verification_badge']
                        ?? $res['body']['verification_badge']
                        ?? '');
        self::assertEqual('NEEDS_REVIEW', $badge,
            'A plot with zero field reports must produce NEEDS_REVIEW');
    }

    /**
     * F16.2: a listing on a plot with a FLAGGED field report (DISPUTED
     * boundary) must derive a FLAGGED badge.
     */
    public static function test_02_listing_on_disputed_plot_is_flagged(): void
    {
        $plotId = self::pickUnlistedPlot();
        $plot = DB::selectOne('SELECT * FROM plots WHERE id = ?', [$plotId]);
        $fvo = DB::selectOne("SELECT id FROM users WHERE username = 'fvo_savar' LIMIT 1");
        $code = 'FR-' . gmdate('Ymd-His') . '-' . random_int(100, 999);
        DB::insert(
            "INSERT INTO field_reports
                (report_code, plot_id, dag_no, possession_status, boundary_status, tax_status,
                 latitude, longitude, remarks_bn, signed_by_user_id, signed_by_username, signed_at, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)",
            [
                $code, $plotId, (string) $plot['dag_no'],
                'POSSESSED_BY_OWNER', 'DISPUTED', 'PAID',
                'boundary dispute under review',
                (int) $fvo['id'], 'fvo_savar', gmdate('c'), 'SUBMITTED', gmdate('c'),
            ]
        );

        $jwt = self::loginAs('citizen');
        $res = self::callRoute('POST', '/api/v1/listings', [
            'plot_id' => $plotId,
            'asking_price_bdt' => 3000000,
            'area_decimal' => 10.0,
            'description_bn' => 'পতাকাঙ্কিত প্লট পরীক্ষা',
            'description_en' => 'Disputed plot listing test',
        ], $jwt);
        self::assertTrue(in_array($res['status'], [200, 201], true),
            'Listing must be accepted; got ' . $res['status'] . ' body=' . json_encode($res['body']));
        $badge = (string) ($res['body']['listing']['verification_badge']
                        ?? $res['body']['verification_badge']
                        ?? '');
        self::assertEqual('FLAGGED', $badge, 'DISPUTED field report must produce FLAGGED');
    }

    /**
     * F16.3: a listing on a plot with a CLEAN field report (boundary
     * INTACT) must derive a VERIFIED_CLEAR badge.
     */
    public static function test_03_listing_on_clean_plot_is_verified_clear(): void
    {
        $plotId = self::pickUnlistedPlot();
        $plot = DB::selectOne('SELECT * FROM plots WHERE id = ?', [$plotId]);
        $fvo = DB::selectOne("SELECT id FROM users WHERE username = 'fvo_savar' LIMIT 1");
        $code = 'FR-' . gmdate('Ymd-His') . '-' . random_int(100, 999);
        DB::insert(
            "INSERT INTO field_reports
                (report_code, plot_id, dag_no, possession_status, boundary_status, tax_status,
                 latitude, longitude, remarks_bn, signed_by_user_id, signed_by_username, signed_at, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)",
            [
                $code, $plotId, (string) $plot['dag_no'],
                'POSSESSED_BY_OWNER', 'INTACT', 'PAID',
                'clean field report',
                (int) $fvo['id'], 'fvo_savar', gmdate('c'), 'SUBMITTED', gmdate('c'),
            ]
        );

        $jwt = self::loginAs('citizen');
        $res = self::callRoute('POST', '/api/v1/listings', [
            'plot_id' => $plotId,
            'asking_price_bdt' => 2200000,
            'area_decimal' => 15.0,
            'description_bn' => 'নিষ্কণ্টক প্লট পরীক্ষা',
            'description_en' => 'Clean plot listing test',
        ], $jwt);
        self::assertTrue(in_array($res['status'], [200, 201], true),
            'Listing must be accepted; got ' . $res['status'] . ' body=' . json_encode($res['body']));
        $badge = (string) ($res['body']['listing']['verification_badge']
                        ?? $res['body']['verification_badge']
                        ?? '');
        self::assertEqual('VERIFIED_CLEAR', $badge, 'Clean field report must produce VERIFIED_CLEAR');
    }
}