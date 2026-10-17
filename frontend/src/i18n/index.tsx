import React, { createContext, useContext, useState, useEffect } from 'react';
import { toBanglaDigits } from '../theme/tokens';

export type Lang = 'bn' | 'en';
export type FontStep = 0 | 1 | 2; // 18px, 20px, 22px
export type UserRole =
  | 'citizen'
  | 'service_point_operator'
  | 'sub_registrar'
  | 'registry_data_officer'
  | 'ac_land'
  | 'land_office_assistant'
  | 'field_verification_officer'
  | 'settlement_records_officer'
  | 'settlement_checker'
  | 'uno_supervisor'
  | 'appellate_reviewer'
  | 'bank_officer'
  | 'bank_manager'
  | 'support_agent'
  | 'platform_moderator'
  | 'content_editor'
  | 'content_approver'
  | 'system_admin'
  | 'auditor'
  | 'admin';

export interface AuthUser {
  id: number;
  username: string;
  full_name_bn: string;
  full_name_en: string;
  role: UserRole;
  nid?: string;
  nid_mock?: string;
  phone_dummy?: string;
  phone_mock?: string;
  office_name?: string;
  office_bn?: string;
  office_en?: string;
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
  activeSubTab: string;
  setActiveSubTab: (sub: string) => void;
  logout: () => void;
  t: (bn: string, en: string) => string;
  formatNumber: (val: number | string) => string;
  formatDate: (val: string | Date | null | undefined) => string;
}

const AppUIContext = createContext<AppUIContextType | null>(null);

const detectInitialLang = (): Lang => {
  const p = window.location.pathname.toLowerCase();
  if (p.startsWith('/en') || p === '/en') return 'en';
  if (p.startsWith('/bn') || p === '/bn') return 'bn';
  const saved = localStorage.getItem('bs_lang');
  if (saved === 'en' || saved === 'bn') return saved;
  return 'bn';
};

export const AppUIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);
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
  const [activeSubTab, setActiveSubTab] = useState<string>('');

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

  const setLang = (l: Lang) => {
    setLangState(l);
    // synchronize URL language prefix
    try {
      const url = new URL(window.location.href);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length > 0 && (parts[0] === 'bn' || parts[0] === 'en')) {
        parts[0] = l;
        url.pathname = '/' + parts.join('/');
      } else {
        url.pathname = '/' + l + (url.pathname === '/' ? '' : url.pathname);
      }
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };
  const increaseFont = () => setFontStep((prev) => (prev < 2 ? ((prev + 1) as FontStep) : prev));
  const decreaseFont = () => setFontStep((prev) => (prev > 0 ? ((prev - 1) as FontStep) : prev));
  const toggleHighContrast = () => setHighContrast((prev) => !prev);

  const setRole = (r: UserRole) => {
    localStorage.setItem('bs_role', r);
    setRoleState(r);
    // F13: clear the active sub-tab whenever the role changes so a deep-linked
    // sub-tab from a previous role cannot leak into a new role's workspace.
    // The role pages each render a default sub-tab based on the new role.
    setActiveSubTab('');
    try { localStorage.removeItem('bs_active_subtab'); } catch {}
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
    localStorage.removeItem('bs_token');
    localStorage.removeItem('bs_user');
    localStorage.removeItem('bs_superadmin_mode');
    localStorage.removeItem('bs_admin_original_token');
    setUser(null);
    setTokenState(null);
    setRole('citizen');
  };

  const t = (bn: string, en: string) => (lang === 'bn' ? bn : en);

  const formatNumber = (val: number | string) => toBanglaDigits(val, lang);

  const formatDate = (val: string | Date | null | undefined) => {
    if (!val) return '—';
    try {
      const d = typeof val === 'string' ? new Date(val) : val;
      if (isNaN(d.getTime())) return String(val);
      if (lang === 'bn') {
        const formatted = d.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
        return toBanglaDigits(formatted, 'bn');
      }
      return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return String(val);
    }
  };

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
        activeSubTab,
        setActiveSubTab,
        logout,
        t,
        formatNumber,
        formatDate,
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
