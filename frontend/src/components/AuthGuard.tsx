import React from 'react';
import { useAppUI, UserRole } from '../i18n';
import {
  ShieldAlert,
  Lock,
  LogIn,
  Home,
  Search,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building2,
  KeyRound,
} from 'lucide-react';

interface AuthGuardProps {
  allowedRoles: UserRole[];
  roleTitleBn: string;
  roleTitleEn: string;
  deptBn?: string;
  deptEn?: string;
  onNavigate: (tab: string) => void;
  children: React.ReactNode;
}

const ROLE_NAMES: Record<UserRole, { bn: string; en: string; tab: string }> = {
  citizen: {
    bn: 'নাগরিক (Citizen)',
    en: 'Citizen',
    tab: 'home',
  },
  sub_registrar: {
    bn: 'সাব-রেজিস্ট্রার (Sub-Registrar)',
    en: 'Sub-Registrar',
    tab: 'registrar',
  },
  ac_land: {
    bn: 'সহকারী কমিশনার - ভূমি (AC Land)',
    en: 'Assistant Commissioner of Land',
    tab: 'acland',
  },
  bank_officer: {
    bn: 'ব্যাংক কর্মকর্তা (Bank Officer)',
    en: 'Bank Officer',
    tab: 'bank',
  },
  admin: {
    bn: 'জাতীয় সিস্টেম অ্যাডমিন ও অডিটর (Admin)',
    en: 'System Admin & Auditor',
    tab: 'admin',
  },
};

