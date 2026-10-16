import React, { useEffect, useState } from 'react';
import {
  LogIn,
  UserPlus,
  UserCheck,
  KeyRound,
  LogOut,
  Shield,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { apiClient, extractErrorMessage } from '../api/client';
import { useI18n } from '../i18n';
import { ActiveTab } from '../components/NavbarAndLayout';

interface AuthPageProps {
  currentUser: any | null;
  onAuthSuccess: (user: any, token: string, redirectTab?: ActiveTab) => void;
  onLogout: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  currentUser,
  onAuthSuccess,
  onLogout,
}) => {
  const { lang, t, n } = useI18n();
  const [mode, setMode] = useState<'login' | 'register' | 'profile'>(
    currentUser ? 'profile' : 'login'
  );
  const [demoUsers, setDemoUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Login State
  const [loginUsername, setLoginUsername] = useState<string>('citizen');
  const [loginPassword, setLoginPassword] = useState<string>('demo123');

  // Registration State
  const [regUsername, setRegUsername] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regNameBn, setRegNameBn] = useState<string>('');
  const [regNameEn, setRegNameEn] = useState<string>('');
  const [regRole, setRegRole] = useState<string>('citizen');
  const [regOfficeBn, setRegOfficeBn] = useState<string>('নাগরিক পোর্টাল — সাভার, ঢাকা');
  const [regPhone, setRegPhone] = useState<string>('01700-001050');
  const [regNid, setRegNid] = useState<string>('9900001050');

  // Profile Edit State
  const [profNameBn, setProfNameBn] = useState<string>(currentUser?.full_name_bn || '');
  const [profNameEn, setProfNameEn] = useState<string>(currentUser?.full_name_en || '');
  const [profEmail, setProfEmail] = useState<string>(currentUser?.email || '');
  const [profPhone, setProfPhone] = useState<string>(currentUser?.phone_dummy || '');
  const [profOfficeBn, setProfOfficeBn] = useState<string>(currentUser?.office_bn || '');
  const [currPass, setCurrPass] = useState<string>('');
  const [newPass, setNewPass] = useState<string>('');

  useEffect(() => {
    apiClient
      .get('/auth/demo-users')
      .then((res) => setDemoUsers(res.data.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (currentUser) {
      setProfNameBn(currentUser.full_name_bn || '');
      setProfNameEn(currentUser.full_name_en || '');
      setProfEmail(currentUser.email || '');
      setProfPhone(currentUser.phone_dummy || '');
      setProfOfficeBn(currentUser.office_bn || '');
    }
  }, [currentUser]);

  const roleToTab = (role: string): ActiveTab => {
    if (role === 'sub_registrar') return 'registrar';
    if (role === 'ac_land') return 'acland';
    if (role === 'bank_officer') return 'bank';
    if (role === 'admin') return 'admin';
    return 'home';
  };

  const handleLogin = async (usernameArg?: string, passwordArg?: string) => {
    const u = usernameArg ?? loginUsername;
    const p = passwordArg ?? loginPassword;
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await apiClient.post('/auth/login', {
        username: u,
        password: p,
      });
      localStorage.setItem('bhumishield_token', res.data.access_token);
      localStorage.setItem('bhumishield_user', JSON.stringify(res.data.user));
      onAuthSuccess(res.data.user, res.data.access_token, roleToTab(res.data.user.role));
    } catch (err) {
      setError(extractErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await apiClient.post('/auth/register', {
        username: regUsername,
        email: regEmail || `${regUsername}@demo.bhumishield.gov.bd`,
        password: regPassword,
        full_name_bn: regNameBn,
        full_name_en: regNameEn || regNameBn,
        role: regRole,
        office_bn: regOfficeBn,
        office_en: regOfficeBn,
        phone_dummy: regPhone,
        nid: regNid,
      });
      localStorage.setItem('bhumishield_token', res.data.access_token);
      localStorage.setItem('bhumishield_user', JSON.stringify(res.data.user));
      onAuthSuccess(res.data.user, res.data.access_token, roleToTab(res.data.user.role));
    } catch (err) {
      setError(extractErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await apiClient.put('/auth/profile', {
        full_name_bn: profNameBn,
        full_name_en: profNameEn,
        email: profEmail,
        phone_dummy: profPhone,
        office_bn: profOfficeBn,
      });
      localStorage.setItem('bhumishield_user', JSON.stringify(res.data.user));
      onAuthSuccess(res.data.user, localStorage.getItem('bhumishield_token') || '');
      setFeedback(t(res.data.message_bn, res.data.message_en));
    } catch (err) {
      setError(extractErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await apiClient.post('/auth/change-password', {
        current_password: currPass,
        new_password: newPass,
      });
      setCurrPass('');
      setNewPass('');
      setFeedback(t(res.data.message_bn, res.data.message_en));
    } catch (err) {
      setError(extractErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Mode Tabs */}
      <div className="daisy-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              setFeedback(null);
            }}
            className={`daisy-btn text-sm ${
              mode === 'login' ? 'daisy-btn-primary' : 'bg-gray-100 text-[#1A1A1A]'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>{t('লগইন (Sign In)', 'Sign In')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
              setFeedback(null);
            }}
            className={`daisy-btn text-sm ${
              mode === 'register' ? 'daisy-btn-primary' : 'bg-gray-100 text-[#1A1A1A]'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('নতুন অ্যাকাউন্ট নিবন্ধন (Register)', 'Register Account')}</span>
          </button>

          {currentUser && (
            <button
              type="button"
              onClick={() => {
                setMode('profile');
                setError(null);
                setFeedback(null);
              }}
              className={`daisy-btn text-sm ${
                mode === 'profile' ? 'daisy-btn-primary' : 'bg-gray-100 text-[#1A1A1A]'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>{t('আমার প্রোফাইল ও পাসওয়ার্ড', 'My Profile & Security')}</span>
            </button>
          )}
        </div>

        {currentUser && (
          <button
            type="button"
            onClick={onLogout}
            className="daisy-btn daisy-btn-error text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('লগআউট করুন', 'Sign Out')}</span>
          </button>
        )}
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-[#E6F2EE] border-2 border-[#006A4E] text-[#006A4E] font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <span>{feedback}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-[#FEECEE] border-2 border-[#F42A41] text-[#C81E32] font-bold">
          ✖ {error}
        </div>
      )}

      {/* MODE 1: LOGIN + 1-CLICK DEMO ACCOUNTS */}
      {mode === 'login' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-5 daisy-card p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3">
              <img src="/assets/bhumishield-emblem.svg" alt="Emblem" className="w-11 h-11" />
              <div>
                <h1 className="text-2xl font-bold text-[#1A1A1A]">
                  {t('পোর্টালে লগইন করুন', 'Sign In to BhumiShield')}
                </h1>
                <p className="text-xs text-[#5F6B66]">
                  {t('JWT সিকিউর অথেনটিকেশন ও রোল গার্ড', 'JWT Bearer Authentication & RBAC')}
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-bold text-[#1A1A1A] mb-1">
                  {t('ইউজারনেম অথবা ইমেইল', 'Username or Email')}
                </label>
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full min-h-[50px] px-4 py-2.5 rounded-xl border-2 border-gray-300 bg-[#FAFBFA] font-semibold"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#1A1A1A] mb-1">
                  {t('পাসওয়ার্ড', 'Password')}
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full min-h-[50px] px-4 py-2.5 rounded-xl border-2 border-gray-300 bg-[#FAFBFA] font-semibold"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full daisy-btn daisy-btn-primary text-base"
              >
                <LogIn className="w-5 h-5" />
                <span>{loading ? t('লগইন হচ্ছে...', 'Signing in...') : t('লগইন করুন', 'Sign In')}</span>
              </button>
            </form>
          </section>

          {/* 1-Click Hackathon Demo Accounts */}
          <section className="lg:col-span-7 daisy-card p-6 sm:p-7 space-y-4">
            <div>
              <span className="daisy-badge daisy-badge-success">
                {t('বিচারক ও পরীক্ষকদের জন্য ১-ক্লিক লগইন', '1-Click Judge Demo Credentials')}
              </span>
              <h2 className="text-xl font-bold text-[#1A1A1A] mt-1">
                {t(
                  'যেকোনো ভূমিকায় এক ক্লিকে সরাসরি লগইন করুন (পাসওয়ার্ড: demo123)',
                  'Click Any Role Account Below to Sign In Immediately (Password: demo123)'
                )}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {demoUsers.map((u) => (
                <div
                  key={u.username}
                  className="p-4 rounded-2xl bg-[#FAFBFA] border border-gray-200 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-[#006A4E]">{u.username}</span>
                      <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#E6F2EE] text-[#006A4E]">
                        {u.role}
                      </span>
                    </div>
                    <div className="font-bold text-[#1A1A1A] mt-1">
                      {t(u.full_name_bn, u.full_name_en)}
                    </div>
                    <div className="text-xs text-[#5F6B66]">{t(u.office_bn, u.office_en)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginUsername(u.username);
                      setLoginPassword('demo123');
                      handleLogin(u.username, 'demo123');
                    }}
                    className="w-full min-h-[42px] px-3 py-1.5 rounded-xl bg-[#006A4E] text-white font-bold text-xs hover:bg-[#00543D] cursor-pointer"
                  >
                    {t(`${u.username} হিসেবে লগইন করুন →`, `Sign in as ${u.username} ->`)}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* MODE 2: NEW USER REGISTRATION */}
      {mode === 'register' && (
        <section className="daisy-card p-6 sm:p-8 space-y-6">
          <div>
            <span className="daisy-badge daisy-badge-success">
              {t('নাগরিক ও কর্মকর্তা নিবন্ধন', 'Citizen & Officer Registration')}
            </span>
            <h1 className="text-2xl font-bold text-[#1A1A1A] mt-1">
              {t(
                'নতুন ব্যবহারকারী অ্যাকাউন্ট তৈরি করুন (মক এনআইডি সংযুক্ত)',
                'Create a New Account (Linked with Mock NID Registry)'
              )}
            </h1>
          </div>

          <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-1">
                {t('ইউজারনেম (Username) *', 'Username *')}
              </label>
              <input
                type="text"
                required
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="e.g. karim_savar"
                className="w-full min-h-[50px] px-4 py-2 rounded-xl border-2 border-gray-300 bg-[#FAFBFA] font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-1">
                {t('ইমেইল (Email)', 'Email Address')}
              </label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="karim@demo.bhumishield.gov.bd"
                className="w-full min-h-[50px] px-4 py-2 rounded-xl border-2 border-gray-300 bg-[#FAFBFA] font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-1">
                {t('পূর্ণ নাম (বাংলায়) *', 'Full Name (Bangla) *')}
              </label>
              <input
                type="text"
                required
                value={regNameBn}
                onChange={(e) => setRegNameBn(e.target.value)}
                placeholder="যেমন: মো. করিম উদ্দিন"
                className="w-full min-h-[50px] px-4 py-2 rounded-xl border-2 border-gray-300 bg-[#FAFBFA] font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-1">
                {t('পূর্ণ নাম (ইংরেজিতে) *', 'Full Name (English) *')}
              </label>
              <input
                type="text"
                required
                value={regNameEn}
                onChange={(e) => setRegNameEn(e.target.value)}
                placeholder="e.g. Md. Karim Uddin"
                className="w-full min-h-[50px] px-4 py-2 rounded-xl border-2 border-gray-300 bg-[#FAFBFA] font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-1">
                {t('ডেমো এনআইডি নম্বর (১০ সংখ্যা) *', 'Mock NID Number (10 digits) *')}
              </label>
              <input
                type="text"
                required
                value={regNid}
                onChange={(e) => setRegNid(e.target.value)}
                placeholder="9900001050"
                className="w-full min-h-[50px] px-4 py-2 rounded-xl border-2 border-gray-300 bg-[#FAFBFA] font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-1">
                {t('মোবাইল নম্বর (ডেমো) *', 'Phone Number (Dummy) *')}
              </label>
              <input
                type="text"
                required
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="01700-001050"
                className="w-full min-h-[50px] px-4 py-2 rounded-xl border-2 border-gray-300 bg-[#FAFBFA] font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-1">
                {t('ব্যবহারকারীর ভূমিকা (Role) *', 'Account Role *')}
              </label>
              <select
                value={regRole}
                onChange={(e) => setRegRole(e.target.value)}
                className="w-full min-h-[50px] px-4 py-2 rounded-xl border-2 border-gray-300 bg-[#FAFBFA] font-semibold"
              >
                <option value="citizen">{t('👤 নাগরিক (Citizen)', '👤 Citizen')}</option>
                <option value="sub_registrar">{t('🖋️ সাব-রেজিস্ট্রার (Sub-Registrar)', '🖋️ Sub-Registrar')}</option>
                <option value="ac_land">{t('🏛️ এসি ল্যান্ড (AC Land)', '🏛️ AC Land Officer')}</option>
                <option value="bank_officer">{t('🏦 ব্যাংক কর্মকর্তা (Bank Officer)', '🏦 Bank Officer')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-1">
                {t('কার্যালয় / ঠিকানা *', 'Office / Address *')}
              </label>
              <input
                type="text"
                required
                value={regOfficeBn}
                onChange={(e) => setRegOfficeBn(e.target.value)}
                className="w-full min-h-[50px] px-4 py-2 rounded-xl border-2 border-gray-300 bg-[#FAFBFA] font-semibold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-[#1A1A1A] mb-1">
                {t('পাসওয়ার্ড (কমপক্ষে ৪ অক্ষর) *', 'Password (min 4 chars) *')}
              </label>
              <input
                type="password"
                required
                minLength={4}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[50px] px-4 py-2 rounded-xl border-2 border-gray-300 bg-[#FAFBFA] font-semibold"
              />
            </div>

            <div className="md:col-span-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="daisy-btn daisy-btn-primary w-full sm:w-auto px-8 text-base"
              >
                <UserPlus className="w-5 h-5" />
                <span>
                  {loading
                    ? t('অ্যাকাউন্ট তৈরি হচ্ছে...', 'Creating Account...')
                    : t('নিবন্ধন সম্পন্ন করুন ও লগইন করুন', 'Register & Sign In')}
                </span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* MODE 3: LOGGED-IN USER PROFILE & PASSWORD CHANGE */}
      {mode === 'profile' && currentUser && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-7 daisy-card p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div>
                <span className="daisy-badge daisy-badge-success">{currentUser.role}</span>
                <h2 className="text-2xl font-bold text-[#1A1A1A] mt-1">
                  {t(currentUser.full_name_bn, currentUser.full_name_en)}
                </h2>
                <p className="text-xs text-[#5F6B66]">
                  {t('ইউজারনেম:', 'Username:')} <strong>{currentUser.username}</strong> •{' '}
                  {t('এনআইডি:', 'NID:')} <strong>{n(currentUser.nid)}</strong>
                </p>
              </div>
              <Shield className="w-10 h-10 text-[#006A4E]" />
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#1A1A1A] mb-1">
                    {t('নাম (বাংলা)', 'Full Name (Bangla)')}
                  </label>
                  <input
                    type="text"
                    value={profNameBn}
                    onChange={(e) => setProfNameBn(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-gray-300 bg-[#FAFBFA] font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#1A1A1A] mb-1">
                    {t('নাম (ইংরেজি)', 'Full Name (English)')}
                  </label>
                  <input
                    type="text"
                    value={profNameEn}
                    onChange={(e) => setProfNameEn(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-gray-300 bg-[#FAFBFA] font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#1A1A1A] mb-1">
                    {t('ইমেইল', 'Email')}
                  </label>
                  <input
                    type="email"
                    value={profEmail}
                    onChange={(e) => setProfEmail(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-gray-300 bg-[#FAFBFA] font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#1A1A1A] mb-1">
                    {t('ফোন নম্বর (ডেমো)', 'Phone (Dummy)')}
                  </label>
                  <input
                    type="text"
                    value={profPhone}
                    onChange={(e) => setProfPhone(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-gray-300 bg-[#FAFBFA] font-semibold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-[#1A1A1A] mb-1">
                    {t('কার্যালয় / ঠিকানা', 'Office / Location')}
                  </label>
                  <input
                    type="text"
                    value={profOfficeBn}
                    onChange={(e) => setProfOfficeBn(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-gray-300 bg-[#FAFBFA] font-semibold"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="daisy-btn daisy-btn-primary text-sm">
                <Save className="w-4 h-4" />
                <span>{t('প্রোফাইল সংরক্ষণ করুন', 'Save Profile Changes')}</span>
              </button>
            </form>
          </section>

          <section className="lg:col-span-5 daisy-card p-6 sm:p-7 space-y-4">
            <h3 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#006A4E]" />
              <span>{t('পাসওয়ার্ড পরিবর্তন করুন', 'Change Password')}</span>
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#1A1A1A] mb-1">
                  {t('বর্তমান পাসওয়ার্ড', 'Current Password')}
                </label>
                <input
                  type="password"
                  required
                  value={currPass}
                  onChange={(e) => setCurrPass(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-gray-300 bg-[#FAFBFA]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#1A1A1A] mb-1">
                  {t('নতুন পাসওয়ার্ড', 'New Password')}
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-gray-300 bg-[#FAFBFA]"
                />
              </div>
              <button type="submit" disabled={loading} className="daisy-btn daisy-btn-outline w-full text-sm">
                <KeyRound className="w-4 h-4" />
                <span>{t('পাসওয়ার্ড আপডেট করুন', 'Update Password')}</span>
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};
