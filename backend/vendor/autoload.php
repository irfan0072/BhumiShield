<?php

declare(strict_types=1);

/**
 * PSR-4 Autoloader & Environment Bootstrap for BhumiShield Laravel Backend.
 * Maps App\ -> app/, Database\Seeders\ -> database/seeders/, Tests\ -> tests/
 */
spl_autoload_register(function (string $class): void {
    $prefixes = [
        'App\\' => __DIR__ . '/../app/',
        'Database\\Seeders\\' => __DIR__ . '/../database/seeders/',
        'Database\\Migrations\\' => __DIR__ . '/../database/migrations/',
        'Tests\\' => __DIR__ . '/../tests/',
    ];

    foreach ($prefixes as $prefix => $baseDir) {
        $len = strlen($prefix);
        if (strncmp($prefix, $class, $len) !== 0) {
            continue;
        }
        $relativeClass = substr($class, $len);
        $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
        if (file_exists($file)) {
            require_once $file;
            return;
        }
    }
});

require_once __DIR__ . '/../database/migrations/2026_10_16_000001_create_bhumishield_tables.php';

$envPath = __DIR__ . '/../.env';
if (!file_exists($envPath)) {
    $envPath = __DIR__ . '/../.env.example';
}
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || str_starts_with($trimmed, '#') || !str_contains($trimmed, '=')) {
            continue;
        }
        [$k, $v] = explode('=', $trimmed, 2);
        $key = trim($k);
        $val = trim($v, " \t\n\r\0\x0B\"'");
        if (getenv($key) === false) {
            putenv("{$key}={$val}");
            $_ENV[$key] = $val;
        }
    }
}

if (!function_exists('env')) {
    function env(string $key, mixed $default = null): mixed
    {
        $val = $_ENV[$key] ?? getenv($key);
        if ($val === false || $val === null) {
            return $default;
        }
        if (strtolower((string) $val) === 'true') {
            return true;
        }
        if (strtolower((string) $val) === 'false') {
            return false;
        }
        return $val;
    }
}

if (!function_exists('base_path')) {
    function base_path(string $path = ''): string
    {
        $root = realpath(__DIR__ . '/..') ?: dirname(__DIR__);
        return $path !== '' ? $root . '/' . ltrim($path, '/') : $root;
    }
}
