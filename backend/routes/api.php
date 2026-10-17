<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\LedgerVerificationController;
use App\Http\Controllers\Api\V1\OnboardingAndAppealsController;
use App\Http\Controllers\Api\V1\PublicMarketplaceAndPortalController;
use App\Http\Controllers\Api\V1\RoleControlController;
use App\Http\Controllers\Api\V1\ServiceCatalogueController;
use App\Http\Controllers\Api\V1\SystemAdminController;
use App\Http\Controllers\Api\V1\WorkflowController;
use App\Http\Middleware\RoleMiddleware;
use App\Services\JwtAuthService;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Laravel API Router (/api/v1/* and /api/*) with RoleMiddleware guards.
 */
return static function (string $method, string $uri, array $query, array $body): array {
    $path = '/' . trim($uri, '/');
    if (str_starts_with($path, '/api/v1/')) {
        $sub = '/' . substr($path, 8);
    } elseif (str_starts_with($path, '/api/')) {
        $sub = '/' . substr($path, 5);
    } else {
        $sub = $path;
    }

    if (strtolower((string) env('APP_ENV', 'development')) === 'production') {
        $demoOnly = preg_match('#^/ledger/(tamper|restore)/#', $sub)
            || in_array($sub, ['/auth/switch-demo-role', '/auth/demo-users', '/scenarios', '/demo-scenarios', '/ocr/khatian-demo', '/ocr-assist/sample'], true);
        if ($demoOnly) {
            throw new \RuntimeException(json_encode([
                'status' => 404, 'code' => 'DEMO_FEATURE_DISABLED',
                'message_bn' => 'ডেমো সুবিধাটি প্রোডাকশনে চালু নেই।',
                'message_en' => 'This demonstration feature is disabled in production.',
            ], JSON_UNESCAPED_UNICODE));
        }
    }

    $isHealthRequest = $method === 'GET' && in_array($sub, ['/health', '/readiness', '/'], true);
    if ($isHealthRequest || strtolower((string) env('APP_ENV', 'development')) === 'production') {
        $state = \App\Services\ReadinessService::inspect();
        if (!$state['ready']) {
            throw new \RuntimeException(json_encode([
                'status' => 503, 'code' => 'SERVICE_NOT_READY', 'issues' => $state['issues'],
                'message_bn' => 'সেবা প্রস্তুত নয়। অপারেটরকে ডাটাবেজ মাইগ্রেশন ও কনফিগারেশন যাচাই করতে হবে।',
                'message_en' => 'Service is not ready. The operator must check migrations and configuration.',
            ], JSON_UNESCAPED_UNICODE));
        }
        if ($isHealthRequest) return [
            'status' => 'ok', 'ready' => true, 'database' => 'connected',
            'framework' => 'Custom PHP REST runtime', 'service' => 'BhumiShield',
            'mode' => strtolower((string) env('APP_ENV', 'development')),
            'disclaimer_en' => 'Independent land-record workflow and risk application; not a government authority.',
        ];
    }

    // 1. Public & Admin Ledger Verification Routes
    if ($method === 'GET' && preg_match('#^/verify/noc/([^/]+)$#', $sub, $m)) {
        $qrSetting = DB::selectOne("SELECT setting_value_json FROM site_settings WHERE setting_key = 'public_qr_verification_enabled'");
        $publicEnabled = $qrSetting ? (json_decode((string) $qrSetting['setting_value_json'], true) !== false) : true;
        if (!$publicEnabled) {
            RoleMiddleware::authorize(['citizen', 'sub_registrar', 'ac_land', 'bank_officer', 'admin']);
        }
        return RoleControlController::verifyLienNoc(urldecode($m[1]), $query['h'] ?? null);
    }
    if ($method === 'GET' && (
        preg_match('#^/verify/deed/([^/]+)$#', $sub, $m) ||
        preg_match('#^/deeds/verify/([^/]+)$#', $sub, $m) ||
        preg_match('#^/verify/(?!noc/)([^/]+)$#', $sub, $m)
    )) {
        $qrSetting = DB::selectOne("SELECT setting_value_json FROM site_settings WHERE setting_key = 'public_qr_verification_enabled'");
        $publicEnabled = $qrSetting ? (json_decode((string) $qrSetting['setting_value_json'], true) !== false) : true;
        if (!$publicEnabled) {
            RoleMiddleware::authorize(['citizen', 'sub_registrar', 'ac_land', 'bank_officer', 'admin']);
        }
        return LedgerVerificationController::verifySingleDeed(urldecode($m[1]), $query['h'] ?? null);
    }
    if ($method === 'GET' && ($sub === '/ledger/verify' || $sub === '/ledger/verify-chain')) {
        return LedgerVerificationController::verifyFullLedger((int) ($query['limit'] ?? 25));
    }
    if ($method === 'POST' && preg_match('#^/ledger/tamper/([^/]+)$#', $sub, $m)) {
        $actor = RoleMiddleware::authorize(['admin', 'sub_registrar']);
        return LedgerVerificationController::simulateTampering(urldecode($m[1]), $body, $actor);
    }
    if ($method === 'POST' && preg_match('#^/ledger/restore/([^/]+)$#', $sub, $m)) {
        $actor = RoleMiddleware::authorize(['admin', 'sub_registrar']);
        return LedgerVerificationController::restoreTamperedDeed(urldecode($m[1]), $actor);
    }

    // 2. Authentication, Role Switching & RBAC Permissions Matrix
    if ($method === 'POST' && $sub === '/auth/login') {
        return WorkflowController::login($body);
    }
    if ($method === 'POST' && $sub === '/auth/register') {
        return SystemAdminController::registerUser($body);
    }
    if ($method === 'POST' && $sub === '/auth/switch-demo-role') {
        $supervisorToken = $_SERVER['HTTP_X_ADMIN_SUPERVISOR_TOKEN'] ?? null;
        if ($supervisorToken) {
            $supUser = JwtAuthService::getAuthenticatedUser('Bearer ' . $supervisorToken);
            if ($supUser && ($supUser['role'] ?? '') === 'admin') {
                return RoleControlController::switchDemoRole($body);
            }
        }
        RoleMiddleware::authorize(['admin']);
        return RoleControlController::switchDemoRole($body);
    }
    if ($method === 'GET' && $sub === '/auth/permissions') {
        return RoleControlController::getPermissionsInfo();
    }
    if ($method === 'GET' && $sub === '/auth/demo-users') {
        RoleMiddleware::authorize(['admin']);
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
        return WorkflowController::listPersons($query);
    }
    if ($method === 'GET' && ($sub === '/citizen/my-properties' || $sub === '/citizen/my-vault')) {
        RoleMiddleware::authorize(['citizen', 'admin']);
        return SystemAdminController::getCitizenLinkedProperties($query['nid'] ?? null);
    }
    if ($method === 'POST' && preg_match('#^/citizen/plots/([^/]+)/toggle-lock$#', $sub, $m)) {
        RoleMiddleware::authorize(['citizen', 'admin']);
        return RoleControlController::togglePlotSaleLock(urldecode($m[1]), $body);
    }
    if ($method === 'GET' && $sub === '/citizen/disputes') {
        return RoleControlController::listDisputes(isset($query['plot_id']) ? (int) $query['plot_id'] : null);
    }
    if ($method === 'POST' && $sub === '/citizen/disputes') {
        RoleMiddleware::authorize(['citizen', 'admin']);
        return RoleControlController::createDispute($body);
    }
    if ($method === 'GET' && (preg_match('#^/plots/([^/]+)/check-before-you-buy$#', $sub, $m) || preg_match('#^/check/([^/]+)$#', $sub, $m))) {
        $area = isset($query['requested_area_decimal']) ? (float) $query['requested_area_decimal'] : null;
        $sellerId = isset($query['seller_id']) ? (int) $query['seller_id'] : null;
        return WorkflowController::citizenCheckBeforeYouBuy(urldecode($m[1]), $area, $sellerId);
    }
    if ($method === 'GET' && preg_match('#^/plots/([^/]+)/documents/(\d+)/download$#', $sub, $m)) {
        return \App\Http\Controllers\Api\V1\CitizenVaultAndTicketController::downloadPlotDocument(urldecode($m[1]), (int) $m[2]);
    }
    if ($method === 'GET' && preg_match('#^/plots/([^/]+)/documents$#', $sub, $m)) {
        return \App\Http\Controllers\Api\V1\CitizenVaultAndTicketController::listPlotDocuments(urldecode($m[1]));
    }
    if ($method === 'POST' && preg_match('#^/plots/([^/]+)/documents$#', $sub, $m)) {
        return \App\Http\Controllers\Api\V1\CitizenVaultAndTicketController::uploadPlotDocument(urldecode($m[1]), $body);
    }
    if ($method === 'POST' && preg_match('#^/plots/([^/]+)/request-missing-document$#', $sub, $m)) {
        return \App\Http\Controllers\Api\V1\CitizenVaultAndTicketController::createMissingDocTicket(urldecode($m[1]), $body);
    }
    if ($method === 'GET' && preg_match('#^/plots/([^/]+)$#', $sub, $m)) {
        return WorkflowController::getPlotDetails(urldecode($m[1]));
    }

    // 3b. 13-Step Transfer State Machine Routes (Section 5)
    if ($method === 'GET' && $sub === '/transfers') {
        return \App\Services\TransferStateMachine::listTransfers($query);
    }
    if ($method === 'POST' && $sub === '/transfers') {
        return \App\Services\TransferStateMachine::createTransfer($body);
    }
    if ($method === 'GET' && preg_match('#^/transfers/([^/]+)$#', $sub, $m)) {
        return \App\Services\TransferStateMachine::getTransfer(urldecode($m[1]));
    }
    if ($method === 'POST' && preg_match('#^/transfers/([^/]+)/advance$#', $sub, $m)) {
        return \App\Services\TransferStateMachine::advanceStep(urldecode($m[1]), $body);
    }

    // 3c. SLA Support Tickets (Section 8.2)
    if ($method === 'GET' && $sub === '/tickets') {
        return \App\Http\Controllers\Api\V1\CitizenVaultAndTicketController::listTickets($query);
    }
    if ($method === 'GET' && preg_match('#^/tickets/([^/]+)$#', $sub, $m)) {
        return \App\Http\Controllers\Api\V1\CitizenVaultAndTicketController::getTicket(urldecode($m[1]));
    }

    // 3d. Offices, Public Notices and Educational Blog (Sections 6, 8.5, 8.6)
    if ($method === 'GET' && $sub === '/offices') {
        return PublicMarketplaceAndPortalController::listOffices($query);
    }
    if ($method === 'GET' && $sub === '/notices') {
        return PublicMarketplaceAndPortalController::listNotices($query);
    }
    if ($method === 'GET' && preg_match('#^/notices/([^/]+)$#', $sub, $m)) {
        return PublicMarketplaceAndPortalController::getNotice(urldecode($m[1]));
    }
    if ($method === 'GET' && preg_match('#^/notices/([^/]+)/attachments/(\d+)/download$#', $sub, $m)) {
        return PublicMarketplaceAndPortalController::downloadNoticeAttachment(
            urldecode($m[1]),
            (int) $m[2],
            $query
        );
    }
    if ($method === 'GET' && $sub === '/blog') {
        return PublicMarketplaceAndPortalController::listBlogPosts($query);
    }
    if ($method === 'GET' && preg_match('#^/blog/([^/]+)$#', $sub, $m)) {
        return PublicMarketplaceAndPortalController::getBlogPost(urldecode($m[1]));
    }
    if ($method === 'POST' && preg_match('#^/blog/([^/]+)/helpful$#', $sub, $m)) {
        return PublicMarketplaceAndPortalController::markBlogPostHelpful(urldecode($m[1]));
    }

    // 3e. Land Sale Marketplace & Map Features (Sections 8.3, 8.4)
    if ($method === 'GET' && $sub === '/listings') {
        return PublicMarketplaceAndPortalController::listListings($query);
    }
    if ($method === 'POST' && $sub === '/listings') {
        return PublicMarketplaceAndPortalController::createListing($body);
    }
    if ($method === 'GET' && preg_match('#^/listings/([^/]+)$#', $sub, $m)) {
        return PublicMarketplaceAndPortalController::getListing(urldecode($m[1]));
    }
    if ($method === 'POST' && preg_match('#^/listings/([^/]+)/enquire$#', $sub, $m)) {
        return PublicMarketplaceAndPortalController::createListingEnquiry(urldecode($m[1]), $body);
    }
    if ($method === 'GET' && preg_match('#^/listings/([^/]+)/enquiries$#', $sub, $m)) {
        return PublicMarketplaceAndPortalController::listListingEnquiries(urldecode($m[1]));
    }
    if ($method === 'PATCH' && preg_match('#^/listings/([^/]+)/enquiries/(\d+)$#', $sub, $m)) {
        return PublicMarketplaceAndPortalController::updateListingEnquiry(urldecode($m[1]), (int) $m[2], $body);
    }
    if ($method === 'GET' && $sub === '/appointments') {
        return PublicMarketplaceAndPortalController::listAppointments($query);
    }
    if ($method === 'POST' && $sub === '/appointments') {
        return PublicMarketplaceAndPortalController::createAppointment($body);
    }
    if ($method === 'GET' && ($sub === '/public/map/features' || $sub === '/map/features')) {
        return PublicMarketplaceAndPortalController::getMapFeatures($query);
    }

    // 3f. Maker-Checker Staging Onboarding & Appellate Reviews (Tier C Sections 8.7, 8.8)
    if ($method === 'GET' && $sub === '/onboarding/batches') {
        return OnboardingAndAppealsController::listBatches($query);
    }
    if ($method === 'POST' && $sub === '/onboarding/batches') {
        return OnboardingAndAppealsController::createBatch($body);
    }
    if ($method === 'GET' && preg_match('#^/onboarding/batches/([^/]+)$#', $sub, $m)) {
        return OnboardingAndAppealsController::getBatch(urldecode($m[1]));
    }
    if ($method === 'POST' && preg_match('#^/onboarding/batches/([^/]+)/decide$#', $sub, $m)) {
        return OnboardingAndAppealsController::decideBatch(urldecode($m[1]), $body);
    }
    if ($method === 'GET' && $sub === '/appeals') {
        return OnboardingAndAppealsController::listAppeals($query);
    }
    if ($method === 'POST' && $sub === '/appeals') {
        return OnboardingAndAppealsController::createAppeal($body);
    }
    if ($method === 'GET' && preg_match('#^/appeals/([^/]+)$#', $sub, $m)) {
        return OnboardingAndAppealsController::getAppeal(urldecode($m[1]));
    }
    if ($method === 'POST' && preg_match('#^/appeals/([^/]+)/decide$#', $sub, $m)) {
        return OnboardingAndAppealsController::decideAppeal(urldecode($m[1]), $body);
    }

    // 3e. F08 Field Operations — Field Reports & SLA Dispatches
    if ($method === 'GET' && $sub === '/field-reports') {
        return \App\Http\Controllers\Api\V1\FieldOperationsController::listFieldReports($query);
    }
    if ($method === 'POST' && $sub === '/field-reports') {
        return \App\Http\Controllers\Api\V1\FieldOperationsController::createFieldReport($body);
    }
    if ($method === 'GET' && $sub === '/sla-dispatches') {
        return \App\Http\Controllers\Api\V1\FieldOperationsController::listSlaDispatches($query);
    }
    if ($method === 'POST' && $sub === '/sla-dispatches') {
        return \App\Http\Controllers\Api\V1\FieldOperationsController::createSlaDispatch($body);
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
        $actor = RoleMiddleware::authorize(['sub_registrar', 'registry_data_officer', 'admin', 'auditor']);
        return RoleControlController::listRegistrarDeeds($query['status'] ?? null, $query['q'] ?? null, $actor);
    }
    if ($method === 'POST' && preg_match('#^/registrar/deeds/(\d+)/status$#', $sub, $m)) {
        RoleMiddleware::authorize(['sub_registrar', 'admin']);
        return RoleControlController::updateDeedStatus((int) $m[1], $body);
    }
    if ($method === 'GET' && $sub === '/registrar/calculate-fees') {
        $val = (int) ($query['price_bdt'] ?? ($query['declared_value_bdt'] ?? 1500000));
        return RoleControlController::calculateFees($val, (string) ($query['deed_type'] ?? 'SALE'));
    }

    // 5. AC Land & Land Office Controlling Routes (Protected by RoleMiddleware)
    if ($method === 'GET' && $sub === '/mutations') {
        RoleMiddleware::authorize(['ac_land', 'land_office_assistant', 'field_verification_officer', 'settlement_records_officer', 'settlement_checker', 'uno_supervisor', 'appellate_reviewer', 'admin', 'auditor']);
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
        RoleMiddleware::authorize(['ac_land', 'land_office_assistant', 'settlement_records_officer', 'admin', 'auditor']);
        return RoleControlController::listFlaggedKhatians();
    }
    if ($method === 'POST' && preg_match('#^/acland/khatians/(\d+)/reconcile$#', $sub, $m)) {
        RoleMiddleware::authorize(['ac_land', 'admin']);
        return RoleControlController::reconcileKhatianPlot((int) $m[1], $body);
    }
    if ($method === 'POST' && preg_match('#^/acland/disputes/(\d+)/resolve$#', $sub, $m)) {
        RoleMiddleware::authorize(['ac_land', 'admin']);
        return RoleControlController::resolveDispute((int) $m[1], $body);
    }

    // 6. Bank Officer Controlling Routes (Protected by RoleMiddleware)
    if ($method === 'GET' && $sub === '/mortgages') {
        RoleMiddleware::authorize(['bank_officer', 'bank_manager', 'admin', 'auditor']);
        return WorkflowController::listMortgages();
    }
    if ($method === 'POST' && $sub === '/mortgages/collateral-check') {
        RoleMiddleware::authorize(['bank_officer', 'bank_manager', 'admin']);
        return WorkflowController::bankCollateralCheck($body);
    }
    if ($method === 'POST' && $sub === '/mortgages') {
        $actor = RoleMiddleware::authorize(['bank_officer', 'bank_manager', 'admin']);
        return WorkflowController::createMortgageLien($body, $actor);
    }
    if ($method === 'POST' && preg_match('#^/mortgages/(\d+)/release$#', $sub, $m)) {
        $actor = RoleMiddleware::authorize(['bank_officer', 'bank_manager', 'admin']);
        return WorkflowController::releaseMortgageLien((int) $m[1], $actor);
    }
    if ($method === 'GET' && preg_match('#^/mortgages/(\d+)/noc$#', $sub, $m)) {
        return RoleControlController::generateLienNoc((int) $m[1]);
    }

    // 7. Audit Log, Bangla OCR & System Admin Routes
    if ($method === 'GET' && ($sub === '/audit-log' || $sub === '/audit-logs')) {
        RoleMiddleware::authorize(['admin', 'auditor']);
        return WorkflowController::getAuditLog();
    }
    if (($method === 'POST' || $method === 'GET') && ($sub === '/ocr/khatian-demo' || $sub === '/ocr-assist/sample')) {
        return WorkflowController::parseDummyKhatianOcr($body ?: $query);
    }
    if ($method === 'GET' && ($sub === '/admin/users' || $sub === '/users')) {
        RoleMiddleware::authorize(['admin', 'system_admin', 'auditor', 'support_agent', 'platform_moderator']);
        return SystemAdminController::adminListUsers($query['role'] ?? null, $query['q'] ?? null);
    }
    if ($method === 'POST' && ($sub === '/admin/users' || $sub === '/users')) {
        $actor = RoleMiddleware::authorize(['admin']);
        return SystemAdminController::registerUser($body, $actor);
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

    // 8. Service Catalogue & Fee Registry (Bilingual, Source-Linked)
    if ($method === 'GET' && $sub === '/services') {
        return ServiceCatalogueController::listPublicServices($query['category'] ?? null, $query['q'] ?? null);
    }
    if ($method === 'GET' && preg_match('#^/services/([^/]+)$#', $sub, $m)) {
        return ServiceCatalogueController::getPublicService(urldecode($m[1]));
    }
    if ($method === 'GET' && $sub === '/fees') {
        return ServiceCatalogueController::listPublicFees();
    }

    // Admin Service Catalogue & Fee Registry Management
    if ($method === 'GET' && $sub === '/admin/services') {
        RoleMiddleware::authorize(['admin']);
        return ServiceCatalogueController::listAdminServices();
    }
    if ($method === 'POST' && $sub === '/admin/services') {
        $actor = RoleMiddleware::authorize(['admin']);
        return ServiceCatalogueController::createService($body, $actor);
    }
    if ($method === 'PUT' && preg_match('#^/admin/services/(\d+)$#', $sub, $m)) {
        $actor = RoleMiddleware::authorize(['admin']);
        return ServiceCatalogueController::updateService((int) $m[1], $body, $actor);
    }
    if ($method === 'POST' && preg_match('#^/admin/services/(\d+)/toggle-publish$#', $sub, $m)) {
        $actor = RoleMiddleware::authorize(['admin']);
        return ServiceCatalogueController::togglePublishService((int) $m[1], $actor);
    }
    if ($method === 'DELETE' && preg_match('#^/admin/services/(\d+)$#', $sub, $m)) {
        $actor = RoleMiddleware::authorize(['admin']);
        return ServiceCatalogueController::archiveService((int) $m[1], $actor);
    }
    if ($method === 'GET' && $sub === '/admin/fees') {
        RoleMiddleware::authorize(['admin']);
        return ServiceCatalogueController::listAdminFees();
    }
    if ($method === 'PUT' && preg_match('#^/admin/fees/(\d+)$#', $sub, $m)) {
        $actor = RoleMiddleware::authorize(['admin']);
        return ServiceCatalogueController::updateFee((int) $m[1], $body, $actor);
    }
    if ($method === 'POST' && preg_match('#^/admin/users/(\d+)/verify-identity$#', $sub, $m)) {
        $actor = RoleMiddleware::authorize(['admin']);
        return SystemAdminController::verifyCitizenIdentity((int) $m[1], $actor);
    }

    throw new \RuntimeException(json_encode([
        'status' => 404,
        'code' => 'ENDPOINT_NOT_FOUND',
        'message_bn' => "অনুরোধকৃত এপিআই পাথ ({$uri}) পাওয়া যায়নি।",
        'message_en' => "Requested API endpoint ({$uri}) was not found.",
    ], JSON_UNESCAPED_UNICODE));
};
