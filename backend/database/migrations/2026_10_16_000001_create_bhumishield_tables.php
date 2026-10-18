<?php

declare(strict_types=1);

namespace Database\Migrations;

use App\Support\DB;

/**
 * Laravel Migration creating all BhumiShield v2 tables, triggers, and ownership guards.
 */
final class CreateBhumishieldTables
{
    public function up(bool $fresh = false): void
    {
        $pdo = DB::connection();
        if ($fresh) {
            $this->down();
        }

        $ddl = <<<'SQL'
-- 1. Core Platform Tables
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    full_name_bn TEXT NOT NULL,
    full_name_en TEXT NOT NULL,
    role TEXT NOT NULL,
    office_bn TEXT NOT NULL,
    office_en TEXT NOT NULL,
    phone_dummy TEXT DEFAULT '',
    nid TEXT DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    token_version INTEGER NOT NULL DEFAULT 1,
    is_identity_verified INTEGER NOT NULL DEFAULT 0,
    is_profile_complete INTEGER NOT NULL DEFAULT 0,
    avatar_url TEXT,
    registration_channel TEXT DEFAULT 'phone',
    father_name_bn TEXT,
    mother_name_bn TEXT,
    present_address_bn TEXT,
    date_of_birth TEXT,
    gender TEXT,
    password_hash TEXT NOT NULL,
    last_login_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value_json TEXT NOT NULL,
    description_bn TEXT NOT NULL,
    description_en TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    division_bn TEXT NOT NULL,
    division_en TEXT NOT NULL,
    district_bn TEXT NOT NULL,
    district_en TEXT NOT NULL,
    upazila_bn TEXT NOT NULL,
    upazila_en TEXT NOT NULL,
    mouza_bn TEXT NOT NULL,
    mouza_en TEXT NOT NULL,
    jl_no TEXT NOT NULL,
    latitude REAL,
    longitude REAL
);

CREATE TABLE IF NOT EXISTS persons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_bn TEXT NOT NULL,
    name_en TEXT NOT NULL,
    father_name_bn TEXT NOT NULL,
    father_name_en TEXT NOT NULL,
    mother_name_bn TEXT NOT NULL,
    nid TEXT UNIQUE NOT NULL,
    phone_dummy TEXT NOT NULL,
    is_deceased INTEGER NOT NULL DEFAULT 0,
    heirs_recorded INTEGER NOT NULL DEFAULT 1,
    address_bn TEXT NOT NULL,
    address_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plot_code TEXT UNIQUE,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    dag_no TEXT NOT NULL,
    dag_no_bn TEXT NOT NULL,
    land_type_bn TEXT NOT NULL,
    land_type_en TEXT NOT NULL,
    total_area_decimal REAL NOT NULL,
    owner_sale_locked INTEGER NOT NULL DEFAULT 0,
    locked_by_nid TEXT,
    is_admin_frozen INTEGER NOT NULL DEFAULT 0,
    admin_freeze_reason TEXT,
    admin_frozen_at TEXT,
    admin_frozen_by TEXT,
    notes_bn TEXT,
    notes_en TEXT
);

CREATE TABLE IF NOT EXISTS khatian_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    survey_type TEXT NOT NULL,
    khatian_no TEXT NOT NULL,
    khatian_no_bn TEXT NOT NULL,
    recorded_area_decimal REAL NOT NULL,
    survey_year INTEGER NOT NULL,
    parent_khatian_no TEXT,
    status TEXT NOT NULL DEFAULT 'VALID',
    remarks_bn TEXT,
    remarks_en TEXT
);

-- Ownership table with is_latest flag
CREATE TABLE IF NOT EXISTS ownerships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    khatian_id INTEGER NOT NULL REFERENCES khatian_records(id),
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    person_id INTEGER NOT NULL REFERENCES persons(id),
    share_fraction TEXT NOT NULL,
    share_float REAL NOT NULL,
    area_decimal REAL NOT NULL,
    is_latest INTEGER NOT NULL DEFAULT 1
);

