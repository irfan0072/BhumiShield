import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Field, FormDialog, inputCls, notify } from '@/components/admin/kit';

interface CreateCitizenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateCitizenDialog: React.FC<CreateCitizenDialogProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t, lang } = useAppUI();

  const [fullNameBn, setFullNameBn] = useState('');
  const [fullNameEn, setFullNameEn] = useState('');
  const [username, setUsername] = useState('');
  const [nid, setNid] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [addressBn, setAddressBn] = useState('');
  const [role, setRole] = useState<'citizen' | 'service_point_operator'>('citizen');
  const [password, setPassword] = useState('Citizen@2026');
  const [isVerified, setIsVerified] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) setErrorMsg('');
  }, [isOpen]);

  const resetForm = () => {
    setFullNameBn('');
    setFullNameEn('');
    setUsername('');
    setNid('');
    setPhone('');
    setEmail('');
    setAddressBn('');
    setRole('citizen');
    setPassword('Citizen@2026');
    setIsVerified(true);
    setErrorMsg('');
  };

  const handleGenerateUsername = () => {
    if (nid) {
      setUsername(`cit_${nid.slice(-6)}`);
    } else if (phone) {
      setUsername(`cit_${phone.slice(-6)}`);
    } else if (fullNameEn) {
      const clean = fullNameEn.toLowerCase().replace(/[^a-z0-9]/g, '');
      setUsername(`${clean}_${Math.floor(100 + Math.random() * 900)}`);
    }
  };

  const handleSubmit = async () => {
    setErrorMsg('');

    if (!fullNameBn.trim() && !fullNameEn.trim()) {
      setErrorMsg(t('নাম লিখুন', 'Enter a name'));
      return;
    }
    if (!nid.trim() && !phone.trim() && !email.trim()) {
      setErrorMsg(t('এনআইডি বা মোবাইল দিন', 'Enter NID or mobile'));
      return;
    }
    if (nid.trim() && !/^(?:\d{10}|\d{13}|\d{17})$/.test(nid.trim())) {
      setErrorMsg(t('এনআইডি ১০, ১৩ বা ১৭ সংখ্যার', 'NID must be 10, 13 or 17 digits'));
      return;
    }
    if (phone.trim() && !/^(?:\+?8801|01)[3-9]\d{8}$/.test(phone.trim())) {
      setErrorMsg(t('মোবাইল নম্বর সঠিক নয়', 'Invalid mobile number'));
      return;
    }

    const uname = username.trim() || (nid ? `cit_${nid.slice(-6)}` : `user_${Date.now().toString().slice(-6)}`);

    try {
      setLoading(true);
      const payload = {
        username: uname,
        full_name_bn: fullNameBn.trim() || fullNameEn.trim(),
        full_name_en: fullNameEn.trim() || fullNameBn.trim(),
        nid: nid.trim(),
        phone: phone.trim(),
        phone_dummy: phone.trim(),
        email: email.trim() || undefined,
        present_address_bn: addressBn.trim() || undefined,
        role,
        password: password.trim() || 'Citizen@2026',
        is_identity_verified: isVerified ? 1 : 0,
        is_profile_complete: 1,
        registration_channel: 'admin_provisioned',
      };

      await BhumiApi.createUser(payload);
      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === 'USERNAME_EXISTS') {
        notify.err({ message_bn: 'এই ইউজারনেম আগেই আছে', message_en: 'Username already taken' }, lang);
      } else if (code === 'NID_ALREADY_REGISTERED') {
        notify.err({ message_bn: 'এই এনআইডি আগেই নিবন্ধিত', message_en: 'NID already registered' }, lang);
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
      title={t('নতুন নাগরিক', 'New citizen')}
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
        <Field label={t('ধরন', 'Type')}>
          <Select value={role} onValueChange={(val: any) => setRole(val)}>
            <SelectTrigger className="h-9 w-full rounded-lg text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="citizen">{t('নাগরিক', 'Citizen')}</SelectItem>
              <SelectItem value="service_point_operator">{t('ইউডিসি উদ্যোক্তা', 'UDC operator')}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={t('এনআইডি', 'NID')}>
          <input
            value={nid}
            onChange={(e) => setNid(e.target.value.replace(/\D/g, ''))}
            onBlur={() => !username && handleGenerateUsername()}
            placeholder={t('১০, ১৩ বা ১৭ সংখ্যা', '10, 13 or 17 digits')}
            maxLength={17}
            inputMode="numeric"
            className={`${inputCls} font-mono`}
          />
        </Field>
        <Field label={t('মোবাইল', 'Mobile')}>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => !username && handleGenerateUsername()}
            placeholder="017xxxxxxxx"
            maxLength={14}
            inputMode="tel"
            className={`${inputCls} font-mono`}
          />
        </Field>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
        <Checkbox checked={isVerified} onCheckedChange={(v) => setIsVerified(v === true)} />
        {t('এনআইডি যাচাইকৃত', 'NID verified')}
      </label>

      <Accordion type="single" collapsible className="rounded-lg border border-slate-200 px-3">
        <AccordionItem value="more" className="border-b-0">
          <AccordionTrigger className="min-h-0 py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 hover:no-underline">
            {t('আরও তথ্য', 'More details')}
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('ইংরেজি নাম', 'English name')}>
                <input value={fullNameEn} onChange={(e) => setFullNameEn(e.target.value)} placeholder="Md. Rafiqul Islam" className={inputCls} />
              </Field>
              <Field label={t('ইউজারনেম', 'Username')}>
                <div className="relative">
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder={t('স্বয়ংক্রিয়', 'Automatic')}
                    className={`${inputCls} pr-9 font-mono`}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateUsername}
                    title={t('তৈরি করুন', 'Generate')}
                    aria-label={t('তৈরি করুন', 'Generate')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-[#006A4E] cursor-pointer"
                  >
                    <Sparkles className="size-3.5" />
                  </button>
                </div>
              </Field>
              <Field label={t('পাসওয়ার্ড', 'Password')}>
                <input value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} font-mono`} />
              </Field>
              <Field label={t('ইমেইল', 'Email')}>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className={inputCls} />
              </Field>
              <Field label={t('ঠিকানা', 'Address')} className="sm:col-span-2">
                <input value={addressBn} onChange={(e) => setAddressBn(e.target.value)} placeholder={t('গ্রাম, উপজেলা, জেলা', 'Village, upazila, district')} className={inputCls} />
              </Field>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {errorMsg && <p className="text-xs text-rose-600">{errorMsg}</p>}
    </FormDialog>
  );
};
