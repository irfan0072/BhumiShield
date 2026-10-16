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
        return hash_pbkdf2('sha256', $password, 'bhumishield-salt-2026', 10000);
    }

    public static function verifyPassword(string $password, string $storedHash): bool
    {
        return hash_equals(self::hashPassword($password), $storedHash);
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

    public static function createToken(array $payload): string
    {
        $secret = (string) env('JWT_SECRET', 'bhumishield-landtech-2026-demo-jwt-secret-key-do-not-use-in-prod');
        $expMin = (int) env('JWT_EXPIRE_MINUTES', 720);
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $payload['exp'] = time() + ($expMin * 60);

        $h64 = self::b64UrlEncode((string) json_encode($header));
        $p64 = self::b64UrlEncode((string) json_encode($payload));
        $sig = hash_hmac('sha256', "{$h64}.{$p64}", $secret, true);
        return "{$h64}.{$p64}." . self::b64UrlEncode($sig);
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
        $secret = (string) env('JWT_SECRET', 'bhumishield-landtech-2026-demo-jwt-secret-key-do-not-use-in-prod');
        $expectedSig = self::b64UrlEncode(hash_hmac('sha256', "{$parts[0]}.{$parts[1]}", $secret, true));
        if (!hash_equals($expectedSig, $parts[2])) {
            return null;
        }
        $payload = json_decode(self::b64UrlDecode($parts[1]), true);
        if (!is_array($payload) || ((int) ($payload['exp'] ?? 0)) < time()) {
            return null;
        }
        $sub = (string) ($payload['sub'] ?? '');
        if ($sub === '') {
            return null;
        }
        return DB::selectOne('SELECT * FROM users WHERE username = ?', [$sub]);
    }
}
