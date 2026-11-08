import React, { useMemo, useState } from 'react';
import { Eye, FileBadge, PlusCircle, RotateCcw, Unlock } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AdminPage,
  ConfirmDialog,
  DataTable,
  DetailList,
  DetailSheet,
  EmptyRow,
  LoadingRows,
  PageToolbar,
  Section,
  StatusCode,
} from '@/components/admin/kit';
import { IconAction, day, num, pick, taka } from './shared';

type Filter = 'ALL' | 'ACTIVE' | 'RELEASED';

export interface MortgageListSectionProps {
  /** `mortgages` = full register, `noc` = release desk (active waiting + released with NOC). */
  mode: 'mortgages' | 'noc';
  items: any[];
  loading: boolean;
  canCreate: boolean;
  canRelease: boolean;
  onReload: () => void;
  onCreate: () => void;
  onRelease: (m: any) => Promise<void>;
  onViewNoc: (id: number) => void;
}

export const MortgageListSection: React.FC<MortgageListSectionProps> = ({
  mode,
  items,
  loading,
  canCreate,
  canRelease,
  onReload,
  onCreate,
  onRelease,
  onViewNoc,
}) => {
  const { lang, t } = useAppUI();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>(mode === 'noc' ? 'RELEASED' : 'ALL');
  const [selected, setSelected] = useState<any | null>(null);
  const [releasing, setReleasing] = useState<any | null>(null);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { ALL: items.length, ACTIVE: 0, RELEASED: 0 };
    items.forEach((m) => {
      const s = String(m.status || '').toUpperCase();
      if (s === 'ACTIVE' || s === 'RELEASED') c[s] += 1;
    });
    return c;
  }, [items]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((m) => {
      if (filter !== 'ALL' && String(m.status || '').toUpperCase() !== filter) return false;
      if (!q) return true;
      return [
        m.bank_name_bn,
        m.bank_name_en,
        m.branch_name,
        m.borrower_name_bn,
        m.borrower_name_en,
        m.mouza_bn,
        m.mouza_en,
        m.dag_no,
        m.dag_no_bn,
      ].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [items, search, filter]);

  const tabs: Array<[Filter, string]> =
    mode === 'noc'
      ? [
          ['RELEASED', t('ছাড়পত্র', 'Released')],
          ['ACTIVE', t('অবমুক্তি বাকি', 'To release')],
        ]
      : [
          ['ALL', t('সব', 'All')],
          ['ACTIVE', t('সক্রিয়', 'Active')],
          ['RELEASED', t('মুক্ত', 'Released')],
        ];

  const isActive = (m: any) => String(m?.status || '').toUpperCase() === 'ACTIVE';

  return (
    <AdminPage fill>
      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('নাম, দাগ বা মৌজা…', 'Name, plot or mouza…')}
        filters={
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList className="h-9">
              {tabs.map(([key, label]) => (
                <TabsTrigger key={key} value={key} className="gap-1.5 px-3 text-xs">
                  {label}
                  <span className="text-slate-400">{num(counts[key], lang)}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
        actions={
          <>
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={onReload} disabled={loading}>
              <RotateCcw className={cn('size-3.5', loading && 'animate-spin')} />
              {t('রিফ্রেশ', 'Refresh')}
            </Button>
            {mode === 'mortgages' && canCreate && (
              <Button size="sm" className="h-9 gap-1.5" onClick={onCreate}>
                <PlusCircle className="size-4" />
                {t('নতুন বন্ধক', 'New mortgage')}
              </Button>
            )}
          </>
        }
      />

      <Section fill>
        <DataTable
          headers={[t('ঋণগ্রহীতা', 'Borrower'), t('জমি', 'Land'), t('ঋণ', 'Loan'), t('অবস্থা', 'Status'), '']}
          alignRight={[4]}
        >
          {loading && items.length === 0 ? (
            <LoadingRows cols={5} />
          ) : rows.length === 0 ? (
            <EmptyRow cols={5} text={t('কোনো বন্ধক নেই', 'No mortgages')} />
          ) : (
            rows.map((m) => (
              <tr key={m.id} className="cursor-pointer" onClick={() => setSelected(m)}>
                <td>
                  <div className="font-medium text-slate-900">{pick(lang, m.borrower_name_bn, m.borrower_name_en)}</div>
                  <div className="text-xs text-slate-500">
                    {pick(lang, m.bank_name_bn, m.bank_name_en)} · {m.branch_name || '—'}
                  </div>
                </td>
                <td>
                  <div className="text-slate-800">{pick(lang, m.mouza_bn, m.mouza_en)}</div>
                  <div className="text-xs text-slate-500">
                    {t('দাগ', 'Plot')} {num(m.dag_no_bn || m.dag_no, lang)}
                    {m.area_mortgaged_decimal ? ` · ${num(m.area_mortgaged_decimal, lang)} ${t('শতক', 'dec')}` : ''}
                  </div>
                </td>
                <td>
                  <div className="font-medium text-slate-900">{taka(m.loan_amount_bdt, lang)}</div>
                  <div className="text-xs text-slate-500">{day(isActive(m) ? m.created_at : m.released_at || m.created_at, lang)}</div>
                </td>
                <td>
                  <StatusCode code={m.status} lang={lang} />
                </td>
                <td className="text-right whitespace-nowrap">
                  {isActive(m) && canRelease && (
                    <IconAction label={t('অবমুক্ত করুন', 'Release')} icon={Unlock} tone="text-[#006A4E]" onClick={() => setReleasing(m)} />
                  )}
                  {!isActive(m) && (
                    <IconAction label={t('ছাড়পত্র দেখুন', 'View NOC')} icon={FileBadge} tone="text-[#006A4E]" onClick={() => onViewNoc(m.id)} />
                  )}
                  <IconAction label={t('বিস্তারিত', 'Details')} icon={Eye} onClick={() => setSelected(m)} />
                </td>
              </tr>
            ))
          )}
        </DataTable>
      </Section>

      <DetailSheet
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={pick(lang, selected?.bank_name_bn, selected?.bank_name_en)}
        subtitle={selected ? `${t('বন্ধক', 'Lien')} #${num(selected.id, lang)} · ${selected.branch_name || '—'}` : undefined}
        footer={
          selected && (
            <>
              {isActive(selected) && canRelease && (
                <Button size="sm" className="h-9 gap-1.5" onClick={() => setReleasing(selected)}>
                  <Unlock className="size-4" />
                  {t('অবমুক্ত করুন', 'Release')}
                </Button>
              )}
              {!isActive(selected) && (
                <Button
                  size="sm"
                  className="h-9 gap-1.5"
                  onClick={() => {
                    const id = selected.id;
                    setSelected(null);
                    onViewNoc(id);
                  }}
                >
                  <FileBadge className="size-4" />
                  {t('ছাড়পত্র দেখুন', 'View NOC')}
                </Button>
              )}
            </>
          )
        }
      >
        {selected && (
          <>
            <DetailList items={[[t('অবস্থা', 'Status'), <StatusCode key="s" code={selected.status} lang={lang} />]]} />
            <DetailList
              items={[
                [t('ঋণগ্রহীতা', 'Borrower'), pick(lang, selected.borrower_name_bn, selected.borrower_name_en)],
                [t('এনআইডি', 'NID'), selected.borrower_nid ? num(selected.borrower_nid, lang) : '—'],
                [t('ঋণের পরিমাণ', 'Loan amount'), taka(selected.loan_amount_bdt, lang)],
              ]}
            />
            <DetailList
              items={[
                [t('মৌজা', 'Mouza'), pick(lang, selected.mouza_bn, selected.mouza_en)],
                [t('উপজেলা', 'Upazila'), pick(lang, selected.upazila_bn, selected.upazila_en)],
                [t('দাগ', 'Plot'), num(selected.dag_no_bn || selected.dag_no, lang)],
                [
                  t('বন্ধকী জমি', 'Mortgaged area'),
                  selected.area_mortgaged_decimal
                    ? `${num(selected.area_mortgaged_decimal, lang)} ${t('শতক', 'dec')}${
                        selected.total_area_decimal ? ` / ${num(selected.total_area_decimal, lang)}` : ''
                      }`
                    : '—',
                ],
              ]}
            />
            <DetailList
              items={[
                [t('নিবন্ধন', 'Registered'), day(selected.created_at, lang)],
                [t('অবমুক্তি', 'Released'), day(selected.released_at, lang)],
              ]}
            />
            {isActive(selected) && !canRelease && (
              <p className="text-xs text-slate-500">{t('অবমুক্তি শুধু ব্যাংক কর্মকর্তা দিতে পারেন', 'Only the bank officer can release')}</p>
            )}
          </>
        )}
      </DetailSheet>

      <ConfirmDialog
        open={!!releasing}
        onOpenChange={(o) => !o && setReleasing(null)}
        title={t('বন্ধক অবমুক্ত করবেন?', 'Release this lien?')}
        description={
          releasing
            ? `${pick(lang, releasing.borrower_name_bn, releasing.borrower_name_en)} · ${t('দাগ', 'Plot')} ${num(
                releasing.dag_no_bn || releasing.dag_no,
                lang
              )} · ${taka(releasing.loan_amount_bdt, lang)}`
            : undefined
        }
        confirmLabel={t('অবমুক্ত করুন', 'Release')}
        onConfirm={async () => {
          await onRelease(releasing);
          setSelected(null);
        }}
      />
    </AdminPage>
  );
};