-- M3 Inviolable DB-Level Ownership Write Guard Table
CREATE TABLE IF NOT EXISTS ownership_write_lock (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    is_authorized INTEGER NOT NULL DEFAULT 0,
    authorized_by_role TEXT,
    mutation_case_no TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deed_code TEXT UNIQUE,
    deed_no TEXT UNIQUE NOT NULL,
    deed_type TEXT NOT NULL,
    seller_id INTEGER NOT NULL REFERENCES persons(id),
    buyer_id INTEGER NOT NULL REFERENCES persons(id),
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    share_fraction TEXT NOT NULL,
    area_decimal REAL NOT NULL,
    price_bdt INTEGER NOT NULL,
    status TEXT NOT NULL,
    content_json TEXT NOT NULL,
    original_content_json TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    prev_hash TEXT NOT NULL,
    signature TEXT NOT NULL,
    chain_index INTEGER UNIQUE NOT NULL,
    registered_by TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mutations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mutation_code TEXT UNIQUE,
    case_no TEXT UNIQUE NOT NULL,
    deed_id INTEGER NOT NULL REFERENCES deeds(id),
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    seller_id INTEGER NOT NULL REFERENCES persons(id),
    buyer_id INTEGER NOT NULL REFERENCES persons(id),
    area_decimal REAL NOT NULL,
    status TEXT NOT NULL,
    decision_reason_bn TEXT,
    decision_reason_en TEXT,
    decided_by TEXT,
    decided_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mortgages_liens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    borrower_id INTEGER NOT NULL REFERENCES persons(id),
    bank_name_bn TEXT NOT NULL,
    bank_name_en TEXT NOT NULL,
    branch_bn TEXT NOT NULL,
    amount_bdt INTEGER NOT NULL,
    area_mortgaged_decimal REAL NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    released_at TEXT
);

CREATE TABLE IF NOT EXISTS disputes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_no TEXT UNIQUE NOT NULL,
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    complainant_name_bn TEXT NOT NULL,
    complainant_nid TEXT NOT NULL,
    dispute_type TEXT NOT NULL,
    description_bn TEXT NOT NULL,
    description_en TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'REVIEW',
    status TEXT NOT NULL DEFAULT 'OPEN',
    resolution_notes_bn TEXT,
    resolved_by TEXT,
    created_at TEXT NOT NULL,
    resolved_at TEXT,
    court_name TEXT,
    suit_no TEXT,
    case_stage TEXT,
    lawyer_bar_council_no TEXT,
    lawyer_name_bn TEXT,
    lawyer_phone TEXT,
    disputed_area_decimal REAL,
    boundaries_json TEXT,
    source TEXT DEFAULT 'MANUAL'
);

