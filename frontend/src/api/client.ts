import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 12000,
});

/**
 * Unwraps a list response. Backend endpoints return one of three shapes:
 *  - A bare array: `[{...}, {...}]`
 *  - A paginated envelope: `{items: [...], total: N}`
 *  - A single object (detail endpoints): `{...}` — returned as-is wrapped in an array
 *    so that callers using `.map()` never crash on a non-list response.
 */
export function unwrapList<T = any>(res: any): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && Array.isArray(res.items)) return res.items as T[];
  if (res && typeof res === 'object') return [res] as T[];
  return [];
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bs_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const supToken = localStorage.getItem('bs_admin_original_token');
  if (supToken) {
    config.headers['X-Admin-Supervisor-Token'] = supToken;
  }
  return config;
});

export interface ServiceCatalogueItem {
  id: number;
  category: string;
  service_code: string;
  title_bn: string;
  title_en: string;
  description_bn: string;
  description_en: string;
  service_type: 'INTERNAL_FEATURE' | 'EXTERNAL_OFFICIAL' | 'HYBRID_GUIDANCE';
  internal_route?: string | null;
  external_url?: string | null;
  source_url?: string | null;
  authority_name_bn: string;
  authority_name_en: string;
  badge_bn: string;
  badge_en: string;
  is_published: number;
  display_order: number;
  last_reviewed_date: string;
  created_at: string;
  updated_at: string;
  associated_fee?: ServiceFeeItem | null;
}

export interface FeeComponent {
  name_bn: string;
  name_en: string;
  amount_bdt: number;
  type: string;
  note_bn?: string;
  note_en?: string;
}

export interface FeeHistoryEntry {
  version: number;
  total_bdt: number;
  components: FeeComponent[];
  legal_basis_bn: string;
  circular_no: string;
  effective_date: string;
  source_url: string;
  updated_by: string;
  updated_at: string;
}

export interface ServiceFeeItem {
  id: number;
  service_code: string;
  title_bn: string;
  title_en: string;
  components_json?: string;
  components: FeeComponent[];
  total_bdt: number;
  authority_name_bn: string;
  authority_name_en: string;
  legal_basis_bn: string;
  legal_basis_en: string;
  circular_no: string;
  effective_date: string;
  source_url: string;
  is_estimate: number;
  is_published: number;
  version: number;
  history?: FeeHistoryEntry[];
  created_at: string;
  updated_at: string;
}

export interface HierarchyMouzaItem {
  division_bn?: string; division_en?: string; district_bn?: string; district_en?: string; upazila_bn?: string; upazila_en?: string;
  id: number;
  mouza_bn: string;
  mouza_en: string;
  jl_no: string;
  latitude: number | null;
  longitude: number | null;
  plots_count: number;
}

export interface HierarchyUpazilaItem {
  upazila_bn: string;
  upazila_en: string;
  mouzas_count: number;
  plots_count: number;
  mouzas: HierarchyMouzaItem[];
}

export interface HierarchyDistrictItem {
  district_bn: string;
  district_en: string;
  upazilas_count: number;
  mouzas_count: number;
  plots_count: number;
  upazilas: HierarchyUpazilaItem[];
}

export interface HierarchyDivisionItem {
  division_bn: string;
  division_en: string;
  districts_count: number;
  upazilas_count: number;
  mouzas_count: number;
  plots_count: number;
  districts: HierarchyDistrictItem[];
}

export interface AdminDeedItem {
  id: number;
  deed_code: string;
  deed_no: string;
  deed_type: string;
  status: string;
  is_flagged_admin: number;
  flag_reason_bn: string | null;
  share_fraction: string;
  area_decimal: number;
  price_bdt: number;
  chain_index: number;
  content_hash: string;
  prev_hash: string;
  signature: string;
  registered_by: string;
  created_at: string;
  mouza_bn: string;
  mouza_en: string;
  jl_no: string;
  upazila_bn: string;
  district_bn: string;
  division_bn: string;
  dag_no: string;
  land_type: string;
  seller_name_bn: string;
  seller_nid: string;
  seller_phone: string;
  buyer_name_bn: string;
  buyer_nid: string;
  buyer_phone: string;
  is_mutated: boolean;
  mutation_case_no?: string;
  dispute_count: number;
  ledger_valid: boolean;
}

export interface AdminDeedsResponse {
  items: AdminDeedItem[];
  total: number;
  page: number;
  per_page: number;
  kpis: {
    total_deeds: number;
    total_volume_bdt: number;
    mutated_deeds: number;
    flagged_deeds: number;
    registered_deeds: number;
  };
}

export interface AdminDeedDetailResponse {
  deed: any;
  seller: any;
  buyer: any;
  plot: any;
  location: any;
  verification: {
    is_valid: boolean;
    hash_valid: boolean;
    signature_valid: boolean;
    stored_hash: string;
    recomputed_hash: string;
    prev_hash: string;
    chain_index: number;
  };
  history: {
    khatians: any[];
    mutations: any[];
    mortgages: any[];
    disputes: any[];
    audit_logs: any[];
  };
}

export interface AdminAnomalyItem {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  type: string;
  title_bn: string;
  title_en: string;
  description_bn: string;
  created_at: string;
  plot_id?: number;
  deed_id?: number;
}

export interface AdminAnomaliesResponse {
  total_anomalies: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  items: AdminAnomalyItem[];
}

export interface EmergencyBroadcastState {
  is_active: boolean;
  message_bn: string;
  message_en: string;
  level: 'URGENT' | 'WARNING' | 'INFO';
  updated_at?: string | null;
  updated_by?: string;
}

export interface DatabaseBackupResponse {
  status: string;
  backup_filename: string;
  file_size_bytes: number;
  file_size_kb: number;
  sha256_checksum: string;
  total_tables: number;
  plots_count: number;
  deeds_count: number;
  users_count: number;
  generated_at: string;
  backup_path: string;
  message_bn: string;
  message_en: string;
}

export interface LedgerHealthCheckResponse {
  is_valid: boolean;
  status: 'HEALTHY' | 'COMPROMISED';
  total_blocks_checked: number;
  verified_at: string;
  verification_time_ms: number;
  genesis_hash: string;
  latest_block_hash: string;
  details: any;
  message_bn: string;
  message_en: string;
}

export interface TogglePlotFreezeResponse {
  status: string;
  plot_id: number;
  is_admin_frozen: boolean;
  admin_freeze_reason?: string | null;
  message_bn: string;
  message_en: string;
}

export interface TransferOfficerResponse {
  status: string;
  user_id: number;
  previous_office: string;
  new_office: string;
  message_bn: string;
  message_en: string;
}


export interface Finding {
  rule_code: string;
  severity: 'SAFE' | 'WARNING' | 'HIGH';
  title_bn: string;
  title_en: string;
  detail_bn: string;
  detail_en: string;
  action_bn: string;
  action_en: string;
}

export interface RiskReportResponse {
  status: 'SAFE' | 'WARNING' | 'HIGH_RISK';
  badge_bn: string;
  badge_en: string;
  summary_bn: string;
  summary_en: string;
  next_step_bn: string;
  next_step_en: string;
  findings: Finding[];
  plot?: any;
  khatian_chain?: Array<{
    id: number;
    survey_type: string;
    khatian_no: string;
    recorded_area_decimal: number;
    survey_year: number;
    reconcile_status: string;
    anomaly_note_bn: string;
    anomaly_note_en: string;
    owners: Array<{
      person_id: number;
      name_bn: string;
      name_en: string;
      father_name_bn: string;
      nid_mock: string;
      share_fraction: string;
      share_area_decimal: number;
    }>;
  }>;
  active_mortgages?: Array<{
    id: number;
    bank_name_bn: string;
    bank_name_en: string;
    branch_name: string;
    loan_amount_bdt: number;
    status: string;
    created_at: string;
  }>;
  deed_history?: Array<{
    id: number;
    deed_no: string;
    deed_type: string;
    seller_name_bn: string;
    buyer_name_bn: string;
    area_decimal: number;
    share_fraction: string;
    declared_value_bdt: number;
    status: string;
    content_hash: string;
    prev_hash: string;
    chain_index: number;
    is_tampered_demo: number;
    created_at: string;
  }>;
  disclaimer_bn: string;
  disclaimer_en: string;
}

