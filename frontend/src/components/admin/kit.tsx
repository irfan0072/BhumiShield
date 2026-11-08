/**
 * Admin UI kit: small shared building blocks so every super admin page
 * looks and behaves the same. Built on the shadcn primitives in components/ui.
 *
 * Rules of the design:
 *  - Short labels (1–3 words). No paragraphs.
 *  - One primary action per page, top-right of the toolbar.
 *  - Details open in a Sheet (side panel) or Dialog, never inline walls of text.
 *  - Every mutation shows a toast (success or the server's message_bn).
 */
import React, { useState } from 'react';
import { Inbox, Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

/* ------------------------------------------------------------------ */
/* Page layout                                                         */
/* ------------------------------------------------------------------ */

/**
 * Page body with consistent width and spacing. Use as the root of every admin page.
 *
 * `fill` = single-screen layout (tablet/desktop): the page itself never scrolls; the one
 * `<Section fill>` stretches to the remaining height and its `DataTable` scrolls inside.
 * On phones the page scrolls normally (there is not enough height for a fixed layout).
 */
export const AdminPage: React.FC<{ children: React.ReactNode; className?: string; wide?: boolean; fill?: boolean }> = ({
  children,
  className,
  wide,
  fill,
}) => (
  <div className={cn('h-full min-h-0 w-full overflow-y-auto scrollbar-thin', fill && 'md:overflow-hidden')}>
    <div
      className={cn(
        'mx-auto flex w-full flex-col gap-4 p-3 sm:p-5',
        fill && 'md:h-full',
        wide ? 'max-w-7xl' : 'max-w-6xl',
        className
      )}
    >
      {children}
    </div>
  </div>
);

/** Search box + filters on the left, actions on the right. */
export const PageToolbar: React.FC<{
  search?: string;
  onSearch?: (v: string) => void;
  placeholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}> = ({ search, onSearch, placeholder = 'খুঁজুন…', filters, actions, className }) => (
  <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-center', className)}>
    {onSearch && (
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search ?? ''}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-sm outline-none placeholder:text-slate-400 focus:border-[#006A4E] focus:ring-2 focus:ring-[#006A4E]/15"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearch('')}
            aria-label="Clear"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    )}
    {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
    {actions && <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{actions}</div>}
  </div>
);

/** White card section with an optional small title row. */
export const Section: React.FC<{
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Stretch to the remaining page height (inside `<AdminPage fill>`); the body becomes a flex column. */
  fill?: boolean;
}> = ({ title, action, children, className, bodyClassName, fill }) => (
  <section
    className={cn(
      'overflow-hidden rounded-xl border border-slate-200 bg-white',
      fill && 'md:flex md:min-h-0 md:flex-1 md:flex-col',
      className
    )}
  >
    {(title || action) && (
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {action}
      </div>
    )}
    <div className={cn(fill && 'md:flex md:min-h-0 md:flex-1 md:flex-col', bodyClassName)}>{children}</div>
  </section>
);

/* ------------------------------------------------------------------ */
/* Numbers                                                             */
/* ------------------------------------------------------------------ */

export type Tone = 'green' | 'amber' | 'red' | 'blue' | 'slate' | 'violet';

const toneBox: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-rose-50 text-rose-700',
  blue: 'bg-sky-50 text-sky-700',
  slate: 'bg-slate-100 text-slate-600',
  violet: 'bg-violet-50 text-violet-700',
};

export const StatGrid: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', className)}>{children}</div>
);

/** Small number tile. Clickable when onClick is given. */
export const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
  tone?: Tone;
  hint?: string;
  onClick?: () => void;
  active?: boolean;
}> = ({ label, value, icon: Icon, tone = 'slate', hint, onClick, active }) => {
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-white p-3 text-left transition',
        active ? 'border-[#006A4E] ring-1 ring-[#006A4E]/30' : 'border-slate-200',
        onClick && 'cursor-pointer hover:border-slate-300 hover:shadow-sm'
      )}
    >
      {Icon && (
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', toneBox[tone])}>
          <Icon className="size-4" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-xs text-slate-500">{label}</span>
        <span className="block text-lg font-semibold leading-tight text-slate-900">{value}</span>
        {hint && <span className="block truncate text-[11px] text-slate-400">{hint}</span>}
      </span>
    </Comp>
  );
};

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

