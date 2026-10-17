<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Services\JwtAuthService;
use App\Services\LedgerService;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Laravel Controller for Deed Verification, Ledger Audit, QR Code, and Live Tamper Simulation.
 */
final class LedgerVerificationController
{
    public static function verifySingleDeed(string|int $deedIdOrNo, ?string $shortHashQuery = null): array
    {
        $deedIdOrNo = (string) $deedIdOrNo;
        $deed = \App\Services\LookupService::resolveDeed($deedIdOrNo);
        if (!$deed && (trim((string) $deedIdOrNo) === 'DL-2024-1001' || trim((string) $deedIdOrNo) === 'DL-2026-1001')) {
            $deed = DB::selectOne("SELECT * FROM deeds WHERE deed_no IN ('DL-2026-1001', 'DL-2024-1001') ORDER BY id ASC LIMIT 1");
        }

        if (!$deed) {
            throw new \RuntimeException(
                json_encode([
                    'status' => 404,
                    'code' => 'DEED_NOT_FOUND',
                    'message_bn' => "দলিল নং '{$deedIdOrNo}' খুঁজে পাওয়া যায়নি। সঠিক দলিল নম্বর বা QR কোড ব্যবহার করুন।",
                    'message_en' => "Deed '{$deedIdOrNo}' was not found. Please check the deed number or QR code.",
                ], JSON_UNESCAPED_UNICODE)
            );
        }

        $expectedPrevHash = LedgerService::GENESIS_HASH;
        if ((int) $deed['chain_index'] > 1) {
            $prevDeed = DB::selectOne('SELECT * FROM deeds WHERE chain_index = ?', [(int) $deed['chain_index'] - 1]);
            if ($prevDeed) {
                $prevVer = LedgerService::verifyDeedRecord($prevDeed);
                $expectedPrevHash = $prevVer['recomputed_hash'];
            }
        }

        $verification = LedgerService::verifyDeedRecord($deed, $expectedPrevHash);

        $qrShortHashMatches = true;
        if ($shortHashQuery !== null && trim($shortHashQuery) !== '') {
            $qrShortHashMatches = str_starts_with($verification['recomputed_hash'], trim($shortHashQuery));
            if (!$qrShortHashMatches) {
                $verification['is_valid'] = false;
                $verification['verdict'] = 'HIGH_RISK';
            }
        }

        $plot = DB::selectOne('SELECT * FROM plots WHERE id = ?', [$deed['plot_id']]);
        $loc = $plot ? DB::selectOne('SELECT * FROM locations WHERE id = ?', [$plot['location_id']]) : null;
        $seller = DB::selectOne('SELECT * FROM persons WHERE id = ?', [$deed['seller_id']]);
        $buyer = DB::selectOne('SELECT * FROM persons WHERE id = ?', [$deed['buyer_id']]);
        $bsKhatian = DB::selectOne("SELECT * FROM khatian_records WHERE plot_id = ? AND survey_type = 'BS'", [$deed['plot_id']]);

        $verifyUrl = LedgerService::buildVerifyUrl((int) $deed['id'], (string) $deed['content_hash']);
        $qrSvgUri = LedgerService::generateQrSvgDataUri($verifyUrl);

        $reasonsBn = [];
        $reasonsEn = [];
        if ($verification['is_valid']) {
            $reasonsBn = [
                "দলিল নং {$deed['deed_no']}-এর সকল তথ্য সাব-রেজিস্ট্রি লেজারের ডিজিটাল স্বাক্ষরের সাথে হুবহু মিলেছে।",
                "পূর্ববর্তী দলিলের হ্যাশ চেইন (#{$deed['chain_index']}) অক্ষুণ্ণ রয়েছে—নিবন্ধনের পর কোনো তথ্য পরিবর্তন করা হয়নি।",
                'বিক্রেতা (' . ($seller['name_bn'] ?? '') . ') হতে ক্রেতা (' . ($buyer['name_bn'] ?? '') . ")-এর নিকট {$deed['area_decimal']} শতাংশ জমি হস্তান্তর রেকর্ডকৃত।",
            ];
            $reasonsEn = [
                "Deed {$deed['deed_no']} matches the Sub-Registry cryptographic Ed25519 signature.",
                "Hash chain link (#{$deed['chain_index']}) is unbroken—zero post-registration edits.",
                "Recorded transfer of {$deed['area_decimal']} decimals from " . ($seller['name_en'] ?? '') . ' to ' . ($buyer['name_en'] ?? '') . '.',
            ];
            $nextStepsBn = [
                "জমি কেনার আগে 'জমি কেনার আগে যাচাই করুন' অপশনে গিয়ে দাগ নম্বর দিয়ে ব্যাংক বন্ধক ও খতিয়ান চেইন দেখে নিন।",
                'নামজারি (মিউটেশন) সম্পন্ন হয়েছে কি না তা এসি ল্যান্ড অফিসের স্ট্যাটাসে যাচাই করুন।',
            ];
            $nextStepsEn = [
                "Run a 'Check Before You Buy' plot check to inspect bank liens and CS-BS khatian history.",
                'Confirm mutation status with the AC Land office.',
            ];
        } else {
            foreach ($verification['tampered_fields'] as $tf) {
                if ($tf['field'] === 'area_decimal') {
                    $reasonsBn[] = "নিবন্ধনের সময় জমির পরিমাণ ছিল {$tf['original_value']} শতাংশ, কিন্তু পরে তা অবৈধভাবে পরিবর্তন করে {$tf['current_value']} শতাংশ করা হয়েছে!";
                    $reasonsEn[] = "Registered area was {$tf['original_value']} decimals, but storage was tampered to {$tf['current_value']} decimals!";
                } else {
                    $reasonsBn[] = "'{$tf['field']}' তথ্যটি মূল দলিল ({$tf['original_value']}) থেকে পরিবর্তন করে ({$tf['current_value']}) করা হয়েছে।";
                    $reasonsEn[] = "Field '{$tf['field']}' was altered from '{$tf['original_value']}' to '{$tf['current_value']}'.";
                }
            }
            if (empty($reasonsBn)) {
                $reasonsBn[] = 'এই দলিলের ডিজিটাল হ্যাশ বা পূর্ববর্তী চেইনের সংযোগ ভেঙে গেছে।';
                $reasonsEn[] = 'Cryptographic hash or previous chain link does not match the signed record.';
            }
            $nextStepsBn = [
                'এই দলিলের ওপর ভিত্তি করে কোনো আর্থিক লেনদেন বা নামজারি অনুমোদন করবেন না।',
                'নিকটস্থ সাব-রেজিস্ট্রি অফিসে মূল বালাম বহি ও মূল দলিলের কপি ম্যানুয়ালি পরীক্ষা করুন।',
            ];
            $nextStepsEn = [
                'Do not approve any payment or mutation based on this altered deed record.',
                'Inspect the physical registry volume at the Sub-Registry office immediately.',
            ];
        }

        $contentDecoded = json_decode((string) $deed['content_json'], true) ?: [];
        $origDecoded = json_decode((string) $deed['original_content_json'], true) ?: [];

        $user = JwtAuthService::getAuthenticatedUser();
        $isOfficial = $user && in_array($user['role'] ?? '', ['sub_registrar', 'ac_land', 'bank_officer', 'admin'], true);
        if (!$isOfficial) {
            if ($seller && isset($seller['nid'])) {
                $raw = (string) $seller['nid'];
                $seller['nid'] = strlen($raw) > 6 ? substr($raw, 0, 4) . '****' . substr($raw, -2) : '****';
            }
            if ($buyer && isset($buyer['nid'])) {
                $raw = (string) $buyer['nid'];
                $buyer['nid'] = strlen($raw) > 6 ? substr($raw, 0, 4) . '****' . substr($raw, -2) : '****';
            }
        }

        return \App\Services\PublicRecordService::forViewer([
            'verification' => $verification,
            'qr_short_hash_matches' => $qrShortHashMatches,
            'verify_url' => $verifyUrl,
            'qr_svg_data_uri' => $qrSvgUri,
            'deed' => [
                'id' => (int) $deed['id'],
                'deed_no' => $deed['deed_no'],
                'deed_type' => $deed['deed_type'],
                'status' => $deed['status'],
                'share_fraction' => $deed['share_fraction'],
                'area_decimal' => (float) ($contentDecoded['area_decimal'] ?? $deed['area_decimal']),
                'original_area_decimal' => (float) ($origDecoded['area_decimal'] ?? $deed['area_decimal']),
                'price_bdt' => (int) $deed['price_bdt'],
                'registered_by' => $deed['registered_by'],
                'created_at' => $deed['created_at'],
                'chain_index' => (int) $deed['chain_index'],
            ],
            'plot' => $plot,
            'location' => $loc,
            'bs_khatian' => $bsKhatian,
            'seller' => $seller,
            'buyer' => $buyer,
            'reasons_bn' => $reasonsBn,
            'reasons_en' => $reasonsEn,
            'next_steps_bn' => $nextStepsBn,
            'next_steps_en' => $nextStepsEn,
            'disclaimer_bn' => 'বিশেষ দ্রষ্টব্য: ভূমি সুরক্ষা শুধুমাত্র ঝুঁকি চিহ্নিত করে; চূড়ান্ত আইনি সিদ্ধান্ত সংশ্লিষ্ট সরকারি কর্মকর্তার।',
            'disclaimer_en' => 'Disclaimer: BhumiShield flags risk for a human officer to decide. It never declares final legal truth.',
        ]);
    }

