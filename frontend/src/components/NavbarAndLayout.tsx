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
  KeyRound,
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

const ROLE_LABELS_BN: Record<UserRole, string> = {
  citizen: 'নাগরিক (Citizen)',
  sub_registrar: 'সাব-রেজিস্ট্রার (Sub-Registrar)',
  ac_land: 'এসি ল্যান্ড (AC Land)',
  bank_officer: 'ব্যাংক কর্মকর্তা (Bank)',
  admin: 'অ্যাডমিন ও অডিটর (Admin)',
};

export const NavbarAndLayout: React.FC<LayoutProps> = ({ activeTab, setActiveTab, children }) => {
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

  const handleRoleChange = async (newRole: UserRole) => {
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
      setActiveTab(ROLE_DASHBOARD_MAP[newRole] || 'home');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFA] text-[#1A1A1A] pb-24 md:pb-8">
      {/* Signature Bangladesh National Flag Top Bar */}
      <div className="h-2.5 w-full bg-[#006A4E] flex items-center justify-center relative">
        <div className="w-3.5 h-3.5 rounded-full bg-[#F42A41] border border-white shadow-xs" />
      </div>

      {/* Offline Banner */}
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="bg-[#B7791F] text-white px-4 py-2 text-center font-semibold flex items-center justify-center gap-2"
        >
          <WifiOff className="w-5 h-5" />
          <span>
            {t(
              'অফলাইন মোড: সংরক্ষিত ডেমো তথ্য দেখানো হচ্ছে। ইন্টারনেট সংযোগ ফিরলে লাইভ যাচাই সচল হবে।',
              'Offline Mode: Showing cached shell. Live verification resumes when online.'
            )}
          </span>
        </div>
      )}

      {/* Main Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Brand Logo */}
          <button
            onClick={() => setActiveTab('landing')}
            className="flex items-center gap-3 text-left focus:outline-none group"
          >
            <img
              src="/assets/bhumishield-emblem.svg"
              alt="BhumiShield Emblem"
              className="w-12 h-12 rounded-xl shadow-xs group-hover:scale-105 transition-transform"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl md:text-2xl font-bold text-[#006A4E] tracking-tight">
                  {t('ভূমি সুরক্ষা', 'BhumiShield')}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#E6F2EE] text-[#006A4E] font-semibold border border-[#006A4E]/30">
                  {t('ডেমো', 'DEMO')}
                </span>
              </div>
              <p className="text-xs md:text-sm text-[#5F6B66]">
                {t(
                  'দলিল নিবন্ধনের আগে মালিকানা যাচাই ও অপরিবর্তনীয় লেজার',
                  'Pre-Registration Land Verification & Tamper-Evident Ledger'
                )}
              </p>
            </div>
          </button>

          {/* Accessibility, RBAC Role Switcher & Auth Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* RBAC Role Switcher (Mints Real JWT for Hackathon Demo) */}
            <div className="flex items-center bg-[#E6F2EE] rounded-lg px-2 py-1 border border-[#006A4E]/30">
              <KeyRound className="w-4 h-4 text-[#006A4E] mr-1.5 shrink-0" />
              <label htmlFor="role-select" className="text-xs font-bold text-[#006A4E] mr-1.5">
                {t('ভূমিকা (RBAC):', 'RBAC Role:')}
              </label>
              <select
                id="role-select"
                value={role}
                disabled={switchingRole}
                onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                className="text-sm font-bold text-[#006A4E] bg-transparent focus:outline-none cursor-pointer min-h-[36px]"
              >
                <option value="citizen">{ROLE_LABELS_BN.citizen}</option>
                <option value="sub_registrar">{ROLE_LABELS_BN.sub_registrar}</option>
                <option value="ac_land">{ROLE_LABELS_BN.ac_land}</option>
                <option value="bank_officer">{ROLE_LABELS_BN.bank_officer}</option>
                <option value="admin">{ROLE_LABELS_BN.admin}</option>
              </select>
            </div>

            {/* Text Size A- / A+ */}
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
              <button
                onClick={decreaseFont}
                title={t('লেখা ছোট করুন', 'Decrease text size')}
                aria-label={t('লেখা ছোট করুন', 'Decrease text size')}
                className="px-2.5 py-1.5 text-sm font-bold hover:bg-gray-100 min-h-[40px]"
              >
                A−
              </button>
              <button
                onClick={increaseFont}
                title={t('লেখা বড় করুন', 'Increase text size')}
                aria-label={t('লেখা বড় করুন', 'Increase text size')}
                className="px-2.5 py-1.5 text-base font-bold hover:bg-gray-100 border-l border-gray-300 min-h-[40px]"
              >
                A+
              </button>
            </div>

            {/* High Contrast Toggle */}
            <button
              onClick={toggleHighContrast}
              aria-pressed={highContrast}
              title={t('উচ্চ কনট্রাস্ট মোড', 'High Contrast Mode')}
              className={`px-3 py-1.5 rounded-lg border text-sm font-semibold flex items-center gap-1.5 min-h-[40px] ${
                highContrast
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'
              }`}
            >
              <Contrast className="w-4 h-4" />
              <span className="hidden sm:inline">{t('কনট্রাস্ট', 'Contrast')}</span>
            </button>

            {/* Language Toggle */}
            <button
              onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
              className="px-3 py-1.5 rounded-lg border border-[#006A4E] bg-[#E6F2EE] text-[#006A4E] font-bold text-sm flex items-center gap-1.5 hover:bg-[#006A4E] hover:text-white transition-colors min-h-[40px]"
            >
              <Globe className="w-4 h-4" />
              <span>{lang === 'bn' ? 'English' : 'বাংলা'}</span>
            </button>

            {/* Auth User Pill or Login Button */}
            {user ? (
              <div className="flex items-center gap-1.5 bg-[#E6F2EE] border border-[#006A4E]/30 rounded-lg px-2.5 py-1">
                <button
                  onClick={() => setActiveTab('profile')}
                  className="text-left text-xs font-bold text-[#006A4E] flex items-center gap-1.5 min-h-[32px]"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{lang === 'bn' ? user.full_name_bn : user.full_name_en}</span>
                </button>
                <button
                  onClick={() => {
                    logout();
                    setActiveTab('landing');
                  }}
                  title={t('লগআউট', 'Logout')}
                  className="p-1 text-[#F42A41] hover:bg-red-100 rounded-md min-h-[32px]"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('auth')}
                className="px-3 py-1.5 rounded-lg bg-[#006A4E] text-white font-bold text-sm flex items-center gap-1.5 hover:bg-[#00553e] min-h-[40px]"
              >
                <LogIn className="w-4 h-4" />
                <span>{t('লগইন / নিবন্ধন', 'Login / Register')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Desktop Navigation Bar with Role-Aware Highlighting */}
        <nav
          aria-label={t('প্রধান মেনু', 'Main navigation')}
          className="hidden md:flex max-w-7xl mx-auto px-4 border-t border-gray-100 gap-2 py-1.5 overflow-x-auto"
        >
          <NavBtn
            active={activeTab === 'landing'}
            onClick={() => setActiveTab('landing')}
            icon={<Home className="w-4 h-4" />}
            label={t('হোম ও পরিচিতি', 'Landing')}
          />
          <NavBtn
            active={activeTab === 'home'}
            onClick={() => setActiveTab('home')}
            icon={<ShieldCheck className="w-4 h-4" />}
            label={t('নাগরিক ড্যাশবোর্ড', 'Citizen Vault')}
            badge={role === 'citizen' ? 'ACTIVE' : undefined}
          />
          <NavBtn
            active={activeTab === 'qr'}
            onClick={() => setActiveTab('qr')}
            icon={<QrCode className="w-4 h-4" />}
            label={t('QR দলিল যাচাই', 'Verify Deed QR')}
          />
          <NavBtn
            active={activeTab === 'check'}
            onClick={() => setActiveTab('check')}
            icon={<Search className="w-4 h-4" />}
            label={t('কেনার আগে যাচাই', 'Check Before Buy')}
          />
          <NavBtn
            active={activeTab === 'registrar'}
            onClick={() => setActiveTab('registrar')}
            icon={<FileSpreadsheet className="w-4 h-4" />}
            label={t('সাব-রেজিস্ট্রার কনসোল', 'Sub-Registrar')}
            badge={role === 'sub_registrar' ? 'RBAC' : undefined}
          />
          <NavBtn
            active={activeTab === 'acland'}
            onClick={() => setActiveTab('acland')}
            icon={<Landmark className="w-4 h-4" />}
            label={t('এসি ল্যান্ড কনসোল', 'AC Land')}
            badge={role === 'ac_land' ? 'RBAC' : undefined}
          />
          <NavBtn
            active={activeTab === 'bank'}
            onClick={() => setActiveTab('bank')}
            icon={<Building2 className="w-4 h-4" />}
            label={t('ব্যাংক মর্টগেজ কনসোল', 'Bank Officer')}
            badge={role === 'bank_officer' ? 'RBAC' : undefined}
          />
          <NavBtn
            active={activeTab === 'admin'}
            onClick={() => setActiveTab('admin')}
            icon={<Lock className="w-4 h-4" />}
            label={t('অ্যাডমিন ও অডিট কনসোল', 'Admin & RBAC')}
            badge={role === 'admin' ? 'RBAC' : undefined}
          />
          <NavBtn
            active={activeTab === 'help'}
            onClick={() => setActiveTab('help')}
            icon={<HelpCircle className="w-4 h-4" />}
            label={t('সাহায্য', 'Help')}
          />
        </nav>
      </header>

      {/* Active RBAC Session Strip */}
      <div className="bg-[#006A4E]/5 border-b border-[#006A4E]/15 px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#006A4E] text-white font-bold">
              RBAC Middleware: {role.toUpperCase()}
            </span>
            <span className="text-gray-700 font-medium">
              {user
                ? `${t('সক্রিয় অ্যাকাউন্ট:', 'Active User:')} ${lang === 'bn' ? user.full_name_bn : user.full_name_en} (${user.office_name || 'Citizen Portal'})`
                : t('ডেমো রোল মোড সক্রিয়', 'Demo Role Session Active')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab(ROLE_DASHBOARD_MAP[role])}
              className="text-[#006A4E] font-bold underline cursor-pointer min-h-0"
            >
              {t('আমার রোল ড্যাশবোর্ডে যান →', 'Go to My Role Dashboard →')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">{children}</main>

      {/* Footer with Mandatory Hackathon Disclaimers */}
      <footer className="bg-white border-t border-gray-200 mt-12 py-6 px-4 text-sm text-[#5F6B66]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <p className="font-bold text-[#1A1A1A]">
              {t(
                '⚠ আইনি সতর্কবার্তা: ভূমি সুরক্ষা শুধুমাত্র ঝুঁকি চিহ্নিত করে মানব কর্মকর্তার সিদ্ধান্তের জন্য উপস্থাপন করে। এটি কোনো চূড়ান্ত আইনি মালিকানা ঘোষণা করে না।',
                '⚠ Legal Disclaimer: BhumiShield flags risk for a human officer to decide. It never declares final legal truth.'
              )}
            </p>
            <p className="mt-1">
              {t(
                'Demo / ডেমো ডেটা — LandTech Innovation Hackathon 2026 (Daffodil International University). সকল নাম, এনআইডি, দাগ ও খতিয়ান সম্পূর্ণ কাল্পনিক।',
                'Demo / ডেমো ডেটা — LandTech Innovation Hackathon 2026 (DIU). All names, NIDs, plots, and khatians are 100% synthetic.'
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1 rounded-full bg-[#E6F2EE] text-[#006A4E] font-bold text-xs">
              Laravel 11 + RBAC + Ed25519 + SHA-256
            </span>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label={t('মোবাইল নেভিগেশন', 'Mobile navigation')}
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 z-40 grid grid-cols-4 shadow-lg"
      >
        <MobileNavBtn
          active={activeTab === 'home' || activeTab === 'landing'}
          onClick={() => setActiveTab('home')}
          icon={<ShieldCheck className="w-6 h-6" />}
          label={t('হোম', 'Home')}
        />
        <MobileNavBtn
          active={activeTab === 'qr'}
          onClick={() => setActiveTab('qr')}
          icon={<QrCode className="w-6 h-6" />}
          label={t('QR যাচাই', 'QR Scan')}
        />
        <MobileNavBtn
          active={activeTab === 'check'}
          onClick={() => setActiveTab('check')}
          icon={<Search className="w-6 h-6" />}
          label={t('জমি যাচাই', 'Check Buy')}
        />
        <MobileNavBtn
          active={['registrar', 'acland', 'bank', 'admin'].includes(activeTab)}
          onClick={() => setActiveTab(ROLE_DASHBOARD_MAP[role] === 'home' ? 'admin' : ROLE_DASHBOARD_MAP[role])}
          icon={<Lock className="w-6 h-6" />}
          label={t('ড্যাশবোর্ড', 'Console')}
        />
      </nav>
    </div>
  );
};

const NavBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}> = ({ active, onClick, icon, label, badge }) => (
  <button
    onClick={onClick}
    className={`px-3 py-2 rounded-lg font-semibold text-sm flex items-center gap-1.5 whitespace-nowrap transition-colors min-h-[42px] ${
      active
        ? 'bg-[#006A4E] text-white shadow-xs'
        : 'text-gray-700 hover:bg-[#E6F2EE] hover:text-[#006A4E]'
    }`}
  >
    {icon}
    <span>{label}</span>
    {badge && (
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
          active ? 'bg-white text-[#006A4E]' : 'bg-[#006A4E] text-white'
        }`}
      >
        {badge}
      </span>
    )}
  </button>
);

const MobileNavBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center py-2 px-1 text-xs font-bold ${
      active ? 'text-[#006A4E] bg-[#E6F2EE]' : 'text-gray-600'
    }`}
  >
    {icon}
    <span className="mt-1">{label}</span>
  </button>
);
