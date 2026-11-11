import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { cn } from '@/lib/utils';
import { FormDialog, Field, inputCls, notify } from '@/components/admin/kit';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isoDate, isValidMobile, normalizeMobile, OfficeItem } from './officeUtils';

/** Slot values are the backend's allowed `slot_time` values. */
const SLOTS = [
  { v: '10:00 AM', bn: 'সকাল ১০টা', en: '10:00 AM' },
  { v: '11:30 AM', bn: 'সকাল ১১:৩০', en: '11:30 AM' },
  { v: '02:30 PM', bn: 'দুপুর ২:৩০', en: '02:30 PM' },
  { v: '03:30 PM', bn: 'বিকাল ৩:৩০', en: '03:30 PM' },
];

/** Values are the backend's allowed `service_type` values. */
const PURPOSES = [
  { v: 'MUTATION_HEARING', bn: 'নামজারি শুনানি', en: 'Mutation hearing' },
  { v: 'DEED_REGISTRATION', bn: 'দলিল রেজিস্ট্রি', en: 'Deed registration' },
  { v: 'RECORD_CORRECTION_HEARING', bn: 'রেকর্ড সংশোধন', en: 'Record correction' },
  { v: 'LAND_DEVELOPMENT_TAX', bn: 'ভূমি উন্নয়ন কর', en: 'Land tax' },
  { v: 'MAP_CADASTRAL_CONSULTATION', bn: 'নকশা / ম্যাপ', en: 'Map / plot sheet' },
  { v: 'GENERAL_INQUIRY', bn: 'সাধারণ পরামর্শ', en: 'General advice' },
];

const ctl = cn(inputCls, 'h-11 rounded-xl');

export const AppointmentDialog: React.FC<{ office: OfficeItem | null; onClose: () => void }> = ({ office, onClose }) => {
  const { t, lang } = useAppUI();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState(SLOTS[0].v);
  const [purpose, setPurpose] = useState(PURPOSES[0].v);
  const [caseRef, setCaseRef] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (office) setTouched(false);
  }, [office]);

  const { minDate, maxDate } = useMemo(() => {
    const now = new Date();
    const max = new Date();
    max.setDate(max.getDate() + 60);
    return { minDate: isoDate(now), maxDate: isoDate(max) };
  }, []);

  // Fri (5) and Sat (6) are the weekly holidays.
  const weekday = date ? new Date(`${date}T00:00:00`).getDay() : -1;
  const dateErr = !date
    ? ''
    : date < minDate || date > maxDate
      ? t('এই তারিখ নেওয়া যাবে না', 'Date not allowed')
      : weekday === 5 || weekday === 6
        ? t('শুক্র ও শনিবার অফিস বন্ধ', 'Closed on Fri & Sat')
        : '';
  const phoneErr = phone && !isValidMobile(phone) ? t('১১ সংখ্যার মোবাইল নম্বর দিন (01XXXXXXXXX)', 'Enter 11-digit mobile (01XXXXXXXXX)') : '';
  const valid = !!office && name.trim().length >= 2 && isValidMobile(phone) && !!date && !dateErr;

  const submit = async () => {
    setTouched(true);
    if (!office || !valid || busy) return;
    setBusy(true);
    const mobile = normalizeMobile(phone);
    try {
      // Original payload keys are kept; slot_date/slot_time/service_type/case_reference are the
      // field names the backend (createAppointment) actually reads.
      const res = await BhumiApi.createAppointment({
        office_id: office.id,
        office_name_bn: office.name_bn,
        citizen_name_bn: name.trim(),
        citizen_phone: mobile,
        appointment_date: date,
        time_slot: slot,
        service_category: purpose,
        case_ref: caseRef.trim(),
        slot_date: date,
        slot_time: slot,
        service_type: purpose,
        case_reference: caseRef.trim(),
      });
      const code = res?.appointment?.appointment_code || res?.token || '';
      toast.success(t('সময় নেওয়া হয়েছে', 'Visit booked'), {
        description: code ? `${t('রেফারেন্স', 'Reference')}: ${code}` : undefined,
        duration: 12000,
      });
      setName('');
      setPhone('');
      setDate('');
      setCaseRef('');
      onClose();
    } catch (err) {
      notify.err(err, lang, t('সময় নেওয়া যায়নি, আবার চেষ্টা করুন', 'Could not book, try again'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDialog
      open={!!office}
      onOpenChange={(o) => !o && onClose()}
      title={t('অফিসে যাওয়ার সময় নিন', 'Book a visit')}
      description={office ? (lang === 'bn' ? office.name_bn : office.name_en || office.name_bn) : undefined}
      submitLabel={t('সময় নিশ্চিত করুন', 'Confirm')}
      cancelLabel={t('বাতিল', 'Cancel')}
      onSubmit={submit}
      busy={busy}
      disabled={!valid}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('তারিখ', 'Date')}>
          <input
            type="date"
            required
            value={date}
            min={minDate}
            max={maxDate}
            onChange={(e) => setDate(e.target.value)}
            className={cn(ctl, dateErr && 'border-rose-400')}
          />
          {dateErr && <span className="block text-xs text-rose-600">{dateErr}</span>}
        </Field>
        <Field label={t('সময়', 'Time')}>
          <Select value={slot} onValueChange={setSlot}>
            <SelectTrigger className="h-11 w-full rounded-xl text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SLOTS.map((s) => (
                <SelectItem key={s.v} value={s.v}>
                  {lang === 'bn' ? s.bn : s.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label={t('কী কাজে যাবেন', 'Purpose')}>
        <Select value={purpose} onValueChange={setPurpose}>
          <SelectTrigger className="h-11 w-full rounded-xl text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PURPOSES.map((p) => (
              <SelectItem key={p.v} value={p.v}>
                {lang === 'bn' ? p.bn : p.en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label={t('আপনার নাম', 'Your name')}>
        <input
          required
          value={name}
          maxLength={80}
          autoComplete="name"
          onChange={(e) => setName(e.target.value)}
          placeholder={t('যেমন: রফিকুল ইসলাম', 'e.g. Rafiqul Islam')}
          className={ctl}
        />
      </Field>

      <Field label={t('মোবাইল নম্বর', 'Mobile number')}>
        <input
          required
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={phone}
          maxLength={14}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="01XXXXXXXXX"
          className={cn(ctl, 'font-mono', phoneErr && 'border-rose-400')}
        />
        {(phoneErr || (touched && !phone)) && (
          <span className="block text-xs text-rose-600">{phoneErr || t('মোবাইল নম্বর দিন', 'Enter mobile number')}</span>
        )}
      </Field>

      <Field label={t('আবেদন নম্বর (না থাকলে খালি রাখুন)', 'Application no (optional)')}>
        <input
          value={caseRef}
          maxLength={30}
          onChange={(e) => setCaseRef(e.target.value.replace(/[^\p{L}\p{N}\-/ ]/gu, ''))}
          placeholder="MUT-2026-101"
          className={cn(ctl, 'font-mono')}
        />
      </Field>
    </FormDialog>
  );
};

export default AppointmentDialog;