const badgeTone: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
};
const dotTone: Record<Tone, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-rose-500',
  blue: 'bg-sky-500',
  slate: 'bg-slate-400',
  violet: 'bg-violet-500',
};

/** Small coloured status pill with a dot. Keep the label to 1–2 words. */
export const StatusBadge: React.FC<{ tone?: Tone; children: React.ReactNode; className?: string }> = ({
  tone = 'slate',
  children,
  className,
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
      badgeTone[tone],
      className
    )}
  >
    <span className={cn('size-1.5 rounded-full', dotTone[tone])} />
    {children}
  </span>
);

/**
 * Maps common backend status codes to a tone + short Bangla/English label.
 * Unknown codes fall back to a neutral badge showing the raw code.
 */
const STATUS_MAP: Record<string, { tone: Tone; bn: string; en: string }> = {
  ACTIVE: { tone: 'green', bn: 'সক্রিয়', en: 'Active' },
  INACTIVE: { tone: 'slate', bn: 'বন্ধ', en: 'Inactive' },
  SUSPENDED: { tone: 'red', bn: 'স্থগিত', en: 'Suspended' },
  APPROVED: { tone: 'green', bn: 'অনুমোদিত', en: 'Approved' },
  REGISTERED: { tone: 'green', bn: 'নিবন্ধিত', en: 'Registered' },
  COMPLETED: { tone: 'green', bn: 'সম্পন্ন', en: 'Completed' },
  VALID: { tone: 'green', bn: 'সঠিক', en: 'Valid' },
  VERIFIED: { tone: 'green', bn: 'যাচাইকৃত', en: 'Verified' },
  RESOLVED: { tone: 'green', bn: 'নিষ্পন্ন', en: 'Resolved' },
  PUBLISHED: { tone: 'green', bn: 'প্রকাশিত', en: 'Published' },
  RELEASED: { tone: 'green', bn: 'মুক্ত', en: 'Released' },
  PENDING: { tone: 'amber', bn: 'অপেক্ষমাণ', en: 'Pending' },
  PENDING_REVIEW: { tone: 'amber', bn: 'যাচাই চলছে', en: 'In review' },
  PENDING_MUTATION: { tone: 'amber', bn: 'নামজারি বাকি', en: 'Mutation due' },
  SUBMITTED: { tone: 'amber', bn: 'জমা হয়েছে', en: 'Submitted' },
  IN_REVIEW: { tone: 'amber', bn: 'যাচাই চলছে', en: 'In review' },
  HEARING: { tone: 'amber', bn: 'শুনানি', en: 'Hearing' },
  OPEN: { tone: 'amber', bn: 'খোলা', en: 'Open' },
  DRAFT: { tone: 'slate', bn: 'খসড়া', en: 'Draft' },
  ARCHIVED: { tone: 'slate', bn: 'আর্কাইভ', en: 'Archived' },
  REJECTED: { tone: 'red', bn: 'বাতিল', en: 'Rejected' },
  FLAGGED: { tone: 'red', bn: 'সমস্যা', en: 'Flagged' },
  FROZEN: { tone: 'red', bn: 'আটকানো', en: 'Frozen' },
  HELD: { tone: 'red', bn: 'স্থগিত', en: 'On hold' },
  DISPUTED: { tone: 'red', bn: 'বিরোধ', en: 'Disputed' },
  UPHELD_FROZEN: { tone: 'red', bn: 'আটকানো', en: 'Frozen' },
  MORTGAGED: { tone: 'blue', bn: 'বন্ধক', en: 'Mortgaged' },
  PRELIMINARY_NOTICE: { tone: 'blue', bn: 'প্রাথমিক নোটিশ', en: 'Notice' },
};

