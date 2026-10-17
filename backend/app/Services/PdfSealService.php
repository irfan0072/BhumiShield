<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Government-signed PDF Sealing Service (F09).
 *
 * Produces a minimal PDF 1.4 document that:
 *   1. Prints the notice metadata (title, body excerpt, slug, attachment id,
 *      published_at) in a single Helvetica page using PDF base-14 fonts.
 *   2. Embeds the SHA-256 content hash and an Ed25519 detached signature
 *      over that hash, computed by LedgerService using the registrar's key.
 *   3. Exposes a verification helper that any client (or test) can use to
 *      re-derive the SHA-256 of the canonical envelope and verify the
 *      Ed25519 signature against LedgerService::getPublicKeyHex().
 *
 * Bangla glyph fallback: base-14 Helvetica cannot render Bengali code points.
 * Non-ASCII characters are replaced with '?' before being inserted into the
 * content stream. This is documented and intentional — the SHA-256 +
 * Ed25519 signature is the trust anchor, not the visual rendering.
 *
 * The PDF is hand-rolled (no third-party library) to keep the dependency
 * surface zero. The output passes pdfinspector's strict PDF 1.4 spec check.
 */
final class PdfSealService
{
    /**
     * Build the canonical envelope that we sign + embed.
     *
     * The structure is deterministic (LedgerService::canonicalJson sorts keys)
     * so a client can re-derive the same SHA-256 and verify the Ed25519 sig.
     *
     * @return array{content_hash:string, signature_hex:string, public_key_hex:string, envelope:array<string,mixed>}
     */
    public static function sealNoticeAttachment(array $attachmentRow, array $noticeRow): array
    {
        $envelope = [
            'kind' => 'bhumi_notice_attachment_v1',
            'issued_by' => 'BhumiShield Land Records Authority (Demo Registrar)',
            'notice_slug' => (string) ($noticeRow['notice_slug'] ?? ''),
            'notice_id' => (int) ($noticeRow['id'] ?? 0),
            'notice_title' => (string) ($noticeRow['title_en'] ?? ($noticeRow['title_bn'] ?? '')),
            'category' => (string) ($noticeRow['category'] ?? ''),
            'published_at' => (string) ($noticeRow['published_at'] ?? ''),
            'attachment' => [
                'id' => (int) ($attachmentRow['id'] ?? 0),
                'file_name' => (string) ($attachmentRow['file_name'] ?? ''),
                'file_type' => (string) ($attachmentRow['file_type'] ?? ''),
                'file_size_bytes' => (int) ($attachmentRow['file_size_bytes'] ?? 0),
                'stored_sha256' => (string) ($attachmentRow['content_hash'] ?? ''),
            ],
            'issued_at' => gmdate('c'),
        ];

        $canonical = LedgerService::canonicalJson($envelope);
        $contentHash = LedgerService::computeSha256($canonical);
        $signatureHex = LedgerService::signHash($contentHash);

        return [
            'content_hash' => $contentHash,
            'signature_hex' => $signatureHex,
            'public_key_hex' => LedgerService::getPublicKeyHex(),
            'envelope' => $envelope,
        ];
    }

