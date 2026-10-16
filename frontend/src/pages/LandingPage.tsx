import React, { useState, useEffect } from 'react';
import { useAppUI, UserRole } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import {
  ShieldCheck,
  QrCode,
  Search,
  Landmark,
  FileSpreadsheet,
  Building2,
  Lock,
  ArrowRight,
  Check,
  X,
  FileText,
  Scale,
  HelpCircle,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  XOctagon,
  KeyRound
} from 'lucide-react';

const ROLE_ROUTE: Record<UserRole, string> = {
  citizen: 'home',
  sub_registrar: 'registrar',
  ac_land: 'acland',
  bank_officer: 'bank',
  admin: 'admin',
};

export const LandingPage: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { lang, setRole, setUser, setToken, t } = useAppUI();
  const [stats, setStats] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);
  
  // Track/Search Card state
  const [searchType, setSearchType] = useState<'deed' | 'plot'>('deed');
  const [trackInput, setTrackInput] = useState('DL-2026-1001');
  const [selectedMouza, setSelectedMouza] = useState<number>(1);
  const [selectedPlotId, setSelectedPlotId] = useState<number>(1);

  useEffect(() => {
    Promise.all([
      BhumiApi.getStatsSummary(),
      BhumiApi.getLocations(),
      BhumiApi.getPlots(),
      BhumiApi.getDemoScenarios(),
    ])
      .then(([st, locs, plts, scns]) => {
        setStats(st);
        setLocations(locs);
        setPlots(plts);
        setScenarios(scns);
      })
      .catch(() => {});
  }, []);

  const enterRolePortal = async (targetRole: UserRole) => {
    try {
      const res = await BhumiApi.switchDemoRole(targetRole);
      if (res?.access_token && res?.user) {
        setToken(res.access_token);
        setUser(res.user);
      } else {
        setRole(targetRole);
      }
    } catch {
      setRole(targetRole);
    }
    onNavigate(ROLE_ROUTE[targetRole]);
  };

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchType === 'deed') {
      onNavigate('qr');
    } else {
      onNavigate('check');
    }
  };

  const filteredPlots = plots.filter((p) => Number(p.mouza_id) === Number(selectedMouza));

  const coreServices = [
    {
      id: 'check',
      title_bn: 'জমি কেনার আগে যাচাই',
      title_en: 'Check Before You Buy',
      desc_bn: 'বায়না করার আগে দাগ নম্বর ও বিক্রেতার এনআইডি দিয়ে মালিকানা, প্রাপ্য অংশ ও ঋণের সঠিকতা জানুন',
      desc_en: 'Verify seller ownership, share balance, and active liens before paying earnest money',
      icon: <Search className="w-6 h-6" />,
      action: () => onNavigate('check')
    },
    {
      id: 'qr',
      title_bn: 'দলিল QR কোড ও সনদ যাচাই',
      title_en: 'Verify Deed QR Code',
      desc_bn: 'দলিলের গায়ে থাকা QR স্ক্যান করে Ed25519 স্বাক্ষর ও লেজারে কোনো পরিবর্তন (Tamper) হয়েছে কি না দেখুন',
      desc_en: 'Scan deed QR code to verify Ed25519 signature and SHA-256 ledger tamper-proof integrity',
      icon: <QrCode className="w-6 h-6" />,
      action: () => onNavigate('qr')
    },
    {
      id: 'vault',
      title_bn: 'নাগরিক ডিজিটাল বিক্রয় লক',
      title_en: 'Citizen Sale Lock Vault',
      desc_bn: 'প্রবাসী ও প্রবীণ নাগরিকদের জমি অননুমোদিত বা জাল দলিল হস্তান্তর থেকে বায়োমেট্রিক লকে সুরক্ষিত রাখা',
      desc_en: 'Protect ancestral land from fraudulent deeds and power-of-attorney using biometric locks',
      icon: <Lock className="w-6 h-6" />,
      action: () => enterRolePortal('citizen')
    },
    {
      id: 'gatekeeper',
      title_bn: 'সাব-রেজিস্ট্রার প্রাক-নিবন্ধন গেটকিপার',
      title_en: 'Sub-Registrar 11-Rule Gatekeeper',
      desc_bn: 'দলিল নিবন্ধনের পূর্বে স্বয়ংক্রিয় ১১টি ফ্রড রুলস স্ক্যান, স্থগিত দলিল শুনানি ও সরকারি রাজস্ব হিসাব',
      desc_en: 'Run 11 automated fraud prevention checks, resolve HELD deeds, and calculate stamp duty',
      icon: <FileSpreadsheet className="w-6 h-6" />,
      action: () => enterRolePortal('sub_registrar')
    },
    {
      id: 'mutation',
      title_bn: 'স্বয়ংক্রিয় ই-মিউটেশন কিউ',
      title_en: 'Instant e-Mutation Queue',
      desc_bn: 'সাব-রেজিস্ট্রিতে দলিল রেজিস্ট্রি মাত্রই এসি ল্যান্ডের কিউতে নামজারি প্রেরণ ও বিএস খতিয়ান সমন্বয়',
      desc_en: 'Instant automated handoff from registration to AC Land queue with BS khatian updates',
      icon: <Landmark className="w-6 h-6" />,
      action: () => enterRolePortal('ac_land')
    },
    {
      id: 'bank',
      title_bn: 'ব্যাংক জামানত ও ডিজিটাল ছাড়পত্র',
      title_en: 'Bank Lien & Digital NOC',
      desc_bn: 'একই জমিতে একাধিক ব্যাংকের দ্বৈত বন্ধক প্রতিরোধ এবং ঋণ পরিশোধে QR-যুক্ত ডিজিটাল NOC ইস্যু',
      desc_en: 'Prevent duplicate mortgages across banks and issue cryptographic digital NOC certificates',
      icon: <Building2 className="w-6 h-6" />,
      action: () => enterRolePortal('bank_officer')
    },
    {
      id: 'ocr',
      title_bn: 'পুরাতন খতিয়ান ডিজিটাইজেশন (OCR)',
      title_en: 'Legacy Khatian Digitization Assist',
      desc_bn: 'স্ক্যানকৃত ঐতিহাসিক সিএস ও আরএস খতিয়ানের হস্তাক্ষর থেকে বাংলা এআই এক্সট্রাকশন ও অফিসার রিভিউ',
      desc_en: 'Bangla OCR extraction for historical CS & RS physical records with officer review workflow',
      icon: <FileText className="w-6 h-6" />,
      action: () => enterRolePortal('admin')
    },
    {
      id: 'dispute',
      title_bn: 'নাগরিক বিরোধ ট্রাইব্যুনাল',
      title_en: 'Citizen Dispute Tribunal',
      desc_bn: 'ওয়ারিশ জালিয়াতি বা সীমা বিরোধের ক্ষেত্রে এসি ল্যান্ড কোর্টে তাৎক্ষণিক জমি ফ্রিজ বা নিষ্পত্তির আবেদন',
      desc_en: 'Emergency plot freeze and formal tribunal hearing for boundary disputes and heir fraud',
      icon: <Scale className="w-6 h-6" />,
      action: () => enterRolePortal('ac_land')
    },
    {
      id: 'help',
      title_bn: 'সহায়িকা ও হেল্পলাইন ১৬১২২',
      title_en: 'Help Center & Land Glossary',
      desc_bn: 'সিএস, এসএ, আরএস, বিএস জরিপ ও দলিলের আইনি পরিভাষা এবং সরকারি অভিযোগ প্রতিকার সেল',
      desc_en: 'Comprehensive guide to land terminology, survey epochs, and national helpline access',
      icon: <HelpCircle className="w-6 h-6" />,
      action: () => onNavigate('help')
    }
  ];

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section — Styled after bcc.zohirrayhan.com */}
      <section className="relative overflow-hidden bg-[#074f38] text-white">
        {/* Ambient Blur Circles */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-amber-500/15 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-[1.3fr_1fr] lg:py-20 items-center">
          {/* Left Text Block */}
          <div>
            <p className="mb-3.5 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs md:text-sm text-emerald-100 ring-1 ring-white/20 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t('সকল ভূমি ও দলিল সেবা এক প্ল্যাটফর্মে', 'Centralized Land & Deed Trust Platform')}</span>
            </p>

            <h1 className="text-3xl font-bold leading-tight sm:text-5xl tracking-tight text-white">
              {t('আপনার জমির নিরাপত্তা, এখন এক জায়গায়', 'Secure Land Verification & Deed Protection in One Place')}
            </h1>

            <p className="mt-4 max-w-xl text-base sm:text-lg text-emerald-100/90 leading-relaxed font-normal">
              {t(
                'কোন অফিসে যেতে হবে তা জানার দরকার নেই। বায়না করার আগেই মালিকানা যাচাই করুন, দলিল টেম্পার সনাক্ত করুন, বিক্রয় লক করুন এবং নামজারি ট্র্যাক করুন — ঘরে বসেই।',
                'No need to run between offices. Check ownership, detect tampered deeds, freeze plots with citizen sale locks, and track e-mutation — all from home.'
              )}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate('check')}
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-5 font-bold text-[#074f38] hover:bg-emerald-50 shadow-sm transition-all cursor-pointer"
              >
                <Search className="w-5 h-5 text-[#074f38]" />
                <span>{t('জমি কেনার আগে যাচাই', 'Check Before You Buy')}</span>
              </button>

              <button
                onClick={() => onNavigate('qr')}
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-white/10 px-5 font-semibold text-white ring-1 ring-white/30 hover:bg-white/20 transition-all cursor-pointer"
              >
                <QrCode className="w-5 h-5 text-emerald-300" />
                <span>{t('দলিল QR কোড যাচাই', 'Verify Deed QR Code')}</span>
              </button>
            </div>
          </div>

          {/* Right Card — Track Deed or Plot (Matching bcc.zohirrayhan.com) */}
          <div className="rounded-2xl border border-gray-200/90 bg-white shadow-xl self-center p-6 text-slate-800">
            <h2 className="text-lg font-bold text-slate-900">
              {t('আবেদন বা দলিলের অবস্থা জানুন', 'Track Deed or Verify Plot')}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {t(
                'দলিল নম্বর দিন, যেমন DL-2026-1001 বা দাগ নম্বর ১০১',
                'Enter Deed Number like DL-2026-1001 or Plot Dag 101'
              )}
            </p>

            {/* Toggle Search Mode */}
            <div className="flex gap-1.5 mt-4 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setSearchType('deed')}
                className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer min-h-[34px] ${
                  searchType === 'deed' ? 'bg-white text-[#074f38] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('দলিল নম্বর / QR', 'Deed Number / QR')}
              </button>
              <button
                type="button"
                onClick={() => setSearchType('plot')}
                className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer min-h-[34px] ${
                  searchType === 'plot' ? 'bg-white text-[#074f38] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('দাগ নম্বর যাচাই', 'Plot Dag Check')}
              </button>
            </div>

            <form onSubmit={handleHeroSearch} className="mt-4 space-y-3">
              {searchType === 'deed' ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={trackInput}
                    onChange={(e) => setTrackInput(e.target.value)}
                    placeholder="DL-2026-1001"
                    className="h-11 min-w-0 flex-1 rounded-lg border border-gray-300 px-3 font-mono text-sm uppercase focus:border-[#074f38] focus:outline-none focus:ring-2 focus:ring-[#074f38]/30"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg font-bold h-11 px-5 bg-[#006A4E] hover:bg-[#00553e] text-white transition-colors cursor-pointer text-sm shadow-xs"
                  >
                    <Search className="w-4 h-4" />
                    <span>{t('খুঁজুন', 'Search')}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={selectedMouza}
                      onChange={(e) => {
                        const mId = Number(e.target.value);
                        setSelectedMouza(mId);
                        const first = plots.find((p) => Number(p.mouza_id) === mId);
                        if (first) setSelectedPlotId(first.id);
                      }}
                      className="h-10 rounded-lg border border-gray-300 px-2 text-xs font-semibold bg-white"
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {lang === 'bn' ? loc.mouza_bn : loc.mouza_en}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedPlotId}
                      onChange={(e) => setSelectedPlotId(Number(e.target.value))}
                      className="h-10 rounded-lg border border-gray-300 px-2 text-xs font-semibold bg-white"
                    >
                      {filteredPlots.map((p) => (
                        <option key={p.id} value={p.id}>
                          {t('দাগ', 'Dag')} {p.dag_no}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg font-bold h-10 bg-[#006A4E] hover:bg-[#00553e] text-white transition-colors cursor-pointer text-xs shadow-xs"
                  >
                    <Search className="w-4 h-4" />
                    <span>{t('দাগের পূর্ণ বিবরণী ও ঝুঁকি স্ক্যান', 'Scan Plot Risk Report')}</span>
                  </button>
                </div>
              )}
            </form>

            {/* Quick Preset Links (like bcc.zohirrayhan.com) */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => onNavigate('qr')}
                className="rounded-lg bg-slate-50 border border-slate-200/90 p-2.5 hover:bg-emerald-50 text-slate-700 font-semibold text-left transition-colors flex items-center justify-between cursor-pointer min-h-[36px]"
              >
                <span className="truncate">DL-2026-1001 (অক্ষত)</span>
                <span className="text-emerald-700 font-bold ml-1">→</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('qr')}
                className="rounded-lg bg-slate-50 border border-slate-200/90 p-2.5 hover:bg-rose-50 text-slate-700 font-semibold text-left transition-colors flex items-center justify-between cursor-pointer min-h-[36px]"
              >
                <span className="truncate">DL-2026-1005 (টেম্পার)</span>
                <span className="text-rose-600 font-bold ml-1">→</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('check')}
                className="rounded-lg bg-slate-50 border border-slate-200/90 p-2.5 hover:bg-emerald-50 text-slate-700 font-semibold text-left transition-colors flex items-center justify-between cursor-pointer min-h-[36px]"
              >
                <span className="truncate">দাগ ১০১ (ধানমন্ডি)</span>
                <span className="text-emerald-700 font-bold ml-1">→</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('check')}
                className="rounded-lg bg-slate-50 border border-slate-200/90 p-2.5 hover:bg-amber-50 text-slate-700 font-semibold text-left transition-colors flex items-center justify-between cursor-pointer min-h-[36px]"
              >
                <span className="truncate">দাগ ১০৬ (বন্ধকী দাগ)</span>
                <span className="text-amber-700 font-bold ml-1">→</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* KPI Stats Strip — Simple & Clean */}
      {stats && (
        <section className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              [t('নিবন্ধিত দাগ', 'Plots Monitored'), stats.kpis?.total_plots ?? 60],
              [t('ডিজিটাল খতিয়ান', 'Khatians Indexed'), stats.kpis?.total_khatians ?? 240],
              [t('স্বাক্ষরিত দলিল', 'Deeds Chained'), stats.kpis?.total_deeds ?? 80],
              [t('সক্রিয় ব্যাংক বন্ধক', 'Active Liens'), stats.kpis?.active_mortgages_count ?? 6],
              [t('ই-মিউটেশন সম্পন্ন', 'Mutations Done'), stats.kpis?.pending_mutations ?? 8],
              [t('দাপ্তরিক কর্মকর্তা', 'Active Officers'), stats.kpis?.total_users ?? 7],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs">
                <div className="text-xl sm:text-2xl font-extrabold text-[#074f38] font-mono">
                  {toBanglaDigits(value as number, lang)}
                </div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Core Services Grid — Styled Exactly Like bcc.zohirrayhan.com */}
      <section className="mx-auto max-w-7xl px-4">
        <div className="mb-6 flex items-end justify-between gap-4 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
              {t('সেবাসমূহ', 'Services')}
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              {t('আপনার প্রয়োজনীয় ভূমি সেবা নির্বাচন করুন', 'Select your required land & deed service')}
            </p>
          </div>
          <button
            onClick={() => onNavigate('check')}
            className="hidden text-xs sm:text-sm font-semibold text-emerald-800 hover:text-emerald-950 sm:flex items-center gap-1 cursor-pointer"
          >
            <span>{t('সকল সেবা ও ওয়ার্কস্পেস', 'All Services & Workspaces')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coreServices.map((srv) => (
            <div
              key={srv.id}
              onClick={srv.action}
              className="group rounded-xl border border-gray-200 bg-white shadow-card flex gap-4 p-5 transition hover:border-emerald-400 hover:shadow-md cursor-pointer"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 group-hover:bg-[#006A4E] group-hover:text-white transition-colors shadow-2xs">
                {srv.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between font-bold text-slate-900 text-sm sm:text-base">
                  <span>{lang === 'bn' ? srv.title_bn : srv.title_en}</span>
                  <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100 text-emerald-700 shrink-0" />
                </span>
                <span className="mt-1 block text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                  {lang === 'bn' ? srv.desc_bn : srv.desc_en}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 5 Role Workspaces Gateways */}
      <section className="mx-auto max-w-7xl px-4">
        <div className="mb-6 border-b border-slate-200 pb-3">
          <h2 className="text-2xl font-bold text-slate-900">
            {t('পাঁচটি দাপ্তরিক ও নাগরিক ওয়ার্কস্পেস', 'Five Role Workspaces')}
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            {t(
              'নাগরিক থেকে জাতীয় অ্যাডমিন — প্রতিটি প্যানেলে নিজস্ব কার্যক্ষমতা ও নিয়ন্ত্রণ:',
              'From citizen vault to national audit — each panel features dedicated controls:'
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              role: 'citizen' as UserRole,
              icon: <ShieldCheck className="w-5 h-5" />,
              title: t('নাগরিক ভল্ট', 'Citizen Vault'),
              desc: t('মালিকানা, বিক্রয় লক ও বিরোধ দাখিল', 'Sale locks & complaints'),
              dept: t('নাগরিক পোর্টাল', 'Citizen Portal')
            },
            {
              role: 'sub_registrar' as UserRole,
              icon: <FileSpreadsheet className="w-5 h-5" />,
              title: t('সাব-রেজিস্ট্রার', 'Sub-Registrar'),
              desc: t('১১-রুল গেটকিপার ও রাজস্ব শুল্ক', '11-rule gatekeeper'),
              dept: t('নিবন্ধন অধিদপ্তর', 'Registration Dept')
            },
            {
              role: 'ac_land' as UserRole,
              icon: <Landmark className="w-5 h-5" />,
              title: t('এসি ল্যান্ড', 'AC Land'),
              desc: t('ই-মিউটেশন ও বিরোধ ট্রাইব্যুনাল', 'e-Mutation & Tribunal'),
              dept: t('উপজেলা ভূমি অফিস', 'Land Revenue Office')
            },
            {
              role: 'bank_officer' as UserRole,
              icon: <Building2 className="w-5 h-5" />,
              title: t('ব্যাংক কর্মকর্তা', 'Bank Officer'),
              desc: t('জামানত লিয়েন ও ডিজিটাল NOC', 'Liens & Digital NOC'),
              dept: t('তফসিলি ব্যাংক', 'Scheduled Banks')
            },
            {
              role: 'admin' as UserRole,
              icon: <Lock className="w-5 h-5" />,
              title: t('সিস্টেম অ্যাডমিন', 'System Admin'),
              desc: t('RBAC, লেজার ল্যাব ও অডিট লগ', 'RBAC & Audit Trail'),
              dept: t('জাতীয় গভর্ন্যান্স', 'National Governance')
            },
          ].map((item) => (
            <div
              key={item.role}
              onClick={() => enterRolePortal(item.role)}
              className="rounded-xl border border-slate-200 bg-white p-5 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#006A4E] group-hover:bg-[#006A4E] group-hover:text-white flex items-center justify-center transition-colors">
                  {item.icon}
                </div>
                <div className="text-[10px] uppercase font-bold text-slate-400 mt-3">{item.dept}</div>
                <h3 className="font-bold text-base text-slate-900 mt-0.5">{item.title}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#006A4E]">
                <span>{t('প্যানেল খুলুন', 'Open Workspace')}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Live Demo Scenarios for Evaluators */}
      {scenarios.length > 0 && (
        <section className="mx-auto max-w-7xl px-4">
          <div className="mb-6 border-b border-slate-200 pb-3 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {t('লাইভ রেফারেন্স টেস্ট সিনারিও', 'Live Test Scenarios')}
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                {t(
                  'বিচারক ও পরীক্ষকদের জন্য ১-ক্লিক ঝুঁকি ও জালিয়াতি সনাক্তকরণ পরীক্ষা:',
                  'One-click fraud prevention test scenarios for hackathon evaluators:'
                )}
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-[#E6F2EE] text-[#006A4E] hidden sm:inline-block">
              8 Standard Cases
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {scenarios.map((sc) => {
              const isSafe = sc.badge_type === 'SAFE';
              const isWarn = sc.badge_type === 'WARNING';
              return (
                <div
                  key={sc.code}
                  onClick={() => onNavigate('check')}
                  className={`rounded-xl border bg-white p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer border-l-4 flex flex-col justify-between ${
                    isSafe
                      ? 'border-l-[#006A4E] border-slate-200'
                      : isWarn
                      ? 'border-l-amber-500 border-slate-200'
                      : 'border-l-rose-500 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400">#{sc.code}</span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isSafe
                            ? 'bg-emerald-100 text-emerald-800'
                            : isWarn
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {sc.badge_type}
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 mt-2 line-clamp-2">
                      {lang === 'bn' ? sc.title_bn : sc.title_en}
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-bold text-emerald-800 flex items-center justify-between">
                    <span>{t('কেস পরীক্ষা করুন', 'Run Test')}</span>
                    <span>→</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Trust Pipeline — 3 Simple Steps */}
      <section className="bg-slate-50 border-y border-slate-200 py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="max-w-2xl mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
              {t('তিন ধাপে সম্পূর্ণ সেবা ও আস্থা', 'Complete Trust in Three Steps')}
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              {t(
                'বায়না থেকে খতিয়ান হালনাগাদ — প্রতিটি ধাপ ডিজিটালভাবে সুরক্ষিত:',
                'From agreement to BS khatian update — mathematically unbroken continuity:'
              )}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '১',
                title: t('নাগরিক প্রাক-অনুসন্ধান', '1. Citizen Pre-Check'),
                desc: t(
                  'বায়নার পূর্বে খতিয়ান চেইন (CS→SA→RS→BS), বিক্রেতার প্রাপ্য অংশ ও বন্ধক মুক্ততা পরীক্ষা।',
                  'Verify survey lineage, seller share balance, and active bank mortgages before contract.'
                ),
                color: 'text-emerald-700 bg-emerald-100'
              },
              {
                step: '২',
                title: t('১১-রুল গেটকিপার স্ক্যান', '2. 11-Rule Gatekeeper'),
                desc: t(
                  'সাব-রেজিস্ট্রির ডেস্কে স্বয়ংক্রিয় ১১টি রুল যাচাই, দ্বৈত রেজিস্ট্রি ব্লক ও সরকারি ফি চালানের হিসাব।',
                  'Automated gatekeeper rule execution, double registry prevention, and treasury challans.'
                ),
                color: 'text-blue-700 bg-blue-100'
              },
              {
                step: '৩',
                title: t('Ed25519 লেজার ও ই-মিউটেশন', '3. Signed Ledger & Mutation'),
                desc: t(
                  'ডিজিটাল স্বাক্ষর, অপরিবর্তনীয় SHA-256 হ্যাশ চেইন ও এসি ল্যান্ডের কিউতে তাৎক্ষণিক নামজারি।',
                  'Ed25519 cryptographic signing, hash-chain ledger, and automated e-mutation queuing.'
                ),
                color: 'text-purple-700 bg-purple-100'
              },
            ].map((st) => (
              <div key={st.step} className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${st.color}`}>
                  {st.step}
                </div>
                <h3 className="text-base font-bold text-slate-900">{st.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Structural Comparison Matrix */}
      <section className="mx-auto max-w-7xl px-4">
        <div className="mb-6 border-b border-slate-200 pb-3">
          <h2 className="text-2xl font-bold text-slate-900">
            {t('প্রচলিত ম্যানুয়াল রেজিস্ট্রি বনাম ভূমি সুরক্ষা', 'Manual Registry vs BhumiShield')}
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            {t(
              'বাংলাদেশের প্রচলিত ভূমি ব্যবস্থাপনার ৫টি প্রধান ফাঁক যেখানে সিস্টেম প্রতিরোধ গড়ে তোলে:',
              'The 5 major land loopholes in Bangladesh eliminated by BhumiShield:'
            )}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
                <th className="py-3 px-4 font-bold">{t('জালিয়াতির ঝুঁকি', 'Fraud Risk')}</th>
                <th className="py-3 px-4 font-bold">{t('প্রচলিত রেজিস্ট্রি ব্যবস্থা', 'Traditional Manual Way')}</th>
                <th className="py-3 px-4 font-bold text-[#006A4E]">{t('ভূমি সুরক্ষা ট্রাস্ট লেয়ার', 'BhumiShield Solution')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                [
                  t('একই জমি বারবার বিক্রি (Double Sale)', 'Double Sale Fraud'),
                  t('বালাম বই হালনাগাদে সপ্তাহ/মাস লাগে; একই দিনে একাধিক অফিসে বিক্রি সম্ভব', 'Slow volume updates; same land can be sold to multiple victims'),
                  t('রিয়েল-টাইম বিক্রেতার অংশ ব্লক ও লক; একই দিনে ডুপ্লিকেট দলিল বন্ধ', 'Real-time share deduction; immediate duplicate registration block')
                ],
                [
                  t('জাল আমমোক্তারনামা (Forged POA)', 'Forged POA / Absentee Fraud'),
                  t('প্রবাসে বা দূরে থাকলে ভুয়া কাগজপত্র দিয়ে জমি আত্মসাতের সুযোগ', 'Absentee owners easily forged by land grabbers'),
                  t('নাগরিক বায়োমেট্রিক বিক্রয় লক; মালিকের OTP ছাড়া রেজিস্ট্রি সম্পূর্ণ অসম্ভব', 'Citizen Sale Lock; strictly aborted until owner unlocks')
                ],
                [
                  t('খতিয়ান চেইন ফাঁকি (Lineage Break)', 'Lineage Manipulation'),
                  t('ম্যানুয়ালি সিএস-এসএ-আরএস মিলিয়ে দেখা অসম্ভব; ভুয়া পরচা ব্যবহার', 'Manual verification impossible; fake khatian sheets forged'),
                  t('সিএস (১৯৪০) → বিএস (২০১২) খতিয়ানের মোট জমি ও ফারায়েজ গাণিতিক নিরীক্ষা', 'CS to BS survey area continuity & Islamic inheritance audit')
                ],
                [
                  t('বন্ধকী জমি গোপনে বিক্রি (Mortgaged Sale)', 'Mortgaged Plot Sale'),
                  t('ব্যাংক ও সাব-রেজিস্ট্রির মধ্যে কোনো সংযোগ নেই; তথ্য লুকানো সহজ', 'No link between commercial banks and registry offices'),
                  t('কেন্দ্রীয় ডিজিটাল লিয়েন লক ও ঋণ পরিশোধের পর Ed25519 স্বাক্ষরিত NOC', 'Central real-time lien check & cryptographic clearance NOC')
                ],
                [
                  t('বালাম বই টেম্পারিং (Record Alteration)', 'Physical Record Tampering'),
                  t('অফিসের বালাম বইয়ের পাতা ছিঁড়ে বা ঘষামাজা করে দলিল পরিবর্তন সম্ভব', 'Physical register books can be altered by corrupt staff'),
                  t('SHA-256 হ্যাশ চেইন ও Ed25519 ডিজিটাল স্বাক্ষর; ১টি অক্ষর পরিবর্তনও ধরা পড়ে', 'SHA-256 hash chaining; altering 1 byte breaks the chain')
                ]
              ].map(([risk, traditional, solution], idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-800">{risk}</td>
                  <td className="py-3.5 px-4 text-slate-600">
                    <span className="inline-flex items-center gap-1.5 text-rose-700">
                      <X className="w-4 h-4 shrink-0" />
                      <span>{traditional}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    <span className="inline-flex items-center gap-1.5 text-emerald-800">
                      <Check className="w-4 h-4 shrink-0 font-bold" />
                      <span>{solution}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Emergency Helpline Banner (Matching bcc.zohirrayhan.com) */}
      <section className="mx-auto max-w-7xl px-4">
        <div className="rounded-2xl bg-gradient-to-r from-[#074f38] to-[#043324] text-white p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-1.5 text-center md:text-left">
            <div className="inline-flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <PhoneCall className="w-4 h-4" />
              <span>{t('সরকারি ভূমি সেবা ও অভিযোগ হটলাইন', 'Government Land Helpline & Grievance Cell')}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold">
              {t('যে কোনো জমি প্রতারণার তাৎক্ষণিক তথ্য দিন', 'Report Land Registry Malpractice Instantly')}
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/80 max-w-xl">
              {t(
                'টোল-ফ্রি হটলাইন ১৬১২২ এ কল করে সরাসরি ভূমি মন্ত্রণালয়ের সেবা নিন। ২৪ ঘণ্টা সেবা চালু রয়েছে।',
                'Call toll-free 16122 for direct assistance from the Ministry of Land. Service available 24/7.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/10 px-5 py-3 rounded-xl text-center border border-white/20">
              <span className="text-[10px] text-emerald-200 block uppercase font-bold tracking-wider">Toll Free</span>
              <span className="text-2xl font-extrabold font-mono tracking-wider text-white">১৬১২২</span>
            </div>
            <button
              onClick={() => onNavigate('help')}
              className="px-5 py-3 rounded-xl bg-white text-[#074f38] hover:bg-emerald-50 font-bold text-xs cursor-pointer shadow-sm transition-colors min-h-[46px]"
            >
              {t('সহায়িকা ও FAQ →', 'Help & FAQ →')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
