<?php

declare(strict_types=1);

namespace App\Contracts;

/**
 * Contract for Privacy-Preserving Counter Biometrics.
 * Production note: Requires Election Commission API authorization.
 * No camera frame or raw fingerprint is ever transmitted or stored.
 */
interface BiometricProvider
{
    /**
     * Start a 2-minute counter biometric session and generate challenge nonce.
     *
     * @param string $partyType SELLER | BUYER | HEIR
     * @param string $nationalId Synthetic NID of the party
     * @param string $terminalId Registered terminal ID (e.g. TRM-SR-01)
     * @param int $officerUserId Authenticated counter officer user ID
     * @param int|null $transferId Optional transfer request ID
     * @return array{
     *     session_id: string,
     *     challenge_nonce: string,
     *     expires_at: string,
     *     terminal_id: string,
     *     party_type: string
     * }
     */
    public function createSession(
        string $partyType,
        string $nationalId,
        string $terminalId,
        int $officerUserId,
        ?int $transferId = null
    ): array;

    /**
     * Verify presentation token against synthetic enrollment.
     *
     * @param string $sessionId Active session ID
     * @param string $presentationToken Hash of session nonce + client timestamp + client key
     * @param string|null $overrideReason Reason if supervisor override is invoked
     * @param int|null $supervisorUserId Supervisor user ID if override invoked
     * @return array{
     *     verified: bool,
     *     score: float,
     *     match_status: string, // MATCH | NO_MATCH | LOW_CONFIDENCE | SUPERVISOR_OVERRIDE
     *     attempts_count: int,
     *     session_id: string,
     *     terminal_id: string,
     *     officer_id: int,
     *     verified_at: string
     * }
     */
    public function verifyPresentation(
        string $sessionId,
        string $presentationToken,
        ?string $overrideReason = null,
        ?int $supervisorUserId = null
    ): array;

    /**
     * Inspect active session state.
     */
    public function getSession(string $sessionId): ?array;
}
