import React, { useState, useEffect, useCallback } from 'react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { AdminWorkspaceShell, AdminSubPage } from '@/components/admin/AdminWorkspaceShell';
import { AdminOverviewPage } from './AdminOverviewPage';
import { AdminDeedsPage } from './AdminDeedsPage';
import { AdminKhatiansPage } from './AdminKhatiansPage';
import { AdminMutationsPage } from './AdminMutationsPage';
import { AdminLedgerPage } from './AdminLedgerPage';
import { AdminOfficialsPage } from './AdminOfficialsPage';
import { AdminCitizensPage } from './AdminCitizensPage';
import { AdminOfficesPage } from './AdminOfficesPage';
import { AdminLocationsPage } from './AdminLocationsPage';
import { AdminRolesPage } from './AdminRolesPage';
import { AdminBlogPage } from './AdminBlogPage';
import { AdminNoticePage } from './AdminNoticePage';
import { AdminSystemPage } from './AdminSystemPage';
import { AdminSettingsPage } from './AdminSettingsPage';
import { SuperAdminTransfersTab } from './SuperAdminTransfersTab';
import { SuperAdminAppealsTab } from './SuperAdminAppealsTab';
import { SuperAdminBankLiensTab } from './SuperAdminBankLiensTab';
import { SuperAdminAcquisitionsTab } from './SuperAdminAcquisitionsTab';
import { SuperAdminLawyersTab } from './SuperAdminLawyersTab';
import { SuperAdminOverrideModal } from './SuperAdminOverrideModal';

