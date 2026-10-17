<?php

declare(strict_types=1);

namespace App\Simulators;

use App\Contracts\LandServiceGatewayAdapter;
use App\Services\LedgerService;
use App\Support\DB;

/**
 * Simulated Land Service Gateway (LSG) Adapter.
 * Reads from isolated synthetic gateway tables in `sim_gateway_holdings` and `sim_gateway_khatians`.
 */
class SimulatedLandServiceGateway implements LandServiceGatewayAdapter
{
    public function fetchHoldingTaxRecord(string $holdingNo, string $mouzaCode): ?array
    {
        $cleanHolding = trim($holdingNo);
        $cleanMouza = trim($mouzaCode);

        $row = DB::selectOne(
            'SELECT * FROM sim_gateway_holdings WHERE holding_no = ? AND mouza_code = ? LIMIT 1',
            [$cleanHolding, $cleanMouza]
        );

        if (!$row) {
            // Auto-populate synthetic holding record
            $dakhilaHash = hash('sha256', "TAX:{$cleanHolding}:{$cleanMouza}:2025-2026");
            $now = gmdate('c');
            DB::insert(
                'INSERT INTO sim_gateway_holdings
                 (holding_no, mouza_code, owner_name_bn, tax_status, fiscal_year, last_paid_amount, paid_at, dakhila_qr_hash, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $cleanHolding,
                    $cleanMouza,
                    'মো. রফিকুল ইসলাম ও অংশীদারগণ',
                    'PAID',
                    '২০২৫-২০২৬',
                    450.00,
                    $now,
                    $dakhilaHash,
                    $now,
                ]
            );

            $row = DB::selectOne(
                'SELECT * FROM sim_gateway_holdings WHERE holding_no = ? AND mouza_code = ? LIMIT 1',
                [$cleanHolding, $cleanMouza]
            );
        }

        return [
            'holding_no' => (string) $row['holding_no'],
            'mouza_code' => (string) $row['mouza_code'],
            'owner_name_bn' => (string) $row['owner_name_bn'],
            'tax_status' => (string) $row['tax_status'],
            'fiscal_year' => (string) $row['fiscal_year'],
            'last_paid_amount' => (float) $row['last_paid_amount'],
            'paid_at' => $row['paid_at'] ? (string) $row['paid_at'] : null,
            'dakhila_qr_hash' => (string) $row['dakhila_qr_hash'],
        ];
    }

    public function fetchLegacyKhatianPorcha(string $surveyType, string $khatianNo, string $mouzaCode): ?array
    {
        $survey = strtoupper(trim($surveyType));
        $khatian = trim($khatianNo);
        $mouza = trim($mouzaCode);

        $row = DB::selectOne(
            'SELECT * FROM sim_gateway_khatians WHERE survey_type = ? AND khatian_no = ? AND mouza_code = ? LIMIT 1',
            [$survey, $khatian, $mouza]
        );

        if (!$row) {
            $token = 'PORCHA-' . $survey . '-' . hash('sha256', "{$survey}:{$khatian}:{$mouza}");
            $now = gmdate('c');
            DB::insert(
                'INSERT INTO sim_gateway_khatians
                 (survey_type, khatian_no, mouza_code, recorded_owner_bn, total_area_decimal, verification_token, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                    $survey,
                    $khatian,
                    $mouza,
                    'হেমন্ত কুমার চক্রবর্তী ও অন্যান্য (ঐতিহাসিক রেকর্ড)',
                    12.50,
                    $token,
                    $now,
                ]
            );
            $row = DB::selectOne(
                'SELECT * FROM sim_gateway_khatians WHERE survey_type = ? AND khatian_no = ? AND mouza_code = ? LIMIT 1',
                [$survey, $khatian, $mouza]
            );
        }

        return [
            'survey_type' => (string) $row['survey_type'],
            'khatian_no' => (string) $row['khatian_no'],
            'mouza_code' => (string) $row['mouza_code'],
            'recorded_owner_bn' => (string) $row['recorded_owner_bn'],
            'total_area_decimal' => (float) $row['total_area_decimal'],
            'verification_token' => (string) $row['verification_token'],
            'is_authentic' => true,
        ];
    }

    public function verifyEporchaQrPayload(string $qrPayload): array
    {
        $trimmed = trim($qrPayload);
        $decoded = json_decode($trimmed, true);

        if (is_array($decoded) && isset($decoded['khatian_no'], $decoded['survey'])) {
            $canonical = LedgerService::canonicalJson($decoded);
            $hash = LedgerService::computeSha256($canonical);
            return [
                'valid' => true,
                'survey' => $decoded['survey'],
                'khatian_no' => $decoded['khatian_no'],
                'hash' => $hash,
                'provider' => 'land_service_gateway',
            ];
        }

        return [
            'valid' => str_starts_with($trimmed, 'PORCHA-') || strlen($trimmed) >= 32,
            'hash' => hash('sha256', $trimmed),
            'provider' => 'land_service_gateway',
        ];
    }
}
