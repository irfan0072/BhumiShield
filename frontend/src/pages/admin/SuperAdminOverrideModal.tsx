import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { BhumiApi } from '@/api/client';
import { useAppUI } from '@/i18n';
import { toBanglaDigits } from '@/theme/tokens';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, FormDialog, inputCls, notify } from '@/components/admin/kit';

interface SuperAdminOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
  actionType?: string;
  targetId?: string | number;
  extraContext?: any;
  defaultTargetType?: string;
  defaultTargetId?: string;
}

const ACTION_TYPES: Array<{ id: string; bn: string; en: string }> = [
  { id: 'TRANSFER_STAGE_ADVANCE', bn: 'আবেদন এগিয়ে নিন', en: 'Advance application' },
  { id: 'TICKET_ESCALATE', bn: 'টিকিট জরুরি করুন', en: 'Escalate ticket' },
  { id: 'PLOT_UNFREEZE_ADMIN', bn: 'জমি খুলে দিন', en: 'Unfreeze plot' },
  { id: 'GENERAL_ADMIN_NOTE', bn: 'সাধারণ আদেশ', en: 'General order' },
];

const MIN_REASON = 15;
const MIN_EVIDENCE = 5;

export const SuperAdminOverrideModal: React.FC<SuperAdminOverrideModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionType,
  targetId: propTargetId,
  defaultTargetType = 'TRANSFER_STAGE_ADVANCE',
  defaultTargetId = '',
}) => {
  const { t, lang } = useAppUI();
  const [targetType, setTargetType] = useState<string>(actionType || defaultTargetType);
  const [targetId, setTargetId] = useState<string>(propTargetId !== undefined ? String(propTargetId) : defaultTargetId);
  const [reasonBn, setReasonBn] = useState('');
  const [evidenceRef, setEvidenceRef] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fresh form every time the dialog opens, prefilled from the caller.
  useEffect(() => {
    if (!isOpen) return;
    setTargetType(actionType || defaultTargetType);
    setTargetId(propTargetId !== undefined && propTargetId !== null ? String(propTargetId) : defaultTargetId);
    setReasonBn('');
    setEvidenceRef('');
    setConfirmed(false);
  }, [isOpen, actionType, propTargetId, defaultTargetType, defaultTargetId]);

  const reasonLen = reasonBn.trim().length;
  const evidenceLen = evidenceRef.trim().length;
  const valid = !!targetType && targetId.trim().length > 0 && reasonLen >= MIN_REASON && evidenceLen >= MIN_EVIDENCE && confirmed;

  // Keep unknown action types (passed by callers) selectable.
  const options = ACTION_TYPES.some((a) => a.id === targetType)
    ? ACTION_TYPES
    : [...ACTION_TYPES, { id: targetType, bn: targetType.replace(/_/g, ' ').toLowerCase(), en: targetType.replace(/_/g, ' ').toLowerCase() }];

  const submit = async () => {
    if (!valid) return;
    setLoading(true);
    try {
      const res = await BhumiApi.performAdminOverride({
        target_type: targetType,
        target_id: targetId.trim(),
        reason_bn: reasonBn.trim(),
        evidence_reference: evidenceRef.trim(),
        confirmation: confirmed,
      });
      notify.ok(
        (lang === 'bn' ? res?.message_bn : res?.message_en || res?.message_bn) || t('আদেশ কার্যকর হয়েছে', 'Order applied')
      );
      onSuccess(res);
      onClose();
    } catch (err) {
      notify.err(err, lang, t('আদেশ কার্যকর করা যায়নি', 'Could not apply order'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={t('বিশেষ আদেশ', 'Special order')}
      description={t('সব পদক্ষেপ অডিটে সংরক্ষিত হয়', 'Every step is audited')}
      submitLabel={t('কার্যকর করুন', 'Apply')}
      cancelLabel={t('বাতিল', 'Cancel')}
      onSubmit={submit}
      busy={loading}
      disabled={!valid}
      destructive
    >
      <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
        <AlertTriangle className="size-4 shrink-0" />
        {t('আইনি সিদ্ধান্ত বদলানো যাবে না', 'Cannot override legal decisions')}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('কাজের ধরন', 'Action type')}>
          <Select value={targetType} onValueChange={setTargetType}>
            <SelectTrigger className="h-9 w-full rounded-lg text-sm">
              <SelectValue placeholder={t('বেছে নিন', 'Choose')} />
            </SelectTrigger>
            <SelectContent>
              {options.map((a) => (
                <SelectItem key={a.id} value={a.id} className="text-sm">
                  {t(a.bn, a.en)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t('কেস নম্বর', 'Case ID')}>
          <input
            className={inputCls}
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            placeholder="TR-2026-000101"
          />
        </Field>
      </div>

      <Field label={t('কারণ', 'Reason')}>
        <Textarea
          rows={3}
          value={reasonBn}
          onChange={(e) => setReasonBn(e.target.value)}
          placeholder={t('কেন প্রয়োজন লিখুন', 'Why is this needed')}
          className="min-h-0 rounded-lg text-sm"
        />
        <span
          className={cn(
            'block text-right text-xs',
            reasonLen >= MIN_REASON ? 'text-emerald-600' : 'text-slate-400'
          )}
        >
          {toBanglaDigits(reasonLen, lang)}/{toBanglaDigits(MIN_REASON, lang)}
        </span>
      </Field>

      <Field
        label={t('আদেশ নম্বর', 'Order reference')}
        hint={evidenceLen > 0 && evidenceLen < MIN_EVIDENCE ? t('কমপক্ষে ৫ অক্ষর', 'At least 5 characters') : undefined}
      >
        <input
          className={inputCls}
          value={evidenceRef}
          onChange={(e) => setEvidenceRef(e.target.value)}
          placeholder={t('স্মারক বা আদালতের আদেশ', 'Memo or court order')}
        />
      </Field>

      <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5">
        <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} />
        <span className="text-sm text-slate-700">{t('আমি দায়িত্ব নিচ্ছি', 'I take responsibility')}</span>
      </label>
    </FormDialog>
  );
};
