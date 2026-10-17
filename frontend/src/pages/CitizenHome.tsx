import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import {
  CheckCircle2,
  FileText,
  Lock,
  Unlock,
  AlertOctagon,
  Send,
  QrCode,
  Search,
  X,
  Printer,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';

export const CitizenHome: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { lang, user, t } = useAppUI();
  const [vault, setVault] = useState<any>(null);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [actionMsg, setActionMsg] = useState('');

  // NID Switcher State
  const [activeNid, setActiveNid] = useState<string>(user?.nid_mock || '9900001001');
  const [nidInput, setNidInput] = useState<string>(user?.nid_mock || '9900001001');
  const [selectedDeedModal, setSelectedDeedModal] = useState<any | null>(null);
  const [loadingDeedModal, setLoadingDeedModal] = useState(false);

  // Citizen Dispute Form State
  const [disputePlotId, setDisputePlotId] = useState<number>(1);
  const [disputeType, setDisputeType] = useState('FORGERY_CLAIM');
  const [disputeDesc, setDisputeDesc] = useState(
    'আমার অজান্তে জাল আমমোক্তারনামা তৈরি করে এই দাগের জমি বিক্রির চেষ্টা চলছে।'
  );
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const loadCitizenData = (nidToUse = activeNid) => {
    BhumiApi.getMyVault(nidToUse)
      .then((res) => setVault(res))
      .catch(() => setVault({ found: false, person: null, owned_plots: [], deeds: [] }));
    BhumiApi.listDisputes()
      .then((res) => setDisputes(res))
      .catch(() => {});
    BhumiApi.getPlots()
      .then((res) => {
        setPlots(res);
        if (res.length > 0 && !disputePlotId) setDisputePlotId(res[0].id);
      })
      .catch(() => {});
    BhumiApi.getStatsSummary()
      .then((res) => setStats(res))
      .catch(() => {});
  };

  useEffect(() => {
    const targetNid = user?.nid_mock || '9900001001';
    setActiveNid(targetNid);
    setNidInput(targetNid);
    loadCitizenData(targetNid);
  }, [user]);

  const handleNidSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNid = nidInput.trim();
    if (!cleanNid) return;
    setActiveNid(cleanNid);
    loadCitizenData(cleanNid);
  };

  const handleSelectPresetNid = (presetNid: string) => {
    setNidInput(presetNid);
    setActiveNid(presetNid);
    loadCitizenData(presetNid);
  };

  const handleOpenDeedModal = async (deedNo: string) => {
    setLoadingDeedModal(true);
    try {
      const res = await BhumiApi.verifyDeedByCode(deedNo);
      setSelectedDeedModal(res);
    } catch {
      // fallback
    } finally {
      setLoadingDeedModal(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedDeedModal(null);
      }
    };
    if (selectedDeedModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedDeedModal]);

  const handleToggleLock = async (plotId: number) => {
    setActionMsg('');
    try {
      const res = await BhumiApi.togglePlotSaleLock(
        plotId,
        'নাগরিক পোর্টাল থেকে মালিক কর্তৃক বিক্রয় লক সক্রিয় করা হয়েছে'
      );
      setActionMsg(lang === 'bn' ? res.message_bn : res.message_en);
      loadCitizenData();
    } catch {
      setActionMsg(t('লক পরিবর্তন করতে সমস্যা হয়েছে।', 'Failed to toggle lock.'));
    }
  };

  const handleFileDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDispute(true);
    setActionMsg('');
    try {
      const res = await BhumiApi.fileDispute({
        plot_id: disputePlotId,
        complainant_name_bn: user?.full_name_bn || 'মোঃ আব্দুর রহিম শেখ',
        complainant_nid: user?.nid_mock || '9900001001',
        dispute_type: disputeType,
        description_bn: disputeDesc,
      });
      setActionMsg(lang === 'bn' ? res.message_bn : res.message_en);
      loadCitizenData();
    } catch {
      setActionMsg(t('অভিযোগ জমা দিতে সমস্যা হয়েছে।', 'Failed to file dispute.'));
    } finally {
      setSubmittingDispute(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="page-intro animate-rise">
        <h1>{t('নাগরিক জমি ভল্ট', 'Citizen Land Vault')}</h1>
        <p>{t('মালিকানা, বিক্রয় লক ও অভিযোগ দাখিল — আপনার বিএস খতিয়ান রেকর্ড এক কনসোলে।', 'Ownership, sale locks, and objections — your BS khatian records in one console.')}</p>
      </header>
      {/* Citizen Personal KPI & Quick Action Header */}
      <div className="panel p-5 bg-gradient-to-r from-[#006A4E]/5 via-[#EDF7F4] to-white border border-[#006A4E]/15 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#006A4E]/10 text-[#006A4E] text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-[#006A4E] animate-pulse" />
              {t('নাগরিক সেবা পোর্টাল', 'Citizen Public Portal')}
            </div>
            <h2 className="text-xl md:text-2xl font-black text-[#0A1F1C]">
              {t(
                `স্বাগতম, ${user?.full_name_bn || 'নাগরিক'}!`,
                `Welcome, ${user?.full_name_en || 'Citizen'}!`
              )}
            </h2>
            <p className="text-xs text-[#5F7A74]">
              {t(
                'আপনার ব্যক্তিগত ডিজিটাল জমি ভল্ট ও মালিকানা সুরক্ষা কনসোল — বিএস খতিয়ান, দলিল ও বিক্রয় লক নিয়ন্ত্রণ।',
                'Your personal digital land vault & ownership protection console — BS khatian, deeds, and sale locks.'
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('check')}
              className="btn-primary text-xs !min-h-[38px] py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
            >
              <Search className="w-4 h-4" />
              <span>{t('কেনার আগে জমি যাচাই', 'Check Before Buying')}</span>
            </button>
            <button
              onClick={() => onNavigate('qr')}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#EDF7F4] text-[#006A4E] border border-[#006A4E]/20 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer min-h-[38px]"
            >
              <QrCode className="w-4 h-4" />
              <span>{t('QR দলিল যাচাই', 'Verify QR Deed')}</span>
            </button>
          </div>
        </div>

        {/* 4 Citizen KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#006A4E]/10">
          <div className="p-3.5 rounded-xl bg-white border border-[#006A4E]/10 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
                {t('মালিকাধীন দাগ (বিএস)', 'MY PLOTS (BS)')}
              </span>
              <div className="text-xl font-extrabold text-[#0A1F1C] mt-1">
                {toBanglaDigits(vault?.owned_plots?.length ?? 0, lang)}
              </div>
              <button
                onClick={() => document.getElementById('citizen-vault')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-[11px] text-[#006A4E] font-bold hover:underline mt-0.5 inline-block cursor-pointer"
              >
                {t('ভল্টে দেখুন ↓', 'View in Vault ↓')}
              </button>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#EDF7F4] text-[#006A4E] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-[#006A4E]/10 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
                {t('বিক্রয় লককৃত দাগ', 'SALE-LOCKED')}
              </span>
              <div className="text-xl font-extrabold text-[#FF3B4A] mt-1">
                {toBanglaDigits(
                  vault?.owned_plots?.filter((p: any) => Number(p.owner_sale_locked) === 1).length ?? 0,
                  lang
                )}
              </div>
              <span className="text-[11px] text-[#5F7A74] mt-0.5 inline-block">
                {t('🔒 বিক্রয়ে সুরক্ষা', '🔒 Protected')}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#FFF0F1] text-[#FF3B4A] flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-[#006A4E]/10 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
                {t('সংশ্লিষ্ট রেজিস্ট্রিকৃত দলিল', 'LINKED DEEDS')}
              </span>
              <div className="text-xl font-extrabold text-[#0A1F1C] mt-1">
                {toBanglaDigits(vault?.deeds?.length ?? 0, lang)}
              </div>
              <span className="text-[11px] text-[#006A4E] font-medium mt-0.5 inline-block">
                {t('Ed25519 স্বাক্ষরিত', 'Ed25519 Signed')}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#FBF3E0] text-[#C4891A] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-[#006A4E]/10 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
                {t('দাখিলকৃত অভিযোগ / বিরোধ', 'DISPUTES FILED')}
              </span>
              <div className="text-xl font-extrabold text-[#0A1F1C] mt-1">
                {toBanglaDigits(disputes?.length ?? 0, lang)}
              </div>
              <span className="text-[11px] text-[#5F7A74] mt-0.5 inline-block">
                {t('এসি ল্যান্ড ট্রাইব্যুনাল', 'AC Land Tribunal')}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#EDF7F4] text-[#006A4E] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {actionMsg && (
        <div className="p-4 rounded-xl bg-[#EDF7F4] border-l-8 border-[#006A4E] text-[#006A4E] font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* NID Search & Demo Citizen Switcher Bar */}
      <div className="panel p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#006A4E]" />
            <div>
              <span className="text-xs font-bold text-[#0A1F1C]">
                {t('নাগরিক এনআইডি অনুসন্ধান ও ভল্ট নির্বাচন:', 'Citizen NID Lookup & Vault Switcher:')}
              </span>
              <div className="text-[11px] text-[#5F7A74]">
                {t('এনআইডি নম্বর দিয়ে যেকারো বিএস খতিয়ান মালিকানা, বিক্রয় লক ও রেজিস্ট্রিকৃত দলিল দেখুন:', 'Enter an NID to load registered plots, sale locks, and signed deeds:')}
              </div>
            </div>
          </div>
          <form onSubmit={handleNidSearch} className="flex gap-2">
            <input
              type="text"
              value={nidInput}
              onChange={(e) => setNidInput(e.target.value)}
              placeholder="9900001001"
              className="field font-mono text-xs font-bold w-36 !min-h-[36px] py-2"
            />
            <button
              type="submit"
              className="btn-primary text-xs !min-h-[36px] py-2 px-3.5"
            >
              {t('খুঁজুন', 'Lookup')}
            </button>
          </form>
        </div>

        {/* Quick Demo NID Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#006A4E]/10 text-xs">
          <span className="text-[#5F7A74] font-medium text-[11px] mr-1">{t('ডেমো প্রোফাইল:', 'Demo Profiles:')}</span>
          <button
            onClick={() => handleSelectPresetNid('9900001001')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer min-h-[28px] ${
              activeNid === '9900001001'
                ? 'bg-[#006A4E] text-white'
                : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
            }`}
          >
            {t('মোঃ রফিকুল ইসলাম (দাগ ১০১, খতিয়ান ৪১০১)', 'Md. Rafiqul Islam (Plot 101, Kh 4101)')}
          </button>
          <button
            onClick={() => handleSelectPresetNid('9900001002')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer min-h-[28px] ${
              activeNid === '9900001002'
                ? 'bg-[#006A4E] text-white'
                : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
            }`}
          >
            {t('মোসাঃ রাবেয়া খাতুন (দাগ ১০২, খতিয়ান ৪১০২)', 'Mst. Rabeya Khatun (Plot 102, Kh 4102)')}
          </button>
          <button
            onClick={() => handleSelectPresetNid('9900001003')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer min-h-[28px] ${
              activeNid === '9900001003'
                ? 'bg-[#006A4E] text-white'
                : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
            }`}
          >
            {t('মোঃ আব্দুল করিম (দাগ ১০৩, খতিয়ান ৪১০৩)', 'Md. Abdul Karim (Plot 103, Kh 4103)')}
          </button>
        </div>
      </div>

      {/* Citizen Control 1: My Land Vault + Plot Sale Protection Lock (🔒 বিক্রয় লক) */}
      {vault?.found && vault.person ? (
        <div className="panel p-6 space-y-5 animate-rise-delay">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#006A4E]/10 pb-4">
            <div>
              <h2 id="citizen-vault" className="font-bold text-lg md:text-xl text-[#074f38] flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#006A4E]" />
                <span>
                  {t(
                    'আমার জমির ভল্ট ও মালিকানা বিক্রয় লক কন্ট্রোল (Owner Sale Protection Lock)',
                    'My Land Vault & Owner Sale Protection Lock'
                  )}
                </span>
              </h2>
              <p className="text-xs text-[#5F7A74] mt-0.5">
                {t('মালিকের নাম:', 'Recorded Owner:')}{' '}
                <strong>{lang === 'bn' ? vault.person.name_bn : vault.person.name_en}</strong> •{' '}
                {t('এনআইডি:', 'NID:')} <span className="font-mono">{vault.person.nid_mock}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('check')}
                className="btn-ghost text-xs !min-h-[36px] py-2 px-3.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{t('নতুন জমি যাচাই', 'Check Plot')}</span>
              </button>
              <button
                onClick={() => onNavigate('qr')}
                className="px-3.5 py-2 rounded-lg bg-[#EDF7F4] text-[#0A1F1C]/90 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer min-h-[36px]"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{t('QR সনদ যাচাই', 'Verify QR')}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Owned Plots Table / Cards (7 cols) */}
            <div className="lg:col-span-7">
              <h3 className="text-sm font-bold text-[#0A1F1C]/90 mb-3">
                {t(
                  'সর্বশেষ বিএস খতিয়ান অনুযায়ী আপনার মালিকাধীন দাগসমূহ:',
                  'Your Recorded Plots (Latest BS Khatian):'
                )}
              </h3>
              {vault.owned_plots.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#EDF7F4]/80 border border-[#006A4E]/12 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-[#5F7A74] flex items-center justify-center mx-auto">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-xs text-[#0A1F1C]">
                    {t('কোনো বিএস খতিয়ান দাগ রেকর্ড পাওয়া যায়নি', 'No Recorded Plots Found for this NID')}
                  </div>
                  <p className="text-[11px] text-[#5F7A74] max-w-sm mx-auto">
                    {t(
                      'যদি সম্প্রতি জমি ক্রয় বা ওয়ারিশসূত্রে প্রাপ্ত হয়ে থাকেন, তবে এসি ল্যান্ড অফিসে নামজারির আবেদন জমা দিন।',
                      'If you recently purchased land or inherited shares, submit an e-mutation application to AC Land.'
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vault.owned_plots.map((op: any, i: number) => {
                    const isLocked = Number(op.owner_sale_locked) === 1;
                    return (
                      <div
                        key={i}
                        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isLocked
                            ? 'bg-rose-50/50 border-rose-200'
                            : 'bg-[#EDF7F4]/70 border-[#006A4E]/12'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-sm text-[#0A1F1C] flex items-center gap-2">
                            <span>
                              {lang === 'bn' ? op.mouza_bn : op.mouza_en} — {t('দাগ নং', 'Dag')}{' '}
                              {toBanglaDigits(op.dag_no, lang)}
                            </span>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-lg font-extrabold ${
                                isLocked
                                  ? 'bg-[#FF3B4A] text-white'
                                  : 'bg-[#006A4E] text-white'
                              }`}
                            >
                              {isLocked
                                ? t('🔒 বিক্রয় লক সক্রিয়', '🔒 SALE LOCKED')
                                : t('🔓 লেনদেন খোলা', '🔓 UNLOCKED')}
                            </span>
                          </div>
                          <div className="text-xs text-[#5F7A74] mt-1">
                            {t('বিএস খতিয়ান:', 'BS Khatian:')} {toBanglaDigits(op.khatian_no, lang)} •{' '}
                            {t('অংশ:', 'Share:')} {toBanglaDigits(op.share_fraction, lang)} (
                            {toBanglaDigits(op.share_area_decimal, lang)} {t('শতাংশ', 'dec')})
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleLock(op.plot_id)}
                          className={`px-3.5 py-2 rounded-lg font-extrabold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer min-h-[38px] ${
                            isLocked
                              ? 'bg-[#006A4E] text-white hover:bg-[#00553e]'
                              : 'bg-[#FF3B4A] text-white hover:bg-red-700'
                          }`}
                        >
                          {isLocked ? (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>{t('আনলক করুন', 'Unlock Plot')}</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>{t('🔒 বিক্রয় লক করুন', '🔒 Lock Against Sale')}</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Citizen Deed History (5 cols) */}
            <div className="lg:col-span-5">
              <h3 className="text-sm font-bold text-[#0A1F1C]/90 mb-3">
                {t('হ্যাশ লেজারে নিবন্ধিত দলিলের তালিকা:', 'Registered Deeds in Hash Ledger:')}
              </h3>
              <div className="space-y-2.5">
                {vault.deeds.length === 0 ? (
                  <p className="text-xs text-[#5F7A74] p-4 bg-[#EDF7F4]/80 rounded-xl border">
                    {t('কোনো নিবন্ধিত দলিল পাওয়া যায়নি।', 'No deeds found for this citizen.')}
                  </p>
                ) : (
                  vault.deeds.map((d: any) => (
                    <div
                      key={d.id}
                      className="p-3.5 rounded-xl bg-[#EDF7F4]/80 border border-[#006A4E]/12 flex items-center justify-between hover:bg-[#EDF7F4]/70 transition-colors"
                    >
                      <div>
                        <div className="font-bold text-xs text-[#0A1F1C] flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-[#006A4E]" />
                          <span>{d.deed_no}</span>
                        </div>
                        <div className="text-[11px] text-[#5F7A74] mt-0.5">
                          {t('দাগ:', 'Dag:')} {toBanglaDigits(d.dag_no, lang)} •{' '}
                          {toBanglaDigits(d.area_decimal, lang)} {t('শতাংশ', 'dec')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg bg-[#EDF7F4] text-[#006A4E]">
                          {d.status}
                        </span>
                        <button
                          onClick={() => handleOpenDeedModal(d.deed_no)}
                          title={t('QR কোড ও প্রমাণ দেখুন', 'View Deed QR & Proof')}
                          className="p-1.5 rounded-lg bg-white border border-[#006A4E]/12 hover:bg-[#EDF7F4] text-[#0A1F1C]/90 hover:text-[#006A4E] cursor-pointer min-h-[30px]"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="panel p-8 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="font-bold text-base text-[#074f38]">
            {t('এনআইডি নম্বর পাওয়া যায়নি', 'NID Profile Not Found')}
          </h3>
          <p className="text-xs text-[#5F7A74] max-w-md mx-auto">
            {t(
              'অনুসন্ধানকৃত এনআইডি নম্বরের বিপরীতে কোনো নাগরিক রেকর্ড মেলেনি। উপরের ডেমো প্রোফাইলগুলো থেকে নির্বাচন করে পরীক্ষা করুন।',
              'No citizen record matches this NID. Please select one of the demo profiles above.'
            )}
          </p>
        </div>
      )}

      {/* Citizen Control 2: File Land Fraud / Ownership Dispute (অভিযোগ ও আপত্তি দাখিল) */}
      <div className="panel p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleFileDispute} className="lg:col-span-6 space-y-4">
          <h3 className="font-bold text-lg text-[#074f38] flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-[#FF3B4A]" />
            <span>
              {t(
                'জালিয়াতি বা ওয়ারিশ বঞ্চনার আপত্তি দাখিল (File Land Objection)',
                'File Land Fraud / Ownership Objection Alert'
              )}
            </span>
          </h3>
          <p className="text-xs text-[#5F7A74]">
            {t(
              'কোনো দাগে জাল দলিল বা ওয়ারিশ বাদ দিয়ে বিক্রির চেষ্টা হলে এখানে অভিযোগ দিন। এটি তাৎক্ষণিকভাবে সাব-রেজিস্ট্রার ও এসি ল্যান্ড প্যানেলে সতর্কবার্তা পাঠাবে।',
              'Filing an objection immediately flags the plot in the Sub-Registrar and AC Land panels.'
            )}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">
                {t('সংশ্লিষ্ট দাগ নির্বাচন করুন:', 'Select Plot (Dag):')}
              </label>
              <select
                value={disputePlotId}
                onChange={(e) => setDisputePlotId(Number(e.target.value))}
                className="field text-xs font-semibold"
              >
                {plots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {lang === 'bn' ? p.mouza_bn : p.mouza_en} — {t('দাগ নং', 'Dag')} {p.dag_no}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                {t('অভিযোগের ধরন:', 'Objection Category:')}
              </label>
              <select
                value={disputeType}
                onChange={(e) => setDisputeType(e.target.value)}
                className="field text-xs font-semibold"
              >
                <option value="FORGERY_CLAIM">{t('জাল দলিল / ভুয়া আমমোক্তারনামা', 'Fake Deed / Forged POA')}</option>
                <option value="INHERITANCE_EXCLUSION">{t('ওয়ারিশ বঞ্চিত করে বিক্রির চেষ্টা', 'Heir Exclusion Dispute')}</option>
                <option value="COURT_INJUNCTION">{t('আদালতের নিষেধাজ্ঞা / দেওয়ানি মামলা', 'Court Injunction / Civil Suit')}</option>
                <option value="BOUNDARY_GRAB">{t('সীমানা বা অতিরিক্ত অংশ দখল', 'Boundary / Area Encroachment')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">
              {t('অভিযোগের বিবরণ:', 'Objection Details:')}
            </label>
            <textarea
              value={disputeDesc}
              onChange={(e) => setDisputeDesc(e.target.value)}
              rows={2}
              className="field text-xs"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submittingDispute}
            className="btn-danger text-xs"
          >
            <Send className="w-4 h-4" />
            <span>
              {submittingDispute
                ? t('জমা হচ্ছে...', 'Submitting...')
                : t('আপত্তি ও অভিযোগ নিবন্ধন করুন', 'Submit Official Objection')}
            </span>
          </button>
        </form>

        <div className="lg:col-span-6 space-y-3">
          <h3 className="text-sm font-extrabold text-[#0A1F1C]">
            {t('দাখিলকৃত অভিযোগ ও ট্রাইব্যুনাল স্ট্যাটাস:', 'Filed Objections & Tribunal Status:')}
          </h3>
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {disputes.map((dsp) => (
              <div
                key={dsp.id}
                className={`p-3.5 rounded-xl border ${
                  dsp.status === 'OPEN'
                    ? 'bg-amber-50/60 border-amber-300'
                    : 'bg-[#EDF7F4]/80 border-[#006A4E]/12'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#0A1F1C]">
                    {lang === 'bn' ? dsp.mouza_bn : dsp.mouza_en} — {t('দাগ', 'Dag')} {dsp.dag_no} ({dsp.dispute_type})
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      dsp.status === 'OPEN'
                        ? 'bg-[#C4891A] text-white'
                        : dsp.status === 'UPHELD_FROZEN'
                        ? 'bg-[#FF3B4A] text-white'
                        : 'bg-[#006A4E] text-white'
                    }`}
                  >
                    {dsp.status}
                  </span>
                </div>
                <p className="text-xs text-[#5F7A74] mt-1">{dsp.description_bn}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Deed Proof Modal (F19) */}
      {(selectedDeedModal || loadingDeedModal) && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="deed-modal-title"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border-2 border-[#006A4E] space-y-4 max-h-[90vh] overflow-y-auto relative animate-rise">
            <button
              onClick={() => setSelectedDeedModal(null)}
              aria-label="Close"
              className="absolute top-4 right-4 p-2 rounded-full bg-[#EDF7F4] hover:bg-[#E2EFE9] text-[#0A1F1C] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {loadingDeedModal ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-[#006A4E] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-[#5F7A74]">
                  {t('দলিলের ক্রিপ্টোগ্রাফিক রেকর্ড লোড হচ্ছে...', 'Loading cryptographic deed record...')}
                </p>
              </div>
            ) : selectedDeedModal ? (
              <>
                <div className="flex items-center gap-3 border-b border-[#006A4E]/15 pb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#006A4E] text-white flex items-center justify-center font-black">
                    দলিল
                  </div>
                  <div>
                    <h3 id="deed-modal-title" className="font-bold text-lg text-[#074f38] flex items-center gap-2">
                      <span>{selectedDeedModal.deed?.deed_no}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                          selectedDeedModal.verified
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {selectedDeedModal.verified ? '✔ VERIFIED' : '✖ TAMPERED'}
                      </span>
                    </h3>
                    <p className="text-xs text-[#5F7A74]">
                      {t('নিবন্ধিত দলিল ও ক্রিপ্টোগ্রাফিক প্রমাণপত্র', 'Registered Deed & Cryptographic Proof')}
                    </p>
                  </div>
                </div>

                {/* QR Code and Key Details */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-[#EDF7F4]/60 p-4 rounded-xl border border-[#006A4E]/12">
                  <div className="md:col-span-4 flex flex-col items-center justify-center p-2 bg-white rounded-xl border border-[#006A4E]/20 shadow-xs">
                    {selectedDeedModal.qr_data_uri ? (
                      <img
                        src={selectedDeedModal.qr_data_uri}
                        alt="Deed QR"
                        className="w-36 h-36 object-contain"
                      />
                    ) : (
                      <QrCode className="w-28 h-28 text-[#006A4E]" />
                    )}
                    <span className="text-[10px] font-mono text-[#5F7A74] mt-1">
                      Ed25519 Verified QR
                    </span>
                  </div>

                  <div className="md:col-span-8 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[#5F7A74] block">{t('মৌজা:', 'Mouza:')}</span>
                        <strong>{lang === 'bn' ? selectedDeedModal.deed?.mouza_bn : selectedDeedModal.deed?.mouza_en}</strong>
                      </div>
                      <div>
                        <span className="text-[#5F7A74] block">{t('দাগ নং:', 'Dag No:')}</span>
                        <strong>{toBanglaDigits(selectedDeedModal.deed?.dag_no, lang)}</strong>
                      </div>
                      <div>
                        <span className="text-[#5F7A74] block">{t('জমির পরিমাণ:', 'Area:')}</span>
                        <strong>{toBanglaDigits(selectedDeedModal.deed?.area_decimal, lang)} {t('শতাংশ', 'dec')}</strong>
                      </div>
                      <div>
                        <span className="text-[#5F7A74] block">{t('স্ট্যাটাস:', 'Status:')}</span>
                        <span className="badge-status">{selectedDeedModal.deed?.status}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#006A4E]/10 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#5F7A74]">{t('বিক্রেতা:', 'Seller:')}</span>
                        <span>{selectedDeedModal.deed?.seller_name_bn} ({selectedDeedModal.deed?.seller_nid})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#5F7A74]">{t('ক্রেতা:', 'Buyer:')}</span>
                        <span>{selectedDeedModal.deed?.buyer_name_bn} ({selectedDeedModal.deed?.buyer_nid})</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cryptographic Ledger Block Info */}
                <div className="p-3.5 bg-slate-900 text-slate-200 rounded-xl text-xs space-y-1.5 font-mono">
                  <div className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider flex items-center justify-between">
                    <span>Cryptographic Ledger Proof</span>
                    <span>Ed25519: {selectedDeedModal.cryptographic_proof?.signature_valid ? 'VALID' : 'INVALID'}</span>
                  </div>
                  <div className="truncate">
                    <span className="text-slate-400">Content Hash: </span>
                    <span className="text-white">{selectedDeedModal.cryptographic_proof?.stored_content_hash}</span>
                  </div>
                  <div className="truncate">
                    <span className="text-slate-400">Recomputed: </span>
                    <span className={selectedDeedModal.cryptographic_proof?.hash_matches ? 'text-emerald-400' : 'text-rose-400'}>
                      {selectedDeedModal.cryptographic_proof?.recomputed_content_hash}
                    </span>
                  </div>
                  <div className="truncate">
                    <span className="text-slate-400">Previous Hash: </span>
                    <span className="text-slate-300">{selectedDeedModal.cryptographic_proof?.prev_hash}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#006A4E]/15">
                  <button
                    onClick={() => {
                      sessionStorage.setItem('bs_pending_verify_search', selectedDeedModal.deed?.deed_no);
                      setSelectedDeedModal(null);
                      onNavigate('qr');
                    }}
                    className="btn-primary text-xs !min-h-[36px] py-2 px-3.5 flex items-center gap-1.5"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>{t('ভেরিফাই পোর্টালে বিস্তারিত দেখুন →', 'Open in Verify Portal →')}</span>
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => window.print()}
                      className="btn-ghost text-xs !min-h-[36px] py-2 px-3.5 flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{t('প্রিন্ট', 'Print')}</span>
                    </button>
                    <button
                      onClick={() => setSelectedDeedModal(null)}
                      className="px-3.5 py-2 rounded-lg bg-[#EDF7F4] hover:bg-[#E2EFE9] text-xs font-bold text-[#0A1F1C]"
                    >
                      {t('বন্ধ করুন', 'Close')}
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
