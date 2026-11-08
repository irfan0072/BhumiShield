import React, { useEffect, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Field, FormDialog, inputCls, notify } from '@/components/admin/kit';

interface CreateOfficialDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const OFFICIAL_ROLE_OPTIONS = [
  { value: 'sub_registrar', label_bn: 'সাব-রেজিস্ট্রার', label_en: 'Sub-Registrar' },
  { value: 'registry_data_officer', label_bn: 'রেজিস্ট্রি ডেটা অফিসার', label_en: 'Registry Data Officer' },
  { value: 'ac_land', label_bn: 'এসি ল্যান্ড', label_en: 'AC Land' },
  { value: 'land_office_assistant', label_bn: 'ভূমি সহকারী', label_en: 'Land Office Assistant' },
  { value: 'field_verification_officer', label_bn: 'মাঠ যাচাই কর্মকর্তা', label_en: 'Field Verification Officer' },
  { value: 'settlement_records_officer', label_bn: 'সেটেলমেন্ট রেকর্ডস অফিসার', label_en: 'Settlement Records Officer' },
  { value: 'settlement_checker', label_bn: 'সহকারী সেটেলমেন্ট অফিসার', label_en: 'Settlement Checker' },
  { value: 'kanungo', label_bn: 'কানুনগো', label_en: 'Kanungo' },
  { value: 'uno', label_bn: 'ইউএনও', label_en: 'UNO' },
  { value: 'adc_revenue', label_bn: 'এডিসি রাজস্ব', label_en: 'ADC Revenue' },
  { value: 'bank_officer', label_bn: 'ব্যাংক কর্মকর্তা', label_en: 'Bank Officer' },
  { value: 'bank_manager', label_bn: 'ব্যাংক ম্যানেজার', label_en: 'Bank Manager' },
  { value: 'lawyer_court_user', label_bn: 'আইনজীবী', label_en: 'Advocate' },
  { value: 'dc_acquisition_officer', label_bn: 'অধিগ্রহণ কর্মকর্তা', label_en: 'Acquisition Officer' },
  { value: 'auditor', label_bn: 'অডিটর', label_en: 'Auditor' },
  { value: 'admin', label_bn: 'সিস্টেম অ্যাডমিন', label_en: 'System Admin' },
];

