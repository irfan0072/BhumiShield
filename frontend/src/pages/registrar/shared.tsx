import React from 'react';
import { toBanglaDigits } from '@/theme/tokens';
import { StatusBadge, StatusCode } from '@/components/admin/kit';

export type Lang = 'bn' | 'en';

/** Deed statuses that count as "registered, mutation still due". */
export const PENDING_MUTATION_STATUSES = ['REGISTERED', 'PENDING_MUTATION'];

export const fmtNum = (v: any, lang: Lang) => toBanglaDigits(v ?? '', lang);

export const fmtMoney = (v: any, lang: Lang) => {
  const num = Number(v);
  if (v === null || v === undefined || v === '' || !Number.isFinite(num)) return '—';
  return `৳ ${toBanglaDigits(num.toLocaleString('en-IN'), lang)}`;
};

export const fmtDate = (v: any, lang: Lang) => (v ? toBanglaDigits(String(v).slice(0, 10), lang) : '—');

export const pickName = (lang: Lang, bn?: string, en?: string) => (lang === 'bn' ? bn || en : en || bn) || '—';

/** Status pill for a deed, including MUTATED which the shared map does not know. */
export const DeedStatus: React.FC<{ status?: string; lang: Lang }> = ({ status, lang }) => {
  const s = String(status || '').toUpperCase();
  if (s === 'MUTATED') return <StatusBadge tone="green">{lang === 'bn' ? 'নামজারি সম্পন্ন' : 'Mutated'}</StatusBadge>;
  if (s === 'REGISTERED') return <StatusBadge tone="amber">{lang === 'bn' ? 'নামজারি বাকি' : 'Mutation due'}</StatusBadge>;
  return <StatusCode code={s} lang={lang} />;
};

/** Labels for the onboarding batch record types. */
export const recordTypeLabel = (type: string | undefined, lang: Lang) => {
  const map: Record<string, [string, string]> = {
    DEED_DRAFT: ['দলিল খসড়া', 'Deed draft'],
    KHATIAN_RECONCILIATION: ['খতিয়ান সমন্বয়', 'Khatian fix'],
  };
  const hit = map[String(type || '').toUpperCase()];
  return hit ? (lang === 'bn' ? hit[0] : hit[1]) : String(type || '—').replace(/_/g, ' ').toLowerCase();
};

/** Deed types accepted by the fee calculator (backend expects 'HIBA' for gift deeds). */
export const DEED_TYPES: Array<[string, string, string]> = [
  ['SALE', 'সাফ-কবলা', 'Sale'],
  ['HIBA', 'হেবা', 'Gift'],
  ['MORTGAGE', 'বন্ধক', 'Mortgage'],
  ['PARTITION', 'বণ্টননামা', 'Partition'],
];

export const deedTypeLabel = (code: string, lang: Lang) => {
  const hit = DEED_TYPES.find(([c]) => c === code);
  return hit ? (lang === 'bn' ? hit[1] : hit[2]) : code;
};

/** Values that a deed draft (from the maker) carries into the new-deed wizard. */
export interface DeedDraftPrefill {
  plot_id?: number;
  seller_id?: number;
  buyer_id?: number;
  area_decimal?: number | string;
  share_fraction?: string;
  declared_value_bdt?: number | string;
}

/** The fee lines returned by BhumiApi.calculateFees. */
export const feeLines = (fee: any, t: (bn: string, en: string) => string): Array<[string, number]> => {
  const b = fee?.breakdown || {};
  return [
    [t('স্ট্যাম্প শুল্ক', 'Stamp duty'), Number(b.stamp_duty_bdt || 0)],
    [t('রেজিস্ট্রেশন ফি', 'Registration fee'), Number(b.registration_fee_bdt || 0)],
    [t('স্থানীয় সরকার কর', 'Local govt tax'), Number(b.local_govt_tax_bdt || 0)],
    [t('উৎস কর', 'Source tax'), Number(b.ait_gain_tax_bdt || 0)],
  ];
};
