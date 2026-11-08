import React, { useState, useEffect } from 'react';
import { useAppUI } from '@/i18n';
import { api, BhumiApi } from '@/api/client';
import {
  AdminPage,
  Section,
  DetailList,
  Field,
  StatusBadge,
  notify,
  inputCls,
} from '@/components/admin/kit';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Save, KeyRound } from 'lucide-react';

export const CitizenProfilePage: React.FC<{ onNavigate?: (target: string) => void }> = () => {
  const { user, setUser, t, lang } = useAppUI();

  const [fullNameBn, setFullNameBn] = useState(user?.full_name_bn || '');
  const [fullNameEn, setFullNameEn] = useState(user?.full_name_en || '');
  const [email, setEmail] = useState((user as any)?.email || '');
  const [phone, setPhone] = useState(user?.phone_dummy || '');
  const [fatherNameBn, setFatherNameBn] = useState(user?.father_name_bn || '');
  const [motherNameBn, setMotherNameBn] = useState(user?.mother_name_bn || '');
  const [addressBn, setAddressBn] = useState(user?.present_address_bn || '');
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFullNameBn(user.full_name_bn || '');
      setFullNameEn(user.full_name_en || '');
      setEmail((user as any).email || '');
      setPhone(user.phone_dummy || '');
      setFatherNameBn(user.father_name_bn || '');
      setMotherNameBn(user.mother_name_bn || '');
      setAddressBn(user.present_address_bn || '');
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullNameBn.trim()) {
      notify.err(null, lang, t('নাম (বাংলা) লিখুন।', 'Enter Bangla full name.'));
      return;
    }
    setSaving(true);
    try {
      const res = await BhumiApi.updateProfile({
        full_name_bn: fullNameBn.trim(),
        full_name_en: fullNameEn.trim() || fullNameBn.trim(),
        email: email.trim(),
        phone_dummy: phone.trim(),
        father_name_bn: fatherNameBn.trim(),
        mother_name_bn: motherNameBn.trim(),
        present_address_bn: addressBn.trim(),
      });
      if (res?.user && setUser) {
        setUser({ ...user, ...res.user });
      }
      notify.ok(
        lang === 'bn'
          ? res?.message_bn || t('প্রোফাইল সংরক্ষিত হয়েছে।', 'Profile saved.')
          : res?.message_en || t('প্রোফাইল সংরক্ষিত হয়েছে।', 'Profile saved.')
      );
    } catch (err: any) {
      notify.err(err, lang, t('প্রোফাইল সংরক্ষণ করা যায়নি।', 'Failed to save profile.'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      notify.err(null, lang, t('নতুন পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।', 'Minimum 6 characters required.'));
      return;
    }
    if (newPassword !== confirmPassword) {
      notify.err(null, lang, t('নতুন পাসওয়ার্ড ও নিশ্চিত পাসওয়ার্ড মেলেনি।', 'Passwords do not match.'));
      return;
    }
    setPwSaving(true);
    try {
      const res = await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      const payload = res.data?.data ?? res.data;
      notify.ok(
        lang === 'bn'
          ? payload?.message_bn || t('পাসওয়ার্ড পরিবর্তন হয়েছে।', 'Password updated.')
          : payload?.message_en || t('পাসওয়ার্ড পরিবর্তন হয়েছে।', 'Password updated.')
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      notify.err(err, lang, t('পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।', 'Password change failed.'));
    } finally {
      setPwSaving(false);
    }
  };

  const isVerified = Number(user?.is_identity_verified ?? 1) === 1;

  return (
    <AdminPage fill>
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left: Account Summary */}
        <div className="lg:col-span-4 flex flex-col min-h-0">
          <Section title={t('অ্যাকাউন্টের তথ্য', 'Account Summary')} fill bodyClassName="p-3">
            <DetailList
              items={[
                [
                  t('নাম', 'Full Name'),
                  (lang === 'bn' ? user?.full_name_bn : user?.full_name_en) ||
                    user?.full_name_bn ||
                    '—',
                ],
                [
                  t('ইউজারনেম', 'Username'),
                  <span className="font-mono text-xs">@{user?.username || 'citizen'}</span>,
                ],
                [
                  t('এনআইডি নম্বর', 'NID Number'),
                  <span className="font-mono text-xs">{user?.nid || '—'}</span>,
                ],
                [t('মোবাইল', 'Mobile'), user?.phone_dummy || '—'],
                [
                  t('যাচাই অবস্থা', 'Verification'),
                  isVerified ? (
                    <StatusBadge tone="green">{t('যাচাইকৃত', 'Verified')}</StatusBadge>
                  ) : (
                    <StatusBadge tone="amber">{t('অপেক্ষমাণ', 'Pending')}</StatusBadge>
                  ),
                ],
              ]}
            />
          </Section>
        </div>

        {/* Right: Tabs (প্রোফাইল / পাসওয়ার্ড) */}
        <div className="lg:col-span-8 flex flex-col min-h-0">
          <Section
            title={t('প্রোফাইল ও পাসওয়ার্ড', 'Profile & Password')}
            fill
            bodyClassName="p-4 overflow-y-auto"
          >
            <Tabs defaultValue="profile" className="w-full max-w-xl">
              <TabsList className="h-8 mb-4">
                <TabsTrigger value="profile" className="text-xs px-3 py-1">
                  {t('প্রোফাইল', 'Profile')}
                </TabsTrigger>
                <TabsTrigger value="password" className="text-xs px-3 py-1">
                  {t('পাসওয়ার্ড', 'Password')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <form onSubmit={handleSaveProfile} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label={t('পূর্ণ নাম (বাংলা)', 'Full Name (Bangla)')}>
                      <input
                        type="text"
                        value={fullNameBn}
                        onChange={(e) => setFullNameBn(e.target.value)}
                        className={inputCls}
                        required
                      />
                    </Field>
                    <Field label={t('পূর্ণ নাম (ইংরেজি)', 'Full Name (English)')}>
                      <input
                        type="text"
                        value={fullNameEn}
                        onChange={(e) => setFullNameEn(e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label={t('মোবাইল নম্বর', 'Mobile Number')}>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                    <Field label={t('ইমেইল', 'Email')}>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label={t('পিতার নাম', 'Father Name')}>
                      <input
                        type="text"
                        value={fatherNameBn}
                        onChange={(e) => setFatherNameBn(e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                    <Field label={t('মাতার নাম', 'Mother Name')}>
                      <input
                        type="text"
                        value={motherNameBn}
                        onChange={(e) => setMotherNameBn(e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  <Field label={t('বর্তমান ঠিকানা', 'Present Address')}>
                    <input
                      type="text"
                      value={addressBn}
                      onChange={(e) => setAddressBn(e.target.value)}
                      className={inputCls}
                    />
                  </Field>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={saving}
                      className="h-8 gap-1.5 text-xs"
                    >
                      <Save className="size-3.5" />
                      {saving
                        ? t('সংরক্ষণ হচ্ছে...', 'Saving...')
                        : t('প্রোফাইল সংরক্ষণ করুন', 'Save Profile')}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="password">
                <form onSubmit={handlePasswordChange} className="space-y-3 max-w-sm">
                  <Field label={t('বর্তমান পাসওয়ার্ড', 'Current Password')}>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={inputCls}
                      required
                    />
                  </Field>
                  <Field label={t('নতুন পাসওয়ার্ড', 'New Password')}>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={inputCls}
                      required
                    />
                  </Field>
                  <Field label={t('পাসওয়ার্ড নিশ্চিত করুন', 'Confirm Password')}>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={inputCls}
                      required
                    />
                  </Field>
                  <div className="pt-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={pwSaving}
                      className="h-8 gap-1.5 text-xs"
                    >
                      <KeyRound className="size-3.5" />
                      {pwSaving
                        ? t('পরিবর্তন হচ্ছে...', 'Updating...')
                        : t('পাসওয়ার্ড পরিবর্তন করুন', 'Update Password')}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </Section>
        </div>
      </div>
    </AdminPage>
  );
};

export default CitizenProfilePage;
