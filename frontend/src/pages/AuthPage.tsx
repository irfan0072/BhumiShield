import React, { useRef, useState } from 'react';
import { CheckCircle2, LogIn } from 'lucide-react';
import { useAppUI, UserRole } from '../i18n';
import { BhumiApi } from '../api/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { landImg } from '@/components/public/PublicPage';
import { apiMessage } from '@/components/admin/kit';
import { AuthField, PasswordInput, authInputCls } from './auth/fields';
import { DemoAccounts } from './auth/DemoAccounts';
import { RegisterForm } from './auth/RegisterForm';
import { ProfileCard } from './auth/ProfileCard';
import type { DemoCredentialItem } from './auth/demoData';

export { DEMO_CREDENTIALS, FAST_EVALUATOR_ROLES } from './auth/demoData';
export type { DemoCredentialItem, FastEvaluatorRole } from './auth/demoData';

const ROLE_ROUTE: Record<string, string> = {
  citizen: 'home',
  service_point_operator: 'home',
  sub_registrar: 'registrar',
  registry_data_officer: 'registrar',
  ac_land: 'acland',
  land_office_assistant: 'acland',
  field_verification_officer: 'acland',
  settlement_records_officer: 'acland',
  settlement_checker: 'acland',
  uno_supervisor: 'acland',
  appellate_reviewer: 'acland',
  bank_officer: 'bank',
  bank_manager: 'bank',
  admin: 'admin',
  system_admin: 'admin',
  auditor: 'admin',
  support_agent: 'admin',
  platform_moderator: 'admin',
  content_editor: 'admin',
  content_approver: 'admin',
  dc_acquisition_officer: 'specialist',
  lawyer_court_user: 'specialist',
};

/** Only the username is remembered on this device (never the password). */
const REMEMBER_KEY = 'bs_remember_username';
const readRemembered = () => {
  try {
    return localStorage.getItem(REMEMBER_KEY) || '';
  } catch {
    return '';
  }
};

const POINTS: [string, string][] = [
  ['এক অ্যাকাউন্টে সব ভূমি সেবা', 'All land services in one account'],
  ['আবেদন ও দলিল এক জায়গায়', 'Applications and deeds in one place'],
  ['তথ্য সুরক্ষিত থাকে', 'Your data stays protected'],
];

export const AuthPage: React.FC<{
  mode?: 'login' | 'profile';
  onSuccessNavigate: (tab: string) => void;
}> = ({ mode = 'login', onSuccessNavigate }) => {
  const { lang, user, setUser, setToken, t } = useAppUI();

  if (mode === 'profile' && user) return <ProfileCard user={user} />;

  return <LoginScreen lang={lang} t={t} setUser={setUser} setToken={setToken} onSuccessNavigate={onSuccessNavigate} />;
};

