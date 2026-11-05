import React, { useState, useEffect } from 'react';
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
  Briefcase,
  Building2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Phone,
  Mail,
  Lock,
  User,
  ShieldCheck,
  UserPlus,
  Sparkles,
} from 'lucide-react';

interface CreateOfficialDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const OFFICIAL_ROLE_OPTIONS = [
  { value: 'sub_registrar', label_bn: 'সাব-রেজিস্ট্রার (Sub-Registrar)', label_en: 'Sub-Registrar' },
  { value: 'registry_data_officer', label_bn: 'রেজিস্ট্রি ডেটা অফিসার (RDO)', label_en: 'Registry Data Officer' },
  { value: 'ac_land', label_bn: 'সহকারী কমিশনার - ভূমি (AC Land)', label_en: 'AC Land (Magistrate)' },
  { value: 'land_office_assistant', label_bn: 'ভূমি উপ-সহকারী কর্মকর্তা (LOA)', label_en: 'Land Office Assistant' },
  { value: 'field_verification_officer', label_bn: 'মাঠ যাচাই কর্মকর্তা / সার্ভেয়ার (FVO)', label_en: 'Field Verification Officer' },
  { value: 'settlement_records_officer', label_bn: 'সেটেলমেন্ট রেকর্ডস অফিসার (SRO)', label_en: 'Settlement Records Officer' },
  { value: 'settlement_checker', label_bn: 'সহকারী সেটেলমেন্ট অফিসার (ASO)', label_en: 'Settlement Checker / ASO' },
  { value: 'kanungo', label_bn: 'কানুনগো (Kanungo)', label_en: 'Kanungo' },
  { value: 'uno', label_bn: 'উপজেলা নির্বাহী কর্মকর্তা (UNO)', label_en: 'Upazila Nirbahi Officer' },
  { value: 'adc_revenue', label_bn: 'অতিরিক্ত জেলা প্রশাসক - রাজস্ব (ADC Rev)', label_en: 'ADC (Revenue)' },
  { value: 'bank_officer', label_bn: 'ব্যাংক লিয়েন কর্মকর্তা (Bank Officer)', label_en: 'Bank Mortgage Officer' },
  { value: 'bank_manager', label_bn: 'ব্যাংক শাখা ব্যবস্থাপক (Bank Manager)', label_en: 'Bank Branch Manager' },
  { value: 'lawyer_court_user', label_bn: 'তালিকাভুক্ত আইনজীবী (Advocate)', label_en: 'Empaneled Advocate' },
  { value: 'dc_acquisition_officer', label_bn: 'এলএ অধিগ্রহণ কর্মকর্তা (DC LA Officer)', label_en: 'DC Land Acquisition Officer' },
  { value: 'auditor', label_bn: 'জাতীয় সিস্টেম অডিটর (System Auditor)', label_en: 'National System Auditor' },
  { value: 'admin', label_bn: 'সিস্টেম অ্যাডমিনিস্ট্রেটর (System Admin)', label_en: 'System Administrator' },
];

