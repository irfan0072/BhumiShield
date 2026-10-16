import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { VelzonOverviewSection } from '../components/VelzonOverviewSection';
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
      {/* Registry overview */}
      <VelzonOverviewSection role="citizen" stats={stats} onQuickAction={onNavigate} />

      {actionMsg && (
        <div className="p-4 rounded-xl bg-[#E8F5F1] border-l-8 border-[#0D6B5C] text-[#0D6B5C] font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* NID Search & Demo Citizen Switcher Bar */}
      <div className="panel p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#0D6B5C]" />
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
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#0D6B5C]/10 text-xs">
          <span className="text-[#5F7A74] font-medium text-[11px] mr-1">{t('ডেমো প্রোফাইল:', 'Demo Profiles:')}</span>
          <button
            onClick={() => handleSelectPresetNid('9900001001')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer min-h-[28px] ${
              activeNid === '9900001001'
                ? 'bg-[#0D6B5C] text-white'
                : 'bg-[#EDF4F1] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
            }`}
          >
            {t('মোঃ আব্দুর রহিম শেখ (৩টি দাগ, ১টি লক)', 'Abdur Rahim (3 plots, 1 lock)')}
          </button>
          <button
            onClick={() => handleSelectPresetNid('9900001002')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer min-h-[28px] ${
              activeNid === '9900001002'
                ? 'bg-[#0D6B5C] text-white'
                : 'bg-[#EDF4F1] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
            }`}
          >
            {t('মেহেরুন নেছা (ওয়ারিশ দাগ)', 'Meherun Nesa (Heir Plot)')}
          </button>
          <button
            onClick={() => handleSelectPresetNid('9900001003')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer min-h-[28px] ${
              activeNid === '9900001003'
                ? 'bg-[#0D6B5C] text-white'
                : 'bg-[#EDF4F1] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
            }`}
          >
            {t('তানভীর আহমেদ (বন্ধক দাগ)', 'Tanvir Ahmed (Mortgaged)')}
          </button>
        </div>
      </div>

      {/* Citizen Control 1: My Land Vault + Plot Sale Protection Lock (🔒 বিক্রয় লক) */}
      {vault?.found && vault.person ? (
        <div className="panel p-6 space-y-5 animate-rise-delay">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#0D6B5C]/10 pb-4">
            <div>
              <h2 className="font-display text-lg md:text-xl text-[#062823] flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#0D6B5C]" />
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
                className="px-3.5 py-2 rounded-lg bg-[#EDF4F1] text-[#0A1F1C]/90 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer min-h-[36px]"
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
                <div className="p-6 rounded-xl bg-[#EDF4F1]/80 border border-[#0D6B5C]/12 text-center space-y-2">
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
                            : 'bg-[#EDF4F1]/70 border-[#0D6B5C]/12'
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
                                  : 'bg-[#0D6B5C] text-white'
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
                              ? 'bg-[#0D6B5C] text-white hover:bg-[#0A5549]'
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
                  <p className="text-xs text-[#5F7A74] p-4 bg-[#EDF4F1]/80 rounded-xl border">
                    {t('কোনো নিবন্ধিত দলিল পাওয়া যায়নি।', 'No deeds found for this citizen.')}
                  </p>
                ) : (
                  vault.deeds.slice(0, 5).map((d: any) => (
                    <div
                      key={d.id}
                      className="p-3.5 rounded-xl bg-[#EDF4F1]/80 border border-[#0D6B5C]/12 flex items-center justify-between hover:bg-[#EDF4F1]/70 transition-colors"
                    >
                      <div>
                        <div className="font-bold text-xs text-[#0A1F1C] flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-[#0D6B5C]" />
                          <span>{d.deed_no}</span>
                        </div>
                        <div className="text-[11px] text-[#5F7A74] mt-0.5">
                          {t('দাগ:', 'Dag:')} {toBanglaDigits(d.dag_no, lang)} •{' '}
                          {toBanglaDigits(d.area_decimal, lang)} {t('শতাংশ', 'dec')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg bg-[#E8F5F1] text-[#0D6B5C]">
                          {d.status}
                        </span>
                        <button
                          onClick={() => handleOpenDeedModal(d.deed_no)}
                          title={t('QR কোড ও প্রমাণ দেখুন', 'View Deed QR & Proof')}
                          className="p-1.5 rounded-lg bg-white border border-[#0D6B5C]/12 hover:bg-[#E8F5F1] text-[#0A1F1C]/90 hover:text-[#0D6B5C] cursor-pointer min-h-[30px]"
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
          <h3 className="font-display text-base text-[#062823]">
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
          <h3 className="font-display text-lg text-[#062823] flex items-center gap-2">
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
                {plots.slice(0, 25).map((p) => (
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
                    : 'bg-[#EDF4F1]/80 border-[#0D6B5C]/12'
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
                        : 'bg-[#0D6B5C] text-white'
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
    </div>
  );
};
