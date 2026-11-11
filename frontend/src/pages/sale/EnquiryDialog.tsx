import React, { useEffect, useState } from 'react';
import { useAppUI } from '../../i18n';
import { BhumiApi } from '../../api/client';
import { toBanglaDigits } from '../../theme/tokens';
import { cn } from '@/lib/utils';
import { Field, FormDialog, notify } from '@/components/admin/kit';
import type { ListingItem } from './saleUtils';

const LIMITS = { name: 80, phone: 14, message: 500 };

/** Bangla digits → Latin, then drop spaces and dashes. */
const normPhone = (v: string) =>
  v
    .replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)))
    .replace(/[\s-]/g, '')
    .trim();
const PHONE_RE = /^(?:\+?88)?01[3-9]\d{8}$/;

const publicInput =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-[#006A4E] focus:ring-2 focus:ring-[#006A4E]/15';

export const EnquiryDialog: React.FC<{ listing: ListingItem | null; onOpenChange: (open: boolean) => void }> = ({
  listing,
  onOpenChange,
}) => {
  const { t, lang } = useAppUI();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (listing) setTouched(false);
  }, [listing]);

  const nameOk = name.trim().length >= 2;
  const phoneOk = PHONE_RE.test(normPhone(phone));

  const submit = async () => {
    setTouched(true);
    if (!listing || busy || !nameOk || !phoneOk) return;
    setBusy(true);
    const msg = message.trim() || t('আমি এই জমি কিনতে আগ্রহী।', 'I am interested in this land.');
    try {
      // Backend reads buyer_name_bn / buyer_phone / message_bn (message kept for compatibility).
      await BhumiApi.createListingEnquiry(listing.id, {
        buyer_name: name.trim(),
        buyer_name_bn: name.trim(),
        buyer_phone: normPhone(phone),
        message_bn: msg,
        message: msg,
      });
      notify.ok(t('বার্তা পাঠানো হয়েছে। বিক্রেতা যোগাযোগ করবেন।', 'Message sent. The seller will contact you.'));
      setName('');
      setPhone('');
      setMessage('');
      onOpenChange(false);
    } catch (err) {
      notify.err(err, lang, t('পাঠানো যায়নি। আবার চেষ্টা করুন।', 'Could not send. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const err = (bad: boolean) => touched && bad;

  return (
    <FormDialog
      open={!!listing}
      onOpenChange={onOpenChange}
      title={t('বিক্রেতাকে বার্তা', 'Message the seller')}
      description={
        listing
          ? `${lang === 'bn' ? listing.mouza_bn : listing.mouza_en || listing.mouza_bn} · ${t('দাগ', 'Dag')} ${toBanglaDigits(listing.dag_no, lang)}`
          : undefined
      }
      submitLabel={busy ? t('পাঠানো হচ্ছে…', 'Sending…') : t('পাঠান', 'Send')}
      cancelLabel={t('বাতিল', 'Cancel')}
      busy={busy}
      onSubmit={submit}
    >
      <Field label={t('আপনার নাম', 'Your name')}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, LIMITS.name))}
          maxLength={LIMITS.name}
          autoComplete="name"
          required
          aria-invalid={err(!nameOk)}
          className={cn(publicInput, err(!nameOk) && 'border-rose-300')}
        />
        {err(!nameOk) && <span className="block text-xs text-rose-600">{t('নাম লিখুন', 'Enter your name')}</span>}
      </Field>
      <Field label={t('মোবাইল নম্বর', 'Mobile number')}>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value.slice(0, LIMITS.phone))}
          maxLength={LIMITS.phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="01XXXXXXXXX"
          required
          aria-invalid={err(!phoneOk)}
          className={cn(publicInput, 'font-mono', err(!phoneOk) && 'border-rose-300')}
        />
        {err(!phoneOk) && <span className="block text-xs text-rose-600">{t('সঠিক ১১ সংখ্যার নম্বর দিন', 'Enter a valid 11-digit number')}</span>}
      </Field>
      <Field label={t('বার্তা (ইচ্ছামতো)', 'Message (optional)')}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, LIMITS.message))}
          maxLength={LIMITS.message}
          rows={3}
          placeholder={t('যেমন: জমিটি দেখতে চাই', 'e.g. I want to visit the land')}
          className={cn(publicInput, 'h-auto min-h-[88px] py-2.5')}
        />
        <span className="block text-right text-[11px] text-slate-400">
          {toBanglaDigits(message.length, lang)}/{toBanglaDigits(LIMITS.message, lang)}
        </span>
      </Field>
    </FormDialog>
  );
};
