import React from 'react';
import { useAppUI } from '../i18n';
import { HelpCircle, ShieldCheck, AlertTriangle, XOctagon, Sparkles } from 'lucide-react';

export const HelpPage: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { t } = useAppUI();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 space-y-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#006A4E] flex items-center gap-2">
          <HelpCircle className="w-8 h-8" />
          <span>
            {t(
              'সহায়িকা ও সাধারণ জিজ্ঞাসাসমূহ (ভূমি সুরক্ষা নির্দেশিকা)',
              'Help Guide & Frequently Asked Questions'
            )}
          </span>
        </h1>
        <p className="text-lg text-[#1A1A1A]">
          {t(
            '“রেজিস্ট্রেশন এবং নামজারি একে অপরের সাথে কথা বলে না — আমরা সেই সেতুবন্ধন তৈরি করেছি যা প্রতিটি দলিল নিবন্ধনের আগে যাচাই করে এবং পরে প্রমাণ করে যে এতে কোনো জালিয়াতি হয়নি।”',
            '“Registration and mutation don’t talk to each other. We built the layer that checks every deed before it is registered, and proves afterwards that it was never tampered with.”'
          )}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="p-5 rounded-2xl bg-[#E6F2EE] border-2 border-[#006A4E]">
            <div className="flex items-center gap-2 font-extrabold text-xl text-[#006A4E]">
              <ShieldCheck className="w-6 h-6" />
              <span>{t('✔ নিরাপদ (সবুজ)', '✔ Safe (Green)')}</span>
            </div>
            <p className="mt-2 text-sm text-[#1A1A1A]">
              {t(
                'বিক্রেতার নাম সর্বশেষ বিএস খতিয়ানে আছে, বিক্রয় লক নেই, জমির পরিমাণ সঠিক এবং কোনো ব্যাংক ঋণ বা চলমান বিরোধ নেই।',
                'Seller is on the latest BS khatian, plot is unlocked, area is within share, and no active mortgage or dispute exists.'
              )}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#FEF3C7] border-2 border-[#B7791F]">
            <div className="flex items-center gap-2 font-extrabold text-xl text-[#B7791F]">
              <AlertTriangle className="w-6 h-6" />
              <span>{t('⚠ সতর্কতা (হলুদ)', '⚠ Warning (Amber)')}</span>
            </div>
            <p className="mt-2 text-sm text-[#1A1A1A]">
              {t(
                'আরএস থেকে বিএস খতিয়ানে জমির পরিমাণে অসামঞ্জস্য আছে, ওয়ারিশ বণ্টন সনদ অসম্পূর্ণ অথবা চলমান অভিযোগ রয়েছে।',
                'RS-to-BS khatian chain discrepancy, unresolved inheritance shares, or open citizen dispute.'
              )}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#FEECEE] border-2 border-[#F42A41]">
            <div className="flex items-center gap-2 font-extrabold text-xl text-[#F42A41]">
              <XOctagon className="w-6 h-6" />
              <span>{t('✖ ঝুঁকিপূর্ণ (লাল)', '✖ High Risk (Red)')}</span>
            </div>
            <p className="mt-2 text-sm text-[#1A1A1A]">
              {t(
                'বিক্রয় লক সক্রিয়, বিক্রেতা প্রকৃত মালিক নন, জমি ইতিমধ্যে বিক্রি বা ব্যাংকে মর্টগেজ দেওয়া হয়েছে, অথবা দলিলের তথ্য টেম্পার করা হয়েছে।',
                'Owner sale lock active, seller is not the owner, plot already sold/mortgaged, or deed content was tampered.'
              )}
            </p>
          </div>
        </div>

        <div className="pt-4 flex flex-wrap gap-3">
          <button
            onClick={() => onNavigate('check')}
            className="px-6 py-3.5 rounded-xl bg-[#006A4E] text-white font-extrabold flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            <span>
              {t('জমি যাচাই উইজার্ডে যান', 'Go to Check-Before-You-Buy Wizard')}
            </span>
          </button>

          <button
            onClick={() => onNavigate('admin')}
            className="px-6 py-3.5 rounded-xl border-2 border-[#006A4E] text-[#006A4E] font-extrabold cursor-pointer"
          >
            {t(
              'RBAC ম্যাট্রিক্স ও ৮টি ডেমো সিনারিও দেখুন',
              'Open RBAC Matrix & 8 Demo Scenarios'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
