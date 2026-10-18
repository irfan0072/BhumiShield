<?php
declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Middleware\RoleMiddleware;
use App\Services\LedgerService;
use App\Services\RbacService;
use App\Support\DB;

final class OfficeSetupController
{
    public const VALID_OFFICE_TYPES = [
        'registry',
        'sub_registry',
        'ac_land',
        'settlement',
        'service_point',
        'bank',
        'bank_branch',
        'admin_cell',
        'supervision',
        'platform',
    ];

    public static function list(?array $actor = null): array
    {
        RoleMiddleware::authorize(['admin', 'system_admin', 'auditor'], $actor);
        return [
            'offices' => DB::select('SELECT * FROM offices ORDER BY id ASC'),
            'roles' => RbacService::ROLES + [
                'admin' => [
                    'label_bn' => 'অ্যাপ প্রশাসক',
                    'label_en' => 'Application administrator',
                    'description_bn' => 'ব্যবহারকারী, কার্যালয় ও সেবার সেটিংস পরিচালনা।',
                    'description_en' => 'Manage accounts, offices and service settings.',
                ],
            ],
            'valid_office_types' => self::VALID_OFFICE_TYPES,
        ];
    }

    public static function get(int $id, ?array $actor = null): array
    {
        RoleMiddleware::authorize(['admin', 'system_admin', 'auditor'], $actor);
        $office = DB::selectOne('SELECT * FROM offices WHERE id = ?', [$id]);
        if (!$office) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'OFFICE_NOT_FOUND',
                'message_bn' => 'কার্যালয়টি খুঁজে পাওয়া যায়নি।',
                'message_en' => 'Office not found.',
            ], JSON_UNESCAPED_UNICODE));
        }
        $staff = DB::select(
            'SELECT ou.*, u.username, u.full_name_bn, u.role FROM office_user ou JOIN users u ON u.id = ou.user_id WHERE ou.office_id = ?',
            [$id]
        );
        return ['office' => $office, 'staff' => $staff];
    }

    public static function create(array $body, ?array $actor = null): array
    {
        $u = RoleMiddleware::authorize(['admin', 'system_admin'], $actor);
        $fields = [
            'office_code', 'name_bn', 'name_en', 'office_type',
            'division_bn', 'division_en', 'district_bn', 'district_en',
            'upazila_bn', 'upazila_en'
        ];
        $values = [];
        foreach ($fields as $f) {
            $v = trim((string)($body[$f] ?? ''));
            if ($v === '') {
                throw new \RuntimeException(json_encode([
                    'status' => 422,
                    'code' => 'OFFICE_DETAILS_REQUIRED',
                    'message_bn' => 'কার্যালয়ের নাম ও অধিক্ষেত্রের সব ঘর পূরণ করুন।',
                    'message_en' => 'Complete the office name and jurisdiction fields.',
                ], JSON_UNESCAPED_UNICODE));
            }
            $values[] = $v;
        }

        $officeType = strtolower(trim((string)$body['office_type']));
        if (!in_array($officeType, self::VALID_OFFICE_TYPES, true)) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_OFFICE_TYPE',
                'message_en' => 'Choose a valid office type.',
                'message_bn' => 'সঠিক অফিস ধরন নির্বাচন করুন।',
            ], JSON_UNESCAPED_UNICODE));
        }

        if (DB::selectOne('SELECT id FROM offices WHERE office_code = ?', [$values[0]])) {
            throw new \RuntimeException(json_encode([
                'status' => 409,
                'code' => 'OFFICE_CODE_EXISTS',
                'message_en' => 'This office code is already in use.',
                'message_bn' => 'কার্যালয়ের কোড ইতিমধ্যে ব্যবহৃত হয়েছে।',
            ], JSON_UNESCAPED_UNICODE));
        }

        $mouzas = isset($body['mouzas_served_json'])
            ? (is_array($body['mouzas_served_json']) ? json_encode($body['mouzas_served_json'], JSON_UNESCAPED_UNICODE) : (string)$body['mouzas_served_json'])
            : '[]';

        return DB::transaction(static function () use ($values, $officeType, $mouzas, $u, $body) {
            $now = gmdate('c');
            $id = DB::insert(
                'INSERT INTO offices (office_code, name_bn, name_en, office_type, division_bn, division_en, district_bn, district_en, upazila_bn, upazila_en, mouzas_served_json, address_bn, address_en, contact_phone, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)',
                [
                    $values[0], $values[1], $values[2], $officeType,
                    $values[4], $values[5], $values[6], $values[7],
                    $values[8], $values[9], $mouzas,
                    trim((string)($body['address_bn'] ?? '')),
                    trim((string)($body['address_en'] ?? '')),
                    trim((string)($body['contact_phone'] ?? '')),
                    $now, $now,
                ]
            );

            LedgerService::recordAuditEntry(
                $u['username'],
                $u['role'],
                'OFFICE_CREATED',
                'office',
                (string)$id,
                ['office_code' => $values[0], 'office_type' => $officeType]
            );

            return [
                'status' => 201,
                'message_bn' => 'কার্যালয় সফলভাবে সৃষ্টি হয়েছে।',
                'office' => DB::selectOne('SELECT * FROM offices WHERE id = ?', [$id]),
            ];
        });
    }

    public static function update(int $id, array $body, ?array $actor = null): array
    {
        $u = RoleMiddleware::authorize(['admin', 'system_admin'], $actor);
        $office = DB::selectOne('SELECT * FROM offices WHERE id = ?', [$id]);
        if (!$office) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'OFFICE_NOT_FOUND',
                'message_bn' => 'কার্যালয়টি খুঁজে পাওয়া যায়নি।',
                'message_en' => 'Office not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $nameBn = trim((string)($body['name_bn'] ?? $office['name_bn']));
        $nameEn = trim((string)($body['name_en'] ?? $office['name_en']));
        $addressBn = trim((string)($body['address_bn'] ?? $office['address_bn']));
        $addressEn = trim((string)($body['address_en'] ?? $office['address_en']));
        $contactPhone = trim((string)($body['contact_phone'] ?? $office['contact_phone']));
        $officeType = strtolower(trim((string)($body['office_type'] ?? $office['office_type'])));

        if (!in_array($officeType, self::VALID_OFFICE_TYPES, true)) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_OFFICE_TYPE',
                'message_en' => 'Choose a valid office type.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $mouzas = isset($body['mouzas_served_json'])
            ? (is_array($body['mouzas_served_json']) ? json_encode($body['mouzas_served_json'], JSON_UNESCAPED_UNICODE) : (string)$body['mouzas_served_json'])
            : $office['mouzas_served_json'];

        return DB::transaction(static function () use ($id, $nameBn, $nameEn, $officeType, $addressBn, $addressEn, $contactPhone, $mouzas, $u, $office) {
            $now = gmdate('c');
            DB::statement(
                'UPDATE offices SET name_bn = ?, name_en = ?, office_type = ?, address_bn = ?, address_en = ?, contact_phone = ?, mouzas_served_json = ?, updated_at = ? WHERE id = ?',
                [$nameBn, $nameEn, $officeType, $addressBn, $addressEn, $contactPhone, $mouzas, $now, $id]
            );

            LedgerService::recordAuditEntry(
                $u['username'],
                $u['role'],
                'OFFICE_UPDATED',
                'office',
                (string)$id,
                ['office_code' => $office['office_code'], 'name_bn' => $nameBn]
            );

            return [
                'status' => 200,
                'message_bn' => 'কার্যালয়ের তথ্য সফলভাবে হালনাগাদ হয়েছে।',
                'office' => DB::selectOne('SELECT * FROM offices WHERE id = ?', [$id]),
            ];
        });
    }

    public static function toggleActive(int $id, ?array $actor = null): array
    {
        $u = RoleMiddleware::authorize(['admin', 'system_admin'], $actor);
        $office = DB::selectOne('SELECT * FROM offices WHERE id = ?', [$id]);
        if (!$office) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'OFFICE_NOT_FOUND',
                'message_bn' => 'কার্যালয়টি খুঁজে পাওয়া যায়নি।',
                'message_en' => 'Office not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $newActive = ((int)$office['is_active'] === 1) ? 0 : 1;
        $now = gmdate('c');

        return DB::transaction(static function () use ($id, $newActive, $now, $u, $office) {
            DB::statement('UPDATE offices SET is_active = ?, updated_at = ? WHERE id = ?', [$newActive, $now, $id]);

            LedgerService::recordAuditEntry(
                $u['username'],
                $u['role'],
                $newActive === 1 ? 'OFFICE_ACTIVATED' : 'OFFICE_DEACTIVATED',
                'office',
                (string)$id,
                ['office_code' => $office['office_code'], 'is_active' => $newActive]
            );

            return [
                'status' => 200,
                'is_active' => $newActive,
                'message_bn' => $newActive === 1 ? 'কার্যালয়টি সক্রিয় করা হয়েছে।' : 'কার্যালয়টি নিষ্ক্রিয় করা হয়েছে (ইতিহাস সংরক্ষিত)।',
            ];
        });
    }
}