CREATE TABLE IF NOT EXISTS authorized_lawyers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bar_council_no TEXT UNIQUE NOT NULL,
    lawyer_name_bn TEXT NOT NULL,
    lawyer_name_en TEXT NOT NULL,
    district_bar TEXT NOT NULL,
    nid TEXT,
    phone TEXT,
    email TEXT,
    chamber_address_bn TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_username TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details_json TEXT NOT NULL,
    entry_hash TEXT NOT NULL,
    prev_hash TEXT NOT NULL,
    chain_index INTEGER UNIQUE NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS risk_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    deed_id INTEGER,
    seller_id INTEGER,
    buyer_id INTEGER,
    requested_area_decimal REAL NOT NULL,
    verdict TEXT NOT NULL,
    risk_score INTEGER NOT NULL,
    flags_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS noc_certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lien_id INTEGER UNIQUE NOT NULL REFERENCES mortgages_liens(id),
    noc_no TEXT UNIQUE NOT NULL,
    bank_name_bn TEXT NOT NULL,
    bank_name_en TEXT NOT NULL,
    branch_bn TEXT NOT NULL,
    borrower_name_bn TEXT NOT NULL,
    borrower_name_en TEXT NOT NULL,
    borrower_nid TEXT NOT NULL,
    mouza_bn TEXT NOT NULL,
    mouza_en TEXT NOT NULL,
    dag_no TEXT NOT NULL,
    dag_no_bn TEXT NOT NULL,
    amount_bdt INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'RELEASED',
    released_at TEXT NOT NULL,
    noc_hash TEXT NOT NULL,
    ed25519_signature TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS service_catalogue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    service_code TEXT UNIQUE NOT NULL,
    title_bn TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description_bn TEXT NOT NULL,
    description_en TEXT NOT NULL,
    service_type TEXT NOT NULL,
    internal_route TEXT,
    external_url TEXT,
    source_url TEXT,
    authority_name_bn TEXT NOT NULL,
    authority_name_en TEXT NOT NULL,
    badge_bn TEXT,
    badge_en TEXT,
    is_published INTEGER NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    last_reviewed_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS service_fees_registry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_code TEXT UNIQUE NOT NULL,
    title_bn TEXT NOT NULL,
    title_en TEXT NOT NULL,
    components_json TEXT NOT NULL,
    total_bdt REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BDT',
    authority_name_bn TEXT NOT NULL,
    authority_name_en TEXT NOT NULL,
    legal_basis_bn TEXT NOT NULL,
    legal_basis_en TEXT NOT NULL,
    circular_no TEXT,
    effective_date TEXT NOT NULL,
    source_url TEXT NOT NULL,
    is_estimate INTEGER NOT NULL DEFAULT 0,
    is_published INTEGER NOT NULL DEFAULT 1,
    version INTEGER NOT NULL DEFAULT 1,
    history_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 2. Spatie-Compatible RBAC Schema (18 Roles)
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    guard_name TEXT NOT NULL DEFAULT 'web',
    label_bn TEXT NOT NULL,
    label_en TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'T2',
    description_bn TEXT,
    description_en TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    guard_name TEXT NOT NULL DEFAULT 'web',
    label_bn TEXT NOT NULL,
    label_en TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS model_has_roles (
    role_id INTEGER NOT NULL REFERENCES roles(id),
    model_type TEXT NOT NULL DEFAULT 'App\\Models\\User',
    model_id INTEGER NOT NULL,
    PRIMARY KEY (role_id, model_id, model_type)
);

CREATE TABLE IF NOT EXISTS role_has_permissions (
    permission_id INTEGER NOT NULL REFERENCES permissions(id),
    role_id INTEGER NOT NULL REFERENCES roles(id),
    PRIMARY KEY (permission_id, role_id)
);

CREATE TABLE IF NOT EXISTS model_has_permissions (
    permission_id INTEGER NOT NULL REFERENCES permissions(id),
    model_type TEXT NOT NULL DEFAULT 'App\\Models\\User',
    model_id INTEGER NOT NULL,
    PRIMARY KEY (permission_id, model_id, model_type)
);

-- 3. Offices & Jurisdiction Assignment
CREATE TABLE IF NOT EXISTS offices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    office_code TEXT UNIQUE NOT NULL,
    name_bn TEXT NOT NULL,
    name_en TEXT NOT NULL,
    office_type TEXT NOT NULL,
    division_bn TEXT NOT NULL,
    division_en TEXT NOT NULL,
    district_bn TEXT NOT NULL,
    district_en TEXT NOT NULL,
    upazila_bn TEXT NOT NULL,
    upazila_en TEXT NOT NULL,
    mouzas_served_json TEXT NOT NULL DEFAULT '[]',
    latitude REAL,
    longitude REAL,
    address_bn TEXT NOT NULL,
    address_en TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS office_user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    office_id INTEGER NOT NULL REFERENCES offices(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    role_name TEXT NOT NULL,
    jurisdiction_scope_json TEXT NOT NULL DEFAULT '{"all": true}',
    is_primary INTEGER NOT NULL DEFAULT 1,
    assigned_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_code TEXT UNIQUE NOT NULL,
    office_id INTEGER NOT NULL REFERENCES offices(id),
    citizen_nid TEXT NOT NULL,
    citizen_name_bn TEXT NOT NULL,
    citizen_phone TEXT NOT NULL,
    service_type TEXT NOT NULL,
    case_reference TEXT,
    slot_date TEXT NOT NULL,
    slot_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'BOOKED',
    notes_bn TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS case_access_grants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grant_code TEXT UNIQUE NOT NULL,
    service_point_id INTEGER NOT NULL REFERENCES offices(id),
    case_type TEXT NOT NULL,
    case_reference TEXT NOT NULL,
    granted_by_user_id INTEGER NOT NULL REFERENCES users(id),
    granted_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    access_log_json TEXT NOT NULL DEFAULT '[]'
);

