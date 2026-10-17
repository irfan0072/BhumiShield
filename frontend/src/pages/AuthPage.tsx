import React, { useState } from 'react';
import { useAppUI, UserRole } from '../i18n';
import { BhumiApi } from '../api/client';
import {
  LogIn,
  UserPlus,
  KeyRound,
  CheckCircle2,
  ShieldAlert,
  UserCheck,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  FileText,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

const ROLE_ROUTE: Record<string, string> = {
  citizen: 'home',
  sub_registrar: 'registrar',
  ac_land: 'acland',
  bank_officer: 'bank',
  admin: 'admin',
};

export const AuthPage: React.FC<{
  mode?: 'login' | 'profile';
  onSuccessNavigate: (tab: string) => void;
}> = ({ mode = 'login', onSuccessNavigate }) => {
  const { lang, user, setUser, setToken, t } = useAppUI();
  const [tab, setTab] = useState<'login' | 'register' | 'profile'>(
    user && mode === 'profile' ? 'profile' : 'login'
  );

  const isDemoMode = import.meta.env.DEV;
  const [username, setUsername] = useState(isDemoMode ? 'citizen' : '');
  const [password, setPassword] = useState(isDemoMode ? 'demo123' : '');
  const [showPassword, setShowPassword] = useState(false);

  // Registration state - strictly locked to citizen
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState(isDemoMode ? 'demo123' : '');
  const [regNameBn, setRegNameBn] = useState('');
  const [regNameEn, setRegNameEn] = useState('');
  const [regNid, setRegNid] = useState(isDemoMode ? '9900001099' : '');
  const [regPhone, setRegPhone] = useState(isDemoMode ? '01700-000999' : '');
  const [regOffice, setRegOffice] = useState('ঢাকা, বাংলাদেশ');

  // Profile update state
  const [profNameBn, setProfNameBn] = useState(user?.full_name_bn || '');
  const [profNameEn, setProfNameEn] = useState(user?.full_name_en || '');
  const [profPhone, setProfPhone] = useState(user?.phone_mock || '');
  const [profOffice, setProfOffice] = useState(user?.office_name || '');
  const [profNewPass, setProfNewPass] = useState('');
  const [profCurrentPass, setProfCurrentPass] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (u = username, p = password) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await BhumiApi.login(u.trim(), p);
      if (res?.access_token && res?.user) {
        setToken(res.access_token);
        setUser(res.user);
        setSuccessMsg(t('সফলভাবে পরিচয় নিশ্চিত হয়েছে!', 'Signed in successfully!'));
        setTimeout(() => {
          onSuccessNavigate(ROLE_ROUTE[res.user.role as UserRole] || 'home');
        }, 250);
      } else {
        throw new Error('Invalid authentication response');
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setErrorMsg(
        detail
          ? lang === 'bn'
            ? detail.message_bn
            : detail.message_en
          : t('লগইন ব্যর্থ হয়েছে। আপনার ইউজারনেম ও পাসওয়ার্ড সঠিক কিনা পরীক্ষা করুন।', 'Sign in failed. Please verify credentials.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      // Public registration is strictly restricted to citizen role
      const res = await BhumiApi.register({
        username: regUsername.trim(),
        password: regPassword,
        full_name_bn: regNameBn.trim(),
        full_name_en: regNameEn.trim() || regNameBn.trim(),
        role: 'citizen',
        nid: regNid.trim(),
        phone_dummy: regPhone.trim(),
        office_bn: regOffice.trim(),
      });
      setToken(res.access_token);
      setUser(res.user);
      onSuccessNavigate('home');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setErrorMsg(
        detail
          ? lang === 'bn'
            ? detail.message_bn
            : detail.message_en
          : t('নিবন্ধন ব্যর্থ হয়েছে। সঠিক তথ্য প্রদান করুন।', 'Registration failed. Please check inputs.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await BhumiApi.updateProfile({
        full_name_bn: profNameBn,
        full_name_en: profNameEn,
        phone_mock: profPhone,
        ...(user?.role === 'admin' ? { office_name: profOffice } : {}),
        current_password: profNewPass ? profCurrentPass : undefined,
        new_password: profNewPass || undefined,
      });
      setUser(res.user);
      setSuccessMsg(t('প্রোফাইল সফলভাবে আপডেট হয়েছে।', 'Profile updated.'));
    } catch {
      setErrorMsg(t('প্রোফাইল আপডেট করতে সমস্যা হয়েছে।', 'Failed to update profile.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Government Platform Header */}
      <div className="text-center space-y-2 mb-2">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-[#006A4E] text-white text-xl font-bold ring-4 ring-emerald-100 shadow-sm mx-auto">
          <span>ভূ</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {t('ভূমি সুরক্ষা গেটওয়ে', 'BhumiShield Account Sign-In')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          {t('স্বাধীন ভূমি রেকর্ড ও যাচাই অ্যাপ্লিকেশন', 'Independent land-record workflow and verification application')}
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4 mb-6">
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 cursor-pointer transition min-h-[38px] ${
              tab === 'login' ? 'bg-[#006A4E] text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>{t('নিরাপদ সাইন-ইন (Sign In)', 'Sign In')}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('register')}
            className={`px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 cursor-pointer transition min-h-[38px] ${
              tab === 'register' ? 'bg-[#006A4E] text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('নাগরিক নিবন্ধন (Citizen Register)', 'Citizen Register')}</span>
          </button>
          {user && (
            <button
              type="button"
              onClick={() => setTab('profile')}
              className={`px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 cursor-pointer transition min-h-[38px] ${
                tab === 'profile' ? 'bg-[#006A4E] text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>{t('আমার প্রোফাইল', 'My Profile')}</span>
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="p-4 mb-6 rounded-xl bg-red-50 border border-red-200 text-red-900 font-bold text-xs flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 mb-6 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. Login Tab */}
        {tab === 'login' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left: Official Login Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="md:col-span-7 space-y-4"
            >
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {t('আপনার অ্যাকাউন্টে প্রবেশ করুন', 'Sign In to Your Workspace')}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('নাগরিক বা অনুমোদিত কর্মকর্তা ক্রেডেনশিয়াল প্রদান করুন', 'Enter citizen or authorized officer credentials')}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('ইউজারনেম বা এনআইডি (Username or NID):', 'Username or NID:')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. citizen or registrar"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-sm focus:border-[#006A4E] focus:ring-2 focus:ring-[#006A4E]/20 focus:outline-none"
                    required
                  />
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('গোপনীয় পাসওয়ার্ড (Password):', 'Password:')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 font-mono text-sm focus:border-[#006A4E] focus:ring-2 focus:ring-[#006A4E]/20 focus:outline-none"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-sm cursor-pointer shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{loading ? t('যাচাই হচ্ছে...', 'Verifying credentials...') : t('পোর্টালে প্রবেশ করুন', 'Sign In to Workspace')}</span>
                </button>
              </div>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-500">
                  {t('কোনো অ্যাকাউন্ট নেই? ', "Don't have an account? ")}
                </span>
                <button
                  type="button"
                  onClick={() => setTab('register')}
                  className="text-xs font-bold text-[#006A4E] hover:underline cursor-pointer"
                >
                  {t('নাগরিক নিবন্ধন করুন', 'Register as Citizen')}
                </button>
              </div>
            </form>

            {/* Right: Security Standards & Institutional Notice */}
            <div className="md:col-span-5 bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800 border-b border-slate-200 pb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{t('প্রাতিষ্ঠানিক নিরাপত্তা নির্দেশিকা ও প্রটোকল', 'Security Standards & Protocol')}</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 block">Ed25519 ক্রিপ্টোগ্রাফিক সুরক্ষা</span>
                    <span>দলিলের জন্য Ed25519 স্বাক্ষর এবং সেশনের জন্য মেয়াদযুক্ত ও প্রত্যাহারযোগ্য টোকেন ব্যবহৃত হয়।</span>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 block">কঠোর রোল-ভিত্তিক প্রবেশাধিকার</span>
                    <span>সাব-রেজিস্ট্রার, এসি ল্যান্ড ও ব্যাংক অফিসার অ্যাকাউন্ট শুধুমাত্র সংশ্লিষ্ট প্রশাসনিক দপ্তর কর্তৃক ইস্যু করা হয়।</span>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 block">কেন্দ্রীয় অডিট ট্রেইল</span>
                    <span>সমর্থিত রেকর্ড পরিবর্তন ও দাপ্তরিক সিদ্ধান্ত অডিট ট্রেইলে নথিভুক্ত হয়।</span>
                  </div>
                </li>
              </ul>

              <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{t('জরুরি সহায়তা: জাতীয় হেল্পলাইন ১৬১২২', 'Emergency Support: National Helpline 16122')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Evaluator Reference Helper (Clean collapsible disclosure for hackathon testing without exposing bypass buttons) */}
        {isDemoMode && tab === 'login' && (
          <details className="mt-8 border border-slate-200 rounded-xl bg-slate-50/70 overflow-hidden text-xs">
            <summary className="px-4 py-3 font-semibold text-slate-600 cursor-pointer flex items-center justify-between hover:text-slate-900 select-none">
              <span className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                <span>{t('মূল্যায়নকারী ও পরীক্ষক ডেমো নির্দেশিকা (Evaluator Test Credentials)', 'Evaluator Prototype Test Credentials')}</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium">তথ্য দেখুন ▼</span>
            </summary>
            <div className="p-4 pt-1 border-t border-slate-200 text-slate-600 space-y-2 text-xs bg-white">
              <p className="text-slate-500">
                {t(
                  'ভূমি সুরক্ষা প্রোটোটাইপ মূল্যায়নের জন্য নিম্নের নমুনা অ্যাকাউন্ট ইউজারনেম ও পাসওয়ার্ড ইনপুট বক্সে টাইপ করুন:',
                  'For evaluation, type the following verified prototype credentials into the sign-in form above:'
                )}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-800 block text-xs">নাগরিক (Citizen)</span>
                  <span className="text-slate-600">user: citizen</span>
                  <span className="text-slate-400 block">pass: demo123</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-800 block text-xs">সাব-রেজিস্ট্রার</span>
                  <span className="text-slate-600">user: registrar</span>
                  <span className="text-slate-400 block">pass: demo123</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-800 block text-xs">এসি ল্যান্ড</span>
                  <span className="text-slate-600">user: acland</span>
                  <span className="text-slate-400 block">pass: demo123</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-800 block text-xs">ব্যাংক কর্মকর্তা</span>
                  <span className="text-slate-600">user: bank</span>
                  <span className="text-slate-400 block">pass: demo123</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                {t(
                  '* অ্যাডমিন ও অডিটর ক্রেডেনশিয়াল সিস্টেম প্রশাসকের জন্য সংরক্ষিত।',
                  '* System auditor credentials are reserved for security oversight.'
                )}
              </p>
            </div>
          </details>
        )}

        {/* 2. Citizen Registration Tab (Strictly Locked to Citizen Role) */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {t('নাগরিক অ্যাকাউন্ট নিবন্ধন (এনআইডি যাচাই সহ)', 'Citizen Account Registration (with NID Verification)')}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('জাতীয় পরিচয়পত্র ও মোবাইল নম্বর দিয়ে নাগরিক সেবা ভল্টে যুক্ত হন', 'Register your citizen profile to protect your land holdings with digital sale locks')}
              </p>
            </div>

            {/* Account Type Badge */}
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>{t('অ্যাকাউন্টের ধরন: সাধারণ নাগরিক (Citizen Account)', 'Account Type: Verified Citizen Account')}</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                Role: citizen
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('ইউজারনেম (Username):', 'Username:')}
                </label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="e.g. saiful_islam"
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('পাসওয়ার্ড (Password):', 'Password:')}
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('পূর্ণ নাম (বাংলায়):', 'Full Name (Bangla):')}
                </label>
                <input
                  type="text"
                  value={regNameBn}
                  onChange={(e) => setRegNameBn(e.target.value)}
                  placeholder="মোঃ সাইফুল ইসলাম"
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('পূর্ণ নাম (ইংরেজিতে):', 'Full Name (English):')}
                </label>
                <input
                  type="text"
                  value={regNameEn}
                  onChange={(e) => setRegNameEn(e.target.value)}
                  placeholder="Md. Saiful Islam"
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('এনআইডি নম্বর (১০ বা ১৭ ডিজিট):', 'NID Number (10 or 17 digits):')}
                </label>
                <input
                  type="text"
                  value={regNid}
                  onChange={(e) => setRegNid(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('মোবাইল নম্বর:', 'Phone Number:')}
                </label>
                <input
                  type="text"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('ঠিকানা / অবস্থান:', 'Address / Location:')}
                </label>
                <input
                  type="text"
                  value={regOffice}
                  onChange={(e) => setRegOffice(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                {t(
                  'বিজ্ঞপ্তি: সরকারি কর্মকর্তা ও ব্যাংক প্যানেলের আইডি প্রশাসনিকভাবে অনুমোদনপ্রাপ্ত দপ্তর কর্তৃক সংরক্ষিত ও ইস্যু করা হয়।',
                  'Notice: Government officer and bank institutional IDs are provisioned exclusively by administrative departments.'
                )}
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="py-3 px-6 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs cursor-pointer shadow-sm transition"
              >
                {t('নাগরিক অ্যাকাউন্ট নিবন্ধন করুন', 'Complete Citizen Registration')}
              </button>
            </div>
          </form>
        )}

        {/* 3. Profile Tab */}
        {tab === 'profile' && user && (
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {t('প্রোফাইল ও নিরাপত্তা সেটিংস', 'Profile & Security Settings')}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('আপনার ব্যক্তিগত বিবরণ ও পাসওয়ার্ড পরিবর্তন করুন', 'Update personal details and change password')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('পূর্ণ নাম (বাংলা):', 'Full Name (Bangla):')}
                </label>
                <input
                  type="text"
                  value={profNameBn}
                  onChange={(e) => setProfNameBn(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('পূর্ণ নাম (ইংরেজি):', 'Full Name (English):')}
                </label>
                <input
                  type="text"
                  value={profNameEn}
                  onChange={(e) => setProfNameEn(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('মোবাইল নম্বর:', 'Phone:')}
                </label>
                <input
                  type="text"
                  value={profPhone}
                  onChange={(e) => setProfPhone(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('অফিস / ঠিকানা:', 'Office / Location:')}
                </label>
                <input
                  type="text"
                  value={profOffice}
                  readOnly={user?.role !== 'admin'}
                  onChange={(e) => setProfOffice(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold" htmlFor="profile-current-password">{t('বর্তমান পাসওয়ার্ড (পরিবর্তনের জন্য)', 'Current Password (to change password)')}</label>
                <input id="profile-current-password" type="password" autoComplete="current-password" className="field" value={profCurrentPass} onChange={(e) => setProfCurrentPass(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('নতুন পাসওয়ার্ড (ঐচ্ছিক):', 'New Password (Optional):')}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={profNewPass}
                  onChange={(e) => setProfNewPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-mono"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs cursor-pointer shadow-xs transition"
              >
                {t('প্রোফাইল সংরক্ষণ করুন', 'Save Profile')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
