import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, FilePlus2, Loader2, RotateCcw, Send, XCircle } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi, RiskReportResponse } from '@/api/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AddressCascader, AddressSelection } from '@/components/AddressCascader';
import { triggerAppNotification } from '@/components/NotificationCenter';
import { AdminPage, DetailList, Field, Section, StatusBadge, Tone, inputCls, notify } from '@/components/admin/kit';
import { DeedDraftPrefill, DeedStatus, feeLines, fmtMoney, fmtNum, pickName } from './shared';

type Step = 'land' | 'check' | 'register';

/** The rules the backend fraud engine evaluates on every pre-check (FraudRulesEngine). */
const RULES: Array<[string, string, string]> = [
  ['SELLER_NOT_OWNER', 'বিক্রেতার মালিকানা', 'Seller ownership'],
  ['AREA_EXCEEDS_OWNED', 'প্রাপ্য অংশ', 'Owned share'],
  ['DOUBLE_SALE', 'দ্বৈত বিক্রয়', 'Double sale'],
  ['NID_MISMATCH', 'এনআইডি মিল', 'NID match'],
  ['INHERITANCE_UNRESOLVED', 'ওয়ারিশ নিষ্পত্তি', 'Inheritance'],
  ['KHATIAN_CHAIN_BREAK', 'খতিয়ান ধারাবাহিকতা', 'Khatian chain'],
  ['PLOT_MORTGAGED', 'ব্যাংক বন্ধক', 'Mortgage'],
  ['ACTIVE_DISPUTE', 'বিচারাধীন আপত্তি', 'Open dispute'],
  ['PLOT_TRANSFER_FROZEN', 'হস্তান্তর স্থগিতাদেশ', 'Transfer freeze'],
  ['OWNER_SALE_LOCKED', 'বিক্রয় লক', 'Sale lock'],
  ['DEED_TAMPERED', 'আগের দলিলের সিল', 'Past deed seal'],
];

const verdictInfo = (status: string | undefined, t: (bn: string, en: string) => string): { tone: Tone; label: string } =>
  status === 'SAFE'
    ? { tone: 'green', label: t('নিরাপদ', 'Safe') }
    : status === 'WARNING'
    ? { tone: 'amber', label: t('যাচাই প্রয়োজন', 'Needs review') }
    : { tone: 'red', label: t('ঝুঁকিপূর্ণ', 'High risk') };

