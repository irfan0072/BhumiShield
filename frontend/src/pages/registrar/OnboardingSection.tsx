import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, FilePlus2, Loader2, RotateCcw, XCircle } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AdminPage,
  ConfirmDialog,
  DataTable,
  DetailList,
  DetailSheet,
  EmptyRow,
  LoadingRows,
  PageToolbar,
  Section,
  StatusCode,
  notify,
} from '@/components/admin/kit';
import { DeedDraftPrefill, fmtDate, fmtMoney, fmtNum, recordTypeLabel } from './shared';

type Filter = 'SUBMITTED' | 'ALL';

const ITEM_LABELS: Record<string, [string, string]> = {
  deed_type: ['ধরন', 'Type'],
  dag_no: ['দাগ', 'Plot'],
  mouza: ['মৌজা', 'Mouza'],
  seller_name: ['বিক্রেতা', 'Seller'],
  donor_name: ['দাতা', 'Donor'],
  buyer_name: ['ক্রেতা', 'Buyer'],
  donee_name: ['গ্রহীতা', 'Donee'],
  area_decimal: ['জমি (শতক)', 'Area (dec)'],
  share_fraction: ['অংশ', 'Share'],
  declared_value_bdt: ['মূল্য', 'Value'],
  khatian_no: ['খতিয়ান', 'Khatian'],
  status: ['অবস্থা', 'Status'],
};

