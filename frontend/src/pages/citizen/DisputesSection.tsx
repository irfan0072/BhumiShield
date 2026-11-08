import React, { useState, useMemo, useEffect } from 'react';
import { BhumiApi } from '@/api/client';
import { useAppUI } from '@/i18n';
import {
  AdminPage,
  PageToolbar,
  Section,
  DataTable,
  LoadingRows,
  EmptyRow,
  DetailList,
  DetailSheet,
  FormDialog,
  Field,
  StatusBadge,
  notify,
  useCreateIntent,
} from '@/components/admin/kit';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Eye, RotateCw } from 'lucide-react';
import { CitizenSectionCommonProps, useCitizenFmt, textareaCls } from './shared';

export const DisputesSection: React.FC<
  CitizenSectionCommonProps & { autoOpenCreate?: boolean; onConsumedCreate?: () => void }
> = ({
  vault,
  loading,
  disputes,
  onRefreshAll,
  selectedPlotId,
  autoOpenCreate,
  onConsumedCreate,
}) => {
  const { user } = useAppUI();
  const { t, lang, fmtNum, fmtDate, pick } = useCitizenFmt();

  const [search, setSearch] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [plotId, setPlotId] = useState<string>(
    selectedPlotId ? String(selectedPlotId) : String(vault.owned_plots?.[0]?.plot_id || '')
  );
  const [disputeType, setDisputeType] = useState('OWNERSHIP_CLAIM');
  const [descriptionBn, setDescriptionBn] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useCreateIntent(() => setCreateOpen(true));

  useEffect(() => {
    if (selectedPlotId) {
      setPlotId(String(selectedPlotId));
    } else if (!plotId && vault.owned_plots?.[0]?.plot_id) {
      setPlotId(String(vault.owned_plots[0].plot_id));
    }
  }, [selectedPlotId, vault.owned_plots, plotId]);

  useEffect(() => {
    if (autoOpenCreate) {
      setCreateOpen(true);
      onConsumedCreate?.();
    }
  }, [autoOpenCreate, onConsumedCreate]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return disputes;
    return disputes.filter(
      (d) =>
        String(d.case_no || '').toLowerCase().includes(q) ||
        String(d.dag_no || d.dag_no_bn || '').toLowerCase().includes(q) ||
        String(d.mouza_bn || d.mouza_en || '').toLowerCase().includes(q) ||
        String(d.dispute_type || '').toLowerCase().includes(q)
    );
  }, [disputes, search]);

  const handleSubmitDispute = async () => {
    const pid = Number(plotId);
    if (!pid) {
      notify.err(null, lang, t('একটি জমি নির্বাচন করুন।', 'Please select a plot.'));
      return;
    }
    if (descriptionBn.trim().length < 5) {
      notify.err(null, lang, t('আপত্তির সংক্ষিপ্ত বিবরণ লিখুন।', 'Please enter a short description.'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await BhumiApi.fileDispute({
        plot_id: pid,
        dispute_type: disputeType,
        description_bn: descriptionBn.trim(),
        complainant_name_bn: user?.full_name_bn || 'নাগরিক',
        complainant_nid: user?.nid || '',
      });
      notify.ok(
        lang === 'bn'
          ? res?.message_bn || t('আপত্তি দাখিল সম্পন্ন হয়েছে।', 'Dispute filed.')
          : res?.message_en || t('আপত্তি দাখিল সম্পন্ন হয়েছে।', 'Dispute filed.')
      );
      setCreateOpen(false);
      setDescriptionBn('');
      onRefreshAll();
    } catch (err: any) {
      notify.err(err, lang, t('আপত্তি দাখিল করা যায়নি।', 'Failed to file dispute.'));
    } finally {
      setSubmitting(false);
    }
  };

  const disputeTypeLabel = (dt?: string) => {
    const k = String(dt || '').toUpperCase();
    if (k === 'OWNERSHIP_CLAIM') return t('মালিকানা দাবি', 'Ownership Claim');
    if (k === 'BOUNDARY_DISPUTE') return t('সীমানা বিরোধ', 'Boundary Dispute');
    if (k === 'FRAUD_OBJECTION') return t('জালিয়াতি আপত্তি', 'Fraud Objection');
    if (k === 'HEIR_OMISSION') return t('ওয়ারিশ বাদ পড়া', 'Heir Omission');
    return dt || t('মালিকানা দাবি', 'Ownership Claim');
  };

  const statusBadge = (status?: string) => {
    const s = String(status || 'OPEN').toUpperCase();
    if (s === 'RESOLVED') return <StatusBadge tone="green">{t('নিষ্পত্তি', 'Resolved')}</StatusBadge>;
    if (s === 'REJECTED') return <StatusBadge tone="slate">{t('খারিজ', 'Rejected')}</StatusBadge>;
    if (s === 'UPHELD_FROZEN')
      return <StatusBadge tone="red">{t('স্থগিতাদেশ', 'Frozen')}</StatusBadge>;
    return <StatusBadge tone="amber">{t('চলমান', 'Open')}</StatusBadge>;
  };

  const plots = vault.owned_plots || [];

  return (
    <AdminPage fill>
      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('কেস নং বা দাগ খুঁজুন...', 'Search case no or plot...')}
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
            {plots.length > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={() => setCreateOpen(true)}
                className="h-8 gap-1.5 text-xs"
              >
                <Plus className="size-3.5" />
                {t('আপত্তি দিন', 'File Dispute')}
              </Button>
            )}
          </>
        }
      />

      <Section
        title={`${t('আপত্তি ও বিরোধ তালিকা', 'Disputes')} (${fmtNum(filtered.length)})`}
        fill
      >
        <DataTable
          headers={[
            t('কেস নম্বর', 'Case No'),
            t('দাগ ও মৌজা', 'Plot & Mouza'),
            t('ধরন', 'Category'),
            t('অবস্থা', 'Status'),
            t('দেখুন', 'View'),
          ]}
          alignRight={[4]}
        >
          {loading ? (
            <LoadingRows cols={5} rows={4} />
          ) : filtered.length === 0 ? (
            <EmptyRow cols={5} text={t('কোনো আপত্তি পাওয়া যায়নি', 'No disputes found')} />
          ) : (
            filtered.map((d, idx) => (
              <tr
                key={d.id || idx}
                onClick={() => setSelectedDispute(d)}
                className="cursor-pointer"
              >
                <td>
                  <span className="font-mono text-xs font-medium text-slate-700">{d.case_no}</span>
                </td>
                <td>
                  <div className="font-medium text-foreground">
                    {t('দাগ', 'Plot')} {fmtNum(d.dag_no_bn || d.dag_no || d.plot_id)}
                  </div>
                  <div className="text-xs text-muted-foreground">{pick(d, 'mouza')}</div>
                </td>
                <td>{disputeTypeLabel(d.dispute_type)}</td>
                <td>{statusBadge(d.status)}</td>
                <td className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDispute(d);
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
        open={Boolean(selectedDispute)}
        onOpenChange={(v) => {
          if (!v) setSelectedDispute(null);
        }}
        title={selectedDispute?.case_no || t('আপত্তি বিবরণ', 'Dispute Details')}
        subtitle={selectedDispute ? disputeTypeLabel(selectedDispute.dispute_type) : undefined}
      >
        {selectedDispute && (
          <DetailList
            items={[
              [
                t('কেস নম্বর', 'Case Number'),
                <span className="font-mono text-xs">{selectedDispute.case_no}</span>,
              ],
              [
                t('দাগ ও মৌজা', 'Plot & Mouza'),
                `${t('দাগ', 'Plot')} ${fmtNum(
                  selectedDispute.dag_no_bn || selectedDispute.dag_no || selectedDispute.plot_id
                )} · ${pick(selectedDispute, 'mouza')}`,
              ],
              [
                t('আপত্তির ধরন', 'Category'),
                disputeTypeLabel(selectedDispute.dispute_type),
              ],
              [t('অবস্থা', 'Status'), statusBadge(selectedDispute.status)],
              [t('দাখিলের তারিখ', 'Filed Date'), fmtDate(selectedDispute.created_at)],
              [
                t('বিবরণ', 'Description'),
                selectedDispute.description_bn || selectedDispute.description_en || '—',
              ],
              selectedDispute.resolution_notes_bn
                ? [t('সিদ্ধান্তের আদেশ', 'Resolution Order'), selectedDispute.resolution_notes_bn]
                : null,
            ]}
          />
        )}
      </DetailSheet>

      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t('নতুন আপত্তি দাখিল', 'File New Dispute')}
        description={t(
          'এসি ল্যান্ড অফিসে শুনানির জন্য আপত্তি জমা হবে।',
          'Will be submitted to the AC Land office for hearing.'
        )}
        submitLabel={t('দাখিল করুন', 'Submit')}
        cancelLabel={t('বাতিল', 'Cancel')}
        busy={submitting}
        onSubmit={handleSubmitDispute}
      >
        <Field label={t('জমি নির্বাচন করুন', 'Select Plot')}>
          <Select value={plotId} onValueChange={setPlotId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={t('জমি নির্বাচন করুন', 'Select plot')} />
            </SelectTrigger>
            <SelectContent>
              {plots.map((p) => (
                <SelectItem key={p.plot_id} value={String(p.plot_id)} className="text-xs">
                  {t('দাগ', 'Plot')} {fmtNum(p.dag_no_bn || p.dag_no)} · {pick(p, 'mouza')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label={t('আপত্তির ধরন', 'Category')}>
          <Select value={disputeType} onValueChange={setDisputeType}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OWNERSHIP_CLAIM" className="text-xs">
                {t('মালিকানা দাবি', 'Ownership Claim')}
              </SelectItem>
              <SelectItem value="BOUNDARY_DISPUTE" className="text-xs">
                {t('সীমানা বিরোধ', 'Boundary Dispute')}
              </SelectItem>
              <SelectItem value="FRAUD_OBJECTION" className="text-xs">
                {t('জালিয়াতি আপত্তি', 'Fraud Objection')}
              </SelectItem>
              <SelectItem value="HEIR_OMISSION" className="text-xs">
                {t('ওয়ারিশ বাদ পড়া', 'Heir Omission')}
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label={t('বিবরণ', 'Description')}>
          <textarea
            value={descriptionBn}
            onChange={(e) => setDescriptionBn(e.target.value)}
            placeholder={t('সমস্যার সংক্ষিপ্ত বিবরণ লিখুন...', 'Describe the issue briefly...')}
            className={textareaCls}
            required
          />
        </Field>
      </FormDialog>
    </AdminPage>
  );
};
export default DisputesSection;
