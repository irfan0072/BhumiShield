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
  const [dcrPorchaDefaultDoc, setDcrPorchaDefaultDoc] = useState<'DCR' | 'PORCHA'>('DCR');
  const [dcrPorchaTransfer, setDcrPorchaTransfer] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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
      nameBn: '১. আবেদন ও সরেজমিন যাচাই',
      nameEn: 'Phase 1: Application & Verification',
      subtitleBn: 'বিক্রেতার প্রস্তাব, ক্রেতার সম্মতি, সহ-মালিক যাচাই ও সরকারি ফি নির্ধারণ (ধাপ ১-৬)',
      subtitleEn: 'Seller proposal, buyer consent, co-owner check & statutory fees (Steps 1-6)',
      steps: [1, 2, 3, 4, 5, 6],
      icon: Users,
    },
    {
      id: 2,
      phaseNo: '২',
      nameBn: '২. সাব-রেজিস্ট্রি দলিল নিবন্ধন',
      nameEn: 'Phase 2: Sub-Registry Deed Registration',
      subtitleBn: 'তারিখ বুকিং, বায়োমেট্রিক উপস্থিতি ও সরকারি সিল সম্পাদন (ধাপ ৭-১০)',
      subtitleEn: 'Appointment booking, biometric attendance & official deed execution (Steps 7-10)',
      steps: [7, 8, 9, 10],
      icon: Building2,
    },
    {
      id: 3,
      phaseNo: '৩',
      nameBn: '৩. ই-নামজারি ও খতিয়ান পর্চা',
      nameEn: 'Phase 3: e-Mutation & Porcha Delivery',
      subtitleBn: 'সহকারী কমিশনার (ভূমি) শুনানী, নামজারি অনুমোদন ও ডিজিটাল ডিসিআর হস্তান্তর (ধাপ ১১-১৩)',
      subtitleEn: 'AC Land hearing, mutation order & digital DCR/Porcha delivery (Steps 11-13)',
      steps: [11, 12, 13],
      icon: FileCheck2,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#006A4E] shadow-2xs">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {t('১৩-ধাপের নিরাপদ জমি হস্তান্তর সেবা', '13-Step Secure Land Transfer Service')}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#006A4E] text-[11px] font-bold">
                {t('সরকারি ডিজিটাল সুরক্ষা', 'Govt Digital Security')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                'বিক্রেতার আবেদন থেকে ক্রেতার সম্মতি, সাব-রেজিস্ট্রার দলিল নিবন্ধন ও এসি ল্যান্ড নামজারি পর্যন্ত সম্পূর্ণ সমন্বিত কর্মপ্রবাহ।',
                'Integrated workflow from seller application to buyer consent, deed registration, and AC Land mutation.'
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {activeView !== 'list' && (
            <button
              type="button"
              onClick={switchToList}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('আবেদন তালিকায় ফিরুন', 'Back to Applications')}</span>
            </button>
          )}

          {activeView !== 'create' && (
            <button
              type="button"
              onClick={switchToCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('নতুন হস্তান্তর আবেদন', 'New Transfer Application')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Error Banner if any */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* VIEW 1: CREATE NEW APPLICATION */}
      {activeView === 'create' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs max-w-4xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#006A4E]" />
              <span>{t('নতুন জমি হস্তান্তর আবেদনের খসড়া পূরণ করুন', 'Fill Out Land Transfer Application Draft')}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {t(
                'সঠিক দাগ নম্বর ও ক্রেতার জাতীয় পরিচয়পত্র নিশ্চিত করুন। আবেদন জমা দেওয়ার পর সিস্টেম স্বয়ংক্রিয়ভাবে লিয়েন ও বিরোধ পরীক্ষা করবে।',
                'Verify dag number and buyer NID. The system will automatically check for liens and disputes.'
              )}
            </p>
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
                {t('১. হস্তান্তরের জন্য আপনার জমি নির্বাচন করুন', '1. Select Your Land Plot to Transfer')} <span className="text-red-500">*</span>
              </label>

              {ownedPlots.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  {t(
                    'আপনার প্রোফাইলে কোনো নিবন্ধিত জমির রেকর্ড পাওয়া যায়নি। অনুগ্রহ করে পূর্বে আপনার জমি ভল্টে যুক্ত করুন।',
                    'No registered plots found in your vault. Please add property to your vault first.'
                  )}
                </div>
              ) : (
                <select
                  value={selectedPlotId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedPlotId(id);
                    const found = ownedPlots.find((p) => Number(p.plot_id || p.id) === id);
                    if (found && found.owner_area_decimal) {
                      setTransferArea(String(found.owner_area_decimal));
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                >
                  <option value="">{t('-- দাগ ও খতিয়ান নির্বাচন করুন --', '-- Select Dag & Khatian --')}</option>
                  {ownedPlots.map((p) => {
                    const id = p.plot_id || p.id;
                    const dag = p.dag_no_bn || p.dag_no;
                    const khatian = p.khatian_no_bn || p.khatian_no || 'রেকর্ড';
                    const mouza = p.mouza_bn || p.mouza_en || 'মৌজা';
                    const area = p.owner_area_decimal ?? 0;
                    return (
                      <option key={id} value={id}>
                        {t(`দাগ নং: ${toBanglaDigits(dag, lang)} | খতিয়ান: ${toBanglaDigits(khatian, lang)} | মৌজা: ${mouza} (আপনার অংশ: ${toBanglaDigits(area, lang)} শতক)`, `Dag: ${dag} | Khatian: ${khatian} | Mouza: ${mouza} (Share: ${area} dec)`)}
                      </option>
                    );
                  })}
                </select>
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('দলিলের ধরন', 'Deed Type')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={deedType}
                  onChange={(e) => setDeedType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="SALE">{t('সাফ-কবলা বিক্রয় (SALE)', 'Outright Sale (SALE)')}</option>
                  <option value="HEIR">{t('ওয়ারিশান বণ্টন (HEIR)', 'Inheritance Distribution (HEIR)')}</option>
                  <option value="GIFT">{t('হেবা / দানপত্র (GIFT)', 'Gift / Hiba (GIFT)')}</option>
                  <option value="MORTGAGE">{t('বন্ধক চুক্তি (MORTGAGE)', 'Mortgage Deed (MORTGAGE)')}</option>
                  <option value="EXCHANGE">{t('বিনিময় দলিল (EXCHANGE)', 'Exchange Deed (EXCHANGE)')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('হস্তান্তরকৃত জমির পরিমাণ (শতক)', 'Transfer Area (Decimals)')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedPlotObj?.owner_area_decimal ?? 0}
                  value={transferArea}
                  onChange={(e) => setTransferArea(e.target.value)}
                  placeholder="e.g. 10.5"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('প্রস্তাবিত মূল্য (টাকা)', 'Proposed Price (BDT)')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  value={proposedPrice}
                  onChange={(e) => setProposedPrice(e.target.value)}
                  placeholder="e.g. 2500000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Step 3: Buyer Information */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t('২. ক্রেতা / গ্রহণকারীর তথ্য', '2. Buyer / Transferee Details')}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t('ক্রেতার জাতীয় পরিচয়পত্র (NID)', 'Buyer National ID (NID)')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={buyerNid}
                    onChange={(e) => setBuyerNid(e.target.value)}
                    placeholder="e.g. 19901234567890123"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {t('১০ বা ১৭ ডিজিটের এনআইডি দিন।', 'Enter 10 or 17 digit NID.')}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t('ক্রেতার পুরো নাম (ঐচ্ছিক)', 'Buyer Full Name (Optional)')}
                  </label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder={t('যেমন: মো: আরিফুল ইসলাম', 'e.g. Md. Ariful Islam')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t('মোবাইল নম্বর (এসএমএস নোটিফিকেশনের জন্য)', 'Mobile Phone (For SMS)')}
                  </label>
                  <input
                    type="tel"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t('সম্পর্ক (হেবা বা ওয়ারিশ দলিলের ক্ষেত্রে)', 'Relationship (For Gift/Heir Deeds)')}
                  </label>
                  <input
                    type="text"
                    value={buyerRelation}
                    onChange={(e) => setBuyerRelation(e.target.value)}
                    placeholder={t('যেমন: পুত্র / কন্যা / ভাই', 'e.g. Son / Daughter / Brother')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submission Button */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={switchToList}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                {t('বাতিল', 'Cancel')}
              </button>

              <button
                type="submit"
                disabled={formSubmitting || (selectedPlotObj && selectedPlotObj.owner_sale_locked)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#006A4E] hover:bg-[#00553e] disabled:bg-slate-300 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                {formSubmitting ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>{t('আবেদন জমা হচ্ছে...', 'Submitting Application...')}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('হস্তান্তর আবেদন দাখিল করুন', 'Submit Transfer Application')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW 2: TRANSFER DETAIL & TRACKER */}
      {activeView === 'detail' && selectedTransfer && (
        <div className="space-y-6">
          {/* Post-Completion Celebration Card */}
          {(selectedTransfer.status === 'COMPLETED' || selectedTransfer.current_step >= 12) && (
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-[#006A4E] text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fadeIn border border-emerald-500/40">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight">
                    {t('অভিনন্দন! আপনার জমি হস্তান্তর ও ই-নামজারি সম্পূর্ণ সম্পন্ন হয়েছে', 'Congratulations! Land Transfer & e-Mutation Completed')}
                  </h3>
                </div>
                <p className="text-xs text-emerald-100/90 leading-relaxed max-w-2xl">
                  {t(
                    'সাব-রেজিস্ট্রি দলিলের সরকারি ডিজিটাল নিরাপত্তা সিল এবং সহকারী কমিশনার (ভূমি) কর্তৃক অনুমোদিত নবায়নকৃত বিএস খতিয়ান ও সরকারি ডিসিআর রসিদ প্রস্তুত রয়েছে। নিচের বোতাম থেকে সরাসরি ডাউনলোড করুন।',
                    'Government digital security seal, updated BS Khatian Porcha, and official DCR receipt are verified and ready for 1-click download.'
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setDcrPorchaTransfer(selectedTransfer);
                    setDcrPorchaDefaultDoc('DCR');
                    setDcrPorchaModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white text-[#006A4E] hover:bg-emerald-50 text-xs font-black shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#006A4E]" />
                  <span>{t('ডিজিটাল ডিসিআর (DCR)', 'Digital DCR')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDcrPorchaTransfer(selectedTransfer);
                    setDcrPorchaDefaultDoc('PORCHA');
                    setDcrPorchaModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>{t('বিএস খতিয়ান পর্চা', 'BS Porcha')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Detail Header Banner */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-[#006A4E] text-xs font-black font-mono">
                    {selectedTransfer.transfer_code || selectedTransfer.tracking_number || `TR-${selectedTransfer.id}`}
                  </span>

                  {/* 1-Click Copy Tracking Code Button */}
                  <button
                    type="button"
                    onClick={(e) => handleCopyTracking(selectedTransfer.transfer_code || selectedTransfer.tracking_number || `TR-${selectedTransfer.id}`, e)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer border border-slate-200/70"
                    title={t('ট্র্যাকিং কোড কপি করুন', 'Copy Tracking Code')}
                  >
                    {copiedCode === (selectedTransfer.transfer_code || selectedTransfer.tracking_number || `TR-${selectedTransfer.id}`) ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 text-[11px] font-bold">{t('কপি হয়েছে!', 'Copied!')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-[11px] font-bold">{t('কপি', 'Copy')}</span>
                      </>
                    )}
                  </button>

                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase">
                    {selectedTransfer.deed_type || 'SALE'}
                  </span>

                  {/* 3-Tier Actionable Guidance Chip */}
                  {(() => {
                    const guidance = getActionableGuidance(selectedTransfer);
                    return (
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold border shadow-2xs ${guidance.badgeClass}`}>
                        {lang === 'bn' ? guidance.labelBn : guidance.labelEn}
                      </span>
                    );
                  })()}
                </div>
                <h2 className="text-lg font-black text-slate-900 mt-2">
                  {t(
                    `দাগ নং ${toBanglaDigits(selectedTransfer.dag_no_bn || selectedTransfer.dag_no || selectedTransfer.plot?.dag_no_bn || selectedTransfer.plot?.dag_no || selectedTransfer.plot_id, lang)} এর জমি হস্তান্তর প্রক্রিয়া`,
                    `Land Transfer Workflow for Plot Dag ${selectedTransfer.dag_no || selectedTransfer.plot?.dag_no || selectedTransfer.plot_id}`
                  )}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('আবেদনের তারিখ:', 'Application Date:')}{' '}
                  {new Date(selectedTransfer.created_at || Date.now()).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US')}
                </p>
              </div>

              {/* Quick stats badge */}
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">{t('হস্তান্তর পরিমাণ', 'Transfer Area')}</span>
                  <span className="font-bold text-emerald-700">
                    {toBanglaDigits(selectedTransfer.transfer_area_decimal || '০', lang)} {t('শতক', 'dec')}
                  </span>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div>
                  <span className="text-slate-400 block text-[10px]">{t('প্রস্তাবিত মূল্য', 'Proposed Price')}</span>
                  <span className="font-bold text-slate-800">
                    ৳ {toBanglaDigits((selectedTransfer.proposed_price_bdt || 0).toLocaleString(), lang)}
                  </span>
                </div>
              </div>
            </div>

            {/* HERO: WHAT NEEDS ACTION / CURRENT STATUS CARD */}
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

              // Determine if action is currently waiting for the logged-in user
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
                  className={`mt-4 rounded-2xl p-4 sm:p-5 transition shadow-xs border ${
                    isMyAction
                      ? 'bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-100/50 border-emerald-300 ring-2 ring-emerald-500/25'
                      : currentStep === 8
                      ? 'bg-purple-50/70 border-purple-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="relative mt-0.5 shrink-0">
                        {isMyAction ? (
                          <span className="flex h-3.5 w-3.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-600"></span>
                          </span>
                        ) : (
                          <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide ${
                              isMyAction
                                ? 'bg-[#006A4E] text-white shadow-2xs'
                                : currentStep === 8
                                ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}
                          >
                            {currentStep === 1 && (isSeller ? t('আপনার পদক্ষেপ প্রয়োজন (বিক্রেতা)', 'Your Action Required (Seller)') : t('বিক্রেতার পদক্ষেপের অপেক্ষায়', 'Awaiting Seller Confirmation'))}
                            {currentStep === 2 && (isSeller ? t('আপনার পদক্ষেপ প্রয়োজন (বিক্রেতা)', 'Your Action Required (Seller)') : t('উভয় পক্ষের বিবরণ যাচাই প্রক্রিয়াধীন', 'Parties Verification in Progress'))}
                            {currentStep === 3 && (isBuyer ? t('⚡ আপনার জরুরি পদক্ষেপ প্রয়োজন (ক্রেতা)', '⚡ Urgent Action Required (Buyer)') : t('ক্রেতার সম্মতির অপেক্ষায় (অ্যাকশন পেন্ডিং)', 'Awaiting Buyer Confirmation'))}
                            {currentStep === 4 && t('স্বয়ংক্রিয় ভূমি রেকর্ড স্ক্যান ও প্রি-চেক', 'Automated Record Scan & Fraud Pre-Check')}
                            {currentStep === 5 && t('সহ-মালিক ও ওয়ারিশ সম্মতি যাচাই', 'Co-owner & Heir Consent Verification')}
                            {currentStep === 6 && t('সরকারি স্ট্যাম্প শুল্ক ও রেজিস্ট্রি ফি নির্ধারণ', 'Statutory Stamp Duty & Fee Assessment')}
                            {currentStep === 7 && t('সাব-রেজিস্ট্রি অ্যাপয়েন্টমেন্ট তারিখ নির্ধারণ', 'Registry Appointment Date Selection')}
                            {currentStep === 8 && (isRegistryOfficer ? t('কাউন্টার বায়োমেট্রিক ম্যাচ ও অনুমোদন', 'Approve Biometrics at Counter') : t('🏛️ সাব-রেজিস্ট্রি কাউন্টারে সশরীরে উপস্থিতি আবশ্যক', 'In-Person Attendance Required at Registry'))}
                            {currentStep === 9 && (isSubRegistrarRole ? t('সাব-রেজিস্ট্রারের অনুমোদন ও ডিজিটাল সিল সম্পাদন', 'Sub-Registrar Approval & Digital Seal') : t('সাব-রেজিস্ট্রারের স্বাক্ষরের অপেক্ষায়', 'Awaiting Sub-Registrar Signature'))}
                            {currentStep === 10 && (isRegistryOfficer ? t('সহকারী কমিশনার (ভূমি) দপ্তরে নামজারি কেস প্রেরণ', 'Queue Mutation to AC Land Office') : t('আন্তঃদাপ্তরিক নামজারি কিউতে প্রেরণের অপেক্ষায়', 'Awaiting Mutation Queueing'))}
                            {currentStep === 11 && (isAcLandOffice ? t('উপজেলা ভূমি অফিসে শুনানি ও সরেজমিন প্রতিবেদন', 'Hearing & Field Inspection Review') : t('ভূমি অফিসে শুনানি ও প্রতিবেদন চলমান', 'Hearing in Progress'))}
                            {currentStep === 12 && (isAcLandRole ? t('চূড়ান্ত নামজারি অনুমোদন ও ডিজিটাল ডিসিআর আদেশ', 'Final Mutation Order & DCR Issuance') : t('চূড়ান্ত নামজারি আদেশের অপেক্ষায়', 'Awaiting AC Land Final Order'))}
                          </span>

                          <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            {t(`ধাপ ${toBanglaDigits(currentStep, lang)} / ১৩`, `Step ${currentStep} of 13`)}: {lang === 'bn' ? selectedTransfer.step_name_bn : selectedTransfer.step_name_en}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900">
                          {currentStep === 1 && t('বিক্রেতা কর্তৃক জমির প্রাথমিক হস্তান্তর আবেদন নিশ্চিতকরণ', 'Seller confirmation of transfer proposal')}
                          {currentStep === 2 && t('পক্ষসমূহের বিবরণ, এনআইডি ও জাতীয় পরিচয় রেকর্ড অনুমোদন', 'Confirmation of parties specifications and identity records')}
                          {currentStep === 3 && (isBuyer ? t('জমির তফসিল, শতক পরিমাণ ও প্রস্তাবিত বিক্রয় মূল্য অনুমোদন করুন', 'Verify land schedule, area and proposed sale price') : t('ক্রেতার সম্মতির অপেক্ষায় — ক্রেতা লগইন করে জমির বিবরণ ও মূল্য অনুমোদন করবেন', 'Awaiting buyer confirmation from their account'))}
                          {currentStep === 4 && t('জালিয়াতি রোধ ও স্বত্ব বিরোধ স্ক্যান চালান', 'Run anti-fraud and dispute record scan')}
                          {currentStep === 5 && t('যৌথ মালিকানাধীন জমির ক্ষেত্রে সহ-মালিকানা ও ওয়ারিশ সম্মতি নিশ্চিতকরণ', 'Co-owner and heir consent check for jointly owned plots')}
                          {currentStep === 6 && t('সাব-রেজিস্ট্রি দলিলের স্ট্যাম্প শুল্ক ও রেজিস্ট্রেশন ফি পর্যালোচনা সম্পন্ন', 'Stamp duty assessment and registration readiness review')}
                          {currentStep === 7 && t('সাব-রেজিস্ট্রি অফিসে সশরীরে উপস্থিতির জন্য সুবিধাজনক তারিখ নির্বাচন করুন', 'Schedule registry office appointment date')}
                          {currentStep === 8 && t('🏛️ সাব-রেজিস্ট্রি কাউন্টারে সশরীরে উপস্থিতি ও বায়োমেট্রিক লাইভনেস যাচাই আবশ্যক', 'Counter biometric match required at sub-registry')}
                          {currentStep === 9 && t('সাব-রেজিস্ট্রার কর্তৃক দলিল অনুমোদন ও ডিজিটাল সরকারি সিল সম্পাদন', 'Deed approval and official digital seal execution by Sub-Registrar')}
                          {currentStep === 10 && t('দলিল নিবন্ধিত হয়েছে — সহকারী কমিশনার (ভূমি) দপ্তরে স্বয়ংক্রিয় নামজারি কেস প্রেরণ', 'Deed registered. Queueing mutation to AC Land office')}
                          {currentStep === 11 && t('সহকারী কমিশনার (ভূমি) দপ্তরে সরেজমিন মাঠ প্রতিবেদন ও শুনানির নোটিশ প্রস্তুত', 'Field verification and hearing preparation at AC Land office')}
                          {currentStep === 12 && t('চূড়ান্ত নামজারি অনুমোদন, সাবেক খতিয়ান কর্তন ও ডিজিটাল ডিসিআর প্রদান', 'Final mutation approval and digital DCR issuance')}
                        </h4>

                        <p className="text-[11px] text-slate-600 leading-relaxed max-w-2xl">
                          {currentStep === 1 && t('বিক্রেতা হিসেবে প্রস্তাবিত জমির বিবরণ যাচাই করে প্রাথমিক আবেদনটি অনুমোদন নিশ্চিত করুন।', 'Seller confirms transfer intent and plot details to initiate.')}
                          {currentStep === 2 && t('উভয় পক্ষের এনআইডি ও জাতীয় পরিচয় তথ্য রেকর্ড নিশ্চিত করে ক্রেতার অনুমোদনের জন্য প্রেরণ করুন।', 'Confirm parties identity verification before forwarding.')}
                          {currentStep === 3 && (isBuyer ? t('ক্রেতা জমি হস্তান্তর শর্ত, পরিমাণ ও প্রস্তাবিত মূল্য খতিয়ান রেকর্ডের সাথে যাচাই করে অনুমোদন করবেন।', 'Buyer must confirm plot area, terms, and proposed price.') : t('ক্রেতার সম্মতির অপেক্ষায় রয়েছে — ক্রেতা লগইন করে জমির পরিমাণ ও শর্ত অনুমোদন করবেন।', 'Awaiting buyer confirmation from their account.'))}
                          {currentStep === 4 && t('ক্রেতা সম্মতি দিয়েছেন। জমির কোনো দেওয়ানি বিরোধ বা প্রশাসনিক স্থগিতাদেশ আছে কিনা তা স্বয়ংক্রিয় স্ক্যান করা হবে।', 'Buyer confirmed. Automated fraud and administrative scan will be performed.')}
                          {currentStep === 5 && t('যৌথ মালিকানাধীন জমির ক্ষেত্রে অন্যান্য অংশীদারদের কোনো আপত্তি নেই মর্মে প্রত্যয়ন নিশ্চিত করুন।', 'Confirm that all heirs and co-owners have consented.')}
                          {currentStep === 6 && t('আইনানুযায়ী স্ট্যাম্প শুল্ক ও রেজিস্ট্রি ফি নির্ধারণ শেষ করে সাব-রেজিস্ট্রি অ্যাপয়েন্টমেন্ট প্রস্তুত করুন।', 'Statutory fee review completed; ready for registry booking.')}
                          {currentStep === 7 && t('উভয় পক্ষ উপস্থিত থেকে দলিল সম্পাদন সম্পন্ন করার জন্য সুবিধাজনক একটি তারিখ বুকিং করুন।', 'Select a suitable date for in-person appearance at the Sub-Registry office.')}
                          {currentStep === 8 && t('জালিয়াতি রোধে সাব-রেজিস্ট্রি কাউন্টারে উভয় পক্ষের সরাসরি বায়োমেট্রিক ফিঙ্গারপ্রিন্ট ও এনআইডি যাচাই সম্পন্ন করতে হবে।', 'Both parties must be present at sub-registry counter for biometric matching.')}
                          {currentStep === 9 && t('সাব-রেজিস্ট্রার মহোদয়ের ডিজিটাল সরকারি সিল সম্পাদন দ্বারা দলিল নিবন্ধিত হবে।', 'Official digital deed execution by the Sub-Registrar.')}
                          {currentStep === 10 && t('রেজিস্ট্রিকৃত দলিলের তথ্যের ভিত্তিতে সহকারী কমিশনার (ভূমি) দপ্তরে স্বয়ংক্রিয় নামজারি ফাইল প্রেরণ করা হচ্ছে।', 'Forwarding registered deed records to AC Land office.')}
                          {currentStep === 11 && t('সহকারী কমিশনার (ভূমি) দপ্তরে তহশিলদারের সরেজমিন প্রতিবেদন ও শুনানি পর্যালোচনা প্রক্রিয়াধীন।', 'AC Land office reviewing field inspection report and hearing records.')}
                          {currentStep === 12 && t('এসি ল্যান্ড মহোদয়ের চূড়ান্ত আদেশে সাবেক খতিয়ান কর্তন এবং নতুন বিএস খতিয়ান ও ডিসিআর দাখিলা জারি হবে।', 'Final order issuing new BS Khatian and digital DCR receipt.')}
                        </p>
                        {advanceError && <p className="text-red-700 font-bold mt-1 text-[11px]">{advanceError}</p>}
                      </div>
                    </div>

                    {/* Action Controls right here in the hero card */}
                    <div className="shrink-0 flex items-center gap-2 self-start md:self-center">
                      {/* Step 3: Buyer Confirm */}
                      {currentStep === 3 && (isBuyer ? (
                        <button
                          type="button"
                          onClick={handleBuyerConfirm}
                          disabled={advancing}
                          className="px-4 py-2.5 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs transition shadow-xs cursor-pointer disabled:bg-slate-400"
                        >
                          {advancing ? t('নিশ্চিত করা হচ্ছে...', 'Confirming...') : t('শর্তাবলী অনুমোদন করুন (ক্রেতা)', 'Confirm Terms & Area')}
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900 font-bold text-[11px]">
                          {t('ক্রেতার সম্মতির অপেক্ষায়', 'Awaiting Buyer')}
                        </span>
                      ))}

                      {/* Step 1: Seller confirm */}
                      {currentStep === 1 && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceStep()}
                          disabled={advancing}
                          className="px-4 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs transition shadow-xs cursor-pointer disabled:bg-slate-400"
                        >
                          {advancing ? t('অগ্রসর হচ্ছে...', 'Advancing...') : t('আবেদন নিশ্চিত করুন', 'Confirm Intent')}
                        </button>
                      )}

                      {/* Step 2: Parties confirm */}
                      {currentStep === 2 && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceStep()}
                          disabled={advancing}
                          className="px-4 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs transition shadow-xs cursor-pointer disabled:bg-slate-400"
                        >
                          {advancing ? t('অগ্রসর হচ্ছে...', 'Advancing...') : t('পক্ষসমূহ নিশ্চিত করুন', 'Confirm Parties')}
                        </button>
                      )}

                      {/* Step 4: Pre-Check Scan */}
                      {currentStep === 4 && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceStep()}
                          disabled={advancing}
                          className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs transition shadow-xs cursor-pointer disabled:bg-slate-400"
                        >
                          {advancing ? t('যাচাই চলছে...', 'Checking...') : t('প্রি-চেক স্ক্যান চালান', 'Run Pre-Check Scan')}
                        </button>
                      )}

                      {/* Step 5: Co-owner consent */}
                      {currentStep === 5 && (
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={consentConfirmed}
                              onChange={(e) => setConsentConfirmed(e.target.checked)}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>{t('ওয়ারিশ/সহ-মালিক সম্মতি প্রাপ্ত', 'Consent verified')}</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAdvanceStep({ consent_confirmed: true })}
                            disabled={advancing}
                            className="px-4 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs transition shadow-xs cursor-pointer disabled:bg-slate-400"
                          >
                            {advancing ? t('সংরক্ষণ হচ্ছে...', 'Saving...') : t('সম্মতি অনুমোদন করুন', 'Confirm Consent')}
                          </button>
                        </div>
                      )}

                      {/* Step 6: Fee review */}
                      {currentStep === 6 && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceStep()}
                          disabled={advancing}
                          className="px-4 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs transition shadow-xs cursor-pointer disabled:bg-slate-400"
                        >
                          {advancing ? t('প্রস্তুত করা হচ্ছে...', 'Processing...') : t('নিবন্ধন প্রস্তুতি সম্পন্ন করুন', 'Mark Ready for Registry')}
                        </button>
                      )}

                      {/* Step 7: Appointment Booking */}
                      {currentStep === 7 && (
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={appointmentDate}
                            onChange={(e) => setAppointmentDate(e.target.value)}
                            className="p-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleAdvanceStep({ appointment_date: appointmentDate })}
                            disabled={advancing}
                            className="px-4 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs transition shadow-xs cursor-pointer disabled:bg-slate-400"
                          >
                            {advancing ? t('বুকিং হচ্ছে...', 'Booking...') : t('অ্যাপয়েন্টমেন্ট বুক করুন', 'Book Appointment')}
                          </button>
                        </div>
                      )}

                      {/* Step 8: Counter Biometrics */}
                      {currentStep === 8 && (
                        isRegistryOfficer ? (
                          <button
                            type="button"
                            onClick={() => handleAdvanceStep({ notes_bn: 'সাব-রেজিস্ট্রি কাউন্টারে বিক্রেতা ও ক্রেতার বায়োমেট্রিক ও এনআইডি সফলভাবে যাচাই করা হয়েছে।' })}
                            disabled={advancing}
                            className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition shadow-xs cursor-pointer disabled:bg-slate-400"
                          >
                            {advancing ? t('যাচাই হচ্ছে...', 'Verifying...') : t('কাউন্টার বায়োমেট্রিক অনুমোদন', 'Approve Biometrics')}
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900 font-bold text-[11px]">
                            {t('🏛️ অফিসে সশরীরে উপস্থিতির নোটিশ সক্রিয়', 'Attendance Required at Registry')}
                          </span>
                        )
                      )}

                      {/* Step 9: Sub-Registrar Deed Execution */}
                      {currentStep === 9 && (
                        isSubRegistrarRole ? (
                          <button
                            type="button"
                            onClick={() => handleAdvanceStep({ notes_bn: 'দলিল সম্পাদন এবং সাব-রেজিস্ট্রার কর্তৃক ডিজিটাল সরকারি সিল সম্পাদন সম্পন্ন।' })}
                            disabled={advancing}
                            className="px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs transition shadow-xs cursor-pointer disabled:bg-slate-400"
                          >
                            {advancing ? t('অনুমোদন হচ্ছে...', 'Approving...') : t('দলিল অনুমোদন ও ডিজিটাল সিল প্রদান', 'Approve & Affix Official Seal')}
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-900 font-bold text-[11px]">
                            {t('সাব-রেজিস্ট্রারের স্বাক্ষরের অপেক্ষায়', 'Awaiting Sub-Registrar Signature')}
                          </span>
                        )
                      )}

                      {/* Step 10: Queue e-Mutation */}
                      {currentStep === 10 && (
                        isRegistryOfficer ? (
                          <button
                            type="button"
                            onClick={() => handleAdvanceStep()}
                            disabled={advancing}
                            className="px-4 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs transition shadow-xs cursor-pointer disabled:bg-slate-400"
                          >
                            {advancing ? t('প্রেরণ হচ্ছে...', 'Sending...') : t('নামজারি কেস প্রেরণ করুন', 'Queue e-Mutation')}
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 font-bold text-[11px]">
                            {t('সাব-রেজিস্ট্রি থেকে নামজারি কিউতে প্রেরণের অপেক্ষায়', 'Pending Sub-Registry Queueing')}
                          </span>
                        )
                      )}

                      {/* Step 11: Field Verification & Hearing */}
                      {currentStep === 11 && (
                        isAcLandOffice ? (
                          <button
                            type="button"
                            onClick={() => handleAdvanceStep({ notes_bn: 'সহকারী কমিশনার (ভূমি) দপ্তরে সরেজমিন মাঠ প্রতিবেদন ও শুনানি পর্যালোচনা অনুমোদন।' })}
                            disabled={advancing}
                            className="px-4 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs transition shadow-xs cursor-pointer disabled:bg-slate-400"
                          >
                            {advancing ? t('অনুমোদন হচ্ছে...', 'Approving...') : t('শুনানি ও প্রতিবেদন অনুমোদন', 'Approve Hearing & Report')}
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 font-bold text-[11px]">
                            {t('ভূমি অফিসে শুনানি ও প্রতিবেদন চলমান', 'Hearing in Progress')}
                          </span>
                        )
                      )}

                      {/* Step 12: Final AC Land Mutation Approval */}
                      {currentStep === 12 && (
                        isAcLandRole ? (
                          <button
                            type="button"
                            onClick={() => handleAdvanceStep({ notes_bn: 'সহকারী কমিশনার (ভূমি) কর্তৃক চূড়ান্ত নামজারি খতিয়ান অনুমোদন ও ডিজিটাল ডিসিআর প্রদান সম্পন্ন।' })}
                            disabled={advancing}
                            className="px-5 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs transition shadow-xs cursor-pointer disabled:bg-slate-400"
                          >
                            {advancing ? t('অনুমোদন হচ্ছে...', 'Approving...') : t('চূড়ান্ত নামজারি অনুমোদন করুন', 'Final Approve Mutation')}
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900 font-bold text-[11px]">
                            {t('চূড়ান্ত নামজারি আদেশের অপেক্ষায়', 'Awaiting AC Land Final Order')}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 3-PHASE CITIZEN JOURNEY STEPPER WITH EXPANDABLE 13-STEP AUDIT DETAILS */}
            <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#006A4E]" />
                    <span>{t('নাগরিক ভূমি হস্তান্তর যাত্রা (৩টি মূল পর্যায়)', 'Citizen Land Transfer Journey (3 Core Phases)')}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {t('১৩টি প্রশাসনিক ধাপকে ৩টি প্রধান নাগরিক ধাপে সহজীকরণ করা হয়েছে।', '13 administrative steps simplified into 3 clear citizen phases.')}
                  </p>
                </div>
                <span className="text-xs font-bold text-[#006A4E] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  {t(`ধাপ ${toBanglaDigits(selectedTransfer.current_step, lang)} / ${toBanglaDigits(13, lang)}`, `Step ${selectedTransfer.current_step} of 13`)}
                </span>
              </div>

              {/* 3 Major Phase Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {MAJOR_PHASES.map((phase) => {
                  const isDone = selectedTransfer.status === 'COMPLETED' || selectedTransfer.current_step > Math.max(...phase.steps);
                  const isCurrent = !isDone && phase.steps.includes(selectedTransfer.current_step);

                  const completedInPhase = phase.steps.filter(
                    (s) => selectedTransfer.current_step > s || (s === 13 && (selectedTransfer.current_step >= 13 || selectedTransfer.status === 'COMPLETED'))
                  ).length;
                  const totalInPhase = phase.steps.length;
                  const progressPercent = Math.round((completedInPhase / totalInPhase) * 100);
                  const PhaseIcon = phase.icon;

                  return (
                    <div
                      key={phase.id}
                      className={`p-4 rounded-2xl border transition relative overflow-hidden flex flex-col justify-between ${
                        isDone
                          ? 'bg-emerald-50/50 border-emerald-200 shadow-2xs'
                          : isCurrent
                          ? 'bg-white border-[#006A4E] ring-2 ring-emerald-500/25 shadow-xs'
                          : 'bg-slate-50/70 border-slate-200 text-slate-400'
                      }`}
                    >
                      {isCurrent && (
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
                      )}

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                                isDone
                                  ? 'bg-emerald-100 text-[#006A4E]'
                                  : isCurrent
                                  ? 'bg-[#006A4E] text-white shadow-2xs'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              <PhaseIcon className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[11px] font-bold text-slate-500">
                              {t(`পর্যায় ${toBanglaDigits(phase.id, lang)}`, `Phase ${phase.id}`)}
                            </span>
                          </div>

                          {isDone ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#006A4E] text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{t('সম্পন্ন', 'Completed')}</span>
                            </span>
                          ) : isCurrent ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                              <Clock className="w-3 h-3 animate-pulse" />
                              <span>{t('চলমান', 'In Progress')}</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-medium">
                              {t('অপেক্ষমাণ', 'Pending')}
                            </span>
                          )}
                        </div>

                        <h4
                          className={`text-xs font-bold leading-snug ${
                            isDone ? 'text-emerald-950' : isCurrent ? 'text-slate-900 font-black' : 'text-slate-600'
                          }`}
                        >
                          {lang === 'bn' ? phase.nameBn : phase.nameEn}
                        </h4>

                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          {lang === 'bn' ? phase.subtitleBn : phase.subtitleEn}
                        </p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span>{t('অগ্রগতি', 'Progress')}</span>
                          <span className="font-bold text-slate-700">
                            {toBanglaDigits(completedInPhase, lang)}/{toBanglaDigits(totalInPhase, lang)} {t('উপ-ধাপ', 'steps')} ({toBanglaDigits(progressPercent, lang)}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              isDone ? 'bg-emerald-600' : isCurrent ? 'bg-[#006A4E]' : 'bg-slate-300'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Expandable 13-Sub-Step Accordion for Judicial & Audit View */}
              <details className="group mt-3 bg-slate-50/80 rounded-xl border border-slate-200 overflow-hidden">
                <summary className="px-4 py-2.5 text-xs font-bold text-slate-700 cursor-pointer flex items-center justify-between hover:bg-slate-100/80 transition select-none">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#006A4E]" />
                    <span>{t('১৩টি প্রশাসনিক উপ-ধাপ বিস্তারিত দেখুন (প্রশাসনিক ও অডিট ভিউ)', 'View 13 Administrative Sub-Steps (Audit & Officer View)')}</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-semibold">
                      {t('অফিসিয়াল রেকর্ড', 'Official Records')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                    <span>{t('উপ-ধাপ বিস্তারিত', 'Sub-steps details')}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
                  </div>
                </summary>
                <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {STAGES_MAP.map((st) => {
                      const isDone = selectedTransfer.current_step > st.step;
                      const isCurrent = selectedTransfer.current_step === st.step;
                      return (
                        <div
                          key={st.step}
                          className={`p-2.5 rounded-xl border text-left transition ${
                            isDone
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                              : isCurrent
                              ? 'bg-white border-[#006A4E] ring-2 ring-emerald-500/20 text-[#006A4E] shadow-2xs font-bold'
                              : 'bg-slate-50/50 border-slate-200 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span>{t(`ধাপ ${toBanglaDigits(st.step, lang)}`, `Step ${st.step}`)}</span>
                            {isDone ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : isCurrent ? (
                              <Clock className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />
                            ) : null}
                          </div>
                          <div className="text-[11px] font-semibold truncate leading-tight">
                            {lang === 'bn' ? st.nameBn : st.nameEn}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </details>
            </div>
          </div>

          {/* Parties & Audit Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Parties */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#006A4E]" />
                <span>{t('পক্ষসমূহের বিবরণ (বিক্রেতা ও ক্রেতা)', 'Parties Specification')}</span>
              </h3>

              {(() => {
                const sellerParty = (selectedTransfer.parties || []).find((p: any) => p.party_role === 'SELLER');
                const buyerParty = (selectedTransfer.parties || []).find((p: any) => p.party_role === 'BUYER');
                const sellerNid = selectedTransfer.seller_nid || sellerParty?.nid || selectedTransfer.created_by_nid || 'N/A';
                const sellerName = selectedTransfer.seller_name_bn || (lang === 'bn' ? sellerParty?.name_bn : sellerParty?.name_en) || sellerParty?.name_bn || t('বিক্রেতা (মালিক)', 'Seller (Owner)');
                const buyerNid = selectedTransfer.buyer_nid || buyerParty?.nid || 'N/A';
                const buyerName = selectedTransfer.buyer_name_bn || (lang === 'bn' ? buyerParty?.name_bn : buyerParty?.name_en) || buyerParty?.name_bn || t('ক্রেতা / প্রাপক', 'Buyer / Transferee');

                return (
                  <div className="space-y-3">
                    {/* Seller info */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <span>{sellerName}</span>
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                            {t('বিক্রেতা / নিশ্চিত', 'Seller (Confirmed)')}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                          {t('এনআইডি:', 'NID:')} {maskNid(sellerNid, lang)}
                        </div>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>

                    {/* Buyer info */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <span>{buyerName}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                              selectedTransfer.current_step >= 4
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {selectedTransfer.current_step >= 4 ? t('ক্রেতা (অনুমোদিত)', 'Buyer (Confirmed)') : t('ক্রেতা (সম্মতি অপেক্ষমাণ)', 'Buyer (Pending Consent)')}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                          {t('এনআইডি:', 'NID:')} {maskNid(buyerNid, lang)}
                        </div>
                      </div>
                      {selectedTransfer.current_step >= 4 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Linked Deed / Mutation Proof */}
              {selectedTransfer.deed_id && (
                <div className="pt-3 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-700 mb-2">{t('নিবন্ধিত দলিল ও প্রমাণক', 'Registered Deed Proof')}</div>
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-emerald-900">{t('দলিল আইডি:', 'Deed ID:')} #{selectedTransfer.deed_id}</span>
                      <p className="text-[11px] text-emerald-700 flex items-center gap-1 mt-0.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#006A4E] shrink-0" />
                        <span>{t('গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের ডিজিটাল সিল ও কিউআর দ্বারা সংরক্ষিত', 'Official Bangladesh Government digital seal & QR secured')}</span>
                      </p>
                    </div>
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate(`qr?deed_no=${selectedTransfer.deed_id}`)}
                        className="px-2.5 py-1 rounded-lg bg-[#006A4E] text-white text-[11px] font-bold"
                      >
                        {t('যাচাই করুন', 'Verify')}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Completed Transfer: Automatic Digital DCR & BS Khatian Porcha Delivery */}
              {(selectedTransfer.current_step >= 12 || selectedTransfer.status === 'COMPLETED' || selectedTransfer.public_stage === 'DONE') && (
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-[#006A4E]" />
                      <span>{t('স্বয়ংক্রিয় ডিজিটাল ডিসিআর ও বিএস খতিয়ান পর্চা', 'Digital DCR & BS Porcha Delivery')}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#006A4E] text-[10px] font-bold">
                      {t('ডাউনলোড প্রস্তুত', 'Ready to Download')}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 text-xs space-y-2.5">
                    <p className="text-[11px] text-emerald-900 leading-relaxed">
                      {t(
                        'মালিকানা হস্তান্তর সম্পন্ন হওয়ায় সরকারি দাখিলা ও ডিসিআর (DCR) রসিদ এবং নবায়নকৃত বিএস খতিয়ান পর্চা সরকারি ডিজিটাল নিরাপত্তা সিলসহ প্রস্তুত হয়েছে।',
                        'Transfer completed. Official DCR receipt and updated BS Porcha are generated with official government digital security seals.'
                      )}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDcrPorchaTransfer(selectedTransfer);
                          setDcrPorchaDefaultDoc('DCR');
                          setDcrPorchaModalOpen(true);
                        }}
                        className="px-3 py-2 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-100/50 text-[#006A4E] text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{t('ডিজিটাল ডিসিআর (DCR)', 'Digital DCR')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDcrPorchaTransfer(selectedTransfer);
                          setDcrPorchaDefaultDoc('PORCHA');
                          setDcrPorchaModalOpen(true);
                        }}
                        className="px-3 py-2 rounded-xl bg-[#006A4E] hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{t('বিএস খতিয়ান পর্চা', 'BS Porcha')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Event History Log */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-[#006A4E]" />
                <span>{t('কার্যক্রম ও অডিট রেকর্ড (ইতিহাস)', 'Audit Trail & Event History')}</span>
              </h3>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {selectedTransfer.events && selectedTransfer.events.length > 0 ? (
                  selectedTransfer.events.map((ev: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{ev.event_type || ev.action_name}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(ev.created_at).toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">{ev.notes_bn || ev.notes_en}</p>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          {t('দায়িত্বপ্রাপ্ত:', 'Actor:')} {ev.actor_role} ({ev.actor_user})
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 text-center py-6">
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
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">{t('আপনার জমিসমূহের হস্তান্তর আবেদনসমূহ', 'Your Land Transfer Requests')}</h2>
              <p className="text-xs text-slate-500">{t('অনলাইন হস্তান্তর ট্র্যাক করুন এবং ক্রেতা বা কর্তৃপক্ষের পরবর্তী কার্যক্রম পর্যবেক্ষণ করুন।', 'Track ongoing transfers and authority reviews.')}</p>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {t('মোট আবেদন:', 'Total Applications:')}{' '}
              <span className="font-bold text-slate-900">{toBanglaDigits(transfers.length, lang)}</span>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 animate-spin text-[#006A4E]" />
              <span>{t('তথ্য লোড হচ্ছে...', 'Loading applications...')}</span>
            </div>
          ) : transfers.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-3 px-3">{t('ট্র্যাকিং কোড', 'Tracking Code')}</th>
                    <th className="py-3 px-3">{t('দাগ ও মৌজা', 'Dag & Mouza')}</th>
                    <th className="py-3 px-3">{t('দলিল', 'Deed')}</th>
                    <th className="py-3 px-3">{t('পরিমাণ', 'Area')}</th>
                    <th className="py-3 px-3">{t('বর্তমান ধাপ', 'Current Step')}</th>
                    <th className="py-3 px-3">{t('অবস্থা', 'Status')}</th>
                    <th className="py-3 px-3 text-right">{t('অ্যাকশন', 'Action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transfers.map((item: any) => {
                    const tracking = item.transfer_code || item.tracking_number || (item.id ? `TR-${item.id}` : 'TR');
                    const guidance = getActionableGuidance(item);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                            <span>{tracking}</span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyTracking(tracking, e)}
                              className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition cursor-pointer"
                              title={t('ট্র্যাকিং কোড কপি করুন', 'Copy Tracking Code')}
                            >
                              {copiedCode === tracking ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
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
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold">
                            <JargonTooltip term="DEED">
                              {item.deed_type || 'SALE'}
                            </JargonTooltip>
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-bold text-emerald-800">
                          {toBanglaDigits(item.transfer_area_decimal || '০', lang)} {t('শতক', 'dec')}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="text-[11px] font-semibold text-[#006A4E]">
                            {t(`ধাপ ${toBanglaDigits(item.current_step, lang)}/১৩`, `Step ${item.current_step}/13`)}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="space-y-1">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border shadow-2xs ${guidance.badgeClass}`}
                            >
                              {lang === 'bn' ? guidance.labelBn : guidance.labelEn}
                            </span>
                            <span className="block text-[10px] text-slate-500 truncate max-w-[150px]">
                              {lang === 'bn' ? guidance.descBn : guidance.descEn}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.status === 'COMPLETED' && Boolean(item.dcr || item.mutation_id) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDcrPorchaTransfer(item);
                                  setDcrPorchaDefaultDoc('DCR');
                                  setDcrPorchaModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#006A4E] font-bold text-[11px] transition cursor-pointer"
                                title={t('ডিজিটাল ডিসিআর ও পর্চা ডাউনলোড', 'Download DCR & Porcha')}
                              >
                                <Download className="w-3 h-3" />
                                <span>{t('ডিসিআর/পর্চা', 'DCR/Porcha')}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => loadTransferDetail(item.transfer_code || item.tracking_number || item.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#006A4E] font-bold text-xs transition cursor-pointer"
                            >
                              <span>{t('বিস্তারিত', 'View')}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
