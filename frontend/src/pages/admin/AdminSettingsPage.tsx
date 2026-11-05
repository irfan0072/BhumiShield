import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Shield,
  Sliders,
  Globe,
  Bell,
  Save,
  RotateCcw,
  CheckCircle2,
  Building2,
  PhoneCall,
  Clock,
  KeyRound,
  FileCheck2,
  AlertTriangle,
  Scale,
  QrCode,
  ShieldAlert,
  Database,
  Lock,
  HelpCircle,
  Sparkles,
  BookOpen,
  Compass,
  Calculator,
  MapPin,
  Plus,
  Trash2,
  Eye,
  Palette,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { publicQueryKeys } from '@/components/publicHooks';
import { toBanglaDigits } from '@/theme/tokens';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getFloatingButtons,
  saveFloatingButtons,
  DEFAULT_FLOATING_BUTTONS,
  AVAILABLE_FLOATING_ICONS,
  PRESET_FLOATING_COLORS,
  FloatingActionButtonConfig,
} from '@/lib/floatingButtons';

const renderActionIcon = (iconName: string, cls = 'size-4') => {
  switch (iconName) {
    case 'PhoneCall':
      return <PhoneCall className={cls} />;
    case 'BookOpen':
      return <BookOpen className={cls} />;
    case 'Compass':
      return <Compass className={cls} />;
    case 'HelpCircle':
      return <HelpCircle className={cls} />;
    case 'Sparkles':
      return <Sparkles className={cls} />;
    case 'Calculator':
      return <Calculator className={cls} />;
    case 'QrCode':
      return <QrCode className={cls} />;
    case 'ShieldCheck':
      return <Shield className={cls} />;
    case 'MapPin':
      return <MapPin className={cls} />;
    case 'FileText':
      return <FileCheck2 className={cls} />;
    default:
      return <HelpCircle className={cls} />;
  }
};