export const NewDeedWizard: React.FC<{
  plots: any[];
  persons: any[];
  isChecker: boolean;
  prefill?: DeedDraftPrefill | null;
  onPrefillUsed?: () => void;
  onDone: () => void;
}> = ({ plots, persons, isChecker, prefill, onPrefillUsed, onDone }) => {
  const { lang, t } = useAppUI();
  const n = (v: any) => fmtNum(v, lang);

  const [step, setStep] = useState<Step>('land');
  const [addr, setAddr] = useState({ division: '', district: '', upazila: '', mouzaId: '' });
  const [plotId, setPlotId] = useState(0);
  const [sellerId, setSellerId] = useState(0);
  const [buyerId, setBuyerId] = useState(0);
  const [area, setArea] = useState('');
  const [share, setShare] = useState('');
  const [value, setValue] = useState('');
  const [owners, setOwners] = useState<any[]>([]);

  const [checking, setChecking] = useState(false);
  const [report, setReport] = useState<RiskReportResponse | null>(null);
  const [fees, setFees] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const plot = plots.find((p) => Number(p.id) === plotId);
  const seller = persons.find((p) => Number(p.id) === sellerId);
  const buyer = persons.find((p) => Number(p.id) === buyerId);
  const saleLocked = Number(plot?.owner_sale_locked) === 1;

  // A deed draft opened from the record approval list fills the form.
  useEffect(() => {
    if (!prefill) return;
    resetAll();
    if (prefill.plot_id) setPlotId(Number(prefill.plot_id));
    if (prefill.seller_id) setSellerId(Number(prefill.seller_id));
    if (prefill.buyer_id) setBuyerId(Number(prefill.buyer_id));
    if (prefill.area_decimal !== undefined) setArea(String(prefill.area_decimal));
    if (prefill.share_fraction) setShare(String(prefill.share_fraction));
    if (prefill.declared_value_bdt !== undefined) setValue(String(prefill.declared_value_bdt));
    onPrefillUsed?.();
  }, [prefill]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recorded owners of the chosen plot are listed first in the seller picker.
  useEffect(() => {
    if (!plotId) {
      setOwners([]);
      return;
    }
    let alive = true;
    BhumiApi.getPersons(plotId)
      .then((list: any[]) => alive && setOwners(Array.isArray(list) ? list : []))
      .catch(() => alive && setOwners([]));
    return () => {
      alive = false;
    };
  }, [plotId]);

  const plotOptions = useMemo(
    () =>
      plots.filter((p) => {
        if (addr.district && p.district_bn && p.district_bn !== addr.district) return false;
        if (addr.upazila && p.upazila_bn && p.upazila_bn !== addr.upazila) return false;
        if (addr.mouzaId && Number(p.mouza_id) !== Number(addr.mouzaId)) return false;
        return true;
      }),
    [plots, addr]
  );
  const ownerIds = new Set(owners.map((o) => Number(o.id)));
  const otherPersons = persons.filter((p) => !ownerIds.has(Number(p.id)));

  const invalidate = () => {
    setReport(null);
    setFees(null);
    setResult(null);
  };

  function resetAll() {
    setStep('land');
    setPlotId(0);
    setSellerId(0);
    setBuyerId(0);
    setArea('');
    setShare('');
    setValue('');
    invalidate();
  }

  const formError = !plotId
    ? t('দাগ বাছাই করুন', 'Choose a plot')
    : !sellerId || !buyerId
    ? t('বিক্রেতা ও ক্রেতা বাছাই করুন', 'Choose seller and buyer')
    : sellerId === buyerId
    ? t('বিক্রেতা ও ক্রেতা একই', 'Seller and buyer are the same')
    : !(Number(area) > 0)
    ? t('জমির পরিমাণ দিন', 'Enter the area')
    : !(Number(value) > 0)
    ? t('মূল্য দিন', 'Enter the value')
    : '';

  const runCheck = async () => {
    if (formError) {
      notify.err({ message: formError }, lang);
      return;
    }
    setChecking(true);
    setResult(null);
    try {
      const [rep, fee] = await Promise.all([
        BhumiApi.checkBeforeBuy({
          plot_id: plotId,
          seller_id: sellerId,
          seller_nid: seller?.nid || seller?.nid_mock,
          proposed_area_decimal: Number(area),
          deed_type: 'SALE',
        }),
        BhumiApi.calculateFees(Number(value), 'SALE').catch(() => null),
      ]);
      setReport(rep);
      setFees(fee);
      setStep('check');
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setChecking(false);
    }
  };

  const failed = useMemo(() => (report?.findings || []).filter((f) => f.severity !== 'SAFE'), [report]);
  const failedCodes = new Set(failed.map((f) => f.rule_code));
  const extraFindings = failed.filter((f) => !RULES.some(([code]) => code === f.rule_code));
  const verdict = verdictInfo(report?.status, t);

  const register = async () => {
    setSubmitting(true);
    try {
      if (isChecker) {
        const res = await BhumiApi.createDeed({
          deed_type: 'SALE',
          plot_id: plotId,
          seller_id: sellerId,
          buyer_id: buyerId,
          area_decimal: Number(area),
          share_fraction: share.trim(),
          declared_value_bdt: Number(value),
        });
        setResult({ kind: 'deed', ...res });
        notify.ok((lang === 'bn' ? res?.message_bn : res?.message_en) || t('দলিল নিবন্ধিত', 'Deed registered'));
        triggerAppNotification({
          title_bn: res?.deed?.status === 'HELD' ? 'দলিল স্থগিত' : 'দলিল নিবন্ধিত',
          title_en: res?.deed?.status === 'HELD' ? 'Deed on hold' : 'Deed registered',
          message_bn: `দলিল নং ${res?.deed?.deed_no || ''}`,
          message_en: `Deed ${res?.deed?.deed_no || ''}`,
          type: res?.deed?.status === 'HELD' ? 'ALERT' : 'SUCCESS',
          targetTab: 'subregistrar',
          targetSection: 'deeds',
        });
      } else {
        // Data officers cannot register; they send a deed draft to the Sub-Registrar for approval.
        const res = await BhumiApi.createOnboardingBatch({
          record_type: 'DEED_DRAFT',
          items: [
            {
              deed_type: 'SALE',
              plot_id: plotId,
              dag_no: plot?.dag_no,
              mouza: plot?.mouza_en || plot?.mouza_bn,
              seller_id: sellerId,
              seller_name: seller?.name_bn || seller?.name_en,
              buyer_id: buyerId,
              buyer_name: buyer?.name_bn || buyer?.name_en,
              area_decimal: Number(area),
              share_fraction: share.trim(),
              declared_value_bdt: Number(value),
              pre_check_verdict: report?.status,
            },
          ],
        });
        setResult({ kind: 'draft', batch_no: res?.batch?.batch_no, status: res?.batch?.status });
        notify.ok(t('খসড়া জমা হয়েছে', 'Draft submitted'));
      }
      onDone();
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setSubmitting(false);
    }
  };

  const canOpen = (s: Step) => s === 'land' || !!report;

  return (
    <AdminPage>
      <Tabs value={step} onValueChange={(v) => canOpen(v as Step) && setStep(v as Step)} className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <TabsList className="h-9">
            {(
              [
                ['land', t('১. জমি ও পক্ষ', '1. Land & parties')],
                ['check', t('২. যাচাই', '2. Check')],
                ['register', isChecker ? t('৩. নিবন্ধন', '3. Register') : t('৩. জমা', '3. Submit')],
              ] as Array<[Step, string]>
            ).map(([key, label]) => (
              <TabsTrigger key={key} value={key} disabled={!canOpen(key)} className="px-3 text-xs">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {report && <StatusBadge tone={verdict.tone}>{verdict.label}</StatusBadge>}
          <Button variant="ghost" size="sm" className="ml-auto h-9 gap-1.5 text-slate-600" onClick={resetAll}>
            <RotateCcw className="size-3.5" />
            {t('নতুন করে', 'Start over')}
          </Button>
        </div>

        {/* Step 1: land and parties */}
        <TabsContent value="land" className="mt-0">
          <Section>
            <div className="space-y-4 p-4">
              <AddressCascader
                lang={lang}
                isFilter
                selectedDivision={addr.division}
                selectedDistrict={addr.district}
                selectedUpazila={addr.upazila}
                selectedMouzaId={addr.mouzaId}
                onChange={(sel: AddressSelection) =>
                  setAddr({
                    division: sel.division_bn,
                    district: sel.district_bn,
                    upazila: sel.upazila_bn,
                    mouzaId: sel.mouza_id ? String(sel.mouza_id) : '',
                  })
                }
              />

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label={t('দাগ', 'Plot')}>
                  <select
                    className={inputCls}
                    value={plotId || ''}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const p = plots.find((x) => Number(x.id) === id);
                      setPlotId(id);
                      setSellerId(0);
                      if (p) {
                        setArea(String(p.total_area_decimal ?? ''));
                        setShare('1/1');
                      }
                      invalidate();
                    }}
                  >
                    <option value="">{t('দাগ বাছাই করুন', 'Choose plot')}</option>
                    {plotOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {pickName(lang, p.mouza_bn, p.mouza_en)} · {t('দাগ', 'Plot')} {n(p.dag_no_bn || p.dag_no)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={t('বিক্রেতা', 'Seller')}>
                  <select
                    className={inputCls}
                    value={sellerId || ''}
                    onChange={(e) => {
                      setSellerId(Number(e.target.value));
                      invalidate();
                    }}
                  >
                    <option value="">{t('বিক্রেতা বাছাই করুন', 'Choose seller')}</option>
                    {owners.length > 0 && (
                      <optgroup label={t('রেকর্ডীয় মালিক', 'Recorded owners')}>
                        {owners.map((p) => (
                          <option key={`o${p.id}`} value={p.id}>
                            {pickName(lang, p.name_bn, p.name_en)}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label={t('অন্যান্য', 'Others')}>
                      {otherPersons.map((p) => (
                        <option key={p.id} value={p.id}>
                          {pickName(lang, p.name_bn, p.name_en)}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </Field>

                <Field label={t('ক্রেতা', 'Buyer')}>
                  <select
                    className={inputCls}
                    value={buyerId || ''}
                    onChange={(e) => {
                      setBuyerId(Number(e.target.value));
                      invalidate();
                    }}
                  >
                    <option value="">{t('ক্রেতা বাছাই করুন', 'Choose buyer')}</option>
                    {persons.map((p) => (
                      <option key={p.id} value={p.id}>
                        {pickName(lang, p.name_bn, p.name_en)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={t('জমি (শতক)', 'Area (dec)')} hint={plot ? `${t('মোট', 'Total')} ${n(plot.total_area_decimal)}` : undefined}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={inputCls}
                    value={area}
                    onChange={(e) => {
                      setArea(e.target.value);
                      invalidate();
                    }}
                  />
                </Field>

                <Field label={t('অংশ', 'Share')}>
                  <input
                    className={inputCls}
                    value={share}
                    placeholder="1/1"
                    onChange={(e) => {
                      setShare(e.target.value);
                      invalidate();
                    }}
                  />
                </Field>

                <Field label={t('মূল্য (টাকা)', 'Value (BDT)')}>
                  <input
                    type="number"
                    min="0"
                    className={inputCls}
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value);
                      invalidate();
                    }}
                  />
                </Field>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
                {saleLocked && <StatusBadge tone="red">{t('বিক্রয় লক চালু', 'Sale lock on')}</StatusBadge>}
                {formError && <span className="text-xs text-slate-500">{formError}</span>}
                <Button size="sm" className="h-9 gap-1.5" onClick={runCheck} disabled={checking || !!formError}>
                  {checking ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                  {t('যাচাই করুন', 'Run check')}
                </Button>
              </div>
            </div>
          </Section>
        </TabsContent>

        {/* Step 2: pre-check result and fees */}
        <TabsContent value="check" className="mt-0">
          {report && (
            <div className="grid gap-4 lg:grid-cols-3">
              <Section
                className="lg:col-span-2"
                title={t('প্রাক-যাচাই', 'Pre-check')}
                action={
                  <span className="text-xs text-slate-500">
                    {t('সমস্যা', 'Issues')} {n(failed.length)}
                  </span>
                }
              >
                <ul className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0">
                  {RULES.map(([code, bn, en]) => {
                    const f = failed.find((x) => x.rule_code === code);
                    const ok = !failedCodes.has(code);
                    return (
                      <li key={code} className="flex items-start gap-2 px-4 py-2 text-sm sm:border-b sm:border-slate-100">
                        {ok ? (
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        ) : f?.severity === 'HIGH' ? (
                          <XCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
                        ) : (
                          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                        )}
                        <span className="min-w-0">
                          <span className={cn('block', ok ? 'text-slate-700' : 'font-medium text-slate-900')}>{lang === 'bn' ? bn : en}</span>
                          {f && (
                            <span className="block truncate text-xs text-slate-500" title={lang === 'bn' ? f.title_bn : f.title_en}>
                              {lang === 'bn' ? f.title_bn : f.title_en}
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                  {extraFindings.map((f) => (
                    <li key={f.rule_code} className="flex items-start gap-2 px-4 py-2 text-sm sm:border-b sm:border-slate-100">
                      {f.severity === 'HIGH' ? (
                        <XCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
                      ) : (
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                      )}
                      <span className="min-w-0 truncate font-medium text-slate-900">{lang === 'bn' ? f.title_bn : f.title_en}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title={t('সরকারি ফি', 'Govt fees')}>
                <div className="space-y-3 p-4">
                  {fees ? (
                    <>
                      <DetailList items={feeLines(fees, t).map(([label, amt]) => [label, fmtMoney(amt, lang)] as [string, string])} />
                      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="text-slate-600">{t('মোট', 'Total')}</span>
                        <span className="font-semibold text-slate-900">{fmtMoney(fees.total_payable_bdt, lang)}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">{t('ফি হিসাব পাওয়া যায়নি', 'Fees unavailable')}</p>
                  )}
                </div>
              </Section>

              <div className="flex justify-between gap-2 lg:col-span-3">
                <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setStep('land')}>
                  <ArrowLeft className="size-4" />
                  {t('পেছনে', 'Back')}
                </Button>
                <Button size="sm" className="h-9 gap-1.5" onClick={() => setStep('register')}>
                  {t('পরবর্তী', 'Next')}
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Step 3: register (Sub-Registrar) or submit draft (data officer) */}
        <TabsContent value="register" className="mt-0">
          {report && (
            <Section>
              <div className="grid gap-4 p-4 md:grid-cols-2">
                <DetailList
                  items={[
                    [t('জমি', 'Land'), plot ? `${pickName(lang, plot.mouza_bn, plot.mouza_en)} · ${t('দাগ', 'Plot')} ${n(plot.dag_no_bn || plot.dag_no)}` : '—'],
                    [t('বিক্রেতা', 'Seller'), pickName(lang, seller?.name_bn, seller?.name_en)],
                    [t('ক্রেতা', 'Buyer'), pickName(lang, buyer?.name_bn, buyer?.name_en)],
                    [t('জমি', 'Area'), `${n(area)} ${t('শতক', 'dec')}${share ? ` · ${n(share)}` : ''}`],
                    [t('মূল্য', 'Value'), fmtMoney(value, lang)],
                    [t('সরকারি ফি', 'Govt fees'), fees ? fmtMoney(fees.total_payable_bdt, lang) : '—'],
                    [t('যাচাই', 'Check'), <StatusBadge key="v" tone={verdict.tone}>{verdict.label}</StatusBadge>],
                  ]}
                />

                <div className="flex flex-col gap-3">
                  {result ? (
                    result.kind === 'deed' ? (
                      <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <CheckCircle2 className="size-4 text-emerald-600" />
                            {result.deed?.deed_no}
                          </span>
                          <DeedStatus status={result.deed?.status} lang={lang} />
                        </div>
                        {result.deed?.status === 'HELD' && (
                          <p className="text-xs text-slate-500">{t('ঝুঁকি থাকায় শুনানিতে গেছে', 'Sent to hearing due to risk')}</p>
                        )}
                        <Accordion type="single" collapsible className="rounded-lg border border-slate-200 px-3">
                          <AccordionItem value="proof" className="border-none">
                            <AccordionTrigger className="py-2 text-sm text-slate-700">{t('আরও তথ্য', 'More')}</AccordionTrigger>
                            <AccordionContent className="space-y-2 pb-3 text-xs text-slate-600">
                              {result.deed?.content_hash && <div className="break-all font-mono">{result.deed.content_hash}</div>}
                              {result.deed?.chain_index !== undefined && (
                                <div>
                                  {t('ক্রম', 'Index')}: {n(result.deed.chain_index)}
                                </div>
                              )}
                              {result.qr_data_uri && <img src={result.qr_data_uri} alt="QR" className="size-24 rounded border" />}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
                        <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <CheckCircle2 className="size-4 text-emerald-600" />
                          {result.batch_no || t('খসড়া জমা', 'Draft sent')}
                        </span>
                        <span className="text-xs text-slate-500">{t('অনুমোদনের অপেক্ষায়', 'Awaiting approval')}</span>
                      </div>
                    )
                  ) : (
                    <>
                      {saleLocked && <p className="text-xs text-slate-500">{t('মালিক বিক্রয় লক চালু রেখেছেন', 'Owner has a sale lock on')}</p>}
                      {!saleLocked && isChecker && report.status === 'HIGH_RISK' && (
                        <p className="text-xs text-slate-500">{t('ঝুঁকি থাকায় দলিল স্থগিত থাকবে', 'Deed will be put on hold')}</p>
                      )}
                      {!isChecker && <p className="text-xs text-slate-500">{t('নিবন্ধন সাব-রেজিস্ট্রার করবেন', 'Sub-Registrar will register')}</p>}
                    </>
                  )}

                  <div className="mt-auto flex flex-wrap justify-between gap-2">
                    <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setStep('check')} disabled={submitting}>
                      <ArrowLeft className="size-4" />
                      {t('পেছনে', 'Back')}
                    </Button>
                    {result ? (
                      <Button size="sm" className="h-9 gap-1.5" onClick={resetAll}>
                        <FilePlus2 className="size-4" />
                        {t('নতুন দলিল', 'New deed')}
                      </Button>
                    ) : (
                      <Button size="sm" className="h-9 gap-1.5" onClick={register} disabled={submitting || saleLocked}>
                        {submitting ? <Loader2 className="size-4 animate-spin" /> : isChecker ? <CheckCircle2 className="size-4" /> : <Send className="size-4" />}
                        {isChecker ? t('নিবন্ধন করুন', 'Register') : t('খসড়া জমা দিন', 'Submit draft')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Section>
          )}
        </TabsContent>
      </Tabs>
    </AdminPage>
  );
};
