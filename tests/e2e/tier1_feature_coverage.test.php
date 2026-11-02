<?php

declare(strict_types=1);

namespace Tests\E2E;

require_once __DIR__ . '/E2ETestHelper.php';

use Tests\E2E\E2ETestHelper as H;
use App\Support\DB;

final class Tier1FeatureCoverageTest
{
    public static function runAll(): array
    {
        $tests = [
            'test_01_public_health_and_readiness' => 'Public Health & Identity Readiness Endpoints',
            'test_02_citizen_property_vault' => 'Role 01: Citizen Property Vault & Owned Plots',
            'test_03_service_point_operator' => 'Role 02: Service Point Operator Biometric Intake',
            'test_04_sub_registrar_console' => 'Role 03: Sub-Registrar Deeds Pipeline & Fee Calculation',
            'test_05_registry_data_officer' => 'Role 04: Registry Data Officer Ledger Ingestion',
            'test_06_ac_land_mutations_and_reconciliation' => 'Role 05: AC Land Mutation Docket & Flagged Khatians',
            'test_07_land_office_assistant' => 'Role 06: Land Office Assistant Case Processing',
            'test_08_field_verification_officer' => 'Role 07: Field Verification Officer Inspection Reports',
            'test_09_settlement_records_officer' => 'Role 08: Settlement Records Officer Cadastral Editor',
            'test_10_settlement_checker' => 'Role 09: Settlement Checker Onboarding Staging Review',
            'test_11_uno_supervisor' => 'Role 10: UNO Supervisor SLA Dispatch Control',
            'test_12_appellate_reviewer' => 'Role 11: Appellate Reviewer (ADC Revenue) Appeals',
            'test_13_bank_officer_mortgages' => 'Role 12: Bank Officer Mortgage Collateral Checks',
            'test_14_bank_manager_noc_generation' => 'Role 13: Bank Manager Lien Release & Verifiable NOC',
            'test_15_support_agent_tickets' => 'Role 14: Support Agent Helpline Tickets & Resolution',
            'test_16_platform_moderator_marketplace' => 'Role 15: Platform Moderator Marketplace Listings',
            'test_17_content_editor_publications' => 'Role 16: Content Editor Land Guidance Drafts',
            'test_18_content_approver_publishing' => 'Role 17: Content Approver Publishing Decisions',
            'test_19_super_admin_governance' => 'Role 18: Super Admin System Users, Stats & Backup',
            'test_20_national_cryptographic_auditor' => 'Role 19: National Cryptographic Auditor Ledger Verification',
            'test_21_dc_acquisition_officer' => 'Role 20: DC Land Acquisition Officer Cases',
            'test_22_lawyer_court_portal' => 'Role 21: Civil Court Advocate Verification & Case Filing',
            'test_23_public_portals_and_citizen_services' => 'Public Portals: Check Before Buy, QR Verify, Map, Notices, Blog',
        ];

        $results = [];
        $passed = 0;
        $failed = 0;

        foreach ($tests as $method => $description) {
            $t0 = microtime(true);
            try {
                self::$method();
                $elapsed = round((microtime(true) - $t0) * 1000, 2);
                $results[] = [
                    'name' => $method,
                    'description' => $description,
                    'status' => 'PASS',
                    'elapsed_ms' => $elapsed,
                ];
                $passed++;
            } catch (\Throwable $e) {
                $elapsed = round((microtime(true) - $t0) * 1000, 2);
                $results[] = [
                    'name' => $method,
                    'description' => $description,
                    'status' => 'FAIL',
                    'error' => $e->getMessage(),
                    'elapsed_ms' => $elapsed,
                ];
                $failed++;
            }
        }

        return [
            'tier' => 'Tier 1 - Feature Coverage (Happy-Path Isolation)',
            'total' => count($tests),
            'passed' => $passed,
            'failed' => $failed,
            'results' => $results,
        ];
    }

    public static function test_01_public_health_and_readiness(): void
    {
        $res = H::callRoute('GET', '/api/v1/health');
        H::assertStatus(200, $res, 'Health check');
        H::assertEqual('ok', $res['data']['status'] ?? '', 'Health status');
        H::assertEqual('connected', $res['data']['database'] ?? '', 'Database connectivity');

        $ready = H::callRoute('GET', '/api/v1/identity/readiness');
        H::assertStatus(200, $ready, 'Identity readiness');
        H::assertTrue(isset($ready['data']['readiness_matrix']), 'Readiness matrix present');
    }

