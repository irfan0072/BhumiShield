import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileText, Gavel, MapPin } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { toBanglaDigits } from '@/theme/tokens';
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
  Tone,
  notify,
} from '@/components/admin/kit';
import { caseStatus, decimal, disputeTypeLabel, fmtDate, plotIdsOf, plotLabel } from './shared';

const verdictInfo = (v: string | undefined, lang: 'bn' | 'en'): { tone: Tone; label: string } => {
  const k = String(v || '').toUpperCase();
  if (k === 'SAFE') return { tone: 'green', label: lang === 'bn' ? 'নিরাপদ' : 'Safe' };
  if (k === 'HIGH_RISK') return { tone: 'red', label: lang === 'bn' ? 'ঝুঁকিপূর্ণ' : 'High risk' };
  if (k) return { tone: 'amber', label: lang === 'bn' ? 'সতর্কতা' : 'Caution' };
  return { tone: 'slate', label: '—' };
};

const SURVEY_BN: Record<string, string> = { CS: 'সিএস', SA: 'এসএ', RS: 'আরএস', BS: 'বিএস', CITY: 'সিটি জরিপ' };

const Block: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, action, children }) => (
  <div>
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <p className="text-xs font-medium text-slate-500">{title}</p>
      {action}
    </div>
    {children}
  </div>
);

