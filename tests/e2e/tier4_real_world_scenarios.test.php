<?php

declare(strict_types=1);

namespace Tests\E2E;

require_once __DIR__ . '/E2ETestHelper.php';

use Tests\E2E\E2ETestHelper as H;
use App\Support\DB;

final class Tier4RealWorldScenariosTest
{
    public static function runAll(): array
    {
        $tests = [
            'test_01_complete_property_transfer_and_mutation_lifecycle' => 'Scenario A: Citizen check -> Fee calc -> Pre-check -> Deed registration -> AC Land mutation -> Vault update',
            'test_02_bank_mortgage_lien_collateral_due_diligence_and_noc_lifecycle' => 'Scenario B: Bank mortgage lien creation -> Check Before You Buy alert -> Loan release -> Cryptographic NOC verify',
            'test_03_lawyer_bar_verification_court_filing_freeze_and_resolution' => 'Scenario C: Bar Council lawyer verify -> Court suit filing -> Plot transfer freeze -> Dispute resolution',
            'test_04_super_admin_sovereign_power_ledger_audit_backup_broadcast' => 'Scenario D: Super Admin ledger health check -> Audit log query -> Sovereign DB backup -> Emergency broadcast',
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
            'tier' => 'Tier 4 - Real-World Application Scenarios (End-to-End Multi-Role)',
            'total' => count($tests),
            'passed' => $passed,
            'failed' => $failed,
            'results' => $results,
        ];
    }

