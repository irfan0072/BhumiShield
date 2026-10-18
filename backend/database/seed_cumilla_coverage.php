<?php
declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use App\Support\DB;

$existing = DB::selectOne('SELECT id FROM offices WHERE office_code = ?', ['OFF-REG-DAUDKANDI']);
if ($existing) {
    echo "Cumilla offices already present.\n";
    exit(0);
}

$now = gmdate('c');

// 1. Insert Cumilla Location
$locId = DB::insert(
    'INSERT INTO locations (division_bn, division_en, district_bn, district_en, upazila_bn, upazila_en, mouza_bn, mouza_en, jl_no, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
        'চট্টগ্রাম', 'Chattogram',
        'কুমিল্লা', 'Cumilla',
        'দাউদকান্দি', 'Daudkandi',
        'সুন্দরপুর', 'Sundarpur',
        '42',
        23.5350, 90.7180
    ]
);
echo "Inserted Cumilla Location ID: {$locId}\n";

// 2. Insert Cumilla Offices
$offices = [
    [
        'OFF-REG-DAUDKANDI',
        'সাব-রেজিস্ট্রি অফিস, দাউদকান্দি, কুমিল্লা',
        'Sub-Registry Office, Daudkandi, Cumilla',
        'registry',
        'চট্টগ্রাম', 'Chattogram',
        'কুমিল্লা', 'Cumilla',
        'দাউদকান্দি', 'Daudkandi',
        json_encode(['সুন্দরপুর', 'দৌলতপুর', 'ইলিয়টগঞ্জ', 'গৌরীপুর'], JSON_UNESCAPED_UNICODE),
        23.5350, 90.7180,
        'উপজেলা পরিষদ চত্বর, দাউদকান্দি, কুমিল্লা',
        'Upazila Parishad Complex, Daudkandi, Cumilla',
        '01711-223344'
    ],
    [
        'OFF-ACL-DAUDKANDI',
        'উপজেলা ভূমি অফিস (এসি ল্যান্ড), দাউদকান্দি, কুমিল্লা',
        'Upazila Land Office (AC Land), Daudkandi, Cumilla',
        'ac_land',
        'চট্টগ্রাম', 'Chattogram',
        'কুমিল্লা', 'Cumilla',
        'দাউদকান্দি', 'Daudkandi',
        json_encode(['সুন্দরপুর', 'দৌলতপুর', 'ইলিয়টগঞ্জ', 'গৌরীপুর', 'দাউদকান্দি পৌরসভা'], JSON_UNESCAPED_UNICODE),
        23.5340, 90.7170,
        'দাউদকান্দি উপজেলা পরিষদ রোড, দাউদকান্দি, কুমিল্লা',
        'Daudkandi Upazila Parishad Road, Daudkandi, Cumilla',
        '01711-334455'
    ],
    [
        'OFF-SET-CUMILLA',
        'জোনাল সেটেলমেন্ট অফিস, কুমিল্লা',
        'Zonal Settlement Office, Cumilla',
        'settlement',
        'চট্টগ্রাম', 'Chattogram',
        'কুমিল্লা', 'Cumilla',
        'কুমিল্লা আদর্শ সদর', 'Cumilla Adarsha Sadar',
        json_encode(['দাউদকান্দি', 'সুন্দরপুর', 'দেবীদ্বার', 'চান্দিনা', 'সদর দক্ষিণ'], JSON_UNESCAPED_UNICODE),
        23.4607, 91.1809,
        'ফৌজদারি মোড়, সেটেলমেন্ট ভবন, কুমিল্লা',
        'Foujdari Mor, Settlement Bhaban, Cumilla',
        '081-65432'
    ],
    [
        'OFF-SPO-DAUDKANDI',
        'দাউদকান্দি পৌর ডিজিটাল সেন্টার (ইউডিসি)',
        'Daudkandi Pourashava Digital Center (UDC)',
        'service_point',
        'চট্টগ্রাম', 'Chattogram',
        'কুমিল্লা', 'Cumilla',
        'দাউদকান্দি', 'Daudkandi',
        json_encode(['সুন্দরপুর', 'দৌলতপুর', 'দাউদকান্দি পৌরসভা'], JSON_UNESCAPED_UNICODE),
        23.5360, 90.7190,
        'পৌরসভা ভবন, দাউদকান্দি বাজার, কুমিল্লা',
        'Pourashava Bhaban, Daudkandi Bazar, Cumilla',
        '01812-345678'
    ],
    [
        'OFF-DC-CUMILLA',
        'জেলা প্রশাসকের কার্যালয় (এল.এ শাখা), কুমিল্লা',
        'Office of the Deputy Commissioner (LA Branch), Cumilla',
        'admin_cell',
        'চট্টগ্রাম', 'Chattogram',
        'কুমিল্লা', 'Cumilla',
        'কুমিল্লা আদর্শ সদর', 'Cumilla Adarsha Sadar',
        json_encode(['সমগ্র কুমিল্লা জেলা'], JSON_UNESCAPED_UNICODE),
        23.4620, 91.1820,
        'কালেক্টরেট ভবন, কুমিল্লা',
        'Collectorate Bhaban, Cumilla',
        '081-68901'
    ],
];

foreach ($offices as $o) {
    DB::insert(
        'INSERT INTO offices (office_code, name_bn, name_en, office_type, division_bn, division_en, district_bn, district_en, upazila_bn, upazila_en, mouzas_served_json, latitude, longitude, address_bn, address_en, contact_phone, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)',
        [
            $o[0], $o[1], $o[2], $o[3], $o[4], $o[5], $o[6], $o[7], $o[8], $o[9], $o[10], $o[11], $o[12], $o[13], $o[14], $o[15], $now, $now
        ]
    );
    echo "Inserted Office: {$o[0]}\n";
}

// 3. Insert Cumilla Plot in Sundarpur Mouza
$plotId = DB::insert(
    'INSERT INTO plots (plot_code, location_id, dag_no, dag_no_bn, land_type_bn, land_type_en, total_area_decimal, owner_sale_locked, notes_bn, notes_en) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)',
    [
        'PLT-CUM-DAU-0420',
        $locId,
        '420',
        '৪২০',
        'নাল',
        'Agricultural (Nal)',
        18.50,
        'দাউদকান্দি সুন্দরপুর মৌজার আরএস ও বিএস রেকর্ডের বৈধ নাল জমি।',
        'Valid agricultural land in Sundarpur mouza, Daudkandi.'
    ]
);
echo "Inserted Plot ID: {$plotId}\n";

// 4. Insert Khatian Record
$khtId = DB::insert(
    'INSERT INTO khatian_records (plot_id, survey_type, khatian_no, khatian_no_bn, recorded_area_decimal, survey_year, status, remarks_bn, remarks_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
        $plotId,
        'BS',
        '1042',
        '১০৪২',
        18.50,
        2018,
        'VALID',
        'চূড়ান্ত মুদ্রিত বিএস খতিয়ান রেকর্ড',
        'Final BS record'
    ]
);
echo "Inserted Khatian Record ID: {$khtId}\n";

echo "Cumilla configuration successfully seeded!\n";
