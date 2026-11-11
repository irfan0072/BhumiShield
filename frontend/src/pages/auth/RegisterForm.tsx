import React, { useRef, useState } from 'react';
import { Clock, ShieldCheck, UserPlus } from 'lucide-react';
import { useAppUI } from '../../i18n';
import { BhumiApi } from '../../api/client';
import { CitizenVerificationModal } from '../../components/CitizenVerificationModal';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { notify } from '@/components/admin/kit';
import { AuthField, PasswordInput, StrengthHint, authInputCls, digitsOnly, isEmail, isNid, isPhone } from './fields';

type Errors = Partial<Record<'name' | 'username' | 'phone' | 'email' | 'nid' | 'password', string>>;

/** Citizen self-registration. Essential fields first; the rest live under "আরও তথ্য". */
export const RegisterForm: React.FC<{
  onGoLogin: (username?: string) => void;
  onSuccessNavigate: (tab: string) => void;
}> = ({ onGoLogin, onSuccessNavigate }) => {
  const { t, lang, setToken, setUser } = useAppUI();
  const [nameBn, setNameBn] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nid, setNid] = useState('');
  const [password, setPassword] = useState('');
  const [office, setOffice] = useState('ঢাকা, বাংলাদেশ');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [pending, setPending] = useState<any | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);

  const validate = (): Errors => {
    const e: Errors = {};
    const em = email.trim();
    if (!nameBn.trim()) e.name = t('নাম দিন', 'Enter your name');
    if (!/^[a-z0-9_]{3,30}$/i.test(username.trim()))
      e.username = t('৩-৩০ অক্ষর: a-z, 0-9, _', '3–30 chars: a-z, 0-9, _');
    if (phone && !isPhone(phone)) e.phone = t('সঠিক নম্বর দিন: 01XXXXXXXXX', 'Use format 01XXXXXXXXX');
    if (!phone && !em) e.phone = t('মোবাইল বা ইমেইল দিন', 'Enter mobile or email');
    if (em && !isEmail(em)) e.email = t('সঠিক ইমেইল দিন', 'Enter a valid email');
    if (!isNid(nid)) e.nid = t('১০, ১৩ বা ১৭ সংখ্যা', '10, 13 or 17 digits');
    if (password.length < 8) e.password = t('কমপক্ষে ৮ অক্ষর', 'At least 8 characters');
    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (busyRef.current) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    busyRef.current = true;
    setBusy(true);
    try {
      // Same payload shape as before; channel follows what the person filled in.
      const method: 'phone' | 'email' = phone ? 'phone' : 'email';
      const payload: any = {
        username: username.trim(),
        password,
        full_name_bn: nameBn.trim(),
        full_name_en: nameEn.trim() || nameBn.trim(),
        role: 'citizen',
        registration_channel: method,
        nid: nid.trim(),
        office_bn: office.trim(),
      };
      if (method === 'phone') {
        payload.phone_dummy = phone;
        if (email.trim()) payload.email = email.trim();
      } else {
        payload.email = email.trim();
      }
      const res = await BhumiApi.register(payload);
      if (res.user && Number(res.user.is_identity_verified) === 0) {
        setPending(res.user);
        notify.ok(t('নিবন্ধন সফল। অনুমোদনের অপেক্ষায়।', 'Registered. Waiting for approval.'));
      } else {
        setToken(res.access_token);
        setUser(res.user);
        onSuccessNavigate('home');
      }
    } catch (err: any) {
      notify.err(err?.response?.data?.detail ?? err, lang, t('নিবন্ধন হয়নি। তথ্য দেখে আবার চেষ্টা করুন।', 'Registration failed. Check your details.'));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  if (pending) {
    return (
      <div className="space-y-4 py-2">
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <Clock className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-900">{t('অনুমোদনের অপেক্ষায়', 'Waiting for approval')}</p>
            <p className="text-xs text-amber-800">
              {t('পরিচয় যাচাইয়ের পর অ্যাকাউন্ট চালু হবে।', 'Your account opens after identity check.')}
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() => setVerifyOpen(true)}
          >
            <ShieldCheck className="size-4" />
            {t('এখনই যাচাই করুন', 'Verify now')}
          </Button>
          <Button
            type="button"
            className="h-11 rounded-xl bg-[#006A4E] text-white hover:bg-[#00553e]"
            onClick={() => onGoLogin(pending.username)}
          >
            {t('লগইন করুন', 'Go to sign in')}
          </Button>
        </div>
        {verifyOpen && (
          <CitizenVerificationModal
            isOpen={verifyOpen}
            onClose={() => setVerifyOpen(false)}
            initialNid={pending.nid || ''}
            onSuccess={() => {
              setVerifyOpen(false);
              notify.ok(t('পরিচয় নিশ্চিত হয়েছে', 'Identity verified'));
            }}
          />
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <AuthField label={t('নাম', 'Name')} error={errors.name}>
          {(id, d) => (
            <input
              id={id}
              aria-describedby={d}
              aria-invalid={!!errors.name || undefined}
              value={nameBn}
              onChange={(e) => setNameBn(e.target.value)}
              placeholder={t('যেমন: মো. রফিকুল ইসলাম', 'e.g. Md. Rafiqul Islam')}
              autoComplete="name"
              maxLength={80}
              className={authInputCls}
            />
          )}
        </AuthField>
        <AuthField label={t('ইউজারনেম', 'Username')} error={errors.username}>
          {(id, d) => (
            <input
              id={id}
              aria-describedby={d}
              aria-invalid={!!errors.username || undefined}
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
              placeholder="rafiq26"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={30}
              className={authInputCls}
            />
          )}
        </AuthField>
        <AuthField label={t('মোবাইল নম্বর', 'Mobile number')} error={errors.phone}>
          {(id, d) => (
            <input
              id={id}
              aria-describedby={d}
              aria-invalid={!!errors.phone || undefined}
              value={phone}
              onChange={(e) => setPhone(digitsOnly(e.target.value, 11))}
              placeholder="01XXXXXXXXX"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={11}
              className={authInputCls}
            />
          )}
        </AuthField>
        <AuthField label={t('এনআইডি নম্বর', 'NID number')} error={errors.nid}>
          {(id, d) => (
            <input
              id={id}
              aria-describedby={d}
              aria-invalid={!!errors.nid || undefined}
              value={nid}
              onChange={(e) => setNid(digitsOnly(e.target.value, 17))}
              placeholder={t('১০/১৩/১৭ সংখ্যা', '10/13/17 digits')}
              inputMode="numeric"
              autoComplete="off"
              maxLength={17}
              className={authInputCls}
            />
          )}
        </AuthField>
      </div>
      <AuthField label={t('পাসওয়ার্ড', 'Password')} error={errors.password} hint={<StrengthHint password={password} />}>
        {(id, d) => (
          <PasswordInput
            id={id}
            aria-describedby={d}
            invalid={!!errors.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
          />
        )}
      </AuthField>

      <Accordion type="single" collapsible>
        <AccordionItem value="more" className="border-none">
          <AccordionTrigger className="py-1.5 text-sm text-slate-600 hover:no-underline">
            {t('আরও তথ্য', 'More details')}
          </AccordionTrigger>
          <AccordionContent className="grid gap-3 pb-1 pt-1 sm:grid-cols-2">
            <AuthField label={t('নাম (ইংরেজি)', 'Name (English)')}>
              {(id) => (
                <input
                  id={id}
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  autoComplete="name"
                  maxLength={80}
                  className={authInputCls}
                />
              )}
            </AuthField>
            <AuthField label={t('ইমেইল', 'Email')} error={errors.email}>
              {(id, d) => (
                <input
                  id={id}
                  aria-describedby={d}
                  aria-invalid={!!errors.email || undefined}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  placeholder="name@example.com"
                  autoComplete="email"
                  maxLength={120}
                  className={authInputCls}
                />
              )}
            </AuthField>
            <AuthField label={t('এলাকা', 'Area')} className="sm:col-span-2">
              {(id) => (
                <input
                  id={id}
                  value={office}
                  onChange={(e) => setOffice(e.target.value)}
                  autoComplete="address-level2"
                  maxLength={120}
                  className={authInputCls}
                />
              )}
            </AuthField>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button
        type="submit"
        disabled={busy}
        className="h-11 w-full rounded-xl bg-[#006A4E] text-sm font-semibold text-white hover:bg-[#00553e]"
      >
        <UserPlus className="size-4" />
        {busy ? t('পাঠানো হচ্ছে…', 'Submitting…') : t('অ্যাকাউন্ট খুলুন', 'Create account')}
      </Button>
    </form>
  );
};
