<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\LedgerVerificationController;
use App\Http\Controllers\Api\V1\RoleControlController;
use App\Http\Controllers\Api\V1\SystemAdminController;
use App\Http\Controllers\Api\V1\WorkflowController;
use App\Http\Middleware\RoleMiddleware;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Laravel API Router (/api/v1/* and /api/*) with RoleMiddleware guards.
 */
return static function (string $method, string $uri, array $query, array $body): array {
    try {
        $row = DB::selectOne('SELECT COUNT(*) AS cnt FROM plots');
        if (!$row || ((int) $row['cnt']) === 0) {
            (new DatabaseSeeder())->run(true);
        }
    } catch (\Throwable) {
        (new DatabaseSeeder())->run(true);
    }

    $path = '/' . trim($uri, '/');
    if (str_starts_with($path, '/api/v1/')) {
        $sub = '/' . substr($path, 8);
    } elseif (str_starts_with($path, '/api/')) {
        $sub = '/' . substr($path, 5);
    } else {
        $sub = $path;
    }

    if ($method === 'GET' && ($sub === '/health' || $sub === '/')) {
        return [
            'status' => 'ok',
            'framework' => 'Laravel 11 (PHP ' . PHP_VERSION . ')',
            'rbac_middleware' => 'RoleMiddleware Active',
            'service' => 'BhumiShield Laravel API (Demo / ডেমো ডেটা)',
            'disclaimer_bn' => 'ভূমি সুরক্ষা শুধুমাত্র ঝুঁকি চিহ্নিত করে; চূড়ান্ত আইনি সিদ্ধান্ত সংশ্লিষ্ট সরকারি কর্মকর্তার।',
            'disclaimer_en' => 'BhumiShield flags risk for a human officer to decide. It never declares legal truth.',
        ];
    }

    // 1. Public & Admin Ledger Verification Routes
    if ($method === 'GET' && (preg_match('#^/verify/deed/([^/]+)$#', $sub, $m) || preg_match('#^/deeds/verify/([^/]+)$#', $sub, $m))) {
        return LedgerVerificationController::verifySingleDeed(urldecode($m[1]), $query['h'] ?? null);
    }
    if ($method === 'GET' && ($sub === '/ledger/verify' || $sub === '/ledger/verify-chain')) {
        return LedgerVerificationController::verifyFullLedger((int) ($query['limit'] ?? 25));
    }
    if ($method === 'POST' && preg_match('#^/ledger/tamper/(\d+)$#', $sub, $m)) {
        $actor = RoleMiddleware::authorize(['admin', 'sub_registrar']);
        return LedgerVerificationController::simulateTampering((int) $m[1], $body, $actor);
    }
    if ($method === 'POST' && preg_match('#^/ledger/restore/(\d+)$#', $sub, $m)) {
        $actor = RoleMiddleware::authorize(['admin', 'sub_registrar']);
        return LedgerVerificationController::restoreTamperedDeed((int) $m[1], $actor);
    }

    // 2. Authentication, Role Switching & RBAC Permissions Matrix
    if ($method === 'POST' && $sub === '/auth/login') {
        return WorkflowController::login($body);
    }
    if ($method === 'POST' && $sub === '/auth/register') {
        return SystemAdminController::registerUser($body);
    }
    if ($method === 'POST' && $sub === '/auth/switch-demo-role') {
        return RoleControlController::switchDemoRole($body);
    }
    if ($method === 'GET' && $sub === '/auth/permissions') {
        return RoleControlController::getPermissionsInfo();
    }
    if ($method === 'GET' && $sub === '/auth/demo-users') {
        return WorkflowController::listDemoUsers();
    }
    if ($method === 'GET' && $sub === '/auth/me') {
        return SystemAdminController::getMe();
    }
    if ($method === 'PUT' && $sub === '/auth/profile') {
        return SystemAdminController::updateProfile($body);
    }
    if ($method === 'POST' && $sub === '/auth/change-password') {
        return SystemAdminController::changePassword($body);
    }

    // 3. Citizen Portfolio, Sale Lock & Dispute Control Routes
    if ($method === 'GET' && $sub === '/locations') {
        return WorkflowController::listLocations();
    }
    if ($method === 'GET' && $sub === '/plots') {
        $locData = WorkflowController::listLocations();
        $plots = $locData['plots'] ?? [];
        if (!empty($query['location_id']) || !empty($query['mouza_id'])) {
            $lid = (int) ($query['location_id'] ?? $query['mouza_id']);
            $plots = array_values(array_filter($plots, fn(array $p) => (int) $p['location_id'] === $lid));
        }
        return ['items' => $plots, 'total' => count($plots)];
    }
    if ($method === 'GET' && $sub === '/persons') {
        return WorkflowController::listPersons();
    }
    if ($method === 'GET' && ($sub === '/citizen/my-properties' || $sub === '/citizen/my-vault')) {
        return SystemAdminController::getCitizenLinkedProperties($query['nid'] ?? null);
    }
    if ($method === 'POST' && preg_match('#^/citizen/plots/(\d+)/toggle-lock$#', $sub, $m)) {
        return RoleControlController::togglePlotSaleLock((int) $m[1], $body);
    }
    if ($method === 'GET' && $sub === '/citizen/disputes') {
        return RoleControlController::listDisputes(isset($query['plot_id']) ? (int) $query['plot_id'] : null);
    }
    if ($method === 'POST' && $sub === '/citizen/disputes') {
        return RoleControlController::createDispute($body);
    }
    if ($method === 'GET' && preg_match('#^/plots/(\d+)/check-before-you-buy$#', $sub, $m)) {
        $area = isset($query['requested_area_decimal']) ? (float) $query['requested_area_decimal'] : null;
        $sellerId = isset($query['seller_id']) ? (int) $query['seller_id'] : null;
        return WorkflowController::citizenCheckBeforeYouBuy((int) $m[1], $area, $sellerId);
    }

    // 4. Sub-Registrar Controlling Routes (Protected by RoleMiddleware)
    if ($method === 'GET' && ($sub === '/scenarios' || $sub === '/demo-scenarios')) {
        return WorkflowController::listDemoScenarios();
    }
    if ($method === 'POST' && $sub === '/registrar/pre-check') {
        RoleMiddleware::authorize(['sub_registrar', 'admin']);
        return WorkflowController::subRegistrarPreCheck($body);
    }
    if ($method === 'POST' && $sub === '/registrar/register-deed') {
        $actor = RoleMiddleware::authorize(['sub_registrar', 'admin']);
        return WorkflowController::subRegistrarRegisterDeed($body, $actor);
    }
    if ($method === 'GET' && $sub === '/registrar/deeds') {
        RoleMiddleware::authorize(['sub_registrar', 'admin']);
        return RoleControlController::listRegistrarDeeds($query['status'] ?? null, $query['q'] ?? null);
    }
    if ($method === 'POST' && preg_match('#^/registrar/deeds/(\d+)/status$#', $sub, $m)) {
        return RoleControlController::updateDeedStatus((int) $m[1], $body);
    }
    if ($method === 'GET' && $sub === '/registrar/calculate-fees') {
        $val = (int) ($query['price_bdt'] ?? ($query['declared_value_bdt'] ?? 1500000));
        return RoleControlController::calculateFees($val, (string) ($query['deed_type'] ?? 'SALE'));
    }

    // 5. AC Land Controlling Routes (Protected by RoleMiddleware)
    if ($method === 'GET' && $sub === '/mutations') {
        return WorkflowController::listMutations($query['status'] ?? null);
    }
    if ($method === 'POST' && (preg_match('#^/mutations/(\d+)/decide$#', $sub, $m) || preg_match('#^/mutations/(\d+)/decision$#', $sub, $m))) {
        $actor = RoleMiddleware::authorize(['ac_land', 'admin']);
        if (isset($body['status']) && !isset($body['decision'])) {
            $body['decision'] = $body['status'];
        }
        if (isset($body['decision_note_bn']) && !isset($body['reason_bn'])) {
            $body['reason_bn'] = $body['decision_note_bn'];
        }
        return WorkflowController::decideMutationCase((int) $m[1], $body, $actor);
    }
    if ($method === 'GET' && $sub === '/acland/flagged-khatians') {
        RoleMiddleware::authorize(['ac_land', 'admin']);
        return RoleControlController::listFlaggedKhatians();
    }
    if ($method === 'POST' && preg_match('#^/acland/khatians/(\d+)/reconcile$#', $sub, $m)) {
        return RoleControlController::reconcileKhatianPlot((int) $m[1], $body);
    }
    if ($method === 'POST' && preg_match('#^/acland/disputes/(\d+)/resolve$#', $sub, $m)) {
        return RoleControlController::resolveDispute((int) $m[1], $body);
    }

    // 6. Bank Officer Controlling Routes (Protected by RoleMiddleware)
    if ($method === 'GET' && $sub === '/mortgages') {
        return WorkflowController::listMortgages();
    }
    if ($method === 'POST' && $sub === '/mortgages/collateral-check') {
        RoleMiddleware::authorize(['bank_officer', 'admin']);
        return WorkflowController::bankCollateralCheck($body);
    }
    if ($method === 'POST' && $sub === '/mortgages') {
        $actor = RoleMiddleware::authorize(['bank_officer', 'admin']);
        return WorkflowController::createMortgageLien($body, $actor);
    }
    if ($method === 'POST' && preg_match('#^/mortgages/(\d+)/release$#', $sub, $m)) {
        $actor = RoleMiddleware::authorize(['bank_officer', 'admin']);
        return WorkflowController::releaseMortgageLien((int) $m[1], $actor);
    }
    if ($method === 'GET' && preg_match('#^/mortgages/(\d+)/noc$#', $sub, $m)) {
        return RoleControlController::generateLienNoc((int) $m[1]);
    }

    // 7. Audit Log, Bangla OCR & System Admin Routes
    if ($method === 'GET' && ($sub === '/audit-log' || $sub === '/audit-logs')) {
        return WorkflowController::getAuditLog();
    }
    if (($method === 'POST' || $method === 'GET') && ($sub === '/ocr/khatian-demo' || $sub === '/ocr-assist/sample')) {
        return WorkflowController::parseDummyKhatianOcr($body ?: $query);
    }
    if ($method === 'GET' && ($sub === '/admin/users' || $sub === '/users')) {
        RoleMiddleware::authorize(['admin']);
        return SystemAdminController::adminListUsers($query['role'] ?? null, $query['q'] ?? null);
    }
    if ($method === 'POST' && ($sub === '/admin/users' || $sub === '/users')) {
        RoleMiddleware::authorize(['admin']);
        return SystemAdminController::registerUser($body);
    }
    if ($method === 'PUT' && (preg_match('#^/admin/users/(\d+)$#', $sub, $m) || preg_match('#^/users/(\d+)$#', $sub, $m))) {
        $actor = RoleMiddleware::authorize(['admin']);
        return SystemAdminController::adminUpdateUser((int) $m[1], $body, $actor);
    }
    if ($method === 'DELETE' && (preg_match('#^/admin/users/(\d+)$#', $sub, $m) || preg_match('#^/users/(\d+)$#', $sub, $m))) {
        $actor = RoleMiddleware::authorize(['admin']);
        return SystemAdminController::adminDeleteUser((int) $m[1], $actor);
    }
    if ($method === 'GET' && $sub === '/settings') {
        return SystemAdminController::getSiteSettings();
    }
    if ($method === 'PUT' && $sub === '/settings') {
        $actor = RoleMiddleware::authorize(['admin']);
        return SystemAdminController::updateSiteSettings($body, $actor);
    }
    if ($method === 'GET' && ($sub === '/analytics/summary' || $sub === '/stats/summary')) {
        return SystemAdminController::getAnalyticsSummary();
    }

    throw new \RuntimeException(json_encode([
        'status' => 404,
        'code' => 'ENDPOINT_NOT_FOUND',
        'message_bn' => "অনুরোধকৃত এপিআই পাথ ({$uri}) পাওয়া যায়নি।",
        'message_en' => "Requested API endpoint ({$uri}) was not found.",
    ], JSON_UNESCAPED_UNICODE));
};
