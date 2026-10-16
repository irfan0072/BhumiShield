import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi, RiskReportResponse } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { ResultHeroBanner } from '../components/ResultHeroBanner';
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

  const [plotId, setPlotId] = useState<number>(6);
  const [borrowerId, setBorrowerId] = useState<number>(11);
  const [bankNameBn, setBankNameBn] = useState('কৃষি ব্যাংক');
  const [branchName, setBranchName] = useState('সাভার শাখা');
  const [loanAmount, setLoanAmount] = useState('3000000');

  const [collateralReport, setCollateralReport] = useState<RiskReportResponse | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [nocModalData, setNocModalData] = useState<any | null>(null);

  const loadData = () => {
    Promise.all([BhumiApi.getPlots(), BhumiApi.getPersons(), BhumiApi.getMortgages()]).then(
      ([plts, pers, mrts]) => {
        setPlots(plts);
        setPersons(pers);
        setMortgages(mrts);
      }
    );
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
        <div className="p-4 rounded-2xl bg-[#FEF3C7] border-2 border-[#B7791F] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold text-[#1A1A1A]">
            <KeyRound className="w-5 h-5 text-[#B7791F]" />
            <span>
              {t(
                'RBAC মিডলওয়্যার বিজ্ঞপ্তি: ব্যাংক মর্টগেজ ও ডিজিটাল NOC কন্ট্রোল ব্যবহার করতে ব্যাংক অফিসার রোলে সুইচ করুন।',
                'RBAC Middleware Notice: Switch to Bank Officer role for mortgage & NOC controls.'
              )}
            </span>
          </div>
          <button
            onClick={switchToBankRole}
            className="px-4 py-2 rounded-xl bg-[#006A4E] text-white font-extrabold text-xs cursor-pointer"
          >
            {t('ব্যাংক কর্মকর্তা রোলে সুইচ করুন →', 'Switch to Bank Officer Role →')}
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-xs space-y-6">
        <div>
          <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-[#E6F2EE] text-[#006A4E]">
            {t('ব্যাংক মর্টগেজ ও লিয়েন পোর্টাল', 'Bank Officer Collateral & Lien Console')}
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#1A1A1A] mt-2 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-[#006A4E]" />
            <span>
              {t(
                'জামানত যাচাই, লিয়েন লক এবং ডিজিটাল ছাড়পত্র (NOC) সনদ',
                'Collateral Verification, Lien Lock & Digital NOC Certificate'
              )}
            </span>
          </h1>
          <p className="text-[#5F6B66] mt-1">
            {t(
              'একই জমি একাধিক ব্যাংকে বন্ধক রাখা (Double Mortgage) প্রতিরোধ করুন এবং ঋণ পরিশোধে QR সহ ডিজিটাল NOC ইস্যু করুন।',
              'Prevent double-mortgaging across banks and issue QR-signed Digital NOC certificates upon loan repayment.'
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-bold mb-1">
              {t('দাগ নম্বর নির্বাচন করুন:', 'Select Plot (Dag):')}
            </label>
            <select
              value={plotId}
              onChange={(e) => setPlotId(Number(e.target.value))}
              className="w-full p-3 rounded-xl border-2 border-gray-300 bg-white font-semibold"
            >
              {plots.slice(0, 20).map((p) => (
                <option key={p.id} value={p.id}>
                  {t('দাগ নং', 'Dag')} {p.dag_no} ({lang === 'bn' ? p.mouza_bn : p.mouza_en})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">
              {t('ঋণগ্রহীতা (Borrower):', 'Borrower:')}
            </label>
            <select
              value={borrowerId}
              onChange={(e) => setBorrowerId(Number(e.target.value))}
              className="w-full p-3 rounded-xl border-2 border-gray-300 bg-white font-semibold"
            >
              {persons.slice(0, 15).map((per) => (
                <option key={per.id} value={per.id}>
                  {lang === 'bn' ? per.name_bn : per.name_en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">
              {t('ব্যাংকের নাম ও শাখা:', 'Bank Name & Branch:')}
            </label>
            <input
              type="text"
              value={bankNameBn}
              onChange={(e) => setBankNameBn(e.target.value)}
              className="w-full p-3 rounded-xl border-2 border-gray-300 font-semibold"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">
              {t('ঋণের পরিমাণ (টাকা):', 'Loan Amount (BDT):')}
            </label>
            <input
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              className="w-full p-3 rounded-xl border-2 border-gray-300 font-bold"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCheckCollateral}
            className="px-6 py-3 rounded-xl bg-[#006A4E] text-white font-extrabold cursor-pointer"
          >
            {t('১. জামানতের মালিকানা ও পূর্ববর্তী ঋণ যাচাই', '1. Verify Collateral & Prior Liens')}
          </button>
          <button
            onClick={handleRegisterLien}
            className="px-6 py-3 rounded-xl bg-gray-900 text-white font-extrabold flex items-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>{t('২. নতুন মর্টগেজ লিয়েন লক করুন', '2. Register New Mortgage Lien')}</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-[#FEECEE] border-l-8 border-[#F42A41] font-bold text-[#1A1A1A] flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-[#F42A41] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {actionMsg && (
          <div className="p-4 rounded-xl bg-[#E6F2EE] border-l-8 border-[#006A4E] font-bold text-[#006A4E]">
            {actionMsg}
          </div>
        )}
      </div>

      {collateralReport && <ResultHeroBanner report={collateralReport} />}

      {/* Active & Released Mortgages Table */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
        <h2 className="text-xl font-bold text-[#1A1A1A]">
          {t(
            'নিবন্ধিত ব্যাংক মর্টগেজ তালিকা ও ডিজিটাল ছাড়পত্র (NOC) কন্ট্রোল',
            'Registered Bank Mortgages & Digital NOC Controls'
          )}
        </h2>
        <div className="space-y-3">
          {mortgages.map((m) => (
            <div
              key={m.id}
              className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div>
                <div className="font-bold text-lg text-[#1A1A1A]">
                  {lang === 'bn' ? m.bank_name_bn : m.bank_name_en} ({m.branch_name}) —{' '}
                  {t('দাগ নং', 'Dag')} {toBanglaDigits(m.dag_no, lang)}
                </div>
                <div className="text-sm text-[#5F6B66]">
                  {t('ঋণগ্রহীতা:', 'Borrower:')} {m.borrower_name_bn} |{' '}
                  {t('ঋণ:', 'Loan:')} ৳{toBanglaDigits(m.loan_amount_bdt.toLocaleString(), lang)}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                    m.status === 'ACTIVE'
                      ? 'bg-[#FEECEE] text-[#F42A41]'
                      : 'bg-[#E6F2EE] text-[#006A4E]'
                  }`}
                >
                  {m.status}
                </span>
                {m.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleRelease(m.id)}
                    className="px-3.5 py-2 rounded-xl border border-[#006A4E] text-[#006A4E] hover:bg-[#006A4E] hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>{t('ঋণ পরিশোধ (Release Lien)', 'Release Lien')}</span>
                  </button>
                )}
                <button
                  onClick={() => handleViewNoc(m.id)}
                  className="px-3.5 py-2 rounded-xl bg-[#006A4E] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <FileBadge className="w-4 h-4" />
                  <span>{t('ডিজিটাল NOC সনদ', 'Digital NOC Certificate')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Printable Digital NOC Certificate Modal */}
      {nocModalData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border-4 border-[#006A4E] space-y-5 relative">
            <button
              onClick={() => setNocModalData(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between border-b-2 border-[#006A4E] pb-4">
              <div>
                <span className="text-xs font-extrabold px-2.5 py-1 rounded bg-[#006A4E] text-white">
                  {nocModalData.noc_no}
                </span>
                <h3 className="text-2xl font-extrabold text-[#006A4E] mt-2">
                  {t(
                    'ডিজিটাল ব্যাংক মর্টগেজ ছাড়পত্র / লিয়েন সনদ (Digital NOC)',
                    'Digital Bank Mortgage Lien / NOC Certificate'
                  )}
                </h3>
                <p className="text-xs text-gray-600">{nocModalData.issued_at}</p>
              </div>
              {nocModalData.qr_data_uri && (
                <img
                  src={nocModalData.qr_data_uri}
                  alt="NOC QR"
                  className="w-24 h-24 rounded-xl border border-gray-300"
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-[#FAFBFA] p-4 rounded-xl border border-gray-200">
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
                <strong>{t('এনআইডি:', 'Mock NID:')}</strong> {nocModalData.lien.borrower_nid}
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

            <div className="p-3 rounded-xl bg-gray-900 text-green-300 font-mono text-xs space-y-1 break-all">
              <div>SHA256_NOC_HASH: {nocModalData.noc_hash}</div>
              <div>ED25519_SIGNATURE: {nocModalData.signature}</div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-[#006A4E] text-white font-extrabold flex items-center gap-2 cursor-pointer"
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
