import React, { useEffect, useState } from 'react';
import { useAppUI } from '@/i18n';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Field, FormDialog, inputCls } from '@/components/admin/kit';
import { DISPUTE_TYPES, plotLabel } from './shared';

/** Payload accepted by RoleControlController::createDispute (POST /citizen/disputes). */
export interface CourtOrderPayload {
  plot_id: number;
  complainant_name_bn?: string;
  complainant_nid?: string;
  dispute_type: string;
  description_bn: string;
}

export const InjunctionDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plot: any | null;
  onSubmit: (payload: CourtOrderPayload) => Promise<void>;
}> = ({ open, onOpenChange, plot, onSubmit }) => {
  const { lang, t, user } = useAppUI();
  const [type, setType] = useState('INJUNCTION');
  const [suitNo, setSuitNo] = useState('');
  const [court, setCourt] = useState('');
  const [details, setDetails] = useState('');
  const [name, setName] = useState('');
  const [nid, setNid] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType('INJUNCTION');
    setSuitNo('');
    setCourt('');
    setDetails('');
    setName(user?.full_name_bn || '');
    setNid(user?.nid || '');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!plot) return;
    const parts = [
      suitNo.trim() && `মামলা নং: ${suitNo.trim()}`,
      court.trim() && `আদালত: ${court.trim()}`,
      details.trim(),
    ].filter(Boolean);
    const payload: CourtOrderPayload = {
      plot_id: Number(plot.id),
      dispute_type: type,
      description_bn: parts.join('। '),
    };
    if (name.trim()) payload.complainant_name_bn = name.trim();
    if (nid.trim()) payload.complainant_nid = nid.trim();
    setBusy(true);
    try {
      await onSubmit(payload);
      onOpenChange(false);
    } catch {
      // parent already showed the error toast
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('আদালত আদেশ যুক্ত', 'Add court order')}
      description={plot ? `${plotLabel(plot, lang)} · ${plot.mouza_bn || plot.mouza_en || ''}` : undefined}
      submitLabel={t('সংরক্ষণ', 'Save')}
      cancelLabel={t('বাতিল', 'Cancel')}
      onSubmit={submit}
      busy={busy}
      disabled={!plot || details.trim().length < 3}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('ধরন', 'Type')}>
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
            {DISPUTE_TYPES.map((d) => (
              <option key={d.value} value={d.value}>
                {lang === 'bn' ? d.bn : d.en}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('মামলা নম্বর', 'Suit no')}>
          <input className={inputCls} value={suitNo} onChange={(e) => setSuitNo(e.target.value)} />
        </Field>
      </div>
      <Field label={t('আদালত', 'Court')}>
        <input className={inputCls} value={court} onChange={(e) => setCourt(e.target.value)} />
      </Field>
      <Field label={t('আদেশের বিবরণ', 'Order details')}>
        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          className="min-h-0 rounded-lg text-sm"
        />
      </Field>
      <Accordion type="single" collapsible className="rounded-lg border border-slate-200 px-3">
        <AccordionItem value="more" className="border-b-0">
          <AccordionTrigger className="py-2.5 text-xs font-medium text-slate-600 hover:no-underline">
            {t('আরও তথ্য', 'More details')}
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('আবেদনকারী', 'Complainant')}>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label={t('এনআইডি', 'NID')}>
                <input className={inputCls} value={nid} onChange={(e) => setNid(e.target.value)} inputMode="numeric" />
              </Field>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </FormDialog>
  );
};
