import React, { useMemo, useState } from 'react';
import { CheckCircle2, Eye, PauseCircle, RotateCcw, XCircle } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { triggerAppNotification } from '@/components/NotificationCenter';
import {
  AdminPage,
  DataTable,
  DetailList,
  DetailSheet,
  EmptyRow,
  Field,
  FormDialog,
  LoadingRows,
  PageToolbar,
  Section,
  StatusBadge,
  notify,
} from '@/components/admin/kit';
import { DeedStatus, PENDING_MUTATION_STATUSES, fmtDate, fmtMoney, fmtNum, pickName } from './shared';

type Filter = 'ALL' | 'DUE' | 'MUTATED' | 'HELD' | 'REJECTED';
type Decision = 'REGISTERED' | 'HELD' | 'REJECTED';

const matches = (status: string, f: Filter) => {
  const s = String(status || '').toUpperCase();
  if (f === 'ALL') return true;
  if (f === 'DUE') return PENDING_MUTATION_STATUSES.includes(s);
  return s === f;
};

/** Which decisions make sense for a deed in this status (backend refuses changes after mutation). */
const allowedDecisions = (status: string): Decision[] => {
  const s = String(status || '').toUpperCase();
  if (s === 'HELD') return ['REGISTERED', 'REJECTED'];
  if (PENDING_MUTATION_STATUSES.includes(s)) return ['HELD', 'REJECTED'];
  return [];
};

const NOTE_CHIPS: Array<[string, string, string]> = [
  ['পরিচয় যাচাই সম্পন্ন', 'IDs checked', 'উভয় পক্ষের শনাক্তকরণ ও পরিচয় যাচাই সম্পন্ন হয়েছে।'],
  ['বালাম বহির সাথে মিল', 'Matches volume', 'মূল বালাম বহির সাথে খতিয়ান ও স্বত্ব মিল পাওয়া গেছে।'],
  ['ফি পরিশোধিত', 'Fees paid', 'স্ট্যাম্প শুল্ক ও রেজিস্ট্রেশন ফি পরিশোধিত হয়েছে।'],
  ['ওয়ারিশ আপত্তি', 'Heir objection', 'সহ-মালিক বা ওয়ারিশের আপত্তি থাকায় অধিকতর শুনানি প্রয়োজন।'],
];

const DEFAULT_NOTE: Record<Decision, string> = {
  REGISTERED: 'শুনানি ও পরিচয় যাচাই শেষে দলিল অনুমোদন করা হলো।',
  HELD: 'অধিকতর যাচাইয়ের জন্য শুনানি মুলতবি করা হলো।',
  REJECTED: '',
};

