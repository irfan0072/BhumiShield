import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Eye, FileCheck2, RefreshCcw, RotateCcw, Wallet } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi, AdminDeedDetailResponse, AdminDeedsResponse } from '@/api/client';
import { toBanglaDigits } from '@/theme/tokens';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AdminPage,
  DataTable,
  DetailList,
  DetailSheet,
  EmptyRow,
  EmptyState,
  LoadingRows,
  PageToolbar,
  Section,
  StatCard,
  StatGrid,
  StatusBadge,
  Tone,
  notify,
  statusInfo,
} from '@/components/admin/kit';

const PER_PAGE = 30;

/** Deed statuses that the shared status map does not cover. */
const DEED_STATUS: Record<string, { tone: Tone; bn: string; en: string }> = {
  MUTATED: { tone: 'green', bn: 'নামজারি সম্পন্ন', en: 'Mutated' },
  PENDING_MUTATION: { tone: 'amber', bn: 'নামজারি বাকি', en: 'Mutation due' },
};

const DEED_TYPES: Record<string, [string, string]> = {
  SALE: ['বিক্রয়', 'Sale'],
  HIBA: ['হেবা', 'Gift'],
  GIFT: ['হেবা', 'Gift'],
  INHERITANCE: ['উত্তরাধিকার', 'Inheritance'],
  MORTGAGE: ['বন্ধক', 'Mortgage'],
  EXCHANGE: ['বিনিময়', 'Exchange'],
};

const STATUS_FILTERS: Array<[string, string, string]> = [
  ['ALL', 'সব দলিল', 'All deeds'],
  ['REGISTERED', 'নিবন্ধিত', 'Registered'],
  ['PENDING_MUTATION', 'নামজারি বাকি', 'Mutation due'],
  ['MUTATED', 'নামজারি সম্পন্ন', 'Mutated'],
  ['HELD', 'স্থগিত', 'On hold'],
];

type Kpis = AdminDeedsResponse['kpis'];

