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

    public static function getNidProvider(): NidVerificationProvider
    {
        if (self::$nidProvider === null) {
            $driver = strtolower((string) env('NID_DRIVER', 'simulated'));
            self::$nidProvider = match ($driver) {
                'ec', 'production' => new SimulatedNidProvider(), // In full prod, switch to authorized EC driver
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
        if (self::$biometricProvider === null) {
            $driver = strtolower((string) env('BIOMETRIC_DRIVER', 'simulated'));
            self::$biometricProvider = match ($driver) {
                'ec_nid', 'hardware' => new SimulatedBiometricProvider(),
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
        if (self::$smsProvider === null) {
            $driver = strtolower((string) env('SMS_DRIVER', 'outbox'));
            self::$smsProvider = match ($driver) {
                'gateway', 'telecom' => new OutboxSmsProvider(), // In full prod, switch to live gateway
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
        if (self::$paymentProvider === null) {
            $driver = strtolower((string) env('PAYMENT_DRIVER', 'simulated'));
            self::$paymentProvider = match ($driver) {
                'mfs', 'live' => new SimulatedPaymentProvider(),
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
        if (self::$gatewayAdapter === null) {
            $driver = strtolower((string) env('GATEWAY_DRIVER', 'simulated'));
            self::$gatewayAdapter = match ($driver) {
                'lsg', 'portal' => new SimulatedLandServiceGateway(),
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
