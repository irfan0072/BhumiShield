import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { OfficerKhatianExplorer } from '../components/OfficerKhatianExplorer';
import { OfficerDeedVerifier } from '../components/OfficerDeedVerifier';
import { AcLandExecutiveDashboard } from '@/components/officials/AcLandExecutiveDashboard';
import {
  AC_LAND_TABS,
  AcLandData,
  AcLandIntent,
  AcLandTabId,
  EMPTY_DATA,
  SectionProps,
} from './acland/shared';
import { MutationsSection } from './acland/MutationsSection';
import { KhatiansSection } from './acland/KhatiansSection';
import { DisputesSection } from './acland/DisputesSection';
import { FieldReportsSection } from './acland/FieldReportsSection';
import { SlaSection } from './acland/SlaSection';
import { AppealsSection } from './acland/AppealsSection';
import { SurveyBatchesSection, StagedSurveyItem } from './acland/SurveyBatchesSection';
import { OnboardingSection } from './acland/OnboardingSection';

export type AcLandTab = AcLandTabId;

export interface AcLandPageProps {
  currentSubPage?: AcLandTab;
  onNavigateSubPage?: (page: string) => void;
  onNavigate?: (tab: string) => void;
}

/** Which list endpoints each role may read (mirrors backend RoleMiddleware::authorize lists). */
const READ = {
  khatians: ['ac_land', 'land_office_assistant', 'settlement_records_officer', 'admin', 'auditor'],
  batches: ['land_office_assistant', 'settlement_records_officer', 'settlement_checker', 'ac_land', 'admin', 'system_admin', 'auditor'],
  appeals: ['appellate_reviewer', 'uno_supervisor', 'ac_land', 'admin', 'system_admin', 'auditor'],
  field: ['field_verification_officer', 'ac_land', 'uno_supervisor', 'admin', 'system_admin', 'auditor'],
};

const asList = (v: any): any[] => (Array.isArray(v) ? v : Array.isArray(v?.items) ? v.items : []);
const isTab = (v?: string | null): v is AcLandTab => !!v && (AC_LAND_TABS as string[]).includes(v);

/**
 * Upazila Land Office workspace (AC Land and the roles that share it).
 * Thin container: loads the data once, keeps it fresh quietly, and switches sections.
 */
export const AcLandPage: React.FC<AcLandPageProps> = ({ currentSubPage, onNavigateSubPage }) => {
  const { role, activeSubTab, setActiveSubTab } = useAppUI();

  const [subTab, setSubTab] = useState<AcLandTab>(() =>
    isTab(currentSubPage) ? currentSubPage : isTab(activeSubTab) ? activeSubTab : 'overview'
  );
  const [data, setData] = useState<AcLandData>(EMPTY_DATA);
  const [loaded, setLoaded] = useState(false);
  const [intent, setIntent] = useState<AcLandIntent | null>(null);
  const [staged, setStaged] = useState<StagedSurveyItem[]>([]);
  const busyRef = useRef(false);

  const loadAcLandData = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    const can = (list: string[]) => list.includes(role);
    const none = Promise.resolve([] as any[]);
    try {
      const [mutations, flaggedKhatians, disputes, plots, batches, appeals, fieldReports, slaDispatches] = await Promise.all([
        BhumiApi.getMutations().catch(() => []),
        can(READ.khatians) ? BhumiApi.listFlaggedKhatians().catch(() => []) : none,
        BhumiApi.listDisputes().catch(() => []),
        can(READ.field) ? BhumiApi.getPlots().catch(() => []) : none,
        can(READ.batches) ? BhumiApi.listOnboardingBatches().catch(() => []) : none,
        can(READ.appeals) ? BhumiApi.listAppeals().catch(() => []) : none,
        can(READ.field) ? BhumiApi.listFieldReports().catch(() => []) : none,
        can(READ.field) ? BhumiApi.listSlaDispatches().catch(() => []) : none,
      ]);
      setData({
        mutations: asList(mutations),
        flaggedKhatians: asList(flaggedKhatians),
        disputes: asList(disputes),
        plots: asList(plots),
        batches: asList(batches),
        appeals: asList(appeals),
        fieldReports: asList(fieldReports),
        slaDispatches: asList(slaDispatches),
      });
    } finally {
      busyRef.current = false;
      setLoaded(true);
    }
  }, [role]);

  // First load, then a quiet background refresh (no loading flag, so open sheets/forms keep their state).
  useEffect(() => {
    loadAcLandData();
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      loadAcLandData();
    }, 30000);
    const onFocus = () => loadAcLandData();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadAcLandData]);

  useEffect(() => {
    if (isTab(currentSubPage)) setSubTab(currentSubPage);
    else if (isTab(activeSubTab)) setSubTab(activeSubTab);
  }, [currentSubPage, activeSubTab]);

  const handleTabChange = (target: AcLandTab) => {
    setSubTab(target);
    setActiveSubTab(target);
    onNavigateSubPage?.(target);
  };

  const openIntent = (i: Omit<AcLandIntent, 'nonce'>) => {
    if (i.create || i.recordId !== undefined) setIntent({ ...i, nonce: Date.now() });
    handleTabChange(i.tab);
  };
  const clearIntent = useCallback(() => setIntent(null), []);

  const props: SectionProps = { data, loaded, reload: loadAcLandData, intent, clearIntent };

  return (
    <div className="h-full min-h-0">
      {subTab === 'overview' && (
        <AcLandExecutiveDashboard
          onNavigateTab={(tab) => handleTabChange(tab as AcLandTab)}
          onOpen={openIntent}
          data={data}
          loaded={loaded}
          stagedCount={staged.length}
        />
      )}
      {subTab === 'mutations' && <MutationsSection {...props} />}
      {subTab === 'khatians' && <KhatiansSection {...props} />}
      {subTab === 'disputes' && <DisputesSection {...props} />}
      {subTab === 'field_reports' && <FieldReportsSection {...props} />}
      {subTab === 'sla_overview' && <SlaSection {...props} />}
      {subTab === 'appeals' && <AppealsSection {...props} />}
      {subTab === 'survey_batches' && <SurveyBatchesSection {...props} staged={staged} setStaged={setStaged} />}
      {subTab === 'onboarding' && <OnboardingSection {...props} />}
      {subTab === 'explorer' && <OfficerKhatianExplorer />}
      {subTab === 'verifier' && <OfficerDeedVerifier />}
    </div>
  );
};
