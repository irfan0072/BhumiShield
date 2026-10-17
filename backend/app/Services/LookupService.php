<?php

declare(strict_types=1);

namespace App\Services;

use App\Support\DB;

/**
 * High-performance lookup service resolving public codes (plot_code, deed_code, transfer_code, ticket_code, mutation_code)
 * and integer primary keys interchangeably across all API routes.
 */
final class LookupService
{
    public static function resolvePlot(string|int $codeOrId): ?array
    {
        $val = trim((string) $codeOrId);
        if ($val === '') {
            return null;
        }

        if (ctype_digit($val)) {
            $plot = DB::selectOne('SELECT * FROM plots WHERE id = ?', [(int) $val]);
            if ($plot) {
                return $plot;
            }
        }

        // Look up by plot_code or dag_no
        return DB::selectOne(
            'SELECT * FROM plots WHERE plot_code = ? OR dag_no = ? LIMIT 1',
            [$val, $val]
        );
    }

    public static function resolveDeed(string|int $codeOrId): ?array
    {
        $val = trim((string) $codeOrId);
        if ($val === '') {
            return null;
        }

        if (ctype_digit($val)) {
            $deed = DB::selectOne('SELECT * FROM deeds WHERE id = ?', [(int) $val]);
            if ($deed) {
                return $deed;
            }
        }

        return DB::selectOne(
            'SELECT * FROM deeds WHERE deed_code = ? OR deed_no = ? LIMIT 1',
            [$val, $val]
        );
    }

    public static function resolveTransfer(string|int $codeOrId): ?array
    {
        $val = trim((string) $codeOrId);
        if ($val === '') {
            return null;
        }

        if (ctype_digit($val)) {
            $t = DB::selectOne('SELECT * FROM transfer_requests WHERE id = ?', [(int) $val]);
            if ($t) {
                return $t;
            }
        }

        return DB::selectOne(
            'SELECT * FROM transfer_requests WHERE transfer_code = ? LIMIT 1',
            [$val]
        );
    }

    public static function resolveTicket(string|int $codeOrId): ?array
    {
        $val = trim((string) $codeOrId);
        if ($val === '') {
            return null;
        }

        if (ctype_digit($val)) {
            $ticket = DB::selectOne('SELECT * FROM tickets WHERE id = ?', [(int) $val]);
            if ($ticket) {
                return $ticket;
            }
        }

        return DB::selectOne(
            'SELECT * FROM tickets WHERE ticket_code = ? LIMIT 1',
            [$val]
        );
    }

    public static function resolveMutation(string|int $codeOrId): ?array
    {
        $val = trim((string) $codeOrId);
        if ($val === '') {
            return null;
        }

        if (ctype_digit($val)) {
            $mut = DB::selectOne('SELECT * FROM mutations WHERE id = ?', [(int) $val]);
            if ($mut) {
                return $mut;
            }
        }

        return DB::selectOne(
            'SELECT * FROM mutations WHERE mutation_code = ? OR case_no = ? LIMIT 1',
            [$val, $val]
        );
    }

    public static function resolveListing(string|int $codeOrId): ?array
    {
        $val = trim((string) $codeOrId);
        if ($val === '') {
            return null;
        }

        if (ctype_digit($val)) {
            $l = DB::selectOne('SELECT * FROM listings WHERE id = ?', [(int) $val]);
            if ($l) {
                return $l;
            }
        }

        return DB::selectOne('SELECT * FROM listings WHERE listing_code = ? LIMIT 1', [$val]);
    }
}
