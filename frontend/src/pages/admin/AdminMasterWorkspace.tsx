import React, { useState, useEffect } from 'react';
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

export const AdminMasterWorkspace: React.FC<{ onNavigate?: (tab: string) => void }> = ({
  onNavigate,
}) => {
  const { lang } = useAppUI();

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

  const fetchStats = async () => {
    try {
      const data = await BhumiApi.getStatsSummary();
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleNavigateSubPage = (sp: string) => {
    const validSp = sp as AdminSubPage;
    setSubPage(validSp);
    const newPath = validSp === 'overview' ? `/${lang}/admin` : `/${lang}/admin/${validSp}`;
    window.history.pushState({}, '', newPath);
  };

  return (
    <AdminWorkspaceShell
      currentSubPage={subPage}
      onNavigateSubPage={handleNavigateSubPage}
      onNavigateMainTab={onNavigate || (() => {})}
    >
      {subPage === 'overview' && (
        <AdminOverviewPage
          stats={stats}
          onNavigateSubPage={handleNavigateSubPage}
          onRefreshStats={fetchStats}
        />
      )}
      {subPage === 'deeds' && <AdminDeedsPage />}
      {subPage === 'khatians' && <AdminKhatiansPage />}
      {subPage === 'mutations' && <AdminMutationsPage />}
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
    </AdminWorkspaceShell>
  );
};
