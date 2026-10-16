import React, { useState, useEffect } from 'react';
import { useAppUI, UserRole } from '../i18n';
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
  FileText
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
    logout,
    t,
  } = useAppUI();

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

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

  const handleRoleChange = (newRole: UserRole, navigateToRole = true) => {
    if (user?.role === 'admin') {
      setRole(newRole);
    }
    if (navigateToRole) {
      setActiveTab(ROLE_DASHBOARD_MAP[newRole] || 'home');
    }
  };

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = globalSearch.trim().toUpperCase();
    if (!q) return;
    if (q.startsWith('DL-') || q.startsWith('DEED-')) {
      setActiveTab('qr');
    } else {
      setActiveTab('check');
    }
  };

  const isPublicPage = ['landing', 'check', 'qr', 'help', 'auth'].includes(activeTab);
  const currentRoleMeta = ROLE_META[role] || ROLE_META['citizen'];

  const getRoleSidebarItems = () => {
    if (role === 'citizen') {
      return [
        { id: 'home', label: t('নাগরিক ভল্ট', 'Citizen Vault'), icon: <ShieldCheck className="w-4 h-4" /> },
        { id: 'check', label: t('কেনার আগে যাচাই', 'Check Before Buy'), icon: <Search className="w-4 h-4" /> },
        { id: 'qr', label: t('QR দলিল যাচাই', 'Verify Deed QR'), icon: <QrCode className="w-4 h-4" /> },
        { id: 'profile', label: t('প্রোফাইল', 'Profile'), icon: <UserCheck className="w-4 h-4" /> },
        { id: 'help', label: t('সহায়িকা', 'Help'), icon: <HelpCircle className="w-4 h-4" /> },
      ];
    }
    if (role === 'sub_registrar') {
      return [
        { id: 'registrar', label: t('রেজিস্ট্রার কনসোল', 'Registrar Console'), icon: <FileSpreadsheet className="w-4 h-4" /> },
        { id: 'check', label: t('খতিয়ান পরম্পরা', 'Khatian Lineage'), icon: <Search className="w-4 h-4" /> },
        { id: 'qr', label: t('দলিল যাচাই', 'Deed Verifier'), icon: <QrCode className="w-4 h-4" /> },
        { id: 'profile', label: t('প্রোফাইল', 'Profile'), icon: <UserCheck className="w-4 h-4" /> },
      ];
    }
    if (role === 'ac_land') {
      return [
        { id: 'acland', label: t('মিউটেশন প্যানেল', 'Mutation Panel'), icon: <Landmark className="w-4 h-4" /> },
        { id: 'check', label: t('খতিয়ান অনুসন্ধান', 'Khatian Explorer'), icon: <Search className="w-4 h-4" /> },
        { id: 'qr', label: t('দলিল যাচাই', 'Verify Deed'), icon: <QrCode className="w-4 h-4" /> },
        { id: 'profile', label: t('প্রোফাইল', 'Profile'), icon: <UserCheck className="w-4 h-4" /> },
      ];
    }
    if (role === 'bank_officer') {
      return [
        { id: 'bank', label: t('লিয়েন ও NOC', 'Lien & NOC'), icon: <Building2 className="w-4 h-4" /> },
        { id: 'check', label: t('জামানত যাচাই', 'Collateral Check'), icon: <Search className="w-4 h-4" /> },
        { id: 'qr', label: t('দলিল যাচাই', 'Verify Deed'), icon: <QrCode className="w-4 h-4" /> },
        { id: 'profile', label: t('প্রোফাইল', 'Profile'), icon: <UserCheck className="w-4 h-4" /> },
      ];
    }
    return [
      { id: 'admin', label: t('অ্যাডমিন ও অডিট', 'Admin & Audit'), icon: <Lock className="w-4 h-4" /> },
      { id: 'registrar', label: t('রেজিস্ট্রি মনিটর', 'Registry Monitor'), icon: <FileSpreadsheet className="w-4 h-4" /> },
      { id: 'acland', label: t('মিউটেশন মনিটর', 'Mutation Monitor'), icon: <Landmark className="w-4 h-4" /> },
      { id: 'bank', label: t('লিয়েন মনিটর', 'Lien Monitor'), icon: <Building2 className="w-4 h-4" /> },
      { id: 'check', label: t('দাগ যাচাই', 'Plot Explorer'), icon: <Search className="w-4 h-4" /> },
      { id: 'qr', label: t('লেজার QR', 'Ledger QR'), icon: <QrCode className="w-4 h-4" /> },
    ];
  };

  const sidebarItems = getRoleSidebarItems();

  const roleSwitcher = (
    <div className="space-y-1">
      {(
        [
          { r: 'citizen' as UserRole, tab: 'home', label: t('নাগরিক ভল্ট', 'Citizen Vault') },
          { r: 'sub_registrar' as UserRole, tab: 'registrar', label: t('সাব-রেজিস্ট্রার', 'Sub-Registrar') },
          { r: 'ac_land' as UserRole, tab: 'acland', label: t('এসি ল্যান্ড', 'AC Land') },
          { r: 'bank_officer' as UserRole, tab: 'bank', label: t('ব্যাংক অফিসার', 'Bank Officer') },
          { r: 'admin' as UserRole, tab: 'admin', label: t('সিস্টেম অ্যাডমিন', 'System Admin') },
        ] as const
      ).map((rp) => {
        const active = role === rp.r && activeTab === rp.tab;
        return (
          <button
            key={rp.r}
            onClick={() => {
              setMobileDrawerOpen(false);
              handleRoleChange(rp.r, true);
            }}
            className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer min-h-[38px] transition-colors ${
              active
                ? 'bg-emerald-500/20 text-emerald-300 border-l-2 border-emerald-400 font-bold'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
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
      <div className="min-h-screen flex flex-col bg-white text-slate-800 pb-16 lg:pb-0">
        {/* Top Accent Gradient Bar — Exactly like bcc.zohirrayhan.com */}
        <div className="h-1 bg-gradient-to-r from-emerald-700 via-emerald-600 to-amber-500" />

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
                className="hidden sm:flex h-9 items-center justify-center rounded-lg border border-gray-300 px-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                title={t('উচ্চ কনট্রাস্ট', 'High Contrast')}
              >
                <Contrast className="w-4 h-4" />
              </button>

              {user && token ? (
                <>
                  <button
                    onClick={() => setActiveTab(ROLE_DASHBOARD_MAP[user.role] || 'home')}
                    className="h-9 px-3.5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>{t('ওয়ার্কস্পেস', 'Workspace')}</span>
                  </button>

                  <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-900 px-2.5 py-1.5 rounded-lg text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span className="truncate max-w-[120px]">{user.full_name_bn || user.username}</span>
                  </div>

                  <button
                    onClick={() => {
                      logout();
                      setActiveTab('landing');
                    }}
                    className="h-9 px-3 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    title={t('লগআউট করুন', 'Sign Out')}
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-600" />
                    <span className="hidden sm:inline">{t('লগআউট', 'Sign Out')}</span>
                  </button>
                </>
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
        <InstitutionalFooter t={t} onNavigate={setActiveTab} onRoleSelect={handleRoleChange} />

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
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
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
                </div>

                <div className="border-t border-white/10 pt-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 mb-2">
                    {t('দাপ্তরিক ও নাগরিক ওয়ার্কস্পেস', 'Role Workspaces')}
                  </div>
                  {roleSwitcher}
                </div>
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
          {sidebarItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate?.();
                  setActiveTab(item.id);
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
      <div>
        {sidebarOpen && (
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            {t('রোল প্যানেল', 'Roles')}
          </div>
        )}
        {sidebarOpen && roleSwitcher}
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 pb-16 lg:pb-0">
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

        <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
          {renderSidebarNav()}
        </div>

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
        {/* Top Navbar */}
        <header className="sticky top-1 z-20 h-16 bg-white/95 backdrop-blur border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
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
            <span className="text-xs font-extrabold text-slate-800">
              {lang === 'bn' ? currentRoleMeta.titleBn : currentRoleMeta.titleEn}
            </span>
          </div>

          <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-1.5 pl-1">
                <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span className="truncate max-w-[130px]">{user.full_name_bn || user.username}</span>
                  <span className="text-[10px] font-mono uppercase bg-emerald-200/70 px-1 rounded text-emerald-800">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setActiveTab('landing');
                  }}
                  className="h-8 px-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                  title={t('লগআউট', 'Sign Out')}
                >
                  <LogOut className="w-3.5 h-3.5 text-red-600" />
                  <span className="hidden sm:inline">{t('লগআউট', 'Sign Out')}</span>
                </button>
              </div>
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
        <InstitutionalFooter t={t} onNavigate={setActiveTab} onRoleSelect={handleRoleChange} />
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
  onRoleSelect: (role: UserRole) => void;
}> = ({ t, onNavigate, onRoleSelect }) => (
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
              {t('জাতীয় ই-ভূমি নিরাপত্তা প্ল্যাটফর্ম', 'National Land Registry Security Platform')}
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          {t(
            'ভূমি ভবন, ৮৮ শহীদ তাজউদ্দীন আহমদ সরণি, তেজগাঁও, ঢাকা-১২০৮। নিবন্ধন অধিদপ্তর ও ভূমি মন্ত্রণালয়।',
            'Bhumi Bhaban, 88 Shahid Tajuddin Ahmed Sarani, Tejgaon, Dhaka-1208.'
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
              onClick={() => onRoleSelect('citizen')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('নাগরিক ভল্ট ও বিক্রয় লক', 'Citizen Sale Lock Vault')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onRoleSelect('sub_registrar')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('১১-রুল গেটকিপার ও শুল্ক হিসাব', '11-Rule Gatekeeper')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onRoleSelect('ac_land')}
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
              onClick={() => onRoleSelect('sub_registrar')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('সাব-রেজিস্ট্রার কনসোল', 'Sub-Registrar Panel')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onRoleSelect('ac_land')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('এসি ল্যান্ড ট্রাইব্যুনাল', 'AC Land Tribunal')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onRoleSelect('bank_officer')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('ব্যাংক জামানত ও ডিজিটাল NOC', 'Bank Lien & NOC')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onRoleSelect('admin')}
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
              {t('টোল-ফ্রি হেল্পলাইন: ১৬১২২', 'Helpline: 16122')}
            </span>
          </li>
          <li>
            <span className="text-slate-500">
              {t('আন্তর্জাতিক কল: +৮৮০ ৯৬১২ ৩১৬১২২', 'Intl: +880 9612 316122')}
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
