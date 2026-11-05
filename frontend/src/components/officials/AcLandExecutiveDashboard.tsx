import React from 'react';
import {
  Building2,
  Flame,
  Scale,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSearch,
  Compass,
  ArrowRight,
  TrendingUp,
  MapPin,
  Calendar,
  Layers,
  Search,
  ShieldCheck,
  UserCheck,
  User,
  Users,
  Eye,
  Gavel,
  ShieldAlert,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { toBanglaDigits } from '@/theme/tokens';
import { useAppUI, UserRole } from '@/i18n';

interface AcLandExecutiveDashboardProps {
  onNavigateTab: (tab: string) => void;
  mutations?: any[];
  disputes?: any[];
  stats?: any;
}

const MUTATION_FLOW_SERIES = [
  { week: 'সপ্তাহ ১', weekEn: 'W1', applied: 38, approved: 35, pending: 3 },
  { week: 'সপ্তাহ ২', weekEn: 'W2', applied: 44, approved: 42, pending: 2 },
  { week: 'সপ্তাহ ৩', weekEn: 'W3', applied: 52, approved: 49, pending: 3 },
  { week: 'সপ্তাহ ৪', weekEn: 'W4', applied: 61, approved: 58, pending: 3 },
];

export const AcLandExecutiveDashboard: React.FC<AcLandExecutiveDashboardProps> = ({
  onNavigateTab,
  mutations = [],
  disputes = [],
  stats,
}) => {
  const { lang, t, role, user } = useAppUI();

  // Role-specific KPI metrics and titles
  const getRoleMetrics = () => {
    switch (role) {
      case 'land_office_assistant':
        return {
          deptBn: 'ইউনিয়ন ভূমি সহকারী কার্যালয় • সাভার, ঢাকা',
          deptEn: 'Union Land Office • Savar, Dhaka',
          roleTitleBn: 'ইউনিয়ন ভূমি সহকারী কর্মকর্তা (তহশিলদার) ড্যাশবোর্ড',
          roleTitleEn: 'Union Land Assistant Officer (Tahsildar) Console',
          kpi1: { label: t('তহশিলদার প্রতিবেদন তলব', 'Pending Field Inquiries'), value: 14, icon: FileSearch, badge: '+২ নতুন', color: 'text-amber-600' },
          kpi2: { label: t('ভূমি উন্নয়ন কর দাখিলা আদায়', 'LD-Tax Collection'), value: '৳ ১,৯২,৪০০', icon: TrendingUp, badge: '১০০% ক্যাশলেস', color: 'text-emerald-600' },
          kpi3: { label: t('ওয়ারিশান খতিয়ান যাচাই', 'Heir Verification Docket'), value: 5, icon: Users, badge: 'অন-টাইম', color: 'text-blue-600' },
          kpi4: { label: t('রেকর্ড সংশোধন প্রস্তাব', 'Record Correction Proposals'), value: 3, icon: CheckCircle2, badge: 'প্রস্তাবিত', color: 'text-purple-600' },
        };
      case 'field_verification_officer':
        return {
          deptBn: 'উপজেলা ভূমি প্রশাসন • ফিল্ড সার্ভে ও কানুনগো উইং',
          deptEn: 'Upazila Land Administration • Surveyor & Kanungo Wing',
          roleTitleBn: 'সার্ভেয়ার ও কানুনগো ফিল্ড ড্যাশবোর্ড',
          roleTitleEn: 'Field Surveyor & Kanungo Inspection Console',
          kpi1: { label: t('সরেজমিন পরিদর্শন অপেক্ষমাণ', 'Pending Field Visits'), value: 8, icon: MapPin, badge: 'জিপিএস ম্যাপিং', color: 'text-amber-600' },
          kpi2: { label: t('খাস জমি দখল আপত্তি নিরীক্ষা', 'Khas Land Encroachment Checks'), value: 4, icon: ShieldAlert, badge: 'সংরক্ষিত', color: 'text-rose-600' },
          kpi3: { label: t('মৌজা সীমানা পরিমাপ প্রতিবেদন', 'Boundary Survey Reports'), value: 12, icon: Compass, badge: 'সম্পাদিত', color: 'text-emerald-600' },
          kpi4: { label: t('ফিল্ড এসএলএ সম্মতি হার', 'Survey SLA Compliance'), value: '৯৬.৫%', icon: CheckCircle2, badge: 'আদর্শ মান', color: 'text-blue-600' },
        };
      case 'uno_supervisor':
        return {
          deptBn: 'উপজেলা প্রশাসন',
          deptEn: 'Upazila Administration',
          roleTitleBn: 'ইউএনও ড্যাশবোর্ড',
          roleTitleEn: 'UNO Oversight Dashboard',
          kpi1: { label: t('নামজারি নিষ্পত্তি', 'Mutation SLA'), value: '৯৮.২%', icon: TrendingUp, badge: 'গ্রিন জোন', color: 'text-emerald-600' },
          kpi2: { label: t('দেরি হওয়া কেস', 'Overdue Cases (>28 Days)'), value: 0, icon: CheckCircle2, badge: 'জিরো ব্যাকলগ', color: 'text-emerald-700' },
          kpi3: { label: t('উদ্ধারকৃত জমি', 'Recovered Public Land'), value: '১২.৫ একর', icon: ShieldCheck, badge: 'দখলমুক্ত', color: 'text-blue-600' },
          kpi4: { label: t('নাগরিক সন্তুষ্টি', 'Citizen Satisfaction Score'), value: '৪.৯ / ৫', icon: Users, badge: 'উচ্চ সন্তুষ্টি', color: 'text-purple-600' },
        };
      case 'appellate_reviewer':
        return {
          deptBn: 'রাজস্ব আপিল শাখা',
          deptEn: 'Revenue Appeals Wing',
          roleTitleBn: 'রাজস্ব আপিল ড্যাশবোর্ড',
          roleTitleEn: 'ADC Revenue Appellate Console',
          kpi1: { label: t('চলমান আপিল', 'Active Revenue Appeals'), value: 11, icon: Scale, badge: 'চলমান', color: 'text-purple-600' },
          kpi2: { label: t('স্থগিতাদেশ বহাল', 'Active Stay Orders'), value: 3, icon: ShieldAlert, badge: 'হস্তান্তর বন্ধ', color: 'text-rose-600' },
          kpi3: { label: t('রিভিশন শুনানি', 'Mutation Revision Hearings'), value: 4, icon: Gavel, badge: 'এই সপ্তাহে', color: 'text-blue-600' },
          kpi4: { label: t('গড় নিষ্পত্তি', 'Average Appeal Disposal'), value: '১৪ দিন', icon: Clock, badge: 'দ্রুত নিষ্পত্তি', color: 'text-emerald-600' },
        };
      case 'settlement_records_officer':
      case 'settlement_checker':
        return {
          deptBn: 'সেটেলমেন্ট অফিস',
          deptEn: 'Settlement Office',
          roleTitleBn: 'জরিপ ও গেজেট ড্যাশবোর্ড',
          roleTitleEn: 'Settlement & Gazette Console',
          kpi1: { label: t('গেজেট খতিয়ান', 'Gazette Khatians Printed'), value: '২৮,৫০০', icon: Layers, badge: 'গেজেটভুক্ত', color: 'text-emerald-600' },
          kpi2: { label: t('৩০ ধারা আপত্তি', 'Sec 30 Objection Cases'), value: 18, icon: Gavel, badge: 'শুনানি', color: 'text-amber-600' },
          kpi3: { label: t('৩১ ধারা আপিল', 'Sec 31 Settlement Appeals'), value: 6, icon: Scale, badge: 'ডকেটভুক্ত', color: 'text-blue-600' },
          kpi4: { label: t('গেজেট হার', 'Record Finalization Rate'), value: '১০০%', icon: CheckCircle2, badge: 'সম্পূর্ণ', color: 'text-purple-600' },
        };
      default: // ac_land default
        return {
          deptBn: 'উপজেলা ভূমি অফিস',
          deptEn: 'Upazila Land Office',
          roleTitleBn: 'সহকারী কমিশনার (ভূমি) ড্যাশবোর্ড',
          roleTitleEn: 'AC Land Dashboard',
          kpi1: { label: t('চলমান নামজারি', 'Active Mutation Cases'), value: mutations.length > 0 ? mutations.length : 42, icon: Flame, badge: 'এসএলএ সচল', color: 'text-[#006A4E]' },
          kpi2: { label: t('ট্রাইব্যুনাল বিরোধ', 'Dispute Tribunal Cases'), value: disputes.length > 0 ? disputes.length : 9, icon: Gavel, badge: 'শুনানি প্রস্তুত', color: 'text-amber-600' },
          kpi3: { label: t('মিস কেস ও আপিল', 'Appeals & Misc Cases'), value: 6, icon: Scale, badge: 'এজলাস', color: 'text-blue-600' },
          kpi4: { label: t('গড় নিষ্পত্তি সময়', 'Average Disposal SLA'), value: '১২ কার্যদিবস', icon: Clock, badge: '২৮ দিনের মধ্যে', color: 'text-emerald-600' },
        };
    }
  };

  const rm = getRoleMetrics();

  const chartConfig = {
    applied: {
      label: lang === 'bn' ? 'দাখিলকৃত আবেদন' : 'Incoming Applications',
      color: 'hsl(215 90% 50%)',
    },
    approved: {
      label: lang === 'bn' ? 'অনুমোদিত ও নিষ্পত্তি' : 'Approved & Cleared',
      color: 'hsl(158 64% 42%)',
    },
  };

  return (
    <div className="space-y-6">
      {/* 1. Official Revenue Court Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#004d38] via-[#006A4E] to-slate-900 text-white p-6 sm:p-8 shadow-md border border-emerald-700/60 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-emerald-300 text-emerald-100 bg-emerald-950/60 font-semibold px-2.5 py-0.5">
              <Building2 className="w-3.5 h-3.5 mr-1" />
              {rm.deptBn}
            </Badge>
            <span className="text-xs text-emerald-200">•</span>
            <span className="text-xs text-emerald-300 font-mono font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              {t('সক্রিয় সেশন', 'Active')}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {rm.roleTitleBn}
          </h1>

          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-medium">
            {t(
              'ই-নামজারি, খতিয়ান অনুমোদন ও এসএলএ ট্র্যাকিং।',
              'e-Mutation, khatian approval, and SLA tracking.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            onClick={() => onNavigateTab('mutations')}
            className="bg-white hover:bg-emerald-50 text-[#006A4E] font-black text-xs h-10 px-4 rounded-xl shadow-sm cursor-pointer"
          >
            <Flame className="w-4 h-4 mr-1.5 text-amber-600" />
            <span>{t('নামজারি ট্র্যাকার', 'Mutation Tracker')}</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => onNavigateTab('disputes')}
            className="bg-emerald-900/60 hover:bg-emerald-900 text-white border-emerald-400/40 font-bold text-xs h-10 px-4 rounded-xl shadow-sm cursor-pointer"
          >
            <Gavel className="w-4 h-4 mr-1.5 text-emerald-300" />
            <span>{t('বিরোধ শুনানি', 'Hearings')}</span>
          </Button>
        </div>
      </div>

      {/* 2. Key Performance Metric Cards (shadcn/ui Card Blocks) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <Card className="relative overflow-hidden border border-border/80 shadow-xs bg-gradient-to-t from-primary/5 to-card hover:border-emerald-500/40 transition">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 min-w-0">
                <rm.kpi1.icon className={`size-4 ${rm.kpi1.color} shrink-0`} />
                <span className="truncate">{rm.kpi1.label}</span>
              </CardDescription>
              <Badge variant="outline" className="flex shrink-0 gap-1 text-[11px] font-mono border-emerald-300 text-emerald-800 bg-emerald-50/60">
                {rm.kpi1.badge}
              </Badge>
            </div>
            <CardTitle className="text-3xl font-black font-mono tracking-tight text-foreground mt-2">
              {typeof rm.kpi1.value === 'number' ? toBanglaDigits(rm.kpi1.value, lang) : rm.kpi1.value}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 flex-col items-start gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-emerald-700">
              <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
              <span>{t('পর্যালোচনার অপেক্ষায়', 'Awaiting review')}</span>
            </div>
          </CardFooter>
        </Card>

        {/* Metric 2 */}
        <Card className="relative overflow-hidden border border-border/80 shadow-xs bg-gradient-to-t from-primary/5 to-card hover:border-amber-500/40 transition">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 min-w-0">
                <rm.kpi2.icon className={`size-4 ${rm.kpi2.color} shrink-0`} />
                <span className="truncate">{rm.kpi2.label}</span>
              </CardDescription>
              <Badge variant="outline" className="flex shrink-0 gap-1 text-[11px] font-mono border-amber-300 text-amber-800 bg-amber-50/60">
                {rm.kpi2.badge}
              </Badge>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-foreground mt-2 truncate">
              {typeof rm.kpi2.value === 'number' ? toBanglaDigits(rm.kpi2.value, lang) : rm.kpi2.value}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 flex-col items-start gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-amber-800">
              <span>{t('শুনানি ও যাচাই', 'Hearing & check')}</span>
            </div>
          </CardFooter>
        </Card>

        {/* Metric 3 */}
        <Card className="relative overflow-hidden border border-border/80 shadow-xs bg-gradient-to-t from-primary/5 to-card hover:border-blue-500/40 transition">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 min-w-0">
                <rm.kpi3.icon className={`size-4 ${rm.kpi3.color} shrink-0`} />
                <span className="truncate">{rm.kpi3.label}</span>
              </CardDescription>
              <Badge variant="outline" className="flex shrink-0 gap-1 text-[11px] font-mono border-blue-300 text-blue-800 bg-blue-50/60">
                {rm.kpi3.badge}
              </Badge>
            </div>
            <CardTitle className="text-3xl font-black font-mono tracking-tight text-foreground mt-2">
              {typeof rm.kpi3.value === 'number' ? toBanglaDigits(rm.kpi3.value, lang) : rm.kpi3.value}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 flex-col items-start gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-blue-700">
              <span>{t('নোটিশ ও আদেশ প্রস্তুত', 'Notices & orders ready')}</span>
            </div>
          </CardFooter>
        </Card>

        {/* Metric 4 */}
        <Card className="relative overflow-hidden border border-border/80 shadow-xs bg-gradient-to-t from-primary/5 to-card hover:border-purple-500/40 transition">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 min-w-0">
                <rm.kpi4.icon className={`size-4 ${rm.kpi4.color} shrink-0`} />
                <span className="truncate">{rm.kpi4.label}</span>
              </CardDescription>
              <Badge variant="outline" className="flex shrink-0 gap-1 text-[11px] font-mono border-purple-300 text-purple-800 bg-purple-50/60">
                {rm.kpi4.badge}
              </Badge>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-foreground mt-2 truncate">
              {typeof rm.kpi4.value === 'number' ? toBanglaDigits(rm.kpi4.value, lang) : rm.kpi4.value}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 flex-col items-start gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-purple-700">
              <CheckCircle2 className="size-3.5 text-purple-600 shrink-0" />
              <span>{t('সিটিজেন চার্টার অনুযায়ী', 'Per citizen charter')}</span>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* 3. Interactive Chart & SLA Governance Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mutation Inflow vs Clearance Chart */}
        <Card className="lg:col-span-2 border border-slate-200/90 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-black text-slate-900">
                {t('নামজারি নিষ্পত্তির প্রবাহ', 'Mutation Inflow & Resolution')}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                {t('সাপ্তাহিক নতুন আবেদন দাখিল বনাম নিষ্পত্তি', 'Weekly applications received vs cleared')}
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-[#006A4E] border-emerald-200 font-bold text-xs">
              সাভার রাজস্ব অঞ্চল
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={MUTATION_FLOW_SERIES} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillApplied" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="5%" stopColor="hsl(215 90% 50%)" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="hsl(215 90% 50%)" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="fillApproved" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="5%" stopColor="hsl(158 64% 42%)" stopOpacity={0.7} />
                        <stop offset="95%" stopColor="hsl(158 64% 42%)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(215 20% 90%)" />
                    <XAxis dataKey={lang === 'bn' ? 'week' : 'weekEn'} tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="applied" stroke="hsl(215 90% 50%)" fill="url(#fillApplied)" strokeWidth={2} />
                    <Area type="monotone" dataKey="approved" stroke="hsl(158 64% 42%)" fill="url(#fillApproved)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* 28-Day SLA Governance Card */}
        <Card className="border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <Clock className="w-4 h-4 text-[#006A4E]" />
              <span>{t('২৮-দিন এসএলএ', '28-Day SLA')}</span>
            </div>
            <CardTitle className="text-base font-black text-slate-900 mt-1">
              {t('এসএলএ ট্র্যাকিং', 'SLA Tracking')}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {t('প্রতিটি ধাপের সময়সীমা পর্যবেক্ষণ।', 'Stage-wise SLA monitoring.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-bold text-slate-700 mb-1">
                <span>{t('তহশিলদার রিপোর্ট (৩ দিন)', 'Union Land Report (3 Days)')}</span>
                <span className="text-emerald-700">১০০% সম্পন্ন</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold text-slate-700 mb-1">
                <span>{t('কানুনগো যাচাই (৪ দিন)', 'Surveyor Verification (4 Days)')}</span>
                <span className="text-emerald-700">৯৬% সম্পন্ন</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[96%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold text-slate-700 mb-1">
                <span>{t('শুনানি ও আদেশ (১৪ দিন)', 'AC Land Hearing & Order (14 Days)')}</span>
                <span className="text-emerald-700">৯৮% অন-টাইম</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full w-[98%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold text-slate-700 mb-1">
                <span>{t('খতিয়ান প্রদান (৭ দিন)', 'DCR Fee & Khatian Print (7 Days)')}</span>
                <span className="text-emerald-700">১০০% ক্যাশলেস</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-full" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('sla_overview')}
              className="w-full text-xs font-bold text-[#006A4E] hover:bg-emerald-50 border-emerald-300 cursor-pointer"
            >
              <span>{t('এসএলএ বিস্তারিত দেখুন', 'View Full SLA')}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* 4. Priority Mutation Desk & Hearing Table */}
      <Card className="border border-slate-200/90 shadow-xs overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#006A4E]" />
              <span>{t('জরুরি নামজারি তালিকা', 'Priority Mutation List')}</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              {t('তদন্ত সম্পন্ন ও আদেশের অপেক্ষায় থাকা কেসসমূহ', 'Cases ready for final mutation order')}
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => onNavigateTab('mutations')}
            className="bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            <span>{t('সব কেস দেখুন', 'View All Cases')}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[320px] scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="font-bold text-slate-700">#</TableHead>
                  <TableHead className="font-bold text-slate-700">{t('কেস নম্বর', 'Case No')}</TableHead>
                  <TableHead className="font-bold text-slate-700">{t('আবেদনকারী', 'Applicant')}</TableHead>
                  <TableHead className="font-bold text-slate-700">{t('দাগ ও মৌজা', 'Plot & Mouza')}</TableHead>
                  <TableHead className="font-bold text-slate-700">{t('জমির পরিমাণ', 'Area')}</TableHead>
                  <TableHead className="font-bold text-slate-700">{t('প্রস্তাবনা', 'Field Report')}</TableHead>
                  <TableHead className="font-bold text-slate-700">{t('এসএলএ স্থিতি', 'SLA Status')}</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">{t('পদক্ষেপ', 'Action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mutations.slice(0, 4).map((mut: any, idx: number) => (
                  <TableRow key={mut.id || idx} className="hover:bg-slate-50/60">
                    <TableCell className="font-mono text-xs text-slate-500">
                      {toBanglaDigits(idx + 1, lang)}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-slate-900 text-xs">
                      {mut.case_number || `MUT-2026-${toBanglaDigits(idx + 501, lang)}`}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-slate-800">
                      {mut.applicant_name || 'মোঃ কামরুল হাসান'}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-bold">{t('দাগ', 'Plot')} {toBanglaDigits(mut.dag_no || 420, lang)}</span>
                      <span className="text-slate-500 text-[11px] block">{mut.mouza_name || 'বিরুলিয়া, সাভার'}</span>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-xs text-slate-900">
                      {toBanglaDigits(mut.area_decimal || '১২.৫', lang)} {t('শতক', 'dec')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[10px] flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>অনুকূল প্রস্তাবনা</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 font-bold text-[10px]">
                        {t('৮ম দিন / ২৮ দিন', 'Day 8 / 28')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => onNavigateTab('mutations')}
                        className="h-8 px-3 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <Gavel className="w-3.5 h-3.5 mr-1" />
                        <span>{t('আদেশ প্রদান', 'Issue Order')}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 5. Quick Revenue Action Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card
          onClick={() => onNavigateTab('mutations')}
          className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-sm transition cursor-pointer flex items-center gap-3.5 group bg-white"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-[#006A4E] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#006A4E] transition">
              {t('নামজারি কেস', 'e-Mutation Cases')}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t('পেন্ডিং ও অনুমোদিত নথি দেখুন', 'Review active mutation files')}
            </p>
          </div>
        </Card>

        <Card
          onClick={() => onNavigateTab('disputes')}
          className="p-4 rounded-2xl border border-slate-200 hover:border-amber-500 hover:shadow-sm transition cursor-pointer flex items-center gap-3.5 group bg-white"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Gavel className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition">
              {t('বিরোধ ও শুনানি', 'Revenue Dispute Tribunal')}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t('আপত্তি ও এজলাস ডকেট', 'Objection hearings and summon dockets')}
            </p>
          </div>
        </Card>

        <Card
          onClick={() => onNavigateTab('field_reports')}
          className="p-4 rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-sm transition cursor-pointer flex items-center gap-3.5 group bg-white"
        >
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <FileSearch className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition">
              {t('ফিল্ড রিপোর্ট', 'Field Inspection Reports')}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t('তহশিলদার ও সার্ভেয়ার প্রতিবেদন', 'Review surveyor boundaries and reports')}
            </p>
          </div>
        </Card>

        <Card
          onClick={() => onNavigateTab('khatians')}
          className="p-4 rounded-2xl border border-slate-200 hover:border-purple-500 hover:shadow-sm transition cursor-pointer flex items-center gap-3.5 group bg-white"
        >
          <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition">
              {t('খতিয়ান ও দাগ', 'Khatians & Survey Plots')}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t('খতিয়ান খসড়া ও রেকর্ড দেখুন', 'Inspect khatian chains and lineage records')}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
