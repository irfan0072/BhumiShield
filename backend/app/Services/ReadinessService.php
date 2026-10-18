<?php

declare(strict_types=1);

namespace App\Services;

use App\Support\DB;

/** Read-only release readiness; requests never migrate or seed storage. */
final class ReadinessService
{
    public static function inspect(): array
    {
        $issues = [];
        try {
            DB::selectOne('SELECT 1 AS ok');
            foreach ([
                'users' => 'id, token_version, is_identity_verified',
                'plots' => 'id', 'deeds' => 'id, content_hash',
                'ownerships' => 'id', 'mutations' => 'id',
                'mortgages_liens' => 'id', 'noc_certificates' => 'id',
                'service_catalogue' => 'id', 'service_fees_registry' => 'id',
                'site_settings' => 'setting_key', 'audit_log' => 'id',
            ] as $table => $columns) {
                DB::select("SELECT {$columns} FROM {$table} WHERE 1 = 0");
            }
            if (!DB::isPostgres() && !DB::selectOne("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_active_mortgage_per_plot'")) {
                throw new \RuntimeException('Required active-lien constraint is missing.');
            }
        } catch (\Throwable) {
            $issues[] = 'DATABASE_OR_SCHEMA_UNAVAILABLE';
        }
        if (strtolower((string) env('APP_ENV', 'development')) === 'production') {
            try {
                JwtAuthService::getSecret();
                LedgerService::getPublicKeyHex();
                $origin = (string) env('PUBLIC_VERIFY_BASE_URL', '');
                if (!filter_var($origin, FILTER_VALIDATE_URL) || parse_url($origin, PHP_URL_SCHEME) !== 'https') {
                    throw new \RuntimeException('Configure the public HTTPS verification origin.');
                }
            } catch (\Throwable) {
                $issues[] = 'PRODUCTION_CONFIGURATION_INVALID';
            }
        }
        return ['ready' => $issues === [], 'issues' => $issues];
    }

