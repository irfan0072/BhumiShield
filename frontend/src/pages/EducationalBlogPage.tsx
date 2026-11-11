import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Calculator, ChevronRight, Clock, FileSignature, Loader2, RotateCcw, ThumbsUp, TriangleAlert } from 'lucide-react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { cn } from '@/lib/utils';
import { useBlogPosts } from '../components/publicHooks';
import { PublicHero, PublicSection } from '@/components/public/PublicPage';
import { EmptyState, StatusBadge, notify } from '@/components/admin/kit';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FontSizeToggle, ListenButton, ResponsivePanel, fontCls, useSpeech, type FontSize } from './notices/ReaderPanel';
import { MutationGuide } from './guide/MutationGuide';
import { FaraizTool } from './guide/FaraizTool';

interface BlogPost {
  id: number;
  post_slug: string;
  category_slug: string;
  category_name_bn?: string;
  category_name_en?: string;
  title_bn: string;
  title_en: string;
  body_bn: string;
  body_en: string;
  author_name_bn?: string;
  author_name_en?: string;
  reading_time_minutes?: number;
  helpful_count?: number;
  published_at?: string;
}

type Tool = 'mutation' | 'faraiz';
const TOOLS: Array<{ id: Tool; icon: React.ElementType; bn: string; en: string; descBn: string; descEn: string }> = [
  { id: 'mutation', icon: FileSignature, bn: 'ই-নামজারি গাইড', en: 'e-Mutation guide', descBn: 'ধাপ ও সরকারি ফি', descEn: 'Steps and official fees' },
  { id: 'faraiz', icon: Calculator, bn: 'উত্তরাধিকার হিসাব', en: 'Inheritance (Faraiz)', descBn: 'কে কত জমি পাবেন', descEn: 'Who gets how much land' },
];

