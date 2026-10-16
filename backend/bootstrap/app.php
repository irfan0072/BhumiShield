<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

return [
    'name' => env('APP_NAME', 'BhumiShield Laravel 11 API'),
    'env' => env('APP_ENV', 'local'),
    'url' => env('APP_URL', 'http://localhost:8000'),
];
