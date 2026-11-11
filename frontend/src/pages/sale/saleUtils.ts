import { toBanglaDigits } from '../../theme/tokens';

/** Row returned by GET /listings (listings JOIN plots JOIN locations). */
export interface ListingItem {
  id: number;
  listing_code: string;
  plot_id: number;
  plot_code?: string;
  dag_no: string;
  dag_no_bn?: string;
  land_type_bn?: string;
  land_type_en?: string;
  district_bn: string;
  district_en?: string;
  upazila_bn: string;
  upazila_en?: string;
  mouza_bn: string;
  mouza_en?: string;
  asking_price_bdt: number;
  area_decimal: number;
  description_bn?: string;
  description_en?: string;
  verification_badge?: string;
  co_owner_consent_confirmed?: number;
  seller_nid_masked?: string;
  created_at?: string;
}

export const isVerified = (l: ListingItem) => String(l.verification_badge || '').toUpperCase().startsWith('VERIFIED');

/** Full taka amount with South-Asian grouping: ৳ ৪৫,০০,০০০ */
export const takaFull = (v: number, lang: 'bn' | 'en') =>
  `৳ ${toBanglaDigits(Math.round(Number(v) || 0).toLocaleString('en-IN'), lang)}`;

/** Short amount for cards: ৳ ৪৫ লাখ / ৳ ১.২ কোটি */
export const takaShort = (v: number, lang: 'bn' | 'en') => {
  const n = Number(v) || 0;
  const fmt = (x: number) => toBanglaDigits(String(Number(x.toFixed(x >= 10 ? 0 : 1))), lang);
  if (n >= 10_000_000) return `৳ ${fmt(n / 10_000_000)} ${lang === 'bn' ? 'কোটি' : 'crore'}`;
  if (n >= 100_000) return `৳ ${fmt(n / 100_000)} ${lang === 'bn' ? 'লাখ' : 'lakh'}`;
  return takaFull(n, lang);
};

/** Price ranges for the filter (sent to the API as min_price / max_price). */
export const PRICE_RANGES: Array<{ id: string; bn: string; en: string; min?: number; max?: number }> = [
  { id: 'u10', bn: '১০ লাখের কম', en: 'Under 10 lakh', max: 1_000_000 },
  { id: '10-25', bn: '১০–২৫ লাখ', en: '10–25 lakh', min: 1_000_000, max: 2_500_000 },
  { id: '25-50', bn: '২৫–৫০ লাখ', en: '25–50 lakh', min: 2_500_000, max: 5_000_000 },
  { id: 'o50', bn: '৫০ লাখের বেশি', en: 'Over 50 lakh', min: 5_000_000 },
];
