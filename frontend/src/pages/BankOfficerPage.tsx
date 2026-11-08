import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { OfficerKhatianExplorer } from '../components/OfficerKhatianExplorer';
import { triggerAppNotification } from '../components/NotificationCenter';
import { BankOfficerDashboard } from '@/components/officials/BankOfficerDashboard';
import { notify, useCreateIntent } from '@/components/admin/kit';
import { MortgageListSection } from './bank/MortgageListSection';
import { NewLienForm } from './bank/NewLienForm';
import { NocDialog } from './bank/NocDialog';

export type BankTab = 'overview' | 'mortgages' | 'new_lien' | 'noc' | 'khatian';

export interface BankOfficerPageProps {
  currentSubPage?: BankTab;
  onNavigateSubPage?: (page: string) => void;
}

const TABS: BankTab[] = ['overview', 'mortgages', 'new_lien', 'noc', 'khatian'];
const isTab = (v: any): v is BankTab => TABS.includes(v);

export const BankOfficerPage: React.FC<BankOfficerPageProps> = ({ currentSubPage, onNavigateSubPage }) => {
  const { lang, role, activeSubTab, setActiveSubTab, t } = useAppUI();
  const subTab: BankTab = isTab(currentSubPage) ? currentSubPage : isTab(activeSubTab) ? activeSubTab : 'overview';

  // Backend (POST /mortgages, /mortgages/{id}/release) allows bank_officer, bank_manager and admin, scoped to their own bank.
  const canWrite = role === 'bank_officer' || role === 'bank_manager' || role === 'admin' || role === 'system_admin';

  const [plots, setPlots] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [mortgages, setMortgages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [noc, setNoc] = useState<any | null>(null);
  const [prefillPlotId, setPrefillPlotId] = useState<number | undefined>(undefined);
  const errShown = useRef(false);

  const go = useCallback(
    (tab: string) => {
      if (onNavigateSubPage) onNavigateSubPage(tab);
      else setActiveSubTab(tab);
    },
    [onNavigateSubPage, setActiveSubTab]
  );

  useCreateIntent(() => go('new_lien'));

  const loadMortgages = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        setMortgages(await BhumiApi.getMortgages());
        errShown.current = false;
      } catch (e) {
        if (!quiet || !errShown.current) notify.err(e, lang, t('বন্ধক তালিকা লোড হয়নি', 'Could not load mortgages'));
        errShown.current = true;
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [lang, t]
  );

  useEffect(() => {
    loadMortgages();
    Promise.all([BhumiApi.getPlots(), BhumiApi.getPersons()])
      .then(([p, per]) => {
        setPlots(p);
        setPersons(per);
      })
      .catch((e) => notify.err(e, lang, t('জমির তথ্য লোড হয়নি', 'Could not load land data')));
    // Quiet background refresh: keeps lists current without resetting any open panel.
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') loadMortgages(true);
    }, 30000);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const release = async (m: any) => {
    try {
      const res = await BhumiApi.releaseMortgage(m.id);
      notify.ok((lang === 'bn' ? res?.message_bn : res?.message_en) || t('বন্ধক অবমুক্ত হয়েছে', 'Lien released'));
      triggerAppNotification({
        title_bn: 'বন্ধক অবমুক্ত ও ছাড়পত্র জারি',
        title_en: 'Lien released, NOC issued',
        message_bn: `বন্ধক #${m.id} অবমুক্ত হয়েছে।`,
        message_en: `Mortgage #${m.id} released.`,
        type: 'SUCCESS',
        targetTab: 'bank',
        targetSection: 'noc',
      });
      await loadMortgages(true);
    } catch (e) {
      notify.err(e, lang, t('অবমুক্ত করা যায়নি', 'Could not release'));
      throw e;
    }
  };

  const viewNoc = async (id: number) => {
    try {
      setNoc(await BhumiApi.getMortgageNoc(id));
    } catch (e) {
      notify.err(e, lang, t('ছাড়পত্র লোড হয়নি', 'Could not load NOC'));
    }
  };

  const listProps = {
    items: mortgages,
    loading,
    canCreate: canWrite,
    canRelease: canWrite,
    onReload: () => loadMortgages(),
    onCreate: () => go('new_lien'),
    onRelease: release,
    onViewNoc: viewNoc,
  };

  return (
    <div className="h-full min-h-0">
      {subTab === 'overview' && (
        <BankOfficerDashboard onNavigateTab={go} mortgagesList={mortgages} loading={loading} canCreate={canWrite} />
      )}

      {subTab === 'mortgages' && <MortgageListSection key="mortgages" mode="mortgages" {...listProps} />}
      {subTab === 'noc' && <MortgageListSection key="noc" mode="noc" {...listProps} />}

      {subTab === 'new_lien' && (
        <NewLienForm
          plots={plots}
          persons={persons}
          canCreate={canWrite}
          initialPlotId={prefillPlotId}
          onCreated={() => {
            setPrefillPlotId(undefined);
            loadMortgages(true);
            go('mortgages');
          }}
        />
      )}

      {subTab === 'khatian' && (
        <OfficerKhatianExplorer
          onSelectPlotForAction={(plotId) => {
            setPrefillPlotId(plotId);
            go('new_lien');
          }}
          actionLabel={canWrite ? t('এই দাগে বন্ধক', 'Mortgage this plot') : undefined}
          actionType="lien"
        />
      )}

      <NocDialog noc={noc} onClose={() => setNoc(null)} />
    </div>
  );
};
