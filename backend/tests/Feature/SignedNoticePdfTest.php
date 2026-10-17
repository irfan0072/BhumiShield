<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Services\LedgerService;
use App\Services\PdfSealService;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Regression Test Suite for Audit Finding F09:
 *
 * Noticeboard attachments must be downloadable as a real PDF (not a fake
 * "Government signed" stub), and the PDF must embed the SHA-256 + Ed25519
 * signature of the canonical envelope so a client can re-derive the hash
 * and verify the seal.
 */
final class SignedNoticePdfTest
{
    private static function assertTrue(bool $cond, string $msg = 'Assertion failed'): void
    {
        if (!$cond) {
            throw new \RuntimeException($msg);
        }
    }

    private static function assertEqual(mixed $expected, mixed $actual, string $msg = ''): void
    {
        if ($expected !== $actual) {
            $eStr = is_scalar($expected) ? (string) $expected : json_encode($expected);
            $aStr = is_scalar($actual) ? (string) $actual : json_encode($actual);
            throw new \RuntimeException("{$msg} Expected [{$eStr}] but got [{$aStr}]");
        }
    }

    private static function callRoute(string $method, string $uri, array $body = [], ?string $jwt = null, array $query = []): array
    {
        $router = require __DIR__ . '/../../routes/api.php';
        if ($jwt !== null) {
            $_SERVER['HTTP_AUTHORIZATION'] = "Bearer {$jwt}";
        } else {
            unset($_SERVER['HTTP_AUTHORIZATION']);
        }
        try {
            $res = $router(strtoupper($method), $uri, $query, $body);
            return ['status' => 200, 'body' => $res];
        } catch (\Throwable $e) {
            $decoded = json_decode($e->getMessage(), true);
            if (is_array($decoded) && isset($decoded['status'])) {
                return ['status' => (int) $decoded['status'], 'body' => $decoded];
            }
            return ['status' => 500, 'error' => $e->getMessage()];
        }
    }

    public static function runAll(): int
    {
        $tmpDb = sys_get_temp_dir() . '/bhumishield_signed_pdf_test_' . getmypid() . '.sqlite';
        putenv("BHUMISHIELD_TEST_DB={$tmpDb}");
        $_ENV['BHUMISHIELD_TEST_DB'] = $tmpDb;
        DB::resetConnection();
        (new DatabaseSeeder())->run(true);

        $methods = array_values(array_filter(
            get_class_methods(self::class),
            fn(string $m) => str_starts_with($m, 'test_')
        ));

        $passed = 0;
        $failed = 0;
        echo "\n   PASS  Tests\\Feature\\SignedNoticePdfTest (Finding F09)\n";

        foreach ($methods as $method) {
            $t0 = microtime(true);
            try {
                self::$method();
                $ms = round((microtime(true) - $t0) * 1000, 1);
                echo "  ✓ {$method} ({$ms}ms)\n";
                $passed++;
            } catch (\Throwable $e) {
                echo "  ⨯ {$method}: {$e->getMessage()}\n";
                $failed++;
            }
        }

        echo "\n  Signed Notice PDF Tests:    {$passed} passed, {$failed} failed (" . count($methods) . " total)\n\n";
        @unlink($tmpDb);
        return $failed;
    }

    /**
     * Locate the first published notice with at least one attachment, then
     * return the (slug, attachment_id) pair. The seeder should have built
     * a notice_attachments row for every published notice.
     *
     * @return array{slug:string, attachment_id:int}
     */
    private static function firstPublishedNoticeWithAttachment(): array
    {
        $row = DB::selectOne(
            "SELECT n.notice_slug, na.id AS attachment_id
             FROM notices n
             INNER JOIN notice_attachments na ON na.notice_id = n.id
             WHERE n.status = 'PUBLISHED'
             ORDER BY n.id ASC LIMIT 1"
        );
        if (!$row) {
            throw new \RuntimeException('Seeder must produce at least one published notice with an attachment');
        }
        return ['slug' => (string) $row['notice_slug'], 'attachment_id' => (int) $row['attachment_id']];
    }

