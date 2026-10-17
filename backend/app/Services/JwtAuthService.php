<?php

declare(strict_types=1);

namespace App\Services;

use App\Support\DB;

/**
 * HS256 JWT Bearer Token & Password Hashing Service for BhumiShield Laravel Backend.
 */
final class JwtAuthService
{
    public static function hashPassword(string $password): string
    {
        $algo = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT;
        return password_hash($password, $algo);
    }

    public static function verifyPassword(string $password, string $storedHash): bool
    {
        if ($storedHash === '') {
            return false;
        }
        if (str_starts_with($storedHash, '$')) {
            return password_verify($password, $storedHash);
        }
        $legacy = hash_pbkdf2('sha256', $password, 'bhumishield-salt-2026', 10000);
        return hash_equals($legacy, $storedHash);
    }

    public static function needsRehash(string $storedHash): bool
    {
        if (!str_starts_with($storedHash, '$')) {
            return true;
        }
        $algo = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT;
        return password_needs_rehash($storedHash, $algo);
    }

    private static function b64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function b64UrlDecode(string $str): string
    {
        $pad = strlen($str) % 4;
        if ($pad > 0) {
            $str .= str_repeat('=', 4 - $pad);
        }
        return (string) base64_decode(strtr($str, '-_', '+/'));
    }

    public static function getSecret(): string
    {
        $secret = (string) env('JWT_SECRET', '');
        $env = strtolower((string) env('APP_ENV', 'development'));
        $knownDemo = [
            'bhumishield-landtech-2026-demo-jwt-secret-key-do-not-use-in-prod',
            'demo',
            'secret',
            'changeme',
        ];
        if ($env === 'production') {
            if ($secret === '') {
                throw new \RuntimeException('JWT_SECRET must be configured in production environment.');
            }
            if (in_array(strtolower($secret), $knownDemo, true) || strlen($secret) < 32) {
                throw new \RuntimeException('Insecure demo JWT_SECRET detected in production environment.');
            }
            return $secret;
        }
        return $secret ?: 'bhumishield-landtech-2026-demo-jwt-secret-key-do-not-use-in-prod';
    }

    public static function createToken(array $payload): string
    {
        $secret = self::getSecret();
        $expMin = (int) env('JWT_EXPIRE_MINUTES', 720);
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $payload['exp'] = time() + ($expMin * 60);

        if (!isset($payload['sub']) && isset($payload['username'])) {
            $payload['sub'] = (string) $payload['username'];
        }

        if (!isset($payload['ver'])) {
            if (isset($payload['token_version'])) {
                $payload['ver'] = (int) $payload['token_version'];
            } elseif (isset($payload['sub'])) {
                $u = DB::selectOne('SELECT token_version FROM users WHERE username = ?', [(string) $payload['sub']]);
                $payload['ver'] = $u ? (int) ($u['token_version'] ?? 1) : 1;
            }
        }

        $h64 = self::b64UrlEncode((string) json_encode($header));
        $p64 = self::b64UrlEncode((string) json_encode($payload));
        $sig = hash_hmac('sha256', "{$h64}.{$p64}", $secret, true);
        return "{$h64}.{$p64}." . self::b64UrlEncode($sig);
    }

    public static function issueToken(array $payload): string
    {
        return self::createToken($payload);
    }

    public static function getAuthenticatedUser(?string $authHeader = null): ?array
    {
        $header = $authHeader ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
        if (!str_starts_with(strtolower($header), 'bearer ')) {
            return null;
        }
        $token = trim(substr($header, 7));
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }
        $secret = self::getSecret();
        $expectedSig = self::b64UrlEncode(hash_hmac('sha256', "{$parts[0]}.{$parts[1]}", $secret, true));
        if (!hash_equals($expectedSig, $parts[2])) {
            return null;
        }
        $payload = json_decode(self::b64UrlDecode($parts[1]), true);
        if (!is_array($payload) || ((int) ($payload['exp'] ?? 0)) < time()) {
            return null;
        }
        $sub = (string) ($payload['sub'] ?? ($payload['username'] ?? ''));
        if ($sub === '') {
            return null;
        }
        $user = DB::selectOne('SELECT * FROM users WHERE username = ?', [$sub]);
        if (!$user) {
            return null;
        }
        // I02: Inactive or suspended accounts cannot be authenticated
        if (((int) ($user['is_active'] ?? 1)) !== 1) {
            return null;
        }
        // I03: Validate token version against user session state
        $tokenVer = (int) ($payload['ver'] ?? ($payload['token_version'] ?? 1));
        $currVer = (int) ($user['token_version'] ?? 1);
        if ($tokenVer < $currVer) {
            throw new \RuntimeException(json_encode([
                'status' => 401,
                'code' => 'SESSION_REVOKED',
                'message_bn' => 'পূর্ববর্তী সেশন বাতিল করা হয়েছে। অনুগ্রহ করে পুনরায় লগইন করুন।',
                'message_en' => 'Session has been revoked due to security changes. Please sign in again.',
            ], JSON_UNESCAPED_UNICODE));
        }
        return $user;
    }
}
