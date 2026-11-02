import React, { useState } from 'react';
import { RiskReportResponse } from '../api/client';
import { useAppUI } from '../i18n';
import { toBanglaDigits } from '../theme/tokens';
import {
  CheckCircle2,
  AlertTriangle,
  XOctagon,
  Volume2,
  ChevronDown,
  ChevronUp,
  Printer,
  Download,
  FileCheck2,
  ShieldCheck,
  Scale
} from 'lucide-react';

// Instant Health Meter Speedometer Gauge
const SpeedometerGauge: React.FC<{
  score: number;
  status: 'SAFE' | 'WARNING' | 'DANGER' | 'HIGH_RISK';
  lang: 'bn' | 'en';
  t: (bn: string, en: string) => string;
}> = ({ score, status, lang, t }) => {
  // Arc angle from -180 deg to 0 deg (semicircle)
  const needleAngle = -180 + Math.min(100, Math.max(0, score)) * 1.8;

  const statusLabel =
    status === 'SAFE'
      ? t('নিরাপদ ও নিষ্কণ্টক', 'Safe & Clean')
      : status === 'WARNING'
      ? t('সতর্কতা / রিভিউ', 'Caution / Under Review')
      : t('উচ্চ ঝুঁকি / ক্রয় অযোগ্য', 'High Risk / Do Not Buy');

  const statusColor =
    status === 'SAFE'
      ? 'text-emerald-300'
      : status === 'WARNING'
      ? 'text-amber-300'
      : 'text-rose-300';

  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-black/20 border border-white/15 backdrop-blur-sm shadow-inner shrink-0">
      <div className="relative w-44 h-24 overflow-hidden flex items-end justify-center">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          <defs>
            <linearGradient id="gaugeTrack" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="35%" stopColor="#F59E0B" />
              <stop offset="65%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>

          {/* Background track arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="18"
            strokeLinecap="round"
          />

          {/* Colored segmented arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeTrack)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray="251.3"
            strokeDashoffset="0"
          />

          {/* Gauge tick marks */}
          <line x1="20" y1="100" x2="30" y2="100" stroke="white" strokeWidth="2" opacity="0.4" />
          <line x1="100" y1="20" x2="100" y2="30" stroke="white" strokeWidth="2" opacity="0.4" />
          <line x1="180" y1="100" x2="170" y2="100" stroke="white" strokeWidth="2" opacity="0.4" />

          {/* Center Pivot */}
          <circle cx="100" cy="100" r="10" fill="#FFFFFF" />
          <circle cx="100" cy="100" r="5" fill="#0A1F1C" />

          {/* Needle with CSS transition */}
          <g
            transform={`rotate(${needleAngle} 100 100)`}
            className="transition-transform duration-1000 ease-out"
          >
            <polygon points="97,100 103,100 101,24 99,24" fill="#FFFFFF" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))" />
            <circle cx="100" cy="24" r="3" fill="#F59E0B" />
          </g>
        </svg>

        {/* Center score readout */}
        <div className="absolute bottom-0 inset-x-0 text-center">
          <span className="text-2xl font-black text-white tracking-tight drop-shadow-md">
            {toBanglaDigits(score, lang)}
          </span>
          <span className="text-xs text-white/70 font-bold ml-0.5">/ {toBanglaDigits(100, lang)}</span>
        </div>
      </div>

      <div className="mt-1 text-center">
        <span className={`text-xs font-bold ${statusColor} block tracking-wide`}>
          {statusLabel}
        </span>
        <span className="text-[10px] text-white/60 font-medium">
          {t('ভূমি সুরক্ষা স্কোর মিটার', 'Land Health Speedometer')}
        </span>
      </div>
    </div>
  );
};

