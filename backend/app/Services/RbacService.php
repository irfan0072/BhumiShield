<?php

declare(strict_types=1);

namespace App\Services;

use App\Support\DB;

/**
 * Spatie-compatible Role-Based Access Control (RBAC) Service.
 * Implements Specification Section 4 (Roles, Permissions & Access Tiers).
 */
final class RbacService
{
    /**
     * Complete list of roles defined in Section 4.1 and 4.2.
     */
    public const ROLES = [
        'guest' => [
            'tier' => 'T0',
            'label_bn' => 'অতিথি (লগইন ব্যতীত)',
            'label_en' => 'Guest (Public)',
            'description_bn' => 'লগইন ছাড়া পাবলিক লেজার যাচাই ও নোটিশ বোর্ড পরিদর্শন।',
            'description_en' => 'Public deed QR lookup, noticeboard, and blog without authentication.',
        ],
        'citizen' => [
            'tier' => 'T1',
            'label_bn' => 'নাগরিক (মালিক / ক্রেতা / ওয়ারিশ)',
            'label_en' => 'Citizen (Owner / Buyer / Heir)',
            'description_bn' => 'ব্যক্তিগত জমির ভল্ট, সেল লক, বিরোধ দাখিল, স্থানান্তর প্রস্তাব ও টিকিট ট্র্যাকিং।',
            'description_en' => 'Personal land vault, sale lock, disputes, transfer wizard, and support tickets.',
        ],
        'service_point_operator' => [
            'tier' => 'T2',
            'label_bn' => 'সার্ভিস পয়েন্ট অপারেটর (ইউডিসি / ডিজিটাল সেন্টার)',
            'label_en' => 'Service Point Operator (UDC / Digital Center)',
            'description_bn' => 'নাগরিকের পক্ষে কেস আবেদন, কাউন্টার বায়োমেট্রিক ক্যাপচার, কাগজ স্ক্যান ও রশিদ প্রিন্ট।',
            'description_en' => 'Assisted filing, counter biometric capture, document scan, case-scoped access.',
        ],
        'sub_registrar' => [
            'tier' => 'T2',
            'label_bn' => 'সাব-রেজিস্ট্রার (নিবন্ধন অধিদপ্তর)',
            'label_en' => 'Sub-Registrar (Registration Directorate)',
            'description_bn' => 'প্রাক-নিবন্ধন যাচাই, কাউন্টার বায়োমেট্রিক সম্মতি এবং ক্রিপ্টোগ্রাফিক ডিজিটাল স্বাক্ষরিত দলিল নিবন্ধন।',
            'description_en' => 'Pre-registration check, counter biometric check, Ed25519 digital deed registration.',
        ],
        'registry_data_officer' => [
            'tier' => 'T2',
            'label_bn' => 'রেজিস্ট্রি ডাটা এন্ট্রি অফিসার (মেকার)',
            'label_en' => 'Registry Data Officer (Maker)',
            'description_bn' => 'দলিল নিবন্ধনের প্রাথমিক তথ্য প্রস্তুতকরণ ও ডাটা স্ট্যাজিং এন্ট্রি।',
            'description_en' => 'Primary deed data entry maker for registration staging.',
        ],
        'ac_land' => [
            'tier' => 'T2',
            'label_bn' => 'সহকারী কমিশনার - ভূমি (এসি ল্যান্ড)',
            'label_en' => 'Assistant Commissioner of Land (AC Land)',
            'description_bn' => 'ই-নামজারি অনুমোদন/খারিজ, শুনানি, খতিয়ান সমন্বয় ও বিরোধ নিষ্পত্তি। একমাত্র মালিকানা পরিবর্তনের সাংবিধানিক কর্তৃপক্ষ।',
            'description_en' => 'e-Mutation review, signed approvals, hearings, khatian reconciliation. Sole ownership authority.',
        ],
        'land_office_assistant' => [
            'tier' => 'T2',
            'label_bn' => 'উপজেলা ভূমি সহকারী (মেকার)',
            'label_en' => 'Land Office Assistant (Maker)',
            'description_bn' => 'নামজারি নথি প্রক্রিয়াকরণ, নোটিশ প্রস্তুতকরণ ও রেকর্ডরুম ডাটা এন্ট্রি।',
            'description_en' => 'Mutation package processor and notice drafter maker.',
        ],
        'field_verification_officer' => [
            'tier' => 'T2',
            'label_bn' => 'ফিল্ড ভেরিফিকেশন অফিসার (ইউএলএও / সার্ভেয়ার)',
            'label_en' => 'Field Verification Officer (Surveyor)',
            'description_bn' => 'মাঠপর্যায়ে জমির দখল তদন্ত, ছবি ও ভূ-অবস্থান প্রতিবেদন এবং এলডি ট্যাক্স হোল্ডিং যাচাই।',
            'description_en' => 'Field physical possession inspection, photos, geotags, LD tax verification.',
        ],
        'settlement_records_officer' => [
            'tier' => 'T2',
            'label_bn' => 'সেটেলমেন্ট রেকর্ডস অফিসার (জরিপ মেকার)',
            'label_en' => 'Settlement Records Officer (Survey Maker)',
            'description_bn' => 'চলমান জরিপ (সিএস/এসএ/আরএস/বিএস) খতিয়ান ডাটা প্রস্তুত ও স্ট্যাজিং এন্ট্রি।',
            'description_en' => 'Survey khatian records data entry maker.',
        ],
        'settlement_checker' => [
            'tier' => 'T2',
            'label_bn' => 'সহকারী সেটেলমেন্ট অফিসার (জরিপ চেকার)',
            'label_en' => 'Assistant Settlement Officer (Survey Checker)',
            'description_bn' => 'সেটেলমেন্ট রেকর্ডস অফিসারের ডাটা যাচাই ও লেজারে চূড়ান্ত গেজেট প্রকাশ অনুমোদন।',
            'description_en' => 'Checker verifying and approving settlement survey records.',
        ],
        'uno_supervisor' => [
            'tier' => 'T2',
            'label_bn' => 'উপজেলা নির্বাহী কর্মকর্তা (ইউএনও - তদারককারী)',
            'label_en' => 'Upazila Nirbahi Officer (UNO Supervisor)',
            'description_bn' => 'উপজেলা পর্যায়ে বিলম্বিত নামজারি ও এসএলএ অতিক্রমকারী মামলার এসকেলেশন তদারকি।',
            'description_en' => 'Escalation supervisor for overdue mutation cases and SLA breaches.',
        ],
        'appellate_reviewer' => [
            'tier' => 'T2',
            'label_bn' => 'আপিল কর্তৃপক্ষ (অতিরিক্ত জেলা প্রশাসক - রাজস্ব)',
            'label_en' => 'Appellate Reviewer (ADC Revenue)',
            'description_bn' => 'নামজারি আপিল ও আদালতের আদেশ পর্যালোচনা এবং ফলাফল নথিভুক্তকরণ।',
            'description_en' => 'Review and record appellate and court order outcomes.',
        ],
        'bank_officer' => [
            'tier' => 'T2',
            'label_bn' => 'ব্যাংক ঋণ কর্মকর্তা (জামানত মেকার)',
            'label_en' => 'Bank Credit Officer (Collateral Maker)',
            'description_bn' => 'জমির জামানত ঝুঁকি যাচাই, বন্ধক লিয়েন প্রস্তুত ও ছাড়পত্র খসড়া তৈরি।',
            'description_en' => 'Collateral check, mortgage lien preparation, draft NOC.',
        ],
        'bank_manager' => [
            'tier' => 'T2',
            'label_bn' => 'ব্যাংক শাখা ব্যবস্থাপক (জামানত চেকার)',
            'label_en' => 'Bank Branch Manager (Collateral Checker)',
            'description_bn' => 'বন্ধক লিয়েন অনুমোদন, ঋণ অবমুক্তকরণ ও ডিজিটাল এনওসি চূড়ান্ত স্বাক্ষর।',
            'description_en' => 'Lien approval, mortgage release, final digital NOC sign-off.',
        ],
        'support_agent' => [
            'tier' => 'T2',
            'label_bn' => 'সাপোর্ট এজেন্ট (১৬১২২ হেল্পলাইন / জিআরএস)',
            'label_en' => 'Support Agent (16122 Helpline / GRS)',
            'description_bn' => 'নাগরিক অভিযোগ ও টিকিট ট্রায়াজ, সাধারণ পরামর্শ এবং সংশ্লিষ্ট অফিসে রেফারেল।',
            'description_en' => 'Ticket triaging, general assistance, routing to competent authorities.',
        ],
        'platform_moderator' => [
            'tier' => 'T2',
            'label_bn' => 'প্ল্যাটফর্ম মডারেটর (জমি বিক্রয় মার্কেটপ্লেস)',
            'label_en' => 'Platform Moderator (Sale Listings)',
            'description_bn' => 'জমি বিক্রয় তালিকার সত্যতা যাচাই, প্রতারণামূলক বিজ্ঞাপন আনলিস্ট ও পর্যবেক্ষণ।',
            'description_en' => 'Moderates public sale listings and reviews community fraud reports.',
        ],
        'content_editor' => [
            'tier' => 'T2',
            'label_bn' => 'কনটেন্ট এডিটর (নোটিশ ও সচেতনতামূলক ব্লগ)',
            'label_en' => 'Content Editor (Notices & Blog)',
            'description_bn' => 'নাগরিক সচেতনতা নির্দেশিকা, আইনি ব্যাখ্যা ও অফিস নোটিশের খসড়া তৈরি।',
            'description_en' => 'Drafts public guidance, legal explainers, and office circulars.',
        ],
        'content_approver' => [
            'tier' => 'T2',
            'label_bn' => 'কনটেন্ট অ্যাপ্রুভার (কার্যালয় প্রধান)',
            'label_en' => 'Content Approver (Authority Head)',
            'description_bn' => 'নোটিশ ও ব্লগ অনুমোদন এবং ডিজিটাল কিউআর সিলসহ গেজেট প্রকাশ।',
            'description_en' => 'Reviews and publishes approved notices and educational content.',
        ],
        'system_admin' => [
            'tier' => 'T3',
            'label_bn' => 'সিস্টেম অ্যাডমিন (প্ল্যাটফর্ম রক্ষণাবেক্ষণ)',
            'label_en' => 'System Admin (Platform Operations)',
            'description_bn' => 'ব্যবহারকারী ব্যবস্থাপনা, আরবিক কনফিগারেশন, সিস্টেম প্যারামিটার ও ক্রিপ্টো কী পর্যবেক্ষণ। কোনো জমি ডাটা সম্পাদনা করতে পারে না।',
            'description_en' => 'Platform operations, RBAC, site settings, key monitoring. Cannot edit land data.',
        ],
        'auditor' => [
            'tier' => 'T3',
            'label_bn' => 'জাতীয় অডিটর (ক্রিপ্টোগ্রাফিক লেজার নিরীক্ষক)',
            'label_en' => 'National Auditor (Cryptographic Ledger Auditor)',
            'description_bn' => 'হ্যাশ চেইনের অবিচ্ছিন্নতা অডিট, ব্রেক-গ্লাস অ্যাক্সেস লগ ও নিরাপত্তা অডিট রিপোর্ট পরিদর্শন।',
            'description_en' => 'Hash chain verification, break-glass inspection, tamper audit log review.',
        ],
        // Phase 2 stub roles:
        'dc_acquisition_officer' => [
            'tier' => 'T2',
            'label_bn' => 'এলএ কর্মকর্তা (জেলা প্রশাসক ভূমি অধিগ্রহণ শাখা)',
            'label_en' => 'DC Land Acquisition Officer',
            'description_bn' => 'সরকারি প্রকল্প ও জাতীয় স্বার্থে ভূমি অধিগ্রহণ গেজেট ট্র্যাকিং।',
            'description_en' => 'Public purpose land acquisition notice tracking and gazetting.',
        ],
        'lawyer_court_user' => [
            'tier' => 'T2',
            'label_bn' => 'আইনজীবী / দেওয়ানি আদালত প্রতিনিধি',
            'label_en' => 'Lawyer / Civil Court User',
            'description_bn' => 'মালিকানা স্বত্ব মামলা ও নিষেধাজ্ঞার সার্টিফাইড কপি দাখিল ও নিরীক্ষণ।',
            'description_en' => 'Filing certified injunctions and court decrees for case review.',
        ],
    ];

