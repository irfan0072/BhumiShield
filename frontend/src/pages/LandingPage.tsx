import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Ban,
  Building2,
  CheckCircle2,
  FileCheck2,
  Gavel,
  Landmark,
  Lock,
  Map,
  PhoneCall,
  Search,
  ShieldCheck,
  UserX,
} from 'lucide-react';
import { useAppUI } from '../i18n';
import { toBanglaDigits } from '../theme/tokens';
import { cn } from '@/lib/utils';
import { useLandingStats, useLocationsQuery } from '../components/publicHooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePublicNav } from '@/components/public/PublicShell';
import { FEATURED_SERVICES, LIVE_COUNT, SERVICE_GROUPS, SOON_COUNT } from '@/components/public/services';

/** Strip anything that is not a dag/deed code character before putting it in a URL. */
const clean = (v: string, max = 30) => v.replace(/[^\p{L}\p{N}\-/ ]/gu, '').trim().slice(0, max);

const CHECKS = [
  { icon: UserX, bn: 'বিক্রেতা আসল মালিক?', en: 'Is the seller the owner?' },
  { icon: Ban, bn: 'আগে বিক্রি হয়েছে?', en: 'Already sold?' },
  { icon: Landmark, bn: 'ব্যাংকে বন্ধক আছে?', en: 'Mortgaged to a bank?' },
  { icon: Gavel, bn: 'মামলা চলছে?', en: 'Any court case?' },
  { icon: Lock, bn: 'মালিক লক করেছেন?', en: 'Locked by owner?' },
  { icon: FileCheck2, bn: 'দলিল বদলানো হয়েছে?', en: 'Deed tampered?' },
];

