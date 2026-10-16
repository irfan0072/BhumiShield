<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Services\JwtAuthService;
use App\Services\LedgerService;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Laravel Controller for User Registration, Profile, Admin Users CRUD, Site Settings, and Analytics.
 */
final class SystemAdminController
{
    private static function serializeUser(array $u): array
    {
        return [
            'id' => (int) $u['id'],
            'username' => $u['username'],
            'email' => $u['email'] ?? "{$u['username']}@demo.bhumishield.gov.bd",
            'full_name_bn' => $u['full_name_bn'],
            'full_name_en' => $u['full_name_en'],
            'role' => $u['role'],
            'office_bn' => $u['office_bn'],
            'office_en' => $u['office_en'],
            'phone_dummy' => $u['phone_dummy'] ?? '01700-001001',
            'nid' => $u['nid'] ?? '9900001001',
            'is_active' => (int) ($u['is_active'] ?? 1),
            'last_login_at' => $u['last_login_at'] ?? null,
            'created_at' => $u['created_at'] ?? null,
        ];
    }

    public static function registerUser(array $req): array
    {
        $uname = strtolower(trim((string) ($req['username'] ?? '')));
        if (strlen($uname) < 3) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_USERNAME',
                'message_bn' => 'ইউজারনেম কমপক্ষে ৩ অক্ষরের হতে হবে।',
                'message_en' => 'Username must be at least 3 characters.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $existing = DB::selectOne('SELECT id FROM users WHERE username = ?', [$uname]);
        if ($existing) {
            throw new \RuntimeException(json_encode([
                'status' => 409,
                'code' => 'USERNAME_EXISTS',
                'message_bn' => "'{$uname}' ইউজারনেমটি ইতিমধ্যে ব্যবহৃত হয়েছে। অনুগ্রহ করে অন্য ইউজারনেম দিন।",
                'message_en' => "Username '{$uname}' is already registered. Please choose another username.",
            ], JSON_UNESCAPED_UNICODE));
        }

        $allowedRoles = ['citizen', 'sub_registrar', 'ac_land', 'bank_officer', 'admin'];
        $role = in_array($req['role'] ?? 'citizen', $allowedRoles, true) ? (string) $req['role'] : 'citizen';
        $nowIso = gmdate('c');
        $email = strtolower(trim((string) ($req['email'] ?? "{$uname}@demo.bhumishield.gov.bd")));
        $nameBn = trim((string) ($req['full_name_bn'] ?? $uname));
        $nameEn = trim((string) ($req['full_name_en'] ?? $nameBn));
        $officeBn = trim((string) ($req['office_bn'] ?? 'নাগরিক পোর্টাল — ঢাকা'));
        $officeEn = trim((string) ($req['office_en'] ?? 'Citizen Portal — Dhaka'));
        $phone = trim((string) ($req['phone_dummy'] ?? '01700-009999'));
        $nid = trim((string) ($req['nid'] ?? '9900009999'));
        $password = (string) ($req['password'] ?? 'demo123');

        $userId = DB::insert(
            'INSERT INTO users (username, email, full_name_bn, full_name_en, role, office_bn, office_en, phone_dummy, nid, is_active, password_hash, last_login_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)',
            [$uname, $email, $nameBn, $nameEn, $role, $officeBn, $officeEn, $phone, $nid, JwtAuthService::hashPassword($password), $nowIso, $nowIso]
        );

        $existingPerson = DB::selectOne('SELECT id FROM persons WHERE nid = ?', [$nid]);
        if (!$existingPerson) {
            DB::insert(
                "INSERT INTO persons (name_bn, name_en, father_name_bn, father_name_en, mother_name_bn, nid, phone_dummy, is_deceased, heirs_recorded, address_bn, address_en) VALUES (?, ?, 'মো. আবদুল করিম (ডেমো)', 'Md. Abdul Karim (Demo)', 'রোকেয়া বেগম', ?, ?, 0, 1, ?, ?)",
                [$nameBn, $nameEn, $nid, $phone, $officeBn, $officeEn]
            );
        }

        DatabaseSeeder::appendAuditEntry(
            $uname,
            $role,
            'USER_REGISTERED',
            'user',
            (string) $userId,
            [
                'username' => $uname,
                'role' => $role,
                'nid' => $nid,
                'note_bn' => "নতুন ব্যবহারকারী নিবন্ধন: {$nameBn} ({$role})",
            ],
            $nowIso
        );

        $userRow = DB::selectOne('SELECT * FROM users WHERE id = ?', [$userId]);
        $token = JwtAuthService::createToken(['sub' => $uname, 'role' => $role]);

        return [
            'access_token' => $token,
            'token_type' => 'bearer',
            'user' => self::serializeUser($userRow),
            'message_bn' => 'আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে এবং লগইন সম্পন্ন হয়েছে।',
            'message_en' => 'Your account has been created and signed in.',
        ];
    }

