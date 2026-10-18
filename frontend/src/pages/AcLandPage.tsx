import React, { useState, useEffect, useMemo } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi, RiskReportResponse } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { AddressCascader, AddressSelection } from '../components/AddressCascader';
import { triggerAppNotification } from '../components/NotificationCenter';
import { OfficerKhatianExplorer } from '../components/OfficerKhatianExplorer';
import { OfficerDeedVerifier } from '../components/OfficerDeedVerifier';
import {
  Landmark,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  FileText,
  ShieldCheck,
  Scale,
  ArrowRight,
  Eye,
  X,
  QrCode,
  Layers,
  FileSpreadsheet,
  ListChecks,
  Send,
  Sparkles,
  ShieldAlert,
  Compass,
  MapPin,
  Building2,
  RefreshCw,
  Plus,
  AlertTriangle,
  RotateCcw,
  Gavel,
  History,
  Lock,
  UserCheck,
  FileSearch,
} from 'lucide-react';

export type AcLandTab =
  | 'mutations'
  | 'khatians'
  | 'disputes'
  | 'field_reports'
  | 'survey_batches'
  | 'sla_overview'
  | 'appeals'
  | 'onboarding'
  | 'explorer'
  | 'verifier';

export const AcLandPage: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { user, lang, role, setRole, setUser, setToken, activeSubTab, setActiveSubTab, t } = useAppUI();

  const [subTab, setSubTab] = useState<AcLandTab>(() => {
    if (
      activeSubTab &&
      [
        'mutations',
        'khatians',
        'disputes',
        'field_reports',
        'survey_batches',
        'sla_overview',
        'appeals',
        'onboarding',
        'explorer',
        'verifier',
      ].includes(activeSubTab)
    ) {
      return activeSubTab as AcLandTab;
    }
    if (role === 'field_verification_officer') return 'field_reports';
    if (role === 'settlement_records_officer') return 'survey_batches';
    if (role === 'settlement_checker') return 'onboarding';
    if (role === 'uno_supervisor') return 'sla_overview';
    if (role === 'appellate_reviewer') return 'appeals';
    return 'mutations';
  });

  const [mutations, setMutations] = useState<any[]>([]);
  const [flaggedKhatians, setFlaggedKhatians] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [onboardingBatches, setOnboardingBatches] = useState<any[]>([]);
  const [appealsList, setAppealsList] = useState<any[]>([]);
  const [fieldReportsList, setFieldReportsList] = useState<any[]>([]);
  const [slaEscalationsList, setSlaEscalationsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ msg: string; err?: boolean } | null>(null);

  // Filters & Universal Address Cascading State
  const [searchQuery, setSearchQuery] = useState('');
  const [mutationStatusFilter, setMutationStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedUpazila, setSelectedUpazila] = useState('');
  const [selectedMouzaId, setSelectedMouzaId] = useState<number | string>('');

  // Modals & Action State
  const [selectedMutation, setSelectedMutation] = useState<any | null>(null);
  const [mutationDecisionNotes, setMutationDecisionNotes] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);

  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [disputeNotes, setDisputeNotes] = useState('');

  const [selectedKhatian, setSelectedKhatian] = useState<any | null>(null);
  const [khatianReconcileArea, setKhatianReconcileArea] = useState<string>('');
  const [khatianReconcileNotes, setKhatianReconcileNotes] = useState('');

  const [isNewFieldReportOpen, setIsNewFieldReportOpen] = useState(false);
  const [fieldForm, setFieldForm] = useState({
    plot_id: '',
    possession_status: 'VERIFIED',
    boundary_status: 'MATCHED',
    tax_status: 'PAID',
    remarks: 'জমির সরেজমিন সীমানা ও দখল আবেদনকারীর অনুকূলে পাওয়া গেছে।',
  });

  const [isNewSlaOpen, setIsNewSlaOpen] = useState(false);
  const [slaForm, setSlaForm] = useState({
    case_reference: '',
    target_role: 'land_office_assistant',
    priority: 'NORMAL' as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
    due_at: '',
    notes_bn: '',
  });

  // Survey Maker & Checker State (R07)
  const [isNewSurveyBatchOpen, setIsNewSurveyBatchOpen] = useState(false);
  const [surveyType, setSurveyType] = useState<'BS' | 'RS' | 'SA' | 'CS' | 'DIGITAL'>('BS');
  const [surveyMouza, setSurveyMouza] = useState('Birulia');
  const [surveyDagNo, setSurveyDagNo] = useState('');
  const [surveyKhatianNo, setSurveyKhatianNo] = useState('');
  const [surveyLandClass, setSurveyLandClass] = useState('নাল (Agricultural)');
  const [surveyAreaDecimal, setSurveyAreaDecimal] = useState('');
  const [surveyOwnerBn, setSurveyOwnerBn] = useState('');
  const [surveyOwnerEn, setSurveyOwnerEn] = useState('');
  const [surveyOwnerNid, setSurveyOwnerNid] = useState('');
  const [surveyStagedItems, setSurveyStagedItems] = useState<any[]>([]);
  const [surveySubmitting, setSurveySubmitting] = useState(false);

  const [inspectingBatch, setInspectingBatch] = useState<any | null>(null);
  const [checkerNote, setCheckerNote] = useState('');
  const [checkerDeciding, setCheckerDeciding] = useState(false);

  const handleAddSurveyItem = () => {
    if (!surveyDagNo.trim() || !surveyAreaDecimal.trim() || !surveyOwnerBn.trim()) {
      setActionNotice({
        msg: lang === 'bn' ? 'দাগ নং, জমির পরিমাণ ও মালিকের নাম প্রদান করা বাধ্যতামূলক।' : 'Dag No, Area, and Owner Name are required.',
        err: true,
      });
      setTimeout(() => setActionNotice(null), 3500);
      return;
    }
    const newItem = {
      survey_type: surveyType,
      mouza: surveyMouza,
      dag_no: surveyDagNo.trim(),
      khatian_no: surveyKhatianNo.trim() || `KHT-${Math.floor(1000 + Math.random() * 9000)}`,
      land_class: surveyLandClass,
      area_decimal: parseFloat(surveyAreaDecimal) || 1.0,
      owner_name_bn: surveyOwnerBn.trim(),
      owner_name_en: surveyOwnerEn.trim() || surveyOwnerBn.trim(),
      nid: surveyOwnerNid.trim() || undefined,
    };
    setSurveyStagedItems((prev) => [...prev, newItem]);
    setSurveyDagNo('');
    setSurveyKhatianNo('');
    setSurveyAreaDecimal('');
    setSurveyOwnerBn('');
    setSurveyOwnerEn('');
    setSurveyOwnerNid('');
  };

  const handleSubmitSurveyBatch = async () => {
    if (surveyStagedItems.length === 0) {
      setActionNotice({
        msg: lang === 'bn' ? 'স্ট্যাজিং তালিকায় অন্তত একটি রেকর্ড যোগ করুন।' : 'Add at least one item to stage.',
        err: true,
      });
      setTimeout(() => setActionNotice(null), 3500);
      return;
    }
    setSurveySubmitting(true);
    try {
      const res = await BhumiApi.createOnboardingBatch({
        record_type: 'SURVEY_RECORD',
        items: surveyStagedItems,
      });
      setActionNotice({
        msg: lang === 'bn'
          ? `জরিপ ব্যাচ ${res.batch?.batch_no || ''} সফলভাবে দাখিল হয়েছে। চেকার পর্যালোচনার অপেক্ষায় আছে।`
          : `Survey batch ${res.batch?.batch_no || ''} submitted successfully for checker review.`,
      });
      setSurveyStagedItems([]);
      setIsNewSurveyBatchOpen(false);
      loadAcLandData();
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      setActionNotice({
        msg: err?.response?.data?.message_bn || err?.message || 'ব্যাচ সাবমিট ব্যর্থ হয়েছে।',
        err: true,
      });
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setSurveySubmitting(false);
    }
  };

  const handleOpenBatchInspection = async (batch: any) => {
    try {
      const full = await BhumiApi.getOnboardingBatch(batch.id || batch.batch_no);
      setInspectingBatch(full);
      setCheckerNote('');
    } catch (e: any) {
      setActionNotice({ msg: e?.response?.data?.message_bn || 'ব্যাচ বিবরণ লোড হয়নি।', err: true });
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  const handleDecideBatch = async (decision: 'APPROVED' | 'REJECTED' | 'RETURNED') => {
    if (!inspectingBatch?.batch?.id) return;
    if (decision === 'RETURNED' && (!checkerNote || checkerNote.trim().length < 5)) {
      setActionNotice({ msg: t('সংশোধনের কারণ ও সুনির্দিষ্ট নির্দেশনামূলক নোট প্রদান করুন (ন্যূনতম ৫ অক্ষর)।', 'Please provide detailed correction notes (min 5 chars).'), err: true });
      return;
    }
    setCheckerDeciding(true);
    try {
      const res = await BhumiApi.decideOnboardingBatch(inspectingBatch.batch.id, decision, checkerNote);
      setActionNotice({
        msg: res.message_bn || (decision === 'APPROVED' ? 'জরিপ ব্যাচ অনুমোদিত ও গেজেট প্রকাশ হয়েছে।' : decision === 'RETURNED' ? 'জরিপ ব্যাচ সংশোধনের জন্য ফেরত পাঠানো হয়েছে।' : 'জরিপ ব্যাচ বাতিল করা হয়েছে।'),
      });
      setInspectingBatch(null);
      loadAcLandData();
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      setActionNotice({
        msg: err?.response?.data?.message_bn || err?.message || 'অনুমোদনে ত্রুটি হয়েছে।',
        err: true,
      });
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setCheckerDeciding(false);
    }
  };

  const handleResubmitBatch = async () => {
    if (!inspectingBatch?.batch?.id) return;
    setCheckerDeciding(true);
    try {
      const items = (inspectingBatch.items || []).map((it: any) => it.payload || {});
      const res = await BhumiApi.resubmitOnboardingBatch(inspectingBatch.batch.id, {
        items,
        notes_bn: 'সংশোধিত রেকর্ডসমূহ পুনরায় পরীক্ষার জন্য দাখিল করা হলো',
      });
      setActionNotice({
        msg: res.message_bn || 'সংশোধিত ব্যাচ পুনরায় চেকার সমীপে দাখিল করা হয়েছে।',
      });
      setInspectingBatch(null);
      loadAcLandData();
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      setActionNotice({
        msg: err?.response?.data?.message_bn || err?.message || 'পুনরায় দাখিলে ত্রুটি হয়েছে।',
        err: true,
      });
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setCheckerDeciding(false);
    }
  };

  const loadAcLandData = async () => {
    setLoading(true);
    try {
      const [muts, khats, dsps, plts, st, batches, appeals, fr, sla] = await Promise.all([
        BhumiApi.getMutations().catch(() => []),
        BhumiApi.listFlaggedKhatians().catch(() => []),
        BhumiApi.listDisputes().catch(() => []),
        BhumiApi.getPlots().catch(() => []),
        BhumiApi.getStatsSummary().catch(() => null),
        BhumiApi.listOnboardingBatches().catch(() => []),
        BhumiApi.listAppeals().catch(() => []),
        BhumiApi.listFieldReports().catch(() => []),
        BhumiApi.listSlaDispatches().catch(() => []),
      ]);

      setMutations(Array.isArray(muts) ? muts : []);
      setFlaggedKhatians(Array.isArray(khats) ? khats : []);
      setDisputes(Array.isArray(dsps) ? dsps : []);
      setPlots(Array.isArray(plts) ? plts : []);
      setStats(st);
      setOnboardingBatches(Array.isArray(batches) ? batches : ((batches as any)?.items || []));
      setAppealsList(Array.isArray(appeals) ? appeals : ((appeals as any)?.items || []));
      setFieldReportsList(Array.isArray(fr) ? fr : []);
      setSlaEscalationsList(Array.isArray(sla) ? sla : []);
    } catch (err: any) {
      console.error('Error loading AC Land data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAcLandData();
    const timer = setInterval(() => {
      loadAcLandData();
    }, 8000);
    const onFocus = () => loadAcLandData();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    if (
      activeSubTab &&
      [
        'mutations',
        'khatians',
        'disputes',
        'field_reports',
        'survey_batches',
        'sla_overview',
        'appeals',
        'onboarding',
        'explorer',
        'verifier',
      ].includes(activeSubTab)
    ) {
      setSubTab(activeSubTab as AcLandTab);
    }
  }, [activeSubTab]);

  const handleTabChange = (target: AcLandTab) => {
    setSubTab(target);
    setActiveSubTab(target);
  };

  const handleAddressChange = (sel: AddressSelection) => {
    setSelectedDivision(sel.division_bn);
    setSelectedDistrict(sel.district_bn);
    setSelectedUpazila(sel.upazila_bn);
    setSelectedMouzaId(sel.mouza_id ? String(sel.mouza_id) : '');
  };

  const resetFilters = () => {
    setSearchQuery('');
    setMutationStatusFilter('ALL');
    setSelectedDivision('');
    setSelectedDistrict('');
    setSelectedUpazila('');
    setSelectedMouzaId('');
  };

  // Filtered Mutations
  const filteredMutations = useMemo(() => {
    return mutations.filter((m) => {
      if (mutationStatusFilter !== 'ALL' && m.status !== mutationStatusFilter) return false;
      if (selectedDivision && m.division_bn && m.division_bn !== selectedDivision) return false;
      if (selectedDistrict && m.district_bn && m.district_bn !== selectedDistrict) return false;
      if (selectedUpazila && m.upazila_bn && m.upazila_bn !== selectedUpazila) return false;
      if (selectedMouzaId && m.mouza_id && Number(m.mouza_id) !== Number(selectedMouzaId)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCase = (m.case_no || '').toLowerCase().includes(q);
        const matchDag = String(m.dag_no || '').toLowerCase().includes(q);
        const matchApplicant = (m.applicant_name_bn || m.buyer_name_bn || '').toLowerCase().includes(q);
        const matchMouza = (m.mouza_bn || '').toLowerCase().includes(q);
        const matchDeed = (m.deed_no || '').toLowerCase().includes(q);
        if (!matchCase && !matchDag && !matchApplicant && !matchMouza && !matchDeed) return false;
      }
      return true;
    });
  }, [mutations, mutationStatusFilter, selectedDivision, selectedDistrict, selectedUpazila, selectedMouzaId, searchQuery]);

  // Handlers
  const handleDecideMutation = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedMutation) return;
    setDecisionLoading(true);
    try {
      const res = await BhumiApi.decideMutation(
        selectedMutation.id,
        status,
        mutationDecisionNotes.trim() ||
          (status === 'APPROVED'
            ? 'সহকারী কমিশনার (ভূমি) কর্তৃক বায়া দলিল ও খতিয়ান নিরীক্ষান্তে নামজারি আদেশ মঞ্জুর।'
            : 'নথি ত্রুটি ও ওয়ারিশান বিরোধের কারণে নামজারি আবেদন নামঞ্জুর।')
      );
      setActionNotice({
        msg:
          res?.message_bn ||
          (status === 'APPROVED'
            ? `নামজারি কেস ${selectedMutation.case_no} সফলভাবে অনুমোদিত এবং নতুন খতিয়ান জারিকৃত।`
            : `নামজারি কেস ${selectedMutation.case_no} নামঞ্জুর করা হয়েছে।`),
      });
      triggerAppNotification({
        title_bn: status === 'APPROVED' ? 'নামজারি আবেদন অনুমোদিত ও খতিয়ান প্রস্তুত' : 'নামজারি আবেদন নামঞ্জুর',
        title_en: status === 'APPROVED' ? 'Mutation Approved & New Khatian Ready' : 'Mutation Rejected',
        message_bn: `নামজারি কেস নং ${selectedMutation.case_no} (দাগ নং ${selectedMutation.dag_no}) সহকারী কমিশনার (ভূমি) কর্তৃক ${status === 'APPROVED' ? 'অনুমোদিত' : 'নামঞ্জুর'} হয়েছে।`,
        message_en: `Mutation case ${selectedMutation.case_no} for Dag ${selectedMutation.dag_no} was ${status.toLowerCase()} by AC Land.`,
        type: status === 'APPROVED' ? 'SUCCESS' : 'ALERT',
        targetTab: 'acland',
        targetSection: 'mutations',
      });
      setSelectedMutation(null);
      setMutationDecisionNotes('');
      loadAcLandData();
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      setActionNotice({
        msg: err?.response?.data?.message_bn || err?.response?.data?.error || 'সিদ্ধান্ত কার্যকর করতে ত্রুটি হয়েছে।',
        err: true,
      });
    } finally {
      setDecisionLoading(false);
    }
  };

  const handleResolveDispute = async (status: 'RESOLVED' | 'RESOLVED_FROZEN') => {
    if (!selectedDispute) return;
    setDecisionLoading(true);
    try {
      const res = await BhumiApi.resolveDispute(selectedDispute.id, {
        status: status === 'RESOLVED_FROZEN' ? 'UPHELD_FROZEN' : 'RESOLVED',
        resolution_note_bn:
          disputeNotes.trim() ||
          (status === 'RESOLVED_FROZEN'
            ? 'আদালতের স্বত্ব মামলার নিষ্পত্তি না হওয়া পর্যন্ত দাগে প্রশাসনিক বিক্রয় স্থগিতাদেশ বহাল।'
            : 'আপত্তি প্রত্যাহার ও শুনানিতে সমঝোতা হওয়ায় মিস-কেস নথিভুক্ত ও নিষ্পত্তি।'),
      });
      setActionNotice({ msg: res?.message_bn || 'বিরোধের শুনানি সিদ্ধান্ত সফলভাবে রেকর্ড করা হয়েছে।' });
      triggerAppNotification({
        title_bn: 'জমি বিরোধ ও মিস-কেস শুনানি আদেশ',
        title_en: 'Dispute Hearing Order Recorded',
        message_bn: `বিরোধ কেস নং ${selectedDispute.case_no} (দাগ নং ${selectedDispute.dag_no}) এসিল্যান্ড আদালত কর্তৃক শুনানি সম্পন্ন ও রেকর্ড হালনাগাদ করা হয়েছে।`,
        message_en: `Dispute Case ${selectedDispute.case_no} hearing order recorded by AC Land.`,
        type: status === 'RESOLVED_FROZEN' ? 'ALERT' : 'SUCCESS',
        targetTab: 'acland',
        targetSection: 'disputes',
      });
      setSelectedDispute(null);
      setDisputeNotes('');
      loadAcLandData();
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      setActionNotice({ msg: err?.response?.data?.error || 'সিদ্ধান্ত সংরক্ষণে ব্যর্থ হয়েছে।', err: true });
    } finally {
      setDecisionLoading(false);
    }
  };

  const handleReconcileKhatian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKhatian) return;
    setDecisionLoading(true);
    try {
      const plotId = selectedKhatian.plot_id || selectedKhatian.id;
      const res = await BhumiApi.reconcileKhatian(plotId, {
        resolution_note_bn: khatianReconcileNotes.trim() || 'আরএস ও বিএস রেকর্ডের ক্ষেত্রফল সমন্বয় ও শুদ্ধিপত্র জারি।',
        updated_area_decimal: khatianReconcileArea ? Number(khatianReconcileArea) : undefined,
      });
      setActionNotice({ msg: res?.message_bn || 'খতিয়ান রেকর্ড শুদ্ধিপত্র সফলভাবে জারি হয়েছে।' });
      setSelectedKhatian(null);
      setKhatianReconcileNotes('');
      setKhatianReconcileArea('');
      loadAcLandData();
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      setActionNotice({ msg: err?.response?.data?.error || 'খতিয়ান সংশোধনে ত্রুটি হয়েছে।', err: true });
    } finally {
      setDecisionLoading(false);
    }
  };

  const handleCreateFieldReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldForm.plot_id) return;
    setDecisionLoading(true);
    try {
      const res = await BhumiApi.createFieldReport({
        plot_id: Number(fieldForm.plot_id),
        possession_status: fieldForm.possession_status,
        boundary_status: fieldForm.boundary_status,
        tax_status: fieldForm.tax_status,
        remarks_bn: fieldForm.remarks.trim(),
      });
      setActionNotice({ msg: res?.message_bn || 'মাঠ পরিদর্শন প্রতিবেদন সফলভাবে দাখিল ও রেকর্ড করা হয়েছে।' });
      setIsNewFieldReportOpen(false);
      setFieldForm({
        plot_id: '',
        possession_status: 'VERIFIED',
        boundary_status: 'MATCHED',
        tax_status: 'PAID',
        remarks: 'জমির সরেজমিন সীমানা ও দখল আবেদনকারীর অনুকূলে পাওয়া গেছে।',
      });
      loadAcLandData();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setActionNotice({ msg: err?.response?.data?.error || 'মাঠ প্রতিবেদন সংরক্ষণে ত্রুটি হয়েছে।', err: true });
    } finally {
      setDecisionLoading(false);
    }
  };

  const handleCreateSla = async (e: React.FormEvent) => {
    e.preventDefault();
    setDecisionLoading(true);
    try {
      const res = await BhumiApi.createSlaDispatch({
        case_reference: slaForm.case_reference.trim(),
        target_role: slaForm.target_role,
        priority: slaForm.priority,
        due_at: slaForm.due_at || undefined,
        notes_bn: slaForm.notes_bn.trim() || 'নির্ধারিত নাগরিক সেবা সনদের সময়সীমার মধ্যে নথি নিষ্পত্তির তাগিদ।',
      });
      setActionNotice({ msg: res?.message_bn || 'এসএলএ তাগিদ নোটিশ সফলভাবে জারি করা হয়েছে।' });
      setIsNewSlaOpen(false);
      setSlaForm({
        case_reference: '',
        target_role: 'land_office_assistant',
        priority: 'NORMAL',
        due_at: '',
        notes_bn: '',
      });
      loadAcLandData();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setActionNotice({ msg: err?.response?.data?.error || 'তাগিদ নোটিশ জারিতে ত্রুটি হয়েছে।', err: true });
    } finally {
      setDecisionLoading(false);
    }
  };

  // KPIs
  const pendingMutationsCount = mutations.filter((m) => m.status === 'PENDING').length;
  const approvedMutationsCount = mutations.filter((m) => m.status === 'APPROVED').length;
  const flaggedKhatiansCount = flaggedKhatians.length;
  const activeDisputesCount = disputes.filter((d) => d.status === 'OPEN' || d.status === 'HEARING').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionNotice && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${
            actionNotice.err
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}
        >
          <span>{actionNotice.msg}</span>
          <button onClick={() => setActionNotice(null)} className="text-slate-500 hover:text-slate-800 cursor-pointer ml-3">
            ✕
          </button>
        </div>
      )}

      {/* Header Panel */}
      <div className="panel p-6 bg-white border border-[#006A4E]/20 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#006A4E]/10 pb-4">
          <div>
            <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1.5">
              <span>{t('উপজেলা ভূমি অফিস', 'Upazila Land Office')}</span>
              <span>/</span>
              <span className="text-[#006A4E] font-extrabold">
                {role === 'settlement_records_officer'
                  ? t('সেটেলমেন্ট রেকর্ডস ও ক্যাডাস্ট্রাল স্ট্যাজিং', 'Cadastral Survey Records Staging')
                  : role === 'settlement_checker'
                  ? t('সহকারী সেটেলমেন্ট অফিসার ও গেজেট অনুমোদন', 'Assistant Settlement Officer & Checker')
                  : role === 'uno_supervisor'
                  ? t('ইউএনও তত্ত্বাবধায়ন ও এসএলএ মনিটরিং', 'UNO Oversight & SLA Monitoring')
                  : role === 'field_verification_officer'
                  ? t('মাঠ তদন্ত ও সীমানা যাচাই ডেস্ক', 'Field Verification & Boundary Desk')
                  : t('সহকারী কমিশনার (ভূমি) ট্রাইব্যুনাল', 'AC Land Tribunal & Mutation Workbench')}
              </span>
            </div>
            <h1 className="font-bold text-xl text-[#074f38] flex items-center gap-2">
              <Landmark className="w-6 h-6 text-[#006A4E]" />
              <span>
                {role === 'settlement_records_officer'
                  ? t('জরিপ রেকর্ডস ও ক্যাডাস্ট্রাল স্ট্যাজিং (মেকার)', 'Cadastral Survey Records Staging (Maker)')
                  : role === 'settlement_checker'
                  ? t('সহকারী সেটেলমেন্ট অফিসার ও জরিপ গেজেট অনুমোদন (চেকার)', 'Assistant Settlement Officer & Checker')
                  : role === 'uno_supervisor'
                  ? t('উপজেলা নির্বাহী কর্মকর্তা (UNO) ওভারসাইট কনসোল', 'Upazila Nirbahi Officer (UNO) Console')
                  : role === 'field_verification_officer'
                  ? t('মাঠ তদন্তকারী (সার্ভেয়ার) কনসোল', 'Field Verification Officer Console')
                  : t('সহকারী কমিশনার (ভূমি) ট্রাইব্যুনাল ও নামজারি বেঞ্চ', 'AC Land Tribunal & e-Mutation Workbench')}
              </span>
            </h1>
            <p className="text-xs text-[#5F7A74] mt-1">
              {role === 'settlement_records_officer'
                ? t(
                    'চলমান ডিজিটাল জরিপ (CS/SA/RS/BS) খতিয়ান ডাটা প্রস্তুত, সীমানা দাগ স্ট্যাজিং ও স্বাধীন চেকার সমীপে ব্যাচ দাখিল।',
                    'Stage cadastral survey khatian entries and submit onboarding batches for independent checker verification.'
                  )
                : role === 'settlement_checker'
                ? t(
                    'সেটেলমেন্ট মেকার কর্তৃক প্রস্তুতকৃত জরিপ খতিয়ান ডাটা ও সীমানা যাচাই এবং চূড়ান্ত গেজেট প্রকাশ অনুমোদন।',
                    'Inspect survey khatian data, ensure maker-checker separation, and approve official gazetted records.'
                  )
                : role === 'uno_supervisor'
                ? t(
                    'উপজেলা পর্যায়ে বিলম্বিত নামজারি, এসএলএ অতিক্রমকারী মামলা ও প্রশাসনিক সমন্বয় পর্যবেক্ষণ।',
                    'Supervise delayed mutation cases, SLA escalations, and administrative coordination.'
                  )
                : role === 'field_verification_officer'
                ? t(
                    'মাঠপর্যায়ে জমির দখল তদন্ত, ছবি ও ভূ-অবস্থান প্রতিবেদন এবং এলডি ট্যাক্স হোল্ডিং যাচাই।',
                    'Conduct physical land possession inspections, submit geotagged photos, and report findings.'
                  )
                : t(
                    'ই-নামজারি (e-Mutation) শুনানি ও খতিয়ান অনুমোদন, স্বত্বলিপির রেকর্ডের অমিল নিরসন, দেওয়ানি আপত্তি ট্রাইব্যুনাল এবং মাঠ পরিদর্শন তদারকি।',
                    'Adjudicate e-mutations, reconcile khatian discrepancies, resolve land ownership disputes, and supervise field inspections.'
                  )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadAcLandData}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{t('রিফ্রেশ', 'Refresh')}</span>
            </button>
            <span className="px-3.5 py-2 rounded-xl text-xs font-bold border border-emerald-300 bg-emerald-50 text-emerald-900 flex items-center gap-1.5">
              <Gavel className="w-4 h-4 text-[#006A4E]" />
              <span>
                {role === 'uno_supervisor'
                  ? t('উপজেলা নির্বাহী কর্মকর্তা (UNO)', 'Upazila Nirbahi Officer')
                  : role === 'field_verification_officer'
                  ? t('মাঠ তদন্তকারী (সার্ভেয়ার)', 'Field Verification Officer')
                  : role === 'settlement_records_officer'
                  ? t('সেটেলমেন্ট রেকর্ডস অফিসার (মেকার)', 'Settlement Records Officer (Maker)')
                  : role === 'settlement_checker'
                  ? t('সহকারী সেটেলমেন্ট অফিসার (চেকার)', 'Assistant Settlement Officer (Checker)')
                  : role === 'appellate_reviewer'
                  ? t('আপিল কর্তৃপক্ষ (এডিসি রাজস্ব)', 'Appellate Reviewer (ADC Rev)')
                  : t('সহকারী কমিশনার (ভূমি)', 'AC Land Magistrate')}
              </span>
            </span>
          </div>
        </div>

        {/* Operational KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {role === 'settlement_records_officer' ? (
            <>
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                <div className="text-[10px] font-bold uppercase text-amber-800 flex items-center justify-between">
                  <span>{t('অপেক্ষমাণ স্ট্যাজিং ব্যাচ', 'Awaiting Review')}</span>
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                </div>
                <div className="text-2xl font-extrabold text-amber-900 mt-1">
                  {toBanglaDigits(onboardingBatches.filter((b) => b.status === 'SUBMITTED').length, lang)}
                </div>
                <div className="text-[11px] text-amber-700 mt-0.5">{t('চেকার পর্যালোচনার অপেক্ষায়', 'Under review')}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-[10px] font-bold uppercase text-emerald-800 flex items-center justify-between">
                  <span>{t('অনুমোদিত জরিপ রেকর্ড', 'Approved Batches')}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#006A4E]" />
                </div>
                <div className="text-2xl font-extrabold text-[#006A4E] mt-1">
                  {toBanglaDigits(onboardingBatches.filter((b) => b.status === 'APPROVED').length, lang)}
                </div>
                <div className="text-[11px] text-emerald-700 mt-0.5">{t('লেজারে চূড়ান্ত যুক্ত', 'Officially recorded')}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                <div className="text-[10px] font-bold uppercase text-rose-800 flex items-center justify-between">
                  <span>{t('সংশোধন ফেরত ব্যাচ', 'Returned Batches')}</span>
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <div className="text-2xl font-extrabold text-rose-800 mt-1">
                  {toBanglaDigits(onboardingBatches.filter((b) => b.status === 'REJECTED').length, lang)}
                </div>
                <div className="text-[11px] text-rose-600 mt-0.5">{t('সংশোধন প্রয়োজন', 'Needs correction')}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                <div className="text-[10px] font-bold uppercase text-blue-800 flex items-center justify-between">
                  <span>{t('মোট দাখিলকৃত ব্যাচ', 'Total Batches')}</span>
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700" />
                </div>
                <div className="text-2xl font-extrabold text-blue-900 mt-1">
                  {toBanglaDigits(onboardingBatches.length, lang)}
                </div>
                <div className="text-[11px] text-blue-700 mt-0.5">{t('ডিজিটাল জরিপ ডাটা', 'Survey batches')}</div>
              </div>
            </>
          ) : role === 'settlement_checker' ? (
            <>
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                <div className="text-[10px] font-bold uppercase text-amber-800 flex items-center justify-between">
                  <span>{t('নিরীক্ষার অপেক্ষায় ব্যাচ', 'Awaiting Inspection')}</span>
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                </div>
                <div className="text-2xl font-extrabold text-amber-900 mt-1">
                  {toBanglaDigits(onboardingBatches.filter((b) => b.status === 'SUBMITTED').length, lang)}
                </div>
                <div className="text-[11px] text-amber-700 mt-0.5">{t('সিদ্ধান্তের অপেক্ষায়', 'Pending approval')}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-[10px] font-bold uppercase text-emerald-800 flex items-center justify-between">
                  <span>{t('অনুমোদিত গেজেট ব্যাচ', 'Approved Gazettes')}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#006A4E]" />
                </div>
                <div className="text-2xl font-extrabold text-[#006A4E] mt-1">
                  {toBanglaDigits(onboardingBatches.filter((b) => b.status === 'APPROVED').length, lang)}
                </div>
                <div className="text-[11px] text-emerald-700 mt-0.5">{t('স্বাক্ষরিত ও প্রকাশিত', 'Signed & published')}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                <div className="text-[10px] font-bold uppercase text-rose-800 flex items-center justify-between">
                  <span>{t('বাতিল / ফেরত ব্যাচ', 'Returned Batches')}</span>
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <div className="text-2xl font-extrabold text-rose-800 mt-1">
                  {toBanglaDigits(onboardingBatches.filter((b) => b.status === 'REJECTED').length, lang)}
                </div>
                <div className="text-[11px] text-rose-600 mt-0.5">{t('ত্রুটিপূর্ণ রেকর্ড', 'Rejected records')}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                <div className="text-[10px] font-bold uppercase text-blue-800 flex items-center justify-between">
                  <span>{t('মোট নিরীক্ষিত ব্যাচ', 'Total Inspected')}</span>
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700" />
                </div>
                <div className="text-2xl font-extrabold text-blue-900 mt-1">
                  {toBanglaDigits(onboardingBatches.length, lang)}
                </div>
                <div className="text-[11px] text-blue-700 mt-0.5">{t('সকল জরিপ নথি', 'All batches')}</div>
              </div>
            </>
          ) : (
            <>
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                <div className="text-[10px] font-bold uppercase text-amber-800 flex items-center justify-between">
                  <span>{t('বিচারাধীন নামজারি কেস', 'Pending Mutations')}</span>
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                </div>
                <div className="text-2xl font-extrabold text-amber-900 mt-1">
                  {toBanglaDigits(pendingMutationsCount, lang)}
                </div>
                <div className="text-[11px] text-amber-700 mt-0.5">{t('শুনানি ও অনুমোদনের অপেক্ষায়', 'Awaiting hearing & order')}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-[10px] font-bold uppercase text-emerald-800 flex items-center justify-between">
                  <span>{t('অনুমোদিত নামজারি', 'Approved Mutations')}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#006A4E]" />
                </div>
                <div className="text-2xl font-extrabold text-[#006A4E] mt-1">
                  {toBanglaDigits(approvedMutationsCount, lang)}
                </div>
                <div className="text-[11px] text-emerald-700 mt-0.5">{t('সৃজিত নতুন খতিয়ান', 'New khatians created')}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                <div className="text-[10px] font-bold uppercase text-rose-800 flex items-center justify-between">
                  <span>{t('রেকর্ডের অমিল / ফ্ল্যাগ', 'Flagged Khatians')}</span>
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <div className="text-2xl font-extrabold text-rose-800 mt-1">
                  {toBanglaDigits(flaggedKhatiansCount, lang)}
                </div>
                <div className="text-[11px] text-rose-600 mt-0.5">{t('শুদ্ধিপত্র প্রয়োজন', 'Reconciliation needed')}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                <div className="text-[10px] font-bold uppercase text-blue-800 flex items-center justify-between">
                  <span>{t('নাগরিক আপত্তি ও বিরোধ', 'Ownership Disputes')}</span>
                  <Scale className="w-3.5 h-3.5 text-blue-700" />
                </div>
                <div className="text-2xl font-extrabold text-blue-900 mt-1">
                  {toBanglaDigits(activeDisputesCount, lang)}
                </div>
                <div className="text-[11px] text-blue-700 mt-0.5">{t('মিস-কেস ও ট্রাইব্যুনাল', 'Active objections')}</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sub-Tabs Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          {(() => {
            const roleAllowedTabs: AcLandTab[] = (
              role === 'settlement_records_officer'
                ? ['survey_batches', 'explorer']
                : role === 'settlement_checker'
                ? ['onboarding', 'explorer']
                : role === 'field_verification_officer'
                ? ['field_reports', 'mutations', 'explorer']
                : role === 'uno_supervisor'
                ? ['sla_overview', 'mutations', 'disputes', 'appeals']
                : role === 'appellate_reviewer'
                ? ['appeals', 'mutations', 'explorer']
                : ['mutations', 'khatians', 'disputes', 'field_reports', 'survey_batches', 'onboarding', 'sla_overview', 'appeals', 'explorer', 'verifier']
            );

            return (
              <>
                {roleAllowedTabs.includes('mutations') && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('mutations')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      subTab === 'mutations' ? 'bg-white text-[#006A4E] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{t('ই-নামজারি বেঞ্চ', 'e-Mutation Workbench')}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                      {toBanglaDigits(pendingMutationsCount, lang)}
                    </span>
                  </button>
                )}

                {roleAllowedTabs.includes('khatians') && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('khatians')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      subTab === 'khatians' ? 'bg-white text-[#006A4E] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{t('রেকর্ডের অমিল ও শুদ্ধিপত্র', 'Record Discrepancies')}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">
                      {toBanglaDigits(flaggedKhatiansCount, lang)}
                    </span>
                  </button>
                )}

                {roleAllowedTabs.includes('disputes') && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('disputes')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      subTab === 'disputes' ? 'bg-white text-[#006A4E] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>{t('আপত্তি ও মিস-কেস আদালত', 'Objections & Court')}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
                      {toBanglaDigits(activeDisputesCount, lang)}
                    </span>
                  </button>
                )}

                {roleAllowedTabs.includes('field_reports') && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('field_reports')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      subTab === 'field_reports' ? 'bg-white text-[#006A4E] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>{t('মাঠ তদন্ত প্রতিবেদন', 'Field Reports')}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                      {toBanglaDigits(fieldReportsList.length, lang)}
                    </span>
                  </button>
                )}

                {roleAllowedTabs.includes('survey_batches') && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('survey_batches')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      subTab === 'survey_batches' ? 'bg-white text-[#006A4E] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>{t('জরিপ রেকর্ড ও ব্যাচ দাখিল', 'Survey Records Staging')}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                      {toBanglaDigits(onboardingBatches.length, lang)}
                    </span>
                  </button>
                )}

                {roleAllowedTabs.includes('onboarding') && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('onboarding')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      subTab === 'onboarding' ? 'bg-white text-[#006A4E] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t('জরিপ ব্যাচ নিরীক্ষা ও অনুমোদন', 'Survey Batches Inspection')}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                      {toBanglaDigits(onboardingBatches.filter((b) => b.status === 'SUBMITTED').length, lang)}
                    </span>
                  </button>
                )}

                {roleAllowedTabs.includes('sla_overview') && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('sla_overview')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      subTab === 'sla_overview' ? 'bg-white text-[#006A4E] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{t('সময়সীমা ও তাগিদ (SLA)', 'SLA Escalations')}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                      {toBanglaDigits(slaEscalationsList.length, lang)}
                    </span>
                  </button>
                )}

                {roleAllowedTabs.includes('appeals') && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('appeals')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      subTab === 'appeals' ? 'bg-white text-[#006A4E] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Gavel className="w-3.5 h-3.5" />
                    <span>{t('রাজস্ব আপিল ট্রাইব্যুনাল', 'Appeals Tribunal')}</span>
                  </button>
                )}

                {roleAllowedTabs.includes('explorer') && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('explorer')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      subTab === 'explorer' ? 'bg-white text-[#006A4E] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileSearch className="w-3.5 h-3.5" />
                    <span>{t('খতিয়ান এক্সপ্লোরার', 'Khatian Explorer')}</span>
                  </button>
                )}

                {roleAllowedTabs.includes('verifier') && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('verifier')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      subTab === 'verifier' ? 'bg-white text-[#006A4E] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{t('দলিল ভেরিফায়ার', 'Deed Verifier')}</span>
                  </button>
                )}
              </>
            );
          })()}
        </div>

        {/* Reset Filter Button */}
        {(searchQuery || mutationStatusFilter !== 'ALL' || selectedDivision || selectedDistrict || selectedUpazila || selectedMouzaId) && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('ফিল্টার রিসেট', 'Reset Filters')}</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: E-MUTATION WORKBENCH                                            */}
      {/* ========================================================================= */}
      {subTab === 'mutations' && (
        <div className="space-y-4">
          {/* Universal Address Cascader & Search Toolbar */}
          <div className="panel p-4 bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#006A4E]" />
              <span>{t('সার্বজনীন অধিক্ষেত্র ফিল্টারিং (বিভাগ ➔ জেলা ➔ উপজেলা ➔ মৌজা)', 'Universal Hierarchy & Case Filter')}</span>
            </div>

            <AddressCascader
              selectedDivision={selectedDivision}
              selectedDistrict={selectedDistrict}
              selectedUpazila={selectedUpazila}
              selectedMouzaId={selectedMouzaId}
              onChange={handleAddressChange}
              isFilter={true}
              showMouza={true}
              lang={lang}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {t('অনুসন্ধান (কেস নং, দাগ নং, আবেদনকারী বা বায়া দলিল নং)', 'Search Case No, Dag, Applicant, Deed')}
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('কেস নং, দাগ নং, আবেদনকারীর নাম বা দলিল নং লিখুন...', 'Search by case no, plot, applicant...')}
                    className="w-full text-xs pl-8 pr-2.5 py-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {t('আবেদনের বর্তমান স্থিতি', 'Status Filter')}
                </label>
                <select
                  value={mutationStatusFilter}
                  onChange={(e) => setMutationStatusFilter(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                >
                  <option value="ALL">{t('সকল আবেদন (All Status)', 'All Mutations')}</option>
                  <option value="PENDING">{t('বিচারাধীন / শুনানির অপেক্ষায় (Pending)', 'Pending Hearing')}</option>
                  <option value="APPROVED">{t('অনুমোদিত ও খতিয়ান সৃজিত (Approved)', 'Approved')}</option>
                  <option value="REJECTED">{t('নামঞ্জুরকৃত (Rejected)', 'Rejected')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Mutations Table */}
          <div className="panel p-0 bg-white border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#006A4E]" />
                <span>{t('ই-নামজারি কেস ও রেজিস্ট্রি তালিকা', 'e-Mutation Cases Table')}</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-[#006A4E] font-bold">
                  {toBanglaDigits(filteredMutations.length, lang)} {t('টি কেস', 'Cases')}
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium hidden sm:block">
                {t('আই-আইকন (👁) ক্লিক করে বিস্তারিত দেখুন ও রায় প্রদান করুন', 'Click eye icon to inspect docket & order')}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
                    <th className="p-3">#</th>
                    <th className="p-3">{t('কেস নম্বর ও তারিখ', 'Case No & Date')}</th>
                    <th className="p-3">{t('আবেদনকারী ও গ্রহীতা', 'Applicant / Buyer')}</th>
                    <th className="p-3">{t('মৌজা ও দাগ নং', 'Mouza & Dag No')}</th>
                    <th className="p-3">{t('হস্তান্তরিত অংশ ও আয়তন', 'Area & Share')}</th>
                    <th className="p-3">{t('বায়া দলিল নং', 'Provenance Deed')}</th>
                    <th className="p-3 text-center">{t('স্থিতি', 'Status')}</th>
                    <th className="p-3 text-right">{t('অ্যাকশন (শুনানি)', 'Action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMutations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        {t('কোনো নামজারি আবেদন পাওয়া যায়নি। অনুসন্ধান ফিল্টার পরিবর্তন করুন।', 'No mutation records match your search.')}
                      </td>
                    </tr>
                  ) : (
                    filteredMutations.map((m, idx) => (
                      <tr key={m.id || idx} className="hover:bg-emerald-50/30 transition">
                        <td className="p-3 font-mono text-slate-400">{toBanglaDigits(idx + 1, lang)}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                            <span>{m.case_no}</span>
                            {m.case_no?.includes('WARISH') && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                ⚖️ ফারায়েজ
                              </span>
                            )}
                            {(m.case_no?.includes('LT') || m.decision_reason_bn?.includes('এলটি নোটিশ')) && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ⚡ অটো এলটি নোটিশ
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{m.buyer_name_bn || m.applicant_name_bn || 'নাম উল্লেখ নেই'}</div>
                          {m.buyer_nid && <div className="text-[10px] text-slate-500 font-mono">NID: {m.buyer_nid}</div>}
                        </td>
                        <td className="p-3 font-medium text-slate-800">
                          <div>দাগ নং: {m.dag_no_bn || m.dag_no}</div>
                          <div className="text-[10px] text-slate-500">
                            {m.mouza_bn} {m.jl_no ? `(জে.এল. ${m.jl_no})` : ''}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-[#006A4E]">{toBanglaDigits(m.area_decimal, lang)} {t('শতক', 'dec')}</span>
                          <span className="text-[10px] text-slate-500 ml-1">({m.share_fraction})</span>
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {m.deed_no ? (
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                              {m.deed_no}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-block border ${
                              m.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : m.status === 'REJECTED'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            {m.status === 'APPROVED'
                              ? t('অনুমোদিত', 'Approved')
                              : m.status === 'REJECTED'
                              ? t('নামঞ্জুর', 'Rejected')
                              : t('শুনানি অপেক্ষমাণ', 'Pending')}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMutation(m);
                              setMutationDecisionNotes(m.decision_note_bn || '');
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-[#006A4E] hover:text-white text-slate-700 transition cursor-pointer"
                            title={t('নামজারি শুনানি ও বিস্তারিত দেখুন', 'Inspect mutation docket & hearing')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: RECORD DISCREPANCIES & FLAGGED KHATIANS                         */}
      {/* ========================================================================= */}
      {subTab === 'khatians' && (
        <div className="space-y-4">
          <div className="panel p-4 bg-rose-50/60 border border-rose-200 text-rose-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <strong>{t('স্বত্বলিপি ও রেকর্ডের অমিল নোটিশ:', 'Record Anomaly Warning:')}</strong>{' '}
                {t(
                  'সিএস/আরএস এর তুলনায় বিএস বা সিটি জরিপে আয়তন বৃদ্ধি, খাস জমি দখল কিংবা মালিকের নাম উধাও হওয়া দাগসমূহকে লাল পতাকাভুক্ত করা হয়েছে। সহকারী কমিশনার (ভূমি) কর্তৃক শুদ্ধিপত্র জারি ব্যতিরেকে এই দাগে নামজারি নিষিদ্ধ।',
                  'Khatians with area mismatch, disputed government interest, or survey discrepancies are flagged. AC Land correction order required.'
                )}
              </div>
            </div>
          </div>

          <div className="panel p-0 bg-white border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>{t('লাল পতাকাভুক্ত খতিয়ান ও দাগ তালিকা', 'Flagged Khatians Table')}</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-rose-100 text-rose-800 font-bold">
                  {toBanglaDigits(flaggedKhatians.length, lang)} {t('টি রেকর্ড', 'Records')}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
                    <th className="p-3">#</th>
                    <th className="p-3">{t('মৌজা ও জে.এল.', 'Mouza & J.L.')}</th>
                    <th className="p-3">{t('দাগ নং', 'Plot No')}</th>
                    <th className="p-3">{t('আরএস আয়তন', 'RS Area')}</th>
                    <th className="p-3">{t('বিএস আয়তন', 'BS Area')}</th>
                    <th className="p-3">{t('অসংগতি ও ত্রুটির বিবরণ', 'Discrepancy Note')}</th>
                    <th className="p-3 text-right">{t('অ্যাকশন', 'Action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {flaggedKhatians.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        {t('কোনো অমিল পাওয়া যায়নি। সকল রেকর্ড শুদ্ধ আছে।', 'No flagged khatians found.')}
                      </td>
                    </tr>
                  ) : (
                    flaggedKhatians.map((k, idx) => (
                      <tr key={k.id || idx} className="hover:bg-rose-50/20 transition">
                        <td className="p-3 font-mono text-slate-400">{toBanglaDigits(idx + 1, lang)}</td>
                        <td className="p-3 font-bold text-slate-900">{k.mouza_bn}</td>
                        <td className="p-3 font-bold text-slate-800">{k.dag_no_bn || k.dag_no}</td>
                        <td className="p-3 font-mono">{toBanglaDigits(k.area_rs ?? k.area_decimal, lang)} {t('শতক', 'dec')}</td>
                        <td className="p-3 font-mono text-rose-700 font-bold">{toBanglaDigits(k.area_bs ?? k.area_decimal, lang)} {t('শতক', 'dec')}</td>
                        <td className="p-3 text-slate-600 text-[11px]">
                          {k.anomaly_note_bn || k.remarks_bn || 'আরএস ও বিএস রেকর্ডের মধ্যে ৮ শতক অতিরিক্ত জমির অমিল।'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedKhatian(k);
                              setKhatianReconcileArea(String(k.area_rs ?? k.area_decimal ?? ''));
                              setKhatianReconcileNotes('');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#006A4E] hover:bg-[#00523C] text-white font-bold transition shadow-xs cursor-pointer"
                          >
                            {t('শুদ্ধিপত্র জারি', 'Reconcile')}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: DISPUTES & OBJECTIONS COURT                                     */}
      {/* ========================================================================= */}
      {subTab === 'disputes' && (
        <div className="space-y-4">
          <div className="panel p-0 bg-white border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-700" />
                <span>{t('নাগরিক মালিকানা আপত্তি ও মিস-কেস ট্রাইব্যুনাল', 'Objections & Miss-Case Court')}</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 font-bold">
                  {toBanglaDigits(disputes.length, lang)} {t('টি মামলা', 'Cases')}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
                    <th className="p-3">#</th>
                    <th className="p-3">{t('কেস নম্বর', 'Case No')}</th>
                    <th className="p-3">{t('আপত্তিকারী নাগরিক', 'Complainant')}</th>
                    <th className="p-3">{t('সংশ্লিষ্ট দাগ ও মৌজা', 'Plot & Mouza')}</th>
                    <th className="p-3">{t('আপত্তির কারণ ও ধরন', 'Dispute Type')}</th>
                    <th className="p-3 text-center">{t('স্থিতি', 'Status')}</th>
                    <th className="p-3 text-right">{t('শুনানি সিদ্ধান্ত', 'Action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {disputes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        {t('কোনো দেওয়ানি আপত্তি বা মিস-কেস পাওয়া যায়নি।', 'No dispute objections filed.')}
                      </td>
                    </tr>
                  ) : (
                    disputes.map((d, idx) => (
                      <tr key={d.id || idx} className="hover:bg-blue-50/20 transition">
                        <td className="p-3 font-mono text-slate-400">{toBanglaDigits(idx + 1, lang)}</td>
                        <td className="p-3 font-bold text-slate-900">{d.case_no}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{d.complainant_name_bn || 'নাম গোপন'}</div>
                          {d.complainant_nid && <div className="text-[10px] text-slate-500 font-mono">NID: {d.complainant_nid}</div>}
                        </td>
                        <td className="p-3 font-medium text-slate-800">
                          <div>দাগ নং: {d.dag_no_bn || d.dag_no || d.plot_id}</div>
                          <div className="text-[10px] text-slate-500">{d.mouza_bn}</div>
                        </td>
                        <td className="p-3 text-slate-700 text-[11px]">
                          <div className="font-bold">{d.dispute_type || 'OWNERSHIP_OBJECTION'}</div>
                          <div className="text-slate-500 truncate max-w-xs">{d.description_bn || d.reason_bn}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              d.status === 'RESOLVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : d.status === 'UPHELD_FROZEN'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {d.status === 'RESOLVED' ? 'নিষ্পন্ন' : d.status === 'UPHELD_FROZEN' ? 'স্থগিতাদেশ বহাল' : 'বিচারাধীন'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDispute(d);
                              setDisputeNotes(d.resolution_note_bn || '');
                            }}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 transition cursor-pointer"
                          >
                            {t('শুনানি রায়', 'Order')}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: FIELD INSPECTION REPORTS                                        */}
      {/* ========================================================================= */}
      {subTab === 'field_reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600">
              {t(
                'উপজেলা সার্ভেয়ার ও কানুনগো কর্তৃক সরেজমিন দখল ও সীমানা পরিদর্শন রিপোর্ট।',
                'On-site surveyor and kanungo inspection reports for possession and boundary verification.'
              )}
            </p>
            <button
              type="button"
              onClick={() => setIsNewFieldReportOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00523C] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('নতুন মাঠ প্রতিবেদন দাখিল', 'Submit Inspection Report')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fieldReportsList.length === 0 ? (
              <div className="col-span-2 panel p-8 text-center text-slate-500">
                {t('কোনো মাঠ পরিদর্শন প্রতিবেদন পাওয়া যায়নি।', 'No field inspection reports filed.')}
              </div>
            ) : (
              fieldReportsList.map((fr, idx) => (
                <div key={fr.id || idx} className="panel p-5 bg-white border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <Compass className="w-4 h-4 text-[#006A4E]" />
                      <span>দাগ নং {fr.dag_no || fr.plot_id} · {fr.mouza_bn || 'মৌজা রেকর্ড'}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {fr.created_at ? new Date(fr.created_at).toLocaleDateString() : 'হালনাগাদ'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 rounded bg-slate-50 border border-slate-100">
                      <div className="text-[10px] text-slate-500">{t('দখলের অবস্থা', 'Possession')}</div>
                      <div className="font-bold text-slate-800">{fr.possession_status || fr.possession}</div>
                    </div>
                    <div className="p-2 rounded bg-slate-50 border border-slate-100">
                      <div className="text-[10px] text-slate-500">{t('সীমানা স্থিতি', 'Boundary')}</div>
                      <div className="font-bold text-slate-800">{fr.boundary_status || fr.boundary}</div>
                    </div>
                    <div className="p-2 rounded bg-slate-50 border border-slate-100">
                      <div className="text-[10px] text-slate-500">{t('ভূমি উন্নয়ন কর', 'Tax Status')}</div>
                      <div className="font-bold text-slate-800">{fr.tax_status}</div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100">
                    <strong>{t('সার্ভেয়ারের পর্যবেক্ষণ:', 'Observations:')}</strong>{' '}
                    {fr.remarks_bn || fr.remarks || 'মাঠ সীমানা ও দখল আবেদনকারীর অনুকূলে পাওয়া গেছে।'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 5: SLA ESCALATIONS                                                 */}
      {/* ========================================================================= */}
      {subTab === 'sla_overview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600">
              {t(
                'সিটিজেন চার্টার (২৮ দিন) অনুসারে নামজারি নথির সময়সীমা পর্যবেক্ষণ ও তাগিদ নোটিশ।',
                'Monitor 28-day mutation Citizen Charter SLA and issue escalation directives.'
              )}
            </p>
            <button
              type="button"
              onClick={() => setIsNewSlaOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t('কেস তাগিদ নোটিশ পাঠান', 'Issue Escalation')}</span>
            </button>
          </div>

          <div className="panel p-0 bg-white border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>{t('এসএলএ তাগিদ ও বিলম্ব নোটিশ তালিকা', 'SLA Escalation Dispatches')}</span>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {slaEscalationsList.length === 0 ? (
                <div className="p-8 text-center text-slate-500">{t('কোনো বিলম্ব বা তাগিদ নোটিশ নেই।', 'No SLA escalations active.')}</div>
              ) : (
                slaEscalationsList.map((s, idx) => (
                  <div key={s.id || idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50">
                    <div>
                      <div className="font-extrabold text-slate-900 flex items-center gap-2">
                        <span>{s.case_reference || s.case_no || 'MUT-SLA'}</span>
                        <span className="px-2 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                          {s.priority || 'NORMAL'}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-0.5">{s.notes_bn || s.reason}</p>
                    </div>
                    <div className="text-right text-[11px] text-slate-400">
                      <div>প্রত্যাশিত তারিখ: {s.due_at || 'শীঘ্রই'}</div>
                      <div className="font-bold text-amber-700">{s.target_role}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 6: APPEALS TRIBUNAL                                                */}
      {/* ========================================================================= */}
      {subTab === 'appeals' && (
        <div className="space-y-4">
          <div className="panel p-0 bg-white border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <Gavel className="w-4 h-4 text-[#006A4E]" />
              <span>{t('রাজস্ব আপিল ট্রাইব্যুনাল শুনানী ও আদেশ', 'Revenue Appeals Tribunal')}</span>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {appealsList.length === 0 ? (
                <div className="p-8 text-center text-slate-500">{t('কোনো বিচারাধীন আপিল পাওয়া যায়নি।', 'No pending appeals.')}</div>
              ) : (
                appealsList.map((app, idx) => (
                  <div key={app.id || idx} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50">
                    <div>
                      <div className="font-bold text-slate-900">{app.appeal_code || `APL-${app.id}`}</div>
                      <p className="text-slate-600 text-xs mt-0.5">{app.description_bn || app.reason_bn}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                      {app.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB: SURVEY BATCHES (settlement_records_officer, ac_land)             */}
      {/* ========================================================================= */}
      {subTab === 'survey_batches' && (
        <div className="space-y-5 animate-rise">
          <div className="panel p-5 bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1">
                <FileSpreadsheet className="w-4 h-4 text-[#006A4E]" />
                <span className="text-[#006A4E] font-extrabold">{t('ক্যাডাস্ট্রাল জরিপ রেকর্ডস স্ট্যাজিং মেকার', 'Cadastral Survey Records Staging')}</span>
              </div>
              <h2 className="text-lg font-black text-slate-900">
                {t('ডিজিটাল জরিপ খতিয়ান ডাটা এন্ট্রি ও ব্যাচ দাখিল', 'Digital Survey Records Entry & Batch Submission')}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {t(
                  'চলমান সিএস/এসএ/আরএস/বিএস জরিপ খতিয়ান ডাটা প্রস্তুত করুন। একাধিক রেকর্ড স্ট্যাজিং করে স্বাধীন চেকার সমীপে দাখিল করুন।',
                  'Stage survey khatian entries across CS, SA, RS, BS series and submit as a verifiable onboarding batch.'
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsNewSurveyBatchOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t('নতুন জরিপ রেকর্ড যোগ করুন', 'Add Survey Record')}</span>
            </button>
          </div>

          {/* Staged Items Ready to Submit */}
          {surveyStagedItems.length > 0 && (
            <div className="panel p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-extrabold text-xs text-[#006A4E] flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <span>
                    {t('স্ট্যাজিং তালিকায় প্রস্তুত রেকর্ড:', 'Staged Records Ready for Batch Submission:')}{' '}
                    {toBanglaDigits(surveyStagedItems.length, lang)} {t('টি', '')}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={surveySubmitting}
                  onClick={handleSubmitSurveyBatch}
                  className="px-4 py-1.5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{surveySubmitting ? t('দাখিল হচ্ছে...', 'Submitting...') : t('চেকার সমীপে ব্যাচ দাখিল করুন', 'Submit Batch to Checker')}</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-emerald-200 bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-50/80 text-emerald-950 border-b border-emerald-200">
                      <th className="p-2.5 font-bold">#</th>
                      <th className="p-2.5 font-bold">{t('জরিপ', 'Survey')}</th>
                      <th className="p-2.5 font-bold">{t('মৌজা', 'Mouza')}</th>
                      <th className="p-2.5 font-bold">{t('দাগ নং', 'Dag')}</th>
                      <th className="p-2.5 font-bold">{t('খতিয়ান নং', 'Khatian')}</th>
                      <th className="p-2.5 font-bold">{t('শ্রেণি', 'Class')}</th>
                      <th className="p-2.5 font-bold">{t('পরিমাণ (শতক)', 'Area (Dec)')}</th>
                      <th className="p-2.5 font-bold">{t('মালিকের নাম', 'Owner Name')}</th>
                      <th className="p-2.5 font-bold text-right">{t('মুছুন', 'Remove')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {surveyStagedItems.map((stItem, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-[#006A4E]">{stItem.survey_type}</td>
                        <td className="p-2.5 text-slate-700">{stItem.mouza}</td>
                        <td className="p-2.5 font-bold text-slate-800">{toBanglaDigits(stItem.dag_no, lang)}</td>
                        <td className="p-2.5 font-mono text-slate-700">{stItem.khatian_no}</td>
                        <td className="p-2.5 text-slate-600">{stItem.land_class}</td>
                        <td className="p-2.5 font-extrabold text-slate-900">{toBanglaDigits(stItem.area_decimal, lang)}</td>
                        <td className="p-2.5 font-medium text-slate-800">{stItem.owner_name_bn}</td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSurveyStagedItems((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Submitted Batches Table */}
          <div className="panel p-0 bg-white border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="font-extrabold text-xs text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#006A4E]" />
                <span>{t('দাখিলকৃত জরিপ ব্যাচসমূহ', 'Submitted Survey Batches')}</span>
              </div>
              <span className="text-[11px] text-slate-500">
                {toBanglaDigits(onboardingBatches.length, lang)} {t('টি ব্যাচ', 'Batches')}
              </span>
            </div>

            {onboardingBatches.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                {t('কোনো জরিপ ব্যাচ দাখিল করা হয়নি। নতুন রেকর্ড যোগ করতে উপরের বোতাম চাপুন।', 'No survey batches found. Click Add Survey Record to begin.')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                      <th className="p-3 font-bold">#</th>
                      <th className="p-3 font-bold">{t('ব্যাচ নং', 'Batch No')}</th>
                      <th className="p-3 font-bold">{t('রেকর্ড ধরন', 'Record Type')}</th>
                      <th className="p-3 font-bold">{t('মেকার কর্মকর্তা', 'Maker')}</th>
                      <th className="p-3 font-bold">{t('রেকর্ড সংখ্যা', 'Items')}</th>
                      <th className="p-3 font-bold">{t('স্ট্যাটাস', 'Status')}</th>
                      <th className="p-3 font-bold">{t('দাখিলের তারিখ', 'Date')}</th>
                      <th className="p-3 font-bold text-right">{t('কার্যক্রম', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {onboardingBatches.map((b, idx) => (
                      <tr key={b.id || idx} className="hover:bg-slate-50/70 transition">
                        <td className="p-3 font-mono text-[11px] text-slate-400">#{b.id}</td>
                        <td className="p-3 font-mono font-bold text-[#006A4E]">{b.batch_no}</td>
                        <td className="p-3 font-semibold text-slate-700">{b.record_type}</td>
                        <td className="p-3 text-slate-800">{b.maker_name_bn || `@${b.maker_role || 'maker'}`}</td>
                        <td className="p-3 font-extrabold text-slate-900">{toBanglaDigits(b.total_items || 1, lang)}</td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              b.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : b.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">
                          {b.created_at ? toBanglaDigits(b.created_at.substring(0, 10), lang) : '—'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenBatchInspection(b)}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ml-auto"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#006A4E]" />
                            <span>{t('পরিদর্শন', 'Inspect')}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal: Add Record to Staging */}
          {isNewSurveyBatchOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
              <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-[#006A4E]" />
                    <span>{t('নতুন জরিপ খতিয়ান রেকর্ড স্ট্যাজিং', 'Stage New Survey Khatian')}</span>
                  </h3>
                  <button onClick={() => setIsNewSurveyBatchOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">{t('জরিপ সিরিজ (Survey):', 'Survey:')} *</label>
                      <select
                        value={surveyType}
                        onChange={(e) => setSurveyType(e.target.value as any)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 font-bold bg-white"
                      >
                        <option value="BS">BS (বাংলাদেশ সার্ভে)</option>
                        <option value="RS">RS (রিভিশনাল সার্ভে)</option>
                        <option value="SA">SA (স্টেট একুইজিশন)</option>
                        <option value="CS">CS (ক্যাডাস্ট্রাল সার্ভে)</option>
                        <option value="DIGITAL">DIGITAL (ডিজিটাল ভূমি জরিপ)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">{t('মৌজা (Mouza):', 'Mouza:')} *</label>
                      <select
                        value={surveyMouza}
                        onChange={(e) => setSurveyMouza(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="Birulia">বিরুলিয়া (Birulia)</option>
                        <option value="Savar">সাভার (Savar)</option>
                        <option value="Dhamrai">ধামরাই (Dhamrai)</option>
                        <option value="Ashulia">আশুলিয়া (Ashulia)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">{t('দাগ নম্বর (Dag No):', 'Dag No:')} *</label>
                      <input
                        type="text"
                        required
                        value={surveyDagNo}
                        onChange={(e) => setSurveyDagNo(e.target.value)}
                        placeholder="উদা: ১২৮"
                        className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">{t('খতিয়ান নম্বর (Khatian No):', 'Khatian No:')}</label>
                      <input
                        type="text"
                        value={surveyKhatianNo}
                        onChange={(e) => setSurveyKhatianNo(e.target.value)}
                        placeholder="উদা: ৪৫০"
                        className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">{t('জমির শ্রেণি:', 'Land Class:')} *</label>
                      <select
                        value={surveyLandClass}
                        onChange={(e) => setSurveyLandClass(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="নাল (Agricultural)">নাল (Agricultural)</option>
                        <option value="ভিটি (Highland)">ভিটি (Highland)</option>
                        <option value="বাড়ি (Residential)">বাড়ি (Residential)</option>
                        <option value="বাগান (Garden)">বাগান (Garden)</option>
                        <option value="পুকুর (Pond)">পুকুর (Pond)</option>
                        <option value="চালা (Commercial)">চালা (Commercial)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">{t('জমির পরিমাণ (শতক):', 'Area (Decimal):')} *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={surveyAreaDecimal}
                        onChange={(e) => setSurveyAreaDecimal(e.target.value)}
                        placeholder="12.50"
                        className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">{t('মালিকের পূর্ণ নাম (বাংলায়):', 'Owner Name (Bangla):')} *</label>
                      <input
                        type="text"
                        required
                        value={surveyOwnerBn}
                        onChange={(e) => setSurveyOwnerBn(e.target.value)}
                        placeholder="মোঃ রফিকুল ইসলাম"
                        className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">{t('মালিকের পূর্ণ নাম (ইংরেজিতে):', 'Owner Name (English):')}</label>
                      <input
                        type="text"
                        value={surveyOwnerEn}
                        onChange={(e) => setSurveyOwnerEn(e.target.value)}
                        placeholder="Md. Rafiqul Islam"
                        className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{t('মালিকের জাতীয় পরিচয়পত্র (NID):', 'Owner NID:')}</label>
                    <input
                      type="text"
                      value={surveyOwnerNid}
                      onChange={(e) => setSurveyOwnerNid(e.target.value)}
                      placeholder="9900004455"
                      className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsNewSurveyBatchOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer transition text-xs"
                  >
                    {t('বাতিল', 'Cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleAddSurveyItem();
                      setIsNewSurveyBatchOpen(false);
                    }}
                    className="px-5 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold cursor-pointer shadow-xs transition text-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t('তালিকায় যুক্ত করুন', 'Add to Staging List')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB: ONBOARDING INSPECTION (settlement_checker, ac_land)              */}
      {/* ========================================================================= */}
      {subTab === 'onboarding' && (
        <div className="space-y-5 animate-rise">
          <div className="panel p-5 bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-4 h-4 text-[#006A4E]" />
                <span className="text-[#006A4E] font-extrabold">{t('সহকারী সেটেলমেন্ট অফিসার ও চেকার বেঞ্চ', 'Assistant Settlement Officer & Checker')}</span>
              </div>
              <h2 className="text-lg font-black text-slate-900">
                {t('জরিপ খতিয়ান ব্যাচ নিরীক্ষা ও গেজেট প্রকাশ অনুমোদন', 'Survey Batches Inspection & Gazette Approval')}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {t(
                  'মেকার কর্তৃক দাখিলকৃত জরিপ খতিয়ান তথ্য, সীমানা ও দাগ নম্বর নিরপেক্ষ নিরীক্ষা এবং গেজেট প্রকাশ অনুমোদন।',
                  'Inspect and independently verify submitted survey batches. Enforces maker-checker separation before gazette publication.'
                )}
              </p>
            </div>

            <span className="px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-300 bg-emerald-50 text-emerald-900">
              {t('স্বাধীন নিরীক্ষা নীতি সক্রিয় (Maker != Checker)', 'Maker-Checker Isolation Active')}
            </span>
          </div>

          {/* Batches Table for Checker */}
          <div className="panel p-0 bg-white border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="font-extrabold text-xs text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#006A4E]" />
                <span>{t('নিরীক্ষাযোগ্য জরিপ ব্যাচসমূহ', 'Batches Requiring Review')}</span>
              </div>
              <span className="text-[11px] text-slate-500">
                {toBanglaDigits(onboardingBatches.length, lang)} {t('টি ব্যাচ', 'Batches')}
              </span>
            </div>

            {onboardingBatches.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                {t('বর্তমানে অনুমোদনের জন্য কোনো বিচারাধীন জরিপ ব্যাচ নেই।', 'No batches awaiting inspection.')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                      <th className="p-3 font-bold">#</th>
                      <th className="p-3 font-bold">{t('ব্যাচ কোড', 'Batch Code')}</th>
                      <th className="p-3 font-bold">{t('রেকর্ড ধরন', 'Record Type')}</th>
                      <th className="p-3 font-bold">{t('মেকার কর্মকর্তা', 'Maker')}</th>
                      <th className="p-3 font-bold">{t('রেকর্ড সংখ্যা', 'Items')}</th>
                      <th className="p-3 font-bold">{t('স্ট্যাটাস', 'Status')}</th>
                      <th className="p-3 font-bold">{t('তারিখ', 'Date')}</th>
                      <th className="p-3 font-bold text-right">{t('অনুমোদন কার্যক্রম', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {onboardingBatches.map((b, idx) => (
                      <tr key={b.id || idx} className="hover:bg-slate-50/70 transition">
                        <td className="p-3 font-mono text-[11px] text-slate-400">#{b.id}</td>
                        <td className="p-3 font-mono font-bold text-[#006A4E]">{b.batch_no}</td>
                        <td className="p-3 font-semibold text-slate-700">{b.record_type}</td>
                        <td className="p-3 text-slate-800">{b.maker_name_bn || `@${b.maker_role || 'maker'}`}</td>
                        <td className="p-3 font-extrabold text-slate-900">{toBanglaDigits(b.total_items || 1, lang)}</td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              b.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : b.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">
                          {b.created_at ? toBanglaDigits(b.created_at.substring(0, 10), lang) : '—'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenBatchInspection(b)}
                            className="px-3.5 py-1.5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ml-auto shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{t('নিরীক্ষা ও সিদ্ধান্ত', 'Inspect & Decide')}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INSPECTION MODAL: Checker Batch Decision & Item Inspection */}
      {inspectingBatch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-extrabold px-2.5 py-0.5 rounded-lg bg-emerald-50 text-[#006A4E] border border-emerald-200">
                  {inspectingBatch.batch?.batch_no}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {inspectingBatch.batch?.record_type}
                </span>
              </div>
              <button onClick={() => setInspectingBatch(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {/* Maker Details Info */}
            <div className="p-3.5 rounded-xl bg-slate-50 text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-700">
                <span>
                  <strong className="text-slate-900">{t('মেকার কর্মকর্তা: ', 'Maker Officer: ')}</strong>
                  {inspectingBatch.batch?.maker_name_bn} (@{inspectingBatch.batch?.maker_role})
                </span>
                <span className="font-mono text-slate-500">
                  {inspectingBatch.batch?.created_at?.substring(0, 19).replace('T', ' ')}
                </span>
              </div>
              <div className="text-slate-600 font-mono text-[11px]">
                SHA-256 Batch Hash: {inspectingBatch.batch?.batch_hash ? `${inspectingBatch.batch.batch_hash.substring(0, 24)}...` : '—'}
              </div>
            </div>

            {/* Maker-Checker Separation Warning */}
            {Number(inspectingBatch.batch?.maker_user_id) === Number(user?.id) && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>
                  {t(
                    'স্ব-অনুমোদন নীতি লঙ্ঘন: আপনি এই ব্যাচের মেকার (প্রস্তুতকারী) হওয়ায় এটি নিজে অনুমোদন করতে পারবেন না। নিরপেক্ষ সহকারী সেটেলমেন্ট অফিসার বা অ্যাডমিনের আইডি থেকে প্রবেশ করুন।',
                    'Separation of duties violation: You are the maker of this batch and cannot approve it. Another authorized checker must decide.'
                  )}
                </span>
              </div>
            )}

            {/* Validation Invalid Items Warning */}
            {(inspectingBatch.items || []).some((it: any) => it.validation_status === 'INVALID') && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {t(
                    'ব্যাচে ত্রুটিপূর্ণ (INVALID) রেকর্ড বিদ্যমান থাকায় এটি অনুমোদন করা যাবে না। সংশোধন ফেরত প্রদান করুন।',
                    'Batch contains invalid records and cannot be approved until corrected.'
                  )}
                </span>
              </div>
            )}

            {/* Items Table */}
            <div className="space-y-2">
              <div className="font-bold text-xs text-slate-700">{t('ব্যাচভুক্ত খতিয়ান ও দাগসমূহ:', 'Batch Records & Items:')}</div>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                      <th className="p-2.5 font-bold">#</th>
                      <th className="p-2.5 font-bold">{t('দাগ নং', 'Dag')}</th>
                      <th className="p-2.5 font-bold">{t('মৌজা', 'Mouza')}</th>
                      <th className="p-2.5 font-bold">{t('মালিকের নাম', 'Owner Name')}</th>
                      <th className="p-2.5 font-bold">{t('পরিমাণ (শতক)', 'Area (Dec)')}</th>
                      <th className="p-2.5 font-bold">{t('শ্রেণি', 'Class')}</th>
                      <th className="p-2.5 font-bold">{t('যাচাইকরণ', 'Validation')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(inspectingBatch.items || []).map((it: any, i: number) => {
                      const payload = it.payload || {};
                      const isValid = it.validation_status === 'VALID';
                      return (
                        <tr key={it.id || i} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono text-slate-400">{i + 1}</td>
                          <td className="p-2.5 font-bold text-slate-900">{toBanglaDigits(payload.dag_no || it.dag_no || '—', lang)}</td>
                          <td className="p-2.5 text-slate-700">{payload.mouza || it.mouza || '—'}</td>
                          <td className="p-2.5 font-medium text-slate-800">{payload.owner_name_bn || payload.buyer_name || '—'}</td>
                          <td className="p-2.5 font-bold text-slate-900">{toBanglaDigits(payload.area_decimal || it.area_decimal || '—', lang)}</td>
                          <td className="p-2.5 text-slate-600">{payload.land_class || '—'}</td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                isValid
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {it.validation_status || 'VALID'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Return & Correction Feedback Box */}
            {inspectingBatch.batch?.status === 'RETURNED' && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{t('চেকার কর্তৃক সংশোধনের নির্দেশনামূলক নোট (RETURNED):', 'Correction Directives from Checker (RETURNED):')}</span>
                </div>
                <p className="bg-white/80 p-3 rounded-lg border border-amber-200 text-amber-900 font-mono text-[11px] whitespace-pre-wrap">
                  {inspectingBatch.batch?.proof_package?.correction_notes || inspectingBatch.batch?.notes_bn || t('রেকর্ডসমূহ পুনরায় সরেজমিন তথ্যের সাথে মিলিয়ে সংশোধন করুন।', 'Please revise the records according to field verification.')}
                </p>
                {(Number(inspectingBatch.batch?.maker_user_id) === Number(user?.id) || role === 'admin' || role === 'system_admin') && (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={checkerDeciding}
                      onClick={handleResubmitBatch}
                      className="px-5 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{checkerDeciding ? t('দাখিল হচ্ছে...', 'Submitting...') : t('সংশোধনপূর্বক পুনরায় জমা দিন', 'Resubmit Corrected Batch')}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Checker Decision Box (Only for checkers on SUBMITTED batches) */}
            {inspectingBatch.batch?.status === 'SUBMITTED' && Number(inspectingBatch.batch?.maker_user_id) !== Number(user?.id) && (
              <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('চেকার মন্তব্য ও আইনি পর্যবেক্ষণ:', 'Checker Note & Order:')}
                  </label>
                  <textarea
                    rows={2}
                    value={checkerNote}
                    onChange={(e) => setCheckerNote(e.target.value)}
                    placeholder={t('জরিপ খতিয়ান ডাটা সরেজমিন তথ্যের সহিত মিলিয়ে যাচাই করা হয়েছে... (সংশোধনে ফেরতের জন্য ন্যূনতম ৫ অক্ষর আবশ্যক)', 'Enter checker note...')}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setInspectingBatch(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
                  >
                    {t('বন্ধ করুন', 'Close')}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={checkerDeciding}
                      onClick={() => handleDecideBatch('RETURNED')}
                      className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>{t('সংশোধনের জন্য ফেরত পাঠান', 'Return for Correction')}</span>
                    </button>

                    <button
                      type="button"
                      disabled={checkerDeciding}
                      onClick={() => handleDecideBatch('REJECTED')}
                      className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>{t('স্থায়ীভাবে বাতিল', 'Reject Batch')}</span>
                    </button>

                    <button
                      type="button"
                      disabled={
                        checkerDeciding ||
                        Number(inspectingBatch.batch?.maker_user_id) === Number(user?.id) ||
                        (inspectingBatch.items || []).some((it: any) => it.validation_status === 'INVALID')
                      }
                      onClick={() => handleDecideBatch('APPROVED')}
                      className="px-5 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t('অনুমোদন ও গেজেট প্রকাশ', 'Approve & Publish')}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Maker viewing pending batch */}
            {inspectingBatch.batch?.status === 'SUBMITTED' && Number(inspectingBatch.batch?.maker_user_id) === Number(user?.id) && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>{t('এই ব্যাচটি বর্তমানে সহকারী সেটেলমেন্ট অফিসার / স্বাধীন চেকারের অনুমোদনের অপেক্ষায় রয়েছে।', 'This batch is currently under independent checker review.')}</span>
                <button
                  type="button"
                  onClick={() => setInspectingBatch(null)}
                  className="px-4 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300"
                >
                  {t('বন্ধ করুন', 'Close')}
                </button>
              </div>
            )}

            {/* Approved or Rejected close bar */}
            {(inspectingBatch.batch?.status === 'APPROVED' || inspectingBatch.batch?.status === 'REJECTED') && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setInspectingBatch(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
                >
                  {t('বন্ধ করুন', 'Close')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 7: KHATIAN EXPLORER & DEED VERIFIER                                */}
      {/* ========================================================================= */}
      {subTab === 'explorer' && <OfficerKhatianExplorer />}
      {subTab === 'verifier' && <OfficerDeedVerifier />}

      {/* ========================================================================= */}
      {/* CENTER POPUP MODAL: E-MUTATION HEARING & ORDER DOCKET                     */}
      {/* ========================================================================= */}
      {selectedMutation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-[#006A4E] font-mono font-bold text-xs">
                  {selectedMutation.case_no}
                </span>
                {selectedMutation.case_no?.includes('WARISH') && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    ⚖️ ফারায়েজ উত্তরাধিকার বণ্টন
                  </span>
                )}
                {(selectedMutation.case_no?.includes('LT') || selectedMutation.decision_reason_bn?.includes('এলটি নোটিশ')) && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    ⚡ সাব-রেজিস্ট্রি স্বয়ংক্রিয় এলটি নোটিশ (Auto LT-Notice)
                  </span>
                )}
                <h3 className="font-extrabold text-base text-slate-900">
                  {t('ই-নামজারি শুনানি ও রায় আদেশ ডকেট', 'e-Mutation Hearing Docket & Order Sheet')}
                </h3>
              </div>
              <button
                onClick={() => setSelectedMutation(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            {/* Cryptographic Deed Verification Card */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-slate-800">
                    {selectedMutation.deed_no ? `দলিল নং ${selectedMutation.deed_no} (ক্রিপ্টোগ্রাফিক ডিজিটাল সিল সংরক্ষিত)` : 'ওয়ারিশনামা সনদ ও ফারায়েজ বণ্টন হিসাব'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {selectedMutation.case_no?.includes('LT')
                      ? 'সাব-রেজিস্ট্রি সাবমিশন হতে সরাসরি প্রাপ্ত স্বয়ংক্রিয় ট্রান্সফার পাইপলাইন (Zero-Touch LT)'
                      : 'ইসলামিক ফারায়েজ ও ওয়ারিশান উত্তরাধিকার যাচাইকৃত আবেদন'}
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-[#006A4E] border border-emerald-300 shrink-0">
                যাচাই সম্পন্ন
              </span>
            </div>

            {/* Applicant & Buyer Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider text-slate-500">
                {t('আবেদনকারী / ক্রেতার বিবরণ', 'Applicant / Buyer Information')}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <strong>{t('নাম:', 'Name:')}</strong> {selectedMutation.buyer_name_bn || selectedMutation.applicant_name_bn}
                </div>
                <div>
                  <strong>NID:</strong> {selectedMutation.buyer_nid || 'যাচাইকৃত'}
                </div>
                <div>
                  <strong>{t('মোবাইল:', 'Mobile:')}</strong> {selectedMutation.phone || '01700-001000'}
                </div>
                <div>
                  <strong>{t('বায়া দলিল নং:', 'Provenance Deed:')}</strong> {selectedMutation.deed_no || 'DL-2026-1001'}
                </div>
              </div>
            </div>

            {/* Land Schedule */}
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs space-y-2">
              <div className="font-bold text-emerald-900 text-[11px] uppercase tracking-wider">
                {t('জমির তফসিল ও প্রস্তাবিত খতিয়ান', 'Land Schedule & Proposed Khatian')}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-slate-500 block text-[10px]">{t('মৌজা ও জে.এল.', 'Mouza')}</span>
                  <strong className="text-slate-900">{selectedMutation.mouza_bn}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{t('দাগ নম্বর', 'Plot No')}</span>
                  <strong className="text-slate-900">{selectedMutation.dag_no}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{t('হস্তান্তরিত অংশ', 'Share')}</span>
                  <strong className="text-slate-900">{selectedMutation.share_fraction}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{t('নামজারি জমির আয়তন', 'Area')}</span>
                  <strong className="text-[#006A4E]">{toBanglaDigits(selectedMutation.area_decimal, lang)} {t('শতক', 'dec')}</strong>
                </div>
              </div>
            </div>

            {/* Hearing Notes & Order Textarea with Quick Remark Chips */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {t('সহকারী কমিশনার (ভূমি) এর রায় ও আদেশের বিবরণ:*', 'Order Sheet & Decision Rationale:*')}
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  {t('ক্লিক করে দ্রুত মন্তব্য যুক্ত করুন:', 'Quick remarks:')}
                </span>
              </div>

              {/* Predefined Ergonomic Remark Chips */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[
                  { text: 'বায়া দলিল, আরএস/বিএস নকশা ও সরেজমিন সীমানা সঠিক পাওয়া গেছে।', label: '✓ কাগজপত্র ও সীমানা সঠিক' },
                  { text: 'সরেজমিন তদন্তে আবেদনকারীর বৈধ দখল ও সীমানা নিশ্চিত হয়েছে।', label: '✓ দখল আবেদনকারীর অনুকূলে' },
                  { text: 'বায়া দলিলে উল্লেখিত হিস্যার সাথে সাবেক রেকর্ডের গরমিল ও ঘাটতি পরিলক্ষিত হয়েছে।', label: '⚠ হিস্যা ও রেকর্ডে গড়মিল' },
                  { text: 'হাল সনের ভূমি উন্নয়ন কর (LDT) বকেয়া থাকায় কর পরিশোধের নির্দেশ দেওয়া হলো।', label: '⚠ উন্নয়ন কর বকেয়া' },
                  { text: 'বিজ্ঞ আদালতের দেওয়ানি মোকদ্দমায় নিষেধাজ্ঞা থাকায় আবেদন স্থগিত করা হলো।', label: '⚠ দেওয়ানি নিষেধাজ্ঞা' },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setMutationDecisionNotes((prev) => (prev ? `${prev} ${chip.text}` : chip.text));
                    }}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 text-[11px] font-semibold text-slate-700 transition cursor-pointer"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={mutationDecisionNotes}
                onChange={(e) => setMutationDecisionNotes(e.target.value)}
                placeholder={t(
                  'বায়া দলিল, আরএস/বিএস নকশা ও সরেজমিন মাঠ প্রতিবেদন নিরীক্ষা করা হলো। আবেদনকারীর অনুকূলে নামজারি মঞ্জুর এবং পৃথক খতিয়ান সৃজনের আদেশ দেওয়া হলো...',
                  'Enter official magistrate order notes...'
                )}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedMutation(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                {t('বাতিল', 'Cancel')}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={decisionLoading}
                  onClick={() => handleDecideMutation('REJECTED')}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{t('নামজারি নামঞ্জুর', 'Reject Mutation')}</span>
                </button>
                <button
                  type="button"
                  disabled={decisionLoading}
                  onClick={() => handleDecideMutation('APPROVED')}
                  className="px-5 py-2 rounded-lg bg-[#006A4E] hover:bg-[#00523C] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('অনুমোদন ও নতুন খতিয়ান সৃজন', 'Approve & Issue Khatian')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CENTER POPUP MODAL: KHATIAN RECONCILIATION ORDER                          */}
      {/* ========================================================================= */}
      {selectedKhatian && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#006A4E]" />
                <span>{t('খতিয়ান রেকর্ড শুদ্ধিপত্র ও অমিল নিরসন', 'Reconcile Khatian Record')}</span>
              </h3>
              <button
                onClick={() => setSelectedKhatian(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReconcileKhatian} className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                <strong>দাগ নং {selectedKhatian.dag_no} ({selectedKhatian.mouza_bn}):</strong>{' '}
                {selectedKhatian.anomaly_note_bn || 'আরএস ও বিএস রেকর্ডের মধ্যে ক্ষেত্রফল সমন্বয় আবশ্যক।'}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('সংশোধিত ও চূড়ান্ত বৈধ জমির পরিমাণ (শতক)*', 'Reconciled Valid Area (Decimal)*')}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={khatianReconcileArea}
                  onChange={(e) => setKhatianReconcileArea(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('সহকারী কমিশনার (ভূমি) এর শুদ্ধিপত্র আদেশ নোট:*', 'Magistrate Order & Correction Rationale:*')}
                </label>
                <textarea
                  rows={3}
                  required
                  value={khatianReconcileNotes}
                  onChange={(e) => setKhatianReconcileNotes(e.target.value)}
                  placeholder="জরিপ নকশা ও বায়া রেকর্ড পর্যালোচনায় আরএস দাগের ১৮ শতক বহাল রেখে শুদ্ধিপত্র প্রদান করা হলো..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedKhatian(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  {t('বাতিল', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={decisionLoading}
                  className="px-5 py-2 rounded-lg bg-[#006A4E] hover:bg-[#00523C] text-white font-bold transition shadow-xs cursor-pointer"
                >
                  {t('শুদ্ধিপত্র কার্যকর করুন', 'Issue Correction Order')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CENTER POPUP MODAL: DISPUTE HEARING ORDER                                 */}
      {/* ========================================================================= */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Gavel className="w-5 h-5 text-blue-700" />
                <span>{t('আপত্তি ও মিস-কেস শুনানি আদেশ', 'Dispute Hearing Order')}</span>
              </h3>
              <button
                onClick={() => setSelectedDispute(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1 p-3 bg-slate-50 rounded-lg border">
              <div><strong>কেস নং:</strong> {selectedDispute.case_no}</div>
              <div><strong>আপত্তিকারী:</strong> {selectedDispute.complainant_name_bn}</div>
              <div><strong>দাগ নং:</strong> {selectedDispute.dag_no || selectedDispute.plot_id} ({selectedDispute.mouza_bn})</div>
              <div><strong>অভিযোগ:</strong> {selectedDispute.description_bn}</div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {t('আদালতের সিদ্ধান্ত ও আদেশ:*', 'Tribunal Order Notes:*')}
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  {t('দ্রুত আদেশ নির্বাচন:', 'Quick orders:')}
                </span>
              </div>

              {/* Predefined Dispute Remark Chips */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[
                  { text: 'উভয় পক্ষের শুনানি ও নথিপত্র পর্যালোচনায় আপত্তিকারীর দাবি ভিত্তিহীন প্রমাণিত হওয়ায় আপত্তি খারিজ করা হলো।', label: '✓ আপত্তি খারিজ ও নিষ্পত্তি' },
                  { text: 'বিজ্ঞ সিনিয়র সহকারী জজ আদালতে স্বত্ব মোকদ্দমা চলমান থাকায় বিক্রয় ও নামজারি সাময়িক স্থগিতাদেশ বহাল রাখা হলো।', label: '⚠ দেওয়ানি মোকদ্দমায় স্থগিতাদেশ' },
                  { text: 'আপত্তিকারী স্বত্ব প্রমাণের পর্যাপ্ত বায়া দলিল দাখিল করতে ব্যর্থ হয়েছেন।', label: '⚠ প্রমাণকের ঘাটতি' },
                  { text: 'সরেজমিন সীমানা পরিদর্শনে আবেদনকারী ও প্রতিপক্ষের শান্তিপূর্ণ সহাবস্থান প্রমাণিত হয়েছে।', label: '✓ শান্তিপূর্ণ সহাবস্থান' },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setDisputeNotes((prev) => (prev ? `${prev} ${chip.text}` : chip.text));
                    }}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300 border border-slate-200 text-[11px] font-semibold text-slate-700 transition cursor-pointer"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={disputeNotes}
                onChange={(e) => setDisputeNotes(e.target.value)}
                placeholder="উভয় পক্ষের শুনানিতে দেওয়ানি স্বত্ব মামলার মোকদ্দমা চলমান থাকায় সাময়িক স্থগিতাদেশ বহাল রাখা হলো..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setSelectedDispute(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
              >
                {t('বাতিল', 'Cancel')}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={decisionLoading}
                  onClick={() => handleResolveDispute('RESOLVED')}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs cursor-pointer"
                >
                  {t('আপত্তি নিষ্পত্তি', 'Dismiss / Resolve')}
                </button>
                <button
                  type="button"
                  disabled={decisionLoading}
                  onClick={() => handleResolveDispute('RESOLVED_FROZEN')}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-xs cursor-pointer"
                >
                  {t('বিক্রয় স্থগিতাদেশ বহাল', 'Freeze Plot Sale')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CENTER POPUP MODAL: NEW FIELD REPORT                                      */}
      {/* ========================================================================= */}
      {isNewFieldReportOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#006A4E]" />
                <span>{t('নতুন মাঠ পরিদর্শন প্রতিবেদন দাখিল', 'Submit Field Inspection Report')}</span>
              </h3>
              <button
                onClick={() => setIsNewFieldReportOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFieldReport} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('পরিদর্শনের জমি / দাগ নির্বাচন করুন*', 'Select Plot*')}
                </label>
                <select
                  required
                  value={fieldForm.plot_id}
                  onChange={(e) => setFieldForm({ ...fieldForm, plot_id: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-medium focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                >
                  <option value="">{t('-- জমি ও দাগ নির্বাচন করুন --', '-- Select Plot --')}</option>
                  {plots.map((p) => (
                    <option key={p.id} value={p.id}>
                      দাগ নং {p.dag_no_bn || p.dag_no} · {p.mouza_bn} ({p.area_decimal} শতক)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('দখল স্থিতি', 'Possession')}</label>
                  <select
                    value={fieldForm.possession_status}
                    onChange={(e) => setFieldForm({ ...fieldForm, possession_status: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    <option value="VERIFIED">VERIFIED (দখল নিশ্চিত)</option>
                    <option value="CONTESTED">CONTESTED (দখল বিতর্কিত)</option>
                    <option value="UNOCCUPIED">UNOCCUPIED (পতিত)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('সীমানা স্থিতি', 'Boundary')}</label>
                  <select
                    value={fieldForm.boundary_status}
                    onChange={(e) => setFieldForm({ ...fieldForm, boundary_status: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    <option value="MATCHED">MATCHED (নকশা মিলেছে)</option>
                    <option value="DISPUTED">DISPUTED (সীমানা বিরোধ)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ভূমি কর', 'Tax Status')}</label>
                  <select
                    value={fieldForm.tax_status}
                    onChange={(e) => setFieldForm({ ...fieldForm, tax_status: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    <option value="PAID">PAID (পরিশোধিত)</option>
                    <option value="DUE">DUE (বকেয়া)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('সরেজমিন পর্যবেক্ষণ ও রিপোর্ট বিবরণ:*', 'Inspection Findings & Evidence:*')}
                </label>
                <textarea
                  rows={3}
                  required
                  value={fieldForm.remarks}
                  onChange={(e) => setFieldForm({ ...fieldForm, remarks: e.target.value })}
                  placeholder="জমির সরেজমিন সীমানা ও দখল আবেদনকারীর অনুকূলে পাওয়া গেছে..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewFieldReportOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  {t('বাতিল', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={decisionLoading}
                  className="px-5 py-2 rounded-lg bg-[#006A4E] hover:bg-[#00523C] text-white font-bold transition shadow-xs cursor-pointer"
                >
                  {t('প্রতিবেদন জমা দিন', 'Submit Report')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CENTER POPUP MODAL: NEW SLA ESCALATION                                    */}
      {/* ========================================================================= */}
      {isNewSlaOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-amber-600" />
                <span>{t('কেস সময়সীমা তাগিদ নোটিশ', 'Issue SLA Escalation Notice')}</span>
              </h3>
              <button
                onClick={() => setIsNewSlaOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSla} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('কেস বা নথি নম্বর*', 'Case Reference Number*')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: MUT-2026-0008"
                  value={slaForm.case_reference}
                  onChange={(e) => setSlaForm({ ...slaForm, case_reference: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('দায়িত্বপ্রাপ্ত পদ', 'Target Role')}</label>
                  <select
                    value={slaForm.target_role}
                    onChange={(e) => setSlaForm({ ...slaForm, target_role: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    <option value="land_office_assistant">ভূমি সহকারী কর্মকর্তা</option>
                    <option value="field_verification_officer">মাঠ সার্ভেয়ার / কানুনগো</option>
                    <option value="ac_land">সহকারী কমিশনার (ভূমি)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('অগ্রাধিকার', 'Priority')}</label>
                  <select
                    value={slaForm.priority}
                    onChange={(e) => setSlaForm({ ...slaForm, priority: e.target.value as any })}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    <option value="LOW">LOW (স্বাভাবিক)</option>
                    <option value="NORMAL">NORMAL (প্রমিত)</option>
                    <option value="HIGH">HIGH (জরুরি)</option>
                    <option value="URGENT">URGENT (অতি জরুরি)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('প্রত্যাশিত নিষ্পত্তির তারিখ', 'Target Date')}</label>
                <input
                  type="date"
                  value={slaForm.due_at}
                  onChange={(e) => setSlaForm({ ...slaForm, due_at: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('তাগিদ আদেশের বিবরণ', 'Directive Notes')}</label>
                <textarea
                  rows={2}
                  value={slaForm.notes_bn}
                  onChange={(e) => setSlaForm({ ...slaForm, notes_bn: e.target.value })}
                  placeholder="নাগরিক ভোগান্তি লাঘবে ৩ কার্যদিবসের মধ্যে প্রতিবেদন দাখিল করুন..."
                  className="w-full p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewSlaOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  {t('বাতিল', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={decisionLoading}
                  className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition shadow-xs cursor-pointer"
                >
                  {t('তাগিদ প্রেরণ', 'Dispatch')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
