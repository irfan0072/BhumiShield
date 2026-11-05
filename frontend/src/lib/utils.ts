import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Standard shadcn/ui class name combiner
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts English digits to Bengali numerals if language is 'bn'
 */
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