    public static function verifyFullLedger(int $limit = 25): array
    {
        $allDeeds = DB::select('SELECT * FROM deeds ORDER BY chain_index ASC');
        $summary = LedgerService::verifyEntireLedger($allDeeds);

        $firstChunk = array_slice($allDeeds, 0, 10);
        $tailChunk = count($allDeeds) > 10 ? array_slice($allDeeds, -max(0, $limit - 10)) : [];
        $combined = array_merge($firstChunk, $tailChunk);

        $seen = [];
        $chainItems = [];
        foreach ($combined as $d) {
            $id = (int) $d['id'];
            if (isset($seen[$id])) {
                continue;
            }
            $seen[$id] = true;
            $ver = LedgerService::verifyDeedRecord($d);
            $cObj = json_decode((string) $d['content_json'], true) ?: [];
            $oObj = json_decode((string) $d['original_content_json'], true) ?: [];
            $chainItems[] = [
                'id' => $id,
                'deed_no' => $d['deed_no'],
                'deed_type' => $d['deed_type'],
                'plot_id' => (int) $d['plot_id'],
                'chain_index' => (int) $d['chain_index'],
                'area_decimal' => (float) ($cObj['area_decimal'] ?? $d['area_decimal']),
                'original_area_decimal' => (float) ($oObj['area_decimal'] ?? $d['area_decimal']),
                'created_at' => $d['created_at'],
                'is_valid' => $ver['is_valid'],
                'hash_valid' => $ver['hash_valid'],
                'signature_valid' => $ver['signature_valid'],
                'stored_hash' => $ver['stored_hash'],
                'recomputed_hash' => $ver['recomputed_hash'],
                'prev_hash' => $ver['prev_hash'],
                'tampered_fields' => $ver['tampered_fields'],
            ];
        }
        $summary['chain_sample'] = $chainItems;
        return $summary;
    }

