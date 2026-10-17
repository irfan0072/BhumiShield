<?php

declare(strict_types=1);

namespace App\Services;

use App\Support\Clock;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Synthetic Data Factory for BhumiShield (Prompt v3 Section 4).
 * Builds a deterministic synthetic land record world using application domain services,
 * 12-month clock progression, and simulator isolation.
 */
class WorldSeedService
{
    public static function seedWorld(string $profile = 'pilot', int $seed = 2026, bool $fresh = false): array
    {
        mt_srand($seed);
        srand($seed);

        $currentEnv = strtolower((string) (getenv('APP_ENV') ?: ($_ENV['APP_ENV'] ?? 'development')));
        if ($currentEnv === 'production') {
            throw new \RuntimeException('Synthetic world seeding is strictly disabled in production environment.');
        }

        // Initialize clock at 12 months in the past
        Clock::setTestNow('2025-10-18T09:00:00+06:00');

        echo "INFO  Synthetic Data Factory (Profile: {$profile}, Seed: {$seed})\n";
        echo "      Simulated Clock: " . Clock::iso() . "\n";

        // Execute primary database seeding with provenance
        $seeder = new DatabaseSeeder();
        $summary = $seeder->run($fresh);

        // Advance simulated clock through historical milestones
        Clock::advanceDays(45); // Historical settlements
        Clock::advanceDays(90); // Deeds registered
        Clock::advanceDays(90); // Mutations & field reports
        Clock::advanceDays(140); // Present day: 2026-10-18
        echo "      Simulated Clock advanced to present: " . Clock::iso() . "\n";

        // Populate isolated external simulators (sim_*) with synthetic reference records
        self::populateSimulators();

        $plotsCount = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM plots')['c'] ?? 0);
        $personsCount = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM persons')['c'] ?? 0);
        $deedsCount = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM deeds')['c'] ?? 0);
        $mutationsCount = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM mutations')['c'] ?? 0);
        $liensCount = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM mortgages_liens')['c'] ?? 0);
        $officesCount = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM offices')['c'] ?? 0);

        return [
            'status' => 'COMPLETED',
            'profile' => $profile,
            'seed' => $seed,
            'clock_now' => Clock::iso(),
            'plots' => $plotsCount,
            'persons' => $personsCount,
            'deeds' => $deedsCount,
            'mutations' => $mutationsCount,
            'liens' => $liensCount,
            'offices' => $officesCount,
            'simulators_populated' => true,
        ];
    }

    private static function populateSimulators(): void
    {
        // 1. Sync Persons to sim_persons and sim_biometric_enrollments
        $persons = DB::select('SELECT * FROM persons LIMIT 250');
        foreach ($persons as $p) {
            $nid = (string) $p['nid'];
            DB::insert(
                'INSERT OR IGNORE INTO sim_persons (nid, full_name_bn, full_name_en, dob, father_name_bn, mother_name_bn, address_bn, is_deceased, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $nid,
                    $p['name_bn'],
                    $p['name_en'],
                    $p['dob'] ?? '1985-05-15',
                    $p['father_name_bn'] ?? '',
                    $p['mother_name_bn'] ?? '',
                    $p['address_bn'] ?? 'বিরুলিয়া, সাভার, ঢাকা',
                    (int) ($p['is_deceased'] ?? 0),
                    Clock::iso(),
                ]
            );

            DB::insert(
                'INSERT OR IGNORE INTO sim_biometric_enrollments (nid, enrollment_hash, default_match_score, has_defect, created_at)
                 VALUES (?, ?, ?, ?, ?)',
                [
                    $nid,
                    hash('sha256', "BIO:{$nid}:ENROLLMENT"),
                    94.5,
                    0,
                    Clock::iso(),
                ]
            );
        }

        // 2. Populate sim_sms_outbox with baseline OTPs and notices
        ProviderManager::getSmsProvider()->sendOtp('01700-001001', '784219', 'LOGIN');
        ProviderManager::getSmsProvider()->sendOtp('01700-001002', '319082', 'CO_OWNER_CONSENT');
        ProviderManager::getSmsProvider()->sendMessage('01700-001001', 'ভূমি সুরক্ষা: আপনার নামজারি আবেদন নং MUT-2026-10001 অনুমোদিত হয়েছে।');

        // 3. Populate sim_gateway_holdings (LD Tax baseline)
        $plots = DB::select('SELECT p.*, l.mouza_en FROM plots p JOIN locations l ON l.id = p.location_id LIMIT 60');
        foreach ($plots as $idx => $pl) {
            $holdingNo = (string) (5000 + $idx);
            $mouzaCode = (string) ($pl['mouza_en'] ?? 'Birulia');
            $taxStatus = ($idx % 12 === 0) ? 'UNPAID' : 'PAID';
            $paidAt = $taxStatus === 'PAID' ? Clock::iso() : null;
            $qrHash = hash('sha256', "TAX:{$holdingNo}:{$mouzaCode}:2025-2026");

            DB::insert(
                'INSERT OR IGNORE INTO sim_gateway_holdings (holding_no, mouza_code, owner_name_bn, tax_status, fiscal_year, last_paid_amount, paid_at, dakhila_qr_hash, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $holdingNo,
                    $mouzaCode,
                    'মো. রফিকুল ইসলাম ও অংশীদারগণ',
                    $taxStatus,
                    '২০২৫-২০২৬',
                    $taxStatus === 'PAID' ? 450.0 : 0.0,
                    $paidAt,
                    $qrHash,
                    Clock::iso(),
                ]
            );
        }
    }
}
