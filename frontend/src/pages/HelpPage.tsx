import React, { useEffect, useState } from 'react';
import { HelpCircle, ArrowLeft, PlayCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { useI18n } from '../i18n';
import { getVerdictStyle } from '../theme/tokens';
import { ActiveTab } from '../components/NavbarAndLayout';

interface HelpPageProps {
  onBackHome: () => void;
  onJumpScenario: (scenario: any, targetTab: ActiveTab) => void;
}

export const HelpPage: React.FC<HelpPageProps> = ({ onBackHome, onJumpScenario }) => {
  const { t, n } = useI18n();
  const [scenarios, setScenarios] = useState<any[]>([]);

  useEffect(() => {
    apiClient
      .get('/scenarios')
      .then((res) => setScenarios(res.data.items || []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackHome}
          className="min-h-[48px] px-4 py-2 rounded-xl border border-gray-300 bg-white font-semibold flex items-center gap-2 hover:bg-gray-100 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('পিছনে যান (হোম)', 'Back to Home')}</span>
        </button>
      </div>

      {/* Plain-language FAQ */}
      <section className="rounded-3xl bg-white border border-gray-200 p-6 sm:p-8 shadow-xs space-y-5 hc-card">
        <div className="flex items-center gap-3">
          <HelpCircle className="w-8 h-8 text-[#006A4E]" />
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A]">
            {t('সাধারণ নাগরিকদের জন্য সহজ প্রশ্নোত্তর', 'Plain-Language Citizen Guide & FAQ')}
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-[#FAFBFA] border border-gray-200 space-y-1.5">
            <h2 className="font-bold text-[#006A4E]">
              {t('১. ভূমি সুরক্ষা (BhumiShield) কী করে?', '1. What does BhumiShield do?')}
            </h2>
            <p className="text-sm text-[#1A1A1A] leading-relaxed">
              {t(
                'এটি সাব-রেজিস্ট্রি অফিস (দলিল নিবন্ধন) এবং এসি ল্যান্ড অফিস (ই-নামজারি)-এর মাঝে একটি সেতুবন্ধন। দলিল রেজিস্ট্রির আগেই এটি যাচাই করে বিক্রেতা আসল মালিক কি না, জমি ব্যাংকে বন্ধক আছে কি না বা আগে অন্য কারো কাছে বিক্রি হয়েছে কি না।',
                'It connects the Sub-Registry (Deed Registration) and AC Land (Mutation) systems, checking ownership chains and bank liens before a deed is registered.'
              )}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAFBFA] border border-gray-200 space-y-1.5">
            <h2 className="font-bold text-[#006A4E]">
              {t('২. এটি কি চূড়ান্ত আইনি রায় দেয়?', '2. Does it declare legal truth?')}
            </h2>
            <p className="text-sm text-[#1A1A1A] leading-relaxed">
              {t(
                'না। ভূমি সুরক্ষা শুধুমাত্র তথ্যের গরমিল ও ঝুঁকি চিহ্নিত করে মানব কর্মকর্তাকে (সাব-রেজিস্ট্রার ও এসি ল্যান্ড) সতর্ক করে। চূড়ান্ত সিদ্ধান্ত সর্বদা সংশ্লিষ্ট সরকারি কর্মকর্তা গ্রহণ করেন।',
                'No. BhumiShield only flags risk for a human officer to decide. It never declares final legal truth.'
              )}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAFBFA] border border-gray-200 space-y-1.5">
            <h2 className="font-bold text-[#006A4E]">
              {t('৩. হ্যাশ-চেইন লেজার ও QR কোড কীভাবে জালিয়াতি রোধ করে?', '3. How does the QR code stop tampering?')}
            </h2>
            <p className="text-sm text-[#1A1A1A] leading-relaxed">
              {t(
                'প্রতিটি নিবন্ধিত দলিলের একটি ডিজিটাল আঙুলের ছাপ (SHA-256 Hash) ও সাব-রেজিস্ট্রারের ডিজিটাল স্বাক্ষর (Ed25519) থাকে। নিবন্ধনের পরে কেউ ১ শতাংশ জমিও পরিবর্তন করলে QR স্ক্যানে সাথে সাথে লাল সতর্কবার্তা দেখাবে।',
                'Every deed is hashed with SHA-256, chained to the previous deed, and signed with Ed25519. Any edit after registration immediately breaks verification.'
              )}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAFBFA] border border-gray-200 space-y-1.5">
            <h2 className="font-bold text-[#006A4E]">
              {t('৪. এখানে ব্যবহৃত তথ্য কি আসল?', '4. Is the data in this prototype real?')}
            </h2>
            <p className="text-sm text-[#1A1A1A] leading-relaxed">
              {t(
                'না। হ্যাকাথনের নিয়ম অনুযায়ী এখানে ব্যবহৃত সকল নাম, এনআইডি, ফোন নম্বর, মৌজা ও খতিয়ান ১০০% কাল্পনিক (Dummy Data)। কোনো সরকারি ওয়েবসাইট হতে তথ্য সংগ্রহ করা হয়নি।',
                'No. Per hackathon rules, 100% of names, NIDs, phones, plots, and khatians are synthetic dummy data.'
              )}
            </p>
          </div>
        </div>
      </section>

      {/* 8 Deliberate Demo Scenarios Quick Launcher */}
      <section className="rounded-3xl bg-white border border-gray-200 p-6 sm:p-8 shadow-xs space-y-4 hc-card">
        <h2 className="text-2xl font-bold text-[#1A1A1A]">
          {t(
            'হ্যাকাথনের ৮টি প্রাক-নির্মিত ডেমো সিনারিও (এক ক্লিকে পরীক্ষা করুন)',
            '8 Seeded Hackathon Demo Scenarios (Click Any Scenario to Test Live)'
          )}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenarios.map((sc) => {
            const st = getVerdictStyle(sc.live_verdict);
            return (
              <div
                key={sc.id}
                className={`p-5 rounded-2xl border-2 ${st.border} ${st.softBg} flex flex-col justify-between gap-4`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${st.bg}`}>
                      {t(sc.badge_bn, sc.badge_en)}
                    </span>
                    <span className="text-xs font-bold text-[#5F6B66]">
                      {t('দাগ নং:', 'Dag:')} {n(sc.plot?.dag_no)}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-[#1A1A1A]">
                    {t(sc.title_bn, sc.title_en)}
                  </h3>
                  <p className="text-sm text-[#1A1A1A]/90 leading-relaxed">
                    {t(sc.description_bn, sc.description_en)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => onJumpScenario(sc, 'check_buy')}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-gray-300 font-bold text-xs text-[#1A1A1A] hover:bg-gray-100 cursor-pointer flex items-center gap-1.5"
                  >
                    <PlayCircle className="w-4 h-4 text-[#006A4E]" />
                    <span>{t('নাগরিক রিপোর্টে দেখুন', 'Open Citizen Report')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onJumpScenario(
                        sc,
                        sc.code === 'DEED_TAMPERED'
                          ? 'verify'
                          : sc.code === 'PLOT_MORTGAGED'
                          ? 'bank'
                          : 'registrar'
                      )
                    }
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#006A4E] text-white font-bold text-xs hover:bg-[#00563F] cursor-pointer flex items-center gap-1.5"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>{t('সংশ্লিষ্ট অফিসার প্যানেলে পরীক্ষা করুন', 'Test in Officer Panel')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
