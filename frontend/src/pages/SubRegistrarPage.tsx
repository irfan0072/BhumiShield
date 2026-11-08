import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { OfficerKhatianExplorer } from '../components/OfficerKhatianExplorer';
import { OfficerDeedVerifier } from '../components/OfficerDeedVerifier';
import { SubRegistrarDashboard } from '@/components/officials/SubRegistrarDashboard';
import { AdminPage, notify, useCreateIntent } from '@/components/admin/kit';
import { DeedsSection } from './registrar/DeedsSection';
import { NewDeedWizard } from './registrar/NewDeedWizard';
import { FeesSection } from './registrar/FeesSection';
import { OnboardingSection } from './registrar/OnboardingSection';
import type { DeedDraftPrefill } from './registrar/shared';

export type SubRegistrarTab = 'overview' | 'wizard' | 'held' | 'deeds' | 'khatian' | 'verifier' | 'fees' | 'onboarding';

export interface SubRegistrarPageProps {
  currentSubPage?: SubRegistrarTab;
  onNavigateSubPage?: (page: string) => void;
  onNavigate?: (tab: string) => void;
}

const TABS: SubRegistrarTab[] = ['overview', 'wizard', 'held', 'deeds', 'khatian', 'verifier', 'fees', 'onboarding'];
const isTab = (v: any): v is SubRegistrarTab => TABS.includes(v);

const asList = (v: any): any[] => (Array.isArray(v) ? v : Array.isArray(v?.items) ? v.items : []);

export const SubRegistrarPage: React.FC<SubRegistrarPageProps> = ({ currentSubPage, onNavigateSubPage }) => {
  const { lang, role, activeSubTab, setActiveSubTab } = useAppUI();
  const isChecker = role === 'sub_registrar' || role === 'admin' || role === 'system_admin';

  const [localTab, setLocalTab] = useState<SubRegistrarTab>(() =>
    isTab(activeSubTab) ? activeSubTab : role === 'registry_data_officer' ? 'wizard' : 'overview'
  );
  const tab: SubRegistrarTab = isTab(currentSubPage) ? currentSubPage : localTab;

  const go = useCallback(
    (target: string) => {
      if (!isTab(target)) return;
      setLocalTab(target);
      setActiveSubTab(target);
      onNavigateSubPage?.(target);
    },
    [onNavigateSubPage, setActiveSubTab]
  );

  useEffect(() => {
    if (!currentSubPage && isTab(activeSubTab) && activeSubTab !== localTab) setLocalTab(activeSubTab);
  }, [activeSubTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useCreateIntent(() => go('wizard'));

  /* ---------------- data ---------------- */
  const [deeds, setDeeds] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefill, setPrefill] = useState<DeedDraftPrefill | null>(null);
  const errorShown = useRef(false);

  /** Deeds + batches. Quiet (no loading skeleton) after the first load. */
  const loadLists = useCallback(async () => {
    const [dds, bts] = await Promise.all([
      BhumiApi.listRegistrarDeeds().catch((e) => {
        if (!errorShown.current) {
          errorShown.current = true;
          notify.err(e, lang);
        }
        return null;
      }),
      BhumiApi.listOnboardingBatches().catch(() => null),
    ]);
    if (dds) {
      errorShown.current = false;
      setDeeds(asList(dds));
    }
    if (bts) setBatches(asList(bts));
  }, [lang]);

  useEffect(() => {
    let alive = true;
    Promise.all([
      loadLists(),
      BhumiApi.getPlots()
        .then((p) => alive && setPlots(asList(p)))
        .catch(() => undefined),
      BhumiApi.getPersons()
        .then((p) => alive && setPersons(asList(p)))
        .catch(() => undefined),
    ]).finally(() => alive && setLoading(false));

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') loadLists();
    }, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------------- sections ---------------- */
  switch (tab) {
    case 'wizard':
      return (
        <div className="h-full min-h-0">
          <NewDeedWizard
            plots={plots}
            persons={persons}
            isChecker={isChecker}
            prefill={prefill}
            onPrefillUsed={() => setPrefill(null)}
            onDone={loadLists}
          />
        </div>
      );
    case 'held':
    case 'deeds':
      return (
        <div className="h-full min-h-0">
          <DeedsSection key={tab} mode={tab} deeds={deeds} loading={loading} isChecker={isChecker} onReload={loadLists} />
        </div>
      );
    case 'fees':
      return (
        <div className="h-full min-h-0">
          <FeesSection />
        </div>
      );
    case 'onboarding':
      return (
        <div className="h-full min-h-0">
          <OnboardingSection
            batches={batches}
            loading={loading}
            isChecker={isChecker}
            onReload={loadLists}
            onUseDraft={(d) => {
              setPrefill(d);
              go('wizard');
            }}
          />
        </div>
      );
    case 'khatian':
      return <OfficerKhatianExplorer />;
    case 'verifier':
      return <OfficerDeedVerifier />;
    case 'overview':
    default:
      return (
        <div className="h-full min-h-0">
          <AdminPage>
            <SubRegistrarDashboard
              onNavigateTab={go}
              deedsList={deeds}
              batches={batches}
              loading={loading}
              isChecker={isChecker}
            />
          </AdminPage>
        </div>
      );
  }
};
