import React, { useState } from 'react';
import { useAppUI } from '../../i18n';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Search,
  BookOpen,
  ShieldCheck,
  Building,
  CreditCard,
  FileText,
  ThumbsUp,
  Sparkles,
  HelpCircle,
  X,
} from 'lucide-react';

interface FaqItem {
  id: string;
  category: 'buyer_seller' | 'security' | 'khatian' | 'mutation' | 'bank';
  q_bn: string;
  q_en: string;
  a_bn: string;
  a_en: string;
  highlight_bn?: string;
  highlight_en?: string;
}

const FAQS_DATA: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'security',
    q_bn: '১. ভূমি সুরক্ষা (BhumiShield) কীভাবে বাংলাদেশের জমি জালিয়াতি বন্ধ করে?',
    q_en: '1. How does BhumiShield prevent land registry fraud in Bangladesh?',
    a_bn: 'ঐতিহ্যগতভাবে বাংলাদেশের সাব-রেজিস্ট্রি এবং এসি ল্যান্ড (ভূমি অফিস) দুটি ভিন্ন মন্ত্রণালয় ও ডাটাবেজে বিচ্ছিন্নভাবে কাজ করে। এই ফাঁকফোকরে এক জমি বারবার বিক্রি, জাল দলিলে জমি রেজিস্ট্রি বা ওয়ারিশ বঞ্চিত করার মতো ঘটনা ঘটে। ভূমি সুরক্ষা ১১টি স্বয়ংক্রিয় প্রাক-নিবন্ধন রুলস ইঞ্জিন ও ক্রিপ্টোগ্রাফিক লেজারের মাধ্যমে প্রতিটি দলিল নিবন্ধনের পূর্বেই যাচাই করে এবং অনুমোদনের পর Ed25519 স্বাক্ষর ও QR কোড দ্বারা প্ল্যাটফর্মের অভ্যন্তরে অপরিবর্তনীয় প্রমাণ সংরক্ষণ করে।',
    a_en: 'Historically, the Sub-Registry (Law Ministry) and AC Land (Land Ministry) operate in separate silos. Fraudsters exploit this gap to double-sell land or forge deeds. BhumiShield bridges them with an automated 11-rule gatekeeper and Ed25519 cryptographic hash ledger before registration, recording tamper-evident audit proofs.',
    highlight_bn: 'স্বয়ংক্রিয় ১১-রুল গেটকিপার ও ডিজিটাল লেজার',
    highlight_en: 'Automated 11-rule gatekeeper and digital ledger',
  },
  {
    id: 'faq-2',
    category: 'buyer_seller',
    q_bn: '২. "জমি কেনার আগে যাচাই করুন" (Check Before You Buy) ফিচারের কাজ কী?',
    q_en: '2. What is the "Check Before You Buy" feature?',
    a_bn: 'বয়নামাপত্র সম্পাদন বা বায়না টাকা দেওয়ার আগে যেকোনো নাগরিক মাত্র ৩ ক্লিকে দাগ নম্বর ও বিক্রেতার এনআইডি দিয়ে দেখতে পারবেন: (১) বিক্রেতার নাম প্রযোজ্য খতিয়ানে আছে কি না, (২) বিক্রেতার অংশে পর্যাপ্ত জমি বাকি আছে কি না, (৩) কোনো ব্যাংকে জমিটি বন্ধক (Mortgage) আছে কি না, এবং (৪) জমিতে কোনো বিক্রয় লক বা দেওয়ানি বিরোধ রয়েছে কি না।',
    a_en: 'Before paying earnest money, any citizen can enter the plot dag and seller NID in 3 clicks to verify: (1) Seller name on applicable operative khatian, (2) Remaining share balance, (3) Active bank mortgage liens, and (4) Citizen sale locks or court disputes.',
    highlight_bn: 'বায়না করার আগে তাৎক্ষণিক ঝুঁকি বিশ্লেষণ',
    highlight_en: 'Instant risk analysis before paying advance money',
  },
  {
    id: 'faq-3',
    category: 'security',
    q_bn: '৩. নাগরিক ডিজিটাল বিক্রয় লক (Citizen Sale Lock) কী এবং কীভাবে কাজ করে?',
    q_en: '3. What is the Citizen Sale Lock and how does it work?',
    a_bn: 'প্রবাসী বাংলাদেশি (NRB), বয়োবৃদ্ধ ও একক মালিকদের জমি তাদের অজান্তে ভুয়া আমমোক্তারনামা বা জাল দলিলে রেজিস্ট্রি ঠেকাতে এই নিয়ন্ত্রণ কাজ করে। জমির রেকর্ডীয় মালিক নিজ ভল্ট থেকে সরাসরি বিক্রয় লক সক্রিয় বা নিষ্ক্রিয় করতে পারেন (লক পরিবর্তনের জন্য বর্তমান পাসওয়ার্ড বা পিন যাচাই বাধ্যতামূলক)। লক সক্রিয় থাকা অবস্থায় সাব-রেজিস্ট্রার প্যানেলে যে কোনো দলিল নিবন্ধন ১১-রুল গেটকিপার দ্বারা তাৎক্ষণিকভাবে আটকে যায়।',
    a_en: 'Targeted at non-resident Bangladeshis (NRBs) and vulnerable landowners, this security control enables authenticated plot owners to lock their land directly from the Citizen Vault (requiring password verification). When active, the gatekeeper rules strictly abort any pre-registration or deed execution until unlocked by the authenticated owner.',
    highlight_bn: 'মালিকের সরাসরি ডিজিটাল নিরাপত্তা সুইচ',
    highlight_en: 'Direct digital safety toggle by authenticated owner',
  },
  {
    id: 'faq-4',
    category: 'khatian',
    q_bn: '৪. সিএস (CS), এসএ (SA), আরএস (RS) ও বিএস (BS) খতিয়ান শৃঙ্খল কীভাবে কাজ করে?',
    q_en: '4. How does the CS, SA, RS, and BS Khatian lineage chain work across regions?',
    a_bn: 'বাংলাদেশে জমি সংক্রান্ত যেকোনো মালিকানার বৈধতা ঐতিহাসিক জরিপ শৃঙ্খলের ওপর নির্ভর করে। তবে এই জরিপসমূহ অঞ্চলভেদে ধাপে ধাপে পরিচালিত হয়েছে: ব্রিটিশ ভারতের সিএস (১৮৮৮-১৯৪০) → পাকিস্তান আমলের এসএ (১৯৫৬-১৯৬৩) → স্বাধীন বাংলাদেশের আরএস (অঞ্চলভেদে ১৯৬৫-১৯৯০ দশক) → এবং আধুনিক বিএস/সিটি/বিডিএস জরিপ। কোনো কোনো জেলায় আরএস এখনও সর্বশেষ প্রকাশিত ও কার্যকর রেকর্ড; ঢাকা মহানগরে সিটি জরিপ প্রযোজ্য, আবার বহু উপজেলায় বিএস চূড়ান্ত হয়েছে। ভূমি সুরক্ষা নির্দিষ্ট মৌজায় প্রযোজ্য কার্যকর জরিপ অনুযায়ী মালিকানার গাণিতিক ধারাবাহিকতা নিরীক্ষা করে।',
    a_en: 'Title validation relies on survey lineage, but epochs vary by region: British CS (1888-1940) -> East Pakistan SA (1956-1963) -> Bangladesh RS (1965-1990s depending on district) -> and modern BS / City / BDS surveys. In areas where BS is pending, RS remains the latest operative record-of-rights. BhumiShield verifies continuity against the applicable operative survey for that specific mouza.',
    highlight_bn: 'ঐতিহাসিক ৪-স্তরীয় জরিপ শৃঙ্খল সমন্বয়',
    highlight_en: 'Historical 4-tier survey chain reconciliation',
  },
  {
    id: 'faq-5',
    category: 'mutation',
    q_bn: '৫. সাব-রেজিস্ট্রার কর্তৃক দলিল নিবন্ধনের পর ই-মিউটেশন কীভাবে সম্পন্ন হয়?',
    q_en: '5. How does e-Mutation happen automatically after deed registration?',
    a_bn: 'দলিল নিবন্ধিত ও ডিজিটাল স্বাক্ষরিত হওয়া মাত্রই ব্যাকএন্ড অটোমেশনের মাধ্যমে নামজারি আবেদন তাৎক্ষণিকভাবে সংশ্লিষ্ট এসি ল্যান্ডের ডিজিটাল কিউতে (Queue) প্রেরিত হয়। এসি ল্যান্ড শুনানির পর অনুমোদন দিলে ক্রেতার নামে মিউটেশন ও বিএস খতিয়ান সমন্বয় সৃষ্টি হয় এবং বিক্রেতার সংরক্ষিত অংশ থেকে জমি বিয়োগ হয়।',
    a_en: 'The moment a deed is registered and cryptographically signed, an e-Mutation case is immediately pushed to the AC Land queue. Once approved by the AC Land, the seller’s share is deducted and a new mutated holding is created for the buyer.',
    highlight_bn: 'রেজিস্ট্রি থেকে স্বয়ংক্রিয় এসি ল্যান্ড কিউ স্থানান্তর',
    highlight_en: 'Automated transfer from registry to AC Land queue',
  },
  {
    id: 'faq-6',
    category: 'bank',
    q_bn: '৬. ব্যাংক ও আর্থিক প্রতিষ্ঠান কীভাবে দ্বৈত বন্ধক (Double Mortgage) রোধ করবে?',
    q_en: '6. How do banks and financial institutions prevent double mortgaging?',
    a_bn: 'যে কোনো বাণিজ্যিক ব্যাংক ঋণ মঞ্জুর করার পূর্বে দাগ নম্বরের ওপর রিয়েল-টাইম লিয়েন চেক চালাতে পারে। ঋণ মঞ্জুর হলে সাথে সাথে ডিজিটাল লিয়েন লক রেজিস্ট্রি হয়, যাতে অন্য কোনো ব্যাংক বা সাব-রেজিস্ট্রি উক্ত দাগের হস্তান্তর করতে না পারে। ঋণ পরিশোধের পর Ed25519 স্বাক্ষরিত যাচাইযোগ্য ডিজিটাল NOC ইস্যু করা হয়।',
    a_en: 'Banks check real-time liens by plot Dag. Upon sanction, an immutable lien lock is stamped on the plot ledger, barring duplicate mortgages at other lenders. When repaid, a cryptographic verifiable Digital NOC is released.',
    highlight_bn: 'ডিজিটাল লিয়েন ও অপরিবর্তনীয় ডিজিটাল NOC',
    highlight_en: 'Digital lien lock and cryptographic verifiable NOC',
  },
  {
    id: 'faq-7',
    category: 'buyer_seller',
    q_bn: '৭. ওয়ারিশ সূত্রে পাওয়া জমি বিক্রির ক্ষেত্রে কী কী নিয়ম মানতে হবে?',
    q_en: '7. What are the rules for selling inherited land?',
    a_bn: 'ওয়ারিশ সূত্রে পাওয়া জমি বিক্রির পূর্বে সকল বৈধ ওয়ারিশের নাম সংবলিত ওয়ারিশান সনদ এবং তাদের পারস্পরিক আপস-বণ্টননামা দলিল বা যৌথ নামজারি খতিয়ান সম্পন্ন থাকা বাধ্যতামূলক। অন্যথায় কোনো একজন ওয়ারিশ পুরো দাগ বিক্রি করার চেষ্টা করলে ভূমি সুরক্ষা স্বয়ংক্রিয়ভাবে অসম্পূর্ণ অংশ হিসেবে চিহ্নিত করে লেনদেন স্থগিত রাখবে।',
    a_en: 'Prior to selling inherited land, a succession certificate and mutual registered partition deed or joint mutation record must be executed. Otherwise, if an heir attempts to sell beyond their fraction, BhumiShield automatically flags it as excessive and halts the transaction.',
    highlight_bn: 'ফারায়েজ বণ্টন ও বণ্টননামা নিবন্ধন',
    highlight_en: 'Faraez share audit and registered partition deed',
  },
  {
    id: 'faq-8',
    category: 'mutation',
    q_bn: '৮. অনলাইনে জমির খতিয়ান ও পরচা তুলতে মোট কত টাকা ফি লাগে?',
    q_en: '8. How much is the total fee for obtaining land porcha online?',
    a_bn: 'ভূমি মন্ত্রণালয়ের পরিপত্র অনুযায়ী অনলাইন পরচার সাধারণ কোর্ট ফি ও ডিজিটাল ডেলিভারি চার্জ সর্বমোট ১০০ টাকা। সার্টিফাইড কপির ডাকযোগে পেতে অতিরিক্ত ডাকমাশুল প্রযোজ্য হতে পারে। কোনো তৃতীয় পক্ষ বা দালালের কাছে অতিরিক্ত টাকা দেওয়ার প্রয়োজন নেই।',
    a_en: 'Per the Ministry of Land circular, the statutory fee for an online digital porcha is 100 BDT in total. For certified physical copies via postal dispatch, standard postage charges apply. No middleman payment is required.',
    highlight_bn: 'সর্বমোট ১০০ টাকা মাত্র',
    highlight_en: '100 BDT only statutory fee',
  },
];

