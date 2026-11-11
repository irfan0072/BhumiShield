import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useAppUI } from '../../i18n';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/admin/kit';

type Cat = 'survey' | 'deed' | 'office';

interface Term {
  id: string;
  cat: Cat;
  bn: string;
  en: string;
  mean_bn: string;
  mean_en: string;
}

export const TERMS: Term[] = [
  { id: 'khatian', cat: 'survey', bn: 'খতিয়ান', en: 'Khatian (record of rights)', mean_bn: 'জমির মালিক, অংশ ও খাজনার সরকারি তালিকা।', mean_en: 'Government list of owners, shares and land tax.' },
  { id: 'porcha', cat: 'survey', bn: 'পরচা', en: 'Porcha', mean_bn: 'খতিয়ানের সই করা কপি।', mean_en: 'A certified copy of a khatian.' },
  { id: 'dag', cat: 'survey', bn: 'দাগ নম্বর', en: 'Plot (dag) number', mean_bn: 'নকশায় একটি জমির নিজস্ব নম্বর।', mean_en: 'The number of one plot on the map.' },
  { id: 'mouza', cat: 'survey', bn: 'মৌজা', en: 'Mouza', mean_bn: 'জমির হিসাবের জন্য গ্রাম বা এলাকা, যার নিজস্ব নকশা আছে।', mean_en: 'A village or area with its own land map.' },
  { id: 'jl', cat: 'survey', bn: 'জেএল নম্বর', en: 'JL number', mean_bn: 'প্রতিটি মৌজার সরকারি নম্বর।', mean_en: 'The official number of a mouza.' },
  { id: 'cs', cat: 'survey', bn: 'সিএস জরিপ', en: 'CS survey', mean_bn: 'প্রথম জরিপ (১৮৮৮–১৯৪০), সবচেয়ে পুরনো রেকর্ড।', mean_en: 'First survey (1888–1940), the oldest record.' },
  { id: 'sa', cat: 'survey', bn: 'এসএ জরিপ', en: 'SA survey', mean_bn: 'জমিদারি বিলোপের পরের রেকর্ড (১৯৫৬–১৯৬৩)।', mean_en: 'Record made after zamindari ended (1956–1963).' },
  { id: 'rs', cat: 'survey', bn: 'আরএস জরিপ', en: 'RS survey', mean_bn: 'সংশোধিত জরিপ। অনেক জেলায় এটিই চালু রেকর্ড।', mean_en: 'Revised survey. Still the current record in many districts.' },
  { id: 'bs', cat: 'survey', bn: 'বিএস / সিটি জরিপ', en: 'BS / City survey', mean_bn: 'বাংলাদেশ জরিপ। প্রকাশ হলে এটিই চূড়ান্ত রেকর্ড।', mean_en: 'Bangladesh survey. Once published, it is the final record.' },
  { id: 'bds', cat: 'survey', bn: 'বিডিএস জরিপ', en: 'BDS (digital survey)', mean_bn: 'ড্রোন ও স্যাটেলাইটে চলমান ডিজিটাল জরিপ।', mean_en: 'The ongoing digital survey with drones and satellites.' },
  { id: 'saf', cat: 'deed', bn: 'সাফ কবলা', en: 'Sale deed', mean_bn: 'টাকার বিনিময়ে জমি বিক্রির দলিল।', mean_en: 'Deed for selling land for money.' },
  { id: 'hiba', cat: 'deed', bn: 'হেবা দলিল', en: 'Gift deed (hiba)', mean_bn: 'নিকট আত্মীয়কে জমি দানের দলিল। ফি কম।', mean_en: 'Deed for gifting land to a close relative. Low fee.' },
  { id: 'baya', cat: 'deed', bn: 'বায়া দলিল', en: 'Parent deed', mean_bn: 'বিক্রেতা আগে যে দলিলে জমি পেয়েছিলেন।', mean_en: 'The earlier deed by which the seller got the land.' },
  { id: 'bonton', cat: 'deed', bn: 'বণ্টননামা', en: 'Partition deed', mean_bn: 'ওয়ারিশদের মধ্যে জমি ভাগের দলিল।', mean_en: 'Deed that divides land among heirs.' },
  { id: 'ammokta', cat: 'deed', bn: 'আমমোক্তারনামা', en: 'Power of attorney', mean_bn: 'অন্যকে আপনার হয়ে কাজ করার লিখিত অনুমতি।', mean_en: 'Written permission for someone to act for you.' },
  { id: 'baina', cat: 'deed', bn: 'বায়নানামা', en: 'Sale agreement', mean_bn: 'অগ্রিম টাকা দিয়ে জমি কেনার চুক্তি।', mean_en: 'Agreement to buy land with an advance payment.' },
  { id: 'namjari', cat: 'office', bn: 'নামজারি', en: 'Mutation', mean_bn: 'নতুন মালিকের নাম খতিয়ানে তোলা।', mean_en: 'Putting the new owner’s name in the khatian.' },
  { id: 'dcr', cat: 'office', bn: 'ডিসিআর', en: 'DCR', mean_bn: 'নামজারি অনুমোদনের পর ফি দেওয়ার রশিদ।', mean_en: 'Receipt for the fee paid after mutation is approved.' },
  { id: 'khajna', cat: 'office', bn: 'খাজনা / ভূমি উন্নয়ন কর', en: 'Land tax', mean_bn: 'জমির জন্য প্রতি বছর সরকারকে দেওয়া কর।', mean_en: 'Yearly tax paid to the government for land.' },
  { id: 'acland', cat: 'office', bn: 'এসি ল্যান্ড', en: 'AC Land', mean_bn: 'উপজেলা ভূমি অফিসের প্রধান কর্মকর্তা।', mean_en: 'Head officer of the upazila land office.' },
  { id: 'subreg', cat: 'office', bn: 'সাব-রেজিস্ট্রার', en: 'Sub-registrar', mean_bn: 'যিনি দলিল রেজিস্ট্রি করেন।', mean_en: 'The officer who registers deeds.' },
  { id: 'noc', cat: 'office', bn: 'এনওসি (ছাড়পত্র)', en: 'NOC', mean_bn: 'ঋণ শোধের পর ব্যাংকের দেওয়া ছাড়পত্র।', mean_en: 'Clearance a bank gives after a loan is repaid.' },
  { id: 'lien', cat: 'office', bn: 'বন্ধক', en: 'Mortgage', mean_bn: 'ঋণের জামানত হিসেবে ব্যাংকের কাছে রাখা জমি।', mean_en: 'Land held by a bank as security for a loan.' },
];

