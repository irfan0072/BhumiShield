<?php

declare(strict_types=1);

namespace App\Contracts;

/**
 * Contract for National Identity (NID) Verification.
 * In production: Election Commission NID Verification Wing API.
 * In development/pilot: SimulatedNidProvider reading from synthetic identity registry.
 */
interface NidVerificationProvider
{
    /**
     * Verify NID number against date of birth and optional full name.
     *
     * @param string $nid 10 or 17 digit synthetic/real NID
     * @param string $dob YYYY-MM-DD
     * @param string|null $fullName optional name for fuzzy match
     * @return array{
     *     matched: bool,
     *     nid: string,
     *     full_name_bn: string,
     *     full_name_en: string,
     *     dob: string,
     *     father_name_bn: string,
     *     mother_name_bn: string,
     *     photo_url: string|null,
     *     latency_ms: int,
     *     provider: string
     * }
     */
    public function verifyNid(string $nid, string $dob, ?string $fullName = null): array;

    /**
     * Check if the NID exists in the registry.
     */
    public function lookup(string $nid): ?array;
}