-- 4. 13-Step Transfer State Machine Tables
CREATE TABLE IF NOT EXISTS transfer_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transfer_code TEXT UNIQUE NOT NULL,
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    current_step INTEGER NOT NULL DEFAULT 1,
    public_stage TEXT NOT NULL DEFAULT 'START',
    transfer_area_decimal REAL NOT NULL,
    proposed_price_bdt INTEGER NOT NULL,
    deed_type TEXT NOT NULL DEFAULT 'SALE',
    service_point_id INTEGER REFERENCES offices(id),
    home_office_id INTEGER REFERENCES offices(id),
    status TEXT NOT NULL DEFAULT 'DRAFT',
    deed_id INTEGER REFERENCES deeds(id),
    mutation_id INTEGER REFERENCES mutations(id),
    created_by_nid TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transfer_parties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transfer_id INTEGER NOT NULL REFERENCES transfer_requests(id),
    person_id INTEGER NOT NULL REFERENCES persons(id),
    party_role TEXT NOT NULL,
    share_fraction TEXT NOT NULL DEFAULT '1/1',
    phone_dummy TEXT NOT NULL,
    is_verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transfer_consents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transfer_id INTEGER NOT NULL REFERENCES transfer_requests(id),
    party_id INTEGER NOT NULL REFERENCES transfer_parties(id),
    consent_type TEXT NOT NULL DEFAULT 'CO_OWNER_OTP',
    otp_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    consented_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transfer_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transfer_id INTEGER NOT NULL REFERENCES transfer_requests(id),
    from_step INTEGER NOT NULL,
    to_step INTEGER NOT NULL,
    actor_username TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    reason_bn TEXT NOT NULL,
    reason_en TEXT NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS biometric_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT UNIQUE NOT NULL,
    transfer_id INTEGER REFERENCES transfer_requests(id),
    party_nid TEXT NOT NULL,
    party_role TEXT NOT NULL,
    modality TEXT NOT NULL,
    match_status TEXT NOT NULL,
    match_score REAL NOT NULL,
    terminal_id TEXT NOT NULL,
    officer_id TEXT NOT NULL,
    liveness_nonce TEXT NOT NULL,
    verified_at TEXT NOT NULL,
    notes_bn TEXT
);

-- 5. Citizen Documents Vault (Trust Levels L0-L3)
CREATE TABLE IF NOT EXISTS document_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    acquisition_type TEXT NOT NULL,
    document_type TEXT NOT NULL,
    title_bn TEXT NOT NULL,
    title_en TEXT NOT NULL,
    is_mandatory INTEGER NOT NULL DEFAULT 1,
    responsible_office_type TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS plot_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    document_type TEXT NOT NULL,
    title_bn TEXT NOT NULL,
    title_en TEXT NOT NULL,
    trust_level TEXT NOT NULL DEFAULT 'L0',
    status TEXT NOT NULL DEFAULT 'MISSING',
    file_path TEXT,
    file_name TEXT,
    file_size_bytes INTEGER,
    file_hash TEXT,
    uploaded_by_nid TEXT,
    verified_by TEXT,
    verified_at TEXT,
    ticket_id INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 6. Support Tickets & SLA Management
CREATE TABLE IF NOT EXISTS sla_policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT UNIQUE NOT NULL,
    title_bn TEXT NOT NULL,
    title_en TEXT NOT NULL,
    first_reply_target_days INTEGER NOT NULL DEFAULT 2,
    resolution_target_days INTEGER NOT NULL DEFAULT 15,
    escalation_level_1_days INTEGER NOT NULL DEFAULT 5,
    escalation_level_2_days INTEGER NOT NULL DEFAULT 10,
    escalation_level_3_days INTEGER NOT NULL DEFAULT 15
);

CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_code TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    plot_id INTEGER REFERENCES plots(id),
    document_type TEXT,
    title_bn TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description_bn TEXT NOT NULL,
    complainant_nid TEXT,
    complainant_name_bn TEXT,
    complainant_phone TEXT,
    is_anonymous INTEGER NOT NULL DEFAULT 0,
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    status TEXT NOT NULL DEFAULT 'NEW',
    assigned_office_id INTEGER REFERENCES offices(id),
    assigned_to_user TEXT,
    current_escalation_level INTEGER NOT NULL DEFAULT 0,
    sla_first_reply_due_at TEXT,
    sla_resolution_due_at TEXT,
    first_replied_at TEXT,
    resolved_at TEXT,
    closed_at TEXT,
    verifying_authority_signed_note TEXT,
    satisfaction_rating INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id),
    sender_username TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    is_internal_note INTEGER NOT NULL DEFAULT 0,
    message_bn TEXT NOT NULL,
    message_en TEXT,
    attachment_path TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ticket_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id),
    event_type TEXT NOT NULL,
    actor_username TEXT NOT NULL,
    details_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);

-- 7. Marketplace Listings & Enquiries
CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_code TEXT UNIQUE NOT NULL,
    plot_id INTEGER UNIQUE NOT NULL REFERENCES plots(id),
    seller_nid TEXT NOT NULL,
    asking_price_bdt INTEGER NOT NULL,
    area_decimal REAL NOT NULL,
    description_bn TEXT NOT NULL,
    description_en TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    verification_badge TEXT NOT NULL DEFAULT 'VERIFIED_CLEAR',
    co_owner_consent_confirmed INTEGER NOT NULL DEFAULT 1,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS listing_enquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER NOT NULL REFERENCES listings(id),
    buyer_nid TEXT NOT NULL,
    buyer_name_bn TEXT NOT NULL,
    buyer_phone_dummy TEXT NOT NULL,
    message_bn TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SENT',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plot_geometries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plot_id INTEGER UNIQUE NOT NULL REFERENCES plots(id),
    mouza_jl TEXT NOT NULL,
    dag_no TEXT NOT NULL,
    geojson_polygon TEXT NOT NULL,
    center_lat REAL NOT NULL,
    center_lng REAL NOT NULL,
    created_at TEXT NOT NULL
);

-- 8. Public Noticeboard & Blog
CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notice_slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'NATIONAL',
    title_bn TEXT NOT NULL,
    title_en TEXT NOT NULL,
    body_bn TEXT NOT NULL,
    body_en TEXT NOT NULL,
    is_pinned INTEGER NOT NULL DEFAULT 0,
    is_urgent INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PUBLISHED',
    published_by TEXT,
    published_at TEXT,
    expires_at TEXT,
    view_count INTEGER NOT NULL DEFAULT 0,
    download_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notice_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notice_id INTEGER NOT NULL REFERENCES notices(id),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    content_hash TEXT NOT NULL,
    qr_payload TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blog_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name_bn TEXT NOT NULL,
    name_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_slug TEXT UNIQUE NOT NULL,
    category_slug TEXT NOT NULL REFERENCES blog_categories(slug),
    title_bn TEXT NOT NULL,
    title_en TEXT NOT NULL,
    body_bn TEXT NOT NULL,
    body_en TEXT NOT NULL,
    author_name_bn TEXT NOT NULL,
    author_name_en TEXT NOT NULL,
    reading_time_minutes INTEGER NOT NULL DEFAULT 5,
    cover_image_url TEXT,
    status TEXT NOT NULL DEFAULT 'PUBLISHED',
    published_at TEXT NOT NULL,
    helpful_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