export const AuthGuard: React.FC<AuthGuardProps> = ({
  allowedRoles,
  roleTitleBn,
  roleTitleEn,
  deptBn,
  deptEn,
  onNavigate,
  children,
}) => {
  const { user, token, logout, lang, t } = useAppUI();

  // 1. Unauthenticated Guest: Block completely and show Authentication Required screen
  if (!user || !token) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#074f38] p-6 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 ring-2 ring-amber-400/30">
                <Lock className="w-6 h-6" />
              </span>
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 text-[11px] font-bold border border-amber-400/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t('সরকারি সংরক্ষিত তথ্য এলাকা', 'Restricted Official Domain')}</span>
                </span>
                <h1 className="text-xl sm:text-2xl font-black mt-1 text-white">
                  {t(`${roleTitleBn} — লগইন প্রয়োজন`, `${roleTitleEn} — Authentication Required`)}
                </h1>
                {(deptBn || deptEn) && (
                  <p className="text-xs text-slate-300 mt-0.5 font-medium">
                    {lang === 'bn' ? deptBn : deptEn}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Body Alert */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-3.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm leading-relaxed">
                <span className="font-bold block text-amber-900 mb-0.5">
                  {t('অননুমোদিত প্রবেশাধিকার নিষিদ্ধ', 'Unauthorized Access Prohibited')}
                </span>
                {t(
                  'ভূমি রেকর্ড, দলিল নিবন্ধন, খতিয়ান সমন্বয় ও ব্যাংক মর্টগেজ সংক্রান্ত তথ্য অত্যন্ত স্পর্শকাতর। এই ওয়ার্কস্পেসটিতে শুধুমাত্র অনুমোদিত কর্মকর্তাদের বৈধ ডিজিটাল শংসাপত্র ও পাসওয়ার্ড দিয়ে প্রবেশের অনুমতি রয়েছে। বহিরাগত অতিথি হিসেবে এই কার্যক্রমে প্রবেশাধিকার নেই।',
                  'Land records, deed registrations, mutation reconciliations, and bank liens are strictly protected government assets. This workspace requires authorized officer credentials. Anonymous guest access is strictly prohibited.'
                )}
              </div>
            </div>

            {/* Access Requirements Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  {t('প্রয়োজনীয় পদবী ও ভূমিকা', 'Required Officer Role')}
                </span>
                <div className="mt-1 font-bold text-slate-900 text-sm">
                  {lang === 'bn' ? roleTitleBn : roleTitleEn}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {t('অথবা জাতীয় অ্যাডমিন ও অডিট প্যানেল', 'or National System Admin')}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  {t('নিরাপত্তা প্রোটোকল', 'Security Protocol')}
                </span>
                <div className="mt-1 font-mono text-xs font-bold text-emerald-800">
                  Ed25519 JWT RBAC Enforced
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {t('প্রতিটি অনুরোধ ক্রিপ্টোগ্রাফিকভাবে যাচাইকৃত', 'Every request verified with strict token')}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => onNavigate('auth')}
                className="flex-1 py-3 px-5 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{t('অনুমোদিত কর্মকর্তা লগইন করুন', 'Sign In with Officer Credentials')}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('landing')}
                className="py-3 px-5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>{t('পাবলিক হোমপেজ', 'Public Home')}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('check')}
                className="py-3 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Search className="w-4 h-4 text-emerald-700" />
                <span>{t('পাবলিক জমি যাচাই', 'Public Verification')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authenticated, but Wrong Role (e.g. Citizen attempting to access Sub-Registrar / AC Land / Admin)
  const isAllowed = allowedRoles.includes(user.role) || user.role === 'admin';

  if (!isAllowed) {
    const currentRoleInfo = ROLE_NAMES[user.role] || {
      bn: user.role,
      en: user.role,
      tab: 'home',
    };

    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="bg-white rounded-2xl border border-red-200 shadow-xl overflow-hidden">
          {/* Crimson Security Banner */}
          <div className="bg-gradient-to-r from-red-950 via-rose-900 to-red-800 p-6 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/20 text-red-200 ring-2 ring-red-400/40">
                <ShieldAlert className="w-6 h-6" />
              </span>
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/30 text-white text-[11px] font-bold border border-red-400/40">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{t('HTTP 403 • অননুমোদিত অ্যাক্সেস', 'HTTP 403 • Forbidden Role')}</span>
                </span>
                <h1 className="text-xl sm:text-2xl font-black mt-1 text-white">
                  {t('আপনার অ্যাকাউন্টে এই প্যানেলে প্রবেশের অনুমতি নেই', 'Access Denied — Insufficient Role Privileges')}
                </h1>
                <p className="text-xs text-red-200 mt-0.5">
                  {t(
                    'রোল-ভিত্তিক এক্সেস কন্ট্রোল (RBAC) অনুযায়ী এই কার্যসম্পাদন সীমিত।',
                    'Access to this workspace is restricted according to strict RBAC policies.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Detailed Mismatch Comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  {t('আপনার বর্তমান লগইন আইডি', 'Your Current Profile')}
                </span>
                <div className="mt-1 font-bold text-slate-900 text-sm">
                  {user.full_name_bn || user.username}
                </div>
                <div className="text-xs font-mono text-slate-600 mt-0.5">
                  @{user.username} • {lang === 'bn' ? currentRoleInfo.bn : currentRoleInfo.en}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                <span className="text-[11px] font-bold text-red-700 uppercase tracking-wide">
                  {t('এই প্যানেলে অনুমোদিত পদবী', 'Required Authorized Role')}
                </span>
                <div className="mt-1 font-bold text-red-900 text-sm">
                  {lang === 'bn' ? roleTitleBn : roleTitleEn}
                </div>
                <div className="text-xs text-red-600 mt-0.5 font-medium">
                  {t('শুধুমাত্র নির্দিষ্ট সরকারি কর্মকর্তা', 'Exclusive to authorized officer account')}
                </div>
              </div>
            </div>

            {/* Audit Log Security Warning */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs leading-relaxed flex items-center gap-3">
              <KeyRound className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                {t(
                  'নিরাপত্তা সতর্কতা: প্রতিটি অননুমোদিত অ্যাক্সেস প্রচেষ্টা কেন্দ্রীয় ব্লকচেইন লেজারে ক্রিপ্টোগ্রাফিক টাইমস্ট্যাম্পসহ অডিট লগে রেকর্ড করা হয়।',
                  'Security Notice: Every unauthorized access attempt is immutably logged with cryptographic timestamp in the national audit ledger.'
                )}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  logout();
                  onNavigate('auth');
                }}
                className="flex-1 py-3 px-5 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{t('অনুমোদিত অ্যাকাউন্টে পরিবর্তন করুন', 'Switch to Authorized Account')}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate(currentRoleInfo.tab)}
                className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>{t('আমার নিজস্ব ড্যাশবোর্ড', 'My Own Dashboard')}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('landing')}
                className="py-3 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>{t('হোম', 'Home')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authorized: Render Protected Workspace
  return <>{children}</>;
};
