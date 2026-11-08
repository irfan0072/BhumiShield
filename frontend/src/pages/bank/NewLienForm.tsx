import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Lock, ShieldCheck } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi, RiskReportResponse } from '@/api/client';
import { maskNid } from '@/theme/tokens';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminPage, Field, Section, StatusBadge, Tone, inputCls, notify } from '@/components/admin/kit';
import { triggerAppNotification } from '@/components/NotificationCenter';
import { BANK_PRESETS, num, officeBank, pick, taka } from './shared';

const verdictTone = (s?: string): Tone => (s === 'SAFE' ? 'green' : s === 'HIGH_RISK' ? 'red' : 'amber');

const StepTitle: React.FC<{ n: string; label: string; done?: boolean }> = ({ n, label, done }) => (
  <span className="flex items-center gap-2">
    <span
      className={cn(
        'flex size-5 items-center justify-center rounded-full text-xs font-medium',
        done ? 'bg-[#006A4E] text-white' : 'bg-slate-100 text-slate-600'
      )}
    >
      {n}
    </span>
    {label}
  </span>
);

export interface NewLienFormProps {
  plots: any[];
  persons: any[];
  canCreate: boolean;
  initialPlotId?: number;
  onCreated: () => void;
}

/**
 * Two steps: 1) collateral check (POST /mortgages/collateral-check: plot_id, borrower_id,
 * area_mortgaged_decimal) → 2) register lien (POST /mortgages: + bank_name_bn/en, branch_bn,
 * requested_loan_bdt). The backend only allows step 2 when the check verdict is SAFE.
 */