-- 9. Staging Data Onboarding & Appeals
CREATE TABLE IF NOT EXISTS onboarding_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_no TEXT UNIQUE NOT NULL,
    record_type TEXT NOT NULL,
    maker_user_id INTEGER NOT NULL REFERENCES users(id),
    checker_user_id INTEGER REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'SUBMITTED',
    proof_package_json TEXT NOT NULL DEFAULT '{}',
    batch_hash TEXT,
    created_at TEXT NOT NULL,
    decided_at TEXT
);

CREATE TABLE IF NOT EXISTS onboarding_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL REFERENCES onboarding_batches(id),
    item_payload_json TEXT NOT NULL,
    validation_status TEXT NOT NULL DEFAULT 'VALID',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS appeals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appeal_code TEXT UNIQUE NOT NULL,
    mutation_id INTEGER NOT NULL REFERENCES mutations(id),
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    appellant_nid TEXT NOT NULL,
    appellant_name_bn TEXT NOT NULL,
    reason_bn TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'FILED',
    reviewer_username TEXT,
    decision_note_bn TEXT,
    decided_at TEXT,
    created_at TEXT NOT NULL
);

-- F08: Field inspection reports and SLA dispatches (Section 4.5 Field Verification Officer)
CREATE TABLE IF NOT EXISTS field_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_code TEXT UNIQUE NOT NULL,
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    dag_no TEXT NOT NULL,
    possession_status TEXT NOT NULL,
    boundary_status TEXT NOT NULL,
    tax_status TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    remarks_bn TEXT NOT NULL,
    signed_by_user_id INTEGER NOT NULL REFERENCES users(id),
    signed_by_username TEXT NOT NULL,
    signed_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SUBMITTED',
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_field_reports_plot ON field_reports (plot_id);
CREATE INDEX IF NOT EXISTS idx_field_reports_signed_by ON field_reports (signed_by_user_id);

