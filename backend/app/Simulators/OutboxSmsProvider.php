<?php

declare(strict_types=1);

namespace App\Simulators;

use App\Contracts\SmsProvider;
use App\Support\DB;

/**
 * Outbox SMS Driver for Local, Staging, and Pilot Environments.
 * Persists all sent SMS messages, verification codes, and OTPs to `sim_sms_outbox`
 * so evaluators and automated test runners can inspect without real telecom costs.
 */
class OutboxSmsProvider implements SmsProvider
{
    public function sendOtp(string $phone, string $otp, string $purpose, array $meta = []): bool
    {
        $cleanPhone = trim($phone);
        $cleanOtp = trim($otp);
        $cleanPurpose = strtoupper(trim($purpose));

        $msg = sprintf(
            'ভূমি সুরক্ষা (BhumiShield): আপনার এককালীন ওটিপি কোড হলো %s। এটি %s প্রক্রিয়ার জন্য প্রযোজ্য। কাউকে এটি বলবেন না।',
            $cleanOtp,
            $this->formatPurposeBn($cleanPurpose)
        );

        DB::insert(
            'INSERT INTO sim_sms_outbox (recipient_phone, message, otp_code, purpose, category, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                $cleanPhone,
                $msg,
                $cleanOtp,
                $cleanPurpose,
                'OTP',
                'DELIVERED',
                gmdate('c'),
            ]
        );

        return true;
    }

    public function sendMessage(string $phone, string $message, string $category = 'NOTIFICATION'): bool
    {
        $cleanPhone = trim($phone);
        $cleanMsg = trim($message);

        DB::insert(
            'INSERT INTO sim_sms_outbox (recipient_phone, message, otp_code, purpose, category, status, created_at)
             VALUES (?, ?, NULL, ?, ?, ?, ?)',
            [
                $cleanPhone,
                $cleanMsg,
                'NOTIFICATION',
                strtoupper(trim($category)),
                'DELIVERED',
                gmdate('c'),
            ]
        );

        return true;
    }

    public function getOutbox(int $limit = 50, ?string $phone = null): array
    {
        if ($phone !== null && trim($phone) !== '') {
            return DB::select(
                'SELECT * FROM sim_sms_outbox WHERE recipient_phone LIKE ? ORDER BY id DESC LIMIT ?',
                ['%' . trim($phone) . '%', $limit]
            );
        }

        return DB::select(
            'SELECT * FROM sim_sms_outbox ORDER BY id DESC LIMIT ?',
            [$limit]
        );
    }

    private function formatPurposeBn(string $purpose): string
    {
        return match ($purpose) {
            'LOGIN' => 'লগইন',
            'CO_OWNER_CONSENT' => 'সহ-মালিক সম্মতি প্রদান',
            'TRANSFER_INIT' => 'জমি হস্তান্তর প্রস্তাব',
            'DEED_REGISTRATION' => 'দলিল রেজিস্ট্রি',
            'MUTATION_NOTICE' => 'নামজারি নোটিশ',
            default => 'নিরাপত্তা যাচাই',
        };
    }
}
