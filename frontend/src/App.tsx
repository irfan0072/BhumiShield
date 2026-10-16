import React, { useState } from 'react';
import { AppUIProvider } from './i18n';
import { NavbarAndLayout } from './components/NavbarAndLayout';
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

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('landing');

  return (
    <NavbarAndLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'landing' && <LandingPage onNavigate={setActiveTab} />}
      {activeTab === 'home' && <CitizenHome onNavigate={setActiveTab} />}
      {activeTab === 'check' && <CheckBeforeBuyPage />}
      {activeTab === 'qr' && <VerifyDeedQrPage />}
      {activeTab === 'registrar' && <SubRegistrarPage />}
      {activeTab === 'acland' && <AcLandPage />}
      {activeTab === 'bank' && <BankOfficerPage />}
      {activeTab === 'admin' && <AdminDashboardPage />}
      {activeTab === 'help' && <HelpPage onNavigate={setActiveTab} />}
      {activeTab === 'auth' && <AuthPage mode="login" onSuccessNavigate={setActiveTab} />}
      {activeTab === 'profile' && <AuthPage mode="profile" onSuccessNavigate={setActiveTab} />}
    </NavbarAndLayout>
  );
};

export function App() {
  return (
    <AppUIProvider>
      <AppContent />
    </AppUIProvider>
  );
}

export default App;
