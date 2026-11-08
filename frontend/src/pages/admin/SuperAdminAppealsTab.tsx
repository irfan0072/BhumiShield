import React, { useMemo, useState } from 'react';
import { CheckCircle2, Eye, Gavel, MoreHorizontal, PauseCircle, RotateCcw, Scale, ShieldAlert } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { toBanglaDigits } from '@/theme/tokens';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AdminPage,
  DataTable,
  DetailList,
  DetailSheet,
  EmptyRow,
  Field,
  FormDialog,
  PageToolbar,
  Section,
  StatCard,
  StatGrid,
  StatusBadge,
  StatusCode,
  Tone,
  notify,
} from '@/components/admin/kit';

interface SuperAdminAppealsTabProps {
  appeals: any[];
  disputes: any[];
  onRefresh: () => void;
  onOpenOverride?: (type: string, id: string | number, extra?: any) => void;
}

type Lang = 'bn' | 'en';
type View = 'appeals' | 'disputes';

/** Appeal statuses accepted by OnboardingAndAppealsController::decideAppeal. */
const APPEAL_STATUS: Record<string, { tone: Tone; bn: string; en: string }> = {
  FILED: { tone: 'amber', bn: 'দাখিল', en: 'Filed' },
  HEARING_SCHEDULED: { tone: 'blue', bn: 'শুনানি ধার্য', en: 'Hearing set' },
  STAY_ORDER_GRANTED: { tone: 'red', bn: 'স্থগিতাদেশ', en: 'Stay order' },
  UPHELD: { tone: 'green', bn: 'আদেশ বহাল', en: 'Upheld' },
  OVERTURNED: { tone: 'violet', bn: 'আদেশ বাতিল', en: 'Overturned' },
};
const APPEAL_DECISIONS = ['HEARING_SCHEDULED', 'STAY_ORDER_GRANTED', 'UPHELD', 'OVERTURNED'];

/** Dispute statuses accepted by RoleControlController::resolveDispute. */
const DISPUTE_DECISIONS: Array<{ code: string; bn: string; en: string }> = [
  { code: 'RESOLVED', bn: 'নিষ্পন্ন', en: 'Resolved' },
  { code: 'REJECTED', bn: 'খারিজ', en: 'Rejected' },
  { code: 'UPHELD_FROZEN', bn: 'জমি আটকানো', en: 'Plot frozen' },
  { code: 'PENDING_REVIEW', bn: 'যাচাই চলছে', en: 'In review' },
];
const DISPUTE_CLOSED = ['RESOLVED', 'REJECTED'];

const DISPUTE_TYPES: Record<string, [string, string]> = {
  OWNERSHIP_CLAIM: ['মালিকানা দাবি', 'Ownership claim'],
  OWNERSHIP_CHANGE: ['মালিকানা পরিবর্তন', 'Ownership change'],
  INHERITANCE: ['উত্তরাধিকার', 'Inheritance'],
  INHERITANCE_UNRESOLVED: ['উত্তরাধিকার', 'Inheritance'],
  BOUNDARY: ['সীমানা', 'Boundary'],
  BOUNDARY_VERIFICATION: ['সীমানা', 'Boundary'],
};

const SEVERITY: Record<string, { tone: Tone; bn: string; en: string }> = {
  CRITICAL: { tone: 'red', bn: 'জরুরি', en: 'Critical' },
  HIGH: { tone: 'red', bn: 'উচ্চ', en: 'High' },
  REVIEW: { tone: 'amber', bn: 'যাচাই', en: 'Review' },
  MEDIUM: { tone: 'amber', bn: 'মাঝারি', en: 'Medium' },
  LOW: { tone: 'slate', bn: 'কম', en: 'Low' },
};

const AppealStatus: React.FC<{ code?: string; lang: Lang }> = ({ code, lang }) => {
  const s = APPEAL_STATUS[String(code || '').toUpperCase()];
  if (!s) return <StatusCode code={code} lang={lang} />;
  return <StatusBadge tone={s.tone}>{lang === 'bn' ? s.bn : s.en}</StatusBadge>;
};

const fmtDate = (v: any, lang: Lang) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB');
};

const includes = (q: string, ...vals: any[]) => vals.some((v) => v != null && String(v).toLowerCase().includes(q));

