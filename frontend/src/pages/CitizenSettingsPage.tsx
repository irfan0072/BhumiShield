import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Lock,
  Bell,
  Smartphone,
  Eye,
  EyeOff,
  Save,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Globe,
  HelpCircle,
  ShieldAlert,
  User,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAppUI } from '../i18n';

interface CitizenSettingsPageProps {
  onNavigate: (tab: string) => void;
}

export const CitizenSettingsPage: React.FC<CitizenSettingsPageProps> = ({ onNavigate }) => {
  const { lang, setLang, t } = useAppUI();

  // Load saved preferences from localStorage
  const [activeTab, setActiveTab] = useState<'security' | 'protection' | 'notifications' | 'preferences'>('security');
  
  // Security form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Preference switches
  const [twoFactorAuth, setTwoFactorAuth] = useState<boolean>(() => {
    return localStorage.getItem('bs_pref_2fa') !== 'false';
  });
  const [biometricLogin, setBiometricLogin] = useState<boolean>(() => {
    return localStorage.getItem('bs_pref_bio') !== 'false';
  });
  const [autoSaleLock, setAutoSaleLock] = useState<boolean>(() => {
    return localStorage.getItem('bs_pref_autolock') !== 'false';
  });
  const [mutationSmsAlert, setMutationSmsAlert] = useState<boolean>(() => {
    return localStorage.getItem('bs_pref_mutationsms') !== 'false';
  });
  const [weeklyDigest, setWeeklyDigest] = useState<boolean>(() => {
    return localStorage.getItem('bs_pref_weeklydigest') === 'true';
  });
  const [showTooltips, setShowTooltips] = useState<boolean>(() => {
    return localStorage.getItem('bs_pref_tooltips') !== 'false';
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Handle password change submit
  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage(null);

    if (!currentPassword) {
      setPassMessage({
        type: 'error',
        text: t('বর্তমান পাসওয়ার্ড প্রদান করুন।', 'Please provide current password.'),
      });
      return;
    }
    if (newPassword.length < 6) {
      setPassMessage({
        type: 'error',
        text: t('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।', 'New password must be at least 6 characters.'),
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassMessage({
        type: 'error',
        text: t('নতুন পাসওয়ার্ড ও নিশ্চিতকরণ পাসওয়ার্ড মেলেনি।', 'New password and confirmation do not match.'),
      });
      return;
    }

    setPassMessage({
      type: 'success',
      text: t('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!', 'Password successfully updated!'),
    });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPassMessage(null), 4000);
  };

  // Handle Save Preferences
  const handleSavePreferences = () => {
    localStorage.setItem('bs_pref_2fa', String(twoFactorAuth));
    localStorage.setItem('bs_pref_bio', String(biometricLogin));
    localStorage.setItem('bs_pref_autolock', String(autoSaleLock));
    localStorage.setItem('bs_pref_mutationsms', String(mutationSmsAlert));
    localStorage.setItem('bs_pref_weeklydigest', String(weeklyDigest));
    localStorage.setItem('bs_pref_tooltips', String(showTooltips));

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden max-w-5xl w-full mx-auto font-sans animate-in fade-in duration-200 space-y-3">
      {/* 1. Compact Top Bar */}
      <div className="flex items-center justify-between gap-3 pt-0.5 shrink-0">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onNavigate('home')}
            className="h-8 px-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border-slate-200 shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#006A4E]" />
            <span>{t('ড্যাশবোর্ড', 'Dashboard')}</span>
          </Button>
          <div className="h-3.5 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5 text-[#006A4E]" />
            <span className="text-xs font-bold text-slate-800">
              {t('সেটিংস ও নিরাপত্তা', 'Settings & Security')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onNavigate('profile')}
            className="h-8 px-2.5 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 border-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('প্রোফাইল', 'Profile')}</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSavePreferences}
            className="h-8 px-3 rounded-lg text-xs font-bold bg-[#006A4E] hover:bg-[#00553e] text-white shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t('সংরক্ষণ করুন', 'Save Settings')}</span>
          </Button>
        </div>
      </div>

      {/* Save Success Alert */}
      {savedSuccess && (
        <Alert className="bg-emerald-50 border-emerald-200 text-emerald-900 py-2 px-3 animate-in fade-in duration-200 shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#006A4E]" />
          <AlertTitle className="font-bold text-xs">
            {t('সেটিংস সফলভাবে সংরক্ষিত হয়েছে!', 'Settings Successfully Saved!')}
          </AlertTitle>
        </Alert>
      )}

      {/* 2. Compact Tabs Navigation with Single-Line Horizontal Scroll */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="w-full overflow-x-auto overflow-y-hidden pb-1 mb-2 shrink-0 scrollbar-thin">
          <TabsList className="inline-flex min-w-full sm:w-full items-center justify-start bg-slate-100/90 p-1 rounded-xl h-9 border border-slate-200/80 gap-1 flex-nowrap">
            <TabsTrigger
              value="security"
              className="flex-1 shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 text-xs font-bold h-7 px-3 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#006A4E] data-[state=active]:shadow-2xs cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>{t('নিরাপত্তা ও পাসওয়ার্ড', 'Security & Password')}</span>
            </TabsTrigger>

            <TabsTrigger
              value="protection"
              className="flex-1 shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 text-xs font-bold h-7 px-3 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#006A4E] data-[state=active]:shadow-2xs cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>{t('বিক্রয় লক ও সুরক্ষা', 'Sale Lock & Protection')}</span>
            </TabsTrigger>

            <TabsTrigger
              value="notifications"
              className="flex-1 shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 text-xs font-bold h-7 px-3 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#006A4E] data-[state=active]:shadow-2xs cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 shrink-0" />
              <span>{t('বিজ্ঞপ্তি সেটিংস', 'Notifications')}</span>
            </TabsTrigger>

            <TabsTrigger
              value="preferences"
              className="flex-1 shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 text-xs font-bold h-7 px-3 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#006A4E] data-[state=active]:shadow-2xs cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span>{t('ভাষা ও ডিসপ্লে', 'Language & Display')}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 3. Scrollable Tab Contents */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin">
          {/* TAB 1: Password & 2FA Security */}
          <TabsContent value="security" className="mt-0 focus-visible:outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pb-2">
              {/* Password Change Card */}
              <Card className="border border-slate-200 shadow-2xs">
                <CardHeader className="p-3 pb-2 border-b border-slate-100 flex flex-row items-center gap-2 space-y-0">
                  <KeyRound className="w-4 h-4 text-[#006A4E]" />
                  <div>
                    <CardTitle className="text-xs font-bold text-slate-900">
                      {t('পাসওয়ার্ড পরিবর্তন', 'Change Password')}
                    </CardTitle>
                    <p className="text-[10px] text-slate-500">
                      {t('নিয়মিত পাসওয়ার্ড পরিবর্তন করে অ্যাকাউন্ট সুরক্ষিত রাখুন', 'Update password periodically')}
                    </p>
                  </div>
                </CardHeader>

                <form onSubmit={handlePasswordChange}>
                  <CardContent className="p-3.5 space-y-2.5 text-xs">
                    {passMessage && (
                      <Alert variant={passMessage.type === 'error' ? 'destructive' : 'default'} className={`py-1.5 px-2.5 ${passMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : ''}`}>
                        {passMessage.type === 'error' ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5 text-[#006A4E]" />}
                        <AlertDescription className="text-xs font-bold ml-1.5">
                          {passMessage.text}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-1">
                      <Label htmlFor="currPass" className="text-[11px] font-bold text-slate-700">
                        {t('বর্তমান পাসওয়ার্ড', 'Current Password')}
                      </Label>
                      <div className="relative">
                        <Input
                          id="currPass"
                          type={showCurrentPass ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="text-xs h-8 pr-7"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPass(!showCurrentPass)}
                          className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="newPass" className="text-[11px] font-bold text-slate-700">
                        {t('নতুন পাসওয়ার্ড', 'New Password')}
                      </Label>
                      <div className="relative">
                        <Input
                          id="newPass"
                          type={showNewPass ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="text-xs h-8 pr-7"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="confirmPass" className="text-[11px] font-bold text-slate-700">
                        {t('নতুন পাসওয়ার্ড নিশ্চিত করুন', 'Confirm New Password')}
                      </Label>
                      <Input
                        id="confirmPass"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="text-xs h-8"
                      />
                    </div>
                  </CardContent>

                  <CardFooter className="p-3.5 pt-0 flex justify-end">
                    <Button
                      type="submit"
                      className="bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold h-8 px-4 rounded-lg shadow-2xs cursor-pointer"
                    >
                      {t('পাসওয়ার্ড হালনাগাদ করুন', 'Update Password')}
                    </Button>
                  </CardFooter>
                </form>
              </Card>

              {/* 2FA & Biometric Card */}
              <Card className="border border-slate-200 shadow-2xs">
                <CardHeader className="p-3 pb-2 border-b border-slate-100 flex flex-row items-center gap-2 space-y-0">
                  <ShieldAlert className="w-4 h-4 text-[#006A4E]" />
                  <div>
                    <CardTitle className="text-xs font-bold text-slate-900">
                      {t('দ্বি-স্তরবিশিষ্ট লগইন (2FA)', 'Two-Factor Authentication')}
                    </CardTitle>
                    <p className="text-[10px] text-slate-500">
                      {t('অ্যাকাউন্টে অতিরিক্ত নিরাপত্তা স্তর সক্রিয় করুন', 'Extra verification protocols')}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="p-3.5 space-y-3.5 text-xs">
                  {/* 2FA Toggle */}
                  <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold text-slate-900 block">
                        {t('এসএমএস ওটিপি লগইন (2FA)', 'Two-Factor SMS OTP')}
                      </Label>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        {t('লগইনের সময় মোবাইলে ৬-সংখ্যার ওটিপি কোড পাঠানো হবে।', 'Receive 6-digit SMS verification code on mobile.')}
                      </p>
                    </div>
                    <Switch
                      checked={twoFactorAuth}
                      onCheckedChange={setTwoFactorAuth}
                      className="shrink-0 cursor-pointer"
                    />
                  </div>

                  {/* Biometric Toggle */}
                  <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold text-slate-900 block">
                        {t('স্মার্ট বায়োমেট্রিক সাইন-ইন', 'Smart Biometric Fast Sign-In')}
                      </Label>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        {t('ফিঙ্গারপ্রিন্ট ডিভাইসের মাধ্যমে ১-ক্লিকে সুরক্ষিত প্রবেশ।', 'Fingerprint/facial unlock on authorized devices.')}
                      </p>
                    </div>
                    <Switch
                      checked={biometricLogin}
                      onCheckedChange={setBiometricLogin}
                      className="shrink-0 cursor-pointer"
                    />
                  </div>

                  <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-2.5 text-[11px] text-emerald-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#006A4E] shrink-0" />
                    <span>
                      {t('সকল সেশন Ed25519 ও ২৫৬-বিট এনক্রিপশনে সুরক্ষিত।', 'Protected by 256-bit cryptographic protocol.')}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="p-3.5 pt-0 flex justify-end">
                  <Button
                    type="button"
                    onClick={handleSavePreferences}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold h-8 px-4 rounded-lg shadow-2xs cursor-pointer"
                  >
                    <Save className="w-3 h-3 mr-1.5" />
                    <span>{t('সংরক্ষণ করুন', 'Save Settings')}</span>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: Land Protection & Sale Lock */}
          <TabsContent value="protection" className="mt-0 focus-visible:outline-none">
            <Card className="border border-slate-200 shadow-2xs">
              <CardHeader className="p-3 pb-2 border-b border-slate-100 flex flex-row items-center gap-2 space-y-0">
                <ShieldCheck className="w-4 h-4 text-[#006A4E]" />
                <div>
                  <CardTitle className="text-xs font-bold text-slate-900">
                    {t('বিক্রয় লক ও জালিয়াতি প্রতিরোধ সেটিংস', 'Sale Lock & Anti-Fraud Settings')}
                  </CardTitle>
                  <p className="text-[10px] text-slate-500">
                    {t('অনুমতি ছাড়া জমি হস্তান্তর ও প্রতারণা প্রতিরোধ', 'Prevent unauthorized transactions')}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="p-3.5 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50/70 border border-slate-100">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-slate-900 block">
                      {t('মিউটেশনের পর স্বয়ংক্রিয় বিক্রয় লক (Auto-Lock)', 'Auto-Lock on Mutation')}
                    </Label>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      {t('নতুন নামজারি খতিয়ান তৈরি হওয়ার সাথে সাথেই স্বয়ংক্রিয়ভাবে বিক্রয় লক চালু হবে।', 'Instantly activate sovereign sale lock on any newly mutated plot.')}
                    </p>
                  </div>
                  <Switch
                    checked={autoSaleLock}
                    onCheckedChange={setAutoSaleLock}
                    className="shrink-0 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50/70 border border-slate-100">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-slate-900 block">
                      {t('অননুমোদিত সার্চ ও জালিয়াতি অ্যালার্ট', 'Unauthorized Search & Fraud Alerts')}
                    </Label>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      {t('কোনো ব্যক্তি আপনার দাগ নম্বরে দলিল প্রস্তুত বা আবেদন করার চেষ্টা করলে তাৎক্ষণিক পুশ নোটিফিকেশন।', 'Receive instant emergency push alerts on any plot title inquiry.')}
                    </p>
                  </div>
                  <Switch
                    checked={mutationSmsAlert}
                    onCheckedChange={setMutationSmsAlert}
                    className="shrink-0 cursor-pointer"
                  />
                </div>

                <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg p-2.5 text-[11px] text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    {t(
                      'বিক্রয় লক চালু থাকা অবস্থায় সাব-রেজিস্ট্রি অফিসে আপনার বায়োমেট্রিক ওটিপি অনুমোদন ছাড়া কেউ দলিল রেজিস্ট্রি করতে পারবে না।',
                      'Deed creation is rejected by Sub-Registry systems unless unlocked by your biometric OTP.'
                    )}
                  </span>
                </div>
              </CardContent>

              <CardFooter className="p-3.5 pt-0 flex justify-end">
                <Button
                  type="button"
                  onClick={handleSavePreferences}
                  className="bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold h-8 px-4 rounded-lg shadow-2xs cursor-pointer"
                >
                  <Save className="w-3 h-3 mr-1.5" />
                  <span>{t('সংরক্ষণ করুন', 'Save Settings')}</span>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* TAB 3: Notifications */}
          <TabsContent value="notifications" className="mt-0 focus-visible:outline-none">
            <Card className="border border-slate-200 shadow-2xs">
              <CardHeader className="p-3 pb-2 border-b border-slate-100 flex flex-row items-center gap-2 space-y-0">
                <Bell className="w-4 h-4 text-[#006A4E]" />
                <div>
                  <CardTitle className="text-xs font-bold text-slate-900">
                    {t('বিজ্ঞপ্তি ও নোটিফিকেশন সেটিংস', 'Notification Channels')}
                  </CardTitle>
                  <p className="text-[10px] text-slate-500">
                    {t('জরুরি এসএমএস ও ইমেইল সতর্কতা নিয়ন্ত্রণ করুন', 'Manage notification alerts')}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="p-3.5 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50/70 border border-slate-100">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-slate-900 block">
                      {t('১৬১২২ হেল্পলাইন ও শুনানির তারিখ এসএমএস', '16122 Hearing & Field Inspection SMS')}
                    </Label>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      {t('তদন্ত কর্মকর্তার ফিল্ড পরিদর্শন ও এসি ল্যান্ড শুনানির তারিখ এসএমএসের মাধ্যমে জানানো হবে।', 'Receive direct SMS alerts for hearings and surveyor field visits.')}
                    </p>
                  </div>
                  <Switch
                    checked={mutationSmsAlert}
                    onCheckedChange={setMutationSmsAlert}
                    className="shrink-0 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50/70 border border-slate-100">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-slate-900 block">
                      {t('মাসিক ভূমিস্বত্ব সারাংশ ইমেইল (Monthly Land Digest)', 'Monthly Land Ownership Digest Email')}
                    </Label>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      {t('মাসের প্রথম সপ্তাহে আপনার মালিকানাধীন দাগ, খাজনা ও নিরাপত্তা স্থিতির পূর্ণ বিবরণী ইমেইলে প্রেরণ।', 'Comprehensive monthly report of taxes, active locks, and parcel status.')}
                    </p>
                  </div>
                  <Switch
                    checked={weeklyDigest}
                    onCheckedChange={setWeeklyDigest}
                    className="shrink-0 cursor-pointer"
                  />
                </div>
              </CardContent>

              <CardFooter className="p-3.5 pt-0 flex justify-end">
                <Button
                  type="button"
                  onClick={handleSavePreferences}
                  className="bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold h-8 px-4 rounded-lg shadow-2xs cursor-pointer"
                >
                  <Save className="w-3 h-3 mr-1.5" />
                  <span>{t('সংরক্ষণ করুন', 'Save Settings')}</span>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* TAB 4: Language & Display */}
          <TabsContent value="preferences" className="mt-0 focus-visible:outline-none">
            <Card className="border border-slate-200 shadow-2xs">
              <CardHeader className="p-3 pb-2 border-b border-slate-100 flex flex-row items-center gap-2 space-y-0">
                <Globe className="w-4 h-4 text-[#006A4E]" />
                <div>
                  <CardTitle className="text-xs font-bold text-slate-900">
                    {t('ভাষা ও ডিসপ্লে পছন্দসমূহ', 'Language & Display Preferences')}
                  </CardTitle>
                  <p className="text-[10px] text-slate-500">
                    {t('পোর্টালের ভাষা ও আইনি শব্দের সহায়িকা পরিচালনা করুন', 'Configure portal language and legal tips')}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="p-3.5 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50/70 border border-slate-100">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-slate-900 block">
                      {t('পোর্টালের ভাষা (Portal Language)', 'Portal Language')}
                    </Label>
                    <p className="text-[10px] text-slate-500">
                      {lang === 'bn' ? 'বর্তমান ভাষা: বাংলা (Bangla)' : 'Current Language: English'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <Button
                      type="button"
                      size="sm"
                      variant={lang === 'bn' ? 'default' : 'ghost'}
                      onClick={() => setLang('bn')}
                      className={`h-6 px-2.5 text-xs font-bold rounded-md cursor-pointer ${lang === 'bn' ? 'bg-[#006A4E] text-white shadow-2xs' : 'text-slate-600'}`}
                    >
                      বাংলা
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={lang === 'en' ? 'default' : 'ghost'}
                      onClick={() => setLang('en')}
                      className={`h-6 px-2.5 text-xs font-bold rounded-md cursor-pointer ${lang === 'en' ? 'bg-[#006A4E] text-white shadow-2xs' : 'text-slate-600'}`}
                    >
                      English
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50/70 border border-slate-100">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-slate-900 block">
                      {t('আইনি শব্দের সহজ অর্থ প্রদর্শন (Jargon Help Tooltips)', 'Legal Jargon Help Tooltips')}
                    </Label>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      {t('খতিয়ান, সিএস, এসএ, বায়া দলিলের পাশে সহজ বাংলায় ব্যাখ্যা প্রদর্শন।', 'Enable helpful plain-language tooltips for land terms.')}
                    </p>
                  </div>
                  <Switch
                    checked={showTooltips}
                    onCheckedChange={setShowTooltips}
                    className="shrink-0 cursor-pointer"
                  />
                </div>
              </CardContent>

              <CardFooter className="p-3.5 pt-0 flex justify-end">
                <Button
                  type="button"
                  onClick={handleSavePreferences}
                  className="bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold h-8 px-4 rounded-lg shadow-2xs cursor-pointer"
                >
                  <Save className="w-3 h-3 mr-1.5" />
                  <span>{t('পছন্দসমূহ সংরক্ষণ করুন', 'Save Preferences')}</span>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
