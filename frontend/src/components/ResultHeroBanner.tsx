import React, { useState } from 'react';
import { RiskReportResponse } from '../api/client';
import { useAppUI } from '../i18n';
import { CheckCircle2, AlertTriangle, XOctagon, Volume2, ChevronDown, ChevronUp, Printer } from 'lucide-react';

export const ResultHeroBanner: React.FC<{ report: RiskReportResponse }> = ({ report }) => {
  const { lang, t } = useAppUI();
  const [showTech, setShowTech] = useState(false);

  const isSafe = report.status === 'SAFE';
  const isWarn = report.status === 'WARNING';

  const bgClass = isSafe
    ? 'bg-[#006A4E] text-white'
    : isWarn
    ? 'bg-[#B7791F] text-white'
    : 'bg-[#F42A41] text-white';

  const IconComp = isSafe ? CheckCircle2 : isWarn ? AlertTriangle : XOctagon;

  const speakReport = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const textToRead =
      lang === 'bn'
        ? `${report.badge_bn}। ${report.summary_bn}। পরবর্তী করণীয়: ${report.next_step_bn}`
        : `${report.badge_en}. ${report.summary_en}. Next step: ${report.next_step_en}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return (
    <div aria-live="polite" className="rounded-2xl overflow-hidden shadow-md border border-gray-200 bg-white mb-6">
      {/* Top Hero Banner */}
      <div className={`${bgClass} p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
        <div className="flex items-start gap-4">
          <IconComp className="w-12 h-12 shrink-0 mt-1" />
          <div>
            <div className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {lang === 'bn' ? report.badge_bn : report.badge_en}
            </div>
            <p className="mt-2 text-lg md:text-xl font-medium opacity-95">
              {lang === 'bn' ? report.summary_bn : report.summary_en}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canSpeak && (
            <button
              onClick={speakReport}
              className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold flex items-center gap-2 border border-white/40 cursor-pointer"
            >
              <Volume2 className="w-5 h-5" />
              <span>{t('🔊 শুনুন', '🔊 Listen')}</span>
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl bg-white text-gray-900 hover:bg-gray-100 font-bold flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-5 h-5" />
            <span>{t('প্রিন্ট / PDF', 'Print / PDF')}</span>
          </button>
        </div>
      </div>

      {/* Plain-Language Findings List */}
      <div className="p-6 space-y-4">
        <h3 className="text-xl font-bold text-[#1A1A1A]">
          {t('প্রধান পর্যবেক্ষণসমূহ (সহজ ভাষায়):', 'Key Observations (Plain Language):')}
        </h3>

        <div className="space-y-3">
          {report.findings.map((f, idx) => {
            const cardStyle =
              f.severity === 'HIGH'
                ? 'border-l-8 border-[#F42A41] bg-[#FEECEE]'
                : f.severity === 'WARNING'
                ? 'border-l-8 border-[#B7791F] bg-[#FEF3C7]'
                : 'border-l-8 border-[#006A4E] bg-[#E6F2EE]';

            const badgeText =
              f.severity === 'HIGH'
                ? t('✖ ঝুঁকিপূর্ণ', '✖ High Risk')
                : f.severity === 'WARNING'
                ? t('⚠ সতর্কতা', '⚠ Warning')
                : t('✔ নিরাপদ', '✔ Safe');

            return (
              <div key={idx} className={`p-4 rounded-xl ${cardStyle} border border-gray-200`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-lg text-[#1A1A1A]">
                    {lang === 'bn' ? f.title_bn : f.title_en}
                  </span>
                  <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-white border border-gray-300">
                    {badgeText}
                  </span>
                </div>
                <p className="mt-1.5 text-[#1A1A1A]">
                  {lang === 'bn' ? f.detail_bn : f.detail_en}
                </p>
                <p className="mt-2 text-sm font-semibold text-[#006A4E]">
                  👉 {t('করণীয়:', 'Action:')} {lang === 'bn' ? f.action_bn : f.action_en}
                </p>
              </div>
            );
          })}
        </div>

        {/* Next Step Box */}
        <div className="p-4 rounded-xl bg-gray-50 border-2 border-[#006A4E]/30">
          <div className="font-bold text-[#006A4E] text-lg">
            {t('পরবর্তী করণীয় (What to do next):', 'Next Step (What to do next):')}
          </div>
          <p className="mt-1 font-medium text-[#1A1A1A]">
            {lang === 'bn' ? report.next_step_bn : report.next_step_en}
          </p>
        </div>

        {/* Technical Details Expander for Officers */}
        <div className="pt-2 border-t border-gray-200">
          <button
            onClick={() => setShowTech(!showTech)}
            className="text-sm font-bold text-[#5F6B66] hover:text-[#006A4E] flex items-center gap-1.5 cursor-pointer"
          >
            {showTech ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span>
              {t(
                'বিস্তারিত দেখুন (কর্মকর্তাদের জন্য টেকনিক্যাল রুল কোড ও হ্যাশ তথ্য)',
                'See Technical Details (Rule Codes & Ledger Hashes for Officers)'
              )}
            </span>
          </button>

          {showTech && (
            <div className="mt-3 p-4 rounded-xl bg-gray-900 text-green-300 font-mono text-xs overflow-x-auto space-y-2">
              <div>STATUS: {report.status}</div>
              <div>
                TRIGGERED_RULES: {report.findings.map((f) => `${f.rule_code}(${f.severity})`).join(', ')}
              </div>
              {report.deed_history && report.deed_history.length > 0 && (
                <div>
                  LATEST_DEED_HASH: {report.deed_history[0].content_hash} (CHAIN_INDEX #
                  {report.deed_history[0].chain_index})
                </div>
              )}
              <div>
                DISCLAIMER: {lang === 'bn' ? report.disclaimer_bn : report.disclaimer_en}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
