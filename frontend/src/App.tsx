import React, { useState, useEffect } from 'react';
import { AppUIProvider, useAppUI } from './i18n';
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
const CadastralMapPage = React.lazy(() => import('./pages/CadastralMapPage').then(m => ({ default: m.CadastralMapPage })));
import { ApplicationsPage } from './pages/ApplicationsPage';
import { SpecialistWorkspacePage } from './pages/SpecialistWorkspacePage';
import { NotFoundPage } from './pages/NotFoundPage';
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
  if (cleanPath.endsWith('/') && cleanPath.length > 1) {
    cleanPath = cleanPath.slice(0, -1);
  }

  if (cleanPath === '' || cleanPath === '/') return 'landing';

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
  if (cleanPath.startsWith('/applications') || cleanPath.startsWith('/transfers')) return 'applications';
  if (cleanPath.startsWith('/specialist') || cleanPath.startsWith('/la') || cleanPath.startsWith('/court')) return 'specialist';
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
  if (tabParam && ['landing', 'home', 'applications', 'specialist', 'check', 'qr', 'help', 'auth', 'registrar', 'acland', 'bank', 'admin', 'profile', 'sale', 'notices', 'blog', 'map', 'offices'].includes(tabParam)) return tabParam;
  return 'notfound';
};

export const AppContent: React.FC = () => {
  const { lang, setLang } = useAppUI();
  const [activeTab, setActiveTabState] = useState<string>(getInitialTab);

  // Synchronize URL on tab change or mount
  const syncUrl = (target: string, replace = false) => {
    let tab = target;
    let query = '';
    if (target.includes('?')) {
      const parts = target.split('?');
      tab = parts[0];
      query = '?' + parts[1];
    }
    const currentUrl = new URL(window.location.href);
    const targetPath = tab === 'landing' ? `/${lang}` : `/${lang}/${tab}`;
    const fullPath = query ? `${targetPath}${query}` : targetPath;
    if (currentUrl.pathname + currentUrl.search !== fullPath) {
      if (replace) {
        window.history.replaceState({ tab }, '', fullPath);
      } else {
        window.history.pushState({ tab }, '', fullPath);
      }
    }
  };

  const setActiveTab = (target: string) => {
    let tab = target;
    if (target.includes('?')) {
      tab = target.split('?')[0];
    }
    setActiveTabState(tab);
    syncUrl(target, false);
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

  // Reset window scroll to top whenever active tab changes (R15)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  return (
    <NavbarAndLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {/* 1. Public Pages (Accessible by All Visitors & Guests) */}
      {activeTab === 'landing' && <LandingPage onNavigate={setActiveTab} />}
      {activeTab === 'check' && <CheckBeforeBuyPage />}
      {activeTab === 'qr' && <VerifyDeedQrPage />}
      {activeTab === 'sale' && <PublicSalePage onNavigate={setActiveTab} />}
      {activeTab === 'notices' && <NoticeboardPage />}
      {activeTab === 'blog' && <EducationalBlogPage />}
      {activeTab === 'map' && <React.Suspense fallback={<div role="status" className="p-10 text-center">{lang === 'bn' ? 'মানচিত্র প্রস্তুত হচ্ছে…' : 'Preparing the map…'}</div>}><CadastralMapPage onNavigate={setActiveTab} /></React.Suspense>}
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
            'dc_acquisition_officer',
            'lawyer_court_user',
            'admin',
          ]}
          roleTitleBn="ব্যবহারকারী প্রোফাইল"
          roleTitleEn="User Profile"
          onNavigate={setActiveTab}
        >
          <AuthPage mode="profile" onSuccessNavigate={setActiveTab} />
        </AuthGuard>
      )}

      {/* 3. Applications & 13-Step Transfer Hub */}
      {activeTab === 'applications' && (
        <AuthGuard
          allowedRoles={['citizen', 'service_point_operator', 'admin', 'system_admin']}
          roleTitleBn="১৩-ধাপের নিরাপদ জমি হস্তান্তর সেবা"
          roleTitleEn="13-Step Secure Land Transfer Service"
          deptBn="ভূমি সেবা ও নিবন্ধন সমন্বয় সেল"
          deptEn="Land Transfer & Registry Coordination Cell"
          onNavigate={setActiveTab}
        >
          <ApplicationsPage onNavigate={setActiveTab} />
        </AuthGuard>
      )}

      {/* 4. Specialist Judicial & Land Acquisition Console */}
      {activeTab === 'specialist' && (
        <AuthGuard
          allowedRoles={['dc_acquisition_officer', 'lawyer_court_user', 'admin', 'system_admin']}
          roleTitleBn="বিশেষায়িত বিচারিক ও অধিগ্রহণ কনসোল"
          roleTitleEn="Specialist Judicial & Acquisition Console"
          deptBn="জেলা প্রশাসন ও দেওয়ানি আদালত ডেস্ক"
          deptEn="District Administration & Civil Court Desk"
          onNavigate={setActiveTab}
        >
          <SpecialistWorkspacePage onNavigate={setActiveTab} />
        </AuthGuard>
      )}

      {/* 5. Explicit 404 Not Found Page */}
      {activeTab === 'notfound' && <NotFoundPage onNavigate={setActiveTab} />}
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
