import React, { useState } from 'react';
import { useAppUI } from '../i18n';
import { toBanglaDigits } from '../theme/tokens';
import {
  Search,
  MapPin,
  QrCode,
  Compass,
  ArrowRight,
  CheckCircle2,
  PhoneCall,
  FileText,
  FileCheck2,
  ShieldCheck,
  Building2,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Shield,
  Fingerprint,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  useLandingStats,
  useLocationsQuery,
  useSiteSettingsQuery,
} from '../components/publicHooks';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const LandingPage: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { lang, t } = useAppUI();

  // Dynamic API queries
  const statsQuery = useLandingStats();
  const kpis = statsQuery.data?.kpis || statsQuery.data || {};
  const locationsQuery = useLocationsQuery();
  const settingsQuery = useSiteSettingsQuery();

  // Dynamic Quick Links from Admin Settings
  const rawQuickLinks = settingsQuery.data?.settings?.quick_links_menu || settingsQuery.data?.map?.quick_links_menu;
  const quickLinks = React.useMemo(() => {
    let list: any[] = [];
    if (Array.isArray(rawQuickLinks)) {
      list = rawQuickLinks;
    } else if (typeof rawQuickLinks === 'string') {
      try {
        const parsed = JSON.parse(rawQuickLinks);
        if (Array.isArray(parsed)) list = parsed;
      } catch {}
    }

    if (list.length > 0) {
      return list.filter((l: any) => l.is_active !== false);
    }

    return [
      { id: 'check', label_bn: 'খতিয়ান ও রেকর্ড', label_en: 'Khatian Records', target: 'check', badge_bn: 'যাচাই', badge_en: 'Verified' },
      { id: 'qr', label_bn: 'দলিল যাচাই', label_en: 'Verify Deed', target: 'qr', badge_bn: 'কিউআর', badge_en: 'QR' },
      { id: 'map', label_bn: 'মৌজা নকশা', label_en: 'Mouza Map', target: 'map', badge_bn: 'স্যাটেলাইট', badge_en: 'Satellite' },
      { id: 'home', label_bn: 'নাগরিক ভল্ট', label_en: 'Citizen Vault', target: 'home', badge_bn: 'সুরক্ষিত', badge_en: 'Protected' },
      { id: 'sale', label_bn: 'পাবলিক সেবা', label_en: 'Public Portal', target: 'sale', badge_bn: 'সার্ভিস', badge_en: 'Services' },
      { id: 'help', label_bn: 'সহায়তা ১৬১২২', label_en: 'Helpline 16122', target: 'help', badge_bn: 'টোল ফ্রি', badge_en: 'Toll-Free' },
    ];
  }, [rawQuickLinks]);

  // Dynamic Government Seal & Authority info from Admin Settings
  const govtLogoUrl = settingsQuery.data?.settings?.govt_logo_url || settingsQuery.data?.map?.govt_logo_url || '/assets/bd-govt-seal.svg';
  const ministryTitle = lang === 'bn'
    ? (settingsQuery.data?.settings?.ministry_title_bn || settingsQuery.data?.map?.ministry_title_bn || 'ভূমি মন্ত্রণালয়')
    : (settingsQuery.data?.settings?.ministry_title_en || settingsQuery.data?.map?.ministry_title_en || 'Ministry of Land');
  const govtTitle = lang === 'bn'
    ? (settingsQuery.data?.settings?.govt_title_bn || settingsQuery.data?.map?.govt_title_bn || 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার')
    : (settingsQuery.data?.settings?.govt_title_en || settingsQuery.data?.map?.govt_title_en || "PEOPLE'S REPUBLIC OF BANGLADESH");

  // Hero Search Console State
  const [searchTab, setSearchTab] = useState<'check' | 'qr' | 'map'>('check');
  const [dagInput, setDagInput] = useState('101');
  const [deedInput, setDeedInput] = useState('DL-2026-1001');
  const [mouzaSelect, setMouzaSelect] = useState('1');

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTab === 'check') {
      onNavigate(`check?dag=${encodeURIComponent(dagInput.trim())}`);
    } else if (searchTab === 'qr') {
      onNavigate(`qr?deed_no=${encodeURIComponent(deedInput.trim())}`);
    } else {
      onNavigate(`map?location_id=${encodeURIComponent(mouzaSelect)}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/40 text-slate-900 pb-16">
      
      {/* 1. HERO SECTION: Full-Width, Compact Responsive Height, No-Human Tech Art */}
      <section className="w-full relative overflow-hidden bg-white border-b border-slate-200/90 py-6 sm:py-8 lg:py-9 flex items-center">
        {/* Full-bleed Right Graphic (Pure Tech, Drone, 3D Cadastral HUD, Lush Landscape - No Humans) */}
        <div className="absolute right-0 top-0 bottom-0 w-full lg:w-[50%] xl:w-[48%] hidden sm:block pointer-events-none select-none z-0 overflow-hidden">
          <img
            src="/assets/landtech-hackathon-hero.png"
            alt="Smart Landtech Bangladesh Platform"
            className="w-full h-full object-cover object-center"
          />
          {/* Subtle gradient blend to the left */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent lg:from-white lg:via-white/45 lg:to-transparent" />
        </div>

        {/* Content Container (Constrained width inside full-width section) */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 relative z-10">
          <div className="max-w-xl lg:max-w-2xl space-y-3.5 sm:space-y-4">
            
            {/* Top Authority Header: Ministry Seal & Government ID (Configurable from Super Admin) */}
            <div className="flex items-center gap-2.5">
              <img
                src={govtLogoUrl}
                alt="Government of Bangladesh Seal"
                className="w-10 h-10 sm:w-11 sm:h-11 object-contain shrink-0 drop-shadow-xs"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/bd-govt-seal.svg';
                }}
              />
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight leading-tight">
                  {ministryTitle}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {govtTitle}
                </p>
              </div>
            </div>

            {/* Main Headline & Subtitle - Comprehensive Digital Land Services */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-4xl lg:text-[44px] font-black tracking-tight text-[#006A4E] uppercase leading-[1.08]">
                {lang === 'bn' ? (
                  <>
                    স্মার্ট ডিজিটাল ভূমিসেবা & সমন্বিত
                    <br />
                    <span className="text-[#00553e]">ভূমি রেকর্ড</span>
                  </>
                ) : (
                  <>
                    SMART DIGITAL LAND SERVICES & INTEGRATED
                    <br />
                    <span className="text-[#00553e]">LAND RECORDS</span>
                  </>
                )}
              </h1>
              <p className="text-sm sm:text-base font-bold text-slate-700 tracking-tight leading-relaxed">
                {lang === 'bn' ? (
                  <>
                    খতিয়ান, ই-নামজারি, মৌজা নকশা থেকে দলিল ও নাগরিক স্বত্ব — বাংলাদেশের
                    <br />
                    সকল ডিজিটাল ভূমিসেবা এক ঠিকানায়
                  </>
                ) : (
                  <>
                    Khatian, e-Mutation, Cadastral Maps & Deed Records — All Bangladesh
                    <br />
                    Government Land Services in One Unified Platform
                  </>
                )}
              </p>
            </div>

            {/* 3 Citizen Service Action Pills (Direct Citizen Actions) */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSearchTab('check')}
                className={`h-9 px-4 rounded-full text-[11px] sm:text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                  searchTab === 'check'
                    ? 'bg-[#006A4E] text-white ring-2 ring-[#006A4E]/30 font-black'
                    : 'bg-[#006A4E]/90 hover:bg-[#006A4E] text-white'
                }`}
              >
                <Search className="w-3 h-3 stroke-[2.5]" />
                <span className="tracking-wide">
                  {t('খতিয়ান ও দাগ অনুসন্ধান →', 'SEARCH KHATIAN & PLOT →')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSearchTab('qr')}
                className={`h-9 px-4 rounded-full text-[11px] sm:text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                  searchTab === 'qr'
                    ? 'bg-[#006A4E] text-white ring-2 ring-[#006A4E]/30 font-black'
                    : 'bg-[#006A4E]/90 hover:bg-[#006A4E] text-white'
                }`}
              >
                <FileText className="w-3 h-3 stroke-[2.5]" />
                <span className="tracking-wide">
                  {t('রেজিস্ট্রিকৃত দলিল যাচাই →', 'VERIFY REGISTERED DEED →')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSearchTab('map')}
                className={`h-9 px-4 rounded-full text-[11px] sm:text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                  searchTab === 'map'
                    ? 'bg-[#006A4E] text-white ring-2 ring-[#006A4E]/30 font-black'
                    : 'bg-[#006A4E]/90 hover:bg-[#006A4E] text-white'
                }`}
              >
                <Compass className="w-3 h-3 stroke-[2.5]" />
                <span className="tracking-wide">
                  {t('ডিজিটাল মৌজা নকশা →', 'DIGITAL MOUZA MAP →')}
                </span>
              </button>
            </div>

            {/* Compact Live Interactive Verification Console */}
            <div className="pt-0.5 max-w-lg">
              <div className="bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/90 p-3 shadow-sm">
                {searchTab === 'check' && (
                  <form onSubmit={handleHeroSearch} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-[#006A4E]" />
                        <span>{t('জমির দাগ বা খতিয়ান নম্বর দিয়ে তাৎক্ষণিক রেকর্ড অনুসন্ধান', 'Instant Record Search by Plot or Khatian No')}</span>
                      </Label>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={dagInput}
                        onChange={(e) => setDagInput(e.target.value)}
                        placeholder={t('যেমন: দাগ ১০১ বা খতিয়ান ৪১০১', 'e.g. Plot 101 or Khatian 4101')}
                        className="h-9 text-xs font-bold text-slate-800 rounded-lg border-slate-300 focus:border-[#006A4E]"
                      />
                      <Button
                        type="submit"
                        className="h-9 px-4 bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs rounded-lg shrink-0 shadow-2xs cursor-pointer"
                      >
                        <Search className="w-3 h-3 mr-1" />
                        <span>{t('অনুসন্ধান করুন', 'Search Record')}</span>
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                      <span className="font-medium">{t('টেস্ট:', 'Test:')}</span>
                      <button
                        type="button"
                        onClick={() => setDagInput('101')}
                        className="px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-[#006A4E] border border-emerald-200 hover:bg-emerald-100 cursor-pointer text-[10px]"
                      >
                        🟢 {t('দাগ ১০১ (রেকর্ড হালনাগাদ)', 'Dag 101 (Updated Title)')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDagInput('102')}
                        className="px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 cursor-pointer text-[10px]"
                      >
                        🟡 {t('দাগ ১০২ (ব্যাংক দায়বদ্ধ / ঋণ)', 'Dag 102 (Bank Lien)')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDagInput('103')}
                        className="px-2 py-0.5 rounded-full font-bold bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 cursor-pointer text-[10px]"
                      >
                        🔴 {t('দাগ ১০৩ (আপিল বা বিরোধাধীন)', 'Dag 103 (Court Dispute)')}
                      </button>
                    </div>
                  </form>
                )}

                {searchTab === 'qr' && (
                  <form onSubmit={handleHeroSearch} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-[#006A4E]" />
                        <span>{t('দলিল নম্বর দিয়ে ডিজিটাল সিল ও কিউআর যাচাই', 'Verify Registered Deed, Digital Seal & QR Code')}</span>
                      </Label>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={deedInput}
                        onChange={(e) => setDeedInput(e.target.value)}
                        placeholder={t('যেমন: DL-2026-1001', 'e.g. DL-2026-1001')}
                        className="h-9 font-mono text-xs font-bold text-slate-800 rounded-lg border-slate-300 focus:border-[#006A4E]"
                      />
                      <Button
                        type="submit"
                        className="h-9 px-4 bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs rounded-lg shrink-0 shadow-2xs cursor-pointer"
                      >
                        <QrCode className="w-3 h-3 mr-1" />
                        <span>{t('দলিল পরীক্ষা', 'Check Deed')}</span>
                      </Button>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <span className="font-medium">{t('নমুনা:', 'Sample:')}</span>
                      <button
                        type="button"
                        onClick={() => setDeedInput('DL-2026-1001')}
                        className="px-2 py-0.5 rounded-full font-mono bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 cursor-pointer font-bold text-[10px]"
                      >
                        DL-2026-1001 (বৈধ সাব-রেজিস্ট্রি দলিল)
                      </button>
                    </div>
                  </form>
                )}

                {searchTab === 'map' && (
                  <form onSubmit={handleHeroSearch} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                        <Compass className="w-3 h-3 text-[#006A4E]" />
                        <span>{t('মৌজা ও জে.এল. নম্বর দিয়ে ডিজিটাল ক্যাডাস্ট্রাল নকশা', 'Digital Cadastral Survey Map by Mouza & JL No')}</span>
                      </Label>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Select value={mouzaSelect} onValueChange={setMouzaSelect}>
                          <SelectTrigger className="h-9 text-xs rounded-lg border-slate-300 font-semibold bg-white">
                            <SelectValue placeholder={t('মৌজা নির্বাচন করুন', 'Select Mouza')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {(locationsQuery.data || []).map((loc: any) => (
                                <SelectItem key={loc.id} value={String(loc.id)}>
                                  {loc.mouza_bn} ({t('জেএল', 'JL')} {toBanglaDigits(loc.jl_no || '১', lang)}) - {loc.upazila_bn}, {loc.district_bn}
                                </SelectItem>
                              ))}
                              {(!locationsQuery.data || locationsQuery.data.length === 0) && (
                                <>
                                  <SelectItem value="1">ধামরাই (জেএল ৪১০১) - ঢাকা</SelectItem>
                                  <SelectItem value="2">সাভার (জেএল ৫০২) - ঢাকা</SelectItem>
                                  <SelectItem value="3">মিরপুর (জেএল ১০৫) - ঢাকা</SelectItem>
                                </>
                              )}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="submit"
                        className="h-9 px-4 bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs rounded-lg shrink-0 shadow-2xs cursor-pointer"
                      >
                        <Compass className="w-3 h-3 mr-1" />
                        <span>{t('ম্যাপে দেখুন', 'Open Map')}</span>
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. SIMPLE 3-STEP GUIDE: How It Works */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t('ভূমিসেবা গ্রহণের সহজ ৩টি ধাপ', '3 Simple Steps to Access Land Services')}
          </h2>
          <p className="text-sm text-slate-600">
            {t(
              'ঘরে বসেই যেকোনো ভূমি রেকর্ড অনুসন্ধান, আবেদন বা সুরক্ষা সেবা নিন কোনো মধ্যস্বত্বভোগী ছাড়াই।',
              'Access any land record, online application, or ownership protection from home without middlemen.'
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <Card className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#006A4E] font-black text-lg">
              ১
            </div>
            <h3 className="text-lg font-black text-slate-900">
              {t('১. দাগ, খতিয়ান বা দলিল দিয়ে খুঁজুন', '1. Search Plot, Khatian or Deed')}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t(
                'আপনার জমির দাগ, খতিয়ান অথবা দলিলের নম্বর দিন। সরকারি সার্ভার থেকে তাৎক্ষণিক মালিকানা, জমির শ্রেণি ও রেকর্ড প্রদর্শিত হবে।',
                'Enter your plot, khatian, or deed number to view authenticated government records, ownership history, and acreage immediately.'
              )}
            </p>
          </Card>

          {/* Step 2 */}
          <Card className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-black text-lg">
              ২
            </div>
            <h3 className="text-lg font-black text-slate-900">
              {t('২. ১-ক্লিকে সেবা গ্রহণ ও ট্র্যাকিং', '2. 1-Click Application & Live Tracking')}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t(
                'ডিজিটাল পর্চা ডাউনলোড, ই-নামজারি আবেদন কিংবা দলিলের কিউআর কোড যাচাই করুন। মোবাইল ট্র্যাকিং নম্বরের মাধ্যমে প্রতিটি ধাপের লাইভ অগ্রগতি জানুন।',
                'Download certified khatians, apply for e-mutation, or verify deeds online with live tracking from application to approval.'
              )}
            </p>
          </Card>

          {/* Step 3 */}
          <Card className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-black text-lg">
              ৩
            </div>
            <h3 className="text-lg font-black text-slate-900">
              {t('৩. ডিজিটাল প্রত্যয়ন ও বিক্রয় লক সুরক্ষা', '3. Digital Certificate & Title Security')}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t(
                'সরকারি ডিজিটাল সিলযুক্ত নথিপত্র সংগ্রহ করুন এবং অননুমোদিত হস্তান্তর ও জালিয়াতি রোধে নিজের জমিতে বিক্রয় লক সক্রিয় রাখুন।',
                'Receive tamper-proof documents with QR codes and activate sale lock protection to keep your land 100% secure.'
              )}
            </p>
          </Card>
        </div>
      </section>

      {/* 3. CORE CITIZEN SERVICES: Clean Visual Cards With REAL Generated Images */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t('নাগরিকদের জন্য প্রধান ভূমিসেবা সমূহ', 'Core Land Services for Citizens')}
          </h2>
          <p className="text-sm text-slate-600">
            {t(
              'আপনার কাঙ্ক্ষিত সেবাটি বেছে নিন এবং সরাসরি কার্যক্রম শুরু করুন।',
              'Choose the land service you need and get started directly.'
            )}
          </p>
        </div>

        {/* 4 Feature Cards with Real Images */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Service 1: Digital Khatian & Ownership Records */}
          <Card className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:shadow-lg transition flex flex-col justify-between group">
            <div>
              <div className="overflow-hidden aspect-[4/3] bg-emerald-50">
                <img
                  src="/assets/check-before-buy.jpg"
                  alt={t('ডিজিটাল খতিয়ান ও রেকর্ড অনুসন্ধান', 'Digital Khatian & Ownership Records')}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
              </div>
              <div className="p-5 space-y-2">
                <h3 className="text-base font-black text-slate-900">
                  {t('ডিজিটাল খতিয়ান ও রেকর্ড অনুসন্ধান', 'Digital Khatian & Records')}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {t(
                    'সিএস, এসএ, আরএস ও বিএস খতিয়ানের ধারাবাহিকতা, মালিকানার সত্যতা ও বর্তমান অবস্থা মুহূর্তেই জানুন।',
                    'Search historical khatian records, verify authentic ownership, and check land classification in seconds.'
                  )}
                </p>
              </div>
            </div>
            <div className="p-5 pt-0">
              <Button
                onClick={() => onNavigate('check')}
                className="w-full bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold rounded-xl h-10 shadow-xs"
              >
                <span>{t('খতিয়ান অনুসন্ধান', 'Search Records')}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </Card>

          {/* Service 2: Digital Mouza Map */}
          <Card className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:shadow-lg transition flex flex-col justify-between group">
            <div>
              <div className="overflow-hidden aspect-[4/3] bg-teal-50">
                <img
                  src="/assets/digital-mouza-map.jpg"
                  alt={t('ডিজিটাল মৌজা নকশা ও পরিমাপ', 'Digital Mouza Map & Survey')}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
              </div>
              <div className="p-5 space-y-2">
                <h3 className="text-base font-black text-slate-900">
                  {t('ডিজিটাল মৌজা নকশা ও পরিমাপ', 'Digital Mouza Map & Survey')}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {t(
                    'স্যাটেলাইট মানচিত্রে আপনার দাগের সীমানা, ভৌগোলিক অবস্থান ও জমির সুনির্দিষ্ট পরিমাপ নিখুঁতভাবে দেখুন।',
                    'Explore parcel boundaries, geographic coordinates, and precise acreage measurements on cadastral maps.'
                  )}
                </p>
              </div>
            </div>
            <div className="p-5 pt-0">
              <Button
                variant="outline"
                onClick={() => onNavigate('map')}
                className="w-full border-slate-300 text-slate-800 hover:bg-slate-50 text-xs font-bold rounded-xl h-10 shadow-2xs"
              >
                <span>{t('নকশা দেখুন', 'Explore Map')}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </Card>

          {/* Service 3: Deed QR Verification */}
          <Card className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:shadow-lg transition flex flex-col justify-between group">
            <div>
              <div className="overflow-hidden aspect-[4/3] bg-blue-50">
                <img
                  src="/assets/deed-qr-verify.png"
                  alt={t('স্মার্ট দলিল যাচাই ও কিউআর স্ক্যান', 'Deed Verification & QR Check')}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
              </div>
              <div className="p-5 space-y-2">
                <h3 className="text-base font-black text-slate-900">
                  {t('স্মার্ট দলিল যাচাই ও কিউআর স্ক্যান', 'Deed Verification & QR Check')}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {t(
                    'স্মার্টফোনে কিউআর কোড স্ক্যান করে সাব-রেজিস্ট্রারের ডিজিটাল সিল, ভলিউম ও দলিলের আসল সত্যতা জেনে নিন।',
                    'Scan deed QR codes to verify registrar signatures, volume records, and official government seals.'
                  )}
                </p>
              </div>
            </div>
            <div className="p-5 pt-0">
              <Button
                variant="outline"
                onClick={() => onNavigate('qr')}
                className="w-full border-slate-300 text-slate-800 hover:bg-slate-50 text-xs font-bold rounded-xl h-10 shadow-2xs"
              >
                <span>{t('দলিল পরীক্ষা', 'Verify Deed')}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </Card>

          {/* Service 4: Citizen Land Vault */}
          <Card className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:shadow-lg transition flex flex-col justify-between group">
            <div>
              <div className="overflow-hidden aspect-[4/3] bg-amber-50">
                <img
                  src="/assets/citizen-vault-smartcard.png"
                  alt={t('নাগরিক খতিয়ান ভল্ট ও সুরক্ষা লক', 'Citizen Land Vault & Title Protection')}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
              </div>
              <div className="p-5 space-y-2">
                <h3 className="text-base font-black text-slate-900">
                  {t('নাগরিক খতিয়ান ভল্ট ও সুরক্ষা লক', 'Citizen Vault & Sale Lock')}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {t(
                    'আপনার জাতীয় পরিচয়পত্রের অধীন সব জমি এক ভল্টে নিরাপদে রাখুন এবং জালিয়াতি ঠেকাতে বিক্রয় লক সক্রিয় করুন।',
                    'Store all your land records securely under your NID and protect your properties with smart sale lock.'
                  )}
                </p>
              </div>
            </div>
            <div className="p-5 pt-0">
              <Button
                variant="outline"
                onClick={() => onNavigate('home')}
                className="w-full border-slate-300 text-slate-800 hover:bg-slate-50 text-xs font-bold rounded-xl h-10 shadow-2xs"
              >
                <span>{t('ভল্টে প্রবেশ করুন', 'Open Vault')}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </Card>

        </div>

        {/* Complete National Land Services Directory Strip */}
        <div className="pt-4">
          <div className="p-6 rounded-3xl bg-slate-100/70 border border-slate-200/80">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-[#006A4E]" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                {t('বাংলাদেশের পূর্ণাঙ্গ ডিজিটাল ভূমিসেবা ইকোসিস্টেম', 'Comprehensive Bangladesh Land Services Ecosystem')}
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 bg-white rounded-2xl border border-slate-200/60 shadow-2xs space-y-1">
                <div className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t('ই-নামজারি ও জমাভাগ', 'e-Mutation')}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {t('অনলাইন মিউটেশন ও খতিয়ান সৃজন', 'Digital mutation & title transfer')}
                </p>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-slate-200/60 shadow-2xs space-y-1">
                <div className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-teal-600" />
                  <span>{t('ডিজিটাল মৌজা ম্যাপ', 'Cadastral GIS')}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {t('স্যাটেলাইটে দাগের সীমানা পরিমাপ', 'Satellite parcel boundary GIS')}
                </p>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-slate-200/60 shadow-2xs space-y-1">
                <div className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>{t('ভূমি উন্নয়ন কর', 'LD-Tax Online')}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {t('অনলাইনে খাজনা ও ই-দাখিলা গ্রহণ', 'Online tax payment & e-Dakhila')}
                </p>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-slate-200/60 shadow-2xs space-y-1">
                <div className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                  <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{t('স্মার্ট দলিল নিবন্ধন', 'Sub-Registry')}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {t('মেকার-চেকার ডিজিটাল রেজিস্ট্রেশন', 'Maker-checker deed registration')}
                </p>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-slate-200/60 shadow-2xs space-y-1">
                <div className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                  <span>{t('উত্তরাধিকার ফারায়েজ', 'Faraiz Share')}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {t('ওয়ারিশান সম্পত্তি বণ্টন হিসাব', 'Inheritance share calculation')}
                </p>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-slate-200/60 shadow-2xs space-y-1">
                <div className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t('বিক্রয় লক সুরক্ষা', 'Sale Lock Shield')}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {t('অননুমোদিত বিক্রি ও জালিয়াতি রোধ', 'Fraud prevention lock & alerts')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. LIVE SERVICE STATS: Clean & Dynamic */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <Card className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-black text-slate-900">
                {t('জাতীয় ভূমি সেবা পরিসংখ্যান', 'Live National Land Statistics')}
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              {t('সরাসরি সরকারি সার্ভারের সাথে সংযুক্ত', 'Live Connected')}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
              <div className="text-xs font-bold text-slate-600 mb-1">{t('নিবন্ধিত ডিজিটাল দলিল', 'Registered Deeds')}</div>
              <div className="text-2xl sm:text-3xl font-black text-[#006A4E] font-mono">
                {toBanglaDigits(kpis.total_deeds ?? kpis.deeds_count ?? 91, lang)}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
              <div className="text-xs font-bold text-slate-600 mb-1">{t('যাচাইকৃত খতিয়ান ও দাগ', 'Verified Khatians')}</div>
              <div className="text-2xl sm:text-3xl font-black text-blue-800 font-mono">
                {toBanglaDigits(kpis.total_plots ?? kpis.plots_count ?? 71, lang)}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
              <div className="text-xs font-bold text-slate-600 mb-1">{t('অনুমোদিত ই-নামজারি', 'Approved Mutations')}</div>
              <div className="text-2xl sm:text-3xl font-black text-amber-800 font-mono">
                {toBanglaDigits(kpis.approved_mutations ?? kpis.total_mutations ?? 12, lang)}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100">
              <div className="text-xs font-bold text-slate-600 mb-1">{t('ডিজিটাল সেবা প্রাপ্তি', 'Service Success Rate')}</div>
              <div className="text-2xl sm:text-3xl font-black text-teal-800 font-mono">
                {toBanglaDigits(100, lang)}%
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 5. CITIZEN HELPLINE 16122 & FAQ (shadcn Accordion) */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: 16122 Call Center Card */}
          <div className="lg:col-span-5">
            <Card className="relative rounded-3xl border border-slate-700/40 text-white p-6 sm:p-8 shadow-xl overflow-hidden group">
              {/* High-Resolution Background Image with Cinematic Gradient Overlay */}
              <div className="absolute inset-0 z-0">
                <img
                  src="/assets/helpline-16122-bg.jpg"
                  alt="16122 Land Helpline Call Center"
                  className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/80 to-slate-900/60" />
              </div>

              {/* Card Foreground Content */}
              <div className="relative z-10 space-y-5">
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shadow-inner">
                  <PhoneCall className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white drop-shadow-xs">
                    {t('১৬১২২ নম্বরে কল করুন', 'Call 16122 Anytime')}
                  </h3>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {t(
                      'জমি সংক্রান্ত যে কোনো সমস্যা, নামজারি আবেদন বা পরামর্শের জন্য সরকারি ভূমি সেবা কল সেন্টারে সরাসরি কথা বলুন।',
                      'Direct citizen assistance for land mutations, deeds, and official counseling.'
                    )}
                  </p>
                </div>

                <div className="pt-2">
                  <a
                    href="tel:16122"
                    className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-white text-[#006A4E] font-black text-sm hover:bg-emerald-50 transition shadow-md hover:shadow-lg hover:scale-[1.01]"
                  >
                    <PhoneCall className="w-4 h-4 text-[#006A4E]" />
                    <span>{t('এখনই কল করুন (১৬১২২)', 'Call Now (16122)')}</span>
                  </a>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Frequently Asked Questions (shadcn Accordion) */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <h3 className="text-xl font-black text-slate-900">
                {t('সাধারণ জিজ্ঞাসা ও উত্তর', 'Frequently Asked Questions')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('নাগরিকদের সাধারণ প্রশ্নের সহজ ও স্পষ্ট সমাধান', 'Clear and simple answers to common citizen questions about land services')}
              </p>
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              <AccordionItem value="item-1" className="border border-slate-200/90 rounded-2xl bg-white px-4 shadow-2xs">
                <AccordionTrigger className="text-sm font-bold text-slate-900 hover:no-underline py-4 text-left">
                  {t('এই প্ল্যাটফর্মে নাগরিকরা কোন কোন ডিজিটাল ভূমি সেবা পাবেন?', 'What land services are available on this platform?')}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-slate-600 leading-relaxed pb-4">
                  {t(
                    'নাগরিকরা ঘরে বসেই খতিয়ান (পর্চা) অনুসন্ধান, স্যাটেলাইট মৌজা নকশায় জমির সীমানা পরিমাপ, সাব-রেজিস্ট্রি দলিলের সত্যতা যাচাই, স্বয়ংক্রিয় ই-নামজারি ট্র্যাকিং এবং নিজের জমির ওপর অননুমোদিত হস্তান্তর ও জালিয়াতি ঠেকাতে ডিজিটাল বিক্রয় লক সুবিধা পাবেন।',
                    'Citizens can search e-khatians, measure parcel boundaries on satellite maps, verify registered deeds, track e-mutations, and activate digital sale lock to prevent unauthorized transfers.'
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border border-slate-200/90 rounded-2xl bg-white px-4 shadow-2xs">
                <AccordionTrigger className="text-sm font-bold text-slate-900 hover:no-underline py-4 text-left">
                  {t('জমির খতিয়ান ও দাগ নম্বর কীভাবে অনুসন্ধান করব?', 'How to search plot and khatian records?')}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-slate-600 leading-relaxed pb-4">
                  {t(
                    'আমাদের সার্চ কনসোলে মৌজা নির্বাচন করে দাগ অথবা খতিয়ান নম্বর লিখুন। মুহূর্তেই সরকারি রেকর্ড থেকে মালিকের নাম, জমির শ্রেণি, খতিয়ান নম্বর এবং কোনো ব্যাংক ঋণ বা আদালতের স্থগিতাদেশ আছে কিনা তা পরিষ্কার দেখতে পাবেন।',
                    'Select your mouza and enter the plot or khatian number in the search console. You will instantly see the recorded owner, land type, and any bank mortgages or legal status.'
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border border-slate-200/90 rounded-2xl bg-white px-4 shadow-2xs">
                <AccordionTrigger className="text-sm font-bold text-slate-900 hover:no-underline py-4 text-left">
                  {t('দলিল নিবন্ধনের পর ই-নামজারি (মিউটেশন) কীভাবে সম্পন্ন হয়?', 'How does e-mutation work after deed registration?')}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-slate-600 leading-relaxed pb-4">
                  {t(
                    'সাব-রেজিস্ট্রি অফিসে দলিল নিবন্ধিত হওয়ার সাথে সাথেই তা স্বয়ংক্রিয়ভাবে আন্তঃসংযুক্ত সিস্টেমের মাধ্যমে এসি ল্যান্ড অফিসের ই-নামজারি ডকেটে পৌঁছে যায়। নাগরিককে আলাদা আবেদন নিয়ে ঘুরতে হয় না; এসএমএস ও ট্র্যাকিং কোডের মাধ্যমে প্রতিটি ধাপের হালনাগাদ অগ্রগতি জানা যায়।',
                    'Once a deed is registered at the Sub-Registry, data transfers automatically to the AC Land e-mutation docket. Citizens receive SMS and tracking code updates at every step.'
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border border-slate-200/90 rounded-2xl bg-white px-4 shadow-2xs">
                <AccordionTrigger className="text-sm font-bold text-slate-900 hover:no-underline py-4 text-left">
                  {t('নাগরিক খতিয়ান ভল্ট এবং "বিক্রয় লক" কীভাবে জমি সুরক্ষিত রাখে?', 'How does Citizen Vault and Sale Lock protect land?')}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-slate-600 leading-relaxed pb-4">
                  {t(
                    'আপনার জাতীয় পরিচয়পত্রের (NID) সাথে যুক্ত সব বৈধ জমি স্মার্ট ভল্টে সংরক্ষিত থাকে। আপনি "বিক্রয় লক অন" করে রাখলে আপনার নিজস্ব বায়োমেট্রিক ওটিপি সম্মতি ছাড়া সাব-রেজিস্ট্রিতে জমি বিক্রি বা হস্তান্তর হতে পারবে না। ফলে জমি জালিয়াতি শতভাগ বন্ধ থাকে।',
                    'All verified land records linked to your NID reside in your personal vault. When Sale Lock is enabled, no deed can be registered without your explicit biometric OTP consent, eliminating land fraud.'
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border border-slate-200/90 rounded-2xl bg-white px-4 shadow-2xs">
                <AccordionTrigger className="text-sm font-bold text-slate-900 hover:no-underline py-4 text-left">
                  {t('জমি সংক্রান্ত যেকোনো জটিলতায় কীভাবে সরকারি সহায়তা পাওয়া যাবে?', 'How to get official citizen assistance for land disputes?')}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-slate-600 leading-relaxed pb-4">
                  {t(
                    'ভূমি মন্ত্রণালয়ের সার্বক্ষণিক টোল-ফ্রি ১৬১২২ কল সেন্টারে সরাসরি কথা বলে যেকোনো পরামর্শ বা সহায়তা পাওয়া যাবে। এছাড়া আমাদের "সহায়তা" বিভাগ থেকে বিরোধ নিষ্পত্তির আবেদন ও ট্র্যাকিং করা সম্ভব।',
                    'Call toll-free 16122 anytime for direct counseling from government land experts, or submit an online support ticket for dispute resolution and guidance.'
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

        </div>
      </section>

    </div>
  );
};