export const matchGlossary = (query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return TERMS;
  return TERMS.filter((x) => [x.bn, x.en, x.mean_bn, x.mean_en].some((v) => v.toLowerCase().includes(q)));
};

const CATS: Array<{ id: 'all' | Cat; bn: string; en: string }> = [
  { id: 'all', bn: 'সব', en: 'All' },
  { id: 'survey', bn: 'জরিপ ও খতিয়ান', en: 'Survey & records' },
  { id: 'deed', bn: 'দলিল', en: 'Deeds' },
  { id: 'office', bn: 'অফিসের কাজ', en: 'Office work' },
];

export const HelpGlossarySection: React.FC<{ query?: string }> = ({ query = '' }) => {
  const { t, lang } = useAppUI();
  const [cat, setCat] = useState<'all' | Cat>('all');
  const items = matchGlossary(query).filter((x) => cat === 'all' || x.cat === cat);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {CATS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            aria-pressed={cat === c.id}
            className={cn(
              'h-9 rounded-full border px-3.5 text-sm transition cursor-pointer',
              cat === c.id ? 'border-[#006A4E] bg-[#006A4E] text-white' : 'border-slate-200 text-slate-700 hover:border-slate-300'
            )}
          >
            {lang === 'bn' ? c.bn : c.en}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={BookOpen} text={t('কোনো শব্দ পাওয়া যায়নি', 'No word found')} />
      ) : (
        <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((x) => (
            <div key={x.id} className="rounded-xl border border-slate-200 px-4 py-3">
              <dt className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold text-slate-900">{lang === 'bn' ? x.bn : x.en}</span>
                {lang === 'bn' && <span className="text-xs text-slate-500">{x.en}</span>}
              </dt>
              <dd className="mt-0.5 text-sm text-slate-600">{lang === 'bn' ? x.mean_bn : x.mean_en}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};