    /**
     * Scenario A: Complete Property Transfer & e-Mutation Workflow.
     * Citizen Buyer -> Sub-Registrar Fee Calc & Pre-Check -> Deed Registration -> AC Land Mutation -> Citizen Vault.
     */
    public static function test_01_complete_property_transfer_and_mutation_lifecycle(): void
    {
        $plotId = 13; // Owned by Person 1 (Rafiqul Islam, 'citizen') in Savar, Dhaka
        $sellerPersonId = 1;
        $buyerPersonId = 2; // Rabeya ('rabeya')
        $transferArea = 1.0;
        $declaredPrice = 1200000;

        // 1. Citizen Buyer queries public Check Before You Buy
        $dueDiligence = H::callRoute('GET', "/api/v1/plots/{$plotId}/check-before-you-buy?requested_area_decimal={$transferArea}&seller_id={$sellerPersonId}");
        H::assertStatus(200, $dueDiligence, 'Buyer due diligence check');
        $buyerVerdict = $dueDiligence['data']['risk_report']['verdict'] ?? '';
        H::assertTrue(in_array($buyerVerdict, ['SAFE', 'LOW_RISK', 'REVIEW'], true), 'Plot title is eligible for transfer');

        // 2. Sub-Registrar calculates statutory registration fees
        $subRegToken = H::loginAs('sub_registrar');
        $feeRes = H::callRoute('GET', '/api/v1/registrar/calculate-fees', [
            'price_bdt' => $declaredPrice,
            'deed_type' => 'SALE',
        ], $subRegToken);
        H::assertStatus(200, $feeRes, 'Sub-Registrar fee calculation');
        H::assertTrue(($feeRes['data']['total_govt_fees_bdt'] ?? 0) > 0, 'Total registration fee calculated');

        // 3. Sub-Registrar executes pre-check
        $preCheck = H::callRoute('POST', '/api/v1/registrar/pre-check', [
            'plot_id' => $plotId,
            'seller_id' => $sellerPersonId,
            'buyer_id' => $buyerPersonId,
            'requested_area_decimal' => $transferArea,
            'price_bdt' => $declaredPrice,
            'deed_type' => 'বিক্রয় দলিল (KABALA)',
        ], $subRegToken);
        H::assertStatus(200, $preCheck, 'Sub-Registrar pre-check');
        H::assertTrue(in_array($preCheck['data']['risk_report']['verdict'] ?? '', ['SAFE', 'LOW_RISK', 'REVIEW'], true), 'Pre-check title check');

        // 4. Sub-Registrar registers deed
        $regRes = H::callRoute('POST', '/api/v1/registrar/register-deed', [
            'plot_id' => $plotId,
            'seller_id' => $sellerPersonId,
            'buyer_id' => $buyerPersonId,
            'requested_area_decimal' => $transferArea,
            'price_bdt' => $declaredPrice,
            'deed_type' => 'বিক্রয় দলিল (KABALA)',
            'officer_notes_bn' => 'QA E2E লাইফসাইকেল দলিল নিবন্ধন',
        ], $subRegToken);
        H::assertStatus(200, $regRes, 'Register deed');
        $deedId = (int) ($regRes['data']['deed_id'] ?? 0);
        $deedNo = (string) ($regRes['data']['deed_no'] ?? '');
        H::assertTrue($deedId > 0, 'Deed created in ledger');

        // Verify deed QR verification endpoint works immediately
        $qrVerify = H::callRoute('GET', "/api/v1/verify/deed/{$deedNo}");
        H::assertStatus(200, $qrVerify, 'Deed QR public verification');
        H::assertTrue(!empty($qrVerify['data']['verification']['is_valid']), 'Deed cryptographic signature is valid');

        // 5. AC Land lists pending mutations and finds the auto-queued case
        $acLandToken = H::loginAs('ac_land');
        $mutList = H::callRoute('GET', '/api/v1/mutations', ['status' => 'PENDING'], $acLandToken);
        H::assertStatus(200, $mutList, 'AC Land list pending mutations');
        
        $pendingCases = $mutList['data']['items'] ?? $mutList['data'] ?? [];
        $targetMutation = null;
        foreach ($pendingCases as $m) {
            if ((int) ($m['deed_id'] ?? 0) === $deedId) {
                $targetMutation = $m;
                break;
            }
        }
        H::assertTrue($targetMutation !== null, 'Auto-queued mutation case found for deed');
        $mutationId = (int) $targetMutation['id'];

        // 6. AC Land decides and approves mutation
        $decideRes = H::callRoute('POST', "/api/v1/mutations/{$mutationId}/decide", [
            'decision' => 'APPROVED',
            'reason_bn' => 'দলিল, বিএস খতিয়ান ও ক্ষেত্র প্রতিবেদন পর্যালোচনান্তে নামজারি প্রস্তাব অনুমোদিত।',
        ], $acLandToken);
        H::assertStatus(200, $decideRes, 'AC Land approve mutation');
        H::assertEqual('APPROVED', $decideRes['data']['status'] ?? '', 'Mutation status APPROVED');

        // 7. Verify Citizen Property Vault reflects updated ownership
        $rabeyaToken = H::login('rabeya');
        $rabeyaProps = H::callRoute('GET', '/api/v1/citizen/my-properties', [], $rabeyaToken);
        H::assertStatus(200, $rabeyaProps, 'Rabeya property vault');
        
        $rabeyaPlots = array_map(fn($p) => (int) ($p['plot_id'] ?? 0), $rabeyaProps['data']['plots'] ?? []);
        H::assertTrue(in_array($plotId, $rabeyaPlots, true), 'Plot 13 is in Rabeya property portfolio');

        // 8. Verify Deed status is updated to MUTATED
        $deedRow = DB::selectOne('SELECT status FROM deeds WHERE id = ?', [$deedId]);
        H::assertEqual('MUTATED', $deedRow['status'] ?? '', 'Deed transitioned to MUTATED');
    }