    public static function simulateTampering(string|int $deedIdOrNo, array $body = [], ?array $user = null): array
    {
        if (ctype_digit((string) $deedIdOrNo)) {
            $deed = DB::selectOne('SELECT * FROM deeds WHERE id = ?', [(int) $deedIdOrNo]);
        } else {
            $trimmed = trim((string) $deedIdOrNo);
            $deed = DB::selectOne('SELECT * FROM deeds WHERE deed_no = ?', [$trimmed]);
            if (!$deed && ($trimmed === 'DL-2024-1001' || $trimmed === 'DL-2026-1001')) {
                $deed = DB::selectOne("SELECT * FROM deeds WHERE deed_no IN ('DL-2026-1001', 'DL-2024-1001') ORDER BY id ASC LIMIT 1");
            }
        }
        if (!$deed) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'DEED_NOT_FOUND',
                'message_bn' => 'দলিলটি পাওয়া যায়নি।',
                'message_en' => 'Deed not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $deedId = (int) $deed['id'];
        $content = json_decode((string) $deed['content_json'], true) ?: [];
        $origContent = json_decode((string) $deed['original_content_json'], true) ?: [];
        $origArea = (float) ($origContent['area_decimal'] ?? $deed['area_decimal']);
        $tamperedArea = isset($body['new_area_decimal']) ? (float) $body['new_area_decimal'] : round($origArea + 15.0, 2);

        $content['area_decimal'] = $tamperedArea;
        if (isset($body['new_price_bdt'])) {
            $content['price_bdt'] = (int) $body['new_price_bdt'];
        }

        DB::statement(
            'UPDATE deeds SET content_json = ?, area_decimal = ? WHERE id = ?',
            [LedgerService::canonicalJson($content), $tamperedArea, $deedId]
        );

        $actor = $user ?? JwtAuthService::getAuthenticatedUser() ?? ['username' => 'admin', 'role' => 'admin'];
        DatabaseSeeder::appendAuditEntry(
            (string) ($actor['username'] ?? 'admin'),
            (string) ($actor['role'] ?? 'admin'),
            'DEMO_SIMULATE_TAMPER',
            'deed',
            (string) $deedId,
            [
                'deed_no' => $deed['deed_no'],
                'original_area_decimal' => $origArea,
                'tampered_area_decimal' => $tamperedArea,
                'note_bn' => 'ডেমো সিমুলেশন: ডাটাবেজে দলিলের জমির পরিমাণ পরিবর্তন করা হয়েছে (হ্যাশ অমিল প্রদর্শনের জন্য)',
            ],
            gmdate('c')
        );

        return self::verifySingleDeed((string) $deedId);
    }

