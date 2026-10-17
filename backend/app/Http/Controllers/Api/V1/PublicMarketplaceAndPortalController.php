<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Middleware\RoleMiddleware;
use App\Services\JwtAuthService;
use App\Services\LookupService;
use App\Services\PdfSealService;
use App\Services\PublicRecordService;
use App\Support\DB;

/**
 * Public Marketplace (Land Sale Listings), Notices, Educational Blog, and Map Features Controller.
 * Implements Specification Sections 8.3, 8.4, 8.5, and 8.6.
 */
final class PublicMarketplaceAndPortalController
{
    // -------------------------------------------------------------------------
    // 1. PUBLIC LAND SALE MARKETPLACE (Section 8.4)
    // -------------------------------------------------------------------------

    public static function listListings(array $filters = []): array
    {
        $sql = "SELECT l.*, p.plot_code, p.dag_no, p.dag_no_bn, p.land_type_bn, p.land_type_en,
                       loc.district_bn, loc.district_en, loc.upazila_bn, loc.upazila_en, loc.mouza_bn, loc.mouza_en
                FROM listings l
                JOIN plots p ON p.id = l.plot_id
                JOIN locations loc ON loc.id = p.location_id
                WHERE l.status = 'ACTIVE'";
        $params = [];

        if (!empty($filters['district'])) {
            $sql .= ' AND (loc.district_en = ? OR loc.district_bn = ?)';
            $params[] = $filters['district'];
            $params[] = $filters['district'];
        }

        if (!empty($filters['upazila'])) {
            $sql .= ' AND (loc.upazila_en = ? OR loc.upazila_bn = ?)';
            $params[] = $filters['upazila'];
            $params[] = $filters['upazila'];
        }

        if (!empty($filters['mouza'])) {
            $sql .= ' AND (loc.mouza_en = ? OR loc.mouza_bn = ?)';
            $params[] = $filters['mouza'];
            $params[] = $filters['mouza'];
        }

        if (!empty($filters['min_price'])) {
            $sql .= ' AND l.asking_price_bdt >= ?';
            $params[] = (int) $filters['min_price'];
        }

        if (!empty($filters['max_price'])) {
            $sql .= ' AND l.asking_price_bdt <= ?';
            $params[] = (int) $filters['max_price'];
        }

        $sql .= ' ORDER BY l.id DESC';
        $rows = DB::select($sql, $params);

        $items = array_map(static function (array $r): array {
            $r['seller_nid_masked'] = PublicRecordService::maskNid((string) $r['seller_nid']);
            unset($r['seller_nid']);
            return PublicRecordService::forViewer($r);
        }, $rows);

        return [
            'items' => $items,
            'total' => count($items),
            'disclaimer_bn' => 'বিজ্ঞাপন কোনো আইনি প্রস্তাব বা মালিকানার সনদ নয়। জমি হস্তান্তরের সকল আর্থিক লেনদেন ও দলিল সম্পাদন কেবল অনুমোদিত সাব-রেজিস্ট্রি অফিসে সম্পন্ন করতে হবে।',
            'disclaimer_en' => 'Listings are not legal offers or ownership titles. All property transfers and payments occur strictly through the authorized sub-registry process.',
        ];
    }

    public static function getListing(string|int $codeOrId): array
    {
        $listing = null;
        if (is_numeric($codeOrId)) {
            $listing = DB::selectOne('SELECT * FROM listings WHERE id = ?', [(int) $codeOrId]);
        }
        if (!$listing) {
            $listing = DB::selectOne('SELECT * FROM listings WHERE listing_code = ?', [(string) $codeOrId]);
        }

        if (!$listing) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'LISTING_NOT_FOUND',
                'message_bn' => 'জমির বিজ্ঞাপনের তালিকাটি খুঁজে পাওয়া যায়নি।',
                'message_en' => 'Land sale listing not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $plot = DB::selectOne(
            'SELECT p.*, loc.district_bn, loc.district_en, loc.upazila_bn, loc.upazila_en, loc.mouza_bn, loc.mouza_en
             FROM plots p
             JOIN locations loc ON loc.id = p.location_id
             WHERE p.id = ?',
            [(int) $listing['plot_id']]
        );