    /**
     * Permission Matrix defined in Section 4.4 and Super Admin 16-Module 3-Tier Governance.
     * Enforces explicit role bindings without wildcards.
     */
    public const PERMISSION_MATRIX = [
        // Statutory core permissions
        'ownership.approve' => ['ac_land'],
        'deed.register' => ['sub_registrar'],
        'transfer.start' => ['citizen'],
        'biometric.capture' => ['service_point_operator', 'sub_registrar'],
        'khatian.enter' => ['settlement_records_officer'],
        'khatian.verify' => ['settlement_checker'],
        'deed_record.enter' => ['registry_data_officer'],
        'deed_record.verify' => ['sub_registrar'],
        'document.upload' => ['citizen', 'service_point_operator'],
        'document.verify' => ['sub_registrar', 'ac_land', 'field_verification_officer', 'bank_officer'],
        'lien.prepare' => ['bank_officer'],
        'lien.approve' => ['bank_manager'],
        'listing.create' => ['citizen'],
        'listing.moderate' => ['platform_moderator', 'ac_land', 'admin', 'system_admin'],
        'ticket.triage' => ['support_agent', 'admin', 'system_admin'],
        'ticket.resolve_general' => ['support_agent', 'admin', 'system_admin'],
        'ticket.resolve_record' => ['sub_registrar', 'ac_land', 'settlement_checker'],
        'notice.draft' => ['content_editor', 'admin', 'system_admin'],
        'notice.publish' => ['content_approver', 'admin', 'system_admin'],
        'rules.configure' => ['system_admin'],
        'audit.view' => ['auditor', 'system_admin', 'admin'],

        // Super Admin 16 Modules 3-Tier Granular Permissions (No Wildcards)
        // 1. Overview & Pending Actions
        'admin.overview.view' => ['admin', 'system_admin'],

        // 2. Users, Roles & Office Assignments
        'admin.users.view' => ['admin', 'system_admin', 'auditor'],
        'admin.users.manage' => ['admin', 'system_admin'],
        'admin.users.transfer_office' => ['admin', 'system_admin'],
        'admin.roles.manage' => ['system_admin'],

        // 3. Citizen Service Applications (Transfers)
        'admin.transfers.view' => ['admin', 'system_admin', 'auditor', 'support_agent'],
        'admin.transfers.manage' => ['admin', 'system_admin'],
        'admin.transfers.reassign' => ['admin', 'system_admin'],
        'admin.transfers.correction_request' => ['admin', 'system_admin'],

        // 4. Registration & Deeds
        'admin.deeds.view' => ['admin', 'system_admin', 'auditor', 'sub_registrar'],
        'admin.deeds.hold' => ['admin', 'system_admin'],
        'admin.deeds.flag' => ['admin', 'system_admin'],

        // 5. Mutation & Ownership Records
        'admin.mutations.view' => ['admin', 'system_admin', 'auditor', 'uno_supervisor'],
        'admin.mutations.manage' => ['admin', 'system_admin'],
        'admin.khatians.reconcile' => ['ac_land', 'admin', 'system_admin'],

        // 6. Field Verification
        'admin.field_verification.view' => ['admin', 'system_admin', 'auditor', 'ac_land'],
        'admin.field_verification.assign' => ['admin', 'system_admin', 'ac_land'],

        // 7. Survey Records & Maker/Checker
        'admin.survey.view' => ['admin', 'system_admin', 'auditor', 'settlement_checker'],
        'admin.survey.manage' => ['admin', 'system_admin'],

        // 8. Bank Liens & Releases
        'admin.mortgages.view' => ['admin', 'system_admin', 'auditor', 'bank_manager', 'bank_officer'],

        // 9. Appeals & Court Documents
        'admin.appeals.view' => ['admin', 'system_admin', 'auditor', 'appellate_reviewer'],
        'admin.appeals.manage' => ['admin', 'system_admin'],
        'admin.disputes.view' => ['admin', 'system_admin', 'auditor', 'lawyer_court_user'],
        'admin.disputes.resolve' => ['ac_land', 'admin', 'system_admin'],

        // 10. Acquisition Cases
        'admin.acquisition.view' => ['admin', 'system_admin', 'dc_acquisition_officer', 'auditor'],
        'admin.acquisition.manage' => ['admin', 'system_admin', 'dc_acquisition_officer'],

        // 11. Marketplace Moderation
        'admin.listings.view' => ['admin', 'system_admin', 'platform_moderator'],
        'admin.listings.moderate' => ['platform_moderator', 'admin', 'system_admin'],

        // 12. Support Tickets
        'admin.tickets.view' => ['admin', 'system_admin', 'support_agent'],
        'admin.tickets.reply' => ['support_agent', 'admin', 'system_admin'],
        'admin.tickets.assign' => ['admin', 'system_admin', 'support_agent'],

        // 13. Notices & Content Approval
        'admin.notices.view' => ['admin', 'system_admin', 'content_editor', 'content_approver'],
        'admin.notices.manage' => ['admin', 'system_admin', 'content_editor'],
        'admin.notices.publish' => ['content_approver', 'admin', 'system_admin'],

        // 14. Offices & Service Configuration
        'admin.offices.view' => ['admin', 'system_admin'],
        'admin.offices.manage' => ['admin', 'system_admin'],
        'admin.services.manage' => ['admin', 'system_admin'],

        // 15. Integrations & Failed Deliveries
        'admin.integrations.view' => ['admin', 'system_admin'],
        'admin.integrations.retry' => ['system_admin', 'admin'],

        // 16. Audit Logs, Reports & Security Overrides
        'admin.audit.view' => ['auditor', 'system_admin', 'admin'],
        'admin.audit.export' => ['system_admin', 'admin'],
        'admin.security.freeze_plot' => ['system_admin', 'admin'],
        'admin.security.override' => ['system_admin'],
        'admin.security.backup' => ['system_admin'],
    ];

