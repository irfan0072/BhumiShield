import React, { useMemo, useState } from 'react';
import { Eye, Plus } from 'lucide-react';
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
  useCreateIntent,
} from '@/components/admin/kit';
import {
  BOUNDARY,
  POSSESSION,
  SectionProps,
  TAX,
  canFileFieldReport,
  codeLabel,
  isPendingMutation,
  textareaCls,
  up,
  useFmt,
  useSectionIntent,
} from './shared';

const EMPTY_FORM = { plot_id: '', possession_status: 'VERIFIED', boundary_status: 'MATCHED', tax_status: 'PAID', remarks: '' };

export const FieldReportsSection: React.FC<SectionProps> = ({ data, loaded, reload, intent, clearIntent }) => {
  const { role } = useAppUI();
  const { lang, t, n, date, name, dec } = useFmt();
  const items = data.fieldReports;
  const canCreate = canFileFieldReport(role);

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const plotById = useMemo(() => {
    const m = new Map<string, any>();
    data.plots.forEach((p) => m.set(String(p.id), p));
    return m;
  }, [data.plots]);

  /** Plots of pending mutations first: those are the ones waiting for a field visit. */
  const plotOptions = useMemo(() => {
    const pendingIds = new Set(data.mutations.filter(isPendingMutation).map((m) => String(m.plot_id)));
    const list = [...data.plots];
    list.sort((a, b) => Number(pendingIds.has(String(b.id))) - Number(pendingIds.has(String(a.id))));
    return { list, pendingIds };
  }, [data.plots, data.mutations]);

  const openCreate = (plotId?: number) => {
    setForm({ ...EMPTY_FORM, plot_id: plotId ? String(plotId) : '' });
    setCreateOpen(true);
  };
  useCreateIntent(() => canCreate && openCreate());
  useSectionIntent('field_reports', intent, clearIntent, loaded, (i) => {
    if (i.create && canCreate) openCreate(i.plotId);
    else if (i.recordId) {
      const hit = items.find((r) => String(r.id) === String(i.recordId));
      if (hit) setSelected(hit);
    }
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) => {
      const p = plotById.get(String(r.plot_id));
      return [r.report_code, r.dag_no, r.signed_by_username, r.signed_by_name_bn, p?.mouza_bn].some((v) =>
        String(v || '').toLowerCase().includes(q)
      );
    });
  }, [items, search, plotById]);

  const flagged = (r: any) =>
    ['CONTESTED', 'PARTIAL_DISPUTE', 'ENCROACHED'].includes(up(r.possession_status)) ||
    ['DISPUTED', 'ENCROACHED', 'ENCROACHED_NORTH'].includes(up(r.boundary_status));

  const submit = async () => {
    setBusy(true);
    try {
      const res = await BhumiApi.createFieldReport({
        plot_id: Number(form.plot_id),
        possession_status: form.possession_status,
        boundary_status: form.boundary_status,
        tax_status: form.tax_status,
        remarks_bn: form.remarks.trim(),
      });
      notify.ok((lang === 'bn' ? res?.message_bn : res?.message_en) || t('প্রতিবেদন জমা হয়েছে', 'Report submitted'));
      setCreateOpen(false);
      await reload();
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setBusy(false);
    }
  };

  const plotLabel = (p: any) =>
    `${t('দাগ', 'Plot')} ${n(p.dag_no_bn || p.dag_no)} · ${name(p.mouza_bn, p.mouza_en)}${
      p.total_area_decimal || p.area_decimal ? ` · ${dec(p.total_area_decimal ?? p.area_decimal)}` : ''
    }`;
  const sp = selected ? plotById.get(String(selected.plot_id)) : null;

  return (
    <AdminPage fill>
      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('দাগ, মৌজা বা কোড…', 'Plot, mouza or code…')}
        actions={
          canCreate && (
            <Button size="sm" className="h-9 gap-1.5" onClick={() => openCreate()}>
              <Plus className="size-4" />
              {t('নতুন প্রতিবেদন', 'New report')}
            </Button>
          )
        }
      />

      <Section fill>
        <DataTable headers={[t('প্রতিবেদন', 'Report'), t('জমি', 'Land'), t('ফলাফল', 'Finding'), t('ভূমি কর', 'Land tax'), '']} alignRight={[4]}>
          {!loaded ? (
            <LoadingRows cols={5} />
          ) : rows.length === 0 ? (
            <EmptyRow cols={5} text={t('কোনো প্রতিবেদন নেই', 'No reports')} />
          ) : (
            rows.map((r) => {
              const p = plotById.get(String(r.plot_id));
              return (
                <tr key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                  <td>
                    <div className="font-medium text-slate-900">{r.report_code || `#${n(r.id)}`}</div>
                    <div className="text-xs text-slate-500">{date(r.signed_at || r.created_at)}</div>
                  </td>
                  <td>
                    <div className="text-slate-800">
                      {t('দাগ', 'Plot')} {n(p?.dag_no_bn || r.dag_no || r.plot_id)}
                    </div>
                    <div className="text-xs text-slate-500">{p ? name(p.mouza_bn, p.mouza_en) : '—'}</div>
                  </td>
                  <td>
                    <StatusBadge tone={flagged(r) ? 'red' : 'green'}>{codeLabel(POSSESSION, r.possession_status, lang)}</StatusBadge>
                    <div className="mt-0.5 text-xs text-slate-500">{codeLabel(BOUNDARY, r.boundary_status, lang)}</div>
                  </td>
                  <td>
                    <StatusBadge tone={up(r.tax_status).startsWith('PAID') ? 'green' : 'amber'}>
                      {codeLabel(TAX, r.tax_status, lang)}
                    </StatusBadge>
                  </td>
                  <td className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={t('বিস্তারিত', 'Details')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(r);
                      }}
                    >
                      <Eye className="size-4 text-slate-500" />
                    </Button>
                  </td>
                </tr>
              );
            })
          )}
        </DataTable>
      </Section>

      <DetailSheet
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected?.report_code || t('মাঠ প্রতিবেদন', 'Field report')}
        subtitle={selected ? <StatusCode code={selected.status} lang={lang} /> : undefined}
      >
        {selected && (
          <>
            <DetailList
              items={[
                [t('দাগ', 'Plot'), n(sp?.dag_no_bn || selected.dag_no || selected.plot_id)],
                !!sp && [t('মৌজা', 'Mouza'), name(sp.mouza_bn, sp.mouza_en)],
                [t('দখল', 'Possession'), codeLabel(POSSESSION, selected.possession_status, lang)],
                [t('সীমানা', 'Boundary'), codeLabel(BOUNDARY, selected.boundary_status, lang)],
                [t('ভূমি কর', 'Land tax'), codeLabel(TAX, selected.tax_status, lang)],
                [t('দাখিলকারী', 'Filed by'), name(selected.signed_by_name_bn, selected.signed_by_name_en) !== '—' ? name(selected.signed_by_name_bn, selected.signed_by_name_en) : selected.signed_by_username || '—'],
                [t('তারিখ', 'Date'), date(selected.signed_at || selected.created_at)],
                selected.latitude != null && selected.longitude != null && [t('অবস্থান', 'Location'), `${n(selected.latitude)}, ${n(selected.longitude)}`],
              ]}
            />
            {(selected.remarks_bn || selected.remarks) && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-500">{t('পর্যবেক্ষণ', 'Observation')}</div>
                <p className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">{selected.remarks_bn || selected.remarks}</p>
              </div>
            )}
          </>
        )}
      </DetailSheet>

      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t('নতুন মাঠ প্রতিবেদন', 'New field report')}
        submitLabel={t('জমা দিন', 'Submit')}
        cancelLabel={t('বাতিল', 'Cancel')}
        busy={busy}
        disabled={!form.plot_id || !form.remarks.trim()}
        onSubmit={submit}
      >
        <Field label={t('জমি', 'Plot')}>
          <select value={form.plot_id} onChange={(e) => setForm({ ...form, plot_id: e.target.value })} className={inputCls} required>
            <option value="">{t('দাগ বাছুন', 'Choose plot')}</option>
            {plotOptions.list.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {plotLabel(p)}
                {plotOptions.pendingIds.has(String(p.id)) ? ` · ${t('নামজারি চলছে', 'mutation pending')}` : ''}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('দখল', 'Possession')}>
            <select value={form.possession_status} onChange={(e) => setForm({ ...form, possession_status: e.target.value })} className={inputCls}>
              {['VERIFIED', 'CONTESTED', 'UNOCCUPIED'].map((c) => (
                <option key={c} value={c}>
                  {codeLabel(POSSESSION, c, lang)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('সীমানা', 'Boundary')}>
            <select value={form.boundary_status} onChange={(e) => setForm({ ...form, boundary_status: e.target.value })} className={inputCls}>
              {['MATCHED', 'DISPUTED'].map((c) => (
                <option key={c} value={c}>
                  {codeLabel(BOUNDARY, c, lang)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('ভূমি কর', 'Land tax')}>
            <select value={form.tax_status} onChange={(e) => setForm({ ...form, tax_status: e.target.value })} className={inputCls}>
              {['PAID', 'DUE'].map((c) => (
                <option key={c} value={c}>
                  {codeLabel(TAX, c, lang)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t('পর্যবেক্ষণ', 'Observation')}>
          <textarea
            rows={3}
            required
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            placeholder={t('সরেজমিনে কী দেখলেন', 'What you saw on site')}
            className={textareaCls}
          />
        </Field>
      </FormDialog>
    </AdminPage>
  );
};
