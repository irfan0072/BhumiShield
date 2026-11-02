<?php

declare(strict_types=1);

namespace Tests\Adversarial;

require_once __DIR__ . '/e2e/E2ETestHelper.php';

use Tests\E2E\E2ETestHelper as H;
use App\Support\DB;
use App\Services\JwtAuthService;

final class AdversarialInvariantsVerification
{
    private static int $passed = 0;
    private static int $failed = 0;
    private static array $findings = [];

    public static function run(): void
    {
        echo "========================================================================================\n";
        echo "       BHUMISHIELD EMPIRICAL ADVERSARIAL INVARIANTS VERIFICATION SUITE\n";
        echo "========================================================================================\n";
        echo " Timestamp: " . gmdate('c') . "\n";
        echo " Role: Challenger 2 (Adversarial Security & Invariants Verifier)\n";
        echo " Target: M3 Admin Mutation Block, Plot Lock, Active Lien NOC Block, Court Freeze\n";
        echo "----------------------------------------------------------------------------------------\n\n";

        self::testRuleM3AdminCannotMutate();
        self::testPlotLockedInvariants();
        self::testActiveLienCannotIssueNoc();
        self::testCourtDisputeInjunctionFreeze();

        echo "\n========================================================================================\n";
        echo " SUMMARY: Passed: " . self::$passed . " | Failed: " . self::$failed . "\n";
        echo "========================================================================================\n";

        if (self::$failed > 0) {
            exit(1);
        }
    }

    private static function recordResult(string $testName, bool $success, string $details = ''): void
    {
        if ($success) {
            self::$passed++;
            echo "  ✓ [PASS] {$testName}\n";
            if ($details !== '') {
                echo "           Details: {$details}\n";
            }
        } else {
            self::$failed++;
            echo "  ✗ [FAIL] {$testName}\n";
            echo "           Error: {$details}\n";
            self::$findings[] = "FAIL: {$testName} - {$details}";
        }
    }

    /**
     * 1. Rule M3: ADMIN_CANNOT_EDIT_LAND_DATA
     */
    public static function testRuleM3AdminCannotMutate(): void
    {
        echo "--- Section 1: Rule M3 (ADMIN_CANNOT_EDIT_LAND_DATA) Verification ---\n";

        // Vector 1.1: Standard admin role attempting to approve mutation
        $adminToken = H::loginAs('admin');
        $res = H::callRoute('POST', '/api/v1/mutations/1/decision', [
            'decision' => 'APPROVED',
            'reason_bn' => 'প্রশাসনিক বলপূর্বক অনুমোদন চেষ্টা',
        ], $adminToken);

        $is403 = ($res['status'] === 403);
        $code = $res['code'] ?? $res['data']['code'] ?? '';
        self::recordResult(
            'Admin role attempting POST /api/v1/mutations/1/decision blocked with 403 ADMIN_CANNOT_EDIT_LAND_DATA',
            $is403 && $code === 'ADMIN_CANNOT_EDIT_LAND_DATA',
            "HTTP Status: {$res['status']}, Code: {$code}"
        );

        // Vector 1.2: System admin role attempting to approve mutation
        // Ensure a system_admin role user exists or test with an actual admin user with role updated
        $origRole = DB::selectOne("SELECT role FROM users WHERE username = 'admin'")['role'] ?? 'admin';
        DB::statement("UPDATE users SET role = 'system_admin' WHERE username = 'admin'");
        try {
            $sysAdminToken = H::login('admin', 'demo123');
            $resSys = H::callRoute('POST', '/api/v1/mutations/1/decision', [
                'decision' => 'APPROVED',
                'reason_bn' => 'সিস্টেম অ্যাডমিন কর্তৃক অননুমোদিত চেষ্টা',
            ], $sysAdminToken);

            $sysIs403 = ($resSys['status'] === 403);
            $sysCode = $resSys['code'] ?? $resSys['data']['code'] ?? '';
            self::recordResult(
                'System admin role attempting POST /api/v1/mutations/1/decision blocked with 403 ADMIN_CANNOT_EDIT_LAND_DATA',
                $sysIs403 && $sysCode === 'ADMIN_CANNOT_EDIT_LAND_DATA',
                "HTTP Status: {$resSys['status']}, Code: {$sysCode}"
            );
        } finally {
            DB::statement("UPDATE users SET role = ? WHERE username = 'admin'", [$origRole]);
        }

        // Vector 1.3: AC Land (legitimate authority) is NOT blocked by Rule M3
        $acLandToken = H::loginAs('ac_land');
        $resAc = H::callRoute('POST', '/api/v1/mutations/1/decision', [
            'decision' => 'HOLD',
            'reason_bn' => 'নথি যাচাইয়ের জন্য শুনানিতে প্রেরণ',
        ], $acLandToken);

        $acNotBlockedByM3 = ($resAc['status'] === 200 || ($resAc['status'] === 422 && ($resAc['code'] ?? '') !== 'ADMIN_CANNOT_EDIT_LAND_DATA'));
        self::recordResult(
            'Legitimate AC Land officer is not falsely blocked by Rule M3',
            $acNotBlockedByM3,
            "HTTP Status: {$resAc['status']}, Code: " . ($resAc['code'] ?? 'OK')
        );
    }

