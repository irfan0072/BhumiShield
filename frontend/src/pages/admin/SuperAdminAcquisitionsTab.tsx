import React, { useMemo, useState } from 'react';
import { Banknote, Building2, Eye, FileText, LandPlot, Plus, RotateCcw } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { toBanglaDigits } from '@/theme/tokens';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  AdminPage,
  DataTable,
  DetailList,
  DetailSheet,
  EmptyRow,
  Field,
  FormDialog,
  PageToolbar,
  Section,
  StatCard,
  StatGrid,
  StatusBadge,
  StatusCode,
  Tone,
  inputCls,
  notify,
  useCreateIntent,
} from '@/components/admin/kit';

interface SuperAdminAcquisitionsTabProps {
  acquisitionCases: any[];
  onRefresh: () => void;
  onOpenOverride?: (type: string, id: string | number, extra?: any) => void;
}

type Lang = 'bn' | 'en';

const CASE_STATUS: Record<string, { tone: Tone; bn: string; en: string }> = {
  PRELIMINARY_NOTICE: { tone: 'blue', bn: 'প্রাথমিক নোটিশ', en: 'Notice' },
  NOTICE_ISSUED: { tone: 'blue', bn: 'নোটিশ জারি', en: 'Notice issued' },
  JOINT_VERIFICATION: { tone: 'amber', bn: 'যৌথ তদন্ত', en: 'Joint survey' },
  OBJECTIONS_HEARING: { tone: 'amber', bn: 'আপত্তি শুনানি', en: 'Hearing' },
  AWARD_DECREED: { tone: 'violet', bn: 'রোয়েদাদ', en: 'Award' },
  GAZETTE_PUBLISHED: { tone: 'green', bn: 'গেজেট প্রকাশিত', en: 'Gazetted' },
  COMPENSATION_PAID: { tone: 'green', bn: 'ক্ষতিপূরণ প্রদান', en: 'Paid' },
};
const CREATE_STATUSES = ['PRELIMINARY_NOTICE', 'NOTICE_ISSUED', 'JOINT_VERIFICATION', 'OBJECTIONS_HEARING', 'AWARD_DECREED', 'GAZETTE_PUBLISHED'];

const SECTIONS: Record<string, [string, string]> = {
  SECTION_4: ['ধারা ৪', 'Section 4'],
  SECTION_7: ['ধারা ৭', 'Section 7'],
  SECTION_8: ['ধারা ৮', 'Section 8'],
  SECTION_11: ['ধারা ১১', 'Section 11'],
};

const CaseStatus: React.FC<{ code?: string; lang: Lang }> = ({ code, lang }) => {
  const s = CASE_STATUS[String(code || '').toUpperCase()];
  if (!s) return <StatusCode code={code} lang={lang} />;
  return <StatusBadge tone={s.tone}>{lang === 'bn' ? s.bn : s.en}</StatusBadge>;
};

const fmtDate = (v: any, lang: Lang) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB');
};

const emptyForm = {
  project_name_bn: '',
  project_name_en: '',
  acquiring_agency_bn: '',
  district_bn: '',
  upazila_bn: '',
  mouza_bn: '',
  total_land_decimal: '',
  estimated_compensation_bdt: '',
  case_no: '',
  section_type: 'SECTION_4',
  status: 'PRELIMINARY_NOTICE',
  plot_ids: '',
  gazette_no: '',
  gazette_published_at: '',
};

/** "12, 15 ১৮" -> [12, 15, 18] (accepts Bangla digits, commas or spaces). */
const parsePlotIds = (raw: string): number[] => {
  const ascii = raw.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
  return Array.from(
    new Set(
      ascii
        .split(/[\s,،;]+/)
        .map((s) => Number(s))
        .filter((v) => Number.isInteger(v) && v > 0)
    )
  );
};