export const CreateOfficialDialog: React.FC<CreateOfficialDialogProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t, lang } = useAppUI();

  const [role, setRole] = useState('sub_registrar');
  const [fullNameBn, setFullNameBn] = useState('');
  const [fullNameEn, setFullNameEn] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nid, setNid] = useState('');
  const [password, setPassword] = useState('Official@2026');

  // Office selection
  const [offices, setOffices] = useState<any[]>([]);
  const [officeId, setOfficeId] = useState<number>(1);
  const [customOfficeBn, setCustomOfficeBn] = useState('');
  const [officesFailed, setOfficesFailed] = useState(false);
  const [officesLoading, setOfficesLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadOffices = () => {
    setOfficesLoading(true);
    setOfficesFailed(false);
    BhumiApi.listOffices()
      .then((res: any) => {
        const items = Array.isArray(res) ? res : res.items || [];
        setOffices(items);
        if (items.length > 0 && !items.some((o: any) => o.id === officeId)) {
          setOfficeId(items[0].id);
        }
      })
      .catch(() => setOfficesFailed(true))
      .finally(() => setOfficesLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      loadOffices();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    setRole('sub_registrar');
    setFullNameBn('');
    setFullNameEn('');
    setUsername('');
    setPhone('');
    setEmail('');
    setNid('');
    setPassword('Official@2026');
    setCustomOfficeBn('');
    setErrorMsg('');
  };

  const handleGenerateOfficialUsername = () => {
    const rolePrefix = role.replace(/[^a-z0-9]/g, '_');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setUsername(`${rolePrefix}_${randomSuffix}`);
  };

  const handleSubmit = async () => {
    setErrorMsg('');

    if (!fullNameBn.trim() && !fullNameEn.trim()) {
      setErrorMsg(t('নাম লিখুন', 'Enter a name'));
      return;
    }
    if (phone.trim() && !/^(?:\+?8801|01)[3-9]\d{8}$/.test(phone.trim())) {
      setErrorMsg(t('মোবাইল নম্বর সঠিক নয়', 'Invalid mobile number'));
      return;
    }

    const selectedOffice = offices.find((o) => o.id === officeId);
    const officeNameBn = customOfficeBn.trim() || selectedOffice?.name_bn || 'উপজেলা ভূমি অফিস';
    const officeNameEn = selectedOffice?.name_en || officeNameBn;

    const uname = username.trim() || `${role}_${Date.now().toString().slice(-4)}`;

    try {
      setLoading(true);
      const payload = {
        username: uname,
        full_name_bn: fullNameBn.trim() || fullNameEn.trim(),
        full_name_en: fullNameEn.trim() || fullNameBn.trim(),
        role,
        office_id: officeId > 0 ? officeId : undefined,
        office_bn: officeNameBn,
        office_en: officeNameEn,
        office_name: officeNameBn,
        phone: phone.trim() || undefined,
        phone_dummy: phone.trim() || undefined,
        email: email.trim() || undefined,
        nid: nid.trim() || undefined,
        password: password.trim() || 'Official@2026',
        is_identity_verified: 1,
        is_profile_complete: 1,
        registration_channel: 'official_appointment',
      };

      await BhumiApi.createUser(payload);
      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.response?.data?.code === 'USERNAME_EXISTS') {
        notify.err({ message_bn: 'এই ইউজারনেম আগেই আছে', message_en: 'Username already taken' }, lang);
      } else {
        notify.err(err, lang);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={t('নতুন কর্মকর্তা', 'New official')}
      submitLabel={t('তৈরি করুন', 'Create')}
      cancelLabel={t('বাতিল', 'Cancel')}
      onSubmit={handleSubmit}
      busy={loading}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('নাম', 'Name')}>
          <input
            value={fullNameBn}
            onChange={(e) => setFullNameBn(e.target.value)}
            placeholder={t('পূর্ণ নাম', 'Full name')}
            className={inputCls}
            autoFocus
          />
        </Field>
        <Field label={t('পদবী', 'Role')}>
          <Select value={role} onValueChange={(val) => setRole(val)}>
            <SelectTrigger className="h-9 w-full rounded-lg text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {OFFICIAL_ROLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {lang === 'bn' ? opt.label_bn : opt.label_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t('অফিস', 'Office')} className="sm:col-span-2">
          {officesFailed ? (
            <div className="flex h-9 items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs text-rose-700">
              <span>{t('অফিস তালিকা আসেনি', 'Could not load offices')}</span>
              <button
                type="button"
                onClick={loadOffices}
                className="inline-flex items-center gap-1 font-medium hover:underline cursor-pointer"
              >
                <RotateCcw className="size-3" />
                {t('আবার চেষ্টা', 'Retry')}
              </button>
            </div>
          ) : (
            <Select value={String(officeId)} onValueChange={(val) => setOfficeId(Number(val))} disabled={officesLoading && offices.length === 0}>
              <SelectTrigger className="h-9 w-full rounded-lg text-sm">
                <SelectValue placeholder={officesLoading ? t('লোড হচ্ছে…', 'Loading…') : t('অফিস বাছুন', 'Choose office')} />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {offices.map((off) => (
                  <SelectItem key={off.id} value={String(off.id)}>
                    {lang === 'bn' ? off.name_bn || off.name_en : off.name_en || off.name_bn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
        <Field label={t('ইউজারনেম', 'Username')} className="sm:col-span-2">
          <div className="relative">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder={t('স্বয়ংক্রিয়', 'Automatic')}
              className={`${inputCls} pr-9 font-mono`}
            />
            <button
              type="button"
              onClick={handleGenerateOfficialUsername}
              title={t('তৈরি করুন', 'Generate')}
              aria-label={t('তৈরি করুন', 'Generate')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-[#006A4E] cursor-pointer"
            >
              <Sparkles className="size-3.5" />
            </button>
          </div>
        </Field>
      </div>

      <Accordion type="single" collapsible className="rounded-lg border border-slate-200 px-3">
        <AccordionItem value="more" className="border-b-0">
          <AccordionTrigger className="min-h-0 py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 hover:no-underline">
            {t('আরও তথ্য', 'More details')}
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('ইংরেজি নাম', 'English name')}>
                <input value={fullNameEn} onChange={(e) => setFullNameEn(e.target.value)} placeholder="Kazi Mahfuzur Rahman" className={inputCls} />
              </Field>
              <Field label={t('পাসওয়ার্ড', 'Password')}>
                <input value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} font-mono`} />
              </Field>
              <Field label={t('মোবাইল', 'Mobile')}>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="017xxxxxxxx"
                  maxLength={14}
                  inputMode="tel"
                  className={`${inputCls} font-mono`}
                />
              </Field>
              <Field label={t('ইমেইল', 'Email')}>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="officer@land.gov.bd" className={inputCls} />
              </Field>
              <Field label={t('এনআইডি', 'NID')}>
                <input
                  value={nid}
                  onChange={(e) => setNid(e.target.value.replace(/\D/g, ''))}
                  maxLength={17}
                  inputMode="numeric"
                  className={`${inputCls} font-mono`}
                />
              </Field>
              <Field label={t('অন্য অফিসের নাম', 'Other office name')}>
                <input
                  value={customOfficeBn}
                  onChange={(e) => setCustomOfficeBn(e.target.value)}
                  placeholder={t('তালিকায় না থাকলে', 'If not listed')}
                  className={inputCls}
                />
              </Field>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {errorMsg && <p className="text-xs text-rose-600">{errorMsg}</p>}
    </FormDialog>
  );
};
