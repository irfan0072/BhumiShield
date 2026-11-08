/**
 * Shared types and small helpers for the AC Land / Upazila Land Office workspace sections.
 * The container (pages/AcLandPage.tsx) loads all data once and passes it down.
 */
import React from 'react';
import { useAppUI } from '@/i18n';
import { toBanglaDigits } from '@/theme/tokens';
import { StatusBadge, StatusCode, Tone } from '@/components/admin/kit';

export type AcLandTabId =
  | 'overview'
  | 'mutations'
  | 'khatians'
  | 'disputes'
  | 'field_reports'
  | 'survey_batches'
  | 'sla_overview'
  | 'appeals'
  | 'onboarding'
  | 'explorer'
  | 'verifier';

export const AC_LAND_TABS: AcLandTabId[] = [
  'overview',
  'mutations',
  'khatians',
  'disputes',
  'field_reports',
  'survey_batches',
  'sla_overview',
  'appeals',
  'onboarding',
  'explorer',
  'verifier',
];

export interface AcLandData {
  mutations: any[];
  flaggedKhatians: any[];
  disputes: any[];
  plots: any[];
  batches: any[];
  appeals: any[];
  fieldReports: any[];
  slaDispatches: any[];
}

export const EMPTY_DATA: AcLandData = {
  mutations: [],
  flaggedKhatians: [],
  disputes: [],
  plots: [],
  batches: [],
  appeals: [],
  fieldReports: [],
  slaDispatches: [],
};

/** Request from the dashboard to open something inside a section. */
export interface AcLandIntent {
  tab: AcLandTabId;
  /** open the section's create form */
  create?: boolean;
  /** preselect a plot in the create form */
  plotId?: number;
  /** open the detail sheet of this record (id) */
  recordId?: number | string;
  nonce: number;
}

export interface SectionProps {
  data: AcLandData;
  loaded: boolean;
  reload: () => Promise<void>;
  intent: AcLandIntent | null;
  clearIntent: () => void;
}

/** Runs `fn` once when an intent for `tab` arrives, then clears it. */
export const useSectionIntent = (
  tab: AcLandTabId,
  intent: AcLandIntent | null,
  clearIntent: () => void,
  ready: boolean,
  fn: (i: AcLandIntent) => void
) => {
  const ref = React.useRef(fn);
  ref.current = fn;
  React.useEffect(() => {
    if (!intent || intent.tab !== tab || !ready) return;
    ref.current(intent);
    clearIntent();
  }, [intent, tab, ready, clearIntent]);
};

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

export const isAdminRole = (role: string) => role === 'admin' || role === 'system_admin';
/** POST /mutations/{id}/decide authorizes ac_land only. */
export const canDecideMutation = (role: string) => role === 'ac_land';
/** POST /acland/khatians/{id}/reconcile authorizes ac_land only (Rule M3: admin cannot edit land data). */
export const canReconcile = (role: string) => role === 'ac_land';
/** POST /acland/disputes/{id}/resolve authorizes ac_land and admin. */
export const canResolveDispute = (role: string) => role === 'ac_land' || role === 'admin';
/** POST /field-reports authors. */
export const canFileFieldReport = (role: string) =>
  ['field_verification_officer', 'ac_land', 'admin', 'system_admin'].includes(role);
/** POST /sla-dispatches authors. */
export const canSendSla = (role: string) => ['uno_supervisor', 'ac_land', 'admin', 'system_admin'].includes(role);
/** POST /onboarding/batches (maker) — limited to survey makers on this page. */
export const canMakeBatch = (role: string) => ['settlement_records_officer', 'admin', 'system_admin'].includes(role);
/** POST /onboarding/batches/{id}/decide (checker). */
export const canCheckBatch = (role: string) => ['ac_land', 'settlement_checker', 'admin', 'system_admin'].includes(role);
/** POST /onboarding/batches/{id}/resubmit. */
export const canResubmitBatch = (role: string) =>
  ['land_office_assistant', 'settlement_records_officer', 'admin', 'system_admin'].includes(role);

/* ------------------------------------------------------------------ */
/* Status helpers                                                      */
/* ------------------------------------------------------------------ */

