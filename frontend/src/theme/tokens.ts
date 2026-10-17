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
  textMuted: '#5F7A74',
  // legacy aliases mapped to canonical palette
  flagGreen: '#006A4E',
  flagGreenLight: '#EDF7F4',
  flagRed: '#FF3B4A',
  flagRedLight: '#FFE8EA',
  amberWarn: '#C4891A',
  amberLight: '#FEF3C7',
  bgPage: '#F8FAF9',
};

export function toBanglaDigits(input: string | number, lang: 'bn' | 'en'): string {
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
