import React, { useEffect, useState } from 'react';
import { I18nProvider } from './i18n';
import { ActiveTab, NavbarAndLayout } from './components/NavbarAndLayout';
import { CitizenHome } from './pages/CitizenHome';
import { VerifyDeedPage } from './pages/VerifyDeedPage';
import { CheckBeforeYouBuyPage } from './pages/CheckBeforeYouBuyPage';
import { HelpPage } from './pages/HelpPage';
import { SubRegistrarPage } from './pages/SubRegistrarPage';
import { AcLandPage } from './pages/AcLandPage';
import { BankOfficerPage } from './pages/BankOfficerPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [currentRole, setCurrentRole] = useState<string>('citizen');
  const [selectedDeedId, setSelectedDeedId] = useState<string | undefined>(undefined);
  const [selectedPlotId, setSelectedPlotId] = useState<number | undefined>(undefined);
  const [selectedScenario, setSelectedScenario] = useState<any | undefined>(undefined);

  // Support public URL paths `/verify/{deed_id}` and query params `?plot={plot_id}` without login
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/verify/')) {
      const deedPart = path.replace('/verify/', '').trim();
      if (deedPart) {
        setSelectedDeedId(deedPart);
        setActiveTab('verify');
      }
    }
    const params = new URLSearchParams(window.location.search);
    const plotParam = params.get('plot');
    if (plotParam && !Number.isNaN(Number(plotParam))) {
      setSelectedPlotId(Number(plotParam));
      setActiveTab('check_buy');
    }
  }, []);

  const handleCitizenNavigate = (
    tab: ActiveTab,
    params?: { deedId?: string; plotId?: number }
  ) => {
    if (params?.deedId) setSelectedDeedId(params.deedId);
    if (params?.plotId) setSelectedPlotId(params.plotId);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleJumpScenario = (scenario: any, targetTab: ActiveTab) => {
    setSelectedScenario(scenario);
    if (scenario?.plot_id) setSelectedPlotId(Number(scenario.plot_id));
    if (scenario?.deed_id) setSelectedDeedId(String(scenario.deed_id));
    setActiveTab(targetTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <I18nProvider>
      <NavbarAndLayout
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
      >
        {activeTab === 'home' && <CitizenHome onNavigate={handleCitizenNavigate} />}

        {activeTab === 'verify' && (
          <VerifyDeedPage
            initialDeedId={selectedDeedId}
            onBackHome={() => setActiveTab('home')}
            onCheckPlot={(pid) => {
              setSelectedPlotId(pid);
              setActiveTab('check_buy');
            }}
          />
        )}

        {activeTab === 'check_buy' && (
          <CheckBeforeYouBuyPage
            initialPlotId={selectedPlotId}
            onBackHome={() => setActiveTab('home')}
            onOpenDeedVerify={(deedNo) => {
              setSelectedDeedId(deedNo);
              setActiveTab('verify');
            }}
          />
        )}

        {activeTab === 'help' && (
          <HelpPage
            onBackHome={() => setActiveTab('home')}
            onJumpScenario={handleJumpScenario}
          />
        )}

        {activeTab === 'registrar' && (
          <SubRegistrarPage
            initialScenario={selectedScenario}
            onOpenDeedVerify={(deedNo) => {
              setSelectedDeedId(deedNo);
              setActiveTab('verify');
            }}
          />
        )}

        {activeTab === 'acland' && (
          <AcLandPage
            onOpenDeedVerify={(deedNo) => {
              setSelectedDeedId(deedNo);
              setActiveTab('verify');
            }}
          />
        )}

        {activeTab === 'bank' && <BankOfficerPage />}

        {activeTab === 'admin' && (
          <AdminDashboardPage
            onJumpScenario={handleJumpScenario}
            onOpenDeedVerify={(deedNo) => {
              setSelectedDeedId(deedNo);
              setActiveTab('verify');
            }}
          />
        )}
      </NavbarAndLayout>
    </I18nProvider>
  );
};
