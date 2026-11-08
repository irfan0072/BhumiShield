import React, { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
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
  StatusBadge,
  StatusCode,
} from '@/components/admin/kit';
import { SectionProps, isPendingAppeal, up, useFmt, useSectionIntent } from './shared';

type Filter = 'PENDING' | 'DONE' | 'ALL';

const AppealStatus: React.FC<{ code?: string }> = ({ code }) => {
  const { lang, t } = useFmt();
  const c = up(code);
  if (c === 'STAY_ORDER_GRANTED') return <StatusBadge tone="red">{t('স্থগিতাদেশ', 'Stay order')}</StatusBadge>;
  if (c === 'REMANDED') return <StatusBadge tone="blue">{t('পুনর্বিবেচনায়', 'Remanded')}</StatusBadge>;
  if (c === 'DISMISSED') return <StatusBadge tone="slate">{t('খারিজ', 'Dismissed')}</StatusBadge>;
  if (c === 'UNDER_REVIEW') return <StatusBadge tone="amber">{t('পর্যালোচনায়', 'In review')}</StatusBadge>;
  return <StatusCode code={c} lang={lang} />;
};

/** Read-only list of appeals against mutation decisions. */
export const AppealsSection: React.FC<SectionProps> = ({ data, loaded, intent, clearIntent }) => {
  const { t, n, date } = useFmt();
  const items = data.appeals;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [selected, setSelected] = useState<any | null>(null);

  useSectionIntent('appeals', intent, clearIntent, loaded, (i) => {
    const hit = items.find((a) => String(a.id) === String(i.recordId));
    if (hit) setSelected(hit);
  });

  const pendingCount = items.filter(isPendingAppeal).length;
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((a) => {
      if (filter === 'PENDING' && !isPendingAppeal(a)) return false;
      if (filter === 'DONE' && isPendingAppeal(a)) return false;
      if (!q) return true;
      return [a.appeal_code, a.case_no, a.appellant_name_bn, a.dag_no, a.dag_no_bn].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [items, filter, search]);

  return (
    <AdminPage fill>
      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('আপিল, কেস বা নাম…', 'Appeal, case or name…')}
        filters={
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList className="h-9">
              <TabsTrigger value="ALL" className="gap-1.5 px-3 text-xs">
                {t('সব', 'All')}
                <span className="text-slate-400">{n(items.length)}</span>
              </TabsTrigger>
              <TabsTrigger value="PENDING" className="gap-1.5 px-3 text-xs">
                {t('অপেক্ষমাণ', 'Pending')}
                <span className="text-slate-400">{n(pendingCount)}</span>
              </TabsTrigger>
              <TabsTrigger value="DONE" className="gap-1.5 px-3 text-xs">
                {t('নিষ্পন্ন', 'Decided')}
                <span className="text-slate-400">{n(items.length - pendingCount)}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <Section fill>
        <DataTable headers={[t('আপিল', 'Appeal'), t('আপিলকারী', 'Appellant'), t('নামজারি', 'Mutation'), t('অবস্থা', 'Status'), '']} alignRight={[4]}>
          {!loaded ? (
            <LoadingRows cols={5} />
          ) : rows.length === 0 ? (
            <EmptyRow cols={5} text={t('কোনো আপিল নেই', 'No appeals')} />
          ) : (
            rows.map((a) => (
              <tr key={a.id} className="cursor-pointer" onClick={() => setSelected(a)}>
                <td>
                  <div className="font-medium text-slate-900">{a.appeal_code || `#${n(a.id)}`}</div>
                  <div className="text-xs text-slate-500">{date(a.created_at)}</div>
                </td>
                <td>
                  <div className="text-slate-800">{a.appellant_name_bn || '—'}</div>
                  <div className="max-w-xs truncate text-xs text-slate-500">{a.reason_bn || ''}</div>
                </td>
                <td>
                  <div className="text-slate-800">{a.case_no || '—'}</div>
                  <div className="text-xs text-slate-500">
                    {t('দাগ', 'Plot')} {n(a.dag_no_bn || a.dag_no)}
                  </div>
                </td>
                <td>
                  <AppealStatus code={a.status} />
                </td>
                <td className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t('বিস্তারিত', 'Details')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(a);
                    }}
                  >
                    <Eye className="size-4 text-slate-500" />
                  </Button>
                </td>
              </tr>
            ))
          )}
        </DataTable>
      </Section>

      <DetailSheet
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected?.appeal_code || t('আপিল', 'Appeal')}
        subtitle={selected ? <AppealStatus code={selected.status} /> : undefined}
      >
        {selected && (
          <>
            <DetailList
              items={[
                [t('আপিলকারী', 'Appellant'), selected.appellant_name_bn || '—'],
                [t('নামজারি কেস', 'Mutation case'), selected.case_no || '—'],
                [t('দাগ', 'Plot'), n(selected.dag_no_bn || selected.dag_no)],
                [t('দাখিল', 'Filed'), date(selected.created_at)],
                !!selected.reviewer_username && [t('পর্যালোচক', 'Reviewer'), selected.reviewer_username],
                !!selected.decided_at && [t('সিদ্ধান্তের তারিখ', 'Decided on'), date(selected.decided_at)],
              ]}
            />
            {selected.reason_bn && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-500">{t('আপিলের কারণ', 'Grounds')}</div>
                <p className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">{selected.reason_bn}</p>
              </div>
            )}
            {selected.decision_note_bn && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-500">{t('সিদ্ধান্ত', 'Decision')}</div>
                <p className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">{selected.decision_note_bn}</p>
              </div>
            )}
          </>
        )}
      </DetailSheet>
    </AdminPage>
  );
};
