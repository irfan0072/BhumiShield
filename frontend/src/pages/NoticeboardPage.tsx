import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, ChevronRight, Download, FileText, Paperclip, Pin, RotateCcw, Search, TriangleAlert, X } from 'lucide-react';
import { useAppUI } from '../i18n';
import { api } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { cn } from '@/lib/utils';
import { useNotices } from '../components/publicHooks';
import { PublicHero, PublicSection } from '@/components/public/PublicPage';
import { EmptyState, StatusBadge, type Tone } from '@/components/admin/kit';
import { Skeleton } from '@/components/ui/skeleton';
import { FontSizeToggle, ListenButton, ResponsivePanel, fontCls, useSpeech, type FontSize } from './notices/ReaderPanel';

interface NoticeAttachment {
  id: number;
  file_name: string;
  file_type?: string;
  file_size_bytes?: number;
  content_hash?: string;
}

interface NoticeItem {
  id: number;
  notice_slug: string;
  category: string;
  scope?: string;
  title_bn: string;
  title_en: string;
  body_bn: string;
  body_en: string;
  is_pinned: number;
  is_urgent: number;
  published_by?: string;
  published_at?: string;
  created_at?: string;
  attachment_count?: number;
  attachments?: NoticeAttachment[];
}

/** Notice categories used by the backend (notices.category). */
const CATEGORIES: Array<{ id: string; bn: string; en: string; tone: Tone }> = [
  { id: 'CIRCULAR_POLICY', bn: 'পরিপত্র', en: 'Circular', tone: 'blue' },
  { id: 'GAZETTE', bn: 'গেজেট', en: 'Gazette', tone: 'violet' },
  { id: 'PUBLIC_HEARING', bn: 'শুনানি', en: 'Hearing', tone: 'amber' },
  { id: 'OFFICE_NOTICE', bn: 'অফিস নোটিশ', en: 'Office notice', tone: 'slate' },
  { id: 'FRAUD_WARNING', bn: 'সতর্কতা', en: 'Warning', tone: 'red' },
];
const catInfo = (id: string) => CATEGORIES.find((c) => c.id === id);

const MAX_Q = 60;

