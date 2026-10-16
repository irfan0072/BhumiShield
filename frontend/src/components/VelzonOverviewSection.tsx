import React, { useState } from 'react';
import { useAppUI, UserRole } from '../i18n';
import { toBanglaDigits } from '../theme/tokens';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  PlusCircle,
  Activity,
  FileSpreadsheet,
  Landmark,
  ShieldCheck,
  Building2,
  Lock,
  AlertTriangle,
  Download,
  CheckCircle2,
  Clock,
  Star,
} from 'lucide-react';

interface VelzonOverviewProps {
  role: UserRole;
  stats: any;
  onQuickAction: (actionTab: string) => void;
}

export const VelzonOverviewSection: React.FC<VelzonOverviewProps> = ({
  role,
  stats,
  onQuickAction,
}) => {
  const { lang, user, t } = useAppUI();
  const [chartRange, setChartRange] = useState<'ALL' | '1M' | '6M' | '1Y'>('1Y');

  const kpis = stats?.kpis || {
    total_plots: 60,
    total_khatians: 240,
    total_deeds: 80,
    total_deed_value_bdt: 48500000,
    locked_plots_count: 4,
    open_disputes_count: 3,
    pending_mutations: 8,
    approved_mutations: 52,
    active_mortgages_count: 6,
    released_mortgages_count: 4,
    active_mortgages_bdt: 18500000,
    total_users: 7,
  };

  const monthlySeries = stats?.monthly_series || [
    { month: 'Jan', month_bn: 'জানু', deeds: 48, mutations: 42, blocked_risks: 4 },
    { month: 'Feb', month_bn: 'ফেব্রু', deeds: 62, mutations: 55, blocked_risks: 6 },
    { month: 'Mar', month_bn: 'মার্চ', deeds: 54, mutations: 49, blocked_risks: 5 },
    { month: 'Apr', month_bn: 'এপ্রিল', deeds: 78, mutations: 68, blocked_risks: 9 },
    { month: 'May', month_bn: 'মে', deeds: 65, mutations: 58, blocked_risks: 4 },
    { month: 'Jun', month_bn: 'জুন', deeds: 71, mutations: 64, blocked_risks: 7 },
    { month: 'Jul', month_bn: 'জুলাই', deeds: 52, mutations: 47, blocked_risks: 3 },
    { month: 'Aug', month_bn: 'আগস্ট', deeds: 44, mutations: 39, blocked_risks: 5 },
    { month: 'Sep', month_bn: 'সেপ্টে', deeds: 74, mutations: 67, blocked_risks: 8 },
    { month: 'Oct', month_bn: 'অক্টো', deeds: 80, mutations: 71, blocked_risks: 7 },
    { month: 'Nov', month_bn: 'নভে', deeds: 69, mutations: 63, blocked_risks: 5 },
    { month: 'Dec', month_bn: 'ডিসে', deeds: 58, mutations: 53, blocked_risks: 4 },
  ];

  const mouzaBreakdown = stats?.mouza_breakdown || [
    {
      id: 1,
      mouza_bn: 'সাভার সদর',
      mouza_en: 'Savar Sadar',
      upazila_bn: 'সাভার',
      plot_count: 20,
      verification_coverage_pct: 92,
    },
    {
      id: 2,
      mouza_bn: 'বিরুলিয়া',
      mouza_en: 'Birulia',
      upazila_bn: 'সাভার',
      plot_count: 20,
      verification_coverage_pct: 84,
    },
    {
      id: 3,
      mouza_bn: 'ধামরাই দক্ষিণ',
      mouza_en: 'Dhamrai South',
      upazila_bn: 'ধামরাই',
      plot_count: 20,
      verification_coverage_pct: 78,
    },
  ];

  const recentActivity = stats?.recent_activity || [];

  const displayName = user
    ? lang === 'bn'
      ? user.full_name_bn
      : user.full_name_en
    : t('দাপ্তরিক কর্মকর্তা', 'Authorized Officer');

  // Role-specific KPI card definitions matching Velzon style
  const getRoleKpiCards = () => {
    if (role === 'sub_registrar') {
      return [
        {
          label: t('মোট নিবন্ধিত দলিল', 'TOTAL REGISTERED DEEDS'),
          trend: '+18.24%',
          up: true,
          value: toBanglaDigits(kpis.total_deeds, lang),
          linkText: t('দলিল রেজিস্টার দেখুন', 'View deed register'),
          targetTab: 'registrar',
          icon: <FileSpreadsheet className="w-5 h-5 text-[#006A4E]" />,
          iconBg: 'bg-[#E6F2EE]',
        },
        {
          label: t('আদায়কৃত সরকারি রাজস্ব ও শুল্ক', 'GOVT STAMP & TAX REVENUE'),
          trend: '+14.80%',
          up: true,
          value: `৳${toBanglaDigits('3.64', lang)} Cr`,
          linkText: t('শুল্ক বিবরণী দেখুন', 'Calculate stamp fees'),
          targetTab: 'registrar',
          icon: <Landmark className="w-5 h-5 text-blue-600" />,
          iconBg: 'bg-blue-50',
        },
        {
          label: t('ঝুঁকিপূর্ণ ও স্থগিত দলিল (HELD)', 'HELD / FLAGGED DEEDS'),
          trend: '-4.12%',
          up: false,
          value: toBanglaDigits(6, lang),
          linkText: t('হোল্ড কিউ পর্যালোচনা', 'Review held deeds'),
          targetTab: 'registrar',
          icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
          iconBg: 'bg-amber-50',
        },
        {
          label: t('ক্রিপ্টোগ্রাফিক লেজার অখণ্ডতা', 'HASH LEDGER INTEGRITY'),
          trend: '+100.0%',
          up: true,
          value: `${toBanglaDigits('98.8', lang)}%`,
          linkText: t('হ্যাশ চেইন যাচাই করুন', 'Verify hash chain'),
          targetTab: 'qr',
          icon: <ShieldCheck className="w-5 h-5 text-emerald-700" />,
          iconBg: 'bg-emerald-100',
        },
      ];
    }

    if (role === 'ac_land') {
      return [
        {
          label: t('অপেক্ষমাণ ই-নামজারি কেস', 'PENDING E-MUTATIONS'),
          trend: '-6.40%',
          up: true,
          value: toBanglaDigits(kpis.pending_mutations || 8, lang),
          linkText: t('নামজারি কিউ দেখুন', 'Process mutations'),
          targetTab: 'acland',
          icon: <Clock className="w-5 h-5 text-amber-600" />,
          iconBg: 'bg-amber-50',
        },
        {
          label: t('সমন্বিত খতিয়ান রেকর্ড (CS-BS)', 'RECONCILED KHATIAN RECORDS'),
          trend: '+22.15%',
          up: true,
          value: toBanglaDigits(kpis.total_khatians, lang),
          linkText: t('খতিয়ান চেইন দেখুন', 'Reconcile khatians'),
          targetTab: 'acland',
          icon: <Landmark className="w-5 h-5 text-[#006A4E]" />,
          iconBg: 'bg-[#E6F2EE]',
        },
        {
          label: t('নাগরিক আপত্তি ও বিরোধ ট্রাইব্যুনাল', 'OPEN CITIZEN DISPUTES'),
          trend: '-11.50%',
          up: false,
          value: toBanglaDigits(kpis.open_disputes_count || 3, lang),
          linkText: t('শুনানি ও নিষ্পত্তি করুন', 'Resolve disputes'),
          targetTab: 'acland',
          icon: <AlertTriangle className="w-5 h-5 text-rose-600" />,
          iconBg: 'bg-rose-50',
        },
        {
          label: t('অনুমোদিত নামজারি ও খতিয়ান হালনাগাদ', 'APPROVED MUTATIONS'),
          trend: '+19.30%',
          up: true,
          value: toBanglaDigits(kpis.approved_mutations || 52, lang),
          linkText: t('হালনাগাদ রেকর্ড দেখুন', 'View mutated records'),
          targetTab: 'acland',
          icon: <CheckCircle2 className="w-5 h-5 text-blue-600" />,
          iconBg: 'bg-blue-50',
        },
      ];
    }

    if (role === 'bank_officer') {
      const crVal = ((kpis.active_mortgages_bdt || 18500000) / 10000000).toFixed(2);
      return [
        {
          label: t('সক্রিয় মর্টগেজ ঋণ পোর্টফোলিও', 'ACTIVE MORTGAGE PORTFOLIO'),
          trend: '+16.24%',
          up: true,
          value: `৳${toBanglaDigits(crVal, lang)} Cr`,
          linkText: t('সকল লিয়েন দেখুন', 'View active liens'),
          targetTab: 'bank',
          icon: <Building2 className="w-5 h-5 text-[#006A4E]" />,
          iconBg: 'bg-[#E6F2EE]',
        },
        {
          label: t('নিবন্ধিত ব্যাংক লিয়েন লক', 'ACTIVE COLLATERAL LIENS'),
          trend: '+9.40%',
          up: true,
          value: toBanglaDigits(kpis.active_mortgages_count || 6, lang),
          linkText: t('নতুন লিয়েন লক করুন', 'Register new lien'),
          targetTab: 'bank',
          icon: <Lock className="w-5 h-5 text-blue-600" />,
          iconBg: 'bg-blue-50',
        },
        {
          label: t('দ্বৈত মর্টগেজ জালিয়াতি প্রতিরোধ', 'DOUBLE-MORTGAGE BLOCKED'),
          trend: '+100.0%',
          up: true,
          value: toBanglaDigits(5, lang),
          linkText: t('জামানত যাচাই করুন', 'Verify collateral'),
          targetTab: 'bank',
          icon: <ShieldCheck className="w-5 h-5 text-rose-600" />,
          iconBg: 'bg-rose-50',
        },
        {
          label: t('ইস্যুকৃত ডিজিটাল ছাড়পত্র (NOC)', 'ISSUED DIGITAL NOCs'),
          trend: '+24.10%',
          up: true,
          value: toBanglaDigits(kpis.released_mortgages_count || 4, lang),
          linkText: t('ডিজিটাল NOC ডাউনলোড', 'Download NOC certificate'),
          targetTab: 'bank',
          icon: <FileSpreadsheet className="w-5 h-5 text-amber-600" />,
          iconBg: 'bg-amber-50',
        },
      ];
    }

    if (role === 'citizen') {
      return [
        {
          label: t('আমার রেকর্ডকৃত দাগসমূহ (বিএস)', 'MY RECORDED PLOTS (BS)'),
          trend: '+100% Verified',
          up: true,
          value: toBanglaDigits(4, lang),
          linkText: t('আমার ভল্ট দেখুন', 'View my land vault'),
          targetTab: 'home',
          icon: <ShieldCheck className="w-5 h-5 text-[#006A4E]" />,
          iconBg: 'bg-[#E6F2EE]',
        },
        {
          label: t('বিক্রয় লককৃত সুরক্ষিত দাগ', 'SALE-LOCKED PLOTS'),
          trend: '🔒 Active Lock',
          up: true,
          value: toBanglaDigits(kpis.locked_plots_count || 2, lang),
          linkText: t('বিক্রয় লক নিয়ন্ত্রণ করুন', 'Manage plot locks'),
          targetTab: 'home',
          icon: <Lock className="w-5 h-5 text-rose-600" />,
          iconBg: 'bg-rose-50',
        },
        {
          label: t('ক্রয়ের পূর্বে দাগ যাচাই সেবা', 'PRE-PURCHASE PLOT CHECKS'),
          trend: '11 Rules Active',
          up: true,
          value: toBanglaDigits(kpis.total_plots, lang),
          linkText: t('জমি কেনার আগে যাচাই', 'Check plot before buying'),
          targetTab: 'check',
          icon: <FileSpreadsheet className="w-5 h-5 text-blue-600" />,
          iconBg: 'bg-blue-50',
        },
        {
          label: t('ডিজিটাল স্বাক্ষরিত দলিল সনদ', 'SIGNED DEED CERTIFICATES'),
          trend: 'Ed25519 + QR',
          up: true,
          value: toBanglaDigits(kpis.total_deeds, lang),
          linkText: t('QR দলিল যাচাই করুন', 'Verify QR deed'),
          targetTab: 'qr',
          icon: <Landmark className="w-5 h-5 text-amber-600" />,
          iconBg: 'bg-amber-50',
        },
      ];
    }

    // Default: National System Admin & Auditor
    return [
      {
        label: t('জাতীয় লেজারে নিবন্ধিত দলিল', 'TOTAL HASH-CHAINED DEEDS'),
        trend: '+16.24%',
        up: true,
        value: toBanglaDigits(kpis.total_deeds, lang),
        linkText: t('লেজার অখণ্ডতা দেখুন', 'Inspect hash ledger'),
        targetTab: 'admin',
        icon: <FileSpreadsheet className="w-5 h-5 text-[#006A4E]" />,
        iconBg: 'bg-[#E6F2EE]',
      },
      {
        label: t('সমন্বিত খতিয়ান চেইন (CS→BS)', 'UNIFIED KHATIAN RECORDS'),
        trend: '+29.08%',
        up: true,
        value: toBanglaDigits(kpis.total_khatians, lang),
        linkText: t('খতিয়ান পরম্পরা দেখুন', 'See khatian lineage'),
        targetTab: 'check',
        icon: <Landmark className="w-5 h-5 text-blue-600" />,
        iconBg: 'bg-blue-50',
      },
      {
        label: t('সুরক্ষিত মৌজা দাগ ও বিক্রয় লক', 'PROTECTED PLOTS & LOCKS'),
        trend: '+12.40%',
        up: true,
        value: toBanglaDigits(kpis.total_plots, lang),
        linkText: t('সকল দাগ অনুসন্ধান', 'Explore all plots'),
        targetTab: 'check',
        icon: <Lock className="w-5 h-5 text-amber-600" />,
        iconBg: 'bg-amber-50',
      },
      {
        label: t('সক্রিয় ব্যাংক মর্টগেজ লিয়েন ভ্যালু', 'PROTECTED MORTGAGE LIENS'),
        trend: '+0.00%',
        up: true,
        value: `৳${toBanglaDigits(((kpis.active_mortgages_bdt || 18500000) / 10000000).toFixed(2), lang)} Cr`,
        linkText: t('মর্টগেজ রেজিস্টার দেখুন', 'View mortgage registry'),
        targetTab: 'bank',
        icon: <Building2 className="w-5 h-5 text-indigo-600" />,
        iconBg: 'bg-indigo-50',
      },
    ];
  };

  const kpiCards = getRoleKpiCards();

  // Compute SVG coordinates for the Velzon Combo Bar + Line Chart
  const maxVal = 90;
  const chartHeight = 175;
  const chartWidth = 660;
  const colWidth = chartWidth / monthlySeries.length;

  const linePointsMutations = monthlySeries
    .map((m: any, i: number) => {
      const x = i * colWidth + colWidth / 2;
      const y = chartHeight - (m.mutations / maxVal) * (chartHeight - 25);
      return `${x},${y}`;
    })
    .join(' ');

  const linePointsRisks = monthlySeries
    .map((m: any, i: number) => {
      const x = i * colWidth + colWidth / 2;
      const y = chartHeight - ((m.blocked_risks * 4) / maxVal) * (chartHeight - 25);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-5">
      {/* Row 1: Velzon Greeting + Date Pill + Action Button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-slate-800">
            {t(`স্বাগতম, ${displayName}!`, `Welcome back, ${displayName}!`)}
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            {t(
              'আজকের প্রাক-নিবন্ধন দলিল যাচাই, খতিয়ান পরম্পরা ও অপরিবর্তনীয় হ্যাশ-চেইন লেজারের সর্বশেষ পরিসংখ্যান।',
              "Here's what's happening across your land verification and cryptographic ledger workspace today."
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Picker Pill */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden text-xs font-semibold text-slate-700">
            <span className="px-3 py-2">01 Oct, 2026 to 16 Oct, 2026</span>
            <span className="bg-[#293e61] text-white px-2.5 py-2 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </span>
          </div>

          <button
            onClick={() => onQuickAction('check')}
            className="px-3.5 py-2 rounded-lg bg-[#006A4E]/10 hover:bg-[#006A4E] text-[#006A4E] hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer min-h-[36px]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('নতুন দাগ / দলিল যাচাই', 'New Verification')}</span>
          </button>

          <button
            onClick={() => onQuickAction('qr')}
            title={t('লাইভ লেজার পালস', 'Live Ledger Pulse')}
            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer min-h-[36px]"
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 2: 4 Velzon KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {card.label}
              </span>
              <span
                className={`text-xs font-bold flex items-center gap-0.5 ${
                  card.up ? 'text-[#006A4E]' : 'text-[#F42A41]'
                }`}
              >
                {card.up ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                <span>{card.trend}</span>
              </span>
            </div>

            <div className="my-3 text-2xl font-extrabold text-slate-800 tracking-tight">
              {card.value}
            </div>

            <div className="flex items-end justify-between pt-1">
              <button
                onClick={() => onQuickAction(card.targetTab)}
                className="text-xs font-semibold text-slate-600 hover:text-[#006A4E] underline cursor-pointer min-h-0"
              >
                {card.linkText}
              </button>
              <div className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Row 3: Velzon 8-Col Analytics Combo Chart + 4-Col Mouza Coverage Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 8 Cols: Registration & Verification Combo Chart */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-slate-800 text-sm md:text-base">
              {t(
                'দলিল নিবন্ধন, ই-নামজারি ও ঝুঁকি প্রতিরোধ পরিসংখ্যান (২০২৬)',
                'Deed Registration, e-Mutation & Risk Prevention Analytics'
              )}
            </h3>
            <div className="flex items-center gap-1">
              {(['ALL', '1M', '6M', '1Y'] as const).map((rng) => (
                <button
                  key={rng}
                  onClick={() => setChartRange(rng)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer min-h-0 ${
                    chartRange === rng
                      ? 'bg-[#293e61] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {rng}
                </button>
              ))}
            </div>
          </div>

          {/* 4 Summary Metrics Strip Inside Chart Card (Velzon Style) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-100 bg-slate-50/60 text-center">
            <div className="p-3 border-r border-slate-100">
              <div className="text-base font-extrabold text-slate-800">
                {toBanglaDigits(kpis.total_deeds, lang)}
              </div>
              <div className="text-[11px] text-slate-500">
                {t('নিবন্ধিত দলিল', 'Registered Deeds')}
              </div>
            </div>
            <div className="p-3 border-r border-slate-100">
              <div className="text-base font-extrabold text-slate-800">
                {toBanglaDigits(kpis.total_khatians, lang)}
              </div>
              <div className="text-[11px] text-slate-500">
                {t('খতিয়ান চেইন রেকর্ড', 'Khatian Records')}
              </div>
            </div>
            <div className="p-3 border-r border-slate-100">
              <div className="text-base font-extrabold text-slate-800">
                {toBanglaDigits(11, lang)}
              </div>
              <div className="text-[11px] text-slate-500">
                {t('সক্রিয় জালিয়াতি রুল', 'Active Fraud Rules')}
              </div>
            </div>
            <div className="p-3">
              <div className="text-base font-extrabold text-[#006A4E]">
                {toBanglaDigits('98.75', lang)}%
              </div>
              <div className="text-[11px] text-slate-500">
                {t('লেজার যাচাই অনুপাত', 'Verification Ratio')}
              </div>
            </div>
          </div>

          {/* SVG Combo Bar + Line + Dashed Line Chart */}
          <div className="p-5">
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight + 32}`}
                className="w-full h-52 min-w-[520px]"
                role="img"
                aria-label="Monthly Deed Registration and Mutation Analytics Chart"
              >
                {/* Horizontal Grid Lines */}
                {[0, 30, 60, 90].map((val, i) => {
                  const y = chartHeight - (val / maxVal) * (chartHeight - 25);
                  return (
                    <g key={i}>
                      <line
                        x1={0}
                        y1={y}
                        x2={chartWidth}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeDasharray="3 3"
                      />
                      <text x={2} y={y - 4} fontSize="9" fill="#94a3b8">
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Bars for Deeds Registered */}
                {monthlySeries.map((m: any, i: number) => {
                  const barH = (m.deeds / maxVal) * (chartHeight - 25);
                  const x = i * colWidth + colWidth * 0.28;
                  const y = chartHeight - barH;
                  return (
                    <g key={m.month}>
                      <rect
                        x={x}
                        y={y}
                        width={colWidth * 0.44}
                        height={barH}
                        rx={3}
                        fill="#10b981"
                        opacity={0.88}
                      />
                      <text
                        x={i * colWidth + colWidth / 2}
                        y={chartHeight + 18}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="600"
                        fill="#64748b"
                      >
                        {lang === 'bn' ? m.month_bn : m.month}
                      </text>
                    </g>
                  );
                })}

                {/* Solid Line for Mutations Synced */}
                <polyline
                  fill="none"
                  stroke="#293e61"
                  strokeWidth="2.5"
                  points={linePointsMutations}
                />

                {/* Dashed Line for Blocked Fraud Risks */}
                <polyline
                  fill="none"
                  stroke="#F42A41"
                  strokeWidth="2"
                  strokeDasharray="5 4"
                  points={linePointsRisks}
                />
              </svg>
            </div>

            {/* Chart Legend */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#10b981]" />
                <span>{t('নিবন্ধিত দলিল (Registered Deeds)', 'Registered Deeds')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#293e61]" />
                <span>{t('সম্পন্ন ই-মিউটেশন (Mutations Synced)', 'Mutations Synced')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#F42A41]" />
                <span>{t('প্রতিরোধকৃত জালিয়াতি (Blocked Fraud Risks)', 'Blocked Fraud Risks')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Verification Coverage by Mouza (Velzon "Sales by Locations" Style) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm md:text-base">
              {t('মৌজা ভিত্তিক যাচাই অগ্রগতি', 'Coverage by Mouza')}
            </h3>
            <button
              onClick={() => window.print()}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer min-h-0"
            >
              <Download className="w-3 h-3" />
              <span>{t('রিপোর্ট', 'Export Report')}</span>
            </button>
          </div>

          {/* Stylized Mouza Map Visualization */}
          <div className="p-4">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <svg viewBox="0 0 280 135" className="w-full h-32">
                <path
                  d="M25,30 Q80,10 135,28 T250,35 Q265,75 235,110 Q160,128 95,115 Q35,105 25,30 Z"
                  fill="#e2e8f0"
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                />
                {/* Savar Node */}
                <circle cx="90" cy="52" r="9" fill="#10b981" opacity="0.25" />
                <circle cx="90" cy="52" r="4.5" fill="#006A4E" />
                <text x="102" y="55" fontSize="10" fontWeight="700" fill="#1e293b">
                  {lang === 'bn' ? 'সাভার সদর' : 'Savar Sadar'}
                </text>

                {/* Birulia Node */}
                <circle cx="170" cy="44" r="9" fill="#10b981" opacity="0.25" />
                <circle cx="170" cy="44" r="4.5" fill="#006A4E" />
                <text x="182" y="47" fontSize="10" fontWeight="700" fill="#1e293b">
                  {lang === 'bn' ? 'বিরুলিয়া' : 'Birulia'}
                </text>

                {/* Dhamrai Node */}
                <circle cx="128" cy="92" r="9" fill="#293e61" opacity="0.25" />
                <circle cx="128" cy="92" r="4.5" fill="#293e61" />
                <text x="140" y="95" fontSize="10" fontWeight="700" fill="#1e293b">
                  {lang === 'bn' ? 'ধামরাই দক্ষিণ' : 'Dhamrai South'}
                </text>
              </svg>
            </div>

            {/* Mouza Progress Bars */}
            <div className="mt-4 space-y-3.5">
              {mouzaBreakdown.map((m: any, idx: number) => {
                const pct = m.verification_coverage_pct || (idx === 0 ? 92 : idx === 1 ? 84 : 78);
                return (
                  <div key={m.id || idx}>
                    <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                      <span>
                        {lang === 'bn' ? m.mouza_bn : m.mouza_en} ({toBanglaDigits(m.plot_count || 20, lang)}{' '}
                        {t('দাগ', 'plots')})
                      </span>
                      <span>{toBanglaDigits(pct, lang)}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#293e61]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cryptographic System Trust Rating Box (Bottom of Right Column) */}
          <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-4 h-4 fill-amber-400" />
              <Star className="w-4 h-4 fill-amber-400" />
              <Star className="w-4 h-4 fill-amber-400" />
              <Star className="w-4 h-4 fill-amber-400" />
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
            <span className="text-xs font-extrabold text-slate-700">
              {t('৪.৯ / ৫.০ লেজার ট্রাস্ট স্কোর', '4.9 / 5.0 Ledger Trust Score')}
            </span>
          </div>
        </div>
      </div>

      {/* Row 4: Recent Ledger Activity Strip & Top Fraud Risk Triggers */}
      {recentActivity.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                {t('সাম্প্রতিক লেজার ও দাপ্তরিক কার্যক্রম (Recent Activity)', 'Recent Ledger & Registry Activity')}
              </h3>
              <span className="text-[11px] font-mono text-[#006A4E] bg-[#E6F2EE] px-2.5 py-0.5 rounded-full font-bold">
                SHA-256 Append-Only
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentActivity.slice(0, 4).map((act: any) => (
                <div
                  key={act.id}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-[#E6F2EE] text-[#006A4E] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    ✔
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{act.action}</div>
                    <div className="text-[11px] text-slate-500">
                      Actor: <span className="font-semibold">{act.actor_username}</span> ({act.actor_role})
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                      Hash: {act.entry_hash}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5">
            <h3 className="font-bold text-slate-800 text-sm mb-3">
              {t('প্রধান ঝুঁকি ও যাচাই সূচকসমূহ', 'Top Fraud Prevention Rules')}
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-700">
                <span>1. DOUBLE_SALE (দ্বৈত বিক্রয় রোধ)</span>
                <span className="font-bold text-slate-500">(95 pts)</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>2. DEED_TAMPERED (হ্যাশ অমিল সনাক্ত)</span>
                <span className="font-bold text-slate-500">(100 pts)</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>3. OWNER_SALE_LOCKED (নাগরিক বিক্রয় লক)</span>
                <span className="font-bold text-slate-500">(100 pts)</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>4. PLOT_MORTGAGED (ব্যাংক লিয়েন লক)</span>
                <span className="font-bold text-slate-500">(85 pts)</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>5. KHATIAN_CHAIN_BREAK (CS→BS অমিল)</span>
                <span className="font-bold text-slate-500">(50 pts)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
