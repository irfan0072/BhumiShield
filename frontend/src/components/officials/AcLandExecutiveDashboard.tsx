import React, { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  FileCheck2,
  FilePlus2,
  FileSearch,
  Gavel,
  Layers,
  RefreshCcw,
  RotateCcw,
  Scale,
  Search,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useAppUI } from '@/i18n';
import { toBanglaDigits } from '@/theme/tokens';
import { cn } from '@/lib/utils';
import { AdminPage, EmptyState, Section, StatCard, StatGrid, StatusBadge, Tone } from '@/components/admin/kit';
import {
  AcLandData,
  AcLandIntent,
  AcLandTabId,
  EMPTY_DATA,
  daysSince,
  isOpenDispute,
  isOverdueMutation,
  isPendingAppeal,
  isPendingMutation,
  up,
} from '@/pages/acland/shared';

interface AcLandExecutiveDashboardProps {
  onNavigateTab: (tab: string) => void;
  /** Open a record or a create form inside a section (navigates there too). */
  onOpen?: (intent: Omit<AcLandIntent, 'nonce'>) => void;
  data?: AcLandData;
  loaded?: boolean;
  /** Survey records prepared but not yet submitted (maker). */
  stagedCount?: number;
  /** @deprecated kept for compatibility; pass `data` instead */
  mutations?: any[];
  /** @deprecated kept for compatibility; pass `data` instead */
  disputes?: any[];
  /** @deprecated not used any more */
  stats?: any;
}

interface Kpi {
  key: string;
  label: string;
  value: number | null;
  icon: React.ElementType;
  tone: Tone;
  tab: AcLandTabId;
}
interface Todo {
  key: string;
  text: string;
  sub?: string;
  icon: React.ElementType;
  tone: string;
  open: Omit<AcLandIntent, 'nonce'>;
}
interface QuickAction {
  key: string;
  label: string;
  icon: React.ElementType;
  tone: string;
  open: Omit<AcLandIntent, 'nonce'>;
}

const TONE_TILE = {
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-rose-50 text-rose-700',
  blue: 'bg-sky-50 text-sky-700',
  green: 'bg-emerald-50 text-emerald-700',
  violet: 'bg-violet-50 text-violet-700',
  slate: 'bg-slate-100 text-slate-600',
};