    /**
     * Scenario B: Bank Mortgage Lien Collateral Lifecycle.
     * Bank Collateral Check -> Lien Creation -> Due Diligence Alert -> Release -> Verifiable NOC.
     */
    public static function test_02_bank_mortgage_lien_collateral_due_diligence_and_noc_lifecycle(): void
    {
        $plotId = 40; // Owned by Rabeya, 20 decimal
        $borrowerId = 2; // Person 2
        $loanBdt = 2500000;
        $mortgagedArea = 10.0;

        $officerToken = H::loginAs('bank_officer');

        // 1. Bank Officer checks collateral eligibility
        $check = H::callRoute('POST', '/api/v1/mortgages/collateral-check', [
            'plot_id' => $plotId,
            'borrower_id' => $borrowerId,
            'requested_loan_bdt' => $loanBdt,
            'area_mortgaged_decimal' => $mortgagedArea,
        ], $officerToken);
        H::assertStatus(200, $check, 'Bank collateral check');
        H::assertTrue($check['data']['can_create_lien'] ?? false, 'Collateral is eligible for loan');

        // 2. Bank Officer registers mortgage lien
        $createRes = H::callRoute('POST', '/api/v1/mortgages', [
            'plot_id' => $plotId,
            'borrower_id' => $borrowerId,
            'loan_amount_bdt' => $loanBdt,
            'area_mortgaged_decimal' => $mortgagedArea,
            'bank_name_bn' => 'সোনালী ব্যাংক পিএলসি',
            'bank_name_en' => 'Sonali Bank PLC',
            'branch_bn' => 'সাভার শাখা, ঢাকা',
        ], $officerToken);
        H::assertStatus(200, $createRes, 'Create mortgage lien');
        $lienId = (int) ($createRes['data']['lien_id'] ?? 0);
        H::assertTrue($lienId > 0, 'Lien registered with Sonali Bank');
        H::assertEqual('ACTIVE', $createRes['data']['status'] ?? '');

        try {
            // 3. Public Check Before You Buy surfaces the active mortgage lien
            $dueDiligence = H::callRoute('GET', "/api/v1/plots/{$plotId}/check-before-you-buy");
            H::assertStatus(200, $dueDiligence, 'Check before buy surfaces lien');
            $flags = $dueDiligence['data']['risk_report']['flags'] ?? [];
            $hasLienFlag = false;
            foreach ($flags as $f) {
                $rid = (string) ($f['rule_id'] ?? '');
                if (str_contains($rid, 'MORTGAGE') || str_contains($rid, 'LIEN')) {
                    $hasLienFlag = true;
                    break;
                }
            }
            H::assertTrue($hasLienFlag, 'Risk report flags active mortgage lien');

            // 4. Bank Manager releases the mortgage lien
            $mgrToken = H::loginAs('bank_manager');
            $releaseRes = H::callRoute('POST', "/api/v1/mortgages/{$lienId}/release", [], $mgrToken);
            H::assertStatus(200, $releaseRes, 'Release mortgage lien');
            H::assertEqual('RELEASED', $releaseRes['data']['status'] ?? '', 'Lien released');

            // 5. Bank Manager generates verifiable NOC
            $nocRes = H::callRoute('GET', "/api/v1/mortgages/{$lienId}/noc", [], $mgrToken);
            H::assertStatus(200, $nocRes, 'Generate mortgage NOC');
            $nocNo = (string) ($nocRes['data']['noc_no'] ?? '');
            H::assertTrue(!empty($nocNo), 'NOC number generated');
            H::assertTrue(!empty($nocRes['data']['ed25519_signature']), 'NOC digital signature present');

            // 6. Public verifies NOC via QR code
            $verifyNoc = H::callRoute('GET', "/api/v1/verify/noc/{$nocNo}");
            H::assertStatus(200, $verifyNoc, 'Public NOC QR verification');
            H::assertTrue($verifyNoc['data']['is_valid'] ?? false, 'NOC is cryptographically valid');
            H::assertEqual('RELEASED', $verifyNoc['data']['status'] ?? '', 'NOC confirms released lien');
        } finally {
            // Ensure lien is cleanly cleaned up or released
            if (isset($lienId) && $lienId > 0) {
                DB::statement("DELETE FROM noc_certificates WHERE lien_id = ?", [$lienId]);
                DB::statement("DELETE FROM mortgages_liens WHERE id = ?", [$lienId]);
            }
        }
    }

