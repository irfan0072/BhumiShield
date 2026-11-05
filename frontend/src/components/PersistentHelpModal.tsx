import React, { useState, useEffect } from 'react';
import { useAppUI } from '@/i18n';
import { getFloatingButtons, FloatingActionButtonConfig } from '@/lib/floatingButtons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  HelpCircle,
  PhoneCall,
  ShieldCheck,
  Search,
  QrCode,
  FileText,
  Calculator,
  Compass,
  ArrowRight,
  ExternalLink,
  BookOpen,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

interface PersistentHelpModalProps {
  onNavigate?: (tab: string) => void;
}

export const PersistentHelpModal: React.FC<PersistentHelpModalProps> = ({
  onNavigate,
}) => {
  const { lang } = useAppUI();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'hotline' | 'triage' | 'jargon'>('hotline');
  const [isExpanded, setIsExpanded] = useState(false);
  const [actionButtons, setActionButtons] = useState<FloatingActionButtonConfig[]>(getFloatingButtons);

  // Subscribe to live admin button updates
  useEffect(() => {
    const handleButtonsUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setActionButtons(e.detail);
      } else {
        setActionButtons(getFloatingButtons());
      }
    };
    window.addEventListener('bs-floating-buttons-updated', handleButtonsUpdate);
    return () => window.removeEventListener('bs-floating-buttons-updated', handleButtonsUpdate);
  }, []);

  // Close speed dial on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Listen to global open event so any component can trigger this modal
  useEffect(() => {
    const handleOpen = (e: any) => {
      if (e.detail?.subTab) {
        setActiveSubTab(e.detail.subTab);
      }
      setIsOpen(true);
    };
    window.addEventListener('open-persistent-help', handleOpen);
    return () => window.removeEventListener('open-persistent-help', handleOpen);
  }, []);

  const handleNavigateAndClose = (tab: string) => {
    setIsOpen(false);
    setIsExpanded(false);
    if (onNavigate) {
      onNavigate(tab);
    } else {
      window.history.pushState({ tab }, '', `/${lang}/${tab}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleOpenFaraiz = () => {
    setIsOpen(false);
    setIsExpanded(false);
    window.dispatchEvent(new CustomEvent('open-faraiz-calculator', { detail: {} }));
  };

  const handleActionClick = (action: FloatingActionButtonConfig['action']) => {
    setIsExpanded(false);
    if (action === 'support_modal') {
      setIsOpen(true);
    } else if (action === 'product_tour') {
      window.dispatchEvent(new CustomEvent('start-citizen-tour'));
    } else if (action === 'faraiz_calculator') {
      handleOpenFaraiz();
    } else if (action === 'verify_qr') {
      handleNavigateAndClose('qr');
    } else if (action === 'navigate_map') {
      handleNavigateAndClose('map');
    }
  };

  const renderActionIcon = (iconName: string) => {
    const cls = 'w-5 h-5';
    switch (iconName) {
      case 'PhoneCall':
        return <PhoneCall className={cls} />;
      case 'BookOpen':
        return <BookOpen className={cls} />;
      case 'Compass':
        return <Compass className={cls} />;
      case 'Sparkles':
        return <Sparkles className={cls} />;
      case 'Calculator':
        return <Calculator className={cls} />;
      case 'QrCode':
        return <QrCode className={cls} />;
      case 'ShieldCheck':
        return <ShieldCheck className={cls} />;
      case 'FileText':
        return <FileText className={cls} />;
      default:
        return <HelpCircle className={cls} />;
    }
  };

  return (
    <>
      {/* Floating Speed Dial on Bottom Right */}
      <aside
        aria-label={lang === 'bn' ? 'সাহায্য ও কুইক অ্যাকশন' : 'Help & Quick Actions'}
        className="fixed bottom-6 right-4 sm:bottom-6 sm:right-6 z-40 print:hidden flex flex-col items-end"
      >
        {/* Expanded child action buttons (expand upward on click) */}
        {isExpanded && (
          <div className="flex flex-col-reverse items-end gap-3 mb-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
            {actionButtons.filter((b) => b.isActive).map((btn) => (
              <div key={btn.id} className="group relative flex items-center justify-end">
                {/* On-hover expanded text label */}
                <span
                  role="tooltip"
                  className="absolute right-full mr-3 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-900/95 text-white text-xs font-bold shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0 border border-white/10 backdrop-blur-xs select-none"
                >
                  {lang === 'bn' ? btn.labelBn : btn.labelEn}
                </span>

                {/* Circular Child Action Button */}
                <button
                  type="button"
                  onClick={() => handleActionClick(btn.action)}
                  style={{ backgroundColor: btn.bgColor }}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full text-white flex items-center justify-center shadow-lg hover:shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-white/40 focus:outline-none focus:ring-4 focus:ring-black/10"
                  aria-label={lang === 'bn' ? btn.labelBn : btn.labelEn}
                >
                  {renderActionIcon(btn.icon)}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main Floating Trigger Button: shows '?' by default, rotates to 'X' (cross icon) when expanded */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-white/40 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 ${
            isExpanded
              ? 'bg-slate-900 hover:bg-slate-800 text-white rotate-90 scale-105'
              : 'bg-[#006A4E] hover:bg-[#00553e] text-white hover:scale-105 active:scale-95'
          }`}
          aria-expanded={isExpanded}
          aria-label={
            isExpanded
              ? (lang === 'bn' ? 'মেনু বন্ধ করুন' : 'Close menu')
              : (lang === 'bn' ? 'সহায়তা ও কুইক অ্যাকশন' : 'Help & Quick Actions')
          }
          title={
            isExpanded
              ? (lang === 'bn' ? 'মেনু বন্ধ করুন' : 'Close')
              : (lang === 'bn' ? 'সহায়তা ও কুইক অ্যাকশন' : 'Help & Quick Actions')
          }
        >
          {isExpanded ? (
            <X className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5] text-white" />
          ) : (
            <div className="relative flex items-center justify-center">
              <HelpCircle className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#006A4E] animate-ping" />
            </div>
          )}
        </button>
      </aside>

      {/* Persistent Help Modal Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden flex flex-col p-4 sm:p-5 rounded-2xl">
          <DialogHeader className="pb-2.5 border-b border-[#006A4E]/15">
            <div className="flex items-center gap-2 text-[#074f38]">
              <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#006A4E] shrink-0">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold">
                  {lang === 'bn'
                    ? 'ভূমি সেবা সহায়তা ও ১৬১২২ হটলাইন'
                    : 'Land Services Support & 16122 Helpline'}
                </DialogTitle>
                <DialogDescription className="text-stone-600 text-xs mt-0.5">
                  {lang === 'bn'
                    ? 'সরকারি কলসেন্টার, সমস্যা সমাধান ও সহজ বাংলা নির্দেশিকা'
                    : 'Official government call center, problem triage and simple guides'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Navigation Tabs */}
          <div className="mt-2">
            <Tabs
              value={activeSubTab}
              onValueChange={(val) => setActiveSubTab(val as any)}
              className="w-full"
            >
              <TabsList className="grid grid-cols-3 w-full bg-stone-100 p-1 rounded-xl h-auto">
                <TabsTrigger value="hotline" className="text-xs font-bold flex items-center justify-center gap-1.5 min-h-[38px] rounded-lg transition-all">
                  <PhoneCall className="h-3.5 w-3.5 text-[#006A4E] shrink-0" />
                  <span>{lang === 'bn' ? '১৬১২২ কলসেন্টার' : '16122 Call Center'}</span>
                </TabsTrigger>
                <TabsTrigger value="triage" className="text-xs font-bold flex items-center justify-center gap-1.5 min-h-[38px] rounded-lg transition-all">
                  <Compass className="h-3.5 w-3.5 text-[#006A4E] shrink-0" />
                  <span>{lang === 'bn' ? 'কী করতে চান?' : 'Problem Triage'}</span>
                </TabsTrigger>
                <TabsTrigger value="jargon" className="text-xs font-bold flex items-center justify-center gap-1.5 min-h-[38px] rounded-lg transition-all">
                  <BookOpen className="h-3.5 w-3.5 text-[#006A4E] shrink-0" />
                  <span>{lang === 'bn' ? 'শব্দকোষ' : 'Jargon'}</span>
                </TabsTrigger>
              </TabsList>

              {/* Sub-tab 1: Official 16122 Helpline Card */}
              <TabsContent value="hotline" className="mt-4 space-y-4">
                <div className="rounded-2xl border-2 border-emerald-500/20 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 p-5 text-center relative overflow-hidden">
                  <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full mb-3">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{lang === 'bn' ? '২৪/৭ জাতীয় ভূমি হেল্পলাইন' : '24/7 National Land Helpline'}</span>
                  </div>

                  <h3 className="text-3xl sm:text-4xl font-extrabold text-[#006A4E] tracking-tight mb-2">
                    ১৬১২২
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto mb-5 leading-relaxed">
                    {lang === 'bn'
                      ? 'যেকোনো মোবাইল বা ল্যান্ডফোন থেকে কল করুন। ভূমি মন্ত্রণালয়ের প্রশিক্ষিত প্রতিনিধি সরাসরি আপনাকে সহায়তা করবেন।'
                      : 'Call from any phone in Bangladesh. Trained representatives of the Ministry of Land are standing by to assist you.'}
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a
                      href="tel:16122"
                      className="inline-flex items-center justify-center gap-2 bg-[#006A4E] hover:bg-[#00553e] text-white px-6 py-3 rounded-xl font-bold text-base min-h-[48px] w-full sm:w-auto shadow-md transition-transform hover:-translate-y-0.5"
                    >
                      <PhoneCall className="h-5 w-5" />
                      <span>{lang === 'bn' ? 'সরাসরি কল করুন (১৬১২২)' : 'Call Now (16122)'}</span>
                    </a>
                    <a
                      href="tel:09612316122"
                      className="inline-flex items-center justify-center gap-2 bg-white hover:bg-stone-50 text-[#006A4E] border-2 border-[#006A4E]/30 px-5 py-3 rounded-xl font-bold text-sm min-h-[48px] w-full sm:w-auto"
                    >
                      <span>{lang === 'bn' ? 'বিদেশ থেকে: +৮৮০ ৯৬১২ ৩১৬১২২' : 'From Abroad: +880 9612 316122'}</span>
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div className="p-3.5 rounded-xl border border-stone-200 bg-white">
                    <h5 className="font-bold text-[#074f38] mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>{lang === 'bn' ? 'এসএমএস সেবা' : 'SMS Assistance'}</span>
                    </h5>
                    <p className="text-stone-600 text-xs leading-relaxed">
                      {lang === 'bn'
                        ? 'খতিয়ান বা নামজারি সংক্রান্ত কোনো তথ্য পেতে ১৬১২২ নম্বরে এসএমএস পাঠিয়ে তথ্য জানতে পারেন।'
                        : 'Send an SMS to 16122 with your docket reference for real-time status.'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-stone-200 bg-white">
                    <h5 className="font-bold text-[#074f38] mb-1 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span>{lang === 'bn' ? 'অনিয়ম বা হয়রানি প্রতিকার' : 'Grievance Redress (GRS)'}</span>
                    </h5>
                    <p className="text-stone-600 text-xs leading-relaxed">
                      {lang === 'bn'
                        ? 'অফিসার বা কর্মচারীর বিরুদ্ধে অভিযোগ থাকলে সরাসরি ১৬১২২ এ অভিযোগ টিকিট নথিভুক্ত করুন।'
                        : 'Report any unfair service fees or delays directly to the central grievance cell.'}
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Sub-tab 2: Problem Triage Launcher */}
              <TabsContent value="triage" className="mt-4 space-y-3 overflow-y-auto max-h-[50vh] pr-1">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNavigateAndClose('check')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNavigateAndClose('check');
                    }
                  }}
                  className="p-4 rounded-xl border border-[#006A4E]/20 bg-emerald-50/50 hover:bg-emerald-50 hover:border-[#006A4E] transition-all cursor-pointer flex items-center justify-between gap-3 group min-h-[52px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006A4E]"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-[#006A4E] text-white flex items-center justify-center shrink-0">
                      <Search className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#074f38] group-hover:text-[#006A4E]">
                        {lang === 'bn'
                          ? '১. জমি কেনার আগে ঝুঁকি যাচাই করতে চান?'
                          : '1. Want to check land risk before buying?'}
                      </h4>
                      <p className="text-xs text-stone-600 mt-0.5">
                        {lang === 'bn'
                          ? 'মৌজা ও দাগ নম্বর দিয়ে মালিকানা, মামলা, লিয়েন ও ভেজাল আছে কিনা ৩ ক্লিকে দেখুন।'
                          : 'Check ownership chain, court cases, mortgages and encumbrances in 3 clicks.'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-[#006A4E] shrink-0 transition-transform group-hover:translate-x-1" />
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNavigateAndClose('qr')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNavigateAndClose('qr');
                    }
                  }}
                  className="p-4 rounded-xl border border-[#006A4E]/20 bg-emerald-50/50 hover:bg-emerald-50 hover:border-[#006A4E] transition-all cursor-pointer flex items-center justify-between gap-3 group min-h-[52px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006A4E]"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <QrCode className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#074f38] group-hover:text-blue-700">
                        {lang === 'bn'
                          ? '২. দলিলের কিউআর কোড বা সত্যতা স্ক্যান করবেন?'
                          : '2. Want to scan a deed QR code or check authenticity?'}
                      </h4>
                      <p className="text-xs text-stone-600 mt-0.5">
                        {lang === 'bn'
                          ? 'দলিলের ওপর মুদ্রিত কিউআর কোড স্ক্যান করে সরকারি রেজিস্ট্রি ডেটাবেজ মিলিয়ে নিন।'
                          : 'Verify deed registration number and cryptographic signature with registry seal.'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-blue-600 shrink-0 transition-transform group-hover:translate-x-1" />
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleOpenFaraiz}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenFaraiz();
                    }
                  }}
                  className="p-4 rounded-xl border border-[#006A4E]/20 bg-emerald-50/50 hover:bg-emerald-50 hover:border-[#006A4E] transition-all cursor-pointer flex items-center justify-between gap-3 group min-h-[52px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006A4E]"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                      <Calculator className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#074f38] group-hover:text-amber-700">
                        {lang === 'bn'
                          ? '৩. ওয়ারিশ সূত্রে পাওয়া জমির অংশ হিসেব করবেন?'
                          : '3. Calculate inherited shares under Islamic Faraiz?'}
                      </h4>
                      <p className="text-xs text-stone-600 mt-0.5">
                        {lang === 'bn'
                          ? 'স্ত্রী, পুত্র, কন্যা, ভাই বা বোন কত আনা/শতাংশ পাবেন সহজে স্বয়ংক্রিয় ক্যালকুলেটরে দেখুন।'
                          : 'Calculate statutory inheritance shares with accurate fractional distribution.'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-amber-600 shrink-0 transition-transform group-hover:translate-x-1" />
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNavigateAndClose('applications')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNavigateAndClose('applications');
                    }
                  }}
                  className="p-4 rounded-xl border border-[#006A4E]/20 bg-emerald-50/50 hover:bg-emerald-50 hover:border-[#006A4E] transition-all cursor-pointer flex items-center justify-between gap-3 group min-h-[52px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006A4E]"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#074f38] group-hover:text-purple-700">
                        {lang === 'bn'
                          ? '৪. নতুন নামজারি আবেদন বা দলিলের পর নাম পরিবর্তন করবেন?'
                          : '4. Apply for new mutation (e-Namjari) or check status?'}
                      </h4>
                      <p className="text-xs text-stone-600 mt-0.5">
                        {lang === 'bn'
                          ? 'সহজ ৩ ধাপে ই-নামজারি আবেদন জমা দিন ও শুনানির তারিখ ট্র্যাক করুন।'
                          : 'Submit e-mutation application in 3 simple phases and track judicial order.'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-purple-600 shrink-0 transition-transform group-hover:translate-x-1" />
                </div>
              </TabsContent>

              {/* Sub-tab 3: Plain-Bengali Jargon Buster */}
              <TabsContent value="jargon" className="mt-4 overflow-y-auto max-h-[50vh] pr-1">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-sm font-bold text-[#074f38] min-h-[48px] py-3 text-left">
                      {lang === 'bn' ? 'খতিয়ান (Khatian) কী?' : 'What is a Khatian?'}
                    </AccordionTrigger>
                    <AccordionContent className="text-xs text-stone-600 leading-relaxed pb-3">
                      {lang === 'bn'
                        ? 'খতিয়ান হলো সরকারের কাছে থাকা জমির পরিচয়পত্র। এতে লেখা থাকে জমির প্রকৃত মালিক কে, কতটুকু জমি কার দখলে আছে, এবং জমির দাগ নম্বর কত।'
                        : 'A Khatian is the official Record of Rights (RoR) registered with the government indicating legal title, plot number and possession.'}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger className="text-sm font-bold text-[#074f38] min-h-[48px] py-3 text-left">
                      {lang === 'bn' ? 'নামজারি (Mutation) কেন জরুরি?' : 'Why is Mutation necessary?'}
                    </AccordionTrigger>
                    <AccordionContent className="text-xs text-stone-600 leading-relaxed pb-3">
                      {lang === 'bn'
                        ? 'জমি কেনার পর শুধু দলিল করে বসে থাকলে জমি আপনার নামে পুরোপুরি রেকর্ড হয় না। এসি ল্যান্ড অফিসের মাধ্যমে পূর্বের মালিকের নাম কেটে আপনার নাম সরকারি রেজিস্টারে তোলাই হলো নামজারি।'
                        : 'Deed registration transfers agreement, but mutation officially enters your name into the Upazila revenue record. Without it, you cannot legally pay land tax or sell.'}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger className="text-sm font-bold text-[#074f38] min-h-[48px] py-3 text-left">
                      {lang === 'bn' ? 'দাগ নম্বর (Dag No.) কী?' : 'What is a Dag (Plot) Number?'}
                    </AccordionTrigger>
                    <AccordionContent className="text-xs text-stone-600 leading-relaxed pb-3">
                      {lang === 'bn'
                        ? 'মৌজার নকশায় নির্দিষ্ট এক খণ্ড জমির যে অনন্য পরিচিতি নম্বর দেওয়া থাকে, তাকে দাগ নম্বর বলে। এটি জমির অবস্থান শনাক্ত করতে ব্যবহৃত হয়।'
                        : 'A Dag is the unique survey boundary plot number demarcated on the cadastral mouza map.'}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4">
                    <AccordionTrigger className="text-sm font-bold text-[#074f38] min-h-[48px] py-3 text-left">
                      {lang === 'bn' ? 'ডিসিআর (DCR) ও পর্চা (Porcha) কী?' : 'What are DCR & Porcha?'}
                    </AccordionTrigger>
                    <AccordionContent className="text-xs text-stone-600 leading-relaxed pb-3">
                      {lang === 'bn'
                        ? 'ডিসিআর (Duplicate Carbon Receipt) হলো নামজারির সরকারি ফি (৳১,১৭০) জমা দেওয়ার সরকারি রশিদ। আর পর্চা হলো খতিয়ানের সত্যায়িত কপি যা আপনি নিজের কাছে সংরক্ষণ করবেন।'
                        : 'DCR is the statutory receipt for mutation fees (BDT 1,170). Porcha is the authenticated physical printout of the Khatian.'}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-5">
                    <AccordionTrigger className="text-sm font-bold text-[#074f38] min-h-[48px] py-3 text-left">
                      {lang === 'bn' ? 'লিয়েন (Lien) বা বন্ধক কী?' : 'What is a Lien or Mortgage?'}
                    </AccordionTrigger>
                    <AccordionContent className="text-xs text-stone-600 leading-relaxed pb-3">
                      {lang === 'bn'
                        ? 'কোনো জমিতে ব্যাংক ঋণ নেওয়া থাকলে সেই জমিতে ব্যাংকের অধিকার বা লিয়েন বসে যায়। ঋণ শোধ না করা পর্যন্ত ব্যাংক থেকে এনওসি (NOC) ছাড়া এই জমি বিক্রি করা সম্পূর্ণ বেআইনি।'
                        : 'A lien indicates that a bank holds the plot as loan collateral. Selling or transferring the land is blocked until the bank issues an official NOC.'}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
