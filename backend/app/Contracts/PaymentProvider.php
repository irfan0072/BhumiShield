<?php

declare(strict_types=1);

namespace App\Contracts;

/**
 * Contract for Fee and Mutation Payments.
 * In production: Real bKash / Nagad / Ekpay / Sonali eSheba payment gateway.
 * In development: Simulated MFS payment with automated callback and fee ledger entry.
 */
interface PaymentProvider
{
    /**
     * Initiate a payment session.
     *
     * @param string $payableType e.g. 'MUTATION_FEE', 'REGISTRATION_FEE', 'CERTIFICATE_FEE'
     * @param string|int $payableId Case ID, transfer code, or service order ID
     * @param float $amountBdt Fee in BDT
     * @param string $payerPhone Customer phone
     * @param string $gatewayMethod BKASH | NAGAD | ROCKET | EKPAY
     * @return array{
     *     payment_id: string,
     *     redirect_url: string,
     *     amount_bdt: float,
     *     expires_at: string
     * }
     */
    public function initiatePayment(
        string $payableType,
        string|int $payableId,
        float $amountBdt,
        string $payerPhone,
        string $gatewayMethod = 'BKASH'
    ): array;

    /**
     * Complete or verify payment status.
     *
     * @param string $paymentId
     * @return array{
     *     payment_id: string,
     *     status: string, // COMPLETED | PENDING | FAILED
     *     transaction_trx_id: string,
     *     amount_bdt: float,
     *     receipt_no: string,
     *     paid_at: string
     * }
     */
    public function verifyPayment(string $paymentId): array;

    /**
     * Record receipt into immutable fee ledger.
     */
    public function recordFeeLedger(
        string $feeCode,
        float $amountBdt,
        string $payerNid,
        string $serviceName,
        string $referenceCode
    ): array;
}