    /**
     * Scenario C: Civil Court Legal Dispute, Plot Freeze & Resolution Lifecycle.
     * Bar Council Lawyer Verify -> Suit Filing -> Injunction Freeze -> Block Transfer -> Resolution.
     */
    public static function test_03_lawyer_bar_verification_court_filing_freeze_and_resolution(): void
    {
        $lawyerToken = H::loginAs('lawyer_court_user');
        $barNo = 'BC-DH-14285'; // Advocate Syed Kamrul Hasan, Dhaka Bar
        $plotId = 14; // Clean plot in Savar (owned by Person 18, 26 decimal)

        // 1. Verify Lawyer Bar Council license
        $verifyRes = H::callRoute('POST', '/api/v1/lawyers/verify', [
            'bar_council_no' => $barNo,
        ], $lawyerToken);
        H::assertStatus(200, $verifyRes, 'Verify Bar Council license');
        H::assertTrue($verifyRes['data']['verified'] ?? false, 'Lawyer license verified');
        H::assertEqual('ACTIVE', $verifyRes['data']['lawyer']['status'] ?? '');

        // 2. Lawyer files civil court suit
        $suitNo = 'CIVIL-QA-2026-' . random_int(1000, 9999);
        $fileRes = H::callRoute('POST', '/api/v1/lawyers/file-case', [
            'bar_council_no' => $barNo,
            'plot_id' => $plotId,
            'court_name' => 'বিজ্ঞ যুগ্ম জেলা জজ ১ম আদালত, ঢাকা',
            'suit_no' => $suitNo,
            'dispute_type' => 'INJUNCTION',
            'case_stage' => 'STATUS_QUO_ISSUED',
            'plaintiff_name' => 'মোসা. শাহেদা পারভীন',
            'defendant_name' => 'মো. জিল্লুর রহমান',
            'disputed_area_decimal' => 5.0,
            'description_bn' => 'স্বত্ব ঘোষণা ও স্থায়ী নিষেধাজ্ঞার দেওয়ানি মোকদ্দমা',
        ], $lawyerToken);

        H::assertStatus(200, $fileRes, 'Lawyer file civil suit');
        $disputeId = (int) ($fileRes['data']['dispute_id'] ?? 0);
        $caseNo = (string) ($fileRes['data']['case_no'] ?? '');
        H::assertTrue($disputeId > 0, 'Dispute case created');

        try {
            // 3. AC Land reviews and upholds injunction (freezes plot)
            $acLandToken = H::loginAs('ac_land');
            $freezeRes = H::callRoute('POST', "/api/v1/acland/disputes/{$disputeId}/resolve", [
                'status' => 'UPHELD_FROZEN',
                'resolution_notes_bn' => 'বিজ্ঞ দেওয়ানি আদালতের অন্তর্বর্তীকালীন নিষেধাজ্ঞার প্রেক্ষিতে দাগে হস্তান্তর স্থগিত আদেশ।',
            ], $acLandToken);
            H::assertStatus(200, $freezeRes, 'AC Land upholds injunction freeze');

            // 4. Sub-Registrar attempting deed registration on frozen plot throws 422 PLOT_TRANSFER_FROZEN
            $subRegToken = H::loginAs('sub_registrar');
            $regAttempt = H::callRoute('POST', '/api/v1/registrar/register-deed', [
                'plot_id' => $plotId,
                'seller_id' => 18,
                'buyer_id' => 1,
                'requested_area_decimal' => 2.0,
                'price_bdt' => 600000,
                'deed_type' => 'বিক্রয় দলিল (KABALA)',
            ], $subRegToken);
            H::assertStatus(422, $regAttempt, 'Deed registration must be blocked on frozen plot');
            H::assertEqual('PLOT_TRANSFER_FROZEN', $regAttempt['code'] ?? $regAttempt['data']['code'] ?? '');

            // 5. Court disposes suit / injunction vacated -> AC Land resolves dispute
            $resolveRes = H::callRoute('POST', "/api/v1/acland/disputes/{$disputeId}/resolve", [
                'status' => 'RESOLVED',
                'resolution_notes_bn' => 'বিজ্ঞ আদালতের চূড়ান্ত রায়ে স্থগিতাদেশ প্রত্যাহার হওয়ায় দাগের লেনদেন সচল করা হলো।',
            ], $acLandToken);
            H::assertStatus(200, $resolveRes, 'AC Land resolves dispute');
            H::assertEqual('RESOLVED', $resolveRes['data']['status'] ?? $resolveRes['data']['dispute']['status'] ?? 'RESOLVED');

            // 6. Verify plot is now unblocked
            $dueDiligenceAfter = H::callRoute('GET', "/api/v1/plots/{$plotId}/check-before-you-buy");
            H::assertStatus(200, $dueDiligenceAfter, 'Check before buy after resolution');
            $verdictAfter = $dueDiligenceAfter['data']['risk_report']['verdict'] ?? '';
            H::assertTrue(in_array($verdictAfter, ['SAFE', 'LOW_RISK', 'REVIEW'], true), 'Plot unblocked after dispute resolved');
        } finally {
            // Clean up test dispute
            if (isset($disputeId) && $disputeId > 0) {
                DB::statement("DELETE FROM disputes WHERE id = ?", [$disputeId]);
            }
        }
    }

