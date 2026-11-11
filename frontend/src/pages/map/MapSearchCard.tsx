import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { MapLocation, MapPlot } from '../../components/map/mapApi';
import { toBanglaDigits } from '../../theme/tokens';

type T = (bn: string, en: string) => string;

export const DAG_MAX = 20;

interface Props {
  t: T;
  lang: 'bn' | 'en';
  locations: MapLocation[];
  location: number;
  onLocation: (id: number) => void;
  q: string;
  onQ: (v: string) => void;
  onSearch: () => void;
  onClear: () => void;
  suggestions: MapPlot[];
  onPick: (p: MapPlot) => void;
  busy: boolean;
  className?: string;
}

/** The main tool of the map: pick a mouza, type a dag number, search. */
export const MapSearchCard: React.FC<Props> = ({
  t,
  lang,
  locations,
  location,
  onLocation,
  q,
  onQ,
  onSearch,
  onClear,
  suggestions,
  onPick,
  busy,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const mouzaName = (l: MapLocation) => (lang === 'en' ? l.mouza_en || l.mouza_bn : l.mouza_bn);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setOpen(false);
    onSearch();
  };
  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label={t('দাগ খুঁজুন', 'Find a plot')}
      className={`pointer-events-auto rounded-2xl border border-slate-200 bg-white p-2.5 shadow-lg ${className}`}
    >
      {locations.length ? (
        <Select value={String(location)} onValueChange={(v) => onLocation(Number(v))}>
          <SelectTrigger className="h-11 w-full rounded-xl text-sm" aria-label={t('মৌজা', 'Mouza')}>
            <SelectValue placeholder={t('মৌজা বাছুন', 'Choose mouza')} />
          </SelectTrigger>
          <SelectContent>
            {locations.map((l) => (
              <SelectItem key={l.id} value={String(l.id)} className="text-sm">
                {mouzaName(l)} · {lang === 'en' ? l.upazila_en || l.upazila_bn : l.upazila_bn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Skeleton className="h-11 w-full rounded-xl" />
      )}
      <div className="relative mt-2 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            type="text"
            inputMode="numeric"
            value={q}
            maxLength={DAG_MAX}
            onChange={(e) => {
              onQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={t('দাগ নং', 'Dag no.')}
            aria-label={t('দাগ নং', 'Dag no.')}
            className="h-11 w-full rounded-xl border border-slate-200 px-3 pr-9 text-sm outline-none focus:border-[#006A4E] focus:ring-2 focus:ring-[#006A4E]/15"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              aria-label={t('মুছুন', 'Clear')}
              className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          )}
          {open && q.trim() && suggestions.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setOpen(false);
                      onPick(s);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 cursor-pointer"
                  >
                    <span className="font-medium text-slate-800">
                      {t('দাগ', 'Dag')} {toBanglaDigits(s.dag_no, lang)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {toBanglaDigits(s.total_area_decimal, lang)} {t('শতক', 'dec.')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button
          type="submit"
          disabled={busy || !q.trim()}
          className="h-11 shrink-0 gap-1.5 rounded-xl bg-[#006A4E] px-4 text-sm font-medium text-white hover:bg-[#00553e] cursor-pointer"
        >
          <Search className="size-4" />
          <span className="hidden sm:inline">{t('খুঁজুন', 'Search')}</span>
        </Button>
      </div>
    </form>
  );
};
