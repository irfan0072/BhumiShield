<?php
declare(strict_types=1);
namespace App\Services;
final class PublicRecordService
{
    public static function forViewer(array $data, ?array $actor = null): array
    {
        $officerRoles = [
            'sub_registrar', 'registry_data_officer', 'registry_auditor',
            'ac_land', 'land_office_assistant', 'field_verification_officer', 'kanungo',
            'settlement_records_officer', 'settlement_checker',
            'uno_supervisor', 'appellate_reviewer',
            'admin', 'system_admin', 'auditor'
        ];
        if ($actor && in_array($actor['role'] ?? '', $officerRoles, true)) return $data;
        return self::minimize($data);
    }
    public static function minimize(array $data): array
    {
        foreach ($data as $key => &$value) {
            if (is_string($key) && preg_match('/^(father_name|mother_name|address|phone|mobile|email|locked_by_nid|admin_freeze_reason|admin_notes)(_|$)/i', $key)) { unset($data[$key]); continue; }
            if (in_array($key, ['content_json','original_content_json','canonical_payload','canonical_json'], true)) { unset($data[$key]); continue; }
            if (is_string($key) && preg_match('/^(?:[a-z_]+_)?nid(?:_mock)?$/i', $key)) {
                $raw = (string) $value;
                $masked = self::maskNid($raw);
                $value = $masked;
                $data[$key . '_masked'] = $masked;
            } elseif (is_array($value)) $value = self::minimize($value);
        }
        unset($value);
        return $data;
    }

    public static function maskNid(?string $raw): string
    {
        if ($raw === null || $raw === '') return '';
        $raw = trim($raw);
        if (strpos($raw, '*') !== false) return $raw;
        return strlen($raw) >= 6 ? substr($raw, 0, 4) . '****' . substr($raw, -2) : '****';
    }

    public static function maskPhone(?string $raw): string
    {
        if ($raw === null || $raw === '') return '';
        $clean = trim($raw);
        if (strpos($clean, '*') !== false) return $clean;
        $digits = preg_replace('/\D/', '', $clean);
        if (strlen($digits) >= 11) {
            $prefix = substr($digits, 0, 3);
            $suffix = substr($digits, -4);
            return "{$prefix}****{$suffix}";
        }
        return strlen($clean) > 4 ? substr($clean, 0, 2) . '****' . substr($clean, -2) : '****';
    }
}
