import React from 'react';
import { ArrowRight, Building2, PhoneCall, ShieldAlert, Users } from 'lucide-react';
import { useAppUI } from '../../i18n';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const LINES = [
  { tel: '16122', num_bn: '১৬১২২', bn: 'ভূমি সেবা হেল্পলাইন', en: 'Land helpline', when_bn: 'সরকারি কর্মদিবসে', when_en: 'Working days', icon: PhoneCall, main: true },
  { tel: '333', num_bn: '৩৩৩', bn: 'সরকারি তথ্য ও সেবা', en: 'Govt info & services', when_bn: '২৪ ঘণ্টা', when_en: '24 hours', icon: Users },
  { tel: '999', num_bn: '৯৯৯', bn: 'জরুরি: পুলিশ, দখল', en: 'Emergency: police', when_bn: '২৪ ঘণ্টা, বিনা খরচে', when_en: '24 hours, free', icon: ShieldAlert, danger: true },
];

const STEPS = [
  { bn: 'উপজেলা ভূমি অফিসে (এসি ল্যান্ড) লিখিত আবেদন বা আপত্তি দিন।', en: 'Apply or object in writing at the upazila land office (AC Land).' },
  { bn: 'আদেশে সন্তুষ্ট না হলে ৩০ দিনের মধ্যে এডিসি (রাজস্ব) এর কাছে আপিল করুন।', en: 'Not satisfied? Appeal to the ADC (Revenue) within 30 days.' },
  { bn: 'এরপর বিভাগীয় কমিশনার ও ভূমি আপিল বোর্ডে যাওয়া যায়।', en: 'After that, go to the Divisional Commissioner and the Land Appeal Board.' },
];

export const HelpContactSection: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { t, lang } = useAppUI();

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LINES.map((l) => {
          const Icon = l.icon;
          return (
            <a
              key={l.tel}
              href={`tel:${l.tel}`}
              className={cn(
                'group flex items-center gap-3 rounded-xl border p-4 transition hover:shadow-md',
                l.main ? 'border-[#006A4E]/40 bg-emerald-50/60' : l.danger ? 'border-rose-200' : 'border-slate-200'
              )}
            >
              <span
                className={cn(
                  'flex size-11 shrink-0 items-center justify-center rounded-xl',
                  l.main ? 'bg-[#006A4E] text-white' : l.danger ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-700'
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className={cn('block text-2xl font-bold leading-tight', l.danger ? 'text-rose-700' : 'text-slate-900')}>
                  {lang === 'bn' ? l.num_bn : l.tel}
                </span>
                <span className="block text-sm text-slate-700">{lang === 'bn' ? l.bn : l.en}</span>
                <span className="block text-xs text-slate-500">{lang === 'bn' ? l.when_bn : l.when_en}</span>
              </span>
            </a>
          );
        })}

        <button
          type="button"
          onClick={() => onNavigate('offices')}
          className="group flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-[#006A4E]/40 hover:shadow-md cursor-pointer"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#006A4E]">
            <Building2 className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-slate-900">{t('কাছের ভূমি অফিস', 'Nearby land office')}</span>
            <span className="block text-sm text-slate-500">{t('ঠিকানা, ফোন ও সময় নিন', 'Address, phone, book a visit')}</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-slate-300 group-hover:text-[#006A4E]" />
        </button>
      </div>

      <Accordion type="single" collapsible className="rounded-xl border border-slate-200 px-4">
        <AccordionItem value="steps" className="border-0">
          <AccordionTrigger className="py-3.5 text-[15px] font-medium text-slate-900 hover:no-underline cursor-pointer">
            {t('অভিযোগ ও আপিলের ধাপ', 'Complaint and appeal steps')}
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <ol className="space-y-2">
              {STEPS.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#006A4E] text-xs font-medium text-white">
                    {lang === 'bn' ? '১২৩'[i] : i + 1}
                  </span>
                  {lang === 'bn' ? s.bn : s.en}
                </li>
              ))}
            </ol>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