export const ResultHeroBanner: React.FC<{ report: RiskReportResponse }> = ({ report }) => {
  const { lang, t } = useAppUI();
  const [showTech, setShowTech] = useState(false);

  const isSafe = report.status === 'SAFE';
  const isWarn = report.status === 'WARNING';

  const bgClass = isSafe
    ? 'bg-[#006A4E] text-white'
    : isWarn
    ? 'bg-[#C4891A] text-white'
    : 'bg-[#FF3B4A] text-white';

  const IconComp = isSafe ? CheckCircle2 : isWarn ? AlertTriangle : XOctagon;

  const calculateScore = (): number => {
    if (report.status === 'SAFE') return 95;
    if (report.status === 'WARNING') {
      const deduction = (report.findings || []).filter((f) => f.severity === 'WARNING').length * 10;
      return Math.max(55, 75 - deduction);
    }
    const highCount = (report.findings || []).filter((f) => f.severity === 'HIGH').length;
    return Math.max(15, 38 - highCount * 10);
  };

  const healthScore = calculateScore();

  const speakReport = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const textToRead =
      lang === 'bn'
        ? `ভূমি নিরাপত্তা স্কোর: ১০০-র মধ্যে ${healthScore}। ${report.badge_bn}। ${report.summary_bn}। পরবর্তী করণীয়: ${report.next_step_bn}`
        : `Land safety score: ${healthScore} out of 100. ${report.badge_en}. ${report.summary_en}. Next step: ${report.next_step_en}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const handleDownloadSafetyPdf = () => {
    window.print();
  };

  return (
    <div aria-live="polite" className="panel overflow-hidden mb-6 animate-rise">
      {/* Top Banner with Speedometer Gauge & Actions */}
      <div className={`${bgClass} p-6 md:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6`}>
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-white/15 border border-white/20 shrink-0 shadow-xs">
            <IconComp className="w-10 h-10" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t('সরকারি ডাটাবেজ যাচাইকৃত ফলাফল', 'Official Database Verified Result')}</span>
            </div>
            <div className="font-extrabold text-2xl md:text-3xl tracking-tight">
              {lang === 'bn' ? report.badge_bn : report.badge_en}
            </div>
            <p className="mt-2 text-base font-medium opacity-95 max-w-xl leading-relaxed">
              {lang === 'bn' ? report.summary_bn : report.summary_en}
            </p>
          </div>
        </div>

        {/* Speedometer Gauge & 1-Click Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto justify-end">
          <SpeedometerGauge score={healthScore} status={report.status} lang={lang} t={t} />

          <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={handleDownloadSafetyPdf}
              className="px-4 py-2.5 rounded-xl bg-white text-[#0A1F1C] hover:bg-emerald-50 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
            >
              <Download className="w-4 h-4 text-[#006A4E]" />
              <span>{t('১-ক্লিক PDF নিরাপত্তা সনদ', '1-Click PDF Report')}</span>
            </button>

            <div className="flex items-center gap-2">
              {canSpeak && (
                <button
                  type="button"
                  onClick={speakReport}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold flex items-center justify-center gap-1.5 border border-white/30 cursor-pointer text-xs transition"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{t('শুনুন', 'Listen')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold flex items-center justify-center gap-1.5 border border-white/30 cursor-pointer text-xs transition"
              >
                <Printer className="w-4 h-4" />
                <span>{t('প্রিন্ট', 'Print')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <h3 className="font-bold text-xl text-[#074f38]">
          {t('প্রধান পর্যবেক্ষণসমূহ (সহজ ভাষায়):', 'Key Observations (Plain Language):')}
        </h3>

        <div className="space-y-3">
          {report.findings.map((f, idx) => {
            const cardStyle =
              f.severity === 'HIGH'
                ? 'border-l-[6px] border-[#FF3B4A] bg-[#FFF0F1]'
                : f.severity === 'WARNING'
                ? 'border-l-[6px] border-[#C4891A] bg-[#FBF3E0]'
                : 'border-l-[6px] border-[#006A4E] bg-emerald-50/80';

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
              <div key={idx} className={`p-4 rounded-xl ${cardStyle} border border-[#006A4E]/10`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-base md:text-lg text-[#0A1F1C]">
                    {lang === 'bn' ? f.title_bn : f.title_en}
                  </span>
                  <span className={`chip ${badgeClass}`}>{badgeText}</span>
                </div>
                <p className="mt-1.5 text-sm text-[#0A1F1C]/90">
                  {lang === 'bn' ? f.detail_bn : f.detail_en}
                </p>
                <p className="mt-2 text-sm font-semibold text-[#006A4E]">
                  {t('করণীয়:', 'Action:')} {lang === 'bn' ? f.action_bn : f.action_en}
                </p>
              </div>
            );
          })}
        </div>

        <div className="p-4 rounded-xl bg-[#EDF7F4] border border-[#006A4E]/20">
          <div className="font-bold text-lg text-[#006A4E]">
            {t('পরবর্তী করণীয় (What to do next):', 'Next Step (What to do next):')}
          </div>
          <p className="mt-1 font-medium text-[#0A1F1C]">
            {lang === 'bn' ? report.next_step_bn : report.next_step_en}
          </p>
        </div>

        {/* Technical proof wrapped in collapsed details (Pillar 2: Zero Crypto Jargon in primary view) */}
        <div className="pt-2 border-t border-[#006A4E]/12">
          <details className="group rounded-xl border border-slate-200 bg-slate-50/80 p-3 transition-all">
            <summary className="text-xs font-bold text-[#5F7A74] hover:text-[#006A4E] flex items-center justify-between cursor-pointer list-none select-none">
              <div className="flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-emerald-700" />
                <span>
                  {t(
                    'কারিগরি নিরীক্ষা প্রমাণ ও রুল কোড (কর্মকর্তাদের জন্য)',
                    'Technical Audit Proof & Rule Codes (For Verification Officers)'
                  )}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
            </summary>

            <div className="mt-3 pt-3 border-t border-slate-200 p-3 rounded-lg bg-slate-900 text-emerald-300 font-mono text-[11px] overflow-x-auto space-y-2">
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
          </details>
        </div>
      </div>
    </div>
  );
};

