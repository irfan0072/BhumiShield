import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi, RiskReportResponse } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { ResultHeroBanner } from '../components/ResultHeroBanner';
import { KhatianChainTimeline } from '../components/KhatianChainTimeline';
import { Search, ArrowLeft, ArrowRight, Sparkles, RotateCcw } from 'lucide-react';

export const CheckBeforeBuyPage: React.FC = () => {
  const { lang, t } = useAppUI();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [locations, setLocations] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);

  const [selectedMouzaId, setSelectedMouzaId] = useState<number>(1);
  const [selectedPlotId, setSelectedPlotId] = useState<number>(1);
  const [sellerNid, setSellerNid] = useState<string>('1985123456001');
  const [proposedArea, setProposedArea] = useState<string>('10');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<RiskReportResponse | null>(null);

  useEffect(() => {
    Promise.all([
      BhumiApi.getLocations(),
      BhumiApi.getPlots(),
      BhumiApi.getPersons(),
      BhumiApi.getDemoScenarios(),
    ])
      .then(([locs, plts, pers, scns]) => {
        setLocations(locs);
        setPlots(plts);
        setPersons(pers);
        setScenarios(scns);
      })
      .catch(() => {
        setErrorMsg(
          t(
            'সংযোগে সমস্যা হয়েছে। ব্যাকএন্ড সার্ভার চালু আছে কি না দেখে আবার চেষ্টা করুন।',
            'Connection error. Please ensure the backend server is running.'
          )
        );
      });
  }, []);

  const filteredPlots = plots.filter((p) => Number(p.mouza_id) === Number(selectedMouzaId));

  const runVerification = async (
    plotId = selectedPlotId,
    nid = sellerNid,
    area = Number(proposedArea)
  ) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await BhumiApi.checkBeforeBuy({
        plot_id: Number(plotId),
        seller_nid: nid.trim() || undefined,
        proposed_area_decimal: area > 0 ? area : undefined,
        deed_type: 'SALE',
      });
      setReport(res);
      setStep(3);
    } catch {
      setErrorMsg(
        t(
          'যাচাই সম্পন্ন করা যায়নি। ইন্টারনেট বা সার্ভার সংযোগ দেখে আবার চেষ্টা করুন।',
          'Verification failed. Check connection and try again.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const triggerScenario = async (sc: any) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await BhumiApi.runDemoScenario(sc.code);
      setSelectedPlotId(sc.plot_id);
      setReport(res.report);
      setStep(3);
    } catch {
      setErrorMsg(t('ডেমো সিনারিও লোড করতে সমস্যা হয়েছে।', 'Failed to load demo scenario.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Demo Scenario Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
        <div className="flex items-center gap-2 text-sm font-bold text-[#006A4E] mb-2.5">
          <Sparkles className="w-4 h-4" />
          <span>
            {t(
              'বিচারকদের জন্য ১-ক্লিকে ডেমো সিনারিও পরীক্ষা (Instant Hackathon Demo Scenarios):',
              '1-Click Hackathon Demo Scenarios for Judges:'
            )}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {scenarios.map((sc) => {
            const btnColor =
              sc.badge_type === 'SAFE'
                ? 'bg-[#E6F2EE] text-[#006A4E] border-[#006A4E]/40 hover:bg-[#006A4E] hover:text-white'
                : sc.badge_type === 'WARNING'
                ? 'bg-[#FEF3C7] text-[#B7791F] border-[#B7791F]/40 hover:bg-[#B7791F] hover:text-white'
                : 'bg-[#FEECEE] text-[#F42A41] border-[#F42A41]/40 hover:bg-[#F42A41] hover:text-white';
            return (
              <button
                key={sc.code}
                onClick={() => triggerScenario(sc)}
                className={`px-3 py-1.5 rounded-xl border text-xs md:text-sm font-bold transition-colors cursor-pointer ${btnColor}`}
              >
                #{toBanglaDigits(sc.code, lang)} {lang === 'bn' ? sc.title_bn : sc.title_en}
              </button>
            );
          })}
        </div>
      </div>

      {/* Wizard Progress Indicator */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 flex items-center justify-between">
        <div className="font-extrabold text-lg text-[#006A4E]">
          {t(`ধাপ ${toBanglaDigits(step, 'bn')} / ৩`, `Step ${step} of 3`)}:{' '}
          {step === 1
            ? t('মৌজা ও দাগ নির্বাচন করুন', 'Select Mouza & Plot')
            : step === 2
            ? t('বিক্রেতার এনআইডি ও জমির পরিমাণ দিন', 'Enter Seller NID & Area')
            : t('যাচাই ফলাফল ও খতিয়ান চেইন', 'Verification Result & Lineage')}
        </div>
        {step > 1 && (
          <button
            onClick={() => setStep(1)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-bold flex items-center gap-1.5 hover:bg-gray-100 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('নতুন যাচাই', 'Start Over')}</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-[#FEECEE] border-l-8 border-[#F42A41] text-[#1A1A1A] font-bold">
          {errorMsg}
        </div>
      )}

      {/* STEP 1: Select Location & Plot */}
      {step === 1 && (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-xs space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-bold text-[#1A1A1A] mb-2">
                {t('১. বিভাগ / জেলা / উপজেলা / মৌজা নির্বাচন করুন:', '1. Select Division / District / Upazila / Mouza:')}
              </label>
              <select
                value={selectedMouzaId}
                onChange={(e) => {
                  const mId = Number(e.target.value);
                  setSelectedMouzaId(mId);
                  const firstPlot = plots.find((p) => Number(p.mouza_id) === mId);
                  if (firstPlot) setSelectedPlotId(firstPlot.id);
                }}
                className="w-full p-3.5 rounded-xl border-2 border-gray-300 font-semibold bg-white"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {lang === 'bn'
                      ? `${loc.division_bn} → ${loc.district_bn} → ${loc.upazila_bn} → মৌজা: ${loc.mouza_bn} (JL ${loc.jl_no})`
                      : `${loc.division_en} → ${loc.district_en} → ${loc.upazila_en} → Mouza: ${loc.mouza_en} (JL ${loc.jl_no})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#1A1A1A] mb-2">
                {t('২. দাগ নম্বর (Plot / Dag No.) নির্বাচন করুন:', '2. Select Plot / Dag Number:')}
              </label>
              <select
                value={selectedPlotId}
                onChange={(e) => setSelectedPlotId(Number(e.target.value))}
                className="w-full p-3.5 rounded-xl border-2 border-gray-300 font-semibold bg-white"
              >
                {filteredPlots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {t('দাগ নং:', 'Dag No:')} {toBanglaDigits(p.dag_no, lang)} — ({p.land_type},{' '}
                    {toBanglaDigits(p.total_area_decimal, lang)} {t('শতাংশ', 'Decimal')})
                    {Number(p.owner_sale_locked) === 1 ? ' [🔒 LOCKED]' : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#5F6B66] mt-1.5">
                {t(
                  'যেমন: দাগ নং ১০০১ (নিরাপদ), ১০০২ (দ্বৈত বিক্রয়), ১০০৩ (অতিরিক্ত জমি), ১০০৬ (মর্টগেজ)',
                  'Example: Dag 1001 (Clean), 1002 (Double Sale), 1003 (Excess Area), 1006 (Mortgaged)'
                )}
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              className="px-8 py-4 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-extrabold text-lg flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <span>{t('পরবর্তী ধাপ (বিক্রেতার তথ্য)', 'Next Step (Seller Details)')}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Enter Seller NID & Proposed Area */}
      {step === 2 && (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-xs space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-bold text-[#1A1A1A] mb-2">
                {t('বিক্রেতার এনআইডি (Mock NID) নির্বাচন বা লিখুন:', 'Select or Enter Seller Mock NID:')}
              </label>
              <select
                value={sellerNid}
                onChange={(e) => setSellerNid(e.target.value)}
                className="w-full p-3.5 rounded-xl border-2 border-gray-300 font-semibold bg-white mb-2"
              >
                {persons.slice(0, 15).map((per) => (
                  <option key={per.id} value={per.nid_mock}>
                    {lang === 'bn' ? per.name_bn : per.name_en} — NID: {per.nid_mock}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={sellerNid}
                onChange={(e) => setSellerNid(e.target.value)}
                placeholder={t('যেমন: 1985123456001', 'e.g., 1985123456001')}
                className="w-full p-3.5 rounded-xl border-2 border-gray-300 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-[#1A1A1A] mb-2">
                {t(
                  'প্রস্তাবিত ক্রয়ের পরিমাণ (শতাংশ / Decimal):',
                  'Proposed Purchase Area (in Decimal / শতাংশ):'
                )}
              </label>
              <input
                type="number"
                step="0.01"
                value={proposedArea}
                onChange={(e) => setProposedArea(e.target.value)}
                placeholder={t('যেমন: ১০ শতাংশ', 'e.g., 10 Decimal')}
                className="w-full p-3.5 rounded-xl border-2 border-gray-300 font-bold text-lg"
              />
              <p className="text-xs text-[#5F6B66] mt-1.5">
                {t(
                  'বিক্রেতার মালিকানার চেয়ে বেশি শতক দিলে সিস্টেম স্বয়ংক্রিয়ভাবে তা ব্লক করবে।',
                  'If area exceeds the seller share on the latest BS khatian, BhumiShield flags HIGH RISK.'
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3.5 rounded-xl border-2 border-gray-300 font-bold flex items-center gap-2 hover:bg-gray-100 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>{t('পিছনে যান', 'Back')}</span>
            </button>

            <button
              onClick={() => runVerification()}
              disabled={loading}
              className="px-8 py-4 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-extrabold text-lg flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Search className="w-5 h-5" />
              <span>
                {loading
                  ? t('যাচাই করা হচ্ছে...', 'Verifying Chain...')
                  : t('জমি ও খতিয়ান যাচাই করুন', 'Run Pre-Purchase Verification')}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Result Hero Banner + Khatian Lineage Timeline */}
      {step === 3 && report && (
        <div className="space-y-6">
          <ResultHeroBanner report={report} />

          {report.khatian_chain && <KhatianChainTimeline chain={report.khatian_chain} />}

          {/* Active Mortgages & Deed History Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-3">
                {t('ব্যাংক মর্টগেজ / দায়বদ্ধতার তথ্য', 'Bank Mortgage & Lien Status')}
              </h3>
              {report.active_mortgages && report.active_mortgages.length > 0 ? (
                <div className="space-y-2">
                  {report.active_mortgages.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-[#FEECEE] border border-[#F42A41] text-sm"
                    >
                      <div className="font-bold text-[#F42A41]">
                        ✖ {lang === 'bn' ? m.bank_name_bn : m.bank_name_en} ({m.branch_name})
                      </div>
                      <div className="font-semibold text-gray-900 mt-1">
                        {t('ঋণের পরিমাণ:', 'Loan Amount:')} ৳
                        {toBanglaDigits(m.loan_amount_bdt.toLocaleString(), lang)} ({m.status})
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#E6F2EE] text-[#006A4E] font-bold">
                  ✔ {t('এই দাগে কোনো সক্রিয় ব্যাংক মর্টগেজ নেই।', 'No active bank mortgage found on this plot.')}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-3">
                {t('পূর্ববর্তী নিবন্ধিত দলিলের ইতিহাস (হ্যাশ লেজার)', 'Registered Deed History (Hash Ledger)')}
              </h3>
              {report.deed_history && report.deed_history.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {report.deed_history.map((d) => (
                    <div key={d.id} className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                      <div className="flex justify-between font-bold text-sm text-[#1A1A1A]">
                        <span>{d.deed_no}</span>
                        <span
                          className={
                            d.is_tampered_demo
                              ? 'text-[#F42A41]'
                              : d.status === 'REGISTERED'
                              ? 'text-[#006A4E]'
                              : 'text-[#B7791F]'
                          }
                        >
                          {d.is_tampered_demo ? '✖ TAMPERED' : d.status}
                        </span>
                      </div>
                      <div className="mt-1 text-gray-700">
                        {d.seller_name_bn} → {d.buyer_name_bn} ({toBanglaDigits(d.area_decimal, lang)}{' '}
                        {t('শতাংশ', 'dec')})
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-gray-500 truncate">
                        SHA256: {d.content_hash}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  {t('কোনো পূর্ববর্তী দলিল পাওয়া যায়নি।', 'No prior deeds recorded.')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
