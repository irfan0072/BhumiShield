import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  RefreshCcw,
  RotateCcw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi, AdminAnomalyItem } from '@/api/client';
import { toBanglaDigits } from '@/theme/tokens';
import { cn } from '@/lib/utils';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { adminActions, useAdminShell } from '@/components/admin/AdminWorkspaceShell';
import { AdminPage, EmptyState, Section, StatCard, StatGrid, StatusBadge } from '@/components/admin/kit';

interface AdminOverviewPageProps {
  stats: any;
  onNavigateSubPage: (subPage: string) => void;
  onNavigateMainTab?: (tab: string) => void;
  onRefreshStats: () => void | Promise<void>;
  onOpenOverride?: (actionType: string, targetId?: string | number) => void;
}

const num = (...vals: any[]): number | null => {
  for (const v of vals) if (v !== undefined && v !== null && v !== '' && !Number.isNaN(Number(v))) return Number(v);
  return null;
};

/** Short human labels for the audit actions shown in "recent activity". */
const ACTION_LABELS: Record<string, [string, string]> = {
  SITE_SETTINGS_UPDATED: ['সেটিংস বদলানো হয়েছে', 'Settings updated'],
  PLOT_SALE_UNLOCKED_BY_OWNER: ['মালিক জমি খুলে দিয়েছেন', 'Owner unlocked plot'],
  PLOT_SALE_LOCKED_BY_OWNER: ['মালিক জমি লক করেছেন', 'Owner locked plot'],
  ADMIN_PLOT_FREEZE: ['জমি আটকানো হয়েছে', 'Plot frozen'],
  ADMIN_PLOT_UNFREEZE: ['জমি খুলে দেওয়া হয়েছে', 'Plot unfrozen'],
  USER_REGISTERED: ['নতুন ব্যবহারকারী', 'New user'],
  DEED_REGISTERED: ['দলিল নিবন্ধন', 'Deed registered'],
  MUTATION_APPLIED: ['নামজারি আবেদন', 'Mutation applied'],
  TRANSFER_REASSIGNED: ['হস্তান্তর পুনর্বণ্টন', 'Transfer reassigned'],
  ACQUISITION_CASE_CREATED: ['অধিগ্রহণ মামলা', 'Acquisition case'],
};

const actionLabel = (a: any, lang: 'bn' | 'en') => {
  const hit = ACTION_LABELS[a?.action];
  if (hit) return lang === 'bn' ? hit[0] : hit[1];
  try {
    const d = JSON.parse(a?.details_json || '{}');
    if (lang === 'bn' && d.note_bn) return String(d.note_bn);
  } catch {
    /* ignore */
  }
  return String(a?.action || '').replace(/_/g, ' ').toLowerCase();
};

const timeAgo = (iso: string, lang: 'bn' | 'en') => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const n = (v: number) => toBanglaDigits(v, lang);
  if (lang === 'bn') return d > 0 ? `${n(d)} দিন আগে` : h > 0 ? `${n(h)} ঘণ্টা আগে` : m > 0 ? `${n(m)} মিনিট আগে` : 'এইমাত্র';
  return d > 0 ? `${d}d ago` : h > 0 ? `${h}h ago` : m > 0 ? `${m}m ago` : 'just now';
};

