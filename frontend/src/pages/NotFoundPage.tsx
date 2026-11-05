import React, { useState } from 'react';
import { Compass, Home, Search, QrCode, HelpCircle, ArrowLeft, PhoneCall } from 'lucide-react';
import { useAppUI } from '../i18n';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface NotFoundPageProps {
  onNavigate?: (tab: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  const { t } = useAppUI();
  const [quickSearch, setQuickSearch] = useState('');

  const handleNav = (tab: string) => {
    if (onNavigate) {
      onNavigate(tab);
    } else {
      window.location.href = `/${tab === 'landing' ? '' : tab}`;
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 bg-[#FAFAFA]">
      <Card className="max-w-xl w-full text-center p-8 sm:p-12 rounded-3xl border border-slate-200/90 shadow-md bg-white space-y-6">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#006A4E] shadow-xs">
          <Compass className="w-10 h-10 animate-pulse text-[#006A4E]" />
        </div>

        <div className="space-y-2">
          <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-xs font-bold uppercase tracking-wider px-3 py-1">
            {t('৪০৪ ত্রুটি', '404 Error')}
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t('কাঙ্ক্ষিত পৃষ্ঠাটি পাওয়া যায়নি', 'Page Not Found')}
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            {t(
              'আপনি যে ওয়েব ঠিকানাটি অনুসন্ধান করছেন তা পরিবর্তিত হয়েছে অথবা বিদ্যমান নেই। চিন্তা করবেন না, নিচের যেকোনো প্রধান সেবা নির্বাচন করে সহজে প্রয়োজনীয় তথ্য খুঁজে নিন।',
              'The page you are looking for might have been moved or does not exist. Choose one of the core services below to get back on track.'
            )}
          </p>
        </div>

        {/* Quick Service Search */}
        <div className="relative max-w-md mx-auto w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="text"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            placeholder={t('খতিয়ান, দাগ, নামজারি বা সেবা অনুসন্ধান করুন...', 'Search khatian, dag, mutation or service...')}
            className="w-full pl-10 pr-4 h-10 text-xs bg-slate-50 border-slate-200"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleNav('check');
              }
            }}
          />
        </div>

        {/* 4 Quick Recovery Cards (48px+ tap targets) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleNav('landing')}
            className="h-auto justify-start p-4 rounded-2xl border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/60 transition cursor-pointer group min-h-[56px] text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#006A4E] flex items-center justify-center shrink-0 group-hover:scale-105 transition shadow-2xs mr-3.5">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 group-hover:text-[#006A4E] transition whitespace-normal">
                {t('মূল পাতা', 'Homepage')}
              </div>
              <div className="text-xs text-slate-500 font-normal whitespace-normal">
                {t('সকল সেবা ও ড্যাশবোর্ড', 'All services & portal')}
              </div>
            </div>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleNav('check')}
            className="h-auto justify-start p-4 rounded-2xl border-slate-200 hover:border-blue-500 hover:bg-blue-50/60 transition cursor-pointer group min-h-[56px] text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition shadow-2xs mr-3.5">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition whitespace-normal">
                {t('জমি কেনার আগে যাচাই', 'Check Before Buy')}
              </div>
              <div className="text-xs text-slate-500 font-normal whitespace-normal">
                {t('মালিকানা ও খতিয়ান পরীক্ষা', 'Verify title & khatian')}
              </div>
            </div>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleNav('qr')}
            className="h-auto justify-start p-4 rounded-2xl border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/60 transition cursor-pointer group min-h-[56px] text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition shadow-2xs mr-3.5">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition whitespace-normal">
                {t('দলিল QR কোড যাচাই', 'Verify Deed QR')}
              </div>
              <div className="text-xs text-slate-500 font-normal whitespace-normal">
                {t('ডিজিটাল সিল ও সত্যতা', 'Digital seal & ledger')}
              </div>
            </div>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleNav('help')}
            className="h-auto justify-start p-4 rounded-2xl border-slate-200 hover:border-purple-500 hover:bg-purple-50/60 transition cursor-pointer group min-h-[56px] text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition shadow-2xs mr-3.5">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition whitespace-normal">
                {t('সাহায্য ও ১৬১২২ হেল্পলাইন', 'Help & Hotline 16122')}
              </div>
              <div className="text-xs text-slate-500 font-normal whitespace-normal">
                {t('পরামর্শ ও অভিযোগ সেল', 'Guides & assistance')}
              </div>
            </div>
          </Button>
        </div>

        {/* Dedicated Click-to-Call Hotline 16122 */}
        <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#006A4E] text-white flex items-center justify-center shrink-0 shadow-xs">
              <PhoneCall className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-950">
                {t('জাতীয় ভূমি সেবা ও নাগরিক অভিযোগ হেল্পলাইন', 'National Land Helpline & Citizen Desk')}
              </div>
              <div className="text-[11px] text-emerald-800">
                {t('সরাসরি কথা বলুন ভূমি সেবা কর্মকর্তার সাথে (টোল ফ্রি)', 'Speak directly with land service officer (Toll-free)')}
              </div>
            </div>
          </div>
          <a
            href="tel:16122"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold shadow-xs transition shrink-0"
          >
            <PhoneCall className="w-4 h-4" />
            <span>১৬১২২ কল করুন (Call 16122)</span>
          </a>
        </div>

        <div className="pt-2">
          <Button
            onClick={() => handleNav('landing')}
            className="bg-[#006A4E] hover:bg-[#00553e] text-white font-bold h-11 px-6 rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('মূল পাতায় ফিরে যান', 'Back to Homepage')}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};
