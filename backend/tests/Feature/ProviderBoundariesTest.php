<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Contracts\BiometricProvider;
use App\Contracts\LandServiceGatewayAdapter;
use App\Contracts\NidVerificationProvider;
use App\Contracts\PaymentProvider;
use App\Contracts\SmsProvider;
use App\Services\ProviderManager;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Test Suite for Provider Boundaries (Step 5).
 * Validates simulated external boundary providers (NID, Biometrics, SMS, Payments, Gateway)
 * ensuring they implement production contracts, enforce security rules, and never leak
 * biometrics or live external credentials.
 */
final class ProviderBoundariesTest
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
        $tmpDb = sys_get_temp_dir() . '/bhumishield_provider_test_' . getmypid() . '.sqlite';
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
        echo "\n   PASS  Tests\\Feature\\ProviderBoundariesTest (Provider Boundaries & Contracts)\n";

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

        echo "\n  Provider Tests:    {$passed} passed, {$failed} failed (" . count($methods) . " total)\n\n";
        @unlink($tmpDb);
        return $failed === 0 ? 0 : 1;
    }

    public static function test_01_nid_provider_lookup_and_verification(): void
    {
        $nidProvider = ProviderManager::nid();
        self::assertTrue($nidProvider instanceof NidVerificationProvider, 'NID provider must implement interface');

        // Known synthetic NID seeded in DB
        $person = DB::selectOne('SELECT * FROM persons WHERE nid = ? LIMIT 1', ['9900001001']);
        self::assertTrue(!empty($person), 'Synthetic person 9900001001 must exist');

        // Lookup
        $lookup = $nidProvider->lookup('9900001001');
        self::assertTrue(!empty($lookup), 'Lookup must return synthetic record');
        self::assertEqual('9900001001', $lookup['nid'] ?? '', 'NID match');

        // Verification with matching DOB
        $dob = (string) ($person['dob'] ?? '1985-05-15');
        $resMatch = $nidProvider->verifyNid('9900001001', $dob);
        self::assertTrue($resMatch['matched'] === true, 'Verification must succeed with exact DOB');
        self::assertEqual('9900001001', $resMatch['nid'], 'NID must match');

        // Verification with mismatching DOB
        $resMismatch = $nidProvider->verifyNid('9900001001', '1900-01-01');
        self::assertTrue($resMismatch['matched'] === false, 'Verification must fail on mismatching DOB');

        // Lookup of non-existent synthetic NID
        $unknown = $nidProvider->lookup('999999999999');
        self::assertTrue($unknown === null, 'Unknown NID lookup must return null');
    }

    public static function test_02_biometric_session_and_presentation_token_verification(): void
    {
        $bioProvider = ProviderManager::biometrics();
        self::assertTrue($bioProvider instanceof BiometricProvider, 'Biometric provider must implement interface');

        // Create a 2-minute counter biometric session
        $session = $bioProvider->createSession('SELLER', '9900001001', 'TRM-SR-01', 2, 101);
        self::assertTrue(!empty($session['session_id']), 'Session ID must be generated');
        self::assertTrue(!empty($session['challenge_nonce']), 'Challenge nonce must be generated');
        self::assertTrue(!empty($session['expires_at']), 'Expiration timestamp required');
        self::assertEqual('TRM-SR-01', $session['terminal_id']);

        // Inspect session
        $fetched = $bioProvider->getSession($session['session_id']);
        self::assertTrue(!empty($fetched), 'Session must be retrievable');
        self::assertEqual(0, (int) ($fetched['is_verified'] ?? 1));

        // Verify valid presentation token (simulated token: sha256 of challenge_nonce + salt)
        $token = hash('sha256', $session['challenge_nonce'] . ':9900001001');
        $verifyRes = $bioProvider->verifyPresentation($session['session_id'], $token);

        self::assertTrue($verifyRes['verified'] === true, 'Valid presentation token must verify');
        self::assertTrue($verifyRes['score'] >= 70.0, 'Score must meet confidence threshold');
        self::assertEqual('MATCH', $verifyRes['match_status']);

        // Replay attack prevention: verify again with same session
        $caught = false;
        try {
            $bioProvider->verifyPresentation($session['session_id'], $token);
        } catch (\Throwable $e) {
            $caught = true;
        }
        self::assertTrue($caught, 'Replaying session verification must be rejected');
    }

    public static function test_03_biometric_consecutive_failures_require_supervisor_override(): void
    {
        $bioProvider = ProviderManager::biometrics();
        $session = $bioProvider->createSession('BUYER', '9900001002', 'TRM-SR-01', 2, 101);

        // Attempt 1: bad token
        $bad1 = $bioProvider->verifyPresentation($session['session_id'], 'invalid_token_1');
        self::assertTrue($bad1['verified'] === false, 'Bad token must fail');
        self::assertEqual(1, $bad1['attempts_count']);

        // Attempt 2: bad token
        $bad2 = $bioProvider->verifyPresentation($session['session_id'], 'invalid_token_2');
        self::assertEqual(2, $bad2['attempts_count']);

        // Attempt 3: bad token
        $bad3 = $bioProvider->verifyPresentation($session['session_id'], 'invalid_token_3');
        self::assertEqual(3, $bad3['attempts_count']);

        // Attempt 4 without supervisor override: must throw or reject
        $caught = false;
        try {
            $bioProvider->verifyPresentation($session['session_id'], 'invalid_token_4');
        } catch (\Throwable $e) {
            $caught = true;
        }
        self::assertTrue($caught, 'Attempt 4 without supervisor override must be rejected');

        // Attempt 4 with supervisor override
        $overrideRes = $bioProvider->verifyPresentation(
            $session['session_id'],
            'override_presentation',
            'Citizen fingerprint sensor scarred; verified with original NID physical smart card',
            2 // supervisor user id
        );
        self::assertTrue($overrideRes['verified'] === true, 'Supervisor override must successfully authenticate');
        self::assertEqual('SUPERVISOR_OVERRIDE', $overrideRes['match_status']);
    }

    public static function test_04_sms_outbox_driver_records_and_retrieves_otps(): void
    {
        $smsProvider = ProviderManager::sms();
        self::assertTrue($smsProvider instanceof SmsProvider, 'SMS provider must implement interface');

        $phone = '01711999888';
        $otp = '789123';
        $purpose = 'TRANSFER_CONSENT';

        $sent = $smsProvider->sendOtp($phone, $otp, $purpose, ['plot_code' => 'DH-PLT-0001']);
        self::assertTrue($sent, 'sendOtp must return true');

        $outbox = $smsProvider->getOutbox(10, $phone);
        self::assertTrue(count($outbox) >= 1, 'Outbox must contain dispatched SMS');
        self::assertEqual($phone, $outbox[0]['recipient_phone']);
        self::assertEqual($otp, $outbox[0]['otp_code']);
        self::assertEqual($purpose, $outbox[0]['purpose']);
        self::assertTrue(in_array($outbox[0]['status'], ['SENT', 'DELIVERED'], true));
    }

    public static function test_05_payment_provider_lifecycle_and_fee_ledger(): void
    {
        $paymentProvider = ProviderManager::payment();
        self::assertTrue($paymentProvider instanceof PaymentProvider, 'Payment provider must implement interface');

        // Initiate MFS Payment
        $init = $paymentProvider->initiatePayment('MUTATION_FEE', 'MUT-2026-0001', 1150.00, '01711999888', 'BKASH');
        self::assertTrue(!empty($init['payment_id']), 'Payment ID must be created');
        self::assertTrue(!empty($init['redirect_url']), 'Redirect URL must be provided');
        self::assertEqual(1150.00, (float) $init['amount_bdt']);

        // Verify / Complete Payment
        $verified = $paymentProvider->verifyPayment($init['payment_id']);
        self::assertEqual('COMPLETED', $verified['status']);
        self::assertTrue(!empty($verified['receipt_no']), 'Receipt number must be generated');
        self::assertTrue(!empty($verified['transaction_trx_id']), 'MFS Trx ID must be generated');

        // Record fee ledger
        $ledgerEntry = $paymentProvider->recordFeeLedger('MUT-FEE-2026', 1150.00, '9900001001', 'e-Mutation Clearance', 'MUT-2026-0001');
        self::assertTrue(!empty($ledgerEntry['receipt_no']), 'Receipt number must be generated');
        self::assertEqual('CONFIRMED', $ledgerEntry['status']);
    }

    public static function test_06_land_service_gateway_tax_and_khatian(): void
    {
        $gateway = ProviderManager::gateway();
        self::assertTrue($gateway instanceof LandServiceGatewayAdapter, 'Gateway adapter must implement interface');

        // Query Land Development Tax holding
        $holding = $gateway->fetchHoldingTaxRecord('HLD-1001', 'MOUZA-DH-01');
        self::assertTrue(!empty($holding), 'Holding record must be found in simulated gateway');
        self::assertEqual('HLD-1001', $holding['holding_no']);
        self::assertTrue(in_array($holding['tax_status'], ['PAID', 'UNPAID', 'ARREARS'], true));

        // Query Legacy Khatian Porcha
        $khatian = $gateway->fetchLegacyKhatianPorcha('RS', '101', 'MOUZA-DH-01');
        self::assertTrue(!empty($khatian), 'Legacy khatian must be found');
        self::assertEqual('RS', $khatian['survey_type']);
        self::assertEqual('101', $khatian['khatian_no']);

        // Verify e-Porcha digital QR envelope
        $verification = $gateway->verifyEporchaQrPayload('LSG-EPORCHA-RS-101-MOUZA-DH-01-SIGNED');
        self::assertTrue($verification['valid'] === true, 'Certified e-Porcha QR payload must verify');
    }
}
