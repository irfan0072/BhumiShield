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
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs mb-6">
      <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">
        {t(
          'খতিয়ান পরম্পরা (CS → SA → RS → BS চেইন যাচাই)',
          'Khatian Lineage Chain (CS → SA → RS → BS Reconciliation)'
        )}
      </h3>
      <p className="text-sm text-[#5F6B66] mb-4">
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
              className={`rounded-xl p-4 border-2 relative ${
                isMatch
                  ? 'border-[#006A4E] bg-[#E6F2EE]/50'
                  : 'border-[#B7791F] bg-[#FEF3C7]/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-3 py-1 rounded-lg bg-[#006A4E] text-white font-extrabold text-sm">
                  {node.survey_type} ({toBanglaDigits(node.survey_year, lang)})
                </span>
                {isMatch ? (
                  <span className="text-xs font-bold text-[#006A4E] flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {t('✔ মিল আছে', '✔ Matched')}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-[#B7791F] flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    {t('⚠ অসামঞ্জস্য', '⚠ Anomaly')}
                  </span>
                )}
              </div>

              <div className="text-sm font-semibold text-gray-800">
                {t('খতিয়ান নং:', 'Khatian No:')} {toBanglaDigits(node.khatian_no, lang)}
              </div>
              <div className="text-base font-extrabold text-[#1A1A1A] mt-1">
                {t('জমির পরিমাণ:', 'Recorded Area:')}{' '}
                {toBanglaDigits(node.recorded_area_decimal, lang)} {t('শতাংশ', 'Decimal')}
              </div>

              {/* Owners List */}
              <div className="mt-3 pt-2 border-t border-gray-300/80 space-y-1.5">
                <div className="text-xs font-bold text-[#5F6B66]">
                  {t('মালিক ও অংশ (Share):', 'Owners & Fractional Share:')}
                </div>
                {node.owners.map((o, idx) => (
                  <div key={idx} className="text-xs bg-white p-2 rounded-lg border border-gray-200">
                    <div className="font-bold text-gray-900">
                      {lang === 'bn' ? o.name_bn : o.name_en}
                    </div>
                    <div className="text-gray-600 flex justify-between mt-0.5">
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
                <div className="mt-3 p-2 rounded-lg bg-[#B7791F] text-white text-xs font-semibold">
                  ⚠ {lang === 'bn' ? node.anomaly_note_bn : node.anomaly_note_en}
                </div>
              )}

              {index < chain.length - 1 && (
                <div className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-gray-300 items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-[#006A4E]" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
