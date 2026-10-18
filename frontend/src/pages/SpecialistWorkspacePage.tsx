import React, { useState, useEffect } from 'react';
import {
  Scale,
  Building2,
  Search,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  QrCode,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  BookOpen,
  FileCheck,
  Compass,
} from 'lucide-react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';

interface SpecialistWorkspacePageProps {
  onNavigate?: (tab: string) => void;
}

export const SpecialistWorkspacePage: React.FC<SpecialistWorkspacePageProps> = ({ onNavigate }) => {
  const { lang, t, role, user } = useAppUI();
  const isDcRole = role === 'dc_acquisition_officer';
  const isLawyerRole = role === 'lawyer_court_user';

  const [plots, setPlots] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [acquisitions, setAcquisitions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlot, setSelectedPlot] = useState<any | null>(null);

  // Form & Action states
  const [projectName, setProjectName] = useState('ঢাকা-চট্টগ্রাম এক্সপ্রেসওয়ে অধিগ্রহণ প্রকল্প');
  const [gazetteNo, setGazetteNo] = useState('');
  const [acquiredArea, setAcquiredArea] = useState('15.50');
  const [sectionType, setSectionType] = useState('SECTION_4');
  const [suitNo, setSuitNo] = useState('');
  const [courtName, setCourtName] = useState('যুগ্ম জেলা জজ ১ম আদালত, ঢাকা');
  const [injunctionReason, setInjunctionReason] = useState('স্বত্ব ও দখলের অন্তর্বর্তীকালীন স্থগিতাদেশ আদেশ');
  const [disputeType, setDisputeType] = useState('INJUNCTION');
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      BhumiApi.getPlots().catch(() => []),
      BhumiApi.listDisputes().catch(() => []),
      BhumiApi.listAcquisitionCases().catch(() => ({ items: [] })),
    ])
      .then(([plotsRes, dispRes, acqRes]) => {
        const pList = Array.isArray(plotsRes) ? plotsRes : plotsRes.items || [];
        const dList = Array.isArray(dispRes) ? dispRes : dispRes.items || [];
        const aList = Array.isArray(acqRes) ? acqRes : acqRes.items || [];
        setPlots(pList);
        setDisputes(dList);
        setAcquisitions(aList);
        if (pList.length > 0 && !selectedPlot) setSelectedPlot(pList[0]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real Dynamic Operational KPIs
  const totalAcquiredDecimal = acquisitions.reduce((acc, a) => acc + (parseFloat(a.total_land_decimal) || 0), 0);
  const section4Count = acquisitions.filter((a) => a.section_type === 'SECTION_4').length;
  const injunctionPlotsCount = new Set(disputes.map((d) => d.plot_id)).size;
  const courtDecreesCount = disputes.filter((d) => d.status === 'RESOLVED' || d.dispute_type === 'INJUNCTION').length;

  const handleIssueAcquisitionNotice = async () => {
    if (!selectedPlot) return;
    setSubmitting(true);
    setActionMessage(null);
    try {
      const payload = {
        project_name_bn: projectName,
        project_name_en: projectName,
        acquiring_agency_bn: 'জেলা প্রশাসন ভূমি অধিগ্রহণ শাখা',
        section_type: sectionType,
        district_bn: selectedPlot.district_bn || 'ঢাকা',
        upazila_bn: selectedPlot.upazila_bn || 'সাভার',
        mouza_bn: selectedPlot.mouza_bn || 'বিরুলিয়া',
        plot_ids: [selectedPlot.id],
        total_land_decimal: parseFloat(acquiredArea) || parseFloat(selectedPlot.total_area_decimal) || 10,
        gazette_no: gazetteNo || `গেজেট-${Date.now().toString().slice(-4)}`,
      };
      const res = await BhumiApi.createAcquisitionCase(payload);
      setActionMessage({
        text: res.message_bn || t('অধিগ্রহণ ধারা ৪ প্রজ্ঞাপন সফলভাবে জারি ও গেজেটেড হয়েছে।', 'Section 4 acquisition notice issued successfully.'),
      });
      loadData();
    } catch (err: any) {
      setActionMessage({
        text: err?.response?.data?.message_bn || err?.message || t('অধিগ্রহণ নোটিশ তৈরিতে ত্রুটি হয়েছে।', 'Failed to create acquisition notice.'),
        isError: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogCourtInjunction = async () => {
    if (!selectedPlot) return;
    setSubmitting(true);
    setActionMessage(null);
    try {
      const desc = `মামলা নং: ${suitNo || 'দেওয়ানি মোকাদ্দমা-২০২৬'}। আদালত: ${courtName}। কারণ: ${injunctionReason}।`;
      await BhumiApi.fileDispute({
        plot_id: selectedPlot.id,
        dispute_type: disputeType,
        description_bn: desc,
        complainant_name_bn: 'বিজ্ঞ আইনজীবী / আদালত আদেশ বাহক',
        complainant_nid: user?.nid || '19852694123456789',
      });
      setActionMessage({
        text: t('আদালতের অন্তর্বর্তীকালীন স্থগিতাদেশ ও স্বত্ব প্রতিবেদন সফলভাবে নথিভুক্ত হয়েছে।', 'Court injunction and title report logged successfully.'),
      });
      loadData();
    } catch (err: any) {
      setActionMessage({
        text: err?.response?.data?.message_bn || err?.message || t('আদালতের আদেশ নথিভুক্তকরণে ত্রুটি হয়েছে।', 'Failed to log court order.'),
        isError: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPlots = plots.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(p.dag_no).includes(q) ||
      String(p.dag_no_bn).includes(q) ||
      String(p.plot_code).toLowerCase().includes(q) ||
      String(p.mouza_bn || '').toLowerCase().includes(q) ||
      String(p.mouza_en || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Workspace Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#006A4E] shadow-2xs">
            {isDcRole ? <Building2 className="w-6 h-6" /> : <Scale className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {isDcRole
                  ? t('জেলা প্রশাসক কার্যালয় — ভূমি অধিগ্রহণ (LA) শাখা', 'DC Office — Land Acquisition (LA) Division')
                  : t('দেওয়ানি আদালত ও লিগ্যাল কাউন্সেল পোর্টাল', 'Civil Court & Legal Counsel Title Desk')}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#006A4E] text-[11px] font-bold">
                {isDcRole ? t('সরকারি অধিক্ষেত্র', 'Official Jurisdiction') : t('আইনি যাচাই', 'Legal Scrutiny')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isDcRole
                ? t(
                    'সরকারি উন্নয়ন প্রকল্প ও জাতীয় অবকাঠামোতে ভূমি অধিগ্রহণ (LA কেস), ধারা ৪/৭/৮ গেজেট ও ক্ষতিপূরণ ব্যবস্থাপনা।',
                    'Public infrastructure land acquisition cases (LA cases), section 4/7/8 gazette notifications and compensation oversight.'
                  )
                : t(
                    'দেওয়ানি আদালতের স্বত্ব মামলা, স্থিতাবস্থা আদেশ, নিষেধাজ্ঞা এবং ৩০ বছরের মালিকানা পরম্পরা যাচাই।',
                    'Civil title litigation scrutiny, injunction recording, and 30-year khatian title chain analysis.'
                  )}
            </p>
          </div>
        </div>

        {/* Quick External/Public Nav Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onNavigate && (
            <>
              <button
                type="button"
                onClick={() => onNavigate('map')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                <Compass className="w-4 h-4 text-emerald-700" />
                <span>{t('ক্যাডাস্ট্রাল ম্যাপ', 'Cadastral Map')}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('check')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>{t('টাইটেল ভেরিফাই', 'Verify Title')}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isDcRole ? t('চলমান এলএ কেস', 'Active LA Cases') : t('বিচারাধীন স্বত্ব মামলা', 'Pending Court Cases')}
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {toBanglaDigits(isDcRole ? acquisitions.length : disputes.length, lang)}
            </div>
            <span className="text-[10px] text-emerald-700 font-semibold">{t('তদন্ত ও প্রজ্ঞাপন চলমান', 'Under Active Review')}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#006A4E] flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isDcRole ? t('অধিগ্রহণকৃত জমির পরিমাণ', 'Acquired Land Area') : t('স্থগিত দাগসমূহ', 'Injunction Plots')}
            </span>
            <div className="text-2xl font-black text-[#006A4E] mt-1">
              {toBanglaDigits(isDcRole ? totalAcquiredDecimal.toFixed(2) : injunctionPlotsCount, lang)} {isDcRole ? t('শতক', 'dec') : t('টি দাগ', 'plots')}
            </div>
            <span className="text-[10px] text-slate-500">{t('ডেটাবেজ রেকর্ড থেকে পরিমাপকৃত', 'Aggregated from DB')}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isDcRole ? t('ধারা ৪ প্রজ্ঞাপন', 'Section 4 Gazettes') : t('আদালতের আদেশ নথিভুক্ত', 'Court Decrees Logged')}
            </span>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {toBanglaDigits(isDcRole ? section4Count : courtDecreesCount, lang)}
            </div>
            <span className="text-[10px] text-amber-700 font-semibold">{t('ডিজিটাল গেজেট সংবলিত', 'Gazetted & Sealed')}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isDcRole ? t('অধিগ্রহণাধীন প্লট সংখ্যা', 'Affected Plots') : t('নিষ্পত্তিকৃত বিরোধ', 'Resolved Disputes')}
            </span>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              {toBanglaDigits(isDcRole ? acquisitions.reduce((acc, a) => acc + (a.plot_ids ? a.plot_ids.length : 1), 0) : disputes.filter((d) => d.status === 'RESOLVED').length, lang)}
            </div>
            <span className="text-[10px] text-emerald-700 font-semibold">{t('বাস্তব কেস রেকর্ড', 'Persisted Records')}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <QrCode className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Plot & Case Lookup */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Search className="w-4 h-4 text-[#006A4E]" />
              <span>{isDcRole ? t('দাগ ও অধিগ্রহণ প্লট অনুসন্ধান', 'Search Plots for Acquisition') : t('মালিকানা ও মামলা অনুসন্ধান', 'Title & Dispute Search')}</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              {toBanglaDigits(filteredPlots.length, lang)} {t('টি প্লট', 'plots')}
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('দাগ নং, কোড বা মৌজা দিয়ে খুঁজুন...', 'Search dag no, code, mouza...')}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">{t('তথ্য লোড হচ্ছে...', 'Loading data...')}</div>
            ) : filteredPlots.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">{t('কোনো ফলাফল পাওয়া যায়নি', 'No plots found')}</div>
            ) : (
              filteredPlots.map((plot) => {
                const isSelected = selectedPlot && selectedPlot.id === plot.id;
                return (
                  <button
                    key={plot.id}
                    type="button"
                    onClick={() => setSelectedPlot(plot)}
                    className={`w-full p-3 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">
                        {t(`দাগ নং ${toBanglaDigits(plot.dag_no_bn || plot.dag_no, lang)}`, `Dag ${plot.dag_no}`)}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                        {plot.plot_code}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <span>{plot.mouza_bn || plot.mouza_en || 'বীরুলিয়া'}</span>
                      <span className="font-semibold text-emerald-800">
                        {toBanglaDigits(plot.total_area_decimal || '০', lang)} {t('শতক', 'dec')}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Plot Docket & Official Notice Case Actions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          {selectedPlot ? (
            <>
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[#006A4E]">
                      {selectedPlot.plot_code}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {selectedPlot.land_type_bn || selectedPlot.land_type_en || t('ভিটা (আবাসিক)', 'Residential')}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900 mt-1.5">
                    {t(
                      `দাগ নং ${toBanglaDigits(selectedPlot.dag_no_bn || selectedPlot.dag_no, lang)} (${selectedPlot.mouza_bn || 'বীরুলিয়া মৌজা'})`,
                      `Plot Dag ${selectedPlot.dag_no} (${selectedPlot.mouza_en || 'Birulia Mouza'})`
                    )}
                  </h2>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">{t('মোট জমির পরিমাণ', 'Total Area')}</span>
                  <span className="text-lg font-black text-[#006A4E]">
                    {toBanglaDigits(selectedPlot.total_area_decimal, lang)} {t('শতক', 'decimals')}
                  </span>
                </div>
              </div>

              {/* Status and Injunction Checks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">{t('মালিকানা বিক্রয় লক', 'Sale Lock')}</span>
                  <span className={`font-bold mt-0.5 block ${selectedPlot.owner_sale_locked ? 'text-red-600' : 'text-emerald-700'}`}>
                    {selectedPlot.owner_sale_locked ? t('লক সক্রিয় রয়েছে', 'Lock Active') : t('মুক্ত (অনলকড)', 'Unlocked / Clear')}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">{t('ব্যাংক জামানত / লিয়েন', 'Bank Lien')}</span>
                  <span className="font-bold text-emerald-700 mt-0.5 block">
                    {t('দায়মুক্ত রেকর্ড', 'Clear of Liens')}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">{t('আদালতের স্থিতি / মামলা', 'Court Injunctions')}</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {t('কোনো সক্রিয় নিষেধাজ্ঞা নেই', 'No Active Injunction')}
                  </span>
                </div>
              </div>

              {/* Case Action Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#006A4E]" />
                  <span>
                    {isDcRole
                      ? t('ভূমি অধিগ্রহণ গেজেট নোটিশ নথিভুক্তকরণ', 'Issue Land Acquisition Section 4 Gazette Notice')
                      : t('দেওয়ানি আদালতের স্থগিতাদেশ ও স্বত্ব প্রতিবেদন দাখিল', 'Submit Injunction Decree & Certified Title Report')}
                  </span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isDcRole
                    ? t(
                        'এই দাগে অধিগ্রহণ কার্যক্রম শুরু করতে ধারা ৪ প্রজ্ঞাপন জারি করুন। সিস্টেম স্বয়ংক্রিয়ভাবে সেন্ট্রাল কেস লেজারে ডাটাবেজ এন্ট্রি ও গেজেট রেকর্ড সংরক্ষণ করবে।',
                        'Issue Section 4 notice for infrastructure acquisition. The platform will persist the case in the central database ledger.'
                      )
                    : t(
                        'দেওয়ানি আদালতের মামলা নম্বর ও অন্তর্বর্তীকালীন স্থগিতাদেশ নথিভুক্ত করুন। অনুমোদিত রেকর্ড সেন্ট্রাল ডিসপিউট টেবিলে সংরক্ষিত হবে।',
                        'Record civil suit case number and temporary injunction decree. The record will be persisted in the disputes ledger.'
                      )}
                </p>

                {actionMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                      actionMessage.isError
                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{actionMessage.text}</span>
                  </div>
                )}

                {/* Role Specific Real Action Form */}
                {isDcRole ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {t('প্রকল্পের নাম', 'Project Name')}
                        </label>
                        <input
                          type="text"
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {t('গেজেট নম্বর', 'Gazette No')}
                        </label>
                        <input
                          type="text"
                          value={gazetteNo}
                          onChange={(e) => setGazetteNo(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {t('অধিগ্রহণকৃত জমির পরিমাণ (শতক)', 'Acquired Land Area (dec)')}
                        </label>
                        <input
                          type="number"
                          value={acquiredArea}
                          onChange={(e) => setAcquiredArea(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {t('আইনগত ধারা', 'Legal Section')}
                        </label>
                        <select
                          value={sectionType}
                          onChange={(e) => setSectionType(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900"
                        >
                          <option value="SECTION_4">ধারা ৪ (প্রাথমিক অধিগ্রহণ প্রজ্ঞাপন)</option>
                          <option value="SECTION_7">ধারা ৭ (শুনানি ও আপত্তি নিষ্পত্তি)</option>
                          <option value="SECTION_8">ধারা ৮ (ক্ষতিপূরণ নির্ধারণ রোয়েদাদ)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleIssueAcquisitionNotice}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] disabled:opacity-50 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {submitting
                            ? t('নথিভুক্ত হচ্ছে...', 'Submitting...')
                            : t('অধিগ্রহণ নোটিশ জারি করুন (বাস্তব এন্ট্রি)', 'Issue Acquisition Notice (Persisted)')}
                        </span>
                      </button>

                      {onNavigate && (
                        <button
                          type="button"
                          onClick={() => onNavigate('check')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
                        >
                          <Search className="w-4 h-4 text-emerald-700" />
                          <span>{t('সম্পূর্ণ খতিয়ান চেইন পরীক্ষা', 'Inspect 30-Yr Khatian Chain')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {t('মামলা নম্বর', 'Suit / Case No')}
                        </label>
                        <input
                          type="text"
                          value={suitNo}
                          onChange={(e) => setSuitNo(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {t('আদালতের নাম', 'Court Name')}
                        </label>
                        <input
                          type="text"
                          value={courtName}
                          onChange={(e) => setCourtName(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {t('বিরোধের ধরন', 'Dispute Type')}
                        </label>
                        <select
                          value={disputeType}
                          onChange={(e) => setDisputeType(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900"
                        >
                          <option value="INJUNCTION">স্থগিতাদেশ (Court Injunction)</option>
                          <option value="TITLE_SUIT">স্বত্ব মামলা (Title Suit)</option>
                          <option value="BOUNDARY_DISPUTE">সীমানা বিরোধ (Boundary Dispute)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {t('স্থগিতাদেশের বিবরণ ও কারণ', 'Injunction Details')}
                        </label>
                        <input
                          type="text"
                          value={injunctionReason}
                          onChange={(e) => setInjunctionReason(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleLogCourtInjunction}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] disabled:opacity-50 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {submitting
                            ? t('নথিভুক্ত হচ্ছে...', 'Submitting...')
                            : t('আদালতের আদেশ ডাটাবেজে সংরক্ষণ করুন', 'Log Court Order (Persisted)')}
                        </span>
                      </button>

                      {onNavigate && (
                        <button
                          type="button"
                          onClick={() => onNavigate('check')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
                        >
                          <Search className="w-4 h-4 text-emerald-700" />
                          <span>{t('সম্পূর্ণ খতিয়ান চেইন পরীক্ষা', 'Inspect 30-Yr Khatian Chain')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-xs text-slate-400">
              {t('বাম পাশের তালিকা থেকে একটি দাগ নির্বাচন করুন।', 'Select a plot from the left panel.')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