export const AdminSettingsPage: React.FC = () => {
  const { lang, t } = useAppUI();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [floatingButtons, setFloatingButtons] = useState<FloatingActionButtonConfig[]>(getFloatingButtons);

  // Helper to update specific floating button field
  const handleFloatingButtonChange = (index: number, key: keyof FloatingActionButtonConfig, val: any) => {
    setFloatingButtons((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: val };
      return updated;
    });
  };

  const handleSaveFloatingButtonsOnly = () => {
    saveFloatingButtons(floatingButtons);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handleResetFloatingButtons = () => {
    setFloatingButtons(DEFAULT_FLOATING_BUTTONS);
    saveFloatingButtons(DEFAULT_FLOATING_BUTTONS);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handleAddFloatingButton = () => {
    const newBtn: FloatingActionButtonConfig = {
      id: `btn_${Date.now()}`,
      isActive: true,
      icon: 'Sparkles',
      bgColor: '#7c3aed',
      labelBn: 'নতুন সেবা',
      labelEn: 'New Action',
      action: 'support_modal',
    };
    setFloatingButtons((prev) => [...prev, newBtn]);
  };

  const handleRemoveFloatingButton = (index: number) => {
    setFloatingButtons((prev) => prev.filter((_, i) => i !== index));
  };

  // Setting values state
  const [settings, setSettings] = useState<Record<string, any>>({
    portal_title_bn: 'ভূমি সুরক্ষা (BhumiShield)',
    portal_title_en: 'BhumiShield — National Land Trust Layer',
    ministry_banner_bn: 'আইন মন্ত্রণালয় (সাব-রেজিস্ট্রি) ও ভূমি মন্ত্রণালয় (এসি ল্যান্ড)-এর ডিজিটাল আন্তঃসংযোগ ট্রাস্ট লেয়ার',
    helpline_number: '১৬১২২ (ভূমি সেবা হটলাইন)',
    office_hours_bn: 'রবিবার – বৃহস্পতিবার, সকাল ৯:০০ – বিকাল ৫:০০',
    govt_logo_url: '/assets/bd-govt-seal.svg',
    ministry_title_bn: 'ভূমি মন্ত্রণালয়',
    ministry_title_en: 'Ministry of Land',
    govt_title_bn: 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার',
    govt_title_en: "PEOPLE'S REPUBLIC OF BANGLADESH",
    rapid_resale_days: '30',
    require_mock_nid_check: true,
    auto_queue_emutation: true,
    public_qr_verification_enabled: true,
    // Extra security & comms configs
    session_timeout_minutes: '60',
    auto_backup_enabled: true,
    citizen_sms_notification: true,
    officer_fraud_alert_email: true,
    watermark_opacity: '85',
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await BhumiApi.getSettings();
      if (res?.settings) {
        setSettings((prev) => ({
          ...prev,
          ...res.settings,
          govt_logo_url: res.settings.govt_logo_url || '/assets/bd-govt-seal.svg',
          ministry_title_bn: res.settings.ministry_title_bn || 'ভূমি মন্ত্রণালয়',
          ministry_title_en: res.settings.ministry_title_en || 'Ministry of Land',
          govt_title_bn: res.settings.govt_title_bn || 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার',
          govt_title_en: res.settings.govt_title_en || "PEOPLE'S REPUBLIC OF BANGLADESH",
          rapid_resale_days: String(res.settings.rapid_resale_days ?? '30'),
          require_mock_nid_check: res.settings.require_mock_nid_check !== false,
          auto_queue_emutation: res.settings.auto_queue_emutation !== false,
          public_qr_verification_enabled: res.settings.public_qr_verification_enabled !== false,
        }));
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      // Format payload for backend PUT /settings
      const payload: Record<string, string> = {
        portal_title_bn: String(settings.portal_title_bn || ''),
        portal_title_en: String(settings.portal_title_en || ''),
        ministry_banner_bn: String(settings.ministry_banner_bn || ''),
        helpline_number: String(settings.helpline_number || ''),
        office_hours_bn: String(settings.office_hours_bn || ''),
        govt_logo_url: String(settings.govt_logo_url || '/assets/bd-govt-seal.svg'),
        ministry_title_bn: String(settings.ministry_title_bn || 'ভূমি মন্ত্রণালয়'),
        ministry_title_en: String(settings.ministry_title_en || 'Ministry of Land'),
        govt_title_bn: String(settings.govt_title_bn || 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার'),
        govt_title_en: String(settings.govt_title_en || "PEOPLE'S REPUBLIC OF BANGLADESH"),
        rapid_resale_days: String(settings.rapid_resale_days || '30'),
        require_mock_nid_check: settings.require_mock_nid_check ? 'true' : 'false',
        auto_queue_emutation: settings.auto_queue_emutation ? 'true' : 'false',
        public_qr_verification_enabled: settings.public_qr_verification_enabled ? 'true' : 'false',
      };
      await BhumiApi.updateSettings(payload);
      // Invalidate public siteSettings query cache so all pages update immediately
      queryClient.invalidateQueries({ queryKey: publicQueryKeys.siteSettings });
      saveFloatingButtons(floatingButtons);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (e) {
      console.error('Failed to save settings:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 p-3 sm:p-4 max-w-7xl mx-auto w-full">
      {saveSuccess && (
        <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900 shadow-xs animate-in fade-in">
          <CheckCircle2 className="size-4 text-emerald-700" />
          <AlertDescription className="text-xs font-semibold flex items-center justify-between w-full">
            <span>{t('সিস্টেম সেটিংস সফলভাবে সেন্ট্রাল ডেটাবেজে সংরক্ষিত হয়েছে।', 'System settings successfully saved and applied to active platform instances.')}</span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-emerald-800 font-bold"
              onClick={() => setSaveSuccess(false)}
            >
              {t('বন্ধ করুন', 'Dismiss')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 2. Settings Tabs Navigation & Action Toolbar */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 pb-1">
          <div className="w-full sm:w-auto overflow-x-auto scrollbar-thin">
            <TabsList className="bg-muted p-1 rounded-lg border border-border h-auto inline-flex flex-nowrap gap-1">
              <TabsTrigger value="general" className="gap-1.5 text-xs font-semibold shrink-0 whitespace-nowrap">
                <Globe className="size-3.5" />
                <span>{t('সাধারণ', 'General')}</span>
              </TabsTrigger>
              <TabsTrigger value="policy" className="gap-1.5 text-xs font-semibold shrink-0 whitespace-nowrap">
                <Scale className="size-3.5" />
                <span>{t('পলিসি ও নিয়ম', 'Policy & Rules')}</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-1.5 text-xs font-semibold shrink-0 whitespace-nowrap">
                <Shield className="size-3.5" />
                <span>{t('নিরাপত্তা ও অডিট', 'Security & Audit')}</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-1.5 text-xs font-semibold shrink-0 whitespace-nowrap">
                <Bell className="size-3.5" />
                <span>{t('নোটিফিকেশন', 'Notifications')}</span>
              </TabsTrigger>
              <TabsTrigger value="floating_actions" className="gap-1.5 text-xs font-semibold shrink-0 whitespace-nowrap">
                <HelpCircle className="size-3.5 text-emerald-700" />
                <span>{t('ফ্লোটিং বাটন ও স্পিড ডায়াল', 'Floating Actions')}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex items-center gap-2 shrink-0 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSettings}
              disabled={loading}
              className="h-8 px-2.5 gap-1.5 text-xs font-semibold shrink-0 cursor-pointer border-border"
            >
              <RotateCcw className="size-3.5" />
              <span>{t('রিফ্রেশ', 'Refresh')}</span>
            </Button>

            <Button
              size="sm"
              onClick={handleSaveAll}
              disabled={saving || loading}
              className="h-8 px-3 gap-1.5 text-xs font-semibold bg-[#006A4E] hover:bg-[#00553e] text-white shrink-0 shadow-2xs cursor-pointer"
            >
              <Save className="size-3.5" />
              <span>{saving ? t('সংরক্ষণ হচ্ছে...', 'Saving...') : t('সংরক্ষণ', 'Save All')}</span>
            </Button>
          </div>
        </div>

        {/* TAB 1: General & Branding */}
        <TabsContent value="general" className="space-y-6 pt-4">
          {/* 1.1 Government Seal & Authority Identity Card */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Shield className="size-4 text-[#006A4E]" />
                    <span>{t('সরকারি লোগো ও কর্তৃপক্ষ সিল', 'Government Logo & Authority Seal')}</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    {t(
                      'হোমপেজ হিরো সেকশন ও পাবলিক পোর্টালে প্রদর্শিত বাংলাদেশ সরকারের অফিসিয়াল লোগো, সিল এবং মন্ত্রণালয় পরিচিতি নিয়ন্ত্রণ করুন।',
                      'Configure official Bangladesh Government seal, ministry identity and seal logo displayed on the public landing hero.'
                    )}
                  </CardDescription>
                </div>
                <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[11px] font-semibold self-start sm:self-auto">
                  {t('সুপার অ্যাডমিন নিয়ন্ত্রণ', 'Super Admin Control')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Live Preview & Quick Presets */}
              <div className="p-4 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50/60 via-slate-50/50 to-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="size-14 rounded-xl bg-white border border-slate-200/90 shadow-2xs p-1.5 flex items-center justify-center shrink-0">
                    <img
                      src={settings.govt_logo_url || '/assets/bd-govt-seal.svg'}
                      alt="Government Logo Preview"
                      className="size-full object-contain drop-shadow-2xs"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/bd-govt-seal.svg';
                      }}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold tracking-wider text-emerald-700 uppercase bg-emerald-100/90 px-2 py-0.5 rounded-full inline-block mb-1">
                      {t('লাইভ হিরো প্রিভিউ', 'Live Hero Preview')}
                    </span>
                    <h4 className="text-sm font-black text-slate-800 leading-tight">
                      {lang === 'bn' ? (settings.ministry_title_bn || 'ভূমি মন্ত্রণালয়') : (settings.ministry_title_en || 'Ministry of Land')}
                    </h4>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {lang === 'bn' ? (settings.govt_title_bn || 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার') : (settings.govt_title_en || "PEOPLE'S REPUBLIC OF BANGLADESH")}
                    </p>
                  </div>
                </div>

                {/* Preset Fast Selectors */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleChange('govt_logo_url', '/assets/bd-govt-seal.svg')}
                    className={`text-xs h-8 gap-1.5 font-bold cursor-pointer ${
                      settings.govt_logo_url === '/assets/bd-govt-seal.svg'
                        ? 'border-[#006A4E] text-[#006A4E] bg-emerald-50/80 ring-1 ring-[#006A4E]'
                        : ''
                    }`}
                  >
                    <span>🇧🇩</span>
                    <span>{t('বাংলাদেশ সিল (ডিফল্ট)', 'BD Govt Seal')}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleChange('govt_logo_url', '/assets/bhumishield-emblem.svg')}
                    className={`text-xs h-8 gap-1.5 font-bold cursor-pointer ${
                      settings.govt_logo_url === '/assets/bhumishield-emblem.svg'
                        ? 'border-[#006A4E] text-[#006A4E] bg-emerald-50/80 ring-1 ring-[#006A4E]'
                        : ''
                    }`}
                  >
                    <span>🛡️</span>
                    <span>{t('ভূমি সুরক্ষা সিল', 'BhumiShield Seal')}</span>
                  </Button>
                </div>
              </div>

              {/* Logo Path or File Upload */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>{t('লোগো ফাইল পাথ বা ইউআরএল', 'Logo File Path or URL')}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">{t('পাথ: /assets/... বা https://...', 'e.g. /assets/... or URL')}</span>
                  </label>
                  <Input
                    value={settings.govt_logo_url || ''}
                    onChange={(e) => handleChange('govt_logo_url', e.target.value)}
                    className="text-xs font-mono"
                    placeholder="/assets/bd-govt-seal.svg"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    {t('কম্পিউটার থেকে নতুন লোগো আপলোড', 'Upload New Logo from Computer')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id="govt-logo-upload"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            alert(t('ফাইলের সাইজ সর্বোচ্চ ২ মেগাবাইট হতে পারবে।', 'File size must be under 2MB.'));
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === 'string') {
                              handleChange('govt_logo_url', reader.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <label
                      htmlFor="govt-logo-upload"
                      className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                    >
                      <Upload className="size-3.5 text-emerald-600" />
                      <span>{t('ফাইল নির্বাচন করুন (PNG/SVG)', 'Choose Image (PNG/SVG)')}</span>
                    </label>
                    {settings.govt_logo_url && settings.govt_logo_url !== '/assets/bd-govt-seal.svg' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleChange('govt_logo_url', '/assets/bd-govt-seal.svg')}
                        className="text-xs text-rose-600 hover:text-rose-700 h-9 cursor-pointer"
                      >
                        {t('রিসেট', 'Reset')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Ministry and Government titles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-border/60">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-foreground">
                    {t('মন্ত্রণালয়ের নাম (বাংলা)', 'Ministry Name (Bangla)')}
                  </label>
                  <Input
                    value={settings.ministry_title_bn || ''}
                    onChange={(e) => handleChange('ministry_title_bn', e.target.value)}
                    className="text-xs h-8"
                    placeholder="ভূমি মন্ত্রণালয়"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-foreground">
                    {t('মন্ত্রণালয়ের নাম (ইংরেজি)', 'Ministry Name (English)')}
                  </label>
                  <Input
                    value={settings.ministry_title_en || ''}
                    onChange={(e) => handleChange('ministry_title_en', e.target.value)}
                    className="text-xs h-8"
                    placeholder="Ministry of Land"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-foreground">
                    {t('সরকারের নাম (বাংলা)', 'Government Title (Bangla)')}
                  </label>
                  <Input
                    value={settings.govt_title_bn || ''}
                    onChange={(e) => handleChange('govt_title_bn', e.target.value)}
                    className="text-xs h-8"
                    placeholder="গণপ্রজাতন্ত্রী বাংলাদেশ সরকার"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-foreground">
                    {t('সরকারের নাম (ইংরেজি)', 'Government Title (English)')}
                  </label>
                  <Input
                    value={settings.govt_title_en || ''}
                    onChange={(e) => handleChange('govt_title_en', e.target.value)}
                    className="text-xs h-8"
                    placeholder="PEOPLE'S REPUBLIC OF BANGLADESH"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 1.2 Portal Identity */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Globe className="size-4 text-emerald-700" />
                <span>{t('পোর্টাল পরিচিতি', 'Portal Identity')}</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t('পোর্টালের শিরোনাম ও হটলাইন নম্বর।', 'Portal titles, helpline number and timing.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    {t('বাংলা শিরোনাম', 'Title (Bangla)')}
                  </label>
                  <Input
                    value={settings.portal_title_bn || ''}
                    onChange={(e) => handleChange('portal_title_bn', e.target.value)}
                    className="text-xs"
                    placeholder="ভূমি সুরক্ষা (BhumiShield)"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    {t('ইংরেজি শিরোনাম', 'Title (English)')}
                  </label>
                  <Input
                    value={settings.portal_title_en || ''}
                    onChange={(e) => handleChange('portal_title_en', e.target.value)}
                    className="text-xs"
                    placeholder="BhumiShield — National Land Trust Layer"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  {t('ব্যানার বার্তা', 'Banner Message')}
                </label>
                <Textarea
                  value={settings.ministry_banner_bn || ''}
                  onChange={(e) => handleChange('ministry_banner_bn', e.target.value)}
                  className="text-xs min-h-[60px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <PhoneCall className="size-3.5 text-emerald-700" />
                    <span>{t('হটলাইন নম্বর', 'Helpline Number')}</span>
                  </label>
                  <Input
                    value={settings.helpline_number || ''}
                    onChange={(e) => handleChange('helpline_number', e.target.value)}
                    className="text-xs font-mono"
                    placeholder="১৬১২২"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Clock className="size-3.5 text-emerald-700" />
                    <span>{t('অফিসের সময়সূচি', 'Office Hours')}</span>
                  </label>
                  <Input
                    value={settings.office_hours_bn || ''}
                    onChange={(e) => handleChange('office_hours_bn', e.target.value)}
                    className="text-xs"
                    placeholder="রবিবার – বৃহস্পতিবার, সকাল ৯:০০ – বিকাল ৫:০০"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Registry & Fraud Policy */}
        <TabsContent value="policy" className="space-y-6 pt-4">
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldAlert className="size-4 text-emerald-700" />
                <span>{t('জালিয়াতি প্রতিরোধ পলিসি', 'Fraud Prevention Policy')}</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t('রেজিস্ট্রেশন ও নামজারি যাচাই নীতি।', 'Rules for deed registration and mutation checks.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Policy 1: Rapid Resale Window */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border border-border/70 bg-card gap-4">
                <div className="space-y-0.5 max-w-xl">
                  <div className="text-xs font-bold text-foreground flex items-center gap-2">
                    <AlertTriangle className="size-3.5 text-amber-600" />
                    <span>{t('দ্রুত হাতবদল সতর্কতার সময়সীমা', 'Rapid Resale Warning Threshold')}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {t(
                      'নির্দিষ্ট দিনের মধ্যে পুনরায় বিক্রি হলে সতর্কতা দেখাবে।',
                      'Days threshold triggering high-risk rapid resale warning on deed registration.'
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={settings.rapid_resale_days || '30'}
                    onChange={(e) => handleChange('rapid_resale_days', e.target.value)}
                    className="w-20 text-xs font-mono font-bold text-center h-8"
                  />
                  <span className="text-xs text-muted-foreground">{t('দিন', 'days')}</span>
                </div>
              </div>

              {/* Policy 2: Enforce NID Check */}
              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/70 bg-card gap-4">
                <div className="space-y-0.5 max-w-xl">
                  <div className="text-xs font-bold text-foreground flex items-center gap-2">
                    <KeyRound className="size-3.5 text-emerald-600" />
                    <span>{t('এনআইডি ও বায়োমেট্রিক যাচাই বাধ্যতামূলক', 'Mandatory NID & Biometric Verification')}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {t(
                      'দলিল নিবন্ধনের পূর্বে এনআইডি যাচাই নিশ্চিত করা হবে।',
                      'Enforce NID and identity match before deed creation.'
                    )}
                  </p>
                </div>
                <Switch
                  checked={!!settings.require_mock_nid_check}
                  onCheckedChange={(checked) => handleChange('require_mock_nid_check', checked)}
                />
              </div>

              {/* Policy 3: Auto Queue e-Mutation */}
              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/70 bg-card gap-4">
                <div className="space-y-0.5 max-w-xl">
                  <div className="text-xs font-bold text-foreground flex items-center gap-2">
                    <FileCheck2 className="size-3.5 text-blue-600" />
                    <span>{t('দলিল নিবন্ধনে স্বয়ংক্রিয় ই-নামজারি', 'Automatic e-Mutation on Registration')}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {t(
                      'দলিল নিবন্ধিত হলে সরাসরি নামজারি আবেদন তৈরি হবে।',
                      'Automatically create an e-mutation case immediately upon deed registration.'
                    )}
                  </p>
                </div>
                <Switch
                  checked={!!settings.auto_queue_emutation}
                  onCheckedChange={(checked) => handleChange('auto_queue_emutation', checked)}
                />
              </div>

              {/* Policy 4: Public QR Verification Gate */}
              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/70 bg-card gap-4">
                <div className="space-y-0.5 max-w-xl">
                  <div className="text-xs font-bold text-foreground flex items-center gap-2">
                    <QrCode className="size-3.5 text-teal-600" />
                    <span>{t('লগইন ছাড়া কিউআর কোড যাচাই', 'Public QR Verification')}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {t(
                      'যে কোনো স্মার্টফোন দিয়ে দলিলের কিউআর কোড স্ক্যান করে যাচাই করা যাবে।',
                      'Allow public users to scan and verify genuine registered deeds without logging in.'
                    )}
                  </p>
                </div>
                <Switch
                  checked={!!settings.public_qr_verification_enabled}
                  onCheckedChange={(checked) => handleChange('public_qr_verification_enabled', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Cryptographic & Audit Parameters */}
        <TabsContent value="security" className="space-y-6 pt-4">
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Lock className="size-4 text-emerald-700" />
                <span>{t('নিরাপত্তা ও অডিট প্যারামিটার', 'Security & Audit Parameters')}</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t('হ্যাশ প্রটোকল, সিল ও ডাটাবেজ ব্যাকআপ।', 'Hashing protocols, seals, and backups.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-lg border bg-muted/40 space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">{t('হ্যাশ অ্যালগরিদম', 'Hashing Protocol')}</span>
                  <div className="text-sm font-mono font-bold text-foreground">SHA-256 Merkle DAG</div>
                  <p className="text-[10px] text-muted-foreground">{t('প্রতিটি দলিল আগের ব্লকের সাথে যুক্ত', 'Each transaction is chained to previous block hash')}</p>
                </div>

                <div className="p-3.5 rounded-lg border bg-muted/40 space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">{t('ডিজিটাল স্বাক্ষর', 'Digital Signature')}</span>
                  <div className="text-sm font-mono font-bold text-foreground">Ed25519 (Edwards Curve)</div>
                  <p className="text-[10px] text-muted-foreground">{t('সাব-রেজিস্ট্রারের ডিজিটাল সিল ও এনক্রিপশন', '256-bit asymmetric signature verification')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">{t('সেশন টাইমআউট (মিনিট)', 'Session Timeout (Minutes)')}</label>
                  <Input
                    type="number"
                    value={settings.session_timeout_minutes || '60'}
                    onChange={(e) => handleChange('session_timeout_minutes', e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">{t('জলছাপের স্বচ্ছতা (%)', 'Watermark Opacity (%)')}</label>
                  <Input
                    type="number"
                    min="10"
                    max="100"
                    value={settings.watermark_opacity || '85'}
                    onChange={(e) => handleChange('watermark_opacity', e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/70 bg-card gap-4 pt-2">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-foreground">{t('দৈনিক স্বয়ংক্রিয় ব্যাকআপ', 'Daily Automated Backup')}</div>
                  <p className="text-[11px] text-muted-foreground">{t('প্রতিদিন মধ্যরাতে স্বয়ংক্রিয় ব্যাকআপ সংরক্ষণ।', 'Store daily cryptographic ledger state backup at midnight.')}</p>
                </div>
                <Switch
                  checked={!!settings.auto_backup_enabled}
                  onCheckedChange={(checked) => handleChange('auto_backup_enabled', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: Notifications & Alerts */}
        <TabsContent value="notifications" className="space-y-6 pt-4">
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Bell className="size-4 text-emerald-700" />
                <span>{t('নোটিফিকেশন পলিসি', 'Notification Policy')}</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t('মালিকানা পরিবর্তন ও সতর্কবার্তা প্রেরণের নিয়ম।', 'Rules for SMS and email alerts.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/70 bg-card gap-4">
                <div className="space-y-0.5 max-w-xl">
                  <div className="text-xs font-bold text-foreground">{t('মালিকের মোবাইলে এসএমএস সতর্কতা', 'Owner SMS Alerts')}</div>
                  <p className="text-[11px] text-muted-foreground">
                    {t('দলিল বা নামজারি হলে মালিকের নম্বরে স্বয়ংক্রিয় এসএমএস যাবে।', 'Send real-time SMS to owner on any transaction attempt.')}
                  </p>
                </div>
                <Switch
                  checked={!!settings.citizen_sms_notification}
                  onCheckedChange={(checked) => handleChange('citizen_sms_notification', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/70 bg-card gap-4">
                <div className="space-y-0.5 max-w-xl">
                  <div className="text-xs font-bold text-foreground">{t('কর্মকর্তাদের ইমেইল সতর্কতা', 'Officer Email Alerts')}</div>
                  <p className="text-[11px] text-muted-foreground">
                    {t('অসঙ্গতি শনাক্ত হলে সংশ্লিষ্ট কর্মকর্তাদের নিকট ইমেইল সতর্কতা যাবে।', 'Dispatch high-priority email alert to jurisdictional officers.')}
                  </p>
                </div>
                <Switch
                  checked={!!settings.officer_fraud_alert_email}
                  onCheckedChange={(checked) => handleChange('officer_fraud_alert_email', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: Floating Actions & Speed Dial */}
        <TabsContent value="floating_actions" className="space-y-6 pt-4">
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <HelpCircle className="size-4 text-emerald-700" />
                    <span>{t('ফ্লোটিং বাটন ও স্পিড ডায়াল কনফিগারেশন', 'Floating Speed Dial Configuration')}</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    {t(
                      'স্ক্রিনের নিচের ডানদিকের গোল "?" বাটনে চাপলে যে অ্যাকশন বাটনগুলো উপরে বিস্তৃত হবে সেগুলোর আইকন, রঙ, স্ট্যাটাস ও হোভার টেক্সট নির্ধারণ করুন।',
                      'Configure the speed dial buttons that expand upward when clicking the floating "?" button.'
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetFloatingButtons}
                    className="h-8 gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <RotateCcw className="size-3" />
                    <span>{t('ডিফল্ট রিস্টোর', 'Reset Default')}</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddFloatingButton}
                    variant="secondary"
                    className="h-8 gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>{t('নতুন বাটন যোগ', 'Add Button')}</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveFloatingButtonsOnly}
                    className="h-8 gap-1.5 text-xs font-semibold bg-[#006A4E] hover:bg-[#00553e] text-white cursor-pointer"
                  >
                    <Save className="size-3.5" />
                    <span>{t('সংরক্ষণ করুন', 'Save')}</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Live Preview Box */}
              <div className="p-4 rounded-xl border border-dashed border-emerald-300/80 bg-emerald-50/40">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <Eye className="size-3.5 text-emerald-700" />
                    {t('লাইভ প্রিভিউ (বিজ্ঞপ্তি ও হোভার প্রদর্শন)', 'Live Preview (Expanded Speed Dial)')}
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-white text-emerald-800 border-emerald-300 font-mono">
                    {floatingButtons.filter((b) => b.isActive).length} {t('টি সক্রিয় বাটন', 'active buttons')}
                  </Badge>
                </div>

                <div className="flex flex-col items-end gap-2.5 py-2">
                  {floatingButtons.filter((b) => b.isActive).map((b) => (
                    <div key={b.id} className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold shadow-xs">
                        {lang === 'bn' ? b.labelBn : b.labelEn}
                      </span>
                      <div
                        style={{ backgroundColor: b.bgColor }}
                        className="w-10 h-10 rounded-full text-white flex items-center justify-center shadow-md border-2 border-white/50"
                      >
                        {renderActionIcon(b.icon, 'size-4')}
                      </div>
                    </div>
                  ))}
                  <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg border-2 border-white/60">
                    <span className="text-sm font-black">✕</span>
                  </div>
                </div>
              </div>

              {/* Button Configurations List */}
              <div className="space-y-4">
                {floatingButtons.map((btn, idx) => (
                  <div
                    key={btn.id}
                    className="p-4 rounded-xl border border-border bg-card/60 space-y-4 shadow-2xs transition-all hover:border-emerald-300"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/60">
                      <div className="flex items-center gap-2.5">
                        <div
                          style={{ backgroundColor: btn.bgColor }}
                          className="w-8 h-8 rounded-full text-white flex items-center justify-center shadow-xs shrink-0"
                        >
                          {renderActionIcon(btn.icon, 'size-4')}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground flex items-center gap-2">
                            <span>{btn.labelBn || btn.id}</span>
                            <Badge
                              variant="outline"
                              className={
                                btn.isActive
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]'
                                  : 'bg-muted text-muted-foreground text-[10px]'
                              }
                            >
                              {btn.isActive ? t('সক্রিয়', 'Active') : t('নিষ্ক্রিয়', 'Disabled')}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">ID: {btn.id}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-muted-foreground">
                            {btn.isActive ? t('সক্রিয়', 'Active') : t('বন্ধ', 'Off')}
                          </label>
                          <Switch
                            checked={btn.isActive}
                            onCheckedChange={(checked) => handleFloatingButtonChange(idx, 'isActive', checked)}
                          />
                        </div>
                        {floatingButtons.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFloatingButton(idx)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                            title={t('মুছে ফেলুন', 'Remove')}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Bangla Label */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground">
                          {t('হোভার টেক্সট (বাংলা)', 'Hover Label (Bangla)')}
                        </label>
                        <Input
                          value={btn.labelBn}
                          onChange={(e) => handleFloatingButtonChange(idx, 'labelBn', e.target.value)}
                          placeholder="যেমন: সহায়তা ও ১৬১২২ হটলাইন"
                          className="text-xs"
                        />
                      </div>

                      {/* English Label */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground">
                          {t('হোভার টেক্সট (ইংরেজি)', 'Hover Label (English)')}
                        </label>
                        <Input
                          value={btn.labelEn}
                          onChange={(e) => handleFloatingButtonChange(idx, 'labelEn', e.target.value)}
                          placeholder="e.g. Support & 16122 Helpline"
                          className="text-xs"
                        />
                      </div>

                      {/* Icon Selection */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground">
                          {t('আইকন নির্বাচন', 'Select Icon')}
                        </label>
                        <Select
                          value={btn.icon}
                          onValueChange={(val) => handleFloatingButtonChange(idx, 'icon', val)}
                        >
                          <SelectTrigger className="text-xs h-9">
                            <SelectValue placeholder="আইকন নির্বাচন করুন" />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_FLOATING_ICONS.map((ico) => (
                              <SelectItem key={ico.key} value={ico.key} className="text-xs">
                                <div className="flex items-center gap-2">
                                  {renderActionIcon(ico.key, 'size-3.5')}
                                  <span>{ico.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Action Selection */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground">
                          {t('ক্লিক অ্যাকশন', 'Click Action')}
                        </label>
                        <Select
                          value={btn.action}
                          onValueChange={(val: any) => handleFloatingButtonChange(idx, 'action', val)}
                        >
                          <SelectTrigger className="text-xs h-9">
                            <SelectValue placeholder="অ্যাকশন নির্বাচন করুন" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="support_modal" className="text-xs">
                              ১৬১২২ হটলাইন ও সাহায্য ডায়ালগ (Support Modal)
                            </SelectItem>
                            <SelectItem value="product_tour" className="text-xs">
                              ইন্টারেক্টিভ গাইড ও ট্যুর (Citizen Tour)
                            </SelectItem>
                            <SelectItem value="faraiz_calculator" className="text-xs">
                              ফারায়েজ উত্তরাধিকার ক্যালকুলেটর (Faraiz Calculator)
                            </SelectItem>
                            <SelectItem value="verify_qr" className="text-xs">
                              কিউআর দলিল ও নামজারি ভেরিফিকেশন (QR Verification)
                            </SelectItem>
                            <SelectItem value="navigate_map" className="text-xs">
                              মৌজা ও স্যাটেলাইট ম্যাপ (Land Map)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Color Customization */}
                    <div className="space-y-2 pt-1">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Palette className="size-3.5 text-muted-foreground" />
                        <span>{t('ব্যাকগ্রাউন্ড কালার নির্বাচন', 'Background Color')}</span>
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        {PRESET_FLOATING_COLORS.map((clr) => (
                          <button
                            key={clr.hex}
                            type="button"
                            onClick={() => handleFloatingButtonChange(idx, 'bgColor', clr.hex)}
                            style={{ backgroundColor: clr.hex }}
                            className={`w-7 h-7 rounded-full transition-all cursor-pointer border-2 ${
                              btn.bgColor.toLowerCase() === clr.hex.toLowerCase()
                                ? 'border-slate-900 scale-110 shadow-sm ring-2 ring-emerald-500/40'
                                : 'border-white hover:scale-105'
                            }`}
                            title={clr.name}
                          />
                        ))}
                        <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-border">
                          <input
                            type="color"
                            value={btn.bgColor}
                            onChange={(e) => handleFloatingButtonChange(idx, 'bgColor', e.target.value)}
                            className="w-7 h-7 rounded-lg border border-border p-0.5 cursor-pointer bg-white"
                            title="কাস্টম রঙ নির্বাচন করুন"
                          />
                          <Input
                            value={btn.bgColor}
                            onChange={(e) => handleFloatingButtonChange(idx, 'bgColor', e.target.value)}
                            className="w-24 text-xs font-mono h-8"
                            placeholder="#006A4E"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
