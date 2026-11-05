import React, { useState } from 'react';
import { useAppUI } from '../i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CitizenProblemTriageModal } from '../components/CitizenProblemTriageModal';
import { HelpFaqSection } from '../components/help/HelpFaqSection';
import { HelpProblemTriageSection } from '../components/help/HelpProblemTriageSection';
import { HelpFeeCalculatorSection } from '../components/help/HelpFeeCalculatorSection';
import { HelpGlossarySection } from '../components/help/HelpGlossarySection';
import { HelpContactSection } from '../components/help/HelpContactSection';
import {
  BookOpen,
  Sparkles,
  Coins,
  Layers,
  PhoneCall,
  Lock,
  Compass,
  ShieldCheck,
  Building2,
  CheckCircle2,
} from 'lucide-react';

export const HelpPage: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { t, lang } = useAppUI();

  // Read initial tab from URL query param if present
  const getInitialTab = (): string => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sub = params.get('section') || params.get('subtab');
      if (sub && ['faq', 'triage', 'fees', 'glossary', 'helpline'].includes(sub)) {
        return sub;
      }
    } catch {
      // fallback
    }
    return 'faq';
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab);
  const [triageModalOpen, setTriageModalOpen] = useState(false);

  // Sync tab changes with URL query string
  const handleTabChange = (val: string) => {
    setActiveTab(val);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('section', val);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore in non-browser or test environments
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      {/* Visual Hero Banner with Natural Responsive Flow & Clean Background */}
      <div
        className="relative rounded-3xl overflow-hidden border border-emerald-500/30 shadow-md p-6 sm:p-10 text-white bg-cover bg-center"
        style={{ backgroundImage: `url('/assets/help-hero-banner.svg')`, backgroundColor: '#022c22' }}
      >
        <div className="relative z-10 flex flex-col gap-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/90 text-emerald-100 text-xs font-bold border border-emerald-400/40 backdrop-blur-xs">
              <Sparkles className="size-3.5 text-amber-300" />
              {t('সহায়তা ও তথ্য কেন্দ্র', 'Support & Help Hub')}
            </span>
            <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/20 backdrop-blur-xs">
              LandTech Bangladesh 2026
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
            {t('নাগরিক সহায়তা কেন্দ্র', 'Citizen Support Center')}
          </h1>

          <p className="text-xs sm:text-sm text-emerald-100/95 leading-relaxed font-medium max-w-xl">
            {t(
              'ভূমি সেবা, দলিল রেজিস্ট্রেশন ও নামজারি সংক্রান্ত প্রয়োজনীয় নির্দেশিকা ও প্রশ্নের উত্তর।',
              'Guidelines, FAQs, and assistance for land registration and e-mutation.'
            )}
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-white/15 px-2.5 py-1 rounded-lg backdrop-blur-xs border border-white/20">
              <CheckCircle2 className="size-3.5 text-emerald-300" />
              {t('১০০% ক্যাশলেস ফি', '100% Cashless Fees')}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-white/15 px-2.5 py-1 rounded-lg backdrop-blur-xs border border-white/20">
              <CheckCircle2 className="size-3.5 text-emerald-300" />
              {t('১১-রুল গেটকিপার প্রাক-যাচাই', '11-Rule Gatekeeper')}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-white/15 px-2.5 py-1 rounded-lg backdrop-blur-xs border border-white/20">
              <CheckCircle2 className="size-3.5 text-emerald-300" />
              {t('১৬১২২ সার্বক্ষণিক হেল্পলাইন', '16122 Official Support')}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Navigation Action Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {
            id: 'faq',
            title_bn: 'সাধারণ জিজ্ঞাসা',
            title_en: 'FAQs & Answers',
            subtitle_bn: '৮টি মূল প্রশ্নের সমাধান',
            subtitle_en: '8 Key Questions',
            icon: BookOpen,
            color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          },
          {
            id: 'triage',
            title_bn: 'সমস্যা সমাধান',
            title_en: 'Problem Triage',
            subtitle_bn: '৩ ক্লিকে সঠিক নিয়ম',
            subtitle_en: '3-Click Rule Guide',
            icon: Compass,
            color: 'text-teal-700 bg-teal-50 border-teal-200',
          },
          {
            id: 'fees',
            title_bn: 'ফি ক্যালকুলেটর',
            title_en: 'Fee Calculator',
            subtitle_bn: '১৭ ফেব ২০২৬ সার্কুলার',
            subtitle_en: '17 Feb 2026 Gazette',
            icon: Coins,
            color: 'text-amber-700 bg-amber-50 border-amber-200',
          },
          {
            id: 'glossary',
            title_bn: 'পরিভাষা কোষ',
            title_en: 'Land Glossary',
            subtitle_bn: 'সিএস থেকে বিডিএস জরিপ',
            subtitle_en: 'CS to BDS Epochs',
            icon: Layers,
            color: 'text-blue-700 bg-blue-50 border-blue-200',
          },
          {
            id: 'helpline',
            title_bn: 'হটলাইন ১৬১২২',
            title_en: 'Call Center 16122',
            subtitle_bn: 'সরাসরি সহায়তা সেল',
            subtitle_en: 'Official Hotline',
            icon: PhoneCall,
            color: 'text-rose-700 bg-rose-50 border-rose-200',
          },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTabChange(item.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-[#006A4E]'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl border ${isActive ? 'bg-white/10 text-white border-white/20' : item.color}`}>
                  <Icon className="size-4" />
                </div>
                {isActive && (
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs sm:text-sm font-extrabold leading-snug">
                  {lang === 'bn' ? item.title_bn : item.title_en}
                </span>
                <span className={`text-[10px] leading-tight ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                  {lang === 'bn' ? item.subtitle_bn : item.subtitle_en}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Content Area controlled by the 5 Navigation Cards */}
      <div className="w-full flex flex-col gap-6">
        {activeTab === 'faq' && <HelpFaqSection />}
        {activeTab === 'triage' && (
          <HelpProblemTriageSection
            onOpenTriageModal={() => setTriageModalOpen(true)}
            onNavigate={onNavigate}
          />
        )}
        {activeTab === 'fees' && <HelpFeeCalculatorSection />}
        {activeTab === 'glossary' && <HelpGlossarySection />}
        {activeTab === 'helpline' && <HelpContactSection onNavigate={onNavigate} />}
      </div>

      {/* Bottom Sticky Action Toolbar */}
      <Card className="border-slate-200/90 bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md">
        <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <ShieldCheck className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-emerald-300">
                {t('প্রতারণামুক্ত নিরাপদ ভূমি সেবা', 'Fraud-Free Secure Land Services')}
              </span>
              <span className="text-sm font-extrabold text-white">
                {t('জমি কেনাবেচা বা রেজিস্ট্রির পূর্বে এখনি স্বয়ংক্রিয় যাচাই করুন', 'Verify any plot or deed before concluding transaction')}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <Button
              onClick={() => onNavigate('check')}
              className="h-10 px-4 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs gap-1.5 cursor-pointer shadow-sm"
            >
              <Sparkles className="size-3.5" />
              <span>{t('জমি যাচাই উইজার্ড', 'Check Before Buy')}</span>
            </Button>

            <Button
              onClick={() => onNavigate('qr')}
              className="h-10 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 cursor-pointer shadow-sm"
            >
              <Lock className="size-3.5" />
              <span>{t('দলিল স্ক্যান', 'Verify Deed QR')}</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => onNavigate('offices')}
              className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs gap-1.5 cursor-pointer"
            >
              <Building2 className="size-3.5" />
              <span>{t('অফিস সন্ধান', 'Office Locator')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Citizen Problem Triage Modal */}
      <CitizenProblemTriageModal
        isOpen={triageModalOpen}
        onClose={() => setTriageModalOpen(false)}
        onNavigate={(route) => {
          setTriageModalOpen(false);
          if (!route) return;
          if (route.startsWith('http')) {
            window.open(route, '_blank');
          } else if (route.startsWith('tickets')) {
            onNavigate('home');
          } else if (['plots', 'vault', 'deeds', 'transfers', 'disputes'].includes(route)) {
            onNavigate('home');
          } else {
            onNavigate(route);
          }
        }}
      />
    </div>
  );
};
