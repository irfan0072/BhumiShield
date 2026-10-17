import React, { useState, useEffect } from 'react';
import { useAppUI, UserRole, AuthUser } from '../i18n';
import { BhumiApi } from '../api/client';
import {
  ShieldCheck,
  QrCode,
  Search,
  HelpCircle,
  Contrast,
  Globe,
  WifiOff,
  Building2,
  Landmark,
  FileSpreadsheet,
  Lock,
  UserCheck,
  LogOut,
  LogIn,
  Home,
  Menu,
  Bell,
  ChevronRight,
  PhoneCall,
  Layers,
  LayoutDashboard,
  X,
  FileText,
  ShieldAlert,
  ArrowLeft,
  User,
  ChevronDown,
  Clock,
  GitCompareArrows,
  Scale,
  ListChecks,
  Calculator,
  KeyRound
} from 'lucide-react';

interface LayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

const ROLE_DASHBOARD_MAP: Record<UserRole, string> = {
  citizen: 'home',
  sub_registrar: 'registrar',
  ac_land: 'acland',
  bank_officer: 'bank',
  admin: 'admin',
};

const ROLE_META: Record<
  UserRole,
  { titleBn: string; titleEn: string; deptBn: string; deptEn: string }
> = {
  citizen: {
    titleBn: 'নাগরিক ভূমি পোর্টাল',
    titleEn: 'Citizen Land Portal',
    deptBn: 'নাগরিক সেবা ও ভূমি সুরক্ষা ভল্ট',
    deptEn: 'Citizen Property Vault & Verification',
  },
  sub_registrar: {
    titleBn: 'সাব-রেজিস্ট্রার প্যানেল',
    titleEn: 'Sub-Registrar Panel',
    deptBn: 'নিবন্ধন অধিদপ্তর • আইন মন্ত্রণালয়',
    deptEn: 'Directorate of Registration • Ministry of Law',
  },
  ac_land: {
    titleBn: 'এসি ল্যান্ড প্যানেল',
    titleEn: 'AC Land Panel',
    deptBn: 'উপজেলা ভূমি অফিস • ভূমি মন্ত্রণালয়',
    deptEn: 'Upazila Land Office • Ministry of Land',
  },
  bank_officer: {
    titleBn: 'ব্যাংক মর্টগেজ প্যানেল',
    titleEn: 'Bank Mortgage Panel',
    deptBn: 'তফসিলি ব্যাংক জামানত ও লিয়েন বিভাগ',
    deptEn: 'Scheduled Bank Collateral & Lien Division',
  },
  admin: {
    titleBn: 'জাতীয় অ্যাডমিন ও অডিট প্যানেল',
    titleEn: 'National Admin & Audit Panel',
    deptBn: 'কেন্দ্রীয় ক্রিপ্টোগ্রাফিক লেজার ও গভর্ন্যান্স',
    deptEn: 'Central Ledger Governance & Security',
  },
};

interface UserProfileMenuProps {
  user: AuthUser;
  role: UserRole;
  isSuperAdminMode?: boolean;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  onReturnToSuperAdmin?: () => void;
  t: (bn: string, en: string) => string;
  lang: 'bn' | 'en';
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  user,
  role,
  isSuperAdminMode,
  onNavigate,
  onLogout,
  onReturnToSuperAdmin,
  t,
  lang,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const avatarChar = React.useMemo(() => {
    if (user.full_name_bn && user.full_name_bn.trim().length > 0) {
      return user.full_name_bn.trim().charAt(0);
    }
    if (user.full_name_en && user.full_name_en.trim().length > 0) {
      return user.full_name_en.trim().charAt(0).toUpperCase();
    }
    return user.username ? user.username.charAt(0).toUpperCase() : 'U';
  }, [user]);