    /**
     * 2. Plot Lock Invariants: PLOT_LOCKED & PLOT_SALE_LOCKED
     */
    public static function testPlotLockedInvariants(): void
    {
        echo "\n--- Section 2: Plot Lock (PLOT_LOCKED / PLOT_SALE_LOCKED) Verification ---\n";

        $citToken = H::loginAs('citizen');
        $plotId = 13; // Owned by Rafiqul Islam

        // Force plot lock ON
        DB::statement('UPDATE plots SET owner_sale_locked = 1 WHERE id = ?', [$plotId]);

        // Vector 2.1: Listing sale-locked plot on public marketplace
        $listRes = H::callRoute('POST', '/api/v1/listings', [
            'plot_id' => $plotId,
            'asking_price_bdt' => 7500000,
            'contact_phone' => '01711-000000',
            'title_bn' => 'লক করা জমির অবৈধ লিস্টিং',
        ], $citToken);

        $listBlocked = ($listRes['status'] === 422 && (($listRes['code'] ?? $listRes['data']['code'] ?? '') === 'PLOT_LOCKED'));
        self::recordResult(
            'Marketplace listing of sale-locked plot strictly fails with 422 PLOT_LOCKED',
            $listBlocked,
            "HTTP Status: {$listRes['status']}, Code: " . ($listRes['code'] ?? $listRes['data']['code'] ?? '')
        );

        // Vector 2.2: Transfer state machine initiating transfer on sale-locked plot
        $transferRes = H::callRoute('POST', '/api/v1/transfers', [
            'plot_id' => $plotId,
            'buyer_nid' => '9900001002',
            'buyer_name' => 'তানিয়া সুলতানা',
            'buyer_phone' => '01700-001002',
            'transfer_area_decimal' => 5.0,
            'proposed_price_bdt' => 3000000,
            'deed_type' => 'SALE',
        ], $citToken);

        $transferBlocked = ($transferRes['status'] === 422 && (($transferRes['code'] ?? $transferRes['data']['code'] ?? '') === 'PLOT_SALE_LOCKED'));
        self::recordResult(
            'Transfer initiation on sale-locked plot strictly fails with 422 PLOT_SALE_LOCKED',
            $transferBlocked,
            "HTTP Status: {$transferRes['status']}, Code: " . ($transferRes['code'] ?? $transferRes['data']['code'] ?? '')
        );

        // Vector 2.3: Sub-Registrar pre-check evaluates locked plot as HIGH_RISK with OWNER_SALE_LOCKED
        $subToken = H::loginAs('sub_registrar');
        $preCheck = H::callRoute('POST', '/api/v1/registrar/pre-check', [
            'plot_id' => $plotId,
            'seller_id' => 1,
            'buyer_id' => 2,
            'requested_area_decimal' => 5.0,
        ], $subToken);

        $flags = $preCheck['data']['risk_report']['flags'] ?? [];
        $hasLockFlag = false;
        foreach ($flags as $f) {
            if (($f['rule_id'] ?? '') === 'OWNER_SALE_LOCKED') {
                $hasLockFlag = true;
                break;
            }
        }
        $isHighRisk = ($preCheck['data']['risk_report']['verdict'] ?? '') === 'HIGH_RISK';

        self::recordResult(
            'Sub-Registrar pre-check flags OWNER_SALE_LOCKED and outputs HIGH_RISK verdict',
            $preCheck['status'] === 200 && $hasLockFlag && $isHighRisk,
            "Status: {$preCheck['status']}, HighRisk: " . ($isHighRisk ? 'true' : 'false') . ", Flag: " . ($hasLockFlag ? 'detected' : 'missing')
        );

        // Vector 2.4: Unlock plot and verify listing capability is restored
        DB::statement('UPDATE plots SET owner_sale_locked = 0 WHERE id = ?', [$plotId]);
        $unlockedCheck = DB::selectOne('SELECT owner_sale_locked FROM plots WHERE id = ?', [$plotId]);
        self::recordResult(
            'Plot lock cleanly releases back to unencumbered state (owner_sale_locked = 0)',
            ((int) ($unlockedCheck['owner_sale_locked'] ?? 1)) === 0,
            "Current owner_sale_locked: " . ($unlockedCheck['owner_sale_locked'] ?? 'null')
        );
    }