export const SuperAdminAcquisitionsTab: React.FC<SuperAdminAcquisitionsTabProps> = ({ acquisitionCases, onRefresh }) => {
  const { t, lang } = useAppUI();
  const n = (v: any) => toBanglaDigits(v, lang);
  const money = (v: any) => {
    const num = Number(v);
    return Number.isFinite(num) && num > 0 ? `৳ ${n(num.toLocaleString('en-IN'))}` : '—';
  };
  const land = (v: any) => {
    const num = Number(v);
    return Number.isFinite(num) && num > 0 ? `${n(Number(num.toFixed(2)))} ${t('শতাংশ', 'dec')}` : '—';
  };
  const sectionLabel = (code: any) => {
    const hit = SECTIONS[String(code || '').toUpperCase()];
    return hit ? (lang === 'bn' ? hit[0] : hit[1]) : code || '—';
  };

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const openCreate = () => {
    setForm(emptyForm);
    setCreateOpen(true);
  };
  useCreateIntent(openCreate);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.resolve(onRefresh());
    } finally {
      setRefreshing(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      acquisitionCases.filter((c) => {
        if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
        if (!q) return true;
        return [c.case_no, c.project_name_bn, c.project_name_en, c.acquiring_agency_bn, c.mouza_bn, c.upazila_bn, c.district_bn]
          .filter((v) => v != null)
          .some((v) => String(v).toLowerCase().includes(q));
      }),
    [acquisitionCases, statusFilter, q]
  );

  const statusesInData = useMemo(
    () => Array.from(new Set(acquisitionCases.map((c) => String(c.status || '')).filter(Boolean))),
    [acquisitionCases]
  );

  const totalLand = acquisitionCases.reduce((s, c) => s + (Number(c.total_land_decimal) || 0), 0);
  const totalComp = acquisitionCases.reduce((s, c) => s + (Number(c.estimated_compensation_bdt) || 0), 0);
  const gazetted = acquisitionCases.filter((c) => c.status === 'GAZETTE_PUBLISHED' || c.gazette_no).length;

  const set = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    const name = form.project_name_bn.trim();
    if (!name) return;
    setBusy(true);
    try {
      // Field names match SystemAdminController::createAcquisitionCase exactly.
      // Empty values are sent as '' / 0 / [] so the backend does not fill in its demo defaults.
      const res = await BhumiApi.createAcquisitionCase({
        project_name_bn: name,
        project_name_en: form.project_name_en.trim() || name,
        acquiring_agency_bn: form.acquiring_agency_bn.trim(),
        section_type: form.section_type,
        district_bn: form.district_bn.trim(),
        upazila_bn: form.upazila_bn.trim(),
        mouza_bn: form.mouza_bn.trim(),
        plot_ids: parsePlotIds(form.plot_ids),
        total_land_decimal: Number(form.total_land_decimal) || 0,
        estimated_compensation_bdt: Number(form.estimated_compensation_bdt) || 0,
        gazette_no: form.gazette_no.trim(),
        gazette_published_at: form.gazette_published_at || '',
        status: form.status,
        case_no: form.case_no.trim(),
      });
      notify.ok(res?.case_no ? t(`মামলা ${res.case_no} তৈরি হয়েছে`, `Case ${res.case_no} created`) : t('মামলা তৈরি হয়েছে', 'Case created'));
      setCreateOpen(false);
      await refresh();
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setBusy(false);
    }
  };

  const plotIds: any[] = Array.isArray(selected?.plot_ids) ? selected.plot_ids : [];

  return (
    <AdminPage fill>
      <StatGrid>
        <StatCard label={t('মোট মামলা', 'Cases')} value={n(acquisitionCases.length)} icon={Building2} tone="green" />
        <StatCard label={t('গেজেট', 'Gazetted')} value={n(gazetted)} icon={FileText} tone="blue" />
        <StatCard label={t('মোট জমি', 'Total land')} value={land(totalLand)} icon={LandPlot} tone="amber" />
        <StatCard label={t('ক্ষতিপূরণ', 'Compensation')} value={money(totalComp)} icon={Banknote} tone="violet" />
      </StatGrid>

      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('মামলা, প্রকল্প বা মৌজা…', 'Case, project or mouza…')}
        filters={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-40 rounded-lg text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('সব অবস্থা', 'All statuses')}</SelectItem>
              {statusesInData.map((code) => {
                const s = CASE_STATUS[code];
                return (
                  <SelectItem key={code} value={code}>
                    {s ? (lang === 'bn' ? s.bn : s.en) : code.replace(/_/g, ' ').toLowerCase()}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        }
        actions={
          <>
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={refresh} disabled={refreshing}>
              <RotateCcw className={cn('size-3.5', refreshing && 'animate-spin')} />
              {t('রিফ্রেশ', 'Refresh')}
            </Button>
            <Button size="sm" className="h-9 gap-1.5" onClick={openCreate}>
              <Plus className="size-4" />
              {t('নতুন মামলা', 'New case')}
            </Button>
          </>
        }
      />

      <Section fill>
        <TooltipProvider delayDuration={200}>
          <DataTable
            headers={[t('প্রকল্প', 'Project'), t('এলাকা', 'Area'), t('জমি ও ক্ষতিপূরণ', 'Land & cost'), t('অবস্থা', 'Status'), '']}
            alignRight={[4]}
          >
            {filtered.length === 0 ? (
              <EmptyRow
                cols={5}
                text={t('কোনো অধিগ্রহণ মামলা নেই', 'No acquisition cases')}
                action={
                  acquisitionCases.length === 0 && (
                    <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={openCreate}>
                      <Plus className="size-3.5" />
                      {t('নতুন মামলা', 'New case')}
                    </Button>
                  )
                }
              />
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="cursor-pointer" onClick={() => setSelected(c)}>
                  <td className="max-w-xs">
                    <span className="block truncate font-medium text-slate-900">
                      {(lang === 'bn' ? c.project_name_bn : c.project_name_en) || c.project_name_bn || c.project_name || '—'}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {[c.case_no, c.acquiring_agency_bn].filter(Boolean).join(' · ')}
                    </span>
                  </td>
                  <td>
                    <span className="block text-slate-800">{c.mouza_bn || '—'}</span>
                    <span className="block text-xs text-slate-500">{[c.upazila_bn, c.district_bn].filter(Boolean).join(', ')}</span>
                  </td>
                  <td>
                    <span className="block text-slate-800">{land(c.total_land_decimal)}</span>
                    <span className="block text-xs text-slate-500">{money(c.estimated_compensation_bdt)}</span>
                  </td>
                  <td>
                    <span className="flex flex-col items-start gap-1">
                      <CaseStatus code={c.status} lang={lang} />
                      <span className="text-xs text-slate-500">{sectionLabel(c.section_type)}</span>
                    </span>
                  </td>
                  <td className="text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-slate-500 hover:text-slate-900"
                          aria-label={t('বিস্তারিত', 'Details')}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(c);
                          }}
                        >
                          <Eye className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('বিস্তারিত', 'Details')}</TooltipContent>
                    </Tooltip>
                  </td>
                </tr>
              ))
            )}
          </DataTable>
        </TooltipProvider>
      </Section>

      {/* Case details */}
      <DetailSheet
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected ? (lang === 'bn' ? selected.project_name_bn : selected.project_name_en) || selected.project_name_bn : ''}
        subtitle={selected?.case_no}
      >
        {selected && (
          <>
            <DetailList
              items={[
                [t('অবস্থা', 'Status'), <CaseStatus code={selected.status} lang={lang} />],
                [t('আইনি ধারা', 'Section'), sectionLabel(selected.section_type)],
                [t('সংস্থা', 'Agency'), selected.acquiring_agency_bn || '—'],
                [t('জেলা', 'District'), selected.district_bn || '—'],
                [t('উপজেলা', 'Upazila'), selected.upazila_bn || '—'],
                [t('মৌজা', 'Mouza'), selected.mouza_bn || '—'],
                [t('মোট জমি', 'Total land'), land(selected.total_land_decimal)],
                [t('ক্ষতিপূরণ', 'Compensation'), money(selected.estimated_compensation_bdt)],
                [t('গেজেট নং', 'Gazette no'), selected.gazette_no || '—'],
                [t('গেজেটের তারিখ', 'Gazette date'), fmtDate(selected.gazette_published_at, lang)],
                [t('তৈরি করেছেন', 'Created by'), selected.created_by_officer || '—'],
                [t('তৈরির তারিখ', 'Created'), fmtDate(selected.created_at, lang)],
              ]}
            />
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-500">
                {t('দাগ আইডি', 'Plot IDs')} {plotIds.length > 0 && `· ${n(plotIds.length)}`}
              </p>
              {plotIds.length === 0 ? (
                <p className="text-sm text-slate-400">—</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {plotIds.map((pid) => (
                    <span key={String(pid)} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {n(pid)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </DetailSheet>

      {/* Create case */}
      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t('নতুন অধিগ্রহণ মামলা', 'New acquisition case')}
        submitLabel={t('সংরক্ষণ', 'Save')}
        cancelLabel={t('বাতিল', 'Cancel')}
        busy={busy}
        disabled={!form.project_name_bn.trim()}
        onSubmit={submit}
      >
        <div className="-mx-5 -my-1 max-h-[65vh] space-y-3 overflow-y-auto px-5 py-1">
        <Field label={t('প্রকল্পের নাম *', 'Project name *')}>
          <input className={inputCls} value={form.project_name_bn} onChange={set('project_name_bn')} autoFocus />
        </Field>
        <Field label={t('প্রত্যাশী সংস্থা', 'Agency')}>
          <input className={inputCls} value={form.acquiring_agency_bn} onChange={set('acquiring_agency_bn')} />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label={t('জেলা', 'District')}>
            <input className={inputCls} value={form.district_bn} onChange={set('district_bn')} />
          </Field>
          <Field label={t('উপজেলা', 'Upazila')}>
            <input className={inputCls} value={form.upazila_bn} onChange={set('upazila_bn')} />
          </Field>
          <Field label={t('মৌজা', 'Mouza')}>
            <input className={inputCls} value={form.mouza_bn} onChange={set('mouza_bn')} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('জমি (শতাংশ)', 'Land (decimal)')}>
            <input type="number" min={0} step="0.01" inputMode="decimal" className={inputCls} value={form.total_land_decimal} onChange={set('total_land_decimal')} />
          </Field>
          <Field label={t('ক্ষতিপূরণ (৳)', 'Compensation (৳)')}>
            <input type="number" min={0} inputMode="numeric" className={inputCls} value={form.estimated_compensation_bdt} onChange={set('estimated_compensation_bdt')} />
          </Field>
        </div>

        <Accordion type="single" collapsible className="rounded-lg border border-slate-200 px-3">
          <AccordionItem value="more" className="border-b-0">
            <AccordionTrigger className="min-h-0 py-2.5 text-sm font-medium text-slate-700 hover:no-underline hover:text-slate-900">
              {t('আরও তথ্য', 'More details')}
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-3 pt-1 text-slate-700">
              <Field label={t('ইংরেজি নাম', 'English name')}>
                <input className={inputCls} value={form.project_name_en} onChange={set('project_name_en')} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('আইনি ধারা', 'Section')}>
                  <Select value={form.section_type} onValueChange={(v) => setForm((f) => ({ ...f, section_type: v }))}>
                    <SelectTrigger className="h-9 w-full rounded-lg text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SECTIONS).map(([code, l]) => (
                        <SelectItem key={code} value={code}>
                          {lang === 'bn' ? l[0] : l[1]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t('অবস্থা', 'Status')}>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger className="h-9 w-full rounded-lg text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CREATE_STATUSES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {lang === 'bn' ? CASE_STATUS[code].bn : CASE_STATUS[code].en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label={t('দাগ আইডি', 'Plot IDs')} hint={t('কমা দিয়ে আলাদা করুন', 'Separate with commas')}>
                <input className={inputCls} value={form.plot_ids} onChange={set('plot_ids')} placeholder="12, 15, 18" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('গেজেট নং', 'Gazette no')}>
                  <input className={inputCls} value={form.gazette_no} onChange={set('gazette_no')} />
                </Field>
                <Field label={t('গেজেটের তারিখ', 'Gazette date')}>
                  <input type="date" className={inputCls} value={form.gazette_published_at} onChange={set('gazette_published_at')} />
                </Field>
              </div>
              <Field label={t('মামলা নং', 'Case no')} hint={t('খালি রাখলে নিজে তৈরি হবে', 'Auto if empty')}>
                <input className={inputCls} value={form.case_no} onChange={set('case_no')} placeholder="LA-2026-0001" />
              </Field>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        </div>
      </FormDialog>
    </AdminPage>
  );
};
