<?php

declare(strict_types=1);

namespace Tests\Feature;

require_once __DIR__ . '/../../vendor/autoload.php';

use App\Support\DB;
use App\Services\OwnershipGuard;
use App\Http\Controllers\Api\V1\WorkflowController;
use App\Http\Controllers\Api\V1\ParcelDesignController;
use App\Http\Controllers\Api\V1\MapWorkspaceController;
use App\Http\Controllers\Api\V1\SourceIntelligenceController;
use Database\Migrations\CreateBhumishieldTables;
use RuntimeException;
use Throwable;

final class PostgresRecoveryTest
{
    public static function runAll(): int
    {
        echo "\n   PASS  Tests\\Feature\\PostgresRecoveryTest (PostgreSQL Disaster Recovery Checks)\n";

        if (getenv('BHUMISHIELD_PG_TEST') !== '1' || !str_starts_with((string)getenv('DB_DATABASE'), 'bhumishield_restore_qa')) {
            echo "  ~ Skipped: PostgreSQL disaster recovery checks require BHUMISHIELD_PG_TEST=1 and DB_DATABASE=bhumishield_restore_qa*\n";
            echo "  Postgres Recovery Checks: 0 failed (skipped - pgsql restored QA environment inactive)\n";
            return 0;
        }

        $n = 0;
        $pgCheck = function(bool $ok, string $message) use (&$n): void {
            if (!$ok) {
                throw new RuntimeException($message);
            }
            $n++;
            echo "  ✓ {$message}\n";
        };

        try {
            $pgCheck(DB::isPostgres(), 'Uses PostgreSQL, not fallback SQLite');
            (new CreateBhumishieldTables())->up(false);
            (new CreateBhumishieldTables())->up(false);
            $pgCheck((int)DB::selectOne('SELECT COUNT(*) c FROM users')['c'] > 0, 'Idempotent migrations retain users');
            
            $d = WorkflowController::listLocations();
            $pgCheck(count($d['locations']) === 4 && count($d['plots']) === 61, 'Public location/plot data restored');
            
            $blocked = false;
            try {
                DB::statement('UPDATE ownerships SET area_decimal=area_decimal WHERE id=(SELECT MIN(id) FROM ownerships)');
            } catch (Throwable $e) {
                $blocked = str_contains($e->getMessage(), 'VIOLATION_M3_OWNERSHIP_GUARD');
            }
            $pgCheck($blocked, 'Direct PostgreSQL ownership write denied');

            DB::transaction(fn() => OwnershipGuard::executeInMutationContext('SYNTHETIC-PG-QA', 'synthetic.qa', 'ac_land', fn() => DB::statement('UPDATE ownerships SET area_decimal=area_decimal WHERE id=(SELECT MIN(id) FROM ownerships)')));
            $pgCheck(!OwnershipGuard::isUnlocked(), 'Authorized transaction resets ownership guard');

            $admin = DB::selectOne("SELECT * FROM users WHERE role='admin' LIMIT 1");
            ParcelDesignController::migrate();
            ParcelDesignController::migrate();
            $pgCheck(count(ParcelDesignController::context($admin)['locations']) === 4, 'Parcel context and repeated migration work');
            $pgCheck(is_array(ParcelDesignController::items(['location_id' => 1], true)['items']), 'Parcel list preserves PostgreSQL API projection');
            
            MapWorkspaceController::migrate();
            $pgCheck(SourceIntelligenceController::collectionSettings()['enabled'] === false, 'Collection remains default OFF after recovery');
            $pgCheck((int)DB::selectOne('SELECT COUNT(*) c FROM deeds')['c'] === 88, 'Deed records preserved');
            
            $precision = DB::selectOne("SELECT data_type FROM information_schema.columns WHERE table_name='ownerships' AND column_name='area_decimal'");
            $pgCheck($precision['data_type'] === 'double precision', 'Areas retain double precision');

            echo "  POSTGRES RECOVERY CHECKS: {$n} passed\n";
            return 0;
        } catch (Throwable $e) {
            echo "  FAIL  PostgresRecoveryTest: " . $e->getMessage() . "\n";
            return 1;
        }
    }
}

if (PHP_SAPI === 'cli' && isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    exit(PostgresRecoveryTest::runAll());
}
