<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Pure PHP Standards-Compliant QR Code Generator (ISO/IEC 18004).
 * Generates valid, decodable SVG QR codes without requiring external binaries or libraries.
 */
final class QrCodeService
{
    private const GF256_POLY = 0x11D; // x^8 + x^4 + x^3 + x^2 + 1 (285)
    private static ?array $gfExp = null;
    private static ?array $gfLog = null;

    private static function initGfTables(): void
    {
        if (self::$gfExp !== null) {
            return;
        }
        self::$gfExp = array_fill(0, 512, 0);
        self::$gfLog = array_fill(0, 256, 0);
        $x = 1;
        for ($i = 0; $i < 255; $i++) {
            self::$gfExp[$i] = $x;
            self::$gfLog[$x] = $i;
            $x <<= 1;
            if ($x & 0x100) {
                $x ^= self::GF256_POLY;
            }
        }
        for ($i = 255; $i < 512; $i++) {
            self::$gfExp[$i] = self::$gfExp[$i - 255];
        }
    }

    private static function gfMultiply(int $x, int $y): int
    {
        if ($x === 0 || $y === 0) {
            return 0;
        }
        self::initGfTables();
        return self::$gfExp[self::$gfLog[$x] + self::$gfLog[$y]];
    }

    /**
     * Compute Reed-Solomon generator polynomial coefficients for degree $eccLen.
     */
    private static function getRsGeneratorPoly(int $eccLen): array
    {
        self::initGfTables();
        $poly = [1];
        for ($i = 0; $i < $eccLen; $i++) {
            $factor = [1, self::$gfExp[$i]];
            $next = array_fill(0, count($poly) + 1, 0);
            for ($j = 0; $j < count($poly); $j++) {
                $next[$j] ^= self::gfMultiply($poly[$j], $factor[0]);
                $next[$j + 1] ^= self::gfMultiply($poly[$j], $factor[1]);
            }
            $poly = $next;
        }
        return $poly;
    }

    /**
     * Compute Reed-Solomon error correction bytes for data bytes.
     */
    private static function computeRsEcc(array $data, int $eccLen): array
    {
        $gen = self::getRsGeneratorPoly($eccLen);
        $remainder = array_fill(0, $eccLen, 0);

        foreach ($data as $byte) {
            $factor = $byte ^ $remainder[0];
            array_shift($remainder);
            $remainder[] = 0;
            if ($factor !== 0) {
                for ($i = 0; $i < $eccLen; $i++) {
                    $remainder[$i] ^= self::gfMultiply($gen[$i + 1], $factor);
                }
            }
        }
        return $remainder;
    }

    /**
     * QR Code Level L Version Capacities and Parameters (Versions 1-6, single block for 1-5).
     */
    private static array $versions = [
        1 => ['dimension' => 21, 'total_cw' => 26, 'data_cw' => 19, 'ec_cw' => 7, 'blocks' => 1, 'align' => []],
        2 => ['dimension' => 25, 'total_cw' => 44, 'data_cw' => 34, 'ec_cw' => 10, 'blocks' => 1, 'align' => [6, 18]],
        3 => ['dimension' => 29, 'total_cw' => 70, 'data_cw' => 55, 'ec_cw' => 15, 'blocks' => 1, 'align' => [6, 22]],
        4 => ['dimension' => 33, 'total_cw' => 100, 'data_cw' => 80, 'ec_cw' => 20, 'blocks' => 1, 'align' => [6, 26]],
        5 => ['dimension' => 37, 'total_cw' => 134, 'data_cw' => 108, 'ec_cw' => 26, 'blocks' => 1, 'align' => [6, 30]],
        6 => ['dimension' => 41, 'total_cw' => 172, 'data_cw' => 136, 'ec_cw' => 18, 'blocks' => 2, 'align' => [6, 34]],
    ];

    /**
     * Determines optimal version for byte payload under EC level L.
     */
    private static function selectVersion(int $byteLen): int
    {
        foreach (self::$versions as $ver => $cfg) {
            // Byte mode overhead: 4 bits mode + 8 bits count + payload bytes
            $maxBytes = $cfg['data_cw'] - 2; // ~2 bytes overhead
            if ($byteLen <= $maxBytes) {
                return $ver;
            }
        }
        return 6;
    }