export const TitleScrutinySection: React.FC<{
  plots: any[];
  disputes: any[];
  cases: any[];
  loading: boolean;
  selectedPlotId: number | null;
  onSelectPlot: (id: number) => void;
  canCreateCase: boolean;
  canLogOrder: boolean;
  onNewNotice: (plotId: number) => void;
  onLogOrder: (plot: any) => void;
  onOpenCases: () => void;
  onOpenFullCheck?: () => void;
}> = ({
  plots,
  disputes,
  cases,
  loading,
  selectedPlotId,
  onSelectPlot,
  canCreateCase,
  canLogOrder,
  onNewNotice,
  onLogOrder,
  onOpenCases,
  onOpenFullCheck,
}) => {
  const { lang, t } = useAppUI();
  const n = (v: any) => toBanglaDigits(v ?? '', lang);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const q = search.trim().toLowerCase();
  const shown = useMemo(
    () =>
      !q
        ? plots
        : plots.filter((p) =>
            [p.dag_no, p.dag_no_bn, p.plot_code, p.mouza_bn, p.mouza_en, p.upazila_bn].some((v) =>
              String(v || '').toLowerCase().includes(q)
            )
          ),
    [plots, q]
  );

  const plot = useMemo(
    () => plots.find((p) => Number(p.id) === Number(selectedPlotId)) || null,
    [plots, selectedPlotId]
  );

  // Pick the first plot once the list arrives.
  useEffect(() => {
    if (!selectedPlotId && plots.length) onSelectPlot(Number(plots[0].id));
  }, [plots.length, selectedPlotId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!plot) {
      setDetail(null);
      return;
    }
    let alive = true;
    setDetailLoading(true);
    BhumiApi.citizenCheckBeforeYouBuy(plot.id)
      .then((d) => alive && setDetail(d))
      .catch((e) => {
        if (!alive) return;
        setDetail(null);
        notify.err(e, lang);
      })
      .finally(() => alive && setDetailLoading(false));
    return () => {
      alive = false;
    };
  }, [plot?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const plotDisputes = useMemo(
    () => (plot ? disputes.filter((d) => Number(d.plot_id) === Number(plot.id)) : []),
    [disputes, plot]
  );
  const plotCases = useMemo(
    () => (plot ? cases.filter((c) => plotIdsOf(c).includes(Number(plot.id))) : []),
    [cases, plot]
  );

  const risk = detail?.risk_report;
  const verdict = verdictInfo(risk?.verdict, lang);
  const flags: any[] = risk?.flags || [];
  const owners: any[] = detail?.current_owners || [];
  const chain: any[] = detail?.khatian_chain || [];
  const p = detail?.plot || plot;
  const mortgaged = (detail?.mortgages || []).some((m: any) => String(m.status).toUpperCase() === 'ACTIVE');

  return (
    <AdminPage fill wide>
      <PageToolbar search={search} onSearch={setSearch} placeholder={t('দাগ, কোড, মৌজা…', 'Dag, code, mouza…')} />

      <div className="grid gap-4 md:min-h-0 md:flex-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:grid-rows-[minmax(0,1fr)]">
        <Section fill title={`${t('দাগ', 'Plots')} · ${n(shown.length)}`}>
          <DataTable headers={[t('দাগ', 'Dag'), t('মৌজা', 'Mouza'), t('জমি', 'Area')]} alignRight={[2]}>
            {loading ? (
              <LoadingRows cols={3} />
            ) : shown.length === 0 ? (
              <EmptyRow cols={3} text={t('কোনো দাগ পাওয়া যায়নি', 'No plots found')} />
            ) : (
              shown.map((row) => {
                const active = Number(row.id) === Number(selectedPlotId);
                return (
                  <tr
                    key={row.id}
                    onClick={() => onSelectPlot(Number(row.id))}
                    className={cn('cursor-pointer', active && '!bg-emerald-50/70 shadow-[inset_3px_0_0_#006A4E]')}
                  >
                    <td>
                      <div className="font-medium text-slate-900">{n(row.dag_no_bn || row.dag_no)}</div>
                      <div className="text-xs text-slate-500">{row.plot_code}</div>
                    </td>
                    <td>
                      <div className="text-slate-700">{lang === 'bn' ? row.mouza_bn : row.mouza_en || row.mouza_bn}</div>
                      <div className="text-xs text-slate-500">{lang === 'bn' ? row.upazila_bn : row.upazila_en || row.upazila_bn}</div>
                    </td>
                    <td className="whitespace-nowrap text-right text-slate-700">{decimal(row.total_area_decimal, lang)}</td>
                  </tr>
                );
              })
            )}
          </DataTable>
        </Section>

        <Section
          fill
          title={plot ? `${plotLabel(plot, lang)} · ${lang === 'bn' ? plot.mouza_bn : plot.mouza_en || plot.mouza_bn}` : t('ফলাফল', 'Result')}
          action={
            plot && (
              <div className="flex items-center gap-1.5">
                {canLogOrder && (
                  <Button size="sm" variant="outline" className="h-8" onClick={() => onLogOrder(plot)}>
                    <Gavel className="size-4" />
                    {t('আদালত আদেশ', 'Court order')}
                  </Button>
                )}
                {canCreateCase && (
                  <Button size="sm" className="h-8" onClick={() => onNewNotice(Number(plot.id))}>
                    <FileText className="size-4" />
                    {t('অধিগ্রহণ নোটিশ', 'LA notice')}
                  </Button>
                )}
              </div>
            )
          }
          bodyClassName="md:overflow-y-auto scrollbar-thin"
        >
          {!plot ? (
            <EmptyState icon={MapPin} text={t('বাম থেকে একটি দাগ বাছুন', 'Pick a plot on the left')} />
          ) : detailLoading && !detail ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : (
            <div className={cn('space-y-4 p-4 transition-opacity', detailLoading && 'opacity-60')}>
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5">
                <StatusBadge tone={verdict.tone}>{verdict.label}</StatusBadge>
                {risk?.risk_score != null && (
                  <span className="text-sm text-slate-600">
                    {t('ঝুঁকি স্কোর', 'Risk score')} <span className="font-semibold text-slate-900">{n(risk.risk_score)}</span>
                  </span>
                )}
                <span className="text-xs text-slate-500">
                  {n(flags.length)} {t('সতর্কতা', 'flags')}
                </span>
                {onOpenFullCheck && (
                  <Button size="sm" variant="ghost" className="ml-auto h-7 px-2 text-xs" onClick={onOpenFullCheck}>
                    <ExternalLink className="size-3.5" />
                    {t('পূর্ণ রিপোর্ট', 'Full report')}
                  </Button>
                )}
              </div>

              {flags.length > 0 && (
                <ul className="space-y-1.5">
                  {flags.map((f, i) => {
                    const sev = String(f.severity || '').toUpperCase();
                    return (
                      <li key={f.rule_id || i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span
                          className={cn(
                            'mt-1.5 size-1.5 shrink-0 rounded-full',
                            sev === 'HIGH_RISK' ? 'bg-rose-500' : sev === 'SAFE' ? 'bg-emerald-500' : 'bg-amber-500'
                          )}
                        />
                        <span>{lang === 'bn' ? f.title_bn : f.title_en || f.title_bn}</span>
                      </li>
                    );
                  })}
                </ul>
              )}

              <DetailList
                items={[
                  [t('কোড', 'Code'), p?.plot_code],
                  [t('জমির ধরন', 'Land type'), lang === 'bn' ? p?.land_type_bn : p?.land_type_en || p?.land_type_bn],
                  [t('পরিমাণ', 'Area'), decimal(p?.total_area_decimal, lang)],
                  [
                    t('বিক্রয় লক', 'Sale lock'),
                    Number(p?.owner_sale_locked) ? (
                      <StatusBadge tone="red">{t('চালু', 'On')}</StatusBadge>
                    ) : (
                      <StatusBadge tone="green">{t('বন্ধ', 'Off')}</StatusBadge>
                    ),
                  ],
                  [
                    t('বন্ধক', 'Mortgage'),
                    detail ? (
                      mortgaged ? <StatusBadge tone="blue">{t('সক্রিয়', 'Active')}</StatusBadge> : <StatusBadge tone="green">{t('নেই', 'None')}</StatusBadge>
                    ) : (
                      '—'
                    ),
                  ],
                  !!Number(p?.is_admin_frozen) && [t('প্রশাসনিক স্থগিত', 'Admin freeze'), <StatusBadge tone="red">{t('আটকানো', 'Frozen')}</StatusBadge>],
                ]}
              />

              <Block title={t('বর্তমান মালিক', 'Current owners')}>
                {owners.length === 0 ? (
                  <p className="text-sm text-slate-400">—</p>
                ) : (
                  <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {owners.map((o) => (
                      <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate text-slate-800">{lang === 'bn' ? o.owner_name_bn : o.owner_name_en || o.owner_name_bn}</span>
                        <span className="shrink-0 text-xs text-slate-500">
                          {n(o.share_fraction)} · {decimal(o.area_decimal, lang)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Block>

              <Block title={t('খতিয়ান ধারা', 'Khatian chain')}>
                {chain.length === 0 ? (
                  <p className="text-sm text-slate-400">—</p>
                ) : (
                  <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {chain.map((k) => (
                      <li key={k.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <span className="text-slate-800">
                          {lang === 'bn' ? SURVEY_BN[String(k.survey_type).toUpperCase()] || k.survey_type : k.survey_type}{' '}
                          <span className="text-slate-500">· {n(k.khatian_no_bn || k.khatian_no)}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                          {k.survey_year ? n(k.survey_year) : ''}
                          <StatusCode code={k.status} lang={lang} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Block>

              <Block title={`${t('আদালত আদেশ', 'Court orders')} · ${n(plotDisputes.length)}`}>
                {plotDisputes.length === 0 ? (
                  <p className="text-sm text-slate-400">{t('কোনো আদেশ নেই', 'None')}</p>
                ) : (
                  <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {plotDisputes.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <span className="min-w-0">
                          <span className="block text-slate-800">{disputeTypeLabel(d.dispute_type, lang)}</span>
                          <span className="block truncate text-xs text-slate-500">
                            {d.case_no || `#${n(d.id)}`} · {fmtDate(d.created_at, lang)}
                          </span>
                        </span>
                        <StatusCode code={d.status} lang={lang} />
                      </li>
                    ))}
                  </ul>
                )}
                {!canLogOrder && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    {t('আদালত আদেশ শুধু অ্যাডমিন যুক্ত করতে পারেন', 'Only admin can add court orders')}
                  </p>
                )}
              </Block>

              <Block
                title={`${t('অধিগ্রহণ মামলা', 'Acquisition cases')} · ${n(plotCases.length)}`}
                action={
                  plotCases.length > 0 && (
                    <button type="button" onClick={onOpenCases} className="text-xs text-[#006A4E] hover:underline cursor-pointer">
                      {t('সব মামলা', 'All cases')}
                    </button>
                  )
                }
              >
                {plotCases.length === 0 ? (
                  <p className="text-sm text-slate-400">{t('অধিগ্রহণের আওতায় নেই', 'Not under acquisition')}</p>
                ) : (
                  <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {plotCases.map((c) => {
                      const st = caseStatus(c.status, lang);
                      return (
                        <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                          <span className="min-w-0">
                            <span className="block truncate text-slate-800">
                              {lang === 'bn' ? c.project_name_bn : c.project_name_en || c.project_name_bn}
                            </span>
                            <span className="block text-xs text-slate-500">{c.case_no}</span>
                          </span>
                          <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Block>
            </div>
          )}
        </Section>
      </div>
    </AdminPage>
  );
};
