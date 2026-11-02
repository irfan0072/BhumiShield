<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Contracts\NidVerificationProvider;
use App\Http\Controllers\Api\V1\NidVerificationController;
use App\Services\JwtAuthService;
use App\Services\ProviderManager;
use App\Services\TransferStateMachine;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Feature Test Suite for Milestone 1:
 * Realistic NID Verification & Provider Boundary (Requirement R1, Features 1 to 9).
 */
final class NidValidationAndSimulationTest
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
        $tmpDb = sys_get_temp_dir() . '/bhumishield_nid_test_' . getmypid() . '.sqlite';
        putenv("BHUMISHIELD_TEST_DB={$tmpDb}");
        $_ENV['BHUMISHIELD_TEST_DB'] = $tmpDb;
        putenv('SIMULATE_GATEWAY_LATENCY=0');
        $_ENV['SIMULATE_GATEWAY_LATENCY'] = '0';
        DB::resetConnection();
        (new DatabaseSeeder())->run(true);

        $methods = array_values(array_filter(
            get_class_methods(self::class),
            fn(string $m) => str_starts_with($m, 'test_')
        ));

        $passed = 0;
        $failed = 0;
        echo "\n   PASS  Tests\\Feature\\NidValidationAndSimulationTest (Realistic NID & Porichoy Boundary)\n";

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

        echo "\n  NID Validation Tests:    {$passed} passed, {$failed} failed (" . count($methods) . " total)\n\n";
        @unlink($tmpDb);
        return $failed === 0 ? 0 : 1;
    }

    public static function test_01_nid_format_regex_strict_validation(): void
    {
        $provider = ProviderManager::getNidProvider();

        // 9-digit: invalid format
        $res9 = $provider->verifyNid('123456789', '1985-05-15');
        self::assertEqual(false, $res9['verified']);
        self::assertEqual('INVALID_NID_FORMAT', $res9['code']);

        // 11-digit: invalid format
        $res11 = $provider->verifyNid('12345678901', '1985-05-15');
        self::assertEqual(false, $res11['verified']);
        self::assertEqual('INVALID_NID_FORMAT', $res11['code']);

        // 12-digit: invalid format
        $res12 = $provider->verifyNid('123456789012', '1985-05-15');
        self::assertEqual(false, $res12['verified']);
        self::assertEqual('INVALID_NID_FORMAT', $res12['code']);

        // Non-digits: invalid format
        $resAlpha = $provider->verifyNid('990000100A', '1985-05-15');
        self::assertEqual(false, $resAlpha['verified']);
        self::assertEqual('INVALID_NID_FORMAT', $resAlpha['code']);

        // 10-digit smart format accepted for verification
        $res10 = $provider->verifyNid('9900001001', '1985-05-15');
        self::assertTrue($res10['verified']);
        self::assertEqual('MATCHED', $res10['code']);
    }

    public static function test_02_legacy_13_digit_nid_normalization_with_birth_year(): void
    {
        $provider = ProviderManager::getNidProvider();

        // 17-digit seeded record: 19852694123456789, DOB: 1985-05-12
        // Submitting 13-digit legacy: 2694123456789 + DOB: 1985-05-12
        $res13 = $provider->verifyNid('2694123456789', '1985-05-12');
        self::assertTrue($res13['verified'], '13-digit NID must normalize with birth year and match 17-digit record');
        self::assertEqual('19852694123456789', $res13['normalized_nid']);
        self::assertEqual('MATCHED', $res13['code']);

        // If DOB birth year does not match record
        $res13WrongDob = $provider->verifyNid('2694123456789', '1990-05-12');
        self::assertEqual(false, $res13WrongDob['verified']);
    }

    public static function test_03_17_digit_legacy_nid_birth_year_consistency_check(): void
    {
        $provider = ProviderManager::getNidProvider();

        // 17-digit starting with 1985, but DOB has 1990
        $resMismatch = $provider->verifyNid('19852694123456789', '1990-05-12');
        self::assertEqual(false, $resMismatch['verified'], 'Mismatch between NID birth year and DOB must fail');
        self::assertEqual('DOB_MISMATCH', $resMismatch['code']);

        // 17-digit with matching birth year
        $resMatch = $provider->verifyNid('19852694123456789', '1985-05-12');
        self::assertTrue($resMatch['verified']);
        self::assertEqual('MATCHED', $resMatch['code']);
    }

    public static function test_04_fail_closed_handling_for_unseeded_nid(): void
    {
        $provider = ProviderManager::getNidProvider();

        // Unseeded 10-digit NID
        $resNotFound = $provider->verifyNid('9999999999', '1985-05-15');
        self::assertEqual(false, $resNotFound['verified']);
        self::assertEqual('NID_NOT_FOUND', $resNotFound['code']);

        // Verify sim_persons was NOT auto-populated (no backdoor auto-insert)
        $simCheck = DB::selectOne('SELECT * FROM sim_persons WHERE nid = ?', ['9999999999']);
        self::assertTrue(empty($simCheck), 'Unseeded NID must never be auto-inserted into sim_persons');
    }

    public static function test_05_dob_and_name_matching_with_normalization(): void
    {
        $provider = ProviderManager::getNidProvider();

        // Matching name in English
        $resEn = $provider->verifyNid('19852694123456789', '1985-05-12', 'Md. Rafiqul Islam');
        self::assertTrue($resEn['verified']);

        // Matching name with whitespace & case difference
        $resCase = $provider->verifyNid('19852694123456789', '1985-05-12', '  rafiqul islam  ');
        self::assertTrue($resCase['verified']);

        // Matching name in Bangla
        $resBn = $provider->verifyNid('19852694123456789', '1985-05-12', 'মো. রফিকুল ইসলাম');
        self::assertTrue($resBn['verified']);

        // Mismatched name
        $resWrongName = $provider->verifyNid('19852694123456789', '1985-05-12', 'Kamrul Hasan');
        self::assertEqual(false, $resWrongName['verified']);
        self::assertEqual('NAME_MISMATCH', $resWrongName['code']);
    }

    public static function test_06_http_nid_verify_endpoint_and_otp_dispatch(): void
    {
        $response = NidVerificationController::verify([
            'nid' => '19852694123456789',
            'dob' => '1985-05-12',
            'name' => 'Md. Rafiqul Islam',
        ]);

        self::assertEqual(200, $response['status']);
        self::assertTrue($response['success']);
        self::assertEqual('OTP_REQUIRED', $response['code']);
        self::assertTrue(!empty($response['session_token']), 'Session token must be generated');
        self::assertTrue(!empty($response['masked_phone']), 'Masked phone must be returned');
        self::assertEqual(180, $response['expires_in']);

        // Check that challenge was inserted into sim_otp_challenges
        $challenge = DB::selectOne('SELECT * FROM sim_otp_challenges WHERE session_token = ? LIMIT 1', [$response['session_token']]);
        self::assertTrue(!empty($challenge), 'Challenge record must be persisted in database');
        self::assertEqual('19852694123456789', $challenge['nid']);
        self::assertEqual(0, (int) $challenge['attempts']);

        // Check that SMS outbox received the OTP
        $outbox = DB::selectOne('SELECT * FROM sim_sms_outbox WHERE otp_code = ? ORDER BY id DESC LIMIT 1', [$challenge['otp_code']]);
        self::assertTrue(!empty($outbox), 'SMS Outbox must record dispatched OTP message');
        self::assertTrue(str_contains($outbox['message'], $challenge['otp_code']));
    }

    public static function test_07_http_nid_verify_otp_lifecycle_and_user_verification(): void
    {
        // 1. Initiate challenge
        $verifyRes = NidVerificationController::verify([
            'nid' => '9900001001',
            'dob' => '1985-05-15',
        ]);
        $sessionToken = $verifyRes['session_token'];
        $challenge = DB::selectOne('SELECT * FROM sim_otp_challenges WHERE session_token = ? LIMIT 1', [$sessionToken]);
        $realOtp = (string) $challenge['otp_code'];

        // 2. Wrong OTP attempt 1
        $caught = false;
        try {
            NidVerificationController::verifyOtp([
                'session_token' => $sessionToken,
                'otp_code' => '000000',
            ]);
        } catch (\Throwable $e) {
            $caught = true;
            $data = json_decode($e->getMessage(), true);
            self::assertEqual(422, $data['status']);
            self::assertEqual('INVALID_OTP', $data['code']);
            self::assertEqual(2, $data['attempts_remaining']);
        }
        self::assertTrue($caught, 'Wrong OTP must be rejected');

        // 3. Correct OTP verification for user citizen
        $otpRes = NidVerificationController::verifyOtp([
            'session_token' => $sessionToken,
            'otp_code' => $realOtp,
            'username' => 'citizen',
        ]);

        self::assertEqual(200, $otpRes['status']);
        self::assertTrue($otpRes['verified']);
        self::assertEqual(1, $otpRes['is_identity_verified']);

        // 4. Verify user was updated in database
        $user = DB::selectOne("SELECT * FROM users WHERE username = 'citizen'");
        self::assertEqual(1, (int) $user['is_identity_verified'], 'User is_identity_verified must be set to 1');
        self::assertEqual('9900001001', (string) $user['nid']);

        // 5. Reusing verified OTP must be rejected
        $caughtReplay = false;
        try {
            NidVerificationController::verifyOtp([
                'session_token' => $sessionToken,
                'otp_code' => $realOtp,
            ]);
        } catch (\Throwable $e) {
            $caughtReplay = true;
            $data = json_decode($e->getMessage(), true);
            self::assertEqual('OTP_ALREADY_USED', $data['code']);
        }
        self::assertTrue($caughtReplay, 'Replay of used OTP must fail');
    }

    public static function test_08_transfer_state_machine_fails_closed_without_buyer_fallback(): void
    {
        // Citizen 9900001001 initiates transfer without valid buyer NID
        $user = DB::selectOne("SELECT * FROM users WHERE username = 'citizen'");

        // Missing buyer_nid
        $caughtMissing = false;
        try {
            TransferStateMachine::createTransfer([
                'plot_code' => 'PLT-DHK-SAV-0001',
                'transfer_area_decimal' => 2.0,
                'proposed_price_bdt' => 500000,
                'deed_type' => 'SALE',
            ], $user);
        } catch (\Throwable $e) {
            $caughtMissing = true;
            $data = json_decode($e->getMessage(), true);
            self::assertEqual('BUYER_NID_REQUIRED', $data['code']);
        }
        self::assertTrue($caughtMissing, 'Missing buyer NID must fail closed with BUYER_NID_REQUIRED');

        // Non-existent buyer_nid
        $caughtUnknown = false;
        try {
            TransferStateMachine::createTransfer([
                'plot_code' => 'PLT-DHK-SAV-0001',
                'transfer_area_decimal' => 2.0,
                'proposed_price_bdt' => 500000,
                'deed_type' => 'SALE',
                'buyer_nid' => '9999999999',
            ], $user);
        } catch (\Throwable $e) {
            $caughtUnknown = true;
            $data = json_decode($e->getMessage(), true);
            self::assertEqual('BUYER_NID_NOT_FOUND', $data['code']);
        }
        self::assertTrue($caughtUnknown, 'Unknown buyer NID must fail closed without fallback');
    }
}
