<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Services\JwtAuthService;
use App\Services\LedgerService;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Laravel Controller for User Registration, Profile, Admin Users CRUD, Site Settings, and Enterprise Analytics.
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
            'is_identity_verified' => (int) ($u['is_identity_verified'] ?? 0),
            'is_profile_complete' => (int) ($u['is_profile_complete'] ?? 0),
            'avatar_url' => $u['avatar_url'] ?? null,
            'registration_channel' => $u['registration_channel'] ?? 'phone',
            'father_name_bn' => $u['father_name_bn'] ?? null,
            'mother_name_bn' => $u['mother_name_bn'] ?? null,
            'present_address_bn' => $u['present_address_bn'] ?? null,
            'date_of_birth' => $u['date_of_birth'] ?? null,
            'gender' => $u['gender'] ?? null,
            'token_version' => (int) ($u['token_version'] ?? 1),
            'last_login_at' => $u['last_login_at'] ?? null,
            'created_at' => $u['created_at'] ?? null,
        ];
    }

    public static function registerUser(array $req, ?array $actor = null): array
    {
        // I02: Security check: Only an active, authenticated Admin can provision officer or admin accounts.
        // If an unauthenticated caller or suspended admin attempts to register non-citizen role, fail closed with 403.
        $currentUser = $actor ?? JwtAuthService::getAuthenticatedUser();
        $isAdmin = $currentUser && ($currentUser['role'] ?? '') === 'admin' && ((int) ($currentUser['is_active'] ?? 0)) === 1;
        $requestedRole = (string) ($req['role'] ?? 'citizen');

        if ($requestedRole !== 'citizen') {
            if (!$isAdmin) {
                $code = ($currentUser && ($currentUser['role'] ?? '') === 'admin' && ((int) ($currentUser['is_active'] ?? 0)) === 0)
                    ? 'INACTIVE_ADMIN_CANNOT_PROVISION_ROLES'
                    : 'UNAUTHORIZED_ROLE_PROVISIONING';
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => $code,
                    'message_bn' => 'কর্মকর্তা বা অ্যাডমিন অ্যাকাউন্ট তৈরি করতে সক্রিয় অ্যাডমিন হিসেবে লগইন থাকা আবশ্যক।',
                    'message_en' => 'Only active administrators can provision officer or administrator accounts.',
                ], JSON_UNESCAPED_UNICODE));
            }
            $allowedRoles = ['citizen', 'sub_registrar', 'ac_land', 'bank_officer', 'field_verification_officer', 'support_agent', 'admin'];
            $role = in_array($requestedRole, $allowedRoles, true) ? $requestedRole : 'citizen';
        } else {
            $role = 'citizen';
        }

        $nowIso = gmdate('c');
        $regChannel = (string) ($req['registration_channel'] ?? '');
        $rawEmail = trim((string) ($req['email'] ?? ''));
        $rawPhone = trim((string) ($req['phone_dummy'] ?? ($req['phone_mock'] ?? ($req['phone'] ?? ''))));

        if ($regChannel === '') {
            $regChannel = (!empty($rawEmail) && empty($rawPhone)) ? 'email' : 'phone';
        }

        $uname = strtolower(trim((string) ($req['username'] ?? '')));
        if ($uname === '') {
            if (!empty($rawEmail)) {
                $parts = explode('@', strtolower($rawEmail));
                $uname = preg_replace('/[^a-z0-9_]/', '', $parts[0]);
            } elseif (!empty($rawPhone)) {
                $uname = 'cit_' . substr(preg_replace('/\D/', '', $rawPhone), -6);
            }
            if (strlen($uname) < 3) {
                $uname = 'user_' . substr(uniqid(), -6);
            }
        }

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

        $email = $rawEmail !== '' ? strtolower($rawEmail) : "{$uname}@citizen.bhumishield.gov.bd";
        $phone = $rawPhone !== '' ? $rawPhone : '01700-009999';

        $nameBn = trim((string) ($req['full_name_bn'] ?? $uname));
        $nameEn = trim((string) ($req['full_name_en'] ?? $nameBn));
        $officeBn = trim((string) ($req['office_bn'] ?? ($req['office_name'] ?? 'নাগরিক পোর্টাল — ঢাকা')));
        $officeEn = trim((string) ($req['office_en'] ?? ($req['office_name'] ?? 'Citizen Portal — Dhaka')));
        $nid = trim((string) ($req['nid'] ?? ($req['nid_mock'] ?? '')));
        if ($nid === '') {
            // Generate valid synthetic NID starting with 99
            $nid = '99' . str_pad((string) abs(crc32($uname . $nowIso)), 8, '0', STR_PAD_LEFT);
        }
        $password = (string) ($req['password'] ?? 'demo123');

        // F13: NID uniqueness safeguard across user accounts
        $existingNidUser = DB::selectOne('SELECT id, username FROM users WHERE nid = ?', [$nid]);
        if ($existingNidUser) {
            throw new \RuntimeException(json_encode([
                'status' => 409,
                'code' => 'NID_ALREADY_REGISTERED',
                'message_bn' => "এই জাতীয় পরিচয়পত্র (NID: {$nid}) ইতিমধ্যে অন্য একটি অ্যাকাউন্টে ({$existingNidUser['username']}) নিবন্ধিত আছে।",
                'message_en' => "NID {$nid} is already linked to another user account ({$existingNidUser['username']}).",
            ], JSON_UNESCAPED_UNICODE));
        }

        // I01: Identity verification. Self-registered public citizens start unverified (0)
        // to prevent unauthorized portfolio takeover. Admin-provisioned accounts start verified (1).
        $isIdentityVerified = $isAdmin ? 1 : 0;
        $isProfileComplete = $isAdmin ? 1 : 0;
        $avatarUrl = trim((string) ($req['avatar_url'] ?? ''));

        $userId = DB::insert(
            'INSERT INTO users (username, email, full_name_bn, full_name_en, role, office_bn, office_en, phone_dummy, nid, is_active, is_identity_verified, is_profile_complete, avatar_url, registration_channel, token_version, password_hash, last_login_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 1, ?, ?, ?)',
            [$uname, $email, $nameBn, $nameEn, $role, $officeBn, $officeEn, $phone, $nid, $isIdentityVerified, $isProfileComplete, $avatarUrl, $regChannel, JwtAuthService::hashPassword($password), $nowIso, $nowIso]
        );

        $existingPerson = DB::selectOne('SELECT id FROM persons WHERE nid = ?', [$nid]);
        if (!$existingPerson) {
            DB::insert(
                "INSERT INTO persons (name_bn, name_en, father_name_bn, father_name_en, mother_name_bn, nid, phone_dummy, is_deceased, heirs_recorded, address_bn, address_en) VALUES (?, ?, 'মো. আবদুল করিম', 'Md. Abdul Karim', 'রোকেয়া বেগম', ?, ?, 0, 1, ?, ?)",
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
                'channel' => $regChannel,
                'is_identity_verified' => $isIdentityVerified,
                'note_bn' => "নতুন ব্যবহারকারী নিবন্ধন: {$nameBn} ({$role}) [ভেরিফাইড: {$isIdentityVerified}] [চ্যানেল: {$regChannel}]",
            ],
            $nowIso
        );

        $userRow = DB::selectOne('SELECT * FROM users WHERE id = ?', [$userId]);
        $token = JwtAuthService::createToken(['sub' => $uname, 'role' => $role]);

        $msgBn = $isAdmin
            ? 'নতুন ব্যবহারকারী অ্যাকাউন্ট সফলভাবে তৈরি ও সক্রিয় করা হয়েছে।'
            : 'আপনার নাগরিক অ্যাকাউন্ট তৈরি সম্পন্ন হয়েছে। প্ল্যাটফর্মের সুরক্ষার স্বার্থে সুপার অ্যাডমিনের অনুমোদনের পর আপনি আপনার ড্যাশবোর্ড ও সেবাসমূহ অ্যাক্সেস করতে পারবেন।';
        $msgEn = $isAdmin
            ? 'User account created and activated successfully.'
            : 'Your citizen account has been created. It is pending Super Admin verification before full access is unlocked.';

        return [
            'access_token' => $token,
            'token_type' => 'bearer',
            'user' => self::serializeUser($userRow),
            'message_bn' => $msgBn,
            'message_en' => $msgEn,
        ];
    }

    public static function completeProfile(array $req, ?array $user = null): array
    {
        $u = $user ?? JwtAuthService::getAuthenticatedUser();
        if (!$u) {
            throw new \RuntimeException(json_encode([
                'status' => 401,
                'code' => 'AUTH_REQUIRED',
                'message_bn' => 'প্রোফাইল সম্পূর্ণ করতে অনুগ্রহ করে প্রথমে লগইন করুন।',
                'message_en' => 'Sign in to complete profile.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $freshUser = DB::selectOne('SELECT * FROM users WHERE id = ?', [$u['id']]);
        if (!$freshUser) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'USER_NOT_FOUND',
                'message_bn' => 'ব্যবহারকারী পাওয়া যায়নি।',
                'message_en' => 'User not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // Must be identity verified by admin first
        if (((int) ($freshUser['is_identity_verified'] ?? 0)) !== 1) {
            throw new \RuntimeException(json_encode([
                'status' => 403,
                'code' => 'PENDING_ADMIN_VERIFICATION',
                'message_bn' => 'আপনার অ্যাকাউন্টটি এখনও সুপার অ্যাডমিন কর্তৃক অনুমোদিত হয়নি। অ্যাডমিন কর্তৃক অ্যাকাউন্ট যাচাই ও অনুমোদনের পর প্রোফাইল সম্পন্ন করা যাবে।',
                'message_en' => 'Your account is pending Super Admin verification. You can complete your profile once approved.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $fullNameBn = trim((string) ($req['full_name_bn'] ?? $freshUser['full_name_bn']));
        $fullNameEn = trim((string) ($req['full_name_en'] ?? ($freshUser['full_name_en'] ?: $fullNameBn)));
        $phone = trim((string) ($req['phone_dummy'] ?? ($req['phone'] ?? $freshUser['phone_dummy'])));
        $email = strtolower(trim((string) ($req['email'] ?? $freshUser['email'])));
        $nid = trim((string) ($req['nid'] ?? $freshUser['nid']));
        $fatherNameBn = trim((string) ($req['father_name_bn'] ?? ($freshUser['father_name_bn'] ?? 'মো. আবদুল করিম')));
        $fatherNameEn = trim((string) ($req['father_name_en'] ?? 'Md. Abdul Karim'));
        $motherNameBn = trim((string) ($req['mother_name_bn'] ?? ($freshUser['mother_name_bn'] ?? 'রোকেয়া বেগম')));
        $addressBn = trim((string) ($req['present_address_bn'] ?? ($req['address_bn'] ?? ($freshUser['present_address_bn'] ?? 'ঢাকা, বাংলাদেশ'))));
        $dob = trim((string) ($req['date_of_birth'] ?? ($freshUser['date_of_birth'] ?? '1988-03-26')));
        $gender = trim((string) ($req['gender'] ?? ($freshUser['gender'] ?? 'male')));
        $avatarUrl = trim((string) ($req['avatar_url'] ?? ($freshUser['avatar_url'] ?? '')));

        if ($fullNameBn === '') {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'NAME_REQUIRED',
                'message_bn' => 'পূর্ণ নাম (বাংলায়) প্রদান করা আবশ্যক।',
                'message_en' => 'Full name in Bangla is required.',
            ], JSON_UNESCAPED_UNICODE));
        }
        if ($phone === '' || $phone === '01700-000000') {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'PHONE_REQUIRED',
                'message_bn' => 'সঠিক মোবাইল নম্বর প্রদান করা আবশ্যক।',
                'message_en' => 'Valid mobile phone number is required.',
            ], JSON_UNESCAPED_UNICODE));
        }
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'EMAIL_REQUIRED',
                'message_bn' => 'সঠিক ইমেইল ঠিকানা প্রদান করা আবশ্যক।',
                'message_en' => 'Valid email address is required.',
            ], JSON_UNESCAPED_UNICODE));
        }
        if ($nid === '') {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'NID_REQUIRED',
                'message_bn' => 'জাতীয় পরিচয়পত্র (NID) নম্বর প্রদান করা আবশ্যক।',
                'message_en' => 'National ID number is required.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // Check NID conflict with other users
        $conflict = DB::selectOne('SELECT id, username FROM users WHERE nid = ? AND id != ?', [$nid, $u['id']]);
        if ($conflict) {
            throw new \RuntimeException(json_encode([
                'status' => 409,
                'code' => 'NID_ALREADY_REGISTERED',
                'message_bn' => "এই জাতীয় পরিচয়পত্র (NID: {$nid}) ইতিমধ্যে অন্য ব্যবহারকারী ({$conflict['username']})-এর অ্যাকাউন্টে সংযুক্ত।",
                'message_en' => "NID {$nid} is already linked to another account ({$conflict['username']}).",
            ], JSON_UNESCAPED_UNICODE));
        }

        DB::statement(
            'UPDATE users SET full_name_bn = ?, full_name_en = ?, phone_dummy = ?, email = ?, nid = ?, father_name_bn = ?, mother_name_bn = ?, present_address_bn = ?, date_of_birth = ?, gender = ?, avatar_url = ?, is_profile_complete = 1 WHERE id = ?',
            [$fullNameBn, $fullNameEn, $phone, $email, $nid, $fatherNameBn, $motherNameBn, $addressBn, $dob, $gender, $avatarUrl, $u['id']]
        );

        // Ensure persons table row exists and is updated
        $person = DB::selectOne('SELECT id FROM persons WHERE nid = ?', [$nid]);
        if ($person) {
            DB::statement(
                'UPDATE persons SET name_bn = ?, name_en = ?, father_name_bn = ?, father_name_en = ?, mother_name_bn = ?, phone_dummy = ?, address_bn = ? WHERE id = ?',
                [$fullNameBn, $fullNameEn, $fatherNameBn, $fatherNameEn, $motherNameBn, $phone, $addressBn, $person['id']]
            );
        } else {
            DB::insert(
                'INSERT INTO persons (name_bn, name_en, father_name_bn, father_name_en, mother_name_bn, nid, phone_dummy, is_deceased, heirs_recorded, address_bn, address_en) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)',
                [$fullNameBn, $fullNameEn, $fatherNameBn, $fatherNameEn, $motherNameBn, $nid, $phone, $addressBn, $addressBn]
            );
        }

        DatabaseSeeder::appendAuditEntry(
            (string) ($freshUser['username'] ?? 'citizen'),
            (string) ($freshUser['role'] ?? 'citizen'),
            'CITIZEN_PROFILE_COMPLETED',
            'user',
            (string) $u['id'],
            [
                'username' => $freshUser['username'],
                'nid' => $nid,
                'phone' => $phone,
                'email' => $email,
                'note_bn' => "নাগরিকের বিস্তারিত প্রোফাইল সম্পন্নকরণ ও অ্যাকাউন্ট পূর্ণ সক্রিয়করণ সম্পন্ন: {$freshUser['username']}",
            ],
            gmdate('c')
        );

        $updated = DB::selectOne('SELECT * FROM users WHERE id = ?', [$u['id']]);

        return [
            'user' => self::serializeUser($updated),
            'message_bn' => 'আপনার প্রোফাইল সফলভাবে সম্পূর্ণ হয়েছে! অ্যাকাউন্ট এখন পূর্ণ সক্রিয় এবং সকল সেবা উন্মুক্ত।',
            'message_en' => 'Profile completed successfully! Your account is now fully active with all services unlocked.',
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

        if (($u['role'] ?? '') !== 'admin') {
            foreach (['office_bn', 'office_en'] as $field) {
                $requested = $req[$field] ?? ($req['office_name'] ?? $u[$field]);
                if ((string) $requested !== (string) $u[$field]) {
                    throw new \RuntimeException(json_encode(['status'=>403,'code'=>'OFFICE_ASSIGNMENT_ADMIN_ONLY','message_bn'=>'প্রতিষ্ঠান বা কার্যালয় পরিবর্তনের জন্য অ্যাডমিনের অনুমোদন প্রয়োজন।','message_en'=>'An administrator must change institution or office assignments.'], JSON_UNESCAPED_UNICODE));
                }
            }
        }
        $newToken = null;
        if (!empty($req['new_password'])) {
            if (strlen((string) $req['new_password']) < 8) throw new \RuntimeException(json_encode(['status'=>422,'code'=>'PASSWORD_TOO_SHORT','message_bn'=>'নতুন পাসওয়ার্ডে কমপক্ষে ৮টি অক্ষর থাকতে হবে।','message_en'=>'New password must contain at least 8 characters.'], JSON_UNESCAPED_UNICODE));
            $currPass = (string) ($req['current_password'] ?? '');
            if (!JwtAuthService::verifyPassword($currPass, (string) $u['password_hash'])) {
                throw new \RuntimeException(json_encode([
                    'status' => 400,
                    'code' => 'WRONG_CURRENT_PASSWORD',
                    'message_bn' => 'পাসওয়ার্ড পরিবর্তনের জন্য বর্তমান পাসওয়ার্ডটি সঠিক হতে হবে।',
                    'message_en' => 'Current password is required and must be correct to change password.',
                ], JSON_UNESCAPED_UNICODE));
            }
            $newVer = ((int) ($u['token_version'] ?? 1)) + 1;
            DB::statement('UPDATE users SET password_hash = ?, token_version = ? WHERE id = ?', [JwtAuthService::hashPassword((string) $req['new_password']), $newVer, $u['id']]);
            $newToken = JwtAuthService::createToken(['sub' => $u['username'], 'role' => $u['role'], 'ver' => $newVer]);
        }

        DB::statement(
            'UPDATE users SET full_name_bn = ?, full_name_en = ?, email = ?, phone_dummy = ?, office_bn = ?, office_en = ? WHERE id = ?',
            [
                $req['full_name_bn'] ?? $u['full_name_bn'],
                $req['full_name_en'] ?? $u['full_name_en'],
                $req['email'] ?? $u['email'],
                $req['phone_dummy'] ?? ($req['phone_mock'] ?? $u['phone_dummy']),
                $req['office_bn'] ?? ($req['office_name'] ?? $u['office_bn']),
                $req['office_en'] ?? ($req['office_name'] ?? $u['office_en']),
                $u['id'],
            ]
        );
        $updated = DB::selectOne('SELECT * FROM users WHERE id = ?', [$u['id']]);
        $res = [
            'user' => self::serializeUser($updated),
            'message_bn' => 'প্রোফাইল তথ্য সফলভাবে হালনাগাদ করা হয়েছে।',
            'message_en' => 'Profile updated successfully.',
        ];
        if ($newToken !== null) {
            $res['access_token'] = $newToken;
            $res['token_type'] = 'bearer';
        }
        return $res;
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
        if (strlen($newPass) < 8) throw new \RuntimeException(json_encode(['status'=>422,'code'=>'PASSWORD_TOO_SHORT','message_bn'=>'নতুন পাসওয়ার্ডে কমপক্ষে ৮টি অক্ষর থাকতে হবে।','message_en'=>'New password must contain at least 8 characters.'], JSON_UNESCAPED_UNICODE));
        if (!JwtAuthService::verifyPassword($currPass, (string) $u['password_hash'])) {
            throw new \RuntimeException(json_encode([
                'status' => 400,
                'code' => 'WRONG_CURRENT_PASSWORD',
                'message_bn' => 'বর্তমান পাসওয়ার্ডটি সঠিক নয়।',
                'message_en' => 'Current password is incorrect.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // I03: Invalidate previous sessions by incrementing token_version
        $newVer = ((int) ($u['token_version'] ?? 1)) + 1;
        DB::statement('UPDATE users SET password_hash = ?, token_version = ? WHERE id = ?', [JwtAuthService::hashPassword($newPass), $newVer, $u['id']]);
        $newToken = JwtAuthService::createToken(['sub' => $u['username'], 'role' => $u['role'], 'ver' => $newVer]);

        return [
            'access_token' => $newToken,
            'token_type' => 'bearer',
            'token_version' => $newVer,
            'message_bn' => 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে এবং পূর্ববর্তী সকল সেশন বাতিল করা হয়েছে।',
            'message_en' => 'Password changed successfully and all prior sessions revoked.',
        ];
    }

    public static function getCitizenLinkedProperties(?string $nid = null, ?array $user = null): array
    {
        $u = $user ?? JwtAuthService::getAuthenticatedUser() ?? [];
        $targetNid = trim((string) ($nid ?: ($u['nid'] ?? '')));

        if ($targetNid === '') {
            $targetNid = '9900001001';
        }

        // I01: Prevent unverified citizen accounts from claiming an existing owner's portfolio
        if (!empty($u) && ($u['role'] ?? '') === 'citizen' && ((int) ($u['is_identity_verified'] ?? 1)) === 0) {
            return [
                'found' => true,
                'is_verified' => false,
                'is_identity_verified' => false,
                'verification_status' => 'PENDING_OFFICIAL_VERIFICATION',
                'person' => [
                    'name_bn' => $u['full_name_bn'] ?? 'নাগরিক',
                    'name_en' => $u['full_name_en'] ?? 'Citizen',
                    'nid' => substr((string) ($u['nid'] ?? ''), 0, 4) . '****' . substr((string) ($u['nid'] ?? ''), -2),
                ],
                'plots' => [],
                'owned_plots' => [],
                'deeds' => [],
                'message_bn' => 'আপনার জাতীয় পরিচয়পত্র (NID) এখনও অফিশিয়ালি ভেরিফাই করা হয়নি। জমির তথ্য দেখতে ইউনিয়ন ডিজিটাল সেন্টার বা সহকারী কমিশনার (ভূমি) অফিসে ভেরিফিকেশন সম্পন্ন করুন। ডেমো অ্যাকাউন্টে (citizen/demo123) ইতিমধ্যে ভেরিফাইড প্রোফাইল রয়েছে।',
                'message_en' => 'National ID is pending official verification. Please verify your identity at the land office. Demo accounts are pre-verified.',
            ];
        }

        // F13: Private vault boundary - if citizen is authenticated and specifies a different NID
        if (!empty($u) && ($u['role'] ?? '') === 'citizen' && $nid !== null && trim($nid) !== '' && trim($nid) !== trim((string) ($u['nid'] ?? ''))) {
            throw new \RuntimeException(json_encode([
                'status' => 403,
                'code' => 'FORBIDDEN_VAULT_ACCESS',
                'message_bn' => 'অন্য নাগরিকের ব্যক্তিগত ল্যান্ড ভল্ট দেখার অনুমতি আপনার নেই।',
                'message_en' => 'You are not authorized to access another citizen\'s private land vault.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $person = DB::selectOne('SELECT * FROM persons WHERE nid = ?', [$targetNid]);
        if (!$person) {
            // F13: Honest 404, NEVER fall back to person 1!
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'NID_NOT_FOUND',
                'message_bn' => "জাতীয় পরিচয়পত্র (NID: {$targetNid})-এর বিপরীতে কোনো নাগরিকের রেকর্ড পাওয়া যায়নি।",
                'message_en' => "No citizen record found for NID {$targetNid}.",
            ], JSON_UNESCAPED_UNICODE));
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
            'found' => true,
            'is_verified' => true,
            'is_identity_verified' => true,
            'person' => $person,
            'plots' => $ownedPlots,
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

        // F18: Validate allowed roles
        $allowedRoles = ['citizen', 'sub_registrar', 'ac_land', 'bank_officer', 'admin'];
        $newRole = (string) ($req['role'] ?? $curr['role']);
        if (!in_array($newRole, $allowedRoles, true)) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_ROLE',
                'message_bn' => 'অননুমোদিত বা ভুল ইউজার রোল প্রদান করা হয়েছে।',
                'message_en' => 'Invalid role specified.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // F18: Protect last active administrator from demotion or deactivation
        $newIsActive = isset($req['is_active']) ? (int) $req['is_active'] : (int) $curr['is_active'];
        if (($curr['role'] === 'admin' && (int) $curr['is_active'] === 1) && ($newRole !== 'admin' || $newIsActive === 0)) {
            $activeAdminsCount = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND is_active = 1")['c'] ?? 0);
            if ($activeAdminsCount <= 1) {
                throw new \RuntimeException(json_encode([
                    'status' => 400,
                    'code' => 'CANNOT_DEMOTE_LAST_ADMIN',
                    'message_bn' => 'সিস্টেমের সর্বশেষ সক্রিয় অ্যাডমিনের রোল পরিবর্তন বা নিষ্ক্রিয় করা যাবে না।',
                    'message_en' => 'Cannot demote or deactivate the last active administrator.',
                ], JSON_UNESCAPED_UNICODE));
            }
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
                $newRole,
                $req['office_bn'] ?? ($req['office_name'] ?? $curr['office_bn']),
                $req['office_en'] ?? ($req['office_name'] ?? $curr['office_en']),
                $req['phone_dummy'] ?? $curr['phone_dummy'],
                $req['nid'] ?? $curr['nid'],
                $newIsActive,
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
                'new_role' => $newRole,
                'is_active' => $newIsActive,
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
                'message_bn' => 'মূল ৫টি সিস্টেম অ্যাকাউন্ট মুছে ফেলা যাবে না (আপনি নতুন তৈরি করা ইউজার মুছতে পারেন)।',
                'message_en' => 'Core system accounts cannot be deleted (you can delete newly created accounts).',
            ], JSON_UNESCAPED_UNICODE));
        }

        // F18: Protect last active administrator from deletion
        if ($curr['role'] === 'admin') {
            $activeAdminsCount = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND is_active = 1")['c'] ?? 0);
            if ($activeAdminsCount <= 1) {
                throw new \RuntimeException(json_encode([
                    'status' => 400,
                    'code' => 'CANNOT_DELETE_LAST_ADMIN',
                    'message_bn' => 'সিস্টেমের সর্বশেষ সক্রিয় অ্যাডমিন অ্যাকাউন্ট মুছে ফেলা যাবে না।',
                    'message_en' => 'Cannot delete the last active administrator.',
                ], JSON_UNESCAPED_UNICODE));
            }
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

    public static function verifyCitizenIdentity(int $targetUserId, ?array $user = null): array
    {
        $actor = $user ?? JwtAuthService::getAuthenticatedUser();
        if (!$actor || ($actor['role'] ?? '') !== 'admin' || ((int) ($actor['is_active'] ?? 0)) !== 1) {
            throw new \RuntimeException(json_encode([
                'status' => 403,
                'code' => 'UNAUTHORIZED',
                'message_bn' => 'নাগরিকের জাতীয় পরিচয়পত্র ভেরিফাই করতে সক্রিয় অ্যাডমিন অধিকার প্রয়োজন।',
                'message_en' => 'Only active administrators can verify citizen identity.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $userRow = DB::selectOne('SELECT * FROM users WHERE id = ?', [$targetUserId]);
        if (!$userRow) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'USER_NOT_FOUND',
                'message_bn' => 'ব্যবহারকারী পাওয়া যায়নি।',
                'message_en' => 'User not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        DB::statement('UPDATE users SET is_identity_verified = 1 WHERE id = ?', [$targetUserId]);

        DatabaseSeeder::appendAuditEntry(
            (string) ($actor['username'] ?? 'admin'),
            (string) ($actor['role'] ?? 'admin'),
            'CITIZEN_IDENTITY_VERIFIED',
            'user',
            (string) $targetUserId,
            [
                'username' => $userRow['username'],
                'nid' => $userRow['nid'] ?? '',
                'note_bn' => "নাগরিকের জাতীয় পরিচয়পত্র যাচাইকরণ সম্পন্ন: {$userRow['username']}",
            ],
            gmdate('c')
        );

        return [
            'id' => $targetUserId,
            'username' => $userRow['username'],
            'is_identity_verified' => 1,
            'message_bn' => 'নাগরিকের জাতীয় পরিচয়পত্র সফলভাবে ভেরিফাই করা হয়েছে।',
            'message_en' => 'Citizen identity verified successfully.',
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
                'setting_key' => $r['setting_key'],
                'value' => $val,
                'setting_value' => is_scalar($val) ? (string) $val : json_encode($val),
                'description_bn' => $r['description_bn'],
                'description_en' => $r['description_en'],
                'label_bn' => $r['description_bn'],
                'label_en' => $r['description_en'],
                'updated_by' => $r['updated_by'],
                'updated_at' => $r['updated_at'],
            ];
        }
        return ['settings' => $kv, 'map' => $kv, 'items' => $items];
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
        $lockedPlotsCnt = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM plots WHERE owner_sale_locked = 1')['c'] ?? 0);
        $openDisputesCnt = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM disputes WHERE status = 'OPEN'")['c'] ?? 0);

        $allDeeds = DB::select('SELECT * FROM deeds ORDER BY chain_index ASC');
        $ledgerStatus = LedgerService::verifyEntireLedger($allDeeds);

        $pendingMut = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM mutations WHERE status = 'PENDING'")['c'] ?? 0);
        $approvedMut = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM mutations WHERE status = 'APPROVED'")['c'] ?? 0);
        $rejectedMut = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM mutations WHERE status = 'REJECTED'")['c'] ?? 0);

        $activeLiens = DB::select("SELECT * FROM mortgages_liens WHERE status = 'ACTIVE'");
        $releasedLiens = DB::select("SELECT * FROM mortgages_liens WHERE status = 'RELEASED'");
        $totalActiveBdt = array_sum(array_map(fn(array $m) => (int) ($m['amount_bdt'] ?? 0), $activeLiens));
        $totalDeedValueBdt = array_sum(array_map(fn(array $d) => (int) ($d['price_bdt'] ?? 0), $allDeeds));

        $mouzaStats = DB::select(
            'SELECT l.id, l.mouza_bn, l.mouza_en, l.upazila_bn, l.upazila_en, l.district_bn, l.district_en, l.jl_no,
                    COUNT(p.id) AS plot_count,
                    SUM(p.total_area_decimal) AS total_area_decimal
             FROM locations l
             LEFT JOIN plots p ON p.location_id = l.id
             GROUP BY l.id, l.mouza_bn, l.mouza_en, l.upazila_bn, l.upazila_en, l.district_bn, l.district_en, l.jl_no
             ORDER BY l.id ASC'
        );

        foreach ($mouzaStats as &$ms) {
            $checked = DB::selectOne(
                'SELECT COUNT(DISTINCT r.plot_id) AS c FROM risk_reports r JOIN plots p ON p.id = r.plot_id WHERE p.location_id = ?',
                [$ms['id']]
            );
            $ms['checked_plot_count'] = (int) ($checked['c'] ?? 0);
            $ms['verification_coverage_pct'] = (int) $ms['plot_count'] > 0
                ? round(100 * $ms['checked_plot_count'] / (int) $ms['plot_count'], 2) : 0;
        }
        unset($ms);

        $roleCounts = DB::select('SELECT role, COUNT(*) AS count FROM users GROUP BY role');
        $recentAudit = DB::select('SELECT * FROM audit_log ORDER BY chain_index DESC LIMIT 8');

        $months = [];
        $addMonth = static function (string $date, string $metric) use (&$months): void {
            $key = substr($date, 0, 7);
            if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $key)) return;
            if (!isset($months[$key])) {
                $months[$key] = ['period' => $key, 'month' => gmdate('M Y', strtotime($key . '-01')), 'month_bn' => $key,
                    'deeds' => 0, 'mutations' => 0, 'blocked_risks' => 0];
            }
            $months[$key][$metric]++;
        };
        foreach ($allDeeds as $deed) $addMonth((string) $deed['created_at'], 'deeds');
        foreach (DB::select("SELECT created_at, decided_at FROM mutations WHERE status = 'APPROVED'") as $mutation) {
            $addMonth((string) ($mutation['decided_at'] ?: $mutation['created_at']), 'mutations');
        }
        foreach (DB::select("SELECT created_at FROM risk_reports WHERE verdict = 'HIGH_RISK'") as $report) {
            $addMonth((string) $report['created_at'], 'blocked_risks');
        }
        $first = $months ? min(array_keys($months)) : gmdate('Y-m');
        $cursor = new \DateTimeImmutable($first . '-01', new \DateTimeZone('UTC'));
        $last = max(gmdate('Y-m'), $months ? max(array_keys($months)) : gmdate('Y-m'));
        while ($cursor->format('Y-m') <= $last) {
            $key = $cursor->format('Y-m');
            $months[$key] ??= ['period' => $key, 'month' => $cursor->format('M Y'), 'month_bn' => $key,
                'deeds' => 0, 'mutations' => 0, 'blocked_risks' => 0];
            $cursor = $cursor->modify('+1 month');
        }
        ksort($months);
        $monthlySeries = array_values($months);

        return [
            'kpis' => [
                'total_plots' => $plotsCnt,
                'total_khatians' => $khatiansCnt,
                'total_persons' => $personsCnt,
                'total_users' => $usersCnt,
                'active_officers_count' => (int) (DB::selectOne("SELECT COUNT(*) AS c FROM users WHERE is_active = 1 AND role != 'citizen'")['c'] ?? 0),
                'total_deeds' => count($allDeeds),
                'held_deeds_count' => (int) (DB::selectOne("SELECT COUNT(*) AS c FROM deeds WHERE status = 'HELD'")['c'] ?? 0),
                'issued_noc_count' => (int) (DB::selectOne('SELECT COUNT(*) AS c FROM noc_certificates')['c'] ?? 0),
                'total_deed_value_bdt' => $totalDeedValueBdt,
                'locked_plots_count' => $lockedPlotsCnt,
                'open_disputes_count' => $openDisputesCnt,
                'ledger_is_valid' => $ledgerStatus['is_valid'],
                'ledger_verified_deeds' => $ledgerStatus['verified_count'],
                'ledger_broken_deeds' => $ledgerStatus['broken_count'],
                'ledger_integrity_pct' => count($allDeeds) > 0 ? round(($ledgerStatus['verified_count'] / count($allDeeds)) * 100, 2) : null,
                'merkle_root' => $ledgerStatus['merkle_root'],
                'pending_mutations' => $pendingMut,
                'approved_mutations' => $approvedMut,
                'rejected_mutations' => $rejectedMut,
                'active_mortgages_count' => count($activeLiens),
                'released_mortgages_count' => count($releasedLiens),
                'active_mortgages_bdt' => $totalActiveBdt,
            ],
            'counts' => [
                'plots' => $plotsCnt,
                'khatians' => $khatiansCnt,
                'deeds' => count($allDeeds),
                'active_mortgages' => count($activeLiens),
                'pending_mutations' => $pendingMut,
                'users' => $usersCnt,
            ],
            'mouza_breakdown' => $mouzaStats,
            'role_breakdown' => $roleCounts,
            'monthly_series' => $monthlySeries,
            'recent_activity' => $recentAudit,
        ];
    }
}
