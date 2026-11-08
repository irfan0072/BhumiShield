import React, { useMemo } from 'react';
import { ChevronRight, Coins, FileBadge, Lock, PlusCircle, Search, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminPage, EmptyState, Section, StatCard, StatGrid, StatusCode } from '@/components/admin/kit';
import { toBanglaDigits } from '@/theme/tokens';
import { useAppUI } from '@/i18n';

interface BankOfficerDashboardProps {
  onNavigateTab: (tab: string) => void;
  mortgagesList?: any[];
  stats?: any;
  loading?: boolean;
  /** Show the "new mortgage" quick action (bank officer / admin). */
  canCreate?: boolean;
}

/** Bank desk overview: real KPIs from the lien register, active liens to follow up, quick actions. */
export const BankOfficerDashboard: React.FC<BankOfficerDashboardProps> = ({
  onNavigateTab,
  mortgagesList = [],
  loading,
  canCreate,
}) => {
  const { lang, t } = useAppUI();
  const n = (v: any) => toBanglaDigits(v ?? '', lang);

  const kpi = useMemo(() => {
    const active = mortgagesList.filter((m) => String(m.status).toUpperCase() === 'ACTIVE');
    const released = mortgagesList.filter((m) => String(m.status).toUpperCase() === 'RELEASED');
    const activeLoan = active.reduce((s, m) => s + Number(m.loan_amount_bdt || 0), 0);
    return { active, released, activeLoan, total: mortgagesList.length };
  }, [mortgagesList]);

  const dash = loading && mortgagesList.length === 0;
  const crore = (v: number) => `৳${n((v / 10000000).toFixed(2))} ${t('কোটি', 'Cr')}`;

  return (
    <AdminPage>
      <StatGrid>
        <StatCard
          label={t('সক্রিয় বন্ধক', 'Active liens')}
          value={dash ? '—' : n(kpi.active.length)}
          icon={Lock}
          tone="amber"
          onClick={() => onNavigateTab('mortgages')}
        />
        <StatCard
          label={t('সক্রিয় ঋণ', 'Active loans')}
          value={dash ? '—' : crore(kpi.activeLoan)}
          icon={Coins}
          tone="blue"
          onClick={() => onNavigateTab('mortgages')}
        />
        <StatCard
          label={t('ছাড়পত্র', 'Released')}
          value={dash ? '—' : n(kpi.released.length)}
          icon={FileBadge}
          tone="green"
          onClick={() => onNavigateTab('noc')}
        />
        <StatCard
          label={t('মোট বন্ধক', 'All liens')}
          value={dash ? '—' : n(kpi.total)}
          icon={Layers}
          tone="slate"
          onClick={() => onNavigateTab('mortgages')}
        />
      </StatGrid>

      <div className="flex flex-wrap gap-2">
        {canCreate && (
          <Button size="sm" className="h-9 gap-1.5" onClick={() => onNavigateTab('new_lien')}>
            <PlusCircle className="size-4" />
            {t('নতুন বন্ধক', 'New mortgage')}
          </Button>
        )}
        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => onNavigateTab('noc')}>
          <FileBadge className="size-4" />
          {t('ছাড়পত্র', 'Release NOC')}
        </Button>
        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => onNavigateTab('khatian')}>
          <Search className="size-4" />
          {t('খতিয়ান খুঁজুন', 'Find khatian')}
        </Button>
      </div>

      <Section
        title={t('জরুরি কাজ', 'To do')}
        action={
          kpi.active.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onNavigateTab('mortgages')}>
              {t('সব দেখুন', 'View all')}
            </Button>
          )
        }
      >
        {dash ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : kpi.active.length === 0 ? (
          <EmptyState text={t('সক্রিয় বন্ধক নেই', 'No active liens')} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {kpi.active.slice(0, 6).map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onNavigateTab('mortgages')}
                  className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50/60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {(lang === 'bn' ? m.borrower_name_bn : m.borrower_name_en || m.borrower_name_bn) || '—'}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {(lang === 'bn' ? m.mouza_bn : m.mouza_en || m.mouza_bn) || '—'} · {t('দাগ', 'Plot')} {n(m.dag_no_bn || m.dag_no)} · ৳
                      {n(Number(m.loan_amount_bdt || 0).toLocaleString('en-IN'))}
                    </span>
                  </span>
                  <StatusCode code={m.status} lang={lang} />
                  <ChevronRight className="size-4 shrink-0 text-slate-400" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </AdminPage>
  );
};