export const up = (v: any) => String(v || '').toUpperCase();
export const isPendingMutation = (m: any) => up(m.status) === 'PENDING';
export const isOpenDispute = (d: any) => ['OPEN', 'PENDING_REVIEW', 'HEARING', ''].includes(up(d.status));
export const isPendingAppeal = (a: any) => !a.decided_at && ['PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'HEARING', 'OPEN', ''].includes(up(a.status));
export const daysSince = (iso?: string) => {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? Math.floor((Date.now() - t) / 86400000) : 0;
};
/** Citizen charter: mutation must be decided in 28 days. */
export const isOverdueMutation = (m: any) => isPendingMutation(m) && daysSince(m.created_at) > 28;

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export const useFmt = () => {
  const { lang, t } = useAppUI();
  const n = (v: any) => (v === undefined || v === null || v === '' ? '—' : toBanglaDigits(v, lang));
  const date = (v: any) => (v ? toBanglaDigits(String(v).slice(0, 10), lang) : '—');
  const name = (bn?: string, en?: string) => (lang === 'bn' ? bn || en : en || bn) || '—';
  const dec = (v: any) => (v === undefined || v === null || v === '' ? '—' : `${toBanglaDigits(v, lang)} ${t('শতক', 'dec')}`);
  return { lang, t, n, date, name, dec };
};

type Pair = [string, string];
const label = (map: Record<string, Pair>, code: any, lang: 'bn' | 'en') => {
  const hit = map[up(code)];
  return hit ? (lang === 'bn' ? hit[0] : hit[1]) : String(code || '—').replace(/_/g, ' ').toLowerCase();
};

export const POSSESSION: Record<string, Pair> = {
  VERIFIED: ['দখল নিশ্চিত', 'Verified'],
  CONTESTED: ['দখল বিতর্কিত', 'Contested'],
  UNOCCUPIED: ['পতিত', 'Unoccupied'],
  POSSESSED_BY_OWNER: ['মালিকের দখলে', 'With owner'],
  PARTIAL_DISPUTE: ['আংশিক বিরোধ', 'Partly disputed'],
  ENCROACHED: ['বেদখল', 'Encroached'],
};
export const BOUNDARY: Record<string, Pair> = {
  MATCHED: ['নকশা মিলেছে', 'Matched'],
  INTACT: ['সীমানা ঠিক', 'Intact'],
  DISPUTED: ['সীমানা বিরোধ', 'Disputed'],
  ENCROACHED_NORTH: ['উত্তরে বেদখল', 'Encroached north'],
  ENCROACHED: ['বেদখল', 'Encroached'],
};
export const TAX: Record<string, Pair> = {
  PAID: ['পরিশোধিত', 'Paid'],
  PAID_UP_TO_2026: ['পরিশোধিত', 'Paid'],
  DUE: ['বকেয়া', 'Due'],
  PARTIAL_DUE: ['আংশিক বকেয়া', 'Partly due'],
  NOT_VERIFIED: ['যাচাই হয়নি', 'Not checked'],
};
export const PRIORITY: Record<string, Pair> = {
  LOW: ['সাধারণ', 'Low'],
  NORMAL: ['স্বাভাবিক', 'Normal'],
  HIGH: ['জরুরি', 'High'],
  URGENT: ['অতি জরুরি', 'Urgent'],
};
export const ROLE_LABEL: Record<string, Pair> = {
  LAND_OFFICE_ASSISTANT: ['ভূমি সহকারী', 'Land assistant'],
  FIELD_VERIFICATION_OFFICER: ['সার্ভেয়ার', 'Surveyor'],
  AC_LAND: ['এসি ল্যান্ড', 'AC Land'],
  SUB_REGISTRAR: ['সাব-রেজিস্ট্রার', 'Sub-registrar'],
  SETTLEMENT_RECORDS_OFFICER: ['জরিপ কর্মকর্তা', 'Survey officer'],
  SETTLEMENT_CHECKER: ['জরিপ যাচাইকারী', 'Survey checker'],
};
export const DISPUTE_TYPE: Record<string, Pair> = {
  OWNERSHIP_OBJECTION: ['মালিকানা আপত্তি', 'Ownership'],
  BOUNDARY: ['সীমানা', 'Boundary'],
  BOUNDARY_DISPUTE: ['সীমানা', 'Boundary'],
  INHERITANCE: ['উত্তরাধিকার', 'Inheritance'],
  HEIR_DISPUTE: ['উত্তরাধিকার', 'Inheritance'],
  COURT_CASE: ['আদালতে মামলা', 'Court case'],
  FRAUD: ['জালিয়াতি', 'Fraud'],
};

export const codeLabel = (map: Record<string, Pair>, code: any, lang: 'bn' | 'en') => label(map, code, lang);

const priorityTone: Record<string, Tone> = { LOW: 'slate', NORMAL: 'blue', HIGH: 'amber', URGENT: 'red' };
export const PriorityBadge: React.FC<{ code?: string }> = ({ code }) => {
  const { lang } = useAppUI();
  const c = up(code) || 'NORMAL';
  return <StatusBadge tone={priorityTone[c] || 'slate'}>{label(PRIORITY, c, lang)}</StatusBadge>;
};

/** Onboarding batch status (adds RETURNED, which the kit map does not know). */
export const BatchStatus: React.FC<{ code?: string }> = ({ code }) => {
  const { lang, t } = useAppUI();
  const c = up(code);
  if (c === 'RETURNED') return <StatusBadge tone="amber">{t('ফেরত', 'Returned')}</StatusBadge>;
  if (c === 'SUBMITTED') return <StatusBadge tone="amber">{t('যাচাই বাকি', 'Waiting check')}</StatusBadge>;
  return <StatusCode code={c} lang={lang} />;
};

export const DisputeStatus: React.FC<{ code?: string }> = ({ code }) => {
  const { lang, t } = useAppUI();
  const c = up(code);
  if (c === 'UPHELD_FROZEN') return <StatusBadge tone="red">{t('বিক্রয় স্থগিত', 'Sale frozen')}</StatusBadge>;
  if (c === 'PENDING_REVIEW' || c === 'OPEN' || !c) return <StatusBadge tone="amber">{t('বিচারাধীন', 'Open')}</StatusBadge>;
  return <StatusCode code={c} lang={lang} />;
};

export const SlaStatus: React.FC<{ code?: string }> = ({ code }) => {
  const { lang, t } = useAppUI();
  const c = up(code);
  if (c === 'SENT') return <StatusBadge tone="blue">{t('পাঠানো', 'Sent')}</StatusBadge>;
  if (c === 'ACKNOWLEDGED') return <StatusBadge tone="green">{t('গৃহীত', 'Acknowledged')}</StatusBadge>;
  return <StatusCode code={c} lang={lang} />;
};

export const textareaCls =
  'min-h-0 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-[#006A4E] focus:ring-2 focus:ring-[#006A4E]/15';

/** One short muted line shown where an action is blocked for the current role. */
export const BlockedNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs text-slate-500">{children}</p>
);