    /**
     * F09.1: anonymous (no JWT) download of a published notice attachment
     * returns the binary dispatch envelope, not a JSON error. The router
     * contract is: ['_binary' => true, 'status' => 200, 'content_type' => 'application/pdf',
     * 'content_disposition' => ..., 'body' => '<pdf bytes>'].
     */
    public static function test_01_anon_download_returns_binary_envelope(): void
    {
        $t = self::firstPublishedNoticeWithAttachment();
        $res = self::callRoute(
            'GET',
            "/api/v1/notices/{$t['slug']}/attachments/{$t['attachment_id']}/download"
        );
        self::assertEqual(200, $res['status'], 'PDF download must return 200');
        self::assertTrue(($res['body']['_binary'] ?? false) === true,
            'Response must use the binary dispatch envelope');
        self::assertEqual('application/pdf', (string) ($res['body']['content_type'] ?? ''));
        self::assertTrue(strlen((string) ($res['body']['body'] ?? '')) > 200,
            'PDF body must be non-trivial (>= 200 bytes)');
    }

    /**
     * F09.2: the PDF must start with the PDF magic header "%PDF-1." and
     * end with the standard %%EOF marker. This guards against a regression
     * where someone replaces the renderer with an HTML string.
     */
    public static function test_02_pdf_magic_bytes_and_eof_marker(): void
    {
        $t = self::firstPublishedNoticeWithAttachment();
        $res = self::callRoute(
            'GET',
            "/api/v1/notices/{$t['slug']}/attachments/{$t['attachment_id']}/download"
        );
        $bytes = (string) ($res['body']['body'] ?? '');
        self::assertTrue(str_starts_with($bytes, '%PDF-1.'),
            'PDF must begin with %PDF-1. magic; got: ' . substr($bytes, 0, 8));
        self::assertTrue(str_contains($bytes, '%%EOF'),
            'PDF must end with %%EOF marker');
    }

    /**
     * F09.3: the PDF content stream must mention the SHA-256 and Ed25519
     * signature in plain text so a human (or test) reading the PDF in a
     * viewer can see the seal.
     */
    public static function test_03_pdf_body_mentions_sha256_and_ed25519(): void
    {
        $t = self::firstPublishedNoticeWithAttachment();
        $res = self::callRoute(
            'GET',
            "/api/v1/notices/{$t['slug']}/attachments/{$t['attachment_id']}/download"
        );
        $bytes = (string) ($res['body']['body'] ?? '');
        self::assertTrue(str_contains($bytes, 'SHA-256'),
            'PDF must contain a SHA-256 marker');
        self::assertTrue(str_contains($bytes, 'Ed25519'),
            'PDF must contain an Ed25519 marker');
        self::assertTrue(str_contains($bytes, 'Government-Signed'),
            'PDF must declare it is government-signed');
    }

    /**
     * F09.4: ?verify=1 returns a JSON envelope (not PDF) with the canonical
     * envelope, content hash, signature, public key, and a verified flag.
     */
    public static function test_04_verify_envelope_endpoint(): void
    {
        $t = self::firstPublishedNoticeWithAttachment();
        $res = self::callRoute(
            'GET',
            "/api/v1/notices/{$t['slug']}/attachments/{$t['attachment_id']}/download",
            [],
            null,
            ['verify' => '1']
        );
        self::assertEqual(200, $res['status']);
        self::assertTrue(($res['body']['_binary'] ?? false) === false,
            'Verify endpoint must return JSON, not binary');
        self::assertEqual(true, (bool) ($res['body']['verified'] ?? false),
            'Fresh seal must verify');
        self::assertEqual(64, strlen((string) ($res['body']['content_hash'] ?? '')),
            'content_hash must be 64 hex chars (SHA-256)');
        self::assertEqual(128, strlen((string) ($res['body']['signature_hex'] ?? '')),
            'signature_hex must be 128 hex chars (Ed25519)');
        self::assertEqual(LedgerService::getPublicKeyHex(),
            (string) ($res['body']['public_key_hex'] ?? ''),
            'Public key in envelope must match LedgerService::getPublicKeyHex()');
    }

