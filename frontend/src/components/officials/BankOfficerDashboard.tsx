import React from 'react';
import {
  Landmark,
  ShieldCheck,
  Coins,
  FileSpreadsheet,
  PlusCircle,
  Layers,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  Building2,
  ShieldAlert,
  Search,
  ExternalLink,
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

interface BankOfficerDashboardProps {
  onNavigateTab: (tab: string) => void;
  mortgagesList?: any[];
  stats?: any;
}

const MORTGAGE_VOLUME_SERIES = [
  { month: 'মে', monthEn: 'May', valueCrore: 38.5, count: 52 },
  { month: 'জুন', monthEn: 'Jun', valueCrore: 44.2, count: 61 },
  { month: 'জুলাই', monthEn: 'Jul', valueCrore: 51.0, count: 68 },
  { month: 'আগস্ট', monthEn: 'Aug', valueCrore: 58.6, count: 76 },
  { month: 'সেপ্টেম্বর', monthEn: 'Sep', valueCrore: 64.2, count: 85 },
];

export const BankOfficerDashboard: React.FC<BankOfficerDashboardProps> = ({
  onNavigateTab,
  mortgagesList = [],
  stats,
}) => {
  const { lang, t, user } = useAppUI();

  const totalMortgages = stats?.total_mortgages ?? (mortgagesList.length > 0 ? mortgagesList.length : 85);
  const totalValueCrore = stats?.total_value_crore ?? 64.2;
  const pendingLiens = stats?.pending_liens ?? 3;
  const issuedNocs = stats?.issued_nocs ?? 12;

  const chartConfig = {
    valueCrore: {
      label: lang === 'bn' ? 'জামানতের মোট মূল্য (কোটি টাকা)' : 'Collateral Value (Crore BDT)',
      color: 'hsl(158 64% 42%)',
    },
  };

  return (
    <div className="space-y-6">
      {/* 1. Bank Official Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950 to-emerald-950 text-white p-6 sm:p-8 shadow-md border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-rose-300 text-rose-200 bg-rose-950/60 font-semibold px-2.5 py-0.5">
              <Landmark className="w-3.5 h-3.5 mr-1" />
              {t('বাণিজ্যিক ব্যাংক জামানত ডেস্ক', 'Bank Collateral Desk')}
            </Badge>
            <span className="text-xs text-rose-200">•</span>
            <span className="text-xs text-emerald-300 font-mono font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              {t('সক্রিয় সেশন', 'Active')}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {t('ব্যাংক জামানত ও লিয়েন ড্যাশবোর্ড', 'Bank Collateral Dashboard')}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            {t(
              'বন্ধকী জমি যাচাই, লিয়েন সংযুক্তি ও অনাপত্তি সনদ (NOC) ব্যবস্থাপনা।',
              'Mortgage verification, lien management, and digital NOC.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            onClick={() => onNavigateTab('new_lien')}
            className="bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs h-10 px-4 rounded-xl shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            <span>{t('নতুন বন্ধক', 'New Lien')}</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => onNavigateTab('noc')}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs h-10 px-4 rounded-xl shadow-sm cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-300" />
            <span>{t('অনাপত্তি সনদ (NOC)', 'Release NOCs')}</span>
          </Button>
        </div>
      </div>

      {/* 2. Key Performance Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Active Mortgaged Plots */}
        <Card className="relative overflow-hidden border border-border/80 shadow-xs bg-gradient-to-t from-primary/5 to-card hover:border-emerald-500/40 transition">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 min-w-0">
                <FileSpreadsheet className="size-4 text-emerald-600 shrink-0" />
                <span className="truncate">{t('নিবন্ধিত বন্ধকী জমি', 'Active Mortgaged Plots')}</span>
              </CardDescription>
              <Badge variant="outline" className="flex shrink-0 gap-1 text-[11px] font-mono border-emerald-300 text-emerald-700 bg-emerald-50/50">
                <TrendingUp className="size-3 text-emerald-600" />
                +৮.৪%
              </Badge>
            </div>
            <CardTitle className="text-3xl font-black font-mono tracking-tight text-foreground mt-2">
              {toBanglaDigits(totalMortgages, lang)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 flex-col items-start gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-emerald-700">
              <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
              <span>{t('লিয়েন রেজিস্ট্রিভুক্ত', 'In national lien register')}</span>
            </div>
          </CardFooter>
        </Card>

        {/* Card 2: Total Collateral Disbursed Value */}
        <Card className="relative overflow-hidden border border-border/80 shadow-xs bg-gradient-to-t from-primary/5 to-card hover:border-blue-500/40 transition">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 min-w-0">
                <Coins className="size-4 text-blue-600 shrink-0" />
                <span className="truncate">{t('মোট জামানত মূল্য', 'Total Collateral Value')}</span>
              </CardDescription>
              <Badge variant="outline" className="flex shrink-0 gap-1 text-[11px] font-mono border-blue-300 text-blue-700 bg-blue-50/50">
                নিরাপদ
              </Badge>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-foreground mt-2 truncate">
              ৳ {toBanglaDigits(totalValueCrore, lang)} {t('কোটি', 'Cr')}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 flex-col items-start gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-blue-700">
              <span>{t('অনুমোদিত ঋণ জামানত', 'Verified loan collateral')}</span>
            </div>
          </CardFooter>
        </Card>

        {/* Card 3: Pending Lien Verifications */}
        <Card className="relative overflow-hidden border border-border/80 shadow-xs bg-gradient-to-t from-primary/5 to-card hover:border-amber-500/40 transition">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 min-w-0">
                <Clock className="size-4 text-amber-600 shrink-0" />
                <span className="truncate">{t('নতুন লিয়েন আবেদন', 'Pending Lien Filings')}</span>
              </CardDescription>
              <Badge variant="outline" className="flex shrink-0 gap-1 text-[11px] font-mono border-amber-300 text-amber-700 bg-amber-50/50">
                যাচাইাধীন
              </Badge>
            </div>
            <CardTitle className="text-3xl font-black font-mono tracking-tight text-foreground mt-2">
              {toBanglaDigits(pendingLiens, lang)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 flex-col items-start gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-amber-800">
              <span className="size-1.5 rounded-full bg-amber-500 inline-block animate-ping shrink-0" />
              <span>{t('স্বত্ব যাচাই চলছে', 'Title check live')}</span>
            </div>
          </CardFooter>
        </Card>

        {/* Card 4: NOC Release Certificates Issued */}
        <Card className="relative overflow-hidden border border-border/80 shadow-xs bg-gradient-to-t from-primary/5 to-card hover:border-purple-500/40 transition">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 min-w-0">
                <ShieldCheck className="size-4 text-purple-600 shrink-0" />
                <span className="truncate">{t('দায়মুক্তি (NOC) প্রদান', 'NOC Releases Issued')}</span>
              </CardDescription>
              <Badge variant="outline" className="flex shrink-0 gap-1 text-[11px] font-mono border-purple-300 text-purple-700 bg-purple-50/50">
                সম্পূর্ণ
              </Badge>
            </div>
            <CardTitle className="text-3xl font-black font-mono tracking-tight text-foreground mt-2">
              {toBanglaDigits(issuedNocs, lang)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 flex-col items-start gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-purple-700">
              <CheckCircle2 className="size-3.5 text-purple-600 shrink-0" />
              <span>{t('ঋণ পরিশোধ সম্পন্ন', 'Loan cleared')}</span>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* 3. Double Mortgage Prevention Security Callout & Growth Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collateral Growth Trend Chart */}
        <Card className="lg:col-span-2 border border-slate-200/90 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-black text-slate-900">
                {t('জামানত প্রবৃদ্ধি গ্রাফ', 'Collateral Growth')}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                {t('মাসিক মোট জামানতের আর্থিক মূল্যমান', 'Total secured collateral valuation')}
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-[#006A4E] border-emerald-200 font-bold text-xs">
              সোনালী ব্যাংক পিএলসি
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={MORTGAGE_VOLUME_SERIES} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillValuation" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="5%" stopColor="hsl(158 64% 42%)" stopOpacity={0.7} />
                        <stop offset="95%" stopColor="hsl(158 64% 42%)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(215 20% 90%)" />
                    <XAxis dataKey={lang === 'bn' ? 'month' : 'monthEn'} tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="valueCrore" stroke="hsl(158 64% 42%)" fill="url(#fillValuation)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* Anti-Fraud Lien Callout Block */}
        <Card className="border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>{t('জালিয়াতি প্রতিরোধ', 'Fraud Prevention')}</span>
            </div>
            <CardTitle className="text-base font-black text-slate-900 mt-1">
              {t('ক্রস-ব্যাংক লিয়েন লক', 'Cross-Bank Lien Lock')}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {t('জাতীয় ডাটাবেজে দাগটি লক থাকায় একই জমি একাধিক প্রতিষ্ঠানে বন্ধক বা বিক্রি বন্ধ।', 'Locks the plot across all banks and registries to prevent double mortgaging.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 font-medium">
              ✓ {t('সাব-রেজিস্ট্রি অফিসে জমি হস্তান্তর বন্ধ থাকবে', 'Deed conveyances strictly blocked at Registry')}
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 font-medium">
              ✓ {t('অন্য কোনো তফসিলি ব্যাংকে বন্ধক দেওয়া অসম্ভব', 'Duplicate loans on same title impossible')}
            </div>
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 font-medium">
              ✓ {t('ঋণ পরিশোধের পর অনলাইন এনওসি দ্বারা তাৎক্ষণিক অবমুক্ত', 'Instant digital release upon loan clearance')}
            </div>
          </CardContent>
          <CardFooter className="pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('khatian')}
              className="w-full text-xs font-bold text-slate-700 hover:text-[#006A4E] hover:bg-emerald-50 border-slate-300 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 mr-1.5 text-[#006A4E]" />
              <span>{t('খতিয়ান তল্লাশি', 'Search Land Title')}</span>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* 4. Priority Mortgages Queue Table */}
      <Card className="border border-slate-200/90 shadow-xs overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>{t('সক্রিয় বন্ধকী জমি রেজিস্ট্রি', 'Active Mortgaged Plots')}</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              {t('শাখায় সংরক্ষিত ও লিয়েন নথিভুক্ত দাগসমূহ', 'Secured plots with active institutional mortgage liens')}
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => onNavigateTab('mortgages')}
            className="bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            <span>{t('সব বন্ধক দেখুন', 'View All Mortgages')}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[320px] scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="font-bold text-slate-700">#</TableHead>
                  <TableHead className="font-bold text-slate-700">{t('হিসাব নং', 'Loan Account')}</TableHead>
                  <TableHead className="font-bold text-slate-700">{t('গ্রাহকের নাম', 'Borrower Name')}</TableHead>
                  <TableHead className="font-bold text-slate-700">{t('দাগ ও মৌজা', 'Plot & Mouza')}</TableHead>
                  <TableHead className="font-bold text-slate-700">{t('ঋণের পরিমাণ', 'Loan Amount')}</TableHead>
                  <TableHead className="font-bold text-slate-700">{t('স্থিতি', 'Lien Status')}</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">{t('পদক্ষেপ', 'Action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mortgagesList.slice(0, 4).map((m: any, idx: number) => (
                  <TableRow key={m.id || idx} className="hover:bg-slate-50/60">
                    <TableCell className="font-mono text-xs text-slate-500">
                      {toBanglaDigits(idx + 1, lang)}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-slate-900 text-xs">
                      {m.loan_account_no || `LN-SAV-${toBanglaDigits(idx + 8801, lang)}`}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-slate-800">
                      {m.borrower_name || 'মোঃ কামরুল হাসান'}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-bold">{t('দাগ', 'Plot')} {toBanglaDigits(m.dag_no || 420, lang)}</span>
                      <span className="text-slate-500 text-[11px] block">{m.mouza || 'বিরুলিয়া, সাভার'}</span>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-xs text-slate-900">
                      ৳ {toBanglaDigits((m.loan_amount || 4500000).toLocaleString('en-IN'), lang)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[10px] flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>লিয়েন সক্রিয়</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => onNavigateTab('noc')}
                        className="h-8 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <span>{t('এনওসি ইস্যু', 'Issue NOC')}</span>
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
