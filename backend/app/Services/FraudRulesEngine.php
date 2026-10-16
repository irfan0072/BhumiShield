<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Pure, Independent Fraud & Discrepancy Rules Engine for BhumiShield (Laravel PHP 8.4).
 *
 * Implements all 9 fraud rules:
 * 1. SELLER_NOT_OWNER
 * 2. AREA_EXCEEDS_OWNED
 * 3. DOUBLE_SALE
 * 4. KHATIAN_CHAIN_BREAK
 * 5. DEED_TAMPERED
 * 6. PLOT_MORTGAGED
 * 7. RAPID_RESALE
 * 8. INHERITANCE_UNRESOLVED
 * 9. NID_MISMATCH
 */
final class FraudRulesEngine
{
    public static function toBnNum(int|float|string $val): string
    {
        return strtr((string) $val, [
            '0' => '০', '1' => '১', '2' => '২', '3' => '৩', '4' => '৪',
            '5' => '৫', '6' => '৬', '7' => '৭', '8' => '৮', '9' => '৯',
        ]);
    }

    public static function checkSellerNotOwner(
        ?int $sellerId,
        array $latestOwnerships,
        ?array $sellerPerson = null,
        string $latestKhatianNo = ''
    ): ?array {
        if ($sellerId === null) {
            return null;
        }
        $ownerIds = [];
        $namesBn = [];
        $namesEn = [];
        foreach ($latestOwnerships as $o) {
            if ((float) ($o['area_decimal'] ?? 0) > 0) {
                $ownerIds[] = (int) $o['person_id'];
                if (!empty($o['owner_name_bn'])) {
                    $namesBn[] = $o['owner_name_bn'];
                }
                if (!empty($o['owner_name_en'])) {
                    $namesEn[] = $o['owner_name_en'];
                }
            }
        }
        if (in_array($sellerId, $ownerIds, true)) {
            return null;
        }

        $sellerBn = $sellerPerson['name_bn'] ?? ('ব্যক্তি #' . self::toBnNum($sellerId));
        $sellerEn = $sellerPerson['name_en'] ?? "Person #{$sellerId}";
        $recBn = !empty($namesBn) ? implode(', ', $namesBn) : 'অন্য ব্যক্তি';
        $recEn = !empty($namesEn) ? implode(', ', $namesEn) : 'Another party';
        $kNoBn = self::toBnNum($latestKhatianNo ?: 'N/A');

        return [
            'rule_id' => 'SELLER_NOT_OWNER',
            'severity' => 'HIGH_RISK',
            'score_delta' => 85,
            'title_bn' => 'বিক্রেতা সর্বশেষ খতিয়ানের মালিক নন',
            'title_en' => 'Seller Is Not Recorded Owner on Latest Khatian',
            'message_bn' => "সর্বশেষ বিএস খতিয়ান নং {$kNoBn}-এ বিক্রেতা ({$sellerBn})-এর নাম নেই। রেকর্ডকৃত বর্তমান মালিক: {$recBn}।",
            'message_en' => "Seller ({$sellerEn}) is not listed on latest BS Khatian " . ($latestKhatianNo ?: 'N/A') . ". Recorded current owner(s): {$recEn}.",
            'evidence' => [
                'seller_id' => $sellerId,
                'seller_name_bn' => $sellerBn,
                'seller_name_en' => $sellerEn,
                'latest_khatian_no' => $latestKhatianNo,
                'recorded_owner_ids' => array_values(array_unique($ownerIds)),
            ],
        ];
    }

