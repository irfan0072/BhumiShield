import React, { useState, useMemo } from 'react';
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
    total_plots: 0, total_khatians: 0, total_deeds: 0, total_deed_value_bdt: 0,
    locked_plots_count: 0, open_disputes_count: 0, pending_mutations: 0,
    approved_mutations: 0, active_mortgages_count: 0, released_mortgages_count: 0,
    active_mortgages_bdt: 0, total_users: 0,
  };
  const monthlySeries = stats?.monthly_series || [];
  const mouzaBreakdown = stats?.mouza_breakdown || [];

  const recentActivity = stats?.recent_activity || [];

  const displayName = user
    ? lang === 'bn'
      ? user.full_name_bn
      : user.full_name_en
    : t('দাপ্তরিক কর্মকর্তা', 'Authorized Officer');

  // Role-specific KPI cards (Monsoon Ledger registry console)
  const getRoleKpiCards = () => {
    if (role === 'sub_registrar') {
      return [
        {
          label: t('মোট নিবন্ধিত দলিল', 'TOTAL REGISTERED DEEDS'),
          trend: t('বর্তমান রেকর্ড', 'Current records'),
          up: true,
          value: toBanglaDigits(kpis.total_deeds, lang),
          linkText: t('দলিল রেজিস্টার দেখুন', 'View deed register'),
          targetTab: 'deeds',
          icon: <FileSpreadsheet className="w-5 h-5 text-[#006A4E]" />,
          iconBg: 'bg-[#EDF7F4]',
        },
        {
          label: t('রেকর্ডকৃত দলিলের ঘোষিত মূল্য', 'DECLARED VALUE IN DEED RECORDS'),
          trend: t('বর্তমান রেকর্ড', 'Current records'),
          up: true,
          value: `৳${toBanglaDigits(((kpis.total_deed_value_bdt ?? 0) / 10000000).toFixed(2), lang)} Cr`,
          linkText: t('শুল্ক বিবরণী দেখুন', 'Calculate stamp fees'),
          targetTab: 'fees',
          icon: <Landmark className="w-5 h-5 text-[#006A4E]" />,
          iconBg: 'bg-[#EDF7F4]',
        },
        {
          label: t('ঝুঁকিপূর্ণ ও স্থগিত দলিল (HELD)', 'HELD / FLAGGED DEEDS'),
          trend: t('বর্তমান রেকর্ড', 'Current records'),
          up: false,
          value: toBanglaDigits(kpis.held_deeds_count ?? 0, lang),
          linkText: t('হোল্ড কিউ পর্যালোচনা', 'Review held deeds'),
          targetTab: 'held',
          icon: <AlertTriangle className="w-5 h-5 text-[#C4891A]" />,
          iconBg: 'bg-[#FBF3E0]',
        },
        {
          label: t('ক্রিপ্টোগ্রাফিক লেজার অখণ্ডতা', 'HASH LEDGER INTEGRITY'),
          trend: t('বর্তমান রেকর্ড', 'Current records'),
          up: true,
          value: kpis.ledger_integrity_pct == null ? '—' : `${toBanglaDigits(kpis.ledger_integrity_pct, lang)}%`,
          linkText: t('হ্যাশ চেইন যাচাই করুন', 'Verify hash chain'),
          targetTab: 'qr',
          icon: <ShieldCheck className="w-5 h-5 text-[#006A4E]" />,
          iconBg: 'bg-[#EDF7F4]',
        },
      ];
    }

    if (role === 'ac_land') {
      return [
        {
          label: t('অপেক্ষমাণ ই-নামজারি কেস', 'PENDING E-MUTATIONS'),
          trend: t('বর্তমান রেকর্ড', 'Current records'),
          up: true,
          value: toBanglaDigits(kpis.pending_mutations ?? 0, lang),
          linkText: t('নামজারি কিউ দেখুন', 'Process mutations'),
          targetTab: 'mutations',
          icon: <Clock className="w-5 h-5 text-[#C4891A]" />,
          iconBg: 'bg-[#FBF3E0]',
        },
        {
          label: t('সংরক্ষিত খতিয়ান রেকর্ড', 'INDEXED KHATIAN RECORDS'),
          trend: t('বর্তমান রেকর্ড', 'Current records'),
          up: true,
          value: toBanglaDigits(kpis.total_khatians, lang),
          linkText: t('খতিয়ান চেইন দেখুন', 'Reconcile khatians'),
          targetTab: 'khatians',
          icon: <Landmark className="w-5 h-5 text-[#006A4E]" />,
          iconBg: 'bg-[#EDF7F4]',
        },
        {
          label: t('নাগরিক আপত্তি ও বিরোধ ট্রাইব্যুনাল', 'OPEN CITIZEN DISPUTES'),
          trend: t('বর্তমান রেকর্ড', 'Current records'),
          up: false,
          value: toBanglaDigits(kpis.open_disputes_count ?? 0, lang),
          linkText: t('শুনানি ও নিষ্পত্তি করুন', 'Resolve disputes'),
          targetTab: 'disputes',
          icon: <AlertTriangle className="w-5 h-5 text-[#FF3B4A]" />,
          iconBg: 'bg-[#FFF0F1]',
        },
        {
          label: t('অনুমোদিত নামজারি ও খতিয়ান হালনাগাদ', 'APPROVED MUTATIONS'),
          trend: t('বর্তমান রেকর্ড', 'Current records'),
          up: true,
          value: toBanglaDigits(kpis.approved_mutations ?? 0, lang),
          linkText: t('হালনাগাদ রেকর্ড দেখুন', 'View mutated records'),
          targetTab: 'approved',
          icon: <CheckCircle2 className="w-5 h-5 text-[#006A4E]" />,
          iconBg: 'bg-[#EDF7F4]',
        },
      ];
    }

    if (role === 'bank_officer') {
      const crVal = ((kpis.active_mortgages_bdt ?? 0) / 10000000).toFixed(2);
      return [
        {
          label: t('নথিভুক্ত সক্রিয় মর্টগেজ মূল্য', 'RECORDED ACTIVE MORTGAGE VALUE'),
          trend: t('বর্তমান রেকর্ড', 'Current records'),
          up: true,
          value: `৳${toBanglaDigits(crVal, lang)} Cr`,
          linkText: t('সকল লিয়েন দেখুন', 'View active liens'),
          targetTab: 'liens',
          icon: <Building2 className="w-5 h-5 text-[#006A4E]" />,
          iconBg: 'bg-[#EDF7F4]',
        },
        {
          label: t('নিবন্ধিত ব্যাংক লিয়েন লক', 'ACTIVE COLLATERAL LIENS'),
          trend: t('বর্তমান রেকর্ড', 'Current records'),
          up: true,
          value: toBanglaDigits(kpis.active_mortgages_count ?? 0, lang),
          linkText: t('নতুন লিয়েন লক করুন', 'Register new lien'),
          targetTab: 'new-lien',
          icon: <Lock className="w-5 h-5 text-[#006A4E]" />,
          iconBg: 'bg-[#EDF7F4]',
        },
        {
          label: t('অবমুক্ত ব্যাংক লিয়েন', 'RELEASED LIENS'),
          trend: t('বর্তমান রেকর্ড', 'Current records'),
          up: true,
          value: toBanglaDigits(kpis.released_mortgages_count ?? 0, lang),
          linkText: t('জামানত যাচাই করুন', 'Verify collateral'),
          targetTab: 'verify',
          icon: <ShieldCheck className="w-5 h-5 text-[#FF3B4A]" />,
          iconBg: 'bg-[#FFF0F1]',
        },
        {
          label: t('ইস্যুকৃত ডিজিটাল ছাড়পত্র (NOC)', 'ISSUED DIGITAL NOCs'),
          trend: t('বর্তমান রেকর্ড', 'Current records'),
          up: true,
          value: toBanglaDigits(kpis.issued_noc_count ?? 0, lang),
          linkText: t('ডিজিটাল NOC ডাউনলোড', 'Download NOC certificate'),
          targetTab: 'noc',
          icon: <FileSpreadsheet className="w-5 h-5 text-[#C4891A]" />,
          iconBg: 'bg-[#FBF3E0]',
        },
      ];
    }

    if (role === 'citizen') {
      return [
        {
          label: t('আমার রেকর্ডকৃত দাগসমূহ (বিএস)', 'MY RECORDED PLOTS (BS)'),
          trend: t('ভল্টের রেকর্ড', 'Recorded in vault'),
          up: true,
          value: toBanglaDigits(kpis.owned_plots_count ?? 0, lang),
          linkText: t('আমার ভল্ট দেখুন', 'View my land vault'),
          targetTab: 'home',
          icon: <ShieldCheck className="w-5 h-5 text-[#006A4E]" />,
          iconBg: 'bg-[#EDF7F4]',
        },
        {
          label: t('বিক্রয় লককৃত সুরক্ষিত দাগ', 'SALE-LOCKED PLOTS'),
          trend: '🔒 Active Lock',
          up: true,
          value: toBanglaDigits(kpis.owned_locked_plots_count ?? 0, lang),
          linkText: t('বিক্রয় লক নিয়ন্ত্রণ করুন', 'Manage plot locks'),
          targetTab: 'home',
          icon: <Lock className="w-5 h-5 text-[#FF3B4A]" />,
          iconBg: 'bg-[#FFF0F1]',
        },
        {
          label: t('অনুসন্ধানযোগ্য দাগ', 'SEARCHABLE PLOTS'),
          trend: '11 Rules Active',
          up: true,
          value: toBanglaDigits(kpis.total_plots, lang),
          linkText: t('জমি কেনার আগে যাচাই', 'Check plot before buying'),
          targetTab: 'check',
          icon: <FileSpreadsheet className="w-5 h-5 text-[#006A4E]" />,
          iconBg: 'bg-[#EDF7F4]',
        },
        {
          label: t('আমার সংশ্লিষ্ট দলিল', 'MY LINKED DEED RECORDS'),
          trend: 'Ed25519 + QR',
          up: true,
          value: toBanglaDigits(kpis.owned_deeds_count ?? 0, lang),
          linkText: t('QR দলিল যাচাই করুন', 'Verify QR deed'),
          targetTab: 'qr',
          icon: <Landmark className="w-5 h-5 text-[#C4891A]" />,
          iconBg: 'bg-[#FBF3E0]',
        },
      ];
    }

    // Default: National System Admin & Auditor
    return [
      {
        label: t('জাতীয় লেজারে নিবন্ধিত দলিল', 'TOTAL HASH-CHAINED DEEDS'),
        trend: t('বর্তমান রেকর্ড', 'Current records'),
        up: true,
        value: toBanglaDigits(kpis.total_deeds, lang),
        linkText: t('লেজার অখণ্ডতা দেখুন', 'Inspect hash ledger'),
        targetTab: 'admin',
        icon: <FileSpreadsheet className="w-5 h-5 text-[#006A4E]" />,
        iconBg: 'bg-[#EDF7F4]',
      },
      {
        label: t('সমন্বিত খতিয়ান চেইন (CS→BS)', 'UNIFIED KHATIAN RECORDS'),
        trend: t('বর্তমান রেকর্ড', 'Current records'),
        up: true,
        value: toBanglaDigits(kpis.total_khatians, lang),
        linkText: t('খতিয়ান পরম্পরা দেখুন', 'See khatian lineage'),
        targetTab: 'check',
        icon: <Landmark className="w-5 h-5 text-[#006A4E]" />,
        iconBg: 'bg-[#EDF7F4]',
      },
      {
        label: t('সুরক্ষিত মৌজা দাগ ও বিক্রয় লক', 'PROTECTED PLOTS & LOCKS'),
        trend: t('বর্তমান রেকর্ড', 'Current records'),
        up: true,
        value: toBanglaDigits(kpis.total_plots, lang),
        linkText: t('সকল দাগ অনুসন্ধান', 'Explore all plots'),
        targetTab: 'check',
        icon: <Lock className="w-5 h-5 text-[#C4891A]" />,
        iconBg: 'bg-[#FBF3E0]',
      },
      {
        label: t('সক্রিয় ব্যাংক মর্টগেজ লিয়েন ভ্যালু', 'PROTECTED MORTGAGE LIENS'),
        trend: t('বর্তমান রেকর্ড', 'Current records'),
        up: true,
        value: `৳${toBanglaDigits(((kpis.active_mortgages_bdt ?? 0) / 10000000).toFixed(2), lang)} Cr`,
        linkText: t('মর্টগেজ রেজিস্টার দেখুন', 'View mortgage registry'),
        targetTab: 'bank',
        icon: <Building2 className="w-5 h-5 text-[#006A4E]" />,
        iconBg: 'bg-[#EDF7F4]',
      },
    ];
  };

  const kpiCards = getRoleKpiCards();

  const filteredMonthlySeries = useMemo(() => {
    if (chartRange === '1M') return monthlySeries.slice(-1);
    if (chartRange === '6M') return monthlySeries.slice(-6);
    if (chartRange === '1Y') return monthlySeries.slice(-12);
    return monthlySeries;
  }, [monthlySeries, chartRange]);

  // SVG coordinates for registry analytics chart
  const maxVal = Math.ceil(Math.max(1, ...filteredMonthlySeries.flatMap((m: any) => [Number(m.deeds), Number(m.mutations), Number(m.blocked_risks)])) / 3) * 3;
  const chartHeight = 175;
  const chartWidth = 660;
  const colWidth = chartWidth / Math.max(1, filteredMonthlySeries.length);

  const linePointsMutations = filteredMonthlySeries
    .map((m: any, i: number) => {
      const x = i * colWidth + colWidth / 2;
      const y = chartHeight - (m.mutations / maxVal) * (chartHeight - 25);
      return `${x},${y}`;
    })
    .join(' ');

  const linePointsRisks = filteredMonthlySeries
    .map((m: any, i: number) => {
      const x = i * colWidth + colWidth / 2;
      const y = chartHeight - (m.blocked_risks / maxVal) * (chartHeight - 25);
      return `${x},${y}`;
    })
    .join(' ');

  const exportCoverage = () => {
    const rows = [['Mouza', 'Plots', 'Checked plots', 'Coverage percent'], ...mouzaBreakdown.map((m: any) => [
      lang === 'bn' ? m.mouza_bn : m.mouza_en, m.plot_count, m.checked_plot_count, m.verification_coverage_pct,
    ])];
    const csv = rows.map((row: any[]) => row.map((value) => {
      let cell = String(value ?? '');
      if (/^[=+@-]/.test(cell)) cell = "'" + cell;
      return '"' + cell.replace(/"/g, '""') + '"';
    }).join(',')).join('\r\n');
    const href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = href;
    link.download = `bhumishield-coverage-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(href);
  };

  if (!stats) return <div role="status" className="panel p-4 text-sm">{t('পরিসংখ্যান এখনো পাওয়া যায়নি।', 'Analytics are not available yet.')}</div>;

  return (
    <div className="space-y-5 animate-rise">
      {/* Row 1: Registry console greeting */}
      <div className="panel p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-lg md:text-xl text-[#074f38]">
            {t(`স্বাগতম, ${displayName}!`, `Welcome back, ${displayName}!`)}
          </h2>
          <p className="text-xs md:text-sm text-[#5F7A74] mt-0.5">
            {t(
              'আজকের প্রাক-নিবন্ধন দলিল যাচাই, খতিয়ান পরম্পরা ও অপরিবর্তনীয় হ্যাশ-চেইন লেজারের সর্বশেষ পরিসংখ্যান।',
              "Here's what's happening across your land verification and cryptographic ledger workspace today."
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date range */}
          <div className="flex items-center bg-[#EDF7F4]/80 border border-[#006A4E]/12 rounded-lg overflow-hidden text-xs font-semibold text-[#0A1F1C]/90">
            <span className="px-3 py-2">{new Date().toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB')}</span>
            <span className="bg-[#074f38] text-white px-2.5 py-2 flex items-center justify-center">
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
            className="p-2 rounded-lg bg-[#EDF7F4] text-[#006A4E] hover:bg-[#EDF7F4] cursor-pointer min-h-[36px]"
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 2: Registry KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card, idx) => (
          <div
            key={idx}
            className="panel p-4 hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
                {card.label}
              </span>
              <span
                className={`text-xs font-bold flex items-center gap-0.5 ${
                  card.up ? 'text-[#006A4E]' : 'text-[#FF3B4A]'
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

            <div className="my-3 text-2xl font-extrabold text-[#0A1F1C] tracking-tight">
              {card.value}
            </div>

            <div className="flex items-end justify-between pt-1">
              <button
                onClick={() => onQuickAction(card.targetTab)}
                className="text-xs font-semibold text-[#5F7A74] hover:text-[#006A4E] underline cursor-pointer min-h-0"
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

      {/* Row 3: Analytics + Mouza coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 8 Cols: Registration & Verification Combo Chart */}
        <div className="lg:col-span-8 panel overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#006A4E]/10 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-[#0A1F1C] text-sm md:text-base">
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
                      ? 'bg-[#074f38] text-white'
                      : 'bg-[#EDF7F4] text-[#5F7A74] hover:bg-[#E4EFEA]'
                  }`}
                >
                  {rng}
                </button>
              ))}
            </div>
          </div>

          {/* Summary metrics strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#006A4E]/10 bg-[#EDF7F4]/60 text-center">
            <div className="p-3 border-r border-[#006A4E]/10">
              <div className="text-base font-extrabold text-[#0A1F1C]">
                {toBanglaDigits(kpis.total_deeds, lang)}
              </div>
              <div className="text-[11px] text-[#5F7A74]">
                {t('নিবন্ধিত দলিল', 'Registered Deeds')}
              </div>
            </div>
            <div className="p-3 border-r border-[#006A4E]/10">
              <div className="text-base font-extrabold text-[#0A1F1C]">
                {toBanglaDigits(kpis.total_khatians, lang)}
              </div>
              <div className="text-[11px] text-[#5F7A74]">
                {t('খতিয়ান চেইন রেকর্ড', 'Khatian Records')}
              </div>
            </div>
            <div className="p-3 border-r border-[#006A4E]/10">
              <div className="text-base font-extrabold text-[#0A1F1C]">
                {toBanglaDigits(11, lang)}
              </div>
              <div className="text-[11px] text-[#5F7A74]">
                {t('সক্রিয় জালিয়াতি রুল', 'Active Fraud Rules')}
              </div>
            </div>
            <div className="p-3">
              <div className="text-base font-extrabold text-[#006A4E]">
                {toBanglaDigits(
                  kpis.ledger_integrity_pct !== undefined
                    ? Number(kpis.ledger_integrity_pct).toFixed(1)
                    : (kpis.total_deeds > 0
                        ? (((kpis.total_deeds - (kpis.ledger_broken_deeds || 0)) / kpis.total_deeds) * 100).toFixed(1)
                        : '100.0'),
                  lang
                )}%
              </div>
              <div className="text-[11px] text-[#5F7A74]">
                {t('লেজার অখণ্ডতা', 'Ledger Integrity')}
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
                {[0, maxVal / 3, 2 * maxVal / 3, maxVal].map((val, i) => {
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
                {filteredMonthlySeries.map((m: any, i: number) => {
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
                        fill="#006A4E"
                        opacity={0.85}
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
                  stroke="#10B981"
                  strokeWidth="2.5"
                  points={linePointsMutations}
                />

                {/* Dashed Line for Blocked Fraud Risks */}
                <polyline
                  fill="none"
                  stroke="#FF3B4A"
                  strokeWidth="2"
                  strokeDasharray="5 4"
                  points={linePointsRisks}
                />
              </svg>
            </div>

            {/* Chart Legend */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs font-semibold text-[#5F7A74]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-lg bg-[#006A4E]" />
                <span>{t('নিবন্ধিত দলিল (Registered Deeds)', 'Registered Deeds')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-lg bg-[#10B981]" />
                <span>{t('সম্পন্ন ই-মিউটেশন (Mutations Synced)', 'Mutations Synced')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-lg bg-[#FF3B4A]" />
                <span>{t('প্রতিরোধকৃত জালিয়াতি (Blocked Fraud Risks)', 'High-Risk Findings')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mouza verification coverage */}
        <div className="lg:col-span-4 panel flex flex-col justify-between">
          <div className="px-5 py-3.5 border-b border-[#006A4E]/10 flex items-center justify-between">
            <h3 className="font-bold text-[#0A1F1C] text-sm md:text-base">
              {t('মৌজা ভিত্তিক যাচাই অগ্রগতি', 'Recorded Pre-Check Coverage')}
            </h3>
            <button
              onClick={exportCoverage}
              className="px-2.5 py-1 rounded bg-[#EDF7F4] hover:bg-[#E4EFEA] text-[#0A1F1C]/90 text-[11px] font-bold flex items-center gap-1 cursor-pointer min-h-0"
            >
              <Download className="w-3 h-3" />
              <span>{t('রিপোর্ট', 'Export Report')}</span>
            </button>
          </div>

          <div className="p-5">
            <p className="text-xs text-[#5F7A74]">{t('সংরক্ষিত প্রাক-যাচাই প্রতিবেদন অনুযায়ী গণনা।', 'Calculated from persisted pre-check reports.')}</p>
            {/* Mouza Progress Bars */}
            <div className="mt-4 space-y-3.5">
              {mouzaBreakdown.map((m: any, idx: number) => {
                const pct = Number(m.verification_coverage_pct ?? 0);
                return (
                  <div key={m.id || idx}>
                    <div className="flex justify-between text-xs font-bold text-[#0A1F1C]/90 mb-1">
                      <span>
                        {lang === 'bn' ? m.mouza_bn : m.mouza_en} ({toBanglaDigits(m.plot_count ?? 0, lang)}{' '}
                        {t('দাগ', 'plots')})
                      </span>
                      <span>{toBanglaDigits(pct, lang)}%</span>
                    </div>
                    <div className="w-full h-2 rounded bg-[#EDF7F4] overflow-hidden">
                      <div
                        className="h-full rounded bg-[#006A4E]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-5 py-3.5 bg-[#EDF7F4]/70 border-t border-[#006A4E]/10 text-xs text-[#0A1F1C]/90">
            {t('হারটি নথিভুক্ত প্রাক-যাচাই থাকা দাগের অনুপাত; এটি মালিকানা বা আইনি নিশ্চয়তার রেটিং নয়।', 'Coverage is the share of plots with a recorded pre-check; it is not a legal or ownership assurance rating.')}
          </div>
        </div>
      </div>

      {/* Row 4: Recent Ledger Activity Strip & Top Fraud Risk Triggers */}
      {recentActivity.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 panel p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#0A1F1C] text-sm">
                {t('সাম্প্রতিক লেজার ও দাপ্তরিক কার্যক্রম (Recent Activity)', 'Recent Ledger & Registry Activity')}
              </h3>
              <span className="chip status-safe font-mono">
                SHA-256 Append-Only
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentActivity.slice(0, 4).map((act: any) => (
                <div
                  key={act.id}
                  className="p-3 rounded-lg bg-[#EDF7F4]/80 border border-[#006A4E]/10 flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#EDF7F4] text-[#006A4E] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    ✔
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#0A1F1C] truncate">{act.action}</div>
                    <div className="text-[11px] text-[#5F7A74]">
                      Actor: <span className="font-semibold">{act.actor_username}</span> ({act.actor_role})
                    </div>
                    <div className="text-[10px] font-mono text-[#5F7A74]/80 truncate mt-0.5">
                      Hash: {act.entry_hash}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 panel p-5">
            <h3 className="font-bold text-[#0A1F1C] text-sm mb-3">
              {t('প্রধান ঝুঁকি ও যাচাই সূচকসমূহ', 'Top Fraud Prevention Rules')}
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[#0A1F1C]/90">
                <span>1. DOUBLE_SALE (দ্বৈত বিক্রয় রোধ)</span>
                <span className="font-bold text-[#5F7A74]">(95 pts)</span>
              </div>
              <div className="flex justify-between text-[#0A1F1C]/90">
                <span>2. DEED_TAMPERED (হ্যাশ অমিল সনাক্ত)</span>
                <span className="font-bold text-[#5F7A74]">(100 pts)</span>
              </div>
              <div className="flex justify-between text-[#0A1F1C]/90">
                <span>3. OWNER_SALE_LOCKED (নাগরিক বিক্রয় লক)</span>
                <span className="font-bold text-[#5F7A74]">(100 pts)</span>
              </div>
              <div className="flex justify-between text-[#0A1F1C]/90">
                <span>4. PLOT_MORTGAGED (ব্যাংক লিয়েন লক)</span>
                <span className="font-bold text-[#5F7A74]">(85 pts)</span>
              </div>
              <div className="flex justify-between text-[#0A1F1C]/90">
                <span>5. KHATIAN_CHAIN_BREAK (CS→BS অমিল)</span>
                <span className="font-bold text-[#5F7A74]">(50 pts)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
