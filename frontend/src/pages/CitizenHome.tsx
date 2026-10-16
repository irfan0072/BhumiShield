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
      {/* Velzon Executive Overview Grid for Citizen Panel */}
      <VelzonOverviewSection role="citizen" stats={stats} onQuickAction={onNavigate} />

      {actionMsg && (
        <div className="p-4 rounded-xl bg-[#E6F2EE] border-l-8 border-[#006A4E] text-[#006A4E] font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* NID Search & Demo Citizen Switcher Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#006A4E]" />
            <div>
              <span className="text-xs font-bold text-slate-800">
                {t('নাগরিক এনআইডি অনুসন্ধান ও ভল্ট নির্বাচন:', 'Citizen NID Lookup & Vault Switcher:')}
              </span>
              <div className="text-[11px] text-slate-500">
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
              className="p-2 rounded-lg border border-slate-300 font-mono text-xs font-bold w-36"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-lg bg-[#006A4E] text-white text-xs font-bold hover:bg-[#00553e] cursor-pointer min-h-[36px]"
            >
              {t('খুঁজুন', 'Lookup')}
            </button>
          </form>
        </div>

        {/* Quick Demo NID Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium text-[11px] mr-1">{t('ডেমো প্রোফাইল:', 'Demo Profiles:')}</span>
          <button
            onClick={() => handleSelectPresetNid('9900001001')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer min-h-[28px] ${
              activeNid === '9900001001'
                ? 'bg-[#006A4E] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t('মোঃ আব্দুর রহিম শেখ (৩টি দাগ, ১টি লক)', 'Abdur Rahim (3 plots, 1 lock)')}
          </button>
          <button
            onClick={() => handleSelectPresetNid('9900001002')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer min-h-[28px] ${
              activeNid === '9900001002'
                ? 'bg-[#006A4E] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t('মেহেরুন নেছা (ওয়ারিশ দাগ)', 'Meherun Nesa (Heir Plot)')}
          </button>
          <button
            onClick={() => handleSelectPresetNid('9900001003')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer min-h-[28px] ${
              activeNid === '9900001003'
                ? 'bg-[#006A4E] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t('তানভীর আহমেদ (বন্ধক দাগ)', 'Tanvir Ahmed (Mortgaged)')}
          </button>
        </div>
      </div>

      {/* Citizen Control 1: My Land Vault + Plot Sale Protection Lock (🔒 বিক্রয় লক) */}
      {vault?.found && vault.person ? (
        <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-2xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg md:text-xl font-extrabold text-slate-800 flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#006A4E]" />
                <span>
                  {t(
                    'আমার জমির ভল্ট ও মালিকানা বিক্রয় লক কন্ট্রোল (Owner Sale Protection Lock)',
                    'My Land Vault & Owner Sale Protection Lock'
                  )}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('মালিকের নাম:', 'Recorded Owner:')}{' '}
                <strong>{lang === 'bn' ? vault.person.name_bn : vault.person.name_en}</strong> •{' '}
                {t('এনআইডি:', 'NID:')} <span className="font-mono">{vault.person.nid_mock}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('check')}
                className="px-3.5 py-2 rounded-lg bg-[#E6F2EE] text-[#006A4E] text-xs font-extrabold flex items-center gap-1.5 cursor-pointer min-h-[36px]"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{t('নতুন জমি যাচাই', 'Check Plot')}</span>
              </button>
              <button
                onClick={() => onNavigate('qr')}
                className="px-3.5 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer min-h-[36px]"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{t('QR সনদ যাচাই', 'Verify QR')}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Owned Plots Table / Cards (7 cols) */}
            <div className="lg:col-span-7">
              <h3 className="text-sm font-bold text-slate-700 mb-3">
                {t(
                  'সর্বশেষ বিএস খতিয়ান অনুযায়ী আপনার মালিকাধীন দাগসমূহ:',
                  'Your Recorded Plots (Latest BS Khatian):'
                )}
              </h3>
              {vault.owned_plots.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mx-auto">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-xs text-slate-800">
                    {t('কোনো বিএস খতিয়ান দাগ রেকর্ড পাওয়া যায়নি', 'No Recorded Plots Found for this NID')}
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
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
                            : 'bg-slate-50/70 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                            <span>
                              {lang === 'bn' ? op.mouza_bn : op.mouza_en} — {t('দাগ নং', 'Dag')}{' '}
                              {toBanglaDigits(op.dag_no, lang)}
                            </span>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
                                isLocked
                                  ? 'bg-[#F42A41] text-white'
                                  : 'bg-[#006A4E] text-white'
                              }`}
                            >
                              {isLocked
                                ? t('🔒 বিক্রয় লক সক্রিয়', '🔒 SALE LOCKED')
                                : t('🔓 লেনদেন খোলা', '🔓 UNLOCKED')}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
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
                              : 'bg-[#F42A41] text-white hover:bg-red-700'
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
              <h3 className="text-sm font-bold text-slate-700 mb-3">
                {t('হ্যাশ লেজারে নিবন্ধিত দলিলের তালিকা:', 'Registered Deeds in Hash Ledger:')}
              </h3>
              <div className="space-y-2.5">
                {vault.deeds.length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 bg-slate-50 rounded-xl border">
                    {t('কোনো নিবন্ধিত দলিল পাওয়া যায়নি।', 'No deeds found for this citizen.')}
                  </p>
                ) : (
                  vault.deeds.slice(0, 5).map((d: any) => (
                    <div
                      key={d.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:bg-slate-100/70 transition-colors"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-[#006A4E]" />
                          <span>{d.deed_no}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {t('দাগ:', 'Dag:')} {toBanglaDigits(d.dag_no, lang)} •{' '}
                          {toBanglaDigits(d.area_decimal, lang)} {t('শতাংশ', 'dec')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#E6F2EE] text-[#006A4E]">
                          {d.status}
                        </span>
                        <button
                          onClick={() => handleOpenDeedModal(d.deed_no)}
                          title={t('QR কোড ও প্রমাণ দেখুন', 'View Deed QR & Proof')}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-[#E6F2EE] text-slate-700 hover:text-[#006A4E] cursor-pointer min-h-[30px]"
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
        <div className="bg-white rounded-xl p-8 border border-slate-200 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-base font-extrabold text-slate-800">
            {t('এনআইডি নম্বর পাওয়া যায়নি', 'NID Profile Not Found')}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {t(
              'অনুসন্ধানকৃত এনআইডি নম্বরের বিপরীতে কোনো নাগরিক রেকর্ড মেলেনি। উপরের ডেমো প্রোফাইলগুলো থেকে নির্বাচন করে পরীক্ষা করুন।',
              'No citizen record matches this NID. Please select one of the demo profiles above.'
            )}
          </p>
        </div>
      )}

      {/* Citizen Control 2: File Land Fraud / Ownership Dispute (অভিযোগ ও আপত্তি দাখিল) */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-2xs grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleFileDispute} className="lg:col-span-6 space-y-4">
          <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-[#F42A41]" />
            <span>
              {t(
                'জালিয়াতি বা ওয়ারিশ বঞ্চনার আপত্তি দাখিল (File Land Objection)',
                'File Land Fraud / Ownership Objection Alert'
              )}
            </span>
          </h3>
          <p className="text-xs text-slate-500">
            {t(
              'কোনো দাগে জাল দলিল বা ওয়ারিশ বাদ দিয়ে বিক্রির চেষ্টা হলে এখানে অভিযোগ দিন। এটি তাৎক্ষণিকভাবে সাব-রেজিস্ট্রার ও এসি ল্যান্ড প্যানেলে সতর্কবার্তা পাঠাবে।',
              'Filing an objection immediately flags the plot in the Sub-Registrar and AC Land panels.'
            )}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('সংশ্লিষ্ট দাগ নির্বাচন করুন:', 'Select Plot (Dag):')}
              </label>
              <select
                value={disputePlotId}
                onChange={(e) => setDisputePlotId(Number(e.target.value))}
                className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
              >
                {plots.slice(0, 25).map((p) => (
                  <option key={p.id} value={p.id}>
                    {lang === 'bn' ? p.mouza_bn : p.mouza_en} — {t('দাগ নং', 'Dag')} {p.dag_no}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('অভিযোগের ধরন:', 'Objection Category:')}
              </label>
              <select
                value={disputeType}
                onChange={(e) => setDisputeType(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
              >
                <option value="FORGERY_CLAIM">{t('জাল দলিল / ভুয়া আমমোক্তারনামা', 'Fake Deed / Forged POA')}</option>
                <option value="INHERITANCE_EXCLUSION">{t('ওয়ারিশ বঞ্চিত করে বিক্রির চেষ্টা', 'Heir Exclusion Dispute')}</option>
                <option value="COURT_INJUNCTION">{t('আদালতের নিষেধাজ্ঞা / দেওয়ানি মামলা', 'Court Injunction / Civil Suit')}</option>
                <option value="BOUNDARY_GRAB">{t('সীমানা বা অতিরিক্ত অংশ দখল', 'Boundary / Area Encroachment')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('অভিযোগের বিবরণ:', 'Objection Details:')}
            </label>
            <textarea
              value={disputeDesc}
              onChange={(e) => setDisputeDesc(e.target.value)}
              rows={2}
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submittingDispute}
            className="px-5 py-2.5 rounded-lg bg-[#F42A41] hover:bg-red-700 text-white text-xs font-extrabold flex items-center gap-2 cursor-pointer min-h-[40px]"
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
          <h3 className="text-sm font-extrabold text-slate-800">
            {t('দাখিলকৃত অভিযোগ ও ট্রাইব্যুনাল স্ট্যাটাস:', 'Filed Objections & Tribunal Status:')}
          </h3>
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {disputes.map((dsp) => (
              <div
                key={dsp.id}
                className={`p-3.5 rounded-xl border ${
                  dsp.status === 'OPEN'
                    ? 'bg-amber-50/60 border-amber-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">
                    {lang === 'bn' ? dsp.mouza_bn : dsp.mouza_en} — {t('দাগ', 'Dag')} {dsp.dag_no} ({dsp.dispute_type})
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      dsp.status === 'OPEN'
                        ? 'bg-[#B7791F] text-white'
                        : dsp.status === 'UPHELD_FROZEN'
                        ? 'bg-[#F42A41] text-white'
                        : 'bg-[#006A4E] text-white'
                    }`}
                  >
                    {dsp.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{dsp.description_bn}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
