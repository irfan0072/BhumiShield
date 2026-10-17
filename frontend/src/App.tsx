import React, { useState } from 'react';
import { AppUIProvider } from './i18n';
import { NavbarAndLayout } from './components/NavbarAndLayout';
import { AuthGuard } from './components/AuthGuard';
import { LandingPage } from './pages/LandingPage';
import { CitizenHome } from './pages/CitizenHome';
import { CheckBeforeBuyPage } from './pages/CheckBeforeBuyPage';
import { VerifyDeedQrPage } from './pages/VerifyDeedQrPage';
import { SubRegistrarPage } from './pages/SubRegistrarPage';
import { AcLandPage } from './pages/AcLandPage';
import { BankOfficerPage } from './pages/BankOfficerPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { HelpPage } from './pages/HelpPage';
import { AuthPage } from './pages/AuthPage';
import { PublicSalePage } from './pages/PublicSalePage';
import { NoticeboardPage } from './pages/NoticeboardPage';
import { EducationalBlogPage } from './pages/EducationalBlogPage';
import { OfficeLocatorPage } from './pages/OfficeLocatorPage';
import { CadastralMapPage } from './pages/CadastralMapPage';
import { ErrorBoundary } from './components/ErrorBoundary';

const getInitialTab = (): string => {
  const path = window.location.pathname.toLowerCase();
  const search = new URLSearchParams(window.location.search);

  // Strip leading /bn or /en prefix if present
  let cleanPath = path;
  if (cleanPath.startsWith('/bn') || cleanPath.startsWith('/en')) {
    cleanPath = cleanPath.substring(3);
  }
  if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;

  if (
    cleanPath.startsWith('/verify') ||
    cleanPath.startsWith('/noc') ||
    cleanPath.startsWith('/qr') ||
    search.has('h') ||
    search.has('deed_no') ||
    search.has('noc_no')
  ) {
    return 'qr';
  }
  if (cleanPath.startsWith('/check') || search.has('plot_id')) {
    return 'check';
  }
  if (cleanPath.startsWith('/sale') || cleanPath.startsWith('/marketplace')) return 'sale';
  if (cleanPath.startsWith('/notices') || cleanPath.startsWith('/circulars')) return 'notices';
  if (cleanPath.startsWith('/blog')) return 'blog';
  if (cleanPath.startsWith('/map')) return 'map';
  if (cleanPath.startsWith('/offices')) return 'offices';
  if (cleanPath.startsWith('/help')) return 'help';
  if (cleanPath.startsWith('/home') || cleanPath.startsWith('/portal') || cleanPath.startsWith('/my/land') || cleanPath.startsWith('/my/transfers') || cleanPath.startsWith('/my/tickets')) return 'home';
  if (cleanPath.startsWith('/registrar')) return 'registrar';
  if (cleanPath.startsWith('/acland')) return 'acland';
  if (cleanPath.startsWith('/bank')) return 'bank';
  if (cleanPath.startsWith('/admin')) return 'admin';
  if (cleanPath.startsWith('/auth') || cleanPath.startsWith('/login')) return 'auth';
  if (cleanPath.startsWith('/profile')) return 'profile';

  const tabParam = search.get('tab');
  if (tabParam && ['landing', 'home', 'check', 'qr', 'help', 'auth', 'registrar', 'acland', 'bank', 'admin', 'profile', 'sale', 'notices', 'blog', 'map', 'offices'].includes(tabParam)) return tabParam;
  return 'landing';
};

