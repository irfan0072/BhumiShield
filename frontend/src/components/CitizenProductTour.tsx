import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  FolderOpen,
  FileCheck,
  RefreshCw,
  Scale,
  User,
  ArrowRight,
  ArrowLeft,
  X,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppUI } from '../i18n';
import { toBanglaDigits } from '../theme/tokens';
import { CitizenSection } from '../pages/CitizenHome';

export interface TourStep {
  id: string;
  category: string;
  titleBn: string;
  titleEn: string;
  badgeBn: string;
  badgeEn: string;
  tab: string;
  subTab?: CitizenSection;
  targetSelector: string;
  fallbackSelector?: string;
  descriptionBn: string;
  descriptionEn: string;
  actionTipBn: string;
  actionTipEn: string;
  icon: React.ReactNode;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'overview',
    category: 'OVERVIEW',
    titleBn: 'জমির সারসংক্ষেপ ও নিরাপত্তা স্কোর',
    titleEn: 'Overview & Security Score',
    badgeBn: 'সারসংক্ষেপ',
    badgeEn: 'Overview',
    tab: 'home',
    subTab: 'overview',
    targetSelector: '[data-tour="overview-services"]',
    fallbackSelector: '[data-tour="overview-container"]',
    descriptionBn: 'আপনার সমস্ত খতিয়ান, দাগের রেকর্ড ও সার্বিক নিরাপত্তা স্কোর একনজরে দেখার কেন্দ্রীয় ড্যাশবোর্ড।',
    descriptionEn: 'Unified dashboard displaying all your khatian records, plot details, and overall property security score.',
    actionTipBn: 'প্রতিটি দাগের রেকর্ড স্থিতি ও নিরাপত্তা স্কোর পর্যবেক্ষণ করুন।',
    actionTipEn: 'Review the security score and health status of each plot below.',
    icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" />,
  },
  {
    id: 'plots-lock',
    category: 'SALE_LOCK',
    titleBn: 'স্মার্ট বিক্রয় লক নিয়ন্ত্রণ',
    titleEn: 'Smart Sale Lock',
    badgeBn: 'বিক্রয় লক',
    badgeEn: 'Sale Lock',
    tab: 'home',
    subTab: 'plots',
    targetSelector: '[data-tour="plots-sale-lock"]',
    fallbackSelector: '[data-tour="plots-container"]',
    descriptionBn: 'অননুমোদিত বিক্রি বা দলিল নিবন্ধন ঠেকাতে এই লক কার্যকর। সক্রিয় থাকলে সাব-রেজিস্ট্রারে বিক্রয় ব্লক থাকবে।',
    descriptionEn: 'Prevents fraudulent deed registrations. When enabled, sub-registrars are blocked from processing sales.',
    actionTipBn: '১-ক্লিকে সুইচটিতে চাপ দিয়ে বিক্রয় লক চালু বা বন্ধ করুন।',
    actionTipEn: 'Use the 1-click toggle anytime to lock or unlock your plot.',
    icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />,
  },
  {
    id: 'passport',
    category: 'PASSPORT',
    titleBn: 'জমির ডিজিটাল পাসপোর্ট ও নিরীক্ষা',
    titleEn: 'Digital Land Passport',
    badgeBn: 'পাসপোর্ট',
    badgeEn: 'Passport',
    tab: 'home',
    subTab: 'plots',
    targetSelector: '[data-tour="land-passport-btn"]',
    fallbackSelector: '[data-tour="plots-container"]',
    descriptionBn: 'প্রতিটি দাগের ব্যাংক ঋণ (লিয়েন), দেওয়ানি মামলা ও সরকারি অধিগ্রহণ রেকর্ড যাচাই করুন।',
    descriptionEn: 'Inspect property health cards showing bank liens, civil court cases, and acquisition notices.',
    actionTipBn: '"সুরক্ষা সনদ" বাটনে ক্লিক করে ডিজিটাল সনদপত্র ও কিউআর সিল দেখুন।',
    actionTipEn: 'Click "Security Certificate" to view the digital verification seal.',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />,
  },
  {
    id: 'docs',
    category: 'VAULT',
    titleBn: 'ডিজিটাল পর্চা ও খতিয়ান ভল্ট',
    titleEn: 'Official Khatian Vault',
    badgeBn: 'ভল্ট',
    badgeEn: 'Vault',
    tab: 'home',
    subTab: 'docs',
    targetSelector: '[data-tour="docs-vault-container"]',
    descriptionBn: 'আরএস/বিএস খতিয়ান ও খাজনা দাখিলার ডিজিটাল ওয়াটারমার্ক ও কিউআর সিলযুক্ত কপি সরাসরি সংরক্ষণ করুন।',
    descriptionEn: 'Access verified RS/BS khatians and tax receipts with official digital watermarks and QR seals.',
    actionTipBn: 'দাগ নির্বাচন করে সংশ্লিষ্ট সকল সরকারি নথি ডাউনলোড করুন।',
    actionTipEn: 'Select any plot from the list to inspect and download verified documents.',
    icon: <FolderOpen className="w-3.5 h-3.5 text-indigo-600" />,
  },
  {
    id: 'deeds',
    category: 'DEEDS',
    titleBn: 'সাব-রেজিস্ট্রি বালাম ও দলিল',
    titleEn: 'Sub-Registry Deeds Ledger',
    badgeBn: 'দলিল রেকর্ড',
    badgeEn: 'Deeds Ledger',
    tab: 'home',
    subTab: 'deeds',
    targetSelector: '[data-tour="deeds-table-container"]',
    descriptionBn: 'নিবন্ধিত মূল কবলা, হেবা বা বায়া দলিলের বালাম নম্বর, তারিখ ও মালিকানা চেইনের তথ্য সংরক্ষিত।',
    descriptionEn: 'Review all registered deeds recorded under your name with volume references and ownership history.',
    actionTipBn: 'দলিলের পাশে চোখের আইকনে ক্লিক করে বিবরণ ও কিউআর সিল দেখুন।',
    actionTipEn: 'Click the eye icon next to any deed to view full details and QR seal.',
    icon: <FileCheck className="w-3.5 h-3.5 text-emerald-600" />,
  },
  {
    id: 'transfers',
    category: 'MUTATION',
    titleBn: 'নামজারি ও আবেদন ট্র্যাকার',
    titleEn: 'Mutation Application Tracker',
    badgeBn: 'নামজারি ট্র্যাকার',
    badgeEn: 'Mutation Tracker',
    tab: 'home',
    subTab: 'transfers',
    targetSelector: '[data-tour="transfers-timeline-container"]',
    descriptionBn: 'নামজারি আবেদন বর্তমানে কোন টেবিলে আছে (এসি ল্যান্ড বা তহশিলদার), তা লাইভ টাইমলাইনে ট্র্যাক করুন।',
    descriptionEn: 'Track mutation applications across all official stages from land office to field verification.',
    actionTipBn: '"নতুন আবেদন" বাটনে ক্লিক করে সরাসরি হস্তান্তর শুরু করুন।',
    actionTipEn: 'Click "New Application" to initiate a fresh transfer or mutation submission.',
    icon: <RefreshCw className="w-3.5 h-3.5 text-teal-600" />,
  },
  {
    id: 'disputes',
    category: 'DISPUTES',
    titleBn: 'মালিকানা আপত্তি ও রাজস্ব ট্রাইব্যুনাল',
    titleEn: 'Disputes & Revenue Tribunal',
    badgeBn: 'ট্রাইব্যুনাল',
    badgeEn: 'Tribunal',
    tab: 'home',
    subTab: 'disputes',
    targetSelector: '[data-tour="disputes-tribunal-container"]',
    descriptionBn: 'ভুল রেকর্ড বা অসদুপায়ে নামজারি চেষ্টার বিরুদ্ধে সহকারী কমিশনার (ভূমি) ট্রাইব্যুনালে অনলাইন আপত্তি দাখিল করুন।',
    descriptionEn: 'File statutory objections against fraudulent mutation attempts directly to the AC Land revenue tribunal.',
    actionTipBn: 'ফরমটিতে কারণ ও দাগের তথ্য পূরণ করে অনলাইনে দাখিল করুন।',
    actionTipEn: 'Fill in dispute details to submit directly to the tribunal.',
    icon: <Scale className="w-3.5 h-3.5 text-rose-600" />,
  },
  {
    id: 'profile',
    category: 'PROFILE',
    titleBn: 'প্রোফাইল ও নিরাপত্তা সেটিংস',
    titleEn: 'Profile & Security',
    badgeBn: 'নিরাপত্তা',
    badgeEn: 'Security',
    tab: 'home',
    targetSelector: '[data-tour="sidebar-user-profile"]',
    fallbackSelector: 'header',
    descriptionBn: 'আপনার ভেরিফাইড এনআইডি, স্মার্ট ল্যান্ডকার্ড এবং পাসওয়ার্ড ও নোটিফিকেশন সেটিংস পরিচালনা করুন।',
    descriptionEn: 'Manage your verified NID card, digital land smartcard, and account security preferences.',
    actionTipBn: 'প্রোফাইলে প্রবেশ করে আপনার ডিজিটাল ল্যান্ড কার্ড ডাউনলোড করুন।',
    actionTipEn: 'Open profile to view and download your verified Digital Land Card.',
    icon: <User className="w-3.5 h-3.5 text-purple-600" />,
  },
];

