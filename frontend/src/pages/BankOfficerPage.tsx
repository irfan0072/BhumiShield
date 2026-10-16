import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

export const BankOfficerPage: React.FC = () => {
  const { lang, role, setRole, setUser, setToken, t } = useAppUI();
  const [plots, setPlots] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [mortgages, setMortgages] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  const [plotId, setPlotId] = useState<number>(6);
  const [borrowerId, setBorrowerId] = useState<number>(11);
  const [bankNameBn, setBankNameBn] = useState('কৃষি ব্যাংক');
  const [branchName] = useState('সাভার শাখা');
  const [loanAmount, setLoanAmount] = useState('3000000');

  const [collateralReport, setCollateralReport] = useState<RiskReportResponse | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [nocModalData, setNocModalData] = useState<any | null>(null);

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
    const res = await BhumiApi.checkBeforeBuy({
      plot_id: Number(plotId),
      deed_type: 'MORTGAGE',
    });
    setCollateralReport(res);
  };

  const handleRegisterLien = async () => {
    setErrorMsg(null);
    setActionMsg(null);
    try {
      const res = await BhumiApi.createMortgage({
        plot_id: Number(plotId),
        borrower_id: Number(borrowerId),
        bank_name_bn: bankNameBn,
        bank_name_en: 'Krishi Bank',
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
              'এই দাগে ইতিমধ্যে একটি সক্রিয় মর্টগেজ রয়েছে! দ্বৈত মর্টগেজ ব্লক করা হয়েছে।',
              'Plot already has an ACTIVE mortgage! Double mortgage blocked.'
            )
      );
    }
  };

  const handleRelease = async (id: number) => {
    await BhumiApi.releaseMortgage(id);
    loadData();
  };

  const handleViewNoc = async (id: number) => {
    const res = await BhumiApi.getMortgageNoc(id);
    setNocModalData(res);
  };

  return (
    <div className="space-y-6">
      {role !== 'bank_officer' && role !== 'admin' && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <KeyRound className="w-4 h-4 text-[#B7791F]" />
            <span>
              {t(
                'দাপ্তরিক অ্যাক্সেস নোটিশ: ব্যাংক মর্টগেজ ও ডিজিটাল NOC কন্ট্রোল ব্যবহার করতে ব্যাংক অফিসার সেশনে প্রবেশ করুন।',
                'Access Notice: Switch to the Bank Officer session for mortgage lien lock and Digital NOC controls.'
              )}
            </span>
          </div>
          <button
            onClick={switchToBankRole}
            className="px-3.5 py-1.5 rounded-lg bg-[#253656] text-white font-bold text-xs cursor-pointer min-h-[34px]"
          >
            {t('ব্যাংক প্যানেলে প্রবেশ করুন →', 'Activate Bank Officer Session →')}
          </button>
        </div>
      )}

      {/* Velzon Executive Overview Grid for Bank Officer */}
      <VelzonOverviewSection
        role="bank_officer"
        stats={stats}
        onQuickAction={handleCheckCollateral}
      />

      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-2xs space-y-5">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-lg md:text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#006A4E]" />
            <span>
              {t(
                'জামানত যাচাই, লিয়েন লক এবং ডিজিটাল ছাড়পত্র (NOC) সনদ',
                'Collateral Verification, Lien Lock & Digital NOC Certificate'
              )}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t(
              'একই জমি একাধিক ব্যাংকে বন্ধক রাখা (Double Mortgage) প্রতিরোধ করুন এবং ঋণ পরিশোধে QR সহ ডিজিটাল NOC ইস্যু করুন।',
              'Prevent double-mortgaging across banks and issue QR-signed Digital NOC certificates upon loan repayment.'
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('দাগ নম্বর নির্বাচন করুন:', 'Select Plot (Dag):')}
            </label>
            <select
              value={plotId}
              onChange={(e) => setPlotId(Number(e.target.value))}
              className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold"
            >
              {plots.slice(0, 20).map((p) => (
                <option key={p.id} value={p.id}>
                  {t('দাগ নং', 'Dag')} {p.dag_no} ({lang === 'bn' ? p.mouza_bn : p.mouza_en})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('ঋণগ্রহীতা (Borrower):', 'Borrower:')}
            </label>
            <select
              value={borrowerId}
              onChange={(e) => setBorrowerId(Number(e.target.value))}
              className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold"
            >
              {persons.slice(0, 15).map((per) => (
                <option key={per.id} value={per.id}>
                  {lang === 'bn' ? per.name_bn : per.name_en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('ব্যাংকের নাম ও শাখা:', 'Bank Name & Branch:')}
            </label>
            <input
              type="text"
              value={bankNameBn}
              onChange={(e) => setBankNameBn(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('ঋণের পরিমাণ (টাকা):', 'Loan Amount (BDT):')}
            </label>
            <input
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-bold"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCheckCollateral}
            className="px-5 py-2.5 rounded-lg bg-[#006A4E] text-white text-xs font-extrabold cursor-pointer min-h-[40px]"
          >
            {t('১. জামানতের মালিকানা ও পূর্ববর্তী ঋণ যাচাই', '1. Verify Collateral & Prior Liens')}
          </button>
          <button
            onClick={handleRegisterLien}
            className="px-5 py-2.5 rounded-lg bg-[#253656] text-white text-xs font-extrabold flex items-center gap-2 cursor-pointer min-h-[40px]"
          >
            <Lock className="w-4 h-4" />
            <span>{t('২. নতুন মর্টগেজ লিয়েন লক করুন', '2. Register New Mortgage Lien')}</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-[#FEECEE] border-l-8 border-[#F42A41] font-bold text-xs text-[#1A1A1A] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#F42A41] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {actionMsg && (
          <div className="p-4 rounded-xl bg-[#E6F2EE] border-l-8 border-[#006A4E] font-bold text-xs text-[#006A4E]">
            {actionMsg}
          </div>
        )}
      </div>

      {collateralReport && <ResultHeroBanner report={collateralReport} />}

      {/* Active & Released Mortgages Table */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <h2 className="text-base font-extrabold text-slate-800">
          {t(
            'নিবন্ধিত ব্যাংক মর্টগেজ রেজিস্টার ও ডিজিটাল ছাড়পত্র (NOC) কন্ট্রোল',
            'Registered Bank Mortgages & Digital NOC Controls'
          )}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-500 uppercase">
                <th className="py-3 px-3 font-bold">{t('ব্যাংক ও শাখা', 'Bank & Branch')}</th>
                <th className="py-3 px-3 font-bold">{t('মৌজা ও দাগ', 'Plot / Dag')}</th>
                <th className="py-3 px-3 font-bold">{t('ঋণগ্রহীতা', 'Borrower')}</th>
                <th className="py-3 px-3 font-bold">{t('ঋণের পরিমাণ', 'Loan Amount')}</th>
                <th className="py-3 px-3 font-bold">{t('স্ট্যাটাস', 'Status')}</th>
                <th className="py-3 px-3 font-bold text-right">{t('অ্যাকশন ও সনদ', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mortgages.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-3 font-bold text-slate-800">
                    {lang === 'bn' ? m.bank_name_bn : m.bank_name_en} ({m.branch_name})
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-700">
                    {t('দাগ নং', 'Dag')} {toBanglaDigits(m.dag_no, lang)}
                  </td>
                  <td className="py-3 px-3 text-slate-600">{m.borrower_name_bn}</td>
                  <td className="py-3 px-3 font-extrabold text-slate-800">
                    ৳{toBanglaDigits(m.loan_amount_bdt.toLocaleString(), lang)}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        m.status === 'ACTIVE'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="inline-flex gap-1.5">
                      {m.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleRelease(m.id)}
                          className="px-2.5 py-1 rounded border border-[#006A4E] text-[#006A4E] hover:bg-[#006A4E] hover:text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer min-h-[30px]"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>{t('অবমুক্ত করুন', 'Release Lien')}</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleViewNoc(m.id)}
                        className="px-2.5 py-1 rounded bg-[#253656] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer min-h-[30px]"
                      >
                        <FileBadge className="w-3.5 h-3.5" />
                        <span>{t('ডিজিটাল NOC', 'Digital NOC')}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Digital NOC Certificate Modal */}
      {nocModalData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border-4 border-[#006A4E] space-y-5 relative">
            <button
              onClick={() => setNocModalData(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between border-b-2 border-[#006A4E] pb-4">
              <div>
                <span className="text-xs font-extrabold px-2.5 py-1 rounded bg-[#006A4E] text-white">
                  {nocModalData.noc_no}
                </span>
                <h3 className="text-xl font-extrabold text-[#006A4E] mt-2">
                  {t(
                    'ডিজিটাল ব্যাংক মর্টগেজ ছাড়পত্র / লিয়েন সনদ (Digital NOC)',
                    'Digital Bank Mortgage Lien / NOC Certificate'
                  )}
                </h3>
                <p className="text-xs text-slate-500">{nocModalData.issued_at}</p>
              </div>
              {nocModalData.qr_data_uri && (
                <img
                  src={nocModalData.qr_data_uri}
                  alt="NOC QR"
                  className="w-24 h-24 rounded-xl border border-slate-300"
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <strong>{t('ব্যাংক ও শাখা:', 'Bank & Branch:')}</strong>{' '}
                {nocModalData.lien.bank_name_bn} ({nocModalData.lien.branch_name})
              </div>
              <div>
                <strong>{t('বর্তমান অবস্থা:', 'Lien Status:')}</strong>{' '}
                <span className="font-extrabold text-[#006A4E]">{nocModalData.lien.status}</span>
              </div>
              <div>
                <strong>{t('ঋণগ্রহীতা:', 'Borrower:')}</strong> {nocModalData.lien.borrower_name_bn}
              </div>
              <div>
                <strong>{t('এনআইডি:', 'NID:')}</strong> {nocModalData.lien.borrower_nid}
              </div>
              <div>
                <strong>{t('মৌজা ও দাগ:', 'Mouza & Dag:')}</strong> {nocModalData.lien.mouza_bn},{' '}
                {t('দাগ নং', 'Dag')} {nocModalData.lien.dag_no}
              </div>
              <div>
                <strong>{t('ঋণের পরিমাণ:', 'Loan Amount:')}</strong> ৳
                {Number(nocModalData.lien.loan_amount_bdt).toLocaleString()}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] space-y-1 break-all">
              <div>SHA256_NOC_HASH: {nocModalData.noc_hash}</div>
              <div>ED25519_SIGNATURE: {nocModalData.signature}</div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-lg bg-[#006A4E] text-white text-xs font-extrabold flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{t('প্রিন্ট / PDF সংরক্ষণ', 'Print / Save PDF')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
