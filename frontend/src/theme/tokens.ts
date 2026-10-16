/**
 * Bangladesh National Flag Design System Tokens & Bangla Numeral Helpers
 *
 * Primary: Flag Green #006A4E (light tint #E6F2EE)
 * Accent: Flag Red #F42A41 (used sparingly for logo disc, high-risk states, destructive actions)
 * Warning: Amber #B7791F
 * Neutral: Off-white #FAFBFA background, #1A1A1A primary text, #5F6B66 secondary text
 */

export const THEME_COLORS = {
  flagGreen: '#006A4E',
  flagGreenLight: '#E6F2EE',
  flagRed: '#F42A41',
  flagRedLight: '#FEECEE',
  amberWarn: '#B7791F',
  amberLight: '#FEF6E7',
  bgNeutral: '#FAFBFA',
  textPrimary: '#1A1A1A',
  textSecondary: '#5F6B66',
} as const;

const EN_TO_BN_MAP: Record<string, string> = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
};

export function formatNum(value: number | string | undefined | null, lang: 'bn' | 'en'): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (lang === 'en') return str;
  return str.replace(/[0-9]/g, (d) => EN_TO_BN_MAP[d] ?? d);
}

export function formatCurrency(amountBdt: number, lang: 'bn' | 'en'): string {
  const formatted = Number(amountBdt || 0).toLocaleString('en-IN');
  return lang === 'bn' ? `৳${formatNum(formatted, 'bn')}` : `BDT ${formatted}`;
}

export function getVerdictStyle(verdict: string) {
  if (verdict === 'SAFE') {
    return {
      bg: 'bg-[#006A4E]',
      softBg: 'bg-[#E6F2EE]',
      border: 'border-[#006A4E]',
      text: 'text-[#006A4E]',
      iconSymbol: '✔',
      labelBn: '✔ সত্যায়িত / নিরাপদ',
      labelEn: '✔ Verified / Safe',
    };
  }
  if (verdict === 'REVIEW') {
    return {
      bg: 'bg-[#B7791F]',
      softBg: 'bg-[#FEF6E7]',
      border: 'border-[#B7791F]',
      text: 'text-[#8C580C]',
      iconSymbol: '⚠',
      labelBn: '⚠ সতর্কতা (যাচাই প্রয়োজন)',
      labelEn: '⚠ Warning (Needs Review)',
    };
  }
  return {
    bg: 'bg-[#F42A41]',
    softBg: 'bg-[#FEECEE]',
    border: 'border-[#F42A41]',
    text: 'text-[#C81E32]',
    iconSymbol: '✖',
    labelBn: '✖ ঝুঁকিপূর্ণ / আটকানো',
    labelEn: '✖ High Risk / Blocked',
  };
}