        if ($plot) {
            $listing['dag_no'] = $plot['dag_no'];
            $listing['dag_no_bn'] = $plot['dag_no_bn'];
            $listing['mouza_bn'] = $plot['mouza_bn'];
            $listing['mouza_en'] = $plot['mouza_en'];
            $listing['upazila_bn'] = $plot['upazila_bn'];
            $listing['upazila_en'] = $plot['upazila_en'];
            $listing['district_bn'] = $plot['district_bn'];
            $listing['district_en'] = $plot['district_en'];
            $listing['land_type_bn'] = $plot['land_type_bn'] ?? 'নাল / ধানী';
            $listing['land_type_en'] = $plot['land_type_en'] ?? 'Agricultural';
        }

        // Document availability count: real derived counts from verified status and L2/L3 trust levels (F17)
        $docCount = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM plot_documents WHERE plot_id = ?', [(int) $listing['plot_id']])['c'] ?? 0);
        $verifiedDocCount = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM plot_documents WHERE plot_id = ? AND (trust_level IN ('L3', 'L2') OR status = 'VERIFIED')", [(int) $listing['plot_id']])['c'] ?? 0);

        $listing['seller_nid_masked'] = PublicRecordService::maskNid((string) $listing['seller_nid']);
        unset($listing['seller_nid']);

