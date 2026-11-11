import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Building2,
  CheckCircle2,
  FileWarning,
  Gavel,
  Landmark,
  PhoneCall,
  RotateCcw,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { useAppUI } from '../../i18n';
import { toBanglaDigits } from '../../theme/tokens';
import { cn } from '@/lib/utils';

type Problem = 'buy' | 'mutation' | 'error' | 'heir' | 'case' | 'bank';
type Have = 'dag' | 'deed' | 'none';
type Urgency = 'paying' | 'time' | 'threat';

const PROBLEMS: Array<{
  id: Problem;
  icon: React.ElementType;
  bn: string;
  en: string;
  office_bn: string;
  office_en: string;
  docs_bn: string[];
  docs_en: string[];
}> = [
  {
    id: 'buy', icon: ShoppingBag, bn: 'জমি কিনব', en: 'Buying land',
    office_bn: 'সাব-রেজিস্ট্রি অফিস', office_en: 'Sub-registry office',
    docs_bn: ['বিক্রেতার খতিয়ান', 'বায়া দলিল', 'খাজনার রশিদ'], docs_en: ['Seller’s khatian', 'Parent deed', 'Land tax receipt'],
  },
  {
    id: 'mutation', icon: Landmark, bn: 'নামজারি আটকে আছে', en: 'Mutation stuck',
    office_bn: 'উপজেলা ভূমি অফিস (এসি ল্যান্ড)', office_en: 'Upazila land office (AC Land)',
    docs_bn: ['আবেদন নম্বর', 'দলিলের কপি', 'এনআইডি'], docs_en: ['Application number', 'Deed copy', 'NID'],
  },
  {
    id: 'error', icon: FileWarning, bn: 'রেকর্ডে ভুল', en: 'Error in record',
    office_bn: 'উপজেলা ভূমি অফিস (এসি ল্যান্ড)', office_en: 'Upazila land office (AC Land)',
    docs_bn: ['পুরনো খতিয়ান', 'এনআইডি', 'খাজনার রশিদ'], docs_en: ['Old khatian', 'NID', 'Land tax receipt'],
  },
  {
    id: 'heir', icon: Users, bn: 'ওয়ারিশের জমি', en: 'Inherited land',
    office_bn: 'উপজেলা ভূমি অফিস ও সাব-রেজিস্ট্রি', office_en: 'Land office & sub-registry',
    docs_bn: ['ওয়ারিশ সনদ', 'সব ওয়ারিশের এনআইডি', 'বণ্টননামা'], docs_en: ['Succession certificate', 'All heirs’ NIDs', 'Partition deed'],
  },
  {
    id: 'case', icon: Gavel, bn: 'দখল বা মামলা', en: 'Land grab or case',
    office_bn: 'দেওয়ানি আদালত / থানা', office_en: 'Civil court / police',
    docs_bn: ['দলিল ও খতিয়ান', 'মামলার নম্বর (থাকলে)', 'ছবি বা প্রমাণ'], docs_en: ['Deed and khatian', 'Case number (if any)', 'Photos or proof'],
  },
  {
    id: 'bank', icon: Banknote, bn: 'ব্যাংক বন্ধক', en: 'Bank mortgage',
    office_bn: 'সংশ্লিষ্ট ব্যাংক শাখা', office_en: 'The bank branch',
    docs_bn: ['ঋণ শোধের রশিদ', 'ব্যাংকের ছাড়পত্র (NOC)', 'দলিলের কপি'], docs_en: ['Loan repayment receipt', 'Bank NOC', 'Deed copy'],
  },
];

const HAVE: Array<{ id: Have; bn: string; en: string }> = [
  { id: 'dag', bn: 'দাগ নম্বর জানি', en: 'I know the plot no' },
  { id: 'deed', bn: 'দলিল হাতে আছে', en: 'I have the deed' },
  { id: 'none', bn: 'কিছুই নেই', en: 'Nothing yet' },
];

const URGENCY: Array<{ id: Urgency; bn: string; en: string }> = [
  { id: 'paying', bn: 'শিগগির টাকা দেব', en: 'Paying money soon' },
  { id: 'time', bn: 'হাতে সময় আছে', en: 'I have time' },
  { id: 'threat', bn: 'দখল বা হুমকি', en: 'Grab or threat' },
];

