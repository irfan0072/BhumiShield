<?php

declare(strict_types=1);

namespace App\Simulators;

use App\Contracts\NidVerificationProvider;
use App\Support\DB;

/**
 * Simulated Election Commission NID Verification Driver.
 * Reads from the isolated synthetic identity registry in `sim_persons`.
 */
class SimulatedNidProvider implements NidVerificationProvider
{
    public function verifyNid(string $nid, string $dob, ?string $fullName = null): array
    {
        $cleanNid = trim($nid);
        $cleanDob = trim($dob);
        $start = microtime(true);

        $row = DB::selectOne('SELECT * FROM sim_persons WHERE nid = ? LIMIT 1', [$cleanNid]);

        if (!$row) {
            // Check if person exists in main persons table to auto-sync synthetic registry
            $person = DB::selectOne('SELECT * FROM persons WHERE nid = ? LIMIT 1', [$cleanNid]);
            if ($person) {
                DB::insert(
                    'INSERT OR IGNORE INTO sim_persons (nid, full_name_bn, full_name_en, dob, father_name_bn, mother_name_bn, address_bn, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        $cleanNid,
                        $person['name_bn'] ?? ($person['full_name_bn'] ?? 'নাগরিক'),
                        $person['name_en'] ?? ($person['full_name_en'] ?? 'Citizen'),
                        $cleanDob ?: ($person['dob'] ?? '1985-05-15'),
                        $person['father_name_bn'] ?? 'মৃত মো. রহিম উদ্দিন',
                        $person['mother_name_bn'] ?? 'মোসা. ফাতেমা বেগম',
                        'গ্রাম: বিরুলিয়া, থানা: সাভার, জেলা: ঢাকা',
                        gmdate('c'),
                    ]
                );
                $row = DB::selectOne('SELECT * FROM sim_persons WHERE nid = ? LIMIT 1', [$cleanNid]);
            }
        }

        $latencyMs = (int) round((microtime(true) - $start) * 1000) + 15; // Realistic EC network latency

        if (!$row) {
            return [
                'matched' => false,
                'nid' => $cleanNid,
                'full_name_bn' => '',
                'full_name_en' => '',
                'dob' => '',
                'father_name_bn' => '',
                'mother_name_bn' => '',
                'photo_url' => null,
                'latency_ms' => $latencyMs,
                'provider' => 'simulated_ec',
                'message_bn' => 'জাতীয় পরিচয়পত্র সার্ভারে এই এনআইডি নম্বরটি পাওয়া যায়নি।',
                'message_en' => 'National ID not found in verification registry.',
            ];
        }

        $dobMatches = empty($cleanDob) || trim((string) $row['dob']) === $cleanDob;

        return [
            'matched' => $dobMatches,
            'nid' => (string) $row['nid'],
            'full_name_bn' => (string) $row['full_name_bn'],
            'full_name_en' => (string) $row['full_name_en'],
            'dob' => (string) $row['dob'],
            'father_name_bn' => (string) $row['father_name_bn'],
            'mother_name_bn' => (string) $row['mother_name_bn'],
            'photo_url' => null,
            'latency_ms' => $latencyMs,
            'provider' => 'simulated_ec',
            'message_bn' => $dobMatches ? 'এনআইডি তথ্য সঠিক ও যাচাইকৃত।' : 'জন্ম তারিখের তথ্যে গরমিল রয়েছে।',
            'message_en' => $dobMatches ? 'National ID verified.' : 'Date of birth mismatch.',
        ];
    }

    public function lookup(string $nid): ?array
    {
        $cleanNid = trim($nid);
        $row = DB::selectOne('SELECT * FROM sim_persons WHERE nid = ? LIMIT 1', [$cleanNid]);
        if (!$row) {
            $person = DB::selectOne('SELECT * FROM persons WHERE nid = ? LIMIT 1', [$cleanNid]);
            if ($person) {
                return [
                    'nid' => (string) $person['nid'],
                    'full_name_bn' => (string) ($person['name_bn'] ?? ($person['full_name_bn'] ?? 'নাগরিক')),
                    'full_name_en' => (string) ($person['name_en'] ?? ($person['full_name_en'] ?? 'Citizen')),
                    'dob' => (string) ($person['dob'] ?? '1985-05-15'),
                ];
            }
            return null;
        }
        return [
            'nid' => (string) $row['nid'],
            'full_name_bn' => (string) $row['full_name_bn'],
            'full_name_en' => (string) $row['full_name_en'],
            'dob' => (string) $row['dob'],
        ];
    }
}
