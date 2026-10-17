import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi, ServiceFeeItem } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
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
  ExternalLink,
  Coins,
  CheckCircle2
} from 'lucide-react';

export const HelpPage: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { t, lang } = useAppUI();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [feesList, setFeesList] = useState<ServiceFeeItem[]>([]);
  const [feesLoading, setFeesLoading] = useState(true);

  useEffect(() => {
    BhumiApi.listPublicFees()
      .then((res) => {
        setFeesList(res.items || []);
        setFeesLoading(false);
      })
      .catch(() => setFeesLoading(false));
  }, []);

  const faqs = [
    {
      q_bn: '১. ভূমি সুরক্ষা (BhumiShield) কীভাবে বাংলাদেশের জমি জালিয়াতি বন্ধ করে?',
      q_en: '1. How does BhumiShield prevent land registry fraud in Bangladesh?',
      a_bn: 'ঐতিহ্যগতভাবে বাংলাদেশের সাব-রেজিস্ট্রি এবং এসি ল্যান্ড (ভূমি অফিস) দুটি ভিন্ন মন্ত্রণালয় ও ডাটাবেজে বিচ্ছিন্নভাবে কাজ করে। এই ফাঁকফোকরে এক জমি বারবার বিক্রি, জাল দলিলে জমি রেজিস্ট্রি বা ওয়ারিশ বঞ্চিত করার মতো ঘটনা ঘটে। ভূমি সুরক্ষা ১১টি স্বয়ংক্রিয় প্রাক-নিবন্ধন রুলস ইঞ্জিন ও ক্রিপ্টোগ্রাফিক লেজারের মাধ্যমে প্রতিটি দলিল নিবন্ধনের পূর্বেই যাচাই করে এবং অনুমোদনের পর Ed25519 স্বাক্ষর ও QR কোড দ্বারা প্ল্যাটফর্মের অভ্যন্তরে অপরিবর্তনীয় প্রমাণ সংরক্ষণ করে।',
      a_en: 'Historically, the Sub-Registry (Law Ministry) and AC Land (Land Ministry) operate in separate silos. Fraudsters exploit this gap to double-sell land or forge deeds. BhumiShield bridges them with an automated 11-rule gatekeeper and Ed25519 cryptographic hash ledger before registration, recording tamper-evident audit proofs.'
    },
    {
      q_bn: '২. "জমি কেনার আগে যাচাই করুন" (Check Before You Buy) ফিচারের কাজ কী?',
      q_en: '2. What is the "Check Before You Buy" feature?',
      a_bn: 'বয়নামাপত্র সম্পাদন বা বায়না টাকা দেওয়ার আগে যেকোনো নাগরিক মাত্র ৩ ক্লিকে দাগ নম্বর ও বিক্রেতার এনআইডি দিয়ে দেখতে পারবেন: (১) বিক্রেতার নাম প্রযোজ্য খতিয়ানে আছে কি না, (২) বিক্রেতার অংশে পর্যাপ্ত জমি বাকি আছে কি না, (৩) কোনো ব্যাংকে জমিটি বন্ধক (Mortgage) আছে কি না, এবং (৪) জমিতে কোনো বিক্রয় লক বা দেওয়ানি বিরোধ রয়েছে কি না।',
      a_en: 'Before paying earnest money, any citizen can enter the plot dag and seller NID in 3 clicks to verify: (1) Seller name on applicable operative khatian, (2) Remaining share balance, (3) Active bank mortgage liens, and (4) Citizen sale locks or court disputes.'
    },
    {
      q_bn: '৩. নাগরিক ডিজিটাল বিক্রয় লক (Citizen Sale Lock) কী এবং কীভাবে কাজ করে?',
      q_en: '3. What is the Citizen Sale Lock and how does it work?',
      a_bn: 'প্রবাসী বাংলাদেশি (NRB), বয়োবৃদ্ধ ও একক মালিকদের জমি তাদের অজান্তে ভুয়া আমমোক্তারনামা বা জাল দলিলে রেজিস্ট্রি ঠেকাতে এই নিয়ন্ত্রণ কাজ করে। জমির রেকর্ডীয় মালিক নিজ ভল্ট থেকে সরাসরি বিক্রয় লক সক্রিয় বা নিষ্ক্রিয় করতে পারেন (লক পরিবর্তনের জন্য বর্তমান পাসওয়ার্ড বা পিন যাচাই বাধ্যতামূলক)। লক সক্রিয় থাকা অবস্থায় সাব-রেজিস্ট্রার প্যানেলে যে কোনো দলিল নিবন্ধন ১১-রুল গেটকিপার দ্বারা তাৎক্ষণিকভাবে আটকে যায়।',
      a_en: 'Targeted at non-resident Bangladeshis (NRBs) and vulnerable landowners, this security control enables authenticated plot owners to lock their land directly from the Citizen Vault (requiring password verification). When active, the gatekeeper rules strictly abort any pre-registration or deed execution until unlocked by the authenticated owner.'
    },
    {
      q_bn: '৪. সিএস (CS), এসএ (SA), আরএস (RS) ও বিএস (BS) খতিয়ান শৃঙ্খল কীভাবে কাজ করে?',
      q_en: '4. How does the CS, SA, RS, and BS Khatian lineage chain work across regions?',
      a_bn: 'বাংলাদেশে জমি সংক্রান্ত যেকোনো মালিকানার বৈধতা ঐতিহাসিক জরিপ শৃঙ্খলের ওপর নির্ভর করে। তবে এই জরিপসমূহ অঞ্চলভেদে ধাপে ধাপে পরিচালিত হয়েছে: ব্রিটিশ ভারতের সিএস (১৮৮৮-১৯৪০) → পাকিস্তান আমলের এসএ (১৯৫৬-১৯৬৩) → স্বাধীন বাংলাদেশের আরএস (অঞ্চলভেদে ১৯৬৫-১৯৯০ দশক) → এবং আধুনিক বিএস/সিটি/বিডিএস জরিপ। কোনো কোনো জেলায় আরএস এখনও সর্বশেষ প্রকাশিত ও কার্যকর রেকর্ড; ঢাকা মহানগরে সিটি জরিপ প্রযোজ্য, আবার বহু উপজেলায় বিএস চূড়ান্ত হয়েছে। ভূমি সুরক্ষা নির্দিষ্ট মৌজায় প্রযোজ্য কার্যকর জরিপ অনুযায়ী মালিকানার গাণিতিক ধারাবাহিকতা নিরীক্ষা করে।',
      a_en: 'Title validation relies on survey lineage, but epochs vary by region: British CS (1888-1940) -> East Pakistan SA (1956-1963) -> Bangladesh RS (1965-1990s depending on district) -> and modern BS / City / BDS surveys. In areas where BS is pending, RS remains the latest operative record-of-rights. BhumiShield verifies continuity against the applicable operative survey for that specific mouza.'
    },
    {
      q_bn: '৫. সাব-রেজিস্ট্রার কর্তৃক দলিল নিবন্ধনের পর ই-মিউটেশন কীভাবে সম্পন্ন হয়?',
      q_en: '5. How does e-Mutation happen automatically after deed registration?',
      a_bn: 'দলিল নিবন্ধিত ও ডিজিটাল স্বাক্ষরিত হওয়া মাত্রই ব্যাকএন্ড অটোমেশনের মাধ্যমে নামজারি আবেদন তাৎক্ষণিকভাবে সংশ্লিষ্ট এসি ল্যান্ডের ডিজিটাল কিউতে (Queue) প্রেরিত হয়। এসি ল্যান্ড শুনানির পর অনুমোদন দিলে ক্রেতার নামে মিউটেশন ও বিএস খতিয়ান সমন্বয় সৃষ্টি হয় এবং বিক্রেতার সংরক্ষিত অংশ থেকে জমি বিয়োগ হয়।',
      a_en: 'The moment a deed is registered and cryptographically signed, an e-Mutation case is immediately pushed to the AC Land queue. Once approved by the AC Land, the seller’s share is deducted and a new mutated holding is created for the buyer.'
    },
    {
      q_bn: '৬. ব্যাংক ও আর্থিক প্রতিষ্ঠান কীভাবে দ্বৈত বন্ধক (Double Mortgage) রোধ করবে?',
      q_en: '6. How do banks and financial institutions prevent double mortgaging?',
      a_bn: 'যে কোনো বাণিজ্যিক ব্যাংক ঋণ মঞ্জুর করার পূর্বে দাগ নম্বরের ওপর রিয়েল-টাইম লিয়েন চেক চালাতে পারে। ঋণ মঞ্জুর হলে সাথে সাথে ডিজিটাল লিয়েন লক রেজিস্ট্রি হয়, যাতে অন্য কোনো ব্যাংক বা সাব-রেজিস্ট্রি উক্ত দাগের হস্তান্তর করতে না পারে। ঋণ পরিশোধের পর Ed25519 স্বাক্ষরিত যাচাইযোগ্য ডিজিটাল NOC ইস্যু করা হয়।',
      a_en: 'Banks check real-time liens by plot Dag. Upon sanction, an immutable lien lock is stamped on the plot ledger, barring duplicate mortgages at other lenders. When repaid, a cryptographic verifiable Digital NOC is released.'
    }
  ];

  const glossaryTerms = [
    {
      term_bn: 'সিএস জরিপ (CS Survey)',
      term_en: 'Cadastral Survey (1888–1940)',
      desc_bn: 'ব্রিটিশ ভারতের প্রথম বৈজ্ঞানিক জরিপ ও নকশা প্রণয়ন। ঐতিহাসিক মালিকানা অনুসন্ধানের আদি ভিত্তি।',
      desc_en: 'First scientific survey and mapping under British India; primary historical baseline for land title.'
    },
    {
      term_bn: 'এসএ খতিয়ান (SA Survey)',
      term_en: 'State Acquisition (1956–1963)',
      desc_bn: 'জমিদারি প্রথা উচ্ছেদের পর রাষ্ট্রীয় অধিগ্রহণ ও প্রজাস্বত্ব আইনের অধীনে প্রণীত রেকর্ড।',
      desc_en: 'Record-of-rights created following abolition of the Zamindari system under the 1950 Tenancy Act.'
    },
    {
      term_bn: 'আরএস জরিপ (RS Survey)',
      term_en: 'Revisional Survey (1965–1990s)',
      desc_bn: 'সিএস ও এসএ-এর ভুলত্রুটি সংশোধনপূর্বক জেলাভিত্তিক পরিচালিত রিভিশনাল জরিপ। বহু অঞ্চলে এটিই সর্বশেষ কার্যকর রেকর্ড।',
      desc_en: 'District-wise revisional survey correcting past anomalies; remains the latest final record in multiple regions.'
    },
    {
      term_bn: 'বিএস / সিটি / বিডিএস জরিপ (BS & BDS)',
      term_en: 'Bangladesh Survey / BDS',
      desc_bn: 'আধুনিক বাংলাদেশ জরিপ (বিএস), ঢাকা সিটি জরিপ ও চলমান বাংলাদেশ ডিজিটাল সার্ভে (বিডিএস)। চূড়ান্ত প্রকাশিত হলে এটিই কার্যকর।',
      desc_en: 'Modern Bangladesh Survey (BS), Dhaka City Survey, and ongoing Bangladesh Digital Survey (BDS). Once finalized, it governs.'
    },
    {
      term_bn: 'সাফ কবলা দলিল (Saf Kabala)',
      term_en: 'Absolute Sale Deed',
      desc_bn: 'প্রতিদানের বিনিময়ে জমির পূর্ণাঙ্গ ও স্থায়ী স্বত্ব হস্তান্তর দলিল।',
      desc_en: 'Deed effecting outright and irrevocable transfer of absolute land title for consideration.'
    },
    {
      term_bn: 'হেবা দলিল (Hiba)',
      term_en: 'Gift / Transfer for Affection',
      desc_bn: 'নিকটাত্মীয়দের মধ্যে স্নেহ ও রক্তের সম্পর্কের ভিত্তিতে নিঃশর্ত জমি দান।',
      desc_en: 'Unconditional gift transfer of land between close blood relatives under Islamic jurisprudence.'
    },
    {
      term_bn: 'নামজারি ও জমাভাগ (e-Mutation)',
      term_en: 'e-Mutation & Revenue Splitting',
      desc_bn: 'দলিলমূলে হস্তান্তরিত জমি ক্রেতার নিজস্ব নামে নতুন খতিয়ানভুক্ত ও খাজনা নির্ধারণ করা।',
      desc_en: 'Post-registration process to create a new mutated khatian in the buyer’s name and assess rent.'
    },
    {
      term_bn: 'ডিজিটাল লিয়েন (Mortgage Lien)',
      term_en: 'Bank Collateral Lien',
      desc_bn: 'ব্যাংক ঋণের জামানত হিসেবে জমির ওপর ডিজিটাল আর্থিক অধিকার ও হস্তান্তর অবরুদ্ধকরণ।',
      desc_en: 'Collateral lien registered on a plot to secure commercial bank mortgage financing.'
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

      {/* Official Fee & Circular Registry (Ministry of Land Signed Circular 17 Feb 2026) */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#006A4E]" />
              <h2 className="text-base md:text-lg font-extrabold text-slate-800">
                {t(
                  'সরকারি ফি ও সার্কুলার নির্দেশিকা (অফিসিয়াল রেট)',
                  'Official Land Service Fees & Ministry Circulars'
                )}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {t(
                'ভূমি মন্ত্রণালয়ের ১৭ ফেব্রুয়ারি ২০২৬ তারিখের স্মারক সার্কুলার (স্মারক: ৩১.০০.০০০০.০৪২.৬৮.০১২.২২.৫২) এবং রেজিস্ট্রি বিধিমালা অনুযায়ী নির্ধারিত ফি তালিকা।',
                'Official fees pursuant to Ministry of Land Circular dated 17 February 2026 (Memo: 31.00.0000.042.68.012.22.52) & statutory rules.'
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {t('সার্কুলার: ১৭ ফেব্রুয়ারি ২০২৬', 'Circular: 17 Feb 2026')}
            </span>
          </div>
        </div>

        {/* Fees Cards Grid */}
        {feesLoading ? (
          <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
            {t('সরকারি ফি তালিকা লোড হচ্ছে...', 'Loading official fees registry...')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feesList.map((f) => {
              const isEstimate = Boolean(f.is_estimate);
              const comps = f.components || [];

              return (
                <div
                  key={f.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between space-y-3 hover:border-emerald-300 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                          {f.service_code}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                          {lang === 'bn' ? f.title_bn : f.title_en}
                        </h3>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isEstimate
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {isEstimate
                          ? t('প্রাক্কলিত হার', 'Estimated Rate')
                          : t('সরকারি নির্ধারিত ফি', 'Gazetted Fee')}
                      </span>
                    </div>

                    {/* Amount & Legal Basis */}
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-xl font-extrabold text-[#006A4E] font-mono">
                        {isEstimate
                          ? `~${f.total_bdt}%`
                          : `${toBanglaDigits(f.total_bdt, lang)} ৳`}
                      </span>
                      {isEstimate && (
                        <span className="text-xs text-slate-500">
                          {t('(দলিল মূল্যের আনুমানিক)', '(of declared plot value)')}
                        </span>
                      )}
                    </div>

                    {/* Component Breakdown */}
                    {comps.length > 0 && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          {t('ফি বিভাজন (Breakdown):', 'Fee Breakdown:')}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {comps.map((c, i) => (
                            <span
                              key={i}
                              className="text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-medium"
                            >
                              {lang === 'bn' ? c.name_bn : c.name_en}:{' '}
                              <strong className="text-slate-900 font-mono">
                                {isEstimate ? `${c.amount_bdt}%` : `${toBanglaDigits(c.amount_bdt, lang)} ৳`}
                              </strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer with Circular & External Checkout */}
                  <div className="pt-3 border-t border-slate-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px]">
                    <div className="text-slate-500">
                      <span className="block font-medium text-slate-700">
                        {lang === 'bn' ? f.authority_name_bn : f.authority_name_en}
                      </span>
                      {f.circular_no && (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {f.circular_no}
                        </span>
                      )}
                    </div>
                    {f.source_url && (
                      <a
                        href={f.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-800 font-bold hover:underline shrink-0"
                      >
                        <span>{t('সরকারি পোর্টাল ↗', 'Official Portal ↗')}</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Disclaimer Note */}
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">
              {t('বাধ্যতামূলক সতর্কতা ও সচেতনতা:', 'Important Notice on Land Fees:')}
            </span>
            <p className="text-[11px] leading-relaxed text-amber-800">
              {t(
                'ভূমি সুরক্ষা প্ল্যাটফর্মে কোনো প্রকার নগদ টাকা বা সরকারি ফি গ্রহণ করা হয় না। সকল আবেদন ফি, কোর্ট ফি ও ডিসিআর ফি সরাসরি সরকারি পোর্টালে (যেমন: eporcha.gov.bd, mutation.land.gov.bd) চালানের মাধ্যমে পরিশোধযোগ্য। সাব-রেজিস্ট্রির দলিল রেজিস্ট্রেশন শুল্ক সংশ্লিষ্ট সাব-রেজিস্ট্রার অফিসের আনুষ্ঠানিক মূল্যায়ন দ্বারা চূড়ান্ত হয়।',
                'BhumiShield never collects official fees or government payments. All application fees, court fees, and DCR charges must be paid directly on official government portals (e.g. eporcha.gov.bd, mutation.land.gov.bd). Deed registration duties are assessed authoritatively by the Sub-Registry Office.'
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
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {lang === 'bn' ? term.desc_bn : term.desc_en}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Helpline Card */}
      <div className="bg-gradient-to-r from-[#074f38] to-[#006A4E] text-white rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-sm font-extrabold">
            <PhoneCall className="w-4 h-4 text-emerald-300" />
            <span>{t('সরকারি ভূমি সেবা কল সেন্টার ও অভিযোগ সেল', 'Government Land Call Center & Grievance Cell')}</span>
          </div>
          <p className="text-xs text-slate-200 max-w-xl">
            {t(
              'ভূমি সংক্রান্ত যেকোনো সেবা ও অভিযোগের জন্য ভূমি মন্ত্রণালয়ের কল সেন্টার ১৬১২২ এ ফোন দিন (সরকারি সময়সূচী অনুযায়ী সেবা চালু; টেলিকম অপারেটর নির্ধারিত কল চার্জ প্রযোজ্য)।',
              'For any land services or grievances, call Ministry of Land Call Center 16122 during official service hours (standard telecom charges apply).'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-white/10 px-4 py-2 rounded-xl text-center border border-white/20">
            <span className="text-[10px] text-emerald-200 block uppercase font-bold">Land Helpline</span>
            <span className="text-xl font-extrabold font-mono tracking-wider text-white">১৬১২২</span>
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
          onClick={() => onNavigate('qr')}
          className="px-5 py-3 rounded-lg bg-[#074f38] hover:bg-[#053b2a] text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-colors min-h-[40px]"
        >
          <Lock className="w-4 h-4" />
          <span>{t('দলিল QR কোড যাচাই করুন', 'Verify Deed QR & Hash Chain')}</span>
        </button>

        <button
          onClick={() => onNavigate('admin')}
          className="px-5 py-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-extrabold text-xs flex items-center gap-2 cursor-pointer transition-colors min-h-[40px]"
        >
          <span>{t('RBAC রোল ও নিরাপত্তা নিয়ন্ত্রণ ম্যাট্রিক্স দেখুন', 'Open RBAC Matrix & Security Controls')}</span>
        </button>
      </div>
    </div>
  );
};
