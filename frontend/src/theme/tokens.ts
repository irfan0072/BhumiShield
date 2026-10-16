export const THEME = {
  flagGreen: '#006A4E',
  flagGreenLight: '#E6F2EE',
  flagRed: '#F42A41',
  flagRedLight: '#FEECEE',
  amberWarn: '#B7791F',
  amberLight: '#FEF3C7',
  bgPage: '#FAFBFA',
  textMain: '#1A1A1A',
  textMuted: '#5F6B66',
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
