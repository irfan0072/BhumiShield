<?php

declare(strict_types=1);

namespace App\Contracts;

/**
 * Contract for Land Service Gateway (LSG) integration.
 * In production: Ministry of Land LSG APIs (e-Porcha, e-Mutation, Land Development Tax).
 * In development: Reads from synthetic gateway records.
 */
interface LandServiceGatewayAdapter
{
    /**
     * Query Land Development (LD) Tax holding status.
     *
     * @param string $holdingNo
     * @param string $mouzaCode
     * @return array{
     *     holding_no: string,
     *     mouza_code: string,
     *     owner_name_bn: string,
     *     tax_status: string, // PAID | UNPAID | ARREARS
     *     fiscal_year: string,
     *     last_paid_amount: float,
     *     paid_at: string|null,
     *     dakhila_qr_hash: string
     * }|null
     */
    public function fetchHoldingTaxRecord(string $holdingNo, string $mouzaCode): ?array;

    /**
     * Query legacy khatian records (CS, SA, RS) from central e-Porcha repository.
     */
    public function fetchLegacyKhatianPorcha(string $surveyType, string $khatianNo, string $mouzaCode): ?array;

    /**
     * Verify an official e-Porcha digital QR envelope.
     */
    public function verifyEporchaQrPayload(string $qrPayload): array;
}
