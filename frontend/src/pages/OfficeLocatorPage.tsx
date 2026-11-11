import React, { useMemo, useState } from 'react';
import {
  Building2,
  CalendarCheck,
  Clock,
  HelpCircle,
  List,
  Loader2,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Navigation,
  Phone,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { useAppUI } from '../i18n';
import { toBanglaDigits } from '../theme/tokens';
import { cn } from '@/lib/utils';
import { useOffices } from '../components/publicHooks';
import { PublicHero } from '@/components/public/PublicPage';
import { EmptyState, notify, StatusBadge, Tone } from '@/components/admin/kit';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OfficeMap } from './offices/OfficeMap';
import { AppointmentDialog } from './offices/AppointmentDialog';
import {
  directionsUrl,
  distanceKm,
  hasCoords,
  OFFICE_TYPES,
  OfficeItem,
  telHref,
  toAsciiDigits,
  typeInfo,
} from './offices/officeUtils';

const ALL = '__all';
const TYPE_TONE: Record<string, Tone> = {
  ac_land: 'green',
  registry: 'blue',
  settlement: 'violet',
  service_point: 'amber',
  bank: 'slate',
  admin: 'slate',
};
const GOVT_HOURS = ['ac_land', 'registry', 'settlement', 'admin'];

const cleanQuery = (v: string) => v.replace(/[<>"'`]/g, '').slice(0, 60);

export const OfficeLocatorPage: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { t, lang } = useAppUI();
  const n = (v: number | string) => toBanglaDigits(v, lang);

  /* ---------- filters (URL ?area= / ?q= / ?type= / ?district= read once) ---------- */
  const initial = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    return {
      q: cleanQuery((p.get('area') || p.get('q') || '').trim()),
      type: (p.get('type') || '').toLowerCase(),
      district: (p.get('district') || '').trim().slice(0, 40),
    };
  }, []);
  const [query, setQuery] = useState(initial.q);
  const [district, setDistrict] = useState(initial.district || ALL);
  const [type, setType] = useState(OFFICE_TYPES.some((x) => x.id === initial.type) ? initial.type : ALL);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [booking, setBooking] = useState<OfficeItem | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');

  const officesQuery = useOffices();
  const all: OfficeItem[] = officesQuery.data || [];

  const districts = useMemo(() => {
    const m = new Map<string, string>();
    all.forEach((o) => {
      const key = o.district_bn || o.district_en;
      if (key && !m.has(key)) m.set(key, (lang === 'bn' ? o.district_bn : o.district_en) || key);
    });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [all, lang]);

  const offices = useMemo(() => {
    const q = toAsciiDigits(query.trim().toLowerCase());
    const typeDef = OFFICE_TYPES.find((x) => x.id === type);
    let list = all.filter((o) => {
      if (district !== ALL && o.district_bn !== district && o.district_en !== district) return false;
      if (typeDef && !typeDef.match.includes(String(o.office_type).toLowerCase())) return false;
      if (!q) return true;
      return [o.name_bn, o.name_en, o.address_bn, o.address_en, o.upazila_bn, o.upazila_en, o.district_bn, o.district_en, o.office_code]
        .some((v) => toAsciiDigits(String(v || '').toLowerCase()).includes(q));
    });
    if (userPos) {
      const d = (o: OfficeItem) => (hasCoords(o) ? distanceKm(userPos, [Number(o.latitude), Number(o.longitude)]) : Infinity);
      list = [...list].sort((a, b) => d(a) - d(b));
    }
    return list;
  }, [all, query, district, type, userPos]);

  const filtered = query.trim() !== '' || district !== ALL || type !== ALL;
  const reset = () => {
    setQuery('');
    setDistrict(ALL);
    setType(ALL);
  };

  const nearMe = () => {
    if (userPos) {
      setUserPos(null);
      return;
    }
    if (!('geolocation' in navigator)) {
      notify.err(null, lang, t('এই ডিভাইসে লোকেশন নেই', 'Location not available'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      () => {
        setLocating(false);
        notify.err(null, lang, t('লোকেশন পাওয়া যায়নি', 'Could not get your location'));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const selectCls = 'h-11 w-full rounded-xl text-sm';

  return (
    <div className="bg-white">
      <PublicHero
        image="landtech-hackathon-hero"
        tone="light"
        position="70% center"
        icon={Building2}
        title={t('ভূমি অফিস', 'Land offices')}
        subtitle={t('কাছের অফিস খুঁজুন, সময় নিন', 'Find a nearby office, book a visit')}
      >
        {/* Toolbar */}
        <div className="grid max-w-5xl grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-lg shadow-slate-900/5 sm:p-3 lg:grid-cols-[minmax(0,1fr)_11rem_13rem_auto]">
          <div className="relative col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(cleanQuery(e.target.value))}
              maxLength={60}
              placeholder={t('অফিস বা এলাকার নাম', 'Office or area name')}
              aria-label={t('অফিস খুঁজুন', 'Search offices')}
              className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-9 text-sm outline-none placeholder:text-slate-400 focus:border-[#006A4E] focus:ring-2 focus:ring-[#006A4E]/15"
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
          <Select value={district} onValueChange={setDistrict}>
            <SelectTrigger className={selectCls} aria-label={t('জেলা', 'District')}>
              <SelectValue placeholder={t('জেলা', 'District')} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={ALL}>{t('সব জেলা', 'All districts')}</SelectItem>
              {districts.map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className={selectCls} aria-label={t('অফিসের ধরন', 'Office type')}>
              <SelectValue placeholder={t('অফিসের ধরন', 'Office type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('সব ধরন', 'All types')}</SelectItem>
              {OFFICE_TYPES.map((x) => (
                <SelectItem key={x.id} value={x.id}>
                  {lang === 'bn' ? x.bn : x.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={nearMe}
            disabled={locating}
            aria-pressed={!!userPos}
            className={cn(
              'col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition cursor-pointer disabled:opacity-70 lg:col-span-1',
              userPos ? 'bg-emerald-50 text-[#006A4E] ring-1 ring-inset ring-[#006A4E]/40' : 'bg-[#006A4E] text-white hover:bg-[#00553e]'
            )}
          >
            {locating ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
            {userPos ? t('কাছের অফিস আগে', 'Nearest first') : t('আমার কাছে', 'Near me')}
            {userPos && <X className="size-3.5" />}
          </button>
        </div>
      </PublicHero>

      <div className="mx-auto max-w-7xl px-4 pb-6 pt-3">
        {/* Count + phone list/map switch */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3 text-sm text-slate-600">
            <span>
              {officesQuery.isLoading ? t('লোড হচ্ছে…', 'Loading…') : t(`${n(offices.length)}টি অফিস`, `${offices.length} offices`)}
            </span>
            {filtered && (
              <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-[#006A4E] hover:underline cursor-pointer">
                <RotateCcw className="size-3.5" />
                {t('সব দেখুন', 'Show all')}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as 'list' | 'map')} className="lg:hidden">
              <TabsList className="h-9">
                <TabsTrigger value="list" className="gap-1.5 px-3 text-sm">
                  <List className="size-4" />
                  {t('তালিকা', 'List')}
                </TabsTrigger>
                <TabsTrigger value="map" className="gap-1.5 px-3 text-sm">
                  <MapIcon className="size-4" />
                  {t('ম্যাপ', 'Map')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('help')}
                className="hidden items-center gap-1 text-sm text-slate-500 hover:text-[#006A4E] sm:inline-flex cursor-pointer"
              >
                <HelpCircle className="size-4" />
                {t('সহায়তা', 'Help')}
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          {/* List */}
          <div
            className={cn(
              'space-y-3 lg:h-[max(26rem,calc(100dvh-22rem))] lg:overflow-y-auto lg:pr-1 scrollbar-thin',
              view === 'map' && 'hidden lg:block'
            )}
          >
            {officesQuery.isLoading ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))
            ) : officesQuery.isError ? (
              <EmptyState
                icon={Building2}
                text={t('অফিসের তালিকা আনা যায়নি', 'Could not load offices')}
                action={
                  <button
                    type="button"
                    onClick={() => officesQuery.refetch()}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-4 text-sm hover:bg-slate-50 cursor-pointer"
                  >
                    <RotateCcw className="size-4" />
                    {t('আবার চেষ্টা', 'Retry')}
                  </button>
                }
              />
            ) : offices.length === 0 ? (
              <EmptyState
                icon={Building2}
                text={t('কোনো অফিস পাওয়া যায়নি', 'No office found')}
                action={
                  filtered ? (
                    <button
                      type="button"
                      onClick={reset}
                      className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm hover:bg-slate-50 cursor-pointer"
                    >
                      {t('সব অফিস দেখুন', 'Show all offices')}
                    </button>
                  ) : undefined
                }
              />
            ) : (
              offices.map((o) => (
                <OfficeCard
                  key={o.id}
                  office={o}
                  selected={selectedId === o.id}
                  distance={userPos && hasCoords(o) ? distanceKm(userPos, [Number(o.latitude), Number(o.longitude)]) : null}
                  onSelect={() => setSelectedId(o.id)}
                  onBook={() => setBooking(o)}
                />
              ))
            )}
          </div>

          {/* Map (always mounted so Leaflet is created once; hidden on phone in list view) */}
          <div className={cn('h-[calc(100dvh-17rem)] min-h-80 lg:h-[max(26rem,calc(100dvh-22rem))]', view === 'list' && 'hidden lg:block')}>
            <OfficeMap offices={offices} selectedId={selectedId} onSelect={setSelectedId} userPos={userPos} lang={lang} />
          </div>
        </div>
      </div>

      <AppointmentDialog office={booking} onClose={() => setBooking(null)} />
    </div>
  );
};

/* ------------------------------------------------------------------ */

const OfficeCard: React.FC<{
  office: OfficeItem;
  selected: boolean;
  distance: number | null;
  onSelect: () => void;
  onBook: () => void;
}> = ({ office: o, selected, distance, onSelect, onBook }) => {
  const { t, lang } = useAppUI();
  const info = typeInfo(o.office_type);
  const tel = telHref(o.contact_phone);
  const phoneText = toBanglaDigits(toAsciiDigits(o.contact_phone || ''), lang);
  const name = (lang === 'bn' ? o.name_bn : o.name_en) || o.name_bn;
  const address = (lang === 'bn' ? o.address_bn : o.address_en) || o.address_bn;
  const btn = 'inline-flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-medium transition cursor-pointer';

  return (
    <article
      onClick={onSelect}
      className={cn(
        'rounded-xl border bg-white p-4 transition',
        selected ? 'border-[#006A4E] ring-1 ring-[#006A4E]/30' : 'border-slate-200 hover:border-slate-300'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <StatusBadge tone={TYPE_TONE[info.id] || 'slate'}>{lang === 'bn' ? info.bn : info.en}</StatusBadge>
        {distance !== null && Number.isFinite(distance) && (
          <span className="text-xs font-medium text-slate-600">
            {toBanglaDigits(distance < 10 ? distance.toFixed(1) : Math.round(distance), lang)} {t('কিমি', 'km')}
          </span>
        )}
      </div>
      <h2 className="mt-2 font-semibold leading-snug text-slate-900">{name}</h2>
      <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
        <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
        <span>{address}</span>
      </p>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {phoneText && (
          <span className="flex items-center gap-1">
            <Phone className="size-3.5" />
            {phoneText}
          </span>
        )}
        {GOVT_HOURS.includes(info.id) && (
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {t('রবি–বৃহঃ, সকাল ৯টা–বিকাল ৫টা', 'Sun–Thu, 9am–5pm')}
          </span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onBook} className={cn(btn, 'bg-[#006A4E] text-white hover:bg-[#00553e]')}>
          <CalendarCheck className="size-4" />
          {t('সময় নিন', 'Book')}
        </button>
        {tel ? (
          <a href={tel} className={cn(btn, 'border border-slate-200 text-slate-700 hover:border-[#006A4E] hover:text-[#006A4E]')}>
            <Phone className="size-4" />
            {t('কল', 'Call')}
          </a>
        ) : (
          <span className={cn(btn, 'cursor-default border border-slate-100 text-slate-300')}>
            <Phone className="size-4" />
            {t('কল', 'Call')}
          </span>
        )}
        <a
          href={directionsUrl(o)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(btn, 'border border-slate-200 text-slate-700 hover:border-[#006A4E] hover:text-[#006A4E]')}
        >
          <Navigation className="size-4" />
          {t('দিকনির্দেশ', 'Directions')}
        </a>
      </div>
    </article>
  );
};

export default OfficeLocatorPage;
