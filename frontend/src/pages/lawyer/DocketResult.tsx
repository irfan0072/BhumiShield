import React from 'react';
import { CheckCircle2, Copy, LayoutDashboard, Plus, Printer } from 'lucide-react';
import type { LawyerCaseDocketResponse } from '@/api/client';
import { Button } from '@/components/ui/button';
import { DetailList, notify } from '@/components/admin/kit';
import { useAppUI } from '@/i18n';
import { maskNid, maskPhone, toBanglaDigits } from '@/theme/tokens';
import { CASE_STAGES, DISPUTE_TYPES, fmtDate, optLabel } from './constants';

type Props = {
  docket: LawyerCaseDocketResponse;
  plaintiffNid?: string;
  onNewCase: () => void;
  onDashboard: () => void;
};

const boundaryText = (b: LawyerCaseDocketResponse['court_details']['boundaries'] | undefined, t: (bn: string, en: string) => string) => {
  if (!b) return '—';
  const parts = [
    b.north && `${t('উত্তর', 'N')}: ${b.north}`,
    b.south && `${t('দক্ষিণ', 'S')}: ${b.south}`,
    b.east && `${t('পূর্ব', 'E')}: ${b.east}`,
    b.west && `${t('পশ্চিম', 'W')}: ${b.west}`,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
};

/** Screen view after a successful filing: docket number, copy, print, new case. */
export const DocketResult: React.FC<Props> = ({ docket, plaintiffNid, onNewCase, onDashboard }) => {
  const { t, lang } = useAppUI();
  const c = docket.court_details;
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify.ok(t('কপি হয়েছে', 'Copied'));
    } catch {
      notify.err(null, lang, t('কপি করা যায়নি', 'Could not copy'));
    }
  };
  return (
    <section className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500">{t('মামলা দাখিল হয়েছে', 'Case filed')}</p>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-base font-semibold text-slate-900">{docket.case_no}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-slate-400 hover:text-slate-700"
              onClick={() => copy(docket.case_no)}
              aria-label={t('কপি', 'Copy')}
            >
              <Copy className="size-3.5" />
            </Button>
          </div>
        </div>
        <span className="text-xs text-slate-500">{fmtDate(docket.verification?.filed_at, lang, true)}</span>
      </div>
      <div className="space-y-3 px-4 py-4">
        <DetailList
          items={[
            [t('আইনজীবী', 'Lawyer'), `${lang === 'bn' ? docket.lawyer.name_bn : docket.lawyer.name_en || docket.lawyer.name_bn} · ${docket.lawyer.bar_council_no}`],
            [t('আদালত', 'Court'), c.court_name],
            [t('মামলা নং', 'Suit no'), c.suit_no],
            [t('ধরন', 'Type'), optLabel(DISPUTE_TYPES, c.dispute_type, lang)],
            [t('পর্যায়', 'Stage'), optLabel(CASE_STAGES, c.case_stage, lang)],
            [t('বাদী', 'Plaintiff'), plaintiffNid ? `${c.plaintiff_name} · ${maskNid(plaintiffNid, lang)}` : c.plaintiff_name],
            [t('বিবাদী', 'Defendant'), c.defendant_name],
            [
              t('দাগ', 'Plot'),
              `${docket.plot.dag_no_bn || docket.plot.dag_no} · ${docket.plot.mouza_bn}, ${docket.plot.upazila_bn}`,
            ],
            [t('নালিশি অংশ', 'Disputed area'), `${toBanglaDigits(c.disputed_area_decimal, lang)} ${t('শতক', 'dec')}`],
            [t('চৌহদ্দি', 'Boundaries'), boundaryText(c.boundaries, t)],
          ]}
        />
        <p className="text-xs text-slate-500">{t('দাগে মামলার সতর্কতা চালু হয়েছে', 'Litigation alert is now on this plot')}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
        <Button type="button" variant="outline" size="sm" className="h-9" onClick={onDashboard}>
          <LayoutDashboard className="size-4" />
          {t('ড্যাশবোর্ড', 'Dashboard')}
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="h-9" onClick={onNewCase}>
            <Plus className="size-4" />
            {t('নতুন মামলা', 'New case')}
          </Button>
          <Button type="button" size="sm" className="h-9" onClick={() => window.print()}>
            <Printer className="size-4" />
            {t('প্রিন্ট', 'Print')}
          </Button>
        </div>
      </div>
    </section>
  );
};

/** Print-only docket (hidden on screen, shown by window.print()). */
export const PrintableDocket: React.FC<{ docket: LawyerCaseDocketResponse; plaintiffNid?: string }> = ({ docket, plaintiffNid }) => {
  const { t, lang } = useAppUI();
  const c = docket.court_details;
  const row = (k: string, v: React.ReactNode) => (
    <tr>
      <td className="w-40 border border-slate-400 px-2 py-1 align-top font-medium">{k}</td>
      <td className="border border-slate-400 px-2 py-1">{v || '—'}</td>
    </tr>
  );
  return (
    <div className="mx-auto hidden max-w-3xl bg-white p-6 text-sm text-black print:block">
      <div className="mb-4 border-b-2 border-black pb-3 text-center">
        <div className="text-xs">{t('গণপ্রজাতন্ত্রী বাংলাদেশ সরকার', 'Government of Bangladesh')}</div>
        <div className="text-lg font-semibold">{t('ভূমি মোকদ্দমা ডকেট', 'Land case docket')}</div>
        <div className="font-mono text-xs">
          {docket.case_no} · {fmtDate(docket.verification?.filed_at, lang, true)}
        </div>
      </div>
      <table className="w-full border-collapse text-sm">
        <tbody>
          {row(t('আইনজীবী', 'Lawyer'), `${docket.lawyer.name_bn} · ${docket.lawyer.bar_council_no} · ${docket.lawyer.district_bar}`)}
          {row(t('মোবাইল', 'Phone'), maskPhone(docket.lawyer.phone, lang))}
          {row(t('আদালত', 'Court'), c.court_name)}
          {row(t('মামলা নং', 'Suit no'), c.suit_no)}
          {row(t('ধরন', 'Type'), optLabel(DISPUTE_TYPES, c.dispute_type, lang))}
          {row(t('পর্যায়', 'Stage'), optLabel(CASE_STAGES, c.case_stage, lang))}
          {row(t('বাদী', 'Plaintiff'), plaintiffNid ? `${c.plaintiff_name} · ${maskNid(plaintiffNid, lang)}` : c.plaintiff_name)}
          {row(t('বিবাদী', 'Defendant'), c.defendant_name)}
          {row(t('দাগ', 'Plot'), `${docket.plot.dag_no_bn || docket.plot.dag_no} · ${docket.plot.mouza_bn}, ${docket.plot.upazila_bn}, ${docket.plot.district_bn}`)}
          {row(t('নালিশি অংশ', 'Disputed area'), `${toBanglaDigits(c.disputed_area_decimal, lang)} ${t('শতক', 'dec')}`)}
          {row(t('চৌহদ্দি', 'Boundaries'), boundaryText(c.boundaries, t))}
          {row(t('যাচাই হ্যাশ', 'Hash'), <span className="break-all font-mono text-xs">{docket.verification?.content_hash}</span>)}
        </tbody>
      </table>
      <div className="mt-12 flex justify-end">
        <div className="border-t border-black pt-1 text-xs">{t('আইনজীবীর স্বাক্ষর ও সিল', "Lawyer's signature & seal")}</div>
      </div>
    </div>
  );
};
