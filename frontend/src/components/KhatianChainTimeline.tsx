import React from 'react';
import { useAppUI } from '../i18n';
import { toBanglaDigits } from '../theme/tokens';
import { CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

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

export const KhatianChainTimeline: React.FC<{ chain: KhatianNode[] }> = ({ chain }) => {
  const { lang, t } = useAppUI();

  if (!chain || chain.length === 0) return null;

  return (
    <div className="panel p-6 mb-6 animate-rise">
      <h3 className="font-display text-xl text-[#062823] mb-2">
        {t(
          'খতিয়ান পরম্পরা (CS → SA → RS → BS চেইন যাচাই)',
          'Khatian Lineage Chain (CS → SA → RS → BS Reconciliation)'
        )}
      </h3>
      <p className="text-sm text-[#5F7A74] mb-5">
        {t(
          '১৯৪০ সালের সিএস জরিপ থেকে শুরু করে সর্বশেষ বিএস জরিপ পর্যন্ত জমির পরিমাণ ও মালিকানার ধারাবাহিকতা:',
          'Continuity of land area and ownership shares from 1940 CS survey to latest BS survey:'
        )}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {chain.map((node, index) => {
          const isMatch = node.reconcile_status === 'MATCHED';
          return (
            <div
              key={node.id}
              className={`rounded-xl p-4 border relative ${
                isMatch
                  ? 'border-[#0D6B5C]/35 bg-[#E8F5F1]/60'
                  : 'border-[#C4891A]/40 bg-[#FBF3E0]/70'
              }`}
            >
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-[#062823] text-white font-bold text-xs tracking-wide">
                  {node.survey_type} ({toBanglaDigits(node.survey_year, lang)})
                </span>
                {isMatch ? (
                  <span className="chip status-safe">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {t('মিল', 'Matched')}
                  </span>
                ) : (
                  <span className="chip status-warn">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {t('অমিল', 'Anomaly')}
                  </span>
                )}
              </div>

              <div className="text-sm font-semibold text-[#0A1F1C]">
                {t('খতিয়ান নং:', 'Khatian No:')} {toBanglaDigits(node.khatian_no, lang)}
              </div>
              <div className="text-base font-bold text-[#062823] mt-1">
                {t('জমির পরিমাণ:', 'Recorded Area:')}{' '}
                {toBanglaDigits(node.recorded_area_decimal, lang)} {t('শতাংশ', 'Decimal')}
              </div>

              <div className="mt-3 pt-2 border-t border-[#0D6B5C]/15 space-y-1.5">
                <div className="text-xs font-bold text-[#5F7A74]">
                  {t('মালিক ও অংশ (Share):', 'Owners & Fractional Share:')}
                </div>
                {node.owners.map((o, idx) => (
                  <div key={idx} className="text-xs bg-white/90 p-2 rounded-lg border border-[#0D6B5C]/12">
                    <div className="font-bold text-[#0A1F1C]">
                      {lang === 'bn' ? o.name_bn : o.name_en}
                    </div>
                    <div className="text-[#5F7A74] flex justify-between mt-0.5">
                      <span>
                        {t('অংশ:', 'Share:')} <strong>{toBanglaDigits(o.share_fraction, lang)}</strong>
                      </span>
                      <span>
                        {toBanglaDigits(o.share_area_decimal, lang)} {t('শতাংশ', 'dec')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {!isMatch && (
                <div className="mt-3 p-2 rounded-lg bg-[#C4891A] text-white text-xs font-semibold">
                  {lang === 'bn' ? node.anomaly_note_bn : node.anomaly_note_en}
                </div>
              )}

              {index < chain.length - 1 && (
                <div className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-lg bg-white border border-[#0D6B5C]/20 items-center justify-center shadow-sm">
                  <ArrowRight className="w-4 h-4 text-[#0D6B5C]" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
