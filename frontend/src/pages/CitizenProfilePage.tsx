import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  Save,
  ArrowLeft,
  ExternalLink,
  QrCode,
  Fingerprint,
  FileBadge,
  Sparkles,
  Smartphone,
  Shield,
  Layers,
  Settings,
  Edit3,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAppUI } from '../i18n';
import { toBanglaDigits, maskNid } from '../theme/tokens';
import { BhumiApi } from '../api/client';

interface CitizenProfilePageProps {
  onNavigate: (tab: string) => void;
}

export const CitizenProfilePage: React.FC<CitizenProfilePageProps> = ({ onNavigate }) => {
  const { user, setUser, lang, t } = useAppUI();

  // Clean full name helper
  const cleanName = (name?: string | null) => {
    if (!name) return '';
    return name.replace(/\s*\((?:নাগরিক|Citizen)\)/gi, '').trim();
  };

  const displayName = lang === 'bn' 
    ? (cleanName(user?.full_name_bn) || 'মো. রফিকুল ইসলাম') 
    : (cleanName(user?.full_name_en) || 'Md. Rafiqul Islam');

  // Form states
  const [showFullNid, setShowFullNid] = useState(false);
  const [phone, setPhone] = useState(user?.phone || user?.phone_dummy || user?.phone_mock || '01700-001001');
  const [email, setEmail] = useState(user?.email || 'rafiqul.citizen@demo.bhumishield.gov.bd');
  const [presentAddress, setPresentAddress] = useState(user?.present_address_bn || 'বাসা #১২, রোড #০৫, ব্লক-বি, মিরপুর-২, ঢাকা-১২১৬');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<'contact' | 'identity'>('contact');

  // Handle Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      if (user) {
        const updated = {
          ...user,
          phone,
          email,
          present_address_bn: presentAddress,
        };
        // Update local app context and storage
        setUser(updated);
        // Attempt API update (fail-safe)
        try {
          await BhumiApi.updateProfile({
            phone,
            email,
            present_address_bn: presentAddress,
          });
        } catch {
          // fallback to client-side persistence
        }
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } finally {
      setIsSaving(false);
    }
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
          <span className="text-xs font-bold text-slate-700 hidden sm:inline">
            {t('নাগরিক প্রোফাইল', 'Citizen Profile')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#006A4E] border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#006A4E]" />
            <span>{t('যাচাইকৃত নাগরিক', 'Verified Citizen')}</span>
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onNavigate('settings')}
            className="h-8 px-2.5 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 border-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('সেটিংস', 'Settings')}</span>
          </Button>
        </div>
      </div>

      {/* 2. Compact Profile Summary Header */}
      <Card className="border border-slate-200/90 shadow-2xs bg-gradient-to-r from-white via-emerald-50/20 to-emerald-50/40 shrink-0">
        <CardContent className="p-3 sm:p-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left Avatar & Identity */}
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-100 border border-emerald-300 text-[#006A4E] flex items-center justify-center font-black text-lg shadow-2xs shrink-0">
                <AvatarFallback className="bg-emerald-100 text-[#006A4E] font-black">
                  {displayName.charAt(0) || 'ম'}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                    {displayName}
                  </h1>
                  <Badge variant="outline" className="px-2 py-0 text-[10px] font-bold bg-white text-emerald-800 border-emerald-200 font-mono">
                    BD-{user?.nid ? user.nid.slice(-6) : '990001'}
                  </Badge>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-slate-600 font-mono mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Fingerprint className="w-3.5 h-3.5 text-[#006A4E]" />
                    <span className="text-slate-700 font-bold">
                      {showFullNid ? (user?.nid || '9900001001') : maskNid(user?.nid || '9900001001', lang)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowFullNid(!showFullNid)}
                      className="ml-0.5 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                      title={showFullNid ? t('লুকান', 'Hide NID') : t('দেখান', 'Show NID')}
                    >
                      {showFullNid ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-600 truncate font-sans text-[11px]">
                    {user?.office_bn || t('সাভার উপজেলা, ঢাকা', 'Savar Upazila, Dhaka')}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Stats Chips */}
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <div className="bg-white/90 border border-slate-200 rounded-lg px-2.5 py-1.5 text-right shadow-2xs">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
                  {t('মোট জমি', 'Total Land')}
                </span>
                <span className="text-xs font-black text-[#006A4E]">
                  {toBanglaDigits('20.00', lang)} {t('শতক', 'Dec')}
                </span>
              </div>
              <div className="bg-white/90 border border-slate-200 rounded-lg px-2.5 py-1.5 text-right shadow-2xs">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
                  {t('সুরক্ষিত দাগ', 'Plots')}
                </span>
                <span className="text-xs font-black text-slate-900">
                  {toBanglaDigits('3', lang)} {t('টি', '')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Success Alert */}
      {saveSuccess && (
        <Alert className="bg-emerald-50 border-emerald-200 text-emerald-900 py-2 px-3 animate-in fade-in duration-200 shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#006A4E]" />
          <AlertTitle className="font-bold text-xs">
            {t('তথ্য সফলভাবে সংরক্ষিত হয়েছে!', 'Profile Saved Successfully!')}
          </AlertTitle>
        </Alert>
      )}

      {/* 3. Main Content: Space-Optimized 2-Column Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 pb-2">
          {/* Left Column (7 cols): Tabbed Contact & Identity Form */}
          <div className="lg:col-span-7 space-y-3.5">
            <Card className="border border-slate-200 shadow-2xs">
              <CardHeader className="p-3 pb-2 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#006A4E]" />
                  <CardTitle className="text-xs font-bold text-slate-900">
                    {t('নাগরিক বিবরণী ও যোগাযোগ', 'Citizen Records & Contact')}
                  </CardTitle>
                </div>
                <Tabs value={activeProfileTab} onValueChange={(v) => setActiveProfileTab(v as any)}>
                  <TabsList className="bg-slate-100 h-7 p-0.5 rounded-lg border border-slate-200">
                    <TabsTrigger value="contact" className="text-[11px] font-bold h-6 px-2.5 data-[state=active]:bg-white data-[state=active]:text-[#006A4E] data-[state=active]:shadow-2xs">
                      {t('যোগাযোগ', 'Contact')}
                    </TabsTrigger>
                    <TabsTrigger value="identity" className="text-[11px] font-bold h-6 px-2.5 data-[state=active]:bg-white data-[state=active]:text-[#006A4E] data-[state=active]:shadow-2xs">
                      {t('অফিসিয়াল তথ্য', 'Official NID')}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>

              <CardContent className="p-3.5">
                {activeProfileTab === 'contact' ? (
                  <form onSubmit={handleSaveProfile} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="phone" className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                          <span>{t('মোবাইল নম্বর', 'Mobile Number')}</span>
                          <span className="text-[9px] text-emerald-700 font-bold flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            OTP
                          </span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="phone"
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="font-mono text-xs h-8 pl-7.5"
                            required
                          />
                          <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="email" className="text-[11px] font-bold text-slate-700">
                          {t('ইমেইল ঠিকানা', 'Email Address')}
                        </Label>
                        <div className="relative">
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="font-mono text-xs h-8 pl-7.5"
                          />
                          <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="presentAddress" className="text-[11px] font-bold text-slate-700">
                        {t('বর্তমান ঠিকানা', 'Present Residential Address')}
                      </Label>
                      <div className="relative">
                        <Input
                          id="presentAddress"
                          type="text"
                          value={presentAddress}
                          onChange={(e) => setPresentAddress(e.target.value)}
                          className="text-xs h-8 pl-7.5"
                        />
                        <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-700">
                        {t('স্থায়ী ঠিকানা (খতিয়ান অনুযায়ী)', 'Permanent Address (Record)')}
                      </Label>
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs">
                        {t('গ্রাম: বিরুলিয়া, ডাকঘর: বিরুলিয়া, উপজেলা: সাভার, জেলা: ঢাকা', 'Village: Birulia, Post: Birulia, Upazila: Savar, District: Dhaka')}
                      </div>
                    </div>

                    <div className="pt-1 flex justify-end">
                      <Button
                        type="submit"
                        disabled={isSaving}
                        className="bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold h-8 px-4 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-3 h-3" />
                        <span>{isSaving ? t('সংরক্ষণ হচ্ছে...', 'Saving...') : t('সংরক্ষণ করুন', 'Save Updates')}</span>
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <Label className="text-[10px] font-bold text-slate-500">{t('পূর্ণ নাম (বাংলা)', 'Full Name (Bangla)')}</Label>
                      <div className="mt-0.5 p-2 rounded-md bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs">
                        {displayName}
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-slate-500">{t('Full Name (English)', 'Full Name (English)')}</Label>
                      <div className="mt-0.5 p-2 rounded-md bg-slate-50 border border-slate-200 font-bold text-slate-800 font-mono text-xs">
                        {user?.full_name_en ? cleanName(user.full_name_en) : 'Md. Rafiqul Islam'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-slate-500">{t('জাতীয় পরিচয়পত্র নম্বর (NID)', 'National ID')}</Label>
                      <div className="mt-0.5 p-2 rounded-md bg-slate-50 border border-slate-200 font-mono font-bold text-slate-800 text-xs flex items-center justify-between">
                        <span>{user?.nid || '9900001001'}</span>
                        <Badge variant="outline" className="text-[9px] text-emerald-700 bg-emerald-50 border-emerald-200 font-bold px-1.5 py-0">
                          {t('যাচাইকৃত', 'Verified')}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-slate-500">{t('জন্ম তারিখ (Date of Birth)', 'Date of Birth')}</Label>
                      <div className="mt-0.5 p-2 rounded-md bg-slate-50 border border-slate-200 font-mono text-slate-800 text-xs">
                        {user?.date_of_birth ? toBanglaDigits(user.date_of_birth, lang) : toBanglaDigits('1985-05-12', lang)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-slate-500">{t('পিতার নাম', "Father's Name")}</Label>
                      <div className="mt-0.5 p-2 rounded-md bg-slate-50 border border-slate-200 text-slate-800 text-xs">
                        {user?.father_name_bn || 'মৃত হাজী আবদুল জব্বার'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-slate-500">{t('মাতার নাম', "Mother's Name")}</Label>
                      <div className="mt-0.5 p-2 rounded-md bg-slate-50 border border-slate-200 text-slate-800 text-xs">
                        {user?.mother_name_bn || 'হালিমা খাতুন'}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column (5 cols): Compact Passport Card & Security */}
          <div className="lg:col-span-5 space-y-3.5">
            {/* Digital Land Passport Card */}
            <Card className="border border-[#006A4E]/30 bg-gradient-to-br from-emerald-950 via-[#004D38] to-[#003B2B] text-white shadow-2xs relative overflow-hidden">
              <CardHeader className="p-3 pb-2 border-b border-emerald-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center">
                      <Shield className="w-3.5 h-3.5 text-emerald-300" />
                    </div>
                    <div>
                      <CardTitle className="text-xs font-black text-white tracking-tight">
                        {t('ল্যান্ড পাসপোর্ট', 'Digital Land Passport')}
                      </CardTitle>
                      <p className="text-[9px] text-emerald-300 font-mono">BD-LND-2026-990001</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/40 text-[9px] font-mono py-0 px-1.5">
                    ACTIVE
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-3 space-y-2.5">
                <div className="bg-black/20 p-2.5 rounded-lg border border-emerald-500/20 flex items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <span className="text-[9px] text-emerald-300 block uppercase font-bold">
                      {t('মালিকানাধীন ভূমিস্বত্ব', 'Total Volume')}
                    </span>
                    <span className="text-sm font-black text-white">
                      {toBanglaDigits('20.00', lang)} {t('শতক', 'Dec')} • {toBanglaDigits('3', lang)} {t('টি দাগ', 'Plots')}
                    </span>
                  </div>
                  <div className="w-9 h-9 bg-white rounded-md p-0.5 shrink-0 flex items-center justify-center">
                    <QrCode className="w-8 h-8 text-emerald-950" />
                  </div>
                </div>

                <p className="text-[10px] text-emerald-200/90 leading-tight">
                  {t(
                    'সাব-রেজিস্ট্রি, ব্যাংক ঋণ এবং এসি ল্যান্ড অফিসে আপনার জমির মালিকানা তাৎক্ষণিক প্রমাণযোগ্য।',
                    '1-click verified ownership across Sub-Registry, Bank Liens, and AC Land offices.'
                  )}
                </p>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => onNavigate('home')}
                  className="w-full bg-white text-[#006A4E] hover:bg-emerald-50 font-bold text-xs h-7.5 rounded-lg shadow-2xs cursor-pointer"
                >
                  <Layers className="w-3 h-3 mr-1.5" />
                  <span>{t('আমার জমি ও খতিয়ানে যান', 'Go to My Plots & Vault')}</span>
                </Button>
              </CardContent>
            </Card>

            {/* Account Security Card */}
            <Card className="border border-slate-200 shadow-2xs">
              <CardHeader className="p-3 pb-2 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-700" />
                  <CardTitle className="text-xs font-bold text-slate-800">
                    {t('নিরাপত্তা স্থিতি', 'Security Status')}
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-[9px] text-emerald-700 bg-emerald-50 border-emerald-200 font-bold px-1.5 py-0">
                  {t('2FA সক্রিয়', '2FA Active')}
                </Badge>
              </CardHeader>
              <CardContent className="p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600 text-[11px]">
                  <span>{t('পাসওয়ার্ড সর্বশেষ আপডেট', 'Password Last Updated')}</span>
                  <span className="font-mono text-slate-500">{toBanglaDigits('15 দিন আগে', lang)}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('settings')}
                  className="w-full text-xs font-bold text-slate-700 hover:text-emerald-800 hover:bg-emerald-50/50 cursor-pointer h-7.5 rounded-lg"
                >
                  <Settings className="w-3 h-3 mr-1.5 text-slate-500" />
                  <span>{t('নিরাপত্তা সেটিংস পরিবর্তন', 'Manage Security')}</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
