import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import {
  QrCode,
  CheckCircle2,
  XOctagon,
  ShieldCheck,
  KeyRound,
  Printer,
  X,
  AlertTriangle,
  RotateCcw,
  Zap,
  Lock,
  FileCheck
} from 'lucide-react';

export const VerifyDeedQrPage: React.FC = () => {
  const { lang, t } = useAppUI();
  const [deedCode, setDeedCode] = useState('DL-2026-1001');
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tamperLoading, setTamperLoading] = useState(false);
  const [tamperSuccessMsg, setTamperSuccessMsg] = useState<string | null>(null);
  const [showCertModal, setShowCertModal] = useState(false);

  const handleVerify = async (codeToVerify = deedCode) => {
    setLoading(true);
    setErrorMsg(null);
    setTamperSuccessMsg(null);
    try {
      const res = await BhumiApi.verifyDeedByCode(codeToVerify.trim());
      setResult(res);
    } catch {
      setErrorMsg(
        t(
          'এই দলিল নম্বরটি লেজারে পাওয়া যায়নি। সঠিক দলিল নম্বর দিন (যেমন: DL-2026-1001 বা DL-2026-1005)।',
          'Deed number not found in ledger. Try DL-2026-1001 or DL-2026-1005.'
        )
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTamperSimulation = async () => {
    setTamperLoading(true);
    try {
      await BhumiApi.tamperDeedDemo(deedCode, 25.0);
      setTamperSuccessMsg(
        t(
          'সতর্কতা: ডাটাবেজে জমির পরিমাণ জোরপূর্বক ২৫ শতাংশ করা হয়েছে! এখন পুনরায় হ্যাশ যাচাই করুন।',
          'Simulated: Deed area modified to 25.0 Decimal in database. Verifying hash now...'
        )
      );
      await handleVerify(deedCode);
    } catch {
      setErrorMsg(t('টেম্পারিং সিমুলেশন ব্যর্থ হয়েছে।', 'Failed to simulate tamper.'));
    } finally {
      setTamperLoading(false);
    }
  };

  const handleRestoreLedger = async () => {
    setTamperLoading(true);
    try {
      await BhumiApi.restoreDeedDemo(deedCode);
      setTamperSuccessMsg(
        t(
          'সফল: লেজার মূল সত্য অবস্থায় পুনরুদ্ধার করা হয়েছে (১২ শতাংশ)। হ্যাশ চেইন আবার বৈধ।',
          'Restored: Ledger restored to authentic truth (12.0 Decimal). Hash chain valid again.'
        )
      );
      await handleVerify(deedCode);
    } catch {
      setErrorMsg(t('লেজার পুনরুদ্ধার ব্যর্থ হয়েছে।', 'Failed to restore ledger.'));
    } finally {
      setTamperLoading(false);
    }
  };

  useEffect(() => {
    handleVerify('DL-2026-1001');
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner / Card */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <QrCode className="w-6 h-6 text-[#006A4E] shrink-0" />
            <span>
              {t(
                'QR কোড ও ক্রিপ্টোগ্রাফিক হ্যাশ-চেইন দলিল সনদ যাচাই',
                'QR Code & Cryptographic Hash-Chain Deed Verification'
              )}
            </span>
          </h1>
          <span className="self-start md:self-auto text-xs px-2.5 py-1 rounded-full font-bold bg-[#E6F2EE] text-[#006A4E] border border-[#006A4E]/20 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            Ed25519 + SHA-256
          </span>
        </div>

        <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
          {t(
            'দলিলের গায়ে থাকা QR কোড স্ক্যান করুন অথবা দলিল নম্বর লিখে দেখুন দলিলটি নিবন্ধনের পর কোনো অসাধু চক্র বা সার্ভার অ্যাডমিন তথ্য পরিবর্তন (Tamper) করেছে কি না।',
            'Scan a deed QR or enter a Deed Number below to verify its Ed25519 signature and SHA-256 hash chain.'
          )}
        </p>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t('দ্রুত পরীক্ষার জন্য ডেমো দলিলসমূহ:', 'Quick Test Demo Deeds:')}
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setDeedCode('DL-2026-1001');
                handleVerify('DL-2026-1001');
              }}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs border transition-colors cursor-pointer min-h-[36px] flex items-center gap-1.5 ${
                deedCode === 'DL-2026-1001'
                  ? 'bg-[#006A4E] text-white border-[#006A4E]'
                  : 'bg-[#E6F2EE] text-[#006A4E] border-[#006A4E]/30 hover:bg-[#006A4E] hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{t('DL-2026-1001 (স্বাক্ষরিত ও অক্ষত দলিল)', 'DL-2026-1001 (Authentic Signed Deed)')}</span>
            </button>

            <button
              onClick={() => {
                setDeedCode('DL-2026-1005');
                handleVerify('DL-2026-1005');
              }}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs border transition-colors cursor-pointer min-h-[36px] flex items-center gap-1.5 ${
                deedCode === 'DL-2026-1005'
                  ? 'bg-[#F42A41] text-white border-[#F42A41]'
                  : 'bg-[#FEECEE] text-[#F42A41] border-[#F42A41]/30 hover:bg-[#F42A41] hover:text-white'
              }`}
            >
              <XOctagon className="w-3.5 h-3.5 shrink-0" />
              <span>{t('DL-2026-1005 (টেম্পারকৃত / হ্যাশ অমিল দলিল)', 'DL-2026-1005 (Tampered Area Deed)')}</span>
            </button>

            <button
              onClick={() => {
                setDeedCode('DL-2026-1002');
                handleVerify('DL-2026-1002');
              }}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs border transition-colors cursor-pointer min-h-[36px] flex items-center gap-1.5 ${
                deedCode === 'DL-2026-1002'
                  ? 'bg-[#B7791F] text-white border-[#B7791F]'
                  : 'bg-[#FEF3C7] text-[#B7791F] border-[#B7791F]/30 hover:bg-[#B7791F] hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{t('DL-2026-1002 (মিউটেশন পেন্ডিং দলিল)', 'DL-2026-1002 (Pending Mutation Deed)')}</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={deedCode}
              onChange={(e) => setDeedCode(e.target.value)}
              placeholder="DL-2026-1001"
              className="w-full p-3 pl-10 rounded-lg border border-slate-300 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#006A4E]/30 focus:border-[#006A4E]"
            />
            <QrCode className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
          </div>
          <button
            onClick={() => handleVerify(deedCode)}
            disabled={loading}
            className="px-6 py-3 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-extrabold text-sm cursor-pointer shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('যাচাই হচ্ছে...', 'Verifying...')}</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>{t('দলিল যাচাই করুন', 'Verify Deed')}</span>
              </>
            )}
          </button>
        </div>

        {/* Live Tamper Simulator Widget */}
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>{t('লাইভ টেম্পারিং ও ব্লকচেইন ডিফেন্স সিমুলেশন:', 'Live Tamper & Defense Simulation:')}</span>
            </div>
            <span className="text-[11px] text-slate-500">
              {t('বিচারক ও পরীক্ষকদের জন্য ১-ক্লিক ডেমো', '1-Click demo for hackathon evaluators')}
            </span>
          </div>

          <p className="text-xs text-slate-600">
            {t(
              'যদি কোনো অসৎ কর্মকর্তা ডাটাবেজে ম্যানুয়ালি জমি ১২ শতাংশ থেকে ২৫ শতাংশ করে দেয়, তবে SHA-256 হ্যাশ পরিবর্তন সনাক্ত করে সেকেন্ডের মধ্যে দলিলটি লাল সতর্কবার্তায় পরিণত হবে।',
              'If a rogue admin manually alters deed area from 12 to 25 decimal in the DB, SHA-256 hash immediately fails and flags red.'
            )}
          </p>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={handleTamperSimulation}
              disabled={tamperLoading}
              className="px-3.5 py-2 rounded-lg bg-[#FEECEE] text-[#F42A41] hover:bg-[#F42A41] hover:text-white text-xs font-bold border border-[#F42A41]/30 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[36px]"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{t('ডাটাবেজে জমি ২৫ শতাংশ করুন (Tamper)', 'Simulate Tamper (Area -> 25 Decimal)')}</span>
            </button>

            <button
              onClick={handleRestoreLedger}
              disabled={tamperLoading}
              className="px-3.5 py-2 rounded-lg bg-[#E6F2EE] text-[#006A4E] hover:bg-[#006A4E] hover:text-white text-xs font-bold border border-[#006A4E]/30 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[36px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('মূল সত্য অবস্থায় ফেরত নিন (Restore)', 'Restore Ledger Truth (12 Decimal)')}</span>
            </button>
          </div>
        </div>
      </div>

      {tamperSuccessMsg && (
        <div className="p-4 rounded-xl bg-amber-50 border-l-4 border-amber-500 text-amber-900 font-bold text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{tamperSuccessMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-[#FEECEE] border-l-4 border-[#F42A41] font-bold text-xs text-[#1A1A1A] flex items-center gap-2">
          <XOctagon className="w-4 h-4 text-[#F42A41] shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Verification Result Card */}
      {result && (
        <div className="rounded-xl overflow-hidden border border-slate-200/90 shadow-sm bg-white">
          {/* Header Banner */}
          <div
            className={`p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
              result.verified ? 'bg-[#006A4E]' : 'bg-[#F42A41]'
            }`}
          >
            <div className="flex items-start gap-4">
              {result.verified ? (
                <div className="p-3 bg-white/20 rounded-2xl shrink-0">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
              ) : (
                <div className="p-3 bg-white/20 rounded-2xl shrink-0">
                  <XOctagon className="w-8 h-8 text-white" />
                </div>
              )}
              <div>
                <div className="text-xl md:text-2xl font-extrabold tracking-tight">
                  {lang === 'bn' ? result.badge_bn : result.badge_en}
                </div>
                <p className="mt-1 text-xs md:text-sm font-medium opacity-95 max-w-2xl">
                  {lang === 'bn' ? result.message_bn : result.message_en}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded bg-black/20 text-xs font-mono font-bold tracking-wider">
                    {result.deed?.deed_no}
                  </span>
                  <span className="px-2.5 py-1 rounded bg-black/20 text-xs font-bold">
                    {t('অবস্থা:', 'Status:')} {result.deed?.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-row md:flex-col items-center md:items-end gap-3 shrink-0 w-full md:w-auto justify-between md:justify-center">
              {result.qr_data_uri && (
                <div className="bg-white p-2 rounded-xl shadow-md shrink-0">
                  <img
                    src={result.qr_data_uri}
                    alt={`QR for ${result.deed?.deed_no}`}
                    className="w-24 h-24"
                  />
                </div>
              )}
              <button
                onClick={() => setShowCertModal(true)}
                className="px-4 py-2 rounded-lg bg-white text-slate-800 font-bold text-xs hover:bg-slate-100 shadow transition-colors flex items-center gap-1.5 cursor-pointer min-h-[36px]"
              >
                <Printer className="w-3.5 h-3.5 text-[#006A4E]" />
                <span>{t('সনদ প্রিন্ট করুন', 'Print Certificate')}</span>
              </button>
            </div>
          </div>

          {/* Details Body */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
            {/* Deed Metadata */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-[#006A4E]" />
                  <span>{t('দলিলের দাপ্তরিক বিবরণী', 'Official Deed Metadata')}</span>
                </h3>
                <span className="text-[11px] font-bold text-slate-500">
                  {t('সাব-রেজিস্ট্রি রেকর্ড', 'Sub-Registry Record')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">{t('দলিল নম্বর', 'Deed Number')}</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{result.deed?.deed_no}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">{t('দলিলের ধরন', 'Deed Type')}</span>
                  <span className="font-bold text-slate-800">{result.deed?.deed_type || 'SAF_KABALA (বিক্রয়)'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 sm:col-span-2">
                  <span className="text-[11px] text-slate-500 block">{t('মৌজা ও দাগ নং', 'Mouza & Dag No')}</span>
                  <span className="font-bold text-slate-800">
                    {lang === 'bn' ? result.deed?.mouza_bn : result.deed?.mouza_en || result.deed?.mouza_bn},{' '}
                    {t('দাগ নং', 'Dag')} {toBanglaDigits(result.deed?.dag_no, lang)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">{t('বিক্রেতা', 'Seller')}</span>
                  <span className="font-bold text-slate-800 block">{result.deed?.seller_name_bn}</span>
                  <span className="text-[10px] text-slate-500 font-mono">NID: {result.deed?.seller_nid}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">{t('ক্রেতা', 'Buyer')}</span>
                  <span className="font-bold text-slate-800 block">{result.deed?.buyer_name_bn}</span>
                  <span className="text-[10px] text-slate-500 font-mono">NID: {result.deed?.buyer_nid}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 sm:col-span-2 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 block">{t('জমির পরিমাণ ও অংশ', 'Area & Share')}</span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {toBanglaDigits(result.deed?.area_decimal, lang)} {t('শতাংশ', 'Decimal')}
                    </span>
                    <span className="text-slate-500 text-xs ml-2">
                      ({t('অংশ:', 'Share:')} {result.deed?.share_fraction || '১/১'})
                    </span>
                  </div>
                  {result.deed?.price_bdt && (
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 block">{t('ঘোষিত মূল্য', 'Declared Value')}</span>
                      <span className="font-bold text-slate-800">
                        ৳ {toBanglaDigits(Number(result.deed.price_bdt).toLocaleString(), lang)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cryptographic Ledger & Ed25519 Proof */}
            <div className="space-y-3 bg-slate-900 text-slate-100 p-5 rounded-xl border border-slate-800 font-mono text-[11px] shadow-inner">
              <div className="font-sans font-bold text-xs text-emerald-400 flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4" />
                  <span>
                    {t(
                      'ক্রিপ্টোগ্রাফিক লেজার ও ডিজিটাল স্বাক্ষর অডিট',
                      'Cryptographic Ledger & Ed25519 Audit'
                    )}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                  CHAIN_INDEX #{result.deed?.chain_index ?? 1}
                </span>
              </div>

              <div className="space-y-2 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
                    STORED_CONTENT_HASH (নিবন্ধনকালে স্বাক্ষরিত হ্যাশ):
                  </span>
                  <div className="break-all p-2 bg-slate-950/80 rounded border border-slate-800 text-slate-200">
                    {result.cryptographic_proof?.stored_content_hash}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
                    RECOMPUTED_HASH (বর্তমান ডাটাবেজের সরাসরি SHA-256 গণনা):
                  </span>
                  <div
                    className={`break-all p-2 rounded border ${
                      result.cryptographic_proof?.hash_matches
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-bold'
                        : 'bg-rose-950/50 border-rose-500/50 text-rose-300 font-bold'
                    }`}
                  >
                    {result.cryptographic_proof?.recomputed_content_hash}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">HASH_INTEGRITY:</span>
                    <span
                      className={`font-bold font-sans text-xs ${
                        result.cryptographic_proof?.hash_matches ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {result.cryptographic_proof?.hash_matches ? 'MATCHED (অক্ষত)' : 'MISMATCH (পরিবর্তিত)'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">ED25519_SIGNATURE:</span>
                    <span
                      className={`font-bold font-sans text-xs ${
                        result.cryptographic_proof?.signature_valid ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {result.cryptographic_proof?.signature_valid ? 'VALID (বৈধ)' : 'INVALID (অবৈধ)'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
                    PREV_BLOCK_HASH (পূর্ববর্তী ব্লকের লিংক):
                  </span>
                  <div className="break-all p-2 bg-slate-950/80 rounded border border-slate-800 text-slate-400 text-[10px]">
                    {result.cryptographic_proof?.prev_hash || 'GENESIS_BLOCK_0000000000000000'}
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2 font-sans text-[11px] text-slate-400 border-t border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {t(
                      'ভূমি সুরক্ষা প্রটোকলে প্রতিটি দলিল পূর্ববর্তী দলিলের সাথে গাণিতিকভাবে আবদ্ধ। কোনো পরিবর্তন লুকানো অসম্ভব।',
                      'Each deed in BhumiShield is chained to the previous block. Silent data tampering is mathematically impossible.'
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Deed Verification Certificate Modal (Printable) */}
      {showCertModal && result && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8 border border-slate-200">
            {/* Modal Controls (Screen Only) */}
            <div className="flex items-center justify-between border-b pb-4 mb-6 print:hidden">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#006A4E]" />
                <h2 className="text-base font-extrabold text-slate-800">
                  {t('অফিসিয়াল দলিল সনদ প্রিভিউ', 'Official Deed Certificate Preview')}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t('প্রিন্ট / PDF সংরক্ষণ', 'Print / Save PDF')}</span>
                </button>
                <button
                  onClick={() => setShowCertModal(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Certificate Content */}
            <div className="p-6 border-4 border-double border-slate-300 rounded-xl bg-white space-y-6 text-slate-800">
              {/* Header with Emblem */}
              <div className="text-center space-y-1 border-b pb-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#006A4E] text-white flex items-center justify-center font-bold text-lg mb-2 shadow-sm">
                  ভূমি
                </div>
                <h3 className="font-extrabold text-base tracking-wide text-slate-900">
                  গণপ্রজাতন্ত্রী বাংলাদেশ সরকার
                </h3>
                <p className="text-xs font-bold text-[#006A4E]">
                  ভূমি মন্ত্রণালয় • নিবন্ধন পরিদপ্তর • ভূমি সুরক্ষা ক্রিপ্টোগ্রাফিক সনদ
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  VERIFICATION CERTIFICATE NO: {result.deed?.deed_no}-CERT-{Date.now().toString().slice(-6)}
                </p>
              </div>

              {/* Status Banner */}
              <div
                className={`p-3 rounded-lg text-center font-extrabold text-sm ${
                  result.verified
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-50 text-rose-800 border border-rose-300'
                }`}
              >
                {result.verified ? '✔ ডিজিটাল স্বাক্ষর ও লেজার যাচাই সম্পন্ন: দলিলটি সম্পূর্ণ বৈধ ও অক্ষত' : '✖ সতর্কতা: দলিলে টেম্পারিং বা তথ্য পরিবর্তনের প্রমাণ মিলেছে'}
              </div>

              {/* Deed Attributes Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">দলিল নম্বর:</span>
                  <strong className="font-mono">{result.deed?.deed_no}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">নিবন্ধন অবস্থা:</span>
                  <strong>{result.deed?.status}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">মৌজা ও জেএল:</span>
                  <strong>{result.deed?.mouza_bn || result.deed?.mouza_en}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">দাগ নম্বর:</span>
                  <strong>দাগ নং {toBanglaDigits(result.deed?.dag_no, 'bn')}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">বিক্রেতা:</span>
                  <strong>{result.deed?.seller_name_bn}</strong> (NID: {result.deed?.seller_nid})
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">ক্রেতা:</span>
                  <strong>{result.deed?.buyer_name_bn}</strong> (NID: {result.deed?.buyer_nid})
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">জমির পরিমাণ:</span>
                  <strong>{toBanglaDigits(result.deed?.area_decimal, 'bn')} শতাংশ</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">চেইন ইনডেক্স:</span>
                  <strong className="font-mono">#{result.deed?.chain_index ?? 1}</strong>
                </div>
              </div>

              {/* Cryptographic Footprint */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[10px] font-mono space-y-1.5">
                <div className="font-sans font-bold text-[11px] text-[#006A4E]">
                  ক্রিপ্টোগ্রাফিক হ্যাশ প্রমাণ (SHA-256):
                </div>
                <div className="break-all">
                  <strong>STORED_HASH:</strong> {result.cryptographic_proof?.stored_content_hash}
                </div>
                <div className="break-all">
                  <strong>RECOMPUTED_HASH:</strong> {result.cryptographic_proof?.recomputed_content_hash}
                </div>
                <div>
                  <strong>ED25519_SIGNATURE:</strong> {result.cryptographic_proof?.signature_valid ? 'VALID' : 'INVALID'} | <strong>HASH_INTEGRITY:</strong> {result.cryptographic_proof?.hash_matches ? 'VERIFIED' : 'FAILED'}
                </div>
              </div>

              {/* QR and Sign-off */}
              <div className="flex items-center justify-between pt-4 border-t">
                {result.qr_data_uri && (
                  <div className="flex items-center gap-3">
                    <img
                      src={result.qr_data_uri}
                      alt="Verification QR"
                      className="w-16 h-16 border rounded p-1 bg-white"
                    />
                    <div className="text-[10px] text-slate-500 leading-tight">
                      <p className="font-bold text-slate-700">QR কোড স্ক্যান করে</p>
                      <p>অনলাইনে তাৎক্ষণিক</p>
                      <p>বৈধতা যাচাই করুন</p>
                    </div>
                  </div>
                )}
                <div className="text-right text-[10px] text-slate-600">
                  <div className="h-10 flex items-end justify-end">
                    <div className="font-mono font-bold text-xs text-[#006A4E] border-b border-dashed border-slate-400 pb-0.5">
                      [Ed25519 Digital Seal]
                    </div>
                  </div>
                  <p className="font-bold mt-1">সাব-রেজিস্ট্রার কার্যালয়</p>
                  <p>ভূমি সুরক্ষা ব্লকচেইন গেটওয়ে</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
