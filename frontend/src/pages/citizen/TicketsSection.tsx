import React, { useState, useMemo, useEffect } from 'react';
import { BhumiApi } from '@/api/client';
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
  inputCls,
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
import { Plus, Eye, Send, RotateCw } from 'lucide-react';
import { CitizenSectionCommonProps, useCitizenFmt, textareaCls } from './shared';

export const TicketsSection: React.FC<
  CitizenSectionCommonProps & { autoOpenCreate?: boolean; onConsumedCreate?: () => void }
> = ({ loading, tickets, onRefreshAll, autoOpenCreate, onConsumedCreate }) => {
  const { t, lang, fmtNum, fmtDate } = useCitizenFmt();

  const [search, setSearch] = useState('');
  const [selectedTicketBundle, setSelectedTicketBundle] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create Ticket FormDialog
  const [createOpen, setCreateOpen] = useState(false);
  const [category, setCategory] = useState('GENERAL');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reply box inside DetailSheet
  const [replyText, setReplyText] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);

  useCreateIntent(() => setCreateOpen(true));

  useEffect(() => {
    if (autoOpenCreate) {
      setCreateOpen(true);
      onConsumedCreate?.();
    }
  }, [autoOpenCreate, onConsumedCreate]);

  // Preserve ?map_plot_id=&map_dag=&map_location= prefill from map pages
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const mapPlotId = params.get('map_plot_id');
    const mapDag = params.get('map_dag');
    const mapLoc = params.get('map_location');
    if (mapPlotId || mapDag) {
      setCategory('RECORD_CORRECTION');
      setSubject(
        lang === 'bn'
          ? `ম্যাপ সংশোধনী অনুরোধ: দাগ নং ${mapDag || mapPlotId}`
          : `Map Correction Request: Dag ${mapDag || mapPlotId}`
      );
      setMessage(
        lang === 'bn'
          ? `মৌজা আইডি ${mapLoc || '-'}, দাগ নং ${mapDag || mapPlotId} এর ম্যাপ বা খতিয়ান তথ্যে সংশোধন প্রয়োজন।`
          : `Correction requested for Mouza ${mapLoc || '-'}, Dag ${mapDag || mapPlotId}.`
      );
      setCreateOpen(true);
      params.delete('map_plot_id');
      params.delete('map_dag');
      params.delete('map_location');
      const qs = params.toString();
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${qs ? `?${qs}` : ''}`
      );
    }
  }, [lang]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(
      (tk) =>
        String(tk.ticket_code || '').toLowerCase().includes(q) ||
        String(tk.title_bn || tk.title_en || '').toLowerCase().includes(q) ||
        String(tk.category || '').toLowerCase().includes(q)
    );
  }, [tickets, search]);

  const openTicketDetail = async (tk: any) => {
    const code = tk.ticket_code || tk.id;
    setSelectedTicketBundle({ ticket: tk, messages: [] });
    setDetailLoading(true);
    try {
      const full = await BhumiApi.getTicket(code);
      setSelectedTicketBundle(full);
    } catch {
      setSelectedTicketBundle({ ticket: tk, messages: [] });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    if (subject.trim().length < 3 || message.trim().length < 10) {
      notify.err(
        null,
        lang,
        t(
          'বিষয় (অন্তত ৩ অক্ষর) এবং বিস্তারিত বিবরণ (অন্তত ১০ অক্ষর) লিখুন।',
          'Enter a subject (3+ chars) and description (10+ chars).'
        )
      );
      return;
    }
    setSubmitting(true);
    try {
      await BhumiApi.createTicket({
        title: subject.trim(),
        message: message.trim(),
        category,
      });
      notify.ok(t('আপনার অভিযোগ সফলভাবে জমা হয়েছে।', 'Ticket submitted successfully.'));
      setCreateOpen(false);
      setSubject('');
      setMessage('');
      onRefreshAll();
    } catch (err: any) {
      notify.err(err, lang, t('অভিযোগ জমা দেওয়া যায়নি।', 'Failed to submit ticket.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tk = selectedTicketBundle?.ticket;
    if (!tk || replyText.trim().length < 2) return;
    const code = tk.ticket_code || tk.id;
    setReplyBusy(true);
    try {
      const updated = await BhumiApi.replyTicket(code, { message: replyText.trim() });
      setReplyText('');
      setSelectedTicketBundle(updated);
      notify.ok(t('বার্তা পাঠানো হয়েছে।', 'Reply sent.'));
      onRefreshAll();
    } catch (err: any) {
      notify.err(err, lang, t('বার্তা পাঠানো যায়নি।', 'Failed to send reply.'));
    } finally {
      setReplyBusy(false);
    }
  };

  const ticketStatusBadge = (status?: string) => {
    const s = String(status || 'NEW').toUpperCase();
    if (s === 'RESOLVED' || s === 'CLOSED')
      return <StatusBadge tone="green">{t('সমাধানকৃত', 'Resolved')}</StatusBadge>;
    if (s === 'WAITING_CITIZEN')
      return <StatusBadge tone="amber">{t('আপনার উত্তর প্রয়োজন', 'Reply Needed')}</StatusBadge>;
    if (s === 'IN_PROGRESS')
      return <StatusBadge tone="blue">{t('চলমান', 'In Progress')}</StatusBadge>;
    return <StatusBadge tone="blue">{t('নতুন', 'New')}</StatusBadge>;
  };

  const categoryLabel = (cat?: string) => {
    const c = String(cat || 'GENERAL').toUpperCase();
    if (c === 'MUTATION' || c === 'OWNERSHIP_MUTATION') return t('নামজারি', 'Mutation');
    if (c === 'RECORD_CORRECTION' || c === 'KHATIAN_CORRECTION')
      return t('রেকর্ড সংশোধন', 'Record Correction');
    if (c === 'MISSING_DOCUMENT' || c === 'CERTIFIED_COPY')
      return t('কাগজপত্রের কপি', 'Document Copy');
    if (c === 'LAND_CLAIM') return t('জমি দাবি', 'Land Claim');
    return t('সাধারণ সহায়তা', 'General Help');
  };

  const tkObj = selectedTicketBundle?.ticket;
  const messages: any[] = selectedTicketBundle?.messages || [];

  return (
    <AdminPage fill>
      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('টিকেট কোড বা বিষয় খুঁজুন...', 'Search ticket code or subject...')}
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
              onClick={() => setCreateOpen(true)}
              className="h-8 gap-1.5 text-xs"
            >
              <Plus className="size-3.5" />
              {t('নতুন অভিযোগ', 'New Ticket')}
            </Button>
          </>
        }
      />

      <Section
        title={`${t('অভিযোগ ও সাহায্য (১৬১২২)', 'Support Tickets')} (${fmtNum(filtered.length)})`}
        fill
      >
        <DataTable
          headers={[
            t('টিকেট কোড', 'Ticket Code'),
            t('বিষয়', 'Subject'),
            t('ধরন', 'Category'),
            t('অবস্থা', 'Status'),
            t('দেখুন', 'View'),
          ]}
          alignRight={[4]}
        >
          {loading ? (
            <LoadingRows cols={5} rows={4} />
          ) : filtered.length === 0 ? (
            <EmptyRow cols={5} text={t('কোনো টিকেট পাওয়া যায়নি', 'No tickets found')} />
          ) : (
            filtered.map((tk, idx) => (
              <tr
                key={tk.id || tk.ticket_code || idx}
                onClick={() => openTicketDetail(tk)}
                className="cursor-pointer"
              >
                <td>
                  <span className="font-mono text-xs font-medium text-slate-700">
                    {tk.ticket_code}
                  </span>
                </td>
                <td>
                  <div className="font-medium text-foreground truncate max-w-[240px]">
                    {lang === 'bn' ? tk.title_bn || tk.title_en : tk.title_en || tk.title_bn}
                  </div>
                  <div className="text-xs text-muted-foreground">{fmtDate(tk.created_at)}</div>
                </td>
                <td>{categoryLabel(tk.category)}</td>
                <td>{ticketStatusBadge(tk.status)}</td>
                <td className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openTicketDetail(tk);
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

      {/* Ticket Detail & Message Thread Sheet */}
      <DetailSheet
        open={Boolean(selectedTicketBundle)}
        onOpenChange={(v) => {
          if (!v) setSelectedTicketBundle(null);
        }}
        title={tkObj?.ticket_code || t('টিকেট বিবরণ', 'Ticket Details')}
        subtitle={
          tkObj
            ? lang === 'bn'
              ? tkObj.title_bn || tkObj.title_en
              : tkObj.title_en || tkObj.title_bn
            : undefined
        }
        footer={
          tkObj ? (
            <form onSubmit={handleReplySubmit} className="flex w-full items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t('উত্তর লিখুন...', 'Write a reply...')}
                className={`${inputCls} flex-1`}
                required
              />
              <Button
                type="submit"
                size="sm"
                disabled={replyBusy || replyText.trim().length < 2}
                className="h-8 gap-1.5 text-xs shrink-0"
              >
                <Send className="size-3.5" />
                {replyBusy ? t('পাঠানো হচ্ছে...', 'Sending...') : t('পাঠান', 'Send')}
              </Button>
            </form>
          ) : undefined
        }
      >
        {tkObj && (
          <div className="space-y-4">
            <DetailList
              items={[
                [
                  t('টিকেট কোড', 'Ticket Code'),
                  <span className="font-mono text-xs">{tkObj.ticket_code}</span>,
                ],
                [t('ধরন', 'Category'), categoryLabel(tkObj.category)],
                [t('অবস্থা', 'Status'), ticketStatusBadge(tkObj.status)],
                [t('দাখিলের তারিখ', 'Created At'), fmtDate(tkObj.created_at)],
                [
                  t('প্রাথমিক বিবরণ', 'Initial Description'),
                  tkObj.description_bn || tkObj.description_en || '—',
                ],
              ]}
            />

            <div className="space-y-2">
              <div className="text-xs font-semibold text-foreground">
                {t('বার্তাসমূহ', 'Messages')}
              </div>
              {detailLoading ? (
                <div className="text-xs text-muted-foreground py-4 text-center">
                  {t('লোড হচ্ছে...', 'Loading...')}
                </div>
              ) : messages.length === 0 ? (
                <div className="text-xs text-muted-foreground py-4 text-center rounded-md border border-dashed border-border">
                  {t('এখনও কোনো উত্তর আসেনি।', 'No replies yet.')}
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((m, idx) => {
                    const isStaff = m.sender_role !== 'citizen';
                    return (
                      <div
                        key={m.id || idx}
                        className={`rounded-md border p-2.5 text-xs space-y-1 ${
                          isStaff
                            ? 'border-emerald-200 bg-emerald-50/70'
                            : 'border-border bg-card'
                        }`}
                      >
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {isStaff
                              ? t('সাপোর্ট কর্মকর্তা', 'Support Officer')
                              : t('আপনি', 'You')}
                          </span>
                          <span>{fmtDate(m.created_at)}</span>
                        </div>
                        <p className="text-foreground whitespace-pre-wrap">
                          {m.message_bn || m.message_en}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </DetailSheet>

      {/* New Ticket FormDialog */}
      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t('নতুন অভিযোগ বা সাহায্য', 'New Support Ticket')}
        description={t(
          '১৬১২২ হেল্পডেস্ক কর্মকর্তাদের কাছে বার্তা পাঠান।',
          'Send a request to 16122 support officers.'
        )}
        submitLabel={t('জমা দিন', 'Submit')}
        cancelLabel={t('বাতিল', 'Cancel')}
        busy={submitting}
        onSubmit={handleCreateTicket}
      >
        <Field label={t('বিষয়ের ধরন', 'Category')}>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GENERAL" className="text-xs">
                {t('সাধারণ সহায়তা', 'General Help')}
              </SelectItem>
              <SelectItem value="MUTATION" className="text-xs">
                {t('নামজারি সংক্রান্ত', 'Mutation Inquiry')}
              </SelectItem>
              <SelectItem value="RECORD_CORRECTION" className="text-xs">
                {t('খতিয়ান বা দাগ সংশোধন', 'Record Correction')}
              </SelectItem>
              <SelectItem value="CERTIFIED_COPY" className="text-xs">
                {t('সার্টিফাইড কপির আবেদন', 'Certified Copy Request')}
              </SelectItem>
              <SelectItem value="LAND_CLAIM" className="text-xs">
                {t('জমি দাবি ও সংযুক্তি', 'Land Claim')}
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label={t('বিষয়', 'Subject')}>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('সংক্ষেপে বিষয় লিখুন...', 'Enter short subject...')}
            className={inputCls}
            required
          />
        </Field>

        <Field
          label={t('বিস্তারিত বিবরণ', 'Description')}
          hint={t('কমপক্ষে ১০ অক্ষর লিখুন', 'Minimum 10 characters')}
        >
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('সমস্যার বিস্তারিত লিখুন...', 'Describe the issue...')}
            className={textareaCls}
            required
          />
        </Field>
      </FormDialog>
    </AdminPage>
  );
};
export default TicketsSection;
