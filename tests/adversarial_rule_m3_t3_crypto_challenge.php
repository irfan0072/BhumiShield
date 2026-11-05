<?php

declare(strict_types=1);

namespace Tests\Adversarial;

require_once __DIR__ . '/e2e/E2ETestHelper.php';

use Tests\E2E\E2ETestHelper as H;
use App\Support\DB;
use App\Services\LedgerService;

final class RuleM3T3CryptoAdversarialChallenge
{
    private static int $passed = 0;
    private static int $failed = 0;
    private static array $failures = [];

    public static function run(): void
    {
        echo "======================================================================\n";
        echo "  ADVERSARIAL STRESS SUITE: RULE M3, RULE T3, & CRYPTOGRAPHIC DEED SEALS\n";
        echo "======================================================================\n";

        self::challengeRuleM3AdminLandDataMutation();
        self::challengeRuleT3BiometricDeedExecution();
        self::challengeCryptographicDeedTamperAndQrSeal();

        echo "\n======================================================================\n";
        echo "  TOTAL PASSED: " . self::$passed . " | TOTAL FAILED: " . self::$failed . "\n";
        echo "======================================================================\n";

        if (self::$failed > 0) {
            echo "\nFailed Scenarios:\n";
            foreach (self::$failures as $f) {
                echo "  - {$f}\n";
            }
            exit(1);
        }
    }

    private static function check(string $name, bool $pass, string $detail): void
    {
        if ($pass) {
            self::$passed++;
            echo "  ✓ [PASS] {$name}\n";
            echo "           {$detail}\n";
        } else {
            self::$failed++;
            echo "  ✗ [FAIL] {$name}\n";
            echo "           {$detail}\n";
            self::$failures[] = "{$name}: {$detail}";
        }
    }

    /**
     * 1. Rule M3: Administrative Land Mutation & Judicial Separation
     */
    private static function challengeRuleM3AdminLandDataMutation(): void
    {
        echo "\n[1] Challenging Rule M3 (Admin Mutation Immunity & AC Land Sole Authority)...\n";

        $adminToken = H::loginAs('admin');
        $acLandToken = H::loginAs('ac_land');

        // Vector 1.1: Direct admin mutation decision attempt
        $res1 = H::callRoute('POST', '/api/v1/mutations/1/decision', [
            'decision' => 'APPROVED',
            'reason_bn' => 'প্রশাসনিক এখতিয়ার বহির্ভূত অনুমোদন চেষ্টা',
        ], $adminToken);
        self::check(
            'Admin approval on /api/v1/mutations/1/decision returns 403 ADMIN_CANNOT_EDIT_LAND_DATA',
            $res1['status'] === 403 && (($res1['code'] ?? '') === 'ADMIN_CANNOT_EDIT_LAND_DATA'),
            "Status: {$res1['status']}, Code: " . ($res1['code'] ?? '')
        );

        // Vector 1.2: Admin attempting to supersede AC Land via administrative override console
        $res2 = H::callRoute('POST', '/api/v1/admin/security/override', [
            'target_type' => 'MUTATION_DECREE',
            'target_id' => 'MUT-2026-0001',
            'reason_bn' => 'প্রশাসনিক ডিক্রি প্রতিস্থাপন অপচেষ্টা',
            'evidence_reference' => 'MOI-CIRCULAR-2026/09',
            'confirmation' => true,
        ], $adminToken);
        self::check(
            'Admin override for MUTATION_DECREE blocked with 403 STATUTORY_AUTHORITY_VIOLATION',
            $res2['status'] === 403 && (($res2['code'] ?? '') === 'STATUTORY_AUTHORITY_VIOLATION'),
            "Status: {$res2['status']}, Code: " . ($res2['code'] ?? '')
        );

        // Vector 1.3: Admin override for OWNERSHIP_CHANGE blocked with 403 STATUTORY_AUTHORITY_VIOLATION
        $res3 = H::callRoute('POST', '/api/v1/admin/security/override', [
            'target_type' => 'OWNERSHIP_CHANGE',
            'target_id' => 'PLOT-001',
            'reason_bn' => 'মালিকানা পরিবর্তনের প্রশাসনিক অপচেষ্টা',
            'evidence_reference' => 'MOI-CIRCULAR-2026/10',
            'confirmation' => true,
        ], $adminToken);
        self::check(
            'Admin override for OWNERSHIP_CHANGE blocked with 403 STATUTORY_AUTHORITY_VIOLATION',
            $res3['status'] === 403 && (($res3['code'] ?? '') === 'STATUTORY_AUTHORITY_VIOLATION'),
            "Status: {$res3['status']}, Code: " . ($res3['code'] ?? '')
        );

        // Vector 1.4: Database Trigger Level M3 Inviolability (Direct SQLite ownership insert/update)
        $m3TriggerTriggered = false;
        try {
            DB::statement("INSERT INTO ownerships (plot_id, person_id, khatian_id, share_percentage, status, created_at) VALUES (1, 1, 1, 50.0, 'ACTIVE', '2026-11-03')");
        } catch (\Throwable $e) {
            $m3TriggerTriggered = str_contains($e->getMessage(), 'VIOLATION_M3_OWNERSHIP_GUARD') || str_contains($e->getMessage(), 'ABORT');
        }
        self::check(
            'Direct DB ownership insert aborted by inviolable SQLite trigger trg_guard_ownership_insert',
            $m3TriggerTriggered,
            "Trigger blocked: " . ($m3TriggerTriggered ? 'YES (M3 Trigger Enforced)' : 'NO (Trigger Missing)')
        );

        // Vector 1.5: AC Land legitimate authority is NOT blocked by Rule M3
        $res5 = H::callRoute('POST', '/api/v1/mutations/1/decision', [
            'decision' => 'HOLD',
            'reason_bn' => 'নথি যাচাইয়ের জন্য মূলতবি',
        ], $acLandToken);
        $acLandAllowed = ($res5['status'] === 200 || ($res5['status'] === 422 && ($res5['code'] ?? '') !== 'ADMIN_CANNOT_EDIT_LAND_DATA'));
        self::check(
            'Legitimate AC Land judicial officer is permitted and not blocked by Rule M3',
            $acLandAllowed,
            "Status: {$res5['status']}, Code: " . ($res5['code'] ?? 'OK')
        );
    }