export const AdminDeedsPage: React.FC = () => {
  const { lang, t } = useAppUI();
  const n = (v: any) => toBanglaDigits(v ?? '', lang);
  const money = (v: any) => (v === undefined || v === null || v === '' ? '—' : `৳ ${n(Number(v).toLocaleString('en-IN'))}`);
  const name = (bn?: string, en?: string) => (lang === 'bn' ? bn || en : en || bn) || '—';

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<any | null>(null);
  const [detail, setDetail] = useState<AdminDeedDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const reqId = useRef(0);

  // Debounce the search box so the server is not hit on every key press.
  useEffect(() => {
    const h = setTimeout(() => {
      setQuery(search.trim());
    }, 350);
    return () => clearTimeout(h);
  }, [search]);

  const [loadingMore, setLoadingMore] = useState(false);

  /** page 1 replaces the list; later pages are appended (infinite scroll). */
  const load = async (pageNo = 1) => {
    const id = ++reqId.current;
    if (pageNo === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await BhumiApi.listAdminDeeds({
        q: query || undefined,
        status: status === 'ALL' ? undefined : status,
        page: pageNo,
        per_page: PER_PAGE,
      });
      if (id !== reqId.current) return;
      const next = res?.items || [];
      setItems((prev) => (pageNo === 1 ? next : [...prev, ...next.filter((d: any) => !prev.some((p) => p.id === d.id))]));
      setPage(pageNo);
      setTotal(Number(res?.total) || 0);
      setKpis(res?.kpis || null);
    } catch (e) {
      if (id !== reqId.current) return;
      notify.err(e, lang);
      if (pageNo === 1) {
        setItems([]);
        setTotal(0);
      }
    } finally {
      if (id === reqId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    load(1);
  }, [query, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickStatus = (s: string) => {
    setStatus(s);
  };

  const openDeed = async (deed: any) => {
    setSelected(deed);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await BhumiApi.getAdminDeedDetail(deed.id));
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setDetailLoading(false);
    }
  };

  const deedStatus = (code?: string) => {
    const hit = DEED_STATUS[String(code || '').toUpperCase()];
    return hit ? { tone: hit.tone, label: lang === 'bn' ? hit.bn : hit.en } : statusInfo(code, lang);
  };
  const StatusPill: React.FC<{ code?: string }> = ({ code }) => {
    const s = deedStatus(code);
    return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>;
  };
  const deedType = (v?: string) => {
    const hit = DEED_TYPES[String(v || '').toUpperCase()];
    return hit ? (lang === 'bn' ? hit[0] : hit[1]) : v || '—';
  };
  const date = (v?: string) => (v ? n(String(v).slice(0, 10)) : '—');

  const d = detail?.deed || selected;
  const seller = detail?.seller;
  const buyer = detail?.buyer;
  const ver = detail?.verification;
  const hist = detail?.history;
  const histCount = hist
    ? (hist.khatians?.length || 0) + (hist.mutations?.length || 0) + (hist.mortgages?.length || 0) + (hist.disputes?.length || 0)
    : 0;

  const person = (p: any, fbName?: string, fbNid?: string) => (
    <span>
      {p?.name_bn || p?.name_en ? name(p?.name_bn, p?.name_en) : fbName || '—'}
      {(p?.nid || fbNid) && <span className="block text-xs font-normal text-slate-500">{n(p?.nid || fbNid)}</span>}
    </span>
  );

  const HistGroup: React.FC<{ title: string; rows: any[]; render: (r: any) => React.ReactNode }> = ({ title, rows, render }) =>
    rows && rows.length > 0 ? (
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-slate-500">
          {title} · {n(rows.length)}
        </div>
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {rows.map((r, i) => (
            <li key={r.id ?? i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              {render(r)}
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  const shortHash = (h?: string) => (h ? `${String(h).slice(0, 10)}…${String(h).slice(-6)}` : '—');

  return (
    <AdminPage fill>
      <StatGrid>
        <StatCard
          label={t('মোট দলিল', 'Deeds')}
          value={kpis ? n(kpis.total_deeds) : '—'}
          icon={FileCheck2}
          tone="green"
          active={status === 'ALL'}
          onClick={() => pickStatus('ALL')}
        />
        <StatCard
          label={t('নামজারি সম্পন্ন', 'Mutated')}
          value={kpis ? n(kpis.mutated_deeds) : '—'}
          icon={RefreshCcw}
          tone="blue"
          active={status === 'MUTATED'}
          onClick={() => pickStatus('MUTATED')}
        />
        <StatCard
          label={t('স্থগিত', 'On hold')}
          value={kpis ? n(kpis.flagged_deeds) : '—'}
          icon={AlertTriangle}
          tone="red"
          active={status === 'HELD'}
          onClick={() => pickStatus('HELD')}
        />
        <StatCard label={t('মোট মূল্য', 'Total value')} value={kpis ? money(kpis.total_volume_bdt) : '—'} icon={Wallet} tone="amber" />
      </StatGrid>

      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('দলিল, দাগ, নাম বা এনআইডি…', 'Deed, plot, name or NID…')}
        filters={
          <Select value={status} onValueChange={pickStatus}>
            <SelectTrigger className="h-9 w-40 rounded-lg text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map(([v, bn, en]) => (
                <SelectItem key={v} value={v}>
                  {t(bn, en)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        actions={
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => load(1)} disabled={loading}>
            <RotateCcw className={cn('size-3.5', loading && 'animate-spin')} />
            {t('রিফ্রেশ', 'Refresh')}
          </Button>
        }
      />

      <Section fill>
        <DataTable
          headers={[t('দলিল', 'Deed'), t('জমি', 'Land'), t('ক্রেতা', 'Buyer'), t('অবস্থা', 'Status'), '']}
          alignRight={[4]}
          hasMore={!loading && items.length < total}
          loadingMore={loadingMore}
          onEndReached={() => load(page + 1)}
        >
          {loading ? (
            <LoadingRows cols={5} rows={6} />
          ) : items.length === 0 ? (
            <EmptyRow cols={5} text={t('কোনো দলিল নেই', 'No deeds')} />
          ) : (
            items.map((deed) => (
              <tr key={deed.id} className="cursor-pointer" onClick={() => openDeed(deed)}>
                <td>
                  <div className="font-medium text-slate-900">{deed.deed_no || deed.deed_code}</div>
                  <div className="text-xs text-slate-500">
                    {deedType(deed.deed_type)} · {date(deed.created_at)}
                  </div>
                </td>
                <td>
                  <div className="text-slate-800">{name(deed.mouza_bn, deed.mouza_en)}</div>
                  <div className="text-xs text-slate-500">
                    {t('দাগ', 'Plot')} {n(deed.dag_no_bn || deed.dag_no)} · {n(deed.area_decimal)} {t('শতক', 'dec')}
                  </div>
                </td>
                <td>
                  <div className="text-slate-800">{name(deed.buyer_name_bn, deed.buyer_name_en)}</div>
                  <div className="text-xs text-slate-500">{money(deed.price_bdt)}</div>
                </td>
                <td>
                  <StatusPill code={deed.status} />
                </td>
                <td className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t('বিস্তারিত', 'Details')}
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeed(deed);
                    }}
                  >
                    <Eye className="size-4 text-slate-500" />
                  </Button>
                </td>
              </tr>
            ))
          )}
        </DataTable>

        <div className="flex shrink-0 items-center justify-end border-t border-slate-100 px-4 py-1.5 text-xs text-slate-500">
          {n(items.length)} / {n(total)}
        </div>
      </Section>

      <DetailSheet
        open={!!selected}
        onOpenChange={(o) => {
          if (!o) {
            setSelected(null);
            setDetail(null);
          }
        }}
        title={d?.deed_no || d?.deed_code || t('দলিল', 'Deed')}
        subtitle={d ? `${deedType(d.deed_type)} · ${date(d.created_at)}` : undefined}
      >
        {d && (
          <Tabs defaultValue="summary" className="gap-3">
            <TabsList className="h-9 w-full">
              <TabsTrigger value="summary" className="text-xs">
                {t('সারাংশ', 'Summary')}
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs">
                {t('ইতিহাস', 'History')}
                {histCount > 0 && <span className="ml-1 text-slate-400">{n(histCount)}</span>}
              </TabsTrigger>
              <TabsTrigger value="check" className="text-xs">
                {t('যাচাই', 'Check')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-0 space-y-3">
              <DetailList
                items={[
                  [t('অবস্থা', 'Status'), <StatusPill key="s" code={d.status} />],
                  [t('মৌজা', 'Mouza'), name(d.mouza_bn, d.mouza_en)],
                  [
                    t('এলাকা', 'Area'),
                    [name(d.upazila_bn, d.upazila_en), name(d.district_bn, d.district_en)].filter((x) => x !== '—').join(', ') || '—',
                  ],
                  [t('দাগ', 'Plot'), n(d.dag_no_bn || d.dag_no)],
                  [t('জমি', 'Land'), `${n(d.area_decimal)} ${t('শতক', 'dec')}`],
                  !!d.share_fraction && [t('অংশ', 'Share'), n(d.share_fraction)],
                  [t('মূল্য', 'Price'), money(d.price_bdt)],
                  !!d.registered_by && [t('নিবন্ধনকারী', 'Registered by'), d.registered_by],
                ]}
              />
              <DetailList
                items={[
                  [t('বিক্রেতা', 'Seller'), person(seller, name(d.seller_name_bn, d.seller_name_en), d.seller_nid)],
                  [t('ক্রেতা', 'Buyer'), person(buyer, name(d.buyer_name_bn, d.buyer_name_en), d.buyer_nid)],
                ]}
              />
              {d.flag_reason_bn && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{d.flag_reason_bn}</p>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-0 space-y-3">
              {detailLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-100" />
                  ))}
                </div>
              ) : !hist || histCount + (hist.audit_logs?.length || 0) === 0 ? (
                <EmptyState text={t('কোনো ইতিহাস নেই', 'No history')} />
              ) : (
                <>
                  <HistGroup
                    title={t('খতিয়ান', 'Khatians')}
                    rows={hist.khatians}
                    render={(k) => (
                      <>
                        <span className="text-slate-700">
                          {k.survey_type} {n(k.khatian_no_bn || k.khatian_no)}
                          <span className="block text-xs text-slate-500">
                            {k.recorded_area_decimal != null ? `${n(k.recorded_area_decimal)} ${t('শতক', 'dec')}` : ''}
                            {k.survey_year ? ` · ${n(k.survey_year)}` : ''}
                          </span>
                        </span>
                        <StatusPill code={k.status} />
                      </>
                    )}
                  />
                  <HistGroup
                    title={t('নামজারি', 'Mutations')}
                    rows={hist.mutations}
                    render={(m) => (
                      <>
                        <span className="text-slate-700">
                          {m.case_no}
                          <span className="block text-xs text-slate-500">{date(m.created_at)}</span>
                        </span>
                        <StatusPill code={m.status} />
                      </>
                    )}
                  />
                  <HistGroup
                    title={t('বন্ধক', 'Mortgages')}
                    rows={hist.mortgages}
                    render={(m) => (
                      <>
                        <span className="text-slate-700">
                          {name(m.bank_name_bn, m.bank_name_en)}
                          <span className="block text-xs text-slate-500">{money(m.amount_bdt)}</span>
                        </span>
                        <StatusPill code={m.status} />
                      </>
                    )}
                  />
                  <HistGroup
                    title={t('বিরোধ', 'Disputes')}
                    rows={hist.disputes}
                    render={(x) => (
                      <>
                        <span className="min-w-0 text-slate-700">
                          {x.case_no}
                          <span className="block truncate text-xs text-slate-500">{x.complainant_name_bn}</span>
                        </span>
                        <StatusPill code={x.status} />
                      </>
                    )}
                  />
                  <HistGroup
                    title={t('কার্যকলাপ', 'Activity')}
                    rows={hist.audit_logs}
                    render={(a) => (
                      <>
                        <span className="min-w-0 truncate text-slate-700">
                          {String(a.action || a.event_type || '').replace(/_/g, ' ').toLowerCase() || '—'}
                          <span className="block text-xs text-slate-500">{a.actor_username}</span>
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">{date(a.created_at)}</span>
                      </>
                    )}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="check" className="mt-0 space-y-3">
              {detailLoading ? (
                <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
              ) : !ver ? (
                <EmptyState text={t('তথ্য পাওয়া যায়নি', 'Not available')} />
              ) : (
                <DetailList
                  items={[
                    [
                      t('ফলাফল', 'Result'),
                      <StatusBadge key="v" tone={ver.is_valid ? 'green' : 'red'}>
                        {ver.is_valid ? t('অপরিবর্তিত', 'Intact') : t('পরিবর্তিত', 'Tampered')}
                      </StatusBadge>,
                    ],
                    [
                      t('স্বাক্ষর', 'Signature'),
                      <StatusBadge key="s" tone={ver.signature_valid ? 'green' : 'red'}>
                        {ver.signature_valid ? t('আছে', 'Present') : t('নেই', 'Missing')}
                      </StatusBadge>,
                    ],
                    [t('ক্রম', 'Chain index'), n(ver.chain_index)],
                    [t('হ্যাশ', 'Hash'), <code key="h" className="font-mono text-xs">{shortHash(ver.stored_hash)}</code>],
                    [t('আগের হ্যাশ', 'Previous hash'), <code key="p" className="font-mono text-xs">{shortHash(ver.prev_hash)}</code>],
                  ]}
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </DetailSheet>
    </AdminPage>
  );
};