export const AcLandExecutiveDashboard: React.FC<AcLandExecutiveDashboardProps> = ({
  onNavigateTab,
  onOpen,
  data,
  loaded = true,
  stagedCount = 0,
  mutations,
  disputes,
}) => {
  const { lang, t, role, user } = useAppUI();
  const n = (v: any) => toBanglaDigits(v ?? '', lang);
  const d: AcLandData = data || { ...EMPTY_DATA, mutations: mutations || [], disputes: disputes || [] };
  const open = (i: Omit<AcLandIntent, 'nonce'>) => (onOpen ? onOpen(i) : onNavigateTab(i.tab));

  const view = useMemo(() => {
    const plotLine = (x: any) =>
      `${t('দাগ', 'Plot')} ${n(x.dag_no_bn || x.dag_no || x.plot_id || '—')}${x.mouza_bn || x.mouza_en ? ` · ${lang === 'bn' ? x.mouza_bn || x.mouza_en : x.mouza_en || x.mouza_bn}` : ''}`;

    const pendingMut = d.mutations.filter(isPendingMutation);
    const overdueMut = pendingMut.filter(isOverdueMutation);
    const openDisp = d.disputes.filter(isOpenDispute);
    const pendingAppeals = d.appeals.filter(isPendingAppeal);
    const submitted = d.batches.filter((b) => up(b.status) === 'SUBMITTED');
    const returned = d.batches.filter((b) => up(b.status) === 'RETURNED');
    const approvedBatches = d.batches.filter((b) => up(b.status) === 'APPROVED');
    const reportedPlots = new Set(d.fieldReports.map((r) => String(r.plot_id)));
    const needVisit = pendingMut.filter((m) => m.plot_id && !reportedPlots.has(String(m.plot_id)));
    const flaggedReports = d.fieldReports.filter(
      (r) => ['CONTESTED', 'PARTIAL_DISPUTE', 'ENCROACHED'].includes(up(r.possession_status)) || ['DISPUTED', 'ENCROACHED', 'ENCROACHED_NORTH'].includes(up(r.boundary_status))
    );

    const mutTodo = (m: any, overdue = false): Todo => ({
      key: `m${m.id}`,
      text: `${t('নামজারি', 'Mutation')} ${m.case_no || ''}`,
      sub: overdue
        ? lang === 'bn'
          ? `${n(daysSince(m.created_at))} দিন পার · ${plotLine(m)}`
          : `${daysSince(m.created_at)} days · ${plotLine(m)}`
        : plotLine(m),
      icon: overdue ? Clock : RefreshCcw,
      tone: overdue ? TONE_TILE.red : TONE_TILE.amber,
      open: { tab: 'mutations', recordId: m.id },
    });
    const dispTodo = (x: any): Todo => ({
      key: `d${x.id}`,
      text: `${t('বিরোধ', 'Dispute')} ${x.case_no || ''}`,
      sub: plotLine(x),
      icon: Gavel,
      tone: TONE_TILE.red,
      open: { tab: 'disputes', recordId: x.id },
    });
    const khatTodo = (k: any): Todo => ({
      key: `k${k.id}`,
      text: t('খতিয়ানে অমিল', 'Khatian mismatch'),
      sub: plotLine(k),
      icon: AlertTriangle,
      tone: TONE_TILE.violet,
      open: { tab: 'khatians', recordId: k.plot_id ?? k.id },
    });
    const appealTodo = (a: any): Todo => ({
      key: `a${a.id}`,
      text: `${t('আপিল', 'Appeal')} ${a.appeal_code || ''}`,
      sub: [a.appellant_name_bn, a.case_no].filter(Boolean).join(' · '),
      icon: Scale,
      tone: TONE_TILE.blue,
      open: { tab: 'appeals', recordId: a.id },
    });
    const batchTodo = (b: any, tab: AcLandTabId, kind: 'check' | 'fix'): Todo => ({
      key: `b${b.id}`,
      text: `${kind === 'fix' ? t('ফেরত ব্যাচ', 'Returned batch') : t('যাচাই বাকি', 'To check')} ${b.batch_no || ''}`,
      sub: [b.maker_name_bn, b.item_count != null ? (lang === 'bn' ? `${n(b.item_count)}টি রেকর্ড` : `${b.item_count} records`) : null]
        .filter(Boolean)
        .join(' · '),
      icon: kind === 'fix' ? RotateCcw : FileCheck2,
      tone: kind === 'fix' ? TONE_TILE.red : TONE_TILE.amber,
      open: { tab, recordId: b.id },
    });

    const quick = {
      mutations: { key: 'qm', label: t('নামজারি', 'Mutations'), icon: RefreshCcw, tone: TONE_TILE.amber, open: { tab: 'mutations' as AcLandTabId } },
      disputes: { key: 'qd', label: t('বিরোধ', 'Disputes'), icon: Gavel, tone: TONE_TILE.red, open: { tab: 'disputes' as AcLandTabId } },
      fieldNew: { key: 'qf', label: t('মাঠ প্রতিবেদন', 'Field report'), icon: FilePlus2, tone: TONE_TILE.blue, open: { tab: 'field_reports' as AcLandTabId, create: true } },
      fieldList: { key: 'qfl', label: t('মাঠ প্রতিবেদন', 'Field reports'), icon: FileSearch, tone: TONE_TILE.blue, open: { tab: 'field_reports' as AcLandTabId } },
      sla: { key: 'qs', label: t('তাগিদ পাঠান', 'Send reminder'), icon: Send, tone: TONE_TILE.violet, open: { tab: 'sla_overview' as AcLandTabId, create: true } },
      khatians: { key: 'qk', label: t('সমস্যাযুক্ত খতিয়ান', 'Flagged khatians'), icon: AlertTriangle, tone: TONE_TILE.violet, open: { tab: 'khatians' as AcLandTabId } },
      explorer: { key: 'qe', label: t('খতিয়ান খুঁজুন', 'Find khatian'), icon: Search, tone: TONE_TILE.slate, open: { tab: 'explorer' as AcLandTabId } },
      verifier: { key: 'qv', label: t('দলিল যাচাই', 'Verify deed'), icon: ShieldCheck, tone: TONE_TILE.green, open: { tab: 'verifier' as AcLandTabId } },
      appeals: { key: 'qa', label: t('আপিল', 'Appeals'), icon: Scale, tone: TONE_TILE.blue, open: { tab: 'appeals' as AcLandTabId } },
      addRecord: { key: 'qr', label: t('রেকর্ড যোগ', 'Add record'), icon: FilePlus2, tone: TONE_TILE.green, open: { tab: 'survey_batches' as AcLandTabId, create: true } },
      batches: { key: 'qb', label: t('জরিপ ব্যাচ', 'Survey batches'), icon: Compass, tone: TONE_TILE.blue, open: { tab: 'survey_batches' as AcLandTabId } },
      approve: { key: 'qo', label: t('রেকর্ড অনুমোদন', 'Record approval'), icon: CheckCircle2, tone: TONE_TILE.amber, open: { tab: 'onboarding' as AcLandTabId } },
    } satisfies Record<string, QuickAction>;

    let kpis: Kpi[];
    let todos: Todo[];
    let actions: QuickAction[];

    switch (role) {
      case 'field_verification_officer':
        kpis = [
          { key: 'visit', label: t('মাঠ পরিদর্শন বাকি', 'Visits due'), value: needVisit.length, icon: Compass, tone: 'amber', tab: 'field_reports' },
          { key: 'reports', label: t('আমার প্রতিবেদন', 'My reports'), value: d.fieldReports.length, icon: FileSearch, tone: 'blue', tab: 'field_reports' },
          { key: 'issues', label: t('সমস্যা পাওয়া গেছে', 'Problems found'), value: flaggedReports.length, icon: AlertTriangle, tone: 'red', tab: 'field_reports' },
          { key: 'pending', label: t('নামজারি অপেক্ষায়', 'Mutations waiting'), value: pendingMut.length, icon: RefreshCcw, tone: 'slate', tab: 'mutations' },
        ];
        todos = needVisit.map((m) => ({
          key: `v${m.id}`,
          text: `${t('মাঠ প্রতিবেদন বাকি', 'Field report due')} · ${m.case_no || ''}`,
          sub: plotLine(m),
          icon: Compass,
          tone: TONE_TILE.amber,
          open: { tab: 'field_reports', create: true, plotId: Number(m.plot_id) },
        }));
        actions = [quick.fieldNew, quick.mutations, quick.explorer];
        break;

      case 'uno_supervisor':
        kpis = [
          { key: 'pending', label: t('নামজারি অপেক্ষায়', 'Mutations waiting'), value: pendingMut.length, icon: RefreshCcw, tone: 'amber', tab: 'mutations' },
          { key: 'overdue', label: t('২৮ দিন পার', 'Over 28 days'), value: overdueMut.length, icon: Clock, tone: 'red', tab: 'mutations' },
          { key: 'disputes', label: t('খোলা বিরোধ', 'Open disputes'), value: openDisp.length, icon: Gavel, tone: 'violet', tab: 'disputes' },
          { key: 'sla', label: t('পাঠানো তাগিদ', 'Reminders sent'), value: d.slaDispatches.length, icon: Send, tone: 'blue', tab: 'sla_overview' },
        ];
        todos = [
          ...overdueMut.map((m) => mutTodo(m, true)),
          ...openDisp.slice(0, 3).map(dispTodo),
          ...pendingAppeals.slice(0, 3).map(appealTodo),
        ];
        actions = [quick.sla, quick.mutations, quick.fieldList];
        break;

      case 'appellate_reviewer':
        kpis = [
          { key: 'pa', label: t('আপিল অপেক্ষায়', 'Appeals waiting'), value: pendingAppeals.length, icon: Scale, tone: 'amber', tab: 'appeals' },
          { key: 'aa', label: t('মোট আপিল', 'All appeals'), value: d.appeals.length, icon: Layers, tone: 'blue', tab: 'appeals' },
          { key: 'od', label: t('খোলা বিরোধ', 'Open disputes'), value: openDisp.length, icon: Gavel, tone: 'red', tab: 'disputes' },
          { key: 'pm', label: t('নামজারি অপেক্ষায়', 'Mutations waiting'), value: pendingMut.length, icon: RefreshCcw, tone: 'slate', tab: 'mutations' },
        ];
        todos = [...pendingAppeals.map(appealTodo), ...openDisp.slice(0, 4).map(dispTodo)];
        actions = [quick.appeals, quick.disputes, quick.verifier];
        break;

      case 'settlement_records_officer':
        kpis = [
          { key: 'ret', label: t('ফেরত ব্যাচ', 'Returned'), value: returned.length, icon: RotateCcw, tone: 'red', tab: 'survey_batches' },
          { key: 'wait', label: t('যাচাই বাকি', 'Waiting check'), value: submitted.length, icon: Clock, tone: 'amber', tab: 'survey_batches' },
          { key: 'ok', label: t('অনুমোদিত', 'Approved'), value: approvedBatches.length, icon: CheckCircle2, tone: 'green', tab: 'survey_batches' },
          { key: 'draft', label: t('জমা দেওয়া বাকি', 'Not submitted'), value: stagedCount, icon: FilePlus2, tone: 'blue', tab: 'survey_batches' },
        ];
        todos = [
          ...returned.map((b) => batchTodo(b, 'survey_batches', 'fix')),
          ...(stagedCount > 0
            ? [
                {
                  key: 'staged',
                  text: lang === 'bn' ? `${n(stagedCount)}টি রেকর্ড জমা দেওয়া বাকি` : `${stagedCount} records not submitted`,
                  icon: FilePlus2,
                  tone: TONE_TILE.blue,
                  open: { tab: 'survey_batches' as AcLandTabId },
                },
              ]
            : []),
        ];
        actions = [quick.addRecord, quick.batches, quick.explorer];
        break;

      case 'settlement_checker': {
        const toCheck = submitted.filter((b) => Number(b.maker_user_id) !== Number(user?.id));
        kpis = [
          { key: 'wait', label: t('যাচাই বাকি', 'To check'), value: toCheck.length, icon: FileCheck2, tone: 'amber', tab: 'onboarding' },
          { key: 'ret', label: t('ফেরত পাঠানো', 'Returned'), value: returned.length, icon: RotateCcw, tone: 'red', tab: 'onboarding' },
          { key: 'ok', label: t('অনুমোদিত', 'Approved'), value: approvedBatches.length, icon: CheckCircle2, tone: 'green', tab: 'onboarding' },
          { key: 'all', label: t('মোট ব্যাচ', 'All batches'), value: d.batches.length, icon: Layers, tone: 'blue', tab: 'survey_batches' },
        ];
        todos = toCheck.map((b) => batchTodo(b, 'onboarding', 'check'));
        actions = [quick.approve, quick.batches, quick.explorer];
        break;
      }

      case 'land_office_assistant':
        kpis = [
          { key: 'pm', label: t('নামজারি অপেক্ষায়', 'Mutations waiting'), value: pendingMut.length, icon: RefreshCcw, tone: 'amber', tab: 'mutations' },
          { key: 'od', label: t('খোলা বিরোধ', 'Open disputes'), value: openDisp.length, icon: Gavel, tone: 'red', tab: 'disputes' },
          { key: 'fk', label: t('সমস্যাযুক্ত খতিয়ান', 'Flagged khatians'), value: d.flaggedKhatians.length, icon: AlertTriangle, tone: 'violet', tab: 'khatians' },
          {
            key: 'am',
            label: t('অনুমোদিত নামজারি', 'Approved mutations'),
            value: d.mutations.filter((m) => up(m.status) === 'APPROVED').length,
            icon: CheckCircle2,
            tone: 'green',
            tab: 'mutations',
          },
        ];
        todos = [...pendingMut.slice(0, 5).map((m) => mutTodo(m, isOverdueMutation(m))), ...openDisp.slice(0, 3).map(dispTodo), ...d.flaggedKhatians.slice(0, 3).map(khatTodo)];
        actions = [quick.mutations, quick.khatians, quick.explorer, quick.verifier];
        break;

      default: {
        // ac_land, admin, system_admin
        const toCheck = submitted.filter((b) => Number(b.maker_user_id) !== Number(user?.id));
        kpis = [
          { key: 'pm', label: t('নামজারি অপেক্ষায়', 'Mutations waiting'), value: pendingMut.length, icon: RefreshCcw, tone: 'amber', tab: 'mutations' },
          { key: 'od', label: t('খোলা বিরোধ', 'Open disputes'), value: openDisp.length, icon: Gavel, tone: 'red', tab: 'disputes' },
          { key: 'fk', label: t('সমস্যাযুক্ত খতিয়ান', 'Flagged khatians'), value: d.flaggedKhatians.length, icon: AlertTriangle, tone: 'violet', tab: 'khatians' },
          { key: 'pa', label: t('আপিল অপেক্ষায়', 'Appeals waiting'), value: pendingAppeals.length, icon: Scale, tone: 'blue', tab: 'appeals' },
        ];
        todos = [
          ...overdueMut.map((m) => mutTodo(m, true)),
          ...pendingMut.filter((m) => !isOverdueMutation(m)).slice(0, 5).map((m) => mutTodo(m)),
          ...openDisp.slice(0, 4).map(dispTodo),
          ...d.flaggedKhatians.slice(0, 3).map(khatTodo),
          ...toCheck.slice(0, 3).map((b) => batchTodo(b, 'onboarding', 'check')),
        ];
        actions = [quick.mutations, quick.fieldNew, quick.sla, quick.explorer];
      }
    }

    return { kpis, todos: todos.slice(0, 10), total: todos.length, actions };
  }, [d, role, user?.id, lang, stagedCount]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AdminPage>
      <StatGrid>
        {view.kpis.map((k) => (
          <StatCard
            key={k.key}
            label={k.label}
            value={loaded && k.value !== null ? n(k.value) : '—'}
            icon={k.icon}
            tone={k.tone}
            onClick={() => onNavigateTab(k.tab)}
          />
        ))}
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section
          className="lg:col-span-2"
          title={
            <span className="flex items-center gap-2">
              {t('জরুরি কাজ', 'Needs attention')}
              {loaded && view.total > 0 && <StatusBadge tone="red">{n(view.total)}</StatusBadge>}
            </span>
          }
        >
          {!loaded ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : view.todos.length === 0 ? (
            <EmptyState icon={CheckCircle2} text={t('সব কাজ শেষ', 'All clear')} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {view.todos.map((todo) => {
                const Icon = todo.icon;
                return (
                  <li key={todo.key}>
                    <button
                      type="button"
                      onClick={() => open(todo.open)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 cursor-pointer"
                    >
                      <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-md', todo.tone)}>
                        <Icon className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-slate-800">{todo.text}</span>
                        {todo.sub && <span className="block truncate text-xs text-slate-500">{todo.sub}</span>}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-slate-300" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title={t('দ্রুত কাজ', 'Quick actions')} bodyClassName="grid grid-cols-2 gap-2 p-3">
          {view.actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => open(a.open)}
                className="flex flex-col items-start gap-2 rounded-lg border border-slate-200 p-2.5 text-left transition hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                <span className={cn('flex size-7 items-center justify-center rounded-md', a.tone)}>
                  <Icon className="size-3.5" />
                </span>
                <span className="text-xs font-medium text-slate-800">{a.label}</span>
              </button>
            );
          })}
        </Section>
      </div>
    </AdminPage>
  );
};
