<?php

declare(strict_types=1);

namespace App\Services;

use App\Support\DB;

/** Read-only release readiness; requests never migrate or seed storage. */
final class ReadinessService
{
    public static function inspect(): array
    {
        $issues = [];
        try {
            DB::selectOne('SELECT 1 AS ok');
            foreach ([
                'users' => 'id, token_version, is_identity_verified',
                'plots' => 'id', 'deeds' => 'id, content_hash',
                'ownerships' => 'id', 'mutations' => 'id',
                'mortgages_liens' => 'id', 'noc_certificates' => 'id',
                'service_catalogue' => 'id', 'service_fees_registry' => 'id',
                'site_settings' => 'setting_key', 'audit_log' => 'id',
            ] as $table => $columns) {
                DB::select("SELECT {$columns} FROM {$table} WHERE 1 = 0");
            }
            if (!DB::isPostgres() && !DB::selectOne("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_active_mortgage_per_plot'")) {
                throw new \RuntimeException('Required active-lien constraint is missing.');
            }
        } catch (\Throwable) {
            $issues[] = 'DATABASE_OR_SCHEMA_UNAVAILABLE';
        }
        if (strtolower((string) env('APP_ENV', 'development')) === 'production') {
            try {
                JwtAuthService::getSecret();
                LedgerService::getPublicKeyHex();
                $origin = (string) env('PUBLIC_VERIFY_BASE_URL', '');
                if (!filter_var($origin, FILTER_VALIDATE_URL) || parse_url($origin, PHP_URL_SCHEME) !== 'https') {
                    throw new \RuntimeException('Configure the public HTTPS verification origin.');
                }
            } catch (\Throwable) {
                $issues[] = 'PRODUCTION_CONFIGURATION_INVALID';
            }
        }
        return ['ready' => $issues === [], 'issues' => $issues];
    }
}