    /**
     * Phase D: Genuine Biometric & Identity Capability Readiness Matrix.
     * Distinguishes login/security, identity proofing, and counter transaction consent.
     */
    public static function getIdentityAndBiometricReadiness(): array
    {
        $appEnv = strtolower((string) env('APP_ENV', 'development'));
        $simEnabled = (bool) env('ENABLE_SIMULATED_PROVIDERS', false);

        return [
            'status' => 'ok',
            'app_env' => $appEnv,
            'simulated_providers_enabled' => $simEnabled,
            'readiness_matrix' => [
                [
                    'capability' => 'ACCOUNT_AUTHENTICATION',
                    'title_bn' => 'অ্যাকাউন্ট লগইন ও নিরাপত্তা (পাসওয়ার্ড ও নিরাপদ JWT টোকেন)',
                    'title_en' => 'Account Authentication & JWT Bearer Token Security',
                    'mechanism' => 'Argon2id / Bcrypt Password Hash + Signed Cryptographic JWT Tokens',
                    'provider' => 'BhumiShield Sovereign Identity Engine',
                    'permitted_environment' => 'All environments (Local, Staging, Production)',
                    'supported_hardware' => 'Standard Web Browsers & Mobile Operating Systems',
                    'required_approvals' => 'Self-enrolled user credentials & RBAC verification',
                    'unresolved_dependencies' => 'None (Standard protocol authentication active)',
                    'status' => 'READY',
                    'status_bn' => 'প্রস্তুত ও সক্রিয়',
                    'notes_bn' => 'ব্যবহারকারী অ্যাকাউন্ট পাসওয়ার্ড ও সাইনড JWT টোকেনের মাধ্যমে সুরক্ষিত ও সক্রিয় রয়েছে।',
                ],
                [
                    'capability' => 'WEBAUTHN_PASSKEYS',
                    'title_bn' => 'পাসকি প্রমাণীকরণ (WebAuthn / FIDO2)',
                    'title_en' => 'Passkey Authentication (WebAuthn / FIDO2)',
                    'mechanism' => 'W3C WebAuthn Level 3 Public Key Credentials',
                    'provider' => 'Browser Native Platform Authenticator (Apple TouchID, Windows Hello, Android Biometrics)',
                    'permitted_environment' => 'All environments (Local, Staging, Production)',
                    'supported_hardware' => 'Client-side FIDO2 authenticators, YubiKey, TPM chips',
                    'required_approvals' => 'User device biometric enrollment & server public key registration',
                    'unresolved_dependencies' => 'Server-side WebAuthn challenge generation, credential registration, and assertion signature verification pipeline not yet fully implemented',
                    'status' => 'NOT_IMPLEMENTED',
                    'status_bn' => 'বাস্তবায়নাধীন (সার্ভার অ্যাসার্শন অসম্পূর্ণ)',
                    'notes_bn' => 'ডিভাইস পাসকি ও বায়োমেট্রিক আনলক ব্যাকএন্ড অ্যাসার্শন পাইপলাইন সম্পন্ন না হওয়া পর্যন্ত পাসকি লগইন অনুপলব্ধ থাকবে। পাসওয়ার্ড ও JWT প্রমাণীকরণ সক্রিয়।',
                ],
                [
                    'capability' => 'IDENTITY_PROOFING',
                    'title_bn' => 'নাগরিক পরিচয় যাচাই (সভরেন এনআইডি প্রুফিং)',
                    'title_en' => 'Citizen Sovereign Identity Proofing',
                    'mechanism' => 'Election Commission NID Wing Verification Gateway',
                    'provider' => 'Bangladesh Election Commission (EC) NID Wing API',
                    'permitted_environment' => 'Authorised Government Intranet / Secured Lease Line Only',
                    'supported_hardware' => 'EC Certified Terminal / Secure Gateway Server',
                    'required_approvals' => 'Ministry of Land & Election Commission inter-agency MOU and security audit',
                    'unresolved_dependencies' => 'Production API credentials and secured VPN tunnel pending institutional agreement',
                    'status' => $simEnabled ? 'SIMULATED_TEST_ONLY' : 'BLOCKED_PENDING_MOU',
                    'status_bn' => $simEnabled ? 'শুধুমাত্র পরীক্ষামূলক সিমুলেশন' : 'অনুমোদনাধীন (Fail-Closed)',
                    'notes_bn' => 'বাস্তব সরকারি এপিআই সংযোগ ব্যতীত কোনো নাগরিকের ভুয়া বা ডিটারমিনিস্টিক ম্যাচ স্কোর কার্যকর করা হয় না। সংযোগ বিচ্ছিন্ন থাকলে সিস্টেম ৫-০-৩ প্রোভাইডার অনুপলব্ধ বার্তা প্রদর্শন করে।',
                ],
                [
                    'capability' => 'TRANSACTION_COUNTER_CONSENT',
                    'title_bn' => 'সাব-রেজিস্ট্রি কাউন্টার বায়োমেট্রিক ও সম্মতি যাচাই',
                    'title_en' => 'Sub-Registry Counter Biometric & Transaction Consent',
                    'mechanism' => 'Optical Fingerprint Scanner + Ed25519 Signed Challenge Nonce',
                    'provider' => 'Secugen Hamster Pro 20 / Futronic FS88H USB Hardware Integration',
                    'permitted_environment' => 'Sub-Registry Office Counter Terminals (Certified)',
                    'supported_hardware' => 'Secugen USB / Futronic Optical Scanner (STQC Certified)',
                    'required_approvals' => 'Directorate of Registration operational circular',
                    'unresolved_dependencies' => 'Physical USB driver binding and operator smart card reader at sub-registry desk',
                    'status' => $simEnabled ? 'SIMULATED_TEST_ONLY' : 'REQUIRES_PHYSICAL_HARDWARE',
                    'status_bn' => $simEnabled ? 'টেস্ট মোড সিমুলেশন' : 'শারীরিক হার্ডওয়্যার সংযোগ আবশ্যক',
                    'notes_bn' => 'রেজিস্ট্রেশন আইন ১৯০৮-এর ধারা ৩২-৩৫ অনুযায়ী সাব-রেজিস্ট্রারের সম্মুখে শারীরিক উপস্থিতি আবশ্যক। হার্ডওয়্যার অনুপলব্ধ থাকলে রেজিস্ট্রি রেজিস্টারে ম্যানুয়াল স্বাক্ষর ও টিপসহি কার্যধারা সম্পন্ন করতে হবে।',
                ],
            ],
            'statutory_disclaimer_bn' => 'ওয়েবক্যামের সাধারণ ছবি বা ব্রাউজারের কোনো কৃত্রিম অ্যানিমেশনকে বায়োমেট্রিক ভেরিফিকেশন হিসেবে গণ্য করা হয় না। সরকারি আইন ও প্রবিধানের সম্পূর্ণ পরিপালন নিশ্চিত করা হয়েছে।',
            'statutory_disclaimer_en' => 'Camera photographs and mock web animations are not biometric verification. Strict fail-closed regulatory compliance is enforced.',
        ];
    }
}
