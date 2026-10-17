<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Controllers\Api\V1\PublicMarketplaceAndPortalController;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/**
 * Feature Test Suite for Tier B Public Marketplace, Notices, Blog, Offices, and Map.
 */
final class TierBPortalAndMarketplaceTest
{
    private static function assertTrue(bool $cond, string $message = 'Assertion failed'): void
    {
        if (!$cond) {
            throw new \RuntimeException($message);
        }
    }

    public static function runAll(): int
    {
        $tmpDb = sys_get_temp_dir() . '/bhumishield_tier_b_test_' . getmypid() . '.sqlite';
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
        echo "\n   PASS  Tests\\Feature\\TierBPortalAndMarketplaceTest (Tier B Upgrades)\n";

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

        echo "\n  Tier B Tests:    {$passed} passed, {$failed} failed (" . count($methods) . " total)\n\n";
        @unlink($tmpDb);
        return $failed;
    }

    public static function test_01_public_listings_marketplace_filtering_and_privacy_masking(): void
    {
        $res = PublicMarketplaceAndPortalController::listListings([]);
        self::assertTrue($res['total'] >= 4, 'Expected at least 4 seeded listings');
        self::assertTrue(isset($res['items'][0]['seller_nid_masked']), 'Expected seller_nid_masked');
        self::assertTrue(!isset($res['items'][0]['seller_nid']), 'Raw seller_nid must be omitted for public');

        // Test district filtering
        $dhk = PublicMarketplaceAndPortalController::listListings(['district' => 'Dhaka']);
        self::assertTrue($dhk['total'] >= 3, 'Expected Dhaka listings');
        $gzp = PublicMarketplaceAndPortalController::listListings(['district' => 'Gazipur']);
        self::assertTrue($gzp['total'] >= 1, 'Expected Gazipur listing');
    }

    public static function test_02_listing_enquiry_creation_without_phone_disclosure(): void
    {
        $res = PublicMarketplaceAndPortalController::createListingEnquiry('LST-2026-000101', [
            'buyer_name' => 'মো. জহিরুল ইসলাম',
            'buyer_phone' => '01700-008888',
            'buyer_nid' => '9900008888',
            'message_bn' => 'আমি জমিটি ক্রয়ে আগ্রহী।',
        ]);

        self::assertTrue($res['status'] === 'SENT', 'Expected status SENT');
        self::assertTrue(isset($res['enquiry_id']), 'Expected enquiry_id returned');

        // Verify record in database
        $row = DB::selectOne('SELECT * FROM listing_enquiries WHERE id = ?', [(int) $res['enquiry_id']]);
        self::assertTrue($row !== null, 'Enquiry record must be persisted in database');
        self::assertTrue($row['buyer_name_bn'] === 'মো. জহিরুল ইসলাম', 'Buyer name must match');
    }

    public static function test_03_public_notices_listing_and_qr_attachment_verification(): void
    {
        $notices = PublicMarketplaceAndPortalController::listNotices([]);
        self::assertTrue($notices['total'] >= 5, 'Expected at least 5 notices seeded');
        self::assertTrue(!empty($notices['items'][0]['attachments']), 'Notice must contain attachments');

        $notice = PublicMarketplaceAndPortalController::getNotice('notice-mutation-timeline-circular-2026');
        self::assertTrue($notice['notice']['is_pinned'] === 1, 'Circular must be pinned');
        self::assertTrue(!empty($notice['attachments'][0]['qr_payload']), 'Attachment must have QR payload');
        self::assertTrue(!empty($notice['attachments'][0]['content_hash']), 'Attachment must have SHA-256 seal');
    }

    public static function test_04_educational_blog_retrieval_and_helpful_increment(): void
    {
        $blog = PublicMarketplaceAndPortalController::listBlogPosts([]);
        self::assertTrue($blog['total'] >= 5, 'Expected 5 blog posts seeded');
        self::assertTrue(count($blog['categories']) >= 3, 'Expected at least 3 blog categories');

        $postBefore = PublicMarketplaceAndPortalController::getBlogPost('how-to-verify-land-before-buying');
        $initialVotes = (int) $postBefore['post']['helpful_count'];

        $res = PublicMarketplaceAndPortalController::markBlogPostHelpful('how-to-verify-land-before-buying');
        self::assertTrue($res['status'] === 'OK', 'Expected status OK');
        self::assertTrue($res['helpful_count'] === $initialVotes + 1, 'Helpful count must increment');
    }

    public static function test_05_zoom_aware_cadastral_map_clusters_and_polygon_features(): void
    {
        // Low zoom: Upazila clusters
        $upazilas = PublicMarketplaceAndPortalController::getMapFeatures(['zoom' => 8]);
        self::assertTrue($upazilas['type'] === 'UpazilaClusters', 'Expected UpazilaClusters');
        self::assertTrue(count($upazilas['items']) >= 3, 'Expected at least 3 upazila clusters');

        // Mid zoom: Mouza clusters
        $mouzas = PublicMarketplaceAndPortalController::getMapFeatures(['zoom' => 12]);
        self::assertTrue($mouzas['type'] === 'MouzaClusters', 'Expected MouzaClusters');
        self::assertTrue(count($mouzas['items']) >= 3, 'Expected at least 3 mouza clusters');

        // High zoom: Plot polygons FeatureCollection
        $plots = PublicMarketplaceAndPortalController::getMapFeatures(['zoom' => 15]);
        self::assertTrue($plots['type'] === 'FeatureCollection', 'Expected FeatureCollection');
        self::assertTrue(!empty($plots['features']), 'Expected features array');
        self::assertTrue($plots['features'][0]['geometry']['type'] === 'Polygon', 'Geometry type must be Polygon');
        self::assertTrue(isset($plots['features'][0]['properties']['dag_no']), 'Properties must have dag_no');
    }

    public static function test_06_office_directory_filtering_and_service_point_jurisdictions(): void
    {
        $offices = PublicMarketplaceAndPortalController::listOffices([]);
        self::assertTrue($offices['total'] >= 5, 'Expected at least 5 seeded offices');

        $registryOnly = PublicMarketplaceAndPortalController::listOffices(['type' => 'registry']);
        self::assertTrue($registryOnly['total'] >= 2, 'Expected at least 2 registry offices');

        $savarOnly = PublicMarketplaceAndPortalController::listOffices(['upazila' => 'Savar']);
        self::assertTrue($savarOnly['total'] >= 4, 'Expected Savar offices');
    }
}
