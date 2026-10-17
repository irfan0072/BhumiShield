<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Services\FraudRulesEngine;
use App\Services\JwtAuthService;
use App\Services\LedgerService;
use App\Support\DB;
use Database\Migrations\CreateBhumishieldTables;

/**
 * Seeds the BhumiShield Laravel database with 100% synthetic Bangladeshi land records
 * and the 8 deliberate hackathon demo scenarios.
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
            'username' => 'bank',
            'email' => 'credit.sonalibank@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'নাজমুল হাসান (ব্যাংক কর্মকর্তা)',
            'full_name_en' => 'Nazmul Hasan (Bank Officer)',
            'role' => 'bank_officer',
            'office_bn' => 'সোনালী ব্যাংক পিএলসি, সাভার শাখা (ডেমো)',
            'office_en' => 'Sonali Bank PLC, Savar Branch (Demo)',
            'phone_dummy' => '01700-004001',
            'nid' => '9900004001',
            'is_active' => 1,
        ],
        [
            'username' => 'admin',
            'email' => 'auditor.admin@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'সিস্টেম অডিটর (ভূমি সুরক্ষা অ্যাডমিন)',
            'full_name_en' => 'System Auditor (BhumiShield Admin)',
            'role' => 'admin',
            'office_bn' => 'কেন্দ্রীয় লেজার মনিটরিং সেল (ডেমো)',
            'office_en' => 'Central Ledger Monitoring Cell (Demo)',
            'phone_dummy' => '01700-005001',
            'nid' => '9900005001',
            'is_active' => 1,
        ],
        [
            'username' => 'rabeya',
            'email' => 'rabeya.citizen@demo.bhumishield.gov.bd',
            'password' => 'demo123',
            'full_name_bn' => 'মোসা. রাবেয়া খাতুন (নাগরিক)',
            'full_name_en' => 'Mst. Rabeya Khatun (Citizen)',
            'role' => 'citizen',
            'office_bn' => 'নাগরিক পোর্টাল — বিরুলিয়া, সাভার',
            'office_en' => 'Citizen Portal — Birulia, Savar',
            'phone_dummy' => '01700-001002',
            'nid' => '9900001002',
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
            'setting_value_json' => '"আইন মন্ত্রণালয় (সাব-রেজিস্ট্রি) ও ভূমি মন্ত্রণালয় (এসি ল্যান্ড)-এর আন্তঃসংযোগ ট্রাস্ট লেয়ার (ডেমো)"',
            'description_bn' => 'সরকারি আন্তঃসংযোগ ব্যানার টেক্সট',
            'description_en' => 'Inter-ministry bridge banner text',
        ],
        [
            'setting_key' => 'helpline_number',
            'setting_value_json' => '"১৬১২২ (ভূমি সেবা হটলাইন - ডেমো)"',
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

        $deedId = DB::insert(
            'INSERT INTO deeds (deed_no, deed_type, seller_id, buyer_id, plot_id, share_fraction, area_decimal, price_bdt, status, content_json, original_content_json, content_hash, prev_hash, signature, chain_index, registered_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
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

        // 1. Seed Users (Explicitly verified synthetic demo accounts)
        foreach (self::DEMO_USERS as $u) {
            DB::insert(
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
        }

        // 1b. Seed Site Settings
        foreach (self::DEFAULT_SETTINGS as $st) {
            DB::insert(
                "INSERT INTO site_settings (setting_key, setting_value_json, description_bn, description_en, updated_by, updated_at) VALUES (?, ?, ?, ?, 'admin', '2026-10-16T09:00:00+06:00')",
                [$st['setting_key'], $st['setting_value_json'], $st['description_bn'], $st['description_en']]
            );
        }

        // 2. Seed Locations (3 Mouzas)
        $mouzas = [
            ['division_bn' => 'ঢাকা', 'division_en' => 'Dhaka', 'district_bn' => 'ঢাকা', 'district_en' => 'Dhaka', 'upazila_bn' => 'সাভার', 'upazila_en' => 'Savar', 'mouza_bn' => 'বিরুলিয়া', 'mouza_en' => 'Birulia', 'jl_no' => '12'],
            ['division_bn' => 'ঢাকা', 'division_en' => 'Dhaka', 'district_bn' => 'গাজীপুর', 'district_en' => 'Gazipur', 'upazila_bn' => 'গাজীপুর সদর', 'upazila_en' => 'Gazipur Sadar', 'mouza_bn' => 'বাসন', 'mouza_en' => 'Bason', 'jl_no' => '08'],
            ['division_bn' => 'ঢাকা', 'division_en' => 'Dhaka', 'district_bn' => 'নারায়ণগঞ্জ', 'district_en' => 'Narayanganj', 'upazila_bn' => 'সোনারগাঁও', 'upazila_en' => 'Sonargaon', 'mouza_bn' => 'পানাম', 'mouza_en' => 'Panam', 'jl_no' => '15'],
        ];
        $locationIds = [];
        foreach ($mouzas as $m) {
            $locationIds[] = DB::insert(
                'INSERT INTO locations (division_bn, division_en, district_bn, district_en, upazila_bn, upazila_en, mouza_bn, mouza_en, jl_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [$m['division_bn'], $m['division_en'], $m['district_bn'], $m['district_en'], $m['upazila_bn'], $m['upazila_en'], $m['mouza_bn'], $m['mouza_en'], $m['jl_no']]
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
            $addrBn = "গ্রাম: {$m['mouza_bn']}, উপজেলা: {$m['upazila_bn']}, জেলা: {$m['district_bn']} (ডেমো)";
            $addrEn = "Village: {$m['mouza_en']}, Upazila: {$m['upazila_en']}, District: {$m['district_en']} (Demo)";

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

            $notesBn = 'ডেমো রেকর্ড — সিএস, এসএ, আরএস ও বিএস খতিয়ান যাচাইকৃত।';
            $notesEn = 'Demo record — CS, SA, RS & BS khatian chain recorded.';
            if ($pIdx === 7) {
                $notesBn = 'সতর্কতা: আরএস খতিয়ানে ১৮ শতাংশ কিন্তু বিএস খতিয়ানে ২৬ শতাংশ রেকর্ডকৃত (অমিল)।';
                $notesEn = 'Warning: RS khatian records 18 decimals but BS khatian records 26 decimals (mismatch).';
            } elseif ($pIdx === 8) {
                $notesBn = 'সতর্কতা: সর্বশেষ বিএস খতিয়ানের মালিক মৃত; ওয়ারিশ সনদ ও নামজারি অমীমাংসিত।';
                $notesEn = 'Warning: Recorded BS owner is deceased; succession & mutation unresolved.';
            }

            $plotId = DB::insert(
                'INSERT INTO plots (location_id, dag_no, dag_no_bn, land_type_bn, land_type_en, total_area_decimal, notes_bn, notes_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [$locId, $dagStr, $dagBn, $ltBn, $ltEn, $area, $notesBn, $notesEn]
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
        DB::insert(
            "INSERT INTO mortgages_liens (plot_id, borrower_id, bank_name_bn, bank_name_en, branch_bn, amount_bdt, area_mortgaged_decimal, status, created_at, released_at) VALUES (?, ?, 'অগ্রণী ব্যাংক পিএলসি', 'Agrani Bank PLC', 'সাভার শাখা', 800000, 20.0, 'RELEASED', '2024-05-10T10:00:00+06:00', '2025-11-20T15:00:00+06:00')",
            [$plotIds[0], $personIds[0]]
        );

        // 7. Seed Mutations
        DB::insert(
            "INSERT INTO mutations (case_no, deed_id, plot_id, seller_id, buyer_id, area_decimal, status, decision_reason_bn, decision_reason_en, created_at) VALUES ('MUT-2026-501', ?, ?, ?, ?, 15.0, 'PENDING', 'সাব-রেজিস্ট্রি অফিস হতে প্রাপ্ত দলিল নং DL-2026-1002 নামজারির অপেক্ষায়।', 'Awaiting AC Land mutation decision for registered deed DL-2026-1002.', '2026-10-03T09:30:00+06:00')",
            [$deed2Id, $plotIds[1], $personIds[2], $personIds[3]]
        );
        DB::insert(
            "INSERT INTO mutations (case_no, deed_id, plot_id, seller_id, buyer_id, area_decimal, status, decision_reason_bn, decision_reason_en, created_at) VALUES ('MUT-2026-502', ?, ?, ?, ?, 25.0, 'PENDING', 'সতর্কতা: দলিল নং DL-2026-1005-এ হ্যাশ অমিল (তথ্য পরিবর্তনের ঝুঁকি) সনাক্ত হয়েছে।', 'ALERT: Hash mismatch detected on Deed DL-2026-1005.', '2026-09-29T10:15:00+06:00')",
            [$deed5Id, $plotIds[4], $personIds[9], $personIds[11]]
        );
        DB::insert(
            "INSERT INTO mutations (case_no, deed_id, plot_id, seller_id, buyer_id, area_decimal, status, decision_reason_bn, decision_reason_en, decided_by, decided_at, created_at) VALUES ('MUT-2024-101', ?, ?, ?, ?, 20.0, 'APPROVED', 'মালিকানা চেইন ও দলিলের ডিজিটাল স্বাক্ষর সঠিক থাকায় নামজারি অনুমোদিত।', 'Ownership chain and digital signature verified; mutation approved.', 'acland', '2024-04-02T14:00:00+06:00', '2024-03-16T10:00:00+06:00')",
            [$deed1Id, $plotIds[0], $personIds[16], $personIds[0]]
        );

        // 8. Seed 8 Deliberate Demo Scenarios
        $scenarios = [
            [1, 'CLEAN_SALE', '১. বৈধ ও নিরাপদ জমি বিক্রয় (সকল যাচাই সফল)', '1. Clean Legitimate Sale (All Checks Pass)', 'SAFE', '✔ নিরাপদ', '✔ Safe', 'বিরুলিয়া মৌজার দাগ নং ১০১-এর প্রকৃত মালিক মো. রফিকুল ইসলাম তাঁর ২০ শতাংশ নিষ্কণ্টক জমি হতে ১০ শতাংশ (১/২ অংশ) মোসা. রাবেয়া খাতুনের নিকট বিক্রয় করছেন। সিএস-এসএ-আরএস-বিএস খতিয়ান ও এনআইডি সম্পূর্ণ সঠিক।', 'Legitimate owner Md. Rafiqul Islam sells 10 decimals (out of 20 decimals owned on BS Khatian 4101, Dag 101, Birulia) to Mst. Rabeya Khatun. Full CS-SA-RS-BS chain intact and no liens.', $plotIds[0], $deed1Id, $personIds[0], $personIds[1], 10.0, null, 'sub_registrar'],
            [2, 'DOUBLE_SALE', '২. একই জমি দুইবার বিক্রয়ের চেষ্টা (ডাবল সেল জালিয়াতি)', '2. Double Sale of the Same Plot to Two Buyers', 'HIGH_RISK', '✖ ঝুঁকিপূর্ণ (আটকানো)', '✖ High Risk (Blocked)', 'দাগ নং ১০২-এর মালিক আবদুল করিম ইতিমধ্যে দলিল নং DL-2026-1002 মূলে সম্পূর্ণ ১৫ শতাংশ জমি মো. জাহাঙ্গীর আলমের নিকট বিক্রি করেছেন (নামজারি প্রক্রিয়াধীন)। এখন তিনি আবার একই জমি মো. কামরুল হাসানের কাছে বিক্রির চেষ্টা করছেন।', 'Owner Abdul Karim already sold all 15 decimals of Dag 102 to Md. Jahangir Alam via Deed DL-2026-1002 (mutation pending) and now attempts to sell 10 decimals of the same plot to a second buyer.', $plotIds[1], $deed2Id, $personIds[2], $personIds[4], 10.0, null, 'sub_registrar'],
            [3, 'AREA_EXCEEDS_OWNED', '৩. নিজের অংশের চেয়ে বেশি জমি বিক্রয়ের চেষ্টা', '3. Seller Selling More Area Than Owned Share', 'HIGH_RISK', '✖ ঝুঁকিপূর্ণ (আটকানো)', '✖ High Risk (Blocked)', 'দাগ নং ১০৩-এ মোট জমি ২৪ শতাংশ। বিক্রেতা মো. আনোয়ার হোসেন বিএস খতিয়ান ৪১০৩ অনুযায়ী ১/২ অংশের (১২ শতাংশ) মালিক, কিন্তু তিনি ১৮ শতাংশ জমি বিক্রির দলিল নিবন্ধনের চেষ্টা করছেন।', 'Dag 103 has 24 decimals total. Seller Md. Anwar Hossain owns a 1/2 share (12 decimals) on BS Khatian 4103, but attempts to sell 18 decimals.', $plotIds[2], null, $personIds[5], $personIds[4], 18.0, null, 'sub_registrar'],
            [4, 'SELLER_NOT_OWNER', '৪. ভুয়া মালিক কর্তৃক জমি বিক্রয়ের চেষ্টা (সর্বশেষ খতিয়ানে নাম নেই)', '4. Seller Is Not the Current Owner on Latest Khatian', 'HIGH_RISK', '✖ ঝুঁকিপূর্ণ (আটকানো)', '✖ High Risk (Blocked)', 'দাগ নং ১০৪-এর বর্তমান বিএস খতিয়ান ৪১০৪-এর একমাত্র মালিক ফাতেমা বেগম। কিন্তু পূর্ববর্তী বিক্রেতা মো. সাইফুল ইসলাম নিজেকে মালিক দাবি করে ৮ শতাংশ জমি বিক্রির চেষ্টা করছেন।', 'Fatema Begum is the sole recorded owner on latest BS Khatian 4104 for Dag 104, but non-owner Md. Saiful Islam attempts to sell 8 decimals.', $plotIds[3], null, $personIds[8], $personIds[9], 8.0, null, 'sub_registrar'],
            [5, 'DEED_TAMPERED', '৫. নিবন্ধনের পরে দলিলের তথ্য গোপনে পরিবর্তন (হ্যাশ ও স্বাক্ষর অমিল)', '5. Stored Deed Tampered After Registration (Hash & Signature Mismatch)', 'HIGH_RISK', '✖ ঝুঁকিপূর্ণ (টেম্পারিং সনাক্ত)', '✖ High Risk (Tampered)', 'দলিল নং DL-2026-1005 (দাগ নং ১০৫) মূলত ১০ শতাংশ জমির জন্য নিবন্ধিত ও ডিজিটাল স্বাক্ষরিত হয়েছিল। পরবর্তীতে ডাটাবেজে জমির পরিমাণ পরিবর্তন করে ২৫ শতাংশ করা হয়েছে—যা SHA-256 হ্যাশ চেইনে তাৎক্ষণিক ধরা পড়ে।', 'Deed DL-2026-1005 (Dag 105) was originally signed for 10 decimals, then altered in storage to 25 decimals. Hash chain recomputation catches the tampering immediately.', $plotIds[4], $deed5Id, $personIds[9], $personIds[11], 25.0, null, 'verify'],
            [6, 'PLOT_MORTGAGED', '৬. ব্যাংকে বন্ধক থাকা জমি পুনরায় বন্ধক বা বিক্রির চেষ্টা (ডাবল মর্টগেজ)', '6. Plot Already Mortgaged Offered as Collateral Again', 'HIGH_RISK', '✖ ঝুঁকিপূর্ণ (বন্ধককৃত)', '✖ High Risk (Mortgaged)', 'দাগ নং ১০৬-এর ৩০ শতাংশ জমি সোনালী ব্যাংক পিএলসি (সাভার শাখা)-তে ২৫,০০,০০০ টাকার ঋণের বিপরীতে সক্রিয়ভাবে বন্ধক রয়েছে। ঋণ পরিশোধ ও ছাড়পত্র ছাড়া নতুন বন্ধক বা বিক্রয় ব্লক করা হয়েছে।', 'Dag 106 (30 decimals) has an active BDT 2,500,000 mortgage lien with Sonali Bank PLC, Savar Branch. Second mortgage or unencumbered transfer is blocked.', $plotIds[5], $deed6Id, $personIds[10], $personIds[11], 15.0, null, 'bank'],
            [7, 'KHATIAN_CHAIN_BREAK', '৭. খতিয়ান চেইনে অসামঞ্জস্যতা (আরএস → বিএস জমির পরিমাণ অমিল)', '7. Khatian Survey Chain Break (RS -> BS Area Discrepancy)', 'REVIEW', '⚠ সতর্কতা (যাচাই প্রয়োজন)', '⚠ Warning (Needs Review)', 'দাগ নং ১০৭-এ সিএস, এসএ এবং আরএস খতিয়ানে জমির পরিমাণ ১৮ শতাংশ থাকলেও সর্বশেষ বিএস খতিয়ানে কোনো দলিল ছাড়াই ২৬ শতাংশ লিপিবদ্ধ হয়েছে। মানব কর্মকর্তার ম্যানুয়াল যাচাইয়ের জন্য ফ্ল্যাগ করা হয়েছে।', 'Dag 107 records 18 decimals across CS, SA, and RS surveys, but jumps to 26 decimals in BS Khatian 4107 without a supporting deed. Flagged for officer review.', $plotIds[6], null, $personIds[12], $personIds[1], 10.0, null, 'citizen'],
            [8, 'INHERITANCE_UNRESOLVED', '৮. মৃত মালিকের ওয়ারিশ সনদ ও নামজারি অমীমাংসিত (ম্যানুয়াল রিভিউ)', '8. Inheritance Case with Unresolved Heirs (Manual Review)', 'REVIEW', '⚠ সতর্কতা (ওয়ারিশ যাচাই)', '⚠ Warning (Heirs Unresolved)', 'দাগ নং ১০৮-এর রেকর্ডীয় মালিক আলহাজ্ব নূরুল হক মৃত্যুবরণ করেছেন, কিন্তু এখনো সকল ওয়ারিশের নামজারি ও বণ্টননামা সম্পন্ন হয়নি। এসি ল্যান্ড ও সাব-রেজিস্ট্রারের যৌথ যাচাইয়ের জন্য সতর্কতা প্রদান।', 'Recorded BS owner Alhaj Nurul Haque (Dag 108) is marked deceased in the registry without completed succession mutation for all legal heirs.', $plotIds[7], null, $personIds[13], $personIds[14], 11.0, null, 'citizen'],
        ];

        foreach ($scenarios as $sc) {
            DB::insert(
                'INSERT INTO demo_scenarios (scenario_no, code, title_bn, title_en, expected_verdict, badge_bn, badge_en, description_bn, description_en, plot_id, deed_id, seller_id, buyer_id, requested_area_decimal, seller_nid_override, recommended_view) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                $sc
            );
        }

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

        // 10. Seed Canonical Service Catalogue & Fee Registry (Phase 2)
        self::seedServiceCatalogue();
        self::seedServiceFeesRegistry();

        return [
            'users' => count(self::DEMO_USERS),
            'mouzas' => count($locationIds),
            'persons' => count($personIds),
            'plots' => count($plotIds),
            'khatian_records' => count($plotIds) * 4,
            'deeds' => $chainState['next_deed_index'] - 1,
            'scenarios' => count($scenarios),
        ];
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

        foreach ($services as $svc) {
            DB::insert(
                'INSERT INTO service_catalogue (category, service_code, title_bn, title_en, description_bn, description_en, service_type, internal_route, external_url, source_url, authority_name_bn, authority_name_en, badge_bn, badge_en, is_published, display_order, last_reviewed_date, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [...$svc, $nowIso, $nowIso]
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
                'FEE_KHATIAN_COPY',
                'অনলাইন খতিয়ান / সার্টিফাইড কপি ফি',
                'Online Khatian / Certified Copy Fee',
                json_encode([
                    ['name_bn' => 'সরকারি ফি', 'name_en' => 'Government Fee', 'amount_bdt' => 100],
                    ['name_bn' => 'সার্ভিস চার্জ', 'name_en' => 'Service Charge', 'amount_bdt' => 20],
                ], JSON_UNESCAPED_UNICODE),
                120.0,
                'BDT',
                'ভূমি রেকর্ড ও জরিপ অধিদপ্তর',
                'Directorate of Land Records and Surveys (DLRS)',
                'ভূমি মন্ত্রণালয়ের ১৭ ফেব্রুয়ারি ২০২৬ তারিখের স্মারক সার্কুলার',
                'Ministry of Land signed circular dated 17 February 2026',
                '474d0828-7c66-4f0d-98c3-78105e0009d9',
                '2026-02-17',
                'https://minland.gov.bd/pages/static-pages/694032df35ce18e1c0563b8d',
                0,
                1,
                1,
                '[]',
            ],
            [
                'FEE_MOUZA_MAP',
                'মৌজা নকশা (ম্যাপ শিট) ফি',
                'Mouza Map Sheet Fee',
                json_encode([
                    ['name_bn' => 'সরকারি ফি', 'name_en' => 'Government Fee', 'amount_bdt' => 520],
                    ['name_bn' => 'সার্ভিস চার্জ', 'name_en' => 'Service Charge', 'amount_bdt' => 25],
                ], JSON_UNESCAPED_UNICODE),
                545.0,
                'BDT',
                'ভূমি রেকর্ড ও জরিপ অধিদপ্তর',
                'Directorate of Land Records and Surveys (DLRS)',
                'ভূমি মন্ত্রণালয়ের ১৭ ফেব্রুয়ারি ২০২৬ তারিখের স্মারক সার্কুলার',
                'Ministry of Land signed circular dated 17 February 2026',
                '474d0828-7c66-4f0d-98c3-78105e0009d9',
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
                'দলিল নিবন্ধন আনুমানিক সরকারি কর ও শুল্ক (ডেমো ক্যালকুলেটর)',
                'Deed Registration Estimated Govt Taxes & Fees (Demo Estimate)',
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