const IconAction: React.FC<{ label: string; onClick: () => void; children: React.ReactNode }> = ({ label, onClick, children }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-slate-500 hover:text-slate-900"
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

export const SuperAdminAppealsTab: React.FC<SuperAdminAppealsTabProps> = ({ appeals, disputes, onRefresh, onOpenOverride }) => {
  const { lang, t } = useAppUI();
  const n = (v: any) => toBanglaDigits(v, lang);

  const [view, setView] = useState<View>('appeals');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const [viewAppeal, setViewAppeal] = useState<any | null>(null);
  const [viewDispute, setViewDispute] = useState<any | null>(null);

  const [decideTarget, setDecideTarget] = useState<any | null>(null);
  const [decideStatus, setDecideStatus] = useState('HEARING_SCHEDULED');
  const [decideNote, setDecideNote] = useState('');

  const [resolveTarget, setResolveTarget] = useState<any | null>(null);
  const [resolveStatus, setResolveStatus] = useState('RESOLVED');
  const [resolveNote, setResolveNote] = useState('');

  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.resolve(onRefresh());
    } finally {
      setRefreshing(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filteredAppeals = useMemo(
    () =>
      appeals.filter(
        (a) =>
          (statusFilter === 'ALL' || a.status === statusFilter) &&
          (!q || includes(q, a.appeal_code, a.appellant_name_bn, a.dag_no, a.dag_no_bn, a.case_no, a.appellant_nid))
      ),
    [appeals, statusFilter, q]
  );
  const filteredDisputes = useMemo(
    () =>
      disputes.filter(
        (d) =>
          (statusFilter === 'ALL' || d.status === statusFilter) &&
          (!q || includes(q, d.case_no, d.complainant_name_bn, d.dag_no, d.dag_no_bn, d.dispute_type, d.mouza_bn))
      ),
    [disputes, statusFilter, q]
  );

  const activeAppeals = appeals.filter((a) => a.status === 'FILED' || a.status === 'HEARING_SCHEDULED').length;
  const stayOrders = appeals.filter((a) => a.status === 'STAY_ORDER_GRANTED').length;
  const openDisputes = disputes.filter((d) => !DISPUTE_CLOSED.includes(String(d.status))).length;
  const closedDisputes = disputes.length - openDisputes;

  const disputeType = (code: any) => {
    const hit = DISPUTE_TYPES[String(code || '').toUpperCase()];
    return hit ? (lang === 'bn' ? hit[0] : hit[1]) : code ? String(code).replace(/_/g, ' ').toLowerCase() : '—';
  };
  const severityBadge = (code: any) => {
    const s = SEVERITY[String(code || '').toUpperCase()];
    return s ? <StatusBadge tone={s.tone}>{lang === 'bn' ? s.bn : s.en}</StatusBadge> : null;
  };

  const openDecide = (a: any) => {
    setDecideTarget(a);
    setDecideStatus(APPEAL_DECISIONS.includes(a.status) ? a.status : 'HEARING_SCHEDULED');
    setDecideNote('');
  };
  const openResolve = (d: any) => {
    setResolveTarget(d);
    setResolveStatus('RESOLVED');
    setResolveNote('');
  };

  const submitDecision = async () => {
    if (!decideTarget) return;
    setBusy(true);
    try {
      await BhumiApi.decideAppeal(decideTarget.id ?? decideTarget.appeal_code, {
        status: decideStatus,
        decision_note_bn: decideNote.trim(),
      });
      notify.ok(t('সিদ্ধান্ত সংরক্ষিত হয়েছে', 'Decision saved'));
      setDecideTarget(null);
      setViewAppeal(null);
      await refresh();
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setBusy(false);
    }
  };

  const submitResolution = async () => {
    if (!resolveTarget) return;
    setBusy(true);
    try {
      await BhumiApi.resolveDispute(resolveTarget.id, {
        status: resolveStatus,
        resolution_note_bn: resolveNote.trim(),
      });
      notify.ok(t('বিরোধ হালনাগাদ হয়েছে', 'Dispute updated'));
      setResolveTarget(null);
      setViewDispute(null);
      await refresh();
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setBusy(false);
    }
  };

  const statusOptions =
    view === 'appeals'
      ? Object.entries(APPEAL_STATUS).map(([code, s]) => ({ code, label: lang === 'bn' ? s.bn : s.en }))
      : [{ code: 'OPEN', bn: 'খোলা', en: 'Open' }, ...DISPUTE_DECISIONS].map((s) => ({
          code: s.code,
          label: lang === 'bn' ? s.bn : s.en,
        }));

  const noteTooShort = (v: string) => v.trim().length < 10;

  return (
    <AdminPage fill>
      <StatGrid>
        <StatCard
          label={t('চলমান আপিল', 'Active appeals')}
          value={n(activeAppeals)}
          icon={Gavel}
          tone="amber"
          onClick={() => setView('appeals')}
          active={view === 'appeals'}
        />
        <StatCard label={t('স্থগিতাদেশ', 'Stay orders')} value={n(stayOrders)} icon={PauseCircle} tone="red" />
        <StatCard
          label={t('খোলা বিরোধ', 'Open disputes')}
          value={n(openDisputes)}
          icon={ShieldAlert}
          tone="violet"
          onClick={() => setView('disputes')}
          active={view === 'disputes'}
        />
        <StatCard label={t('নিষ্পন্ন বিরোধ', 'Closed disputes')} value={n(closedDisputes)} icon={CheckCircle2} tone="green" />
      </StatGrid>

      <Tabs
        value={view}
        onValueChange={(v) => {
          setView(v as View);
          setStatusFilter('ALL');
        }}
      >
        <TabsList className="h-9">
          <TabsTrigger value="appeals" className="gap-1.5">
            <Gavel className="size-3.5" />
            {t('আপিল', 'Appeals')}
            <span className="text-xs text-slate-400">{n(appeals.length)}</span>
          </TabsTrigger>
          <TabsTrigger value="disputes" className="gap-1.5">
            <Scale className="size-3.5" />
            {t('বিরোধ', 'Disputes')}
            <span className="text-xs text-slate-400">{n(disputes.length)}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={view === 'appeals' ? t('কোড, নাম বা দাগ…', 'Code, name or plot…') : t('মামলা, নাম বা দাগ…', 'Case, name or plot…')}
        filters={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-40 rounded-lg text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('সব অবস্থা', 'All statuses')}</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        actions={
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={refresh} disabled={refreshing}>
            <RotateCcw className={cn('size-3.5', refreshing && 'animate-spin')} />
            {t('রিফ্রেশ', 'Refresh')}
          </Button>
        }
      />

      <TooltipProvider delayDuration={200}>
        {view === 'appeals' ? (
          <Section fill>
            <DataTable
              headers={[t('আপিল', 'Appeal'), t('দাগ', 'Plot'), t('আবেদনকারী', 'Appellant'), t('অবস্থা', 'Status'), '']}
              alignRight={[4]}
            >
              {filteredAppeals.length === 0 ? (
                <EmptyRow cols={5} text={t('কোনো আপিল নেই', 'No appeals')} />
              ) : (
                filteredAppeals.map((a) => (
                  <tr key={a.id ?? a.appeal_code} className="cursor-pointer" onClick={() => setViewAppeal(a)}>
                    <td>
                      <span className="block font-medium text-slate-900">{a.appeal_code}</span>
                      {a.case_no && <span className="block text-xs text-slate-500">{t('নামজারি', 'Mutation')} {a.case_no}</span>}
                    </td>
                    <td>
                      <span className="block text-slate-800">{a.dag_no_bn || n(a.dag_no ?? '—')}</span>
                      <span className="block text-xs text-slate-500">{fmtDate(a.created_at, lang)}</span>
                    </td>
                    <td>
                      <span className="block text-slate-800">{a.appellant_name_bn || '—'}</span>
                      {a.appellant_nid && <span className="block text-xs text-slate-500">{a.appellant_nid}</span>}
                    </td>
                    <td>
                      <AppealStatus code={a.status} lang={lang} />
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <IconAction label={t('বিস্তারিত', 'Details')} onClick={() => setViewAppeal(a)}>
                        <Eye className="size-4" />
                      </IconAction>
                      <IconAction label={t('সিদ্ধান্ত দিন', 'Decide')} onClick={() => openDecide(a)}>
                        <Gavel className="size-4" />
                      </IconAction>
                    </td>
                  </tr>
                ))
              )}
            </DataTable>
          </Section>
        ) : (
          <Section fill>
            <DataTable
              headers={[t('মামলা', 'Case'), t('দাগ', 'Plot'), t('অভিযোগকারী', 'Complainant'), t('অবস্থা', 'Status'), '']}
              alignRight={[4]}
            >
              {filteredDisputes.length === 0 ? (
                <EmptyRow cols={5} text={t('কোনো বিরোধ নেই', 'No disputes')} />
              ) : (
                filteredDisputes.map((d) => {
                  const closed = DISPUTE_CLOSED.includes(String(d.status));
                  return (
                    <tr key={d.id} className="cursor-pointer" onClick={() => setViewDispute(d)}>
                      <td>
                        <span className="block font-medium text-slate-900">{d.case_no}</span>
                        <span className="block text-xs text-slate-500">{disputeType(d.dispute_type)}</span>
                      </td>
                      <td>
                        <span className="block text-slate-800">{d.dag_no_bn || n(d.dag_no ?? d.plot_id ?? '—')}</span>
                        {d.mouza_bn && (
                          <span className="block text-xs text-slate-500">
                            {[d.mouza_bn, d.upazila_bn].filter(Boolean).join(', ')}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="block text-slate-800">{d.complainant_name_bn || '—'}</span>
                        <span className="block text-xs text-slate-500">{fmtDate(d.created_at, lang)}</span>
                      </td>
                      <td>
                        <span className="flex flex-wrap items-center gap-1.5">
                          <StatusCode code={d.status} lang={lang} />
                          {!closed && severityBadge(d.severity)}
                        </span>
                      </td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 text-slate-500" aria-label={t('আরও', 'More')}>
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => setViewDispute(d)}>
                              <Eye className="size-4" />
                              {t('বিস্তারিত', 'Details')}
                            </DropdownMenuItem>
                            {!closed && (
                              <DropdownMenuItem onClick={() => openResolve(d)}>
                                <CheckCircle2 className="size-4" />
                                {t('নিষ্পত্তি', 'Resolve')}
                              </DropdownMenuItem>
                            )}
                            {onOpenOverride && (
                              <DropdownMenuItem onClick={() => onOpenOverride('COURT_DECREE_OVERRIDE', d.case_no, d)}>
                                <ShieldAlert className="size-4" />
                                {t('ওভাররাইড', 'Override')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </DataTable>
          </Section>
        )}
      </TooltipProvider>

      {/* Appeal details */}
      <DetailSheet
        open={!!viewAppeal}
        onOpenChange={(o) => !o && setViewAppeal(null)}
        title={viewAppeal?.appeal_code || t('আপিল', 'Appeal')}
        subtitle={viewAppeal ? <AppealStatus code={viewAppeal.status} lang={lang} /> : undefined}
        footer={
          viewAppeal && (
            <Button size="sm" className="h-9 gap-1.5" onClick={() => openDecide(viewAppeal)}>
              <Gavel className="size-4" />
              {t('সিদ্ধান্ত দিন', 'Decide')}
            </Button>
          )
        }
      >
        {viewAppeal && (
          <>
            <DetailList
              items={[
                [t('আবেদনকারী', 'Appellant'), viewAppeal.appellant_name_bn],
                [t('এনআইডি', 'NID'), viewAppeal.appellant_nid],
                [t('দাগ', 'Plot'), viewAppeal.dag_no_bn || viewAppeal.dag_no],
                [t('নামজারি', 'Mutation'), viewAppeal.case_no],
                [t('দাখিল', 'Filed'), fmtDate(viewAppeal.created_at, lang)],
                !!viewAppeal.decided_at && [t('সিদ্ধান্তের তারিখ', 'Decided'), fmtDate(viewAppeal.decided_at, lang)],
                !!viewAppeal.reviewer_username && [t('সিদ্ধান্তদাতা', 'Decided by'), viewAppeal.reviewer_username],
              ]}
            />
            <NoteBlock label={t('আপিলের কারণ', 'Reason')} text={viewAppeal.reason_bn} />
            {viewAppeal.decision_note_bn && <NoteBlock label={t('আদেশ', 'Decision')} text={viewAppeal.decision_note_bn} />}
          </>
        )}
      </DetailSheet>

      {/* Dispute details */}
      <DetailSheet
        open={!!viewDispute}
        onOpenChange={(o) => !o && setViewDispute(null)}
        title={viewDispute?.case_no || t('বিরোধ', 'Dispute')}
        subtitle={viewDispute ? disputeType(viewDispute.dispute_type) : undefined}
        footer={
          viewDispute && (
            <>
              {onOpenOverride && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5"
                  onClick={() => onOpenOverride('COURT_DECREE_OVERRIDE', viewDispute.case_no, viewDispute)}
                >
                  <ShieldAlert className="size-4" />
                  {t('ওভাররাইড', 'Override')}
                </Button>
              )}
              {!DISPUTE_CLOSED.includes(String(viewDispute.status)) && (
                <Button size="sm" className="h-9 gap-1.5" onClick={() => openResolve(viewDispute)}>
                  <CheckCircle2 className="size-4" />
                  {t('নিষ্পত্তি', 'Resolve')}
                </Button>
              )}
            </>
          )
        }
      >
        {viewDispute && (
          <>
            <DetailList
              items={[
                [t('অবস্থা', 'Status'), <StatusCode code={viewDispute.status} lang={lang} />],
                !!SEVERITY[String(viewDispute.severity || '').toUpperCase()] && [t('গুরুত্ব', 'Severity'), severityBadge(viewDispute.severity)],
                [t('অভিযোগকারী', 'Complainant'), viewDispute.complainant_name_bn],
                [t('এনআইডি', 'NID'), viewDispute.complainant_nid],
                [t('দাগ', 'Plot'), viewDispute.dag_no_bn || viewDispute.dag_no || viewDispute.plot_id],
                !!viewDispute.mouza_bn && [t('মৌজা', 'Mouza'), [viewDispute.mouza_bn, viewDispute.upazila_bn].filter(Boolean).join(', ')],
                !!viewDispute.court_name && [t('আদালত', 'Court'), viewDispute.court_name],
                !!viewDispute.suit_no && [t('মোকদ্দমা নং', 'Suit no'), viewDispute.suit_no],
                !!viewDispute.lawyer_name_bn && [t('আইনজীবী', 'Lawyer'), viewDispute.lawyer_name_bn],
                [t('দাখিল', 'Filed'), fmtDate(viewDispute.created_at, lang)],
                !!viewDispute.resolved_at && [t('নিষ্পত্তির তারিখ', 'Resolved'), fmtDate(viewDispute.resolved_at, lang)],
                !!viewDispute.resolved_by && [t('নিষ্পত্তিকারী', 'Resolved by'), viewDispute.resolved_by],
              ]}
            />
            <NoteBlock label={t('বিবরণ', 'Description')} text={viewDispute.description_bn} />
            {viewDispute.resolution_notes_bn && <NoteBlock label={t('নিষ্পত্তি আদেশ', 'Resolution')} text={viewDispute.resolution_notes_bn} />}
          </>
        )}
      </DetailSheet>

      {/* Decide appeal */}
      <FormDialog
        open={!!decideTarget}
        onOpenChange={(o) => !o && setDecideTarget(null)}
        title={t('আপিলের সিদ্ধান্ত', 'Appeal decision')}
        description={decideTarget ? `${decideTarget.appeal_code} · ${decideTarget.appellant_name_bn || ''}` : undefined}
        submitLabel={t('সংরক্ষণ', 'Save')}
        cancelLabel={t('বাতিল', 'Cancel')}
        busy={busy}
        disabled={noteTooShort(decideNote)}
        onSubmit={submitDecision}
      >
        <Field label={t('সিদ্ধান্ত', 'Decision')}>
          <Select value={decideStatus} onValueChange={setDecideStatus}>
            <SelectTrigger className="h-9 w-full rounded-lg text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APPEAL_DECISIONS.map((code) => (
                <SelectItem key={code} value={code}>
                  {lang === 'bn' ? APPEAL_STATUS[code].bn : APPEAL_STATUS[code].en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t('আদেশের কারণ', 'Decision note')} hint={t('কমপক্ষে ১০ অক্ষর', 'At least 10 characters')}>
          <Textarea
            rows={3}
            value={decideNote}
            onChange={(e) => setDecideNote(e.target.value)}
            placeholder={t('শুনানির তারিখ বা আদেশ লিখুন', 'Hearing date or order')}
            className="min-h-0 rounded-lg text-sm"
          />
        </Field>
      </FormDialog>

      {/* Resolve dispute */}
      <FormDialog
        open={!!resolveTarget}
        onOpenChange={(o) => !o && setResolveTarget(null)}
        title={t('বিরোধ নিষ্পত্তি', 'Resolve dispute')}
        description={resolveTarget ? `${resolveTarget.case_no} · ${resolveTarget.complainant_name_bn || ''}` : undefined}
        submitLabel={t('সংরক্ষণ', 'Save')}
        cancelLabel={t('বাতিল', 'Cancel')}
        busy={busy}
        disabled={noteTooShort(resolveNote)}
        onSubmit={submitResolution}
      >
        <Field label={t('ফলাফল', 'Outcome')}>
          <Select value={resolveStatus} onValueChange={setResolveStatus}>
            <SelectTrigger className="h-9 w-full rounded-lg text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISPUTE_DECISIONS.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {lang === 'bn' ? s.bn : s.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t('নিষ্পত্তি আদেশ', 'Resolution note')} hint={t('কমপক্ষে ১০ অক্ষর', 'At least 10 characters')}>
          <Textarea
            rows={3}
            value={resolveNote}
            onChange={(e) => setResolveNote(e.target.value)}
            placeholder={t('রায় নং বা আদেশ লিখুন', 'Judgment no or order')}
            className="min-h-0 rounded-lg text-sm"
          />
        </Field>
      </FormDialog>
    </AdminPage>
  );
};

const NoteBlock: React.FC<{ label: string; text?: string | null }> = ({ label, text }) => (
  <div className="space-y-1">
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{text || '—'}</p>
  </div>
);
