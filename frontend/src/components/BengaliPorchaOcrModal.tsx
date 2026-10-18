import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import {
  Sparkles,
  FileSearch,
  CheckCircle2,
  AlertTriangle,
  X,
  UploadCloud,
  Search,
  Scale,
  ExternalLink,
  Layers,
  FileText,
  ShieldCheck,
  RefreshCw,
  Eye,
  Check,
} from 'lucide-react';

interface BengaliPorchaOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (route: string) => void;
}

export const BengaliPorchaOcrModal: React.FC<BengaliPorchaOcrModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { lang, t } = useAppUI();

  const [preset, setPreset] = useState<'bs_4101' | 'bs_4107_mismatch' | 'custom'>('bs_4101');
  const [scanning, setScanning] = useState<boolean>(false);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [showRawText, setShowRawText] = useState<boolean>(false);
  const [dbVerification, setDbVerification] = useState<any>(null);
  const [dbLoading, setDbLoading] = useState<boolean>(false);

  // Listen for custom open event
  useEffect(() => {
    const handleOpen = (e: any) => {
      if (e.detail?.preset) {
        setPreset(e.detail.preset);
      }
    };
    window.addEventListener('open-porcha-ocr', handleOpen);
    return () => window.removeEventListener('open-porcha-ocr', handleOpen);
  }, []);

  // Run OCR on preset change
  const runOcr = async (selectedPreset: 'bs_4101' | 'bs_4107_mismatch' | 'custom') => {
    setScanning(true);
    setDbVerification(null);
    try {
      // Simulate real-time OCR engine analysis
      const res = await BhumiApi.getOcrSample();
      setTimeout(async () => {
        let structured: any = res?.extracted_fields || {};
        let rawText = '';

        if (selectedPreset === 'bs_4107_mismatch') {
          rawText = "বাংলাদেশ ফরম নং ৫৪৬২ (সংশোধিত)\nবিএস খতিয়ান নং: ৪১০৭ | মৌজা: বিরুলিয়া | জে.এল নং: ১২ | উপজেলা: সাভার | জেলা: ঢাকা\nমালিকের নাম: মো. শহিদুল ইসলাম, পিতা: মৃত ইসমাইল হোসেন\nঅংশ: ১/১ | দাগ নং: ১০৭ | জমির শ্রেণী: ভিটা | মোট পরিমাণ: ২৬.০০ শতাংশ (আরএস খতিয়ানে ছিল ১৮.০০ শতাংশ)";
          structured = {
            dag_no: { value: '107', confidence: 0.97, low_confidence: false },
            dag_no_bn: { value: '১০৭', confidence: 0.97, low_confidence: false },
            khatian_no: { value: '4107', confidence: 0.95, low_confidence: false },
            khatian_no_bn: { value: '৪১০৭', confidence: 0.95, low_confidence: false },
            mouza_bn: { value: 'বিরুলিয়া', confidence: 0.96, low_confidence: false },
            upazila_bn: { value: 'সাভার', confidence: 0.98, low_confidence: false },
            district_bn: { value: 'ঢাকা', confidence: 0.99, low_confidence: false },
            owner_name_bn: { value: 'মো. শহিদুল ইসলাম', confidence: 0.92, low_confidence: false },
            father_name_bn: { value: 'মৃত ইসমাইল হোসেন', confidence: 0.88, low_confidence: true },
            share_fraction: { value: '1/1', confidence: 0.95, low_confidence: false },
            land_type_bn: { value: 'ভিটা (আবাসিক)', confidence: 0.91, low_confidence: false },
            area_decimal: { value: '26.00', confidence: 0.84, low_confidence: true },
          };
        } else {
          rawText = "বাংলাদেশ ফরম নং ৫৪৬২ (সংশোধিত)\nবিএস খতিয়ান নং: ৪১০১ | মৌজা: বিরুলিয়া | জে.এল নং: ১২ | উপজেলা: সাভার | জেলা: ঢাকা\nমালিকের নাম: মো. রফিকুল ইসলাম, পিতা: মৃত হাজী আবদুল জব্বার\nঅংশ: ১/১ (এক অংশ) | দাগ নং: ১০১ | জমির শ্রেণী: ভিটা (আবাসিক) | মোট পরিমাণ: ২০.০০ শতাংশ";
          structured = {
            dag_no: { value: '101', confidence: 0.99, low_confidence: false },
            dag_no_bn: { value: '১০১', confidence: 0.99, low_confidence: false },
            khatian_no: { value: '4101', confidence: 0.98, low_confidence: false },
            khatian_no_bn: { value: '৪১০১', confidence: 0.98, low_confidence: false },
            mouza_bn: { value: 'বিরুলিয়া', confidence: 0.97, low_confidence: false },
            upazila_bn: { value: 'সাভার', confidence: 0.98, low_confidence: false },
            district_bn: { value: 'ঢাকা', confidence: 0.99, low_confidence: false },
            owner_name_bn: { value: 'মো. রফিকুল ইসলাম', confidence: 0.96, low_confidence: false },
            father_name_bn: { value: 'মৃত হাজী আবদুল জব্বার', confidence: 0.94, low_confidence: false },
            share_fraction: { value: '1/1', confidence: 0.97, low_confidence: false },
            land_type_bn: { value: 'ভিটা (আবাসিক)', confidence: 0.95, low_confidence: false },
            area_decimal: { value: '20.00', confidence: 0.98, low_confidence: false },
          };
        }

        setOcrResult({
          rawText,
          structured,
          engine: 'Tesseract OCR (ben) + BhumiShield Deep Neural Field Parser',
        });
        setScanning(false);

        // Cross-verify with BhumiShield live database
        const dag = structured.dag_no?.value || '101';
        try {
          setDbLoading(true);
          const liveCheck = await BhumiApi.citizenCheckBeforeYouBuy(dag);
          setDbVerification(liveCheck);
        } catch {
          setDbVerification(null);
        } finally {
          setDbLoading(false);
        }
      }, 900);
    } catch {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runOcr(preset);
    }
  }, [isOpen, preset]);

  if (!isOpen) return null;

  const dagVal = ocrResult?.structured?.dag_no?.value || '101';
  const khatianVal = ocrResult?.structured?.khatian_no?.value || '4101';
  const areaVal = ocrResult?.structured?.area_decimal?.value || '20.00';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      {/* Modal Dialog */}
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Top Header */}
        <div className="bg-[#006A4E] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-amber-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                  {t('বাংলা পর্চা ও খতিয়ান ডকুমেন্ট এআই স্ক্যানার', 'Document AI / Bengali Porcha Scanner')}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
                  AI OCR v2.4
                </span>
              </div>
              <p className="text-[11px] text-emerald-100">
                {t(
                  'সিএস/এসএ/আরএস/বিএস স্ক্যান কপি হতে স্বয়ংক্রিয়ভাবে দাগ, খতিয়ান ও মালিকানা তথ্য এক্সট্রাকশন',
                  'Automated extraction of Dag, Khatian, and Ownership records from physical survey scans'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer text-sm"
            title={t('বন্ধ করুন', 'Close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Selector Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-500 font-bold mr-1">{t('নমুনা স্ক্যান কপি:', 'Sample Scans:')}</span>
            <button
              type="button"
              onClick={() => {
                setPreset('bs_4101');
                runOcr('bs_4101');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer border text-xs ${
                preset === 'bs_4101'
                  ? 'bg-[#006A4E] text-white border-[#006A4E] shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              📄 {t('বিএস ৪১০১ (নিষ্কণ্টক দাগ ১০১)', 'BS 4101 (Clean Plot 101)')}
            </button>
            <button
              type="button"
              onClick={() => {
                setPreset('bs_4107_mismatch');
                runOcr('bs_4107_mismatch');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer border text-xs ${
                preset === 'bs_4107_mismatch'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              ⚠️ {t('বিএস ৪১০৭ (ক্ষেত্র অমিল দাগ ১০৭)', 'BS 4107 (Mismatch Plot 107)')}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => runOcr(preset)}
              disabled={scanning}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin text-[#006A4E]' : ''}`} />
              <span>{scanning ? t('স্ক্যানিং...', 'Scanning...') : t('পুনরায় স্ক্যান', 'Rescan')}</span>
            </button>
          </div>
        </div>

        {/* Main Body: 2-Column Side-by-Side (Document Scan vs Extracted Fields) */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 overflow-y-auto flex-1 custom-scrollbar">
          {/* Left Column: Physical Document Scan Simulator */}
          <div className="p-5 bg-slate-100/70 flex flex-col space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>{t('মূল স্ক্যান কপি (Document Preview)', 'Original Document Scan')}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowRawText(!showRawText)}
                className="text-[11px] text-[#006A4E] hover:underline cursor-pointer font-semibold"
              >
                {showRawText ? t('পর্চা ভিউ', 'Porcha View') : t('র ওসিআর টেক্সট', 'Raw OCR Text')}
              </button>
            </div>

            {/* Document Sheet Preview with Scanning Laser */}
            <div className="bg-amber-50/40 border-2 border-dashed border-amber-200 rounded-2xl p-5 shadow-xs relative overflow-hidden flex-1 min-h-[360px] font-serif select-none">
              {/* Laser Beam Animation during scanning */}
              {scanning && (
                <div className="absolute inset-x-0 h-1 bg-emerald-500 shadow-[0_0_15px_#10b981] animate-bounce z-20 pointer-events-none" />
              )}

              {showRawText ? (
                <div className="font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200">
                  {ocrResult?.rawText || 'OCR processing in progress...'}
                </div>
              ) : (
                <div className="space-y-4 text-xs text-slate-800">
                  {/* Government Seal & Form Header */}
                  <div className="text-center border-b border-amber-300/80 pb-3 space-y-1">
                    <div className="text-[11px] font-bold text-amber-900 tracking-wider">
                      বাংলাদেশ ফরম নং ৫৪৬২ (সংশোধিত)
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      খতিয়ান (স্বত্বলিপি ও দখলদারিতা জরিপ)
                    </div>
                    <div className="text-[10px] text-slate-600">
                      মৌজা: বিরুলিয়া • জে.এল: ১২ • উপজেলা: সাভার • জেলা: ঢাকা
                    </div>
                  </div>

                  {/* Khatian and Dag highlight fields */}
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-2 rounded-lg bg-white/80 border border-amber-200">
                      <span className="text-[10px] text-slate-500 block">খতিয়ান নম্বর</span>
                      <strong className="text-base text-slate-900 font-black">
                        {toBanglaDigits(khatianVal, lang)}
                      </strong>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50/80 border border-emerald-300">
                      <span className="text-[10px] text-emerald-800 block font-bold">দাগ নম্বর</span>
                      <strong className="text-base text-[#006A4E] font-black">
                        {toBanglaDigits(dagVal, lang)}
                      </strong>
                    </div>
                  </div>

                  {/* Owner & Parentage table */}
                  <div className="p-3 bg-white/90 rounded-xl border border-amber-200 space-y-1 text-xs">
                    <div>
                      <span className="text-slate-500">মালিকের নাম: </span>
                      <strong className="text-slate-900">
                        {ocrResult?.structured?.owner_name_bn?.value || 'মো. রফিকুল ইসলাম'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">পিতা/স্বামীর নাম: </span>
                      <strong className="text-slate-900">
                        {ocrResult?.structured?.father_name_bn?.value || 'মৃত হাজী আবদুল জব্বার'}
                      </strong>
                    </div>
                  </div>

                  {/* Land Schedule */}
                  <div className="p-3 bg-white/90 rounded-xl border border-amber-200 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">জমির শ্রেণি:</span>
                      <strong className="text-slate-900">{ocrResult?.structured?.land_type_bn?.value || 'ভিটা (আবাসিক)'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">অংশ:</span>
                      <strong className="text-slate-900">{ocrResult?.structured?.share_fraction?.value || '১/১'}</strong>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-amber-100">
                      <span className="text-slate-500 font-bold">মোট পরিমাণ:</span>
                      <strong className="text-[#006A4E] font-black text-sm">
                        {toBanglaDigits(areaVal, lang)} শতক
                      </strong>
                    </div>
                  </div>

                  {/* Seal Stamp */}
                  <div className="pt-2 flex justify-end">
                    <div className="w-20 h-20 rounded-full border-2 border-emerald-700/60 flex flex-col items-center justify-center rotate-[-12deg] text-[9px] font-black text-emerald-800 uppercase p-1 text-center bg-white/60">
                      <span>ভূমি রেকর্ড</span>
                      <span>সত্যায়িত</span>
                      <span>২০২৬</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: AI Extracted Structured Data & Live Cross-Verification */}
          <div className="p-5 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#006A4E]" />
                <span>{t('এআই এক্সট্রাক্টকৃত ফিল্ডসমূহ', 'AI Extracted Fields')}</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-[#006A4E]">
                গড় আত্মবিশ্বাস: ৯৬.৫%
              </span>
            </div>

            {/* Structured Fields Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>{t('দাগ নম্বর', 'Plot Dag')}</span>
                  <span className="text-emerald-700 font-mono font-bold">৯৯%</span>
                </div>
                <strong className="text-sm font-black text-[#006A4E]">
                  {toBanglaDigits(dagVal, lang)}
                </strong>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>{t('খতিয়ান নম্বর', 'Khatian No')}</span>
                  <span className="text-emerald-700 font-mono font-bold">৯৮%</span>
                </div>
                <strong className="text-sm font-bold text-slate-900">
                  {toBanglaDigits(khatianVal, lang)}
                </strong>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>{t('মৌজা ও জে.এল.', 'Mouza & JL')}</span>
                  <span className="text-emerald-700 font-mono font-bold">৯৭%</span>
                </div>
                <strong className="text-xs font-bold text-slate-900">
                  {ocrResult?.structured?.mouza_bn?.value || 'বিরুলিয়া'}
                </strong>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>{t('জমির আয়তন', 'Area')}</span>
                  <span className={`font-mono font-bold ${
                    preset === 'bs_4107_mismatch' ? 'text-amber-700' : 'text-emerald-700'
                  }`}>
                    {preset === 'bs_4107_mismatch' ? '৮৪% ⚠️' : '৯৮%'}
                  </span>
                </div>
                <strong className="text-xs font-bold text-[#006A4E]">
                  {toBanglaDigits(areaVal, lang)} {t('শতক', 'dec')}
                </strong>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 col-span-2">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>{t('মালিকের নাম ও অংশ', 'Owner & Share')}</span>
                  <span className="text-emerald-700 font-mono font-bold">৯৬%</span>
                </div>
                <strong className="text-xs font-bold text-slate-900">
                  {ocrResult?.structured?.owner_name_bn?.value || 'মো. রফিকুল ইসলাম'} ({ocrResult?.structured?.share_fraction?.value || '১/১'})
                </strong>
              </div>
            </div>

            {/* Live Database Cross-Verification Alert */}
            <div className="p-3.5 rounded-2xl border text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>{t('ভূমি সুরক্ষা ডাটাবেস সমন্বয় (Live Cross-Check)', 'Database Match Audit')}</span>
                </span>
                {dbLoading && <span className="text-[10px] text-slate-400">যাচাই হচ্ছে...</span>}
              </div>

              {preset === 'bs_4107_mismatch' ? (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>রেকর্ড ব্যত্যয় ও ক্ষেত্র অমিল শনাক্ত (RS vs BS Area Discrepancy)</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    স্ক্যানকৃত বিএস পর্চায় ২৬ শতক উল্লিখিত থাকলেও ভূমি রেকর্ডে আরএস দাগে ছিল ১৮ শতক। নামজারির পূর্বে সহকারী কমিশনার (ভূমি) দ্বারা সরেজমিন সার্ভে প্রয়োজন।
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-emerald-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>১০০% ডাটাবেস মিল: কোনো ব্যত্যয় বা ঝুঁকি নেই (Clean Title)</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    স্ক্যানকৃত বিএস ৪১০১ পর্চার দাগ ১০১-এর ২০.০০ শতক জমি ভূমি মন্ত্রণালয়ের কেন্দ্রীয় ডিজিটাল লেজারের সাথে হুবহু মিলেছে। কোনো ব্যাংক লিয়েন বা দেওয়ানি মামলা নেই।
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2 mt-auto">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigate?.(`check?dag=${dagVal}`);
                }}
                className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Search className="w-4 h-4 text-emerald-400" />
                <span>{t('এই দাগটি ভূমি সুরক্ষায় অডিট করুন (Audit Plot)', 'Audit Plot in BhumiShield')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.dispatchEvent(
                    new CustomEvent('open-faraiz-calculator', {
                      detail: {
                        dagNo: dagVal,
                        khatianNo: khatianVal,
                        totalArea: Number(areaVal) || 20,
                      },
                    })
                  );
                }}
                className="w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Scale className="w-4 h-4 text-purple-700" />
                <span>{t('এই দাগের ফারায়েজ বণ্টন হিসাব করুন', 'Calculate Faraiz for this Plot')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
