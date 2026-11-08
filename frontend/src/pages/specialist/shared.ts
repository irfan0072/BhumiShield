import { statusInfo, Tone } from '@/components/admin/kit';
import { toBanglaDigits } from '@/theme/tokens';

export type Lang = 'bn' | 'en';
export type TFn = (bn: string, en: string) => string;

/** Legal sections used by acquisition cases (Acquisition & Requisition of Immovable Property Act 2017). */
export const SECTION_OPTIONS: Array<{ value: string; bn: string; en: string }> = [
  { value: 'SECTION_4', bn: 'ধারা ৪', en: 'Section 4' },
  { value: 'SECTION_7', bn: 'ধারা ৭', en: 'Section 7' },
  { value: 'SECTION_8', bn: 'ধারা ৮', en: 'Section 8' },
  { value: 'SECTION_11', bn: 'ধারা ১১', en: 'Section 11' },
];

export const sectionLabel = (code: string | null | undefined, lang: Lang): string => {
  const hit = SECTION_OPTIONS.find((s) => s.value === String(code || '').toUpperCase());
  if (hit) return lang === 'bn' ? hit.bn : hit.en;
  return code ? String(code).replace(/_/g, ' ') : '—';
};

/** Case stages seen in acquisition_cases.status. Unknown codes fall back to the kit map. */
const CASE_STATUS: Record<string, { tone: Tone; bn: string; en: string }> = {
  PRELIMINARY_NOTICE: { tone: 'blue', bn: 'প্রাথমিক নোটিশ', en: 'Notice' },
  NOTICE_ISSUED: { tone: 'blue', bn: 'নোটিশ জারি', en: 'Notice issued' },
  JOINT_VERIFICATION: { tone: 'amber', bn: 'যৌথ তদন্ত', en: 'Joint survey' },
  HEARING: { tone: 'amber', bn: 'শুনানি', en: 'Hearing' },
  GAZETTE_PUBLISHED: { tone: 'violet', bn: 'গেজেট প্রকাশ', en: 'Gazetted' },
  AWARD_ISSUED: { tone: 'violet', bn: 'রোয়েদাদ', en: 'Award' },
  COMPENSATION_PAID: { tone: 'green', bn: 'ক্ষতিপূরণ প্রদান', en: 'Paid' },
  COMPLETED: { tone: 'green', bn: 'সম্পন্ন', en: 'Completed' },
};

export const STATUS_OPTIONS = ['PRELIMINARY_NOTICE', 'NOTICE_ISSUED', 'JOINT_VERIFICATION', 'GAZETTE_PUBLISHED'];

export const caseStatus = (code: string | null | undefined, lang: Lang): { tone: Tone; label: string } => {
  const hit = CASE_STATUS[String(code || '').toUpperCase()];
  return hit ? { tone: hit.tone, label: lang === 'bn' ? hit.bn : hit.en } : statusInfo(code, lang);
};

/** Cases that are still running (not yet paid/closed). */
export const isOpenCase = (c: any) => !['COMPENSATION_PAID', 'COMPLETED', 'CLOSED'].includes(String(c?.status || '').toUpperCase());

export const DISPUTE_TYPES: Array<{ value: string; bn: string; en: string }> = [
  { value: 'INJUNCTION', bn: 'নিষেধাজ্ঞা', en: 'Injunction' },
  { value: 'TITLE_SUIT', bn: 'স্বত্ব মামলা', en: 'Title suit' },
  { value: 'BOUNDARY_DISPUTE', bn: 'সীমানা বিরোধ', en: 'Boundary' },
  { value: 'OWNERSHIP_CLAIM', bn: 'মালিকানা দাবি', en: 'Ownership claim' },
];

export const disputeTypeLabel = (code: string | null | undefined, lang: Lang): string => {
  const hit = DISPUTE_TYPES.find((d) => d.value === String(code || '').toUpperCase());
  if (hit) return lang === 'bn' ? hit.bn : hit.en;
  return code ? String(code).replace(/_/g, ' ').toLowerCase() : '—';
};

export const isOpenDispute = (d: any) => !['RESOLVED', 'CLOSED', 'DISMISSED'].includes(String(d?.status || '').toUpperCase());

export const num = (v: any): number => {
  const x = parseFloat(v);
  return Number.isFinite(x) ? x : 0;
};

/** "4.50 কোটি" / "4.50 Cr" for BDT amounts. */
export const crore = (bdt: number, lang: Lang): string => {
  if (!bdt) return '—';
  return `${toBanglaDigits((bdt / 1e7).toFixed(2), lang)} ${lang === 'bn' ? 'কোটি' : 'Cr'}`;
};

export const decimal = (v: any, lang: Lang): string => {
  const x = num(v);
  return `${toBanglaDigits(Number.isInteger(x) ? x : x.toFixed(2), lang)} ${lang === 'bn' ? 'শতক' : 'dec'}`;
};

export const plotIdsOf = (c: any): number[] => {
  if (Array.isArray(c?.plot_ids)) return c.plot_ids.map(Number);
  try {
    const v = JSON.parse(c?.plot_ids_json || '[]');
    return Array.isArray(v) ? v.map(Number) : [];
  } catch {
    return [];
  }
};

export const plotLabel = (p: any, lang: Lang): string =>
  p ? `${lang === 'bn' ? 'দাগ' : 'Dag'} ${toBanglaDigits(p.dag_no_bn || p.dag_no || p.id, lang)}` : '—';

export const fmtDate = (v: any, lang: Lang): string => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};
