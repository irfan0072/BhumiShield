import React from 'react';
import { useAppUI } from '@/i18n';
import { toBanglaDigits } from '@/theme/tokens';
import { StatusBadge } from '@/components/admin/kit';
import type { CitizenOwnedPlot } from '@/components/citizen/MyLandMap';
import type { CitizenSectionId } from '@/components/citizen/CitizenShell';

export interface CitizenVaultState {
  person: any | null;
  owned_plots: CitizenOwnedPlot[];
  deeds: any[];
  is_verified: boolean;
  isOperatorNoVault?: boolean;
}

export interface CitizenSectionCommonProps {
  vault: CitizenVaultState;
  loading: boolean;
  disputes: any[];
  transfers: any[];
  tickets: any[];
  onRefreshAll: () => void;
  onSelectSection: (section: CitizenSectionId, opts?: { plotId?: number; create?: boolean }) => void;
  onNavigate: (target: string) => void;
  selectedPlotId: number | null;
  setSelectedPlotId: (plotId: number | null) => void;
  onOpenPassport: (plot: CitizenOwnedPlot) => void;
  onOpenVerifyIdentity: () => void;
}

export function useCitizenFmt() {
  const { lang, t, formatDate } = useAppUI();

  const fmtNum = (v: number | string | null | undefined) => {
    if (v === null || v === undefined || v === '') return '—';
    const s = typeof v === 'number' ? v.toLocaleString('en-IN') : String(v);
    return lang === 'bn' ? toBanglaDigits(s) : s;
  };

  const fmtRawNum = (v: number | string | null | undefined) => {
    if (v === null || v === undefined || v === '') return '—';
    return lang === 'bn' ? toBanglaDigits(String(v)) : String(v);
  };

  const fmtBdt = (v: number | string | null | undefined) => {
    if (v === null || v === undefined || v === '') return '—';
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    const s = Math.round(n).toLocaleString('en-IN');
    return `৳${lang === 'bn' ? toBanglaDigits(s) : s}`;
  };

  const fmtDate = (iso?: string | null) => {
    if (!iso) return '—';
    try {
      return formatDate(iso);
    } catch {
      return String(iso).slice(0, 10);
    }
  };

  const pick = (row: any, key: string) =>
    (lang === 'bn'
      ? row?.[`${key}_bn`] || row?.[`${key}_en`]
      : row?.[`${key}_en`] || row?.[`${key}_bn`]) || '';

  return { lang, t, fmtNum, fmtRawNum, fmtBdt, fmtDate, pick };
}

