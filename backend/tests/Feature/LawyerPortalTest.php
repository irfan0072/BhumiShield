<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Services\JwtAuthService;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

final class LawyerPortalTest
{
    private static function assertTrue(bool $cond, string $msg = 'Assertion failed'): void
    {
        if (!$cond) {
            throw new \RuntimeException($msg);
        }
    }

    private static function assertEqual(mixed $expected, mixed $actual, string $msg = ''): void
    {
        if ($expected !== $actual) {
            $eStr = is_scalar($expected) ? (string) $expected : json_encode($expected);
            $aStr = is_scalar($actual) ? (string) $actual : json_encode($actual);
            throw new \RuntimeException("{$msg} Expected [{$eStr}] but got [{$aStr}]");
        }
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
        $tmpDb = sys_get_temp_dir() . '/bhumishield_lawyer_test_' . getmypid() . '.sqlite';
        putenv("BHUMISHIELD_TEST_DB={$tmpDb}");
        $_ENV['BHUMISHIELD_TEST_DB'] = $tmpDb;
        DB::resetConnection();

        (new DatabaseSeeder())->run(true);

        $passed = 0;

        // 1. Verify Lawyer Active
        $res = self::callRoute('POST', '/api/v1/lawyers/verify', ['bar_council_no' => 'BC-DH-14285']);
        self::assertEqual(200, $res['status'], 'Verify active lawyer status');
        self::assertTrue($res['body']['verified'] === true, 'Lawyer should be verified');
        self::assertEqual('ব্যারিস্টার মো. নাজমুল হুদা', $res['body']['lawyer']['lawyer_name_bn']);
        $passed++;

        // 2. Verify Lawyer Suspended
        $resSusp = self::callRoute('POST', '/api/v1/lawyers/verify', ['bar_council_no' => 'BC-SUSP-99999']);
        self::assertEqual(403, $resSusp['status'], 'Suspended lawyer should fail with 403');
        self::assertEqual('LAWYER_LICENSE_SUSPENDED', $resSusp['body']['code']);
        $passed++;

        // 3. Verify Lawyer Not Found
        $res404 = self::callRoute('POST', '/api/v1/lawyers/verify', ['bar_council_no' => 'BC-NONEXISTENT']);
        self::assertEqual(404, $res404['status'], 'Nonexistent lawyer should fail with 404');
        $passed++;

        // 4. File Case via Alternative Lawyer Portal
        $fileRes = self::callRoute('POST', '/api/v1/lawyers/file-case', [
            'bar_council_no' => 'BC-DH-14285',
            'plot_id' => 1,
            'court_name' => 'বিজ্ঞ সিনিয়র সহকারী জজ আদালত, সাভার, ঢাকা',
            'suit_no' => 'দেওয়ানি মোকদ্দমা নং ৪৫/২০২৬',
            'dispute_type' => 'INJUNCTION',
            'case_stage' => 'STATUS_QUO_ISSUED',
            'plaintiff_name' => 'মো. রফিকুল ইসলাম',
            'defendant_name' => 'আব্দুল মজিদ ও অন্যান্য',
            'plaintiff_nid' => '19852694123456789',
            'disputed_area_decimal' => 12.5,
            'description_bn' => 'নালিশি জমিতে জবরদখল চেষ্টার প্রেক্ষিতে অন্তর্বর্তীকালীন নিষেধাজ্ঞা আবেদন।',
            'boundary_north' => 'রাস্তা',
            'boundary_south' => 'রহিম জমি',
            'boundary_east' => 'দাগ ১০২',
            'boundary_west' => 'খাল',
        ]);
        self::assertEqual(200, $fileRes['status'], 'File case should succeed');
        self::assertTrue(str_starts_with($fileRes['body']['case_no'], 'LAW-CASE-'), 'Case no format');
        self::assertTrue(!empty($fileRes['body']['verification']['content_hash']), 'Content hash should be generated');

        // Check dispute inserted with source = LAWYER_PORTAL
        $dispute = DB::selectOne('SELECT * FROM disputes WHERE id = ?', [$fileRes['body']['dispute_id']]);
        self::assertTrue($dispute !== null, 'Dispute row must exist');
        self::assertEqual('LAWYER_PORTAL', $dispute['source'], 'Source must be LAWYER_PORTAL');
        self::assertEqual('BC-DH-14285', $dispute['lawyer_bar_council_no'], 'Advocate license tracked');
        $passed++;

        // 5. Admin Lawyer Registry CRUD
        $adminUser = DB::selectOne("SELECT * FROM users WHERE username = 'admin'");
        $adminJwt = JwtAuthService::createToken([
            'sub' => $adminUser['username'],
            'role' => $adminUser['role'],
            'exp' => time() + 3600,
            'ver' => (int) ($adminUser['token_version'] ?? 1),
        ]);

        // List lawyers
        $listRes = self::callRoute('GET', '/api/v1/admin/lawyers', [], $adminJwt);
        self::assertEqual(200, $listRes['status'], 'Admin list lawyers status');
        self::assertTrue(count($listRes['body']['items']) >= 6, 'Should list seeded lawyers');
        self::assertTrue($listRes['body']['metrics']['cases_filed'] >= 1, 'Cases filed metric updated');
        $passed++;

        // Create new lawyer
        $createRes = self::callRoute('POST', '/api/v1/admin/lawyers', [
            'bar_council_no' => 'BC-KHL-55443',
            'lawyer_name_bn' => 'অ্যাডভোকেট সেলিনা আক্তার',
            'lawyer_name_en' => 'Advocate Selina Akter',
            'district_bar' => 'খুলনা জেলা বার অ্যাসোসিয়েশন',
            'phone' => '01715-998877',
            'status' => 'ACTIVE',
        ], $adminJwt);
        self::assertEqual(200, $createRes['status'], 'Admin create lawyer status');
        $newId = (int) $createRes['body']['id'];
        $passed++;

        // Update / Toggle status
        $updateRes = self::callRoute('PUT', "/api/v1/admin/lawyers/{$newId}", [
            'status' => 'SUSPENDED',
        ], $adminJwt);
        self::assertEqual(200, $updateRes['status'], 'Admin update lawyer status');
        $updated = DB::selectOne('SELECT status FROM authorized_lawyers WHERE id = ?', [$newId]);
        self::assertEqual('SUSPENDED', $updated['status'], 'Status should be SUSPENDED');
        $passed++;

        // Delete lawyer
        $delRes = self::callRoute('DELETE', "/api/v1/admin/lawyers/{$newId}", [], $adminJwt);
        self::assertEqual(200, $delRes['status'], 'Admin delete lawyer status');
        $deleted = DB::selectOne('SELECT id FROM authorized_lawyers WHERE id = ?', [$newId]);
        self::assertTrue($deleted === null, 'Lawyer should be deleted');
        $passed++;

        @unlink($tmpDb);
        return $passed;
    }
}
