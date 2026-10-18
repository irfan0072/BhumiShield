import React, { useState, useEffect } from 'react';
import {
  X,
  FileCheck2,
  Printer,
  Download,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Building,
  Copy,
  ExternalLink,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';

interface CitizenDcrPorchaModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: any;
  defaultDocType?: 'DCR' | 'PORCHA';
  t: (bn: string, en: string) => string;
  lang: 'bn' | 'en';
}

export const CitizenDcrPorchaModal: React.FC<CitizenDcrPorchaModalProps> = ({
  isOpen,
  onClose,
  transfer,
  defaultDocType = 'DCR',
  t,
  lang,
}) => {
  const [docType, setDocType] = useState<'DCR' | 'PORCHA'>(defaultDocType);
  const [secConfig, setSecConfig] = useState<any>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDocType(defaultDocType);
      fetchSecurityConfig();
    }
  }, [isOpen, defaultDocType]);

  const fetchSecurityConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await BhumiApi.getDocumentSecurityConfig();
      if (res && res.config) {
        setSecConfig(res.config);
      }
    } catch (e) {
      console.warn('Could not load doc security config:', e);
    } finally {
      setLoadingConfig(false);
    }
  };

  if (!isOpen || !transfer) return null;

  // A06: Strictly use persisted real documents. No mock fallbacks claiming "PAID" or fake NIDs!
  const isCompleted = transfer.status === 'COMPLETED';
  const dcr = transfer.dcr || null;
  const porcha = transfer.khatian_porcha || null;
  const isDocAvailable = docType === 'DCR' ? (isCompleted && Boolean(dcr)) : (isCompleted && Boolean(porcha));

  const watermarkText = lang === 'bn' ? (secConfig?.watermark_text_bn || 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার - ভূমি মন্ত্রণালয় - শুধুমাত্র নাগরিক ব্যবহারের জন্য সংরক্ষিত') : (secConfig?.watermark_text_en || 'GOVERNMENT OF BANGLADESH - OFFICIAL CITIZEN COPY');
  const watermarkOpacity = secConfig?.watermark_opacity ?? 0.14;
  const watermarkAngle = secConfig?.watermark_angle_deg ?? -30;
  const enableWatermark = secConfig?.enable_custom_watermark ?? true;
  const enableQr = secConfig?.enable_qr_validation_seal ?? true;
  const qrStyle = secConfig?.qr_layout_style || 'GOV_SEAL_BORDERED';
  const qrPos = secConfig?.qr_position || 'HEADER_RIGHT';

  const handlePrint = () => {
    if (!isDocAvailable) return;
    window.print();
  };

  const handleCopyHash = () => {
    const textToCopy = porcha?.qr_verification_hash || dcr?.payment_trx_id || '';
    if (!textToCopy) return;
    navigator.clipboard?.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col my-8 max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-[#006A4E] to-emerald-950 px-6 py-4 flex items-center justify-between text-white border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight">
                {t('ডিজিটাল ডিসিআর ও খতিয়ান পর্চা ভিউয়ার', 'Digital DCR & Khatian Porcha Viewer')}
              </h3>
              <p className="text-[11px] text-emerald-200">
                {t('হস্তান্তর ট্র্যাকিং কোড:', 'Transfer Code:')} {transfer.transfer_code || `TR-${transfer.id}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls & Tab Switcher */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Document Switcher */}
          <div className="flex items-center p-1 bg-slate-200/80 rounded-xl">
            <button
              type="button"
              onClick={() => setDocType('DCR')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                docType === 'DCR'
                  ? 'bg-white text-[#006A4E] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('ডিজিটাল ডিসিআর (DCR)', 'Digital DCR')}
            </button>
            <button
              type="button"
              onClick={() => setDocType('PORCHA')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                docType === 'PORCHA'
                  ? 'bg-white text-[#006A4E] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('বিএস খতিয়ান পর্চা', 'BS Porcha')}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!isDocAvailable}
              onClick={handlePrint}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition shadow-2xs ${
                isDocAvailable
                  ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700 cursor-pointer'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-[#006A4E]" />
              <span>{t('প্রিন্ট করুন', 'Print')}</span>
            </button>
            <button
              type="button"
              disabled={!isDocAvailable}
              onClick={handlePrint}
              className={`px-4 py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs ${
                isDocAvailable
                  ? 'bg-[#006A4E] hover:bg-emerald-800 cursor-pointer'
                  : 'bg-slate-300 cursor-not-allowed opacity-60'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('পিডিএফ ডাউনলোড', 'Download PDF')}</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body: Official Rendered Certificate or Truthful Pending Notice */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100/60">
          {!isDocAvailable ? (
            <div className="bg-white rounded-2xl border border-amber-200 p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-4 min-h-[360px]">
              <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                <Clock className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                {docType === 'DCR'
                  ? t('অফিসিয়াল ডিসিআর এখনও ইস্যু হয়নি', 'Official DCR Not Yet Issued')
                  : t('চূড়ান্ত বিএস খতিয়ান পর্চা এখনও প্রস্তুত নয়', 'BS Khatian Porcha Not Yet Ready')}
              </h4>
              <p className="text-xs text-slate-600 max-w-md leading-relaxed">
                {t(
                  'নামজারি আবেদন প্রক্রিয়াধীন রয়েছে। সহকারী কমিশনার (ভূমি) কর্তৃক আবেদন চূড়ান্ত অনুমোদন ও সরকারি ফি পরিশোধের পর ডিজিটাল স্বাক্ষরিত অফিসিয়াল ডিসিআর ও খতিয়ান পর্চা এখানে প্রদর্শিত ও ডাউনলোডযোগ্য হবে। ভুয়া বা কাল্পনিক কোনো সরকারি সনদ প্রদর্শন করা হয় না।',
                  'The mutation application is currently in process. Official digitally verified DCR and Khatian Porcha documents will be available for download only after competent AC Land approval and verified fee payment. Simulated or fabricated official documents are never displayed.'
                )}
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200">
                  {t('আবেদনের অবস্থা:', 'Application Status:')} <strong className="text-amber-800">{transfer.status}</strong>
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200">
                  {t('বর্তমান ধাপ:', 'Current Step:')} <strong>{transfer.current_step || 1} / 13</strong>
                </span>
              </div>
            </div>
          ) : (
          <div className="bg-white rounded-2xl border-4 border-emerald-900/80 p-6 shadow-md relative overflow-hidden font-serif min-h-[540px]">
            {/* Dynamic Watermark Layer from Super Admin Settings */}
            {enableWatermark && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
                style={{
                  opacity: watermarkOpacity,
                  transform: `rotate(${watermarkAngle}deg)`,
                }}
              >
                <div className="text-center text-emerald-950 font-black text-xl tracking-wider leading-relaxed px-6">
                  <div>{watermarkText}</div>
                  <div className="text-xs font-sans tracking-widest mt-2 uppercase opacity-80">
                    BHUMISHIELD VERIFIED · SOVEREIGN GOVERNMENT RECORD
                  </div>
                </div>
              </div>
            )}

            {/* Document Content */}
            <div className="relative z-10 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-emerald-900 pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-full border-2 border-emerald-900 flex items-center justify-center text-emerald-900 font-bold text-xs bg-emerald-50 shrink-0">
                    বাংলাদেশ
                  </div>
                  <div>
                    <div className="text-xs font-sans font-bold text-emerald-900 uppercase tracking-widest">
                      গণপ্রজাতন্ত্রী বাংলাদেশ সরকার · ভূমি মন্ত্রণালয়
                    </div>
                    <div className="text-base font-bold text-slate-950 mt-0.5">
                      {docType === 'DCR'
                        ? 'ভূমি রাজস্ব আদায়ের দাখিলা ও ডিসিআর (DCR রসিদ)'
                        : 'স্বত্বলিপি ও চূড়ান্ত বিএস খতিয়ান পর্চা (BS Porcha)'}
                    </div>
                    <div className="text-xs text-slate-600 font-sans mt-0.5">
                      {dcr?.issuing_office_bn || (transfer.plot?.upazila_bn ? `${transfer.plot.upazila_bn} উপজেলা ভূমি অফিস` : 'উপজেলা ভূমি অফিস')}
                    </div>
                  </div>
                </div>

                {/* QR Seal (Header Right Layout) */}
                {enableQr && qrPos === 'HEADER_RIGHT' && (
                  <div
                    className={`p-2 rounded-xl shrink-0 text-center ${
                      qrStyle === 'GOV_SEAL_BORDERED'
                        ? 'border-2 border-emerald-800 bg-emerald-50/70 shadow-xs'
                        : qrStyle === 'CRYPTO_HASH_BADGE'
                        ? 'border-2 border-slate-900 bg-slate-900 text-white shadow-md'
                        : 'border border-slate-300 bg-white'
                    }`}
                  >
                    <div className="w-14 h-14 bg-slate-950 rounded-lg flex items-center justify-center text-white mx-auto p-1 font-mono text-[9px]">
                      <QrCode className="w-12 h-12 text-emerald-400" />
                    </div>
                    <div
                      className={`text-[8px] font-bold mt-1 uppercase font-sans ${
                        qrStyle === 'CRYPTO_HASH_BADGE' ? 'text-emerald-300' : 'text-emerald-900'
                      }`}
                    >
                      {t('যাচাইকৃত সিল', 'Gov Verified')}
                    </div>
                  </div>
                )}
              </div>

              {/* DCR BODY */}
              {docType === 'DCR' ? (
                <div className="space-y-4 font-sans text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <span className="text-[11px] text-slate-500 block">{t('ডিসিআর রসিদ নং:', 'DCR Receipt No:')}</span>
                      <span className="font-bold font-mono text-slate-900 text-sm">{dcr.dcr_number}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">{t('ই-নামজারি কেস নং:', 'e-Mutation Case No:')}</span>
                      <span className="font-bold font-mono text-[#006A4E] text-sm">{dcr.mutation_case_no}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">{t('আবেদনকারী / ক্রেতার নাম:', 'Applicant / Buyer Name:')}</span>
                      <span className="font-bold text-slate-900">{dcr.applicant_name_bn}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">{t('এনআইডি নম্বর:', 'NID Number:')}</span>
                      <span className="font-bold font-mono text-slate-900">{dcr.applicant_nid}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">{t('সাবেক মালিক / বিক্রেতা:', 'Former Owner / Seller:')}</span>
                      <span className="font-medium text-slate-700">{dcr.seller_name_bn}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">{t('পেমেন্ট ট্রানজ্যাকশন আইডি:', 'Payment Trx ID:')}</span>
                      <span className="font-bold font-mono text-emerald-800">{dcr.payment_trx_id}</span>
                    </div>
                  </div>

                  {/* Fee Breakdown Table */}
                  <table className="w-full text-left border border-slate-200 text-xs">
                    <thead className="bg-[#006A4E] text-white font-bold">
                      <tr>
                        <th className="py-1.5 px-3 border-r border-emerald-800">{t('সরকারি ফি বিবরণী', 'Government Fee Particulars')}</th>
                        <th className="py-1.5 px-3 text-right">{t('পরিমাণ (টাকা)', 'Amount (BDT)')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      <tr>
                        <td className="py-1.5 px-3 font-sans">{t('আবেদন ও কোর্ট ফি', 'Application & Court Fee')}</td>
                        <td className="py-1.5 px-3 text-right font-bold">{toBanglaDigits(dcr.court_fee_bdt, lang)}.০০</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 font-sans">{t('নোটিশ জারি ফি', 'Notice Issuance Fee')}</td>
                        <td className="py-1.5 px-3 text-right font-bold">{toBanglaDigits(dcr.notice_fee_bdt, lang)}.০০</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 font-sans">{t('রেকর্ড সংশোধন ও ডিসিআর ফি', 'Record Mutation & DCR Fee')}</td>
                        <td className="py-1.5 px-3 text-right font-bold">{toBanglaDigits(dcr.record_correction_dcr_fee_bdt, lang)}.০০</td>
                      </tr>
                      <tr className="bg-emerald-50 text-emerald-900 font-bold">
                        <td className="py-2 px-3 font-sans">{t('সর্বমোট পরিশোধিত সরকারি ফি', 'Total Paid Government Fee')}</td>
                        <td className="py-2 px-3 text-right text-sm">{toBanglaDigits(dcr.total_fee_bdt, lang)}.০০</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                /* PORCHA BODY */
                <div className="space-y-4 font-sans text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <span className="text-[11px] text-slate-500 block">{t('বিএস খতিয়ান নং:', 'BS Khatian No:')}</span>
                      <span className="font-black text-[#006A4E] text-base">{toBanglaDigits(porcha.khatian_no, lang)}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">{t('দাগ নম্বর:', 'Plot / Dag No:')}</span>
                      <span className="font-bold text-slate-900 text-base">{toBanglaDigits(porcha.dag_no, lang)}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">{t('মৌজা ও জে.এল.:', 'Mouza & J.L.:')}</span>
                      <span className="font-bold text-slate-800">{porcha.mouza_bn} ({toBanglaDigits(porcha.jl_no, lang)})</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">{t('জমির শ্রেণি:', 'Land Class:')}</span>
                      <span className="font-bold text-slate-800">{porcha.land_class_bn}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/60 space-y-2">
                    <div className="font-bold text-emerald-950 border-b border-emerald-200 pb-1.5 flex items-center justify-between">
                      <span>{t('চূড়ান্ত স্বত্বাধিকারী ও হস্তান্তরিত অংশ:', 'Mutated Ownership Share:')}</span>
                      <span className="text-emerald-800 font-bold">
                        {toBanglaDigits(porcha.transferred_area_decimal, lang)} {t('শতক', 'dec')}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block">{t('নতুন রেকর্ডীয় মালিক:', 'New Recorded Owner:')}</span>
                        <span className="font-bold text-slate-900">{porcha.owner_name_bn}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{t('মালিকের এনআইডি:', 'Owner NID:')}</span>
                        <span className="font-mono text-slate-800">{porcha.owner_nid}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{t('সাবেক মালিকানা স্বত্ব:', 'Former Ownership:')}</span>
                        <span className="text-slate-700">{porcha.former_owner_name_bn}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{t('জরিপের ধরন:', 'Survey Type:')}</span>
                        <span className="font-bold text-slate-900">{porcha.survey_type}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Footer Section */}
              <div className="pt-4 border-t border-slate-200 space-y-2.5 font-sans">
                {secConfig?.show_tamper_warning_text && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-900 leading-tight">
                    <span className="font-bold">{t('আইনি সতর্কবার্তা: ', 'Legal Warning: ')}</span>
                    {lang === 'bn' ? secConfig?.tamper_warning_text_bn : secConfig?.tamper_warning_text_en}
                  </div>
                )}

                {secConfig?.show_cryptographic_hash && (
                  <div className="p-2 rounded-lg bg-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-600">
                    <div className="truncate mr-2">
                      <span className="font-bold text-slate-800">SHA-256 HASH: </span>
                      {porcha.qr_verification_hash}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyHash}
                      className="text-[#006A4E] hover:text-emerald-800 font-sans font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copied ? t('কপি হয়েছে!', 'Copied!') : t('কপি', 'Copy')}</span>
                    </button>
                  </div>
                )}

                <div className="flex items-end justify-between pt-2">
                  <div className="text-[10px] text-slate-500">
                    {t('ইস্যুর তারিখ:', 'Issue Date:')} {new Date(dcr?.issued_at || porcha?.issued_at || transfer.updated_at || new Date().toISOString()).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US')}
                  </div>
                  {secConfig?.show_issuing_authority_signature && (
                    <div className="text-center">
                      <div className="w-28 h-7 border-b border-dashed border-slate-400 mx-auto flex items-center justify-center text-[9px] font-mono text-emerald-900 font-bold">
                        AC_LAND_OFFICE_SEAL
                      </div>
                      <div className="text-[10px] font-bold text-slate-900 mt-0.5">সহকারী কমিশনার (ভূমি)</div>
                      <div className="text-[9px] text-slate-500">{transfer.plot?.upazila_bn || 'সাভার'}, ঢাকা</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};