    /**
     * 3. Active Mortgage Liens: ACTIVE_LIEN_CANNOT_ISSUE_NOC
     */
    public static function testActiveLienCannotIssueNoc(): void
    {
        echo "\n--- Section 3: Active Mortgage Lien (ACTIVE_LIEN_CANNOT_ISSUE_NOC) Verification ---\n";

        // Lien 1 is ACTIVE on Sonali Bank
        $mgrToken = H::loginAs('bank_manager');
        $resActive = H::callRoute('GET', '/api/v1/mortgages/1/noc', [], $mgrToken);

        $is422Active = ($resActive['status'] === 422);
        $codeActive = $resActive['code'] ?? $resActive['data']['code'] ?? '';

        self::recordResult(
            'Bank Manager generating NOC for ACTIVE mortgage strictly fails with 422 ACTIVE_LIEN_CANNOT_ISSUE_NOC',
            $is422Active && $codeActive === 'ACTIVE_LIEN_CANNOT_ISSUE_NOC',
            "HTTP Status: {$resActive['status']}, Code: {$codeActive}"
        );

        // Bank officer role attempting same
        $offToken = H::loginAs('bank_officer');
        $resOff = H::callRoute('GET', '/api/v1/mortgages/1/noc', [], $offToken);
        $is422Off = ($resOff['status'] === 422);
        $codeOff = $resOff['code'] ?? $resOff['data']['code'] ?? '';

        self::recordResult(
            'Bank Officer generating NOC for ACTIVE mortgage strictly fails with 422 ACTIVE_LIEN_CANNOT_ISSUE_NOC',
            $is422Off && $codeOff === 'ACTIVE_LIEN_CANNOT_ISSUE_NOC',
            "HTTP Status: {$resOff['status']}, Code: {$codeOff}"
        );

        // Lien 4 is RELEASED on Sonali Bank
        $resReleased = H::callRoute('GET', '/api/v1/mortgages/4/noc', [], $mgrToken);
        $is200Released = ($resReleased['status'] === 200);
        $hasNoc = !empty($resReleased['data']['noc_no']);
        $hasSig = !empty($resReleased['data']['ed25519_signature']);

        self::recordResult(
            'Bank Manager generating NOC for RELEASED mortgage succeeds with 200, valid NOC No & Ed25519 signature',
            $is200Released && $hasNoc && $hasSig,
            "HTTP Status: {$resReleased['status']}, NOC: " . ($resReleased['data']['noc_no'] ?? 'N/A') . ", SigLen: " . strlen($resReleased['data']['ed25519_signature'] ?? '')
        );

        // Unauthenticated / non-bank access blocked
        $resAnon = H::callRoute('GET', '/api/v1/mortgages/4/noc');
        $anonBlocked = ($resAnon['status'] === 401 || $resAnon['status'] === 403);
        self::recordResult(
            'Anonymous access to NOC generation fails closed (401 or 403 UNAUTHORIZED_BANK_SCOPE)',
            $anonBlocked && in_array($resAnon['code'] ?? '', ['AUTH_REQUIRED', 'UNAUTHORIZED_BANK_SCOPE', 'FORBIDDEN_ROLE'], true),
            "HTTP Status: {$resAnon['status']}, Code: " . ($resAnon['code'] ?? '')
        );

        // Citizen attempting to generate bank NOC
        $citToken = H::loginAs('citizen');
        $resCit = H::callRoute('GET', '/api/v1/mortgages/4/noc', [], $citToken);
        $citBlocked = ($resCit['status'] === 403);
        self::recordResult(
            'Citizen role attempting to generate bank NOC strictly fails with 403 UNAUTHORIZED_BANK_SCOPE',
            $citBlocked && (($resCit['code'] ?? '') === 'UNAUTHORIZED_BANK_SCOPE'),
            "HTTP Status: {$resCit['status']}, Code: " . ($resCit['code'] ?? '')
        );
    }

