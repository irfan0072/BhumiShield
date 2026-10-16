import React, { useEffect, useState } from 'react';
import {
  Search,
  ArrowLeft,
  ArrowRight,
  Printer,
  Share2,
  History,
  Landmark,
  FileText,
  Users,
} from 'lucide-react';
import { apiClient, extractErrorMessage } from '../api/client';
import { useI18n } from '../i18n';
import { formatCurrency } from '../theme/tokens';
import { VerdictBanner } from '../components/VerdictBanner';

interface CheckBeforeYouBuyPageProps {
  initialPlotId?: number;
  onBackHome: () => void;
  onOpenDeedVerify: (deedNo: string) => void;
}

export const CheckBeforeYouBuyPage: React.FC<CheckBeforeYouBuyPageProps> = ({
  initialPlotId,
  onBackHome,
  onOpenDeedVerify,
}) => {
  const { lang, t, n } = useI18n();
  const [step, setStep] = useState<1 | 2 | 3>(initialPlotId ? 3 : 1);
  const [locations, setLocations] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number>(1);
  const [selectedPlotId, setSelectedPlotId] = useState<number>(initialPlotId || 1);
  const [requestedArea, setRequestedArea] = useState<string>('10');
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    apiClient
      .get('/locations')
      .then((res) => {
        setLocations(res.data.locations || []);
        setPlots(res.data.plots || []);
      })
      .catch(() => {});
  }, []);

  const fetchReport = async (plotId: number, areaVal?: string) => {
    setLoading(true);
    setError(null);
    try {
      const areaParam = areaVal && Number(areaVal) > 0 ? `?requested_area_decimal=${Number(areaVal)}` : '';
      const res = await apiClient.get(`/plots/${plotId}/check-before-you-buy${areaParam}`);
      setReport(res.data);
      setStep(3);
    } catch (err) {
      setError(extractErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialPlotId) {
      setSelectedPlotId(initialPlotId);
      fetchReport(initialPlotId, requestedArea);
    }
  }, [initialPlotId]);

  const plotsInMouza = plots.filter((p) => Number(p.location_id) === Number(selectedLocationId));
  const currentLocation = locations.find((l) => Number(l.id) === Number(selectedLocationId));

  const handleShare = () => {
    const shareText = `${window.location.origin}/?plot=${selectedPlotId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Wizard Bar + Quick Demo Plot Pills */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3);
            else onBackHome();
          }}
          className="min-h-[48px] px-4 py-2 rounded-xl border border-gray-300 bg-white font-semibold flex items-center gap-2 hover:bg-gray-100 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('পিছনে যান', 'Go Back')}</span>
        </button>

        {/* Visible Progress Indicator ("ধাপ ২ / ৩") */}
        <div
          aria-label={t('ধাপের অগ্রগতি', 'Wizard step progress')}
          className="flex items-center gap-2 bg-[#E6F2EE] text-[#006A4E] px-4 py-2 rounded-xl font-bold border border-[#006A4E]/30"
        >
          <span>
            {t(`ধাপ ${n(step)} / ${n(3)}`, `Step ${step} of 3`)}
          </span>
          <span className="text-sm font-normal text-[#5F6B66]">
            •{' '}
            {step === 1
              ? t('মৌজা নির্বাচন', 'Select Mouza')
              : step === 2
              ? t('দাগ নম্বর ও জমির পরিমাণ', 'Select Plot & Area')
              : t('ঝুঁকি ও মালিকানা রিপোর্ট', 'Risk & Ownership Report')}
          </span>
        </div>
      </div>

      {/* Quick Scenario Plot Jump Bar for Judges & Citizens */}
      <div className="no-print rounded-2xl bg-white border border-gray-200 p-4 flex flex-wrap items-center gap-2 hc-card">
        <span className="text-sm font-bold text-[#5F6B66] mr-1">
          {t('নমুনা দাগ দ্রুত দেখুন:', 'Quick Sample Plots:')}
        </span>
        {[
          { id: 1, labelBn: '✔ দাগ ১০১ (নিরাপদ)', labelEn: '✔ Dag 101 (Safe)', color: 'bg-[#E6F2EE] text-[#006A4E]' },
          { id: 2, labelBn: '✖ দাগ ১০২ (ডাবল সেল)', labelEn: '✖ Dag 102 (Double Sale)', color: 'bg-[#FEECEE] text-[#C81E32]' },
          { id: 6, labelBn: '✖ দাগ ১০৬ (ব্যাংক বন্ধক)', labelEn: '✖ Dag 106 (Mortgaged)', color: 'bg-[#FEECEE] text-[#C81E32]' },
          { id: 7, labelBn: '⚠ দাগ ১০৭ (খতিয়ান অমিল)', labelEn: '⚠ Dag 107 (Chain Break)', color: 'bg-[#FEF6E7] text-[#8C580C]' },
          { id: 8, labelBn: '⚠ দাগ ১০৮ (ওয়ারিশ অমীমাংসিত)', labelEn: '⚠ Dag 108 (Unresolved Heirs)', color: 'bg-[#FEF6E7] text-[#8C580C]' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setSelectedLocationId(1);
              setSelectedPlotId(item.id);
              fetchReport(item.id, requestedArea);
            }}
            className={`min-h-[44px] px-3.5 py-1.5 rounded-xl font-bold text-sm cursor-pointer transition ${item.color}`}
          >
            {t(item.labelBn, item.labelEn)}
          </button>
        ))}
      </div>

      {/* STEP 1: Select Division -> District -> Upazila -> Mouza */}
      {step === 1 && (
        <section className="rounded-3xl bg-white border-2 border-[#006A4E]/30 p-6 sm:p-8 shadow-xs max-w-2xl mx-auto space-y-6 hc-card">
          <div>
            <span className="text-sm font-bold text-[#006A4E]">
              {t('ধাপ ১ / ৩ — অবস্থান নির্বাচন', 'Step 1 of 3 — Select Location')}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mt-1">
              {t('জমিটি কোন মৌজায় অবস্থিত?', 'Which Mouza Is the Land Located In?')}
            </h1>
            <p className="text-[#5F6B66] mt-1">
              {t(
                'টাইপ করার প্রয়োজন নেই—নিচের তালিকা থেকে আপনার বিভাগ, জেলা, উপজেলা ও মৌজা বেছে নিন।',
                'No typing needed — pick the Division, District, Upazila, and Mouza from the dropdown.'
              )}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="mouza-select" className="block font-bold text-[#1A1A1A] mb-2">
                {t('বিভাগ → জেলা → উপজেলা → মৌজা নির্বাচন করুন', 'Division -> District -> Upazila -> Mouza')}
              </label>
              <select
                id="mouza-select"
                value={selectedLocationId}
                onChange={(e) => {
                  const newLocId = Number(e.target.value);
                  setSelectedLocationId(newLocId);
                  const firstPlot = plots.find((p) => Number(p.location_id) === newLocId);
                  if (firstPlot) setSelectedPlotId(firstPlot.id);
                }}
                className="w-full min-h-[54px] px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-[#006A4E] text-lg font-semibold bg-[#FAFBFA]"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {lang === 'bn'
                      ? `${loc.division_bn} → ${loc.district_bn} → ${loc.upazila_bn} → মৌজা: ${loc.mouza_bn} (জে.এল নং ${n(loc.jl_no)})`
                      : `${loc.division_en} -> ${loc.district_en} -> ${loc.upazila_en} -> Mouza: ${loc.mouza_en} (JL No. ${loc.jl_no})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full min-h-[54px] px-6 py-3 rounded-xl bg-[#006A4E] text-white font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#00563F] cursor-pointer"
          >
            <span>{t('পরবর্তী ধাপ: দাগ নম্বর নির্বাচন করুন', 'Next Step: Select Dag Number')}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </section>
      )}

      {/* STEP 2: Select Dag Number & Area */}
      {step === 2 && (
        <section className="rounded-3xl bg-white border-2 border-[#006A4E]/30 p-6 sm:p-8 shadow-xs max-w-2xl mx-auto space-y-6 hc-card">
          <div>
            <span className="text-sm font-bold text-[#006A4E]">
              {t('ধাপ ২ / ৩ — দাগ নম্বর ও জমির পরিমাণ', 'Step 2 of 3 — Plot (Dag) & Area')}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mt-1">
              {t(
                `${currentLocation?.mouza_bn || ''} মৌজার দাগ নম্বর বেছে নিন`,
                `Select Dag Number in ${currentLocation?.mouza_en || ''} Mouza`
              )}
            </h1>
            <p className="text-[#5F6B66] mt-1">
              {t(
                'উদাহরণ: দাগ নং ১০১ (নিরাপদ), দাগ নং ১০২ (ডাবল সেল), দাগ নং ১০৬ (ব্যাংক বন্ধক)।',
                'Example: Dag 101 (Safe), Dag 102 (Double Sale), Dag 106 (Mortgaged).'
              )}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="dag-select" className="block font-bold text-[#1A1A1A] mb-2">
                {t('দাগ নম্বর নির্বাচন করুন (যেমন: দাগ নং ১০১)', 'Select Plot / Dag Number (e.g. Dag 101)')}
              </label>
              <select
                id="dag-select"
                value={selectedPlotId}
                onChange={(e) => setSelectedPlotId(Number(e.target.value))}
                className="w-full min-h-[54px] px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-[#006A4E] text-lg font-semibold bg-[#FAFBFA]"
              >
                {plotsInMouza.map((p) => (
                  <option key={p.id} value={p.id}>
                    {lang === 'bn'
                      ? `দাগ নং ${p.dag_no_bn} — ${p.land_type_bn} (মোট জমি: ${n(p.total_area_decimal)} শতাংশ)`
                      : `Dag No. ${p.dag_no} — ${p.land_type_en} (Total Area: ${p.total_area_decimal} Decimals)`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="buy-area-input" className="block font-bold text-[#1A1A1A] mb-2">
                {t(
                  'আপনি কত শতাংশ জমি কিনতে চান? (যেমন: ১০ শতাংশ)',
                  'How Many Decimals Do You Plan to Buy? (e.g. 10)'
                )}
              </label>
              <input
                id="buy-area-input"
                type="number"
                step="0.5"
                min="0.5"
                value={requestedArea}
                onChange={(e) => setRequestedArea(e.target.value)}
                className="w-full min-h-[54px] px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-[#006A4E] text-lg font-semibold bg-[#FAFBFA]"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="min-h-[54px] px-5 py-3 rounded-xl border-2 border-gray-300 font-bold text-[#1A1A1A] hover:bg-gray-100 cursor-pointer"
            >
              {t('পিছনে যান', 'Back')}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => fetchReport(selectedPlotId, requestedArea)}
              className="flex-1 min-h-[54px] px-6 py-3 rounded-xl bg-[#006A4E] text-white font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#00563F] cursor-pointer"
            >
              <Search className="w-5 h-5" />
              <span>
                {loading
                  ? t('যাচাই করা হচ্ছে...', 'Checking Records...')
                  : t('জমির সম্পূর্ণ ঝুঁকি রিপোর্ট দেখুন', 'Generate Check-Before-You-Buy Report')}
              </span>
            </button>
          </div>
        </section>
      )}

      {error && (
        <div className="p-5 rounded-2xl bg-[#FEECEE] border-2 border-[#F42A41] text-[#C81E32] font-semibold">
          {error}
        </div>
      )}

      {/* STEP 3: Printable One-Page Check Before You Buy Report */}
      {step === 3 && report && (
        <div className="space-y-6">
          {/* Action bar for changing plot, printing, or sharing */}
          <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 hc-card">
            <div>
              <span className="text-xs font-bold uppercase text-[#006A4E]">
                {t('জমি কেনার আগে যাচাই রিপোর্ট', 'Check Before You Buy Report')}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">
                {t('মৌজা:', 'Mouza:')} {t(report.location.mouza_bn, report.location.mouza_en)} •{' '}
                {t('দাগ নং:', 'Dag No:')} {n(report.plot.dag_no)} ({t(report.plot.land_type_bn, report.plot.land_type_en)})
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="min-h-[48px] px-4 py-2 rounded-xl border border-gray-300 font-semibold text-sm hover:bg-gray-100 cursor-pointer"
              >
                {t('অন্য দাগ দেখুন', 'Change Plot')}
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="min-h-[48px] px-4 py-2 rounded-xl border border-[#006A4E] text-[#006A4E] font-semibold text-sm flex items-center gap-1.5 hover:bg-[#E6F2EE] cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>{copied ? t('লিংক কপি হয়েছে!', 'Link Copied!') : t('শেয়ার করুন', 'Share')}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-[48px] px-4 py-2 rounded-xl bg-[#006A4E] text-white font-semibold text-sm flex items-center gap-1.5 hover:bg-[#00563F] cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{t('প্রিন্ট / PDF সংরক্ষণ', 'Print / Save PDF')}</span>
              </button>
            </div>
          </div>

          {/* Hero Verdict Banner */}
          <VerdictBanner
            verdict={report.risk_report.verdict}
            riskScore={report.risk_report.risk_score}
            titleBn={report.risk_report.summary_bn}
            titleEn={report.risk_report.summary_en}
            reasonsBn={
              report.risk_report.flags.length > 0
                ? report.risk_report.flags.map((f: any) => `${f.title_bn}: ${f.message_bn}`)
                : [
                    `সর্বশেষ বিএস খতিয়ানে বর্তমান মালিকের নাম ও অংশ সঠিক রয়েছে।`,
                    `সিএস → এসএ → আরএস → বিএস জরিপের জমির পরিমাণ (${n(report.plot.total_area_decimal)} শতাংশ) সম্পূর্ণ মিলেছে।`,
                    `এই দাগে কোনো সক্রিয় ব্যাংক বন্ধক (মর্টগেজ) বা ডাবল সেলের অভিযোগ নেই।`,
                  ]
            }
            reasonsEn={
              report.risk_report.flags.length > 0
                ? report.risk_report.flags.map((f: any) => `${f.title_en}: ${f.message_en}`)
                : [
                    `Current owner and share fraction on latest BS Khatian are verified.`,
                    `CS -> SA -> RS -> BS survey chain (${report.plot.total_area_decimal} decimals) reconciles cleanly.`,
                    `Zero active bank mortgage liens or overlapping pending sale deeds found.`,
                  ]
            }
            nextStepsBn={report.risk_report.next_steps_bn}
            nextStepsEn={report.risk_report.next_steps_en}
            technicalDetails={report.risk_report}
          />

          {/* Grid: Current Owners + Bank Lien Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Recorded Owner(s) */}
            <section className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6 shadow-xs hc-card space-y-4">
              <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
                <Users className="w-6 h-6 text-[#006A4E]" />
                <span>{t('বর্তমান রেকর্ডীয় মালিকগণ (সর্বশেষ বিএস খতিয়ান)', 'Current Recorded Owner(s) — BS Khatian')}</span>
              </h2>
              <div className="space-y-3">
                {report.current_owners.map((own: any) => (
                  <div
                    key={own.id}
                    className="p-4 rounded-xl bg-[#FAFBFA] border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-lg text-[#1A1A1A]">
                        {t(own.owner_name_bn, own.owner_name_en)}
                        {own.is_deceased === 1 && (
                          <span className="ml-2 text-xs px-2.5 py-0.5 rounded-full bg-[#FEF6E7] text-[#8C580C] border border-[#B7791F]">
                            {t('⚠ মৃত (ওয়ারিশ যাচাই আবশ্যক)', '⚠ Deceased (Heirs Check)')}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-[#5F6B66]">
                        {t('পিতা:', 'Father:')} {t(own.father_name_bn, own.father_name_en)} •{' '}
                        {t('ডেমো এনআইডি:', 'Mock NID:')} {n(own.nid)}
                      </div>
                    </div>
                    <div className="sm:text-right">
                      <div className="inline-block px-3 py-1 rounded-lg bg-[#E6F2EE] text-[#006A4E] font-bold">
                        {t('অংশ:', 'Share:')} {n(own.share_fraction)} ({n(own.area_decimal)}{' '}
                        {t('শতাংশ', 'Dec')})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Bank Mortgage / Lien Status */}
            <section className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6 shadow-xs hc-card space-y-4">
              <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
                <Landmark className="w-6 h-6 text-[#006A4E]" />
                <span>{t('ব্যাংক বন্ধক (মর্টগেজ) ও দায়বদ্ধতা স্ট্যাটাস', 'Bank Mortgage & Lien Status')}</span>
              </h2>
              {report.mortgages.length === 0 ? (
                <div className="p-5 rounded-xl bg-[#E6F2EE] border border-[#006A4E]/30 text-[#006A4E] font-bold">
                  ✔ {t('এই দাগে কোনো ব্যাংক ঋণ বা বন্ধক (Lien) নেই।', 'No bank mortgage or active lien registered on this plot.')}
                </div>
              ) : (
                <div className="space-y-3">
                  {report.mortgages.map((m: any) => (
                    <div
                      key={m.id}
                      className={`p-4 rounded-xl border ${
                        m.status === 'ACTIVE'
                          ? 'bg-[#FEECEE] border-[#F42A41]'
                          : 'bg-[#FAFBFA] border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#1A1A1A]">
                          {t(m.bank_name_bn, m.bank_name_en)} — {m.branch_bn}
                        </span>
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            m.status === 'ACTIVE'
                              ? 'bg-[#F42A41] text-white'
                              : 'bg-[#006A4E] text-white'
                          }`}
                        >
                          {m.status === 'ACTIVE'
                            ? t('✖ সক্রিয় বন্ধক (ACTIVE)', '✖ ACTIVE LIEN')
                            : t('✔ অবমুক্ত (RELEASED)', '✔ RELEASED')}
                        </span>
                      </div>
                      <div className="text-sm text-[#5F6B66] mt-1">
                        {t('ঋণের পরিমাণ:', 'Loan Amount:')} {formatCurrency(m.amount_bdt, lang)} •{' '}
                        {t('বন্ধককৃত জমি:', 'Mortgaged Area:')} {n(m.area_mortgaged_decimal)}{' '}
                        {t('শতাংশ', 'Decimals')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Khatian Survey History Timeline (CS -> SA -> RS -> BS) */}
          <section className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6 shadow-xs hc-card space-y-4">
            <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
              <History className="w-6 h-6 text-[#006A4E]" />
              <span>
                {t(
                  'খতিয়ান ধারাবাহিকতা টাইমলাইন (CS → SA → RS → BS)',
                  'Khatian Survey Chain Timeline (CS -> SA -> RS -> BS)'
                )}
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {report.khatian_chain.map((k: any) => {
                const isBreak = k.status !== 'VALID';
                return (
                  <div
                    key={k.id}
                    className={`p-4 rounded-2xl border-2 ${
                      isBreak
                        ? 'bg-[#FEF6E7] border-[#B7791F]'
                        : 'bg-[#FAFBFA] border-[#006A4E]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#006A4E] text-white font-bold text-sm">
                        {k.survey_type} ({n(k.survey_year)})
                      </span>
                      <span className="text-xs font-bold text-[#5F6B66]">
                        {isBreak ? t('⚠ যাচাই প্রয়োজন', '⚠ Discrepancy') : t('✔ সঠিক', '✔ Valid')}
                      </span>
                    </div>
                    <div className="mt-3 font-bold text-lg text-[#1A1A1A]">
                      {t('খতিয়ান নং:', 'Khatian No:')} {n(k.khatian_no)}
                    </div>
                    <div className="text-sm font-semibold text-[#006A4E]">
                      {t('রেকর্ডকৃত জমি:', 'Recorded Area:')} {n(k.recorded_area_decimal)}{' '}
                      {t('শতাংশ', 'Decimals')}
                    </div>
                    <p className="text-xs text-[#5F6B66] mt-2">
                      {t(k.remarks_bn || '', k.remarks_en || '')}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Registered Deeds & Mutation History on this Plot */}
          <section className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6 shadow-xs hc-card space-y-4">
            <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#006A4E]" />
              <span>
                {t('এই দাগের নিবন্ধিত দলিল ও নামজারি ইতিহাস', 'Registered Deeds & Mutation Status on This Plot')}
              </span>
            </h2>
            {report.deeds.length === 0 ? (
              <p className="text-sm text-[#5F6B66]">
                {t('কোনো সাম্প্রতিক ডিজিটাল দলিল পাওয়া যায়নি।', 'No digital deeds recorded on this plot.')}
              </p>
            ) : (
              <div className="space-y-3">
                {report.deeds.map((d: any) => (
                  <div
                    key={d.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      d.ledger_valid
                        ? 'bg-[#FAFBFA] border-gray-200'
                        : 'bg-[#FEECEE] border-[#F42A41]'
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-[#1A1A1A]">{d.deed_no}</span>
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            d.ledger_valid
                              ? 'bg-[#E6F2EE] text-[#006A4E]'
                              : 'bg-[#F42A41] text-white'
                          }`}
                        >
                          {d.ledger_valid
                            ? t('✔ ডিজিটাল স্বাক্ষর সঠিক', '✔ Signature Valid')
                            : t('✖ দলিলের তথ্য পরিবর্তিত!', '✖ Tampered!')}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-200 text-[#1A1A1A]">
                          {d.status === 'MUTATED'
                            ? t('নামজারি সম্পন্ন', 'Mutated')
                            : d.status === 'PENDING_MUTATION'
                            ? t('নামজারি প্রক্রিয়াধীন', 'Mutation Pending')
                            : d.status}
                        </span>
                      </div>
                      <div className="text-sm text-[#5F6B66] mt-1">
                        {t(d.seller_name_bn, d.seller_name_en)} → {t(d.buyer_name_bn, d.buyer_name_en)} •{' '}
                        {n(d.area_decimal)} {t('শতাংশ', 'Decimals')}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenDeedVerify(d.deed_no)}
                      className="no-print min-h-[44px] px-4 py-2 rounded-xl bg-[#006A4E] text-white font-semibold text-sm hover:bg-[#00563F] cursor-pointer shrink-0"
                    >
                      {t('QR ও হ্যাশ যাচাই দেখুন', 'Verify Deed Hash & QR')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
