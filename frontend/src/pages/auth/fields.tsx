import React, { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppUI } from '../../i18n';

/* ------------------------------------------------------------------ */
/* Input helpers                                                       */
/* ------------------------------------------------------------------ */

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
/** Bangla digits → ASCII, so people can type numbers on a Bangla keyboard. */
export const toAsciiDigits = (v: string) => v.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
/** Keep digits only (after converting Bangla digits). */
export const digitsOnly = (v: string, max: number) => toAsciiDigits(v).replace(/\D/g, '').slice(0, max);

/** Same rule as the backend: 01[3-9] + 8 digits. */
export const isPhone = (v: string) => /^01[3-9]\d{8}$/.test(v);
export const isNid = (v: string) => /^(?:\d{10}|\d{13}|\d{17})$/.test(v);
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/** 0 = too short, 1 = weak, 2 = medium, 3 = strong */
export const passwordScore = (p: string): 0 | 1 | 2 | 3 => {
  if (p.length < 8) return 0;
  let kinds = 0;
  if (/[a-z]/.test(p) || /[A-Z]/.test(p)) kinds++;
  if (/\d/.test(p)) kinds++;
  if (/[^A-Za-z0-9]/.test(p)) kinds++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) kinds++;
  if (kinds >= 3 && p.length >= 10) return 3;
  return kinds >= 2 ? 2 : 1;
};

export const authInputCls =
  'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#006A4E] focus:ring-2 focus:ring-[#006A4E]/15 disabled:bg-slate-50 disabled:text-slate-500 aria-[invalid=true]:border-red-400';

/* ------------------------------------------------------------------ */
/* Field wrapper with label + one-line error/hint                      */
/* ------------------------------------------------------------------ */

export const AuthField: React.FC<{
  label: string;
  error?: string;
  hint?: React.ReactNode;
  className?: string;
  children: (id: string, describedBy?: string) => React.ReactNode;
}> = ({ label, error, hint, className, children }) => {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children(id, error || hint ? msgId : undefined)}
      {error ? (
        <p id={msgId} className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <div id={msgId} className="text-xs text-slate-500">
          {hint}
        </div>
      ) : null}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Password input with show/hide                                       */
/* ------------------------------------------------------------------ */

export const PasswordInput: React.FC<
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & { invalid?: boolean }
> = ({ invalid, className, ...props }) => {
  const { t } = useAppUI();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={show ? 'text' : 'password'}
        maxLength={props.maxLength ?? 128}
        aria-invalid={invalid || undefined}
        spellCheck={false}
        autoCapitalize="none"
        className={cn(authInputCls, 'pr-11', className)}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? t('পাসওয়ার্ড লুকান', 'Hide password') : t('পাসওয়ার্ড দেখুন', 'Show password')}
        className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
};

/** Tiny 3-step strength bar shown under a new password. */
export const StrengthHint: React.FC<{ password: string }> = ({ password }) => {
  const { t } = useAppUI();
  const s = passwordScore(password);
  const label =
    s === 0
      ? t('কমপক্ষে ৮ অক্ষর', 'At least 8 characters')
      : s === 1
      ? t('দুর্বল', 'Weak')
      : s === 2
      ? t('মোটামুটি', 'Fair')
      : t('শক্তিশালী', 'Strong');
  const color = s <= 1 ? 'bg-red-500' : s === 2 ? 'bg-amber-500' : 'bg-[#006A4E]';
  return (
    <span className="flex items-center gap-2">
      <span className="flex gap-1" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn('h-1 w-6 rounded-full', password && s >= i ? color : 'bg-slate-200')} />
        ))}
      </span>
      <span>{label}</span>
    </span>
  );
};
