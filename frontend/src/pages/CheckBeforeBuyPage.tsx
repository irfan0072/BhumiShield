import React, { useState, useEffect, useMemo } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi, RiskReportResponse } from '../api/client';
import { toBanglaDigits, maskNid } from '../theme/tokens';
import { ResultHeroBanner } from '../components/ResultHeroBanner';
import { KhatianChainTimeline } from '../components/KhatianChainTimeline';
import {
  Search,
  ArrowLeft,
  ArrowRight,
  Layers,
  RotateCcw,
  Printer,
  FileBadge,
  CheckCircle2,
  AlertTriangle,
  XOctagon,
  X,
  Lock,
  Unlock,
  MapPin,
  Building,
  User,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  Scale,
  Sparkles,
  Info,
  Calendar,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const CheckBeforeBuyPage: React.FC = () => {
  const { lang, t } = useAppUI();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Raw data from API
  const [locations, setLocations] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // Form Selections
  const [selectedMouzaId, setSelectedMouzaId] = useState<number>(1);
  const [selectedPlotId, setSelectedPlotId] = useState<number>(1);
  const [sellerId, setSellerId] = useState<number>(1);
  const [proposedArea, setProposedArea] = useState<string>('10');

  // Search & Filtering
  const [plotSearchQuery, setPlotSearchQuery] = useState<string>('');
  const [sellerSearchQuery, setSellerSearchQuery] = useState<string>('');

  // Assessment & UI State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<RiskReportResponse | null>(null);
  const [showCertModal, setShowCertModal] = useState(false);

  // Fetch base metadata on mount
  const fetchMetadata = () => {
    setInitialLoading(true);
    setErrorMsg(null);
    Promise.all([
      BhumiApi.getLocations(),
      BhumiApi.getPlots(),
      BhumiApi.getPersons(),
    ])
      .then(([locs, plts, pers]) => {
        setLocations(locs || []);
        setPlots(plts || []);
        setPersons(pers || []);

        const urlParams = new URLSearchParams(window.location.search);
        const dagParam = urlParams.get('dag');
        const plotIdParam = urlParams.get('plot_id');

        if (dagParam) {
          setPlotSearchQuery(dagParam);
          const found = plts.find(
            (p: any) =>
              String(p.dag_no) === String(dagParam) ||
              String(p.dag_no_bn) === String(dagParam)
          );
          if (found) {
            setSelectedPlotId(Number(found.id));
            if (found.location_id) setSelectedMouzaId(Number(found.location_id));
          }
        } else if (plotIdParam) {
          const found = plts.find((p: any) => String(p.id) === String(plotIdParam));
          if (found) {
            setSelectedPlotId(Number(found.id));
            if (found.location_id) setSelectedMouzaId(Number(found.location_id));
          }
        } else if (plts.length > 0) {
          setSelectedPlotId(Number(plts[0].id));
          if (plts[0].location_id) setSelectedMouzaId(Number(plts[0].location_id));
        }
      })
      .catch((err) => {
        setErrorMsg(
          t(
            'তথ্য লোড করতে সমস্যা হয়েছে। ইন্টারনেট সংযোগ পরীক্ষা করে পুনরায় চেষ্টা করুন।',
            'Failed to load land registry data. Please check your connection and retry.'
          )
        );
      })
      .finally(() => setInitialLoading(false));
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  // Filtered Plots for Mouza & Search
  const filteredPlots = useMemo(() => {
    return plots.filter((p) => {
      const matchMouza = selectedMouzaId ? Number(p.mouza_id || p.location_id) === Number(selectedMouzaId) : true;
      const matchQuery = plotSearchQuery.trim()
        ? String(p.dag_no).includes(plotSearchQuery.trim()) ||
          String(p.dag_no_bn).includes(plotSearchQuery.trim()) ||
          String(p.plot_code || '').toLowerCase().includes(plotSearchQuery.trim().toLowerCase())
        : true;
      return matchMouza && matchQuery;
    });
  }, [plots, selectedMouzaId, plotSearchQuery]);

  const activePlot = useMemo(() => {
    return plots.find((p) => Number(p.id) === Number(selectedPlotId)) || plots[0];
  }, [plots, selectedPlotId]);

  // Candidates for Sellers on active plot
  const plotSellers = useMemo(() => {
    if (!activePlot) return persons;
    const owners = activePlot.owners || [];
    if (owners.length > 0) {
      return owners.map((o: any) => ({
        id: o.person_id || o.id,
        name_bn: o.name_bn || o.name,
        name_en: o.name_en || o.name,
        nid_mock: o.nid_mock || o.nid || 'NID-MOCK-XXXX',
        share_area_decimal: o.share_area_decimal || o.area_decimal || 10,
        share_fraction: o.share_fraction || '১/১',
      }));
    }
    return persons;
  }, [activePlot, persons]);

  const activeSeller = useMemo(() => {
    return plotSellers.find((s: any) => Number(s.id) === Number(sellerId)) || plotSellers[0];
  }, [plotSellers, sellerId]);

  // Run Due Diligence Check
  const runAssessment = async () => {
    if (!selectedPlotId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await BhumiApi.checkBeforeBuy({
        plot_id: Number(selectedPlotId),
        seller_id: Number(sellerId),
        proposed_area_decimal: Number(proposedArea) || 10,
      });
      setReport(res);
      setStep(3);
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message_bn ||
          t(
            'যাচাইকরণে সমস্যা হয়েছে। অনুগ্রহ করে দাগ নম্বর বা বিক্রেতার তথ্য পুনরায় পরীক্ষা করুন।',
            'Verification check failed. Please re-check the plot and seller details.'
          )
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 pb-16 relative overflow-hidden">
      {/* Ambient background glow & subtle dot pattern */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[350px] bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent blur-3xl -z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 -z-10 pointer-events-none" />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4">
        {/* Compact Integrated Header with 3-Step Stepper */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-3.5 shadow-xs mb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-[#006A4E] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  {t('জমি ক্রয়ের আগে যাচাই', 'Check Before Buying')}
                </h1>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200">
                  {t('৯-ইঞ্জিন প্রাক-যাচাই', '9-Engine Pre-Check')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-none">
                {t('মালিকানা, ব্যাংক বন্ধক, আদালতের মামলা ও বিক্রয় লক যাচাই।', 'Verify ownership, mortgages, litigation and sale locks.')}
              </p>
            </div>
          </div>

          {/* Compact 3-Step Wizard Progress */}
          <div className="w-full md:w-72 space-y-1 shrink-0">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span className={step >= 1 ? 'text-[#006A4E] font-black' : 'text-slate-400'}>
                {t('১. জমি নির্বাচন', '1. Plot')}
              </span>
              <span className={step >= 2 ? 'text-[#006A4E] font-black' : 'text-slate-400'}>
                {t('২. বিক্রেতার তথ্য', '2. Seller')}
              </span>
              <span className={step >= 3 ? 'text-[#006A4E] font-black' : 'text-slate-400'}>
                {t('৩. ফলাফল ও সনদ', '3. Report')}
              </span>
            </div>
            <Progress value={step === 1 ? 33 : step === 2 ? 66 : 100} className="h-1.5 bg-slate-100" />
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!locations.length) fetchMetadata();
                else runAssessment();
              }}
              className="h-7 border-rose-300 text-rose-800 hover:bg-rose-100 cursor-pointer text-xs"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              <span>{t('পুনরায় চেষ্টা', 'Retry')}</span>
            </Button>
          </div>
        )}

        {/* 4-State Initial Loading */}
        {initialLoading ? (
          <Card className="p-6 space-y-4 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48 bg-slate-200" />
              <Skeleton className="h-3 w-80 bg-slate-200" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Skeleton className="h-9 w-full bg-slate-200" />
              <Skeleton className="h-9 w-full bg-slate-200" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <Skeleton className="h-24 w-full bg-slate-200 rounded-lg" />
              <Skeleton className="h-24 w-full bg-slate-200 rounded-lg" />
              <Skeleton className="h-24 w-full bg-slate-200 rounded-lg" />
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* STEP 1: Plot & Location Selection */}
            {step === 1 && (
              <Card className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-3.5 sm:p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#006A4E] text-white text-[10px] font-black flex items-center justify-center">১</span>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900">
                      {t('জমি ও দাগ নির্বাচন করুন', 'Select Land Plot')}
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {t(`উপলব্ধ দাগের তালিকা: ${filteredPlots.length}টি`, `Available Plots: ${filteredPlots.length}`)}
                  </span>
                </div>

                {/* Location Cascader & Dag Search */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#006A4E]" />
                      <span>{t('মৌজা নির্বাচন করুন', 'Select Mouza')}</span>
                    </Label>
                    <Select
                      value={String(selectedMouzaId || '1')}
                      onValueChange={(val) => setSelectedMouzaId(Number(val))}
                    >
                      <SelectTrigger className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs sm:text-sm font-semibold text-slate-900 shadow-2xs focus:ring-2 focus:ring-[#006A4E]">
                        <SelectValue placeholder={t('মৌজা নির্বাচন করুন', 'Select Mouza')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {locations.map((loc) => (
                            <SelectItem key={loc.id} value={String(loc.id)}>
                              {loc.mouza_bn} ({t('জেএল', 'JL')} {toBanglaDigits(loc.jl_no)}) - {loc.upazila_bn}, {loc.district_bn}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-[#006A4E]" />
                      <span>{t('দাগ নম্বর দিয়ে খুঁজুন', 'Search by Dag No')}</span>
                    </Label>
                    <Input
                      value={plotSearchQuery}
                      onChange={(e) => setPlotSearchQuery(e.target.value)}
                      placeholder={t('যেমন: ১০১, ১০২...', 'e.g. 101, 102...')}
                      className="h-9 text-xs sm:text-sm font-semibold rounded-lg"
                    />
                  </div>
                </div>

                {/* Assisted Quick Preset Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] font-medium text-slate-500">{t('দ্রুত প্রিসেট দাগ:', 'Presets:')}</span>
                  {['১০১', '১০২', '১০৩', '১০৫'].map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant={plotSearchQuery === preset ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPlotSearchQuery(preset)}
                      className={`h-6 px-2.5 text-[11px] rounded-full cursor-pointer ${
                        plotSearchQuery === preset
                          ? 'bg-[#006A4E] text-white hover:bg-[#00523C]'
                          : 'text-slate-700 hover:border-[#006A4E]'
                      }`}
                    >
                      {t(`দাগ ${preset}`, `Dag ${preset}`)}
                    </Button>
                  ))}
                  {plotSearchQuery && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPlotSearchQuery('')}
                      className="h-6 px-2 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      {t('রিসেট', 'Reset')}
                    </Button>
                  )}
                </div>

                {/* Plot Cards Grid */}
                <div className="space-y-2 pt-1">
                  {filteredPlots.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <Info className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700">
                        {t('এই ফিল্টারে কোনো দাগ পাওয়া যায়নি।', 'No plot found matching these filters.')}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPlotSearchQuery('');
                          setSelectedMouzaId(locations[0]?.id || 1);
                        }}
                        className="h-8 text-xs font-bold"
                      >
                        {t('সব দাগ দেখুন', 'Show All Plots')}
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[280px] sm:max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
                      {filteredPlots.map((plot) => {
                        const isSelected = Number(selectedPlotId) === Number(plot.id);
                        const isLocked = Boolean(plot.sale_lock_active || plot.is_locked);
                        const isDisputed = Boolean(plot.dispute_count && plot.dispute_count > 0);

                        return (
                          <div
                            key={plot.id}
                            onClick={() => setSelectedPlotId(Number(plot.id))}
                            className={`p-2.5 sm:p-3 rounded-lg border-2 transition cursor-pointer flex flex-col justify-between space-y-2 ${
                              isSelected
                                ? 'bg-emerald-50/80 border-[#006A4E] shadow-2xs'
                                : 'bg-white border-slate-200 hover:border-emerald-300'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div>
                                <span className="text-[10px] text-slate-500 font-medium block">
                                  {plot.mouza_bn || 'ধামরাই'} · জেএল {toBanglaDigits(plot.jl_no || '১')}
                                </span>
                                <h3 className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                                  {t(`দাগ নং: ${toBanglaDigits(plot.dag_no)}`, `Dag No: ${plot.dag_no}`)}
                                </h3>
                              </div>
                              <Badge
                                className={
                                  isDisputed
                                    ? 'bg-rose-100 text-rose-800 border-rose-300 text-[9px] px-1.5 py-0.2'
                                    : isLocked
                                    ? 'bg-amber-100 text-amber-800 border-amber-300 text-[9px] px-1.5 py-0.2'
                                    : 'bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] px-1.5 py-0.2'
                                }
                              >
                                {isDisputed
                                  ? t('বিরোধপূর্ণ', 'Disputed')
                                  : isLocked
                                  ? t('লক সক্রিয়', 'Locked')
                                  : t('নিরাপদ', 'Safe')}
                              </Badge>
                            </div>

                            <div className="text-[11px] text-slate-600 space-y-0.5">
                              <div className="flex justify-between">
                                <span className="text-slate-500">{t('জমির শ্রেণি:', 'Class:')}</span>
                                <span className="font-semibold">{plot.land_type_bn || plot.land_type || 'ভিটা'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">{t('মোট পরিমাণ:', 'Total Area:')}</span>
                                <span className="font-bold text-slate-900">
                                  {toBanglaDigits(plot.area_decimal || 12.5)} {t('শতক', 'Dec')}
                                </span>
                              </div>
                            </div>

                            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-[#006A4E]">
                              <span>{isSelected ? t('✓ নির্বাচিত', '✓ Selected') : t('নির্বাচন করুন', 'Select')}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer Navigation */}
                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!selectedPlotId}
                    className="h-9 px-5 bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 rounded-lg shadow-2xs"
                  >
                    <span>{t('পরবর্তী ধাপ: বিক্রেতা নির্বাচন', 'Next Step: Select Seller')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            )}

            {/* STEP 2: Seller & Proposed Area Selection */}
            {step === 2 && (
              <Card className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-3.5 sm:p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#006A4E] text-white text-[10px] font-black flex items-center justify-center">২</span>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900">
                      {t('জমি বিক্রেতা ও আপনার ক্রয় প্রস্তাবিত জমির পরিমাণ', 'Seller & Proposed Purchase Quantity')}
                    </h2>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {t(`দাগ নং: ${toBanglaDigits(activePlot?.dag_no || '১০১')}`, `Plot Dag: ${activePlot?.dag_no || '101'}`)}
                  </span>
                </div>

                {/* Seller Selection Grid */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-700">
                    {t('জমির রেকর্ডীয় মালিক / বিক্রেতা:', 'Registered Owner / Seller:')}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {plotSellers.map((seller: any) => {
                      const isSelected = Number(sellerId) === Number(seller.id);
                      return (
                        <div
                          key={seller.id}
                          onClick={() => setSellerId(Number(seller.id))}
                          className={`p-2.5 sm:p-3 rounded-lg border-2 transition cursor-pointer flex items-start justify-between gap-2.5 ${
                            isSelected
                              ? 'bg-emerald-50/80 border-[#006A4E] shadow-2xs'
                              : 'bg-white border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#006A4E] flex items-center justify-center shrink-0 font-bold text-xs">
                              <User className="w-4 h-4" />
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                {lang === 'bn' ? seller.name_bn : seller.name_en}
                              </h4>
                              <p className="text-[10px] text-slate-500 font-mono">
                                NID: {maskNid(seller.nid_mock || seller.nid || '19852691234567890')}
                              </p>
                              <div className="text-[11px] text-[#006A4E] font-semibold pt-0.5">
                                {t('মালিকানা অংশ:', 'Share:')} {toBanglaDigits(seller.share_area_decimal || 10)} {t('শতক', 'Dec')} ({seller.share_fraction || '১/১'})
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-[#006A4E] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                              ✓
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Proposed Purchase Area Input */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      {t('কত শতক জমি ক্রয় করতে চান?', 'How much land (decimals) do you propose to buy?')}
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {t(`বিক্রেতার সর্বোচ্চ অংশ: ${toBanglaDigits(activeSeller?.share_area_decimal || 12.5)} শতক`, `Seller max: ${activeSeller?.share_area_decimal || 12.5} dec`)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setProposedArea((prev) => String(Math.max(1, (Number(prev) || 10) - 1)))}
                      className="h-9 w-9 text-base font-bold border-slate-300 rounded-lg cursor-pointer"
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      value={proposedArea}
                      onChange={(e) => setProposedArea(e.target.value)}
                      min="0.1"
                      step="0.5"
                      className="h-9 text-center text-base font-bold font-mono border-slate-300 w-32 rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setProposedArea((prev) => String((Number(prev) || 10) + 1))}
                      className="h-9 w-9 text-base font-bold border-slate-300 rounded-lg cursor-pointer"
                    >
                      +
                    </Button>
                    <span className="text-xs font-bold text-slate-700">{t('শতক (শতাংশ)', 'Decimals')}</span>
                  </div>

                  {/* Share Balance Sanity Alert */}
                  {Number(proposedArea) > Number(activeSeller?.share_area_decimal || 100) && (
                    <div className="p-2 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>
                        {t(
                          'সতর্কতা: প্রস্তাবিত জমির পরিমাণ বিক্রেতার অংশের চেয়ে বেশি!',
                          'Warning: Proposed area exceeds seller share!'
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Navigation */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="h-9 px-4 border-slate-300 text-slate-700 text-xs font-bold cursor-pointer flex items-center gap-1.5 rounded-lg"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{t('পূর্ববর্তী ধাপ', 'Back')}</span>
                  </Button>

                  <Button
                    onClick={runAssessment}
                    disabled={loading || !sellerId}
                    className="h-9 px-5 bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 rounded-lg shadow-2xs"
                  >
                    {loading ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                        <span>{t('যাচাই করা হচ্ছে...', 'Running Assessment...')}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>{t('চূড়ান্ত রিপোর্ট তৈরি করুন', 'Generate Due Diligence Report')}</span>
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            )}

            {/* STEP 3: Due Diligence Report & Certificate */}
            {step === 3 && report && (
              <div className="space-y-3">
                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep(2)}
                    className="h-8 px-3 text-xs border-slate-300 text-slate-700 cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{t('তথ্য সংশোধন করুন', 'Edit Criteria')}</span>
                  </Button>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrint}
                      className="h-8 px-3 text-xs border-emerald-300 text-[#006A4E] hover:bg-emerald-50 cursor-pointer flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{t('রিপোর্ট প্রিন্ট', 'Print Report')}</span>
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => setShowCertModal(true)}
                      className="h-8 px-3 text-xs bg-[#006A4E] hover:bg-[#00553e] text-white font-bold cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <FileBadge className="w-3.5 h-3.5" />
                      <span>{t('ছাড়পত্র সনদ ডাউনলোড', 'Download Certificate')}</span>
                    </Button>
                  </div>
                </div>

                {/* Verdict Hero Banner with Speedometer Gauge */}
                <ResultHeroBanner report={report} />

                {/* CS -> SA -> RS -> BS Horizontal Lineage Timeline */}
                {report.khatian_chain && <KhatianChainTimeline chain={report.khatian_chain} />}

                {/* 5-Factor Due Diligence Assessment Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Factor 1: Bank Mortgage Lien */}
                  <Card className="bg-white border border-slate-200/90 rounded-xl p-3.5 sm:p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-[#006A4E]" />
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                          {t('ব্যাংক বন্ধক / ঋণ দায়বদ্ধতা', 'Bank Mortgage & Lien')}
                        </h3>
                      </div>
                      <Badge
                        className={
                          report.active_mortgages && report.active_mortgages.length > 0
                            ? 'bg-rose-100 text-rose-800 border-rose-300 text-[10px]'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]'
                        }
                      >
                        {report.active_mortgages && report.active_mortgages.length > 0
                          ? t('লিয়েন বিদ্যমান', 'Active Lien')
                          : t('দায়মুক্ত', 'Clean')}
                      </Badge>
                    </div>

                    {report.active_mortgages && report.active_mortgages.length > 0 ? (
                      <div className="space-y-1.5">
                        {report.active_mortgages.map((m: any) => (
                          <div key={m.id} className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs space-y-1">
                            <div className="font-bold text-rose-800 flex items-center gap-1">
                              <XOctagon className="w-3.5 h-3.5 text-rose-600" />
                              <span>{lang === 'bn' ? m.bank_name_bn : m.bank_name_en} ({m.branch_name})</span>
                            </div>
                            <div className="text-slate-800">
                              {t('ঋণের পরিমাণ:', 'Loan Amount:')} ৳{toBanglaDigits(Number(m.loan_amount_bdt || 0).toLocaleString())}
                            </div>
                            <p className="text-[10px] text-rose-700 font-bold pt-0.5">
                              {t('সতর্কতা: ঋণ পরিশোধের ডিজিটাল NOC ব্যতীত এই জমি সাব-রেজিস্ট্রিতে নিবন্ধনযোগ্য নয়।', 'Active lien prevents registration without official Digital NOC.')}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{t('এই দাগে তফসিলি ব্যাংকের কোনো সক্রিয় বন্ধক বা ঋণ দায়বদ্ধতা পাওয়া যায়নি।', 'No active mortgage liens recorded on this parcel.')}</span>
                      </div>
                    )}
                  </Card>

                  {/* Factor 2: Deed & Ledger History */}
                  <Card className="bg-white border border-slate-200/90 rounded-xl p-3.5 sm:p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#006A4E]" />
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                          {t('নিবন্ধিত দলিলের পূর্ব ইতিহাস', 'Registered Deed History')}
                        </h3>
                      </div>
                      <Badge className="bg-slate-100 text-slate-800 border-slate-300 text-[10px]">
                        {toBanglaDigits(report.deed_history?.length || 0)} {t('টি দলিল', 'deeds')}
                      </Badge>
                    </div>

                    {report.deed_history && report.deed_history.length > 0 ? (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {report.deed_history.map((d: any) => (
                          <div key={d.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-0.5">
                            <div className="flex justify-between font-bold text-slate-900">
                              <span className="font-mono">{d.deed_no}</span>
                              <span className="text-emerald-700">{d.status}</span>
                            </div>
                            <div className="text-slate-600">
                              {d.seller_name_bn} → {d.buyer_name_bn} ({toBanglaDigits(d.area_decimal)} {t('শতক', 'dec')})
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-slate-50 text-slate-600 text-xs">
                        {t('এই দাগের বিপরীতে কোনো পূর্ববর্তী হস্তান্তর ইতিহাস রেকর্ডভুক্ত নেই।', 'No prior deeds found in this ledger.')}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* PRINTABLE CLEARANCE CERTIFICATE MODAL */}
      <Dialog open={showCertModal} onOpenChange={setShowCertModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 border-2 border-[#006A4E] rounded-3xl bg-[#FCFBF7]">
          <DialogHeader className="border-b-2 border-emerald-900/20 pb-4 text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#006A4E] text-white flex items-center justify-center font-black text-xl shadow-md">
              ★
            </div>
            <DialogTitle className="text-lg sm:text-xl font-black text-[#006A4E]">
              {t('গণপ্রজাতন্ত্রী বাংলাদেশ সরকার', 'Government of the People’s Republic of Bangladesh')}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold text-slate-700">
              {t('ভূমি মন্ত্রণালয় ও আইন বিচার মন্ত্রণালয় · ভূমি সুরক্ষা ছাড়পত্র', 'Ministry of Land & Ministry of Law · Land Safety Clearance Certificate')}
            </DialogDescription>
            <div className="font-mono text-xs font-semibold text-slate-500 pt-1">
              {t('সনদ ট্র্যাকিং নং:', 'Cert Tracking No:')} BS-CERT-2026-{(report?.plot as any)?.dag_no || '101'}-4101
            </div>
          </DialogHeader>

          {/* Certificate Body */}
          <div className="space-y-4 py-3 text-xs leading-relaxed text-slate-800">
            {/* Status Callout */}
            <div
              className={`p-4 rounded-xl text-white font-bold flex items-center justify-between ${
                report?.status === 'SAFE'
                  ? 'bg-[#006A4E]'
                  : report?.status === 'WARNING'
                  ? 'bg-[#C4891A]'
                  : 'bg-[#FF3B4A]'
              }`}
            >
              <div>
                <div className="text-base font-black">
                  {lang === 'bn' ? report?.badge_bn : report?.badge_en}
                </div>
                <div className="text-xs opacity-90">
                  {lang === 'bn' ? report?.summary_bn : report?.summary_en}
                </div>
              </div>
              <ShieldCheck className="w-8 h-8 opacity-90 shrink-0" />
            </div>

            {/* Schedule of Property Table */}
            <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-xs">
              <div className="bg-emerald-50 px-3 py-2 font-bold text-emerald-900 border-b border-slate-200 text-xs">
                {t('তফসিলভুক্ত সম্পত্তির বিবরণ:', 'Schedule of Property Details:')}
              </div>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="py-2 px-3 text-xs text-slate-500 font-medium">
                      {t('মৌজা ও জেএল:', 'Mouza & JL:')}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-xs font-bold text-slate-900">
                      {(report?.plot as any)?.mouza_bn || 'ধামরাই'} ({t('জেএল', 'JL')} {(report?.plot as any)?.jl_no || '৪১০১'})
                    </TableCell>
                    <TableCell className="py-2 px-3 text-xs text-slate-500 font-medium">
                      {t('উপজেলা ও জেলা:', 'Upazila & District:')}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-xs font-bold text-slate-900">
                      {(report?.plot as any)?.upazila_bn || 'ধামরাই'}, ঢাকা
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-2 px-3 text-xs text-slate-500 font-medium">
                      {t('দাগ নম্বর:', 'Dag Number:')}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-xs font-bold font-mono text-[#006A4E]">
                      {(report?.plot as any)?.dag_no || '১০১'}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-xs text-slate-500 font-medium">
                      {t('খতিয়ান নম্বর:', 'Khatian Number:')}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-xs font-bold font-mono">
                      {(report?.plot as any)?.khatian_no || '৪১০১'} (বিএস)
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-2 px-3 text-xs text-slate-500 font-medium">
                      {t('বিক্রেতার নাম:', 'Seller Name:')}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-xs font-bold text-slate-900">
                      {activeSeller?.name_bn || 'মো. রফিকুল ইসলাম'}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-xs text-slate-500 font-medium">
                      {t('যাচাইকৃত পরিমাণ:', 'Evaluated Area:')}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-xs font-bold text-slate-900">
                      {toBanglaDigits(proposedArea)} {t('শতক', 'Decimals')}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Verification Affirmation */}
            <p className="text-[11px] text-slate-600 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
              {t(
                'প্রত্যয়ন করা যাচ্ছে যে, উপরোক্ত দাগের মালিকানা শৃঙ্খল (CS→SA→RS→BS), ব্যাংক লিয়েন ও দেওয়ানি বিরোধ যাচাইয়ে উল্লেখিত ফলাফল পাওয়া গেছে। দলিল নিবন্ধনের চূড়ান্ত বৈধতা সাব-রেজিস্ট্রারের বিচারিক আদেশের ওপর নির্ভরশীল।',
                'This certifies that ownership continuity (CS->SA->RS->BS), bank liens, and litigation records were checked against current ledger databases.'
              )}
            </p>
          </div>

          <DialogFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowCertModal(false)}
              className="cursor-pointer"
            >
              {t('বন্ধ করুন', 'Close')}
            </Button>

            <Button
              onClick={handlePrint}
              className="bg-[#006A4E] hover:bg-[#00553e] text-white font-bold cursor-pointer flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>{t('সনদ প্রিন্ট / সংরক্ষণ করুন', 'Print / Save Certificate')}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
