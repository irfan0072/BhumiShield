import React, { useMemo, useState } from 'react';
import { Building2, Coins, FileCheck2, Layers, Plus, Scale } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { toBanglaDigits, maskNid } from '@/theme/tokens';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  StatusBadge,
  StatusCode,
  useCreateIntent,
} from '@/components/admin/kit';
import {
  caseStatus,
  crore,
  decimal,
  disputeTypeLabel,
  fmtDate,
  isOpenCase,
  isOpenDispute,
  num,
  plotIdsOf,
  sectionLabel,
} from './shared';

export type LaTab = 'cases' | 'disputes';

export const LaCasesSection: React.FC<{
  cases: any[];
  disputes: any[];
  plots: any[];
  loading: boolean;
  tab: LaTab;
  onTabChange: (tab: LaTab) => void;
  canCreate: boolean;
  onCreate: () => void;
  onOpenPlot: (plotId: number) => void;
}> = ({ cases, disputes, plots, loading, tab, onTabChange, canCreate, onCreate, onOpenPlot }) => {
  const { lang, t } = useAppUI();
  const n = (v: any) => toBanglaDigits(v ?? '', lang);
  const [search, setSearch] = useState('');
  const [selCase, setSelCase] = useState<any | null>(null);
  const [selDispute, setSelDispute] = useState<any | null>(null);

  useCreateIntent(() => canCreate && onCreate());

  const plotById = useMemo(() => new Map(plots.map((p) => [Number(p.id), p])), [plots]);

  const totals = useMemo(
    () => ({
      open: cases.filter(isOpenCase).length,
      land: cases.reduce((s, c) => s + num(c.total_land_decimal), 0),
      money: cases.reduce((s, c) => s + num(c.estimated_compensation_bdt ?? c.compensation_budget), 0),
      openDisputes: disputes.filter(isOpenDispute).length,
    }),
    [cases, disputes]
  );

  const q = search.trim().toLowerCase();
  const shownCases = useMemo(
    () =>
      !q
        ? cases
        : cases.filter((c) =>
            [c.case_no, c.project_name_bn, c.project_name_en, c.acquiring_agency_bn, c.mouza_bn, c.upazila_bn, c.district_bn, c.gazette_no]
              .some((v) => String(v || '').toLowerCase().includes(q))
          ),
    [cases, q]
  );
  const shownDisputes = useMemo(
    () =>
      !q
        ? disputes
        : disputes.filter((d) =>
            [d.case_no, d.id, d.dag_no, d.dag_no_bn, d.mouza_bn, d.mouza_en, d.dispute_type, d.description_bn]
              .some((v) => String(v || '').toLowerCase().includes(q))
          ),
    [disputes, q]
  );

  const caseCols = 5;
  const dispCols = 5;

  return (
    <AdminPage fill>
      <StatGrid>
        <StatCard
          label={t('চলমান মামলা', 'Open cases')}
          value={loading ? '—' : n(totals.open)}
          icon={Building2}
          tone="blue"
          onClick={() => onTabChange('cases')}
          active={tab === 'cases'}
        />
        <StatCard label={t('মোট জমি', 'Total land')} value={loading ? '—' : decimal(totals.land, lang)} icon={Layers} tone="green" />
        <StatCard label={t('ক্ষতিপূরণ বাজেট', 'Compensation')} value={loading ? '—' : crore(totals.money, lang)} icon={Coins} tone="violet" />
        <StatCard
          label={t('খোলা আদালত আদেশ', 'Open court orders')}
          value={loading ? '—' : n(totals.openDisputes)}
          icon={Scale}
          tone={totals.openDisputes ? 'red' : 'slate'}
          onClick={() => onTabChange('disputes')}
          active={tab === 'disputes'}
        />
      </StatGrid>

      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={tab === 'cases' ? t('প্রকল্প, কেস, মৌজা…', 'Project, case, mouza…') : t('দাগ, মৌজা, কেস…', 'Plot, mouza, case…')}
        filters={
          <Tabs value={tab} onValueChange={(v) => onTabChange(v as LaTab)}>
            <TabsList className="h-9">
              <TabsTrigger value="cases" className="gap-1.5 px-3 text-xs">
                {t('অধিগ্রহণ মামলা', 'Cases')}
                <span className="text-slate-400">{n(cases.length)}</span>
              </TabsTrigger>
              <TabsTrigger value="disputes" className="gap-1.5 px-3 text-xs">
                {t('আদালত আদেশ', 'Court orders')}
                <span className="text-slate-400">{n(disputes.length)}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
        actions={
          canCreate && (
            <Button size="sm" className="h-9" onClick={onCreate}>
              <Plus className="size-4" />
              {t('নতুন অধিগ্রহণ নোটিশ', 'New notice')}
            </Button>
          )
        }
      />

      <Section fill>
        {tab === 'cases' ? (
          <DataTable
            headers={[t('মামলা', 'Case'), t('প্রকল্প', 'Project'), t('অবস্থান', 'Location'), t('জমি', 'Land'), t('পর্যায়', 'Stage')]}
          >
            {loading ? (
              <LoadingRows cols={caseCols} />
            ) : shownCases.length === 0 ? (
              <EmptyRow
                cols={caseCols}
                text={q ? t('কিছু পাওয়া যায়নি', 'Nothing found') : t('কোনো অধিগ্রহণ মামলা নেই', 'No acquisition cases')}
              />
            ) : (
              shownCases.map((c) => {
                const st = caseStatus(c.status, lang);
                const ids = plotIdsOf(c);
                return (
                  <tr key={c.id} onClick={() => setSelCase(c)} className="cursor-pointer">
                    <td className="whitespace-nowrap">
                      <div className="font-medium text-slate-900">{c.case_no || `LA-${n(c.id)}`}</div>
                      <div className="text-xs text-slate-500">{c.gazette_no || '—'}</div>
                    </td>
                    <td className="min-w-[14rem]">
                      <div className="line-clamp-1 text-slate-800">
                        {lang === 'bn' ? c.project_name_bn : c.project_name_en || c.project_name_bn}
                      </div>
                      <div className="line-clamp-1 text-xs text-slate-500">{c.acquiring_agency_bn || '—'}</div>
                    </td>
                    <td>
                      <div className="text-slate-700">{c.mouza_bn || '—'}</div>
                      <div className="text-xs text-slate-500">{[c.upazila_bn, c.district_bn].filter(Boolean).join(', ')}</div>
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="text-slate-800">{decimal(c.total_land_decimal, lang)}</div>
                      <div className="text-xs text-slate-500">
                        {n(ids.length)} {t('দাগ', 'plots')}
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                      <div className="mt-0.5 text-xs text-slate-500">{sectionLabel(c.section_type, lang)}</div>
                    </td>
                  </tr>
                );
              })
            )}
          </DataTable>
        ) : (
          <DataTable headers={[t('কেস', 'Case'), t('দাগ', 'Plot'), t('ধরন', 'Type'), t('তারিখ', 'Date'), t('অবস্থা', 'Status')]}>
            {loading ? (
              <LoadingRows cols={dispCols} />
            ) : shownDisputes.length === 0 ? (
              <EmptyRow cols={dispCols} text={q ? t('কিছু পাওয়া যায়নি', 'Nothing found') : t('কোনো আদালত আদেশ নেই', 'No court orders')} />
            ) : (
              shownDisputes.map((d) => {
                const p = plotById.get(Number(d.plot_id));
                return (
                  <tr key={d.id} onClick={() => setSelDispute(d)} className="cursor-pointer">
                    <td className="whitespace-nowrap font-medium text-slate-900">{d.case_no || `#${n(d.id)}`}</td>
                    <td>
                      <div className="text-slate-800">
                        {t('দাগ', 'Dag')} {n(d.dag_no_bn || d.dag_no || p?.dag_no_bn || d.plot_id)}
                      </div>
                      <div className="text-xs text-slate-500">{d.mouza_bn || p?.mouza_bn || '—'}</div>
                    </td>
                    <td className="text-slate-700">{disputeTypeLabel(d.dispute_type, lang)}</td>
                    <td className="whitespace-nowrap text-slate-600">{fmtDate(d.created_at, lang)}</td>
                    <td>
                      <StatusCode code={d.status} lang={lang} />
                    </td>
                  </tr>
                );
              })
            )}
          </DataTable>
        )}
      </Section>

      <DetailSheet
        open={!!selCase}
        onOpenChange={(o) => !o && setSelCase(null)}
        title={selCase ? (lang === 'bn' ? selCase.project_name_bn : selCase.project_name_en || selCase.project_name_bn) : ''}
        subtitle={selCase?.case_no}
        footer={
          selCase &&
          plotIdsOf(selCase).length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-9"
              onClick={() => {
                const id = plotIdsOf(selCase)[0];
                setSelCase(null);
                onOpenPlot(id);
              }}
            >
              <FileCheck2 className="size-4" />
              {t('মালিকানা যাচাই', 'Title check')}
            </Button>
          )
        }
      >
        {selCase && (
          <>
            <DetailList
              items={[
                [t('পর্যায়', 'Stage'), <StatusBadge tone={caseStatus(selCase.status, lang).tone}>{caseStatus(selCase.status, lang).label}</StatusBadge>],
                [t('আইনি ধারা', 'Section'), sectionLabel(selCase.section_type, lang)],
                [t('প্রত্যাশী সংস্থা', 'Agency'), selCase.acquiring_agency_bn || '—'],
                [t('গেজেট', 'Gazette'), selCase.gazette_no || '—'],
                [t('গেজেটের তারিখ', 'Gazette date'), fmtDate(selCase.gazette_published_at, lang)],
                [t('অবস্থান', 'Location'), [selCase.mouza_bn, selCase.upazila_bn, selCase.district_bn].filter(Boolean).join(', ') || '—'],
                [t('জমি', 'Land'), decimal(selCase.total_land_decimal, lang)],
                [t('ক্ষতিপূরণ', 'Compensation'), crore(num(selCase.estimated_compensation_bdt ?? selCase.compensation_budget), lang)],
                [t('কর্মকর্তা', 'Officer'), selCase.created_by_officer || '—'],
                [t('তৈরি', 'Created'), fmtDate(selCase.created_at, lang)],
              ]}
            />
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-500">{t('দাগসমূহ', 'Plots')}</p>
              <div className="flex flex-wrap gap-1.5">
                {plotIdsOf(selCase).length === 0 && <span className="text-sm text-slate-400">—</span>}
                {plotIdsOf(selCase).map((id) => {
                  const p = plotById.get(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setSelCase(null);
                        onOpenPlot(id);
                      }}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:border-[#006A4E] hover:text-[#006A4E] cursor-pointer"
                    >
                      {t('দাগ', 'Dag')} {n(p?.dag_no_bn || p?.dag_no || id)}
                      {p?.mouza_bn ? ` · ${p.mouza_bn}` : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </DetailSheet>

      <DetailSheet
        open={!!selDispute}
        onOpenChange={(o) => !o && setSelDispute(null)}
        title={selDispute ? disputeTypeLabel(selDispute.dispute_type, lang) : ''}
        subtitle={selDispute?.case_no || (selDispute ? `#${n(selDispute.id)}` : '')}
        footer={
          selDispute && (
            <Button
              size="sm"
              variant="outline"
              className="h-9"
              onClick={() => {
                const id = Number(selDispute.plot_id);
                setSelDispute(null);
                onOpenPlot(id);
              }}
            >
              <FileCheck2 className="size-4" />
              {t('মালিকানা যাচাই', 'Title check')}
            </Button>
          )
        }
      >
        {selDispute && (
          <DetailList
            items={[
              [t('অবস্থা', 'Status'), <StatusCode code={selDispute.status} lang={lang} />],
              [
                t('দাগ', 'Plot'),
                `${t('দাগ', 'Dag')} ${n(selDispute.dag_no_bn || selDispute.dag_no || selDispute.plot_id)}${
                  selDispute.mouza_bn ? ` · ${selDispute.mouza_bn}` : ''
                }`,
              ],
              [t('তারিখ', 'Date'), fmtDate(selDispute.created_at, lang)],
              !!selDispute.complainant_name_bn && [t('আবেদনকারী', 'Complainant'), selDispute.complainant_name_bn],
              !!selDispute.complainant_nid && [t('এনআইডি', 'NID'), maskNid(selDispute.complainant_nid, lang)],
              !!selDispute.severity && [t('গুরুত্ব', 'Severity'), <StatusCode code={selDispute.severity} lang={lang} />],
              !!selDispute.description_bn && [t('বিবরণ', 'Details'), selDispute.description_bn],
            ]}
          />
        )}
      </DetailSheet>
    </AdminPage>
  );
};
