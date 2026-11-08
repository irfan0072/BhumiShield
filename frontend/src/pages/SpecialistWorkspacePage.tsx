import React, { useEffect, useRef, useState } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { notify } from '@/components/admin/kit';
import { SpecialistAcquisitionDashboard } from '@/components/officials/SpecialistAcquisitionDashboard';
import { LaCasesSection, LaTab } from './specialist/LaCasesSection';
import { TitleScrutinySection } from './specialist/TitleScrutinySection';
import { AcquisitionNoticeDialog, AcquisitionCasePayload } from './specialist/AcquisitionNoticeDialog';
import { InjunctionDialog, CourtOrderPayload } from './specialist/InjunctionDialog';

export interface SpecialistWorkspacePageProps {
  currentSubPage?: string;
  onNavigateSubPage?: (page: string) => void;
  onNavigate?: (tab: string) => void;
}

type View = 'overview' | 'la_cases' | 'title_scrutiny';

/** Maps every known sub-page id (shell menu ids plus older in-page ids) to a view. */
const toView = (id?: string | null): View => {
  if (id === 'la_cases' || id === 'disputes') return 'la_cases';
  if (id === 'title_scrutiny' || id === 'plot_lookup') return 'title_scrutiny';
  return 'overview';
};

const toList = (res: any): any[] => (Array.isArray(res) ? res : res?.items || []);

export const SpecialistWorkspacePage: React.FC<SpecialistWorkspacePageProps> = ({ currentSubPage, onNavigateSubPage, onNavigate }) => {
  const { lang, t, role, activeSubTab, setActiveSubTab } = useAppUI();
  const roleKey = String(role);
  const isDcRole = roleKey === 'dc_acquisition_officer';
  const isLawyerRole = roleKey === 'lawyer_court_user';
  const isAdmin = roleKey === 'admin' || roleKey === 'system_admin';
  // Backend: POST /admin/acquisition/cases → admin, system_admin, dc_acquisition_officer.
  const canCreateCase = isDcRole || isAdmin;
  // Backend: POST /citizen/disputes → citizen, admin (system_admin).
  const canLogOrder = isAdmin;

  const [localSub, setLocalSub] = useState<string>(() => currentSubPage || activeSubTab || 'overview');
  const subTab = currentSubPage || localSub;
  const view = toView(subTab);

  const [laTab, setLaTab] = useState<LaTab>(subTab === 'disputes' ? 'disputes' : 'cases');
  const keepLaTab = useRef(false);
  useEffect(() => {
    if (subTab === 'disputes') setLaTab('disputes');
    else if (subTab === 'la_cases' && !keepLaTab.current) setLaTab('cases');
    keepLaTab.current = false;
  }, [subTab]);

  useEffect(() => {
    if (!currentSubPage && activeSubTab) setLocalSub(activeSubTab);
  }, [activeSubTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubTabChange = (tabId: string) => {
    let target = tabId;
    if (tabId === 'disputes') {
      setLaTab('disputes');
      keepLaTab.current = true;
      target = 'la_cases';
    } else if (tabId === 'la_cases') {
      setLaTab('cases');
    } else if (tabId === 'plot_lookup') {
      target = 'title_scrutiny';
    }
    setLocalSub(target);
    if (onNavigateSubPage) onNavigateSubPage(target);
    else setActiveSubTab?.(target);
  };

  const [plots, setPlots] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [acquisitions, setAcquisitions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPlotId, setSelectedPlotId] = useState<number | null>(null);

  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticePlotIds, setNoticePlotIds] = useState<number[]>([]);
  const [orderPlot, setOrderPlot] = useState<any | null>(null);

  const loadData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    const disputesPromise = isLawyerRole
      ? BhumiApi.getMyLawyerCases().then(toList).catch(() => [])
      : BhumiApi.listDisputes().then(toList).catch(() => []);
    const casesPromise = isLawyerRole
      ? Promise.resolve([])
      : BhumiApi.listAcquisitionCases()
          .then(toList)
          .catch((e) => {
            notify.err(e, lang);
            return [];
          });
    const [p, d, a] = await Promise.all([BhumiApi.getPlots().then(toList).catch(() => []), disputesPromise, casesPromise]);
    setPlots(p);
    setDisputes(d);
    setAcquisitions(a);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openNotice = (plotIds: number[] = []) => {
    setNoticePlotIds(plotIds);
    setNoticeOpen(true);
  };

  const openPlot = (plotId: number) => {
    setSelectedPlotId(plotId);
    handleSubTabChange('title_scrutiny');
  };

  /** createAcquisitionCase → toast + reload. Throws so the dialog stays open on error. */
  const handleIssueAcquisitionNotice = async (payload: AcquisitionCasePayload) => {
    try {
      const res = await BhumiApi.createAcquisitionCase(payload);
      notify.ok(res?.message_bn && lang === 'bn' ? res.message_bn : t('নোটিশ জারি হয়েছে', 'Notice issued'));
      await loadData(true);
    } catch (e) {
      notify.err(e, lang);
      throw e;
    }
  };

  /** fileDispute → toast + reload. Throws so the dialog stays open on error. */
  const handleLogCourtInjunction = async (payload: CourtOrderPayload) => {
    try {
      await BhumiApi.fileDispute(payload);
      notify.ok(t('আদালত আদেশ যুক্ত হয়েছে', 'Court order added'));
      await loadData(true);
    } catch (e) {
      notify.err(e, lang);
      throw e;
    }
  };

  return (
    <div className="h-full min-h-0">
      {view === 'overview' && (
        <SpecialistAcquisitionDashboard
          onNavigateTab={handleSubTabChange}
          cases={acquisitions}
          disputes={disputes}
          loading={loading}
          canCreate={canCreateCase}
          onNewNotice={() => openNotice()}
          onOpenPlot={openPlot}
        />
      )}

      {view === 'la_cases' && (
        <LaCasesSection
          cases={acquisitions}
          disputes={disputes}
          plots={plots}
          loading={loading}
          tab={laTab}
          onTabChange={setLaTab}
          canCreate={canCreateCase}
          onCreate={() => openNotice()}
          onOpenPlot={openPlot}
        />
      )}

      {view === 'title_scrutiny' && (
        <TitleScrutinySection
          plots={plots}
          disputes={disputes}
          cases={acquisitions}
          loading={loading}
          selectedPlotId={selectedPlotId}
          onSelectPlot={setSelectedPlotId}
          canCreateCase={canCreateCase}
          canLogOrder={canLogOrder}
          onNewNotice={(id) => openNotice([id])}
          onLogOrder={(p) => setOrderPlot(p)}
          onOpenCases={() => handleSubTabChange('la_cases')}
          onOpenFullCheck={onNavigate ? () => onNavigate('check') : undefined}
        />
      )}

      {canCreateCase && (
        <AcquisitionNoticeDialog
          open={noticeOpen}
          onOpenChange={setNoticeOpen}
          plots={plots}
          initialPlotIds={noticePlotIds}
          onSubmit={handleIssueAcquisitionNotice}
        />
      )}

      {canLogOrder && (
        <InjunctionDialog
          open={!!orderPlot}
          onOpenChange={(o) => !o && setOrderPlot(null)}
          plot={orderPlot}
          onSubmit={handleLogCourtInjunction}
        />
      )}
    </div>
  );
};
