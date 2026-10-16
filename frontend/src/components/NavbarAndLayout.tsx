import React, { useEffect, useState } from 'react';
import {
  Home,
  QrCode,
  Search,
  FileCheck2,
  Landmark,
  Building2,
  Shield,
  Contrast,
  WifiOff,
  HelpCircle,
  Sparkles,
  LogIn,
  UserCheck,
  PhoneCall,
} from 'lucide-react';
import { useI18n } from '../i18n';

export type ActiveTab =
  | 'landing'
  | 'auth'
  | 'home'
  | 'verify'
  | 'check_buy'
  | 'help'
  | 'registrar'
  | 'acland'
  | 'bank'
  | 'admin';

interface LayoutProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentRole: string;
  setCurrentRole: (role: string) => void;
  currentUser?: any | null;
  siteSettings?: Record<string, any>;
  children: React.ReactNode;
}

export const NavbarAndLayout: React.FC<LayoutProps> = ({
  activeTab,
  setActiveTab,
  currentRole,
  setCurrentRole,
  currentUser,
  siteSettings,
  children,
}) => {
  const { lang, toggleLang, stepFontSize, highContrast, toggleHighContrast, t } = useI18n();
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleRoleSwitch = (role: string) => {
    setCurrentRole(role);
    if (role === 'citizen') setActiveTab('home');
    if (role === 'sub_registrar') setActiveTab('registrar');
    if (role === 'ac_land') setActiveTab('acland');
    if (role === 'bank_officer') setActiveTab('bank');
    if (role === 'admin') setActiveTab('admin');
  };

  const portalTitleBn = siteSettings?.portal_title_bn || 'ভূমি সুরক্ষা (BhumiShield)';
  const portalTitleEn = siteSettings?.portal_title_en || 'BhumiShield';
  const helpline = siteSettings?.helpline_number || '১৬১২২ (ভূমি সেবা হটলাইন - ডেমো)';

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFA] text-[#1A1A1A] pb-24 md:pb-0">
      {/* Top Government-Grade Utility Bar */}
      <div className="no-print bg-[#004D38] text-white text-xs px-4 py-1.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F42A41]" />
            <span className="font-semibold">
              {t(
                'জাতীয় ডিজিটাল ভূমি নিবন্ধন ও নামজারি ট্রাস্ট লেয়ার — LandTech 2026',
                'National Digital Land Registration & Mutation Trust Layer — LandTech 2026'
              )}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex items-center gap-1">
              <PhoneCall className="w-3.5 h-3.5 text-green-300" />
              <span>{helpline}</span>
            </span>
            {currentUser ? (
              <button
                type="button"
                onClick={() => setActiveTab('auth')}
                className="font-bold text-green-200 hover:underline cursor-pointer"
              >
                👤 {t(currentUser.full_name_bn, currentUser.full_name_en)} ({currentUser.role})
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('auth')}
                className="font-bold text-green-200 hover:underline cursor-pointer"
              >
                🔑 {t('লগইন / নিবন্ধন করুন', 'Sign In / Register')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Offline PWA Banner */}
      {isOffline && (
        <div
          role="status"
          className="bg-[#B7791F] text-white px-4 py-2 text-center font-semibold flex items-center justify-center gap-2"
        >
          <WifiOff className="w-5 h-5" />
          <span>
            {t(
              'অফলাইন মোড — ইন্টারনেট সংযোগ নেই। সংরক্ষিত অ্যাপ শেল প্রদর্শিত হচ্ছে।',
              'Offline Mode — No internet connection. Showing cached PWA shell.'
            )}
          </span>
        </div>
      )}

      {/* Main Header */}
      <header className="no-print bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Brand Logo with Custom Emblem SVG */}
          <button
            type="button"
            onClick={() => setActiveTab('landing')}
            className="flex items-center gap-3 text-left cursor-pointer group min-h-[48px]"
          >
            <img
              src="/assets/bhumishield-emblem.svg"
              alt="BhumiShield Emblem"
              className="w-11 h-11 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-bold text-[#006A4E] tracking-tight">
                  {t(portalTitleBn, portalTitleEn)}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E6F2EE] text-[#006A4E] border border-[#006A4E]/30">
                  {t('ডেমো', 'DEMO')}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#5F6B66]">
                {t(
                  'নিবন্ধন-পূর্ব দলিল যাচাই ও হ্যাশ-চেইন লেজার',
                  'Pre-Registration Verification & Tamper-Evident Deed Ledger'
                )}
              </p>
            </div>
          </button>

          {/* Accessibility, Auth & Role Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Role Switcher for Hackathon Demo */}
            <label className="flex items-center gap-1.5 text-sm font-medium bg-[#E6F2EE] text-[#006A4E] px-3 py-1.5 rounded-xl border border-[#006A4E]/30 min-h-[48px]">
              <span className="hidden sm:inline">{t('ভূমিকা:', 'Role:')}</span>
              <select
                aria-label={t('ব্যবহারকারীর ভূমিকা নির্বাচন করুন', 'Select Demo Role')}
                value={currentRole}
                onChange={(e) => handleRoleSwitch(e.target.value)}
                className="bg-transparent font-bold text-[#006A4E] focus:outline-none cursor-pointer"
              >
                <option value="citizen">{t('👤 নাগরিক (Citizen)', '👤 Citizen')}</option>
                <option value="sub_registrar">
                  {t('🖋️ সাব-রেজিস্ট্রার (Sub-Registrar)', '🖋️ Sub-Registrar')}
                </option>
                <option value="ac_land">{t('🏛️ এসি ল্যান্ড (AC Land)', '🏛️ AC Land Officer')}</option>
                <option value="bank_officer">
                  {t('🏦 ব্যাংক কর্মকর্তা (Bank)', '🏦 Bank Officer')}
                </option>
                <option value="admin">{t('🛡️ অ্যাডমিন ও সেটিংস (Admin)', '🛡️ Admin & Settings')}</option>
              </select>
            </label>

            {/* Login / User Profile Button */}
            <button
              type="button"
              onClick={() => setActiveTab('auth')}
              className={`min-h-[48px] px-3.5 rounded-xl border font-bold text-sm flex items-center gap-1.5 cursor-pointer ${
                currentUser
                  ? 'bg-[#E6F2EE] text-[#006A4E] border-[#006A4E]/40'
                  : 'bg-white text-[#1A1A1A] border-gray-300 hover:bg-gray-100'
              }`}
            >
              {currentUser ? <UserCheck className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              <span className="hidden sm:inline">
                {currentUser
                  ? currentUser.username
                  : t('লগইন / নিবন্ধন', 'Sign In')}
              </span>
            </button>

            {/* A- / A+ Text Size Controls */}
            <div
              className="flex items-center rounded-xl border border-gray-300 bg-white overflow-hidden"
              role="group"
              aria-label={t('লেখার আকার পরিবর্তন', 'Text size controls')}
            >
              <button
                type="button"
                onClick={() => stepFontSize(-1)}
                className="min-w-[42px] min-h-[48px] px-2 font-bold text-sm hover:bg-gray-100 cursor-pointer"
                title={t('লেখা ছোট করুন (A−)', 'Decrease text size (A−)')}
              >
                A−
              </button>
              <button
                type="button"
                onClick={() => stepFontSize(1)}
                className="min-w-[42px] min-h-[48px] px-2 font-bold text-base border-l border-gray-300 hover:bg-gray-100 cursor-pointer"
                title={t('লেখা বড় করুন (A+)', 'Increase text size (A+)')}
              >
                A+
              </button>
            </div>

            {/* High Contrast Toggle */}
            <button
              type="button"
              onClick={toggleHighContrast}
              aria-pressed={highContrast}
              className={`min-h-[48px] px-3 rounded-xl border font-semibold text-sm flex items-center gap-1.5 cursor-pointer ${
                highContrast
                  ? 'bg-black text-yellow-300 border-black'
                  : 'bg-white text-[#1A1A1A] border-gray-300 hover:bg-gray-100'
              }`}
              title={t('উচ্চ কনট্রাস্ট মোড', 'High Contrast Mode')}
            >
              <Contrast className="w-4 h-4" />
              <span className="hidden xl:inline">{t('কনট্রাস্ট', 'Contrast')}</span>
            </button>

            {/* Language Toggle (Bangla Default / English) */}
            <button
              type="button"
              onClick={toggleLang}
              className="min-h-[48px] px-3.5 rounded-xl bg-[#006A4E] text-white font-bold text-sm hover:bg-[#00563F] transition cursor-pointer"
            >
              {lang === 'bn' ? 'English' : 'বাংলা'}
            </button>
          </div>
        </div>

        {/* Desktop Navigation Bar */}
        <nav
          aria-label={t('প্রধান নেভিগেশন', 'Main Navigation')}
          className="hidden md:block bg-[#E6F2EE]/70 border-t border-[#006A4E]/15"
        >
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto py-1.5">
            <NavBtn
              active={activeTab === 'landing'}
              onClick={() => setActiveTab('landing')}
              icon={<Sparkles className="w-4 h-4" />}
              label={t('ল্যান্ডিং পেজ', 'Landing Page')}
            />
            <NavBtn
              active={activeTab === 'home'}
              onClick={() => setActiveTab('home')}
              icon={<Home className="w-4 h-4" />}
              label={t('নাগরিক ড্যাশবোর্ড', 'Citizen Home')}
            />
            <NavBtn
              active={activeTab === 'verify'}
              onClick={() => setActiveTab('verify')}
              icon={<QrCode className="w-4 h-4" />}
              label={t('QR দলিল যাচাই', 'Verify Deed QR')}
            />
            <NavBtn
              active={activeTab === 'check_buy'}
              onClick={() => setActiveTab('check_buy')}
              icon={<Search className="w-4 h-4" />}
              label={t('কেনার আগে যাচাই', 'Check Before You Buy')}
            />
            <NavBtn
              active={activeTab === 'registrar'}
              onClick={() => setActiveTab('registrar')}
              icon={<FileCheck2 className="w-4 h-4" />}
              label={t('সাব-রেজিস্ট্রার', 'Sub-Registrar')}
            />
            <NavBtn
              active={activeTab === 'acland'}
              onClick={() => setActiveTab('acland')}
              icon={<Landmark className="w-4 h-4" />}
              label={t('এসি ল্যান্ড (নামজারি)', 'AC Land (Mutation)')}
            />
            <NavBtn
              active={activeTab === 'bank'}
              onClick={() => setActiveTab('bank')}
              icon={<Building2 className="w-4 h-4" />}
              label={t('ব্যাংক বন্ধক', 'Bank Collateral')}
            />
            <NavBtn
              active={activeTab === 'admin'}
              onClick={() => setActiveTab('admin')}
              icon={<Shield className="w-4 h-4" />}
              label={t('অ্যাডমিন, ইউজার ও সেটিংস', 'Admin, Users & Settings')}
            />
            <NavBtn
              active={activeTab === 'help'}
              onClick={() => setActiveTab('help')}
              icon={<HelpCircle className="w-4 h-4" />}
              label={t('সাহায্য', 'Help')}
            />
          </div>
        </nav>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">{children}</main>

      {/* Footer with Mandatory Demo Data & Legal Truth Disclaimers */}
      <footer className="no-print bg-white border-t border-gray-200 mt-12 py-6 px-4 text-sm text-[#5F6B66]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-bold text-[#1A1A1A]">
              {t(
                'ভূমি সুরক্ষা (BhumiShield) — LandTech Innovation Hackathon 2026 (Daffodil International University)',
                'BhumiShield — LandTech Innovation Hackathon 2026 (Daffodil International University)'
              )}
            </p>
            <p className="mt-1">
              {t(
                '⚖️ এটি শুধুমাত্র ঝুঁকি চিহ্নিত করে মানব কর্মকর্তাকে সহায়তা করে; চূড়ান্ত আইনি সিদ্ধান্ত সংশ্লিষ্ট সরকারি কর্মকর্তার।',
                '⚖️ Flags risk for a human officer to decide. Never declares final legal truth.'
              )}
            </p>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-[#FEECEE] text-[#C81E32] font-bold border border-[#F42A41]/30 shrink-0">
            {t('Demo / ডেমো ডেটা — ১০০% কাল্পনিক তথ্য', 'Demo / ডেমো ডেটা — 100% Synthetic Dummy Data')}
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (4 Big Labelled Icons, >=48x48px touch targets) */}
      <nav
        aria-label={t('মোবাইল নেভিগেশন', 'Mobile Bottom Navigation')}
        className="no-print md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#006A4E]/20 z-40 grid grid-cols-4 shadow-lg"
      >
        <MobileNavBtn
          active={activeTab === 'landing' || activeTab === 'home'}
          onClick={() => setActiveTab('home')}
          icon={<Home className="w-6 h-6" />}
          label={t('হোম', 'Home')}
        />
        <MobileNavBtn
          active={activeTab === 'verify'}
          onClick={() => setActiveTab('verify')}
          icon={<QrCode className="w-6 h-6" />}
          label={t('QR যাচাই', 'Verify')}
        />
        <MobileNavBtn
          active={activeTab === 'check_buy'}
          onClick={() => setActiveTab('check_buy')}
          icon={<Search className="w-6 h-6" />}
          label={t('জমি যাচাই', 'Plot Check')}
        />
        <MobileNavBtn
          active={['registrar', 'acland', 'bank', 'admin', 'auth'].includes(activeTab)}
          onClick={() => setActiveTab('admin')}
          icon={<Shield className="w-6 h-6" />}
          label={t('ড্যাশবোর্ড', 'Dashboards')}
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
}> = ({ active, onClick, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`min-h-[48px] px-3.5 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
      active
        ? 'bg-[#006A4E] text-white shadow-xs'
        : 'text-[#1A1A1A] hover:bg-[#006A4E]/10'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const MobileNavBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`min-h-[56px] py-2 px-1 flex flex-col items-center justify-center gap-1 text-xs font-bold cursor-pointer ${
      active ? 'text-[#006A4E] bg-[#E6F2EE]' : 'text-[#5F6B66]'
    }`}
  >
    {icon}
    <span className="truncate max-w-full">{label}</span>
  </button>
);