    public static function test_02_citizen_property_vault(): void
    {
        $token = H::loginAs('citizen');
        $res = H::callRoute('GET', '/api/v1/citizen/my-properties', [], $token);
        H::assertStatus(200, $res, 'Citizen vault');
        H::assertTrue(!empty($res['data']['person']['nid']), 'Citizen NID present');
        H::assertTrue(is_array($res['data']['owned_plots']), 'Owned plots array');
        H::assertTrue(count($res['data']['owned_plots']) > 0, 'Citizen owns at least 1 plot');

        $plotId = $res['data']['owned_plots'][0]['plot_id'];
        $docs = H::callRoute('GET', "/api/v1/plots/{$plotId}/documents", [], $token);
        H::assertStatus(200, $docs, 'Plot documents');
    }

    public static function test_03_service_point_operator(): void
    {
        $token = H::loginAs('service_point_operator');
        $payload = [
            'party_type' => 'SELLER',
            'national_id' => '9900001001',
            'terminal_id' => 'TRM-SAVAR-01',
        ];
        $res = H::callRoute('POST', '/api/v1/biometrics/session', $payload, $token);
        H::assertStatus(200, $res, 'SPO biometric session');
        H::assertTrue(!empty($res['data']['session_id']), 'Biometric session ID issued');
    }

    public static function test_04_sub_registrar_console(): void
    {
        $token = H::loginAs('sub_registrar');
        $deeds = H::callRoute('GET', '/api/v1/registrar/deeds', [], $token);
        H::assertStatus(200, $deeds, 'Sub-Registrar deeds');
        H::assertTrue(is_array($deeds['data']['items'] ?? $deeds['data']), 'Deeds array');

        $fees = H::callRoute('GET', '/api/v1/registrar/calculate-fees', [], $token, [
            'price_bdt' => 2000000,
            'deed_type' => 'SALE',
        ]);
        H::assertStatus(200, $fees, 'Sub-Registrar fee calculator');
        H::assertTrue(($fees['data']['total_govt_fees_bdt'] ?? $fees['data']['total_payable_bdt'] ?? 0) > 0, 'Payable fee calculated');
    }

    public static function test_05_registry_data_officer(): void
    {
        $token = H::loginAs('registry_data_officer');
        $deeds = H::callRoute('GET', '/api/v1/registrar/deeds', [], $token);
        H::assertStatus(200, $deeds, 'RDO deed intake listing');
    }

    public static function test_06_ac_land_mutations_and_reconciliation(): void
    {
        $token = H::loginAs('ac_land');
        $mutations = H::callRoute('GET', '/api/v1/mutations', [], $token);
        H::assertStatus(200, $mutations, 'AC Land mutations docket');
        H::assertTrue(is_array($mutations['data']['items'] ?? $mutations['data']), 'Mutations array');

        $flagged = H::callRoute('GET', '/api/v1/acland/flagged-khatians', [], $token);
        H::assertStatus(200, $flagged, 'AC Land flagged khatians');
    }

    public static function test_07_land_office_assistant(): void
    {
        $token = H::loginAs('land_office_assistant');
        $mutations = H::callRoute('GET', '/api/v1/mutations', [], $token);
        H::assertStatus(200, $mutations, 'LOA mutations docket');
    }

    public static function test_08_field_verification_officer(): void
    {
        $token = H::loginAs('field_verification_officer');
        $reports = H::callRoute('GET', '/api/v1/field-reports', [], $token);
        H::assertStatus(200, $reports, 'FVO field reports list');

        $newReport = [
            'plot_id' => 1,
            'possession_status' => 'VERIFIED',
            'boundary_status' => 'MATCHED',
            'tax_status' => 'PAID',
            'remarks_bn' => 'জমির সীমানা ও দখল সরেজমিনে সঠিক পাওয়া গেছে।',
        ];
        $res = H::callRoute('POST', '/api/v1/field-reports', $newReport, $token);
        H::assertStatus(200, $res, 'FVO create report');
        H::assertTrue(!empty($res['data']['field_report']['id'] ?? $res['data']['id'] ?? $res['data']['report_id']), 'Report created');
    }

    public static function test_09_settlement_records_officer(): void
    {
        $token = H::loginAs('settlement_records_officer');
        $parcels = H::callRoute('GET', '/api/v1/map-editor/parcels', [], $token);
        H::assertStatus(200, $parcels, 'SRO map editor parcels');

        $context = H::callRoute('GET', '/api/v1/map-editor/context', [], $token);
        H::assertStatus(200, $context, 'SRO map editor context');
    }