    /**
     * 2. Rule T3: Biometric Deed Execution at Sub-Registry Office
     */
    private static function challengeRuleT3BiometricDeedExecution(): void
    {
        echo "\n[2] Challenging Rule T3 (Mandatory Biometric Execution at Sub-Registry)...\n";

        $citToken = H::loginAs('citizen');
        $adminToken = H::loginAs('admin');
        $subToken = H::loginAs('sub_registrar');

        // Create a test transfer progressing to step 8
        $t = DB::selectOne("SELECT * FROM transfers WHERE current_step = 8 LIMIT 1");
        if (!$t) {
            // Find or insert a transfer at step 8
            $firstTransfer = DB::selectOne("SELECT id FROM transfers ORDER BY id DESC LIMIT 1");
            if ($firstTransfer) {
                DB::statement("UPDATE transfers SET current_step = 8 WHERE id = ?", [$firstTransfer['id']]);
                $t = DB::selectOne("SELECT * FROM transfers WHERE id = ?", [$firstTransfer['id']]);
            }
        }

        if ($t) {
            $transferId = (int) $t['id'];

            // Vector 2.1: Citizen attempts to advance past counter biometric step (Step 8 -> Step 9)
            $res1 = H::callRoute('POST', "/api/v1/transfers/{$transferId}/advance", [
                'target_step' => 9,
            ], $citToken);
            self::check(
                'Citizen attempting to self-verify counter biometrics (Step 8->9) is rejected with 403 OFFICER_TERMINAL_REQUIRED',
                $res1['status'] === 403 && (($res1['code'] ?? '') === 'OFFICER_TERMINAL_REQUIRED'),
                "Status: {$res1['status']}, Code: " . ($res1['code'] ?? '')
            );

            // Vector 2.2: Attempting deed registration (Step 9 -> Step 10) when biometric verification is missing
            // Clear any biometric records for this transfer
            DB::statement("DELETE FROM biometric_verifications WHERE transfer_id = ?", [$transferId]);
            DB::statement("UPDATE transfers SET current_step = 9 WHERE id = ?", [$transferId]);

            $res2 = H::callRoute('POST', "/api/v1/transfers/{$transferId}/advance", [
                'target_step' => 10,
            ], $subToken);
            self::check(
                'Deed execution without matched biometrics strictly fails with 422 BIOMETRICS_REQUIRED',
                $res2['status'] === 422 && (($res2['code'] ?? '') === 'BIOMETRICS_REQUIRED'),
                "Status: {$res2['status']}, Code: " . ($res2['code'] ?? '')
            );

            // Vector 2.3: Admin attempting to override DEED_REGISTRATION via override console
            $res3 = H::callRoute('POST', '/api/v1/admin/security/override', [
                'target_type' => 'DEED_REGISTRATION',
                'target_id' => "TR-{$transferId}",
                'reason_bn' => 'বায়োমেট্রিক ব্যতিরেকে প্রশাসনিক দলিল অনুমোদন চেষ্টা',
                'evidence_reference' => 'MOI-CIRCULAR-2026/11',
                'confirmation' => true,
            ], $adminToken);
            self::check(
                'Admin override for DEED_REGISTRATION blocked with 403 STATUTORY_AUTHORITY_VIOLATION',
                $res3['status'] === 403 && (($res3['code'] ?? '') === 'STATUTORY_AUTHORITY_VIOLATION'),
                "Status: {$res3['status']}, Code: " . ($res3['code'] ?? '')
            );

            // Restore transfer state back
            DB::statement("UPDATE transfers SET current_step = 8 WHERE id = ?", [$transferId]);
        }
    }

