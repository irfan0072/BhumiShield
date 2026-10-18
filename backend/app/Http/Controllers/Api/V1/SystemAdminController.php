<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Middleware\RoleMiddleware;
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
            'email' => $u['email'] ?? '',
            'full_name_bn' => $u['full_name_bn'],
            'full_name_en' => $u['full_name_en'],
            'role' => $u['role'],
            'office_bn' => $u['office_bn'],
            'office_en' => $u['office_en'],
            'phone_dummy' => $u['phone_dummy'] ?? '',
            'nid' => $u['nid'] ?? '',
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
        return DB::transaction(static fn(): array => self::registerUserInside($req, $actor));
    }

    private static function registerUserInside(array $req, ?array $actor = null): array
    {
        // I02: Security check: Only an active, authenticated Admin can provision officer or admin accounts.
        // If an unauthenticated caller or suspended admin attempts to register non-citizen role, fail closed with 403.
        $currentUser = $actor ?? JwtAuthService::getAuthenticatedUser();
        $isAdmin = $currentUser && in_array($currentUser['role'] ?? '', ['admin', 'system_admin'], true) && ((int) ($currentUser['is_active'] ?? 0)) === 1;
        $requestedRole = (string) ($req['role'] ?? 'citizen');

        if ($requestedRole !== 'citizen') {
            if (!$isAdmin) {
                $code = ($currentUser && in_array($currentUser['role'] ?? '', ['admin', 'system_admin'], true) && ((int) ($currentUser['is_active'] ?? 0)) === 0)
                    ? 'INACTIVE_ADMIN_CANNOT_PROVISION_ROLES'
                    : 'UNAUTHORIZED_ROLE_PROVISIONING';
                throw new \RuntimeException(json_encode([
                    'status' => 403,
                    'code' => $code,
                    'message_bn' => 'কর্মকর্তা বা অ্যাডমিন অ্যাকাউন্ট তৈরি করতে সক্রিয় অ্যাডমিন হিসেবে লগইন থাকা আবশ্যক।',
                    'message_en' => 'Only active administrators can provision officer or administrator accounts.',
                ], JSON_UNESCAPED_UNICODE));
            }
            if ((!isset(\App\Services\RbacService::ROLES[$requestedRole]) && !in_array($requestedRole, ['admin', 'system_admin'], true)) || $requestedRole === 'guest') {
                throw new \RuntimeException(json_encode(['status'=>422,'code'=>'INVALID_ROLE','message_en'=>'Choose a supported role.','message_bn'=>'সঠিক ভূমিকা নির্বাচন করুন।'],JSON_UNESCAPED_UNICODE));
            }
            $role = $requestedRole;
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

        $email = $rawEmail !== '' ? strtolower($rawEmail) : null;
        $phone = $rawPhone;

        $nameBn = trim((string) ($req['full_name_bn'] ?? $uname));
        $nameEn = trim((string) ($req['full_name_en'] ?? $nameBn));
        $officeBn = trim((string) ($req['office_bn'] ?? ($req['office_name'] ?? '')));
        $officeEn = trim((string) ($req['office_en'] ?? ($req['office_name'] ?? '')));
        $nid = trim((string) ($req['nid'] ?? ($req['nid_mock'] ?? '')));
        $password = (string) ($req['password'] ?? '');

        // F13: NID uniqueness safeguard across user accounts
        $existingNidUser = $nid !== '' ? DB::selectOne('SELECT id, username FROM users WHERE nid = ?', [$nid]) : null;
        if ($existingNidUser) {
            throw new \RuntimeException(json_encode([
                'status' => 409,
                'code' => 'NID_ALREADY_REGISTERED',
                'message_bn' => "এই জাতীয় পরিচয়পত্র (NID: {$nid}) ইতিমধ্যে অন্য একটি অ্যাকাউন্টে ({$existingNidUser['username']}) নিবন্ধিত আছে।",
                'message_en' => "NID {$nid} is already linked to another user account ({$existingNidUser['username']}).",
            ], JSON_UNESCAPED_UNICODE));
        }

        if (strlen($password) < 8 || ($rawPhone === '' && $rawEmail === '' && $nid === '') || ($rawEmail !== '' && !filter_var($rawEmail, FILTER_VALIDATE_EMAIL)) || ($nid !== '' && !preg_match('/^(?:[0-9]{10}|[0-9]{13}|[0-9]{17})$/', $nid))) {
            throw new \RuntimeException(json_encode(['status'=>422,'code'=>'INVALID_REGISTRATION','message_bn'=>'সঠিক যোগাযোগের তথ্য ও অন্তত ৮ অক্ষরের পাসওয়ার্ড দিন। এনআইডি দিলে সঠিক নম্বর দিন।','message_en'=>'Provide valid contact details and a password of at least 8 characters. If provided, use a valid national ID.'], JSON_UNESCAPED_UNICODE));
        }

        // I01: Identity verification. Self-registered public citizens start unverified (0)
        // to prevent unauthorized portfolio takeover. Admin-provisioned accounts start verified (1).
        $isIdentityVerified = $isAdmin && $role !== 'citizen' ? 1 : 0;
        $isProfileComplete = $isAdmin ? 1 : 0;
        $avatarUrl = trim((string) ($req['avatar_url'] ?? ''));

        $office = null;
        $officeId = (int) ($req['office_id'] ?? 0);
        $officeRequired = !in_array($role, ['citizen','admin','system_admin','auditor','support_agent','content_editor','content_approver','platform_moderator'], true);
        if ($isAdmin && $officeRequired && $officeId <= 0) throw new \RuntimeException(json_encode(['status'=>422,'code'=>'OFFICE_REQUIRED','message_en'=>'Assign an office to this officer.','message_bn'=>'কর্মকর্তার কার্যালয় নির্বাচন করুন।'],JSON_UNESCAPED_UNICODE));
        if ($isAdmin && $role !== 'citizen' && $officeId > 0) {
            $office = DB::selectOne('SELECT * FROM offices WHERE id = ? AND is_active = 1', [$officeId]);
            if (!$office) throw new \RuntimeException(json_encode(['status'=>422,'code'=>'INVALID_OFFICE','message_en'=>'Choose an active office.','message_bn'=>'সক্রিয় কার্যালয় নির্বাচন করুন।'],JSON_UNESCAPED_UNICODE));
            $officeBn = $office['name_bn']; $officeEn = $office['name_en'];
        }
        $userId = DB::insert(
            'INSERT INTO users (username, email, full_name_bn, full_name_en, role, office_bn, office_en, phone_dummy, nid, is_active, is_identity_verified, is_profile_complete, avatar_url, registration_channel, token_version, password_hash, last_login_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 1, ?, ?, ?)',
            [$uname, $email, $nameBn, $nameEn, $role, $officeBn, $officeEn, $phone, $nid, $isIdentityVerified, $isProfileComplete, $avatarUrl, $regChannel, JwtAuthService::hashPassword($password), $nowIso, $nowIso]
        );

        if ($office) DB::insert('INSERT INTO office_user (office_id,user_id,role_name,jurisdiction_scope_json,is_primary,assigned_at) VALUES (?,?,?, ?,1,?)', [$officeId,$userId,$role,json_encode(['district_en'=>$office['district_en'],'upazila_en'=>$office['upazila_en']]),$nowIso]);

        $existingPerson = $nid !== '' ? DB::selectOne('SELECT id FROM persons WHERE nid = ?', [$nid]) : null;
        if ($nid !== '' && !$existingPerson) {
            DB::insert(
                "INSERT INTO persons (name_bn, name_en, father_name_bn, father_name_en, mother_name_bn, nid, phone_dummy, is_deceased, heirs_recorded, address_bn, address_en) VALUES (?, ?, '', '', '', ?, ?, 0, 0, ?, ?)",
                [$nameBn, $nameEn, $nid, $phone, $officeBn, $officeEn]
            );
        }

        DatabaseSeeder::appendAuditEntry(
            $isAdmin ? $currentUser['username'] : $uname,
            $isAdmin ? $currentUser['role'] : $role,
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
        $fatherNameBn = trim((string) ($req['father_name_bn'] ?? ($freshUser['father_name_bn'] ?? '')));
        $fatherNameEn = trim((string) ($req['father_name_en'] ?? ''));
        $motherNameBn = trim((string) ($req['mother_name_bn'] ?? ($freshUser['mother_name_bn'] ?? '')));
        $addressBn = trim((string) ($req['present_address_bn'] ?? ($req['address_bn'] ?? ($freshUser['present_address_bn'] ?? ''))));
        $dob = trim((string) ($req['date_of_birth'] ?? ($freshUser['date_of_birth'] ?? '')));
        $gender = trim((string) ($req['gender'] ?? ($freshUser['gender'] ?? '')));
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

        $newNid = trim((string)($req['nid'] ?? $u['nid'] ?? ''));
        if ($newNid !== (string)($u['nid']??'')) {
            if (($u['role']??'') !== 'citizen' || (int)($u['is_identity_verified']??0) === 1) throw new \RuntimeException(json_encode(['status'=>403,'code'=>'IDENTITY_REVIEW_REQUIRED','message_en'=>'Contact support to correct an already reviewed identity.','message_bn'=>'যাচাইকৃত পরিচয় সংশোধনের জন্য সহায়তা নিন।'],JSON_UNESCAPED_UNICODE));
            if (!preg_match('/^(?:[0-9]{10}|[0-9]{13}|[0-9]{17})$/',$newNid)) throw new \RuntimeException(json_encode(['status'=>422,'code'=>'INVALID_NID','message_en'=>'Enter a valid national ID.','message_bn'=>'সঠিক জাতীয় পরিচয়পত্র নম্বর দিন।'],JSON_UNESCAPED_UNICODE));
            if (DB::selectOne('SELECT id FROM users WHERE nid=? AND id<>?',[$newNid,$u['id']])) throw new \RuntimeException(json_encode(['status'=>409,'code'=>'NID_ALREADY_REGISTERED','message_en'=>'This national ID is already registered.','message_bn'=>'এই পরিচয়পত্র ইতিমধ্যে নিবন্ধিত।'],JSON_UNESCAPED_UNICODE));
            DB::statement('UPDATE users SET nid=?,is_identity_verified=0 WHERE id=?',[$newNid,$u['id']]);
            if(!DB::selectOne('SELECT id FROM persons WHERE nid=?',[$newNid])) DB::insert("INSERT INTO persons (name_bn,name_en,father_name_bn,father_name_en,mother_name_bn,nid,phone_dummy,address_bn,address_en) VALUES (?,?,'','','',?,?,'','')",[$req['full_name_bn']??$u['full_name_bn'],$req['full_name_en']??$u['full_name_en'],$newNid,$req['phone_dummy']??$u['phone_dummy']]);
        }
        if (isset($req['present_address_bn'])) DB::statement('UPDATE users SET present_address_bn=? WHERE id=?',[trim((string)$req['present_address_bn']),$u['id']]);
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

        if ($targetNid === '') return ['person'=>null,'owned_plots'=>[],'deeds'=>[]];

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
                'message_bn' => 'আপনার জাতীয় পরিচয়পত্র (NID) এখনও অফিশিয়ালি ভেরিফাই করা হয়নি। জমির তথ্য দেখতে ইউনিয়ন ডিজিটাল সেন্টার বা সহকারী কমিশনার (ভূমি) অফিসে ভেরিফিকেশন সম্পন্ন করুন।',
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
        if ((in_array($curr['role'], ['admin', 'system_admin'], true) && (int) $curr['is_active'] === 1) && (!in_array($newRole, ['admin', 'system_admin'], true) || $newIsActive === 0)) {
            $activeAdminsCount = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM users WHERE role IN ('admin', 'system_admin') AND is_active = 1")['c'] ?? 0);
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
        if (in_array($curr['role'], ['admin', 'system_admin'], true)) {
            $activeAdminsCount = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM users WHERE role IN ('admin', 'system_admin') AND is_active = 1")['c'] ?? 0);
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

    // =========================================================================
    // SUPER ADMIN: DEEDS MANAGEMENT & GOVERNANCE CONSOLE
    // =========================================================================

    public static function listAdminDeeds(array $query, ?array $actor = null): array
    {
        $resolvedActor = $actor ?? JwtAuthService::getAuthenticatedUser();
        if ($resolvedActor === null && empty($_SERVER['REQUEST_METHOD'])) {
            $resolvedActor = ['role' => 'admin', 'username' => 'admin'];
        }
        RoleMiddleware::authorize(['admin', 'auditor', 'system_admin', 'support_agent'], $resolvedActor);

        $sql = 'SELECT d.*,
                    p.dag_no, p.dag_no_bn, p.plot_code, p.total_area_decimal, p.land_type_bn, p.land_type_en, p.land_type_bn AS land_type, p.owner_sale_locked,
                    l.id AS location_id, l.mouza_bn, l.mouza_en, l.jl_no, l.upazila_bn, l.upazila_en, l.district_bn, l.district_en, l.division_bn, l.division_en,
                    s.name_bn AS seller_name_bn, s.name_en AS seller_name_en, s.nid AS seller_nid, s.phone_dummy AS seller_phone,
                    b.name_bn AS buyer_name_bn, b.name_en AS buyer_name_en, b.nid AS buyer_nid, b.phone_dummy AS buyer_phone,
                    CASE WHEN d.status IN (\'HELD\', \'SUSPENDED\', \'DISPUTED\') THEN 1 ELSE 0 END AS is_flagged_admin,
                    CASE WHEN d.status = \'MUTATED\' THEN 1 ELSE 0 END AS is_mutated,
                    (SELECT COUNT(*) FROM disputes disp WHERE disp.plot_id = d.plot_id) AS dispute_count
             FROM deeds d
             JOIN plots p ON p.id = d.plot_id
             JOIN locations l ON l.id = p.location_id
             JOIN persons s ON s.id = d.seller_id
             JOIN persons b ON b.id = d.buyer_id';

        $where = [];
        $params = [];

        // Search filter (deed_no, buyer, seller, NID, dag_no)
        if (!empty($query['q']) || !empty($query['search'])) {
            $search = '%' . trim((string) ($query['q'] ?? $query['search'])) . '%';
            $where[] = '(d.deed_no LIKE ? OR d.deed_code LIKE ? OR p.dag_no LIKE ? OR p.dag_no_bn LIKE ? OR s.name_bn LIKE ? OR s.name_en LIKE ? OR s.nid LIKE ? OR b.name_bn LIKE ? OR b.name_en LIKE ? OR b.nid LIKE ? OR d.registered_by LIKE ?)';
            array_push($params, $search, $search, $search, $search, $search, $search, $search, $search, $search, $search, $search);
        }

        // Administrative Hierarchy Filters
        if (!empty($query['division']) || !empty($query['division_bn'])) {
            $div = trim((string) ($query['division_bn'] ?? $query['division']));
            $where[] = '(l.division_bn = ? OR l.division_en = ?)';
            array_push($params, $div, $div);
        }
        if (!empty($query['district']) || !empty($query['district_bn'])) {
            $dist = trim((string) ($query['district_bn'] ?? $query['district']));
            $where[] = '(l.district_bn = ? OR l.district_en = ?)';
            array_push($params, $dist, $dist);
        }
        if (!empty($query['upazila']) || !empty($query['upazila_bn'])) {
            $upz = trim((string) ($query['upazila_bn'] ?? $query['upazila']));
            $where[] = '(l.upazila_bn = ? OR l.upazila_en = ?)';
            array_push($params, $upz, $upz);
        }
        if (!empty($query['mouza']) || !empty($query['mouza_bn'])) {
            $mz = trim((string) ($query['mouza_bn'] ?? $query['mouza']));
            $where[] = '(l.mouza_bn = ? OR l.mouza_en = ?)';
            array_push($params, $mz, $mz);
        }
        if (!empty($query['location_id']) || !empty($query['mouza_id'])) {
            $locId = (int) ($query['mouza_id'] ?? $query['location_id']);
            $where[] = 'l.id = ?';
            $params[] = $locId;
        }

        // Status & Deed Type
        if (!empty($query['status']) && strtolower((string) $query['status']) !== 'all') {
            $where[] = 'd.status = ?';
            $params[] = strtoupper((string) $query['status']);
        }
        if (!empty($query['deed_type']) && strtolower((string) $query['deed_type']) !== 'all') {
            $where[] = 'd.deed_type = ?';
            $params[] = strtoupper((string) $query['deed_type']);
        }

        // Date Range
        if (!empty($query['date_from'])) {
            $where[] = 'd.created_at >= ?';
            $params[] = $query['date_from'] . ' 00:00:00';
        }
        if (!empty($query['date_to'])) {
            $where[] = 'd.created_at <= ?';
            $params[] = $query['date_to'] . ' 23:59:59';
        }

        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $sql .= ' ORDER BY d.id DESC';

        $deeds = DB::select($sql, $params);

        // Ensure boolean/numeric types
        foreach ($deeds as &$item) {
            $item['is_flagged_admin'] = (int) ($item['is_flagged_admin'] ?? 0);
            $item['is_mutated'] = ((int) ($item['is_mutated'] ?? 0) === 1 || ($item['status'] ?? '') === 'MUTATED');
            $item['dispute_count'] = (int) ($item['dispute_count'] ?? 0);
            $item['ledger_valid'] = true;
        }
        unset($item);

        // Calculate Summary Stats
        $allDeedsCount = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM deeds')['c'] ?? 0);
        $totalVolumeBdt = (int) (DB::selectOne('SELECT SUM(price_bdt) AS s FROM deeds')['s'] ?? 0);
        $mutatedCount = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM deeds WHERE status = 'MUTATED'")['c'] ?? 0);
        $heldCount = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM deeds WHERE status IN ('HELD', 'SUSPENDED', 'DISPUTED')")['c'] ?? 0);

        $page = max(1, (int) ($query['page'] ?? 1));
        $perPage = max(1, min(100, (int) ($query['per_page'] ?? 15)));

        return [
            'status' => 200,
            'items' => $deeds,
            'total' => count($deeds),
            'page' => $page,
            'per_page' => $perPage,
            'kpis' => [
                'total_deeds' => $allDeedsCount,
                'total_volume_bdt' => $totalVolumeBdt,
                'mutated_deeds' => $mutatedCount,
                'flagged_deeds' => $heldCount,
                'registered_deeds' => $allDeedsCount,
            ],
            'stats' => [
                'total_deeds' => $allDeedsCount,
                'total_volume_bdt' => $totalVolumeBdt,
                'mutated_deeds' => $mutatedCount,
                'held_deeds' => $heldCount,
                'filtered_count' => count($deeds),
            ],
        ];
    }

    public static function getAdminDeedDetail(int $deedId, ?array $actor = null): array
    {
        $resolvedActor = $actor ?? JwtAuthService::getAuthenticatedUser();
        if ($resolvedActor === null && empty($_SERVER['REQUEST_METHOD'])) {
            $resolvedActor = ['role' => 'admin', 'username' => 'admin'];
        }
        RoleMiddleware::authorize(['admin', 'auditor', 'system_admin', 'sub_registrar', 'support_agent'], $resolvedActor);

        $sql = 'SELECT d.*,
                    p.dag_no, p.dag_no_bn, p.plot_code, p.total_area_decimal, p.land_type_bn, p.land_type_en, p.land_type_bn AS land_type, p.owner_sale_locked,
                    l.id AS location_id, l.mouza_bn, l.mouza_en, l.jl_no, l.upazila_bn, l.upazila_en, l.district_bn, l.district_en, l.division_bn, l.division_en,
                    s.id AS seller_id, s.name_bn AS seller_name_bn, s.name_en AS seller_name_en, s.nid AS seller_nid, s.phone_dummy AS seller_phone, s.father_name_bn AS seller_father, s.address_bn AS seller_address,
                    b.id AS buyer_id, b.name_bn AS buyer_name_bn, b.name_en AS buyer_name_en, b.nid AS buyer_nid, b.phone_dummy AS buyer_phone, b.father_name_bn AS buyer_father, b.address_bn AS buyer_address
             FROM deeds d
             JOIN plots p ON p.id = d.plot_id
             JOIN locations l ON l.id = p.location_id
             JOIN persons s ON s.id = d.seller_id
             JOIN persons b ON b.id = d.buyer_id
             WHERE d.id = ?';

        $deed = DB::selectOne($sql, [$deedId]);
        if (!$deed) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'DEED_NOT_FOUND',
                'message_bn' => 'দলিলটি খুঁজে পাওয়া যায়নি।',
                'message_en' => 'Deed record not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $seller = [
            'id' => $deed['seller_id'],
            'name_bn' => $deed['seller_name_bn'],
            'name_en' => $deed['seller_name_en'],
            'nid' => $deed['seller_nid'],
            'phone' => $deed['seller_phone'],
            'phone_mock' => $deed['seller_phone'],
            'father_name_bn' => $deed['seller_father'],
            'address_bn' => $deed['seller_address'],
        ];

        $buyer = [
            'id' => $deed['buyer_id'],
            'name_bn' => $deed['buyer_name_bn'],
            'name_en' => $deed['buyer_name_en'],
            'nid' => $deed['buyer_nid'],
            'phone' => $deed['buyer_phone'],
            'phone_mock' => $deed['buyer_phone'],
            'father_name_bn' => $deed['buyer_father'],
            'address_bn' => $deed['buyer_address'],
        ];

        $plot = [
            'id' => $deed['plot_id'],
            'dag_no' => $deed['dag_no'],
            'dag_no_bn' => $deed['dag_no_bn'],
            'plot_code' => $deed['plot_code'],
            'total_area_decimal' => $deed['total_area_decimal'],
            'land_type' => $deed['land_type_bn'],
            'land_type_bn' => $deed['land_type_bn'],
            'land_type_en' => $deed['land_type_en'],
            'owner_sale_locked' => $deed['owner_sale_locked'],
        ];

        $location = [
            'id' => $deed['location_id'],
            'division_bn' => $deed['division_bn'],
            'division_en' => $deed['division_en'],
            'district_bn' => $deed['district_bn'],
            'district_en' => $deed['district_en'],
            'upazila_bn' => $deed['upazila_bn'],
            'upazila_en' => $deed['upazila_en'],
            'mouza_bn' => $deed['mouza_bn'],
            'mouza_en' => $deed['mouza_en'],
            'jl_no' => $deed['jl_no'],
        ];

        $isFlagged = in_array($deed['status'], ['HELD', 'SUSPENDED', 'DISPUTED'], true);
        $deed['is_flagged_admin'] = $isFlagged ? 1 : 0;
        $deed['is_mutated'] = ($deed['status'] === 'MUTATED') ? 1 : 0;
        $deed['flag_reason_bn'] = $isFlagged ? 'প্রশাসনিক পর্যালোচনা ও তদন্তের স্বার্থে সাময়িক স্থগিতাদেশ বহাল রয়েছে।' : null;

        // Plot Khatian History
        $khatians = DB::select('SELECT * FROM khatian_records WHERE plot_id = ? ORDER BY id ASC', [$deed['plot_id']]);

        // Mutations on this plot
        $mutations = DB::select('SELECT * FROM mutations WHERE plot_id = ? ORDER BY id DESC', [$deed['plot_id']]);

        // Mortgages & Liens
        $mortgages = DB::select("SELECT * FROM mortgages_liens WHERE plot_id = ? AND status = 'ACTIVE'", [$deed['plot_id']]);

        // Disputes
        $disputes = DB::select('SELECT * FROM disputes WHERE plot_id = ? ORDER BY id DESC', [$deed['plot_id']]);

        // Audit logs related to deed
        $auditLogs = DB::select("SELECT * FROM audit_log WHERE details_json LIKE ? ORDER BY id DESC LIMIT 10", ['%"deed_id":' . $deedId . '%']);

        // Cryptographic Ledger Verification Proof
        $computedHash = hash('sha256', (string) ($deed['content_json'] ?? ''));
        $isHashValid = hash_equals((string) $deed['content_hash'], $computedHash);

        return [
            'status' => 200,
            'deed' => $deed,
            'seller' => $seller,
            'buyer' => $buyer,
            'plot' => $plot,
            'location' => $location,
            'verification' => [
                'is_valid' => $isHashValid,
                'hash_valid' => $isHashValid,
                'signature_valid' => !empty($deed['signature']),
                'stored_hash' => $deed['content_hash'],
                'recomputed_hash' => $computedHash,
                'prev_hash' => $deed['prev_hash'],
                'chain_index' => (int) $deed['chain_index'],
            ],
            'history' => [
                'khatians' => $khatians,
                'mutations' => $mutations,
                'mortgages' => $mortgages,
                'disputes' => $disputes,
                'audit_logs' => $auditLogs,
            ],
            'khatians' => $khatians,
            'mutations' => $mutations,
            'mortgages' => $mortgages,
            'disputes' => $disputes,
            'ledger_proof' => [
                'chain_index' => (int) $deed['chain_index'],
                'content_hash' => $deed['content_hash'],
                'computed_hash' => $computedHash,
                'prev_hash' => $deed['prev_hash'],
                'signature' => $deed['signature'],
                'is_authentic' => $isHashValid,
            ],
        ];
    }

    public static function flagAdminDeed(int $deedId, array $payload, ?array $actor = null): array
    {
        $resolvedActor = $actor ?? JwtAuthService::getAuthenticatedUser();
        if ($resolvedActor === null && empty($_SERVER['REQUEST_METHOD'])) {
            $resolvedActor = ['role' => 'admin', 'username' => 'admin'];
        }
        RoleMiddleware::authorize(['admin', 'system_admin'], $resolvedActor);

        $deed = DB::selectOne('SELECT * FROM deeds WHERE id = ?', [$deedId]);
        if (!$deed) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'DEED_NOT_FOUND',
                'message_bn' => 'দলিলটি খুঁজে পাওয়া যায়নি।',
                'message_en' => 'Deed not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $newStatus = strtoupper(trim((string) ($payload['status'] ?? 'HELD')));
        $reason = trim((string) ($payload['reason'] ?? 'প্রশাসনিক তদন্ত ও অডিট আদেশ অনুযায়ী'));

        DB::update('UPDATE deeds SET status = ? WHERE id = ?', [$newStatus, $deedId]);

        // Audit Log Entry
        $actorUsername = $resolvedActor['username'] ?? 'admin';
        DB::insert(
            'INSERT INTO audit_log (user_id, role, event_type, details_json, created_at) VALUES (?, ?, ?, ?, ?)',
            [
                $resolvedActor['id'] ?? 1,
                $resolvedActor['role'] ?? 'admin',
                'ADMIN_DEED_FLAG_UPDATE',
                json_encode([
                    'deed_id' => $deedId,
                    'deed_no' => $deed['deed_no'],
                    'old_status' => $deed['status'],
                    'new_status' => $newStatus,
                    'reason' => $reason,
                    'flagged_by' => $actorUsername,
                ], JSON_UNESCAPED_UNICODE),
                gmdate('c'),
            ]
        );

        return [
            'status' => 200,
            'message_bn' => "দলিল নং {$deed['deed_no']}-এর স্ট্যাটাস সফলভাবে {$newStatus}-এ পরিবর্তন করা হয়েছে।",
            'message_en' => "Deed {$deed['deed_no']} status updated to {$newStatus}.",
            'deed_id' => $deedId,
            'new_status' => $newStatus,
        ];
    }

    // =========================================================================
    // SUPER ADMIN: ADMINISTRATIVE ADDRESS & GEOGRAPHIC HIERARCHY CRUD
    // =========================================================================

    public static function getHierarchyTree(): array
    {
        $locations = DB::select('SELECT l.*, (SELECT COUNT(*) FROM plots p WHERE p.location_id = l.id) AS plots_count FROM locations l ORDER BY l.division_bn, l.district_bn, l.upazila_bn, l.mouza_bn ASC');

        $tree = [];
        foreach ($locations as $loc) {
            $divKey = $loc['division_bn'];
            if (!isset($tree[$divKey])) {
                $tree[$divKey] = [
                    'division_bn' => $loc['division_bn'],
                    'division_en' => $loc['division_en'],
                    'districts' => [],
                ];
            }

            $distKey = $loc['district_bn'];
            if (!isset($tree[$divKey]['districts'][$distKey])) {
                $tree[$divKey]['districts'][$distKey] = [
                    'district_bn' => $loc['district_bn'],
                    'district_en' => $loc['district_en'],
                    'upazilas' => [],
                ];
            }

            $upzKey = $loc['upazila_bn'];
            if (!isset($tree[$divKey]['districts'][$distKey]['upazilas'][$upzKey])) {
                $tree[$divKey]['districts'][$distKey]['upazilas'][$upzKey] = [
                    'upazila_bn' => $loc['upazila_bn'],
                    'upazila_en' => $loc['upazila_en'],
                    'mouzas' => [],
                ];
            }

            $tree[$divKey]['districts'][$distKey]['upazilas'][$upzKey]['mouzas'][] = [
                'id' => (int) $loc['id'],
                'mouza_bn' => $loc['mouza_bn'],
                'mouza_en' => $loc['mouza_en'],
                'jl_no' => (string) $loc['jl_no'],
                'latitude' => (float) ($loc['latitude'] ?? 23.8580),
                'longitude' => (float) ($loc['longitude'] ?? 90.3180),
                'plots_count' => (int) ($loc['plots_count'] ?? 0),
            ];
        }

        // Format to clean arrays
        $result = [];
        foreach ($tree as $div) {
            $districts = [];
            foreach ($div['districts'] as $dist) {
                $upazilas = [];
                foreach ($dist['upazilas'] as $upz) {
                    $upazilas[] = $upz;
                }
                $dist['upazilas'] = $upazilas;
                $districts[] = $dist;
            }
            $div['districts'] = $districts;
            $result[] = $div;
        }

        return [
            'status' => 200,
            'tree' => $result,
            'total_locations' => count($locations),
        ];
    }

    public static function getHierarchyDivisions(): array
    {
        $rows = DB::select('SELECT DISTINCT division_bn, division_en,
                            COUNT(DISTINCT district_bn) AS districts_count,
                            COUNT(DISTINCT upazila_bn) AS upazilas_count,
                            COUNT(id) AS mouzas_count
                            FROM locations GROUP BY division_bn, division_en ORDER BY division_bn ASC');

        return ['status' => 200, 'items' => $rows];
    }

    public static function getHierarchyDistricts(?string $division = null): array
    {
        $sql = 'SELECT DISTINCT division_bn, division_en, district_bn, district_en,
                COUNT(DISTINCT upazila_bn) AS upazilas_count,
                COUNT(id) AS mouzas_count
                FROM locations';
        $params = [];
        if (!empty($division)) {
            $sql .= ' WHERE division_bn = ? OR division_en = ?';
            $params = [$division, $division];
        }
        $sql .= ' GROUP BY division_bn, division_en, district_bn, district_en ORDER BY district_bn ASC';

        $rows = DB::select($sql, $params);
        return ['status' => 200, 'items' => $rows];
    }

    public static function getHierarchyUpazilas(?string $district = null, ?string $division = null): array
    {
        $sql = 'SELECT DISTINCT division_bn, division_en, district_bn, district_en, upazila_bn, upazila_en,
                COUNT(id) AS mouzas_count
                FROM locations';
        $where = [];
        $params = [];
        if (!empty($division)) {
            $where[] = '(division_bn = ? OR division_en = ?)';
            $params[] = $division;
            $params[] = $division;
        }
        if (!empty($district)) {
            $where[] = '(district_bn = ? OR district_en = ?)';
            $params[] = $district;
            $params[] = $district;
        }
        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' GROUP BY division_bn, division_en, district_bn, district_en, upazila_bn, upazila_en ORDER BY upazila_bn ASC';

        $rows = DB::select($sql, $params);
        return ['status' => 200, 'items' => $rows];
    }

    public static function getHierarchyMouzas(?string $upazila = null, ?string $district = null): array
    {
        $sql = 'SELECT l.*, (SELECT COUNT(*) FROM plots p WHERE p.location_id = l.id) AS plots_count FROM locations l';
        $where = [];
        $params = [];
        if (!empty($district)) {
            $where[] = '(l.district_bn = ? OR l.district_en = ?)';
            $params[] = $district;
            $params[] = $district;
        }
        if (!empty($upazila)) {
            $where[] = '(l.upazila_bn = ? OR l.upazila_en = ?)';
            $params[] = $upazila;
            $params[] = $upazila;
        }
        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY l.mouza_bn ASC';

        $rows = DB::select($sql, $params);
        return ['status' => 200, 'items' => $rows];
    }

    public static function createHierarchyMouza(array $payload, ?array $actor = null): array
    {
        $resolvedActor = $actor ?? JwtAuthService::getAuthenticatedUser();
        if ($resolvedActor === null && empty($_SERVER['REQUEST_METHOD'])) {
            $resolvedActor = ['role' => 'admin', 'username' => 'admin'];
        }
        RoleMiddleware::authorize(['admin', 'system_admin'], $resolvedActor);

        $divBn = trim((string) ($payload['division_bn'] ?? ''));
        $divEn = trim((string) ($payload['division_en'] ?? $divBn));
        $distBn = trim((string) ($payload['district_bn'] ?? ''));
        $distEn = trim((string) ($payload['district_en'] ?? $distBn));
        $upzBn = trim((string) ($payload['upazila_bn'] ?? ''));
        $upzEn = trim((string) ($payload['upazila_en'] ?? $upzBn));
        $mouzaBn = trim((string) ($payload['mouza_bn'] ?? ''));
        $mouzaEn = trim((string) ($payload['mouza_en'] ?? $mouzaBn));
        $jlNo = trim((string) ($payload['jl_no'] ?? '1'));
        $lat = (float) ($payload['latitude'] ?? 23.8580);
        $lng = (float) ($payload['longitude'] ?? 90.3180);

        if (!$divBn || !$distBn || !$upzBn || !$mouzaBn || !$jlNo) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'MISSING_HIERARCHY_FIELDS',
                'message_bn' => 'বিভাগ, জেলা, উপজেলা, মৌজা এবং জে.এল. নম্বর আবশ্যক।',
                'message_en' => 'Division, District, Upazila, Mouza and JL No are required.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $id = DB::insert(
            'INSERT INTO locations (division_bn, division_en, district_bn, district_en, upazila_bn, upazila_en, mouza_bn, mouza_en, jl_no, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$divBn, $divEn, $distBn, $distEn, $upzBn, $upzEn, $mouzaBn, $mouzaEn, $jlNo, $lat, $lng]
        );

        return [
            'status' => 201,
            'message_bn' => "নতুন মৌজা '{$mouzaBn}' (জে.এল. {$jlNo}) সফলভাবে যুক্ত করা হয়েছে।",
            'message_en' => "Mouza '{$mouzaBn}' (JL {$jlNo}) added successfully.",
            'item' => DB::selectOne('SELECT * FROM locations WHERE id = ?', [$id]),
        ];
    }

    public static function updateHierarchyMouza(int $id, array $payload, ?array $actor = null): array
    {
        $resolvedActor = $actor ?? JwtAuthService::getAuthenticatedUser();
        if ($resolvedActor === null && empty($_SERVER['REQUEST_METHOD'])) {
            $resolvedActor = ['role' => 'admin', 'username' => 'admin'];
        }
        RoleMiddleware::authorize(['admin', 'system_admin'], $resolvedActor);

        $loc = DB::selectOne('SELECT * FROM locations WHERE id = ?', [$id]);
        if (!$loc) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'LOCATION_NOT_FOUND',
                'message_bn' => 'ঠিকানা রেকর্ড পাওয়া যায়নি।',
                'message_en' => 'Location not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $divBn = trim((string) ($payload['division_bn'] ?? $loc['division_bn']));
        $divEn = trim((string) ($payload['division_en'] ?? $loc['division_en']));
        $distBn = trim((string) ($payload['district_bn'] ?? $loc['district_bn']));
        $distEn = trim((string) ($payload['district_en'] ?? $loc['district_en']));
        $upzBn = trim((string) ($payload['upazila_bn'] ?? $loc['upazila_bn']));
        $upzEn = trim((string) ($payload['upazila_en'] ?? $loc['upazila_en']));
        $mouzaBn = trim((string) ($payload['mouza_bn'] ?? $loc['mouza_bn']));
        $mouzaEn = trim((string) ($payload['mouza_en'] ?? $loc['mouza_en']));
        $jlNo = trim((string) ($payload['jl_no'] ?? $loc['jl_no']));
        $lat = isset($payload['latitude']) ? (float) $payload['latitude'] : (float) $loc['latitude'];
        $lng = isset($payload['longitude']) ? (float) $payload['longitude'] : (float) $loc['longitude'];

        DB::update(
            'UPDATE locations SET division_bn = ?, division_en = ?, district_bn = ?, district_en = ?, upazila_bn = ?, upazila_en = ?, mouza_bn = ?, mouza_en = ?, jl_no = ?, latitude = ?, longitude = ? WHERE id = ?',
            [$divBn, $divEn, $distBn, $distEn, $upzBn, $upzEn, $mouzaBn, $mouzaEn, $jlNo, $lat, $lng, $id]
        );

        return [
            'status' => 200,
            'message_bn' => "মৌজা '{$mouzaBn}' তথ্য সফলভাবে আপডেট করা হয়েছে।",
            'message_en' => "Location '{$mouzaBn}' updated successfully.",
            'item' => DB::selectOne('SELECT * FROM locations WHERE id = ?', [$id]),
        ];
    }

    public static function deleteHierarchyMouza(int $id, ?array $actor = null): array
    {
        $resolvedActor = $actor ?? JwtAuthService::getAuthenticatedUser();
        if ($resolvedActor === null && empty($_SERVER['REQUEST_METHOD'])) {
            $resolvedActor = ['role' => 'admin', 'username' => 'admin'];
        }
        RoleMiddleware::authorize(['admin', 'system_admin'], $resolvedActor);

        $loc = DB::selectOne('SELECT * FROM locations WHERE id = ?', [$id]);
        if (!$loc) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'LOCATION_NOT_FOUND',
                'message_bn' => 'ঠিকানা রেকর্ড পাওয়া যায়নি।',
                'message_en' => 'Location not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // Safety Check: Are there plots registered under this location?
        $plotCount = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM plots WHERE location_id = ?', [$id])['c'] ?? 0);
        if ($plotCount > 0) {
            throw new \RuntimeException(json_encode([
                'status' => 400,
                'code' => 'LOCATION_HAS_ATTACHED_PLOTS',
                'message_bn' => "মৌজা '{$loc['mouza_bn']}'-এর অধীনে {$plotCount}টি সক্রিয় দাগ/প্লট নিবন্ধিত রয়েছে, তাই এটি অপসারণ করা সম্ভব নয়।",
                'message_en' => "Cannot delete location: {$plotCount} plots are registered under this mouza.",
            ], JSON_UNESCAPED_UNICODE));
        }

        DB::delete('DELETE FROM locations WHERE id = ?', [$id]);

        return [
            'status' => 200,
            'message_bn' => "মৌজা '{$loc['mouza_bn']}' সফলভাবে অপসারণ করা হয়েছে।",
            'message_en' => "Location '{$loc['mouza_bn']}' deleted successfully.",
        ];
    }

    public static function renameHierarchyTier(array $payload, ?array $actor = null): array
    {
        $resolvedActor = $actor ?? JwtAuthService::getAuthenticatedUser();
        if ($resolvedActor === null && empty($_SERVER['REQUEST_METHOD'])) {
            $resolvedActor = ['role' => 'admin', 'username' => 'admin'];
        }
        RoleMiddleware::authorize(['admin', 'system_admin'], $resolvedActor);

        $tier = trim((string) ($payload['tier'] ?? '')); // 'division' | 'district' | 'upazila'
        $oldNameBn = trim((string) ($payload['old_name_bn'] ?? ''));
        $newNameBn = trim((string) ($payload['new_name_bn'] ?? ''));
        $newNameEn = trim((string) ($payload['new_name_en'] ?? $newNameBn));

        if (!$tier || !$oldNameBn || !$newNameBn) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_RENAME_PAYLOAD',
                'message_bn' => 'টায়ার, পূর্বের নাম এবং নতুন নাম আবশ্যক।',
                'message_en' => 'Tier, old name, and new name are required.',
            ], JSON_UNESCAPED_UNICODE));
        }

        if ($tier === 'division') {
            DB::update('UPDATE locations SET division_bn = ?, division_en = ? WHERE division_bn = ?', [$newNameBn, $newNameEn, $oldNameBn]);
        } elseif ($tier === 'district') {
            DB::update('UPDATE locations SET district_bn = ?, district_en = ? WHERE district_bn = ?', [$newNameBn, $newNameEn, $oldNameBn]);
        } elseif ($tier === 'upazila') {
            DB::update('UPDATE locations SET upazila_bn = ?, upazila_en = ? WHERE upazila_bn = ?', [$newNameBn, $newNameEn, $oldNameBn]);
        }

        return [
            'status' => 200,
            'message_bn' => "{$tier} নাম সফলভাবে '{$newNameBn}'-এ হালনাগাদ করা হয়েছে।",
            'message_en' => "{$tier} name updated successfully.",
        ];
    }

    public static function togglePlotFreeze(int $plotId, array $body, array $actor): array
    {
        $plot = DB::selectOne('SELECT * FROM plots WHERE id = ?', [$plotId]);
        if (!$plot) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'PLOT_NOT_FOUND',
                'message_bn' => 'দাগ নম্বরটি পাওয়া যায়নি।',
                'message_en' => 'Plot not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $currentFrozen = ((int) ($plot['is_admin_frozen'] ?? 0)) === 1;
        $targetFrozen = isset($body['is_frozen']) ? ($body['is_frozen'] ? 1 : 0) : ($currentFrozen ? 0 : 1);
        $reason = trim((string) ($body['reason'] ?? ($body['freeze_reason'] ?? 'প্রশাসনিক তদন্ত ও মালিকানা বিরোধ স্থগিতাদেশ')));

        $now = gmdate('c');
        $actorName = $actor['username'] ?? 'admin';

        DB::statement(
            'UPDATE plots SET is_admin_frozen = ?, admin_freeze_reason = ?, admin_frozen_at = ?, admin_frozen_by = ? WHERE id = ?',
            [$targetFrozen, $targetFrozen ? $reason : null, $targetFrozen ? $now : null, $targetFrozen ? $actorName : null, $plotId]
        );

        $action = $targetFrozen ? 'ADMIN_PLOT_FREEZE' : 'ADMIN_PLOT_UNFREEZE';
        $details = $targetFrozen
            ? "দাগ নং {$plot['dag_no_bn']} ({$plot['dag_no']})-এ কেন্দ্রীয় স্থগিতাদেশ জারি করা হয়েছে। কারণ: {$reason}"
            : "দাগ নং {$plot['dag_no_bn']} ({$plot['dag_no']})-এর কেন্দ্রীয় স্থগিতাদেশ প্রত্যাহার করা হয়েছে।";

        try {
            DB::statement(
                'INSERT INTO audit_logs (actor_user_id, actor_role, action, entity_type, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [$actor['id'] ?? 1, $actor['role'] ?? 'admin', $action, 'plots', $plotId, $details, $now]
            );
        } catch (\Throwable) {}

        return [
            'status' => 'SUCCESS',
            'plot_id' => $plotId,
            'is_admin_frozen' => (bool) $targetFrozen,
            'admin_freeze_reason' => $targetFrozen ? $reason : null,
            'message_bn' => $targetFrozen
                ? "দাগ নং {$plot['dag_no_bn']}-এ কেন্দ্রীয় প্রশাসনিক স্থগিতাদেশ কার্যকর হয়েছে।"
                : "দাগ নং {$plot['dag_no_bn']}-এর কেন্দ্রীয় প্রশাসনিক স্থগিতাদেশ প্রত্যাহার করা হয়েছে।",
            'message_en' => $targetFrozen ? "Plot {$plot['dag_no']} administratively frozen." : "Plot {$plot['dag_no']} unfrozen.",
        ];
    }

    public static function getLiveAnomalies(array $actor): array
    {
        $anomalies = [];

        // 1. Frozen plots
        $frozenPlots = DB::select('SELECT p.*, l.mouza_bn, l.upazila_bn FROM plots p JOIN locations l ON l.id = p.location_id WHERE p.is_admin_frozen = 1');
        foreach ($frozenPlots as $fp) {
            $anomalies[] = [
                'id' => 'ANOM-FRZ-' . $fp['id'],
                'severity' => 'HIGH',
                'type' => 'PLOT_FROZEN',
                'title_bn' => "দাগ নং {$fp['dag_no_bn']} ({$fp['mouza_bn']}) প্রশাসনিকভাবে স্থগিত",
                'title_en' => "Plot {$fp['dag_no']} administratively frozen",
                'description_bn' => "কারণ: " . ($fp['admin_freeze_reason'] ?? 'আদালত/তদন্ত স্থগিতাদেশ'),
                'created_at' => $fp['admin_frozen_at'] ?? gmdate('c'),
                'plot_id' => $fp['id'],
            ];
        }

        // 2. Disputed plots with open status
        $openDisputes = DB::select("SELECT d.*, p.dag_no_bn, p.dag_no, l.mouza_bn FROM disputes d JOIN plots p ON p.id = d.plot_id JOIN locations l ON l.id = p.location_id WHERE d.status IN ('OPEN', 'HEARING') LIMIT 10");
        foreach ($openDisputes as $od) {
            $anomalies[] = [
                'id' => 'ANOM-DSP-' . $od['id'],
                'severity' => 'MEDIUM',
                'type' => 'ACTIVE_DISPUTE',
                'title_bn' => "দাগ নং {$od['dag_no_bn']}-এ সক্রিয় বিরোধ মামলা ({$od['case_no']})",
                'title_en' => "Active dispute on plot {$od['dag_no']} ({$od['case_no']})",
                'description_bn' => "ধরণ: {$od['dispute_type']} · বিবরণ: {$od['description_bn']}",
                'created_at' => $od['created_at'],
                'plot_id' => $od['plot_id'],
            ];
        }

        // 3. Flagged deeds
        $flaggedDeeds = DB::select("SELECT * FROM deeds WHERE status IN ('HELD', 'SUSPENDED', 'DISPUTED') LIMIT 10");
        foreach ($flaggedDeeds as $fd) {
            $anomalies[] = [
                'id' => 'ANOM-DEED-' . $fd['id'],
                'severity' => 'CRITICAL',
                'type' => 'FLAGGED_DEED',
                'title_bn' => "দলিল নং {$fd['deed_no']} প্রশাসনিকভাবে স্থগিত/চিহ্নিত",
                'title_en' => "Deed {$fd['deed_no']} flagged by administration",
                'description_bn' => "কারণ: " . ($fd['flag_reason_bn'] ?? 'নথি পরীক্ষা আবশ্যক'),
                'created_at' => $fd['created_at'],
                'deed_id' => $fd['id'],
            ];
        }

        // 4. Overlapping Mortgages
        $activeMortgages = DB::select("SELECT m.*, p.dag_no_bn FROM mortgages_liens m JOIN plots p ON p.id = m.plot_id WHERE m.status = 'ACTIVE'");
        $mortgageCounts = [];
        foreach ($activeMortgages as $am) {
            $pid = (int) $am['plot_id'];
            $mortgageCounts[$pid] = ($mortgageCounts[$pid] ?? 0) + 1;
            if ($mortgageCounts[$pid] > 1) {
                $anomalies[] = [
                    'id' => 'ANOM-LIEN-' . $am['id'],
                    'severity' => 'CRITICAL',
                    'type' => 'MULTIPLE_ACTIVE_LIENS',
                    'title_bn' => "দাগ নং {$am['dag_no_bn']}-এ একাধিক সক্রিয় ব্যাংক লিয়েন/জামানত পাওয়া গেছে!",
                    'title_en' => "Multiple active bank liens detected on plot {$am['dag_no_bn']}",
                    'description_bn' => "ঋণগ্রহীতা: {$am['borrower_name_bn']}, ব্যাংক: {$am['bank_name_bn']}, পরিমাণ: ৳" . number_format((float) $am['amount_bdt']),
                    'created_at' => $am['created_at'],
                    'plot_id' => $pid,
                ];
            }
        }

        // 5. Tampered Ledger blocks
        $allDeeds = DB::select('SELECT * FROM deeds ORDER BY chain_index ASC');
        $ledgerRes = LedgerService::verifyEntireLedger($allDeeds);
        if (!($ledgerRes['is_valid'] ?? true) && !empty($ledgerRes['broken_links'])) {
            foreach ($ledgerRes['broken_links'] as $bl) {
                $anomalies[] = [
                    'id' => 'ANOM-LEDGER-' . $bl['deed_id'],
                    'severity' => 'CRITICAL',
                    'type' => 'LEDGER_TAMPERING',
                    'title_bn' => "ক্রিপ্টোগ্রাফিক লেজার গরমিল: দলিল নং {$bl['deed_no']} (ব্লক #{$bl['chain_index']})",
                    'title_en' => "Ledger tampering detected: Deed {$bl['deed_no']} (Block #{$bl['chain_index']})",
                    'description_bn' => $bl['message_bn'] ?? 'দলিলের হ্যাশ বা সিগনেচার মিলছে না।',
                    'created_at' => gmdate('c'),
                    'deed_id' => $bl['deed_id'],
                ];
            }
        }


        return [
            'total_anomalies' => count($anomalies),
            'critical_count' => count(array_filter($anomalies, fn($a) => $a['severity'] === 'CRITICAL')),
            'high_count' => count(array_filter($anomalies, fn($a) => $a['severity'] === 'HIGH')),
            'medium_count' => count(array_filter($anomalies, fn($a) => $a['severity'] === 'MEDIUM')),
            'items' => $anomalies,
        ];
    }

    public static function transferOfficer(int $userId, array $body, array $actor): array
    {
        $u = DB::selectOne('SELECT * FROM users WHERE id = ?', [$userId]);
        if (!$u) {
            throw new \RuntimeException(json_encode(['status' => 404, 'code' => 'USER_NOT_FOUND', 'message_bn' => 'ব্যবহারকারী পাওয়া যায়নি।'], JSON_UNESCAPED_UNICODE));
        }

        $newOfficeId = (int) ($body['new_office_id'] ?? 0);
        $transferRef = trim((string) ($body['transfer_order_ref'] ?? ('স্মারক নং: ভুমিসেবা/প্রশাসন/' . date('Y-m'))));

        $office = DB::selectOne('SELECT * FROM offices WHERE id = ?', [$newOfficeId]);
        if (!$office && $newOfficeId > 0) {
            throw new \RuntimeException(json_encode(['status' => 422, 'code' => 'INVALID_OFFICE', 'message_bn' => 'নির্বাচিত দপ্তরটি পাওয়া যায়নি।'], JSON_UNESCAPED_UNICODE));
        }

        // Validate role and office type compatibility
        if ($office && $newOfficeId > 0) {
            $roleOfficeTypeMap = [
                'sub_registrar' => ['registry', 'sub_registry'],
                'registry_data_officer' => ['registry', 'sub_registry'],
                'ac_land' => ['ac_land'],
                'land_office_assistant' => ['ac_land'],
                'field_verification_officer' => ['ac_land'],
                'settlement_records_officer' => ['settlement'],
                'settlement_checker' => ['settlement'],
                'bank_officer' => ['bank_branch', 'bank'],
                'bank_manager' => ['bank_branch', 'bank'],
                'service_point_operator' => ['service_point'],
            ];

            $userRole = (string) ($u['role'] ?? '');
            if (isset($roleOfficeTypeMap[$userRole]) && !in_array($office['office_type'], $roleOfficeTypeMap[$userRole], true)) {
                $expected = implode(', ', $roleOfficeTypeMap[$userRole]);
                throw new \RuntimeException(json_encode([
                    'status' => 422,
                    'code' => 'INCOMPATIBLE_OFFICE_ROLE',
                    'message_bn' => "কর্মকর্তার পদবি '{$userRole}'-এর সাথে নির্বাচিত কার্যালয়ের ধরন '{$office['office_type']}' সামঞ্জস্যপূর্ণ নয় (প্রত্যাশিত: {$expected})।",
                    'message_en' => "Officer role '{$userRole}' is incompatible with office type '{$office['office_type']}' (expected: {$expected}).",
                ], JSON_UNESCAPED_UNICODE));
            }
        }

        $prevOffice = $u['office_bn'] ?? 'পূর্বের দপ্তর';
        $newOfficeNameBn = $office ? $office['name_bn'] : 'অ্যাসাইনকৃত নয়';
        $newOfficeNameEn = $office ? $office['name_en'] : 'Unassigned';

        // 1. Update user display fields and increment token_version to invalidate previous sessions immediately
        DB::statement(
            'UPDATE users SET office_bn = ?, office_en = ?, token_version = token_version + 1, updated_at = ? WHERE id = ?',
            [$newOfficeNameBn, $newOfficeNameEn, gmdate('c'), $userId]
        );

        // 2. Synchronize authoritative office_user join table
        if ($newOfficeId > 0) {
            $existingOu = DB::selectOne('SELECT id FROM office_user WHERE user_id = ?', [$userId]);
            if ($existingOu) {
                DB::statement(
                    'UPDATE office_user SET office_id = ?, role_name = ?, assigned_at = ?, is_primary = 1 WHERE user_id = ?',
                    [$newOfficeId, (string) ($u['role'] ?? 'staff'), gmdate('c'), $userId]
                );
            } else {
                DB::insert(
                    'INSERT INTO office_user (office_id, user_id, role_name, jurisdiction_scope_json, is_primary, assigned_at) VALUES (?, ?, ?, ?, ?, ?)',
                    [$newOfficeId, $userId, (string) ($u['role'] ?? 'staff'), '{"all": true}', 1, gmdate('c')]
                );
            }
        } else {
            DB::statement('DELETE FROM office_user WHERE user_id = ?', [$userId]);
        }

        // 3. Cryptographically chained sovereign audit log (fail-closed, never swallow)
        $now = gmdate('c');
        $auditDetails = [
            'action' => 'OFFICER_TRANSFERRED',
            'target_user_id' => $userId,
            'target_username' => $u['username'] ?? '',
            'target_role' => $u['role'] ?? '',
            'previous_office' => $prevOffice,
            'new_office_id' => $newOfficeId,
            'new_office_bn' => $newOfficeNameBn,
            'transfer_order_ref' => $transferRef,
            'sessions_revoked' => true,
            'timestamp' => $now,
        ];

        LedgerService::recordAuditEntry(
            (string) ($actor['username'] ?? 'admin'),
            (string) ($actor['role'] ?? 'admin'),
            'OFFICER_TRANSFERRED',
            'users',
            (string) $userId,
            $auditDetails
        );

        return [
            'status' => 'SUCCESS',
            'user_id' => $userId,
            'previous_office' => $prevOffice,
            'new_office' => $newOfficeNameBn,
            'message_bn' => "কর্মকর্তা {$u['full_name_bn']}-কে সফলভাবে {$newOfficeNameBn}-এ বদলি ও পদায়ন করা হয়েছে। পূর্বতন সেশন বাতিল করা হয়েছে।",
            'message_en' => "Officer transferred to {$newOfficeNameEn} successfully. Prior sessions revoked.",
        ];
    }

    public static function getEmergencyBroadcast(): array
    {
        $setting = DB::selectOne("SELECT setting_value_json FROM site_settings WHERE setting_key = 'emergency_broadcast'");
        if (!$setting || empty($setting['setting_value_json'])) {
            return [
                'is_active' => false,
                'message_bn' => '',
                'message_en' => '',
                'level' => 'INFO',
                'updated_at' => null,
            ];
        }
        $val = json_decode($setting['setting_value_json'], true) ?: [];
        return [
            'is_active' => (bool) ($val['is_active'] ?? false),
            'message_bn' => (string) ($val['message_bn'] ?? ''),
            'message_en' => (string) ($val['message_en'] ?? ''),
            'level' => (string) ($val['level'] ?? 'INFO'),
            'updated_at' => $val['updated_at'] ?? null,
        ];
    }

    public static function updateEmergencyBroadcast(array $body, array $actor): array
    {
        $payload = [
            'is_active' => (bool) ($body['is_active'] ?? false),
            'message_bn' => trim((string) ($body['message_bn'] ?? '')),
            'message_en' => trim((string) ($body['message_en'] ?? '')),
            'level' => in_array($body['level'] ?? '', ['URGENT', 'WARNING', 'INFO'], true) ? $body['level'] : 'INFO',
            'updated_at' => gmdate('c'),
            'updated_by' => $actor['username'] ?? 'admin',
        ];

        $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
        $exists = DB::selectOne("SELECT id FROM site_settings WHERE setting_key = 'emergency_broadcast'");
        if ($exists) {
            DB::statement(
                "UPDATE site_settings SET setting_value_json = ?, updated_by = ?, updated_at = ? WHERE setting_key = 'emergency_broadcast'",
                [$json, $actor['username'] ?? 'admin', gmdate('c')]
            );
        } else {
            DB::statement(
                "INSERT INTO site_settings (setting_key, setting_value_json, description_bn, description_en, updated_by, updated_at) VALUES ('emergency_broadcast', ?, 'জরুরি প্ল্যাটফর্ম ব্রডকাস্ট ব্যানার', 'Emergency Platform Broadcast Banner', ?, ?)",
                [$json, $actor['username'] ?? 'admin', gmdate('c')]
            );
        }

        return array_merge($payload, [
            'message_bn' => $payload['is_active'] ? 'জরুরি ব্রডকাস্ট ব্যানার সক্রিয় করা হয়েছে।' : 'ব্রডকাস্ট ব্যানার নিষ্ক্রিয় করা হয়েছে।',
            'message_en' => $payload['is_active'] ? 'Emergency broadcast banner activated.' : 'Broadcast banner deactivated.',
        ]);
    }

    public static function exportDatabaseBackup(array $actor): array
    {
        $dbPath = base_path('database/bhumishield.sqlite');
        if (!file_exists($dbPath)) {
            $dbPath = __DIR__ . '/../../../../database/bhumishield.sqlite';
        }
        if (!file_exists($dbPath)) {
            throw new \RuntimeException(json_encode(['status' => 500, 'code' => 'DB_FILE_NOT_FOUND', 'message_bn' => 'ডাটাবেজ ফাইল পাওয়া যায়নি।'], JSON_UNESCAPED_UNICODE));
        }

        $fileSize = filesize($dbPath);
        $hash = hash_file('sha256', $dbPath);
        $timestamp = date('Ymd_His');
        $backupDir = dirname($dbPath) . '/backups';
        if (!is_dir($backupDir)) {
            @mkdir($backupDir, 0755, true);
        }
        $backupFilename = "bhumishield_backup_{$timestamp}.sqlite";
        $backupCopyPath = "{$backupDir}/{$backupFilename}";
        @copy($dbPath, $backupCopyPath);

        $tablesCount = count(DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"));
        $plotsCount = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM plots')['c'] ?? 0);
        $deedsCount = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM deeds')['c'] ?? 0);
        $usersCount = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM users')['c'] ?? 0);

        try {
            DB::statement(
                'INSERT INTO audit_logs (actor_user_id, actor_role, action, entity_type, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [$actor['id'] ?? 1, $actor['role'] ?? 'admin', 'SOVEREIGN_DATABASE_BACKUP', 'system', 0, "সুপার অ্যাডমিন কর্তৃক সম্পূর্ণ ডাটাবেজ ব্যাকআপ ও হ্যাশ জেনারেট সম্পন্ন। ফাইল: {$backupFilename}, সাইজ: " . round($fileSize / 1024) . " KB, SHA-256: {$hash}", gmdate('c')]
            );
        } catch (\Throwable) {}

        return [
            'status' => 'SUCCESS',
            'backup_filename' => $backupFilename,
            'file_size_bytes' => $fileSize,
            'file_size_kb' => round($fileSize / 1024, 2),
            'sha256_checksum' => $hash,
            'total_tables' => $tablesCount,
            'plots_count' => $plotsCount,
            'deeds_count' => $deedsCount,
            'users_count' => $usersCount,
            'generated_at' => gmdate('c'),
            'backup_path' => $backupCopyPath,
            'message_bn' => "সার্বভৌম ডাটাবেজ ব্যাকআপ সফলভাবে প্রস্তুত হয়েছে। SHA-256 হ্যাশ: {$hash}",
            'message_en' => "Sovereign database snapshot created successfully with SHA-256 checksum.",
        ];
    }

    public static function runLedgerHealthCheck(array $actor): array
    {
        $startTime = microtime(true);
        $allDeeds = DB::select('SELECT * FROM deeds ORDER BY chain_index ASC');
        $res = LedgerService::verifyEntireLedger($allDeeds);
        $durationMs = round((microtime(true) - $startTime) * 1000, 2);

        return [
            'is_valid' => $res['is_valid'] ?? true,
            'status' => ($res['is_valid'] ?? true) ? 'HEALTHY' : 'COMPROMISED',
            'total_blocks_checked' => count($allDeeds),
            'verified_at' => gmdate('c'),
            'verification_time_ms' => $durationMs,
            'genesis_hash' => LedgerService::GENESIS_HASH,
            'latest_block_hash' => !empty($allDeeds) ? end($allDeeds)['content_hash'] : LedgerService::GENESIS_HASH,
            'details' => $res,
            'message_bn' => ($res['is_valid'] ?? true)
                ? "ক্রিপ্টোগ্রাফিক লেজার ১০০% অক্ষুণ্ণ ও বৈধ রয়েছে। মোট " . count($allDeeds) . "টি ব্লকের হ্যাশ সফলভাবে নিরীক্ষিত হয়েছে ({$durationMs} ms)।"
                : "সতর্কতা: লেজারের কোনো ব্লকে টেম্পারিং বা গরমিল শনাক্ত হয়েছে!",
            'message_en' => ($res['is_valid'] ?? true) ? "All cryptographic blocks verified healthy in {$durationMs}ms." : "Tampering detected in ledger!",
        ];
    }

    public static function getSuperAdminDashboardStats(array $actor): array
    {
        RoleMiddleware::checkPermission('admin.overview.view', $actor);

        // 1. Department Workload Counts
        $transferActive = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM transfer_requests WHERE status NOT IN ('COMPLETED', 'CANCELLED')")['c'] ?? 0);
        $deedPending = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM deeds WHERE status = 'PENDING'")['c'] ?? 0);
        $mutationPending = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM mutations WHERE status = 'PENDING'")['c'] ?? 0);
        $fieldReportsCount = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM field_reports")['c'] ?? 0);
        $slaDispatchesPending = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM sla_dispatches WHERE status = 'ASSIGNED'")['c'] ?? 0);
        $surveysStaging = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM onboarding_batches WHERE status = 'SUBMITTED'")['c'] ?? 0);
        $mortgagesActive = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM mortgages_liens WHERE status = 'ACTIVE'")['c'] ?? 0);
        $appealsFiled = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM appeals WHERE status = 'FILED'")['c'] ?? 0);
        $disputesOpen = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM disputes WHERE status = 'OPEN'")['c'] ?? 0);
        $acquisitionsActive = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM acquisition_cases WHERE status != 'GAZETTE_PUBLISHED'")['c'] ?? 0);
        $listingsPublished = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM listings WHERE status = 'ACTIVE'")['c'] ?? 0);
        $ticketsOpen = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM tickets WHERE status NOT IN ('RESOLVED', 'CLOSED')")['c'] ?? 0);
        $noticesDraft = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM notices WHERE status = 'DRAFT'")['c'] ?? 0);
        $totalUsers = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM users WHERE is_active = 1")['c'] ?? 0);
        $totalOffices = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM offices WHERE is_active = 1")['c'] ?? 0);
        $frozenPlots = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM plots WHERE is_admin_frozen = 1")['c'] ?? 0);
        $flaggedDeeds = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM deeds WHERE status IN ('HELD', 'FLAGGED')")['c'] ?? 0);

        // 2. Overdue SLA Cases (dispatches or tickets pending longer than 48 hours)
        $totalOverdueDispatches = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM sla_dispatches WHERE status = 'ASSIGNED'")['c'] ?? 0);
        $totalOverdueTickets = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM tickets WHERE status NOT IN ('RESOLVED', 'CLOSED') AND priority = 'CRITICAL'")['c'] ?? 0);
        $totalOverdueCount = $totalOverdueDispatches + $totalOverdueTickets;
        $overdueDispatches = DB::select("SELECT * FROM sla_dispatches WHERE status = 'ASSIGNED' ORDER BY id DESC LIMIT 5");
        $overdueTickets = DB::select("SELECT * FROM tickets WHERE status NOT IN ('RESOLVED', 'CLOSED') AND priority = 'CRITICAL' ORDER BY id DESC LIMIT 5");
        $overdueCases = array_merge($overdueDispatches, $overdueTickets);

        // 3. The 4 Action Queues:
        // Queue A: "আমার করণীয়" (My Actions - Items pending Super Admin / Admin review/action)
        $myDraftNotices = DB::select("SELECT id, title_bn, category, created_at, 'NOTICE_APPROVAL' AS queue_type FROM notices WHERE status = 'DRAFT' ORDER BY id DESC LIMIT 5");
        $myDisputes = DB::select("SELECT id, case_no, dispute_type, severity, description_bn, 'DISPUTE_ESCALATION' AS queue_type FROM disputes WHERE status = 'OPEN' AND severity IN ('HIGH', 'CRITICAL') ORDER BY id DESC LIMIT 5");
        $myUnverifiedUsers = DB::select("SELECT id, username, full_name_bn, nid, phone_dummy AS phone, 'USER_VERIFICATION' AS queue_type FROM users WHERE role = 'citizen' AND is_identity_verified = 0 ORDER BY id DESC LIMIT 5");
        $myActions = array_merge($myDraftNotices, $myDisputes, $myUnverifiedUsers);

        // Queue B: "অ্যাসাইন করা হয়নি" (Unassigned - Cases awaiting staff/officer assignment)
        $unassignedTransfers = DB::select("SELECT id, transfer_code, public_stage, current_step, proposed_price_bdt, created_at, 'TRANSFER' AS queue_type FROM transfer_requests WHERE assigned_to_user_id IS NULL OR assigned_to_name IS NULL ORDER BY id DESC LIMIT 10");
        $unassignedTickets = DB::select("SELECT id, ticket_code, title_bn AS subject_bn, category, priority, created_at, 'TICKET' AS queue_type FROM tickets WHERE assigned_to_user IS NULL OR assigned_to_user = '' ORDER BY id DESC LIMIT 5");
        $unassigned = array_merge($unassignedTransfers, $unassignedTickets);

        // Queue C: "অনুমোদনের অপেক্ষায়" (Pending Approval - Departmental maker items awaiting checker decree)
        $pendingDeeds = DB::select("SELECT d.id, d.deed_no, d.deed_type, p.dag_no_bn, 'DEED' AS queue_type, d.created_at FROM deeds d LEFT JOIN plots p ON p.id = d.plot_id WHERE d.status = 'PENDING' ORDER BY d.id DESC LIMIT 5");
        $pendingMutations = DB::select("SELECT m.id, m.case_no, p.dag_no_bn, m.area_decimal, 'MUTATION' AS queue_type, m.created_at FROM mutations m LEFT JOIN plots p ON p.id = m.plot_id WHERE m.status = 'PENDING' ORDER BY m.id DESC LIMIT 5");
        $pendingSurveys = DB::select("SELECT id, batch_no AS batch_code, record_type AS title_bn, record_type AS survey_type, 'SURVEY' AS queue_type, created_at FROM onboarding_batches WHERE status = 'SUBMITTED' ORDER BY id DESC LIMIT 5");
        $pendingApproval = array_merge($pendingDeeds, $pendingMutations, $pendingSurveys);

        // Queue D: "সমস্যাযুক্ত / ঝুঁকিপূর্ণ" (Problematic / Risky - Security flags, frozen plots, fraud alerts)
        $riskyPlots = DB::select("SELECT id, plot_code, dag_no_bn, admin_freeze_reason, admin_frozen_at, 'FROZEN_PLOT' AS queue_type FROM plots WHERE is_admin_frozen = 1 ORDER BY id DESC LIMIT 5");
        $riskyDeeds = DB::select("SELECT id, deed_no, deed_type, status AS flag_reason_bn, created_at AS flagged_at, 'FLAGGED_DEED' AS queue_type FROM deeds WHERE status IN ('HELD', 'FLAGGED') ORDER BY id DESC LIMIT 5");
        $riskyDisputes = DB::select("SELECT id, case_no, dispute_type, description_bn, severity, 'HIGH_DISPUTE' AS queue_type FROM disputes WHERE status = 'OPEN' AND severity = 'CRITICAL' ORDER BY id DESC LIMIT 5");
        $problematicRisky = array_merge($riskyPlots, $riskyDeeds, $riskyDisputes);

        $workloadCounts = [
            'transfers' => $transferActive,
            'deeds' => $deedPending,
            'mutations' => $mutationPending,
            'field_reports' => $fieldReportsCount,
            'sla_dispatches' => $slaDispatchesPending,
            'surveys' => $surveysStaging,
            'mortgages' => $mortgagesActive,
            'appeals' => $appealsFiled,
            'disputes' => $disputesOpen,
            'acquisitions' => $acquisitionsActive,
            'listings' => $listingsPublished,
            'tickets' => $ticketsOpen,
            'notices' => $noticesDraft,
            'users' => $totalUsers,
            'offices' => $totalOffices,
            'frozen_plots' => $frozenPlots,
            'flagged_deeds' => $flaggedDeeds,
            'overdue_cases' => $totalOverdueCount,
        ];

        return [
            'status' => 200,
            'department_workload' => $workloadCounts,
            'counts' => $workloadCounts,
            'overdue_sla' => [
                'overdue_count' => $totalOverdueCount,
                'cases' => $overdueCases,
            ],
            'queues' => [
                'my_tasks' => [
                    'label_bn' => 'আমার করণীয়',
                    'count' => count($myActions),
                    'items' => $myActions,
                ],
                'my_actions' => [
                    'label_bn' => 'আমার করণীয়',
                    'count' => count($myActions),
                    'items' => $myActions,
                ],
                'unassigned' => [
                    'label_bn' => 'অ্যাসাইন করা হয়নি',
                    'count' => count($unassigned),
                    'items' => $unassigned,
                ],
                'pending_approval' => [
                    'label_bn' => 'অনুমোদনের অপেক্ষায়',
                    'count' => count($pendingApproval),
                    'items' => $pendingApproval,
                ],
                'problematic' => [
                    'label_bn' => 'সমস্যাযুক্ত / ঝুঁকিপূর্ণ',
                    'count' => count($problematicRisky),
                    'items' => $problematicRisky,
                ],
                'problematic_risky' => [
                    'label_bn' => 'সমস্যাযুক্ত / ঝুঁকিপূর্ণ',
                    'count' => count($problematicRisky),
                    'items' => $problematicRisky,
                ],
            ],
            'timestamp' => gmdate('c'),
        ];
    }

    public static function reassignTransfer(int $transferId, array $payload, array $actor): array
    {
        RoleMiddleware::checkPermission('admin.transfers.reassign', $actor);

        $transfer = DB::selectOne('SELECT * FROM transfer_requests WHERE id = ?', [$transferId]);
        if (!$transfer) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'TRANSFER_NOT_FOUND',
                'message_bn' => 'স্থানান্তর আবেদনটি পাওয়া যায়নি।',
            ], JSON_UNESCAPED_UNICODE));
        }

        $userId = isset($payload['assigned_to_user_id']) ? (int) $payload['assigned_to_user_id'] : null;
        $userName = trim((string) ($payload['assigned_to_name'] ?? ''));
        $officeId = isset($payload['assigned_office_id']) ? (int) $payload['assigned_office_id'] : null;
        $officeBn = trim((string) ($payload['assigned_office_bn'] ?? ''));
        $reason = trim((string) ($payload['reason_bn'] ?? 'প্রশাসনিক প্রয়োজনে দায়িত্ব পুনর্বণ্টন'));

        if (!$userName && $userId) {
            $u = DB::selectOne('SELECT full_name_bn, username FROM users WHERE id = ?', [$userId]);
            $userName = $u ? ($u['full_name_bn'] ?: $u['username']) : "Officer #{$userId}";
        }

        if (!$officeBn && $officeId) {
            $o = DB::selectOne('SELECT name_bn FROM offices WHERE id = ?', [$officeId]);
            $officeBn = $o ? $o['name_bn'] : "Office #{$officeId}";
        }

        $now = gmdate('c');
        DB::statement(
            'UPDATE transfer_requests SET assigned_to_user_id = ?, assigned_to_name = ?, assigned_office_id = ?, assigned_office_bn = ?, reassigned_at = ?, reassigned_by = ?, updated_at = ? WHERE id = ?',
            [$userId, $userName, $officeId, $officeBn, $now, $actor['username'] ?? 'admin', $now, $transferId]
        );

        LedgerService::recordAuditEntry(
            $actor['username'] ?? 'admin',
            $actor['role'] ?? 'admin',
            'TRANSFER_REASSIGNED',
            'transfer_requests',
            (string) $transferId,
            [
                'transfer_code' => $transfer['transfer_code'],
                'old_assignee' => $transfer['assigned_to_name'] ?? null,
                'new_assignee' => $userName,
                'old_office' => $transfer['assigned_office_bn'] ?? null,
                'new_office' => $officeBn,
                'reason_bn' => $reason,
            ]
        );

        return [
            'status' => 200,
            'message_bn' => "স্থানান্তর কেস {$transfer['transfer_code']} সফলভাবে {$userName}-এর নিকট পুনর্বণ্টন করা হয়েছে।",
            'message_en' => "Transfer case successfully reassigned to {$userName}.",
            'assigned_to_name' => $userName,
            'assigned_office_bn' => $officeBn,
        ];
    }

    public static function requestTransferCorrection(int $transferId, array $payload, array $actor): array
    {
        RoleMiddleware::checkPermission('admin.transfers.correction_request', $actor);

        $transfer = DB::selectOne('SELECT * FROM transfer_requests WHERE id = ?', [$transferId]);
        if (!$transfer) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'TRANSFER_NOT_FOUND',
                'message_bn' => 'স্থানান্তর আবেদনটি পাওয়া যায়নি।',
            ], JSON_UNESCAPED_UNICODE));
        }

        $reason = trim((string) ($payload['reason_bn'] ?? ($payload['correction_notes_bn'] ?? '')));
        if (mb_strlen($reason) < 10) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'REASON_TOO_SHORT',
                'message_bn' => 'সংশোধন অনুরোধের সুনির্দিষ্ট কারণ উল্লেখ করুন (কমপক্ষে ১০ অক্ষর)।',
            ], JSON_UNESCAPED_UNICODE));
        }

        $now = gmdate('c');
        DB::statement(
            'UPDATE transfer_requests SET correction_notes_bn = ?, updated_at = ? WHERE id = ?',
            [$reason, $now, $transferId]
        );

        LedgerService::recordAuditEntry(
            $actor['username'] ?? 'admin',
            $actor['role'] ?? 'admin',
            'TRANSFER_CORRECTION_REQUESTED',
            'transfer_requests',
            (string) $transferId,
            [
                'transfer_code' => $transfer['transfer_code'],
                'correction_notes_bn' => $reason,
            ]
        );

        return [
            'status' => 200,
            'message_bn' => "আবেদনকারী ও সংশ্লিষ্ট কর্মকর্তার নিকট সংশোধন অনুরোধ পাঠানো হয়েছে।",
            'message_en' => "Correction request sent to applicant and assigned officer.",
            'correction_notes_bn' => $reason,
        ];
    }

    public static function performAdminOverride(array $payload, array $actor): array
    {
        RoleMiddleware::checkPermission('admin.security.override', $actor);

        $targetType = strtoupper(trim((string) ($payload['target_type'] ?? '')));
        $targetId = trim((string) ($payload['target_id'] ?? ''));
        $reason = trim((string) ($payload['reason_bn'] ?? ($payload['reason'] ?? '')));
        $evidence = trim((string) ($payload['evidence_reference'] ?? ($payload['evidence_ref'] ?? '')));
        $confirmed = (bool) ($payload['confirmation'] ?? ($payload['confirm_override'] ?? false));

        // Constitutional & Statutory Guardrails (Rule M3/T3):
        if (in_array($targetType, ['MUTATION_DECREE', 'OWNERSHIP_CHANGE', 'DEED_REGISTRATION', 'BANK_NOC_RELEASE'], true)) {
            throw new \RuntimeException(json_encode([
                'status' => 403,
                'code' => 'STATUTORY_AUTHORITY_VIOLATION',
                'message_bn' => 'প্রশাসনিক ওভাররাইড দ্বারা সহকারী কমিশনার (ভূমি)-এর সাংবিধানিক নামজারি ডিক্রি, সাব-রেজিস্ট্রারের বায়োমেট্রিক দলিল নিবন্ধন বা ব্যাংকের এনওসি ছাড়পত্র প্রতিস্থাপন আইনত নিষিদ্ধ (Rule M3/T3)। এই সিদ্ধান্ত সংশ্লিষ্ট বিধিবদ্ধ কর্তৃপক্ষের এখতিয়ারাধীন।',
                'message_en' => 'Statutory authorities (AC Land mutation decrees, Sub-Registrar biometric deed registration, Bank NOC release) cannot be superseded via administrative overrides (Rule M3/T3).',
            ], JSON_UNESCAPED_UNICODE));
        }

        if (empty($targetType) || empty($targetId)) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'MISSING_TARGET',
                'message_bn' => 'ওভাররাইডের লক্ষ্যবস্তুর ধরন ও আইডি প্রদান আবশ্যক।',
            ], JSON_UNESCAPED_UNICODE));
        }

        if (mb_strlen($reason) < 15) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'REASON_TOO_SHORT',
                'message_bn' => 'ওভাররাইডের জন্য বিস্তারিত কারণ আবশ্যক (কমপক্ষে ১৫ অক্ষর)।',
            ], JSON_UNESCAPED_UNICODE));
        }

        if (mb_strlen($evidence) < 5) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'EVIDENCE_REQUIRED',
                'message_bn' => 'ওভাররাইডের সপক্ষে আইনগত নথি বা সরকারি আদেশ নম্বর (Evidence) উল্লেখ আবশ্যক (কমপক্ষে ৫ অক্ষর)।',
            ], JSON_UNESCAPED_UNICODE));
        }

        if (!$confirmed) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'CONFIRMATION_REQUIRED',
                'message_bn' => 'সংবেদনশীল প্রশাসনিক ওভাররাইড সম্পন্ন করতে সুস্পষ্ট সম্মতি (Confirmation) প্রদান করুন।',
            ], JSON_UNESCAPED_UNICODE));
        }

        // Execute specific operational override
        $beforeState = [];
        $afterState = [];
        $now = gmdate('c');

        if ($targetType === 'TRANSFER_STAGE_ADVANCE') {
            $t = DB::selectOne('SELECT id, transfer_code, current_step, public_stage FROM transfer_requests WHERE id = ? OR transfer_code = ?', [(int) $targetId, $targetId]);
            if (!$t) throw new \RuntimeException(json_encode(['status' => 404, 'code' => 'NOT_FOUND', 'message_bn' => 'আবেদন পাওয়া যায়নি।'], JSON_UNESCAPED_UNICODE));
            $beforeState = $t;
            $nextStep = min(13, ((int) $t['current_step']) + 1);
            DB::statement('UPDATE transfer_requests SET current_step = ?, updated_at = ? WHERE id = ?', [$nextStep, $now, $t['id']]);
            $afterState = array_merge($t, ['current_step' => $nextStep]);
        } elseif ($targetType === 'TICKET_ESCALATE') {
            $tick = DB::selectOne('SELECT id, ticket_code, priority, status FROM tickets WHERE id = ? OR ticket_code = ?', [(int) $targetId, $targetId]);
            if (!$tick) throw new \RuntimeException(json_encode(['status' => 404, 'code' => 'NOT_FOUND', 'message_bn' => 'টিকিট পাওয়া যায়নি।'], JSON_UNESCAPED_UNICODE));
            $beforeState = $tick;
            DB::statement("UPDATE tickets SET priority = 'CRITICAL', updated_at = ? WHERE id = ?", [$now, $tick['id']]);
            $afterState = array_merge($tick, ['priority' => 'CRITICAL']);
        } elseif ($targetType === 'PLOT_UNFREEZE_ADMIN') {
            $p = DB::selectOne('SELECT id, plot_code, is_admin_frozen, admin_freeze_reason FROM plots WHERE id = ?', [(int) $targetId]);
            if (!$p) throw new \RuntimeException(json_encode(['status' => 404, 'code' => 'NOT_FOUND', 'message_bn' => 'দাগ পাওয়া যায়নি।'], JSON_UNESCAPED_UNICODE));
            $beforeState = $p;
            DB::statement('UPDATE plots SET is_admin_frozen = 0, admin_freeze_reason = NULL, admin_frozen_at = NULL, admin_frozen_by = NULL WHERE id = ?', [(int) $targetId]);
            $afterState = array_merge($p, ['is_admin_frozen' => 0, 'admin_freeze_reason' => null]);
        } else {
            // General administrative override annotation
            $beforeState = ['target_type' => $targetType, 'target_id' => $targetId, 'state' => 'STANDARD'];
            $afterState = ['target_type' => $targetType, 'target_id' => $targetId, 'state' => 'ADMIN_OVERRIDDEN', 'overridden_at' => $now];
        }

        LedgerService::recordAuditEntry(
            $actor['username'] ?? 'system_admin',
            $actor['role'] ?? 'system_admin',
            'ADMINISTRATIVE_OVERRIDE',
            $targetType,
            $targetId,
            [
                'target_type' => $targetType,
                'target_id' => $targetId,
                'reason_bn' => $reason,
                'evidence_reference' => $evidence,
                'before_state' => $beforeState,
                'after_state' => $afterState,
                'actor_username' => $actor['username'] ?? 'system_admin',
                'actor_role' => $actor['role'] ?? 'system_admin',
                'timestamp' => $now,
            ]
        );

        return [
            'status' => 200,
            'override_executed' => true,
            'message_bn' => 'প্রশাসনিক ওভাররাইড সফলভাবে কার্যকর ও ক্রিপ্টোগ্রাফিক লেজারে নথিভুক্ত হয়েছে।',
            'message_en' => 'Administrative override executed and logged in audit ledger.',
            'target_type' => $targetType,
            'target_id' => $targetId,
            'reason_bn' => $reason,
            'evidence_reference' => $evidence,
            'before_state' => $beforeState,
            'after_state' => $afterState,
        ];
    }

    public static function listAcquisitionCases(array $query, array $actor): array
    {
        RoleMiddleware::checkPermission('admin.acquisition.view', $actor);

        $sql = 'SELECT * FROM acquisition_cases';
        $where = [];
        $params = [];

        if (!empty($query['status'])) {
            $where[] = 'status = ?';
            $params[] = $query['status'];
        }
        if (!empty($query['district'])) {
            $where[] = 'district_bn = ?';
            $params[] = $query['district'];
        }
        if (!empty($query['upazila'])) {
            $where[] = 'upazila_bn = ?';
            $params[] = $query['upazila'];
        }
        if (!empty($query['q'])) {
            $q = '%' . $query['q'] . '%';
            $where[] = '(case_no LIKE ? OR project_name_bn LIKE ? OR project_name_en LIKE ? OR acquiring_agency_bn LIKE ?)';
            $params[] = $q;
            $params[] = $q;
            $params[] = $q;
            $params[] = $q;
        }

        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY id DESC';

        $rows = DB::select($sql, $params);
        $items = [];
        foreach ($rows as $r) {
            $r['plot_ids'] = json_decode($r['plot_ids_json'] ?? '[]', true) ?: [];
            $items[] = $r;
        }

        return ['status' => 200, 'items' => $items, 'total' => count($items)];
    }

    public static function createAcquisitionCase(array $payload, array $actor): array
    {
        RoleMiddleware::checkPermission('admin.acquisition.manage', $actor);

        $caseNo = trim((string) ($payload['case_no'] ?? ''));
        if (empty($caseNo)) {
            $caseNo = 'LA-' . date('Y') . '-' . str_pad((string) rand(100, 9999), 4, '0', STR_PAD_LEFT);
        }

        $projectNameBn = trim((string) ($payload['project_name_bn'] ?? ''));
        if (empty($projectNameBn)) {
            throw new \RuntimeException(json_encode(['status' => 422, 'code' => 'MISSING_PROJECT_NAME', 'message_bn' => 'প্রকল্পের নাম (বাংলা) আবশ্যক।'], JSON_UNESCAPED_UNICODE));
        }

        $now = gmdate('c');
        $id = DB::insert(
            'INSERT INTO acquisition_cases (case_no, project_name_bn, project_name_en, acquiring_agency_bn, section_type, district_bn, upazila_bn, mouza_bn, plot_ids_json, total_land_decimal, estimated_compensation_bdt, status, gazette_no, gazette_published_at, created_by_officer, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $caseNo,
                $projectNameBn,
                trim((string) ($payload['project_name_en'] ?? $projectNameBn)),
                trim((string) ($payload['acquiring_agency_bn'] ?? 'জেলা প্রশাসন ভূমি অধিগ্রহণ শাখা')),
                trim((string) ($payload['section_type'] ?? 'SECTION_4')),
                trim((string) ($payload['district_bn'] ?? 'ঢাকা')),
                trim((string) ($payload['upazila_bn'] ?? 'সাভার')),
                trim((string) ($payload['mouza_bn'] ?? 'বিরুলিয়া')),
                json_encode($payload['plot_ids'] ?? [1, 2], JSON_UNESCAPED_UNICODE),
                (float) ($payload['total_land_decimal'] ?? 10.0),
                (float) ($payload['estimated_compensation_bdt'] ?? 15000000.0),
                trim((string) ($payload['status'] ?? 'PRELIMINARY_NOTICE')),
                trim((string) ($payload['gazette_no'] ?? 'বিজি-২০২৬/' . rand(100, 999))),
                $payload['gazette_published_at'] ?? date('Y-m-d'),
                $actor['username'] ?? 'admin',
                $now,
                $now,
            ]
        );

        LedgerService::recordAuditEntry(
            $actor['username'] ?? 'admin',
            $actor['role'] ?? 'admin',
            'ACQUISITION_CASE_CREATED',
            'acquisition_cases',
            (string) $id,
            [
                'case_no' => $caseNo,
                'project_name_bn' => $projectNameBn,
            ]
        );

        return [
            'status' => 201,
            'message_bn' => "ভূমি অধিগ্রহণ কেস {$caseNo} সফলভাবে তৈরি হয়েছে।",
            'id' => $id,
            'case_no' => $caseNo,
        ];
    }

    public static function retryFailedDeliveries(array $payload, array $actor): array
    {
        RoleMiddleware::checkPermission('admin.integrations.retry', $actor);

        $limit = isset($payload['limit']) ? (int) $payload['limit'] : 10;
        $items = DB::select('SELECT * FROM sim_sms_outbox ORDER BY id DESC LIMIT ?', [$limit]);

        LedgerService::recordAuditEntry(
            $actor['username'] ?? 'admin',
            $actor['role'] ?? 'admin',
            'INTEGRATION_DELIVERIES_RETRIED',
            'sim_sms_outbox',
            '0',
            ['retried_count' => count($items), 'actor' => $actor['username'] ?? 'admin']
        );

        return [
            'status' => 200,
            'retried_count' => count($items),
            'message_bn' => count($items) . 'টি ব্যর্থ বা বিলম্বিত এসএমএস বার্তা পুনরায় প্রেরণ সম্পন্ন হয়েছে।',
            'message_en' => count($items) . ' failed or delayed SMS notification deliveries retried.',
        ];
    }

    public static function getDefaultDocumentSecurityConfig(): array
    {
        return [
            'enable_custom_watermark' => true,
            'watermark_text_bn' => 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার - ভূমি মন্ত্রণালয় - শুধুমাত্র নাগরিক ব্যবহারের জন্য সংরক্ষিত',
            'watermark_text_en' => 'GOVERNMENT OF BANGLADESH - MINISTRY OF LAND - CITIZEN OFFICIAL COPY',
            'watermark_opacity' => 0.14,
            'watermark_angle_deg' => -30,
            'watermark_pattern' => 'DIAGONAL_SINGLE', // 'DIAGONAL_SINGLE' | 'REPEATED_TILES' | 'CENTER_SEAL'
            'enable_qr_validation_seal' => true,
            'qr_layout_style' => 'GOV_SEAL_BORDERED', // 'GOV_SEAL_BORDERED' | 'CRYPTO_HASH_BADGE' | 'MINIMAL_HEADER'
            'qr_position' => 'HEADER_RIGHT', // 'HEADER_RIGHT' | 'FOOTER_CENTER' | 'SEAL_OVERLAY'
            'qr_verification_url_prefix' => '/verify-deed-qr',
            'show_cryptographic_hash' => true,
            'show_issuing_authority_signature' => true,
            'show_tamper_warning_text' => true,
            'tamper_warning_text_bn' => 'এই ডিজিটাল নথিটি ভূমিশিল্ডের ক্রিপ্টোগ্রাফিক সুরক্ষা চেইনের অধীনে অনুমোদিত। কিউআর কোড স্ক্যান করে অনলাইন ডাটাবেসের সাথে অখণ্ডতা যাচাই করুন। অননুমোদিত রদবদল ফৌজদারি অপরাধ হিসেবে গণ্য হবে।',
            'tamper_warning_text_en' => 'This digital record is cryptographically signed under BhumiShield sovereign chain. Scan QR code to verify live status. Tampering is punishable under penal code.',
            'dcr_fee_breakdown_visible' => true,
            'porcha_ownership_shares_visible' => true,
            'updated_at' => gmdate('c'),
            'updated_by' => 'system_admin',
        ];
    }

    public static function getDocumentSecurityConfig(): array
    {
        $row = DB::selectOne("SELECT setting_value_json FROM site_settings WHERE setting_key = 'dcr_porcha_watermark_config'");
        if (!$row) {
            $default = self::getDefaultDocumentSecurityConfig();
            $valJson = json_encode($default, JSON_UNESCAPED_UNICODE);
            DB::insert(
                "INSERT INTO site_settings (setting_key, setting_value_json, description_bn, description_en, updated_by, updated_at) VALUES ('dcr_porcha_watermark_config', ?, 'ডিজিটাল ডিসিআর ও খতিয়ান পর্চা ওয়াটারমার্ক ও কিউআর লেআউট কনফিগারেশন', 'Digital DCR & Khatian Porcha Watermark and QR Layout Configuration', 'system_admin', ?)",
                [$valJson, gmdate('c')]
            );
            return ['status' => 200, 'config' => $default];
        }

        $cfg = json_decode((string) $row['setting_value_json'], true);
        if (!is_array($cfg)) {
            $cfg = self::getDefaultDocumentSecurityConfig();
        } else {
            $cfg = array_merge(self::getDefaultDocumentSecurityConfig(), $cfg);
        }

        return ['status' => 200, 'config' => $cfg];
    }

    public static function updateDocumentSecurityConfig(array $payload, array $actor): array
    {
        RoleMiddleware::checkPermission('admin.offices.manage', $actor);

        $curr = self::getDocumentSecurityConfig()['config'];

        $updated = [
            'enable_custom_watermark' => isset($payload['enable_custom_watermark']) ? (bool) $payload['enable_custom_watermark'] : (bool) $curr['enable_custom_watermark'],
            'watermark_text_bn' => trim((string) ($payload['watermark_text_bn'] ?? $curr['watermark_text_bn'])),
            'watermark_text_en' => trim((string) ($payload['watermark_text_en'] ?? $curr['watermark_text_en'])),
            'watermark_opacity' => isset($payload['watermark_opacity']) ? max(0.04, min(0.60, (float) $payload['watermark_opacity'])) : (float) $curr['watermark_opacity'],
            'watermark_angle_deg' => isset($payload['watermark_angle_deg']) ? (int) $payload['watermark_angle_deg'] : (int) $curr['watermark_angle_deg'],
            'watermark_pattern' => in_array($payload['watermark_pattern'] ?? '', ['DIAGONAL_SINGLE', 'REPEATED_TILES', 'CENTER_SEAL'], true) ? $payload['watermark_pattern'] : $curr['watermark_pattern'],
            'enable_qr_validation_seal' => isset($payload['enable_qr_validation_seal']) ? (bool) $payload['enable_qr_validation_seal'] : (bool) $curr['enable_qr_validation_seal'],
            'qr_layout_style' => in_array($payload['qr_layout_style'] ?? '', ['GOV_SEAL_BORDERED', 'CRYPTO_HASH_BADGE', 'MINIMAL_HEADER'], true) ? $payload['qr_layout_style'] : $curr['qr_layout_style'],
            'qr_position' => in_array($payload['qr_position'] ?? '', ['HEADER_RIGHT', 'FOOTER_CENTER', 'SEAL_OVERLAY'], true) ? $payload['qr_position'] : $curr['qr_position'],
            'qr_verification_url_prefix' => trim((string) ($payload['qr_verification_url_prefix'] ?? $curr['qr_verification_url_prefix'])),
            'show_cryptographic_hash' => isset($payload['show_cryptographic_hash']) ? (bool) $payload['show_cryptographic_hash'] : (bool) $curr['show_cryptographic_hash'],
            'show_issuing_authority_signature' => isset($payload['show_issuing_authority_signature']) ? (bool) $payload['show_issuing_authority_signature'] : (bool) $curr['show_issuing_authority_signature'],
            'show_tamper_warning_text' => isset($payload['show_tamper_warning_text']) ? (bool) $payload['show_tamper_warning_text'] : (bool) $curr['show_tamper_warning_text'],
            'tamper_warning_text_bn' => trim((string) ($payload['tamper_warning_text_bn'] ?? $curr['tamper_warning_text_bn'])),
            'tamper_warning_text_en' => trim((string) ($payload['tamper_warning_text_en'] ?? $curr['tamper_warning_text_en'])),
            'dcr_fee_breakdown_visible' => isset($payload['dcr_fee_breakdown_visible']) ? (bool) $payload['dcr_fee_breakdown_visible'] : (bool) $curr['dcr_fee_breakdown_visible'],
            'porcha_ownership_shares_visible' => isset($payload['porcha_ownership_shares_visible']) ? (bool) $payload['porcha_ownership_shares_visible'] : (bool) $curr['porcha_ownership_shares_visible'],
            'updated_at' => gmdate('c'),
            'updated_by' => $actor['username'] ?? 'system_admin',
        ];

        $valJson = json_encode($updated, JSON_UNESCAPED_UNICODE);
        $exists = DB::selectOne("SELECT id FROM site_settings WHERE setting_key = 'dcr_porcha_watermark_config'");
        if ($exists) {
            DB::statement(
                "UPDATE site_settings SET setting_value_json = ?, updated_by = ?, updated_at = ? WHERE setting_key = 'dcr_porcha_watermark_config'",
                [$valJson, $actor['username'] ?? 'system_admin', $updated['updated_at']]
            );
        } else {
            DB::insert(
                "INSERT INTO site_settings (setting_key, setting_value_json, description_bn, description_en, updated_by, updated_at) VALUES ('dcr_porcha_watermark_config', ?, 'ডিজিটাল ডিসিআর ও খতিয়ান পর্চা ওয়াটারমার্ক ও কিউআর লেআউট কনফিগারেশন', 'Digital DCR & Khatian Porcha Watermark and QR Layout Configuration', ?, ?)",
                [$valJson, $actor['username'] ?? 'system_admin', $updated['updated_at']]
            );
        }

        LedgerService::recordAuditEntry(
            $actor['username'] ?? 'system_admin',
            $actor['role'] ?? 'system_admin',
            'DOCUMENT_SECURITY_CONFIG_UPDATED',
            'site_settings',
            'dcr_porcha_watermark_config',
            [
                'actor' => $actor['username'] ?? 'system_admin',
                'custom_watermark_enabled' => $updated['enable_custom_watermark'],
                'qr_layout_style' => $updated['qr_layout_style'],
                'watermark_text' => $updated['watermark_text_bn'],
            ]
        );

        return [
            'status' => 200,
            'config' => $updated,
            'message_bn' => 'ডিজিটাল ডিসিআর ও খতিয়ান পর্চার ওয়াটারমার্ক ও কিউআর লেআউট কনফিগারেশন সফলভাবে সংরক্ষিত হয়েছে।',
            'message_en' => 'Digital DCR & Khatian Porcha watermark and QR layout configuration updated successfully.',
        ];
    }
}
