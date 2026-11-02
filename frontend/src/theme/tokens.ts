export const THEME = {
  ink: '#074f38',
  inkDeep: '#053b2a',
  teal: '#006A4E',
  tealHover: '#00553e',
  brandGreen: '#006A4E',
  brandGreenHover: '#00553e',
  brandDark: '#074f38',
  brandLight: '#EDF7F4',
  leaf: '#10B981',
  seal: '#FF3B4A',
  warn: '#C4891A',
  fog: '#F8FAF9',
  mist: '#FFFFFF',
  textMain: '#0A1F1C',
  textMuted: '#4B6761', // WCAG AA compliant (5.8:1 on white, 5.4:1 on brandLight)
  // legacy aliases mapped to canonical palette
  flagGreen: '#006A4E',
  flagGreenLight: '#EDF7F4',
  flagRed: '#FF3B4A',
  flagRedLight: '#FFE8EA',
  amberWarn: '#C4891A',
  amberLight: '#FEF3C7',
  bgPage: '#F8FAF9',
};

export function toBanglaDigits(input: string | number, lang: 'bn' | 'en' = 'bn'): string {
  const str = String(input);
  if (lang === 'en') return str;
  const bnMap: Record<string, string> = {
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
  return str.replace(/[0-9]/g, (d) => bnMap[d] || d);
}

export function maskNid(nid?: string | number | null, lang: 'bn' | 'en' = 'bn'): string {
  if (!nid) return '••••';
  const str = String(nid).trim();
  if (str.length <= 4) return str;
  const last4 = str.slice(-4);
  const maskedPrefix = '••••••••';
  const masked = `${maskedPrefix}${last4}`;
  return toBanglaDigits(masked, lang);
}

export function maskPhone(phone?: string | number | null, lang: 'bn' | 'en' = 'bn'): string {
  if (!phone) return '••••';
  const str = String(phone).trim();
  if (str.length < 7) return str;
  const prefix = str.slice(0, 3);
  const suffix = str.slice(-4);
  const masked = `${prefix}****${suffix}`;
  return toBanglaDigits(masked, lang);
}