    public static function getMe(?array $user = null): array
    {
        $u = $user ?? JwtAuthService::getAuthenticatedUser();
        if (!$u) {
            throw new \RuntimeException(json_encode([
                'status' => 401,
                'code' => 'NOT_AUTHENTICATED',
                'message_bn' => 'অনুগ্রহ করে প্রথমে লগইন করুন।',
                'message_en' => 'Please sign in first.',
            ], JSON_UNESCAPED_UNICODE));
        }
        return ['user' => self::serializeUser($u)];
    }

    public static function updateProfile(array $req, ?array $user = null): array
    {
        $u = $user ?? JwtAuthService::getAuthenticatedUser();
        if (!$u) {
            throw new \RuntimeException(json_encode([
                'status' => 401,
                'code' => 'AUTH_REQUIRED',
                'message_bn' => 'প্রোফাইল আপডেট করতে লগইন করুন।',
                'message_en' => 'Sign in to update profile.',
            ], JSON_UNESCAPED_UNICODE));
        }

        DB::statement(
            'UPDATE users SET full_name_bn = ?, full_name_en = ?, email = ?, phone_dummy = ?, office_bn = ?, office_en = ? WHERE id = ?',
            [
                $req['full_name_bn'] ?? $u['full_name_bn'],
                $req['full_name_en'] ?? $u['full_name_en'],
                $req['email'] ?? $u['email'],
                $req['phone_dummy'] ?? $u['phone_dummy'],
                $req['office_bn'] ?? $u['office_bn'],
                $req['office_en'] ?? $u['office_en'],
                $u['id'],
            ]
        );
        $updated = DB::selectOne('SELECT * FROM users WHERE id = ?', [$u['id']]);
        return [
            'user' => self::serializeUser($updated),
            'message_bn' => 'প্রোফাইল তথ্য সফলভাবে হালনাগাদ করা হয়েছে।',
            'message_en' => 'Profile updated successfully.',
        ];
    }

