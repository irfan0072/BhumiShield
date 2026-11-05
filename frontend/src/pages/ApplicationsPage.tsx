import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building2,
  Users,
  Search,
  Scale,
  QrCode,
  FileSpreadsheet,
  Calendar,
  DollarSign,
  ChevronRight,
  X,
  History,
  Info,
  Lock,
  ArrowLeft,
  Download,
  FileCheck2,
  Printer,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { BhumiApi } from '../api/client';
import { useAppUI } from '../i18n';
import { toBanglaDigits, maskNid } from '../theme/tokens';
import { triggerAppNotification } from '../components/NotificationCenter';
import { CitizenDcrPorchaModal } from '../components/CitizenDcrPorchaModal';
import { JargonTooltip } from '../components/JargonTooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ApplicationsPageProps {
  onNavigate?: (tab: string) => void;
}

export const ApplicationsPage: React.FC<ApplicationsPageProps> = ({ onNavigate }) => {
  const { lang, t, user, role } = useAppUI();

  // URL state synchronization
  const searchParams = new URLSearchParams(window.location.search);
  const initialNew = searchParams.get('new') === '1';
  const initialId = searchParams.get('id') || '';

  const [activeView, setActiveView] = useState<'list' | 'create' | 'detail'>(() => {
    if (initialNew) return 'create';
    if (initialId) return 'detail';
    return 'list';
  });

  const [transfers, setTransfers] = useState<any[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [dcrPorchaModalOpen, setDcrPorchaModalOpen] = useState(false);
  const [subStepsOpen, setSubStepsOpen] = useState(false);
  const [dcrPorchaDefaultDoc, setDcrPorchaDefaultDoc] = useState<'DCR' | 'PORCHA'>('DCR');
  const [dcrPorchaTransfer, setDcrPorchaTransfer] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredTransfers = useMemo(() => {
    if (statusFilter === 'ALL') return transfers;
    return transfers.filter((item: any) => item.status === statusFilter);
  }, [transfers, statusFilter]);

  const handleCopyTracking = (code: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const getActionableGuidance = (item: any) => {
    const step = Number(item.current_step || 1);
    const status = item.status || 'PROCESSING';
    const isCompleted = status === 'COMPLETED' || step >= 12;

    if (isCompleted) {
      return {
        tier: 'DONE',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        dotClass: 'bg-emerald-500',
        labelBn: '🟢 কার্যক্রম সম্পূর্ণ সম্পন্ন',
        labelEn: '🟢 Fully Completed',
        descBn: 'খতিয়ান ও ডিসিআর ডাউনলোড প্রস্তুত',
        descEn: 'Khatian & DCR ready for download',
      };
    }

    if (step === 8) {
      return {
        tier: 'ATTENDANCE_REQUIRED',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse',
        dotClass: 'bg-rose-500',
        labelBn: '🔴 স্বশরীরে হাজিরা আবশ্যক',
        labelEn: '🔴 In-Person Attendance Required',
        descBn: 'সাব-রেজিস্ট্রি কাউন্টারে বায়োমেট্রিক ও সশরীরে উপস্থিতি',
        descEn: 'Biometric verification required at Sub-Registry Office',
      };
    }

    if (step === 1 || step === 3 || step === 7) {
      return {
        tier: 'ACTION_NEEDED',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        dotClass: 'bg-amber-500',
        labelBn: '🟡 আপনার পদক্ষেপ প্রয়োজন',
        labelEn: '🟡 Action Needed from You',
        descBn: step === 3
          ? 'ক্রেতার সম্মতি ও মূল্য অনুমোদন প্রয়োজন'
          : step === 7
          ? 'সাব-রেজিস্ট্রি অ্যাপয়েন্টমেন্ট তারিখ নির্বাচন করুন'
          : 'বিক্রেতা সম্মতি প্রয়োজন',
        descEn: step === 3
          ? 'Buyer confirmation required'
          : step === 7
          ? 'Select registry appointment date'
          : 'Seller confirmation required',
      };
    }

    return {
      tier: 'OFFICIAL_REVIEW',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
      dotClass: 'bg-blue-500',
      labelBn: '🟢 দাপ্তরিক পর্যালোচনায়',
      labelEn: '🟢 In Official Review',
      descBn: 'কর্তৃপক্ষ কর্তৃক স্বয়ংক্রিয় ও মাঠ পর্যায়ের যাচাই চলছে',
      descEn: 'Under administrative review by competent authority',
    };
  };

  // Create form state
  const [ownedPlots, setOwnedPlots] = useState<any[]>([]);
  const [selectedPlotId, setSelectedPlotId] = useState<number | ''>('');
  const [deedType, setDeedType] = useState<string>('SALE');
  const [transferArea, setTransferArea] = useState<string>('');
  const [proposedPrice, setProposedPrice] = useState<string>('');
  const [buyerNid, setBuyerNid] = useState<string>('');
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerPhone, setBuyerPhone] = useState<string>('');
  const [buyerRelation, setBuyerRelation] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');

  // Buyer confirmation action
  const [advancing, setAdvancing] = useState<boolean>(false);
  const [advanceError, setAdvanceError] = useState<string>('');

  // Load transfers list
  const loadTransfers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await BhumiApi.listTransfers();
      const list = Array.isArray(res) ? res : res.items || [];
      setTransfers(list);

      // If an initialId was in URL, find and select it
      if (initialId) {
        const found = list.find((item: any) => String(item.id) === initialId || item.transfer_code === initialId || item.tracking_number === initialId);
        if (found) {
          loadTransferDetail(found.transfer_code || found.tracking_number || found.id);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message_bn || err?.message || t('আবেদন তালিকা লোড করা যায়নি।', 'Failed to load applications.'));
    } finally {
      setLoading(false);
    }
  };

  // Load single transfer details
  const loadTransferDetail = async (idOrCode: string | number) => {
    try {
      const res = await BhumiApi.getTransfer(idOrCode);
      setSelectedTransfer(res);
      setActiveView('detail');
      // Update browser URL query without reload
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('id', String(res.transfer_code || res.tracking_number || res.id));
      currentUrl.searchParams.delete('new');
      window.history.pushState({}, '', currentUrl.toString());
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message_bn || err?.message || t('আবেদনের বিস্তারিত লোড করা যায়নি।', 'Failed to load application details.'));
    }
  };

  // Load owned plots for the creation form
  const loadOwnedPlots = async () => {
    try {
      const res = await BhumiApi.getMyVault();
      const plots = (res?.owned_plots || []).map((p: any) => ({ ...p, owner_area_decimal: p.owner_area_decimal ?? p.area_decimal ?? p.share_area_decimal ?? 0 }));
      setOwnedPlots(plots);
      if (plots.length > 0 && selectedPlotId === '') {
        const fromMap = Number(new URLSearchParams(window.location.search).get('map_plot_id'));
        const matching = plots.find((p: any) => Number(p.plot_id || p.id) === fromMap);
        if (fromMap && !matching) {
          setFormError(t('ম্যাপে বাছা জমিটি আপনার মালিকানার তালিকায় নেই। নিজের জমি নির্বাচন করুন অথবা রেকর্ড যুক্ত করার সহায়তা নিন।', 'The selected map parcel is not in your land portfolio. Choose your own land or request record-linking assistance.'));
          return;
        }
        const chosen = matching || plots[0];
        setSelectedPlotId(Number(chosen.plot_id || chosen.id));
        if (chosen.owner_area_decimal) {
          setTransferArea(String(chosen.owner_area_decimal));
        }
      }
    } catch {
      setOwnedPlots([]);
      setFormError(t('নিজের জমির তালিকা লোড হয়নি। পুনরায় চেষ্টা করুন; অন্যের জমি বিকল্প হিসেবে দেখানো হয় না।', 'Your land records could not load. Please retry.'));
    }
  };

  useEffect(() => {
    loadTransfers();
    loadOwnedPlots();
  }, []);

  // Sync state if browser back/forward buttons clicked
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const isNew = params.get('new') === '1';
      const id = params.get('id');
      if (isNew) {
        setActiveView('create');
      } else if (id) {
        loadTransferDetail(id);
      } else {
        setActiveView('list');
        setSelectedTransfer(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Selected plot helper
  const selectedPlotObj = useMemo(() => {
    return ownedPlots.find((p) => Number(p.plot_id || p.id) === Number(selectedPlotId));
  }, [ownedPlots, selectedPlotId]);

  // Handle Form Submission
  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!selectedPlotId) {
      setFormError(t('অনুগ্রহ করে একটি জমির প্লট নির্বাচন করুন।', 'Please select a land plot.'));
      return;
    }
    const areaNum = parseFloat(transferArea);
    if (isNaN(areaNum) || areaNum <= 0) {
      setFormError(t('হস্তান্তরকৃত জমির পরিমাণ শূন্যের বেশি হতে হবে।', 'Transfer area must be greater than zero.'));
      return;
    }
    if (!selectedPlotObj || areaNum > Number(selectedPlotObj.owner_area_decimal ?? 0)) {
      setFormError(t('হস্তান্তরের পরিমাণ আপনার রেকর্ডভুক্ত মালিকানার অংশের বেশি হতে পারে না।', 'Transfer area cannot exceed your recorded ownership share.'));
      return;
    }
    const priceNum = parseInt(proposedPrice, 10);
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError(t('প্রস্তাবিত মূল্য সঠিক সংখ্যা হতে হবে।', 'Proposed price must be a valid number.'));
      return;
    }
    if (!buyerNid || buyerNid.trim().length < 10) {
      setFormError(t('ক্রেতার সঠিক ১০ বা ১৭ ডিজিটের জাতীয় পরিচয়পত্র (NID) নম্বর দিন।', 'Enter a valid 10 or 17-digit buyer NID.'));
      return;
    }

    setFormSubmitting(true);
    try {
      const payload: any = {
        plot_id: Number(selectedPlotId),
        deed_type: deedType,
        transfer_area_decimal: areaNum,
        proposed_price_bdt: priceNum,
        buyer_nid: buyerNid.trim(),
        buyer_name: buyerName.trim() || undefined,
        buyer_phone: buyerPhone.trim() || undefined,
        buyer_relation: buyerRelation.trim() || undefined,
        notes_bn: `নাগরিক পোর্টাল থেকে ${deedType} দলিলের হস্তান্তর আবেদন দাখিল করা হয়েছে।`,
      };

      const res = await BhumiApi.createTransfer(payload);
      const trackingCode = res.transfer_code || res.tracking_number || (res.id ? `TR-${res.id}` : 'TR');

      setFormSuccess(t(`আবেদন সফলভাবে গৃহীত হয়েছে! ট্র্যাকিং নং: ${trackingCode}`, `Application submitted successfully! Tracking No: ${trackingCode}`));

      triggerAppNotification({
        title_bn: 'হস্তান্তর আবেদন দাখিল সম্পন্ন',
        title_en: 'Transfer Application Submitted',
        message_bn: `ট্র্যাকিং নম্বর ${trackingCode} দিয়ে আবেদন সংরক্ষিত হয়েছে।`,
        message_en: `Transfer request registered with tracking code ${trackingCode}.`,
        type: 'SUCCESS',
        targetTab: 'applications',
      });

      // Reload list and switch to detail view
      await loadTransfers();
      if (res.id || res.transfer_code || res.tracking_number) {
        await loadTransferDetail(res.transfer_code || res.tracking_number || res.id);
      } else {
        setActiveView('list');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message_bn || err?.response?.data?.error || err?.message || t('আবেদন সংরক্ষণ ব্যর্থ হয়েছে।', 'Failed to submit application.');
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const [advanceNotes, setAdvanceNotes] = useState('');
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  // Universal State Machine Step Advancement
  const handleAdvanceStep = async (extraPayload: any = {}) => {
    if (!selectedTransfer) return;
    setAdvancing(true);
    setAdvanceError('');
    try {
      const targetStep = selectedTransfer.current_step + 1;
      const defaultNotes = targetStep >= 9
        ? 'সরেজমিন ও আইনি পর্যালোচনা সম্পন্ন পূর্বক পরবর্তী ধাপে অনুমোদন প্রদান করা হলো।'
        : `ধাপ ${targetStep} এর কার্যক্রম পর্যালোচনাপূর্বক অনুমোদন করা হলো।`;
      const notes = advanceNotes || defaultNotes;

      await BhumiApi.advanceTransfer(selectedTransfer.id, {
        target_step: targetStep,
        notes_bn: notes,
        ...extraPayload,
      });

      triggerAppNotification({
        title_bn: 'হস্তান্তর প্রক্রিয়ার অগ্রগতি',
        title_en: 'Transfer Step Advanced',
        message_bn: `আবেদন ${selectedTransfer.transfer_code || selectedTransfer.id} সফলভাবে পরবর্তী ধাপে উন্নীত হয়েছে।`,
        message_en: `Application ${selectedTransfer.transfer_code || selectedTransfer.id} advanced to step ${targetStep}.`,
        type: 'SUCCESS',
        targetTab: 'applications',
      });

      setAdvanceNotes('');
      await loadTransferDetail(selectedTransfer.id);
    } catch (err: any) {
      setAdvanceError(err?.response?.data?.message_bn || err?.response?.data?.error || err?.message || t('অনুমোদন প্রক্রিয়া ব্যর্থ হয়েছে।', 'Action failed.'));
    } finally {
      setAdvancing(false);
    }
  };

  // Buyer Confirmation Action (Step 4)
  const handleBuyerConfirm = async () => {
    if (!selectedTransfer) return;
    setAdvancing(true);
    setAdvanceError('');
    try {
      await BhumiApi.advanceTransfer(selectedTransfer.id, {
        target_step: 4,
        notes_bn: 'ক্রেতা জমি হস্তান্তর শর্ত ও পরিমাণ অনুমোদন করেছেন।',
      });

      triggerAppNotification({
        title_bn: 'ক্রেতা কর্তৃক হস্তান্তর নিশ্চিতকরণ',
        title_en: 'Buyer Confirmation Recorded',
        message_bn: `আবেদন ${selectedTransfer.transfer_code || selectedTransfer.id} ক্রেতা কর্তৃক অনুমোদিত হয়েছে।`,
        message_en: `Application ${selectedTransfer.transfer_code || selectedTransfer.id} confirmed by buyer.`,
        type: 'SUCCESS',
        targetTab: 'applications',
      });

      await loadTransferDetail(selectedTransfer.id);
    } catch (err: any) {
      setAdvanceError(err?.response?.data?.message_bn || err?.response?.data?.error || err?.message || t('অনুমোদন প্রক্রিয়া ব্যর্থ হয়েছে।', 'Buyer confirmation failed.'));
    } finally {
      setAdvancing(false);
    }
  };

  // View navigation switchers
  const switchToList = () => {
    setActiveView('list');
    setSelectedTransfer(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('id');
    url.searchParams.delete('new');
    window.history.pushState({}, '', url.toString());
  };

  const switchToCreate = () => {
    setActiveView('create');
    setSelectedTransfer(null);
    setFormError('');
    setFormSuccess('');
    const url = new URL(window.location.href);
    url.searchParams.set('new', '1');
    url.searchParams.delete('id');
    window.history.pushState({}, '', url.toString());
  };

  const STAGES_MAP = [
    { step: 1, stage: 'START', nameBn: 'খসড়া সংরক্ষিত', nameEn: 'Draft Created' },
    { step: 2, stage: 'START', nameBn: 'বিক্রেতা নিশ্চিত', nameEn: 'Seller Confirmed' },
    { step: 3, stage: 'START', nameBn: 'উভয় পক্ষের তথ্য', nameEn: 'Parties Verified' },
    { step: 4, stage: 'VERIFY', nameBn: 'ক্রেতা নিশ্চিতকরণ', nameEn: 'Buyer Confirmed' },
    { step: 5, stage: 'VERIFY', nameBn: 'স্বয়ংক্রিয় প্রি-চেক', nameEn: 'Automated Pre-Check' },
    { step: 6, stage: 'VERIFY', nameBn: 'শুল্ক ও ফি নির্ধারণ', nameEn: 'Fee Assessment' },
    { step: 7, stage: 'REGISTER', nameBn: 'রেজিস্ট্রি অ্যাপয়েন্টমেন্ট', nameEn: 'Registry Appointment' },
    { step: 8, stage: 'REGISTER', nameBn: 'রেজিস্ট্রি অফিসে পাঠানো', nameEn: 'Sent to Registry' },
    { step: 9, stage: 'REGISTER', nameBn: 'বায়োমেট্রিক ম্যাচ ও সম্পাদন', nameEn: 'Biometric & Deed Exec' },
    { step: 10, stage: 'REVIEW', nameBn: 'দলিল রেজিস্ট্রিকৃত', nameEn: 'Deed Registered' },
    { step: 11, stage: 'REVIEW', nameBn: 'ই-নামজারি কিউ', nameEn: 'e-Mutation Queued' },
    { step: 12, stage: 'REVIEW', nameBn: 'শুনানি ও তদন্ত', nameEn: 'Hearing & Field Check' },
    { step: 13, stage: 'DONE', nameBn: 'মালিকানা হস্তান্তর সম্পন্ন', nameEn: 'Transfer Completed' },
  ];

  const MAJOR_PHASES = [
    {
      id: 1,
      phaseNo: '১',
      nameBn: '১. আবেদন ও মাঠ পরিদর্শন',
      nameEn: 'Phase 1: Application & Field Inspection',
      subtitleBn: 'বিক্রেতার প্রস্তাব, ক্রেতার সম্মতি, সহ-মালিক যাচাই ও সরেজমিন পরিদর্শন (ধাপ ১-৬)',
      subtitleEn: 'Seller proposal, buyer consent, co-owner check & field inspection (Steps 1-6)',
      steps: [1, 2, 3, 4, 5, 6],
      icon: Users,
    },
    {
      id: 2,
      phaseNo: '২',
      nameBn: '২. দলিল সম্পাদন ও নিবন্ধন',
      nameEn: 'Phase 2: Deed Execution & Registration',
      subtitleBn: 'তারিখ বুকিং, বায়োমেট্রিক উপস্থিতি ও সরকারি দলিল নিবন্ধন (ধাপ ৭-১০)',
      subtitleEn: 'Appointment booking, biometric attendance & deed registration (Steps 7-10)',
      steps: [7, 8, 9, 10],
      icon: Building2,
    },
    {
      id: 3,
      phaseNo: '৩',
      nameBn: '৩. নামজারি ও চূড়ান্ত খতিয়ান',
      nameEn: 'Phase 3: e-Mutation & Final Porcha',
      subtitleBn: 'সহকারী কমিশনার (ভূমি) শুনানী, নামজারি অনুমোদন ও ডিজিটাল ডিসিআর ও পর্চা হস্তান্তর (ধাপ ১১-১৩)',
      subtitleEn: 'AC Land hearing, mutation order & digital DCR/Porcha delivery (Steps 11-13)',
      steps: [11, 12, 13],
      icon: FileCheck2,
    },
  ];

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden space-y-3">
      {/* Global Error Banner with Retry */}
      {errorMsg && (
        <Alert variant="destructive" className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <AlertDescription className="font-medium text-rose-900">{errorMsg}</AlertDescription>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => loadTransfers()}
              className="h-8 px-3 text-xs font-bold"
            >
              {t('পুনরায় চেষ্টা করুন', 'Retry')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setErrorMsg('')}
              className="h-7 w-7 text-rose-600 hover:bg-rose-100"
              aria-label={t('বন্ধ করুন', 'Close')}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </Alert>
      )}

      {/* VIEW 1: CREATE NEW APPLICATION */}
      {activeView === 'create' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs max-w-4xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#006A4E]" />
                <span>{t('নতুন হস্তান্তর আবেদন', 'New Transfer Application')}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {t(
                  'দাগ নম্বর ও ক্রেতার এনআইডি প্রদান করে আবেদন দাখিল করুন।',
                  'Enter plot number and buyer NID to submit application.'
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={switchToList}
              className="h-8 px-3 rounded-xl border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('তালিকায় ফিরুন', 'Back to List')}</span>
            </Button>
          </div>

          {formError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleCreateTransfer} className="space-y-6">
            {/* Step 1: Select Plot */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t('১. জমি নির্বাচন', '1. Select Land Plot')} <span className="text-red-500">*</span>
              </label>

              {ownedPlots.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  {t(
                    'আপনার প্রোফাইলে কোনো নিবন্ধিত জমির রেকর্ড পাওয়া যায়নি। অনুগ্রহ করে পূর্বে আপনার জমি ভল্টে যুক্ত করুন।',
                    'No registered plots found in your vault. Please add property to your vault first.'
                  )}
                </div>
              ) : (
                <Select
                  value={selectedPlotId ? String(selectedPlotId) : 'NONE'}
                  onValueChange={(val) => {
                    if (val === 'NONE') {
                      setSelectedPlotId('');
                      return;
                    }
                    const id = Number(val);
                    setSelectedPlotId(id);
                    const found = ownedPlots.find((p) => Number(p.plot_id || p.id) === id);
                    if (found && found.owner_area_decimal) {
                      setTransferArea(String(found.owner_area_decimal));
                    }
                  }}
                >
                  <SelectTrigger className="w-full h-11 text-xs">
                    <SelectValue placeholder={t('-- দাগ ও খতিয়ান নির্বাচন করুন --', '-- Select Dag & Khatian --')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">{t('-- দাগ ও খতিয়ান নির্বাচন করুন --', '-- Select Dag & Khatian --')}</SelectItem>
                    {ownedPlots.map((p) => {
                      const id = String(p.plot_id || p.id);
                      const dag = p.dag_no_bn || p.dag_no;
                      const khatian = p.khatian_no_bn || p.khatian_no || 'রেকর্ড';
                      const mouza = p.mouza_bn || p.mouza_en || 'মৌজা';
                      const area = p.owner_area_decimal ?? 0;
                      return (
                        <SelectItem key={id} value={id}>
                          {t(`দাগ নং: ${toBanglaDigits(dag, lang)} | খতিয়ান: ${toBanglaDigits(khatian, lang)} | মৌজা: ${mouza} (আপনার অংশ: ${toBanglaDigits(area, lang)} শতক)`, `Dag: ${dag} | Khatian: ${khatian} | Mouza: ${mouza} (Share: ${area} dec)`)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}

              {/* Encumbrance checks feedback banner */}
              {selectedPlotObj && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">{t('দাগ নং', 'Dag No')}</span>
                    <span className="font-bold text-slate-800">{toBanglaDigits(selectedPlotObj.dag_no_bn || selectedPlotObj.dag_no, lang)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">{t('মালিকানার হিস্যা', 'Owner Share')}</span>
                    <span className="font-bold text-emerald-700">
                      {toBanglaDigits(selectedPlotObj.owner_area_decimal ?? 0, lang)} {t('শতক', 'dec')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">{t('বিক্রয় লক', 'Sale Lock')}</span>
                    <span className={`font-bold ${selectedPlotObj.owner_sale_locked ? 'text-red-600' : 'text-emerald-600'}`}>
                      {selectedPlotObj.owner_sale_locked ? t('সক্রিয় (লকড)', 'Locked') : t('মুক্ত (অনলকড)', 'Unlocked')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">{t('ব্যাংক জামানত/লিয়েন', 'Bank Lien')}</span>
                    <span className={`font-bold ${selectedPlotObj.mortgage_status === 'ACTIVE' ? 'text-red-600' : 'text-emerald-600'}`}>
                      {selectedPlotObj.mortgage_status === 'ACTIVE' ? t('বন্ধকযুক্ত', 'Mortgaged') : t('দায়মুক্ত', 'Clear')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Deed Type & Transfer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('দলিলের ধরন', 'Deed Type')} <span className="text-red-500">*</span>
                </Label>
                <Select value={deedType} onValueChange={setDeedType}>
                  <SelectTrigger className="w-full h-10 text-xs">
                    <SelectValue placeholder={t('দলিলের ধরন নির্বাচন করুন', 'Select Deed Type')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SALE">{t('সাফ-কবলা বিক্রয় (SALE)', 'Outright Sale (SALE)')}</SelectItem>
                    <SelectItem value="HEIR">{t('ওয়ারিশান বণ্টন (HEIR)', 'Inheritance Distribution (HEIR)')}</SelectItem>
                    <SelectItem value="GIFT">{t('হেবা / দানপত্র (GIFT)', 'Gift / Hiba (GIFT)')}</SelectItem>
                    <SelectItem value="MORTGAGE">{t('বন্ধক চুক্তি (MORTGAGE)', 'Mortgage Deed (MORTGAGE)')}</SelectItem>
                    <SelectItem value="EXCHANGE">{t('বিনিময় দলিল (EXCHANGE)', 'Exchange Deed (EXCHANGE)')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('হস্তান্তরকৃত জমির পরিমাণ (শতক)', 'Transfer Area (Decimals)')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedPlotObj?.owner_area_decimal ?? 0}
                  value={transferArea}
                  onChange={(e) => setTransferArea(e.target.value)}
                  placeholder="e.g. 10.5"
                  className="w-full text-xs h-10"
                  required
                />
              </div>

              <div>
                <Label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('প্রস্তাবিত মূল্য (টাকা)', 'Proposed Price (BDT)')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="1000"
                  min="0"
                  value={proposedPrice}
                  onChange={(e) => setProposedPrice(e.target.value)}
                  placeholder="e.g. 2500000"
                  className="w-full text-xs h-10"
                  required
                />
              </div>
            </div>

            {/* Step 3: Buyer Information */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <Label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t('২. ক্রেতার তথ্য', '2. Buyer Details')}
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="block text-xs font-medium text-slate-600 mb-1">
                    {t('ক্রেতার জাতীয় পরিচয়পত্র (NID)', 'Buyer National ID (NID)')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={buyerNid}
                    onChange={(e) => setBuyerNid(e.target.value)}
                    placeholder="e.g. 19901234567890123"
                    className="w-full text-xs h-10"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {t('১০ বা ১৭ ডিজিটের এনআইডি দিন।', 'Enter 10 or 17 digit NID.')}
                  </span>
                </div>

                <div>
                  <Label className="block text-xs font-medium text-slate-600 mb-1">
                    {t('ক্রেতার পুরো নাম (ঐচ্ছিক)', 'Buyer Full Name (Optional)')}
                  </Label>
                  <Input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder={t('যেমন: মো: আরিফুল ইসলাম', 'e.g. Md. Ariful Islam')}
                    className="w-full text-xs h-10"
                  />
                </div>

                <div>
                  <Label className="block text-xs font-medium text-slate-600 mb-1">
                    {t('মোবাইল নম্বর (এসএমএস নোটিফিকেশনের জন্য)', 'Mobile Phone (For SMS)')}
                  </Label>
                  <Input
                    type="tel"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full text-xs h-10"
                  />
                </div>

                <div>
                  <Label className="block text-xs font-medium text-slate-600 mb-1">
                    {t('সম্পর্ক (হেবা বা ওয়ারিশ দলিলের ক্ষেত্রে)', 'Relationship (For Gift/Heir Deeds)')}
                  </Label>
                  <Input
                    type="text"
                    value={buyerRelation}
                    onChange={(e) => setBuyerRelation(e.target.value)}
                    placeholder={t('যেমন: পুত্র / কন্যা / ভাই', 'e.g. Son / Daughter / Brother')}
                    className="w-full text-xs h-10"
                  />
                </div>
              </div>
            </div>

            {/* Submission Button */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={switchToList}
                className="h-10 px-4 rounded-xl border-slate-300 text-slate-700 text-xs font-bold"
              >
                {t('বাতিল', 'Cancel')}
              </Button>

              <Button
                type="submit"
                disabled={formSubmitting || (selectedPlotObj && selectedPlotObj.owner_sale_locked)}
                className="inline-flex items-center gap-2 h-10 px-6 rounded-xl bg-[#006A4E] hover:bg-[#00553e] disabled:bg-slate-300 text-white text-xs font-bold shadow-xs"
              >
                {formSubmitting ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>{t('আবেদন জমা হচ্ছে...', 'Submitting Application...')}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('আবেদন দাখিল করুন', 'Submit Application')}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
        </div>
      )}

      {/* VIEW 2: TRANSFER DETAIL & TRACKER */}
      {activeView === 'detail' && selectedTransfer && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden gap-2">
          {/* Post-Completion Celebration Card */}
          {(selectedTransfer.status === 'COMPLETED' || selectedTransfer.current_step >= 12) && (
            <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-emerald-700 via-teal-700 to-[#006A4E] text-white shadow-xs flex flex-wrap items-center justify-between gap-2 shrink-0 border border-emerald-500/40">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center font-bold shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black tracking-tight leading-tight">
                    {t('জমি হস্তান্তর ও ই-নামজারি সম্পন্ন!', 'Land Transfer & e-Mutation Completed!')}
                  </h3>
                  <p className="text-[10px] text-emerald-100/90 leading-none">
                    {t('অনুমোদিত খতিয়ান ও ডিসিআর রসিদ প্রস্তুত। নিচের বোতাম থেকে ডাউনলোড করুন।', 'Government verified BS Khatian and official DCR receipt ready.')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setDcrPorchaTransfer(selectedTransfer);
                    setDcrPorchaDefaultDoc('DCR');
                    setDcrPorchaModalOpen(true);
                  }}
                  className="h-7 px-2.5 rounded-lg bg-white text-[#006A4E] hover:bg-emerald-50 text-[10px] font-black shadow-2xs flex items-center gap-1"
                >
                  <Download className="w-3 h-3 text-[#006A4E]" />
                  <span>{t('ডিজিটাল ডিসিআর (DCR)', 'Digital DCR')}</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setDcrPorchaTransfer(selectedTransfer);
                    setDcrPorchaDefaultDoc('PORCHA');
                    setDcrPorchaModalOpen(true);
                  }}
                  className="h-7 px-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-black shadow-2xs flex items-center gap-1"
                >
                  <Download className="w-3 h-3 text-slate-950" />
                  <span>{t('বিএস খতিয়ান পর্চা', 'BS Porcha')}</span>
                </Button>
              </div>
            </div>
          )}

          {/* 1. Integrated Header & Top Strip */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-2 sm:p-2.5 shadow-2xs shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={switchToList}
                className="h-6 px-2 rounded-md border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1 hover:bg-slate-100 cursor-pointer mr-0.5"
                title={t('তালিকায় ফিরুন', 'Back to List')}
              >
                <ArrowLeft className="w-3 h-3" />
                <span className="hidden sm:inline">{t('তালিকায় ফিরুন', 'Back')}</span>
              </Button>

              <Badge variant="outline" className="px-2 py-0.5 rounded-md bg-emerald-50 border-emerald-200 text-[#006A4E] text-[11px] font-black font-mono">
                {selectedTransfer.transfer_code || selectedTransfer.tracking_number || `TR-${selectedTransfer.id}`}
              </Badge>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => handleCopyTracking(selectedTransfer.transfer_code || selectedTransfer.tracking_number || `TR-${selectedTransfer.id}`, e)}
                className="h-6 px-1.5 rounded-md border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold"
                title={t('ট্র্যাকিং কোড কপি করুন', 'Copy Tracking Code')}
              >
                {copiedCode === (selectedTransfer.transfer_code || selectedTransfer.tracking_number || `TR-${selectedTransfer.id}`) ? (
                  <>
                    <Check className="w-2.5 h-2.5 text-emerald-600 mr-1" />
                    <span className="text-emerald-700 text-[9px] font-bold">{t('কপি হয়েছে!', 'Copied!')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-2.5 h-2.5 text-slate-500 mr-1" />
                    <span className="text-[9px] font-bold">{t('কপি', 'Copy')}</span>
                  </>
                )}
              </Button>

              <Badge variant="secondary" className="px-1.5 py-0.5 rounded-md text-slate-700 text-[9px] font-bold uppercase">
                {selectedTransfer.deed_type || 'SALE'}
              </Badge>

              {(() => {
                const guidance = getActionableGuidance(selectedTransfer);
                return (
                  <Badge className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border shadow-2xs ${guidance.badgeClass}`}>
                    {lang === 'bn' ? guidance.labelBn : guidance.labelEn}
                  </Badge>
                );
              })()}

              <span className="text-slate-300 hidden md:inline">|</span>

              <h2 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                {t(
                  `দাগ নং ${toBanglaDigits(selectedTransfer.dag_no_bn || selectedTransfer.dag_no || selectedTransfer.plot?.dag_no_bn || selectedTransfer.plot?.dag_no || selectedTransfer.plot_id, lang)} এর জমি হস্তান্তর প্রক্রিয়া`,
                  `Land Transfer Workflow for Plot Dag ${selectedTransfer.dag_no || selectedTransfer.plot?.dag_no || selectedTransfer.plot_id}`
                )}
              </h2>

              <span className="text-[10px] text-slate-400 hidden lg:inline">
                ({new Date(selectedTransfer.created_at || Date.now()).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US')})
              </span>
            </div>

            {/* Quick stats pill */}
            <div className="flex items-center gap-2.5 bg-slate-50 py-1 px-2.5 rounded-lg border border-slate-200 text-xs shrink-0 self-start md:self-auto">
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-[9px]">{t('হস্তান্তর পরিমাণ:', 'Area:')}</span>
                <span className="font-bold text-emerald-700 text-xs">
                  {toBanglaDigits(selectedTransfer.transfer_area_decimal || '০', lang)} {t('শতক', 'dec')}
                </span>
              </div>
              <div className="w-px h-3.5 bg-slate-200" />
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-[9px]">{t('প্রস্তাবিত মূল্য:', 'Price:')}</span>
                <span className="font-bold text-slate-800 text-xs">
                  ৳ {toBanglaDigits((selectedTransfer.proposed_price_bdt || 0).toLocaleString(), lang)}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Action Ribbon & 3-Phase Stepper */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-2 sm:p-2.5 shadow-2xs shrink-0 space-y-1.5">
            {/* Action Bar (Row 1) */}
            {(() => {
              const currentStep = Number(selectedTransfer.current_step || 1);
              const isBuyer = Boolean(
                selectedTransfer.viewer_is_buyer ||
                (selectedTransfer.parties || []).some((p: any) => p.party_role === 'BUYER' && p.nid === user?.nid)
              );
              const isSeller = Boolean(
                (selectedTransfer.parties || []).some((p: any) => p.party_role === 'SELLER' && p.nid === user?.nid) ||
                selectedTransfer.seller_nid === user?.nid ||
                selectedTransfer.created_by_nid === user?.nid
              );
              const isSubRegistrarRole = ['sub_registrar', 'admin', 'system_admin'].includes(role);
              const isRegistryOfficer = ['sub_registrar', 'registry_data_officer', 'admin', 'system_admin'].includes(role);
              const isAcLandRole = ['ac_land', 'admin', 'system_admin'].includes(role);
              const isAcLandOffice = ['ac_land', 'land_office_assistant', 'field_verification_officer', 'admin', 'system_admin'].includes(role);

              const isMyAction =
                (currentStep === 1 && isSeller) ||
                (currentStep === 2 && isSeller) ||
                (currentStep === 3 && isBuyer) ||
                (currentStep === 5 && (isSeller || !isRegistryOfficer)) ||
                (currentStep === 7 && (isSeller || isBuyer)) ||
                (currentStep === 8 && isRegistryOfficer) ||
                (currentStep === 9 && isSubRegistrarRole) ||
                (currentStep === 10 && isRegistryOfficer) ||
                (currentStep === 11 && isAcLandOffice) ||
                (currentStep === 12 && isAcLandRole);

              if (selectedTransfer.status === 'COMPLETED' || currentStep >= 13) {
                return null;
              }

              return (
                <div
                  className={`rounded-lg px-2.5 py-1.5 border flex flex-col md:flex-row md:items-center justify-between gap-2 ${
                    isMyAction
                      ? 'bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-100/50 border-emerald-400 ring-2 ring-emerald-500/20'
                      : currentStep === 8
                      ? 'bg-purple-50/70 border-purple-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative shrink-0">
                      {isMyAction ? (
                        <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
                        </span>
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span
                        className={`px-2 py-0.2 rounded-md text-[10px] font-black uppercase tracking-wide shrink-0 ${
                          isMyAction
                            ? 'bg-[#006A4E] text-white'
                            : currentStep === 8
                            ? 'bg-purple-100 text-purple-900 border border-purple-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {currentStep === 1 && (isSeller ? t('আপনার পদক্ষেপ প্রয়োজন', 'Action Required') : t('বিক্রেতার পদক্ষেপের অপেক্ষায়', 'Awaiting Seller'))}
                        {currentStep === 2 && (isSeller ? t('আপনার পদক্ষেপ প্রয়োজন', 'Action Required') : t('বিবরণ যাচাই প্রক্রিয়াধীনে', 'Verification in Progress'))}
                        {currentStep === 3 && (isBuyer ? t('জরুরি পদক্ষেপ প্রয়োজন', 'Action Required') : t('ক্রেতার সম্মতির অপেক্ষায়', 'Awaiting Buyer'))}
                        {currentStep === 4 && t('স্বয়ংক্রিয় প্রি-চেক', 'Auto Pre-Check')}
                        {currentStep === 5 && t('সহ-মালিক সম্মতি যাচাই', 'Co-owner Consent')}
                        {currentStep === 6 && t('স্ট্যাম্প ও ফি নির্ধারণ', 'Fee Assessment')}
                        {currentStep === 7 && t('রেজিস্ট্রি অ্যাপয়েন্টমেন্ট', 'Registry Booking')}
                        {currentStep === 8 && (isRegistryOfficer ? t('কাউন্টার বায়োমেট্রিক', 'Counter Biometrics') : t('সশরীরে উপস্থিতি আবশ্যক', 'Attendance Required'))}
                        {currentStep === 9 && (isSubRegistrarRole ? t('দলিল সিল সম্পাদন', 'Deed Execution') : t('স্বাক্ষরের অপেক্ষায়', 'Awaiting Signature'))}
                        {currentStep === 10 && (isRegistryOfficer ? t('নামজারি কিউ প্রেরণ', 'Queue Mutation') : t('নামজারি কিউতে প্রেরণ', 'Queueing'))}
                        {currentStep === 11 && (isAcLandOffice ? t('শুনানি ও তদন্ত অনুমোদন', 'Hearing Approval') : t('শুনানি চলমান', 'Hearing in Progress'))}
                        {currentStep === 12 && (isAcLandRole ? t('চূড়ান্ত নামজারি আদেশ', 'Final Order') : t('চূড়ান্ত আদেশের অপেক্ষায়', 'Awaiting Order'))}
                      </span>

                      <span className="text-[10px] font-bold text-slate-500 bg-white/80 px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                        {t(`ধাপ ${toBanglaDigits(currentStep, lang)} / ১৩`, `Step ${currentStep} of 13`)}
                      </span>

                      <span className="text-xs font-bold text-slate-900 truncate">
                        {currentStep === 1 && t('বিক্রেতা কর্তৃক জমির প্রাথমিক হস্তান্তর আবেদন নিশ্চিতকরণ', 'Seller confirms transfer proposal')}
                        {currentStep === 2 && t('উভয় পক্ষের এনআইডি ও জাতীয় পরিচয় তথ্য রেকর্ড অনুমোদন', 'Confirmation of parties specifications')}
                        {currentStep === 3 && (isBuyer ? t('জমির তফসিল, শতক পরিমাণ ও প্রস্তাবিত বিক্রয় মূল্য অনুমোদন করুন', 'Verify land schedule and price') : t('ক্রেতার সম্মতির অপেক্ষায় রয়েছে — ক্রেতা লগইন করে জমির পরিমাণ ও শর্ত অনুমোদন করবেন।', 'Awaiting buyer confirmation from their account.'))}
                        {currentStep === 4 && t('স্বয়ংক্রিয় প্রতারণা ও দেওয়ানি বিরোধ প্রি-স্ক্যান', 'Automated fraud & lien pre-check')}
                        {currentStep === 5 && t('যৌথ মালিকানাধীন জমির ক্ষেত্রে অন্যান্য অংশীদারদের অনাপত্তি যাচাই', 'Heir & co-owner non-objection')}
                        {currentStep === 6 && t('আইনানুযায়ী স্ট্যাম্প শুল্ক ও রেজিস্ট্রি ফি নির্ধারণ শেষ করুন', 'Statutory fee review completed')}
                        {currentStep === 7 && t('সাব-রেজিস্ট্রি অফিসে সশরীরে উপস্থিতির জন্য সুবিধাজনক তারিখ নির্বাচন করুন', 'Schedule registry appointment')}
                        {currentStep === 8 && t('সাব-রেজিস্ট্রি কাউন্টারে সরাসরি বায়োমেট্রিক ফিঙ্গারপ্রিন্ট ও এনআইডি যাচাই', 'Counter biometric match')}
                        {currentStep === 9 && t('সাব-রেজিস্ট্রার কর্তৃক দলিল অনুমোদন ও ডিজিটাল সরকারি সিল সম্পাদন', 'Deed approval & digital seal')}
                        {currentStep === 10 && t('সহকারী কমিশনার (ভূমি) দপ্তরে স্বয়ংক্রিয় নামজারি ফাইল প্রেরণ', 'Queue mutation to AC Land')}
                        {currentStep === 11 && t('সহকারী কমিশনার (ভূমি) দপ্তরে তহশিলদারের সরেজমিন প্রতিবেদন ও শুনানি', 'Hearing and field report')}
                        {currentStep === 12 && t('চূড়ান্ত নামজারি অনুমোদন, সাবেক খতিয়ান কর্তন ও ডিজিটাল ডিসিআর প্রদান', 'Final mutation order & DCR')}
                      </span>
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                    {/* Step 3: Buyer Confirm */}
                    {currentStep === 3 && (isBuyer ? (
                      <Button
                        type="button"
                        onClick={handleBuyerConfirm}
                        disabled={advancing}
                        className="h-7 px-3 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs shadow-xs"
                      >
                        {advancing ? t('নিশ্চিত করা হচ্ছে...', 'Confirming...') : t('শর্তাবলী অনুমোদন করুন (ক্রেতা)', 'Confirm Terms & Area')}
                      </Button>
                    ) : (
                      <Badge variant="warning" className="px-2 py-0.5 rounded-md font-bold text-[10px]">
                        {t('ক্রেতার সম্মতির অপেক্ষায়', 'Awaiting Buyer')}
                      </Badge>
                    ))}

                    {/* Step 1: Seller confirm */}
                    {currentStep === 1 && (
                      isSeller ? (
                        <Button
                          type="button"
                          onClick={() => handleAdvanceStep({ notes_bn: 'বিক্রেতা কর্তৃক জমির হস্তান্তর প্রস্তাব অনুমোদন ও প্রাথমিক প্রক্রিয়া শুরু।' })}
                          disabled={advancing}
                          className="h-7 px-3 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs shadow-xs"
                        >
                          {advancing ? t('অনুমোদন হচ্ছে...', 'Approving...') : t('আবেদন নিশ্চিত করুন', 'Confirm Intent')}
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="px-2 py-0.5 rounded-md text-slate-700 text-[10px] font-bold">
                          {t('বিক্রেতার পদক্ষেপের অপেক্ষায়', 'Awaiting Seller Confirmation')}
                        </Badge>
                      )
                    )}

                    {/* Step 2: Parties confirm */}
                    {currentStep === 2 && (
                      isSeller ? (
                        <Button
                          type="button"
                          onClick={() => handleAdvanceStep({ notes_bn: 'উভয় পক্ষের এনআইডি, ছবি ও নাগরিক তথ্য যাচাই অনুমোদন।' })}
                          disabled={advancing}
                          className="h-7 px-3 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs shadow-xs"
                        >
                          {advancing ? t('অনুমোদন হচ্ছে...', 'Approving...') : t('বিবরণ অনুমোদন করুন', 'Approve Specifications')}
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="px-2 py-0.5 rounded-md text-slate-700 text-[10px] font-bold">
                          {t('বিবরণ যাচাই প্রক্রিয়াধীন', 'Verifying Parties Data')}
                        </Badge>
                      )
                    )}

                    {/* Step 4: Pre-Check Scan */}
                    {currentStep === 4 && (
                      <Button
                        type="button"
                        onClick={() => handleAdvanceStep()}
                        disabled={advancing}
                        className="h-7 px-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs"
                      >
                        {advancing ? t('যাচাই চলছে...', 'Checking...') : t('প্রি-চেক স্ক্যান চালান', 'Run Pre-Check Scan')}
                      </Button>
                    )}

                    {/* Step 5: Co-owner consent */}
                    {currentStep === 5 && (
                      <div className="flex items-center gap-1.5">
                        <Label className="flex items-center gap-1 text-[10px] font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={consentConfirmed}
                            onChange={(e) => setConsentConfirmed(e.target.checked)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 size-3"
                          />
                          <span>{t('সম্মতি প্রাপ্ত', 'Consent verified')}</span>
                        </Label>
                        <Button
                          type="button"
                          onClick={() => handleAdvanceStep({ consent_confirmed: true })}
                          disabled={advancing}
                          className="h-7 px-3 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs shadow-xs"
                        >
                          {advancing ? t('সংরক্ষণ...', 'Saving...') : t('সম্মতি অনুমোদন', 'Confirm Consent')}
                        </Button>
                      </div>
                    )}

                    {/* Step 6: Fee review */}
                    {currentStep === 6 && (
                      <Button
                        type="button"
                        onClick={() => handleAdvanceStep()}
                        disabled={advancing}
                        className="h-7 px-3 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs shadow-xs"
                      >
                        {advancing ? t('প্রস্তুত হচ্ছে...', 'Processing...') : t('নিবন্ধন প্রস্তুতি সম্পন্ন', 'Mark Ready for Registry')}
                      </Button>
                    )}

                    {/* Step 7: Appointment Booking */}
                    {currentStep === 7 && (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="date"
                          value={appointmentDate}
                          onChange={(e) => setAppointmentDate(e.target.value)}
                          className="h-7 px-2 text-xs w-auto"
                        />
                        <Button
                          type="button"
                          onClick={() => handleAdvanceStep({ appointment_date: appointmentDate })}
                          disabled={advancing}
                          className="h-7 px-3 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs shadow-xs"
                        >
                          {advancing ? t('বুকিং...', 'Booking...') : t('বুক করুন', 'Book Appointment')}
                        </Button>
                      </div>
                    )}

                    {/* Step 8: Counter Biometrics */}
                    {currentStep === 8 && (
                      isRegistryOfficer ? (
                        <Button
                          type="button"
                          onClick={() => handleAdvanceStep({ notes_bn: 'সাব-রেজিস্ট্রি কাউন্টারে বিক্রেতা ও ক্রেতার বায়োমেট্রিক ও এনআইডি সফলভাবে যাচাই করা হয়েছে।' })}
                          disabled={advancing}
                          className="h-7 px-3 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs"
                        >
                          {advancing ? t('যাচাই...', 'Verifying...') : t('কাউন্টার বায়োমেট্রিক অনুমোদন', 'Approve Biometrics')}
                        </Button>
                      ) : (
                        <Badge variant="warning" className="px-2 py-0.5 rounded-md font-bold text-[10px]">
                          {t('🏛️ অফিসে সশরীরে হাজিরা আবশ্যক', 'Attendance Required at Registry')}
                        </Badge>
                      )
                    )}

                    {/* Step 9: Sub-Registrar Deed Execution */}
                    {currentStep === 9 && (
                      isSubRegistrarRole ? (
                        <Button
                          type="button"
                          onClick={() => handleAdvanceStep({ notes_bn: 'দলিল সম্পাদন এবং সাব-রেজিস্ট্রার কর্তৃক ডিজিটাল সরকারি সিল সম্পাদন সম্পন্ন।' })}
                          disabled={advancing}
                          className="h-7 px-3 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs shadow-xs"
                        >
                          {advancing ? t('অনুমোদন...', 'Approving...') : t('দলিল অনুমোদন ও ডিজিটাল সিল', 'Approve & Seal')}
                        </Button>
                      ) : (
                        <Badge variant="outline" className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border-blue-200 font-bold text-[10px]">
                          {t('সাব-রেজিস্ট্রারের স্বাক্ষরের অপেক্ষায়', 'Awaiting Signature')}
                        </Badge>
                      )
                    )}

                    {/* Step 10: Queue e-Mutation */}
                    {currentStep === 10 && (
                      isRegistryOfficer ? (
                        <Button
                          type="button"
                          onClick={() => handleAdvanceStep()}
                          disabled={advancing}
                          className="h-7 px-3 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs shadow-xs"
                        >
                          {advancing ? t('প্রেরণ...', 'Sending...') : t('নামজারি কেস প্রেরণ', 'Queue Mutation')}
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="px-2 py-0.5 rounded-md text-slate-800 font-bold text-[10px]">
                          {t('নামজারি কিউতে প্রেরণের অপেক্ষায়', 'Pending Queueing')}
                        </Badge>
                      )
                    )}

                    {/* Step 11: Field Verification & Hearing */}
                    {currentStep === 11 && (
                      isAcLandOffice ? (
                        <Button
                          type="button"
                          onClick={() => handleAdvanceStep({ notes_bn: 'সহকারী কমিশনার (ভূমি) দপ্তরে সরেজমিন মাঠ প্রতিবেদন ও শুনানি পর্যালোচনা অনুমোদন।' })}
                          disabled={advancing}
                          className="h-7 px-3 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs shadow-xs"
                        >
                          {advancing ? t('অনুমোদন...', 'Approving...') : t('শুনানি অনুমোদন', 'Approve Hearing')}
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="px-2 py-0.5 rounded-md text-slate-800 font-bold text-[10px]">
                          {t('শুনানি ও প্রতিবেদন চলমান', 'Hearing in Progress')}
                        </Badge>
                      )
                    )}

                    {/* Step 12: Final AC Land Mutation Approval */}
                    {currentStep === 12 && (
                      isAcLandRole ? (
                        <Button
                          type="button"
                          onClick={() => handleAdvanceStep({ notes_bn: 'সহকারী কমিশনার (ভূমি) কর্তৃক চূড়ান্ত নামজারি খতিয়ান অনুমোদন ও ডিজিটাল ডিসিআর প্রদান সম্পন্ন।' })}
                          disabled={advancing}
                          className="h-7 px-3.5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs shadow-xs"
                        >
                          {advancing ? t('অনুমোদন...', 'Approving...') : t('চূড়ান্ত নামজারি অনুমোদন', 'Final Approve Mutation')}
                        </Button>
                      ) : (
                        <Badge variant="warning" className="px-2 py-0.5 rounded-md font-bold text-[10px]">
                          {t('চূড়ান্ত নামজারি আদেশের অপেক্ষায়', 'Awaiting Final Order')}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 3-Phase Stepper & 13 Sub-Steps Button (Row 2) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-1 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 flex-1">
                {MAJOR_PHASES.map((phase) => {
                  const isDone = selectedTransfer.status === 'COMPLETED' || selectedTransfer.current_step > Math.max(...phase.steps);
                  const isCurrent = !isDone && phase.steps.includes(selectedTransfer.current_step);
                  const completedInPhase = phase.steps.filter(
                    (s) => selectedTransfer.current_step > s || (s === 13 && (selectedTransfer.current_step >= 13 || selectedTransfer.status === 'COMPLETED'))
                  ).length;
                  const totalInPhase = phase.steps.length;

                  return (
                    <div
                      key={phase.id}
                      className={`px-2.5 py-1 rounded-lg border text-xs flex items-center justify-between gap-2 transition ${
                        isDone
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                          : isCurrent
                          ? 'bg-emerald-50 border-[#006A4E] ring-1 ring-emerald-500/30 text-emerald-950 font-bold'
                          : 'bg-slate-50/70 border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                            isDone
                              ? 'bg-emerald-200 text-[#006A4E]'
                              : isCurrent
                              ? 'bg-[#006A4E] text-white'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {toBanglaDigits(phase.id, lang)}
                        </span>
                        <span className="text-[11px] font-bold truncate">
                          {lang === 'bn' ? phase.nameBn : phase.nameEn}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isDone ? (
                          <span className="text-[9px] font-bold text-[#006A4E] flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>{t('সম্পন্ন', 'Done')}</span>
                          </span>
                        ) : isCurrent ? (
                          <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5 animate-pulse" />
                            <span>{toBanglaDigits(completedInPhase, lang)}/{toBanglaDigits(totalInPhase, lang)}</span>
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400">
                            {t('অপেক্ষমাণ', 'Pending')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSubStepsOpen(true)}
                className="h-7 px-2.5 rounded-lg text-[10px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200 shrink-0 flex items-center gap-1 cursor-pointer"
                title={t('প্রশাসনিক ১৩টি উপ-ধাপ দেখুন', 'View 13 Administrative Steps')}
              >
                <FileSpreadsheet className="w-3 h-3 text-[#006A4E]" />
                <span>{t('১৩টি উপ-ধাপ (রেকর্ড)', '13 Steps Record')}</span>
                <ChevronRight className="w-3 h-3 text-slate-400" />
              </Button>
            </div>
          </div>

          {/* 3. Main Two-Column Workspace: Parties & Audit Grid */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-2.5 overflow-hidden">
            {/* Left Column: Parties & Plot Details */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col h-full min-h-0 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#006A4E]" />
                  <span>{t('পক্ষসমূহের বিবরণ ও ভূমির তফসিল', 'Parties & Land Schedule')}</span>
                </h3>
              </div>

              <div className="p-2.5 sm:p-3 overflow-y-auto scrollbar-thin space-y-2 flex-1 min-h-0">
                {/* Land Schedule summary */}
                <div className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-100 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">
                      {selectedTransfer.mouza_bn || selectedTransfer.plot?.mouza_bn || t('মৌজা রেকর্ড', 'Mouza')}
                      {selectedTransfer.jl_no && ` • JL ${toBanglaDigits(selectedTransfer.jl_no, lang)}`}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {t('দাগ নং:', 'Plot Dag:')} {toBanglaDigits(selectedTransfer.dag_no_bn || selectedTransfer.dag_no || selectedTransfer.plot?.dag_no || selectedTransfer.plot_id, lang)}
                      {' • '}
                      {t('হস্তান্তর:', 'Area:')} {toBanglaDigits(selectedTransfer.transfer_area_decimal || '০', lang)} {t('শতক', 'dec')}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold font-mono text-emerald-800 bg-white">
                    ৳ {toBanglaDigits((selectedTransfer.proposed_price_bdt || 0).toLocaleString(), lang)}
                  </Badge>
                </div>

                {/* Seller & Buyer details */}
                {(() => {
                  const sellerParty = (selectedTransfer.parties || []).find((p: any) => p.party_role === 'SELLER');
                  const buyerParty = (selectedTransfer.parties || []).find((p: any) => p.party_role === 'BUYER');
                  const sellerNid = selectedTransfer.seller_nid || sellerParty?.nid || selectedTransfer.created_by_nid || 'N/A';
                  const sellerName = selectedTransfer.seller_name_bn || (lang === 'bn' ? sellerParty?.name_bn : sellerParty?.name_en) || sellerParty?.name_bn || t('বিক্রেতা (মালিক)', 'Seller (Owner)');
                  const buyerNid = selectedTransfer.buyer_nid || buyerParty?.nid || 'N/A';
                  const buyerName = selectedTransfer.buyer_name_bn || (lang === 'bn' ? buyerParty?.name_bn : buyerParty?.name_en) || buyerParty?.name_bn || t('ক্রেতা / প্রাপক', 'Buyer / Transferee');

                  return (
                    <div className="space-y-1.5">
                      {/* Seller info */}
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-slate-900">
                            <span>{sellerName}</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                              {t('বিক্রেতা (নিশ্চিত)', 'Seller (Confirmed)')}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                            {t('এনআইডি:', 'NID:')} {maskNid(sellerNid, lang)}
                          </div>
                        </div>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      </div>

                      {/* Buyer info */}
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-slate-900">
                            <span>{buyerName}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                selectedTransfer.current_step >= 4
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {selectedTransfer.current_step >= 4 ? t('ক্রেতা (অনুমোদিত)', 'Buyer (Confirmed)') : t('ক্রেতা (সম্মতি অপেক্ষমাণ)', 'Buyer (Pending)')}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                            {t('এনআইডি:', 'NID:')} {maskNid(buyerNid, lang)}
                          </div>
                        </div>
                        {selectedTransfer.current_step >= 4 ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Linked Deed / Mutation Proof */}
                {selectedTransfer.deed_id && (
                  <div className="pt-1.5 border-t border-slate-100">
                    <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold text-emerald-900">{t('দলিল আইডি:', 'Deed ID:')} #{selectedTransfer.deed_id}</span>
                        <p className="text-[10px] text-emerald-700 flex items-center gap-1 mt-0.5">
                          <ShieldCheck className="w-3 h-3 text-[#006A4E] shrink-0" />
                          <span>{t('ডিজিটাল সিল ও কিউআর দ্বারা সংরক্ষিত', 'Digital seal & QR secured')}</span>
                        </p>
                      </div>
                      {onNavigate && (
                        <Button
                          size="sm"
                          onClick={() => onNavigate(`qr?deed_no=${selectedTransfer.deed_id}`)}
                          className="h-6 px-2 rounded-md bg-[#006A4E] text-white text-[10px] font-bold"
                        >
                          {t('যাচাই', 'Verify')}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Completed Transfer: Automatic Digital DCR & BS Khatian Porcha Delivery */}
                {(selectedTransfer.current_step >= 12 || selectedTransfer.status === 'COMPLETED' || selectedTransfer.public_stage === 'DONE') && (
                  <div className="pt-1.5 border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <FileCheck2 className="w-3.5 h-3.5 text-[#006A4E]" />
                        <span>{t('ডিজিটাল ডিসিআর ও বিএস পর্চা', 'Digital DCR & BS Porcha')}</span>
                      </div>
                      <Badge variant="success" className="px-1.5 py-0.2 rounded-full text-[9px] font-bold">
                        {t('ডাউনলোড প্রস্তুত', 'Ready')}
                      </Badge>
                    </div>

                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 text-xs space-y-1.5">
                      <p className="text-[10px] text-emerald-900 leading-snug">
                        {t(
                          'মালিকানা হস্তান্তর সম্পন্ন হওয়ায় ডিসিআর ও বিএস খতিয়ান পর্চা প্রস্তুত হয়েছে।',
                          'Official DCR receipt and updated BS Porcha are generated.'
                        )}
                      </p>

                      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setDcrPorchaTransfer(selectedTransfer);
                            setDcrPorchaDefaultDoc('DCR');
                            setDcrPorchaModalOpen(true);
                          }}
                          className="h-7 px-2 rounded-lg bg-white border-emerald-300 text-[#006A4E] text-[10px] font-bold flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <Download className="w-3 h-3" />
                          <span>{t('ডিসিআর (DCR)', 'DCR')}</span>
                        </Button>

                        <Button
                          type="button"
                          onClick={() => {
                            setDcrPorchaTransfer(selectedTransfer);
                            setDcrPorchaDefaultDoc('PORCHA');
                            setDcrPorchaModalOpen(true);
                          }}
                          className="h-7 px-2 rounded-lg bg-[#006A4E] hover:bg-emerald-800 text-white text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs"
                        >
                          <Download className="w-3 h-3" />
                          <span>{t('বিএস পর্চা', 'BS Porcha')}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Event History Log & Audit Trail */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col h-full min-h-0 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[#006A4E]" />
                  <span>{t('অডিট লগ ও ইতিহাস', 'Audit Trail & Event History')}</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {toBanglaDigits(selectedTransfer.events?.length || 0, lang)} {t('টি রেকর্ড', 'records')}
                </span>
              </div>

              <div className="p-2.5 sm:p-3 overflow-y-auto scrollbar-thin space-y-1.5 flex-1 min-h-0">
                {selectedTransfer.events && selectedTransfer.events.length > 0 ? (
                  selectedTransfer.events.map((ev: any, idx: number) => (
                    <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{ev.event_type || ev.action_name}</span>
                          <span className="text-[9px] text-slate-400">
                            {new Date(ev.created_at).toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-0.5">{ev.notes_bn || ev.notes_en}</p>
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          {t('দায়িত্বপ্রাপ্ত:', 'Actor:')} {ev.actor_role} ({ev.actor_user})
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 text-center py-8">
                    {t('কোনো পূর্ববর্তী ইভেন্ট রেকর্ড পাওয়া যায়নি।', 'No event records logged yet.')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* VIEW 3: APPLICATIONS LIST */}
      {activeView === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex-1 min-h-0 flex flex-col overflow-hidden space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div>
              <h2 className="text-base font-bold text-slate-900">{t('আবেদনের তালিকা', 'Applications List')}</h2>
              <p className="text-xs text-slate-500">{t('অনলাইন হস্তান্তর ও নামজারি আবেদনের অগ্রগতি।', 'Track ongoing transfers and mutation.')}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-500 font-medium">
                {t('মোট আবেদন:', 'Total:')}{' '}
                <span className="font-bold text-slate-900">{toBanglaDigits(transfers.length, lang)}</span>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={switchToCreate}
                className="h-8 px-3.5 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{t('নতুন আবেদন', 'New Application')}</span>
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 py-2 flex-1 min-h-0 overflow-y-auto scrollbar-thin">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/60 gap-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-9 w-24 rounded-xl" />
                </div>
              ))}
            </div>
          ) : transfers.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300 flex-1 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#006A4E] flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-800">
                {t('কোনো চলমান হস্তান্তর আবেদন পাওয়া যায়নি', 'No Active Transfer Applications Found')}
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {t('আপনার জমি হস্তান্তর করতে অথবা ক্রেতার পক্ষ থেকে আবেদন শুরু করতে উপরের "নতুন হস্তান্তর আবেদন" বোতামে চাপুন।', 'To start transferring property or file on behalf, click "New Transfer Application".')}
              </p>
              <button
                type="button"
                onClick={switchToCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#006A4E] text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t('এখনই আবেদন করুন', 'Apply for Transfer Now')}</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden space-y-2.5">
              {/* Status Filter Tabs */}
              <div className="pb-1 shrink-0">
                <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
                  <TabsList className="bg-slate-100 p-1 flex flex-wrap h-auto gap-1 border border-slate-200/80">
                    <TabsTrigger value="ALL" className="text-xs font-bold py-1.5 px-3 data-[state=active]:bg-[#006A4E] data-[state=active]:text-white">
                      {t('সকল আবেদন', 'All Applications')} ({toBanglaDigits(transfers.length, lang)})
                    </TabsTrigger>
                    <TabsTrigger value="PENDING_BUYER_CONSENT" className="text-xs font-bold py-1.5 px-3 data-[state=active]:bg-[#006A4E] data-[state=active]:text-white">
                      {t('ক্রেতার সম্মতি অপেক্ষমাণ', 'Pending Consent')}
                    </TabsTrigger>
                    <TabsTrigger value="IN_PROGRESS" className="text-xs font-bold py-1.5 px-3 data-[state=active]:bg-[#006A4E] data-[state=active]:text-white">
                      {t('প্রক্রিয়াধীন', 'In Progress')}
                    </TabsTrigger>
                    <TabsTrigger value="COMPLETED" className="text-xs font-bold py-1.5 px-3 data-[state=active]:bg-[#006A4E] data-[state=active]:text-white">
                      {t('সম্পন্ন', 'Completed')}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-slate-200 scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                      <TableHead>{t('ট্র্যাকিং কোড', 'Tracking Code')}</TableHead>
                      <TableHead>{t('দাগ ও মৌজা', 'Dag & Mouza')}</TableHead>
                      <TableHead>{t('দলিল', 'Deed')}</TableHead>
                      <TableHead>{t('পরিমাণ', 'Area')}</TableHead>
                      <TableHead>{t('বর্তমান ধাপ', 'Current Step')}</TableHead>
                      <TableHead>{t('অবস্থা', 'Status')}</TableHead>
                      <TableHead className="text-right">{t('অ্যাকশন', 'Action')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransfers.map((item: any) => {
                    const tracking = item.transfer_code || item.tracking_number || (item.id ? `TR-${item.id}` : 'TR');
                    const guidance = getActionableGuidance(item);
                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50/80 transition">
                        <TableCell>
                          <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                            <span>{tracking}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleCopyTracking(tracking, e)}
                              className="h-6 w-6 text-slate-400 hover:text-slate-700"
                              title={t('ট্র্যাকিং কোড কপি করুন', 'Copy Tracking Code')}
                            >
                              {copiedCode === tracking ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-800">
                            <JargonTooltip term="DAG_NO">
                              {t(`দাগ নং ${toBanglaDigits(item.plot?.dag_no || item.plot_id, lang)}`, `Dag ${item.plot?.dag_no || item.plot_id}`)}
                            </JargonTooltip>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            <JargonTooltip term="MOUZA">
                              {item.plot?.mouza_bn || item.plot?.mouza_en || t('বীরুলিয়া', 'Birulia')}
                            </JargonTooltip>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[11px] font-bold">
                            <JargonTooltip term="DEED">
                              {item.deed_type || 'SALE'}
                            </JargonTooltip>
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-emerald-800">
                          {toBanglaDigits(item.transfer_area_decimal || '০', lang)} {t('শতক', 'dec')}
                        </TableCell>
                        <TableCell>
                          <span className="text-[11px] font-semibold text-[#006A4E]">
                            {t(`ধাপ ${toBanglaDigits(item.current_step, lang)}/১৩`, `Step ${item.current_step}/13`)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border shadow-2xs ${guidance.badgeClass}`}>
                              {lang === 'bn' ? guidance.labelBn : guidance.labelEn}
                            </Badge>
                            <span className="block text-[10px] text-slate-500 truncate max-w-[150px]">
                              {lang === 'bn' ? guidance.descBn : guidance.descEn}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.status === 'COMPLETED' && Boolean(item.dcr || item.mutation_id) && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setDcrPorchaTransfer(item);
                                  setDcrPorchaDefaultDoc('DCR');
                                  setDcrPorchaModalOpen(true);
                                }}
                                className="h-8 px-2.5 rounded-lg border-teal-200 bg-teal-50 hover:bg-teal-100 text-[#006A4E] font-bold text-[11px]"
                                title={t('ডিজিটাল ডিসিআর ও পর্চা ডাউনলোড', 'Download DCR & Porcha')}
                              >
                                <Download className="w-3 h-3 mr-1" />
                                <span>{t('ডিসিআর/পর্চা', 'DCR/Porcha')}</span>
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => loadTransferDetail(item.transfer_code || item.tracking_number || item.id)}
                              className="h-8 px-3 rounded-lg border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-[#006A4E] font-bold text-xs"
                            >
                              <span>{t('বিস্তারিত', 'View')}</span>
                              <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        </div>
      )}

            {/* 13 Administrative Steps Modal */}
      <Dialog open={subStepsOpen} onOpenChange={setSubStepsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-5">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-slate-900">
              <FileSpreadsheet className="w-4 h-4 text-[#006A4E]" />
              <span>{t('প্রশাসনিক ১৩টি উপ-ধাপ ও অগ্রগতি রেকর্ড', '13 Administrative Steps & Audit Record')}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {t('ভূমি মন্ত্রণালয়ের আদর্শ কার্যপ্রণালী (SOP) অনুযায়ী প্রতিটি পদক্ষেপের অবস্থা।', 'Official status of each step according to Ministry SOP.')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            {STAGES_MAP.map((st) => {
              const isDone = (selectedTransfer?.current_step || 1) > st.step;
              const isCurrent = (selectedTransfer?.current_step || 1) === st.step;
              return (
                <div
                  key={st.step}
                  className={`p-2.5 rounded-lg border text-left transition flex items-center justify-between gap-2 ${
                    isDone
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : isCurrent
                      ? 'bg-white border-[#006A4E] ring-2 ring-emerald-500/20 text-[#006A4E] shadow-2xs font-bold'
                      : 'bg-slate-50/50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 bg-slate-200/60 font-bold">
                      {toBanglaDigits(st.step, lang)}
                    </span>
                    <span className="text-xs font-semibold truncate">
                      {lang === 'bn' ? st.nameBn : st.nameEn}
                    </span>
                  </div>
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : isCurrent ? (
                    <Clock className="w-3.5 h-3.5 text-emerald-700 animate-pulse shrink-0" />
                  ) : (
                    <span className="text-[9px] text-slate-400 shrink-0">{t('অপেক্ষমাণ', 'Pending')}</span>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Digital DCR and BS Khatian Porcha Viewer Modal with Custom Watermark & QR Layout */}
      <CitizenDcrPorchaModal
        isOpen={dcrPorchaModalOpen}
        onClose={() => setDcrPorchaModalOpen(false)}
        transfer={dcrPorchaTransfer || selectedTransfer}
        defaultDocType={dcrPorchaDefaultDoc}
        t={t}
        lang={lang}
      />
    </div>
  );
};
