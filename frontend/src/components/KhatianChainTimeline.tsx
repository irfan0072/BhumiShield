import React from 'react';
import { useAppUI } from '../i18n';
import { toBanglaDigits } from '../theme/tokens';
import { CheckCircle2, AlertTriangle, ArrowRight, GitBranch, ShieldCheck, History } from 'lucide-react';

interface KhatianNode {
  id: number;
  survey_type: string;
  khatian_no: string;
  recorded_area_decimal: number;
  survey_year: number;
  reconcile_status: string;
  anomaly_note_bn: string;
  anomaly_note_en: string;
  owners: Array<{
    person_id: number;
    name_bn: string;
    name_en: string;
    father_name_bn: string;
    nid_mock: string;
    share_fraction: string;
    share_area_decimal: number;
  }>;
}

const EPOCH_META: Record<string, { descBn: string; descEn: string; icon: string }> = {
  CS: {
    descBn: 'ব্রিটিশ ভারতীয় ক্যাডাস্ট্রাল জরিপ (আদি ভিত্তি)',
    descEn: 'British India Cadastral Survey (Original Baseline)',
    icon: '🏛️',
  },
  SA: {
    descBn: 'জমিদারি উচ্ছেদ ও প্রজাস্বত্ব জরিপ (১৯৫০ আইন)',
    descEn: 'State Acquisition Survey (Post-Zamindari)',
    icon: '📜',
  },
  RS: {
    descBn: 'রিভিশনাল জরিপ (সংশোধিত জেলা রেকর্ড)',
    descEn: 'Revisional Survey (Operative District Record)',
    icon: '⚖️',
  },
  BS: {
    descBn: 'বাংলাদেশ জরিপ / সিটি জরিপ (সর্বশেষ রেকর্ড)',
    descEn: 'Bangladesh Survey / City Survey (Current Record)',
    icon: '🛡️',
  },
};

