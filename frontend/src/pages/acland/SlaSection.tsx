import React, { useMemo, useState } from 'react';
import { Eye, Send } from 'lucide-react';
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
  inputCls,
  notify,
  useCreateIntent,
} from '@/components/admin/kit';
import {
  PRIORITY,
  PriorityBadge,
  ROLE_LABEL,
  SectionProps,
  SlaStatus,
  canSendSla,
  codeLabel,
  textareaCls,
  useFmt,
  useSectionIntent,
} from './shared';

type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
const EMPTY_FORM = { case_reference: '', target_role: 'land_office_assistant', priority: 'NORMAL' as Priority, due_at: '', notes_bn: '' };
const TARGETS = ['land_office_assistant', 'field_verification_officer', 'ac_land'];

export const SlaSection: React.FC<SectionProps> = ({ data, loaded, reload, intent, clearIntent }) => {
  const { role } = useAppUI();
  const { lang, t, date } = useFmt();
  const items = data.slaDispatches;
  const canCreate = canSendSla(role);

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const openCreate = (caseRef?: string) => {
    setForm({ ...EMPTY_FORM, case_reference: caseRef || '' });
    setCreateOpen(true);
  };
  useCreateIntent(() => canCreate && openCreate());
  useSectionIntent('sla_overview', intent, clearIntent, loaded, (i) => {
    if (i.create && canCreate) openCreate(i.recordId ? String(i.recordId) : undefined);
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((s) =>
      [s.dispatch_code, s.case_reference, s.target_role, s.target_username, s.notes_bn].some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [items, search]);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await BhumiApi.createSlaDispatch({
        case_reference: form.case_reference.trim(),
        target_role: form.target_role,
        priority: form.priority,
        due_at: form.due_at || undefined,
        notes_bn: form.notes_bn.trim(),
      });
      notify.ok((lang === 'bn' ? res?.message_bn : res?.message_en) || t('তাগিদ পাঠানো হয়েছে', 'Reminder sent'));
      setCreateOpen(false);
      await reload();
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminPage fill>
      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('কেস বা কোড…', 'Case or code…')}
        actions={
          canCreate && (
            <Button size="sm" className="h-9 gap-1.5" onClick={() => openCreate()}>
              <Send className="size-4" />
              {t('তাগিদ পাঠান', 'Send reminder')}
            </Button>
          )
        }
      />

      <Section fill>
        <DataTable headers={[t('কেস', 'Case'), t('কাকে', 'To'), t('অগ্রাধিকার', 'Priority'), t('অবস্থা', 'Status'), '']} alignRight={[4]}>
          {!loaded ? (
            <LoadingRows cols={5} />
          ) : rows.length === 0 ? (
            <EmptyRow cols={5} text={t('কোনো তাগিদ নেই', 'No reminders')} />
          ) : (
            rows.map((s) => (
              <tr key={s.id} className="cursor-pointer" onClick={() => setSelected(s)}>
                <td>
                  <div className="font-medium text-slate-900">{s.case_reference || s.dispatch_code || '—'}</div>
                  <div className="max-w-xs truncate text-xs text-slate-500">{s.notes_bn || '—'}</div>
                </td>
                <td>
                  <div className="text-slate-800">{codeLabel(ROLE_LABEL, s.target_role, lang)}</div>
                  <div className="text-xs text-slate-500">
                    {t('শেষ তারিখ', 'Due')} {date(s.due_at)}
                  </div>
                </td>
                <td>
                  <PriorityBadge code={s.priority} />
                </td>
                <td>
                  <SlaStatus code={s.status} />
                </td>
                <td className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t('বিস্তারিত', 'Details')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(s);
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
        title={selected?.dispatch_code || t('তাগিদ', 'Reminder')}
        subtitle={selected ? <SlaStatus code={selected.status} /> : undefined}
      >
        {selected && (
          <>
            <DetailList
              items={[
                [t('কেস', 'Case'), selected.case_reference || '—'],
                [t('কাকে', 'To'), codeLabel(ROLE_LABEL, selected.target_role, lang)],
                !!selected.target_username && [t('কর্মকর্তা', 'Officer'), selected.target_username],
                [t('অগ্রাধিকার', 'Priority'), <PriorityBadge key="p" code={selected.priority} />],
                [t('শেষ তারিখ', 'Due'), date(selected.due_at)],
                [t('পাঠিয়েছেন', 'Sent by'), selected.issued_by_username || '—'],
                [t('পাঠানোর তারিখ', 'Sent on'), date(selected.created_at)],
              ]}
            />
            {selected.notes_bn && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-500">{t('নির্দেশনা', 'Instruction')}</div>
                <p className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">{selected.notes_bn}</p>
              </div>
            )}
          </>
        )}
      </DetailSheet>

      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t('তাগিদ পাঠান', 'Send reminder')}
        submitLabel={t('পাঠান', 'Send')}
        cancelLabel={t('বাতিল', 'Cancel')}
        busy={busy}
        disabled={!form.case_reference.trim() || !form.notes_bn.trim()}
        onSubmit={submit}
      >
        <Field label={t('কেস নম্বর', 'Case number')}>
          <input
            required
            value={form.case_reference}
            onChange={(e) => setForm({ ...form, case_reference: e.target.value })}
            placeholder="MUT-2026-0008"
            className={inputCls}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('কাকে', 'To')}>
            <select value={form.target_role} onChange={(e) => setForm({ ...form, target_role: e.target.value })} className={inputCls}>
              {TARGETS.map((r) => (
                <option key={r} value={r}>
                  {codeLabel(ROLE_LABEL, r, lang)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('অগ্রাধিকার', 'Priority')}>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })} className={inputCls}>
              {(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as Priority[]).map((p) => (
                <option key={p} value={p}>
                  {codeLabel(PRIORITY, p, lang)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t('শেষ তারিখ', 'Due date')}>
          <input type="date" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} className={inputCls} />
        </Field>
        <Field label={t('নির্দেশনা', 'Instruction')}>
          <textarea
            rows={3}
            required
            value={form.notes_bn}
            onChange={(e) => setForm({ ...form, notes_bn: e.target.value })}
            placeholder={t('কী করতে হবে, কবের মধ্যে', 'What to do and by when')}
            className={textareaCls}
          />
        </Field>
      </FormDialog>
    </AdminPage>
  );
};
