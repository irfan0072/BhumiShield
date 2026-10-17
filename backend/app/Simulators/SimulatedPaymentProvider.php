<?php

declare(strict_types=1);

namespace App\Simulators;

use App\Contracts\PaymentProvider;
use App\Support\DB;

/**
 * Simulated MFS and Government e-Payment Gateway Driver.
 * Simulates bKash, Nagad, Rocket, and Ekpay fee collections with authentic receipts.
 */
class SimulatedPaymentProvider implements PaymentProvider
{
    public function initiatePayment(
        string $payableType,
        string|int $payableId,
        float $amountBdt,
        string $payerPhone,
        string $gatewayMethod = 'BKASH'
    ): array {
        $paymentId = sprintf('PAY-%s-%s', gmdate('YmdHis'), bin2hex(random_bytes(3)));
        $now = time();
        $expiresAt = gmdate('c', $now + 900); // 15-minute checkout window

        DB::insert(
            'INSERT INTO sim_mfs_transactions
             (payment_id, payable_type, payable_id, amount_bdt, payer_phone, gateway_method, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $paymentId,
                strtoupper(trim($payableType)),
                (string) $payableId,
                $amountBdt,
                trim($payerPhone),
                strtoupper(trim($gatewayMethod)),
                'PENDING',
                gmdate('c', $now),
            ]
        );

        return [
            'payment_id' => $paymentId,
            'redirect_url' => "/bn/payment/mfs?pid={$paymentId}",
            'amount_bdt' => $amountBdt,
            'expires_at' => $expiresAt,
            'gateway_method' => strtoupper(trim($gatewayMethod)),
        ];
    }

    public function verifyPayment(string $paymentId): array
    {
        $trx = DB::selectOne('SELECT * FROM sim_mfs_transactions WHERE payment_id = ? LIMIT 1', [trim($paymentId)]);

        if (!$trx) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'PAYMENT_NOT_FOUND',
                'message_bn' => 'পেমেন্ট রেকর্ড পাওয়া যায়নি।',
                'message_en' => 'Payment transaction record not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        if ($trx['status'] === 'COMPLETED') {
            return [
                'payment_id' => (string) $trx['payment_id'],
                'status' => 'COMPLETED',
                'transaction_trx_id' => (string) $trx['trx_id'],
                'amount_bdt' => (float) $trx['amount_bdt'],
                'receipt_no' => (string) $trx['receipt_no'],
                'paid_at' => (string) $trx['paid_at'],
            ];
        }

        $trxId = 'TRX-' . strtoupper(bin2hex(random_bytes(5)));
        $receiptNo = 'RCT-2026-' . random_int(100000, 999999);
        $paidAt = gmdate('c');

        DB::statement(
            'UPDATE sim_mfs_transactions
             SET status = ?, trx_id = ?, receipt_no = ?, paid_at = ?
             WHERE payment_id = ?',
            ['COMPLETED', $trxId, $receiptNo, $paidAt, trim($paymentId)]
        );

        return [
            'payment_id' => (string) $trx['payment_id'],
            'status' => 'COMPLETED',
            'transaction_trx_id' => $trxId,
            'amount_bdt' => (float) $trx['amount_bdt'],
            'receipt_no' => $receiptNo,
            'paid_at' => $paidAt,
        ];
    }

    public function recordFeeLedger(
        string $feeCode,
        float $amountBdt,
        string $payerNid,
        string $serviceName,
        string $referenceCode
    ): array {
        $receiptNo = 'GOV-FEE-' . gmdate('Ymd') . '-' . random_int(1000, 9999);
        $now = gmdate('c');

        // Audit log entry for official revenue ledger
        try {
            DB::insert(
                'INSERT INTO audit_log (user_username, user_role, action, target_type, target_id, details_json, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                    'system_payment_gateway',
                    'system',
                    'FEE_COLLECTION_RECORDED',
                    'fee_receipt',
                    $receiptNo,
                    json_encode([
                        'fee_code' => $feeCode,
                        'amount_bdt' => $amountBdt,
                        'payer_nid' => $payerNid,
                        'service_name' => $serviceName,
                        'reference_code' => $referenceCode,
                        'receipt_no' => $receiptNo,
                    ], JSON_UNESCAPED_UNICODE),
                    $now,
                ]
            );
        } catch (\Throwable) {}

        return [
            'receipt_no' => $receiptNo,
            'fee_code' => $feeCode,
            'amount_bdt' => $amountBdt,
            'recorded_at' => $now,
            'status' => 'CONFIRMED',
        ];
    }
}
