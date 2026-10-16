import React, { useState } from 'react';
import { useAppUI, UserRole } from '../i18n';
import { BhumiApi } from '../api/client';
import { LogIn, UserPlus, KeyRound, CheckCircle2, ShieldAlert, UserCheck } from 'lucide-react';

const ROLE_ROUTE: Record<UserRole, string> = {
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
  const [tab, setTab] = useState<'login' | 'register' | 'profile'>(user && mode === 'profile' ? 'profile' : 'login');

  const [username, setUsername] = useState('citizen_rahim');
  const [password, setPassword] = useState('demo123');

  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('demo123');
  const [regNameBn, setRegNameBn] = useState('');
  const [regNameEn, setRegNameEn] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('citizen');
  const [regNid, setRegNid] = useState('1992123456099');
  const [regPhone, setRegPhone] = useState('01700000999');
  const [regOffice, setRegOffice] = useState('নাগরিক পোর্টাল');

  const [profNameBn, setProfNameBn] = useState(user?.full_name_bn || '');
  const [profNameEn, setProfNameEn] = useState(user?.full_name_en || '');
  const [profPhone, setProfPhone] = useState(user?.phone_mock || '');
  const [profOffice, setProfOffice] = useState(user?.office_name || '');
  const [profNewPass, setProfNewPass] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (u = username, p = password) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await BhumiApi.login(u, p);
      setToken(res.access_token);
      setUser(res.user);
      setSuccessMsg(t('সফলভাবে লগইন হয়েছে!', 'Logged in!'));
      setTimeout(() => {
        onSuccessNavigate(ROLE_ROUTE[res.user.role as UserRole] || 'home');
      }, 300);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setErrorMsg(
        detail
          ? lang === 'bn'
            ? detail.message_bn
            : detail.message_en
          : t('লগইন ব্যর্থ হয়েছে। ইউজারনেম ও পাসওয়ার্ড যাচাই করুন।', 'Login failed. Check credentials.')
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
      const res = await BhumiApi.register({
        username: regUsername,
        password: regPassword,
        full_name_bn: regNameBn,
        full_name_en: regNameEn || regNameBn,
        role: regRole,
        nid_mock: regNid,
        phone_mock: regPhone,
        office_name: regOffice,
      });
      setToken(res.access_token);
      setUser(res.user);
      onSuccessNavigate(ROLE_ROUTE[res.user.role as UserRole] || 'home');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setErrorMsg(
        detail
          ? lang === 'bn'
            ? detail.message_bn
            : detail.message_en
          : t('নিবন্ধন ব্যর্থ হয়েছে।', 'Registration failed.')
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
        office_name: profOffice,
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

  const demoAccounts = [
    { u: 'citizen_rahim', roleBn: 'নাগরিক (আব্দুর রহিম)', roleEn: 'Citizen (Abdur Rahim)' },
    { u: 'registrar_savar', roleBn: 'সাব-রেজিস্ট্রার (সাভার)', roleEn: 'Sub-Registrar (Savar)' },
    { u: 'acland_savar', roleBn: 'এসি ল্যান্ড (সাভার)', roleEn: 'AC Land (Savar)' },
    { u: 'bank_sonali', roleBn: 'ব্যাংক কর্মকর্তা (সোনালী ব্যাংক)', roleEn: 'Bank Officer (Sonali Bank)' },
    { u: 'admin_auditor', roleBn: 'অ্যাডমিন ও অডিটর', roleEn: 'System Admin & Auditor' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-xs">
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4 mb-6">
          <button
            onClick={() => setTab('login')}
            className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer ${
              tab === 'login' ? 'bg-[#006A4E] text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>{t('লগইন (Login)', 'Login')}</span>
          </button>
          <button
            onClick={() => setTab('register')}
            className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer ${
              tab === 'register' ? 'bg-[#006A4E] text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('নতুন অ্যাকাউন্ট নিবন্ধন', 'Register Account')}</span>
          </button>
          {user && (
            <button
              onClick={() => setTab('profile')}
              className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer ${
                tab === 'profile' ? 'bg-[#006A4E] text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>{t('আমার প্রোফাইল', 'My Profile')}</span>
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="p-4 mb-4 rounded-xl bg-[#FEECEE] border-l-8 border-[#F42A41] text-[#1A1A1A] font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#F42A41]" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 mb-4 rounded-xl bg-[#E6F2EE] border-l-8 border-[#006A4E] text-[#006A4E] font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{successMsg}</span>
          </div>
        )}

        {tab === 'login' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="md:col-span-6 space-y-4"
            >
              <h2 className="text-2xl font-extrabold text-[#006A4E]">
                {t('অ্যাকাউন্টে প্রবেশ করুন', 'Sign In to BhumiShield')}
              </h2>
              <div>
                <label className="block font-bold mb-1">
                  {t('ইউজারনেম (Username):', 'Username:')}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-gray-300 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block font-bold mb-1">
                  {t('পাসওয়ার্ড (Password):', 'Password:')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-gray-300 font-mono"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-extrabold text-lg cursor-pointer"
              >
                {loading ? t('যাচাই হচ্ছে...', 'Signing in...') : t('লগইন করুন', 'Sign In')}
              </button>
            </form>

            {/* Quick Demo Login Cards */}
            <div className="md:col-span-6 bg-[#E6F2EE]/60 rounded-2xl p-5 border border-[#006A4E]/20 space-y-3">
              <div className="flex items-center gap-2 font-extrabold text-[#006A4E]">
                <KeyRound className="w-5 h-5" />
                <span>
                  {t(
                    'হ্যাকাথন বিচারকদের জন্য ১-ক্লিক রোল লগইন (পাসওয়ার্ড: demo123)',
                    '1-Click Role Login for Judges (Password: demo123)'
                  )}
                </span>
              </div>
              <div className="space-y-2">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.u}
                    type="button"
                    onClick={() => {
                      setUsername(acc.u);
                      setPassword('demo123');
                      handleLogin(acc.u, 'demo123');
                    }}
                    className="w-full p-3 rounded-xl bg-white hover:bg-[#006A4E] hover:text-white border border-gray-200 text-left flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div>
                      <div className="font-bold text-sm">
                        {lang === 'bn' ? acc.roleBn : acc.roleEn}
                      </div>
                      <div className="text-xs font-mono opacity-75">{acc.u}</div>
                    </div>
                    <span className="text-xs font-extrabold px-2.5 py-1 rounded bg-[#E6F2EE] text-[#006A4E] group-hover:bg-white">
                      {t('১-ক্লিক লগইন →', '1-Click Login →')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <h2 className="text-2xl font-extrabold text-[#006A4E]">
              {t('নতুন ব্যবহারকারী নিবন্ধন (Mock NID সহ)', 'Register New User (with Mock NID)')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1">{t('ইউজারনেম:', 'Username:')}</label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="citizen_new"
                  className="w-full p-3 rounded-xl border-2 border-gray-300"
                  required
                />
              </div>
              <div>
                <label className="block font-bold mb-1">{t('পাসওয়ার্ড:', 'Password:')}</label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-gray-300"
                  required
                />
              </div>
              <div>
                <label className="block font-bold mb-1">{t('পূর্ণ নাম (বাংলা):', 'Full Name (Bangla):')}</label>
                <input
                  type="text"
                  value={regNameBn}
                  onChange={(e) => setRegNameBn(e.target.value)}
                  placeholder="মোঃ সাইফুল ইসলাম"
                  className="w-full p-3 rounded-xl border-2 border-gray-300"
                  required
                />
              </div>
              <div>
                <label className="block font-bold mb-1">{t('পূর্ণ নাম (ইংরেজি):', 'Full Name (English):')}</label>
                <input
                  type="text"
                  value={regNameEn}
                  onChange={(e) => setRegNameEn(e.target.value)}
                  placeholder="Md. Saiful Islam"
                  className="w-full p-3 rounded-xl border-2 border-gray-300"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">{t('ভূমিকা (Role):', 'User Role:')}</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="w-full p-3 rounded-xl border-2 border-gray-300 bg-white font-semibold"
                >
                  <option value="citizen">{t('নাগরিক (Citizen)', 'Citizen')}</option>
                  <option value="sub_registrar">{t('সাব-রেজিস্ট্রার (Sub-Registrar)', 'Sub-Registrar')}</option>
                  <option value="ac_land">{t('এসি ল্যান্ড (AC Land)', 'AC Land')}</option>
                  <option value="bank_officer">{t('ব্যাংক কর্মকর্তা (Bank Officer)', 'Bank Officer')}</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">{t('মক এনআইডি নম্বর (Mock NID):', 'Mock NID Number:')}</label>
                <input
                  type="text"
                  value={regNid}
                  onChange={(e) => setRegNid(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-gray-300 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block font-bold mb-1">{t('মোবাইল নম্বর (ডেমো):', 'Phone (Mock):')}</label>
                <input
                  type="text"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-gray-300 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">{t('অফিস / ঠিকানা:', 'Office / Location:')}</label>
                <input
                  type="text"
                  value={regOffice}
                  onChange={(e) => setRegOffice(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-gray-300"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3.5 rounded-xl bg-[#006A4E] text-white font-extrabold text-lg cursor-pointer"
            >
              {t('নিবন্ধন সম্পন্ন করুন', 'Complete Registration')}
            </button>
          </form>
        )}

        {tab === 'profile' && user && (
          <form onSubmit={handleProfileSave} className="space-y-4">
            <h2 className="text-2xl font-extrabold text-[#006A4E]">
              {t('প্রোফাইল ও নিরাপত্তা সেটিংস', 'Profile & Security Settings')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1">{t('পূর্ণ নাম (বাংলা):', 'Full Name (Bangla):')}</label>
                <input
                  type="text"
                  value={profNameBn}
                  onChange={(e) => setProfNameBn(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-gray-300"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">{t('পূর্ণ নাম (ইংরেজি):', 'Full Name (English):')}</label>
                <input
                  type="text"
                  value={profNameEn}
                  onChange={(e) => setProfNameEn(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-gray-300"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">{t('মোবাইল নম্বর:', 'Phone:')}</label>
                <input
                  type="text"
                  value={profPhone}
                  onChange={(e) => setProfPhone(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-gray-300"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">{t('অফিস / কর্মস্থল:', 'Office Name:')}</label>
                <input
                  type="text"
                  value={profOffice}
                  onChange={(e) => setProfOffice(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-gray-300"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">
                  {t('নতুন পাসওয়ার্ড (ঐচ্ছিক):', 'New Password (Optional):')}
                </label>
                <input
                  type="password"
                  value={profNewPass}
                  onChange={(e) => setProfNewPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-3 rounded-xl border-2 border-gray-300"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-[#006A4E] text-white font-extrabold cursor-pointer"
            >
              {t('প্রোফাইল সংরক্ষণ করুন', 'Save Profile')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
