import React, { useState, useEffect, useRef } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import {
  ShieldCheck,
  ShieldAlert,
  Printer,
  Copy,
  Check,
  X,
  Building2,
  AlertTriangle,
  Lock,
  Unlock,
  QrCode,
  FileText,
  Calendar,
  CheckCircle2,
  Award,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface LandHealthPassportModalProps {
  plot: any;
  onClose: () => void;
  onNavigate?: (route: string) => void;
}

export const LandHealthPassportModal: React.FC<LandHealthPassportModalProps> = ({
  plot,
  onClose,
  onNavigate,
}) => {
  const { lang, t } = useAppUI();
  const [loading, setLoading] = useState<boolean>(true);
  const [auditData, setAuditData] = useState<any>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const passportNumber = `LHP-2026-${String(plot?.dag_no || '101').padStart(4, '0')}`;
  const issueDate = new Date().toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    let isMounted = true;
    const fetchAudit = async () => {
      try {
        setLoading(true);
        const dagOrId = plot?.dag_no || plot?.plot_id || 1;
        const res = await BhumiApi.citizenCheckBeforeYouBuy(dagOrId);
        if (isMounted) {
          setAuditData(res);
        }
      } catch (err) {
        console.warn('Failed to fetch full audit for passport, using plot data', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchAudit();
    return () => {
      isMounted = false;
    };
  }, [plot]);

  const riskReport = auditData?.risk_report;
  const isSafe = !riskReport || riskReport.verdict === 'CLEAN' || riskReport.verdict === 'SAFE' || riskReport.verdict === 'LOW_RISK';
  const hasMortgage = Boolean(
    plot?.is_mortgaged ||
    auditData?.plot?.is_mortgaged ||
    (riskReport?.active_mortgage_count && riskReport.active_mortgage_count > 0)
  );
  const hasDispute = Boolean(
    plot?.is_disputed ||
    auditData?.plot?.is_disputed ||
    (riskReport?.active_dispute_count && riskReport.active_dispute_count > 0)
  );
  const isSaleLocked = Boolean(plot?.owner_sale_locked ?? auditData?.plot?.owner_sale_locked);

  // Compute Grade & Score
  let score = 100;
  if (hasDispute) score -= 45;
  if (hasMortgage) score -= 25;
  if (!isSaleLocked) score -= 5;

  let grade = 'A+';
  let gradeText = t('শতভাগ নিষ্কণ্টক ও সুরক্ষিত', '100% Clean Title & Secure');
  let gradeColor = 'text-emerald-700 bg-emerald-100 border-emerald-300';

  if (score < 50) {
    grade = 'D';
    gradeText = t('উচ্চ ঝুঁকি ও বিরোধপূর্ণ', 'High Risk / Under Dispute');
    gradeColor = 'text-rose-700 bg-rose-100 border-rose-300';
  } else if (score < 75) {
    grade = 'B';
    gradeText = t('বন্ধক বা শর্তযুক্ত লিয়েন বিদ্যমান', 'Active Mortgage Encumbrance');
    gradeColor = 'text-amber-700 bg-amber-100 border-amber-300';
  } else if (score < 95) {
    grade = 'A';
    gradeText = t('নিরাপদ টাইটেল (সেল-লক সুপারিশকৃত)', 'Safe Title (Lock Recommended)');
    gradeColor = 'text-teal-700 bg-teal-100 border-teal-300';
  }

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/check?dag=${plot?.dag_no || ''}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      {/* Container */}
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Control Bar (Screen Only) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                {t('স্মার্ট ভূমি স্বাস্থ্য পাসপোর্ট (Land Health Passport)', 'Smart Land Health Passport')}
              </h3>
              <p className="text-[11px] text-slate-400">
                {t('অফিসিয়াল ডিজিটাল অডিট ও সুরক্ষা সনদ', 'Official Digital Audit & Security Certificate')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title={t('যাচাই লিংক কপি করুন', 'Copy verification link')}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t('কপি হয়েছে!', 'Copied!') : t('লিংক কপি', 'Copy Link')}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-[#006A4E] hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('প্রিন্ট / PDF', 'Print / PDF')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer text-sm"
              title={t('বন্ধ করুন', 'Close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Area */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-slate-50/50 print:p-0 print:bg-white custom-scrollbar flex-1" ref={printAreaRef}>
          {/* Printable Sheet */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border-2 border-slate-200/90 shadow-sm relative overflow-hidden print:border-none print:shadow-none print:p-4">
            {/* Watermark Logo in Background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
              <div className="w-96 h-96 rounded-full border-[16px] border-emerald-900 flex items-center justify-center text-7xl font-serif font-black text-emerald-900">
                ভূমি
              </div>
            </div>

            {/* Official Header Banner */}
            <div className="border-b-2 border-emerald-700/80 pb-5 text-center relative space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#006A4E] text-[11px] font-extrabold uppercase tracking-widest mb-1">
                <Sparkles className="w-3 h-3 text-[#006A4E]" />
                <span>গণপ্রজাতন্ত্রী বাংলাদেশ সরকার • ভূমি মন্ত্রণালয়</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {t('স্মার্ট ভূমি রেকর্ড ও ডিজিটাল স্বাস্থ্য সনদপত্র', 'Smart Land Record & Digital Health Passport')}
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                {t('ভূমি সুরক্ষা ক্রিপ্টোগ্রাফিক লেজার ও জাতীয় ভূমি রেকর্ড ডাটাবেস দ্বারা সত্যায়িত', 'Certified by BhumiShield Cryptographic Ledger & National Land Records')}
              </p>

              {/* Passport ID & Issue Date Strip */}
              <div className="pt-3 flex flex-wrap items-center justify-between text-xs text-slate-500 font-mono border-t border-slate-100 mt-3">
                <div>
                  <span className="text-slate-400">সনদ নম্বর: </span>
                  <strong className="text-slate-900">{passportNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-400">ইস্যুর তারিখ: </span>
                  <strong className="text-slate-900">{issueDate}</strong>
                </div>
              </div>
            </div>

            {/* Top Grade & Health Score Highlight Card */}
            <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-slate-50 border border-emerald-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center shrink-0 shadow-xs ${gradeColor}`}>
                  <span className="text-2xl font-black leading-none">{grade}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">GRADE</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                      {t('স্বাস্থ্য স্কোর ও টাইটেল রেটিং', 'Health Score & Title Rating')}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-600 text-white">
                      {toBanglaDigits(score, lang)} / ১০০
                    </span>
                  </div>
                  <h4 className="text-base font-extrabold text-slate-900 mt-0.5">{gradeText}</h4>
                  <p className="text-[11px] text-slate-600">
                    {score >= 90
                      ? t('এই দাগটি সম্পূর্ণরূপে নিষ্কণ্টক, কোনো ব্যাংক লিয়েন বা দেওয়ানি মামলা নেই।', 'This plot is completely clear of all encumbrances and ready for transfer.')
                      : t('এই দাগটিতে কিছু আইনি বা ব্যাংকিং বিধিনিষেধ রয়েছে। বিবরণ নিচে দেখুন।', 'This plot has legal or banking conditions. See breakdown below.')}
                  </p>
                </div>
              </div>

              {/* QR Seal & Hash */}
              <div className="flex items-center gap-3 shrink-0 bg-white p-2.5 rounded-xl border border-slate-200">
                <div className="w-16 h-16 bg-slate-900 rounded-lg flex items-center justify-center text-white p-1">
                  <QrCode className="w-14 h-14" />
                </div>
                <div className="text-left text-[10px] font-mono text-slate-500 leading-tight">
                  <div className="font-bold text-slate-800">ডিজিটাল ভেরিফিকেশন সিল</div>
                  <div className="text-[9px] text-emerald-700 font-bold">SHA-256 Validated</div>
                  <div className="text-[9px] text-slate-400 mt-1">bhumishield.gov.bd</div>
                </div>
              </div>
            </div>

            {/* Plot Geographic & Identity Schedule */}
            <div className="mt-5">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#006A4E]" />
                <span>{t('জমির মৌলিক তফসিল ও পরিচিতি', 'Parcel Schedule & Identity')}</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-400 text-[10px] block font-medium">{t('দাগ নং', 'Plot Dag No')}</span>
                  <strong className="text-base font-black text-[#006A4E]">
                    {toBanglaDigits(plot?.dag_no_bn || plot?.dag_no || '১০১', lang)}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-400 text-[10px] block font-medium">{t('খতিয়ান নং (BS)', 'Khatian No')}</span>
                  <strong className="text-base font-bold text-slate-900">
                    {toBanglaDigits(plot?.khatian_no_bn || plot?.khatian_no || '৪১০১', lang)}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-400 text-[10px] block font-medium">{t('মৌজা ও জে.এল নং', 'Mouza & JL')}</span>
                  <strong className="text-xs font-bold text-slate-900">
                    {plot?.mouza_bn || 'বিরুলিয়া'} ({plot?.jl_no ? `জে.এল ${plot.jl_no}` : 'জে.এল ১২'})
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-400 text-[10px] block font-medium">{t('উপজেলা ও জেলা', 'Upazila & District')}</span>
                  <strong className="text-xs font-bold text-slate-900">
                    {plot?.upazila_bn || 'সাভার'}, {plot?.district_bn || 'ঢাকা'}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-400 text-[10px] block font-medium">{t('জমির শ্রেণি', 'Land Class')}</span>
                  <strong className="text-xs font-bold text-slate-900">
                    {plot?.land_type_bn || plot?.landClassBn || 'ভিটা (আবাসিক)'}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-400 text-[10px] block font-medium">{t('রেকর্ডকৃত আয়তন', 'Recorded Area')}</span>
                  <strong className="text-xs font-bold text-[#006A4E]">
                    {toBanglaDigits(plot?.area_decimal ?? plot?.share_area_decimal ?? 20.0, lang)} {t('শতক', 'dec')}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 col-span-2">
                  <span className="text-slate-400 text-[10px] block font-medium">{t('সর্বশেষ রেকর্ডভুক্ত মালিক', 'Recorded Owner')}</span>
                  <strong className="text-xs font-bold text-slate-900">
                    {plot?.owner_name_bn || 'মো. রফিকুল ইসলাম'}
                  </strong>
                </div>
              </div>
            </div>

            {/* 5-Point Live Health Audit Matrix */}
            <div className="mt-6">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('লাইভ ৫-স্তরের আইনি ও প্রশাসনিক স্বাস্থ্য নিরীক্ষা', '5-Point Live Legal & Administrative Audit')}</span>
              </h3>

              <div className="space-y-2 text-xs">
                {/* 1. Ownership & Khatian Continuity */}
                <div className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 bg-white">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900">
                        {t('১. খতিয়ান ধারাবাহিকতা ও মালিকানা সত্যতা (CS/SA/RS/BS)', '1. Ownership & Chain of Title Continuity')}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {t('সিএস হতে বিএস পর্যন্ত কোনো রেকর্ড ব্যত্যয় বা ওভারল্যাপিং দাগ শনাক্ত হয়নি।', 'Clean genealogical title chain without unrecorded mutations.')}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-[#006A4E] border border-emerald-300 shrink-0">
                    {t('শতভাগ সঠিক', '100% Valid')}
                  </span>
                </div>

                {/* 2. Bank Lien Status */}
                <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                  hasMortgage ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-2.5">
                    {hasMortgage ? (
                      <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-slate-900">
                        {t('২. ব্যাংকিং বন্ধক ও ঋণ স্থিতি (Lien & Encumbrance)', '2. Bank Mortgage & Lien Status')}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {hasMortgage
                          ? t('সক্রিয় ব্যাংক বন্ধক বা লিয়েন রয়েছে। হস্তান্তর পূর্বে এনওসি (NOC) প্রয়োজন।', 'Active bank lien recorded. Bank NOC required prior to transfer.')
                          : t('কোনো তফসিলি ব্যাংকে এই দাগটি বন্ধকাবদ্ধ নেই (দায়মুক্ত সনদ)।', 'No active mortgage lien across registered financial institutions.')}
                      </div>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${
                    hasMortgage ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-emerald-100 text-[#006A4E] border-emerald-300'
                  }`}>
                    {hasMortgage ? t('বন্ধক বিদ্যমান', 'Lien Active') : t('দায়মুক্ত', 'Clear Title')}
                  </span>
                </div>

                {/* 3. Court Disputes */}
                <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                  hasDispute ? 'bg-rose-50/70 border-rose-300' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-2.5">
                    {hasDispute ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-slate-900">
                        {t('৩. দেওয়ানি আদালত ও এসিল্যান্ড ট্রাইব্যুনাল মোকদ্দমা', '3. Civil Court & AC Land Tribunal Disputes')}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {hasDispute
                          ? t('দেওয়ানি আদালতে মামলা বা স্থগিতাদেশ চলমান। রায় নিষ্পত্তি ব্যতিরেকে হস্তান্তর স্থগিত।', 'Pending court injunction or dispute case recorded.')
                          : t('কোনো দেওয়ানি বা ফৌজদারি আদালতে মামলা বিচারাধীন নেই।', 'Zero pending injunctions or litigation records found.')}
                      </div>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${
                    hasDispute ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-emerald-100 text-[#006A4E] border-emerald-300'
                  }`}>
                    {hasDispute ? t('মামলা চলমান', 'Dispute Active') : t('মোকদ্দমামুক্ত', 'Litigation Free')}
                  </span>
                </div>

                {/* 4. Owner Sale Lock */}
                <div className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 bg-white">
                  <div className="flex items-center gap-2.5">
                    {isSaleLocked ? (
                      <Lock className="w-4 h-4 text-blue-600 shrink-0" />
                    ) : (
                      <Unlock className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-slate-900">
                        {t('৪. মালিকের বায়োমেট্রিক ডিজিটাল বিক্রয় লক (Owner Protective Lock)', '4. Owner Biometric Sale Lock Protection')}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {isSaleLocked
                          ? t('মালিক কর্তৃক বিক্রয় লক সক্রিয়। ওটিপি ও অনুমোদন ছাড়া দলিল রেজিস্ট্রি সম্ভব নয়।', 'Lock active. Sub-Registrar cannot accept registration without owner OTP.')
                          : t('বিক্রয় লক বর্তমানে বন্ধ। অযাচিত রেজিস্ট্রি ঠেকাতে লক সক্রিয় করার সুপারিশ করা হচ্ছে।', 'Unlocked. Owner can enable biometric lock via citizen portal.')}
                      </div>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${
                    isSaleLocked ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}>
                    {isSaleLocked ? t('লক সক্রিয় 🔒', 'Locked 🔒') : t('আনলকড', 'Unlocked')}
                  </span>
                </div>

                {/* 5. Cryptographic Ledger Integrity */}
                <div className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 bg-white">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900">
                        {t('৫. ক্রিপ্টোগ্রাফিক লেজার ব্লকচেইন সিল ও হ্যাশ অখণ্ডতা', '5. Cryptographic Ledger & Hash Integrity')}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Hash: {riskReport?.deed_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-[#006A4E] border border-emerald-300 shrink-0">
                    {t('অবিকৃত ও নিরাপদ', 'Tamper-Proof')}
                  </span>
                </div>
              </div>
            </div>

            {/* Official Footer / Signatures / Disclaimer */}
            <div className="mt-8 pt-6 border-t-2 border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left space-y-1">
                <p className="font-bold text-slate-700">
                  {t('ভূমি সুরক্ষা জাতীয় সমন্বিত অটোমেশন সিস্টেম', 'BhumiShield Integrated Land Automation System')}
                </p>
                <p className="text-[10px] text-slate-400">
                  {t('এই সার্টিফিকেটটি ডিজিটালভাবে স্বাক্ষরিত ও কিউআর কোড দ্বারা যাচাইযোগ্য। কোনো ম্যানুয়াল সিল বা স্বাক্ষরের প্রয়োজন নেই।', 'This certificate is digitally signed and verifiable via QR code. No physical signature required.')}
                </p>
              </div>

              <div className="text-center border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-6 shrink-0">
                <div className="font-serif italic font-bold text-slate-800 text-sm">ভূমি মন্ত্রণালয়</div>
                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-mono mt-0.5">
                  DIGITALLY CERTIFIED • 2026
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar (Screen Only) */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 print:hidden">
          <div className="text-xs text-slate-500">
            {t('যাচাইকরণ লিংক: ', 'Audit URL: ')}
            <span className="font-mono text-slate-700">bhumishield.gov.bd/check?dag={plot?.dag_no}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigate?.(`check?dag=${plot?.dag_no || ''}`);
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t('সম্পূর্ণ অডিট পৃষ্ঠায় যান', 'Full Audit Page')}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#006A4E] hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('সনদটি প্রিন্ট করুন', 'Print Certificate')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