  const roleMeta = ROLE_META[user.role] || ROLE_META['citizen'];
  const roleTitle = lang === 'bn' ? roleMeta.titleBn : roleMeta.titleEn;

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-9 pl-1.5 pr-2.5 rounded-full border transition-all flex items-center gap-2 cursor-pointer shadow-2xs select-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
          isOpen
            ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-400'
        }`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={t('ব্যবহারকারী প্রোফাইল ও সেটিংস মেনু', 'User profile and settings menu')}
      >
        {/* Avatar Circle with Online Dot */}
        <div className="relative flex items-center justify-center shrink-0">
          <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-tr from-[#006A4E] to-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
            {avatarChar}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
        </div>

        {/* User Info (hidden on mobile, visible on sm+) */}
        <div className="hidden sm:flex flex-col text-left leading-none max-w-[110px] md:max-w-[140px]">
          <span className="text-xs font-bold text-slate-800 truncate">
            {user.full_name_bn || user.username}
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold truncate mt-0.5">
            {roleTitle}
          </span>
        </div>

        {/* Animated Chevron */}
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-700' : ''
          }`}
        />
      </button>

      {/* Profile Dropdown Menu Widget */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150"
          role="menu"
          aria-orientation="vertical"
        >
          {/* User Header Profile Card */}
          <div className="bg-gradient-to-br from-emerald-50/90 via-slate-50 to-white p-4 border-b border-slate-100">
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full bg-[#006A4E] text-white flex items-center justify-center font-bold text-base shadow-sm ring-2 ring-emerald-200/60">
                  {avatarChar}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-slate-900 truncate">
                  {user.full_name_bn || user.full_name_en || user.username}
                </h4>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {roleTitle}
                  </span>
                  {user.username && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      @{user.username}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Identity & Office Metadata */}
            {(user.nid_mock || user.office_name) && (
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 space-y-1 text-[11px] text-slate-600">
                {user.nid_mock && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{t('এনআইডি নম্বর', 'NID Number')}:</span>
                    <span className="font-mono font-semibold text-slate-700">{user.nid_mock}</span>
                  </div>
                )}
                {user.office_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{t('দপ্তর / অফিস', 'Office')}:</span>
                    <span className="font-medium text-slate-700 truncate max-w-[160px]">{user.office_name}</span>
                  </div>
                )}
              </div>
            )}

            {/* Cryptographic Session Badge */}
            <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/70">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{t('জাতীয় লেজার অনুমোদিত সুরক্ষিত সেশন', 'National Ledger Verified Session')}</span>
            </div>
          </div>

          {/* Quick Navigation Items */}
          <div className="p-1.5 space-y-1 text-xs">
            {/* 1. Workspace / Role Dashboard */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate(ROLE_DASHBOARD_MAP[user.role] || 'home');
              }}
              className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left hover:bg-emerald-50/70 text-slate-800 hover:text-emerald-900 transition group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#006A4E] flex items-center justify-center shrink-0 group-hover:bg-[#006A4E] group-hover:text-white transition">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-800 group-hover:text-emerald-900">
                  {t('আমার ওয়ার্কস্পেস', 'My Workspace')}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {roleTitle}
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition" />
            </button>

            {/* 2. Profile Settings */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate('profile');
              }}
              className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left hover:bg-slate-50 text-slate-800 transition group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-800">
                  {t('প্রোফাইল সেটিংস', 'Profile Settings')}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {t('ব্যক্তিগত তথ্য ও নিরাপত্তা', 'Personal info & security')}
                </div>
              </div>
            </button>

            {/* 3. Public Services / Citizen Portal */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate('landing');
              }}
              className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left hover:bg-slate-50 text-slate-800 transition group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition">
                <Home className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-800">
                  {t('পাবলিক পোর্টাল', 'Public Portal')}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {t('সার্ভিস হোম ও তথ্য ভল্ট', 'Home & Public Services')}
                </div>
              </div>
            </button>

            {/* 4. If in Super Admin Oversight, Return button */}
            {isSuperAdminMode && onReturnToSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onReturnToSuperAdmin();
                }}
                className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left bg-amber-50 hover:bg-amber-100 text-amber-900 transition group cursor-pointer border border-amber-200/60"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-amber-950">
                    {t('সুপার অ্যাডমিনে ফিরুন', 'Return to Super Admin')}
                  </div>
                  <div className="text-[10px] text-amber-700 truncate">
                    {t('পর্যবেক্ষণ সমাপ্ত করুন', 'Exit oversight mode')}
                  </div>
                </div>
              </button>
            )}

            {/* 5. Help & Guidelines */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate('help');
              }}
              className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left hover:bg-slate-50 text-slate-800 transition group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-800">
                  {t('সহায়িকা ও এফএকিউ', 'Help & FAQ')}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {t('ভূমি সুরক্ষা নির্দেশিকা', 'BhumiShield Guidelines')}
                </div>
              </div>
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Sign Out Action */}
          <div className="p-1.5">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onLogout();
                onNavigate('landing');
              }}
              className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left hover:bg-red-50 text-red-600 hover:text-red-700 transition group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition">
                <LogOut className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm">
                  {t('লগআউট করুন', 'Sign Out')}
                </div>
                <div className="text-[10px] text-red-500/80">
                  {t('সেশন সমাপ্ত করে প্রস্থান করুন', 'Safely end active session')}
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const NavbarAndLayout: React.FC<LayoutProps> = ({
  activeTab,
  setActiveTab,
  children,
}) => {
  const {
    lang,
    setLang,
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
  } = useAppUI();

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const drawerCloseBtnRef = React.useRef<HTMLButtonElement>(null);
  const previousFocusedElementRef = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (mobileDrawerOpen) {
      previousFocusedElementRef.current = document.activeElement as HTMLElement;
      setTimeout(() => {
        drawerCloseBtnRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setMobileDrawerOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else if (previousFocusedElementRef.current) {
      previousFocusedElementRef.current.focus?.();
    }
  }, [mobileDrawerOpen]);

  useEffect(() => {
    const onOffline = () => setIsOffline(true);
    const onOnline = () => setIsOffline(false);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const [isSuperAdminMode, setIsSuperAdminMode] = useState<boolean>(
    () => import.meta.env.DEV && localStorage.getItem('bs_superadmin_mode') === '1'
  );

  const handleSuperAdminDirectLogin = async (targetRole: UserRole) => {
    if (!import.meta.env.DEV) return;
    // Only permit if currently admin or in super admin oversight mode
    if (user?.role !== 'admin' && !isSuperAdminMode && role !== 'admin') {
      return;
    }
    const currentAdminToken = !isSuperAdminMode ? token : localStorage.getItem('bs_admin_original_token');
    try {
      const res = await BhumiApi.switchDemoRole(targetRole);
      if (res?.access_token && res?.user) {
        if (currentAdminToken) {
          localStorage.setItem('bs_admin_original_token', currentAdminToken);
        }
        localStorage.setItem('bs_superadmin_mode', '1');
        setIsSuperAdminMode(true);
        setToken(res.access_token);
        setUser(res.user);
        setRole(targetRole);
        setActiveTab(ROLE_DASHBOARD_MAP[targetRole] || 'home');
      }
    } catch (err: any) {
      console.error('Super Admin direct login failed', err);
      if (!isSuperAdminMode) {
        localStorage.removeItem('bs_admin_original_token');
        localStorage.removeItem('bs_superadmin_mode');
      }
      alert(lang === 'bn' ? 'সুপারভাইজার রোল পরিবর্তনে ত্রুটি হয়েছে।' : 'Failed to switch supervisor demo role.');
    }
  };

  const handleReturnToSuperAdmin = async () => {
    const originalAdminToken = localStorage.getItem('bs_admin_original_token');
    try {
      const res = await BhumiApi.switchDemoRole('admin');
      if (res?.access_token && res?.user) {
        setToken(res.access_token);
        setUser(res.user);
        setRole('admin');
      }
    } catch {
      if (originalAdminToken) {
        setToken(originalAdminToken);
      }
    } finally {
      localStorage.removeItem('bs_superadmin_mode');
      localStorage.removeItem('bs_admin_original_token');
      setIsSuperAdminMode(false);
      setRole('admin');
      setActiveTab('admin');
    }
  };

  const handleRoleChange = (newRole: UserRole, navigateToRole = true) => {
    if (user?.role === 'admin' || isSuperAdminMode) {
      handleSuperAdminDirectLogin(newRole);
      return;
    }
    if (navigateToRole) {
      setActiveTab(ROLE_DASHBOARD_MAP[newRole] || 'home');
    }
  };

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = globalSearch.trim().toUpperCase();
    if (!q) return;
    if (q.startsWith('DL-') || q.startsWith('DEED-') || q.startsWith('NOC-')) {
      sessionStorage.setItem('bs_pending_verify_search', q);
      setActiveTab('qr');
    } else {
      sessionStorage.setItem('bs_pending_check_search', q);
      setActiveTab('check');
    }
  };

  // Nagorik portal (home) matches frontside consumer design
  const isPublicPage = ['landing', 'home', 'check', 'qr', 'help', 'auth'].includes(activeTab);
  const currentRoleMeta = ROLE_META[role] || ROLE_META['citizen'];

  const getRoleSidebarItems = () => {
    if (role === 'citizen') {
      return [
        { id: 'home', label: t('নাগরিক ভল্ট', 'Citizen Vault'), icon: <ShieldCheck className="w-4 h-4" /> },
        { id: 'check', label: t('কেনার আগে জমি যাচাই', 'Check Before Buy'), icon: <Search className="w-4 h-4" /> },
        { id: 'qr', label: t('QR দলিল যাচাই', 'Verify Deed QR'), icon: <QrCode className="w-4 h-4" /> },
        { id: 'profile', label: t('প্রোফাইল সেটিংস', 'Profile Settings'), icon: <UserCheck className="w-4 h-4" /> },
        { id: 'help', label: t('সহায়িকা ও FAQ', 'Help & FAQ'), icon: <HelpCircle className="w-4 h-4" /> },
      ];
    }
    if (role === 'sub_registrar') {
      return [
        { id: 'wizard', label: t('নতুন দলিল ও প্রাক-যাচাই', 'Pre-Reg Gatekeeper'), icon: <FileSpreadsheet className="w-4 h-4" /> },
        { id: 'held', label: t('স্থগিত দলিল (HELD) কিউ', 'Held Deeds Queue'), icon: <ShieldAlert className="w-4 h-4" /> },
        { id: 'deeds', label: t('দলিল রেজিস্টার রেকর্ড', 'Deeds Register'), icon: <ListChecks className="w-4 h-4" /> },
        { id: 'khatian', label: t('খতিয়ান পরম্পরা ও রেকর্ড', 'Khatian Lineage'), icon: <Search className="w-4 h-4" /> },
        { id: 'verifier', label: t('দলিল লেজার যাচাই', 'Deed Ledger Verifier'), icon: <QrCode className="w-4 h-4" /> },
        { id: 'fees', label: t('সরকারি শুল্ক ও ফি', 'Stamp Duty & Fees'), icon: <Calculator className="w-4 h-4" /> },
      ];
    }
    if (role === 'ac_land') {
      return [
        { id: 'mutations', label: t('ই-মিউটেশন কিউ', 'e-Mutation Queue'), icon: <Clock className="w-4 h-4" /> },
        { id: 'khatians', label: t('খতিয়ান ও ওয়ারিশ সমন্বয়', 'Khatian Reconciliation'), icon: <GitCompareArrows className="w-4 h-4" /> },
        { id: 'disputes', label: t('বিরোধ ট্রাইব্যুনাল', 'Dispute Tribunal'), icon: <Scale className="w-4 h-4" /> },
        { id: 'explorer', label: t('খতিয়ান ও দাগ অনুসন্ধান', 'Khatian Explorer'), icon: <Search className="w-4 h-4" /> },
        { id: 'verifier', label: t('দলিল সত্যতা যাচাই', 'Verify Deed'), icon: <QrCode className="w-4 h-4" /> },
      ];
    }
    if (role === 'bank_officer') {
      return [
        { id: 'mortgages', label: t('লিয়েন ও জামানত রেজিস্টার', 'Active Mortgages'), icon: <Building2 className="w-4 h-4" /> },
        { id: 'new_lien', label: t('নতুন লিয়েন অন্তর্ভুক্তি', 'Register New Lien'), icon: <Lock className="w-4 h-4" /> },
        { id: 'noc', label: t('এনওসি (NOC) সনদপত্র', 'Release NOC'), icon: <FileText className="w-4 h-4" /> },
        { id: 'khatian', label: t('জামানত খতিয়ান যাচাই', 'Collateral Khatian Check'), icon: <Search className="w-4 h-4" /> },
      ];
    }
    return [
      { id: 'ledger', label: t('ক্রিপ্টোগ্রাফিক লেজার ও অখণ্ডতা', 'Cryptographic Ledger'), icon: <ShieldCheck className="w-4 h-4" /> },
      { id: 'users', label: t('ইউজার ও রোল ব্যবস্থাপনা', 'Users & Access Control'), icon: <UserCheck className="w-4 h-4" /> },
      { id: 'audit', label: t('সিকিউরিটি অডিট ট্রেইল', 'Security Audit Trail'), icon: <FileSpreadsheet className="w-4 h-4" /> },
      { id: 'settings', label: t('জালিয়াতি প্রতিরোধ সেটিংস', 'Fraud Engine Policy'), icon: <Lock className="w-4 h-4" /> },
      { id: 'rbac', label: t('রোল পারমিশন ম্যাট্রিক্স', 'RBAC Matrix'), icon: <KeyRound className="w-4 h-4" /> },
      { id: 'catalogue', label: t('সার্ভিস ও ফি ডিরেক্টরি', 'Service & Fees'), icon: <Layers className="w-4 h-4" /> },
      { id: 'direct_access', label: t('সুপার অ্যাডমিন তত্ত্বাবধান', 'Direct Role Oversight'), icon: <ShieldAlert className="w-4 h-4" /> },
    ];
  };

  const sidebarItems = getRoleSidebarItems();

  const superAdminOversightBanner = isSuperAdminMode ? (
    <div className="sticky top-0 z-50 bg-amber-400 text-slate-950 px-4 py-2 shadow-md flex flex-wrap items-center justify-between gap-2 border-b-2 border-amber-600">
      <div className="flex items-center gap-2 text-xs font-black">
        <span className="flex h-2.5 w-2.5 rounded-full bg-red-600 animate-ping" />
        <ShieldAlert className="w-4 h-4 text-slate-950 shrink-0" />
        <span>
          {t(
            `সুপার অ্যাডমিন নিরীক্ষা মোড: আপনি পাসওয়ার্ড ছাড়াই সরাসরি '${currentRoleMeta.titleBn}' ড্যাশবোর্ড পর্যবেক্ষণে রয়েছেন।`,
            `Super Admin Oversight Mode: Directly inspecting '${currentRoleMeta.titleEn}' without password.`
          )}
        </span>
      </div>
      <button
        onClick={handleReturnToSuperAdmin}
        className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-amber-300 text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs border border-amber-400/40"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>{t('সুপার অ্যাডমিনে ফিরুন ↩', 'Return to Super Admin ↩')}</span>
      </button>
    </div>
  ) : null;

  const roleSwitcher = (
    <div className="space-y-1">
      {(
        [
          { r: 'citizen' as UserRole, tab: 'home', label: t('নাগরিক ভল্ট (Citizen)', 'Citizen Vault') },
          { r: 'sub_registrar' as UserRole, tab: 'registrar', label: t('সাব-রেজিস্ট্রার (Law)', 'Sub-Registrar') },
          { r: 'ac_land' as UserRole, tab: 'acland', label: t('এসি ল্যান্ড (Land)', 'AC Land') },
          { r: 'bank_officer' as UserRole, tab: 'bank', label: t('ব্যাংক অফিসার (Bank)', 'Bank Officer') },
          { r: 'admin' as UserRole, tab: 'admin', label: t('সুপার অ্যাডমিন (Admin)', 'Super Admin') },
        ] as const
      ).map((rp) => {
        const active = role === rp.r && activeTab === rp.tab;
        return (
          <button
            key={rp.r}
            onClick={() => {
              setMobileDrawerOpen(false);
              handleSuperAdminDirectLogin(rp.r);
            }}
            className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer min-h-[38px] transition-colors ${
              active
                ? 'bg-amber-500/20 text-amber-300 border-l-2 border-amber-400 font-bold'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
            title={t('পাসওয়ার্ড ছাড়া সরাসরি লগইন করুন', 'Direct Login Without Password')}
          >
            <span className="truncate">{rp.label}</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>
        );
      })}
    </div>
  );

  // Clean Public Header & Layout (Modeled after bcc.zohirrayhan.com)
  if (isPublicPage) {
    return (
      <div className="min-h-screen flex flex-col bg-white text-slate-800 pb-28 lg:pb-0">
        {/* Top Accent Gradient Bar — Exactly like bcc.zohirrayhan.com */}
        <div className="h-1 bg-gradient-to-r from-emerald-700 via-emerald-600 to-amber-500" />

        {superAdminOversightBanner}

        {/* Clean Header Bar */}
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4">
            {/* Logo and Brand Title (bcc.zohirrayhan.com style) */}
            <button
              onClick={() => setActiveTab('landing')}
              className="flex min-w-0 items-center gap-2.5 text-left cursor-pointer min-h-0 bg-transparent border-0 p-0"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#006A4E] text-sm font-bold text-white ring-4 ring-emerald-100">
                <span className="relative">
                  ভূ
                  <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-amber-400" />
                </span>
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm sm:text-base font-bold text-slate-900">
                  {t('ভূমি সুরক্ষা', 'BhumiShield')}
                </span>
                <span className="hidden truncate text-xs text-slate-500 sm:block">
                  {t('জাতীয় জমি ও দলিল নিরাপত্তা প্ল্যাটফর্ম', 'National Land & Deed Trust Platform')}
                </span>
              </span>
            </button>

            {/* Desktop Navigation Links (bcc.zohirrayhan.com style) */}
            <nav className="hidden items-center justify-center gap-1 lg:flex" aria-label="প্রধান মেনু">
              <button
                onClick={() => setActiveTab('landing')}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors cursor-pointer min-h-[38px] ${
                  activeTab === 'landing' ? 'text-[#006A4E] bg-emerald-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {t('সকল সেবা', 'All Services')}
              </button>
              <button
                onClick={() => setActiveTab('check')}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer min-h-[38px]"
              >
                {t('জমি যাচাই', 'Check Land')}
              </button>
              <button
                onClick={() => setActiveTab('qr')}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer min-h-[38px]"
              >
                {t('দলিল QR', 'Verify Deed')}
              </button>
              <button
                onClick={() => setActiveTab('home')}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer min-h-[38px] ${
                  activeTab === 'home'
                    ? 'text-[#006A4E] bg-emerald-50 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {t('নাগরিক ভল্ট', 'Citizen Vault')}
              </button>
              <button
                onClick={() => setActiveTab('help')}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer min-h-[38px]"
              >
                {t('সহায়িকা ও FAQ', 'Help & FAQ')}
              </button>
            </nav>

            {/* Actions: Lang toggle, Contrast, Role Portal, Auth */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
                className="h-9 rounded-lg border border-gray-300 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                aria-label="Switch Language"
              >
                {lang === 'bn' ? 'EN' : 'বাং'}
              </button>

              <button
                onClick={toggleHighContrast}
                className="flex h-9 items-center justify-center rounded-lg border border-gray-300 px-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                title={t('উচ্চ কনট্রাস্ট', 'High Contrast')}
                aria-label={t('উচ্চ কনট্রাস্ট', 'High Contrast')}
              >
                <Contrast className="w-4 h-4" />
              </button>

              {user && token ? (
                <UserProfileMenu
                  user={user}
                  role={role}
                  isSuperAdminMode={isSuperAdminMode}
                  onNavigate={setActiveTab}
                  onLogout={logout}
                  onReturnToSuperAdmin={handleReturnToSuperAdmin}
                  t={t}
                  lang={lang}
                />
              ) : (
                <button
                  onClick={() => setActiveTab('auth')}
                  className="h-9 px-3.5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t('লগইন করুন', 'Sign In')}</span>
                </button>
              )}

              {/* Mobile Menu Hamburger */}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 hover:bg-slate-100 lg:hidden cursor-pointer"
                aria-label="Menu"
              >
                <Menu className="h-5 w-5 text-slate-700" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className={`flex-1 w-full ${activeTab === 'landing' ? '' : 'py-8 px-4 max-w-7xl mx-auto'}`}>{children}</main>

        {/* Clean Footer (bcc.zohirrayhan.com style) */}
        <InstitutionalFooter t={t} onNavigate={setActiveTab} />

        {/* Mobile Slide-Over Drawer */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setMobileDrawerOpen(false)} />
            <aside className="relative w-72 max-w-[85vw] bg-slate-900 text-white flex flex-col h-full z-10 overflow-y-auto">
              <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#006A4E] text-xs font-bold text-white">
                    ভূ
                  </span>
                  <span className="font-bold text-sm">ভূমি সুরক্ষা</span>
                </div>
                <button
                  ref={drawerCloseBtnRef}
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label={t('মেনু বন্ধ করুন', 'Close navigation menu')}
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 py-4 px-3 space-y-4 overflow-y-auto">
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      setActiveTab('landing');
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-xs font-bold text-left flex items-center gap-2 bg-white/10 text-white"
                  >
                    <Home className="w-4 h-4 text-emerald-400" />
                    <span>{t('হোম / সকল সেবা', 'Home / Services')}</span>
                  </button>
                  <button
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      setActiveTab('check');
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-xs font-semibold text-left flex items-center gap-2 text-white/80 hover:bg-white/5"
                  >
                    <Search className="w-4 h-4 text-emerald-400" />
                    <span>{t('জমি কেনার আগে যাচাই', 'Check Before Buy')}</span>
                  </button>
                  <button
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      setActiveTab('qr');
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-xs font-semibold text-left flex items-center gap-2 text-white/80 hover:bg-white/5"
                  >
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>{t('দলিল QR কোড যাচাই', 'Verify Deed QR')}</span>
                  </button>
                  <button
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      setActiveTab('help');
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-xs font-semibold text-left flex items-center gap-2 text-white/80 hover:bg-white/5"
                  >
                    <HelpCircle className="w-4 h-4 text-emerald-400" />
                    <span>{t('সহায়িকা ও পরিভাষা কোষ', 'Help & Glossary')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleHighContrast}
                    className="w-full px-3 py-2.5 rounded-lg text-xs font-semibold text-left flex items-center justify-between text-white/80 hover:bg-white/5 border border-white/10"
                  >
                    <span className="flex items-center gap-2">
                      <Contrast className="w-4 h-4 text-emerald-400" />
                      <span>{t('উচ্চ কনট্রাস্ট মোড', 'High Contrast Mode')}</span>
                    </span>
                    <span className="text-[10px] uppercase font-bold text-emerald-400">
                      {highContrast ? t('চালু', 'ON') : t('বন্ধ', 'OFF')}
                    </span>
                  </button>
                </div>

                {import.meta.env.DEV && (user?.role === 'admin' || isSuperAdminMode) && (
                  <div className="border-t border-white/10 pt-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 px-3 mb-2 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      {t('সুপার অ্যাডমিন ডাইরেক্ট এক্সেস', 'Super Admin Direct Access')}
                    </div>
                    {roleSwitcher}
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}

        {/* Mobile Bottom Dock (bcc.zohirrayhan.com style) */}
        <MobileBottomDock activeTab={activeTab} setActiveTab={setActiveTab} role={role} t={t} />
      </div>
    );
  }

  // Authenticated Role Portal Layout with Sidebar
  const renderSidebarNav = (onNavigate?: () => void) => (
    <>
      <div>
        {sidebarOpen && (
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
            {t('মেনু', 'Menu')}
          </div>
        )}
        <div className="space-y-1">
          {sidebarItems.map((item, idx) => {
            const isOfficerRole = role !== 'citizen';
            const isActive = isOfficerRole
              ? (activeSubTab ? activeSubTab === item.id : idx === 0)
              : activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate?.();
                  if (isOfficerRole) {
                    setActiveSubTab(item.id);
                    const expectedTab = ROLE_DASHBOARD_MAP[role] || 'home';
                    if (activeTab !== expectedTab) {
                      setActiveTab(expectedTab);
                    }
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={`w-full px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer min-h-[40px] ${
                  isActive
                    ? 'bg-[#006A4E] text-white shadow-xs'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.icon}
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>
      </div>
      {import.meta.env.DEV && (user?.role === 'admin' || isSuperAdminMode) && (
        <div className="pt-2 border-t border-slate-800">
          {sidebarOpen && (
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              {t('সুপার অ্যাডমিন ডাইরেক্ট এক্সেস', 'Super Admin Direct Access')}
            </div>
          )}
          {sidebarOpen && roleSwitcher}
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 pb-28 lg:pb-0">
      {/* Top Accent Gradient Line */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-700 via-emerald-600 to-amber-500 z-50" />

      {/* Desktop Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-[4.5rem]'
        } hidden md:flex flex-col bg-slate-900 text-white transition-all duration-200 shrink-0 z-30 border-r border-slate-800 pt-1`}
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800">
          <button
            onClick={() => setActiveTab('landing')}
            className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer min-h-0 bg-transparent border-0 p-0"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#006A4E] text-xs font-bold text-white ring-2 ring-emerald-500/30">
              ভূ
            </span>
            {sidebarOpen && (
              <div className="min-w-0">
                <div className="font-bold text-sm text-white truncate">ভূমি সুরক্ষা</div>
                <div className="text-[10px] text-slate-400 font-mono">BCC LandTech</div>
              </div>
            )}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
            title="Toggle Sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {sidebarOpen && (
          <div className="px-4 py-2.5 bg-slate-800/60 border-b border-slate-800 text-[11px]">
            <div className="font-bold text-emerald-400 truncate">
              {lang === 'bn' ? currentRoleMeta.titleBn : currentRoleMeta.titleEn}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {lang === 'bn' ? currentRoleMeta.deptBn : currentRoleMeta.deptEn}
            </div>
          </div>
        )}

        <nav aria-label="Sidebar Navigation" className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
          {renderSidebarNav()}
        </nav>

        {/* Footer in sidebar */}
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          {sidebarOpen ? (
            <>
              <button
                onClick={() => setActiveTab('landing')}
                className="hover:text-white flex items-center gap-1 cursor-pointer font-bold"
              >
                <Home className="w-3.5 h-3.5" />
                <span>{t('পাবলিক পোর্টাল', 'Public Portal')}</span>
              </button>
              {user && token ? (
                <button
                  onClick={() => {
                    logout();
                    setActiveTab('landing');
                  }}
                  className="hover:text-red-400 text-red-300 flex items-center gap-1 cursor-pointer font-bold"
                  title={t('লগআউট', 'Sign Out')}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t('লগআউট', 'Sign Out')}</span>
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab('auth')}
                  className="hover:text-emerald-300 text-emerald-400 flex items-center gap-1 cursor-pointer font-bold"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t('লগইন', 'Sign In')}</span>
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => setActiveTab('landing')}
              className="mx-auto hover:text-white cursor-pointer"
              title="Home"
            >
              <Home className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 pt-1">
        {superAdminOversightBanner}
        {/* Top Navbar */}
        <header className="sticky top-1 z-20 h-16 bg-white/95 backdrop-blur border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="p-1.5 rounded-lg border border-slate-200 md:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>
            <button
              onClick={() => setActiveTab('landing')}
              className="text-xs font-bold text-[#006A4E] hover:underline flex items-center gap-1"
            >
              <Home className="w-3.5 h-3.5" />
              <span>{t('হোম', 'Home')}</span>
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-extrabold text-slate-800 truncate min-w-0">
              {lang === 'bn' ? currentRoleMeta.titleBn : currentRoleMeta.titleEn}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <form onSubmit={handleGlobalSearchSubmit} className="hidden sm:block relative">
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder={t('দাগ নং বা দলিল খুঁজুন...', 'Search plot or deed...')}
                className="w-48 lg:w-64 pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#006A4E]/30"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </form>

            <button
              onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
              className="h-8 px-2.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {lang === 'bn' ? 'EN' : 'বাং'}
            </button>

            <button
              onClick={toggleHighContrast}
              className="h-8 px-2 rounded-lg border border-slate-300 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
              title="Contrast"
            >
              <Contrast className="w-3.5 h-3.5" />
            </button>

            {user && token ? (
              <UserProfileMenu
                user={user}
                role={role}
                isSuperAdminMode={isSuperAdminMode}
                onNavigate={setActiveTab}
                onLogout={logout}
                onReturnToSuperAdmin={handleReturnToSuperAdmin}
                t={t}
                lang={lang}
              />
            ) : (
              <button
                onClick={() => setActiveTab('auth')}
                className="h-8 px-3 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t('লগইন', 'Sign In')}</span>
              </button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>

        {/* Clean Footer */}
        <InstitutionalFooter t={t} onNavigate={setActiveTab} />
      </div>

      {/* Mobile Slide-Over Drawer for Authenticated View */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setMobileDrawerOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-slate-900 text-white flex flex-col h-full z-10 overflow-y-auto">
            <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#006A4E] text-xs font-bold text-white">
                  ভূ
                </span>
                <span className="font-bold text-sm">ভূমি সুরক্ষা</span>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
              {renderSidebarNav(() => setMobileDrawerOpen(false))}
            </div>
          </aside>
        </div>
      )}

      {/* Mobile Bottom Navigation Dock */}
      <MobileBottomDock activeTab={activeTab} setActiveTab={setActiveTab} role={role} t={t} />
    </div>
  );
};

// Clean 4-Column Footer Matching bcc.zohirrayhan.com
const InstitutionalFooter: React.FC<{
  t: (bn: string, en: string) => string;
  onNavigate: (tab: string) => void;
}> = ({ t, onNavigate }) => (
  <footer className="mt-16 border-t border-gray-200 bg-white text-slate-700">
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
      {/* Col 1: Brand Info & Location */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#006A4E] text-sm font-bold text-white ring-4 ring-emerald-100">
            ভূ
          </span>
          <div>
            <span className="block font-bold text-slate-900 text-base">
              {t('ভূমি সুরক্ষা', 'BhumiShield')}
            </span>
            <span className="block text-xs text-slate-500">
              {t('ভূমি নিরাপত্তা ও ট্রাস্ট প্রোটোটাইপ', 'Land Registry Trust & Verification Prototype')}
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          {t(
            'ভূমি সুরক্ষা একটি স্বাধীন উদ্ভাবনী প্রোটোটাইপ (LandTech Hackathon 2026)। সরকারি সেবাসমূহ সংশ্লিষ্ট ভূমি অফিস ও নিবন্ধন অধিদপ্তরের অফিসিয়াল পোর্টালের আওতাধীন।',
            'BhumiShield is an independent LandTech 2026 innovation prototype. Official land services are governed by respective government portals.'
          )}
        </p>
        <div className="pt-1">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
            Ed25519 • SHA-256 Hash Chain
          </span>
        </div>
      </div>

      {/* Col 2: Services */}
      <div>
        <p className="mb-3 text-sm font-bold text-slate-900">{t('নাগরিক সেবাসমূহ', 'Services')}</p>
        <ul className="space-y-2 text-xs">
          <li>
            <button
              onClick={() => onNavigate('check')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('জমি কেনার আগে যাচাই', 'Check Before Buy')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate('qr')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('দলিল QR কোড যাচাই', 'Verify Deed QR Code')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate('home')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('নাগরিক ভল্ট ও বিক্রয় লক', 'Citizen Sale Lock Vault')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate('help')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('১১-রুল গেটকিপার ও শুল্ক হিসাব', '11-Rule Gatekeeper')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate('help')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('স্বয়ংক্রিয় ই-মিউটেশন কিউ', 'e-Mutation Queue')}
            </button>
          </li>
        </ul>
      </div>

      {/* Col 3: Workspaces */}
      <div>
        <p className="mb-3 text-sm font-bold text-slate-900">{t('দাপ্তরিক প্যানেল', 'Workspaces')}</p>
        <ul className="space-y-2 text-xs">
          <li>
            <button
              onClick={() => onNavigate('registrar')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('সাব-রেজিস্ট্রার কনসোল', 'Sub-Registrar Panel')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate('acland')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('এসি ল্যান্ড ট্রাইব্যুনাল', 'AC Land Tribunal')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate('bank')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('ব্যাংক জামানত ও ডিজিটাল NOC', 'Bank Lien & NOC')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate('admin')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('জাতীয় লেজার ও RBAC অডিট', 'National Ledger & Audit')}
            </button>
          </li>
        </ul>
      </div>

      {/* Col 4: Support & Helpline */}
      <div>
        <p className="mb-3 text-sm font-bold text-slate-900">{t('সহায়তা ও যোগাযোগ', 'Support & Helpline')}</p>
        <ul className="space-y-2 text-xs">
          <li>
            <span className="font-bold text-[#006A4E]">
              {t('ভূমি সেবা কল সেন্টার: ১৬১২২', 'Land Service Call Center: 16122')}
            </span>
          </li>
          <li>
            <span className="text-slate-500 text-[11px] block">
              {t('ভূমি মন্ত্রণালয় (সরকারি সময়সূচী অনুযায়ী)', 'Ministry of Land (Official service hours)')}
            </span>
          </li>
          <li>
            <span className="text-slate-500">
              {t('অফিসিয়াল সেবার সময়সূচি দেখুন', 'Check official service hours')}
            </span>
          </li>
          <li>
            <button
              onClick={() => onNavigate('help')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('সাধারণ জিজ্ঞাসাসমূহ (FAQ)', 'Frequently Asked Questions')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate('help')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('ভূমি ও জরিপ পরিভাষা কোষ', 'Bangladeshi Land Glossary')}
            </button>
          </li>
        </ul>
      </div>
    </div>

    {/* Bottom Copyright Bar */}
    <div className="border-t border-gray-100 py-4 text-center text-xs text-slate-500">
      {t(
        '© ২০২৬ ভূমি সুরক্ষা (BhumiShield) · LandTech Hackathon Innovation. সর্বস্বত্ব সংরক্ষিত।',
        '© 2026 BhumiShield · LandTech Hackathon Innovation. All rights reserved.'
      )}
    </div>
  </footer>
);

// Mobile Floating Bottom Dock Matching bcc.zohirrayhan.com
const MobileBottomDock: React.FC<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: UserRole;
  t: (bn: string, en: string) => string;
}> = ({ activeTab, setActiveTab, role, t }) => (
  <nav
    aria-label="দ্রুত নেভিগেশন"
    className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden print:hidden"
  >
    <div className="mx-auto flex max-w-lg items-stretch">
      <button
        onClick={() => setActiveTab('landing')}
        className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-bold cursor-pointer transition-colors ${
          activeTab === 'landing' ? 'text-[#006A4E]' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Home className="h-5 w-5" />
        <span className="truncate">{t('সেবাসমূহ', 'Home')}</span>
      </button>

      <button
        onClick={() => setActiveTab('check')}
        className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-bold cursor-pointer transition-colors ${
          activeTab === 'check' ? 'text-[#006A4E]' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Search className="h-5 w-5" />
        <span className="truncate">{t('যাচাই', 'Check')}</span>
      </button>

      {/* Center Floating Action Button (like bcc.zohirrayhan.com camera button) */}
      <div className="flex flex-1 justify-center">
        <button
          onClick={() => setActiveTab('qr')}
          className="relative -mt-5 flex flex-col items-center cursor-pointer group"
          title="QR Verify"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#006A4E] text-white shadow-lg ring-4 ring-white transition-transform group-hover:scale-105 active:scale-95">
            <QrCode className="h-6 w-6" />
          </span>
          <span className="text-[10px] font-bold text-slate-700 mt-1">{t('দলিল QR', 'QR Scan')}</span>
        </button>
      </div>

      <button
        onClick={() => setActiveTab(ROLE_DASHBOARD_MAP[role])}
        className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-bold cursor-pointer transition-colors ${
          activeTab === ROLE_DASHBOARD_MAP[role] ? 'text-[#006A4E]' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <LayoutDashboard className="h-5 w-5" />
        <span className="truncate">{t('ভল্ট / প্যানেল', 'Panel')}</span>
      </button>

      <button
        onClick={() => setActiveTab('help')}
        className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-bold cursor-pointer transition-colors ${
          activeTab === 'help' ? 'text-[#006A4E]' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <HelpCircle className="h-5 w-5" />
        <span className="truncate">{t('সহায়তা', 'Help')}</span>
      </button>
    </div>
  </nav>
);
