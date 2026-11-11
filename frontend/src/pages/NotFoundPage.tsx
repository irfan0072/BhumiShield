import React from 'react';
import { FileCheck2, HelpCircle, Home, MapPinOff, PhoneCall, ShieldCheck } from 'lucide-react';
import { useAppUI } from '../i18n';
import { PublicHero } from '@/components/public/PublicPage';

interface NotFoundPageProps {
  onNavigate?: (tab: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  const { t, lang } = useAppUI();

  const go = (tab: string) => {
    if (onNavigate) onNavigate(tab);
    else window.location.href = `/${lang}${tab === 'landing' ? '' : `/${tab}`}`;
  };

  const links = [
    { tab: 'landing', icon: Home, bn: 'হোম', en: 'Home' },
    { tab: 'check', icon: ShieldCheck, bn: 'জমি যাচাই', en: 'Check land' },
    { tab: 'qr', icon: FileCheck2, bn: 'দলিল যাচাই', en: 'Verify deed' },
    { tab: 'help', icon: HelpCircle, bn: 'সহায়তা', en: 'Help' },
  ];

  return (
    <div className="bg-white">
      <PublicHero
        image="digital-mouza-map"
        tone="dark"
        icon={MapPinOff}
        title={t('পাতাটি পাওয়া যায়নি', 'Page not found')}
        subtitle={t('ঠিকানাটি ভুল বা পাতাটি সরানো হয়েছে', 'The address is wrong or the page has moved')}
        className="min-h-[calc(100dvh-14rem)] sm:min-h-[calc(100dvh-29rem)]"
      >
        <div className="grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <button
                key={l.tab}
                type="button"
                onClick={() => go(l.tab)}
                className="flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl bg-white text-sm font-medium text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:text-[#006A4E] hover:shadow-md cursor-pointer"
              >
                <Icon className="size-5 text-[#006A4E]" />
                {lang === 'bn' ? l.bn : l.en}
              </button>
            );
          })}
        </div>
        <a href="tel:16122" className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl border border-white/40 px-5 text-sm font-medium text-white hover:bg-white/10">
          <PhoneCall className="size-4" />
          {t('সাহায্যের জন্য কল ১৬১২২', 'Call 16122 for help')}
        </a>
      </PublicHero>
    </div>
  );
};

export default NotFoundPage;
