import React, { createContext, useContext, useState, useEffect } from 'react';

export type Lang = 'bn' | 'en';
export type FontStep = 0 | 1 | 2; // 18px, 20px, 22px
export type UserRole = 'citizen' | 'sub_registrar' | 'ac_land' | 'bank_officer' | 'admin';

export interface AuthUser {
  id: number;
  username: string;
  full_name_bn: string;
  full_name_en: string;
  role: UserRole;
  nid_mock: string;
  phone_mock: string;
  office_name?: string;
  is_active: number;
}

interface AppUIContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  fontStep: FontStep;
  increaseFont: () => void;
  decreaseFont: () => void;
  highContrast: boolean;
  toggleHighContrast: () => void;
  role: UserRole;
  setRole: (r: UserRole) => void;
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  token: string | null;
  setToken: (t: string | null) => void;
  logout: () => void;
  t: (bn: string, en: string) => string;
}

const AppUIContext = createContext<AppUIContextType | null>(null);

export const AppUIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem('bs_lang') as Lang) || 'bn');
  const [fontStep, setFontStep] = useState<FontStep>(() => Number(localStorage.getItem('bs_font') || 0) as FontStep);
  const [highContrast, setHighContrast] = useState<boolean>(() => localStorage.getItem('bs_hc') === '1');
  const [user, setUserState] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem('bs_user');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  });
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem('bs_token'));
  const [role, setRoleState] = useState<UserRole>(() => {
    const savedUser = localStorage.getItem('bs_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed?.role) return parsed.role as UserRole;
      } catch {}
    }
    return (localStorage.getItem('bs_role') as UserRole) || 'citizen';
  });

  useEffect(() => {
    localStorage.setItem('bs_lang', lang);
    document.documentElement.lang = lang === 'bn' ? 'bn-BD' : 'en';
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('bs_font', String(fontStep));
    const sizes = ['18px', '20px', '22px'];
    document.documentElement.style.setProperty('--base-font-size', sizes[fontStep]);
  }, [fontStep]);

  useEffect(() => {
    localStorage.setItem('bs_hc', highContrast ? '1' : '0');
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrast]);

  const setLang = (l: Lang) => setLangState(l);
  const increaseFont = () => setFontStep((prev) => (prev < 2 ? ((prev + 1) as FontStep) : prev));
  const decreaseFont = () => setFontStep((prev) => (prev > 0 ? ((prev - 1) as FontStep) : prev));
  const toggleHighContrast = () => setHighContrast((prev) => !prev);

  const setRole = (r: UserRole) => {
    localStorage.setItem('bs_role', r);
    setRoleState(r);
  };

  const setUser = (u: AuthUser | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem('bs_user', JSON.stringify(u));
      setRole(u.role);
    } else {
      localStorage.removeItem('bs_user');
    }
  };

  const setToken = (tok: string | null) => {
    setTokenState(tok);
    if (tok) {
      localStorage.setItem('bs_token', tok);
    } else {
      localStorage.removeItem('bs_token');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setRole('citizen');
  };

  const t = (bn: string, en: string) => (lang === 'bn' ? bn : en);

  return (
    <AppUIContext.Provider
      value={{
        lang,
        setLang,
        fontStep,
        increaseFont,
        decreaseFont,
        highContrast,
        toggleHighContrast,
        role,
        setRole,
        user,
        setUser,
        token,
        setToken,
        logout,
        t,
      }}
    >
      {children}
    </AppUIContext.Provider>
  );
};

export function useAppUI() {
  const ctx = useContext(AppUIContext);
  if (!ctx) throw new Error('useAppUI must be used inside AppUIProvider');
  return ctx;
}
