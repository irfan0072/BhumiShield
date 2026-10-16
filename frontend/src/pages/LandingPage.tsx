import React, { useState, useEffect } from 'react';
import { useAppUI, UserRole } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import {
  ShieldCheck,
  QrCode,
  Search,
  Landmark,
  FileSpreadsheet,
  Building2,
  Lock,
  ArrowRight,
  LogIn,
  KeyRound,
} from 'lucide-react';

const ROLE_ROUTE: Record<UserRole, string> = {
  citizen: 'home',
  sub_registrar: 'registrar',
  ac_land: 'acland',
  bank_officer: 'bank',
  admin: 'admin',
};

export const LandingPage: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { lang, setRole, setUser, setToken, t } = useAppUI();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    BhumiApi.getStatsSummary()
      .then((res) => setStats(res))
      .catch(() => {});
  }, []);

  const enterRolePortal = async (targetRole: UserRole) => {
    try {
      const res = await BhumiApi.switchDemoRole(targetRole);
      if (res?.access_token && res?.user) {
        setToken(res.access_token);
        setUser(res.user);
      } else {
        setRole(targetRole);
      }
    } catch {
      setRole(targetRole);
    }
    onNavigate(ROLE_ROUTE[targetRole]);
  };

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="rounded-3xl bg-gradient-to-br from-[#006A4E] via-[#00573F] to-[#003D2C] text-white p-6 md:p-10 shadow-xl relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/25 text-xs md:text-sm font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F42A41]" />
              <span>
                {t(
                  'LandTech Innovation Hackathon 2026 • Laravel 11 + RBAC Middleware',
                  'LandTech Innovation Hackathon 2026 • Laravel 11 + RBAC Middleware'
                )}
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
              {t(
                'নিবন্ধন ও নামজারির মাঝে আস্থার সেতু — দলিল জালিয়াতি রোধে ভূমি সুরক্ষা',
                'The Trust Layer Between Registration & Mutation — BhumiShield'
              )}
            </h1>

            <p className="text-base md:text-lg text-emerald-50 leading-relaxed">
              {t(
                'সাব-রেজিস্ট্রি অফিস এবং এসি ল্যান্ড অফিসের মধ্যে তাৎক্ষণিক সংযোগ। দলিল রেজিস্ট্রির আগেই CS → SA → RS → BS খতিয়ান চেইন, মালিকের বিক্রয় লক, চলমান বিরোধ ও ব্যাংক মর্টগেজ যাচাই করুন এবং Ed25519 স্বাক্ষরিত অপরিবর্তনীয় হ্যাশ-চেইন লেজারে সংরক্ষণ করুন।',
                'Real-time verification across Sub-Registry, AC Land, and Banks. Check CS → SA → RS → BS khatian lineage, owner sale locks, active disputes, and mortgages before registration with an Ed25519 hash-chained ledger.'
              )}
            </p>

            {/* Primary CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('check')}
                className="px-6 py-3.5 rounded-xl bg-white text-[#006A4E] font-extrabold text-base md:text-lg shadow-md hover:bg-emerald-50 flex items-center gap-2 cursor-pointer"
              >
                <Search className="w-5 h-5" />
                <span>{t('জমি কেনার আগে যাচাই করুন', 'Check Land Before You Buy')}</span>
              </button>

              <button
                onClick={() => onNavigate('qr')}
                className="px-5 py-3.5 rounded-xl bg-[#F42A41] text-white font-extrabold text-base md:text-lg shadow-md hover:bg-red-700 flex items-center gap-2 cursor-pointer"
              >
                <QrCode className="w-5 h-5" />
                <span>{t('QR দলিল যাচাই', 'Scan / Verify Deed QR')}</span>
              </button>

              <button
                onClick={() => onNavigate('auth')}
                className="px-5 py-3.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold text-base flex items-center gap-2 cursor-pointer"
              >
                <LogIn className="w-5 h-5" />
                <span>{t('লগইন / অ্যাকাউন্ট', 'Login / Register')}</span>
              </button>
            </div>
          </div>

          {/* Right Hero SVG Illustration */}
          <div className="lg:col-span-5 flex justify-center">
            <img
              src="/assets/hero-land-ledger.svg"
              alt="BhumiShield Architecture Illustration"
              className="w-full max-w-md rounded-2xl shadow-2xl border-2 border-white/20 bg-white/5"
            />
          </div>
        </div>

        {/* Live Telemetry Stats Bar */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-8 pt-6 border-t border-white/20">
            <StatPill
              label={t('মোট দাগ (Plots)', 'Total Plots')}
              value={toBanglaDigits(stats.counts.plots, lang)}
            />
            <StatPill
              label={t('খতিয়ান চেইন', 'Khatian Records')}
              value={toBanglaDigits(stats.counts.khatians, lang)}
            />
            <StatPill
              label={t('নিবন্ধিত দলিল', 'Chained Deeds')}
              value={toBanglaDigits(stats.counts.deeds, lang)}
            />
            <StatPill
              label={t('সক্রিয় মর্টগেজ', 'Active Liens')}
              value={toBanglaDigits(stats.counts.active_mortgages, lang)}
            />
            <StatPill
              label={t('পেন্ডিং নামজারি', 'Pending Mutations')}
              value={toBanglaDigits(stats.counts.pending_mutations, lang)}
            />
            <StatPill
              label={t('সিস্টেম ইউজার', 'System Users')}
              value={toBanglaDigits(stats.counts.users, lang)}
            />
          </div>
        )}
      </section>

      {/* Role-Based Portals & Controlling Systems */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#1A1A1A] flex items-center gap-2">
              <KeyRound className="w-7 h-7 text-[#006A4E]" />
              <span>
                {t(
                  '৫টি রোল-ভিত্তিক ডেডিকেটেড ড্যাশবোর্ড ও কন্ট্রোলিং সিস্টেম',
                  '5 Dedicated Role-Based Dashboards & Controlling Consoles'
                )}
              </span>
            </h2>
            <p className="text-sm text-[#5F6B66]">
              {t(
                'যেকোনো কার্ডে ক্লিক করলে স্বয়ংক্রিয়ভাবে সেই রোলের JWT সেশন ও RBAC পারমিশন সহ ড্যাশবোর্ড খুলবে:',
                'Click any card to switch into that role with a real JWT session and RBAC middleware controls:'
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <RoleCard
            icon={<ShieldCheck className="w-7 h-7 text-[#006A4E]" />}
            badge={t('নাগরিক (Citizen)', 'Citizen Role')}
            title={t('নাগরিক ভল্ট ও বিক্রয় লক', 'Citizen Vault & Sale Lock')}
            desc={t(
              'নিজের জমির দাগ লক করুন (বিক্রয় লক), অভিযোগ দাখিল করুন, QR দলিল যাচাই ও কেনার আগে ঝুঁকি পরীক্ষা করুন।',
              'Lock plots against unauthorized sale, file land disputes, verify QR deeds & check plots before buying.'
            )}
            onClick={() => enterRolePortal('citizen')}
          />

          <RoleCard
            icon={<FileSpreadsheet className="w-7 h-7 text-[#006A4E]" />}
            badge={t('সাব-রেজিস্ট্রার', 'Sub-Registrar')}
            title={t('দলিল নিবন্ধন ও ফি ক্যালকুলেটর', 'Deed Registry & Fee Control')}
            desc={t(
              '১১টি জালিয়াতি রুল চেক, সরকারি স্ট্যাম্প ও নিবন্ধন ফি ক্যালকুলেটর, এবং স্থগিত (HELD) দলিল রিলিজ/বাতিল কন্ট্রোল।',
              'Run 11 fraud rules, calculate stamp/registration fees, and release or reject HELD deeds.'
            )}
            onClick={() => enterRolePortal('sub_registrar')}
          />

          <RoleCard
            icon={<Landmark className="w-7 h-7 text-[#006A4E]" />}
            badge={t('এসি ল্যান্ড', 'AC Land Officer')}
            title={t('নামজারি, খতিয়ান ও বিরোধ নিষ্পত্তি', 'Mutation, Khatian & Disputes')}
            desc={t(
              'স্বয়ংক্রিয় ই-মিউটেশন অনুমোদন, ত্রুটিপূর্ণ খতিয়ান চেইন ও ওয়ারিশ সমন্বয় এবং নাগরিকদের অভিযোগ নিষ্পত্তি।',
              'Approve e-mutations, reconcile broken khatian chains & heirs, and resolve citizen disputes.'
            )}
            onClick={() => enterRolePortal('ac_land')}
          />

          <RoleCard
            icon={<Building2 className="w-7 h-7 text-[#006A4E]" />}
            badge={t('ব্যাংক কর্মকর্তা', 'Bank Officer')}
            title={t('মর্টগেজ লিয়েন ও ডিজিটাল NOC', 'Mortgage Lien & Digital NOC')}
            desc={t(
              'দ্বৈত মর্টগেজ রোধ, নতুন ব্যাংক লিয়েন এন্ট্রি এবং ঋণ পরিশোধে QR সহ ডিজিটাল ছাড়পত্র (NOC) ইস্যু।',
              'Prevent double-mortgaging, register bank liens, and issue QR-signed Digital NOC release certificates.'
            )}
            onClick={() => enterRolePortal('bank_officer')}
          />

          <RoleCard
            icon={<Lock className="w-7 h-7 text-[#F42A41]" />}
            badge={t('অ্যাডমিন ও অডিটর', 'Admin & Auditor')}
            title={t('RBAC ম্যাট্রিক্স, ইউজার ও সেটিংস', 'RBAC Matrix, Users & Ledger')}
            desc={t(
              'RBAC পারমিশন ম্যাট্রিক্স, ইউজার CRUD, রুল ইঞ্জিন থ্রেশহোল্ড, ৮টি ডেমো সিনারিও এবং হ্যাশ-চেইন ট্যাম্পার সিমুলেটর।',
              'Manage RBAC matrix, users CRUD, rules engine thresholds, 8 demo scenarios & live tamper simulator.'
            )}
            onClick={() => enterRolePortal('admin')}
          />
        </div>
      </section>
    </div>
  );
};

const StatPill: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-white/10 rounded-xl p-3 border border-white/15">
    <div className="text-2xl font-extrabold text-white">{value}</div>
    <div className="text-xs text-emerald-100 font-medium">{label}</div>
  </div>
);

const RoleCard: React.FC<{
  icon: React.ReactNode;
  badge: string;
  title: string;
  desc: string;
  onClick: () => void;
}> = ({ icon, badge, title, desc, onClick }) => {
  const { t } = useAppUI();
  return (
    <button
      onClick={onClick}
      className="card-surface text-left bg-white rounded-2xl p-5 border-2 border-gray-200 hover:border-[#006A4E] shadow-xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="w-12 h-12 rounded-xl bg-[#E6F2EE] flex items-center justify-center">
            {icon}
          </div>
          <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-gray-100 text-gray-800">
            {badge}
          </span>
        </div>
        <h3 className="text-lg font-extrabold text-[#1A1A1A] group-hover:text-[#006A4E]">
          {title}
        </h3>
        <p className="text-xs text-[#5F6B66] mt-1.5 leading-relaxed">{desc}</p>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-extrabold text-[#006A4E]">
        <span>{t('ড্যাশবোর্ডে প্রবেশ করুন', 'Open Role Console')}</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );
};
