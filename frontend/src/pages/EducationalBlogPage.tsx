import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
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
  CheckCircle,
  HelpCircle,
  X,
  Volume2,
  VolumeX,
  Square,
  Users,
  Sparkles,
  Scale,
  ArrowRight,
  FileText
} from 'lucide-react';

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

interface Category {
  id: number;
  slug: string;
  name_bn: string;
  name_en: string;
}

export const EducationalBlogPage: React.FC = () => {
  const { t, lang, formatDate, formatNumber } = useAppUI();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Reader Modal
  const [activePost, setActivePost] = useState<BlogPost | null>(null);
  const [hasVotedHelpful, setHasVotedHelpful] = useState<Record<number, boolean>>({});

  // Interactive Guides State: 'mutation' | 'faraiz'
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

    utterance.onend = () => setPlayingAudioId(null);
    utterance.onerror = () => setPlayingAudioId(null);

    setPlayingAudioId(id);
    window.speechSynthesis.speak(utterance);
  };

  const fetchBlog = () => {
    setLoading(true);
    const params: any = {};
    if (selectedCategory) params.category = selectedCategory;
    if (searchQuery) params.q = searchQuery;

    BhumiApi.listBlogPosts(params)
      .then((res) => {
        setPosts(res.items || []);
        if (res.categories && res.categories.length > 0) {
          setCategories(res.categories);
        }
      })
      .catch((err) => {
        console.error('Failed to load blog posts', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBlog();
  }, [selectedCategory]);

  useEffect(() => {
    if (!activePost) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePost(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePost]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBlog();
  };

  const handleHelpfulClick = (postId: number, slug: string) => {
    if (hasVotedHelpful[postId]) return;

    BhumiApi.markBlogPostHelpful(slug || postId)
      .then((res) => {
        setHasVotedHelpful((prev) => ({ ...prev, [postId]: true }));
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, helpful_count: res.helpful_count } : p))
        );
        if (activePost && activePost.id === postId) {
          setActivePost({ ...activePost, helpful_count: res.helpful_count });
        }
      })
      .catch((err) => {
        console.error('Failed to mark helpful', err);
      });
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Banner */}
        <div className="bg-[#006A4E] text-white rounded-2xl p-6 sm:p-8 shadow-sm space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/60 border border-emerald-600/40 text-emerald-100 text-xs font-semibold">
            <BookOpen className="w-4 h-4 text-emerald-300" />
            <span>{t('নাগরিক ভূমি সাক্ষরতা ও জ্ঞানকোষ', 'Citizen Land Literacy & Guide')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t('ভূমি অধিকার, আইন ও সুরক্ষা সহায়িকা', 'Land Rights, Legal Rules & Protection Guide')}
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base max-w-3xl leading-relaxed">
            {t(
              'জমি ক্রয়-বিক্রয়ের সতর্কতা, খতিয়ানের ইতিহাস মেলানো, ফারায়েজ অনুযায়ী ওয়ারিশি নামজারি এবং ব্যাংকের ডিজিটাল এনওসি সংক্রান্ত আইনি বিশ্লেষণ ও দিকনির্দেশনা। সাধারণ নাগরিককে প্রতারণামুক্ত রাখার সহজ পথপ্রদর্শক।',
              'Practical guides, fraud prevention checklists, inheritance calculation steps, and survey lineage breakdown written by land officers and legal experts for everyday citizens.'
            )}
          </p>
        </div>

        {/* Interactive Citizen Guides: E-Mutation Process & Faraiz Inheritance */}
        <div className="panel p-6 space-y-5 bg-white border border-slate-200 shadow-sm rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-black text-[#074f38] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#006A4E]" />
                <span>{t('ইন্টারেক্টিভ নির্দেশিকা ও সিমুলেটর', 'Interactive Guides & Simulators')}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('আইনি জটিলতা দূর করে নাগরিকদের জন্য সহজ বোধগম্য নির্দেশিকা', 'Plain-language legal workflows & calculators for citizens')}
              </p>
            </div>

            {/* Guide Switcher Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveGuideTab('mutation')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeGuideTab === 'mutation'
                    ? 'bg-white text-[#006A4E] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🏛️ {t('ই-নামজারি প্রক্রিয়া ফ্লো', 'E-Mutation Flow')}
              </button>
              <button
                type="button"
                onClick={() => setActiveGuideTab('faraiz')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeGuideTab === 'faraiz'
                    ? 'bg-white text-[#006A4E] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⚖️ {t('ফারায়েজ বণ্টন ক্যালকুলেটর', 'Faraiz Simulator')}
              </button>
            </div>
          </div>

          {/* TAB 1: E-Mutation Workflow Stepper */}
          {activeGuideTab === 'mutation' && (
            <div className="space-y-5 animate-rise">
              {/* Stepper Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {[
                  { step: 1, title: '১. আবেদন', sub: 'দিন ১' },
                  { step: 2, title: '২. প্রতিবেদন', sub: 'দিন ২-৭' },
                  { step: 3, title: '৩. সার্ভেয়ার', sub: 'দিন ৮-১২' },
                  { step: 4, title: '৪. শুনানি', sub: 'দিন ১৩-১৮' },
                  { step: 5, title: '৫. ডিসিআর ফি', sub: 'দিন ১৯-২১' },
                  { step: 6, title: '৬. খতিয়ান জারি', sub: 'দিন ২২-২৮' },
                ].map((s) => (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => setActiveMutationStep(s.step)}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      activeMutationStep === s.step
                        ? 'bg-[#006A4E] text-white border-[#006A4E] shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-bold block">{s.title}</span>
                    <span className={`text-[10px] block ${activeMutationStep === s.step ? 'text-emerald-100' : 'text-slate-500'}`}>
                      {s.sub}
                    </span>
                  </button>
                ))}
              </div>

              {/* Step Detail Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200 text-xs sm:text-sm text-slate-800 space-y-3">
                {activeMutationStep === 1 && (
                  <>
                    <h3 className="font-extrabold text-[#006A4E] text-sm sm:text-base">
                      {t('ধাপ ১: অনলাইনে নামজারি আবেদন দাখিল', 'Step 1: Online Application Submission')}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {t(
                        'নাগরিক তার রেজিস্ট্রিকৃত সাফ-কবলা দলিল বা ওয়ারিশ সনদ, পূর্ববর্তী খতিয়ান ও এনআইডি কপি নিয়ে mutation.gov.bd পোর্টালে অথবা ইউনিয়ন ডিজিটাল সেন্টারে আবেদন করবেন। আবেদনের সাথে সরকারি কোর্ট ফি ২০ টাকা ও নোটিশ জারি ফি ৫০ টাকা (মোট ৭০ টাকা) মোবাইল ব্যাংকিংয়ে জমা দিতে হয়।',
                        'Submit deed copy, khatian lineage, and NID at mutation.gov.bd. Initial statutory filing fee is BDT 70 paid via MFS.'
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs pt-1">
                      <span className="chip bg-white border border-emerald-200 font-semibold text-[#006A4E]">
                        ✓ {t('প্রয়োজনীয়: মূল দলিল, পূর্ববর্তী খতিয়ান, NID', 'Docs: Deed, Khatian, NID')}
                      </span>
                      <span className="chip bg-white border border-emerald-200 font-semibold text-slate-700">
                        ⏱ {t('সময়সীমা: তাৎক্ষণিক ট্র্যাকিং ট্র্যাকিং নম্বর প্রদান', 'Timeline: Instant Tracking ID')}
                      </span>
                    </div>
                  </>
                )}

                {activeMutationStep === 2 && (
                  <>
                    <h3 className="font-extrabold text-[#006A4E] text-sm sm:text-base">
                      {t('ধাপ ২: ইউনিয়ন ভূমি উপ-সহকারীর সরেজমিন তদন্ত', 'Step 2: Union Land Assistant Officer (ULAO) Verification')}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {t(
                        'সংশ্লিষ্ট ইউনিয়ন ভূমি সহকারী কর্মকর্তা সরেজমিনে গিয়ে এবং ইউনিয়ন রেজিস্টার-২ পরীক্ষা করে জমির দখলদারিত্ব ও সর্বশেষ ভূ-রাজস্ব পরিশোধের সত্যতা যাচাই করবেন এবং অনলাইন পোর্টালে প্রতিবেদন পাঠাবেন।',
                        'The local land assistant inspects physical possession, checks Register-2 records, and uploads a statutory verification report.'
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs pt-1">
                      <span className="chip bg-white border border-emerald-200 font-semibold text-[#006A4E]">
                        ✓ {t('প্রয়োজনীয়: সরেজমিন দখল ও দাখিলা রেকর্ড', 'Verification: Physical possession & tax dakhila')}
                      </span>
                      <span className="chip bg-white border border-emerald-200 font-semibold text-slate-700">
                        ⏱ {t('সময়সীমা: সর্বোচ্চ ৭ কার্যদিবস', 'Timeline: Max 7 working days')}
                      </span>
                    </div>
                  </>
                )}

                {activeMutationStep === 3 && (
                  <>
                    <h3 className="font-extrabold text-[#006A4E] text-sm sm:text-base">
                      {t('ধাপ ৩: সার্ভেয়ার সীমানা প্রতিবেদন (প্রযোজ্য ক্ষেত্রে)', 'Step 3: Surveyor Demarcation & Area Report')}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {t(
                        'জমির দাগ বা অংশে কোনো সীমানা বিরোধ বা অতিরিক্ত জমার দাবি থাকলে সার্ভেয়ার নকশা পরিমাপ করে দাগের অবশিষ্টাংশের সঠিকতা নির্ণয় করেন।',
                        'In cases of boundary ambiguity or plot sub-division, surveyor generates cadastral demarcation report.'
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs pt-1">
                      <span className="chip bg-white border border-emerald-200 font-semibold text-[#006A4E]">
                        ✓ {t('যাচাই: মৌজা নকশা ও দাগের সীমানা', 'Audit: Cadastral Map Plot Demarcation')}
                      </span>
                      <span className="chip bg-white border border-emerald-200 font-semibold text-slate-700">
                        ⏱ {t('সময়সীমা: ৪-৫ কার্যদিবস', 'Timeline: 4-5 working days')}
                      </span>
                    </div>
                  </>
                )}

                {activeMutationStep === 4 && (
                  <>
                    <h3 className="font-extrabold text-[#006A4E] text-sm sm:text-base">
                      {t('ধাপ ৪: এসি ল্যান্ড শুনানি ও আপত্তি নিষ্পত্তি', 'Step 4: AC Land Hearing & Objection Resolution')}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {t(
                        'সহকারী কমিশনার (ভূমি) পক্ষগণকে শুনানিতে ডাকেন। কোনো পক্ষ থেকে আপত্তি থাকলে তা লিখিতভাবে গ্রহণ ও নিষ্পত্তি করা হয়। কোনো বিরোধ না থাকলে নামজারি অনুমোদন আদেশ জারি হয়।',
                        'AC Land conducts a formal hearing. If no legitimate adverse claim exists, mutation approval order is issued.'
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs pt-1">
                      <span className="chip bg-white border border-emerald-200 font-semibold text-[#006A4E]">
                        ✓ {t('প্রয়োজনীয়: মূল দলিলের কপি ও এনআইডি', 'Bring: Original deed & photo ID')}
                      </span>
                      <span className="chip bg-white border border-emerald-200 font-semibold text-slate-700">
                        ⏱ {t('সময়সীমা: ৫-৬ কার্যদিবস', 'Timeline: 5-6 working days')}
                      </span>
                    </div>
                  </>
                )}

                {activeMutationStep === 5 && (
                  <>
                    <h3 className="font-extrabold text-[#006A4E] text-sm sm:text-base">
                      {t('ধাপ ৫: সরকারি ডিসিআর ও খতিয়ান ফি প্রদান', 'Step 5: DCR & Khatian Statutory Fee Payment')}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {t(
                        'অনুমোদনের পর নাগরিকের মোবাইলে এসএমএস যাবে। সরকারি ডিসিআর ফি ১,০০০ টাকা ও খতিয়ান ফি ১০০ টাকা (সর্বমোট ১,১০০ টাকা + ভ্যাট/চার্জ = ১,১৭০ টাকা) মোবাইল ব্যাংকিংয়ে পরিশোধ করতে হয়। কোনো অতিরিক্ত টাকা কাউকে দিতে হয় না।',
                        'Citizen pays official DCR fee (BDT 1,000) and khatian issuance fee (BDT 100) via MFS. Total fixed cost BDT 1,170.'
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs pt-1">
                      <span className="chip bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
                        💰 {t('নির্দিষ্ট সরকারি ফি: ১,১৭০ টাকা', 'Statutory Fee: BDT 1,170 only')}
                      </span>
                      <span className="chip bg-white border border-emerald-200 font-semibold text-slate-700">
                        ⏱ {t('সময়সীমা: এসএমএস পাওয়ার ২ দিনের মধ্যে', 'Timeline: Within 2 days of SMS')}
                      </span>
                    </div>
                  </>
                )}

                {activeMutationStep === 6 && (
                  <>
                    <h3 className="font-extrabold text-[#006A4E] text-sm sm:text-base">
                      {t('ধাপ ৬: অনুমোদিত ডিজিটাল কিউআর খতিয়ান ও ডিসিআর ডাউনলোড', 'Step 6: QR-Verified Digital Khatian & DCR Issuance')}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {t(
                        'ফি পরিশোধের সাথে সাথে সিস্টেম স্বয়ংক্রিয়ভাবে বারকোড ও কিউআর সিলমোহরযুক্ত অনুমোদিত ই-নামজারি খতিয়ান তৈরি করে। নাগরিক ঘরে বসেই প্রিন্ট করে সরকারি সব কাজে ব্যবহার করতে পারবেন।',
                        'QR-verified digital khatian is immediately available for download and valid for all legal and banking purposes.'
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs pt-1">
                      <span className="chip bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
                        🛡️ {t('অনলাইন যাচাইযোগ্য কিউআর কোড সিলমোহর', 'Online QR Code Verifiable')}
                      </span>
                      <span className="chip bg-white border border-emerald-200 font-semibold text-slate-700">
                        ⏱ {t('সর্বমোট সময়সীমা: ২৮ কার্যদিবসের মধ্যে সম্পন্ন', 'Total SLA: Completed within 28 working days')}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Faraiz Inheritance Simulator */}
          {activeGuideTab === 'faraiz' && (
            <div className="space-y-5 animate-rise">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('মোট উত্তরাধিকার জমি (শতক):', 'Total Land Area (Decimals):')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={faraizTotalLand}
                    onChange={(e) => setFaraizTotalLand(Math.max(1, Number(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 text-sm font-bold font-mono border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-[#006A4E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('স্ত্রী সংখ্যা:', 'Number of Wives:')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="4"
                    value={faraizWives}
                    onChange={(e) => setFaraizWives(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 text-sm font-bold font-mono border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-[#006A4E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('পুত্র সন্তান সংখ্যা:', 'Number of Sons:')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={faraizSons}
                    onChange={(e) => setFaraizSons(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 text-sm font-bold font-mono border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-[#006A4E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('কন্যা সন্তান সংখ্যা:', 'Number of Daughters:')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={faraizDaughters}
                    onChange={(e) => setFaraizDaughters(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 text-sm font-bold font-mono border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-[#006A4E]"
                  />
                </div>
              </div>

              {/* Instant Calculated Distribution */}
              {(() => {
                const hasChildren = faraizSons > 0 || faraizDaughters > 0;
                const wifeFraction = hasChildren ? 0.125 : 0.25;
                const totalWifeLand = faraizWives > 0 ? faraizTotalLand * wifeFraction : 0;
                const perWifeLand = faraizWives > 0 ? totalWifeLand / faraizWives : 0;

                const remainingLand = faraizTotalLand - totalWifeLand;
                const totalChildWeights = (faraizSons * 2) + faraizDaughters;
                const perSonLand = totalChildWeights > 0 && faraizSons > 0 ? (remainingLand / totalChildWeights) * 2 : 0;
                const perDaughterLand = totalChildWeights > 0 && faraizDaughters > 0 ? (remainingLand / totalChildWeights) * 1 : 0;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Wives Card */}
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-1">
                      <div className="flex items-center justify-between text-xs font-extrabold text-[#006A4E]">
                        <span>{t('স্ত্রীগণের অংশ', 'Wife Share')}</span>
                        <span>{hasChildren ? '১/৮ (১২.৫%)' : '১/৪ (২৫%)'}</span>
                      </div>
                      <div className="text-xl font-extrabold text-slate-900">
                        {totalWifeLand.toFixed(2)} {t('শতক', 'Dec')}
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {faraizWives > 0
                          ? `${t('প্রত্যেকে পাবেন:', 'Per wife:')} ${perWifeLand.toFixed(2)} ${t('শতক', 'Dec')}`
                          : t('কোনো অংশীদার নেই', 'No heirs in this category')}
                      </p>
                    </div>

                    {/* Sons Card */}
                    <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 space-y-1">
                      <div className="flex items-center justify-between text-xs font-extrabold text-blue-900">
                        <span>{t('পুত্রগণের অংশ (আসাবা)', 'Sons (Residuary)')}</span>
                        <span>{t('কন্যার দ্বিগুণ (২:১)', '2x Daughter')}</span>
                      </div>
                      <div className="text-xl font-extrabold text-slate-900">
                        {(perSonLand * faraizSons).toFixed(2)} {t('শতক', 'Dec')}
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {faraizSons > 0
                          ? `${t('প্রতি পুত্র পাবেন:', 'Per son:')} ${perSonLand.toFixed(2)} ${t('শতক', 'Dec')}`
                          : t('কোনো পুত্র সন্তান নেই', 'No sons')}
                      </p>
                    </div>

                    {/* Daughters Card */}
                    <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/50 space-y-1">
                      <div className="flex items-center justify-between text-xs font-extrabold text-teal-900">
                        <span>{t('কন্যাগণের অংশ', 'Daughters Share')}</span>
                        <span>{t('১ অংশ (১:২)', '1x Share')}</span>
                      </div>
                      <div className="text-xl font-extrabold text-slate-900">
                        {(perDaughterLand * faraizDaughters).toFixed(2)} {t('শতক', 'Dec')}
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {faraizDaughters > 0
                          ? `${t('প্রতি কন্যা পাবেন:', 'Per daughter:')} ${perDaughterLand.toFixed(2)} ${t('শতক', 'Dec')}`
                          : t('কোনো কন্যা সন্তান নেই', 'No daughters')}
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                <strong>{t('ফারায়েজ আইনি নিয়ম:', 'Faraiz Legal Rule:')}</strong>{' '}
                {t(
                  'মুসলিম উত্তরাধিকার আইন অনুযায়ী পিতা বা মাতার মৃত্যুর পর ওয়ারিশগণ তাদের নির্ধারিত হিস্যা অনুযায়ী অবিভক্ত দাগের সহ-মালিক হন। সহকারী কমিশনার (ভূমি) অফিসে নামজারি আবেদন করার পূর্বে স্থানীয় পৌরসভা/ইউনিয়ন পরিষদ থেকে সঠিক ওয়ারিশ সনদ গ্রহণ করা বাধ্যতামূলক।',
                  'Under Islamic succession law in Bangladesh, heirs become tenants-in-common according to their statutory Quranic fractions until an official partition deed (বাটোয়ারা দলিল) or e-mutation khatian is issued.'
                )}
              </div>
            </div>
          )}
        </div>

        {/* Categories Bar & Search */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory('')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer min-h-[38px] ${
                selectedCategory === ''
                  ? 'bg-[#006A4E] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t('সকল বিষয়', 'All Topics')}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.slug)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer min-h-[38px] ${
                  selectedCategory === c.slug
                    ? 'bg-[#006A4E] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {lang === 'bn' ? c.name_bn : c.name_en}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('নিবন্ধ বা আইন অনুসন্ধান...', 'Search articles...')}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[38px]"
            />
          </form>
        </div>

        {/* Blog Posts Grid */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-[#006A4E] mb-3" />
            <p className="font-semibold">{t('নিবন্ধ লোড হচ্ছে...', 'Loading articles...')}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-semibold text-slate-800">
              {t('কোনো নিবন্ধ পাওয়া যায়নি।', 'No articles found matching your criteria.')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
              >
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-[#006A4E] border border-emerald-200">
                      <Tag className="w-3 h-3" />
                      {lang === 'bn' ? post.category_name_bn : post.category_name_en}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.reading_time_minutes} {t('মি. পাঠ', 'min read')}
                    </span>
                  </div>

                  <h3
                    onClick={() => setActivePost(post)}
                    className="text-base sm:text-lg font-bold text-slate-900 leading-snug hover:text-[#006A4E] cursor-pointer transition-colors"
                  >
                    {lang === 'bn' ? post.title_bn : post.title_en}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed">
                    {lang === 'bn' ? post.body_bn : post.body_en}
                  </p>
                </div>

                <div className="p-6 pt-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    <span className="block font-medium text-slate-800">
                      {lang === 'bn' ? post.author_name_bn : post.author_name_en}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDate(post.published_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleAudio(post.id, `${lang === 'bn' ? post.title_bn : post.title_en}। ${lang === 'bn' ? post.body_bn : post.body_en}`)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer min-h-[36px] ${
                        playingAudioId === post.id
                          ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                      title={t('অডিও শুনুন', 'Listen Audio')}
                    >
                      {playingAudioId === post.id ? (
                        <>
                          <Square className="w-3.5 h-3.5 text-rose-600 fill-current" />
                          <span>{t('থামুন', 'Stop')}</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-[#006A4E]" />
                          <span>{t('শুনুন', 'Listen')}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleHelpfulClick(post.id, post.post_slug)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer min-h-[36px] ${
                        hasVotedHelpful[post.id]
                          ? 'bg-emerald-100 text-[#006A4E] border-emerald-300'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{post.helpful_count}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivePost(post)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#006A4E] hover:bg-emerald-800 transition cursor-pointer min-h-[36px]"
                    >
                      <span>{t('পড়ুন', 'Read')}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Article Reader Modal */}
        {activePost && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="blog-post-reader-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          >
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#006A4E] border border-emerald-200">
                  <Tag className="w-3.5 h-3.5" />
                  {lang === 'bn' ? activePost.category_name_bn : activePost.category_name_en}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleAudio(`modal-${activePost.id}`, `${lang === 'bn' ? activePost.title_bn : activePost.title_en}। ${lang === 'bn' ? activePost.body_bn : activePost.body_en}`)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                      playingAudioId === `modal-${activePost.id}`
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : 'bg-emerald-50 text-[#006A4E] border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {playingAudioId === `modal-${activePost.id}` ? (
                      <>
                        <Square className="w-3.5 h-3.5 text-rose-600 fill-current" />
                        <span>{t('থামুন', 'Stop Audio')}</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-[#006A4E]" />
                        <span>{t('নিবন্ধটি শুনুন', 'Listen to Article')}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (playingAudioId === `modal-${activePost.id}`) {
                        window.speechSynthesis?.cancel();
                        setPlayingAudioId(null);
                      }
                      setActivePost(null);
                    }}
                    aria-label={t('বন্ধ করুন', 'Close')}
                    className="text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h2 id="blog-post-reader-modal-title" className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                  {lang === 'bn' ? activePost.title_bn : activePost.title_en}
                </h2>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pb-3 border-b border-slate-100">
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <User className="w-3.5 h-3.5 text-[#006A4E]" />
                    {lang === 'bn' ? activePost.author_name_bn : activePost.author_name_en}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(activePost.published_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {activePost.reading_time_minutes} {t('মিনিট পাঠের সময়', 'min read')}
                  </span>
                </div>

                <div className="text-sm text-slate-700 leading-relaxed space-y-3 whitespace-pre-line bg-slate-50 p-5 rounded-xl border border-slate-100 font-normal">
                  {lang === 'bn' ? activePost.body_bn : activePost.body_en}
                </div>

                {/* Helpful & Share Bar */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleHelpfulClick(activePost.id, activePost.post_slug)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer min-h-[44px] ${
                      hasVotedHelpful[activePost.id]
                        ? 'bg-emerald-100 text-[#006A4E] border-emerald-300'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>
                      {hasVotedHelpful[activePost.id]
                        ? t('ধন্যবাদ! মতামত গৃহীত হয়েছে', 'Thank you! Vote recorded')
                        : t('নিবন্ধটি কি সহায়ক ছিল?', 'Was this article helpful?')}
                    </span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[11px]">
                      {activePost.helpful_count}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePost(null)}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px]"
                  >
                    {t('বন্ধ করুন', 'Close')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
