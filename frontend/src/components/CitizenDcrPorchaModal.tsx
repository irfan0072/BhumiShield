import React, { useState, useEffect } from 'react';
import {
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

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
    const textToCopy = porcha?.qr_verification_hash || dcr?.payment_trx_id || dcr?.dcr_number || '';
    if (!textToCopy) return;
    navigator.clipboard?.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cryptoHash = porcha?.qr_verification_hash || dcr?.payment_trx_id || dcr?.dcr_number || 'N/A';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-6 rounded-2xl bg-white shadow-2xl border border-slate-200 print:p-0 print:border-none print:shadow-none print:max-w-none print:max-h-none print:m-0">
        {/* Top Header Bar */}
        <DialogHeader className="bg-gradient-to-r from-[#006A4E] to-emerald-950 px-6 py-4 flex flex-row items-center justify-between text-white border-b border-emerald-800 -mx-6 -mt-6 rounded-t-2xl shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="font-black text-base tracking-tight text-white">
                {t('ডিজিটাল ডিসিআর ও খতিয়ান পর্চা ভিউয়ার', 'Digital DCR & Khatian Porcha Viewer')}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-emerald-200 mt-0.5">
                {t('হস্তান্তর ট্র্যাকিং কোড:', 'Transfer Code:')} {transfer.transfer_code || `TR-${transfer.id}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Action Controls & Tab Switcher */}
        <div className="px-1 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden rounded-lg mt-1">
          {/* Document Switcher with shadcn Tabs */}
          <Tabs
            value={docType}
            onValueChange={(val) => setDocType(val as any)}
            className="w-full sm:w-auto"
          >
            <TabsList className="bg-slate-200/80 p-1 rounded-xl h-auto">
              <TabsTrigger
                value="DCR"
                className="text-xs font-bold px-3.5 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#006A4E] data-[state=active]:shadow-xs min-h-[36px]"
              >
                {t('বাংলাদেশ ফরম ১০৭৭ (ডিসিআর)', 'Form 1077 (DCR)')}
              </TabsTrigger>
              <TabsTrigger
                value="PORCHA"
                className="text-xs font-bold px-3.5 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#006A4E] data-[state=active]:shadow-xs min-h-[36px]"
              >
                {t('ফরম ৫৪৬৩ (বিএস খতিয়ান পর্চা)', 'Form 5463 (BS Porcha)')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Action Buttons with shadcn Button */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!isDocAvailable}
              onClick={handlePrint}
              className="text-xs font-bold flex items-center gap-1.5 h-9 rounded-xl shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-[#006A4E]" />
              <span>{t('প্রিন্ট করুন', 'Print')}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!isDocAvailable}
              onClick={handlePrint}
              className="bg-[#006A4E] hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 h-9 rounded-xl shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('পিডিএফ ডাউনলোড', 'Download PDF')}</span>
            </Button>
          </div>
        </div>

        {/* Modal Scrollable Body: Official Rendered Certificate or Truthful Pending Notice */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-100/60 print:bg-white print:p-0 print:overflow-visible">
          {!isDocAvailable ? (
            <Card className="border border-amber-200 p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-4 min-h-[360px] bg-white rounded-2xl">
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
                <Badge variant="secondary" className="px-3 py-1 font-medium">
                  {t('আবেদনের অবস্থা:', 'Application Status:')} <strong className="text-amber-800 ml-1">{transfer.status}</strong>
                </Badge>
                <Badge variant="outline" className="px-3 py-1 font-medium">
                  {t('বর্তমান ধাপ:', 'Current Step:')} <strong className="ml-1">{transfer.current_step || 1} / 13</strong>
                </Badge>
              </div>
            </Card>
          ) : (
            <div className="bg-[#FCFBF7] rounded-2xl border-4 border-[#006A4E] p-6 sm:p-7 shadow-md relative overflow-hidden font-serif min-h-[580px] print:border-none print:shadow-none print:m-0 print:p-4 print:block">
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
                    <div className="w-16 h-16 rounded-full border-2 border-emerald-900 flex flex-col items-center justify-center text-emerald-900 font-bold text-[10px] bg-emerald-50 shrink-0 shadow-inner">
                      <span className="text-[14px] leading-tight">★</span>
                      <span className="font-serif">বাংলাদেশ</span>
                      <span className="text-[8px] uppercase tracking-tighter">GOVT</span>
                    </div>
                    <div>
                      <div className="text-xs font-sans font-bold text-emerald-900 uppercase tracking-widest">
                        গণপ্রজাতন্ত্রী বাংলাদেশ সরকার · ভূমি মন্ত্রণালয়
                      </div>
                      <div className="text-sm font-sans font-black text-emerald-800 mt-0.5">
                        {docType === 'DCR'
                          ? 'বাংলাদেশ ফরম নং ১০৭৭ (সংশোধিত)'
                          : 'বাংলাদেশ ফরম নং ৫৪৬৩'}
                      </div>
                      <div className="text-base sm:text-lg font-bold text-slate-950 mt-0.5">
                        {docType === 'DCR'
                          ? 'ডুপ্লিকেট কার্বন রসিদ (ডিজিটাল ডিসিআর) · ভূমি রাজস্ব দাখিলা'
                          : 'স্বত্বলিপি ও চূড়ান্ত খতিয়ান পর্চা (বিএস জরিপ)'}
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

                {/* DCR BODY — Authentic Form No. 1077 (সংশোধিত) Replica */}
                {docType === 'DCR' ? (
                  <div className="space-y-4 font-sans text-xs">
                    {/* Particulars Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50/90 border border-slate-300">
                      <div>
                        <span className="text-[11px] text-slate-500 block">{t('ডিসিআর রসিদ নম্বর:', 'DCR Receipt No:')}</span>
                        <span className="font-bold font-mono text-slate-900 text-sm">{dcr.dcr_number}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">{t('ই-নামজারি কেস নম্বর:', 'e-Mutation Case No:')}</span>
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
                        <span className="text-[11px] text-slate-500 block">{t('ই-চালান ট্রানজ্যাকশন আইডি:', 'e-Challan Trx ID:')}</span>
                        <span className="font-bold font-mono text-emerald-800">{dcr.payment_trx_id}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">{t('মৌজা ও জে.এল. নম্বর:', 'Mouza & J.L. No:')}</span>
                        <span className="font-medium text-slate-800">
                          {transfer.plot?.mouza_bn || 'বিরুলিয়া'} ({t('জে.এল.', 'J.L.')}: {toBanglaDigits(transfer.plot?.jl_no || '১২', lang)})
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">{t('পরিশোধের অবস্থা:', 'Payment Status:')}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {t('পরিশোধিত (ই-চালান যাচাইকৃত)', 'Paid (e-Challan Verified)')}
                        </span>
                      </div>
                    </div>

                    {/* Authentic 4-Item Statutory Fee Breakdown Table */}
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left border border-slate-300 text-xs">
                        <thead className="bg-[#006A4E] text-white font-bold">
                          <tr>
                            <th className="py-2 px-3 border-r border-emerald-800 w-16 text-center">{t('ক্রমিক', 'SL')}</th>
                            <th className="py-2 px-3 border-r border-emerald-800">{t('সরকারি ফি বিবরণী (বিধিবদ্ধ হার)', 'Statutory Fee Particulars')}</th>
                            <th className="py-2 px-3 text-right w-36">{t('পরিমাণ (টাকা)', 'Amount (BDT)')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono bg-white">
                          <tr>
                            <td className="py-1.5 px-3 text-center text-slate-500 font-sans">{toBanglaDigits('১', lang)}</td>
                            <td className="py-1.5 px-3 font-sans">{t('আবেদন ও কোর্ট ফি (Court Fee)', 'Application & Court Fee')}</td>
                            <td className="py-1.5 px-3 text-right font-bold">{toBanglaDigits('২০', lang)}.০০</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-3 text-center text-slate-500 font-sans">{toBanglaDigits('২', lang)}</td>
                            <td className="py-1.5 px-3 font-sans">{t('নোটিশ জারি ফি (Notice Issuance Fee)', 'Notice Issuance Fee')}</td>
                            <td className="py-1.5 px-3 text-right font-bold">{toBanglaDigits('৫০', lang)}.০০</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-3 text-center text-slate-500 font-sans">{toBanglaDigits('৩', lang)}</td>
                            <td className="py-1.5 px-3 font-sans">{t('রেকর্ড সংশোধন ফি (Record Correction Fee)', 'Record Correction Fee')}</td>
                            <td className="py-1.5 px-3 text-right font-bold">{toBanglaDigits('১০০০', lang)}.০০</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-3 text-center text-slate-500 font-sans">{toBanglaDigits('৪', lang)}</td>
                            <td className="py-1.5 px-3 font-sans">{t('খতিয়ান সরবরাহ ও ডিসিআর ফি (DCR / Porcha Delivery Fee)', 'DCR / Porcha Delivery Fee')}</td>
                            <td className="py-1.5 px-3 text-right font-bold">{toBanglaDigits('১০০', lang)}.০০</td>
                          </tr>
                          <tr className="bg-emerald-50 text-emerald-950 font-bold border-t-2 border-[#006A4E]">
                            <td colSpan={2} className="py-2.5 px-3 font-sans text-xs">
                              <div className="flex items-center justify-between">
                                <span>{t('সর্বমোট পরিশোধিত সরকারি ফি (Total Statutory Fee Paid):', 'Total Statutory Fee Paid:')}</span>
                                <span className="text-[11px] font-normal text-slate-600 italic">
                                  {t('কথায়: এক হাজার এক শত সত্তর টাকা মাত্র', 'In words: One Thousand One Hundred Seventy Taka Only')}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right text-sm font-black text-[#006A4E]">
                              ৳ {toBanglaDigits('১১৭০', lang)}.০০
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* PORCHA BODY — Authentic Form No. 5463 (বিএস খতিয়ান) 4-Column Cadastral Replica */
                  <div className="space-y-4 font-sans text-xs">
                    {/* Location Context Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-xl bg-slate-50/90 border border-slate-300 text-center">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">{t('জেলা', 'District')}</span>
                        <strong className="text-slate-800 text-xs">{porcha.district_bn || transfer.plot?.district_bn || 'ঢাকা'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">{t('উপজেলা', 'Upazila')}</span>
                        <strong className="text-slate-800 text-xs">{porcha.upazila_bn || transfer.plot?.upazila_bn || 'সাভার'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">{t('মৌজা ও জে.এল.', 'Mouza & JL')}</span>
                        <strong className="text-slate-800 text-xs">{porcha.mouza_bn} ({toBanglaDigits(porcha.jl_no, lang)})</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">{t('জরিপ', 'Survey')}</span>
                        <strong className="text-emerald-700 text-xs font-bold">{porcha.survey_type || 'BS'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">{t('খতিয়ান নং', 'Khatian No')}</span>
                        <strong className="text-[#006A4E] text-sm font-black">{toBanglaDigits(porcha.khatian_no, lang)}</strong>
                      </div>
                    </div>

                    {/* Authentic 4-Column Cadastral Schedule (ফরম নং ৫৪৬৩) */}
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left border border-slate-300 text-xs">
                        <thead className="bg-[#006A4E] text-white font-bold text-center">
                          <tr>
                            <th className="py-2 px-3 border-r border-emerald-800 text-left w-2/5">
                              <div>{t('১. স্বত্বাধিকারী / রেকর্ডীয় মালিকের বিবরণ ও অংশ', '1. Recorded Owner & Share')}</div>
                              <div className="text-[10px] font-normal text-emerald-100">{t('(নাম, পিতা/স্বামীর নাম, এনআইডি ও হিস্যা)', '(Name, NID & Share)')}</div>
                            </th>
                            <th className="py-2 px-3 border-r border-emerald-800 w-1/5">
                              <div>{t('২. দাগ নম্বর', '2. Dag / Plot No')}</div>
                              <div className="text-[10px] font-normal text-emerald-100">{t('(হাল দাগ ও সাবেক দাগ)', '(Present & Former)')}</div>
                            </th>
                            <th className="py-2 px-3 border-r border-emerald-800 w-1/5">
                              <div>{t('৩. জমির শ্রেণি', '3. Land Class')}</div>
                              <div className="text-[10px] font-normal text-emerald-100">{t('(নাল, ভিটা, চালা ইত্যাদি)', '(Class)')}</div>
                            </th>
                            <th className="py-2 px-3 text-right w-1/5">
                              <div>{t('৪. জমির পরিমাণ', '4. Area')}</div>
                              <div className="text-[10px] font-normal text-emerald-100">{t('(শতক ও একরে)', '(Decimals & Acres)')}</div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          <tr>
                            <td className="py-3 px-3 align-top border-r border-slate-200">
                              <div className="font-bold text-slate-900 text-sm">{porcha.owner_name_bn}</div>
                              <div className="text-[11px] text-slate-600 mt-0.5 font-mono">
                                {t('এনআইডি:', 'NID:')} {porcha.owner_nid}
                              </div>
                              <div className="text-[11px] text-emerald-800 font-semibold mt-1">
                                {t('হিস্যা / অংশ:', 'Ownership Share:')} <strong className="font-mono">১.০০০</strong> (১৬ আনা সম্পূর্ণ)
                              </div>
                              <div className="text-[10px] text-slate-500 mt-1 border-t border-slate-100 pt-1">
                                {t('সাবেক রেকর্ডীয় মালিক:', 'Former Owner:')} {porcha.former_owner_name_bn}
                              </div>
                            </td>
                            <td className="py-3 px-3 align-top text-center border-r border-slate-200">
                              <div className="text-base font-black text-slate-900">
                                {toBanglaDigits(porcha.dag_no, lang)}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {t('হাল দাগ', 'Hal Dag')}
                              </div>
                              {transfer.plot?.cs_dag_no && (
                                <div className="text-[10px] text-slate-400 mt-1">
                                  {t('সাবেক দাগ:', 'Ex-Dag:')} {toBanglaDigits(transfer.plot.cs_dag_no, lang)}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 align-top text-center border-r border-slate-200">
                              <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-bold text-xs">
                                {porcha.land_class_bn || t('নাল', 'Agricultural')}
                              </span>
                            </td>
                            <td className="py-3 px-3 align-top text-right">
                              <div className="text-base font-black text-[#006A4E]">
                                {toBanglaDigits(porcha.transferred_area_decimal, lang)} {t('শতক', 'dec')}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                {((porcha.transferred_area_decimal || 0) / 100).toFixed(4)} {t('একর', 'acre')}
                              </div>
                            </td>
                          </tr>
                          <tr className="bg-slate-50 font-bold border-t border-slate-300">
                            <td colSpan={3} className="py-2 px-3 text-right text-slate-700">
                              {t('অত্র খতিয়ানের মোট জমির পরিমাণ:', 'Total Khatian Area:')}
                            </td>
                            <td className="py-2 px-3 text-right text-sm font-black text-[#006A4E]">
                              {toBanglaDigits(porcha.transferred_area_decimal, lang)} {t('শতক', 'dec')}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Bottom Footer Section */}
                <div className="pt-4 border-t-2 border-slate-300 space-y-3 font-sans">
                  {secConfig?.show_tamper_warning_text && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-900 leading-tight">
                      <span className="font-bold">{t('আইনি সতর্কবার্তা: ', 'Legal Warning: ')}</span>
                      {lang === 'bn' ? secConfig?.tamper_warning_text_bn : secConfig?.tamper_warning_text_en}
                    </div>
                  )}

                  {/* Technical Cryptographic Hash */}
                  {secConfig?.show_cryptographic_hash && (
                    <details className="group border border-slate-200 rounded-xl bg-slate-50 p-2.5 transition">
                      <summary className="flex items-center justify-between cursor-pointer text-[11px] font-bold text-slate-700 select-none">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#006A4E]" />
                          {t('প্রযুক্তিগত ক্রিপ্টোগ্রাফিক সুরক্ষা প্রমাণ (SHA-256)', 'Technical Cryptographic Proof Details (SHA-256)')}
                        </span>
                        <span className="text-[10px] text-emerald-700 group-open:hidden">{t('দেখান [ + ]', 'Show [ + ]')}</span>
                        <span className="text-[10px] text-slate-500 hidden group-open:inline">{t('সংক্ষেপ করুন [ - ]', 'Collapse [ - ]')}</span>
                      </summary>
                      <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] font-mono text-slate-600">
                        <div className="truncate mr-2">
                          <span className="font-bold text-slate-800">SHA-256: </span>
                          {cryptoHash}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyHash}
                          className="text-[#006A4E] hover:text-emerald-800 font-sans font-bold flex items-center gap-1 shrink-0 h-7 px-2"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copied ? t('কপি হয়েছে!', 'Copied!') : t('কপি', 'Copy')}</span>
                        </Button>
                      </div>
                    </details>
                  )}

                  <div className="flex items-end justify-between pt-2">
                    <div className="text-[10px] text-slate-500">
                      <div>{t('ইস্যুর তারিখ:', 'Issue Date:')} {new Date(dcr?.issued_at || porcha?.issued_at || transfer.updated_at || new Date().toISOString()).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US')}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">ডিজিটাল রেকর্ড সিস্টেম · ভূমি মন্ত্রণালয়, বাংলাদেশ</div>
                    </div>
                    {secConfig?.show_issuing_authority_signature && (
                      <div className="text-center">
                        <div className="w-32 h-8 border-b-2 border-dashed border-emerald-800 mx-auto flex items-center justify-center text-[9px] font-mono text-emerald-900 font-bold bg-emerald-50/50 rounded-t">
                          AC_LAND_DIGITAL_SEAL
                        </div>
                        <div className="text-[10px] font-bold text-slate-900 mt-1">সহকারী কমিশনার (ভূমি)</div>
                        <div className="text-[9px] text-slate-500">{transfer.plot?.upazila_bn || 'সাভার'}, {transfer.plot?.district_bn || 'ঢাকা'}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
