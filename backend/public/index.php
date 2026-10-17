<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

// CORS Headers for React Frontend
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Admin-Supervisor-Token, X-Role-Override');
header('Content-Type: application/json; charset=utf-8');

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$query = $_GET ?? [];
$rawInput = file_get_contents('php://input');
$body = ($rawInput !== false && $rawInput !== '') ? (json_decode($rawInput, true) ?: []) : [];

$router = require __DIR__ . '/../routes/api.php';

try {
    $response = $router($method, $uri, $query, $body);
    http_response_code(200);
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (\Throwable $e) {
    $decoded = json_decode($e->getMessage(), true);
    if (is_array($decoded) && isset($decoded['message_bn'])) {
        $status = (int) ($decoded['status'] ?? 400);
        unset($decoded['status']);
        http_response_code($status);
        echo json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    } else {
        http_response_code(500);
        echo json_encode([
            'code' => 'SERVER_ERROR',
            'message_bn' => 'সার্ভারে একটি ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
            'message_en' => strtolower((string) env('APP_ENV', 'development')) === 'production'
                ? 'An internal server error occurred. Please try again or contact support.'
                : $e->getMessage(),
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
