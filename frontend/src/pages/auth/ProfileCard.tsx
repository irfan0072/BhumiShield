import React, { useRef, useState } from 'react';
import { Save, UserCheck } from 'lucide-react';
import { useAppUI, type AuthUser } from '../../i18n';
import { BhumiApi } from '../../api/client';
import { maskNid } from '../../theme/tokens';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { notify } from '@/components/admin/kit';
import { AuthField, PasswordInput, StrengthHint, authInputCls, digitsOnly, isNid, isPhone } from './fields';

/** Same normalisation the API client applies to login/register responses. */
const normalizeUser = (u: any): AuthUser => ({
  ...u,
  nid_mock: u.nid || u.nid_mock || '',
  phone_mock: u.phone_dummy || u.phone_mock || '',
  office_name: u.office_bn || u.office_name || '',
});

type Errors = Partial<Record<'phone' | 'nid' | 'current' | 'next', string>>;

/** Compact profile editor for signed-in users (used by mode="profile"). */
export const ProfileCard: React.FC<{ user: AuthUser }> = ({ user }) => {
  const { t, lang, setUser, setToken } = useAppUI();
  const [nameBn, setNameBn] = useState(user.full_name_bn || '');
  const [nameEn, setNameEn] = useState(user.full_name_en || '');
  const [phone, setPhone] = useState(digitsOnly(user.phone_mock || user.phone_dummy || '', 14));
  const [nid, setNid] = useState(user.nid || '');
  const [office, setOffice] = useState(user.office_name || '');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  // The backend only lets an unverified citizen change their own NID, and only admins change the office.
  const nidEditable = user.role === 'citizen' && Number(user.is_identity_verified ?? 0) === 0;
  const isAdmin = user.role === 'admin';

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (busyRef.current) return;
    const e: Errors = {};
    if (phone && !isPhone(phone.replace(/^88/, ''))) e.phone = t('সঠিক নম্বর দিন: 01XXXXXXXXX', 'Use format 01XXXXXXXXX');
    if (nidEditable && nid && !isNid(nid)) e.nid = t('১০, ১৩ বা ১৭ সংখ্যা', '10, 13 or 17 digits');
    if (newPass && newPass.length < 8) e.next = t('কমপক্ষে ৮ অক্ষর', 'At least 8 characters');
    if (newPass && !currentPass) e.current = t('বর্তমান পাসওয়ার্ড দিন', 'Enter current password');
    setErrors(e);
    if (Object.keys(e).length) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const res = await BhumiApi.updateProfile({
        full_name_bn: nameBn.trim(),
        full_name_en: nameEn.trim(),
        phone_mock: phone,
        nid: nidEditable ? nid.trim() || undefined : undefined,
        ...(isAdmin ? { office_name: office.trim() } : {}),
        current_password: newPass ? currentPass : undefined,
        new_password: newPass || undefined,
      });
      // A password change bumps the token version on the server, so the old token stops working.
      if (res?.access_token) setToken(res.access_token);
      if (res?.user) setUser(normalizeUser(res.user));
      setCurrentPass('');
      setNewPass('');
      notify.ok(t('প্রোফাইল সংরক্ষণ হয়েছে', 'Profile saved'));
    } catch (err: any) {
      notify.err(err?.response?.data?.detail ?? err, lang, t('প্রোফাইল সংরক্ষণ হয়নি', 'Could not save profile'));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6 sm:py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-6">
        <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#006A4E]">
            <UserCheck className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-slate-900">{t('আমার প্রোফাইল', 'My profile')}</h1>
            <p className="truncate text-xs text-slate-500">
              @{user.username}
              {user.office_name ? ` · ${user.office_name}` : ''}
            </p>
          </div>
        </div>

        <form onSubmit={submit} noValidate className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <AuthField label={t('নাম (বাংলা)', 'Name (Bangla)')}>
              {(id) => (
                <input id={id} value={nameBn} onChange={(e) => setNameBn(e.target.value)} autoComplete="name" maxLength={80} className={authInputCls} />
              )}
            </AuthField>
            <AuthField label={t('নাম (ইংরেজি)', 'Name (English)')}>
              {(id) => (
                <input id={id} value={nameEn} onChange={(e) => setNameEn(e.target.value)} autoComplete="name" maxLength={80} className={authInputCls} />
              )}
            </AuthField>
            <AuthField label={t('মোবাইল নম্বর', 'Mobile number')} error={errors.phone}>
              {(id, d) => (
                <input
                  id={id}
                  aria-describedby={d}
                  aria-invalid={!!errors.phone || undefined}
                  value={phone}
                  onChange={(e) => setPhone(digitsOnly(e.target.value, 13))}
                  placeholder="01XXXXXXXXX"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={13}
                  className={authInputCls}
                />
              )}
            </AuthField>
            <AuthField label={t('এনআইডি', 'NID')} error={errors.nid}>
              {(id, d) =>
                nidEditable ? (
                  <input
                    id={id}
                    aria-describedby={d}
                    aria-invalid={!!errors.nid || undefined}
                    value={nid}
                    onChange={(e) => setNid(digitsOnly(e.target.value, 17))}
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={17}
                    className={authInputCls}
                  />
                ) : (
                  <input id={id} value={user.nid ? maskNid(user.nid, lang) : '—'} disabled className={authInputCls} />
                )
              }
            </AuthField>
            {isAdmin && (
              <AuthField label={t('অফিস', 'Office')} className="sm:col-span-2">
                {(id) => (
                  <input id={id} value={office} onChange={(e) => setOffice(e.target.value)} maxLength={120} className={authInputCls} />
                )}
              </AuthField>
            )}
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="pass" className="border-none">
              <AccordionTrigger className="py-1.5 text-sm text-slate-600 hover:no-underline">
                {t('পাসওয়ার্ড বদলান', 'Change password')}
              </AccordionTrigger>
              <AccordionContent className="grid gap-3 pb-1 pt-1 sm:grid-cols-2">
                <AuthField label={t('বর্তমান পাসওয়ার্ড', 'Current password')} error={errors.current}>
                  {(id, d) => (
                    <PasswordInput
                      id={id}
                      aria-describedby={d}
                      invalid={!!errors.current}
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      autoComplete="current-password"
                    />
                  )}
                </AuthField>
                <AuthField label={t('নতুন পাসওয়ার্ড', 'New password')} error={errors.next} hint={newPass ? <StrengthHint password={newPass} /> : undefined}>
                  {(id, d) => (
                    <PasswordInput
                      id={id}
                      aria-describedby={d}
                      invalid={!!errors.next}
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      autoComplete="new-password"
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
            <Save className="size-4" />
            {busy ? t('সংরক্ষণ হচ্ছে…', 'Saving…') : t('সংরক্ষণ করুন', 'Save')}
          </Button>
        </form>
      </div>
    </div>
  );
};
