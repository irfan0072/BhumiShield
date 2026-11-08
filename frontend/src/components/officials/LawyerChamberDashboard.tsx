import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock, Plus, Scale } from 'lucide-react';
import { BhumiApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import {
  AdminPage,
  DataTable,
  DetailList,
  DetailSheet,
  EmptyRow,
  LoadingRows,
  PageToolbar,
  Section,
  StatCard,
  StatGrid,
  StatusCode,
  notify,
} from '@/components/admin/kit';
import { toBanglaDigits } from '@/theme/tokens';
import { useAppUI } from '@/i18n';
import { CASE_STAGES, DISPUTE_TYPES, fmtDate, optLabel } from '@/pages/lawyer/constants';

interface LawyerChamberDashboardProps {
  onNavigateTab: (tab: string) => void;
  /** Kept for compatibility; the list comes from the logged-in lawyer's own cases. */
  barCouncilNo?: string;
}

type CaseRow = {
  id: number;
  case_no: string;
  suit_no?: string | null;
  court_name?: string | null;
  case_stage?: string | null;
  dispute_type?: string | null;
  status?: string | null;
  complainant_name_bn?: string | null;
  disputed_area_decimal?: number | null;
  boundaries_json?: string | null;
  dag_no?: string | null;
  dag_no_bn?: string | null;
  mouza_bn?: string | null;
  mouza_en?: string | null;
  upazila_bn?: string | null;
  upazila_en?: string | null;
  lawyer_bar_council_no?: string | null;
  created_at?: string | null;
};

type Filter = 'all' | 'pending' | 'resolved' | 'month';

const isResolved = (s?: string | null) => ['RESOLVED', 'CLOSED', 'DISMISSED', 'REJECTED'].includes(String(s || '').toUpperCase());

export const LawyerChamberDashboard: React.FC<LawyerChamberDashboardProps> = ({ onNavigateTab }) => {
  const { lang, t } = useAppUI();
  const [items, setItems] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<CaseRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BhumiApi.getMyLawyerCases();
      setItems(Array.isArray(res?.items) ? res.items : []);
    } catch (err) {
      setItems([]);
      notify.err(err, lang, t('মামলার তালিকা আনা যায়নি', 'Could not load cases'));
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }, []);
  const inMonth = (r: CaseRow) => !!r.created_at && new Date(r.created_at).getTime() >= monthStart;

  const counts = useMemo(
    () => ({
      all: items.length,
      pending: items.filter((r) => !isResolved(r.status)).length,
      resolved: items.filter((r) => isResolved(r.status)).length,
      month: items.filter(inMonth).length,
    }),
    [items] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => {
      if (filter === 'pending' && isResolved(r.status)) return false;
      if (filter === 'resolved' && !isResolved(r.status)) return false;
      if (filter === 'month' && !inMonth(r)) return false;
      if (!q) return true;
      return [r.case_no, r.suit_no, r.court_name, r.complainant_name_bn, r.dag_no, r.dag_no_bn, r.mouza_bn, r.mouza_en]
        .some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [items, search, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const num = (n: number) => (loading ? '—' : toBanglaDigits(n, lang));
  const toggle = (f: Filter) => setFilter((cur) => (cur === f ? 'all' : f));
  const plotText = (r: CaseRow) => (lang === 'bn' ? r.dag_no_bn || r.dag_no : r.dag_no || r.dag_no_bn) || '—';
  const mouzaText = (r: CaseRow) => (lang === 'bn' ? r.mouza_bn : r.mouza_en || r.mouza_bn) || '';

  const boundaries = (r: CaseRow) => {
    try {
      const b = r.boundaries_json ? JSON.parse(r.boundaries_json) : null;
      if (!b) return '—';
      const parts = [
        b.north && `${t('উত্তর', 'N')}: ${b.north}`,
        b.south && `${t('দক্ষিণ', 'S')}: ${b.south}`,
        b.east && `${t('পূর্ব', 'E')}: ${b.east}`,
        b.west && `${t('পশ্চিম', 'W')}: ${b.west}`,
      ].filter(Boolean);
      return parts.length ? parts.join(', ') : '—';
    } catch {
      return '—';
    }
  };

  return (
    <AdminPage fill>
      <StatGrid>
        <StatCard label={t('মোট মামলা', 'All cases')} value={num(counts.all)} icon={Scale} tone="blue" active={filter === 'all'} onClick={() => setFilter('all')} />
        <StatCard label={t('চলমান', 'Ongoing')} value={num(counts.pending)} icon={Clock} tone="amber" active={filter === 'pending'} onClick={() => toggle('pending')} />
        <StatCard label={t('নিষ্পন্ন', 'Resolved')} value={num(counts.resolved)} icon={CheckCircle2} tone="green" active={filter === 'resolved'} onClick={() => toggle('resolved')} />
        <StatCard label={t('এ মাসে দাখিল', 'Filed this month')} value={num(counts.month)} icon={CalendarDays} tone="violet" active={filter === 'month'} onClick={() => toggle('month')} />
      </StatGrid>

      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('মামলা, দাগ বা আদালত…', 'Case, plot or court…')}
        actions={
          <Button size="sm" className="h-9" onClick={() => onNavigateTab('step1')}>
            <Plus className="size-4" />
            {t('নতুন মামলা দাখিল', 'File new case')}
          </Button>
        }
      />

      <Section fill>
        <DataTable headers={[t('মামলা', 'Case'), t('দাগ', 'Plot'), t('আদালত', 'Court'), t('অবস্থা', 'Status'), t('দাখিল', 'Filed')]}>
          {loading ? (
            <LoadingRows cols={5} />
          ) : rows.length === 0 ? (
            <EmptyRow
              cols={5}
              text={items.length === 0 ? t('এখনো কোনো মামলা দাখিল হয়নি', 'No cases filed yet') : t('কিছু পাওয়া যায়নি', 'Nothing found')}
              action={
                items.length === 0 ? (
                  <Button size="sm" variant="outline" className="h-9" onClick={() => onNavigateTab('step1')}>
                    <Plus className="size-4" />
                    {t('নতুন মামলা দাখিল', 'File new case')}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="cursor-pointer" onClick={() => setOpen(r)}>
                <td>
                  <div className="font-mono text-sm text-slate-900">{r.case_no}</div>
                  <div className="text-xs text-slate-500">{r.suit_no || '—'}</div>
                </td>
                <td>
                  <div className="text-slate-800">{plotText(r)}</div>
                  <div className="text-xs text-slate-500">{mouzaText(r)}</div>
                </td>
                <td className="max-w-xs">
                  <div className="truncate text-slate-800">{r.court_name || '—'}</div>
                  <div className="truncate text-xs text-slate-500">{optLabel(CASE_STAGES, r.case_stage, lang)}</div>
                </td>
                <td>
                  <StatusCode code={r.status} lang={lang} />
                </td>
                <td className="whitespace-nowrap text-xs text-slate-500">{fmtDate(r.created_at, lang)}</td>
              </tr>
            ))
          )}
        </DataTable>
      </Section>

      <DetailSheet
        open={!!open}
        onOpenChange={(o) => !o && setOpen(null)}
        title={open?.case_no || ''}
        subtitle={open?.suit_no || undefined}
      >
        {open && (
          <DetailList
            items={[
              [t('অবস্থা', 'Status'), <StatusCode code={open.status} lang={lang} />],
              [t('আদালত', 'Court'), open.court_name],
              [t('মামলা নং', 'Suit no'), open.suit_no],
              [t('ধরন', 'Type'), optLabel(DISPUTE_TYPES, open.dispute_type, lang)],
              [t('পর্যায়', 'Stage'), optLabel(CASE_STAGES, open.case_stage, lang)],
              [t('বাদী', 'Plaintiff'), open.complainant_name_bn],
              [t('দাগ', 'Plot'), [plotText(open), mouzaText(open), lang === 'bn' ? open.upazila_bn : open.upazila_en || open.upazila_bn].filter(Boolean).join(', ')],
              [
                t('নালিশি অংশ', 'Disputed area'),
                open.disputed_area_decimal != null ? `${toBanglaDigits(open.disputed_area_decimal, lang)} ${t('শতক', 'dec')}` : '—',
              ],
              [t('চৌহদ্দি', 'Boundaries'), boundaries(open)],
              [t('সনদ নং', 'Licence no'), open.lawyer_bar_council_no ? <span className="font-mono">{open.lawyer_bar_council_no}</span> : '—'],
              [t('দাখিল', 'Filed'), fmtDate(open.created_at, lang, true)],
            ]}
          />
        )}
      </DetailSheet>
    </AdminPage>
  );
};