    /**
     * Scenario D: Super Admin Sovereign Control, Ledger Audit, Backup & Emergency Broadcast.
     * Ledger Health Check -> Audit Logs -> Sovereign DB Backup -> Emergency Broadcast.
     */
    public static function test_04_super_admin_sovereign_power_ledger_audit_backup_broadcast(): void
    {
        $adminToken = H::loginAs('admin');

        // 1. Run live cryptographic ledger health check
        $healthCheck = H::callRoute('POST', '/api/v1/admin/ledger/health-check', [], $adminToken);
        H::assertStatus(200, $healthCheck, 'Super Admin ledger health check');
        $ledgerStatus = $healthCheck['data']['status'] ?? '';
        H::assertTrue(in_array($ledgerStatus, ['SUCCESS', 'COMPROMISED'], true), 'Ledger health check returned valid audit status');
        H::assertTrue(($healthCheck['data']['total_blocks_checked'] ?? 0) > 0, 'Total blocks audited');

        // If demo tamper is present, ensure it pinpoints DL-2026-1005
        if ($ledgerStatus === 'COMPROMISED') {
            H::assertEqual('DL-2026-1005', $healthCheck['data']['details']['first_broken_deed_no'] ?? '', 'Pinpoints seeded demo tamper drill');
        }

        // 2. Query tamper-evident audit logs
        $auditLogs = H::callRoute('GET', '/api/v1/audit-log', [], $adminToken);
        H::assertStatus(200, $auditLogs, 'Query system audit logs');
        H::assertTrue(is_array($auditLogs['data']), 'Audit logs returned array');
        H::assertTrue(count($auditLogs['data']) > 0, 'Audit entries exist in system');

        // 3. Export sovereign database backup snapshot with SHA-256 checksum
        $backupRes = H::callRoute('GET', '/api/v1/admin/database/backup', [], $adminToken);
        H::assertStatus(200, $backupRes, 'Export database backup');
        H::assertEqual('SUCCESS', $backupRes['data']['status'] ?? '');
        H::assertTrue(!empty($backupRes['data']['sha256_checksum']), 'SHA-256 checksum generated');
        H::assertTrue(($backupRes['data']['total_tables'] ?? 0) > 0, 'Database tables accounted');

        // 4. Activate emergency broadcast banner
        $broadcastMsgBn = 'জরুরি বার্তা: ভূমি রেকর্ড ও জরিপ অধিদপ্তরের সার্ভার রক্ষণাবেক্ষণ চলছে।';
        $activateBroadcast = H::callRoute('POST', '/api/v1/admin/system/broadcast', [
            'is_active' => true,
            'message_bn' => $broadcastMsgBn,
            'severity' => 'WARNING',
        ], $adminToken);
        H::assertStatus(200, $activateBroadcast, 'Activate emergency broadcast');

        // Verify public broadcast endpoint reflects the active banner
        $publicBroadcast = H::callRoute('GET', '/api/v1/system/broadcast');
        H::assertStatus(200, $publicBroadcast, 'Public broadcast check');
        H::assertTrue($publicBroadcast['data']['is_active'] ?? false, 'Broadcast banner is publicly active');
        H::assertEqual($broadcastMsgBn, $publicBroadcast['data']['message_bn'] ?? '');

        // 5. Deactivate emergency broadcast banner
        $deactivateBroadcast = H::callRoute('POST', '/api/v1/admin/system/broadcast', [
            'is_active' => false,
            'message_bn' => '',
            'severity' => 'INFO',
        ], $adminToken);
        H::assertStatus(200, $deactivateBroadcast, 'Deactivate emergency broadcast');

        // Verify public broadcast is now deactivated
        $publicBroadcastOff = H::callRoute('GET', '/api/v1/system/broadcast');
        H::assertStatus(200, $publicBroadcastOff, 'Public broadcast check after deactivation');
        H::assertEqual(false, (bool) ($publicBroadcastOff['data']['is_active'] ?? false), 'Broadcast banner deactivated');
    }
}