export const statusInfo = (code: string | null | undefined, lang: 'bn' | 'en') => {
  const key = String(code || '').toUpperCase();
  const hit = STATUS_MAP[key];
  return hit
    ? { tone: hit.tone, label: lang === 'bn' ? hit.bn : hit.en }
    : { tone: 'slate' as Tone, label: key ? key.replace(/_/g, ' ').toLowerCase() : '—' };
};

export const StatusCode: React.FC<{ code?: string | null; lang: 'bn' | 'en' }> = ({ code, lang }) => {
  const s = statusInfo(code, lang);
  return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>;
};

/* ------------------------------------------------------------------ */
/* Lists                                                               */
/* ------------------------------------------------------------------ */

/**
 * Consistent table. Pass header labels and rows as children (<tr>).
 *
 * - Scrolls inside itself when its parent gives it a height (`<Section fill>` in `<AdminPage fill>`),
 *   with a sticky header and soft fades at the top/bottom edge while there is more to scroll.
 * - Renders rows in batches of `pageSize` and adds more as you scroll (infinite scroll), so long
 *   lists stay fast. For server paging pass `hasMore` + `onEndReached` (+ `loadingMore`).
 */
export const DataTable: React.FC<{
  headers: React.ReactNode[];
  children: React.ReactNode;
  /** index of headers that should be right-aligned (usually the actions column) */
  alignRight?: number[];
  className?: string;
  pageSize?: number;
  hasMore?: boolean;
  loadingMore?: boolean;
  onEndReached?: () => void;
}> = ({ headers, children, alignRight = [], className, pageSize = 30, hasMore, loadingMore, onEndReached }) => {
  const rows = React.Children.toArray(children);
  const [limit, setLimit] = useState(pageSize);
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const sentinelRef = React.useRef<HTMLTableRowElement>(null);
  const prevCount = React.useRef(rows.length);

  // A shorter list means a new search/filter: start again from the top.
  React.useEffect(() => {
    if (rows.length < prevCount.current) {
      setLimit(pageSize);
      scrollRef.current?.scrollTo({ top: 0 });
    }
    prevCount.current = rows.length;
  }, [rows.length, pageSize]);

  const updateEdges = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight > 4;
    setEdges({
      top: scrollable && el.scrollTop > 4,
      bottom: scrollable && el.scrollTop + el.clientHeight < el.scrollHeight - 4,
    });
  }, []);

  React.useEffect(() => {
    updateEdges();
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateEdges, rows.length, limit]);

  const visible = rows.slice(0, limit);
  const moreLocal = rows.length > limit;
  const moreRemote = !!hasMore && !!onEndReached;

  // Load the next batch when the last row comes into view (works for inner and page scrolling).
  React.useEffect(() => {
    const node = sentinelRef.current;
    if (!node || (!moreLocal && !moreRemote) || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (moreLocal) setLimit((l) => l + pageSize);
        else if (moreRemote && !loadingMore) onEndReached?.();
      },
      { rootMargin: '240px' }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [moreLocal, moreRemote, loadingMore, onEndReached, pageSize, limit]);

  return (
    <div className={cn('relative md:flex md:min-h-0 md:flex-1 md:flex-col', className)}>
      <div ref={scrollRef} onScroll={updateEdges} className="overflow-x-auto scrollbar-thin md:min-h-0 md:flex-1 md:overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={cn(
                    'h-9 whitespace-nowrap bg-slate-50 px-4 text-left text-xs font-medium text-slate-500 shadow-[inset_0_-1px_0_#e2e8f0]',
                    alignRight.includes(i) && 'text-right'
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="admin-rows divide-y divide-slate-100 [&_td]:px-4 [&_td]:py-2.5 [&_td]:align-middle [&_tr:hover]:bg-slate-50/60">
            {visible}
            {(moreLocal || moreRemote || loadingMore) && (
              <tr ref={sentinelRef} className="hover:bg-transparent">
                <td colSpan={headers.length} className="!py-3 text-center">
                  <span className="inline-flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="size-3.5 animate-spin" />
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Edge fades: tell the user there is more above/below */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 top-9 z-10 h-6 bg-gradient-to-b from-white to-transparent transition-opacity duration-200',
          edges.top ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-white to-transparent transition-opacity duration-200',
          edges.bottom ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
};

/** Use inside DataTable body while loading. */
export const LoadingRows: React.FC<{ cols: number; rows?: number }> = ({ cols, rows = 4 }) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r}>
        {Array.from({ length: cols }).map((__, c) => (
          <td key={c}>
            <div className="h-4 w-full max-w-[10rem] animate-pulse rounded bg-slate-100" />
          </td>
        ))}
      </tr>
    ))}
  </>
);

