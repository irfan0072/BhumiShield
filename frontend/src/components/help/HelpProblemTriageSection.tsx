import React from 'react';
import { useAppUI } from '../../i18n';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  XOctagon,
  ArrowRight,
  HelpCircle,
  Scale,
  CheckCircle2,
} from 'lucide-react';

interface ProblemCard {
  id: string;
  title_bn: string;
  title_en: string;
  officer_bn: string;
  officer_en: string;
  rule_bn: string;
  rule_en: string;
  docs_bn: string[];
  docs_en: string[];
  solution_bn: string;
  solution_en: string;
}

const COMMON_PROBLEMS: ProblemCard[] = [
  {
    id: 'inheritance',
    title_bn: 'ওয়ারিশি জমি বণ্টন ও ফারায়েজ সংক্রান্ত সমস্যা',
    title_en: 'Inheritance & Succession Share Distribution',
    officer_bn: 'সহকারী কমিশনার (ভূমি) / সাব-রেজিস্ট্রার',
    officer_en: 'AC Land / Sub-Registrar',
    rule_bn: 'মুসলিম ও পারিবারিক উত্তরাধিকার আইন ও ১৮৮২ সম্পত্তি হস্তান্তর আইন',
    rule_en: 'Muslim Personal Law of Inheritance & Transfer of Property Act 1882',
    docs_bn: ['ইউনিয়ন পরিষদ/সিটি কর্পোরেশন ওয়ারিশান সনদ', 'সকল ওয়ারিশের এনআইডি', 'নিবন্ধিত বণ্টননামা দলিল বা যৌথ সম্মতিপত্র'],
    docs_en: ['Succession Certificate from UP/City Corp', 'All Heirs NIDs', 'Registered Partition Deed or Joint Consent'],
    solution_bn: 'একক কোনো ওয়ারিশ পুরো দাগ বিক্রি করতে পারবেন না। নিবন্ধিত বণ্টননামা সম্পাদন অথবা যৌথ নামজারি খতিয়ান নিশ্চিত করে তবেই নিজের হিস্যা হস্তান্তর করা যাবে।',
    solution_en: 'An individual heir cannot sell the entire plot. Execute a registered partition deed or joint mutation before conveying your specific share.',
  },
  {
    id: 'mutation_delay',
    title_bn: 'নামজারি (e-Mutation) আবেদন বিলম্বিত বা নামঞ্জুর',
    title_en: 'Delayed e-Mutation or Case Rejection Recourse',
    officer_bn: 'সহকারী কমিশনার (ভূমি) / আপিল: এডিসি (রাজস্ব)',
    officer_en: 'AC Land / Appellate: ADC Revenue',
    rule_bn: 'নাগরিক সেবা সনদ (২৮ কার্যদিবস সময়সীমা) ও ১৯৫০ প্রজাস্বত্ব আইন ১৪৩ ধারা',
    rule_en: 'Citizen Charter (28 Working Days SLA) & SAT Act 1950 Sec 143',
    docs_bn: ['নামজারি আবেদন ট্র্যাকিং নম্বর', 'অনলাইন ডিমান্ড স্লিপ', 'মূল দলিল ও মূল খতিয়ানের কপি'],
    docs_en: ['Mutation Tracking Number', 'Online Demand Slip', 'Registered Deed & Parent Khatian Copy'],
    solution_bn: '২৮ কার্যদিবসের মধ্যে শুনানি না হলে বা অহেতুক খারিজ হলে সরাসরি এডিসি (রাজস্ব) বরাবরে ৩০ দিনের মধ্যে রিভিউ আপিল দায়েরের আইনি সুযোগ রয়েছে।',
    solution_en: 'If unaddressed within 28 working days or arbitrarily rejected, a statutory appeal can be filed before ADC (Revenue) within 30 days.',
  },
  {
    id: 'record_error',
    title_bn: 'খতিয়ানে নামের বানান বা দাগের অংশে ভুল সংশোধন',
    title_en: 'Clerical Error in Khatian Name or Plot Share',
    officer_bn: 'সহকারী কমিশনার (ভূমি) / জোনাল সেটেলমেন্ট অফিসার',
    officer_en: 'AC Land / Zonal Settlement Officer (ASO)',
    rule_bn: '১৯৫০ স্টেট একুইজিশন অ্যান্ড টেন্যান্সি অ্যাক্ট ১৪৩-এ ধারা (মিস কেস)',
    rule_en: 'State Acquisition and Tenancy Act 1950 Sec 143A (Miscellaneous Case)',
    docs_bn: ['পূর্ববর্তী কার্যকর খতিয়ান (RS/BS)', 'জাতীয় পরিচয়পত্র ও জন্ম নিবন্ধন', 'খাজনা দাখিলা রশিদ'],
    docs_en: ['Prior Operative Khatian (RS/BS)', 'NID / Birth Certificate', 'Up-to-date Land Tax (Khajna) Receipt'],
    solution_bn: 'বিজ্ঞ এসি ল্যান্ডের নিকট মিস কেস (Misc Case) দায়ের করে আরএস বা বিএস কার্যকর রেকর্ডের রেফারেন্সে নামের করণিক ভুল সংশোধন করিয়ে নতুন খতিয়ান নেওয়া সম্ভব।',
    solution_en: 'File a Miscellaneous Case before AC Land to correct clerical or typographic record errors against parent operative survey records.',
  },
  {
    id: 'court_dispute',
    title_bn: 'জমিতে দেওয়ানি মামলা বা কোর্টের নিষেধাজ্ঞা',
    title_en: 'Civil Court Dispute & Injunction Freeze',
    officer_bn: 'যুগ্ম জেলা জজ আদালত / সাব-রেজিস্ট্রার',
    officer_en: 'Civil Court / Sub-Registrar',
    rule_bn: 'দেওয়ানি কার্যবিধি ১৯০৮ (আদেশ ৩৯, নিয়ম ১-২) নিষেধাজ্ঞা ও লিস পেনডেন্স নীতি',
    rule_en: 'Civil Procedure Code 1908 (Order 39) & Doctrine of Lis Pendens',
    docs_bn: ['দেওয়ানি মামলার আরজি ও নম্বর', 'আদালতের অন্তর্বর্তীকালীন নিষেধাজ্ঞা আদেশ', 'উকিল নোটিশের কপি'],
    docs_en: ['Civil Plaint / Case Number', 'Court Injunction Order', 'Legal Notice Copy'],
    solution_bn: 'আদালতের নিষেধাজ্ঞা বা লিস পেনডেন্স থাকলে ভূমি সুরক্ষা প্ল্যাটফর্মে উক্ত দাগ স্বয়ংক্রিয়ভাবে অবরুদ্ধ থাকে। মামলা নিষ্পত্তি না হওয়া পর্যন্ত হস্তান্তর বৈধ নয়।',
    solution_en: 'Whenever a court freeze is reported, the plot is locked. Title transfer remains prohibited until final adjudication or formal decree.',
  },
];

