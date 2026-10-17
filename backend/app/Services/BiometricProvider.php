<?php

declare(strict_types=1);

namespace App\Services;

interface BiometricProvider
{
    /**
     * Verifies party counter biometrics (camera face liveness and/or optical fingerprint).
     *
     * IMPORTANT: Under no circumstances should biometric templates (images, min-utiae)
     * be persisted. Only audit outcome records are retained.
     *
     * @param array $party Array containing party details (nid, name, role)
     * @param array $options Options including terminal_id, officer_id, modality
     * @return array Verification audit summary
     */
    public function verifyCounterBiometrics(array $party, array $options = []): array;
}
