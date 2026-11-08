import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { toBanglaDigits } from '@/theme/tokens';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Field, FormDialog, inputCls } from '@/components/admin/kit';
import { SECTION_OPTIONS, STATUS_OPTIONS, caseStatus, num } from './shared';

/** Payload accepted by SystemAdminController::createAcquisitionCase. */
export interface AcquisitionCasePayload {
  project_name_bn: string;
  project_name_en?: string;
  acquiring_agency_bn?: string;
  section_type?: string;
  district_bn?: string;
  upazila_bn?: string;
  mouza_bn?: string;
  plot_ids?: number[];
  total_land_decimal?: number;
  estimated_compensation_bdt?: number;
  gazette_no?: string;
  gazette_published_at?: string;
  status?: string;
  case_no?: string;
}

const EMPTY = {
  project_name_bn: '',
  project_name_en: '',
  acquiring_agency_bn: '',
  section_type: 'SECTION_4',
  district_bn: '',
  upazila_bn: '',
  mouza_bn: '',
  total_land_decimal: '',
  estimated_compensation_bdt: '',
  gazette_no: '',
  gazette_published_at: '',
  status: 'PRELIMINARY_NOTICE',
  case_no: '',
};

export const AcquisitionNoticeDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plots: any[];
  initialPlotIds?: number[];
  onSubmit: (payload: AcquisitionCasePayload) => Promise<void>;
}> = ({ open, onOpenChange, plots, initialPlotIds, onSubmit }) => {
  const { lang, t } = useAppUI();
  const [f, setF] = useState(EMPTY);
  const [plotIds, setPlotIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [areaTouched, setAreaTouched] = useState(false);
  const [locTouched, setLocTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF(EMPTY);
    setPlotIds(initialPlotIds || []);
    setAreaTouched(false);
    setLocTouched(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const byId = useMemo(() => new Map(plots.map((p) => [Number(p.id), p])), [plots]);
  const chosen = plotIds.map((id) => byId.get(id)).filter(Boolean) as any[];

  // Area and location follow the chosen plots until the user edits them.
  useEffect(() => {
    const first = chosen[0];
    setF((prev) => ({
      ...prev,
      total_land_decimal: areaTouched
        ? prev.total_land_decimal
        : chosen.length
        ? String(+chosen.reduce((s, p) => s + num(p.total_area_decimal), 0).toFixed(2))
        : '',
      ...(locTouched
        ? {}
        : {
            district_bn: first?.district_bn || '',
            upazila_bn: first?.upazila_bn || '',
            mouza_bn: first?.mouza_bn || '',
          }),
    }));
  }, [plotIds.join(','), byId]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));
  const setLoc = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocTouched(true);
    set(k)(e);
  };

  const submit = async () => {
    const payload: AcquisitionCasePayload = { project_name_bn: f.project_name_bn.trim() };
    const str = (k: keyof typeof EMPTY) => {
      const v = String(f[k] ?? '').trim();
      if (v) (payload as any)[k] = v;
    };
    (['project_name_en', 'acquiring_agency_bn', 'section_type', 'district_bn', 'upazila_bn', 'mouza_bn', 'gazette_no', 'gazette_published_at', 'status', 'case_no'] as const).forEach(str);
    if (plotIds.length) payload.plot_ids = plotIds;
    if (f.total_land_decimal !== '') payload.total_land_decimal = num(f.total_land_decimal);
    if (f.estimated_compensation_bdt !== '') payload.estimated_compensation_bdt = num(f.estimated_compensation_bdt);
    setBusy(true);
    try {
      await onSubmit(payload);
      onOpenChange(false);
    } catch {
      // parent already showed the error toast; keep the dialog open
    } finally {
      setBusy(false);
    }
  };

  const available = plots.filter((p) => !plotIds.includes(Number(p.id)));

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('নতুন অধিগ্রহণ নোটিশ', 'New acquisition notice')}
      submitLabel={t('নোটিশ জারি', 'Issue notice')}
      cancelLabel={t('বাতিল', 'Cancel')}
      onSubmit={submit}
      busy={busy}
      disabled={!f.project_name_bn.trim() || plotIds.length === 0}
    >
      <Field label={t('প্রকল্পের নাম', 'Project name')}>
        <input className={inputCls} value={f.project_name_bn} onChange={set('project_name_bn')} autoFocus />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('আইনি ধারা', 'Section')}>
          <select className={inputCls} value={f.section_type} onChange={set('section_type')}>
            {SECTION_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {lang === 'bn' ? s.bn : s.en}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('জমির পরিমাণ, শতক', 'Area, decimal')}>
          <input
            className={inputCls}
            type="number"
            step="0.01"
            min="0"
            value={f.total_land_decimal}
            onChange={(e) => {
              setAreaTouched(true);
              set('total_land_decimal')(e);
            }}
          />
        </Field>
      </div>

      <Field label={t('দাগ', 'Plots')}>
        <div className="space-y-2">
          {chosen.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {chosen.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-100 py-0.5 pl-2 pr-1 text-xs text-slate-700"
                >
                  {toBanglaDigits(p.dag_no_bn || p.dag_no, lang)} · {p.mouza_bn || p.mouza_en}
                  <button
                    type="button"
                    aria-label={t('বাদ দিন', 'Remove')}
                    onClick={() => setPlotIds((ids) => ids.filter((x) => x !== Number(p.id)))}
                    className="rounded p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <select
            className={inputCls}
            value=""
            onChange={(e) => e.target.value && setPlotIds((ids) => [...ids, Number(e.target.value)])}
          >
            <option value="">{t('দাগ যোগ করুন…', 'Add plot…')}</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                {toBanglaDigits(p.dag_no_bn || p.dag_no, lang)} · {p.mouza_bn || p.mouza_en} · {p.plot_code}
              </option>
            ))}
          </select>
        </div>
      </Field>

      <Accordion type="single" collapsible className="rounded-lg border border-slate-200 px-3">
        <AccordionItem value="more" className="border-b-0">
          <AccordionTrigger className="py-2.5 text-xs font-medium text-slate-600 hover:no-underline">
            {t('আরও তথ্য', 'More details')}
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('গেজেট নম্বর', 'Gazette no')}>
                <input className={inputCls} value={f.gazette_no} onChange={set('gazette_no')} />
              </Field>
              <Field label={t('গেজেটের তারিখ', 'Gazette date')}>
                <input className={inputCls} type="date" value={f.gazette_published_at} onChange={set('gazette_published_at')} />
              </Field>
              <Field label={t('ক্ষতিপূরণ, টাকা', 'Compensation, BDT')}>
                <input
                  className={inputCls}
                  type="number"
                  min="0"
                  value={f.estimated_compensation_bdt}
                  onChange={set('estimated_compensation_bdt')}
                />
              </Field>
              <Field label={t('পর্যায়', 'Stage')}>
                <select className={inputCls} value={f.status} onChange={set('status')}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {caseStatus(s, lang).label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('প্রত্যাশী সংস্থা', 'Agency')}>
                <input className={inputCls} value={f.acquiring_agency_bn} onChange={set('acquiring_agency_bn')} />
              </Field>
              <Field label={t('ইংরেজি নাম', 'English name')}>
                <input className={inputCls} value={f.project_name_en} onChange={set('project_name_en')} />
              </Field>
              <Field label={t('জেলা', 'District')}>
                <input className={inputCls} value={f.district_bn} onChange={setLoc('district_bn')} />
              </Field>
              <Field label={t('উপজেলা', 'Upazila')}>
                <input className={inputCls} value={f.upazila_bn} onChange={setLoc('upazila_bn')} />
              </Field>
              <Field label={t('মৌজা', 'Mouza')}>
                <input className={inputCls} value={f.mouza_bn} onChange={setLoc('mouza_bn')} />
              </Field>
              <Field label={t('কেস নম্বর', 'Case no')} hint={t('খালি রাখলে নিজে তৈরি হবে', 'Auto if empty')}>
                <input className={inputCls} value={f.case_no} onChange={set('case_no')} />
              </Field>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </FormDialog>
  );
};