export const AdminMasterWorkspace: React.FC<{ onNavigate?: (tab: string) => void }> = ({
  onNavigate,
}) => {
  const { lang, t } = useAppUI();

  // Read subpage from URL if present (e.g. /bn/admin/deeds or ?tab=offices)
  const getInitialSubPage = (): AdminSubPage => {
    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') || params.get('sub');
    if (tabParam === 'offices' || tabParam === 'office' || path.includes('/office')) return 'offices';
    if (tabParam === 'locations' || tabParam === 'location' || tabParam === 'hierarchy' || path.includes('/location') || path.includes('/hierarchy')) return 'locations';
    if (tabParam === 'deeds' || path.includes('/deeds')) return 'deeds';
    if (tabParam === 'khatians' || path.includes('/khatian') || path.includes('/plot')) return 'khatians';
    if (tabParam === 'mutations' || path.includes('/mutation')) return 'mutations';
    if (tabParam === 'transfers' || path.includes('/transfer')) return 'transfers';
    if (tabParam === 'appeals' || path.includes('/appeal') || path.includes('/dispute')) return 'appeals';
    if (tabParam === 'mortgages' || path.includes('/mortgage') || path.includes('/lien')) return 'mortgages';
    if (tabParam === 'acquisitions' || path.includes('/acquisition')) return 'acquisitions';
    if (tabParam === 'lawyers' || path.includes('/lawyer')) return 'lawyers';
    if (tabParam === 'ledger' || path.includes('/ledger')) return 'ledger';
    if (tabParam === 'officials' || path.includes('/officials')) return 'officials';
    if (tabParam === 'citizens' || path.includes('/citizens')) return 'citizens';
    if (tabParam === 'roles' || path.includes('/roles')) return 'roles';
    if (tabParam === 'users' || path.includes('/user')) return 'officials';
    if (tabParam === 'blogs' || tabParam === 'blog' || path.includes('/blog')) return 'blogs';
    if (tabParam === 'notices' || tabParam === 'notice' || path.includes('/notice')) return 'notices';
    if (tabParam === 'content' || path.includes('/content')) return 'blogs';
    if (tabParam === 'system' || path.includes('/system') || path.includes('/broadcast')) return 'system';
    if (tabParam === 'settings' || path.includes('/setting')) return 'settings';
    return 'overview';
  };

  const [subPage, setSubPage] = useState<AdminSubPage>(getInitialSubPage);
  const [stats, setStats] = useState<any>(null);

  // Specialist control tab state
  const [transfers, setTransfers] = useState<any[]>([]);
  const [appeals, setAppeals] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [mortgages, setMortgages] = useState<any[]>([]);
  const [acquisitionCases, setAcquisitionCases] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [officesList, setOfficesList] = useState<any[]>([]);

  // Sovereign Override Modal state
  const [overrideModal, setOverrideModal] = useState<{
    open: boolean;
    actionType: string;
    targetId?: string | number;
  }>({ open: false, actionType: 'MUTATION_OVERRIDE' });

  const fetchStats = useCallback(async () => {
    try {
      const data = await BhumiApi.getStatsSummary();
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchSpecialistData = useCallback(async (targetTab: AdminSubPage) => {
    try {
      if (targetTab === 'transfers') {
        const [trRes, uRes, oRes] = await Promise.all([
          BhumiApi.listTransfers().catch(() => ({ items: [] })),
          BhumiApi.listUsers().catch(() => []),
          BhumiApi.listOffices().catch(() => ({ items: [] })),
        ]);
        setTransfers((trRes as any)?.items || (Array.isArray(trRes) ? trRes : []));
        setUsersList(Array.isArray(uRes) ? uRes : (uRes as any)?.items || []);
        setOfficesList((oRes as any)?.items || (Array.isArray(oRes) ? oRes : []));
      } else if (targetTab === 'appeals') {
        const [apRes, dispRes] = await Promise.all([
          BhumiApi.listAppeals().catch(() => []),
          BhumiApi.listDisputes().catch(() => []),
        ]);
        setAppeals(Array.isArray(apRes) ? apRes : (apRes as any)?.items || []);
        setDisputes(Array.isArray(dispRes) ? dispRes : (dispRes as any)?.items || []);
      } else if (targetTab === 'mortgages') {
        const mRes = await BhumiApi.getMortgages().catch(() => []);
        setMortgages(Array.isArray(mRes) ? mRes : (mRes as any)?.items || []);
      } else if (targetTab === 'acquisitions') {
        const acqRes = await BhumiApi.listAcquisitionCases().catch(() => ({ items: [] }));
        setAcquisitionCases((acqRes as any)?.items || (Array.isArray(acqRes) ? acqRes : []));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const handlePopState = () => {
      setSubPage(getInitialSubPage());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (['transfers', 'appeals', 'mortgages', 'acquisitions'].includes(subPage)) {
      fetchSpecialistData(subPage);
    }
  }, [subPage, fetchSpecialistData]);

  const handleNavigateSubPage = (sp: string) => {
    const validSp = sp as AdminSubPage;
    setSubPage(validSp);
    const newPath = validSp === 'overview' ? `/${lang}/admin` : `/${lang}/admin/${validSp}`;
    window.history.pushState({}, '', newPath);
  };

  const handleOpenOverride = (actionType: string, targetId?: string | number) => {
    setOverrideModal({ open: true, actionType, targetId });
  };

  return (
    <AdminWorkspaceShell
      currentSubPage={subPage}
      onNavigateSubPage={handleNavigateSubPage}
      onNavigateMainTab={onNavigate || (() => {})}
      onOpenOverride={handleOpenOverride}
    >
      {subPage === 'overview' && (
        <AdminOverviewPage
          stats={stats}
          onNavigateSubPage={handleNavigateSubPage}
          onNavigateMainTab={onNavigate}
          onRefreshStats={fetchStats}
          onOpenOverride={handleOpenOverride}
        />
      )}
      {subPage === 'deeds' && <AdminDeedsPage />}
      {subPage === 'khatians' && <AdminKhatiansPage />}
      {subPage === 'mutations' && <AdminMutationsPage />}
      {subPage === 'transfers' && (
        <>
          <SuperAdminTransfersTab
            transfers={transfers}
            usersList={usersList}
            officesList={officesList}
            onRefresh={() => fetchSpecialistData('transfers')}
            onOpenOverride={handleOpenOverride}
          />
        </>
      )}
      {subPage === 'appeals' && (
        <>
          <SuperAdminAppealsTab
            appeals={appeals}
            disputes={disputes}
            onRefresh={() => fetchSpecialistData('appeals')}
            onOpenOverride={handleOpenOverride}
          />
        </>
      )}
      {subPage === 'mortgages' && (
        <>
          <SuperAdminBankLiensTab
            mortgages={mortgages}
            onRefresh={() => fetchSpecialistData('mortgages')}
            onOpenOverride={handleOpenOverride}
          />
        </>
      )}
      {subPage === 'acquisitions' && (
        <>
          <SuperAdminAcquisitionsTab
            acquisitionCases={acquisitionCases}
            onRefresh={() => fetchSpecialistData('acquisitions')}
            onOpenOverride={handleOpenOverride}
          />
        </>
      )}
      {subPage === 'lawyers' && (
        <>
          <SuperAdminLawyersTab t={t} lang={lang} />
        </>
      )}
      {subPage === 'ledger' && <AdminLedgerPage />}
      {(subPage === 'officials' || subPage === 'users') && <AdminOfficialsPage />}
      {subPage === 'citizens' && <AdminCitizensPage />}
      {subPage === 'offices' && <AdminOfficesPage />}
      {subPage === 'locations' && <AdminLocationsPage onNavigateSubPage={handleNavigateSubPage} />}
      {subPage === 'roles' && (
        <AdminRolesPage
          onNavigateToUsers={(roleKey) => {
            if (['citizen', 'service_point_operator'].includes(roleKey)) {
              handleNavigateSubPage('citizens');
            } else {
              handleNavigateSubPage('officials');
            }
          }}
        />
      )}
      {subPage === 'blogs' && <AdminBlogPage />}
      {subPage === 'notices' && <AdminNoticePage />}
      {subPage === 'content' && <AdminBlogPage />}
      {subPage === 'system' && <AdminSystemPage />}
      {subPage === 'settings' && <AdminSettingsPage />}

      <SuperAdminOverrideModal
        isOpen={overrideModal.open}
        onClose={() => setOverrideModal((prev) => ({ ...prev, open: false }))}
        onSuccess={() => {
          fetchStats();
          if (['transfers', 'appeals', 'mortgages', 'acquisitions'].includes(subPage)) {
            fetchSpecialistData(subPage);
          }
        }}
        actionType={overrideModal.actionType}
        targetId={overrideModal.targetId}
      />
    </AdminWorkspaceShell>
  );
};