export const HelpProblemTriageSection: React.FC<{
  onOpenTriageModal: () => void;
  onNavigate: (tab: string) => void;
}> = ({ onOpenTriageModal, onNavigate }) => {
  const { t, lang } = useAppUI();

  return (
    <div className="flex flex-col gap-8">
      {/* Visual Banner in Natural Document Flow with Background */}
      <div
        className="rounded-2xl border border-emerald-500/30 shadow-md p-6 sm:p-8 text-white bg-cover bg-center flex flex-col sm:flex-row sm:items-center justify-between gap-6"
        style={{ backgroundImage: `url('/assets/triage-wizard-banner.svg')`, backgroundColor: '#022c22' }}
      >
        <div className="flex flex-col gap-2 max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-600/90 text-emerald-100 text-xs font-bold border border-emerald-400/40 w-fit backdrop-blur-xs">
            <Sparkles className="size-3.5 text-amber-300" />
            {t('নাগরিক সমস্যা নিরসন ও দিকনির্দেশনা উইজার্ড', 'Citizen Problem Triage Wizard')}
          </span>
          <h2 className="text-xl sm:text-2xl font-black leading-tight">
            {t('আপনার জমি সংক্রান্ত সমস্যা কোন নিয়মে সমাধান হবে?', 'Which rule applies to your specific problem?')}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/95 leading-relaxed font-medium">
            {t(
              'প্রোফাইলে জমি না দেখা, ওয়ারিশি বণ্টন জটিলতা, দাগের ভুল রেকর্ড সংশোধন, কিংবা নামজারি আটকে যাওয়ার মতো যেকোনো সমস্যার সমাধান ৩টি ক্লিকে জেনে নিন।',
              'Find instant legal resolutions, required documents, and competent officers for missing holdings, inheritance disputes, or delayed mutations.'
            )}
          </p>
        </div>

        <Button
          type="button"
          onClick={onOpenTriageModal}
          className="h-11 px-6 rounded-xl bg-white hover:bg-emerald-50 text-[#006A4E] font-black text-xs sm:text-sm shadow-md transition-all shrink-0 cursor-pointer flex items-center justify-center gap-2 border border-emerald-100"
        >
          <HelpCircle className="size-4 text-[#006A4E]" />
          <span>{t('সমস্যার সঠিক সমাধান খুঁজুন ↗', 'Launch Problem Wizard ↗')}</span>
        </Button>
      </div>

      {/* 4 Common Problems Grid */}
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
            <Scale className="size-5 text-[#006A4E]" />
            <span>{t('সর্বাধিক সাধারণ ৪টি নাগরিক সমস্যা ও সমাধান নির্দেশিকা', 'Top 4 Common Land Issues & Resolution Guidelines')}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {t(
              'বাংলাদেশের ভূমি আইনে প্রতিটি সমস্যার সমাধানের জন্য আলাদা দায়িত্বপ্রাপ্ত কর্মকর্তা ও আইনি পদ্ধতি রয়েছে।',
              'Bangladesh land law establishes distinct authorities and administrative paths for each land problem category.'
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COMMON_PROBLEMS.map((problem) => (
            <Card key={problem.id} className="border-slate-200/90 shadow-2xs hover:border-[#006A4E]/40 transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="text-[11px] bg-slate-50 text-slate-700 font-semibold border-slate-200">
                    {lang === 'bn' ? problem.officer_bn : problem.officer_en}
                  </Badge>
                  <span className="text-[10px] font-mono font-semibold text-slate-400">ID: {problem.id}</span>
                </div>
                <CardTitle className="text-sm sm:text-base font-extrabold text-slate-900 mt-2">
                  {lang === 'bn' ? problem.title_bn : problem.title_en}
                </CardTitle>
                <CardDescription className="text-xs text-[#006A4E] font-semibold">
                  {lang === 'bn' ? problem.rule_bn : problem.rule_en}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-col gap-3 text-xs text-slate-700">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 leading-relaxed">
                  <strong className="text-slate-900 block mb-1">{t('আইনি সমাধান ও করণীয়:', 'Legal Recourse & Solution:')}</strong>
                  {lang === 'bn' ? problem.solution_bn : problem.solution_en}
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-bold text-slate-800 text-[11px]">
                    {t('প্রয়োজনীয় কাগজপত্র:', 'Required Documents Checklist:')}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(lang === 'bn' ? problem.docs_bn : problem.docs_en).map((doc, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200/70">
                        <CheckCircle2 className="size-3 text-[#006A4E]" />
                        <span>{doc}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenTriageModal}
                  className="h-8 text-xs text-[#006A4E] font-bold hover:bg-emerald-50 gap-1.5 cursor-pointer"
                >
                  <span>{t('এই সমস্যায় সহায়তা নিন', 'Get Assistance')}</span>
                  <ArrowRight className="size-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('check')}
                  className="h-8 text-xs text-slate-600 hover:text-slate-900"
                >
                  {t('দাগ যাচাই', 'Verify Dag')}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* 3-Tier Risk Verdict Guide */}
      <Card className="border-slate-200/90 shadow-2xs">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="size-5 text-[#006A4E]" />
                <span>{t('৩-স্তরের স্বয়ংক্রিয় ঝুঁকি নির্ণয় ব্যবস্থা (Risk Verdict Reference)', '3-Tier Automated Risk Verdict System')}</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-1">
                {t(
                  'ভূমি সুরক্ষা প্রতিটি জমি যাচাইয়ের পর ৩টি রঙ ও স্তরে ফলাফল প্রদর্শন করে। ক্রেতা ও নাগরিকের করণীয় জেনে নিন।',
                  'BhumiShield outputs results across three distinct colour-coded tiers with transparent explanation.'
                )}
              </CardDescription>
            </div>
            <Badge className="bg-[#E6F2EE] text-[#006A4E] border border-[#006A4E]/30 font-bold">
              11-Rule Engine
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Green / Safe */}
            <div className="p-4 rounded-xl bg-emerald-50/70 border-2 border-emerald-500/40 flex flex-col gap-2">
              <div className="flex items-center gap-2 font-extrabold text-sm text-[#006A4E]">
                <ShieldCheck className="size-5 shrink-0" />
                <span>{t('✔ নিরাপদ ও পরীক্ষিত (সবুজ)', '✔ Safe & Verified (Green)')}</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {t(
                  'বিক্রেতার নাম সর্বশেষ বিএস খতিয়ানে আছে, বিক্রয় লক নিষ্ক্রিয়, হস্তান্তরিত জমির পরিমাণ সীমার ভেতরে এবং কোনো ব্যাংক মর্টগেজ বা দেওয়ানি মামলা নেই।',
                  'Seller is on the latest BS khatian, plot is unlocked, area is within share, and no active mortgage or dispute exists.'
                )}
              </p>
              <div className="mt-auto pt-2 border-t border-emerald-200/60 text-[11px] font-bold text-emerald-800">
                {t('নাগরিক করণীয়: নিশ্চিন্তে বায়না বা দলিল সম্পাদন প্রক্রিয়া শুরু করতে পারেন।', 'Next step: Proceed with earnest agreement or deed draft.')}
              </div>
            </div>

            {/* Amber / Review */}
            <div className="p-4 rounded-xl bg-amber-50/70 border-2 border-amber-500/40 flex flex-col gap-2">
              <div className="flex items-center gap-2 font-extrabold text-sm text-amber-800">
                <AlertTriangle className="size-5 shrink-0 text-amber-600" />
                <span>{t('⚠ সতর্কতা ও পর্যালোচনা (হলুদ)', '⚠ Needs Review (Amber)')}</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {t(
                  'আরএস থেকে বিএস খতিয়ানে জমির পরিমাণে ফারাক আছে, ওয়ারিশ বণ্টন সনদ বা ফারায়েজের হিসাব অসম্পূর্ণ অথবা নাগরিক বিরোধ শুনানাধীন।',
                  'RS-to-BS khatian chain discrepancy, unresolved inheritance shares, or open citizen dispute under hearing.'
                )}
              </p>
              <div className="mt-auto pt-2 border-t border-amber-200/60 text-[11px] font-bold text-amber-800">
                {t('নাগরিক করণীয়: বায়না টাকা আটকে রেখে ভূমি অফিসে রেকর্ড যাচাই করুন।', 'Next step: Hold earnest payment until manual land office verification.')}
              </div>
            </div>

            {/* Red / Blocked */}
            <div className="p-4 rounded-xl bg-rose-50/70 border-2 border-rose-500/40 flex flex-col gap-2">
              <div className="flex items-center gap-2 font-extrabold text-sm text-rose-800">
                <XOctagon className="size-5 shrink-0 text-rose-600" />
                <span>{t('✖ উচ্চ ঝুঁকিপূর্ণ / নিষিদ্ধ (লাল)', '✖ High Risk / Blocked (Red)')}</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {t(
                  'মালিকের ডিজিটাল বিক্রয় লক সক্রিয়, বিক্রেতা জমির মালিক নন, পূর্বে অন্য ব্যাংকে মর্টগেজ দেওয়া আছে অথবা দলিলের ডিজিটাল হ্যাশ অমিল।',
                  'Owner sale lock active, seller is not the owner, plot already sold/mortgaged, or cryptographic hash mismatch.'
                )}
              </p>
              <div className="mt-auto pt-2 border-t border-rose-200/60 text-[11px] font-bold text-rose-800">
                {t('নাগরিক করণীয়: এই জমিতে কোনো প্রকার অর্থ লেনদেন করবেন না; প্রতারণার ঝুঁকি রয়েছে।', 'Next step: Do NOT pay any money. High risk of fraud.')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
