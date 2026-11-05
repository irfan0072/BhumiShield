import React from 'react';
import { useAppUI } from '../../i18n';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  PhoneCall,
  Clock,
  MapPin,
  ShieldAlert,
  FileText,
  Building2,
} from 'lucide-react';

export const HelpContactSection: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { t, lang } = useAppUI();

  return (
    <div className="flex flex-col gap-8">
      {/* Visual 16122 Call Center Feature Card in Natural Flow */}
      <div
        className="rounded-2xl border border-emerald-500/40 shadow-md p-6 sm:p-8 text-white bg-cover bg-center flex flex-col sm:flex-row sm:items-center justify-between gap-6"
        style={{ backgroundImage: `url('/assets/hotline-16122.svg')`, backgroundColor: '#022c22' }}
      >
        <div className="flex flex-col gap-2 max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-600/90 text-emerald-100 text-xs font-bold border border-emerald-400/40 w-fit backdrop-blur-xs">
            <PhoneCall className="size-3.5" />
            {t('সরকারি ভূমি সেবা কল সেন্টার', 'Government Land Call Center')}
          </span>
          <h2 className="text-xl sm:text-2xl font-black leading-tight">
            {t('হটলাইন ১৬১২২ — যে কোনো ভূমি জিজ্ঞাসা ও প্রতিকার', 'Land Helpline 16122 — Inquiries & Grievances')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
            {t(
              'সরকারি কর্মদিবসে সকাল ৯টা থেকে রাত ৮টা পর্যন্ত যে কোনো মোবাইল অপারেটর থেকে কল দিন (স্ট্যান্ডার্ড টেলিকম কল চার্জ প্রযোজ্য)।',
              'Call from any mobile network on official working days 9:00 AM to 8:00 PM (standard telecom call charges apply).'
            )}
          </p>
        </div>

        <a
          href="tel:16122"
          className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all shrink-0 cursor-pointer"
        >
          <PhoneCall className="size-4" />
          <span>{t('এখনই কল করুন (১৬১২২)', 'Call 16122 Now')}</span>
        </a>
      </div>

      {/* 3 Hotlines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hotline 16122 */}
        <Card className="border-emerald-200/90 bg-emerald-50/30 shadow-2xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge className="bg-[#006A4E] text-white">Land Helpline</Badge>
              <Clock className="size-4 text-[#006A4E]" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-black font-mono text-[#006A4E] mt-2">
              ১৬১২২
            </CardTitle>
            <CardDescription className="text-xs font-bold text-slate-700">
              {t('ভূমি মন্ত্রণালয় কেন্দ্রীয় কল সেন্টার', 'Ministry of Land Central Hotline')}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 leading-relaxed">
            {t(
              'ই-নামজারি, খতিয়ান ডেলিভারি, অনলাইন ভূমি উন্নয়ন কর এবং ভূমি সংক্রান্ত অভিযোগের জন্য ডেডিকেটেড সাপোর্ট।',
              'Dedicated assistance for e-mutation, porcha tracking, land development tax and statutory citizen complaints.'
            )}
          </CardContent>
          <CardFooter className="pt-2 border-t border-emerald-100">
            <span className="text-[11px] text-slate-500 font-medium">সকাল ৯:০০ – রাত ৮:০০ (সোম-শুক্র)</span>
          </CardFooter>
        </Card>

        {/* 333 Citizen Services */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="border-slate-300 text-slate-700">National 333</Badge>
              <Building2 className="size-4 text-slate-500" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-2">
              ৩৩৩
            </CardTitle>
            <CardDescription className="text-xs font-bold text-slate-700">
              {t('জাতীয় নাগরিক সেবা ও সামাজিক অভিযোগ', 'National Citizen Services & Grievance')}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 leading-relaxed">
            {t(
              'সরকারি সকল সেবা তথ্য, সামাজিক সুরক্ষা ও ইউনিয়ন ভূমি অফিসের দুর্নীতির বিরুদ্ধে জেলা প্রশাসনের দৃষ্টি আকর্ষণ।',
              'Access to all government civic services, social welfare guidance, and district administration alerts.'
            )}
          </CardContent>
          <CardFooter className="pt-2 border-t border-slate-100">
            <span className="text-[11px] text-emerald-700 font-bold">২৪ ঘণ্টা / ৭ দিন সার্বক্ষণিক চালু</span>
          </CardFooter>
        </Card>

        {/* 999 Police Emergency */}
        <Card className="border-rose-200 bg-rose-50/20 shadow-2xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="destructive" className="bg-rose-600 text-white">Emergency 999</Badge>
              <ShieldAlert className="size-4 text-rose-600" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-black font-mono text-rose-600 mt-2">
              ৯৯৯
            </CardTitle>
            <CardDescription className="text-xs font-bold text-slate-700">
              {t('জাতীয় জরুরি সেবা ও জমি দখল প্রতিরোধ', 'Emergency Response & Anti-Land Grab')}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 leading-relaxed">
            {t(
              'অবৈধ জমি দখল, সহিংসতা, জালিয়াতির অপরাধ এবং তাত্ক্ষণিক পুলিশি নিরাপত্তার জন্য টোল-ফ্রি জাতীয় জরুরি নম্বর।',
              'Toll-free police emergency service for reporting land grabbing, violence, fraud, or acute security breaches.'
            )}
          </CardContent>
          <CardFooter className="pt-2 border-t border-rose-100">
            <span className="text-[11px] text-rose-700 font-bold">সম্পূর্ণ টোল-ফ্রি • ২৪/৭ সক্রিয়</span>
          </CardFooter>
        </Card>
      </div>

      {/* Official Grievance Resolution Path */}
      <Card className="border-slate-200/90 shadow-2xs">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <FileText className="size-5 text-[#006A4E]" />
            <span>{t('ভূমি অফিসে আনুষ্ঠানিক অভিযোগ নিষ্পত্তির আইনি ধাপ', 'Formal Statutory Grievance & Appeal Procedure')}</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-1">
            {t(
              'সহকারী কমিশনার (ভূমি) অফিস থেকে ভূমি আপিল বোর্ড পর্যন্ত নাগরিকের আইনি প্রতিকার প্রক্রিয়া।',
              'Step-by-step grievance hierarchy from Upazila AC Land to the Land Appeal Board.'
            )}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Step 1 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="size-6 rounded-full bg-[#006A4E] text-white flex items-center justify-center font-bold text-xs">
                  ১
                </span>
                <span className="font-extrabold text-slate-900 text-sm">উপজেলা পর্যায়ে আবেদন</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                নামজারি বা রেকর্ডের বিরোধে সহকারী কমিশনার (ভূমি) বরাবর মিস কেস বা লিখিত আপত্তি দায়ের করুন। শুনানি শেষে আদেশ প্রদান করা হবে।
              </p>
              <span className="text-[11px] font-bold text-[#006A4E] mt-auto">সময়সীমা: ২৮ কার্যদিবস</span>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="size-6 rounded-full bg-[#006A4E] text-white flex items-center justify-center font-bold text-xs">
                  ২
                </span>
                <span className="font-extrabold text-slate-900 text-sm">জেলা প্রশাসকের কাছে আপিল</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                এসি ল্যান্ডের আদেশে সংক্ষুব্ধ হলে আদেশের ৩০ দিনের মধ্যে অতিরিক্ত জেলা প্রশাসক (এডিসি রাজস্ব) বরাবরে আপিল করতে পারেন।
              </p>
              <span className="text-[11px] font-bold text-[#006A4E] mt-auto">আপিলের সময়সীমা: ৩০ দিন</span>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="size-6 rounded-full bg-[#006A4E] text-white flex items-center justify-center font-bold text-xs">
                  ৩
                </span>
                <span className="font-extrabold text-slate-900 text-sm">বিভাগীয় কমিশনার / আপিল বোর্ড</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                জেলা প্রশাসনের রাজস্ব আদেশের বিরুদ্ধে বিভাগীয় কমিশনার ও পরবর্তীতে ভূমি আপিল বোর্ডে চূড়ান্ত রিভিশন শুনানির সুযোগ রয়েছে।
              </p>
              <span className="text-[11px] font-bold text-[#006A4E] mt-auto">চূড়ান্ত প্রশাসনিক ফোরাম</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            {t('আপনার এলাকার সংশ্লিষ্ট ভূমি অফিস বা সাব-রেজিস্ট্রার অফিসের ঠিকানা ও অবস্থান প্রয়োজন?', 'Need physical address and contact of your local land or sub-registry office?')}
          </div>
          <Button
            onClick={() => onNavigate('offices')}
            className="h-9 px-4 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs gap-1.5 cursor-pointer"
          >
            <MapPin className="size-3.5" />
            <span>{t('নিকটস্থ ভূমি অফিস সন্ধান করুন ↗', 'Open Office Locator ↗')}</span>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