    /**
     * Initializes Spatie-style RBAC tables and seeds all 18 roles and permissions.
     */
    public static function seedRbacTables(): void
    {
        $now = gmdate('c');

        // 1. Seed Roles
        foreach (self::ROLES as $roleName => $meta) {
            $existing = DB::selectOne('SELECT id FROM roles WHERE name = ?', [$roleName]);
            if (!$existing) {
                DB::insert(
                    'INSERT INTO roles (name, guard_name, label_bn, label_en, tier, description_bn, description_en, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        $roleName,
                        'web',
                        $meta['label_bn'],
                        $meta['label_en'],
                        $meta['tier'],
                        $meta['description_bn'],
                        $meta['description_en'],
                        $now,
                        $now,
                    ]
                );
            }
        }

        // 2. Seed Permissions & Link to Roles
        foreach (self::PERMISSION_MATRIX as $permName => $allowedRoles) {
            $existingPerm = DB::selectOne('SELECT id FROM permissions WHERE name = ?', [$permName]);
            $permId = $existingPerm ? (int) $existingPerm['id'] : DB::insert(
                'INSERT INTO permissions (name, guard_name, label_bn, label_en, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                    $permName,
                    'web',
                    $permName,
                    $permName,
                    explode('.', $permName)[0] ?? 'general',
                    $now,
                    $now,
                ]
            );

