import React, { useState, useEffect, useCallback } from 'react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import {
  CitizenSectionId,
  resolveCitizenSectionFromUrl,
} from '@/components/citizen/CitizenShell';
import type { CitizenOwnedPlot } from '@/components/citizen/MyLandMap';
import { LandHealthPassportModal } from '@/components/LandHealthPassportModal';
import { CitizenVerificationModal } from '@/components/CitizenVerificationModal';
import type { CitizenVaultState } from './citizen/shared';
import { OverviewSection } from './citizen/OverviewSection';
import { PlotsSection } from './citizen/PlotsSection';
import { DeedsSection } from './citizen/DeedsSection';
import { DocsSection } from './citizen/DocsSection';
import { TransfersSection } from './citizen/TransfersSection';
import { DisputesSection } from './citizen/DisputesSection';
import { TicketsSection } from './citizen/TicketsSection';

export type CitizenSection = CitizenSectionId;

export const CitizenHome: React.FC<{
  onNavigate: (target: string) => void;
  currentSubPage?: string;
  onNavigateSubPage?: (subPage: string) => void;
}> = ({ onNavigate }) => {
  const { lang, user, activeSubTab, setActiveSubTab } = useAppUI();

  const [vault, setVault] = useState<CitizenVaultState>({
    person: null,
    owned_plots: [],
    deeds: [],
    is_verified: true,
    isOperatorNoVault: user?.role === 'service_point_operator',
  });
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);

  const [selectedPlotId, setSelectedPlotId] = useState<number | null>(null);
  const [passportPlot, setPassportPlot] = useState<CitizenOwnedPlot | null>(null);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [pendingCreateSection, setPendingCreateSection] = useState<CitizenSectionId | null>(null);

  const loadAll = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const isOperator = user?.role === 'service_point_operator';

        const [vaultRes, dispRes, trRes, tkRes] = await Promise.all([
          isOperator
            ? Promise.resolve({
                person: null,
                owned_plots: [],
                deeds: [],
                is_verified: true,
                isOperatorNoVault: true,
              })
            : BhumiApi.getMyVault().catch((err: any) => {
                const status = err?.response?.status;
                if (status === 403 || status === 404) {
                  return {
                    person: null,
                    owned_plots: [],
                    deeds: [],
                    is_verified: true,
                    isOperatorNoVault: status === 403,
                  };
                }
                return null;
              }),
          BhumiApi.listDisputes().catch(() => ({ items: [] })),
          BhumiApi.listTransfers().catch(() => ({ items: [] })),
          BhumiApi.listTickets().catch(() => ({ items: [] })),
        ]);

        if (vaultRes) {
          const vRes = vaultRes as any;
          const rawOwned: CitizenOwnedPlot[] =
            vRes.owned_plots || vRes.plots || [];
          const seenPlotIds = new Set<number>();
          const ownedPlots: CitizenOwnedPlot[] = [];
          for (const p of rawOwned) {
            const pid = Number(p.plot_id ?? (p as any).id);
            if (!pid || seenPlotIds.has(pid)) continue;
            seenPlotIds.add(pid);
            ownedPlots.push({ ...p, plot_id: pid });
          }
          setVault({
            person: vRes.person || null,
            owned_plots: ownedPlots,
            deeds: vRes.deeds || [],
            is_verified: vRes.is_verified !== false && vRes.is_identity_verified !== false,
            isOperatorNoVault: Boolean(vRes.isOperatorNoVault || isOperator),
          });
          setSelectedPlotId((prev) =>
            prev !== null
              ? prev
              : ownedPlots[0]?.plot_id
              ? Number(ownedPlots[0].plot_id)
              : null
          );
        }

        setDisputes(Array.isArray(dispRes?.items) ? dispRes.items : []);
        setTransfers(Array.isArray(trRes?.items) ? trRes.items : []);
        setTickets(Array.isArray(tkRes?.items) ? tkRes.items : []);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [user?.role]
  );

  useEffect(() => {
    loadAll(false);
  }, [loadAll, user?.username]);

  // Auto-open tickets section if map page passed ?map_plot_id= or ?map_dag=
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('map_plot_id') || params.get('map_dag')) {
      setActiveSubTab('tickets');
    }
  }, [setActiveSubTab]);

  const currentSection: CitizenSectionId = resolveCitizenSectionFromUrl(activeSubTab);

  const handleSelectSection = useCallback(
    (sec: CitizenSectionId, opts?: { plotId?: number; create?: boolean }) => {
      if (opts?.plotId !== undefined) {
        setSelectedPlotId(opts.plotId);
      }
      if (opts?.create) {
        setPendingCreateSection(sec);
      }
      setActiveSubTab(sec === 'overview' ? '' : sec);
      if (typeof window !== 'undefined') {
        const target = sec === 'overview' ? `/${lang}/home` : `/${lang}/home?section=${sec}`;
        const current = `${window.location.pathname}${window.location.search}`;
        if (current !== target) {
          window.history.pushState({ tab: 'home', section: sec, lang }, '', target);
        }
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      }
    },
    [lang, setActiveSubTab]
  );

  const commonProps = {
    vault,
    loading,
    disputes,
    transfers,
    tickets,
    onRefreshAll: () => loadAll(false),
    onSelectSection: handleSelectSection,
    onNavigate,
    selectedPlotId,
    setSelectedPlotId,
    onOpenPassport: (p: CitizenOwnedPlot) => setPassportPlot(p),
    onOpenVerifyIdentity: () => setVerifyModalOpen(true),
  };

  return (
    <>
      {currentSection === 'overview' && <OverviewSection {...commonProps} />}
      {currentSection === 'plots' && <PlotsSection {...commonProps} />}
      {currentSection === 'deeds' && <DeedsSection {...commonProps} />}
      {currentSection === 'docs' && <DocsSection {...commonProps} />}
      {currentSection === 'transfers' && <TransfersSection {...commonProps} />}
      {currentSection === 'disputes' && (
        <DisputesSection
          {...commonProps}
          autoOpenCreate={pendingCreateSection === 'disputes'}
          onConsumedCreate={() => setPendingCreateSection(null)}
        />
      )}
      {currentSection === 'tickets' && (
        <TicketsSection
          {...commonProps}
          autoOpenCreate={pendingCreateSection === 'tickets'}
          onConsumedCreate={() => setPendingCreateSection(null)}
        />
      )}

      {passportPlot && (
        <LandHealthPassportModal
          plot={passportPlot as any}
          onClose={() => setPassportPlot(null)}
          onNavigate={onNavigate}
        />
      )}

      <CitizenVerificationModal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        onSuccess={() => loadAll(true)}
      />
    </>
  );
};

export default CitizenHome;
