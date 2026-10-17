<?php
declare(strict_types=1);
namespace App\Services;
final class PublicRecordService
{
    public static function forViewer(array $data): array
    {
        $actor = JwtAuthService::getAuthenticatedUser();
        if ($actor && in_array($actor['role'] ?? '', ['sub_registrar','ac_land','bank_officer','admin'], true)) return $data;
        return self::minimize($data);
    }
    public static function minimize(array $data): array
    {
        foreach ($data as $key => &$value) {
            if (is_string($key) && preg_match('/^(father_name|mother_name|address|phone|mobile|email)(_|$)/i', $key)) { unset($data[$key]); continue; }
            if (in_array($key, ['content_json','original_content_json','canonical_payload','canonical_json'], true)) { unset($data[$key]); continue; }
            if (is_string($key) && preg_match('/^(?:[a-z_]+_)?nid(?:_mock)?$/i', $key)) {
                $raw = (string) $value;
                $value = strpos($raw, '*') !== false ? $raw : (strlen($raw) >= 6 ? substr($raw,0,4).'****'.substr($raw,-2) : '****');
            } elseif (is_array($value)) $value = self::minimize($value);
        }
        unset($value);
        return $data;
    }

    public static function maskNid(string $raw): string
    {
        $raw = trim($raw);
        if (strpos($raw, '*') !== false) return $raw;
        return strlen($raw) >= 6 ? substr($raw, 0, 4) . '****' . substr($raw, -2) : '****';
    }
}
