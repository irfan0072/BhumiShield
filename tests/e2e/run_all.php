<?php

declare(strict_types=1);

namespace Tests\E2E;

require_once __DIR__ . '/E2ETestHelper.php';
require_once __DIR__ . '/tier1_feature_coverage.test.php';
require_once __DIR__ . '/tier2_boundary_corner.test.php';
require_once __DIR__ . '/tier3_cross_feature.test.php';
require_once __DIR__ . '/tier4_real_world_scenarios.test.php';

use Tests\E2E\Tier1FeatureCoverageTest;
use Tests\E2E\Tier2BoundaryCornerTest;
use Tests\E2E\Tier3CrossFeatureTest;
use Tests\E2E\Tier4RealWorldScenariosTest;

final class MasterTestRunner
{
    public static function main(): int
    {
        $startAll = microtime(true);
        $suites = [
            Tier1FeatureCoverageTest::class,
            Tier2BoundaryCornerTest::class,
            Tier3CrossFeatureTest::class,
            Tier4RealWorldScenariosTest::class,
        ];

        echo "\n";
        echo "========================================================================================\n";
        echo "          BHUMISHIELD (ভূমি সুরক্ষা) — OPAQUE-BOX E2E TEST SUITE RUNNER\n";
        echo "========================================================================================\n";
        echo " Environment: PHP " . PHP_VERSION . " | OS: " . PHP_OS . " | Timestamp: " . gmdate('c') . "\n";
        echo " Target: All 21 Role Portals, Cadastral Engine, Ledger Integrity, Real-World Workflows\n";
        echo "----------------------------------------------------------------------------------------\n\n";

        $allReports = [];
        $totalTests = 0;
        $totalPassed = 0;
        $totalFailed = 0;

        foreach ($suites as $suiteClass) {
            /** @var array $report */
            $report = $suiteClass::runAll();
            $allReports[] = $report;
            $totalTests += $report['total'];
            $totalPassed += $report['passed'];
            $totalFailed += $report['failed'];

            $statusBadge = ($report['failed'] === 0) ? "[PASS]" : "[FAIL]";
            echo "----------------------------------------------------------------------------------------\n";
            echo " {$statusBadge} {$report['tier']}\n";
            echo " Passed: {$report['passed']}/{$report['total']} | Failed: {$report['failed']}\n";
            echo "----------------------------------------------------------------------------------------\n";

            foreach ($report['results'] as $res) {
                $icon = ($res['status'] === 'PASS') ? "  ✓ " : "  ✖ ";
                $time = sprintf("%6.1fms", $res['elapsed_ms'] ?? 0.0);
                echo "{$icon} [{$time}] {$res['description']}\n";
                if ($res['status'] === 'FAIL' && !empty($res['error'])) {
                    echo "      ERROR: {$res['error']}\n";
                }
            }
            echo "\n";
        }

        $totalElapsedMs = round((microtime(true) - $startAll) * 1000, 2);
        $passRate = $totalTests > 0 ? round(($totalPassed / $totalTests) * 100, 1) : 0.0;

        echo "========================================================================================\n";
        echo "                                 TEST SUITE SUMMARY\n";
        echo "========================================================================================\n";
        echo " Total Tests:      {$totalTests}\n";
        echo " Passed:           {$totalPassed} ({$passRate}%)\n";
        echo " Failed:           {$totalFailed}\n";
        echo " Total Execution:  {$totalElapsedMs} ms (" . round($totalElapsedMs / 1000, 2) . "s)\n";
        echo " Overall Result:   " . ($totalFailed === 0 ? "ALL PASS (EXIT 0)" : "FAILURES DETECTED (EXIT 1)") . "\n";
        echo "========================================================================================\n\n";

        // Write structured JSON results artifact
        $jsonSummary = [
            'timestamp' => gmdate('c'),
            'total' => $totalTests,
            'passed' => $totalPassed,
            'failed' => $totalFailed,
            'pass_rate_percent' => $passRate,
            'elapsed_ms' => $totalElapsedMs,
            'status' => ($totalFailed === 0) ? 'PASS' : 'FAIL',
            'suites' => $allReports,
        ];

        @file_put_contents(
            __DIR__ . '/results.json',
            json_encode($jsonSummary, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
        );

        return ($totalFailed === 0) ? 0 : 1;
    }
}

// Exit with matching exit code
exit(MasterTestRunner::main());
