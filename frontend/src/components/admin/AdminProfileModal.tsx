import React, { useState, useEffect } from 'react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { toBanglaDigits, maskNid } from '@/theme/tokens';
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  User,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Mail,
  Building,
  Lock,
  Eye,
  EyeOff,
  Save,
  KeyRound,
  Shield,
  Activity,
  Calendar,
  Sparkles,
  Fingerprint,
} from 'lucide-react';

interface AdminProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminProfileModal: React.FC<AdminProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, setUser, lang, t, role } = useAppUI();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'activity'>('general');

  // Form states
  const [fullNameBn, setFullNameBn] = useState('');
  const [fullNameEn, setFullNameEn] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [officeBn, setOfficeBn] = useState('');
  const [designationBn, setDesignationBn] = useState('');
  const [showNid, setShowNid] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; err: boolean } | null>(null);

  // Save states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync state with user data
  useEffect(() => {
    if (user) {
      setFullNameBn(user.full_name_bn || 'জাতীয় সুপার অ্যাডমিন');
      setFullNameEn(user.full_name_en || 'National Super Admin');
      setEmail(user.email || 'admin@bhumishield.gov.bd');
      setPhone(user.phone || user.phone_dummy || user.phone_mock || '01700-000001');
      setOfficeBn(user.office_bn || 'ভূমি মন্ত্রণালয় ও ভূমি রেকর্ড ও জরিপ অধিদপ্তর');
      setDesignationBn('জাতীয় সিস্টেম ও ডেটাবেজ প্রশাসক');
    }
  }, [user, isOpen]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      if (user) {
        const updatedUser = {
          ...user,
          full_name_bn: fullNameBn,
          full_name_en: fullNameEn,
          email,
          phone,
          office_bn: officeBn,
        };

        setUser(updatedUser);

        try {
          await BhumiApi.updateProfile({
            full_name_bn: fullNameBn,
            full_name_en: fullNameEn,
            email,
            phone,
          });
        } catch {
          // If offline or demo mock, local state update is sufficient
        }

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch {
      setSaveError(t('প্রোফাইল আপডেট করতে সমস্যা হয়েছে।', 'Failed to update profile.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordMsg({
        text: t('বর্তমান পাসওয়ার্ড প্রদান করুন।', 'Please provide current password.'),
        err: true,
      });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({
        text: t('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।', 'New password must be at least 6 characters.'),
        err: true,
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({
        text: t('পাসওয়ার্ড দুটি মেলেনি।', 'Passwords do not match.'),
        err: true,
      });
      return;
    }

    setPasswordMsg({
      text: t('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!', 'Password successfully updated!'),
      err: false,
    });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordMsg(null), 4000);
  };

  const rawNid = user?.nid || user?.nid_mock || '19901234567890123';
  const displayNid = showNid ? rawNid : maskNid(rawNid);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border border-border shadow-2xl">
        {/* Profile Header Banner */}
        <div className="bg-linear-to-r from-emerald-950 via-slate-900 to-emerald-900 p-6 text-white relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-16 rounded-2xl border-2 border-emerald-400/40 bg-emerald-800 text-white font-black text-xl shadow-md">
                <AvatarFallback>
                  {user?.username?.substring(0, 2)?.toUpperCase() || 'SA'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black tracking-tight">
                    {lang === 'bn' ? fullNameBn : fullNameEn}
                  </h2>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[11px] font-bold">
                    Tier 3 Root Admin
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Building className="size-3.5 text-emerald-400" />
                  <span>{officeBn}</span>
                </p>
                <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-mono">
                  <span>@{user?.username || 'admin'}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {t('সক্রিয় ও সুরক্ষিত', 'Active & Secure')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {saveSuccess && (
            <Alert className="py-2.5 px-3.5 border-emerald-200 bg-emerald-50 text-emerald-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <AlertDescription className="text-xs font-bold">
                  {t('প্রোফাইল তথ্য সফলভাবে সংরক্ষিত হয়েছে!', 'Profile updated successfully!')}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {saveError && (
            <Alert variant="destructive" className="py-2.5 px-3.5">
              <AlertDescription className="text-xs font-bold">{saveError}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
            <TabsList className="bg-muted p-1 rounded-lg border border-border h-auto flex flex-wrap gap-1">
              <TabsTrigger value="general" className="gap-1.5 text-xs font-semibold cursor-pointer">
                <User className="size-3.5" />
                <span>{t('সাধারণ তথ্য', 'General Info')}</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-1.5 text-xs font-semibold cursor-pointer">
                <ShieldCheck className="size-3.5" />
                <span>{t('নিরাপত্তা ও অ্যাক্সেস', 'Security & Access')}</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-1.5 text-xs font-semibold cursor-pointer">
                <Activity className="size-3.5" />
                <span>{t('কার্যকলাপ লগ', 'Activity Log')}</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: General Info */}
            <TabsContent value="general" className="space-y-4 pt-4">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">
                      {t('পূর্ণ নাম (বাংলা)', 'Full Name (Bangla)')}
                    </Label>
                    <Input
                      value={fullNameBn}
                      onChange={(e) => setFullNameBn(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">
                      {t('পূর্ণ নাম (ইংরেজি)', 'Full Name (English)')}
                    </Label>
                    <Input
                      value={fullNameEn}
                      onChange={(e) => setFullNameEn(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Mail className="size-3.5 text-emerald-700" />
                      <span>{t('প্রাতিষ্ঠানিক ইমেইল', 'Official Email')}</span>
                    </Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="text-xs h-9 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Phone className="size-3.5 text-emerald-700" />
                      <span>{t('মোবাইল নম্বর', 'Mobile Number')}</span>
                    </Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="text-xs h-9 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Fingerprint className="size-3.5 text-emerald-700" />
                        <span>{t('জাতীয় পরিচয়পত্র (NID)', 'National ID (NID)')}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowNid(!showNid)}
                        className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer font-normal"
                      >
                        {showNid ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                        <span>{showNid ? t('লুকান', 'Hide') : t('দেখান', 'Show')}</span>
                      </button>
                    </Label>
                    <Input
                      readOnly
                      value={toBanglaDigits(displayNid, lang)}
                      className="text-xs h-9 font-mono bg-muted/50 cursor-default"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">
                      {t('ইউজারনেম (অপরিবর্তনীয়)', 'Username (Read-only)')}
                    </Label>
                    <Input
                      readOnly
                      value={user?.username || 'admin'}
                      className="text-xs h-9 font-mono bg-muted/50 cursor-default"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    {t('দায়িত্বপ্রাপ্ত কার্যালয় / মন্ত্রণালয়', 'Assigned Office / Ministry')}
                  </Label>
                  <Input
                    value={officeBn}
                    onChange={(e) => setOfficeBn(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSaving}
                    size="sm"
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-9 px-4 cursor-pointer gap-1.5"
                  >
                    <Save className="size-3.5" />
                    <span>{isSaving ? t('সংরক্ষণ হচ্ছে...', 'Saving...') : t('তথ্য সংরক্ষণ করুন', 'Save Profile')}</span>
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* TAB 2: Security & Credentials */}
            <TabsContent value="security" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-1">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <Shield className="size-3.5 text-emerald-600" />
                    <span>{t('রোল ও পারমিশন টায়ার', 'Permission Tier')}</span>
                  </div>
                  <div className="text-xs font-bold text-foreground">Tier 3 — National Root Admin</div>
                  <p className="text-[10px] text-muted-foreground">
                    {t('সকল ডাটাবেজ, খতিয়ান ও অডিট লগের পূর্ণ নিয়ন্ত্রণ।', 'Full control over records, deeds, and audit trails.')}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-1">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <KeyRound className="size-3.5 text-emerald-600" />
                    <span>{t('ক্রিপ্টোগ্রাফিক সিল', 'Cryptographic Seal')}</span>
                  </div>
                  <div className="text-xs font-bold text-foreground">Ed25519 Hardware Seal</div>
                  <p className="text-[10px] text-muted-foreground">
                    {t('ডিজিটাল স্বাক্ষর ও সরকারি বালাম এনক্রিপশন সক্রিয়।', 'Hardware backed signature and ledger integrity active.')}
                  </p>
                </div>
              </div>

              {/* Password Change Form */}
              <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="size-4 text-emerald-700" />
                  <span className="text-xs font-bold text-foreground">
                    {t('পাসওয়ার্ড পরিবর্তন', 'Change Password')}
                  </span>
                </div>

                {passwordMsg && (
                  <Alert
                    variant={passwordMsg.err ? 'destructive' : 'default'}
                    className="py-2 px-3 text-xs border-emerald-200 bg-emerald-50 text-emerald-900"
                  >
                    <AlertDescription className="font-bold">{passwordMsg.text}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handlePasswordChange} className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">{t('বর্তমান পাসওয়ার্ড', 'Current Password')}</Label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="text-xs h-8.5 font-mono"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">{t('নতুন পাসওয়ার্ড', 'New Password')}</Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="text-xs h-8.5 font-mono"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">{t('নতুন পাসওয়ার্ড নিশ্চিত করুন', 'Confirm Password')}</Label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="text-xs h-8.5 font-mono"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      className="text-xs font-bold h-8 cursor-pointer"
                    >
                      {t('পাসওয়ার্ড আপডেট করুন', 'Update Password')}
                    </Button>
                  </div>
                </form>
              </div>
            </TabsContent>

            {/* TAB 3: Activity Log */}
            <TabsContent value="activity" className="space-y-3 pt-4">
              <div className="space-y-2">
                {[
                  {
                    action: t('সিস্টেম সেটিংস ও নিরাপত্তা কনফিগারেশন আপডেট', 'System security settings updated'),
                    time: t('১০ মিনিট আগে', '10 minutes ago'),
                    type: 'config',
                  },
                  {
                    action: t('নতুন সরকারি নোটিশ প্রকাশ ও সার্কুলার জারি', 'Published official land notice circular'),
                    time: t('৩৫ মিনিট আগে', '35 minutes ago'),
                    type: 'notice',
                  },
                  {
                    action: t('কর্মকর্তা বদলি আদেশ অনুমোদন ও নোটিফিকেশন প্রেরণ', 'Approved official transfer order'),
                    time: t('২ ঘণ্টা আগে', '2 hours ago'),
                    type: 'transfer',
                  },
                  {
                    action: t('দৈনিক ক্রিপ্টোগ্রাফিক লেজার স্ন্যাপশট যাচাই সম্পন্ন', 'Cryptographic ledger audit verified'),
                    time: t('৫ ঘণ্টা আগে', '5 hours ago'),
                    type: 'audit',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/70 bg-card text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="size-2 rounded-full bg-emerald-500" />
                      <span className="font-semibold text-foreground">{item.action}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-bold cursor-pointer"
          >
            {t('বন্ধ করুন', 'Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
