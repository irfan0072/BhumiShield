<?php

declare(strict_types=1);

namespace App\Services;

use App\Support\DB;

/**
 * Granular Multi-Tier Office Scope & Jurisdiction Service.
 *
 * Enforces area boundaries, mouza coverage, role competence, and office assignment
 * across plots, survey batches, deed onboarding, and mutation workflows.
 */
final class OfficeScopeService
{
    /**
     * Platform-level oversight roles.
     */
    private const PLATFORM_ROLES = ['admin', 'system_admin', 'auditor'];

    /**
     * Determines whether an authenticated user can access a specific plot.
     */
    public static function canAccessPlot(int $plotId, array $user): bool
    {
        $role = (string) ($user['role'] ?? '');
        if (in_array($role, self::PLATFORM_ROLES, true)) {
            return true;
        }

        $userId = (int) ($user['id'] ?? 0);
        if ($userId <= 0 && !empty($user['username'])) {
            $uRow = DB::selectOne('SELECT id FROM users WHERE username = ?', [$user['username']]);
            if ($uRow) {
                $userId = (int) $uRow['id'];
            }
        }
        if ($userId <= 0) {
            return false;
        }

        // Fetch plot location details
        $plotLoc = DB::selectOne(
            'SELECT p.id, p.plot_code, l.id AS loc_id, l.district_en, l.upazila_en, l.mouza_en, l.mouza_bn, l.jl_no
             FROM plots p
             JOIN locations l ON l.id = p.location_id
             WHERE p.id = ?',
            [$plotId]
        );

        if (!$plotLoc) {
            return false;
        }

        // Fetch all active office assignments for this user
        $assignments = DB::select(
            'SELECT o.id AS office_id, o.office_type, o.district_en, o.upazila_en, o.mouzas_served_json, ou.jurisdiction_scope_json
             FROM office_user ou
             JOIN offices o ON o.id = ou.office_id
             WHERE ou.user_id = ? AND o.is_active = 1',
            [$userId]
        );

        if (empty($assignments)) {
            return false;
        }

        $locIdStr = (string) $plotLoc['loc_id'];
        $locMouzaEn = (string) $plotLoc['mouza_en'];
        $locMouzaBn = (string) $plotLoc['mouza_bn'];
        $locJlNo = (string) ($plotLoc['jl_no'] ?? '');

        foreach ($assignments as $a) {
            // District match
            if (strcasecmp((string) $a['district_en'], (string) $plotLoc['district_en']) !== 0) {
                continue;
            }
            // Upazila match (settlement / admin_cell can cover whole district)
            if (strcasecmp((string) $a['upazila_en'], (string) $plotLoc['upazila_en']) !== 0) {
                if ($a['office_type'] !== 'settlement' && $a['office_type'] !== 'admin_cell') {
                    continue;
                }
            }

            // 1. Check office-level mouzas_served_json: explicitly configured restrictions must apply!
            $officeMouzas = json_decode((string) ($a['mouzas_served_json'] ?? '[]'), true) ?: [];
            if (!empty($officeMouzas) && !in_array('all', $officeMouzas, true)) {
                $matchedOfficeMouza = false;
                foreach ($officeMouzas as $m) {
                    $mStr = (string) $m;
                    if ($mStr === $locIdStr || $mStr === $locJlNo || strcasecmp($mStr, $locMouzaEn) === 0 || $mStr === $locMouzaBn) {
                        $matchedOfficeMouza = true;
                        break;
                    }
                }
                if (!$matchedOfficeMouza) {
                    continue; // Plot mouza is not served by this office
                }
            }

            // 2. Check assignment-level jurisdiction_scope_json: officer-specific restrictions must apply!
            $scopeJson = (string) ($a['jurisdiction_scope_json'] ?? '{}');
            $userScope = json_decode($scopeJson, true) ?: [];
            if (!empty($userScope) && empty($userScope['all'])) {
                // If specific mouzas configured in assignment
                $scopeMouzas = $userScope['mouzas'] ?? $userScope['mouzas_served'] ?? null;
                if (is_array($scopeMouzas) && !empty($scopeMouzas) && !in_array('all', $scopeMouzas, true)) {
                    $matchedUserMouza = false;
                    foreach ($scopeMouzas as $sm) {
                        $smStr = (string) $sm;
                        if ($smStr === $locIdStr || $smStr === $locJlNo || strcasecmp($smStr, $locMouzaEn) === 0 || $smStr === $locMouzaBn) {
                            $matchedUserMouza = true;
                            break;
                        }
                    }
                    if (!$matchedUserMouza) {
                        continue; // Plot mouza is outside this officer's assigned jurisdiction scope
                    }
                }

                // If specific upazila or district configured in assignment
                if (!empty($userScope['upazila_en']) && strcasecmp((string)$userScope['upazila_en'], (string)$plotLoc['upazila_en']) !== 0) {
                    continue;
                }
                if (!empty($userScope['district_en']) && strcasecmp((string)$userScope['district_en'], (string)$plotLoc['district_en']) !== 0) {
                    continue;
                }
            }

            return true;
        }

        return false;
    }

    /**
     * Requires plot access, throwing a 403 exception if unauthorized.
     */
    public static function requirePlot(int $plotId, array $user): void
    {
        if (!self::canAccessPlot($plotId, $user)) {
            throw new \RuntimeException(json_encode([
                'status' => 403,
                'code' => 'OFFICE_SCOPE_REQUIRED',
                'message_bn' => 'এই জমির জন্য আপনার কার্যালয়ের ভৌগোলিক এখতিয়ার বা অনুমতি নেই।',
                'message_en' => 'This plot is outside your assigned office jurisdiction.',
            ], JSON_UNESCAPED_UNICODE));
        }
    }

