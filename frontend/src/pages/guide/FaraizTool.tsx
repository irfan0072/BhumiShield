import React, { useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useAppUI } from '../../i18n';
import { toBanglaDigits } from '../../theme/tokens';
import { cn } from '@/lib/utils';

type Deceased = 'male' | 'female';

/** Bangla digits → Latin; keep only digits and one dot. */
const toNumber = (v: string) => {
  const latin = v.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
  const num = Number.parseFloat(latin.replace(/[^0-9.]/g, ''));
  return Number.isFinite(num) ? Math.min(Math.max(num, 0), 1_000_000) : 0;
};

/**
 * Simple Muslim inheritance (Faraiz) share calculator for spouse, sons and daughters.
 * Spouse: wife(s) 1/8 with children, 1/4 without; husband 1/4 with children, 1/2 without.
 * Sons + daughters take the rest 2:1. Daughters only: one 1/2, two or more 2/3.
 * Whatever remains goes to other heirs (parents, siblings) and is shown separately.
 */
export const calcFaraiz = (deceased: Deceased, spouses: number, sons: number, daughters: number) => {
  const hasChildren = sons + daughters > 0;
  const spouseFrac = spouses > 0 ? (deceased === 'male' ? (hasChildren ? 1 / 8 : 1 / 4) : hasChildren ? 1 / 4 : 1 / 2) : 0;
  const rest = 1 - spouseFrac;
  let son = 0;
  let daughter = 0;
  let others = 0;
  if (sons > 0) {
    const unit = rest / (2 * sons + daughters);
    son = 2 * unit;
    daughter = unit;
  } else if (daughters === 1) {
    daughter = 1 / 2;
    others = rest - 1 / 2;
  } else if (daughters >= 2) {
    daughter = 2 / 3 / daughters;
    others = rest - 2 / 3;
  } else {
    others = rest;
  }
  return { spouseEach: spouses > 0 ? spouseFrac / spouses : 0, son, daughter, others: Math.max(others, 0) };
};

export const FaraizTool: React.FC = () => {
  const { t, lang } = useAppUI();
  const [land, setLand] = useState(() => toBanglaDigits(100, lang));
  const [deceased, setDeceased] = useState<Deceased>('male');
  const [spouses, setSpouses] = useState(1);
  const [sons, setSons] = useState(2);
  const [daughters, setDaughters] = useState(1);

  const total = toNumber(land);
  const maxSpouse = deceased === 'male' ? 4 : 1;
  const r = useMemo(() => calcFaraiz(deceased, Math.min(spouses, maxSpouse), sons, daughters), [deceased, spouses, maxSpouse, sons, daughters]);

  const dec = (frac: number) => toBanglaDigits((Math.round(frac * total * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 }), lang);
  const unit = t('শতক', 'dec');

  const spouseLabel = deceased === 'male' ? t('স্ত্রী', 'Wife') : t('স্বামী', 'Husband');
  const rows = [
    spouses > 0 && { label: spouseLabel, count: Math.min(spouses, maxSpouse), each: r.spouseEach },
    sons > 0 && { label: t('ছেলে', 'Son'), count: sons, each: r.son },
    daughters > 0 && { label: t('মেয়ে', 'Daughter'), count: daughters, each: r.daughter },
  ].filter(Boolean) as Array<{ label: string; count: number; each: number }>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="block text-sm font-medium text-slate-700">{t('মোট জমি (শতক)', 'Total land (decimal)')}</span>
          <input
            value={land}
            onChange={(e) => setLand(e.target.value.replace(/[^0-9০-৯.]/g, '').slice(0, 9))}
            maxLength={9}
            inputMode="decimal"
            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-[#006A4E] focus:ring-2 focus:ring-[#006A4E]/15"
          />
        </label>
        <div className="space-y-1">
          <span className="block text-sm font-medium text-slate-700">{t('যিনি মারা গেছেন', 'Person who died')}</span>
          <div role="radiogroup" className="grid h-11 grid-cols-2 gap-1 rounded-xl border border-slate-200 p-1">
            {(['male', 'female'] as Deceased[]).map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={deceased === d}
                onClick={() => {
                  setDeceased(d);
                  setSpouses((s) => Math.min(s, d === 'male' ? 4 : 1));
                }}
                className={cn('rounded-lg text-sm transition cursor-pointer', deceased === d ? 'bg-[#006A4E] font-medium text-white' : 'text-slate-600 hover:bg-slate-100')}
              >
                {d === 'male' ? t('পুরুষ', 'Man') : t('নারী', 'Woman')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stepper label={spouseLabel} value={Math.min(spouses, maxSpouse)} max={maxSpouse} onChange={setSpouses} lang={lang} />
        <Stepper label={t('ছেলে', 'Sons')} value={sons} max={20} onChange={setSons} lang={lang} />
        <Stepper label={t('মেয়ে', 'Daughters')} value={daughters} max={20} onChange={setDaughters} lang={lang} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">{t('প্রত্যেকে পাবেন', 'Each person gets')}</div>
        {rows.length === 0 && r.others === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-500">{t('ওয়ারিশ যোগ করুন', 'Add heirs')}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((x) => (
              <li key={x.label} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm text-slate-700">
                  {x.label}
                  {x.count > 1 && <span className="text-slate-400"> × {toBanglaDigits(x.count, lang)}</span>}
                </span>
                <span className="text-right">
                  <span className="block text-lg font-bold text-[#006A4E]">
                    {dec(x.each)} <span className="text-sm font-medium">{unit}</span>
                  </span>
                  {x.count > 1 && (
                    <span className="block text-xs text-slate-500">
                      {t('মোট', 'Total')} {dec(x.each * x.count)} {unit}
                    </span>
                  )}
                </span>
              </li>
            ))}
            {r.others > 0.0001 && (
              <li className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm text-slate-700">
                  {t('অন্য ওয়ারিশ', 'Other heirs')}
                  <span className="block text-xs text-slate-500">{t('বাবা-মা, ভাই-বোন', 'Parents, siblings')}</span>
                </span>
                <span className="text-lg font-bold text-slate-700">
                  {dec(r.others)} <span className="text-sm font-medium">{unit}</span>
                </span>
              </li>
            )}
          </ul>
        )}
      </div>
      <p className="text-xs text-slate-500">{t('এটি আনুমানিক হিসাব। চূড়ান্ত হিসাব ভূমি অফিসে নিশ্চিত করুন।', 'This is an estimate. Confirm the final share at the land office.')}</p>
    </div>
  );
};

const Stepper: React.FC<{ label: string; value: number; max: number; onChange: (v: number) => void; lang: 'bn' | 'en' }> = ({
  label,
  value,
  max,
  onChange,
  lang,
}) => (
  <div className="rounded-xl border border-slate-200 p-2 text-center">
    <span className="block truncate text-sm text-slate-600">{label}</span>
    <div className="mt-1 flex items-center justify-between gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        aria-label={`${label} −`}
        className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 cursor-pointer"
      >
        <Minus className="size-4" />
      </button>
      <span className="min-w-6 text-lg font-semibold text-slate-900" aria-live="polite">
        {toBanglaDigits(value, lang)}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`${label} +`}
        className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 cursor-pointer"
      >
        <Plus className="size-4" />
      </button>
    </div>
  </div>
);
