import React, { useEffect, useMemo, useState } from 'react';
import { Banknote, CheckCircle2, Eye, Landmark, Lock, RotateCcw, ShieldCheck, Unlock } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi, RiskReportResponse } from '@/api/client';
import { toBanglaDigits } from '@/theme/tokens';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AdminPage,
  DataTable,
  DetailList,
  DetailSheet,
  EmptyRow,
  Field,
  FormDialog,
  PageToolbar,
  Section,
  StatCard,
  StatGrid,
  StatusBadge,
  StatusCode,
  Tone,
  apiMessage,
  inputCls,
} from '@/components/admin/kit';

interface SuperAdminBankLiensTabProps {
  mortgages: any[];
  onRefresh: () => void;
  onOpenOverride?: (type: string, id: string | number, extra?: any) => void;
}

type Lang = 'bn' | 'en';

const VERDICT: Record<string, { tone: Tone; bn: string; en: string }> = {
  SAFE: { tone: 'green', bn: 'নিরাপদ', en: 'Safe' },
  WARNING: { tone: 'amber', bn: 'সতর্কতা', en: 'Warning' },
  REVIEW: { tone: 'amber', bn: 'যাচাই দরকার', en: 'Review' },
  HIGH_RISK: { tone: 'red', bn: 'উচ্চ ঝুঁকি', en: 'High risk' },
};

/** Drops leading tick/cross symbols that some server messages carry. */
const clean = (s?: string) => String(s || '').replace(/^[\s✔✖✓✗]+/, '').trim();

const fmtDate = (v: any, lang: Lang) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB');
};

const money = (v: any, lang: Lang) => {
  const num = Number(v);
  if (!Number.isFinite(num) || num <= 0) return '—';
  return `৳ ${toBanglaDigits(num.toLocaleString('en-IN'), lang)}`;
};

const emptyCheck = { plot_id: '', borrower_id: '', area: '' };