    /**
     * Render a 1-page PDF document with the seal + signature printed in the
     * content stream. Returns the binary PDF bytes.
     */
    public static function renderPdf(array $attachmentRow, array $noticeRow): string
    {
        $seal = self::sealNoticeAttachment($attachmentRow, $noticeRow);

        // Sanitise Bangla to ASCII '?' — base-14 fonts cannot render them.
        $ascii = static function (string $s): string {
            $out = '';
            $len = strlen($s);
            for ($i = 0; $i < $len; $i++) {
                $b = ord($s[$i]);
                // Accept printable ASCII (0x20-0x7E) and tab/newline.
                if ($b === 0x09 || $b === 0x0A || ($b >= 0x20 && $b <= 0x7E)) {
                    $out .= $s[$i];
                } else {
                    $out .= '?';
                }
            }
            return $out;
        };

        $title = $ascii((string) ($noticeRow['title_en'] ?? $noticeRow['title_bn'] ?? 'Notice'));
        $slug = $ascii((string) ($noticeRow['notice_slug'] ?? ''));
        $category = $ascii((string) ($noticeRow['category'] ?? ''));
        $fileName = $ascii((string) ($attachmentRow['file_name'] ?? ''));
        $publishedAt = $ascii((string) ($noticeRow['published_at'] ?? ''));
        $storedHash = $ascii((string) ($attachmentRow['content_hash'] ?? ''));

        $hash = $seal['content_hash'];
        // 64-char hex → split into 4×16 with hyphens for legibility.
        $hashFmt = substr($hash, 0, 16) . '-' . substr($hash, 16, 16) . '-'
                 . substr($hash, 32, 16) . '-' . substr($hash, 48, 16);
        $sig = $seal['signature_hex'];
        $sigFmt = chunk_split($sig, 16, ' ');
        $pk = $seal['public_key_hex'];
        $pkFmt = chunk_split($pk, 16, ' ');

        $verifyUrl = LedgerService::buildVerifyUrl(
            (int) ($noticeRow['id'] ?? 0),
            $hash
        );

        $bodyText = $ascii((string) (
            $noticeRow['body_en'] ?? $noticeRow['body_bn'] ?? '(see notice body in app)'
        ));

        // Truncate long bodies for PDF (1 page ≈ 60 lines × 80 chars).
        if (strlen($bodyText) > 1600) {
            $bodyText = substr($bodyText, 0, 1597) . '...';
        }

        $lines = [];
        $lines[] = 'BHUMISHIELD LAND RECORDS AUTHORITY';
        $lines[] = 'Government-Signed Notice Attachment';
        $lines[] = '==================================';
        $lines[] = "Title    : {$title}";
        $lines[] = "Slug     : {$slug}";
        $lines[] = "Category : {$category}";
        $lines[] = "Published: {$publishedAt}";
        $lines[] = "File     : {$fileName}  (id={$attachmentRow['id']}, type={$attachmentRow['file_type']}, size={$attachmentRow['file_size_bytes']} B)";
        $lines[] = "StoredSHA: {$storedHash}";
        $lines[] = '';
        $lines[] = '--- NOTICE BODY (excerpt) ---';
        foreach (explode("\n", $bodyText) as $para) {
            $lines[] = self::wrapAscii($para, 80);
        }
        $lines[] = '';
        $lines[] = '--- CRYPTOGRAPHIC SEAL ---';
        $lines[] = 'SHA-256 over canonical envelope:';
        $lines[] = "  {$hashFmt}";
        $lines[] = 'Ed25519 detached signature (hex):';
        foreach (explode(' ', trim($sigFmt)) as $chunk) {
            $lines[] = "  {$chunk}";
        }
        $lines[] = 'Public key (Ed25519, hex):';
        foreach (explode(' ', trim($pkFmt)) as $chunk) {
            $lines[] = "  {$chunk}";
        }
        $lines[] = '';
        $lines[] = 'Verify this seal at:';
        $lines[] = "  {$ascii($verifyUrl)}";
        $lines[] = '';
        $lines[] = 'Bangla text was transliterated to ? because Adobe base-14';
        $lines[] = 'Helvetica cannot render Bengali. The digital signature is';
        $lines[] = 'the trust anchor — see SHA-256 + Ed25519 above.';

        // Build the PDF content stream (BT ... ET text objects at y=750).
        $stream = "BT\n/F1 10 Tf\n14 TL\n72 750 Td\n";
        $first = true;
        foreach ($lines as $line) {
            $safeLine = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $line);
            if ($first) {
                $stream .= "({$safeLine}) Tj\n";
                $first = false;
            } else {
                $stream .= "T*\n({$safeLine}) Tj\n";
            }
        }
        $stream .= "ET\n";

        return self::buildPdfDocument($stream);
    }

    /** Word-wrap ASCII text at a fixed column width. */
    private static function wrapAscii(string $text, int $width): string
    {
        $text = trim($text);
        if ($text === '') return '';
        if (strlen($text) <= $width) return $text;
        $out = '';
        $line = '';
        foreach (explode(' ', $text) as $word) {
            if ($line === '') {
                $line = $word;
            } elseif (strlen($line) + 1 + strlen($word) <= $width) {
                $line .= ' ' . $word;
            } else {
                $out .= $line . "\n";
                $line = $word;
            }
        }
        if ($line !== '') $out .= $line;
        return $out;
    }

    /**
     * Build a minimal valid PDF 1.4 document with a single page whose
     * content stream is $stream. Returns raw PDF bytes.
     */
    private static function buildPdfDocument(string $stream): string
    {
        $objects = [];

        // 1. Catalog
        $objects[] = "<< /Type /Catalog /Pages 2 0 R >>";
        // 2. Pages
        $objects[] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
        // 3. Page
        $objects[] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>";
        // 4. Content stream
        $objects[] = "<< /Length " . strlen($stream) . " >>\nstream\n{$stream}\nendstream";
        // 5. Font
        $objects[] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";

        $header = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";

        $body = '';
        $offsets = [0];
        $id = 1;
        foreach ($objects as $obj) {
            $offsets[] = strlen($header) + strlen($body);
            $body .= "{$id} 0 obj\n{$obj}\nendobj\n";
            $id++;
        }
        $xrefOffset = strlen($header) + strlen($body);
        $xref = "xref\n0 " . (count($objects) + 1) . "\n";
        $xref .= "0000000000 65535 f \n";
        for ($i = 1; $i <= count($objects); $i++) {
            $xref .= str_pad((string) $offsets[$i], 10, '0', STR_PAD_LEFT) . " 00000 n \n";
        }
        $trailer = "trailer\n<< /Size " . (count($objects) + 1) . " /Root 1 0 R >>\nstartxref\n{$xrefOffset}\n%%EOF\n";

        return $header . $body . $xref . $trailer;
    }

    /**
     * Verify an already-sealed envelope. Used by tests to assert that a
     * freshly-signed envelope is verifiable, and that tampering invalidates.
     */
    public static function verifySeal(array $seal): bool
    {
        $canonical = LedgerService::canonicalJson($seal['envelope']);
        $recomputed = LedgerService::computeSha256($canonical);
        return hash_equals($recomputed, $seal['content_hash'])
            && LedgerService::verifySignature($recomputed, $seal['signature_hex']);
    }
}