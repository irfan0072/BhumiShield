<?php

declare(strict_types=1);

namespace App\Services;

use App\Support\DB;

/**
 * MockBiometricProvider simulates live counter biometric verification for LandTech 2026.
 * It simulates camera face liveness and fingerprint matching against the National Identity database.
 * No raw biometric images or templates are ever stored.
 */
final class MockBiometricProvider implements BiometricProvider
{
    public function verifyCounterBiometrics(array $party, array $options = []): array
    {
        $nid = trim((string) ($party['nid'] ?? ''));
        $role = strtoupper(trim((string) ($party['role'] ?? 'SELLER')));
        $modality = strtoupper(trim((string) ($options['modality'] ?? 'DUAL')));
        $terminalId = (string) ($options['terminal_id'] ?? 'TERM-SR-SAVAR-01');
        $officerId = (string) ($options['officer_id'] ?? 'registrar');

        // Deterministic high-confidence simulation
        $score = 0.985;
        $isMatch = true;

        // If NID is empty or explicitly flagged as invalid/impostor
        if ($nid === '' || str_starts_with($nid, '0000')) {
            $isMatch = false;
            $score = 0.42;
        }

        $nonce = 'NONCE-' . strtoupper(substr(hash('sha256', $nid . microtime(true)), 0, 8));
        $transactionId = sprintf('BIO-%s-%s', strtoupper(substr(hash('sha256', $nid), 0, 6)), strtoupper($role));

        $notesBn = $isMatch
            ? 'কাউন্টার ওয়েবক্যাম লাইভনেস এবং অপটিক্যাল ফিঙ্গারপ্রিন্ট সফলভাবে মিলেছে (স্কোর: ৯৮.৫%)।'
            : 'সতর্কতা: মুখের বায়োমেট্রিক বা ফিঙ্গারপ্রিন্ট ডাটার অমিল সনাক্ত হয়েছে!';

        $record = [
            'transaction_id' => $transactionId,
            'party_nid' => $nid,
            'party_role' => $role,
            'modality' => $modality,
            'match_status' => $isMatch ? 'MATCH' : 'MISMATCH',
            'match_score' => $score,
            'terminal_id' => $terminalId,
            'officer_id' => $officerId,
            'liveness_nonce' => $nonce,
            'verified_at' => gmdate('c'),
            'notes_bn' => $notesBn,
        ];

        // Store audit record if transfer_id is provided
        if (!empty($options['transfer_id'])) {
            DB::insert(
                'INSERT INTO biometric_verifications (transaction_id, transfer_id, party_nid, party_role, modality, match_status, match_score, terminal_id, officer_id, liveness_nonce, verified_at, notes_bn) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $record['transaction_id'],
                    (int) $options['transfer_id'],
                    $record['party_nid'],
                    $record['party_role'],
                    $record['modality'],
                    $record['match_status'],
                    $record['match_score'],
                    $record['terminal_id'],
                    $record['officer_id'],
                    $record['liveness_nonce'],
                    $record['verified_at'],
                    $record['notes_bn'],
                ]
            );
        }

        return $record;
    }
}
