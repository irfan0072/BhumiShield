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
        $cleanNid = preg_replace('/\s+/', '', trim($nid));
        $cleanDob = trim($dob);
        $start = microtime(true);

        // 1. Strict regex validation for Bangladesh NIDs: 10-digit smart, 13-digit legacy, 17-digit legacy
        if (!preg_match('/^(?:[0-9]{10}|[0-9]{13}|[0-9]{17})$/', $cleanNid)) {
            return [
                'verified' => false,
                'matched' => false,
                'code' => 'INVALID_NID_FORMAT',
                'message_bn' => 'অবৈধ এনআইডি নম্বর ফরম্যাট',
                'message_en' => 'Invalid NID number format',
                'latency_ms' => 15,
                'provider' => 'simulated_ec',
            ];
        }

        // 2. Validate DOB format and extract 4-digit birth year
        if ($cleanDob === '' || !preg_match('/^(\d{4})/', $cleanDob, $dobParts)) {
            return [
                'verified' => false,
                'matched' => false,
                'code' => 'DOB_MISMATCH',
                'message_bn' => 'জন্ম তারিখের তথ্যে গরমিল রয়েছে।',
                'message_en' => 'Valid date of birth required for NID verification.',
                'latency_ms' => 15,
                'provider' => 'simulated_ec',
            ];
        }
        $birthYear = $dobParts[1];

        // 3. Normalization and Cross-Check:
        // - 13-digit legacy: prefix with 4-digit birth year from DOB
        // - 17-digit legacy: verify first 4 digits match birth year
        $nidLen = strlen($cleanNid);
        if ($nidLen === 13) {
            $lookupNid = $birthYear . $cleanNid;
        } elseif ($nidLen === 17) {
            if (substr($cleanNid, 0, 4) !== $birthYear) {
                return [
                    'verified' => false,
                    'matched' => false,
                    'code' => 'DOB_MISMATCH',
                    'message_bn' => 'জন্ম তারিখের সাথে এনআইডি নম্বরের অসঙ্গতি',
                    'message_en' => 'Date of birth does not match NID birth year',
                    'latency_ms' => 15,
                    'provider' => 'simulated_ec',
                ];
            }
            $lookupNid = $cleanNid;
        } else {
            $lookupNid = $cleanNid;
        }

        // 4. Realistic network latency simulation (300ms–500ms delay)
        if (getenv('SIMULATE_GATEWAY_LATENCY') !== '0') {
            usleep(random_int(300000, 500000));
        }
        $latencyMs = (int) round((microtime(true) - $start) * 1000);

        // 5. Query synthetic identity registry (sim_persons). Fail-closed: NO auto-insert backdoor!
        $row = DB::selectOne('SELECT * FROM sim_persons WHERE nid = ? LIMIT 1', [$lookupNid]);
        if (!$row && $nidLen === 13) {
            $row = DB::selectOne('SELECT * FROM sim_persons WHERE nid = ? LIMIT 1', [$cleanNid]);
        }

        if (!$row) {
            return [
                'verified' => false,
                'matched' => false,
                'code' => 'NID_NOT_FOUND',
                'message_bn' => 'নির্বাচন কমিশন ডাটাবেজে এনআইডি পাওয়া যায়নি',
                'message_en' => 'NID not found in Election Commission database',
                'latency_ms' => $latencyMs,
                'provider' => 'simulated_ec',
            ];
        }

        // 6. Accurate DOB matching
        if (trim((string) $row['dob']) !== $cleanDob) {
            return [
                'verified' => false,
                'matched' => false,
                'code' => 'DOB_MISMATCH',
                'message_bn' => 'জন্ম তারিখের তথ্যে গরমিল রয়েছে।',
                'message_en' => 'Date of birth mismatch.',
                'latency_ms' => $latencyMs,
                'provider' => 'simulated_ec',
            ];
        }

        // 7. Accurate Name matching (case & whitespace trimming)
        if ($fullName !== null && trim($fullName) !== '') {
            $inputName = mb_strtolower(preg_replace('/\s+/', ' ', trim($fullName)));
            $enName = mb_strtolower(preg_replace('/\s+/', ' ', trim((string) ($row['full_name_en'] ?? ''))));
            $bnName = preg_replace('/\s+/', ' ', trim((string) ($row['full_name_bn'] ?? '')));

            $cleanInput = preg_replace('/^(md\.?|mst\.?|মো\.?|মোসা\.?)\s+/iu', '', $inputName);
            $cleanEn = preg_replace('/^(md\.?|mst\.?)\s+/iu', '', $enName);
            $cleanBn = preg_replace('/^(মো\.?|মোসা\.?)\s+/u', '', $bnName);

            $nameMatches = ($inputName === $enName)
                || ($inputName === mb_strtolower($bnName))
                || ($cleanInput === $cleanEn)
                || ($cleanInput === mb_strtolower($cleanBn))
                || str_contains($enName, $inputName)
                || str_contains($inputName, $cleanEn)
                || str_contains($bnName, trim($fullName));

            if (!$nameMatches) {
                return [
                    'verified' => false,
                    'matched' => false,
                    'code' => 'NAME_MISMATCH',
                    'message_bn' => 'নামের তথ্যে গরমিল রয়েছে।',
                    'message_en' => 'Name mismatch.',
                    'latency_ms' => $latencyMs,
                    'provider' => 'simulated_ec',
                ];
            }
        }

        return [
            'verified' => true,
            'matched' => true,
            'code' => 'MATCHED',
            'nid' => (string) $row['nid'],
            'normalized_nid' => $lookupNid,
            'full_name_bn' => (string) $row['full_name_bn'],
            'full_name_en' => (string) $row['full_name_en'],
            'dob' => (string) $row['dob'],
            'father_name_bn' => (string) $row['father_name_bn'],
            'mother_name_bn' => (string) $row['mother_name_bn'],
            'address_bn' => (string) ($row['address_bn'] ?? ''),
            'status' => 'ACTIVE_VOTER',
            'verification_score' => 98.4,
            'latency_ms' => $latencyMs,
            'provider' => 'simulated_ec',
            'message_bn' => 'এনআইডি তথ্য সঠিক ও যাচাইকৃত।',
            'message_en' => 'National ID verified successfully.',
        ];
    }

    public function lookup(string $nid): ?array
    {
        $cleanNid = preg_replace('/\s+/', '', trim($nid));
        if (!preg_match('/^(?:[0-9]{10}|[0-9]{13}|[0-9]{17})$/', $cleanNid)) {
            return null;
        }

        $row = DB::selectOne('SELECT * FROM sim_persons WHERE nid = ? LIMIT 1', [$cleanNid]);
        if (!$row && strlen($cleanNid) === 13) {
            // Check if stored with 4-digit prefix
            $row = DB::selectOne('SELECT * FROM sim_persons WHERE nid LIKE ? LIMIT 1', ['%' . $cleanNid]);
        }
        if (!$row) {
            return null;
        }

        return [
            'nid' => (string) $row['nid'],
            'full_name_bn' => (string) $row['full_name_bn'],
            'full_name_en' => (string) $row['full_name_en'],
            'dob' => (string) $row['dob'],
            'father_name_bn' => (string) $row['father_name_bn'],
            'mother_name_bn' => (string) $row['mother_name_bn'],
            'address_bn' => (string) ($row['address_bn'] ?? ''),
        ];
    }
}