    public static function checkAreaExceedsOwned(
        ?int $sellerId,
        float $requestedAreaDecimal,
        array $latestOwnerships,
        array $existingDeeds
    ): ?array {
        if ($sellerId === null || $requestedAreaDecimal <= 0) {
            return null;
        }
        $sellerRows = array_values(array_filter(
            $latestOwnerships,
            fn(array $o) => (int) ($o['person_id'] ?? 0) === $sellerId
        ));
        if (empty($sellerRows)) {
            return null;
        }

        $ownedArea = 0.0;
        $shares = [];
        foreach ($sellerRows as $r) {
            $ownedArea += (float) ($r['area_decimal'] ?? 0);
            $shares[] = (string) ($r['share_fraction'] ?? '1/1');
        }
        $shareStr = implode(', ', $shares);

        $pendingSold = 0.0;
        foreach ($existingDeeds as $d) {
            if (
                (int) ($d['seller_id'] ?? 0) === $sellerId
                && ($d['deed_type'] ?? '') === 'SALE'
                && in_array($d['status'] ?? '', ['PENDING_MUTATION', 'REGISTERED'], true)
            ) {
                $pendingSold += (float) ($d['area_decimal'] ?? 0);
            }
        }
        $availableArea = max(0.0, $ownedArea - $pendingSold);

        if ($requestedAreaDecimal <= $availableArea + 1e-6) {
            return null;
        }

        $ownBn = self::toBnNum(number_format($ownedArea, 2));
        $availBn = self::toBnNum(number_format($availableArea, 2));
        $reqBn = self::toBnNum(number_format($requestedAreaDecimal, 2));
        $shBn = self::toBnNum($shareStr);

        return [
            'rule_id' => 'AREA_EXCEEDS_OWNED',
            'severity' => 'HIGH_RISK',
            'score_delta' => 80,
            'title_bn' => 'মালিকানাধীন অংশের চেয়ে বেশি জমি বিক্রয়ের চেষ্টা',
            'title_en' => "Requested Area Exceeds Seller's Owned / Available Share",
            'message_bn' => "বিক্রেতার মালিকানাধীন অংশ {$shBn} (মোট {$ownBn} শতাংশ; অবশিষ্ট বিক্রয়যোগ্য {$availBn} শতাংশ), কিন্তু {$reqBn} শতাংশ বিক্রির আবেদন করা হয়েছে।",
            'message_en' => sprintf(
                'Seller owns share %s (%.2f decimals total; %.2f decimals available after pending deeds), but attempted to transfer %.2f decimals.',
                $shareStr,
                $ownedArea,
                $availableArea,
                $requestedAreaDecimal
            ),
            'evidence' => [
                'seller_id' => $sellerId,
                'share_fraction' => $shareStr,
                'owned_area_decimal' => round($ownedArea, 2),
                'pending_committed_area_decimal' => round($pendingSold, 2),
                'available_area_decimal' => round($availableArea, 2),
                'requested_area_decimal' => round($requestedAreaDecimal, 2),
            ],
        ];
    }

    public static function checkDoubleSale(
        ?int $sellerId,
        float $requestedAreaDecimal,
        array $latestOwnerships,
        array $existingDeeds
    ): ?array {
        if ($sellerId === null) {
            return null;
        }
        $ownedArea = 0.0;
        foreach ($latestOwnerships as $o) {
            if ((int) ($o['person_id'] ?? 0) === $sellerId) {
                $ownedArea += (float) ($o['area_decimal'] ?? 0);
            }
        }

        $overlapping = [];
        foreach ($existingDeeds as $d) {
            if (
                (int) ($d['seller_id'] ?? 0) === $sellerId
                && ($d['deed_type'] ?? '') === 'SALE'
                && in_array($d['status'] ?? '', ['PENDING_MUTATION', 'REGISTERED'], true)
            ) {
                $overlapping[] = $d;
            }
        }
        if (empty($overlapping)) {
            return null;
        }

        $alreadySold = array_sum(array_map(fn(array $d) => (float) ($d['area_decimal'] ?? 0), $overlapping));
        if ($requestedAreaDecimal > 0 && ($alreadySold + $requestedAreaDecimal <= $ownedArea + 1e-6)) {
            return null;
        }

        $deedNos = implode(', ', array_map(fn(array $d) => (string) $d['deed_no'], $overlapping));
        $soldBn = self::toBnNum(number_format($alreadySold, 2));

        return [
            'rule_id' => 'DOUBLE_SALE',
            'severity' => 'HIGH_RISK',
            'score_delta' => 95,
            'title_bn' => 'একই জমি একাধিক ক্রেতার নিকট বিক্রয়ের চেষ্টা (ডাবল সেল)',
            'title_en' => 'Double Sale Detected (Active/Pending Deed Already Exists)',
            'message_bn' => "এই দাগে বিক্রেতা ইতিমধ্যে দলিল নং {$deedNos} মূলে {$soldBn} শতাংশ জমি বিক্রয় করেছেন (নামজারি প্রক্রিয়াধীন)। একই অংশ পুনরায় বিক্রয় করা যাবে না।",
            'message_en' => sprintf(
                'Seller already executed active/pending Sale Deed (%s) for %.2f decimals on this plot (mutation pending). Overlapping transfer blocked.',
                $deedNos,
                $alreadySold
            ),
            'evidence' => [
                'existing_deed_nos' => array_map(fn(array $d) => $d['deed_no'], $overlapping),
                'already_sold_area_decimal' => round($alreadySold, 2),
                'requested_area_decimal' => round($requestedAreaDecimal, 2),
                'owned_area_decimal' => round($ownedArea, 2),
            ],
        ];
    }

