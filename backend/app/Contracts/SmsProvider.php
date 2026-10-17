<?php

declare(strict_types=1);

namespace App\Contracts;

/**
 * Contract for SMS and OTP Dispatch.
 * In production: Real SMS gateway (e.g. Teletalk / GP / InfoBip).
 * In non-production: Outbox driver logging to outbox table and viewer.
 */
interface SmsProvider
{
    /**
     * Dispatch one-time-password (OTP).
     *
     * @param string $phone Recipient phone number (synthetic or real)
     * @param string $otp 6-digit numeric OTP code
     * @param string $purpose Reason for OTP (e.g. LOGIN, CO_OWNER_CONSENT, TRANSFER_INIT)
     * @param array $meta Additional metadata
     */
    public function sendOtp(string $phone, string $otp, string $purpose, array $meta = []): bool;

    /**
     * Dispatch general transactional SMS notification.
     */
    public function sendMessage(string $phone, string $message, string $category = 'NOTIFICATION'): bool;

    /**
     * Retrieve recent outbox messages for developer/operator inspection.
     *
     * @param int $limit
     * @param string|null $phone
     * @return array<int, array{
     *     id: int,
     *     recipient_phone: string,
     *     message: string,
     *     otp_code: string|null,
     *     purpose: string,
     *     status: string,
     *     created_at: string
     * }>
     */
    public function getOutbox(int $limit = 50, ?string $phone = null): array;
}
