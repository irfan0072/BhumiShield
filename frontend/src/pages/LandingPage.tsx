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
  Bell,
  CheckCircle2,
  FileCheck2,
  Layers,
  Sparkles,
  ShieldAlert,
  Check,
  X,
  Scale,
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

  // Live Hero Search Box state
  const [searchMode, setSearchMode] = useState<'plot' | 'deed'>('plot');
  const [selectedMouza, setSelectedMouza] = useState<number>(1);
  const [selectedPlot, setSelectedPlot] = useState<number>(1);
  const [deedNoInput, setDeedNoInput] = useState<string>('DL-2026-1001');

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

  const filteredPlots = plots.filter((p) => Number(p.mouza_id) === Number(selectedMouza));

  return (
    <div className="space-y-8">
      {/* Official Government Notice & Circulars Ticker (BCC / National Portal Style) */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3 shadow-2xs">
        <span className="px-2.5 py-1 rounded bg-[#006A4E] text-white text-xs font-extrabold flex items-center gap-1.5 shrink-0">
          <Bell className="w-3.5 h-3.5" />
          <span>{t('সরকারি বিজ্ঞপ্তি', 'OFFICIAL NOTICE')}</span>
        </span>
        <div className="text-xs md:text-sm font-medium text-slate-700 truncate">
          {t(
            'পরিপত্র নং ২০২৬/ভূমি-১১৪: সাব-রেজিস্ট্রি অফিসে দলিল নিবন্ধনের পূর্বে CS→SA→RS→BS খতিয়ান পরম্পরা, নাগরিক বিক্রয় লক ও তফসিলি ব্যাংক লিয়েন অনলাইনে যাচাই বাধ্যতামূলক।',
            'Circular 2026/Land-114: Pre-registration verification of CS→SA→RS→BS khatian lineage, owner sale locks, and bank mortgage liens is mandatory across all offices.'
          )}
        </div>
      </div>

      {/* Authoritative Institutional Hero + Live Public Verification Widget */}
      <section className="rounded-2xl bg-gradient-to-br from-[#0b3b2d] via-[#00573F] to-[#1a2b49] text-white p-6 md:p-10 shadow-lg relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left 7 Cols: Institutional Headline & Key Pillars */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>
                {t(
                  'জাতীয় ডিজিটাল ভূমি দলিল যাচাই ও ক্রিপ্টোগ্রাফিক লেজার সিস্টেম',
                  'National Digital Land Verification & Cryptographic Ledger System'
                )}
              </span>
            </div>

            <h1 className="text-2xl md:text-4xl lg:text-[40px] font-extrabold leading-tight tracking-tight">
              {t(
                'নিবন্ধন ও নামজারির সমন্বিত আস্থার স্তর — স্বচ্ছ ও জালিয়াতিমুক্ত ভূমি ব্যবস্থাপনা',
                'Unified Pre-Registration Verification & Tamper-Evident Land Ledger'
              )}
            </h1>

            <p className="text-sm md:text-base text-slate-200 leading-relaxed">
              {t(
                'আইন মন্ত্রণালয়ের সাব-রেজিস্ট্রি অফিস, ভূমি মন্ত্রণালয়ের এসি ল্যান্ড অফিস এবং তফসিলি ব্যাংকের মধ্যে তাৎক্ষণিক আন্তঃসংযোগ। দলিল সম্পাদনের পূর্বেই খতিয়ান পরম্পরা, অংশের ভগ্নাংশ, বিক্রয় লক ও মর্টগেজ যাচাই করুন।',
                'Real-time interoperability between Sub-Registry (Ministry of Law), AC Land (Ministry of Land), and Scheduled Banks. Verify khatian lineage, fractional shares, sale locks, and mortgages prior to deed execution.'
              )}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-white/10 border border-white/15 flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold">{t('১১টি স্বয়ংক্রিয় রুল', '11 Verification Rules')}</div>
                  <div className="text-slate-300">{t('প্রাক-নিবন্ধন ঝুঁকি পরীক্ষা', 'Pre-registration gatekeeper')}</div>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/10 border border-white/15 flex items-center gap-2.5">
                <FileCheck2 className="w-5 h-5 text-emerald-300 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold">{t('Ed25519 ডিজিটাল স্বাক্ষর', 'Ed25519 Signatures')}</div>
                  <div className="text-slate-300">{t('SHA-256 হ্যাশ-চেইন লেজার', 'SHA-256 hash-chained blocks')}</div>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/10 border border-white/15 flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-emerald-300 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold">{t('৫টি ডেডিকেটেড প্যানেল', '5 Role Workspaces')}</div>
                  <div className="text-slate-300">{t('রোল-ভিত্তিক পূর্ণ নিয়ন্ত্রণ', 'Strict RBAC middleware')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Instant Public Verification Search Box */}
          <div className="lg:col-span-5 bg-white text-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex border-b border-slate-200 pb-3 gap-2">
              <button
                onClick={() => setSearchMode('plot')}
                className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px] ${
                  searchMode === 'plot'
                    ? 'bg-[#006A4E] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>{t('দাগ ও খতিয়ান যাচাই', 'Check Plot Lineage')}</span>
              </button>
              <button
                onClick={() => setSearchMode('deed')}
                className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px] ${
                  searchMode === 'deed'
                    ? 'bg-[#006A4E] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{t('দলিল ও QR যাচাই', 'Verify Deed / QR')}</span>
              </button>
            </div>

            {searchMode === 'plot' ? (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    {t('বিভাগ / জেলা / উপজেলা / মৌজা নির্বাচন করুন:', 'Select Mouza (Jurisdiction):')}
                  </label>
                  <select
                    value={selectedMouza}
                    onChange={(e) => {
                      const mId = Number(e.target.value);
                      setSelectedMouza(mId);
                      const first = plots.find((p) => Number(p.mouza_id) === mId);
                      if (first) setSelectedPlot(first.id);
                    }}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {lang === 'bn'
                          ? `${loc.district_bn} • ${loc.upazila_bn} • মৌজা: ${loc.mouza_bn} (JL ${loc.jl_no})`
                          : `${loc.district_en} • ${loc.upazila_en} • Mouza: ${loc.mouza_en} (JL ${loc.jl_no})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    {t('দাগ নম্বর (Plot / Dag No.):', 'Select Plot / Dag Number:')}
                  </label>
                  <select
                    value={selectedPlot}
                    onChange={(e) => setSelectedPlot(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold"
                  >
                    {filteredPlots.map((p) => (
                      <option key={p.id} value={p.id}>
                        {t('দাগ নং', 'Dag')} {toBanglaDigits(p.dag_no, lang)} — {p.land_type} (
                        {toBanglaDigits(p.total_area_decimal, lang)} {t('শতাংশ', 'Decimal')})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => onNavigate('check')}
                  className="w-full py-3 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>
                    {t('মালিকানা চেইন ও ঝুঁকি প্রতিবেদন দেখুন', 'Verify Ownership & Encumbrances')}
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    {t(
                      'ডিজিটাল দলিল নম্বর লিখুন (যেমন: DL-2026-1001 বা DL-2026-1005):',
                      'Enter Digital Deed Number (e.g., DL-2026-1001 or DL-2026-1005):'
                    )}
                  </label>
                  <input
                    type="text"
                    value={deedNoInput}
                    onChange={(e) => setDeedNoInput(e.target.value)}
                    placeholder="DL-2026-1001"
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50 font-mono text-sm font-bold"
                  />
                </div>
                <button
                  onClick={() => onNavigate('qr')}
                  className="w-full py-3 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>
                    {t('ক্রিপ্টোগ্রাফিক স্বাক্ষর ও লেজার যাচাই করুন', 'Verify Deed Signature & Hash')}
                  </span>
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>{t('তাৎক্ষণিক পাবলিক ভেরিফিকেশন গেটওয়ে', 'Instant Public Verification Gateway')}</span>
              <span className="font-mono font-bold text-[#006A4E]">SHA-256 + Ed25519</span>
            </div>
          </div>
        </div>

        {/* National Ledger Live Telemetry Strip */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-8 pt-6 border-t border-white/15">
            <StatPill
              label={t('মোট সংরক্ষিত দাগ', 'Recorded Plots')}
              value={toBanglaDigits(stats.kpis?.total_plots ?? 60, lang)}
            />
            <StatPill
              label={t('সমন্বিত খতিয়ান রেকর্ড', 'Khatian Records')}
              value={toBanglaDigits(stats.kpis?.total_khatians ?? 240, lang)}
            />
            <StatPill
              label={t('হ্যাশ-চেইন দলিল', 'Signed Deeds')}
              value={toBanglaDigits(stats.kpis?.total_deeds ?? 80, lang)}
            />
            <StatPill
              label={t('সক্রিয় ব্যাংক লিয়েন', 'Active Bank Liens')}
              value={toBanglaDigits(stats.kpis?.active_mortgages_count ?? 6, lang)}
            />
            <StatPill
              label={t('প্রক্রিয়াধীন ই-মিউটেশন', 'Pending Mutations')}
              value={toBanglaDigits(stats.kpis?.pending_mutations ?? 8, lang)}
            />
            <StatPill
              label={t('দাপ্তরিক ও নাগরিক ইউজার', 'System Accounts')}
              value={toBanglaDigits(stats.kpis?.total_users ?? 7, lang)}
            />
          </div>
        )}
      </section>

      {/* Dedicated Role-Wise Enterprise Workspaces Section */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#006A4E]">
              {t('দাপ্তরিক ও নাগরিক ই-গভর্ন্যান্স পোর্টালসমূহ', 'ROLE-BASED ENTERPRISE WORKSPACES')}
            </span>
            <h2 className="text-2xl font-extrabold text-slate-800 mt-0.5">
              {t(
                '৫টি স্বতন্ত্র রোল প্যানেল ও পূর্ণাঙ্গ নিয়ন্ত্রণ সিস্টেম',
                '5 Separate Role Panels with Dedicated Controlling Systems'
              )}
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            {t(
              'যেকোনো প্যানেলে ক্লিক করলে সংশ্লিষ্ট রোলের ডেডিকেটেড ড্যাশবোর্ড, সাইডবার ও অপারেশনাল টুলস ওপেন হবে:',
              'Select any workspace below to open its dedicated sidebar panel, analytics, and operational controls:'
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <RoleGatewayCard
            icon={<ShieldCheck className="w-6 h-6 text-[#006A4E]" />}
            dept={t('নাগরিক সেবা পোর্টাল', 'Citizen Services')}
            title={t('নাগরিক ভল্ট ও বিক্রয় লক প্যানেল', 'Citizen Land Vault Panel')}
            features={[
              t('নিজস্ব দাগে বিক্রয় লক (Sale Lock)', 'Plot Sale Protection Lock'),
              t('জালিয়াতি বা ওয়ারিশ আপত্তি দাখিল', 'File Ownership Objections'),
              t('ক্রয়-পূর্ব ঝুঁকি ও QR সনদ যাচাই', 'Pre-Purchase & QR Check'),
            ]}
            onClick={() => enterRolePortal('citizen')}
          />

          <RoleGatewayCard
            icon={<FileSpreadsheet className="w-6 h-6 text-sky-700" />}
            dept={t('আইন মন্ত্রণালয়', 'Ministry of Law')}
            title={t('সাব-রেজিস্ট্রার কন্ট্রোল প্যানেল', 'Sub-Registrar Panel')}
            features={[
              t('১১-রুল প্রাক-নিবন্ধন গেটকিপার', '11-Rule Pre-Reg Gatekeeper'),
              t('স্থগিত (HELD) দলিল রিলিজ/বাতিল', 'HELD Deed Release / Reject'),
              t('সরকারি স্ট্যাম্প ও কর ক্যালকুলেটর', 'Official Stamp & Tax Calc'),
            ]}
            onClick={() => enterRolePortal('sub_registrar')}
          />

          <RoleGatewayCard
            icon={<Landmark className="w-6 h-6 text-amber-700" />}
            dept={t('ভূমি মন্ত্রণালয়', 'Ministry of Land')}
            title={t('এসি ল্যান্ড ও ট্রাইব্যুনাল প্যানেল', 'AC Land Officer Panel')}
            features={[
              t('ই-মিউটেশন অনুমোদন ও খতিয়ান আপডেট', 'e-Mutation Approval Queue'),
              t('ত্রুটিপূর্ণ খতিয়ান ও ওয়ারিশ সমন্বয়', 'Khatian Chain Reconciliation'),
              t('নাগরিক বিরোধ ও শুনানি নিষ্পত্তি', 'Dispute Resolution Tribunal'),
            ]}
            onClick={() => enterRolePortal('ac_land')}
          />

          <RoleGatewayCard
            icon={<Building2 className="w-6 h-6 text-purple-700" />}
            dept={t('আর্থিক প্রতিষ্ঠান বিভাগ', 'Scheduled Banks')}
            title={t('ব্যাংক মর্টগেজ ও লিয়েন প্যানেল', 'Bank Officer Panel')}
            features={[
              t('জামানত যাচাই ও দ্বৈত ঋণ প্রতিরোধ', 'Collateral & Prior Lien Check'),
              t('নতুন মর্টগেজ লিয়েন লক ও অবমুক্তি', 'Register & Release Liens'),
              t('QR স্বাক্ষরিত ডিজিটাল NOC ইস্যু', 'Signed Digital NOC Generator'),
            ]}
            onClick={() => enterRolePortal('bank_officer')}
          />

          <RoleGatewayCard
            icon={<Lock className="w-6 h-6 text-rose-700" />}
            dept={t('কেন্দ্রীয় গভর্ন্যান্স', 'National Governance')}
            title={t('জাতীয় অ্যাডমিন ও অডিট প্যানেল', 'System Admin Panel')}
            features={[
              t('RBAC পারমিশন ম্যাট্রিক্স ও ইউজার CRUD', 'RBAC Matrix & Users CRUD'),
              t('হ্যাশ-চেইন অডিট ও টেম্পার ল্যাব', 'Hash-Chain Integrity Lab'),
              t('সিস্টেম পলিসি ও রুল ইঞ্জিন সেটিংস', 'Dynamic Policy & Rules Config'),
            ]}
            onClick={() => enterRolePortal('admin')}
          />
        </div>
      </section>

      {/* Hackathon Evaluator Quick Scenario Launcher */}
      {scenarios.length > 0 && (
        <section className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#006A4E]" />
              <h2 className="text-lg font-extrabold text-slate-800">
                {t(
                  'মূল্যায়ন ও বিচারক প্যানেল: ১-ক্লিকে ৮টি লাইভ টেস্ট সিনারিও চালান',
                  'Hackathon Evaluation: 1-Click Live Test Scenarios'
                )}
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              {t(
                'যেকোনো বাটনে ক্লিক করলে তাৎক্ষণিকভাবে খতিয়ান চেইন, বিক্রয় লক ও ব্যাংক মর্টগেজের লাইভ ফলাফল দেখা যাবে:',
                'Click any scenario to see instantaneous risk detection, sale locks, and bank liens:'
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {scenarios.map((sc) => {
              const isSafe = sc.badge_type === 'SAFE';
              const isWarn = sc.badge_type === 'WARNING';
              return (
                <button
                  key={sc.code}
                  onClick={() => onNavigate('check')}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all hover:scale-[1.01] cursor-pointer group min-h-[96px] ${
                    isSafe
                      ? 'bg-emerald-50/60 border-emerald-200 hover:border-[#006A4E]'
                      : isWarn
                      ? 'bg-amber-50/60 border-amber-200 hover:border-[#B7791F]'
                      : 'bg-rose-50/60 border-rose-200 hover:border-[#F42A41]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white text-slate-700 border">
                        #{sc.code}
                      </span>
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
                    <div className="text-xs font-bold text-slate-800 mt-2 line-clamp-1 group-hover:text-[#006A4E]">
                      {lang === 'bn' ? sc.title_bn : sc.title_en}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                      {lang === 'bn' ? sc.description_bn : sc.description_en}
                    </p>
                  </div>
                  <div className="mt-2 text-[11px] font-bold text-[#006A4E] flex items-center gap-1">
                    <span>{t('যাচাই উইজার্ডে টেস্ট করুন →', 'Test in Wizard →')}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* How Pre-Registration Verification Works (3-Step Interoperability Pipeline) */}
      <section className="bg-gradient-to-br from-slate-900 via-[#1b2d3d] to-[#0d3b2e] text-white rounded-2xl p-6 md:p-10 shadow-lg space-y-6">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
            {t('সিস্টেম আর্কিটেকচার ও ডেটাফ্লো', 'SYSTEM ARCHITECTURE & DATAFLOW')}
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {t(
              '৩টি ধাপে সম্পূর্ণ স্বয়ংক্রিয় দলিল প্রাক-যাচাই ও লেজার সংরক্ষণ',
              '3-Step Automated Pre-Registration Verification & Hash Ledger'
            )}
          </h2>
          <p className="text-xs md:text-sm text-slate-300">
            {t(
              'দলিল সম্পাদনের আগেই আইন মন্ত্রণালয়, ভূমি মন্ত্রণালয় ও ব্যাংকিং সেক্টরের ডেটা স্বয়ংক্রিয়ভাবে সমন্বয় হয়।',
              'Before a deed is registered, data is matched in real-time across Sub-Registry, AC Land, and Banks.'
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Step 1 */}
          <div className="bg-white/10 rounded-2xl p-6 border border-white/15 relative flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-900 font-extrabold text-lg flex items-center justify-center mb-4">
                ১
              </div>
              <h3 className="text-lg font-bold text-white">
                {t('নাগরিক ও ক্রেতার অনুসন্ধান', 'Pre-Purchase Citizen Check')}
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {t(
                  'বয়নামা করার আগেই ক্রেতা দাগ নং ও বিক্রেতার এনআইডি দিয়ে সিএস→এসএ→আরএস→বিএস খতিয়ান পরম্পরা, মালিকের বিক্রয় লক এবং কোনো ব্যাংক মর্টগেজ আছে কি না তা ১-ক্লিকে যাচাই করেন।',
                  'Before making an advance payment, the buyer inspects khatian lineage, seller shares, sale protection locks, and bank mortgages.'
                )}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/15 text-[11px] text-emerald-300 font-semibold">
              ✔ {t('ভুয়া মালিক ও দ্বৈত বিক্রি প্রতিরোধ', 'Blocks fake sellers & double sales')}
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white/10 rounded-2xl p-6 border border-white/15 relative flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-sky-400 text-slate-900 font-extrabold text-lg flex items-center justify-center mb-4">
                ২
              </div>
              <h3 className="text-lg font-bold text-white">
                {t('সাব-রেজিস্ট্রি ১১-রুল গেটকিপার', 'Sub-Registry 11-Rule Gatekeeper')}
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {t(
                  'সাব-রেজিস্ট্রার অফিসে দলিল তোলার সাথে সাথে রুল ইঞ্জিন ১১টি জালিয়াতি চেক (ওয়ারিশ ফাঁকি, জমির অংশের অধিক বিক্রি, আদালতের স্থগিতাদেশ, অপরিশোধিত ব্যাংক ঋণ) স্বয়ংক্রিয়ভাবে সম্পন্ন করে।',
                  'The rule engine verifies 11 criteria: unrecorded heirs, over-share transfers, court disputes, and active mortgage encumbrances.'
                )}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/15 text-[11px] text-sky-300 font-semibold">
              ✔ {t('ঝুঁকিপূর্ণ দলিল তাৎক্ষণিক HELD বা বাতিল', 'Instant HELD flag for risky deeds')}
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white/10 rounded-2xl p-6 border border-white/15 relative flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 font-extrabold text-lg flex items-center justify-center mb-4">
                ৩
              </div>
              <h3 className="text-lg font-bold text-white">
                {t('ডিজিটাল স্বাক্ষর ও স্বয়ংক্রিয় ই-মিউটেশন', 'Ed25519 Signing & e-Mutation')}
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {t(
                  'অনুমোদনের পর দলিলের বিষয়বস্তু Ed25519 প্রাইভেট কী দিয়ে স্বাক্ষরিত হয়ে SHA-256 হ্যাশ-চেইনে যুক্ত হয় এবং তাৎক্ষণিকভাবে এসি ল্যান্ড অফিসে স্বয়ংক্রিয় ই-মিউটেশন কিউতে পৌঁছে যায়।',
                  'Upon registration, the deed is cryptographically signed, chained to the ledger, and instantly queued for AC Land e-mutation.'
                )}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/15 text-[11px] text-amber-300 font-semibold">
              ✔ {t('অপরিবর্তনীয় লেজার + QR সনদ', 'Tamper-evident ledger + QR certificate')}
            </div>
          </div>
        </div>
      </section>

      {/* Structural Comparison: Traditional Manual Land Registry vs BhumiShield Trust Layer */}
      <section className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/90 shadow-2xs space-y-6">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#006A4E]">
            {t('পদ্ধতিগত তুলনা ও উদ্ভাবনী প্রভাব', 'INNOVATION & VALUE PROPOSITION')}
          </span>
          <h2 className="text-2xl font-extrabold text-slate-800 mt-0.5">
            {t(
              'প্রচলিত পদ্ধতি বনাম ভূমি সুরক্ষা ক্রিপ্টোগ্রাফিক লেজার সিস্টেম',
              'Traditional Manual Registry vs. BhumiShield Cryptographic Ledger'
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t(
              'কীভাবে ভূমি সুরক্ষা বাংলাদেশের ভূমি ব্যবস্থাপনার ৫টি প্রধান আইনি ফাঁকফোকর ও জালিয়াতি চিরতরে বন্ধ করে:',
              'How BhumiShield permanently closes the 5 major systemic vulnerabilities in land management:'
            )}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 uppercase font-extrabold">
                <th className="py-3.5 px-4">{t('ঝুঁকির ক্ষেত্র', 'Vulnerability Vector')}</th>
                <th className="py-3.5 px-4 text-rose-700 bg-rose-50/50">
                  {t('প্রচলিত ম্যানুয়াল রেজিস্ট্রেশন', 'Traditional Manual Process')}
                </th>
                <th className="py-3.5 px-4 text-[#006A4E] bg-emerald-50/60 font-black">
                  {t('ভূমি সুরক্ষা ট্রাস্ট লেয়ার সমাধান', 'BhumiShield Trust Layer Solution')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              <tr>
                <td className="py-3 px-4 font-bold text-slate-800">
                  {t('১. একই জমি একাধিকবার বিক্রয় (Double Sale)', '1. Double Selling of Same Plot')}
                </td>
                <td className="py-3 px-4 text-slate-600 bg-rose-50/20">
                  {t(
                    'বালাম বইয়ে ম্যানুয়াল اندراج হতে মাসব্যাপী সময় লাগে; এই ফাঁকে একই জমি ২-৩ জনের কাছে বিক্রি সম্ভব।',
                    'Manual registry book entry takes weeks; fraudsters exploit delay to sell to multiple buyers.'
                  )}
                </td>
                <td className="py-3 px-4 text-slate-800 bg-emerald-50/30 font-semibold">
                  {t(
                    '✔ দলিলের ড্রাফট তৈরির সাথে সাথেই দাগের অবশিষ্ট অংশ তাৎক্ষণিকভাবে ব্লক ও লক হয়ে যায়।',
                    '✔ Real-time share decrement prevents any overlapping deed draft on the same dag.'
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-800">
                  {t('২. মালিকের অজান্তে জাল আমমোক্তারনামা', '2. Forged Power of Attorney (POA)')}
                </td>
                <td className="py-3 px-4 text-slate-600 bg-rose-50/20">
                  {t(
                    'জাল এনআইডি ও ভুয়া দলিল বানিয়ে প্রবাসে বা বৃদ্ধ মালিকের জমি গোপনে রেজিস্ট্রেশন করে ফেলা হয়।',
                    'Fraudsters forge fake POAs and register deeds while actual owners are away.'
                  )}
                </td>
                <td className="py-3 px-4 text-slate-800 bg-emerald-50/30 font-semibold">
                  {t(
                    '✔ নাগরিক ভল্ট থেকে "🔒 বিক্রয় লক" সক্রিয় থাকলে মালিকের বায়োমেট্রিক বা ডিজিটাল আনলক ছাড়া কেউ দলিল করতে পারে না।',
                    '✔ Citizen Sale Protection Lock blocks deed execution until owner unlocks via verified session.'
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-800">
                  {t('৩. খতিয়ানের ধারাবাহিকতা ও অংশে ফাঁকি', '3. Khatian Lineage Break & Over-Share')}
                </td>
                <td className="py-3 px-4 text-slate-600 bg-rose-50/20">
                  {t(
                    'সিএস থেকে বিএস খতিয়ানে জমির অংশ কীভাবে আসল তা যাচাই করার কোনো স্বয়ংক্রিয় ব্যবস্থা নেই।',
                    'No automated lineage tool exists to cross-check CS -> SA -> RS -> BS succession.'
                  )}
                </td>
                <td className="py-3 px-4 text-slate-800 bg-emerald-50/30 font-semibold">
                  {t(
                    '✔ সিএস→এসএ→আরএস→বিএস চেইনের স্বয়ংক্রিয় গণিত এবং ওয়ারিশ অংশের ভগ্নাংশ মুহূর্তেই স্ক্রিন করা হয়।',
                    '✔ Automated mathematical continuity engine audits acreage from 1940 CS to latest BS.'
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-800">
                  {t('৪. ব্যাংকে বন্ধক রাখা জমি বিক্রি / দ্বৈত ঋণ', '4. Selling Mortgaged Land / Double Loan')}
                </td>
                <td className="py-3 px-4 text-slate-600 bg-rose-50/20">
                  {t(
                    'ব্যাংক এবং সাব-রেজিস্ট্রির কোনো সংযোগ নেই; বন্ধকী জমি সাধারণ ক্রেতার কাছে প্রতারণামূলকভাবে বিক্রি হয়।',
                    'Banks and registry offices operate in silos; mortgaged plots are fraudulently sold.'
                  )}
                </td>
                <td className="py-3 px-4 text-slate-800 bg-emerald-50/30 font-semibold">
                  {t(
                    '✔ সকল তফসিলি ব্যাংকের মর্টগেজ লিয়েন সংযুক্ত; ঋণ পরিশোধ ছাড়া সাব-রেজিস্ট্রি দলিল গ্রহণ করতে পারবে না।',
                    '✔ Central scheduled bank lien registry blocks deed execution until QR-signed NOC is issued.'
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-800">
                  {t('৫. বালাম পাতা কাটা বা ডাটাবেজ টেম্পারিং', '5. Physical Registry Tampering & DB Manipulation')}
                </td>
                <td className="py-3 px-4 text-slate-600 bg-rose-50/20">
                  {t(
                    'বালামের পাতা ছেঁড়া, ফ্লুইড দেওয়া বা ডাটাবেজের রেকর্ড ম্যানুয়ালি বদলানো ধরা পড়ে না।',
                    'Tearing physical volume pages or altering database rows leaves no tamper evidence.'
                  )}
                </td>
                <td className="py-3 px-4 text-slate-800 bg-emerald-50/30 font-semibold">
                  {t(
                    '✔ SHA-256 হ্যাশ-চেইন ও Ed25519 স্বাক্ষর; ১টি অক্ষরও পরিবর্তন করলে সম্পূর্ণ চেইনে লাল অ্যালার্ট জারি হয়।',
                    '✔ Cryptographic hash-chain: changing 1 byte breaks recomputed hash and alerts auditors.'
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const StatPill: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-white/10 rounded-xl p-3 border border-white/15">
    <div className="text-xl md:text-2xl font-extrabold text-white">{value}</div>
    <div className="text-[11px] text-emerald-100 font-medium">{label}</div>
  </div>
);

const RoleGatewayCard: React.FC<{
  icon: React.ReactNode;
  dept: string;
  title: string;
  features: string[];
  onClick: () => void;
}> = ({ icon, dept, title, features, onClick }) => {
  const { t } = useAppUI();
  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-xl p-5 border border-slate-200 hover:border-[#006A4E] shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="w-11 h-11 rounded-xl bg-slate-100 group-hover:bg-[#E6F2EE] flex items-center justify-center transition-colors">
            {icon}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
            {dept}
          </span>
        </div>
        <h3 className="text-base font-extrabold text-slate-800 group-hover:text-[#006A4E]">
          {title}
        </h3>
        <ul className="mt-3 space-y-1.5">
          {features.map((f, i) => (
            <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
              <span className="text-[#006A4E] font-bold">•</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-[#006A4E]">
        <span>{t('প্যানেল ওপেন করুন', 'Open Workspace')}</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );
};
