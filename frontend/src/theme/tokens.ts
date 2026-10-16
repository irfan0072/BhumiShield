export const THEME = {
  ink: '#062823',
  inkDeep: '#041A1C',
  teal: '#0D6B5C',
  tealHover: '#0A5549',
  leaf: '#7CDB6A',
  seal: '#FF3B4A',
  warn: '#C4891A',
  fog: '#EDF4F1',
  mist: '#F5FAF8',
  textMain: '#0A1F1C',
  textMuted: '#5F7A74',
  // legacy aliases used by older call sites
  flagGreen: '#0D6B5C',
  flagGreenLight: '#E6F2EE',
  flagRed: '#FF3B4A',
  flagRedLight: '#FFE8EA',
  amberWarn: '#C4891A',
  amberLight: '#FEF3C7',
  bgPage: '#EDF4F1',
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