function normalizeRiskBundle(raw: any): RiskReportResponse {
  // I05: Fail closed if response is missing, empty, or malformed
  if (!raw || typeof raw !== 'object' || Object.keys(raw).length === 0) {
    return {
      status: 'HIGH_RISK',
      badge_bn: '✖ যাচাই তথ্য অনুপস্থিত',
      badge_en: '✖ Verification Unavailable',
      summary_bn: 'সার্ভার থেকে কোনো যাচাইকরণ তথ্য বা খতিয়ান রেকর্ড পাওয়া যায়নি।',
      summary_en: 'No verification record returned from server. Do not proceed.',
      next_step_bn: 'ভূমি অফিসে যোগাযোগ করুন।',
      next_step_en: 'Contact local land office.',
      findings: [
        {
          rule_code: 'VERIFICATION_DATA_UNAVAILABLE',
          severity: 'HIGH',
          title_bn: 'যাচাই তথ্য উপলব্ধ নয়',
          title_en: 'Verification Data Unavailable',
          detail_bn: 'সার্ভার থেকে কোনো যাচাইকরণ তথ্য বা খতিয়ান রেকর্ড পাওয়া যায়নি। লেনদেন সম্পন্ন করবেন না।',
          detail_en: 'No verification record was returned by the server. Do not proceed with any transaction.',
          action_bn: 'সংশ্লিষ্ট ভূমি অফিস বা সাব-রেজিস্ট্রি অফিসে সরাসরি যোগাযোগ করুন।',
          action_en: 'Contact the relevant land office or Sub-Registry directly.',
        },
      ],
      khatian_chain: [],
      active_mortgages: [],
      deed_history: [],
      disclaimer_bn: 'যাচাই তথ্য অসম্পূর্ণ হওয়ায় সিস্টেম এটিকে উচ্চ ঝুঁকিপূর্ণ হিসেবে চিহ্নিত করেছে।',
      disclaimer_en: 'System marked this as high risk because verification data is incomplete.',
    };
  }

  const rr = raw?.risk_report || raw;
  const rawVerdict = rr?.verdict || rr?.status || raw?.status;
  const knownStatuses = ['SAFE', 'WARNING', 'REVIEW', 'HIGH_RISK'];

  // Unknown or missing verdict fails closed to HIGH_RISK
  if (!rawVerdict || !knownStatuses.includes(String(rawVerdict).toUpperCase())) {
    return {
      status: 'HIGH_RISK',
      badge_bn: '✖ অজানা যাচাই স্ট্যাটাস',
      badge_en: '✖ Unknown Verification Status',
      summary_bn: `সার্ভার হতে অপ্রত্যাশিত বা অজানা স্ট্যাটাস (${rawVerdict || 'MISSING'}) প্রদান করা হয়েছে।`,
      summary_en: `Server returned unexpected or unknown verification status (${rawVerdict || 'MISSING'}).`,
      next_step_bn: 'সিস্টেম অ্যাডমিন বা ভূমি অফিসে যোগাযোগ করুন।',
      next_step_en: 'Contact system administrator or local land office.',
      findings: [
        {
          rule_code: 'UNKNOWN_VERIFICATION_STATUS',
          severity: 'HIGH',
          title_bn: 'অজানা যাচাইকরণ প্রতিক্রিয়া',
          title_en: 'Unknown Verification Response',
          detail_bn: `সার্ভার হতে প্রত্যাশিত মান ব্যতীত স্ট্যাটাস (${rawVerdict || 'MISSING'}) এসেছে। লেনদেন স্থগিত রাখুন।`,
          detail_en: `Server returned non-standard status (${rawVerdict || 'MISSING'}). Hold transaction.`,
          action_bn: 'ভূমি অফিসে যোগাযোগ করুন।',
          action_en: 'Contact the land office.',
        },
      ],
      khatian_chain: [],
      active_mortgages: [],
      deed_history: [],
      disclaimer_bn: 'যাচাই প্রতিক্রিয়া অগ্রহণযোগ্য হওয়ায় এটিকে উচ্চ ঝুঁকিপূর্ণ হিসেবে গণ্য করা হয়েছে।',
      disclaimer_en: 'Treated as high risk due to unverified response.',
    };
  }

  const upperVerdict = String(rawVerdict).toUpperCase();
  const status: 'SAFE' | 'WARNING' | 'HIGH_RISK' =
    upperVerdict === 'HIGH_RISK' ? 'HIGH_RISK' : upperVerdict === 'REVIEW' || upperVerdict === 'WARNING' ? 'WARNING' : 'SAFE';

  // Supporting evidence check (plot, khatian_chain, deed_history, or owners)
  const hasPlot = !!(raw?.plot || rr?.plot);
  const rawKhatians = raw?.khatian_chain || rr?.khatian_chain || [];
  const rawDeeds = raw?.deeds || raw?.deed_history || rr?.deeds || rr?.deed_history || [];
  const rawOwners = raw?.ownership_history || rr?.ownership_history || raw?.current_owners || rr?.current_owners || [];
  const hasEvidence =
    hasPlot ||
    (Array.isArray(rawKhatians) && rawKhatians.length > 0) ||
    (Array.isArray(rawDeeds) && rawDeeds.length > 0) ||
    (Array.isArray(rawOwners) && rawOwners.length > 0);

  // Bare SAFE without plot or supporting evidence fails closed to HIGH_RISK
  if (status === 'SAFE' && !hasEvidence) {
    return {
      status: 'HIGH_RISK',
      badge_bn: '✖ অপর্যাপ্ত যাচাইকরণ প্রমাণ',
      badge_en: '✖ Insufficient Evidence',
      summary_bn: 'সার্ভার থেকে নিরাপদ ঘোষণা আসলেও কোনো প্লট, খতিয়ান বা দলিল প্রমাণ পাওয়া যায়নি।',
      summary_en: 'Verification returned SAFE but lacked required plot, khatian, or deed evidence. Do not proceed.',
      next_step_bn: 'ভূমি অফিসে যোগাযোগ করে পূর্ণাঙ্গ রেকর্ড যাচাই করুন।',
      next_step_en: 'Contact land office to obtain complete records.',
      findings: [
        {
          rule_code: 'INSUFFICIENT_EVIDENCE',
          severity: 'HIGH',
          title_bn: 'যাচাই প্রমাণের ঘাটতি',
          title_en: 'Insufficient Verification Evidence',
          detail_bn: 'কোনো সহায়ক প্লট, খতিয়ান রেকর্ড বা রেজিস্ট্রি দলিল ব্যতীত নিরাপদ হিসেবে বিবেচনা করা সম্ভব নয়।',
          detail_en: 'Cannot verify plot safety without supporting khatian records, plot details, or deed history.',
          action_bn: 'সহকারী কমিশনার (ভূমি) বা সাব-রেজিস্ট্রারের দপ্তরে সরাসরি রেকর্ড যাচাই করুন।',
          action_en: 'Verify physical land records directly with AC Land or Sub-Registrar.',
        },
      ],
      khatian_chain: [],
      active_mortgages: [],
      deed_history: [],
      disclaimer_bn: 'অপর্যাপ্ত তথ্যের কারণে সিস্টেম এই লেনদেনকে উচ্চ ঝুঁকিপূর্ণ হিসেবে চিহ্নিত করেছে।',
      disclaimer_en: 'Marked as high risk due to insufficient evidence.',
    };
  }

  // Fast path for authentic, already-normalized bundle with valid status and evidence
  if (
    raw &&
    typeof raw === 'object' &&
    ['SAFE', 'WARNING', 'HIGH_RISK'].includes(raw.status) &&
    Array.isArray(raw.findings) &&
    raw.findings.length > 0 &&
    (raw.status !== 'SAFE' || hasEvidence)
  ) {
    return raw as RiskReportResponse;
  }

  const rawFlags = Array.isArray(rr.flags) ? rr.flags : Array.isArray(rr.findings) ? rr.findings : [];
  let findings: Finding[];

  if (rawFlags.length > 0) {
    findings = rawFlags.map((f: any) => ({
      rule_code: f.rule_id || f.rule_code || 'CHECK_RULE',
      severity:
        f.severity === 'HIGH_RISK' || f.severity === 'HIGH'
          ? 'HIGH'
          : f.severity === 'REVIEW' || f.severity === 'WARNING'
          ? 'WARNING'
          : 'SAFE',
      title_bn: f.title_bn || 'পর্যবেক্ষণ',
      title_en: f.title_en || 'Observation',
      detail_bn: f.message_bn || f.detail_bn || '',
      detail_en: f.message_en || f.detail_en || '',
      action_bn:
        f.severity === 'HIGH_RISK'
          ? 'এই লেনদেন স্থগিত রাখুন এবং মূল বালাম ও খতিয়ান যাচাই করুন।'
          : 'সংশ্লিষ্ট এসি ল্যান্ড বা সাব-রেজিস্ট্রারের ম্যানুয়াল অনুমোদন নিন।',
      action_en:
        f.severity === 'HIGH_RISK'
          ? 'Hold this transaction and inspect physical registry volumes.'
          : 'Obtain manual officer verification from AC Land / Sub-Registrar.',
    }));
  } else if (status === 'SAFE') {
    // Only synthesize ALL_CHECKS_PASSED if status is explicitly SAFE
    findings = [
      {
        rule_code: 'ALL_CHECKS_PASSED',
        severity: 'SAFE',
        title_bn: 'মালিকানা চেইন, ডিজিটাল স্বাক্ষর ও ব্যাংক বন্ধক যাচাই সম্পন্ন',
        title_en: 'Ownership Lineage, Cryptographic Hash & Lien Checks Passed',
        detail_bn:
          'সিএস/আরএস/বিএস খতিয়ান পরম্পরা, বিক্রেতার স্বত্ব এবং ক্রিপ্টোগ্রাফিক লেজার স্বাক্ষরে কোনো অসঙ্গতি শনাক্ত হয়নি।',
        detail_en:
          'CS/RS/BS khatian lineage, seller share entitlement, and cryptographic ledger checks verified.',
        action_bn: 'নিয়মমাফিক সরকারি ফি জমা দিয়ে পরবর্তী কার্যক্রম পরিচালনা করতে পারেন।',
        action_en: 'You may proceed with normal official registration fees.',
      },
    ];
  } else {
    findings = [
      {
        rule_code: 'UNSPECIFIED_RISK_WARNING',
        severity: status === 'HIGH_RISK' ? 'HIGH' : 'WARNING',
        title_bn: 'সতর্কতা: যাচাইকরণে অসঙ্গতি চিহ্নিত',
        title_en: 'Warning: Discrepancy Detected',
        detail_bn: 'রেকর্ড বিশ্লেষণে সম্ভাব্য ঝুঁকি বা অসম্পূর্ণ তথ্য শনাক্ত হয়েছে।',
        detail_en: 'Potential risk or incomplete record identified in analysis.',
        action_bn: 'ভূমি রেকর্ড ম্যানুয়ালি যাচাই করুন।',
        action_en: 'Verify land records manually.',
      },
    ];
  }

  const ownershipHistory = rawOwners;
  const khatianChain = rawKhatians.map((k: any) => {
    const kOwners = ownershipHistory
      .filter((o: any) => Number(o.khatian_id) === Number(k.id))
      .map((o: any) => ({
        person_id: Number(o.person_id),
        name_bn: o.owner_name_bn || o.name_bn || 'মালিক',
        name_en: o.owner_name_en || o.name_en || 'Owner',
        father_name_bn: o.father_name_bn || '',
        nid_mock: o.nid || o.nid_mock || '',
        share_fraction: o.share_fraction || '1/1',
        share_area_decimal: Number(o.area_decimal ?? o.share_area_decimal ?? 0),
      }));

    return {
      id: Number(k.id),
      survey_type: k.survey_type,
      khatian_no: k.khatian_no,
      recorded_area_decimal: Number(k.recorded_area_decimal),
      survey_year: Number(k.survey_year),
      reconcile_status: k.status === 'VALID' || k.reconcile_status === 'MATCHED' ? 'MATCHED' : k.status || 'ANOMALY',
      anomaly_note_bn: k.remarks_bn || k.anomaly_note_bn || '',
      anomaly_note_en: k.remarks_en || k.anomaly_note_en || '',
      owners: kOwners,
    };
  });

  const mortgages = (raw?.mortgages || raw?.active_mortgages || [])
    .filter((m: any) => m.status === 'ACTIVE')
    .map((m: any) => ({
      id: Number(m.id),
      bank_name_bn: m.bank_name_bn,
      bank_name_en: m.bank_name_en,
      branch_name: m.branch_bn || m.branch_name || 'প্রধান শাখা',
      loan_amount_bdt: Number(m.amount_bdt ?? m.loan_amount_bdt ?? 0),
      status: m.status,
      created_at: m.created_at,
    }));

  const deedHistory = (raw?.deeds || raw?.deed_history || []).map((d: any) => ({
    id: Number(d.id),
    deed_no: d.deed_no,
    deed_type: d.deed_type,
    seller_name_bn: d.seller_name_bn || '',
    buyer_name_bn: d.buyer_name_bn || '',
    area_decimal: Number(d.area_decimal),
    share_fraction: d.share_fraction || '1/1',
    declared_value_bdt: Number(d.price_bdt ?? d.declared_value_bdt ?? 0),
    status: d.status,
    content_hash: d.content_hash,
    prev_hash: d.prev_hash,
    chain_index: Number(d.chain_index),
    is_tampered_demo: d.ledger_valid === false ? 1 : Number(d.is_tampered_demo ?? 0),
    created_at: d.created_at,
  }));

  const nextStepsBn = Array.isArray(rr.next_steps_bn) ? rr.next_steps_bn.join(' • ') : rr.next_step_bn || '';
  const nextStepsEn = Array.isArray(rr.next_steps_en) ? rr.next_steps_en.join(' • ') : rr.next_step_en || '';

  return {
    status,
    badge_bn: rr.badge_bn || (status === 'SAFE' ? '✔ নিরাপদ' : status === 'WARNING' ? '⚠ সতর্কতা' : '✖ ঝুঁকিপূর্ণ'),
    badge_en: rr.badge_en || (status === 'SAFE' ? '✔ Safe & Verified' : status === 'WARNING' ? '⚠ Needs Review' : '✖ High Risk'),
    summary_bn: rr.summary_bn || '',
    summary_en: rr.summary_en || '',
    next_step_bn: nextStepsBn,
    next_step_en: nextStepsEn,
    findings,
    plot: raw?.plot,
    khatian_chain: khatianChain,
    active_mortgages: mortgages,
    deed_history: deedHistory,
    disclaimer_bn:
      rr.disclaimer_bn ||
      'বিশেষ দ্রষ্টব্য: ভূমি সুরক্ষা শুধুমাত্র সম্ভাব্য ঝুঁকি চিহ্নিত করে; চূড়ান্ত আইনি সিদ্ধান্ত সংশ্লিষ্ট সরকারি কর্মকর্তার।',
    disclaimer_en:
      rr.disclaimer_en ||
      'Disclaimer: BhumiShield flags risk for a human officer to decide. It never declares final legal truth.',
  };
}

