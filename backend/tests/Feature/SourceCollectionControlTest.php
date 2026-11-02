<?php

declare(strict_types=1);

namespace Tests\Feature;

require_once __DIR__ . '/../../vendor/autoload.php';

use App\Http\Controllers\Api\V1\SourceIntelligenceController as C;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

final class SourceCollectionControlTest
{
    public static function runAll(): int
    {
        unset($_SERVER['HTTP_AUTHORIZATION']);
        putenv('HTTP_AUTHORIZATION=');
        $origDb = getenv('BHUMISHIELD_TEST_DB');
        $tmpDb = sys_get_temp_dir() . '/bhumishield_sc_test_' . getmypid() . '_' . bin2hex(random_bytes(4)) . '.sqlite';
        putenv("BHUMISHIELD_TEST_DB={$tmpDb}");
        $_ENV['BHUMISHIELD_TEST_DB'] = $tmpDb;
        putenv('APP_ENV=testing');
        DB::resetConnection();
        (new DatabaseSeeder())->run(true);

        echo "\n   PASS  Tests\\Feature\\SourceCollectionControlTest (Official Land Circular Intelligence Kill-Switch)\n";

        $n = 0;
        $checkControl = function (bool $ok, string $message) use (&$n): void {
            if (!$ok) throw new \RuntimeException($message);
            $n++;
            echo "  ✓ {$message}\n";
        };
        $denyControl = function (callable $f, string $code) use ($checkControl): void {
            try {
                $f();
                throw new \RuntimeException('Expected denial');
            } catch (\Throwable $e) {
                $v = json_decode($e->getMessage(), true);
                $checkControl(($v['code'] ?? '') === $code, 'Reject ' . $code);
            }
        };

        $admin = ['id' => 0, 'role' => 'admin', 'username' => 'synthetic.control.qa', 'is_active' => 1];
        $system = [...$admin, 'role' => 'system_admin'];
        $citizen = [...$admin, 'role' => 'citizen'];

        C::migrate();
        $checkControl(C::collectionSettings()['enabled'] === false, 'Existing installation defaults collection OFF');
        $s = C::collectionSettings();
        $body = ['enabled' => true, 'version' => $s['version'], 'reason' => 'Synthetic control regression test'];
        $denyControl(fn() => C::configureCollection($body), 'AUTH_REQUIRED');
        $denyControl(fn() => C::configureCollection($body, $citizen), 'FORBIDDEN_ROLE');
        $denyControl(fn() => C::configureCollection($body, [...$admin, 'is_active' => 0]), 'ACCOUNT_SUSPENDED');
        $denyControl(fn() => C::configureCollection([...$body, 'enabled' => 'false'], $admin), 'INVALID_COLLECTION_SETTING');
        $denyControl(fn() => C::configureCollection([...$body, 'reason' => 'short'], $admin), 'INVALID_COLLECTION_SETTING');

        $before = DB::select('SELECT id,last_attempt,lease_until FROM source_monitors ORDER BY id');
        $observations = DB::selectOne('SELECT COUNT(*) c FROM source_observations')['c'];
        $denyControl(fn() => C::collect(1, $admin), 'COLLECTION_GLOBALLY_DISABLED');
        $checkControl(DB::select('SELECT id,last_attempt,lease_until FROM source_monitors ORDER BY id') === $before, 'Blocked collect does not lease or attempt a source');
        $checkControl(DB::selectOne('SELECT COUNT(*) c FROM source_observations')['c'] === $observations, 'Blocked collect preserves prior observations');

        C::configureCollection($body, $system);
        $checkControl(C::collectionSettings()['enabled'] === true, 'Super admin can enable with reason');
        C::migrate();
        $checkControl(C::collectionSettings()['enabled'] === true, 'Migration preserves explicit configuration');
        $denyControl(fn() => C::configureCollection($body, $admin), 'COLLECTION_SETTING_CONFLICT');

        $id = DB::insert('INSERT INTO source_monitors(source_key,kind,title_bn,url,enabled,interval_hours) VALUES(?,?,?,?,0,24)', ['synthetic-disabled-control', 'LINK', 'Synthetic disabled source', 'https://land.gov.bd/qa-disabled']);
        $denyControl(fn() => C::collect($id, $admin), 'SOURCE_DISABLED');

        $now = C::collectionSettings();
        C::configureCollection(['enabled' => false, 'version' => $now['version'], 'reason' => 'Disable again after synthetic regression'], $admin);
        $checkControl(C::collectionSettings()['enabled'] === false, 'Admin can deactivate after enabling');
        $denyControl(fn() => C::collect($id, $admin), 'COLLECTION_GLOBALLY_DISABLED');

        $history = DB::select('SELECT enabled,actor,reason FROM source_collection_events ORDER BY id');
        $checkControl(count($history) === 2 && (int) $history[0]['enabled'] === 1 && (int) $history[1]['enabled'] === 0, 'Toggle changes retain actor, reason and ordered history');

        // Fresh database also receives OFF, without a business-data seed or network request.
        $fresh = (getenv('BHUMISHIELD_TEST_DB') ?: sys_get_temp_dir() . '/bhumishield_sc_fresh') . '.fresh';
        putenv('BHUMISHIELD_TEST_DB=' . $fresh);
        DB::resetConnection();
        $checkControl(C::collectionSettings()['enabled'] === false, 'Fresh installation defaults OFF');
        @unlink($fresh);

        if ($origDb) {
            putenv("BHUMISHIELD_TEST_DB={$origDb}");
            $_ENV['BHUMISHIELD_TEST_DB'] = $origDb;
        } else {
            putenv('BHUMISHIELD_TEST_DB=');
            unset($_ENV['BHUMISHIELD_TEST_DB']);
        }
        if ($tmpDb && file_exists($tmpDb)) {
            @unlink($tmpDb);
        }
        DB::resetConnection();

        echo "\n  Source Collection Control Tests:    {$n} passed, 0 failed ({$n} total)\n\n";
        return 0;
    }
}

if (PHP_SAPI === 'cli' && isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    exit(SourceCollectionControlTest::runAll());
}
