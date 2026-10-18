import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronDown,
  MapPin,
  Check,
  UserCheck,
  Scale,
  Sparkles,
  Info,
  SlidersHorizontal,
  Eye,
  Building,
  User,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  CheckCircle2,
  BadgeCheck,
} from 'lucide-react';

export const CheckBeforeBuyPage: React.FC = () => {
  const { lang, t } = useAppUI();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [locations, setLocations] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);

  const [selectedMouzaId, setSelectedMouzaId] = useState<number>(1);
  const [selectedPlotId, setSelectedPlotId] = useState<number>(1);
  const [sellerId, setSellerId] = useState<number>(1);
  const [proposedArea, setProposedArea] = useState<string>('10');

  // Search & Filtering UX states
  const [plotSearchQuery, setPlotSearchQuery] = useState<string>('');
  const [plotFilterType, setPlotFilterType] = useState<'ALL' | 'UNLOCKED' | 'LOCKED'>('ALL');
  const [sellerSearchQuery, setSellerSearchQuery] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<RiskReportResponse | null>(null);
  const [showCertModal, setShowCertModal] = useState(false);

  useEffect(() => {
    Promise.all([
      BhumiApi.getLocations(),
      BhumiApi.getPlots(),
      BhumiApi.getPersons(),
    ])
      .then(([locs, plts, pers]) => {
        setLocations(locs);
        setPlots(plts);
        setPersons(pers);

        const urlParams = new URLSearchParams(window.location.search);
        const dagParam = urlParams.get('dag');
        const plotIdParam = urlParams.get('plot_id');
        const plotCodeParam = urlParams.get('plot_code');

        if (dagParam) {
          setPlotSearchQuery(dagParam);
          const found = plts.find((p: any) => String(p.dag_no) === String(dagParam) || String(p.dag_no_bn) === String(dagParam));
          if (found) {
            setSelectedPlotId(Number(found.id));
            if (found.location_id) setSelectedMouzaId(Number(found.location_id));
          }
        } else if (plotIdParam) {
          const found = plts.find((p: any) => String(p.id) === String(plotIdParam));
          if (found) {
            setSelectedPlotId(Number(found.id));
            if (found.location_id) setSelectedMouzaId(Number(found.location_id));
          }
        } else if (plotCodeParam) {
          const found = plts.find((p: any) => String(p.plot_code).toUpperCase() === String(plotCodeParam).toUpperCase());
          if (found) {
            setSelectedPlotId(Number(found.id));
            if (found.location_id) setSelectedMouzaId(Number(found.location_id));
          }
        }
      })
      .catch(() => {
        setErrorMsg(
          t(
            'সংযোগে সমস্যা হয়েছে। ব্যাকএন্ড সার্ভার চালু আছে কি না দেখে আবার চেষ্টা করুন।',
            'Connection error. Please ensure the backend server is running.'
          )
        );
      });

    const pendingSearch = sessionStorage.getItem('bs_pending_check_search');
    if (pendingSearch) {
      sessionStorage.removeItem('bs_pending_check_search');
      setPlotSearchQuery(pendingSearch);
    }
  }, []);

  // F11: when arriving via a deep link (e.g. Map → Audit Plot), auto-run the
  // pre-buy check so the user lands on a populated report rather than a blank
  // form. The ref guard ensures a re-render or hot-reload does not trigger a
  // second run, and that a user who manually clears the report is not
  // ambushed by a re-fire on the same navigation.
  const autoRunRef = useRef(false);
  useEffect(() => {
    if (autoRunRef.current) return;
    if (plots.length === 0) return;
    if (report !== null) return;
    const urlParams = new URLSearchParams(window.location.search);
    const dagParam = urlParams.get('dag');
    const plotIdParam = urlParams.get('plot_id');
    const plotCodeParam = urlParams.get('plot_code');
    if (!dagParam && !plotIdParam && !plotCodeParam) return;

    let found: any = null;
    if (dagParam) {
      found = plots.find((p) => String(p.dag_no) === String(dagParam) || String(p.dag_no_bn) === String(dagParam));
    } else if (plotIdParam) {
      found = plots.find((p) => String(p.id) === String(plotIdParam));
    } else if (plotCodeParam) {
      found = plots.find((p) => String(p.plot_code).toUpperCase() === String(plotCodeParam).toUpperCase());
    }
    if (!found) return;

    autoRunRef.current = true;
    setSelectedPlotId(Number(found.id));
    if (found.location_id) setSelectedMouzaId(Number(found.location_id));
    // Defer one tick so the state setters above propagate to selectedPlotId
    // and sellerId/proposedArea before runVerification reads them.
    setTimeout(() => {
      void runVerification(Number(found.id), sellerId, Number(proposedArea) > 0 ? Number(proposedArea) : 10);
    }, 80);
  }, [plots.length, report]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCertModal(false);
      }
    };
    if (showCertModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCertModal]);

  // Plots belonging to current selected Mouza
  const mouzaPlots = useMemo(() => {
    return plots.filter((p) => Number(p.mouza_id) === Number(selectedMouzaId));
  }, [plots, selectedMouzaId]);

  // Filtered plots based on search query and filter chips
  const displayedPlots = useMemo(() => {
    return mouzaPlots.filter((p) => {
      if (plotSearchQuery.trim()) {
        const q = plotSearchQuery.trim().toLowerCase();
        const dagStr = String(p.dag_no).toLowerCase();
        const typeStr = String(p.land_type || '').toLowerCase();
        if (!dagStr.includes(q) && !typeStr.includes(q)) return false;
      }
      if (plotFilterType === 'UNLOCKED') return Number(p.owner_sale_locked) !== 1;
      if (plotFilterType === 'LOCKED') return Number(p.owner_sale_locked) === 1;
      return true;
    });
  }, [mouzaPlots, plotSearchQuery, plotFilterType]);

  const unlockedCount = useMemo(
    () => mouzaPlots.filter((p) => Number(p.owner_sale_locked) !== 1).length,
    [mouzaPlots]
  );
  const lockedCount = useMemo(
    () => mouzaPlots.filter((p) => Number(p.owner_sale_locked) === 1).length,
    [mouzaPlots]
  );

  const currentSelectedPlot = plots.find((p) => Number(p.id) === Number(selectedPlotId));
  const currentSelectedMouza = locations.find((l) => Number(l.id) === Number(selectedMouzaId));
  const currentSeller = persons.find((p) => Number(p.id) === Number(sellerId));

  // Filtered persons for seller selector
  const filteredPersons = useMemo(() => {
    if (!sellerSearchQuery.trim()) return persons.slice(0, 24);
    const q = sellerSearchQuery.trim().toLowerCase();
    return persons.filter((per) => {
      const nameBn = String(per.name_bn || '').toLowerCase();
      const nameEn = String(per.name_en || '').toLowerCase();
      const nid = String(per.nid_mock || per.nid || '').toLowerCase();
      return nameBn.includes(q) || nameEn.includes(q) || nid.includes(q);
    });
  }, [persons, sellerSearchQuery]);

  const runVerification = async (
    plotId = selectedPlotId,
    sId = sellerId,
    area = Number(proposedArea)
  ) => {
    const areaNum = Number(proposedArea);
    if (isNaN(areaNum) || areaNum <= 0) {
      setErrorMsg(
        t(
          'জমির পরিমাণ অবশ্যই শূন্যের চেয়ে বেশি হতে হবে (ধনাত্মক সংখ্যা দিন)।',
          'Proposed area must be greater than zero. Please enter a positive number.'
        )
      );
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await BhumiApi.checkBeforeBuy({
        plot_id: Number(plotId),
        seller_id: Number(sId),
        proposed_area_decimal: areaNum,
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


  const totalPlotArea = Number(currentSelectedPlot?.total_area_decimal || 0);
  const parsedProposedArea = Number(proposedArea) || 0;
  const isAreaExceeded = parsedProposedArea > totalPlotArea && totalPlotArea > 0;
  const areaPercentage = totalPlotArea > 0 ? Math.min(100, (parsedProposedArea / totalPlotArea) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="page-intro animate-rise">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1>{t('জমি কেনার আগে যাচাই', 'Check Before Buy')}</h1>
            <p>
              {t(
                'মৌজা, দাগ ও বিক্রেতা নির্বাচন করে ক্রিপ্টোগ্রাফিক লেজারে খতিয়ান চেইন, মালিকানা ও বন্ধক যাচাই করুন।',
                'Select mouza, plot and seller to run cryptographic pre-purchase risk and khatian lineage checks.'
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#006A4E] text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{t('লাইভ লেজার ভেরিফিকেশন', 'Live Ledger Verification')}</span>
            </span>
          </div>
        </div>
      </header>


      {/* Interactive Visual Stepper Wizard */}
      <div className="panel p-3.5 sm:p-5 border border-slate-200/80 shadow-xs bg-white rounded-2xl">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-1 sm:gap-4 w-full">
            {/* Step 1 Indicator */}
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center gap-2 sm:gap-3 text-left transition-all cursor-pointer group select-none shrink-0 ${
                step === 1 ? 'opacity-100' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm transition-all shadow-xs shrink-0 ${
                  step === 1
                    ? 'bg-[#006A4E] text-white ring-4 ring-emerald-100'
                    : step > 1
                    ? 'bg-emerald-100 text-[#006A4E]'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {step > 1 ? <Check className="w-4 h-4 stroke-[2.5]" /> : toBanglaDigits('1', lang)}
              </div>
              <div className="hidden sm:block min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {t('ধাপ ১', 'Step 1')}
                </div>
                <div
                  className={`text-xs font-extrabold truncate ${
                    step === 1 ? 'text-[#006A4E]' : 'text-slate-800'
                  }`}
                >
                  {t('মৌজা ও দাগ', 'Mouza & Plot')}
                </div>
              </div>
            </button>

            {/* Connecting line 1-2 */}
            <div
              className={`flex-1 h-0.5 mx-1 sm:mx-2 transition-colors ${
                step >= 2 ? 'bg-[#006A4E]' : 'bg-slate-200'
              }`}
            />

            {/* Step 2 Indicator */}
            <button
              type="button"
              onClick={() => {
                if (currentSelectedPlot) setStep(2);
              }}
              disabled={!currentSelectedPlot}
              className={`flex items-center gap-2 sm:gap-3 text-left transition-all shrink-0 ${
                step === 2 ? 'opacity-100' : 'opacity-70 hover:opacity-100'
              } ${!currentSelectedPlot ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
            >
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm transition-all shadow-xs shrink-0 ${
                  step === 2
                    ? 'bg-[#006A4E] text-white ring-4 ring-emerald-100'
                    : step > 2
                    ? 'bg-emerald-100 text-[#006A4E]'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {step > 2 ? <Check className="w-4 h-4 stroke-[2.5]" /> : toBanglaDigits('2', lang)}
              </div>
              <div className="hidden sm:block min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {t('ধাপ ২', 'Step 2')}
                </div>
                <div
                  className={`text-xs font-extrabold truncate ${
                    step === 2 ? 'text-[#006A4E]' : 'text-slate-800'
                  }`}
                >
                  {t('বিক্রেতা ও অংশ', 'Seller & Area')}
                </div>
              </div>
            </button>

            {/* Connecting line 2-3 */}
            <div
              className={`flex-1 h-0.5 mx-1 sm:mx-2 transition-colors ${
                step >= 3 ? 'bg-[#006A4E]' : 'bg-slate-200'
              }`}
            />

            {/* Step 3 Indicator */}
            <button
              type="button"
              onClick={() => {
                if (report) setStep(3);
              }}
              disabled={!report}
              className={`flex items-center gap-2 sm:gap-3 text-left transition-all shrink-0 ${
                step === 3 ? 'opacity-100' : 'opacity-70 hover:opacity-100'
              } ${!report ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
            >
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm transition-all shadow-xs shrink-0 ${
                  step === 3
                    ? 'bg-[#006A4E] text-white ring-4 ring-emerald-100'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {toBanglaDigits('3', lang)}
              </div>
              <div className="hidden sm:block min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {t('ধাপ ৩', 'Step 3')}
                </div>
                <div
                  className={`text-xs font-extrabold truncate ${
                    step === 3 ? 'text-[#006A4E]' : 'text-slate-800'
                  }`}
                >
                  {t('যাচাই ফলাফল', 'Lineage & Risk')}
                </div>
              </div>
            </button>
          </div>

          {/* Mobile Current Step Subtitle & Reset Button */}
          <div className="flex sm:hidden items-center justify-between pt-1 border-t border-slate-100 text-xs">
            <div className="font-extrabold text-[#006A4E] flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
              <span className="truncate">
                {step === 1
                  ? t('ধাপ ১: মৌজা ও দাগ নির্বাচন করুন', 'Step 1: Select Mouza & Plot')
                  : step === 2
                  ? t('ধাপ ২: বিক্রেতা ও জমির পরিমাণ দিন', 'Step 2: Enter Seller & Area')
                  : t('ধাপ ৩: লেজার ও খতিয়ান চেইন ফলাফল', 'Step 3: Verification Result')}
              </span>
            </div>
            {step > 1 && (
              <button
                onClick={() => {
                  setStep(1);
                  setReport(null);
                }}
                className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 shrink-0 ml-2"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t('নতুন দাগ', 'Reset')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-[#FFF0F1] border-l-8 border-[#FF3B4A] text-[#0A1F1C] font-bold text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#FF3B4A] shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 1: Select Mouza & Plot (True Guided Step-by-Step)   */}
      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* STEP 1: Select Mouza & Plot (Cockpit Split View)        */}
      {/* ======================================================== */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start animate-rise-delay">
          {/* Left Pane: Mouza Selection & Plot Search List */}
          <div className="lg:col-span-7 space-y-3">
            {/* Sub-Step 1.1: Administrative Jurisdiction / Mouza Selection */}
            <div className="panel p-3.5 sm:p-4 bg-white border border-slate-200/80 rounded-xl shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#006A4E] text-white text-[11px] font-bold shadow-xs">
                    ১.১
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    {t('প্রশাসনিক এলাকা ও মৌজা', 'Administrative Area & Mouza')}
                  </h3>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  {t('১-ক্লিকে নির্বাচন', '1-Click Selection')}
                </span>
              </div>

              {/* Quick Mouza Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {locations.map((loc) => {
                  const isSelected = Number(loc.id) === Number(selectedMouzaId);
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => {
                        setSelectedMouzaId(Number(loc.id));
                        const firstPlot = plots.find((p) => Number(p.mouza_id) === Number(loc.id));
                        if (firstPlot) setSelectedPlotId(firstPlot.id);
                      }}
                      className={`p-2.5 rounded-lg text-left border transition cursor-pointer relative ${
                        isSelected
                          ? 'bg-emerald-50/80 border-[#006A4E] text-slate-900 ring-2 ring-emerald-500/20 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#006A4E]' : 'text-slate-400'}`} />
                          <span className="font-bold text-xs truncate">
                            {lang === 'bn' ? loc.mouza_bn : loc.mouza_en}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-600 shrink-0">
                          JL {loc.jl_no}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {lang === 'bn' ? `${loc.upazila_bn}, ${loc.district_bn}` : `${loc.upazila_en}, ${loc.district_en}`}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Cascading Dropdown */}
              <div>
                <select
                  value={selectedMouzaId}
                  onChange={(e) => {
                    const mId = Number(e.target.value);
                    setSelectedMouzaId(mId);
                    const firstPlot = plots.find((p) => Number(p.mouza_id) === mId);
                    if (firstPlot) setSelectedPlotId(firstPlot.id);
                  }}
                  className="field font-semibold text-xs bg-slate-50 py-1.5"
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
            </div>

            {/* Sub-Step 1.2: Plot Selection & Instant Search */}
            <div className="panel p-3.5 sm:p-4 bg-white border border-slate-200/80 rounded-xl shadow-2xs space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#006A4E] text-white text-[11px] font-bold shadow-xs">
                    ১.২
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    {t('দাগ নম্বর নির্বাচন ও অনুসন্ধান', 'Select or Search Plot No.')}
                  </h3>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setPlotFilterType('ALL')}
                    className={`px-2 py-0.5 rounded transition cursor-pointer ${
                      plotFilterType === 'ALL'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('সকল', 'All')} ({toBanglaDigits(mouzaPlots.length, lang)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlotFilterType('UNLOCKED')}
                    className={`px-2 py-0.5 rounded transition cursor-pointer ${
                      plotFilterType === 'UNLOCKED'
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-slate-600 hover:text-emerald-800'
                    }`}
                  >
                    {t('🔓 উন্মুক্ত', 'Unlocked')} ({toBanglaDigits(unlockedCount, lang)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlotFilterType('LOCKED')}
                    className={`px-2 py-0.5 rounded transition cursor-pointer ${
                      plotFilterType === 'LOCKED'
                        ? 'bg-white text-red-700 shadow-2xs'
                        : 'text-slate-600 hover:text-red-700'
                    }`}
                  >
                    {t('🔒 লকড', 'Locked')} ({toBanglaDigits(lockedCount, lang)})
                  </button>
                </div>
              </div>

              {/* Quick Live Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  value={plotSearchQuery}
                  onChange={(e) => setPlotSearchQuery(e.target.value)}
                  placeholder={t(
                    'দাগ নম্বর লিখুন (যেমন: ১০১, ১০২, ২০৫)...',
                    'Search plot number (e.g. 101, 102)...'
                  )}
                  className="field pl-8 font-semibold text-xs bg-[#F5FAF8] py-1.5"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                {plotSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPlotSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Interactive Grid of Plot Cards */}
              {displayedPlots.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                  {displayedPlots.map((p) => {
                    const isSelected = Number(p.id) === Number(selectedPlotId);
                    const isLocked = Number(p.owner_sale_locked) === 1;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlotId(Number(p.id))}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-50 border-[#006A4E] text-[#074f38] ring-2 ring-emerald-500/20 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-xs text-slate-900">
                              #{toBanglaDigits(p.dag_no, lang)}
                            </span>
                            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                              {p.land_type}
                            </span>
                          </div>
                          <div className="mt-1 font-bold text-xs text-[#006A4E]">
                            {toBanglaDigits(p.total_area_decimal, lang)} {t('শতক', 'Dec')}
                          </div>
                        </div>

                        <div className="mt-1.5 flex items-center justify-between text-[10px]">
                          {isLocked ? (
                            <span className="inline-flex items-center gap-0.5 font-bold text-red-600 text-[10px]">
                              <Lock className="w-2.5 h-2.5" />
                              <span>{t('লকড', 'Locked')}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 font-bold text-emerald-700 text-[10px]">
                              <Unlock className="w-2.5 h-2.5" />
                              <span>{t('উন্মুক্ত', 'Open')}</span>
                            </span>
                          )}
                          {isSelected && (
                            <span className="w-3.5 h-3.5 rounded-full bg-[#006A4E] text-white flex items-center justify-center shrink-0">
                              <Check className="w-2 h-2 stroke-[3]" />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p>{t('কোনো দাগ নম্বর খুঁজে পাওয়া যায়নি।', 'No plots matched search query.')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Pane: Selected Plot Profile & Instant Advance Button */}
          <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-16">
            {currentSelectedPlot && (
              <div className="panel p-3.5 sm:p-4 bg-gradient-to-br from-emerald-50/90 via-slate-50 to-white border border-emerald-200/80 rounded-xl shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#006A4E] text-white text-[11px] font-bold shadow-xs">
                      ১.৩
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {t('নির্বাচিত দাগের ডিজিটাল স্থিতি', 'Selected Plot Status')}
                      </h4>
                      <span className="text-[10px] text-slate-500">
                        {lang === 'bn' ? currentSelectedMouza?.mouza_bn : currentSelectedMouza?.mouza_en} • দাগ #{toBanglaDigits(currentSelectedPlot.dag_no, lang)}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-emerald-300 text-[10px] font-extrabold text-[#006A4E]">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{t('নির্বাচিত', 'Selected')}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-white rounded-lg border border-slate-200/70">
                    <span className="text-[10px] text-slate-500 block">{t('জমির শ্রেণী', 'Land Class')}</span>
                    <div className="font-bold text-slate-900 mt-0.5 truncate">{currentSelectedPlot.land_type}</div>
                  </div>

                  <div className="p-2 bg-white rounded-lg border border-slate-200/70">
                    <span className="text-[10px] text-slate-500 block">{t('মোট আয়তন', 'Total Area')}</span>
                    <div className="font-extrabold text-[#006A4E] mt-0.5 truncate">
                      {toBanglaDigits(currentSelectedPlot.total_area_decimal, lang)} {t('শতক', 'Dec')}
                    </div>
                  </div>

                  <div className="p-2 bg-white rounded-lg border border-slate-200/70">
                    <span className="text-[10px] text-slate-500 block">{t('কাঠা সমতুল্য', 'Katha Approx')}</span>
                    <div className="font-bold text-slate-700 mt-0.5 font-mono truncate">
                      ~{toBanglaDigits((Number(currentSelectedPlot.total_area_decimal) * 0.605).toFixed(1), lang)} {t('কাঠা', 'Katha')}
                    </div>
                  </div>

                  <div className="p-2 bg-white rounded-lg border border-slate-200/70">
                    <span className="text-[10px] text-slate-500 block">{t('বিক্রয় লক', 'Sale Lock')}</span>
                    <div className="mt-0.5">
                      {Number(currentSelectedPlot.owner_sale_locked) === 1 ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[11px] text-red-600">
                          <Lock className="w-3 h-3" />
                          <span>{t('লক সক্রিয়', 'LOCKED')}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-[11px] text-emerald-700">
                          <Unlock className="w-3 h-3" />
                          <span>{t('উন্মুক্ত', 'OPEN')}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Informative Guidance Box */}
                {Number(currentSelectedPlot.owner_sale_locked) === 1 ? (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-800 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="leading-snug">
                      <strong>{t('সতর্কবার্তা:', 'Warning:')}</strong>{' '}
                      {t(
                        'এই দাগে বিক্রয় লক চালু রয়েছে। লক না খুললে সাব-রেজিস্ট্রি অফিসে কোনো দলিল রেজিস্ট্রেশন হবে না।',
                        'Sale lock is active. Deed registration cannot proceed without biometric unlocking by owner.'
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="leading-snug">
                      <strong>{t('পরামর্শ:', 'Guidance:')}</strong>{' '}
                      {t(
                        'দাগটি লেনদেনের জন্য প্রস্তুত। বিক্রেতা ও ক্রয়ের পরিমাণ নির্দিষ্ট করতে পরবর্তী ধাপে যান।',
                        'Plot is open for transfer. Proceed to enter seller identity and proposed area.'
                      )}
                    </div>
                  </div>
                )}

                {/* Step 1 Advance Button */}
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full btn-primary text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer py-2.5 rounded-xl font-bold"
                >
                  <span>{t('পরবর্তী ধাপ (বিক্রেতা ও ক্রয়ের পরিমাণ) ➔', 'Next Step (Seller & Area) ➔')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 2: Enter Seller & Proposed Area (Cockpit Split View) */}
      {/* ======================================================== */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start animate-rise-delay">
          {/* Left Pane: Seller Selection & Proposed Area Input */}
          <div className="lg:col-span-7 space-y-3">
            {/* Selected Land Reminder Breadcrumb */}
            {currentSelectedPlot && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <div className="truncate">
                    <span className="font-bold text-emerald-900">
                      {t('নির্বাচিত:', 'Selected:')}{' '}
                    </span>
                    <span>
                      {lang === 'bn' ? currentSelectedMouza?.mouza_bn : currentSelectedMouza?.mouza_en} • দাগ #{toBanglaDigits(currentSelectedPlot.dag_no, lang)} ({toBanglaDigits(currentSelectedPlot.total_area_decimal, lang)} {t('শতক', 'Dec')})
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-emerald-800 hover:text-emerald-950 font-bold underline cursor-pointer text-[11px] shrink-0"
                >
                  {t('দাগ পরিবর্তন', 'Change')}
                </button>
              </div>
            )}

            {/* Sub-Step 2.1: Seller Identity Selection */}
            <div className="panel p-3.5 sm:p-4 bg-white border border-slate-200/80 rounded-xl shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#006A4E] text-white text-[11px] font-bold shadow-xs">
                    ২.১
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    {t('বিক্রেতা ও জাতীয় পরিচয়পত্র (NID)', 'Select Seller (with Verified NID)')}
                  </h3>
                </div>
              </div>

              {/* Seller Live Search Input */}
              <div className="relative">
                <input
                  type="text"
                  value={sellerSearchQuery}
                  onChange={(e) => setSellerSearchQuery(e.target.value)}
                  placeholder={t(
                    'বিক্রেতার নাম বা NID নম্বর লিখে খুঁজুন...',
                    'Search seller by name or NID...'
                  )}
                  className="field pl-8 font-semibold text-xs bg-[#F5FAF8] py-1.5"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                {sellerSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setSellerSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Seller Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                {filteredPersons.map((per) => {
                  const isSelected = Number(per.id) === Number(sellerId);
                  const isPrimaryOwner = per.id === 1;

                  return (
                    <button
                      key={per.id}
                      type="button"
                      onClick={() => setSellerId(Number(per.id))}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer relative flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-emerald-50 border-[#006A4E] text-slate-900 ring-2 ring-emerald-500/20 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-[#006A4E] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {per.name_bn ? per.name_bn.trim().charAt(0) : 'ব'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {lang === 'bn' ? per.name_bn : per.name_en}
                          </span>
                          {isPrimaryOwner && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                              {t('মালিক', 'Owner')}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                          NID: {per.nid_mock}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="w-3.5 h-3.5 rounded-full bg-[#006A4E] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2 h-2 stroke-[3]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Standard Dropdown Fallback */}
              <div>
                <select
                  value={sellerId}
                  onChange={(e) => setSellerId(Number(e.target.value))}
                  className="field font-semibold text-xs bg-slate-50 py-1.5"
                >
                  {persons.map((per) => (
                    <option key={per.id} value={per.id}>
                      {lang === 'bn' ? per.name_bn : per.name_en} — NID: {per.nid_mock}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sub-Step 2.2: Proposed Purchase Area */}
            <div className="panel p-3.5 sm:p-4 bg-white border border-slate-200/80 rounded-xl shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#006A4E] text-white text-[11px] font-bold shadow-xs">
                    ২.২
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    {t('প্রস্তাবিত ক্রয়ের পরিমাণ', 'Proposed Purchase Area')}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    {t('ক্রয়ের পরিমাণ (শতক / Decimal):', 'Purchase Area (Decimal):')}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={proposedArea}
                      onChange={(e) => setProposedArea(e.target.value)}
                      className="field font-extrabold text-sm pr-14 py-1.5"
                    />
                    <span className="absolute right-2.5 top-2 text-xs font-bold text-slate-500">
                      {t('শতক', 'Dec')}
                    </span>
                  </div>
                </div>

                {/* Quick Preset Buttons */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    {t('দ্রুত প্রিসেট:', 'Presets:')}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {['5', '10', '15'].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setProposedArea(amt)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition cursor-pointer ${
                          proposedArea === amt
                            ? 'bg-[#006A4E] text-white border-[#006A4E]'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        {toBanglaDigits(amt, lang)} {t('শতক', 'Dec')}
                      </button>
                    ))}
                    {totalPlotArea > 0 && (
                      <button
                        type="button"
                        onClick={() => setProposedArea(String(totalPlotArea))}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition cursor-pointer ${
                          proposedArea === String(totalPlotArea)
                            ? 'bg-[#006A4E] text-white border-[#006A4E]'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        {t('সব', 'All')} ({toBanglaDigits(totalPlotArea, lang)})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Pane: Area Math Gauge & Verification Summary */}
          <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-16">
            {/* Real-Time Land Area Math Visualizer */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>{t('মোট জমি:', 'Total Area:')} {toBanglaDigits(totalPlotArea, lang)} {t('শতক', 'Dec')}</span>
                <span className={isAreaExceeded ? 'text-red-600' : 'text-[#006A4E]'}>
                  {t('ক্রয়:', 'Buy:')} {toBanglaDigits(parsedProposedArea, lang)} ({toBanglaDigits(areaPercentage.toFixed(0), lang)}%)
                </span>
              </div>

              {/* Visual Proportion Bar */}
              <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-300 ${
                    isAreaExceeded ? 'bg-red-500' : 'bg-[#006A4E]'
                  }`}
                  style={{ width: `${Math.min(100, areaPercentage)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  {t('অবশিষ্ট থাকবে:', 'Remaining:')}{' '}
                  <strong>
                    {toBanglaDigits(Math.max(0, totalPlotArea - parsedProposedArea).toFixed(2), lang)} {t('শতক', 'Dec')}
                  </strong>
                </span>
                <span>
                  ~{toBanglaDigits((parsedProposedArea * 0.605).toFixed(1), lang)} {t('কাঠা', 'Katha')}
                </span>
              </div>

              {isAreaExceeded && (
                <div className="p-2 rounded-lg bg-red-100 text-red-800 text-xs font-bold flex items-center gap-1.5 mt-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>{t('সতর্কতা: ক্রয়ের পরিমাণ দাগের মোট আয়তনের বেশি!', 'Exceeds total plot area!')}</span>
                </div>
              )}
            </div>

            {/* Sub-Step 2.3: Pre-Verification Summary & Action */}
            <div className="panel p-3.5 sm:p-4 bg-gradient-to-br from-emerald-50/90 via-slate-50 to-white border border-emerald-200/80 rounded-xl shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#006A4E] text-white text-[11px] font-bold shadow-xs">
                    ২.৩
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    {t('যাচাইয়ের পূর্ববর্তী সারাংশ', 'Pre-Verification Summary')}
                  </h4>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">{t('দাগ ও এলাকা', 'Plot & Mouza')}</span>
                  <div className="font-bold text-slate-900 mt-0.5 truncate">
                    দাগ #{toBanglaDigits(currentSelectedPlot?.dag_no, lang)}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {lang === 'bn' ? currentSelectedMouza?.mouza_bn : currentSelectedMouza?.mouza_en}
                  </div>
                </div>

                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">{t('বিক্রেতা', 'Seller')}</span>
                  <div className="font-bold text-slate-900 mt-0.5 truncate">
                    {lang === 'bn' ? currentSeller?.name_bn : currentSeller?.name_en}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 truncate">
                    NID: {currentSeller?.nid_mock}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-ghost text-xs flex items-center gap-1 px-3 py-2 rounded-xl"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{t('পিছনে', 'Back')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => runVerification()}
                  disabled={loading || isAreaExceeded}
                  className="flex-1 btn-primary text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer py-2.5 rounded-xl font-bold"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>
                    {loading
                      ? t('যাচাই করা হচ্ছে...', 'Verifying...')
                      : t('যাচাই শুরু করুন ➔', 'Run Verification ➔')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 3: Result Hero Banner + Khatian Lineage Timeline   */}
      {/* ======================================================== */}
      {step === 3 && report && (
        <div className="space-y-6 animate-rise-delay">
          {/* Top Actions: Print / Official Verification Certificate */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep(1)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>{t('অন্য দাগ অনুসন্ধান', 'Check Another Plot')}</span>
              </button>
              <button
                onClick={() => setStep(2)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>{t('বিক্রেতা বা পরিমাণ পরিবর্তন', 'Edit Seller or Area')}</span>
              </button>
            </div>

            <button
              onClick={() => setShowCertModal(true)}
              className="btn-primary text-xs flex items-center gap-2 shadow-xs hover:bg-[#0A5549] cursor-pointer min-h-[38px] px-4 rounded-xl"
            >
              <FileBadge className="w-4 h-4" />
              <span>{t('ঝুঁকি মূল্যায়ন প্রিন্ট', 'Print Risk Assessment')}</span>
            </button>
          </div>

          {/* Verdict Banner */}
          <ResultHeroBanner report={report} />

          {/* Khatian Chain Lineage Timeline */}
          {report.khatian_chain && <KhatianChainTimeline chain={report.khatian_chain} />}

          {/* Active Mortgages & Deed History Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="panel p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
              <h3 className="text-base font-bold text-[#0A1F1C] mb-3 flex items-center gap-2">
                <Building className="w-4 h-4 text-[#006A4E]" />
                <span>{t('ব্যাংক মর্টগেজ / দায়বদ্ধতার তথ্য', 'Bank Mortgage & Lien Status')}</span>
              </h3>
              {report.active_mortgages && report.active_mortgages.length > 0 ? (
                <div className="space-y-2">
                  {report.active_mortgages.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-[#FFF0F1] border border-[#FF3B4A] text-xs space-y-1"
                    >
                      <div className="font-bold text-[#FF3B4A]">
                        ✖ {lang === 'bn' ? m.bank_name_bn : m.bank_name_en} ({m.branch_name})
                      </div>
                      <div className="font-semibold text-[#0A1F1C]">
                        {t('ঋণের পরিমাণ:', 'Loan Amount:')} ৳
                        {toBanglaDigits(m.loan_amount_bdt.toLocaleString(), lang)} ({m.status})
                      </div>
                      <div className="text-[10px] text-red-600 font-bold">
                        {t('সতর্কতা: ব্যাংক লিয়েন বিদ্যমান থাকায় জমি হস্তান্তর করা যাবে না।', 'Active lien prevents land transfer.')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#EDF7F4] text-[#006A4E] font-bold text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#006A4E] shrink-0" />
                  <span>{t('এই দাগে কোনো সক্রিয় ব্যাংক মর্টগেজ বা লিয়েন নেই।', 'No active bank mortgage found on this plot.')}</span>
                </div>
              )}
            </div>

            <div className="panel p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
              <h3 className="text-base font-bold text-[#0A1F1C] mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#006A4E]" />
                <span>{t('পূর্ববর্তী নিবন্ধিত দলিলের ইতিহাস (হ্যাশ লেজার)', 'Registered Deed History (Hash Ledger)')}</span>
              </h3>
              {report.deed_history && report.deed_history.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {report.deed_history.map((d) => (
                    <div key={d.id} className="p-3 rounded-xl bg-[#EDF7F4]/80 border border-[#006A4E]/12 text-xs">
                      <div className="flex justify-between font-bold text-[#0A1F1C]">
                        <span className="font-mono">{d.deed_no}</span>
                        <span
                          className={
                            d.is_tampered_demo
                              ? 'text-[#FF3B4A] font-bold'
                              : d.status === 'REGISTERED' || d.status === 'MUTATED'
                              ? 'text-[#006A4E] font-bold'
                              : 'text-[#C4891A] font-bold'
                          }
                        >
                          {d.is_tampered_demo ? '✖ অখণ্ডতা লঙ্ঘন (TAMPERED)' : d.status}
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
                <p className="text-xs text-[#5F7A74] p-4 bg-slate-50 rounded-xl">
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
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border-2 border-[#006A4E] space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCertModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#EDF7F4] hover:bg-[#E4EFEA] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between border-b-2 border-[#006A4E] pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#006A4E] text-xl font-black text-white shadow-xs">
                  ভূ
                </span>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#006A4E]">
                    {t('স্বাধীন ভূমি সুরক্ষা মূল্যায়ন', 'Independent BhumiShield Assessment')}
                  </div>
                  <h3 className="text-lg md:text-xl font-extrabold text-[#0A1F1C] mt-0.5">
                    {t('উপলব্ধ রেকর্ডের ঝুঁকি মূল্যায়ন', 'Available-Record Risk Assessment')}
                  </h3>
                  <p className="text-[11px] text-[#5F7A74]">
                    {t('অসংরক্ষিত মূল্যায়ন • প্রদর্শনের সময়:', 'Unsaved assessment • View generated at:')} {new Date().toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB')} •{' '}
                    {report.status === 'SAFE'
                      ? t('পরীক্ষিত রেকর্ডে রুল ঝুঁকি মেলেনি', 'No rule risk found in evaluated records')
                      : t('ঝুঁকি চিহ্নিত মূল্যায়ন কপি', 'Risk-Flagged Assessment Copy')}
                  </p>
                </div>
              </div>
            </div>

            {/* Verdict Box */}
            <div
              className={`p-4 rounded-xl text-white font-bold flex items-center justify-between ${
                report.status === 'SAFE'
                  ? 'bg-[#006A4E]'
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

            {/* Prototype Disclaimer Banner (F14) */}
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-[11px] text-amber-900">
              <strong>{t('নমুনা মূল্যায়ন সনদ:', 'DEMO / EVALUATION COPY:')}</strong>{' '}
              {t(
                'এই সনদটি ভূমি সুরক্ষা সিস্টেমের একটি স্বয়ংক্রিয় প্রাক-নিবন্ধন মূল্যায়ন এবং কোনো সরকারি কর্মকর্তার আইনি সিদ্ধান্তের বিকল্প নয়।',
                'This evaluation certificate is an automated pre-registration risk check and does not constitute a final legal title.'
              )}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-[#EDF7F4]/80 p-4 rounded-xl border border-[#006A4E]/12">
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
                <strong>{t('প্রস্তাবিত জমি:', 'Evaluated Area:')}</strong>{' '}
                {toBanglaDigits(proposedArea, lang)} {t('শতাংশ', 'Decimal')}
              </div>
              <div>
                <strong>{t('খতিয়ান চেইন অবস্থা:', 'Khatian Lineage:')}</strong>{' '}
                {report.status === 'SAFE' &&
                !report.findings?.some((f) => f.rule_code.includes('ANOMALY') || f.rule_code.includes('CHAIN')) ? (
                  <span className="text-[#006A4E] font-bold">{t('প্রযোজ্য উপলব্ধ জরিপ রেকর্ড মূল্যায়িত', 'Applicable available survey records evaluated')}</span>
                ) : (
                  <span className="text-[#FF3B4A] font-bold">
                    {t('⚠ চেইনে অসঙ্গতি বা পর্যবেক্ষণ রয়েছে', '⚠ Lineage Discrepancy Found')}
                  </span>
                )}
              </div>
            </div>

            {/* Next Step Box */}
            <div className="p-3.5 rounded-xl bg-[#EDF7F4] border border-[#006A4E] text-xs">
              <div className="font-extrabold text-[#006A4E]">
                {t('সুপারিশ ও পরবর্তী পদক্ষেপ:', 'Recommendation & Next Steps:')}
              </div>
              <div className="text-[#0A1F1C]/90 mt-1">
                {lang === 'bn' ? report.next_step_bn : report.next_step_en}
              </div>
            </div>

            <div className="text-[10px] text-[#5F7A74]/80 font-mono text-center">
              {t('সরকারি দলিল বা মালিকানার নিশ্চয়তা নয়', 'Not a government document or assurance of legal ownership')}
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
