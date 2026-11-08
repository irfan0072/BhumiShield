import React, { useMemo, useState } from 'react';
import { Eye, FileCheck2 } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import {
  AdminPage,
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
  StatusCode,
  inputCls,
  notify,
} from '@/components/admin/kit';
import { BlockedNote, SectionProps, canReconcile, textareaCls, useFmt, useSectionIntent } from './shared';

const KhatianStatus: React.FC<{ code?: string }> = ({ code }) => {
  const { lang, t } = useFmt();
  const c = String(code || 'FLAGGED').toUpperCase();
  if (c === 'CHAIN_BREAK') return <StatusBadge tone="red">{t('ধারাবাহিকতা ভাঙা', 'Chain break')}</StatusBadge>;
  if (c === 'UNRESOLVED_HEIRS') return <StatusBadge tone="amber">{t('ওয়ারিশ অমীমাংসিত', 'Heirs unresolved')}</StatusBadge>;
  if (c === 'AREA_MISMATCH') return <StatusBadge tone="amber">{t('ক্ষেত্রফল অমিল', 'Area mismatch')}</StatusBadge>;
  return <StatusCode code={c} lang={lang} />;
};

export const KhatiansSection: React.FC<SectionProps> = ({ data, loaded, reload, intent, clearIntent }) => {
  const { role } = useAppUI();
  const { lang, t, n, name, dec } = useFmt();
  const items = data.flaggedKhatians;

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [areaVal, setAreaVal] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useSectionIntent('khatians', intent, clearIntent, loaded, (i) => {
    const hit = items.find((k) => String(k.plot_id ?? k.id) === String(i.recordId));
    if (hit) setSelected(hit);
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((k) =>
      [k.mouza_bn, k.mouza_en, k.dag_no, k.dag_no_bn, k.khatian_no, k.khatian_no_bn, k.upazila_bn].some((v) =>
        String(v || '').toLowerCase().includes(q)
      )
    );
  }, [items, search]);

  const openForm = () => {
    setAreaVal(String(selected?.area_rs ?? selected?.area_decimal ?? ''));
    setNote('');
    setFormOpen(true);
  };

  const submit = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const plotId = Number(selected.plot_id || selected.id);
      const res = await BhumiApi.reconcileKhatian(plotId, {
        resolution_note_bn: note.trim(),
        updated_area_decimal: areaVal ? Number(areaVal) : undefined,
      });
      notify.ok((lang === 'bn' ? res?.message_bn : res?.message_en)?.replace(/^✔\s*/, '') || t('খতিয়ান সংশোধন হয়েছে', 'Khatian reconciled'));
      setFormOpen(false);
      setSelected(null);
      await reload();
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setBusy(false);
    }
  };

  const allowed = canReconcile(role);
  const note2 = (k: any) => (lang === 'bn' ? k.anomaly_note_bn || k.remarks_bn : k.anomaly_note_en || k.remarks_en) || '';

  return (
    <AdminPage fill>
      <PageToolbar search={search} onSearch={setSearch} placeholder={t('মৌজা বা দাগ…', 'Mouza or plot…')} />

      <Section fill>
        <DataTable headers={[t('জমি', 'Land'), t('খতিয়ান', 'Khatian'), t('ক্ষেত্রফল', 'Area'), t('অবস্থা', 'Status'), '']} alignRight={[4]}>
          {!loaded ? (
            <LoadingRows cols={5} />
          ) : rows.length === 0 ? (
            <EmptyRow cols={5} text={t('কোনো সমস্যাযুক্ত খতিয়ান নেই', 'No flagged khatians')} />
          ) : (
            rows.map((k, i) => (
              <tr key={k.id || i} className="cursor-pointer" onClick={() => setSelected(k)}>
                <td>
                  <div className="text-slate-800">{name(k.mouza_bn, k.mouza_en)}</div>
                  <div className="text-xs text-slate-500">
                    {t('দাগ', 'Plot')} {n(k.dag_no_bn || k.dag_no)}
                  </div>
                </td>
                <td>
                  <div className="text-slate-800">{n(k.khatian_no_bn || k.khatian_no)}</div>
                  <div className="text-xs text-slate-500">{k.survey_type || '—'}</div>
                </td>
                <td>
                  <div className="text-slate-800">{dec(k.area_bs)}</div>
                  <div className="text-xs text-slate-500">
                    {t('দাগে', 'Plot')} {dec(k.area_rs)}
                  </div>
                </td>
                <td>
                  <KhatianStatus code={k.status} />
                </td>
                <td className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t('বিস্তারিত', 'Details')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(k);
                    }}
                  >
                    <Eye className="size-4 text-slate-500" />
                  </Button>
                </td>
              </tr>
            ))
          )}
        </DataTable>
      </Section>

      <DetailSheet
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected ? `${t('দাগ', 'Plot')} ${n(selected.dag_no_bn || selected.dag_no)}` : ''}
        subtitle={selected ? name(selected.mouza_bn, selected.mouza_en) : undefined}
        footer={
          selected &&
          (allowed ? (
            <Button size="sm" className="h-9 gap-1.5" onClick={openForm}>
              <FileCheck2 className="size-4" />
              {t('সংশোধন করুন', 'Reconcile')}
            </Button>
          ) : (
            <BlockedNote>{t('সংশোধন শুধু এসি ল্যান্ড করতে পারেন', 'Only AC Land can reconcile')}</BlockedNote>
          ))
        }
      >
        {selected && (
          <>
            <DetailList
              items={[
                [t('মৌজা', 'Mouza'), name(selected.mouza_bn, selected.mouza_en)],
                !!(selected.upazila_bn || selected.upazila_en) && [t('উপজেলা', 'Upazila'), name(selected.upazila_bn, selected.upazila_en)],
                [t('দাগ', 'Plot'), n(selected.dag_no_bn || selected.dag_no)],
                [t('খতিয়ান', 'Khatian'), n(selected.khatian_no_bn || selected.khatian_no)],
                [t('জরিপ', 'Survey'), selected.survey_type || '—'],
                !!selected.survey_year && [t('জরিপ সাল', 'Survey year'), n(selected.survey_year)],
                [t('দাগের মোট জমি', 'Plot area'), dec(selected.area_rs)],
                [t('খতিয়ানে জমি', 'Khatian area'), dec(selected.area_bs)],
                [t('অবস্থা', 'Status'), <KhatianStatus key="s" code={selected.status} />],
              ]}
            />
            {note2(selected) && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-500">{t('সমস্যা', 'Issue')}</div>
                <p className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">{note2(selected)}</p>
              </div>
            )}
          </>
        )}
      </DetailSheet>

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={t('খতিয়ান সংশোধন', 'Reconcile khatian')}
        description={selected ? `${t('দাগ', 'Plot')} ${n(selected.dag_no_bn || selected.dag_no)}` : undefined}
        submitLabel={t('সংশোধন করুন', 'Reconcile')}
        cancelLabel={t('বাতিল', 'Cancel')}
        busy={busy}
        disabled={!(Number(areaVal) > 0) || note.trim().length < 5}
        onSubmit={submit}
      >
        <Field label={t('সঠিক জমি (শতক)', 'Correct area (dec)')}>
          <input type="number" step="any" min="0" required value={areaVal} onChange={(e) => setAreaVal(e.target.value)} className={inputCls} />
        </Field>
        <Field label={t('আদেশের কারণ', 'Order reason')} hint={t('অন্তত ৫ অক্ষর', 'At least 5 characters')}>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('কোন রেকর্ড দেখে সংশোধন করছেন', 'Which records you checked')}
            className={textareaCls}
          />
        </Field>
      </FormDialog>
    </AdminPage>
  );
};
