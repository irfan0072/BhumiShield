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
  {
    titleBn: string;
    titleEn: string;
    deptBn: string;
    deptEn: string;
    badgeColor: string;
  }
> = {
  citizen: {
    titleBn: 'নাগরিক ভূমি পোর্টাল',
    titleEn: 'Citizen Land Portal',
    deptBn: 'নাগরিক সেবা ও ভূমি সুরক্ষা ভল্ট',
    deptEn: 'Citizen Property Vault & Verification',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  },
  sub_registrar: {
    titleBn: 'সাব-রেজিস্ট্রার প্যানেল',
    titleEn: 'Sub-Registrar Panel',
    deptBn: 'নিবন্ধন অধিদপ্তর • আইন মন্ত্রণালয়',
    deptEn: 'Directorate of Registration • Ministry of Law',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
  },
  ac_land: {
    titleBn: 'এসি ল্যান্ড প্যানেল',
    titleEn: 'AC Land Panel',
    deptBn: 'উপজেলা ভূমি অফিস • ভূমি মন্ত্রণালয়',
    deptEn: 'Upazila Land Office • Ministry of Land',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
  },
  bank_officer: {
    titleBn: 'ব্যাংক মর্টগেজ প্যানেল',
    titleEn: 'Bank Mortgage Panel',
    deptBn: 'তফসিলি ব্যাংক জামানত ও লিয়েন বিভাগ',
    deptEn: 'Scheduled Bank Collateral & Lien Division',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
  },
  admin: {
    titleBn: 'জাতীয় অ্যাডমিন ও অডিট প্যানেল',
    titleEn: 'National Admin & Audit Panel',
    deptBn: 'কেন্দ্রীয় ক্রিপ্টোগ্রাফিক লেজার ও গভর্ন্যান্স',
    deptEn: 'Central Ledger Governance & Security',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
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
    setToken,
    logout,
    t,
  } = useAppUI();

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [switchingRole, setSwitchingRole] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [globalSearch, setGlobalSearch] = useState('');
  const [stats, setStats] = useState<any>(null);

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

  useEffect(() => {
    BhumiApi.getStatsSummary()
      .then((res) => setStats(res))
      .catch(() => {});
  }, [activeTab, role]);

  const handleRoleChange = async (newRole: UserRole, navigateToRole = true) => {
    setSwitchingRole(true);
    try {
      const res = await BhumiApi.switchDemoRole(newRole);
      if (res?.access_token && res?.user) {
        setToken(res.access_token);
        setUser(res.user);
      } else {
        setRole(newRole);
      }
    } catch {
      setRole(newRole);
    } finally {
      setSwitchingRole(false);
      if (navigateToRole) {
        setActiveTab(ROLE_DASHBOARD_MAP[newRole] || 'home');
      }
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

  // Determine whether to render the Public GovTech Portal Header (when on Landing)
  // or the Velzon Enterprise Left-Sidebar Panel (when inside any Role Panel / Tool)
  const isPublicLanding = activeTab === 'landing';

  if (isPublicLanding) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#1A1A1A]">
        {/* Official Bangladesh GovTech Top Utility Bar (bcc.zohirrayhan.com style) */}
        <div className="bg-[#004d38] text-white text-xs border-b-2 border-[#F42A41]">
          <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F42A41] inline-block shrink-0" />
              <span>
                {t(
                  'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার • ভূমি মন্ত্রণালয় ও আইন, বিচার ও সংসদ বিষয়ক মন্ত্রণালয় • কারিগরি সহযোগিতায়: বাংলাদেশ কম্পিউটার কাউন্সিল (BCC)',
                  'Government of the People’s Republic of Bangladesh • Ministry of Land & Ministry of Law • Technical Support: BCC'
                )}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="hidden md:inline-flex items-center gap-1 text-emerald-100 font-semibold">
                <PhoneCall className="w-3.5 h-3.5" />
                <span>{t('জাতীয় ভূমি হেল্পলাইন: ১৬১২২', 'Land Helpline: 16122')}</span>
              </span>

              <div className="flex items-center bg-white/10 rounded overflow-hidden border border-white/20">
                <button
                  onClick={decreaseFont}
                  className="px-2 py-0.5 font-bold hover:bg-white/20 cursor-pointer min-h-[28px]"
                >
                  A−
                </button>
                <button
                  onClick={increaseFont}
                  className="px-2 py-0.5 font-bold hover:bg-white/20 border-l border-white/20 cursor-pointer min-h-[28px]"
                >
                  A+
                </button>
              </div>

              <button
                onClick={toggleHighContrast}
                className="px-2.5 py-0.5 rounded bg-white/10 hover:bg-white/20 border border-white/20 font-semibold cursor-pointer min-h-[28px]"
              >
                {t('কনট্রাস্ট', 'Contrast')}
              </button>

              <button
                onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
                className="px-2.5 py-0.5 rounded bg-white text-[#004d38] font-extrabold cursor-pointer min-h-[28px]"
              >
                {lang === 'bn' ? 'English' : 'বাংলা'}
              </button>
            </div>
          </div>
        </div>

        {/* Institutional Public Navigation Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <img
                src="/assets/bhumishield-emblem.svg"
                alt="BhumiShield Emblem"
                className="w-12 h-12 rounded-xl shadow-xs"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl md:text-2xl font-extrabold text-[#006A4E] tracking-tight">
                    {t('ভূমি সুরক্ষা (BhumiShield)', 'BhumiShield — National Land Ledger')}
                  </span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#E6F2EE] text-[#006A4E] font-bold border border-[#006A4E]/25">
                    {t('জাতীয় ই-ভূমি ট্রাস্ট লেয়ার', 'National e-Land Trust Layer')}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {t(
                    'সাব-রেজিস্ট্রি (আইন মন্ত্রণালয়), এসি ল্যান্ড (ভূমি মন্ত্রণালয়) ও তফসিলি ব্যাংকের সমন্বিত দলিল যাচাই সিস্টেম',
                    'Integrated Pre-Registration Deed Verification & Cryptographic Ledger across Sub-Registry, AC Land & Banks'
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveTab('check')}
                className="px-3.5 py-2 rounded-lg text-slate-700 hover:bg-slate-100 font-bold text-sm flex items-center gap-1.5 cursor-pointer min-h-[40px]"
              >
                <Search className="w-4 h-4 text-[#006A4E]" />
                <span>{t('দাগ ও খতিয়ান যাচাই', 'Verify Plot')}</span>
              </button>
              <button
                onClick={() => setActiveTab('qr')}
                className="px-3.5 py-2 rounded-lg text-slate-700 hover:bg-slate-100 font-bold text-sm flex items-center gap-1.5 cursor-pointer min-h-[40px]"
              >
                <QrCode className="w-4 h-4 text-[#006A4E]" />
                <span>{t('QR দলিল সনদ যাচাই', 'Verify Deed QR')}</span>
              </button>
              <button
                onClick={() => setActiveTab(ROLE_DASHBOARD_MAP[role])}
                className="px-4 py-2 rounded-lg bg-[#253656] hover:bg-[#1b2842] text-white font-bold text-sm flex items-center gap-1.5 shadow-xs cursor-pointer min-h-[40px]"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>{t('রোল প্যানেল ড্যাশবোর্ড', 'Open Role Workspace')}</span>
              </button>
              <button
                onClick={() => setActiveTab('auth')}
                className="px-4 py-2 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-sm flex items-center gap-1.5 shadow-xs cursor-pointer min-h-[40px]"
              >
                <LogIn className="w-4 h-4" />
                <span>{t('দাপ্তরিক ও নাগরিক লগইন', 'Portal Sign In')}</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">{children}</main>

        <InstitutionalFooter lang={lang} t={t} />
      </div>
    );
  }

  // ============================================================================
  // VELZON ENTERPRISE ADMIN PANEL LAYOUT (Attached Image Style for Separate Roles)
  // ============================================================================
  const currentRoleMeta = ROLE_META[role];

  // Role-specific dedicated sidebar navigation items
  const getRoleSidebarItems = () => {
    if (role === 'citizen') {
      return [
        {
          id: 'home',
          label: t('নাগরিক ভল্ট ওভারভিউ', 'Citizen Vault & Locks'),
          icon: <ShieldCheck className="w-4 h-4" />,
          badge: t('ভল্ট', 'Vault'),
        },
        {
          id: 'check',
          label: t('জমি কেনার আগে যাচাই', 'Check Before You Buy'),
          icon: <Search className="w-4 h-4" />,
        },
        {
          id: 'qr',
          label: t('QR ও দলিল সনদ যাচাই', 'Verify Deed & QR'),
          icon: <QrCode className="w-4 h-4" />,
        },
        {
          id: 'profile',
          label: t('প্রোফাইল ও নিরাপত্তা', 'Profile & Security'),
          icon: <UserCheck className="w-4 h-4" />,
        },
        {
          id: 'help',
          label: t('নির্দেশিকা ও সহায়িকা', 'Citizen Guide'),
          icon: <HelpCircle className="w-4 h-4" />,
        },
      ];
    }

    if (role === 'sub_registrar') {
      return [
        {
          id: 'registrar',
          label: t('সাব-রেজিস্ট্রার কনসোল', 'Sub-Registrar Console'),
          icon: <FileSpreadsheet className="w-4 h-4" />,
          badge: 'Primary',
        },
        {
          id: 'check',
          label: t('দাগ ও খতিয়ান পরম্পরা', 'Plot & Khatian Lineage'),
          icon: <Search className="w-4 h-4" />,
        },
        {
          id: 'qr',
          label: t('দলিল স্বাক্ষর ও QR যাচাই', 'Deed Signature Verifier'),
          icon: <QrCode className="w-4 h-4" />,
        },
        {
          id: 'profile',
          label: t('অফিসার প্রোফাইল', 'Officer Profile'),
          icon: <UserCheck className="w-4 h-4" />,
        },
      ];
    }

    if (role === 'ac_land') {
      return [
        {
          id: 'acland',
          label: t('এসি ল্যান্ড ও মিউটেশন প্যানেল', 'AC Land & Mutation Panel'),
          icon: <Landmark className="w-4 h-4" />,
          badge: 'Primary',
        },
        {
          id: 'check',
          label: t('মৌজা ও খতিয়ান চেইন অনুসন্ধান', 'Khatian Chain Explorer'),
          icon: <Search className="w-4 h-4" />,
        },
        {
          id: 'qr',
          label: t('নিবন্ধিত দলিল যাচাই', 'Verify Registered Deed'),
          icon: <QrCode className="w-4 h-4" />,
        },
        {
          id: 'profile',
          label: t('অফিসার প্রোফাইল', 'Officer Profile'),
          icon: <UserCheck className="w-4 h-4" />,
        },
      ];
    }

    if (role === 'bank_officer') {
      return [
        {
          id: 'bank',
          label: t('ব্যাংক মর্টগেজ ও NOC প্যানেল', 'Bank Lien & NOC Panel'),
          icon: <Building2 className="w-4 h-4" />,
          badge: 'Primary',
        },
        {
          id: 'check',
          label: t('জামানত দাগ ও মালিকানা যাচাই', 'Collateral Plot Check'),
          icon: <Search className="w-4 h-4" />,
        },
        {
          id: 'qr',
          label: t('মর্টগেজ দলিল ও QR যাচাই', 'Verify Deed QR'),
          icon: <QrCode className="w-4 h-4" />,
        },
        {
          id: 'profile',
          label: t('অফিসার প্রোফাইল', 'Officer Profile'),
          icon: <UserCheck className="w-4 h-4" />,
        },
      ];
    }

    // Admin
    return [
      {
        id: 'admin',
        label: t('জাতীয় গভর্ন্যান্স ও অডিট কনসোল', 'National Admin & Audit'),
        icon: <Lock className="w-4 h-4" />,
        badge: 'Admin',
      },
      {
        id: 'registrar',
        label: t('সাব-রেজিস্ট্রি মনিটরিং', 'Sub-Registry Monitor'),
        icon: <FileSpreadsheet className="w-4 h-4" />,
      },
      {
        id: 'acland',
        label: t('এসি ল্যান্ড মিউটেশন মনিটরিং', 'AC Land Monitor'),
        icon: <Landmark className="w-4 h-4" />,
      },
      {
        id: 'bank',
        label: t('ব্যাংক লিয়েন মনিটরিং', 'Bank Lien Monitor'),
        icon: <Building2 className="w-4 h-4" />,
      },
      {
        id: 'check',
        label: t('দাগ ও খতিয়ান যাচাই', 'Plot Lineage Explorer'),
        icon: <Search className="w-4 h-4" />,
      },
      {
        id: 'qr',
        label: t('QR ও লেজার সনদ যাচাই', 'Ledger QR Verifier'),
        icon: <QrCode className="w-4 h-4" />,
      },
    ];
  };

  const sidebarItems = getRoleSidebarItems();

  return (
    <div className="min-h-screen flex bg-[#F3F6F9] text-slate-800 pb-20 md:pb-0">
      {/* LEFT VERTICAL VELZON DARK SIDEBAR (#253656) */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } hidden md:flex flex-col bg-[#253656] text-slate-200 transition-all duration-200 shrink-0 select-none shadow-xl z-30`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
          <button
            onClick={() => setActiveTab('landing')}
            className="flex items-center gap-3 text-left focus:outline-none cursor-pointer min-h-0"
          >
            <img
              src="/assets/bhumishield-emblem.svg"
              alt="Emblem"
              className="w-9 h-9 rounded-lg shrink-0"
            />
            {sidebarOpen && (
              <div>
                <div className="font-extrabold text-white text-base tracking-wide leading-none">
                  BHUMISHIELD
                </div>
                <div className="text-[11px] text-emerald-300 font-semibold mt-1">
                  {t('ভূমি সুরক্ষা • জাতীয় লেজার', 'National Land Ledger')}
                </div>
              </div>
            )}
          </button>
        </div>

        {/* Active Role Workspace Badge inside Sidebar */}
        {sidebarOpen && (
          <div className="px-4 py-3.5 border-b border-white/10 bg-[#1d2b45]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('সক্রিয় দাপ্তরিক প্যানেল', 'ACTIVE ROLE WORKSPACE')}
            </div>
            <div className="mt-1 font-extrabold text-sm text-white flex items-center justify-between">
              <span>{lang === 'bn' ? currentRoleMeta.titleBn : currentRoleMeta.titleEn}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5 truncate">
              {lang === 'bn' ? currentRoleMeta.deptBn : currentRoleMeta.deptEn}
            </div>
          </div>
        )}

        {/* Sidebar Navigation Sections */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {/* Primary Role Menu */}
          <div>
            {sidebarOpen && (
              <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {t('মেনু ও অপারেশন (MENU)', 'WORKSPACE MENU')}
              </div>
            )}
            <div className="space-y-1">
              {sidebarItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer min-h-[40px] ${
                      isActive
                        ? 'bg-[#006A4E] text-white shadow-xs'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {item.icon}
                      {sidebarOpen && <span className="truncate">{item.label}</span>}
                    </div>
                    {sidebarOpen && item.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-200 font-bold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dedicated Role Panels Switcher (Velzon Multi-Dashboard Submenu) */}
          <div>
            {sidebarOpen && (
              <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>{t('৫টি রোল প্যানেল (PANELS)', 'ROLE WORKSPACES')}</span>
              </div>
            )}
            <div className="space-y-1">
              {(
                [
                  {
                    r: 'citizen' as UserRole,
                    tab: 'home',
                    label: t('নাগরিক ভল্ট প্যানেল', 'Citizen Vault Panel'),
                  },
                  {
                    r: 'sub_registrar' as UserRole,
                    tab: 'registrar',
                    label: t('সাব-রেজিস্ট্রার প্যানেল', 'Sub-Registrar Panel'),
                  },
                  {
                    r: 'ac_land' as UserRole,
                    tab: 'acland',
                    label: t('এসি ল্যান্ড প্যানেল', 'AC Land Panel'),
                  },
                  {
                    r: 'bank_officer' as UserRole,
                    tab: 'bank',
                    label: t('ব্যাংক মর্টগেজ প্যানেল', 'Bank Officer Panel'),
                  },
                  {
                    r: 'admin' as UserRole,
                    tab: 'admin',
                    label: t('জাতীয় অ্যাডমিন প্যানেল', 'System Admin Panel'),
                  },
                ] as const
              ).map((rp) => {
                const isCurrentRolePanel = role === rp.r && activeTab === rp.tab;
                return (
                  <button
                    key={rp.r}
                    onClick={() => handleRoleChange(rp.r, true)}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer min-h-[36px] ${
                      isCurrentRolePanel
                        ? 'bg-white/15 text-white font-bold border-l-4 border-emerald-400'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          role === rp.r ? 'bg-emerald-400' : 'bg-slate-500'
                        }`}
                      />
                      {sidebarOpen && <span className="truncate">{rp.label}</span>}
                    </div>
                    {sidebarOpen && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Public Portal Link */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => setActiveTab('landing')}
            className="w-full px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer min-h-[40px]"
          >
            <Home className="w-4 h-4 text-emerald-300" />
            {sidebarOpen && <span>{t('পাবলিক পোর্টালে ফিরুন', 'Public National Portal')}</span>}
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN WORKSPACE COLUMN */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Offline Banner */}
        {isOffline && (
          <div
            role="status"
            aria-live="polite"
            className="bg-[#B7791F] text-white px-4 py-2 text-center text-xs font-semibold flex items-center justify-center gap-2"
          >
            <WifiOff className="w-4 h-4" />
            <span>
              {t(
                'অফলাইন মোড সক্রিয়: সংরক্ষিত ডেটা প্রদর্শিত হচ্ছে।',
                'Offline Mode: Showing cached data.'
              )}
            </span>
          </div>
        )}

        {/* TOP WHITE VELZON HEADER BAR */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-2xs">
          {/* Left: Sidebar Toggle + Search Input */}
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:flex p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer min-h-[38px]"
              aria-label="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <form onSubmit={handleGlobalSearchSubmit} className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder={t(
                  'দাগ নং (১০১), দলিল নং (DL-2026-1001) বা এনআইডি খুঁজুন...',
                  'Search Dag No, Deed No (DL-2026-1001), or NID...'
                )}
                className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-[#F3F6F9] border border-transparent focus:border-[#006A4E] focus:bg-white text-xs font-medium text-slate-800 outline-none min-h-[38px]"
              />
            </form>
          </div>

          {/* Right: Workspace Role Selector, Language, Accessibility, Notifications, Profile */}
          <div className="flex items-center gap-2.5">
            {/* Clean Enterprise Workspace Role Switcher */}
            <div className="hidden sm:flex items-center bg-[#F3F6F9] border border-slate-200 rounded-lg px-2.5 py-1">
              <span className="text-[11px] font-bold text-slate-500 mr-1.5">
                {t('প্যানেল:', 'Panel:')}
              </span>
              <select
                aria-label={t('রোল প্যানেল পরিবর্তন', 'Switch Role Panel')}
                value={role}
                disabled={switchingRole}
                onChange={(e) => handleRoleChange(e.target.value as UserRole, true)}
                className="text-xs font-extrabold text-[#253656] bg-transparent focus:outline-none cursor-pointer min-h-[28px]"
              >
                <option value="citizen">{t('নাগরিক প্যানেল (Citizen)', 'Citizen Panel')}</option>
                <option value="sub_registrar">
                  {t('সাব-রেজিস্ট্রার (Sub-Registrar)', 'Sub-Registrar Panel')}
                </option>
                <option value="ac_land">{t('এসি ল্যান্ড (AC Land)', 'AC Land Panel')}</option>
                <option value="bank_officer">
                  {t('ব্যাংক মর্টগেজ (Bank Officer)', 'Bank Officer Panel')}
                </option>
                <option value="admin">{t('জাতীয় অ্যাডমিন (System Admin)', 'System Admin Panel')}</option>
              </select>
            </div>

            {/* Language Switch */}
            <button
              onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
              className="px-2.5 py-1.5 rounded-lg bg-[#F3F6F9] hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer min-h-[36px]"
            >
              <Globe className="w-3.5 h-3.5 text-[#006A4E]" />
              <span>{lang === 'bn' ? 'EN' : 'বাংলা'}</span>
            </button>

            {/* Font Size A- / A+ */}
            <div className="hidden lg:flex items-center bg-[#F3F6F9] rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={decreaseFont}
                className="px-2 py-1 text-xs font-bold hover:bg-slate-200 cursor-pointer min-h-[34px]"
              >
                A−
              </button>
              <button
                onClick={increaseFont}
                className="px-2 py-1 text-xs font-bold hover:bg-slate-200 border-l border-slate-200 cursor-pointer min-h-[34px]"
              >
                A+
              </button>
            </div>

            {/* High Contrast */}
            <button
              onClick={toggleHighContrast}
              title={t('উচ্চ কনট্রাস্ট', 'High Contrast')}
              className={`p-2 rounded-lg cursor-pointer min-h-[36px] ${
                highContrast ? 'bg-black text-white' : 'bg-[#F3F6F9] text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Contrast className="w-4 h-4" />
            </button>

            {/* Notification Bell with Badge (Velzon Style) */}
            <button
              onClick={() => setActiveTab(ROLE_DASHBOARD_MAP[role])}
              className="relative p-2 rounded-lg bg-[#F3F6F9] hover:bg-slate-200 text-slate-700 cursor-pointer min-h-[36px]"
              title={t('নোটিফিকেশন', 'Notifications')}
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#F42A41] text-white text-[10px] font-bold flex items-center justify-center">
                3
              </span>
            </button>

            {/* User Profile Pill (Velzon Top-Right Avatar + Name + Designation) */}
            {user ? (
              <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                <button
                  onClick={() => setActiveTab('profile')}
                  className="flex items-center gap-2.5 text-left cursor-pointer min-h-[38px]"
                >
                  <div className="w-8 h-8 rounded-full bg-[#006A4E] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                    {(lang === 'bn' ? user.full_name_bn : user.full_name_en).slice(0, 1)}
                  </div>
                  <div className="hidden xl:block leading-tight">
                    <div className="text-xs font-bold text-slate-800">
                      {lang === 'bn' ? user.full_name_bn : user.full_name_en}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {lang === 'bn' ? currentRoleMeta.titleBn : currentRoleMeta.titleEn}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    logout();
                    setActiveTab('landing');
                  }}
                  title={t('লগআউট', 'Sign Out')}
                  className="p-1.5 text-slate-400 hover:text-[#F42A41] rounded cursor-pointer min-h-[32px]"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('auth')}
                className="px-3 py-1.5 rounded-lg bg-[#006A4E] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px]"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t('লগইন', 'Sign In')}</span>
              </button>
            )}
          </div>
        </header>

        {/* SUB-HEADER BREADCRUMB BAR (Velzon "DASHBOARD | Dashboards > Dashboard" Bar) */}
        <div className="bg-white border-b border-slate-200/80 px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="font-extrabold uppercase tracking-wider text-slate-700">
            {lang === 'bn' ? currentRoleMeta.titleBn : currentRoleMeta.titleEn}
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <button
              onClick={() => setActiveTab('landing')}
              className="hover:text-[#006A4E] cursor-pointer min-h-0"
            >
              {t('জাতীয় পোর্টাল', 'Portal')}
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-700 font-semibold">
              {lang === 'bn' ? currentRoleMeta.titleBn : currentRoleMeta.titleEn}
            </span>
          </div>
        </div>

        {/* MAIN PANEL WORKSPACE CONTENT */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1440px] w-full mx-auto space-y-6">
          {children}
        </main>

        <InstitutionalFooter lang={lang} t={t} />
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label={t('মোবাইল নেভিগেশন', 'Mobile navigation')}
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-300 z-40 grid grid-cols-5 shadow-lg"
      >
        <MobileNavBtn
          active={activeTab === 'landing'}
          onClick={() => setActiveTab('landing')}
          icon={<Home className="w-5 h-5" />}
          label={t('পোর্টাল', 'Portal')}
        />
        <MobileNavBtn
          active={activeTab === ROLE_DASHBOARD_MAP[role]}
          onClick={() => setActiveTab(ROLE_DASHBOARD_MAP[role])}
          icon={<LayoutDashboard className="w-5 h-5" />}
          label={t('প্যানেল', 'Panel')}
        />
        <MobileNavBtn
          active={activeTab === 'check'}
          onClick={() => setActiveTab('check')}
          icon={<Search className="w-5 h-5" />}
          label={t('দাগ যাচাই', 'Plot Check')}
        />
        <MobileNavBtn
          active={activeTab === 'qr'}
          onClick={() => setActiveTab('qr')}
          icon={<QrCode className="w-5 h-5" />}
          label={t('QR সনদ', 'QR Verify')}
        />
        <MobileNavBtn
          active={activeTab === 'admin'}
          onClick={() => handleRoleChange('admin', true)}
          icon={<Lock className="w-5 h-5" />}
          label={t('অ্যাডমিন', 'Admin')}
        />
      </nav>
    </div>
  );
};

const InstitutionalFooter: React.FC<{
  lang: 'bn' | 'en';
  t: (bn: string, en: string) => string;
}> = ({ t }) => (
  <footer className="bg-white border-t border-slate-200 py-5 px-4 lg:px-6 text-xs text-slate-500 mt-auto">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
      <div>
        <p className="font-bold text-slate-700">
          {t(
            '⚖ আইনি সতর্কবার্তা: ভূমি সুরক্ষা সিস্টেম শুধুমাত্র সম্ভাব্য ঝুঁকি ও অসামঞ্জস্যতা চিহ্নিত করে সংশ্লিষ্ট সরকারি কর্মকর্তার সিদ্ধান্তের জন্য উপস্থাপন করে; এটি চূড়ান্ত আইনি মালিকানা ঘোষণা করে না।',
            '⚖ Statutory Notice: BhumiShield flags discrepancies for an authorized human officer to decide; it never declares final legal truth.'
          )}
        </p>
        <p className="mt-0.5 text-slate-500">
          {t(
            'Demo / ডেমো ডেটা — কারিগরি মানে নির্মিত প্রোটোটাইপ (LandTech Innovation 2026)। প্রদর্শিত সকল নাম, এনআইডি, দাগ ও খতিয়ান সম্পূর্ণ কাল্পনিক।',
            'Demo / ডেমো ডেটা — Industry Handover Prototype (LandTech 2026). All names, NIDs, plots, and khatians are synthetic.'
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="px-2.5 py-1 rounded bg-[#E6F2EE] text-[#006A4E] font-bold">
          Laravel 11 • Ed25519 • SHA-256
        </span>
      </div>
    </div>
  </footer>
);

const MobileNavBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center py-2 px-1 text-[11px] font-bold cursor-pointer ${
      active ? 'text-[#006A4E] bg-[#E6F2EE]' : 'text-slate-600'
    }`}
  >
    {icon}
    <span className="mt-0.5">{label}</span>
  </button>
);