    public static function changePassword(array $req, ?array $user = null): array
    {
        $u = $user ?? JwtAuthService::getAuthenticatedUser();
        if (!$u) {
            throw new \RuntimeException(json_encode([
                'status' => 401,
                'code' => 'AUTH_REQUIRED',
                'message_bn' => 'পাসওয়ার্ড পরিবর্তন করতে লগইন করুন।',
                'message_en' => 'Sign in to change password.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $currPass = (string) ($req['current_password'] ?? '');
        $newPass = (string) ($req['new_password'] ?? '');
        if (!JwtAuthService::verifyPassword($currPass, (string) $u['password_hash'])) {
            throw new \RuntimeException(json_encode([
                'status' => 400,
                'code' => 'WRONG_CURRENT_PASSWORD',
                'message_bn' => 'বর্তমান পাসওয়ার্ডটি সঠিক নয়।',
                'message_en' => 'Current password is incorrect.',
            ], JSON_UNESCAPED_UNICODE));
        }

        DB::statement('UPDATE users SET password_hash = ? WHERE id = ?', [JwtAuthService::hashPassword($newPass), $u['id']]);
        return [
            'message_bn' => 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।',
            'message_en' => 'Password changed successfully.',
        ];
    }

    public static function getCitizenLinkedProperties(?string $nid = null, ?array $user = null): array
    {
        $u = $user ?? JwtAuthService::getAuthenticatedUser() ?? [];
        $targetNid = trim((string) ($nid ?: ($u['nid'] ?? '9900001001')));
        $person = DB::selectOne('SELECT * FROM persons WHERE nid = ?', [$targetNid]);
        if (!$person) {
            $person = DB::selectOne('SELECT * FROM persons WHERE id = 1');
        }

        $ownedPlots = DB::select(
            'SELECT o.share_fraction, o.area_decimal, o.is_latest,
                    p.id AS plot_id, p.dag_no, p.dag_no_bn, p.land_type_bn, p.land_type_en, p.total_area_decimal, p.owner_sale_locked,
                    k.survey_type, k.khatian_no, k.khatian_no_bn,
                    l.mouza_bn, l.mouza_en, l.upazila_bn, l.upazila_en, l.district_bn, l.district_en
             FROM ownerships o
             JOIN plots p ON p.id = o.plot_id
             JOIN khatian_records k ON k.id = o.khatian_id
             JOIN locations l ON l.id = p.location_id
             WHERE o.person_id = ? AND o.is_latest = 1
             ORDER BY p.id ASC',
            [$person['id']]
        );

        $deeds = DB::select(
            'SELECT d.*, p.dag_no, p.dag_no_bn, l.mouza_bn, l.mouza_en,
                    s.name_bn AS seller_name_bn, s.name_en AS seller_name_en,
                    b.name_bn AS buyer_name_bn, b.name_en AS buyer_name_en
             FROM deeds d
             JOIN plots p ON p.id = d.plot_id
             JOIN locations l ON l.id = p.location_id
             JOIN persons s ON s.id = d.seller_id
             JOIN persons b ON b.id = d.buyer_id
             WHERE d.seller_id = ? OR d.buyer_id = ?
             ORDER BY d.chain_index DESC',
            [$person['id'], $person['id']]
        );

        return [
            'person' => $person,
            'owned_plots' => $ownedPlots,
            'deeds' => $deeds,
        ];
    }

    public static function adminListUsers(?string $role = null, ?string $q = null): array
    {
        $rows = DB::select('SELECT * FROM users ORDER BY id ASC');
        $items = array_map([self::class, 'serializeUser'], $rows);
        if ($role) {
            $items = array_values(array_filter($items, fn(array $u) => $u['role'] === $role));
        }
        if ($q && trim($q) !== '') {
            $qLow = mb_strtolower(trim($q));
            $items = array_values(array_filter($items, function (array $u) use ($qLow) {
                return str_contains(mb_strtolower($u['username']), $qLow)
                    || str_contains(mb_strtolower($u['full_name_bn']), $qLow)
                    || str_contains(mb_strtolower($u['full_name_en']), $qLow)
                    || str_contains(mb_strtolower($u['nid']), $qLow)
                    || str_contains(mb_strtolower($u['office_bn']), $qLow);
            }));
        }
        return ['items' => $items, 'total' => count($items)];
    }

    public static function adminUpdateUser(int $targetUserId, array $req, ?array $user = null): array
    {
        $curr = DB::selectOne('SELECT * FROM users WHERE id = ?', [$targetUserId]);
        if (!$curr) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'USER_NOT_FOUND',
                'message_bn' => 'ব্যবহারকারী পাওয়া যায়নি।',
                'message_en' => 'User not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $newPassHash = !empty($req['new_password'])
            ? JwtAuthService::hashPassword((string) $req['new_password'])
            : $curr['password_hash'];

        DB::statement(
            'UPDATE users SET full_name_bn = ?, full_name_en = ?, email = ?, role = ?, office_bn = ?, office_en = ?, phone_dummy = ?, nid = ?, is_active = ?, password_hash = ? WHERE id = ?',
            [
                $req['full_name_bn'] ?? $curr['full_name_bn'],
                $req['full_name_en'] ?? $curr['full_name_en'],
                $req['email'] ?? $curr['email'],
                $req['role'] ?? $curr['role'],
                $req['office_bn'] ?? $curr['office_bn'],
                $req['office_en'] ?? $curr['office_en'],
                $req['phone_dummy'] ?? $curr['phone_dummy'],
                $req['nid'] ?? $curr['nid'],
                isset($req['is_active']) ? (int) $req['is_active'] : (int) $curr['is_active'],
                $newPassHash,
                $targetUserId,
            ]
        );

        $actor = $user ?? JwtAuthService::getAuthenticatedUser() ?? ['username' => 'admin', 'role' => 'admin'];
        DatabaseSeeder::appendAuditEntry(
            (string) ($actor['username'] ?? 'admin'),
            (string) ($actor['role'] ?? 'admin'),
            'ADMIN_USER_UPDATED',
            'user',
            (string) $targetUserId,
            [
                'username' => $curr['username'],
                'new_role' => $req['role'] ?? $curr['role'],
                'is_active' => isset($req['is_active']) ? (int) $req['is_active'] : (int) $curr['is_active'],
                'note_bn' => "ব্যবহারকারী '{$curr['username']}'-এর প্রোফাইল/ভূমিকা হালনাগাদ করা হয়েছে",
            ],
            gmdate('c')
        );

        $updated = DB::selectOne('SELECT * FROM users WHERE id = ?', [$targetUserId]);
        return [
            'user' => self::serializeUser($updated),
            'message_bn' => 'ব্যবহারকারীর তথ্য সফলভাবে হালনাগাদ করা হয়েছে।',
            'message_en' => 'User updated successfully.',
        ];
    }

    public static function adminDeleteUser(int $targetUserId, ?array $user = null): array
    {
        $curr = DB::selectOne('SELECT * FROM users WHERE id = ?', [$targetUserId]);
        if (!$curr) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'USER_NOT_FOUND',
                'message_bn' => 'ব্যবহারকারী পাওয়া যায়নি।',
                'message_en' => 'User not found.',
            ], JSON_UNESCAPED_UNICODE));
        }
        if (in_array($curr['username'], ['admin', 'citizen', 'registrar', 'acland', 'bank'], true)) {
            throw new \RuntimeException(json_encode([
                'status' => 400,
                'code' => 'CORE_DEMO_USER_PROTECTED',
                'message_bn' => 'হ্যাকাথনের মূল ৫টি ডেমো অ্যাকাউন্ট মুছে ফেলা যাবে না (আপনি নতুন তৈরি করা ইউজার মুছতে পারেন)।',
                'message_en' => 'Core hackathon demo accounts cannot be deleted (you can delete newly created accounts).',
            ], JSON_UNESCAPED_UNICODE));
        }

        DB::statement('DELETE FROM users WHERE id = ?', [$targetUserId]);
        $actor = $user ?? JwtAuthService::getAuthenticatedUser() ?? ['username' => 'admin', 'role' => 'admin'];
        DatabaseSeeder::appendAuditEntry(
            (string) ($actor['username'] ?? 'admin'),
            (string) ($actor['role'] ?? 'admin'),
            'ADMIN_USER_DELETED',
            'user',
            (string) $targetUserId,
            ['username' => $curr['username'], 'note_bn' => "ব্যবহারকারী '{$curr['username']}' অপসারণ করা হয়েছে"],
            gmdate('c')
        );

        return [
            'deleted_id' => $targetUserId,
            'message_bn' => 'ব্যবহারকারী সফলভাবে অপসারণ করা হয়েছে।',
            'message_en' => 'User removed successfully.',
        ];
    }

