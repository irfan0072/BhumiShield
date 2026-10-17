import React, { useState } from 'react';
import { useAppUI, AuthUser } from '../i18n';
import { BhumiApi } from '../api/client';
import {
  UserCheck,
  ShieldCheck,
  Sparkles,
  Phone,
  Mail,
  User,
  Home,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Check
} from 'lucide-react';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  user: AuthUser;
  onComplete: (updatedUser: AuthUser) => void;
}

const PRESET_AVATARS = [
  { id: 'avatar_m1', labelBn: 'পুরুষ নাগরিক ১', labelEn: 'Male Citizen 1', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80' },
  { id: 'avatar_f1', labelBn: 'নারী নাগরিক ১', labelEn: 'Female Citizen 1', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80' },
  { id: 'avatar_m2', labelBn: 'সিনিয়র নাগরিক', labelEn: 'Senior Citizen', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80' },
  { id: 'avatar_f2', labelBn: 'উদ্যোক্তা নাগরিক', labelEn: 'Professional Citizen', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80' },
];

export const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({
  isOpen,
  user,
  onComplete,
}) => {
  const { lang, t } = useAppUI();

  const registeredByEmail = user.registration_channel === 'email' || (!user.phone_dummy && !!user.email);
  const registeredByPhone = user.registration_channel === 'phone' || (!user.email && !!user.phone_dummy);

  const [selectedAvatar, setSelectedAvatar] = useState<string>(
    user.avatar_url || PRESET_AVATARS[0].url
  );
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string>('');

  const [fullNameBn, setFullNameBn] = useState<string>(user.full_name_bn || '');
  const [fullNameEn, setFullNameEn] = useState<string>(user.full_name_en || '');
  const [phone, setPhone] = useState<string>(
    user.phone_dummy && user.phone_dummy !== '01700-000000' && user.phone_dummy !== '01700-009999'
      ? user.phone_dummy
      : ''
  );
  const [email, setEmail] = useState<string>(
    user.email && !user.email.includes('@citizen.bhumishield.gov.bd') ? user.email : ''
  );
  const [nid, setNid] = useState<string>(
    user.nid && !user.nid.startsWith('99') ? user.nid : (user.nid_mock || '9900001099')
  );
  const [fatherNameBn, setFatherNameBn] = useState<string>(user.father_name_bn || 'মোঃ আবদুল করিম');
  const [fatherNameEn, setFatherNameEn] = useState<string>('Md. Abdul Karim');
  const [motherNameBn, setMotherNameBn] = useState<string>(user.mother_name_bn || 'রোকেয়া বেগম');
  const [dob, setDob] = useState<string>(user.date_of_birth || '1990-05-15');
  const [gender, setGender] = useState<string>(user.gender || 'male');
  const [presentAddressBn, setPresentAddressBn] = useState<string>(
    user.present_address_bn || 'বাড়ি নং ১২, রোড নং ৫, ধানমন্ডি, ঢাকা'
  );
  const [permanentAddressBn, setPermanentAddressBn] = useState<string>(
    user.present_address_bn || 'গ্রাম: কৃষ্ণপুর, ডাকঘর: ধামরাই, ঢাকা'
  );

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullNameBn.trim()) {
      setErrorMsg(t('বাংলায় পূর্ণ নাম প্রদান করা আবশ্যক।', 'Full name in Bangla is required.'));
      return;
    }
    if (!phone.trim()) {
      setErrorMsg(t('বৈধ মোবাইল নম্বর প্রদান করা আবশ্যক।', 'Valid phone number is required.'));
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg(t('সঠিক ইমেইল ঠিকানা প্রদান করা আবশ্যক।', 'Valid email address is required.'));
      return;
    }
    if (!nid.trim()) {
      setErrorMsg(t('জাতীয় পরিচয়পত্র (NID) নম্বর প্রদান করা আবশ্যক।', 'National ID number is required.'));
      return;
    }
    if (!fatherNameBn.trim() || !motherNameBn.trim()) {
      setErrorMsg(t('পিতা ও মাতার নাম প্রদান করা আবশ্যক।', 'Father and Mother names are required.'));
      return;
    }
    if (!presentAddressBn.trim()) {
      setErrorMsg(t('বর্তমান ঠিকানা প্রদান করা আবশ্যক।', 'Present address is required.'));
      return;
    }

    setSubmitting(true);
    try {
      const avatarToUse = customAvatarUrl.trim() || selectedAvatar;
      const res = await BhumiApi.completeProfile({
        full_name_bn: fullNameBn.trim(),
        full_name_en: fullNameEn.trim() || fullNameBn.trim(),
        phone_dummy: phone.trim(),
        email: email.trim(),
        nid: nid.trim(),
        father_name_bn: fatherNameBn.trim(),
        father_name_en: fatherNameEn.trim(),
        mother_name_bn: motherNameBn.trim(),
        present_address_bn: presentAddressBn.trim(),
        date_of_birth: dob,
        gender,
        avatar_url: avatarToUse,
      });

      if (res?.user) {
        onComplete(res.user);
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.response?.data;
      setErrorMsg(
        detail?.message_bn ||
          detail?.message_en ||
          t('প্রোফাইল সংরক্ষণ করতে সমস্যা হয়েছে। অনুগ্রহ করে সকল তথ্য সঠিকভাবে পূরণ করুন।', 'Failed to complete profile. Please verify all inputs.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-completion-title"
      className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#006A4E] to-[#074f38] text-white p-5 sm:p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
            <Sparkles className="w-6 h-6 text-amber-300" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-slate-900 uppercase tracking-wide">
                {t('অ্যাকাউন্ট অনুমোদিত', 'Account Approved')}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-800 text-emerald-100">
                {t('প্রোফাইল সম্পূর্ণকরণ আবশ্যক', 'Profile Completion Required')}
              </span>
            </div>
            <h2 id="profile-completion-title" className="text-xl sm:text-2xl font-black tracking-tight">
              {t('নাগরিক প্রোফাইল সম্পূর্ণকরণ ফরম', 'Citizen Profile Completion Form')}
            </h2>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              {t(
                'অভিনন্দন! আপনার অ্যাকাউন্টটি সুপার অ্যাডমিন কর্তৃক অনুমোদিত হয়েছে। জমি, খতিয়ান, নামজারি ও দলিল হস্তান্তর সেবাগুলো সম্পূর্ণ সক্রিয় করতে অনুগ্রহ করে নিম্নোক্ত প্রয়োজনীয় তথ্যগুলো প্রদান করুন।',
                'Congratulations! Your account has been approved by the Super Admin. Please provide the required information below to activate all land ownership and transaction services.'
              )}
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SECTION 1: Profile Photo / Avatar */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
              <ImageIcon className="w-4 h-4 text-[#006A4E]" />
              <span>{t('১. প্রোফাইল ছবি / অবতার নির্বাচন করুন', '1. Select Profile Picture / Avatar')}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {PRESET_AVATARS.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => {
                    setSelectedAvatar(av.url);
                    setCustomAvatarUrl('');
                  }}
                  className={`relative p-1 rounded-full cursor-pointer transition-all ${
                    selectedAvatar === av.url && !customAvatarUrl
                      ? 'ring-3 ring-[#006A4E] scale-105 shadow-md'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  title={lang === 'bn' ? av.labelBn : av.labelEn}
                >
                  <img
                    src={av.url}
                    alt={av.labelEn}
                    className="w-14 h-14 rounded-full object-cover border border-slate-200"
                  />
                  {selectedAvatar === av.url && !customAvatarUrl && (
                    <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#006A4E] text-white flex items-center justify-center text-[10px] shadow-sm">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </button>
              ))}

              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  {t('অথবা নিজস্ব ছবির লিংক দিন:', 'Or enter custom image URL:')}
                </label>
                <input
                  type="url"
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  placeholder="https://example.com/my-photo.jpg"
                  className="w-full p-2 text-xs rounded-lg border border-slate-300 font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Dual Contact Identifier (Phone & Email) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
              <Phone className="w-4 h-4 text-[#006A4E]" />
              <span>{t('২. দ্বৈত-যোগাযোগ তথ্য নিশ্চিতকরণ (মোবাইল ও ইমেইল)', '2. Dual-Contact Verification (Phone & Email)')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>{t('মোবাইল নম্বর:', 'Mobile Phone Number:')} <span className="text-red-600">*</span></span>
                  {registeredByEmail && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                      {t('ইমেইল নিবন্ধনের কারণে বাধ্যতামূলক', 'Mandatory for email-registered users')}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01700-000999"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:border-[#006A4E] focus:ring-1 focus:ring-[#006A4E]"
                    required
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>{t('ইমেইল ঠিকানা:', 'Email Address:')} <span className="text-red-600">*</span></span>
                  {registeredByPhone && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                      {t('মোবাইল নিবন্ধনের কারণে বাধ্যতামূলক', 'Mandatory for phone-registered users')}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="citizen@domain.com"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:border-[#006A4E] focus:ring-1 focus:ring-[#006A4E]"
                    required
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Legal Identification & Personal Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-[#006A4E]" />
              <span>{t('৩. জাতীয় পরিচয়পত্র ও ব্যক্তিগত তথ্যাবলী', '3. National Identity & Legal Particulars')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('পূর্ণ নাম (বাংলায়):', 'Full Name (Bangla):')} <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={fullNameBn}
                  onChange={(e) => setFullNameBn(e.target.value)}
                  placeholder="মোঃ সাইফুল ইসলাম"
                  className="w-full p-2 text-xs rounded-lg border border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('পূর্ণ নাম (ইংরেজিতে):', 'Full Name (English):')}
                </label>
                <input
                  type="text"
                  value={fullNameEn}
                  onChange={(e) => setFullNameEn(e.target.value)}
                  placeholder="Md. Saiful Islam"
                  className="w-full p-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('জাতীয় পরিচয়পত্র (NID):', 'National ID (NID):')} <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={nid}
                  onChange={(e) => setNid(e.target.value)}
                  placeholder="9900001099"
                  className="w-full p-2 text-xs rounded-lg border border-slate-300 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('পিতার নাম (বাংলায়):', "Father's Name (Bangla):")} <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={fatherNameBn}
                  onChange={(e) => setFatherNameBn(e.target.value)}
                  placeholder="মোঃ আবদুল করিম"
                  className="w-full p-2 text-xs rounded-lg border border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('মাতার নাম (বাংলায়):', "Mother's Name (Bangla):")} <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={motherNameBn}
                  onChange={(e) => setMotherNameBn(e.target.value)}
                  placeholder="রোকেয়া বেগম"
                  className="w-full p-2 text-xs rounded-lg border border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('জন্ম তারিখ:', 'Date of Birth:')} <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-slate-300 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('লিঙ্গ:', 'Gender:')}
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-slate-300 font-bold"
                >
                  <option value="male">{t('পুরুষ (Male)', 'Male')}</option>
                  <option value="female">{t('মহিলা (Female)', 'Female')}</option>
                  <option value="other">{t('অন্যান্য (Other)', 'Other')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 4: Address Particulars */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
              <Home className="w-4 h-4 text-[#006A4E]" />
              <span>{t('৪. ঠিকানার তথ্য (Address Information)', '4. Address Particulars')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('বর্তমান ঠিকানা (গ্রাম/মহল্লা, ডাকঘর, উপজেলা, জেলা):', 'Present Address:')} <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={2}
                  value={presentAddressBn}
                  onChange={(e) => setPresentAddressBn(e.target.value)}
                  placeholder="বাড়ি নং ১২, রোড নং ৫, ধানমন্ডি, ঢাকা"
                  className="w-full p-2 text-xs rounded-lg border border-slate-300 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('স্থায়ী ঠিকানা:', 'Permanent Address:')}
                </label>
                <textarea
                  rows={2}
                  value={permanentAddressBn}
                  onChange={(e) => setPermanentAddressBn(e.target.value)}
                  placeholder="গ্রাম: কৃষ্ণপুর, ডাকঘর: ধামরাই, ঢাকা"
                  className="w-full p-2 text-xs rounded-lg border border-slate-300 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t('সকল তথ্য সুরক্ষিত এনক্রিপশনে ভূমি সুরক্ষা ডেটাবেসে সংরক্ষিত হবে।', 'All information is encrypted and secured in the BhumiShield registry.')}</span>
            </span>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs cursor-pointer shadow-md transition flex items-center justify-center gap-2 min-h-[42px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {submitting
                  ? t('সংরক্ষণ হচ্ছে...', 'Saving Profile...')
                  : t('✓ প্রোফাইল সম্পন্ন করুন ও সকল সেবা চালু করুন', 'Complete Profile & Unlock Services')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
