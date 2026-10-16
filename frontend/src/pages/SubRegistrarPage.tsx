import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi, RiskReportResponse } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { ResultHeroBanner } from '../components/ResultHeroBanner';
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
    Promise.all([BhumiApi.getPlots(), BhumiApi.getPersons(), BhumiApi.listRegistrarDeeds()])
      .then(([plts, pers, dds]) => {
        setPlots(plts);
        setPersons(pers);
        setDeedsList(dds);
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
        <div className="p-4 rounded-2xl bg-[#FEF3C7] border-2 border-[#B7791F] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold text-[#1A1A1A]">
            <KeyRound className="w-5 h-5 text-[#B7791F]" />
            <span>
              {t(
                'RBAC মিডলওয়্যার বিজ্ঞপ্তি: আপনি বর্তমানে "' + role + '" রোলে আছেন। সাব-রেজিস্ট্রার কন্ট্রোল ব্যবহার করতে রোলে সুইচ করুন।',
                `RBAC Middleware Notice: You are currently in "${role}" role. Switch to Sub-Registrar for full control.`
              )}
            </span>
          </div>
          <button
            onClick={switchToRegistrarRole}
            className="px-4 py-2 rounded-xl bg-[#006A4E] text-white font-extrabold text-xs cursor-pointer"
          >
            {t('সাব-রেজিস্ট্রার রোলে সুইচ করুন →', 'Switch to Sub-Registrar Role →')}
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-[#E6F2EE] text-[#006A4E]">
              {t('সাব-রেজিস্ট্রার কন্ট্রোল ড্যাশবোর্ড (আইন মন্ত্রণালয়)', 'Sub-Registrar Control Console (Ministry of Law)')}
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#1A1A1A] mt-2 flex items-center gap-2">
              <FileSpreadsheet className="w-7 h-7 text-[#006A4E]" />
              <span>
                {t(
                  'প্রাক-নিবন্ধন যাচাই, দলিল নিয়ন্ত্রণ ও সরকারি ফি ক্যালকুলেটর',
                  'Pre-Registration Gatekeeper, Deed Control & Fee Calculator'
                )}
              </span>
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSubTab('wizard')}
              className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 cursor-pointer ${
                subTab === 'wizard' ? 'bg-[#006A4E] text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{t('নতুন দলিল ও যাচাই', 'New Deed Gatekeeper')}</span>
            </button>
            <button
              onClick={() => setSubTab('deeds')}
              className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 cursor-pointer ${
                subTab === 'deeds' ? 'bg-[#006A4E] text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              <span>{t('দলিল রেজিস্ট্রি ও হোল্ড কন্ট্রোল', 'Deed Registry & Hold Control')}</span>
            </button>
            <button
              onClick={() => setSubTab('fees')}
              className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 cursor-pointer ${
                subTab === 'fees' ? 'bg-[#006A4E] text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>{t('সরকারি ফি ও কর ক্যালকুলেটর', 'Stamp & Reg Fee Calculator')}</span>
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className="p-4 rounded-xl bg-[#E6F2EE] border-l-8 border-[#006A4E] text-[#006A4E] font-bold">
            {statusMsg}
          </div>
        )}

        {/* TAB 1: New Deed Pre-Registration Wizard */}
        {subTab === 'wizard' && (
          <div className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1">
                  {t('দাগ নম্বর (Plot):', 'Plot / Dag No:')}
                </label>
                <select
                  value={plotId}
                  onChange={(e) => setPlotId(Number(e.target.value))}
                  className="w-full p-3 rounded-xl border-2 border-gray-300 bg-white font-semibold"
                >
                  {plots.slice(0, 25).map((p) => (
                    <option key={p.id} value={p.id}>
                      {lang === 'bn' ? p.mouza_bn : p.mouza_en} — {t('দাগ', 'Dag')} {p.dag_no} ({p.total_area_decimal} dec)
                      {Number(p.owner_sale_locked) === 1 ? ' [🔒 LOCKED]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">
                  {t('বিক্রেতা (Seller + Mock NID):', 'Seller (with Mock NID):')}
                </label>
                <select
                  value={sellerId}
                  onChange={(e) => setSellerId(Number(e.target.value))}
                  className="w-full p-3 rounded-xl border-2 border-gray-300 bg-white font-semibold"
                >
                  {persons.slice(0, 15).map((per) => (
                    <option key={per.id} value={per.id}>
                      {lang === 'bn' ? per.name_bn : per.name_en} ({per.nid_mock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">
                  {t('ক্রেতা (Buyer + Mock NID):', 'Buyer (with Mock NID):')}
                </label>
                <select
                  value={buyerId}
                  onChange={(e) => setBuyerId(Number(e.target.value))}
                  className="w-full p-3 rounded-xl border-2 border-gray-300 bg-white font-semibold"
                >
                  {persons.slice(0, 15).map((per) => (
                    <option key={per.id} value={per.id}>
                      {lang === 'bn' ? per.name_bn : per.name_en} ({per.nid_mock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">
                  {t('হস্তান্তরিত জমি (শতাংশ):', 'Transfer Area (Decimal):')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={areaDecimal}
                  onChange={(e) => setAreaDecimal(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-gray-300 font-bold"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">
                  {t('অংশের ভগ্নাংশ (Share Fraction):', 'Share Fraction:')}
                </label>
                <input
                  type="text"
                  value={shareFraction}
                  onChange={(e) => setShareFraction(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-gray-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">
                  {t('দলিলের ঘোষিত মূল্য (টাকা):', 'Declared Value (BDT):')}
                </label>
                <input
                  type="number"
                  value={declaredValue}
                  onChange={(e) => setDeclaredValue(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-gray-300 font-bold"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleRunPreCheck}
                disabled={loading}
                className="px-6 py-3.5 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-extrabold cursor-pointer"
              >
                {t('১. নিবন্ধন-পূর্ব ঝুঁকি ও ফি পরীক্ষা করুন', '1. Run Pre-Registration Risk & Fee Check')}
              </button>

              <button
                onClick={handleRegisterDeed}
                disabled={loading}
                className="px-6 py-3.5 rounded-xl bg-gray-900 hover:bg-black text-white font-extrabold cursor-pointer"
              >
                {t(
                  '২. লেজারে দলিল নিবন্ধন ও QR সনদ তৈরি করুন',
                  '2. Register Deed in Hash Ledger & Mint QR'
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Deed Registry & Hold / Release Control */}
        {subTab === 'deeds' && (
          <div className="space-y-4 pt-2">
            <h2 className="text-lg font-extrabold text-[#1A1A1A]">
              {t(
                'নিবন্ধিত ও স্থগিত (HELD) দলিলের তালিকা — সাব-রেজিস্ট্রার সিদ্ধান্ত কন্ট্রোল',
                'Deed Registry & HELD Deed Release/Reject Controls'
              )}
            </h2>
            <div className="space-y-3">
              {deedsList.map((d) => (
                <div
                  key={d.id}
                  className={`p-4 rounded-xl border-2 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    d.status === 'HELD'
                      ? 'bg-[#FEF3C7]/50 border-[#B7791F]'
                      : d.status === 'REJECTED'
                      ? 'bg-[#FEECEE]/50 border-[#F42A41]'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-base text-[#006A4E]">
                        {d.deed_no}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold ${
                          d.status === 'REGISTERED'
                            ? 'bg-[#006A4E] text-white'
                            : d.status === 'HELD'
                            ? 'bg-[#B7791F] text-white'
                            : 'bg-[#F42A41] text-white'
                        }`}
                      >
                        {d.status}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-[#1A1A1A] mt-1">
                      {lang === 'bn' ? d.mouza_bn : d.mouza_en} — {t('দাগ', 'Dag')} {d.dag_no} •{' '}
                      {d.seller_name_bn} → {d.buyer_name_bn} ({toBanglaDigits(d.area_decimal, lang)}{' '}
                      {t('শতাংশ', 'dec')})
                    </p>
                    <p className="text-xs font-mono text-gray-500 mt-0.5">
                      Block #{d.chain_index} • SHA256: {String(d.content_hash).slice(0, 28)}...
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    {d.status !== 'REGISTERED' && (
                      <button
                        onClick={() => handleUpdateDeedStatus(d.id, 'REGISTERED')}
                        className="px-3.5 py-2 rounded-xl bg-[#006A4E] text-white text-xs font-extrabold cursor-pointer"
                      >
                        ✔ {t('শুনানি শেষে রিলিজ (Approve)', 'Release & Register')}
                      </button>
                    )}
                    {d.status !== 'REJECTED' && (
                      <button
                        onClick={() => handleUpdateDeedStatus(d.id, 'REJECTED')}
                        className="px-3.5 py-2 rounded-xl bg-[#F42A41] text-white text-xs font-extrabold cursor-pointer"
                      >
                        ✖ {t('বাতিল (Reject)', 'Reject Deed')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Official Stamp Duty & Registration Fee Calculator */}
        {subTab === 'fees' && feeBreakdown && (
          <div className="space-y-4 pt-2">
            <h2 className="text-lg font-extrabold text-[#006A4E]">
              {t(
                'সরকারি স্ট্যাম্প শুল্ক, রেজিস্ট্রেশন ফি ও উৎস কর ক্যালকুলেটর',
                'Government Stamp Duty, Registration Fee & AIT Calculator'
              )}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1">
                  {t('দলিলের ধরন (Deed Type):', 'Deed Type:')}
                </label>
                <select
                  value={deedTypeFee}
                  onChange={(e) => setDeedTypeFee(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-gray-300 bg-white font-semibold"
                >
                  <option value="SALE">{t('সাফ কবলা (Sale Deed)', 'Sale Deed (Saf Kabala)')}</option>
                  <option value="HIBA">{t('হেবা ঘোষণা (Hiba / Family Gift)', 'Hiba (Family Gift)')}</option>
                  <option value="MORTGAGE">{t('ব্যাংক মর্টগেজ দলিল', 'Bank Mortgage Deed')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">
                  {t('জমির বাজার মূল্য (টাকা):', 'Declared Market Value (BDT):')}
                </label>
                <input
                  type="number"
                  value={declaredValue}
                  onChange={(e) => setDeclaredValue(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-gray-300 font-bold"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleCalculateCustomFee}
                  className="w-full py-3 rounded-xl bg-[#006A4E] text-white font-extrabold cursor-pointer"
                >
                  {t('ফি হিসাব করুন', 'Calculate Official Fees')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <div className="text-xs text-gray-500">{t('স্ট্যাম্প শুল্ক (১.৫%)', 'Stamp Duty')}</div>
                <div className="text-lg font-extrabold text-[#1A1A1A]">
                  ৳{toBanglaDigits(feeBreakdown.breakdown.stamp_duty_bdt.toLocaleString(), lang)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <div className="text-xs text-gray-500">{t('রেজিস্ট্রেশন ফি (১%)', 'Registration Fee')}</div>
                <div className="text-lg font-extrabold text-[#1A1A1A]">
                  ৳{toBanglaDigits(feeBreakdown.breakdown.registration_fee_bdt.toLocaleString(), lang)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <div className="text-xs text-gray-500">{t('স্থানীয় সরকার কর (৩%)', 'Local Govt Tax')}</div>
                <div className="text-lg font-extrabold text-[#1A1A1A]">
                  ৳{toBanglaDigits(feeBreakdown.breakdown.local_govt_tax_bdt.toLocaleString(), lang)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <div className="text-xs text-gray-500">{t('উৎস কর / গেইন ট্যাক্স (৫%)', 'Capital Gain AIT')}</div>
                <div className="text-lg font-extrabold text-[#1A1A1A]">
                  ৳{toBanglaDigits(feeBreakdown.breakdown.ait_gain_tax_bdt.toLocaleString(), lang)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#E6F2EE] border-2 border-[#006A4E]">
                <div className="text-xs font-bold text-[#006A4E]">{t('সর্বমোট সরকারি ফি', 'Total Payable Fee')}</div>
                <div className="text-xl font-extrabold text-[#006A4E]">
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
          className={`p-6 rounded-2xl border-2 ${
            createdDeedResult.deed.status === 'REGISTERED'
              ? 'bg-[#E6F2EE] border-[#006A4E]'
              : 'bg-[#FEECEE] border-[#F42A41]'
          }`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-extrabold text-2xl">
                {createdDeedResult.deed.status === 'REGISTERED' ? (
                  <CheckCircle2 className="w-8 h-8 text-[#006A4E]" />
                ) : (
                  <ShieldAlert className="w-8 h-8 text-[#F42A41]" />
                )}
                <span>
                  {lang === 'bn' ? createdDeedResult.message_bn : createdDeedResult.message_en}
                </span>
              </div>
              <p className="font-mono text-sm">
                <strong>Deed No:</strong> {createdDeedResult.deed.deed_no} |{' '}
                <strong>Status:</strong> {createdDeedResult.deed.status} |{' '}
                <strong>Chain Block:</strong> #{createdDeedResult.deed.chain_index}
              </p>
              <p className="font-mono text-xs break-all">
                <strong>SHA-256 Hash:</strong> {createdDeedResult.deed.content_hash}
              </p>
            </div>

            {createdDeedResult.qr_data_uri && (
              <div className="bg-white p-2 rounded-xl border border-gray-300 shrink-0">
                <img
                  src={createdDeedResult.qr_data_uri}
                  alt="Deed QR"
                  className="w-28 h-28"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
