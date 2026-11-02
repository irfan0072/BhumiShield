<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Cadastral vector geometry validation, spatial metric calculations,
 * and Bangladesh coordinate bounding engine.
 * Supports Polygon, LineString, and Point GeoJSON features.
 */
final class VectorGeometryService
{
    public const BD_MIN_LNG = 88.0;
    public const BD_MAX_LNG = 93.0;
    public const BD_MIN_LAT = 20.0;
    public const BD_MAX_LAT = 27.0;

    public const DECIMAL_TO_SQM = 40.468564224;
    public const EARTH_RADIUS_METERS = 6371008.8;

    public static function error(string $code, string $messageBn, string $messageEn = '', int $status = 422): never
    {
        $en = $messageEn !== '' ? $messageEn : $messageBn;
        throw new \RuntimeException(json_encode([
            'status' => $status,
            'code' => $code,
            'message_bn' => $messageBn,
            'message_en' => $en,
        ], JSON_UNESCAPED_UNICODE));
    }

    public static function isInsideBangladesh(float $lng, float $lat): bool
    {
        return $lng >= self::BD_MIN_LNG && $lng <= self::BD_MAX_LNG
            && $lat >= self::BD_MIN_LAT && $lat <= self::BD_MAX_LAT;
    }

    public static function distanceMeters(float $lng1, float $lat1, float $lng2, float $lat2): float
    {
        $midLat = ($lat1 + $lat2) / 2.0;
        $dx = ($lng2 - $lng1) * (M_PI / 180.0) * self::EARTH_RADIUS_METERS * cos(deg2rad($midLat));
        $dy = ($lat2 - $lat1) * (M_PI / 180.0) * self::EARTH_RADIUS_METERS;
        return hypot($dx, $dy);
    }

    public static function polygonAreaSqm(array $ring): float
    {
        $n = count($ring) - 1;
        $sum = 0.0;
        for ($i = 0; $i < $n; $i++) {
            $sum += $ring[$i][0] * $ring[$i + 1][1] - $ring[$i + 1][0] * $ring[$i][1];
        }
        $lat = array_sum(array_column(array_slice($ring, 0, -1), 1)) / $n;
        return abs($sum) / 2.0 * pow(M_PI / 180.0 * self::EARTH_RADIUS_METERS, 2) * cos(deg2rad($lat));
    }

    private static function cross(array $a, array $b, array $c): float
    {
        return ($b[0] - $a[0]) * ($c[1] - $a[1]) - ($b[1] - $a[1]) * ($c[0] - $a[0]);
    }

    private static function on(array $p, array $a, array $b): bool
    {
        return abs(self::cross($a, $b, $p)) < 1e-12
            && $p[0] >= min($a[0], $b[0]) - 1e-10 && $p[0] <= max($a[0], $b[0]) + 1e-10
            && $p[1] >= min($a[1], $b[1]) - 1e-10 && $p[1] <= max($a[1], $b[1]) + 1e-10;
    }

    private static function proper(array $a, array $b, array $c, array $d): bool
    {
        return self::cross($a, $b, $c) * self::cross($a, $b, $d) < -1e-24
            && self::cross($c, $d, $a) * self::cross($c, $d, $b) < -1e-24;
    }

    /**
     * Validates GeoJSON geometry structure and calculates spatial attributes.
     *
     * @param mixed $g
     * @param string|null $featureTypeHint
     * @return array{feature_type: string, geometry: array, area_sqm: float|null, area_decimal: float|null, length_meters: float|null, bbox: array{float, float, float, float}}
     */
    public static function validate(mixed $g, ?string $featureTypeHint = null): array
    {
        if (!is_array($g)) {
            self::error('INVALID_GEOMETRY', 'জ্যামিতি অবজেক্ট সঠিক নয়।', 'Invalid geometry object structure.');
        }

        $typeRaw = (string) ($g['type'] ?? '');
        $typeNorm = strtolower(trim($typeRaw));
        $coordinates = $g['coordinates'] ?? null;

        if (!is_array($coordinates)) {
            self::error('INVALID_COORDINATES', 'স্থানাঙ্ক তালিকা সঠিক নয়।', 'Invalid coordinates array.');
        }

        // Map type
        if (in_array($typeNorm, ['polygon'], true)) {
            return self::validatePolygon($coordinates, $featureTypeHint);
        }

        if (in_array($typeNorm, ['linestring', 'line'], true)) {
            return self::validateLineString($coordinates, $featureTypeHint);
        }

        if (in_array($typeNorm, ['point'], true)) {
            return self::validatePoint($coordinates, $featureTypeHint);
        }

        self::error('UNSUPPORTED_GEOMETRY_TYPE', "অসমর্থিত জ্যামিতি টাইপ '{$typeRaw}'। শুধুমাত্র Polygon, LineString বা Point অনুমোদিত।", "Unsupported geometry type '{$typeRaw}'. Only Polygon, LineString, or Point are supported.");
    }

