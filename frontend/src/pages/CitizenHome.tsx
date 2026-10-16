import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import {
  QrCode,
  Search,
  HelpCircle,
  X,
  CheckCircle2,
  ShieldAlert,
  FileText,
  Lock,
  Unlock,
  AlertOctagon,
  Send,
} from 'lucide-react';

export const CitizenHome: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { lang, user, t } = useAppUI();
  const [hideGuide, setHideGuide] = useState(() => localStorage.getItem('bs_hide_guide') === '1');
  const [vault, setVault] = useState<any>(null);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [actionMsg, setActionMsg] = useState('');

  // Citizen Dispute Form State
  const [disputePlotId, setDisputePlotId] = useState<number>(1);
  const [disputeType, setDisputeType] = useState('FORGERY_CLAIM');
  const [disputeDesc, setDisputeDesc] = useState(
    'আমার অজান্তে জাল আমমোক্তারনামা তৈরি করে এই দাগের জমি বিক্রির চেষ্টা চলছে।'
  );
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const loadCitizenData = () => {
    const nid = user?.nid_mock || '1985123456001';
    BhumiApi.getMyVault(nid)
      .then((res) => setVault(res))
      .catch(() => {});
    BhumiApi.listDisputes()
      .then((res) => setDisputes(res))
      .catch(() => {});
    BhumiApi.getPlots()
      .then((res) => {
        setPlots(res);
        if (res.length > 0 && !disputePlotId) setDisputePlotId(res[0].id);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadCitizenData();
  }, [user]);

  const dismissGuide = () => {
    localStorage.setItem('bs_hide_guide', '1');
    setHideGuide(true);
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
        complainant_nid: user?.nid_mock || '1985123456001',
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
    <div className="space-y-8">
      {/* Intro Banner */}
      <div className="bg-[#E6F2EE] border-2 border-[#006A4E]/30 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#006A4E] text-white">
            {t('নাগরিক ড্যাশবোর্ড ও ভূমি সুরক্ষা কন্ট্রোল', 'Citizen Dashboard & Protection Controls')}
          </span>
          <h1 className="text-2xl md:text-4xl font-extrabold text-[#006A4E] mt-2">
            {t(
              'জমি কেনার আগে ৩টি ক্লিকে মালিকানা যাচাই করুন এবং নিজের জমি লক রাখুন',
              'Verify Land in 3 Clicks & Lock Your Plots Against Fraud'
            )}
          </h1>
          <p className="mt-2 text-lg text-[#1A1A1A] max-w-3xl">
            {t(
              'জাল দলিল, এক জমি দুইবার বিক্রি বা গোপন ব্যাংক ঋণ থেকে বাঁচতে নিচের যেকোনো একটি সেবা বেছে নিন।',
              'Protect yourself from fake deeds, double sales, or hidden bank mortgages.'
            )}
          </p>
        </div>
      </div>

      {/* 3 Huge Hero Cards (Mandatory Design System Requirement) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => onNavigate('qr')}
          className="card-surface group text-left bg-white hover:bg-[#E6F2EE]/60 p-8 rounded-2xl border-2 border-[#006A4E] shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
        >
          <div>
            <div className="w-16 h-16 rounded-2xl bg-[#006A4E] text-white flex items-center justify-center mb-6 shadow-xs">
              <QrCode className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#1A1A1A] group-hover:text-[#006A4E]">
              📷 {t('QR স্ক্যান করে দলিল যাচাই করুন', 'Scan QR to Verify Deed')}
            </h2>
            <p className="mt-3 text-[#5F6B66] text-base">
              {t(
                'দলিলের গায়ে থাকা QR কোড ক্যামেরায় ধরুন অথবা দলিল নম্বর লিখে দেখুন দলিলটি আসল কি না।',
                'Scan the QR code on a deed or enter its number to check if it is genuine or tampered.'
              )}
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200 font-bold text-[#006A4E] flex items-center justify-between">
            <span>{t('এখনই যাচাই করুন', 'Verify Now')}</span>
            <span>→</span>
          </div>
        </button>

        <button
          onClick={() => onNavigate('check')}
          className="card-surface group text-left bg-white hover:bg-[#E6F2EE]/60 p-8 rounded-2xl border-2 border-[#006A4E] shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
        >
          <div>
            <div className="w-16 h-16 rounded-2xl bg-[#006A4E] text-white flex items-center justify-center mb-6 shadow-xs">
              <Search className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#1A1A1A] group-hover:text-[#006A4E]">
              🔎 {t('জমি কেনার আগে যাচাই করুন', 'Check Before You Buy')}
            </h2>
            <p className="mt-3 text-[#5F6B66] text-base">
              {t(
                'মৌজা ও দাগ নম্বর দিয়ে দেখুন বর্তমান মালিক কে, ব্যাংক ঋণ আছে কি না এবং খতিয়ান চেইন ঠিক আছে কি না।',
                'Select mouza and plot number to check the real owner, bank mortgages, and khatian history.'
              )}
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200 font-bold text-[#006A4E] flex items-center justify-between">
            <span>{t('দাগ ও খতিয়ান খুঁজুন', 'Check Plot Now')}</span>
            <span>→</span>
          </div>
        </button>

        <button
          onClick={() => onNavigate('help')}
          className="card-surface group text-left bg-white hover:bg-[#E6F2EE]/60 p-8 rounded-2xl border-2 border-gray-300 hover:border-[#006A4E] shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
        >
          <div>
            <div className="w-16 h-16 rounded-2xl bg-[#E6F2EE] text-[#006A4E] flex items-center justify-center mb-6 border border-[#006A4E]/30">
              <HelpCircle className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#1A1A1A] group-hover:text-[#006A4E]">
              ❓ {t('সাহায্য ও ৮টি ডেমো কেস', 'Help & 8 Demo Scenarios')}
            </h2>
            <p className="mt-3 text-[#5F6B66] text-base">
              {t(
                'কীভাবে ব্যবহার করবেন তার সহজ নির্দেশিকা এবং বিচারকদের জন্য ৮টি প্রস্তুতকৃত ডেমো সিনারিও।',
                'Simple guide on how to use BhumiShield and 8 pre-configured hackathon demo scenarios.'
              )}
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200 font-bold text-[#006A4E] flex items-center justify-between">
            <span>{t('নির্দেশিকা দেখুন', 'Open Guide & Demos')}</span>
            <span>→</span>
          </div>
        </button>
      </div>

      {actionMsg && (
        <div className="p-4 rounded-xl bg-[#E6F2EE] border-l-8 border-[#006A4E] text-[#006A4E] font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Citizen Control 1: My Land Vault + Plot Sale Protection Lock (🔒 বিক্রয় লক) */}
      {vault?.found && (
        <div className="bg-white rounded-2xl p-6 border-2 border-[#006A4E]/30 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-4">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-[#006A4E] flex items-center gap-2">
                <Lock className="w-6 h-6" />
                <span>
                  {t(
                    'আমার জমির ভল্ট ও মালিকানা বিক্রয় লক কন্ট্রোল (Plot Sale Lock)',
                    'My Land Vault & Owner Sale Protection Lock'
                  )}
                </span>
              </h2>
              <p className="text-sm text-[#5F6B66]">
                {t('মালিকের নাম:', 'Owner:')} <strong>{lang === 'bn' ? vault.person.name_bn : vault.person.name_en}</strong> •{' '}
                {t('এনআইডি:', 'NID:')} <span className="font-mono">{vault.person.nid_mock}</span>
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#E6F2EE] text-[#006A4E] text-xs font-extrabold">
              {t(
                'লক করা থাকলে সাব-রেজিস্ট্রি অফিসে কোনো দলিল রেজিস্ট্রি হবে না',
                'Locked plots automatically block Sub-Registry deed registration'
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-gray-800 mb-3">
                {t('বিএস খতিয়ান অনুযায়ী আপনার মালিকাধীন দাগসমূহ:', 'Your Owned Plots (Latest BS Khatian):')}
              </h3>
              <div className="space-y-3">
                {vault.owned_plots.map((op: any, i: number) => {
                  const isLocked = Number(op.owner_sale_locked) === 1;
                  return (
                    <div
                      key={i}
                      className={`p-4 rounded-xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isLocked
                          ? 'bg-[#FEECEE]/50 border-[#F42A41]'
                          : 'bg-[#E6F2EE]/40 border-[#006A4E]/30'
                      }`}
                    >
                      <div>
                        <div className="font-extrabold text-[#1A1A1A] flex items-center gap-2">
                          <span>
                            {lang === 'bn' ? op.mouza_bn : op.mouza_en} — {t('দাগ নং', 'Dag')}{' '}
                            {toBanglaDigits(op.dag_no, lang)}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
                              isLocked
                                ? 'bg-[#F42A41] text-white'
                                : 'bg-[#006A4E] text-white'
                            }`}
                          >
                            {isLocked ? t('🔒 বিক্রয় লক', '🔒 SALE LOCKED') : t('🔓 লেনদেন খোলা', '🔓 UNLOCKED')}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {t('বিএস খতিয়ান:', 'BS Khatian:')} {toBanglaDigits(op.khatian_no, lang)} •{' '}
                          {t('অংশ:', 'Share:')} {toBanglaDigits(op.share_fraction, lang)} (
                          {toBanglaDigits(op.share_area_decimal, lang)} {t('শতাংশ', 'dec')})
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleLock(op.plot_id)}
                        className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer ${
                          isLocked
                            ? 'bg-[#006A4E] text-white hover:bg-[#00553e]'
                            : 'bg-[#F42A41] text-white hover:bg-red-700'
                        }`}
                      >
                        {isLocked ? (
                          <>
                            <Unlock className="w-4 h-4" />
                            <span>{t('আনলক করুন', 'Unlock Plot')}</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            <span>{t('🔒 বিক্রয় লক করুন', '🔒 Lock Against Sale')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-800 mb-3">
                {t('সাম্প্রতিক দলিল ও হ্যাশ লেজার রেকর্ড:', 'Recent Deeds & Ledger Records:')}
              </h3>
              <div className="space-y-2.5">
                {vault.deeds.slice(0, 4).map((d: any) => (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-sm text-[#1A1A1A] flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#006A4E]" />
                        <span>{d.deed_no}</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        {t('দাগ:', 'Dag:')} {toBanglaDigits(d.dag_no, lang)} •{' '}
                        {toBanglaDigits(d.area_decimal, lang)} {t('শতাংশ', 'dec')}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                        d.status === 'REGISTERED'
                          ? 'bg-[#E6F2EE] text-[#006A4E]'
                          : 'bg-[#FEECEE] text-[#F42A41]'
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Citizen Control 2: File Land Fraud / Ownership Dispute (অভিযোগ ও আপত্তি দাখিল) */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleFileDispute} className="lg:col-span-6 space-y-4">
          <h3 className="text-xl font-extrabold text-[#1A1A1A] flex items-center gap-2">
            <AlertOctagon className="w-6 h-6 text-[#F42A41]" />
            <span>
              {t(
                'জালিয়াতি বা ওয়ারিশ বঞ্চনার অভিযোগ দাখিল করুন (Dispute Alert)',
                'File Land Fraud / Ownership Objection Alert'
              )}
            </span>
          </h3>
          <p className="text-xs text-[#5F6B66]">
            {t(
              'কোনো দাগে জাল দলিল বা ওয়ারিশ বাদ দিয়ে বিক্রির চেষ্টা হলে এখানে অভিযোগ দিন। এটি সাথে সাথে সাব-রেজিস্ট্রার ও এসি ল্যান্ড কনসোলে সতর্কবার্তা পাঠাবে।',
              'Filing an objection immediately flags the plot in the Sub-Registrar and AC Land consoles.'
            )}
          </p>

          <div>
            <label className="block text-sm font-bold mb-1">
              {t('সংশ্লিষ্ট দাগ নির্বাচন করুন:', 'Select Plot (Dag):')}
            </label>
            <select
              value={disputePlotId}
              onChange={(e) => setDisputePlotId(Number(e.target.value))}
              className="w-full p-3 rounded-xl border-2 border-gray-300 bg-white font-semibold"
            >
              {plots.slice(0, 25).map((p) => (
                <option key={p.id} value={p.id}>
                  {lang === 'bn' ? p.mouza_bn : p.mouza_en} — {t('দাগ নং', 'Dag')} {p.dag_no}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">
              {t('অভিযোগের ধরন:', 'Objection Type:')}
            </label>
            <select
              value={disputeType}
              onChange={(e) => setDisputeType(e.target.value)}
              className="w-full p-3 rounded-xl border-2 border-gray-300 bg-white font-semibold"
            >
              <option value="FORGERY_CLAIM">{t('জাল দলিল / ভুয়া আমমোক্তারনামা', 'Fake Deed / Forged POA')}</option>
              <option value="INHERITANCE_EXCLUSION">{t('ওয়ারিশ বঞ্চিত করে বিক্রির চেষ্টা', 'Heir Exclusion Dispute')}</option>
              <option value="COURT_INJUNCTION">{t('আদালতের নিষেধাজ্ঞা / দেওয়ানি মামলা', 'Court Injunction / Civil Suit')}</option>
              <option value="BOUNDARY_GRAB">{t('সীমানা বা অতিরিক্ত অংশ দখল', 'Boundary / Area Encroachment')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">
              {t('অভিযোগের বিবরণ:', 'Objection Details:')}
            </label>
            <textarea
              value={disputeDesc}
              onChange={(e) => setDisputeDesc(e.target.value)}
              rows={2}
              className="w-full p-3 rounded-xl border-2 border-gray-300"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submittingDispute}
            className="px-6 py-3 rounded-xl bg-[#F42A41] hover:bg-red-700 text-white font-extrabold flex items-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>
              {submittingDispute
                ? t('জমা হচ্ছে...', 'Submitting...')
                : t('অভিযোগ রেজিস্টার করুন', 'Submit Official Objection')}
            </span>
          </button>
        </form>

        <div className="lg:col-span-6 space-y-3">
          <h3 className="text-lg font-extrabold text-[#1A1A1A]">
            {t('দাখিলকৃত অভিযোগ ও বর্তমান অবস্থা:', 'Filed Objections & Resolution Status:')}
          </h3>
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {disputes.map((dsp) => (
              <div
                key={dsp.id}
                className={`p-3.5 rounded-xl border ${
                  dsp.status === 'OPEN'
                    ? 'bg-[#FEF3C7]/60 border-[#B7791F]'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-[#1A1A1A]">
                    {lang === 'bn' ? dsp.mouza_bn : dsp.mouza_en} — {t('দাগ', 'Dag')} {dsp.dag_no} ({dsp.dispute_type})
                  </span>
                  <span
                    className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
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
                <p className="text-xs text-gray-800 mt-1">{dsp.description_bn}</p>
                {dsp.resolution_note_bn && (
                  <p className="text-xs font-bold text-[#006A4E] mt-1">
                    {t('এসি ল্যান্ড সিদ্ধান্ত:', 'AC Land Decision:')} {dsp.resolution_note_bn}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dismissible 3-Step How-To Illustration */}
      {!hideGuide && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs relative">
          <button
            onClick={dismissGuide}
            aria-label={t('নির্দেশিকা বন্ধ করুন', 'Dismiss guide')}
            className="absolute top-4 right-4 p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>

          <h3 className="text-xl font-bold text-[#1A1A1A] mb-4">
            {t('কীভাবে ব্যবহার করবেন (৩টি সহজ ধাপ)', 'How It Works (3 Simple Steps)')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#FAFBFA] border border-gray-200 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#006A4E] text-white font-extrabold flex items-center justify-center shrink-0">
                {t('১', '1')}
              </div>
              <div>
                <div className="font-bold text-[#1A1A1A]">
                  {t('মৌজা ও দাগ নির্বাচন করুন', 'Select Mouza & Plot')}
                </div>
                <p className="text-sm text-[#5F6B66] mt-1">
                  {t(
                    'ড্রপডাউন থেকে আপনার বিভাগ, জেলা, উপজেলা, মৌজা এবং দাগ নম্বর বেছে নিন।',
                    'Choose your division, district, upazila, mouza, and plot number from dropdowns.'
                  )}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#FAFBFA] border border-gray-200 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#006A4E] text-white font-extrabold flex items-center justify-center shrink-0">
                {t('২', '2')}
              </div>
              <div>
                <div className="font-bold text-[#1A1A1A]">
                  {t('মালিকানা ও চেইন মিলিয়ে দেখুন', 'Check Lineage & Liens')}
                </div>
                <p className="text-sm text-[#5F6B66] mt-1">
                  {t(
                    'সিস্টেম স্বয়ংক্রিয়ভাবে CS→SA→RS→BS খতিয়ান, বিক্রয় লক ও ব্যাংক মর্টগেজ পরীক্ষা করবে।',
                    'The system automatically checks CS→SA→RS→BS khatians, sale locks, and bank mortgages.'
                  )}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#FAFBFA] border border-gray-200 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#006A4E] text-white font-extrabold flex items-center justify-center shrink-0">
                {t('৩', '3')}
              </div>
              <div>
                <div className="font-bold text-[#1A1A1A]">
                  {t('সহজ বাংলায় ফলাফল ও করণীয় জানুন', 'Get Plain-Language Advice')}
                </div>
                <p className="text-sm text-[#5F6B66] mt-1">
                  {t(
                    'সবুজ (✔ নিরাপদ), হলুদ (⚠ সতর্কতা) বা লাল (✖ ঝুঁকিপূর্ণ) ব্যানার দেখে সিদ্ধান্ত নিন।',
                    'See a clear Green (Safe), Amber (Warning), or Red (High Risk) banner with next steps.'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
