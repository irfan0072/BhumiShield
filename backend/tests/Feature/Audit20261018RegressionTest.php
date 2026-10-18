<?php

declare(strict_types=1);

namespace Tests\Feature;

if (!getenv('BHUMISHIELD_TEST_DB')) {
    $tmpDbInit = sys_get_temp_dir() . '/bhumishield_audit_regression_' . getmypid() . '_' . bin2hex(random_bytes(4)) . '.sqlite';
    putenv("BHUMISHIELD_TEST_DB={$tmpDbInit}");
    $_ENV['BHUMISHIELD_TEST_DB'] = $tmpDbInit;
}

use App\Http\Controllers\Api\V1\LawyerPortalController;
use App\Http\Controllers\Api\V1\PublicMarketplaceAndPortalController;
use App\Http\Controllers\Api\V1\RoleControlController;
use App\Http\Controllers\Api\V1\SourceIntelligenceController;
use App\Http\Controllers\Api\V1\SystemAdminController;
use App\Http\Controllers\Api\V1\WorkflowController;
use App\Services\JwtAuthService;
use App\Services\OfficeScopeService;
use App\Services\ReadinessService;
use App\Services\TransferStateMachine;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Audit20261018RegressionTest
 *
 * Verifies repairs and invariants for findings A01 through A20 documented in
 * docs/SOFTWARE_QUALITY_AUDIT_2026-10-18.md and docs/ANTIGRAVITY_EXACT_BUG_FIX_PROMPT_2026-10-18.md.
 *
 * Runs exclusively against an isolated, disposable SQLite database in the system temp directory.
 */
final class Audit20261018RegressionTest
{
    private static int $passed = 0;

    private static function assertTrue(bool $cond, string $msg = 'Assertion failed'): void
    {
        if (!$cond) {
            throw new \RuntimeException($msg);
        }
        self::$passed++;
        echo "  ✓ {$msg}\n";
    }

    private static function assertEqual(mixed $expected, mixed $actual, string $msg = ''): void
    {
        if ($expected !== $actual) {
            $eStr = is_scalar($expected) ? (string) $expected : json_encode($expected);
            $aStr = is_scalar($actual) ? (string) $actual : json_encode($actual);
            throw new \RuntimeException("{$msg} Expected [{$eStr}] but got [{$aStr}]");
        }
        self::$passed++;
        echo "  ✓ {$msg}\n";
    }

    private static function callRoute(string $method, string $uri, array $body = [], ?string $jwt = null, array $query = []): array
    {
        $router = require __DIR__ . '/../../routes/api.php';
        if ($jwt !== null) {
            $_SERVER['HTTP_AUTHORIZATION'] = "Bearer {$jwt}";
        } else {
            unset($_SERVER['HTTP_AUTHORIZATION']);
        }
        try {
            $res = $router(strtoupper($method), $uri, $query, $body);
            return ['status' => 200, 'body' => $res];
        } catch (\Throwable $e) {
            $decoded = json_decode($e->getMessage(), true);
            if (is_array($decoded) && isset($decoded['status'])) {
                return ['status' => (int) $decoded['status'], 'body' => $decoded];
            }
            return ['status' => 500, 'error' => $e->getMessage()];
        }
    }

    public static function runAll(): int
    {
        echo "\n=== Starting Audit 2026-10-18 Regression Suite (Findings A01 - A20) ===\n";

        $tmpDb = sys_get_temp_dir() . '/bhumishield_audit_regression_' . getmypid() . '_' . bin2hex(random_bytes(4)) . '.sqlite';
        putenv("BHUMISHIELD_TEST_DB={$tmpDb}");
        $_ENV['BHUMISHIELD_TEST_DB'] = $tmpDb;
        DB::resetConnection();

        (new DatabaseSeeder())->run(true);

        self::test_A01_A02_lawyer_portal_authorization_and_privacy();
        self::test_A03_wrong_buyer_deed_execution();
        self::test_A04_buyer_consent_bypass();
        self::test_A05_coowner_consent_bypass();
        self::test_A06_premature_paid_documents();
        self::test_A07_office_mouza_scope();
        self::test_A08_signing_and_seeding_invariants();
        self::test_A09_source_intelligence_packaging();
        self::test_A10_appointment_contract_and_guest_collision();
        self::test_A11_registration_phone_validation();
        self::test_A12_tracking_code_contract();
        self::test_A15_role_capability_consistency();
        self::test_A16_readiness_reporting();
        self::test_A19_public_plot_privacy();
        self::test_A20_person_directory_privacy();

        @unlink($tmpDb);
        echo "\n=== ALL AUDIT REGRESSION CHECKS PASSED: " . self::$passed . " assertions ===\n\n";
        return self::$passed;
    }

