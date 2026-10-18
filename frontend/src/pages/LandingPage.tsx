import React, { useState, useEffect } from 'react';
import { useAppUI, UserRole } from '../i18n';
import { BhumiApi, ServiceCatalogueItem } from '../api/client';
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
  KeyRound,
  ExternalLink,
  MapPin,
  Compass,
  FileCode2,
  Layers,
  Shield,
  FileCheck2
} from 'lucide-react';
import {
  TopographicContourVector,
  CadastralMouzaMapWidget,
  CADASTRAL_PLOTS,
  CadastralPlotData,
  SurveyorChainConnector,
  Ed25519WaxSealVector,
  KhatianLineageVector,
  CadastralPinVector,
  CitizenVaultLockVector,
  BankLienNocVector
} from '../components/landing/LandVectors';

const ROLE_ROUTE: Record<string, string> = {
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
  const [deeds, setDeeds] = useState<any[]>([]);
  const [catalogueServices, setCatalogueServices] = useState<ServiceCatalogueItem[]>([]);
  const [catalogueState, setCatalogueState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selectedServiceCat, setSelectedServiceCat] = useState<string>('ALL');
  
  // Track/Search Card state
  const [searchType, setSearchType] = useState<'deed' | 'plot'>('deed');
  const [trackInput, setTrackInput] = useState('DL-2026-1001');
  const [selectedMouza, setSelectedMouza] = useState<number>(1);
  const [selectedPlotId, setSelectedPlotId] = useState<number>(1);

  // Cadastral Interactive Map state
  const [selectedCadastralPlot, setSelectedCadastralPlot] = useState<CadastralPlotData>(CADASTRAL_PLOTS[0]);

  const fetchLandingData = () => {
    Promise.allSettled([
      BhumiApi.getStatsSummary(),
      BhumiApi.getLocations(),
      BhumiApi.getPlots(),
      BhumiApi.listRegistrarDeeds().catch(() => []),
      BhumiApi.listPublicServices(),
    ])
      .then(([st, locs, plts, dds, svcs]) => {
        if (st.status === 'fulfilled') setStats(st.value);
        if (locs.status === 'fulfilled') setLocations(locs.value);
        if (plts.status === 'fulfilled' && Array.isArray(plts.value)) {
          setPlots(plts.value);
          if (plts.value.length > 0 && !selectedPlotId) {
            setSelectedPlotId(plts.value[0].id);
          }
        }
        if (dds.status === 'fulfilled' && Array.isArray(dds.value)) {
          setDeeds(dds.value);
        }
        if (svcs.status === 'fulfilled') {
          setCatalogueServices(svcs.value?.items || []);
          setCatalogueState('ready');
        } else setCatalogueState('error');
      })
      .catch(() => setCatalogueState('error'));
  };

  useEffect(() => {
    fetchLandingData();
    const timer = setInterval(fetchLandingData, 8000);
    const onFocus = () => fetchLandingData();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const enterRolePortal = (targetRole: UserRole) => {
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

  return (
    <div className="space-y-14 pb-20">
      {/* Hero Section — Land Cadastral & Topographic Mesh */}
      <section className="relative overflow-hidden bg-[#074f38] text-white">
        {/* Precision Topographic Vector Contour Grid */}
        <TopographicContourVector opacity={0.24} strokeColor="rgba(52, 211, 153, 0.45)" />

        {/* Ambient Glowing Highlights */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/4 h-80 w-80 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:gap-10 lg:grid-cols-[1.3fr_1fr] lg:py-20 items-center w-full min-w-0">
          {/* Left Text Block with Cadastral Vector Accents */}
          <div className="w-full min-w-0">
            {/* Top Badge with Cadastral Crosshair Pin */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-1.5 text-xs sm:text-sm text-emerald-100 ring-1 ring-white/20 font-medium shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold">{t('গণপ্রজাতন্ত্রী বাংলাদেশ · ভূমি ও দলিল ট্রাস্ট লেয়ার (LandTech 2026)', 'Bangladesh National Land & Deed Trust Layer')}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight text-white break-words">
              {t('ডিজিটাল ক্যাডাস্ট্রে আপনার জমির পূর্ণ নিরাপত্তা ও সত্যতা', 'Secure Land Cadastre & Deed Protection in One Place')}
            </h1>

            <p className="mt-4 max-w-xl text-sm sm:text-base lg:text-lg text-emerald-100/90 leading-relaxed font-normal break-words">
              {t(
                'কোন অফিসে ধর্না দিতে হবে না। বায়না করার আগেই সিএস-এসএ-আরএস-বিএস খতিয়ান চেইন নিরীক্ষা, বায়োমেট্রিক বিক্রয় লক, দ্বৈত বন্ধক প্রতিরোধ ও তাৎক্ষণিক ই-মিউটেশন — শতভাগ ডিজিটাল নিরাপত্তায়।',
                'No manual office delays. Check 4-epoch khatian lineage (CS→SA→RS→BS), activate citizen sale locks, detect bank lien duplicates, and verify Ed25519 tamper-proof deeds from anywhere.'
              )}
            </p>

            {/* Quick Land Cadastre Feature Pills */}
            <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-semibold text-emerald-200/90">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/10 ring-1 ring-white/15">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                {t('১১-রুল ফ্রড গেটকিপার', '11-Rule Gatekeeper')}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/10 ring-1 ring-white/15">
                <Layers className="w-3.5 h-3.5 text-emerald-300" />
                {t('CS➔SA➔RS➔BS খতিয়ান অডিট', 'Survey Lineage Audit')}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/10 ring-1 ring-white/15">
                <Lock className="w-3.5 h-3.5 text-amber-300" />
                {t('ডিজিটাল বিক্রয় লক ভল্ট', 'Citizen Sale Lock')}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/10 ring-1 ring-white/15">
                <QrCode className="w-3.5 h-3.5 text-emerald-300" />
                {t('Ed25519 ক্রিপ্টোগ্রাফিক সনদ', 'Ed25519 Signed Deeds')}
              </span>
            </div>

            {/* Action CTA Buttons */}
            <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row flex-wrap gap-3.5 w-full">
              <button
                type="button"
                onClick={() => onNavigate('check')}
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl bg-white px-6 font-bold text-[#074f38] hover:bg-emerald-50 shadow-md transition-all cursor-pointer text-sm sm:text-base group"
              >
                <Search className="w-5 h-5 text-[#074f38] group-hover:scale-110 transition-transform" />
                <span>{t('জমি কেনার আগে যাচাই', 'Check Before You Buy')}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('qr')}
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl bg-white/15 px-6 font-semibold text-white ring-1 ring-white/30 hover:bg-white/25 transition-all cursor-pointer text-sm sm:text-base"
              >
                <QrCode className="w-5 h-5 text-emerald-300" />
                <span>{t('দলিল QR কোড যাচাই', 'Verify Deed QR Code')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const elem = document.getElementById('cadastral-showcase');
                  if (elem) elem.scrollIntoView({ behavior: 'smooth' });
                  else onNavigate('cadastral');
                }}
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-950/40 px-4 font-semibold text-emerald-200 ring-1 ring-emerald-500/30 hover:bg-emerald-900/50 transition-all cursor-pointer text-xs sm:text-sm"
              >
                <Compass className="w-4 h-4 text-emerald-300" />
                <span>{t('মৌজা নকশা লাইভ এক্সপ্লোরার', 'Live Mouza Map')}</span>
              </button>
            </div>
          </div>

          {/* Right Card — Track Deed or Plot with Vector Badge & Dynamic Preview */}
          <div className="rounded-2xl border border-emerald-900/10 bg-white shadow-2xl self-center p-5 sm:p-6 text-slate-800 w-full min-w-0 max-w-full relative">
            {/* Top Card Header with Vector Indicator */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {t('আবেদন বা দলিলের অবস্থা জানুন', 'Track Deed or Verify Plot')}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t(
                    'দলিল নম্বর দিন (যেমন DL-2026-1001) বা দাগ নম্বর নির্বাচন করুন',
                    'Enter Deed Number like DL-2026-1001 or select Plot Dag'
                  )}
                </p>
              </div>
              <div className="shrink-0">
                {searchType === 'deed' ? (
                  <Ed25519WaxSealVector size={38} />
                ) : (
                  <CadastralPinVector size={36} />
                )}
              </div>
            </div>

            {/* Toggle Search Mode */}
            <div className="flex gap-1.5 mt-4 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setSearchType('deed')}
                className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer min-h-[34px] flex items-center justify-center gap-1.5 ${
                  searchType === 'deed' ? 'bg-white text-[#074f38] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                <span>{t('দলিল নম্বর / QR', 'Deed Number / QR')}</span>
              </button>
              <button
                type="button"
                onClick={() => setSearchType('plot')}
                className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer min-h-[34px] flex items-center justify-center gap-1.5 ${
                  searchType === 'plot' ? 'bg-white text-[#074f38] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-emerald-700" />
                <span>{t('দাগ নম্বর যাচাই', 'Plot Dag Check')}</span>
              </button>
            </div>

            <form onSubmit={handleHeroSearch} className="mt-4 space-y-3">
              {searchType === 'deed' ? (
                <div className="space-y-2">
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
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-bold h-11 px-4 sm:px-5 bg-[#006A4E] hover:bg-[#00553e] text-white transition-colors cursor-pointer text-sm shadow-xs whitespace-nowrap"
                    >
                      <Search className="w-4 h-4" />
                      <span>{t('খুঁজুন', 'Search')}</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono px-1">
                    <span>Ed25519 ডিজিটাল সিল যাচাই</span>
                    <span className="text-emerald-700 font-bold">SHA-256 Chained</span>
                  </div>
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

            {/* Dynamic Real-time Quick Preset Links from Database */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSearchType('deed');
                  const deedCode = deeds[0]?.deed_code || 'DL-2026-1001';
                  setTrackInput(deedCode);
                  onNavigate('qr');
                }}
                className="rounded-lg bg-slate-50 border border-slate-200/90 p-2.5 hover:bg-emerald-50 text-slate-700 font-semibold text-left transition-colors flex items-center justify-between cursor-pointer min-h-[36px]"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="truncate">{deeds[0]?.deed_code || 'DL-2026-1001'} (অক্ষত)</span>
                </div>
                <span className="text-emerald-700 font-bold ml-1">→</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchType('deed');
                  const targetDeed = deeds.find((d: any) => d.status === 'HELD' || d.is_flagged_admin) || deeds[1] || deeds[0];
                  const code = targetDeed?.deed_code || 'DL-2026-1005';
                  setTrackInput(code);
                  onNavigate('qr');
                }}
                className="rounded-lg bg-slate-50 border border-slate-200/90 p-2.5 hover:bg-rose-50 text-slate-700 font-semibold text-left transition-colors flex items-center justify-between cursor-pointer min-h-[36px]"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="truncate">{(deeds.find((d: any) => d.status === 'HELD' || d.is_flagged_admin) || deeds[1])?.deed_code || 'DL-2026-1005'} (স্থগিত/টেম্পার)</span>
                </div>
                <span className="text-rose-600 font-bold ml-1">→</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchType('plot');
                  if (plots[0]) {
                    setSelectedMouza(plots[0].location_id || plots[0].mouza_id || 1);
                    setSelectedPlotId(plots[0].id);
                  }
                  onNavigate('check');
                }}
                className="rounded-lg bg-slate-50 border border-slate-200/90 p-2.5 hover:bg-emerald-50 text-slate-700 font-semibold text-left transition-colors flex items-center justify-between cursor-pointer min-h-[36px]"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="truncate">{plots[0] ? `দাগ ${plots[0].dag_no_bn || plots[0].dag_no} (${plots[0].mouza_bn || ''})` : 'দাগ ১০১ (ধানমন্ডি)'}</span>
                </div>
                <span className="text-emerald-700 font-bold ml-1">→</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchType('plot');
                  const targetP = plots.find((p: any) => p.has_active_mortgage || p.owner_sale_locked) || plots[1] || plots[0];
                  if (targetP) {
                    setSelectedMouza(targetP.location_id || targetP.mouza_id || 1);
                    setSelectedPlotId(targetP.id);
                  }
                  onNavigate('check');
                }}
                className="rounded-lg bg-slate-50 border border-slate-200/90 p-2.5 hover:bg-amber-50 text-slate-700 font-semibold text-left transition-colors flex items-center justify-between cursor-pointer min-h-[36px]"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="truncate">
                    {plots.find((p: any) => p.has_active_mortgage || p.owner_sale_locked)
                      ? `দাগ ${plots.find((p: any) => p.has_active_mortgage || p.owner_sale_locked).dag_no_bn || plots.find((p: any) => p.has_active_mortgage || p.owner_sale_locked).dag_no} (বন্ধকী/লক)`
                      : (plots[1] ? `দাগ ${plots[1].dag_no_bn || plots[1].dag_no} (${plots[1].mouza_bn || ''})` : 'দাগ ১০৬ (বন্ধকী দাগ)')}
                  </span>
                </div>
                <span className="text-amber-700 font-bold ml-1">→</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* KPI Stats Strip — Land Ledger Cockpit with Bespoke Vector Badges */}
      {stats && (
        <section className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {[
              {
                label: t('নিবন্ধিত দাগ', 'Plots Monitored'),
                value: stats.kpis?.total_plots ?? 0,
                icon: <CadastralPinVector size={26} />,
                sub: t('ক্যাডাস্ট্রাল সীমানা', 'Cadastral parcels')
              },
              {
                label: t('ডিজিটাল খতিয়ান', 'Khatians Indexed'),
                value: stats.kpis?.total_khatians ?? 0,
                icon: <FileSpreadsheet className="w-6 h-6 text-emerald-700" />,
                sub: t('CS/SA/RS/BS চেইন', 'Survey lineage')
              },
              {
                label: t('স্বাক্ষরিত দলিল', 'Deeds Chained'),
                value: stats.kpis?.total_deeds ?? 0,
                icon: <Ed25519WaxSealVector size={28} />,
                sub: t('Ed25519 সিলযুক্ত', 'Cryptographically signed')
              },
              {
                label: t('সক্রিয় ব্যাংক বন্ধক', 'Active Liens'),
                value: stats.kpis?.active_mortgages_count ?? 0,
                icon: <BankLienNocVector size={26} />,
                sub: t('দ্বৈত বন্ধক অবরুদ্ধ', 'Duplicate mortgage safe')
              },
              {
                label: t('ই-মিউটেশন সম্পন্ন', 'Mutations Done'),
                value: stats.kpis?.approved_mutations ?? 0,
                icon: <Landmark className="w-6 h-6 text-[#006A4E]" />,
                sub: t('খতিয়ান হালনাগাদ', 'BS records updated')
              },
              {
                label: t('দাপ্তরিক কর্মকর্তা', 'Active Officers'),
                value: stats.kpis?.active_officers_count ?? 0,
                icon: <ShieldCheck className="w-6 h-6 text-emerald-800" />,
                sub: t('গেটকিপার ডেস্কে', 'Gatekeeper consoles')
              },
            ].map((kpi, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all relative overflow-hidden group"
              >
                {/* Micro corner coordinate crosshair */}
                <span className="absolute top-2 right-2 text-[10px] text-slate-300 font-mono group-hover:text-emerald-400 transition-colors">+</span>
                
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50/80 flex items-center justify-center">
                    {kpi.icon}
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>

                <div className="text-xl sm:text-2xl font-extrabold text-[#074f38] font-mono tracking-tight">
                  {toBanglaDigits(kpi.value as number, lang)}
                </div>
                <div className="text-xs font-bold text-slate-900 mt-1">{kpi.label}</div>
                <div className="text-[10px] text-slate-500 font-medium">{kpi.sub}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* NEW Showcase Section: Interactive Cadastral Mouza Map & Plot Intelligence */}
      <section id="cadastral-showcase" className="mx-auto max-w-7xl px-4 scroll-mt-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold mb-1.5">
              <Compass className="w-3.5 h-3.5 text-emerald-700" />
              <span>{t('লাইভ ক্যাডাস্ট্রাল মৌজা নকশা ভেক্টর', 'Interactive Cadastral Mouza Map')}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
              {t('নকশা থেকে আপনার দাগ খুঁজুন ও তাৎক্ষণিক ঝুঁকি দেখুন', 'Explore Parcels & Real-time Risk on Mouza Map')}
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              {t(
                'দাগের সীমানার উপর ক্লিক করে দেখুন: মালিকানা, জমির শ্রেণি, ৪-পর্যায়ের জরিপ ধারাবাহিকতা ও বন্ধক স্থিতি',
                'Click any parcel polygon to inspect ownership, land use, survey epoch lineage, and lien status'
              )}
            </p>
          </div>
          <button
            onClick={() => onNavigate('cadastral')}
            className="text-xs sm:text-sm font-bold text-[#006A4E] hover:text-[#00553e] flex items-center gap-1.5 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg transition-colors shrink-0"
          >
            <span>{t('পূর্ণ GIS ক্যাডাস্ট্রাল ম্যাপ খুলুন', 'Open Full GIS Cadastre')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Cadastral Mouza Map Widget */}
        <CadastralMouzaMapWidget
          selectedPlot={selectedCadastralPlot}
          onSelectPlot={setSelectedCadastralPlot}
          lang={lang}
          onNavigate={onNavigate}
        />
      </section>

      {/* Trust Pipeline — 3 Simple Steps Connected by Surveyor's Chain */}
      <section className="bg-gradient-to-b from-slate-50 to-emerald-50/20 border-y border-slate-200/90 py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="max-w-2xl mb-8">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>{t('সম্পূর্ণ ডিজিটাল জমি হস্তান্তর চক্র', 'End-to-End Trust Pipeline')}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
              {t('তিন ধাপে সম্পূর্ণ সেবা ও নির্ভুল আস্থা', 'Complete Trust in Three Steps')}
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              {t(
                'বায়না থেকে খতিয়ান হালনাগাদ — প্রতিটি ধাপ ক্যাডাস্ট্রাল ভেক্টর ও ক্রিপ্টোগ্রাফিক চেইনে সুরক্ষিত:',
                'From agreement to BS khatian update — mathematically unbroken continuity across all stages:'
              )}
            </p>
          </div>

          {/* Surveyor Chain Vector Line connecting the 3 steps */}
          <SurveyorChainConnector className="mb-6" />

          <div className="grid md:grid-cols-3 gap-6">
            {/* Step 1: Citizen Pre-Check & Khatian Lineage */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4 hover:border-emerald-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg font-mono">
                    ১
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    {t('প্রাক-বায়না পর্যায়', 'Pre-Contract Stage')}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900">
                  {t('নাগরিক প্রাক-অনুসন্ধান ও খতিয়ান চেইন', '1. Citizen Pre-Check & Lineage')}
                </h3>
                
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  {t(
                    'বায়নার পূর্বে খতিয়ান চেইন (CS→SA→RS→BS), বিক্রেতার প্রাপ্য অংশ, ওয়ারিশ সনদ ও সক্রিয় ব্যাংক বন্ধক মুক্ততা তাৎক্ষণিক নিরীক্ষা।',
                    'Verify survey lineage, seller share balance, heir genealogy, and active bank mortgages before signing earnest contract.'
                  )}
                </p>
              </div>

              {/* Embedded CS -> SA -> RS -> BS Vector */}
              <div className="pt-3 border-t border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">{t('৪-পর্যায়ের জরিপ ধারাবাহিকতা', '4-Epoch Survey Continuity')}</div>
                <KhatianLineageVector />
              </div>
            </div>

            {/* Step 2: 11-Rule Gatekeeper */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4 hover:border-blue-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-lg font-mono">
                    ২
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                    {t('নিবন্ধন গেটকিপার', 'Registration Gatekeeper')}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900">
                  {t('১১-রুল স্বয়ংক্রিয় ফ্রড স্ক্যান', '2. 11-Rule Gatekeeper Scan')}
                </h3>
                
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  {t(
                    'সাব-রেজিস্ট্রির ডেস্কে স্বয়ংক্রিয় ১১টি রুল যাচাই: দ্বৈত দলিল ব্লক, বিক্রয় লক সম্মতি, ফারায়েজ অংশ ব্যালেন্স ও সরকারি রাজস্ব চালান নিরীক্ষা।',
                    'Automated gatekeeper execution: double registry prevention, citizen lock check, share balance compliance, and verified fees.'
                  )}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t('দ্বৈত বিক্রয় স্বয়ংক্রিয়ভাবে অবরুদ্ধ', 'Zero duplicate deed registration')}</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t('লককৃত জমি মালিকের অনুমতি ছাড়া নিষিদ্ধ', 'Sale lock enforced before registry')}</span>
                </div>
              </div>
            </div>

            {/* Step 3: Ed25519 Cryptographic Ledger */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4 hover:border-purple-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-lg font-mono">
                    ৩
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                    {t('লেজার ও নামজারি', 'Ledger & Mutation')}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900">
                  {t('Ed25519 লেজার ও স্বয়ংক্রিয় নামজারি', '3. Signed Ledger & e-Mutation')}
                </h3>
                
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  {t(
                    'দলিল রেজিস্ট্রি মাত্রই Ed25519 ডিজিটাল স্বাক্ষর, অপরিবর্তনীয় SHA-256 হ্যাশ চেইন ও এসি ল্যান্ডের কিউতে তাৎক্ষণিক নামজারি হ্যান্ডঅফ।',
                    'Instant Ed25519 cryptographic signing, immutable SHA-256 hash chaining, and automated queuing for AC Land mutation.'
                  )}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">{t('ক্রিপ্টোগ্রাফিক সুরক্ষা', 'Tamper-Proof Assurance')}</span>
                  <span className="text-xs font-mono font-bold text-[#074f38]">SHA-256 Merkle Block</span>
                </div>
                <Ed25519WaxSealVector size={44} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Bilingual Service Catalogue & Source-Linked Guidance */}
      <section className="mx-auto max-w-7xl px-4">
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
              {t('সেবাসমূহ ও অফিসিয়াল নির্দেশিকা', 'Services & Official Guidance')}
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              {t(
                'ভূমি মন্ত্রণালয় ও নিবন্ধন অধিদপ্তরের অফিসিয়াল সেবা এবং ভূমি সুরক্ষার সমন্বিত ট্রাস্ট লেয়ার',
                'Official Ministry services and BhumiShield integrated trust layers'
              )}
            </p>
          </div>
          <button
            onClick={() => onNavigate('help')}
            className="text-xs sm:text-sm font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
          >
            <span>{t('সরকারি ফি ও সার্কুলার তালিকা', 'Official Fees & Circulars')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'ALL', name_bn: 'সকল সেবা', name_en: 'All Services' },
            { id: 'REVENUE_MUTATION', name_bn: 'ই-নামজারি ও খাজনা', name_en: 'e-Mutation & Tax' },
            { id: 'RECORD_MAPS', name_bn: 'খতিয়ান ও মৌজা ম্যাপ', name_en: 'Khatian & Mouza Maps' },
            { id: 'LAND_REGISTRATION', name_bn: 'দলিল ও প্রাক-নিবন্ধন', name_en: 'Deed & Registry' },
            { id: 'FINANCE_MORTGAGE', name_bn: 'ব্যাংক জামানত ও লিয়েন', name_en: 'Bank Lien & NOC' },
            { id: 'HELPLINE_INFO', name_bn: 'সহায়িকা ও কল সেন্টার', name_en: 'Help & 16122 Call Center' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedServiceCat(cat.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[32px] ${
                selectedServiceCat === cat.id
                  ? 'bg-[#006A4E] text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {lang === 'bn' ? cat.name_bn : cat.name_en}
            </button>
          ))}
        </div>

        {catalogueState !== 'ready' && (
          <p role="status" className="mb-4 text-sm text-slate-600">
            {catalogueState === 'loading'
              ? t('সেবার তালিকা লোড হচ্ছে…', 'Loading service catalogue…')
              : t('সেবার তালিকা এখন পাওয়া যাচ্ছে না। আবার চেষ্টা করতে পৃষ্ঠা রিফ্রেশ করুন।', 'Service catalogue is unavailable. Refresh the page to retry.')}
          </p>
        )}

        {catalogueState === 'ready' && !catalogueServices.some((s) => selectedServiceCat === 'ALL' || s.category === selectedServiceCat) && (
          <p className="mb-4 text-sm">{t('এই বিভাগে প্রকাশিত সেবা নেই।', 'No published services in this category.')}</p>
        )}

        {/* Services Cards Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalogueServices.filter((s) => selectedServiceCat === 'ALL' || s.category === selectedServiceCat).map((srv: any) => {
            const isCatalogueItem = 'service_code' in srv;
            const isExternal = isCatalogueItem && srv.service_type === 'EXTERNAL_OFFICIAL' && Boolean(srv.external_url);
            
            const handleClick = () => {
              if (isCatalogueItem) {
                if (isExternal && srv.external_url) {
                  window.open(srv.external_url, '_blank', 'noopener,noreferrer');
                } else if (srv.internal_route) {
                  onNavigate(srv.internal_route);
                } else {
                  onNavigate('check');
                }
              } else {
                srv.action?.();
              }
            };

            const icon = isCatalogueItem
              ? (() => {
                  const cd = (srv.service_code || '').toUpperCase();
                  const c = (srv.category || '').toUpperCase();
                  if (cd.includes('MUTATION') || c === 'REVENUE_MUTATION') return <Landmark className="w-6 h-6" />;
                  if (cd.includes('KHATIAN') || cd.includes('MAP') || c === 'RECORD_MAPS') return <FileSpreadsheet className="w-6 h-6" />;
                  if (cd.includes('DEED') || c === 'LAND_REGISTRATION') return <FileText className="w-6 h-6" />;
                  if (cd.includes('MORTGAGE') || c === 'FINANCE_MORTGAGE') return <Building2 className="w-6 h-6" />;
                  if (cd.includes('DISPUTE') || c === 'DISPUTE_CITIZEN') return <Scale className="w-6 h-6" />;
                  if (cd.includes('HELPLINE') || c === 'HELPLINE_INFO') return <PhoneCall className="w-6 h-6" />;
                  if (cd.includes('QR') || cd.includes('INTEGRITY')) return <QrCode className="w-6 h-6" />;
                  return <Search className="w-6 h-6" />;
                })()
              : srv.icon;

            const title = lang === 'bn' ? srv.title_bn : srv.title_en;
            const desc = lang === 'bn' ? (srv.description_bn || srv.desc_bn) : (srv.description_en || srv.desc_en);
            const authority = isCatalogueItem ? (lang === 'bn' ? srv.authority_name_bn : srv.authority_name_en) : null;

            return (
              <div
                key={srv.id}
                onClick={handleClick}
                role={isExternal ? 'link' : 'button'}
                tabIndex={0}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleClick(); } }}
                className="group rounded-xl border border-gray-200 bg-white shadow-card flex flex-col justify-between p-5 transition hover:border-emerald-400 hover:shadow-md cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-[#006A4E] focus-visible:outline-none relative overflow-hidden"
              >
                {/* Micro corner coordinate crosshair */}
                <span className="absolute top-2 right-2 text-[10px] text-slate-200 font-mono group-hover:text-emerald-400 transition-colors">+</span>

                <div className="flex gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 group-hover:bg-[#006A4E] group-hover:text-white transition-colors shadow-2xs">
                    {icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-[#006A4E] transition-colors">
                        {title}
                      </span>
                      {isExternal ? (
                        <ExternalLink className="h-4 w-4 text-emerald-700 shrink-0 opacity-80 group-hover:opacity-100" />
                      ) : (
                        <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100 text-emerald-700 shrink-0" />
                      )}
                    </div>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed font-normal line-clamp-2">
                      {desc}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">
                    {authority || (lang === 'bn' ? 'ভূমি সুরক্ষা ট্রাস্ট ফিচার' : 'BhumiShield Feature')}
                  </span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full ${
                      isExternal
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {isExternal
                      ? t('অফিসিয়াল পোর্টাল ↗', 'Official Portal ↗')
                      : t('সরাসরি ফিচার →', 'Feature →')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Informational Disclaimer Banner */}
        <div className="mt-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span>
            {t(
              'ⓘ সরকারি সেবাসমূহ সংশ্লিষ্ট ভূমি অফিসের কর্তৃত্বাধীন। ভূমি সুরক্ষা একটি স্বাধীন ল্যান্ডটেক ২০২৬ প্রোটোটাইপ।',
              'ⓘ Official government services belong to their respective authorities. BhumiShield is an independent LandTech 2026 prototype.'
            )}
          </span>
          <button
            onClick={() => onNavigate('help')}
            className="text-emerald-800 font-bold hover:underline shrink-0 cursor-pointer"
          >
            {t('সরকারি ফি ও সার্কুলার নির্দেশিকা দেখুন →', 'View Official Fees & Circular Guide →')}
          </button>
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
            <button
              type="button"
              key={item.role}
              onClick={() => enterRolePortal(item.role)}
              className="rounded-xl border border-slate-200 bg-white p-5 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group text-left w-full focus-visible:ring-2 focus-visible:ring-[#006A4E] focus-visible:outline-none relative overflow-hidden"
            >
              <span className="absolute top-2 right-2 text-[10px] text-slate-200 font-mono group-hover:text-emerald-400 transition-colors">+</span>
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
            </button>
          ))}
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
              'Five land-record risks addressed within the records available to this application:'
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
                  t('নাগরিক ডিজিটাল বিক্রয় লক; ভল্ট থেকে মালিকের অনুমোদন বা ডিজিটাল আনলক ছাড়া রেজিস্ট্রি স্বয়ংক্রিয়ভাবে অবরুদ্ধ', 'Citizen Digital Sale Lock; strictly blocked at gatekeeper until owner unlocks')
                ],
                [
                  t('খতিয়ান চেইন ফাঁকি (Lineage Break)', 'Lineage Manipulation'),
                  t('ম্যানুয়ালি সিএস-এসএ-আরএস মিলিয়ে দেখা অসম্ভব; ভুয়া পরচা ব্যবহার', 'Manual verification impossible; fake khatian sheets forged'),
                  t('সিএস (১৮৮৮-১৯৪০) থেকে প্রযোজ্য আরএস/বিএস খতিয়ানের মোট জমি ও ফারায়েজ ধারাবাহিকতা নিরীক্ষা', 'CS to RS/BS survey area continuity & inheritance audit')
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

      {/* Emergency Helpline Banner with Vector Topographic Background */}
      <section className="mx-auto max-w-7xl px-4">
        <div className="relative rounded-2xl bg-gradient-to-r from-[#074f38] via-[#05412e] to-[#043324] text-white p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl overflow-hidden">
          {/* Subtle Vector Contours in Helpline */}
          <TopographicContourVector opacity={0.16} strokeColor="rgba(52, 211, 153, 0.4)" />

          <div className="relative space-y-1.5 text-center md:text-left z-10">
            <div className="inline-flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <PhoneCall className="w-4 h-4" />
              <span>{t('সরকারি ভূমি সেবা কল সেন্টার ও অভিযোগ হটলাইন', 'Government Land Call Center & Grievance Cell')}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold">
              {t('ভূমি সেবা সংক্রান্ত যেকোনো তথ্যের জন্য কল করুন', 'Contact Official Land Support Directly')}
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/80 max-w-xl">
              {t(
                'ভূমি সুরক্ষা নাগরিক সেবা সার্বক্ষণিক হটলাইন ১৬১২২ এ কল করে তথ্য ও কারিগরি সহায়তা নিন (সার্বক্ষণিক সেবা চালু; অপারেটর নির্ধারিত সাধারণ কল চার্জ প্রযোজ্য)।',
                'Call BhumiShield Citizen Support Hotline 16122 for platform assistance and inquiry (24/7 service; standard telecom charges apply).'
              )}
            </p>
          </div>

          <div className="relative flex items-center gap-3 shrink-0 z-10">
            <div className="bg-white/10 backdrop-blur-sm px-5 py-3 rounded-xl text-center border border-white/20 shadow-inner">
              <span className="text-[10px] text-emerald-200 block uppercase font-bold tracking-wider">Land Helpline</span>
              <span className="text-2xl font-extrabold font-mono tracking-wider text-white">১৬১২২</span>
            </div>
            <button
              onClick={() => onNavigate('help')}
              className="px-5 py-3 rounded-xl bg-white text-[#074f38] hover:bg-emerald-50 font-bold text-xs cursor-pointer shadow-md transition-colors min-h-[46px]"
            >
              {t('সহায়িকা ও FAQ →', 'Help & FAQ →')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
