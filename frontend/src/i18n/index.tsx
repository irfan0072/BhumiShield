import React, { createContext, useContext, useEffect, useState } from 'react';
import { formatNum } from '../theme/tokens';

export type Language = 'bn' | 'en';
export type FontScale = 'normal' | 'large' | 'xlarge';

interface I18nContextType {
  lang: Language;
  setLang: (l: Language) => void;
  toggleLang: () => void;
  fontScale: FontScale;
  stepFontSize: (dir: 1 | -1) => void;
  highContrast: boolean;
  toggleHighContrast: () => void;
  t: (bnText: string, enText: string) => string;
  n: (val: number | string | undefined | null) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const SCALES: FontScale[] = ['normal', 'large', 'xlarge'];

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('bhumishield_lang');
    return saved === 'en' ? 'en' : 'bn';
  });

  const [fontScale, setFontScale] = useState<FontScale>(() => {
    const saved = localStorage.getItem('bhumishield_font_scale') as FontScale;
    return SCALES.includes(saved) ? saved : 'normal';
  });

  const [highContrast, setHighContrast] = useState<boolean>(() => {
    return localStorage.getItem('bhumishield_hc') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('bhumishield_lang', lang);
    document.documentElement.lang = lang === 'bn' ? 'bn-BD' : 'en';
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('bhumishield_font_scale', fontScale);
    document.documentElement.setAttribute('data-font-scale', fontScale);
  }, [fontScale]);

  useEffect(() => {
    localStorage.setItem('bhumishield_hc', String(highContrast));
    document.documentElement.setAttribute('data-high-contrast', String(highContrast));
  }, [highContrast]);

  const setLang = (l: Language) => setLangState(l);
  const toggleLang = () => setLangState((prev) => (prev === 'bn' ? 'en' : 'bn'));

  const stepFontSize = (dir: 1 | -1) => {
    setFontScale((prev) => {
      const idx = SCALES.indexOf(prev);
      const nextIdx = Math.min(SCALES.length - 1, Math.max(0, idx + dir));
      return SCALES[nextIdx];
    });
  };

  const toggleHighContrast = () => setHighContrast((prev) => !prev);

  const t = (bnText: string, enText: string) => (lang === 'bn' ? bnText : enText);
  const n = (val: number | string | undefined | null) => formatNum(val, lang);

  return (
    <I18nContext.Provider
      value={{
        lang,
        setLang,
        toggleLang,
        fontScale,
        stepFontSize,
        highContrast,
        toggleHighContrast,
        t,
        n,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