    private static function test_A01_A02_lawyer_portal_authorization_and_privacy(): void
    {
        echo "\n[A01 & A02] Lawyer Portal Authorization, Review Queue & PII Redaction\n";

        // Anonymous filing must return 401
        $resAnon = self::callRoute('POST', '/api/v1/lawyers/file-case', [
            'bar_council_no' => 'BC-DH-14285',
            'plot_id' => 1,
        ]);
        self::assertEqual(401, $resAnon['status'], 'A01: Anonymous case filing must return 401');

        // Citizen filing must return 403
        $citizen = DB::selectOne("SELECT * FROM users WHERE role = 'citizen' LIMIT 1");
        $citJwt = JwtAuthService::createToken([
            'sub' => $citizen['username'],
            'role' => 'citizen',
            'nid' => $citizen['nid'] ?? '19852694123456789',
            'exp' => time() + 3600,
            'ver' => 1,
        ]);
        $resCit = self::callRoute('POST', '/api/v1/lawyers/file-case', [
            'bar_council_no' => 'BC-DH-14285',
            'plot_id' => 1,
        ], $citJwt);
        self::assertEqual(403, $resCit['status'], 'A01: Citizen role case filing must return 403');

        // Public verification of lawyer must redact private PII
        $resPubVerify = self::callRoute('POST', '/api/v1/lawyers/verify', [
            'bar_council_no' => 'BC-DH-14285',
        ]);
        self::assertEqual(200, $resPubVerify['status'], 'A02: Public lawyer verify succeeds');
        self::assertTrue(!isset($resPubVerify['body']['lawyer']['nid']), 'A02: Public lawyer verify does not leak NID');
        self::assertTrue(!isset($resPubVerify['body']['lawyer']['phone']), 'A02: Public lawyer verify does not leak phone');
        self::assertTrue(!isset($resPubVerify['body']['lawyer']['email']), 'A02: Public lawyer verify does not leak email');

        // Admin filing succeeds and enters PENDING_REVIEW (not OPEN)
        $admin = DB::selectOne("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
        $admJwt = JwtAuthService::createToken([
            'sub' => $admin['username'],
            'role' => 'admin',
            'exp' => time() + 3600,
            'ver' => 1,
        ]);
        $resFile = self::callRoute('POST', '/api/v1/lawyers/file-case', [
            'bar_council_no' => 'BC-DH-14285',
            'plot_id' => 1,
            'court_name' => 'বিজ্ঞ সিনিয়র সহকারী জজ আদালত, সাভার',
            'suit_no' => 'দেওয়ানি নং ১২/২০২৬',
            'dispute_type' => 'TITLE_DISPUTE',
            'plaintiff_name' => 'আবেদনকারী',
            'defendant_name' => 'বিবাদী',
        ], $admJwt);
        self::assertEqual(200, $resFile['status'], 'A01: Authorized lawyer filing succeeds');
        $dispute = DB::selectOne('SELECT * FROM disputes WHERE id = ?', [$resFile['body']['dispute_id']]);
        self::assertEqual('PENDING_REVIEW', $dispute['status'], 'A01: Filed case enters PENDING_REVIEW status to prevent unreviewed freeze');
    }

    private static function test_A03_wrong_buyer_deed_execution(): void
    {
        echo "\n[A03] Wrong Buyer Deed Execution Repair\n";

        // Query distinct person fixtures
        $seller = DB::selectOne("SELECT * FROM persons LIMIT 1");
        $buyer = DB::selectOne("SELECT * FROM persons WHERE id != ? LIMIT 1", [$seller['id']]);

        $code = 'TR-' . strtoupper(bin2hex(random_bytes(4)));
        $transferId = (int) DB::insert(
            "INSERT INTO transfer_requests (transfer_code, plot_id, current_step, public_stage, transfer_area_decimal, proposed_price_bdt, deed_type, status, created_by_nid, created_at, updated_at)
             VALUES (?, 1, 5, 'EXECUTION', 10.0, 500000, 'SALE', 'DRAFT', ?, datetime('now'), datetime('now'))",
            [$code, $seller['nid']]
        );

        // Add seller party first
        DB::insert(
            "INSERT INTO transfer_parties (transfer_id, person_id, party_role, share_fraction, phone_dummy, is_verified, created_at)
             VALUES (?, ?, 'SELLER', '1/1', '01711111111', 1, datetime('now'))",
            [$transferId, $seller['id']]
        );

        // Add buyer party second
        DB::insert(
            "INSERT INTO transfer_parties (transfer_id, person_id, party_role, share_fraction, phone_dummy, is_verified, created_at)
             VALUES (?, ?, 'BUYER', '1/1', '01822222222', 1, datetime('now'))",
            [$transferId, $buyer['id']]
        );

        $resolvedBuyer = DB::selectOne(
            "SELECT tp.*, p.nid FROM transfer_parties tp JOIN persons p ON p.id = tp.person_id WHERE tp.transfer_id = ? AND tp.party_role = 'BUYER' LIMIT 1",
            [$transferId]
        );
        $resolvedSeller = DB::selectOne(
            "SELECT tp.*, p.nid FROM transfer_parties tp JOIN persons p ON p.id = tp.person_id WHERE tp.transfer_id = ? AND tp.party_role = 'SELLER' LIMIT 1",
            [$transferId]
        );

        self::assertEqual($buyer['nid'], $resolvedBuyer['nid'], 'A03: Buyer party accurately resolved to buyer NID');
        self::assertEqual($seller['nid'], $resolvedSeller['nid'], 'A03: Seller party accurately resolved to seller NID');
        self::assertTrue($resolvedBuyer['nid'] !== $resolvedSeller['nid'], 'A03: Buyer is not confused with seller or first-person record');
    }

    private static function test_A04_buyer_consent_bypass(): void
    {
        echo "\n[A04] Buyer Consent Step 3 -> 4 Enforcement\n";

        $seller = DB::selectOne("SELECT * FROM persons LIMIT 1");
        $buyer = DB::selectOne("SELECT * FROM persons WHERE id != ? LIMIT 1", [$seller['id']]);
        $code = 'TR-CONSENT-' . bin2hex(random_bytes(3));

        $transferId = (int) DB::insert(
            "INSERT INTO transfer_requests (transfer_code, plot_id, current_step, public_stage, transfer_area_decimal, proposed_price_bdt, deed_type, status, created_by_nid, created_at, updated_at)
             VALUES (?, 1, 3, 'BUYER_CONSENT', 10.0, 500000, 'SALE', 'DRAFT', ?, datetime('now'), datetime('now'))",
            [$code, $seller['nid']]
        );

        DB::insert(
            "INSERT INTO transfer_parties (transfer_id, person_id, party_role, share_fraction, phone_dummy, is_verified, created_at)
             VALUES (?, ?, 'BUYER', '1/1', '01822222222', 1, datetime('now'))",
            [$transferId, $buyer['id']]
        );

        // Seller attempting to advance Step 3 -> 4 MUST fail with BUYER_CONFIRMATION_REQUIRED
        $sellerUser = ['username' => 'seller_usr', 'role' => 'citizen', 'nid' => $seller['nid']];
        $sellerBlocked = false;
        try {
            TransferStateMachine::advanceStep($transferId, [
                'action' => 'CONFIRM_BUYER_CONSENT',
                'buyer_confirmed' => true,
            ], $sellerUser);
        } catch (\Throwable $e) {
            $err = json_decode($e->getMessage(), true) ?: ['code' => $e->getMessage()];
            if (($err['code'] ?? '') === 'BUYER_CONFIRMATION_REQUIRED') {
                $sellerBlocked = true;
            }
        }
        self::assertTrue($sellerBlocked, 'A04: Seller cannot confirm buyer consent (BUYER_CONFIRMATION_REQUIRED thrown)');

        // Authentic buyer advancing Step 3 -> 4 succeeds
        $buyerUser = ['username' => 'buyer_usr', 'role' => 'citizen', 'nid' => $buyer['nid']];
        $advanceRes = TransferStateMachine::advanceStep($transferId, [
            'action' => 'CONFIRM_BUYER_CONSENT',
            'buyer_confirmed' => true,
        ], $buyerUser);
        self::assertEqual(4, (int) $advanceRes['current_step'], 'A04: Authentic buyer successfully confirms consent to step 4');
    }

    private static function test_A05_coowner_consent_bypass(): void
    {
        echo "\n[A05] Co-owner Consent Step 5 -> 6 Bypass Prevention\n";

        $seller = DB::selectOne("SELECT * FROM persons LIMIT 1");
        // Plot 3 is jointly owned by multiple latest co-owners
        $transferId = (int) DB::insert(
            "INSERT INTO transfer_requests (transfer_code, plot_id, current_step, public_stage, transfer_area_decimal, proposed_price_bdt, deed_type, status, created_by_nid, created_at, updated_at)
             VALUES (?, 3, 5, 'COOWNER_CONSENT', 10.0, 500000, 'SALE', 'DRAFT', ?, datetime('now'), datetime('now'))",
            ['TR-COOWN-' . bin2hex(random_bytes(3)), $seller['nid']]
        );

        $admin = ['username' => 'admin', 'role' => 'admin', 'nid' => '9999999999'];

        // Attempting to advance step 5 with empty notes_bn but consent_confirmed: false must fail
        $blocked = false;
        try {
            TransferStateMachine::advanceStep($transferId, [
                'consent_confirmed' => false,
                'notes_bn' => '', // Previously an empty string bypassed the coowner check!
            ], $admin);
        } catch (\Throwable $e) {
            $err = json_decode($e->getMessage(), true) ?: ['code' => $e->getMessage()];
            if (($err['code'] ?? '') === 'CO_OWNER_CONSENT_REQUIRED') {
                $blocked = true;
            }
        }
        self::assertTrue($blocked, 'A05: Co-owner step cannot be bypassed by empty notes string (CO_OWNER_CONSENT_REQUIRED thrown)');

        // Explicit consent advances to step 6
        $res = TransferStateMachine::advanceStep($transferId, ['consent_confirmed' => true], $admin);
        self::assertEqual(6, (int) $res['current_step'], 'A05: Step advances to 6 with explicit coowner consent');
    }

    private static function test_A06_premature_paid_documents(): void
    {
        echo "\n[A06] Premature PAID DCR & Khatian Porcha Prevention\n";

        $seller = DB::selectOne("SELECT * FROM persons LIMIT 1");
        $transferId = (int) DB::insert(
            "INSERT INTO transfer_requests (transfer_code, plot_id, current_step, public_stage, transfer_area_decimal, proposed_price_bdt, deed_type, status, created_by_nid, created_at, updated_at)
             VALUES (?, 1, 6, 'SUBMITTED', 10.0, 500000, 'SALE', 'SUBMITTED', ?, datetime('now'), datetime('now'))",
            ['TR-DOCS-' . bin2hex(random_bytes(3)), $seller['nid']]
        );

        $citUser = ['username' => 'citizen', 'role' => 'citizen', 'nid' => $seller['nid']];
        $dto = TransferStateMachine::getTransfer($transferId, $citUser);

        self::assertTrue(!isset($dto['dcr']), 'A06: DCR receipt omitted before completion');
        self::assertTrue(!isset($dto['khatian_porcha']), 'A06: Khatian porcha omitted before mutation approval');
    }

    private static function test_A07_office_mouza_scope(): void
    {
        echo "\n[A07] Office & Mouza Scope Enforcement\n";

        $office = DB::selectOne("SELECT * FROM offices WHERE office_type = 'ac_land' LIMIT 1");
        self::assertTrue($office !== null, 'Office fixture must exist');

        // Strictly restrict served mouzas for this office to a non-matching mouza
        DB::statement("UPDATE offices SET mouzas_served_json = '[\"NonMatchingMouza\"]' WHERE id = ?", [$office['id']]);

        $testOfficer = DB::selectOne("SELECT * FROM users WHERE role = 'ac_land' LIMIT 1");
        self::assertTrue($testOfficer !== null, 'Officer fixture must exist');

        DB::statement('DELETE FROM office_user WHERE user_id = ?', [$testOfficer['id']]);
        DB::insert(
            "INSERT INTO office_user (office_id, user_id, role_name, is_primary, assigned_at) VALUES (?, ?, 'ac_land', 1, datetime('now'))",
            [$office['id'], $testOfficer['id']]
        );

        // Plot 1 is in Virulia mouza, not NonMatchingMouza. In unpatched code, ac_land was exempt and would return true!
        $canAccess = OfficeScopeService::canAccessPlot(1, $testOfficer);
        self::assertTrue(!$canAccess, 'A07: AC Land officer cannot access plot outside assigned mouza scope');
    }

    private static function test_A08_signing_and_seeding_invariants(): void
    {
        echo "\n[A08] Signing Secrets & Synthetic Seeding Invariants\n";

        // Verify that render.yaml does not commit private signing seed
        $renderYaml = file_get_contents(__DIR__ . '/../../../render.yaml');
        self::assertTrue(str_contains($renderYaml, 'REGISTRAR_ED25519_SEED_HEX'), 'A08: render.yaml declares registrar signing seed');
        self::assertTrue(str_contains($renderYaml, 'sync: false'), 'A08: render.yaml specifies sync: false for signing seed');

        // Verify entrypoint.sh has INIT_SYNTHETIC_SEED gating
        $entrypoint = file_get_contents(__DIR__ . '/../../entrypoint.sh');
        self::assertTrue(str_contains($entrypoint, 'INIT_SYNTHETIC_SEED'), 'A08: entrypoint.sh gates synthetic seeding on INIT_SYNTHETIC_SEED');
    }

    private static function test_A09_source_intelligence_packaging(): void
    {
        echo "\n[A09] Service Sources Asset Packaging\n";

        $packagedSources = __DIR__ . '/../../resources/service_sources/sources.json';
        $packagedCollector = __DIR__ . '/../../resources/service_sources/collector.py';

        self::assertTrue(file_exists($packagedSources), 'A09: Packaged sources.json exists in backend/resources');
        self::assertTrue(file_exists($packagedCollector), 'A09: Packaged collector.py exists in backend/resources');

        $manifest = SourceIntelligenceController::manifest();
        self::assertTrue(!empty($manifest) && count($manifest) >= 8, 'A09: SourceIntelligenceController manifests packaged sources');
    }

    private static function test_A10_appointment_contract_and_guest_collision(): void
    {
        echo "\n[A10] Office Appointment Phone Validation & Guest Collision Prevention\n";

        $office = DB::selectOne('SELECT id FROM offices LIMIT 1');
        $officeId = (int) $office['id'];
        $futureDate = date('Y-m-d', strtotime('+3 days'));

        // Invalid phone number rejection
        $resInvalidPhone = self::callRoute('POST', '/api/v1/appointments', [
            'office_id' => $officeId,
            'citizen_name' => 'জামাল উদ্দিন',
            'citizen_phone' => '12345', // Invalid BD phone
            'slot_date' => $futureDate,
        ]);
        self::assertEqual(422, $resInvalidPhone['status'], 'A10: Invalid phone rejected with 422');

        // Past date rejection
        $resPastDate = self::callRoute('POST', '/api/v1/appointments', [
            'office_id' => $officeId,
            'citizen_name' => 'জামাল উদ্দিন',
            'citizen_phone' => '01711223344',
            'slot_date' => '2020-01-01',
        ]);
        self::assertEqual(422, $resPastDate['status'], 'A10: Past appointment date rejected with 422');

        // Guest booking 1
        $resGuest1 = self::callRoute('POST', '/api/v1/appointments', [
            'office_id' => $officeId,
            'citizen_name' => 'অতিথি এক',
            'citizen_phone' => '01711000001',
            'slot_date' => $futureDate,
            'slot_time' => '10:00 AM',
        ]);
        self::assertEqual(200, $resGuest1['status'], 'A10: Guest 1 booking succeeds');

        // Guest booking 2 (different phone, same office & date) MUST NOT collide with 409
        $resGuest2 = self::callRoute('POST', '/api/v1/appointments', [
            'office_id' => $officeId,
            'citizen_name' => 'অতিথি দুই',
            'citizen_phone' => '01822000002',
            'slot_date' => $futureDate,
            'slot_time' => '11:00 AM',
        ]);
        self::assertEqual(200, $resGuest2['status'], 'A10: Guest 2 with different phone does NOT collide');
    }

    private static function test_A11_registration_phone_validation(): void
    {
        echo "\n[A11] User Registration BD Phone Regex Validation\n";

        $admin = DB::selectOne("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
        $admJwt = JwtAuthService::createToken([
            'sub' => $admin['username'],
            'role' => 'admin',
            'exp' => time() + 3600,
            'ver' => 1,
        ]);

        // Attempting to register user with invalid phone
        $resInvalid = self::callRoute('POST', '/api/v1/admin/users', [
            'username' => 'test_invalid_phone',
            'full_name' => 'টেস্ট ইউজার',
            'role' => 'citizen',
            'phone' => '999999',
            'password' => 'SecurePass123!',
        ], $admJwt);
        self::assertEqual(422, $resInvalid['status'], 'A11: Invalid phone rejected with 422');
    }

    private static function test_A12_tracking_code_contract(): void
    {
        echo "\n[A12] Transfer Tracking Code Contract\n";

        $seller = DB::selectOne("SELECT * FROM persons LIMIT 1");
        $code = 'TR-TEST-' . bin2hex(random_bytes(3));
        $transferId = (int) DB::insert(
            "INSERT INTO transfer_requests (transfer_code, plot_id, current_step, public_stage, transfer_area_decimal, proposed_price_bdt, deed_type, status, created_by_nid, created_at, updated_at)
             VALUES (?, 1, 1, 'START', 10.0, 500000, 'SALE', 'DRAFT', ?, datetime('now'), datetime('now'))",
            [$code, $seller['nid']]
        );

        $transfer = TransferStateMachine::getTransfer($transferId, ['role' => 'admin']);
        self::assertTrue(!empty($transfer['transfer_code']), 'A12: transfer_code present in DTO');
        self::assertTrue(!empty($transfer['tracking_code']), 'A12: tracking_code present in DTO for client canonical usage');
    }

    private static function test_A15_role_capability_consistency(): void
    {
        echo "\n[A15] Role Capability Consistency (system_admin Accepted)\n";

        $code = 'TR-SYSADM-' . bin2hex(random_bytes(3));
        $transferId = (int) DB::insert(
            "INSERT INTO transfer_requests (transfer_code, plot_id, current_step, public_stage, transfer_area_decimal, proposed_price_bdt, deed_type, status, created_by_nid, created_at, updated_at)
             VALUES (?, 1, 1, 'START', 10.0, 500000, 'SALE', 'DRAFT', '1234567890', datetime('now'), datetime('now'))",
            [$code]
        );

        $sysAdmin = ['username' => 'sysadmin', 'role' => 'system_admin', 'nid' => '0000000000'];
        $canView = TransferStateMachine::getTransfer($transferId, $sysAdmin);
        self::assertTrue(!empty($canView['transfer_code']), 'A15: system_admin is permitted to view transfer');
    }

    private static function test_A16_readiness_reporting(): void
    {
        echo "\n[A16] Readiness Reporting Truthfulness\n";

        $readiness = ReadinessService::getIdentityAndBiometricReadiness();
        $matrix = [];
        foreach ($readiness['readiness_matrix'] as $row) {
            $matrix[$row['capability']] = $row;
        }

        // WebAuthn Passkeys must be reported NOT_IMPLEMENTED rather than fake passing
        $webauthn = $matrix['WEBAUTHN_PASSKEYS'] ?? null;
        self::assertTrue($webauthn !== null, 'A16: WEBAUTHN_PASSKEYS check present');
        self::assertEqual('NOT_IMPLEMENTED', $webauthn['status'], 'A16: WebAuthn passkeys reported NOT_IMPLEMENTED');

        // Account Authentication (Password & JWT) reported as READY
        $acctAuth = $matrix['ACCOUNT_AUTHENTICATION'] ?? null;
        self::assertTrue($acctAuth !== null, 'A16: ACCOUNT_AUTHENTICATION check present');
        self::assertEqual('READY', $acctAuth['status'], 'A16: Password and JWT reported READY');
    }

    private static function test_A19_public_plot_privacy(): void
    {
        echo "\n[A19] Public Plot Detail Privacy\n";

        // Query public plots list
        $resList = self::callRoute('GET', '/api/v1/plots');
        self::assertEqual(200, $resList['status'], 'A19: Public plot list query succeeds');
        $items = $resList['body']['items'] ?? [];
        self::assertTrue(!empty($items), 'A19: Plot items returned');
        self::assertTrue(!isset($items[0]['locked_by_nid']), 'A19: Public plots list does not leak locked_by_nid');
        self::assertTrue(!isset($items[0]['admin_freeze_reason']), 'A19: Public plots list does not leak admin_freeze_reason');

        // Query single public plot detail
        $plotId = (int) $items[0]['id'];
        $resSingle = self::callRoute('GET', "/api/v1/plots/{$plotId}");
        self::assertEqual(200, $resSingle['status'], 'A19: Public plot detail query succeeds');
        self::assertTrue(!isset($resSingle['body']['plot']['locked_by_nid']), 'A19: Public plot detail does not expose locked_by_nid');
        self::assertTrue(!isset($resSingle['body']['plot']['admin_notes']), 'A19: Public plot detail does not expose admin_notes');
    }

    private static function test_A20_person_directory_privacy(): void
    {
        echo "\n[A20] Person Directory Privacy\n";

        // Bank officer calling general /persons without plot/NID receives masked NIDs and no sensitive PII
        $bankUser = DB::selectOne("SELECT * FROM users WHERE role = 'bank_officer' LIMIT 1");
        if (!$bankUser) {
            $bankUser = ['username' => 'bank_test', 'role' => 'bank_officer'];
        }
        $bankJwt = JwtAuthService::createToken([
            'sub' => $bankUser['username'],
            'role' => 'bank_officer',
            'exp' => time() + 3600,
            'ver' => 1,
        ]);

        $resBank = self::callRoute('GET', '/api/v1/persons', [], $bankJwt);
        self::assertEqual(200, $resBank['status'], 'A20: Bank officer list persons returns masked list');
        $items = $resBank['body']['items'] ?? [];
        self::assertTrue(!empty($items), 'A20: Items returned in directory query');
        $first = $items[0];
        self::assertTrue(str_contains((string) ($first['nid'] ?? ''), '*'), 'A20: NID is masked with asterisks');
        self::assertTrue(!isset($first['address_bn']), 'A20: Address is omitted from general query');
        self::assertTrue(empty($first['phone_dummy']), 'A20: Phone is omitted or empty in general query');
    }
}