export const HelpFaqSection: React.FC = () => {
  const { t, lang } = useAppUI();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, boolean>>({});

  const categories = [
    { id: 'all', label_bn: 'সকল সাধারণ জিজ্ঞাসা', label_en: 'All Questions', icon: HelpCircle },
    { id: 'buyer_seller', label_bn: 'জমি কেনাবেচা ও যাচাই', label_en: 'Buying & Verification', icon: ShieldCheck },
    { id: 'security', label_bn: 'নিরাপত্তা ও বিক্রয় লক', label_en: 'Security & Sale Lock', icon: Sparkles },
    { id: 'mutation', label_bn: 'ই-নামজারি ও রেজিস্ট্রি', label_en: 'Mutation & Registry', icon: FileText },
    { id: 'khatian', label_bn: 'খতিয়ান ও জরিপ শৃঙ্খল', label_en: 'Khatian & Survey Lineage', icon: BookOpen },
    { id: 'bank', label_bn: 'ব্যাংক মর্টগেজ ও লিয়েন', label_en: 'Bank Liens & NOC', icon: CreditCard },
  ];

  const filteredFaqs = FAQS_DATA.filter((faq) => {
    if (activeCategory !== 'all' && faq.category !== activeCategory) {
      return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      faq.q_bn.toLowerCase().includes(q) ||
      faq.q_en.toLowerCase().includes(q) ||
      faq.a_bn.toLowerCase().includes(q) ||
      faq.a_en.toLowerCase().includes(q) ||
      (faq.highlight_bn && faq.highlight_bn.toLowerCase().includes(q))
    );
  });

  const handleFeedback = (faqId: string) => {
    setFeedbackGiven((prev) => ({ ...prev, [faqId]: true }));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Search and Category Filter Toolbar */}
      <Card className="border-slate-200/90 shadow-2xs">
        <CardContent className="p-4 sm:p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t(
                  'প্রশ্ন, বিষয় বা কী-ওয়ার্ড লিখে খুঁজুন (উদা: নামজারি, বিক্রয় লক)...',
                  'Search questions by keyword (e.g. mutation, sale lock)...'
                )}
                className="pl-10 pr-9 h-11 text-xs sm:text-sm rounded-xl border-slate-200 focus-visible:ring-[#006A4E]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-slate-500 font-medium">
              <span>{t('মোট প্রশ্ন:', 'Total Questions:')}</span>
              <Badge variant="secondary" className="font-mono font-bold bg-slate-100 text-slate-700">
                {filteredFaqs.length}
              </Badge>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#006A4E] text-white shadow-2xs'
                      : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span>{lang === 'bn' ? cat.label_bn : cat.label_en}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Accordion FAQ List */}
      {filteredFaqs.length === 0 ? (
        <Card className="border-dashed border-slate-200 bg-slate-50/50">
          <CardContent className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <HelpCircle className="size-10 text-slate-400" />
            <div className="text-sm font-bold text-slate-700">
              {t('কোনো উত্তর পাওয়া যায়নি', 'No matching questions found')}
            </div>
            <p className="text-xs text-slate-500 max-w-sm">
              {t(
                'আপনার অনুসন্ধানের সাথে মিলে এমন কোনো সাধারণ জিজ্ঞাসা পাওয়া যায়নি। অনুগ্রহ করে ভিন্ন শব্দ দিয়ে চেষ্টা করুন অথবা হটলাইন ১৬১২২ এ যোগাযোগ করুন।',
                'Try searching with different terms or call Ministry hotline 16122 for direct assistance.'
              )}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setActiveCategory('all');
              }}
              className="mt-2 text-xs"
            >
              {t('অনুসন্ধান রিসেট করুন', 'Reset Search')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible defaultValue="faq-1" className="w-full flex flex-col gap-3">
          {filteredFaqs.map((faq) => {
            const isFeedback = feedbackGiven[faq.id];
            return (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="border border-slate-200/90 rounded-2xl bg-white px-5 shadow-2xs transition-all data-[state=open]:border-[#006A4E]/40 data-[state=open]:shadow-xs"
              >
                <AccordionTrigger className="text-left font-bold text-sm sm:text-base text-slate-800 hover:text-[#006A4E] py-4 cursor-pointer hover:no-underline">
                  <div className="flex items-start gap-3 pr-2">
                    <span className="text-[#006A4E] font-black shrink-0 text-base">Q.</span>
                    <span className="leading-snug">{lang === 'bn' ? faq.q_bn : faq.q_en}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-5 text-xs sm:text-sm text-slate-700 leading-relaxed border-t border-slate-100 flex flex-col gap-3.5">
                  <p>{lang === 'bn' ? faq.a_bn : faq.a_en}</p>

                  {faq.highlight_bn && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-xs font-semibold text-emerald-900">
                      <Sparkles className="size-3.5 text-[#006A4E] shrink-0" />
                      <span>{t('মূল পয়েন্ট:', 'Key Takeaway:')}</span>
                      <span className="font-bold">{lang === 'bn' ? faq.highlight_bn : faq.highlight_en}</span>
                    </div>
                  )}

                  {/* Feedback interaction */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <span>{t('উত্তরটি কি আপনার সহায়তায় এসেছে?', 'Was this answer helpful?')}</span>
                    {isFeedback ? (
                      <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[11px]">
                        ✓ {t('মতামতের জন্য ধন্যবাদ!', 'Thank you for your feedback!')}
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback(faq.id)}
                        className="h-7 px-2 text-xs text-slate-600 hover:text-[#006A4E] hover:bg-emerald-50 gap-1.5 cursor-pointer"
                      >
                        <ThumbsUp className="size-3" />
                        <span>{t('হ্যাঁ, সাহায্য পেয়েছি', 'Yes, helpful')}</span>
                      </Button>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
};
