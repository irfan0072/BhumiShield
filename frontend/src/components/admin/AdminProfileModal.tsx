import React, { useEffect, useState } from 'react';
import { KeyRound, Loader2, Save, User } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { maskNid, toBanglaDigits } from '@/theme/tokens';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Field, inputCls, notify } from '@/components/admin/kit';

interface AdminProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MIN_PASSWORD = 8;

export const AdminProfileModal: React.FC<AdminProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, setUser, setToken, lang, t } = useAppUI();
  const [tab, setTab] = useState<'profile' | 'password'>('profile');

  const [fullNameBn, setFullNameBn] = useState('');
  const [fullNameEn, setFullNameEn] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [officeBn, setOfficeBn] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Fill the form from the signed-in user each time the dialog opens. No made-up defaults.
  useEffect(() => {
    if (!isOpen) return;
    setFullNameBn(user?.full_name_bn || '');
    setFullNameEn(user?.full_name_en || '');
    setEmail(user?.email || '');
    setPhone(user?.phone_dummy || user?.phone || user?.phone_mock || '');
    setOfficeBn(user?.office_bn || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }, [isOpen, user]);

  /** Applies a server response: new user data and, after a password change, the new token. */
  const applyResponse = (res: any) => {
    if (res?.access_token) {
      localStorage.setItem('bs_token', res.access_token);
      setToken?.(res.access_token);
    }
    if (res?.user && user) setUser({ ...user, ...res.user });
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      const res = await BhumiApi.updateProfile({
        full_name_bn: fullNameBn.trim(),
        full_name_en: fullNameEn.trim(),
        email: email.trim(),
        phone_dummy: phone.trim(),
        office_bn: officeBn.trim(),
      });
      applyResponse(res);
      if (!res?.user) {
        setUser({
          ...user,
          full_name_bn: fullNameBn.trim(),
          full_name_en: fullNameEn.trim(),
          email: email.trim(),
          phone_dummy: phone.trim(),
          office_bn: officeBn.trim(),
        });
      }
      notify.ok(t('সংরক্ষণ হয়েছে', 'Saved'));
    } catch (err) {
      notify.err(err, lang);
    } finally {
      setSavingProfile(false);
    }
  };

  const passwordTooShort = newPassword.length > 0 && newPassword.length < MIN_PASSWORD;
  const passwordMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const passwordValid =
    currentPassword.length > 0 && newPassword.length >= MIN_PASSWORD && newPassword === confirmPassword;

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValid) return;
    setSavingPassword(true);
    try {
      const res = await BhumiApi.updateProfile({ current_password: currentPassword, new_password: newPassword });
      applyResponse(res);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notify.ok(t('পাসওয়ার্ড বদলানো হয়েছে', 'Password changed'));
    } catch (err) {
      notify.err(err, lang);
    } finally {
      setSavingPassword(false);
    }
  };

  const displayName = (lang === 'bn' ? user?.full_name_bn : user?.full_name_en) || user?.full_name_bn || user?.username || '—';
  const rawNid = user?.nid || '';

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg gap-0 overflow-y-auto p-0">
        <DialogHeader className="flex-row items-center gap-3 space-y-0 border-b border-slate-100 px-5 py-4 pr-14 text-left">
          <Avatar className="size-10 rounded-lg">
            <AvatarFallback className="rounded-lg bg-emerald-50 text-sm font-semibold text-[#006A4E]">
              {(user?.username || '?').substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <DialogTitle className="truncate text-base font-semibold text-slate-900">{displayName}</DialogTitle>
            <DialogDescription className="truncate text-xs text-slate-500">
              @{user?.username || '—'}
              {user?.office_bn ? ` · ${user.office_bn}` : ''}
            </DialogDescription>
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'profile' | 'password')} className="px-5 py-4">
          <TabsList className="h-9">
            <TabsTrigger value="profile" className="gap-1.5 text-sm">
              <User className="size-3.5" />
              {t('প্রোফাইল', 'Profile')}
            </TabsTrigger>
            <TabsTrigger value="password" className="gap-1.5 text-sm">
              <KeyRound className="size-3.5" />
              {t('পাসওয়ার্ড', 'Password')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-3">
            <form onSubmit={saveProfile} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t('নাম (বাংলা)', 'Name (Bangla)')}>
                  <input className={inputCls} value={fullNameBn} onChange={(e) => setFullNameBn(e.target.value)} />
                </Field>
                <Field label={t('নাম (ইংরেজি)', 'Name (English)')}>
                  <input className={inputCls} value={fullNameEn} onChange={(e) => setFullNameEn(e.target.value)} />
                </Field>
                <Field label={t('ইমেইল', 'Email')}>
                  <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
                <Field label={t('মোবাইল', 'Mobile')}>
                  <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Field>
                <Field label={t('কার্যালয়', 'Office')} className="sm:col-span-2">
                  <input className={inputCls} value={officeBn} onChange={(e) => setOfficeBn(e.target.value)} />
                </Field>
                <Field label={t('জাতীয় পরিচয়পত্র', 'National ID')}>
                  <input className={inputCls} value={rawNid ? toBanglaDigits(maskNid(rawNid), lang) : '—'} disabled readOnly />
                </Field>
                <Field label={t('ইউজারনেম', 'Username')}>
                  <input className={inputCls} value={user?.username || '—'} disabled readOnly />
                </Field>
              </div>
              <div className="flex justify-end pt-1">
                <Button type="submit" size="sm" className="h-9 gap-1.5" disabled={savingProfile || !user}>
                  {savingProfile ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  {t('সংরক্ষণ', 'Save')}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="password" className="mt-3">
            <form onSubmit={changePassword} className="space-y-3">
              <Field label={t('বর্তমান পাসওয়ার্ড', 'Current password')}>
                <input
                  type="password"
                  autoComplete="current-password"
                  className={inputCls}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label={t('নতুন পাসওয়ার্ড', 'New password')}
                  hint={passwordTooShort ? t('কমপক্ষে ৮ অক্ষর', 'At least 8 characters') : undefined}
                >
                  <input
                    type="password"
                    autoComplete="new-password"
                    className={inputCls}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </Field>
                <Field
                  label={t('আবার লিখুন', 'Repeat')}
                  hint={passwordMismatch ? t('মিলছে না', 'Does not match') : undefined}
                >
                  <input
                    type="password"
                    autoComplete="new-password"
                    className={inputCls}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </Field>
              </div>
              <div className="flex justify-end pt-1">
                <Button type="submit" size="sm" className="h-9 gap-1.5" disabled={!passwordValid || savingPassword}>
                  {savingPassword ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                  {t('বদলান', 'Change')}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
