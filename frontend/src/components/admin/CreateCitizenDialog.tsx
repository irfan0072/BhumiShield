import React, { useState } from 'react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Phone,
  Mail,
  Lock,
  User,
  MapPin,
  Sparkles,
} from 'lucide-react';

interface CreateCitizenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateCitizenDialog: React.FC<CreateCitizenDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
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
  const [successMsg, setSuccessMsg] = useState('');

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
    setSuccessMsg('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Client-side validations
    if (!fullNameBn.trim() && !fullNameEn.trim()) {
      setErrorMsg(t('নাগরিকের পূর্ণ নাম লিখুন।', 'Please provide the citizen’s full name.'));
      return;
    }

    if (!nid.trim() && !phone.trim() && !email.trim()) {
      setErrorMsg(t('এনআইডি অথবা মোবাইল নম্বর প্রদান করা আবশ্যক।', 'NID or phone number is required.'));
      return;
    }

    if (nid.trim() && !/^(?:\d{10}|\d{13}|\d{17})$/.test(nid.trim())) {
      setErrorMsg(t('সঠিক ১০, ১৩ বা ১৭ ডিজিট এনআইডি নম্বর দিন।', 'Enter a valid 10, 13, or 17 digit NID.'));
      return;
    }

    if (phone.trim() && !/^(?:\+?8801|01)[3-9]\d{8}$/.test(phone.trim())) {
      setErrorMsg(t('সঠিক ১১ ডিজিট বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 017xxxxxxxx)।', 'Enter a valid 11-digit mobile number (e.g. 017xxxxxxxx).'));
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

      const res = await BhumiApi.createUser(payload);

      setSuccessMsg(
        lang === 'bn'
          ? `নাগরিক অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! ইউজারনেম: ${uname}`
          : `Citizen account created successfully! Username: ${uname}`
      );

      setTimeout(() => {
        resetForm();
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Create citizen failed:', err);
      let msg = err.response?.data?.message_bn || err.response?.data?.message_en || err.message || 'Error creating account';
      if (err.response?.data?.code === 'USERNAME_EXISTS') {
        msg = t('এই ইউজারনেম ইতিমধ্যে ব্যবহৃত হয়েছে। ভিন্ন ইউজারনেম দিন।', 'This username is already taken. Please choose another.');
      } else if (err.response?.data?.code === 'NID_ALREADY_REGISTERED') {
        msg = t('এই এনআইডি ইতিমধ্যে নিবন্ধিত আছে।', 'This NID is already registered to another account.');
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <UserPlus className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-slate-900">
                {t('সুপার অ্যাডমিন • নতুন নাগরিক অ্যাকাউন্ট তৈরি', 'Super Admin • Provision Citizen Account')}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                {t(
                  'জমির মালিক, উত্তরাধিকারী ক্রেতা বা ইউডিসি অপারেটরের জন্য ভেরিফাইড নাগরিক অ্যাকাউন্ট যোগ করুন।',
                  'Provision verified citizen, land buyer, or digital center operator accounts directly.'
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-start gap-2">
            <AlertCircle className="size-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          {/* Account Role & NID Verification Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">
                {t('অ্যাকাউন্টের ভূমিকা (Role):', 'Account Role:')}
              </label>
              <Select value={role} onValueChange={(val: any) => setRole(val)}>
                <SelectTrigger className="h-9 text-xs bg-white font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="citizen">
                    {t('সাধারণ নাগরিক / জমির মালিক (Citizen)', 'Citizen / Landowner')}
                  </SelectItem>
                  <SelectItem value="service_point_operator">
                    {t('ইউডিসি উদ্যোক্তা / সেবা পয়েন্ট (SPO / UDC)', 'Service Point Operator (UDC)')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-emerald-500 transition-all">
                <input
                  type="checkbox"
                  checked={isVerified}
                  onChange={(e) => setIsVerified(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 size-4"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    <ShieldCheck className="size-3.5 text-emerald-600" />
                    {t('এনআইডি বায়োমেট্রিক ভেরিফাইড', 'NID KYC Verified')}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {t('সরাসরি জাতীয় পরিচয়পত্র ডাটাবেজে সক্রিয় থাকবে', 'Instantly activate authenticated portfolio')}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <User className="size-3 text-slate-500" />
                <span>{t('পূর্ণ নাম (বাংলা):', 'Full Name (Bangla):')} *</span>
              </label>
              <Input
                value={fullNameBn}
                onChange={(e) => setFullNameBn(e.target.value)}
                placeholder="যেমন: মোহাম্মদ রফিকুল ইসলাম"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <User className="size-3 text-slate-500" />
                <span>{t('পূর্ণ নাম (ইংরেজি):', 'Full Name (English):')}</span>
              </label>
              <Input
                value={fullNameEn}
                onChange={(e) => setFullNameEn(e.target.value)}
                placeholder="e.g. Md. Rafiqul Islam"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* NID & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <CreditCard className="size-3 text-slate-500" />
                <span>{t('জাতীয় পরিচয়পত্র (NID):', 'National ID (NID):')} *</span>
              </label>
              <Input
                value={nid}
                onChange={(e) => setNid(e.target.value.replace(/\D/g, ''))}
                onBlur={handleGenerateUsername}
                placeholder="১০, ১৩ বা ১৭ সংখ্যার এনআইডি"
                maxLength={17}
                className="h-9 text-xs font-mono"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Phone className="size-3 text-slate-500" />
                <span>{t('মোবাইল নম্বর:', 'Mobile Phone Number:')} *</span>
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={handleGenerateUsername}
                placeholder="017xxxxxxxx"
                maxLength={14}
                className="h-9 text-xs font-mono"
                required
              />
            </div>
          </div>

          {/* Username & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  {t('ইউজারনেম (লগইন আইডি):', 'Username (Login ID):')}
                </label>
                <button
                  type="button"
                  onClick={handleGenerateUsername}
                  className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
                >
                  <Sparkles className="size-2.5" />
                  {t('স্বয়ংক্রিয় তৈরি', 'Auto-Generate')}
                </button>
              </div>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="e.g. rafiq_citizen"
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Mail className="size-3 text-slate-500" />
                <span>{t('ইমেইল ঠিকানা (ঐচ্ছিক):', 'Email Address (Optional):')}</span>
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="citizen@gmail.com"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Password & Present Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Lock className="size-3 text-slate-500" />
                <span>{t('ডিফল্ট পাসওয়ার্ড:', 'Initial Password:')} *</span>
              </label>
              <Input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ন্যূনতম ৮ অক্ষর"
                className="h-9 text-xs font-mono"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <MapPin className="size-3 text-slate-500" />
                <span>{t('স্থায়ী / বর্তমান ঠিকানা:', 'Address (Optional):')}</span>
              </label>
              <Input
                value={addressBn}
                onChange={(e) => setAddressBn(e.target.value)}
                placeholder="যেমন: গ্রাম: বিরুলিয়া, সাভার, ঢাকা"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="text-xs"
            >
              {t('বাতিল', 'Cancel')}
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs gap-1.5 cursor-pointer shadow-sm"
            >
              {loading ? (
                <span>{t('তৈরি হচ্ছে...', 'Creating...')}</span>
              ) : (
                <>
                  <UserPlus className="size-3.5" />
                  <span>{t('অ্যাকাউন্ট তৈরি নিশ্চিত করুন', 'Confirm Create Citizen')}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
