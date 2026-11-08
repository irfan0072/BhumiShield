import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import {
  AdminPage,
  PageToolbar,
  Section,
  DataTable,
  LoadingRows,
  EmptyRow,
  DetailList,
  Field,
  StatusBadge,
  StatusCode,
  notify,
  apiMessage,
  inputCls,
} from '@/components/admin/kit';
import { TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { CitizenDcrPorchaModal } from '@/components/CitizenDcrPorchaModal';
import {
  Plus,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  RotateCw,
} from 'lucide-react';
import {
  useCitizenFmt,
  deedTypeLabel,
  transferStageBadge,
  CITIZEN_TRANSFER_STEPS,
} from './citizen/shared';

export const ApplicationsPage: React.FC<{ onNavigate?: (tab: string) => void }> = ({
  onNavigate,
}) => {
  const { user } = useAppUI();
  const { t, lang, fmtNum, fmtBdt, fmtDate, pick } = useCitizenFmt();

  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [transfers, setTransfers] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected transfer in detail view
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState(
    () => new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]
  );

  // DCR & Porcha modal
  const [dcrModalOpen, setDcrModalOpen] = useState(false);
  const [dcrDefaultDoc, setDcrDefaultDoc] = useState<'DCR' | 'PORCHA'>('DCR');

  // Create Wizard State (3 compact steps: 1. জমি নির্বাচন, 2. দলিল ও মূল্য, 3. ক্রেতার তথ্য)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [selectedPlotId, setSelectedPlotId] = useState<string>('');
  const [deedType, setDeedType] = useState<string>('SALE');
  const [transferArea, setTransferArea] = useState<string>('5');
  const [proposedPrice, setProposedPrice] = useState<string>('1500000');
  const [buyerNid, setBuyerNid] = useState<string>('19922691042000202');
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerPhone, setBuyerPhone] = useState<string>('');
  const [buyerRelation, setBuyerRelation] = useState<string>('');
  const [notesBn, setNotesBn] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const loadTransferDetail = useCallback(
    async (codeOrId: string | number) => {
      try {
        const res = await BhumiApi.getTransfer(codeOrId);
        setSelectedTransfer(res);
        setView('detail');
      } catch (err: any) {
        notify.err(err, lang, t('হস্তান্তর তথ্য লোড করা যায়নি।', 'Failed to load transfer.'));
      }
    },
    [lang, t]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const isOperator = user?.role === 'service_point_operator';
      const [trRes, vaultRes] = await Promise.all([
        BhumiApi.listTransfers().catch(() => ({ items: [] })),
        isOperator
          ? BhumiApi.getPlots().catch(() => ({ items: [] }))
          : BhumiApi.getMyVault().catch(() => ({ owned_plots: [] })),
      ]);

      const trList = Array.isArray(trRes?.items) ? trRes.items : [];
      setTransfers(trList);

      const rawPlots = isOperator
        ? (vaultRes as any)?.items || []
        : (vaultRes as any)?.owned_plots || (vaultRes as any)?.plots || [];

      const seenPlotIds = new Set<number>();
      const normalizedPlots: any[] = [];
      for (const p of rawPlots) {
        const pid = Number(p.plot_id ?? p.id);
        if (!pid || seenPlotIds.has(pid)) continue;
        seenPlotIds.add(pid);
        normalizedPlots.push({
          plot_id: pid,
          dag_no: p.dag_no,
          dag_no_bn: p.dag_no_bn || p.dag_no,
          mouza_bn: p.mouza_bn || '',
          mouza_en: p.mouza_en || '',
          upazila_bn: p.upazila_bn || '',
          upazila_en: p.upazila_en || '',
          owner_area_decimal: Number(p.area_decimal ?? p.share_area_decimal ?? p.total_area_decimal ?? 10),
          owner_sale_locked: Boolean(p.owner_sale_locked),
          is_admin_frozen: Boolean(p.is_admin_frozen),
        });
      }
      setPlots(normalizedPlots);

      const params = new URLSearchParams(window.location.search);
      const prePlot = params.get('plot');
      const openNew = params.get('new') === '1';
      const openId = params.get('id');

      if (prePlot && normalizedPlots.some((p: any) => String(p.plot_id) === prePlot)) {
        setSelectedPlotId(prePlot);
      } else if (normalizedPlots.length > 0) {
        const firstUnlocked =
          normalizedPlots.find((p: any) => !p.owner_sale_locked && !p.is_admin_frozen) ||
          normalizedPlots[0];
        setSelectedPlotId(String(firstUnlocked.plot_id));
      }

      if (openId) {
        await loadTransferDetail(openId);
      } else if (openNew || prePlot) {
        setWizardStep(1);
        setView('create');
      }
    } finally {
      setLoading(false);
    }
  }, [user?.role, loadTransferDetail]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedPlotObj = useMemo(
    () => plots.find((p) => String(p.plot_id) === String(selectedPlotId)) || null,
    [plots, selectedPlotId]
  );

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlotId) {
      notify.err(null, lang, t('একটি জমি নির্বাচন করুন।', 'Select a plot.'));
      return;
    }
    if (selectedPlotObj?.owner_sale_locked) {
      notify.err(
        null,
        lang,
        t(
          'এই দাগে বিক্রয় লক চালু আছে। আবেদন করার আগে লক বন্ধ করুন।',
          'Plot sale lock is active. Unlock before applying.'
        )
      );
      return;
    }
    const areaNum = parseFloat(transferArea);
    const priceNum = parseInt(proposedPrice, 10);
    if (!Number.isFinite(areaNum) || areaNum <= 0) {
      notify.err(null, lang, t('জমির সঠিক পরিমাণ লিখুন।', 'Enter valid land area.'));
      return;
    }
    if (!buyerNid.trim()) {
      notify.err(null, lang, t('ক্রেতার এনআইডি নম্বর দিন।', 'Enter buyer NID.'));
      return;
    }

    setSubmitting(true);
    try {
      const created = await BhumiApi.createTransfer({
        plot_id: Number(selectedPlotId),
        deed_type: deedType,
        transfer_area_decimal: areaNum,
        proposed_price_bdt: Number.isFinite(priceNum) ? priceNum : 0,
        buyer_nid: buyerNid.trim(),
        buyer_name: buyerName.trim() || undefined,
        buyer_phone: buyerPhone.trim() || undefined,
        buyer_relation: buyerRelation.trim() || undefined,
        notes_bn: notesBn.trim() || undefined,
      });
      notify.ok(t('হস্তান্তর আবেদন সফলভাবে তৈরি হয়েছে।', 'Transfer application created.'));
      setSelectedTransfer(created);
      setView('detail');
      const refreshed = await BhumiApi.listTransfers().catch(() => ({ items: [] }));
      setTransfers(Array.isArray(refreshed?.items) ? refreshed.items : []);
    } catch (err: any) {
      notify.err(err, lang, t('আবেদন দাখিল করা যায়নি।', 'Failed to create transfer.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvanceStep = async (payload: Record<string, any> = {}) => {
    if (!selectedTransfer) return;
    const code =
      selectedTransfer.transfer_code || selectedTransfer.tracking_number || selectedTransfer.id;
    setAdvancing(true);
    try {
      const updated = await BhumiApi.advanceTransfer(code, payload);
      setSelectedTransfer(updated);
      notify.ok(t('ধাপ সফলভাবে সম্পন্ন হয়েছে।', 'Step completed.'));
      const refreshed = await BhumiApi.listTransfers().catch(() => ({ items: [] }));
      setTransfers(Array.isArray(refreshed?.items) ? refreshed.items : []);
    } catch (err: any) {
      notify.err(err, lang, t('ধাপ অগ্রসর করা যায়নি।', 'Could not advance step.'));
    } finally {
      setAdvancing(false);
    }
  };

  // Determine citizen's current step action in detail view
  const renderStepActionBar = () => {
    if (!selectedTransfer) return null;
    const step = Number(selectedTransfer.current_step || 1);
    const status = String(selectedTransfer.status || '').toUpperCase();
    const isCompleted = status === 'COMPLETED' || step >= 13;

    if (isCompleted) {
      return (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs">
          <div className="flex items-center gap-2 font-medium text-emerald-950">
            <CheckCircle2 className="size-4 text-[#006A4E] shrink-0" />
            <span>{t('জমি হস্তান্তর ও নামজারি সম্পন্ন হয়েছে।', 'Transfer & mutation completed.')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setDcrDefaultDoc('DCR');
                setDcrModalOpen(true);
              }}
              className="h-7 px-2.5 text-xs"
            >
              <Download className="size-3.5 mr-1" />
              {t('ডিসিআর রসিদ', 'DCR Receipt')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setDcrDefaultDoc('PORCHA');
                setDcrModalOpen(true);
              }}
              className="h-7 px-2.5 text-xs"
            >
              <Download className="size-3.5 mr-1" />
              {t('বিএস পর্চা', 'BS Porcha')}
            </Button>
          </div>
        </div>
      );
    }

    const stepMeta =
      CITIZEN_TRANSFER_STEPS.find((s) => s.step === step) || CITIZEN_TRANSFER_STEPS[0];

    const isBuyer = Boolean(
      selectedTransfer.viewer_is_buyer ||
        (selectedTransfer.parties || []).some(
          (p: any) => p.party_role === 'BUYER' && p.nid === user?.nid
        )
    );
    const isSeller = Boolean(
      (selectedTransfer.parties || []).some(
        (p: any) => p.party_role === 'SELLER' && p.nid === user?.nid
      ) ||
        selectedTransfer.seller_nid === user?.nid ||
        selectedTransfer.created_by_nid === user?.nid
    );

    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="size-4 text-amber-600 shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold text-foreground truncate">
              {t('বর্তমান ধাপ', 'Current Step')} {fmtNum(step)}/{fmtNum(13)} —{' '}
              {lang === 'bn' ? stepMeta.bn : stepMeta.en}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {step === 1 && isSeller && (
            <Button
              type="button"
              size="sm"
              disabled={advancing}
              onClick={() =>
                handleAdvanceStep({
                  notes_bn: 'বিক্রেতা কর্তৃক হস্তান্তর আবেদন নিশ্চিতকরণ।',
                })
              }
              className="h-8 text-xs"
            >
              {advancing ? t('অপেক্ষা করুন...', 'Saving...') : t('আবেদন নিশ্চিত করুন', 'Confirm Intent')}
            </Button>
          )}
          {step === 2 && isSeller && (
            <Button
              type="button"
              size="sm"
              disabled={advancing}
              onClick={() =>
                handleAdvanceStep({
                  notes_bn: 'উভয় পক্ষের তথ্য যাচাই ও অনুমোদন।',
                })
              }
              className="h-8 text-xs"
            >
              {advancing ? t('অপেক্ষা করুন...', 'Saving...') : t('তথ্য অনুমোদন করুন', 'Confirm Parties')}
            </Button>
          )}
          {step === 3 &&
            (isBuyer ? (
              <Button
                type="button"
                size="sm"
                disabled={advancing}
                onClick={() =>
                  handleAdvanceStep({
                    agreed_area_decimal: Number(selectedTransfer.transfer_area_decimal || 0),
                    agreed_price_bdt: Number(selectedTransfer.proposed_price_bdt || 0),
                    buyer_confirmed: true,
                  })
                }
                className="h-8 text-xs"
              >
                {advancing
                  ? t('অনুমোদন হচ্ছে...', 'Confirming...')
                  : t('শর্ত অনুমোদন করুন (ক্রেতা)', 'Confirm as Buyer')}
              </Button>
            ) : (
              <StatusBadge tone="amber">
                {t('ক্রেতার সম্মতির অপেক্ষায়', 'Waiting for Buyer')}
              </StatusBadge>
            ))}
          {step === 4 && (
            <Button
              type="button"
              size="sm"
              disabled={advancing}
              onClick={() => handleAdvanceStep()}
              className="h-8 text-xs"
            >
              {advancing ? t('যাচাই চলছে...', 'Checking...') : t('প্রি-চেক চালান', 'Run Pre-Check')}
            </Button>
          )}
          {step === 5 && (
            <Button
              type="button"
              size="sm"
              disabled={advancing}
              onClick={() => handleAdvanceStep({ consent_confirmed: true })}
              className="h-8 text-xs"
            >
              {advancing ? t('সংরক্ষণ...', 'Saving...') : t('সম্মতি নিশ্চিত করুন', 'Confirm Consent')}
            </Button>
          )}
          {step === 6 && (
            <Button
              type="button"
              size="sm"
              disabled={advancing}
              onClick={() => handleAdvanceStep()}
              className="h-8 text-xs"
            >
              {advancing ? t('প্রস্তুত হচ্ছে...', 'Saving...') : t('ফি পর্যালোচনা সম্পন্ন', 'Confirm Fees')}
            </Button>
          )}
          {step === 7 && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className={`${inputCls} w-36`}
              />
              <Button
                type="button"
                size="sm"
                disabled={advancing}
                onClick={() => handleAdvanceStep({ appointment_date: appointmentDate })}
                className="h-8 text-xs"
              >
                {t('তারিখ বুক করুন', 'Book Date')}
              </Button>
            </div>
          )}
          {step >= 8 && step <= 12 && (
            <StatusBadge tone="blue">
              {t('দাপ্তরিক প্রক্রিয়াধীন', 'Official Review in Progress')}
            </StatusBadge>
          )}
        </div>
      </div>
    );
  };

  return (
    <AdminPage fill>
      <PageToolbar
        filters={
          <div className="flex items-center gap-2">
            {view !== 'list' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setView('list')}
                className="h-8 gap-1.5 text-xs"
              >
                <ArrowLeft className="size-3.5" />
                {t('তালিকায় ফিরুন', 'Back to list')}
              </Button>
            )}
            <span className="text-sm font-semibold text-foreground">
              {view === 'create'
                ? t('নতুন জমি হস্তান্তর আবেদন', 'New Land Transfer')
                : view === 'detail'
                ? selectedTransfer?.transfer_code ||
                  selectedTransfer?.tracking_number ||
                  t('হস্তান্তর বিবরণ', 'Transfer Details')
                : t('জমি হস্তান্তর আবেদন', 'Land Transfers')}
            </span>
          </div>
        }
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="h-8 gap-1.5 text-xs"
            >
              <RotateCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              {t('রিফ্রেশ', 'Refresh')}
            </Button>
            {view !== 'create' && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setWizardStep(1);
                  setView('create');
                }}
                className="h-8 gap-1.5 text-xs"
              >
                <Plus className="size-3.5" />
                {t('নতুন হস্তান্তর', 'New Transfer')}
              </Button>
            )}
          </>
        }
      />

      {/* VIEW 1: COMPACT ONE-STEP-AT-A-TIME WIZARD */}
      {view === 'create' && (
        <Section
          title={`${t('ধাপ', 'Step')} ${fmtNum(wizardStep)}/${fmtNum(3)} — ${
            wizardStep === 1
              ? t('জমি নির্বাচন', 'Select Plot')
              : wizardStep === 2
              ? t('দলিলের ধরন ও মূল্য', 'Deed Type & Price')
              : t('ক্রেতার তথ্য', 'Buyer Information')
          }`}
          fill
          bodyClassName="p-4 flex flex-col justify-between overflow-y-auto"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4 max-w-xl">
            {/* Stepper Progress Pills */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { s: 1 as const, bn: '১. জমি নির্বাচন', en: '1. Select Plot' },
                { s: 2 as const, bn: '২. দলিল ও মূল্য', en: '2. Area & Price' },
                { s: 3 as const, bn: '৩. ক্রেতার তথ্য', en: '3. Buyer Info' },
              ].map((st) => (
                <button
                  key={st.s}
                  type="button"
                  onClick={() => setWizardStep(st.s)}
                  className={`h-8 px-2.5 rounded-md border text-xs font-medium text-left truncate transition-colors cursor-pointer ${
                    wizardStep === st.s
                      ? 'bg-[#006A4E] text-white border-[#006A4E]'
                      : wizardStep > st.s
                      ? 'bg-emerald-50 text-[#006A4E] border-emerald-200'
                      : 'bg-muted/40 text-muted-foreground border-border'
                  }`}
                >
                  {lang === 'bn' ? st.bn : st.en}
                </button>
              ))}
            </div>

            {wizardStep === 1 && (
              <div className="space-y-3 pt-1">
                <Field label={t('হস্তান্তরযোগ্য জমি নির্বাচন করুন', 'Select Plot')}>
                  <Select value={selectedPlotId} onValueChange={setSelectedPlotId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder={t('জমি নির্বাচন করুন', 'Select plot')} />
                    </SelectTrigger>
                    <SelectContent>
                      {plots.map((p) => (
                        <SelectItem key={p.plot_id} value={String(p.plot_id)} className="text-xs">
                          {t('দাগ', 'Plot')} {fmtNum(p.dag_no_bn || p.dag_no)} · {pick(p, 'mouza')} (
                          {fmtNum(p.owner_area_decimal)} {t('শতক', 'dec')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {selectedPlotObj && (
                  <DetailList
                    items={[
                      [
                        t('দাগ ও মৌজা', 'Plot & Mouza'),
                        `${t('দাগ', 'Plot')} ${fmtNum(selectedPlotObj.dag_no_bn || selectedPlotObj.dag_no)} · ${pick(selectedPlotObj, 'mouza')}`,
                      ],
                      [
                        t('আপনার অংশ', 'Available Area'),
                        `${fmtNum(selectedPlotObj.owner_area_decimal)} ${t('শতক', 'dec')}`,
                      ],
                      [
                        t('বিক্রয় লক অবস্থা', 'Sale Lock'),
                        selectedPlotObj.owner_sale_locked ? (
                          <StatusBadge tone="red">
                            {t('বিক্রয় লক চালু — আগে লক খুলুন', 'Locked — unlock first')}
                          </StatusBadge>
                        ) : (
                          <StatusBadge tone="green">{t('খোলা (হস্তান্তরযোগ্য)', 'Unlocked')}</StatusBadge>
                        ),
                      ],
                    ]}
                  />
                )}
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-3 pt-1">
                <Field label={t('দলিলের ধরন', 'Deed Type')}>
                  <Select value={deedType} onValueChange={setDeedType}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SALE" className="text-xs">
                        {t('বিক্রয় দলিল', 'Sale Deed')}
                      </SelectItem>
                      <SelectItem value="GIFT" className="text-xs">
                        {t('হেবা / দানপত্র', 'Gift Deed')}
                      </SelectItem>
                      <SelectItem value="HEIR" className="text-xs">
                        {t('ওয়ারিশ বণ্টন', 'Inheritance')}
                      </SelectItem>
                      <SelectItem value="MORTGAGE" className="text-xs">
                        {t('বন্ধক চুক্তি', 'Mortgage')}
                      </SelectItem>
                      <SelectItem value="EXCHANGE" className="text-xs">
                        {t('বিনিময় দলিল', 'Exchange')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    label={t('হস্তান্তর পরিমাণ (শতক)', 'Transfer Area (dec)')}
                    hint={
                      selectedPlotObj
                        ? `${t('সর্বোচ্চ', 'Max')}: ${fmtNum(selectedPlotObj.owner_area_decimal)} ${t('শতক', 'dec')}`
                        : undefined
                    }
                  >
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={selectedPlotObj?.owner_area_decimal || 1000}
                      value={transferArea}
                      onChange={(e) => setTransferArea(e.target.value)}
                      className={inputCls}
                      required
                    />
                  </Field>

                  <Field label={t('প্রস্তাবিত মূল্য (টাকা)', 'Proposed Price (BDT)')}>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={proposedPrice}
                      onChange={(e) => setProposedPrice(e.target.value)}
                      className={inputCls}
                      required
                    />
                  </Field>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-3 pt-1">
                <Field
                  label={t('ক্রেতার জাতীয় পরিচয়পত্র (NID)', 'Buyer National ID')}
                  hint={t('১০ বা ১৭ সংখ্যার যাচাইকৃত এনআইডি নম্বর', '10 or 17 digit verified NID')}
                >
                  <input
                    type="text"
                    value={buyerNid}
                    onChange={(e) => setBuyerNid(e.target.value)}
                    placeholder="19922691042000202"
                    className={inputCls}
                    required
                  />
                </Field>

                <Accordion type="single" collapsible className="border border-border rounded-md px-3">
                  <AccordionItem value="more" className="border-b-0">
                    <AccordionTrigger className="py-2.5 text-xs font-medium hover:no-underline">
                      {t('আরও তথ্য (ঐচ্ছিক)', 'More details (optional)')}
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pb-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label={t('ক্রেতার নাম', 'Buyer Name')}>
                          <input
                            type="text"
                            value={buyerName}
                            onChange={(e) => setBuyerName(e.target.value)}
                            className={inputCls}
                          />
                        </Field>
                        <Field label={t('ক্রেতার মোবাইল', 'Buyer Phone')}>
                          <input
                            type="tel"
                            value={buyerPhone}
                            onChange={(e) => setBuyerPhone(e.target.value)}
                            className={inputCls}
                          />
                        </Field>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label={t('সম্পর্ক', 'Relation')}>
                          <input
                            type="text"
                            value={buyerRelation}
                            onChange={(e) => setBuyerRelation(e.target.value)}
                            className={inputCls}
                          />
                        </Field>
                        <Field label={t('মন্তব্য', 'Notes')}>
                          <input
                            type="text"
                            value={notesBn}
                            onChange={(e) => setNotesBn(e.target.value)}
                            className={inputCls}
                          />
                        </Field>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}

            {/* Wizard Footer Back/Next/Submit */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (wizardStep === 1) setView('list');
                  else setWizardStep((s) => (s === 3 ? 2 : 1));
                }}
                className="h-8 gap-1.5 text-xs"
              >
                <ArrowLeft className="size-3.5" />
                {wizardStep === 1 ? t('বাতিল', 'Cancel') : t('পিছনে', 'Back')}
              </Button>

              {wizardStep < 3 ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={Boolean(wizardStep === 1 && selectedPlotObj?.owner_sale_locked)}
                  onClick={() => setWizardStep((s) => (s === 1 ? 2 : 3))}
                  className="h-8 gap-1.5 text-xs"
                >
                  {t('পরবর্তী ধাপ', 'Next')}
                  <ArrowRight className="size-3.5" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting || Boolean(selectedPlotObj?.owner_sale_locked)}
                  className="h-8 gap-1.5 text-xs"
                >
                  <CheckCircle2 className="size-3.5" />
                  {submitting
                    ? t('জমা হচ্ছে...', 'Submitting...')
                    : t('আবেদন জমা দিন', 'Submit Application')}
                </Button>
              )}
            </div>
          </form>
        </Section>
      )}

      {/* VIEW 2: TRANSFER DETAIL & 13-STEP TRACKER */}
      {view === 'detail' && selectedTransfer && (
        <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
          {renderStepActionBar()}

          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-5 flex flex-col min-h-0">
              <Section
                title={t('আবেদনের বিবরণ', 'Transfer Summary')}
                fill
                bodyClassName="p-3 overflow-y-auto"
              >
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
                    [t('অবস্থা', 'Stage'), transferStageBadge(selectedTransfer, t)],
                    [t('আবেদনের তারিখ', 'Created At'), fmtDate(selectedTransfer.created_at)],
                  ]}
                />
              </Section>
            </div>

            <div className="lg:col-span-7 flex flex-col min-h-0">
              <Section
                title={`${t('১৩টি ধাপের অগ্রগতি', '13-Step Progress')} (${fmtNum(selectedTransfer.current_step || 1)}/${fmtNum(13)})`}
                fill
                bodyClassName="p-3 overflow-y-auto"
              >
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
                        className={`px-3 py-2 flex items-center justify-between gap-2 text-xs ${
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
                          <StatusBadge tone="green">{t('সম্পন্ন', 'Done')}</StatusBadge>
                        ) : isCurrent ? (
                          <StatusBadge tone="amber">{t('চলমান', 'Current')}</StatusBadge>
                        ) : (
                          <span className="text-muted-foreground">{t('বাকি', 'Pending')}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: TRANSFERS LIST */}
      {view === 'list' && (
        <Section
          title={`${t('আমার হস্তান্তর আবেদন', 'My Transfers')} (${fmtNum(transfers.length)})`}
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
            ) : transfers.length === 0 ? (
              <EmptyRow
                cols={5}
                text={t('কোনো হস্তান্তর আবেদন পাওয়া যায়নি', 'No transfers found')}
              />
            ) : (
              transfers.map((tr) => {
                const code = tr.transfer_code || tr.tracking_number || `TR-${tr.id}`;
                const dag =
                  tr.dag_no_bn || tr.dag_no || tr.plot?.dag_no_bn || tr.plot?.dag_no || tr.plot_id;
                const mouza = tr.mouza_bn || tr.plot?.mouza_bn || '';
                const step = Math.min(13, Math.max(1, Number(tr.current_step || 1)));
                return (
                  <tr
                    key={tr.id || code}
                    onClick={() => loadTransferDetail(code)}
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
                          loadTransferDetail(code);
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
      )}

      <CitizenDcrPorchaModal
        isOpen={dcrModalOpen}
        onClose={() => setDcrModalOpen(false)}
        transfer={selectedTransfer}
        defaultDocType={dcrDefaultDoc}
        t={t}
        lang={lang}
      />
    </AdminPage>
  );
};

export default ApplicationsPage;