    public static function checkKhatianChainBreak(array $khatianRecords): ?array
    {
        if (empty($khatianRecords)) {
            return null;
        }
        $orderMap = ['CS' => 1, 'SA' => 2, 'RS' => 3, 'BS' => 4];
        usort(
            $khatianRecords,
            fn(array $a, array $b) => ($orderMap[$a['survey_type'] ?? ''] ?? 99) <=> ($orderMap[$b['survey_type'] ?? ''] ?? 99)
        );

        $explicitBreak = false;
        $areas = [];
        foreach ($khatianRecords as $k) {
            if (($k['status'] ?? 'VALID') === 'CHAIN_BREAK') {
                $explicitBreak = true;
            }
            $areas[] = (float) ($k['recorded_area_decimal'] ?? 0);
        }
        $maxDiff = !empty($areas) ? (max($areas) - min($areas)) : 0.0;

        if (!$explicitBreak && $maxDiff <= 0.05) {
            return null;
        }

        $diffBn = self::toBnNum(number_format($maxDiff, 2));
        return [
            'rule_id' => 'KHATIAN_CHAIN_BREAK',
            'severity' => 'REVIEW',
            'score_delta' => 50,
            'title_bn' => 'খতিয়ান চেইনে জমির পরিমাণ বা তথ্যের অমিল (CS → SA → RS → BS)',
            'title_en' => 'Khatian Survey Chain Discrepancy (CS -> SA -> RS -> BS)',
            'message_bn' => "পূর্ববর্তী জরিপের সাথে সর্বশেষ খতিয়ানের জমির পরিমাণে {$diffBn} শতাংশ অমিল পাওয়া গেছে। এসি ল্যান্ড ও সাব-রেজিস্ট্রারের ম্যানুয়াল যাচাই প্রয়োজন।",
            'message_en' => sprintf(
                'Recorded plot area differs by %.2f decimals across CS -> SA -> RS -> BS survey records. Manual verification required.',
                $maxDiff
            ),
            'evidence' => [
                'max_area_difference_decimal' => round($maxDiff, 2),
            ],
        ];
    }

    public static function checkDeedTampered(array $deedsOnPlot): ?array
    {
        foreach ($deedsOnPlot as $d) {
            $res = LedgerService::verifyDeedRecord($d);
            if (!$res['is_valid']) {
                return [
                    'rule_id' => 'DEED_TAMPERED',
                    'severity' => 'HIGH_RISK',
                    'score_delta' => 100,
                    'title_bn' => 'এই দলিলের তথ্য নিবন্ধনের পরে পরিবর্তন করা হয়েছে (টেম্পারিং সনাক্ত)',
                    'title_en' => 'Deed Content Altered After Registration (Cryptographic Hash Mismatch)',
                    'message_bn' => "দলিল নং {$res['deed_no']}-এর সংরক্ষিত তথ্যের সাথে ডিজিটাল স্বাক্ষর ও SHA-256 হ্যাশ মিলছে না! নিবন্ধনের পরে অবৈধভাবে জমির পরিমাণ বা তথ্য পরিবর্তন করা হয়েছে।",
                    'message_en' => "Deed {$res['deed_no']} failed SHA-256 hash and Ed25519 signature verification! Stored fields were modified after registration.",
                    'evidence' => [
                        'deed_id' => $res['deed_id'],
                        'deed_no' => $res['deed_no'],
                        'stored_hash' => $res['stored_hash'],
                        'recomputed_hash' => $res['recomputed_hash'],
                        'tampered_fields' => $res['tampered_fields'],
                    ],
                ];
            }
        }
        return null;
    }

