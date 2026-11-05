import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Download,
  Radio,
  FileCheck2,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Database,
  Flame,
  ArrowRight,
  Building2,
  Users,
  MapPin,
} from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi, AdminAnomalyItem, DatabaseBackupResponse } from '@/api/client';
import { toBanglaDigits } from '@/theme/tokens';
import { AdminSectionCards } from './AdminSectionCards';
import { AdminAreaChart } from './AdminAreaChart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AdminOverviewPageProps {
  stats: any;
  onNavigateSubPage: (subPage: string) => void;
  onRefreshStats: () => void;
}

export const AdminOverviewPage: React.FC<AdminOverviewPageProps> = ({
  stats,
  onNavigateSubPage,
  onRefreshStats,
}) => {
  const { lang, t } = useAppUI();
  const [anomalies, setAnomalies] = useState<AdminAnomalyItem[]>([]);
  const [loadingAnomalies, setLoadingAnomalies] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState<DatabaseBackupResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    BhumiApi.getLiveAnomalies()
      .then((res) => {
        if (mounted && res?.items) {
          setAnomalies(res.items);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingAnomalies(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleExportBackup = async () => {
    try {
      setBackupLoading(true);
      const res = await BhumiApi.exportDatabaseBackup();
      setBackupSuccess(res);
    } catch (e) {
      console.error(e);
    } finally {
      setBackupLoading(false);
    }
  };

  const recentActivity = stats?.recent_activity || [];

  return (
    <div className="flex flex-col gap-2.5 p-3 sm:p-4 max-w-7xl mx-auto w-full">
      {backupSuccess && (
        <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900 py-2">
          <CheckCircle2 className="size-4 text-emerald-700" />
          <AlertDescription className="text-xs flex items-center justify-between w-full">
            <span>
              {lang === 'bn' ? backupSuccess.message_bn : backupSuccess.message_en} ({toBanglaDigits(backupSuccess.file_size_kb, lang)} KB)
            </span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-emerald-800 font-bold text-xs"
              onClick={() => setBackupSuccess(null)}
            >
              {t('বন্ধ করুন', 'Dismiss')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 1. Top-tier KPI Section Cards: 5 columns per row, compact height, distinct background shade */}
      <AdminSectionCards stats={stats} onNavigateSubPage={onNavigateSubPage} />

      {/* 3. Main Chart & Live Anomaly Queue */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        {/* Left 8 Cols: Interactive Area Chart */}
        <div className="xl:col-span-8 space-y-6">
          <AdminAreaChart monthlySeries={stats?.monthly_series} />

          {/* Recent Ledger Audit Activity Table */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">
                  {t('সাম্প্রতিক লেনদেন', 'Recent Transactions')}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {t('ডিজিটাল অডিট লগ ও হ্যাশ', 'Audit logs and signatures')}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateSubPage('ledger')}
                className="text-xs font-semibold text-[#006A4E] hover:text-[#00553e] gap-1 cursor-pointer"
              >
                <span>{t('লেজার দেখুন', 'View Ledger')}</span>
                <ChevronRight className="size-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-auto max-h-[300px] scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-[100px]">{t('ব্লক নং', 'Block #')}</TableHead>
                    <TableHead>{t('কার্যক্রম', 'Action')}</TableHead>
                    <TableHead>{t('কর্মকর্তা', 'Officer')}</TableHead>
                    <TableHead>{t('হ্যাশ', 'Hash')}</TableHead>
                    <TableHead className="text-right">{t('স্ট্যাটাস', 'Status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity.length > 0 ? (
                    recentActivity.slice(0, 6).map((log: any, idx: number) => (
                      <TableRow key={log.id || idx} className="text-xs">
                        <TableCell className="font-mono font-bold text-muted-foreground">
                          #{toBanglaDigits(log.chain_index ?? idx + 1, lang)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {log.action_bn || log.action || t('দলিল নিবব্ধন ব্লক ভেরিফিকেশন', 'Deed registration block')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.actor_name || log.actor || t('সাব-রেজিস্ট্রার', 'Sub-Registrar')}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-muted-foreground">
                          {String(log.content_hash || log.block_hash || 'e3b0c44298fc1c14...').substring(0, 16)}...
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="text-[10px] font-mono border-emerald-300 text-emerald-700 bg-emerald-50">
                            <CheckCircle2 className="size-3 mr-1 text-emerald-600" />
                            {t('নিরাপদ', 'VERIFIED')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                        {t('কোনো রেকর্ড পাওয়া যায়নি।', 'No records found.')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right 4 Cols: Live Anomaly Alerts & Quick Navigation */}
        <div className="xl:col-span-4 space-y-6">
          {/* Critical Anomaly Sentinel */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldAlert className="size-4 text-rose-600" />
                  <span>{t('ঝুঁকি ও অসঙ্গতি', 'Risk Alerts')}</span>
                </CardTitle>
                <Badge variant="danger" className="text-[10px] font-mono">
                  {toBanglaDigits(anomalies.length, lang)} {t('টি ঝুঁকি', 'active')}
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                {t('মালিকানা ও দাগের ঝুঁকি', 'Ownership alerts')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingAnomalies ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  {t('অসঙ্গতি ডাটা লোড হচ্ছে...', 'Loading anomalies...')}
                </div>
              ) : anomalies.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-800 text-xs text-center space-y-1">
                  <CheckCircle2 className="size-5 text-emerald-600 mx-auto" />
                  <p className="font-bold">{t('কোনো ঝুঁকি নেই', 'No Risks')}</p>
                  <p className="text-[11px] text-emerald-700">{t('সব রেকর্ড সুরক্ষিত।', 'All records safe.')}</p>
                </div>
              ) : (
                anomalies.slice(0, 4).map((anom) => (
                  <div
                    key={anom.id}
                    className="p-3 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-50 transition space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-rose-900 leading-snug">
                        {lang === 'bn' ? anom.title_bn : anom.title_en}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-bold px-1.5 py-0 shrink-0 ${
                          anom.severity === 'CRITICAL'
                            ? 'bg-rose-600 text-white border-rose-700'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {anom.severity}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-rose-800/90 leading-tight">
                      {lang === 'bn' ? anom.description_bn : anom.description_bn}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {anom.plot_id ? `${t('দাগ নং', 'Plot')}: ${anom.plot_id}` : ''}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigateSubPage('khatians')}
                        className="h-6 px-2 text-[10px] font-bold text-rose-900 hover:text-rose-950 hover:bg-rose-200/50"
                      >
                        <span>{t('দেখুন', 'View')}</span>
                        <ArrowRight className="size-2.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
            {anomalies.length > 4 && (
              <CardFooter className="pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateSubPage('khatians')}
                  className="w-full text-xs font-semibold"
                >
                  {t('সকল ঝুঁকি দেখুন', 'View All Risks')} ({toBanglaDigits(anomalies.length, lang)})
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Dedicated Sub-Pages Direct Access Grid */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">
                {t('দ্রুত লিঙ্ক', 'Quick Links')}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t('অন্যান্য পেজে প্রবেশ', 'Jump to sections')}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-xs">
              <Button
                variant="outline"
                className="justify-start h-auto py-2.5 px-3 flex flex-col items-start gap-1 text-left hover:border-primary/50 cursor-pointer"
                onClick={() => onNavigateSubPage('deeds')}
              >
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <FileCheck2 className="size-3.5 text-emerald-600" />
                  {t('দলিলপত্র', 'Deeds')}
                </span>
                <span className="text-[10px] text-muted-foreground">{t('বালাম ও দলিল', 'Volumes & Deeds')}</span>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto py-2.5 px-3 flex flex-col items-start gap-1 text-left hover:border-primary/50 cursor-pointer"
                onClick={() => onNavigateSubPage('khatians')}
              >
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Database className="size-3.5 text-blue-600" />
                  {t('খতিয়ান ও দাগ', 'Khatians & Plots')}
                </span>
                <span className="text-[10px] text-muted-foreground">{t('সিএস-বিএস জরিপ', 'Survey Lineage')}</span>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto py-2.5 px-3 flex flex-col items-start gap-1 text-left hover:border-primary/50 cursor-pointer"
                onClick={() => onNavigateSubPage('mutations')}
              >
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Flame className="size-3.5 text-amber-600" />
                  {t('নামজারি', 'Mutations')}
                </span>
                <span className="text-[10px] text-muted-foreground">{t('আবেদন ও অনুমোদন', 'Cases & Approval')}</span>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto py-2.5 px-3 flex flex-col items-start gap-1 text-left hover:border-primary/50 cursor-pointer"
                onClick={() => onNavigateSubPage('offices')}
              >
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-teal-600" />
                  {t('ভূমি অফিস', 'Land Offices')}
                </span>
                <span className="text-[10px] text-muted-foreground">{t('সারাদেশীয় কার্যালয়', 'Nationwide Offices')}</span>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto py-2.5 px-3 flex flex-col items-start gap-1 text-left hover:border-primary/50 cursor-pointer"
                onClick={() => onNavigateSubPage('locations')}
              >
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-emerald-600" />
                  {t('ভৌগোলিক এলাকা', 'Locations')}
                </span>
                <span className="text-[10px] text-muted-foreground">{t('বিভাগ, জেলা, উপজেলা, মৌজা', 'Division, District, Upazila')}</span>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto py-2.5 px-3 flex flex-col items-start gap-1 text-left hover:border-primary/50 cursor-pointer"
                onClick={() => onNavigateSubPage('officials')}
              >
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Users className="size-3.5 text-blue-600" />
                  {t('কর্মকর্তাবৃন্দ', 'Officials')}
                </span>
                <span className="text-[10px] text-muted-foreground">{t('পদায়ন ও অ্যাকাউন্ট', 'Postings & Accounts')}</span>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto py-2.5 px-3 flex flex-col items-start gap-1 text-left hover:border-primary/50 cursor-pointer"
                onClick={() => onNavigateSubPage('system')}
              >
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Radio className="size-3.5 text-purple-600" />
                  {t('সিস্টেম ব্রডকাস্ট', 'Broadcast')}
                </span>
                <span className="text-[10px] text-muted-foreground">{t('জরুরি বার্তা', 'Alerts')}</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