    public static function getSiteSettings(): array
    {
        $rows = DB::select('SELECT * FROM site_settings ORDER BY id ASC');
        $kv = [];
        $items = [];
        foreach ($rows as $r) {
            $val = json_decode((string) $r['setting_value_json'], true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $val = $r['setting_value_json'];
            }
            $kv[$r['setting_key']] = $val;
            $items[] = [
                'id' => (int) $r['id'],
                'key' => $r['setting_key'],
                'value' => $val,
                'description_bn' => $r['description_bn'],
                'description_en' => $r['description_en'],
                'updated_by' => $r['updated_by'],
                'updated_at' => $r['updated_at'],
            ];
        }
        return ['settings' => $kv, 'items' => $items];
    }

    public static function updateSiteSettings(array $req, ?array $user = null): array
    {
        $settings = $req['settings'] ?? [];
        $actor = $user ?? JwtAuthService::getAuthenticatedUser() ?? ['username' => 'admin', 'role' => 'admin'];
        $actorName = (string) ($actor['username'] ?? 'admin');
        $nowIso = gmdate('c');

        foreach ($settings as $key => $val) {
            $valJson = json_encode($val, JSON_UNESCAPED_UNICODE);
            $existing = DB::selectOne('SELECT id FROM site_settings WHERE setting_key = ?', [$key]);
            if ($existing) {
                DB::statement(
                    'UPDATE site_settings SET setting_value_json = ?, updated_by = ?, updated_at = ? WHERE setting_key = ?',
                    [$valJson, $actorName, $nowIso, $key]
                );
            } else {
                DB::insert(
                    'INSERT INTO site_settings (setting_key, setting_value_json, description_bn, description_en, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                    [$key, $valJson, $key, $key, $actorName, $nowIso]
                );
            }
        }

        DatabaseSeeder::appendAuditEntry(
            $actorName,
            (string) ($actor['role'] ?? 'admin'),
            'SITE_SETTINGS_UPDATED',
            'site_settings',
            'GLOBAL',
            [
                'updated_keys' => array_keys($settings),
                'note_bn' => 'সিস্টেম ও রুল ইঞ্জিন সেটিংস হালনাগাদ করা হয়েছে',
            ],
            $nowIso
        );

        return array_merge(self::getSiteSettings(), [
            'message_bn' => 'সাইট ও রুল ইঞ্জিন সেটিংস সফলভাবে সংরক্ষিত হয়েছে।',
            'message_en' => 'Site and rules engine settings saved successfully.',
        ]);
    }

