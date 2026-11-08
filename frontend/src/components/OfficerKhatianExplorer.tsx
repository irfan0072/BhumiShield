import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Layers, Loader2 } from 'lucide-react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  AdminPage,
  DataTable,
  DetailList,
  EmptyRow,
  EmptyState,
  LoadingRows,
  PageToolbar,
  Section,
  StatusBadge,
  StatusCode,
  inputCls,
  notify,
} from '@/components/admin/kit';

interface OfficerKhatianExplorerProps {
  onSelectPlotForAction?: (plotId: number, action: 'wizard' | 'lien' | 'reconcile') => void;
  actionLabel?: string;
  actionType?: 'wizard' | 'lien' | 'reconcile';
}

const SURVEY_ORDER = ['CS', 'SA', 'RS', 'BS'];

const CHAIN_STATUS: Record<string, { bn: string; en: string; tone: 'green' | 'amber' | 'red' }> = {
  VALID: { bn: 'সঠিক', en: 'Valid', tone: 'green' },
  CHAIN_BREAK: { bn: 'ধারা ভাঙা', en: 'Chain break', tone: 'red' },
  UNRESOLVED_HEIRS: { bn: 'ওয়ারিশ বাকি', en: 'Heirs pending', tone: 'amber' },
};

/** Lock / freeze state of a plot as one small badge. */
const PlotState: React.FC<{ plot: any; t: (bn: string, en: string) => string }> = ({ plot, t }) => {
  if (Number(plot.is_admin_frozen) === 1) return <StatusBadge tone="red">{t('আটকানো', 'Frozen')}</StatusBadge>;
  if (Number(plot.owner_sale_locked) === 1) return <StatusBadge tone="amber">{t('বিক্রয় লক', 'Sale lock')}</StatusBadge>;
  return <StatusBadge tone="green">{t('উন্মুক্ত', 'Open')}</StatusBadge>;
};