    private static function validateCoordinatePair(mixed $p): array
    {
        if (!is_array($p) || !array_is_list($p) || count($p) !== 2) {
            self::error('INVALID_COORDINATE_FORMAT', 'প্রতিটি স্থানাঙ্ক [দ্রাঘিমাংশ, অক্ষাংশ] জোড়া হতে হবে।', 'Each coordinate must be [lng, lat] pair.');
        }

        if (!(is_int($p[0]) || is_float($p[0])) || !(is_int($p[1]) || is_float($p[1]))) {
            self::error('INVALID_COORDINATE_NUMERIC', 'স্থানাঙ্ক মান সংখ্যাবাচক হতে হবে।', 'Coordinate values must be numeric.');
        }

        $lng = (float) $p[0];
        $lat = (float) $p[1];

        if (!is_finite($lng) || !is_finite($lat)) {
            self::error('INVALID_COORDINATE_FINITE', 'স্থানাঙ্ক মান সসীম হতে হবে।', 'Coordinate values must be finite.');
        }

        if (!self::isInsideBangladesh($lng, $lat)) {
            self::error('COORDINATE_OUT_OF_BOUNDS', 'স্থানাঙ্ক অবশ্যই বাংলাদেশের সীমার মধ্যে হতে হবে (৮৮°–৯৩° পূর্ব, ২০°–২৭° উত্তর)।', 'Coordinates must fall within Bangladesh bounds (lng 88-93, lat 20-27).');
        }

        return [$lng, $lat];
    }

