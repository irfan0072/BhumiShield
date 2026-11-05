import React, { useState } from 'react';
import { useAppUI } from '../../i18n';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Layers,
  Search,
  BookOpen,
  Calendar,
  History,
  FileText,
  Building,
  CheckCircle,
  X,
  HelpCircle,
} from 'lucide-react';

interface GlossaryTerm {
  id: string;
  category: 'survey' | 'deed' | 'admin';
  term_bn: string;
  term_en: string;
  epoch?: string;
  desc_bn: string;
  desc_en: string;
  impact_bn: string;
  impact_en: string;
}

const SURVEY_EPOCHS = [
  {
    code: 'CS',
    title_bn: 'সিএস জরিপ (Cadastral Survey)',
    title_en: 'Cadastral Survey (1888–1940)',
    period: '১৮৮৮ – ১৯৪০',
    status_bn: 'আদি ভিত্তি রেকর্ড',
    desc_bn: 'ব্রিটিশ ভারতের প্রথম বৈজ্ঞানিক জরিপ ও নকশা প্রণয়ন। ঐতিহাসিক মালিকানা অনুসন্ধানের আদি ভিত্তি।',
    desc_en: 'First scientific survey and mapping under British India; primary historical baseline for land title.',
  },
  {
    code: 'SA',
    title_bn: 'এসএ খতিয়ান (State Acquisition)',
    title_en: 'State Acquisition Survey (1956–1963)',
    period: '১৯৫৬ – ১৯৬৩',
    status_bn: 'জমিদারি উচ্ছেদ রেকর্ড',
    desc_bn: 'জমিদারি প্রথা উচ্ছেদের পর রাষ্ট্রীয় অধিগ্রহণ ও প্রজাস্বত্ব আইনের অধীনে প্রণীত রেকর্ড।',
    desc_en: 'Record-of-rights created following abolition of the Zamindari system under the 1950 Tenancy Act.',
  },
  {
    code: 'RS',
    title_bn: 'আরএস জরিপ (Revisional Survey)',
    title_en: 'Revisional Survey (1965–1990s)',
    period: '১৯৬৫ – ১৯৯০ দশক',
    status_bn: 'বহু জেলায় কার্যকর',
    desc_bn: 'সিএস ও এসএ-এর ভুলত্রুটি সংশোধনপূর্বক জেলাভিত্তিক পরিচালিত রিভিশনাল জরিপ। বহু অঞ্চলে এটিই সর্বশেষ কার্যকর রেকর্ড।',
    desc_en: 'District-wise revisional survey correcting past anomalies; remains the latest final record in multiple regions.',
  },
  {
    code: 'BS',
    title_bn: 'বিএস / সিটি জরিপ (Bangladesh Survey)',
    title_en: 'Bangladesh Survey / City Survey',
    period: '১৯৯০ – বর্তমান',
    status_bn: 'সর্বাধুনিক কার্যকর রেকর্ড',
    desc_bn: 'আধুনিক বাংলাদেশ জরিপ (বিএস) ও ঢাকা সিটি জরিপ। চূড়ান্ত গেজেট প্রকাশিত হলে এটিই কার্যকর আইনগত ভিত্তি।',
    desc_en: 'Modern Bangladesh Survey (BS) and Dhaka City Survey. Once finalized and gazetted, it governs absolute title.',
  },
  {
    code: 'BDS',
    title_bn: 'বিডিএস জরিপ (Bangladesh Digital Survey)',
    title_en: 'Bangladesh Digital Survey (Ongoing)',
    period: '২০২১ – চলমান',
    status_bn: 'ডিজিটাল মৌজা ম্যাপ',
    desc_bn: 'ড্রোন ও স্যাটেলাইট প্রযুক্তির মাধ্যমে ৩ডি ডিজিটাল মৌজা নকশা ও খতিয়ান অটোমেশন প্রকল্প।',
    desc_en: 'Nationwide digital survey leveraging drone imagery, high-precision GNSS, and automated 3D parcel registration.',
  },
];