export const AppContent: React.FC = () => {
  const { lang, setLang } = useAppUI();
  const [activeTab, setActiveTabState] = useState<string>(getInitialTab);

  // Synchronize URL on tab change or mount
  const syncUrl = (tab: string, replace = false) => {
    const currentUrl = new URL(window.location.href);
    const targetPath = tab === 'landing' ? `/${lang}` : `/${lang}/${tab}`;
    if (currentUrl.pathname !== targetPath) {
      if (replace) {
        window.history.replaceState({ tab }, '', targetPath);
      } else {
        window.history.pushState({ tab }, '', targetPath);
      }
    }
  };

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    syncUrl(tab, false);
  };

  // On mount and popstate, keep tab in sync with browser URL
  useEffect(() => {
    const handlePopState = () => {
      const tab = getInitialTab();
      setActiveTabState(tab);
    };
    window.addEventListener('popstate', handlePopState);

    // Initial normalization: ensure /bn or /en prefix exists in URL
    const pathname = window.location.pathname;
    if (!pathname.startsWith('/bn') && !pathname.startsWith('/en')) {
      syncUrl(activeTab, true);
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [lang]);

  return (
    <NavbarAndLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {/* 1. Public Pages (Accessible by All Visitors & Guests) */}
      {activeTab === 'landing' && <LandingPage onNavigate={setActiveTab} />}
      {activeTab === 'check' && <CheckBeforeBuyPage />}
      {activeTab === 'qr' && <VerifyDeedQrPage />}
      {activeTab === 'sale' && <PublicSalePage onNavigate={setActiveTab} />}
      {activeTab === 'notices' && <NoticeboardPage />}
      {activeTab === 'blog' && <EducationalBlogPage />}
      {activeTab === 'map' && <CadastralMapPage onNavigate={setActiveTab} />}
      {activeTab === 'offices' && <OfficeLocatorPage onNavigate={setActiveTab} />}
      {activeTab === 'help' && <HelpPage onNavigate={setActiveTab} />}
      {activeTab === 'auth' && <AuthPage mode="login" onSuccessNavigate={setActiveTab} />}

      {/* 2. Role Protected Workspaces (Guarded by Strict RBAC AuthGuard) */}
      {activeTab === 'home' && (
        <AuthGuard
          allowedRoles={['citizen', 'service_point_operator', 'admin', 'system_admin']}
          roleTitleBn="নাগরিক ভূমি পোর্টাল"
          roleTitleEn="Citizen Land Portal"
          deptBn="নাগরিক সেবা ও ভূমি সুরক্ষা ভল্ট"
          deptEn="Citizen Property Vault & Verification"
          onNavigate={setActiveTab}
        >
          <CitizenHome onNavigate={setActiveTab} />
        </AuthGuard>
      )}

      {activeTab === 'registrar' && (
        <AuthGuard
          allowedRoles={['sub_registrar', 'registry_data_officer', 'admin', 'system_admin']}
          roleTitleBn="সাব-রেজিস্ট্রার কনসোল"
          roleTitleEn="Sub-Registrar Console"
          deptBn="নিবন্ধন অধিদপ্তর • আইন, বিচার ও সংসদ বিষয়ক মন্ত্রণালয়"
          deptEn="Directorate of Registration • Ministry of Law"
          onNavigate={setActiveTab}
        >
          <SubRegistrarPage onNavigate={setActiveTab} />
        </AuthGuard>
      )}

      {activeTab === 'acland' && (
        <AuthGuard
          allowedRoles={[
            'ac_land',
            'land_office_assistant',
            'field_verification_officer',
            'settlement_records_officer',
            'settlement_checker',
            'uno_supervisor',
            'appellate_reviewer',
            'admin',
            'system_admin',
          ]}
          roleTitleBn="সহকারী কমিশনার (ভূমি) কনসোল"
          roleTitleEn="Assistant Commissioner of Land Console"
          deptBn="উপজেলা ভূমি অফিস • ভূমি মন্ত্রণালয়"
          deptEn="Upazila Land Office • Ministry of Land"
          onNavigate={setActiveTab}
        >
          <AcLandPage />
        </AuthGuard>
      )}

      {activeTab === 'bank' && (
        <AuthGuard
          allowedRoles={['bank_officer', 'bank_manager', 'admin', 'system_admin']}
          roleTitleBn="ব্যাংক মর্টগেজ ও লিয়েন কনসোল"
          roleTitleEn="Bank Mortgage & Lien Console"
          deptBn="তফসিলি বাণিজ্যিক ব্যাংক জামানত বিভাগ"
          deptEn="Scheduled Bank Collateral & Lien Division"
          onNavigate={setActiveTab}
        >
          <BankOfficerPage />
        </AuthGuard>
      )}

      {activeTab === 'admin' && (
        <AuthGuard
          allowedRoles={[
            'admin',
            'system_admin',
            'auditor',
            'support_agent',
            'platform_moderator',
            'content_editor',
            'content_approver',
          ]}
          roleTitleBn="জাতীয় অ্যাডমিন ও অডিট কনসোল"
          roleTitleEn="National System Admin & Audit Console"
          deptBn="কেন্দ্রীয় ক্রিপ্টোগ্রাফিক লেজার ও সিস্টেম গভর্ন্যান্স"
          deptEn="Central Cryptographic Ledger Governance"
          onNavigate={setActiveTab}
        >
          <AdminDashboardPage onNavigate={setActiveTab} />
        </AuthGuard>
      )}

      {activeTab === 'profile' && (
        <AuthGuard
          allowedRoles={[
            'citizen',
            'service_point_operator',
            'sub_registrar',
            'registry_data_officer',
            'ac_land',
            'land_office_assistant',
            'field_verification_officer',
            'settlement_records_officer',
            'settlement_checker',
            'uno_supervisor',
            'appellate_reviewer',
            'bank_officer',
            'bank_manager',
            'support_agent',
            'platform_moderator',
            'content_editor',
            'content_approver',
            'system_admin',
            'auditor',
            'admin',
          ]}
          roleTitleBn="ব্যবহারকারী প্রোফাইল"
          roleTitleEn="User Profile"
          onNavigate={setActiveTab}
        >
          <AuthPage mode="profile" onSuccessNavigate={setActiveTab} />
        </AuthGuard>
      )}
    </NavbarAndLayout>
  );
};

export function App() {
  return (
    <ErrorBoundary>
      <AppUIProvider>
        <AppContent />
      </AppUIProvider>
    </ErrorBoundary>
  );
}

export default App;
