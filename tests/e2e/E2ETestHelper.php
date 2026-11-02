<?php

declare(strict_types=1);

namespace Tests\E2E;

use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

require_once __DIR__ . '/../../backend/vendor/autoload.php';

final class E2ETestHelper
{
    private static array $tokenCache = [];

    public static function callRoute(
        string $method,
        string $uri,
        array $body = [],
        ?string $jwt = null,
        array $query = [],
        array $headers = []
    ): array {
        $method = strtoupper($method);
        if (str_contains($uri, '?')) {
            $parts = parse_url($uri);
            $uri = $parts['path'] ?? $uri;
            if (!empty($parts['query'])) {
                parse_str($parts['query'], $parsedQuery);
                $query = array_merge($parsedQuery, $query);
            }
        }
        if ($method === 'GET' && !empty($body) && empty($query)) {
            $query = $body;
            $body = [];
        }

        $_SERVER['REQUEST_METHOD'] = $method;
        $_SERVER['REQUEST_URI'] = $uri;
        $_SERVER['HTTP_HOST'] = '127.0.0.1';

        if ($jwt !== null && $jwt !== '') {
            $_SERVER['HTTP_AUTHORIZATION'] = "Bearer {$jwt}";
        } else {
            unset($_SERVER['HTTP_AUTHORIZATION']);
        }

        foreach ($headers as $k => $v) {
            $headerKey = 'HTTP_' . strtoupper(str_replace('-', '_', (string) $k));
            $_SERVER[$headerKey] = (string) $v;
        }

        $router = require __DIR__ . '/../../backend/routes/api.php';

        try {
            $res = $router($method, $uri, $query, $body);
            if (is_array($res) && ($res['_binary'] ?? false) === true) {
                return [
                    'status' => (int) ($res['status'] ?? 200),
                    'binary' => true,
                    'content_type' => (string) ($res['content_type'] ?? 'application/octet-stream'),
                    'body' => (string) ($res['body'] ?? ''),
                    'length' => strlen((string) ($res['body'] ?? '')),
                ];
            }
            return [
                'status' => 200,
                'data' => $res,
            ];
        } catch (\Throwable $e) {
            $decoded = json_decode($e->getMessage(), true);
            if (is_array($decoded) && (isset($decoded['status']) || isset($decoded['code']))) {
                $status = (int) ($decoded['status'] ?? 400);
                unset($decoded['status']);
                return [
                    'status' => $status,
                    'data' => $decoded,
                    'code' => (string) ($decoded['code'] ?? 'UNKNOWN_ERROR'),
                    'message_bn' => (string) ($decoded['message_bn'] ?? ''),
                    'message_en' => (string) ($decoded['message_en'] ?? ''),
                ];
            }
            return [
                'status' => 500,
                'error' => $e->getMessage(),
                'code' => 'SERVER_ERROR',
            ];
        }
    }

    public static function login(string $username, string $password = 'demo123'): string
    {
        $cacheKey = "{$username}:{$password}";
        if (isset(self::$tokenCache[$cacheKey])) {
            return self::$tokenCache[$cacheKey];
        }

        $res = self::callRoute('POST', '/api/v1/auth/login', [
            'username' => $username,
            'password' => $password,
        ]);

        if ($res['status'] !== 200 || empty($res['data']['access_token'])) {
            throw new \RuntimeException("Login failed for {$username}: " . json_encode($res));
        }

        $token = (string) $res['data']['access_token'];
        self::$tokenCache[$cacheKey] = $token;
        return $token;
    }

    public static function loginAs(string $role): string
    {
        $user = DB::selectOne("SELECT username FROM users WHERE role = ? AND is_active = 1 LIMIT 1", [$role]);
        if (!$user) {
            throw new \RuntimeException("No active user found with role: {$role}");
        }
        return self::login($user['username'], 'demo123');
    }

    public static function assertEqual(mixed $expected, mixed $actual, string $msg = ''): void
    {
        if ($expected !== $actual) {
            $eStr = is_scalar($expected) ? (string) $expected : json_encode($expected);
            $aStr = is_scalar($actual) ? (string) $actual : json_encode($actual);
            throw new \RuntimeException("Assertion failed: {$msg} | Expected [{$eStr}] but got [{$aStr}]");
        }
    }

    public static function assertTrue(bool $condition, string $msg = 'Expected condition to be true'): void
    {
        if (!$condition) {
            throw new \RuntimeException("Assertion failed: {$msg}");
        }
    }

    public static function assertStatus(int $expectedStatus, array $res, string $msg = ''): void
    {
        $actualStatus = (int) ($res['status'] ?? 0);
        if ($actualStatus !== $expectedStatus) {
            $detail = json_encode($res['data'] ?? $res['error'] ?? $res, JSON_UNESCAPED_UNICODE);
            throw new \RuntimeException("Status mismatch ({$msg}): Expected [{$expectedStatus}] but got [{$actualStatus}]. Response: {$detail}");
        }
    }
}