    public static function restoreTamperedDeed(string|int $deedIdOrNo, ?array $user = null): array
    {
        if (ctype_digit((string) $deedIdOrNo)) {
            $deed = DB::selectOne('SELECT * FROM deeds WHERE id = ?', [(int) $deedIdOrNo]);
        } else {
            $trimmed = trim((string) $deedIdOrNo);
            $deed = DB::selectOne('SELECT * FROM deeds WHERE deed_no = ?', [$trimmed]);
            if (!$deed && ($trimmed === 'DL-2024-1001' || $trimmed === 'DL-2026-1001')) {
                $deed = DB::selectOne("SELECT * FROM deeds WHERE deed_no IN ('DL-2026-1001', 'DL-2024-1001') ORDER BY id ASC LIMIT 1");
            }
        }
        if (!$deed) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'DEED_NOT_FOUND',
                'message_bn' => 'দলিলটি পাওয়া যায়নি।',
                'message_en' => 'Deed not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $deedId = (int) $deed['id'];
        $origContent = json_decode((string) $deed['original_content_json'], true) ?: [];
        $origArea = (float) ($origContent['area_decimal'] ?? $deed['area_decimal']);

        DB::statement(
            'UPDATE deeds SET content_json = ?, area_decimal = ? WHERE id = ?',
            [$deed['original_content_json'], $origArea, $deedId]
        );

        $actor = $user ?? JwtAuthService::getAuthenticatedUser() ?? ['username' => 'admin', 'role' => 'admin'];
        DatabaseSeeder::appendAuditEntry(
            (string) ($actor['username'] ?? 'admin'),
            (string) ($actor['role'] ?? 'admin'),
            'DEMO_RESTORE_DEED',
            'deed',
            (string) $deedId,
            [
                'deed_no' => $deed['deed_no'],
                'restored_area_decimal' => $origArea,
                'note_bn' => 'ডেমো সিমুলেশন: দলিলের মূল তথ্য পুনরুদ্ধার করা হয়েছে',
            ],
            gmdate('c')
        );

        return self::verifySingleDeed((string) $deedId);
    }
}
