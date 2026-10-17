<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Services\JwtAuthService;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Regression Test Suite for Audit Finding F07:
 * Verifies that list endpoints return the {items, total} envelope so the frontend
 * `unwrapList<T>(res)` helper can consume them without crashing on `.map()`.
 *
 * The companion unwrapList helper in `frontend/src/api/client.ts` is a thin
 * runtime guard; these tests pin the wire shape that the guard relies on.
 */
final class UiEnvelopeAdapterTest
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
        $tmpDb = sys_get_temp_dir() . '/bhumishield_ui_envelope_test_' . getmypid() . '.sqlite';
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
        echo "\n   PASS  Tests\\Feature\\UiEnvelopeAdapterTest (Finding F07)\n";

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

        echo "\n  UI Envelope Tests:    {$passed} passed, {$failed} failed (" . count($methods) . " total)\n\n";
        @unlink($tmpDb);
        return $failed;
    }

    private static function loginAs(string $username, string $password = 'demo123'): string
    {
        $res = self::callRoute('POST', '/api/v1/auth/login', ['username' => $username, 'password' => $password]);
        $jwt = $res['body']['access_token'] ?? ($res['body']['token'] ?? '');
        if (empty($jwt)) {
            throw new \RuntimeException("Login as {$username} failed: " . json_encode($res));
        }
        return $jwt;
    }

    /**
     * F07.1: AC Land's appeals tab must receive a {items, total} envelope from
     * GET /appeals. Without this shape, the SubRegistrarPage/AcLandPage .map() call
     * crashes with "onboardingBatches.map is not a function".
     */
    public static function test_01_acland_appeals_returns_items_envelope(): void
    {
        $jwt = self::loginAs('acland');
        $res = self::callRoute('GET', '/api/v1/appeals', [], $jwt);

        self::assertEqual(200, $res['status'], 'GET /appeals as AC Land must return 200');
        self::assertTrue(is_array($res['body']), 'Response body must be an array');
        self::assertTrue(isset($res['body']['items']) && is_array($res['body']['items']),
            'Response must include an "items" array — frontend unwrapList relies on this');
        self::assertTrue(isset($res['body']['total']) && is_int($res['body']['total']),
            'Response must include an integer "total" for paginated UIs');
    }

    /**
     * F07.2: Registrar's onboarding-batches tab must receive a {items, total} envelope.
     */
    public static function test_02_registrar_onboarding_batches_returns_items_envelope(): void
    {
        $jwt = self::loginAs('registrar');
        $res = self::callRoute('GET', '/api/v1/onboarding/batches', [], $jwt);

        self::assertEqual(200, $res['status'], 'GET /onboarding/batches as registrar must return 200');
        self::assertTrue(isset($res['body']['items']) && is_array($res['body']['items']),
            'Response must include an "items" array');
        self::assertTrue(isset($res['body']['total']) && is_int($res['body']['total']),
            'Response must include an integer "total"');
        // The seeder provisions at least one onboarding batch so the list is non-empty.
        self::assertTrue($res['body']['total'] >= 1, 'Seeded onboarding batches must be visible to registrar');
    }

    /**
     * F07.3: Public offices directory must return the {items, total} envelope.
     */
    public static function test_03_offices_returns_items_envelope(): void
    {
        $res = self::callRoute('GET', '/api/v1/offices');

        self::assertEqual(200, $res['status'], 'Anonymous GET /offices must return 200');
        self::assertTrue(isset($res['body']['items']) && is_array($res['body']['items']),
            'Response must include an "items" array');
        self::assertTrue(isset($res['body']['total']) && is_int($res['body']['total']),
            'Response must include an integer "total"');
        self::assertTrue($res['body']['total'] >= 1, 'Seeded offices must be visible');
    }

    /**
     * F07.4: Public notices directory must also follow the envelope shape.
     */
    public static function test_04_notices_returns_items_envelope(): void
    {
        $res = self::callRoute('GET', '/api/v1/notices');

        self::assertEqual(200, $res['status'], 'Anonymous GET /notices must return 200');
        self::assertTrue(isset($res['body']['items']) && is_array($res['body']['items']),
            'Response must include an "items" array');
        self::assertTrue(isset($res['body']['total']) && is_int($res['body']['total']),
            'Response must include an integer "total"');
    }

    /**
     * F07.5: Public listings marketplace must also follow the envelope shape.
     */
    public static function test_05_listings_returns_items_envelope(): void
    {
        $res = self::callRoute('GET', '/api/v1/listings');

        self::assertEqual(200, $res['status'], 'Anonymous GET /listings must return 200');
        self::assertTrue(isset($res['body']['items']) && is_array($res['body']['items']),
            'Response must include an "items" array');
        self::assertTrue(isset($res['body']['total']) && is_int($res['body']['total']),
            'Response must include an integer "total"');
    }
}