    /**
     * F09.5: tampering with the envelope (e.g. changing the slug) must
     * invalidate the signature. This proves the seal is cryptographically
     * meaningful — not a decorative string.
     */
    public static function test_05_tampered_envelope_fails_verification(): void
    {
        $t = self::firstPublishedNoticeWithAttachment();
        $res = self::callRoute(
            'GET',
            "/api/v1/notices/{$t['slug']}/attachments/{$t['attachment_id']}/download",
            [],
            null,
            ['verify' => '1']
        );
        $envelope = $res['body']['envelope'];
        // Mutate the slug.
        $envelope['notice_slug'] = 'TAMPERED';
        $tamperedCanonical = LedgerService::canonicalJson($envelope);
        $tamperedHash = LedgerService::computeSha256($tamperedCanonical);
        $valid = LedgerService::verifySignature($tamperedHash, (string) $res['body']['signature_hex']);
        self::assertTrue($valid === false, 'Tampered envelope must NOT verify');
    }

    /**
     * F09.6: 404 when the slug is not a real notice.
     */
    public static function test_06_unknown_slug_returns_404(): void
    {
        $t = self::firstPublishedNoticeWithAttachment();
        $res = self::callRoute(
            'GET',
            "/api/v1/notices/this-slug-does-not-exist/attachments/{$t['attachment_id']}/download"
        );
        self::assertEqual(404, $res['status']);
        self::assertEqual('NOTICE_NOT_FOUND', (string) ($res['body']['code'] ?? ''));
    }

    /**
     * F09.7: 404 when the attachment_id does not belong to that notice.
     */
    public static function test_07_wrong_attachment_returns_404(): void
    {
        $t = self::firstPublishedNoticeWithAttachment();
        $res = self::callRoute(
            'GET',
            "/api/v1/notices/{$t['slug']}/attachments/999999/download"
        );
        self::assertEqual(404, $res['status']);
    }

    /**
     * F09.8: a notice that is not PUBLISHED (DRAFT) cannot be downloaded.
     * We mutate the first notice to DRAFT and re-try.
     */
    public static function test_08_unpublished_notice_returns_403(): void
    {
        $t = self::firstPublishedNoticeWithAttachment();
        DB::statement("UPDATE notices SET status = 'DRAFT' WHERE notice_slug = ?", [$t['slug']]);
        try {
            $res = self::callRoute(
                'GET',
                "/api/v1/notices/{$t['slug']}/attachments/{$t['attachment_id']}/download"
            );
            self::assertEqual(403, $res['status']);
            self::assertEqual('NOTICE_NOT_PUBLISHED', (string) ($res['body']['code'] ?? ''));
        } finally {
            DB::statement("UPDATE notices SET status = 'PUBLISHED' WHERE notice_slug = ?", [$t['slug']]);
        }
    }

    /**
     * F09.9: PdfSealService::verifySeal returns true for a fresh seal and
     * the embedded envelope's canonical JSON re-hashes to the same SHA-256.
     * This is a unit-level check independent of the HTTP route.
     */
    public static function test_09_pdfs_seal_service_self_check(): void
    {
        $t = self::firstPublishedNoticeWithAttachment();
        $notice = DB::selectOne('SELECT * FROM notices WHERE notice_slug = ?', [$t['slug']]);
        $attachment = DB::selectOne('SELECT * FROM notice_attachments WHERE id = ?', [$t['attachment_id']]);
        self::assertTrue(is_array($notice) && is_array($attachment));

        $seal = PdfSealService::sealNoticeAttachment($attachment, $notice);
        self::assertTrue(PdfSealService::verifySeal($seal),
            'Fresh seal must pass self-verification');

        $recomputed = LedgerService::computeSha256(
            LedgerService::canonicalJson($seal['envelope'])
        );
        self::assertEqual($seal['content_hash'], $recomputed,
            'Envelope canonical hash must match stored content_hash');
    }
}