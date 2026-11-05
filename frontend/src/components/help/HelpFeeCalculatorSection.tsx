import React, { useState, useEffect } from 'react';
import { useAppUI } from '../../i18n';
import { BhumiApi, ServiceFeeItem } from '../../api/client';
import { toBanglaDigits } from '../../theme/tokens';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Coins,
  Calculator,
  AlertTriangle,
  Receipt,
  Building2,
} from 'lucide-react';

export const HelpFeeCalculatorSection: React.FC = () => {
  const { t, lang } = useAppUI();
  const [feesList, setFeesList] = useState<ServiceFeeItem[]>([]);
  const [feesLoading, setFeesLoading] = useState(true);

  // Calculator State
  const [serviceType, setServiceType] = useState<'saf_kabala' | 'hiba' | 'mutation' | 'porcha'>('saf_kabala');
  const [landValue, setLandValue] = useState<number>(1000000);
  const [locationTier, setLocationTier] = useState<'city' | 'municipality' | 'rural'>('rural');

  useEffect(() => {
    BhumiApi.listPublicFees()
      .then((res) => {
        setFeesList(res.items || []);
        setFeesLoading(false);
      })
      .catch(() => setFeesLoading(false));
  }, []);

  // Compute calculated values based on statutory gazette
  const computeFees = () => {
    if (serviceType === 'mutation') {
      return {
        appFee: 20,
        noticeFee: 50,
        correctionFee: 1000,
        khatianFee: 100,
        total: 1170,
        isPercentage: false,
      };
    }

    if (serviceType === 'porcha') {
      return {
        courtFee: 20,
        searchFee: 10,
        deliveryFee: 70,
        total: 100,
        isPercentage: false,
      };
    }

    if (serviceType === 'hiba') {
      return {
        stampDuty: 200,
        registrationFee: 100,
        localTax: 0,
        affidavit: 300,
        total: 600,
        isPercentage: false,
      };
    }

    // Saf Kabala
    const stampRate = 0.015;
    const regRate = 0.01;
    const localRate = locationTier === 'city' ? 0.03 : locationTier === 'municipality' ? 0.02 : 0.01;
    const aitRate = locationTier === 'city' ? 0.03 : 0.02;

    const stampDuty = Math.round(landValue * stampRate);
    const regFee = Math.round(landValue * regRate);
    const localTax = Math.round(landValue * localRate);
    const ait = Math.round(landValue * aitRate);
    const misc = 300;
    const total = stampDuty + regFee + localTax + ait + misc;

    return {
      stampDuty,
      stampRate: '১.৫%',
      regFee,
      regRate: '১.০%',
      localTax,
      localRate: `${toBanglaDigits(localRate * 100, lang)}%`,
      ait,
      aitRate: `${toBanglaDigits(aitRate * 100, lang)}%`,
      misc,
      total,
      isPercentage: true,
    };
  };

  const calculated = computeFees();

  return (
    <div className="flex flex-col gap-8">
      {/* Visual Header Banner in Natural Flow */}
      <div
        className="rounded-2xl border border-amber-500/30 shadow-md p-6 sm:p-8 text-white bg-cover bg-center flex flex-col justify-end"
        style={{ backgroundImage: `url('/assets/fee-calculator-banner.svg')`, backgroundColor: '#022c22' }}
      >
        <div className="flex flex-col gap-2 max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/90 text-amber-950 text-xs font-black border border-amber-300 w-fit backdrop-blur-xs">
            <Coins className="size-3.5" />
            {t('ভূমি মন্ত্রণালয় অনুমোদিত সরকারি রেট', 'Ministry of Land Authorized Rates')}
          </span>
          <h2 className="text-xl sm:text-2xl font-black leading-tight">
            {t('স্বচ্ছ ও দালালমুক্ত সরকারি ফি নির্দেশিকা', 'Transparent & Middleman-Free Official Fee Registry')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
            {t(
              '১৭ ফেব্রুয়ারি ২০২৬ তারিখের স্মারক সার্কুলার অনুযায়ী দলিলের প্রকৃত সরকারি খরচ এবং ই-নামজারি ফি ক্যালকুলেটরে নিজেই হিসাব করুন।',
              'Calculate exact statutory costs for deed registration and e-mutation directly according to official circular dated 17 February 2026.'
            )}
          </p>
        </div>
      </div>

      {/* Interactive Land Fee Live Calculator */}
      <Card className="border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/20 to-white shadow-xs">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-100 text-[#006A4E]">
                <Calculator className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-black text-slate-900">
                  {t('লাইভ সরকারি ফি ক্যালকুলেটর (Live Fee Calculator)', 'Interactive Official Fee Calculator')}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  {t('দলিল মূল্য ও এলাকা নির্বাচন করে তাৎক্ষণিক নির্ভুল খরচ বের করুন', 'Select transaction type and deed valuation for instant accurate breakdown')}
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-[#006A4E] border border-emerald-300 font-bold">
              {t('স্বয়ংক্রিয় হিসাব', 'Auto Calculated')}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* Service Selector Chips */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-700">
              {t('১. সেবার ধরন নির্বাচন করুন:', '1. Select Service Type:')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'saf_kabala', label_bn: 'সাফ কবলা (বিক্রয়)', label_en: 'Saf Kabala (Sale)' },
                { id: 'hiba', label_bn: 'হেবা দলিল (দান)', label_en: 'Hiba (Gift)' },
                { id: 'mutation', label_bn: 'ই-নামজারি (মিউটেশন)', label_en: 'e-Mutation' },
                { id: 'porcha', label_bn: 'অনলাইন খতিয়ান / পরচা', label_en: 'Digital Porcha' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setServiceType(s.id as any)}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    serviceType === s.id
                      ? 'bg-[#006A4E] text-white border-[#006A4E] shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {lang === 'bn' ? s.label_bn : s.label_en}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Inputs for Saf Kabala */}
          {serviceType === 'saf_kabala' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800">
                  {t('জমির দলিল মূল্য (টাকা):', 'Deed Consideration Value (BDT):')}
                </label>
                <Input
                  type="number"
                  min={10000}
                  step={50000}
                  value={landValue}
                  onChange={(e) => setLandValue(Math.max(0, Number(e.target.value)))}
                  className="h-10 text-sm font-mono font-bold bg-white"
                />
                <span className="text-[11px] text-slate-500 font-mono">
                  = {toBanglaDigits(landValue.toLocaleString(), lang)} ৳
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800">
                  {t('জমির অবস্থান ও এখতিয়ার:', 'Property Jurisdiction / Location:')}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'city', label_bn: 'সিটি কর্পোরেশন', label_en: 'City Corp' },
                    { id: 'municipality', label_bn: 'পৌরসভা', label_en: 'Municipality' },
                    { id: 'rural', label_bn: 'ইউনিয়ন (গ্রাম)', label_en: 'Rural Union' },
                  ].map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => setLocationTier(loc.id as any)}
                      className={`p-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        locationTier === loc.id
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {lang === 'bn' ? loc.label_bn : loc.label_en}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-500">
                  {locationTier === 'city'
                    ? t('সিটি এলাকায় স্থানীয় সরকার কর ও উৎস কর উচ্চ হারে প্রযোজ্য।', 'City area imposes higher statutory local govt tax.')
                    : t('গ্রামাঞ্চলে স্থানীয় সরকার কর তুলনামূলক কম (১%)।', 'Rural union incurs standard minimal 1% local tax.')}
                </span>
              </div>
            </div>
          )}

          {/* Breakdown Calculation Result Card */}
          <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="size-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  {t('সরকারি ফি বিভাজন বিবরণী', 'Statutory Fee Breakdown Statement')}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-500/50">
                {t('চালানযোগ্য নিট প্রাক্কলন', 'Payable via Chalan')}
              </Badge>
            </div>

            {serviceType === 'saf_kabala' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1">
                  <span className="text-slate-400 text-[11px]">স্ট্যাম্প শুল্ক (১.৫%)</span>
                  <span className="text-sm font-black font-mono text-white">
                    {toBanglaDigits((calculated as any).stampDuty.toLocaleString(), lang)} ৳
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1">
                  <span className="text-slate-400 text-[11px]">রেজিস্ট্রেশন ফি (১.০%)</span>
                  <span className="text-sm font-black font-mono text-white">
                    {toBanglaDigits((calculated as any).regFee.toLocaleString(), lang)} ৳
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1">
                  <span className="text-slate-400 text-[11px]">স্থানীয় কর ({(calculated as any).localRate})</span>
                  <span className="text-sm font-black font-mono text-white">
                    {toBanglaDigits((calculated as any).localTax.toLocaleString(), lang)} ৳
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1">
                  <span className="text-slate-400 text-[11px]">উৎস কর ({(calculated as any).aitRate})</span>
                  <span className="text-sm font-black font-mono text-white">
                    {toBanglaDigits((calculated as any).ait.toLocaleString(), lang)} ৳
                  </span>
                </div>
              </div>
            )}

            {serviceType === 'mutation' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1">
                  <span className="text-slate-400 text-[11px]">আবেদন কোর্ট ফি</span>
                  <span className="text-sm font-black font-mono text-white">২০ ৳</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1">
                  <span className="text-slate-400 text-[11px]">নোটিশ জারি ফি</span>
                  <span className="text-sm font-black font-mono text-white">৫০ ৳</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1">
                  <span className="text-slate-400 text-[11px]">রেকর্ড সংশোধন (DCR)</span>
                  <span className="text-sm font-black font-mono text-white">১,০০০ ৳</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1">
                  <span className="text-slate-400 text-[11px]">নতুন খতিয়ান ফি</span>
                  <span className="text-sm font-black font-mono text-white">১০০ ৳</span>
                </div>
              </div>
            )}

            {serviceType === 'hiba' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1">
                  <span className="text-slate-400 text-[11px]">স্ট্যাম্প শুল্ক (স্থির)</span>
                  <span className="text-sm font-black font-mono text-white">২০০ ৳</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1">
                  <span className="text-slate-400 text-[11px]">রেজিস্ট্রেশন ফি</span>
                  <span className="text-sm font-black font-mono text-white">১০০ ৳</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1">
                  <span className="text-slate-400 text-[11px]">হলফনামা ও শুল্ক</span>
                  <span className="text-sm font-black font-mono text-white">৩০০ ৳</span>
                </div>
              </div>
            )}

            {serviceType === 'porcha' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1">
                  <span className="text-slate-400 text-[11px]">আবেদন কোর্ট ফি</span>
                  <span className="text-sm font-black font-mono text-white">২০ ৳</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1">
                  <span className="text-slate-400 text-[11px]">সার্চ ফি</span>
                  <span className="text-sm font-black font-mono text-white">১০ ৳</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1">
                  <span className="text-slate-400 text-[11px]">ডিজিটাল ডেলিভারি ফি</span>
                  <span className="text-sm font-black font-mono text-white">৭০ ৳</span>
                </div>
              </div>
            )}

            {/* Total Highlight */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-slate-400 font-medium">
                  {t('মোট সরকারি ফি (কোনো অতিরিক্ত চার্জ নেই):', 'Total Official Statutory Fee (No extra charge):')}
                </span>
                <span className="text-[11px] text-emerald-400 font-medium">
                  {t('সরাসরি সরকারি চালানের মাধ্যমে পরিশোধযোগ্য', 'Payable directly to Bangladesh Treasury Chalan')}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
                  {toBanglaDigits(calculated.total.toLocaleString(), lang)} ৳
                </span>
                <span className="text-xs text-slate-400">
                  {serviceType === 'saf_kabala' ? t('(আনুমানিক)', '(Estimated)') : t('(স্থির)', '(Fixed)')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Official Fees Table from Ministry of Land Circular */}
      <Card className="border-slate-200/90 shadow-2xs">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <Building2 className="size-5 text-[#006A4E]" />
                <span>{t('সরকারি ফি ও সার্কুলার নির্দেশিকা (অফিসিয়াল রেট)', 'Official Land Service Fees & Ministry Circulars')}</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-1">
                {t(
                  'ভূমি মন্ত্রণালয়ের ১৭ ফেব্রুয়ারি ২০২৬ তারিখের স্মারক সার্কুলার (স্মারক: ৩১.০০.০০০০.০৪২.৬৮.০১২.২২.৫২) এবং রেজিস্ট্রি বিধিমালা অনুযায়ী নির্ধারিত ফি তালিকা।',
                  'Official fees pursuant to Ministry of Land Circular dated 17 February 2026 (Memo: 31.00.0000.042.68.012.22.52).'
                )}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-bold bg-emerald-50 text-emerald-800 border-emerald-200 w-fit">
              {t('সার্কুলার: ১৭ ফেব্রুয়ারি ২০২৬', 'Circular: 17 Feb 2026')}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {feesLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-4 p-4 border rounded-xl">
                  <Skeleton className="h-5 w-1/4 bg-slate-200" />
                  <Skeleton className="h-5 w-1/4 bg-slate-200" />
                  <Skeleton className="h-5 w-1/2 bg-slate-200" />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-auto max-h-[460px] scrollbar-thin">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-slate-800 text-xs w-[240px]">
                        {t('সেবা ও কোড', 'Service & Code')}
                      </TableHead>
                      <TableHead className="font-bold text-slate-800 text-xs w-[160px]">
                        {t('সরকারি ফি হার', 'Govt Fee / Rate')}
                      </TableHead>
                      <TableHead className="font-bold text-slate-800 text-xs">
                        {t('ফি বিভাজন ও উপাদানসমূহ', 'Fee Breakdown & Components')}
                      </TableHead>
                      <TableHead className="font-bold text-slate-800 text-xs w-[200px] text-right">
                        {t('কর্তৃপক্ষ ও গেজেট লিংক', 'Authority & Link')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feesList.map((f) => {
                      const isEstimate = Boolean(f.is_estimate);
                      const comps = f.components || [];

                      return (
                        <TableRow key={f.id} className="hover:bg-slate-50/70">
                          <TableCell className="align-top py-3.5">
                            <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                              {f.service_code}
                            </span>
                            <div className="text-xs font-bold text-slate-900 mt-0.5">
                              {lang === 'bn' ? f.title_bn : f.title_en}
                            </div>
                            <Badge
                              variant="outline"
                              className={`mt-1 text-[10px] ${
                                isEstimate
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              }`}
                            >
                              {isEstimate
                                ? t('প্রাক্কলিত হার', 'Estimated Rate')
                                : t('গেজেট নির্ধারিত ফি', 'Gazetted Fee')}
                            </Badge>
                          </TableCell>

                          <TableCell className="align-top py-3.5">
                            <div className="text-sm font-black text-[#006A4E] font-mono">
                              {isEstimate
                                ? `~${f.total_bdt}%`
                                : `${toBanglaDigits(f.total_bdt, lang)} ৳`}
                            </div>
                            {isEstimate && (
                              <span className="text-[10px] text-slate-500 block">
                                {t('(দলিল মূল্যের)', '(of deed value)')}
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="align-top py-3.5">
                            {comps.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {comps.map((c, i) => (
                                  <span
                                    key={i}
                                    className="text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700"
                                  >
                                    {lang === 'bn' ? c.name_bn : c.name_en}:{' '}
                                    <strong className="text-slate-900 font-mono">
                                      {isEstimate ? `${c.amount_bdt}%` : `${toBanglaDigits(c.amount_bdt, lang)} ৳`}
                                    </strong>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">
                                {t('এককালীন সরকারি ফি', 'Lump sum statutory fee')}
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="align-top py-3.5 text-right">
                            <span className="text-[11px] font-semibold text-slate-700 block">
                              {lang === 'bn' ? f.authority_name_bn : f.authority_name_en}
                            </span>
                            {f.circular_no && (
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {f.circular_no}
                              </span>
                            )}
                            {f.source_url && (
                              <a
                                href={f.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-[#006A4E] font-bold hover:underline mt-1"
                              >
                                <span>{t('সরকারি পোর্টাল ↗', 'Official Portal ↗')}</span>
                              </a>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statutory Alert on Cashless Process */}
      <Alert variant="warning" className="border-amber-300 bg-amber-50 text-amber-900 rounded-2xl p-4">
        <AlertTriangle className="size-5 text-amber-700" />
        <div className="flex flex-col gap-1">
          <AlertTitle className="text-sm font-extrabold text-amber-950">
            {t('বাধ্যতামূলক সতর্কতা ও সচেতনতা (Anti-Corruption & Cashless Policy):', 'Mandatory Anti-Corruption & Cashless Notice:')}
          </AlertTitle>
          <AlertDescription className="text-xs leading-relaxed text-amber-800">
            {t(
              'ভূমি সুরক্ষা প্ল্যাটফর্মে কোনো প্রকার নগদ টাকা বা মধ্যস্বত্বভোগী ফি গ্রহণ করা হয় না। সকল আবেদন ফি, কোর্ট ফি ও ডিসিআর ফি সরাসরি সরকারি পোর্টালে (eporcha.gov.bd, mutation.land.gov.bd) সরকারি ট্রেজারি চালানের মাধ্যমে পরিশোধযোগ্য। কাউকে নগদ টাকা দিয়ে প্রতারিত হবেন না।',
              'BhumiShield never collects cash or intermediary fees. All application fees, court fees, and DCR charges must be paid directly on official government portals via treasury chalans. Never pay cash to middlemen.'
            )}
          </AlertDescription>
        </div>
      </Alert>
    </div>
  );
};