    /**
     * 3. Cryptographic Deed Tampering Detection and QR Seal Validation
     */
    private static function challengeCryptographicDeedTamperAndQrSeal(): void
    {
        echo "\n[3] Challenging Cryptographic Deed Tampering Detection & QR Seal Validation...\n";

        $adminToken = H::loginAs('admin');
        $deedNo = 'DL-2026-1005';

        // Ensure deed is restored first
        H::callRoute('POST', "/api/v1/ledger/restore/{$deedNo}", [], $adminToken);

        // Vector 3.1: Public verification of authentic untampered deed
        $resAuth = H::callRoute('GET', "/api/v1/verify/deed/{$deedNo}");
        $isAuthValid = ($resAuth['status'] === 200 && ($resAuth['data']['verification']['is_valid'] ?? false) === true);
        $sigAuthValid = ($resAuth['data']['verification']['signature_valid'] ?? false) === true;
        $hashAuthValid = ($resAuth['data']['verification']['hash_valid'] ?? false) === true;
        self::check(
            "Authentic deed {$deedNo} verifies valid Ed25519 signature and matched SHA-256 seal",
            $isAuthValid && $sigAuthValid && $hashAuthValid,
            "Valid: " . ($isAuthValid ? 'true' : 'false') . ", Sig: " . ($sigAuthValid ? 'VALID' : 'INVALID') . ", Hash: " . ($hashAuthValid ? 'MATCH' : 'MISMATCH')
        );

        // Vector 3.2: Simulate record tampering (changing area_decimal from original to 99.99)
        $tamperRes = H::callRoute('POST', "/api/v1/ledger/tamper/{$deedNo}", [
            'new_area_decimal' => 99.99,
        ], $adminToken);
        self::check(
            'Tampering simulation endpoint accepts simulated tamper on deed and audits action',
            $tamperRes['status'] === 200,
            "Status: {$tamperRes['status']}"
        );

        // Vector 3.3: Verify tampered deed is immediately flagged with HIGH_RISK, invalid hash, and tampered fields
        $resTampered = H::callRoute('GET', "/api/v1/verify/deed/{$deedNo}");
        $ver = $resTampered['data']['verification'] ?? [];
        $isFlaggedInvalid = ($ver['is_valid'] ?? true) === false;
        $isVerdictHighRisk = ($ver['verdict'] ?? '') === 'HIGH_RISK';
        $hasTamperedField = false;
        foreach ($ver['tampered_fields'] ?? [] as $tf) {
            if (($tf['field'] ?? '') === 'area_decimal') {
                $hasTamperedField = true;
                break;
            }
        }
        self::check(
            "Tampered deed {$deedNo} immediately fails verification with is_valid=false, verdict=HIGH_RISK, and area_decimal flagged",
            $resTampered['status'] === 200 && $isFlaggedInvalid && $isVerdictHighRisk && $hasTamperedField,
            "Status: {$resTampered['status']}, is_valid: " . ($isFlaggedInvalid ? 'false (FAIL DETECTED)' : 'true (MISSED)') . ", Verdict: " . ($ver['verdict'] ?? '') . ", Field: " . ($hasTamperedField ? 'area_decimal detected' : 'none')
        );

        // Vector 3.4: Verify QR short hash validation with mismatched query parameter
        $resQrMismatch = H::callRoute('GET', "/api/v1/verify/deed/{$deedNo}", [], null, ['h' => '000000000000']);
        $qrInvalid = ($resQrMismatch['data']['verification']['is_valid'] ?? true) === false;
        $qrMatches = ($resQrMismatch['data']['qr_short_hash_matches'] ?? true) === false;
        self::check(
            'QR seal verification with mismatched hash query parameter fails closed',
            $resQrMismatch['status'] === 200 && $qrInvalid && $qrMatches,
            "Status: {$resQrMismatch['status']}, QRMatches: " . ($qrMatches ? 'false (TAMPER BLOCKED)' : 'true')
        );

        // Vector 3.5: Restore deed to original authentic state
        $resRestore = H::callRoute('POST', "/api/v1/ledger/restore/{$deedNo}", [], $adminToken);
        $resRestoredVer = H::callRoute('GET', "/api/v1/verify/deed/{$deedNo}");
        $isRestoredValid = ($resRestoredVer['data']['verification']['is_valid'] ?? false) === true;
        self::check(
            "Restoring deed {$deedNo} returns cryptographic ledger to authentic valid state (is_valid=true)",
            $resRestore['status'] === 200 && $isRestoredValid,
            "Status: {$resRestore['status']}, is_valid: " . ($isRestoredValid ? 'true (RESTORED)' : 'false')
        );
    }
}

RuleM3T3CryptoAdversarialChallenge::run();
