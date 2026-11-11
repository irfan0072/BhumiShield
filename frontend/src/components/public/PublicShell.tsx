import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  Grid3X3,
  Home,
  LogIn,
  Map,
  Menu,
  PhoneCall,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Toaster } from 'sonner';
import { useAppUI } from '@/i18n';
import { cn } from '@/lib/utils';
import { useSiteSettingsQuery } from '@/components/publicHooks';
import { ROLE_DASHBOARD_MAP } from '@/components/NavbarAndLayout';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { LandService, PRIMARY_NAV, SERVICE_GROUPS } from './services';

/* ------------------------------------------------------------------ */
/* Opening a service (shared by menu, search, landing, mobile sheet)   */
/* ------------------------------------------------------------------ */

export const usePublicNav = (setActiveTab: (t: string) => void) => {
  const { user, setActiveSubTab } = useAppUI();
  return (s: Pick<LandService, 'target' | 'login' | 'soon'>) => {
    if (s.soon || !s.target) return;
    if (s.login && !user) {
      setActiveTab('auth');
      return;
    }
    const [tab, query] = s.target.split('?');
    const section = new URLSearchParams(query || '').get('section');
    if (section) {
      setActiveSubTab(section);
      setActiveTab(tab);
    } else setActiveTab(s.target);
  };
};

const settingText = (v: any) => (typeof v === 'string' ? v.replace(/^"|"$/g, '') : v ? String(v) : '');

/* ------------------------------------------------------------------ */
/* Services mega menu (desktop) and sheet (mobile)                     */
/* ------------------------------------------------------------------ */