const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: 'khatian',
    category: 'survey',
    term_bn: 'খতিয়ান (স্বত্বলিপি / Record-of-Rights)',
    term_en: 'Khatian / Record-of-Rights (RoR)',
    desc_bn: 'জরিপের পর জমির মালিকানা, হিস্যা, দখল ও খাজনার বিবরণ সংবলিত সরকারি দলিল বা রেজিস্টার।',
    desc_en: 'The definitive statutory register detailing land ownership, tenancy shares, possession, and assessed revenue.',
    impact_bn: 'জমি কেনার আগে বিক্রেতার নাম কার্যকর খতিয়ানে থাকা বাধ্যতামূলক।',
    impact_en: 'Mandatory that seller appears on the applicable operative khatian.',
  },
  {
    id: 'porcha',
    category: 'survey',
    term_bn: 'পরচা (খতিয়ানের অনুলিপি)',
    term_en: 'Porcha / Certified Copy of Khatian',
    desc_bn: 'মূল খতিয়ানের সত্যায়িত অনুলিপি যা নাগরিকগণ ভূমি অফিস বা ডিজিটাল সেবা থেকে সংগ্রহ করেন।',
    desc_en: 'Certified official extract of a khatian issued to citizens for evidence of title.',
    impact_bn: 'অনলাইন পরচা কিউআর কোড স্ক্যান করে সত্যতা যাচাই করা যায়।',
    impact_en: 'Online porchas can be instantly scanned and verified via QR code.',
  },
  {
    id: 'dag',
    category: 'survey',
    term_bn: 'দাগ নম্বর (Plot / Dag Number)',
    term_en: 'Plot Number / Cadastral Dag',
    desc_bn: 'মৌজা নকশায় নির্দিষ্ট একখণ্ড সীমানাবেষ্টিত জমির স্বতন্ত্র পরিচিতি নম্বর।',
    desc_en: 'Unique identifier assigned to a delineated parcel of land on a revenue mouza map.',
    impact_bn: 'প্রত্যেক জরিপে (CS, RS, BS) দাগ নম্বর পরিবর্তন হতে পারে, তাই দাগ রূপান্তর যাচাই দরকার।',
    impact_en: 'Dag numbers change between surveys, requiring historical lineage correlation.',
  },
  {
    id: 'mouza',
    category: 'admin',
    term_bn: 'মৌজা (Mouza / Revenue Village)',
    term_en: 'Mouza / Revenue Survey Unit',
    desc_bn: 'ভূমি রাজস্ব আদায়ের ভৌগোলিক একক, যার একটি নির্দিষ্ট জেএল (JL) নম্বর ও নিজস্ব নকশা থাকে।',
    desc_en: 'Geographical unit for land administration, mapped with a unique Jurisdiction List (JL) number.',
    impact_bn: 'দলিল রেজিস্ট্রির সময় সঠিক মৌজা ও জেএল নম্বর উল্লেখ অত্যাবশ্যক।',
    impact_en: 'Exact mouza and JL number are statutory requirements for deed registration.',
  },
  {
    id: 'mutation',
    category: 'admin',
    term_bn: 'ই-নামজারি ও জমাভাগ (e-Mutation & Jama)',
    term_en: 'e-Mutation & Revenue Holding Splitting',
    desc_bn: 'ক্রয় বা উত্তরাধিকারসূত্রে নতুন মালিকের নামে খতিয়ান তৈরি এবং পূর্ব মালিকের খতিয়ান থেকে জমি আলাদা করা।',
    desc_en: 'Process of recording the new owner’s title in revenue records and separating the tax holding.',
    impact_bn: 'দলিল রেজিস্ট্রির পর নামজারি না করলে সরকারি রেকর্ডে মালিকানা প্রতিষ্ঠিত হয় না।',
    impact_en: 'Without mutation, title is not recognized in revenue records for land development tax.',
  },
  {
    id: 'dcr',
    category: 'admin',
    term_bn: 'ডিসিআর (Duplicate Carbon Receipt)',
    term_en: 'DCR (Duplicate Carbon Receipt)',
    desc_bn: 'নামজারি অনুমোদনের পর সরকারি ১,০০০ টাকা রেকর্ড সংশোধন ফি পরিশোধের সরকারি চালান রশিদ।',
    desc_en: 'Official revenue receipt issued upon paying the 1,000 BDT mutation record modification fee.',
    impact_bn: 'ডিসিআর ও নামজারি খতিয়ান থাকলে জমির মালিকানা পূর্ণাঙ্গতা পায়।',
    impact_en: 'Possession of DCR alongside mutated khatian establishes undisputed fiscal title.',
  },
  {
    id: 'saf_kabala',
    category: 'deed',
    term_bn: 'সাফ কবলা দলিল (Saf Kabala)',
    term_en: 'Absolute Sale Deed',
    desc_bn: 'মূল্য পরিশোধের মাধ্যমে জমির পূর্ণাঙ্গ, চিরস্থায়ী ও নিঃশর্ত মালিকানা হস্তান্তরের প্রধান দলিল।',
    desc_en: 'Irrevocable deed transferring absolute title in consideration of monetary payment.',
    impact_bn: 'সাব-রেজিস্ট্রি অফিসে সরকারি শুল্ক পরিশোধ করে এই দলিল রেজিস্ট্রি করতে হয়।',
    impact_en: 'Must be formally registered at the Sub-Registry upon paying statutory duties.',
  },
  {
    id: 'hiba',
    category: 'deed',
    term_bn: 'হেবা দলিল (Hiba / Transfer of Affection)',
    term_en: 'Gift / Transfer for Blood Affection',
    desc_bn: 'রক্তের নিকটাত্মীয়দের (যেমন: পিতামাতা, সন্তান, ভাইবোন, স্বামী-স্ত্রী) মধ্যে স্নেহবশত জমি দান।',
    desc_en: 'Unconditional gift deed executed between close blood relatives under statutory family exemptions.',
    impact_bn: 'হেবা দলিলে সাধারণ বিক্রয় দলিলের তুলনায় সরকারি রেজিস্ট্রেশন ফি অনেক কম।',
    impact_en: 'Exempt from heavy ad valorem transfer taxes; subject to nominal flat fees.',
  },
  {
    id: 'baya',
    category: 'deed',
    term_bn: 'বায়া দলিল (Parent / Chain Deed)',
    term_en: 'Parent / Chain Title Deed',
    desc_bn: 'বর্তমান বিক্রেতা পূর্বে যার কাছ থেকে জমি ক্রয় করেছিলেন সেই মূল অতীত দলিল।',
    desc_en: 'Predecessor title deeds establishing uninterrupted chain of conveyance leading to the present seller.',
    impact_bn: 'বিগত ২৫ বছরের বায়া দলিলের ধারাবাহিকতা যাচাই করা আবশ্যক।',
    impact_en: 'A minimum 25-year chain of parent deeds must be inspected before purchase.',
  },
  {
    id: 'lien',
    category: 'admin',
    term_bn: 'ডিজিটাল লিয়েন (Mortgage Lien)',
    term_en: 'Bank Collateral Mortgage Lien',
    desc_bn: 'ব্যাংক ঋণের জামানত হিসেবে জমির রেকর্ডে আর্থিক দায় বা হস্তান্তরে আইনি অবরোধ সৃষ্টি করা।',
    desc_en: 'Encumbrance stamped on a plot record to secure bank credit, barring unapproved transfer.',
    impact_bn: 'ঋণ সম্পূর্ণ পরিশোধের পর ব্যাংক থেকে ডিজিটাল NOC ছাড়া এই জমি বিক্রি করা যায় না।',
    impact_en: 'Plot cannot be conveyed until the lending bank issues a cryptographic NOC release.',
  },
];