const VOTED_KEY = 'bs_blog_helpful';
const readVoted = (): number[] => {
  try {
    const v = JSON.parse(sessionStorage.getItem(VOTED_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => Number.isInteger(x)) : [];
  } catch {
    return [];
  }
};

/** Read ?tool= once on mount; keep the URL in sync while a tool is open (shareable link). */
const readTool = (): Tool | null => {
  if (typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get('tool');
  return v === 'faraiz' || v === 'mutation' ? v : null;
};
const writeTool = (tool: Tool | null) => {
  const url = new URL(window.location.href);
  if (tool) url.searchParams.set('tool', tool);
  else url.searchParams.delete('tool');
  window.history.replaceState(window.history.state, '', url.pathname + url.search);
};

export const EducationalBlogPage: React.FC = () => {
  const { t, lang } = useAppUI();
  const n = (v: number | string) => toBanglaDigits(v, lang);

  /* ---------- tools ---------- */
  const [tool, setTool] = useState<Tool | null>(readTool);
  const openTool = (x: Tool | null) => {
    setTool(x);
    writeTool(x);
  };
  const toolInfo = TOOLS.find((x) => x.id === tool);

  /* ---------- articles ---------- */
  const [category, setCategory] = useState('ALL');
  const blog = useBlogPosts(category);
  const posts: BlogPost[] = blog.data?.items || [];
  const categories: Array<{ slug: string; name_bn: string; name_en: string }> = blog.data?.categories || [];

  const [active, setActive] = useState<BlogPost | null>(null);
  const [size, setSize] = useState<FontSize>(0);
  const speech = useSpeech(lang);
  const [voted, setVoted] = useState<number[]>(readVoted);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(VOTED_KEY, JSON.stringify(voted.slice(-200)));
    } catch {
      /* storage may be blocked; voting still works for this page */
    }
  }, [voted]);

  const title = (p: BlogPost) => (lang === 'bn' ? p.title_bn : p.title_en || p.title_bn);
  const body = (p: BlogPost) => (lang === 'bn' ? p.body_bn : p.body_en || p.body_bn);
  const catName = (p: BlogPost) => (lang === 'bn' ? p.category_name_bn : p.category_name_en || p.category_name_bn) || '';
  const minutes = (p: BlogPost) => t(`${n(p.reading_time_minutes || 5)} মিনিট`, `${p.reading_time_minutes || 5} min`);
  const helpful = (p: BlogPost) => counts[p.id] ?? Number(p.helpful_count || 0);

  const vote = async (p: BlogPost) => {
    if (voting || voted.includes(p.id)) return;
    setVoting(true);
    try {
      const res = await BhumiApi.markBlogPostHelpful(p.post_slug || p.id);
      setVoted((v) => [...v, p.id]);
      setCounts((c) => ({ ...c, [p.id]: Number(res?.helpful_count ?? helpful(p) + 1) }));
      notify.ok(t('ধন্যবাদ!', 'Thank you!'));
    } catch (err) {
      notify.err(err, lang);
    } finally {
      setVoting(false);
    }
  };

  const closeReader = (o: boolean) => {
    if (!o) {
      speech.stop();
      setActive(null);
    }
  };

  const chips = useMemo(() => [{ slug: 'ALL', name_bn: 'সব', name_en: 'All' }, ...categories], [categories]);

  return (
    <div className="bg-white">
      <PublicHero image="hero-banner" icon={BookOpen} position="60% 30%" title={t('ভূমি সহায়িকা', 'Land guide')} subtitle={t('সহজ ভাষায় জমির নিয়ম ও হিসাব', 'Land rules and tools in plain words')}>
        <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
          {TOOLS.map((x) => {
            const Icon = x.icon;
            return (
              <button
                key={x.id}
                type="button"
                onClick={() => openTool(x.id)}
                className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-lg shadow-slate-900/5 transition hover:border-[#006A4E]/40 cursor-pointer"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#006A4E] transition group-hover:bg-[#006A4E] group-hover:text-white">
                  <Icon className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-900">{lang === 'bn' ? x.bn : x.en}</span>
                  <span className="block text-sm text-slate-500">{lang === 'bn' ? x.descBn : x.descEn}</span>
                </span>
                <ArrowRight className="size-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#006A4E]" />
              </button>
            );
          })}
        </div>
      </PublicHero>

      <PublicSection className="py-4 sm:py-6">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{t('লেখা', 'Articles')}</h2>
          {categories.length > 0 && (
            <div className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
              <div role="tablist" className="flex w-max gap-1.5">
                {chips.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    role="tab"
                    aria-selected={category === c.slug}
                    onClick={() => setCategory(c.slug)}
                    className={cn(
                      'h-9 whitespace-nowrap rounded-lg px-3 text-sm transition cursor-pointer',
                      category === c.slug ? 'bg-[#006A4E] font-medium text-white' : 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-100'
                    )}
                  >
                    {lang === 'bn' ? c.name_bn : c.name_en || c.name_bn}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {blog.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : blog.isError ? (
          <EmptyState
            icon={TriangleAlert}
            text={t('লেখা আনা যায়নি', 'Could not load articles')}
            action={
              <button
                type="button"
                onClick={() => blog.refetch()}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:border-[#006A4E] hover:text-[#006A4E] cursor-pointer"
              >
                <RotateCcw className="size-4" />
                {t('আবার চেষ্টা', 'Try again')}
              </button>
            }
          />
        ) : posts.length === 0 ? (
          <EmptyState icon={BookOpen} text={t('এই বিষয়ে লেখা নেই', 'No articles here yet')} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setActive(p)}
                  className="group flex h-full w-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-[#006A4E]/40 hover:shadow-md cursor-pointer"
                >
                  <span className="flex items-center justify-between gap-2">
                    <StatusBadge tone="green" className="max-w-[70%] truncate">{catName(p)}</StatusBadge>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
                      <Clock className="size-3.5" />
                      {minutes(p)}
                    </span>
                  </span>
                  <span className="line-clamp-2 font-semibold leading-snug text-slate-900">{title(p)}</span>
                  <span className="mt-auto flex items-center gap-1 text-sm font-medium text-slate-500 group-hover:text-[#006A4E]">
                    {t('পড়ুন', 'Read')}
                    <ChevronRight className="size-4" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PublicSection>

      {/* Tool dialog */}
      <Dialog open={!!tool} onOpenChange={(o) => !o && openTool(null)}>
        <DialogContent className="max-h-[92dvh] max-w-xl gap-0 overflow-y-auto p-0">
          <DialogHeader className="border-b border-slate-100 px-5 py-4 pr-16 text-left">
            <DialogTitle className="text-lg font-semibold text-slate-900">{toolInfo ? (lang === 'bn' ? toolInfo.bn : toolInfo.en) : ''}</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">{toolInfo ? (lang === 'bn' ? toolInfo.descBn : toolInfo.descEn) : ''}</DialogDescription>
          </DialogHeader>
          <div className="px-5 py-4">{tool === 'faraiz' ? <FaraizTool /> : tool === 'mutation' ? <MutationGuide /> : null}</div>
        </DialogContent>
      </Dialog>

      {/* Reader */}
      <ResponsivePanel
        open={!!active}
        onOpenChange={closeReader}
        wide
        title={active ? title(active) : ''}
        meta={
          active && (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <StatusBadge tone="green">{catName(active)}</StatusBadge>
              <span>{minutes(active)}</span>
              {(active.author_name_bn || active.author_name_en) && (
                <span>· {lang === 'bn' ? active.author_name_bn : active.author_name_en || active.author_name_bn}</span>
              )}
            </span>
          )
        }
        footer={
          active && (
            <button
              type="button"
              onClick={() => vote(active)}
              disabled={voting || voted.includes(active.id)}
              aria-pressed={voted.includes(active.id)}
              className={cn(
                'inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition cursor-pointer disabled:cursor-default',
                voted.includes(active.id)
                  ? 'border-emerald-200 bg-emerald-50 text-[#006A4E]'
                  : 'border-slate-200 text-slate-700 hover:border-[#006A4E]/40 hover:text-[#006A4E]'
              )}
            >
              {voting ? <Loader2 className="size-4 animate-spin" /> : <ThumbsUp className="size-4" />}
              {voted.includes(active.id) ? t('উপকারী বলেছেন', 'Marked helpful') : t('উপকারী', 'Helpful')}
              <span className="text-slate-400">{n(helpful(active))}</span>
            </button>
          )
        }
      >
        {active && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {speech.supported && (
                <ListenButton
                  active={speech.playing === active.id}
                  onClick={() => speech.toggle(active.id, `${title(active)}। ${body(active)}`)}
                  labels={[t('শুনুন', 'Listen'), t('থামান', 'Stop')]}
                />
              )}
              <FontSizeToggle value={size} onChange={setSize} label={t('লেখার আকার', 'Text size')} glyph={lang === 'bn' ? 'অ' : 'A'} />
            </div>
            <div className={cn('whitespace-pre-wrap break-words text-slate-800', fontCls[size])}>{body(active)}</div>
          </div>
        )}
      </ResponsivePanel>
    </div>
  );
};

export default EducationalBlogPage;