    /**
     * Encodes byte payload into data bit stream.
     */
    private static function encodeBitStream(string $payload, int $version): array
    {
        $cfg = self::$versions[$version];
        $totalDataBytes = $cfg['data_cw'];
        $bytes = array_values(unpack('C*', $payload));
        $len = count($bytes);

        $bitStream = '';
        // 1. Mode indicator: Byte mode is 0100
        $bitStream .= '0100';
        // 2. Character count indicator: 8 bits for versions 1-9
        $bitStream .= sprintf('%08b', $len);
        // 3. Data bytes (8 bits each)
        foreach ($bytes as $b) {
            $bitStream .= sprintf('%08b', $b);
        }
        // 4. Terminator (up to 4 zero bits)
        $maxDataBits = $totalDataBytes * 8;
        $terminatorBits = min(4, $maxDataBits - strlen($bitStream));
        $bitStream .= str_repeat('0', max(0, $terminatorBits));
        // 5. Pad to multiple of 8
        $padZero = (8 - (strlen($bitStream) % 8)) % 8;
        $bitStream .= str_repeat('0', $padZero);

        // 6. Fill with alternating padding bytes: 0xEC (11101100) and 0x11 (00010001)
        $codewords = [];
        for ($i = 0; $i < strlen($bitStream); $i += 8) {
            $codewords[] = bindec(substr($bitStream, $i, 8));
        }

        $padBytes = [0xEC, 0x11];
        $padIdx = 0;
        while (count($codewords) < $totalDataBytes) {
            $codewords[] = $padBytes[$padIdx % 2];
            $padIdx++;
        }

        // 7. Error correction
        $numBlocks = $cfg['blocks'];
        $ecCwPerBlock = $cfg['ec_cw'];
        $dataBlocks = [];
        $ecBlocks = [];

        $dataPerBlock = intdiv(count($codewords), $numBlocks);
        for ($b = 0; $b < $numBlocks; $b++) {
            $blockData = array_slice($codewords, $b * $dataPerBlock, $dataPerBlock);
            $dataBlocks[] = $blockData;
            $ecBlocks[] = self::computeRsEcc($blockData, $ecCwPerBlock);
        }

        // 8. Interleave blocks
        $finalCodewords = [];
        for ($i = 0; $i < $dataPerBlock; $i++) {
            for ($b = 0; $b < $numBlocks; $b++) {
                $finalCodewords[] = $dataBlocks[$b][$i];
            }
        }
        for ($i = 0; $i < $ecCwPerBlock; $i++) {
            for ($b = 0; $b < $numBlocks; $b++) {
                $finalCodewords[] = $ecBlocks[$b][$i];
            }
        }

        // Convert to bit array
        $allBits = [];
        foreach ($finalCodewords as $cw) {
            for ($i = 7; $i >= 0; $i--) {
                $allBits[] = ($cw >> $i) & 1;
            }
        }
        return $allBits;
    }

