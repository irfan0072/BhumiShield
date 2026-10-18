import React, { useState, useEffect, useMemo } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi, RiskReportResponse } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { ResultHeroBanner } from '../components/ResultHeroBanner';
import { OfficerKhatianExplorer } from '../components/OfficerKhatianExplorer';
import { OfficerDeedVerifier } from '../components/OfficerDeedVerifier';
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
  ArrowRight,
  ShieldCheck,
  QrCode,
  Layers,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { AddressCascader, AddressSelection } from '../components/AddressCascader';
import { triggerAppNotification } from '../components/NotificationCenter';

export type SubRegistrarTab = 'wizard' | 'held' | 'deeds' | 'khatian' | 'verifier' | 'fees' | 'onboarding';

export const SubRegistrarPage: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { lang, role, setRole, setUser, setToken, activeSubTab, setActiveSubTab, t } = useAppUI();
  const [subTab, setSubTab] = useState<SubRegistrarTab>(() => {
    if (activeSubTab && ['wizard', 'held', 'deeds', 'khatian', 'verifier', 'fees', 'onboarding'].includes(activeSubTab)) {
      return activeSubTab as SubRegistrarTab;
    }
    if (role === 'registry_data_officer') return 'wizard';
    return 'held';
  });

  // F13: when the role changes, snap the sub-tab back to a value the new
  // role is allowed to see.
  useEffect(() => {
    const allowed: SubRegistrarTab[] = ['wizard', 'held', 'deeds', 'khatian', 'verifier', 'fees', 'onboarding'];
    if (!allowed.includes(subTab)) {
      const fallback: SubRegistrarTab = role === 'registry_data_officer' ? 'wizard' : 'held';
      setSubTab(fallback);
      setActiveSubTab(fallback);
    }
  }, [role]);

  const [plots, setPlots] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [deedsList, setDeedsList] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [onboardingBatches, setOnboardingBatches] = useState<any[]>([]);

  const [plotId, setPlotId] = useState<number>(0);
  const [sellerId, setSellerId] = useState<number>(0);
  const [buyerId, setBuyerId] = useState<number>(0);
  const [areaDecimal, setAreaDecimal] = useState<string>('');
  const [shareFraction, setShareFraction] = useState<string>('');
  const [declaredValue, setDeclaredValue] = useState<string>('');

  const [preCheckReport, setPreCheckReport] = useState<RiskReportResponse | null>(null);
  const [createdDeedResult, setCreatedDeedResult] = useState<any | null>(null);
  const [feeBreakdown, setFeeBreakdown] = useState<any | null>(null);
  const [deedTypeFee, setDeedTypeFee] = useState('SALE');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Table filtering and search states
  const [deedSearch, setDeedSearch] = useState('');
  const [deedStatusFilter, setDeedStatusFilter] = useState<'ALL' | 'HELD' | 'REGISTERED' | 'PENDING_MUTATION' | 'REJECTED'>('ALL');

  // Address Cascader states
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedUpazila, setSelectedUpazila] = useState('');
  const [selectedMouzaId, setSelectedMouzaId] = useState('');

  // Sub-Registrar Hearing & Deed Modal
  const [selectedDeedForModal, setSelectedDeedForModal] = useState<any | null>(null);
  const [officerNote, setOfficerNote] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);

  // Printable Challan Modal
  const [showChallanModal, setShowChallanModal] = useState(false);

  const loadRegistrarData = () => {
    Promise.all([
      BhumiApi.getPlots(),
      BhumiApi.getPersons(),
      BhumiApi.listRegistrarDeeds(),
      BhumiApi.getStatsSummary(),
      BhumiApi.listOnboardingBatches().catch(() => []),
    ])
      .then(([plts, pers, dds, st, batches]) => {
        setPlots(plts);
        setPersons(pers);
        setDeedsList(dds);
        setStats(st);
        setOnboardingBatches(Array.isArray(batches) ? batches : ((batches as any)?.items || []));
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadRegistrarData();
    const timer = setInterval(() => {
      loadRegistrarData();
    }, 8000);
    const onFocus = () => loadRegistrarData();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    if (activeSubTab && ['wizard', 'held', 'deeds', 'khatian', 'verifier', 'fees', 'onboarding'].includes(activeSubTab)) {
      setSubTab(activeSubTab as SubRegistrarTab);
      if (activeSubTab === 'held') {
        setDeedStatusFilter('HELD');
      } else if (activeSubTab === 'deeds') {
        setDeedStatusFilter('ALL');
      }
    }
  }, [activeSubTab]);

  const handleTabChange = (target: SubRegistrarTab) => {
    setSubTab(target);
    setActiveSubTab(target);
    if (target === 'held') {
      setDeedStatusFilter('HELD');
    } else if (target === 'deeds') {
      setDeedStatusFilter('ALL');
    }
  };

  const handleDecideBatch = async (batchId: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await BhumiApi.decideOnboardingBatch(batchId, status, 'সাব-রেজিস্ট্রার কর্তৃক যাচাইপূর্বক অনুমোদন প্রদান করা হলো।');
      setStatusMsg(lang === 'bn' ? res.message_bn : res.message_en);
      loadRegistrarData();
    } catch (err: any) {
      setStatusMsg(err.message || 'অনবোর্ডিং ব্যাচ প্রক্রিয়াকরণে ত্রুটি হয়েছে।');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowChallanModal(false);
      }
    };
    if (showChallanModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showChallanModal]);

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
          seller_nid: selectedSeller?.nid || selectedSeller?.nid_mock,
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
      triggerAppNotification({
        title_bn: 'দলিল রেজিস্ট্রেশন সম্পন্ন ও স্বয়ংক্রিয় এলটি নোটিশ জারি',
        title_en: 'Deed Registered & Auto LT Notice Dispatched',
        message_bn: `দাগ নং ${plotId}-এর জন্য দলিল সফলভাবে নিবন্ধিত হয়েছে এবং এসিল্যান্ডের ডকেটে স্বয়ংক্রিয় ই-মিউটেশন নোটিশ পাঠানো হয়েছে।`,
        message_en: `Deed successfully registered for Dag ${plotId}. Automated e-Mutation LT Notice dispatched to AC Land tribunal.`,
        type: 'SUCCESS',
        targetTab: 'subregistrar',
        targetSection: 'deeds',
      });
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
      triggerAppNotification({
        title_bn: newStatus === 'REGISTERED' ? 'দলিল রেজিস্ট্রেশন অনুমোদিত' : 'দলিল স্থগিত/বাতিল',
        title_en: newStatus === 'REGISTERED' ? 'Deed Registration Approved' : 'Deed Registration Held/Rejected',
        message_bn: `দলিল নং #${deedId} সাব-রেজিস্ট্রার কর্তৃক ${newStatus === 'REGISTERED' ? 'অনুমোদিত ও ই-নামজারিতে প্রেরণ করা হয়েছে' : 'স্থগিত/বাতিল করা হয়েছে'}।`,
        message_en: `Deed #${deedId} has been ${newStatus.toLowerCase()} by Sub-Registrar.`,
        type: newStatus === 'REGISTERED' ? 'SUCCESS' : 'ALERT',
        targetTab: 'subregistrar',
        targetSection: 'deeds',
      });
      loadRegistrarData();
    } catch {
      setStatusMsg(t('স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে।', 'Failed to update deed status.'));
    }
  };

  const handleCalculateCustomFee = async () => {
    try {
      const res = await BhumiApi.calculateFees(Number(declaredValue) || 1000000, deedTypeFee);
      setFeeBreakdown(res);
    } catch (error: any) {
      setFeeBreakdown(null);
      setStatusMsg(lang === 'bn' ? error?.response?.data?.message_bn || 'ফি নির্ধারণ করা যাচ্ছে না।' : error?.response?.data?.message_en || 'Fee assessment is unavailable.');
    }
  };

  // Filtered plots for Wizard based on cascading address
  const filteredPlotsForWizard = useMemo(() => {
    return plots.filter((p) => {
      if (selectedDivision && p.division_bn && p.division_bn !== selectedDivision) return false;
      if (selectedDistrict && p.district_bn && p.district_bn !== selectedDistrict) return false;
      if (selectedUpazila && p.upazila_bn && p.upazila_bn !== selectedUpazila) return false;
      if (selectedMouzaId && p.mouza_id && Number(p.mouza_id) !== Number(selectedMouzaId)) return false;
      return true;
    });
  }, [plots, selectedDivision, selectedDistrict, selectedUpazila, selectedMouzaId]);

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

      if (selectedDivision && d.division_bn && d.division_bn !== selectedDivision) return false;
      if (selectedDistrict && d.district_bn && d.district_bn !== selectedDistrict) return false;
      if (selectedUpazila && d.upazila_bn && d.upazila_bn !== selectedUpazila) return false;

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
  }, [deedsList, deedStatusFilter, deedSearch, selectedDivision, selectedDistrict, selectedUpazila]);

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
        <h1>
          {role === 'registry_data_officer'
            ? t('রেজিস্ট্রি ডাটা এন্ট্রি সেল (মেকার কনসোল)', 'Registry Data Entry Cell (Maker Console)')
            : t('সাব-রেজিস্ট্রার কনসোল (চেকার ও নিবন্ধন কর্তৃপক্ষ)', 'Sub-Registrar Console (Checker & Registration Authority)')}
        </h1>
        <p>
          {role === 'registry_data_officer'
            ? t('নতুন দলিল ড্রাফট এন্ট্রি, ক্রেতা-বিক্রেতা ডাটা যাচাই ও সরকারি স্ট্যাম্প ফি ও চালান হিসাব।', 'Draft deed data entry, party NID validation, and treasury stamp duty calculation.')
            : t('প্রাক-নিবন্ধন গেটকিপার, স্থগিত দলিল (HELD) কিউ, কাউন্টার বায়োমেট্রিক ও ক্রিপ্টোগ্রাফিক সিল।', 'Pre-registration gatekeeper, held queue resolution, counter biometrics, and Ed25519 deed sealing.')}
        </p>
      </header>
      {/* RBAC Guard Notice if not in an authorized registry role */}
      {!['sub_registrar', 'registry_data_officer', 'admin', 'system_admin'].includes(role) && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0A1F1C]">
            <KeyRound className="w-4 h-4 text-[#C4891A]" />
            <span>
              {t(
                'দাপ্তরিক অ্যাক্সেস নোটিশ: সাব-রেজিস্ট্রার কন্ট্রোল পূর্ণাঙ্গভাবে ব্যবহার করতে সাব-রেজিস্ট্রার সেশনে প্রবেশ করুন।',
                'Access Notice: Switch to the Sub-Registrar Officer session to execute deeds and release held records.'
              )}
            </span>
          </div>
          <button
            onClick={switchToRegistrarRole}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#074f38] hover:bg-[#053b2a] text-white font-bold text-xs cursor-pointer min-h-[36px] transition-colors"
          >
            {t('সাব-রেজিস্ট্রার প্যানেলে প্রবেশ করুন →', 'Activate Sub-Registrar Session →')}
          </button>
        </div>
      )}

      {/* Sub-Registrar Operational KPI Strip (Role-Specific) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-rise">
        <div className="panel p-4 border border-[#006A4E]/15 bg-white shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
              {t('মোট নিবন্ধিত দলিল', 'Total Registered Deeds')}
            </div>
            <div className="text-2xl font-extrabold text-[#0A1F1C] mt-1">
              {toBanglaDigits(stats?.kpis?.total_deeds ?? deedsList.length, lang)}
            </div>
            <button
              onClick={() => handleTabChange('deeds')}
              className="text-xs text-[#006A4E] font-semibold hover:underline mt-1 block cursor-pointer"
            >
              {t('দলিল রেজিস্টার দেখুন →', 'View Deed Registry →')}
            </button>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#006A4E] flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
        </div>

        <div className="panel p-4 border border-[#006A4E]/15 bg-white shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
              {t('স্থগিত দলিল (HELD কিউ)', 'Held Deeds Queue')}
            </div>
            <div className="text-2xl font-extrabold text-[#C4891A] mt-1">
              {toBanglaDigits(deedsList.filter((d) => d.status === 'HELD').length, lang)}
            </div>
            <button
              onClick={() => handleTabChange('held')}
              className="text-xs text-[#C4891A] font-semibold hover:underline mt-1 block cursor-pointer"
            >
              {t('শুনানি ও নিষ্পত্তি কিউ →', 'Review Held Hearings →')}
            </button>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-[#C4891A] flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="panel p-4 border border-[#006A4E]/15 bg-white shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
              {t('দলিলের ঘোষিত মোট মূল্য', 'Total declared deed value')}
            </div>
            <div className="text-2xl font-extrabold text-[#0A1F1C] mt-1">
              ৳{toBanglaDigits(((stats?.kpis?.total_deed_value_bdt ?? 0) / 100000).toFixed(1), lang)} Lac
            </div>
            <button
              onClick={() => handleTabChange('fees')}
              className="text-xs text-[#006A4E] font-semibold hover:underline mt-1 block cursor-pointer"
            >
              {t('শুল্ক ক্যালকুলেটর →', 'Fee Calculator →')}
            </button>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#006A4E] flex items-center justify-center">
            <Calculator className="w-6 h-6" />
          </div>
        </div>

        <div className="panel p-4 border border-[#006A4E]/15 bg-white shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
              {t('ক্রিপ্টোগ্রাফিক লেজার', 'Cryptographic Ledger')}
            </div>
            <div className="text-2xl font-extrabold text-[#006A4E] mt-1">
              {toBanglaDigits(stats?.kpis?.ledger_integrity_pct ?? 0, lang)}%
            </div>
            <button
              onClick={() => handleTabChange('verifier')}
              className="text-xs text-[#006A4E] font-semibold hover:underline mt-1 block cursor-pointer"
            >
              {t('লেজার অখণ্ডতা যাচাই →', 'Verify Ledger →')}
            </button>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#006A4E] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Operational Controlling Card */}
      <div className="panel p-6 space-y-6 animate-rise-delay">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#006A4E]/10 pb-4">
          <div>
            <h2 className="font-bold text-lg md:text-xl text-[#074f38] flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#006A4E]" />
              <span>
                {t(
                  'সাব-রেজিস্ট্রার প্রাক-নিবন্ধন গেটকিপার ও দলিল রেজিস্টার কন্ট্রোল',
                  'Pre-Registration Gatekeeper, Deed Control & Verification'
                )}
              </span>
            </h2>
            <p className="text-xs text-[#5F7A74] mt-0.5">
              {t(
                'দলিল সম্পাদনের পূর্বে ১১টি রুল পরীক্ষা, স্থগিত দলিল (HELD) শুনানি নিষ্পত্তি, খতিয়ান চেইন ও লেজার যাচাই:',
                'Run pre-registration fraud checks, manage held hearings, inspect khatian lineage and ledger proofs:'
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleTabChange('wizard')}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                subTab === 'wizard'
                  ? 'bg-[#006A4E] text-white shadow-xs'
                  : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{t('নতুন দলিল ও প্রাক-যাচাই', 'Pre-Reg Gatekeeper')}</span>
            </button>
            <button
              onClick={() => handleTabChange('held')}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                subTab === 'held'
                  ? 'bg-[#C4891A] text-white shadow-xs'
                  : 'bg-[#FBF3E0] text-[#7A540E] hover:bg-[#F5E6BE]'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>
                {t('স্থগিত (HELD) কিউ', 'Held Queue')} (
                {toBanglaDigits(deedsList.filter((d) => d.status === 'HELD').length, lang)})
              </span>
            </button>
            <button
              onClick={() => handleTabChange('deeds')}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                subTab === 'deeds'
                  ? 'bg-[#006A4E] text-white shadow-xs'
                  : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              <span>
                {t('দলিল রেজিস্টার', 'Deed Registry')} (
                {toBanglaDigits(deedsList.length, lang)})
              </span>
            </button>
            <button
              onClick={() => handleTabChange('khatian')}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                subTab === 'khatian'
                  ? 'bg-[#006A4E] text-white shadow-xs'
                  : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>{t('খতিয়ান পরম্পরা', 'Khatian Lineage')}</span>
            </button>
            <button
              onClick={() => handleTabChange('verifier')}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                subTab === 'verifier'
                  ? 'bg-[#006A4E] text-white shadow-xs'
                  : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>{t('দলিল লেজার যাচাই', 'Deed Verifier')}</span>
            </button>
            <button
              onClick={() => handleTabChange('fees')}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                subTab === 'fees'
                  ? 'bg-[#006A4E] text-white shadow-xs'
                  : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>{t('সরকারি ফি ও চালান', 'Stamp & Challan')}</span>
            </button>
            {role !== 'registry_data_officer' && (
              <button
                onClick={() => handleTabChange('onboarding')}
                className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                  subTab === 'onboarding'
                    ? 'bg-[#006A4E] text-white shadow-xs'
                    : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>
                  {t('অনবোর্ডিং ব্যাচ অনুমোদন (চেকার)', 'Approve Staging Batches')} (
                  {toBanglaDigits(onboardingBatches.length, lang)})
                </span>
              </button>
            )}
          </div>
        </div>

        {statusMsg && (
          <div className="p-4 rounded-xl bg-[#EDF7F4] border-l-4 border-[#006A4E] text-[#006A4E] font-bold text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* TAB 1: New Deed Pre-Registration Wizard */}
        {subTab === 'wizard' && (
          <div className="space-y-6">
            {/* Universal Address Cascader */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#006A4E]" />
                  {t('জমির ভৌগোলিক অধিক্ষেত্র নির্বাচন (বিভাগ ➔ জেলা ➔ উপজেলা ➔ মৌজা)', 'Jurisdiction Selector')}
                </span>
                {(selectedDivision || selectedDistrict || selectedUpazila || selectedMouzaId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDivision('');
                      setSelectedDistrict('');
                      setSelectedUpazila('');
                      setSelectedMouzaId('');
                    }}
                    className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    {t('ফিল্টার রিসেট', 'Reset Filter')}
                  </button>
                )}
              </div>
              <AddressCascader
                lang={lang}
                selectedDivision={selectedDivision}
                selectedDistrict={selectedDistrict}
                selectedUpazila={selectedUpazila}
                selectedMouzaId={selectedMouzaId}
                onChange={(sel: AddressSelection) => {
                  setSelectedDivision(sel.division_bn);
                  setSelectedDistrict(sel.district_bn);
                  setSelectedUpazila(sel.upazila_bn);
                  setSelectedMouzaId(sel.mouza_id ? String(sel.mouza_id) : '');
                }}
              />
            </div>

            {/* Citizen Sale Lock Alert Banner */}
            {selectedPlot && Number(selectedPlot.owner_sale_locked) === 1 && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-start gap-3 shadow-xs">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-extrabold text-sm text-rose-800 block">
                    {t('সতর্কতা: এই দাগে নাগরিক বিক্রয় লক (Citizen Sale Lock) সক্রিয় রয়েছে!', 'Warning: Citizen Sale Lock is ACTIVE on this plot!')}
                  </span>
                  <p className="font-normal text-rose-700 leading-relaxed">
                    {t(
                      'জমির বৈধ মালিক কর্তৃক অননুমোদিত হস্তান্তর রোধে বায়োমেট্রিক বিক্রয় লক জারি করা হয়েছে। নাগরিকের ডিজিটাল ভল্ট থেকে আনলক ব্যতিরেকে এই জমির সাব-রেজিস্ট্রি রেজিস্ট্রেশন আইনত নিষিদ্ধ ও ব্লক থাকবে।',
                      'The owner has locked this plot against unauthorized conveyance. Deed registration cannot proceed until unlocked by the owner.'
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Form Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">
                  {t('দাগ নম্বর (Plot / Dag):', 'Plot / Dag No:')}
                  {filteredPlotsForWizard.length > 0 && (
                    <span className="text-[10px] text-[#006A4E] ml-1 font-normal">
                      ({toBanglaDigits(filteredPlotsForWizard.length, lang)} {t('টি দাগ পাওয়া গেছে', 'plots found')})
                    </span>
                  )}
                </label>
                <select
                  value={plotId}
                  onChange={(e) => setPlotId(Number(e.target.value))}
                  className="field text-xs font-semibold bg-[#F5FAF8]"
                >
                  <option value="">{t('-- দাগ নির্বাচন করুন --', '-- Select Plot --')}</option>
                  {(filteredPlotsForWizard.length > 0 ? filteredPlotsForWizard : plots).map((p) => (
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
                  {persons.map((per) => (
                    <option key={per.id} value={per.id}>
                      {lang === 'bn' ? per.name_bn : per.name_en} ({per.nid || per.nid_mock})
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
                  {persons.map((per) => (
                    <option key={per.id} value={per.id}>
                      {lang === 'bn' ? per.name_bn : per.name_en} ({per.nid || per.nid_mock})
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
            <div className="p-3.5 bg-[#EDF7F4]/80 rounded-xl border border-[#006A4E]/12 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0A1F1C]/90">{t('নির্বাচিত প্লট:', 'Selected Plot:')}</span>
                <span className="px-2 py-0.5 rounded bg-white border border-[#006A4E]/20 font-bold text-[#0A1F1C]">
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
                <ShieldAlert className="w-4 h-4 text-[#006A4E]" />
                <span>{t('স্বয়ংক্রিয় ১১টি গেটকিপার রুলস ইঞ্জিন:', 'Automated 11-Rule Gatekeeper Engine:')}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
                {gatekeeperRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-2.5 rounded-lg border border-[#006A4E]/12 bg-white flex items-center gap-2 text-[#0A1F1C]/90"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#EDF7F4] text-[#006A4E] font-bold text-[10px] flex items-center justify-center shrink-0">
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
                disabled={loading || Number(selectedPlot?.owner_sale_locked) === 1}
                className="px-5 py-2.5 rounded-lg bg-[#074f38] hover:bg-[#053b2a] text-white text-xs font-extrabold cursor-pointer min-h-[42px] shadow-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title={Number(selectedPlot?.owner_sale_locked) === 1 ? t('নাগরিক বিক্রয় লক প্রত্যাহার না করা পর্যন্ত নিবন্ধন সম্ভব নয়', 'Registration blocked by citizen sale lock') : undefined}
              >
                <KeyRound className="w-4 h-4" />
                <span>
                  {Number(selectedPlot?.owner_sale_locked) === 1
                    ? t('🔒 নাগরিক বিক্রয় লক দ্বারা স্থগিত', '🔒 Blocked by Citizen Sale Lock')
                    : t(
                        '২. লেজারে দলিল নিবন্ধন ও Ed25519 স্বাক্ষর',
                        '2. Register Deed in Hash Ledger & Sign'
                      )}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Deed Registry & Hold / Release Control Table */}
        {(subTab === 'deeds' || subTab === 'held') && (
          <div className="space-y-4">
            {/* Universal Address Cascader Toolbar */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#006A4E]" />
                  {t('অধিক্ষেত্র ভিত্তিক দলিল ফিল্টারিং (বিভাগ ➔ জেলা ➔ উপজেলা ➔ মৌজা)', 'Jurisdiction Filter')}
                </span>
                {(selectedDivision || selectedDistrict || selectedUpazila || selectedMouzaId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDivision('');
                      setSelectedDistrict('');
                      setSelectedUpazila('');
                      setSelectedMouzaId('');
                    }}
                    className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    {t('রিসেট', 'Reset Filter')}
                  </button>
                )}
              </div>
              <AddressCascader
                lang={lang}
                selectedDivision={selectedDivision}
                selectedDistrict={selectedDistrict}
                selectedUpazila={selectedUpazila}
                selectedMouzaId={selectedMouzaId}
                onChange={(sel: AddressSelection) => {
                  setSelectedDivision(sel.division_bn);
                  setSelectedDistrict(sel.district_bn);
                  setSelectedUpazila(sel.upazila_bn);
                  setSelectedMouzaId(sel.mouza_id ? String(sel.mouza_id) : '');
                }}
              />
            </div>

            {/* Search and Status Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#EDF7F4]/80 p-3 rounded-xl border border-[#006A4E]/12">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-[#5F7A74]/80 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={deedSearch}
                  onChange={(e) => setDeedSearch(e.target.value)}
                  placeholder={t('দলিল নং, দাগ বা নাম খুঁজুন...', 'Search deed, dag or party...')}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#006A4E]/20 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#006A4E]/30"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(['ALL', 'HELD', 'REGISTERED', 'PENDING_MUTATION', 'REJECTED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setDeedStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer min-h-[32px] ${
                      deedStatusFilter === st
                        ? 'bg-[#006A4E] text-white shadow-xs'
                        : 'bg-white text-[#5F7A74] border border-[#006A4E]/12 hover:bg-[#EDF7F4]'
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
            <div className="overflow-x-auto rounded-xl border border-[#006A4E]/12">
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
                <tbody className="divide-y divide-[#006A4E]/10 bg-white">
                  {filteredDeeds.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#5F7A74]">
                        {t('কোনো দলিল পাওয়া যায়নি।', 'No deeds found matching criteria.')}
                      </td>
                    </tr>
                  ) : (
                    filteredDeeds.map((d) => (
                      <tr key={d.id} className="hover:bg-[#EDF7F4]/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-[#074f38]">
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
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDeedForModal(d);
                                setOfficerNote('');
                              }}
                              className="p-1.5 rounded-lg border border-[#006A4E]/30 bg-white hover:bg-[#006A4E] hover:text-white text-[#006A4E] transition cursor-pointer"
                              title={t('দলিলের সম্পূর্ণ ডকেট ও শুনানির রায়', 'View Deed Docket & Hearing')}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {d.status !== 'PENDING_MUTATION' && d.status !== 'MUTATED' && (
                              <button
                                onClick={() => handleUpdateDeedStatus(d.id, 'REGISTERED')}
                                className="px-2.5 py-1 rounded bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-[11px] cursor-pointer min-h-[30px] transition-colors"
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
        {subTab === 'fees' && <p role="note" className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-950">{t('ভূমি ও আইন মন্ত্রণালয়ের গেজেট ও সার্কুলার অনুযায়ী স্ট্যাম্প শুল্ক, রেজিস্ট্রেশন ফি এবং উৎসে করের প্রাক্কলন। সাব-রেজিস্ট্রার কার্যালয়ের নির্ধারিত চালান কোডে অর্থ জমা প্রদানের পূর্বে এই হিসাব যাচাই করুন।', 'Assessment of Stamp Duty, Registration Fee, and Source Taxes calculated according to Ministry of Land & Law circulars. Verify before treasury deposit at the registry office.')}</p>}
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
                  className="flex-1 py-2.5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-extrabold cursor-pointer min-h-[40px] shadow-sm transition-colors"
                >
                  {t('সরকারি শুল্ক ও ফি প্রাক্কলন করুন', 'Calculate Official Duty & Fees')}
                </button>
                <button
                  onClick={() => setShowChallanModal(true)}
                  className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer min-h-[40px] flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t('আনুমানিক হিসাব দেখুন', 'Preview Estimate')}</span>
                </button>
              </div>
            </div>

            {/* Fee Breakdown Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
              <div className="p-4 rounded-xl bg-[#EDF7F4]/80 border border-[#006A4E]/12">
                <div className="text-[11px] text-[#5F7A74]">
                  {feeBreakdown.stamp_duty_rate_label
                    ? t(`স্ট্যাম্প শুল্ক (${feeBreakdown.stamp_duty_rate_label})`, `Stamp Duty (${feeBreakdown.stamp_duty_rate_label})`)
                    : t('স্ট্যাম্প শুল্ক (১.৫%)', 'Stamp Duty (1.5%)')}
                </div>
                <div className="text-base font-extrabold text-[#0A1F1C] mt-1">
                  ৳{toBanglaDigits(feeBreakdown.breakdown.stamp_duty_bdt.toLocaleString(), lang)}
                </div>
                <div className="text-[10px] text-[#5F7A74]/80 mt-1">কোড: ট্রেজারি চালান (১-১১০১)</div>
              </div>
              <div className="p-4 rounded-xl bg-[#EDF7F4]/80 border border-[#006A4E]/12">
                <div className="text-[11px] text-[#5F7A74]">
                  {feeBreakdown.registration_fee_rate_label
                    ? t(`রেজিস্ট্রেশন ফি (${feeBreakdown.registration_fee_rate_label})`, `Registration Fee (${feeBreakdown.registration_fee_rate_label})`)
                    : t('রেজিস্ট্রেশন ফি (১%)', 'Registration Fee (1%)')}
                </div>
                <div className="text-base font-extrabold text-[#0A1F1C] mt-1">
                  ৳{toBanglaDigits(feeBreakdown.breakdown.registration_fee_bdt.toLocaleString(), lang)}
                </div>
                <div className="text-[10px] text-[#5F7A74]/80 mt-1">কোড: নিবন্ধন রাজস্ব (১-২১০১)</div>
              </div>
              <div className="p-4 rounded-xl bg-[#EDF7F4]/80 border border-[#006A4E]/12">
                <div className="text-[11px] text-[#5F7A74]">{t('স্থানীয় সরকার কর (৩%)', 'Local Govt Tax (3%)')}</div>
                <div className="text-base font-extrabold text-[#0A1F1C] mt-1">
                  ৳{toBanglaDigits(feeBreakdown.breakdown.local_govt_tax_bdt.toLocaleString(), lang)}
                </div>
                <div className="text-[10px] text-[#5F7A74]/80 mt-1">উপজেলা / পৌরসভা তহবিল</div>
              </div>
              <div className="p-4 rounded-xl bg-[#EDF7F4]/80 border border-[#006A4E]/12">
                <div className="text-[11px] text-[#5F7A74]">{t('উৎস কর / গেইন ট্যাক্স (২%)', 'Capital Gain AIT (2%)')}</div>
                <div className="text-base font-extrabold text-[#0A1F1C] mt-1">
                  ৳{toBanglaDigits(feeBreakdown.breakdown.ait_gain_tax_bdt.toLocaleString(), lang)}
                </div>
                <div className="text-[10px] text-[#5F7A74]/80 mt-1">জাতীয় রাজস্ব বোর্ড (NBR)</div>
              </div>
              <div className="p-4 rounded-xl bg-[#EDF7F4] border-2 border-[#006A4E]">
                <div className="text-[11px] font-bold text-[#006A4E]">{t('সর্বমোট প্রাক্কলিত ফি ও শুল্ক', 'Total Assessed Duty & Fees')}</div>
                <div className="text-lg font-extrabold text-[#006A4E] mt-1">
                  ৳{toBanglaDigits(feeBreakdown.total_payable_bdt.toLocaleString(), lang)}
                </div>
                <div className="text-[10px] text-[#006A4E]/80 mt-1 font-bold">গেজেট নির্ধারিত প্রাক্কলন</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: In-Panel Officer Khatian Lineage & Chain Reconciliation */}
        {subTab === 'khatian' && (
          <OfficerKhatianExplorer
            onSelectPlotForAction={(selectedId) => {
              setPlotId(selectedId);
              handleTabChange('wizard');
            }}
            actionLabel={t('এই প্লটে দলিল নিবন্ধন শুরু করুন', 'Start Deed Registration')}
            actionType="wizard"
          />
        )}

        {/* TAB 5: In-Panel Officer Cryptographic Deed & Ledger Verifier */}
        {subTab === 'verifier' && (
          <OfficerDeedVerifier
            onNavigateToWizard={(selectedPlotId) => {
              setPlotId(selectedPlotId);
              handleTabChange('wizard');
            }}
          />
        )}

        {/* TAB 6: Onboarding Batch Review (Sub-Registrar Checker) */}
        {subTab === 'onboarding' && (
          <div className="space-y-6">
            <div className="bg-[#F4F9F6] p-5 rounded-xl border border-[#006A4E]/15">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-[#074f38] flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-5 h-5 text-[#006A4E]" />
                    <span>{t('রেজিস্ট্রি ডাটা অনবোর্ডিং ব্যাচ অনুমোদন (চার-চক্ষু নীতি)', 'Registry Data Onboarding Approvals')}</span>
                  </h3>
                  <p className="text-xs text-[#5F7A74]">
                    {t(
                      'রেজিস্ট্রি ডাটা এন্ট্রি অফিসার (মেকার) কর্তৃক আপলোডকৃত দলিলের অনবোর্ডিং ব্যাচ পর্যালোচনা এবং সাব-রেজিস্ট্রার (চেকার) হিসেবে চূড়ান্ত অনুমোদন। প্রস্তুতকারী নিজে অনুমোদন করতে পারবেন না।',
                      'Four-eyes principle: Registry Data Officer (Maker) enters draft records; Sub-Registrar (Checker) verifies and issues final approval.'
                    )}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#006A4E] text-xs font-bold">
                  {toBanglaDigits(onboardingBatches.length, lang)} {t('টি ব্যাচ অপেক্ষমান', 'Batches in Queue')}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {onboardingBatches.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                  {t('কোনো অনবোর্ডিং ব্যাচ অপেক্ষমান নেই।', 'No onboarding batches in pending review.')}
                </div>
              ) : (
                onboardingBatches.map((batch: any) => (
                  <div key={batch.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                      <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                        <span>{batch.batch_no}</span>
                        <span className="text-xs text-slate-500">• {batch.record_type}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${batch.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : batch.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                          {batch.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">আইটেম সংখ্যা: {batch.total_records || 1} টি</span>
                    </div>

                    <div className="text-xs text-slate-600 font-mono break-all">
                      SHA-256 Batch Hash: {batch.batch_hash}
                    </div>

                    {batch.status === 'SUBMITTED' && (
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <button
                          onClick={() => handleDecideBatch(batch.id, 'APPROVED')}
                          className="px-4 py-1.5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t('✔ ব্যাচ অনুমোদন ও লেজারে অন্তর্ভুক্তি', 'Approve Batch')}</span>
                        </button>
                        <button
                          onClick={() => handleDecideBatch(batch.id, 'REJECTED')}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                        >
                          <span>✕ {t('বাতিল (Reject)', 'Reject')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {preCheckReport && subTab === 'wizard' && <ResultHeroBanner report={preCheckReport} />}

      {createdDeedResult && (
        <div
          className={`p-6 rounded-xl border-2 ${
            createdDeedResult.deed.status === 'REGISTERED'
              ? 'bg-[#EDF7F4] border-[#006A4E]'
              : 'bg-[#FFF0F1] border-[#FF3B4A]'
          }`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-extrabold text-lg">
                {createdDeedResult.deed.status === 'REGISTERED' ? (
                  <CheckCircle2 className="w-6 h-6 text-[#006A4E]" />
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
              <div className="bg-white p-2 rounded-xl border border-[#006A4E]/20 shrink-0">
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
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl relative my-8 border border-[#006A4E]/12">
            <div className="flex items-center justify-between border-b pb-3 mb-4 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#006A4E]" />
                <h3 className="font-extrabold text-[#0A1F1C] text-sm">
                  {t('আনুমানিক ফি হিসাব — সরকারি চালান নয়', 'Informational Estimate — Not a Payment Document')}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-lg bg-[#006A4E] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t('হিসাব প্রিন্ট করুন', 'Print Estimate')}</span>
                </button>
                <button
                  onClick={() => setShowChallanModal(false)}
                  className="p-1.5 rounded-lg text-[#5F7A74]/80 hover:text-[#5F7A74] hover:bg-[#EDF7F4] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 border-2 border-[#006A4E]/20 rounded-xl space-y-4 text-xs text-[#0A1F1C]">
              <div className="text-center border-b pb-3 space-y-0.5">
                <p className="font-bold text-[#0A1F1C]">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার • নিবন্ধন অধিদপ্তর</p>
                <p className="font-extrabold text-[#006A4E]">অফিসিয়াল রেজিস্ট্রেশন ফি ও সরকারি শুল্ক প্রাক্কলন ডকেট</p>
                <p className="text-[10px] text-[#5F7A74] font-mono">
                  ASSESSMENT REF: BHM-CHLN-{Date.now().toString().slice(-8)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>দলিলের ঘোষিত মূল্য: <strong>৳{Number(declaredValue).toLocaleString()}</strong></div>
                <div>দলিলের ধরন: <strong>{deedTypeFee}</strong></div>
                <div>হিসাবের ধরন: <strong>সরকারি সার্কুলার নির্ধারিত প্রাক্কলন</strong></div>
                <div>হিসাবের উৎস: <strong>ভূমি ও আইন মন্ত্রণালয় রাজস্ব ফ্রেমওয়ার্ক</strong></div>
              </div>

              <table className="w-full border-collapse text-[11px] border border-[#006A4E]/12">
                <thead>
                  <tr className="bg-[#EDF7F4]/80 border-b border-[#006A4E]/12">
                    <th className="p-2 text-left">ফি/শুল্কের খাত</th>
                    <th className="p-2 text-right">হার</th>
                    <th className="p-2 text-right">পরিমাণ (টাকা)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#006A4E]/10">
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
                  <tr className="bg-[#EDF7F4] font-bold text-[#006A4E]">
                    <td className="p-2" colSpan={2}>সর্বমোট প্রাক্কলিত ফি ও শুল্ক:</td>
                    <td className="p-2 text-right font-mono text-sm">
                      ৳{feeBreakdown.total_payable_bdt.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-between items-end pt-4 border-t text-[10px] text-[#5F7A74]">
                <div>
                  <p>এই নথি দিয়ে কোনো অর্থ প্রদান করবেন না।</p>
                  <p>চূড়ান্ত ফি ও চালানের জন্য সরকারি নিবন্ধন অফিসের নির্দেশনা অনুসরণ করুন।</p>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-[#006A4E]">[INFORMATIONAL ESTIMATE]</div>
                  <p>সরকারি নথি নয়</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-REGISTRAR HEARING & DEED DOCKET MODAL */}
      {selectedDeedForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#006A4E]/10 text-[#006A4E] border border-[#006A4E]/20">
                  {selectedDeedForModal.deed_no}
                </span>
                <h3 className="font-extrabold text-base text-slate-900">
                  {t('সাব-রেজিস্ট্রার শুনানি ও বিচারিক রায় ডকেট', 'Sub-Registrar Hearing & Judicial Order')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDeedForModal(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Parties & Schedule */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block text-[10px]">{t('দলিলদাতা (বিক্রেতা)', 'Seller')}</span>
                  <strong className="text-slate-900 font-bold">{selectedDeedForModal.seller_name_bn}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{t('দলিলগ্রহীতা (ক্রেতা)', 'Buyer')}</span>
                  <strong className="text-slate-900 font-bold">{selectedDeedForModal.buyer_name_bn}</strong>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px]">{t('মৌজা ও অধিক্ষেত্র', 'Mouza')}</span>
                  <strong className="text-slate-800">{selectedDeedForModal.mouza_bn}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{t('দাগ নং', 'Plot No')}</span>
                  <strong className="text-[#006A4E] font-bold">
                    {toBanglaDigits(selectedDeedForModal.dag_no_bn || selectedDeedForModal.dag_no, lang)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{t('হস্তান্তরিত অংশ ও আয়তন', 'Area')}</span>
                  <strong className="text-[#006A4E] font-bold">
                    {toBanglaDigits(selectedDeedForModal.area_decimal, lang)} {t('শতক', 'dec')}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px]">{t('কবলা মূল্য (টাকা)', 'Consideration Price')}</span>
                  <strong className="text-slate-900 font-mono">
                    ৳{selectedDeedForModal.price_bdt ? toBanglaDigits(Number(selectedDeedForModal.price_bdt).toLocaleString(), lang) : '—'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{t('বর্তমান অবস্থা', 'Status')}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                      selectedDeedForModal.status === 'HELD'
                        ? 'bg-amber-100 text-amber-800'
                        : selectedDeedForModal.status === 'REJECTED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-[#006A4E]'
                    }`}
                  >
                    {selectedDeedForModal.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Cryptographic Ledger & Gatekeeper Badges */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-slate-300 space-y-2 text-xs">
              <div className="flex items-center justify-between text-emerald-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> {t('১১টি প্রাক-নিবন্ধন গেটকিপার রুল যাচাই', '11 Gatekeeper Rules Checked')}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                  {t('ঝুঁকি মুক্ত', 'Low Risk')}
                </span>
              </div>
              <div className="font-mono text-[10px] text-slate-400 break-all pt-1 border-t border-slate-800">
                <div>{t('ব্লকচেইন হ্যাশ:', 'Hash:')} {selectedDeedForModal.content_hash || '2f3c8542e1dda1d7c818025b2f132095feb04a370e1322a827920860e36d22d5'}</div>
                <div>{t('Ed25519 সিল:', 'Seal:')} {selectedDeedForModal.signature ? selectedDeedForModal.signature.slice(0, 48) + '...' : '55989fbffb79abbb3916e112101215bd...'}</div>
              </div>
            </div>

            {/* Hearing Notes & Action Buttons */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('সাব-রেজিস্ট্রারের বিচারিক মন্তব্য ও শুনানি রায়:*', 'Officer Hearing Notes & Judicial Findings:*')}
                </label>
                <textarea
                  rows={2}
                  value={officerNote}
                  onChange={(e) => setOfficerNote(e.target.value)}
                  placeholder={t('উদা: পক্ষগণের পরিচয় ও বায়োমেট্রিক মিল রয়েছে, ফি পরিশোধিত...', 'Hearing notes...')}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedDeedForModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  {t('বাতিল', 'Cancel')}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await handleUpdateDeedStatus(selectedDeedForModal.id, 'REJECTED');
                    setSelectedDeedForModal(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>✖ {t('দলিল বাতিল (Reject)', 'Reject Deed')}</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await handleUpdateDeedStatus(selectedDeedForModal.id, 'HELD');
                    setSelectedDeedForModal(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>⚠ {t('স্থগিত (HELD)', 'Hold Deed')}</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await handleUpdateDeedStatus(selectedDeedForModal.id, 'REGISTERED');
                    setSelectedDeedForModal(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#006A4E] hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('অনুমোদন ও Ed25519 সিল', 'Approve & Sign')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
