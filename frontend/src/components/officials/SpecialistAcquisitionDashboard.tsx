import React, { useMemo } from 'react';
import { Building2, CheckCircle2, ChevronRight, Coins, FileCheck2, FileText, Gavel, Layers, Plus, Scale } from 'lucide-react';
import { toBanglaDigits } from '@/theme/tokens';
import { useAppUI } from '@/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AdminPage, EmptyState, Section, StatCard, StatGrid, StatusBadge } from '@/components/admin/kit';
import {
  caseStatus,
  crore,
  decimal,
  disputeTypeLabel,
  isOpenCase,
  isOpenDispute,
  num,
  plotIdsOf,
} from '@/pages/specialist/shared';

interface SpecialistAcquisitionDashboardProps {
  onNavigateTab: (tab: string) => void;
  cases?: any[];
  disputes?: any[];
  loading?: boolean;
  canCreate?: boolean;
  onNewNotice?: () => void;
  onOpenPlot?: (plotId: number) => void;
}

/** Stages that still need the acquisition officer to move the case forward. */
const NEEDS_ACTION = ['PRELIMINARY_NOTICE', 'NOTICE_ISSUED', 'JOINT_VERIFICATION', 'HEARING'];

export const SpecialistAcquisitionDashboard: React.FC<SpecialistAcquisitionDashboardProps> = ({
  onNavigateTab,
  cases = [],
  disputes = [],
  loading = false,
  canCreate = false,
  onNewNotice,
  onOpenPlot,
}) => {
  const { lang, t } = useAppUI();
  const n = (v: any) => toBanglaDigits(v ?? '', lang);

  const stats = useMemo(
    () => ({
      open: cases.filter(isOpenCase).length,
      land: cases.reduce((s, c) => s + num(c.total_land_decimal), 0),
      money: cases.reduce((s, c) => s + num(c.estimated_compensation_bdt ?? c.compensation_budget), 0),
      openDisputes: disputes.filter(isOpenDispute).length,
    }),
    [cases, disputes]
  );

  // Real pending items: cases waiting on the officer, and open court orders on plots under acquisition.
  const todos = useMemo(() => {
    const acquiredPlots = new Set(cases.flatMap(plotIdsOf));
    const items: Array<{ key: string; text: string; sub: string; badge: React.ReactNode; icon: React.ElementType; tone: string; go: () => void }> = [];
    disputes
      .filter((d) => isOpenDispute(d) && acquiredPlots.has(Number(d.plot_id)))
      .forEach((d) =>
        items.push({
          key: `d${d.id}`,
          text: `${t('দাগ', 'Dag')} ${n(d.dag_no_bn || d.dag_no || d.plot_id)} · ${disputeTypeLabel(d.dispute_type, lang)}`,
          sub: [d.case_no, d.mouza_bn].filter(Boolean).join(' · '),
          badge: <StatusBadge tone="red">{t('আদালত আদেশ', 'Court order')}</StatusBadge>,
          icon: Gavel,
          tone: 'bg-rose-50 text-rose-700',
          go: () => (onOpenPlot ? onOpenPlot(Number(d.plot_id)) : onNavigateTab('title_scrutiny')),
        })
      );
    cases
      .filter((c) => NEEDS_ACTION.includes(String(c.status || '').toUpperCase()))
      .forEach((c) => {
        const st = caseStatus(c.status, lang);
        items.push({
          key: `c${c.id}`,
          text: lang === 'bn' ? c.project_name_bn : c.project_name_en || c.project_name_bn,
          sub: [c.case_no, c.mouza_bn].filter(Boolean).join(' · '),
          badge: <StatusBadge tone={st.tone}>{st.label}</StatusBadge>,
          icon: Building2,
          tone: 'bg-sky-50 text-sky-700',
          go: () => onNavigateTab('la_cases'),
        });
      });
    return items.slice(0, 8);
  }, [cases, disputes, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const dash = (v: string) => (loading ? '—' : v);

  return (
    <AdminPage>
      <StatGrid>
        <StatCard label={t('চলমান মামলা', 'Open cases')} value={dash(n(stats.open))} icon={Building2} tone="blue" onClick={() => onNavigateTab('la_cases')} />
        <StatCard label={t('মোট জমি', 'Total land')} value={dash(decimal(stats.land, lang))} icon={Layers} tone="green" onClick={() => onNavigateTab('la_cases')} />
        <StatCard label={t('ক্ষতিপূরণ বাজেট', 'Compensation')} value={dash(crore(stats.money, lang))} icon={Coins} tone="violet" onClick={() => onNavigateTab('la_cases')} />
        <StatCard
          label={t('খোলা আদালত আদেশ', 'Open court orders')}
          value={dash(n(stats.openDisputes))}
          icon={Scale}
          tone={stats.openDisputes ? 'red' : 'slate'}
          onClick={() => onNavigateTab('disputes')}
        />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Section
          title={
            <span className="flex items-center gap-2">
              {t('জরুরি কাজ', 'Needs attention')}
              {todos.length > 0 && <StatusBadge tone="red">{n(todos.length)}</StatusBadge>}
            </span>
          }
        >
          {loading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : todos.length === 0 ? (
            <EmptyState icon={CheckCircle2} text={t('সব ঠিক আছে', 'All clear')} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {todos.map((todo) => {
                const Icon = todo.icon;
                return (
                  <li key={todo.key}>
                    <button
                      type="button"
                      onClick={todo.go}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 cursor-pointer"
                    >
                      <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-md', todo.tone)}>
                        <Icon className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-slate-700">{todo.text}</span>
                        {todo.sub && <span className="block truncate text-xs text-slate-500">{todo.sub}</span>}
                      </span>
                      <span className="hidden shrink-0 sm:block">{todo.badge}</span>
                      <ChevronRight className="size-4 shrink-0 text-slate-300" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title={t('দ্রুত কাজ', 'Quick actions')}>
          <div className="grid gap-2 p-3">
            {canCreate && onNewNotice && (
              <Button size="sm" className="h-9 justify-start" onClick={onNewNotice}>
                <Plus className="size-4" />
                {t('নতুন অধিগ্রহণ নোটিশ', 'New notice')}
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-9 justify-start" onClick={() => onNavigateTab('title_scrutiny')}>
              <FileCheck2 className="size-4" />
              {t('মালিকানা যাচাই', 'Title check')}
            </Button>
            <Button size="sm" variant="outline" className="h-9 justify-start" onClick={() => onNavigateTab('la_cases')}>
              <FileText className="size-4" />
              {t('মামলার তালিকা', 'Case list')}
            </Button>
            <Button size="sm" variant="outline" className="h-9 justify-start" onClick={() => onNavigateTab('disputes')}>
              <Gavel className="size-4" />
              {t('আদালত আদেশ', 'Court orders')}
            </Button>
          </div>
        </Section>
      </div>
    </AdminPage>
  );
};
