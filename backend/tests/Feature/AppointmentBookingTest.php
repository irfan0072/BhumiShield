<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Regression Test Suite for Audit Finding F10:
 * Verifies that the office appointment booking endpoint actually persists a
 * record, returns the appointment code in the canonical APT-YYYY-NNNNN
 * format, and now rejects double-booking with a structured 409.
 */
final class AppointmentBookingTest
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
        $tmpDb = sys_get_temp_dir() . '/bhumishield_appointment_test_' . getmypid() . '.sqlite';
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
        echo "\n   PASS  Tests\\Feature\\AppointmentBookingTest (Finding F10)\n";

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

        echo "\n  Appointment Booking Tests:    {$passed} passed, {$failed} failed (" . count($methods) . " total)\n\n";
        @unlink($tmpDb);
        return $failed;
    }

    /**
     * F10.1: A valid booking must return 200 with the canonical appointment code
     * and a persisted DB row.
     */
    public static function test_01_valid_booking_returns_appointment_code_and_persists(): void
    {
        $office = DB::selectOne("SELECT id FROM offices WHERE office_type = 'registry' AND is_active = 1 LIMIT 1");
        self::assertTrue($office !== null, 'At least one registry office must be seeded');

        $res = self::callRoute('POST', '/api/v1/appointments', [
            'office_id' => (int) $office['id'],
            'citizen_name_bn' => 'মো. টেস্ট ইউজার',
            'citizen_phone' => '01700000000',
            'slot_date' => '2026-10-25',
            'slot_time' => '11:00 AM',
            'service_type' => 'GENERAL_INQUIRY',
        ]);

        self::assertEqual(200, $res['status'], 'Valid booking must return 200');
        self::assertTrue(isset($res['body']['appointment']['appointment_code']),
            'Response must include appointment.appointment_code');
        $code = (string) $res['body']['appointment']['appointment_code'];
        self::assertTrue((bool) preg_match('/^APT-2026-\d{4,6}$/', $code),
            "Appointment code must match APT-2026-NNNNN, got [{$code}]");

        $row = DB::selectOne('SELECT * FROM appointments WHERE appointment_code = ?', [$code]);
        self::assertTrue($row !== null, 'Booking row must be persisted to DB');
        self::assertEqual('BOOKED', (string) $row['status'], 'Persisted status must be BOOKED');
    }

    /**
     * F10.2: An unknown office must return 404 OFFICE_NOT_FOUND.
     */
    public static function test_02_unknown_office_returns_404(): void
    {
        $res = self::callRoute('POST', '/api/v1/appointments', [
            'office_id' => 999999,
            'citizen_name_bn' => 'মো. টেস্ট',
            'citizen_phone' => '01700000000',
            'slot_date' => '2026-10-25',
        ]);
        self::assertEqual(404, $res['status']);
        self::assertEqual('OFFICE_NOT_FOUND', $res['body']['code'] ?? '');
    }

    /**
     * F10.3: A missing citizen name must return 422 NAME_REQUIRED.
     */
    public static function test_03_missing_name_returns_422(): void
    {
        $office = DB::selectOne("SELECT id FROM offices WHERE office_type = 'registry' AND is_active = 1 LIMIT 1");
        $res = self::callRoute('POST', '/api/v1/appointments', [
            'office_id' => (int) $office['id'],
            'citizen_name_bn' => '',
            'citizen_phone' => '01700000000',
            'slot_date' => '2026-10-26',
        ]);
        self::assertEqual(422, $res['status']);
        self::assertEqual('NAME_REQUIRED', $res['body']['code'] ?? '');
    }

    /**
     * F10.4: A missing phone must return 422 PHONE_REQUIRED.
     */
    public static function test_04_missing_phone_returns_422(): void
    {
        $office = DB::selectOne("SELECT id FROM offices WHERE office_type = 'registry' AND is_active = 1 LIMIT 1");
        $res = self::callRoute('POST', '/api/v1/appointments', [
            'office_id' => (int) $office['id'],
            'citizen_name_bn' => 'মো. টেস্ট',
            'citizen_phone' => '',
            'slot_date' => '2026-10-27',
        ]);
        self::assertEqual(422, $res['status']);
        self::assertEqual('PHONE_REQUIRED', $res['body']['code'] ?? '');
    }

    /**
     * F10.5: A missing date must return 422 DATE_REQUIRED.
     */
    public static function test_05_missing_date_returns_422(): void
    {
        $office = DB::selectOne("SELECT id FROM offices WHERE office_type = 'registry' AND is_active = 1 LIMIT 1");
        $res = self::callRoute('POST', '/api/v1/appointments', [
            'office_id' => (int) $office['id'],
            'citizen_name_bn' => 'মো. টেস্ট',
            'citizen_phone' => '01700000000',
            'slot_date' => '',
        ]);
        self::assertEqual(422, $res['status']);
        self::assertEqual('DATE_REQUIRED', $res['body']['code'] ?? '');
    }

    /**
     * F10.6: The new double-booking guard must return 409 APPOINTMENT_CONFLICT
     * when the same citizen re-books the same office on the same date.
     */
    public static function test_06_double_booking_same_office_and_date_returns_409(): void
    {
        $office = DB::selectOne("SELECT id FROM offices WHERE office_type = 'service_point' AND is_active = 1 LIMIT 1");
        self::assertTrue($office !== null, 'At least one service_point office must be seeded');

        $payload = [
            'office_id' => (int) $office['id'],
            'citizen_name_bn' => 'মো. টেস্ট',
            'citizen_phone' => '01700999999',
            'citizen_nid' => '9900001099',
            'slot_date' => '2026-11-15',
            'slot_time' => '10:00 AM',
        ];
        $first = self::callRoute('POST', '/api/v1/appointments', $payload);
        self::assertEqual(200, $first['status'], 'First booking must succeed');

        $second = self::callRoute('POST', '/api/v1/appointments', $payload);
        self::assertEqual(409, $second['status'], 'Duplicate booking must return 409');
        self::assertEqual('APPOINTMENT_CONFLICT', $second['body']['code'] ?? '');
    }

    /**
     * F10.7: The same citizen can book a different office on the same date
     * (no global conflict, only same-office-and-date is blocked).
     */
    public static function test_07_same_citizen_can_book_different_office_same_date(): void
    {
        $office1 = DB::selectOne("SELECT id FROM offices WHERE office_type = 'service_point' AND is_active = 1 LIMIT 1");
        $office2 = DB::selectOne("SELECT id FROM offices WHERE office_type = 'service_point' AND id != ? AND is_active = 1 LIMIT 1",
            [(int) $office1['id']]);
        if (!$office2) {
            // Fallback: try any other type
            $office2 = DB::selectOne("SELECT id FROM offices WHERE id != ? AND is_active = 1 LIMIT 1", [(int) $office1['id']]);
        }
        self::assertTrue($office2 !== null, 'Need at least 2 active offices for this test');

        $base = [
            'citizen_name_bn' => 'মো. টেস্ট',
            'citizen_phone' => '01700888888',
            'citizen_nid' => '9900001088',
            'slot_date' => '2026-12-01',
        ];
        $r1 = self::callRoute('POST', '/api/v1/appointments', $base + ['office_id' => (int) $office1['id']]);
        $r2 = self::callRoute('POST', '/api/v1/appointments', $base + ['office_id' => (int) $office2['id']]);
        self::assertEqual(200, $r1['status']);
        self::assertEqual(200, $r2['status'], 'Booking a different office on the same date must succeed');
    }
}
