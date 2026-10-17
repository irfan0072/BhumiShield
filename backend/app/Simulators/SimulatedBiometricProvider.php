<?php

declare(strict_types=1);

namespace App\Simulators;

use App\Contracts\BiometricProvider;
use App\Support\DB;

/**
 * Simulated Privacy-Preserving Counter Biometrics Driver.
 * Bound to 2-minute session nonces, terminal IDs, and client presentation tokens.
 * Zero image frames are ever transmitted or saved.
 */
class SimulatedBiometricProvider implements BiometricProvider
{
    public function createSession(
        string $partyType,
        string $nationalId,
        string $terminalId,
        int $officerUserId,
        ?int $transferId = null
    ): array {
        $sessionId = sprintf('BIO-%s-%s', gmdate('YmdHis'), bin2hex(random_bytes(4)));
        $challengeNonce = bin2hex(random_bytes(16));
        $now = time();
        $expiresAt = gmdate('c', $now + 120); // 2-minute challenge lifetime

        DB::insert(
            'INSERT INTO sim_biometric_sessions
             (session_id, challenge_nonce, party_type, national_id, terminal_id, officer_user_id, transfer_id, attempts_count, is_verified, expires_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)',
            [
                $sessionId,
                $challengeNonce,
                strtoupper(trim($partyType)),
                trim($nationalId),
                trim($terminalId),
                $officerUserId,
                $transferId,
                $expiresAt,
                gmdate('c', $now),
            ]
        );

        return [
            'session_id' => $sessionId,
            'challenge_nonce' => $challengeNonce,
            'expires_at' => $expiresAt,
            'terminal_id' => $terminalId,
            'party_type' => strtoupper(trim($partyType)),
        ];
    }

