import React from 'react';
import { toBanglaDigits } from '@/theme/tokens';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type Lang = 'bn' | 'en';

/** Bangla/English digits for any value. */
export const num = (v: any, lang: Lang) => toBanglaDigits(v ?? '', lang);

/** Taka amount with thousands separators. */
export const taka = (v: any, lang: Lang) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `৳${toBanglaDigits(n.toLocaleString('en-IN'), lang)}`;
};

/** ISO date → YYYY-MM-DD in the chosen digits. */
export const day = (v: any, lang: Lang) => (v ? toBanglaDigits(String(v).slice(0, 10), lang) : '—');

export const pick = (lang: Lang, bn?: string | null, en?: string | null) =>
  (lang === 'bn' ? bn || en : en || bn) || '—';

/** Bank and branch of the signed-in user's office ("Sonali Bank PLC, Savar Branch"). */
export const officeBank = (user: any) => {
  const split = (s?: string) => String(s || '').split(/[,—–]/).map((x) => x.trim());
  const bn = split(user?.office_bn);
  const en = split(user?.office_en);
  return { bn: bn[0] || '', en: en[0] || '', branch: bn[1] || en[1] || '' };
};

export const BANK_PRESETS = [
  { bn: 'বাংলাদেশ কৃষি ব্যাংক', en: 'Bangladesh Krishi Bank', branch: 'সাভার শাখা' },
  { bn: 'সোনালী ব্যাংক পিএলসি', en: 'Sonali Bank PLC', branch: 'মতিঝিল শাখা' },
  { bn: 'ব্র্যাক ব্যাংক পিএলসি', en: 'BRAC Bank PLC', branch: 'গুলশান শাখা' },
  { bn: 'ইসলামী ব্যাংক বাংলাদেশ', en: 'Islami Bank Bangladesh', branch: 'ধানমন্ডি শাখা' },
  { bn: 'ডাচ-বাংলা ব্যাংক পিএলসি', en: 'Dutch-Bangla Bank PLC', branch: 'উত্তরা শাখা' },
];

/** Small ghost icon button with a tooltip (row actions). */
export const IconAction: React.FC<{
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  tone?: string;
}> = ({ label, icon: Icon, onClick, tone = 'text-slate-500' }) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={label}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <Icon className={`size-4 ${tone}`} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);
