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
    ? 'bg-[#0D6B5C] text-white'
    : isWarn
    ? 'bg-[#C4891A] text-white'
    : 'bg-[#FF3B4A] text-white';

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
    <div aria-live="polite" className="panel overflow-hidden mb-6 animate-rise">
      <div className={`${bgClass} p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-white/15 border border-white/20 shrink-0">
            <IconComp className="w-9 h-9" />
          </div>
          <div>
            <div className="font-display text-2xl md:text-3xl tracking-tight">
              {lang === 'bn' ? report.badge_bn : report.badge_en}
            </div>
            <p className="mt-2 text-base md:text-lg font-medium opacity-95 max-w-2xl">
              {lang === 'bn' ? report.summary_bn : report.summary_en}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canSpeak && (
            <button
              onClick={speakReport}
              className="px-4 py-2.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold flex items-center gap-2 border border-white/40 cursor-pointer"
            >
              <Volume2 className="w-5 h-5" />
              <span>{t('শুনুন', 'Listen')}</span>
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-lg bg-white text-[#0A1F1C] hover:bg-[#EDF4F1] font-semibold flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-5 h-5" />
            <span>{t('প্রিন্ট / PDF', 'Print / PDF')}</span>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <h3 className="font-display text-xl text-[#062823]">
          {t('প্রধান পর্যবেক্ষণসমূহ (সহজ ভাষায়):', 'Key Observations (Plain Language):')}
        </h3>

        <div className="space-y-3">
          {report.findings.map((f, idx) => {
            const cardStyle =
              f.severity === 'HIGH'
                ? 'border-l-[6px] border-[#FF3B4A] bg-[#FFF0F1]'
                : f.severity === 'WARNING'
                ? 'border-l-[6px] border-[#C4891A] bg-[#FBF3E0]'
                : 'border-l-[6px] border-[#0D6B5C] bg-[#E8F5F1]';

            const badgeClass =
              f.severity === 'HIGH'
                ? 'status-danger'
                : f.severity === 'WARNING'
                ? 'status-warn'
                : 'status-safe';

            const badgeText =
              f.severity === 'HIGH'
                ? t('ঝুঁকিপূর্ণ', 'High Risk')
                : f.severity === 'WARNING'
                ? t('সতর্কতা', 'Warning')
                : t('নিরাপদ', 'Safe');

            return (
              <div key={idx} className={`p-4 rounded-xl ${cardStyle} border border-[#0D6B5C]/10`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-base md:text-lg text-[#0A1F1C]">
                    {lang === 'bn' ? f.title_bn : f.title_en}
                  </span>
                  <span className={`chip ${badgeClass}`}>{badgeText}</span>
                </div>
                <p className="mt-1.5 text-sm text-[#0A1F1C]/90">
                  {lang === 'bn' ? f.detail_bn : f.detail_en}
                </p>
                <p className="mt-2 text-sm font-semibold text-[#0D6B5C]">
                  {t('করণীয়:', 'Action:')} {lang === 'bn' ? f.action_bn : f.action_en}
                </p>
              </div>
            );
          })}
        </div>

        <div className="p-4 rounded-xl bg-[#EDF4F1]/80 border border-[#0D6B5C]/20">
          <div className="font-display text-lg text-[#0D6B5C]">
            {t('পরবর্তী করণীয় (What to do next):', 'Next Step (What to do next):')}
          </div>
          <p className="mt-1 font-medium text-[#0A1F1C]">
            {lang === 'bn' ? report.next_step_bn : report.next_step_en}
          </p>
        </div>

        <div className="pt-2 border-t border-[#0D6B5C]/12">
          <button
            onClick={() => setShowTech(!showTech)}
            className="text-sm font-bold text-[#5F7A74] hover:text-[#0D6B5C] flex items-center gap-1.5 cursor-pointer"
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
            <div className="mt-3 p-4 rounded-xl bg-[#062823] text-[#7CDB6A] font-mono text-xs overflow-x-auto space-y-2">
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
