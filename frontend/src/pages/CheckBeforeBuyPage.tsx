import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi, RiskReportResponse } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { ResultHeroBanner } from '../components/ResultHeroBanner';
import { KhatianChainTimeline } from '../components/KhatianChainTimeline';
import {
  Search,
  ArrowLeft,
  ArrowRight,
  Layers,
  RotateCcw,
  Printer,
  FileBadge,
  CheckCircle,
  ShieldAlert,
  X,
  AlertCircle,
  Lock,
  Unlock,
} from 'lucide-react';

export const CheckBeforeBuyPage: React.FC = () => {
  const { lang, t } = useAppUI();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [locations, setLocations] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);

  const [selectedMouzaId, setSelectedMouzaId] = useState<number>(1);
  const [selectedPlotId, setSelectedPlotId] = useState<number>(1);
  const [sellerId, setSellerId] = useState<number>(1);
  const [proposedArea, setProposedArea] = useState<string>('10');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<RiskReportResponse | null>(null);
  const [showCertModal, setShowCertModal] = useState(false);

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
    sId = sellerId,
    area = Number(proposedArea)
  ) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await BhumiApi.checkBeforeBuy({
        plot_id: Number(plotId),
        seller_id: Number(sId),
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
      setErrorMsg(t('কেস রেকর্ড লোড করতে সমস্যা হয়েছে।', 'Failed to load verification case.'));
    } finally {
      setLoading(false);
    }
  };

  const currentSelectedPlot = plots.find((p) => Number(p.id) === Number(selectedPlotId));
  const currentSelectedMouza = locations.find((l) => Number(l.id) === Number(selectedMouzaId));
  const currentSeller = persons.find((p) => Number(p.id) === Number(sellerId));

  return (
    <div className="space-y-6">
      <header className="page-intro animate-rise">
        <h1>{t('কেনার আগে যাচাই', 'Check Before Buy')}</h1>
        <p>{t('মৌজা, দাগ ও বিক্রেতা নির্বাচন করে প্রাক-ক্রয় ঝুঁকি ও খতিয়ান চেইন যাচাই করুন।', 'Select mouza, plot and seller to run pre-purchase risk and khatian lineage checks.')}</p>
      </header>
      {/* Reference Verification Case Presets Bar */}
      <div className="panel p-4">
        <div className="flex items-center gap-2 text-xs font-bold text-[#5F7A74] mb-2.5">
          <Layers className="w-4 h-4 text-[#0D6B5C]" />
          <span>
            {t(
              'রেফারেন্স যাচাই কেসসমূহ (১-ক্লিকে বিভিন্ন ধরনের মালিকানা ও ঝুঁকি পরিস্থিতি পরীক্ষা করুন):',
              'Reference Verification Cases (Inspect standard ownership & encumbrance scenarios):'
            )}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {scenarios.map((sc) => {
            const btnColor =
              sc.badge_type === 'SAFE'
                ? 'bg-emerald-50 text-[#0D6B5C] border-emerald-200 hover:bg-[#0D6B5C] hover:text-white'
                : sc.badge_type === 'WARNING'
                ? 'bg-amber-50 text-[#C4891A] border-amber-200 hover:bg-[#C4891A] hover:text-white'
                : 'bg-rose-50 text-[#FF3B4A] border-rose-200 hover:bg-[#FF3B4A] hover:text-white';
            return (
              <button
                key={sc.code}
                onClick={() => triggerScenario(sc)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer min-h-[34px] ${btnColor}`}
              >
                #{toBanglaDigits(sc.code, lang)} {lang === 'bn' ? sc.title_bn : sc.title_en}
              </button>
            );
          })}
        </div>
      </div>

      {/* Wizard Progress Indicator */}
      <div className="panel p-4 flex items-center justify-between">
        <div className="font-display text-base text-[#062823]">
          {t(`ধাপ ${toBanglaDigits(step, 'bn')} / ৩`, `Step ${step} of 3`)}:{' '}
          {step === 1
            ? t('মৌজা ও দাগ নির্বাচন করুন', 'Select Mouza & Plot')
            : step === 2
            ? t('বিক্রেতা ও প্রস্তাবিত জমির পরিমাণ দিন', 'Enter Seller & Area')
            : t('যাচাই ফলাফল ও খতিয়ান চেইন', 'Verification Result & Lineage')}
        </div>
        {step > 1 && (
          <button
            onClick={() => setStep(1)}
            className="btn-ghost text-xs !min-h-[34px] py-1.5 px-3"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('নতুন দাগ অনুসন্ধান', 'New Search')}</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-[#FFF0F1] border-l-8 border-[#FF3B4A] text-[#0A1F1C] font-bold text-xs">
          {errorMsg}
        </div>
      )}

      {/* STEP 1: Select Location & Plot */}
      {step === 1 && (
        <div className="panel p-6 space-y-6 animate-rise-delay">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">
                {t(
                  '১. বিভাগ / জেলা / উপজেলা / মৌজা নির্বাচন করুন:',
                  '1. Select Division / District / Upazila / Mouza:'
                )}
              </label>
              <select
                value={selectedMouzaId}
                onChange={(e) => {
                  const mId = Number(e.target.value);
                  setSelectedMouzaId(mId);
                  const firstPlot = plots.find((p) => Number(p.mouza_id) === mId);
                  if (firstPlot) setSelectedPlotId(firstPlot.id);
                }}
                className="field font-semibold text-sm bg-[#F5FAF8]"
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
              <label className="label">
                {t('২. দাগ নম্বর (Plot / Dag No.) নির্বাচন করুন:', '2. Select Plot / Dag Number:')}
              </label>
              <select
                value={selectedPlotId}
                onChange={(e) => setSelectedPlotId(Number(e.target.value))}
                className="field font-semibold text-sm bg-[#F5FAF8]"
              >
                {filteredPlots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {t('দাগ নং:', 'Dag No:')} {toBanglaDigits(p.dag_no, lang)} — ({p.land_type},{' '}
                    {toBanglaDigits(p.total_area_decimal, lang)} {t('শতাংশ', 'Decimal')})
                    {Number(p.owner_sale_locked) === 1 ? ' [🔒 LOCKED]' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected Plot Live Metadata Card */}
          {currentSelectedPlot && (
            <div className="p-4 rounded-xl bg-[#EDF4F1]/80 border border-[#0D6B5C]/12 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[#5F7A74] font-medium">{t('নির্বাচিত মৌজা:', 'Jurisdiction:')}</span>
                <div className="font-bold text-[#0A1F1C] mt-0.5">
                  {lang === 'bn' ? currentSelectedMouza?.mouza_bn : currentSelectedMouza?.mouza_en} (JL {currentSelectedMouza?.jl_no})
                </div>
              </div>
              <div>
                <span className="text-[#5F7A74] font-medium">{t('জমির শ্রেণী:', 'Land Class:')}</span>
                <div className="font-bold text-[#0A1F1C] mt-0.5">{currentSelectedPlot.land_type}</div>
              </div>
              <div>
                <span className="text-[#5F7A74] font-medium">{t('দাগের মোট আয়তন:', 'Total Plot Area:')}</span>
                <div className="font-extrabold text-[#0D6B5C] mt-0.5">
                  {toBanglaDigits(currentSelectedPlot.total_area_decimal, lang)} {t('শতাংশ', 'Decimal')}
                </div>
              </div>
              <div>
                <span className="text-[#5F7A74] font-medium">{t('বিক্রয় লক অবস্থা:', 'Sale Lock Status:')}</span>
                <div className="mt-0.5">
                  {Number(currentSelectedPlot.owner_sale_locked) === 1 ? (
                    <span className="inline-flex items-center gap-1 font-extrabold text-xs text-[#FF3B4A]">
                      <Lock className="w-3.5 h-3.5" />
                      <span>{t('🔒 বিক্রয় লক সক্রিয়', '🔒 SALE LOCKED')}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-extrabold text-xs text-[#0D6B5C]">
                      <Unlock className="w-3.5 h-3.5" />
                      <span>{t('🔓 লেনদেন উন্মুক্ত', '🔓 UNLOCKED')}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              className="btn-primary text-sm flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <span>{t('পরবর্তী ধাপ (বিক্রেতার তথ্য)', 'Next Step (Seller Details)')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Enter Seller & Proposed Area */}
      {step === 2 && (
        <div className="panel p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">
                {t('বিক্রেতা (Seller + NID) নির্বাচন করুন:', 'Select Seller (with NID):')}
              </label>
              <select
                value={sellerId}
                onChange={(e) => setSellerId(Number(e.target.value))}
                className="field font-semibold text-sm bg-[#F5FAF8]"
              >
                {persons.slice(0, 20).map((per) => (
                  <option key={per.id} value={per.id}>
                    {lang === 'bn' ? per.name_bn : per.name_en} — NID: {per.nid_mock}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
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
                className="field font-bold text-sm"
              />
            </div>
          </div>

          {/* Seller Preview Card */}
          {currentSeller && (
            <div className="p-4 rounded-xl bg-[#EDF4F1]/80 border border-[#0D6B5C]/12 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[#5F7A74]">{t('বিক্রেতার নাম ও এনআইডি:', 'Selected Seller:')}</span>
                <div className="font-bold text-[#0A1F1C]">
                  {lang === 'bn' ? currentSeller.name_bn : currentSeller.name_en} • NID: {currentSeller.nid_mock}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[#5F7A74]">{t('প্রস্তাবিত ক্রয়ের পরিমাণ:', 'Requested Area:')}</span>
                <div className="font-extrabold text-[#0D6B5C] text-sm">
                  {toBanglaDigits(proposedArea, lang)} {t('শতাংশ (Decimal)', 'Decimal')}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <button
              onClick={() => setStep(1)}
              className="btn-ghost text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('পিছনে যান', 'Back')}</span>
            </button>

            <button
              onClick={() => runVerification()}
              disabled={loading}
              className="btn-primary text-sm flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Search className="w-4 h-4" />
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
          {/* Top Actions: Print / Official Verification Certificate */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCertModal(true)}
              className="btn-primary text-xs flex items-center gap-2 shadow-xs hover:bg-[#0A5549] cursor-pointer min-h-[38px]"
            >
              <FileBadge className="w-4 h-4" />
              <span>{t('অফিসিয়াল যাচাই সনদ দেখুন ও প্রিন্ট করুন', 'Official Verification Certificate')}</span>
            </button>
          </div>

          <ResultHeroBanner report={report} />

          {report.khatian_chain && <KhatianChainTimeline chain={report.khatian_chain} />}

          {/* Active Mortgages & Deed History Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="panel p-5">
              <h3 className="text-base font-bold text-[#0A1F1C] mb-3">
                {t('ব্যাংক মর্টগেজ / দায়বদ্ধতার তথ্য', 'Bank Mortgage & Lien Status')}
              </h3>
              {report.active_mortgages && report.active_mortgages.length > 0 ? (
                <div className="space-y-2">
                  {report.active_mortgages.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg bg-[#FFF0F1] border border-[#FF3B4A] text-xs"
                    >
                      <div className="font-bold text-[#FF3B4A]">
                        ✖ {lang === 'bn' ? m.bank_name_bn : m.bank_name_en} ({m.branch_name})
                      </div>
                      <div className="font-semibold text-[#0A1F1C] mt-1">
                        {t('ঋণের পরিমাণ:', 'Loan Amount:')} ৳
                        {toBanglaDigits(m.loan_amount_bdt.toLocaleString(), lang)} ({m.status})
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-[#E8F5F1] text-[#0D6B5C] font-bold text-xs">
                  ✔ {t('এই দাগে কোনো সক্রিয় ব্যাংক মর্টগেজ নেই।', 'No active bank mortgage found on this plot.')}
                </div>
              )}
            </div>

            <div className="panel p-5">
              <h3 className="text-base font-bold text-[#0A1F1C] mb-3">
                {t('পূর্ববর্তী নিবন্ধিত দলিলের ইতিহাস (হ্যাশ লেজার)', 'Registered Deed History (Hash Ledger)')}
              </h3>
              {report.deed_history && report.deed_history.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {report.deed_history.map((d) => (
                    <div key={d.id} className="p-3 rounded-lg bg-[#EDF4F1]/80 border border-[#0D6B5C]/12 text-xs">
                      <div className="flex justify-between font-bold text-[#0A1F1C]">
                        <span>{d.deed_no}</span>
                        <span
                          className={
                            d.is_tampered_demo
                              ? 'text-[#FF3B4A]'
                              : d.status === 'REGISTERED' || d.status === 'MUTATED'
                              ? 'text-[#0D6B5C]'
                              : 'text-[#C4891A]'
                          }
                        >
                          {d.is_tampered_demo ? '✖ TAMPERED' : d.status}
                        </span>
                      </div>
                      <div className="mt-1 text-[#5F7A74]">
                        {d.seller_name_bn} → {d.buyer_name_bn} ({toBanglaDigits(d.area_decimal, lang)}{' '}
                        {t('শতাংশ', 'dec')})
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-[#5F7A74]/80 truncate">
                        SHA256: {d.content_hash}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#5F7A74]">
                  {t('কোনো পূর্ববর্তী দলিল পাওয়া যায়নি।', 'No prior deeds recorded.')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Official Land Verification Certificate Modal */}
      {showCertModal && report && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border-4 border-[#0D6B5C] space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCertModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#EDF4F1] hover:bg-[#E4EFEA] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between border-b-2 border-[#0D6B5C] pb-4">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/bhumishield-emblem.svg"
                  alt="Gov Emblem"
                  className="w-12 h-12 rounded-xl"
                />
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#0D6B5C]">
                    {t('গণপ্রজাতন্ত্রী বাংলাদেশ সরকার • ভূমি মন্ত্রণালয়', 'Government of Bangladesh • Ministry of Land')}
                  </div>
                  <h3 className="text-lg md:text-xl font-extrabold text-[#0A1F1C] mt-0.5">
                    {t('ভূমি মালিকানা ও প্রাক-নিবন্ধন যাচাই সনদ', 'Land Ownership & Pre-Registration Verification Certificate')}
                  </h3>
                  <p className="text-[11px] text-[#5F7A74]">
                    Certificate Ref: BS-CERT-2026-{toBanglaDigits(selectedPlotId, lang)} • Ed25519 Verified
                  </p>
                </div>
              </div>
            </div>

            {/* Verdict Box */}
            <div
              className={`p-4 rounded-xl text-white font-bold flex items-center justify-between ${
                report.status === 'SAFE'
                  ? 'bg-[#0D6B5C]'
                  : report.status === 'WARNING'
                  ? 'bg-[#C4891A]'
                  : 'bg-[#FF3B4A]'
              }`}
            >
              <div>
                <div className="text-base font-extrabold">
                  {lang === 'bn' ? report.badge_bn : report.badge_en}
                </div>
                <div className="text-xs opacity-90 mt-0.5">
                  {lang === 'bn' ? report.summary_bn : report.summary_en}
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded bg-white/20 border border-white/30 font-mono">
                {report.status}
              </span>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-[#EDF4F1]/80 p-4 rounded-xl border border-[#0D6B5C]/12">
              <div>
                <strong>{t('মৌজা ও জেএল:', 'Mouza & JL:')}</strong>{' '}
                {lang === 'bn' ? currentSelectedMouza?.mouza_bn : currentSelectedMouza?.mouza_en} (JL {currentSelectedMouza?.jl_no})
              </div>
              <div>
                <strong>{t('দাগ নম্বর:', 'Dag / Plot No:')}</strong>{' '}
                {toBanglaDigits(currentSelectedPlot?.dag_no, lang)}
              </div>
              <div>
                <strong>{t('বিক্রেতা:', 'Seller Name:')}</strong>{' '}
                {lang === 'bn' ? currentSeller?.name_bn : currentSeller?.name_en}
              </div>
              <div>
                <strong>{t('এনআইডি:', 'Seller NID:')}</strong> {currentSeller?.nid_mock}
              </div>
              <div>
                <strong>{t('প্রস্তাবিত জমি:', 'Verified Area:')}</strong>{' '}
                {toBanglaDigits(proposedArea, lang)} {t('শতাংশ', 'Decimal')}
              </div>
              <div>
                <strong>{t('খতিয়ান চেইন অবস্থা:', 'Khatian Lineage:')}</strong>{' '}
                <span className="text-[#0D6B5C] font-bold">CS → SA → RS → BS Verified</span>
              </div>
            </div>

            {/* Next Step Box */}
            <div className="p-3.5 rounded-xl bg-[#E8F5F1] border border-[#0D6B5C] text-xs">
              <div className="font-extrabold text-[#0D6B5C]">
                {t('সুপারিশ ও পরবর্তী পদক্ষেপ:', 'Recommendation & Next Steps:')}
              </div>
              <div className="text-[#0A1F1C]/90 mt-1">
                {lang === 'bn' ? report.next_step_bn : report.next_step_en}
              </div>
            </div>

            <div className="text-[10px] text-[#5F7A74]/80 font-mono text-center">
              SHA-256 HASH CHAIN PROTECTED • BHUMISHIELD TRUST LAYER 2026
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="btn-primary text-xs flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{t('সনদ প্রিন্ট / PDF সংরক্ষণ', 'Print / Save PDF')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
