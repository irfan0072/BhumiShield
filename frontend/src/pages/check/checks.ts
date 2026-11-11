import type { Finding, RiskReportResponse } from '../../api/client';

/**
 * The checks the backend fraud engine runs for a public "check before buy"
 * request (backend/app/Services/FraudRulesEngine.php). A rule that does not
 * appear in report.findings passed. NID_MISMATCH is left out because the
 * public form does not send a seller NID, so that rule never runs here.
 */
export const CHECK_RULES: Array<{ code: string; okBn: string; okEn: string; badBn: string; badEn: string }> = [
  { code: 'SELLER_NOT_OWNER', okBn: 'বিক্রেতাই মালিক', okEn: 'Seller is the owner', badBn: 'বিক্রেতা মালিক নন', badEn: 'Seller is not the owner' },
  { code: 'AREA_EXCEEDS_OWNED', okBn: 'জমির পরিমাণ ঠিক', okEn: 'Area is within share', badBn: 'অংশের বেশি জমি', badEn: 'More than the share' },
  { code: 'DOUBLE_SALE', okBn: 'আগে বিক্রি হয়নি', okEn: 'Not sold before', badBn: 'আগেই বিক্রি হয়েছে', badEn: 'Already sold' },
  { code: 'PLOT_MORTGAGED', okBn: 'ব্যাংক বন্ধক নেই', okEn: 'No bank mortgage', badBn: 'ব্যাংকে বন্ধক আছে', badEn: 'Mortgaged to a bank' },
  { code: 'ACTIVE_DISPUTE', okBn: 'অভিযোগ নেই', okEn: 'No open dispute', badBn: 'অভিযোগ চলছে', badEn: 'Open dispute' },
  { code: 'PLOT_TRANSFER_FROZEN', okBn: 'স্থগিতাদেশ নেই', okEn: 'No court freeze', badBn: 'হস্তান্তর স্থগিত', badEn: 'Transfer frozen' },
  { code: 'OWNER_SALE_LOCKED', okBn: 'বিক্রয় লক নেই', okEn: 'No sale lock', badBn: 'মালিক লক করেছেন', badEn: 'Locked by owner' },
  { code: 'KHATIAN_CHAIN_BREAK', okBn: 'খতিয়ান ধারা ঠিক', okEn: 'Records match', badBn: 'খতিয়ানে গরমিল', badEn: 'Record chain broken' },
  { code: 'DEED_TAMPERED', okBn: 'দলিল অক্ষত', okEn: 'Deeds intact', badBn: 'দলিল বদলানো', badEn: 'Deed tampered' },
  { code: 'INHERITANCE_UNRESOLVED', okBn: 'ওয়ারিশ মীমাংসিত', okEn: 'Inheritance settled', badBn: 'ওয়ারিশ বাকি', badEn: 'Inheritance pending' },
  { code: 'RAPID_RESALE', okBn: 'ঘন ঘন বিক্রি নয়', okEn: 'No quick resale', badBn: 'ঘন ঘন বিক্রি', badEn: 'Quick resale' },
];

export type CheckItem = {
  code: string;
  ok: boolean;
  severity: Finding['severity'] | 'SAFE';
  bn: string;
  en: string;
  finding?: Finding;
};

/** Build the pass/fail checklist from a report. Unknown findings are added at the end as failed. */
export function buildChecklist(report: RiskReportResponse): CheckItem[] {
  const findings = (report.findings || []).filter((f) => f && f.severity !== 'SAFE');
  const byCode = new Map(findings.map((f) => [String(f.rule_code || '').toUpperCase(), f]));
  const known = new Set(CHECK_RULES.map((r) => r.code));

  // A fail-closed report from the client (no data / unknown status) means nothing was really checked.
  const failClosed = findings.some((f) => !known.has(String(f.rule_code || '').toUpperCase()));

  const items: CheckItem[] = failClosed
    ? []
    : CHECK_RULES.map((r) => {
        const f = byCode.get(r.code);
        return {
          code: r.code,
          ok: !f,
          severity: f ? f.severity : 'SAFE',
          bn: f ? r.badBn : r.okBn,
          en: f ? r.badEn : r.okEn,
          finding: f,
        };
      });

  findings
    .filter((f) => !known.has(String(f.rule_code || '').toUpperCase()))
    .forEach((f) =>
      items.push({
        code: f.rule_code,
        ok: false,
        severity: f.severity,
        bn: f.title_bn,
        en: f.title_en,
        finding: f,
      })
    );

  // Problems first, then passed checks.
  return items.sort((a, b) => Number(a.ok) - Number(b.ok));
}

export const VERDICT = {
  SAFE: { bn: 'নিরাপদ', en: 'Safe', color: '#006A4E', soft: 'bg-emerald-50', ring: 'border-emerald-200', text: 'text-[#006A4E]' },
  WARNING: { bn: 'যাচাই দরকার', en: 'Needs checking', color: '#B7791F', soft: 'bg-amber-50', ring: 'border-amber-200', text: 'text-amber-700' },
  HIGH_RISK: { bn: 'ঝুঁকিপূর্ণ', en: 'Risky', color: '#C8102E', soft: 'bg-rose-50', ring: 'border-rose-200', text: 'text-rose-700' },
} as const;

export const SURVEY_BN: Record<string, string> = { CS: 'সিএস', SA: 'এসএ', RS: 'আরএস', BS: 'বিএস' };

/** Bangla digits → Latin, so "১০১" matches "101". */
export const toLatinDigits = (v: string) => v.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));

/** Keep only characters that can appear in a dag number. */
export const cleanDag = (v: string) => toLatinDigits(v).replace(/[^\p{L}\p{N}\-/]/gu, '').trim().slice(0, 12);

/** The API already masks NIDs (e.g. 9900****01); show only the visible tail, never the full number. */
export const nidTail = (nid: string | undefined | null, mask: (v: string) => string, lang: 'bn' | 'en') => {
  const s = String(nid || '').trim();
  if (!s) return '••••';
  if (s.includes('*')) {
    const tail = s.split('*').pop() || '';
    return `••••${lang === 'bn' ? tail.replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]) : tail}`;
  }
  return mask(s);
};
