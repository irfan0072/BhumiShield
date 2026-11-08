import React, { useMemo, useState } from 'react';
import { Eye, Plus, Send, Trash2 } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  AdminPage,
  ConfirmDialog,
  DataTable,
  EmptyRow,
  Field,
  FormDialog,
  LoadingRows,
  PageToolbar,
  Section,
  inputCls,
  notify,
  useCreateIntent,
} from '@/components/admin/kit';
import { BatchSheet } from './BatchSheet';
import { BatchStatus, SectionProps, canMakeBatch, up, useFmt, useSectionIntent } from './shared';

export type SurveyType = 'BS' | 'RS' | 'SA' | 'CS' | 'DIGITAL';
export interface StagedSurveyItem {
  survey_type: SurveyType;
  mouza: string;
  dag_no: string;
  khatian_no?: string;
  land_class: string;
  area_decimal: number;
  owner_name_bn: string;
  owner_name_en: string;
  nid?: string;
}

const SURVEYS: Array<[SurveyType, string, string]> = [
  ['BS', 'বিএস', 'BS'],
  ['RS', 'আরএস', 'RS'],
  ['SA', 'এসএ', 'SA'],
  ['CS', 'সিএস', 'CS'],
  ['DIGITAL', 'ডিজিটাল জরিপ', 'Digital'],
];
const MOUZAS: Array<[string, string]> = [
  ['Birulia', 'বিরুলিয়া'],
  ['Savar', 'সাভার'],
  ['Dhamrai', 'ধামরাই'],
  ['Ashulia', 'আশুলিয়া'],
];
const LAND_CLASSES: Array<[string, string]> = [
  ['নাল', 'Agricultural'],
  ['ভিটি', 'Highland'],
  ['বাড়ি', 'Residential'],
  ['বাগান', 'Garden'],
  ['পুকুর', 'Pond'],
  ['চালা', 'Commercial'],
];

const EMPTY_FORM = {
  survey_type: 'BS' as SurveyType,
  mouza: 'Birulia',
  dag_no: '',
  khatian_no: '',
  land_class: 'নাল',
  area: '',
  owner_bn: '',
  owner_en: '',
  nid: '',
};

type View = 'batches' | 'staged';
type StatusFilter = 'ALL' | 'SUBMITTED' | 'RETURNED' | 'APPROVED' | 'REJECTED';

export const SurveyBatchesSection: React.FC<
  SectionProps & { staged: StagedSurveyItem[]; setStaged: React.Dispatch<React.SetStateAction<StagedSurveyItem[]>> }
