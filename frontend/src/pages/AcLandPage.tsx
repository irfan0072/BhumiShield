import React, { useState, useEffect, useMemo } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { OfficerKhatianExplorer } from '../components/OfficerKhatianExplorer';
import { OfficerDeedVerifier } from '../components/OfficerDeedVerifier';
import {
  Landmark,
  CheckCircle2,
  XCircle,
  Clock,
  GitCompareArrows,
  AlertOctagon,
  KeyRound,
  Search,
  Filter,
  FileText,
  ShieldCheck,
  Scale,
  ArrowRight,
  Eye,
  X,
  QrCode,
  Layers,
  FileSpreadsheet,
  ListChecks,
  Send,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

export type AcLandTab =
  | 'mutations'
  | 'khatians'
  | 'disputes'
  | 'field_reports'
  | 'survey_batches'
  | 'sla_overview'
  | 'appeals'
  | 'onboarding'
  | 'explorer'
  | 'verifier';

export const AcLandPage: React.FC = () => {
  const { lang, role, setRole, setUser, setToken, activeSubTab, setActiveSubTab, t } = useAppUI();
  const [subTab, setSubTab] = useState<AcLandTab>(() => {
    if (activeSubTab && ['mutations', 'khatians', 'disputes', 'field_reports', 'survey_batches', 'sla_overview', 'appeals', 'onboarding', 'explorer', 'verifier'].includes(activeSubTab)) {
      return activeSubTab as AcLandTab;
    }
    if (role === 'field_verification_officer') return 'field_reports';
    if (role === 'settlement_records_officer') return 'survey_batches';
    if (role === 'settlement_checker') return 'onboarding';
    if (role === 'uno_supervisor') return 'sla_overview';
    if (role === 'appellate_reviewer') return 'appeals';
    return 'mutations';
  });

  const [mutations, setMutations] = useState<any[]>([]);
  const [flaggedKhatians, setFlaggedKhatians] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [onboardingBatches, setOnboardingBatches] = useState<any[]>([]);
  const [appealsList, setAppealsList] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  // Field Verification state
  const [fieldForm, setFieldForm] = useState({
    dag_no: '101',
    possession: 'VERIFIED',
    boundary: 'MATCHED',
    tax_status: 'PAID',
    remarks: 'জমির সরেজমিন সীমানা ও দখল আরএস এবং বিএস নকশার সাথে হুবহু মিলেছে।',
  });
  const [fieldSubmitted, setFieldSubmitted] = useState(false);

  // Survey Batch Creation state
  const [surveyBatchForm, setSurveyBatchForm] = useState({
    record_type: 'SURVEY_BS',
    dag_no: '130',
    mouza: 'Birulia',
    area_decimal: '12.0',
    owner_name: 'হাজী আব্দুল গফুর',
    share_fraction: '1/1',
  });
  const [creatingBatch, setCreatingBatch] = useState(false);

  // UNO SLA Escalation Notice
  const [slaNoticeSent, setSlaNoticeSent] = useState(false);

  // Filtering states
  const [mutationSearch, setMutationSearch] = useState('');
  const [mutationFilter, setMutationFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // Case details modal
  const [selectedMutation, setSelectedMutation] = useState<any | null>(null);

  const loadAcLandData = () => {
    setLoading(true);
    Promise.all([
      BhumiApi.getMutations(),
      BhumiApi.listFlaggedKhatians(),
      BhumiApi.listDisputes(),
      BhumiApi.getStatsSummary(),
      BhumiApi.listOnboardingBatches().catch(() => []),
      BhumiApi.listAppeals().catch(() => []),
    ])
      .then(([muts, khats, dsps, st, batches, appeals]) => {
        setMutations(muts);
        setFlaggedKhatians(khats);
        setDisputes(dsps);
        setStats(st);
        setOnboardingBatches(batches);
        setAppealsList(appeals);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAcLandData();
  }, []);

  useEffect(() => {
    if (activeSubTab && ['mutations', 'khatians', 'disputes', 'field_reports', 'survey_batches', 'sla_overview', 'appeals', 'onboarding', 'explorer', 'verifier'].includes(activeSubTab)) {
      setSubTab(activeSubTab as AcLandTab);
    }
  }, [activeSubTab]);

  const handleTabChange = (target: AcLandTab) => {
    setSubTab(target);
    setActiveSubTab(target);
  };

  const switchToAcLandRole = async () => {
    const res = await BhumiApi.switchDemoRole('ac_land');
    if (res?.access_token && res?.user) {
      setToken(res.access_token);
      setUser(res.user);
    } else {
      setRole('ac_land');
    }
  };

  const handleDecideBatch = async (batchId: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await BhumiApi.decideOnboardingBatch(batchId, status, 'চেকার কর্তৃপক্ষ কর্তৃক যাচাইপূর্বক অনুমোদন সম্পন্ন।');
      setActionMsg(lang === 'bn' ? res.message_bn : res.message_en);
      loadAcLandData();
    } catch (err: any) {
      setActionMsg(err.message || 'অনবোর্ডিং ব্যাচ প্রক্রিয়াকরণে ত্রুটি হয়েছে।');
    }
  };

  const handleDecideAppeal = async (appealId: number, status: string, note: string) => {
    try {
      const res = await BhumiApi.decideAppeal(appealId, status, note);
      setActionMsg(lang === 'bn' ? res.message_bn : res.message_en);
      loadAcLandData();
    } catch (err: any) {
      setActionMsg(err.message || 'আপিল নিষ্পত্তিতে ত্রুটি হয়েছে।');
    }
  };

  const handleSubmitFieldReport = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldSubmitted(true);
    setActionMsg(
      lang === 'bn'
        ? `দাগ নং ${fieldForm.dag_no} এর মাঠ তদন্ত প্রতিবেদন সফলভাবে দাখিল ও স্বাক্ষরিত হয়েছে।`
        : `Field possession inspection report for Dag ${fieldForm.dag_no} submitted.`
    );
  };

  const handleCreateSurveyBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingBatch(true);
    try {
      const res = await BhumiApi.createOnboardingBatch({
        record_type: surveyBatchForm.record_type,
        mouza: surveyBatchForm.mouza,
        jurisdiction: 'Dhaka-Savar-Birulia',
        items: [
          {
            dag_no: surveyBatchForm.dag_no,
            mouza: surveyBatchForm.mouza,
            area_decimal: parseFloat(surveyBatchForm.area_decimal) || 12.0,
            seller_name: surveyBatchForm.owner_name,
            buyer_name: surveyBatchForm.owner_name,
            share_fraction: surveyBatchForm.share_fraction,
            declared_value_bdt: 2500000,
          },
        ],
      });
      setActionMsg(
        lang === 'bn'
          ? `নতুন জরিপ ব্যাচ (${res.batch?.batch_no || 'ONB-BATCH'}) তৈরি ও ক্রিপ্টোগ্রাফিক হ্যাশ সিল সম্পন্ন!`
          : `New survey batch created with cryptographic hash seal!`
      );
      loadAcLandData();
    } catch (err: any) {
      setActionMsg(err.message || 'ব্যাচ তৈরিতে ত্রুটি হয়েছে।');
    } finally {
      setCreatingBatch(false);
    }
  };

  const handleSendSlaEscalation = () => {
    setSlaNoticeSent(true);
    setActionMsg(
      lang === 'bn'
        ? 'উপজেলা ভূমি কর্মকর্তা ও কানুনগো বরাবরে জরুরি এসএলএ তাগিদপত্র ইস্যু করা হয়েছে।'
        : 'Urgent SLA escalation directive dispatched to land revenue staff.'
    );
  };

  const handleDecision = async (mutationId: number, status: 'APPROVED' | 'REJECTED') => {
    const note =
      status === 'APPROVED'
        ? 'এসি ল্যান্ড কর্তৃক অনুমোদিত এবং বিএস খতিয়ান স্বয়ংক্রিয়ভাবে হালনাগাদ করা হয়েছে।'
        : 'এসি ল্যান্ড কর্তৃক কাগজপত্রের অসামঞ্জস্যতার কারণে নামজারি না-মঞ্জুর।';
    const res = await BhumiApi.decideMutation(mutationId, status, note);
    setActionMsg(lang === 'bn' ? res.message_bn : res.message_en);
    if (selectedMutation && selectedMutation.id === mutationId) {
      setSelectedMutation(null);
    }
    loadAcLandData();
  };

  const handleReconcileKhatian = async (plotId: number, currentArea: number) => {
    const res = await BhumiApi.reconcileKhatian(plotId, {
      resolution_note_bn:
        'এসি ল্যান্ড শুনানি ও মাঠ জরিপের মাধ্যমে আরএস-বিএস খতিয়ান চেইন ও ওয়ারিশ অংশ সমন্বয় করা হলো।',
      updated_area_decimal: currentArea,
    });
    setActionMsg(lang === 'bn' ? res.message_bn : res.message_en);
    loadAcLandData();
  };

  const handleResolveDispute = async (
    disputeId: number,
    status: 'RESOLVED_DISMISSED' | 'UPHELD_FROZEN'
  ) => {
    const note =
      status === 'UPHELD_FROZEN'
        ? 'অভিযোগের প্রাথমিক সত্যতা পাওয়ায় আদালতের চূড়ান্ত নিষ্পত্তি না হওয়া পর্যন্ত এই দাগের সকল হস্তান্তর স্থগিত (Frozen) করা হলো।'
        : 'উভয় পক্ষের শুনানি শেষে অভিযোগের ভিত্তি না থাকায় তা নিষ্পত্তি ও খারিজ করা হলো।';
    const res = await BhumiApi.resolveDispute(disputeId, {
      status,
      resolution_note_bn: note,
    });
    setActionMsg(lang === 'bn' ? res.message_bn : res.message_en);
    loadAcLandData();
  };

  // Filtered mutations
  const filteredMutations = useMemo(() => {
    return mutations.filter((m) => {
      if (mutationFilter !== 'ALL' && m.status !== mutationFilter) {
        return false;
      }
      if (!mutationSearch.trim()) return true;
      const q = mutationSearch.toLowerCase();
      return (
        m.case_no?.toLowerCase().includes(q) ||
        m.deed_no?.toLowerCase().includes(q) ||
        m.dag_no?.toString().includes(q) ||
        m.mouza_bn?.toLowerCase().includes(q) ||
        m.mouza_en?.toLowerCase().includes(q) ||
        m.seller_name_bn?.toLowerCase().includes(q) ||
        m.buyer_name_bn?.toLowerCase().includes(q)
      );
    });
  }, [mutations, mutationFilter, mutationSearch]);

  return (
    <div className="space-y-6">
      <header className="page-intro animate-rise">
        <h1>
          {role === 'land_office_assistant'
            ? t('উপজেলা ভূমি সহকারী কনসোল (নামজারি মেকার)', 'Land Office Assistant Console (Mutation Maker)')
            : role === 'field_verification_officer'
            ? t('ফিল্ড ভেরিফিকেশন অফিসার / কানুনগো কনসোল', 'Field Verification & Inspection Console')
            : role === 'settlement_records_officer'
            ? t('সেটেলমেন্ট রেকর্ডস অফিসার (জরিপ মেকার)', 'Settlement Records Officer (Survey Maker)')
            : role === 'settlement_checker'
            ? t('সহকারী সেটেলমেন্ট অফিসার (জরিপ চেকার)', 'Assistant Settlement Officer (Survey Checker)')
            : role === 'uno_supervisor'
            ? t('উপজেলা নির্বাহী কর্মকর্তা (ইউএনও তদারককারী কনসোল)', 'UNO Supervisor Console')
            : role === 'appellate_reviewer'
            ? t('রাজস্ব আপিল কর্তৃপক্ষ (এডিসি রাজস্ব কনসোল)', 'Revenue Appeals Authority (ADC Revenue Console)')
            : t('সহকারী কমিশনার (ভূমি) কনসোল', 'AC Land Console')}
        </h1>
        <p>
          {role === 'land_office_assistant'
            ? t('নামজারি আবেদনের প্রাথমিক যাচাই, ওয়ারিশ হিস্যা হিসাব ও খসড়া প্রতিবেদন প্রস্তুতকরণ।', 'Initial scrutiny of mutation requests, heir share calculation, and draft reporting.')
            : role === 'field_verification_officer'
            ? t('জমির সরেজমিন দখল ও সীমানা তদন্ত প্রতিবেদন, নকশা যাচাই এবং বকেয়া এলডি ট্যাক্স স্ট্যাটাস।', 'On-site physical possession inspection, boundary verification, and LD Tax status.')
            : role === 'settlement_records_officer'
            ? t('সিএস-এসএ-আরএস-বিএস খতিয়ান চেইন ডাটা এন্ট্রি ও ক্রিপ্টোগ্রাফিক হ্যাশ প্রস্তুতকরণ।', 'Survey batch data staging, khatian lineage ingestion, and cryptographic hash sealing.')
            : role === 'settlement_checker'
            ? t('জরিপ অনবোর্ডিং ব্যাচ চার-চক্ষু নীতি অনুমোদন এবং চূড়ান্ত গেজেট প্রকাশনা ছাড়।', 'Survey batch four-eyes checker approval and official gazette publication sign-off.')
            : role === 'uno_supervisor'
            ? t('উপজেলা ভূমি সেবায় এসএলএ কার্যকারিতা মনিটরিং ও বিলম্বিত নামজারি ফাইল এসকেলেশন।', 'Upazila land services SLA performance monitoring and delayed mutation escalations.')
            : role === 'appellate_reviewer'
            ? t('এসি ল্যান্ডের আদেশের বিরুদ্ধে আপিল শুনানি, স্থগিতাদেশ (Stay Order) ও রায় প্রদান।', 'Hearing appeals against AC Land orders, granting stay orders, and issuing tribunal rulings.')
            : t('চূড়ান্ত ই-মিউটেশন অনুমোদন, খতিয়ান সমন্বয় ও নাগরিক বিরোধ ট্রাইব্যুনাল।', 'Approve e-mutations, reconcile khatians, and hear citizen dispute cases.')}
        </p>
      </header>
      {/* RBAC Guard Notice if not in an authorized land authority role */}
      {!['ac_land', 'land_office_assistant', 'field_verification_officer', 'settlement_records_officer', 'settlement_checker', 'uno_supervisor', 'appellate_reviewer', 'admin', 'system_admin'].includes(role) && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0A1F1C]">
            <KeyRound className="w-4 h-4 text-[#C4891A]" />
            <span>
              {t(
                'দাপ্তরিক অ্যাক্সেস নোটিশ: এসি ল্যান্ড মিউটেশন ও খতিয়ান কন্ট্রোল ব্যবহার করতে এসি ল্যান্ড সেশনে প্রবেশ করুন।',
                'Access Notice: Switch to the AC Land Officer session for mutation, khatian, and tribunal controls.'
              )}
            </span>
          </div>
          <button
            onClick={switchToAcLandRole}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#074f38] hover:bg-[#053b2a] text-white font-bold text-xs cursor-pointer min-h-[36px] transition-colors"
          >
            {t('এসি ল্যান্ড প্যানেলে প্রবেশ করুন →', 'Activate AC Land Session →')}
          </button>
        </div>
      )}

      {/* AC Land Operational KPI Strip (Role-Specific) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-rise">
        <div className="panel p-4 border border-[#006A4E]/15 bg-white shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
              {t('অপেক্ষমাণ ই-নামজারি', 'Pending e-Mutations')}
            </div>
            <div className="text-2xl font-extrabold text-[#006A4E] mt-1">
              {toBanglaDigits(mutations.filter((m) => m.status === 'PENDING').length, lang)}
            </div>
            <button
              onClick={() => handleTabChange('mutations')}
              className="text-xs text-[#006A4E] font-semibold hover:underline mt-1 block cursor-pointer"
            >
              {t('মিউটেশন কিউ দেখুন →', 'Review Mutation Queue →')}
            </button>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#006A4E] flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="panel p-4 border border-[#006A4E]/15 bg-white shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
              {t('খতিয়ান ও ওয়ারিশ সমন্বয়', 'Khatian Discrepancies')}
            </div>
            <div className="text-2xl font-extrabold text-[#C4891A] mt-1">
              {toBanglaDigits(flaggedKhatians.length, lang)}
            </div>
            <button
              onClick={() => handleTabChange('khatians')}
              className="text-xs text-[#C4891A] font-semibold hover:underline mt-1 block cursor-pointer"
            >
              {t('সমন্বয় শুনানি কিউ →', 'Resolve Discrepancies →')}
            </button>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-[#C4891A] flex items-center justify-center">
            <GitCompareArrows className="w-6 h-6" />
          </div>
        </div>

        <div className="panel p-4 border border-[#006A4E]/15 bg-white shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
              {t('নাগরিক বিরোধ ও আপত্তি', 'Dispute Tribunal')}
            </div>
            <div className="text-2xl font-extrabold text-rose-600 mt-1">
              {toBanglaDigits(disputes.length, lang)}
            </div>
            <button
              onClick={() => handleTabChange('disputes')}
              className="text-xs text-rose-600 font-semibold hover:underline mt-1 block cursor-pointer"
            >
              {t('ট্রাইব্যুনাল শুনানি দেখুন →', 'Review Disputes →')}
            </button>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Scale className="w-6 h-6" />
          </div>
        </div>

        <div className="panel p-4 border border-[#006A4E]/15 bg-white shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
              {t('খতিয়ান ও দলিল সত্যতা', 'Khatian & Deed Trust')}
            </div>
            <div className="text-2xl font-extrabold text-[#006A4E] mt-1">
              {toBanglaDigits(stats?.kpis?.ledger_integrity_pct ?? 100, lang)}%
            </div>
            <button
              onClick={() => handleTabChange('verifier')}
              className="text-xs text-[#006A4E] font-semibold hover:underline mt-1 block cursor-pointer"
            >
              {t('দলিল ও লেজার যাচাই →', 'Verify Deed & Ledger →')}
            </button>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#006A4E] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Operational Controlling Section */}
      <div className="panel p-6 space-y-6 animate-rise-delay">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#006A4E]/10 pb-4">
          <div>
            <h2 className="font-bold text-lg md:text-xl text-[#074f38] flex items-center gap-2">
              <Landmark className="w-5 h-5 text-[#006A4E]" />
              <span>
                {t(
                  'ই-মিউটেশন কিউ, খতিয়ান চেইন সমন্বয় ও বিরোধ নিষ্পত্তি ট্রাইব্যুনাল',
                  'e-Mutation Queue, Khatian Chain Reconciliation & Dispute Tribunal'
                )}
              </span>
            </h2>
            <p className="text-xs text-[#5F7A74] mt-0.5">
              {t(
                'নিবন্ধিত দলিল হতে স্বয়ংক্রিয়ভাবে আগত নামজারি অনুমোদন এবং বিএস খতিয়ান হস্তান্তর সম্পন্ন:',
                'Approve e-Mutation cases queued from Sub-Registry and update BS Khatian owner shares:'
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* 1. Field Verification Officer */}
            {role === 'field_verification_officer' && (
              <>
                <button
                  onClick={() => handleTabChange('field_reports')}
                  className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                    subTab === 'field_reports'
                      ? 'bg-[#006A4E] text-white shadow-xs'
                      : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>{t('মাঠ তদন্ত ও দখল যাচাই', 'Field Possession Inspection')}</span>
                </button>
                <button
                  onClick={() => handleTabChange('mutations')}
                  className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                    subTab === 'mutations'
                      ? 'bg-[#006A4E] text-white shadow-xs'
                      : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>{t('তদন্তাধীন নামজারি কিউ', 'Pending Verification Cases')} ({toBanglaDigits(mutations.length, lang)})</span>
                </button>
              </>
            )}

            {/* 2. Settlement Records Officer (Maker) */}
            {role === 'settlement_records_officer' && (
              <>
                <button
                  onClick={() => handleTabChange('survey_batches')}
                  className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                    subTab === 'survey_batches'
                      ? 'bg-[#006A4E] text-white shadow-xs'
                      : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{t('জরিপ ব্যাচ এন্ট্রি (মেকার)', 'Survey Batch Entry (Maker)')}</span>
                </button>
                <button
                  onClick={() => handleTabChange('khatians')}
                  className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                    subTab === 'khatians'
                      ? 'bg-[#006A4E] text-white shadow-xs'
                      : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                  }`}
                >
                  <GitCompareArrows className="w-4 h-4" />
                  <span>{t('সিএস-এসএ-আরএস-বিএস রূপান্তর', 'Survey Lineage Staging')}</span>
                </button>
              </>
            )}

            {/* 3. Settlement Checker */}
            {role === 'settlement_checker' && (
              <>
                <button
                  onClick={() => handleTabChange('onboarding')}
                  className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                    subTab === 'onboarding'
                      ? 'bg-[#006A4E] text-white shadow-xs'
                      : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('জরিপ ব্যাচ অনুমোদন (চেকার)', 'Approve Survey Batches')} ({toBanglaDigits(onboardingBatches.length, lang)})</span>
                </button>
                <button
                  onClick={() => handleTabChange('khatians')}
                  className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                    subTab === 'khatians'
                      ? 'bg-[#006A4E] text-white shadow-xs'
                      : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                  }`}
                >
                  <GitCompareArrows className="w-4 h-4" />
                  <span>{t('খতিয়ান অখণ্ডতা ও গেজেট', 'Khatian Integrity & Gazette')}</span>
                </button>
              </>
            )}

            {/* 4. UNO Supervisor */}
            {role === 'uno_supervisor' && (
              <>
                <button
                  onClick={() => handleTabChange('sla_overview')}
                  className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                    subTab === 'sla_overview'
                      ? 'bg-[#006A4E] text-white shadow-xs'
                      : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>{t('উপজেলা এসএলএ ও পারফরম্যান্স', 'Upazila SLA Performance')}</span>
                </button>
                <button
                  onClick={() => handleTabChange('mutations')}
                  className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                    subTab === 'mutations'
                      ? 'bg-[#006A4E] text-white shadow-xs'
                      : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                  }`}
                >
                  <ListChecks className="w-4 h-4" />
                  <span>{t('নামজারি তদারকি কিউ', 'Mutation Oversight Queue')}</span>
                </button>
                <button
                  onClick={() => handleTabChange('appeals')}
                  className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                    subTab === 'appeals'
                      ? 'bg-[#006A4E] text-white shadow-xs'
                      : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                  }`}
                >
                  <Scale className="w-4 h-4" />
                  <span>{t('আপিল ও অভিযোগ মনিটরিং', 'Appeals & Disputes')} ({toBanglaDigits(appealsList.length, lang)})</span>
                </button>
              </>
            )}

            {/* 5. Appellate Reviewer (ADC Revenue) */}
            {role === 'appellate_reviewer' && (
              <>
                <button
                  onClick={() => handleTabChange('appeals')}
                  className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                    subTab === 'appeals'
                      ? 'bg-[#006A4E] text-white shadow-xs'
                      : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                  }`}
                >
                  <Scale className="w-4 h-4" />
                  <span>{t('রাজস্ব আপিল ও ট্রাইব্যুনাল শুনানি', 'Revenue Appeals & Hearings')} ({toBanglaDigits(appealsList.length, lang)})</span>
                </button>
                <button
                  onClick={() => handleTabChange('disputes')}
                  className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                    subTab === 'disputes'
                      ? 'bg-[#006A4E] text-white shadow-xs'
                      : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                  }`}
                >
                  <AlertOctagon className="w-4 h-4" />
                  <span>{t('বিরোধ ট্রাইব্যুনাল রেকর্ডস', 'Dispute Tribunal Records')} ({toBanglaDigits(disputes.length, lang)})</span>
                </button>
                <button
                  onClick={() => handleTabChange('mutations')}
                  className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                    subTab === 'mutations'
                      ? 'bg-[#006A4E] text-white shadow-xs'
                      : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>{t('বিরোধপূর্ণ নামজারি রেকর্ড', 'Contested Mutations')}</span>
                </button>
              </>
            )}

            {/* 6. AC Land / Land Office Assistant / Admin / Default */}
            {!['field_verification_officer', 'settlement_records_officer', 'settlement_checker', 'uno_supervisor', 'appellate_reviewer'].includes(role) && (
              <>
                <button
                  onClick={() => handleTabChange('mutations')}
                  className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                    subTab === 'mutations'
                      ? 'bg-[#006A4E] text-white shadow-xs'
                      : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>
                    {role === 'land_office_assistant' ? t('নামজারি আবেদন কিউ (মেকার)', 'Mutation Queue (Maker)') : t('ই-মিউটেশন কিউ (অনুমোদন)', 'e-Mutation Queue (Approval)')} ({toBanglaDigits(mutations.length, lang)})
                  </span>
                </button>
                <button
                  onClick={() => handleTabChange('khatians')}
                  className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                    subTab === 'khatians'
                      ? 'bg-[#006A4E] text-white shadow-xs'
                      : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                  }`}
                >
                  <GitCompareArrows className="w-4 h-4" />
                  <span>
                    {t('খতিয়ান ও ওয়ারিশ সমন্বয়', 'Khatian & Heirs')} ({toBanglaDigits(flaggedKhatians.length, lang)})
                  </span>
                </button>
                <button
                  onClick={() => handleTabChange('disputes')}
                  className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                    subTab === 'disputes'
                      ? 'bg-[#006A4E] text-white shadow-xs'
                      : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                  }`}
                >
                  <Scale className="w-4 h-4" />
                  <span>
                    {t('বিরোধ ট্রাইব্যুনাল', 'Dispute Tribunal')} ({toBanglaDigits(disputes.length, lang)})
                  </span>
                </button>
                <button
                  onClick={() => handleTabChange('onboarding')}
                  className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                    subTab === 'onboarding'
                      ? 'bg-[#006A4E] text-white shadow-xs'
                      : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('অনবোর্ডিং ব্যাচ অনুমোদন (চেকার)', 'Approve Staging Batches')} ({toBanglaDigits(onboardingBatches.length, lang)})</span>
                </button>
                <button
                  onClick={() => handleTabChange('appeals')}
                  className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                    subTab === 'appeals'
                      ? 'bg-[#006A4E] text-white shadow-xs'
                      : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                  }`}
                >
                  <Scale className="w-4 h-4" />
                  <span>{t('আপিল মামলা', 'Appeals')} ({toBanglaDigits(appealsList.length, lang)})</span>
                </button>
              </>
            )}

            {/* Always available in Land Office: Explorer and Verifier */}
            <button
              onClick={() => handleTabChange('explorer')}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                subTab === 'explorer'
                  ? 'bg-[#006A4E] text-white shadow-xs'
                  : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>{t('খতিয়ান ও দাগ অনুসন্ধান', 'Khatian Explorer')}</span>
            </button>
            <button
              onClick={() => handleTabChange('verifier')}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                subTab === 'verifier'
                  ? 'bg-[#006A4E] text-white shadow-xs'
                  : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>{t('দলিল সত্যতা যাচাই', 'Verify Deed')}</span>
            </button>
          </div>
        </div>

        {actionMsg && (
          <div className="p-4 rounded-xl bg-[#EDF7F4] border-l-4 border-[#006A4E] text-[#006A4E] font-bold text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionMsg}</span>
          </div>
        )}

        {/* TAB 1: e-Mutation Queue Table */}
        {subTab === 'mutations' && (
          <div className="space-y-4">
            {/* Search and Status Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#EDF7F4]/80 p-3 rounded-xl border border-[#006A4E]/12">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-[#5F7A74]/80 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={mutationSearch}
                  onChange={(e) => setMutationSearch(e.target.value)}
                  placeholder={t('কেস নং, দলিল নং বা নাম খুঁজুন...', 'Search case, deed or party...')}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#006A4E]/20 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#006A4E]/30"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setMutationFilter(st)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer min-h-[32px] ${
                      mutationFilter === st
                        ? 'bg-[#006A4E] text-white shadow-xs'
                        : 'bg-white text-[#5F7A74] border border-[#006A4E]/12 hover:bg-[#EDF7F4]'
                    }`}
                  >
                    {st === 'ALL'
                      ? t('সকল (All)', 'All')
                      : st === 'PENDING'
                      ? t('অপেক্ষমান (PENDING)', 'Pending')
                      : st === 'APPROVED'
                      ? t('অনুমোদিত (APPROVED)', 'Approved')
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
                    <th className="py-3 px-3 font-bold">{t('কেস ও দলিল নং', 'Case & Deed')}</th>
                    <th className="py-3 px-3 font-bold">{t('মৌজা ও দাগ', 'Mouza & Dag')}</th>
                    <th className="py-3 px-3 font-bold">{t('হস্তান্তরকারী → গ্রহীতা', 'Parties')}</th>
                    <th className="py-3 px-3 font-bold">{t('পরিমাণ', 'Area')}</th>
                    <th className="py-3 px-3 font-bold">{t('স্ট্যাটাস', 'Status')}</th>
                    <th className="py-3 px-3 font-bold text-right">
                      {t('এসি ল্যান্ড সিদ্ধান্ত', 'AC Land Decision')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#006A4E]/10 bg-white">
                  {filteredMutations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#5F7A74]">
                        {loading
                          ? t('লোড হচ্ছে...', 'Loading...')
                          : t('কোনো মিউটেশন কেস পাওয়া যায়নি।', 'No mutation cases found.')}
                      </td>
                    </tr>
                  ) : (
                    filteredMutations.map((m) => (
                      <tr key={m.id} className="hover:bg-[#EDF7F4]/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-[#074f38]">
                          <div className="flex items-center gap-1.5">
                            <span>{m.case_no || `MUT-#${m.id}`}</span>
                          </div>
                          <div className="text-[10px] text-[#006A4E] font-sans">
                            {t('দলিল:', 'Deed:')} {m.deed_no}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#0A1F1C]/90">
                          {lang === 'bn' ? m.mouza_bn : m.mouza_en} — {t('দাগ নং', 'Dag')}{' '}
                          {toBanglaDigits(m.dag_no, lang)}
                        </td>
                        <td className="py-3 px-3 text-[#5F7A74]">
                          <div>
                            <span className="text-[#5F7A74]/80 text-[10px] mr-1">{t('বিক্রেতা:', 'From:')}</span>
                            {m.seller_name_bn}
                          </div>
                          <div>
                            <span className="text-[#5F7A74]/80 text-[10px] mr-1">{t('নামজারি:', 'To:')}</span>
                            <strong>{m.buyer_name_bn}</strong>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-bold text-[#0A1F1C]/90">
                          {toBanglaDigits(m.area_decimal, lang)} {t('শতাংশ', 'Decimal')}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold inline-block ${
                              m.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : m.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedMutation(m)}
                              className="px-2 py-1 rounded bg-[#EDF7F4] hover:bg-[#E4EFEA] text-[#0A1F1C]/90 font-bold text-[11px] flex items-center gap-1 cursor-pointer min-h-[30px]"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{t('শুনানি', 'Details')}</span>
                            </button>

                            {m.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleDecision(m.id, 'APPROVED')}
                                  className="px-2.5 py-1 rounded bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer min-h-[30px] transition-colors"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{t('অনুমোদন', 'Approve')}</span>
                                </button>
                                <button
                                  onClick={() => handleDecision(m.id, 'REJECTED')}
                                  className="px-2.5 py-1 rounded bg-[#FF3B4A] hover:bg-[#E02E3C] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer min-h-[30px] transition-colors"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>{t('না-মঞ্জুর', 'Reject')}</span>
                                </button>
                              </>
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

        {/* TAB 2: Khatian Chain & Heirs Reconciliation Control */}
        {subTab === 'khatians' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#EDF7F4]/60 border border-[#006A4E]/20 text-xs text-[#074f38] flex items-start gap-3">
              <GitCompareArrows className="w-5 h-5 text-[#006A4E] shrink-0 mt-0.5" />
              <div>
                <strong>{t('খতিয়ান চেইন অডিট প্রটোকল:', 'Khatian Lineage Audit Protocol:')}</strong>{' '}
                {t(
                  'সিএস (১৯৪০), এসএ (১৯৬২), আরএস (১৯৮৫) এবং বিএস (২০১২) খতিয়ানের মোট জমি ও ওয়ারিশ অংশের ফারায়েজ গণনা অসামঞ্জস্য হলে এসি ল্যান্ড শুনানির মাধ্যমে তা সংশোধন করতে পারেন।',
                  'When total plot area or inherited shares diverge between CS, SA, RS and BS surveys, the AC Land conducts a formal hearing to reconcile records.'
                )}
              </div>
            </div>

            {flaggedKhatians.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#EDF7F4] text-[#006A4E] font-bold text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>{t('সকল ত্রুটিপূর্ণ খতিয়ান সমন্বয় সম্পন্ন হয়েছে!', 'All flagged khatians have been reconciled!')}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {flaggedKhatians.map((fk) => (
                  <div
                    key={fk.id}
                    className="p-5 rounded-xl bg-amber-50/70 border border-amber-300 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-[#0A1F1C]">
                          {lang === 'bn' ? fk.mouza_bn : fk.mouza_en} — {t('দাগ নং', 'Dag')}{' '}
                          {toBanglaDigits(fk.dag_no, lang)}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-white font-mono">
                          খতিয়ান #{fk.khatian_no}
                        </span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-lg bg-amber-600 text-white font-extrabold">
                          {fk.reconcile_status}
                        </span>
                      </div>
                      <p className="text-xs text-[#0A1F1C]/90 leading-relaxed">
                        {lang === 'bn' ? fk.anomaly_note_bn : fk.anomaly_note_en}
                      </p>
                      <div className="text-[11px] text-[#5F7A74] font-mono pt-1">
                        নথিভুক্ত পরিমাণ: {fk.total_area_decimal} শতাংশ
                      </div>
                    </div>

                    <button
                      onClick={() => handleReconcileKhatian(fk.plot_id, Number(fk.total_area_decimal))}
                      className="px-4 py-2.5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-extrabold text-xs shrink-0 cursor-pointer min-h-[38px] flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t('শুনানি ও জরিপের মাধ্যমে সমন্বয় করুন', 'Reconcile Khatian Lineage')}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Citizen Dispute Resolution Control */}
        {subTab === 'disputes' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#EDF7F4]/80 border border-[#006A4E]/12 text-xs text-[#0A1F1C]/90 flex items-start gap-3">
              <Scale className="w-5 h-5 text-[#006A4E] shrink-0 mt-0.5" />
              <div>
                <strong>{t('এসি ল্যান্ড ট্রাইব্যুনাল এক্তিয়ার:', 'AC Land Dispute Tribunal Jurisdiction:')}</strong>{' '}
                {t(
                  'নাগরিক কর্তৃক দায়েরকৃত ওয়ারিশ জালিয়াতি বা সীমা বিরোধের ক্ষেত্রে এসি ল্যান্ড দাগের জমি ফ্রিজ (হস্তান্তর নিষিদ্ধ) করতে পারেন অথবা শুনানি শেষে নিষ্পত্তি করতে পারেন।',
                  'Under State Acquisition & Tenancy Act, AC Land can place an emergency hold (freeze) on disputed plots or dismiss fraudulent complaints.'
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {disputes.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#EDF7F4]/80 text-[#5F7A74] text-xs text-center border border-[#006A4E]/12">
                  {t('কোনো অমীমাংসিত অভিযোগ নেই।', 'No pending citizen disputes.')}
                </div>
              ) : (
                disputes.map((dsp) => (
                  <div
                    key={dsp.id}
                    className={`p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs ${
                      dsp.status === 'OPEN'
                        ? 'bg-amber-50/60 border-amber-300'
                        : 'bg-white border-[#006A4E]/12'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-[#0A1F1C]">
                          {lang === 'bn' ? dsp.mouza_bn : dsp.mouza_en} — {t('দাগ নং', 'Dag')} {dsp.dag_no}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#074f38] text-white font-mono font-bold">
                          {dsp.dispute_type}
                        </span>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-lg font-extrabold ${
                            dsp.status === 'OPEN'
                              ? 'bg-amber-500 text-white'
                              : dsp.status === 'UPHELD_FROZEN'
                              ? 'bg-rose-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {dsp.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#0A1F1C]/90 leading-relaxed">{dsp.description_bn}</p>
                      {dsp.complainant_name_bn && (
                        <div className="text-[11px] text-[#5F7A74]">
                          {t('অভিযোগকারী:', 'Complainant:')} <strong>{dsp.complainant_name_bn}</strong>{' '}
                          {dsp.complainant_nid && `(NID: ${dsp.complainant_nid})`}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      {dsp.status === 'OPEN' && (
                        <>
                          <button
                            onClick={() => handleResolveDispute(dsp.id, 'UPHELD_FROZEN')}
                            className="px-3.5 py-2 rounded-lg bg-[#FF3B4A] hover:bg-[#E02E3C] text-white font-bold text-xs cursor-pointer min-h-[36px] flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <span>🔒 {t('দাগ ফ্রিজ (Freeze Plot)', 'Uphold & Freeze')}</span>
                          </button>
                          <button
                            onClick={() => handleResolveDispute(dsp.id, 'RESOLVED_DISMISSED')}
                            className="px-3.5 py-2 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs cursor-pointer min-h-[36px] flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t('নিষ্পত্তি ও খারিজ (Dismiss)', 'Resolve & Dismiss')}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: In-Panel Officer Khatian Explorer */}
        {subTab === 'explorer' && (
          <OfficerKhatianExplorer
            onSelectPlotForAction={(plotId) => {
              handleTabChange('khatians');
            }}
            actionLabel={t('খতিয়ান রেকর্ড সমন্বয়', 'Reconcile Khatian')}
            actionType="reconcile"
          />
        )}

        {/* TAB 5: In-Panel Officer Deed Verifier */}
        {subTab === 'verifier' && <OfficerDeedVerifier />}

        {/* TAB 6: Field Possession & Inspection Reports (Field Verification Officer / Surveyor) */}
        {subTab === 'field_reports' && (
          <div className="space-y-6">
            <div className="bg-[#F4F9F6] p-5 rounded-xl border border-[#006A4E]/15">
              <h3 className="font-bold text-base text-[#074f38] flex items-center gap-2 mb-1">
                <Search className="w-5 h-5 text-[#006A4E]" />
                <span>{t('জমির সরেজমিন মাঠ তদন্ত ও দখল প্রতিবেদন (Field Possession Inspection)', 'Field Possession & Boundary Inspection')}</span>
              </h3>
              <p className="text-xs text-[#5F7A74]">
                {t(
                  'নামজারি অনুমোদনের পূর্বে সার্ভেয়ার/কানুনগো কর্তৃক সরেজমিন সীমানা, প্রকৃত দখলদার এবং বকেয়া ভূমি উন্নয়ন কর যাচাই।',
                  'On-site field verification of physical possession, boundary demarcation, and land tax status prior to mutation approval.'
                )}
              </p>

              <form onSubmit={handleSubmitFieldReport} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {t('দাগ নম্বর নির্বাচন:', 'Select Plot (Dag):')}
                  </label>
                  <select
                    value={fieldForm.dag_no}
                    onChange={(e) => setFieldForm({ ...fieldForm, dag_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold"
                  >
                    <option value="101">দাগ ১০১ — বিরুলিয়া (আবেদনকারী: মো. রফিকুল ইসলাম)</option>
                    <option value="102">দাগ ১০২ — বিরুলিয়া (তদন্তাধীন দ্বৈত বিক্রয়)</option>
                    <option value="103">দাগ ১০৩ — বিরুলিয়া (অতিরিক্ত জমি তদন্ত)</option>
                    <option value="107">দাগ ১০৭ — বিরুলিয়া (আরএস-বিএস সীমানা বিরোধ)</option>
                    <option value="108">দাগ ১০৮ — বিরুলিয়া (ওয়ারিশ অংশ তদন্ত)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {t('প্রকৃত সরেজমিন দখলদার:', 'Physical Possession Status:')}
                  </label>
                  <select
                    value={fieldForm.possession}
                    onChange={(e) => setFieldForm({ ...fieldForm, possession: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold"
                  >
                    <option value="VERIFIED">✔ আবেদনকারীর নিরঙ্কুশ দখল বিদ্যমান (Verified)</option>
                    <option value="CONTESTED">⚠ স্থানীয় ওয়ারিশদের সাথে দখল বিরোধ রয়েছে (Contested)</option>
                    <option value="UNOCCUPIED">✕ জমি পতিত / অনাবাদী অবস্থায় রয়েছে (Unoccupied)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {t('সীমানা ও ক্যাডাস্ট্রাল নকশা মিল:', 'Boundary Demarcation Check:')}
                  </label>
                  <select
                    value={fieldForm.boundary}
                    onChange={(e) => setFieldForm({ ...fieldForm, boundary: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold"
                  >
                    <option value="MATCHED">✔ মৌজা ম্যাপ ও সীমানা খুঁটির সাথে হুবহু মিল (Matched)</option>
                    <option value="DISPUTED">⚠ পার্শ্ববর্তী দাগের সাথে আংশিক সীমানা ব্যত্যয় (Disputed)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {t('ভূমি উন্নয়ন কর (LD Tax) স্ট্যাটাস:', 'LD Tax Payment Status:')}
                  </label>
                  <select
                    value={fieldForm.tax_status}
                    onChange={(e) => setFieldForm({ ...fieldForm, tax_status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold"
                  >
                    <option value="PAID">✔ বর্তমান অর্থবছর পর্যন্ত কর হালনাগাদ (Paid)</option>
                    <option value="DUE">⚠ বকেয়া কর আদায়যোগ্য (Due)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {t('সার্ভেয়ার / কানুনগো তদন্ত প্রতিবেদন মন্তব্য:', 'Surveyor Inspection Remarks:')}
                  </label>
                  <textarea
                    rows={2}
                    value={fieldForm.remarks}
                    onChange={(e) => setFieldForm({ ...fieldForm, remarks: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold"
                    required
                  />
                </div>

                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    className="btn-primary text-xs flex items-center gap-1.5 py-2 px-4 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{t('মাঠ তদন্ত প্রতিবেদন দাখিল ও স্বাক্ষর করুন', 'Submit Official Inspection Report')}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Field Investigation Docket */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-800">
                {t('তদন্তাধীন ও অনুমোদিত মাঠ প্রতিবেদন তালিকা:', 'Pending Field Inspection Records:')}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                  <div className="flex items-center justify-between font-bold text-xs text-emerald-950">
                    <span>দাগ নং ১০১ • বিরুলিয়া</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[10px]">VERIFIED</span>
                  </div>
                  <p className="text-xs text-slate-600">মাঠ সীমানা ও দখল আবেদনকারীর অনুকূলে পাওয়া গেছে। কোনো আপত্তি নেই।</p>
                  <div className="text-[10px] text-slate-500 font-mono">ইনস্পেকশন অফিসার: মো. নুরুল ইসলাম (সার্ভেয়ার)</div>
                </div>

                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
                  <div className="flex items-center justify-between font-bold text-xs text-amber-950">
                    <span>দাগ নং ১০৭ • বিরুলিয়া</span>
                    <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px]">DISCREPANCY</span>
                  </div>
                  <p className="text-xs text-slate-600">আরএস খতিয়ানে ১৮ শতক থাকলেও বিএস জরিপে ২৬ শতক দেখানো হয়েছে। অতিরিক্ত ৮ শতকের সীমানা বিরোধ বিদ্যমান।</p>
                  <div className="text-[10px] text-slate-500 font-mono">তদন্ত কর্মকর্তা: এস এম জাকারিয়া (কানুনগো)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: Survey Batch Staging Ingestion (Settlement Records Officer - Maker) */}
        {subTab === 'survey_batches' && (
          <div className="space-y-6">
            <div className="bg-[#F4F9F6] p-5 rounded-xl border border-[#006A4E]/15">
              <h3 className="font-bold text-base text-[#074f38] flex items-center gap-2 mb-1">
                <FileSpreadsheet className="w-5 h-5 text-[#006A4E]" />
                <span>{t('নতুন জরিপ খতিয়ান ব্যাচ এন্ট্রি ও ক্রিপ্টোগ্রাফিক হ্যাশিং (Survey Batch Maker)', 'Survey Batch Staging Entry')}</span>
              </h3>
              <p className="text-xs text-[#5F7A74]">
                {t(
                  'সিএস, এসএ, আরএস ও বিএস মাঠ জরিপ হতে আগত রেকর্ডসমূহ প্রস্তুত করে ক্রিপ্টোগ্রাফিক হ্যাশ সিল প্যাকেজে সংরক্ষণ করুন। চেকার অনুমোদন ছাড়া গেজেট প্রকাশ পাবে না।',
                  'Ingest survey records from CS, SA, RS, and BS survey sheets. Computes SHA-256 seal. Requires four-eyes checker approval.'
                )}
              </p>

              <form onSubmit={handleCreateSurveyBatch} className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {t('জরিপের ধরন:', 'Survey Type:')}
                  </label>
                  <select
                    value={surveyBatchForm.record_type}
                    onChange={(e) => setSurveyBatchForm({ ...surveyBatchForm, record_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold"
                  >
                    <option value="SURVEY_BS">বিএস জরিপ (Bangladesh Survey)</option>
                    <option value="SURVEY_RS">আরএস জরিপ (Revisional Survey)</option>
                    <option value="SURVEY_SA">এসএ জরিপ (State Acquisition)</option>
                    <option value="SURVEY_CS">সিএস জরিপ (Cadastral Survey)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('দাগ নং:', 'Dag No:')}</label>
                  <input
                    type="text"
                    value={surveyBatchForm.dag_no}
                    onChange={(e) => setSurveyBatchForm({ ...surveyBatchForm, dag_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('মৌজা:', 'Mouza:')}</label>
                  <input
                    type="text"
                    value={surveyBatchForm.mouza}
                    onChange={(e) => setSurveyBatchForm({ ...surveyBatchForm, mouza: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('জমির পরিমাণ (শতক):', 'Area (dec):')}</label>
                  <input
                    type="text"
                    value={surveyBatchForm.area_decimal}
                    onChange={(e) => setSurveyBatchForm({ ...surveyBatchForm, area_decimal: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('মালিক / প্রজার নাম:', 'Owner / Tenant Name:')}</label>
                  <input
                    type="text"
                    value={surveyBatchForm.owner_name}
                    onChange={(e) => setSurveyBatchForm({ ...surveyBatchForm, owner_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('হিস্যা / অংশ:', 'Share Fraction:')}</label>
                  <input
                    type="text"
                    value={surveyBatchForm.share_fraction}
                    onChange={(e) => setSurveyBatchForm({ ...surveyBatchForm, share_fraction: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold"
                    required
                  />
                </div>

                <div className="sm:col-span-2 md:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={creatingBatch}
                    className="btn-primary text-xs flex items-center gap-1.5 py-2 px-4 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{creatingBatch ? t('হ্যাশ সিল হচ্ছে...', 'Sealing...') : t('জরিপ ব্যাচ তৈরি ও হ্যাশ সিল করুন', 'Create Survey Batch & Seal Hash')}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Recent Survey Batches */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-800">
                {t('প্রস্তুতকৃত জরিপ ব্যাচসমূহ (স্ট্যাটাস ট্র্যাকিং):', 'Staged Survey Batches:')}
              </h4>
              <div className="space-y-2">
                {onboardingBatches.map((b: any) => (
                  <div key={b.id} className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{b.batch_no} • {b.record_type}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">Hash: {b.batch_hash?.substring(0, 24)}...</div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${b.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: Upazila SLA Oversight & Performance (UNO Supervisor) */}
        {subTab === 'sla_overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white border border-[#006A4E]/15 shadow-xs">
                <div className="text-[11px] font-bold uppercase text-slate-500">{t('সংবিধিবদ্ধ এসএলএ টার্গেট', 'Statutory SLA Target')}</div>
                <div className="text-2xl font-black text-[#006A4E] mt-1">২৮ {t('দিন', 'Days')}</div>
                <div className="text-[11px] text-emerald-700 font-semibold mt-1">গড় নিষ্পত্তি: ১৮.৪ দিন (অন-ট্র্যাক)</div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#006A4E]/15 shadow-xs">
                <div className="text-[11px] font-bold uppercase text-slate-500">{t('এসএলএ কমপ্লায়েন্স রেট', 'SLA Compliance Rate')}</div>
                <div className="text-2xl font-black text-[#006A4E] mt-1">৯৪.২%</div>
                <div className="text-[11px] text-emerald-700 font-semibold mt-1">লক্ষ্যমাত্রার চেয়ে এগিয়ে</div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#006A4E]/15 shadow-xs">
                <div className="text-[11px] font-bold uppercase text-slate-500">{t('এই মাসে নিষ্পত্তিকৃত নামজারি', 'Mutations Disposed (Month)')}</div>
                <div className="text-2xl font-black text-slate-800 mt-1">৩৪ {t('টি', 'Cases')}</div>
                <div className="text-[11px] text-slate-500 font-semibold mt-1">সাভার উপজেলা ভূমি অফিস</div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-rose-200 bg-rose-50/40 shadow-xs">
                <div className="text-[11px] font-bold uppercase text-rose-700">{t('বিলম্বিত ফাইল (২১+ দিন)', 'Delayed Files (21+ Days)')}</div>
                <div className="text-2xl font-black text-rose-700 mt-1">২ {t('টি', 'Cases')}</div>
                <div className="text-[11px] text-rose-600 font-semibold mt-1">এসকেলেশন নোটিশ প্রয়োজন</div>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{t('বিলম্বিত নামজারি ও এসকেলেশন ট্র্যাকার:', 'Delayed Mutation Escalations:')}</h4>
                  <p className="text-xs text-slate-500">{t('যেসব আবেদনের বয়স ২১ দিন অতিক্রম করেছে, ইউএনও মহোদয়ের পক্ষ থেকে তাগিদপত্র ইস্যু করুন।', 'Directives for applications older than 21 days.')}</p>
                </div>
                <button
                  onClick={handleSendSlaEscalation}
                  disabled={slaNoticeSent}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{slaNoticeSent ? t('তাগিদপত্র প্রেরিত হয়েছে ✔', 'Directive Dispatched ✔') : t('বিলম্বিত ফাইলে জরুরি তাগিদপত্র জারি করুন', 'Issue Urgent SLA Escalation Notice')}</span>
                </button>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-amber-950">কেস নং MUT-2026-0008 • দাগ ১০৮ • বিরুলিয়া</span>
                    <p className="text-[11px] text-slate-600">ওয়ারিশদের উপস্থিতি না হওয়ায় ২২ দিন ধরে অপেক্ষমাণ।</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">২২ দিন অতিবাহিত</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: Revenue Appeals & Tribunal (ADC Revenue / Appellate Reviewer) */}
        {subTab === 'appeals' && (
          <div className="space-y-6">
            <div className="bg-[#F4F9F6] p-5 rounded-xl border border-[#006A4E]/15">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-[#074f38] flex items-center gap-2 mb-1">
                    <Scale className="w-5 h-5 text-[#006A4E]" />
                    <span>{t('রাজস্ব আপিল ট্রাইব্যুনাল ও শুনানি কিউ (Appellate Tribunal)', 'Revenue Appeals Docket & Stay Orders')}</span>
                  </h3>
                  <p className="text-xs text-[#5F7A74]">
                    {t(
                      'এসি ল্যান্ডের আদেশের বিরুদ্ধে অতিরিক্ত জেলা প্রশাসক (রাজস্ব) সমীপে দায়েরকৃত আপিল পর্যালোচনা ও স্থগিতাদেশ জারি।',
                      'Appeals against AC Land orders. Granting Stay Orders immediately locks the plot against any sale or mutation.'
                    )}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#006A4E] text-xs font-bold">
                  {toBanglaDigits(appealsList.length, lang)} {t('টি আপিল তালিকাভুক্ত', 'Appeals in Docket')}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {appealsList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">কোনো আপিল আবেদন নথিভুক্ত নেই।</div>
              ) : (
                appealsList.map((apl: any) => (
                  <div key={apl.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                      <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                        <span>{apl.appeal_no}</span>
                        <span className="text-xs text-slate-500">• দাগ নং {toBanglaDigits(apl.plot_id || 108, lang)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${apl.status === 'STAY_ORDER_GRANTED' ? 'bg-rose-100 text-rose-800' : apl.status === 'MUTATION_UPHELD' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {apl.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">শুনানি তারিখ: {apl.hearing_date || '২০২৬-১০-২৪'}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                      <div><strong>আপিলকারী:</strong> {apl.appellant_name_bn || 'মোসা. রাবেয়া খাতুন'} (NID: {apl.appellant_nid || '****'})</div>
                      <div><strong>বনাম:</strong> এসি ল্যান্ড ও নামজারি পক্ষগণ</div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                      <strong>আপিলের কারণ:</strong> {apl.reason_bn}
                    </div>

                    {apl.status === 'HEARING_SCHEDULED' && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t justify-end">
                        <button
                          onClick={() => handleDecideAppeal(apl.id, 'STAY_ORDER_GRANTED', 'আপিল চূড়ান্ত নিষ্পত্তি না হওয়া পর্যন্ত এই দাগের সকল হস্তান্তর স্থগিতাদেশ (Stay Order) মঞ্জুর করা হলো।')}
                          className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>🔒 {t('স্থগিতাদেশ ও বিক্রয় লক জারি করুন (Stay Order)', 'Grant Stay Order & Lock Plot')}</span>
                        </button>
                        <button
                          onClick={() => handleDecideAppeal(apl.id, 'MUTATION_UPHELD', 'নথিপত্র পর্যালোচনায় এসি ল্যান্ডের আদেশ বহাল রাখা হলো।')}
                          className="px-3.5 py-1.5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t('নামজারি আদেশ বহাল (Uphold)', 'Uphold Mutation')}</span>
                        </button>
                        <button
                          onClick={() => handleDecideAppeal(apl.id, 'MUTATION_SET_ASIDE', 'নামজারি আদেশে অসামঞ্জস্য থাকায় তা বাতিল করে পুনর্বিবেচনার নির্দেশ দেওয়া হলো।')}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                        >
                          <Scale className="w-3.5 h-3.5" />
                          <span>{t('বাতিল ও পুনর্বিবেচনা (Set Aside)', 'Set Aside & Remand')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 10: Staging Data Onboarding Approvals (Settlement Checker / AC Land) */}
        {subTab === 'onboarding' && (
          <div className="space-y-6">
            <div className="bg-[#F4F9F6] p-5 rounded-xl border border-[#006A4E]/15">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-[#074f38] flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-5 h-5 text-[#006A4E]" />
                    <span>{t('অনবোর্ডিং ডাটা ব্যাচ অনুমোদন (চার-চক্ষু নীতি চেকার)', 'Staging Data Onboarding Approvals')}</span>
                  </h3>
                  <p className="text-xs text-[#5F7A74]">
                    {t(
                      'মেকার কর্তৃক প্রস্তুতকৃত জরিপ বা রেজিস্ট্রি ড্রাফট ব্যাচ পর্যালোচনা ও চার-চক্ষু নীতি (Separation of Duties) অনুসারে অনুমোদন প্রদান। প্রস্তুতকারী নিজে অনুমোদন করতে পারবেন না।',
                      'Four-eyes principle: Maker cannot approve their own batch. Only authorized checker can grant final approval.'
                    )}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#006A4E] text-xs font-bold">
                  {toBanglaDigits(onboardingBatches.length, lang)} {t('টি ব্যাচ তালিকাভুক্ত', 'Batches in Queue')}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {onboardingBatches.map((batch: any) => (
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

                  <div className="text-xs text-slate-600 font-mono">
                    SHA-256 Batch Hash: {batch.batch_hash}
                  </div>

                  {batch.status === 'SUBMITTED' && (
                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <button
                        onClick={() => handleDecideBatch(batch.id, 'APPROVED')}
                        className="px-4 py-1.5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t('✔ ব্যাচ অনুমোদন করুন (Approve)', 'Approve Batch')}</span>
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
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hearing / Case Details Modal */}
      {selectedMutation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-[#006A4E]/12 space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-[#006A4E]" />
                <h3 className="font-extrabold text-[#0A1F1C] text-sm">
                  {t('ই-মিউটেশন কেস শুনানি বিবরণী', 'e-Mutation Hearing Record')}
                </h3>
              </div>
              <button
                onClick={() => setSelectedMutation(null)}
                className="p-1 rounded text-[#5F7A74]/80 hover:text-[#5F7A74] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#0A1F1C]/90">
              <div className="p-3 bg-[#EDF7F4]/80 rounded-lg space-y-1 font-mono">
                <div><strong>CASE NO:</strong> {selectedMutation.case_no || `MUT-#${selectedMutation.id}`}</div>
                <div><strong>REGISTERED DEED NO:</strong> {selectedMutation.deed_no}</div>
                <div><strong>MOUZA & DAG:</strong> {selectedMutation.mouza_bn} — দাগ নং {selectedMutation.dag_no}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#EDF7F4]/80 rounded-lg">
                  <span className="text-[10px] text-[#5F7A74] block">{t('মূল মালিক (Seller):', 'Seller:')}</span>
                  <strong>{selectedMutation.seller_name_bn}</strong>
                </div>
                <div className="p-3 bg-[#EDF7F4]/80 rounded-lg">
                  <span className="text-[10px] text-[#5F7A74] block">{t('নতুন খতিয়ান গ্রহীতা (Buyer):', 'Buyer:')}</span>
                  <strong>{selectedMutation.buyer_name_bn}</strong>
                </div>
              </div>

              <div className="p-3 bg-[#EDF7F4] border border-[#006A4E]/30 rounded-lg text-[#006A4E]">
                <span className="text-[10px] font-bold block">{t('হস্তান্তরিত জমির পরিমাণ:', 'Mutation Area:')}</span>
                <span className="text-base font-extrabold">
                  {toBanglaDigits(selectedMutation.area_decimal, lang)} {t('শতাংশ', 'Decimal')}
                </span>
                <p className="text-[11px] mt-1">
                  {t(
                    'অনুমোদন দিলে বিক্রেতার বিএস খতিয়ান হতে স্বয়ংক্রিয়ভাবে এই অংশ বিয়োগ হয়ে ক্রেতার নামে নতুন বিএস খতিয়ান সৃষ্টি হবে।',
                    'Approving will deduct area from seller and mint new BS khatian entry for buyer.'
                  )}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              {selectedMutation.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => handleDecision(selectedMutation.id, 'REJECTED')}
                    className="px-4 py-2 rounded-lg bg-[#FF3B4A] text-white text-xs font-bold cursor-pointer"
                  >
                    {t('না-মঞ্জুর করুন', 'Reject')}
                  </button>
                  <button
                    onClick={() => handleDecision(selectedMutation.id, 'APPROVED')}
                    className="px-4 py-2 rounded-lg bg-[#006A4E] text-white text-xs font-bold cursor-pointer"
                  >
                    {t('শুনানি মঞ্জুর ও খতিয়ান হালনাগাদ', 'Approve & Mutate')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