export const HelpGlossarySection: React.FC = () => {
  const { t, lang } = useAppUI();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | 'survey' | 'deed' | 'admin'>('all');

  const filteredTerms = GLOSSARY_TERMS.filter((item) => {
    if (category !== 'all' && item.category !== category) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.term_bn.toLowerCase().includes(q) ||
      item.term_en.toLowerCase().includes(q) ||
      item.desc_bn.toLowerCase().includes(q) ||
      item.desc_en.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-8">
      {/* 5-Tier Historical Survey Epoch Timeline */}
      <Card className="border-slate-200/90 shadow-2xs">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <History className="size-5 text-[#006A4E]" />
                <span>{t('বাংলাদেশের ভূমি জরিপ শৃঙ্খল (Survey Epochs Timeline)', 'Historical Survey Epochs Timeline in Bangladesh')}</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-1">
                {t(
                  'সিএস থেকে আধুনিক বিডিএস পর্যন্ত জরিপের ঐতিহাসিক ধারাবাহিকতা এবং কোন জরিপ কখন কার্যকর তা জানুন।',
                  'Chronological evolution from British Cadastral Survey (1888) to ongoing Bangladesh Digital Survey (BDS).'
                )}
              </CardDescription>
            </div>
            <Badge className="bg-[#E6F2EE] text-[#006A4E] border border-[#006A4E]/30 font-bold">
              CS → SA → RS → BS → BDS
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {SURVEY_EPOCHS.map((epoch, idx) => (
              <div
                key={epoch.code}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-emerald-50/50 hover:border-[#006A4E]/40 transition-all flex flex-col justify-between gap-3"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm text-[#006A4E] px-2 py-0.5 rounded bg-white border border-emerald-200">
                      {epoch.code}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">#{idx + 1}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    {lang === 'bn' ? epoch.title_bn : epoch.title_en}
                  </h4>
                  <Badge variant="outline" className="text-[10px] bg-white text-slate-600 w-fit">
                    {epoch.period}
                  </Badge>
                  <p className="text-[11px] text-slate-600 leading-relaxed mt-1">
                    {lang === 'bn' ? epoch.desc_bn : epoch.desc_en}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/70 text-[10px] font-bold text-[#006A4E]">
                  {epoch.status_bn}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Searchable Land Terms Glossary */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="size-5 text-[#006A4E]" />
              <span>{t('বাংলাদেশের ভূমি ও দলিল পরিভাষা কোষ (Land Glossary)', 'Bangladeshi Land & Deed Registry Glossary')}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('কঠিন আইনি ও প্রশাসনিক শব্দের সহজ সরল ব্যাখ্যা', 'Plain-language explanations of complex statutory land registry terms')}
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('পরিভাষা খুঁজুন (যেমন: খতিয়ান, হেবা)...', 'Search terms...')}
              className="pl-9 pr-8 h-9 text-xs rounded-xl"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Category Chips */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label_bn: 'সকল পরিভাষা', label_en: 'All Terms' },
            { id: 'survey', label_bn: 'জরিপ ও খতিয়ান', label_en: 'Survey & RoR' },
            { id: 'deed', label_bn: 'দলিলের প্রকারভেদ', label_en: 'Deed Types' },
            { id: 'admin', label_bn: 'প্রশাসনিক ও আর্থিক', label_en: 'Administrative' },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                category === c.id
                  ? 'bg-[#006A4E] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'bn' ? c.label_bn : c.label_en}
            </button>
          ))}
        </div>

        {/* Glossary Grid */}
        {filteredTerms.length === 0 ? (
          <Card className="border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
            {t('কোনো পরিভাষা পাওয়া যায়নি।', 'No matching terms found.')}
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredTerms.map((term) => (
              <Card
                key={term.id}
                className="border-slate-200/90 shadow-2xs hover:border-[#006A4E]/40 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <CardHeader className="pb-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-extrabold text-slate-900">
                      {term.term_bn}
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-mono text-[#006A4E] bg-emerald-50 border-emerald-200">
                      {term.category}
                    </Badge>
                  </div>
                  <CardDescription className="text-[11px] font-mono text-[#006A4E]">
                    {term.term_en}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col gap-2.5 text-xs text-slate-700">
                  <p className="leading-relaxed">
                    {lang === 'bn' ? term.desc_bn : term.desc_en}
                  </p>

                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600 flex items-start gap-1.5">
                    <CheckCircle className="size-3.5 text-[#006A4E] shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-800">{t('ব্যবহারিক প্রয়োগ: ', 'Practical note: ')}</strong>
                      {lang === 'bn' ? term.impact_bn : term.impact_en}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
