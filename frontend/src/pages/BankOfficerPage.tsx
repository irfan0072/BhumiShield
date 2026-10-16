import React, { useState, useEffect, useMemo } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi, RiskReportResponse } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { ResultHeroBanner } from '../components/ResultHeroBanner';
import { VelzonOverviewSection } from '../components/VelzonOverviewSection';
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
  FileText
} from 'lucide-react';

export const BankOfficerPage: React.FC = () => {
  const { lang, role, setRole, setUser, setToken, t } = useAppUI();
  const [plots, setPlots] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [mortgages, setMortgages] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  const [plotId, setPlotId] = useState<number>(6);
  const [borrowerId, setBorrowerId] = useState<number>(11);
  const [bankNameBn, setBankNameBn] = useState('বাংলাদেশ কৃষি ব্যাংক');
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
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const switchToBankRole = async () => {
    const res = await BhumiApi.switchDemoRole('bank_officer');
    if (res?.access_token && res?.user) {
      setToken(res.access_token);
      setUser(res.user);
    } else {
      setRole('bank_officer');
    }
  };

  const handleCheckCollateral = async () => {
    setErrorMsg(null);
    setActionMsg(null);
    setLoading(true);
    try {
      const res = await BhumiApi.checkBeforeBuy({
        plot_id: Number(plotId),
        deed_type: 'MORTGAGE',
      });
      setCollateralReport(res);
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
        bank_name_en: 'Commercial Bank',
        branch_name: branchName,
        loan_amount_bdt: Number(loanAmount),
      });
      setActionMsg(lang === 'bn' ? res.message_bn : res.message_en);
      loadData();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
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
    const res = await BhumiApi.getMortgageNoc(id);
    setNocModalData(res);
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
        <h1>{t('ব্যাংক অফিসার কনসোল', 'Bank Officer Console')}</h1>
        <p>{t('জামানত যাচাই, মর্টগেজ লিয়েন লক এবং ডিজিটাল NOC ইস্যু।', 'Verify collateral, lock mortgage liens, and issue digital NOC certificates.')}</p>
      </header>
      {/* RBAC Guard Notice if not logged in as bank_officer or admin */}
      {role !== 'bank_officer' && role !== 'admin' && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0A1F1C]">
            <KeyRound className="w-4 h-4 text-[#C4891A]" />
            <span>
              {t(
                'দাপ্তরিক অ্যাক্সেস নোটিশ: ব্যাংক মর্টগেজ ও ডিজিটাল NOC কন্ট্রোল ব্যবহার করতে ব্যাংক অফিসার সেশনে প্রবেশ করুন।',
                'Access Notice: Switch to the Bank Officer session for mortgage lien lock and Digital NOC controls.'
              )}
            </span>
          </div>
          <button
            onClick={switchToBankRole}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#062823] hover:bg-[#041A1C] text-white font-bold text-xs cursor-pointer min-h-[36px] transition-colors"
          >
            {t('ব্যাংক প্যানেলে প্রবেশ করুন →', 'Activate Bank Officer Session →')}
          </button>
        </div>
      )}

      {/* Registry overview */}
      <VelzonOverviewSection
        role="bank_officer"
        stats={stats}
        onQuickAction={handleCheckCollateral}
      />

      {/* Main Mortgage Operation Card */}
      <div className="panel p-6 space-y-6 animate-rise-delay">
        <div className="border-b border-[#0D6B5C]/10 pb-4">
          <h2 className="font-display text-lg md:text-xl text-[#062823] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0D6B5C]" />
            <span>
              {t(
                'জামানত যাচাই, লিয়েন লক এবং ডিজিটাল ছাড়পত্র (NOC) সনদ',
                'Collateral Verification, Lien Lock & Digital NOC Certificate'
              )}
            </span>
          </h2>
          <p className="text-xs text-[#5F7A74] mt-0.5">
            {t(
              'একই জমি একাধিক ব্যাংকে বন্ধক রাখা (Double Mortgage) প্রতিরোধ করুন এবং ঋণ পরিশোধে QR সহ ডিজিটাল NOC ইস্যু করুন।',
              'Prevent double-mortgaging across banks and issue QR-signed Digital NOC certificates upon loan repayment.'
            )}
          </p>
        </div>

        {/* Bank Presets */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#5F7A74] uppercase tracking-wider">
            {t('দ্রুত ব্যাংক নির্বাচন করুন:', 'Quick Bank Presets:')}
          </label>
          <div className="flex flex-wrap gap-2">
            {bankPresets.map((b) => (
              <button
                key={b.bn}
                onClick={() => {
                  setBankNameBn(b.bn);
                  setBranchName(b.branch);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer min-h-[34px] ${
                  bankNameBn === b.bn
                    ? 'bg-[#0D6B5C] text-white border-[#0D6B5C] shadow-xs'
                    : 'bg-[#EDF4F1]/80 text-[#0A1F1C]/90 border-[#0D6B5C]/12 hover:bg-[#EDF4F1]'
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
              {plots.slice(0, 20).map((p) => (
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
              {persons.slice(0, 15).map((per) => (
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
                onChange={(e) => setBankNameBn(e.target.value)}
                placeholder="Bank Name"
                className="w-2/3 field text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D6B5C]/30"
              />
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Branch"
                className="w-1/3 field text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D6B5C]/30"
              />
            </div>
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
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#062823] hover:bg-[#041A1C] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
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
          <div className="p-4 rounded-xl bg-[#E8F5F1] border-l-4 border-[#0D6B5C] font-bold text-xs text-[#0D6B5C] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionMsg}</span>
          </div>
        )}
      </div>

      {collateralReport && <ResultHeroBanner report={collateralReport} />}

      {/* Active & Released Mortgages Table */}
      <div className="panel p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base text-[#062823]">
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
                    ? 'bg-[#0D6B5C] text-white shadow-xs'
                    : 'bg-[#EDF4F1] text-[#5F7A74] hover:bg-[#E4EFEA]'
                }`}
              >
                {st === 'ALL' ? t('সকল', 'All') : st === 'ACTIVE' ? t('সক্রিয় (ACTIVE)', 'Active') : t('অবমুক্ত (RELEASED)', 'Released')}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-[#5F7A74]/80 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('ব্যাংক, দাগ বা ঋণগ্রহীতার নাম খুঁজুন...', 'Search bank, dag or borrower...')}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#0D6B5C]/20 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6B5C]/30"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#0D6B5C]/12">
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
            <tbody className="divide-y divide-[#0D6B5C]/10 bg-white">
              {filteredMortgages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#5F7A74]">
                    {t('কোনো মর্টগেজ রেকর্ড পাওয়া যায়নি।', 'No mortgage records found.')}
                  </td>
                </tr>
              ) : (
                filteredMortgages.map((m) => (
                  <tr key={m.id} className="hover:bg-[#EDF4F1]/80 transition-colors">
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
                      <div className="inline-flex gap-1.5">
                        {m.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleRelease(m.id)}
                            className="px-2.5 py-1 rounded border border-[#0D6B5C] text-[#0D6B5C] hover:bg-[#0D6B5C] hover:text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer min-h-[30px] transition-colors"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>{t('অবমুক্ত করুন', 'Release Lien')}</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleViewNoc(m.id)}
                          className="px-2.5 py-1 rounded bg-[#062823] hover:bg-[#041A1C] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer min-h-[30px] transition-colors"
                        >
                          <FileBadge className="w-3.5 h-3.5" />
                          <span>{t('ডিজিটাল NOC', 'Digital NOC')}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Digital NOC Certificate Modal */}
      {nocModalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-[#0D6B5C]/12 space-y-6 relative my-8">
            <div className="flex items-center justify-between border-b pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <FileBadge className="w-6 h-6 text-[#0D6B5C]" />
                <h3 className="font-extrabold text-[#0A1F1C] text-base">
                  {t('ব্যাংক মর্টগেজ ছাড়পত্র প্রিভিউ', 'Mortgage NOC Certificate Preview')}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg bg-[#0D6B5C] hover:bg-[#0A5549] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t('প্রিন্ট / PDF সংরক্ষণ', 'Print / Save PDF')}</span>
                </button>
                <button
                  onClick={() => setNocModalData(null)}
                  className="p-2 rounded-lg text-[#5F7A74]/80 hover:text-[#5F7A74] hover:bg-[#EDF4F1] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official NOC Certificate Sheet */}
            <div className="p-6 border-4 border-double border-[#0D6B5C]/20 rounded-xl bg-white space-y-5 text-[#0A1F1C]">
              <div className="text-center space-y-1 border-b pb-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#0D6B5C] text-white flex items-center justify-center font-bold text-lg mb-2 shadow-sm">
                  ব্যাংক
                </div>
                <h4 className="font-extrabold text-base tracking-wide text-[#0A1F1C]">
                  {nocModalData.lien?.bank_name_bn}
                </h4>
                <p className="text-xs font-bold text-[#0D6B5C]">
                  {nocModalData.lien?.branch_name} • ক্রেডিট অ্যাডমিনিস্ট্রেশন ও লিগ্যাল বিভাগ
                </p>
                <p className="text-[10px] text-[#5F7A74] font-mono mt-1">
                  OFFICIAL NOC CERTIFICATE NO: {nocModalData.noc_no}
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-lg text-center text-xs font-bold text-emerald-800">
                ✔ বন্ধক দায়মুক্তি প্রত্যয়ন: বর্ণিত দাগের জমির বিরুদ্ধে ব্যাংকের কোনো আর্থিক দাবি বা লিয়েন অবশিষ্ট নেই।
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-[#EDF4F1]/80 p-4 rounded-xl border border-[#0D6B5C]/12">
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
                      className="w-16 h-16 rounded border border-[#0D6B5C]/20 p-1 bg-white"
                    />
                    <div className="text-[10px] text-[#5F7A74]">
                      <p className="font-bold text-[#0A1F1C]/90">QR কোড স্ক্যান করে</p>
                      <p>ব্যাংক লিয়েন অবমুক্তি</p>
                      <p>অনলাইনে যাচাই করুন</p>
                    </div>
                  </div>
                )}

                <div className="text-right text-[10px] text-[#5F7A74]">
                  <div className="font-mono font-bold text-xs text-[#0D6B5C] border-b border-dashed border-slate-400 pb-0.5">
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