export const NewLienForm: React.FC<NewLienFormProps> = ({ plots, persons, canCreate, initialPlotId, onCreated }) => {
  const { lang, t, role, user } = useAppUI();
  const isAdmin = role === 'admin';
  const office = officeBank(user);

  const [plotId, setPlotId] = useState<number>(initialPlotId || 0);
  const [borrowerId, setBorrowerId] = useState<number>(0);
  const [area, setArea] = useState('');
  const [bankEn, setBankEn] = useState(isAdmin ? '' : office.en);
  const [bankBn, setBankBn] = useState(isAdmin ? '' : office.bn);
  const [branch, setBranch] = useState(isAdmin ? '' : office.branch);
  const [loan, setLoan] = useState('');
  const [report, setReport] = useState<RiskReportResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialPlotId) setPlotId(initialPlotId);
  }, [initialPlotId]);

  // Any change to the checked inputs invalidates the previous check.
  useEffect(() => {
    setReport(null);
  }, [plotId, borrowerId, area]);

  const presets = useMemo(
    () => BANK_PRESETS.filter((b) => isAdmin || b.en.toLowerCase() === office.en.toLowerCase()),
    [isAdmin, office.en]
  );
  const plot = plots.find((p) => Number(p.id) === Number(plotId));
  const areaNum = Number(area);
  const areaOk = Number.isFinite(areaNum) && areaNum > 0;
  const canCheck = !!plotId && !!borrowerId && areaOk && !checking;
  const safe = report?.status === 'SAFE';
  const loanNum = Number(loan);
  const canRegister = canCreate && safe && !!bankEn && !!bankBn && Number.isFinite(loanNum) && loanNum > 0 && !saving;

  const check = async () => {
    if (!canCheck) return;
    setChecking(true);
    try {
      const res = await BhumiApi.checkBankCollateral({
        plot_id: Number(plotId),
        borrower_id: Number(borrowerId),
        area_mortgaged_decimal: areaNum,
      });
      setReport(res);
    } catch (e) {
      notify.err(e, lang, t('জামানত যাচাই ব্যর্থ', 'Collateral check failed'));
    } finally {
      setChecking(false);
    }
  };

  const register = async () => {
    if (!canRegister) return;
    setSaving(true);
    try {
      const res = await BhumiApi.createMortgage({
        plot_id: Number(plotId),
        borrower_id: Number(borrowerId),
        bank_name_bn: bankBn,
        bank_name_en: bankEn,
        branch_name: branch,
        loan_amount_bdt: Math.round(loanNum),
        area_mortgaged_decimal: areaNum,
      });
      notify.ok((lang === 'bn' ? res?.message_bn : res?.message_en) || t('বন্ধক নিবন্ধিত হয়েছে', 'Mortgage registered'));
      triggerAppNotification({
        title_bn: 'নতুন ব্যাংক বন্ধক নিবন্ধিত',
        title_en: 'New mortgage lien registered',
        message_bn: `${bankBn}: দাগ ${plot?.dag_no_bn || plot?.dag_no || plotId}-এ ৳${loanNum.toLocaleString('en-IN')} টাকার বন্ধক।`,
        message_en: `${bankEn}: lien of ৳${loanNum.toLocaleString('en-IN')} on plot ${plot?.dag_no || plotId}.`,
        type: 'WARNING',
        targetTab: 'bank',
        targetSection: 'mortgages',
      });
      setPlotId(0);
      setBorrowerId(0);
      setArea('');
      setLoan('');
      setReport(null);
      onCreated();
    } catch (e) {
      notify.err(e, lang, t('বন্ধক নিবন্ধন হয়নি', 'Could not register mortgage'));
    } finally {
      setSaving(false);
    }
  };

  const issues = (report?.findings || []).filter((f) => f.severity !== 'SAFE');

  return (
    <AdminPage className="max-w-3xl">
      <Section title={<StepTitle n={num(1, lang)} label={t('জামানত যাচাই', 'Collateral check')} done={!!report} />}>
        <form
          className="space-y-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            check();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('দাগ', 'Plot')}>
              <Select value={plotId ? String(plotId) : ''} onValueChange={(v) => setPlotId(v ? Number(v) : 0)}>
                <SelectTrigger className="h-9 w-full rounded-lg text-sm">
                  <SelectValue placeholder={t('দাগ বাছাই', 'Choose plot')} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {plots.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)} className="text-sm">
                      {t('দাগ', 'Plot')} {num(p.dag_no_bn || p.dag_no, lang)} · {pick(lang, p.mouza_bn, p.mouza_en)}
                      {Number(p.owner_sale_locked) === 1 ? ` · ${t('লক', 'Locked')}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('ঋণগ্রহীতা', 'Borrower')}>
              <Select value={borrowerId ? String(borrowerId) : ''} onValueChange={(v) => setBorrowerId(v ? Number(v) : 0)}>
                <SelectTrigger className="h-9 w-full rounded-lg text-sm">
                  <SelectValue placeholder={t('ঋণগ্রহীতা বাছাই', 'Choose borrower')} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {persons.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)} className="text-sm">
                      {pick(lang, p.name_bn, p.name_en)} · {maskNid(p.nid || p.nid_mock, lang)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label={t('বন্ধকী জমি (শতক)', 'Area (decimal)')}
              hint={plot?.total_area_decimal ? `${t('মোট', 'Total')} ${num(plot.total_area_decimal, lang)} ${t('শতক', 'dec')}` : undefined}
            >
              <input
                type="number"
                min="0.0001"
                step="any"
                inputMode="decimal"
                className={inputCls}
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" size="sm" variant={report ? 'outline' : 'default'} className="h-9 gap-1.5" disabled={!canCheck}>
                {checking ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                {report ? t('আবার যাচাই', 'Check again') : t('যাচাই করুন', 'Check')}
              </Button>
            </div>
          </div>

          {report && (
            <div className="space-y-2 rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={verdictTone(report.status)}>
                  {report.status === 'SAFE'
                    ? t('নিরাপদ', 'Safe')
                    : report.status === 'HIGH_RISK'
                    ? t('উচ্চ ঝুঁকি', 'High risk')
                    : t('সতর্কতা', 'Warning')}
                </StatusBadge>
                {!!report.active_mortgages?.length && (
                  <span className="text-xs text-slate-500">
                    {t('সক্রিয় বন্ধক', 'Active liens')}: {num(report.active_mortgages.length, lang)}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-700">{lang === 'bn' ? report.summary_bn : report.summary_en}</p>
              {issues.length > 0 && (
                <ul className="space-y-1">
                  {issues.slice(0, 5).map((f, i) => (
                    <li key={`${f.rule_code}-${i}`} className="flex items-start gap-2 text-xs text-slate-600">
                      <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', f.severity === 'HIGH' ? 'bg-rose-500' : 'bg-amber-500')} />
                      <span>{lang === 'bn' ? f.title_bn : f.title_en}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </form>
      </Section>

      <Section title={<StepTitle n={num(2, lang)} label={t('বন্ধক নিবন্ধন', 'Register lien')} />}>
        <form
          className={cn('space-y-3 p-4', !safe && 'opacity-60')}
          onSubmit={(e) => {
            e.preventDefault();
            register();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('ব্যাংক', 'Bank')}>
              {isAdmin ? (
                <Select
                  value={bankEn}
                  onValueChange={(v) => {
                    const b = BANK_PRESETS.find((x) => x.en === v);
                    if (!b) return;
                    setBankEn(b.en);
                    setBankBn(b.bn);
                    setBranch(b.branch);
                  }}
                  disabled={!safe}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg text-sm">
                    <SelectValue placeholder={t('ব্যাংক বাছাই', 'Choose bank')} />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((b) => (
                      <SelectItem key={b.en} value={b.en} className="text-sm">
                        {lang === 'bn' ? b.bn : b.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <input className={inputCls} value={lang === 'bn' ? bankBn : bankEn} readOnly disabled />
              )}
            </Field>
            <Field label={t('শাখা', 'Branch')}>
              <input className={inputCls} value={branch} onChange={(e) => setBranch(e.target.value)} disabled={!safe} />
            </Field>
            <Field label={t('ঋণের পরিমাণ (টাকা)', 'Loan amount (BDT)')} hint={loanNum > 0 ? taka(loanNum, lang) : undefined}>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                className={inputCls}
                value={loan}
                onChange={(e) => setLoan(e.target.value)}
                disabled={!safe}
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" size="sm" className="h-9 gap-1.5" disabled={!canRegister}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                {t('নিবন্ধন করুন', 'Register')}
              </Button>
            </div>
          </div>
          {!canCreate ? (
            <p className="text-xs text-slate-500">{t('নিবন্ধন শুধু ব্যাংক কর্মকর্তা পারেন', 'Only the bank officer can register')}</p>
          ) : report && !safe ? (
            <p className="text-xs text-slate-500">{t('ঝুঁকি থাকায় বন্ধক নেওয়া যাবে না', 'Blocked due to risk')}</p>
          ) : !report ? (
            <p className="text-xs text-slate-500">{t('আগে জামানত যাচাই করুন', 'Check collateral first')}</p>
          ) : null}
        </form>
      </Section>
    </AdminPage>
  );
};
