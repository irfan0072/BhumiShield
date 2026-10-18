<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\BiometricProvider;
use App\Contracts\LandServiceGatewayAdapter;
use App\Contracts\NidVerificationProvider;
use App\Contracts\PaymentProvider;
use App\Contracts\SmsProvider;
use App\Simulators\OutboxSmsProvider;
use App\Simulators\SimulatedBiometricProvider;
use App\Simulators\SimulatedLandServiceGateway;
use App\Simulators\SimulatedNidProvider;
use App\Simulators\SimulatedPaymentProvider;

/**
 * Service Manager resolving provider drivers from environment settings.
 * Ensures the core application never couples directly to simulators.
 */
class ProviderManager
{
    private static ?NidVerificationProvider $nidProvider = null;
    private static ?BiometricProvider $biometricProvider = null;
    private static ?SmsProvider $smsProvider = null;
    private static ?PaymentProvider $paymentProvider = null;
    private static ?LandServiceGatewayAdapter $gatewayAdapter = null;

    public static function requireTestProvider(string $setting, string $testDriver = 'simulated'): void
    {
        $production = strtolower((string) env('APP_ENV', 'development')) === 'production';
        $testing = !$production && (
            strtolower((string) env('APP_ENV', '')) === 'testing' ||
            (bool) getenv('BHUMISHIELD_TEST_DB') ||
            (bool) env('ENABLE_SIMULATED_PROVIDERS', false)
        );
        $driver = strtolower((string) env($setting, $testing ? $testDriver : 'unconfigured'));
        if (!$testing || $driver !== $testDriver) {
            throw new \RuntimeException(json_encode(['status'=>503,'code'=>'PROVIDER_UNAVAILABLE','message_bn'=>'এই সেবার অনুমোদিত সংযোগ চালু নেই। সংশ্লিষ্ট কার্যালয়ের সহায়তা নিন।','message_en'=>'The authorized service connection is not configured. Contact the responsible office.'], JSON_UNESCAPED_UNICODE));
        }
    }

    public static function getNidProvider(): NidVerificationProvider
    {
        self::requireTestProvider('NID_DRIVER', 'simulated');
        if (self::$nidProvider === null) {
            $driver = strtolower((string) env('NID_DRIVER', 'simulated'));
            self::$nidProvider = match ($driver) {
                default => new SimulatedNidProvider(),
            };
        }
        return self::$nidProvider;
    }

    public static function nid(): NidVerificationProvider
    {
        return self::getNidProvider();
    }

    public static function getBiometricProvider(): BiometricProvider
    {
        self::requireTestProvider('BIOMETRIC_DRIVER', 'simulated');
        if (self::$biometricProvider === null) {
            $driver = strtolower((string) env('BIOMETRIC_DRIVER', 'simulated'));
            self::$biometricProvider = match ($driver) {
                default => new SimulatedBiometricProvider(),
            };
        }
        return self::$biometricProvider;
    }

    public static function biometrics(): BiometricProvider
    {
        return self::getBiometricProvider();
    }

    public static function getSmsProvider(): SmsProvider
    {
        self::requireTestProvider('SMS_DRIVER', 'outbox');
        if (self::$smsProvider === null) {
            $driver = strtolower((string) env('SMS_DRIVER', 'outbox'));
            self::$smsProvider = match ($driver) {
                default => new OutboxSmsProvider(),
            };
        }
        return self::$smsProvider;
    }

    public static function sms(): SmsProvider
    {
        return self::getSmsProvider();
    }

    public static function getPaymentProvider(): PaymentProvider
    {
        self::requireTestProvider('PAYMENT_DRIVER', 'simulated');
        if (self::$paymentProvider === null) {
            $driver = strtolower((string) env('PAYMENT_DRIVER', 'simulated'));
            self::$paymentProvider = match ($driver) {
                default => new SimulatedPaymentProvider(),
            };
        }
        return self::$paymentProvider;
    }

    public static function payment(): PaymentProvider
    {
        return self::getPaymentProvider();
    }

    public static function getGatewayAdapter(): LandServiceGatewayAdapter
    {
        self::requireTestProvider('GATEWAY_DRIVER', 'simulated');
        if (self::$gatewayAdapter === null) {
            $driver = strtolower((string) env('GATEWAY_DRIVER', 'simulated'));
            self::$gatewayAdapter = match ($driver) {
                default => new SimulatedLandServiceGateway(),
            };
        }
        return self::$gatewayAdapter;
    }

    public static function gateway(): LandServiceGatewayAdapter
    {
        return self::getGatewayAdapter();
    }

    public static function reset(): void
    {
        self::$nidProvider = null;
        self::$biometricProvider = null;
        self::$smsProvider = null;
        self::$paymentProvider = null;
        self::$gatewayAdapter = null;
    }
}
