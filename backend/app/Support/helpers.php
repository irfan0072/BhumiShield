<?php

declare(strict_types=1);

if (!function_exists('env')) {
    function env(string $key, mixed $default = null): mixed
    {
        $val = getenv($key);
        if ($val === false) {
            $val = $_ENV[$key] ?? $_SERVER[$key] ?? null;
        }
        if ($val === null) {
            return $default;
        }
        return match (strtolower((string) $val)) {
            'true', '(true)' => true,
            'false', '(false)' => false,
            'empty', '(empty)' => '',
            'null', '(null)' => null,
            default => $val,
        };
    }
}

if (!function_exists('base_path')) {
    function base_path(string $path = ''): string
    {
        $base = dirname(__DIR__, 2);
        return $path !== '' ? $base . '/' . ltrim($path, '/') : $base;
    }
}

if (!function_exists('app_path')) {
    function app_path(string $path = ''): string
    {
        return base_path('app' . ($path !== '' ? '/' . ltrim($path, '/') : ''));
    }
}

if (!function_exists('database_path')) {
    function database_path(string $path = ''): string
    {
        return base_path('database' . ($path !== '' ? '/' . ltrim($path, '/') : ''));
    }
}

if (!function_exists('storage_path')) {
    function storage_path(string $path = ''): string
    {
        return base_path('storage' . ($path !== '' ? '/' . ltrim($path, '/') : ''));
    }
}
