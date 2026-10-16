import React, { useEffect, useState } from 'react';
import {
  QrCode,
  Search,
  HelpCircle,
  X,
  ShieldCheck,
  ArrowRight,
  MapPin,
  FileText,
  UserCheck,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useI18n } from '../i18n';
import { ActiveTab } from '../components/NavbarAndLayout';

interface CitizenHomeProps {
  currentUser?: any | null;
  onNavigate: (tab: ActiveTab, params?: { deedId?: string; plotId?: number }) => void;
}

export const CitizenHome: React.FC<CitizenHomeProps> = ({ currentUser, onNavigate }) => {
  const { t, n } = useI18n();
  const [showGuide, setShowGuide] = useState<boolean>(() => {
    return localStorage.getItem('bhumishield_hide_guide') !== 'true';
  });
  const [myProps, setMyProps] = useState<any | null>(null);
  const [lookupNid, setLookupNid] = useState<string>(currentUser?.nid || '9900001001');

  const dismissGuide = () => {
    setShowGuide(false);
    localStorage.setItem('bhumishield_hide_guide', 'true');
  };

  const loadMyProperties = (nidVal: string) => {
    apiClient
      .get(`/citizen/my-properties?nid=${encodeURIComponent(nidVal.trim())}`)
      .then((res) => setMyProps(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    const nidToLoad = currentUser?.nid || '9900001001';
    setLookupNid(nidToLoad);
    loadMyProperties(nidToLoad);
  }, [currentUser]);

  return (
    <div className="space-y-8">
      {/* Calm Hero Introduction */}
      <section className="rounded-3xl bg-[#006A4E] text-white p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 text-sm font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F42A41]" />
              <span>
                {t(
                  'নাগরিক সেবা ও প্রাক-ক্রয় যাচাই ড্যাশবোর্ড',
                  'Citizen Service & Pre-Purchase Verification Dashboard'
                )}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold leading-tight">
              {t(
                'জমি কেনার আগে ও দলিল নিবন্ধনের পরে—নিজেই যাচাই করুন আপনার ভূমির নিরাপত্তা',
                'Verify Any Deed or Land Plot Before You Buy — Plain Language, Zero Jargon'
              )}
            </h1>
            <p className="text-base sm:text-lg text-white/90 leading-relaxed">
              {t(
                'জাল দলিল, একই জমি দুইবার বিক্রি, ব্যাংক বন্ধক বা খতিয়ানের অমিল সহজ বাংলায় তাৎক্ষণিক দেখুন।',
                'Catch fake deeds, double sales, hidden mortgages, and khatian discrepancies before registration.'
              )}
            </p>
          </div>

          <img
            src="/assets/bhumishield-emblem.svg"
            alt="BhumiShield Shield"
            className="w-24 h-24 hidden lg:block shrink-0"
          />
        </div>
      </section>

      {/* Dismissible 3-Step Inline SVG "How to Use" Illustration */}
      {showGuide && (
        <section
          aria-label={t('কীভাবে ব্যবহার করবেন', 'How to use BhumiShield')}
          className="rounded-2xl bg-[#E6F2EE] border-2 border-[#006A4E]/30 p-5 sm:p-6 hc-card"
        >
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-[#006A4E]">
              {t('কীভাবে ব্যবহার করবেন (৩টি সহজ ধাপ)', 'How to Use BhumiShield (3 Simple Steps)')}
            </h2>
            <button
              type="button"
              onClick={dismissGuide}
              className="min-h-[48px] px-3 py-1.5 rounded-xl bg-white text-[#1A1A1A] text-sm font-semibold border border-gray-300 hover:bg-gray-100 flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>{t('বন্ধ করুন', 'Dismiss')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-start gap-3.5">
              <svg className="w-12 h-12 shrink-0" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <rect width="48" height="48" rx="12" fill="#E6F2EE" />
                <rect x="10" y="10" width="11" height="11" stroke="#006A4E" strokeWidth="3" />
                <rect x="27" y="10" width="11" height="11" stroke="#006A4E" strokeWidth="3" />
                <rect x="10" y="27" width="11" height="11" stroke="#006A4E" strokeWidth="3" />
                <circle cx="32.5" cy="32.5" r="5.5" fill="#F42A41" />
              </svg>
              <div>
                <span className="text-xs font-bold uppercase text-[#006A4E]">
                  {t(`ধাপ ${n(1)}`, 'Step 1')}
                </span>
                <h3 className="font-bold text-[#1A1A1A] mt-0.5">
                  {t('QR স্ক্যান বা দাগ নম্বর দিন', 'Scan QR or Select Dag No.')}
                </h3>
                <p className="text-sm text-[#5F6B66] mt-1">
                  {t(
                    'দলিলের গায়ে থাকা QR কোড স্ক্যান করুন অথবা তালিকা থেকে মৌজা ও দাগ নম্বর বেছে নিন।',
                    'Scan the QR code printed on the deed or select Mouza and Dag number from dropdowns.'
                  )}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-start gap-3.5">
              <svg className="w-12 h-12 shrink-0" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <rect width="48" height="48" rx="12" fill="#E6F2EE" />
                <path
                  d="M24 8L37 14V23C37 31.5 31.4 38.8 24 41C16.6 38.8 11 31.5 11 23V14L24 8Z"
                  stroke="#006A4E"
                  strokeWidth="3"
                />
                <path d="M18 24.5L22.5 29L30.5 20" stroke="#006A4E" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <div>
                <span className="text-xs font-bold uppercase text-[#006A4E]">
                  {t(`ধাপ ${n(2)}`, 'Step 2')}
                </span>
                <h3 className="font-bold text-[#1A1A1A] mt-0.5">
                  {t('স্বয়ংক্রিয় মালিকানা ও হ্যাশ যাচাই', 'Automatic Chain & Hash Check')}
                </h3>
                <p className="text-sm text-[#5F6B66] mt-1">
                  {t(
                    'সিস্টেম সিএস→বিএস খতিয়ান, ডিজিটাল স্বাক্ষর এবং ব্যাংক বন্ধক মিলিয়ে দেখবে।',
                    'BhumiShield checks CS->BS khatian records, Ed25519 signatures, and active bank liens.'
                  )}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-start gap-3.5">
              <svg className="w-12 h-12 shrink-0" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <rect width="48" height="48" rx="12" fill="#E6F2EE" />
                <rect x="12" y="9" width="24" height="30" rx="3" stroke="#006A4E" strokeWidth="3" />
                <line x1="17" y1="17" x2="31" y2="17" stroke="#006A4E" strokeWidth="3" />
                <line x1="17" y1="24" x2="31" y2="24" stroke="#006A4E" strokeWidth="3" />
                <circle cx="29" cy="31" r="4" fill="#006A4E" />
              </svg>
              <div>
                <span className="text-xs font-bold uppercase text-[#006A4E]">
                  {t(`ধাপ ${n(3)}`, 'Step 3')}
                </span>
                <h3 className="font-bold text-[#1A1A1A] mt-0.5">
                  {t('সহজ বাংলায় ফলাফল ও করণীয় জানুন', 'Read Plain-Language Verdict')}
                </h3>
                <p className="text-sm text-[#5F6B66] mt-1">
                  {t(
                    '✔ নিরাপদ, ⚠ সতর্কতা বা ✖ ঝুঁকিপূর্ণ ব্যানার দেখুন, জোরে শুনুন (🔊) ও প্রিন্ট করুন।',
                    'See Safe / Warning / High-Risk status, listen aloud in Bangla, or print the 1-page report.'
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CITIZEN HOME: Three Huge Primary Action Cards */}
      <section aria-label={t('প্রধান নাগরিক সেবা', 'Main Citizen Actions')}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <button
            type="button"
            onClick={() => onNavigate('verify')}
            className="hc-card group text-left rounded-3xl bg-white border-2 border-[#006A4E]/30 hover:border-[#006A4E] p-7 shadow-sm hover:shadow-md transition flex flex-col justify-between min-h-[250px] cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#E6F2EE] text-[#006A4E] flex items-center justify-center text-3xl font-bold">
                📷
              </div>
              <h2 className="text-2xl font-bold text-[#1A1A1A] group-hover:text-[#006A4E] transition">
                {t('QR স্ক্যান করে দলিল যাচাই করুন', 'Scan QR to Verify a Deed')}
              </h2>
              <p className="text-[#5F6B66] leading-relaxed">
                {t(
                  'দলিলের QR কোড স্ক্যান করুন অথবা দলিল নম্বর দিন। দলিলটি আসল কি না এবং নিবন্ধনের পরে কোনো তথ্য গোপনে পরিবর্তন করা হয়েছে কি না তাৎক্ষণিক জানুন।',
                  'Scan the QR code on any registered deed or enter the deed number to verify its cryptographic signature and check for tampering.'
                )}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-[#006A4E] font-bold">
              <span className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                {t('দলিল যাচাই শুরু করুন', 'Verify Deed Now')}
              </span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('check_buy')}
            className="hc-card group text-left rounded-3xl bg-white border-2 border-[#006A4E]/30 hover:border-[#006A4E] p-7 shadow-sm hover:shadow-md transition flex flex-col justify-between min-h-[250px] cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#E6F2EE] text-[#006A4E] flex items-center justify-center text-3xl font-bold">
                🔎
              </div>
              <h2 className="text-2xl font-bold text-[#1A1A1A] group-hover:text-[#006A4E] transition">
                {t('জমি কেনার আগে যাচাই করুন', 'Check Before You Buy')}
              </h2>
              <p className="text-[#5F6B66] leading-relaxed">
                {t(
                  'মৌজা ও দাগ নম্বর নির্বাচন করে বর্তমান মালিক, সিএস থেকে বিএস খতিয়ান চেইন, ব্যাংক বন্ধক এবং ডাবল সেলের ঝুঁকি এক পাতায় দেখুন।',
                  'Select Mouza and Dag number to get a plain-language report on current owners, CS-to-BS khatian history, active bank liens, and fraud flags.'
                )}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-[#006A4E] font-bold">
              <span className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                {t('দাগ নম্বর দিয়ে যাচাই করুন', 'Check Plot Risk')}
              </span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('help')}
            className="hc-card group text-left rounded-3xl bg-white border-2 border-[#006A4E]/30 hover:border-[#006A4E] p-7 shadow-sm hover:shadow-md transition flex flex-col justify-between min-h-[250px] cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#E6F2EE] text-[#006A4E] flex items-center justify-center text-3xl font-bold">
                ❓
              </div>
              <h2 className="text-2xl font-bold text-[#1A1A1A] group-hover:text-[#006A4E] transition">
                {t('সাহায্য', 'Help & Demo Guide')}
              </h2>
              <p className="text-[#5F6B66] leading-relaxed">
                {t(
                  'সহজ ভাষায় প্রশ্নোত্তর, খতিয়ান ও নামজারির নিয়মাবলী এবং হ্যাকাথনের ৮টি ডেমো পরিস্থিতি (Scenarios) এক ক্লিকে পরীক্ষা করুন।',
                  'Plain-language FAQ for citizens and union staff, plus 1-click access to all 8 hackathon evaluation scenarios.'
                )}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-[#006A4E] font-bold">
              <span className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                {t('সাহায্য ও ডেমো সিনারিও দেখুন', 'Open Help & Scenarios')}
              </span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
            </div>
          </button>
        </div>
      </section>

      {/* Citizen's Own NID-Linked Properties & Deeds Portfolio */}
      {myProps && (
        <section className="daisy-card p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E6F2EE] text-[#006A4E] flex items-center justify-center">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="daisy-badge daisy-badge-success">
                  {t('এনআইডি সংযুক্ত নাগরিক পোর্টফোলিও', 'Mock NID Linked Citizen Portfolio')}
                </span>
                <h2 className="text-xl font-bold text-[#1A1A1A] mt-0.5">
                  {t(myProps.person?.name_bn || '', myProps.person?.name_en || '')} —{' '}
                  {t('আমার খতিয়ান ও নিবন্ধিত দলিল', 'My Recorded Plots & Deeds')}
                </h2>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                loadMyProperties(lookupNid);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={lookupNid}
                onChange={(e) => setLookupNid(e.target.value)}
                aria-label={t('ডেমো এনআইডি নম্বর', 'Mock NID Number')}
                placeholder="9900001001"
                className="min-h-[44px] px-3.5 py-1.5 rounded-xl border border-gray-300 bg-[#FAFBFA] text-sm font-semibold w-40"
              />
              <button
                type="submit"
                className="min-h-[44px] px-4 py-1.5 rounded-xl bg-[#006A4E] text-white font-bold text-xs cursor-pointer"
              >
                {t('এনআইডি খুঁজুন', 'Lookup NID')}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Owned Plots */}
            <div className="space-y-3">
              <h3 className="font-bold text-base text-[#1A1A1A] flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#006A4E]" />
                <span>
                  {t('সর্বশেষ বিএস খতিয়ানে মালিকানাধীন দাগসমূহ', 'Owned Plots on Latest BS Khatian')} (
                  {n(myProps.owned_plots?.length || 0)})
                </span>
              </h3>
              <div className="space-y-2.5">
                {myProps.owned_plots?.map((op: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[#FAFBFA] border border-gray-200 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-[#1A1A1A]">
                        {t(op.mouza_bn, op.mouza_en)} — {t('দাগ নং', 'Dag')} {n(op.dag_no)}
                      </div>
                      <div className="text-xs text-[#5F6B66]">
                        {t('বিএস খতিয়ান:', 'BS Khatian:')} {n(op.khatian_no)} •{' '}
                        {t('অংশ:', 'Share:')} {n(op.share_fraction)} ({n(op.area_decimal)}{' '}
                        {t('শতাংশ', 'Decimals')})
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('check_buy', { plotId: op.plot_id })}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#E6F2EE] text-[#006A4E] font-bold text-xs hover:bg-[#006A4E] hover:text-white transition cursor-pointer shrink-0"
                    >
                      {t('বিস্তারিত রিপোর্ট →', 'Full Report ->')}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Linked Deeds */}
            <div className="space-y-3">
              <h3 className="font-bold text-base text-[#1A1A1A] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#006A4E]" />
                <span>
                  {t('সংশ্লিষ্ট নিবন্ধিত দলিলসমূহ', 'Linked Registered Deeds')} (
                  {n(myProps.deeds?.length || 0)})
                </span>
              </h3>
              <div className="space-y-2.5">
                {myProps.deeds?.slice(0, 4).map((d: any) => (
                  <div
                    key={d.id}
                    className="p-4 rounded-2xl bg-[#FAFBFA] border border-gray-200 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-[#1A1A1A]">
                        {d.deed_no} ({t('দাগ', 'Dag')} {n(d.dag_no)})
                      </div>
                      <div className="text-xs text-[#5F6B66]">
                        {t(d.seller_name_bn, d.seller_name_en)} → {t(d.buyer_name_bn, d.buyer_name_en)} •{' '}
                        {n(d.area_decimal)} {t('শতাংশ', 'Decimals')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('verify', { deedId: d.deed_no })}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#006A4E] text-white font-bold text-xs hover:bg-[#00543D] cursor-pointer shrink-0"
                    >
                      {t('QR যাচাই', 'Verify QR')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quick Officer / Judge Demo Strip */}
      <section className="rounded-2xl bg-white border border-gray-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hc-card">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-[#006A4E] shrink-0" />
          <div>
            <h3 className="font-bold text-[#1A1A1A]">
              {t(
                'হ্যাকাথন বিচারক ও কর্মকর্তাদের জন্য দ্রুত নেভিগেশন',
                'Quick Judge & Officer Navigation'
              )}
            </h3>
            <p className="text-sm text-[#5F6B66]">
              {t(
                'সাব-রেজিস্ট্রার, এসি ল্যান্ড, ব্যাংক কর্মকর্তা ও লাইভ টেম্পারিং সিমুলেটর সরাসরি খুলুন।',
                'Jump straight to Sub-Registrar, AC Land, Bank Officer, or the Live Tamper Simulator.'
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate('verify', { deedId: '5' })}
            className="min-h-[48px] px-4 py-2 rounded-xl bg-[#FEECEE] text-[#C81E32] border border-[#F42A41]/40 font-bold text-sm cursor-pointer hover:bg-[#F42A41] hover:text-white transition"
          >
            {t('⚡ লাইভ টেম্পারিং ডেমো (দলিল #৫)', '⚡ Live Tamper Demo (Deed #5)')}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className="min-h-[48px] px-4 py-2 rounded-xl bg-[#006A4E] text-white font-bold text-sm cursor-pointer hover:bg-[#00563F] transition"
          >
            {t('অ্যাডমিন, ইউজার ও সেটিংস কনসোল', 'Admin, Users & Settings Console')}
          </button>
        </div>
      </section>
    </div>
  );
};
