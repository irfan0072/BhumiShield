<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\DB;

/**
 * Base Model providing Laravel Eloquent-style static query helpers (`all`, `find`, `where`).
 */
abstract class BaseModel
{
    protected static string $table = '';

    public static function all(): array
    {
        return DB::select('SELECT * FROM ' . static::$table . ' ORDER BY id ASC');
    }

    public static function find(int|string $id): ?array
    {
        return DB::selectOne('SELECT * FROM ' . static::$table . ' WHERE id = ?', [$id]);
    }

    public static function where(string $column, mixed $value): array
    {
        return DB::select('SELECT * FROM ' . static::$table . " WHERE {$column} = ?", [$value]);
    }
}

final class User extends BaseModel { protected static string $table = 'users'; }
final class SiteSetting extends BaseModel { protected static string $table = 'site_settings'; }
final class Location extends BaseModel { protected static string $table = 'locations'; }
final class Person extends BaseModel { protected static string $table = 'persons'; }
final class Plot extends BaseModel { protected static string $table = 'plots'; }
final class KhatianRecord extends BaseModel { protected static string $table = 'khatian_records'; }
final class Ownership extends BaseModel { protected static string $table = 'ownerships'; }
final class Deed extends BaseModel { protected static string $table = 'deeds'; }
final class Mutation extends BaseModel { protected static string $table = 'mutations'; }
final class MortgageLien extends BaseModel { protected static string $table = 'mortgages_liens'; }
final class AuditLog extends BaseModel { protected static string $table = 'audit_log'; }
final class RiskReport extends BaseModel { protected static string $table = 'risk_reports'; }
final class FieldReport extends BaseModel { protected static string $table = 'field_reports'; }
final class SlaDispatch extends BaseModel { protected static string $table = 'sla_dispatches'; }
final class AuthorizedLawyer extends BaseModel { protected static string $table = 'authorized_lawyers'; }
final class Dispute extends BaseModel { protected static string $table = 'disputes'; }