/** Use inside DataTable body when there is nothing to show. */
export const EmptyRow: React.FC<{ cols: number; text: string; action?: React.ReactNode }> = ({ cols, text, action }) => (
  <tr>
    <td colSpan={cols}>
      <EmptyState text={text} action={action} />
    </td>
  </tr>
);

export const EmptyState: React.FC<{ text: string; icon?: React.ElementType; action?: React.ReactNode }> = ({
  text,
  icon: Icon = Inbox,
  action,
}) => (
  <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
    <span className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
      <Icon className="size-5" />
    </span>
    <p className="text-sm text-slate-500">{text}</p>
    {action}
  </div>
);

/** Small two-column label/value list for detail panels. */
export const DetailList: React.FC<{ items: Array<[React.ReactNode, React.ReactNode] | null | false> }> = ({ items }) => (
  <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
    {items.filter(Boolean).map((it, i) => {
      const [k, v] = it as [React.ReactNode, React.ReactNode];
      return (
        <div key={i} className="flex items-start justify-between gap-4 px-3 py-2 text-sm">
          <dt className="shrink-0 text-slate-500">{k}</dt>
          <dd className="min-w-0 text-right font-medium text-slate-800 break-words">{v ?? '—'}</dd>
        </div>
      );
    })}
  </dl>
);

/* ------------------------------------------------------------------ */
/* Panels and dialogs                                                  */
/* ------------------------------------------------------------------ */

/** Right-side panel for viewing one record. */
export const DetailSheet: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ open, onOpenChange, title, subtitle, children, footer }) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
      <SheetHeader className="border-b border-slate-100 px-5 py-4 pr-14 text-left">
        <SheetTitle className="text-base font-semibold text-slate-900">{title}</SheetTitle>
        <SheetDescription className={cn('text-xs text-slate-500', !subtitle && 'sr-only')}>
          {subtitle || title}
        </SheetDescription>
      </SheetHeader>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">{children}</div>
      {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
    </SheetContent>
  </Sheet>
);

/** Centered dialog for forms. Footer has Cancel + primary button. */
export const FormDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  submitLabel: string;
  cancelLabel?: string;
  onSubmit: () => void | Promise<void>;
  busy?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  size?: 'sm' | 'md' | 'lg';
}> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  submitLabel,
  cancelLabel = 'বাতিল',
  onSubmit,
  busy,
  disabled,
  destructive,
  size = 'md',
}) => (
  <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
    <DialogContent
      className={cn('gap-0 p-0', size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg')}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && !disabled) onSubmit();
        }}
      >
        <DialogHeader className="border-b border-slate-100 px-5 py-4 pr-14 text-left">
          <DialogTitle className="text-base font-semibold text-slate-900">{title}</DialogTitle>
          <DialogDescription className={cn('text-xs text-slate-500', !description && 'sr-only')}>
            {description || title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 px-5 py-4">{children}</div>
        <DialogFooter className="mt-0 border-t border-slate-100 px-5 py-3">
          <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => onOpenChange(false)} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            size="sm"
            variant={destructive ? 'destructive' : 'default'}
            className="h-9 min-w-24"
            disabled={busy || disabled}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
);

