import React from 'react';
import { ArrowRight, Building2, FileText, Gavel, ScrollText } from 'lucide-react';
import { useAppUI } from '../../i18n';
import { toBanglaDigits } from '../../theme/tokens';

const STEPS = [
  {
    icon: FileText,
    bn: 'অনলাইনে আবেদন',
    en: 'Apply online',
    noteBn: 'দলিল, আগের খতিয়ান ও NID দিন',
    noteEn: 'Give deed, old khatian and NID',
    fee: 20,
  },
  {
    icon: Building2,
    bn: 'ভূমি অফিস যাচাই',
    en: 'Land office check',
    noteBn: 'ইউনিয়ন ভূমি অফিস জমি সরেজমিনে দেখে',
    noteEn: 'Union land office visits the land',
    fee: 0,
  },
  {
    icon: Gavel,
    bn: 'শুনানি',
    en: 'Hearing',
    noteBn: 'এসি ল্যান্ড অফিসে কাগজ নিয়ে যান',
    noteEn: 'Bring papers to the AC Land office',
    fee: 50,
  },
  {
    icon: ScrollText,
    bn: 'নতুন খতিয়ান',
    en: 'New khatian',
    noteBn: 'অনুমোদনের পর ডিসিআর ও খতিয়ান নিন',
    noteEn: 'After approval, get DCR and khatian',
    fee: 1100,
  },
];

/** e-Mutation (ই-নামজারি) steps with official fees. */
export const MutationGuide: React.FC = () => {
  const { t, lang } = useAppUI();
  const n = (v: number) => toBanglaDigits(v.toLocaleString('en-IN'), lang);
  const total = STEPS.reduce((s, x) => s + x.fee, 0);

  return (
    <div className="space-y-4">
      <ol className="space-y-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.en} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#006A4E]">
                <Icon className="size-5" />
                <span className="absolute -left-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-[#006A4E] text-[11px] font-medium text-white">
                  {toBanglaDigits(i + 1, lang)}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900">{lang === 'bn' ? s.bn : s.en}</span>
                <span className="block text-sm text-slate-500">{lang === 'bn' ? s.noteBn : s.noteEn}</span>
              </span>
              <span className="shrink-0 text-right text-sm font-medium text-slate-700">
                {s.fee ? `৳ ${n(s.fee)}` : <span className="text-slate-400">{t('ফি নেই', 'No fee')}</span>}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3">
        <span className="text-sm text-slate-700">
          {t('মোট সরকারি ফি', 'Total government fee')}: <strong className="text-base text-[#006A4E]">৳ {n(total)}</strong>
        </span>
        <a
          href={`/${lang}/help?tab=fees`}
          className="inline-flex items-center gap-1 text-sm font-medium text-[#006A4E] hover:underline"
        >
          {t('সব ফি দেখুন', 'All fees')}
          <ArrowRight className="size-4" />
        </a>
      </div>
      <p className="text-xs text-slate-500">{t('ফি অনলাইনে দিন। কাউকে বাড়তি টাকা দেবেন না।', 'Pay fees online. Never pay anyone extra.')}</p>
    </div>
  );
};
