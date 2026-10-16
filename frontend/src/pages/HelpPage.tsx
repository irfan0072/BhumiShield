import React, { useState } from 'react';
import { useAppUI } from '../i18n';
import {
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
  XOctagon,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BookOpen,
  PhoneCall,
  Lock,
  Layers,
  FileText,
  Building2,
  ExternalLink
} from 'lucide-react';

export const HelpPage: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { t, lang } = useAppUI();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const faqs = [
    {
      q_bn: '১. ভূমি সুরক্ষা (BhumiShield) কীভাবে বাংলাদেশের জমি জালিয়াতি বন্ধ করে?',
      q_en: '1. How does BhumiShield prevent land registry fraud in Bangladesh?',
      a_bn: 'ঐতিহ্যগতভাবে বাংলাদেশের সাব-রেজিস্ট্রি এবং এসি ল্যান্ড (ভূমি অফিস) দুটি ভিন্ন মন্ত্রণালয় ও ডাটাবেজে বিচ্ছিন্নভাবে কাজ করে। এই ফাঁকফোকরে এক জমি বারবার বিক্রি, জাল দলিলে জমি রেজিস্ট্রি বা ওয়ারিশ বঞ্চিত করার মতো ঘটনা ঘটে। ভূমি সুরক্ষা ১১টি স্বয়ংক্রিয় প্রাক-নিবন্ধন রুলস ইঞ্জিন ও ক্রিপ্টোগ্রাফিক লেজারের মাধ্যমে প্রতিটি দলিল নিবন্ধনের পূর্বেই যাচাই করে এবং অনুমোদনের পর Ed25519 স্বাক্ষর ও QR কোড দ্বারা চিরতরে অপরিবর্তনীয় করে দেয়।',
      a_en: 'Historically, the Sub-Registry (Law Ministry) and AC Land (Land Ministry) operate in separate silos. Fraudsters exploit this gap to double-sell land or forge deeds. BhumiShield bridges them with an automated 11-rule gatekeeper and Ed25519 cryptographic hash ledger before registration, rendering silent tampering impossible.'
    },
    {
      q_bn: '২. "জমি কেনার আগে যাচাই করুন" (Check Before You Buy) ফিচারের কাজ কী?',
      q_en: '2. What is the "Check Before You Buy" feature?',
      a_bn: 'বয়নামাপত্র সম্পাদন বা বায়না টাকা দেওয়ার আগে যেকোনো নাগরিক মাত্র ৩ ক্লিকে দাগ নম্বর ও বিক্রেতার এনআইডি দিয়ে দেখতে পারবেন: (১) বিক্রেতার নাম বিএস খতিয়ানে আছে কি না, (২) বিক্রেতার অংশে পর্যাপ্ত জমি বাকি আছে কি না, (৩) কোনো ব্যাংকে জমিটি বন্ধক (Mortgage) আছে কি না, এবং (৪) জমিতে কোনো বিক্রয় লক বা দেওয়ানি বিরোধ রয়েছে কি না।',
      a_en: 'Before paying earnest money, any citizen can enter the plot dag and seller NID in 3 clicks to verify: (1) Seller name on BS khatian, (2) Remaining share balance, (3) Active bank mortgage liens, and (4) Citizen sale locks or court disputes.'
    },
    {
      q_bn: '৩. নাগরিক ডিজিটাল বিক্রয় লক (Citizen Sale Lock) কী এবং কাদের জন্য প্রয়োজনীয়?',
      q_en: '3. What is the Citizen Biometric Sale Lock and who needs it?',
      a_bn: 'বিশেষ করে প্রবাসী বাংলাদেশি (NRB), বয়োবৃদ্ধ ও একক বিধবা নারীদের জমি তাদের অজান্তে ভুয়া আমমোক্তারনামা বা জাল দলিলে রেজিস্ট্রি করে ফেলার বহু নজির রয়েছে। এই বিক্রয় লক সক্রিয় থাকলে সাব-রেজিস্ট্রারের সিস্টেমে দাগটি সম্পূর্ণ লক থাকবে; নাগরিক নিজ NID/বায়োমেট্রিক ও OTP দিয়ে আনলক না করা পর্যন্ত কেউ সেই জমি রেজিস্ট্রি করতে পারবে না।',
      a_en: 'Targeted at non-resident Bangladeshis (NRBs) and vulnerable landowners, the Sale Lock allows owners to freeze their plots. Even if a corrupt officer attempts to register a deed, the 11-rule engine strictly aborts until the authentic owner unlocks it via NID/OTP.'
    },
    {
      q_bn: '৪. সিএস (CS), এসএ (SA), আরএস (RS) ও বিএস (BS) খতিয়ান চেইন কী?',
      q_en: '4. What is the CS, SA, RS, and BS Khatian lineage chain?',
      a_bn: 'বাংলাদেশে জমি সংক্রান্ত যেকোনো মালিকানার বৈধতা চারটি ঐতিহাসিক জরিপের ওপর নির্ভর করে: ব্রিটিশ আমলের সিএস (১৯৪০) → পাকিস্তান আমলের এসএ (১৯৬২) → স্বাধীন বাংলাদেশের আরএস (১৯৮৫) → আধুনিক বিএস বা সিটি জরিপ (২০১২)। একটি নিরেট মালিকানা প্রমাণের জন্য এই চার খতিয়ানের জমির দাগ ও ফারায়েজ অংশ ক্রমান্বয়ে মিলে যেতে হয়।',
      a_en: 'A valid title in Bangladesh requires unbroken lineage across four survey epochs: British CS (1940) -> Pakistan SA (1962) -> Bangladesh RS (1985) -> Modern BS/City Survey (2012). BhumiShield verifies this mathematical continuity automatically.'
    },
    {
      q_bn: '৫. সাব-রেজিস্ট্রার কর্তৃক দলিল নিবন্ধনের পর ই-মিউটেশন কীভাবে সম্পন্ন হয়?',
      q_en: '5. How does e-Mutation happen automatically after deed registration?',
      a_bn: 'দলিল নিবন্ধিত ও ডিজিটাল স্বাক্ষরিত হওয়া মাত্রই ব্যাকএন্ড অটোমেশনের মাধ্যমে নামজারি আবেদন তাৎক্ষণিকভাবে সংশ্লিষ্ট এসি ল্যান্ডের ডিজিটাল কিউতে (Queue) প্রেরিত হয়। এসি ল্যান্ড শুনানির পর এক ক্লিকে অনুমোদন দিলে ক্রেতার নামে নতুন বিএস খতিয়ান সৃষ্টি হয় এবং বিক্রেতার খতিয়ান থেকে জমি বিয়োগ হয়।',
      a_en: 'The moment a deed is registered and cryptographically signed, an e-Mutation case is immediately pushed to the AC Land queue. Once approved by the AC Land, the seller’s share is deducted and a new BS khatian entry is minted for the buyer.'
    },
    {
      q_bn: '৬. ব্যাংক ও আর্থিক প্রতিষ্ঠান কীভাবে দ্বৈত বন্ধক (Double Mortgage) রোধ করবে?',
      q_en: '6. How do banks and financial institutions prevent double mortgaging?',
      a_bn: 'যে কোনো বাণিজ্যিক ব্যাংক ঋণ মঞ্জুর করার পূর্বে দাগ নম্বরের ওপর রিয়েল-টাইম লিয়েন চেক চালাতে পারে। ঋণ মঞ্জুর হলে সাথে সাথে ডিজিটাল লিয়েন লক রেজিস্ট্রি হয়, যাতে অন্য কোনো ব্যাংক বা সাব-রেজিস্ট্রি উক্ত দাগের হস্তান্তর করতে না পারে। ঋণ পরিশোধের পর Ed25519 স্বাক্ষরিত ডিজিটাল NOC ইস্যু করা হয়।',
      a_en: 'Banks check real-time liens by plot Dag. Upon sanction, an immutable lien lock is stamped on the plot ledger, barring duplicate mortgages at other lenders. When repaid, a cryptographic Digital NOC is released.'
    }
  ];

  const glossaryTerms = [
    {
      term_bn: 'সিএস জরিপ (CS Survey)',
      term_en: 'Cadastral Survey (1940)',
      desc_bn: 'ব্রিটিশ ভারতের প্রথম বৈজ্ঞানিক জরিপ ও খতিয়ান। সকল মালিকানা প্রমাণের মূল ভিত্তি।'
    },
    {
      term_bn: 'এসএ খতিয়ান (SA Survey)',
      term_en: 'State Acquisition (1962)',
      desc_bn: 'জমিদারি প্রথা উচ্ছেদের পর প্রজাস্বত্ব আইনের অধীনে প্রণীত খতিয়ান।'
    },
    {
      term_bn: 'আরএস জরিপ (RS Survey)',
      term_en: 'Revisional Survey (1985)',
      desc_bn: 'পূর্ববর্তী ভুলের সংশোধন ও আধুনিকায়নের লক্ষ্যে পরিচালিত জাতীয় জরিপ।'
    },
    {
      term_bn: 'বিএস / সিটি জরিপ (BS Survey)',
      term_en: 'Bangladesh Survey (2012)',
      desc_bn: 'বর্তমানে প্রচলিত সর্বশেষ ও বৈধতম জরিপ। এই খতিয়ানে নাম থাকা বাধ্যতামূলক।'
    },
    {
      term_bn: 'সাফ কবলা দলিল (Saf Kabala)',
      term_en: 'Absolute Sale Deed',
      desc_bn: 'প্রতিদানের বিনিময়ে জমির পূর্ণাঙ্গ ও স্থায়ী স্বত্ব হস্তান্তর দলিল।'
    },
    {
      term_bn: 'হেবা দলিল (Hiba Bil Ewaj)',
      term_en: 'Gift / Transfer for Affection',
      desc_bn: 'নিকটাত্মীয়দের মধ্যে স্নেহ ও রক্তের সম্পর্কের ভিত্তিতে নিঃশর্ত জমি দান।'
    },
    {
      term_bn: 'নামজারি ও জমাভাগ (e-Mutation)',
      term_en: 'e-Mutation & Revenue Splitting',
      desc_bn: 'দলিলমূলে হস্তান্তরিত জমি ক্রেতার নিজস্ব নামে নতুন খতিয়ানভুক্ত ও খাজনা নির্ধারণ করা।'
    },
    {
      term_bn: 'ডিজিটাল লিয়েন (Mortgage Lien)',
      term_en: 'Cryptographic Bank Lien',
      desc_bn: 'ব্যাংক ঋণের জামানত হিসেবে জমির ওপর সরকারি ডিজিটাল আর্থিক অধিকার।'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 md:p-8 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-[#006A4E] shrink-0" />
            <span>
              {t(
                'সহায়িকা, সাধারণ জিজ্ঞাসাসমূহ ও ভূমি পরিভাষা কোষ',
                'Help Center, FAQs & Bangladeshi Land Registry Glossary'
              )}
            </span>
          </h1>
          <span className="self-start md:self-auto text-xs px-3 py-1 rounded-full font-bold bg-[#E6F2EE] text-[#006A4E] border border-[#006A4E]/30">
            LandTech Guide v2.0
          </span>
        </div>

        <p className="text-sm md:text-base text-slate-700 leading-relaxed max-w-4xl font-medium">
          {t(
            '“রেজিস্ট্রেশন এবং নামজারি একে অপরের সাথে কথা বলে না — আমরা সেই সমন্বিত সেতুবন্ধন তৈরি করেছি যা প্রতিটি দলিল নিবন্ধনের আগে স্বয়ংক্রিয়ভাবে যাচাই করে এবং পরে ক্রিপ্টোগ্রাফিক লেজার দ্বারা প্রমাণ করে যে এতে কোনো জালিয়াতি হয়নি।”',
            '“Registration and mutation don’t talk to each other. We built the layer that checks every deed before it is registered, and proves afterwards that it was never tampered with.”'
          )}
        </p>

        {/* 3-Tier Risk Verdict Explanation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-[#E6F2EE] border-2 border-[#006A4E]/40 space-y-2">
            <div className="flex items-center gap-2 font-extrabold text-sm md:text-base text-[#006A4E]">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span>{t('✔ নিরাপদ ও পরীক্ষিত (সবুজ)', '✔ Safe & Verified (Green)')}</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {t(
                'বিক্রেতার নাম সর্বশেষ বিএস খতিয়ানে আছে, বিক্রয় লক নিষ্ক্রিয়, হস্তান্তরিত জমির পরিমাণ সীমার ভেতরে এবং কোনো ব্যাংক মর্টগেজ বা দেওয়ানি মামলা নেই।',
                'Seller is on the latest BS khatian, plot is unlocked, area is within share, and no active mortgage or dispute exists.'
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FEF3C7] border-2 border-[#B7791F]/40 space-y-2">
            <div className="flex items-center gap-2 font-extrabold text-sm md:text-base text-[#B7791F]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{t('⚠ সতর্কতা ও পর্যালোচনা (হলুদ)', '⚠ Needs Review (Amber)')}</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {t(
                'আরএস থেকে বিএস খতিয়ানে জমির পরিমাণে ফারাক আছে, ওয়ারিশ বণ্টন সনদ বা ফারায়েজের হিসাব অসম্পূর্ণ অথবা নাগরিক বিরোধ শুনানাধীন।',
                'RS-to-BS khatian chain discrepancy, unresolved inheritance shares, or open citizen dispute under hearing.'
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FEECEE] border-2 border-[#F42A41]/40 space-y-2">
            <div className="flex items-center gap-2 font-extrabold text-sm md:text-base text-[#F42A41]">
              <XOctagon className="w-5 h-5 shrink-0" />
              <span>{t('✖ উচ্চ ঝুঁকিপূর্ণ / নিষিদ্ধ (লাল)', '✖ High Risk / Blocked (Red)')}</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {t(
                'মালিকের ডিজিটাল বিক্রয় লক সক্রিয়, বিক্রেতা জমির মালিক নন, পূর্বে অন্য ব্যাংকে মর্টগেজ দেওয়া আছে অথবা দলিলের ডিজিটাল হ্যাশ অমিল।',
                'Owner sale lock active, seller is not the owner, plot already sold/mortgaged, or cryptographic hash mismatch.'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive FAQ Accordion */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <BookOpen className="w-5 h-5 text-[#006A4E]" />
          <h2 className="text-base md:text-lg font-extrabold text-slate-800">
            {t('সাধারণ জিজ্ঞাসাসমূহ ও সমাধান (FAQ)', 'Frequently Asked Questions & Answers')}
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="border border-slate-200 rounded-xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4 text-left font-bold text-xs md:text-sm text-slate-800 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between gap-3 cursor-pointer min-h-[44px]"
                >
                  <span>{lang === 'bn' ? faq.q_bn : faq.q_en}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#006A4E] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="p-4 bg-white text-xs md:text-sm text-slate-700 leading-relaxed border-t border-slate-200">
                    {lang === 'bn' ? faq.a_bn : faq.a_en}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bangladeshi Land Glossary Section */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Layers className="w-5 h-5 text-[#006A4E]" />
          <h2 className="text-base md:text-lg font-extrabold text-slate-800">
            {t('বাংলাদেশের ভূমি ও দলিল পরিভাষা কোষ', 'Bangladeshi Land & Deed Registry Glossary')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {glossaryTerms.map((term, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-[#006A4E]/40 transition-colors space-y-1.5"
            >
              <div className="font-extrabold text-xs text-slate-900">{term.term_bn}</div>
              <div className="text-[10px] font-mono text-[#006A4E]">{term.term_en}</div>
              <p className="text-[11px] text-slate-600 leading-relaxed">{term.desc_bn}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Helpline Card */}
      <div className="bg-gradient-to-r from-[#253656] to-[#006A4E] text-white rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-sm font-extrabold">
            <PhoneCall className="w-4 h-4 text-emerald-300" />
            <span>{t('জরুরি ভূমি সেবা ও অভিযোগ হটলাইন', 'Government Land Helpline & Grievance Cell')}</span>
          </div>
          <p className="text-xs text-slate-200 max-w-xl">
            {t(
              'যে কোনো জমি সংক্রান্ত প্রতারণা, ভুয়া খতিয়ান বা ঘুষের দাবির শিকার হলে অবিলম্বে ভূমি মন্ত্রণালয়ের হটলাইনে ফোন দিন।',
              'Report land fraud, forged khatians or illegal registry attempts immediately to the Ministry helpline.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-white/10 px-4 py-2 rounded-xl text-center border border-white/20">
            <span className="text-[10px] text-emerald-200 block uppercase font-bold">Helpline</span>
            <span className="text-xl font-extrabold font-mono tracking-wider text-white">১৬১২২</span>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-xl text-center border border-white/20">
            <span className="text-[10px] text-emerald-200 block uppercase font-bold">Intl Calling</span>
            <span className="text-xs font-bold font-mono text-white">+880 9612 316122</span>
          </div>
        </div>
      </div>

      {/* Bottom Navigation CTA */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => onNavigate('check')}
          className="px-5 py-3 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-colors min-h-[40px]"
        >
          <Sparkles className="w-4 h-4" />
          <span>{t('জমি যাচাই উইজার্ডে যান', 'Go to Check-Before-You-Buy Wizard')}</span>
        </button>

        <button
          onClick={() => onNavigate('verify')}
          className="px-5 py-3 rounded-lg bg-[#253656] hover:bg-[#1a263d] text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-colors min-h-[40px]"
        >
          <Lock className="w-4 h-4" />
          <span>{t('দলিল QR কোড যাচাই করুন', 'Verify Deed QR & Hash Chain')}</span>
        </button>

        <button
          onClick={() => onNavigate('admin')}
          className="px-5 py-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-extrabold text-xs flex items-center gap-2 cursor-pointer transition-colors min-h-[40px]"
        >
          <span>{t('RBAC ম্যাট্রিক্স ও ৮টি ডেমো সিনারিও দেখুন', 'Open RBAC Matrix & 8 Demo Scenarios')}</span>
        </button>
      </div>
    </div>
  );
};
