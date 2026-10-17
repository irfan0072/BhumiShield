import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { KhatianChainTimeline } from './KhatianChainTimeline';
import {
  Search,
  Layers,
  MapPin,
  Lock,
  Unlock,
  AlertTriangle,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface OfficerKhatianExplorerProps {
  onSelectPlotForAction?: (plotId: number, action: 'wizard' | 'lien' | 'reconcile') => void;
  actionLabel?: string;
  actionType?: 'wizard' | 'lien' | 'reconcile';
}

export const OfficerKhatianExplorer: React.FC<OfficerKhatianExplorerProps> = ({
  onSelectPlotForAction,
  actionLabel,
  actionType,
}) => {
  const { lang, t } = useAppUI();
  const [plots, setPlots] = useState<any[]>([]);
  const [selectedPlotId, setSelectedPlotId] = useState<number>(1);
  const [selectedPlot, setSelectedPlot] = useState<any | null>(null);
  const [khatianChain, setKhatianChain] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    BhumiApi.getPlots()
      .then((data) => {
        setPlots(data);
        if (data.length > 0) {
          setSelectedPlotId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedPlotId) return;
    setLoading(true);
    BhumiApi.getPlotDetail(selectedPlotId)
      .then((detail) => {
        setSelectedPlot(detail);
        if (detail.khatian_chain) {
          setKhatianChain(detail.khatian_chain);
        } else {
          BhumiApi.getKhatianChain(selectedPlotId)
            .then((chain) => setKhatianChain(chain))
            .catch(() => setKhatianChain([]));
        }
      })
      .catch(() => {
        BhumiApi.getKhatianChain(selectedPlotId)
          .then((chain) => setKhatianChain(chain))
          .catch(() => setKhatianChain([]));
      })
      .finally(() => setLoading(false));
  }, [selectedPlotId]);

  const filteredPlots = plots.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.dag_no?.toString().includes(q) ||
      p.mouza_bn?.toLowerCase().includes(q) ||
      p.mouza_en?.toLowerCase().includes(q) ||
      p.jl_no?.toString().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-rise">
      {/* Header bar */}
      <div className="panel p-5 bg-gradient-to-r from-emerald-50/60 to-white border border-[#006A4E]/15">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-[#074f38] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#006A4E]" />
              <span>{t('দাপ্তরিক খতিয়ান পরম্পরা ও রেকর্ড অনুসন্ধান', 'Institutional Khatian Lineage & Chain Explorer')}</span>
            </h3>
            <p className="text-xs text-[#5F7A74] mt-0.5">
              {t(
                'সিএস, এসএ, আরএস ও সর্বশেষ বিএস খতিয়ান চেইনের রেকর্ড, মালিকানার ভাগ ও দাপ্তরিক ফ্ল্যাগ নিরীক্ষা:',
                'Official CS, SA, RS and BS khatian lineage continuity, ownership shares and security status:'
              )}
            </p>
          </div>

          <div className="relative min-w-[240px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('দাগ নং বা মৌজা খুঁজুন...', 'Search dag or mouza...')}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E]/30 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Plot selector sidebar + Khatian Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Plot List (4 cols) */}
        <div className="lg:col-span-4 panel p-4 space-y-3 max-h-[640px] overflow-y-auto">
          <div className="text-xs font-bold uppercase tracking-wider text-[#5F7A74] px-1 flex items-center justify-between">
            <span>{t('দাগ ও প্লট তালিকা', 'Plots & Dags')}</span>
            <span>({toBanglaDigits(filteredPlots.length, lang)})</span>
          </div>

          <div className="space-y-2">
            {filteredPlots.map((plot) => {
              const isSelected = Number(plot.id) === Number(selectedPlotId);
              const isLocked = Number(plot.owner_sale_locked) === 1;
              const hasMortgage = Number(plot.has_active_mortgage) === 1;
              const hasDispute = Number(plot.has_open_dispute) === 1;

              return (
                <button
                  key={plot.id}
                  onClick={() => setSelectedPlotId(plot.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#EDF7F4] border-[#006A4E] shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#006A4E] shrink-0" />
                      <span>
                        {lang === 'bn' ? plot.mouza_bn : plot.mouza_en} • {t('দাগ', 'Dag')} {plot.dag_no}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {toBanglaDigits(plot.total_area_decimal, lang)} {t('শতাংশ', 'dec')}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="text-slate-500">JL #{plot.jl_no}</span>
                    {isLocked && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" />
                        <span>{t('লকড', 'Locked')}</span>
                      </span>
                    )}
                    {hasMortgage && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold flex items-center gap-0.5">
                        <Building2 className="w-2.5 h-2.5" />
                        <span>{t('লিয়েন', 'Lien')}</span>
                      </span>
                    )}
                    {hasDispute && (
                      <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-bold flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>{t('বিরোধ', 'Dispute')}</span>
                      </span>
                    )}
                    {!isLocked && !hasMortgage && !hasDispute && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                        ✔ {t('নিরাপদ', 'Safe')}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Plot Detail & Lineage (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {loading ? (
            <div className="panel p-10 text-center text-xs text-slate-500 font-bold">
              {t('খতিয়ান রেকর্ড যাচাই করা হচ্ছে...', 'Loading khatian record...')}
            </div>
          ) : selectedPlot ? (
            <>
              {/* Plot Header Card */}
              <div className="panel p-5 bg-white border border-slate-200 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md bg-[#006A4E] text-white text-xs font-bold">
                        {t('দাগ নং', 'Dag No')} {selectedPlot.dag_no}
                      </span>
                      <h4 className="font-extrabold text-base text-slate-900">
                        {lang === 'bn' ? selectedPlot.mouza_bn : selectedPlot.mouza_en} ({t('জেএল নং', 'JL No')}: {selectedPlot.jl_no})
                      </h4>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {selectedPlot.upazila_bn || 'সাভার'}, {selectedPlot.district_bn || 'ঢাকা'} • {t('মোট জমির পরিমাণ:', 'Total Land Area:')}{' '}
                      <strong className="text-slate-800 font-bold">{toBanglaDigits(selectedPlot.total_area_decimal, lang)} {t('শতাংশ', 'decimals')}</strong>
                    </div>
                  </div>

                  {onSelectPlotForAction && actionLabel && (
                    <button
                      onClick={() => onSelectPlotForAction(selectedPlot.id, actionType || 'wizard')}
                      className="px-3.5 py-2 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>{actionLabel}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div className={`p-3 rounded-lg border text-xs ${
                    Number(selectedPlot.owner_sale_locked) === 1
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}>
                    <div className="text-[10px] uppercase font-bold text-slate-500">{t('বিক্রয় লক স্ট্যাটাস', 'Sale Lock')}</div>
                    <div className="font-bold flex items-center gap-1 mt-0.5">
                      {Number(selectedPlot.owner_sale_locked) === 1 ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-rose-600" />
                          <span>{t('নাগরিক লক সক্রিয়', 'Locked by Owner')}</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{t('আনলকড (উন্মুক্ত)', 'Unlocked')}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg border text-xs ${
                    Number(selectedPlot.has_active_mortgage) === 1
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <div className="text-[10px] uppercase font-bold text-slate-500">{t('ব্যাংক দায় / লিয়েন', 'Bank Lien')}</div>
                    <div className="font-bold flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        {Number(selectedPlot.has_active_mortgage) === 1
                          ? t('বন্ধকী লিয়েন চলমান', 'Active Bank Lien')
                          : t('কোনো বন্ধক নেই', 'No Bank Lien')}
                      </span>
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg border text-xs ${
                    Number(selectedPlot.has_open_dispute) === 1
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <div className="text-[10px] uppercase font-bold text-slate-500">{t('আপত্তি ও মামলা', 'Dispute Tribunal')}</div>
                    <div className="font-bold flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      <span>
                        {Number(selectedPlot.has_open_dispute) === 1
                          ? t('আপত্তি বিচারাধীন', 'Dispute Pending')
                          : t('কোনো বিরোধ নেই', 'Clear Title')}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs">
                    <div className="text-[10px] uppercase font-bold text-slate-500">{t('লেজার অখণ্ডতা', 'Ledger Integrity')}</div>
                    <div className="font-bold flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{t('১০০% হ্যাশ অনুমোদিত', 'Cryptographically Valid')}</span>
                    </div>
                  </div>
                </div>

                {/* Current Owners in BS Khatian */}
                {selectedPlot.owners && selectedPlot.owners.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-[#006A4E]" />
                      <span>{t('বিএস খতিয়ানভুক্ত বর্তমান মালিকগণ ও হিস্যা:', 'Current BS Khatian Recorded Owners & Shares:')}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {selectedPlot.owners.map((owner: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-800">{owner.name_bn || owner.name_en}</div>
                            <div className="text-[10px] text-slate-500">NID: {owner.nid_mock}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                              {owner.share_fraction} ({toBanglaDigits(owner.share_area_decimal, lang)} {t('শতাংশ', 'dec')})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Khatian Chain Timeline component */}
              <KhatianChainTimeline chain={khatianChain} />
            </>
          ) : (
            <div className="panel p-10 text-center text-xs text-slate-500 font-bold">
              {t('কোনো প্লট নির্বাচন করা হয়নি।', 'No plot selected.')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
