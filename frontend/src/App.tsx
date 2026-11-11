import React, { useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient, useHealth } from './api/queries';
import { AppUIProvider, useAppUI } from './i18n';
import { NavbarAndLayout } from './components/NavbarAndLayout';
import { AuthGuard } from './components/AuthGuard';
import { OfficialWorkspaceShell } from './components/officials/OfficialWorkspaceShell';
import { CitizenShell } from './components/citizen/CitizenShell';
import { LandingPage } from './pages/LandingPage';
import { PageSkeleton } from './components/PageSkeleton';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PersistentHelpModal } from './components/PersistentHelpModal';

const CitizenHome = React.lazy(() => import('./pages/CitizenHome').then(m => ({ default: m.CitizenHome })));
const CitizenProfilePage = React.lazy(() => import('./pages/CitizenProfilePage').then(m => ({ default: m.CitizenProfilePage })));
const CitizenSettingsPage = React.lazy(() => import('./pages/CitizenSettingsPage').then(m => ({ default: m.CitizenSettingsPage })));
const CheckBeforeBuyPage = React.lazy(() => import('./pages/CheckBeforeBuyPage').then(m => ({ default: m.CheckBeforeBuyPage })));
const VerifyDeedQrPage = React.lazy(() => import('./pages/VerifyDeedQrPage').then(m => ({ default: m.VerifyDeedQrPage })));
const SubRegistrarPage = React.lazy(() => import('./pages/SubRegistrarPage').then(m => ({ default: m.SubRegistrarPage })));
const AcLandPage = React.lazy(() => import('./pages/AcLandPage').then(m => ({ default: m.AcLandPage })));
const BankOfficerPage = React.lazy(() => import('./pages/BankOfficerPage').then(m => ({ default: m.BankOfficerPage })));
const AdminMasterWorkspace = React.lazy(() => import('./pages/admin/AdminMasterWorkspace').then(m => ({ default: m.AdminMasterWorkspace })));
const AdminDashboardPage = React.lazy(() => import('./pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const HelpPage = React.lazy(() => import('./pages/HelpPage').then(m => ({ default: m.HelpPage })));
const AuthPage = React.lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));
const PublicSalePage = React.lazy(() => import('./pages/PublicSalePage').then(m => ({ default: m.PublicSalePage })));
const NoticeboardPage = React.lazy(() => import('./pages/NoticeboardPage').then(m => ({ default: m.NoticeboardPage })));
const EducationalBlogPage = React.lazy(() => import('./pages/EducationalBlogPage').then(m => ({ default: m.EducationalBlogPage })));
const OfficeLocatorPage = React.lazy(() => import('./pages/OfficeLocatorPage').then(m => ({ default: m.OfficeLocatorPage })));
const CadastralMapPage = React.lazy(() => import('./pages/CadastralMapPage').then(m => ({ default: m.CadastralMapPage })));
const ApplicationsPage = React.lazy(() => import('./pages/ApplicationsPage').then(m => ({ default: m.ApplicationsPage })));
const SpecialistWorkspacePage = React.lazy(() => import('./pages/SpecialistWorkspacePage').then(m => ({ default: m.SpecialistWorkspacePage })));
const LawyerCaseFilingPage = React.lazy(() => import('./pages/LawyerCaseFilingPage').then(m => ({ default: m.LawyerCaseFilingPage })));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

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
  // Lawyer portal must be matched before the specialist '/la…' prefix, or '/lawyer-case' opens the wrong workspace.
  if (cleanPath.startsWith('/lawyer-case') || cleanPath.startsWith('/lawyercase') || cleanPath.startsWith('/lawyer')) return 'lawyer_case';
  if (cleanPath.startsWith('/specialist') || cleanPath === '/la' || cleanPath.startsWith('/la/') || cleanPath.startsWith('/la-') || cleanPath.startsWith('/court')) return 'specialist';
  if (cleanPath.startsWith('/sale') || cleanPath.startsWith('/marketplace')) return 'sale';
  if (cleanPath.startsWith('/notices') || cleanPath.startsWith('/circulars')) return 'notices';
  if (cleanPath.startsWith('/blog')) return 'blog';
  if (cleanPath.startsWith('/map') || cleanPath.startsWith('/cadastral')) return 'map';
  if (cleanPath.startsWith('/offices')) return 'offices';
  if (cleanPath.startsWith('/help')) return 'help';
  if (cleanPath.startsWith('/home') || cleanPath.startsWith('/portal') || cleanPath.startsWith('/my/land') || cleanPath.startsWith('/my/transfers') || cleanPath.startsWith('/my/tickets')) return 'home';
  if (cleanPath.startsWith('/registrar')) return 'registrar';
  if (cleanPath.startsWith('/acland')) return 'acland';
  if (cleanPath.startsWith('/bank')) return 'bank';
  if (cleanPath.startsWith('/admin')) return 'admin';
  if (cleanPath.startsWith('/auth') || cleanPath.startsWith('/login')) return 'auth';
  if (cleanPath.startsWith('/profile')) return 'profile';
  if (cleanPath.startsWith('/settings')) return 'settings';

  const tabParam = search.get('tab');
  if (tabParam === 'cadastral') return 'map';
  if (tabParam && ['landing', 'home', 'applications', 'specialist', 'check', 'qr', 'help', 'auth', 'registrar', 'acland', 'bank', 'admin', 'profile', 'settings', 'sale', 'notices', 'blog', 'map', 'offices', 'lawyer_case'].includes(tabParam)) return tabParam;
  return 'notfound';
};

