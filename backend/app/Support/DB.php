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
        if (!$testDb && !in_array($connType, ['sqlite', 'pgsql', 'postgres'], true)) {
            throw new \RuntimeException('Unsupported database driver. Configure sqlite or pgsql explicitly.');
        }


        if (!$testDb && ($connType === 'pgsql' || $connType === 'postgres')) {
            try {
                $host = (string) env('DB_HOST', '127.0.0.1');
                $port = (string) env('DB_PORT', '5432');
                $dbname = (string) env('DB_DATABASE', 'bhumishield');
                $user = (string) env('DB_USERNAME', 'bhumishield');
                $pass = (string) env('DB_PASSWORD', 'bhumishield_demo_2026');
                $dsn = "pgsql:host={$host};port={$port};dbname={$dbname};connect_timeout=5";
                self::$pdo = new PDO($dsn, $user, $pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ]);
                self::$isPostgres = true;
                return self::$pdo;
            } catch (\Throwable $e) {
                $appEnv = strtolower((string) env('APP_ENV', 'development'));
                if ($appEnv === 'production') {
                    throw new \RuntimeException("Production PostgreSQL database unreachable: " . $e->getMessage());
                }
                // Fallback to SQLite only in development/local demo mode
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
        self::$pdo->exec('PRAGMA busy_timeout = 15000;');
        try {
            self::$pdo->exec('PRAGMA journal_mode = WAL;');
        } catch (\Throwable) {
            // Memory or temporary DB may not support WAL
        }
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

    public static function transaction(callable $callback, int $maxRetries = 5): mixed
    {
        $pdo = self::connection();
        $inTransaction = $pdo->inTransaction();
        $attempts = 0;

        while (true) {
            $attempts++;
            if (!$inTransaction) {
                try {
                    if (self::$isPostgres) {
                        $pdo->beginTransaction();
                    } else {
                        $pdo->exec('BEGIN IMMEDIATE;');
                    }
                } catch (\PDOException $pe) {
                    if ($attempts < $maxRetries && (str_contains($pe->getMessage(), 'busy') || str_contains($pe->getMessage(), 'locked'))) {
                        usleep(random_int(10000, 50000));
                        continue;
                    }
                    throw $pe;
                }
            }

            try {
                $result = $callback();
                if (!$inTransaction) {
                    $pdo->commit();
                }
                return $result;
            } catch (\Throwable $e) {
                if (!$inTransaction && $pdo->inTransaction()) {
                    try {
                        $pdo->rollBack();
                    } catch (\Throwable) {
                        // ignore rollback failure
                    }
                }
                if ($e instanceof \PDOException && $attempts < $maxRetries && (str_contains($e->getMessage(), 'busy') || str_contains($e->getMessage(), 'locked'))) {
                    usleep(random_int(10000, 50000));
                    continue;
                }
                throw $e;
            }
        }
    }
}