export const OfficerKhatianExplorer: React.FC<OfficerKhatianExplorerProps> = ({
  onSelectPlotForAction,
  actionLabel,
  actionType,
}) => {
  const { lang, t } = useAppUI();
  const num = (v: any) => toBanglaDigits(v ?? '—', lang);

  const [plots, setPlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mouza, setMouza] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    BhumiApi.getPlots()
      .then((data: any[]) => {
        setPlots(data || []);
        if (data?.length) setSelectedId(Number(data[0].id));
      })
      .catch((e) => notify.err(e, lang))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The plot detail endpoint returns plot, location, current owners, khatian chain and per-khatian owners.
  useEffect(() => {
    if (!selectedId) return;
    let alive = true;
    setDetailLoading(true);
    BhumiApi.citizenCheckBeforeYouBuy(selectedId)
      .then((d) => alive && setDetail(d))
      .catch(async (e) => {
        // Fall back to the chain-only call so the timeline still shows.
        try {
          const chain = await BhumiApi.getKhatianChain(selectedId);
          if (alive) setDetail({ plot: plots.find((p) => Number(p.id) === selectedId), khatian_chain: chain });
        } catch {
          if (alive) {
            setDetail(null);
            notify.err(e, lang);
          }
        }
      })
      .finally(() => alive && setDetailLoading(false));
    return () => {
      alive = false;
    };
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const mouzas = useMemo(() => {
    const m = new Map<string, string>();
    plots.forEach((p) => {
      const id = String(p.mouza_id ?? p.location_id ?? '');
      if (id && !m.has(id)) m.set(id, (lang === 'bn' ? p.mouza_bn : p.mouza_en) || p.mouza_bn || id);
    });
    return Array.from(m.entries());
  }, [plots, lang]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plots.filter((p) => {
      if (mouza && String(p.mouza_id ?? p.location_id) !== mouza) return false;
      if (!q) return true;
      return [p.dag_no, p.dag_no_bn, p.plot_code, p.mouza_bn, p.mouza_en, p.jl_no]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [plots, search, mouza]);

  const select = (id: number) => {
    setSelectedId(id);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  };

  const plot = detail?.plot || plots.find((p) => Number(p.id) === selectedId) || null;
  const loc = detail?.location || {};
  const owners: any[] = detail?.current_owners || detail?.owners || [];
  const history: any[] = detail?.ownership_history || [];
  const activeLiens = (detail?.mortgages || []).filter((m: any) => String(m.status).toUpperCase() === 'ACTIVE');
  const chain: any[] = [...(detail?.khatian_chain || [])].sort(
    (a, b) => SURVEY_ORDER.indexOf(a.survey_type) - SURVEY_ORDER.indexOf(b.survey_type)
  );
  const name = (o: any) => (lang === 'bn' ? o.owner_name_bn || o.name_bn : o.owner_name_en || o.name_en) || o.owner_name_bn || o.name_bn || '—';

  return (
    <AdminPage fill>
      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('দাগ, মৌজা বা কোড', 'Dag, mouza or code')}
        filters={
          mouzas.length > 1 && (
            <select
              value={mouza}
              onChange={(e) => setMouza(e.target.value)}
              className={cn(inputCls, 'w-auto min-w-40')}
              aria-label={t('মৌজা', 'Mouza')}
            >
              <option value="">{t('সব মৌজা', 'All mouzas')}</option>
              {mouzas.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          )
        }
      />

      <div className="grid gap-4 md:min-h-0 md:flex-1 md:grid-cols-[minmax(0,1fr)_22rem] md:grid-rows-[minmax(0,1fr)]">
        <Section
          fill
          title={t('দাগ তালিকা', 'Plots')}
          action={<span className="text-xs text-slate-500">{num(filtered.length)}</span>}
        >
          <DataTable headers={[t('দাগ', 'Dag'), t('মৌজা', 'Mouza'), t('জমি', 'Area'), t('অবস্থা', 'Status')]}>
            {loading ? (
              <LoadingRows cols={4} rows={6} />
            ) : filtered.length === 0 ? (
              <EmptyRow cols={4} text={t('কোনো দাগ নেই', 'No plots')} />
            ) : (
              filtered.map((p) => {
                const active = Number(p.id) === selectedId;
                return (
                  <tr
                    key={p.id}
                    onClick={() => select(Number(p.id))}
                    className={cn('cursor-pointer', active && '!bg-emerald-50/70')}
                  >
                    <td>
                      <div className={cn('font-medium', active ? 'text-[#006A4E]' : 'text-slate-800')}>
                        {lang === 'bn' ? p.dag_no_bn || num(p.dag_no) : p.dag_no}
                      </div>
                      <div className="whitespace-nowrap text-xs text-slate-500">{p.plot_code}</div>
                    </td>
                    <td>
                      <div className="text-slate-800">{(lang === 'bn' ? p.mouza_bn : p.mouza_en) || '—'}</div>
                      <div className="text-xs text-slate-500">{(lang === 'bn' ? p.upazila_bn : p.upazila_en) || ''}</div>
                    </td>
                    <td className="whitespace-nowrap text-slate-700">
                      {num(p.total_area_decimal)} {t('শতাংশ', 'dec')}
                    </td>
                    <td>
                      <PlotState plot={p} t={t} />
                    </td>
                  </tr>
                );
              })
            )}
          </DataTable>
        </Section>

        <div ref={detailRef} className="md:flex md:min-h-0 md:flex-col">
          <Section
            fill
            title={
              plot
                ? `${t('দাগ', 'Dag')} ${lang === 'bn' ? plot.dag_no_bn || num(plot.dag_no) : plot.dag_no}`
                : t('বিবরণ', 'Details')
            }
            action={detailLoading ? <Loader2 className="size-4 animate-spin text-slate-400" /> : plot && <PlotState plot={plot} t={t} />}
            bodyClassName="md:overflow-y-auto scrollbar-thin"
          >
            {!plot ? (
              <EmptyState text={t('দাগ বেছে নিন', 'Select a plot')} icon={Layers} />
            ) : (
              <div className="space-y-4 p-4">
                {onSelectPlotForAction && actionLabel && (
                  <Button
                    size="sm"
                    className="h-9 w-full"
                    onClick={() => onSelectPlotForAction(Number(plot.id), actionType || 'wizard')}
                  >
                    {actionLabel}
                    <ChevronRight className="size-4" />
                  </Button>
                )}

                <DetailList
                  items={[
                    [t('মৌজা', 'Mouza'), (lang === 'bn' ? loc.mouza_bn || plot.mouza_bn : loc.mouza_en || plot.mouza_en) || '—'],
                    [t('জেএল নং', 'JL no'), loc.jl_no ? num(loc.jl_no) : '—'],
                    [t('জমির ধরন', 'Land type'), (lang === 'bn' ? plot.land_type_bn : plot.land_type_en) || '—'],
                    [t('মোট জমি', 'Total area'), `${num(plot.total_area_decimal)} ${t('শতাংশ', 'dec')}`],
                    detail?.mortgages && [
                      t('বন্ধক', 'Lien'),
                      activeLiens.length ? (
                        <StatusBadge tone="blue">{t('চলমান', 'Active')}</StatusBadge>
                      ) : (
                        t('নেই', 'None')
                      ),
                    ],
                  ]}
                />

                {owners.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-slate-500">{t('বর্তমান মালিক', 'Current owners')}</div>
                    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                      {owners.map((o, i) => (
                        <li key={o.id ?? i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-slate-800">{name(o)}</span>
                            {(o.nid_masked || o.nid) && (
                              <span className="block text-xs text-slate-500">NID {o.nid_masked || o.nid}</span>
                            )}
                          </span>
                          <span className="shrink-0 text-right text-xs text-slate-600">
                            {num(o.share_fraction)}
                            <span className="block text-slate-400">
                              {num(o.area_decimal ?? o.share_area_decimal)} {t('শতাংশ', 'dec')}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-500">{t('খতিয়ান ধারা', 'Khatian chain')}</div>
                  {chain.length === 0 ? (
                    <p className="text-sm text-slate-500">{detailLoading ? '…' : t('রেকর্ড নেই', 'No records')}</p>
                  ) : (
                    <ol className="relative ml-2 border-l border-slate-200">
                      {chain.map((k, i) => {
                        const st = CHAIN_STATUS[String(k.status || k.reconcile_status || '').toUpperCase()];
                        const kOwners = history.filter((h) => Number(h.khatian_id) === Number(k.id));
                        const bad = st && st.tone !== 'green';
                        return (
                          <li key={k.id ?? i} className="relative pb-3 pl-4 last:pb-0">
                            <span
                              className={cn(
                                'absolute -left-[5px] top-1.5 size-2.5 rounded-full ring-2 ring-white',
                                bad ? 'bg-rose-500' : i === chain.length - 1 ? 'bg-[#006A4E]' : 'bg-slate-300'
                              )}
                            />
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-slate-800">
                                {k.survey_type} · {lang === 'bn' ? k.khatian_no_bn || num(k.khatian_no) : k.khatian_no}
                              </span>
                              {st ? (
                                <StatusBadge tone={st.tone}>{lang === 'bn' ? st.bn : st.en}</StatusBadge>
                              ) : (
                                <StatusCode code={k.status} lang={lang} />
                              )}
                            </div>
                            <div className="text-xs text-slate-500">
                              {num(k.survey_year)} · {num(k.recorded_area_decimal)} {t('শতাংশ', 'dec')}
                            </div>
                            {kOwners.length > 0 && (
                              <div className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                                {kOwners.map((o) => `${name(o)} (${num(o.share_fraction)})`).join(', ')}
                              </div>
                            )}
                            {bad && (lang === 'bn' ? k.remarks_bn || k.anomaly_note_bn : k.remarks_en || k.anomaly_note_en) && (
                              <div className="mt-0.5 text-xs text-rose-600">
                                {lang === 'bn' ? k.remarks_bn || k.anomaly_note_bn : k.remarks_en || k.anomaly_note_en}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>
    </AdminPage>
  );
};
