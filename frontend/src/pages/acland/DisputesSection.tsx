import React, { useMemo, useState } from 'react';
import { CheckCircle2, Eye, Lock } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { triggerAppNotification } from '@/components/NotificationCenter';
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
  notify,
} from '@/components/admin/kit';
import {
  BlockedNote,
  DISPUTE_TYPE,
  DisputeStatus,
  SectionProps,
  canResolveDispute,
  codeLabel,
  isOpenDispute,
  textareaCls,
  useFmt,
  useSectionIntent,
} from './shared';

type Filter = 'OPEN' | 'DONE' | 'ALL';

export const DisputesSection: React.FC<SectionProps> = ({ data, loaded, reload, intent, clearIntent }) => {
  const { role } = useAppUI();
  const { lang, t, n, date, name, dec } = useFmt();
  const items = data.disputes;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('OPEN');
  const [selected, setSelected] = useState<any | null>(null);
  const [action, setAction] = useState<'RESOLVED' | 'UPHELD_FROZEN' | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useSectionIntent('disputes', intent, clearIntent, loaded, (i) => {
    const hit = items.find((d) => String(d.id) === String(i.recordId));
    if (hit) setSelected(hit);
  });

  const openCount = items.filter(isOpenDispute).length;
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((d) => {
      if (filter === 'OPEN' && !isOpenDispute(d)) return false;
      if (filter === 'DONE' && isOpenDispute(d)) return false;
      if (!q) return true;
      return [d.case_no, d.complainant_name_bn, d.dag_no, d.dag_no_bn, d.mouza_bn, d.suit_no].some((v) =>
        String(v || '').toLowerCase().includes(q)
      );
    });
  }, [items, filter, search]);

  const submit = async () => {
    if (!selected || !action) return;
    setBusy(true);
    try {
      const res = await BhumiApi.resolveDispute(selected.id, { status: action, resolution_note_bn: note.trim() });
      notify.ok(
        (lang === 'bn' ? res?.message_bn : res?.message_en) ||
          (action === 'RESOLVED' ? t('বিরোধ নিষ্পন্ন', 'Dispute resolved') : t('বিক্রয় স্থগিত রাখা হয়েছে', 'Sale frozen'))
      );
      triggerAppNotification({
        title_bn: 'বিরোধের শুনানি আদেশ',
        title_en: 'Dispute order recorded',
        message_bn: `কেস ${selected.case_no}, দাগ ${selected.dag_no_bn || selected.dag_no || ''}`,
        message_en: `Case ${selected.case_no}`,
        type: action === 'UPHELD_FROZEN' ? 'ALERT' : 'SUCCESS',
        targetTab: 'acland',
        targetSection: 'disputes',
      });
      setAction(null);
      setSelected(null);
      await reload();
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setBusy(false);
    }
  };

  const allowed = canResolveDispute(role);

  return (
    <AdminPage fill>
      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('কেস, নাম বা দাগ…', 'Case, name or plot…')}
        filters={
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList className="h-9">
              <TabsTrigger value="OPEN" className="gap-1.5 px-3 text-xs">
                {t('বিচারাধীন', 'Open')}
                <span className="text-slate-400">{n(openCount)}</span>
              </TabsTrigger>
              <TabsTrigger value="DONE" className="gap-1.5 px-3 text-xs">
                {t('নিষ্পন্ন', 'Closed')}
                <span className="text-slate-400">{n(items.length - openCount)}</span>
              </TabsTrigger>
              <TabsTrigger value="ALL" className="gap-1.5 px-3 text-xs">
                {t('সব', 'All')}
                <span className="text-slate-400">{n(items.length)}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <Section fill>
        <DataTable headers={[t('কেস', 'Case'), t('আপত্তিকারী', 'Complainant'), t('জমি', 'Land'), t('অবস্থা', 'Status'), '']} alignRight={[4]}>
          {!loaded ? (
            <LoadingRows cols={5} />
          ) : rows.length === 0 ? (
            <EmptyRow cols={5} text={t('কোনো বিরোধ নেই', 'No disputes')} />
          ) : (
            rows.map((d) => (
              <tr key={d.id} className="cursor-pointer" onClick={() => setSelected(d)}>
                <td>
                  <div className="font-medium text-slate-900">{d.case_no || '—'}</div>
                  <div className="text-xs text-slate-500">{codeLabel(DISPUTE_TYPE, d.dispute_type, lang)}</div>
                </td>
                <td>
                  <div className="text-slate-800">{d.complainant_name_bn || '—'}</div>
                  <div className="text-xs text-slate-500">{date(d.created_at)}</div>
                </td>
                <td>
                  <div className="text-slate-800">{name(d.mouza_bn, d.mouza_en)}</div>
                  <div className="text-xs text-slate-500">
                    {t('দাগ', 'Plot')} {n(d.dag_no_bn || d.dag_no || d.plot_id)}
                  </div>
                </td>
                <td>
                  <DisputeStatus code={d.status} />
                </td>
                <td className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t('বিস্তারিত', 'Details')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(d);
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
        title={selected?.case_no || t('বিরোধ', 'Dispute')}
        subtitle={selected ? <DisputeStatus code={selected.status} /> : undefined}
        footer={
          selected &&
          isOpenDispute(selected) &&
          (allowed ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-rose-700"
                onClick={() => {
                  setNote('');
                  setAction('UPHELD_FROZEN');
                }}
              >
                <Lock className="size-4" />
                {t('বিক্রয় স্থগিত', 'Freeze sale')}
              </Button>
              <Button
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => {
                  setNote('');
                  setAction('RESOLVED');
                }}
              >
                <CheckCircle2 className="size-4" />
                {t('নিষ্পত্তি', 'Resolve')}
              </Button>
            </>
          ) : (
            <BlockedNote>{t('আদেশ শুধু এসি ল্যান্ড দিতে পারেন', 'Only AC Land can decide')}</BlockedNote>
          ))
        }
      >
        {selected && (
          <>
            <DetailList
              items={[
                [t('ধরন', 'Type'), codeLabel(DISPUTE_TYPE, selected.dispute_type, lang)],
                [
                  t('আপত্তিকারী', 'Complainant'),
                  <span key="c">
                    {selected.complainant_name_bn || '—'}
                    {selected.complainant_nid && <span className="block text-xs font-normal text-slate-500">{n(selected.complainant_nid)}</span>}
                  </span>,
                ],
                [t('মৌজা', 'Mouza'), name(selected.mouza_bn, selected.mouza_en)],
                [t('দাগ', 'Plot'), n(selected.dag_no_bn || selected.dag_no || selected.plot_id)],
                !!selected.disputed_area_decimal && [t('বিরোধের জমি', 'Disputed area'), dec(selected.disputed_area_decimal)],
                !!selected.court_name && [t('আদালত', 'Court'), selected.court_name],
                !!selected.suit_no && [t('মামলা নং', 'Suit no'), n(selected.suit_no)],
                [t('দাখিল', 'Filed'), date(selected.created_at)],
              ]}
            />
            {(selected.description_bn || selected.description_en) && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-500">{t('অভিযোগ', 'Complaint')}</div>
                <p className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  {name(selected.description_bn, selected.description_en)}
                </p>
              </div>
            )}
            {!isOpenDispute(selected) && (
              <DetailList
                items={[
                  [t('আদেশ দিয়েছেন', 'Decided by'), selected.resolved_by || '—'],
                  [t('তারিখ', 'Date'), date(selected.resolved_at)],
                  [t('আদেশ', 'Order'), selected.resolution_notes_bn || '—'],
                ]}
              />
            )}
          </>
        )}
      </DetailSheet>

      <FormDialog
        open={!!action}
        onOpenChange={(o) => !o && setAction(null)}
        title={action === 'RESOLVED' ? t('বিরোধ নিষ্পত্তি', 'Resolve dispute') : t('বিক্রয় স্থগিত রাখুন', 'Freeze plot sale')}
        description={selected?.case_no}
        submitLabel={action === 'RESOLVED' ? t('নিষ্পত্তি', 'Resolve') : t('স্থগিত করুন', 'Freeze')}
        cancelLabel={t('বাতিল', 'Cancel')}
        destructive={action === 'UPHELD_FROZEN'}
        busy={busy}
        disabled={note.trim().length < 5}
        onSubmit={submit}
      >
        <Field label={t('শুনানির আদেশ', 'Hearing order')} hint={t('অন্তত ৫ অক্ষর', 'At least 5 characters')}>
          <textarea
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('শুনানিতে কী পাওয়া গেল', 'What the hearing found')}
            className={textareaCls}
          />
        </Field>
      </FormDialog>
    </AdminPage>
  );
};
