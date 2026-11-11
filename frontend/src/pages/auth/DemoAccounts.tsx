import React, { useState } from 'react';
import { ChevronDown, KeyRound } from 'lucide-react';
import { useAppUI } from '../../i18n';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DEMO_CREDENTIALS, type DemoCredentialItem } from './demoData';

/** Short button labels for each demo username (full names stay in the tooltip). */
const SHORT: Record<string, [string, string]> = {
  citizen: ['নাগরিক', 'Citizen'],
  rabeya: ['ওয়ারিশ', 'Heir'],
  spo_birulia: ['ইউডিসি', 'UDC'],
  registrar: ['সাভার', 'Savar'],
  registrar_gazipur: ['গাজীপুর', 'Gazipur'],
  rdo_savar: ['ডাটা অফিসার', 'Data officer'],
  acland: ['এসি ল্যান্ড', 'AC Land'],
  loa_savar: ['সহকারী', 'Assistant'],
  fvo_savar: ['সরেজমিন', 'Field officer'],
  sro_dhaka: ['রেকর্ড অফিসার', 'Records officer'],
  aso_dhaka: ['চেকার', 'Checker'],
  uno_savar: ['ইউএনও', 'UNO'],
  appellate_reviewer: ['আপিল (এডিসি)', 'Appeal (ADC)'],
  bank: ['ব্যাংক অফিসার', 'Bank officer'],
  bank_manager: ['ম্যানেজার', 'Manager'],
  admin: ['অ্যাডমিন', 'Admin'],
  lead_auditor: ['অডিটর', 'Auditor'],
  support_agent: ['সাপোর্ট', 'Support'],
  platform_moderator: ['মডারেটর', 'Moderator'],
  content_editor: ['এডিটর', 'Editor'],
  content_approver: ['অ্যাপ্রুভার', 'Approver'],
  dc_la: ['অধিগ্রহণ', 'Acquisition'],
  lawyer: ['আইনজীবী', 'Lawyer'],
};

const GROUPS: { bn: string; en: string; users: string[] }[] = [
  { bn: 'নাগরিক', en: 'Citizen', users: ['citizen', 'rabeya', 'spo_birulia'] },
  { bn: 'সাব-রেজিস্ট্রার', en: 'Sub-Registrar', users: ['registrar', 'registrar_gazipur', 'rdo_savar'] },
  { bn: 'এসি ল্যান্ড', en: 'AC Land', users: ['acland', 'loa_savar', 'fvo_savar', 'uno_savar', 'appellate_reviewer'] },
  { bn: 'জরিপ', en: 'Survey', users: ['sro_dhaka', 'aso_dhaka'] },
  { bn: 'ব্যাংক', en: 'Bank', users: ['bank', 'bank_manager'] },
  { bn: 'আইন ও অধিগ্রহণ', en: 'Legal & acquisition', users: ['lawyer', 'dc_la'] },
  {
    bn: 'অ্যাডমিন',
    en: 'Admin',
    users: ['admin', 'lead_auditor', 'support_agent', 'platform_moderator', 'content_editor', 'content_approver'],
  },
];

const byUser = new Map(DEMO_CREDENTIALS.map((c) => [c.username, c]));

/** Small collapsible list of demo roles. Clicking a role only fills the form (no auto sign-in). */
export const DemoAccounts: React.FC<{ onPick: (cred: DemoCredentialItem) => void; selected?: string }> = ({
  onPick,
  selected,
}) => {
  const { t, lang } = useAppUI();
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60">
      <CollapsibleTrigger className="flex h-10 w-full items-center gap-2 px-3 text-sm font-medium text-slate-700 hover:text-[#006A4E]">
        <KeyRound className="size-4 text-[#006A4E]" />
        <span>{t('ডেমো অ্যাকাউন্ট', 'Demo accounts')}</span>
        <span className="text-xs text-slate-400">({t('পাসওয়ার্ড', 'password')} demo123)</span>
        <ChevronDown className={cn('ml-auto size-4 text-slate-400 transition-transform', open && 'rotate-180')} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="max-h-56 space-y-2 overflow-y-auto px-3 pb-3">
          {GROUPS.map((g) => (
            <div key={g.en} className="flex flex-wrap items-center gap-1.5">
              <span className="w-full text-xs text-slate-500 sm:w-28 sm:shrink-0">{t(g.bn, g.en)}</span>
              {g.users.map((u) => {
                const c = byUser.get(u);
                if (!c) return null;
                const [bn, en] = SHORT[u] || [c.roleNameBn, c.roleNameEn];
                return (
                  <button
                    key={u}
                    type="button"
                    title={`${lang === 'bn' ? c.roleNameBn : c.roleNameEn} · @${u}`}
                    onClick={() => onPick(c)}
                    className={cn(
                      'h-7 rounded-lg border px-2.5 text-xs transition-colors',
                      selected === u
                        ? 'border-[#006A4E] bg-[#006A4E] text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-[#006A4E] hover:text-[#006A4E]'
                    )}
                  >
                    {t(bn, en)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
