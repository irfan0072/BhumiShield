<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Middleware\RoleMiddleware;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Controller for Admin-Managed Bilingual Service Catalogue and Source-Linked Guidance/Fee Registry.
 */
final class ServiceCatalogueController
{
    private static function validateHttpsUrl(?string $url, string $fieldName): void
    {
        if ($url === null || trim($url) === '') {
            return;
        }
        $trimmed = trim($url);
        if (!filter_var($trimmed, FILTER_VALIDATE_URL) || !str_starts_with($trimmed, 'https://')) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_HTTPS_URL',
                'message_bn' => "{$fieldName} অবশ্যই একটি বৈধ সুরক্ষিত HTTPS URL হতে হবে।",
                'message_en' => "{$fieldName} must be a valid, secure HTTPS URL.",
            ], JSON_UNESCAPED_UNICODE));
        }
    }

    private static function sanitizeText(string $text): string
    {
        return trim(strip_tags($text));
    }

    // -------------------------------------------------------------------------
    // PUBLIC API ENDPOINTS
    // -------------------------------------------------------------------------

    public static function listPublicServices(?string $category = null, ?string $q = null): array
    {
        $sql = 'SELECT * FROM service_catalogue WHERE is_published = 1';
        $params = [];

        if ($category !== null && trim($category) !== '' && $category !== 'ALL') {
            $sql .= ' AND category = ?';
            $params[] = trim($category);
        }

        if ($q !== null && trim($q) !== '') {
            $qLike = '%' . mb_strtolower(trim($q)) . '%';
            $sql .= ' AND (LOWER(title_bn) LIKE ? OR LOWER(title_en) LIKE ? OR LOWER(description_bn) LIKE ? OR LOWER(description_en) LIKE ? OR LOWER(service_code) LIKE ?)';
            $params[] = $qLike;
            $params[] = $qLike;
            $params[] = $qLike;
            $params[] = $qLike;
            $params[] = $qLike;
        }

        $sql .= ' ORDER BY display_order ASC, id ASC';
        $rows = DB::select($sql, $params);

        return [
            'items' => $rows,
            'total' => count($rows),
            'disclaimer_bn' => 'সরকারি সেবাসমূহ সংশ্লিষ্ট ভূমি অফিসের কর্তৃত্বাধীন। ভূমি সুরক্ষা একটি স্বাধীন ল্যান্ডটেক ২০২৬ প্রোটোটাইপ।',
            'disclaimer_en' => 'Official government services belong to their respective authorities. BhumiShield is an independent LandTech 2026 prototype.',
        ];
    }

    public static function getPublicService(string $codeOrId): array
    {
        $service = null;
        if (ctype_digit($codeOrId)) {
            $service = DB::selectOne('SELECT * FROM service_catalogue WHERE id = ? AND is_published = 1', [(int) $codeOrId]);
        } else {
            $service = DB::selectOne('SELECT * FROM service_catalogue WHERE service_code = ? AND is_published = 1', [trim($codeOrId)]);
        }

        if (!$service) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'SERVICE_NOT_FOUND',
                'message_bn' => 'অনুরোধকৃত সেবাটি পাওয়া যায়নি বা অপ্রকাশিত রয়েছে।',
                'message_en' => 'The requested service was not found or is currently unpublished.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // Attach related fee if exists
        $fee = DB::selectOne('SELECT * FROM service_fees_registry WHERE service_code = ? AND is_published = 1', [$service['service_code']]);
        if ($fee) {
            $fee['components'] = json_decode((string) $fee['components_json'], true) ?: [];
            $service['associated_fee'] = $fee;
        }

        return ['service' => $service];
    }

    public static function listPublicFees(): array
    {
        $rows = DB::select('SELECT * FROM service_fees_registry WHERE is_published = 1 ORDER BY id ASC');
        foreach ($rows as &$r) {
            $r['components'] = json_decode((string) ($r['components_json'] ?? '[]'), true) ?: [];
            unset($r['history_json']); // do not expose internal edit history to public
        }
        unset($r);

        return [
            'items' => $rows,
            'total' => count($rows),
            'circular_note_bn' => 'ভূমি রেকর্ড ও মৌজা ম্যাপ ফি ভূমি মন্ত্রণালয়ের ১৭ ফেব্রুয়ারি ২০২৬ তারিখের স্মারক সার্কুলার অনুযায়ী প্রযোজ্য। ফি প্রদান সংশ্লিষ্ট সরকারি পোর্টালে সম্পন্ন করতে হবে।',
            'circular_note_en' => 'Khatian and mouza map fees reflect the signed Ministry of Land circular dated 17 February 2026. Payment must be made directly on official portals.',
        ];
    }

    // -------------------------------------------------------------------------
    // ADMIN SERVICE CATALOGUE CRUD & PUBLISHING
    // -------------------------------------------------------------------------

    public static function listAdminServices(): array
    {
        $actor = RoleMiddleware::authorize(['admin', 'system_admin', 'platform_moderator', 'content_editor', 'content_approver', 'auditor', 'support_agent']);
        $rows = DB::select('SELECT * FROM service_catalogue ORDER BY display_order ASC, id ASC');
        return ['items' => $rows, 'total' => count($rows)];
    }

    public static function createService(array $req, ?array $user = null): array
    {
        $actor = RoleMiddleware::authorize(['admin'], $user);

        $code = strtoupper(trim(self::sanitizeText((string) ($req['service_code'] ?? ''))));
        if ($code === '' || strlen($code) < 3) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_SERVICE_CODE',
                'message_bn' => 'সার্ভিস কোড কমপক্ষে ৩ অক্ষরের হতে হবে (যেমন: MUTATION_ACLAND)।',
                'message_en' => 'Service code must be at least 3 characters.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $existing = DB::selectOne('SELECT id FROM service_catalogue WHERE service_code = ?', [$code]);
        if ($existing) {
            throw new \RuntimeException(json_encode([
                'status' => 409,
                'code' => 'SERVICE_CODE_EXISTS',
                'message_bn' => "সার্ভিস কোড '{$code}' ইতিমধ্যে ব্যবহৃত হয়েছে।",
                'message_en' => "Service code '{$code}' already exists.",
            ], JSON_UNESCAPED_UNICODE));
        }

        $titleBn = self::sanitizeText((string) ($req['title_bn'] ?? ''));
        $titleEn = self::sanitizeText((string) ($req['title_en'] ?? $titleBn));
        if ($titleBn === '') {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'TITLE_REQUIRED',
                'message_bn' => 'সেবার বাংলা শিরোনাম আবশ্যক।',
                'message_en' => 'Service title in Bangla is required.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $category = strtoupper(trim(self::sanitizeText((string) ($req['category'] ?? 'REVENUE_MUTATION'))));
        $descBn = self::sanitizeText((string) ($req['description_bn'] ?? ''));
        $descEn = self::sanitizeText((string) ($req['description_en'] ?? $descBn));
        $serviceType = strtoupper(trim(self::sanitizeText((string) ($req['service_type'] ?? 'EXTERNAL_OFFICIAL'))));

        $extUrl = isset($req['external_url']) && trim((string) $req['external_url']) !== '' ? trim((string) $req['external_url']) : null;
        $srcUrl = isset($req['source_url']) && trim((string) $req['source_url']) !== '' ? trim((string) $req['source_url']) : null;
        self::validateHttpsUrl($extUrl, 'external_url');
        self::validateHttpsUrl($srcUrl, 'source_url');

        $intRoute = isset($req['internal_route']) && trim((string) $req['internal_route']) !== '' ? trim((string) $req['internal_route']) : null;
        $authBn = self::sanitizeText((string) ($req['authority_name_bn'] ?? 'ভূমি মন্ত্রণালয়'));
        $authEn = self::sanitizeText((string) ($req['authority_name_en'] ?? 'Ministry of Land'));
        $badgeBn = self::sanitizeText((string) ($req['badge_bn'] ?? 'সরকারি সেবা'));
        $badgeEn = self::sanitizeText((string) ($req['badge_en'] ?? 'Official Service'));
        $isPub = isset($req['is_published']) ? ((int) $req['is_published'] ? 1 : 0) : 0;
        $order = (int) ($req['display_order'] ?? 0);
        $reviewDate = trim((string) ($req['last_reviewed_date'] ?? date('Y-m-d')));
        $nowIso = gmdate('c');

        $id = DB::insert(
            'INSERT INTO service_catalogue (category, service_code, title_bn, title_en, description_bn, description_en, service_type, internal_route, external_url, source_url, authority_name_bn, authority_name_en, badge_bn, badge_en, is_published, display_order, last_reviewed_date, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$category, $code, $titleBn, $titleEn, $descBn, $descEn, $serviceType, $intRoute, $extUrl, $srcUrl, $authBn, $authEn, $badgeBn, $badgeEn, $isPub, $order, $reviewDate, $nowIso, $nowIso]
        );

        DatabaseSeeder::appendAuditEntry(
            (string) ($actor['username'] ?? 'admin'),
            'admin',
            'SERVICE_CATALOGUE_CREATED',
            'service_catalogue',
            (string) $id,
            ['service_code' => $code, 'title_bn' => $titleBn, 'category' => $category],
            $nowIso
        );

        $created = DB::selectOne('SELECT * FROM service_catalogue WHERE id = ?', [$id]);
        return [
            'service' => $created,
            'message_bn' => "সেবা '{$titleBn}' সফলভাবে ক্যাটালগে যুক্ত করা হয়েছে।",
            'message_en' => "Service '{$titleEn}' added to catalogue successfully.",
        ];
    }

    public static function updateService(int $id, array $req, ?array $user = null): array
    {
        $actor = RoleMiddleware::authorize(['admin'], $user);
        $svc = DB::selectOne('SELECT * FROM service_catalogue WHERE id = ?', [$id]);
        if (!$svc) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'SERVICE_NOT_FOUND',
                'message_bn' => 'সেবাটি পাওয়া যায়নি।',
                'message_en' => 'Service record not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $titleBn = isset($req['title_bn']) ? self::sanitizeText((string) $req['title_bn']) : $svc['title_bn'];
        $titleEn = isset($req['title_en']) ? self::sanitizeText((string) $req['title_en']) : $svc['title_en'];
        $category = isset($req['category']) ? strtoupper(trim(self::sanitizeText((string) $req['category']))) : $svc['category'];
        $descBn = isset($req['description_bn']) ? self::sanitizeText((string) $req['description_bn']) : $svc['description_bn'];
        $descEn = isset($req['description_en']) ? self::sanitizeText((string) $req['description_en']) : $svc['description_en'];
        $serviceType = isset($req['service_type']) ? strtoupper(trim(self::sanitizeText((string) $req['service_type']))) : $svc['service_type'];

        $extUrl = isset($req['external_url']) ? (trim((string) $req['external_url']) !== '' ? trim((string) $req['external_url']) : null) : $svc['external_url'];
        $srcUrl = isset($req['source_url']) ? (trim((string) $req['source_url']) !== '' ? trim((string) $req['source_url']) : null) : $svc['source_url'];
        self::validateHttpsUrl($extUrl, 'external_url');
        self::validateHttpsUrl($srcUrl, 'source_url');

        $intRoute = isset($req['internal_route']) ? (trim((string) $req['internal_route']) !== '' ? trim((string) $req['internal_route']) : null) : $svc['internal_route'];
        $authBn = isset($req['authority_name_bn']) ? self::sanitizeText((string) $req['authority_name_bn']) : $svc['authority_name_bn'];
        $authEn = isset($req['authority_name_en']) ? self::sanitizeText((string) $req['authority_name_en']) : $svc['authority_name_en'];
        $badgeBn = isset($req['badge_bn']) ? self::sanitizeText((string) $req['badge_bn']) : $svc['badge_bn'];
        $badgeEn = isset($req['badge_en']) ? self::sanitizeText((string) $req['badge_en']) : $svc['badge_en'];
        $isPub = isset($req['is_published']) ? ((int) $req['is_published'] ? 1 : 0) : (int) $svc['is_published'];
        $order = isset($req['display_order']) ? (int) $req['display_order'] : (int) $svc['display_order'];
        $reviewDate = isset($req['last_reviewed_date']) ? trim((string) $req['last_reviewed_date']) : date('Y-m-d');
        $nowIso = gmdate('c');

        DB::statement(
            'UPDATE service_catalogue
             SET category = ?, title_bn = ?, title_en = ?, description_bn = ?, description_en = ?,
                 service_type = ?, internal_route = ?, external_url = ?, source_url = ?,
                 authority_name_bn = ?, authority_name_en = ?, badge_bn = ?, badge_en = ?,
                 is_published = ?, display_order = ?, last_reviewed_date = ?, updated_at = ?
             WHERE id = ?',
            [$category, $titleBn, $titleEn, $descBn, $descEn, $serviceType, $intRoute, $extUrl, $srcUrl, $authBn, $authEn, $badgeBn, $badgeEn, $isPub, $order, $reviewDate, $nowIso, $id]
        );

        DatabaseSeeder::appendAuditEntry(
            (string) ($actor['username'] ?? 'admin'),
            'admin',
            'SERVICE_CATALOGUE_UPDATED',
            'service_catalogue',
            (string) $id,
            ['service_code' => $svc['service_code'], 'title_bn' => $titleBn, 'is_published' => $isPub],
            $nowIso
        );

        $updated = DB::selectOne('SELECT * FROM service_catalogue WHERE id = ?', [$id]);
        return [
            'service' => $updated,
            'message_bn' => "সেবা '{$titleBn}' সফলভাবে হালনাগাদ করা হয়েছে।",
            'message_en' => "Service '{$titleEn}' updated successfully.",
        ];
    }

    public static function togglePublishService(int $id, ?array $user = null): array
    {
        $actor = RoleMiddleware::authorize(['admin'], $user);
        $svc = DB::selectOne('SELECT * FROM service_catalogue WHERE id = ?', [$id]);
        if (!$svc) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'SERVICE_NOT_FOUND',
                'message_bn' => 'সেবাটি পাওয়া যায়নি।',
                'message_en' => 'Service not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $newPub = ((int) $svc['is_published']) === 1 ? 0 : 1;
        $nowIso = gmdate('c');
        DB::statement('UPDATE service_catalogue SET is_published = ?, updated_at = ? WHERE id = ?', [$newPub, $nowIso, $id]);

        DatabaseSeeder::appendAuditEntry(
            (string) ($actor['username'] ?? 'admin'),
            'admin',
            $newPub ? 'SERVICE_PUBLISHED' : 'SERVICE_ARCHIVED',
            'service_catalogue',
            (string) $id,
            ['service_code' => $svc['service_code'], 'is_published' => $newPub],
            $nowIso
        );

        return [
            'id' => $id,
            'is_published' => $newPub,
            'message_bn' => $newPub ? 'সেবাটি সফলভাবে প্রকাশিত হয়েছে।' : 'সেবাটি আর্কাইভ/অপ্রকাশিত করা হয়েছে।',
            'message_en' => $newPub ? 'Service published successfully.' : 'Service archived successfully.',
        ];
    }

    public static function archiveService(int $id, ?array $user = null): array
    {
        $actor = RoleMiddleware::authorize(['admin'], $user);
        $svc = DB::selectOne('SELECT * FROM service_catalogue WHERE id = ?', [$id]);
        if (!$svc) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'SERVICE_NOT_FOUND',
                'message_bn' => 'সেবাটি পাওয়া যায়নি।',
                'message_en' => 'Service not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $nowIso = gmdate('c');
        DB::statement('UPDATE service_catalogue SET is_published = 0, updated_at = ? WHERE id = ?', [$nowIso, $id]);

        DatabaseSeeder::appendAuditEntry(
            (string) ($actor['username'] ?? 'admin'),
            'admin',
            'SERVICE_ARCHIVED',
            'service_catalogue',
            (string) $id,
            ['service_code' => $svc['service_code']],
            $nowIso
        );

        return [
            'id' => $id,
            'is_published' => 0,
            'message_bn' => "সেবা '{$svc['title_bn']}' আর্কাইভ করা হয়েছে।",
            'message_en' => "Service '{$svc['title_en']}' archived.",
        ];
    }

    // -------------------------------------------------------------------------
    // ADMIN SERVICE FEES REGISTRY & VERSIONING
    // -------------------------------------------------------------------------

    public static function listAdminFees(): array
    {
        $actor = RoleMiddleware::authorize(['admin', 'system_admin', 'platform_moderator', 'content_editor', 'content_approver', 'auditor', 'support_agent']);
        $rows = DB::select('SELECT * FROM service_fees_registry ORDER BY id ASC');
        foreach ($rows as &$r) {
            $r['components'] = json_decode((string) ($r['components_json'] ?? '[]'), true) ?: [];
            $r['history'] = json_decode((string) ($r['history_json'] ?? '[]'), true) ?: [];
        }
        unset($r);
        return ['items' => $rows, 'total' => count($rows)];
    }

    public static function updateFee(int $id, array $req, ?array $user = null): array
    {
        $actor = RoleMiddleware::authorize(['admin'], $user);
        $fee = DB::selectOne('SELECT * FROM service_fees_registry WHERE id = ?', [$id]);
        if (!$fee) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'FEE_NOT_FOUND',
                'message_bn' => 'ফি রেকর্ড পাওয়া যায়নি।',
                'message_en' => 'Fee registry record not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $srcUrl = isset($req['source_url']) ? trim((string) $req['source_url']) : (string) $fee['source_url'];
        if ($srcUrl === '') {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'SOURCE_URL_REQUIRED',
                'message_bn' => 'ফি-এর অফিশিয়াল সোর্স ইউআরএল আবশ্যক।',
                'message_en' => 'Official source URL is required for fee updates.',
            ], JSON_UNESCAPED_UNICODE));
        }
        self::validateHttpsUrl($srcUrl, 'source_url');

        if (isset($req['total_bdt'])) {
            if (!is_numeric($req['total_bdt']) || !is_finite((float) $req['total_bdt']) || (float) $req['total_bdt'] < 0) {
                throw new \RuntimeException(json_encode([
                    'status' => 422,
                    'code' => 'INVALID_FEE_AMOUNT',
                    'message_bn' => 'ফি-এর পরিমাণ একটি সসীম অ-ঋণাত্মক সংখ্যা হতে হবে।',
                    'message_en' => 'Total fee must be a finite non-negative number.',
                ], JSON_UNESCAPED_UNICODE));
            }
            $totalBdt = (float) $req['total_bdt'];
        } else {
            $totalBdt = (float) $fee['total_bdt'];
        }

        $effDate = isset($req['effective_date']) ? trim((string) $req['effective_date']) : (string) $fee['effective_date'];
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $effDate)) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_EFFECTIVE_DATE',
                'message_bn' => 'কার্যকর তারিখ অবশ্যই YYYY-MM-DD ফরম্যাটে হতে হবে।',
                'message_en' => 'Effective date must be a valid ISO date (YYYY-MM-DD).',
            ], JSON_UNESCAPED_UNICODE));
        }
        [$y, $m, $d] = explode('-', $effDate);
        if (!checkdate((int) $m, (int) $d, (int) $y)) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_EFFECTIVE_DATE',
                'message_bn' => 'কার্যকর তারিখটি একটি সঠিক ক্যালেন্ডার তারিখ নয়।',
                'message_en' => 'Effective date is not a valid calendar date.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $titleBn = isset($req['title_bn']) ? self::sanitizeText((string) $req['title_bn']) : $fee['title_bn'];
        if ($titleBn === '') {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'TITLE_REQUIRED',
                'message_bn' => 'ফি রেকর্ডের শিরোনাম আবশ্যক।',
                'message_en' => 'Fee title is required.',
            ], JSON_UNESCAPED_UNICODE));
        }
        $titleEn = isset($req['title_en']) ? self::sanitizeText((string) $req['title_en']) : $fee['title_en'];
        $legalBn = isset($req['legal_basis_bn']) ? self::sanitizeText((string) $req['legal_basis_bn']) : $fee['legal_basis_bn'];
        $legalEn = isset($req['legal_basis_en']) ? self::sanitizeText((string) $req['legal_basis_en']) : $fee['legal_basis_en'];
        $circNo = isset($req['circular_no']) ? self::sanitizeText((string) $req['circular_no']) : $fee['circular_no'];
        $authBn = isset($req['authority_name_bn']) ? self::sanitizeText((string) $req['authority_name_bn']) : $fee['authority_name_bn'];
        $authEn = isset($req['authority_name_en']) ? self::sanitizeText((string) $req['authority_name_en']) : $fee['authority_name_en'];
        $isEst = isset($req['is_estimate']) ? ((int) $req['is_estimate'] ? 1 : 0) : (int) $fee['is_estimate'];
        $isPub = isset($req['is_published']) ? ((int) $req['is_published'] ? 1 : 0) : (int) $fee['is_published'];

        $components = isset($req['components']) && is_array($req['components'])
            ? $req['components']
            : (json_decode((string) $fee['components_json'], true) ?: []);

        $compSum = 0.0;
        $hasComponents = !empty($components);
        foreach ($components as $comp) {
            if (!is_array($comp)) {
                throw new \RuntimeException(json_encode([
                    'status' => 422,
                    'code' => 'INVALID_FEE_COMPONENT',
                    'message_bn' => 'ফি কম্পোনেন্ট বিন্যাস সঠিক নয়।',
                    'message_en' => 'Invalid fee component format.',
                ], JSON_UNESCAPED_UNICODE));
            }
            $amt = $comp['amount_bdt'] ?? ($comp['amount'] ?? 0);
            if (!is_numeric($amt) || !is_finite((float) $amt) || (float) $amt < 0) {
                throw new \RuntimeException(json_encode([
                    'status' => 422,
                    'code' => 'INVALID_COMPONENT_AMOUNT',
                    'message_bn' => 'ফি কম্পোনেন্টের পরিমাণ অ-ঋণাত্মক সংখ্যা হতে হবে।',
                    'message_en' => 'Fee component amount must be a finite non-negative number.',
                ], JSON_UNESCAPED_UNICODE));
            }
            $compSum += (float) $amt;
        }

        if ($hasComponents && !$isEst && abs($compSum - $totalBdt) > 0.5) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INCOHERENT_FEE_COMPONENTS',
                'message_bn' => 'কম্পোনেন্টের যোগফল (BDT ' . number_format($compSum, 2) . ') মোট ফি (BDT ' . number_format($totalBdt, 2) . ')-এর সাথে মিলছে না।',
                'message_en' => 'The sum of fee components does not equal the total fee amount.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $compJson = json_encode($components, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        // Version History Tracking: Snapshot previous state before update
        $history = json_decode((string) ($fee['history_json'] ?? '[]'), true) ?: [];
        $history[] = [
            'version' => (int) $fee['version'],
            'total_bdt' => (float) $fee['total_bdt'],
            'components' => json_decode((string) $fee['components_json'], true) ?: [],
            'legal_basis_bn' => $fee['legal_basis_bn'],
            'circular_no' => $fee['circular_no'],
            'effective_date' => $fee['effective_date'],
            'source_url' => $fee['source_url'],
            'updated_by' => (string) ($actor['username'] ?? 'admin'),
            'updated_at' => gmdate('c'),
        ];
        $histJson = json_encode($history, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $newVer = ((int) $fee['version']) + 1;
        $nowIso = gmdate('c');

        DB::statement(
            'UPDATE service_fees_registry
             SET title_bn = ?, title_en = ?, components_json = ?, total_bdt = ?, authority_name_bn = ?,
                 authority_name_en = ?, legal_basis_bn = ?, legal_basis_en = ?, circular_no = ?,
                 effective_date = ?, source_url = ?, is_estimate = ?, is_published = ?,
                 version = ?, history_json = ?, updated_at = ?
             WHERE id = ?',
            [$titleBn, $titleEn, $compJson, $totalBdt, $authBn, $authEn, $legalBn, $legalEn, $circNo, $effDate, $srcUrl, $isEst, $isPub, $newVer, $histJson, $nowIso, $id]
        );

        DatabaseSeeder::appendAuditEntry(
            (string) ($actor['username'] ?? 'admin'),
            'admin',
            'SERVICE_FEE_UPDATED',
            'service_fees_registry',
            (string) $id,
            [
                'service_code' => $fee['service_code'],
                'new_version' => $newVer,
                'total_bdt' => $totalBdt,
                'circular_no' => $circNo,
            ],
            $nowIso
        );

        $updated = DB::selectOne('SELECT * FROM service_fees_registry WHERE id = ?', [$id]);
        $updated['components'] = json_decode((string) $updated['components_json'], true) ?: [];
        $updated['history'] = json_decode((string) $updated['history_json'], true) ?: [];

        return [
            'fee' => $updated,
            'message_bn' => "ফি রেকর্ড '{$titleBn}' সফলভাবে হালনাগাদ ও ভার্সন {$newVer} সংরক্ষিত হয়েছে।",
            'message_en' => "Fee record '{$titleEn}' updated and version {$newVer} archived.",
        ];
    }
}