/** Labelled form field wrapper. */
export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; className?: string }> = ({
  label,
  hint,
  children,
  className,
}) => (
  <label className={cn('block space-y-1', className)}>
    <span className="block text-xs font-medium text-slate-600">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
  </label>
);

/** Shared compact control classes for raw inputs/selects/textarea inside admin forms. */
export const inputCls =
  'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-[#006A4E] focus:ring-2 focus:ring-[#006A4E]/15 disabled:bg-slate-50 disabled:text-slate-500';

/**
 * Confirm a risky action. Optionally asks for a reason (sent to onConfirm).
 * Usage: <ConfirmDialog open title="ব্লক করবেন?" confirmLabel="ব্লক" destructive onConfirm={...} />
 */
export const ConfirmDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  askReason?: { label: string; placeholder?: string; minLength?: number; defaultValue?: string };
  onConfirm: (reason: string) => void | Promise<void>;
}> = ({ open, onOpenChange, title, description, confirmLabel, cancelLabel, destructive, askReason, onConfirm }) => {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState(askReason?.defaultValue || '');
  React.useEffect(() => {
    if (open) setReason(askReason?.defaultValue || '');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const tooShort = !!askReason && reason.trim().length < (askReason.minLength ?? 1);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      submitLabel={confirmLabel}
      cancelLabel={cancelLabel}
      destructive={destructive}
      size="sm"
      busy={busy}
      disabled={tooShort}
      onSubmit={async () => {
        setBusy(true);
        try {
          await onConfirm(reason.trim());
          onOpenChange(false);
        } catch {
          // The caller shows the error (notify.err). Keep the dialog open so the user can retry.
        } finally {
          setBusy(false);
        }
      }}
    >
      {askReason ? (
        <Field label={askReason.label}>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={askReason.placeholder}
            rows={3}
            className="min-h-0 rounded-lg text-sm"
          />
        </Field>
      ) : (
        <p className="text-sm text-slate-600">{description}</p>
      )}
    </FormDialog>
  );
};

/* ------------------------------------------------------------------ */
/* Feedback                                                            */
/* ------------------------------------------------------------------ */

/** Pulls the friendliest message out of an axios error or API response. */
export const apiMessage = (err: any, lang: 'bn' | 'en', fallback?: string): string => {
  const d = err?.response?.data ?? err;
  const msg = lang === 'bn' ? d?.message_bn || d?.message_en : d?.message_en || d?.message_bn;
  return msg || d?.message || fallback || (lang === 'bn' ? 'কিছু একটা সমস্যা হয়েছে' : 'Something went wrong');
};

export const notify = {
  ok: (text: string) => toast.success(text),
  err: (err: any, lang: 'bn' | 'en', fallback?: string) => toast.error(apiMessage(err, lang, fallback)),
};

/* ------------------------------------------------------------------ */
/* Shortcuts                                                           */
/* ------------------------------------------------------------------ */

/**
 * Opens a page's "create" form when the shell's quick actions ask for it
 * (URL has ?new=1, or the `admin:new` event fires while the page is open).
 * Usage in a page:  useCreateIntent(() => setCreateOpen(true));
 */
export const useCreateIntent = (open: () => void) => {
  const ref = React.useRef(open);
  ref.current = open;
  React.useEffect(() => {
    const check = () => {
      const url = new URL(window.location.href);
      if (url.searchParams.get('new') === '1') {
        url.searchParams.delete('new');
        window.history.replaceState(window.history.state, '', url.pathname + url.search);
        ref.current();
      }
    };
    check();
    window.addEventListener('admin:new', check);
    return () => window.removeEventListener('admin:new', check);
  }, []);
};