interface CitizenProductTourProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setActiveSubTab?: (sub: string) => void;
  onNavigateHelpCenter?: () => void;
}

export const CitizenProductTour: React.FC<CitizenProductTourProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  setActiveSubTab,
}) => {
  const { lang, t } = useAppUI();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const step = TOUR_STEPS[currentStepIndex];

  // Navigate to step target in page
  const navigateToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= TOUR_STEPS.length) return;
      const targetStep = TOUR_STEPS[index];
      setCurrentStepIndex(index);
      setIsNavigating(true);

      // Switch top-level tab if needed
      if (targetStep.tab && activeTab !== targetStep.tab) {
        setActiveTab(targetStep.tab);
      }

      // Switch citizen sub-tab if needed
      if (targetStep.subTab) {
        setActiveSubTab?.(targetStep.subTab);
        window.dispatchEvent(new CustomEvent('switch-citizen-tab', { detail: targetStep.subTab }));
      }

      // Wait for DOM to render section, then scroll and position spotlight
      setTimeout(() => {
        let el = document.querySelector(targetStep.targetSelector) as HTMLElement | null;
        if (!el && targetStep.fallbackSelector) {
          el = document.querySelector(targetStep.fallbackSelector) as HTMLElement | null;
        }

        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            if (el) {
              setSpotlightRect(el.getBoundingClientRect());
            }
            setIsNavigating(false);
          }, 200);
        } else {
          setSpotlightRect(null);
          setIsNavigating(false);
        }
      }, 150);
    },
    [activeTab, setActiveTab, setActiveSubTab]
  );

  // Handle tour open
  useEffect(() => {
    if (isOpen) {
      navigateToStep(0);
    } else {
      setSpotlightRect(null);
    }
  }, [isOpen]);

  // Update spotlight on resize / scroll
  useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      const targetStep = TOUR_STEPS[currentStepIndex];
      let el = document.querySelector(targetStep.targetSelector) as HTMLElement | null;
      if (!el && targetStep.fallbackSelector) {
        el = document.querySelector(targetStep.fallbackSelector) as HTMLElement | null;
      }
      if (el) {
        setSpotlightRect(el.getBoundingClientRect());
      }
    };

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, currentStepIndex]);

  // Keyboard navigation (Esc = close, Left/Right = steps)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        if (currentStepIndex < TOUR_STEPS.length - 1) {
          navigateToStep(currentStepIndex + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStepIndex > 0) {
          navigateToStep(currentStepIndex - 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, navigateToStep, onClose]);

  if (!isOpen) return null;

  const totalSteps = TOUR_STEPS.length;
  const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

  // Smart vertical position: if target is in bottom half of viewport, place card near top
  const isTargetInBottomHalf =
    spotlightRect !== null &&
    typeof window !== 'undefined' &&
    spotlightRect.top > window.innerHeight * 0.55;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto overflow-hidden animate-fadeIn font-sans">
      {/* 1. Backdrop Dimmer & Clean Spotlight Cutout */}
      {spotlightRect ? (
        <div
          className="fixed transition-all duration-300 ease-out pointer-events-none rounded-xl border border-emerald-400 ring-2 ring-emerald-500/40"
          style={{
            top: `${Math.max(6, spotlightRect.top - 4)}px`,
            left: `${Math.max(6, spotlightRect.left - 4)}px`,
            width: `${spotlightRect.width + 8}px`,
            height: `${spotlightRect.height + 8}px`,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.40)',
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] transition-opacity duration-300 pointer-events-none" />
      )}

      {/* 2. Sleek Floating Tour Card (Compact, Non-Intrusive, Space-Optimized) */}
      <div
        className={`fixed ${
          isTargetInBottomHalf ? 'top-3 sm:top-5' : 'bottom-3 sm:bottom-5'
        } right-3 sm:right-6 left-3 sm:left-auto sm:w-[350px] md:w-[360px] z-[105] transition-all duration-300 ease-out`}
      >
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200/95 dark:border-slate-800 overflow-hidden flex flex-col">
          {/* Top Progress Line */}
          <div className="h-1 bg-slate-100 dark:bg-slate-800 w-full">
            <div
              className="h-full bg-[#006A4E] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Card Header: Compact & Clean */}
          <div className="px-3.5 py-2.5 flex items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#006A4E] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/80">
                {step.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded">
                    {lang === 'bn'
                      ? `${toBanglaDigits(currentStepIndex + 1, lang)}/${toBanglaDigits(totalSteps, lang)}`
                      : `${currentStepIndex + 1}/${totalSteps}`}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 truncate">
                    {lang === 'bn' ? step.badgeBn : step.badgeEn}
                  </span>
                </div>
                <h3 className="text-xs sm:text-[13px] font-black text-slate-900 dark:text-white leading-tight truncate mt-1">
                  {lang === 'bn' ? step.titleBn : step.titleEn}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={t('ট্যুর বন্ধ করুন', 'Close Tour')}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card Body: Punchy & Space-Optimized */}
          <div className="p-3 space-y-2">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {lang === 'bn' ? step.descriptionBn : step.descriptionEn}
            </p>

            {/* Compact Action Tip */}
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200">
              <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="leading-tight">{lang === 'bn' ? step.actionTipBn : step.actionTipEn}</span>
            </div>
          </div>

          {/* Card Footer: Streamlined Controls */}
          <div className="px-3 py-2 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            {/* Left: Skip Tour */}
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
            >
              {t('স্কিপ', 'Skip')}
            </button>

            {/* Center: Step Indicator Dots */}
            <div className="flex items-center gap-1">
              {TOUR_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => navigateToStep(idx)}
                  className={`transition-all rounded-full cursor-pointer ${
                    currentStepIndex === idx
                      ? 'w-3.5 h-1.5 bg-[#006A4E]'
                      : 'w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                  }`}
                  title={`Step ${idx + 1}`}
                />
              ))}
            </div>

            {/* Right: Back & Next Buttons */}
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentStepIndex === 0 || isNavigating}
                onClick={() => navigateToStep(currentStepIndex - 1)}
                className="h-7 px-2 text-[11px] font-semibold rounded-md border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3 mr-0.5" />
                {t('আগে', 'Prev')}
              </Button>

              {currentStepIndex < totalSteps - 1 ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={isNavigating}
                  onClick={() => navigateToStep(currentStepIndex + 1)}
                  className="h-7 px-2.5 text-[11px] font-bold rounded-md bg-[#006A4E] hover:bg-[#00553e] text-white shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <span>{t('পরে', 'Next')}</span>
                  <ArrowRight className="w-3 h-3" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={onClose}
                  className="h-7 px-2.5 text-[11px] font-bold rounded-md bg-[#006A4E] hover:bg-[#00553e] text-white shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{t('শেষ', 'Done')}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
