<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Cryptographic Hash-Chained Deed Ledger & Ed25519 Digital Signature Service (PHP 8.4 ext-sodium).
 */
final class LedgerService
{
    public const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

    private static ?string $secretKey = null;
    private static ?string $publicKey = null;

    private static function ensureKeypair(): void
    {
        if (self::$secretKey !== null && self::$publicKey !== null) {
            return;
        }
        $seedHex = (string) env(
            'REGISTRAR_ED25519_SEED_HEX',
            '4268756d69536869656c644c616e64546563683230323644656d6f5365656421'
        );
        $seed = @hex2bin($seedHex);
        if ($seed === false || strlen($seed) !== SODIUM_CRYPTO_SIGN_SEEDBYTES) {
            $seed = hash('sha256', $seedHex, true);
        }
        $kp = sodium_crypto_sign_seed_keypair($seed);
        self::$secretKey = sodium_crypto_sign_secretkey($kp);
        self::$publicKey = sodium_crypto_sign_publickey($kp);
    }

    public static function getPublicKeyHex(): string
    {
        self::ensureKeypair();
        return bin2hex((string) self::$publicKey);
    }

    public static function canonicalJson(array $data): string
    {
        $sorted = self::recursiveSortKeys($data);
        return (string) json_encode($sorted, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
    }

    private static function recursiveSortKeys(mixed $val): mixed
    {
        if (!is_array($val)) {
            return $val;
        }
        if (array_is_list($val)) {
            return array_map([self::class, 'recursiveSortKeys'], $val);
        }
        ksort($val);
        foreach ($val as $k => $v) {
            $val[$k] = self::recursiveSortKeys($v);
        }
        return $val;
    }

    public static function computeSha256(string $payload): string
    {
        return hash('sha256', $payload);
    }

    public static function computeDeedHash(array $content, string $prevHash, int $chainIndex): string
    {
        $envelope = [
            'chain_index' => $chainIndex,
            'prev_hash' => $prevHash,
            'content' => $content,
        ];
        return self::computeSha256(self::canonicalJson($envelope));
    }

    public static function computeAuditHash(
        string $actorUsername,
        string $action,
        string $entityType,
        string $entityId,
        array $details,
        string $prevHash,
        int $chainIndex
    ): string {
        $envelope = [
            'actor_username' => $actorUsername,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'details' => $details,
            'prev_hash' => $prevHash,
            'chain_index' => $chainIndex,
        ];
        return self::computeSha256(self::canonicalJson($envelope));
    }

    public static function signHash(string $contentHash): string
    {
        self::ensureKeypair();
        $sig = sodium_crypto_sign_detached($contentHash, (string) self::$secretKey);
        return bin2hex($sig);
    }

    public static function verifySignature(string $contentHash, string $signatureHex): bool
    {
        self::ensureKeypair();
        $sig = @hex2bin($signatureHex);
        if ($sig === false || strlen($sig) !== SODIUM_CRYPTO_SIGN_BYTES) {
            return false;
        }
        return sodium_crypto_sign_verify_detached($sig, $contentHash, (string) self::$publicKey);
    }

    public static function computeMerkleRoot(array $hashes): string
    {
        if (empty($hashes)) {
            return self::GENESIS_HASH;
        }
        $layer = array_values($hashes);
        while (count($layer) > 1) {
            if (count($layer) % 2 === 1) {
                $layer[] = $layer[count($layer) - 1];
            }
            $next = [];
            for ($i = 0; $i < count($layer); $i += 2) {
                $next[] = self::computeSha256($layer[$i] . ':' . $layer[$i + 1]);
            }
            $layer = $next;
        }
        return (string) $layer[0];
    }

    public static function buildVerifyUrl(int $deedId, string $contentHash): string
    {
        $base = rtrim((string) env('PUBLIC_VERIFY_BASE_URL', 'http://localhost:5173'), '/');
        $short = substr($contentHash, 0, 12);
        return "{$base}/verify/{$deedId}?h={$short}";
    }

    public static function generateQrSvgDataUri(string $payload): string
    {
        foreach (['/opt/homebrew/bin/qrencode', '/usr/local/bin/qrencode', 'qrencode'] as $bin) {
            $cmd = escapeshellcmd($bin) . ' -t SVG -m 2 -o - ' . escapeshellarg($payload) . ' 2>/dev/null';
            $out = @shell_exec($cmd);
            if (is_string($out) && str_contains($out, '<svg')) {
                return 'data:image/svg+xml;base64,' . base64_encode($out);
            }
        }

        $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">'
            . '<rect width="120" height="120" fill="#ffffff"/>'
            . '<rect x="8" y="8" width="32" height="32" fill="none" stroke="#006A4E" stroke-width="6"/>'
            . '<rect x="18" y="18" width="12" height="12" fill="#006A4E"/>'
            . '<rect x="80" y="8" width="32" height="32" fill="none" stroke="#006A4E" stroke-width="6"/>'
            . '<rect x="90" y="18" width="12" height="12" fill="#006A4E"/>'
            . '<rect x="8" y="80" width="32" height="32" fill="none" stroke="#006A4E" stroke-width="6"/>'
            . '<rect x="18" y="90" width="12" height="12" fill="#006A4E"/>'
            . '<circle cx="60" cy="60" r="10" fill="#F42A41"/>'
            . '</svg>';
        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }

    public static function verifyDeedRecord(array $deedRow, ?string $expectedPrevHash = null): array
    {
        $content = is_string($deedRow['content_json'] ?? null)
            ? (json_decode($deedRow['content_json'], true) ?: [])
            : ($deedRow['content_json'] ?? []);

        $originalContent = is_string($deedRow['original_content_json'] ?? null)
            ? (json_decode($deedRow['original_content_json'], true) ?: [])
            : ($deedRow['original_content_json'] ?? []);

        $recomputedHash = self::computeDeedHash(
            $content,
            (string) ($deedRow['prev_hash'] ?? ''),
            (int) ($deedRow['chain_index'] ?? 1)
        );
        $storedHash = (string) ($deedRow['content_hash'] ?? '');
        $hashValid = hash_equals($storedHash, $recomputedHash);
        $signatureValid = self::verifySignature($recomputedHash, (string) ($deedRow['signature'] ?? ''));
        $chainValid = $expectedPrevHash === null || hash_equals((string) ($deedRow['prev_hash'] ?? ''), $expectedPrevHash);

        $tamperedFields = [];
        if (!$hashValid && !empty($originalContent)) {
            $keys = array_unique(array_merge(array_keys($content), array_keys($originalContent)));
            sort($keys);
            foreach ($keys as $k) {
                if (($content[$k] ?? null) != ($originalContent[$k] ?? null)) {
                    $tamperedFields[] = [
                        'field' => $k,
                        'original_value' => $originalContent[$k] ?? null,
                        'current_value' => $content[$k] ?? null,
                    ];
                }
            }
        }

        $isValid = $hashValid && $signatureValid && $chainValid;

        if ($isValid) {
            $msgBn = 'এই দলিলের সকল তথ্য অপরিবর্তিত এবং ডিজিটাল স্বাক্ষর সত্যায়িত।';
            $msgEn = "This deed's content is intact and its cryptographic signature is verified.";
        } elseif (!$hashValid) {
            $msgBn = 'সতর্কবার্তা: নিবন্ধনের পরে এই দলিলের তথ্য গোপনে পরিবর্তন (টেম্পারিং) করা হয়েছে!';
            $msgEn = "ALERT: This deed's stored content was altered after registration (hash mismatch)!";
        } elseif (!$signatureValid) {
            $msgBn = 'সতর্কবার্তা: এই দলিলের ডিজিটাল স্বাক্ষর অবৈধ!';
            $msgEn = "ALERT: This deed's digital signature is invalid!";
        } else {
            $msgBn = 'সতর্কবার্তা: পূর্ববর্তী দলিলের হ্যাশ চেইনের সাথে সংযোগ বিচ্ছিন্ন হয়েছে!';
            $msgEn = 'ALERT: Hash chain link to the previous deed is broken!';
        }

        return [
            'deed_id' => isset($deedRow['id']) ? (int) $deedRow['id'] : null,
            'deed_no' => $deedRow['deed_no'] ?? null,
            'chain_index' => isset($deedRow['chain_index']) ? (int) $deedRow['chain_index'] : null,
            'is_valid' => $isValid,
            'verdict' => $isValid ? 'SAFE' : 'HIGH_RISK',
            'badge_bn' => $isValid ? '✔ নিরাপদ ও অপরিবর্তিত' : '✖ ঝুঁকিপূর্ণ (তথ্য পরিবর্তিত)',
            'badge_en' => $isValid ? '✔ Verified & Intact' : '✖ High Risk (Tampered)',
            'hash_valid' => $hashValid,
            'signature_valid' => $signatureValid,
            'chain_valid' => $chainValid,
            'stored_hash' => $storedHash,
            'recomputed_hash' => $recomputedHash,
            'prev_hash' => $deedRow['prev_hash'] ?? null,
            'expected_prev_hash' => $expectedPrevHash ?? ($deedRow['prev_hash'] ?? null),
            'signature' => $deedRow['signature'] ?? null,
            'public_key_hex' => self::getPublicKeyHex(),
            'tampered_fields' => $tamperedFields,
            'message_bn' => $msgBn,
            'message_en' => $msgEn,
        ];
    }

    public static function verifyEntireLedger(array $deedRows): array
    {
        usort($deedRows, fn(array $a, array $b) => ((int) $a['chain_index']) <=> ((int) $b['chain_index']));
        $expectedPrev = self::GENESIS_HASH;
        $brokenLinks = [];
        $verifiedCount = 0;
        $recomputedHashes = [];

        foreach ($deedRows as $row) {
            $res = self::verifyDeedRecord($row, $expectedPrev);
            $recomputedHashes[] = $res['recomputed_hash'];
            if ($res['is_valid']) {
                $verifiedCount++;
            } else {
                $brokenLinks[] = $res;
            }
            $expectedPrev = $res['recomputed_hash'];
        }

        $isValid = count($brokenLinks) === 0;
        $firstBroken = $brokenLinks[0] ?? null;
        $total = count($deedRows);

        if ($isValid) {
            $msgBn = "সম্পূর্ণ লেজার যাচাইকৃত ({$total}টি দলিলের সবকটিই নিরাপদ ও অপরিবর্তিত)।";
            $msgEn = "Entire ledger verified ({$total} deeds intact with unbroken hash chain).";
        } else {
            $msgBn = "লেজার চেইনে ত্রুটি ধরা পড়েছে! দলিল নং {$firstBroken['deed_no']} (চেইন ইনডেক্স #{$firstBroken['chain_index']})-এ তথ্য পরিবর্তন করা হয়েছে।";
            $msgEn = "Ledger integrity breach detected at Deed {$firstBroken['deed_no']} (Chain Index #{$firstBroken['chain_index']}).";
        }

        return [
            'is_valid' => $isValid,
            'total_deeds' => $total,
            'verified_count' => $verifiedCount,
            'broken_count' => count($brokenLinks),
            'first_broken_index' => $firstBroken ? (int) $firstBroken['chain_index'] : null,
            'first_broken_deed_id' => $firstBroken ? (int) $firstBroken['deed_id'] : null,
            'first_broken_deed_no' => $firstBroken['deed_no'] ?? null,
            'broken_links' => $brokenLinks,
            'merkle_root' => self::computeMerkleRoot($recomputedHashes),
            'public_key_hex' => self::getPublicKeyHex(),
            'message_bn' => $msgBn,
            'message_en' => $msgEn,
        ];
    }
}
