import React, { useEffect, useMemo, useState } from 'react';
import {
  ArchiveRestore,
  Eye,
  ExternalLink,
  Flame,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  Send,
  Trash2,
  Undo2,
  Upload,
  XCircle,
} from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { toBanglaDigits } from '@/theme/tokens';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AdminPage,
  ConfirmDialog,
  DataTable,
  DetailList,
  DetailSheet,
  EmptyRow,
  Field,
  FormDialog,
  LoadingRows,
  PageToolbar,
  Section,
  StatusBadge,
  Tone,
  inputCls,
  notify,
  useCreateIntent,
} from '@/components/admin/kit';

/* ------------------------------------------------------------------ */
/* Shared manager for notices and blog posts                           */
/* Backend: ContentWorkflowController (list/save/transition/softDelete) */
/* ------------------------------------------------------------------ */

export type ContentKind = 'notice' | 'blog';
type Opt = { value: string; bn: string; en: string };

/** Notice categories used by the seeded data and the public notice board. */
const NOTICE_CATEGORIES: Opt[] = [
  { value: 'OFFICE_NOTICE', bn: 'অফিস নোটিশ', en: 'Office notice' },
  { value: 'CIRCULAR_POLICY', bn: 'পরিপত্র', en: 'Circular' },
  { value: 'GAZETTE', bn: 'গেজেট', en: 'Gazette' },
  { value: 'PUBLIC_HEARING', bn: 'গণশুনানি', en: 'Public hearing' },
  { value: 'FRAUD_WARNING', bn: 'প্রতারণা সতর্কতা', en: 'Fraud warning' },
];

const NOTICE_SCOPES: Opt[] = [
  { value: 'NATIONAL', bn: 'জাতীয়', en: 'National' },
  { value: 'DIVISIONAL', bn: 'বিভাগ', en: 'Division' },
  { value: 'DISTRICT', bn: 'জেলা', en: 'District' },
  { value: 'UPAZILA', bn: 'উপজেলা', en: 'Upazila' },
];

/** Slugs that exist in blog_categories (unknown slugs get a generic name on the server). */
const BLOG_CATEGORIES: Opt[] = [
  { value: 'land-literacy', bn: 'ভূমি সাক্ষরতা', en: 'Land literacy' },
  { value: 'fraud-alerts', bn: 'প্রতারণা সতর্কতা', en: 'Fraud alerts' },
  { value: 'statutory-rules', bn: 'আইন ও বিধি', en: 'Rules' },
];

const STATUS: Record<string, { tone: Tone; bn: string; en: string }> = {
  DRAFT: { tone: 'slate', bn: 'খসড়া', en: 'Draft' },
  SUBMITTED: { tone: 'amber', bn: 'জমা হয়েছে', en: 'Submitted' },
  PUBLISHED: { tone: 'green', bn: 'প্রকাশিত', en: 'Published' },
  REJECTED: { tone: 'red', bn: 'ফেরত', en: 'Returned' },
  DELETED: { tone: 'slate', bn: 'মুছে ফেলা', en: 'Deleted' },
};

type TabKey = 'ALL' | 'DRAFT' | 'SUBMITTED' | 'PUBLISHED' | 'DELETED';
const inTab = (status: string, tab: TabKey) => {
  const s = String(status || 'DRAFT').toUpperCase();
  if (tab === 'ALL') return s !== 'DELETED';
  if (tab === 'DRAFT') return s === 'DRAFT' || s === 'REJECTED';
  return s === tab;
};

const REVIEWER_ROLES = ['content_approver', 'admin', 'system_admin'];
const EDITOR_ROLES = ['content_editor', 'admin', 'system_admin'];

type FormState = {
  title_bn: string;
  title_en: string;
  body_bn: string;
  body_en: string;
  category: string;
  scope: string;
  is_pinned: boolean;
  is_urgent: boolean;
  reading_time_minutes: string;
};

const MIN = 3; // backend: each title/body must be at least 3 characters
const ok = (v: string) => v.trim().length >= MIN;