    /**
     * Builds and renders the QR Code matrix as an SVG string.
     */
    public static function generateSvg(string $payload, int $boxSize = 6, int $margin = 4, string $color = '#006A4E'): string
    {
        $version = self::selectVersion(strlen($payload));
        $cfg = self::$versions[$version];
        $dim = $cfg['dimension'];

        $matrix = array_fill(0, $dim, array_fill(0, $dim, null));
        $reserved = array_fill(0, $dim, array_fill(0, $dim, false));

        // 1. Finder patterns (top-left, top-right, bottom-left)
        $setFinder = function (int $r0, int $c0) use (&$matrix, &$reserved): void {
            for ($r = 0; $r < 7; $r++) {
                for ($c = 0; $c < 7; $c++) {
                    $isBlack = ($r === 0 || $r === 6 || $c === 0 || $c === 6 || ($r >= 2 && $r <= 4 && $c >= 2 && $c <= 4));
                    $matrix[$r0 + $r][$c0 + $c] = $isBlack ? 1 : 0;
                    $reserved[$r0 + $r][$c0 + $c] = true;
                }
            }
            // Separator white ring
            for ($r = -1; $r <= 7; $r++) {
                for ($c = -1; $c <= 7; $c++) {
                    $rr = $r0 + $r;
                    $cc = $c0 + $c;
                    if ($rr >= 0 && $rr < count($matrix) && $cc >= 0 && $cc < count($matrix)) {
                        if ($r === -1 || $r === 7 || $c === -1 || $c === 7) {
                            $matrix[$rr][$cc] = 0;
                            $reserved[$rr][$cc] = true;
                        }
                    }
                }
            }
        };

        $setFinder(0, 0);
        $setFinder(0, $dim - 7);
        $setFinder($dim - 7, 0);

        // 2. Timing patterns along row 6 and col 6
        for ($i = 8; $i < $dim - 8; $i++) {
            $val = ($i % 2 === 0) ? 1 : 0;
            if (!$reserved[6][$i]) {
                $matrix[6][$i] = $val;
                $reserved[6][$i] = true;
            }
            if (!$reserved[$i][6]) {
                $matrix[$i][6] = $val;
                $reserved[$i][6] = true;
            }
        }

        // 3. Alignment patterns (for V2+)
        if (!empty($cfg['align'])) {
            $coords = $cfg['align'];
            foreach ($coords as $ar) {
                foreach ($coords as $ac) {
                    if ($reserved[$ar][$ac]) {
                        continue;
                    }
                    for ($r = -2; $r <= 2; $r++) {
                        for ($c = -2; $c <= 2; $c++) {
                            $isBlack = (abs($r) === 2 || abs($c) === 2 || ($r === 0 && $c === 0));
                            $matrix[$ar + $r][$ac + $c] = $isBlack ? 1 : 0;
                            $reserved[$ar + $r][$ac + $c] = true;
                        }
                    }
                }
            }
        }

        // 4. Dark module
        $darkR = 4 * $version + 9;
        $matrix[$darkR][8] = 1;
        $reserved[$darkR][8] = true;

        // 5. Reserve format info modules
        for ($i = 0; $i < 9; $i++) {
            $reserved[8][$i] = true;
            $reserved[$i][8] = true;
        }
        for ($i = 0; $i < 8; $i++) {
            $reserved[8][$dim - 1 - $i] = true;
            $reserved[$dim - 1 - $i][8] = true;
        }

        // 6. Populate data bits with zig-zag traversal
        $dataBits = self::encodeBitStream($payload, $version);
        $bitIdx = 0;
        $totalBits = count($dataBits);

        $col = $dim - 1;
        $up = true;
        while ($col > 0) {
            if ($col === 6) {
                $col--; // skip vertical timing column
            }
            $rows = $up ? range($dim - 1, 0, -1) : range(0, $dim - 1);
            foreach ($rows as $r) {
                foreach ([$col, $col - 1] as $c) {
                    if (!$reserved[$r][$c]) {
                        $matrix[$r][$c] = ($bitIdx < $totalBits) ? $dataBits[$bitIdx++] : 0;
                    }
                }
            }
            $up = !$up;
            $col -= 2;
        }

        // 7. Apply standard Mask 0: (row + col) % 2 == 0
        for ($r = 0; $r < $dim; $r++) {
            for ($c = 0; $c < $dim; $c++) {
                if (!$reserved[$r][$c]) {
                    if (($r + $c) % 2 === 0) {
                        $matrix[$r][$c] ^= 1;
                    }
                }
            }
        }

        // 8. Format Information: Level L (01), Mask 0 (000) -> 01000
        // BCH(15,5) format info calculation: poly = 0x537, mask = 0x5412
        $formatBits = 0x08; // 01000 in binary
        $bch = $formatBits << 10;
        for ($i = 4; $i >= 0; $i--) {
            if (($bch >> ($i + 10)) & 1) {
                $bch ^= (0x537 << $i);
            }
        }
        $formatWord = (($formatBits << 10) | $bch) ^ 0x5412;

        // Place format bits:
        // Top-left: bits 0-5 on col 8, bits 6-8 on row 8, etc.
        for ($i = 0; $i < 15; $i++) {
            $bit = ($formatWord >> $i) & 1;
            // 1. Around top-left finder
            if ($i <= 5) {
                $matrix[$i][8] = $bit;
            } elseif ($i === 6) {
                $matrix[7][8] = $bit;
            } elseif ($i === 7) {
                $matrix[8][8] = $bit;
            } elseif ($i === 8) {
                $matrix[8][7] = $bit;
            } else {
                $matrix[8][14 - $i] = $bit;
            }

            // 2. Split between top-right and bottom-left
            if ($i < 8) {
                $matrix[8][$dim - 1 - $i] = $bit;
            } else {
                $matrix[$dim - 15 + $i][8] = $bit;
            }
        }

        // 9. Render SVG
        $size = ($dim + $margin * 2) * $boxSize;
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' . $size . ' ' . $size . '" width="' . $size . '" height="' . $size . '">' . "\n";
        $svg .= '  <rect width="' . $size . '" height="' . $size . '" fill="#ffffff"/>' . "\n";
        $svg .= '  <g fill="' . htmlspecialchars($color, ENT_QUOTES, 'UTF-8') . '">' . "\n";

        for ($r = 0; $r < $dim; $r++) {
            for ($c = 0; $c < $dim; $c++) {
                if ($matrix[$r][$c] === 1) {
                    $x = ($c + $margin) * $boxSize;
                    $y = ($r + $margin) * $boxSize;
                    $svg .= '    <rect x="' . $x . '" y="' . $y . '" width="' . $boxSize . '" height="' . $boxSize . '"/>' . "\n";
                }
            }
        }
        $svg .= "  </g>\n</svg>";
        return $svg;
    }

    public static function generateSvgDataUri(string $payload, int $boxSize = 5, int $margin = 4, string $color = '#006A4E'): string
    {
        $svg = self::generateSvg($payload, $boxSize, $margin, $color);
        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }
}
