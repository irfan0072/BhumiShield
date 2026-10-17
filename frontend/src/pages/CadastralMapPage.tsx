import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import {
  MapPin,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Tag,
  Search,
  ExternalLink,
  ChevronRight,
  Info,
  ShieldCheck,
  Building2
} from 'lucide-react';

interface CadastralMapPageProps {
  onNavigate?: (tab: string) => void;
}

export const CadastralMapPage: React.FC<CadastralMapPageProps> = ({ onNavigate }) => {
  const { t, lang, formatNumber } = useAppUI();
  const [zoomLevel, setZoomLevel] = useState<number>(14);
  const [loading, setLoading] = useState<boolean>(true);
  const [mapData, setMapData] = useState<any>(null);
  const [selectedFeature, setSelectedFeature] = useState<any | null>(null);
  const [filterType, setFilterType] = useState<string>('all'); // all, for_sale, locked, clear

  const fetchFeatures = (zoom: number) => {
    setLoading(true);
    BhumiApi.getMapFeatures(zoom)
      .then((res) => {
        setMapData(res);
        if (res.features && res.features.length > 0 && !selectedFeature) {
          setSelectedFeature(res.features[0]);
        }
      })
      .catch((err) => {
        console.error('Failed to load map features', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFeatures(zoomLevel);
  }, [zoomLevel]);

  const handleZoomIn = () => {
    if (zoomLevel < 16) setZoomLevel((prev) => prev + 2);
  };

  const handleZoomOut = () => {
    if (zoomLevel > 8) setZoomLevel((prev) => prev - 2);
  };

  const filteredFeatures = (mapData?.features || []).filter((f: any) => {
    if (filterType === 'for_sale') return Boolean(f.properties?.is_for_sale);
    if (filterType === 'locked') return Boolean(f.properties?.is_sale_locked);
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Banner */}
        <div className="bg-[#006A4E] text-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/60 border border-emerald-600/40 text-emerald-100 text-xs font-semibold">
              <Layers className="w-4 h-4 text-emerald-300" />
              <span>{t('ডিজিটাল ক্যাডাস্ট্রাল মৌজা ম্যাপ (CS/RS/BS)', 'Digital Cadastral Mouza Map')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t('ইন্টারঅ্যাক্টিভ দাগ ও মৌজা নকশা পরিদর্শক', 'Interactive Cadastral Plot & Mouza Explorer')}
            </h1>
            <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
              {t(
                'জুম লেভেলের সাথে সামঞ্জস্যপূর্ণ ক্যাডাস্ট্রাল বহুভুজ (Polygon) ভিউয়ার। প্রতিটি দাগে ক্লিক করে তৎক্ষণাৎ বিক্রির জন্য সক্রিয় বিজ্ঞাপন, মালিকানা লক, বন্ধক এবং দাগের সীমানা প্রত্যক্ষ করুন।',
                'Zoom-aware synthetic cadastral vector visualization. Click on any plot boundary to inspect real-time sale listings, owner locks, liens, and direct fraud check linkage.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-emerald-900/60 p-2 rounded-xl border border-emerald-700/50">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 8}
              className="p-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white cursor-pointer transition min-h-[44px] min-w-[44px] flex items-center justify-center"
              title={t('জুম আউট', 'Zoom Out')}
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <div className="px-3 text-center">
              <span className="text-[10px] text-emerald-200 block uppercase font-mono">{t('জুম', 'Zoom')}</span>
              <strong className="text-sm font-bold text-white font-mono">{zoomLevel}x</strong>
            </div>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 16}
              className="p-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white cursor-pointer transition min-h-[44px] min-w-[44px] flex items-center justify-center"
              title={t('জুম ইন', 'Zoom In')}
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Map Container & Sidebar Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Map Viewer Canvas / SVG */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[560px]">
            {/* Map Controls Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#006A4E]" />
                <span className="text-xs font-bold text-slate-800">
                  {zoomLevel <= 9
                    ? t('উপজেলা ক্লাস্টার ভিউ (আঞ্চলিক বিস্তৃতি)', 'Upazila Regional Clusters')
                    : zoomLevel <= 13
                    ? t('মৌজা ক্লাস্টার ভিউ (বিরুলিয়া/বাসন/পানাম)', 'Mouza Cluster Level')
                    : t('ক্যাডাস্ট্রাল দাগের সীমানা ভিউ (দাগ ১০১-১২০)', 'Cadastral Plot Boundaries')}
                </span>
              </div>

              {zoomLevel >= 14 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                      filterType === 'all'
                        ? 'bg-slate-800 text-white'
                        : 'bg-white text-slate-600 border border-slate-300'
                    }`}
                  >
                    {t('সকল', 'All')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('for_sale')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                      filterType === 'for_sale'
                        ? 'bg-[#006A4E] text-white'
                        : 'bg-white text-slate-600 border border-slate-300'
                    }`}
                  >
                    {t('বিক্রির জন্য', 'For Sale')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('locked')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                      filterType === 'locked'
                        ? 'bg-rose-700 text-white'
                        : 'bg-white text-slate-600 border border-slate-300'
                    }`}
                  >
                    {t('লককৃত', 'Locked')}
                  </button>
                </div>
              )}
            </div>

            {/* Interactive SVG / Cluster Map Body */}
            <div className="relative flex-1 bg-emerald-950/5 flex items-center justify-center p-4 overflow-hidden">
              {loading ? (
                <div className="text-center text-slate-500">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-[#006A4E] mb-3" />
                  <p className="text-xs font-semibold">{t('ম্যাপ স্তর লোড হচ্ছে...', 'Loading map layer...')}</p>
                </div>
              ) : zoomLevel <= 9 ? (
                /* Upazila Clusters View */
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg">
                  {(mapData?.items || []).map((up: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => setZoomLevel(11)}
                      className="bg-white p-5 rounded-2xl border-2 border-emerald-500 shadow-sm hover:shadow-md cursor-pointer transition text-center space-y-2 hover:bg-emerald-50"
                    >
                      <Building2 className="w-8 h-8 text-[#006A4E] mx-auto" />
                      <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                        {lang === 'bn' ? up.upazila_bn : up.upazila_en}
                      </h4>
                      <span className="text-[11px] text-slate-500 block">
                        {lang === 'bn' ? up.district_bn : up.district_en}
                      </span>
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-[#006A4E]">
                        <span>{up.sale_count || 1} বিজ্ঞাপিত</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 block font-semibold">
                        {t('ক্লিক করে জুম করুন →', 'Click to zoom in →')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : zoomLevel <= 13 ? (
                /* Mouza Clusters View */
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-xl">
                  {(mapData?.items || []).map((mouza: any) => (
                    <div
                      key={mouza.id}
                      onClick={() => setZoomLevel(14)}
                      className="bg-white p-5 rounded-2xl border-2 border-emerald-600 shadow-sm hover:shadow-md cursor-pointer transition text-center space-y-2 hover:bg-emerald-50"
                    >
                      <Layers className="w-8 h-8 text-[#006A4E] mx-auto" />
                      <h4 className="font-extrabold text-base text-slate-900 leading-tight">
                        {lang === 'bn' ? mouza.mouza_bn : mouza.mouza_en} মৌজা
                      </h4>
                      <div className="text-xs text-slate-600 space-y-0.5">
                        <p>{mouza.plot_count} টি দাগের খতিয়ান</p>
                      </div>
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-[#006A4E]">
                        <span>{mouza.sale_count || 2} টি সক্রিয় বিক্রির তালিকা</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 block font-semibold">
                        {t('দাগের বহুভুজ দেখুন →', 'View plot boundaries →')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                /* Zoom >= 14: Cadastral Plot Polygons Grid View */
                <div className="w-full h-full p-2 flex flex-col justify-center">
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 max-h-[460px] overflow-y-auto p-2">
                    {filteredFeatures.map((f: any) => {
                      const isSelected = selectedFeature?.properties?.id === f.properties?.id;
                      const isForSale = Boolean(f.properties?.is_for_sale);
                      const isLocked = Boolean(f.properties?.is_sale_locked);

                      let cardBg = 'bg-white border-slate-300 hover:border-emerald-500';
                      if (isForSale) cardBg = 'bg-emerald-50/70 border-emerald-500 text-[#006A4E]';
                      if (isLocked) cardBg = 'bg-rose-50/70 border-rose-400 text-rose-800';
                      if (isSelected) cardBg += ' ring-2 ring-[#006A4E] shadow-md';

                      return (
                        <div
                          key={f.properties?.id}
                          onClick={() => setSelectedFeature(f)}
                          className={`p-3 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${cardBg}`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-xs font-extrabold">
                              দাগ {lang === 'bn' ? f.properties?.dag_no_bn : f.properties?.dag_no}
                            </span>
                            {isForSale && (
                              <Tag className="w-3.5 h-3.5 text-[#006A4E] shrink-0" />
                            )}
                            {isLocked && (
                              <Lock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            )}
                          </div>

                          <div className="mt-2 text-[11px] leading-tight opacity-80">
                            <span className="block truncate">{f.properties?.land_type_bn}</span>
                            <span className="font-semibold">{f.properties?.area_decimal} শতক</span>
                          </div>

                          {isForSale && (
                            <span className="mt-1 inline-block text-[10px] font-bold text-white bg-[#006A4E] px-1.5 py-0.5 rounded text-center">
                              বিক্রয়ের জন্য
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Map Legend Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 px-4">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                  <span>{t('নিষ্কণ্টক / বিক্রির জন্য তালিকাভুক্ত', 'Verified / For Sale')}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-500 inline-block" />
                  <span>{t('মালিক কর্তৃক বিক্রয় লক সক্রিয়', 'Owner Sale Locked')}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-slate-200 border border-slate-400 inline-block" />
                  <span>{t('স্বাভাবিক খতিয়ানভুক্ত জমি', 'Regular Cadastral Plot')}</span>
                </span>
              </div>
              <span className="text-slate-400 text-[11px]">
                {t('মৌজা: বিরুলিয়া (জেএল ১২), সাভার', 'Mouza: Birulia (JL 12), Savar')}
              </span>
            </div>
          </div>

          {/* Plot Inspector Sidebar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5 flex flex-col justify-between">
            {selectedFeature ? (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono text-slate-500 block">
                      {selectedFeature.properties?.plot_code}
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
                      {t('দাগ নং:', 'Plot Dag:')}{' '}
                      {lang === 'bn'
                        ? selectedFeature.properties?.dag_no_bn
                        : selectedFeature.properties?.dag_no}
                    </h3>
                  </div>

                  {Boolean(selectedFeature.properties?.is_for_sale) ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-[#006A4E]">
                      <Tag className="w-3.5 h-3.5" />
                      {t('বিক্রয়ের জন্য উন্মুক্ত', 'Active Listing')}
                    </span>
                  ) : Boolean(selectedFeature.properties?.is_sale_locked) ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                      <Lock className="w-3.5 h-3.5" />
                      {t('লক সক্রিয়', 'Sale Locked')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {t('স্বাভাবিক খতিয়ান', 'Clear Record')}
                    </span>
                  )}
                </div>

                <div className="space-y-2.5 text-xs text-slate-700">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">{t('মৌজা ও এলাকা:', 'Mouza & Location:')}</span>
                    <strong className="text-slate-800">{selectedFeature.properties?.mouza_bn} মৌজা, সাভার</strong>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">{t('জমির শ্রেণী:', 'Land Class:')}</span>
                    <strong className="text-slate-800">{selectedFeature.properties?.land_type_bn}</strong>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">{t('মোট জমির পরিমাণ:', 'Total Area:')}</span>
                    <strong className="text-slate-800 font-bold">
                      {selectedFeature.properties?.area_decimal} শতক
                    </strong>
                  </div>

                  {selectedFeature.properties?.asking_price_bdt && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100 bg-emerald-50/60 p-2 rounded-lg">
                      <span className="text-emerald-900 font-medium">{t('বিজ্ঞাপিত মূল্য:', 'Asking Price:')}</span>
                      <strong className="text-base text-[#006A4E] font-extrabold">
                        ৳ {formatNumber(selectedFeature.properties?.asking_price_bdt)}
                      </strong>
                    </div>
                  )}

                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">{t('মালিকানা স্থিতি:', 'Ownership Status:')}</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {t('এসি ল্যান্ড অনুমোদিত বিএস রেকর্ড', 'AC Land Approved BS Title')}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">
                    {t('💡 ক্রয় পূর্বে করণীয়:', '💡 Pre-Purchase Guidance:')}
                  </p>
                  <p className="leading-relaxed">
                    {t(
                      'এই দাগে কোনো গোপন বন্ধক বা ওয়ারিশি বিবাদ আছে কি না তা আমাদের স্বয়ংক্রিয় ফ্রড ইঞ্জিনে এক ক্লিকেই প্রি-চেক করুন।',
                      'Run our automated 9-rule fraud pre-check on this dag before any formal deed execution.'
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <MapPin className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold">{t('যেকোনো দাগে ক্লিক করে বিবরণ দেখুন', 'Click any plot on the map to inspect')}</p>
              </div>
            )}

            {/* Action Buttons */}
            {selectedFeature && (
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onNavigate?.(`check?plot_id=${selectedFeature.properties?.id}`)}
                  className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                >
                  <Search className="w-4 h-4 text-emerald-400" />
                  <span>{t('এই দাগটি এখনই যাচাই করুন', 'Check This Plot Now')}</span>
                </button>

                {selectedFeature.properties?.is_for_sale && (
                  <button
                    type="button"
                    onClick={() => onNavigate?.('sale')}
                    className="w-full py-3 bg-[#006A4E] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    <Tag className="w-4 h-4" />
                    <span>{t('বিক্রয় হাটে বিস্তারিত দেখুন', 'View in Sale Marketplace')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