    public static function getAnalyticsSummary(): array
    {
        $plotsCnt = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM plots')['c'] ?? 0);
        $khatiansCnt = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM khatian_records')['c'] ?? 0);
        $personsCnt = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM persons')['c'] ?? 0);
        $usersCnt = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM users')['c'] ?? 0);

        $allDeeds = DB::select('SELECT * FROM deeds ORDER BY chain_index ASC');
        $ledgerStatus = LedgerService::verifyEntireLedger($allDeeds);

        $pendingMut = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM mutations WHERE status = 'PENDING'")['c'] ?? 0);
        $approvedMut = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM mutations WHERE status = 'APPROVED'")['c'] ?? 0);
        $rejectedMut = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM mutations WHERE status = 'REJECTED'")['c'] ?? 0);

        $activeLiens = DB::select("SELECT * FROM mortgages_liens WHERE status = 'ACTIVE'");
        $releasedLiens = DB::select("SELECT * FROM mortgages_liens WHERE status = 'RELEASED'");
        $totalActiveBdt = array_sum(array_map(fn(array $m) => (int) ($m['amount_bdt'] ?? 0), $activeLiens));

        $mouzaStats = DB::select(
            'SELECT l.id, l.mouza_bn, l.mouza_en, l.upazila_bn, l.upazila_en, l.district_bn, l.district_en,
                    COUNT(p.id) AS plot_count,
                    SUM(p.total_area_decimal) AS total_area_decimal
             FROM locations l
             LEFT JOIN plots p ON p.location_id = l.id
             GROUP BY l.id, l.mouza_bn, l.mouza_en, l.upazila_bn, l.upazila_en, l.district_bn, l.district_en
             ORDER BY l.id ASC'
        );

        $roleCounts = DB::select('SELECT role, COUNT(*) AS count FROM users GROUP BY role');

        return [
            'kpis' => [
                'total_plots' => $plotsCnt,
                'total_khatians' => $khatiansCnt,
                'total_persons' => $personsCnt,
                'total_users' => $usersCnt,
                'total_deeds' => count($allDeeds),
                'ledger_is_valid' => $ledgerStatus['is_valid'],
                'ledger_verified_deeds' => $ledgerStatus['verified_count'],
                'ledger_broken_deeds' => $ledgerStatus['broken_count'],
                'merkle_root' => $ledgerStatus['merkle_root'],
                'pending_mutations' => $pendingMut,
                'approved_mutations' => $approvedMut,
                'rejected_mutations' => $rejectedMut,
                'active_mortgages_count' => count($activeLiens),
                'released_mortgages_count' => count($releasedLiens),
                'active_mortgages_bdt' => $totalActiveBdt,
            ],
            'mouza_breakdown' => $mouzaStats,
            'role_breakdown' => $roleCounts,
        ];
    }
}
