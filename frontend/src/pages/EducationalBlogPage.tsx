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
  X
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#006A4E] border border-emerald-200">
                  <Tag className="w-3.5 h-3.5" />
                  {lang === 'bn' ? activePost.category_name_bn : activePost.category_name_en}
                </span>
                <button
                  onClick={() => setActivePost(null)}
                  className="text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
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
