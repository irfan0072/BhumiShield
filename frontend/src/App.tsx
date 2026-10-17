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
import { ErrorBoundary } from './components/ErrorBoundary';

const getInitialTab = (): string => {
  const path = window.location.pathname.toLowerCase();
  const search = new URLSearchParams(window.location.search);
  if (
    path.startsWith('/verify') ||
    path.startsWith('/noc') ||
    search.has('h') ||
    search.has('deed_no') ||
    search.has('noc_no')
  ) {
    return 'qr';
  }
  if (path.startsWith('/check') || search.has('plot_id')) {
    return 'check';
  }
  if (path.startsWith('/help')) return 'help';
  if (path.startsWith('/home')) return 'home';
  if (path.startsWith('/registrar')) return 'registrar';
  if (path.startsWith('/acland')) return 'acland';
  if (path.startsWith('/bank')) return 'bank';
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/auth')) return 'auth';
  const tabParam = search.get('tab');
  if (tabParam && ['landing', 'home', 'check', 'qr', 'help', 'auth', 'registrar', 'acland', 'bank', 'admin', 'profile'].includes(tabParam)) return tabParam;
  return 'landing';
};

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTabState] = useState<string>(getInitialTab);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    // synchronize URL without reload
    const currentUrl = new URL(window.location.href);
    currentUrl.pathname = '/';
    currentUrl.search = '';
    currentUrl.hash = '';
    if (tab !== 'landing') currentUrl.searchParams.set('tab', tab);
    window.history.replaceState({}, '', currentUrl.toString());
  };

  return (
    <NavbarAndLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {/* 1. Public Pages (Accessible by All Visitors & Guests) */}
      {activeTab === 'landing' && <LandingPage onNavigate={setActiveTab} />}
      {activeTab === 'check' && <CheckBeforeBuyPage />}
      {activeTab === 'qr' && <VerifyDeedQrPage />}
      {activeTab === 'help' && <HelpPage onNavigate={setActiveTab} />}
      {activeTab === 'auth' && <AuthPage mode="login" onSuccessNavigate={setActiveTab} />}

      {/* 2. Role Protected Workspaces (Guarded by Strict RBAC AuthGuard) */}
      {activeTab === 'home' && (
        <AuthGuard
          allowedRoles={['citizen', 'admin']}
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
          allowedRoles={['sub_registrar', 'admin']}
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
          allowedRoles={['ac_land', 'admin']}
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
          allowedRoles={['bank_officer', 'admin']}
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
          allowedRoles={['admin']}
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
          allowedRoles={['citizen', 'sub_registrar', 'ac_land', 'bank_officer', 'admin']}
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
