import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Search, ShieldCheck } from 'lucide-react';
import { BhumiApi, LawyerVerificationResult, LawyerCaseDocketResponse, LawyerCasePayload } from '../api/client';
import { AddressCascader, AddressSelection } from '../components/AddressCascader';
import { toBanglaDigits, maskPhone } from '../theme/tokens';
import { useAppUI } from '../i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminPage, DetailList, Field, inputCls, notify, apiMessage } from '@/components/admin/kit';
import { LawyerChamberDashboard } from '@/components/officials/LawyerChamberDashboard';
import { CASE_STAGES, DISPUTE_TYPES, STEP_IDS, WizardStep, optLabel } from './lawyer/constants';
import { BlockedNotice, Hint, WizardCard, WizardStepper } from './lawyer/WizardCard';
import { DocketResult, PrintableDocket } from './lawyer/DocketResult';

export interface LawyerCaseFilingPageProps {
  currentSubPage?: string;
  onNavigateSubPage?: (page: string) => void;
  onNavigateHome?: () => void;
}

const stepFromId = (id?: string | null): WizardStep | null =>
  id === 'step1' ? 1 : id === 'step2' ? 2 : id === 'step3' ? 3 : null;

const DEFAULT_ADDRESS: AddressSelection = {
  division_bn: 'ঢাকা',
  division_en: 'Dhaka',
  district_bn: 'ঢাকা',
  district_en: 'Dhaka',
  upazila_bn: 'সাভার',
  upazila_en: 'Savar',
  mouza_id: 1,
  mouza_bn: 'বিরুলিয়া',
  mouza_en: 'Birulia',
  jl_no: '০৫',
};

