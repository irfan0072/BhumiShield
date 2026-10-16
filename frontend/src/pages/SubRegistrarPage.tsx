import React, { useState, useEffect } from 'react';
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

  const selectedSeller = persons.find((p) => Number(p.id) === Number(sellerId));

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

  return (
    <div className="space-y-6">
      {/* RBAC Guard Notice if not logged in as sub_registrar or admin */}
      {role !== 'sub_registrar' && role !== 'admin' && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <KeyRound className="w-4 h-4 text-[#B7791F]" />
            <span>
              {t(
                'দাপ্তরিক অ্যাক্সেস নোটিশ: সাব-রেজিস্ট্রার কন্ট্রোল পূর্ণাঙ্গভাবে ব্যবহার করতে সাব-রেজিস্ট্রার সেশনে প্রবেশ করুন।',
                'Access Notice: Switch to the Sub-Registrar Officer session to execute deeds and release held records.'
              )}
            </span>
          </div>
          <button
            onClick={switchToRegistrarRole}
            className="px-3.5 py-1.5 rounded-lg bg-[#253656] text-white font-bold text-xs cursor-pointer min-h-[34px]"
          >
            {t('সাব-রেজিস্ট্রার প্যানেলে প্রবেশ করুন →', 'Activate Sub-Registrar Session →')}
          </button>
        </div>
      )}

      {/* Velzon Executive Overview Grid for Sub-Registrar */}
      <VelzonOverviewSection
        role="sub_registrar"
        stats={stats}
        onQuickAction={() => setSubTab('deeds')}
      />

      {/* Operational Controlling Card */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg md:text-xl font-extrabold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#006A4E]" />
              <span>
                {t(
                  'সাব-রেজিস্ট্রার প্রাক-নিবন্ধন গেটকিপার ও দলিল রেজিস্টার কন্ট্রোল',
                  'Pre-Registration Gatekeeper, Deed Control & Stamp Duty Calculator'
                )}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                'দলিল সম্পাদনের পূর্বে ১১টি রুল পরীক্ষা, স্থগিত দলিল (HELD) নিষ্পত্তি এবং সরকারি রাজস্ব হিসাব:',
                'Run 11 pre-registration fraud checks, manage HELD deeds, and calculate government fees:'
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSubTab('wizard')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[38px] ${
                subTab === 'wizard'
                  ? 'bg-[#253656] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{t('নতুন দলিল ও প্রাক-যাচাই', 'Pre-Reg Gatekeeper')}</span>
            </button>
            <button
              onClick={() => setSubTab('deeds')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[38px] ${
                subTab === 'deeds'
                  ? 'bg-[#253656] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
              className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[38px] ${
                subTab === 'fees'
                  ? 'bg-[#253656] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>{t('সরকারি শুল্ক ও ফি ক্যালকুলেটর', 'Stamp & Fee Calculator')}</span>
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className="p-4 rounded-xl bg-[#E6F2EE] border-l-8 border-[#006A4E] text-[#006A4E] font-bold text-xs">
            {statusMsg}
          </div>
        )}

        {/* TAB 1: New Deed Pre-Registration Wizard */}
        {subTab === 'wizard' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('দাগ নম্বর (Plot / Dag):', 'Plot / Dag No:')}
                </label>
                <select
                  value={plotId}
                  onChange={(e) => setPlotId(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold"
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('বিক্রেতা (Seller + NID):', 'Seller (with NID):')}
                </label>
                <select
                  value={sellerId}
                  onChange={(e) => setSellerId(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold"
                >
                  {persons.slice(0, 15).map((per) => (
                    <option key={per.id} value={per.id}>
                      {lang === 'bn' ? per.name_bn : per.name_en} ({per.nid_mock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('ক্রেতা (Buyer + NID):', 'Buyer (with NID):')}
                </label>
                <select
                  value={buyerId}
                  onChange={(e) => setBuyerId(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold"
                >
                  {persons.slice(0, 15).map((per) => (
                    <option key={per.id} value={per.id}>
                      {lang === 'bn' ? per.name_bn : per.name_en} ({per.nid_mock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('হস্তান্তরিত জমি (শতাংশ):', 'Transfer Area (Decimal):')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={areaDecimal}
                  onChange={(e) => setAreaDecimal(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('অংশের ভগ্নাংশ (Share Fraction):', 'Share Fraction:')}
                </label>
                <input
                  type="text"
                  value={shareFraction}
                  onChange={(e) => setShareFraction(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('দলিলের ঘোষিত মূল্য (টাকা):', 'Declared Value (BDT):')}
                </label>
                <input
                  type="number"
                  value={declaredValue}
                  onChange={(e) => setDeclaredValue(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-bold"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleRunPreCheck}
                disabled={loading}
                className="px-5 py-2.5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-extrabold cursor-pointer min-h-[40px]"
              >
                {t('১. নিবন্ধন-পূর্ব ঝুঁকি ও ফি পরীক্ষা করুন', '1. Run Pre-Registration Risk & Fee Check')}
              </button>

              <button
                onClick={handleRegisterDeed}
                disabled={loading}
                className="px-5 py-2.5 rounded-lg bg-[#253656] hover:bg-[#1a263d] text-white text-xs font-extrabold cursor-pointer min-h-[40px]"
              >
                {t(
                  '২. লেজারে দলিল নিবন্ধন ও QR সনদ তৈরি করুন',
                  '2. Register Deed in Hash Ledger & Mint QR'
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Deed Registry & Hold / Release Control Table (Velzon Style) */}
        {subTab === 'deeds' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-500 uppercase">
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
                <tbody className="divide-y divide-slate-100">
                  {deedsList.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 font-mono font-bold text-[#253656]">
                        <div>{d.deed_no}</div>
                        <div className="text-[10px] text-slate-400">Block #{d.chain_index}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {lang === 'bn' ? d.mouza_bn : d.mouza_en} — {t('দাগ', 'Dag')} {d.dag_no}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {d.seller_name_bn} → <strong>{d.buyer_name_bn}</strong>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {toBanglaDigits(d.area_decimal, lang)} {t('শতাংশ', 'dec')} • ৳
                        {Number(d.price_bdt || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            d.status === 'HELD'
                              ? 'bg-amber-100 text-amber-800'
                              : d.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
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
                              className="px-2.5 py-1 rounded bg-[#006A4E] text-white font-bold text-[11px] cursor-pointer min-h-[30px]"
                            >
                              ✔ {t('রিলিজ', 'Release')}
                            </button>
                          )}
                          {d.status !== 'REJECTED' && (
                            <button
                              onClick={() => handleUpdateDeedStatus(d.id, 'REJECTED')}
                              className="px-2.5 py-1 rounded bg-[#F42A41] text-white font-bold text-[11px] cursor-pointer min-h-[30px]"
                            >
                              ✖ {t('বাতিল', 'Reject')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Official Stamp Duty & Registration Fee Calculator */}
        {subTab === 'fees' && feeBreakdown && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('দলিলের ধরন (Deed Type):', 'Deed Type:')}
                </label>
                <select
                  value={deedTypeFee}
                  onChange={(e) => setDeedTypeFee(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold"
                >
                  <option value="SALE">{t('সাফ কবলা (Sale Deed)', 'Sale Deed (Saf Kabala)')}</option>
                  <option value="HIBA">{t('হেবা ঘোষণা (Hiba / Family Gift)', 'Hiba (Family Gift)')}</option>
                  <option value="MORTGAGE">{t('ব্যাংক মর্টগেজ দলিল', 'Bank Mortgage Deed')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('জমির বাজার মূল্য (টাকা):', 'Declared Market Value (BDT):')}
                </label>
                <input
                  type="number"
                  value={declaredValue}
                  onChange={(e) => setDeclaredValue(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-bold"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleCalculateCustomFee}
                  className="w-full py-2.5 rounded-lg bg-[#006A4E] text-white text-xs font-extrabold cursor-pointer min-h-[40px]"
                >
                  {t('ফি হিসাব করুন', 'Calculate Official Fees')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] text-slate-500">{t('স্ট্যাম্প শুল্ক (১.৫%)', 'Stamp Duty')}</div>
                <div className="text-base font-extrabold text-slate-800 mt-1">
                  ৳{toBanglaDigits(feeBreakdown.breakdown.stamp_duty_bdt.toLocaleString(), lang)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] text-slate-500">{t('রেজিস্ট্রেশন ফি (১%)', 'Registration Fee')}</div>
                <div className="text-base font-extrabold text-slate-800 mt-1">
                  ৳{toBanglaDigits(feeBreakdown.breakdown.registration_fee_bdt.toLocaleString(), lang)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] text-slate-500">{t('স্থানীয় সরকার কর (৩%)', 'Local Govt Tax')}</div>
                <div className="text-base font-extrabold text-slate-800 mt-1">
                  ৳{toBanglaDigits(feeBreakdown.breakdown.local_govt_tax_bdt.toLocaleString(), lang)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] text-slate-500">{t('উৎস কর / গেইন ট্যাক্স (২%)', 'Capital Gain AIT')}</div>
                <div className="text-base font-extrabold text-slate-800 mt-1">
                  ৳{toBanglaDigits(feeBreakdown.breakdown.ait_gain_tax_bdt.toLocaleString(), lang)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#E6F2EE] border border-[#006A4E]">
                <div className="text-[11px] font-bold text-[#006A4E]">{t('সর্বমোট সরকারি ফি', 'Total Payable Fee')}</div>
                <div className="text-lg font-extrabold text-[#006A4E] mt-1">
                  ৳{toBanglaDigits(feeBreakdown.total_payable_bdt.toLocaleString(), lang)}
                </div>
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
              ? 'bg-[#E6F2EE] border-[#006A4E]'
              : 'bg-[#FEECEE] border-[#F42A41]'
          }`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-extrabold text-lg">
                {createdDeedResult.deed.status === 'REGISTERED' ? (
                  <CheckCircle2 className="w-6 h-6 text-[#006A4E]" />
                ) : (
                  <ShieldAlert className="w-6 h-6 text-[#F42A41]" />
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
              <p className="font-mono text-[11px] break-all text-slate-600">
                <strong>SHA-256 Hash:</strong> {createdDeedResult.deed.content_hash}
              </p>
            </div>

            {createdDeedResult.qr_data_uri && (
              <div className="bg-white p-2 rounded-xl border border-slate-300 shrink-0">
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
    </div>
  );
};
