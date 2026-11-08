import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, RotateCcw, Send, XCircle } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DetailList, DetailSheet, Field, FormDialog, StatusBadge, notify } from '@/components/admin/kit';
import { BatchStatus, BlockedNote, canCheckBatch, canResubmitBatch, isAdminRole, textareaCls, up, useFmt } from './shared';

type Decision = 'APPROVED' | 'REJECTED' | 'RETURNED';

/**
 * Detail panel for one onboarding (survey) batch: items, maker info and the
 * maker-checker actions (return / reject / approve, or resubmit for the maker).
 */
export const BatchSheet: React.FC<{
  batchRef: number | string | null;
  onClose: () => void;
  reload: () => Promise<void>;
}> = ({ batchRef, onClose, reload }) => {
  const { role, user } = useAppUI();
  const { lang, t, n, date, dec } = useFmt();
  const [full, setFull] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [resubmitOpen, setResubmitOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (batchRef === null) {
      setFull(null);
      return;
    }
    let alive = true;
    setLoading(true);
    BhumiApi.getOnboardingBatch(batchRef)
      .then((res) => alive && setFull(res))
      .catch((e) => {
        if (!alive) return;
        notify.err(e, lang);
        onClose();
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [batchRef]); // eslint-disable-line react-hooks/exhaustive-deps

  const batch = full?.batch;
  const items: any[] = full?.items || [];
  const status = up(batch?.status);
  const isMaker = !!batch && Number(batch.maker_user_id) === Number(user?.id);
  const hasInvalid = items.some((it) => up(it.validation_status) === 'INVALID');
  const checker = canCheckBatch(role) && !isMaker;
  const maker = canResubmitBatch(role) && (isMaker || isAdminRole(role));
  const correction = batch?.proof_package?.correction_notes;

  const decide = async () => {
    if (!batch || !decision) return;
    setBusy(true);
    try {
      const res = await BhumiApi.decideOnboardingBatch(batch.id, decision, note.trim() || undefined);
      notify.ok(
        (lang === 'bn' ? res?.message_bn : res?.message_en) ||
          (decision === 'APPROVED'
            ? t('ব্যাচ অনুমোদিত', 'Batch approved')
            : decision === 'RETURNED'
            ? t('ব্যাচ ফেরত পাঠানো হয়েছে', 'Batch returned')
            : t('ব্যাচ বাতিল', 'Batch rejected'))
      );
      setDecision(null);
      onClose();
      await reload();
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setBusy(false);
    }
  };

  const resubmit = async () => {
    if (!batch) return;
    setBusy(true);
    try {
      const payloadItems = items.map((it) => {
        const { _validation_errors, ...rest } = it.payload || {};
        return rest;
      });
      const res = await BhumiApi.resubmitOnboardingBatch(batch.id, {
        items: payloadItems,
        notes_bn: note.trim() || undefined,
      });
      notify.ok((lang === 'bn' ? res?.message_bn : res?.message_en) || t('আবার জমা হয়েছে', 'Resubmitted'));
      setResubmitOpen(false);
      onClose();
      await reload();
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setBusy(false);
    }
  };

  const openDecision = (d: Decision) => {
    setNote('');
    setDecision(d);
  };

  let footer: React.ReactNode = null;
  if (batch && status === 'SUBMITTED') {
    if (checker) {
      footer = (
        <>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => openDecision('RETURNED')}>
            <RotateCcw className="size-4" />
            {t('ফেরত', 'Return')}
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-rose-700" onClick={() => openDecision('REJECTED')}>
            <XCircle className="size-4" />
            {t('বাতিল', 'Reject')}
          </Button>
          <Button size="sm" className="h-9 gap-1.5" disabled={hasInvalid} onClick={() => openDecision('APPROVED')}>
            <CheckCircle2 className="size-4" />
            {t('অনুমোদন', 'Approve')}
          </Button>
        </>
      );
    } else if (isMaker) {
      footer = <BlockedNote>{t('অন্য কর্মকর্তা যাচাই করবেন', 'Another officer must check')}</BlockedNote>;
    }
  } else if (batch && status === 'RETURNED' && maker) {
    footer = (
      <Button
        size="sm"
        className="h-9 gap-1.5"
        onClick={() => {
          setNote('');
          setResubmitOpen(true);
        }}
      >
        <Send className="size-4" />
        {t('আবার জমা দিন', 'Resubmit')}
      </Button>
    );
  }

  return (
    <>
      <DetailSheet
        open={batchRef !== null}
        onOpenChange={(o) => !o && onClose()}
        title={batch?.batch_no || t('ব্যাচ', 'Batch')}
        subtitle={batch ? <BatchStatus code={batch.status} /> : undefined}
        footer={footer}
      >
        {loading || !batch ? (
          <div className="flex justify-center py-10 text-slate-400">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="items">
            <TabsList className="h-9 w-full">
              <TabsTrigger value="items" className="flex-1 gap-1.5 text-xs">
                {t('রেকর্ড', 'Records')}
                <span className="text-slate-400">{n(items.length)}</span>
              </TabsTrigger>
              <TabsTrigger value="info" className="flex-1 text-xs">{t('তথ্য', 'Info')}</TabsTrigger>
            </TabsList>
            <TabsContent value="items" className="mt-3 space-y-3">
              {status === 'RETURNED' && correction && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-500">{t('সংশোধনের নির্দেশ', 'Correction notes')}</div>
                  <p className="whitespace-pre-wrap rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{correction}</p>
                </div>
              )}
              {hasInvalid && status === 'SUBMITTED' && (
                <BlockedNote>{t('ভুল রেকর্ড থাকায় অনুমোদন করা যাবে না', 'Has invalid records, cannot approve')}</BlockedNote>
              )}
              {items.length === 0 ? (
                <p className="text-sm text-slate-500">{t('কোনো রেকর্ড নেই', 'No records')}</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {items.map((it, i) => {
                    const p = it.payload || {};
                    const invalid = up(it.validation_status) === 'INVALID';
                    return (
                      <li key={it.id || i} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800">
                            {t('দাগ', 'Plot')} {n(p.dag_no || '—')}
                            {p.mouza ? <span className="font-normal text-slate-500"> · {p.mouza}</span> : null}
                          </div>
                          <div className="truncate text-xs text-slate-500">
                            {[p.owner_name_bn || p.buyer_name, p.area_decimal ? dec(p.area_decimal) : null, p.survey_type, p.land_class]
                              .filter(Boolean)
                              .join(' · ') || '—'}
                          </div>
                          {invalid && Array.isArray(p._validation_errors) && p._validation_errors.length > 0 && (
                            <div className="text-xs text-rose-600">{p._validation_errors.join(', ')}</div>
                          )}
                        </div>
                        <StatusBadge tone={invalid ? 'red' : 'green'}>{invalid ? t('ভুল', 'Invalid') : t('সঠিক', 'Valid')}</StatusBadge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>
            <TabsContent value="info" className="mt-3">
              <DetailList
                items={[
                  [t('ধরন', 'Type'), batch.record_type === 'SURVEY_RECORD' ? t('জরিপ রেকর্ড', 'Survey record') : batch.record_type],
                  [t('প্রস্তুতকারী', 'Prepared by'), batch.maker_name_bn || batch.maker_role || '—'],
                  [t('জমার তারিখ', 'Submitted'), date(batch.created_at)],
                  !!batch.checker_name_bn && [t('যাচাইকারী', 'Checked by'), batch.checker_name_bn],
                  !!batch.decided_at && [t('সিদ্ধান্তের তারিখ', 'Decided on'), date(batch.decided_at)],
                  !!batch.batch_hash && [
                    t('যাচাই কোড', 'Hash'),
                    <span key="h" className="font-mono text-xs">
                      {String(batch.batch_hash).slice(0, 16)}…
                    </span>,
                  ],
                ]}
              />
            </TabsContent>
          </Tabs>
        )}
      </DetailSheet>

      <FormDialog
        open={!!decision}
        onOpenChange={(o) => !o && setDecision(null)}
        title={
          decision === 'APPROVED'
            ? t('ব্যাচ অনুমোদন', 'Approve batch')
            : decision === 'RETURNED'
            ? t('সংশোধনে ফেরত', 'Return for correction')
            : t('ব্যাচ বাতিল', 'Reject batch')
        }
        description={batch?.batch_no}
        submitLabel={decision === 'APPROVED' ? t('অনুমোদন', 'Approve') : decision === 'RETURNED' ? t('ফেরত পাঠান', 'Return') : t('বাতিল করুন', 'Reject')}
        cancelLabel={t('বাতিল', 'Cancel')}
        destructive={decision === 'REJECTED'}
        busy={busy}
        disabled={decision === 'RETURNED' && note.trim().length < 5}
        onSubmit={decide}
      >
        <Field
          label={decision === 'RETURNED' ? t('কী সংশোধন করতে হবে', 'What to correct') : t('মন্তব্য', 'Note')}
          hint={decision === 'RETURNED' ? t('অন্তত ৫ অক্ষর', 'At least 5 characters') : undefined}
        >
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={decision === 'RETURNED' ? t('কোন রেকর্ডে কী ভুল', 'Which record is wrong and why') : t('ঐচ্ছিক', 'Optional')}
            className={textareaCls}
          />
        </Field>
      </FormDialog>

      <FormDialog
        open={resubmitOpen}
        onOpenChange={setResubmitOpen}
        title={t('আবার জমা দিন', 'Resubmit batch')}
        description={batch?.batch_no}
        submitLabel={t('জমা দিন', 'Submit')}
        cancelLabel={t('বাতিল', 'Cancel')}
        busy={busy}
        onSubmit={resubmit}
      >
        <Field label={t('মন্তব্য', 'Note')}>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('কী সংশোধন করেছেন', 'What you corrected')}
            className={textareaCls}
          />
        </Field>
      </FormDialog>
    </>
  );
};
