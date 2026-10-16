import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, ChevronDown, ChevronUp, ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useI18n } from '../i18n';
import { getVerdictStyle } from '../theme/tokens';

interface VerdictBannerProps {
  verdict: 'SAFE' | 'REVIEW' | 'HIGH_RISK' | string;
  riskScore?: number;
  titleBn: string;
  titleEn: string;
  reasonsBn: string[];
  reasonsEn: string[];
  nextStepsBn: string[];
  nextStepsEn: string[];
  technicalDetails?: Record<string, unknown>;
}

export const VerdictBanner: React.FC<VerdictBannerProps> = ({
  verdict,
  riskScore,
  titleBn,
  titleEn,
  reasonsBn,
  reasonsEn,
  nextStepsBn,
  nextStepsEn,
  technicalDetails,
}) => {
  const { lang, t, n } = useI18n();
  const [showTech, setShowTech] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const style = getVerdictStyle(verdict);

  useEffect(() => {
    setSpeechSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleReadAloud = () => {
    if (!speechSupported) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const reasons = lang === 'bn' ? reasonsBn : reasonsEn;
    const steps = lang === 'bn' ? nextStepsBn : nextStepsEn;
    const textToSpeak = [
      lang === 'bn' ? style.labelBn : style.labelEn,
      lang === 'bn' ? titleBn : titleEn,
      ...reasons,
      lang === 'bn' ? 'পরবর্তী করণীয়:' : 'Next steps:',
      ...steps,
    ].join('. ');

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const MainIcon =
    verdict === 'SAFE' ? ShieldCheck : verdict === 'REVIEW' ? AlertTriangle : ShieldAlert;

  return (
    <section
      aria-live="polite"
      className={`rounded-2xl border-2 ${style.border} ${style.softBg} overflow-hidden shadow-sm hc-card`}
    >
      {/* Top Hero Banner */}
      <div className={`${style.bg} text-white px-5 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`}>
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-white/15 shrink-0">
            <MainIcon className="w-9 h-9 text-white" aria-hidden="true" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide bg-black/20 px-3 py-1 rounded-full mb-1">
              <span>{t(style.labelBn, style.labelEn)}</span>
              {typeof riskScore === 'number' && (
                <span>
                  • {t('ঝুঁকি স্কোর:', 'Risk Score:')} {n(riskScore)}/{n(100)}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold leading-snug">
              {t(titleBn, titleEn)}
            </h2>
          </div>
        </div>

        {speechSupported && (
          <button
            type="button"
            onClick={handleReadAloud}
            className="no-print min-h-[48px] px-4 py-2.5 rounded-xl bg-white text-[#1A1A1A] font-semibold flex items-center justify-center gap-2 hover:bg-gray-100 transition cursor-pointer shrink-0 shadow-sm"
            aria-label={t('ফলাফল জোরে শুনুন', 'Read result aloud')}
          >
            {speaking ? (
              <>
                <VolumeX className="w-5 h-5 text-[#F42A41]" />
                <span>{t('বন্ধ করুন', 'Stop')}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-5 h-5 text-[#006A4E]" />
                <span>🔊 {t('শুনুন', 'Listen')}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Plain-Language Reasons & Next Steps */}
      <div className="p-5 sm:p-6 space-y-5 bg-white/90">
        <div>
          <h3 className="text-lg font-bold text-[#1A1A1A] mb-2.5">
            {t('প্রধান কারণসমূহ (সহজ ভাষায়):', 'Key Findings (Plain Language):')}
          </h3>
          <ul className="space-y-2.5">
            {(lang === 'bn' ? reasonsBn : reasonsEn).map((reason, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 text-[#1A1A1A] bg-[#FAFBFA] p-3.5 rounded-xl border border-gray-200"
              >
                <span className={`font-bold ${style.text} shrink-0 mt-0.5`}>
                  {style.iconSymbol}
                </span>
                <span className="leading-relaxed">{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* What to do next */}
        <div className="p-4 rounded-xl bg-[#E6F2EE] border border-[#006A4E]/30">
          <h3 className="text-lg font-bold text-[#006A4E] mb-2">
            {t('পরবর্তী করণীয় (What to do next):', 'Recommended Next Steps:')}
          </h3>
          <ol className="list-decimal list-inside space-y-1.5 text-[#1A1A1A]">
            {(lang === 'bn' ? nextStepsBn : nextStepsEn).map((step, i) => (
              <li key={i} className="leading-relaxed">
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* Legal Truth Disclaimer */}
        <p className="text-sm text-[#5F6B66] italic border-t border-gray-200 pt-3">
          {t(
            '⚖️ বিশেষ দ্রষ্টব্য: ভূমি সুরক্ষা একটি স্বাধীন যাচাই স্তর যা শুধুমাত্র সম্ভাব্য ঝুঁকি চিহ্নিত করে; চূড়ান্ত আইনি সিদ্ধান্ত সংশ্লিষ্ট সরকারি কর্মকর্তার (সাব-রেজিস্ট্রার / এসি ল্যান্ড)।',
            '⚖️ Note: BhumiShield is an advisory trust layer that flags risk for a human officer to decide. It never declares final legal truth.'
          )}
        </p>

        {/* Technical Details Expander for Officers */}
        {technicalDetails && (
          <div className="no-print pt-1">
            <button
              type="button"
              onClick={() => setShowTech((prev) => !prev)}
              className="min-h-[48px] px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-[#1A1A1A] hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
            >
              {showTech ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span>
                {showTech
                  ? t('প্রযুক্তিগত বিবরণ লুকান (কর্মকর্তা ভিউ)', 'Hide Technical Details (Officer View)')
                  : t('বিস্তারিত দেখুন (হ্যাশ, স্বাক্ষর ও রুল ইঞ্জিন)', 'See Technical Details (Hash, Signature & Rules)')}
              </span>
            </button>

            {showTech && (
              <pre className="mt-3 p-4 rounded-xl bg-[#1A1A1A] text-green-300 text-xs overflow-x-auto leading-relaxed">
                {JSON.stringify(technicalDetails, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