    public static function checkPlotMortgaged(array $mortgagesLiens): ?array
    {
        $active = array_values(array_filter($mortgagesLiens, fn(array $m) => ($m['status'] ?? '') === 'ACTIVE'));
        if (empty($active)) {
            return null;
        }
        $first = $active[0];
        $totalBdt = array_sum(array_map(fn(array $m) => (int) ($m['amount_bdt'] ?? 0), $active));
        $banksBn = implode(', ', array_map(fn(array $m) => "{$m['bank_name_bn']} ({$m['branch_bn']})", $active));
        $banksEn = implode(', ', array_map(fn(array $m) => (string) $m['bank_name_en'], $active));
        $bdtBn = self::toBnNum(number_format($totalBdt));

        return [
            'rule_id' => 'PLOT_MORTGAGED',
            'severity' => 'HIGH_RISK',
            'score_delta' => 85,
            'title_bn' => 'জমিটি বর্তমানে ব্যাংকে বন্ধক (মর্টগেজ) রয়েছে',
            'title_en' => 'Active Bank Mortgage / Lien Exists on Plot',
            'message_bn' => "এই জমিটি {$banksBn}-এ মোট ৳{$bdtBn} টাকার ঋণের বিপরীতে সক্রিয়ভাবে বন্ধক রয়েছে। ব্যাংকের ঋণ পরিশোধের ছাড়পত্র ছাড়া নতুন বন্ধক বা মালিকানা হস্তান্তর স্থগিত।",
            'message_en' => sprintf(
                'This plot has an active mortgage lien of BDT %s with %s. Second mortgage or transfer without bank release letter is blocked.',
                number_format($totalBdt),
                $banksEn
            ),
            'evidence' => [
                'active_lien_count' => count($active),
                'primary_lien_id' => $first['id'] ?? null,
                'bank_name_bn' => $first['bank_name_bn'] ?? '',
                'bank_name_en' => $first['bank_name_en'] ?? '',
                'total_amount_bdt' => $totalBdt,
            ],
        ];
    }

    public static function checkRapidResale(
        array $existingDeeds,
        int $thresholdDays = 30,
        string $referenceIso = '2026-10-16T18:00:00+06:00'
    ): ?array {
        if (empty($existingDeeds)) {
            return null;
        }
        try {
            $refDt = new \DateTimeImmutable($referenceIso);
        } catch (\Throwable) {
            return null;
        }

        $recent = [];
        foreach ($existingDeeds as $d) {
            if (($d['deed_type'] ?? '') !== 'SALE') {
                continue;
            }
            try {
                $dt = new \DateTimeImmutable((string) ($d['created_at'] ?? ''));
                $days = (int) $refDt->diff($dt)->format('%r%a');
                $daysAgo = -$days;
                if ($daysAgo >= 0 && $daysAgo <= $thresholdDays) {
                    $recent[] = [$daysAgo, $d];
                }
            } catch (\Throwable) {
                continue;
            }
        }
        if (empty($recent)) {
            return null;
        }
        usort($recent, fn(array $a, array $b) => $a[0] <=> $b[0]);
        [$daysAgo, $recentDeed] = $recent[0];
        $daysBn = self::toBnNum($daysAgo);
        $thBn = self::toBnNum($thresholdDays);

        return [
            'rule_id' => 'RAPID_RESALE',
            'severity' => 'REVIEW',
            'score_delta' => 35,
            'title_bn' => "অস্বাভাবিক দ্রুত হাতবদল ({$daysBn} দিনের মধ্যে পুনরায় বিক্রয়)",
            'title_en' => "Rapid Resale Within Short Window ({$daysAgo} Days Since Last Deed)",
            'message_bn' => "এই জমিটি মাত্র {$daysBn} দিন আগে (দলিল নং {$recentDeed['deed_no']}) হস্তান্তরিত হয়েছে। {$thBn} দিনের কম সময়ে পুনরায় বিক্রয়ের ক্ষেত্রে সাব-রেজিস্ট্রারের অতিরিক্ত যাচাই আবশ্যক।",
            'message_en' => "This plot was transferred just {$daysAgo} days ago (Deed {$recentDeed['deed_no']}), within the {$thresholdDays}-day rapid-resale review window.",
            'evidence' => [
                'days_since_last_sale' => $daysAgo,
                'threshold_days' => $thresholdDays,
                'recent_deed_no' => $recentDeed['deed_no'],
            ],
        ];
    }