export const DeedsSection: React.FC<{
  mode: 'held' | 'deeds';
  deeds: any[];
  loading: boolean;
  isChecker: boolean;
  onReload: () => Promise<void> | void;
}> = ({ mode, deeds, loading, isChecker, onReload }) => {
  const { lang, t } = useAppUI();
  const n = (v: any) => fmtNum(v, lang);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [selected, setSelected] = useState<any | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const base = useMemo(() => (mode === 'held' ? deeds.filter((d) => String(d.status).toUpperCase() === 'HELD') : deeds), [deeds, mode]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { ALL: 0, DUE: 0, MUTATED: 0, HELD: 0, REJECTED: 0 };
    base.forEach((d) => (Object.keys(c) as Filter[]).forEach((f) => matches(d.status, f) && (c[f] += 1)));
    return c;
  }, [base]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return base.filter((d) => {
      if (mode === 'deeds' && !matches(d.status, filter)) return false;
      if (!q) return true;
      return [d.deed_no, d.dag_no, d.dag_no_bn, d.mouza_bn, d.mouza_en, d.seller_name_bn, d.seller_name_en, d.buyer_name_bn, d.buyer_name_en]
        .some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [base, search, filter, mode]);

  const tabs: Array<[Filter, string]> = [
    ['ALL', t('সব', 'All')],
    ['DUE', t('নামজারি বাকি', 'Mutation due')],
    ['MUTATED', t('নামজারি সম্পন্ন', 'Mutated')],
    ['HELD', t('স্থগিত', 'On hold')],
    ['REJECTED', t('বাতিল', 'Rejected')],
  ];

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onReload();
    } finally {
      setRefreshing(false);
    }
  };

  const openDecision = (d: Decision) => {
    setNote(DEFAULT_NOTE[d]);
    setDecision(d);
  };

  const submitDecision = async () => {
    if (!selected || !decision) return;
    setBusy(true);
    try {
      const res = await BhumiApi.updateRegistrarDeedStatus(Number(selected.id), { status: decision, officer_note: note.trim() });
      notify.ok((lang === 'bn' ? res?.message_bn : res?.message_en) || t('সিদ্ধান্ত সংরক্ষিত', 'Decision saved'));
      triggerAppNotification({
        title_bn: decision === 'REGISTERED' ? 'দলিল অনুমোদিত' : decision === 'HELD' ? 'দলিল স্থগিত' : 'দলিল বাতিল',
        title_en: decision === 'REGISTERED' ? 'Deed approved' : decision === 'HELD' ? 'Deed on hold' : 'Deed rejected',
        message_bn: `দলিল নং ${selected.deed_no}`,
        message_en: `Deed ${selected.deed_no}`,
        type: decision === 'REGISTERED' ? 'SUCCESS' : 'ALERT',
        targetTab: 'subregistrar',
        targetSection: 'deeds',
      });
      setDecision(null);
      setSelected(null);
      await onReload();
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setBusy(false);
    }
  };

  const decisions = selected ? allowedDecisions(selected.status) : [];
  const decisionTitle: Record<Decision, string> = {
    REGISTERED: t('দলিল অনুমোদন', 'Approve deed'),
    HELD: t('শুনানির জন্য স্থগিত', 'Hold for hearing'),
    REJECTED: t('দলিল বাতিল', 'Reject deed'),
  };
  const noteTooShort = decision !== null && decision !== 'REGISTERED' && note.trim().length < 5;

  return (
    <AdminPage fill>
      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('দলিল, দাগ, মৌজা বা নাম…', 'Deed, plot, mouza or name…')}
        filters={
          mode === 'deeds' ? (
            <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <TabsList className="h-9">
                {tabs.map(([key, label]) => (
                  <TabsTrigger key={key} value={key} className="gap-1.5 px-3 text-xs">
                    {label}
                    <span className="text-slate-400">{n(counts[key])}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : (
            <StatusBadge tone={base.length ? 'red' : 'slate'}>
              {t('স্থগিত', 'On hold')} {n(base.length)}
            </StatusBadge>
          )
        }
        actions={
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={refresh} disabled={refreshing}>
            <RotateCcw className={cn('size-3.5', refreshing && 'animate-spin')} />
            {t('রিফ্রেশ', 'Refresh')}
          </Button>
        }
      />

      <Section fill>
        <DataTable
          headers={[t('দলিল', 'Deed'), t('জমি', 'Land'), t('পক্ষ', 'Parties'), t('অবস্থা', 'Status'), '']}
          alignRight={[4]}
        >
          {loading ? (
            <LoadingRows cols={5} />
          ) : rows.length === 0 ? (
            <EmptyRow
              cols={5}
              text={mode === 'held' ? t('কোনো স্থগিত দলিল নেই', 'No deeds on hold') : t('কোনো দলিল নেই', 'No deeds')}
            />
          ) : (
            rows.map((d) => (
              <tr key={d.id} className="cursor-pointer" onClick={() => setSelected(d)}>
                <td>
                  <div className="font-medium text-slate-900">{d.deed_no}</div>
                  <div className="text-xs text-slate-500">
                    {fmtDate(d.created_at, lang)} · {fmtMoney(d.price_bdt, lang)}
                  </div>
                </td>
                <td>
                  <div className="text-slate-800">{pickName(lang, d.mouza_bn, d.mouza_en)}</div>
                  <div className="text-xs text-slate-500">
                    {t('দাগ', 'Plot')} {n(d.dag_no_bn || d.dag_no)} · {n(d.area_decimal)} {t('শতক', 'dec')}
                  </div>
                </td>
                <td>
                  <div className="text-slate-800">{pickName(lang, d.seller_name_bn, d.seller_name_en)}</div>
                  <div className="text-xs text-slate-500">
                    {t('ক্রেতা', 'Buyer')}: {pickName(lang, d.buyer_name_bn, d.buyer_name_en)}
                  </div>
                </td>
                <td>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <DeedStatus status={d.status} lang={lang} />
                    {d.ledger_valid === false && <StatusBadge tone="red">{t('হ্যাশ অমিল', 'Hash mismatch')}</StatusBadge>}
                  </div>
                </td>
                <td className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t('বিস্তারিত', 'Details')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(d);
                    }}
                  >
                    <Eye className="size-4 text-slate-500" />
                  </Button>
                </td>
              </tr>
            ))
          )}
        </DataTable>
      </Section>

      <DetailSheet
        open={!!selected && !decision}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected?.deed_no || t('দলিল', 'Deed')}
        subtitle={selected ? <DeedStatus status={selected.status} lang={lang} /> : undefined}
        footer={
          selected && isChecker && decisions.length > 0 ? (
            <>
              {decisions.includes('REJECTED') && (
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-rose-700" onClick={() => openDecision('REJECTED')}>
                  <XCircle className="size-4" />
                  {t('বাতিল', 'Reject')}
                </Button>
              )}
              {decisions.includes('HELD') && (
                <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => openDecision('HELD')}>
                  <PauseCircle className="size-4" />
                  {t('স্থগিত', 'Hold')}
                </Button>
              )}
              {decisions.includes('REGISTERED') && (
                <Button size="sm" className="h-9 gap-1.5" onClick={() => openDecision('REGISTERED')}>
                  <CheckCircle2 className="size-4" />
                  {t('অনুমোদন', 'Approve')}
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        {selected && (
          <>
            <DetailList
              items={[
                [t('ধরন', 'Type'), selected.deed_type || '—'],
                [t('তারিখ', 'Date'), fmtDate(selected.created_at, lang)],
                [t('মৌজা', 'Mouza'), pickName(lang, selected.mouza_bn, selected.mouza_en)],
                [t('উপজেলা', 'Upazila'), pickName(lang, selected.upazila_bn, selected.upazila_en)],
                [t('দাগ', 'Plot'), n(selected.dag_no_bn || selected.dag_no)],
                [t('জমি', 'Area'), `${n(selected.area_decimal)} ${t('শতক', 'dec')}`],
                !!selected.share_fraction && [t('অংশ', 'Share'), n(selected.share_fraction)],
                [t('মূল্য', 'Value'), fmtMoney(selected.price_bdt, lang)],
                !!selected.fees && [t('সরকারি ফি', 'Govt fees'), fmtMoney(selected.fees.total_govt_fees_bdt, lang)],
              ]}
            />
            <DetailList
              items={[
                [
                  t('বিক্রেতা', 'Seller'),
                  <span key="s">
                    {pickName(lang, selected.seller_name_bn, selected.seller_name_en)}
                    {selected.seller_nid && <span className="block text-xs font-normal text-slate-500">{n(selected.seller_nid)}</span>}
                  </span>,
                ],
                [
                  t('ক্রেতা', 'Buyer'),
                  <span key="b">
                    {pickName(lang, selected.buyer_name_bn, selected.buyer_name_en)}
                    {selected.buyer_nid && <span className="block text-xs font-normal text-slate-500">{n(selected.buyer_nid)}</span>}
                  </span>,
                ],
                [
                  t('ডিজিটাল সিল', 'Digital seal'),
                  <StatusBadge key="l" tone={selected.ledger_valid === false ? 'red' : 'green'}>
                    {selected.ledger_valid === false ? t('অমিল', 'Mismatch') : t('সঠিক', 'Valid')}
                  </StatusBadge>,
                ],
                !!selected.registered_by && [t('নিবন্ধনকারী', 'Registered by'), selected.registered_by],
              ]}
            />

            {(selected.content_hash || selected.signature) && (
              <Accordion type="single" collapsible className="rounded-lg border border-slate-200 px-3">
                <AccordionItem value="proof" className="border-none">
                  <AccordionTrigger className="py-2.5 text-sm text-slate-700">{t('আরও তথ্য', 'More')}</AccordionTrigger>
                  <AccordionContent className="space-y-2 pb-3 text-xs text-slate-600">
                    {selected.content_hash && (
                      <div>
                        <div className="text-slate-500">{t('হ্যাশ', 'Hash')}</div>
                        <div className="break-all font-mono">{selected.content_hash}</div>
                      </div>
                    )}
                    {selected.signature && (
                      <div>
                        <div className="text-slate-500">{t('স্বাক্ষর', 'Signature')}</div>
                        <div className="break-all font-mono">{selected.signature}</div>
                      </div>
                    )}
                    {selected.chain_index !== undefined && (
                      <div>
                        {t('ক্রম', 'Index')}: {n(selected.chain_index)}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            {!isChecker && decisions.length > 0 && (
              <p className="text-xs text-slate-500">{t('সিদ্ধান্ত শুধু সাব-রেজিস্ট্রার দিতে পারেন', 'Only the Sub-Registrar can decide')}</p>
            )}
            {String(selected.status).toUpperCase() === 'MUTATED' && (
              <p className="text-xs text-slate-500">{t('নামজারি সম্পন্ন, অবস্থা বদলানো যাবে না', 'Mutated, status is final')}</p>
            )}
          </>
        )}
      </DetailSheet>

      <FormDialog
        open={!!decision}
        onOpenChange={(o) => !o && setDecision(null)}
        title={decision ? decisionTitle[decision] : ''}
        description={selected?.deed_no}
        submitLabel={decision === 'REGISTERED' ? t('অনুমোদন', 'Approve') : decision === 'HELD' ? t('স্থগিত', 'Hold') : t('বাতিল করুন', 'Reject')}
        destructive={decision === 'REJECTED'}
        busy={busy}
        disabled={noteTooShort}
        size="sm"
        onSubmit={submitDecision}
      >
        <div className="flex flex-wrap gap-1.5">
          {NOTE_CHIPS.map(([bn, en, text]) => (
            <button
              key={bn}
              type="button"
              onClick={() => setNote((p) => (p.trim() ? `${p.trim()} ${text}` : text))}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
            >
              {lang === 'bn' ? bn : en}
            </button>
          ))}
        </div>
        <Field label={t('কর্মকর্তার মন্তব্য', 'Officer note')}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="min-h-0 rounded-lg text-sm" />
        </Field>
      </FormDialog>
    </AdminPage>
  );
};
