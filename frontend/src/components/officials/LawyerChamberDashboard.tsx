import React from 'react';
import {
  Scale,
  Gavel,
  ShieldAlert,
  Calendar,
  Clock,
  UserCheck,
  AlertTriangle,
  FileText,
  Search,
  ArrowRight,
  Plus,
  ShieldCheck,
  Building,
  CheckCircle2,
  FileCheck2,
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

interface LawyerChamberDashboardProps {
  onNavigateTab: (tab: string) => void;
  barCouncilNo?: string;
}

const CASE_CHART_DATA = [
  { month: 'অক্টোবর', monthEn: 'Oct', suits: 6, injunctions: 4, settled: 2 },
  { month: 'নভেম্বর', monthEn: 'Nov', suits: 8, injunctions: 6, settled: 3 },
  { month: 'ডিসেম্বর', monthEn: 'Dec', suits: 11, injunctions: 9, settled: 4 },
  { month: 'জানুয়ারি', monthEn: 'Jan', suits: 9, injunctions: 7, settled: 5 },
  { month: 'ফেব্রুয়ারি', monthEn: 'Feb', suits: 14, injunctions: 11, settled: 6 },
  { month: 'মার্চ', monthEn: 'Mar', suits: 18, injunctions: 15, settled: 8 },
];

const RECENT_DOCKETS = [
  {
    id: 'CS-2026-45',
    suitNo: 'দেওয়ানি মোকদ্দমা নং ৪৫/২০২৬',
    suitNoEn: 'Civil Suit No. 45/2026',
    courtName: 'বিজ্ঞ সিনিয়র সহকারী জজ আদালত, সাভার, ঢাকা',
    courtNameEn: 'Sr. Assistant Judge Court, Savar, Dhaka',
    mouza: 'বিরুলিয়া (JL-১২)',
    plotNo: '১০১',
    khatianNo: '৪১০১',
    partiesBn: 'মো. রফিকুল ইসলাম বনাম হাজী তোফাজ্জল হোসেন গং',
    partiesEn: 'Md. Rafiqul Islam vs Haji Tofazzal Hossain & Ors',
    disputeType: 'INJUNCTION',
    stage: 'STATUS_QUO_ISSUED',
    stageBn: 'অস্থায়ী স্থিতাবস্থা বলবৎ',
    stageEn: 'Status Quo Active',
    nextHearing: '১২ মার্চ ২০২৬',
    nextHearingEn: '12 Mar 2026',
  },
  {
    id: 'CS-2026-38',
    suitNo: 'দেওয়ানি মোকদ্দমা নং ৩৮/২০২৬',
    suitNoEn: 'Civil Suit No. 38/2026',
    courtName: 'বিজ্ঞ যুগ্ন জেলা জজ ১ম আদালত, ঢাকা',
    courtNameEn: 'Joint District Judge 1st Court, Dhaka',
    mouza: 'বিরুলিয়া (JL-১২)',
    plotNo: '১০৪',
    khatianNo: '৪৩৫০',
    partiesBn: 'হালিমা খাতুন বনাম আবদুর রহিম গং',
    partiesEn: 'Halima Khatun vs Abdur Rahim & Ors',
    disputeType: 'PARTITION',
    stage: 'SUMMONS_ISSUED',
    stageBn: 'সমনের জবাব দাখিলের দিন ধার্য',
    stageEn: 'Summons Issued',
    nextHearing: '১৮ মার্চ ২০২৬',
    nextHearingEn: '18 Mar 2026',
  },
  {
    id: 'LST-2026-12',
    suitNo: 'ল্যান্ড সার্ভে আপিল নং ১২/২০২৬',
    suitNoEn: 'Land Survey Appeal 12/2026',
    courtName: 'ভূমি জরিপ ট্রাইব্যুনাল (LST), ঢাকা',
    courtNameEn: 'Land Survey Tribunal, Dhaka',
    mouza: 'আশুলিয়া (JL-০৭)',
    plotNo: '২৮৯',
    khatianNo: '৮৯২',
    partiesBn: 'সোহেল রানা বনাম গণপ্রজাতন্ত্রী বাংলাদেশ সরকার',
    partiesEn: 'Sohel Rana vs Govt of Bangladesh',
    disputeType: 'RECORD_CORRECTION',
    stage: 'HEARING_SCHEDULED',
    stageBn: 'চূড়ান্ত যুক্তিতর্ক শুনানি',
    stageEn: 'Final Arguments',
    nextHearing: '০৫ এপ্রিল ২০২৬',
    nextHearingEn: '05 Apr 2026',
  },
  {
    id: 'CS-2026-21',
    suitNo: 'দেওয়ানি মোকদ্দমা নং ২১/২০২৬',
    suitNoEn: 'Civil Suit No. 21/2026',
    courtName: 'বিজ্ঞ সিনিয়র সহকারী জজ আদালত, সাভার, ঢাকা',
    courtNameEn: 'Sr. Assistant Judge Court, Savar, Dhaka',
    mouza: 'বিরুলিয়া (JL-১২)',
    plotNo: '১১০',
    khatianNo: '৪২০০',
    partiesBn: 'আমেনা বেগম বনাম অগ্রণী ব্যাংক লি.',
    partiesEn: 'Amena Begum vs Agrani Bank Ltd',
    disputeType: 'TITLE_DECLARATION',
    stage: 'AD_INTERIM_STAY',
    stageBn: 'অন্তর্বর্তীকালীন স্থগিতাদেশ',
    stageEn: 'Ad-interim Injunction',
    nextHearing: '২২ মার্চ ২০২৬',
    nextHearingEn: '22 Mar 2026',
  },
];

export const LawyerChamberDashboard: React.FC<LawyerChamberDashboardProps> = ({
  onNavigateTab,
  barCouncilNo = 'BC-DH-14285',
}) => {
  const { lang, t, user } = useAppUI();

  const chartConfig = {
    suits: {
      label: lang === 'bn' ? 'দায়েরকৃত মোকদ্দমা' : 'Suits Filed',
      color: '#006A4E',
    },
    injunctions: {
      label: lang === 'bn' ? 'নিষেধাজ্ঞা কার্যকর' : 'Injunctions Active',
      color: '#e11d48',
    },
  };

  return (
    <div className="space-y-6">
      {/* 1. Executive Top Header */}
      <Card className="border border-slate-200/90 shadow-xs bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[11px] px-3 py-0.5 rounded-full shadow-sm flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                <span>{t('বার কাউন্সিল সনদপ্রাপ্ত', 'Bar Council Certified')}</span>
              </Badge>
              <Badge variant="outline" className="border-indigo-400/40 text-indigo-200 text-[10px] font-mono">
                {barCouncilNo}
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Scale className="w-6 h-6 text-emerald-400" />
              <span>{t('আইনজীবী চেম্বার ড্যাশবোর্ড', 'Legal Chamber Dashboard')}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {t(
                'দেওয়ানি মোকদ্দমা, আদালত নিষেধাজ্ঞা ও জমির লিটিগেশন লক ব্যবস্থাপনা।',
                'Civil suits, court injunctions, and land litigation locks.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('step2')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold h-9 px-3.5 rounded-xl cursor-pointer shadow-sm"
            >
              <Search className="w-4 h-4 mr-1 text-emerald-300" />
              <span>{t('নালিশি জমি তল্লাশি', 'Search Disputed Plot')}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onNavigateTab('step1')}
              className="bg-[#006A4E] hover:bg-emerald-700 text-white font-black text-xs h-9 px-4 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t('নতুন আরজি দাখিল', 'File New Suit')}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. 4 Prominent Bento KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Suits */}
        <Card className="rounded-2xl p-4 bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold text-slate-700">{t('চলমান মোকদ্দমা', 'Active Suits')}</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Scale className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
              {toBanglaDigits('18', lang)} <span className="text-xs font-bold text-slate-500 font-sans">{t('টি', 'cases')}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              {t('১২টি ইনজাংশন • ৪টি বাটোয়ারা • ২টি স্বত্ব', '12 Injunction • 4 Partition • 2 Title')}
            </div>
          </div>
          <div className="text-[11px] font-bold text-indigo-700 mt-3 flex items-center gap-1">
            <span>{t('আদালত রেকর্ড সিঙ্কড', 'Records Synced')}</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </Card>

        {/* Card 2: Restrained Plots */}
        <Card className="rounded-2xl p-4 bg-white border border-rose-100 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold text-slate-700">{t('স্থগিতাদেশ দাগ', 'Injunction Plots')}</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-rose-700 tracking-tight font-mono">
              {toBanglaDigits('11', lang)} <span className="text-xs font-bold text-slate-500 font-sans">{t('টি দাগ', 'plots')}</span>
            </div>
            <div className="text-[11px] text-rose-600 font-medium mt-1">
              {t('১০০% বিক্রয় ও নামজারি সম্পূর্ণ ব্লক', '100% Transfer & Mutation Blocked')}
            </div>
          </div>
          <div className="text-[11px] font-bold text-rose-700 mt-3 flex items-center gap-1">
            <span>{t('বিক্রয় ও নামজারি ব্লক', 'Transfer Blocked')}</span>
            <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
          </div>
        </Card>

        {/* Card 3: Upcoming Hearings */}
        <Card className="rounded-2xl p-4 bg-white border border-amber-100 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold text-slate-700">{t('আসন্ন শুনানি', 'Upcoming Hearings')}</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-amber-900 tracking-tight font-mono">
              {toBanglaDigits('5', lang)} <span className="text-xs font-bold text-slate-500 font-sans">{t('টি এ সপ্তাহে', 'this week')}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              {t('পরবর্তী শুনানি: ১২ মার্চ ২০২৬', 'Next Hearing: 12 Mar 2026')}
            </div>
          </div>
          <div className="text-[11px] font-bold text-amber-700 mt-3 flex items-center gap-1">
            <span>{t('শুনানি ক্যালেন্ডার', 'Hearing Calendar')}</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </Card>

        {/* Card 4: Legal Intercept Rate */}
        <Card className="rounded-2xl p-4 bg-white border border-emerald-100 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold text-slate-700">{t('জালিয়াতি প্রতিরোধ', 'Fraud Intercept')}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Gavel className="w-4 h-4 text-[#006A4E]" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-[#006A4E] tracking-tight font-mono">
              {toBanglaDigits('98.4%', lang)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              {t('সাব-রেজিস্ট্রি গেটকিপারে তাৎক্ষণিক ব্লক', 'Instant Block at Sub-Registry')}
            </div>
          </div>
          <div className="text-[11px] font-bold text-[#006A4E] mt-3 flex items-center gap-1">
            <span>{t('১০০% নিরাপদ', '100% Protected')}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
        </Card>
      </div>

      {/* 3. Area Chart & Legal Protection Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Injunction Trends Area Chart */}
        <Card className="lg:col-span-2 rounded-2xl border border-slate-200/90 shadow-2xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-black text-slate-900">
                  {t('মাসিক দেওয়ানি মোকদ্দমা ও নিষেধাজ্ঞা প্রবৃত্তি', 'Monthly Suits & Injunction Trends')}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {t('দায়েরকৃত মোকদ্দমা বনাম জাতীয় লেজারে সক্রিয় নিষেধাজ্ঞার পরিসংখ্যান', 'Litigation filings vs active stay orders enforced on ledger')}
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
                <AreaChart data={CASE_CHART_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillSuits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#006A4E" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#006A4E" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="fillInjunctions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e11d48" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
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
                    dataKey="suits"
                    stroke="#006A4E"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#fillSuits)"
                  />
                  <Area
                    type="monotone"
                    dataKey="injunctions"
                    stroke="#e11d48"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#fillInjunctions)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
          <CardFooter className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#006A4E]" />
                <span className="font-medium text-slate-700">{t('দায়েরকৃত মোকদ্দমা', 'Suits Filed')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-600" />
                <span className="font-medium text-slate-700">{t('সক্রিয় নিষেধাজ্ঞা (Status Quo)', 'Active Injunctions')}</span>
              </div>
            </div>
            <span className="font-mono text-slate-400">BhumiShield Legal API</span>
          </CardFooter>
        </Card>

        {/* Right 1 Col: Quick Action Protocol Card */}
        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between bg-slate-50/50">
          <CardHeader className="pb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-2">
              <Gavel className="w-5 h-5 text-indigo-800" />
            </div>
            <CardTitle className="text-base font-black text-slate-900">
              {t('৩-ধাপের আইনি আরজি ও নিষেধাজ্ঞা ওয়ার্কফ্লো', '3-Step Legal Injunction Workflow')}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {t('নালিশি দাগে আদালতের নোটিশ জারির সাথে সাথে সিস্টেমে বিক্রয় ব্লক নিশ্চিতকরণ।', 'Instantly freeze plot sale & mutation via digital court docket.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center gap-2.5 shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 text-[#006A4E] font-black text-xs flex items-center justify-center shrink-0">
                ১
              </div>
              <div>
                <p className="font-bold text-slate-800">{t('বার সনদ ও পরিচয় যাচাই', 'Bar License Verification')}</p>
                <p className="text-[10px] text-slate-500">{t('বার কাউন্সিল ও জাতীয় পরিচয়পত্র সরাসরি ম্যাচ', 'Bar Council & NID authenticated')}</p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center gap-2.5 shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0">
                ২
              </div>
              <div>
                <p className="font-bold text-slate-800">{t('নালিশি খতিয়ান ও দাগ তল্লাশি', 'Disputed Plot Lineage')}</p>
                <p className="text-[10px] text-slate-500">{t('সিএস, এসএ, আরএস, বিএস মালিকানা নিরীক্ষা', 'Cross-examine historic ownership chain')}</p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center gap-2.5 shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 font-black text-xs flex items-center justify-center shrink-0">
                ৩
              </div>
              <div>
                <p className="font-bold text-slate-800">{t('ডিজিটাল আরজি ও নোটিশ ইস্যু', 'Issue Digital Plaint & Caveat')}</p>
                <p className="text-[10px] text-slate-500">{t('সাব-রেজিস্ট্রি ও এসি ল্যান্ড কোর্টে ব্লক নোটিশ প্রেরণ', 'Dispatch freeze notice to Registry & AC Land')}</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button
              type="button"
              onClick={() => onNavigateTab('step1')}
              className="w-full bg-[#006A4E] hover:bg-emerald-800 text-white font-bold text-xs h-9 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>{t('ওয়ার্কফ্লো শুরু করুন →', 'Start Filing Wizard →')}</span>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* 4. Active Case Docket Table (shadcn Table) */}
      <Card className="rounded-2xl border border-slate-200/90 shadow-2xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#006A4E]" />
              <span>{t('চলমান দেওয়ানি মামলা ও আদালতের আদেশনামা ডকেট', 'Active Court Dockets & Injunction Orders')}</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {t('বিজ্ঞ আদালত কর্তৃক জারিকৃত নিষেধাজ্ঞা ও স্থগিতাদেশপ্রাপ্ত নালিশি জমির তালিকা', 'Plots with active status quo and hearing schedules issued by civil courts')}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onNavigateTab('step2')}
            className="text-xs font-bold h-8 rounded-lg"
          >
            {t('সকল রেকর্ড দেখুন', 'View All Records')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-slate-200/80 overflow-auto max-h-[320px] scrollbar-thin">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="font-bold text-slate-700 text-xs">{t('মোকদ্দমা নম্বর ও আদালত', 'Suit No & Court')}</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">{t('নালিশি জমি ও খতিয়ান', 'Disputed Plot & Khatian')}</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">{t('পক্ষসমূহ (বাদী বনাম বিবাদী)', 'Litigant Parties')}</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">{t('আদালতের আদেশ / স্ট্যাটাস', 'Court Order Status')}</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">{t('পরবর্তী শুনানি', 'Next Hearing')}</TableHead>
                  <TableHead className="text-right font-bold text-slate-700 text-xs">{t('পদক্ষেপ', 'Action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RECENT_DOCKETS.map((docket) => (
                  <TableRow key={docket.id} className="hover:bg-slate-50/60 transition">
                    <TableCell className="font-medium text-xs">
                      <div className="font-bold text-slate-900">{lang === 'bn' ? docket.suitNo : docket.suitNoEn}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3 text-slate-400" />
                        <span>{lang === 'bn' ? docket.courtName : docket.courtNameEn}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      <div className="font-bold text-slate-800">
                        {docket.mouza} • {t('দাগ', 'Plot')}: {toBanglaDigits(docket.plotNo, lang)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {t('খতিয়ান নং', 'Khatian No')}: {toBanglaDigits(docket.khatianNo, lang)}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate text-slate-700 font-medium">
                      {lang === 'bn' ? docket.partiesBn : docket.partiesEn}
                    </TableCell>
                    <TableCell>
                      {docket.disputeType === 'INJUNCTION' ? (
                        <Badge variant="destructive" className="text-[10px] font-bold py-0.5 px-2">
                          🛡️ {lang === 'bn' ? docket.stageBn : docket.stageEn}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold py-0.5 px-2 text-indigo-700 border-indigo-200 bg-indigo-50">
                          ⚖️ {lang === 'bn' ? docket.stageBn : docket.stageEn}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-600">
                      <div className="flex items-center gap-1 font-bold text-slate-800">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>{lang === 'bn' ? docket.nextHearing : docket.nextHearingEn}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigateTab('step3')}
                        className="text-xs font-bold text-[#006A4E] hover:bg-emerald-50 h-8 px-2.5 cursor-pointer"
                      >
                        <span>{t('আরজি দেখুন', 'View Plaint')}</span>
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