export const SuperAdminBankLiensTab: React.FC<SuperAdminBankLiensTabProps> = ({ mortgages, onRefresh }) => {
  const { t, lang } = useAppUI();
  const n = (v: any) => toBanglaDigits(v, lang);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  // Release certificate (NOC) for released liens, loaded from /mortgages/{id}/noc
  const [noc, setNoc] = useState<any | null>(null);
  const [nocState, setNocState] = useState<'idle' | 'loading' | 'error'>('idle');

  // Collateral check dialog
  const [checkOpen, setCheckOpen] = useState(false);
  const [checkForm, setCheckForm] = useState(emptyCheck);
  const [checkBusy, setCheckBusy] = useState(false);
  const [checkResult, setCheckResult] = useState<RiskReportResponse | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.resolve(onRefresh());
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setNoc(null);
    setNocState('idle');
    if (!selected || selected.status !== 'RELEASED') return;
    let alive = true;
    setNocState('loading');
    BhumiApi.getMortgageNoc(selected.id)
      .then((res) => alive && (setNoc(res), setNocState('idle')))
      .catch(() => alive && setNocState('error'));
    return () => {
      alive = false;
    };
  }, [selected]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      mortgages.filter((m) => {
        if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;
        if (!q) return true;
        return [m.bank_name_bn, m.bank_name_en, m.branch_name, m.dag_no, m.dag_no_bn, m.mouza_bn, m.borrower_name_bn, m.plot_id]
          .filter((v) => v != null)
          .some((v) => String(v).toLowerCase().includes(q));
      }),
    [mortgages, statusFilter, q]
  );

  const active = mortgages.filter((m) => m.status === 'ACTIVE');
  const released = mortgages.filter((m) => m.status === 'RELEASED').length;
  const activeLoan = active.reduce((s, m) => s + (Number(m.loan_amount_bdt) || 0), 0);
  const activeArea = active.reduce((s, m) => s + (Number(m.area_mortgaged_decimal) || 0), 0);

  const openCheck = (prefill?: any) => {
    setCheckForm(
      prefill
        ? {
            plot_id: String(prefill.plot_id ?? ''),
            borrower_id: String(prefill.borrower_id ?? ''),
            area: String(prefill.area_mortgaged_decimal ?? ''),
          }
        : emptyCheck
    );
    setCheckResult(null);
    setCheckError(null);
    setCheckOpen(true);
  };

  const plotId = Number(checkForm.plot_id);
  const borrowerId = Number(checkForm.borrower_id);
  const area = Number(checkForm.area);
  const checkValid = plotId > 0 && borrowerId > 0 && area > 0;

  const runCheck = async () => {
    setCheckBusy(true);
    setCheckError(null);
    setCheckResult(null);
    try {
      // WorkflowController::bankCollateralCheck reads plot_id, borrower_id, area_mortgaged_decimal
      const res = await BhumiApi.checkBankCollateral({
        plot_id: plotId,
        borrower_id: borrowerId,
        area_mortgaged_decimal: area,
      });
      setCheckResult(res);
    } catch (e) {
      setCheckError(apiMessage(e, lang));
    } finally {
      setCheckBusy(false);
    }
  };

  const setField = (k: keyof typeof emptyCheck) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setCheckForm((f) => ({ ...f, [k]: e.target.value }));
    setCheckResult(null);
    setCheckError(null);
  };

  const verdict = checkResult ? VERDICT[checkResult.status] || VERDICT.HIGH_RISK : null;
  const issues = (checkResult?.findings || []).filter((f) => f.severity !== 'SAFE');

  return (
    <AdminPage fill>
      <StatGrid>
        <StatCard
          label={t('সক্রিয় বন্ধক', 'Active liens')}
          value={n(active.length)}
          icon={Lock}
          tone="amber"
          onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
          active={statusFilter === 'ACTIVE'}
        />
        <StatCard
          label={t('মুক্ত', 'Released')}
          value={n(released)}
          icon={Unlock}
          tone="green"
          onClick={() => setStatusFilter(statusFilter === 'RELEASED' ? 'ALL' : 'RELEASED')}
          active={statusFilter === 'RELEASED'}
        />
        <StatCard label={t('সক্রিয় ঋণ', 'Active loans')} value={money(activeLoan, lang)} icon={Banknote} tone="blue" />
        <StatCard
          label={t('বন্ধকী জমি', 'Mortgaged land')}
          value={activeArea > 0 ? `${n(Number(activeArea.toFixed(2)))} ${t('শতাংশ', 'dec')}` : '—'}
          icon={Landmark}
          tone="slate"
        />
      </StatGrid>

      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('ব্যাংক, দাগ বা নাম…', 'Bank, plot or name…')}
        filters={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-36 rounded-lg text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('সব', 'All')}</SelectItem>
              <SelectItem value="ACTIVE">{t('সক্রিয়', 'Active')}</SelectItem>
              <SelectItem value="RELEASED">{t('মুক্ত', 'Released')}</SelectItem>
            </SelectContent>
          </Select>
        }
        actions={
          <>
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={refresh} disabled={refreshing}>
              <RotateCcw className={cn('size-3.5', refreshing && 'animate-spin')} />
              {t('রিফ্রেশ', 'Refresh')}
            </Button>
            <Button size="sm" className="h-9 gap-1.5" onClick={() => openCheck()}>
              <ShieldCheck className="size-4" />
              {t('জামানত যাচাই', 'Check collateral')}
            </Button>
          </>
        }
      />

      <Section fill>
        <TooltipProvider delayDuration={200}>
          <DataTable
            headers={[t('দাগ', 'Plot'), t('ব্যাংক', 'Bank'), t('ঋণগ্রহীতা', 'Borrower'), t('অবস্থা', 'Status'), '']}
            alignRight={[4]}
          >
            {filtered.length === 0 ? (
              <EmptyRow cols={5} text={t('কোনো বন্ধক নেই', 'No liens')} />
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="cursor-pointer" onClick={() => setSelected(m)}>
                  <td>
                    <span className="block font-medium text-slate-900">
                      {t('দাগ', 'Plot')} {m.dag_no_bn || n(m.dag_no ?? m.plot_id)}
                    </span>
                    <span className="block text-xs text-slate-500">{[m.mouza_bn, m.upazila_bn].filter(Boolean).join(', ') || '—'}</span>
                  </td>
                  <td>
                    <span className="block text-slate-800">{(lang === 'bn' ? m.bank_name_bn : m.bank_name_en) || m.bank_name_bn || '—'}</span>
                    <span className="block text-xs text-slate-500">
                      {[m.branch_bn || m.branch_name, money(m.loan_amount_bdt, lang)].filter((v) => v && v !== '—').join(' · ')}
                    </span>
                  </td>
                  <td>
                    <span className="block text-slate-800">{m.borrower_name_bn || '—'}</span>
                    {m.borrower_nid && <span className="block text-xs text-slate-500">{m.borrower_nid}</span>}
                  </td>
                  <td>
                    <StatusCode code={m.status} lang={lang} />
                  </td>
                  <td className="text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-slate-500 hover:text-slate-900"
                          aria-label={t('বিস্তারিত', 'Details')}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(m);
                          }}
                        >
                          <Eye className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('বিস্তারিত', 'Details')}</TooltipContent>
                    </Tooltip>
                  </td>
                </tr>
              ))
            )}
          </DataTable>
        </TooltipProvider>
      </Section>

      {/* Lien details */}
      <DetailSheet
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected ? `${t('দাগ', 'Plot')} ${selected.dag_no_bn || n(selected.dag_no ?? selected.plot_id)}` : ''}
        subtitle={selected ? (lang === 'bn' ? selected.bank_name_bn : selected.bank_name_en) || selected.bank_name_bn : undefined}
        footer={
          selected && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => {
                const m = selected;
                setSelected(null);
                openCheck(m);
              }}
            >
              <ShieldCheck className="size-4" />
              {t('জামানত যাচাই', 'Check collateral')}
            </Button>
          )
        }
      >
        {selected && (
          <>
            <DetailList
              items={[
                [t('অবস্থা', 'Status'), <StatusCode code={selected.status} lang={lang} />],
                [t('শাখা', 'Branch'), selected.branch_bn || selected.branch_name],
                [t('ঋণের পরিমাণ', 'Loan amount'), money(selected.loan_amount_bdt, lang)],
                [t('বন্ধকী জমি', 'Mortgaged land'), selected.area_mortgaged_decimal != null ? `${n(selected.area_mortgaged_decimal)} ${t('শতাংশ', 'dec')}` : '—'],
                [t('ঋণগ্রহীতা', 'Borrower'), selected.borrower_name_bn],
                [t('এনআইডি', 'NID'), selected.borrower_nid],
                [t('মৌজা', 'Mouza'), [selected.mouza_bn, selected.upazila_bn].filter(Boolean).join(', ') || '—'],
                [t('বন্ধকের তারিখ', 'Created'), fmtDate(selected.created_at, lang)],
                !!selected.released_at && [t('মুক্তির তারিখ', 'Released'), fmtDate(selected.released_at, lang)],
              ]}
            />

            {selected.status === 'RELEASED' && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500">{t('ছাড়পত্র', 'Release NOC')}</p>
                {nocState === 'loading' ? (
                  <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
                ) : nocState === 'error' || !noc ? (
                  <p className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500">{t('ছাড়পত্র পাওয়া যায়নি', 'NOC not available')}</p>
                ) : (
                  <div className="flex gap-3 rounded-lg border border-slate-200 p-3">
                    {noc.qr_data_uri && <img src={noc.qr_data_uri} alt="QR" className="size-20 shrink-0 rounded border border-slate-100" />}
                    <div className="min-w-0 space-y-1 text-sm">
                      <p className="font-medium text-slate-900">{noc.noc_no || '—'}</p>
                      <p className="text-xs text-slate-500">{fmtDate(noc.issued_at, lang)}</p>
                      {noc.noc_hash && <p className="truncate font-mono text-xs text-slate-400" title={noc.noc_hash}>{noc.noc_hash}</p>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </DetailSheet>

      {/* Collateral check */}
      <FormDialog
        open={checkOpen}
        onOpenChange={setCheckOpen}
        title={t('জামানত যাচাই', 'Check collateral')}
        submitLabel={checkResult ? t('আবার যাচাই', 'Check again') : t('যাচাই করুন', 'Check')}
        cancelLabel={t('বন্ধ', 'Close')}
        busy={checkBusy}
        disabled={!checkValid}
        size="sm"
        onSubmit={runCheck}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('দাগ আইডি', 'Plot ID')}>
            <input type="number" min={1} inputMode="numeric" className={inputCls} value={checkForm.plot_id} onChange={setField('plot_id')} />
          </Field>
          <Field label={t('ঋণগ্রহীতা আইডি', 'Borrower ID')}>
            <input type="number" min={1} inputMode="numeric" className={inputCls} value={checkForm.borrower_id} onChange={setField('borrower_id')} />
          </Field>
        </div>
        <Field label={t('বন্ধকী জমি (শতাংশ)', 'Land (decimal)')}>
          <input type="number" min={0} step="0.01" inputMode="decimal" className={inputCls} value={checkForm.area} onChange={setField('area')} />
        </Field>

        {checkError && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{checkError}</p>
        )}

        {checkResult && verdict && (
          <div className="space-y-2 rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-800">{t('ফলাফল', 'Result')}</span>
              <StatusBadge tone={verdict.tone}>{lang === 'bn' ? verdict.bn : verdict.en}</StatusBadge>
            </div>
            <p className="text-sm text-slate-600">{clean(lang === 'bn' ? checkResult.summary_bn : checkResult.summary_en)}</p>
            {issues.length > 0 ? (
              <ul className="space-y-1">
                {issues.slice(0, 4).map((f, i) => (
                  <li key={`${f.rule_code}-${i}`} className="flex items-start gap-2 text-xs text-slate-600">
                    <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', f.severity === 'HIGH' ? 'bg-rose-500' : 'bg-amber-500')} />
                    {clean(lang === 'bn' ? f.title_bn : f.title_en)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-emerald-700">
                <CheckCircle2 className="size-3.5" />
                {t('কোনো সমস্যা নেই', 'No issues found')}
              </p>
            )}
          </div>
        )}
      </FormDialog>
    </AdminPage>
  );
};