            foreach ($allowedRoles as $rName) {
                $roleRow = DB::selectOne('SELECT id FROM roles WHERE name = ?', [$rName]);
                if ($roleRow) {
                    $linked = DB::selectOne(
                        'SELECT 1 FROM role_has_permissions WHERE permission_id = ? AND role_id = ?',
                        [$permId, $roleRow['id']]
                    );
                    if (!$linked) {
                        DB::insert(
                            'INSERT INTO role_has_permissions (permission_id, role_id) VALUES (?, ?)',
                            [$permId, $roleRow['id']]
                        );
                    }
                }
            }
        }
    }

    /**
     * Checks if a user has a specific permission based on their assigned role.
     */
    public static function hasPermission(string $role, string $permission): bool
    {
        $allowed = self::PERMISSION_MATRIX[$permission] ?? [];
        return in_array($role, $allowed, true);
    }

    /**
     * Enforces jurisdiction scope for an officer operating on a given location.
     */
    public static function verifyJurisdictionScope(array $user, int $locationId): bool
    {
        $role = (string) ($user['role'] ?? '');
        // Citizens and System Admin operate globally or on own holdings
        if (in_array($role, ['citizen', 'system_admin', 'admin', 'auditor', 'guest'], true)) {
            return true;
        }

        $userId = (int) ($user['id'] ?? 0);
        $assignment = DB::selectOne(
            'SELECT o.division_bn, o.district_bn, o.upazila_bn, o.mouzas_served_json, ou.jurisdiction_scope_json 
             FROM office_user ou
             JOIN offices o ON o.id = ou.office_id
             WHERE ou.user_id = ? AND o.is_active = 1 LIMIT 1',
            [$userId]
        );

        if (!$assignment) {
            // Default demo tolerance if assignment not yet mapped
            return true;
        }

        $loc = DB::selectOne('SELECT * FROM locations WHERE id = ?', [$locationId]);
        if (!$loc) {
            return true;
        }

        if ($assignment['upazila_bn'] && $assignment['upazila_bn'] !== $loc['upazila_bn']) {
            return false;
        }

        return true;
    }
}
