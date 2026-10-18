<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Services\JwtAuthService;
use App\Services\RbacService;
use App\Support\DB;

/**
 * Laravel Role-Based Access Control (RBAC) Middleware.
 * Validates Bearer JWT tokens, active status, and enforces Spatie-compatible RBAC
 * and Section 4.4 Permission Matrix.
 */
final class RoleMiddleware
{
    /**
     * Authorizes the request against a set of allowed roles.
     * Enforces M3 & T3: Admins cannot mutate land data or approve mutations!
     */
    public static function authorize(array $allowedRoles, ?array $overrideUser = null): array
    {
        $user = $overrideUser ?? JwtAuthService::getAuthenticatedUser();

        if (!$user) {
            throw new \RuntimeException(json_encode([
                'status' => 401,
                'code' => 'AUTH_REQUIRED',
                'message_bn' => 'এই প্যানেল বা অ্যাকশনটি ব্যবহারের জন্য অনুমোদিত অ্যাকাউন্টে লগইন করা আবশ্যক।',
                'message_en' => 'Authentication required. Please sign in with an authorized account.',
            ], JSON_UNESCAPED_UNICODE));
        }

        if (((int) ($user['is_active'] ?? 1)) === 0) {
            throw new \RuntimeException(json_encode([
                'status' => 403,
                'code' => 'ACCOUNT_SUSPENDED',
                'message_bn' => 'আপনার অ্যাকাউন্টটি অ্যাডমিন কর্তৃক স্থগিত করা হয়েছে।',
                'message_en' => 'Your account has been suspended by the administrator.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $userRole = (string) ($user['role'] ?? 'citizen');
        $isAdminRole = ($userRole === 'admin' || $userRole === 'system_admin');

        // M3 & T3 Rule: Admin CANNOT edit land data or approve mutations!
        // If allowedRoles strictly targets 'ac_land' and does not explicitly include 'admin', admin is rejected!
        $isLandDataWrite = in_array('ac_land', $allowedRoles, true) && !in_array('admin', $allowedRoles, true) && !in_array('system_admin', $allowedRoles, true);

        if ($isAdminRole && $isLandDataWrite) {
            throw new \RuntimeException(json_encode([
                'status' => 403,
                'code' => 'ADMIN_CANNOT_EDIT_LAND_DATA',
                'required_roles' => $allowedRoles,
                'current_role' => $userRole,
                'message_bn' => 'প্রশাসক বা অডিটর কর্তৃক ভূমির মালিকানা বা রেকর্ড পরিবর্তন আইনত নিষিদ্ধ (Rule M3)। শুধুমাত্র সহকারী কমিশনার (ভূমি) এর অনুমোদন ক্ষমতা রয়েছে।',
                'message_en' => 'System administrators and auditors are strictly prohibited from mutating land data or approving ownership transfers (Rule M3).',
            ], JSON_UNESCAPED_UNICODE));
        }

        $effectiveAllowed = $allowedRoles;
        if (in_array('admin', $allowedRoles, true)) {
            $effectiveAllowed[] = 'system_admin';
        }
        if (in_array('system_admin', $allowedRoles, true)) {
            $effectiveAllowed[] = 'admin';
        }

        if (!empty($allowedRoles) && !in_array($userRole, $effectiveAllowed, true)) {
            $reqRolesStr = implode(', ', $allowedRoles);
            throw new \RuntimeException(json_encode([
                'status' => 403,
                'code' => 'FORBIDDEN_ROLE',
                'required_roles' => $allowedRoles,
                'current_role' => $userRole,
                'message_bn' => "অ্যাক্সেস অনুমোদিত নয়! আপনার বর্তমান ভূমিকা '{$userRole}', কিন্তু এই কাজের জন্য '{$reqRolesStr}' ভূমিকা প্রয়োজন।",
                'message_en' => "Access denied by RoleMiddleware! Your role '{$userRole}' is not authorized; required role(s): {$reqRolesStr}.",
            ], JSON_UNESCAPED_UNICODE));
        }

        return $user;
    }

    /**
     * Checks if user has a specific permission by name.
     */
    public static function checkPermission(string $permission, ?array $overrideUser = null): array
    {
        $user = self::authorize([], $overrideUser);
        $role = (string) ($user['role'] ?? '');

        if (!RbacService::hasPermission($role, $permission)) {
            throw new \RuntimeException(json_encode([
                'status' => 403,
                'code' => 'PERMISSION_DENIED',
                'permission' => $permission,
                'current_role' => $role,
                'message_bn' => "আপনার ভূমিকা '{$role}'-এর জন্য '{$permission}' অনুমতিটি বরাদ্দ নেই।",
                'message_en' => "Permission '{$permission}' is denied for role '{$role}'.",
            ], JSON_UNESCAPED_UNICODE));
        }

        return $user;
    }

    public static function getPermissionMatrix(): array
    {
        return RbacService::PERMISSION_MATRIX;
    }

    /**
     * Enforces strict maker-checker segregation.
     * Prevents self-approval of work created or drafted by the same officer.
     */
    public static function assertMakerCheckerSegregation(int $makerUserId, int $checkerUserId, string $actionName = 'অনুমোদন'): void
    {
        if ($makerUserId > 0 && $checkerUserId > 0 && $makerUserId === $checkerUserId) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'MAKER_CHECKER_VIOLATION',
                'maker_user_id' => $makerUserId,
                'checker_user_id' => $checkerUserId,
                'message_bn' => "স্বতন্ত্র অনুমোদন নীতি লঙ্ঘন: মেকার এবং চেকার একই ব্যক্তি হতে পারেন না ({$actionName})।",
                'message_en' => "Maker-checker segregation policy violation: maker and checker cannot be the same user ({$actionName}).",
            ], JSON_UNESCAPED_UNICODE));
        }
    }
}
