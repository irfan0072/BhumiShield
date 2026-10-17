import React, { useState, useEffect, useMemo } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi, RiskReportResponse } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { ResultHeroBanner } from '../components/ResultHeroBanner';
import { OfficerKhatianExplorer } from '../components/OfficerKhatianExplorer';
import {
  Building2,
  Lock,
  Unlock,
  ShieldAlert,
  FileBadge,
  Printer,
  X,
  KeyRound,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  PlusCircle
} from 'lucide-react';

export type BankTab = 'mortgages' | 'new_lien' | 'noc' | 'khatian';

export const BankOfficerPage: React.FC = () => {
  const { lang, role, user, setRole, setUser, setToken, activeSubTab, setActiveSubTab, t } = useAppUI();
  const [subTab, setSubTab] = useState<BankTab>(() => {
    if (activeSubTab && ['mortgages', 'new_lien', 'noc', 'khatian'].includes(activeSubTab)) {
      return activeSubTab as BankTab;
    }
    return role === 'bank_officer' ? 'new_lien' : 'mortgages';
  });
  const [plots, setPlots] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [mortgages, setMortgages] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  const [plotId, setPlotId] = useState<number>(6);
  const [borrowerId, setBorrowerId] = useState<number>(11);
  const [bankNameBn, setBankNameBn] = useState(user?.office_bn?.split(',')[0] || '');
  const [bankNameEn, setBankNameEn] = useState(user?.office_en?.split(',')[0] || '');
  const [mortgagedArea, setMortgagedArea] = useState('1');
  const [branchName, setBranchName] = useState('সাভার শাখা');
  const [loanAmount, setLoanAmount] = useState('3000000');

  const [collateralReport, setCollateralReport] = useState<RiskReportResponse | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [nocModalData, setNocModalData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Search and filter for mortgage register
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'RELEASED'>('ALL');

  const bankPresets = [
    { bn: 'বাংলাদেশ কৃষি ব্যাংক', en: 'Bangladesh Krishi Bank', branch: 'সাভার শাখা' },
    { bn: 'সোনালী ব্যাংক পিএলসি', en: 'Sonali Bank PLC', branch: 'মতিঝিল শাখা' },
    { bn: 'ব্র্যাক ব্যাংক পিএলসি', en: 'BRAC Bank PLC', branch: 'গুলশান শাখা' },
    { bn: 'ইসলামী ব্যাংক বাংলাদেশ', en: 'Islami Bank Bangladesh', branch: 'ধানমন্ডি শাখা' },
    { bn: 'ডাচ-বাংলা ব্যাংক পিএলসি', en: 'Dutch-Bangla Bank PLC', branch: 'উত্তরা শাখা' },
  ];

  const loadData = () => {
    Promise.all([
      BhumiApi.getPlots(),
      BhumiApi.getPersons(),
      BhumiApi.getMortgages(),
      BhumiApi.getStatsSummary(),
    ]).then(([plts, pers, mrts, st]) => {
      setPlots(plts);
      setPersons(pers);
      setMortgages(mrts);
      setStats(st);
    }).catch(() => setErrorMsg(t('তথ্য লোড করা যায়নি।', 'Could not load bank records.')));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeSubTab && ['mortgages', 'new_lien', 'noc', 'khatian'].includes(activeSubTab)) {
      setSubTab(activeSubTab as BankTab);
      if (activeSubTab === 'noc') {
        setStatusFilter('RELEASED');
      } else if (activeSubTab === 'mortgages') {
        setStatusFilter('ALL');
      }
    }
  }, [activeSubTab]);

  const handleTabChange = (target: BankTab) => {
    setSubTab(target);
    setActiveSubTab(target);
    if (target === 'noc') {
      setStatusFilter('RELEASED');
    } else if (target === 'mortgages') {
      setStatusFilter('ALL');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNocModalData(null);
      }
    };
    if (nocModalData) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [nocModalData]);

  const switchToBankRole = async (targetRole: UserRole = 'bank_officer') => {
    const res = await BhumiApi.switchDemoRole(targetRole);
    if (res?.access_token && res?.user) {
      setToken(res.access_token);
      setUser(res.user);
    } else {
      setRole(targetRole);
    }
  };

  const handleCheckCollateral = async () => {
    setErrorMsg(null);
    setActionMsg(null);
    setLoading(true);
    try {
      const res = await BhumiApi.checkBankCollateral({
        plot_id: Number(plotId), borrower_id: Number(borrowerId),
        area_mortgaged_decimal: Number(mortgagedArea),
      });
      setCollateralReport(res);
    } catch (err: any) {
      setErrorMsg((lang === 'bn' ? err?.response?.data?.message_bn : err?.response?.data?.message_en) || t('জামানত যাচাই ব্যর্থ।', 'Collateral check failed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterLien = async () => {
    setErrorMsg(null);
    setActionMsg(null);
    setLoading(true);
    try {
      const res = await BhumiApi.createMortgage({
        plot_id: Number(plotId),
        borrower_id: Number(borrowerId),
        bank_name_bn: bankNameBn,
        bank_name_en: bankNameEn,
        area_mortgaged_decimal: Number(mortgagedArea),
        branch_name: branchName,
        loan_amount_bdt: Number(loanAmount),
      });
      setActionMsg(lang === 'bn' ? res.message_bn : res.message_en);
      loadData();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.response?.data;
      setErrorMsg(
        detail
          ? lang === 'bn'
            ? detail.message_bn
            : detail.message_en
          : t(
              'এই দাগে ইতিমধ্যে একটি সক্রিয় মর্টগেজ রয়েছে! দ্বৈত বন্ধক (Double Mortgage) ব্লক করা হয়েছে।',
              'Plot already has an ACTIVE mortgage! Double mortgage blocked.'
            )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async (id: number) => {
    try {
      await BhumiApi.releaseMortgage(id);
      setActionMsg(
        t(
          'মর্টগেজ সফলভাবে অবমুক্ত করা হয়েছে এবং ডিজিটাল NOC প্রস্তুত!',
          'Mortgage successfully released and Digital NOC generated!'
        )
      );
      loadData();
    } catch {
      setErrorMsg(t('মর্টগেজ অবমুক্ত করতে সমস্যা হয়েছে।', 'Failed to release mortgage.'));
    }
  };

  const handleViewNoc = async (id: number) => {
    try {
      const res = await BhumiApi.getMortgageNoc(id);
      setNocModalData(res);
    } catch (err: any) {
      const msg = (lang === 'bn' ? err?.response?.data?.message_bn : err?.response?.data?.message_en) || t('এনওসি সনদ লোড করা সম্ভব হয়নি।', 'Failed to load NOC certificate.');
      setErrorMsg(msg);
    }
  };

  const filteredMortgages = useMemo(() => {
    return mortgages.filter((m) => {
      if (statusFilter !== 'ALL' && m.status !== statusFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.bank_name_bn?.toLowerCase().includes(q) ||
        m.bank_name_en?.toLowerCase().includes(q) ||
        m.dag_no?.toString().includes(q) ||
        m.borrower_name_bn?.toLowerCase().includes(q) ||
        m.branch_name?.toLowerCase().includes(q)
      );
    });
  }, [mortgages, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      <header className="page-intro animate-rise">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1>
              {role === 'bank_manager'
                ? t('ব্যাংক শাখা ব্যবস্থাপক কনসোল (চেকার ও এনওসি কর্তৃপক্ষ)', 'Bank Branch Manager Console (Checker)')
                : role === 'bank_officer'
                ? t('ব্যাংক ক্রেডিট অফিসার কনসোল (লিয়েন মেকার)', 'Bank Credit Officer Console (Lien Maker)')
                : t('ব্যাংক অফিসার কনসোল', 'Bank Officer Console')}
            </h1>
            <p>
              {role === 'bank_manager'
                ? t('মর্টগেজ লিয়েন অনুমোদন, ঋণ পরিশোধ পরবর্তী ডিজিটাল NOC ক্লিয়ারেন্স এবং ঋণ পোর্টফোলিও তদারকি।', 'Approve mortgage liens, issue digital release NOC certificates, and oversee loan collateral.')
                : t('জামানত যাচাই, মর্টগেজ লিয়েন ড্রাফট অন্তর্ভুক্তি এবং খতিয়ান সত্যতা যাচাই।', 'Verify collateral, prepare new mortgage lien drafts, and inspect khatian records.')}
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-300 bg-emerald-50 text-emerald-900">
            {role === 'bank_manager'
              ? t('চেকার ও এনওসি কর্তৃপক্ষ', 'Checker & NOC Authority')
              : role === 'bank_officer'
              ? t('লিয়েন প্রস্তুতকারী (মেকার)', 'Lien Preparer (Maker)')
              : t('ব্যাংক ইউজার', 'Bank User')}
          </span>
        </div>
      </header>
      {/* RBAC Guard Notice if not logged in as bank_officer, bank_manager or admin */}
      {role !== 'bank_officer' && role !== 'bank_manager' && role !== 'admin' && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0A1F1C]">
            <KeyRound className="w-4 h-4 text-[#C4891A]" />
            <span>
              {t(
                'দাপ্তরিক অ্যাক্সেস নোটিশ: ব্যাংক মর্টগেজ ও ডিজিটাল NOC কন্ট্রোল ব্যবহার করতে ব্যাংক সেশনে প্রবেশ করুন।',
                'Access Notice: Switch to Bank Officer or Manager session for mortgage lien and Digital NOC controls.'
              )}
            </span>
          </div>
          <button
            onClick={() => switchToBankRole('bank_officer')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#074f38] hover:bg-[#053b2a] text-white font-bold text-xs cursor-pointer min-h-[36px] transition-colors"
          >
            {t('ব্যাংক প্যানেলে প্রবেশ করুন →', 'Activate Bank Officer Session →')}
          </button>
        </div>
      )}

      {/* Bank Officer Operational KPI Strip (Role-Specific) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-rise">
        <div className="panel p-4 border border-[#006A4E]/15 bg-white shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
              {t('সক্রিয় ব্যাংক লিয়েন', 'Active Mortgages')}
            </div>
            <div className="text-2xl font-extrabold text-[#006A4E] mt-1">
              {toBanglaDigits(mortgages.filter((m) => m.status === 'ACTIVE').length, lang)}
            </div>
            <button
              onClick={() => handleTabChange('mortgages')}
              className="text-xs text-[#006A4E] font-semibold hover:underline mt-1 block cursor-pointer"
            >
              {t('লিয়েন রেজিস্টার দেখুন →', 'View Lien Register →')}
            </button>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#006A4E] flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="panel p-4 border border-[#006A4E]/15 bg-white shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
              {t('মোট ঋণকৃত জামানত', 'Total Collateral Value')}
            </div>
            <div className="text-2xl font-extrabold text-[#0A1F1C] mt-1">
              ৳{toBanglaDigits(
                (
                  mortgages
                    .filter((m) => m.status === 'ACTIVE')
                    .reduce((sum, m) => sum + Number(m.loan_amount_bdt || 0), 0) / 10000000
                ).toFixed(2),
                lang
              )}{' '}
              Cr
            </div>
            <button
              onClick={() => handleTabChange('new_lien')}
              className="text-xs text-[#006A4E] font-semibold hover:underline mt-1 block cursor-pointer"
            >
              {t('নতুন লিয়েন অন্তর্ভুক্তি →', 'New Mortgage Lien →')}
            </button>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#006A4E] flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
        </div>

        <div className="panel p-4 border border-[#006A4E]/15 bg-white shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
              {t('ইস্যুকৃত ডিজিটাল NOC', 'Released NOCs')}
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 mt-1">
              {toBanglaDigits(mortgages.filter((m) => m.status === 'RELEASED').length, lang)}
            </div>
            <button
              onClick={() => handleTabChange('noc')}
              className="text-xs text-emerald-700 font-semibold hover:underline mt-1 block cursor-pointer"
            >
              {t('ছাড়পত্র সনদপত্র দেখুন →', 'View Release NOCs →')}
            </button>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <FileBadge className="w-6 h-6" />
          </div>
        </div>

        <div className="panel p-4 border border-[#006A4E]/15 bg-white shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
              {t('দ্বৈত বন্ধক প্রতিরোধ', 'Double Mortgage Block')}
            </div>
            <div className="text-2xl font-extrabold text-[#006A4E] mt-1">
              ১০০% {t('সুরক্ষিত', 'Protected')}
            </div>
            <button
              onClick={() => handleTabChange('khatian')}
              className="text-xs text-[#006A4E] font-semibold hover:underline mt-1 block cursor-pointer"
            >
              {t('জামানত খতিয়ান যাচাই →', 'Verify Collateral →')}
            </button>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#006A4E] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control Panel SubTab Switcher */}
      <div className="panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-rise-delay">
        <div>
          <h3 className="font-bold text-sm text-[#074f38]">
            {t('ব্যাংক জামানত ও লিয়েন ওয়ার্কস্পেস', 'Bank Mortgage & Lien Workspace')}
          </h3>
          <p className="text-xs text-[#5F7A74]">
            {t('লিয়েন রেজিস্টার, নতুন বন্ধক ও ডিজিটাল অনাপত্তিপত্র কন্ট্রোল:', 'Lien registry, new mortgage lock, and digital release NOCs:')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {role === 'bank_officer' ? (
            <>
              <button
                onClick={() => handleTabChange('new_lien')}
                className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                  subTab === 'new_lien'
                    ? 'bg-[#006A4E] text-white shadow-xs'
                    : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t('নতুন লিয়েন আবেদন (মেকার)', 'Prepare Loan Lien (Maker)')}</span>
              </button>
              <button
                onClick={() => handleTabChange('mortgages')}
                className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                  subTab === 'mortgages'
                    ? 'bg-[#006A4E] text-white shadow-xs'
                    : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>
                  {t('লিয়েন রেজিস্টার', 'Mortgages & Liens')} ({toBanglaDigits(mortgages.length, lang)})
                </span>
              </button>
              <button
                onClick={() => handleTabChange('khatian')}
                className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                  subTab === 'khatian'
                    ? 'bg-[#006A4E] text-white shadow-xs'
                    : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>{t('জামানত খতিয়ান যাচাই', 'Collateral Khatian Check')}</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleTabChange('mortgages')}
                className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                  subTab === 'mortgages'
                    ? 'bg-[#006A4E] text-white shadow-xs'
                    : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>
                  {t('লিয়েন অনুমোদন কিউ (চেকার)', 'Lien Approval Queue (Checker)')} ({toBanglaDigits(mortgages.length, lang)})
                </span>
              </button>
              <button
                onClick={() => handleTabChange('noc')}
                className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                  subTab === 'noc'
                    ? 'bg-[#006A4E] text-white shadow-xs'
                    : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                }`}
              >
                <FileBadge className="w-4 h-4" />
                <span>
                  {t('ডিজিটাল ছাড়পত্র (NOC)', 'Release NOCs')} (
                  {toBanglaDigits(mortgages.filter((m) => m.status === 'RELEASED').length, lang)})
                </span>
              </button>
              <button
                onClick={() => handleTabChange('new_lien')}
                className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                  subTab === 'new_lien'
                    ? 'bg-[#006A4E] text-white shadow-xs'
                    : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t('নতুন লিয়েন অন্তর্ভুক্তি', 'Register Lien')}</span>
              </button>
              <button
                onClick={() => handleTabChange('khatian')}
                className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                  subTab === 'khatian'
                    ? 'bg-[#006A4E] text-white shadow-xs'
                    : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>{t('জামানত খতিয়ান যাচাই', 'Collateral Khatian Check')}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* New Mortgage Registration Form */}
      {subTab === 'new_lien' && (
        <div className="panel p-6 space-y-6 animate-rise-delay">
          <div className="border-b border-[#006A4E]/10 pb-4">
            <h2 className="font-bold text-lg md:text-xl text-[#074f38] flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#006A4E]" />
              <span>
                {t(
                  'নতুন ব্যাংক মর্টগেজ লিয়েন অন্তর্ভুক্তি ও জামানত লক',
                  'Register New Bank Mortgage Lien & Collateral Lock'
                )}
              </span>
            </h2>
            <p className="text-xs text-[#5F7A74] mt-0.5">
              {t(
                'একই জমি একাধিক ব্যাংকে বন্ধক রাখা (Double Mortgage) প্রতিরোধ করুন এবং প্লট লিয়েন কার্যকর করুন।',
                'Verify collateral ownership, prevent double-mortgaging, and lock the plot under active bank lien.'
              )}
            </p>
          </div>

          {/* Bank Presets */}
          <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#5F7A74] uppercase tracking-wider">
            {t('দ্রুত ব্যাংক নির্বাচন করুন:', 'Quick Bank Presets:')}
          </label>
          <div className="flex flex-wrap gap-2">
            {bankPresets.filter((b) => role === 'admin' || b.en === user?.office_en?.split(',')[0]).map((b) => (
              <button
                key={b.bn}
                onClick={() => {
                  setBankNameBn(b.bn);
                  setBankNameEn(b.en);
                  setBranchName(b.branch);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer min-h-[34px] ${
                  bankNameBn === b.bn
                    ? 'bg-[#006A4E] text-white border-[#006A4E] shadow-xs'
                    : 'bg-[#EDF7F4]/80 text-[#0A1F1C]/90 border-[#006A4E]/12 hover:bg-[#EDF7F4]'
                }`}
              >
                {lang === 'bn' ? b.bn : b.en}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label">
              {t('দাগ নম্বর নির্বাচন করুন:', 'Select Plot (Dag):')}
            </label>
            <select
              value={plotId}
              onChange={(e) => setPlotId(Number(e.target.value))}
              className="field text-xs font-semibold bg-[#F5FAF8]"
            >
              {plots.map((p) => (
                <option key={p.id} value={p.id}>
                  {t('দাগ নং', 'Dag')} {p.dag_no} ({lang === 'bn' ? p.mouza_bn : p.mouza_en})
                  {Number(p.owner_sale_locked) === 1 ? ' [🔒 LOCKED]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">
              {t('ঋণগ্রহীতা (Borrower):', 'Borrower:')}
            </label>
            <select
              value={borrowerId}
              onChange={(e) => setBorrowerId(Number(e.target.value))}
              className="field text-xs font-semibold bg-[#F5FAF8]"
            >
              {persons.map((per) => (
                <option key={per.id} value={per.id}>
                  {lang === 'bn' ? per.name_bn : per.name_en} ({per.nid_mock})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">
              {t('ব্যাংকের নাম ও শাখা:', 'Bank Name & Branch:')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={bankNameBn}
                readOnly={role !== 'admin'}
                onChange={(e) => setBankNameBn(e.target.value)}
                placeholder="Bank Name"
                className="w-2/3 field text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#006A4E]/30"
              />
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Branch"
                className="w-1/3 field text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#006A4E]/30"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="bank-identity-en">{t('প্রতিষ্ঠানের ইংরেজি নাম', 'Assigned Bank (English)')}</label>
            <input id="bank-identity-en" className="field" value={bankNameEn} readOnly={role !== 'admin'} onChange={(e) => setBankNameEn(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="mortgaged-area">{t('বন্ধকী জমি (শতাংশ)', 'Mortgaged Area (Decimal)')}</label>
            <input id="mortgaged-area" type="number" min="0.0001" step="any" className="field" value={mortgagedArea} onChange={(e) => setMortgagedArea(e.target.value)} />
          </div>
          <div>
            <label className="label">
              {t('ঋণের পরিমাণ (টাকা):', 'Loan Amount (BDT):')}
            </label>
            <input
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              className="field text-xs font-bold"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCheckCollateral}
            disabled={loading}
            className="btn-primary text-xs cursor-pointer min-h-[42px] shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ShieldAlert className="w-4 h-4" />
            )}
            <span>{t('১. জামানতের মালিকানা ও পূর্ববর্তী ঋণ যাচাই', '1. Verify Collateral & Prior Liens')}</span>
          </button>
          <button
            onClick={handleRegisterLien}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#074f38] hover:bg-[#053b2a] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            <span>{t('২. নতুন মর্টগেজ লিয়েন লক করুন', '2. Register New Mortgage Lien Lock')}</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-[#FFF0F1] border-l-4 border-[#FF3B4A] font-bold text-xs text-[#0A1F1C] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#FF3B4A] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {actionMsg && (
          <div className="p-4 rounded-xl bg-[#EDF7F4] border-l-4 border-[#006A4E] font-bold text-xs text-[#006A4E] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionMsg}</span>
          </div>
        )}
      </div>
      )}

      {collateralReport && subTab === 'new_lien' && <ResultHeroBanner report={collateralReport} />}

      {/* Active & Released Mortgages Table */}
      {(subTab === 'mortgages' || subTab === 'noc') && (
      <div className="panel p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-base text-[#074f38]">
              {t(
                'নিবন্ধিত ব্যাংক মর্টগেজ রেজিস্টার ও ডিজিটাল ছাড়পত্র (NOC) কন্ট্রোল',
                'Registered Bank Mortgages & Digital NOC Controls'
              )}
            </h2>
            <p className="text-xs text-[#5F7A74]">
              {t('সক্রিয় লিয়েন লক ও ঋণ পরিশোধের পর ইস্যুকৃত ডিজিটাল NOC সমূহ:', 'Active liens and generated NOCs:')}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(['ALL', 'ACTIVE', 'RELEASED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer min-h-[32px] ${
                  statusFilter === st
                    ? 'bg-[#006A4E] text-white shadow-xs'
                    : 'bg-[#EDF7F4] text-[#5F7A74] hover:bg-[#E4EFEA]'
                }`}
              >
                {st === 'ALL' ? t('সকল', 'All') : st === 'ACTIVE' ? t('সক্রিয় (ACTIVE)', 'Active') : t('অবমুক্ত (RELEASED)', 'Released')}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-[#5F7A74]/80 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('ব্যাংক, দাগ বা ঋণগ্রহীতার নাম খুঁজুন...', 'Search bank, dag or borrower...')}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#006A4E]/20 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#006A4E]/30"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#006A4E]/12">
          <table className="table-modern text-xs">
            <thead>
              <tr className="">
                <th className="py-3 px-3 font-bold">{t('ব্যাংক ও শাখা', 'Bank & Branch')}</th>
                <th className="py-3 px-3 font-bold">{t('মৌজা ও দাগ', 'Plot / Dag')}</th>
                <th className="py-3 px-3 font-bold">{t('ঋণগ্রহীতা', 'Borrower')}</th>
                <th className="py-3 px-3 font-bold">{t('ঋণের পরিমাণ', 'Loan Amount')}</th>
                <th className="py-3 px-3 font-bold">{t('স্ট্যাটাস', 'Status')}</th>
                <th className="py-3 px-3 font-bold text-right">{t('অ্যাকশন ও সনদ', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#006A4E]/10 bg-white">
              {filteredMortgages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#5F7A74]">
                    {t('কোনো মর্টগেজ রেকর্ড পাওয়া যায়নি।', 'No mortgage records found.')}
                  </td>
                </tr>
              ) : (
                filteredMortgages.map((m) => (
                  <tr key={m.id} className="hover:bg-[#EDF7F4]/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-[#0A1F1C]">
                      <div>{lang === 'bn' ? m.bank_name_bn : m.bank_name_en}</div>
                      <div className="text-[10px] text-[#5F7A74]/80 font-sans">{m.branch_name}</div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#0A1F1C]/90">
                      {t('দাগ নং', 'Dag')} {toBanglaDigits(m.dag_no, lang)}
                    </td>
                    <td className="py-3 px-3 text-[#5F7A74] font-medium">{m.borrower_name_bn}</td>
                    <td className="py-3 px-3 font-extrabold text-[#0A1F1C] font-mono">
                      ৳{toBanglaDigits(m.loan_amount_bdt.toLocaleString(), lang)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold inline-block ${
                          m.status === 'ACTIVE'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {m.status === 'ACTIVE' ? '🔒 ACTIVE LIEN' : '✔ RELEASED'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex gap-1.5 items-center">
                        {m.status === 'ACTIVE' ? (
                          <>
                            {role === 'bank_officer' ? (
                              <span
                                title={t('ঋণ অবমুক্ত ও NOC অনুমোদন শাখা ব্যবস্থাপক (Checker) দ্বারা সম্পাদিত হয়।', 'Lien release & NOC approval must be performed by Branch Manager (Checker).')}
                                className="px-2 py-1 rounded bg-amber-50 text-amber-800 font-bold text-[10px] inline-flex items-center gap-1 border border-amber-200"
                              >
                                <Lock className="w-3 h-3 text-amber-600" />
                                <span>{t('চেকার অনুমোদনাধীন', 'Pending Checker')}</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleRelease(m.id)}
                                className="px-2.5 py-1 rounded border border-[#006A4E] text-[#006A4E] hover:bg-[#006A4E] hover:text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer min-h-[30px] transition-colors"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>{t('অবমুক্ত ও NOC প্রস্তুত', 'Release & Issue NOC')}</span>
                              </button>
                            )}
                            <span
                              title={t('লিয়েন সক্রিয় থাকায় দায়মুক্তি সনদ (NOC) ইস্যু করা নিষিদ্ধ। ঋণ পরিশোধ করে অবমুক্ত করুন।', 'Lien is ACTIVE. NOC cannot be issued until released.')}
                              className="px-2 py-1 rounded bg-slate-100 text-slate-500 font-semibold text-[10px] inline-flex items-center gap-1 cursor-not-allowed border border-slate-200"
                            >
                              <Lock className="w-3 h-3 text-slate-400" />
                              <span>{t('NOC অনুপলব্ধ (লিয়েন সক্রিয়)', 'NOC Locked (Active)')}</span>
                            </span>
                          </>
                        ) : (
                          <button
                            onClick={() => handleViewNoc(m.id)}
                            className="px-2.5 py-1 rounded bg-[#074f38] hover:bg-[#053b2a] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer min-h-[30px] transition-colors shadow-xs"
                          >
                            <FileBadge className="w-3.5 h-3.5" />
                            <span>{t('ডিজিটাল NOC', 'Digital NOC')}</span>
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

      {/* Collateral Khatian Explorer */}
      {subTab === 'khatian' && (
        <OfficerKhatianExplorer
          onSelectPlotForAction={(selectedId) => {
            setPlotId(selectedId);
            handleTabChange('new_lien');
          }}
          actionLabel={t('এই প্লটে নতুন বন্ধক রাখুন', 'Register Mortgage on Plot')}
          actionType="lien"
        />
      )}

      {/* Printable Digital NOC Certificate Modal */}
      {nocModalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-[#006A4E]/12 space-y-6 relative my-8">
            <div className="flex items-center justify-between border-b pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <FileBadge className="w-6 h-6 text-[#006A4E]" />
                <h3 className="font-extrabold text-[#0A1F1C] text-base">
                  {t('ব্যাংক মর্টগেজ ছাড়পত্র প্রিভিউ', 'Mortgage NOC Certificate Preview')}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t('প্রিন্ট / PDF সংরক্ষণ', 'Print / Save PDF')}</span>
                </button>
                <button
                  onClick={() => setNocModalData(null)}
                  className="p-2 rounded-lg text-[#5F7A74]/80 hover:text-[#5F7A74] hover:bg-[#EDF7F4] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official NOC Certificate Sheet */}
            <div className="p-6 border-4 border-double border-[#006A4E]/20 rounded-xl bg-white space-y-5 text-[#0A1F1C]">
              <div className="text-center space-y-1 border-b pb-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#006A4E] text-white flex items-center justify-center font-bold text-lg mb-2 shadow-sm">
                  ব্যাংক
                </div>
                <h4 className="font-extrabold text-base tracking-wide text-[#0A1F1C]">
                  {nocModalData.lien?.bank_name_bn}
                </h4>
                <p className="text-xs font-bold text-[#006A4E]">
                  {nocModalData.lien?.branch_name} • ক্রেডিট অ্যাডমিনিস্ট্রেশন ও লিগ্যাল বিভাগ
                </p>
                <p className="text-[10px] text-[#5F7A74] font-mono mt-1">
                  OFFICIAL NOC CERTIFICATE NO: {nocModalData.noc_no}
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-lg text-center text-xs font-bold text-emerald-800">
                ✔ বন্ধক দায়মুক্তি প্রত্যয়ন: বর্ণিত দাগের জমির বিরুদ্ধে ব্যাংকের কোনো আর্থিক দাবি বা লিয়েন অবশিষ্ট নেই।
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-[#EDF7F4]/80 p-4 rounded-xl border border-[#006A4E]/12">
                <div>
                  <span className="text-[10px] text-[#5F7A74] block">ঋণগ্রহীতা:</span>
                  <strong>{nocModalData.lien?.borrower_name_bn}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#5F7A74] block">এনআইডি নম্বর:</span>
                  <strong className="font-mono">{nocModalData.lien?.borrower_nid}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#5F7A74] block">মৌজা ও দাগ নং:</span>
                  <strong>{nocModalData.lien?.mouza_bn}, দাগ নং {nocModalData.lien?.dag_no}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#5F7A74] block">পরিশোধিত ঋণ:</span>
                  <strong className="font-mono">৳{Number(nocModalData.lien?.loan_amount_bdt).toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#5F7A74] block">অবমুক্তির তারিখ:</span>
                  <strong>{nocModalData.issued_at || new Date().toLocaleDateString('bn-BD')}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#5F7A74] block">বর্তমান লিয়েন স্ট্যাটাস:</span>
                  <strong className="text-emerald-700">{nocModalData.lien?.status}</strong>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[10px] space-y-1 break-all">
                <div><strong>SHA256_NOC_HASH:</strong> {nocModalData.noc_hash}</div>
                <div><strong>ED25519_BANK_SIGNATURE:</strong> {nocModalData.signature}</div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                {nocModalData.qr_data_uri && (
                  <div className="flex items-center gap-3">
                    <img
                      src={nocModalData.qr_data_uri}
                      alt="NOC QR"
                      className="w-16 h-16 rounded border border-[#006A4E]/20 p-1 bg-white"
                    />
                    <div className="text-[10px] text-[#5F7A74]">
                      <p className="font-bold text-[#0A1F1C]/90">QR কোড স্ক্যান করে</p>
                      <p>ব্যাংক লিয়েন অবমুক্তি</p>
                      <p>অনলাইনে যাচাই করুন</p>
                    </div>
                  </div>
                )}

                <div className="text-right text-[10px] text-[#5F7A74]">
                  <div className="font-mono font-bold text-xs text-[#006A4E] border-b border-dashed border-slate-400 pb-0.5">
                    [Authorized Bank Seal]
                  </div>
                  <p className="font-bold mt-1">শাখা ব্যবস্থাপক / অনুমোদিত কর্মকর্তা</p>
                  <p>{nocModalData.lien?.bank_name_bn}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
