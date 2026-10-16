import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  QrCode,
  Search,
  FileCheck2,
  Landmark,
  Building2,
  ArrowRight,
  Lock,
  CheckCircle2,
  LogIn,
  UserPlus,
  Layers,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useI18n } from '../i18n';
import { ActiveTab } from '../components/NavbarAndLayout';

interface LandingPageProps {
  onNavigate: (tab: ActiveTab, params?: { deedId?: string; plotId?: number }) => void;
  onSelectRoleAndGo: (role: string, tab: ActiveTab) => void;
  siteSettings?: Record<string, any>;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  onSelectRoleAndGo,
  siteSettings,
}) => {
  const { t, n } = useI18n();
  const [kpis, setKpis] = useState<any>({
    total_plots: 60,
    total_khatians: 240,
    total_deeds: 80,
    total_persons: 42,
    pending_mutations: 2,
    active_mortgages_count: 2,
  });
  const [quickDeedNo, setQuickDeedNo] = useState<string>('DL-2024-1001');

  useEffect(() => {
    apiClient
      .get('/analytics/summary')
      .then((res) => {
        if (res.data?.kpis) setKpis(res.data.kpis);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-12 pb-6">
      {/* 1. Industry-Grade Hero Section with Custom SVG Illustration */}
      <section className="rounded-3xl bg-gradient-to-br from-[#006A4E] via-[#005840] to-[#003E2D] text-white p-6 sm:p-10 lg:p-12 shadow-xl relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/15 border border-white/25 text-xs sm:text-sm font-bold">
              <img
                src="/assets/bhumishield-emblem.svg"
                alt="BhumiShield Emblem"
                className="w-5 h-5"
              />
              <span>
                {siteSettings?.ministry_banner_bn
                  ? t(
                      String(siteSettings.ministry_banner_bn),
                      'Inter-Ministry Trust Layer: Law Ministry (Sub-Registry) & Land Ministry (AC Land)'
                    )
                  : t(
                      'আইন মন্ত্রণালয় (সাব-রেজিস্ট্রি) ও ভূমি মন্ত্রণালয় (এসি ল্যান্ড)-এর আন্তঃসংযোগ ট্রাস্ট লেয়ার',
                      'Inter-Ministry Trust Layer: Sub-Registry & AC Land'
                    )}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">
              {t(
                'নিবন্ধনের আগে মালিকানা যাচাই, নিবন্ধনের পরে অপরিবর্তনীয় হ্যাশ-চেইন সুরক্ষা',
                'Check Every Deed Before Registration. Prove Afterwards It Was Never Tampered With.'
              )}
            </h1>

            <p className="text-base sm:text-lg text-white/90 leading-relaxed max-w-2xl">
              {t(
                'বাংলাদেশে দলিল নিবন্ধন ও ই-নামজারি আলাদা সিস্টেমে চলায় জাল দলিল, ডাবল সেল ও ব্যাংক বন্ধকের তথ্য গোপন থাকে। ভূমি সুরক্ষা (BhumiShield) ৯টি স্বয়ংক্রিয় রুল, Ed25519 ডিজিটাল স্বাক্ষর এবং পাবলিক QR কোডের মাধ্যমে নাগরিক ও সরকারি কর্মকর্তাদের দেয় তাৎক্ষণিক ঝুঁকি সতর্কতা।',
                'Registration and mutation do not talk to each other. BhumiShield plugs into both systems to verify CS-to-BS khatian chains before signing and locks every deed in an Ed25519 hash-chained ledger.'
              )}
            </p>

            {/* Primary Hero CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('check_buy')}
                className="min-h-[52px] px-6 py-3 rounded-2xl bg-white text-[#006A4E] font-extrabold text-base sm:text-lg flex items-center gap-2.5 hover:bg-gray-100 shadow-md cursor-pointer transition"
              >
                <Search className="w-5 h-5" />
                <span>{t('🔎 জমি কেনার আগে যাচাই করুন', '🔎 Check Before You Buy')}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('verify')}
                className="min-h-[52px] px-6 py-3 rounded-2xl bg-[#F42A41] text-white font-extrabold text-base sm:text-lg flex items-center gap-2.5 hover:bg-[#D41F35] shadow-md cursor-pointer transition"
              >
                <QrCode className="w-5 h-5" />
                <span>{t('📷 QR দলিল যাচাই', '📷 Scan / Verify Deed QR')}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('auth')}
                className="min-h-[52px] px-5 py-3 rounded-2xl bg-white/15 border border-white/30 text-white font-bold text-base flex items-center gap-2 hover:bg-white/25 cursor-pointer transition"
              >
                <LogIn className="w-5 h-5" />
                <span>{t('লগইন / নিবন্ধন', 'Login / Register')}</span>
              </button>
            </div>

            {/* Instant Public Deed Lookup Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onNavigate('verify', { deedId: quickDeedNo });
              }}
              className="mt-4 p-2.5 rounded-2xl bg-black/25 border border-white/20 flex flex-col sm:flex-row gap-2 max-w-xl"
            >
              <input
                type="text"
                value={quickDeedNo}
                onChange={(e) => setQuickDeedNo(e.target.value)}
                aria-label={t('দ্রুত দলিল নম্বর যাচাই', 'Quick deed number verify')}
                placeholder={t('দলিল নম্বর দিন (যেমন: DL-2024-1001 বা DL-2026-1005)', 'Enter Deed No (e.g. DL-2024-1001)')}
                className="flex-1 min-h-[46px] px-4 py-2 rounded-xl bg-white text-[#1A1A1A] font-semibold text-sm"
              />
              <button
                type="submit"
                className="min-h-[46px] px-5 py-2 rounded-xl bg-[#006A4E] border border-white/40 text-white font-bold text-sm hover:bg-[#00563F] cursor-pointer shrink-0"
              >
                {t('তাৎক্ষণিক হ্যাশ যাচাই →', 'Instant Verify ->')}
              </button>
            </form>
          </div>

          {/* Right Column: Custom Isometric SVG Illustration */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <img
              src="/assets/hero-land-ledger.svg"
              alt="BhumiShield Khatian to Hash-Chain Ledger Illustration"
              className="w-full max-w-lg rounded-2xl shadow-2xl border-2 border-white/20"
            />
          </div>
        </div>
      </section>

      {/* 2. DaisyUI Live Telemetry & National Ledger Stats */}
      <section aria-label={t('লাইভ লেজার পরিসংখ্যান', 'Live Ledger Telemetry')}>
        <div className="daisy-stats grid-cols-2 md:grid-cols-3 lg:grid-cols-6 shadow-xs">
          <div className="daisy-stat border-b md:border-b-0 border-r border-gray-200">
            <span className="daisy-stat-title">{t('ডিজিটাল দাগ (Plots)', 'Digitized Plots')}</span>
            <span className="daisy-stat-value text-[#006A4E]">{n(kpis.total_plots)}</span>
            <span className="daisy-stat-desc">{t('৩টি মৌজা (সাভার, গাজীপুর, সোনারগাঁও)', 'Across 3 Mouzas')}</span>
          </div>
          <div className="daisy-stat border-b md:border-b-0 border-r border-gray-200">
            <span className="daisy-stat-title">{t('খতিয়ান চেইন (CS→BS)', 'Khatian Records')}</span>
            <span className="daisy-stat-value text-[#006A4E]">{n(kpis.total_khatians)}</span>
            <span className="daisy-stat-desc">{t('CS, SA, RS ও BS জরিপ', 'Full 4-Survey Chain')}</span>
          </div>
          <div className="daisy-stat border-b lg:border-b-0 border-r border-gray-200">
            <span className="daisy-stat-title">{t('হ্যাশ-চেইন দলিল', 'Signed Deeds')}</span>
            <span className="daisy-stat-value text-[#006A4E]">{n(kpis.total_deeds)}</span>
            <span className="daisy-stat-desc">{t('Ed25519 স্বাক্ষরিত ও QR যুক্ত', 'Ed25519 + SHA-256')}</span>
          </div>
          <div className="daisy-stat border-b lg:border-b-0 border-r border-gray-200">
            <span className="daisy-stat-title">{t('জালিয়াতি প্রতিরোধ রুল', 'Fraud Rules')}</span>
            <span className="daisy-stat-value text-[#006A4E]">{n(9)}</span>
            <span className="daisy-stat-desc">{t('১০০% অটোমেটেড প্রাক-যাচাই', 'Pre-Registration Engine')}</span>
          </div>
          <div className="daisy-stat border-r border-gray-200">
            <span className="daisy-stat-title">{t('অপেক্ষমাণ নামজারি', 'Pending Mutations')}</span>
            <span className="daisy-stat-value text-[#B7791F]">{n(kpis.pending_mutations)}</span>
            <span className="daisy-stat-desc">{t('এসি ল্যান্ড কিউতে সক্রিয়', 'In AC Land Queue')}</span>
          </div>
          <div className="daisy-stat">
            <span className="daisy-stat-title">{t('ডেমো সিনারিও', 'Demo Scenarios')}</span>
            <span className="daisy-stat-value text-[#F42A41]">{n(8)}</span>
            <span className="daisy-stat-desc">{t('১-ক্লিকে লাইভ প্রদর্শনী', '1-Click Stage Ready')}</span>
          </div>
        </div>
      </section>

      {/* 3. Role-Based Portal Entry Cards (DaisyUI Dashboard Switcher) */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="daisy-badge daisy-badge-success">
              {t('ভিত্তিক ড্যাশবোর্ড (Role-Wise Portals)', 'Role-Wise Portals')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mt-2">
              {t(
                'ব্যবহারকারী ভিত্তিক ডেডিকেটেড ড্যাশবোর্ডে প্রবেশ করুন',
                'Enter Dedicated Role-Based Dashboards'
              )}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('auth')}
            className="daisy-btn daisy-btn-outline text-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('নতুন ব্যবহারকারী নিবন্ধন বা লগইন করুন', 'Sign In or Register New Account')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              role: 'citizen',
              tab: 'home' as ActiveTab,
              icon: <Search className="w-6 h-6 text-[#006A4E]" />,
              titleBn: 'নাগরিক পোর্টাল',
              titleEn: 'Citizen Portal',
              descBn: 'QR স্ক্যান, জমি কেনার আগে যাচাই ও নিজ এনআইডি সংযুক্ত খতিয়ান দেখুন।',
              descEn: 'Scan deed QR, run Check-Before-You-Buy & view linked plots.',
              badgeBn: 'লগইন ছাড়াও উন্মুক্ত',
              badgeEn: 'Public + Citizen Login',
            },
            {
              role: 'sub_registrar',
              tab: 'registrar' as ActiveTab,
              icon: <FileCheck2 className="w-6 h-6 text-[#006A4E]" />,
              titleBn: 'সাব-রেজিস্ট্রার',
              titleEn: 'Sub-Registrar',
              descBn: 'প্রাক-নিবন্ধন মালিকানা যাচাই উইজার্ড ও Ed25519 ডিজিটাল দলিল নিবন্ধন।',
              descEn: 'Pre-registration fraud check wizard & Ed25519 deed signing.',
              badgeBn: 'আইন মন্ত্রণালয়',
              badgeEn: 'Ministry of Law',
            },
            {
              role: 'ac_land',
              tab: 'acland' as ActiveTab,
              icon: <Landmark className="w-6 h-6 text-[#006A4E]" />,
              titleBn: 'এসি ল্যান্ড (নামজারি)',
              titleEn: 'AC Land Officer',
              descBn: 'ই-নামজারি কিউ, দলিলের হ্যাশ যাচাই ও স্বয়ংক্রিয় বিএস খতিয়ান হালনাগাদ।',
              descEn: 'e-Mutation queue, deed hash inspection & BS khatian update.',
              badgeBn: 'ভূমি মন্ত্রণালয়',
              badgeEn: 'Ministry of Land',
            },
            {
              role: 'bank_officer',
              tab: 'bank' as ActiveTab,
              icon: <Building2 className="w-6 h-6 text-[#006A4E]" />,
              titleBn: 'ব্যাংক কর্মকর্তা',
              titleEn: 'Bank Officer',
              descBn: 'ঋণ অনুমোদনের আগে জামানত যাচাই, নতুন বন্ধক নিবন্ধন ও ছাড়পত্র প্রদান।',
              descEn: 'Collateral check, double-mortgage block & lien release.',
              badgeBn: 'ব্যাংক ও আর্থিক প্রতিষ্ঠান',
              badgeEn: 'Financial Portal',
            },
            {
              role: 'admin',
              tab: 'admin' as ActiveTab,
              icon: <Layers className="w-6 h-6 text-[#F42A41]" />,
              titleBn: 'অ্যাডমিন ও সেটিংস',
              titleEn: 'Admin & Governance',
              descBn: 'লেজার অডিট, লাইভ টেম্পার সিমুলেটর, ইউজার ম্যানেজমেন্ট ও সাইট সেটিংস।',
              descEn: 'Ledger audit, live tamper lab, user CRUD & site settings.',
              badgeBn: 'সিস্টেম গভর্ন্যান্স',
              badgeEn: 'System Control',
            },
          ].map((card) => (
            <div
              key={card.role}
              className="daisy-card p-5 flex flex-col justify-between gap-4 hover:border-[#006A4E] transition"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#E6F2EE] flex items-center justify-center">
                    {card.icon}
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-gray-100 text-[#5F6B66]">
                    {t(card.badgeBn, card.badgeEn)}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#1A1A1A]">
                  {t(card.titleBn, card.titleEn)}
                </h3>
                <p className="text-sm text-[#5F6B66] leading-relaxed">
                  {t(card.descBn, card.descEn)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelectRoleAndGo(card.role, card.tab)}
                className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#E6F2EE] text-[#006A4E] hover:bg-[#006A4E] hover:text-white font-bold text-xs flex items-center justify-between transition cursor-pointer"
              >
                <span>{t('ড্যাশবোর্ডে প্রবেশ করুন', 'Open Dashboard')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Problem vs BhumiShield Solution Comparison */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="daisy-card p-6 sm:p-7 border-l-4 border-l-[#F42A41] space-y-4">
          <span className="daisy-badge daisy-badge-error">
            {t('বিদ্যমান ব্যবস্থার সীমাবদ্ধতা', 'Current System Gaps')}
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">
            {t(
              'কেন এখনো জাল দলিল ও ডাবল সেল ঘটে?',
              'Why Do Fake Deeds and Double Sales Still Slip Through?'
            )}
          </h3>
          <ul className="space-y-2.5 text-sm sm:text-base text-[#1A1A1A]">
            <li className="flex items-start gap-2.5">
              <span className="text-[#F42A41] font-bold">✖</span>
              <span>
                {t(
                  'সাব-রেজিস্ট্রি (আইন মন্ত্রণালয়) এবং এসি ল্যান্ড (ভূমি মন্ত্রণালয়) রিয়েল-টাইমে সংযুক্ত নয়।',
                  'Sub-Registry (Law Ministry) and AC Land (Land Ministry) operate in separate silos.'
                )}
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-[#F42A41] font-bold">✖</span>
              <span>
                {t(
                  'প্রথম ক্রেতার নামজারি শেষ হতে ৩০–৪৫ দিন লাগে—এই ফাঁকে অসাধু বিক্রেতা একই জমি দ্বিতীয়বার বিক্রি করে।',
                  'Mutation takes 30–45 days; dishonest sellers exploit this window to sell the same plot twice.'
                )}
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-[#F42A41] font-bold">✖</span>
              <span>
                {t(
                  'নিবন্ধনের পরে বালাম বহি বা ডাটাবেজে জমির পরিমাণ পরিবর্তন করলে সাধারণ ক্রেতার তা বোঝার উপায় থাকে না।',
                  'Post-registration tampering of area or shares cannot be detected from paper copies alone.'
                )}
              </span>
            </li>
          </ul>
        </div>

        <div className="daisy-card p-6 sm:p-7 border-l-4 border-l-[#006A4E] space-y-4">
          <div className="flex items-center justify-between">
            <span className="daisy-badge daisy-badge-success">
              {t('ভূমি সুরক্ষা (BhumiShield) সমাধান', 'The BhumiShield Trust Layer')}
            </span>
            <img
              src="/assets/digital-deed-seal.svg"
              alt="Ed25519 Verified Seal"
              className="w-12 h-12"
            />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-[#006A4E]">
            {t(
              'আমরা কীভাবে নিবন্ধনের আগে ও পরে সুরক্ষা নিশ্চিত করি?',
              'How BhumiShield Protects Citizens & Officers'
            )}
          </h3>
          <ul className="space-y-2.5 text-sm sm:text-base text-[#1A1A1A]">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#006A4E] shrink-0 mt-0.5" />
              <span>
                {t(
                  'নিবন্ধন-পূর্ব ৯টি রুল ইঞ্জিন: CS→SA→RS→BS খতিয়ান চেইন, মালিকানা ভগ্নাংশ, ব্যাংক বন্ধক ও পেন্ডিং দলিল তাৎক্ষণিক যাচাই।',
                  'Pre-Registration 9-Rule Engine checks CS->BS khatian chains, share fractions, active liens & pending deeds.'
                )}
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Lock className="w-5 h-5 text-[#006A4E] shrink-0 mt-0.5" />
              <span>
                {t(
                  'টেম্পার-এভিডেন্ট হ্যাশ-চেইন লেজার: প্রতিটি দলিল SHA-256 হ্যাশ চেইন ও Ed25519 ডিজিটাল স্বাক্ষরে আবদ্ধ।',
                  'Tamper-Evident Ledger: Every deed is linked via SHA-256 prev_hash and signed with Ed25519.'
                )}
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#006A4E] shrink-0 mt-0.5" />
              <span>
                {t(
                  'মানব কর্মকর্তার সিদ্ধান্তকে সম্মান: এটি শুধুমাত্র ঝুঁকি ফ্ল্যাগ করে; চূড়ান্ত আইনি সিদ্ধান্ত সাব-রেজিস্ট্রার ও এসি ল্যান্ডের।',
                  'Human-in-the-Loop: Flags risk with evidence; human officers always make the final legal decision.'
                )}
              </span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
};