export const ServiceList: React.FC<{ onOpen: (s: LandService) => void; compact?: boolean }> = ({ onOpen, compact }) => {
  const { lang, t } = useAppUI();
  return (
    <div className={cn('grid gap-x-6 gap-y-5', compact ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3')}>
      {SERVICE_GROUPS.map((g) => (
        <div key={g.id}>
          <p className="mb-1.5 px-2 text-xs font-medium text-slate-500">{lang === 'bn' ? g.bn : g.en}</p>
          <ul className="space-y-0.5">
            {g.items.map((s) => {
              const Icon = s.icon;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={s.soon}
                    onClick={() => onOpen(s)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm',
                      s.soon ? 'cursor-default text-slate-400' : 'cursor-pointer text-slate-700 hover:bg-emerald-50 hover:text-[#006A4E]'
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{lang === 'bn' ? s.bn : s.en}</span>
                    {s.soon && <span className="rounded bg-slate-100 px-1.5 text-[11px] text-slate-500">{t('শীঘ্রই', 'Soon')}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

export const PublicShell: React.FC<{
  activeTab: string;
  setActiveTab: (t: string) => void;
  children: React.ReactNode;
}> = ({ activeTab, setActiveTab, children }) => {
  const { lang, setLang, t, user, role } = useAppUI();
  const settings = useSiteSettingsQuery().data?.settings || {};
  const open = usePublicNav(setActiveTab);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const isMap = activeTab === 'map' || activeTab === 'cadastral';
  const govt = settingText(lang === 'bn' ? settings.govt_title_bn : settings.govt_title_en) || t('গণপ্রজাতন্ত্রী বাংলাদেশ সরকার', "People's Republic of Bangladesh");
  const ministry = settingText(lang === 'bn' ? settings.ministry_title_bn : settings.ministry_title_en) || t('ভূমি মন্ত্রণালয়', 'Ministry of Land');
  const logo = settingText(settings.govt_logo_url) || '/assets/bd-govt-seal.svg';
  const portalTab = user ? ROLE_DASHBOARD_MAP[role] || 'home' : 'auth';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    setServicesOpen(false);
    setSheetOpen(false);
  }, [activeTab]);

  const go = (target: string) => setActiveTab(target);
  const openService = (s: LandService) => {
    setServicesOpen(false);
    setSheetOpen(false);
    setSearchOpen(false);
    open(s);
  };

  const navBtn = (active: boolean) =>
    cn(
      'h-9 rounded-lg px-3 text-sm font-medium transition-colors cursor-pointer',
      active ? 'bg-emerald-50 text-[#006A4E]' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    );

  const dock = useMemo(
    () => [
      { id: 'landing', bn: 'হোম', en: 'Home', icon: Home, onClick: () => go('landing') },
      { id: 'check', bn: 'যাচাই', en: 'Check', icon: ShieldCheck, onClick: () => go('check') },
      { id: 'map', bn: 'ম্যাপ', en: 'Map', icon: Map, onClick: () => go('map') },
      { id: 'services', bn: 'সেবা', en: 'Services', icon: Grid3X3, onClick: () => setSheetOpen(true) },
      { id: portalTab, bn: user ? 'আমার' : 'লগইন', en: user ? 'Me' : 'Login', icon: user ? UserRound : LogIn, onClick: () => go(portalTab) },
    ],
    [portalTab, user] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div className={cn('flex min-h-dvh flex-col bg-white font-sans text-slate-900', isMap && 'h-dvh overflow-hidden')}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[1200] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow">
        {t('মূল অংশে যান', 'Skip to content')}
      </a>

      {/* Government identity strip (texts and seal come from admin settings) */}
      <div className="hidden border-b border-slate-200 bg-slate-50 sm:block">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-4 text-xs text-slate-600">
          <span className="flex items-center gap-2">
            <img src={logo} alt="" className="size-4" />
            {govt} · {ministry}
          </span>
          <span className="flex items-center gap-3">
            <a href="tel:16122" className="flex items-center gap-1 hover:text-[#006A4E]">
              <PhoneCall className="size-3.5" />
              {t('হেল্পলাইন ১৬১২২', 'Helpline 16122')}
            </a>
          </span>
        </div>
      </div>

      {/* Main header */}
      <header className="sticky top-0 z-[1000] border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-3 sm:h-16 sm:px-4">
          <button type="button" onClick={() => go('landing')} className="flex shrink-0 items-center gap-2.5 text-left cursor-pointer">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#006A4E] text-white">
              <ShieldCheck className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold text-slate-900">{t('ভূমি সুরক্ষা', 'BhumiShield')}</span>
              <span className="hidden text-xs text-slate-500 sm:block">{t('ডিজিটাল ভূমি সেবা', 'Digital land services')}</span>
            </span>
          </button>

          <nav aria-label={t('প্রধান মেনু', 'Main menu')} className="ml-4 hidden items-center gap-0.5 lg:flex">
            <Popover open={servicesOpen} onOpenChange={setServicesOpen}>
              <PopoverTrigger asChild>
                <button type="button" className={cn(navBtn(servicesOpen), 'flex items-center gap-1')}>
                  {t('সেবাসমূহ', 'Services')}
                  <ChevronDown className={cn('size-4 transition-transform', servicesOpen && 'rotate-180')} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" sideOffset={10} className="w-[min(860px,calc(100vw-2rem))] rounded-xl p-5">
                <ServiceList onOpen={openService} />
              </PopoverContent>
            </Popover>
            {PRIMARY_NAV.map((n) => (
              <button key={n.id} type="button" onClick={() => go(n.target)} className={navBtn(activeTab === n.target)}>
                {lang === 'bn' ? n.bn : n.en}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label={t('সেবা খুঁজুন', 'Find a service')}
              className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-2.5 text-sm text-slate-500 hover:bg-slate-50 cursor-pointer md:w-48"
            >
              <Search className="size-4" />
              <span className="hidden flex-1 text-left md:block">{t('সেবা খুঁজুন…', 'Find a service…')}</span>
            </button>
            <button
              type="button"
              onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
              className="h-9 rounded-lg border border-slate-200 px-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              aria-label={t('ভাষা বদলান', 'Change language')}
            >
              {lang === 'bn' ? 'EN' : 'বাং'}
            </button>
            <button
              type="button"
              onClick={() => go(portalTab)}
              className="hidden h-9 items-center gap-1.5 rounded-lg bg-[#006A4E] px-3.5 text-sm font-medium text-white hover:bg-[#00553e] sm:flex cursor-pointer"
            >
              {user ? <UserRound className="size-4" /> : <LogIn className="size-4" />}
              {user ? t('আমার পোর্টাল', 'My portal') : t('লগইন', 'Login')}
            </button>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-label={t('মেনু', 'Menu')}
              className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 lg:hidden cursor-pointer"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <main id="main" className={cn('flex-1', isMap ? 'min-h-0' : 'pb-16 lg:pb-0')}>
        {children}
      </main>

      {!isMap && <PublicFooter onGo={go} onOpen={openService} />}

      {/* Mobile bottom bar */}
      <nav
        aria-label={t('নিচের মেনু', 'Bottom menu')}
        className={cn('fixed inset-x-0 bottom-0 z-[1000] grid h-14 grid-cols-5 border-t border-slate-200 bg-white lg:hidden', isMap && 'hidden')}
      >
        {dock.map((d) => {
          const Icon = d.icon;
          const active = d.id === activeTab;
          return (
            <button
              key={d.id + d.bn}
              type="button"
              onClick={d.onClick}
              className={cn('flex flex-col items-center justify-center gap-0.5 text-[11px] cursor-pointer', active ? 'font-medium text-[#006A4E]' : 'text-slate-500')}
            >
              <Icon className="size-5" />
              {lang === 'bn' ? d.bn : d.en}
            </button>
          );
        })}
      </nav>

      {/* Mobile/tablet services sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[88vw] max-w-sm overflow-y-auto p-4">
          <SheetHeader className="mb-3 text-left">
            <SheetTitle className="text-base font-semibold">{t('সব ভূমি সেবা', 'All land services')}</SheetTitle>
            <SheetDescription className="sr-only">{t('সেবা বেছে নিন', 'Choose a service')}</SheetDescription>
          </SheetHeader>
          <ServiceList onOpen={openService} compact />
        </SheetContent>
      </Sheet>

      {/* Ctrl+K service search */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen} title={t('সেবা খুঁজুন', 'Find a service')}>
        <CommandInput placeholder={t('যেমন: নামজারি, দলিল, ম্যাপ…', 'e.g. mutation, deed, map…')} />
        <CommandList>
          <CommandEmpty>{t('কিছু পাওয়া যায়নি', 'Nothing found')}</CommandEmpty>
          {SERVICE_GROUPS.map((g) => (
            <CommandGroup key={g.id} heading={lang === 'bn' ? g.bn : g.en}>
              {g.items
                .filter((s) => !s.soon)
                .map((s) => {
                  const Icon = s.icon;
                  return (
                    <CommandItem key={s.id} value={`${s.bn} ${s.en} ${s.descBn} ${s.descEn}`} onSelect={() => openService(s)}>
                      <Icon />
                      {lang === 'bn' ? s.bn : s.en}
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>

      <Toaster position="top-center" richColors closeButton theme="light" />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

const PublicFooter: React.FC<{ onGo: (t: string) => void; onOpen: (s: LandService) => void }> = ({ onGo, onOpen }) => {
  const { lang, t } = useAppUI();
  const cols = SERVICE_GROUPS.filter((g) => ['verify', 'apply', 'help'].includes(g.id));
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#006A4E] text-white">
              <ShieldCheck className="size-5" />
            </span>
            <span className="text-[15px] font-semibold">{t('ভূমি সুরক্ষা', 'BhumiShield')}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-slate-600">{t('জমির সব সেবা, নিরাপদে ও এক জায়গায়।', 'Every land service, safe and in one place.')}</p>
          <a href="tel:16122" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:border-[#006A4E]">
            <PhoneCall className="size-4 text-[#006A4E]" />
            {t('হেল্পলাইন ১৬১২২', 'Helpline 16122')}
          </a>
        </div>
        {cols.map((g) => (
          <div key={g.id}>
            <p className="mb-2 text-sm font-semibold text-slate-800">{lang === 'bn' ? g.bn : g.en}</p>
            <ul className="space-y-1.5 text-sm text-slate-600">
              {g.items
                .filter((s) => !s.soon)
                .slice(0, 5)
                .map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => onOpen(s)} className="hover:text-[#006A4E] cursor-pointer">
                      {lang === 'bn' ? s.bn : s.en}
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 pb-20 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:pr-24 lg:pb-4">
          <span>© {new Date().getFullYear()} {t('ভূমি সুরক্ষা', 'BhumiShield')}</span>
          <span>{t('পরীক্ষামূলক সংস্করণ · ডেমো তথ্য ব্যবহৃত', 'Pilot version · demo data')}</span>
          <button type="button" onClick={() => onGo('help')} className="text-left hover:text-[#006A4E] cursor-pointer sm:text-right">
            {t('গোপনীয়তা ও সহায়তা', 'Privacy & help')}
          </button>
        </div>
      </div>
    </footer>
  );
};