    public static function checkInheritanceUnresolved(
        ?array $sellerPerson,
        array $latestOwnerPersons,
        array $khatianRecords
    ): ?array {
        $candidates = array_merge($sellerPerson ? [$sellerPerson] : [], $latestOwnerPersons);
        $deceasedUnrecorded = [];
        foreach ($candidates as $p) {
            if (((int) ($p['is_deceased'] ?? 0)) === 1 && ((int) ($p['heirs_recorded'] ?? 1)) === 0) {
                $deceasedUnrecorded[] = $p;
            }
        }
        $khatianFlagged = array_filter($khatianRecords, fn(array $k) => ($k['status'] ?? '') === 'UNRESOLVED_HEIRS');
        if (empty($deceasedUnrecorded) && empty($khatianFlagged)) {
            return null;
        }

        $nameBn = $deceasedUnrecorded[0]['name_bn'] ?? 'রেকর্ডীয় মৃত মালিক';
        $nameEn = $deceasedUnrecorded[0]['name_en'] ?? 'Recorded Deceased Owner';

        return [
            'rule_id' => 'INHERITANCE_UNRESOLVED',
            'severity' => 'REVIEW',
            'score_delta' => 55,
            'title_bn' => 'মৃত মালিকের ওয়ারিশ সনদ ও ওয়ারিশান নামজারি অমীমাংসিত',
            'title_en' => 'Deceased Owner with Unresolved Heirs / Succession Mutation',
            'message_bn' => "রেকর্ডীয় মালিক ({$nameBn}) মৃত্যুবরণ করেছেন বলে ডেমো রেজিস্ট্রিতে চিহ্নিত, কিন্তু এখনো সকল বৈধ ওয়ারিশের নামজারি ও বণ্টননামা সম্পন্ন হয়নি। ম্যানুয়াল যাচাইয়ের জন্য প্রেরণ করুন।",
            'message_en' => "Recorded owner ({$nameEn}) is marked deceased without completed succession mutation for all legal heirs. Route to AC Land / Sub-Registrar for manual review.",
            'evidence' => [
                'deceased_owner_name_bn' => $nameBn,
                'deceased_owner_name_en' => $nameEn,
                'heirs_recorded' => false,
            ],
        ];
    }

    public static function checkNidMismatch(
        ?array $sellerPerson,
        ?string $submittedNid = null,
        ?string $submittedName = null
    ): ?array {
        if ($sellerPerson === null && $submittedNid === null) {
            return null;
        }
        $res = MockNidService::verify($sellerPerson, $submittedNid, $submittedName);
        if ($res['verified']) {
            return null;
        }
        return [
            'rule_id' => 'NID_MISMATCH',
            'severity' => 'HIGH_RISK',
            'score_delta' => 90,
            'title_bn' => 'জাতীয় পরিচয়পত্র (এনআইডি) তথ্যের অমিল',
            'title_en' => 'National ID (Mock NID Service) Verification Mismatch',
            'message_bn' => $res['message_bn'],
            'message_en' => $res['message_en'],
            'evidence' => $res,
        ];
    }

    public static function checkOwnerSaleLocked(array $plot): ?array
    {
        if (((int) ($plot["owner_sale_locked"] ?? 0)) !== 1) {
            return null;
        }
        $dagBn = $plot["dag_no_bn"] ?? self::toBnNum($plot["dag_no"] ?? "");
        return [
            "rule_id" => "OWNER_SALE_LOCKED",
            "severity" => "HIGH_RISK",
            "score_delta" => 100,
            "title_bn" => "নাগরিক মালিক কর্তৃক জমি বিক্রয় লক (Sale Lock) সক্রিয় রয়েছে",
            "title_en" => "Owner Sale Protection Lock Is Active on This Plot",
            "message_bn" => "দাগ নং {$dagBn}-এর প্রকৃত মালিক নাগরিক পোর্টাল হতে বিক্রয় লক (Sale Protection Lock) চালু রেখেছেন। মালিক নিজে লক না খোলা পর্যন্ত যেকোনো হস্তান্তর দলিল নিবন্ধন ব্লক করা হয়েছে।",
            "message_en" => "The recorded owner of Dag {$plot['dag_no']} has enabled the Citizen Sale Protection Lock. Registration is blocked until the owner unlocks the plot.",
            "evidence" => [
                "plot_id" => $plot["id"] ?? null,
                "owner_sale_locked" => true,
                "locked_by_nid" => $plot["locked_by_nid"] ?? null,
            ],
        ];
    }