    public static function test_10_settlement_checker(): void
    {
        $token = H::loginAs('settlement_checker');
        $batches = H::callRoute('GET', '/api/v1/onboarding/batches', [], $token);
        H::assertStatus(200, $batches, 'ASO onboarding batches list');
    }

    public static function test_11_uno_supervisor(): void
    {
        $token = H::loginAs('uno_supervisor');
        $dispatches = H::callRoute('GET', '/api/v1/sla-dispatches', [], $token);
        H::assertStatus(200, $dispatches, 'UNO SLA dispatches list');

        $newDispatch = [
            'target_role' => 'ac_land',
            'case_type' => 'MUTATION',
            'case_id' => 1,
            'urgency' => 'HIGH',
            'notes_bn' => 'জরুরি জনস্বার্থে আগামী ৩ কর্মদিবসের মধ্যে নিষ্পত্তি করুন।',
        ];
        $create = H::callRoute('POST', '/api/v1/sla-dispatches', $newDispatch, $token);
        H::assertStatus(200, $create, 'UNO create SLA dispatch');
    }

    public static function test_12_appellate_reviewer(): void
    {
        $token = H::loginAs('appellate_reviewer');
        $appeals = H::callRoute('GET', '/api/v1/appeals', [], $token);
        H::assertStatus(200, $appeals, 'ADC Revenue appeals list');
    }

    public static function test_13_bank_officer_mortgages(): void
    {
        $token = H::loginAs('bank_officer');
        $mortgages = H::callRoute('GET', '/api/v1/mortgages', [], $token);
        H::assertStatus(200, $mortgages, 'Bank Officer mortgages');

        $check = H::callRoute('POST', '/api/v1/mortgages/collateral-check', ['plot_id' => 1], $token);
        H::assertStatus(200, $check, 'Bank collateral check');
        H::assertTrue(isset($check['data']['can_create_lien']), 'Eligibility evaluated');
    }

    public static function test_14_bank_manager_noc_generation(): void
    {
        $token = H::loginAs('bank_manager');
        $mortgages = H::callRoute('GET', '/api/v1/mortgages', [], $token);
        H::assertStatus(200, $mortgages, 'Bank Manager mortgages list');

        $releasedLien = DB::selectOne("SELECT id FROM mortgages_liens WHERE status = 'RELEASED' AND bank_name_bn LIKE '%সোনালী%' LIMIT 1");
        if ($releasedLien) {
            $noc = H::callRoute('GET', "/api/v1/mortgages/{$releasedLien['id']}/noc", [], $token);
            H::assertStatus(200, $noc, 'Bank Manager NOC generation');
            H::assertTrue(!empty($noc['data']['noc_no'] ?? $noc['data']['noc_number']), 'NOC number present');
            H::assertTrue(!empty($noc['data']['ed25519_signature'] ?? $noc['data']['digital_signature']), 'Ed25519 digital signature present');
        }
    }

    public static function test_15_support_agent_tickets(): void
    {
        $token = H::loginAs('support_agent');
        $tickets = H::callRoute('GET', '/api/v1/tickets', [], $token);
        H::assertStatus(200, $tickets, 'Support Agent tickets list');
    }

    public static function test_16_platform_moderator_marketplace(): void
    {
        $token = H::loginAs('platform_moderator');
        $listings = H::callRoute('GET', '/api/v1/listings', [], $token);
        H::assertStatus(200, $listings, 'Platform Moderator listings');
        H::assertTrue(is_array($listings['data']['items'] ?? $listings['data']), 'Listings array');
    }

    public static function test_17_content_editor_publications(): void
    {
        $token = H::loginAs('content_editor');
        $content = H::callRoute('GET', '/api/v1/manage/content', [], $token);
        H::assertStatus(200, $content, 'Content Editor publications');
    }

    public static function test_18_content_approver_publishing(): void
    {
        $token = H::loginAs('content_approver');
        $content = H::callRoute('GET', '/api/v1/manage/content', [], $token);
        H::assertStatus(200, $content, 'Content Approver review queue');
    }