export const ContentManager: React.FC<{ kind: ContentKind }> = ({ kind }) => {
  const { lang, t, user } = useAppUI();
  const n = (v: number | string) => toBanglaDigits(v, lang);
  const isNotice = kind === 'notice';
  const categories = isNotice ? NOTICE_CATEGORIES : BLOG_CATEGORIES;
  const role = String((user as any)?.role || '');
  const canReview = REVIEWER_ROLES.includes(role);
  const canEdit = EDITOR_ROLES.includes(role);

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('ALL');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(kind));
  const [bodyLang, setBodyLang] = useState<'bn' | 'en'>('bn');
  const [saving, setSaving] = useState(false);

  const [preview, setPreview] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await BhumiApi.listManagedContent({ kind });
      const list = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
      setItems(list);
      // keep an open preview in sync with fresh data
      setPreview((p: any) => (p ? list.find((x: any) => x.id === p.id) || null : p));
    } catch (e) {
      setItems([]);
      notify.err(e, lang);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(kind));
    setBodyLang('bn');
    setFormOpen(true);
  };
  useCreateIntent(() => openCreate());

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      title_bn: item.title_bn || '',
      title_en: item.title_en || '',
      body_bn: item.body_bn || '',
      body_en: item.body_en || '',
      category: (isNotice ? item.category : item.category_slug) || categories[0].value,
      scope: item.scope || 'NATIONAL',
      is_pinned: Boolean(Number(item.is_pinned)),
      is_urgent: Boolean(Number(item.is_urgent)),
      reading_time_minutes: item.reading_time_minutes ? String(item.reading_time_minutes) : '',
    });
    setBodyLang('bn');
    setFormOpen(true);
  };

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { ALL: 0, DRAFT: 0, SUBMITTED: 0, PUBLISHED: 0, DELETED: 0 };
    for (const it of items) (Object.keys(c) as TabKey[]).forEach((k) => inTab(it.status, k) && c[k]++);
    return c;
  }, [items]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (!inTab(it.status, tab)) return false;
      if (!q) return true;
      return [it.title_bn, it.title_en, it.notice_slug, it.post_slug].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [items, tab, search]);

  const valid = ok(form.title_bn) && ok(form.title_en) && ok(form.body_bn) && ok(form.body_en);

  const save = async () => {
    setSaving(true);
    try {
      // ContentWorkflowController::save reads `kind` from the body.
      // On update (PUT) only titles/bodies are stored and the item returns to DRAFT.
      const payload: Record<string, any> = {
        kind,
        title_bn: form.title_bn.trim(),
        title_en: form.title_en.trim(),
        body_bn: form.body_bn.trim(),
        body_en: form.body_en.trim(),
      };
      if (isNotice) {
        payload.category = form.category;
        payload.scope = form.scope;
        payload.is_pinned = form.is_pinned;
        payload.is_urgent = form.is_urgent;
      } else {
        payload.category_slug = form.category;
        const rt = parseInt(form.reading_time_minutes, 10);
        if (rt > 0) payload.reading_time_minutes = rt;
      }
      await BhumiApi.saveManagedContent(payload, editing?.id);
      notify.ok(t('সংরক্ষণ হয়েছে', 'Saved'));
      setFormOpen(false);
      await load();
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setSaving(false);
    }
  };

  const transition = async (item: any, status: string, done: [string, string]) => {
    try {
      await BhumiApi.transitionManagedContent(item.id, { kind, status });
      notify.ok(t(done[0], done[1]));
    } catch (e) {
      notify.err(e, lang);
    } finally {
      await load();
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await BhumiApi.deleteManagedContent(deleteTarget.id, { kind });
      notify.ok(t('মুছে ফেলা হয়েছে', 'Deleted'));
      if (preview?.id === deleteTarget.id) setPreview(null);
    } catch (e) {
      notify.err(e, lang);
      throw e; // keep the confirm dialog open
    } finally {
      await load();
    }
  };

  /** Workflow actions offered for a given status (mirrors ContentWorkflowController::transition). */
  const workflowActions = (item: any) => {
    const s = String(item.status || 'DRAFT').toUpperCase();
    const list: Array<{ key: string; icon: React.ElementType; label: string; run: () => void; primary?: boolean }> = [];
    if (s === 'DRAFT' || s === 'REJECTED')
      list.push({
        key: 'submit',
        icon: Send,
        label: t('জমা দিন', 'Submit'),
        primary: true,
        run: () => transition(item, 'SUBMITTED', ['জমা হয়েছে', 'Submitted']),
      });
    if (s === 'SUBMITTED' && canReview) {
      list.push({
        key: 'publish',
        icon: Upload,
        label: t('প্রকাশ করুন', 'Publish'),
        primary: true,
        run: () => transition(item, 'PUBLISHED', ['প্রকাশিত হয়েছে', 'Published']),
      });
      list.push({
        key: 'reject',
        icon: XCircle,
        label: t('ফেরত দিন', 'Return'),
        run: () => transition(item, 'REJECTED', ['ফেরত দেওয়া হয়েছে', 'Returned']),
      });
    }
    if (s === 'PUBLISHED')
      list.push({
        key: 'unpublish',
        icon: Undo2,
        label: t('প্রকাশ বন্ধ', 'Unpublish'),
        run: () => transition(item, 'DRAFT', ['খসড়ায় ফেরত', 'Moved to draft']),
      });
    if (s === 'DELETED')
      list.push({
        key: 'restore',
        icon: ArchiveRestore,
        label: t('ফিরিয়ে আনুন', 'Restore'),
        primary: true,
        run: () => transition(item, 'DRAFT', ['ফিরিয়ে আনা হয়েছে', 'Restored']),
      });
    return list;
  };

  const catLabel = (item: any) => {
    const v = isNotice ? item.category : item.category_slug;
    const hit = categories.find((c) => c.value === v);
    return hit ? (lang === 'bn' ? hit.bn : hit.en) : v ? String(v).replace(/[_-]/g, ' ').toLowerCase() : '—';
  };
  const scopeLabel = (v: string) => {
    const hit = NOTICE_SCOPES.find((s) => s.value === v);
    return hit ? (lang === 'bn' ? hit.bn : hit.en) : v || '—';
  };
  const fmtDate = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const title = (item: any) => (lang === 'bn' ? item.title_bn || item.title_en : item.title_en || item.title_bn) || '—';
  const statusBadge = (code: string) => {
    const s = STATUS[String(code || 'DRAFT').toUpperCase()] || STATUS.DRAFT;
    return <StatusBadge tone={s.tone}>{lang === 'bn' ? s.bn : s.en}</StatusBadge>;
  };

  const noun = isNotice ? t('নোটিশ', 'notice') : t('লেখা', 'post');
  const newLabel = isNotice ? t('নতুন নোটিশ', 'New notice') : t('নতুন লেখা', 'New post');
  const publicPath = `/${lang}/${isNotice ? 'notices' : 'blog'}`;
  const editingNonDraft = editing && String(editing.status).toUpperCase() !== 'DRAFT';

  const cols = 4;
  const tabs: Array<[TabKey, string]> = [
    ['ALL', t('সব', 'All')],
    ['DRAFT', t('খসড়া', 'Draft')],
    ['SUBMITTED', t('জমা', 'Submitted')],
    ['PUBLISHED', t('প্রকাশিত', 'Published')],
    ['DELETED', t('মুছে ফেলা', 'Deleted')],
  ];

  return (
    <AdminPage fill>
      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('শিরোনাম খুঁজুন…', 'Search title…')}
        filters={
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
            <TabsList className="h-9">
              {tabs.map(([k, label]) => (
                <TabsTrigger key={k} value={k} className="gap-1.5 px-2.5 text-xs sm:text-sm">
                  {label}
                  {!loading && <span className="text-xs text-slate-400">{n(counts[k])}</span>}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
        actions={
          <>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9"
                    aria-label={t('সাইটে দেখুন', 'View site')}
                    onClick={() => window.open(publicPath, '_blank', 'noopener')}
                  >
                    <ExternalLink className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('সাইটে দেখুন', 'View site')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {canEdit && (
              <Button size="sm" className="h-9 gap-1.5" onClick={openCreate}>
                <Plus className="size-4" />
                {newLabel}
              </Button>
            )}
          </>
        }
      />

      <Section fill>
        <DataTable
          headers={[
            t('শিরোনাম', 'Title'),
            isNotice ? t('এলাকা', 'Scope') : t('লেখক', 'Author'),
            t('অবস্থা', 'Status'),
            '',
          ]}
          alignRight={[3]}
        >
          {loading ? (
            <LoadingRows cols={cols} />
          ) : visible.length === 0 ? (
            <EmptyRow
              cols={cols}
              text={search ? t('কিছু পাওয়া যায়নি', 'Nothing found') : t(`কোনো ${noun} নেই`, `No ${noun}s`)}
              action={
                !search && tab === 'ALL' && canEdit ? (
                  <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={openCreate}>
                    <Plus className="size-3.5" />
                    {newLabel}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            visible.map((item) => {
              const deleted = String(item.status).toUpperCase() === 'DELETED';
              const flow = workflowActions(item);
              return (
                <tr key={item.id} className="cursor-pointer" onClick={() => setPreview(item)}>
                  <td className="max-w-0 w-full">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {isNotice && Boolean(Number(item.is_pinned)) && <Pin className="size-3.5 shrink-0 text-sky-600" />}
                      {isNotice && Boolean(Number(item.is_urgent)) && <Flame className="size-3.5 shrink-0 text-rose-600" />}
                      <span className="truncate font-medium text-slate-800">{title(item)}</span>
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {catLabel(item)} · {fmtDate(item.published_at && item.status === 'PUBLISHED' ? item.published_at : item.created_at)}
                    </div>
                  </td>
                  <td className="max-w-56 truncate whitespace-nowrap text-slate-600">
                    {isNotice ? scopeLabel(item.scope) : (lang === 'bn' ? item.author_name_bn : item.author_name_en) || '—'}
                  </td>
                  <td>{statusBadge(item.status)}</td>
                  <td className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8" aria-label={t('কাজ', 'Actions')}>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onSelect={() => setPreview(item)}>
                          <Eye className="size-4" />
                          {t('দেখুন', 'View')}
                        </DropdownMenuItem>
                        {!deleted && canEdit && (
                          <DropdownMenuItem onSelect={() => openEdit(item)}>
                            <Pencil className="size-4" />
                            {t('সম্পাদনা', 'Edit')}
                          </DropdownMenuItem>
                        )}
                        {flow.map((a) => {
                          const Icon = a.icon;
                          return (
                            <DropdownMenuItem key={a.key} onSelect={a.run}>
                              <Icon className="size-4" />
                              {a.label}
                            </DropdownMenuItem>
                          );
                        })}
                        {!deleted && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onSelect={() => setDeleteTarget(item)}>
                              <Trash2 className="size-4" />
                              {t('মুছুন', 'Delete')}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })
          )}
        </DataTable>
      </Section>

      {/* Create / edit */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        size="lg"
        title={editing ? t('সম্পাদনা', 'Edit') : newLabel}
        description={editingNonDraft ? t('সংরক্ষণে খসড়া হবে', 'Saving makes it a draft') : undefined}
        submitLabel={t('সংরক্ষণ', 'Save')}
        cancelLabel={t('বাতিল', 'Cancel')}
        busy={saving}
        disabled={!valid}
        onSubmit={save}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('শিরোনাম বাংলা', 'Title Bangla')}>
            <input
              className={inputCls}
              value={form.title_bn}
              onChange={(e) => setForm({ ...form, title_bn: e.target.value })}
              autoFocus
            />
          </Field>
          <Field label={t('শিরোনাম ইংরেজি', 'Title English')}>
            <input className={inputCls} value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
          </Field>
        </div>

        <Field label={t('ধরন', 'Category')}>
          <select
            className={inputCls}
            value={form.category}
            disabled={!!editing}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {!categories.some((c) => c.value === form.category) && <option value={form.category}>{form.category}</option>}
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {lang === 'bn' ? c.bn : c.en}
              </option>
            ))}
          </select>
        </Field>

        <Tabs value={bodyLang} onValueChange={(v) => setBodyLang(v as 'bn' | 'en')}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">{t('বিবরণ', 'Body')}</span>
            <TabsList className="h-8">
              <TabsTrigger value="bn" className="gap-1.5 px-2.5 text-xs">
                {t('বাংলা', 'Bangla')}
                {!ok(form.body_bn) && <span className="size-1.5 rounded-full bg-amber-500" />}
              </TabsTrigger>
              <TabsTrigger value="en" className="gap-1.5 px-2.5 text-xs">
                {t('ইংরেজি', 'English')}
                {!ok(form.body_en) && <span className="size-1.5 rounded-full bg-amber-500" />}
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="bn" className="mt-1.5">
            <Textarea
              rows={8}
              value={form.body_bn}
              onChange={(e) => setForm({ ...form, body_bn: e.target.value })}
              className="min-h-40 rounded-lg text-sm"
              aria-label={t('বিবরণ বাংলা', 'Body Bangla')}
            />
          </TabsContent>
          <TabsContent value="en" className="mt-1.5">
            <Textarea
              rows={8}
              value={form.body_en}
              onChange={(e) => setForm({ ...form, body_en: e.target.value })}
              className="min-h-40 rounded-lg text-sm"
              aria-label={t('বিবরণ ইংরেজি', 'Body English')}
            />
          </TabsContent>
        </Tabs>

        <Accordion type="single" collapsible>
          <AccordionItem value="more" className="border-b-0">
            <AccordionTrigger className="py-2 text-xs font-medium text-slate-600 hover:no-underline">
              {t('আরও তথ্য', 'More details')}
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-1">
              {editing && (
                <DetailList
                  items={[[t('স্লাগ', 'Slug'), <span className="font-mono text-xs">{editing.notice_slug || editing.post_slug || '—'}</span>]]}
                />
              )}
              {isNotice ? (
                <>
                  <Field label={t('এলাকা', 'Scope')}>
                    <select
                      className={inputCls}
                      value={form.scope}
                      disabled={!!editing}
                      onChange={(e) => setForm({ ...form, scope: e.target.value })}
                    >
                      {!NOTICE_SCOPES.some((s) => s.value === form.scope) && <option value={form.scope}>{form.scope}</option>}
                      {NOTICE_SCOPES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {lang === 'bn' ? s.bn : s.en}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <Switch
                        checked={form.is_pinned}
                        disabled={!!editing}
                        onCheckedChange={(v) => setForm({ ...form, is_pinned: v })}
                      />
                      {t('উপরে রাখুন', 'Pin to top')}
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <Switch
                        checked={form.is_urgent}
                        disabled={!!editing}
                        onCheckedChange={(v) => setForm({ ...form, is_urgent: v })}
                      />
                      {t('জরুরি', 'Urgent')}
                    </label>
                  </div>
                </>
              ) : (
                <Field label={t('পড়ার সময় মিনিট', 'Reading minutes')}>
                  <input
                    type="number"
                    min={1}
                    className={inputCls}
                    value={form.reading_time_minutes}
                    disabled={!!editing}
                    placeholder={t('স্বয়ংক্রিয়', 'Auto')}
                    onChange={(e) => setForm({ ...form, reading_time_minutes: e.target.value })}
                  />
                </Field>
              )}
              {editing && <p className="text-xs text-slate-400">{t('এগুলো পরে বদলানো যায় না', 'Fixed after creation')}</p>}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </FormDialog>

      {/* Preview */}
      <DetailSheet
        open={!!preview}
        onOpenChange={(o) => !o && setPreview(null)}
        title={preview ? title(preview) : ''}
        subtitle={preview ? catLabel(preview) : undefined}
        footer={
          preview && (
            <>
              {String(preview.status).toUpperCase() !== 'DELETED' && canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5"
                  onClick={() => {
                    const p = preview;
                    setPreview(null);
                    openEdit(p);
                  }}
                >
                  <Pencil className="size-4" />
                  {t('সম্পাদনা', 'Edit')}
                </Button>
              )}
              {workflowActions(preview).map((a) => {
                const Icon = a.icon;
                return (
                  <Button
                    key={a.key}
                    size="sm"
                    variant={a.primary ? 'default' : 'outline'}
                    className="h-9 gap-1.5"
                    onClick={a.run}
                  >
                    <Icon className="size-4" />
                    {a.label}
                  </Button>
                );
              })}
            </>
          )
        }
      >
        {preview && (
          <>
            <DetailList
              items={[
                [t('অবস্থা', 'Status'), statusBadge(preview.status)],
                [t('ধরন', 'Category'), catLabel(preview)],
                isNotice && [t('এলাকা', 'Scope'), scopeLabel(preview.scope)],
                isNotice &&
                  (Boolean(Number(preview.is_pinned)) || Boolean(Number(preview.is_urgent))) && [
                    t('চিহ্ন', 'Flags'),
                    <span className="inline-flex gap-1.5">
                      {Boolean(Number(preview.is_pinned)) && <StatusBadge tone="blue">{t('উপরে', 'Pinned')}</StatusBadge>}
                      {Boolean(Number(preview.is_urgent)) && <StatusBadge tone="red">{t('জরুরি', 'Urgent')}</StatusBadge>}
                    </span>,
                  ],
                !isNotice && [t('লেখক', 'Author'), (lang === 'bn' ? preview.author_name_bn : preview.author_name_en) || '—'],
                !isNotice &&
                  preview.reading_time_minutes && [t('পড়ার সময়', 'Reading time'), t(`${n(preview.reading_time_minutes)} মিনিট`, `${preview.reading_time_minutes} min`)],
                [t('তৈরি', 'Created'), fmtDate(preview.created_at)],
                String(preview.status).toUpperCase() === 'PUBLISHED' && [t('প্রকাশ', 'Published'), fmtDate(preview.published_at)],
              ]}
            />
            <Tabs defaultValue={lang}>
              <TabsList className="h-8">
                <TabsTrigger value="bn" className="px-2.5 text-xs">
                  {t('বাংলা', 'Bangla')}
                </TabsTrigger>
                <TabsTrigger value="en" className="px-2.5 text-xs">
                  {t('ইংরেজি', 'English')}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="bn" className="mt-2 space-y-1.5">
                <p className="text-sm font-medium text-slate-800">{preview.title_bn || '—'}</p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{preview.body_bn || '—'}</p>
              </TabsContent>
              <TabsContent value="en" className="mt-2 space-y-1.5">
                <p className="text-sm font-medium text-slate-800">{preview.title_en || '—'}</p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{preview.body_en || '—'}</p>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DetailSheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t('মুছে ফেলবেন?', 'Delete?')}
        description={deleteTarget ? title(deleteTarget) : undefined}
        confirmLabel={t('মুছুন', 'Delete')}
        cancelLabel={t('বাতিল', 'Cancel')}
        destructive
        onConfirm={remove}
      />
    </AdminPage>
  );
};

function emptyForm(kind: ContentKind): FormState {
  return {
    title_bn: '',
    title_en: '',
    body_bn: '',
    body_en: '',
    category: kind === 'notice' ? NOTICE_CATEGORIES[0].value : BLOG_CATEGORIES[0].value,
    scope: 'NATIONAL',
    is_pinned: false,
    is_urgent: false,
    reading_time_minutes: '',
  };
}

export const AdminNoticePage: React.FC = () => <ContentManager kind="notice" />;