export const CreateOfficialDialog: React.FC<CreateOfficialDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
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

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Load available offices
  useEffect(() => {
    if (isOpen) {
      BhumiApi.listOffices()
        .then((res: any) => {
          const items = Array.isArray(res) ? res : res.items || [];
          setOffices(items);
          if (items.length > 0 && !officeId) {
            setOfficeId(items[0].id);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

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
    setSuccessMsg('');
  };

  const handleGenerateOfficialUsername = () => {
    const rolePrefix = role.replace(/[^a-z0-9]/g, '_');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setUsername(`${rolePrefix}_${randomSuffix}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullNameBn.trim() && !fullNameEn.trim()) {
      setErrorMsg(t('কর্মকর্তার পূর্ণ নাম লিখুন।', 'Please provide the official’s name.'));
      return;
    }

    if (phone.trim() && !/^(?:\+?8801|01)[3-9]\d{8}$/.test(phone.trim())) {
      setErrorMsg(t('সঠিক ১১ ডিজিট বাংলাদেশি মোবাইল নম্বর দিন।', 'Enter a valid 11-digit mobile number.'));
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

      const res = await BhumiApi.createUser(payload);

      setSuccessMsg(
        lang === 'bn'
          ? `কর্মকর্তা অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! পদবী: ${role}, আইডি: ${uname}`
          : `Official account provisioned successfully! Role: ${role}, ID: ${uname}`
      );

      setTimeout(() => {
        resetForm();
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Create official failed:', err);
      let msg = err.response?.data?.message_bn || err.response?.data?.message_en || err.message || 'Error provisioning account';
      if (err.response?.data?.code === 'USERNAME_EXISTS') {
        msg = t('এই ইউজারনেম ইতিমধ্যে ব্যবহৃত হয়েছে। ভিন্ন ইউজারনেম দিন।', 'This username is already taken. Please choose another.');
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
            <div className="size-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
              <Briefcase className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-slate-900">
                {t('সুপার অ্যাডমিন • নতুন কর্মকর্তা পদায়ন ও অ্যাকাউন্ট', 'Super Admin • Provision Official Account')}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                {t(
                  'সাব-রেজিস্ট্রি, এসি ল্যান্ড, ব্যাংক বা বিচারিক কর্মকর্তাদের ডিজিটাল কর্মকর্তা অ্যাকাউন্ট ও কর্মস্থল নির্ধারণ করুন।',
                  'Provision authoritative accounts for sub-registry, land revenue, banks, or courts with assigned jurisdiction.'
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
          {/* Official Role Selector */}
          <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-purple-50/60 border border-purple-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-purple-700" />
                <span>{t('কর্মকর্তার প্রাতিষ্ঠানিক ভূমিকা (Official RBAC Role):', 'Official RBAC Role:')} *</span>
              </label>
              <Badge className="bg-purple-700 text-white text-[10px]">
                Statutory Authority
              </Badge>
            </div>
            <Select value={role} onValueChange={(val) => setRole(val)}>
              <SelectTrigger className="h-10 text-xs bg-white font-semibold border-purple-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {OFFICIAL_ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {lang === 'bn' ? opt.label_bn : opt.label_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assigned Office */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Building2 className="size-3.5 text-slate-500" />
                <span>{t('দায়িত্বপ্রাপ্ত কার্যালয় (Posting Office):', 'Posting Office:')}</span>
              </label>
              <Select
                value={String(officeId)}
                onValueChange={(val) => setOfficeId(Number(val))}
              >
                <SelectTrigger className="h-9 text-xs bg-white">
                  <SelectValue placeholder="কার্যালয় নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {offices.map((off) => (
                    <SelectItem key={off.id} value={String(off.id)}>
                      {off.name_bn || off.name_en} ({off.upazila_en || off.district_en})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Building2 className="size-3.5 text-slate-500" />
                <span>{t('কাস্টম অফিসের নাম (যদি তালিকায় না থাকে):', 'Custom Office Name (Optional):')}</span>
              </label>
              <Input
                value={customOfficeBn}
                onChange={(e) => setCustomOfficeBn(e.target.value)}
                placeholder="যেমন: সাব-রেজিস্ট্রি অফিস, ধামরাই"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Officer Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <User className="size-3 text-slate-500" />
                <span>{t('কর্মকর্তার নাম (বাংলা):', 'Officer Name (Bangla):')} *</span>
              </label>
              <Input
                value={fullNameBn}
                onChange={(e) => setFullNameBn(e.target.value)}
                placeholder="যেমন: কাজী মাহফুজুর রহমান"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <User className="size-3 text-slate-500" />
                <span>{t('কর্মকর্তার নাম (ইংরেজি):', 'Officer Name (English):')}</span>
              </label>
              <Input
                value={fullNameEn}
                onChange={(e) => setFullNameEn(e.target.value)}
                placeholder="e.g. Kazi Mahfuzur Rahman"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Username & Contact Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  {t('ইউজারনেম (লগইন আইডি):', 'Username (Officer ID):')} *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateOfficialUsername}
                  className="text-[10px] font-bold text-purple-700 hover:underline flex items-center gap-0.5"
                >
                  <Sparkles className="size-2.5" />
                  {t('স্বয়ংক্রিয় তৈরি', 'Auto-Generate')}
                </button>
              </div>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="e.g. sub_reg_savar"
                className="h-9 text-xs font-mono"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Phone className="size-3 text-slate-500" />
                <span>{t('সরকারি মোবাইল নম্বর:', 'Official Mobile Phone:')}</span>
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="017xxxxxxxx"
                maxLength={14}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          {/* Email & Initial Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Mail className="size-3 text-slate-500" />
                <span>{t('দাপ্তরিক ইমেইল:', 'Official Email:')}</span>
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@land.gov.bd"
                className="h-9 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Lock className="size-3 text-slate-500" />
                <span>{t('ডিফল্ট পাসওয়ার্ড:', 'Initial Password:')} *</span>
              </label>
              <Input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Official@2026"
                className="h-9 text-xs font-mono"
                required
              />
            </div>
          </div>

          {/* National ID */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <CreditCard className="size-3 text-slate-500" />
              <span>{t('জাতীয় পরিচয়পত্র (NID - ঐচ্ছিক):', 'National ID (NID - Optional):')}</span>
            </label>
            <Input
              value={nid}
              onChange={(e) => setNid(e.target.value.replace(/\D/g, ''))}
              placeholder="১০, ১৩ বা ১৭ সংখ্যার এনআইডি"
              maxLength={17}
              className="h-9 text-xs font-mono"
            />
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
              className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs gap-1.5 cursor-pointer shadow-sm"
            >
              {loading ? (
                <span>{t('পদায়ন হচ্ছে...', 'Provisioning...')}</span>
              ) : (
                <>
                  <UserPlus className="size-3.5" />
                  <span>{t('কর্মকর্তা পদায়ন নিশ্চিত করুন', 'Confirm Officer Provision')}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