> = ({ data, loaded, reload, intent, clearIntent, staged, setStaged }) => {
  const { role } = useAppUI();
  const { lang, t, n, date, dec } = useFmt();
  const canMake = canMakeBatch(role);
  const batches = data.batches;

  const [view, setView] = useState<View>('batches');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [openBatch, setOpenBatch] = useState<number | string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const openAdd = () => {
    setForm((f) => ({ ...EMPTY_FORM, survey_type: f.survey_type, mouza: f.mouza }));
    setAddOpen(true);
  };
  useCreateIntent(() => canMake && openAdd());
  useSectionIntent('survey_batches', intent, clearIntent, loaded, (i) => {
    if (i.create && canMake) openAdd();
    else if (i.recordId !== undefined) setOpenBatch(i.recordId);
  });

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { ALL: batches.length, SUBMITTED: 0, RETURNED: 0, APPROVED: 0, REJECTED: 0 };
    batches.forEach((b) => {
      const s = up(b.status) as StatusFilter;
      if (s in c && s !== 'ALL') c[s] += 1;
    });
    return c;
  }, [batches]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return batches.filter((b) => {
      if (status !== 'ALL' && up(b.status) !== status) return false;
      if (!q) return true;
      return [b.batch_no, b.maker_name_bn, b.record_type].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [batches, status, search]);

  const addItem = () => {
    const item: StagedSurveyItem = {
      survey_type: form.survey_type,
      mouza: form.mouza,
      dag_no: form.dag_no.trim(),
      land_class: form.land_class,
      area_decimal: Number(form.area),
      owner_name_bn: form.owner_bn.trim(),
      owner_name_en: form.owner_en.trim() || form.owner_bn.trim(),
    };
    if (form.khatian_no.trim()) item.khatian_no = form.khatian_no.trim();
    if (form.nid.trim()) item.nid = form.nid.trim();
    setStaged((prev) => [...prev, item]);
    setAddOpen(false);
    setView('staged');
    notify.ok(t('তালিকায় যোগ হয়েছে', 'Added to list'));
  };

  const submitBatch = async () => {
    try {
      const res = await BhumiApi.createOnboardingBatch({ record_type: 'SURVEY_RECORD', items: staged });
      notify.ok(
        lang === 'bn'
          ? `ব্যাচ ${res?.batch?.batch_no || ''} জমা হয়েছে`
          : `Batch ${res?.batch?.batch_no || ''} submitted`
      );
      setStaged([]);
      setView('batches');
      await reload();
    } catch (e) {
      notify.err(e, lang);
      throw e;
    }
  };

  const formValid = !!form.dag_no.trim() && Number(form.area) > 0 && !!form.owner_bn.trim() && (!form.nid.trim() || form.nid.trim().length >= 10);
  const statusTabs: Array<[StatusFilter, string]> = [
    ['ALL', t('সব', 'All')],
    ['SUBMITTED', t('যাচাই বাকি', 'Waiting')],
    ['RETURNED', t('ফেরত', 'Returned')],
    ['APPROVED', t('অনুমোদিত', 'Approved')],
    ['REJECTED', t('বাতিল', 'Rejected')],
  ];
  const surveyName = (c: string) => {
    const hit = SURVEYS.find((s) => s[0] === c);
    return hit ? (lang === 'bn' ? hit[1] : hit[2]) : c;
  };
  const mouzaName = (c: string) => {
    const hit = MOUZAS.find((m) => m[0] === c);
    return hit ? (lang === 'bn' ? hit[1] : hit[0]) : c;
  };

  return (
    <AdminPage fill>
      <PageToolbar
        search={view === 'batches' ? search : undefined}
        onSearch={view === 'batches' ? setSearch : undefined}
        placeholder={t('ব্যাচ নং বা নাম…', 'Batch no or name…')}
        filters={
          <>
            {canMake && (
              <Tabs value={view} onValueChange={(v) => setView(v as View)}>
                <TabsList className="h-9">
                  <TabsTrigger value="batches" className="gap-1.5 px-3 text-xs">
                    {t('জমা দেওয়া ব্যাচ', 'Submitted')}
                    <span className="text-slate-400">{n(batches.length)}</span>
                  </TabsTrigger>
                  <TabsTrigger value="staged" className="gap-1.5 px-3 text-xs">
                    {t('প্রস্তুত তালিকা', 'Draft list')}
                    <span className="text-slate-400">{n(staged.length)}</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            {view === 'batches' && (
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                className={cn(inputCls, 'w-40')}
                aria-label={t('অবস্থা', 'Status')}
              >
                {statusTabs.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l} ({n(counts[k])})
                  </option>
                ))}
              </select>
            )}
          </>
        }
        actions={
          canMake && (
            <>
              {view === 'staged' && staged.length > 0 && (
                <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setConfirmSubmit(true)}>
                  <Send className="size-4" />
                  {t('ব্যাচ জমা দিন', 'Submit batch')}
                </Button>
              )}
              <Button size="sm" className="h-9 gap-1.5" onClick={openAdd}>
                <Plus className="size-4" />
                {t('রেকর্ড যোগ', 'Add record')}
              </Button>
            </>
          )
        }
      />

      <Section fill>
        {view === 'batches' ? (
          <DataTable headers={[t('ব্যাচ', 'Batch'), t('প্রস্তুতকারী', 'Prepared by'), t('রেকর্ড', 'Records'), t('অবস্থা', 'Status'), '']} alignRight={[4]}>
            {!loaded ? (
              <LoadingRows cols={5} />
            ) : rows.length === 0 ? (
              <EmptyRow cols={5} text={t('কোনো ব্যাচ নেই', 'No batches')} />
            ) : (
              rows.map((b) => (
                <tr key={b.id} className="cursor-pointer" onClick={() => setOpenBatch(b.id)}>
                  <td>
                    <div className="font-medium text-slate-900">{b.batch_no}</div>
                    <div className="text-xs text-slate-500">{date(b.created_at)}</div>
                  </td>
                  <td>
                    <div className="text-slate-800">{b.maker_name_bn || '—'}</div>
                    {b.checker_name_bn && (
                      <div className="text-xs text-slate-500">
                        {t('যাচাই', 'Checked')}: {b.checker_name_bn}
                      </div>
                    )}
                  </td>
                  <td className="text-slate-800">{n(b.item_count ?? b.total_items ?? '—')}</td>
                  <td>
                    <BatchStatus code={b.status} />
                  </td>
                  <td className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={t('বিস্তারিত', 'Details')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenBatch(b.id);
                      }}
                    >
                      <Eye className="size-4 text-slate-500" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </DataTable>
        ) : (
          <DataTable headers={[t('জমি', 'Land'), t('মালিক', 'Owner'), t('জমির পরিমাণ', 'Area'), t('জরিপ', 'Survey'), '']} alignRight={[4]}>
            {staged.length === 0 ? (
              <EmptyRow
                cols={5}
                text={t('তালিকা খালি', 'List is empty')}
                action={
                  <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={openAdd}>
                    <Plus className="size-3.5" />
                    {t('রেকর্ড যোগ', 'Add record')}
                  </Button>
                }
              />
            ) : (
              staged.map((s, i) => (
                <tr key={i}>
                  <td>
                    <div className="text-slate-800">
                      {t('দাগ', 'Plot')} {n(s.dag_no)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {mouzaName(s.mouza)}
                      {s.khatian_no ? ` · ${t('খতিয়ান', 'Khatian')} ${n(s.khatian_no)}` : ''}
                    </div>
                  </td>
                  <td>
                    <div className="text-slate-800">{s.owner_name_bn}</div>
                    {s.nid && <div className="text-xs text-slate-500">{n(s.nid)}</div>}
                  </td>
                  <td>
                    <div className="text-slate-800">{dec(s.area_decimal)}</div>
                    <div className="text-xs text-slate-500">{s.land_class}</div>
                  </td>
                  <td className="text-slate-800">{surveyName(s.survey_type)}</td>
                  <td className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={t('মুছুন', 'Remove')}
                      onClick={() => setStaged((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="size-4 text-slate-500" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </DataTable>
        )}
      </Section>

      <BatchSheet batchRef={openBatch} onClose={() => setOpenBatch(null)} reload={reload} />

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title={t('জরিপ রেকর্ড যোগ', 'Add survey record')}
        submitLabel={t('তালিকায় যোগ', 'Add to list')}
        cancelLabel={t('বাতিল', 'Cancel')}
        disabled={!formValid}
        onSubmit={addItem}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('জরিপ', 'Survey')}>
            <select value={form.survey_type} onChange={(e) => setForm({ ...form, survey_type: e.target.value as SurveyType })} className={inputCls}>
              {SURVEYS.map(([v, bn, en]) => (
                <option key={v} value={v}>
                  {lang === 'bn' ? bn : en}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('মৌজা', 'Mouza')}>
            <select value={form.mouza} onChange={(e) => setForm({ ...form, mouza: e.target.value })} className={inputCls}>
              {MOUZAS.map(([v, bn]) => (
                <option key={v} value={v}>
                  {lang === 'bn' ? bn : v}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('দাগ নম্বর', 'Plot no')}>
            <input required value={form.dag_no} onChange={(e) => setForm({ ...form, dag_no: e.target.value })} placeholder="128" className={inputCls} />
          </Field>
          <Field label={t('জমির পরিমাণ (শতক)', 'Area (dec)')}>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
              placeholder="12.5"
              className={inputCls}
            />
          </Field>
          <Field label={t('জমির শ্রেণি', 'Land class')}>
            <select value={form.land_class} onChange={(e) => setForm({ ...form, land_class: e.target.value })} className={inputCls}>
              {LAND_CLASSES.map(([bn, en]) => (
                <option key={bn} value={bn}>
                  {lang === 'bn' ? bn : en}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('মালিকের নাম', 'Owner name')}>
            <input
              required
              value={form.owner_bn}
              onChange={(e) => setForm({ ...form, owner_bn: e.target.value })}
              placeholder={t('বাংলায় পূর্ণ নাম', 'Full name in Bangla')}
              className={inputCls}
            />
          </Field>
        </div>
        <Accordion type="single" collapsible>
          <AccordionItem value="more" className="border-b-0">
            <AccordionTrigger className="py-2 text-xs text-slate-600">{t('আরও তথ্য', 'More details')}</AccordionTrigger>
            <AccordionContent className="grid gap-3 pb-1 sm:grid-cols-2">
              <Field label={t('খতিয়ান নম্বর', 'Khatian no')}>
                <input value={form.khatian_no} onChange={(e) => setForm({ ...form, khatian_no: e.target.value })} className={inputCls} />
              </Field>
              <Field label={t('মালিকের এনআইডি', 'Owner NID')} hint={t('অন্তত ১০ সংখ্যা', 'At least 10 digits')}>
                <input inputMode="numeric" value={form.nid} onChange={(e) => setForm({ ...form, nid: e.target.value })} className={inputCls} />
              </Field>
              <Field label={t('ইংরেজিতে নাম', 'Name in English')} className="sm:col-span-2">
                <input value={form.owner_en} onChange={(e) => setForm({ ...form, owner_en: e.target.value })} className={inputCls} />
              </Field>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </FormDialog>

      <ConfirmDialog
        open={confirmSubmit}
        onOpenChange={setConfirmSubmit}
        title={t('ব্যাচ জমা দেবেন?', 'Submit batch?')}
        description={lang === 'bn' ? `${n(staged.length)}টি রেকর্ড যাচাইয়ের জন্য যাবে` : `${staged.length} records go for checking`}
        confirmLabel={t('জমা দিন', 'Submit')}
        cancelLabel={t('বাতিল', 'Cancel')}
        onConfirm={submitBatch}
      />
    </AdminPage>
  );
};