    public function verifyPresentation(
        string $sessionId,
        string $presentationToken,
        ?string $overrideReason = null,
        ?int $supervisorUserId = null
    ): array {
        $session = DB::selectOne('SELECT * FROM sim_biometric_sessions WHERE session_id = ? LIMIT 1', [$sessionId]);

        if (!$session) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'BIOMETRIC_SESSION_NOT_FOUND',
                'message_bn' => 'বায়োমেট্রিক সেশন পাওয়া যায়নি।',
                'message_en' => 'Biometric session not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        if (strtotime((string) $session['expires_at']) < time()) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'BIOMETRIC_SESSION_EXPIRED',
                'message_bn' => 'বায়োমেট্রিক সেশনের ২ মিনিটের সময়সীমা অতিক্রান্ত হয়েছে। পুনরায় শুরু করুন।',
                'message_en' => 'Biometric challenge expired. Please generate a new session.',
            ], JSON_UNESCAPED_UNICODE));
        }

        if (!empty($session['is_verified'])) {
            throw new \RuntimeException(json_encode([
                'status' => 409,
                'code' => 'BIOMETRIC_SESSION_ALREADY_VERIFIED',
                'message_bn' => 'এই বায়োমেট্রিক সেশনটি ইতোমধ্যে সফলভাবে যাচাই সম্পন্ন হয়েছে (রিপ্লে প্রতিরোধ)।',
                'message_en' => 'Biometric session already verified (replay rejected).',
            ], JSON_UNESCAPED_UNICODE));
        }

        $attempts = (int) $session['attempts_count'] + 1;
        $nowIso = gmdate('c');

        // Check if supervisor override is provided
        if (!empty($overrideReason) && !empty($supervisorUserId)) {
            DB::statement(
                'UPDATE sim_biometric_sessions
                 SET attempts_count = ?, is_verified = 1, match_score = 99.0, supervisor_override_by = ?, override_reason = ?, verified_at = ?
                 WHERE session_id = ?',
                [$attempts, $supervisorUserId, trim($overrideReason), $nowIso, $sessionId]
            );

            $this->recordVerificationProof($session, true, 99.0, $supervisorUserId, $overrideReason);

            return [
                'verified' => true,
                'score' => 99.0,
                'match_status' => 'SUPERVISOR_OVERRIDE',
                'attempts_count' => $attempts,
                'session_id' => $sessionId,
                'terminal_id' => (string) $session['terminal_id'],
                'officer_id' => (int) $session['officer_user_id'],
                'verified_at' => $nowIso,
                'message_bn' => 'সুপারভাইজার অনুমোদনক্রমে বায়োমেট্রিক অডিট সম্পন্ন হয়েছে।',
                'message_en' => 'Biometric verification approved by supervisor override.',
            ];
        }

        // Enforce max 3 attempts before supervisor override is strictly required
        if ($attempts > 3) {
            DB::statement('UPDATE sim_biometric_sessions SET attempts_count = ? WHERE session_id = ?', [$attempts, $sessionId]);
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'SUPERVISOR_OVERRIDE_REQUIRED',
                'message_bn' => 'বায়োমেট্রিক যাচাই ৩ বার ব্যর্থ হয়েছে। সহকারী কমিশনার বা সাব-রেজিস্ট্রারের লিখিত অনুমোদন প্রয়োজন।',
                'message_en' => 'Biometric verification failed 3 times. Supervisor manual override required.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // Compare presentation token against synthetic enrollment
        $nid = (string) $session['national_id'];
        $enrollment = DB::selectOne('SELECT * FROM sim_biometric_enrollments WHERE nid = ? LIMIT 1', [$nid]);

        $score = $enrollment ? (float) $enrollment['default_match_score'] : (92.0 + (abs(crc32($nid)) % 7));
        $hasDefect = $enrollment && !empty($enrollment['has_defect']);

        if ($hasDefect || strlen($presentationToken) < 16) {
            $score = 48.5; // low confidence
        }

        $matched = ($score >= 70.0);
        $statusStr = $matched ? 'MATCH' : 'LOW_CONFIDENCE';

        DB::statement(
            'UPDATE sim_biometric_sessions
             SET attempts_count = ?, is_verified = ?, match_score = ?, verified_at = ?
             WHERE session_id = ?',
            [$attempts, $matched ? 1 : 0, $score, $nowIso, $sessionId]
        );

        if ($matched) {
            $this->recordVerificationProof($session, true, $score, null, null);
        }

        return [
            'verified' => $matched,
            'score' => $score,
            'match_status' => $statusStr,
            'attempts_count' => $attempts,
            'session_id' => $sessionId,
            'terminal_id' => (string) $session['terminal_id'],
            'officer_id' => (int) $session['officer_user_id'],
            'verified_at' => $nowIso,
            'message_bn' => $matched ? 'বায়োমেট্রিক আঙ্গুলের ছাপ ও ফেস ম্যাচ সফল হয়েছে।' : 'বায়োমেট্রিক ম্যাচ স্কোরে পর্যাপ্ত আস্থা পাওয়া যায়নি। পুনরায় চেষ্টা করুন।',
            'message_en' => $matched ? 'Biometric presentation verified.' : 'Low match confidence. Please retry.',
        ];
    }

    public function getSession(string $sessionId): ?array
    {
        return DB::selectOne('SELECT * FROM sim_biometric_sessions WHERE session_id = ? LIMIT 1', [trim($sessionId)]);
    }

    private function recordVerificationProof(
        array $session,
        bool $matched,
        float $score,
        ?int $supervisorOverrideBy,
        ?string $overrideReason
    ): void {
        $person = DB::selectOne('SELECT id FROM persons WHERE nid = ? LIMIT 1', [$session['national_id']]);
        $personId = $person ? (int) $person['id'] : 1;

        try {
            DB::insert(
                'INSERT INTO biometric_verifications
                 (transfer_id, party_type, person_id, terminal_id, officer_user_id, verified, confidence_score, session_code, supervisor_override, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $session['transfer_id'] ?? null,
                    $session['party_type'],
                    $personId,
                    $session['terminal_id'],
                    $session['officer_user_id'],
                    $matched ? 1 : 0,
                    $score,
                    $session['session_id'],
                    $supervisorOverrideBy ? 1 : 0,
                    gmdate('c'),
                ]
            );
        } catch (\Throwable) {
            // Already recorded or column variant handled gracefully
        }
    }
}
