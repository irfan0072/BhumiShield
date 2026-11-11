import React, { useMemo, useState } from 'react';
import { ExternalLink, Minus, Plus, Receipt, ShieldAlert } from 'lucide-react';
import { useAppUI } from '../../i18n';
import { toBanglaDigits } from '../../theme/tokens';
import type { ServiceFeeItem } from '../../api/client';
import { cn } from '@/lib/utils';
import { usePublicFees } from '../publicHooks';
import { PublicCard } from '@/components/public/PublicPage';
import { Skeleton } from '@/components/ui/skeleton';

const SALE = '__sale';
type Area = 'city' | 'town' | 'rural';

/** Typical sale-deed costs as a share of the deed value (estimate only). */
const SALE_RATES = (area: Area) => [
  { bn: 'স্ট্যাম্প শুল্ক', en: 'Stamp duty', pct: 1.5 },
  { bn: 'রেজিস্ট্রেশন ফি', en: 'Registration fee', pct: 1 },
  { bn: 'স্থানীয় সরকার কর', en: 'Local govt tax', pct: area === 'city' ? 3 : area === 'town' ? 2 : 1 },
  { bn: 'উৎস কর', en: 'Source tax', pct: area === 'city' ? 3 : 2 },
];

const shortTitle = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, '').trim();
const ascii = (v: string) => v.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d))).replace(/\D/g, '');
const safeUrl = (u?: string) => (u && /^https:\/\//i.test(u) ? u : '');

export const HelpFeeCalculatorSection: React.FC = () => {
  const { t, lang } = useAppUI();
  const money = (v: number) => `${toBanglaDigits(Math.round(v).toLocaleString('en-IN'), lang)} ৳`;
  const { data, isLoading } = usePublicFees();
  const fees: ServiceFeeItem[] = (data?.items || []).filter((f) => (f as any).is_published !== 0);

  const [pick, setPick] = useState<string>('');
  const [qty, setQty] = useState(1);
  const [value, setValue] = useState('1000000');
  const [area, setArea] = useState<Area>('rural');

  const selected = pick || (fees[0] ? String(fees[0].id) : SALE);
  const fee = fees.find((f) => String(f.id) === selected) || null;
  const isSale = selected === SALE;
  const byValue = isSale || !!fee?.is_estimate;
  const deedValue = Math.min(Number(ascii(value) || 0), 9_999_999_999);

  const result = useMemo(() => {
    if (isSale) {
      const rows = SALE_RATES(area).map((r) => ({ bn: `${r.bn} (${toBanglaDigits(r.pct, 'bn')}%)`, en: `${r.en} (${r.pct}%)`, amount: (deedValue * r.pct) / 100 }));
      return { rows, total: rows.reduce((s, r) => s + r.amount, 0), estimate: true };
    }
    if (!fee) return { rows: [], total: 0, estimate: false };
    if (fee.is_estimate) {
      const rows = (fee.components || []).map((c) => ({ bn: c.name_bn, en: c.name_en, amount: (deedValue * Number(c.amount_bdt)) / 100 }));
      return { rows, total: (deedValue * Number(fee.total_bdt)) / 100, estimate: true };
    }
    const rows = (fee.components || []).map((c) => ({ bn: c.name_bn, en: c.name_en, amount: Number(c.amount_bdt) * qty }));
    return { rows, total: Number(fee.total_bdt) * qty, estimate: false };
  }, [isSale, fee, deedValue, area, qty]);

  const chip = (active: boolean) =>
    cn(
      'min-h-11 rounded-xl border px-3 py-2 text-left text-sm leading-snug transition cursor-pointer',
      active ? 'border-[#006A4E] bg-emerald-50 font-medium text-[#006A4E] ring-1 ring-[#006A4E]/30' : 'border-slate-200 text-slate-700 hover:border-slate-300'
    );
  const source = fee ? safeUrl(fee.source_url) : '';

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
      {/* Form */}
      <div className="space-y-4 rounded-2xl border border-slate-200 p-4 sm:p-5">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">{t('কোন সেবা?', 'Which service?')}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {isLoading
              ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-11 rounded-xl" />)
              : fees.map((f) => (
                  <button key={f.id} type="button" onClick={() => setPick(String(f.id))} className={chip(selected === String(f.id))}>
                    {shortTitle(lang === 'bn' ? f.title_bn : f.title_en || f.title_bn)}
                  </button>
                ))}
            <button type="button" onClick={() => setPick(SALE)} className={chip(isSale)}>
              {t('জমি বিক্রির দলিল', 'Land sale deed')}
            </button>
          </div>
        </div>

        {byValue ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">{t('দলিল মূল্য (টাকা)', 'Deed value (taka)')}</span>
              <input
                inputMode="numeric"
                value={value}
                maxLength={11}
                onChange={(e) => setValue(ascii(e.target.value).slice(0, 10))}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 font-mono text-base outline-none focus:border-[#006A4E] focus:ring-2 focus:ring-[#006A4E]/15"
              />
              <span className="mt-1 block text-xs text-slate-500">{money(deedValue)}</span>
            </label>
            {isSale && (
              <div>
                <span className="mb-1.5 block text-sm font-medium text-slate-700">{t('জমি কোথায়?', 'Where is the land?')}</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      ['city', 'সিটি', 'City'],
                      ['town', 'পৌরসভা', 'Town'],
                      ['rural', 'গ্রাম', 'Village'],
                    ] as const
                  ).map(([id, bn, en]) => (
                    <button key={id} type="button" onClick={() => setArea(id)} className={cn(chip(area === id), 'text-center')}>
                      {lang === 'bn' ? bn : en}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">{t('কয়টি লাগবে?', 'How many?')}</span>
            <div className="inline-flex items-center rounded-xl border border-slate-200">
              <button
                type="button"
                aria-label={t('কম', 'Less')}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex size-11 items-center justify-center text-slate-600 hover:text-[#006A4E] cursor-pointer"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-10 text-center text-base font-semibold">{toBanglaDigits(qty, lang)}</span>
              <button
                type="button"
                aria-label={t('বেশি', 'More')}
                onClick={() => setQty((q) => Math.min(20, q + 1))}
                className="flex size-11 items-center justify-center text-slate-600 hover:text-[#006A4E] cursor-pointer"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* Phone: total visible right under the form; details in the card below */}
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 lg:hidden">
          <span className="text-sm text-slate-700">
            {t('মোট', 'Total')}
            {result.estimate && <span className="ml-1 text-xs text-amber-700">({t('আনুমানিক', 'estimate')})</span>}
          </span>
          <span className="text-xl font-bold text-[#006A4E]">{money(result.total)}</span>
        </div>

        <p className="flex items-start gap-2 text-xs text-slate-500">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-rose-600" />
          {t('ফি শুধু অনলাইনে বা সরকারি চালানে দিন। দালালকে টাকা দেবেন না।', 'Pay fees only online or by government chalan. Never pay a middleman.')}
        </p>
      </div>

      {/* Result */}
      <PublicCard className="lg:sticky lg:top-24">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Receipt className="size-4 text-[#006A4E]" />
            {t('মোট সরকারি ফি', 'Total government fee')}
          </span>
          {result.estimate && (
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">{t('আনুমানিক', 'Estimate')}</span>
          )}
        </div>
        <p className="mt-1 text-3xl font-bold text-[#006A4E]">{money(result.total)}</p>
        {result.rows.length > 0 && (
          <dl className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
            {result.rows.map((r, i) => (
              <div key={i} className="flex items-start justify-between gap-3 px-3 py-2">
                <dt className="text-slate-600">{lang === 'bn' ? r.bn : r.en}</dt>
                <dd className="shrink-0 font-medium text-slate-900">{money(r.amount)}</dd>
              </div>
            ))}
          </dl>
        )}
        {fee && !isSale && (fee.circular_no || source) && (
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            {fee.circular_no && <span>{t('সূত্র', 'Source')}: {toBanglaDigits(fee.circular_no, lang)}</span>}
            {source && (
              <a href={source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#006A4E] hover:underline">
                {t('সরকারি পাতা', 'Official page')}
                <ExternalLink className="size-3" />
              </a>
            )}
          </p>
        )}
        {isSale && <p className="mt-3 text-xs text-slate-500">{t('আসল ফি সাব-রেজিস্ট্রি অফিসে নিশ্চিত করুন।', 'Confirm the exact fee at the sub-registry office.')}</p>}
      </PublicCard>
    </div>
  );
};