        return [
            'listing' => PublicRecordService::forViewer($listing),
            'plot' => PublicRecordService::forViewer($plot),
            'documents_summary' => [
                'total_documents' => $docCount,
                'verified_documents' => $verifiedDocCount,
                'official_khatian_available' => true,
            ],
        ];
    }

    public static function createListing(array $payload, ?array $actor = null): array
    {
        $user = RoleMiddleware::authorize(['citizen', 'admin'], $actor);
        $plot = LookupService::resolvePlot($payload['plot_code'] ?? ($payload['plot_id'] ?? 1));

        if (!$plot) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'PLOT_NOT_FOUND',
                'message_bn' => 'চিহ্নিত দাগটি পাওয়া যায়নি।',
                'message_en' => 'Plot not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // Verify unencumbered status: sale lock must be off
        if (!empty($plot['owner_sale_locked'])) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'PLOT_LOCKED',
                'message_bn' => 'এই দাগে মালিক কর্তৃক বিক্রয় লক সক্রিয় রয়েছে। বিজ্ঞাপনে দেওয়ার আগে লক নিষ্ক্রিয় করুন।',
                'message_en' => 'Plot is currently sale-locked by the owner. Unlock before listing.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // Check active liens
        $activeLien = DB::selectOne("SELECT * FROM liens WHERE plot_id = ? AND status = 'ACTIVE'", [(int) $plot['id']]);
        if ($activeLien) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'ACTIVE_MORTGAGE',
                'message_bn' => 'এই দাগে ব্যাংকের সক্রিয় বন্ধক বিদ্যমান। ব্যাংক অনাপত্তিপত্র (NOC) ব্যতিরেকে বিজ্ঞাপন দেওয়া নিষিদ্ধ।',
                'message_en' => 'Plot has an active bank mortgage lien. Listing forbidden without bank NOC.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $cnt = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM listings')['c'] ?? 0);
        $listingCode = sprintf('LST-2026-%06d', $cnt + 101);
        $now = gmdate('c');
        $expiresAt = gmdate('c', time() + (90 * 86400)); // 90 days validity

        $price = max(100000, (int) ($payload['asking_price_bdt'] ?? 1500000));
        $area = max(0.01, (float) ($payload['area_decimal'] ?? 10.0));
        $descBn = trim((string) ($payload['description_bn'] ?? 'সাভার বিরুলিয়ায় আবাসিক বাড়ি/শিল্প কারখানা নির্মাণের উপযোগী নিষ্কণ্টক জমি।'));
        $descEn = trim((string) ($payload['description_en'] ?? 'Verified residential land in Birulia, Savar suitable for development.'));

        $listingId = DB::insert(
            'INSERT INTO listings (listing_code, plot_id, seller_nid, asking_price_bdt, area_decimal, description_bn, description_en, status, verification_badge, co_owner_consent_confirmed, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $listingCode,
                (int) $plot['id'],
                (string) ($user['nid'] ?? '9900001001'),
                $price,
                $area,
                $descBn,
                $descEn,
                'ACTIVE',
                'VERIFIED_CLEAR',
                1,
                $expiresAt,
                $now,
                $now,
            ]
        );

        return self::getListing($listingId);
    }

    public static function createListingEnquiry(string|int $codeOrId, array $payload, ?array $actor = null): array
    {
        $listingRes = self::getListing($codeOrId);
        $listing = $listingRes['listing'];

        $buyerName = trim((string) ($payload['buyer_name_bn'] ?? ($payload['buyer_name'] ?? 'নাগরিক ক্রেতা')));
        $buyerPhone = trim((string) ($payload['buyer_phone'] ?? '01700-009999'));
        $buyerNid = trim((string) ($payload['buyer_nid'] ?? '9900009999'));
        $msg = trim((string) ($payload['message_bn'] ?? 'আমি এই জমি ক্রয়ে আগ্রহী। বিস্তারিত আলোচনার অনুরোধ জানাচ্ছি।'));

        $enquiryId = DB::insert(
            'INSERT INTO listing_enquiries (listing_id, buyer_nid, buyer_name_bn, buyer_phone_dummy, message_bn, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                (int) $listing['id'],
                $buyerNid,
                $buyerName,
                $buyerPhone,
                $msg,
                'SENT',
                gmdate('c'),
            ]
        );

        return [
            'enquiry_id' => $enquiryId,
            'status' => 'SENT',
            'message_bn' => '✔ আপনার আগ্রহ সফলভাবে বিক্রেতার নিকট প্রেরণ করা হয়েছে। বিক্রেতা অনুমোদন করলে হস্তান্তর উইজার্ডের লিংক পাবেন।',
            'message_en' => '✔ In-app enquiry sent to verified owner. You will be notified once reviewed.',
        ];
    }

    // -------------------------------------------------------------------------
    // 2. PUBLIC NOTICES (Section 8.5)
    // -------------------------------------------------------------------------

    public static function listNotices(array $query = []): array
    {
        $sql = "SELECT n.*, (SELECT COUNT(*) FROM notice_attachments na WHERE na.notice_id = n.id) AS attachment_count
                FROM notices n
                WHERE n.status = 'PUBLISHED'";
        $params = [];

        if (!empty($query['category'])) {
            $sql .= ' AND n.category = ?';
            $params[] = $query['category'];
        }

        if (!empty($query['scope'])) {
            $sql .= ' AND n.scope = ?';
            $params[] = $query['scope'];
        }

        if (!empty($query['q'])) {
            $sql .= ' AND (n.title_bn LIKE ? OR n.title_en LIKE ? OR n.body_bn LIKE ? OR n.body_en LIKE ?)';
            $term = '%' . trim((string) $query['q']) . '%';
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $sql .= ' ORDER BY n.is_pinned DESC, n.published_at DESC, n.id DESC';
        $rows = DB::select($sql, $params);

        $items = array_map(static function (array $n): array {
            $n['attachments'] = DB::select('SELECT id, file_name, file_type, file_size_bytes, qr_payload, content_hash FROM notice_attachments WHERE notice_id = ?', [(int) $n['id']]);
            return $n;
        }, $rows);

        return [
            'items' => $items,
            'total' => count($items),
        ];
    }

    public static function getNotice(string|int $slugOrId): array
    {
        $notice = null;
        if (is_numeric($slugOrId)) {
            $notice = DB::selectOne('SELECT * FROM notices WHERE id = ?', [(int) $slugOrId]);
        }
        if (!$notice) {
            $notice = DB::selectOne('SELECT * FROM notices WHERE notice_slug = ?', [(string) $slugOrId]);
        }

        if (!$notice) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'NOTICE_NOT_FOUND',
                'message_bn' => 'অনুরোধকৃত নোটিশটি পাওয়া যায়নি।',
                'message_en' => 'Notice not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        // Increment view count
        DB::statement('UPDATE notices SET view_count = view_count + 1 WHERE id = ?', [(int) $notice['id']]);

        $attachments = DB::select('SELECT * FROM notice_attachments WHERE notice_id = ? ORDER BY id ASC', [(int) $notice['id']]);

        return [
            'notice' => $notice,
            'attachments' => $attachments,
        ];
    }

    /**
     * F09: Download a notice attachment as a government-signed PDF.
     *
     * The original attached file may be a plain Word/Excel document. For
     * trust purposes we render a one-page PDF that contains the notice
     * metadata + the SHA-256 + Ed25519 signature of the canonical envelope.
     *
     * Returns a binary-dispatch envelope (see public/index.php) so the
     * router streams raw PDF bytes instead of JSON.
     *
     * Public endpoint — no JWT required. Only PUBLISHED notices are
     * downloadable; draft/expired notices return 403.
     */
    public static function downloadNoticeAttachment(string $slug, int $attachmentId, array $query = []): array
    {
        $notice = DB::selectOne('SELECT * FROM notices WHERE notice_slug = ?', [$slug]);
        if (!$notice) {
            $notice = DB::selectOne('SELECT * FROM notices WHERE id = ?', [(int) $slug]);
        }
        if (!$notice) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'NOTICE_NOT_FOUND',
                'message_bn' => 'নোটিশ পাওয়া যায়নি।',
                'message_en' => 'Notice not found.',
            ], JSON_UNESCAPED_UNICODE));
        }
        if (($notice['status'] ?? '') !== 'PUBLISHED') {
            throw new \RuntimeException(json_encode([
                'status' => 403,
                'code' => 'NOTICE_NOT_PUBLISHED',
                'message_bn' => 'শুধুমাত্র প্রকাশিত নোটিশের সংযুক্তি ডাউনলোড করা যায়।',
                'message_en' => 'Only published notice attachments can be downloaded.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $attachment = DB::selectOne(
            'SELECT * FROM notice_attachments WHERE id = ? AND notice_id = ?',
            [$attachmentId, (int) $notice['id']]
        );
        if (!$attachment) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'ATTACHMENT_NOT_FOUND',
                'message_bn' => 'এই নোটিশে এই সংযুক্তিটি পাওয়া যায়নি।',
                'message_en' => 'Attachment not found for this notice.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $verifyFlag = (string) ($query['verify'] ?? '') === '1';

        if ($verifyFlag) {
            // Verify-only path: return JSON envelope (no PDF bytes).
            $seal = PdfSealService::sealNoticeAttachment($attachment, $notice);
            return [
                'attachment_id' => (int) $attachment['id'],
                'notice_slug' => (string) $notice['notice_slug'],
                'envelope' => $seal['envelope'],
                'content_hash' => $seal['content_hash'],
                'signature_hex' => $seal['signature_hex'],
                'public_key_hex' => $seal['public_key_hex'],
                'verified' => PdfSealService::verifySeal($seal),
            ];
        }

        // Increment download counter (best-effort, ignore failure).
        try {
            DB::statement(
                'UPDATE notices SET download_count = download_count + 1 WHERE id = ?',
                [(int) $notice['id']]
            );
        } catch (\Throwable) {
            // Non-fatal: download must still succeed.
        }

        $pdfBytes = PdfSealService::renderPdf($attachment, $notice);

        $safeName = preg_replace('/[^A-Za-z0-9._-]/', '_', (string) $attachment['file_name']);
        $disposition = "inline; filename=\"bhumi_notice_{$notice['notice_slug']}_{$attachment['id']}.pdf\"; "
                     . "filename*=UTF-8''" . rawurlencode($safeName . '.sealed.pdf');

        return [
            '_binary' => true,
            'status' => 200,
            'content_type' => 'application/pdf',
            'content_disposition' => $disposition,
            'body' => $pdfBytes,
        ];
    }

    // -------------------------------------------------------------------------
    // 3. EDUCATIONAL BLOG (Section 8.6)
    // -------------------------------------------------------------------------

    public static function listBlogPosts(array $query = []): array
    {
        $sql = "SELECT p.*, c.name_bn AS category_name_bn, c.name_en AS category_name_en
                FROM blog_posts p
                JOIN blog_categories c ON c.slug = p.category_slug
                WHERE p.status = 'PUBLISHED'";
        $params = [];

        if (!empty($query['category'])) {
            $sql .= ' AND p.category_slug = ?';
            $params[] = $query['category'];
        }

        if (!empty($query['q'])) {
            $sql .= ' AND (p.title_bn LIKE ? OR p.title_en LIKE ? OR p.body_bn LIKE ? OR p.body_en LIKE ?)';
            $term = '%' . trim((string) $query['q']) . '%';
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $sql .= ' ORDER BY p.id DESC';
        $rows = DB::select($sql, $params);
        $categories = DB::select('SELECT * FROM blog_categories ORDER BY id ASC');

        return [
            'items' => $rows,
            'categories' => $categories,
            'total' => count($rows),
        ];
    }

    public static function listOffices(array $query = []): array
    {
        $sql = "SELECT * FROM offices WHERE is_active = 1";
        $params = [];

        if (!empty($query['type'])) {
            $sql .= ' AND office_type = ?';
            $params[] = $query['type'];
        }
        if (!empty($query['upazila'])) {
            $sql .= ' AND (upazila_bn = ? OR upazila_en = ?)';
            $params[] = $query['upazila'];
            $params[] = $query['upazila'];
        }

        $sql .= ' ORDER BY id ASC';
        $rows = DB::select($sql, $params);

        return [
            'items' => $rows,
            'total' => count($rows),
        ];
    }

    public static function getBlogPost(string $slugOrId): array
    {
        $post = null;
        if (is_numeric($slugOrId)) {
            $post = DB::selectOne('SELECT * FROM blog_posts WHERE id = ?', [(int) $slugOrId]);
        }
        if (!$post) {
            $post = DB::selectOne('SELECT * FROM blog_posts WHERE post_slug = ?', [(string) $slugOrId]);
        }

        if (!$post) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'POST_NOT_FOUND',
                'message_bn' => 'ব্লগ পোস্টটি পাওয়া যায়নি।',
                'message_en' => 'Blog post not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $category = DB::selectOne('SELECT * FROM blog_categories WHERE slug = ?', [(string) $post['category_slug']]);

        return [
            'post' => $post,
            'category' => $category,
        ];
    }

    public static function markBlogPostHelpful(string $slugOrId): array
    {
        $postRes = self::getBlogPost($slugOrId);
        $postId = (int) $postRes['post']['id'];

        DB::statement('UPDATE blog_posts SET helpful_count = helpful_count + 1 WHERE id = ?', [$postId]);

        return [
            'status' => 'OK',
            'helpful_count' => (int) ($postRes['post']['helpful_count'] ?? 0) + 1,
            'message_bn' => '✔ মতামতের জন্য ধন্যবাদ!',
            'message_en' => '✔ Thank you for your feedback!',
        ];
    }

    // -------------------------------------------------------------------------
    // 4. MAP FEATURES & ZOOM AGGREGATES (Section 8.3)
    // -------------------------------------------------------------------------

    public static function getMapFeatures(array $params = []): array
    {
        $zoom = (int) ($params['zoom'] ?? 14);

        if ($zoom <= 9) {
            // Upazila-level count aggregation
            $counts = DB::select(
                "SELECT loc.upazila_bn, loc.upazila_en, loc.district_bn, loc.district_en,
                        AVG(loc.latitude) AS lat, AVG(loc.longitude) AS lng,
                        COUNT(l.id) AS sale_count
                 FROM locations loc
                 LEFT JOIN plots p ON p.location_id = loc.id
                 LEFT JOIN listings l ON l.plot_id = p.id AND l.status = 'ACTIVE'
                 GROUP BY loc.upazila_en"
            );

            return [
                'type' => 'UpazilaClusters',
                'zoom' => $zoom,
                'items' => $counts,
            ];
        }

        if ($zoom <= 13) {
            // Mouza-level clusters
            $mouzas = DB::select(
                "SELECT loc.id, loc.mouza_bn, loc.mouza_en, loc.latitude AS lat, loc.longitude AS lng,
                        COUNT(p.id) AS plot_count,
                        COUNT(l.id) AS sale_count
                 FROM locations loc
                 LEFT JOIN plots p ON p.location_id = loc.id
                 LEFT JOIN listings l ON l.plot_id = p.id AND l.status = 'ACTIVE'
                 GROUP BY loc.id"
            );

            return [
                'type' => 'MouzaClusters',
                'zoom' => $zoom,
                'items' => $mouzas,
            ];
        }

        // Zoom >= 14: Cadastral plot polygons with sale tags and risk indicators
        $plots = DB::select(
            "SELECT p.id, p.plot_code, p.dag_no, p.dag_no_bn, p.land_type_bn, p.land_type_en, p.total_area_decimal,
                    p.owner_sale_locked,
                    loc.mouza_bn, loc.mouza_en, loc.latitude, loc.longitude,
                    l.id AS listing_id, l.listing_code, l.asking_price_bdt, l.verification_badge,
                    pg.geojson_polygon, pg.center_lat, pg.center_lng
             FROM plots p
             JOIN locations loc ON loc.id = p.location_id
             LEFT JOIN listings l ON l.plot_id = p.id AND l.status = 'ACTIVE'
             LEFT JOIN plot_geometries pg ON pg.plot_id = p.id
             ORDER BY p.id ASC
             LIMIT 50"
        );

        $features = [];
        foreach ($plots as $p) {
            $coords = [];
            if (!empty($p['geojson_polygon'])) {
                try {
                    $coords = json_decode((string) $p['geojson_polygon'], true, 512, JSON_THROW_ON_ERROR);
                } catch (\Throwable) {
                    $coords = [];
                }
            }

            // Fallback synthetic square polygon around location lat/lng if no custom polygon
            if (empty($coords)) {
                $cLat = (float) ($p['center_lat'] ?? ($p['latitude'] ?? 23.858));
                $cLng = (float) ($p['center_lng'] ?? ($p['longitude'] ?? 90.318));
                $delta = 0.0005;
                $coords = [
                    [$cLng - $delta, $cLat - $delta],
                    [$cLng + $delta, $cLat - $delta],
                    [$cLng + $delta, $cLat + $delta],
                    [$cLng - $delta, $cLat + $delta],
                    [$cLng - $delta, $cLat - $delta],
                ];
            }

            $features[] = [
                'type' => 'Feature',
                'geometry' => [
                    'type' => 'Polygon',
                    'coordinates' => [$coords],
                ],
                'properties' => [
                    'id' => (int) $p['id'],
                    'plot_code' => $p['plot_code'],
                    'dag_no' => $p['dag_no'],
                    'dag_no_bn' => $p['dag_no_bn'],
                    'mouza_bn' => $p['mouza_bn'],
                    'land_type_bn' => $p['land_type_bn'],
                    'area_decimal' => (float) $p['total_area_decimal'],
                    'is_sale_locked' => (bool) $p['owner_sale_locked'],
                    'is_for_sale' => !empty($p['listing_id']),
                    'listing_code' => $p['listing_code'] ?? null,
                    'asking_price_bdt' => $p['asking_price_bdt'] ? (int) $p['asking_price_bdt'] : null,
                    'badge' => $p['verification_badge'] ?? ($p['owner_sale_locked'] ? 'SALE_LOCKED' : 'CLEAR'),
                ],
            ];
        }

        return [
            'type' => 'FeatureCollection',
            'zoom' => $zoom,
            'features' => $features,
        ];
    }

    // -------------------------------------------------------------------------
    // 4. LISTING ENQUIRIES WORKFLOW (Finding F16)
    // -------------------------------------------------------------------------

    public static function listListingEnquiries(string|int $codeOrId, ?array $actor = null): array
    {
        $user = RoleMiddleware::authorize(['citizen', 'platform_moderator', 'admin'], $actor);
        $listing = LookupService::resolveListing($codeOrId);
        if (!$listing) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'LISTING_NOT_FOUND',
                'message_bn' => 'বিজ্ঞাপনটি পাওয়া যায়নি।',
                'message_en' => 'Listing not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        if ($user['role'] === 'citizen' && ($user['nid'] ?? '') !== ($listing['seller_nid'] ?? '')) {
            throw new \RuntimeException(json_encode([
                'status' => 403,
                'code' => 'FORBIDDEN',
                'message_bn' => 'শুধুমাত্র এই বিজ্ঞাপনের বিক্রেতা বা অনুমোদিত মডারেটর ক্রেতাদের আগ্রহ ও প্রস্তাব দেখতে পারেন।',
                'message_en' => 'Only the listing seller or authorized moderators can view buyer enquiries.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $enquiries = DB::select(
            'SELECT * FROM listing_enquiries WHERE listing_id = ? ORDER BY id DESC',
            [(int) $listing['id']]
        );

        return [
            'items' => array_map(static function(array $e): array {
                $e['buyer_nid_masked'] = PublicRecordService::maskNid((string) $e['buyer_nid']);
                return PublicRecordService::forViewer($e);
            }, $enquiries),
            'total' => count($enquiries),
        ];
    }

    public static function updateListingEnquiry(string|int $codeOrId, int $enquiryId, array $payload, ?array $actor = null): array
    {
        $user = RoleMiddleware::authorize(['citizen', 'platform_moderator', 'admin'], $actor);
        $listing = LookupService::resolveListing($codeOrId);
        if (!$listing) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'LISTING_NOT_FOUND',
                'message_bn' => 'বিজ্ঞাপনটি পাওয়া যায়নি।',
                'message_en' => 'Listing not found.',
            ], JSON_UNESCAPED_UNICODE));
        }

        if ($user['role'] === 'citizen' && ($user['nid'] ?? '') !== ($listing['seller_nid'] ?? '')) {
            throw new \RuntimeException(json_encode([
                'status' => 403,
                'code' => 'FORBIDDEN',
                'message_bn' => 'শুধুমাত্র এই বিজ্ঞাপনের বিক্রেতা অনুসন্ধান স্ট্যাটাস হালনাগাদ করতে পারেন।',
                'message_en' => 'Only the listing owner can update enquiries.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $newStatus = strtoupper(trim((string) ($payload['status'] ?? 'ACCEPTED')));
        $validStatuses = ['SENT', 'ACCEPTED', 'DECLINED', 'COMPLETED'];
        if (!in_array($newStatus, $validStatuses, true)) {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'INVALID_STATUS',
                'message_bn' => 'অবৈধ অনুসন্ধান স্ট্যাটাস।',
                'message_en' => 'Invalid enquiry status.',
            ], JSON_UNESCAPED_UNICODE));
        }

        DB::statement('UPDATE listing_enquiries SET status = ? WHERE id = ? AND listing_id = ?', [$newStatus, $enquiryId, (int) $listing['id']]);

        return [
            'status' => $newStatus,
            'message_bn' => 'অনুসন্ধানের স্ট্যাটাস সফলভাবে হালনাগাদ করা হয়েছে।',
            'message_en' => 'Enquiry status updated successfully.',
        ];
    }

    // -------------------------------------------------------------------------
    // 5. APPOINTMENT BOOKING WORKFLOW (Finding F10)
    // -------------------------------------------------------------------------

    public static function createAppointment(array $payload, ?array $actor = null): array
    {
        $officeId = (int) ($payload['office_id'] ?? 0);
        $office = DB::selectOne('SELECT * FROM offices WHERE id = ? AND is_active = 1', [$officeId]);
        if (!$office) {
            throw new \RuntimeException(json_encode([
                'status' => 404,
                'code' => 'OFFICE_NOT_FOUND',
                'message_bn' => 'অনুরোধকৃত ভূমি বা সাব-রেজিস্ট্রি অফিসটি পাওয়া যায়নি।',
                'message_en' => 'Requested office was not found or is currently inactive.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $citizenName = trim((string) ($payload['citizen_name_bn'] ?? ($payload['citizen_name'] ?? '')));
        if ($citizenName === '') {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'NAME_REQUIRED',
                'message_bn' => 'আবেদনকারীর নাম আবশ্যক।',
                'message_en' => 'Citizen name is required.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $citizenPhone = trim((string) ($payload['citizen_phone'] ?? ''));
        if ($citizenPhone === '') {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'PHONE_REQUIRED',
                'message_bn' => 'যোগাযোগের মোবাইল নম্বর প্রদান করুন।',
                'message_en' => 'Contact phone number is required.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $slotDate = trim((string) ($payload['slot_date'] ?? ''));
        if ($slotDate === '') {
            throw new \RuntimeException(json_encode([
                'status' => 422,
                'code' => 'DATE_REQUIRED',
                'message_bn' => 'সাক্ষাতের তারিখ নির্বাচন করুন।',
                'message_en' => 'Appointment date is required.',
            ], JSON_UNESCAPED_UNICODE));
        }

        $slotTime = trim((string) ($payload['slot_time'] ?? '10:30 AM'));
        $serviceType = trim((string) ($payload['service_type'] ?? 'GENERAL_INQUIRY'));
        $citizenNid = trim((string) ($payload['citizen_nid'] ?? ($actor['nid'] ?? '9900001001')));
        $caseRef = trim((string) ($payload['case_reference'] ?? ''));
        $notes = trim((string) ($payload['notes_bn'] ?? 'ভূমি সংক্রান্ত সেবা গ্রহণের জন্য অ্যাপয়েন্টমেন্ট।'));

        // F10 double-booking guard: same office + same citizen + same date = conflict
        $conflict = DB::selectOne(
            'SELECT appointment_code, slot_time FROM appointments
             WHERE office_id = ? AND citizen_nid = ? AND slot_date = ? AND status = "BOOKED" LIMIT 1',
            [$officeId, $citizenNid, $slotDate]
        );
        if ($conflict !== null) {
            throw new \RuntimeException(json_encode([
                'status' => 409,
                'code' => 'APPOINTMENT_CONFLICT',
                'message_bn' => "একই তারিখে এই দপ্তরে আপনার ইতোমধ্যে একটি অ্যাপয়েন্টমেন্ট আছে ({$conflict['appointment_code']} — {$conflict['slot_time']})।",
                'message_en' => "You already have a booked appointment at this office on the same date ({$conflict['appointment_code']} — {$conflict['slot_time']}).",
            ], JSON_UNESCAPED_UNICODE));
        }

        $cnt = (int) (DB::selectOne('SELECT COUNT(*) AS c FROM appointments')['c'] ?? 0);
        $aptCode = sprintf('APT-2026-%04d', $cnt + 101);
        $now = gmdate('c');

        $aptId = DB::insert(
            'INSERT INTO appointments (appointment_code, office_id, citizen_nid, citizen_name_bn, citizen_phone, service_type, case_reference, slot_date, slot_time, status, notes_bn, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "BOOKED", ?, ?)',
            [
                $aptCode,
                $officeId,
                $citizenNid,
                $citizenName,
                $citizenPhone,
                $serviceType,
                $caseRef,
                $slotDate,
                $slotTime,
                $notes,
                $now,
            ]
        );

        return [
            'status' => 200,
            'appointment' => [
                'id' => $aptId,
                'appointment_code' => $aptCode,
                'office_name_bn' => $office['name_bn'],
                'office_name_en' => $office['name_en'],
                'office_address_bn' => $office['address_bn'],
                'slot_date' => $slotDate,
                'slot_time' => $slotTime,
                'citizen_name_bn' => $citizenName,
                'status' => 'BOOKED',
                'created_at' => $now,
            ],
            'message_bn' => "আপনার সাক্ষাতের বুকিং সফল হয়েছে! রেফারেন্স নং: {$aptCode}। নির্ধারিত সময়ে অফিসে উপস্থিত হতে অনুরোধ করা হচ্ছে।",
            'message_en' => "Appointment booked successfully! Reference: {$aptCode}.",
        ];
    }

    public static function listAppointments(array $query = [], ?array $actor = null): array
    {
        $user = RoleMiddleware::authorize(['citizen', 'sub_registrar', 'registry_data_officer', 'ac_land', 'land_office_assistant', 'admin'], $actor);
        $sql = 'SELECT a.*, o.name_bn AS office_name_bn, o.name_en AS office_name_en, o.office_code, o.address_bn AS office_address_bn
                FROM appointments a
                JOIN offices o ON o.id = a.office_id
                WHERE 1=1';
        $params = [];

        if ($user['role'] === 'citizen') {
            $sql .= ' AND a.citizen_nid = ?';
            $params[] = (string) ($user['nid'] ?? '');
        }

        if (!empty($query['office_id'])) {
            $sql .= ' AND a.office_id = ?';
            $params[] = (int) $query['office_id'];
        }

        if (!empty($query['status'])) {
            $sql .= ' AND a.status = ?';
            $params[] = $query['status'];
        }

        $sql .= ' ORDER BY a.id DESC';
        $rows = DB::select($sql, $params);

        return [
            'items' => array_map(static function(array $r): array {
                $r['citizen_nid_masked'] = PublicRecordService::maskNid((string) $r['citizen_nid']);
                return PublicRecordService::forViewer($r);
            }, $rows),
            'total' => count($rows),
        ];
    }
}