export const textareaCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-[#006A4E] focus:ring-2 focus:ring-[#006A4E]/15 disabled:bg-slate-50 disabled:text-slate-500';

export function plotStatusBadge(
  plot: CitizenOwnedPlot,
  t: (bn: string, en: string) => string,
  hasOpenDispute = false
): React.ReactNode {
  if (plot.is_admin_frozen) {
    return <StatusBadge tone="red">{t('আটকানো', 'Frozen')}</StatusBadge>;
  }
  if (hasOpenDispute) {
    return <StatusBadge tone="red">{t('বিরোধ', 'Disputed')}</StatusBadge>;
  }
  if (
    plot.has_active_lien ||
    (plot.mortgage_status &&
      ['ACTIVE', 'MORTGAGED', 'LIEN_ACTIVE'].includes(String(plot.mortgage_status).toUpperCase()))
  ) {
    return <StatusBadge tone="amber">{t('বন্ধক', 'Mortgaged')}</StatusBadge>;
  }
  if (plot.owner_sale_locked) {
    return <StatusBadge tone="red">{t('বিক্রয় লক', 'Sale Locked')}</StatusBadge>;
  }
  return <StatusBadge tone="green">{t('নিরাপদ', 'Safe')}</StatusBadge>;
}

export function deedTypeLabel(type: string | undefined, t: (bn: string, en: string) => string): string {
  const k = String(type || 'SALE').toUpperCase();
  if (k === 'SALE' || k === 'SAF_KABALA') return t('বিক্রয় দলিল', 'Sale Deed');
  if (k === 'HEIR' || k === 'INHERITANCE') return t('ওয়ারিশ বণ্টন', 'Inheritance');
  if (k === 'GIFT' || k === 'HIBA') return t('হেবা দলিল', 'Gift Deed');
  if (k === 'MORTGAGE') return t('বন্ধক চুক্তি', 'Mortgage Deed');
  if (k === 'EXCHANGE') return t('বিনিময় দলিল', 'Exchange Deed');
  return type || t('বিক্রয় দলিল', 'Sale Deed');
}

export const CITIZEN_TRANSFER_STEPS: { step: number; bn: string; en: string }[] = [
  { step: 1, bn: 'হস্তান্তর প্রস্তাব দাখিল', en: 'Transfer proposal filed' },
  { step: 2, bn: 'উভয় পক্ষের তথ্য নিশ্চিতকরণ', en: 'Parties info confirmed' },
  { step: 3, bn: 'ক্রেতার সম্মতি অনুমোদন', en: 'Buyer consent confirmed' },
  { step: 4, bn: 'স্বয়ংক্রিয় রেকর্ড প্রি-চেক', en: 'Automated record pre-check' },
  { step: 5, bn: 'অংশীদার অনাপত্তি যাচাই', en: 'Co-owner consent check' },
  { step: 6, bn: 'স্ট্যাম্প ও সরকারি ফি নির্ধারণ', en: 'Stamp & fee assessment' },
  { step: 7, bn: 'রেজিস্ট্রি অ্যাপয়েন্টমেন্ট বুকিং', en: 'Registry appointment booking' },
  { step: 8, bn: 'কাউন্টারে বায়োমেট্রিক যাচাই', en: 'Counter biometric check' },
  { step: 9, bn: 'সাব-রেজিস্ট্রারের ডিজিটাল সিল', en: 'Sub-Registrar digital seal' },
  { step: 10, bn: 'এসি ল্যান্ড দপ্তরে নামজারি প্রেরণ', en: 'Queued to AC Land office' },
  { step: 11, bn: 'তদন্ত প্রতিবেদন ও শুনানি', en: 'Field report & hearing' },
  { step: 12, bn: 'চূড়ান্ত নামজারি আদেশ', en: 'Final mutation order' },
  { step: 13, bn: 'খতিয়ান ও ডিসিআর প্রস্তুত', en: 'Khatian & DCR ready' },
];

export function transferStageBadge(
  tr: any,
  t: (bn: string, en: string) => string
): React.ReactNode {
  const status = String(tr?.status || '').toUpperCase();
  const stage = String(tr?.public_stage || '').toUpperCase();
  const step = Number(tr?.current_step || 1);

  if (status === 'COMPLETED' || stage === 'DONE' || step >= 13) {
    return <StatusBadge tone="green">{t('সম্পন্ন', 'Completed')}</StatusBadge>;
  }
  if (status === 'REJECTED' || status === 'CANCELLED') {
    return <StatusBadge tone="red">{t('বাতিল', 'Rejected')}</StatusBadge>;
  }
  if (stage === 'REVIEW' || step >= 10) {
    return <StatusBadge tone="blue">{t('নামজারি যাচাই', 'Mutation Review')}</StatusBadge>;
  }
  if (stage === 'REGISTER' || step >= 7) {
    return <StatusBadge tone="blue">{t('রেজিস্ট্রি ধাপ', 'Registry Stage')}</StatusBadge>;
  }
  if (stage === 'VERIFY' || step >= 4) {
    return <StatusBadge tone="amber">{t('প্রাথমিক যাচাই', 'Verification')}</StatusBadge>;
  }
  return <StatusBadge tone="amber">{t('শুরুর ধাপ', 'Initial Stage')}</StatusBadge>;
}
