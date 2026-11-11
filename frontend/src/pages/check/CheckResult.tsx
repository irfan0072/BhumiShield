import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, ChevronRight, Landmark, Map as MapIcon, Printer, RotateCcw, XCircle, Gavel, FileText } from 'lucide-react';
import type { RiskReportResponse } from '../../api/client';
import { useAppUI } from '../../i18n';
import { maskNid, toBanglaDigits } from '../../theme/tokens';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/admin/kit';
import { VerdictGauge } from './VerdictGauge';
import { buildChecklist, CheckItem, nidTail, SURVEY_BN, VERDICT } from './checks';

type Props = {
  report: RiskReportResponse;
  plot: any;
  mouza: any;
  seller: any;
  area: number;
  onNew: () => void;
};

const PRINT_CSS = `
@media print {
  body > *:not(#check-print) { display: none !important; }
  #check-print { display: block !important; }
  @page { margin: 14mm; }
}`;

export const CheckResult: React.FC<Props> = ({ report, plot, mouza, seller, area, onNew }) => {
  const { lang, t } = useAppUI();
  const n = (v: number | string) => toBanglaDigits(v, lang);
  const L = (bn?: string, en?: string) => (lang === 'bn' ? bn || en : en || bn) || '';
  const v = VERDICT[report.status] || VERDICT.HIGH_RISK;
  const checks = useMemo(() => buildChecklist(report), [report]);
  const passed = checks.filter((c) => c.ok).length;
  const problems = checks.length - passed;
  const [open, setOpen] = useState<CheckItem | null>(null);

  const dag = String(plot?.dag_no || report.plot?.dag_no || '');
  const nextStep = (L(report.next_step_bn, report.next_step_en).split(' • ')[0] || '').trim();
  const chain = report.khatian_chain || [];
  const latest = chain.find((k) => k.survey_type === 'BS') || chain[chain.length - 1];
  const mortgages = report.active_mortgages || [];
  const deeds = report.deed_history || [];
  const disputes = (report.findings || []).filter((f) => ['ACTIVE_DISPUTE', 'PLOT_TRANSFER_FROZEN'].includes(f.rule_code));

  const openMap = () => {
    const q = new URLSearchParams();
    if (mouza?.id) q.set('mouza', String(Number(mouza.id)));
    if (dag) {
      q.set('q', dag.slice(0, 12));
      q.set('focus', '1');
    }
    window.location.assign(`/${lang === 'en' ? 'en' : 'bn'}/map?${q.toString()}`);
  };

  const Icon = report.status === 'SAFE' ? CheckCircle2 : report.status === 'WARNING' ? AlertTriangle : XCircle;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* Verdict */}
        <div className={cn('flex flex-col rounded-2xl border p-4', v.soft, v.ring)}>
          <div className="flex items-center gap-3">
            <VerdictGauge
              zone={report.status === 'SAFE' ? 0 : report.status === 'WARNING' ? 1 : 2}
              label={problems === 0 ? t('সমস্যা নেই', 'No problem') : t(`${n(problems)}টি সমস্যা`, `${problems} problem${problems > 1 ? 's' : ''}`)}
              className="w-32 shrink-0 sm:w-36"
            />
            <div className="min-w-0">
              <p className={cn('flex items-center gap-1.5 text-2xl font-bold', v.text)}>
                <Icon className="size-6 shrink-0" />
                {t(v.bn, v.en)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {t('দাগ', 'Dag')} {n(dag)} · {L(mouza?.mouza_bn || plot?.mouza_bn, mouza?.mouza_en || plot?.mouza_en)}
              </p>
            </div>
          </div>
          <p className="mt-3 line-clamp-2 text-sm font-medium text-slate-900" title={L(report.summary_bn, report.summary_en)}>
            {nextStep || L(report.summary_bn, report.summary_en)}
          </p>
          {nextStep && (
            <div className="mt-1.5 hidden lg:block">
              <p className="line-clamp-3 text-sm text-slate-600">{L(report.summary_bn, report.summary_en)}</p>
            </div>
          )}
          <div className="mt-auto grid grid-cols-3 gap-2 pt-4">
            <ActionBtn icon={MapIcon} label={t('ম্যাপে দেখুন', 'On map')} onClick={openMap} primary />
            <ActionBtn icon={Printer} label={t('প্রিন্ট', 'Print')} onClick={() => window.print()} />
            <ActionBtn icon={RotateCcw} label={t('নতুন যাচাই', 'New check')} onClick={onNew} />
          </div>
        </div>

        {/* Checklist */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
          <p className="mb-2 text-sm font-semibold text-slate-900">{t('যা যাচাই হয়েছে', 'What we checked')}</p>
          <ul className={cn("grid gap-1.5", lang === "bn" ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2")}>
            {checks.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  disabled={c.ok}
                  onClick={() => setOpen(c)}
                  className={cn(
                    'flex h-10 w-full items-center gap-1.5 rounded-lg border px-2 text-left text-[13px] sm:gap-2 sm:px-2.5 sm:text-sm',
                    c.ok
                      ? 'cursor-default border-slate-100 bg-slate-50/60 text-slate-700'
                      : c.severity === 'HIGH'
                      ? 'cursor-pointer border-rose-200 bg-rose-50 font-medium text-rose-800 hover:border-rose-300'
                      : 'cursor-pointer border-amber-200 bg-amber-50 font-medium text-amber-800 hover:border-amber-300'
                  )}
                >
                  {c.ok ? (
                    <CheckCircle2 className="size-4 shrink-0 text-[#006A4E]" />
                  ) : c.severity === 'HIGH' ? (
                    <XCircle className="size-4 shrink-0 text-rose-600" />
                  ) : (
                    <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{t(c.bn, c.en)}</span>
                  {!c.ok && <ChevronRight className="size-4 shrink-0 opacity-60" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        <Tabs defaultValue="chain">
          <TabsList className="grid h-11 w-full grid-cols-3 sm:inline-grid sm:w-auto">
            <TabsTrigger value="chain" className="h-9 text-sm">{t('খতিয়ান ধারা', 'Records')}</TabsTrigger>
            <TabsTrigger value="owners" className="h-9 text-sm">{t('মালিক ও অংশ', 'Owners')}</TabsTrigger>
            <TabsTrigger value="lien" className="h-9 text-sm">{t('বন্ধক/মামলা', 'Loan/Case')}</TabsTrigger>
          </TabsList>

          <TabsContent value="chain" className="mt-3">
            {chain.length === 0 ? (
              <EmptyState text={t('খতিয়ানের তথ্য নেই', 'No record data')} icon={FileText} />
            ) : (
              <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {chain.map((k, i) => {
                  const ok = k.reconcile_status === 'MATCHED';
                  return (
                    <li key={k.id} className={cn('relative rounded-xl border p-3', ok ? 'border-slate-200' : 'border-amber-300 bg-amber-50')}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900">
                          {lang === 'bn' ? SURVEY_BN[k.survey_type] || k.survey_type : k.survey_type}
                        </span>
                        {ok ? <CheckCircle2 className="size-4 text-[#006A4E]" /> : <AlertTriangle className="size-4 text-amber-600" />}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{n(k.survey_year || '—')}</p>
                      <p className="mt-1 text-sm text-slate-800">
                        {t('খতিয়ান', 'Khatian')} {n(k.khatian_no)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {n(k.recorded_area_decimal)} {t('শতক', 'dec')}
                      </p>
                      {!ok && L(k.anomaly_note_bn, k.anomaly_note_en) && (
                        <p className="mt-1 line-clamp-2 text-xs text-amber-800">{L(k.anomaly_note_bn, k.anomaly_note_en)}</p>
                      )}
                      {i < chain.length - 1 && (
                        <ChevronRight className="absolute -right-2.5 top-1/2 hidden size-4 -translate-y-1/2 rounded-full bg-white text-slate-400 sm:block" />
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </TabsContent>

          <TabsContent value="owners" className="mt-3">
            {!latest || latest.owners.length === 0 ? (
              <EmptyState text={t('মালিকের তথ্য নেই', 'No owner data')} />
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {latest.owners.map((o) => {
                  const isSeller = Number(o.person_id) === Number(seller?.id);
                  return (
                    <li key={`${o.person_id}-${o.share_fraction}`} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 truncate text-sm font-medium text-slate-900">
                          {L(o.name_bn, o.name_en)}
                          {isSeller && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-[#006A4E]">{t('বিক্রেতা', 'Seller')}</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t('এনআইডি', 'NID')} {nidTail(o.nid_mock, (v) => maskNid(v, lang), lang)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {n(o.share_area_decimal)} {t('শতক', 'dec')}
                        </p>
                        <p className="text-xs text-slate-500">{n(o.share_fraction)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="lien" className="mt-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <InfoBlock icon={Landmark} title={t('ব্যাংক বন্ধক', 'Bank mortgage')} bad={mortgages.length > 0}>
                {mortgages.length === 0
                  ? t('কোনো বন্ধক নেই', 'No mortgage')
                  : mortgages.map((m) => (
                      <span key={m.id} className="block">
                        {L(m.bank_name_bn, m.bank_name_en)} · ৳{n(Number(m.loan_amount_bdt || 0).toLocaleString('en-IN'))}
                      </span>
                    ))}
              </InfoBlock>
              <InfoBlock icon={Gavel} title={t('মামলা / অভিযোগ', 'Case / dispute')} bad={disputes.length > 0}>
                {disputes.length === 0
                  ? t('কোনো মামলা নেই', 'No open case')
                  : disputes.map((d) => (
                      <span key={d.rule_code} className="block line-clamp-2">
                        {L(d.detail_bn, d.detail_en)}
                      </span>
                    ))}
              </InfoBlock>
            </div>
            {deeds.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-sm font-medium text-slate-700">{t('আগের দলিল', 'Past deeds')}</p>
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {deeds.slice(0, 5).map((d) => (
                    <li key={d.id} className="flex flex-col gap-0.5 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <span className="min-w-0 truncate text-slate-800">
                        {d.seller_name_bn || '—'} → {d.buyer_name_bn || '—'}
                      </span>
                      <span className="shrink-0 text-xs text-slate-500">
                        {n(d.area_decimal)} {t('শতক', 'dec')} · <span className="font-mono">{d.deed_no}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>
        </Tabs>
        <p className="mt-3 text-xs text-slate-500">
          {t('চূড়ান্ত সিদ্ধান্ত ভূমি অফিস ও সাব-রেজিস্ট্রারের।', 'The land office and sub-registrar make the final decision.')}
        </p>
      </div>

      {/* Finding detail */}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
              {open?.severity === 'HIGH' ? <XCircle className="size-5 text-rose-600" /> : <AlertTriangle className="size-5 text-amber-600" />}
              {open && t(open.bn, open.en)}
            </DialogTitle>
            <DialogDescription className="sr-only">{t('সমস্যার বিবরণ', 'Problem details')}</DialogDescription>
          </DialogHeader>
          {open?.finding && (
            <div className="space-y-3 text-sm">
              <p className="text-slate-700">{L(open.finding.detail_bn, open.finding.detail_en)}</p>
              {L(open.finding.action_bn, open.finding.action_en) && (
                <p className="rounded-xl bg-slate-50 p-3 font-medium text-slate-900">
                  {t('করণীয়: ', 'What to do: ')}
                  {L(open.finding.action_bn, open.finding.action_en)}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print-only report */}
      {createPortal(
        <div id="check-print" className="hidden bg-white p-2 text-[12px] text-black">
          <style>{PRINT_CSS}</style>
          <div className="flex items-center justify-between border-b border-black/30 pb-2">
            <div>
              <p className="text-base font-bold">{t('ভূমি সুরক্ষা · জমি যাচাই রিপোর্ট', 'Bhumi Suraksha · Land check report')}</p>
              <p>{t('গণপ্রজাতন্ত্রী বাংলাদেশ সরকার · ভূমি মন্ত্রণালয়', "People's Republic of Bangladesh · Ministry of Land")}</p>
            </div>
            <p>{n(new Date().toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB'))}</p>
          </div>
          <table className="mt-3 w-full border-collapse">
            <tbody>
              {[
                [t('মৌজা', 'Mouza'), `${L(mouza?.mouza_bn || plot?.mouza_bn, mouza?.mouza_en || plot?.mouza_en)}${mouza?.jl_no ? ` (${t('জেএল', 'JL')} ${n(mouza.jl_no)})` : ''}`],
                [t('উপজেলা, জেলা', 'Upazila, district'), `${L(mouza?.upazila_bn, mouza?.upazila_en)}, ${L(mouza?.district_bn, mouza?.district_en)}`],
                [t('দাগ', 'Dag'), n(dag)],
                [t('খতিয়ান', 'Khatian'), latest ? `${n(latest.khatian_no)} (${lang === 'bn' ? SURVEY_BN[latest.survey_type] || latest.survey_type : latest.survey_type})` : '—'],
                [t('বিক্রেতা', 'Seller'), seller ? `${L(seller.name_bn, seller.name_en)} · ${t('এনআইডি', 'NID')} ${nidTail(seller.nid_mock || seller.nid, (v) => maskNid(v, lang), lang)}` : '—'],
                [t('কেনার পরিমাণ', 'Area to buy'), `${n(area)} ${t('শতক', 'decimals')}`],
                [t('ফলাফল', 'Result'), `${t(v.bn, v.en)} · ${n(passed)}/${n(checks.length)} ${t('যাচাই ঠিক', 'checks passed')}`],
              ].map(([k, val]) => (
                <tr key={k}>
                  <td className="w-40 border border-black/20 px-2 py-1 font-medium">{k}</td>
                  <td className="border border-black/20 px-2 py-1">{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 font-bold">{t('যাচাইয়ের তালিকা', 'Checklist')}</p>
          <ul className="mt-1 columns-2">
            {checks.map((c) => (
              <li key={c.code}>
                {c.ok ? '✓' : '✗'} {t(c.bn, c.en)}
              </li>
            ))}
          </ul>
          {L(report.next_step_bn, report.next_step_en) && (
            <>
              <p className="mt-3 font-bold">{t('পরামর্শ', 'Advice')}</p>
              <ul className="mt-1 list-disc pl-5">
                {L(report.next_step_bn, report.next_step_en)
                  .split(' • ')
                  .filter(Boolean)
                  .map((s) => (
                    <li key={s}>{s}</li>
                  ))}
              </ul>
            </>
          )}
          <p className="mt-4 border-t border-black/30 pt-2 text-[11px]">{L(report.disclaimer_bn, report.disclaimer_en)}</p>
        </div>,
        document.body
      )}
    </div>
  );
};

const ActionBtn: React.FC<{ icon: React.ElementType; label: string; onClick: () => void; primary?: boolean }> = ({
  icon: Icon,
  label,
  onClick,
  primary,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'inline-flex h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[13px] font-medium leading-tight cursor-pointer',
      primary ? 'bg-[#006A4E] text-white hover:bg-[#00553e]' : 'border border-slate-200 bg-white text-slate-800 hover:border-[#006A4E] hover:text-[#006A4E]'
    )}
  >
    <Icon className="size-4 shrink-0" />
    <span className="truncate">{label}</span>
  </button>
);

const InfoBlock: React.FC<{ icon: React.ElementType; title: string; bad: boolean; children: React.ReactNode }> = ({
  icon: Icon,
  title,
  bad,
  children,
}) => (
  <div className={cn('flex gap-3 rounded-xl border p-3', bad ? 'border-rose-200 bg-rose-50' : 'border-slate-200')}>
    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', bad ? 'bg-white text-rose-600' : 'bg-emerald-50 text-[#006A4E]')}>
      <Icon className="size-4" />
    </span>
    <div className="min-w-0 text-sm">
      <p className="font-medium text-slate-900">{title}</p>
      <div className={cn('mt-0.5', bad ? 'text-rose-800' : 'text-slate-600')}>{children}</div>
    </div>
  </div>
);
