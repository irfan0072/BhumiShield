import React, { useEffect, useState } from 'react';
import { Building2, ShieldCheck, Unlock, Lock } from 'lucide-react';
import { apiClient, extractErrorMessage } from '../api/client';
import { useI18n } from '../i18n';
import { formatCurrency } from '../theme/tokens';
import { VerdictBanner } from '../components/VerdictBanner';

export const BankOfficerPage: React.FC = () => {
  const { lang, t, n } = useI18n();
  const [plots, setPlots] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [mortgages, setMortgages] = useState<any[]>([]);

  // Default to Scenario 6 (Plot #6, Borrower #11 — already mortgaged to Sonali Bank!)
  const [plotId, setPlotId] = useState<number>(6);
  const [borrowerId, setBorrowerId] = useState<number>(11);
  const [loanAmount, setLoanAmount] = useState<string>('1500000');
  const [areaMortgaged, setAreaMortgaged] = useState<string>('15');
  const [bankNameBn, setBankNameBn] = useState<string>('জনতা ব্যাংক পিএলসি (ডেমো)');

  const [checkResult, setCheckResult] = useState<any | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const [locRes, perRes, mortRes] = await Promise.all([
        apiClient.get('/locations'),
        apiClient.get('/persons'),
        apiClient.get('/mortgages'),
      ]);
      setPlots(locRes.data.plots || []);
      setPersons(perRes.data.items || []);
      setMortgages(mortRes.data.items || []);
    } catch {
      // ignore initial load error
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCollateralCheck = async (pId = plotId, bId = borrowerId) => {
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await apiClient.post('/mortgages/collateral-check', {
        plot_id: Number(pId),
        borrower_id: Number(bId),
        requested_loan_bdt: Number(loanAmount),
        area_mortgaged_decimal: Number(areaMortgaged),
      });
      setCheckResult(res.data);
    } catch (err) {
      setError(extractErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLien = async () => {
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await apiClient.post('/mortgages', {
        plot_id: Number(plotId),
        borrower_id: Number(borrowerId),
        requested_loan_bdt: Number(loanAmount),
        area_mortgaged_decimal: Number(areaMortgaged),
        bank_name_bn: bankNameBn,
        bank_name_en: 'Janata Bank PLC (Demo)',
        branch_bn: 'সাভার শাখা, ঢাকা',
      });
      setFeedback(t(res.data.message_bn, res.data.message_en));
      await loadData();
      await handleCollateralCheck();
    } catch (err) {
      setError(extractErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseLien = async (lienId: number) => {
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await apiClient.post(`/mortgages/${lienId}/release`);
      setFeedback(t(res.data.message_bn, res.data.message_en));
      await loadData();
      await handleCollateralCheck();
    } catch (err) {
      setError(extractErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white border border-gray-200 p-6 shadow-xs space-y-4 hc-card">
        <span className="text-xs font-bold uppercase px-3 py-1 rounded-full bg-[#E6F2EE] text-[#006A4E]">
          {t('ব্যাংক ও আর্থিক প্রতিষ্ঠান পোর্টাল', 'Bank & Financial Institution Portal')}
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] flex items-center gap-2.5">
          <Building2 className="w-8 h-8 text-[#006A4E]" />
          <span>
            {t(
              'জামানত (Collateral) যাচাই ও ডাবল মর্টগেজ প্রতিরোধ সিস্টেম',
              'Collateral Verification & Double-Mortgage Prevention'
            )}
          </span>
        </h1>
        <p className="text-sm text-[#5F6B66]">
          {t(
            'ঋণ অনুমোদনের আগে জমিটি অন্য কোনো ব্যাংকে বন্ধক আছে কি না এবং ঋণগ্রহীতা প্রকৃত মালিক কি না তা যাচাই করুন।',
            'Verify whether a plot is already mortgaged to another bank and confirm borrower ownership before registering a lien.'
          )}
        </p>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setPlotId(6);
              setBorrowerId(11);
              handleCollateralCheck(6, 11);
            }}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FEECEE] text-[#C81E32] border border-[#F42A41]/40 font-bold text-xs cursor-pointer"
          >
            ✖ {t('সিনারিও ৬: ডাবল মর্টগেজ ব্লক (দাগ ১০৬)', 'Scenario 6: Double Mortgage Blocked (Dag 106)')}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlotId(1);
              setBorrowerId(1);
              handleCollateralCheck(1, 1);
            }}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#E6F2EE] text-[#006A4E] border border-[#006A4E]/30 font-bold text-xs cursor-pointer"
          >
            ✔ {t('নিষ্কণ্টক জামানত যাচাই (দাগ ১০১)', 'Clean Collateral Check (Dag 101)')}
          </button>
        </div>
      </section>

      {/* Collateral Check Form */}
      <section className="rounded-3xl bg-white border border-gray-200 p-6 shadow-xs hc-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCollateralCheck();
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div>
            <label htmlFor="bk-plot" className="block text-sm font-bold text-[#1A1A1A] mb-1.5">
              {t('দাগ নম্বর নির্বাচন করুন', 'Select Plot (Dag)')}
            </label>
            <select
              id="bk-plot"
              value={plotId}
              onChange={(e) => setPlotId(Number(e.target.value))}
              className="w-full min-h-[50px] px-3.5 py-2 rounded-xl border-2 border-gray-300 bg-[#FAFBFA] font-semibold"
            >
              {plots.map((p) => (
                <option key={p.id} value={p.id}>
                  {lang === 'bn'
                    ? `${p.mouza_bn} — দাগ ${p.dag_no_bn} (${n(p.total_area_decimal)} শতাংশ)`
                    : `${p.mouza_en} — Dag ${p.dag_no} (${p.total_area_decimal} Dec)`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="bk-borrower" className="block text-sm font-bold text-[#1A1A1A] mb-1.5">
              {t('ঋণগ্রহীতা (মালিক)', 'Borrower (Owner)')}
            </label>
            <select
              id="bk-borrower"
              value={borrowerId}
              onChange={(e) => setBorrowerId(Number(e.target.value))}
              className="w-full min-h-[50px] px-3.5 py-2 rounded-xl border-2 border-gray-300 bg-[#FAFBFA] font-semibold"
            >
              {persons.map((per) => (
                <option key={per.id} value={per.id}>
                  {lang === 'bn' ? per.name_bn : per.name_en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="bk-area" className="block text-sm font-bold text-[#1A1A1A] mb-1.5">
              {t('বন্ধককৃত জমি (শতাংশ)', 'Area to Mortgage (Decimals)')}
            </label>
            <input
              id="bk-area"
              type="number"
              step="1"
              value={areaMortgaged}
              onChange={(e) => setAreaMortgaged(e.target.value)}
              className="w-full min-h-[50px] px-3.5 py-2 rounded-xl border-2 border-gray-300 bg-[#FAFBFA] font-semibold"
            />
          </div>

          <div>
            <label htmlFor="bk-loan" className="block text-sm font-bold text-[#1A1A1A] mb-1.5">
              {t('প্রস্তাবিত ঋণের পরিমাণ (টাকা)', 'Loan Amount (BDT)')}
            </label>
            <input
              id="bk-loan"
              type="number"
              step="50000"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              className="w-full min-h-[50px] px-3.5 py-2 rounded-xl border-2 border-gray-300 bg-[#FAFBFA] font-semibold"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-3 pt-2">
            <input
              type="text"
              value={bankNameBn}
              onChange={(e) => setBankNameBn(e.target.value)}
              aria-label={t('ব্যাংকের নাম', 'Bank Name')}
              className="min-h-[48px] px-4 py-2 rounded-xl border border-gray-300 bg-[#FAFBFA] text-sm font-semibold"
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading}
                className="min-h-[50px] px-6 py-2.5 rounded-xl bg-[#006A4E] text-white font-bold flex items-center gap-2 hover:bg-[#00563F] cursor-pointer"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>{t('জামানত যাচাই করুন (Collateral Check)', 'Run Collateral Check')}</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleCreateLien}
                className="min-h-[50px] px-5 py-2.5 rounded-xl border-2 border-[#006A4E] text-[#006A4E] font-bold flex items-center gap-2 hover:bg-[#E6F2EE] cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>{t('নতুন বন্ধক নিবন্ধন করুন (Create Lien)', 'Register New Lien')}</span>
              </button>
            </div>
          </div>
        </form>
      </section>

      {feedback && (
        <div className="p-4 rounded-2xl bg-[#E6F2EE] border-2 border-[#006A4E] text-[#006A4E] font-bold">
          ✔ {feedback}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-[#FEECEE] border-2 border-[#F42A41] text-[#C81E32] font-bold">
          ✖ {error}
        </div>
      )}

      {checkResult && (
        <VerdictBanner
          verdict={checkResult.risk_report.verdict}
          riskScore={checkResult.risk_report.risk_score}
          titleBn={checkResult.risk_report.summary_bn}
          titleEn={checkResult.risk_report.summary_en}
          reasonsBn={
            checkResult.risk_report.flags.length > 0
              ? checkResult.risk_report.flags.map((f: any) => `${f.title_bn}: ${f.message_bn}`)
              : ['এই জমিতে কোনো সক্রিয় ব্যাংক বন্ধক নেই এবং ঋণগ্রহীতার মালিকানা সঠিক।']
          }
          reasonsEn={
            checkResult.risk_report.flags.length > 0
              ? checkResult.risk_report.flags.map((f: any) => `${f.title_en}: ${f.message_en}`)
              : ['Plot is free of active liens and borrower ownership is verified.']
          }
          nextStepsBn={checkResult.risk_report.next_steps_bn}
          nextStepsEn={checkResult.risk_report.next_steps_en}
          technicalDetails={checkResult.risk_report}
        />
      )}

      {/* Active & Released Mortgages Table */}
      <section className="rounded-3xl bg-white border border-gray-200 p-6 shadow-xs space-y-4 hc-card">
        <h2 className="text-xl font-bold text-[#1A1A1A]">
          {t('সকল নিবন্ধিত ব্যাংক বন্ধক তালিকা (Active & Released Liens)', 'Registered Bank Mortgage Liens')}
        </h2>
        <div className="space-y-3">
          {mortgages.map((m) => (
            <div
              key={m.id}
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                m.status === 'ACTIVE'
                  ? 'bg-[#FEECEE]/60 border-[#F42A41]'
                  : 'bg-[#FAFBFA] border-gray-200'
              }`}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-[#1A1A1A]">
                    {t(m.bank_name_bn, m.bank_name_en)} ({m.branch_bn})
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      m.status === 'ACTIVE' ? 'bg-[#F42A41] text-white' : 'bg-[#006A4E] text-white'
                    }`}
                  >
                    {m.status === 'ACTIVE' ? t('সক্রিয় বন্ধক', 'ACTIVE') : t('অবমুক্ত', 'RELEASED')}
                  </span>
                </div>
                <div className="text-sm text-[#5F6B66] mt-1">
                  {t('মৌজা:', 'Mouza:')} {t(m.mouza_bn, m.mouza_en)} •{' '}
                  {t('দাগ নং:', 'Dag:')} {n(m.dag_no)} •{' '}
                  {t('ঋণগ্রহীতা:', 'Borrower:')} {t(m.borrower_name_bn, m.borrower_name_en)} •{' '}
                  {t('পরিমাণ:', 'Loan:')} {formatCurrency(m.amount_bdt, lang)}
                </div>
              </div>

              {m.status === 'ACTIVE' && (
                <button
                  type="button"
                  onClick={() => handleReleaseLien(m.id)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#006A4E] text-white font-bold text-xs flex items-center gap-1.5 hover:bg-[#00563F] cursor-pointer shrink-0"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{t('ঋণ পরিশোধ ও বন্ধক অবমুক্ত করুন (Release)', 'Release Lien')}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