export const LandingPage: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { lang, t } = useAppUI();
  const open = usePublicNav(onNavigate);
  const n = (v: number) => toBanglaDigits(v, lang);

  /* ---------------- hero search ---------------- */
  const { data: locations = [] } = useLocationsQuery();
  const [mode, setMode] = useState<'land' | 'deed' | 'map'>('land');
  const [mouza, setMouza] = useState('');
  const [dag, setDag] = useState('');
  const [deed, setDeed] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'deed') {
      const code = clean(deed);
      onNavigate(code ? `qr?code=${encodeURIComponent(code)}` : 'qr');
      return;
    }
    const d = clean(dag, 12);
    const q = new URLSearchParams();
    if (mode === 'land') {
      if (d) q.set('dag', d);
      if (mouza) q.set('mouza', mouza);
      onNavigate(q.toString() ? `check?${q}` : 'check');
    } else {
      if (mouza) q.set('mouza', mouza);
      if (d) {
        q.set('q', d);
        q.set('focus', '1');
      }
      onNavigate(q.toString() ? `map?${q}` : 'map');
    }
  };

  /* ---------------- live numbers ---------------- */
  const { data: stats } = useLandingStats();
  const numbers = useMemo(() => {
    const s: any = stats || {};
    const k = s.kpis || {};
    const pick = (...v: any[]) => {
      for (const x of v) if (x !== undefined && x !== null && !Number.isNaN(Number(x))) return Number(x);
      return null;
    };
    return [
      { bn: 'মৌজা', en: 'Mouzas', v: pick(s.total_mouzas, k.total_mouzas) },
      { bn: 'জমির দাগ', en: 'Plots', v: pick(s.total_plots, k.total_plots) },
      { bn: 'ডিজিটাল দলিল', en: 'Digital deeds', v: pick(s.total_deeds, k.total_deeds) },
      { bn: 'ভূমি অফিস', en: 'Land offices', v: pick(s.total_offices, k.total_offices) },
    ].filter((x) => x.v !== null && x.v > 0);
  }, [stats]);

  const [group, setGroup] = useState(SERVICE_GROUPS[0].id);

  return (
    <div className="bg-white">
      {/* ============ 1. HERO: main job in the first screen ============ */}
      <section className="relative isolate overflow-hidden lg:min-h-[calc(100dvh-6rem)]">
        <picture>
          <source media="(max-width: 640px)" srcSet="/assets/land/landtech-hackathon-hero-sm.webp" />
          <img
            src="/assets/land/landtech-hackathon-hero.webp"
            alt=""
            fetchPriority="high"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-[65%_center]"
          />
        </picture>
        {/* Readability layers: white on the left (desktop), soft white wash on phones */}
        <div className="absolute inset-0 -z-10 bg-white/75 sm:hidden" />
        <div
          className="absolute inset-0 -z-10 hidden sm:block"
          style={{ background: 'linear-gradient(90deg,#fff 0%,rgba(255,255,255,.9) 32%,rgba(255,255,255,0) 58%), linear-gradient(0deg,rgba(255,255,255,.85) 0%,rgba(255,255,255,0) 22%)' }}
        />

        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-6 pt-8 sm:pt-12 lg:min-h-[calc(100dvh-6rem)] lg:justify-between lg:pb-8">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-medium text-[#006A4E]">
              <span className="size-1.5 rounded-full bg-[#006A4E]" />
              {t('ডিজিটাল ভূমি সেবা', 'Digital land services')}
            </span>
            <h1 className="mt-4 text-[28px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[44px]">
              {t('জমির সব সেবা,', 'Every land service,')}
              <br />
              <span className="text-[#006A4E]">{t('এক ঠিকানায়', 'one place')}</span>
            </h1>
            <p className="mt-3 text-base text-slate-600 sm:text-lg">
              {t('যাচাই, দলিল, নামজারি — ঘরে বসে, নিরাপদে।', 'Check, deeds, mutation — from home, safely.')}
            </p>

            {/* Unified search */}
            <form onSubmit={submit} className="mt-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-900/5 sm:p-4">
              <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
                <TabsList className="mb-3 h-9 w-full sm:w-auto">
                  <TabsTrigger value="land" className="flex-1 gap-1.5 px-3 text-sm sm:flex-none">
                    <ShieldCheck className="size-4" />
                    {t('জমি যাচাই', 'Check land')}
                  </TabsTrigger>
                  <TabsTrigger value="deed" className="flex-1 gap-1.5 px-3 text-sm sm:flex-none">
                    <FileCheck2 className="size-4" />
                    {t('দলিল', 'Deed')}
                  </TabsTrigger>
                  <TabsTrigger value="map" className="flex-1 gap-1.5 px-3 text-sm sm:flex-none">
                    <Map className="size-4" />
                    {t('ম্যাপ', 'Map')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="deed" className="mt-0">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={deed}
                      onChange={(e) => setDeed(e.target.value)}
                      maxLength={30}
                      placeholder={t('দলিল নম্বর, যেমন DL-2026-1001', 'Deed no, e.g. DL-2026-1001')}
                      aria-label={t('দলিল নম্বর', 'Deed number')}
                      className="h-11 w-full min-w-0 rounded-xl sm:flex-1 border border-slate-200 px-3 font-mono text-sm outline-none focus:border-[#006A4E] focus:ring-2 focus:ring-[#006A4E]/15"
                    />
                    <SubmitBtn label={t('যাচাই করুন', 'Verify')} />
                  </div>
                </TabsContent>

                {(['land', 'map'] as const).map((m) => (
                  <TabsContent key={m} value={m} className="mt-0">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Select value={mouza} onValueChange={setMouza}>
                        <SelectTrigger className="h-11 rounded-xl text-sm sm:w-48" aria-label={t('মৌজা', 'Mouza')}>
                          <SelectValue placeholder={t('মৌজা বাছুন', 'Choose mouza')} />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {(locations as any[]).map((l) => (
                            <SelectItem key={l.id} value={String(l.id)}>
                              {lang === 'bn' ? l.mouza_bn : l.mouza_en || l.mouza_bn}
                              {l.upazila_bn ? ` · ${lang === 'bn' ? l.upazila_bn : l.upazila_en || l.upazila_bn}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <input
                        value={dag}
                        onChange={(e) => setDag(e.target.value)}
                        maxLength={12}
                        inputMode="numeric"
                        placeholder={t('দাগ নম্বর', 'Plot (dag) no')}
                        aria-label={t('দাগ নম্বর', 'Plot number')}
                        className="h-11 w-full min-w-0 rounded-xl sm:flex-1 border border-slate-200 px-3 text-sm outline-none focus:border-[#006A4E] focus:ring-2 focus:ring-[#006A4E]/15"
                      />
                      <SubmitBtn label={m === 'land' ? t('যাচাই করুন', 'Check') : t('ম্যাপে দেখুন', 'Show')} />
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
              <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {[t('লগইন ছাড়াই', 'No login'), t('বিনামূল্যে', 'Free'), t('বাংলা ও ইংরেজি', 'Bangla & English')].map((x) => (
                  <li key={x} className="flex items-center gap-1">
                    <CheckCircle2 className="size-3.5 text-[#006A4E]" />
                    {x}
                  </li>
                ))}
              </ul>
            </form>
          </div>

          {/* Popular services: still inside the first screen on desktop */}
          {/* lg:pr-20 keeps the floating help button clear of the last tile */}
          <div className="lg:pr-20">
            <p className="mb-2 text-sm font-medium text-slate-700">{t('জনপ্রিয় সেবা', 'Popular services')}</p>
            <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:grid-cols-8">
              {FEATURED_SERVICES.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => open(s)}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-1.5 py-3 text-center shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-[#006A4E]/40 hover:shadow-md cursor-pointer"
                  >
                    <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-[#006A4E] transition group-hover:bg-[#006A4E] group-hover:text-white">
                      <Icon className="size-5" />
                    </span>
                    <span className="text-xs font-medium leading-tight text-slate-800 sm:text-sm">{lang === 'bn' ? s.bn : s.en}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ============ 2. ALL SERVICES (the digital land service vision) ============ */}
      <section className="border-t border-slate-100 bg-slate-50/70 py-12 sm:py-16" aria-labelledby="services-title">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="services-title" className="text-2xl font-bold text-slate-900">{t('সব ভূমি সেবা', 'All land services')}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {t(`${n(LIVE_COUNT)}টি সেবা চালু · ${n(SOON_COUNT)}টি আসছে`, `${LIVE_COUNT} live · ${SOON_COUNT} coming`)}
              </p>
            </div>
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <div className="flex w-max gap-1 rounded-xl border border-slate-200 bg-white p-1">
                {SERVICE_GROUPS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGroup(g.id)}
                    className={cn(
                      'h-8 whitespace-nowrap rounded-lg px-3 text-sm transition cursor-pointer',
                      group === g.id ? 'bg-[#006A4E] font-medium text-white' : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    {lang === 'bn' ? g.bn : g.en}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICE_GROUPS.find((g) => g.id === group)!.items.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={s.soon}
                  onClick={() => open(s)}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl border bg-white p-4 text-left transition',
                    s.soon ? 'cursor-default border-dashed border-slate-200' : 'border-slate-200 hover:border-[#006A4E]/40 hover:shadow-md cursor-pointer'
                  )}
                >
                  <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', s.soon ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-[#006A4E]')}>
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn('font-semibold', s.soon ? 'text-slate-500' : 'text-slate-900')}>{lang === 'bn' ? s.bn : s.en}</span>
                      {s.soon && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">{t('শীঘ্রই', 'Soon')}</span>}
                      {s.login && !s.soon && <Lock className="size-3.5 text-slate-400" aria-label={t('লগইন লাগবে', 'Login needed')} />}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-slate-500">{lang === 'bn' ? s.descBn : s.descEn}</span>
                  </span>
                  {!s.soon && <ArrowRight className="size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#006A4E]" />}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ 3. WHAT WE CHECK (core value) ============ */}
      <section className="py-12 sm:py-16" aria-labelledby="checks-title">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl">
            <img
              src="/assets/land/digital-mouza-map.webp"
              srcSet="/assets/land/digital-mouza-map-sm.webp 640w, /assets/land/digital-mouza-map.webp 1600w"
              sizes="(max-width: 1024px) 100vw, 50vw"
              alt={t('মৌজার ডিজিটাল নকশা', 'Digital mouza map')}
              loading="lazy"
              width={1600}
              height={1195}
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/70 to-transparent p-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-slate-800">
                <Map className="size-3.5 text-[#006A4E]" />
                {t('স্যাটেলাইট ম্যাপে দাগ', 'Plots on satellite map')}
              </span>
            </div>
          </div>

          <div>
            <h2 id="checks-title" className="text-2xl font-bold text-slate-900">{t('কেনার আগে যা যাচাই হয়', 'What we check before you buy')}</h2>
            <p className="mt-1 text-sm text-slate-600">{t('এক ক্লিকে ৬টি বড় ঝুঁকি', '6 big risks in one click')}</p>
            <ul className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {CHECKS.map((c) => {
                const Icon = c.icon;
                return (
                  <li key={c.en} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                      <Icon className="size-4" />
                    </span>
                    <span className="text-sm font-medium text-slate-800">{lang === 'bn' ? c.bn : c.en}</span>
                  </li>
                );
              })}
            </ul>

            <ol className="mt-6 flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
              {[t('দাগ দিন', 'Enter plot'), t('বিক্রেতা বাছুন', 'Pick seller'), t('ফলাফল দেখুন', 'See result')].map((s, i) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-[#006A4E] text-xs font-medium text-white">{n(i + 1)}</span>
                  <span className="text-slate-700">{s}</span>
                  {i < 2 && <ArrowRight className="hidden size-4 text-slate-300 sm:block" />}
                </li>
              ))}
            </ol>

            <button
              type="button"
              onClick={() => onNavigate('check')}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[#006A4E] px-5 text-sm font-medium text-white hover:bg-[#00553e] cursor-pointer"
            >
              <ShieldCheck className="size-4" />
              {t('এখনই যাচাই করুন', 'Check now')}
            </button>
          </div>
        </div>
      </section>

      {/* ============ 4. NUMBERS + OFFICERS ============ */}
      <section className="border-y border-slate-100 bg-slate-50/70 py-10">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 lg:grid-cols-3">
          {numbers.length > 0 && (
            <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-4">
              {numbers.map((x) => (
                <div key={x.en} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-2xl font-bold text-slate-900">{n(x.v as number)}</p>
                  <p className="text-sm text-slate-500">{lang === 'bn' ? x.bn : x.en}</p>
                </div>
              ))}
            </div>
          )}
          <div className={cn('flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4', numbers.length === 0 && 'lg:col-span-3')}>
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Building2 className="size-5" />
              </span>
              <div>
                <p className="font-semibold text-slate-900">{t('কর্মকর্তাদের জন্য', 'For officers')}</p>
                <p className="text-sm text-slate-500">{t('রেজিস্ট্রি, ভূমি অফিস ও ব্যাংক', 'Registry, land office & banks')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('auth')}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 hover:border-[#006A4E] hover:text-[#006A4E] cursor-pointer"
            >
              {t('দাপ্তরিক লগইন', 'Official login')}
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ============ 5. HELP ============ */}
      <section className="relative isolate overflow-hidden py-14">
        <img
          src="/assets/land/hero-banner.webp"
          srcSet="/assets/land/hero-banner-sm.webp 640w, /assets/land/hero-banner.webp 1600w"
          sizes="100vw"
          alt=""
          loading="lazy"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[60%_30%]"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#00412f]/95 via-[#00412f]/80 to-[#00412f]/30" />
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t('সাহায্য দরকার?', 'Need help?')}</h2>
            <p className="mt-1 text-emerald-50/90">{t('ফোন করুন বা কাছের ভূমি অফিসে যান।', 'Call us or visit a nearby land office.')}</p>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-emerald-50/90">
              {[t('বাংলায় সহজ সাহায্য', 'Simple Bangla help'), t('সকাল ৯টা–বিকাল ৫টা', '9am–5pm'), t('বিনামূল্যে', 'Free')].map((x) => (
                <li key={x} className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-300" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="tel:16122" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#006A4E] hover:bg-emerald-50">
              <PhoneCall className="size-4" />
              {t('কল করুন ১৬১২২', 'Call 16122')}
            </a>
            <button
              type="button"
              onClick={() => onNavigate('offices')}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/40 px-5 text-sm font-medium text-white hover:bg-white/10 cursor-pointer"
            >
              <Building2 className="size-4" />
              {t('অফিস খুঁজুন', 'Find office')}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('help')}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/40 px-5 text-sm font-medium text-white hover:bg-white/10 cursor-pointer"
            >
              <Search className="size-4" />
              {t('প্রশ্ন ও উত্তর', 'FAQ')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

const SubmitBtn: React.FC<{ label: string }> = ({ label }) => (
  <button
    type="submit"
    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#006A4E] px-5 text-sm font-medium text-white hover:bg-[#00553e] cursor-pointer"
  >
    <Search className="size-4" />
    {label}
  </button>
);

export default LandingPage;
