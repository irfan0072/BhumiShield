import React, { useState, useEffect, useMemo } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi, RiskReportResponse } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { ResultHeroBanner } from '../components/ResultHeroBanner';
import { VelzonOverviewSection } from '../components/VelzonOverviewSection';
import {
  FileSpreadsheet,
  ShieldAlert,
  CheckCircle2,
  Calculator,
  ListChecks,
  KeyRound,
  Search,
  Printer,
  X,
  FileText,
  BadgeAlert,
  ArrowRight
} from 'lucide-react';

export const SubRegistrarPage: React.FC = () => {
  const { lang, role, setRole, setUser, setToken, t } = useAppUI();
  const [subTab, setSubTab] = useState<'wizard' | 'deeds' | 'fees'>('wizard');

  const [plots, setPlots] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [deedsList, setDeedsList] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  const [plotId, setPlotId] = useState<number>(1);
  const [sellerId, setSellerId] = useState<number>(1);
  const [buyerId, setBuyerId] = useState<number>(2);
  const [areaDecimal, setAreaDecimal] = useState<string>('10');
  const [shareFraction, setShareFraction] = useState<string>('1/2');
  const [declaredValue, setDeclaredValue] = useState<string>('1500000');

  const [preCheckReport, setPreCheckReport] = useState<RiskReportResponse | null>(null);
  const [createdDeedResult, setCreatedDeedResult] = useState<any | null>(null);
  const [feeBreakdown, setFeeBreakdown] = useState<any | null>(null);
  const [deedTypeFee, setDeedTypeFee] = useState('SALE');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Table filtering and search states
  const [deedSearch, setDeedSearch] = useState('');
  const [deedStatusFilter, setDeedStatusFilter] = useState<'ALL' | 'HELD' | 'REGISTERED' | 'PENDING_MUTATION' | 'REJECTED'>('ALL');

  // Printable Challan Modal
  const [showChallanModal, setShowChallanModal] = useState(false);

  const loadRegistrarData = () => {
    Promise.all([
      BhumiApi.getPlots(),
      BhumiApi.getPersons(),
      BhumiApi.listRegistrarDeeds(),
      BhumiApi.getStatsSummary(),
    ])
      .then(([plts, pers, dds, st]) => {
        setPlots(plts);
        setPersons(pers);
        setDeedsList(dds);
        setStats(st);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadRegistrarData();
    BhumiApi.calculateFees(1500000, 'SALE')
      .then((res) => setFeeBreakdown(res))
      .catch(() => {});
  }, []);

  const switchToRegistrarRole = async () => {
    const res = await BhumiApi.switchDemoRole('sub_registrar');
    if (res?.access_token && res?.user) {
      setToken(res.access_token);
      setUser(res.user);
    } else {
      setRole('sub_registrar');
    }
  };

  const selectedPlot = plots.find((p) => Number(p.id) === Number(plotId));
  const selectedSeller = persons.find((p) => Number(p.id) === Number(sellerId));
  const selectedBuyer = persons.find((p) => Number(p.id) === Number(buyerId));

  const handleRunPreCheck = async () => {
    setLoading(true);
    setCreatedDeedResult(null);
    try {
      const [rep, fees] = await Promise.all([
        BhumiApi.checkBeforeBuy({
          plot_id: Number(plotId),
          seller_id: Number(sellerId),
          seller_nid: selectedSeller?.nid_mock,
          proposed_area_decimal: Number(areaDecimal),
          deed_type: 'SALE',
        }),
        BhumiApi.calculateFees(Number(declaredValue) || 1000000, 'SALE'),
      ]);
      setPreCheckReport(rep);
      setFeeBreakdown(fees);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterDeed = async () => {
    setLoading(true);
    try {
      const res = await BhumiApi.createDeed({
        deed_type: 'SALE',
        plot_id: Number(plotId),
        seller_id: Number(sellerId),
        buyer_id: Number(buyerId),
        area_decimal: Number(areaDecimal),
        share_fraction: shareFraction,
        declared_value_bdt: Number(declaredValue),
      });
      setCreatedDeedResult(res);
      loadRegistrarData();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDeedStatus = async (
    deedId: number,
    newStatus: 'REGISTERED' | 'HELD' | 'REJECTED'
  ) => {
    setStatusMsg('');
    try {
      const res = await BhumiApi.updateRegistrarDeedStatus(deedId, {
        status: newStatus,
        officer_note:
          newStatus === 'REGISTERED'
            ? 'সাব-রেজিস্ট্রার কর্তৃক শুনানি শেষে অনুমোদিত ও ই-মিউটেশনে প্রেরিত'
            : 'সাব-রেজিস্ট্রার কর্তৃক জালিয়াতি ঝুঁকির কারণে বাতিল',
      });
      setStatusMsg(lang === 'bn' ? res.message_bn : res.message_en);
      loadRegistrarData();
    } catch {
      setStatusMsg(t('স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে।', 'Failed to update deed status.'));
    }
  };

  const handleCalculateCustomFee = async () => {
    const res = await BhumiApi.calculateFees(Number(declaredValue) || 1000000, deedTypeFee);
    setFeeBreakdown(res);
  };

  // Filtered deeds
  const filteredDeeds = useMemo(() => {
    return deedsList.filter((d) => {
      const matchesFilter =
        deedStatusFilter === 'ALL'
          ? true
          : deedStatusFilter === 'REGISTERED'
          ? d.status === 'REGISTERED' || d.status === 'MUTATED'
          : d.status === deedStatusFilter;

      if (!matchesFilter) return false;

      if (!deedSearch.trim()) return true;
      const q = deedSearch.toLowerCase();
      return (
        d.deed_no?.toLowerCase().includes(q) ||
        d.dag_no?.toString().includes(q) ||
        d.mouza_bn?.toLowerCase().includes(q) ||
        d.mouza_en?.toLowerCase().includes(q) ||
        d.seller_name_bn?.toLowerCase().includes(q) ||
        d.buyer_name_bn?.toLowerCase().includes(q)
      );
    });
  }, [deedsList, deedStatusFilter, deedSearch]);

  const gatekeeperRules = [
    { id: 1, title_bn: 'বিক্রেতার NID ও ওয়ারিশ তথ্য যাচাই', title_en: 'Seller NID & Heir Identity Check' },
    { id: 2, title_bn: 'সিএস → এসএ → আরএস → বিএস খতিয়ান চেইন', title_en: 'CS -> SA -> RS -> BS Lineage' },
    { id: 3, title_bn: 'খতিয়ানে বিক্রেতার অনুমোদিত প্রাপ্য অংশ', title_en: 'Seller Share Balance Calculation' },
    { id: 4, title_bn: 'ব্যাংক লিয়েন ও বন্ধক মুক্ততা (NOC)', title_en: 'Mortgage Lien & Clearance Check' },
    { id: 5, title_bn: 'আদালতের দেওয়ানি নিষেধাজ্ঞা অনুপস্থিতি', title_en: 'Civil Court Injunction Check' },
    { id: 6, title_bn: 'নাগরিক ডিজিটাল বিক্রয় লক (Sale Lock)', title_en: 'Citizen Biometric Sale Lock Status' },
    { id: 7, title_bn: 'অর্পিত ও খাস সরকারি জমি বহির্ভূত যাচাই', title_en: 'Vested / Khas Property Filter' },
    { id: 8, title_bn: 'মাঠ জরিপের সাথে খতিয়ানের জমির মিল', title_en: 'Survey Field Area Discrepancy Check' },
    { id: 9, title_bn: 'একই দিনে ডুপ্লিকেট রেজিস্ট্রি রোধ', title_en: 'Duplicate Same-Day Filing Prevention' },
    { id: 10, title_bn: 'সাব-রেজিস্ট্রার Ed25519 স্বাক্ষর প্রস্তুতি', title_en: 'Ed25519 Sub-Registrar Signing Prep' },
    { id: 11, title_bn: 'সরকারি রাজস্ব ও স্ট্যাম্প শুল্ক নিরীক্ষা', title_en: 'Treasury Challan & Tax Compliance' },
  ];

  return (
    <div className="space-y-6">
      <header className="page-intro animate-rise">
        <h1>{t('সাব-রেজিস্ট্রার কনসোল', 'Sub-Registrar Console')}</h1>
        <p>{t('প্রাক-নিবন্ধন গেটকিপার, হোল্ড কিউ ও স্ট্যাম্প শুল্ক — দাপ্তরিক দলিল নিয়ন্ত্রণ।', 'Pre-registration gatekeeper, hold queue, and stamp fees — official deed control.')}</p>
      </header>
      {/* RBAC Guard Notice if not logged in as sub_registrar or admin */}
      {role !== 'sub_registrar' && role !== 'admin' && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0A1F1C]">
            <KeyRound className="w-4 h-4 text-[#C4891A]" />
            <span>
              {t(
                'দাপ্তরিক অ্যাক্সেস নোটিউট: সাব-রেজিস্ট্রার কন্ট্রোল পূর্ণাঙ্গভাবে ব্যবহার করতে সাব-রেজিস্ট্রার সেশনে প্রবেশ করুন।',
                'Access Notice: Switch to the Sub-Registrar Officer session to execute deeds and release held records.'
              )}
            </span>
          </div>
          <button
            onClick={switchToRegistrarRole}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#062823] hover:bg-[#041A1C] text-white font-bold text-xs cursor-pointer min-h-[36px] transition-colors"
          >
            {t('সাব-রেজিস্ট্রার প্যানেলে প্রবেশ করুন →', 'Activate Sub-Registrar Session →')}
          </button>
        </div>
      )}

      {/* Registry overview */}
      <VelzonOverviewSection
        role="sub_registrar"
        stats={stats}
        onQuickAction={() => setSubTab('deeds')}
      />

      {/* Operational Controlling Card */}
      <div className="panel p-6 space-y-6 animate-rise-delay">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#0D6B5C]/10 pb-4">
          <div>
            <h2 className="font-display text-lg md:text-xl text-[#062823] flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#0D6B5C]" />
              <span>
                {t(
                  'সাব-রেজিস্ট্রার প্রাক-নিবন্ধন গেটকিপার ও দলিল রেজিস্টার কন্ট্রোল',
                  'Pre-Registration Gatekeeper, Deed Control & Stamp Duty Calculator'
                )}
              </span>
            </h2>
            <p className="text-xs text-[#5F7A74] mt-0.5">
              {t(
                'দলিল সম্পাদনের পূর্বে ১১টি রুল পরীক্ষা, স্থগিত দলিল (HELD) শুনানি নিষ্পত্তি এবং সরকারি রাজস্ব হিসাব:',
                'Run 11 pre-registration fraud checks, manage HELD deeds, and calculate government fees:'
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSubTab('wizard')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[38px] transition-colors ${
                subTab === 'wizard'
                  ? 'bg-[#0D6B5C] text-white shadow-xs'
                  : 'bg-[#EDF4F1] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{t('নতুন দলিল ও প্রাক-যাচাই', 'Pre-Reg Gatekeeper')}</span>
            </button>
            <button
              onClick={() => setSubTab('deeds')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[38px] transition-colors ${
                subTab === 'deeds'
                  ? 'bg-[#0D6B5C] text-white shadow-xs'
                  : 'bg-[#EDF4F1] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              <span>
                {t('দলিল রেজিস্টার ও হোল্ড কন্ট্রোল', 'Deed Registry & Hold Queue')} (
                {toBanglaDigits(deedsList.length, lang)})
              </span>
            </button>
            <button
              onClick={() => setSubTab('fees')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[38px] transition-colors ${
                subTab === 'fees'
                  ? 'bg-[#0D6B5C] text-white shadow-xs'
                  : 'bg-[#EDF4F1] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>{t('সরকারি শুল্ক ও ফি ক্যালকুলেটর', 'Stamp & Fee Calculator')}</span>
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className="p-4 rounded-xl bg-[#E8F5F1] border-l-4 border-[#0D6B5C] text-[#0D6B5C] font-bold text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* TAB 1: New Deed Pre-Registration Wizard */}
        {subTab === 'wizard' && (
          <div className="space-y-6">
            {/* Form Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">
                  {t('দাগ নম্বর (Plot / Dag):', 'Plot / Dag No:')}
                </label>
                <select
                  value={plotId}
                  onChange={(e) => setPlotId(Number(e.target.value))}
                  className="field text-xs font-semibold bg-[#F5FAF8]"
                >
                  {plots.slice(0, 25).map((p) => (
                    <option key={p.id} value={p.id}>
                      {lang === 'bn' ? p.mouza_bn : p.mouza_en} — {t('দাগ', 'Dag')} {p.dag_no} (
                      {p.total_area_decimal} dec)
                      {Number(p.owner_sale_locked) === 1 ? ' [🔒 LOCKED]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">
                  {t('বিক্রেতা (Seller + NID):', 'Seller (with NID):')}
                </label>
                <select
                  value={sellerId}
                  onChange={(e) => setSellerId(Number(e.target.value))}
                  className="field text-xs font-semibold bg-[#F5FAF8]"
                >
                  {persons.slice(0, 15).map((per) => (
                    <option key={per.id} value={per.id}>
                      {lang === 'bn' ? per.name_bn : per.name_en} ({per.nid_mock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">
                  {t('ক্রেতা (Buyer + NID):', 'Buyer (with NID):')}
                </label>
                <select
                  value={buyerId}
                  onChange={(e) => setBuyerId(Number(e.target.value))}
                  className="field text-xs font-semibold bg-[#F5FAF8]"
                >
                  {persons.slice(0, 15).map((per) => (
                    <option key={per.id} value={per.id}>
                      {lang === 'bn' ? per.name_bn : per.name_en} ({per.nid_mock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">
                  {t('হস্তান্তরিত জমি (শতাংশ):', 'Transfer Area (Decimal):')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={areaDecimal}
                  onChange={(e) => setAreaDecimal(e.target.value)}
                  className="field text-xs font-bold"
                />
              </div>

              <div>
                <label className="label">
                  {t('অংশের ভগ্নাংশ (Share Fraction):', 'Share Fraction:')}
                </label>
                <input
                  type="text"
                  value={shareFraction}
                  onChange={(e) => setShareFraction(e.target.value)}
                  className="field font-mono text-xs"
                />
              </div>

              <div>
                <label className="label">
                  {t('দলিলের ঘোষিত মূল্য (টাকা):', 'Declared Value (BDT):')}
                </label>
                <input
                  type="number"
                  value={declaredValue}
                  onChange={(e) => setDeclaredValue(e.target.value)}
                  className="field text-xs font-bold"
                />
              </div>
            </div>

            {/* Quick Context Summary Box */}
            <div className="p-3.5 bg-[#EDF4F1]/80 rounded-xl border border-[#0D6B5C]/12 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0A1F1C]/90">{t('নির্বাচিত প্লট:', 'Selected Plot:')}</span>
                <span className="px-2 py-0.5 rounded bg-white border border-[#0D6B5C]/20 font-bold text-[#0A1F1C]">
                  {lang === 'bn' ? selectedPlot?.mouza_bn : selectedPlot?.mouza_en || 'ধানমন্ডি'} • {t('দাগ', 'Dag')} {selectedPlot?.dag_no || '101'}
                </span>
                {Number(selectedPlot?.owner_sale_locked) === 1 && (
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                    🔒 {t('নাগরিক লক সক্রিয়', 'Sale Lock Active')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#5F7A74]">{t('বিক্রেতা:', 'Seller:')}</span>
                <span className="font-bold text-[#0A1F1C]">{selectedSeller?.name_bn || 'বিক্রেতা'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#5F7A74]/80" />
                <span className="text-[#5F7A74]">{t('ক্রেতা:', 'Buyer:')}</span>
                <span className="font-bold text-[#0A1F1C]">{selectedBuyer?.name_bn || 'ক্রেতা'}</span>
              </div>
            </div>

            {/* Gatekeeper 11-Rule Preview Checklist */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-[#0A1F1C]/90 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#0D6B5C]" />
                <span>{t('স্বয়ংক্রিয় ১১টি গেটকিপার রুলস ইঞ্জিন:', 'Automated 11-Rule Gatekeeper Engine:')}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
                {gatekeeperRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-2.5 rounded-lg border border-[#0D6B5C]/12 bg-white flex items-center gap-2 text-[#0A1F1C]/90"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#E8F5F1] text-[#0D6B5C] font-bold text-[10px] flex items-center justify-center shrink-0">
                      {rule.id}
                    </span>
                    <span className="font-medium truncate">
                      {lang === 'bn' ? rule.title_bn : rule.title_en}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={handleRunPreCheck}
                disabled={loading}
                className="btn-primary text-xs cursor-pointer min-h-[42px] shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ShieldAlert className="w-4 h-4" />
                )}
                <span>{t('১. নিবন্ধন-পূর্ব ঝুঁকি ও ফি পরীক্ষা করুন', '1. Run Pre-Registration Risk & Fee Check')}</span>
              </button>

              <button
                onClick={handleRegisterDeed}
                disabled={loading}
                className="px-5 py-2.5 rounded-lg bg-[#062823] hover:bg-[#041A1C] text-white text-xs font-extrabold cursor-pointer min-h-[42px] shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                <span>
                  {t(
                    '২. লেজারে দলিল নিবন্ধন ও Ed25519 স্বাক্ষর',
                    '2. Register Deed in Hash Ledger & Sign'
                  )}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Deed Registry & Hold / Release Control Table */}
        {subTab === 'deeds' && (
          <div className="space-y-4">
            {/* Search and Status Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#EDF4F1]/80 p-3 rounded-xl border border-[#0D6B5C]/12">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-[#5F7A74]/80 absolute left-3 top-3" />
                <input
                  type="text"
                  value={deedSearch}
                  onChange={(e) => setDeedSearch(e.target.value)}
                  placeholder={t('দলিল নং, দাগ বা নাম খুঁজুন...', 'Search deed, dag or party...')}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#0D6B5C]/20 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6B5C]/30"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(['ALL', 'HELD', 'REGISTERED', 'PENDING_MUTATION', 'REJECTED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setDeedStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer min-h-[32px] ${
                      deedStatusFilter === st
                        ? 'bg-[#0D6B5C] text-white shadow-xs'
                        : 'bg-white text-[#5F7A74] border border-[#0D6B5C]/12 hover:bg-[#EDF4F1]'
                    }`}
                  >
                    {st === 'ALL'
                      ? t('সকল (All)', 'All')
                      : st === 'HELD'
                      ? t('স্থগিত (HELD)', 'Held')
                      : st === 'REGISTERED'
                      ? t('নিবন্ধিত (REGISTERED)', 'Registered')
                      : st === 'PENDING_MUTATION'
                      ? t('পেন্ডিং মিউটেশন', 'Pending Mutation')
                      : t('বাতিল (REJECTED)', 'Rejected')}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-[#0D6B5C]/12">
              <table className="table-modern text-xs">
                <thead>
                  <tr className="">
                    <th className="py-3 px-3 font-bold">{t('দলিল নং', 'Deed ID')}</th>
                    <th className="py-3 px-3 font-bold">{t('মৌজা ও দাগ', 'Mouza & Dag')}</th>
                    <th className="py-3 px-3 font-bold">{t('বিক্রেতা → ক্রেতা', 'Parties')}</th>
                    <th className="py-3 px-3 font-bold">{t('পরিমাণ ও মূল্য', 'Area & Price')}</th>
                    <th className="py-3 px-3 font-bold">{t('স্ট্যাটাস', 'Status')}</th>
                    <th className="py-3 px-3 font-bold text-right">
                      {t('দাপ্তরিক সিদ্ধান্ত', 'Officer Action')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0D6B5C]/10 bg-white">
                  {filteredDeeds.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#5F7A74]">
                        {t('কোনো দলিল পাওয়া যায়নি।', 'No deeds found matching criteria.')}
                      </td>
                    </tr>
                  ) : (
                    filteredDeeds.map((d) => (
                      <tr key={d.id} className="hover:bg-[#EDF4F1]/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-[#062823]">
                          <div>{d.deed_no}</div>
                          <div className="text-[10px] text-[#5F7A74]/80 font-sans">
                            Block #{d.chain_index} • {d.deed_type || 'SAF_KABALA'}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#0A1F1C]/90">
                          {lang === 'bn' ? d.mouza_bn : d.mouza_en} — {t('দাগ', 'Dag')} {d.dag_no}
                        </td>
                        <td className="py-3 px-3 text-[#5F7A74]">
                          <div>
                            <span className="text-[#5F7A74]/80 text-[10px] mr-1">{t('বিক্রেতা:', 'From:')}</span>
                            {d.seller_name_bn}
                          </div>
                          <div>
                            <span className="text-[#5F7A74]/80 text-[10px] mr-1">{t('ক্রেতা:', 'To:')}</span>
                            <strong>{d.buyer_name_bn}</strong>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#0A1F1C]/90">
                          <div>{toBanglaDigits(d.area_decimal, lang)} {t('শতাংশ', 'dec')}</div>
                          <div className="text-[11px] text-[#5F7A74] font-mono">
                            ৳{Number(d.price_bdt || 0).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold inline-block ${
                              d.status === 'HELD'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : d.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex gap-1.5">
                            {d.status !== 'PENDING_MUTATION' && d.status !== 'MUTATED' && (
                              <button
                                onClick={() => handleUpdateDeedStatus(d.id, 'REGISTERED')}
                                className="px-2.5 py-1 rounded bg-[#0D6B5C] hover:bg-[#0A5549] text-white font-bold text-[11px] cursor-pointer min-h-[30px] transition-colors"
                              >
                                ✔ {t('রিলিজ', 'Release')}
                              </button>
                            )}
                            {d.status !== 'REJECTED' && (
                              <button
                                onClick={() => handleUpdateDeedStatus(d.id, 'REJECTED')}
                                className="px-2.5 py-1 rounded bg-[#FF3B4A] hover:bg-[#E02E3C] text-white font-bold text-[11px] cursor-pointer min-h-[30px] transition-colors"
                              >
                                ✖ {t('বাতিল', 'Reject')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Official Stamp Duty & Registration Fee Calculator */}
        {subTab === 'fees' && feeBreakdown && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">
                  {t('দলিলের ধরন (Deed Type):', 'Deed Type:')}
                </label>
                <select
                  value={deedTypeFee}
                  onChange={(e) => setDeedTypeFee(e.target.value)}
                  className="field text-xs font-semibold bg-[#F5FAF8]"
                >
                  <option value="SALE">{t('সাফ কবলা (Sale Deed)', 'Sale Deed (Saf Kabala)')}</option>
                  <option value="HIBA">{t('হেবা ঘোষণা (Hiba / Family Gift)', 'Hiba (Family Gift)')}</option>
                  <option value="MORTGAGE">{t('ব্যাংক মর্টগেজ দলিল', 'Bank Mortgage Deed')}</option>
                </select>
              </div>
              <div>
                <label className="label">
                  {t('জমির বাজার মূল্য (টাকা):', 'Declared Market Value (BDT):')}
                </label>
                <input
                  type="number"
                  value={declaredValue}
                  onChange={(e) => setDeclaredValue(e.target.value)}
                  className="field text-xs font-bold"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={handleCalculateCustomFee}
                  className="flex-1 py-2.5 rounded-lg bg-[#0D6B5C] hover:bg-[#0A5549] text-white text-xs font-extrabold cursor-pointer min-h-[40px] shadow-sm transition-colors"
                >
                  {t('ফি হিসাব করুন', 'Calculate Official Fees')}
                </button>
                <button
                  onClick={() => setShowChallanModal(true)}
                  className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer min-h-[40px] flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t('চালান প্রিভিউ', 'Treasury Challan')}</span>
                </button>
              </div>
            </div>

            {/* Fee Breakdown Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
              <div className="p-4 rounded-xl bg-[#EDF4F1]/80 border border-[#0D6B5C]/12">
                <div className="text-[11px] text-[#5F7A74]">{t('স্ট্যাম্প শুল্ক (১.৫%)', 'Stamp Duty (1.5%)')}</div>
                <div className="text-base font-extrabold text-[#0A1F1C] mt-1">
                  ৳{toBanglaDigits(feeBreakdown.breakdown.stamp_duty_bdt.toLocaleString(), lang)}
                </div>
                <div className="text-[10px] text-[#5F7A74]/80 mt-1">কোড: 1-1101-0025-2671</div>
              </div>
              <div className="p-4 rounded-xl bg-[#EDF4F1]/80 border border-[#0D6B5C]/12">
                <div className="text-[11px] text-[#5F7A74]">{t('রেজিস্ট্রেশন ফি (১%)', 'Registration Fee (1%)')}</div>
                <div className="text-base font-extrabold text-[#0A1F1C] mt-1">
                  ৳{toBanglaDigits(feeBreakdown.breakdown.registration_fee_bdt.toLocaleString(), lang)}
                </div>
                <div className="text-[10px] text-[#5F7A74]/80 mt-1">কোড: 1-2101-0001-1801</div>
              </div>
              <div className="p-4 rounded-xl bg-[#EDF4F1]/80 border border-[#0D6B5C]/12">
                <div className="text-[11px] text-[#5F7A74]">{t('স্থানীয় সরকার কর (৩%)', 'Local Govt Tax (3%)')}</div>
                <div className="text-base font-extrabold text-[#0A1F1C] mt-1">
                  ৳{toBanglaDigits(feeBreakdown.breakdown.local_govt_tax_bdt.toLocaleString(), lang)}
                </div>
                <div className="text-[10px] text-[#5F7A74]/80 mt-1">উপজেলা / পৌরসভা তহবিল</div>
              </div>
              <div className="p-4 rounded-xl bg-[#EDF4F1]/80 border border-[#0D6B5C]/12">
                <div className="text-[11px] text-[#5F7A74]">{t('উৎস কর / গেইন ট্যাক্স (২%)', 'Capital Gain AIT (2%)')}</div>
                <div className="text-base font-extrabold text-[#0A1F1C] mt-1">
                  ৳{toBanglaDigits(feeBreakdown.breakdown.ait_gain_tax_bdt.toLocaleString(), lang)}
                </div>
                <div className="text-[10px] text-[#5F7A74]/80 mt-1">জাতীয় রাজস্ব বোর্ড (NBR)</div>
              </div>
              <div className="p-4 rounded-xl bg-[#E8F5F1] border-2 border-[#0D6B5C]">
                <div className="text-[11px] font-bold text-[#0D6B5C]">{t('সর্বমোট সরকারি ফি', 'Total Payable Fee')}</div>
                <div className="text-lg font-extrabold text-[#0D6B5C] mt-1">
                  ৳{toBanglaDigits(feeBreakdown.total_payable_bdt.toLocaleString(), lang)}
                </div>
                <div className="text-[10px] text-[#0D6B5C]/80 mt-1 font-bold">ই-চালান যোগ্য</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {preCheckReport && subTab === 'wizard' && <ResultHeroBanner report={preCheckReport} />}

      {createdDeedResult && (
        <div
          className={`p-6 rounded-xl border-2 ${
            createdDeedResult.deed.status === 'REGISTERED'
              ? 'bg-[#E8F5F1] border-[#0D6B5C]'
              : 'bg-[#FFF0F1] border-[#FF3B4A]'
          }`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-extrabold text-lg">
                {createdDeedResult.deed.status === 'REGISTERED' ? (
                  <CheckCircle2 className="w-6 h-6 text-[#0D6B5C]" />
                ) : (
                  <ShieldAlert className="w-6 h-6 text-[#FF3B4A]" />
                )}
                <span>
                  {lang === 'bn' ? createdDeedResult.message_bn : createdDeedResult.message_en}
                </span>
              </div>
              <p className="font-mono text-xs">
                <strong>Deed No:</strong> {createdDeedResult.deed.deed_no} |{' '}
                <strong>Status:</strong> {createdDeedResult.deed.status} |{' '}
                <strong>Chain Block:</strong> #{createdDeedResult.deed.chain_index}
              </p>
              <p className="font-mono text-[11px] break-all text-[#5F7A74]">
                <strong>SHA-256 Hash:</strong> {createdDeedResult.deed.content_hash}
              </p>
            </div>

            {createdDeedResult.qr_data_uri && (
              <div className="bg-white p-2 rounded-xl border border-[#0D6B5C]/20 shrink-0">
                <img
                  src={createdDeedResult.qr_data_uri}
                  alt="Deed QR"
                  className="w-24 h-24"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printable Treasury Fee Challan Modal */}
      {showChallanModal && feeBreakdown && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl relative my-8 border border-[#0D6B5C]/12">
            <div className="flex items-center justify-between border-b pb-3 mb-4 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0D6B5C]" />
                <h3 className="font-extrabold text-[#0A1F1C] text-sm">
                  {t('সরকারি রাজস্ব চালান ফরম (টিআর ফরম নং ৭)', 'Treasury Challan Form (TR Form 7)')}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-lg bg-[#0D6B5C] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t('প্রিন্ট চালান', 'Print Challan')}</span>
                </button>
                <button
                  onClick={() => setShowChallanModal(false)}
                  className="p-1.5 rounded-lg text-[#5F7A74]/80 hover:text-[#5F7A74] hover:bg-[#EDF4F1] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 border-2 border-[#0D6B5C]/20 rounded-xl space-y-4 text-xs text-[#0A1F1C]">
              <div className="text-center border-b pb-3 space-y-0.5">
                <p className="font-bold text-[#0A1F1C]">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</p>
                <p className="font-extrabold text-[#0D6B5C]">ভূমি নিবন্ধন ও রাজস্ব জমা চালান</p>
                <p className="text-[10px] text-[#5F7A74] font-mono">
                  CHALLAN ID: BHM-CHLN-{Date.now().toString().slice(-8)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>দলিলের ঘোষিত মূল্য: <strong>৳{Number(declaredValue).toLocaleString()}</strong></div>
                <div>দলিলের ধরন: <strong>{deedTypeFee}</strong></div>
                <div>অর্থনৈতিক কোড: <strong>1-1101-0025-2671</strong></div>
                <div>চালানের উৎস: <strong>ভূমি সুরক্ষা সাব-রেজিস্ট্রি</strong></div>
              </div>

              <table className="w-full border-collapse text-[11px] border border-[#0D6B5C]/12">
                <thead>
                  <tr className="bg-[#EDF4F1]/80 border-b border-[#0D6B5C]/12">
                    <th className="p-2 text-left">ফি/শুল্কের খাত</th>
                    <th className="p-2 text-right">হার</th>
                    <th className="p-2 text-right">পরিমাণ (টাকা)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0D6B5C]/10">
                  <tr>
                    <td className="p-2">স্ট্যাম্প শুল্ক (Stamp Duty)</td>
                    <td className="p-2 text-right">১.৫%</td>
                    <td className="p-2 text-right font-mono font-bold">
                      ৳{feeBreakdown.breakdown.stamp_duty_bdt.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2">রেজিস্ট্রেশন ফি (Registration Fee)</td>
                    <td className="p-2 text-right">১.০%</td>
                    <td className="p-2 text-right font-mono font-bold">
                      ৳{feeBreakdown.breakdown.registration_fee_bdt.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2">স্থানীয় সরকার কর (Local Govt Tax)</td>
                    <td className="p-2 text-right">৩.০%</td>
                    <td className="p-2 text-right font-mono font-bold">
                      ৳{feeBreakdown.breakdown.local_govt_tax_bdt.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2">উৎস কর / এআইটি (Capital Gain Tax)</td>
                    <td className="p-2 text-right">২.০%</td>
                    <td className="p-2 text-right font-mono font-bold">
                      ৳{feeBreakdown.breakdown.ait_gain_tax_bdt.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="bg-[#E8F5F1] font-bold text-[#0D6B5C]">
                    <td className="p-2" colSpan={2}>সর্বমোট প্রদেয় সরকারি রাজস্ব:</td>
                    <td className="p-2 text-right font-mono text-sm">
                      ৳{feeBreakdown.total_payable_bdt.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-between items-end pt-4 border-t text-[10px] text-[#5F7A74]">
                <div>
                  <p>জমাদানকারী ব্যাংক: বাংলাদেশ ব্যাংক / সোনালী ব্যাংক</p>
                  <p>স্বয়ংক্রিয় ই-চালান সিস্টেম দ্বারা যাচাইকৃত</p>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-[#0D6B5C]">[Digital Treasury Seal]</div>
                  <p>সাব-রেজিস্ট্রার কার্যালয়</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