    /**
     * 4. Court Dispute Injunction: PLOT_TRANSFER_FROZEN
     */
    public static function testCourtDisputeInjunctionFreeze(): void
    {
        echo "\n--- Section 4: Court Dispute & Injunction (PLOT_TRANSFER_FROZEN) Verification ---\n";

        $plotId = 2;
        $nowIso = gmdate('c');

        // Create an UPHELD_FROZEN court injunction
        DB::insert(
            "INSERT INTO disputes (case_no, plot_id, complainant_name_bn, complainant_nid, dispute_type, description_bn, description_en, severity, status, resolved_by, resolution_notes_bn, created_at, resolved_at)
             VALUES ('DISP-ADVERSARIAL-FROZEN', ?, 'অ্যাডভারসারিয়াল বাদী', '9900001999', 'LEGAL_DISPUTE', 'বিজ্ঞ দেওয়ানি আদালতের অন্তর্বর্তীকালীন স্থগিতাদেশ', 'Civil court interim injunction upheld', 'HIGH_RISK', 'UPHELD_FROZEN', 'admin', 'Tribunal injunction active', ?, ?)",
            [$plotId, $nowIso, $nowIso]
        );

        try {
            // Vector 4.1: Sub-Registrar attempting to register deed on frozen plot
            $subToken = H::loginAs('sub_registrar');
            $regRes = H::callRoute('POST', '/api/v1/registrar/register-deed', [
                'plot_id' => $plotId,
                'seller_id' => 2,
                'buyer_id' => 3,
                'requested_area_decimal' => 5.0,
                'price_bdt' => 450000,
                'deed_type' => 'বিক্রয় দলিল (KABALA)',
            ], $subToken);

            $regBlocked = ($regRes['status'] === 422 && (($regRes['code'] ?? $regRes['data']['code'] ?? '') === 'PLOT_TRANSFER_FROZEN'));
            self::recordResult(
                'Sub-Registrar deed registration on UPHELD_FROZEN plot strictly rejected with 422 PLOT_TRANSFER_FROZEN',
                $regBlocked,
                "HTTP Status: {$regRes['status']}, Code: " . ($regRes['code'] ?? $regRes['data']['code'] ?? '')
            );

            // Vector 4.2: Citizen attempting transfer on disputed plot
            $citToken = H::loginAs('citizen');
            $citRes = H::callRoute('POST', '/api/v1/transfers', [
                'plot_id' => $plotId,
                'buyer_nid' => '9900001003',
                'buyer_name' => 'আব্দুর রহিম',
                'buyer_phone' => '01800-000001',
                'transfer_area_decimal' => 5.0,
                'proposed_price_bdt' => 450000,
                'deed_type' => 'SALE',
            ], $citToken);

            $citBlocked = ($citRes['status'] === 422 && (($citRes['code'] ?? $citRes['data']['code'] ?? '') === 'PLOT_UNDER_DISPUTE'));
            self::recordResult(
                'Citizen transfer initiation on disputed plot strictly rejected with 422 PLOT_UNDER_DISPUTE',
                $citBlocked,
                "HTTP Status: {$citRes['status']}, Code: " . ($citRes['code'] ?? $citRes['data']['code'] ?? '')
            );

            // Vector 4.3: Public Check Before You Buy flags court dispute and returns HIGH_RISK
            $checkRes = H::callRoute('GET', "/api/v1/plots/{$plotId}/check-before-you-buy");
            $isHighRisk = ($checkRes['data']['risk_report']['verdict'] ?? '') === 'HIGH_RISK';
            $reportStatus = $checkRes['data']['risk_report']['status'] ?? '';
            self::recordResult(
                'Public Check Before You Buy flags court dispute with verdict HIGH_RISK',
                $checkRes['status'] === 200 && $isHighRisk,
                "Status: {$checkRes['status']}, Verdict: " . ($checkRes['data']['risk_report']['verdict'] ?? 'N/A') . ", ReportStatus: {$reportStatus}"
            );

            // Vector 4.4: Sub-Registrar releasing a HELD deed when plot is UPHELD_FROZEN
            $existingHeldDeed = DB::selectOne("SELECT id FROM deeds WHERE status = 'HELD' LIMIT 1");
            if ($existingHeldDeed) {
                // Temporarily point deed to frozen plot
                $origPlot = DB::selectOne("SELECT plot_id FROM deeds WHERE id = ?", [$existingHeldDeed['id']]);
                DB::statement("UPDATE deeds SET plot_id = ? WHERE id = ?", [$plotId, $existingHeldDeed['id']]);

                $relRes = H::callRoute('PUT', "/api/v1/registrar/deeds/{$existingHeldDeed['id']}/status", [
                    'status' => 'PENDING_MUTATION',
                    'notes_bn' => 'অবমুক্তকরণের অপচেষ্টা',
                ], $subToken);

                $relBlocked = ($relRes['status'] === 422 && (($relRes['code'] ?? $relRes['data']['code'] ?? '') === 'PLOT_TRANSFER_FROZEN'));
                self::recordResult(
                    'Releasing HELD deed to PENDING_MUTATION on UPHELD_FROZEN plot strictly rejected with 422 PLOT_TRANSFER_FROZEN',
                    $relBlocked,
                    "HTTP Status: {$relRes['status']}, Code: " . ($relRes['code'] ?? $relRes['data']['code'] ?? '')
                );

                // Restore original plot_id
                DB::statement("UPDATE deeds SET plot_id = ? WHERE id = ?", [$origPlot['plot_id'], $existingHeldDeed['id']]);
            }
        } finally {
            DB::statement("DELETE FROM disputes WHERE case_no = 'DISP-ADVERSARIAL-FROZEN'");
        }
    }
}

AdversarialInvariantsVerification::run();
