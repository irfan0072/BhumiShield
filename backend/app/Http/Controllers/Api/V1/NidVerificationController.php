<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Services\JwtAuthService;
use App\Services\ProviderManager;
use App\Support\DB;

/**
 * Controller for National Identity (NID) Verification & OTP Challenge Lifecycle.
 * Implements LandTech 2026 Rule Book Section 10 realistic Porichoy simulation.
 */
final class NidVerificationController
{
    /**
     * POST /api/v1/nid/verify
     * Verifies NID against simulated Election Commission Porichoy registry and issues 6-digit OTP challenge.
     */
    public static function verify(array $body): array
    {
        $nid = trim((string) ($body['nid'] ?? ''));
        $dob = trim((string) ($body['dob'] ?? ''));
        $name = isset($body['name']) ? trim((string) $body['name']) : null;

        if ($nid === '' || $dob === '') {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'success' => false,
                'code' => 'INVALID_INPUT',
                'message_bn' => 'এনআইডি নম্বর এবং জন্ম তারিখ উভয়ই আবশ্যক।',
                'message_en' => 'Both NID number and date of birth are required.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // 1. Verify against simulated EC Porichoy provider
        $provider = ProviderManager::getNidProvider();
        $res = $provider->verifyNid($nid, $dob, $name);

        if (empty($res['verified']) && empty($res['matched'])) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'success' => false,
                'code' => $res['code'] ?? 'NID_NOT_FOUND',
                'message_bn' => $res['message_bn'] ?? 'এনআইডি যাচাইকরণে ত্রুটি হয়েছে।',
                'message_en' => $res['message_en'] ?? 'NID verification failed.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $verifiedNid = (string) ($res['normalized_nid'] ?? $res['nid']);

        // 2. Resolve recipient mobile phone for OTP dispatch
        $user = null;
        try {
            $user = JwtAuthService::getAuthenticatedUser();
        } catch (\Throwable) {
            $user = null;
        }

        $phone = null;
        if (!empty($body['phone'])) {
            $phone = trim((string) $body['phone']);
        } elseif ($user && (!empty($user['phone_dummy']) || !empty($user['phone']))) {
            $phone = !empty($user['phone_dummy']) ? (string) $user['phone_dummy'] : (string) $user['phone'];
        } else {
            $person = DB::selectOne('SELECT * FROM persons WHERE nid = ? LIMIT 1', [$verifiedNid]);
            if ($person && !empty($person['phone_dummy'])) {
                $phone = (string) $person['phone_dummy'];
            }
        }

        if (!$phone) {
            $phone = '01700-001001';
        }

        // 3. Generate secure 6-digit OTP challenge
        $otpCode = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        $sessionToken = bin2hex(random_bytes(32));
        $now = gmdate('c');
        $expiresAt = gmdate('c', time() + 180); // 180 seconds validity

        DB::insert(
            'INSERT INTO sim_otp_challenges (session_token, nid, phone, otp_code, attempts, expires_at, verified_at, created_at)
             VALUES (?, ?, ?, ?, 0, ?, NULL, ?)',
            [$sessionToken, $verifiedNid, $phone, $otpCode, $expiresAt, $now]
        );

        // 4. Dispatch simulated SMS via OutboxSmsProvider
        $smsProvider = ProviderManager::getSmsProvider();
        $smsProvider->sendOtp($phone, $otpCode, 'NID_VERIFICATION', [
            'nid' => $verifiedNid,
            'session_token' => $sessionToken,
        ]);

        return [
            'status' => 200,
            'success' => true,
            'code' => 'OTP_REQUIRED',
            'transaction_id' => 'PORICHOY_' . strtoupper(bin2hex(random_bytes(8))),
            'session_token' => $sessionToken,
            'otp_sent' => true,
            'masked_phone' => self::maskPhone($phone),
            'expires_in' => 180,
            'latency_ms' => $res['latency_ms'] ?? 350,
            'identity' => [
                'nid_masked' => self::maskNid($verifiedNid),
                'full_name_bn' => (string) ($res['full_name_bn'] ?? ''),
                'full_name_en' => (string) ($res['full_name_en'] ?? ''),
                'dob' => (string) ($res['dob'] ?? $dob),
                'status' => 'ACTIVE_VOTER',
                'verification_score' => 98.4,
            ],
            'message_bn' => 'জাতীয় পরিচয়পত্র যাচাই সফল। আপনার নিবন্ধিত মোবাইলে ওটিপি পাঠানো হয়েছে।',
            'message_en' => 'National ID verified. An OTP has been sent to your registered mobile.',
        ];
    }

    /**
     * POST /api/v1/nid/verify-otp
     * Validates OTP challenge, checks expiry, enforces 3-attempt limit, and confirms identity.
     */
    public static function verifyOtp(array $body): array
    {
        $sessionToken = trim((string) ($body['session_token'] ?? ''));
        $otpCode = trim((string) ($body['otp_code'] ?? ''));

        if ($sessionToken === '' || $otpCode === '') {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'success' => false,
                'code' => 'INVALID_INPUT',
                'message_bn' => 'সেশন টোকেন ও ওটিপি কোড আবশ্যক।',
                'message_en' => 'Session token and OTP code are required.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $challenge = DB::selectOne('SELECT * FROM sim_otp_challenges WHERE session_token = ? LIMIT 1', [$sessionToken]);
        if (!$challenge) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'success' => false,
                'code' => 'INVALID_SESSION',
                'message_bn' => 'মেয়াদোত্তীর্ণ বা অবৈধ সেশন টোকেন। পুনরায় চেষ্টা করুন।',
                'message_en' => 'Invalid or expired session token. Please try again.',
            ], JSON_UNESCAPED_UNICODE));
        }

        if (!empty($challenge['verified_at'])) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'success' => false,
                'code' => 'OTP_ALREADY_USED',
                'message_bn' => 'এই ওটিপি কোডটি ইতিমধ্যে ব্যবহার করা হয়েছে।',
                'message_en' => 'This OTP challenge has already been verified.',
            ], JSON_UNESCAPED_UNICODE));
        }

        if (strtotime((string) $challenge['expires_at']) < time()) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'success' => false,
                'code' => 'OTP_EXPIRED',
                'message_bn' => 'ওটিপির মেয়াদ শেষ হয়েছে (১৮০ সেকেন্ড)। নতুন ওটিপি অনুরোধ করুন।',
                'message_en' => 'OTP has expired (180s limit). Please request a new OTP.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $attempts = (int) $challenge['attempts'];
        if ($attempts >= 3) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'success' => false,
                'code' => 'MAX_ATTEMPTS_EXCEEDED',
                'message_bn' => 'সর্বোচ্চ ৩ বার ভুল ওটিপি দেওয়া হয়েছে। সেশন লক করা হয়েছে।',
                'message_en' => 'Maximum verification attempts (3) exceeded. Session locked.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // Increment attempts count
        DB::update('UPDATE sim_otp_challenges SET attempts = attempts + 1 WHERE id = ?', [(int) $challenge['id']]);

        // Validate OTP code
        if (trim((string) $challenge['otp_code']) !== $otpCode) {
            $remaining = 2 - $attempts;
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'success' => false,
                'code' => 'INVALID_OTP',
                'attempts_remaining' => max(0, $remaining),
                'message_bn' => 'প্রদত্ত ওটিপি কোডটি সঠিক নয়। অবশিষ্ট সুযোগ: ' . max(0, $remaining) . ' বার।',
                'message_en' => 'Invalid OTP code entered. Attempts remaining: ' . max(0, $remaining),
            ], JSON_UNESCAPED_UNICODE));
        }

        // Mark OTP challenge verified
        $now = gmdate('c');
        DB::update('UPDATE sim_otp_challenges SET verified_at = ? WHERE id = ?', [$now, (int) $challenge['id']]);

        // Update authenticated user if logged in, or target user if identified
        $user = null;
        try {
            $user = JwtAuthService::getAuthenticatedUser();
        } catch (\Throwable) {
            $user = null;
        }

        if (!$user && !empty($body['user_id'])) {
            $user = DB::selectOne('SELECT * FROM users WHERE id = ? LIMIT 1', [(int) $body['user_id']]);
        } elseif (!$user && !empty($body['username'])) {
            $user = DB::selectOne('SELECT * FROM users WHERE username = ? LIMIT 1', [(string) $body['username']]);
        }

        if ($user) {
            DB::update(
                'UPDATE users SET is_identity_verified = 1, nid = ? WHERE id = ?',
                [(string) $challenge['nid'], (int) $user['id']]
            );
        }

        $person = DB::selectOne('SELECT * FROM sim_persons WHERE nid = ? LIMIT 1', [(string) $challenge['nid']]);

        return [
            'status' => 200,
            'success' => true,
            'verified' => true,
            'is_identity_verified' => 1,
            'nid' => (string) $challenge['nid'],
            'citizen_name_bn' => (string) ($person['full_name_bn'] ?? ($user['full_name_bn'] ?? '')),
            'citizen_name_en' => (string) ($person['full_name_en'] ?? ($user['full_name_en'] ?? '')),
            'message_bn' => 'পরিচয় সফলভাবে নিশ্চিত করা হয়েছে। আপনার ডিজিটাল জমির ভল্ট আনলক করা হয়েছে।',
            'message_en' => 'Identity verified successfully. Your digital property vault is now unlocked.',
        ];
    }

    public static function maskNid(string $nid): string
    {
        $clean = preg_replace('/\s+/', '', trim($nid));
        $len = strlen($clean);
        if ($len <= 4) {
            return $clean;
        }
        return str_repeat('*', $len - 4) . substr($clean, -4);
    }

    public static function maskPhone(string $phone): string
    {
        $digits = preg_replace('/[^\d]/', '', $phone);
        if (strlen($digits) < 7) {
            return $phone;
        }
        return substr($digits, 0, 3) . '****' . substr($digits, -4);
    }
}