CREATE TABLE IF NOT EXISTS sla_dispatches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dispatch_code TEXT UNIQUE NOT NULL,
    case_reference TEXT,
    target_role TEXT NOT NULL,
    target_user_id INTEGER REFERENCES users(id),
    target_username TEXT,
    priority TEXT NOT NULL DEFAULT 'NORMAL',
    due_at TEXT,
    notes_bn TEXT NOT NULL,
    issued_by_user_id INTEGER NOT NULL REFERENCES users(id),
    issued_by_username TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SENT',
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sla_dispatches_target ON sla_dispatches (target_role, status);
CREATE INDEX IF NOT EXISTS idx_sla_dispatches_issuer ON sla_dispatches (issued_by_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_mortgage_per_plot ON mortgages_liens (plot_id) WHERE status = 'ACTIVE';
SQL;

        if (DB::isPostgres()) {
            $pgDdl = str_replace('INTEGER PRIMARY KEY AUTOINCREMENT', 'SERIAL PRIMARY KEY', $ddl);
            foreach (array_filter(array_map('trim', explode(';', $pgDdl))) as $stmt) {
                DB::execRaw($stmt . ';');
            }
        } else {
            $pdo->exec($ddl);
        }

        // Initialize single-row ownership_write_lock record if not present
        $lockRow = DB::selectOne('SELECT id FROM ownership_write_lock WHERE id = 1');
        if (!$lockRow) {
            DB::insert(
                'INSERT INTO ownership_write_lock (id, is_authorized, authorized_by_role, mutation_case_no, updated_at) VALUES (1, 0, NULL, NULL, ?)',
                [gmdate('c')]
            );
        }

        // Install M3 Database-Level Triggers on SQLite
        if (!DB::isPostgres()) {
            $triggers = [
                <<<'SQL'
CREATE TRIGGER IF NOT EXISTS trg_guard_ownership_insert
BEFORE INSERT ON ownerships
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN (SELECT is_authorized FROM ownership_write_lock WHERE id = 1) != 1
        THEN RAISE(ABORT, 'VIOLATION_M3_OWNERSHIP_GUARD: Direct insert into ownerships table is strictly forbidden. Ownership changes are permitted only via ApproveMutation executed by an authorized AC Land officer.')
    END;
END;
SQL,
                <<<'SQL'
CREATE TRIGGER IF NOT EXISTS trg_guard_ownership_update
BEFORE UPDATE ON ownerships
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN (SELECT is_authorized FROM ownership_write_lock WHERE id = 1) != 1
        THEN RAISE(ABORT, 'VIOLATION_M3_OWNERSHIP_GUARD: Direct update to ownerships table is strictly forbidden. Ownership changes are permitted only via ApproveMutation executed by an authorized AC Land officer.')
    END;
END;
SQL,
                <<<'SQL'
CREATE TRIGGER IF NOT EXISTS trg_guard_ownership_delete
BEFORE DELETE ON ownerships
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN (SELECT is_authorized FROM ownership_write_lock WHERE id = 1) != 1
        THEN RAISE(ABORT, 'VIOLATION_M3_OWNERSHIP_GUARD: Deletion of ownership records is strictly forbidden. All modifications must be authorized amendment records via ApproveMutation.')
    END;
END;
SQL,
            ];
            foreach ($triggers as $trg) {
                $pdo->exec($trg);
            }
        }

        // Idempotent column migrations for existing databases
        $patches = [
            'ALTER TABLE tickets ADD COLUMN requester_user_id INTEGER REFERENCES users(id)',
            'ALTER TABLE notices ADD COLUMN created_by_user_id INTEGER REFERENCES users(id)',
            'ALTER TABLE notices ADD COLUMN reviewed_by_user_id INTEGER REFERENCES users(id)',
            'ALTER TABLE blog_posts ADD COLUMN created_by_user_id INTEGER REFERENCES users(id)',
            'ALTER TABLE blog_posts ADD COLUMN reviewed_by_user_id INTEGER REFERENCES users(id)',
            'ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 1',
            'ALTER TABLE users ADD COLUMN is_identity_verified INTEGER NOT NULL DEFAULT 0',
            'ALTER TABLE plots ADD COLUMN plot_code TEXT',
            'ALTER TABLE deeds ADD COLUMN deed_code TEXT',
            'ALTER TABLE mutations ADD COLUMN mutation_code TEXT',
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_active_mortgage_per_plot ON mortgages_liens (plot_id) WHERE status = 'ACTIVE'",
        ];
        foreach ($patches as $patch) {
            try {
                if (DB::isPostgres()) {
                    DB::execRaw($patch . ';');
                } else {
                    $pdo->exec($patch . ';');
                }
            } catch (\Throwable) {
                // Column or index already exists
            }
        }
        (new CreateSimulatorTables())->up($fresh);
    }

    public function down(): void
    {
        (new CreateSimulatorTables())->down();
        $tables = [
            'sla_dispatches',
            'field_reports',
            'appeals',
            'onboarding_items',
            'onboarding_batches',
            'blog_posts',
            'blog_categories',
            'notice_attachments',
            'notices',
            'plot_geometries',
            'listing_enquiries',
            'listings',
            'ticket_events',
            'ticket_messages',
            'tickets',
            'sla_policies',
            'plot_documents',
            'document_templates',
            'biometric_verifications',
            'transfer_events',
            'transfer_consents',
            'transfer_parties',
            'transfer_requests',
            'case_access_grants',
            'appointments',
            'office_user',
            'offices',
            'model_has_permissions',
            'role_has_permissions',
            'model_has_roles',
            'permissions',
            'roles',
            'service_fees_registry',
            'service_catalogue',
            'noc_certificates',
            'risk_reports',
            'audit_log',
            'disputes',
            'mortgages_liens',
            'mutations',
            'deeds',
            'ownership_write_lock',
            'ownerships',
            'khatian_records',
            'plots',
            'persons',
            'locations',
            'site_settings',
            'users',
        ];
        foreach ($tables as $tbl) {
            if (DB::isPostgres()) {
                DB::execRaw("DROP TABLE IF EXISTS {$tbl} CASCADE;");
            } else {
                DB::execRaw("DROP TABLE IF EXISTS {$tbl};");
            }
        }
    }
}
