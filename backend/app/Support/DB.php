<?php

declare(strict_types=1);

namespace App\Support;

use PDO;

/**
 * Laravel-style Database Facade supporting PostgreSQL (pdo_pgsql) and SQLite (pdo_sqlite).
 */
final class DB
{
    private static ?PDO $pdo = null;
    private static bool $isPostgres = false;

    public static function connection(): PDO
    {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        $testDb = getenv('BHUMISHIELD_TEST_DB');
        $connType = strtolower((string) env('DB_CONNECTION', 'sqlite'));

        if (!$testDb && ($connType === 'pgsql' || $connType === 'postgres')) {
            try {
                $host = (string) env('DB_HOST', '127.0.0.1');
                $port = (string) env('DB_PORT', '5432');
                $dbname = (string) env('DB_DATABASE', 'bhumishield');
                $user = (string) env('DB_USERNAME', 'bhumishield');
                $pass = (string) env('DB_PASSWORD', 'bhumishield_demo_2026');
                $dsn = "pgsql:host={$host};port={$port};dbname={$dbname}";
                self::$pdo = new PDO($dsn, $user, $pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ]);
                self::$isPostgres = true;
                return self::$pdo;
            } catch (\Throwable) {
                // Fallback to SQLite if Postgres is not reachable locally
            }
        }

        $sqliteRel = $testDb ?: (string) env('DB_DATABASE', 'database/bhumishield.sqlite');
        $sqlitePath = str_starts_with($sqliteRel, '/') ? $sqliteRel : base_path($sqliteRel);
        $dir = dirname($sqlitePath);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        self::$pdo = new PDO("sqlite:{$sqlitePath}", null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        self::$pdo->exec('PRAGMA foreign_keys = ON;');
        self::$isPostgres = false;
        return self::$pdo;
    }

    public static function resetConnection(): void
    {
        self::$pdo = null;
    }

    public static function isPostgres(): bool
    {
        self::connection();
        return self::$isPostgres;
    }

    public static function select(string $sql, array $bindings = []): array
    {
        $stmt = self::connection()->prepare($sql);
        $stmt->execute(array_values($bindings));
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return is_array($rows) ? $rows : [];
    }

    public static function selectOne(string $sql, array $bindings = []): ?array
    {
        $stmt = self::connection()->prepare($sql);
        $stmt->execute(array_values($bindings));
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return is_array($row) ? $row : null;
    }

    public static function insert(string $sql, array $bindings = []): int
    {
        $pdo = self::connection();
        if (self::$isPostgres) {
            $pgSql = rtrim(rtrim($sql), ';') . ' RETURNING id';
            $stmt = $pdo->prepare($pgSql);
            $stmt->execute(array_values($bindings));
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return isset($row['id']) ? (int) $row['id'] : 0;
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute(array_values($bindings));
        return (int) $pdo->lastInsertId();
    }

    public static function statement(string $sql, array $bindings = []): int
    {
        $stmt = self::connection()->prepare($sql);
        $stmt->execute(array_values($bindings));
        return $stmt->rowCount();
    }

    public static function execRaw(string $ddl): void
    {
        self::connection()->exec($ddl);
    }
}