export const AdminOverviewPage: React.FC<AdminOverviewPageProps> = ({ stats, onNavigateSubPage, onRefreshStats, onOpenOverride }) => {
  const { lang, t } = useAppUI();
  const { runAction } = useAdminShell();
  const [anomalies, setAnomalies] = useState<AdminAnomalyItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const n = (v: number) => toBanglaDigits(v, lang);

  const loadAnomalies = () =>
    BhumiApi.getLiveAnomalies()
      .then((res) => setAnomalies(res?.items || []))
      .catch(() => setAnomalies([]))
      .finally(() => setLoaded(true));

  useEffect(() => {
    loadAnomalies();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([Promise.resolve(onRefreshStats()), loadAnomalies()]);
    setRefreshing(false);
  };

  const k = stats?.kpis || {};
  const deeds = num(stats?.total_deeds, k.total_deeds);
  const pendingMut = num(stats?.pending_mutations, k.pending_mutations) ?? 0;
  const openDisputes = num(stats?.open_disputes_count, k.open_disputes_count) ?? 0;
  const citizens = num(stats?.total_citizens, k.total_citizens);
  const ledgerOk = stats?.ledger_is_valid;

  const todos = [
    ...anomalies.slice(0, 4).map((a) => ({
      key: String(a.id),
      icon: ShieldAlert,
      tone: 'text-rose-600 bg-rose-50',
      text: lang === 'bn' ? a.title_bn : a.title_en,
      go: 'khatians',
    })),
    pendingMut > 0 && {
      key: 'mut',
      icon: RefreshCcw,
      tone: 'text-amber-600 bg-amber-50',
      text: t(`${n(pendingMut)}টি নামজারি অপেক্ষায়`, `${pendingMut} mutations waiting`),
      go: 'mutations',
    },
    openDisputes > 0 && {
      key: 'disp',
      icon: AlertTriangle,
      tone: 'text-orange-600 bg-orange-50',
      text: t(`${n(openDisputes)}টি বিরোধ খোলা`, `${openDisputes} open disputes`),
      go: 'appeals',
    },
  ].filter(Boolean) as Array<{ key: string; icon: React.ElementType; tone: string; text: string; go: string }>;

  const series = useMemo(() => {
    const raw: any[] = Array.isArray(stats?.monthly_series) ? stats.monthly_series.slice(-6) : [];
    return raw.map((r) => {
      const d = new Date(`${r.period}-01T00:00:00`);
      return {
        label: isNaN(d.getTime()) ? r.period : d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', { month: 'short' }),
        deeds: Number(r.deeds) || 0,
        mutations: Number(r.mutations) || 0,
      };
    });
  }, [stats, lang]);

  const chartConfig = {
    deeds: { label: t('দলিল', 'Deeds'), color: '#006A4E' },
    mutations: { label: t('নামজারি', 'Mutations'), color: '#7dd3c0' },
  } satisfies ChartConfig;

  const activity: any[] = Array.isArray(stats?.recent_activity) ? stats.recent_activity.slice(0, 6) : [];
  const actions = adminActions.filter((a) => a.id !== 'override' || onOpenOverride);

  return (
    <AdminPage>
      {/* Title row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-slate-900">{t('আজকের সারসংক্ষেপ', "Today's summary")}</h1>
          {ledgerOk !== undefined && (
            <StatusBadge tone={ledgerOk ? 'green' : 'red'}>
              {ledgerOk ? t('তথ্য নিরাপদ', 'Records safe') : t('তথ্যে সমস্যা', 'Records issue')}
            </StatusBadge>
          )}
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={refresh} disabled={refreshing}>
          <RotateCcw className={cn('size-3.5', refreshing && 'animate-spin')} />
          {t('রিফ্রেশ', 'Refresh')}
        </Button>
      </div>

      {/* Key numbers */}
      <StatGrid>
        <StatCard label={t('মোট দলিল', 'Deeds')} value={deeds !== null ? n(deeds) : '—'} icon={FileCheck2} tone="green" onClick={() => onNavigateSubPage('deeds')} />
        <StatCard label={t('নামজারি অপেক্ষায়', 'Mutations waiting')} value={n(pendingMut)} icon={RefreshCcw} tone="amber" onClick={() => onNavigateSubPage('mutations')} />
        <StatCard label={t('খোলা বিরোধ', 'Open disputes')} value={n(openDisputes)} icon={Scale} tone="red" onClick={() => onNavigateSubPage('appeals')} />
        <StatCard label={t('নাগরিক', 'Citizens')} value={citizens !== null ? n(citizens) : '—'} icon={Users} tone="blue" onClick={() => onNavigateSubPage('citizens')} />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Needs attention */}
        <Section
          className="lg:col-span-2"
          title={
            <span className="flex items-center gap-2">
              {t('জরুরি কাজ', 'Needs attention')}
              {todos.length > 0 && <StatusBadge tone="red">{n(todos.length)}</StatusBadge>}
            </span>
          }
        >
          {!loaded ? (
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
                      onClick={() => onNavigateSubPage(todo.go)}
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

        {/* Quick actions */}
        <Section title={t('দ্রুত কাজ', 'Quick actions')} bodyClassName="grid grid-cols-2 gap-2 p-3">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => runAction(a.id)}
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

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Monthly work */}
        <Section className="lg:col-span-2" title={t('মাসিক কাজ', 'Monthly work')}>
          {series.length === 0 ? (
            <EmptyState text={t('এখনো কোনো তথ্য নেই', 'No data yet')} />
          ) : (
            <ChartContainer config={chartConfig} className="aspect-auto h-52 w-full px-2 pt-3">
              <BarChart data={series} margin={{ left: -16, right: 8, top: 4, bottom: 0 }} barGap={2}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.4} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} fontSize={11} />
                <ChartTooltip cursor={{ fill: '#f1f5f9' }} content={<ChartTooltipContent indicator="dot" />} />
                <Bar dataKey="deeds" fill="var(--color-deeds)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="mutations" fill="var(--color-mutations)" radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ChartContainer>
          )}
        </Section>

        {/* Recent activity */}
        <Section title={t('সাম্প্রতিক', 'Recent')}>
          {activity.length === 0 ? (
            <EmptyState text={t('কোনো কার্যকলাপ নেই', 'No activity')} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-2.5 px-4 py-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#006A4E]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-slate-700">{actionLabel(a, lang)}</span>
                    <span className="block text-xs text-slate-400">
                      {a.actor_username} · {a.created_at ? timeAgo(a.created_at, lang) : ''}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {ledgerOk === false && (
        <button
          type="button"
          onClick={() => onNavigateSubPage('ledger')}
          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800 cursor-pointer"
        >
          <ShieldCheck className="size-4" />
          {t('নিরাপত্তা যাচাই করুন', 'Run security check')}
          <ChevronRight className="ml-auto size-4" />
        </button>
      )}
    </AdminPage>
  );
};