    public static function checkActiveDisputes(array $disputes): ?array
    {
        $open = array_values(array_filter($disputes, fn(array $d) => ($d["status"] ?? "") === "OPEN"));
        if (empty($open)) {
            return null;
        }
        $first = $open[0];
        return [
            "rule_id" => "ACTIVE_DISPUTE",
            "severity" => "REVIEW",
            "score_delta" => 45,
            "title_bn" => "এই দাগে নাগরিকের দাখিলকৃত আপত্তি বা অভিযোগ (Dispute) বিচারাধীন রয়েছে",
            "title_en" => "Active Citizen Dispute / Objection Pending on Plot",
            "message_bn" => "অভিযোগ নং {$first['case_no']} ({$first['complainant_name_bn']}): {$first['description_bn']} — এসি ল্যান্ড ও সাব-রেজিস্ট্রারের শুনানি আবশ্যক।",
            "message_en" => "Dispute {$first['case_no']} ({$first['dispute_type']}): {$first['description_en']} — Requires officer review before transfer.",
            "evidence" => [
                "open_dispute_count" => count($open),
                "primary_case_no" => $first["case_no"],
            ],
        ];
    }

    public static function evaluatePlotAndTransaction(
        array $plot,
        array $khatianRecords,
        array $latestOwnerships,
        array $latestOwnerPersons,
        array $existingDeeds,
        array $mortgagesLiens,
        ?array $sellerPerson = null,
        float $requestedAreaDecimal = 0.0,
        ?string $submittedSellerNid = null,
        ?string $submittedSellerName = null,
        bool $checkRapidResaleFlag = false,
        array $disputes = []
    ): array {
        $sellerId = isset($sellerPerson['id']) ? (int) $sellerPerson['id'] : null;
        $bsKhatians = array_values(array_filter($khatianRecords, fn(array $k) => ($k['survey_type'] ?? '') === 'BS'));
        $latestKhatianNo = (string) ($bsKhatians[0]['khatian_no'] ?? '');

        $rawFlags = [
            self::checkOwnerSaleLocked($plot),
            self::checkDeedTampered($existingDeeds),
            self::checkActiveDisputes($disputes),
            self::checkSellerNotOwner($sellerId, $latestOwnerships, $sellerPerson, $latestKhatianNo),
            self::checkDoubleSale($sellerId, $requestedAreaDecimal, $latestOwnerships, $existingDeeds),
            self::checkAreaExceedsOwned($sellerId, $requestedAreaDecimal, $latestOwnerships, $existingDeeds),
            self::checkPlotMortgaged($mortgagesLiens),
            self::checkNidMismatch($sellerPerson, $submittedSellerNid, $submittedSellerName),
            self::checkKhatianChainBreak($khatianRecords),
            self::checkInheritanceUnresolved($sellerPerson, $latestOwnerPersons, $khatianRecords),
            $checkRapidResaleFlag ? self::checkRapidResale($existingDeeds) : null,
        ];

        $flags = array_values(array_filter($rawFlags, fn($f) => $f !== null));
        $hasHigh = false;
        $hasReview = false;
        $scoreSum = 0;

        foreach ($flags as $f) {
            if ($f['severity'] === 'HIGH_RISK') {
                $hasHigh = true;
            }
            if ($f['severity'] === 'REVIEW') {
                $hasReview = true;
            }
            $scoreSum += (int) ($f['score_delta'] ?? 0);
        }

        if ($hasHigh) {
            $verdict = 'HIGH_RISK';
            $badgeBn = '✖ ঝুঁকিপূর্ণ (আটকানো)';
            $badgeEn = '✖ High Risk (Hold / Block)';
            $summaryBn = 'এই জমির লেনদেনে গুরুতর ঝুঁকি বা জালিয়াতির লক্ষণ পাওয়া গেছে। এখনই নিবন্ধন বা অর্থ পরিশোধ করবেন না।';
            $summaryEn = 'Critical fraud or encumbrance risk detected on this plot/transaction. Do not proceed with registration or payment.';
            $nextBn = [
                'কোনো অবস্থাতেই এখন অগ্রিম টাকা বা বায়না পরিশোধ করবেন না।',
                'উপজেলা ভূমি অফিস (এসি ল্যান্ড) এবং সাব-রেজিস্ট্রি অফিসে মূল খতিয়ান ও বালাম বহি যাচাই করুন।',
                'ব্যাংক বন্ধক থাকলে সংশ্লিষ্ট ব্যাংকের ঋণমুক্তির প্রত্যয়নপত্র (Release Letter) সংগ্রহ করুন।',
            ];
            $nextEn = [
                'Do not pay any advance or earnest money at this stage.',
                'Verify original khatian and register volume at the AC Land and Sub-Registry offices.',
                'If mortgaged, require an official Bank Lien Release Certificate before proceeding.',
            ];
        } elseif ($hasReview) {
            $verdict = 'REVIEW';
            $badgeBn = '⚠ সতর্কতা (যাচাই প্রয়োজন)';
            $badgeEn = '⚠ Warning (Needs Review)';
            $summaryBn = 'এই জমির রেকর্ডে কিছু অসামঞ্জস্যতা রয়েছে যা মানব কর্মকর্তার (এসি ল্যান্ড / সাব-রেজিস্ট্রার) ম্যানুয়াল যাচাই প্রয়োজন।';
            $summaryEn = 'This plot has record discrepancies that require manual review by a human officer (AC Land / Sub-Registrar).';
            $nextBn = [
                'সংশ্লিষ্ট ইউনিয়ন ভূমি অফিস বা এসি ল্যান্ড অফিসে সিএস-এসএ-আরএস-বিএস খতিয়ান মিলিয়ে দেখুন।',
                'মালিক মৃত হলে ইউনিয়ন পরিষদের ওয়ারিশ সনদ ও ওয়ারিশান নামজারি খতিয়ান সম্পন্ন করুন।',
                'সাব-রেজিস্ট্রার কর্তৃক ম্যানুয়াল রিভিউ অনুমোদনের পরই কেবল দলিল নিবন্ধন করুন।',
            ];
            $nextEn = [
                'Reconcile CS, SA, RS, and BS khatian records at the Upazila Land (AC Land) Office.',
                'If the recorded owner is deceased, complete Succession Certificate and Heirs Mutation first.',
                'Proceed with registration only after manual officer review and sign-off.',
            ];
        } else {
            $verdict = 'SAFE';
            $badgeBn = '✔ নিরাপদ';
            $badgeEn = '✔ Safe & Verified';
            $summaryBn = 'মালিকানা চেইন (CS→SA→RS→BS), দলিলের ডিজিটাল স্বাক্ষর এবং ব্যাংক বন্ধক যাচাইয়ে কোনো ঝুঁকি পাওয়া যায়নি।';
            $summaryEn = 'Ownership chain (CS->SA->RS->BS), cryptographic deed ledger, and bank lien checks passed with zero flags.';
            $nextBn = [
                'সাব-রেজিস্ট্রি অফিসে প্রাক-নিবন্ধন যাচাই সম্পন্ন করে দলিল নিবন্ধন করতে পারেন।',
                'নিবন্ধনের পর কিউআর (QR) কোডযুক্ত দলিল সংগ্রহ করুন এবং ই-নামজারির আবেদন করুন।',
            ];
            $nextEn = [
                'You may proceed with deed registration at the Sub-Registry office.',
                'Collect your QR-coded digital deed receipt after registration and apply for e-Mutation.',
            ];
        }

        return [
            'plot_id' => isset($plot['id']) ? (int) $plot['id'] : null,
            'dag_no' => $plot['dag_no'] ?? null,
            'dag_no_bn' => $plot['dag_no_bn'] ?? null,
            'verdict' => $verdict,
            'risk_score' => min(100, $scoreSum),
            'badge_bn' => $badgeBn,
            'badge_en' => $badgeEn,
            'summary_bn' => $summaryBn,
            'summary_en' => $summaryEn,
            'flags' => $flags,
            'flag_count' => count($flags),
            'next_steps_bn' => $nextBn,
            'next_steps_en' => $nextEn,
            'disclaimer_bn' => 'বিশেষ দ্রষ্টব্য: ভূমি সুরক্ষা শুধুমাত্র সম্ভাব্য ঝুঁকি চিহ্নিত করে; চূড়ান্ত আইনি সিদ্ধান্ত সংশ্লিষ্ট সরকারি কর্মকর্তার।',
            'disclaimer_en' => 'Disclaimer: BhumiShield flags risk for a human officer to decide. It never declares final legal truth.',
        ];
    }
}
