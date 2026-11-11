import React, { useEffect, useState } from 'react';
import { BookOpen, Calculator, Compass, HelpCircle, LifeBuoy, PhoneCall, Search, X } from 'lucide-react';
import { useAppUI } from '../i18n';
import { toBanglaDigits } from '../theme/tokens';
import { PublicHero } from '@/components/public/PublicPage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpFaqSection, matchFaq } from '../components/help/HelpFaqSection';
import { HelpGlossarySection, matchGlossary } from '../components/help/HelpGlossarySection';
import { HelpFeeCalculatorSection } from '../components/help/HelpFeeCalculatorSection';
import { HelpProblemTriageSection } from '../components/help/HelpProblemTriageSection';
import { HelpContactSection } from '../components/help/HelpContactSection';

export type HelpTab = 'faq' | 'glossary' | 'fees' | 'triage' | 'contact';
const TABS: HelpTab[] = ['faq', 'glossary', 'fees', 'triage', 'contact'];
const LEGACY: Record<string, HelpTab> = { helpline: 'contact' };

/** Reads ?tab= (also the old ?section= / ?subtab=) from the URL. */
const tabFromUrl = (): HelpTab => {
  const p = new URLSearchParams(window.location.search);
  const raw = (p.get('tab') || p.get('section') || p.get('subtab') || '').toLowerCase();
  const v = (LEGACY[raw] || raw) as HelpTab;
  return TABS.includes(v) ? v : 'faq';
};

export const HelpPage: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { t, lang } = useAppUI();
  const [tab, setTab] = useState<HelpTab>(tabFromUrl);
  const [query, setQuery] = useState('');

  // Back/forward buttons.
  useEffect(() => {
    const onPop = () => setTab(tabFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const changeTab = (v: string) => {
    const next = (TABS.includes(v as HelpTab) ? v : 'faq') as HelpTab;
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.delete('section');
    url.searchParams.delete('subtab');
    url.searchParams.set('tab', next);
    window.history.replaceState(window.history.state, '', url.pathname + url.search);
  };

  const onSearch = (v: string) => {
    const clean = v.replace(/[<>"'`]/g, '').slice(0, 60);
    setQuery(clean);
    if (clean.trim() && tab !== 'faq' && tab !== 'glossary') changeTab('faq');
  };

  const q = query.trim();
  const faqCount = q ? matchFaq(q).length : null;
  const glossCount = q ? matchGlossary(q).length : null;
  const count = (c: number | null) =>
    c === null ? null : (
      <span className="ml-1 rounded-full bg-slate-200/80 px-1.5 text-[11px] font-medium text-slate-700 group-data-[state=active]:bg-emerald-100 group-data-[state=active]:text-[#006A4E]">
        {toBanglaDigits(c, lang)}
      </span>
    );

  const tabs: Array<{ id: HelpTab; bn: string; en: string; icon: React.ElementType; badge?: React.ReactNode }> = [
    { id: 'faq', bn: 'প্রশ্নোত্তর', en: 'FAQ', icon: HelpCircle, badge: count(faqCount) },
    { id: 'glossary', bn: 'শব্দকোষ', en: 'Glossary', icon: BookOpen, badge: count(glossCount) },
    { id: 'fees', bn: 'ফি হিসাব', en: 'Fees', icon: Calculator },
    { id: 'triage', bn: 'সমস্যা সমাধান', en: 'Solve a problem', icon: Compass },
    { id: 'contact', bn: 'যোগাযোগ', en: 'Contact', icon: LifeBuoy },
  ];

  return (
    <div className="bg-white">
      <PublicHero
        image="helpline-16122-bg"
        tone="dark"
        position="70% center"
        icon={LifeBuoy}
        title={t('সহায়তা', 'Help')}
        subtitle={t('প্রশ্ন, ফি ও যোগাযোগ', 'Questions, fees and contact')}
      >
        <div className="flex max-w-3xl flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => onSearch(e.target.value)}
              maxLength={60}
              placeholder={t('প্রশ্ন বা শব্দ খুঁজুন, যেমন: নামজারি', 'Search a question or word, e.g. mutation')}
              aria-label={t('সহায়তা খুঁজুন', 'Search help')}
              className="h-12 w-full rounded-xl border border-white/20 bg-white pl-9 pr-9 text-sm text-slate-900 shadow-lg outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-300"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('মুছুন', 'Clear')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <a
            href="tel:16122"
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-[#006A4E] shadow-lg hover:bg-emerald-50"
          >
            <PhoneCall className="size-5" />
            {t('কল ১৬১২২', 'Call 16122')}
          </a>
        </div>
      </PublicHero>

      <div className="mx-auto max-w-7xl px-4 pb-8 pt-4">
        <Tabs value={tab} onValueChange={changeTab}>
          <div className="-mx-4 overflow-x-auto px-4 scrollbar-thin sm:mx-0 sm:px-0">
            <TabsList className="h-11 w-max">
              {tabs.map((x) => {
                const Icon = x.icon;
                return (
                  <TabsTrigger key={x.id} value={x.id} className="group h-9 gap-1.5 px-3 text-sm">
                    <Icon className="size-4" />
                    {lang === 'bn' ? x.bn : x.en}
                    {x.badge}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value="faq" className="mt-4">
            <HelpFaqSection query={q} onNavigate={onNavigate} onTab={changeTab} />
          </TabsContent>
          <TabsContent value="glossary" className="mt-4">
            <HelpGlossarySection query={q} />
          </TabsContent>
          <TabsContent value="fees" className="mt-4">
            <HelpFeeCalculatorSection />
          </TabsContent>
          <TabsContent value="triage" className="mt-4">
            <HelpProblemTriageSection onNavigate={onNavigate} />
          </TabsContent>
          <TabsContent value="contact" className="mt-4">
            <HelpContactSection onNavigate={onNavigate} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HelpPage;
