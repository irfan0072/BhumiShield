<?php

declare(strict_types=1);

/**
 * High-Speed PHP REST Bridge for BhumiShield E2E Testing.
 * Invokes backend routes/api.php in-process, bypassing network port sandboxing.
 */

error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
ini_set('display_errors', '0');

require_once __DIR__ . '/../../backend/vendor/autoload.php';

$raw = file_get_contents('php://stdin');
if (!$raw && isset($argv[1])) {
    $raw = $argv[1];
}

$req = json_decode((string) $raw, true);
if (!is_array($req)) {
    echo json_encode(['status' => 400, 'error' => 'Invalid JSON input to bridge']);
    exit(1);
}

$method = strtoupper((string) ($req['method'] ?? 'GET'));
$uri = (string) ($req['uri'] ?? '/');
$query = (array) ($req['query'] ?? []);
$body = (array) ($req['body'] ?? []);
$token = $req['token'] ?? null;
$headers = (array) ($req['headers'] ?? []);

$_SERVER['REQUEST_METHOD'] = $method;
$_SERVER['REQUEST_URI'] = $uri;
$_SERVER['HTTP_HOST'] = '127.0.0.1';

if ($token !== null && $token !== '') {
    $_SERVER['HTTP_AUTHORIZATION'] = "Bearer {$token}";
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
        echo json_encode([
            'status' => (int) ($res['status'] ?? 200),
            'binary' => true,
            'content_type' => $res['content_type'] ?? 'application/octet-stream',
            'body_length' => strlen((string) ($res['body'] ?? '')),
            'body_preview' => substr((string) ($res['body'] ?? ''), 0, 50),
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    } else {
        echo json_encode([
            'status' => 200,
            'data' => $res,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
} catch (\Throwable $e) {
    $decoded = json_decode($e->getMessage(), true);
    if (is_array($decoded) && (isset($decoded['status']) || isset($decoded['code']))) {
        $status = (int) ($decoded['status'] ?? 400);
        unset($decoded['status']);
        echo json_encode([
            'status' => $status,
            'data' => $decoded,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    } else {
        echo json_encode([
            'status' => 500,
            'error' => $e->getMessage(),
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
