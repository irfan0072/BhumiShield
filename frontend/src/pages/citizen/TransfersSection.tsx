import React, { useState, useMemo } from 'react';
import {
  AdminPage,
  PageToolbar,
  Section,
  DataTable,
  LoadingRows,
  EmptyRow,
  DetailList,
  DetailSheet,
  StatusCode,
  inputCls,
} from '@/components/admin/kit';
import { TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Search,
  Plus,
  Eye,
  ArrowRight,
  CheckCircle2,
  Clock,
  RotateCw,
} from 'lucide-react';
import {
  CitizenSectionCommonProps,
  useCitizenFmt,
  deedTypeLabel,
  transferStageBadge,
  CITIZEN_TRANSFER_STEPS,
} from './shared';

export const TransfersSection: React.FC<CitizenSectionCommonProps> = ({
  loading,
  transfers,
  onRefreshAll,
  onNavigate,
}) => {
  const { t, lang, fmtNum, fmtBdt, fmtDate } = useCitizenFmt();
  const [search, setSearch] = useState('');
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transfers;
    return transfers.filter((tr) => {
      const code = String(tr.transfer_code || tr.tracking_number || `TR-${tr.id}`).toLowerCase();
      const dag = String(tr.dag_no || tr.plot?.dag_no || tr.plot_id || '').toLowerCase();
      const mouza = String(tr.mouza_bn || tr.plot?.mouza_bn || '').toLowerCase();
      return code.includes(q) || dag.includes(q) || mouza.includes(q);
    });
  }, [transfers, search]);

  return (
    <AdminPage fill>
      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('ট্র্যাকিং কোড বা দাগ খুঁজুন...', 'Search code or plot...')}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefreshAll}
              disabled={loading}
              className="h-8 gap-1.5 text-xs"
            >
              <RotateCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              {t('রিফ্রেশ', 'Refresh')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onNavigate('applications?new=1')}
              className="h-8 gap-1.5 text-xs"
            >
              <Plus className="size-3.5" />
              {t('নতুন হস্তান্তর', 'New Transfer')}
            </Button>
          </>
        }
      />

      <Section
        title={`${t('জমি হস্তান্তর তালিকা', 'Land Transfers')} (${fmtNum(filtered.length)})`}
        fill
      >
        <DataTable
          headers={[
            t('ট্র্যাকিং কোড', 'Tracking Code'),
            t('দাগ ও মৌজা', 'Plot & Mouza'),
            t('পরিমাণ ও মূল্য', 'Area & Price'),
            t('অগ্রগতি', 'Progress'),
            t('দেখুন', 'View'),
          ]}
          alignRight={[4]}
        >
          {loading ? (
            <LoadingRows cols={5} rows={4} />
          ) : filtered.length === 0 ? (
            <EmptyRow
              cols={5}
              text={t('কোনো হস্তান্তর আবেদন পাওয়া যায়নি', 'No transfers found')}
            />
          ) : (
            filtered.map((tr) => {
              const code = tr.transfer_code || tr.tracking_number || `TR-${tr.id}`;
              const dag = tr.dag_no_bn || tr.dag_no || tr.plot?.dag_no_bn || tr.plot?.dag_no || tr.plot_id;
              const mouza = tr.mouza_bn || tr.plot?.mouza_bn || tr.plot?.mouza_en || '';
              const step = Math.min(13, Math.max(1, Number(tr.current_step || 1)));

              return (
                <tr
                  key={tr.id || code}
                  onClick={() => setSelectedTransfer(tr)}
                  className="cursor-pointer"
                >
                  <td>
                    <span className="font-mono text-xs font-medium text-slate-700">{code}</span>
                  </td>
                  <td>
                    <div className="font-medium text-foreground">
                      {t('দাগ', 'Plot')} {fmtNum(dag)}
                    </div>
                    <div className="text-xs text-muted-foreground">{mouza}</div>
                  </td>
                  <td>
                    <div className="font-medium text-foreground tabular-nums">
                      {fmtNum(tr.transfer_area_decimal)} {t('শতক', 'dec')}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {fmtBdt(tr.proposed_price_bdt)}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {transferStageBadge(tr, t)}
                      <span className="text-xs text-muted-foreground font-mono tabular-nums">
                        {fmtNum(step)}/{fmtNum(13)}
                      </span>
                    </div>
                  </td>
                  <td className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTransfer(tr);
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      <Eye className="size-3.5 mr-1" />
                      {t('দেখুন', 'View')}
                    </Button>
                  </td>
                </tr>
              );
            })
          )}
        </DataTable>
      </Section>

      <DetailSheet
        open={Boolean(selectedTransfer)}
        onOpenChange={(v) => {
          if (!v) setSelectedTransfer(null);
        }}
        title={
          selectedTransfer
            ? selectedTransfer.transfer_code ||
              selectedTransfer.tracking_number ||
              `TR-${selectedTransfer.id}`
            : t('হস্তান্তর বিবরণ', 'Transfer Details')
        }
        subtitle={
          selectedTransfer
            ? `${deedTypeLabel(selectedTransfer.deed_type, t)} · ${t('ধাপ', 'Step')} ${fmtNum(selectedTransfer.current_step || 1)}/${fmtNum(13)}`
            : undefined
        }
        footer={
          selectedTransfer ? (
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedTransfer(null)}
                className="h-8 text-xs"
              >
                {t('বন্ধ করুন', 'Close')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const code =
                    selectedTransfer.transfer_code ||
                    selectedTransfer.tracking_number ||
                    selectedTransfer.id;
                  setSelectedTransfer(null);
                  onNavigate(`applications?id=${encodeURIComponent(String(code))}`);
                }}
                className="h-8 gap-1.5 text-xs"
              >
                <span>{t('ধাপ ও কার্যক্রম খুলুন', 'Open Step Tracker')}</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          ) : undefined
        }
      >
        {selectedTransfer && (
          <div className="space-y-4">
            <DetailList
              items={[
                [
                  t('ট্র্যাকিং কোড', 'Tracking Code'),
                  <span className="font-mono text-xs">
                    {selectedTransfer.transfer_code ||
                      selectedTransfer.tracking_number ||
                      `TR-${selectedTransfer.id}`}
                  </span>,
                ],
                [
                  t('দাগ ও মৌজা', 'Plot & Mouza'),
                  `${t('দাগ', 'Plot')} ${fmtNum(
                    selectedTransfer.dag_no_bn ||
                      selectedTransfer.dag_no ||
                      selectedTransfer.plot?.dag_no_bn ||
                      selectedTransfer.plot?.dag_no ||
                      selectedTransfer.plot_id
                  )} · ${selectedTransfer.mouza_bn || selectedTransfer.plot?.mouza_bn || ''}`,
                ],
                [
                  t('দলিলের ধরন', 'Deed Type'),
                  deedTypeLabel(selectedTransfer.deed_type, t),
                ],
                [
                  t('হস্তান্তর পরিমাণ', 'Transfer Area'),
                  `${fmtNum(selectedTransfer.transfer_area_decimal)} ${t('শতক', 'dec')}`,
                ],
                [
                  t('প্রস্তাবিত মূল্য', 'Proposed Price'),
                  fmtBdt(selectedTransfer.proposed_price_bdt),
                ],
                [
                  t('বর্তমান অবস্থা', 'Current Stage'),
                  transferStageBadge(selectedTransfer, t),
                ],
                [
                  t('আবেদনের তারিখ', 'Created At'),
                  fmtDate(selectedTransfer.created_at),
                ],
              ]}
            />

            {/* 13-Step Progress List */}
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-foreground">
                {t('১৩টি ধাপের অগ্রগতি', '13-Step Progress')} (
                {fmtNum(selectedTransfer.current_step || 1)}/{fmtNum(13)})
              </div>
              <div className="rounded-md border border-border divide-y divide-border/60">
                {CITIZEN_TRANSFER_STEPS.map((st) => {
                  const cur = Number(selectedTransfer.current_step || 1);
                  const isDone =
                    String(selectedTransfer.status || '').toUpperCase() === 'COMPLETED' ||
                    cur > st.step;
                  const isCurrent = !isDone && cur === st.step;

                  return (
                    <div
                      key={st.step}
                      className={`px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs ${
                        isCurrent ? 'bg-primary/5 font-semibold text-primary' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-muted-foreground w-5 shrink-0">
                          {fmtNum(st.step)}.
                        </span>
                        <span className="truncate">{lang === 'bn' ? st.bn : st.en}</span>
                      </div>
                      {isDone ? (
                        <CheckCircle2 className="size-3.5 text-[#006A4E] shrink-0" />
                      ) : isCurrent ? (
                        <Clock className="size-3.5 text-amber-600 shrink-0" />
                      ) : (
                        <span className="text-muted-foreground shrink-0">
                          {t('বাকি', 'Pending')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </DetailSheet>
    </AdminPage>
  );
};
export default TransfersSection;