const LoginScreen: React.FC<{
  lang: 'bn' | 'en';
  t: (bn: string, en: string) => string;
  setUser: ReturnType<typeof useAppUI>['setUser'];
  setToken: ReturnType<typeof useAppUI>['setToken'];
  onSuccessNavigate: (tab: string) => void;
}> = ({ lang, t, setUser, setToken, onSuccessNavigate }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState(readRemembered);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => !!readRemembered());
  const [picked, setPicked] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const busyRef = useRef(false);

  const handleLogin = async () => {
    if (busyRef.current) return;
    const u = username.trim();
    if (!u || !password) {
      setError(t('ইউজারনেম ও পাসওয়ার্ড দিন', 'Enter username and password'));
      return;
    }
    busyRef.current = true;
    setLoading(true);
    setError('');
    try {
      const res = await BhumiApi.login(u, password);
      if (res?.access_token && res?.user) {
        try {
          if (remember) localStorage.setItem(REMEMBER_KEY, u);
          else localStorage.removeItem(REMEMBER_KEY);
        } catch {
          /* storage blocked: ignore */
        }
        setToken(res.access_token);
        setUser(res.user);
        setPassword('');
        setTimeout(() => {
          onSuccessNavigate(ROLE_ROUTE[res.user.role as UserRole] || 'home');
        }, 200);
      } else {
        throw new Error('Invalid authentication response');
      }
    } catch (err: any) {
      setError(
        apiMessage(
          err?.response?.data?.detail ?? (err?.response ? err : null),
          lang,
          t('লগইন হয়নি। তথ্য দেখে আবার চেষ্টা করুন।', 'Sign in failed. Check your details.')
        )
      );
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  const pickDemo = (c: DemoCredentialItem) => {
    setTab('login');
    setUsername(c.username);
    setPassword(c.password);
    setPicked(c.username);
    setError('');
  };

  return (
    <div className="lg:grid lg:min-h-[calc(100dvh-7rem)] lg:grid-cols-2">
      {/* Image panel (desktop) */}
      <aside className="relative isolate hidden overflow-hidden lg:block">
        <img
          src={landImg('landtech-hackathon-hero')}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[65%_center]"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#003a2a]/95 via-[#003a2a]/75 to-[#003a2a]/45" />
        <div className="flex h-full flex-col justify-end p-10 text-white xl:p-14">
          <h1 className="max-w-md text-3xl font-bold leading-tight">
            {t('ডিজিটাল ভূমি সেবায় স্বাগতম', 'Welcome to digital land services')}
          </h1>
          <ul className="mt-5 space-y-2 text-sm text-emerald-50/90">
            {POINTS.map(([bn, en]) => (
              <li key={en} className="flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-300" />
                {t(bn, en)}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Slim image strip (phone / tablet) */}
      <div className="relative isolate overflow-hidden lg:hidden">
        <img
          src={landImg('landtech-hackathon-hero', true)}
          alt=""
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[65%_center]"
        />
        <div className="absolute inset-0 -z-10 bg-[#003a2a]/80" />
        <h1 className="mx-auto max-w-md px-4 py-4 text-lg font-bold text-white">
          {t('ডিজিটাল ভূমি সেবায় স্বাগতম', 'Welcome to digital land services')}
        </h1>
      </div>

      {/* Form */}
      <div className="flex items-start justify-center bg-slate-50/70 px-4 py-4 sm:py-8 lg:items-center">
        <div className="w-full max-w-md space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-6">
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'login' | 'register')}>
              <TabsList className="mb-4 grid h-11 w-full grid-cols-2 rounded-xl bg-slate-100 p-1">
                <TabsTrigger value="login" className="h-9 rounded-lg text-sm">
                  {t('লগইন', 'Sign in')}
                </TabsTrigger>
                <TabsTrigger value="register" className="h-9 rounded-lg text-sm">
                  {t('নিবন্ধন', 'Register')}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {tab === 'login' ? (
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLogin();
                }}
                className="space-y-3"
              >
                <AuthField label={t('ইউজারনেম / মোবাইল', 'Username / mobile')}>
                  {(id) => (
                    <input
                      id={id}
                      name="username"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setPicked(undefined);
                      }}
                      placeholder={t('ইউজারনেম, মোবাইল বা ইমেইল', 'Username, mobile or email')}
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      maxLength={120}
                      aria-invalid={!!error || undefined}
                      className={authInputCls}
                    />
                  )}
                </AuthField>
                <AuthField label={t('পাসওয়ার্ড', 'Password')} error={error}>
                  {(id, d) => (
                    <PasswordInput
                      id={id}
                      name="password"
                      aria-describedby={d}
                      invalid={!!error}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="••••••••"
                    />
                  )}
                </AuthField>
                <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <Checkbox
                    checked={remember}
                    onCheckedChange={(v) => setRemember(v === true)}
                    className="size-4 rounded border-slate-300 data-[state=checked]:border-[#006A4E] data-[state=checked]:bg-[#006A4E]"
                  />
                  {t('মনে রাখুন', 'Remember me')}
                </label>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-xl bg-[#006A4E] text-sm font-semibold text-white hover:bg-[#00553e]"
                >
                  <LogIn className="size-4" />
                  {loading ? t('যাচাই হচ্ছে…', 'Checking…') : t('লগইন করুন', 'Sign in')}
                </Button>
                <p className="text-center text-sm text-slate-500">
                  {t('অ্যাকাউন্ট নেই?', 'No account?')}{' '}
                  <button type="button" onClick={() => setTab('register')} className="font-medium text-[#006A4E] hover:underline">
                    {t('নিবন্ধন করুন', 'Register')}
                  </button>
                </p>
              </form>
            ) : (
              <RegisterForm
                onSuccessNavigate={onSuccessNavigate}
                onGoLogin={(u) => {
                  if (u) setUsername(u);
                  setPassword('');
                  setTab('login');
                }}
              />
            )}
          </div>

          <DemoAccounts onPick={pickDemo} selected={picked} />
        </div>
      </div>
    </div>
  );
};