export const NoticeboardPage: React.FC = () => {
  const { t, lang, formatDate } = useAppUI();
  const n = (v: number | string) => toBanglaDigits(v, lang);

  // URL support: ?category=GAZETTE, and /{lang}/notices/<slug> (QR codes on notice PDFs point there).
  const initial = useRef(
    (() => {
      if (typeof window === 'undefined') return { category: '', slug: '' };
      const qs = new URLSearchParams(window.location.search);
      const cat = (qs.get('category') || '').toUpperCase();
      const parts = window.location.pathname.split('/').filter(Boolean);
      const i = parts.indexOf('notices');
      const slug = i >= 0 && parts[i + 1] ? decodeURIComponent(parts[i + 1]).slice(0, 120) : qs.get('notice') || '';
      return { category: catInfo(cat) ? cat : '', slug };
    })()
  );

  const [category, setCategory] = useState(initial.current.category);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<NoticeItem | null>(null);
  const [size, setSize] = useState<FontSize>(0);
  const speech = useSpeech(lang);

  const notices = useNotices({ category: category || undefined });
  const items: NoticeItem[] = notices.data?.items || [];

  // Open the notice named in the URL once the list arrives.
  useEffect(() => {
    const slug = initial.current.slug;
    if (!slug || !items.length) return;
    const hit = items.find((x) => x.notice_slug === slug || String(x.id) === slug);
    if (hit) setSelected(hit);
    initial.current.slug = '';
  }, [items]);

  const title = (x: NoticeItem) => (lang === 'bn' ? x.title_bn : x.title_en || x.title_bn);
  const body = (x: NoticeItem) => (lang === 'bn' ? x.body_bn : x.body_en || x.body_bn);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((x) =>
      [x.title_bn, x.title_en, x.body_bn, x.body_en, x.published_by].some((v) => (v || '').toLowerCase().includes(q))
    );
  }, [items, query]);

  // At most two highlighted rows on top; everything else goes into the plain list.
  const highlighted = filtered.filter((x) => Number(x.is_pinned) || Number(x.is_urgent)).slice(0, 2);
  const rest = filtered.filter((x) => !highlighted.includes(x));

  const close = (o: boolean) => {
    if (!o) {
      speech.stop();
      setSelected(null);
    }
  };

  const downloadUrl = (x: NoticeItem, a: NoticeAttachment) =>
    `${api.defaults.baseURL}/notices/${encodeURIComponent(x.notice_slug)}/attachments/${encodeURIComponent(String(a.id))}/download`;

  return (
    <div className="bg-white">
      <PublicHero image="hero-banner" icon={Bell} position="60% 30%" title={t('নোটিশ', 'Notices')} subtitle={t('ভূমি অফিসের সরকারি নোটিশ', 'Official land office notices')}>
        <div className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-900/5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value.slice(0, MAX_Q))}
              maxLength={MAX_Q}
              type="search"
              placeholder={t('নোটিশ খুঁজুন', 'Search notices')}
              aria-label={t('নোটিশ খুঁজুন', 'Search notices')}
              className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-10 text-sm outline-none placeholder:text-slate-400 focus:border-[#006A4E] focus:ring-2 focus:ring-[#006A4E]/15"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('মুছুন', 'Clear')}
                className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="-mx-3 mt-2.5 overflow-x-auto px-3 scrollbar-none">
            <div role="tablist" aria-label={t('ধরন', 'Category')} className="flex w-max gap-1.5">
              {[{ id: '', bn: 'সব', en: 'All' }, ...CATEGORIES].map((c) => (
                <button
                  key={c.id || 'all'}
                  type="button"
                  role="tab"
                  aria-selected={category === c.id}
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    'h-9 whitespace-nowrap rounded-lg px-3 text-sm transition cursor-pointer',
                    category === c.id ? 'bg-[#006A4E] font-medium text-white' : 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-100'
                  )}
                >
                  {lang === 'bn' ? c.bn : c.en}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PublicHero>

      <PublicSection className="py-4 sm:py-6">
        {notices.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[68px] w-full rounded-xl" />
            ))}
          </div>
        ) : notices.isError ? (
          <EmptyState
            icon={TriangleAlert}
            text={t('নোটিশ আনা যায়নি', 'Could not load notices')}
            action={
              <button
                type="button"
                onClick={() => notices.refetch()}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:border-[#006A4E] hover:text-[#006A4E] cursor-pointer"
              >
                <RotateCcw className="size-4" />
                {t('আবার চেষ্টা', 'Try again')}
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            text={t('কোনো নোটিশ নেই', 'No notices found')}
            action={
              (query || category) && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setCategory('');
                  }}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:border-[#006A4E] hover:text-[#006A4E] cursor-pointer"
                >
                  {t('সব নোটিশ', 'All notices')}
                </button>
              )
            }
          />
        ) : (
          <div className="space-y-4">
            {highlighted.length > 0 && (
              <ul className="space-y-2" aria-label={t('জরুরি নোটিশ', 'Important notices')}>
                {highlighted.map((x) => (
                  <li key={x.id}>
                    <NoticeRow notice={x} highlight title={title(x)} lang={lang} t={t} date={formatDate(x.published_at || x.created_at)} onOpen={() => setSelected(x)} />
                  </li>
                ))}
              </ul>
            )}
            {rest.length > 0 && (
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {rest.map((x) => (
                  <li key={x.id}>
                    <NoticeRow notice={x} title={title(x)} lang={lang} t={t} date={formatDate(x.published_at || x.created_at)} onOpen={() => setSelected(x)} />
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-slate-500">{t(`মোট ${n(filtered.length)}টি নোটিশ`, `${filtered.length} notices`)}</p>
          </div>
        )}
      </PublicSection>

      {/* Reader */}
      <ResponsivePanel
        open={!!selected}
        onOpenChange={close}
        wide
        title={selected ? title(selected) : ''}
        meta={
          selected && (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <CategoryBadge id={selected.category} lang={lang} />
              <span>{formatDate(selected.published_at || selected.created_at)}</span>
              {selected.published_by && <span>· {selected.published_by}</span>}
            </span>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {speech.supported && (
                <ListenButton
                  active={speech.playing === selected.id}
                  onClick={() => speech.toggle(selected.id, `${title(selected)}। ${body(selected)}`)}
                  labels={[t('শুনুন', 'Listen'), t('থামান', 'Stop')]}
                />
              )}
              <FontSizeToggle value={size} onChange={setSize} label={t('লেখার আকার', 'Text size')} glyph={lang === 'bn' ? 'অ' : 'A'} />
            </div>

            <div className={cn('whitespace-pre-wrap break-words text-slate-800', fontCls[size])}>{body(selected)}</div>

            {!!selected.attachments?.length && (
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <p className="text-sm font-medium text-slate-700">{t('সংযুক্ত ফাইল', 'Attachments')}</p>
                {selected.attachments.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#006A4E]">
                      <FileText className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800">PDF{a.file_size_bytes ? ` · ${n(Math.round(a.file_size_bytes / 1024))} KB` : ''}</span>
                      {a.content_hash && (
                        <span className="block truncate font-mono text-[11px] text-slate-400">
                          {t('নিরাপত্তা কোড', 'Security code')}: {a.content_hash.slice(0, 12)}
                        </span>
                      )}
                    </span>
                    <a
                      href={downloadUrl(selected, a)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[#006A4E] px-3 text-sm font-medium text-white hover:bg-[#00553e]"
                    >
                      <Download className="size-4" />
                      {t('ডাউনলোড', 'Download')}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </ResponsivePanel>
    </div>
  );
};

const CategoryBadge: React.FC<{ id: string; lang: 'bn' | 'en' }> = ({ id, lang }) => {
  const c = catInfo(id);
  return <StatusBadge tone={c?.tone ?? 'slate'}>{c ? (lang === 'bn' ? c.bn : c.en) : id.replace(/_/g, ' ').toLowerCase()}</StatusBadge>;
};

const NoticeRow: React.FC<{
  notice: NoticeItem;
  title: string;
  date: string;
  lang: 'bn' | 'en';
  t: (bn: string, en: string) => string;
  highlight?: boolean;
  onOpen: () => void;
}> = ({ notice, title, date, lang, t, highlight, onOpen }) => {
  const urgent = !!Number(notice.is_urgent);
  const c = catInfo(notice.category);
  const hasFile = Number(notice.attachment_count || notice.attachments?.length || 0) > 0;
  const badge = urgent ? (
    <StatusBadge tone="red">{t('জরুরি', 'Urgent')}</StatusBadge>
  ) : Number(notice.is_pinned) ? (
    <StatusBadge tone="amber">{t('গুরুত্বপূর্ণ', 'Important')}</StatusBadge>
  ) : notice.category === 'FRAUD_WARNING' ? (
    <StatusBadge tone="red">{t('সতর্কতা', 'Warning')}</StatusBadge>
  ) : null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex w-full items-center gap-3 px-3 py-3 text-left transition cursor-pointer sm:px-4',
        highlight
          ? cn('rounded-xl border bg-white', urgent ? 'border-rose-200 border-l-4 border-l-rose-500' : 'border-amber-200 border-l-4 border-l-amber-500', 'hover:shadow-md')
          : 'hover:bg-slate-50'
      )}
    >
      <span
        className={cn(
          'hidden size-10 shrink-0 items-center justify-center rounded-xl sm:flex',
          highlight ? (urgent ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-700') : 'bg-slate-100 text-slate-500'
        )}
      >
        {highlight ? urgent ? <TriangleAlert className="size-5" /> : <Pin className="size-5" /> : <FileText className="size-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('line-clamp-2 text-sm text-slate-900 sm:text-base', highlight ? 'font-semibold' : 'font-medium')}>{title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 whitespace-nowrap text-xs text-slate-500">
          {badge && <span className="sm:hidden">{badge}</span>}
          <span>{c ? (lang === 'bn' ? c.bn : c.en) : notice.category}</span>
          <span aria-hidden>·</span>
          <span>{date}</span>
          {hasFile && <Paperclip className="size-3.5 text-slate-400" aria-label={t('ফাইল আছে', 'Has file')} />}
        </span>
      </span>
      {badge && <span className="hidden shrink-0 sm:inline-flex">{badge}</span>}
      <ChevronRight className="size-4 shrink-0 text-slate-300 transition group-hover:text-[#006A4E]" />
    </button>
  );
};

export default NoticeboardPage;