export const KhatianChainTimeline: React.FC<{ chain: KhatianNode[] }> = ({ chain }) => {
  const { lang, t } = useAppUI();

  if (!chain || chain.length === 0) return null;

  return (
    <div className="panel p-6 mb-6 animate-rise">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold mb-1">
            <GitBranch className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('ঐতিহাসিক মালিকানা বংশলতিকা ও ধারাবাহিকতা', 'Historical Ownership Lineage Tree')}</span>
          </div>
          <h3 className="font-extrabold text-xl text-[#074f38]">
            {t(
              'খতিয়ান বংশলতিকা পরম্পরা (CS → SA → RS → BS ধারাবাহিকতা)',
              'Khatian Lineage Tree (CS → SA → RS → BS Succession)'
            )}
          </h3>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <History className="w-4 h-4 text-emerald-700" />
          <span>{t('১৯৪০ হতে বর্তমান', '1940 to Present')}</span>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-[#5F7A74] mb-6 leading-relaxed">
        {t(
          'ঐতিহাসিক সিএস জরিপ হতে সর্বশেষ বিএস জরিপ পর্যন্ত জমির মোট পরিমাণ, স্বত্বাধিকারী ও ফারায়েজ অংশ হস্তান্তরের নিরবচ্ছিন্ন শৃঙ্খল:',
          'Unbroken succession of land volume, recorded title holders, and fractional inheritance shares across the 4 major survey epochs:'
        )}
      </p>

      {/* Horizontal Visual Lineage Tree Container */}
      <div className="relative overflow-x-auto pb-4 pt-2 custom-scrollbar">
        {/* Horizontal Connector Line for Desktop */}
        <div className="hidden lg:block absolute top-14 left-16 right-16 h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 -z-0 rounded-full opacity-30" />

        <div className="flex flex-col lg:flex-row items-stretch gap-6 min-w-[760px] relative z-10">
          {chain.map((node, index) => {
            const isMatch = node.reconcile_status === 'MATCHED';
            const meta = EPOCH_META[node.survey_type] || {
              descBn: 'জরিপ রেকর্ড',
              descEn: 'Survey Record',
              icon: '📍',
            };

            const prevNode = index > 0 ? chain[index - 1] : null;
            const yearDiff = prevNode ? node.survey_year - prevNode.survey_year : 0;

            return (
              <React.Fragment key={node.id}>
                {/* Lineage Node Card */}
                <div
                  className={`flex-1 rounded-2xl p-5 border flex flex-col justify-between transition-all relative shadow-xs hover:shadow-md ${
                    isMatch
                      ? 'border-[#006A4E]/30 bg-gradient-to-b from-emerald-50/70 to-white'
                      : 'border-[#C4891A]/50 bg-gradient-to-b from-[#FBF3E0]/80 to-white'
                  }`}
                >
                  <div>
                    {/* Node Header with Pulse Node */}
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#006A4E] text-white font-extrabold text-xs shadow-xs">
                          {node.survey_type}
                        </span>
                        <div>
                          <span className="font-extrabold text-xs text-slate-900 block leading-tight">
                            {node.survey_type} জরিপ
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {toBanglaDigits(node.survey_year, lang)} খ্রি.
                          </span>
                        </div>
                      </div>

                      {isMatch ? (
                        <span className="chip status-safe text-[11px] font-bold py-0.5 px-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{t('ধারাবাহিক', 'Matched')}</span>
                        </span>
                      ) : (
                        <span className="chip status-warn text-[11px] font-bold py-0.5 px-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{t('ব্যত্যয়', 'Anomaly')}</span>
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 mb-3 line-clamp-1">
                      {lang === 'bn' ? meta.descBn : meta.descEn}
                    </p>

                    {/* Cadastral Khatian & Area */}
                    <div className="p-3 bg-white/95 rounded-xl border border-slate-200/80 shadow-2xs space-y-1 mb-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#5F7A74] font-medium">{t('খতিয়ান নং:', 'Khatian No:')}</span>
                        <span className="font-mono font-bold text-slate-900">
                          {toBanglaDigits(node.khatian_no, lang)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs pt-1 border-t border-slate-100">
                        <span className="text-[#5F7A74] font-medium">{t('মোট জমি:', 'Area:')}</span>
                        <span className="font-extrabold text-[#006A4E]">
                          {toBanglaDigits(node.recorded_area_decimal, lang)} {t('শতক', 'Dec')}
                        </span>
                      </div>
                    </div>

                    {/* Owners & Fractional Shares Tree Nodes */}
                    {Array.isArray(node.owners) && node.owners.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-[#5F7A74] flex items-center justify-between">
                          <span>{t('রেকর্ডীয় অংশীদার:', 'Recorded Co-owners:')}</span>
                          <span className="text-[10px] text-emerald-700 font-mono">
                            {node.owners.length} {t('জন', 'owner(s)')}
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                          {node.owners.map((o, idx) => (
                            <div
                              key={idx}
                              className="text-xs bg-white/90 p-2.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1"
                            >
                              <div className="font-bold text-slate-900 leading-snug">
                                {lang === 'bn' ? o.name_bn : o.name_en}
                              </div>
                              {o.father_name_bn && (
                                <div className="text-[10px] text-slate-500 truncate">
                                  {t('পিতা/স্বামী:', 'Father/Spouse:')} {o.father_name_bn}
                                </div>
                              )}
                              <div className="flex justify-between text-[11px] text-[#5F7A74] pt-1 border-t border-slate-100">
                                <span>
                                  {t('অংশ:', 'Share:')}{' '}
                                  <strong className="text-emerald-800 font-mono">
                                    {toBanglaDigits(o.share_fraction, lang)}
                                  </strong>
                                </span>
                                <span className="font-semibold text-slate-700">
                                  {toBanglaDigits(o.share_area_decimal, lang)} {t('শতক', 'dec')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!isMatch && (
                      <div className="mt-3 p-2.5 rounded-xl bg-amber-500 text-white text-xs font-semibold leading-relaxed shadow-xs">
                        {lang === 'bn' ? node.anomaly_note_bn : node.anomaly_note_en}
                      </div>
                    )}
                  </div>

                  {/* Epoch Continuity Footprint */}
                  <div className="mt-4 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>{t('জরিপ স্টেজ', 'Epoch Stage')} {index + 1}/৪</span>
                    <span className="text-emerald-700 font-bold">{isMatch ? 'অখণ্ড চেইন ✓' : 'রিভিউ প্রয়োজন ⚠'}</span>
                  </div>
                </div>

                {/* Connecting Arrow & Year Step between epochs */}
                {index < chain.length - 1 && (
                  <div className="hidden lg:flex flex-col items-center justify-center shrink-0 self-center">
                    <div className="px-2 py-1 rounded-full bg-white border border-emerald-300 text-[10px] font-mono font-bold text-emerald-800 shadow-xs mb-1">
                      +{toBanglaDigits(yearDiff, lang)} {t('বছর', 'yrs')}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-emerald-50 border-2 border-[#006A4E] text-[#006A4E] flex items-center justify-center shadow-xs">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