export const OnboardingSection: React.FC<{
  batches: any[];
  loading: boolean;
  isChecker: boolean;
  onReload: () => Promise<void> | void;
  onUseDraft?: (draft: DeedDraftPrefill) => void;
}> = ({ batches, loading, isChecker, onReload, onUseDraft }) => {
  const { lang, t } = useAppUI();
  const n = (v: any) => fmtNum(v, lang);
  const [filter, setFilter] = useState<Filter>('SUBMITTED');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const counts = useMemo(
    () => ({ SUBMITTED: batches.filter((b) => b.status === 'SUBMITTED').length, ALL: batches.length }),
    [batches]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return batches.filter((b) => {
      if (filter === 'SUBMITTED' && b.status !== 'SUBMITTED') return false;
      if (!q) return true;
      return [b.batch_no, b.record_type, b.maker_name_bn].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [batches, filter, search]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    let alive = true;
    setDetailLoading(true);
    BhumiApi.getOnboardingBatch(selected.id)
      .then((res) => alive && setDetail(res))
      .catch((e) => alive && notify.err(e, lang))
      .finally(() => alive && setDetailLoading(false));
    return () => {
      alive = false;
    };
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onReload();
    } finally {
      setRefreshing(false);
    }
  };

  const decide = async (reason: string) => {
    if (!selected || !decision) return;
    try {
      const res = await BhumiApi.decideOnboardingBatch(selected.id, decision, reason);
      notify.ok((lang === 'bn' ? res?.message_bn : res?.message_en) || t('সিদ্ধান্ত সংরক্ষিত', 'Decision saved'));
      setSelected(null);
      await onReload();
    } catch (e) {
      notify.err(e, lang);
      throw e;
    }
  };

  const title = (b: any) => {
    try {
      return JSON.parse(b?.proof_package_json || '{}')?.batch_title_bn || '';
    } catch {
      return '';
    }
  };

  const items: any[] = detail?.items || [];
  const canDecide = isChecker && selected?.status === 'SUBMITTED';

  return (
    <AdminPage fill>
      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('ব্যাচ বা প্রেরক…', 'Batch or sender…')}
        filters={
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList className="h-9">
              <TabsTrigger value="SUBMITTED" className="gap-1.5 px-3 text-xs">
                {t('অপেক্ষমাণ', 'Pending')}
                <span className="text-slate-400">{n(counts.SUBMITTED)}</span>
              </TabsTrigger>
              <TabsTrigger value="ALL" className="gap-1.5 px-3 text-xs">
                {t('সব', 'All')}
                <span className="text-slate-400">{n(counts.ALL)}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
        actions={
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={refresh} disabled={refreshing}>
            <RotateCcw className={cn('size-3.5', refreshing && 'animate-spin')} />
            {t('রিফ্রেশ', 'Refresh')}
          </Button>
        }
      />

      <Section fill>
        <DataTable headers={[t('ব্যাচ', 'Batch'), t('ধরন', 'Type'), t('প্রেরক', 'Sender'), t('অবস্থা', 'Status'), '']} alignRight={[4]}>
          {loading ? (
            <LoadingRows cols={5} />
          ) : rows.length === 0 ? (
            <EmptyRow cols={5} text={filter === 'SUBMITTED' ? t('অপেক্ষমাণ কিছু নেই', 'Nothing pending') : t('কোনো ব্যাচ নেই', 'No batches')} />
          ) : (
            rows.map((b) => (
              <tr key={b.id} className="cursor-pointer" onClick={() => setSelected(b)}>
                <td>
                  <div className="font-medium text-slate-900">{b.batch_no}</div>
                  <div className="text-xs text-slate-500">{fmtDate(b.created_at, lang)}</div>
                </td>
                <td>
                  <div className="text-slate-800">{recordTypeLabel(b.record_type, lang)}</div>
                  <div className="text-xs text-slate-500">
                    {n(b.item_count ?? 0)} {t('রেকর্ড', 'records')}
                  </div>
                </td>
                <td className="max-w-[16rem]">
                  <div className="truncate text-slate-800">{b.maker_name_bn || '—'}</div>
                </td>
                <td>
                  <StatusCode code={b.status} lang={lang} />
                </td>
                <td className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t('বিস্তারিত', 'Details')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(b);
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
        title={selected?.batch_no || t('ব্যাচ', 'Batch')}
        subtitle={selected ? <StatusCode code={selected.status} lang={lang} /> : undefined}
        footer={
          canDecide ? (
            <>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-rose-700" onClick={() => setDecision('REJECTED')}>
                <XCircle className="size-4" />
                {t('বাতিল', 'Reject')}
              </Button>
              <Button size="sm" className="h-9 gap-1.5" onClick={() => setDecision('APPROVED')}>
                <CheckCircle2 className="size-4" />
                {t('অনুমোদন', 'Approve')}
              </Button>
            </>
          ) : undefined
        }
      >
        {selected && (
          <>
            <DetailList
              items={[
                [t('ধরন', 'Type'), recordTypeLabel(selected.record_type, lang)],
                !!title(selected) && [t('শিরোনাম', 'Title'), title(selected)],
                [t('প্রেরক', 'Sender'), selected.maker_name_bn || '—'],
                [t('জমার তারিখ', 'Submitted'), fmtDate(selected.created_at, lang)],
                !!selected.checker_name_bn && [t('সিদ্ধান্ত দিয়েছেন', 'Decided by'), selected.checker_name_bn],
                !!selected.decided_at && [t('সিদ্ধান্তের তারিখ', 'Decided on'), fmtDate(selected.decided_at, lang)],
              ]}
            />

            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-500">
                {t('রেকর্ড', 'Records')} {n(items.length || selected.item_count || 0)}
              </div>
              {detailLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="size-4 animate-spin text-slate-400" />
                </div>
              ) : (
                items.map((it, idx) => {
                  const p = it.payload || {};
                  const entries = Object.entries(p).filter(([k, v]) => !k.startsWith('_') && v !== null && v !== '' && typeof v !== 'object' && ITEM_LABELS[k]);
                  const errors: string[] = Array.isArray(p._validation_errors) ? p._validation_errors : [];
                  const usable = isChecker && selected.record_type === 'DEED_DRAFT' && p.plot_id && onUseDraft;
                  return (
                    <div key={it.id || idx} className="space-y-2 rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-800">#{n(idx + 1)}</span>
                        <StatusCode code={it.validation_status} lang={lang} />
                      </div>
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                        {entries.map(([k, v]) => (
                          <React.Fragment key={k}>
                            <dt className="text-xs text-slate-500">{lang === 'bn' ? ITEM_LABELS[k][0] : ITEM_LABELS[k][1]}</dt>
                            <dd className="truncate text-right text-slate-800">
                              {k === 'declared_value_bdt' ? fmtMoney(v, lang) : n(String(v))}
                            </dd>
                          </React.Fragment>
                        ))}
                      </dl>
                      {errors.length > 0 && <p className="text-xs text-rose-600">{errors.join(', ')}</p>}
                      {usable && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-full gap-1.5"
                          onClick={() => {
                            onUseDraft!({
                              plot_id: Number(p.plot_id),
                              seller_id: p.seller_id ? Number(p.seller_id) : undefined,
                              buyer_id: p.buyer_id ? Number(p.buyer_id) : undefined,
                              area_decimal: p.area_decimal,
                              share_fraction: p.share_fraction,
                              declared_value_bdt: p.declared_value_bdt ?? p.price_bdt,
                            });
                            setSelected(null);
                          }}
                        >
                          <FilePlus2 className="size-3.5" />
                          {t('নিবন্ধনে নিন', 'Open in new deed')}
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {!isChecker && selected.status === 'SUBMITTED' && (
              <p className="text-xs text-slate-500">{t('অনুমোদন শুধু সাব-রেজিস্ট্রার দিতে পারেন', 'Only the Sub-Registrar can approve')}</p>
            )}
          </>
        )}
      </DetailSheet>

      <ConfirmDialog
        open={!!decision}
        onOpenChange={(o) => !o && setDecision(null)}
        title={decision === 'APPROVED' ? t('ব্যাচ অনুমোদন', 'Approve batch') : t('ব্যাচ বাতিল', 'Reject batch')}
        confirmLabel={decision === 'APPROVED' ? t('অনুমোদন', 'Approve') : t('বাতিল করুন', 'Reject')}
        destructive={decision === 'REJECTED'}
        askReason={{
          label: t('মন্তব্য', 'Note'),
          minLength: decision === 'REJECTED' ? 5 : 0,
          defaultValue: decision === 'APPROVED' ? 'যাচাই শেষে অনুমোদন করা হলো।' : '',
        }}
        onConfirm={decide}
      />
    </AdminPage>
  );
};
