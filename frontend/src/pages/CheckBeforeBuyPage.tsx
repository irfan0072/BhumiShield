import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Loader2, MapPin, Minus, Plus, Search, ShieldCheck, User } from 'lucide-react';
import { useAppUI } from '../i18n';
import { BhumiApi, RiskReportResponse } from '../api/client';
import { maskNid, toBanglaDigits } from '../theme/tokens';
import { cn } from '@/lib/utils';
import { publicQueryKeys, useLocationsQuery, usePlotsQuery } from '../components/publicHooks';
import { PublicCard, PublicHero } from '@/components/public/PublicPage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, notify } from '@/components/admin/kit';
import { CheckResult } from './check/CheckResult';
import { cleanDag, nidTail, toLatinDigits } from './check/checks';

const PENDING_KEY = 'bs_pending_check_search';
const inputCls =
  'h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#006A4E] focus:ring-2 focus:ring-[#006A4E]/15';

type Step = 1 | 2 | 3;

export const CheckBeforeBuyPage: React.FC = () => {
  const { lang, t } = useAppUI();
  const n = (v: number | string) => toBanglaDigits(v, lang);
  const L = (bn?: string, en?: string) => (lang === 'bn' ? bn || en : en || bn) || '';

  const { data: locations = [], isLoading: locLoading, isError: locError, refetch: refetchLoc } = useLocationsQuery();
  const { data: plots = [], isLoading: plotLoading, isError: plotError, refetch: refetchPlots } = usePlotsQuery();

  const [step, setStep] = useState<Step>(1);
  const [mouzaId, setMouzaId] = useState('');
  const [dagQuery, setDagQuery] = useState('');
  const [plotId, setPlotId] = useState<number | null>(null);
  const [sellerId, setSellerId] = useState<number | null>(null);
  const [area, setArea] = useState('');
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<RiskReportResponse | null>(null);

  // The map page leaves a dag number here before opening this page. Read it once.
  const [pending] = useState(() => {
    try {
      return sessionStorage.getItem(PENDING_KEY);
    } catch {
      return null;
    }
  });

  /* ---------- apply URL params (?mouza= ?dag= ?plot_id=) once data is ready ---------- */
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current || locLoading || plotLoading) return;
    if (!(locations as any[]).length) return;
    applied.current = true;
    try {
      sessionStorage.removeItem(PENDING_KEY);
    } catch {
      /* storage blocked */
    }

    const q = new URLSearchParams(window.location.search);
    const mouzaParam = Number(q.get('mouza')) || 0;
    const plotParam = Number(q.get('plot_id')) || 0;
    const dag = cleanDag(q.get('dag') || pending || '');
    const validMouza = (locations as any[]).some((l) => Number(l.id) === mouzaParam) ? mouzaParam : 0;

    let found: any = null;
    if (plotParam) found = (plots as any[]).find((p) => Number(p.id) === plotParam);
    if (!found && dag) {
      const same = (p: any) => toLatinDigits(String(p.dag_no ?? '')) === dag || toLatinDigits(String(p.dag_no_bn ?? '')) === dag;
      found = (plots as any[]).find((p) => same(p) && (!validMouza || Number(p.mouza_id) === validMouza)) || null;
    }

    if (found) {
      setMouzaId(String(found.mouza_id));
      setPlotId(Number(found.id));
      setStep(2);
    } else {
      setMouzaId(String(validMouza || (locations as any[])[0].id));
      if (dag) setDagQuery(dag);
    }
  }, [locations, plots, locLoading, plotLoading, pending]);

  /* ---------- derived ---------- */
  const mouza = useMemo(() => (locations as any[]).find((l) => String(l.id) === mouzaId), [locations, mouzaId]);
  const mouzaPlots = useMemo(() => {
    const qd = toLatinDigits(dagQuery.trim());
    return (plots as any[])
      .filter((p) => String(p.mouza_id) === mouzaId)
      .filter((p) => !qd || String(p.dag_no).includes(qd))
      .sort((a, b) => Number(a.dag_no) - Number(b.dag_no) || String(a.dag_no).localeCompare(String(b.dag_no)));
  }, [plots, mouzaId, dagQuery]);
  const plot = useMemo(() => (plots as any[]).find((p) => Number(p.id) === plotId) || null, [plots, plotId]);

  const persons = useQuery({
    queryKey: publicQueryKeys.persons(plotId ?? undefined),
    queryFn: async () => {
      const data = await BhumiApi.getPersons(plotId as number);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!plotId,
    staleTime: 5 * 60 * 1000,
  });
  const owners: any[] = persons.data || [];
  const seller = owners.find((o) => Number(o.id) === sellerId) || null;

  useEffect(() => {
    if (owners.length && !owners.some((o) => Number(o.id) === sellerId)) setSellerId(Number(owners[0].id));
  }, [owners, sellerId]);

  const areaNum = Number(toLatinDigits(area));
  const areaOk = area.trim() !== '' && Number.isFinite(areaNum) && areaNum > 0 && areaNum <= 100000;
  const totalArea = Number(plot?.total_area_decimal || 0);

  /* ---------- actions ---------- */
  const pickMouza = (v: string) => {
    setMouzaId(v);
    setPlotId(null);
    setDagQuery('');
  };
  const pickPlot = (p: any) => {
    if (Number(p.id) !== plotId) {
      setPlotId(Number(p.id));
      setSellerId(null);
    }
  };
  const run = async () => {
    if (busy || !plotId || !areaOk) return;
    setBusy(true);
    try {
      const res = await BhumiApi.checkBeforeBuy({
        plot_id: plotId,
        seller_id: sellerId ?? undefined,
        proposed_area_decimal: areaNum,
      });
      setReport(res);
      setStep(3);
      window.scrollTo({ top: 0 });
    } catch (err) {
      notify.err(err, lang, t('যাচাই করা যায়নি। আবার চেষ্টা করুন।', 'Could not check. Please try again.'));
    } finally {
      setBusy(false);
    }
  };
  const reset = () => {
    setReport(null);
    setPlotId(null);
    setSellerId(null);
    setArea('');
    setDagQuery('');
    setStep(1);
    if (window.location.search) window.history.replaceState(window.history.state, '', window.location.pathname);
  };
  const stepArea = (d: number) => {
    const cur = Number.isFinite(areaNum) ? areaNum : 0;
    setArea(String(Math.max(1, Math.round((cur + d) * 100) / 100)));
  };

  const loading = locLoading || plotLoading;
  const failed = locError || plotError;

  return (
    <div className="bg-white">
      <PublicHero
        image="digital-mouza-map"
        tone="dark"
        position="center"
        icon={ShieldCheck}
        title={t('জমি যাচাই', 'Check land')}
        subtitle={t('কেনার আগে ঝুঁকি জানুন', 'Know the risk before you buy')}
      >
        <PublicCard className={cn('mx-auto', step === 3 ? 'max-w-none' : 'max-w-3xl lg:mx-0')}>
          <Stepper step={step} canGo={(s) => (s === 1 ? true : s === 2 ? !!plotId : !!report)} onGo={setStep} />

          {failed ? (
            <EmptyState
              text={t('তথ্য আনা যায়নি', 'Could not load data')}
              action={
                <button
                  type="button"
                  onClick={() => {
                    refetchLoc();
                    refetchPlots();
                  }}
                  className="mt-1 inline-flex h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-medium hover:border-[#006A4E] cursor-pointer"
                >
                  {t('আবার চেষ্টা', 'Try again')}
                </button>
              }
            />
          ) : loading ? (
            <div className="space-y-3 pt-1">
              <div className="grid gap-2 sm:grid-cols-2">
                <Skeleton className="h-11 rounded-xl" />
                <Skeleton className="h-11 rounded-xl" />
              </div>
              <Skeleton className="h-36 rounded-xl" />
            </div>
          ) : step === 1 ? (
            /* ================= STEP 1: land ================= */
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">{t('মৌজা', 'Mouza')}</span>
                  <Select value={mouzaId} onValueChange={pickMouza}>
                    <SelectTrigger className="h-11 w-full rounded-xl text-sm" aria-label={t('মৌজা', 'Mouza')}>
                      <SelectValue placeholder={t('মৌজা বাছুন', 'Choose mouza')} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {(locations as any[]).map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {L(l.mouza_bn, l.mouza_en)}
                          {l.upazila_bn ? ` · ${L(l.upazila_bn, l.upazila_en)}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">{t('দাগ নম্বর', 'Dag no')}</span>
                  <span className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={dagQuery}
                      onChange={(e) => setDagQuery(e.target.value.slice(0, 12))}
                      maxLength={12}
                      inputMode="numeric"
                      placeholder={t('যেমন ১০১', 'e.g. 101')}
                      className={cn(inputCls, 'pl-9')}
                    />
                  </span>
                </label>
              </div>

              {mouzaPlots.length === 0 ? (
                <EmptyState
                  text={t('এই দাগ পাওয়া যায়নি', 'No plot found')}
                  icon={MapPin}
                  action={
                    dagQuery ? (
                      <button type="button" onClick={() => setDagQuery('')} className="text-sm font-medium text-[#006A4E] cursor-pointer">
                        {t('সব দাগ দেখুন', 'Show all')}
                      </button>
                    ) : undefined
                  }
                />
              ) : (
                <div>
                  <p className="mb-1.5 text-xs text-slate-500">
                    {t(`দাগ বাছুন · ${n(mouzaPlots.length)}টি`, `Pick a plot · ${mouzaPlots.length}`)}
                  </p>
                  <div className="grid max-h-[136px] grid-cols-4 gap-1.5 overflow-y-auto pr-1 sm:max-h-[148px] sm:grid-cols-6 md:grid-cols-8">
                    {mouzaPlots.map((p) => {
                      const sel = Number(p.id) === plotId;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => pickPlot(p)}
                          aria-pressed={sel}
                          className={cn(
                            'h-10 rounded-lg border text-sm font-medium transition cursor-pointer',
                            sel ? 'border-[#006A4E] bg-[#006A4E] text-white' : 'border-slate-200 bg-white text-slate-800 hover:border-[#006A4E]/50'
                          )}
                        >
                          {n(p.dag_no)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-h-5 text-sm text-slate-600">
                  {plot ? (
                    <>
                      <span className="font-semibold text-slate-900">
                        {t('দাগ', 'Dag')} {n(plot.dag_no)}
                      </span>
                      {' · '}
                      {L(plot.land_type_bn, plot.land_type_en)} · {n(plot.total_area_decimal ?? '—')} {t('শতক', 'dec')}
                    </>
                  ) : (
                    t('একটি দাগ বাছুন', 'Choose a plot')
                  )}
                </p>
                <PrimaryBtn disabled={!plotId} onClick={() => setStep(2)}>
                  {t('পরের ধাপ', 'Next')}
                  <ArrowRight className="size-4" />
                </PrimaryBtn>
              </div>
            </div>
          ) : step === 2 ? (
            /* ================= STEP 2: seller ================= */
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                run();
              }}
            >
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">
                  {t('দাগ', 'Dag')} {n(plot?.dag_no ?? '')}
                </span>
                {' · '}
                {L(mouza?.mouza_bn, mouza?.mouza_en)}
                {totalArea ? ` · ${n(totalArea)} ${t('শতক', 'dec')}` : ''}
              </p>

              <div>
                <span className="mb-1 block text-sm font-medium text-slate-700">{t('বিক্রেতা', 'Seller')}</span>
                {persons.isLoading ? (
                  <Skeleton className="h-14 rounded-xl" />
                ) : owners.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500">
                    {t('রেকর্ডে মালিক পাওয়া যায়নি', 'No recorded owner found')}
                  </p>
                ) : (
                  <div className="grid max-h-[136px] gap-1.5 overflow-y-auto sm:grid-cols-2" role="radiogroup">
                    {owners.map((o) => {
                      const sel = Number(o.id) === sellerId;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          role="radio"
                          aria-checked={sel}
                          onClick={() => setSellerId(Number(o.id))}
                          className={cn(
                            'flex h-14 items-center gap-3 rounded-xl border px-3 text-left transition cursor-pointer',
                            sel ? 'border-[#006A4E] bg-emerald-50/70 ring-1 ring-[#006A4E]' : 'border-slate-200 hover:border-[#006A4E]/50'
                          )}
                        >
                          <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', sel ? 'bg-[#006A4E] text-white' : 'bg-slate-100 text-slate-500')}>
                            {sel ? <Check className="size-4" /> : <User className="size-4" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-slate-900">{L(o.name_bn, o.name_en)}</span>
                            <span className="block text-xs text-slate-500">
                              {t('এনআইডি', 'NID')} {nidTail(o.nid_mock || o.nid, (v) => maskNid(v, lang), lang)}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="cbb-area" className="mb-1 block text-sm font-medium text-slate-700">
                  {t('কত শতক কিনবেন?', 'How many decimals?')}
                </label>
                <div className="flex items-center gap-2">
                  <IconBtn label={t('কমান', 'Less')} onClick={() => stepArea(-1)}>
                    <Minus className="size-4" />
                  </IconBtn>
                  <input
                    id="cbb-area"
                    value={area}
                    onChange={(e) => setArea(e.target.value.replace(/[^0-9০-৯.]/g, '').slice(0, 7))}
                    maxLength={7}
                    inputMode="decimal"
                    placeholder={t('যেমন ৫', 'e.g. 5')}
                    className={cn(inputCls, 'w-28 text-center text-base font-semibold')}
                  />
                  <IconBtn label={t('বাড়ান', 'More')} onClick={() => stepArea(1)}>
                    <Plus className="size-4" />
                  </IconBtn>
                  <span className="text-sm text-slate-600">{t('শতক', 'decimals')}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:border-slate-300 cursor-pointer"
                >
                  <ArrowLeft className="size-4" />
                  {t('আগের ধাপ', 'Back')}
                </button>
                <PrimaryBtn type="submit" disabled={busy || !areaOk || !plotId}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                  {busy ? t('যাচাই হচ্ছে…', 'Checking…') : t('যাচাই করুন', 'Check')}
                </PrimaryBtn>
              </div>
            </form>
          ) : report ? (
            /* ================= STEP 3: result ================= */
            <CheckResult report={report} plot={plot} mouza={mouza} seller={seller} area={areaNum} onNew={reset} />
          ) : null}
        </PublicCard>
      </PublicHero>
    </div>
  );
};

/* ------------------------------------------------------------------ */

const Stepper: React.FC<{ step: Step; canGo: (s: Step) => boolean; onGo: (s: Step) => void }> = ({ step, canGo, onGo }) => {
  const { lang, t } = useAppUI();
  const steps: Array<[Step, string]> = [
    [1, t('জমি', 'Land')],
    [2, t('বিক্রেতা', 'Seller')],
    [3, t('ফলাফল', 'Result')],
  ];
  return (
    <ol className="mb-4 flex items-center gap-2" aria-label={t('ধাপ', 'Steps')}>
      {steps.map(([s, label], i) => {
        const done = s < step;
        const active = s === step;
        const clickable = !active && s < step && canGo(s);
        return (
          <React.Fragment key={s}>
            <li className="flex min-w-0 items-center">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onGo(s)}
                aria-current={active ? 'step' : undefined}
                className={cn('flex items-center gap-2 rounded-lg py-1 pr-1 text-sm', clickable ? 'cursor-pointer hover:text-[#006A4E]' : 'cursor-default')}
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                    active ? 'bg-[#006A4E] text-white' : done ? 'bg-emerald-100 text-[#006A4E]' : 'bg-slate-100 text-slate-500'
                  )}
                >
                  {done ? <Check className="size-4" /> : toBanglaDigits(s, lang)}
                </span>
                <span className={cn('truncate', active ? 'font-semibold text-slate-900' : 'text-slate-500')}>{label}</span>
              </button>
            </li>
            {i < steps.length - 1 && <li aria-hidden className={cn('h-px min-w-4 flex-1', s < step ? 'bg-[#006A4E]' : 'bg-slate-200')} />}
          </React.Fragment>
        );
      })}
    </ol>
  );
};

const PrimaryBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, type = 'button', ...props }) => (
  <button
    type={type}
    {...props}
    className={cn(
      'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#006A4E] px-5 text-sm font-medium text-white hover:bg-[#00553e] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
  />
);

const IconBtn: React.FC<{ label: string; onClick: () => void; children: React.ReactNode }> = ({ label, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:border-[#006A4E] hover:text-[#006A4E] cursor-pointer"
  >
    {children}
  </button>
);

export default CheckBeforeBuyPage;
