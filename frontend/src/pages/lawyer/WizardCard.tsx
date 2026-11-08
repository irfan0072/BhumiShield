import React from 'react';
import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAppUI } from '@/i18n';
import { toBanglaDigits } from '@/theme/tokens';
import type { WizardStep } from './constants';

/** Small horizontal stepper: 1 সনদ যাচাই · 2 মামলার তথ্য · 3 আবেদন */
export const WizardStepper: React.FC<{
  step: WizardStep;
  done: Record<WizardStep, boolean>;
  canOpen: (s: WizardStep) => boolean;
  onSelect: (s: WizardStep) => void;
}> = ({ step, done, canOpen, onSelect }) => {
  const { t, lang } = useAppUI();
  const items: Array<{ s: WizardStep; label: string }> = [
    { s: 1, label: t('সনদ যাচাই', 'Licence') },
    { s: 2, label: t('মামলার তথ্য', 'Case details') },
    { s: 3, label: t('আবেদন', 'Petition') },
  ];
  return (
    <ol className="flex items-center gap-2">
      {items.map((it, i) => {
        const active = it.s === step;
        const isDone = done[it.s] && !active;
        const open = active || canOpen(it.s);
        return (
          <React.Fragment key={it.s}>
            {i > 0 && <li aria-hidden className="h-px min-w-4 flex-1 bg-slate-200" />}
            <li>
              <button
                type="button"
                disabled={!open}
                onClick={() => onSelect(it.s)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm transition',
                  open ? 'cursor-pointer hover:bg-slate-50' : 'cursor-not-allowed opacity-60',
                  active ? 'font-medium text-slate-900' : 'text-slate-500'
                )}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                    active
                      ? 'bg-[#006A4E] text-white'
                      : isDone
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                  )}
                >
                  {isDone ? <Check className="size-3.5" /> : toBanglaDigits(it.s, lang)}
                </span>
                <span className="hidden whitespace-nowrap sm:inline">{it.label}</span>
              </button>
            </li>
          </React.Fragment>
        );
      })}
    </ol>
  );
};

/** One compact wizard card: stepper on top, body, Back/Next footer. */
export const WizardCard: React.FC<{
  stepper: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ stepper, children, footer }) => (
  <section className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="border-b border-slate-100 px-4 py-2.5">{stepper}</div>
    <div className="space-y-4 px-4 py-4">{children}</div>
    {footer && <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">{footer}</div>}
  </section>
);

/** Shown when a later step is opened before the earlier one is done. */
export const BlockedNotice: React.FC<{ text: string; actionLabel: string; onAction: () => void }> = ({
  text,
  actionLabel,
  onAction,
}) => (
  <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
    <span className="flex size-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
      <Lock className="size-5" />
    </span>
    <p className="text-sm text-slate-600">{text}</p>
    <Button type="button" size="sm" className="h-9" onClick={onAction}>
      {actionLabel}
    </Button>
  </div>
);

/** One short muted hint line. */
export const Hint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs text-slate-500">{children}</p>
);
