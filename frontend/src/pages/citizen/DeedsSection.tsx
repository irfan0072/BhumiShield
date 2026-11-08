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
  StatusBadge,
  StatusCode,
  inputCls,
} from '@/components/admin/kit';
import { TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Search, Eye, QrCode, RotateCw } from 'lucide-react';
import { CitizenSectionCommonProps, useCitizenFmt, deedTypeLabel } from './shared';

export const DeedsSection: React.FC<CitizenSectionCommonProps> = ({
  vault,
  loading,
  onRefreshAll,
  onNavigate,
}) => {
  const { t, fmtNum, fmtBdt, fmtDate, pick } = useCitizenFmt();
  const [search, setSearch] = useState('');
  const [selectedDeed, setSelectedDeed] = useState<any | null>(null);

  const deeds = vault.deeds || [];

  const filteredDeeds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return deeds;
    return deeds.filter(
      (d) =>
        String(d.deed_no || '').toLowerCase().includes(q) ||
        String(d.dag_no || '').toLowerCase().includes(q) ||
        String(d.dag_no_bn || '').toLowerCase().includes(q) ||
        String(d.mouza_bn || '').toLowerCase().includes(q) ||
        String(d.mouza_en || '').toLowerCase().includes(q) ||
        String(d.seller_name_bn || '').toLowerCase().includes(q) ||
        String(d.buyer_name_bn || '').toLowerCase().includes(q)
    );
  }, [deeds, search]);

  return (
    <AdminPage fill>
      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('দলিল নং বা দাগ খুঁজুন...', 'Search deed no or plot...')}
        actions={
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
        }
      />

      <Section
        title={`${t('নিবন্ধিত দলিল', 'Registered Deeds')} (${fmtNum(filteredDeeds.length)})`}
        fill
      >
        <DataTable
          headers={[
            t('দলিল নম্বর', 'Deed No'),
            t('দাগ ও মৌজা', 'Plot & Mouza'),
            t('ধরন', 'Type'),
            t('পরিমাণ ও মূল্য', 'Area & Price'),
            t('দেখুন', 'View'),
          ]}
          alignRight={[4]}
        >
          {loading ? (
            <LoadingRows cols={5} rows={4} />
          ) : filteredDeeds.length === 0 ? (
            <EmptyRow cols={5} text={t('কোনো দলিল পাওয়া যায়নি', 'No deeds found')} />
          ) : (
            filteredDeeds.map((deed, idx) => (
              <tr
                key={deed.id || idx}
                onClick={() => setSelectedDeed(deed)}
                className="cursor-pointer"
              >
                <td>
                  <span className="font-mono text-xs font-medium text-slate-700">{deed.deed_no}</span>
                </td>
                <td>
                  <div className="font-medium text-foreground">
                    {t('দাগ', 'Plot')} {fmtNum(deed.dag_no_bn || deed.dag_no)}
                  </div>
                  <div className="text-xs text-muted-foreground">{pick(deed, 'mouza')}</div>
                </td>
                <td>
                  <StatusBadge tone="blue">{deedTypeLabel(deed.deed_type, t)}</StatusBadge>
                </td>
                <td>
                  <div className="font-medium text-foreground tabular-nums">
                    {fmtNum(deed.area_decimal)} {t('শতক', 'dec')}
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {fmtBdt(deed.price_bdt)}
                  </div>
                </td>
                <td className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDeed(deed);
                    }}
                    className="h-7 px-2 text-xs"
                  >
                    <Eye className="size-3.5 mr-1" />
                    {t('দেখুন', 'View')}
                  </Button>
                </td>
              </tr>
            ))
          )}
        </DataTable>
      </Section>

      <DetailSheet
        open={Boolean(selectedDeed)}
        onOpenChange={(v) => {
          if (!v) setSelectedDeed(null);
        }}
        title={selectedDeed?.deed_no || t('দলিল বিবরণ', 'Deed Details')}
        subtitle={selectedDeed ? deedTypeLabel(selectedDeed.deed_type, t) : undefined}
        footer={
          selectedDeed ? (
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedDeed(null)}
                className="h-8 text-xs"
              >
                {t('বন্ধ করুন', 'Close')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const code = selectedDeed.deed_no;
                  setSelectedDeed(null);
                  onNavigate(`qr?code=${encodeURIComponent(code)}`);
                }}
                className="h-8 gap-1.5 text-xs"
              >
                <QrCode className="size-3.5" />
                {t('যাচাই করুন', 'Verify Deed')}
              </Button>
            </div>
          ) : undefined
        }
      >
        {selectedDeed && (
          <DetailList
            items={[
              [
                t('দলিল নম্বর', 'Deed Number'),
                <span className="font-mono text-xs">{selectedDeed.deed_no}</span>,
              ],
              [t('দলিলের ধরন', 'Deed Type'), deedTypeLabel(selectedDeed.deed_type, t)],
              [
                t('দাগ ও মৌজা', 'Plot & Mouza'),
                `${t('দাগ', 'Plot')} ${fmtNum(selectedDeed.dag_no_bn || selectedDeed.dag_no)} · ${pick(selectedDeed, 'mouza')}`,
              ],
              [
                t('জমির পরিমাণ', 'Land Area'),
                `${fmtNum(selectedDeed.area_decimal)} ${t('শতক', 'dec')}`,
              ],
              [t('দলিল মূল্য', 'Price'), fmtBdt(selectedDeed.price_bdt)],
              [t('বিক্রেতা / দাতা', 'Seller'), pick(selectedDeed, 'seller_name') || '—'],
              [t('ক্রেতা / গ্রহীতা', 'Buyer'), pick(selectedDeed, 'buyer_name') || '—'],
              [t('নিবন্ধনের তারিখ', 'Registration Date'), fmtDate(selectedDeed.created_at)],
              [
                t('অবস্থা', 'Status'),
                <StatusBadge tone="green">
                  {String(selectedDeed.status || 'MUTATED').toUpperCase() === 'MUTATED'
                    ? t('নামজারি সম্পন্ন', 'Mutated')
                    : t('নিবন্ধিত', 'Registered')}
                </StatusBadge>,
              ],
              [
                t('ডিজিটাল হ্যাশ', 'Content Hash'),
                <span className="font-mono text-xs break-all text-muted-foreground">
                  {selectedDeed.content_hash
                    ? `${String(selectedDeed.content_hash).slice(0, 24)}…`
                    : '—'}
                </span>,
              ],
            ]}
          />
        )}
      </DetailSheet>
    </AdminPage>
  );
};
export default DeedsSection;
