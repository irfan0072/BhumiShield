import React from 'react';
import {
  Building2,
  Building,
  Coins,
  FileCheck2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Calendar,
  CheckCircle2,
  Search,
  Plus,
  ArrowRight,
  FileText,
  Layers,
  Scale,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { toBanglaDigits } from '@/theme/tokens';
import { useAppUI } from '@/i18n';

interface SpecialistAcquisitionDashboardProps {
  onNavigateTab: (tab: string) => void;
}

const LA_CHART_DATA = [
  { month: 'অক্টোবর', monthEn: 'Oct', allocated: 25, disbursed: 18 },
  { month: 'নভেম্বর', monthEn: 'Nov', allocated: 35, disbursed: 28 },
  { month: 'ডিসেম্বর', monthEn: 'Dec', allocated: 55, disbursed: 44 },
  { month: 'জানুয়ারি', monthEn: 'Jan', allocated: 45, disbursed: 39 },
  { month: 'ফেব্রুয়ারি', monthEn: 'Feb', allocated: 65, disbursed: 58 },
  { month: 'মার্চ', monthEn: 'Mar', allocated: 80, disbursed: 72 },
];

const ACTIVE_LA_PROJECTS = [
  {
    id: 'LA-2025-08',
    caseNo: 'এল.এ কেস নং ০৮/২০২৫-২৬',
    caseNoEn: 'LA Case No. 08/2025-26',
    projectName: 'ঢাকা-আশুলিয়া এলিভেটেড এক্সপ্রেসওয়ে সংযোগ প্রকল্প',
    projectNameEn: 'Dhaka-Ashulia Elevated Expressway Link',
    mouzas: 'বিরুলিয়া, আশুলিয়া ও কাউন্দিয়া',
    mouzasEn: 'Birulia, Ashulia & Kaundia',
    acreage: '২৮.৫০ একর',
    acreageEn: '28.50 Acres',
    budgetBdt: '৳ ৪৮.৫০ কোটি',
    budgetBdtEn: 'BDT 48.50 Cr',
    stage: 'SECTION_7_AWARD',
    stageBn: '৭ ধারা — চূড়ান্ত রোয়েদাদ প্রস্তুত',
    stageEn: 'Section 7 - Final Award',
    statusVariant: 'success',
  },
  {
    id: 'LA-2025-14',
    caseNo: 'এল.এ কেস নং ১৪/২০২৫-২৬',
    caseNoEn: 'LA Case No. 14/2025-26',
    projectName: 'এমআরটি লাইন-৫ (উত্তর) সাভার ডিপো সম্প্রসারণ',
    projectNameEn: 'MRT Line-5 (North) Savar Depot Expansion',
    mouzas: 'বিরুলিয়া মৌজা (দাগ নং ৪১০-৪৬৫)',
    mouzasEn: 'Birulia Mouza (Plots 410-465)',
    acreage: '৪২.০০ একর',
    acreageEn: '42.00 Acres',
    budgetBdt: '৳ ৬২.০০ কোটি',
    budgetBdtEn: 'BDT 62.00 Cr',
    stage: 'SECTION_4_NOTICE',
    stageBn: '৪ ধারা — প্রাথমিক যৌথ সীমানা পরিমাপ',
    stageEn: 'Section 4 - Joint Survey',
    statusVariant: 'warning',
  },
  {
    id: 'LA-2026-02',
    caseNo: 'এল.এ কেস নং ০২/২০২৬',
    caseNoEn: 'LA Case No. 02/2026',
    projectName: 'তুরাগ নদী পুনরুজ্জীবন ও ইকোপার্ক বাফার জোন',
    projectNameEn: 'Turag River Ecological Buffer Corridor',
    mouzas: 'বিরুলিয়া ও সাভার পৌরসভা',
    mouzasEn: 'Birulia & Savar Municipality',
    acreage: '১৫.২০ একর',
    acreageEn: '15.20 Acres',
    budgetBdt: '৳ ২২.৮০ কোটি',
    budgetBdtEn: 'BDT 22.80 Cr',
    stage: 'HEARING_OBJECTIONS',
    stageBn: 'ধারা ৪(১) আপত্তি শুনানি চলমান',
    stageEn: 'Sec 4(1) Public Hearing',
    statusVariant: 'secondary',
  },
  {
    id: 'LA-2025-33',
    caseNo: 'এল.এ কেস নং ৩৩/২০২৫-২৬',
    caseNoEn: 'LA Case No. 33/2025-26',
    projectName: 'গ্যাস সঞ্চালন পাইপলাইন রাইট-অফ-ওয়ে (ROW)',
    projectNameEn: 'Gas Transmission Pipeline ROW',
    mouzas: 'আশুলিয়া ও ধামরাই সীমান্ত',
    mouzasEn: 'Ashulia & Dhamrai Border',
    acreage: '০৮.৪০ একর',
    acreageEn: '8.40 Acres',
    budgetBdt: '৳ ১২.৩০ কোটি',
    budgetBdtEn: 'BDT 12.30 Cr',
    stage: 'DISBURSEMENT_READY',
    stageBn: '৮ ধারা — ক্ষতিগ্রস্তদের চেক প্রদান শুরু',
    stageEn: 'Section 8 - Direct Payout',
    statusVariant: 'default',
  },
];

export const SpecialistAcquisitionDashboard: React.FC<SpecialistAcquisitionDashboardProps> = ({
  onNavigateTab,
}) => {
  const { lang, t, user } = useAppUI();

  const chartConfig = {
    allocated: {
      label: lang === 'bn' ? 'বরাদ্দকৃত তহবিল (কোটি টাকা)' : 'Allocated Fund (Cr BDT)',
      color: '#3b82f6',
    },
    disbursed: {
      label: lang === 'bn' ? 'বিতরণকৃত ক্ষতিপূরণ (কোটি টাকা)' : 'Disbursed (Cr BDT)',
      color: '#006A4E',
    },
  };

  return (
    <div className="space-y-6">
      {/* 1. Executive Top Header */}
      <Card className="border border-slate-200/90 shadow-xs bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[11px] px-3 py-0.5 rounded-full shadow-sm flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>{t('ভূমি অধিগ্রহণ সেল', 'Land Acquisition Cell')}</span>
              </Badge>
              <Badge variant="outline" className="border-teal-400/40 text-teal-200 text-[10px]">
                {t('জেলা প্রশাসন • এল.এ শাখা', 'DC Office • LA Branch')}
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Building className="w-6 h-6 text-teal-400" />
              <span>{t('ভূমি অধিগ্রহণ ও ক্ষতিপূরণ ড্যাশবোর্ড', 'Land Acquisition Dashboard')}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {t(
                'অবকাঠামো প্রকল্পের জমি অধিগ্রহণ, গেজেট ও ক্ষতিপূরণ ব্যবস্থাপনা।',
                'Infrastructure land acquisition, gazettes, and compensation management.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('title_scrutiny')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold h-9 px-3.5 rounded-xl cursor-pointer shadow-sm"
            >
              <FileCheck2 className="w-4 h-4 mr-1 text-teal-300" />
              <span>{t('টাইটেল যাচাই', 'Title Scrutiny')}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onNavigateTab('la_cases')}
              className="bg-[#006A4E] hover:bg-emerald-700 text-white font-black text-xs h-9 px-4 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t('নতুন কেস তালিকা', 'LA Cases')}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. 4 Prominent Bento KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Projects */}
        <Card className="rounded-2xl p-4 bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold text-slate-700">{t('চলমান প্রকল্প', 'Active Projects')}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
              {toBanglaDigits('6', lang)} <span className="text-xs font-bold text-slate-500 font-sans">{t('টি মেগা প্রকল্প', 'mega projects')}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              {t('এক্সপ্রেসওয়ে, মেট্রোরেল, গ্যাস করিডোর', 'Expressway, MRT, Gas Corridor')}
            </div>
          </div>
          <div className="text-[11px] font-bold text-blue-700 mt-3 flex items-center gap-1">
            <span>{t('যৌথ জরিপ হালনাগাদ', 'Joint Survey Synced')}</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </Card>

        {/* Card 2: Total Acreage */}
        <Card className="rounded-2xl p-4 bg-white border border-teal-100 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold text-slate-700">{t('মোট অধিগ্রহণ', 'Total Land Acquired')}</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Layers className="w-4 h-4 text-teal-600" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-teal-900 tracking-tight font-mono">
              {toBanglaDigits('142.5', lang)} <span className="text-xs font-bold text-slate-500 font-sans">{t('একর', 'acres')}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              {toBanglaDigits('14,250', lang)} {t('শতাংশ • ১৮২টি পৃথক দাগ', 'decimals • 182 plots')}
            </div>
          </div>
          <div className="text-[11px] font-bold text-teal-700 mt-3 flex items-center gap-1">
            <span>{t('বাউন্ডারি চিহ্নিত', 'Boundary Allocated')}</span>
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          </div>
        </Card>

        {/* Card 3: Disbursed Funds */}
        <Card className="rounded-2xl p-4 bg-white border border-emerald-100 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold text-slate-700">{t('বিতরণকৃত ক্ষতিপূরণ', 'Disbursed Compensation')}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#006A4E] flex items-center justify-center">
              <Coins className="w-4 h-4 text-[#006A4E]" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-[#006A4E] tracking-tight font-mono">
              ৳ {toBanglaDigits('124.80', lang)} <span className="text-xs font-bold text-slate-500 font-sans">{t('কোটি', 'Cr')}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              {t('মোট অনুমোদিত তহবিলের ৮৩.৫%', '83.5% of total BDT 149.5 Cr')}
            </div>
          </div>
          <div className="text-[11px] font-bold text-[#006A4E] mt-3 flex items-center gap-1">
            <span>{t('ব্যাংক অ্যাকাউন্টে প্রদান', 'Direct Bank Transfer')}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
        </Card>

        {/* Card 4: Title Scrutiny Queue */}
        <Card className="rounded-2xl p-4 bg-white border border-amber-100 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold text-slate-700">{t('টাইটেল স্ক্রুটিনি', 'Title Scrutiny')}</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Scale className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-amber-900 tracking-tight font-mono">
              {toBanglaDigits('23', lang)} <span className="text-xs font-bold text-slate-500 font-sans">{t('টি নথি', 'dockets')}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              {t('স্বত্ব ও ওয়ারিশান যাচাই পর্যালোচনায়', 'Heirship & title chain review')}
            </div>
          </div>
          <div className="text-[11px] font-bold text-amber-700 mt-3 flex items-center gap-1">
            <span>{t('শুনানি ক্যালেন্ডার', 'Hearing Calendar')}</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </Card>
      </div>

      {/* 3. Area Chart & Mega Project Compensation Protocol */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Allocation vs Payout Area Chart */}
        <Card className="lg:col-span-2 rounded-2xl border border-slate-200/90 shadow-2xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-black text-slate-900">
                  {t('ক্ষতিপূরণ তহবিল বরাদ্দ ও বিতরণ', 'Fund Allocation & Disbursement')}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {t('অনুমোদিত অর্থ বনাম হস্তান্তরিত ক্ষতিপূরণ', 'Approved allocation vs verified payouts')}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono bg-slate-50">
                {t('২০২৫-২০২৬', '2025-2026')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={LA_CHART_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillAllocated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="fillDisbursed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#006A4E" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#006A4E" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey={lang === 'bn' ? 'month' : 'monthEn'}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                  />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                  <Area
                    type="monotone"
                    dataKey="allocated"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#fillAllocated)"
                  />
                  <Area
                    type="monotone"
                    dataKey="disbursed"
                    stroke="#006A4E"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#fillDisbursed)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
          <CardFooter className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="font-medium text-slate-700">{t('অনুমোদিত বাজেট', 'Allocated Budget')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#006A4E]" />
                <span className="font-medium text-slate-700">{t('বিতরণকৃত ক্ষতিপূরণ', 'Disbursed Payout')}</span>
              </div>
            </div>
            <span className="font-mono text-slate-400">DC LA Fund Ledger</span>
          </CardFooter>
        </Card>

        {/* Right 1 Col: Section Protocol Roadmap */}
        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between bg-slate-50/50">
          <CardHeader className="pb-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center mb-2">
              <Building2 className="w-5 h-5 text-teal-900" />
            </div>
            <CardTitle className="text-base font-black text-slate-900">
              {t('স্থাবর সম্পত্তি অধিগ্রহণ ও হুকুমদখল আইন ২০১৭', 'Acquisition & Requisition Act 2017')}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {t('বিধি মোতাবেক সরকারি নোটিশ ও ক্ষতিপূরণ বিতরণ পর্যায়ক্রম', 'Statutory notice, hearing & award payout protocol')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center gap-2.5 shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center shrink-0">
                ৪
              </div>
              <div>
                <p className="font-bold text-slate-800">{t('ধারা ৪(১) প্রাথমিক নোটিশ ও সীমানা', 'Section 4(1) Preliminary Notice')}</p>
                <p className="text-[10px] text-slate-500">{t('জমির যৌথ পরিমাপ ও ভিডিও স্থিরচিত্র ধারণ', 'Joint inventory & videography of assets')}</p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center gap-2.5 shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shrink-0">
                ৭
              </div>
              <div>
                <p className="font-bold text-slate-800">{t('ধারা ৭ রোয়েদাদ ও ক্ষতিপূরণ নির্ধারণ', 'Section 7 Award Assessment')}</p>
                <p className="text-[10px] text-slate-500">{t('সরকারি বাজারমূল্যের ২০০% বা ৩০০% ক্ষতিপূরণ গণনা', '200%-300% statutory compensation formula')}</p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center gap-2.5 shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 text-[#006A4E] font-black text-xs flex items-center justify-center shrink-0">
                ৮
              </div>
              <div>
                <p className="font-bold text-slate-800">{t('ধারা ৮ সরাসরি ক্ষতিপূরণ চেক বিতরণ', 'Section 8 Final Payout')}</p>
                <p className="text-[10px] text-slate-500">{t('স্বত্ব প্রমাণিত হলে তাৎক্ষণিক ব্যাংক অ্যাকাউন্টে জমা', 'Direct deposit upon ownership verification')}</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button
              type="button"
              onClick={() => onNavigateTab('la_cases')}
              className="w-full bg-[#006A4E] hover:bg-emerald-800 text-white font-bold text-xs h-9 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>{t('কেস ওয়ার্কস্পেসে যান →', 'Go to Case Workspace →')}</span>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* 4. Active Mega Projects & Gazette Registry (shadcn Table) */}
      <Card className="rounded-2xl border border-slate-200/90 shadow-2xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#006A4E]" />
              <span>{t('চলমান মেগা প্রকল্প ও ভূমি অধিগ্রহণ গেজেট রেজিস্ট্রি', 'Active Mega Projects & Gazette Registry')}</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {t('প্রকল্পভিত্তিক মৌজা, অধিগ্রহণকৃত জমির পরিমাণ ও ক্ষতিপূরণ বিতরণের অগ্রগতি', 'Mouza-wise affected acreage and compensation award status')}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onNavigateTab('la_cases')}
            className="text-xs font-bold h-8 rounded-lg"
          >
            {t('সম্পূর্ণ প্রকল্প ডাটাবেজ', 'Full Project Database')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-slate-200/80 overflow-auto max-h-[320px] scrollbar-thin">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="font-bold text-slate-700 text-xs">{t('কেস নম্বর ও প্রকল্প নাম', 'Case No & Project Name')}</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">{t('আক্রান্ত মৌজা ও সীমানা', 'Affected Mouzas & Plots')}</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">{t('জমির পরিমাণ', 'Acreage')}</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">{t('অনুমোদিত ক্ষতিপূরণ বাজেট', 'Approved Budget')}</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">{t('বর্তমান পর্যায় / নোটিশ', 'Current Stage / Notice')}</TableHead>
                  <TableHead className="text-right font-bold text-slate-700 text-xs">{t('পদক্ষেপ', 'Action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ACTIVE_LA_PROJECTS.map((proj) => (
                  <TableRow key={proj.id} className="hover:bg-slate-50/60 transition">
                    <TableCell className="font-medium text-xs">
                      <div className="font-bold text-slate-900">{lang === 'bn' ? proj.projectName : proj.projectNameEn}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{lang === 'bn' ? proj.caseNo : proj.caseNoEn}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 font-medium">
                      <div className="flex items-center gap-1 text-slate-800">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{lang === 'bn' ? proj.mouzas : proj.mouzasEn}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono font-bold text-teal-800">
                      {lang === 'bn' ? proj.acreage : proj.acreageEn}
                    </TableCell>
                    <TableCell className="text-xs font-mono font-bold text-emerald-800">
                      {lang === 'bn' ? proj.budgetBdt : proj.budgetBdtEn}
                    </TableCell>
                    <TableCell>
                      {proj.statusVariant === 'success' ? (
                        <Badge variant="outline" className="text-[10px] font-bold py-0.5 px-2 bg-emerald-50 text-emerald-800 border-emerald-300">
                          ✓ {lang === 'bn' ? proj.stageBn : proj.stageEn}
                        </Badge>
                      ) : proj.statusVariant === 'warning' ? (
                        <Badge variant="outline" className="text-[10px] font-bold py-0.5 px-2 bg-amber-50 text-amber-800 border-amber-300">
                          ⏳ {lang === 'bn' ? proj.stageBn : proj.stageEn}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold py-0.5 px-2 bg-blue-50 text-blue-800 border-blue-300">
                          🏛️ {lang === 'bn' ? proj.stageBn : proj.stageEn}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigateTab('title_scrutiny')}
                        className="text-xs font-bold text-[#006A4E] hover:bg-emerald-50 h-8 px-2.5 cursor-pointer"
                      >
                        <span>{t('স্ক্রুটিনি', 'Scrutiny')}</span>
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
