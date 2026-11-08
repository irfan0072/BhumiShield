import React, { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminPage, DataTable, EmptyRow, LoadingRows, PageToolbar, Section } from '@/components/admin/kit';
import { BatchSheet } from './BatchSheet';
import { BatchStatus, SectionProps, up, useFmt, useSectionIntent } from './shared';

type Filter = 'WAITING' | 'RETURNED' | 'DONE' | 'ALL';

/** Checker view: survey batches waiting for an independent decision. */
export const OnboardingSection: React.FC<SectionProps> = ({ data, loaded, reload, intent, clearIntent }) => {
  const { user } = useAppUI();
  const { t, n, date } = useFmt();
  const batches = data.batches;
  const [filter, setFilter] = useState<Filter>('WAITING');
  const [search, setSearch] = useState('');
  const [openBatch, setOpenBatch] = useState<number | string | null>(null);

  useSectionIntent('onboarding', intent, clearIntent, loaded, (i) => {
    if (i.recordId !== undefined) setOpenBatch(i.recordId);
  });

  const bucket = (b: any): Filter => {
    const s = up(b.status);
    return s === 'SUBMITTED' ? 'WAITING' : s === 'RETURNED' ? 'RETURNED' : 'DONE';
  };
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { WAITING: 0, RETURNED: 0, DONE: 0, ALL: batches.length };
    batches.forEach((b) => (c[bucket(b)] += 1));
    return c;
  }, [batches]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return batches.filter((b) => {
      if (filter !== 'ALL' && bucket(b) !== filter) return false;
      if (!q) return true;
      return [b.batch_no, b.maker_name_bn].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [batches, filter, search]);

  const tabs: Array<[Filter, string]> = [
    ['WAITING', t('যাচাই বাকি', 'Waiting')],
    ['RETURNED', t('ফেরত', 'Returned')],
    ['DONE', t('নিষ্পন্ন', 'Decided')],
    ['ALL', t('সব', 'All')],
  ];

  return (
    <AdminPage fill>
      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('ব্যাচ নং বা নাম…', 'Batch no or name…')}
        filters={
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList className="h-9">
              {tabs.map(([k, l]) => (
                <TabsTrigger key={k} value={k} className="gap-1.5 px-3 text-xs">
                  {l}
                  <span className="text-slate-400">{n(counts[k])}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      <Section fill>
        <DataTable headers={[t('ব্যাচ', 'Batch'), t('প্রস্তুতকারী', 'Prepared by'), t('রেকর্ড', 'Records'), t('অবস্থা', 'Status'), '']} alignRight={[4]}>
          {!loaded ? (
            <LoadingRows cols={5} />
          ) : rows.length === 0 ? (
            <EmptyRow cols={5} text={filter === 'WAITING' ? t('যাচাইয়ের কিছু নেই', 'Nothing to check') : t('কোনো ব্যাচ নেই', 'No batches')} />
          ) : (
            rows.map((b) => {
              const mine = Number(b.maker_user_id) === Number(user?.id);
              return (
                <tr key={b.id} className="cursor-pointer" onClick={() => setOpenBatch(b.id)}>
                  <td>
                    <div className="font-medium text-slate-900">{b.batch_no}</div>
                    <div className="text-xs text-slate-500">{date(b.created_at)}</div>
                  </td>
                  <td>
                    <div className="text-slate-800">{b.maker_name_bn || '—'}</div>
                    {mine && <div className="text-xs text-slate-500">{t('আপনার তৈরি', 'Made by you')}</div>}
                  </td>
                  <td className="text-slate-800">{n(b.item_count ?? b.total_items ?? '—')}</td>
                  <td>
                    <BatchStatus code={b.status} />
                  </td>
                  <td className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={t('বিস্তারিত', 'Details')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenBatch(b.id);
                      }}
                    >
                      <Eye className="size-4 text-slate-500" />
                    </Button>
                  </td>
                </tr>
              );
            })
          )}
        </DataTable>
      </Section>

      <BatchSheet batchRef={openBatch} onClose={() => setOpenBatch(null)} reload={reload} />
    </AdminPage>
  );
};