    public static function test_19_super_admin_governance(): void
    {
        $token = H::loginAs('admin');
        $users = H::callRoute('GET', '/api/v1/admin/users', [], $token);
        H::assertStatus(200, $users, 'Admin users list');

        $settings = H::callRoute('GET', '/api/v1/settings', [], $token);
        H::assertStatus(200, $settings, 'Admin settings');

        $stats = H::callRoute('GET', '/api/v1/analytics/summary', [], $token);
        H::assertStatus(200, $stats, 'Admin analytics summary');

        $backup = H::callRoute('GET', '/api/v1/admin/database/backup', [], $token);
        H::assertStatus(200, $backup, 'Admin DB backup metadata');
        H::assertTrue(!empty($backup['data']['sha256_checksum']), 'Backup checksum verified');

        $anomalies = H::callRoute('GET', '/api/v1/admin/anomalies', [], $token);
        H::assertStatus(200, $anomalies, 'Admin live anomalies');
    }

    public static function test_20_national_cryptographic_auditor(): void
    {
        $token = H::loginAs('auditor');
        $verify = H::callRoute('GET', '/api/v1/ledger/verify', [], $token, ['limit' => 20]);
        H::assertStatus(200, $verify, 'Auditor ledger verification');
        H::assertTrue(isset($verify['data']['is_valid']) || isset($verify['data']['valid']), 'Ledger validity');

        $health = H::callRoute('POST', '/api/v1/admin/ledger/health-check', [], $token);
        H::assertStatus(200, $health, 'Auditor ledger health check');
    }

    public static function test_21_dc_acquisition_officer(): void
    {
        $token = H::loginAs('dc_acquisition_officer');
        $cases = H::callRoute('GET', '/api/v1/admin/acquisition/cases', [], $token);
        H::assertStatus(200, $cases, 'DC LA acquisition cases');
    }

    public static function test_22_lawyer_court_portal(): void
    {
        $res = H::callRoute('POST', '/api/v1/lawyers/verify', [
            'bar_council_no' => 'BC-DH-14285',
        ]);
        H::assertStatus(200, $res, 'Lawyer Bar Council verification');
        H::assertTrue($res['data']['verified'] === true, 'Lawyer verified status');
        H::assertEqual('ব্যারিস্টার মো. নাজমুল হুদা', $res['data']['lawyer']['lawyer_name_bn'] ?? '');
    }

    public static function test_23_public_portals_and_citizen_services(): void
    {
        // Check Before You Buy
        $check = H::callRoute('GET', '/api/v1/plots/1/check-before-you-buy');
        H::assertStatus(200, $check, 'Public Check Before You Buy');
        H::assertTrue(!empty($check['data']['risk_report']['verdict'] ?? $check['data']['risk_report']['status'] ?? $check['data']['status']), 'Risk verdict status present');

        // Check Alias
        $checkAlias = H::callRoute('GET', '/api/v1/check/1');
        H::assertStatus(200, $checkAlias, 'Check alias route');

        // QR Deed Verification
        $deed = DB::selectOne("SELECT deed_no FROM deeds WHERE deed_no = 'DL-2026-1001' LIMIT 1");
        if ($deed) {
            $qrDeed = H::callRoute('GET', "/api/v1/verify/deed/{$deed['deed_no']}");
            H::assertStatus(200, $qrDeed, 'Public deed QR verification');
            H::assertTrue($qrDeed['data']['verification']['is_valid'] ?? false, 'Deed hash is valid');
        }

        // QR NOC Verification
        $noc = DB::selectOne("SELECT noc_no FROM noc_certificates WHERE status = 'RELEASED' LIMIT 1");
        if ($noc) {
            $qrNoc = H::callRoute('GET', "/api/v1/verify/noc/{$noc['noc_no']}");
            H::assertStatus(200, $qrNoc, 'Public NOC QR verification');
        }

        // Public Map Features
        $map = H::callRoute('GET', '/api/v1/public/map/features');
        H::assertStatus(200, $map, 'Public map features');

        // Service Catalogue & Fees
        $services = H::callRoute('GET', '/api/v1/services');
        H::assertStatus(200, $services, 'Public services catalogue');

        $fees = H::callRoute('GET', '/api/v1/fees');
        H::assertStatus(200, $fees, 'Public service fees registry');

        // Notices
        $notices = H::callRoute('GET', '/api/v1/notices');
        H::assertStatus(200, $notices, 'Public notices');

        // Blog
        $blog = H::callRoute('GET', '/api/v1/blog');
        H::assertStatus(200, $blog, 'Educational blog listing');

        // Office Locator
        $offices = H::callRoute('GET', '/api/v1/offices');
        H::assertStatus(200, $offices, 'Public offices locator');

        // Address Hierarchy
        $tree = H::callRoute('GET', '/api/v1/hierarchy/tree');
        H::assertStatus(200, $tree, 'Administrative hierarchy tree');
    }
}