    /**
     * Determines whether an authenticated user can access an onboarding survey/deed batch.
     */
    public static function canAccessBatch(array|int $batchOrId, array $user): bool
    {
        $role = (string) ($user['role'] ?? '');
        if (in_array($role, self::PLATFORM_ROLES, true)) {
            return true;
        }

        $userId = (int) ($user['id'] ?? 0);
        if ($userId <= 0 && !empty($user['username'])) {
            $uRow = DB::selectOne('SELECT id FROM users WHERE username = ?', [$user['username']]);
            if ($uRow) {
                $userId = (int) $uRow['id'];
            }
        }
        if ($userId <= 0) {
            return false;
        }

        $batch = is_array($batchOrId) ? $batchOrId : DB::selectOne('SELECT * FROM onboarding_batches WHERE id = ?', [(int) $batchOrId]);
        if (!$batch) {
            return false;
        }

        // Maker can always inspect their own batch
        if ((int) ($batch['maker_user_id'] ?? 0) === $userId) {
            return true;
        }

        $recordType = (string) ($batch['record_type'] ?? '');

        // 1. Role competence check:
        // DEED_DRAFT requires sub_registrar or registry_data_officer
        // KHATIAN_RECONCILIATION requires ac_land or land_office_assistant
        // SURVEY_RECORD requires settlement_records_officer or settlement_checker
        $roleCompetence = [
            'DEED_DRAFT' => ['sub_registrar', 'registry_data_officer'],
            'KHATIAN_RECONCILIATION' => ['ac_land', 'land_office_assistant'],
            'SURVEY_RECORD' => ['settlement_records_officer', 'settlement_checker'],
        ];

        if (isset($roleCompetence[$recordType]) && !in_array($role, $roleCompetence[$recordType], true)) {
            return false;
        }

        // 2. Fetch the officer's active assigned offices
        $userOffices = DB::select(
            'SELECT o.id, o.office_type, o.district_en, o.upazila_en, o.mouzas_served_json
             FROM office_user ou
             JOIN offices o ON o.id = ou.office_id
             WHERE ou.user_id = ? AND o.is_active = 1',
            [$userId]
        );

        if (empty($userOffices)) {
            return false;
        }

        // 3. Check the maker's assigned office
        $makerOffices = DB::select(
            'SELECT o.id, o.office_type, o.district_en, o.upazila_en
             FROM office_user ou
             JOIN offices o ON o.id = ou.office_id
             WHERE ou.user_id = ? AND o.is_active = 1',
            [(int) $batch['maker_user_id']]
        );

        // If maker and checker are in the same office, check office match
        $userOfficeIds = array_column($userOffices, 'id');
        foreach ($makerOffices as $mo) {
            if (in_array($mo['id'], $userOfficeIds, true)) {
                return true;
            }
        }

        // 4. Inspect batch items for location/mouza jurisdiction
        $items = DB::select('SELECT item_payload_json FROM onboarding_items WHERE batch_id = ? LIMIT 5', [(int) $batch['id']]);
        if (!empty($items)) {
            foreach ($items as $it) {
                $payload = json_decode((string) $it['item_payload_json'], true) ?: [];
                $itemMouza = (string) ($payload['mouza'] ?? $payload['mouza_bn'] ?? $payload['mouza_en'] ?? '');
                $itemUpazila = (string) ($payload['upazila_en'] ?? $payload['upazila_bn'] ?? '');
                $itemDistrict = (string) ($payload['district_en'] ?? $payload['district_bn'] ?? '');

                foreach ($userOffices as $uo) {
                    // Match district/upazila if provided
                    if ($itemDistrict !== '' && strcasecmp($uo['district_en'], $itemDistrict) !== 0) {
                        continue;
                    }
                    if ($itemUpazila !== '' && strcasecmp($uo['upazila_en'], $itemUpazila) !== 0) {
                        if ($uo['office_type'] !== 'settlement' && $uo['office_type'] !== 'admin_cell') {
                            continue;
                        }
                    }

                    // Check mouza if specified
                    if ($itemMouza !== '') {
                        $mouzas = json_decode((string) ($uo['mouzas_served_json'] ?? '[]'), true) ?: [];
                        if (empty($mouzas) || in_array('all', $mouzas, true)) {
                            return true;
                        }
                        foreach ($mouzas as $m) {
                            if (strcasecmp((string) $m, $itemMouza) === 0 || (string) $m === $itemMouza) {
                                return true;
                            }
                        }
                    } else {
                        // District/upazila matched
                        return true;
                    }
                }
            }
            return false;
        }

        // Fallback: check maker office geographic overlap
        foreach ($makerOffices as $mo) {
            foreach ($userOffices as $uo) {
                if (strcasecmp((string) $mo['district_en'], (string) $uo['district_en']) === 0 &&
                    strcasecmp((string) $mo['upazila_en'], (string) $uo['upazila_en']) === 0) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Requires batch access, throwing a 403 exception if outside jurisdiction.
     */
    public static function requireBatch(array|int $batchOrId, array $user): void
    {
        if (!self::canAccessBatch($batchOrId, $user)) {
            throw new \RuntimeException(json_encode([
                'status' => 403,
                'code' => 'OFFICE_SCOPE_REQUIRED',
                'message_bn' => 'এই অনবোর্ডিং বা জরিপ ব্যাচটি আপনার কার্যালয়ের এখতিয়ারবহির্ভূত।',
                'message_en' => 'This onboarding batch is outside your office jurisdiction.',
            ], JSON_UNESCAPED_UNICODE));
        }
    }
}
