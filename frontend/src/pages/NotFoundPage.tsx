import React from 'react';
import { Compass, Home, Search, QrCode, HelpCircle, ArrowLeft } from 'lucide-react';
import { useAppUI } from '../i18n';

interface NotFoundPageProps {
  onNavigate?: (tab: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  const { t } = useAppUI();

  const handleNav = (tab: string) => {
    if (onNavigate) {
      onNavigate(tab);
    } else {
      window.location.href = `/${tab === 'landing' ? '' : tab}`;
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-slate-50/50">
      <div className="max-w-xl w-full text-center space-y-6 bg-white p-8 sm:p-12 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#006A4E] shadow-xs">
          <Compass className="w-10 h-10 animate-pulse text-[#006A4E]" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/70 text-[#006A4E] text-xs font-bold uppercase tracking-wider">
            {t('৪০৪ ত্রুটি', '404 Error')}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t('কাঙ্ক্ষিত পৃষ্ঠাটি পাওয়া যায়নি', 'Page Not Found')}
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            {t(
              'আপনি যে ঠিকানাটি অনুসন্ধান করছেন তা পরিবর্তিত হয়েছে অথবা বিদ্যমান নেই। অনুগ্রহ করে সঠিক লিংক ব্যবহার করুন অথবা নিচের প্রধান সেবাসমূহে ফিরে যান।',
              'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.'
            )}
          </p>
        </div>

        {/* Quick Nav Suggestions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
          <button
            type="button"
            onClick={() => handleNav('landing')}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500/50 hover:bg-emerald-50/50 transition cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-100/60 text-[#006A4E] flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-[#006A4E] transition">
                {t('মূল পাতা', 'Homepage')}
              </div>
              <div className="text-[11px] text-slate-500">{t('সকল সেবা ও ড্যাশবোর্ড', 'All services & portal')}</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleNav('check')}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500/50 hover:bg-emerald-50/50 transition cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-100/60 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition">
                {t('জমি কেনার আগে যাচাই', 'Check Before Buy')}
              </div>
              <div className="text-[11px] text-slate-500">{t('মালিকানা ও খতিয়ান পরীক্ষা', 'Verify title & khatian')}</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleNav('qr')}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500/50 hover:bg-emerald-50/50 transition cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition">
                {t('দলিল QR কোড যাচাই', 'Verify Deed QR')}
              </div>
              <div className="text-[11px] text-slate-500">{t('ডিজিটাল সিল ও ক্রিপ্টো লেজার', 'Digital seal verification')}</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleNav('help')}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500/50 hover:bg-emerald-50/50 transition cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-100/60 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition">
                {t('সাহায্য ও ১৬১২২ হেল্পলাইন', 'Help & Hotline 16122')}
              </div>
              <div className="text-[11px] text-slate-500">{t('পরামর্শ ও সহায়তা ডিরেক্টরি', 'Guides & contact')}</div>
            </div>
          </button>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => handleNav('landing')}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('মূল পাতায় ফিরে যান', 'Back to Homepage')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
