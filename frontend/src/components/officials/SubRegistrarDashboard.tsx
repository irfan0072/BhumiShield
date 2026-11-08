import React, { useMemo } from 'react';
import {
  Calculator,
  CheckCircle2,
  ChevronRight,
  FilePlus2,
  FileWarning,
  Gavel,
  ListChecks,
  QrCode,
  RefreshCcw,
  ShieldAlert,
} from 'lucide-react';
import { useAppUI } from '@/i18n';
import { cn } from '@/lib/utils';
import { toBanglaDigits } from '@/theme/tokens';
import { EmptyState, Section, StatCard, StatGrid, StatusBadge } from '@/components/admin/kit';

interface SubRegistrarDashboardProps {
  onNavigateTab: (tab: string) => void;
  deedsList?: any[];
  /** Optional analytics summary (BhumiApi.getStatsSummary). */
  stats?: any;
  /** Onboarding batches visible to this officer. */
  batches?: any[];
  loading?: boolean;
  /** Sub-Registrar (decides) vs data officer (drafts). */
  isChecker?: boolean;
}

interface Todo {
  key: string;
  text: string;
  go: string;
  icon: React.ElementType;
  tone: string;
}

export const SubRegistrarDashboard: React.FC<SubRegistrarDashboardProps> = ({
  onNavigateTab,
  deedsList = [],
  batches = [],
  loading = false,
  isChecker = true,
}) => {
  const { lang, t } = useAppUI();
  const n = (v: any) => toBanglaDigits(v ?? '', lang);
  const show = (v: number) => (loading ? '—' : n(v));

  const held = useMemo(() => deedsList.filter((d) => String(d.status).toUpperCase() === 'HELD'), [deedsList]);
  const due = useMemo(
    () => deedsList.filter((d) => ['REGISTERED', 'PENDING_MUTATION'].includes(String(d.status).toUpperCase())),
    [deedsList]
  );
  const broken = useMemo(() => deedsList.filter((d) => d.ledger_valid === false), [deedsList]);
  const pendingBatches = useMemo(() => batches.filter((b) => b.status === 'SUBMITTED'), [batches]);

  const todos: Todo[] = [
    ...held.slice(0, 5).map((d) => ({
      key: `h${d.id}`,
      text: `${d.deed_no} · ${t('শুনানি বাকি', 'Hearing due')}`,
      go: isChecker ? 'held' : 'deeds',
      icon: Gavel,
      tone: 'bg-amber-50 text-amber-700',
    })),
    ...broken.slice(0, 3).map((d) => ({
      key: `b${d.id}`,
      text: `${d.deed_no} · ${t('ডিজিটাল সিলে অমিল', 'Seal mismatch')}`,
      go: 'deeds',
      icon: ShieldAlert,
      tone: 'bg-rose-50 text-rose-700',
    })),
    ...(isChecker
      ? pendingBatches.slice(0, 4).map((b) => ({
          key: `o${b.id}`,
          text: `${b.batch_no} · ${t('অনুমোদন বাকি', 'Approval due')}`,
          go: 'onboarding',
          icon: ListChecks,
          tone: 'bg-sky-50 text-sky-700',
        }))
      : []),
  ];

  const actions = [
    { id: 'wizard', bn: 'নতুন দলিল', en: 'New deed', icon: FilePlus2, tone: 'bg-emerald-50 text-emerald-700' },
    { id: 'verifier', bn: 'দলিল যাচাই', en: 'Verify deed', icon: QrCode, tone: 'bg-sky-50 text-sky-700' },
    { id: 'fees', bn: 'ফি হিসাব', en: 'Fee calculator', icon: Calculator, tone: 'bg-violet-50 text-violet-700' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <StatGrid>
        <StatCard
          label={t('শুনানি বাকি', 'Hearings due')}
          value={show(held.length)}
          icon={Gavel}
          tone="amber"
          onClick={() => onNavigateTab(isChecker ? 'held' : 'deeds')}
        />
        <StatCard
          label={t('নামজারি বাকি', 'Mutation due')}
          value={show(due.length)}
          icon={RefreshCcw}
          tone="blue"
          onClick={() => onNavigateTab('deeds')}
        />
        <StatCard
          label={isChecker ? t('অনুমোদন বাকি', 'Approvals due') : t('জমা খসড়া', 'Drafts sent')}
          value={show(pendingBatches.length)}
          icon={ListChecks}
          tone="violet"
          onClick={isChecker ? () => onNavigateTab('onboarding') : undefined}
        />
        <StatCard
          label={t('সিলে অমিল', 'Seal mismatch')}
          value={show(broken.length)}
          icon={FileWarning}
          tone={broken.length ? 'red' : 'green'}
          onClick={() => onNavigateTab('deeds')}
        />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section
          className="lg:col-span-2"
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
                      onClick={() => onNavigateTab(todo.go)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 cursor-pointer"
                    >
                      <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-md', todo.tone)}>
                        <Icon className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{todo.text}</span>
                      <ChevronRight className="size-4 shrink-0 text-slate-300" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title={t('দ্রুত কাজ', 'Quick actions')} bodyClassName="grid grid-cols-2 gap-2 p-3">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onNavigateTab(a.id)}
                className="flex flex-col items-start gap-2 rounded-lg border border-slate-200 p-2.5 text-left transition hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                <span className={cn('flex size-7 items-center justify-center rounded-md', a.tone)}>
                  <Icon className="size-3.5" />
                </span>
                <span className="text-xs font-medium text-slate-800">{lang === 'bn' ? a.bn : a.en}</span>
              </button>
            );
          })}
        </Section>
      </div>

      <Section
        title={t('সাম্প্রতিক দলিল', 'Recent deeds')}
        action={
          <button
            type="button"
            onClick={() => onNavigateTab('deeds')}
            className="text-xs font-medium text-[#006A4E] hover:underline cursor-pointer"
          >
            {t('সব দেখুন', 'View all')}
          </button>
        }
      >
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : deedsList.length === 0 ? (
          <EmptyState text={t('কোনো দলিল নেই', 'No deeds')} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {deedsList.slice(0, 5).map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => onNavigateTab('deeds')}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-slate-50 cursor-pointer"
                >
                  <span className="w-28 shrink-0 font-medium text-slate-900">{d.deed_no}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-700">
                    {(lang === 'bn' ? d.seller_name_bn : d.seller_name_en) || d.seller_name_bn}
                    <span className="text-slate-400"> → </span>
                    {(lang === 'bn' ? d.buyer_name_bn : d.buyer_name_en) || d.buyer_name_bn}
                  </span>
                  <span className="hidden shrink-0 text-xs text-slate-500 sm:block">
                    {(lang === 'bn' ? d.mouza_bn : d.mouza_en) || d.mouza_bn} · {t('দাগ', 'Plot')} {n(d.dag_no_bn || d.dag_no)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
};
