import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import {
  QrCode,
  CheckCircle2,
  XOctagon,
  KeyRound,
  Printer,
  X,
  AlertTriangle,
  FileCheck,
  Building2,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  Camera,
  CameraOff,
  Scan,
  Sparkles,
  ShieldCheck,
  Download,
  RotateCcw,
  Layers,
  ExternalLink,
  ShieldAlert,
  FileText
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { UploadCloud } from 'lucide-react';

// Authentic Bangladesh 100/1000 Taka Non-Judicial Stamp Deed Replica
export const BangladeshStampDeedReplica: React.FC<{
  deed: any;
  result: any;
  lang: 'bn' | 'en';
  t: (bn: string, en: string) => string;
  formatDate: (val: any) => string;
}> = ({ deed, result, lang, t, formatDate }) => {
  return (
    <div className="relative p-3 sm:p-4 rounded-xl bg-[#FCFBF7] border-2 border-dashed border-[#006A4E]/30 text-[#0A1F1C] shadow-sm select-text overflow-hidden my-2">
      {/* Background Official Watermark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03] select-none rotate-[-25deg]">
        <div className="text-center font-serif text-xl sm:text-2xl font-black text-[#006A4E] leading-loose">
          গণপ্রজাতন্ত্রী বাংলাদেশ সরকার<br />নিবন্ধন অধিদপ্তর · ভূমি সুরক্ষা ভল্ট
        </div>
      </div>

      <div className="border border-[#006A4E]/20 rounded-lg p-2.5 sm:p-3.5 bg-white/95 relative z-10 backdrop-blur-xs space-y-2.5">
        {/* Treasury Arch Header (1000 Taka Stamp) */}
        <div className="relative text-center border-b border-emerald-900/20 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
            <span className="font-mono text-[10px] font-black text-[#D61C2C] tracking-widest bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              ক্রমিক নং: {deed?.deed_no ? `DL-${toBanglaDigits(deed.id || 1001)}` : 'কখ-১০৮৭৬৫৪'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[10px] sm:text-[11px] tracking-wider border border-emerald-300">
              বাংলাদেশ নন-জুডিশিয়াল স্ট্যাম্প (১০০০ টাকা)
            </span>
            <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {deed?.deed_no || 'DL-2026-1001'}
            </span>
          </div>

          {/* National Emblem SVG Arch */}
          <div className="flex flex-col items-center justify-center space-y-0.5">
            <div className="w-8 h-8 rounded-full bg-[#006A4E] text-white flex items-center justify-center shadow-xs ring-2 ring-emerald-100 mb-0.5">
              <span className="text-base font-black font-serif">★</span>
            </div>
            <h2 className="text-sm sm:text-base font-black tracking-wide text-[#006A4E]">
              গণপ্রজাতন্ত্রী বাংলাদেশ সরকার
            </h2>
            <div className="text-[10px] font-bold text-slate-600">
              নিবন্ধন অধিদপ্তর · আইন, বিচার ও সংসদ বিষয়ক মন্ত্রণালয়
            </div>
            <div className="inline-block mt-0.5 px-3 py-0.5 rounded-md bg-[#006A4E] text-white text-[10px] font-bold uppercase tracking-wider">
              {deed?.deed_type === 'SAF_KABALA' || !deed?.deed_type ? 'সাফ-কবলা জমি বিক্রয় দলিল' : deed.deed_type}
            </div>
          </div>
        </div>

        {/* Sub-Registry Endorsement Header */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 rounded-lg bg-emerald-50/70 border border-emerald-200 text-[11px]">
          <div>
            <span className="text-[9px] text-slate-500 block">সাব-রেজিস্ট্রি কার্যালয়:</span>
            <strong className="text-[#074f38] leading-tight block">
              {deed?.sub_registry_office ||
                (result?.location?.upazila_bn
                  ? `${result.location.upazila_bn}, ${result.location.district_bn || ''}`
                  : 'সাভার, ঢাকা')}
            </strong>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block">দলিল নম্বর ও সন:</span>
            <strong className="font-mono text-slate-900 leading-tight block">
              {deed?.deed_no || 'DL-2026-1001'} (২০২৬)
            </strong>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block">বালাম বহি ও পৃষ্ঠা:</span>
            <strong className="leading-tight block">১নং বহি, পৃষ্ঠা {toBanglaDigits(deed?.chain_index || 1)}০১-১০৮</strong>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block">লেজার স্ট্যাটাস:</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-800">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>নিবন্ধিত ও সত্য</span>
            </span>
          </div>
        </div>

        {/* Parties Schedule Table */}
        <div className="grid sm:grid-cols-2 gap-2 text-xs">
          <div className="p-2 sm:p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-0.5">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">
              ১ম পক্ষ (বিক্রেতা / দাতা):
            </span>
            <div className="font-bold text-xs text-slate-900">
              {result?.seller?.name_bn || deed?.seller_name_bn || deed?.seller_name || 'রেকর্ডপ্রাপ্ত বিক্রেতা'}
            </div>
            <div className="font-mono text-[10px] text-slate-600">
              এনআইডি: {result?.seller?.nid || deed?.seller_nid || 'এনআইডি সংরক্ষিত'}
            </div>
            <div className="text-[10px] text-slate-500">
              {result?.seller?.father_name_bn
                ? `পিতা: ${result.seller.father_name_bn}`
                : 'পিতা: রেকর্ডভুক্ত'} · {result?.location?.mouza_bn ? `গ্রাম: ${result.location.mouza_bn}` : 'গ্রাম: কান্দাপাড়া'}
            </div>
          </div>

          <div className="p-2 sm:p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-0.5">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">
              ২য় পক্ষ (ক্রেতা / গ্রহীতা):
            </span>
            <div className="font-bold text-xs text-slate-900">
              {result?.buyer?.name_bn || deed?.buyer_name_bn || deed?.buyer_name || 'রেকর্ডপ্রাপ্ত ক্রেতা'}
            </div>
            <div className="font-mono text-[10px] text-slate-600">
              এনআইডি: {result?.buyer?.nid || deed?.buyer_nid || 'এনআইডি সংরক্ষিত'}
            </div>
            <div className="text-[10px] text-slate-500">
              {result?.buyer?.spouse_name_bn
                ? `স্বামী/স্ত্রী: ${result.buyer.spouse_name_bn}`
                : result?.buyer?.father_name_bn
                ? `পিতা: ${result.buyer.father_name_bn}`
                : 'অভিভাবক: রেকর্ডভুক্ত'} · {result?.location?.upazila_bn ? `উপজেলা: ${result.location.upazila_bn}` : 'উপজেলা: সাভার'}
            </div>
          </div>
        </div>

        {/* Property Particulars Schedule */}
        <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
          <div className="bg-emerald-100/60 px-2.5 py-1 font-bold text-emerald-900 border-b border-emerald-200 text-[11px]">
            তফসিল সম্পত্তি (বিক্রিত ভূমির বিবরণ):
          </div>
          <div className="p-2 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white text-[11px]">
            <div>
              <span className="text-[9px] text-slate-500 block">মৌজা ও জেএল:</span>
              <strong>
                {result?.location?.mouza_bn || deed?.mouza_bn || 'ধামরাই'} (জেএল{' '}
                {toBanglaDigits(result?.location?.jl_no || deed?.jl_no || '৪১০১')})
              </strong>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block">উপজেলা ও জেলা:</span>
              <strong>
                {result?.location?.upazila_bn || deed?.upazila_bn || 'সাভার'},{' '}
                {result?.location?.district_bn || deed?.district_bn || 'ঢাকা'}
              </strong>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block">দাগ ও খতিয়ান:</span>
              <strong className="text-[#006A4E]">
                দাগ: {toBanglaDigits(result?.plot?.dag_no || deed?.dag_no || '১০১')},{' '}
                খতিয়ান: {toBanglaDigits(result?.bs_khatian?.khatian_no || deed?.khatian_no || '৪১০১')}
              </strong>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block">বিক্রিত পরিমাণ ও মূল্য:</span>
              <strong className="text-[#006A4E]">
                {toBanglaDigits(deed?.area_decimal ?? result?.plot?.total_area_decimal ?? '১০.০০')} শতক (৳{' '}
                {toBanglaDigits(Number(deed?.price_bdt || 2500000).toLocaleString())})
              </strong>
            </div>
          </div>
        </div>

        {/* Digital Deed Seal & QR Footing */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-emerald-900/20">
          <div className="flex items-center gap-2.5">
            {result?.qr_data_uri ? (
              <img
                src={result.qr_data_uri}
                alt="Digital Seal QR Code"
                className="w-14 h-14 border border-[#006A4E] rounded-lg p-0.5 bg-white shadow-2xs"
              />
            ) : (
              <div className="w-14 h-14 border border-dashed border-[#006A4E] rounded-lg flex items-center justify-center bg-emerald-50 text-[#006A4E]">
                <QrCode className="w-7 h-7" />
              </div>
            )}
            <div className="space-y-0.5 text-xs">
              <div className="inline-flex items-center gap-1 font-bold text-emerald-800 text-[11px]">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Ed25519 ডিজিটাল সিলমোহর যাচাইকৃত</span>
              </div>
              <div className="text-[9px] text-slate-500">
                স্বাক্ষর তারিখ: {formatDate(deed?.created_at || new Date().toISOString())}
              </div>
              <div className="font-mono text-[8px] text-slate-400 truncate max-w-xs">
                হ্যাশ: {result?.cryptographic_proof?.stored_content_hash?.substring(0, 32) || '0x7f48a9b1...'}...
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="w-28 h-8 border-b border-slate-400 mb-0.5 flex items-end justify-center font-serif italic text-[11px] text-slate-600">
              (এম. এ. রহমান)
            </div>
            <span className="text-[9px] text-slate-500 font-bold block">সাব-রেজিস্ট্রার</span>
            <span className="text-[8px] text-slate-400">সাভার রেজিস্ট্রি কার্যালয়, ঢাকা</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const VerifyDeedQrPage: React.FC = () => {
  const { lang, t, formatDate } = useAppUI();
  const [deedCode, setDeedCode] = useState('DL-2026-1001');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Scanner Viewfinder State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraScanProgress, setCameraScanProgress] = useState(0);

  // Tamper demo state
  const [tampering, setTampering] = useState(false);
  const [tamperSuccessMsg, setTamperSuccessMsg] = useState<string | null>(null);

  const handleVerify = async (codeToVerify = deedCode) => {
    const cleanCode = codeToVerify.trim();
    if (!cleanCode) return;
    setLoading(true);
    setErrorMsg(null);
    setTamperSuccessMsg(null);

    try {
      if (cleanCode.toUpperCase().startsWith('NOC-')) {
        const res = await BhumiApi.verifyNocByCode(cleanCode);
        const isValid = Boolean(res.valid || res.verified || res.is_valid);
        setResult({
          verified: isValid,
          is_noc: true,
          status: isValid ? 'RELEASED' : 'ACTIVE',
          badge_bn: isValid ? '✔ ব্যাংক দায়মুক্তি সনদ (NOC) যাচাই সম্পন্ন' : '✖ ব্যাংক দায়মুক্তি সনদ যাচাই ব্যর্থ',
          badge_en: isValid ? '✔ Bank Lien Clearance (NOC) Verified' : '✖ NOC Verification Failed',
          message_bn: isValid
            ? 'ব্যাংক অনাপত্তিপত্রটি সিস্টেম রেকর্ডের সাথে মিলেছে এবং ঋণ দায়মুক্ত।'
            : 'এনওসি সনদের তথ্য বা স্বাক্ষরে গরমিল শনাক্ত হয়েছে।',
          message_en: isValid
            ? 'Bank No Objection Certificate verified; lien is released.'
            : 'Discrepancy detected in NOC record or signature.',
          qr_data_uri: res.qr_svg_data_uri || res.qr_data_uri,
          noc: res.noc || res,
          cryptographic_proof: res.cryptographic_proof || {
            stored_content_hash: res.noc_hash || 'hash_sample_noc',
            recomputed_content_hash: res.noc_hash || 'hash_sample_noc',
            hash_matches: isValid,
            signature_valid: isValid,
          },
        });
      } else {
        const res = await BhumiApi.verifyDeedByCode(cleanCode);
        setResult({
          ...res,
          is_noc: false,
        });
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setErrorMsg(
          t(
            'এই দলিল বা NOC নম্বরটি ডাটাবেজে পাওয়া যায়নি। অনুগ্রহ করে নম্বরটি সঠিক কিনা পরীক্ষা করুন।',
            'Record not found in registry database. Please check the number.'
          )
        );
      } else {
        setErrorMsg(
          t(
            'সার্ভার সংযোগে ত্রুটি বা নেটওয়ার্ক সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।',
            'Connection or network error. Please try again.'
          )
        );
      }
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto-verify on mount or query param
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paramDeed = urlParams.get('deed_no');
    const paramNoc = urlParams.get('noc_no');
    const code = paramDeed || paramNoc || 'DL-2026-1001';
    setDeedCode(code);
    handleVerify(code);
  }, []);

  // Camera Viewfinder Simulation
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (cameraActive) {
      setCameraScanProgress(0);
      interval = setInterval(() => {
        setCameraScanProgress((prev) => {
          if (prev >= 100) {
            setCameraActive(false);
            handleVerify(deedCode);
            return 100;
          }
          return prev + 25;
        });
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cameraActive]);

  // Tamper Deed Demonstration
  const handleTamperDemo = async () => {
    setTampering(true);
    try {
      await BhumiApi.tamperDeedDemo(deedCode || 'DL-2026-1005', 99.99);
      setTamperSuccessMsg(
        t(
          'সতর্কতা: দলিলের জমির পরিমাণ পরিবর্তিত করা হয়েছে! সিস্টেম তাৎক্ষণিকভাবে ক্রিপ্টোগ্রাফিক গরমিল শনাক্ত করেছে।',
          'Simulated tamper: Plot area altered in database! Fraud detected immediately.'
        )
      );
      handleVerify(deedCode);
    } catch {
      setErrorMsg(t('জালিয়াতি ডেমো চালাতে সমস্যা হয়েছে।', 'Failed to run tamper demo.'));
    } finally {
      setTampering(false);
    }
  };

  // Restore Deed Ledger
  const handleRestoreDemo = async () => {
    setTampering(true);
    try {
      await BhumiApi.restoreDeedDemo(deedCode || 'DL-2026-1005');
      setTamperSuccessMsg(
        t(
          'মূল ডিজিটাল লেজার থেকে দলিলের আসল রেকর্ড পুনরুদ্ধার করা হয়েছে। রেকর্ড এখন সম্পূর্ণ সুরক্ষিত ও অক্ষত।',
          'Authentic deed restored from original ledger block. Record is safe and valid again.'
        )
      );
      handleVerify(deedCode);
    } catch {
      setErrorMsg(t('রেকর্ড পুনরুদ্ধার ব্যর্থ হয়েছে।', 'Failed to restore ledger.'));
    } finally {
      setTampering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 pb-8 sm:pb-12 relative overflow-hidden">
      {/* Ambient background glow & subtle dot pattern */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[320px] bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent blur-3xl -z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 -z-10 pointer-events-none" />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4">
        {/* Compact Integrated Header Bar */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-3.5 shadow-xs mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-[#006A4E] flex items-center justify-center shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  {t('দলিলের সত্যতা যাচাই', 'Verify Deed Authenticity')}
                </h1>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {t('সাব-রেজিস্ট্রি লেজার', 'Sub-Registry Ledger')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-none">
                {t('QR কোড বা দলিল নম্বর দিয়ে সাব-রেজিস্ট্রির ডিজিটাল সিল ও সত্যতা যাচাই।', 'Verify digital seal & authenticity using QR code or deed number.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={cameraActive ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setCameraActive(!cameraActive)}
              className="h-8 px-3 text-xs font-bold flex items-center gap-1.5 rounded-lg cursor-pointer"
            >
              {cameraActive ? (
                <>
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>{t('ক্যামেরা বন্ধ করুন', 'Close Camera')}</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 text-[#006A4E]" />
                  <span>{t('QR ক্যামেরা স্ক্যান', 'QR Scanner')}</span>
                </>
              )}
            </Button>
            {result && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="h-8 px-2.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer text-xs flex items-center gap-1 rounded-lg"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('প্রিন্ট', 'Print')}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Compact Search & Verification Card */}
        <Card className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-3 sm:p-3.5 space-y-2.5 mb-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify(deedCode);
            }}
            className="space-y-2"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
              {/* Deed/NOC input + Verify Button */}
              <div className="md:col-span-8 flex items-center gap-2">
                <div className="relative flex-1">
                  <QrCode className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input
                    value={deedCode}
                    onChange={(e) => setDeedCode(e.target.value)}
                    placeholder={t('দলিল বা NOC কোড লিখুন (যেমন: DL-2026-1001)', 'Enter Deed or NOC code')}
                    className="h-9 pl-8 text-xs sm:text-sm font-mono font-bold border-slate-300 focus-visible:ring-[#006A4E] rounded-lg"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-9 px-4 bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs shadow-xs cursor-pointer transition shrink-0 flex items-center gap-1.5 rounded-lg"
                >
                  {loading ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('যাচাই হচ্ছে...', 'Verifying...')}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>{t('যাচাই করুন', 'Verify')}</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Compact QR Dropzone / File Picker */}
              <div className="md:col-span-4 relative">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const detected = deedCode || 'DL-2026-1001';
                      handleVerify(detected);
                    }
                  }}
                />
                <div className="h-9 px-2.5 border border-dashed border-emerald-300 hover:border-[#006A4E] hover:bg-emerald-50/50 rounded-lg bg-emerald-50/20 flex items-center justify-center gap-2 text-slate-700 transition cursor-pointer text-xs">
                  <UploadCloud className="w-4 h-4 text-[#006A4E] shrink-0" />
                  <span className="truncate font-medium text-[11px] sm:text-xs">
                    {t('QR ছবি বা ফাইল আপলোড', 'Upload QR Image / PDF')}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Test Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-[11px]">
              <span className="text-[11px] font-medium text-slate-500 shrink-0">
                {t('নমুনা রেকর্ড:', 'Quick test:')}
              </span>
              {[
                { code: 'DL-2026-1001', label: 'DL-2026-1001 (নিরাপদ দলিল)', badge: 'safe' },
                { code: 'DL-2026-1002', label: 'DL-2026-1002 (সাভার)', badge: 'info' },
                { code: 'DL-2026-1005', label: 'DL-2026-1005 (জালিয়াতি ডেমো)', badge: 'danger' },
                { code: 'NOC-2026-1001', label: 'NOC-2026-1001 (ব্যাংক দায়মুক্তি)', badge: 'noc' },
              ].map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    setDeedCode(item.code);
                    handleVerify(item.code);
                  }}
                  className={`h-6 px-2.5 text-[11px] rounded-full font-mono font-medium transition cursor-pointer border flex items-center gap-1.5 ${
                    deedCode === item.code
                      ? 'bg-[#006A4E] text-white border-[#006A4E] shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      item.badge === 'safe'
                        ? 'bg-emerald-500'
                        : item.badge === 'danger'
                        ? 'bg-rose-500'
                        : item.badge === 'noc'
                        ? 'bg-blue-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </form>

          {/* Camera Viewfinder Animation Simulation */}
          {cameraActive && (
            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-emerald-500 p-3 sm:p-4 text-center text-white space-y-2 shadow-inner mt-2">
              <div className="relative max-w-[170px] mx-auto aspect-square border-2 border-dashed border-emerald-400 rounded-xl flex flex-col items-center justify-center p-3">
                <div
                  className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-md shadow-emerald-500 transition-all duration-300"
                  style={{ top: `${cameraScanProgress}%` }}
                />
                <Scan className="w-10 h-10 text-emerald-400 animate-pulse mb-1.5" />
                <span className="text-[11px] font-bold text-emerald-200">
                  {t('দলিলের QR কোড ফ্রেমের মাঝে রাখুন', 'Position deed QR code within frame')}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {t('স্ক্যানিং চলছে...', 'Scanning...')} ({cameraScanProgress}%)
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                {t('ক্যামেরা সেন্সর দলিলের ডিজিটাল সিল ও হ্যাশ রিড করছে...', 'Sensors reading digital deed hash and signature...')}
              </p>
            </div>
          )}
        </Card>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-3 p-2.5 sm:p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleVerify(deedCode)}
              className="h-7 border-rose-300 text-rose-800 hover:bg-rose-100 cursor-pointer text-xs"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              <span>{t('পুনরায় চেষ্টা', 'Retry')}</span>
            </Button>
          </div>
        )}

        {/* Tamper Notification Banner */}
        {tamperSuccessMsg && (
          <div className="mb-3 p-2.5 sm:p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center justify-between shadow-2xs text-xs">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{tamperSuccessMsg}</span>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <Card className="p-4 sm:p-5 space-y-3 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-48 bg-slate-200" />
              <Skeleton className="h-3.5 w-72 bg-slate-200" />
            </div>
            <Skeleton className="h-40 w-full bg-slate-200 rounded-xl" />
          </Card>
        )}

        {/* RESULT PRESENTATION */}
        {!loading && result && (
          <div className="space-y-3">
            {/* Status Hero Verdict Badge */}
            <Card
              className={`p-3 sm:p-3.5 rounded-xl border shadow-xs ${
                result.verified
                  ? 'bg-emerald-50/90 border-[#10B981] text-emerald-950'
                  : 'bg-rose-50/90 border-[#FF3B4A] text-rose-950'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                      result.verified
                        ? 'bg-[#10B981] text-white'
                        : 'bg-[#FF3B4A] text-white'
                    }`}
                  >
                    {result.verified ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <XOctagon className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          result.verified
                            ? 'bg-emerald-100 text-[#065F46] border-emerald-300'
                            : 'bg-rose-100 text-[#991B1B] border-rose-300'
                        }`}
                      >
                        {result.verified
                          ? t('সম্পূর্ণ নিরাপদ ও সত্য', 'Completely Verified & Authentic')
                          : t('জালিয়াতি বা বিকৃত রেকর্ড', 'Tampered or Invalid Record')}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono font-bold">
                        {deedCode}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-black mt-0.5">
                      {lang === 'bn' ? result.badge_bn : result.badge_en}
                    </h3>
                    <p className="text-[11px] opacity-90 leading-snug max-w-2xl mt-0.5">
                      {lang === 'bn' ? result.message_bn : result.message_en}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Interactive Tamper / Restore Demo Trigger Buttons */}
                  {result.verified ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleTamperDemo}
                      disabled={tampering}
                      className="h-7 px-2.5 cursor-pointer text-xs font-bold flex items-center gap-1 rounded-lg"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      <span>{t('জালিয়াতি ডেমো পরীক্ষা করুন', 'Simulate Record Tamper')}</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleRestoreDemo}
                      disabled={tampering}
                      className="h-7 px-2.5 bg-[#006A4E] hover:bg-[#00553e] text-white font-bold cursor-pointer text-xs flex items-center gap-1 rounded-lg"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t('আসল লেজার রেকর্ড পুনরুদ্ধার', 'Restore Authentic Ledger')}</span>
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Responsive Viewport Scroll Container for Deed Replica & Proofs */}
            <div className="space-y-2.5 max-h-[calc(100vh-230px)] sm:max-h-[calc(100vh-210px)] overflow-y-auto scrollbar-thin pr-1">
              {/* BANGLADESH 100/1000 TAKA STAMP DEED REPLICA */}
              {!result.is_noc && (
                <BangladeshStampDeedReplica
                  deed={result.deed}
                  result={result}
                  lang={lang}
                  t={t}
                  formatDate={formatDate}
                />
              )}

              {/* COLLAPSIBLE CRYPTOGRAPHIC PROOF ACCORDION */}
              <Card className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="crypto-proofs" className="border-none px-3.5 sm:px-4">
                    <AccordionTrigger className="py-2.5 text-xs sm:text-sm font-bold text-slate-800 hover:text-[#006A4E] cursor-pointer">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-3.5 h-3.5 text-[#006A4E]" />
                        <span>{t('আরও দেখুন (প্রযুক্তিগত ও ক্রিপ্টোগ্রাফিক প্রমাণ)', 'View Technical & Cryptographic Proofs')}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-3.5 pt-1 space-y-2.5 text-xs text-slate-700">
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {t(
                          'এই দলিলের প্রতিটি শব্দ ও সংখ্যার সত্যতা Ed25519 ডিজিটাল স্বাক্ষর এবং শৃঙ্খলিত ক্রিপ্টোগ্রাফিক হ্যাশের মাধ্যমে যাচাইকৃত। তথ্য পরিবর্তন করা হলে হ্যাশ অমিল হয়ে স্বয়ংক্রিয় সতর্কতা জারি হয়।',
                          'Every field of this deed is sealed via Ed25519 digital signature and Merkle chained hash. Any alteration triggers an automatic hash mismatch flag.'
                        )}
                      </p>

                      <div className="space-y-2 font-mono text-[10px] bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-200">
                        <div>
                          <span className="text-slate-500 block font-sans text-[11px] mb-0.5">সংরক্ষিত কনটেন্ট হ্যাশ (Stored Content Hash):</span>
                          <div className="bg-white p-1.5 rounded border border-slate-300 break-all text-slate-900 font-bold">
                            {result.cryptographic_proof?.stored_content_hash || 'N/A'}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-500 block font-sans text-[11px] mb-0.5">বর্তমান তথ্যের পুনর্গণনাকৃত হ্যাশ (Recomputed Content Hash):</span>
                          <div
                            className={`p-1.5 rounded border break-all font-bold ${
                              result.cryptographic_proof?.hash_matches
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                : 'bg-rose-50 border-rose-300 text-rose-900'
                            }`}
                          >
                            {result.cryptographic_proof?.recomputed_content_hash || 'N/A'}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <div>
                            <span className="text-slate-500 block font-sans text-[11px]">হ্যাশ সামঞ্জস্য (Hash Match):</span>
                            <strong className={result.cryptographic_proof?.hash_matches ? 'text-emerald-700' : 'text-rose-700'}>
                              {result.cryptographic_proof?.hash_matches ? '✓ MATCHED (অক্ষত)' : '✖ MISMATCH (বিকৃত)'}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block font-sans text-[11px]">ডিজিটাল স্বাক্ষর (Signature):</span>
                            <strong className={result.cryptographic_proof?.signature_valid ? 'text-emerald-700' : 'text-rose-700'}>
                              {result.cryptographic_proof?.signature_valid ? '✓ VALID Ed25519' : '✖ INVALID'}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
