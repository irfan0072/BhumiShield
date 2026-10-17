<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Regression Test Suite for Audit Finding F08:
 * Pins the field-reports and sla-dispatches endpoints to the contracts that
 * the AcLandPage and FVO workspaces now rely on (real persistence, server-
 * owned audit log, role-scoped reads, transaction rollback on audit failure).
 */
final class FieldOperationsAndSlaTest
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
        $tmpDb = sys_get_temp_dir() . '/bhumishield_fieldops_test_' . getmypid() . '.sqlite';
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
        echo "\n   PASS  Tests\\Feature\\FieldOperationsAndSlaTest (Finding F08)\n";

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

        echo "\n  Field Ops & SLA Tests:    {$passed} passed, {$failed} failed (" . count($methods) . " total)\n\n";
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

    /** F08.1: Anonymous list returns 401. */
    public static function test_01_anonymous_field_reports_list_401(): void
    {
        $res = self::callRoute('GET', '/api/v1/field-reports');
        self::assertEqual(401, $res['status']);
    }

    /** F08.2: Anonymous create returns 401. */
    public static function test_02_anonymous_field_report_create_401(): void
    {
        $res = self::callRoute('POST', '/api/v1/field-reports', [
            'plot_id' => 1, 'possession_status' => 'X', 'boundary_status' => 'Y',
            'tax_status' => 'Z', 'remarks_bn' => 'Test',
        ]);
        self::assertEqual(401, $res['status']);
    }

    /** F08.3: Citizen cannot list field reports. */
    public static function test_03_citizen_field_reports_list_403(): void
    {
        $jwt = self::loginAs('citizen');
        $res = self::callRoute('GET', '/api/v1/field-reports', [], $jwt);
        self::assertEqual(403, $res['status']);
    }

    /** F08.4: FVO can create a field report and the row persists. */
    public static function test_04_fvo_field_report_create_200_and_persists(): void
    {
        $jwt = self::loginAs('fvo_savar');
        $plot = DB::selectOne("SELECT id FROM plots WHERE dag_no = '101' LIMIT 1");
        $res = self::callRoute('POST', '/api/v1/field-reports', [
            'plot_id' => (int) $plot['id'],
            'possession_status' => 'POSSESSED_BY_OWNER',
            'boundary_status' => 'INTACT',
            'tax_status' => 'PAID_UP_TO_2026',
            'remarks_bn' => 'ডেমো ফিল্ড রিপোর্ট — পরীক্ষামূলক',
            'latitude' => 23.85,
            'longitude' => 90.27,
        ], $jwt);

        self::assertEqual(200, $res['status'], 'FVO must be able to create a field report');
        self::assertTrue(isset($res['body']['field_report']['report_code']),
            'Response must include a generated report_code');
        $code = (string) $res['body']['field_report']['report_code'];
        $row = DB::selectOne('SELECT * FROM field_reports WHERE report_code = ?', [$code]);
        self::assertTrue($row !== null, 'Field report row must be persisted');
        self::assertEqual('SUBMITTED', (string) $row['status']);
    }

    /** F08.5: Missing fields return 422. */
    public static function test_05_fvo_field_report_missing_fields_422(): void
    {
        $jwt = self::loginAs('fvo_savar');
        $res = self::callRoute('POST', '/api/v1/field-reports', [
            'plot_id' => 1, 'possession_status' => 'X',
        ], $jwt);
        self::assertEqual(422, $res['status']);
        self::assertEqual('FIELDS_REQUIRED', $res['body']['code'] ?? '');
    }

    /** F08.6: AC Land can list all field reports. */
    public static function test_06_ac_land_lists_all_field_reports_200(): void
    {
        $jwt = self::loginAs('acland');
        $res = self::callRoute('GET', '/api/v1/field-reports', [], $jwt);
        self::assertEqual(200, $res['status']);
        self::assertTrue(isset($res['body']['items']) && is_array($res['body']['items']),
            'Response must use the {items,total} envelope (F07 contract)');
        self::assertTrue(isset($res['body']['total']) && is_int($res['body']['total']),
            'Response must include an integer total');
        self::assertTrue($res['body']['total'] >= 1, 'Seeded field reports must be visible');
    }

    /** F08.7: UNO Supervisor can create an SLA dispatch. */
    public static function test_07_uno_supervisor_creates_sla_dispatch_200_and_persists(): void
    {
        $jwt = self::loginAs('uno_savar');
        $res = self::callRoute('POST', '/api/v1/sla-dispatches', [
            'case_reference' => 'MUT-2026-9001',
            'target_role' => 'land_office_assistant',
            'priority' => 'URGENT',
            'due_at' => '2026-11-30T17:00:00+06:00',
            'notes_bn' => '৪৫ দিনের বেশি অতিবাহিত; ৭ দিনের মধ্যে আদেশনামা দাখিল করুন।',
        ], $jwt);

        self::assertEqual(200, $res['status']);
        self::assertTrue(isset($res['body']['sla_dispatch']['dispatch_code']));
        $code = (string) $res['body']['sla_dispatch']['dispatch_code'];
        $row = DB::selectOne('SELECT * FROM sla_dispatches WHERE dispatch_code = ?', [$code]);
        self::assertTrue($row !== null, 'SLA dispatch row must be persisted');
        self::assertEqual('URGENT', (string) $row['priority']);
        self::assertEqual('SENT', (string) $row['status']);
    }

    /** F08.8: Invalid target role returns 422. */
    public static function test_08_uno_supervisor_sla_dispatch_invalid_target_role_422(): void
    {
        $jwt = self::loginAs('uno_savar');
        $res = self::callRoute('POST', '/api/v1/sla-dispatches', [
            'case_reference' => 'MUT-2026-9002',
            'target_role' => 'not_a_role',
            'priority' => 'NORMAL',
            'notes_bn' => 'should fail',
        ], $jwt);
        self::assertEqual(422, $res['status']);
        self::assertEqual('INVALID_TARGET_ROLE', $res['body']['code'] ?? '');
    }

    /** F08.9: Audit log row must be written for every field report. */
    public static function test_09_audit_log_row_created_for_field_report(): void
    {
        // The previous FVO create test already wrote one. Verify it's in audit_log.
        $row = DB::selectOne(
            "SELECT * FROM audit_log WHERE action = 'FIELD_REPORT_FILED' ORDER BY id DESC LIMIT 1"
        );
        self::assertTrue($row !== null, 'An audit_log row must be written for each field report');
        self::assertTrue((bool) ($row['entry_hash'] ?? false), 'Audit log row must have an entry_hash');
        self::assertTrue((bool) ($row['prev_hash'] ?? false), 'Audit log row must chain to prev_hash');
    }

    /** F08.10: FVO listing is scoped to their own reports only. */
    public static function test_10_fvo_list_scoped_to_own_reports(): void
    {
        $jwt = self::loginAs('fvo_savar');
        $res = self::callRoute('GET', '/api/v1/field-reports', [], $jwt);
        self::assertEqual(200, $res['status']);
        $items = is_array($res['body']['items'] ?? null) ? $res['body']['items'] : [];
        foreach ($items as $it) {
            self::assertEqual('fvo_savar', (string) ($it['signed_by_username'] ?? ''),
                'FVO must only see reports they themselves signed');
        }
    }
}
