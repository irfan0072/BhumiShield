import React, { useEffect, useMemo, useState } from 'react';
import { Eye, RotateCcw } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { toBanglaDigits } from '@/theme/tokens';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AdminPage,
  DataTable,
  DetailList,
  DetailSheet,
  EmptyRow,
  LoadingRows,
  PageToolbar,
  Section,
  StatusBadge,
  StatusCode,
  Tone,
  notify,
} from '@/components/admin/kit';

type Filter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

const verdictTone = (v?: string): Tone => (v === 'SAFE' ? 'green' : v === 'HIGH_RISK' ? 'red' : v ? 'amber' : 'slate');

/** Read-only list of mutation cases. Deciding a case is done by AC Land only. */
export const AdminMutationsPage: React.FC = () => {
  const { lang, t } = useAppUI();
  const n = (v: any) => toBanglaDigits(v ?? '', lang);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [selected, setSelected] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await BhumiApi.getMutations();
      setItems(Array.isArray(res) ? res : res?.items || []);
    } catch (e) {
      notify.err(e, lang);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { ALL: items.length, PENDING: 0, APPROVED: 0, REJECTED: 0 };
    items.forEach((m) => {
      const s = String(m.status || '').toUpperCase() as Filter;
      if (s in c && s !== 'ALL') c[s] += 1;
    });
    return c;
  }, [items]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((m) => {
      if (filter !== 'ALL' && String(m.status || '').toUpperCase() !== filter) return false;
      if (!q) return true;
      return [m.case_no, m.deed_no, m.applicant_name_bn, m.applicant_name_en, m.seller_name_bn, m.mouza_bn, m.mouza_en, m.dag_no, m.dag_no_bn]
        .some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [items, search, filter]);

  const tabs: Array<[Filter, string]> = [
    ['ALL', t('সব', 'All')],
    ['PENDING', t('অপেক্ষমাণ', 'Pending')],
    ['APPROVED', t('অনুমোদিত', 'Approved')],
    ['REJECTED', t('বাতিল', 'Rejected')],
  ];

  const name = (bn?: string, en?: string) => (lang === 'bn' ? bn || en : en || bn) || '—';
  const risk = selected?.risk_report;
  const ver = selected?.deed_verification;

  return (
    <AdminPage fill>
      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('কেস, নাম বা মৌজা…', 'Case, name or mouza…')}
        filters={
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
        }
        actions={
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={load} disabled={loading}>
            <RotateCcw className={cn('size-3.5', loading && 'animate-spin')} />
            {t('রিফ্রেশ', 'Refresh')}
          </Button>
        }
      />

      <Section fill>
        <DataTable
          headers={[t('কেস', 'Case'), t('আবেদনকারী', 'Applicant'), t('জমি', 'Land'), t('অবস্থা', 'Status'), '']}
          alignRight={[4]}
        >
          {loading ? (
            <LoadingRows cols={5} />
          ) : rows.length === 0 ? (
            <EmptyRow cols={5} text={t('কোনো আবেদন নেই', 'No cases')} />
          ) : (
            rows.map((m) => (
              <tr key={m.id} className="cursor-pointer" onClick={() => setSelected(m)}>
                <td>
                  <div className="font-medium text-slate-900">{m.case_no}</div>
                  <div className="text-xs text-slate-500">{m.created_at ? n(String(m.created_at).slice(0, 10)) : '—'}</div>
                </td>
                <td>
                  <div className="text-slate-800">{name(m.applicant_name_bn, m.applicant_name_en)}</div>
                  <div className="text-xs text-slate-500">
                    {t('বিক্রেতা', 'Seller')}: {name(m.seller_name_bn, m.seller_name_en)}
                  </div>
                </td>
                <td>
                  <div className="text-slate-800">{name(m.mouza_bn, m.mouza_en)}</div>
                  <div className="text-xs text-slate-500">
                    {t('দাগ', 'Plot')} {n(m.dag_no_bn || m.dag_no)} · {n(m.area_decimal)} {t('শতক', 'dec')}
                  </div>
                </td>
                <td>
                  <StatusCode code={m.status} lang={lang} />
                </td>
                <td className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t('বিস্তারিত', 'Details')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(m);
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
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected?.case_no || t('নামজারি', 'Mutation')}
        subtitle={selected ? <StatusCode code={selected.status} lang={lang} /> : undefined}
      >
        {selected && (
          <>
            <DetailList
              items={[
                [t('দলিল নং', 'Deed no'), selected.deed_no],
                [t('আবেদনের তারিখ', 'Applied'), selected.created_at ? n(String(selected.created_at).slice(0, 10)) : '—'],
                [t('মৌজা', 'Mouza'), name(selected.mouza_bn, selected.mouza_en)],
                [t('উপজেলা', 'Upazila'), name(selected.upazila_bn, selected.upazila_en)],
                [t('দাগ', 'Plot'), n(selected.dag_no_bn || selected.dag_no)],
                [t('জমি', 'Area'), `${n(selected.area_decimal)} ${t('শতক', 'dec')}`],
                !!selected.share_fraction && [t('অংশ', 'Share'), n(selected.share_fraction)],
              ]}
            />

            <DetailList
              items={[
                [
                  t('ক্রেতা', 'Buyer'),
                  <span key="b">
                    {name(selected.buyer_name_bn, selected.buyer_name_en)}
                    {selected.buyer_nid && <span className="block text-xs font-normal text-slate-500">{n(selected.buyer_nid)}</span>}
                  </span>,
                ],
                [
                  t('বিক্রেতা', 'Seller'),
                  <span key="s">
                    {name(selected.seller_name_bn, selected.seller_name_en)}
                    {selected.seller_nid && <span className="block text-xs font-normal text-slate-500">{n(selected.seller_nid)}</span>}
                  </span>,
                ],
              ]}
            />

            {(ver || risk) && (
              <DetailList
                items={[
                  !!ver && [
                    t('দলিল যাচাই', 'Deed check'),
                    <StatusBadge key="v" tone={ver.is_valid ? 'green' : 'red'}>
                      {ver.is_valid ? t('সঠিক', 'Valid') : t('পরিবর্তিত', 'Tampered')}
                    </StatusBadge>,
                  ],
                  !!risk && [
                    t('ঝুঁকি', 'Risk'),
                    <StatusBadge key="r" tone={verdictTone(risk.verdict)}>
                      {risk.risk_score !== undefined ? n(risk.risk_score) : '—'}
                      {' / '}
                      {n(100)}
                    </StatusBadge>,
                  ],
                ]}
              />
            )}

            {Array.isArray(risk?.flags) && risk.flags.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-slate-500">{t('সতর্কতা', 'Warnings')}</div>
                <ul className="space-y-1.5">
                  {risk.flags.map((f: any, i: number) => (
                    <li key={f.rule_id || i} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                      {lang === 'bn' ? f.title_bn || f.title_en : f.title_en || f.title_bn}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(selected.decided_by || selected.decision_reason_bn || selected.decision_reason_en) && (
              <DetailList
                items={[
                  [t('সিদ্ধান্ত দিয়েছেন', 'Decided by'), selected.decided_by || '—'],
                  !!selected.decided_at && [t('সিদ্ধান্তের তারিখ', 'Decided on'), n(String(selected.decided_at).slice(0, 10))],
                  [
                    t('কারণ', 'Reason'),
                    (lang === 'bn' ? selected.decision_reason_bn || selected.decision_reason_en : selected.decision_reason_en || selected.decision_reason_bn) || '—',
                  ],
                ]}
              />
            )}

            <p className="text-xs text-slate-500">{t('সিদ্ধান্ত শুধু এসি ল্যান্ড দিতে পারেন', 'Only AC Land can decide')}</p>
          </>
        )}
      </DetailSheet>
    </AdminPage>
  );
};
