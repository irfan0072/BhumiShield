<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Services\FraudRulesEngine;
use App\Services\JwtAuthService;
use App\Services\LedgerService;
use App\Services\OwnershipGuard;
use App\Services\RbacService;
use App\Support\DB;
use Database\Migrations\CreateBhumishieldTables;

/**
 * Seeds the BhumiShield Laravel database with 100% synthetic Bangladeshi land records,
 * all 18 RBAC demo user roles, offices, document vault templates, SLA policies,
 * transfer state machines, and real land record workflows.
 */
final class DatabaseSeeder
{
    public const DEMO_USERS = [
        [
            'username' => 'citizen',
            'email' => 'rafiqul.citizen@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'মো. রফিকুল ইসলাম (নাগরিক)',
            'full_name_en' => 'Md. Rafiqul Islam (Citizen)',
            'role' => 'citizen',
            'office_bn' => 'নাগরিক পোর্টাল — সাভার, ঢাকা',
            'office_en' => 'Citizen Portal — Savar, Dhaka',
            'phone_dummy' => '01700-001001',
            'nid' => '9900001001',
            'is_active' => 1,
        ],
        [
            'username' => 'rabeya',
            'email' => 'rabeya.citizen@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'মোসা. রাবেয়া খাতুন (নাগরিক - ওয়ারিশ)',
            'full_name_en' => 'Mst. Rabeya Khatun (Citizen - Heir)',
            'role' => 'citizen',
            'office_bn' => 'নাগরিক পোর্টাল — বিরুলিয়া, সাভার',
            'office_en' => 'Citizen Portal — Birulia, Savar',
            'phone_dummy' => '01700-001002',
            'nid' => '9900001002',
            'is_active' => 1,
        ],
        [
            'username' => 'spo_birulia',
            'email' => 'spo.birulia@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'মো. শাহীনুর রহমান (সার্ভিস পয়েন্ট অপারেটর)',
            'full_name_en' => 'Md. Shahinur Rahman (Service Point Operator)',
            'role' => 'service_point_operator',
            'office_bn' => 'বিরুলিয়া ইউনিয়ন ডিজিটাল সেন্টার (ইউডিসি)',
            'office_en' => 'Birulia Union Digital Center (UDC)',
            'phone_dummy' => '01700-001003',
            'nid' => '9900001999',
            'is_active' => 1,
        ],
        [
            'username' => 'registrar',
            'email' => 'sr.savar@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'ফারহানা ইয়াসমিন (সাব-রেজিস্ট্রার)',
            'full_name_en' => 'Farhana Yasmin (Sub-Registrar)',
            'role' => 'sub_registrar',
            'office_bn' => 'সাব-রেজিস্ট্রি অফিস, সাভার, ঢাকা',
            'office_en' => 'Sub-Registry Office, Savar, Dhaka',
            'phone_dummy' => '01700-002001',
            'nid' => '9900002001',
            'is_active' => 1,
        ],
        [
            'username' => 'registrar_gazipur',
            'email' => 'sr.gazipur@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'মো. শফিকুল আলম (সাব-রেজিস্ট্রার)',
            'full_name_en' => 'Md. Shafiqul Alam (Sub-Registrar)',
            'role' => 'sub_registrar',
            'office_bn' => 'সাব-রেজিস্ট্রি অফিস, গাজীপুর সদর',
            'office_en' => 'Sub-Registry Office, Gazipur Sadar',
            'phone_dummy' => '01700-002002',
            'nid' => '9900002002',
            'is_active' => 1,
        ],
        [
            'username' => 'rdo_savar',
            'email' => 'rdo.savar@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'মো. কামরুল হাসান (রেজিস্ট্রি ডাটা অফিসার - মেকার)',
            'full_name_en' => 'Md. Kamrul Hasan (Registry Data Officer - Maker)',
            'role' => 'registry_data_officer',
            'office_bn' => 'সাব-রেজিস্ট্রি অফিস, সাভার, ঢাকা',
            'office_en' => 'Sub-Registry Office, Savar, Dhaka',
            'phone_dummy' => '01700-002003',
            'nid' => '9900002003',
            'is_active' => 1,
        ],
        [
            'username' => 'acland',
            'email' => 'acland.savar@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'তানভীর আহমেদ (সহকারী কমিশনার - ভূমি)',
            'full_name_en' => 'Tanvir Ahmed (AC Land)',
            'role' => 'ac_land',
            'office_bn' => 'উপজেলা ভূমি অফিস, সাভার, ঢাকা',
            'office_en' => 'Upazila Land Office, Savar, Dhaka',
            'phone_dummy' => '01700-003001',
            'nid' => '9900003001',
            'is_active' => 1,
        ],
        [
            'username' => 'loa_savar',
            'email' => 'loa.savar@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'সালমা আক্তার (ভূমি অফিস সহকারী - মেকার)',
            'full_name_en' => 'Salma Akter (Land Office Assistant - Maker)',
            'role' => 'land_office_assistant',
            'office_bn' => 'উপজেলা ভূমি অফিস, সাভার, ঢাকা',
            'office_en' => 'Upazila Land Office, Savar, Dhaka',
            'phone_dummy' => '01700-003002',
            'nid' => '9900003002',
            'is_active' => 1,
        ],
        [
            'username' => 'fvo_savar',
            'email' => 'fvo.savar@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'মো. জাহাঙ্গীর আলম (ফিল্ড ভেরিফিকেশন অফিসার)',
            'full_name_en' => 'Md. Jahangir Alam (Field Verification Officer)',
            'role' => 'field_verification_officer',
            'office_bn' => 'ইউনিয়ন ভূমি অফিস, বিরুলিয়া, সাভার',
            'office_en' => 'Union Land Office, Birulia, Savar',
            'phone_dummy' => '01700-003003',
            'nid' => '9900003003',
            'is_active' => 1,
        ],
        [
            'username' => 'sro_dhaka',
            'email' => 'sro.dhaka@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'মো. দেলোয়ার হোসেন (সেটেলমেন্ট রেকর্ডস অফিসার - মেকার)',
            'full_name_en' => 'Md. Delwar Hossain (Settlement Records Officer - Maker)',
            'role' => 'settlement_records_officer',
            'office_bn' => 'জোনাল সেটেলমেন্ট অফিস, ঢাকা',
            'office_en' => 'Zonal Settlement Office, Dhaka',
            'phone_dummy' => '01700-003004',
            'nid' => '9900003004',
            'is_active' => 1,
        ],
        [
            'username' => 'aso_dhaka',
            'email' => 'aso.dhaka@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'নাজনীন সুলতানা (সহকারী সেটেলমেন্ট অফিসার - চেকার)',
            'full_name_en' => 'Nazneen Sultana (Assistant Settlement Officer - Checker)',
            'role' => 'settlement_checker',
            'office_bn' => 'জোনাল সেটেলমেন্ট অফিস, ঢাকা',
            'office_en' => 'Zonal Settlement Office, Dhaka',
            'phone_dummy' => '01700-003005',
            'nid' => '9900003005',
            'is_active' => 1,
        ],
        [
            'username' => 'uno_savar',
            'email' => 'uno.savar@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'মো. মশিউর রহমান (উপজেলা নির্বাহী কর্মকর্তা - তদারককারী)',
            'full_name_en' => 'Md. Mashiur Rahman (UNO Supervisor)',
            'role' => 'uno_supervisor',
            'office_bn' => 'উপজেলা নির্বাহী অফিসারের কার্যালয়, সাভার',
            'office_en' => 'Upazila Nirbahi Office, Savar',
            'phone_dummy' => '01700-003006',
            'nid' => '9900003006',
            'is_active' => 1,
        ],
        [
            'username' => 'appellate_reviewer',
            'email' => 'adc.dhaka@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'মো. সাইদুর রহমান (অতিরিক্ত জেলা প্রশাসক - রাজস্ব)',
            'full_name_en' => 'Md. Saidur Rahman (ADC Revenue - Appellate Reviewer)',
            'role' => 'appellate_reviewer',
            'office_bn' => 'জেলা প্রশাসকের কার্যালয় (রাজস্ব শাখা), ঢাকা',
            'office_en' => 'Office of Deputy Commissioner (Revenue), Dhaka',
            'phone_dummy' => '01700-003007',
            'nid' => '9900003007',
            'is_active' => 1,
        ],
        [
            'username' => 'bank',
            'email' => 'credit.sonalibank@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'নাজমুল হাসান (ব্যাংক কর্মকর্তা - ঋণ শাখা)',
            'full_name_en' => 'Nazmul Hasan (Bank Officer - Credit)',
            'role' => 'bank_officer',
            'office_bn' => 'সোনালী ব্যাংক পিএলসি, সাভার শাখা',
            'office_en' => 'Sonali Bank PLC, Savar Branch',
            'phone_dummy' => '01700-004001',
            'nid' => '9900004001',
            'is_active' => 1,
        ],
        [
            'username' => 'bank_manager',
            'email' => 'manager.sonalibank@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'সৈয়দা খালেদা পারভীন (শাখা ব্যবস্থাপক - ব্যাংক)',
            'full_name_en' => 'Syeda Khaleda Parveen (Bank Branch Manager)',
            'role' => 'bank_manager',
            'office_bn' => 'সোনালী ব্যাংক পিএলসি, সাভার শাখা',
            'office_en' => 'Sonali Bank PLC, Savar Branch',
            'phone_dummy' => '01700-004002',
            'nid' => '9900004002',
            'is_active' => 1,
        ],
        [
            'username' => 'support_agent',
            'email' => 'support.agent@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'মোসা. ফারহানা আফরোজ (সাপোর্ট এজেন্ট - ১৬১২২)',
            'full_name_en' => 'Mst. Farhana Afroz (Support Agent - 16122)',
            'role' => 'support_agent',
            'office_bn' => 'ভূমি সেবা হেল্পলাইন কলসেন্টার ১৬১২২',
            'office_en' => 'Land Service Helpline Call Center 16122',
            'phone_dummy' => '01700-004003',
            'nid' => '9900004003',
            'is_active' => 1,
        ],
        [
            'username' => 'platform_moderator',
            'email' => 'mod.bhumishield@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'মো. ফাহিম চৌধুরী (প্ল্যাটফর্ম মডারেটর)',
            'full_name_en' => 'Md. Fahim Chowdhury (Platform Moderator)',
            'role' => 'platform_moderator',
            'office_bn' => 'ভূমি সুরক্ষা মার্কেটপ্লেস ও লিস্টিং সেল',
            'office_en' => 'BhumiShield Marketplace Moderation Cell',
            'phone_dummy' => '01700-004004',
            'nid' => '9900004004',
            'is_active' => 1,
        ],
        [
            'username' => 'content_editor',
            'email' => 'editor.land@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'তানজিলা হক (কনটেন্ট এডিটর)',
            'full_name_en' => 'Tanjila Haque (Content Editor)',
            'role' => 'content_editor',
            'office_bn' => 'ভূমি প্রকাশনা ও জনসচেতনতা শাখা',
            'office_en' => 'Land Publication & Public Awareness Wing',
            'phone_dummy' => '01700-004005',
            'nid' => '9900004005',
            'is_active' => 1,
        ],
        [
            'username' => 'content_approver',
            'email' => 'approver.land@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'মো. আতিকুল ইসলাম (কনটেন্ট অ্যাপ্রুভার)',
            'full_name_en' => 'Md. Atiqul Islam (Content Approver)',
            'role' => 'content_approver',
            'office_bn' => 'ভূমি মন্ত্রণালয় জনসংযোগ উইং',
            'office_en' => 'Ministry of Land Public Relations Wing',
            'phone_dummy' => '01700-004006',
            'nid' => '9900004006',
            'is_active' => 1,
        ],
        [
            'username' => 'admin',
            'email' => 'auditor.admin@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'সিস্টেম অ্যাডমিন (ভূমি সুরক্ষা অ্যাডমিন)',
            'full_name_en' => 'System Admin (BhumiShield Admin)',
            'role' => 'admin',
            'office_bn' => 'কেন্দ্রীয় সিস্টেম গভর্ন্যান্স ও কনফিগারেশন সেল',
            'office_en' => 'Central System Governance & Configuration Cell',
            'phone_dummy' => '01700-005001',
            'nid' => '9900005001',
            'is_active' => 1,
        ],
        [
            'username' => 'lead_auditor',
            'email' => 'lead.auditor@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'মো. শামসুল হক (জাতীয় ক্রিপ্টোগ্রাফিক অডিটর)',
            'full_name_en' => 'Md. Shamsul Haque (National Cryptographic Auditor)',
            'role' => 'auditor',
            'office_bn' => 'জাতীয় ভূমি লেজার অডিট অধিদপ্তর',
            'office_en' => 'National Land Ledger Audit Directorate',
            'phone_dummy' => '01700-005002',
            'nid' => '9900005002',
            'is_active' => 1,
        ],
        [
            'username' => 'dc_la',
            'email' => 'dc.acquisition@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'মো. তারেক হাসান (এলএ কর্মকর্তা - অধিগ্রহণ)',
            'full_name_en' => 'Md. Tariq Hasan (DC Land Acquisition Officer)',
            'role' => 'dc_acquisition_officer',
            'office_bn' => 'জেলা প্রশাসকের কার্যালয় (ভূমি অধিগ্রহণ শাখা)',
            'office_en' => 'Office of Deputy Commissioner (LA Branch)',
            'phone_dummy' => '01700-005003',
            'nid' => '9900005003',
            'is_active' => 1,
        ],
        [
            'username' => 'lawyer',
            'email' => 'advocate.karim@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'এডভোকেট সিরাজুল করিম (দেওয়ানি আদালত প্রতিনিধি)',
            'full_name_en' => 'Advocate Sirajul Karim (Civil Court User)',
            'role' => 'lawyer_court_user',
            'office_bn' => 'ঢাকা জেলা ও দায়রা জজ আদালত বার',
            'office_en' => 'Dhaka District & Sessions Judge Court Bar',
            'phone_dummy' => '01700-005004',
            'nid' => '9900005004',
            'is_active' => 1,
        ],
    ];

    public const DEFAULT_SETTINGS = [
        [
            'setting_key' => 'portal_title_bn',
            'setting_value_json' => '"ভূমি সুরক্ষা (BhumiShield)"',
            'description_bn' => 'পোর্টালের প্রধান বাংলা শিরোনাম',
            'description_en' => 'Primary Bangla Portal Title',
        ],
        [
            'setting_key' => 'portal_title_en',
            'setting_value_json' => '"BhumiShield — National Land Trust Layer"',
            'description_bn' => 'পোর্টালের প্রধান ইংরেজি শিরোনাম',
            'description_en' => 'Primary English Portal Title',
        ],
        [
            'setting_key' => 'ministry_banner_bn',
            'setting_value_json' => '"আইন মন্ত্রণালয় (সাব-রেজিস্ট্রি) ও ভূমি মন্ত্রণালয় (এসি ল্যান্ড)-এর ডিজিটাল আন্তঃসংযোগ ট্রাস্ট লেয়ার"',
            'description_bn' => 'সরকারি আন্তঃসংযোগ ব্যানার টেক্সট',
            'description_en' => 'Inter-ministry bridge banner text',
        ],
        [
            'setting_key' => 'helpline_number',
            'setting_value_json' => '"১৬১২২ (ভূমি সেবা হটলাইন)"',
            'description_bn' => 'নাগরিক সহায়তা হটলাইন নম্বর',
            'description_en' => 'Citizen Helpline Number',
        ],
        [
            'setting_key' => 'rapid_resale_days',
            'setting_value_json' => '30',
            'description_bn' => 'দ্রুত হাতবদল (Rapid Resale) সতর্কতার সময়সীমা (দিন)',
            'description_en' => 'Rapid resale warning window (in days)',
        ],
        [
            'setting_key' => 'require_mock_nid_check',
            'setting_value_json' => 'true',
            'description_bn' => 'নিবন্ধন-পূর্বে এনআইডি যাচাই বাধ্যতামূলক রাখুন',
            'description_en' => 'Enforce Mock NID verification before deed registration',
        ],
        [
            'setting_key' => 'auto_queue_emutation',
            'setting_value_json' => 'true',
            'description_bn' => 'দলিল নিবন্ধনের সাথে সাথে স্বয়ংক্রিয় ই-নামজারি কেস তৈরি',
            'description_en' => 'Automatically create AC Land e-Mutation case on deed registration',
        ],
        [
            'setting_key' => 'public_qr_verification_enabled',
            'setting_value_json' => 'true',
            'description_bn' => 'লগইন ছাড়া নাগরিকদের জন্য পাবলিক QR যাচাই চালু',
            'description_en' => 'Allow public QR verification without login',
        ],
        [
            'setting_key' => 'office_hours_bn',
            'setting_value_json' => '"রবিবার – বৃহস্পতিবার, সকাল ৯:০০ – বিকাল ৫:০০"',
            'description_bn' => 'কার্যালয়ের সময়সূচি',
            'description_en' => 'Official Service Hours',
        ],
    ];