    private static function validatePolygon(array $coordinates, ?string $hint): array
    {
        if (count($coordinates) !== 1 || !is_array($coordinates[0])) {
            self::error('SINGLE_POLYGON_REQUIRED', 'একটি একক বন্ধ সীমানা (Exterior Ring) দিন; hole সমর্থিত নয়।', 'Single closed boundary ring required; holes not supported.');
        }

        $ring = $coordinates[0];
        $cnt = count($ring);
        if ($cnt < 4 || $cnt > 201) {
            self::error('INVALID_RING', '৩ থেকে ২০০টি কোণ দিয়ে বন্ধ বহুভুজ তৈরি করুন।', 'Polygon must have between 3 and 200 vertices.');
        }

        $cleanedRing = [];
        foreach ($ring as $pt) {
            $cleanedRing[] = self::validateCoordinatePair($pt);
        }

        // Must be closed ring: first vertex equals last vertex
        $first = $cleanedRing[0];
        $last = $cleanedRing[$cnt - 1];
        if (abs($first[0] - $last[0]) > 1e-9 || abs($first[1] - $last[1]) > 1e-9) {
            self::error('UNCLOSED_RING', 'বহুভুজের শুরুর ও শেষের স্থানাঙ্ক একই হতে হবে।', 'First and last coordinates of polygon ring must match.');
        }

        $n = $cnt - 1;
        $perimeter = 0.0;
        for ($i = 0; $i < $n; $i++) {
            if (abs($cleanedRing[$i][0] - $cleanedRing[$i + 1][0]) < 1e-10 && abs($cleanedRing[$i][1] - $cleanedRing[$i + 1][1]) < 1e-10) {
                self::error('DUPLICATE_VERTEX', 'একই কোণ পরপর দুইবার দেওয়া যাবে না।', 'Consecutive duplicate vertices are not permitted.');
            }
            $perimeter += self::distanceMeters($cleanedRing[$i][0], $cleanedRing[$i][1], $cleanedRing[$i + 1][0], $cleanedRing[$i + 1][1]);

            for ($j = $i + 1; $j < $n; $j++) {
                if ($j === $i + 1 || ($i === 0 && $j === $n - 1)) {
                    continue;
                }
                if (
                    self::proper($cleanedRing[$i], $cleanedRing[$i + 1], $cleanedRing[$j], $cleanedRing[$j + 1])
                    || self::on($cleanedRing[$i], $cleanedRing[$j], $cleanedRing[$j + 1])
                    || self::on($cleanedRing[$j], $cleanedRing[$i], $cleanedRing[$i + 1])
                ) {
                    self::error('SELF_INTERSECTION', 'বহুভুজের সীমানা নিজেকে ছেদ করছে। কোণ সরিয়ে ঠিক করুন।', 'Polygon self-intersects.');
                }
            }
        }

        $areaSqm = self::polygonAreaSqm($cleanedRing);
        if ($areaSqm < 1e-6) {
            self::error('ZERO_AREA', 'বহুভুজের আয়তন শূন্য বা অতি ক্ষুদ্র।', 'Polygon area is zero or too small.');
        }

        $areaDecimal = $areaSqm / self::DECIMAL_TO_SQM;

        $lngs = array_column($cleanedRing, 0);
        $lats = array_column($cleanedRing, 1);
        $bbox = [min($lngs), min($lats), max($lngs), max($lats)];

        return [
            'feature_type' => 'polygon',
            'geometry' => [
                'type' => 'Polygon',
                'coordinates' => [$cleanedRing],
            ],
            'area_sqm' => round($areaSqm, 4),
            'area_decimal' => round($areaDecimal, 4),
            'length_meters' => round($perimeter, 2),
            'bbox' => $bbox,
        ];
    }

    private static function validateLineString(array $coordinates, ?string $hint): array
    {
        $cnt = count($coordinates);
        if ($cnt < 2 || $cnt > 500) {
            self::error('INVALID_LINE_LENGTH', 'রেখায় কমপক্ষে ২ এবং সর্বোচ্চ ৫০০টি বিন্দু থাকতে হবে।', 'LineString must have between 2 and 500 points.');
        }

        $cleanedLine = [];
        foreach ($coordinates as $pt) {
            $cleanedLine[] = self::validateCoordinatePair($pt);
        }

        $totalLength = 0.0;
        for ($i = 0; $i < $cnt - 1; $i++) {
            if (abs($cleanedLine[$i][0] - $cleanedLine[$i + 1][0]) < 1e-10 && abs($cleanedLine[$i][1] - $cleanedLine[$i + 1][1]) < 1e-10) {
                self::error('DUPLICATE_VERTEX', 'রেখায় পরপর দুটি বিন্দু অভিন্ন হতে পারবে না।', 'Consecutive duplicate points are not permitted in LineString.');
            }
            $totalLength += self::distanceMeters(
                $cleanedLine[$i][0],
                $cleanedLine[$i][1],
                $cleanedLine[$i + 1][0],
                $cleanedLine[$i + 1][1]
            );
        }

        $lngs = array_column($cleanedLine, 0);
        $lats = array_column($cleanedLine, 1);
        $bbox = [min($lngs), min($lats), max($lngs), max($lats)];

        return [
            'feature_type' => 'line',
            'geometry' => [
                'type' => 'LineString',
                'coordinates' => $cleanedLine,
            ],
            'area_sqm' => null,
            'area_decimal' => null,
            'length_meters' => round($totalLength, 2),
            'bbox' => $bbox,
        ];
    }

    private static function validatePoint(mixed $coordinates, ?string $hint): array
    {
        $pt = self::validateCoordinatePair($coordinates);

        return [
            'feature_type' => 'point',
            'geometry' => [
                'type' => 'Point',
                'coordinates' => $pt,
            ],
            'area_sqm' => null,
            'area_decimal' => null,
            'length_meters' => null,
            'bbox' => [$pt[0], $pt[1], $pt[0], $pt[1]],
        ];
    }
}