export const AppContent: React.FC = () => {
  const { lang, setLang, user } = useAppUI();
  const [activeTab, setActiveTabState] = useState<string>(getInitialTab);
  const { isColdStarting, coldStartMessageBn, coldStartMessageEn } = useHealth();

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

    // Preserve existing subpath if present and on the same main tab (e.g. /bn/registrar/wizard -> /en/registrar/wizard)
    let subpath = '';
    const pathParts = currentUrl.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      const firstIsLang = pathParts[0] === 'bn' || pathParts[0] === 'en';
      const currentMainTab = firstIsLang ? pathParts[1] : pathParts[0];
      if (currentMainTab === tab && (firstIsLang ? pathParts.length > 2 : pathParts.length > 1)) {
        subpath = '/' + (firstIsLang ? pathParts.slice(2).join('/') : pathParts.slice(1).join('/'));
      }
    }

    const targetPath = tab === 'landing' ? `/${lang}` : `/${lang}/${tab}${subpath}`;
    const fullPath = query ? `${targetPath}${query}` : targetPath;
    if (currentUrl.pathname + currentUrl.search !== fullPath) {
      if (replace) {
        window.history.replaceState({ tab }, '', fullPath);
      } else {
        window.history.pushState({ tab }, '', fullPath);
      }
      // Public pages read their ?params on popstate. Tell them when only the query changed
      // (e.g. help -> help?tab=fees), since pushState itself fires no event.
      const PUBLIC_QUERY_TABS = ['help', 'blog', 'notices', 'map', 'check', 'qr', 'offices', 'sale'];
      const prevTab = (() => {
        const p = currentUrl.pathname.split('/').filter(Boolean);
        return p[0] === 'bn' || p[0] === 'en' ? p[1] : p[0];
      })();
      if (query && prevTab === tab && PUBLIC_QUERY_TABS.includes(tab)) {
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }
  };

  const setActiveTab = (target: string) => {
    let tab = target;
    if (target.includes('?')) {
      tab = target.split('?')[0];
    }
    if (tab === 'cadastral') {
      tab = 'map';
      target = target.replace(/^cadastral/, 'map');
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

  // Dedicated Official Enterprise Workspace (Completely different layout from citizen panel)
  if (activeTab === 'admin') {
    return (
      <>
        <React.Suspense fallback={<PageSkeleton />}>
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
            <AdminMasterWorkspace onNavigate={setActiveTab} />
          </AuthGuard>
        </React.Suspense>

        {isColdStarting && (
          <div className="fixed top-0 inset-x-0 z-50 bg-[#C4891A] text-white text-center py-2 px-4 font-bold text-xs sm:text-sm shadow-md animate-pulse flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white animate-ping" />
            <span>{lang === 'bn' ? coldStartMessageBn : coldStartMessageEn}</span>
          </div>
        )}
      </>
    );
  }

  // 1. Sub-Registrar Enterprise Workspace
  if (activeTab === 'registrar') {
    return (
      <>
        <React.Suspense fallback={<PageSkeleton />}>
          <AuthGuard
            allowedRoles={['sub_registrar', 'registry_data_officer', 'admin', 'system_admin']}
            roleTitleBn="সাব-রেজিস্ট্রার কনসোল"
            roleTitleEn="Sub-Registrar Console"
            deptBn="নিবন্ধন অধিদপ্তর • আইন, বিচার ও সংসদ বিষয়ক মন্ত্রণালয়"
            deptEn="Directorate of Registration • Ministry of Law"
            onNavigate={setActiveTab}
          >
            <OfficialWorkspaceShell workspaceType="registrar" onNavigateMainTab={setActiveTab}>
              <SubRegistrarPage onNavigate={setActiveTab} />
            </OfficialWorkspaceShell>
          </AuthGuard>
        </React.Suspense>

        {isColdStarting && (
          <div className="fixed top-0 inset-x-0 z-50 bg-[#C4891A] text-white text-center py-2 px-4 font-bold text-xs sm:text-sm shadow-md animate-pulse flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white animate-ping" />
            <span>{lang === 'bn' ? coldStartMessageBn : coldStartMessageEn}</span>
          </div>
        )}
      </>
    );
  }

  // 2. AC Land & Revenue Court Enterprise Workspace
  if (activeTab === 'acland') {
    return (
      <>
        <React.Suspense fallback={<PageSkeleton />}>
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
            <OfficialWorkspaceShell workspaceType="acland" onNavigateMainTab={setActiveTab}>
              <AcLandPage onNavigate={setActiveTab} />
            </OfficialWorkspaceShell>
          </AuthGuard>
        </React.Suspense>

        {isColdStarting && (
          <div className="fixed top-0 inset-x-0 z-50 bg-[#C4891A] text-white text-center py-2 px-4 font-bold text-xs sm:text-sm shadow-md animate-pulse flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white animate-ping" />
            <span>{lang === 'bn' ? coldStartMessageBn : coldStartMessageEn}</span>
          </div>
        )}
      </>
    );
  }

  // 3. Bank Mortgage & Credit Desk Enterprise Workspace
  if (activeTab === 'bank') {
    return (
      <>
        <React.Suspense fallback={<PageSkeleton />}>
          <AuthGuard
            allowedRoles={['bank_officer', 'bank_manager', 'admin', 'system_admin']}
            roleTitleBn="ব্যাংক মর্টগেজ ও লিয়েন কনসোল"
            roleTitleEn="Bank Mortgage & Lien Console"
            deptBn="তফসিলি বাণিজ্যিক ব্যাংক জামানত বিভাগ"
            deptEn="Scheduled Bank Collateral & Lien Division"
            onNavigate={setActiveTab}
          >
            <OfficialWorkspaceShell workspaceType="bank" onNavigateMainTab={setActiveTab}>
              <BankOfficerPage />
            </OfficialWorkspaceShell>
          </AuthGuard>
        </React.Suspense>

        {isColdStarting && (
          <div className="fixed top-0 inset-x-0 z-50 bg-[#C4891A] text-white text-center py-2 px-4 font-bold text-xs sm:text-sm shadow-md animate-pulse flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white animate-ping" />
            <span>{lang === 'bn' ? coldStartMessageBn : coldStartMessageEn}</span>
          </div>
        )}
      </>
    );
  }

  // 4. Lawyer & Civil Court Portal Enterprise Workspace
  if (activeTab === 'lawyer_case') {
    return (
      <>
        <React.Suspense fallback={<PageSkeleton />}>
          <AuthGuard
            allowedRoles={['lawyer_court_user', 'admin', 'system_admin']}
            roleTitleBn="আইনজীবী ও দেওয়ানি আদালত পোর্টাল"
            roleTitleEn="Lawyer & Civil Court Portal"
            deptBn="বাংলাদেশ বার কাউন্সিল তালিকাভুক্ত আইনজীবী কনসোল"
            deptEn="Bar Council Empaneled Advocate Console"
            onNavigate={setActiveTab}
          >
            <OfficialWorkspaceShell workspaceType="lawyer" onNavigateMainTab={setActiveTab}>
              <LawyerCaseFilingPage onNavigateHome={() => setActiveTab('home')} />
            </OfficialWorkspaceShell>
          </AuthGuard>
        </React.Suspense>

        {isColdStarting && (
          <div className="fixed top-0 inset-x-0 z-50 bg-[#C4891A] text-white text-center py-2 px-4 font-bold text-xs sm:text-sm shadow-md animate-pulse flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white animate-ping" />
            <span>{lang === 'bn' ? coldStartMessageBn : coldStartMessageEn}</span>
          </div>
        )}
      </>
    );
  }

  // 5. Specialist Judicial & Land Acquisition Workspace
  if (activeTab === 'specialist') {
    return (
      <>
        <React.Suspense fallback={<PageSkeleton />}>
          <AuthGuard
            allowedRoles={['dc_acquisition_officer', 'admin', 'system_admin']}
            roleTitleBn="বিশেষায়িত বিচারিক ও অধিগ্রহণ কনসোল"
            roleTitleEn="Specialist Judicial & Acquisition Console"
            deptBn="জেলা প্রশাসন ও দেওয়ানি আদালত ডেস্ক"
            deptEn="District Administration & Civil Court Desk"
            onNavigate={setActiveTab}
          >
            <OfficialWorkspaceShell workspaceType="specialist" onNavigateMainTab={setActiveTab}>
              <SpecialistWorkspacePage onNavigate={setActiveTab} />
            </OfficialWorkspaceShell>
          </AuthGuard>
        </React.Suspense>

        {isColdStarting && (
          <div className="fixed top-0 inset-x-0 z-50 bg-[#C4891A] text-white text-center py-2 px-4 font-bold text-xs sm:text-sm shadow-md animate-pulse flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white animate-ping" />
            <span>{lang === 'bn' ? coldStartMessageBn : coldStartMessageEn}</span>
          </div>
        )}
      </>
    );
  }

  // 6. Citizen Portal Workspace (home, applications, profile, settings)
  if (
    activeTab === 'home' ||
    activeTab === 'applications' ||
    activeTab === 'profile' ||
    activeTab === 'settings'
  ) {
    return (
      <>
        <React.Suspense fallback={<PageSkeleton />}>
          {activeTab === 'home' && (
            <AuthGuard
              allowedRoles={['citizen', 'service_point_operator', 'admin', 'system_admin']}
              roleTitleBn="নাগরিক ভূমি পোর্টাল"
              roleTitleEn="Citizen Land Portal"
              deptBn="নাগরিক সেবা ও ভূমি সুরক্ষা ভল্ট"
              deptEn="Citizen Property Vault & Verification"
              onNavigate={setActiveTab}
            >
              <CitizenShell activeTab="home" onNavigate={setActiveTab}>
                <CitizenHome onNavigate={setActiveTab} />
              </CitizenShell>
            </AuthGuard>
          )}

          {activeTab === 'applications' && (
            <AuthGuard
              allowedRoles={['citizen', 'service_point_operator', 'admin', 'system_admin']}
              roleTitleBn="১৩-ধাপের নিরাপদ জমি হস্তান্তর সেবা"
              roleTitleEn="13-Step Secure Land Transfer Service"
              deptBn="ভূমি সেবা ও নিবন্ধন সমন্বয় সেল"
              deptEn="Land Transfer & Registry Coordination Cell"
              onNavigate={setActiveTab}
            >
              <CitizenShell activeTab="applications" onNavigate={setActiveTab}>
                <ApplicationsPage onNavigate={setActiveTab} />
              </CitizenShell>
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
              <CitizenShell activeTab="profile" onNavigate={setActiveTab}>
                <CitizenProfilePage onNavigate={setActiveTab} />
              </CitizenShell>
            </AuthGuard>
          )}

          {activeTab === 'settings' && (
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
              roleTitleBn="নাগরিক সেটিংস ও নিরাপত্তা"
              roleTitleEn="Citizen Settings & Security"
              onNavigate={setActiveTab}
            >
              <CitizenShell activeTab="settings" onNavigate={setActiveTab}>
                <CitizenSettingsPage onNavigate={setActiveTab} />
              </CitizenShell>
            </AuthGuard>
          )}
        </React.Suspense>

        {isColdStarting && (
          <div className="fixed top-0 inset-x-0 z-50 bg-[#C4891A] text-white text-center py-2 px-4 font-bold text-xs sm:text-sm shadow-md animate-pulse flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white animate-ping" />
            <span>{lang === 'bn' ? coldStartMessageBn : coldStartMessageEn}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <NavbarAndLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      <React.Suspense fallback={<PageSkeleton />}>
        {/* 1. Public Pages (Accessible by All Visitors & Guests) */}
        {activeTab === 'landing' && <LandingPage onNavigate={setActiveTab} />}
        {activeTab === 'check' && <CheckBeforeBuyPage />}
        {activeTab === 'qr' && <VerifyDeedQrPage />}
        {activeTab === 'sale' && <PublicSalePage onNavigate={setActiveTab} />}
        {activeTab === 'notices' && <NoticeboardPage />}
        {activeTab === 'blog' && <EducationalBlogPage />}
        {(activeTab === 'map' || activeTab === 'cadastral') && <CadastralMapPage onNavigate={setActiveTab} />}
        {activeTab === 'offices' && <OfficeLocatorPage onNavigate={setActiveTab} />}
        {activeTab === 'help' && <HelpPage onNavigate={setActiveTab} />}
        {activeTab === 'auth' && <AuthPage mode="login" onSuccessNavigate={setActiveTab} />}

        {/* 5. Explicit 404 Not Found Page */}
        {activeTab === 'notfound' && <NotFoundPage onNavigate={setActiveTab} />}
      </React.Suspense>
    </NavbarAndLayout>

    {/* Render Cold-Start Alert Notification Banner */}
    {isColdStarting && (
      <div className="fixed top-0 inset-x-0 z-50 bg-[#C4891A] text-white text-center py-2 px-4 font-bold text-xs sm:text-sm shadow-md animate-pulse flex items-center justify-center gap-2">
        <span className="h-2 w-2 rounded-full bg-white animate-ping" />
        <span>{lang === 'bn' ? coldStartMessageBn : coldStartMessageEn}</span>
      </div>
    )}

    {/* Persistent 16122 Helpline & Triage Modal */}
    <PersistentHelpModal onNavigate={setActiveTab} />


    </>
  );
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AppUIProvider>
          <AppContent />
        </AppUIProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
