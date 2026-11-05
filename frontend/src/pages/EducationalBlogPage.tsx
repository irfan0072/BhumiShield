import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import {
  BookOpen,
  Search,
  Clock,
  User,
  ThumbsUp,
  Tag,
  Share2,
  Calendar,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Volume2,
  VolumeX,
  Square,
  Users,
  Sparkles,
  Scale,
  ArrowRight,
  FileText,
  RotateCcw,
  SlidersHorizontal,
  Check
} from 'lucide-react';
import { useBlogPosts } from '../components/publicHooks';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface BlogPost {
  id: number;
  post_slug: string;
  category_slug: string;
  category_name_bn: string;
  category_name_en: string;
  title_bn: string;
  title_en: string;
  body_bn: string;
  body_en: string;
  author_name_bn: string;
  author_name_en: string;
  reading_time_minutes: number;
  helpful_count: number;
  published_at: string;
}

export const EducationalBlogPage: React.FC = () => {
  const { t, lang, formatDate } = useAppUI();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // TanStack Query for Dynamic Blog Posts
  const blogQuery = useBlogPosts(selectedCategory);

  // Reader Modal State
  const [activePost, setActivePost] = useState<BlogPost | null>(null);
  const [hasVotedHelpful, setHasVotedHelpful] = useState<Record<number, boolean>>({});
  const [readerFontSize, setReaderFontSize] = useState<'normal' | 'large' | 'huge'>('normal');

  // Interactive Guides Tabs: 'mutation' | 'faraiz'
  const [activeGuideTab, setActiveGuideTab] = useState<'mutation' | 'faraiz'>('mutation');
  const [activeMutationStep, setActiveMutationStep] = useState(1);

  // Faraiz Inheritance Simulator State
  const [faraizTotalLand, setFaraizTotalLand] = useState(100);
  const [faraizWives, setFaraizWives] = useState(1);
  const [faraizSons, setFaraizSons] = useState(2);
  const [faraizDaughters, setFaraizDaughters] = useState(2);

  // Web Speech API Text-to-Speech State
  const [playingAudioId, setPlayingAudioId] = useState<number | string | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleAudio = (id: number | string, text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert(t('আপনার ব্রাউজারে অডিও স্পিচ সুবিধা সমর্থিত নয়।', 'Text-to-speech is not supported by your browser.'));
      return;
    }

    if (playingAudioId === id) {
      window.speechSynthesis.cancel();
      setPlayingAudioId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
    utterance.rate = 0.95;

    utterance.onend = () => {
      setPlayingAudioId(null);
    };

    utterance.onerror = () => {
      setPlayingAudioId(null);
    };

    setPlayingAudioId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleHelpfulClick = async (post: BlogPost) => {
    if (hasVotedHelpful[post.id]) return;
    try {
      await BhumiApi.markBlogPostHelpful(post.id);
      setHasVotedHelpful((prev) => ({ ...prev, [post.id]: true }));
      post.helpful_count = (post.helpful_count || 0) + 1;
    } catch {
      // Optimistic update fallback
      setHasVotedHelpful((prev) => ({ ...prev, [post.id]: true }));
      post.helpful_count = (post.helpful_count || 0) + 1;
    }
  };

  // Faraiz Islamic Inheritance Calculations
  const calculateFaraiz = () => {
    const total = Number(faraizTotalLand) || 100;
    const wivesCount = Number(faraizWives) || 0;
    const sonsCount = Number(faraizSons) || 0;
    const daughtersCount = Number(faraizDaughters) || 0;

    // Has children? Wife/Wives get 1/8 (12.5%) total. If no children, 1/4 (25%).
    const hasChildren = sonsCount > 0 || daughtersCount > 0;
    const wivesTotalShareFraction = hasChildren ? 0.125 : 0.25;
    const wivesTotalLand = wivesCount > 0 ? total * wivesTotalShareFraction : 0;
    const eachWifeLand = wivesCount > 0 ? wivesTotalLand / wivesCount : 0;

    const remainingForChildren = total - wivesTotalLand;
    const totalChildUnits = sonsCount * 2 + daughtersCount * 1;

    let eachSonLand = 0;
    let eachDaughterLand = 0;

    if (totalChildUnits > 0) {
      const unitValue = remainingForChildren / totalChildUnits;
      eachSonLand = unitValue * 2;
      eachDaughterLand = unitValue * 1;
    }

    return {
      wivesTotalLand: Number(wivesTotalLand.toFixed(2)),
      eachWifeLand: Number(eachWifeLand.toFixed(2)),
      eachSonLand: Number(eachSonLand.toFixed(2)),
      eachDaughterLand: Number(eachDaughterLand.toFixed(2)),
      totalSonsLand: Number((eachSonLand * sonsCount).toFixed(2)),
      totalDaughtersLand: Number((eachDaughterLand * daughtersCount).toFixed(2)),
    };
  };

  const faraizResults = calculateFaraiz();

  const rawPosts: BlogPost[] = blogQuery.data?.items || [];
  const filteredPosts = rawPosts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      (p.title_bn || '').toLowerCase().includes(q) ||
      (p.title_en || '').toLowerCase().includes(q) ||
      (p.body_bn || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 pb-24 relative overflow-hidden">
      {/* Ambient background glow & subtle dot pattern */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent blur-3xl -z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 -z-10 pointer-events-none" />

      {/* Top Banner Header (Linear / Vercel Bento-Grid Style) */}
      <section className="pt-8 sm:pt-12 pb-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 shadow-xs text-xs font-semibold text-[#006A4E]">
            <BookOpen className="w-4 h-4 text-[#006A4E]" />
            <span>{t('ভূমি শিক্ষা ও সচেতনতা', 'Land Literacy & Guides')}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 leading-snug">
            {t('ভূমি সহায়িকা ও ব্লগ', 'Land Guide & Blog')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
            {t(
              'ভূমি আইন, ই-নামজারি ও ফারায়েজ সংক্রান্ত প্রয়োজনীয় তথ্য ও সহায়িকা।',
              'Plain-language legal guidelines, inheritance calculation, and e-mutation guidance.'
            )}
          </p>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 space-y-8">
        {/* INTERACTIVE TOOLS SECTION */}
        <Card className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <Badge className="bg-emerald-100 text-[#006A4E] border-emerald-300 font-bold">
                {t('সহায়ক টুলস', 'Citizen Tools')}
              </Badge>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                {activeGuideTab === 'mutation'
                  ? t('ই-নামজারি নির্দেশিকা', 'e-Mutation Guide')
                  : t('ফারায়েজ সম্পত্তি বণ্টন সিমুলেটর', 'Faraiz Inheritance Share Simulator')}
              </h2>
            </div>

            <Tabs
              value={activeGuideTab}
              onValueChange={(val) => setActiveGuideTab(val as 'mutation' | 'faraiz')}
              className="w-auto"
            >
              <TabsList className="bg-slate-100 p-1 rounded-xl border border-slate-200">
                <TabsTrigger
                  value="mutation"
                  className="text-xs font-bold px-3 py-1.5 rounded-lg data-[state=active]:bg-[#006A4E] data-[state=active]:text-white transition cursor-pointer"
                >
                  {t('ই-নামজারি', 'e-Mutation')}
                </TabsTrigger>
                <TabsTrigger
                  value="faraiz"
                  className="text-xs font-bold px-3 py-1.5 rounded-lg data-[state=active]:bg-[#006A4E] data-[state=active]:text-white transition cursor-pointer"
                >
                  {t('ফারায়েজ', 'Faraiz')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* TAB 1: e-Mutation 4-Step Interactive Guide */}
          {activeGuideTab === 'mutation' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { step: 1, title: '১. অনলাইন আবেদন', sub: 'দলিল ও খতিয়ান দাখিল' },
                  { step: 2, title: '২. সহকারী কমিশনার (ভূমি)', sub: 'আবেদন যাচাই ও প্রস্তাব' },
                  { step: 3, title: '৩. শুনানি ও নোটিশ', sub: 'অনলাইনে আপত্তি দাখিল' },
                  { step: 4, title: '৪. ডিসিআর ও নতুন খতিয়ান', sub: 'সরকারি ফি ও পর্চা' },
                ].map((item) => (
                  <Button
                    key={item.step}
                    type="button"
                    variant="outline"
                    onClick={() => setActiveMutationStep(item.step)}
                    className={`h-auto p-3 rounded-xl border-2 text-left justify-start transition cursor-pointer flex-col items-start space-y-1 ${
                      activeMutationStep === item.step
                        ? 'bg-emerald-50/80 border-[#006A4E] shadow-xs hover:bg-emerald-100/80'
                        : 'bg-white border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="text-xs font-black text-[#006A4E]">{item.title}</div>
                    <div className="text-[11px] text-slate-500 font-medium whitespace-normal">{item.sub}</div>
                  </Button>
                ))}
              </div>

              {/* Step Details Box */}
              <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                {activeMutationStep === 1 && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-900 text-sm">
                      {t('ধাপ ১: অনলাইনে নামজারি আবেদন পেশ', 'Step 1: Filing e-Mutation Application Online')}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'দলিল রেজিস্ট্রির পর সাব-রেজিস্ট্রার কর্তৃক প্রেরিত অটোমেশন থেকে অথবা নাগরিক নিজে নামজারি আবেদন করতে পারেন। প্রয়োজনীয় কাগজপত্র: মূল দলিলের কপি, পূর্ববর্তী খতিয়ানের অনুলিপি এবং জাতীয় পরিচয়পত্র। আবেদনের সরকারি ফি ২০ টাকা।',
                        'Submit deed copy, prior khatian, and NID. Official application fee is 20 BDT.'
                      )}
                    </p>
                  </div>
                )}
                {activeMutationStep === 2 && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-900 text-sm">
                      {t('ধাপ ২: সহকারী কমিশনার (ভূমি) কর্তৃক যাচাই ও প্রস্তাব', 'Step 2: Land Office Scrutiny & Field Report')}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'ইউনিয়ন ভূমি সহকারী কর্মকর্তা (নায়েব) সরেজমিনে দখল ও রেকর্ড যাচাই করে প্রতিবেদন প্রদান করেন। জমিতে কোনো সরকারি খাস জমি বা লিয়েন আছে কি না তা সিস্টেমে নিশ্চিত করা হয়।',
                        'Union Land Assistant Officer conducts field inquiry to verify physical possession and boundaries.'
                      )}
                    </p>
                  </div>
                )}
                {activeMutationStep === 3 && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-900 text-sm">
                      {t('ধাপ ৩: শুনানি ও পক্ষগণের নোটিশ জারি', 'Step 3: Hearing & Notice Issuance')}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'অন্যান্য ওয়ারিশ বা সংশ্লিষ্ট পক্ষগণের প্রতি নোটিশ জারি করা হয় (নোটিশ ফি ৫০ টাকা)। শুনানির নির্ধারিত দিনে সহকারী কমিশনার (ভূমি) উভয় পক্ষের বক্তব্য ও কাগজপত্র পর্যালোচনা করেন।',
                        'Notices issued to co-sharers (Fee: 50 BDT). AC Land presides over judicial hearing.'
                      )}
                    </p>
                  </div>
                )}
                {activeMutationStep === 4 && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-900 text-sm">
                      {t('ধাপ ৪: চূড়ান্ত নামজারি অনুমোদন, ডিসিআর ও খতিয়ান সংগ্রহ', 'Step 4: Approval, DCR & BS Khatian')}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'সহকারী কমিশনার (ভূমি) নামজারি অনুমোদন দিলে রেকর্ড সংশোধন ফি (১,০০০ টাকা) ও খতিয়ান সরবরাহ ফি (১০০ টাকা) পরিশোধের পর Form No. 1077 ডিসিআর ও কিউআর সিলযুক্ত আধুনিক বিএস খতিয়ান ডাউনলোড করা যায়। সর্বমোট সরকারি খরচ ১,১৭০ টাকা।',
                        'Upon approval, pay 1,100 BDT to collect Form 1077 DCR and new Khatian. Total statutory cost is exactly 1,170 BDT.'
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Faraiz Inheritance Simulator */}
          {activeGuideTab === 'faraiz' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">{t('মোট জমি (শতক)', 'Total Land (Decimals)')}</label>
                  <Input
                    type="number"
                    value={faraizTotalLand}
                    onChange={(e) => setFaraizTotalLand(Number(e.target.value) || 0)}
                    className="h-10 text-sm font-bold border-slate-300 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">{t('স্ত্রী সংখ্যা', 'Number of Wives')}</label>
                  <Input
                    type="number"
                    min="0"
                    max="4"
                    value={faraizWives}
                    onChange={(e) => setFaraizWives(Number(e.target.value) || 0)}
                    className="h-10 text-sm font-bold border-slate-300 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">{t('পুত্র সংখ্যা', 'Number of Sons')}</label>
                  <Input
                    type="number"
                    min="0"
                    value={faraizSons}
                    onChange={(e) => setFaraizSons(Number(e.target.value) || 0)}
                    className="h-10 text-sm font-bold border-slate-300 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">{t('কন্যা সংখ্যা', 'Number of Daughters')}</label>
                  <Input
                    type="number"
                    min="0"
                    value={faraizDaughters}
                    onChange={(e) => setFaraizDaughters(Number(e.target.value) || 0)}
                    className="h-10 text-sm font-bold border-slate-300 font-mono"
                  />
                </div>
              </div>

              {/* Faraiz Distribution Outcome Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-1">
                  <span className="text-xs font-semibold text-purple-900 block">{t('স্ত্রীর মোট অংশ (১/৮)', 'Wife/Wives Share (1/8)')}</span>
                  <div className="text-xl font-black text-purple-900 font-mono">
                    {toBanglaDigits(faraizResults.wivesTotalLand)} {t('শতক', 'Dec')}
                  </div>
                  <span className="text-[11px] text-purple-700">
                    {faraizWives > 1 ? `${toBanglaDigits(faraizResults.eachWifeLand)} শতক প্রতি স্ত্রী` : 'সম্পূর্ণ অংশ'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
                  <span className="text-xs font-semibold text-blue-900 block">{t('প্রত্যেক পুত্রের অংশ (২ গুণ)', 'Each Son’s Share (2x)')}</span>
                  <div className="text-xl font-black text-blue-900 font-mono">
                    {toBanglaDigits(faraizResults.eachSonLand)} {t('শতক', 'Dec')}
                  </div>
                  <span className="text-[11px] text-blue-700">
                    {t(`মোট পুত্রদের অংশ: ${toBanglaDigits(faraizResults.totalSonsLand)} শতক`, `Total sons: ${faraizResults.totalSonsLand} dec`)}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <span className="text-xs font-semibold text-emerald-900 block">{t('প্রত্যেক কন্যার অংশ (১ গুণ)', 'Each Daughter’s Share (1x)')}</span>
                  <div className="text-xl font-black text-emerald-900 font-mono">
                    {toBanglaDigits(faraizResults.eachDaughterLand)} {t('শতক', 'Dec')}
                  </div>
                  <span className="text-[11px] text-emerald-700">
                    {t(`মোট কন্যাদের অংশ: ${toBanglaDigits(faraizResults.totalDaughtersLand)} শতক`, `Total daughters: ${faraizResults.totalDaughtersLand} dec`)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* ARTICLES SECTION */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              {t('সকল প্রকাশিত নিবন্ধ ও গাইডসমূহ', 'Published Articles & Legal Guides')}
            </h2>

            <div className="w-full sm:w-64">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('নিবন্ধ অনুসন্ধান...', 'Search articles...')}
                className="h-9 text-xs border-slate-300"
              />
            </div>
          </div>

          {/* Category Filter Tabs */}
          <Tabs
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            className="w-full"
          >
            <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0 justify-start">
              {[
                { id: 'ALL', label_bn: 'সকল বিষয়', label_en: 'All Topics' },
                { id: 'inheritance', label_bn: 'ফারায়েজ ও উত্তরাধিকার', label_en: 'Inheritance' },
                { id: 'safety', label_bn: 'জমি ক্রয়ে সতর্কতা', label_en: 'Safety' },
                { id: 'laws', label_bn: 'আইন ও প্রজ্ঞাপন', label_en: 'Laws' },
                { id: 'mutation', label_bn: 'ই-নামজারি সহায়িকা', label_en: 'Mutation' },
              ].map((cat) => (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="h-8 px-3.5 text-xs rounded-full font-bold transition cursor-pointer data-[state=active]:bg-[#006A4E] data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:border data-[state=inactive]:border-slate-200 data-[state=inactive]:text-slate-700 hover:border-[#006A4E]"
                >
                  {lang === 'bn' ? cat.label_bn : cat.label_en}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* 4-State Articles Grid */}
          {blogQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3">
                  <Skeleton className="h-5 w-24 bg-slate-200" />
                  <Skeleton className="h-6 w-3/4 bg-slate-200" />
                  <Skeleton className="h-16 w-full bg-slate-200" />
                </Card>
              ))}
            </div>
          ) : blogQuery.isError ? (
            <div className="p-8 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
              <h3 className="text-base font-bold text-rose-900">
                {t('নিবন্ধ তালিকা লোড করতে সমস্যা হয়েছে', 'Failed to load blog articles')}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => blogQuery.refetch()}
                className="border-rose-300 text-rose-800 hover:bg-rose-100 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                <span>{t('পুনরায় চেষ্টা করুন', 'Retry')}</span>
              </Button>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-lg font-bold text-slate-800">
                {t('কোনো নিবন্ধ পাওয়া যায়নি', 'No articles found')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('অনুগ্রহ করে অন্য ক্যাটাগরি বা অনুসন্ধান শব্দ ব্যবহার করুন।', 'Please try searching with different terms or selecting another category.')}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategory('ALL');
                  setSearchQuery('');
                }}
                className="cursor-pointer"
              >
                {t('সকল নিবন্ধ দেখুন', 'View All Articles')}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredPosts.map((post) => (
                <Card
                  key={post.id}
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-[#006A4E]/50 hover:shadow-md transition p-6 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge className="bg-emerald-50 text-[#006A4E] border border-emerald-200 text-[10px] font-bold">
                        {lang === 'bn' ? post.category_name_bn : post.category_name_en}
                      </Badge>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{toBanglaDigits(post.reading_time_minutes || 5)} {t('মিনিট পাঠ', 'min read')}</span>
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 leading-snug">
                      {lang === 'bn' ? post.title_bn : post.title_en}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {lang === 'bn' ? post.body_bn : post.body_en}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500 font-semibold">
                      {lang === 'bn' ? post.author_name_bn : post.author_name_en}
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Audio Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleToggleAudio(
                            post.id,
                            `${lang === 'bn' ? post.title_bn : post.title_en}। ${lang === 'bn' ? post.body_bn : post.body_en}`
                          )
                        }
                        className={`h-8 px-2.5 text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                          playingAudioId === post.id
                            ? 'bg-[#006A4E] text-white border-[#006A4E]'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {playingAudioId === post.id ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5" />
                            <span>{t('বন্ধ করুন', 'Stop')}</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>{t('অডিও', 'Audio')}</span>
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => setActivePost(post)}
                        className="h-8 px-3 text-xs font-bold bg-[#006A4E] hover:bg-[#00553e] text-white cursor-pointer flex items-center gap-1"
                      >
                        <span>{t('সম্পূর্ণ পড়ুন', 'Read Full')}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ARTICLE READER MODAL */}
      <Dialog open={Boolean(activePost)} onOpenChange={(open) => !open && setActivePost(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 border border-slate-200 rounded-3xl bg-white space-y-5">
          {activePost && (
            <>
              <DialogHeader className="border-b border-slate-100 pb-4 text-left space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge className="bg-emerald-100 text-[#006A4E] border-emerald-300 font-bold text-xs">
                    {lang === 'bn' ? activePost.category_name_bn : activePost.category_name_en}
                  </Badge>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{toBanglaDigits(activePost.reading_time_minutes || 5)} {t('মিনিট পাঠ', 'min read')}</span>
                  </span>
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                  {lang === 'bn' ? activePost.title_bn : activePost.title_en}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {t('লেখক / উৎস:', 'Author:')} {lang === 'bn' ? activePost.author_name_bn : activePost.author_name_en}
                </DialogDescription>
              </DialogHeader>

              {/* Reader Toolbar: TTS + Font Zoom */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                {/* TTS Reader */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={playingAudioId === activePost.id ? 'destructive' : 'default'}
                    onClick={() =>
                      handleToggleAudio(
                        activePost.id,
                        `${lang === 'bn' ? activePost.title_bn : activePost.title_en}। ${lang === 'bn' ? activePost.body_bn : activePost.body_en}`
                      )
                    }
                    className="h-8 px-3 text-xs font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    {playingAudioId === activePost.id ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>{t('অডিও থামান', 'Stop Audio')}</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{t('অডিও শুনুন', 'Listen Audio')}</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Font Size Selector */}
                <div className="flex items-center gap-1 text-slate-600">
                  <span className="text-[11px] font-medium mr-1">{t('ফন্ট সাইজ:', 'Text size:')}</span>
                  {(['normal', 'large', 'huge'] as const).map((sz) => (
                    <Button
                      key={sz}
                      type="button"
                      variant={readerFontSize === sz ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setReaderFontSize(sz)}
                      className={`h-6 px-2 text-xs font-bold transition cursor-pointer ${
                        readerFontSize === sz
                          ? 'bg-[#006A4E] text-white hover:bg-[#00523C]'
                          : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      {sz === 'normal' ? 'ক' : sz === 'large' ? 'ক+' : 'ক++'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Full Article Content */}
              <div
                className={`text-slate-800 leading-relaxed space-y-4 whitespace-pre-wrap bg-white p-2 ${
                  readerFontSize === 'normal'
                    ? 'text-sm'
                    : readerFontSize === 'large'
                    ? 'text-base'
                    : 'text-lg'
                }`}
              >
                {lang === 'bn' ? activePost.body_bn : activePost.body_en}
              </div>

              {/* Reader Footer: Helpful Vote */}
              <DialogFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleHelpfulClick(activePost)}
                  className={`text-xs font-bold cursor-pointer flex items-center gap-1.5 ${
                    hasVotedHelpful[activePost.id]
                      ? 'bg-emerald-50 text-[#006A4E] border-emerald-300'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>
                    {hasVotedHelpful[activePost.id]
                      ? t('✓ ধন্যবাদ! মতামত গৃহীত হয়েছে', '✓ Thank you for voting!')
                      : t('উপকারী লেগেছে', 'Helpful')}
                  </span>
                  <span className="ml-1 text-slate-400 font-mono">
                    ({toBanglaDigits(activePost.helpful_count || 0)})
                  </span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setActivePost(null)}
                  className="cursor-pointer text-xs"
                >
                  {t('বন্ধ করুন', 'Close')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
