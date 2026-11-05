import React from 'react';
import {
  FileCheck2,
  Gavel,
  ShieldAlert,
  Coins,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Search,
  Calculator,
  Layers,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  FileText,
  Building2,
  Calendar,
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

interface SubRegistrarDashboardProps {
  onNavigateTab: (tab: string) => void;
  deedsList?: any[];
  stats?: any;
}

const REGISTRATION_SERIES = [
  { day: 'রবি', dayEn: 'Sun', registered: 14, blocked: 2, fee: 380000 },
  { day: 'সোম', dayEn: 'Mon', registered: 19, blocked: 3, fee: 495000 },
  { day: 'মঙ্গল', dayEn: 'Tue', registered: 22, blocked: 1, fee: 560000 },
  { day: 'বুধ', dayEn: 'Wed', registered: 17, blocked: 4, fee: 430000 },
  { day: 'বৃহঃ', dayEn: 'Thu', registered: 26, blocked: 5, fee: 685000 },
];

export const SubRegistrarDashboard: React.FC<SubRegistrarDashboardProps> = ({
  onNavigateTab,
  deedsList = [],
  stats,
}) => {
  const { lang, t, user } = useAppUI();

  const totalRegistered = stats?.total_registered ?? (deedsList.length > 0 ? deedsList.length : 91);
  const pendingDocket = stats?.pending_hearing ?? 4;
  const blockedFrauds = stats?.fraud_blocked ?? 15;
  const totalRevenueBdt = stats?.revenue_collected ?? 485250;

  const chartConfig = {
    registered: {
      label: lang === 'bn' ? 'সম্পাদিত দলিল' : 'Registered Deeds',
      color: 'hsl(158 64% 42%)',
    },
    blocked: {
      label: lang === 'bn' ? '১১-রুল প্রতিহত' : 'Gatekeeper Blocked',
      color: 'hsl(0 84% 60%)',
    },
  };

  return (
    <div className="space-y-6">
      {/* 1. Official Executive Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-[#004d38] text-white p-6 sm:p-8 shadow-md border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-blue-400 text-blue-200 bg-blue-950/60 font-semibold px-2.5 py-0.5">
              <Building2 className="w-3.5 h-3.5 mr-1" />
              {t('নিবন্ধন বিভাগ', 'Registry Dept')}
            </Badge>
            <span className="text-xs text-blue-200">•</span>
            <span className="text-xs text-emerald-300 font-mono font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              {t('সক্রিয় সেশন', 'Active')}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {t('সাব-রেজিস্ট্রার ড্যাশবোর্ড', 'Sub-Registrar Dashboard')}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            {t(
              'দলিল নিবন্ধন, এজলাস শুনানি ও রাজস্ব ব্যবস্থাপনা।',
              'Deed registration, chamber hearings, and revenue management.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            onClick={() => onNavigateTab('wizard')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-sm cursor-pointer"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            <span>{t('নতুন দলিল', 'New Deed')}</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => onNavigateTab('held')}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs h-10 px-4 rounded-xl shadow-sm cursor-pointer"
          >
            <Gavel className="w-4 h-4 mr-1.5 text-blue-300" />
            <span>{t('এজলাস শুনানি', 'Hearings')}</span>
          </Button>
        </div>
      </div>

      {/* 2. Key Performance Metric Cards (shadcn/ui Card Blocks) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Registered Deeds */}
        <Card className="relative overflow-hidden border border-border/80 shadow-xs bg-gradient-to-t from-primary/5 to-card hover:border-emerald-500/40 transition">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 min-w-0">
                <FileCheck2 className="size-4 text-emerald-600 shrink-0" />
                <span className="truncate">{t('নিবন্ধিত দলিল', 'Registered Deeds')}</span>
              </CardDescription>
              <Badge variant="outline" className="flex shrink-0 gap-1 text-[11px] font-mono border-emerald-300 text-emerald-700 bg-emerald-50/50">
                <TrendingUp className="size-3 text-emerald-600" />
                +14.2%
              </Badge>
            </div>
            <CardTitle className="text-3xl font-black font-mono tracking-tight text-foreground mt-2">
              {toBanglaDigits(totalRegistered, lang)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 flex-col items-start gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-emerald-700">
              <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
              <span>{t('ডিজিটাল বালামভুক্ত', 'In digital balam')}</span>
            </div>
          </CardFooter>
        </Card>

        {/* Card 2: Pending Judicial Hearing Docket */}
        <Card className="relative overflow-hidden border border-border/80 shadow-xs bg-gradient-to-t from-primary/5 to-card hover:border-amber-500/40 transition">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 min-w-0">
                <Gavel className="size-4 text-amber-600 shrink-0" />
                <span className="truncate">{t('অপেক্ষমাণ শুনানি', 'Pending Hearings')}</span>
              </CardDescription>
              <Badge variant="outline" className="flex shrink-0 gap-1 text-[11px] font-mono border-amber-300 text-amber-700 bg-amber-50/50">
                <Clock className="size-3 text-amber-600" />
                {t('আজকের তালিকা', 'Today')}
              </Badge>
            </div>
            <CardTitle className="text-3xl font-black font-mono tracking-tight text-foreground mt-2">
              {toBanglaDigits(pendingDocket, lang)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 flex-col items-start gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-amber-800">
              <span className="size-1.5 rounded-full bg-amber-500 inline-block animate-ping shrink-0" />
              <span>{t('আজকের এজলাস তালিকা', 'Today\'s chamber docket')}</span>
            </div>
          </CardFooter>
        </Card>

        {/* Card 3: 11-Rule Gatekeeper Intercepted Frauds */}
        <Card className="relative overflow-hidden border border-border/80 shadow-xs bg-gradient-to-t from-primary/5 to-card hover:border-rose-500/40 transition">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 min-w-0">
                <ShieldAlert className="size-4 text-rose-600 shrink-0" />
                <span className="truncate">{t('আটকানো জালিয়াতি', 'Blocked Frauds')}</span>
              </CardDescription>
              <Badge variant="outline" className="flex shrink-0 gap-1 text-[11px] font-mono border-rose-300 text-rose-700 bg-rose-50/50">
                <ShieldCheck className="size-3 text-rose-600" />
                ১০০% ব্লকড
              </Badge>
            </div>
            <CardTitle className="text-3xl font-black font-mono tracking-tight text-foreground mt-2">
              {toBanglaDigits(blockedFrauds, lang)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 flex-col items-start gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-rose-700">
              <span>{t('ভুয়া খতিয়ান ও বিক্রেতা রোধ', 'Fake khatian & seller blocked')}</span>
            </div>
          </CardFooter>
        </Card>

        {/* Card 4: Stamp Duty & Revenue Collected */}
        <Card className="relative overflow-hidden border border-border/80 shadow-xs bg-gradient-to-t from-primary/5 to-card hover:border-blue-500/40 transition">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 min-w-0">
                <Coins className="size-4 text-blue-600 shrink-0" />
                <span className="truncate">{t('আদায়কৃত রাজস্ব', 'Revenue Collected')}</span>
              </CardDescription>
              <Badge variant="outline" className="flex shrink-0 gap-1 text-[11px] font-mono border-blue-300 text-blue-700 bg-blue-50/50">
                ক্যাশলেস
              </Badge>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-foreground mt-2 truncate">
              ৳ {toBanglaDigits(totalRevenueBdt.toLocaleString('en-IN'), lang)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 flex-col items-start gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-blue-700">
              <CheckCircle2 className="size-3.5 text-blue-600 shrink-0" />
              <span>{t('ই-চালানে সরাসরি সরকারি কোষাগারে', 'Direct treasury deposit via e-Challan')}</span>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* 3. Interactive Chart & Gatekeeper Defense Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registration & Fraud Prevention Volume Chart */}
        <Card className="lg:col-span-2 border border-slate-200/90 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-black text-slate-900">
                {t('সাপ্তাহিক দলিল পরিসংখ্যান', 'Weekly Deed Volume')}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                {t('অনুমোদিত দলিল ও আটকে যাওয়া দলিলের সংখ্যা', 'Daily approved vs intercepted deeds')}
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-[#006A4E] border-emerald-200 font-bold text-xs">
              সাভার কার্যালয়
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={REGISTRATION_SERIES} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillRegistered" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="5%" stopColor="hsl(158 64% 42%)" stopOpacity={0.7} />
                        <stop offset="95%" stopColor="hsl(158 64% 42%)" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="fillBlocked" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="5%" stopColor="hsl(0 84% 60%)" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="hsl(0 84% 60%)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(215 20% 90%)" />
                    <XAxis dataKey={lang === 'bn' ? 'day' : 'dayEn'} tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="registered" stroke="hsl(158 64% 42%)" fill="url(#fillRegistered)" strokeWidth={2} />
                    <Area type="monotone" dataKey="blocked" stroke="hsl(0 84% 60%)" fill="url(#fillBlocked)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* 11-Rule Gatekeeper Status Overview Card */}
        <Card className="border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-[#006A4E] font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-[#006A4E]" />
              <span>{t('নিরাপত্তা গেটকিপার', 'Security Gatekeeper')}</span>
            </div>
            <CardTitle className="text-base font-black text-slate-900 mt-1">
              {t('প্রাক-নিবন্ধন যাচাই', 'Pre-Registration Checks')}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {t('জাতীয় ডাটাবেজে দাগ ও ব্যক্তির তথ্য স্বয়ংক্রিয় যাচাই।', 'Automated verification against national database.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="font-semibold text-slate-700">{t('১. মালিকানা বিক্রয় লক', '1. Owner Sale Lock')}</span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[10px]">সক্রিয়</Badge>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="font-semibold text-slate-700">{t('২. এনআইডি বায়োমেট্রিক', '2. NID Biometrics')}</span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[10px]">সংযুক্ত</Badge>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="font-semibold text-slate-700">{t('৩. আদালতের নিষেধাজ্ঞা', '3. Court Injunctions')}</span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[10px]">রিয়েল-টাইম</Badge>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="font-semibold text-slate-700">{t('৪. ব্যাংক বন্ধক ও লিয়েন', '4. Bank Mortgage Liens')}</span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[10px]">অটো-চেক</Badge>
            </div>
          </CardContent>
          <CardFooter className="pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('verifier')}
              className="w-full text-xs font-bold text-[#006A4E] hover:bg-emerald-50 border-emerald-300 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 mr-1.5" />
              <span>{t('দলিল কিউআর যাচাই', 'Verify Deed QR')}</span>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* 4. Priority Hearing Docket & Pending Deeds Queue */}
      <Card className="border border-slate-200/90 shadow-xs overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <Gavel className="w-4 h-4 text-blue-600" />
              <span>{t('জরুরি শুনানি তালিকা', 'Urgent Hearing List')}</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              {t('বায়োমেট্রিক ও গেটকিপার যাচাই সম্পন্ন দলিল', 'Deeds cleared for chamber hearing')}
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => onNavigateTab('held')}
            className="bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            <span>{t('সব শুনানি দেখুন', 'View All Hearings')}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[320px] scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="font-bold text-slate-700">#</TableHead>
                  <TableHead className="font-bold text-slate-700">{t('দলিল নম্বর', 'Deed Code')}</TableHead>
                  <TableHead className="font-bold text-slate-700">{t('ধরন', 'Deed Nature')}</TableHead>
                  <TableHead className="font-bold text-slate-700">{t('পক্ষগণ', 'Parties')}</TableHead>
                  <TableHead className="font-bold text-slate-700">{t('দাগ ও মৌজা', 'Plot & Mouza')}</TableHead>
                  <TableHead className="font-bold text-slate-700">{t('মূল্য', 'Value')}</TableHead>
                  <TableHead className="font-bold text-slate-700">{t('স্থিতি', 'Gatekeeper')}</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">{t('পদক্ষেপ', 'Action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deedsList.slice(0, 4).map((deed: any, idx: number) => (
                  <TableRow key={deed.id || idx} className="hover:bg-slate-50/60">
                    <TableCell className="font-mono text-xs text-slate-500">
                      {toBanglaDigits(idx + 1, lang)}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-slate-900 text-xs">
                      {deed.deed_number || `DEED-2026-${toBanglaDigits(idx + 104, lang)}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px] font-bold text-blue-800 bg-blue-50 border-blue-200">
                        {deed.deed_type || 'বিক্রয় কবলা (Sale)'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-bold text-slate-800">{deed.seller_name || 'মোঃ কামরুল হাসান'}</div>
                      <div className="text-[11px] text-slate-500">→ {deed.buyer_name || 'বেগম আয়েশা খাতুন'}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-bold">{t('দাগ', 'Plot')} {toBanglaDigits(deed.dag_no || 420, lang)}</span>
                      <span className="text-slate-500 text-[11px] block">{deed.mouza || 'বিরুলিয়া, সাভার'}</span>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-xs text-slate-900">
                      ৳ {toBanglaDigits((deed.declared_value || 3500000).toLocaleString('en-IN'), lang)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[10px] flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>১০০% নিরাপদ</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => onNavigateTab('held')}
                        className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <Gavel className="w-3.5 h-3.5 mr-1" />
                        <span>{t('শুনানি', 'Hear')}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 5. Sub-Registry Quick Action Workspace Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card
          onClick={() => onNavigateTab('wizard')}
          className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-sm transition cursor-pointer flex items-center gap-3.5 group bg-white"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-[#006A4E] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#006A4E] transition">
              {t('নতুন দলিল', 'New Deed')}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t('খসড়া তৈরি ও তথ্য এন্ট্রি', 'Draft deed and staging')}
            </p>
          </div>
        </Card>

        <Card
          onClick={() => onNavigateTab('deeds')}
          className="p-4 rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-sm transition cursor-pointer flex items-center gap-3.5 group bg-white"
        >
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition">
              {t('দলিলপত্র', 'Deeds')}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t('বালাম বহির রেকর্ড দেখুন', 'Browse registered deeds')}
            </p>
          </div>
        </Card>

        <Card
          onClick={() => onNavigateTab('khatian')}
          className="p-4 rounded-2xl border border-slate-200 hover:border-amber-500 hover:shadow-sm transition cursor-pointer flex items-center gap-3.5 group bg-white"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition">
              {t('খতিয়ান ও দাগ', 'Khatian & Dag')}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t('মালিকানা ধারাবাহিকতা তল্লাশি', 'Search ownership chain')}
            </p>
          </div>
        </Card>

        <Card
          onClick={() => onNavigateTab('fees')}
          className="p-4 rounded-2xl border border-slate-200 hover:border-purple-500 hover:shadow-sm transition cursor-pointer flex items-center gap-3.5 group bg-white"
        >
          <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition">
              {t('ফি ক্যালকুলেটর', 'Fee Calculator')}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t('সরকারি ফি ও কর হিসাব', 'Calculate govt fees')}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