export const BhumiApi = {
  // Auth & RBAC Middleware Endpoints
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }).then((r) => {
      const u = r.data.user;
      if (u) {
        u.nid_mock = u.nid || u.nid_mock || '';
        u.phone_mock = u.phone_dummy || u.phone_mock || '';
        u.office_name = u.office_bn || u.office_name || '';
      }
      return r.data;
    }),
  register: (payload: any) =>
    api.post('/auth/register', payload).then((r) => {
      const u = r.data.user;
      if (u) {
        u.nid_mock = u.nid || u.nid_mock || '';
        u.phone_mock = u.phone_dummy || u.phone_mock || '';
        u.office_name = u.office_bn || u.office_name || '';
      }
      return r.data;
    }),
  getMe: () => api.get('/auth/me').then((r) => r.data),
  updateProfile: (payload: any) => api.put('/auth/profile', payload).then((r) => r.data),
  completeProfile: (payload: any) =>
    api.post('/auth/complete-profile', payload).then((r) => {
      const u = r.data.user;
      if (u) {
        u.nid_mock = u.nid || u.nid_mock || '';
        u.phone_mock = u.phone_dummy || u.phone_mock || '';
        u.office_name = u.office_bn || u.office_name || '';
      }
      return r.data;
    }),
  switchDemoRole: (role: string) =>
    api.post('/auth/switch-demo-role', { role }).then((r) => {
      const u = r.data.user;
      if (u) {
        u.nid_mock = u.nid || u.nid_mock || '';
        u.phone_mock = u.phone_dummy || u.phone_mock || '';
        u.office_name = u.office_bn || u.office_name || '';
      }
      return r.data;
    }),
  getPermissions: () => api.get('/auth/permissions').then((r) => r.data),

  // Users CRUD (Admin)
  listUsers: () =>
    api.get('/admin/users').then((r) => {
      const items = r.data.items || r.data || [];
      return items.map((u: any) => ({
        ...u,
        nid_mock: u.nid || u.nid_mock || '',
        phone_mock: u.phone_dummy || u.phone_mock || '',
        office_name: u.office_bn || u.office_name || '',
      }));
    }),
  createUser: (payload: any) => api.post('/admin/users', payload).then((r) => r.data),
  updateUser: (id: number, payload: any) => api.put(`/admin/users/${id}`, payload).then((r) => r.data),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`).then((r) => r.data),

  // Site Settings & Enterprise Analytics
  getSettings: () => api.get('/settings').then((r) => r.data),
  updateSettings: (settings: Record<string, string>) =>
    api.put('/settings', { settings }).then((r) => r.data),
  getStatsSummary: () => api.get('/analytics/summary').then((r) => r.data),
  getDocumentSecurityConfig: () => api.get('/document-security-config').then((r) => r.data),
  updateDocumentSecurityConfig: (payload: any) =>
    api.post('/admin/document-security-config', payload).then((r) => r.data),

  // Citizen Vault, Sale Lock & Disputes
  getMyVault: (nid?: string) =>
    api.get('/citizen/my-properties', { params: nid ? { nid } : {} }).then((r) => {
      const data = r.data;
      return {
        found: true,
        person: {
          ...data.person,
          nid_mock: data.person?.nid || data.person?.nid_mock || '',
        },
        owned_plots: (data.owned_plots || []).map((op: any) => ({
          ...op,
          share_area_decimal: Number(op.area_decimal ?? op.share_area_decimal ?? 0),
        })),
        deeds: data.deeds || [],
      };
    }),
  togglePlotSaleLock: (plotId: number, reason_bn?: string) =>
    api.post(`/citizen/plots/${plotId}/toggle-lock`, { reason_bn }).then((r) => r.data),
  listDisputes: (plotId?: number) =>
    api
      .get('/citizen/disputes', { params: plotId ? { plot_id: plotId } : {} })
      .then((r) => r.data.items || r.data || []),
  fileDispute: (payload: {
    plot_id: number;
    complainant_name_bn?: string;
    complainant_nid?: string;
    dispute_type: string;
    description_bn: string;
  }) => api.post('/citizen/disputes', payload).then((r) => r.data),

  // Sub-Registrar Controlling Endpoints
  listRegistrarDeeds: (status?: string) =>
    api
      .get('/registrar/deeds', { params: status ? { status } : {} })
      .then((r) => r.data.items || r.data || []),
  updateRegistrarDeedStatus: (
    deedId: number,
    payload: { status: string; officer_note?: string }
  ) =>
    api
      .post(`/registrar/deeds/${deedId}/status`, {
        status: payload.status === 'REGISTERED' ? 'PENDING_MUTATION' : payload.status,
        notes_bn: payload.officer_note,
      })
      .then((r) => r.data),
  calculateFees: (declared_value_bdt: number, deed_type = 'SALE') =>
    api
      .get('/registrar/calculate-fees', {
        params: { price_bdt: declared_value_bdt, deed_type },
      })
      .then((r) => {
        const d = r.data;
        if (d.breakdown) return d;
        return {
          declared_value_bdt: d.price_bdt,
          deed_type: d.deed_type,
          breakdown: {
            stamp_duty_bdt: d.stamp_duty_bdt,
            registration_fee_bdt: d.registration_fee_bdt,
            local_govt_tax_bdt: d.local_govt_tax_bdt,
            ait_gain_tax_bdt: d.ait_source_tax_bdt,
          },
          total_payable_bdt: d.total_govt_fees_bdt,
        };
      }),

  // AC Land Controlling Endpoints
  listFlaggedKhatians: () =>
    api.get('/acland/flagged-khatians').then((r) => {
      const items = r.data.items || r.data || [];
      return items.map((k: any) => ({
        ...k,
        area_rs: k.total_area_decimal ?? k.recorded_area_decimal,
        area_bs: k.recorded_area_decimal ?? k.total_area_decimal,
        area_decimal: k.total_area_decimal ?? k.recorded_area_decimal,
        reconcile_status: k.status,
        anomaly_note_bn: k.remarks_bn || '',
        anomaly_note_en: k.remarks_en || '',
      }));
    }),
  reconcileKhatian: (
    plotId: number,
    payload: { resolution_note_bn: string; updated_area_decimal?: number }
  ) =>
    api
      .post(`/acland/khatians/${plotId}/reconcile`, {
        order_notes_bn: payload.resolution_note_bn,
        reconciled_area_decimal: payload.updated_area_decimal,
      })
      .then((r) => r.data),
  resolveDispute: (
    disputeId: number,
    payload: { status: string; resolution_note_bn: string }
  ) =>
    api
      .post(`/acland/disputes/${disputeId}/resolve`, {
        status: payload.status === 'RESOLVED_DISMISSED' ? 'RESOLVED' : payload.status,
        resolution_notes_bn: payload.resolution_note_bn,
      })
      .then((r) => r.data),

  // Bank Officer Controlling Endpoints
  getMortgageNoc: (lienId: number) =>
    api.get(`/mortgages/${lienId}/noc`).then((r) => {
      const d = r.data;
      return {
        noc_no: d.noc_no,
        issued_at: d.released_at,
        noc_hash: d.noc_hash,
        signature: d.ed25519_signature || d.signature,
        qr_data_uri: d.qr_svg_data_uri || d.qr_data_uri,
        lien: {
          bank_name_bn: d.bank_name_bn,
          bank_name_en: d.bank_name_en,
          branch_name: d.branch_bn,
          status: d.status,
          borrower_name_bn: d.borrower_name_bn,
          borrower_nid: d.borrower_nid,
          mouza_bn: d.mouza_bn,
          dag_no: d.dag_no,
          loan_amount_bdt: d.amount_bdt,
        },
      };
    }),
  verifyNocByCode: (nocNo: string, hashPrefix?: string | null) =>
    api
      .get(`/verify/noc/${encodeURIComponent(nocNo)}`, {
        params: hashPrefix ? { h: hashPrefix } : {},
      })
      .then((r) => r.data),

  // Core Domain Endpoints
  getLocations: () =>
    api.get('/locations').then((r) => r.data.locations || r.data || []),
  getPlots: (mouza_id?: number) =>
    api.get('/locations').then((r) => {
      const plots = (r.data.plots || []).map((p: any) => ({
        ...p,
        mouza_id: Number(p.location_id ?? p.mouza_id ?? 1),
        land_type: p.land_type_bn || p.land_type || 'ভিটা',
      }));
      if (mouza_id) {
        return plots.filter((p: any) => Number(p.mouza_id) === Number(mouza_id));
      }
      return plots;
    }),
  getPlotDetail: async (plotId: number) => {
    const res = await api.get(`/plots/${plotId}/check-before-you-buy`);
    return {
      ...(res.data.plot || {}),
      owners: res.data.owners || [],
      khatian_chain: res.data.khatian_chain || [],
      rules: res.data.rules || [],
    };
  },
  getKhatianChain: async (plotId: number) => {
    const res = await api.get(`/plots/${plotId}/check-before-you-buy`);
    return res.data.khatian_chain || [];
  },
  getPersons: (plotId?: number) =>
    api
      .get('/persons', { params: plotId ? { plot_id: plotId } : {} })
      .then((r) => {
        const items = r.data.items || r.data || [];
        return items.map((p: any) => ({
          ...p,
          nid_mock: p.nid || p.nid_mock || '',
        }));
      }),
  checkBeforeBuy: async (payload: {
    plot_id: number;
    seller_nid?: string;
    seller_id?: number;
    proposed_area_decimal?: number;
    deed_type?: string;
  }): Promise<RiskReportResponse> => {
    const r = await api.get(`/plots/${payload.plot_id}/check-before-you-buy`, {
      params: {
        requested_area_decimal: payload.proposed_area_decimal,
        seller_id: payload.seller_id,
      },
    });
    return normalizeRiskBundle(r.data);
  },
  citizenCheckBeforeYouBuy: async (plotCodeOrId: number | string) => {
    const res = await api.get(`/plots/${plotCodeOrId}/check-before-you-buy`);
    return res.data;
  },
  verifyDeedByCode: (deedNo: string, hashPrefix?: string | null) =>
    api
      .get(`/verify/deed/${encodeURIComponent(deedNo)}`, {
        params: hashPrefix ? { h: hashPrefix } : {},
      })
      .then((r) => {
      const d = r.data;
      if (d.cryptographic_proof) return d;
      const ver = d.verification || {};
      return {
        verified: Boolean(ver.is_valid),
        badge_bn: ver.is_valid
          ? '✔ দলিলের ডিজিটাল স্বাক্ষর ও হ্যাশ চেইন সম্পূর্ণ অক্ষত'
          : d.qr_short_hash_matches === false ? '✖ প্রুফ লিংকের হ্যাশ এই রেকর্ডের সাথে মেলে না' : '✖ সংরক্ষিত দলিল যাচাই ব্যর্থ',
        badge_en: ver.is_valid
          ? '✔ Cryptographic Ed25519 Signature & Hash Chain Verified'
          : d.qr_short_hash_matches === false ? '✖ Proof link hash does not match this record' : '✖ Stored deed verification failed',
        message_bn: (d.reasons_bn || [])[0] || '',
        message_en: (d.reasons_en || [])[0] || '',
        qr_data_uri: d.qr_svg_data_uri,
        deed: {
          ...d.deed,
          mouza_bn: d.location?.mouza_bn || '',
          mouza_en: d.location?.mouza_en || '',
          dag_no: d.plot?.dag_no || '',
          seller_name_bn: d.seller?.name_bn || '',
          seller_nid: d.seller?.nid || '',
          buyer_name_bn: d.buyer?.name_bn || '',
          buyer_nid: d.buyer?.nid || '',
        },
        cryptographic_proof: {
          stored_content_hash: ver.stored_hash,
          recomputed_content_hash: ver.recomputed_hash,
          hash_matches: Boolean(ver.hash_valid),
          prev_hash: ver.prev_hash,
          signature_valid: Boolean(ver.signature_valid),
        },
      };
    }),
  createDeed: (payload: {
    deed_type: string;
    plot_id: number;
    seller_id: number;
    buyer_id: number;
    area_decimal: number;
    share_fraction: string;
    declared_value_bdt: number;
  }) =>
    api
      .post('/registrar/register-deed', {
        deed_type: payload.deed_type,
        plot_id: payload.plot_id,
        seller_id: payload.seller_id,
        buyer_id: payload.buyer_id,
        requested_area_decimal: payload.area_decimal,
        share_fraction: payload.share_fraction,
        price_bdt: payload.declared_value_bdt,
      })
      .then((r) => {
        const d = r.data;
        return {
          message_bn: d.message_bn,
          message_en: d.message_en,
          qr_data_uri: d.qr_svg_data_uri,
          deed: {
            deed_no: d.deed_no,
            status: d.status === 'PENDING_MUTATION' ? 'REGISTERED' : d.status,
            chain_index: d.chain_index,
            content_hash: d.content_hash,
          },
        };
      }),
  tamperDeedDemo: (deedNo: string = 'DL-2026-1005', newArea: number = 25.0) => {
    const target = deedNo && deedNo !== '1' ? deedNo : 'DL-2026-1005';
    return api.post(`/ledger/tamper/${encodeURIComponent(target)}`, { new_area_decimal: newArea }).then((r) => r.data);
  },
  tamperDeedRecord: (deedNo: string = 'DL-2026-1005', newArea: number = 25.0) => {
    const target = deedNo && deedNo !== '1' ? deedNo : 'DL-2026-1005';
    return api.post(`/ledger/tamper/${encodeURIComponent(target)}`, { new_area_decimal: newArea }).then((r) => r.data);
  },
  restoreDeedDemo: (deedNo: string = 'DL-2026-1005') => {
    const target = deedNo && deedNo !== '1' ? deedNo : 'DL-2026-1005';
    return api.post(`/ledger/restore/${encodeURIComponent(target)}`).then((r) => r.data);
  },
  resetLedger: (deedNo?: string) => {
    const target = deedNo && deedNo !== '1' ? deedNo : 'DL-2026-1005';
    return api.post(`/ledger/restore/${encodeURIComponent(target)}`).then((r) => r.data);
  },
  getLedgerState: () =>
    api.get('/ledger/verify').then((r) => {
      const d = r.data;
      const sample = d.chain_sample || [];
      const brokenList = d.broken_links || d.broken_blocks || sample.filter((b: any) => !b.is_valid);
      return {
        chain_intact: Boolean(d.is_valid),
        daily_merkle_root: d.merkle_root,
        total_blocks: d.total_deeds,
        verified_count: d.verified_count,
        broken_blocks: brokenList.map((b: any) => ({
          chain_index: b.chain_index,
          deed_no: b.deed_no,
          stored_hash: b.stored_hash,
          recomputed_hash: b.recomputed_hash,
        })),
        chain_sample: sample,
      };
    }),
  getMutations: () =>
    api.get('/mutations').then((r) => {
      const items = r.data.items || r.data || [];
      return items.map((m: any) => ({
        ...m,
        share_fraction: m.share_fraction || '',
        decision_note_bn: m.decision_reason_bn || '',
      }));
    }),
  decideMutation: (mutationId: number, status: 'APPROVED' | 'REJECTED', decision_note_bn: string) =>
    api
      .post(`/mutations/${mutationId}/decide`, {
        decision: status,
        reason_bn: decision_note_bn,
      })
      .then((r) => r.data),
  applyMutation: (data: {
    plot_id: number;
    mutation_type?: 'SUCCESSION' | 'SALE' | 'HEBA';
    seller_id?: number;
    buyer_id?: number;
    area_decimal?: number;
    heirs?: Array<{
      name_bn: string;
      relation: string;
      fraction: string;
      share_percent: number;
      area_decimal: number;
      nid?: string;
    }>;
    documents_note?: string;
    notes_bn?: string;
  }) => api.post('/mutations/apply', data).then((r) => r.data),
  getMortgages: () =>
    api.get('/mortgages').then((r) => {
      const items = r.data.items || r.data || [];
      return items.map((m: any) => ({
        ...m,
        branch_name: m.branch_bn || m.branch_name || 'প্রধান শাখা',
        loan_amount_bdt: Number(m.amount_bdt ?? m.loan_amount_bdt ?? 0),
      }));
    }),
  checkBankCollateral: async (payload: { plot_id: number; borrower_id: number; area_mortgaged_decimal: number }) => {
    const response = await api.post('/mortgages/collateral-check', payload);
    return normalizeRiskBundle(response.data);
  },
  createMortgage: (payload: {
    plot_id: number;
    borrower_id: number;
    bank_name_bn: string;
    bank_name_en: string;
    branch_name: string;
    loan_amount_bdt: number;
    area_mortgaged_decimal: number;
  }) =>
    api
      .post('/mortgages', {
        plot_id: payload.plot_id,
        borrower_id: payload.borrower_id,
        bank_name_bn: payload.bank_name_bn,
        bank_name_en: payload.bank_name_en,
        branch_bn: payload.branch_name,
        requested_loan_bdt: payload.loan_amount_bdt,
        area_mortgaged_decimal: payload.area_mortgaged_decimal,
      })
      .then((r) => r.data),
  releaseMortgage: (lienId: number) =>
    api.post(`/mortgages/${lienId}/release`).then((r) => r.data),

  getAuditLogs: () =>
    api.get('/audit-log').then((r) => {
      const items = r.data.items || r.data || [];
      return items.map((l: any) => ({
        id: l.id,
        action: l.action,
        actor_role: `${l.actor_username} (${l.actor_role})`,
        target_ref: `${l.entity_type}#${l.entity_id}`,
        detail: l.details?.note_bn || JSON.stringify(l.details || {}),
        entry_hash: l.entry_hash,
        created_at: l.created_at,
      }));
    }),
  getOcrSample: () =>
    api.post('/ocr/khatian-demo', { preset_id: 'bs_4101' }).then((r) => {
      const d = r.data;
      if (d.extracted_fields && !Array.isArray(d.extracted_fields)) {
        return d;
      }
      const fieldsObj: Record<string, any> = {};
      (d.extracted_fields || []).forEach((f: any) => {
        fieldsObj[f.label_en || f.field_key] = {
          value: f.extracted_value_bn,
          confidence: typeof f.confidence === 'number' ? f.confidence : 0.95,
          low_confidence: Boolean(f.needs_human_confirmation || f.low_confidence),
        };
      });
      return { extracted_fields: fieldsObj };
    }),

  // Service Catalogue & Fees (Phase 2)
  listPublicServices: (category?: string, q?: string): Promise<{ items: ServiceCatalogueItem[]; total: number; disclaimer_bn: string; disclaimer_en: string }> =>
    api.get('/services', { params: { category, q } }).then((r) => r.data),
  getPublicService: (codeOrId: string | number): Promise<{ service: ServiceCatalogueItem }> =>
    api.get(`/services/${codeOrId}`).then((r) => r.data),
  listPublicFees: (): Promise<{ items: ServiceFeeItem[]; total: number; circular_note_bn: string; circular_note_en: string }> =>
    api.get('/fees').then((r) => r.data),
  listAdminServices: (): Promise<{ items: ServiceCatalogueItem[]; total: number }> =>
    api.get('/admin/services').then((r) => r.data),
  createService: (data: Partial<ServiceCatalogueItem>): Promise<{ service: ServiceCatalogueItem; message_bn: string; message_en: string }> =>
    api.post('/admin/services', data).then((r) => r.data),
  updateService: (id: number, data: Partial<ServiceCatalogueItem>): Promise<{ service: ServiceCatalogueItem; message_bn: string; message_en: string }> =>
    api.put(`/admin/services/${id}`, data).then((r) => r.data),
  togglePublishService: (id: number): Promise<{ id: number; is_published: number; message_bn: string; message_en: string }> =>
    api.post(`/admin/services/${id}/toggle-publish`).then((r) => r.data),
  archiveService: (id: number): Promise<{ id: number; is_published: number; message_bn: string; message_en: string }> =>
    api.delete(`/admin/services/${id}`).then((r) => r.data),
  listAdminFees: (): Promise<{ items: ServiceFeeItem[]; total: number }> =>
    api.get('/admin/fees').then((r) => r.data),
  updateFee: (id: number, data: Partial<ServiceFeeItem>): Promise<{ fee: ServiceFeeItem; message_bn: string; message_en: string }> =>
    api.put(`/admin/fees/${id}`, data).then((r) => r.data),
  verifyCitizenIdentity: (userId: number): Promise<{ user_id: number; is_identity_verified: number; message_bn: string; message_en: string }> =>
    api.post(`/admin/users/${userId}/verify-identity`).then((r) => r.data),

  // Citizen Vault & Document Checklist (Phase 5)
  getPlotDocuments: (plotCodeOrId: string | number): Promise<any> =>
    api.get(`/plots/${plotCodeOrId}/documents`).then((r) => r.data),
  uploadPlotDocument: (plotCodeOrId: string | number, data: { doc_type: string; document_no?: string; notes_bn?: string; file_name?: string }): Promise<any> =>
    api.post(`/plots/${plotCodeOrId}/documents`, data).then((r) => r.data),
  requestMissingDocument: (plotCodeOrId: string | number, data: { doc_type?: string; document_type?: string; notes_bn?: string; title_bn?: string; title_en?: string; priority?: string }): Promise<any> =>
    api.post(`/plots/${plotCodeOrId}/request-missing-document`, data).then((r) => r.data),

  // 13-Step Transfer State Machine (Phase 4)
  listTransfers: (query?: any): Promise<any> =>
    api.get('/transfers', { params: query }).then((r) => r.data),
  createTransfer: (data: any): Promise<any> =>
    api.post('/transfers', data).then((r) => r.data),
  getTransfer: (codeOrId: string | number): Promise<any> =>
    api.get(`/transfers/${codeOrId}`).then((r) => r.data),
  advanceTransfer: (codeOrId: string | number, data: any): Promise<any> =>
    api.post(`/transfers/${codeOrId}/advance`, data).then((r) => r.data),

  // SLA Support Tickets & Tracking (Phase 5)
  listTickets: (query?: any): Promise<any> =>
    api.get('/tickets', { params: query }).then((r) => r.data),
  getTicket: (codeOrId: string | number): Promise<any> =>
    api.get(`/tickets/${codeOrId}`).then((r) => r.data),
  createTicket: (data: { title: string; message: string; priority?: string; category?: string }): Promise<any> =>
    api.post('/tickets', data).then((r) => r.data),
  replyTicket: (codeOrId: string | number, data: { message: string; status?: string; internal_note?: boolean }): Promise<any> =>
    api.post(`/tickets/${codeOrId}/messages`, data).then((r) => r.data),

  // Content & Moderation Workflows (R08)
  listManagedContent: (query?: { kind?: string }): Promise<any> =>
    api.get('/manage/content', { params: query }).then((r) => r.data),
  saveManagedContent: (data: any, id?: number): Promise<any> =>
    id ? api.put(`/manage/content/${id}`, data).then((r) => r.data) : api.post('/manage/content', data).then((r) => r.data),
  transitionManagedContent: (id: number, data: { kind?: string; status: string }): Promise<any> =>
    api.post(`/manage/content/${id}/status`, data).then((r) => r.data),

  // Institutional Public Registers & Blog (Phase 3 & Tier B)
  listOffices: (query?: any): Promise<any[]> =>
    api.get('/offices', { params: query }).then((r) => unwrapList<any>(r.data)),
  listNotices: (query?: any): Promise<any> =>
    api.get('/notices', { params: query }).then((r) => r.data),
  getNotice: (slugOrId: string | number): Promise<any> =>
    api.get(`/notices/${slugOrId}`).then((r) => r.data),
  listBlogPosts: (categoryOrQuery?: any): Promise<any> => {
    const params = typeof categoryOrQuery === 'string' ? { category: categoryOrQuery } : categoryOrQuery;
    return api.get('/blog', { params }).then((r) => r.data);
  },
  getBlogPost: (slugOrId: string | number): Promise<any> =>
    api.get(`/blog/${slugOrId}`).then((r) => r.data),
  markBlogPostHelpful: (slugOrId: string | number): Promise<any> =>
    api.post(`/blog/${slugOrId}/helpful`).then((r) => r.data),

  // Public Land Sale Marketplace & Map Features (Tier B)
  listListings: (filters?: any): Promise<any> =>
    api.get('/listings', { params: filters }).then((r) => r.data),
  getListing: (codeOrId: string | number): Promise<any> =>
    api.get(`/listings/${codeOrId}`).then((r) => r.data),
  createListing: (data: any): Promise<any> =>
    api.post('/listings', data).then((r) => r.data),
  createListingEnquiry: (codeOrId: string | number, data: any): Promise<any> =>
    api.post(`/listings/${codeOrId}/enquire`, data).then((r) => r.data),
  listListingEnquiries: (codeOrId: string | number): Promise<any> =>
    api.get(`/listings/${codeOrId}/enquiries`).then((r) => r.data),
  updateListingEnquiry: (codeOrId: string | number, enquiryId: number, data: { status: string }): Promise<any> =>
    api.patch(`/listings/${codeOrId}/enquiries/${enquiryId}`, data).then((r) => r.data),
  createAppointment: (data: any): Promise<any> =>
    api.post('/appointments', data).then((r) => r.data),
  listAppointments: (params?: any): Promise<any> =>
    api.get('/appointments', { params }).then((r) => r.data),
  getMapFeatures: (zoom?: number): Promise<any> =>
    api.get('/public/map/features', { params: { zoom } }).then((r) => r.data),

  // F08 Field Operations — Field Inspection Reports & SLA Escalations
  listFieldReports: (params?: { plot_id?: number }): Promise<any[]> =>
    api.get('/field-reports', { params }).then((r) => unwrapList<any>(r.data)),
  createFieldReport: (data: {
    plot_id: number;
    possession_status: string;
    boundary_status: string;
    tax_status: string;
    remarks_bn: string;
    latitude?: number;
    longitude?: number;
  }): Promise<any> =>
    api.post('/field-reports', data).then((r) => r.data),
  listSlaDispatches: (params?: { status?: string }): Promise<any[]> =>
    api.get('/sla-dispatches', { params }).then((r) => unwrapList<any>(r.data)),
  createSlaDispatch: (data: {
    case_reference?: string;
    target_role: string;
    target_user_id?: number;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    due_at?: string;
    notes_bn: string;
  }): Promise<any> =>
    api.post('/sla-dispatches', data).then((r) => r.data),

  // Maker-Checker Staging Data Onboarding (Tier C Section 8.7)
  listOnboardingBatches: (params?: { status?: string }): Promise<any[]> =>
    api.get('/onboarding/batches', { params }).then((r) => unwrapList<any>(r.data)),
  getOnboardingBatch: (idOrBatchNo: string | number): Promise<any> =>
    api.get(`/onboarding/batches/${idOrBatchNo}`).then((r) => r.data),
  createOnboardingBatch: (data: { record_type: string; items: any[]; [key: string]: any }): Promise<any> =>
    api.post('/onboarding/batches', data).then((r) => r.data),
  decideOnboardingBatch: (idOrBatchNo: string | number, decision: 'APPROVED' | 'REJECTED' | 'RETURNED', notes_bn?: string): Promise<any> =>
    api.post(`/onboarding/batches/${idOrBatchNo}/decide`, { decision, notes_bn, reason_bn: notes_bn }).then((r) => r.data),
  resubmitOnboardingBatch: (idOrBatchNo: string | number, data: { items: any[]; notes_bn?: string }): Promise<any> =>
    api.post(`/onboarding/batches/${idOrBatchNo}/resubmit`, data).then((r) => r.data),

  // Appellate Review Mirror & Legal Roles (Tier C Section 8.8)
  listAppeals: (params?: { status?: string }): Promise<any[]> =>
    api.get('/appeals', { params }).then((r) => unwrapList<any>(r.data)),
  getAppeal: (idOrCode: string | number): Promise<any> =>
    api.get(`/appeals/${idOrCode}`).then((r) => r.data),
  createAppeal: (data: { mutation_id?: number; plot_id?: number; appellant_name_bn?: string; appellant_nid?: string; reason_bn: string }): Promise<any> =>
    api.post('/appeals', data).then((r) => r.data),
  decideAppeal: (idOrCode: string | number, dataOrStatus: string | { status: string; decision_note_bn: string }, note?: string): Promise<any> => {
    const payload = typeof dataOrStatus === 'string' ? { status: dataOrStatus, decision_note_bn: note || '' } : dataOrStatus;
    return api.post(`/appeals/${idOrCode}/decide`, payload).then((r) => r.data);
  },
  // Provider Boundary Methods (SMS Outbox, Counter Biometrics, Simulated Payments)
  listSmsOutbox: (params?: { limit?: number; phone?: string }): Promise<{ status: number; items: any[]; count: number; environment: string }> =>
    api.get('/admin/dev/outbox', { params }).then((r) => r.data),
  createBiometricSession: (data: {
    party_type: 'SELLER' | 'BUYER' | 'HEIR';
    national_id: string;
    terminal_id?: string;
    transfer_id?: number;
  }): Promise<{ session_id: string; challenge_nonce: string; expires_at: string; terminal_id: string; party_type: string }> =>
    api.post('/biometrics/session', data).then((r) => r.data),
  verifyBiometrics: (data: {
    session_id: string;
    presentation_token: string;
    override_reason?: string;
    supervisor_user_id?: number;
  }): Promise<{ verified: boolean; score: number; match_status: string; attempts_count: number; session_id: string; message_bn: string; message_en: string }> =>
    api.post('/biometrics/verify', data).then((r) => r.data),
  initiatePayment: (data: {
    payable_type: string;
    payable_id: string | number;
    amount_bdt: number;
    payer_phone?: string;
    gateway_method?: 'BKASH' | 'NAGAD' | 'ROCKET' | 'EKPAY';
  }): Promise<{ payment_id: string; redirect_url: string; amount_bdt: number; expires_at: string }> =>
    api.post('/payments/initiate', data).then((r) => r.data),
  verifyPayment: (paymentId: string): Promise<{ payment_id: string; status: string; transaction_trx_id: string; amount_bdt: number; receipt_no: string; paid_at: string }> =>
    api.post(`/payments/verify/${encodeURIComponent(paymentId)}`).then((r) => r.data),

  // Address & Hierarchy CRUD (Division -> District -> Upazila -> Mouza)
  getHierarchyTree: (): Promise<HierarchyDivisionItem[]> =>
    api.get('/hierarchy/tree').then((r) => r.data.tree || r.data.items || (Array.isArray(r.data) ? r.data : [])),
  getHierarchyDivisions: (): Promise<any[]> =>
    api.get('/hierarchy/divisions').then((r) => r.data.items || r.data || []),
  getHierarchyDistricts: (division_bn?: string): Promise<any[]> =>
    api.get('/hierarchy/districts', { params: division_bn ? { division_bn } : {} }).then((r) => r.data.items || r.data || []),
  getHierarchyUpazilas: (division_bn?: string, district_bn?: string): Promise<any[]> =>
    api.get('/hierarchy/upazilas', { params: { division_bn, district_bn } }).then((r) => r.data.items || r.data || []),
  getHierarchyMouzas: (division_bn?: string, district_bn?: string, upazila_bn?: string): Promise<any[]> =>
    api.get('/hierarchy/mouzas', { params: { division_bn, district_bn, upazila_bn } }).then((r) => r.data.items || r.data || []),
  createHierarchyMouza: (data: {
    division_bn: string;
    division_en?: string;
    district_bn: string;
    district_en?: string;
    upazila_bn: string;
    upazila_en?: string;
    mouza_bn: string;
    mouza_en?: string;
    jl_no: string;
    latitude?: number;
    longitude?: number;
  }): Promise<{ message_bn: string; message_en: string; item: any }> =>
    api.post('/admin/hierarchy/mouza', data).then((r) => r.data),
  updateHierarchyMouza: (
    id: number,
    data: {
      division_bn: string;
      division_en?: string;
      district_bn: string;
      district_en?: string;
      upazila_bn: string;
      upazila_en?: string;
      mouza_bn: string;
      mouza_en?: string;
      jl_no: string;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<{ message_bn: string; message_en: string; item: any }> =>
    api.put(`/admin/hierarchy/mouza/${id}`, data).then((r) => r.data),
  deleteHierarchyMouza: (id: number): Promise<{ message_bn: string; message_en: string }> =>
    api.delete(`/admin/hierarchy/mouza/${id}`).then((r) => r.data),
  renameHierarchyTier: (data: {
    tier: 'DIVISION' | 'DISTRICT' | 'UPAZILA';
    old_bn: string;
    new_bn: string;
    new_en?: string;
  }): Promise<{ message_bn: string; message_en: string; updated_count: number }> =>
    api.post('/admin/hierarchy/rename', data).then((r) => r.data),

  // Super Admin Deed Ledger & Actionable Supervision Endpoints
  listAdminDeeds: (params?: {
    q?: string;
    status?: string;
    deed_type?: string;
    division_bn?: string;
    district_bn?: string;
    upazila_bn?: string;
    mouza_id?: number | string;
    date_from?: string;
    date_to?: string;
    page?: number;
    per_page?: number;
  }): Promise<AdminDeedsResponse> =>
    api.get('/admin/deeds', { params }).then((r) => r.data),
  getAdminDeedDetail: (id: number): Promise<AdminDeedDetailResponse> =>
    api.get(`/admin/deeds/${id}`).then((r) => r.data),
  flagAdminDeed: (
    id: number,
    data: { action: 'HOLD' | 'CLEAR'; flag_reason_bn: string }
  ): Promise<{ message_bn: string; message_en: string; deed_id: number; is_flagged_admin: number }> =>
    api.post(`/admin/deeds/${id}/flag`, data).then((r) => r.data),

  // Super Admin Power Tools
  toggleAdminPlotFreeze: (
    plotId: number,
    data: { is_frozen: boolean; reason?: string }
  ): Promise<TogglePlotFreezeResponse> =>
    api.post(`/admin/plots/${plotId}/toggle-freeze`, data).then((r) => r.data),

  getLiveAnomalies: (): Promise<AdminAnomaliesResponse> =>
    api.get('/admin/anomalies').then((r) => r.data),

  transferOfficer: (
    userId: number,
    data: { new_office_id: number; transfer_order_ref?: string; notes?: string }
  ): Promise<TransferOfficerResponse> =>
    api.post(`/admin/users/${userId}/transfer-office`, data).then((r) => r.data),

  getEmergencyBroadcast: (): Promise<EmergencyBroadcastState> =>
    api.get('/system/broadcast').then((r) => r.data),

  updateEmergencyBroadcast: (
    data: { is_active: boolean; message_bn: string; message_en: string; level: 'URGENT' | 'WARNING' | 'INFO' }
  ): Promise<EmergencyBroadcastState & { message_bn: string; message_en: string }> =>
    api.post('/admin/system/broadcast', data).then((r) => r.data),

  exportDatabaseBackup: (): Promise<DatabaseBackupResponse> =>
    api.get('/admin/database/backup').then((r) => r.data),

  runLedgerHealthCheck: (): Promise<LedgerHealthCheckResponse> =>
    api.post('/admin/ledger/health-check').then((r) => r.data),

  // Super Admin Workspace Endpoints
  getSuperAdminDashboardStats: (): Promise<{
    status: number;
    counts: Record<string, number>;
    queues: Record<string, { label_bn: string; count: number; items: any[] }>;
    timestamp: string;
  }> =>
    api.get('/admin/dashboard-stats').then((r) => r.data),

  reassignTransfer: (
    transferId: number,
    data: {
      assigned_to_user_id?: number;
      assigned_to_name?: string;
      assigned_office_id?: number;
      assigned_office_bn?: string;
      reason_bn?: string;
    }
  ): Promise<{ status: number; message_bn: string; message_en: string; assigned_to_name: string; assigned_office_bn: string }> =>
    api.post(`/admin/transfers/${transferId}/reassign`, data).then((r) => r.data),

  requestTransferCorrection: (
    transferId: number,
    data: { reason_bn: string }
  ): Promise<{ status: number; message_bn: string; message_en: string; correction_notes_bn: string }> =>
    api.post(`/admin/transfers/${transferId}/correction-request`, data).then((r) => r.data),

  performAdminOverride: (data: {
    target_type: string;
    target_id: string;
    reason_bn: string;
    evidence_reference: string;
    confirmation: boolean;
  }): Promise<{ status: number; message_bn: string; message_en: string; target_type: string; target_id: string; before_state: any; after_state: any }> =>
    api.post('/admin/override-action', data).then((r) => r.data),

  listAcquisitionCases: (params?: {
    q?: string;
    status?: string;
    district?: string;
    upazila?: string;
  }): Promise<{ status: number; items: any[]; total: number }> =>
    api.get('/admin/acquisition/cases', { params }).then((r) => r.data),

  createAcquisitionCase: (data: any): Promise<{ status: number; message_bn: string; id: number; case_no: string }> =>
    api.post('/admin/acquisition/cases', data).then((r) => r.data),

  retryFailedDeliveries: (data?: { limit?: number }): Promise<{ status: number; retried_count: number; message_bn: string; message_en: string }> =>
    api.post('/admin/integrations/retry', data || {}).then((r) => r.data),

  // National Office Lifecycle & Scope Management (Phase B)
  listSetupOffices: (): Promise<{ offices: any[]; roles: any; valid_office_types: string[] }> =>
    api.get('/admin/setup/offices').then((r) => r.data),

  getSetupOffice: (id: number): Promise<{ office: any; staff: any[] }> =>
    api.get(`/admin/setup/offices/${id}`).then((r) => r.data),

  createSetupOffice: (data: any): Promise<{ status: number; message_bn: string; office: any }> =>
    api.post('/admin/setup/offices', data).then((r) => r.data),

  updateSetupOffice: (id: number, data: any): Promise<{ status: number; message_bn: string; office: any }> =>
    api.put(`/admin/setup/offices/${id}`, data).then((r) => r.data),

  toggleSetupOfficeActive: (id: number): Promise<{ status: number; is_active: number; message_bn: string }> =>
    api.post(`/admin/setup/offices/${id}/toggle-active`).then((r) => r.data),

  // Genuine Biometric & Identity Readiness (Phase D)
  getIdentityReadiness: (): Promise<any> =>
    api.get('/identity/readiness').then((r) => r.data),
};