export const HelpProblemTriageSection: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { t, lang } = useAppUI();
  const [step, setStep] = useState(0);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [have, setHave] = useState<Have | null>(null);
  const [urgency, setUrgency] = useState<Urgency | null>(null);

  const restart = () => {
    setStep(0);
    setProblem(null);
    setHave(null);
    setUrgency(null);
  };

  const p = PROBLEMS.find((x) => x.id === problem);
  const action =
    have === 'dag'
      ? { to: 'check', bn: 'জমি যাচাই করুন', en: 'Check the land' }
      : have === 'deed'
        ? { to: problem === 'bank' ? 'qr?kind=noc' : 'qr', bn: problem === 'bank' ? 'ছাড়পত্র যাচাই' : 'দলিল যাচাই করুন', en: problem === 'bank' ? 'Verify NOC' : 'Verify the deed' }
        : { to: 'map', bn: 'ম্যাপে জমি খুঁজুন', en: 'Find land on map' };

  const option = (active: boolean) =>
    cn(
      'flex min-h-12 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition cursor-pointer',
      active ? 'border-[#006A4E] bg-emerald-50 text-[#006A4E] ring-1 ring-[#006A4E]/30' : 'border-slate-200 text-slate-800 hover:border-slate-300'
    );

  const questions = [
    t('কী নিয়ে সমস্যা?', 'What is the problem about?'),
    t('আপনার কাছে কী আছে?', 'What do you have?'),
    t('কতটা জরুরি?', 'How urgent is it?'),
  ];

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 p-4 sm:p-6">
      {step < 3 ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{questions[step]}</h2>
            <span className="text-xs text-slate-500">
              {t(`ধাপ ${toBanglaDigits(step + 1, 'bn')}/৩`, `Step ${step + 1}/3`)}
            </span>
          </div>
          <div className="mt-2 flex gap-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className={cn('h-1 flex-1 rounded-full', i <= step ? 'bg-[#006A4E]' : 'bg-slate-200')} />
            ))}
          </div>

          <div className={cn('mt-4 grid gap-2', step === 0 ? 'grid-cols-2 sm:grid-cols-3' : 'sm:grid-cols-3')}>
            {step === 0 &&
              PROBLEMS.map((x) => {
                const Icon = x.icon;
                return (
                  <button key={x.id} type="button" onClick={() => { setProblem(x.id); setStep(1); }} className={option(problem === x.id)}>
                    <Icon className="size-5 shrink-0 text-[#006A4E]" />
                    {lang === 'bn' ? x.bn : x.en}
                  </button>
                );
              })}
            {step === 1 &&
              HAVE.map((x) => (
                <button key={x.id} type="button" onClick={() => { setHave(x.id); setStep(2); }} className={option(have === x.id)}>
                  {lang === 'bn' ? x.bn : x.en}
                </button>
              ))}
            {step === 2 &&
              URGENCY.map((x) => (
                <button key={x.id} type="button" onClick={() => { setUrgency(x.id); setStep(3); }} className={option(urgency === x.id)}>
                  {lang === 'bn' ? x.bn : x.en}
                </button>
              ))}
          </div>

          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="mt-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 cursor-pointer">
              <ArrowLeft className="size-4" />
              {t('পেছনে', 'Back')}
            </button>
          )}
        </>
      ) : (
        p && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-slate-500">{t('আপনার সমাধান', 'Your next step')}</p>
                <h2 className="text-lg font-semibold text-slate-900">{lang === 'bn' ? p.bn : p.en}</h2>
              </div>
              <button type="button" onClick={restart} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 cursor-pointer">
                <RotateCcw className="size-4" />
                {t('আবার শুরু', 'Start over')}
              </button>
            </div>

            {urgency === 'threat' && (
              <p className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                <AlertTriangle className="size-4 shrink-0" />
                {t('বিপদে থাকলে এখনই ৯৯৯ এ কল করুন', 'If you are in danger, call 999 now')}
              </p>
            )}
            {urgency === 'paying' && (
              <p className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle className="size-4 shrink-0" />
                {t('যাচাইয়ের আগে কোনো টাকা দেবেন না', 'Do not pay before checking')}
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <Building2 className="size-4" />
                  {t('কোথায় যাবেন', 'Where to go')}
                </p>
                <p className="mt-1 font-medium text-slate-900">{lang === 'bn' ? p.office_bn : p.office_en}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">{t('সাথে নিন', 'Bring')}</p>
                <ul className="mt-1 space-y-0.5 text-sm text-slate-800">
                  {(lang === 'bn' ? p.docs_bn : p.docs_en).map((d) => (
                    <li key={d} className="flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 shrink-0 text-[#006A4E]" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onNavigate(action.to)}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#006A4E] px-5 text-sm font-medium text-white hover:bg-[#00553e] cursor-pointer"
              >
                {lang === 'bn' ? action.bn : action.en}
                <ArrowRight className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('offices')}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-800 hover:border-[#006A4E] hover:text-[#006A4E] cursor-pointer"
              >
                <Building2 className="size-4" />
                {t('অফিস খুঁজুন', 'Find office')}
              </button>
              <a
                href={urgency === 'threat' ? 'tel:999' : 'tel:16122'}
                className={cn(
                  'inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium',
                  urgency === 'threat' ? 'border-rose-300 text-rose-700 hover:bg-rose-50' : 'border-slate-200 text-slate-800 hover:border-[#006A4E] hover:text-[#006A4E]'
                )}
              >
                <PhoneCall className="size-4" />
                {urgency === 'threat' ? t('কল ৯৯৯', 'Call 999') : t('কল ১৬১২২', 'Call 16122')}
              </a>
            </div>
          </div>
        )
      )}
    </div>
  );
};