export const LawyerCaseFilingPage: React.FC<LawyerCaseFilingPageProps> = ({
  currentSubPage,
  onNavigateSubPage,
}) => {
  const { t, lang, activeSubTab, setActiveSubTab } = useAppUI();

  // The shell owns the sub-page (overview / step1 / step2 / step3); the wizard step follows it.
  const subPage = currentSubPage || activeSubTab || 'overview';
  const step = stepFromId(subPage);
  const go = (id: string) => {
    if (onNavigateSubPage) onNavigateSubPage(id);
    else setActiveSubTab(id);
  };
  const goStep = (s: WizardStep) => go(STEP_IDS[s]);

  // --- Step 1: licence ---
  const [barCouncilNo, setBarCouncilNo] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifiedLawyer, setVerifiedLawyer] = useState<LawyerVerificationResult['lawyer'] | null>(null);

  // --- Step 2: plot & suit ---
  const [address, setAddress] = useState<AddressSelection>(DEFAULT_ADDRESS);
  const [availablePlots, setAvailablePlots] = useState<any[]>([]);
  const [plotsLoading, setPlotsLoading] = useState(false);
  const [selectedPlotId, setSelectedPlotId] = useState<number | null>(null);
  const [courtName, setCourtName] = useState('');
  const [suitNo, setSuitNo] = useState('');
  const [disputeType, setDisputeType] = useState('INJUNCTION');
  const [caseStage, setCaseStage] = useState('STATUS_QUO_ISSUED');
  const [plaintiffName, setPlaintiffName] = useState('');
  const [plaintiffNid, setPlaintiffNid] = useState('');
  const [defendantName, setDefendantName] = useState('');
  const [disputedArea, setDisputedArea] = useState('');
  const [boundaryNorth, setBoundaryNorth] = useState('');
  const [boundarySouth, setBoundarySouth] = useState('');
  const [boundaryEast, setBoundaryEast] = useState('');
  const [boundaryWest, setBoundaryWest] = useState('');

  // --- Step 3: petition ---
  const [descriptionBn, setDescriptionBn] = useState('');
  const [affidavitAgreed, setAffidavitAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [docketResponse, setDocketResponse] = useState<LawyerCaseDocketResponse | null>(null);

  const selectedPlot = availablePlots.find((p) => p.id === selectedPlotId) || null;

  // Load the plots of the chosen mouza. The user must pick the plot explicitly.
  useEffect(() => {
    let alive = true;
    setPlotsLoading(true);
    setSelectedPlotId(null);
    BhumiApi.getPlots(address.mouza_id ? Number(address.mouza_id) : undefined)
      .then((plots) => {
        if (alive) setAvailablePlots(plots || []);
      })
      .catch((err) => {
        if (alive) {
          setAvailablePlots([]);
          notify.err(err, lang, t('দাগ তালিকা আনা যায়নি', 'Could not load plots'));
        }
      })
      .finally(() => {
        if (alive) setPlotsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [address.mouza_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlotSelect = (id: number) => {
    setSelectedPlotId(id);
    const p = availablePlots.find((it) => it.id === id);
    if (p?.total_area_decimal != null) setDisputedArea(String(p.total_area_decimal));
  };

  const handleVerifyLawyer = async () => {
    const no = barCouncilNo.trim().toUpperCase();
    if (!no) {
      notify.err(null, lang, t('সনদ নম্বর লিখুন', 'Enter licence number'));
      return;
    }
    setVerifyLoading(true);
    setVerifiedLawyer(null);
    try {
      const res = await BhumiApi.verifyLawyer(no);
      if (res.verified && res.lawyer) {
        setVerifiedLawyer(res.lawyer);
        setBarCouncilNo(res.lawyer.bar_council_no);
        notify.ok(t('সনদ যাচাই হয়েছে', 'Licence verified'));
      } else {
        notify.err(res, lang, t('সনদ যাচাই হয়নি', 'Licence not verified'));
      }
    } catch (err) {
      notify.err(err, lang, t('সনদ যাচাই হয়নি', 'Licence not verified'));
    } finally {
      setVerifyLoading(false);
    }
  };

  const step2Ready =
    !!selectedPlotId && !!courtName.trim() && !!suitNo.trim() && !!plaintiffName.trim() && !!defendantName.trim();
  const step3Ready = !!descriptionBn.trim() && affidavitAgreed;

  const handleSubmitCase = async () => {
    if (!verifiedLawyer) return goStep(1);
    if (!step2Ready || !selectedPlotId) return goStep(2);
    if (!step3Ready) return;
    setSubmitting(true);
    try {
      const area = parseFloat(disputedArea);
      const opt = (v: string) => v.trim() || undefined;
      const payload: LawyerCasePayload = {
        bar_council_no: verifiedLawyer.bar_council_no,
        plot_id: selectedPlotId,
        court_name: courtName.trim(),
        suit_no: suitNo.trim(),
        dispute_type: disputeType,
        case_stage: caseStage,
        plaintiff_name: plaintiffName.trim(),
        defendant_name: defendantName.trim(),
        plaintiff_nid: opt(plaintiffNid),
        disputed_area_decimal: Number.isFinite(area) && area > 0 ? area : undefined,
        description_bn: descriptionBn.trim(),
        boundary_north: opt(boundaryNorth),
        boundary_south: opt(boundarySouth),
        boundary_east: opt(boundaryEast),
        boundary_west: opt(boundaryWest),
      };
      const res = await BhumiApi.fileLawyerCase(payload);
      setDocketResponse(res);
      notify.ok(apiMessage(res, lang, t('মামলা দাখিল হয়েছে', 'Case filed')));
    } catch (err) {
      notify.err(err, lang, t('মামলা দাখিল হয়নি', 'Could not file the case'));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setDocketResponse(null);
    setSelectedPlotId(null);
    setCourtName('');
    setSuitNo('');
    setDisputeType('INJUNCTION');
    setCaseStage('STATUS_QUO_ISSUED');
    setPlaintiffName('');
    setPlaintiffNid('');
    setDefendantName('');
    setDisputedArea('');
    setBoundaryNorth('');
    setBoundarySouth('');
    setBoundaryEast('');
    setBoundaryWest('');
    setDescriptionBn('');
    setAffidavitAgreed(false);
  };

  // ---------------------------------------------------------------- overview
  if (!step) {
    return (
      <div className="h-full min-h-0">
        <LawyerChamberDashboard
          onNavigateTab={(tab) => {
            if (tab === 'step1' && docketResponse) resetForm();
            go(tab);
          }}
          barCouncilNo={verifiedLawyer?.bar_council_no}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------- wizard
  const canOpen = (s: WizardStep) => s === 1 || (s === 2 ? !!verifiedLawyer : !!verifiedLawyer && step2Ready);
  const stepper = (
    <WizardStepper
      step={step}
      done={{ 1: !!verifiedLawyer, 2: step2Ready, 3: !!docketResponse }}
      canOpen={canOpen}
      onSelect={goStep}
    />
  );
  const backBtn = (to: WizardStep) => (
    <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => goStep(to)}>
      <ArrowLeft className="size-4" />
      {t('পেছনে', 'Back')}
    </Button>
  );
  const nextBtn = (to: WizardStep, disabled: boolean) => (
    <Button type="button" size="sm" className="h-9" disabled={disabled} onClick={() => goStep(to)}>
      {t('পরবর্তী', 'Next')}
      <ArrowRight className="size-4" />
    </Button>
  );
  const sel = (value: string, onChange: (v: string) => void, list: typeof DISPUTE_TYPES, id: string) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="h-9 w-full rounded-lg text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {list.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {lang === 'bn' ? o.bn : o.en}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  let card: React.ReactNode;

  if (step === 3 && docketResponse) {
    card = (
      <DocketResult
        docket={docketResponse}
        plaintiffNid={plaintiffNid || undefined}
        onDashboard={() => go('overview')}
        onNewCase={() => {
          resetForm();
          goStep(1);
        }}
      />
    );
  } else if (step === 1) {
    card = (
      <WizardCard stepper={stepper} footer={<><span />{nextBtn(2, !verifiedLawyer)}</>}>
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            handleVerifyLawyer();
          }}
        >
          <Field label={t('বার কাউন্সিল সনদ নং *', 'Bar Council no *')} className="flex-1">
            <input
              className={cn(inputCls, 'font-mono uppercase')}
              value={barCouncilNo}
              onChange={(e) => {
                setBarCouncilNo(e.target.value.toUpperCase());
                if (verifiedLawyer) setVerifiedLawyer(null);
              }}
              placeholder="BC-XX-00000"
              autoComplete="off"
            />
          </Field>
          <Button type="submit" size="sm" className="h-9" disabled={verifyLoading || !barCouncilNo.trim()}>
            {verifyLoading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            {t('যাচাই করুন', 'Verify')}
          </Button>
        </form>
        {verifiedLawyer ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="size-4" />
              {t('সনদ সক্রিয়', 'Licence active')}
            </div>
            <DetailList
              items={[
                [t('নাম', 'Name'), lang === 'bn' ? verifiedLawyer.lawyer_name_bn : verifiedLawyer.lawyer_name_en || verifiedLawyer.lawyer_name_bn],
                [t('সনদ নং', 'Licence no'), <span className="font-mono">{verifiedLawyer.bar_council_no}</span>],
                [t('জেলা বার', 'District bar'), verifiedLawyer.district_bar],
                verifiedLawyer.phone ? [t('মোবাইল', 'Phone'), maskPhone(verifiedLawyer.phone, lang)] : null,
              ]}
            />
          </div>
        ) : (
          <Hint>{t('শুধু নিজের সনদ দিয়ে দাখিল করা যায়', 'You can file only with your own licence')}</Hint>
        )}
      </WizardCard>
    );
  } else if (step === 2) {
    card = !verifiedLawyer ? (
      <WizardCard stepper={stepper}>
        <BlockedNotice
          text={t('আগে সনদ যাচাই করুন', 'Verify your licence first')}
          actionLabel={t('সনদ যাচাই', 'Verify licence')}
          onAction={() => goStep(1)}
        />
      </WizardCard>
    ) : (
      <WizardCard stepper={stepper} footer={<>{backBtn(1)}{nextBtn(3, !step2Ready)}</>}>
        <AddressCascader
          lang={lang}
          selectedDivision={address.division_bn}
          selectedDistrict={address.district_bn}
          selectedUpazila={address.upazila_bn}
          selectedMouzaId={address.mouza_id}
          showMouza
          required
          onChange={(s) => setAddress(s)}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label={t('দাগ নং *', 'Plot no *')}
            hint={
              selectedPlot
                ? `${selectedPlot.land_type_bn || ''} · ${toBanglaDigits(selectedPlot.total_area_decimal, lang)} ${t('শতক', 'dec')}`
                : !plotsLoading && availablePlots.length === 0
                  ? t('এই মৌজায় দাগ নেই', 'No plots in this mouza')
                  : undefined
            }
          >
            <Select
              value={selectedPlotId ? String(selectedPlotId) : ''}
              onValueChange={(v) => handlePlotSelect(Number(v))}
              disabled={plotsLoading || availablePlots.length === 0}
            >
              <SelectTrigger className="h-9 w-full rounded-lg text-sm">
                <SelectValue placeholder={plotsLoading ? t('লোড হচ্ছে…', 'Loading…') : t('দাগ বাছুন', 'Choose plot')} />
              </SelectTrigger>
              <SelectContent>
                {availablePlots.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {t('দাগ', 'Plot')} {lang === 'bn' ? p.dag_no_bn || p.dag_no : p.dag_no}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('মামলার ধরন *', 'Suit type *')}>{sel(disputeType, setDisputeType, DISPUTE_TYPES, 'lawyer-dispute-type')}</Field>
          <Field label={t('আদালত *', 'Court *')}>
            <input className={inputCls} value={courtName} onChange={(e) => setCourtName(e.target.value)} placeholder={t('যেমন: সিনিয়র সহকারী জজ আদালত, সাভার', 'e.g. Senior Asst. Judge Court, Savar')} />
          </Field>
          <Field label={t('মামলা নং *', 'Suit no *')}>
            <input className={inputCls} value={suitNo} onChange={(e) => setSuitNo(e.target.value)} placeholder={t('যেমন: দেওয়ানি ৪৫/২০২৬', 'e.g. Civil 45/2026')} />
          </Field>
          <Field label={t('বাদী *', 'Plaintiff *')}>
            <input className={inputCls} value={plaintiffName} onChange={(e) => setPlaintiffName(e.target.value)} />
          </Field>
          <Field label={t('বিবাদী *', 'Defendant *')}>
            <input className={inputCls} value={defendantName} onChange={(e) => setDefendantName(e.target.value)} />
          </Field>
        </div>
        <Accordion type="single" collapsible className="rounded-lg border border-slate-200 px-3">
          <AccordionItem value="more" className="border-b-0">
            <AccordionTrigger className="min-h-0 py-2.5 text-sm font-medium text-slate-700 hover:no-underline hover:text-slate-900">
              {t('আরও তথ্য', 'More details')}
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-3 pt-1 text-slate-700">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label={t('পর্যায়', 'Stage')}>{sel(caseStage, setCaseStage, CASE_STAGES, 'lawyer-case-stage')}</Field>
                <Field label={t('নালিশি অংশ, শতক', 'Disputed area, dec')}>
                  <input type="number" step="0.01" min="0" className={inputCls} value={disputedArea} onChange={(e) => setDisputedArea(e.target.value)} />
                </Field>
                <Field label={t('বাদীর এনআইডি', 'Plaintiff NID')}>
                  <input className={cn(inputCls, 'font-mono')} inputMode="numeric" value={plaintiffNid} onChange={(e) => setPlaintiffNid(e.target.value.replace(/\D/g, ''))} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label={t('উত্তরে', 'North')}>
                  <input className={inputCls} value={boundaryNorth} onChange={(e) => setBoundaryNorth(e.target.value)} />
                </Field>
                <Field label={t('দক্ষিণে', 'South')}>
                  <input className={inputCls} value={boundarySouth} onChange={(e) => setBoundarySouth(e.target.value)} />
                </Field>
                <Field label={t('পূর্বে', 'East')}>
                  <input className={inputCls} value={boundaryEast} onChange={(e) => setBoundaryEast(e.target.value)} />
                </Field>
                <Field label={t('পশ্চিমে', 'West')}>
                  <input className={inputCls} value={boundaryWest} onChange={(e) => setBoundaryWest(e.target.value)} />
                </Field>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </WizardCard>
    );
  } else {
    card = !verifiedLawyer || !step2Ready ? (
      <WizardCard stepper={stepper}>
        <BlockedNotice
          text={!verifiedLawyer ? t('আগে সনদ যাচাই করুন', 'Verify your licence first') : t('আগে মামলার তথ্য দিন', 'Fill in case details first')}
          actionLabel={!verifiedLawyer ? t('সনদ যাচাই', 'Verify licence') : t('মামলার তথ্য', 'Case details')}
          onAction={() => goStep(!verifiedLawyer ? 1 : 2)}
        />
      </WizardCard>
    ) : (
      <WizardCard
        stepper={stepper}
        footer={
          <>
            {backBtn(2)}
            <Button type="button" size="sm" className="h-9" disabled={submitting || !step3Ready} onClick={handleSubmitCase}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              {t('দাখিল করুন', 'File case')}
            </Button>
          </>
        }
      >
        <DetailList
          items={[
            [t('দাগ', 'Plot'), selectedPlot ? `${lang === 'bn' ? selectedPlot.dag_no_bn || selectedPlot.dag_no : selectedPlot.dag_no} · ${lang === 'bn' ? address.mouza_bn || '' : address.mouza_en || address.mouza_bn || ''}` : '—'],
            [t('মামলা', 'Suit'), `${suitNo} · ${optLabel(DISPUTE_TYPES, disputeType, lang)}`],
            [t('পক্ষ', 'Parties'), `${plaintiffName} ${t('বনাম', 'vs')} ${defendantName}`],
          ]}
        />
        <Field label={t('আবেদনের কারণ *', 'Grounds *')}>
          <Textarea
            rows={4}
            value={descriptionBn}
            onChange={(e) => setDescriptionBn(e.target.value)}
            placeholder={t('সংক্ষেপে নিষেধাজ্ঞার কারণ লিখুন', 'Briefly state the grounds')}
            className="min-h-0 rounded-lg text-sm"
          />
        </Field>
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
          <Checkbox checked={affidavitAgreed} onCheckedChange={(v) => setAffidavitAgreed(v === true)} className="mt-0.5" />
          <span>{t('আমি নিশ্চিত করছি মামলাটি আদালতে দাখিল হয়েছে', 'I confirm this suit is filed in court')}</span>
        </label>
        <Hint>{t('দাখিলের পর দাগে মামলার সতর্কতা চালু হবে', 'Filing puts a litigation alert on the plot')}</Hint>
      </WizardCard>
    );
  }

  return (
    <div className="h-full min-h-0">
      {docketResponse && <PrintableDocket docket={docketResponse} plaintiffNid={plaintiffNid || undefined} />}
      <div className="h-full min-h-0 print:hidden">
        <AdminPage>{card}</AdminPage>
      </div>
    </div>
  );
};