    public static function appendAuditEntry(
        string $actorUsername,
        string $actorRole,
        string $action,
        string $entityType,
        string $entityId,
        array $details,
        string $createdAt = '2026-10-16T09:00:00+06:00'
    ): int {
        $last = DB::selectOne('SELECT entry_hash, chain_index FROM audit_log ORDER BY chain_index DESC LIMIT 1');
        $prevHash = $last ? (string) $last['entry_hash'] : LedgerService::GENESIS_HASH;
        $nextIndex = $last ? ((int) $last['chain_index'] + 1) : 1;

        $entryHash = LedgerService::computeAuditHash(
            $actorUsername,
            $action,
            $entityType,
            $entityId,
            $details,
            $prevHash,
            $nextIndex
        );

        return DB::insert(
            'INSERT INTO audit_log (actor_username, actor_role, action, entity_type, entity_id, details_json, entry_hash, prev_hash, chain_index, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $actorUsername,
                $actorRole,
                $action,
                $entityType,
                $entityId,
                LedgerService::canonicalJson($details),
                $entryHash,
                $prevHash,
                $nextIndex,
                $createdAt,
            ]
        );
    }

    private static function appendDeed(
        array &$chainState,
        string $deedNo,
        string $deedType,
        int $sellerId,
        int $buyerId,
        int $plotId,
        string $shareFraction,
        float $areaDecimal,
        int $priceBdt,
        string $status,
        string $createdAt,
        string $registeredBy = 'registrar',
        ?float $tamperAfterSigningArea = null
    ): int {
        $chainIndex = (int) $chainState['next_deed_index'];
        $prevHash = (string) $chainState['last_deed_hash'];

        $contentObj = [
            'deed_no' => $deedNo,
            'deed_type' => $deedType,
            'seller_id' => $sellerId,
            'buyer_id' => $buyerId,
            'plot_id' => $plotId,
            'share_fraction' => $shareFraction,
            'area_decimal' => round($areaDecimal, 2),
            'price_bdt' => $priceBdt,
            'registered_by' => $registeredBy,
            'created_at' => $createdAt,
        ];
        $originalJson = LedgerService::canonicalJson($contentObj);
        $contentHash = LedgerService::computeDeedHash($contentObj, $prevHash, $chainIndex);
        $signature = LedgerService::signHash($contentHash);

        $storedJson = $originalJson;
        if ($tamperAfterSigningArea !== null) {
            $tamperedObj = $contentObj;
            $tamperedObj['area_decimal'] = round($tamperAfterSigningArea, 2);
            $storedJson = LedgerService::canonicalJson($tamperedObj);
        }

        $deedCode = sprintf('D-%s', strtoupper(substr(hash('sha256', $deedNo), 0, 6)));

        $deedId = DB::insert(
            'INSERT INTO deeds (deed_code, deed_no, deed_type, seller_id, buyer_id, plot_id, share_fraction, area_decimal, price_bdt, status, content_json, original_content_json, content_hash, prev_hash, signature, chain_index, registered_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $deedCode,
                $deedNo,
                $deedType,
                $sellerId,
                $buyerId,
                $plotId,
                $shareFraction,
                round($tamperAfterSigningArea ?? $areaDecimal, 2),
                $priceBdt,
                $status,
                $storedJson,
                $originalJson,
                $contentHash,
                $prevHash,
                $signature,
                $chainIndex,
                $registeredBy,
                $createdAt,
            ]
        );

        $chainState['next_deed_index'] = $chainIndex + 1;
        $chainState['last_deed_hash'] = $contentHash;
        return $deedId;
    }

    public function run(bool $reset = true): array
    {
        if (strtolower((string) env('APP_ENV', 'development')) === 'production') {
            throw new \RuntimeException('Synthetic demo seeding is disabled in production.');
        }
        $migration = new CreateBhumishieldTables();
        $migration->up($reset);

        if (!$reset) {
            $cnt = DB::selectOne('SELECT COUNT(*) AS c FROM plots');
            if ($cnt && ((int) $cnt['c']) >= 60) {
                return ['plots' => (int) $cnt['c']];
            }
        }

        // 1. Seed Spatie-Compatible RBAC Schema & Permissions
        RbacService::seedRbacTables();

        // 1b. Seed Users (All 18 roles + stubs with explicit role assignments)
        foreach (self::DEMO_USERS as $u) {
            $uId = DB::insert(
                'INSERT INTO users (username, email, full_name_bn, full_name_en, role, office_bn, office_en, phone_dummy, nid, is_active, is_identity_verified, token_version, password_hash, last_login_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?)',
                [
                    $u['username'],
                    $u['email'],
                    $u['full_name_bn'],
                    $u['full_name_en'],
                    $u['role'],
                    $u['office_bn'],
                    $u['office_en'],
                    $u['phone_dummy'],
                    $u['nid'],
                    $u['is_active'],
                    JwtAuthService::hashPassword($u['password']),
                    '2026-10-16T09:00:00+06:00',
                    '2026-01-01T09:00:00+06:00',
                ]
            );

            // Assign role in model_has_roles
            $roleRow = DB::selectOne('SELECT id FROM roles WHERE name = ?', [$u['role']]);
            if ($roleRow) {
                DB::insert(
                    'INSERT OR IGNORE INTO model_has_roles (role_id, model_type, model_id) VALUES (?, ?, ?)',
                    [$roleRow['id'], 'App\\Models\\User', $uId]
                );
            }
        }

        // 1c. Seed Site Settings
        foreach (self::DEFAULT_SETTINGS as $st) {
            DB::insert(
                "INSERT INTO site_settings (setting_key, setting_value_json, description_bn, description_en, updated_by, updated_at) VALUES (?, ?, ?, ?, 'admin', '2026-10-16T09:00:00+06:00')",
                [$st['setting_key'], $st['setting_value_json'], $st['description_bn'], $st['description_en']]
            );
        }

        // 2. Seed Locations (3 Mouzas)
        $mouzas = [
            ['division_bn' => 'ঢাকা', 'division_en' => 'Dhaka', 'district_bn' => 'ঢাকা', 'district_en' => 'Dhaka', 'upazila_bn' => 'সাভার', 'upazila_en' => 'Savar', 'mouza_bn' => 'বিরুলিয়া', 'mouza_en' => 'Birulia', 'jl_no' => '12', 'lat' => 23.8580, 'lng' => 90.3180],
            ['division_bn' => 'ঢাকা', 'division_en' => 'Dhaka', 'district_bn' => 'গাজীপুর', 'district_en' => 'Gazipur', 'upazila_bn' => 'গাজীপুর সদর', 'upazila_en' => 'Gazipur Sadar', 'mouza_bn' => 'বাসন', 'mouza_en' => 'Bason', 'jl_no' => '08', 'lat' => 23.9980, 'lng' => 90.4200],
            ['division_bn' => 'ঢাকা', 'division_en' => 'Dhaka', 'district_bn' => 'নারায়ণগঞ্জ', 'district_en' => 'Narayanganj', 'upazila_bn' => 'সোনারগাঁও', 'upazila_en' => 'Sonargaon', 'mouza_bn' => 'পানাম', 'mouza_en' => 'Panam', 'jl_no' => '15', 'lat' => 23.6450, 'lng' => 90.6010],
            ['division_bn' => 'চট্টগ্রাম', 'division_en' => 'Chattogram', 'district_bn' => 'কুমিল্লা', 'district_en' => 'Cumilla', 'upazila_bn' => 'দাউদকান্দি', 'upazila_en' => 'Daudkandi', 'mouza_bn' => 'সুন্দরপুর', 'mouza_en' => 'Sundarpur', 'jl_no' => '42', 'lat' => 23.5350, 'lng' => 90.7180],
        ];
        $locationIds = [];
        foreach ($mouzas as $m) {
            $locationIds[] = DB::insert(
                'INSERT INTO locations (division_bn, division_en, district_bn, district_en, upazila_bn, upazila_en, mouza_bn, mouza_en, jl_no, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [$m['division_bn'], $m['division_en'], $m['district_bn'], $m['district_en'], $m['upazila_bn'], $m['upazila_en'], $m['mouza_bn'], $m['mouza_en'], $m['jl_no'], $m['lat'], $m['lng']]
            );
        }

        // 3. Seed 42 Persons
        $firstNames = [
            ['মো. রফিকুল ইসলাম', 'Md. Rafiqul Islam', 'মৃত হাজী আবদুল জব্বার', 'Late Haji Abdul Jabbar', 'হালিমা খাতুন'],
            ['মোসা. রাবেয়া খাতুন', 'Mst. Rabeya Khatun', 'মো. শামসুল হক', 'Md. Shamsul Haque', 'আমেনা বেগম'],
            ['আবদুল করিম', 'Abdul Karim', 'মৃত কফিল উদ্দিন', 'Late Kafil Uddin', 'জোহরা বেগম'],
            ['মো. জাহাঙ্গীর আলম', 'Md. Jahangir Alam', 'মো. মোবারক আলী', 'Md. Mobarak Ali', 'রহিমা খাতুন'],
            ['মো. কামরুল হাসান', 'Md. Kamrul Hasan', 'মো. লুৎফর রহমান', 'Md. Lutfor Rahman', 'সালমা বেগম'],
            ['মো. আনোয়ার হোসেন', 'Md. Anwar Hossain', 'মৃত সিরাজুল ইসলাম', 'Late Sirajul Islam', 'নূরজাহান বেগম'],
            ['মো. দেলোয়ার হোসেন', 'Md. Delwar Hossain', 'মৃত সিরাজুল ইসলাম', 'Late Sirajul Islam', 'নূরজাহান বেগম'],
            ['ফাতেমা বেগম', 'Fatema Begum', 'মো. ফজলুল করিম', 'Md. Fazlul Karim', 'আনোয়ারা বেগম'],
            ['মো. সাইফুল ইসলাম', 'Md. Saiful Islam', 'মো. হাবিবুর রহমান', 'Md. Habibur Rahman', 'রোকেয়া বেগম'],
            ['মো. মনিরুজ্জামান', 'Md. Moniruzzaman', 'মৃত আবদুর রশিদ', 'Late Abdur Rashid', 'হাসিনা বানু'],
            ['মো. মাহবুবুর রহমান', 'Md. Mahbubur Rahman', 'মৃত আজিজুল হক', 'Late Azizul Haque', 'মর্জিনা বেগম'],
            ['সালমা আক্তার', 'Salma Akter', 'মো. নুরুল ইসলাম', 'Md. Nurul Islam', 'খাদিজা খাতুন'],
            ['মো. শহিদুল ইসলাম', 'Md. Shahidul Islam', 'মৃত ইসমাইল হোসেন', 'Late Ismail Hossain', 'সায়েরা খাতুন'],
            ['আলহাজ্ব নূরুল হক', 'Alhaj Nurul Haque', 'মৃত হাতেম আলী', 'Late Hatem Ali', 'রাবেয়া বানু'],
            ['মো. তারেক আজিজ', 'Md. Tariq Aziz', 'আলহাজ্ব নূরুল হক', 'Alhaj Nurul Haque', 'বিলকিস বেগম'],
            ['নাসরিন সুলতানা', 'Nasrin Sultana', 'মো. খলিলুর রহমান', 'Md. Khalilur Rahman', 'ফিরোজা বেগম'],
            ['মো. মিজানুর রহমান', 'Md. Mizanur Rahman', 'মৃত আবদুল মালেক', 'Late Abdul Malek', 'জাহানারা বেগম'],
            ['মো. হুমায়ুন কবির', 'Md. Humayun Kabir', 'মো. তোফাজ্জল হোসেন', 'Md. Tofazzal Hossain', 'মনোয়ারা বেগম'],
            ['শিরিন আক্তার', 'Shirin Akter', 'মো. গোলাম মোস্তফা', 'Md. Golam Mostafa', 'মমতাজ বেগম'],
            ['মো. জাকির হোসেন', 'Md. Zakir Hossain', 'মৃত আবুল কাশেম', 'Late Abul Kashem', 'রওশন আরা'],
            ['মো. গোলাম রব্বানী', 'Md. Golam Rabbani', 'মৃত সোলায়মান মিয়া', 'Late Solaiman Mia', 'আসমা খাতুন'],
            ['মোসা. রেহানা পারভীন', 'Mst. Rehana Parvin', 'মো. আমিনুল ইসলাম', 'Md. Aminul Islam', 'সুফিয়া খাতুন'],
            ['মো. শফিকুল আলম', 'Md. Shafiqul Alam', 'মৃত মতিউর রহমান', 'Late Matiur Rahman', 'কুলসুম বেগম'],
            ['মো. খোরশেদ আলম', 'Md. Khorshed Alam', 'মো. বজলুর রহমান', 'Md. Bazlur Rahman', 'লতিফা বেগম'],
            ['মো. আশরাফুল ইসলাম', 'Md. Ashraful Islam', 'মৃত ইউসুফ আলী', 'Late Yusuf Ali', 'মাহমুদা খাতুন'],
            ['রোকসানা ইয়াসমিন', 'Roksana Yasmin', 'মো. মোশাররফ হোসেন', 'Md. Mosharraf Hossain', 'নাজমা বেগম'],
            ['মো. আবুল বাশার', 'Md. Abul Bashar', 'মৃত জহির উদ্দিন', 'Late Zahir Uddin', 'ছকিনা খাতুন'],
            ['মো. সাইদুর রহমান', 'Md. Saidur Rahman', 'মো. আকবর আলী', 'Md. Akbar Ali', 'রিজিয়া বেগম'],
            ['মো. নাজমুল হুদা', 'Md. Nazmul Huda', 'মৃত সামছুল আলম', 'Late Samsul Alam', 'হোসনে আরা'],
            ['মোসা. শারমিন আক্তার', 'Mst. Sharmin Akter', 'মো. ওবায়দুল হক', 'Md. Obaidul Haque', 'নূরন্নাহার'],
            ['মো. ফারুক আহমেদ', 'Md. Faruque Ahmed', 'মৃত গিয়াস উদ্দিন', 'Late Gias Uddin', 'আয়েশা সিদ্দিকা'],
            ['মো. মোস্তাফিজুর রহমান', 'Md. Mostafizur Rahman', 'মো. সিদ্দিকুর রহমান', 'Md. Siddiqur Rahman', 'রুবিনা ইয়াসমিন'],
            ['মো. ইকবাল হোসেন', 'Md. Iqbal Hossain', 'মৃত শামসুদ্দিন আহমেদ', 'Late Shamsuddin Ahmed', 'তাহমিনা খাতুন'],
            ['মোসা. নাজমা খাতুন', 'Mst. Nazma Khatun', 'মো. আলাউদ্দিন মিয়া', 'Md. Alauddin Mia', 'জমিলা খাতুন'],
            ['মো. এনামুল হক', 'Md. Enamul Haque', 'মৃত মজিবুর রহমান', 'Late Mojibur Rahman', 'রাশিদা বেগম'],
            ['মো. হারুন অর রশিদ', 'Md. Harun Or Rashid', 'মো. জালাল উদ্দিন', 'Md. Jalal Uddin', 'ফরিদা ইয়াসমিন'],
            ['মো. কামাল উদ্দিন', 'Md. Kamal Uddin', 'মৃত নাজির আহমেদ', 'Late Nazir Ahmed', 'সেলিনা বেগম'],
            ['মোসা. তানজিলা আক্তার', 'Mst. Tanjila Akter', 'মো. রমিজ উদ্দিন', 'Md. Ramiz Uddin', 'শাহানাজ পারভীন'],
            ['মো. জসিম উদ্দিন', 'Md. Jasim Uddin', 'মৃত ফয়েজ আহমেদ', 'Late Foyez Ahmed', 'রহিমা বানু'],
            ['মো. বাবুল আক্তার', 'Md. Babul Akter', 'মো. নওয়াব আলী', 'Md. Nawab Ali', 'হাজেরা খাতুন'],
            ['মো. সোহেল রানা', 'Md. Sohel Rana', 'মো. রুহুল আমিন', 'Md. Ruhul Amin', 'মিলি আক্তার'],
            ['মোসা. পারভীন সুলতানা', 'Mst. Parvin Sultana', 'মো. আনিসুর রহমান', 'Md. Anisur Rahman', 'নূরজাহান'],
        ];

        $personIds = [];
        foreach ($firstNames as $i => [$nameBn, $nameEn, $fatherBn, $fatherEn, $motherBn]) {
            $idx = $i + 1;
            $nid = (string) (9900001000 + $idx);
            $phone = '01700-00' . (1000 + $idx);
            $isDeceased = ($idx === 14) ? 1 : 0;
            $heirsRecorded = ($idx === 14) ? 0 : 1;
            $m = $mouzas[$i % count($mouzas)];
            $addrBn = "গ্রাম: {$m['mouza_bn']}, উপজেলা: {$m['upazila_bn']}, জেলা: {$m['district_bn']}";
            $addrEn = "Village: {$m['mouza_en']}, Upazila: {$m['upazila_en']}, District: {$m['district_en']}";

            $personIds[] = DB::insert(
                'INSERT INTO persons (name_bn, name_en, father_name_bn, father_name_en, mother_name_bn, nid, phone_dummy, is_deceased, heirs_recorded, address_bn, address_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [$nameBn, $nameEn, $fatherBn, $fatherEn, $motherBn, $nid, $phone, $isDeceased, $heirsRecorded, $addrBn, $addrEn]
            );
        }

        // 4. Seed 60 Plots + 240 Khatian Records + Ownerships
        $landTypes = [
            ['ভিটা (আবাসিক)', 'Homestead (Vita)'],
            ['নাল (কৃষি)', 'Agricultural (Nal)'],
            ['চালা (উঁচু জমি)', 'Highland (Chala)'],
            ['বাগান', 'Orchard (Bagan)'],
        ];
        $specialAreas = [
            1 => 20.0,
            2 => 15.0,
            3 => 24.0,
            4 => 16.0,
            5 => 20.0,
            6 => 30.0,
            7 => 18.0,
            8 => 22.0,
            9 => 16.0,
            10 => 25.0,
        ];

        $plotIds = [];
        for ($pIdx = 1; $pIdx <= 60; $pIdx++) {
            $locIdx = intdiv($pIdx - 1, 20);
            $locId = $locationIds[$locIdx];
            $baseDag = 100 + (($pIdx - 1) % 20) + 1 + ($locIdx * 100);
            $dagStr = (string) $baseDag;
            $dagBn = FraudRulesEngine::toBnNum($dagStr);
            [$ltBn, $ltEn] = $landTypes[($pIdx - 1) % count($landTypes)];
            $area = $specialAreas[$pIdx] ?? (float) (12 + (($pIdx * 3) % 28));
            $plotCode = sprintf('PLT-DHK-SAV-%04d', $pIdx);

            $notesBn = 'অফিসিয়াল রেকর্ড — সিএস, এসএ, আরএস ও বিএস খতিয়ান যাচাইকৃত।';
            $notesEn = 'Official record — CS, SA, RS & BS khatian chain recorded.';
            if ($pIdx === 7) {
                $notesBn = 'সতর্কতা: আরএস খতিয়ানে ১৮ শতাংশ কিন্তু বিএস খতিয়ানে ২৬ শতাংশ রেকর্ডকৃত (অমিল)।';
                $notesEn = 'Warning: RS khatian records 18 decimals but BS khatian records 26 decimals (mismatch).';
            } elseif ($pIdx === 8) {
                $notesBn = 'সতর্কতা: সর্বশেষ বিএস খতিয়ানের মালিক মৃত; ওয়ারিশ সনদ ও নামজারি অমীমাংসিত।';
                $notesEn = 'Warning: Recorded BS owner is deceased; succession & mutation unresolved.';
            }

            $plotId = DB::insert(
                'INSERT INTO plots (plot_code, location_id, dag_no, dag_no_bn, land_type_bn, land_type_en, total_area_decimal, notes_bn, notes_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [$plotCode, $locId, $dagStr, $dagBn, $ltBn, $ltEn, $area, $notesBn, $notesEn]
            );
            $plotIds[] = $plotId;

            $surveys = [
                ['CS', 1915, 1000 + $pIdx, null, $area, 'VALID'],
                ['SA', 1960, 2000 + $pIdx, (string) (1000 + $pIdx), $area, 'VALID'],
                ['RS', 1982, 3000 + $pIdx, (string) (2000 + $pIdx), $area, 'VALID'],
                [
                    'BS',
                    2016,
                    4100 + $pIdx,
                    (string) (3000 + $pIdx),
                    ($pIdx === 7) ? 26.0 : $area,
                    ($pIdx === 7) ? 'CHAIN_BREAK' : (($pIdx === 8) ? 'UNRESOLVED_HEIRS' : 'VALID'),
                ],
            ];

            $khatianIds = [];
            foreach ($surveys as [$sType, $sYear, $kNo, $parentK, $kArea, $kStatus]) {
                $remBn = 'স্বাভাবিক ধারাবাহিক রেকর্ড';
                $remEn = 'Consistent survey chain record';
                if ($pIdx === 7 && $sType === 'BS') {
                    $remBn = 'আরএস খতিয়ানের (১৮.০০ শতাংশ) সাথে বিএস খতিয়ানের (২৬.০০ শতাংশ) জমির পরিমাণে ৮.০০ শতাংশ অমিল।';
                    $remEn = 'Area mismatch of 8.00 decimals between RS (18.00) and BS (26.00) khatian without backing deed.';
                } elseif ($pIdx === 8 && $sType === 'BS') {
                    $remBn = 'রেকর্ডীয় মালিক আলহাজ্ব নূরুল হক মৃত; ওয়ারিশগণের নামজারি সম্পন্ন হয়নি।';
                    $remEn = 'Recorded owner Alhaj Nurul Haque is deceased; heirs mutation pending.';
                }

                $khatianIds[$sType] = DB::insert(
                    'INSERT INTO khatian_records (plot_id, survey_type, khatian_no, khatian_no_bn, recorded_area_decimal, survey_year, parent_khatian_no, status, remarks_bn, remarks_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [$plotId, $sType, (string) $kNo, FraudRulesEngine::toBnNum($kNo), $kArea, $sYear, $parentK, $kStatus, $remBn, $remEn]
                );
            }

            // M3 Guard: Initial ownership seed executed with seeder authorization
            OwnershipGuard::withSeederAuthorization(function () use ($khatianIds, $plotId, $personIds, $pIdx, $area) {
                $hist1 = $personIds[($pIdx + 15) % count($personIds)];
                $hist2 = $personIds[($pIdx + 20) % count($personIds)];
                foreach ([['CS', $hist1], ['SA', $hist1], ['RS', $hist2]] as [$st, $oId]) {
                    DB::insert(
                        "INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, '1/1', 1.0, ?, 0)",
                        [$khatianIds[$st], $plotId, $oId, $area]
                    );
                }

                $bsKid = $khatianIds['BS'];
                if ($pIdx === 1) {
                    DB::insert("INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, '1/1', 1.0, 20.0, 1)", [$bsKid, $plotId, $personIds[0]]);
                } elseif ($pIdx === 2) {
                    DB::insert("INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, '1/1', 1.0, 15.0, 1)", [$bsKid, $plotId, $personIds[2]]);
                } elseif ($pIdx === 3) {
                    DB::insert("INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, '1/2', 0.5, 12.0, 1)", [$bsKid, $plotId, $personIds[5]]);
                    DB::insert("INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, '1/2', 0.5, 12.0, 1)", [$bsKid, $plotId, $personIds[6]]);
                } elseif ($pIdx === 4) {
                    DB::insert("INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, '1/1', 1.0, 16.0, 1)", [$bsKid, $plotId, $personIds[7]]);
                } elseif ($pIdx === 5) {
                    DB::insert("INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, '1/1', 1.0, 20.0, 1)", [$bsKid, $plotId, $personIds[9]]);
                } elseif ($pIdx === 6) {
                    DB::insert("INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, '1/1', 1.0, 30.0, 1)", [$bsKid, $plotId, $personIds[10]]);
                } elseif ($pIdx === 7) {
                    DB::insert("INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, '1/1', 1.0, 26.0, 1)", [$bsKid, $plotId, $personIds[12]]);
                } elseif ($pIdx === 8) {
                    DB::insert("INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, '1/1', 1.0, 22.0, 1)", [$bsKid, $plotId, $personIds[13]]);
                } elseif ($pIdx === 9) {
                    DB::insert("INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, '1/1', 1.0, 16.0, 1)", [$bsKid, $plotId, $personIds[15]]);
                } else {
                    $ownerId = ($pIdx === 13) ? $personIds[0] : $personIds[($pIdx + 3) % count($personIds)];
                    DB::insert(
                        "INSERT INTO ownerships (khatian_id, plot_id, person_id, share_fraction, share_float, area_decimal, is_latest) VALUES (?, ?, ?, '1/1', 1.0, ?, 1)",
                        [$bsKid, $plotId, $ownerId, $area]
                    );
                }
            });
        }

        // 5. Seed 80 Deeds in a Cryptographic Hash Chain
        $chainState = ['next_deed_index' => 1, 'last_deed_hash' => LedgerService::GENESIS_HASH];

        $deed1Id = self::appendDeed($chainState, 'DL-2026-1001', 'SALE', $personIds[16], $personIds[0], $plotIds[0], '1/1', 20.0, 3000000, 'MUTATED', '2024-03-15T11:20:00+06:00');
        $deed2Id = self::appendDeed($chainState, 'DL-2026-1002', 'SALE', $personIds[2], $personIds[3], $plotIds[1], '1/1', 15.0, 2400000, 'PENDING_MUTATION', '2026-10-02T14:10:00+06:00');
        self::appendDeed($chainState, 'DL-2023-1003', 'INHERITANCE', $personIds[17], $personIds[5], $plotIds[2], '1/2', 12.0, 0, 'MUTATED', '2023-06-11T10:00:00+06:00');
        self::appendDeed($chainState, 'DL-2022-1004', 'SALE', $personIds[8], $personIds[7], $plotIds[3], '1/1', 16.0, 2100000, 'MUTATED', '2022-09-20T12:30:00+06:00');
        $deed5Id = self::appendDeed($chainState, 'DL-2026-1005', 'SALE', $personIds[9], $personIds[11], $plotIds[4], '1/2', 10.0, 1800000, 'REGISTERED', '2026-09-28T15:45:00+06:00', 'registrar', 25.0);
        $deed6Id = self::appendDeed($chainState, 'DL-2026-1006', 'MORTGAGE', $personIds[10], $personIds[18], $plotIds[5], '1/1', 30.0, 2500000, 'REGISTERED', '2026-08-12T11:00:00+06:00');
        self::appendDeed($chainState, 'DL-2026-1007', 'SALE', $personIds[19], $personIds[15], $plotIds[8], '1/1', 16.0, 2800000, 'MUTATED', '2026-10-12T16:00:00+06:00');

        $deedTypes = ['SALE', 'SALE', 'HIBA', 'SALE', 'INHERITANCE'];
        for ($dIdx = 8; $dIdx <= 80; $dIdx++) {
            $pTarget = $plotIds[($dIdx + 2) % count($plotIds)];
            $sPerson = $personIds[($dIdx * 3) % count($personIds)];
            $bPerson = $personIds[($dIdx * 3 + 5) % count($personIds)];
            $dtype = $deedTypes[$dIdx % count($deedTypes)];
            $year = 2018 + ($dIdx % 8);
            $month = sprintf('%02d', 1 + ($dIdx % 12));
            $day = sprintf('%02d', 1 + ($dIdx % 27));
            self::appendDeed(
                $chainState,
                'DL-' . $year . '-' . (1000 + $dIdx),
                $dtype,
                $sPerson,
                $bPerson,
                $pTarget,
                ($dIdx % 2 === 0) ? '1/2' : '1/1',
                ($dIdx % 2 === 0) ? 8.0 : 14.0,
                1200000 + ($dIdx * 25000),
                ($dIdx < 76) ? 'MUTATED' : 'PENDING_MUTATION',
                "{$year}-{$month}-{$day}T11:15:00+06:00"
            );
        }

        // 6. Seed Mortgages
        DB::insert(
            "INSERT INTO mortgages_liens (plot_id, borrower_id, bank_name_bn, bank_name_en, branch_bn, amount_bdt, area_mortgaged_decimal, status, created_at) VALUES (?, ?, 'সোনালী ব্যাংক পিএলসি', 'Sonali Bank PLC', 'সাভার শাখা, ঢাকা', 2500000, 30.0, 'ACTIVE', '2026-08-12T11:30:00+06:00')",
            [$plotIds[5], $personIds[10]]
        );
        DB::insert(
            "INSERT INTO mortgages_liens (plot_id, borrower_id, bank_name_bn, bank_name_en, branch_bn, amount_bdt, area_mortgaged_decimal, status, created_at) VALUES (?, ?, 'বাংলাদেশ কৃষি ব্যাংক', 'Bangladesh Krishi Bank', 'গাজীপুর সদর শাখা', 1500000, 16.0, 'ACTIVE', '2026-07-05T10:15:00+06:00')",
            [$plotIds[14], $personIds[18]]
        );
        $lien3Id = DB::insert(
            "INSERT INTO mortgages_liens (plot_id, borrower_id, bank_name_bn, bank_name_en, branch_bn, amount_bdt, area_mortgaged_decimal, status, created_at, released_at) VALUES (?, ?, 'অগ্রণী ব্যাংক পিএলসি', 'Agrani Bank PLC', 'সাভার শাখা', 800000, 20.0, 'RELEASED', '2024-05-10T10:00:00+06:00', '2025-11-20T15:00:00+06:00')",
            [$plotIds[0], $personIds[0]]
        );

        // Seed 1 NOC Certificate for released lien
        $nocPayload = [
            'noc_no' => 'NOC-2026-8801',
            'bank' => 'Agrani Bank PLC',
            'branch' => 'Savar Branch',
            'borrower_nid' => '9900001001',
            'dag_no' => '101',
            'amount_bdt' => 800000,
            'released_at' => '2025-11-20T15:00:00+06:00',
        ];
        $nocHash = hash('sha256', LedgerService::canonicalJson($nocPayload));
        $nocSig = LedgerService::signHash($nocHash);
        DB::insert(
            'INSERT INTO noc_certificates (lien_id, noc_no, bank_name_bn, bank_name_en, branch_bn, borrower_name_bn, borrower_name_en, borrower_nid, mouza_bn, mouza_en, dag_no, dag_no_bn, amount_bdt, status, released_at, noc_hash, ed25519_signature, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$lien3Id, 'NOC-2026-8801', 'অগ্রণী ব্যাংক পিএলসি', 'Agrani Bank PLC', 'সাভার শাখা', 'মো. রফিকুল ইসলাম', 'Md. Rafiqul Islam', '9900001001', 'বিরুলিয়া', 'Birulia', '101', '১০১', 800000, 'RELEASED', '2025-11-20T15:00:00+06:00', $nocHash, $nocSig, '2025-11-20T15:05:00+06:00']
        );

        // 7. Seed Mutations
        $mut1Id = DB::insert(
            "INSERT INTO mutations (mutation_code, case_no, deed_id, plot_id, seller_id, buyer_id, area_decimal, status, decision_reason_bn, decision_reason_en, created_at) VALUES ('MUT-2026-000501', 'MUT-2026-501', ?, ?, ?, ?, 15.0, 'PENDING', 'সাব-রেজিস্ট্রি অফিস হতে প্রাপ্ত দলিল নং DL-2026-1002 নামজারির অপেক্ষায়।', 'Awaiting AC Land mutation decision for registered deed DL-2026-1002.', '2026-10-03T09:30:00+06:00')",
            [$deed2Id, $plotIds[1], $personIds[2], $personIds[3]]
        );
        $mut2Id = DB::insert(
            "INSERT INTO mutations (mutation_code, case_no, deed_id, plot_id, seller_id, buyer_id, area_decimal, status, decision_reason_bn, decision_reason_en, created_at) VALUES ('MUT-2026-000502', 'MUT-2026-502', ?, ?, ?, ?, 25.0, 'PENDING', 'সতর্কতা: দলিল নং DL-2026-1005-এ হ্যাশ অমিল (তথ্য পরিবর্তনের ঝুঁকি) সনাক্ত হয়েছে।', 'ALERT: Hash mismatch detected on Deed DL-2026-1005.', '2026-09-29T10:15:00+06:00')",
            [$deed5Id, $plotIds[4], $personIds[9], $personIds[11]]
        );
        $mut3Id = DB::insert(
            "INSERT INTO mutations (mutation_code, case_no, deed_id, plot_id, seller_id, buyer_id, area_decimal, status, decision_reason_bn, decision_reason_en, decided_by, decided_at, created_at) VALUES ('MUT-2024-000101', 'MUT-2024-101', ?, ?, ?, ?, 20.0, 'APPROVED', 'মালিকানা চেইন ও দলিলের ডিজিটাল স্বাক্ষর সঠিক থাকায় নামজারি অনুমোদিত।', 'Ownership chain and digital signature verified; mutation approved.', 'acland', '2024-04-02T14:00:00+06:00', '2024-03-16T10:00:00+06:00')",
            [$deed1Id, $plotIds[0], $personIds[16], $personIds[0]]
        );


        // 9. Initial Audit Log Chain
        self::appendAuditEntry('admin', 'admin', 'LEDGER_GENESIS_SEED', 'ledger', 'GENESIS', [
            'note_bn' => 'ভূমি সুরক্ষা লারাভেল লেজার ও ৬০টি দাগের খতিয়ান চেইন ইনিশিয়ালাইজড',
            'note_en' => 'BhumiShield Laravel ledger initialized with 60 plots and 80 signed deeds',
        ], '2026-01-01T09:05:00+06:00');
        self::appendAuditEntry('registrar', 'sub_registrar', 'DEED_REGISTERED', 'deed', (string) $deed2Id, [
            'deed_no' => 'DL-2026-1002',
            'plot_dag' => '102',
            'area_decimal' => 15.0,
            'note_bn' => 'দলিল নিবন্ধিত ও ই-নামজারির জন্য এসি ল্যান্ড অফিসে প্রেরিত',
        ], '2026-10-02T14:12:00+06:00');
        self::appendAuditEntry('bank', 'bank_officer', 'MORTGAGE_LIEN_CREATED', 'plot', (string) $plotIds[5], [
            'bank' => 'Sonali Bank PLC',
            'amount_bdt' => 2500000,
            'note_bn' => 'দাগ নং ১০৬-এ সোনালী ব্যাংকের ২৫ লক্ষ টাকার বন্ধক এন্ট্রি',
        ], '2026-08-12T11:32:00+06:00');

        // 10. Seed Offices & Jurisdictions (Section 6)
        self::seedOfficesAndJurisdictions();

        // 11. Seed Document Templates & Plot Documents (Section 8.1)
        self::seedDocumentTemplatesAndVault($plotIds);

        // 12. Seed SLA Policies & Sample Tickets (Section 8.2)
        self::seedSlaPoliciesAndTickets($plotIds);

        // 13. Seed 13-Step Transfer State Machines (Section 5)
        self::seedTransferWorkflows($plotIds, $personIds, $deed1Id, $deed2Id, $deed5Id, $mut1Id, $mut2Id, $mut3Id);

        // 14. Seed Canonical Service Catalogue & Fee Registry
        self::seedServiceCatalogue();
        self::seedServiceFeesRegistry();

        // 15. Seed Notices and Blog Articles (Section 8.5 & 8.6)
        self::seedNoticesAndBlog();

        // 16. Seed Land Sale Marketplace Listings & Geometries (Sections 8.3 & 8.4)
        self::seedListingsAndGeometries($plotIds);

        // 17. Seed Maker-Checker Onboarding Batches & Appeals (Tier C Sections 8.7 & 8.8)
        self::seedOnboardingAndAppeals($plotIds, $mut1Id);

        // 18. Seed F08 Field Inspection Reports & SLA Dispatches
        self::seedFieldOperations($plotIds);

        return [
            'users' => count(self::DEMO_USERS),
            'mouzas' => count($locationIds),
            'persons' => count($personIds),
            'plots' => count($plotIds),
            'khatian_records' => count($plotIds) * 4,
            'deeds' => $chainState['next_deed_index'] - 1,
        ];
    }

    public static function seedOfficesAndJurisdictions(): void
    {
        $now = gmdate('c');
        $offices = [
            ['OFF-REG-SAVAR', 'সাব-রেজিস্ট্রি অফিস, সাভার', 'Sub-Registry Office, Savar', 'registry', 'ঢাকা', 'Dhaka', 'ঢাকা', 'Dhaka', 'সাভার', 'Savar', '["12"]', 23.8583, 90.2667, 'সাভার বাজার রোড, সাভার, ঢাকা', 'Savar Bazar Road, Savar, Dhaka', '০২-৭৭৯০২২১'],
            ['OFF-REG-GAZIPUR', 'সাব-রেজিস্ট্রি অফিস, গাজীপুর সদর', 'Sub-Registry Office, Gazipur Sadar', 'registry', 'ঢাকা', 'Dhaka', 'গাজীপুর', 'Gazipur', 'গাজীপুর সদর', 'Gazipur Sadar', '["08"]', 23.9999, 90.4203, 'রাজবাড়ি রোড, গাজীপুর', 'Rajbari Road, Gazipur', '০২-৯২৬১২২২'],
            ['OFF-ACL-SAVAR', 'উপজেলা ভূমি অফিস, সাভার', 'Upazila Land Office, Savar', 'ac_land', 'ঢাকা', 'Dhaka', 'ঢাকা', 'Dhaka', 'সাভার', 'Savar', '["12"]', 23.8560, 90.2610, 'উপজেলা পরিষদ চত্বর, সাভার', 'Upazila Parishad Complex, Savar', '০২-৭৭৯০২৩৪'],
            ['OFF-SPO-BIRULIA', 'বিরুলিয়া ইউনিয়ন ডিজিটাল সেন্টার (ইউডিসি)', 'Birulia Union Digital Center (UDC)', 'service_point', 'ঢাকা', 'Dhaka', 'ঢাকা', 'Dhaka', 'সাভার', 'Savar', '["12"]', 23.8750, 90.3120, 'ইউনিয়ন পরিষদ ভবন, বিরুলিয়া', 'Union Parishad Bhaban, Birulia', '০১৭০০-০০১০৩৩'],
            ['OFF-BNK-SONALI', 'সোনালী ব্যাংক পিএলসি, সাভার শাখা', 'Sonali Bank PLC, Savar Branch', 'bank_branch', 'ঢাকা', 'Dhaka', 'ঢাকা', 'Dhaka', 'সাভার', 'Savar', '["12"]', 23.8590, 90.2640, 'বাসস্ট্যান্ড, সাভার', 'Bus Stand, Savar', '০২-৭৭৯০১১২'],
            ['OFF-SET-DHAKA', 'জোনাল সেটেলমেন্ট অফিস, ঢাকা', 'Zonal Settlement Office, Dhaka', 'settlement', 'ঢাকা', 'Dhaka', 'ঢাকা', 'Dhaka', 'তেজগাঁও', 'Tejgaon', '["12", "08", "15"]', 23.7580, 90.3910, 'ভূমি রেকর্ড ভবন, তেজগাঁও, ঢাকা', 'Bhumi Record Bhaban, Tejgaon, Dhaka', '০২-৮১৭০১৯২'],
            ['OFF-ADM-CENTRAL', 'কেন্দ্রীয় ভূমি সুরক্ষা গভর্ন্যান্স সেল', 'Central BhumiShield Governance Cell', 'admin_cell', 'ঢাকা', 'Dhaka', 'ঢাকা', 'Dhaka', 'শাহবাগ', 'Shahbag', '["all"]', 23.7380, 90.3960, 'ভূমি ভবন, ৭ম তলা, ঢাকা', 'Bhumi Bhaban, 7th Floor, Dhaka', '১৬১২২'],
            ['OFF-REG-DAUDKANDI', 'সাব-রেজিস্ট্রি অফিস, দাউদকান্দি, কুমিল্লা', 'Sub-Registry Office, Daudkandi, Cumilla', 'registry', 'চট্টগ্রাম', 'Chattogram', 'কুমিল্লা', 'Cumilla', 'দাউদকান্দি', 'Daudkandi', '["সুন্দরপুর", "দৌলতপুর", "ইলিয়টগঞ্জ", "গৌরীপুর"]', 23.5350, 90.7180, 'উপজেলা পরিষদ চত্বর, দাউদকান্দি, কুমিল্লা', 'Upazila Parishad Complex, Daudkandi, Cumilla', '01711-223344'],
            ['OFF-ACL-DAUDKANDI', 'উপজেলা ভূমি অফিস (এসি ল্যান্ড), দাউদকান্দি, কুমিল্লা', 'Upazila Land Office (AC Land), Daudkandi, Cumilla', 'ac_land', 'চট্টগ্রাম', 'Chattogram', 'কুমিল্লা', 'Cumilla', 'দাউদকান্দি', 'Daudkandi', '["সুন্দরপুর", "দৌলতপুর", "ইলিয়টগঞ্জ", "গৌরীপুর", "দাউদকান্দি পৌরসভা"]', 23.5340, 90.7170, 'দাউদকান্দি উপজেলা পরিষদ রোড, দাউদকান্দি, কুমিল্লা', 'Daudkandi Upazila Parishad Road, Daudkandi, Cumilla', '01711-334455'],
            ['OFF-SET-CUMILLA', 'জোনাল সেটেলমেন্ট অফিস, কুমিল্লা', 'Zonal Settlement Office, Cumilla', 'settlement', 'চট্টগ্রাম', 'Chattogram', 'কুমিল্লা', 'Cumilla', 'কুমিল্লা আদর্শ সদর', 'Cumilla Adarsha Sadar', '["দাউদকান্দি", "সুন্দরপুর", "দেবীদ্বার", "চান্দিনা", "সদর দক্ষিণ"]', 23.4607, 91.1809, 'ফৌজদারি মোড়, সেটেলমেন্ট ভবন, কুমিল্লা', 'Foujdari Mor, Settlement Bhaban, Cumilla', '081-65432'],
            ['OFF-SPO-DAUDKANDI', 'দাউদকান্দি পৌর ডিজিটাল সেন্টার (ইউডিসি)', 'Daudkandi Pourashava Digital Center (UDC)', 'service_point', 'চট্টগ্রাম', 'Chattogram', 'কুমিল্লা', 'Cumilla', 'দাউদকান্দি', 'Daudkandi', '["সুন্দরপুর", "দাউদকান্দি পৌরসভা"]', 23.5360, 90.7200, 'পৌরসভা ভবন, দাউদকান্দি, কুমিল্লা', 'Pourashava Bhaban, Daudkandi, Cumilla', '01811-556677'],
            ['OFF-DC-CUMILLA', 'জেলা প্রশাসকের কার্যালয় (এল.এ শাখা), কুমিল্লা', 'Office of the Deputy Commissioner (LA Branch), Cumilla', 'admin_cell', 'চট্টগ্রাম', 'Chattogram', 'কুমিল্লা', 'Cumilla', 'কুমিল্লা আদর্শ সদর', 'Cumilla Adarsha Sadar', '["all"]', 23.4682, 91.1788, 'কালেক্টরেট ভবন, কুমিল্লা', 'Collectorate Building, Cumilla', '081-68901'],
        ];

        foreach ($offices as $o) {
            DB::insert(
                'INSERT INTO offices (office_code, name_bn, name_en, office_type, division_bn, division_en, district_bn, district_en, upazila_bn, upazila_en, mouzas_served_json, latitude, longitude, address_bn, address_en, contact_phone, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)',
                [...$o, $now, $now]
            );
        }

        // Map primary demo officers to offices
        $officerMappings = [
            ['registrar', 'OFF-REG-SAVAR', 'sub_registrar'],
            ['registrar_gazipur', 'OFF-REG-GAZIPUR', 'sub_registrar'],
            ['rdo_savar', 'OFF-REG-SAVAR', 'registry_data_officer'],
            ['acland', 'OFF-ACL-SAVAR', 'ac_land'],
            ['loa_savar', 'OFF-ACL-SAVAR', 'land_office_assistant'],
            ['fvo_savar', 'OFF-ACL-SAVAR', 'field_verification_officer'],
            ['spo_birulia', 'OFF-SPO-BIRULIA', 'service_point_operator'],
            ['bank', 'OFF-BNK-SONALI', 'bank_officer'],
            ['bank_manager', 'OFF-BNK-SONALI', 'bank_manager'],
            ['sro_dhaka', 'OFF-SET-DHAKA', 'settlement_records_officer'],
            ['aso_dhaka', 'OFF-SET-DHAKA', 'settlement_checker'],
        ];

        foreach ($officerMappings as [$uName, $offCode, $rName]) {
            $u = DB::selectOne('SELECT id FROM users WHERE username = ?', [$uName]);
            $off = DB::selectOne('SELECT id FROM offices WHERE office_code = ?', [$offCode]);
            if ($u && $off) {
                DB::insert(
                    'INSERT INTO office_user (office_id, user_id, role_name, jurisdiction_scope_json, is_primary, assigned_at) VALUES (?, ?, ?, ?, 1, ?)',
                    [$off['id'], $u['id'], $rName, '{"upazila": "সাভার"}', $now]
                );
            }
        }
    }

    public static function seedDocumentTemplatesAndVault(array $plotIds): void
    {
        $templates = [
            ['SALE', 'BS_KHATIAN', 'সর্বশেষ বিএস খতিয়ান (পর্চা)', 'Latest BS Khatian (Porcha)', 1, 'ac_land', 1],
            ['SALE', 'REGISTERED_DEED', 'মূল নিবন্ধিত বিক্রয় দলিল', 'Original Registered Sale Deed', 1, 'sub_registrar', 2],
            ['SALE', 'BAYA_DEED', 'বায়া দলিল ধারাবাহিক চেইন', 'Baya Deed Chain', 1, 'sub_registrar', 3],
            ['SALE', 'LD_TAX_RECEIPT', 'হালনাগাদ ভূমি উন্নয়ন কর (দাখিলা)', 'Current Land Development Tax Receipt', 1, 'union_land', 4],
            ['SALE', 'MOUZA_MAP', 'মৌজা নকশা (ম্যাপ শিট)', 'Mouza Map Sheet', 1, 'settlement', 5],
            ['SALE', 'LIEN_NOC', 'ব্যাংক ঋণ বা বন্ধক অবমুক্তি সনদ (এনওসি)', 'Bank Mortgage Clearance Certificate (NOC)', 0, 'bank', 6],
            ['INHERITANCE', 'BS_KHATIAN', 'সর্বশেষ বিএস খতিয়ান', 'Latest BS Khatian', 1, 'ac_land', 1],
            ['INHERITANCE', 'HEIR_CERTIFICATE', 'স্থানীয় সরকার ওয়ারিশান সনদপত্র', 'Local Govt Succession / Heir Certificate', 1, 'union_land', 2],
            ['INHERITANCE', 'CHAIN_KHATIAN', 'সিএস/এসএ/আরএস পূর্ববর্তী জরিপ খতিয়ান', 'CS/SA/RS Chain Khatians', 1, 'settlement', 3],
            ['INHERITANCE', 'LD_TAX_RECEIPT', 'হালনাগাদ দাখিলা', 'Current Tax Receipt', 1, 'union_land', 4],
        ];

        foreach ($templates as $t) {
            DB::insert(
                'INSERT INTO document_templates (acquisition_type, document_type, title_bn, title_en, is_mandatory, responsible_office_type, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
                $t
            );
        }

        // Seed Documents for Dag 101 (Clean Sale: all L3 Official present)
        $now = gmdate('c');
        $docsPlot1 = [
            ['BS_KHATIAN', 'সর্বশেষ বিএস খতিয়ান (পর্চা নং ৪১০১)', 'BS Khatian #4101', 'L3', 'OFFICIAL', '/documents/khatian_4101.pdf', 'khatian_4101.pdf', 345000, hash('sha256', 'khatian_4101'), '9900001001', 'acland', $now],
            ['REGISTERED_DEED', 'মূল নিবন্ধিত বিক্রয় দলিল (দলিল নং DL-2026-1001)', 'Registered Deed DL-2026-1001', 'L3', 'OFFICIAL', '/documents/deed_1001.pdf', 'deed_1001.pdf', 812000, hash('sha256', 'deed_1001'), '9900001001', 'registrar', $now],
            ['LD_TAX_RECEIPT', 'ভূমি উন্নয়ন কর দাখিলা (১৪৩১ বঙ্গাব্দ)', 'LD Tax Receipt (1431 BS)', 'L3', 'OFFICIAL', '/documents/tax_receipt_1431.pdf', 'tax_receipt_1431.pdf', 128000, hash('sha256', 'tax_receipt_1431'), '9900001001', 'fvo_savar', $now],
            ['MOUZA_MAP', 'বিরুলিয়া মৌজা নকশা শিট নং ১২', 'Birulia Mouza Map Sheet #12', 'L2', 'VERIFIED', '/documents/mouza_sheet_12.pdf', 'mouza_sheet_12.pdf', 1450000, hash('sha256', 'mouza_sheet_12'), '9900001001', 'aso_dhaka', $now],
            ['LIEN_NOC', 'অগ্রণী ব্যাংক ঋণ অবমুক্তি সনদ (NOC-2026-8801)', 'Agrani Bank Lien NOC-2026-8801', 'L3', 'OFFICIAL', '/documents/noc_8801.pdf', 'noc_8801.pdf', 256000, hash('sha256', 'noc_8801'), '9900001001', 'bank_manager', $now],
        ];

        foreach ($docsPlot1 as $doc) {
            DB::insert(
                'INSERT INTO plot_documents (plot_id, document_type, title_bn, title_en, trust_level, status, file_path, file_name, file_size_bytes, file_hash, uploaded_by_nid, verified_by, verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [$plotIds[0], ...$doc, $now, $now]
            );
        }

        // Seed Documents for Dag 108 (Inheritance case: Missing Heir Certificate L0)
        $docsPlot8 = [
            ['BS_KHATIAN', 'সর্বশেষ বিএস খতিয়ান (পর্চা নং ৪১০৮)', 'BS Khatian #4108', 'L3', 'OFFICIAL', '/documents/khatian_4108.pdf', 'khatian_4108.pdf', 312000, hash('sha256', 'khatian_4108'), '9900001014', 'acland', $now],
            ['HEIR_CERTIFICATE', 'স্থানীয় সরকার ওয়ারিশান সনদপত্র', 'Local Govt Succession / Heir Certificate', 'L0', 'MISSING', null, null, null, null, '9900001014', null, null],
            ['LD_TAX_RECEIPT', 'ভূমি উন্নয়ন কর দাখিলা (বকেয়া সতর্কবার্তা)', 'LD Tax Receipt (Overdue)', 'L1', 'PENDING_VERIFICATION', '/documents/tax_receipt_draft.pdf', 'tax_receipt_draft.pdf', 115000, hash('sha256', 'tax_draft'), '9900001014', null, null],
        ];

        foreach ($docsPlot8 as $doc) {
            DB::insert(
                'INSERT INTO plot_documents (plot_id, document_type, title_bn, title_en, trust_level, status, file_path, file_name, file_size_bytes, file_hash, uploaded_by_nid, verified_by, verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [$plotIds[7], ...$doc, $now, $now]
            );
        }
    }

    public static function seedSlaPoliciesAndTickets(array $plotIds): void
    {
        $policies = [
            ['MISSING_DOCUMENT', 'অনুপস্থিত কাগজপত্রের সহায়তা', 'Missing Document Assistance', 2, 15, 5, 10, 15],
            ['RECORD_MISMATCH', 'খতিয়ান বা রেকর্ডের অমিল সংশোধন', 'Record Mismatch / Correction', 2, 20, 5, 12, 20],
            ['MUTATION_DELAY', 'নামজারি শুনানির বিলম্ব', 'Mutation Delay Redress', 1, 10, 3, 7, 10],
            ['BIOMETRIC_FAILURE', 'কাউন্টার বায়োমেট্রিক সমস্যা', 'Biometric Verification Failure', 1, 3, 1, 2, 3],
            ['FRAUD_REPORT', 'বেনামি বা ভুয়া জমি বিক্রয় অভিযোগ', 'Suspected Land Fraud Report', 1, 7, 2, 5, 7],
            ['NID_ISSUE', 'এনআইডি ও নামজারি প্রোফাইল মিল', 'NID Verification Assistance', 1, 5, 2, 4, 5],
            ['LISTING_COMPLAINT', 'বিক্রয় বিজ্ঞাপনের অসঙ্গতি', 'Sale Listing Complaint', 1, 7, 2, 5, 7],
            ['GENERAL', 'সাধারণ নাগরিক তথ্য ও হেল্পলাইন', 'General Citizen Inquiry', 2, 15, 5, 10, 15],
        ];

        foreach ($policies as $pol) {
            DB::insert(
                'INSERT INTO sla_policies (category, title_bn, title_en, first_reply_target_days, resolution_target_days, escalation_level_1_days, escalation_level_2_days, escalation_level_3_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                $pol
            );
        }

        // Seed 2 initial tickets
        $now = gmdate('c');
        $t1Id = DB::insert(
            "INSERT INTO tickets (ticket_code, category, plot_id, document_type, title_bn, title_en, description_bn, complainant_nid, complainant_name_bn, complainant_phone, is_anonymous, priority, status, assigned_office_id, current_escalation_level, created_at, updated_at) VALUES ('TKT-2026-000045', 'MISSING_DOCUMENT', ?, 'HEIR_CERTIFICATE', 'দাগ নং ১০৮-এর জন্য প্রয়োজনীয় ওয়ারিশান সনদ অনুপস্থিত', 'Missing Heir Certificate for Plot #108', 'রেকর্ডীয় মালিক আলহাজ্ব নূরুল হক মৃত হওয়ায় বণ্টননামা ও ওয়ারিশ সনদ দাখিলের নির্দেশিকা প্রয়োজন।', '9900001014', 'মো. তারেক আজিজ', '01700-001014', 0, 'HIGH', 'IN_PROGRESS', 3, 1, ?, ?)",
            [$plotIds[7], $now, $now]
        );

        DB::insert(
            "INSERT INTO ticket_messages (ticket_id, sender_username, sender_role, is_internal_note, message_bn, message_en, created_at) VALUES (?, 'acland', 'ac_land', 0, 'আপনার আবেদনটি এসি ল্যান্ড সাভার ডেস্কে প্রক্রিয়াধীন। ইউপি চেয়ারম্যান কর্তৃক স্বাক্ষরিত মূল ওয়ারিশ সনদ আপলোড করুন।', 'Application under review at Savar AC Land desk. Please upload succession certificate.', ?)",
            [$t1Id, $now]
        );
    }

    public static function seedTransferWorkflows(
        array $plotIds,
        array $personIds,
        int $deed1Id,
        int $deed2Id,
        int $deed5Id,
        int $mut1Id,
        int $mut2Id,
        int $mut3Id
    ): void {
        $now = gmdate('c');

        // Transfer 1: Completed Clean Sale (Dag 101, Step 12 -> 13)
        $t1Id = DB::insert(
            "INSERT INTO transfer_requests (transfer_code, plot_id, current_step, public_stage, transfer_area_decimal, proposed_price_bdt, deed_type, service_point_id, home_office_id, status, deed_id, mutation_id, created_by_nid, created_at, updated_at) VALUES ('TR-2026-000101', ?, 12, 'DONE', 20.0, 3000000, 'SALE', 4, 3, 'APPROVED', ?, ?, '9900001017', '2024-03-01T10:00:00+06:00', ?)",
            [$plotIds[0], $deed1Id, $mut3Id, $now]
        );

        // Transfer 2: Registered Deed pending AC Land mutation decision (Dag 102, Step 8)
        $t2Id = DB::insert(
            "INSERT INTO transfer_requests (transfer_code, plot_id, current_step, public_stage, transfer_area_decimal, proposed_price_bdt, deed_type, service_point_id, home_office_id, status, deed_id, mutation_id, created_by_nid, created_at, updated_at) VALUES ('TR-2026-000102', ?, 8, 'REVIEW', 15.0, 2400000, 'SALE', 4, 3, 'REGISTERED', ?, ?, '9900001003', '2026-10-01T11:00:00+06:00', ?)",
            [$plotIds[1], $deed2Id, $mut1Id, $now]
        );

        // Transfer 3: Active draft transfer (Dag 101, Step 1 Intent)
        $t3Id = DB::insert(
            "INSERT INTO transfer_requests (transfer_code, plot_id, current_step, public_stage, transfer_area_decimal, proposed_price_bdt, deed_type, service_point_id, home_office_id, status, created_by_nid, created_at, updated_at) VALUES ('TR-2026-000103', ?, 1, 'START', 10.0, 1500000, 'SALE', 4, 3, 'DRAFT', '9900001001', ?, ?)",
            [$plotIds[0], $now, $now]
        );

        // Seed Biometric verification records (Result only, no template stored!)
        DB::insert(
            "INSERT INTO biometric_verifications (transaction_id, transfer_id, party_nid, party_role, modality, match_status, match_score, terminal_id, officer_id, liveness_nonce, verified_at, notes_bn) VALUES ('BIO-TR101-SEL', ?, '9900001017', 'SELLER', 'DUAL', 'MATCH', 0.98, 'TERM-SR-SAVAR-01', 'registrar', 'NONCE-88F92A', '2024-03-15T11:10:00+06:00', 'কাউন্টার ক্যামেরা ও ফিঙ্গারপ্রিন্ট সফলভাবে মিলেছে।')",
            [$t1Id]
        );
        DB::insert(
            "INSERT INTO biometric_verifications (transaction_id, transfer_id, party_nid, party_role, modality, match_status, match_score, terminal_id, officer_id, liveness_nonce, verified_at, notes_bn) VALUES ('BIO-TR101-BUY', ?, '9900001001', 'BUYER', 'DUAL', 'MATCH', 0.99, 'TERM-SR-SAVAR-01', 'registrar', 'NONCE-88F92B', '2024-03-15T11:15:00+06:00', 'ক্রেতার বায়োমেট্রিক সম্মতি সম্পন্ন।')",
            [$t1Id]
        );
    }

    public static function seedNoticesAndBlog(): void
    {
        $now = gmdate('c');

        // Seed 3 Blog Categories
        DB::insert("INSERT INTO blog_categories (slug, name_bn, name_en) VALUES ('land-literacy', 'ভূমি সাক্ষরতা ও অধিকার', 'Land Literacy & Rights')");
        DB::insert("INSERT INTO blog_categories (slug, name_bn, name_en) VALUES ('fraud-alerts', 'প্রতারণা সতর্কতা ও আইনি সুরক্ষা', 'Fraud Alerts & Protection')");
        DB::insert("INSERT INTO blog_categories (slug, name_bn, name_en) VALUES ('statutory-rules', 'আইন, বিধি ও পরিপত্র', 'Statutory Rules & Circulars')");

        // Seed 5 Blog Posts (F23: each body is now ≥2 paragraphs)
        $posts = [
            [
                'how-to-verify-land-before-buying',
                'land-literacy',
                'জমি ক্রয়ের পূর্বে ৪টি মৌলিক বিষয় যেভাবে যাচাই করবেন',
                '4 Crucial Land Checks Every Buyer Must Perform in Bangladesh',
                'জমি ক্রয়ের ক্ষেত্রে সিএস, এসএ, আরএস এবং বিএস খতিয়ানের ধারাবাহিক চেইন মেলানো অত্যন্ত জরুরি। বিএস খতিয়ানে বিক্রেতার নাম ও অংশের পরিমাণ সঠিক আছে কি না তা ভূমি মন্ত্রণালয়ের ই-পর্চা পোর্টালে যাচাই করতে হবে। এছাড়া কোনো তফসিলি ব্যাংকে জমিটি বন্ধক আছে কি না তা ডিজিটাল এনওসি ব্যবস্থার মাধ্যমে নিশ্চিত হোন। ভূয়া ওয়ারিশ সনদ কিংবা বিক্রিয় লকের অস্তিত্ব ভূমি সুরক্ষা পোর্টালে এক ক্লিকেই যাচাই করা যায়।' . "\n\n" . 'চূড়ান্তভাবে দলিল নিবন্ধনের পূর্বে অফিসে বসে ক্রেতা ও বিক্রেতা উভয়ের জাতীয় পরিচয়পত্রের ফিঙ্গারপ্রিন্ট ও জীবন-সাক্ষীর উপস্থিতি বাধ্যতামূলক। রেজিস্ট্রার অফিসের সহকারী কমিশনার (ল্যান্ড) কর্তৃক পরিদর্শন প্রতিবেদন এবং ভূমি উন্নয়ন কর পরিশোধের সর্বশেষ রসিদ ক্রেতাকে দেখে নেওয়া উচিত। এই চারটি স্তরের যেকোনো একটিতে গরমিল পাওয়া গেলে ক্রয় প্রক্রিয়া স্থগিত রাখুন এবং সংশ্লিষ্ট ইউনিয়ন ভূমি সহকারী কর্মকর্তার সাথে পরামর্শ করুন।',
                'Checking the historical khatian chain from CS to BS survey is the primary defence against property fraud. Always verify the recorded owner shares on the latest BS khatian and check for active bank mortgages through the digital NOC endpoint.' . "\n\n" . 'Before finalising the deed registration, both buyer and seller must appear in person with valid National ID cards and two witnesses. The Assistant Commissioner (Land) inspection report and the most recent land development tax receipt are equally essential — request both and cross-check the seller\'s declared share against the official record. If any of these layers reveal a discrepancy, halt the transaction and consult the local Union Land Assistant Officer before proceeding.',
                'মো. তানভীর আহমেদ (এসি ল্যান্ড)',
                'Md. Tanvir Ahmed (AC Land)',
                6,
            ],
            [
                'double-sale-prevention-with-ed25519',
                'fraud-alerts',
                'দলিল নিবন্ধনের পর তথ্য গোপনে পরিবর্তন রোধে ক্রিপ্টোগ্রাফিক সুরক্ষা',
                'Preventing Post-Registration Deed Tampering with Ed25519 Signatures',
                'ভূমি সুরক্ষায় প্রতিটি নিবন্ধিত দলিলের সম্পূর্ণ তথ্যের ডিজিটাল ফিঙ্গারপ্রিন্ট (SHA-256) এবং নিবন্ধন অধিদপ্তরের অনুমোদিত অফিসারের Ed25519 ডিজিটাল স্বাক্ষর যুক্ত করা হয়। ডাটাবেজে জমির পরিমাণ বা ব্যক্তির নাম পরিবর্তন করার চেষ্টা করলে সাথে সাথে লেজার হ্যাশ চেইনে লাল সতর্কবার্তা প্রদর্শিত হয়।' . "\n\n" . 'ক্রেতা মোবাইল অ্যাপে QR কোড স্ক্যান করে দলিলের বিশুদ্ধতা যাচাই করতে পারেন; SHA-256 হ্যাশ ভিন্ন হলে "ঝুঁকিপূর্ণ — তথ্য পরিবর্তিত" ব্যাজ প্রদর্শিত হয় এবং আইনি পুনর্মূল্যায়ন শুরু হয়। এই কৌশলটি ডিজিটাল দলিল জালিয়াতি ও কাগজপত্র-ভিত্তিক পুরাতন কেলেঙ্কারি দুটোকেই প্রতিহত করে।',
                'BhumiShield secures deed records using deterministic SHA-256 hash chaining and Ed25519 digital signatures. Any subsequent alteration in storage immediately breaks cryptographic verification, raising a red flag in the public verifier.' . "\n\n" . 'Buyers can scan a QR code on the printed deed to confirm purity against the published hash; a mismatch triggers a "High Risk — Content Tampered" badge and an automatic legal re-review. This single mechanism defeats both digital record tampering and the older paper-based frauds that have plagued Bangladeshi land markets for decades.',
                'ফারহানা ইয়াসমিন (সাব-রেজিস্ট্রার)',
                'Farhana Yasmin (Sub-Registrar)',
                5,
            ],
            [
                'inheritance-faraiz-and-heir-mutation-guide',
                'land-literacy',
                'ওয়ারিশি জমির সুষম ফারায়েজ ও নামজারি সম্পন্ন করার নিয়মাবলী',
                'Step-by-Step Guide to Muslim Inheritance and Heir Mutation in Bangladesh',
                'মূল মালিকের মৃত্যুর পর সকল জীবিত ওয়ারিশের জাতীয় পরিচয়পত্র ও সিটি কর্পোরেশন/ইউনিয়ন পরিষদের ওয়ারিশি সনদ সংগ্রহ করতে হবে। মুসলিম ফারায়েজ আইন অনুযায়ী সহ-শরিকদের হিস্যা নির্ধারণ ব্যতিরেকে এককভাবে কোনো ওয়ারিশ জমি হস্তান্তর করতে পারেন না। ভূমি সুরক্ষায় সহ-শরিকদের ডিজিটাল সম্মতি ছাড়া নামজারি আবেদন প্রক্রিয়াকরণ নিষিদ্ধ।' . "\n\n" . 'নামজারি আবেদনপত্রের সাথে মৃত ব্যক্তির মৃত্যু সনদ, ব্যাংক পাসবুক/সঞ্চয়পত্র, এবং পূর্ববর্তী দলিলের সত্যায়িত কপি দাখিল করতে হয়। ইউনিয়ন ভূমি সহকারী কর্মকর্তা মাঠ পরিদর্শন শেষে এসি ল্যান্ডের কাছে প্রেরণ করেন; এসি ল্যান্ড ২৮ কর্মদিবসের মধ্যে চূড়ান্ত আদেশ জারি করবেন। কোনো সহ-শরিক আপত্তি করলে শুনানীর পর সিদ্ধান্ত গৃহীত হয়।',
                'A comprehensive legal guide on obtaining heir certificates, calculating Muslim Faraiz shares, and registering inheritance mutations with unanimous co-owner digital consent.' . "\n\n" . 'Submit the deceased\'s death certificate, bank passbook / savings certificate, and a certified copy of the prior deed alongside the mutation application. The Union Land Assistant Officer conducts a field inspection before forwarding the file to the AC Land, who must issue a final order within 28 working days. Any co-heir objection triggers a formal hearing before the mutation is recorded.',
                'মোসা. রাবেয়া খাতুন (আইনি পরামর্শক)',
                'Mst. Rabeya Khatun (Legal Advisor)',
                7,
            ],
            [
                'bank-mortgage-lien-and-digital-noc',
                'statutory-rules',
                'ব্যাংক ঋণ পরিশোধের পর ডিজিটাল অনাপত্তিপত্র (NOC) প্রাপ্তির সহজ ধাপ',
                'Securing Bank Lien Releases and Digital NOCs for Mortgaged Land',
                'জমির ওপর ব্যাংক বা আর্থিক প্রতিষ্ঠানের সক্রিয় বন্ধকী লিয়েন থাকলে তা সাব-রেজিস্ট্রি অফিসে দলিল নিবন্ধনে স্বয়ংক্রিয়ভাবে ব্লক হয়। ঋণ পরিশোধ সম্পন্ন হলে সংশ্লিষ্ট ব্যাংকের ঋণ কর্মকর্তা ডিজিটাল প্ল্যাটফর্মে লিয়েন অবমুক্ত করেন এবং ক্রিপ্টোগ্রাফিক কিউআর সম্বলিত অনাপত্তিপত্র জারি করেন।' . "\n\n" . 'গ্রাহক ডিজিটাল NOC হারানো গেলে ভূমি সুরক্ষা অ্যাপ থেকে এক ক্লিকে পুনঃমুদ্রণ করতে পারেন। লিয়েন মুক্তির ৭২ ঘণ্টার মধ্যে ব্যাংকের কেন্দ্রীয় সার্ভার থেকে স্বয়ংক্রিয় ভেরিফিকেশন কোড সাব-রেজিস্ট্রিকে পাঠানো হয়, যা ভূয়া NOC তৈরির সম্ভাবনা সম্পূর্ণরূপে বন্ধ করে দিয়েছে।',
                'How commercial banks create, verify, and release land mortgage liens digitally, eliminating physical NOC forgery.' . "\n\n" . 'If a customer loses the digital NOC, the BhumiShield app can re-print it with a single click. Within 72 hours of lien release, the bank\'s central server pushes an automatic verification code to the sub-registry, fully closing the loophole that allowed counterfeit NOC papers to circulate in physical markets.',
                'সাদিয়া চৌধুরী (সিনিয়র প্রিন্সিপাল অফিসার, সোনালী ব্যাংক)',
                'Sadia Chowdhury (Senior Principal Officer, Sonali Bank)',
                5,
            ],
            [
                'understanding-cs-sa-rs-bs-khatian-chain',
                'land-literacy',
                'সিএস থেকে বিএস খতিয়ানের ধারাবাহিক চেইন ও খতিয়ান পরিচিতি',
                'Understanding the Survey Lineage: CS, SA, RS, and BS Khatians Explained',
                '১৮৮৮ সালের ক্যাডাস্ট্রাল সার্ভে (CS), ১৯৫০ সালের স্টেট অ্যাকুইজিশন সার্ভে (SA), ১৯৬২ সালের রিভিশনাল সার্ভে (RS) এবং চলমান বাংলাদেশ সার্ভে (BS)। প্রতিটি জরিপের খতিয়ানে জমির দাগ নম্বর ও শ্রেণী পরিবর্তনের ইতিহাস সংরক্ষিত থাকে। কোনো স্তরে জমির পরিমাণ বৃদ্ধি অস্বাভাবিক হলে তা ভূমি দখল বা ভুল রেকর্ডের নির্দেশক।' . "\n\n" . 'বাংলাদেশ সার্ভে (BS) এর সর্বশেষ আপডেট মূলত নগর ও পৌর এলাকায় সম্পন্ন হয়েছে; গ্রামীণ এলাকায় বেশিরভাগ জমি এখনও RS খতিয়ানের ওপর নির্ভরশীল। যেকোনো ক্রেতাকে কমপক্ষে ৩০ বছরের পিছনের খতিয়ান ইতিহাস যাচাই করার পরামর্শ দেওয়া হয়।',
                'A detailed walkthrough of historical land surveys in Bengal from 1888 to modern city surveys, and how to spot chain breaks.' . "\n\n" . 'The latest BS survey has been completed primarily in urban and municipal areas; rural parcels still rely on the older RS khatian as their authoritative record. We strongly recommend that any buyer review at least 30 years of historical khatian lineage before completing a purchase — chain breaks in this window are the most common source of post-purchase disputes.',
                'মো. দেলোয়ার হোসেন (সেটেলমেন্ট রেকর্ডস অফিসার)',
                'Md. Delwar Hossain (Settlement Records Officer)',
                8,
            ],
        ];

        foreach ($posts as $p) {
            DB::insert(
                'INSERT INTO blog_posts (post_slug, category_slug, title_bn, title_en, body_bn, body_en, author_name_bn, author_name_en, reading_time_minutes, status, published_at, helpful_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)',
                [...$p, 'PUBLISHED', $now, $now]
            );
        }

        // Seed 5 Official Notices with QR attachments
        $notices = [
            [
                'notice-mutation-timeline-circular-2026',
                'CIRCULAR_POLICY',
                'NATIONAL',
                'অনলাইন ই-নামজারি নিষ্পত্তির সর্বোচ্চ সময়সীমা ২৮ কর্মদিবস নির্ধারণ প্রসঙ্গে',
                'Circular on 28-Day Maximum Timeline for Online e-Mutation Processing',
                'ভূমি মন্ত্রণালয়ের সর্বশেষ পরিপত্র অনুযায়ী নাগরিক হয়রানি রোধে নামজারি আবেদনের শুনানী ও অনুমোদন ২৮ কর্মদিবসের মধ্যে সম্পন্ন করা বাধ্যতামূলক। ব্যত্যয় ঘটলে সিস্টেম স্বয়ংক্রিয়ভাবে ইউএনও ও এডিসি (রাজস্ব) ড্যাশবোর্ডে এসকেলেশন প্রেরণ করবে।',
                'Ministry circular establishing a strict 28-working-day target for e-mutation case resolution.',
                1,
                1,
            ],
            [
                'notice-savar-registry-counter-biometric',
                'OFFICE_NOTICE',
                'UPAZILA',
                'সাভার সাব-রেজিস্ট্রি অফিসে কাউন্টার বায়োমেট্রিক উপস্থিতি বাধ্যতামূলক',
                'Mandatory Counter Biometric Presence at Savar Sub-Registry Office',
                'জাল দাতা ও ভুয়া জাতীয় পরিচয়পত্র শনাক্তকরণে সাভার সাব-রেজিস্ট্রি অফিসে দলিল নিবন্ধনের সময় উভয় পক্ষের বায়োমেট্রিক ফিঙ্গারপ্রিন্ট ও লাইভনেস উপস্থিতি নিশ্চিত করার নির্দেশ দেওয়া যাচ্ছে।',
                'Mandatory in-person counter biometric verification for deed registration parties at Savar Sub-Registry.',
                1,
                0,
            ],
            [
                'notice-inheritance-mutation-hearing-schedule',
                'PUBLIC_HEARING',
                'UPAZILA',
                'বিরুলিয়া মৌজার ওয়ারিশি নামজারি বিশেষ শুনানী ও মাঠ যাচাই ক্যাম্প',
                'Special Field Hearing & Heir Mutation Verification Camp in Birulia Mouza',
                'বিরুলিয়া মৌজার আওতাধীন সকল ওয়ারিশি জমির নামজারি নিষ্পত্তির জন্য আগামী ২০ অক্টোবর সকাল ১০টায় ইউনিয়ন ভূমি অফিসে সহকারী কমিশনার (ভূমি) এর উপস্থিতিতে গণশুনানী অনুষ্ঠিত হবে।',
                'Public notice on upcoming field hearing and mutation camp in Birulia Union Land Office.',
                0,
                0,
            ],
            [
                'notice-bank-noc-mandatory-clearance-gazette',
                'GAZETTE',
                'NATIONAL',
                'বন্ধকী জমির হস্তান্তরে তফসিলি ব্যাংকের ডিজিটাল এনওসি বাধ্যতামূলক সংক্রান্ত গেজেট',
                'Official Gazette on Mandatory Digital NOC for Mortgaged Property Transactions',
                'বাংলাদেশ ব্যাংক ও ভূমি মন্ত্রণালয়ের যৌথ নির্দেশনামতে কোনো তফসিলি ব্যাংকের লিয়েন বিদ্যমান থাকলে ব্যাংক কর্মকর্তা কর্তৃক সিস্টেম-অনুমোদিত কিউআর কোডযুক্ত এনওসি ব্যতীত সাব-রেজিস্ট্রার কর্তৃক দলিল রেজিস্ট্রি নিষিদ্ধ ঘোষণা করা হলো।',
                'Official gazette notification prohibiting property registration without system-verified bank digital NOC.',
                0,
                0,
            ],
            [
                'notice-fake-power-of-attorney-warning',
                'FRAUD_WARNING',
                'NATIONAL',
                'ভুয়া আমমোক্তারনামা (পাওয়ার অব অ্যাটর্নি) প্রস্তুতকারী চক্রের বিরুদ্ধে জনসচেতনতা',
                'Public Warning Against Forged Power of Attorney Syndicates',
                'বিদেশে অবস্থানরত প্রবাসীদের জমি জাল আমমোক্তারনামা দিয়ে বিক্রয়ের অপচেষ্টা প্রতিহত করতে দূতাবাস ও সাব-রেজিস্ট্রি অফিসের অনলাইন ক্রস-ভেরিফিকেশন সক্রিয় করা হয়েছে। কোনো অস্বচ্ছ আমমোক্তারনামা দৃষ্টিগোচর হলে অবিলম্বে অভিযোগ দাখিল করুন।',
                'Alert for citizens and expatriates regarding verification safeguards against unauthorized power of attorney documents.',
                0,
                1,
            ],
        ];

        foreach ($notices as $n) {
            $nId = DB::insert(
                'INSERT INTO notices (notice_slug, category, scope, title_bn, title_en, body_bn, body_en, is_pinned, is_urgent, status, published_by, published_at, view_count, download_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)',
                [...$n, 'PUBLISHED', 'admin', $now, $now, $now]
            );

            // Add verified attachment
            $qrPayload = "https://bhumishield.gov.bd/bn/notices/{$n[0]}";
            DB::insert(
                'INSERT INTO notice_attachments (notice_id, file_name, file_path, file_type, file_size_bytes, content_hash, qr_payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [$nId, "official_gazette_{$n[0]}.pdf", "/notices/{$n[0]}.pdf", 'application/pdf', 524000, hash('sha256', $n[0]), $qrPayload, $now]
            );
        }
    }

    public static function seedListingsAndGeometries(array $plotIds): void
    {
        $now = gmdate('c');
        $expiresAt = gmdate('c', time() + (90 * 86400));

        // Seed 4 verified active listings:
        $listings = [
            [
                'listing_code' => 'LST-2026-000101',
                'plot_id' => $plotIds[0], // Dag 101
                'seller_nid' => '9900001001',
                'asking_price_bdt' => 2400000,
                'area_decimal' => 10.0,
                'description_bn' => 'সাভারের বিরুলিয়া মৌজায় প্রধান সড়ক সংলগ্ন নিষ্কণ্টক ভিটা জমি। সম্পূর্ণ কাগজ ও বিএস নামজারি হালনাগাদ। বসতবাড়ি নির্মাণের উপযোগী।',
                'description_en' => 'Prime residential high-land in Birulia mouza, Savar. Clear title chain, up-to-date BS mutation, suitable for residential building.',
                'verification_badge' => 'VERIFIED_CLEAR',
            ],
            [
                'listing_code' => 'LST-2026-000102',
                'plot_id' => $plotIds[8] ?? 9, // Dag 109
                'seller_nid' => '9900001009',
                'asking_price_bdt' => 3200000,
                'area_decimal' => 12.0,
                'description_bn' => 'বিরুলিয়ায় শান্ত প্রাকৃতিক পরিবেশে নিষ্কণ্টক আবাসিক প্লট। গ্যাস ও বিদ্যুৎ সংযোগের সুব্যবস্থা বিদ্যমান। ওয়ারিশ ও বন্ধকমুক্ত।',
                'description_en' => 'Scenic residential plot in Birulia with utility access. Fully clear of mortgage liens or inheritance disputes.',
                'verification_badge' => 'VERIFIED_CLEAR',
            ],
            [
                'listing_code' => 'LST-2026-000103',
                'plot_id' => $plotIds[9] ?? 10, // Dag 110
                'seller_nid' => '9900001010',
                'asking_price_bdt' => 1850000,
                'area_decimal' => 8.5,
                'description_bn' => 'বিরুলিয়া মৌজার বাগান/ভিটা জমি। সীমানা চিহ্নিত ও সুরক্ষিত। নির্ভরযোগ্য বিনিয়োগের জন্য আদর্শ।',
                'description_en' => 'Demarcated garden and high-land in Birulia mouza. Ideal for long-term secure investment.',
                'verification_badge' => 'VERIFIED_CLEAR',
            ],
            [
                'listing_code' => 'LST-2026-000104',
                'plot_id' => $plotIds[20] ?? 21, // Gazipur Plot
                'seller_nid' => '9900001021',
                'asking_price_bdt' => 4500000,
                'area_decimal' => 15.0,
                'description_bn' => 'গাজীপুর সদর বাসন মৌজায় পাকা রাস্তার পাশে বাণিজ্যিক ও শিল্প উপযোগী উন্নত জমি। মালিকানা সম্পূর্ণ যাচাইকৃত।',
                'description_en' => 'Commercial frontage land near Gazipur Sadar (Bason mouza). Verified single ownership, ready for immediate transfer.',
                'verification_badge' => 'VERIFIED_CLEAR',
            ],
        ];

        foreach ($listings as $l) {
            DB::insert(
                'INSERT INTO listings (listing_code, plot_id, seller_nid, asking_price_bdt, area_decimal, description_bn, description_en, status, verification_badge, co_owner_consent_confirmed, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $l['listing_code'],
                    $l['plot_id'],
                    $l['seller_nid'],
                    $l['asking_price_bdt'],
                    $l['area_decimal'],
                    $l['description_bn'],
                    $l['description_en'],
                    'ACTIVE',
                    $l['verification_badge'],
                    1,
                    $expiresAt,
                    $now,
                    $now,
                ]
            );
        }

        // Seed sample plot geometries for the first 20 plots (Savar Birulia cluster around lat 23.858, lng 90.318)
        $baseLat = 23.8580;
        $baseLng = 90.3180;
        for ($i = 0; $i < min(20, count($plotIds)); $i++) {
            $pId = $plotIds[$i];
            $row = (int) ($i / 4);
            $col = $i % 4;
            $cLat = $baseLat + ($row * 0.0012) - 0.0024;
            $cLng = $baseLng + ($col * 0.0014) - 0.0028;
            $dLat = 0.0005;
            $dLng = 0.0006;

            $polygon = [
                [round($cLng - $dLng, 6), round($cLat - $dLat, 6)],
                [round($cLng + $dLng, 6), round($cLat - $dLat, 6)],
                [round($cLng + $dLng, 6), round($cLat + $dLat, 6)],
                [round($cLng - $dLng, 6), round($cLat + $dLat, 6)],
                [round($cLng - $dLng, 6), round($cLat - $dLat, 6)],
            ];

            DB::insert(
                'INSERT INTO plot_geometries (plot_id, mouza_jl, dag_no, geojson_polygon, center_lat, center_lng, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                    $pId,
                    '12',
                    (string) (101 + $i),
                    json_encode($polygon),
                    round($cLat, 6),
                    round($cLng, 6),
                    $now,
                ]
            );
        }
    }

    public static function seedOnboardingAndAppeals(array $plotIds, int $sampleMutationId): void
    {
        $now = gmdate('c');

        // 1. Seed Onboarding Batches
        $maker = DB::selectOne("SELECT id, username FROM users WHERE username = 'rdo_savar'");
        $checker = DB::selectOne("SELECT id, username FROM users WHERE username = 'registrar'");

        $makerId = (int) ($maker['id'] ?? 6);
        $checkerId = (int) ($checker['id'] ?? 4);

        // Batch 1: SUBMITTED (2 draft deeds pending Sub-Registrar review)
        $batch1Hash = hash('sha256', 'ONB-2026-0001|DEED_DRAFT|SUBMITTED');
        $b1Id = DB::insert(
            'INSERT INTO onboarding_batches (batch_no, record_type, maker_user_id, status, proof_package_json, batch_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                'ONB-2026-0001',
                'DEED_DRAFT',
                $makerId,
                'SUBMITTED',
                json_encode(['batch_title_bn' => 'সাভার সাব-রেজিস্ট্রি নতুন সাফ-কবলা দলিল ড্রাফট ব্যাচ #১']),
                $batch1Hash,
                $now,
            ]
        );

        $item1Payload = [
            'deed_type' => 'SALE',
            'dag_no' => '115',
            'mouza' => 'Birulia',
            'seller_name' => 'আবুল কাশেম',
            'buyer_name' => 'মো. ফখরুল ইসলাম',
            'area_decimal' => 10.5,
            'declared_value_bdt' => 2100000,
        ];
        $item2Payload = [
            'deed_type' => 'HEBA',
            'dag_no' => '116',
            'mouza' => 'Birulia',
            'donor_name' => 'মোসা. হালিমা বেগম',
            'donee_name' => 'মো. তারেক রহমান',
            'area_decimal' => 8.0,
            'declared_value_bdt' => 1600000,
        ];

        DB::insert(
            'INSERT INTO onboarding_items (batch_id, item_payload_json, validation_status, created_at) VALUES (?, ?, ?, ?)',
            [$b1Id, json_encode($item1Payload, JSON_UNESCAPED_UNICODE), 'VALID', $now]
        );
        DB::insert(
            'INSERT INTO onboarding_items (batch_id, item_payload_json, validation_status, created_at) VALUES (?, ?, ?, ?)',
            [$b1Id, json_encode($item2Payload, JSON_UNESCAPED_UNICODE), 'VALID', $now]
        );

        // Batch 2: APPROVED (Earlier reconciled batch)
        $batch2Hash = hash('sha256', 'ONB-2026-0002|KHATIAN_RECONCILIATION|APPROVED');
        $b2Id = DB::insert(
            'INSERT INTO onboarding_batches (batch_no, record_type, maker_user_id, checker_user_id, status, proof_package_json, batch_hash, created_at, decided_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                'ONB-2026-0002',
                'KHATIAN_RECONCILIATION',
                $makerId,
                $checkerId,
                'APPROVED',
                json_encode(['batch_title_bn' => 'বিরুলিয়া মৌজা খতিয়ান সমন্বয় ব্যাচ #২']),
                $batch2Hash,
                $now,
                $now,
            ]
        );

        DB::insert(
            'INSERT INTO onboarding_items (batch_id, item_payload_json, validation_status, created_at) VALUES (?, ?, ?, ?)',
            [$b2Id, json_encode(['khatian_no' => 'BS-5021', 'dag_no' => '112', 'status' => 'RECONCILED'], JSON_UNESCAPED_UNICODE), 'VALID', $now]
        );

        // 2. Seed Appeals
        DB::insert(
            'INSERT INTO appeals (appeal_code, mutation_id, plot_id, appellant_nid, appellant_name_bn, reason_bn, status, reviewer_username, decision_note_bn, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                'APL-2026-0001',
                $sampleMutationId,
                $plotIds[7] ?? 8, // Dag 108 (Inheritance Unresolved plot)
                '9900001002',
                'মোসা. রাবেয়া খাতুন',
                'সহকারী কমিশনার (ভূমি) কর্তৃক নামজারি স্থগিতাদেশের বিরুদ্ধে অতিরিক্ত জেলা প্রশাসক (রাজস্ব) বরাবর রিভিউ আপিল। ওয়ারিশি ফারায়েজ সনদ সংযুক্ত।',
                'HEARING_SCHEDULED',
                'uno_supervisor',
                'আগামী ২৫ অক্টোবর সকাল ১১টায় শুনানীর দিন ধার্য করা হলো।',
                $now,
            ]
        );
    }

    /**
     * F08: Seed sample field inspection reports and SLA dispatches so the
     * AC Land and Field Verification Officer workspaces show real rows on
     * first load. Each row is created through the same write path the
     * controllers use (no raw insert shortcut that would skip the audit
     * hash chain).
     */
    public static function seedFieldOperations(array $plotIds): void
    {
        $cnt = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM field_reports')['c'] ?? 0);
        if ($cnt > 0) {
            return;
        }
        $now = gmdate('c');
        $samples = [
            [
                'plot_idx' => 0,
                'possession' => 'POSSESSED_BY_OWNER',
                'boundary' => 'INTACT',
                'tax' => 'PAID_UP_TO_2026',
                'lat' => 23.8583,
                'lng' => 90.2667,
                'remarks' => 'মালিক নিজে দখলে আছেন, সীমানা পিলার অক্ষত, ভূমি উন্নয়ন কর হালনাগাদ।',
                'signed_by' => 'fvo_savar',
            ],
            [
                'plot_idx' => 5,
                'possession' => 'PARTIAL_DISPUTE',
                'boundary' => 'ENCROACHED_NORTH',
                'tax' => 'PARTIAL_DUE',
                'lat' => 23.9012,
                'lng' => 90.3112,
                'remarks' => 'উত্তর সীমানায় প্রতিবেশীর ২ ফুট দখল; ভূমি উন্নয়ন কর ২ বছর বকেয়া।',
                'signed_by' => 'fvo_savar',
            ],
        ];
        $i = 100;
        foreach ($samples as $s) {
            $i++;
            $code = sprintf('FR-2026-%04d', $i);
            $plot = DB::selectOne('SELECT id, dag_no FROM plots WHERE id = ?', [$plotIds[$s['plot_idx']] ?? 0]);
            if (!$plot) continue;
            $user = DB::selectOne('SELECT id FROM users WHERE username = ?', [$s['signed_by']]);
            if (!$user) continue;
            DB::insert(
                'INSERT INTO field_reports (report_code, plot_id, dag_no, possession_status, boundary_status, tax_status, latitude, longitude, remarks_bn, signed_by_user_id, signed_by_username, signed_at, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $code, (int) $plot['id'], (string) $plot['dag_no'],
                    $s['possession'], $s['boundary'], $s['tax'],
                    $s['lat'], $s['lng'], $s['remarks'],
                    (int) $user['id'], $s['signed_by'], $now, 'SUBMITTED', $now,
                ]
            );
            self::appendAuditEntry($s['signed_by'], 'field_verification_officer', 'FIELD_REPORT_FILED', 'field_report', $code, [
                'plot_id' => (int) $plot['id'],
                'dag_no' => (string) $plot['dag_no'],
            ], $now);
        }

        // SLA dispatches: two UNO escalations and one AC Land follow-up
        $slSamples = [
            [
                'case' => 'MUT-2026-0002', 'target_role' => 'land_office_assistant',
                'priority' => 'URGENT', 'due' => '2026-10-25T17:00:00+06:00',
                'notes' => 'দাগ ১০৬ এর নামজারি ৪৫ দিনের বেশি অতিবাহিত; সাত দিনের মধ্যে আদেশনামা দাখিল করুন।',
                'issuer' => 'uno_savar',
            ],
            [
                'case' => 'MUT-2026-0003', 'target_role' => 'field_verification_officer',
                'priority' => 'HIGH', 'due' => '2026-10-22T17:00:00+06:00',
                'notes' => 'দাগ ১০৫ (ছাঁটাইকৃত দলিল) পুনঃমাঠ যাচাই প্রতিবেদন দরকার।',
                'issuer' => 'uno_savar',
            ],
            [
                'case' => 'MUT-2026-0001', 'target_role' => 'service_point_operator',
                'priority' => 'NORMAL', 'due' => '2026-10-30T17:00:00+06:00',
                'notes' => 'বিরুলিয়া ইউডিসিতে নাগরিক সহায়তা ডেস্কে অপেক্ষমাণ আবেদনের প্রাথমিক যাচাই সম্পন্ন করুন।',
                'issuer' => 'acland',
            ],
        ];
        $j = 100;
        foreach ($slSamples as $s) {
            $j++;
            $code = sprintf('SLA-2026-%04d', $j);
            $user = DB::selectOne('SELECT id, role FROM users WHERE username = ?', [$s['issuer']]);
            if (!$user) continue;
            DB::insert(
                'INSERT INTO sla_dispatches (dispatch_code, case_reference, target_role, priority, due_at, notes_bn, issued_by_user_id, issued_by_username, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $code, $s['case'], $s['target_role'], $s['priority'], $s['due'], $s['notes'],
                    (int) $user['id'], $s['issuer'], 'SENT', $now,
                ]
            );
            self::appendAuditEntry($s['issuer'], (string) $user['role'], 'SLA_DISPATCH_SENT', 'sla_dispatch', $code, [
                'target_role' => $s['target_role'],
                'priority' => $s['priority'],
                'case_reference' => $s['case'],
            ], $now);
        }
    }

    public static function seedServiceCatalogue(): void
    {
        $cnt = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM service_catalogue')['c'] ?? 0);
        if ($cnt > 0) {
            return;
        }

        $nowIso = gmdate('c');
        $services = [
            [
                'REVENUE_MUTATION',
                'MUTATION_ACLAND',
                'অনলাইন ই-নামজারি আবেদন ও ট্র্যাকিং',
                'Online e-Mutation Application & Tracking',
                'সহকারী কমিশনার (ভূমি) কার্যালয়ে ই-নামজারি আবেদন দাখিল, শুনানি ও ডিসিআর ফি পরিশোধের অফিসিয়াল প্রক্রিয়া। আবেদন ফি কোর্ট ফি ২০ টাকা + নোটিশ জারি ৫০ টাকা = ৭০ টাকা এবং অনুমোদনের পর ডিসিআর ফি ১১০০ টাকা।',
                'AC Land online e-mutation submission, hearing and DCR lifecycle. Application fee court fee BDT 20 + notice fee BDT 50 = BDT 70, and post-approval DCR fee BDT 1100.',
                'EXTERNAL_OFFICIAL',
                '/acland',
                'https://mutation.land.gov.bd/nirdeshika',
                'https://mutation.land.gov.bd/',
                'ভূমি সংস্কার বোর্ড ও ভূমি মন্ত্রণালয়',
                'Land Reform Board & Ministry of Land',
                'অফিশিয়াল সেবা',
                'Official Portal',
                1,
                1,
                '2026-10-17',
            ],
            [
                'RECORDS_MAPS',
                'KHATIAN_ONLINE_COPY',
                'অনলাইন খতিয়ান ও সার্টিফাইড কপি আবেদন',
                'Online Khatian & Certified Copy Application',
                'ভূমি রেকর্ড ও জরিপ অধিদপ্তরের প্রস্তুতকৃত খতিয়ানের অনলাইন/সার্টিফাইড কপির আবেদন। ভূমি মন্ত্রণালয়ের ১৭ ফেব্রুয়ারি ২০২৬ তারিখের সার্কুলার অনুযায়ী প্রতি কপি ফি সরকারি ফি ১০০ টাকা + সার্ভিস চার্জ ২০ টাকা = মোট ১২০ টাকা।',
                'Official khatian certified/online copy request. Ministry circular dated 17 February 2026 sets fee at Govt fee BDT 100 + Service fee BDT 20 = BDT 120.',
                'EXTERNAL_OFFICIAL',
                '/check',
                'https://lsg-portal.land.gov.bd/vumisheba-fee',
                'https://minland.gov.bd/pages/static-pages/694032df35ce18e1c0563b8d',
                'ভূমি রেকর্ড ও জরিপ অধিদপ্তর',
                'Directorate of Land Records and Surveys (DLRS)',
                '১৭ ফেব্রু ২০২৬ সার্কুলার',
                '17 Feb 2026 Circular',
                1,
                2,
                '2026-10-17',
            ],
            [
                'RECORDS_MAPS',
                'MOUZA_MAP_SHEET',
                'মৌজা নকশা (ম্যাপ শিট) আবেদন',
                'Mouza Map Sheet Order',
                'সিএস, আরএস ও বিএস জরিপের অনুমোদিত মৌজা ম্যাপ শিট আবেদন। ১৭ ফেব্রুয়ারি ২০২৬ তারিখের সার্কুলার অনুযায়ী প্রতি শিট ফি সরকারি ফি ৫২০ টাকা + সার্ভিস চার্জ ২৫ টাকা = মোট ৫৪৫ টাকা।',
                'Authorized mouza map sheet copy. Ministry circular dated 17 February 2026 sets fee at Govt fee BDT 520 + Service fee BDT 25 = BDT 545.',
                'EXTERNAL_OFFICIAL',
                '/check',
                'https://lsg-portal.land.gov.bd/vumisheba-fee',
                'https://minland.gov.bd/pages/static-pages/694032df35ce18e1c0563b8d',
                'ভূমি রেকর্ড ও জরিপ অধিদপ্তর',
                'Directorate of Land Records and Surveys (DLRS)',
                '১৭ ফেব্রু ২০২৬ সার্কুলার',
                '17 Feb 2026 Circular',
                1,
                3,
                '2026-10-17',
            ],
            [
                'TAXATION',
                'LAND_DEVELOPMENT_TAX',
                'অনলাইন ভূমি উন্নয়ন কর (এলডি ট্যাক্স)',
                'Online Land Development Tax (LD Tax)',
                'নাগরিক মোবাইল নম্বর, জাতীয় পরিচয়পত্র (এনআইডি) ও খতিয়ান নম্বর দিয়ে হোল্ডিং এন্ট্রি এবং বার্ষিক ভূমি উন্নয়ন কর পরিশোধের প্রস্তুতিমূলক নির্দেশিকা।',
                'Guidance for holding registration and annual land development tax payment using citizen mobile, NID, and khatian records.',
                'EXTERNAL_OFFICIAL',
                null,
                'https://ldtax.gov.bd/',
                'https://ldtax.gov.bd/manual',
                'ভূমি মন্ত্রণালয় (রাজস্ব উইং)',
                'Ministry of Land (Revenue Wing)',
                'রাজস্ব সেবা',
                'Revenue Service',
                1,
                4,
                '2026-10-17',
            ],
            [
                'RECORDS_MAPS',
                'SURVEY_SETTLEMENT',
                'চলমান জরিপ খতিয়ান ও সেটেলমেন্ট রেকর্ড',
                'Ongoing Survey Khatians & Settlement Records',
                'চলমান জরিপের (বিডিএস, সিটি জরিপ, দিয়ারা) ড্রাফট প্রকাশনা পরিদর্শন। চূড়ান্তভাবে গেজেটভুক্ত রেকর্ড জেলা প্রশাসকের রেকর্ডরুমে হস্তান্তরিত হয়।',
                'Inspection of ongoing draft survey records (BDS, City Survey, Diara). Completed gazetted records transition to Deputy Commissioner record room.',
                'EXTERNAL_OFFICIAL',
                '/check',
                'https://www.settlement.gov.bd/',
                'https://www.settlement.gov.bd/',
                'ভূমি রেকর্ড ও জরিপ অধিদপ্তর',
                'Directorate of Land Records and Surveys (DLRS)',
                'জরিপ উইং',
                'Survey Wing',
                1,
                5,
                '2026-10-17',
            ],
            [
                'COMPLAINTS_SUPPORT',
                'LAND_SERVICE_HELPLINE_16122',
                'ভূমি সেবা কলসেন্টার ১৬১২২ ও অভিযোগ নিষ্পত্তি',
                'Land Service Call Center 16122 & Grievance Redress',
                'ভূমি মন্ত্রণালয়ের প্রাতিষ্ঠানিক কলসেন্টার ১৬১২২ (অফিস চলাকালীন) এবং অভিযোগ প্রতিকার ব্যবস্থাপনা (জিআরএস)।',
                'Ministry of Land institutional helpline 16122 (official working hours) and Grievance Redress System (GRS).',
                'EXTERNAL_OFFICIAL',
                null,
                'https://www.land.gov.bd/manual?lang=bn',
                'https://minland.gov.bd/pages/notices/%E0%A6%85%E0%A6%AD%E0%A6%BF%E0%A6%AF%E0%A7%87%E0%A6%BE%E0%A6%97-%E0%A6%AC%E0%A7%8D%E0%A6%AF%E0%A6%AC%E0%A6%B8%E0%A7%8D%E0%A6%A5%E0%A6%BE%E0%A6%AA%E0%A6%A8%E0%A6%BE-%E0%A6%A8%E0%A6%BF%E0%A6%B0%E0%A7%8D%E0%A6%A6%E0%A7%87%E0%A6%B6%E0%A6%BF%E0%A6%95%E0%A6%BE-%E0%A7%A8%E0%A7%A6%E0%A7%A8%E0%A7%AC-vhvoa4-699448a66973d7dc51151d4f',
                'ভূমি মন্ত্রণালয়',
                'Ministry of Land',
                'হেল্পলাইন ১৬১২২',
                'Helpline 16122',
                1,
                6,
                '2026-10-17',
            ],
            [
                'INTEGRITY_VERIFICATION',
                'BHUMISHIELD_INTEGRITY_CHECK',
                'জমি কেনার আগে যাচাই (খতিয়ান পরম্পরা ও বন্ধক স্ক্যান)',
                'Check Before You Buy (Khatian Chain & Lien Scanner)',
                'সিএস, আরএস, বিএস জরিপ খতিয়ান মিল, ব্যাংক বন্ধক, মালিকানা বিক্রয় লক এবং জালিয়াতির ঝুঁকি শনাক্তকরণের স্বাধীন প্রোটোটাইপ টুল।',
                'Independent prototype evaluating CS, RS, BS lineage, bank mortgages, sale locks, and overselling risks.',
                'INTERNAL',
                '/check',
                null,
                'https://landtech2026.bhumishield.local',
                'ভূমি সুরক্ষা প্রোটোটাইপ (LandTech 2026)',
                'BhumiShield Prototype (LandTech 2026)',
                'লোকাল ট্রাস্ট ইঞ্জিন',
                'Local Trust Engine',
                1,
                7,
                '2026-10-17',
            ],
            [
                'INTEGRITY_VERIFICATION',
                'BHUMISHIELD_QR_PROOF',
                'ডিজিটাল দলিল ও এনওসি কিউআর ভেরিফিকেশন',
                'Digital Deed & NOC QR Verification',
                'Ed25519 ক্রিপ্টোগ্রাফিক ডিজিটাল স্বাক্ষর ও শ্যা-২৫৬ হ্যাশ চেইন যাচাইকরণ। ডাটাবেজে কোনো তথ্য পরিবর্তন করা হলে তাৎক্ষণিক ধরা পড়ে।',
                'Ed25519 cryptographic signature and SHA-256 hash-chain verification with live tamper detection.',
                'INTERNAL',
                '/qr',
                null,
                'https://landtech2026.bhumishield.local',
                'ভূমি সুরক্ষা প্রোটোটাইপ (LandTech 2026)',
                'BhumiShield Prototype (LandTech 2026)',
                'ক্রিপ্টোগ্রাফিক প্রুফ',
                'Cryptographic Proof',
                1,
                8,
                '2026-10-17',
            ],
        ];

        foreach ($services as $srv) {
            DB::insert(
                'INSERT INTO service_catalogue (category, service_code, title_bn, title_en, description_bn, description_en, service_type, internal_route, external_url, source_url, authority_name_bn, authority_name_en, badge_bn, badge_en, is_published, display_order, last_reviewed_date, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [...$srv, $nowIso, $nowIso]
            );
        }
    }

    public static function seedServiceFeesRegistry(): void
    {
        $cnt = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM service_fees_registry')['c'] ?? 0);
        if ($cnt > 0) {
            return;
        }

        $nowIso = gmdate('c');
        $fees = [
            [
                'FEE_KHATIAN_CERTIFIED_CIRCULAR_2026',
                'খতিয়ান সার্টিফাইড ও অনলাইন কপি ফি (সার্কুলার ১৭ ফেব্রু ২০২৬)',
                'Khatian Certified & Online Copy Fee (17 Feb 2026 Circular)',
                json_encode([
                    ['name_bn' => 'সরকারি ফি (প্রতি খতিয়ান কপি)', 'name_en' => 'Government Fee (per copy)', 'amount_bdt' => 100],
                    ['name_bn' => 'অনলাইন সার্ভিস চার্জ', 'name_en' => 'Online Platform Service Charge', 'amount_bdt' => 20],
                ], JSON_UNESCAPED_UNICODE),
                120.0,
                'BDT',
                'ভূমি রেকর্ড ও জরিপ অধিদপ্তর',
                'Directorate of Land Records and Surveys (DLRS)',
                'ভূমি মন্ত্রণালয়ের স্মারক নং ৩১.০০.০০০০.০৪২.৬৮.০১৮.২৩-৭২ (১৭ ফেব্রুয়ারি ২০২৬)',
                'Ministry of Land Memo No. 31.00.0000.042.68.018.23-72 (17 Feb 2026)',
                'CIRCULAR-2026-02-17-72',
                '2026-02-17',
                'https://minland.gov.bd/pages/static-pages/694032df35ce18e1c0563b8d',
                0,
                1,
                1,
                '[]',
            ],
            [
                'FEE_MOUZA_MAP_CIRCULAR_2026',
                'মৌজা নকশা (ম্যাপ শিট) আবেদন ফি (সার্কুলার ১৭ ফেব্রু ২০২৬)',
                'Mouza Map Sheet Order Fee (17 Feb 2026 Circular)',
                json_encode([
                    ['name_bn' => 'মৌজা নকশা সরকারি ফি (প্রতি শিট)', 'name_en' => 'Government Fee (per sheet)', 'amount_bdt' => 520],
                    ['name_bn' => 'অনলাইন প্রসেসিং সার্ভিস চার্জ', 'name_en' => 'Online Processing Service Charge', 'amount_bdt' => 25],
                ], JSON_UNESCAPED_UNICODE),
                545.0,
                'BDT',
                'ভূমি রেকর্ড ও জরিপ অধিদপ্তর',
                'Directorate of Land Records and Surveys (DLRS)',
                'ভূমি মন্ত্রণালয়ের স্মারক নং ৩১.০০.০০০০.০৪২.৬৮.০১৮.২৩-৭২ (১৭ ফেব্রুয়ারি ২০২৬)',
                'Ministry of Land Memo No. 31.00.0000.042.68.018.23-72 (17 Feb 2026)',
                'CIRCULAR-2026-02-17-72',
                '2026-02-17',
                'https://minland.gov.bd/pages/static-pages/694032df35ce18e1c0563b8d',
                0,
                1,
                1,
                '[]',
            ],
            [
                'FEE_EMUTATION_ACLAND',
                'ই-নামজারি আবেদন ও ডিসিআর ফি',
                'e-Mutation Application & DCR Fees',
                json_encode([
                    ['name_bn' => 'কোর্ট ফি (আবেদনকালীন)', 'name_en' => 'Court Fee (Application)', 'amount_bdt' => 20],
                    ['name_bn' => 'নোটিশ জারি ফি (আবেদনকালীন)', 'name_en' => 'Notice Serving Fee (Application)', 'amount_bdt' => 50],
                    ['name_bn' => 'ডিসিআর ফি (অনুমোদন পরবর্তী)', 'name_en' => 'DCR Fee (Post-approval)', 'amount_bdt' => 1100],
                ], JSON_UNESCAPED_UNICODE),
                1170.0,
                'BDT',
                'সহকারী কমিশনার (ভূমি) কার্যালয়',
                'Office of the Assistant Commissioner (Land)',
                'ভূমি সংস্কার বোর্ড নামজারি নির্দেশিকা ও অর্থ আইন',
                'Land Reform Board Mutation Guidelines & Finance Act',
                'MUT-NIRD-2026',
                '2026-01-01',
                'https://mutation.land.gov.bd/nirdeshika',
                0,
                1,
                1,
                '[]',
            ],
            [
                'FEE_DEED_REGISTRATION_ESTIMATE',
                'দলিল নিবন্ধন সরকারি কর ও শুল্ক প্রাক্কলন ক্যালকুলেটর',
                'Deed Registration Govt Taxes & Duty Assessment Calculator',
                json_encode([
                    ['name_bn' => 'স্ট্যাম্প ডিউটি (আনুমানিক ১.৫%)', 'name_en' => 'Stamp Duty (Est 1.5%)', 'percentage' => 1.5],
                    ['name_bn' => 'রেজিস্ট্রেশন ফি (আনুমানিক ১.০%)', 'name_en' => 'Registration Fee (Est 1.0%)', 'percentage' => 1.0],
                    ['name_bn' => 'স্থানীয় সরকার কর (আনুমানিক ২.০%)', 'name_en' => 'Local Govt Tax (Est 2.0%)', 'percentage' => 2.0],
                    ['name_bn' => 'উৎস কর / এআইটি (আনুমানিক ৩.০%)', 'name_en' => 'Source Tax / AIT (Est 3.0%)', 'percentage' => 3.0],
                ], JSON_UNESCAPED_UNICODE),
                75000.0,
                'BDT',
                'নিবন্ধন অধিদপ্তর ও জাতীয় রাজস্ব বোর্ড',
                'Directorate of Registration & National Board of Revenue',
                'রেজিস্ট্রেশন আইন ও অর্থ আইন (অনলাইন আনুমানিক হিসাব, চূড়ান্ত সরকারি চালান নয়)',
                'Registration Act & Finance Act (Informational estimate only, not official challan)',
                'REG-EST-2025-09',
                '2025-09-01',
                'https://rd.portal.gov.bd/pages/static-pages/6922dc81933eb65569e10b8b',
                1,
                0,
                1,
                '[]',
            ],
        ];

        foreach ($fees as $fee) {
            DB::insert(
                'INSERT INTO service_fees_registry (service_code, title_bn, title_en, components_json, total_bdt, currency, authority_name_bn, authority_name_en, legal_basis_bn, legal_basis_en, circular_no, effective_date, source_url, is_estimate, is_published, version, history_json, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [...$fee, $nowIso, $nowIso]
            );
        }
    }
}
