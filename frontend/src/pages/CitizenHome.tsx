import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  FileText,
  Eye,
  Scale,
  UploadCloud,
  Download,
  AlertTriangle,
  Search,
  Building2,
  MapPin,
  RotateCw,
  X,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileCheck,
  ExternalLink,
  SlidersHorizontal,
  FolderOpen,
  Copy,
  Check,
  Sparkles,
  HelpCircle,
  PhoneCall,
  LayoutDashboard,
  Plus,
  Send,
  AlertOctagon,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { BhumiApi, api } from '../api/client';
import { useAppUI } from '../i18n';
import { toBanglaDigits } from '../theme/tokens';
import { AddressCascader, AddressSelection } from '../components/AddressCascader';
import { triggerAppNotification } from '../components/NotificationCenter';
import { LandHealthPassportModal } from '../components/LandHealthPassportModal';
import { CitizenProblemTriageModal } from '../components/CitizenProblemTriageModal';
import { JargonTooltip } from '../components/JargonTooltip';

export type CitizenSection = 'overview' | 'plots' | 'docs' | 'deeds' | 'transfers' | 'disputes' | 'tickets';

export const CitizenHome: React.FC<{ onNavigate: (target: string) => void }> = ({ onNavigate }) => {
  const { user, lang, t, activeSubTab, setActiveSubTab } = useAppUI();
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);

  // Internal tab state synced with activeSubTab
  const [section, setSection] = useState<CitizenSection>(() => {
    if (activeSubTab === 'vault') return 'plots';
    if (activeSubTab && ['overview', 'plots', 'docs', 'deeds', 'disputes', 'transfers', 'tickets'].includes(activeSubTab)) {
      return activeSubTab as CitizenSection;
    }
    return 'overview';
  });

  useEffect(() => {
    if (activeSubTab === 'vault') {
      setSection('plots');
    } else if (activeSubTab && ['overview', 'plots', 'docs', 'deeds', 'disputes', 'transfers', 'tickets'].includes(activeSubTab)) {
      setSection(activeSubTab as CitizenSection);
    }
  }, [activeSubTab]);

  const handleTabChange = (s: CitizenSection) => {
    setSection(s);
    setActiveSubTab(s);
  };

  // Data states
  const [vault, setVault] = useState<any>(null);
  const [docs, setDocs] = useState<any>(null);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<{ msg: string; err?: boolean } | null>(null);

  // Filters & Cascader
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedUpazila, setSelectedUpazila] = useState('');
  const [selectedMouzaId, setSelectedMouzaId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Plot for Docs / Modals
  const [selectedPlotId, setSelectedPlotId] = useState<string>('');
  const [inspectingDoc, setInspectingDoc] = useState<any | null>(null);
  const [requestingDocType, setRequestingDocType] = useState<string | null>(null);
  const [selectedDeedForModal, setSelectedDeedForModal] = useState<any | null>(null);
  const [selectedPlotForModal, setSelectedPlotForModal] = useState<any | null>(null);
  const [selectedDisputeForModal, setSelectedDisputeForModal] = useState<any | null>(null);
  const [passportPlot, setPassportPlot] = useState<any | null>(null);

  // Support Tickets & Transfers State
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const mapTicketContext = new URLSearchParams(window.location.search);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(() => Number(mapTicketContext.get('map_plot_id')) > 0);
  const [ticketSubject, setTicketSubject] = useState(() => mapTicketContext.get('map_plot_id') ? `ম্যাপের দাগ ${String(mapTicketContext.get('map_dag') || '').slice(0,40)} সম্পর্কে সহায়তা` : '');
  const [ticketCategory, setTicketCategory] = useState('GENERAL');
  const [ticketMessage, setTicketMessage] = useState(() => mapTicketContext.get('map_plot_id') ? `ম্যাপ থেকে সহায়তার অনুরোধ। রেকর্ড ID: ${Number(mapTicketContext.get('map_plot_id'))}; মৌজা ID: ${Number(mapTicketContext.get('map_location'))}।\nআমার সমস্যা: ` : '');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketReplyText, setTicketReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  const [citizenTransfers, setCitizenTransfers] = useState<any[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(false);

  // File Upload Form
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocType, setUploadDocType] = useState('OTHER');
  const [uploadTitleBn, setUploadTitleBn] = useState('');

  // Dispute Filing Form
  const [disputePlotId, setDisputePlotId] = useState('');
  const [disputeType, setDisputeType] = useState('OWNERSHIP_OBJECTION');
  const [disputeReason, setDisputeReason] = useState('');

  // Sale Lock Action state
  const [lockTogglingPlotId, setLockTogglingPlotId] = useState<number | null>(null);

  const loadTickets = async () => {
    setTicketsLoading(true);
    try {
      const res = await BhumiApi.listTickets();
      const list = Array.isArray(res) ? res : res.items || [];
      setTickets(list);
    } catch {
      setTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  };

  const loadTransfers = async () => {
    setTransfersLoading(true);
    try {
      const res = await BhumiApi.listTransfers();
      const list = Array.isArray(res) ? res : res.items || [];
      setCitizenTransfers(list);
    } catch {
      setCitizenTransfers([]);
    } finally {
      setTransfersLoading(false);
    }
  };

  const loadVault = async () => {
    setLoading(true);
    setError('');
    try {
      const v = await BhumiApi.getMyVault();
      setVault(v);
      const dsps = await BhumiApi.listDisputes().catch(() => []);
      setDisputes(Array.isArray(dsps) ? dsps : []);
    } catch (e: any) {
      if (e?.response?.status === 404) {
        setVault({ owned_plots: [], deeds: [] });
      } else {
        setError(e?.response?.data?.message_bn || e?.message || 'তথ্য লোড করতে সমস্যা হয়েছে।');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.is_identity_verified) {
      loadVault();
      loadTransfers();
      loadTickets();
      const onFocus = () => loadVault();
      window.addEventListener('focus', onFocus);
      return () => {
        window.removeEventListener('focus', onFocus);
      };
    } else {
      setLoading(false);
    }
  }, [user?.id, user?.is_identity_verified]);

  // Load documents when selectedPlotId changes
  useEffect(() => {
    if (selectedPlotId) {
      api
        .get(`/plots/${selectedPlotId}/documents`)
        .then((r) => setDocs(r.data))
        .catch(() => {
          setDocs(null);
          setError(t('নথির তালিকা লোড হয়নি। আবার চেষ্টা করুন।', 'Document list could not be loaded. Please retry.'));
        });
    } else {
      setDocs(null);
    }
  }, [selectedPlotId]);

  useEffect(() => {
    if (section === 'tickets') {
      loadTickets();
    } else if (section === 'transfers') {
      loadTransfers();
    } else if (section === 'docs') {
      if (!selectedPlotId && vault?.owned_plots?.length > 0) {
        setSelectedPlotId(String(vault.owned_plots[0].plot_id));
      }
    }
  }, [section, vault?.owned_plots, selectedPlotId]);

  const plots: any[] = vault?.owned_plots || [];
  const deeds: any[] = vault?.deeds || [];

  // Toggle Sale Lock
  const handleToggleSaleLock = async (plot: any) => {
    setLockTogglingPlotId(plot.plot_id);
    const isCurrentlyLocked = Boolean(plot.owner_sale_locked);
    const actionName = isCurrentlyLocked
      ? t('বিক্রয় লক প্রত্যাহার করা', 'Unlocking sale')
      : t('বিক্রয় লক সক্রিয় করা', 'Activating sale lock');
    try {
      await BhumiApi.togglePlotSaleLock(Number(plot.plot_id));
      triggerAppNotification({
        title_bn: !isCurrentlyLocked ? 'মালিকানা বিক্রয় লক সক্রিয়' : 'মালিকানা বিক্রয় লক প্রত্যাহার',
        title_en: !isCurrentlyLocked ? 'Sale Lock Activated' : 'Sale Lock Deactivated',
        message_bn: `দাগ নং ${plot.dag_no_bn || plot.dag_no}-এ বিক্রয় লক ${!isCurrentlyLocked ? 'সক্রিয়' : 'প্রত্যাহার'} করা হয়েছে।`,
        message_en: `Plot ${plot.dag_no} sale lock is now ${!isCurrentlyLocked ? 'active' : 'inactive'}.`,
        type: !isCurrentlyLocked ? 'SUCCESS' : 'WARNING',
        targetTab: 'home',
        targetSection: 'plots',
      });
      setNotice({
        msg: t(
          `দাগ নং ${plot.dag_no_bn || plot.dag_no}-এর ${actionName} সম্পন্ন হয়েছে।`,
          `Plot ${plot.dag_no} sale lock updated successfully.`
        ),
      });
      await loadVault();
    } catch (err: any) {
      setNotice({
        msg: err?.response?.data?.error || t('বিক্রয় লক পরিবর্তন ব্যর্থ হয়েছে।', 'Failed to toggle sale lock.'),
        err: true,
      });
    } finally {
      setLockTogglingPlotId(null);
    }
  };

  // Upload Document
  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !selectedPlotId) return;
    if (uploadFile.size > 10 * 1024 * 1024) {
      setNotice({ msg: t('ফাইলটি ১০ মেগাবাইটের মধ্যে রাখুন।', 'File size must be under 10MB.'), err: true });
      return;
    }
    setBusy(true);
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(uploadFile);
      });
      await api.post(`/plots/${selectedPlotId}/documents`, {
        document_type: uploadDocType,
        title_bn: uploadTitleBn.trim() || 'নাগরিকের সংরক্ষিত দলিলপত্র',
        title_en: uploadTitleBn.trim() || uploadFile.name,
        file_name: uploadFile.name,
        base64_data: b64,
      });
      setNotice({ msg: t('কাগজপত্র সফলভাবে ভল্টে সংরক্ষিত হয়েছে।', 'Document uploaded to vault successfully.') });
      setUploadFile(null);
      setUploadTitleBn('');
      const r = await api.get(`/plots/${selectedPlotId}/documents`);
      setDocs(r.data);
    } catch (err: any) {
      setNotice({ msg: err?.response?.data?.error || t('আপলোডে ত্রুটি হয়েছে।', 'Failed to upload document.'), err: true });
    } finally {
      setBusy(false);
    }
  };

  // Download Verified Document with robust base64 decoding
  const handleDocumentDownload = async (doc: any) => {
    if (!selectedPlotId || !doc.id) return;
    try {
      const res = await api.get(`/plots/${selectedPlotId}/documents/${doc.id}/download`);
      const payload = res.data;
      let blob: Blob;
      if (payload && payload.base64_content) {
        const binaryString = atob(payload.base64_content);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: payload.mime_type || 'application/pdf' });
      } else if (res.data instanceof Blob) {
        blob = res.data;
      } else {
        blob = new Blob([typeof payload === 'string' ? payload : JSON.stringify(payload)], { type: 'application/pdf' });
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = payload?.file_name || doc.file_name || `${doc.document_type || 'document'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      triggerAppNotification({
        title_bn: 'দলিল ডাউনলোড সম্পন্ন',
        title_en: 'Document Downloaded',
        message_bn: `"${doc.title_bn}" সফলভাবে ডাউনলোড হয়েছে।`,
        message_en: `"${doc.title_en || doc.title_bn}" downloaded successfully.`,
        type: 'SUCCESS',
        targetTab: 'home',
        targetSection: 'docs',
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message_bn || err?.response?.data?.message || err.message;
      setNotice({ msg: msg || t('ডাউনলোডে ত্রুটি হয়েছে।', 'Failed to download document.'), err: true });
    }
  };

  // 1-Click Request Missing Document from Vault
  const handleRequestMissingDoc = async (doc: any) => {
    if (!selectedPlotId) return;
    setRequestingDocType(doc.document_type);
    try {
      const prefill = doc.ticket_prefill || {};
      const res = await BhumiApi.requestMissingDocument(selectedPlotId, {
        document_type: doc.document_type,
        title_bn: prefill.title_bn || `অনুপস্থিত দলিল সংগ্রহ: ${doc.title_bn}`,
        title_en: prefill.title_en || `Missing Document: ${doc.title_en || doc.document_type}`,
        priority: doc.is_required ? 'HIGH' : 'NORMAL',
      });
      triggerAppNotification({
        title_bn: 'অনুপস্থিত দলিলের আবেদন দাখিল সম্পন্ন',
        title_en: 'Missing Document Request Submitted',
        message_bn: res?.message_bn || `টিকেট নং ${res?.ticket_code || 'TKT'} সফলভাবে নিবন্ধিত হয়েছে। রেকর্ড রুম এটি সংগ্রহ করবে।`,
        message_en: res?.message_en || `Ticket ${res?.ticket_code} created with SLA tracking.`,
        type: 'SUCCESS',
        targetTab: 'home',
        targetSection: 'tickets',
      });
      const r = await api.get(`/plots/${selectedPlotId}/documents`);
      setDocs(r.data);
      await loadTickets();
    } catch (err: any) {
      const msg = err?.response?.data?.message_bn || err?.response?.data?.message || err.message;
      alert(msg || 'অনুরোধ দাখিলে ত্রুটি হয়েছে।');
    } finally {
      setRequestingDocType(null);
    }
  };

  // File Dispute
  const handleFileDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputePlotId || !disputeReason.trim()) return;
    setBusy(true);
    try {
      await BhumiApi.fileDispute({
        plot_id: Number(disputePlotId),
        dispute_type: disputeType,
        description_bn: disputeReason.trim(),
        complainant_name_bn: user?.full_name_bn || 'সম্মানিত নাগরিক',
        complainant_nid: user?.nid || '',
      });
      setNotice({ msg: t('আপত্তি সফলভাবে দায়ের হয়েছে। এসি ল্যান্ড ট্রাইব্যুনাল শুনানি গ্রহণ করবেন।', 'Objection filed successfully.') });
      setDisputeReason('');
      setDisputePlotId('');
      const dsps = await BhumiApi.listDisputes();
      setDisputes(Array.isArray(dsps) ? dsps : []);
    } catch (err: any) {
      setNotice({ msg: err?.response?.data?.error || t('আপত্তি দাখিলে ত্রুটি হয়েছে।', 'Failed to file objection.'), err: true });
    } finally {
      setBusy(false);
    }
  };

  // Create Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;
    setTicketSubmitting(true);
    try {
      const res = await BhumiApi.createTicket({
        title: ticketSubject.trim(),
        message: ticketMessage.trim(),
        category: ticketCategory,
      });
      triggerAppNotification({
        title_bn: 'সহায়তা টিকিট দাখিল সম্পন্ন',
        title_en: 'Support Ticket Submitted',
        message_bn: `টিকিট নং ${res?.ticket?.ticket_code || res?.ticket_code || 'HELP'} সফলভাবে দাখিল হয়েছে।`,
        message_en: `Ticket registered with code ${res?.ticket?.ticket_code || res?.ticket_code || 'HELP'}.`,
        type: 'SUCCESS',
        targetTab: 'home',
        targetSection: 'tickets',
      });
      setTicketSubject('');
      setTicketMessage('');
      setIsNewTicketOpen(false);
      await loadTickets();
    } catch (err: any) {
      alert(err?.response?.data?.message_bn || err?.message || 'টিকিট দাখিলে ত্রুটি হয়েছে।');
    } finally {
      setTicketSubmitting(false);
    }
  };

  // Reply to Ticket
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !ticketReplyText.trim()) return;
    setReplySubmitting(true);
    try {
      const tCode = selectedTicket.ticket?.id || selectedTicket.id || selectedTicket.ticket?.ticket_code;
      const res = await BhumiApi.replyTicket(tCode, {
        message: ticketReplyText.trim(),
      });
      setSelectedTicket(res);
      setTicketReplyText('');
      await loadTickets();
    } catch (err: any) {
      alert(err?.response?.data?.message_bn || err?.message || 'উত্তর পাঠাতে ব্যর্থ হয়েছে।');
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleOpenTicketDetail = async (ticket: any) => {
    try {
      const full = await BhumiApi.getTicket(ticket.id || ticket.ticket_code);
      setSelectedTicket(full);
    } catch {
      setSelectedTicket(ticket);
    }
  };

  // Filtered Plots
  const filteredPlots = useMemo(() => {
    return plots.filter((p) => {
      if (selectedDivision && p.division_bn && p.division_bn !== selectedDivision) return false;
      if (selectedDistrict && p.district_bn && p.district_bn !== selectedDistrict) return false;
      if (selectedUpazila && p.upazila_bn && p.upazila_bn !== selectedUpazila) return false;
      if (selectedMouzaId && p.mouza_id && Number(p.mouza_id) !== Number(selectedMouzaId)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDag = (p.dag_no || '').toLowerCase().includes(q) || (p.dag_no_bn || '').includes(q);
        const matchKhatian = (p.khatian_no || '').toLowerCase().includes(q) || (p.khatian_no_bn || '').includes(q);
        const matchMouza = (p.mouza_bn || '').toLowerCase().includes(q) || (p.mouza_en || '').toLowerCase().includes(q);
        return matchDag || matchKhatian || matchMouza;
      }
      return true;
    });
  }, [plots, selectedDivision, selectedDistrict, selectedUpazila, selectedMouzaId, searchQuery]);

  // Filtered Deeds
  const filteredDeeds = useMemo(() => {
    return deeds.filter((d) => {
      if (selectedDivision && d.division_bn && d.division_bn !== selectedDivision) return false;
      if (selectedDistrict && d.district_bn && d.district_bn !== selectedDistrict) return false;
      if (selectedUpazila && d.upazila_bn && d.upazila_bn !== selectedUpazila) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNo = (d.deed_no || '').toLowerCase().includes(q);
        const matchDag = (d.dag_no || '').toLowerCase().includes(q) || (d.dag_no_bn || '').includes(q);
        const matchParty = (d.seller_name_bn || '').includes(q) || (d.buyer_name_bn || '').includes(q);
        return matchNo || matchDag || matchParty;
      }
      return true;
    });
  }, [deeds, selectedDivision, selectedDistrict, selectedUpazila, searchQuery]);

  // Metrics
  const totalLandDecimal = plots.reduce((acc, p) => acc + (Number(p.area_decimal) || Number(p.share_area_decimal) || 0), 0);
  const lockedPlotsCount = plots.filter((p) => p.owner_sale_locked).length;
  const activeDisputesCount = disputes.filter((d) => d.status === 'OPEN' || d.status === 'HEARING').length;
  const activeTransfersCount = citizenTransfers.filter((t) => t.status !== 'COMPLETED' && t.status !== 'REJECTED').length;

  const resetFilters = () => {
    setSelectedDivision('');
    setSelectedDistrict('');
    setSelectedUpazila('');
    setSelectedMouzaId('');
    setSearchQuery('');
  };

  return (
    <div className="space-y-3 sm:space-y-3.5 max-w-7xl mx-auto pb-8">
      {/* Toast Notice */}
      {notice && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition shadow-xs ${
            notice.err ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.err ? <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            <span className="leading-snug">{notice.msg}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="p-1 hover:bg-black/5 rounded-full cursor-pointer text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sleek Single-Screen Citizen Command Ribbon (উচ্চ ঘনত্বের এক-নজরে নাগরিক কমান্ড রিবন) */}
      <div className="bg-gradient-to-r from-[#004d38] via-[#006A4E] to-[#014734] rounded-2xl p-3 sm:p-3.5 text-white shadow-sm border border-emerald-700/60 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Avatar & Citizen Identity Pill */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/30 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
            <UserCheck className="w-5 h-5 text-emerald-200" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-black text-white tracking-tight truncate">
                {lang === 'bn' ? (user?.full_name_bn || 'সম্মানিত নাগরিক') : (user?.full_name_en || 'Dear Citizen')}
              </h1>
              {user?.is_identity_verified ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/25 text-emerald-100 border border-emerald-400/40 flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                  {t('এনআইডি যাচাইকৃত', 'NID Verified')}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900 flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  {t('যাচাই অমীমাংসিত', 'Pending')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-emerald-100/80 font-mono truncate mt-0.5">
              <span>{t('এনআইডি', 'NID')}: {user?.nid ? toBanglaDigits(user.nid, lang) : '---'}</span>
              <span>•</span>
              <span className="text-amber-200 font-sans font-bold flex items-center gap-1">
                <PhoneCall className="w-2.5 h-2.5" />
                ১৬১২২
              </span>
            </div>
          </div>
        </div>

        {/* Center: 4 Micro-KPI Metric Badges (১-ক্লিকে জাম্প) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 max-w-2xl px-0 lg:px-2">
          {/* Metric 1: Total Land */}
          <button
            type="button"
            onClick={() => handleTabChange('plots')}
            className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-left transition cursor-pointer flex flex-col justify-center"
          >
            <div className="text-[10px] font-medium text-emerald-200 truncate">{t('মোট জমি', 'Total Land')}</div>
            <div className="text-xs sm:text-sm font-black text-white truncate">
              {toBanglaDigits(totalLandDecimal.toFixed(1), lang)} <span className="text-[10px] font-normal text-emerald-200">{t('শতক', 'dec')}</span>
            </div>
          </button>

          {/* Metric 2: Sale Lock */}
          <button
            type="button"
            onClick={() => handleTabChange('plots')}
            className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-left transition cursor-pointer flex flex-col justify-center"
          >
            <div className="text-[10px] font-medium text-emerald-200 truncate">{t('বিক্রয় লক', 'Sale Lock')}</div>
            <div className="text-xs sm:text-sm font-black text-white flex items-center gap-1 truncate">
              <span>{toBanglaDigits(lockedPlotsCount, lang)}/{toBanglaDigits(plots.length, lang)}</span>
              <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                lockedPlotsCount > 0 ? 'bg-emerald-400/30 text-emerald-100' : 'bg-rose-500/30 text-rose-200'
              }`}>
                {lockedPlotsCount > 0 ? t('সুরক্ষিত', 'Locked') : t('উন্মুক্ত', 'Unlocked')}
              </span>
            </div>
          </button>

          {/* Metric 3: Digital Deeds */}
          <button
            type="button"
            onClick={() => handleTabChange('deeds')}
            className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-left transition cursor-pointer flex flex-col justify-center"
          >
            <div className="text-[10px] font-medium text-emerald-200 truncate">{t('মূল দলিল', 'Deeds')}</div>
            <div className="text-xs sm:text-sm font-black text-white truncate">
              {toBanglaDigits(deeds.length, lang)} <span className="text-[10px] font-normal text-emerald-200">{t('টি', 'deeds')}</span>
            </div>
          </button>

          {/* Metric 4: Active Transfers */}
          <button
            type="button"
            onClick={() => handleTabChange('transfers')}
            className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-left transition cursor-pointer flex flex-col justify-center"
          >
            <div className="text-[10px] font-medium text-emerald-200 truncate">{t('চলমান আবেদন', 'Active Apps')}</div>
            <div className="text-xs sm:text-sm font-black text-white truncate">
              {toBanglaDigits(activeTransfersCount, lang)} <span className="text-[10px] font-normal text-emerald-200">{t('টি', 'active')}</span>
            </div>
          </button>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 self-end lg:self-auto">
          <button
            type="button"
            onClick={() => setIsTriageModalOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border border-white/20"
            title={t('আপনার কী সাহায্য দরকার?', 'Need Help? Guide')}
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-200" />
            <span className="hidden sm:inline">{t('সহায়তা গাইড', 'Guide')}</span>
          </button>

          <button
            type="button"
            onClick={loadVault}
            disabled={loading}
            className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold transition flex items-center justify-center cursor-pointer border border-white/20"
            title={t('রিফ্রেশ', 'Refresh')}
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('applications?new=1')}
            className="px-3 py-1.5 rounded-lg bg-[#F42A41] hover:bg-rose-700 text-white text-xs font-black transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>{t('হস্তান্তর আবেদন', 'Apply')}</span>
          </button>
        </div>
      </div>

      {/* Horizontal Service Category Tabs (সহজ মেনু বার — গ্রাহকের জন্য স্পষ্ট ও ব্যবহারবান্ধব) */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-1 shadow-2xs flex items-center gap-1 overflow-x-auto scrollbar-thin">
        {[
          { id: 'overview' as CitizenSection, label: t('সারসংক্ষেপ ও সেবা', 'Overview & Hub'), icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
          { id: 'plots' as CitizenSection, label: t('আমার জমি ও বিক্রয় লক', 'My Land & Locks'), icon: <ShieldCheck className="w-3.5 h-3.5" />, count: plots.length },
          { id: 'docs' as CitizenSection, label: t('ডিজিটাল কাগজপত্র ভল্ট', 'Document Vault'), icon: <FolderOpen className="w-3.5 h-3.5" /> },
          { id: 'deeds' as CitizenSection, label: t('রেজিস্ট্রিকৃত মূল দলিল', 'Registered Deeds'), icon: <FileCheck className="w-3.5 h-3.5" />, count: deeds.length },
          { id: 'transfers' as CitizenSection, label: t('হস্তান্তর ট্র্যাকার', 'Transfer Tracker'), icon: <Sparkles className="w-3.5 h-3.5" />, count: activeTransfersCount > 0 ? activeTransfersCount : undefined },
          { id: 'disputes' as CitizenSection, label: t('আপত্তি ও বিরোধ', 'Disputes'), icon: <AlertOctagon className="w-3.5 h-3.5" />, count: activeDisputesCount > 0 ? activeDisputesCount : undefined },
          { id: 'tickets' as CitizenSection, label: t('সহায়তা ও সাপোর্ট', 'Help & Support'), icon: <FileText className="w-3.5 h-3.5" />, count: tickets.length > 0 ? tickets.length : undefined },
        ].map((tab) => {
          const isActive = section === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer select-none ${
                isActive
                  ? 'bg-[#006A4E] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {toBanglaDigits(tab.count, lang)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Universal Address Cascader Toolbar (Used on plots, deeds, disputes) */}
      {(section === 'plots' || section === 'deeds' || section === 'disputes') && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex-1 min-w-0">
            <AddressCascader
              lang={lang}
              selectedDivision={selectedDivision}
              selectedDistrict={selectedDistrict}
              selectedUpazila={selectedUpazila}
              selectedMouzaId={selectedMouzaId}
              onChange={(sel: AddressSelection) => {
                setSelectedDivision(sel.division_bn);
                setSelectedDistrict(sel.district_bn);
                setSelectedUpazila(sel.upazila_bn);
                setSelectedMouzaId(sel.mouza_id ? String(sel.mouza_id) : '');
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(
                  'দাগ, খতিয়ান বা দলিল নং খুঁজুন...',
                  'Search plot, khatian, deed no...'
                )}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-none"
              />
            </div>

            {(selectedDivision || selectedDistrict || selectedUpazila || selectedMouzaId || searchQuery) && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] font-bold text-slate-500 hover:text-rose-600 transition cursor-pointer px-2 py-1.5 rounded-lg hover:bg-slate-100 whitespace-nowrap"
              >
                {t('রিসেট', 'Reset')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* SECTION 1: OVERVIEW & SERVICE HUB (সারসংক্ষেপ ও সেবা হাব) */}
      {section === 'overview' && (
        <div className="space-y-3.5">
          {/* Quick Action Hub (১-ক্লিকে সেবা গ্রহণ করুন — ৬টি কমপ্যাক্ট টাইল) */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#006A4E]" />
                <span>{t('১-ক্লিকে প্রয়োজনীয় নাগরিক সেবা', 'Quick Citizen Services')}</span>
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                {t('দ্রুত অ্যাক্সেস', '1-Click Shortcuts')}
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
              {/* Service 1: Sale Lock */}
              <div
                onClick={() => handleTabChange('plots')}
                className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 hover:border-emerald-500 hover:shadow-2xs transition cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#006A4E] group-hover:bg-[#006A4E] group-hover:text-white transition shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-xs text-slate-900 group-hover:text-[#006A4E] transition truncate">
                      {t('মালিকানা বিক্রয় লক', 'Owner Sale Lock')}
                    </h3>
                    <p className="text-[10px] text-slate-500 truncate">
                      {t('অননুমোদিত বিক্রি বা জাল হস্তান্তর বন্ধ রাখুন', 'Block unauthorized registration')}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#006A4E] group-hover:translate-x-0.5 transition shrink-0" />
              </div>

              {/* Service 2: Documents Vault */}
              <div
                onClick={() => handleTabChange('docs')}
                className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 hover:border-blue-500 hover:shadow-2xs transition cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition shrink-0">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-xs text-slate-900 group-hover:text-blue-700 transition truncate">
                      {t('কাগজপত্র ও পর্চা ভল্ট', 'Document Vault')}
                    </h3>
                    <p className="text-[10px] text-slate-500 truncate">
                      {t('খতিয়ান, বায়া দলিল ও দাখিলা ডাউনলোড', 'Khatian, deeds, dakhila')}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition shrink-0" />
              </div>

              {/* Service 3: Transfer Application */}
              <div
                onClick={() => onNavigate('applications?new=1')}
                className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 hover:border-rose-500 hover:shadow-2xs transition cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-xs text-slate-900 group-hover:text-rose-600 transition truncate">
                      {t('জমি হস্তান্তর আবেদন', 'Transfer Application')}
                    </h3>
                    <p className="text-[10px] text-slate-500 truncate">
                      {t('সরকারি ফি হিসাব ও সাব-রেজিস্ট্রেশন', 'Govt fees and registration')}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition shrink-0" />
              </div>

              {/* Service 4: Faraiz Calculator */}
              <div
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-faraiz-calculator', { detail: {} }));
                }}
                className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 hover:border-purple-500 hover:shadow-2xs transition cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 group-hover:bg-purple-700 group-hover:text-white transition shrink-0">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <h3 className="font-extrabold text-xs text-slate-900 group-hover:text-purple-700 transition truncate">
                        <JargonTooltip term="FARAIZ">
                          {t('উত্তরাধিকার ফারায়েজ', 'Faraiz Engine')}
                        </JargonTooltip>
                      </h3>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">
                      {t('শরিয়াহ ওয়ারিশ হিস্যা ও নামজারি', 'Shariah shares calculation')}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-700 group-hover:translate-x-0.5 transition shrink-0" />
              </div>

              {/* Service 5: Land Health Passport */}
              <div
                onClick={() => {
                  if (plots.length > 0) {
                    setPassportPlot(plots[0]);
                  } else {
                    handleTabChange('plots');
                  }
                }}
                className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 hover:border-amber-500 hover:shadow-2xs transition cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-xs text-slate-900 group-hover:text-amber-700 transition truncate">
                      {t('জমির স্বাস্থ্য পাসপোর্ট', 'Health Passport')}
                    </h3>
                    <p className="text-[10px] text-slate-500 truncate">
                      {t('৫-স্তরের নিরীক্ষা ও কিউআর সনদ', '5-point audit certificate')}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-700 group-hover:translate-x-0.5 transition shrink-0" />
              </div>

              {/* Service 6: Support Tickets */}
              <div
                onClick={() => handleTabChange('tickets')}
                className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 hover:border-teal-500 hover:shadow-2xs transition cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 group-hover:bg-teal-700 group-hover:text-white transition shrink-0">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-xs text-slate-900 group-hover:text-teal-700 transition truncate">
                      {t('সহায়তা ও সাপোর্ট (১৬১২২)', 'Helpdesk (16122)')}
                    </h3>
                    <p className="text-[10px] text-slate-500 truncate">
                      {t('রেকর্ড যাচাই ও প্রোফাইল সমাধান', 'Record verification desk')}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-700 group-hover:translate-x-0.5 transition shrink-0" />
              </div>
            </div>
          </div>

          {/* Smart Land Portfolio Spotlight (আমার জমির দ্রুত ভিউ - কমপ্যাক্ট টেবিল/গ্রিড) */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#006A4E]" />
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900">
                  {t('আমার মালিকানাধীন জমির সংক্ষিপ্ত তালিকা', 'My Land Portfolio Spotlight')}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => handleTabChange('plots')}
                className="text-xs font-bold text-[#006A4E] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{t('সব জমি দেখুন', 'View All Land Plots')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {plots.length === 0 ? (
              <div className="py-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <MapPin className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <p className="font-bold text-xs text-slate-700">{t('আপনার নামে কোনো জমির রেকর্ড যুক্ত নেই।', 'No land records linked.')}</p>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setIsTriageModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-200" />
                    <span>{t('জমি দাবি ও গাইড', 'Claim Land & Guide')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {plots.slice(0, 3).map((plot) => (
                  <div
                    key={plot.plot_id}
                    className="p-3 rounded-xl border border-slate-200/90 bg-white hover:border-[#006A4E]/60 transition flex flex-col justify-between space-y-2 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                          {plot.survey_type || 'BS'}-{toBanglaDigits(plot.khatian_no_bn || plot.khatian_no, lang)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                            plot.owner_sale_locked
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-[#006A4E]'
                          }`}
                        >
                          {plot.owner_sale_locked ? <Lock className="w-2.5 h-2.5 text-rose-700" /> : <Unlock className="w-2.5 h-2.5 text-emerald-700" />}
                          {plot.owner_sale_locked ? t('লকড', 'Locked') : t('উন্মুক্ত', 'Unlocked')}
                        </span>
                      </div>

                      <div className="mt-1.5">
                        <h4 className="font-black text-slate-900 text-sm">
                          {t('দাগ নং', 'Plot')} {toBanglaDigits(plot.dag_no_bn || plot.dag_no, lang)}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">
                          {plot.mouza_bn}, {plot.upazila_bn}
                        </p>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg">
                        <span className="text-slate-500 text-[11px]">{plot.land_type_bn || t('ভিটা (আবাসিক)', 'Residential')}</span>
                        <span className="font-black text-[#006A4E] text-xs">
                          {toBanglaDigits(plot.area_decimal ?? plot.share_area_decimal, lang)} {t('শতক', 'dec')}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={lockTogglingPlotId === plot.plot_id}
                        onClick={() => handleToggleSaleLock(plot)}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                          plot.owner_sale_locked
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {lockTogglingPlotId === plot.plot_id ? (
                          <RotateCw className="w-3 h-3 animate-spin" />
                        ) : plot.owner_sale_locked ? (
                          <Unlock className="w-3 h-3" />
                        ) : (
                          <Lock className="w-3 h-3" />
                        )}
                        <span>{plot.owner_sale_locked ? t('আনলক', 'Unlock') : t('বিক্রয় লক', 'Lock')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlotId(String(plot.plot_id));
                          handleTabChange('plots');
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                        title={t('ককপিটে বিস্তারিত দেখুন', 'View in Cockpit')}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Transfer Banner (চলমান হস্তান্তর আবেদন থাকলে প্রদর্শিত হবে) */}
          {activeTransfersCount > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 rounded font-bold text-[9px] bg-amber-200 text-amber-900">
                      {t('চলমান', 'In Progress')}
                    </span>
                    <h4 className="font-extrabold text-xs text-slate-900 truncate">
                      {t('আপনার জমি হস্তান্তর আবেদন প্রক্রিয়াধীন রয়েছে', 'Land transfer in progress')}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-600 truncate mt-0.5">
                    {t('অগ্রগতি ও সাব-রেজিস্ট্রেশন তারিখ দেখতে ট্র্যাকার খুলুন', 'Track verification, stamp fee & registration')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleTabChange('transfers')}
                className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>{t('ট্র্যাকার', 'Tracker')}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: PLOTS & SALE LOCK (আমার জমি ও বিক্রয় লক - মাস্টার-ডিটেইল ককপিট) */}
      {section === 'plots' && (
        <div className="space-y-3">
          {filteredPlots.length === 0 ? (
            <div className="bg-white p-10 text-center text-slate-500 rounded-2xl border border-slate-200">
              <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-sm text-slate-700">
                {t('ফিল্টারের শর্তানুযায়ী কোনো জমি পাওয়া যায়নি।', 'No land matched the selected filters.')}
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-2 text-xs text-[#006A4E] font-bold hover:underline cursor-pointer"
              >
                {t('ফিল্টার রিসেট করুন', 'Reset Filters')}
              </button>
            </div>
          ) : (
            (() => {
              const activePlot = filteredPlots.find((p) => String(p.plot_id) === String(selectedPlotId)) || filteredPlots[0];
              return (
                <div className="flex flex-col lg:flex-row gap-3 items-start">
                  {/* Master List Pane (Left Column: 340px) */}
                  <div className="w-full lg:w-80 xl:w-96 shrink-0 space-y-2 lg:max-h-[calc(100vh-210px)] lg:overflow-y-auto pr-0 lg:pr-1">
                    <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-bold">
                      <span>{t('জমির তালিকা', 'Land Asset List')} ({toBanglaDigits(filteredPlots.length, lang)})</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {toBanglaDigits(lockedPlotsCount, lang)} {t('লককৃত', 'locked')}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {filteredPlots.map((plot) => {
                        const isSelected = String(activePlot?.plot_id) === String(plot.plot_id);
                        return (
                          <div
                            key={plot.plot_id}
                            onClick={() => setSelectedPlotId(String(plot.plot_id))}
                            className={`p-3 rounded-xl border text-left transition cursor-pointer relative flex flex-col justify-between ${
                              isSelected
                                ? 'bg-emerald-50/90 border-[#006A4E] ring-2 ring-emerald-500/20 shadow-xs'
                                : 'bg-white border-slate-200/90 hover:border-emerald-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-black text-sm text-slate-900 truncate">
                                    {t('দাগ', 'Plot')} #{toBanglaDigits(plot.dag_no_bn || plot.dag_no, lang)}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-slate-100 text-slate-600">
                                    {plot.survey_type || 'BS'}-{toBanglaDigits(plot.khatian_no_bn || plot.khatian_no, lang)}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {plot.mouza_bn}, {plot.upazila_bn}
                                </div>
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 flex items-center gap-1 ${
                                  plot.owner_sale_locked
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : 'bg-emerald-100 text-[#006A4E] border border-emerald-200'
                                }`}
                              >
                                {plot.owner_sale_locked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                                {plot.owner_sale_locked ? t('লকড', 'Locked') : t('উন্মুক্ত', 'Unlocked')}
                              </span>
                            </div>

                            <div className="mt-2 pt-2 border-t border-slate-100/80 flex items-center justify-between text-xs">
                              <span className="text-slate-500 text-[11px]">{plot.land_type_bn || t('ভিটা (আবাসিক)', 'Residential')}</span>
                              <span className="font-black text-[#006A4E] text-xs">
                                {toBanglaDigits(plot.area_decimal ?? plot.share_area_decimal, lang)} {t('শতক', 'dec')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Detail Dossier Pane (Right Column: Cockpit 360°) */}
                  <div className="flex-1 min-w-0 w-full bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3.5 lg:max-h-[calc(100vh-210px)] lg:overflow-y-auto">
                    {/* Header: Selected Plot Overview & Primary Sale Lock Switch */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-black text-slate-900 text-lg sm:text-xl">
                            {t('দাগ নং', 'Plot')} {toBanglaDigits(activePlot.dag_no_bn || activePlot.dag_no, lang)}
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 font-mono">
                            {activePlot.survey_type || 'BS'} {t('খতিয়ান', 'Khatian')}: {toBanglaDigits(activePlot.khatian_no_bn || activePlot.khatian_no, lang)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {activePlot.mouza_bn}, {activePlot.upazila_bn}, {activePlot.district_bn}
                        </p>
                      </div>

                      {/* Prominent 1-Click Sale Lock Action */}
                      <button
                        type="button"
                        disabled={lockTogglingPlotId === activePlot.plot_id}
                        onClick={() => handleToggleSaleLock(activePlot)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs shrink-0 ${
                          activePlot.owner_sale_locked
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300'
                            : 'bg-[#006A4E] hover:bg-emerald-800 text-white'
                        }`}
                      >
                        {lockTogglingPlotId === activePlot.plot_id ? (
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        ) : activePlot.owner_sale_locked ? (
                          <Unlock className="w-3.5 h-3.5 text-rose-700" />
                        ) : (
                          <Lock className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {activePlot.owner_sale_locked
                            ? t('লক প্রত্যাহার করুন (আনলক)', 'Unlock Plot Sale')
                            : t('বিক্রয় লক চালু করুন (সুরক্ষিত)', 'Activate Sale Lock')}
                        </span>
                      </button>
                    </div>

                    {/* Key Metrics Ribbon (4 Micro-KPIs) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                        <span className="text-[10px] text-slate-500 font-medium block">{t('জমির শ্রেণি', 'Land Class')}</span>
                        <strong className="text-slate-800 text-xs block mt-0.5 truncate">{activePlot.land_type_bn || t('ভিটা (আবাসিক)', 'Residential')}</strong>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                        <span className="text-[10px] text-slate-500 font-medium block">{t('রেকর্ডকৃত আয়তন', 'Area')}</span>
                        <strong className="text-[#006A4E] text-xs font-black block mt-0.5 truncate">
                          {toBanglaDigits(activePlot.area_decimal ?? activePlot.share_area_decimal, lang)} {t('শতক', 'dec')}
                        </strong>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                        <span className="text-[10px] text-slate-500 font-medium block">{t('মালিকানার অংশ', 'Share')}</span>
                        <strong className="text-slate-700 text-xs block mt-0.5 truncate">{activePlot.share_fraction || '১/১'}</strong>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                        <span className="text-[10px] text-slate-500 font-medium block">{t('ডিজিটাল স্থিতি', 'Status')}</span>
                        <strong className="text-emerald-700 text-xs font-bold block mt-0.5 truncate flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          {t('পরিমাপ নিশ্চিত', 'Verified')}
                        </strong>
                      </div>
                    </div>

                    {/* Sale Lock Anti-Fraud Intelligence Box */}
                    <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                      activePlot.owner_sale_locked
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                        : 'bg-amber-50/80 border-amber-200 text-amber-950'
                    }`}>
                      {activePlot.owner_sale_locked ? (
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <div className="leading-relaxed">
                        <strong>{activePlot.owner_sale_locked ? t('মালিকানা সুরক্ষিত:', 'Plot Protected:') : t('সতর্কতা:', 'Notice:')}</strong>{' '}
                        {activePlot.owner_sale_locked
                          ? t(
                              'বিক্রয় লক চালু রয়েছে। সাব-রেজিস্ট্রি অফিসে কোনো দলিলের অননুমোদিত রেজিস্ট্রেশন হতে পারবে না।',
                              'Sale Lock is active. No unauthorized deed registration can proceed at the Sub-Registry Office.'
                            )
                          : t(
                              'বিক্রয় লক নিষ্ক্রিয় রয়েছে। অননুমোদিত বিক্রি বা প্রতারণা এড়াতে এখনই বিক্রয় লক সক্রিয় রাখুন।',
                              'Sale lock is OFF. Turn ON sale lock to block fraudulent deed transfers.'
                            )}
                      </div>
                    </div>

                    {/* Quick Action Ribbon (Early Access Narrow Widgets) */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        {t('দ্রুত সেবা ও অ্যাকশন', 'Quick Actions & Services')}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPlotId(String(activePlot.plot_id));
                            handleTabChange('docs');
                          }}
                          className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-400 bg-white hover:bg-emerald-50/40 text-slate-800 font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-[#006A4E]" />
                          <span>{t('কাগজপত্র ভল্ট', 'Documents')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            window.dispatchEvent(
                              new CustomEvent('open-faraiz-calculator', {
                                detail: {
                                  plotId: activePlot.plot_id,
                                  area: activePlot.area_decimal ?? activePlot.share_area_decimal,
                                },
                              })
                            );
                          }}
                          className="p-2.5 rounded-xl border border-purple-200 hover:border-purple-400 bg-purple-50/40 hover:bg-purple-100/50 text-purple-800 font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Scale className="w-3.5 h-3.5 text-purple-700" />
                          <span>{t('ফারায়েজ বণ্টন', 'Faraiz')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPassportPlot(activePlot)}
                          className="p-2.5 rounded-xl border border-amber-300 hover:border-amber-400 bg-amber-50/50 hover:bg-amber-100/60 text-amber-800 font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                          <span>{t('স্বাস্থ্য পাসপোর্ট', 'Passport')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onNavigate('applications?new=1')}
                          className="p-2.5 rounded-xl border border-rose-200 hover:border-rose-400 bg-rose-50/40 hover:bg-rose-100/50 text-rose-800 font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-rose-600" />
                          <span>{t('হস্তান্তর আবেদন', 'Transfer')}</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Vault Document Inspection inline */}
                    {docs && docs.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <FileCheck className="w-3.5 h-3.5 text-[#006A4E]" />
                            {t('এই দাগের সংযুক্ত ডিজিটাল রেকর্ডস', 'Linked Documents')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTabChange('docs')}
                            className="text-[11px] font-bold text-[#006A4E] hover:underline cursor-pointer"
                          >
                            {t('সব দেখুন', 'View All')} ➔
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                          {docs.slice(0, 4).map((d: any) => (
                            <div
                              key={d.document_type || d.id}
                              className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-1.5 text-[11px]"
                            >
                              <div className="truncate font-medium text-slate-800">
                                {d.title_bn || d.document_type}
                              </div>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                                d.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {d.status === 'VERIFIED' ? t('যাচাইকৃত', 'Verified') : t('সংরক্ষিত', 'Stored')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* SECTION 3: DIGITAL DOCUMENTS VAULT (ডিজিটাল কাগজপত্র ভল্ট) */}
      {section === 'docs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Select Land Plot & Upload Box */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-3 shadow-xs">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-[#006A4E]" />
                <span>{t('কোন জমির কাগজপত্র দেখতে চান?', 'Select Land Plot')}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {t('নিচের তালিকা থেকে যেকোনো একটি জমি নির্বাচন করুন:', 'Click a plot to inspect its vault:')}
              </p>

              <div className="space-y-2">
                {plots.map((p) => (
                  <button
                    key={p.plot_id}
                    type="button"
                    onClick={() => setSelectedPlotId(String(p.plot_id))}
                    className={`w-full p-3.5 rounded-xl text-left text-xs font-bold transition flex items-center justify-between border cursor-pointer ${
                      String(selectedPlotId) === String(p.plot_id)
                        ? 'bg-emerald-50/90 border-[#006A4E] text-[#006A4E] shadow-2xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-black">{t('দাগ নং', 'Plot')} {toBanglaDigits(p.dag_no_bn || p.dag_no, lang)}</div>
                      <div className="text-[11px] font-normal text-slate-500 mt-0.5">{p.mouza_bn} · {p.upazila_bn}</div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold">
                      {toBanglaDigits(p.area_decimal ?? p.share_area_decimal, lang)} {t('শতক', 'dec')}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Document Upload Form */}
            {selectedPlotId && (
              <form onSubmit={handleDocumentUpload} className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-3 shadow-xs">
                <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-[#006A4E]" />
                  <span>{t('নতুন কাগজপত্র যুক্ত করুন', 'Upload Supporting Document')}</span>
                </h4>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    {t('কাগজপত্রের বিবরণ বা শিরোনাম*', 'Document Title*')}
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadTitleBn}
                    onChange={(e) => setUploadTitleBn(e.target.value)}
                    placeholder={t('উদা: বায়া কবলা দলিল নং ১৫৪০', 'e.g. Historical Deed 1540')}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    {t('দলিলের ধরন*', 'Document Type*')}
                  </label>
                  <select
                    value={uploadDocType}
                    onChange={(e) => setUploadDocType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-none bg-white"
                  >
                    <option value="DEED">{t('বায়া দলিল (Historical Deed)', 'Historical Deed')}</option>
                    <option value="KHATIAN">{t('খতিয়ানের নকল / পরচা', 'Khatian Copy')}</option>
                    <option value="TAX_RECEIPT">{t('ভূমি উন্নয়ন কর দাখিলা (LD-Tax)', 'Tax Receipt')}</option>
                    <option value="WARISH">{t('ওয়ারিশান সনদপত্র', 'Inheritance Certificate')}</option>
                    <option value="OTHER">{t('অন্যান্য প্রমাণক', 'Other Evidence')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    {t('পিডিএফ বা ছবি (সর্বোচ্চ ১০ মেগাবাইট)*', 'PDF or Image (Max 10MB)*')}
                  </label>
                  <input
                    type="file"
                    required
                    accept="application/pdf,image/png,image/jpeg"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy || !uploadFile}
                  className="w-full py-2.5 rounded-xl bg-[#006A4E] hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{busy ? t('সংরক্ষণ হচ্ছে...', 'Saving...') : t('কাগজপত্র জমা দিন', 'Upload to Vault')}</span>
                </button>
              </form>
            )}
          </div>

          {/* Right Column: 7 Core Documents Checklist & Download Actions */}
          <div className="lg:col-span-2 space-y-4">
            {!selectedPlotId ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-xs">
                <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="font-bold text-base text-slate-700">
                  {t('বাঁ পাশের তালিকা থেকে কোনো একটি জমি নির্বাচন করুন', 'Select a plot from the left panel')}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {t('নির্বাচিত জমির সকল অনুমোদিত দলিল, খতিয়ান ও কর রশিদ এখানে প্রদর্শিত হবে।', 'All linked records and verified digital copies will appear here.')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active Plot Header & 3 Metric Pills */}
                {(() => {
                  const activePlot = plots.find((p) => String(p.plot_id) === String(selectedPlotId));
                  return (
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#006A4E] border border-emerald-200 flex items-center justify-center">
                            <FolderOpen className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-black text-base text-slate-900">
                              {t('দাগ নং', 'Plot No.')} {toBanglaDigits(activePlot?.dag_no_bn || activePlot?.dag_no || selectedPlotId, lang)} · {activePlot?.mouza_bn || ''} ({activePlot?.upazila_bn || ''})
                            </h4>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">
                              {t('খতিয়ান নং', 'Khatian No.')}: {toBanglaDigits(activePlot?.khatian_no_bn || activePlot?.khatian_no || '---', lang)} · {t('পরিমাণ', 'Area')}: {toBanglaDigits(activePlot?.area_decimal ?? activePlot?.share_area_decimal ?? 0, lang)} {t('শতক', 'dec')}
                            </p>
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-[#006A4E] border border-emerald-200 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4" />
                          <span>{t('সার্বভৌম ডিজিটাল ভল্ট', 'Sovereign Digital Vault')}</span>
                        </span>
                      </div>

                      {/* 3 Status Pills */}
                      <div className="grid grid-cols-3 gap-3 text-center text-xs">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="text-[11px] text-slate-500 font-bold">{t('অপরিহার্য নথির তালিকা', 'Total Checklist')}</div>
                          <div className="font-black text-slate-800 text-base mt-0.5">
                            {toBanglaDigits(docs?.total ?? (docs?.items || []).length, lang)} {t('টি', '')}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                          <div className="text-[11px] text-emerald-800 font-bold">{t('ভল্টে প্রস্তুত ও যাচাইকৃত', 'Verified Ready')}</div>
                          <div className="font-black text-[#006A4E] text-base mt-0.5">
                            {toBanglaDigits(docs?.verified_count ?? 0, lang)} {t('টি', '')}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                          <div className="text-[11px] text-amber-800 font-bold">{t('অনুপস্থিত (আবেদনযোগ্য)', 'Missing (Requestable)')}</div>
                          <div className="font-black text-amber-800 text-base mt-0.5">
                            {toBanglaDigits(docs?.missing_count ?? 0, lang)} {t('টি', '')}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 7 Essential Land Records List */}
                <div className="space-y-3">
                  {(docs?.items || []).length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs">
                      {t('এই দাগে এখনও কোনো নথি যুক্ত করা হয়নি।', 'No documents linked for this plot.')}
                    </div>
                  ) : (
                    docs.items.map((doc: any, idx: number) => {
                      const isReady = doc.status === 'VERIFIED' || Boolean(doc.id && doc.file_name);
                      return (
                        <div
                          key={doc.id || doc.document_type || idx}
                          className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
                            isReady
                              ? 'bg-white border-slate-200 hover:border-emerald-500'
                              : 'bg-amber-50/60 border-amber-200 hover:border-amber-300'
                          }`}
                        >
                          <div className="flex items-start gap-3.5">
                            <div
                              className={`w-11 h-11 rounded-xl shrink-0 flex items-center justify-center mt-0.5 ${
                                isReady
                                  ? 'bg-emerald-50 text-[#006A4E] border border-emerald-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {isReady ? <FileCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                            </div>

                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h5 className="font-black text-xs md:text-sm text-slate-900">
                                  {lang === 'bn' ? doc.title_bn : (doc.title_en || doc.title_bn)}
                                </h5>
                                {doc.is_required && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                                    {t('অপরিহার্য', 'Required')}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <span className="font-mono text-[11px] text-slate-600 font-semibold">{doc.document_type}</span>
                                {doc.file_name && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono text-slate-700">{doc.file_name}</span>
                                  </>
                                )}
                                {doc.file_size_bytes > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono">{Math.round(doc.file_size_bytes / 1024)} KB</span>
                                  </>
                                )}
                              </div>

                              {/* Trust Status Badge */}
                              <div className="pt-0.5 flex flex-wrap items-center gap-2">
                                {isReady ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#006A4E] border border-emerald-200 inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-[#006A4E]" />
                                    <span>{t('ভল্টে সংরক্ষিত ও যাচাইকৃত', 'Verified in Vault')}</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>{t('ভল্টে কপি নেই — ১-ক্লিকে আবেদনের সুযোগ', 'Missing in Vault (1-Click Request)')}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            {isReady ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setInspectingDoc(doc)}
                                  className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                                  title={t('প্রিভিউ ও বিস্তারিত তথ্য', 'Preview & Details')}
                                >
                                  <Eye className="w-4 h-4 text-slate-600" />
                                  <span>{t('প্রিভিউ', 'Preview')}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDocumentDownload(doc)}
                                  className="px-4 py-2 rounded-xl bg-[#006A4E] hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                                  title={t('ডিজিটাল কপি ডাউনলোড', 'Download Digital Copy')}
                                >
                                  <Download className="w-4 h-4" />
                                  <span>{t('ডাউনলোড', 'Download')}</span>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled={busy || requestingDocType === doc.document_type}
                                onClick={() => handleRequestMissingDoc(doc)}
                                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                              >
                                {requestingDocType === doc.document_type ? (
                                  <>
                                    <RotateCw className="w-4 h-4 animate-spin" />
                                    <span>{t('দাখিল হচ্ছে...', 'Submitting...')}</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-4 h-4" />
                                    <span>{t('অনলাইনে সার্টিফাইড কপির আবেদন', '1-Click Request Copy')}</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 4: REGISTERED DEEDS (রেজিস্ট্রিকৃত মূল দলিল) */}
      {section === 'deeds' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#006A4E]" />
              <span>{t('সাব-রেজিস্ট্রি অফিসে নিবন্ধিত মূল দলিলসমূহ', 'Registered Deeds Ledger')}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 font-bold">
                {toBanglaDigits(filteredDeeds.length, lang)} {t('টি দলিল', 'Deeds')}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {t('দলিলের সম্পূর্ণ ডকেট ও ক্রিপ্টোগ্রাফিক সিল দেখতে ডানপাশের বোতাম চাপুন', 'Click eye icon to view full cryptographic docket')}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">{t('দলিল নম্বর', 'Deed No')}</th>
                  <th className="p-3.5">{t('দলিলের ধরন', 'Deed Type')}</th>
                  <th className="p-3.5">{t('দাগ ও মৌজা', 'Plot & Mouza')}</th>
                  <th className="p-3.5">{t('জমির পরিমাণ', 'Area')}</th>
                  <th className="p-3.5">{t('মূল্য (টাকা)', 'Value (BDT)')}</th>
                  <th className="p-3.5">{t('রেজিস্ট্রি অফিস', 'Registry')}</th>
                  <th className="p-3.5">{t('অবস্থা', 'Status')}</th>
                  <th className="p-3.5 text-right">{t('অ্যাকশন', 'Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeeds.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-slate-500">
                      {t('কোনো দলিল পাওয়া যায়নি।', 'No deeds found.')}
                    </td>
                  </tr>
                ) : (
                  filteredDeeds.map((deed, idx) => (
                    <tr key={deed.id || idx} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-mono text-slate-400">{toBanglaDigits(idx + 1, lang)}</td>
                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
                          {deed.deed_no}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-700">
                        {deed.deed_type === 'SALE' ? t('কবলা (বিক্রয়)', 'Sale') : (deed.deed_type || t('কবলা', 'Sale'))}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800">
                          {t('দাগ নং', 'Plot')} {toBanglaDigits(deed.dag_no_bn || deed.dag_no, lang)}
                        </div>
                        <div className="text-[11px] text-slate-500">{deed.mouza_bn}</div>
                      </td>
                      <td className="p-3.5 font-bold text-[#006A4E]">
                        {toBanglaDigits(deed.area_decimal, lang)} {t('শতক', 'dec')}
                      </td>
                      <td className="p-3.5 font-mono text-slate-800">
                        ৳{deed.price_bdt ? toBanglaDigits(Number(deed.price_bdt).toLocaleString(), lang) : '—'}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {t('সাব-রেজিস্ট্রি কার্যালয়', 'Sub-Registry Office')}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-[#006A4E] border border-emerald-300">
                          {deed.status || 'MUTATED'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedDeedForModal(deed)}
                            className="p-2 rounded-xl border border-slate-200 hover:bg-[#006A4E] hover:text-white text-slate-700 transition cursor-pointer"
                            title={t('দলিলের সম্পূর্ণ ডকেট ও বিবরণ দেখুন', 'View Deed Details')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigate(`qr?deed_no=${encodeURIComponent(deed.deed_no)}`)}
                            className="p-2 rounded-xl border border-slate-200 hover:bg-blue-600 hover:text-white text-blue-700 transition cursor-pointer"
                            title={t('কিউআর ও ক্রিপ্টোগ্রাফিক সিল যাচাই', 'Verify Deed QR')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 5: TRANSFER APPLICATIONS TRACKER (হস্তান্তর ট্র্যাকার) */}
      {section === 'transfers' && (
        <div className="space-y-5">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#006A4E] text-xs font-bold">
                  {t('১৩-ধাপের সমন্বিত কর্মপ্রবাহ', '13-Step Integrated Workflow')}
                </span>
                <h2 className="text-lg font-black text-slate-900">
                  {t('আমার চলমান হস্তান্তর আবেদনসমূহ', 'My Land Transfer Applications')}
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {t(
                  'দলিল নিবন্ধন, বায়োমেট্রিক ও নামজারি পর্যন্ত সম্পূর্ণ সমন্বিত প্রক্রিয়ায় আপনার আবেদন ট্র্যাক করুন।',
                  'Track your transfer applications through deed registration and AC Land mutation.'
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('applications?new=1')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#006A4E] hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t('নতুন হস্তান্তর আবেদন', 'New Transfer Application')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs">
            {transfersLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <Clock className="w-5 h-5 animate-spin mx-auto mb-2 text-[#006A4E]" />
                <span>{t('হস্তান্তর তথ্য লোড হচ্ছে...', 'Loading transfer requests...')}</span>
              </div>
            ) : citizenTransfers.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <FileCheck className="w-10 h-10 text-slate-400 mx-auto" />
                <div className="text-base font-bold text-slate-800">
                  {t('কোনো চলমান হস্তান্তর আবেদন নেই', 'No Active Transfer Applications')}
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {t(
                    'আপনার জমি ক্রয়-বিক্রয়, হেবা বা উত্তরাধিকার বণ্টনের আবেদন করতে নিচের বোতামে চাপুন।',
                    'To initiate a transfer or heir apportionment, click the button below.'
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('applications?new=1')}
                  className="px-5 py-2.5 rounded-xl bg-[#006A4E] text-white text-xs font-bold cursor-pointer transition shadow-xs"
                >
                  {t('এখনই আবেদন শুরু করুন', 'Start Transfer Application')}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-3.5">{t('ট্র্যাকিং কোড', 'Tracking Code')}</th>
                      <th className="py-3 px-3.5">{t('দাগ নং ও মৌজা', 'Plot & Mouza')}</th>
                      <th className="py-3 px-3.5">{t('দলিল', 'Deed')}</th>
                      <th className="py-3 px-3.5">{t('জমির পরিমাণ', 'Area')}</th>
                      <th className="py-3 px-3.5">{t('ধাপ ও অবস্থা', 'Step & Status')}</th>
                      <th className="py-3 px-3.5 text-right">{t('কার্যক্রম', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {citizenTransfers.map((tr: any) => (
                      <tr key={tr.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-3.5 font-mono font-bold text-slate-900">
                          {tr.tracking_number || `TR-${tr.id}`}
                        </td>
                        <td className="py-3.5 px-3.5">
                          <div className="font-bold text-slate-900">
                            {t(`দাগ নং ${toBanglaDigits(tr.plot?.dag_no || tr.plot_id, lang)}`, `Dag ${tr.plot?.dag_no || tr.plot_id}`)}
                          </div>
                          <div className="text-[11px] text-slate-500">{tr.plot?.mouza_bn}</div>
                        </td>
                        <td className="py-3.5 px-3.5 font-semibold text-slate-700">{tr.deed_type || 'SALE'}</td>
                        <td className="py-3.5 px-3.5 font-bold text-emerald-800">
                          {toBanglaDigits(tr.transfer_area_decimal || '০', lang)} {t('শতক', 'dec')}
                        </td>
                        <td className="py-3.5 px-3.5">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                            {t(`ধাপ ${toBanglaDigits(tr.current_step, lang)}/১৩ (${tr.status || 'PROCESSING'})`, `Step ${tr.current_step}/13 (${tr.status || 'PROCESSING'})`)}
                          </span>
                        </td>
                        <td className="py-3.5 px-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => onNavigate(`applications?id=${tr.tracking_number || tr.id}`)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#006A4E] font-bold text-xs cursor-pointer transition"
                          >
                            {t('ট্র্যাকার দেখুন', 'View Tracker')}
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

      {/* SECTION 6: DISPUTES & OBJECTIONS (আপত্তি ও বিরোধ দাখিল) */}
      {section === 'disputes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleFileDispute}
            className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-4 shadow-xs"
          >
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <Scale className="w-5 h-5 text-rose-600" />
                <span>{t('নতুন মালিকানা আপত্তি দাখিল', 'File Ownership Objection')}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {t('এসি ল্যান্ড ট্রাইব্যুনালে সরাসরি নোটিশ ও শুনানি জারি হবে', 'Sent directly to AC Land Revenue Tribunal')}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('বিরোধপূর্ণ জমি নির্বাচন করুন*', 'Select Contested Plot*')}
              </label>
              <select
                required
                value={disputePlotId}
                onChange={(e) => setDisputePlotId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-none bg-white"
              >
                <option value="">{t('-- জমি নির্বাচন করুন --', '-- Select Plot --')}</option>
                {plots.map((p) => (
                  <option key={p.plot_id} value={p.plot_id}>
                    {t('দাগ নং', 'Plot')} {toBanglaDigits(p.dag_no_bn || p.dag_no, lang)} · {p.mouza_bn} ({p.area_decimal} {t('শতক', 'dec')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('আপত্তির বিষয়শ্রেণি*', 'Objection Category*')}
              </label>
              <select
                value={disputeType}
                onChange={(e) => setDisputeType(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-none bg-white"
              >
                <option value="OWNERSHIP_OBJECTION">{t('মালিকানা দাবি ও জবরদখল আপত্তি', 'Ownership Objection')}</option>
                <option value="BOUNDARY_DISPUTE">{t('সরেজমিন সীমানা বিরোধ', 'Boundary Dispute')}</option>
                <option value="RECORD_ANOMALY">{t('খতিয়ানের জালিয়াতি বা তথ্যের গরমিল', 'Record Discrepancy')}</option>
                <option value="INHERITANCE_OBJECTION">{t('ওয়ারিশান স্বত্ববঞ্চনার আপত্তি', 'Inheritance Rights')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('আপত্তির পূর্ণাঙ্গ কারণ ও বিবরণ*', 'Details & Grounds for Objection*')}
              </label>
              <textarea
                required
                rows={4}
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder={t(
                  'উক্ত দাগের জমিতে আমাদের বৈধ রেকর্ড থাকা সত্ত্বেও অন্য পক্ষ অবৈধ দখলের চেষ্টা চালাচ্ছে...',
                  'Provide detailed statement and facts...'
                )}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={busy || !disputePlotId || !disputeReason.trim()}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <Scale className="w-4 h-4" />
              <span>{busy ? t('দায়ের হচ্ছে...', 'Filing...') : t('ট্রাইব্যুনালে দাখিল করুন', 'Submit to Tribunal')}</span>
            </button>
          </form>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
              <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-rose-600" />
                  <span>{t('দায়েরকৃত আপত্তি ও শুনানির ট্র্যাকার', 'Filed Objections Tracker')}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs bg-rose-100 text-rose-800 font-bold">
                    {toBanglaDigits(disputes.length, lang)} {t('টি মামলা', 'Cases')}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
                      <th className="p-3.5">#</th>
                      <th className="p-3.5">{t('কেস নম্বর', 'Case No')}</th>
                      <th className="p-3.5">{t('আপত্তির ধরন', 'Category')}</th>
                      <th className="p-3.5">{t('দাগ নং', 'Plot No')}</th>
                      <th className="p-3.5">{t('বিবরণ', 'Description')}</th>
                      <th className="p-3.5">{t('অবস্থা', 'Status')}</th>
                      <th className="p-3.5 text-right">{t('অ্যাকশন', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {disputes.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-10 text-center text-slate-500">
                          {t('আপনার কোনো দায়েরকৃত আপত্তি নেই।', 'No objections filed.')}
                        </td>
                      </tr>
                    ) : (
                      disputes.map((d, idx) => (
                        <tr key={d.id || idx} className="hover:bg-rose-50/20 transition">
                          <td className="p-3.5 font-mono text-slate-400">{toBanglaDigits(idx + 1, lang)}</td>
                          <td className="p-3.5 font-mono font-bold text-slate-900">{d.case_no}</td>
                          <td className="p-3.5 font-bold text-slate-700">{d.dispute_type}</td>
                          <td className="p-3.5 font-bold text-[#006A4E]">
                            {t('দাগ', 'Plot')} {toBanglaDigits(d.dag_no_bn || d.dag_no || d.plot_id, lang)}
                          </td>
                          <td className="p-3.5 text-slate-600 text-[11px] max-w-xs truncate">
                            {d.description_bn}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                d.status === 'RESOLVED'
                                  ? 'bg-emerald-100 text-[#006A4E]'
                                  : d.status === 'HEARING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {d.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedDisputeForModal(d)}
                              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                              title={t('শুনানি ও আদেশ বিবরণী', 'View Order Sheet')}
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
        </div>
      )}

      {/* SECTION 7: SUPPORT TICKETS DESK (সহায়তা ও সাপোর্ট টিকিট) */}
      {section === 'tickets' && (
        <div className="space-y-5">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#006A4E]">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {t('নাগরিক সহায়তা ও অভিযোগ ডেস্ক (১৬১২২)', 'Citizen Support & Grievance Desk (16122)')}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t(
                    'ভূমি সেবা সংক্রান্ত যেকোনো সমস্যা, দলিল অনুসন্ধান বা নথিপত্রে সহায়তা পেতে টিকিট খুলুন।',
                    'Submit support requests regarding land records, deed lookups, or profile verification.'
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsNewTicketOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#006A4E] hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t('নতুন সহায়তা টিকিট খুলুন', 'New Support Ticket')}</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs">
            {ticketsLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <Clock className="w-5 h-5 animate-spin mx-auto mb-2 text-[#006A4E]" />
                <span>{t('টিকিট তালিকা লোড হচ্ছে...', 'Loading tickets...')}</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                <div className="text-base font-bold text-slate-800">
                  {t('আপনার কোনো সহায়তা টিকিট খোলা নেই', 'No Support Tickets Found')}
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {t(
                    'ভূমি সংক্রান্ত প্রশ্ন, বিলম্বিত নামজারি বা নথিপত্র সংক্রান্ত সাহায্যের জন্য নতুন টিকিট খুলুন।',
                    'Open a ticket for assistance with land records, overdue mutations, or document retrieval.'
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setIsNewTicketOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#006A4E] text-white text-xs font-bold cursor-pointer transition shadow-xs"
                >
                  {t('নতুন টিকিট তৈরি করুন', 'Create New Ticket')}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-3.5">{t('টিকিট কোড', 'Ticket Code')}</th>
                      <th className="py-3 px-3.5">{t('বিষয় ও ক্যাটাগরি', 'Subject & Category')}</th>
                      <th className="py-3 px-3.5">{t('তারিখ', 'Date')}</th>
                      <th className="py-3 px-3.5">{t('অবস্থা', 'Status')}</th>
                      <th className="py-3 px-3.5 text-right">{t('বার্তা ও উত্তর', 'Conversation')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tickets.map((tkt: any) => (
                      <tr key={tkt.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-3.5 font-mono font-bold text-slate-900">
                          {tkt.ticket_code || `HELP-${tkt.id}`}
                        </td>
                        <td className="py-3.5 px-3.5">
                          <div className="font-bold text-slate-800 text-sm">{tkt.title_bn || tkt.title_en}</div>
                          <span className="text-[10px] text-slate-400 uppercase font-mono">{tkt.category || 'GENERAL'}</span>
                        </td>
                        <td className="py-3.5 px-3.5 text-slate-500">
                          {new Date(tkt.created_at).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US')}
                        </td>
                        <td className="py-3.5 px-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              tkt.status === 'RESOLVED'
                                ? 'bg-emerald-100 text-[#006A4E]'
                                : tkt.status === 'IN_PROGRESS'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {tkt.status || 'NEW'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenTicketDetail(tkt)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#006A4E] font-bold text-xs cursor-pointer transition"
                          >
                            <Eye className="w-4 h-4" />
                            <span>{t('বার্তা দেখুন', 'View Chat')}</span>
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

      {/* MODAL 1: CREATE NEW TICKET */}
      {isNewTicketOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#006A4E]" />
                <span>{t('নতুন সহায়তা টিকিট দাখিল', 'Submit New Support Ticket')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewTicketOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('অনুরোধের ক্যাটাগরি', 'Category')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-none"
                >
                  <option value="GENERAL">{t('সাধারণ পরামর্শ ও অনুসন্ধান', 'General Guidance & Inquiry')}</option>
                  <option value="OWNERSHIP_MUTATION">{t('নামজারি ও ওয়ারিশ বণ্টন সংক্রান্ত', 'e-Mutation & Heir Apportionment')}</option>
                  <option value="KHATIAN_CORRECTION">{t('খতিয়ান বা দাগ রেকর্ড সংক্রান্ত', 'Khatian or Plot Record')}</option>
                  <option value="NID_VERIFICATION">{t('এনআইডি ও প্রোফাইল পরিচয় যাচাই', 'NID & Identity Verification')}</option>
                  <option value="MISSING_DOCUMENT">{t('অনুপস্থিত দলিল সংগ্রহ ও স্ক্যান', 'Missing Document Retrieval')}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('বিষয় / সারসংক্ষেপ', 'Subject / Summary')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder={t('যেমন: বীরুলিয়া মৌজার ১০১ দাগের খতিয়ান দেখতে পাচ্ছি না', 'e.g. Cannot view khatian for dag 101')}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('বিস্তারিত বিবরণ', 'Detailed Description')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  placeholder={t('আপনার সমস্যার বিস্তারিত বিবরণ লিখুন (কমপক্ষে ১০ অক্ষর)...', 'Write details of the issue (at least 10 characters)...')}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewTicketOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  {t('বাতিল', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={ticketSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#006A4E] hover:bg-emerald-800 disabled:bg-slate-300 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-2"
                >
                  {ticketSubmitting ? <Clock className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{ticketSubmitting ? t('দাখিল হচ্ছে...', 'Submitting...') : t('টিকিট দাখিল করুন', 'Submit Ticket')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TICKET DETAIL & MESSAGES CHAT */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[#006A4E]">
                    {selectedTicket.ticket?.ticket_code || selectedTicket.ticket_code || 'HELP'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {selectedTicket.ticket?.status || selectedTicket.status || 'NEW'}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 mt-1">
                  {selectedTicket.ticket?.title_bn || selectedTicket.title_bn || selectedTicket.ticket?.title_en || selectedTicket.title_en}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation message thread */}
            <div className="flex-1 overflow-y-auto space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 max-h-72">
              {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                selectedTicket.messages.map((m: any, idx: number) => {
                  const isStaff = m.sender_role !== 'citizen';
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl text-xs space-y-1.5 shadow-2xs ${
                        isStaff
                          ? 'bg-emerald-50/90 border border-emerald-200 text-emerald-950 ml-4'
                          : 'bg-white border border-slate-200 text-slate-800 mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold">
                          {isStaff ? t('সাপোর্ট কর্মকর্তা', 'Support Officer') : t('আপনি (নাগরিক)', 'You (Citizen)')}{' '}
                          <span className="font-mono text-slate-500">(@{m.sender_username})</span>
                        </span>
                        <span className="text-slate-400">
                          {new Date(m.created_at).toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{m.message_bn || m.message_en}</p>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  {selectedTicket.ticket?.description_bn || selectedTicket.description_bn || t('কোনো বার্তা নেই।', 'No messages.')}
                </div>
              )}
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleSendReply} className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ticketReplyText}
                  onChange={(e) => setTicketReplyText(e.target.value)}
                  placeholder={t('এখানে আপনার বার্তা লিখুন...', 'Type your reply here...')}
                  className="flex-1 p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-[#006A4E] focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={replySubmitting}
                  className="px-4 py-2.5 rounded-xl bg-[#006A4E] hover:bg-emerald-800 disabled:bg-slate-300 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  {replySubmitting ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{t('পাঠান', 'Send')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REGISTERED DEED DOCKET */}
      {selectedDeedForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-100 text-blue-900 border border-blue-200">
                  {selectedDeedForModal.deed_no}
                </span>
                <h3 className="font-black text-base text-slate-900">
                  {t('নিবন্ধিত ডিজিটাল মূল দলিল ডকেট', 'Registered Deed Docket')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDeedForModal(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">{t('দলিলদাতা (বিক্রেতা)', 'Seller')}</span>
                  <strong className="text-slate-900 font-bold text-sm">{selectedDeedForModal.seller_name_bn}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">{t('দলিলগ্রহীতা (ক্রেতা)', 'Buyer')}</span>
                  <strong className="text-slate-900 font-bold text-sm">{selectedDeedForModal.buyer_name_bn}</strong>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">{t('মৌজা ও অধিক্ষেত্র', 'Mouza')}</span>
                  <strong className="text-slate-800">{selectedDeedForModal.mouza_bn}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">{t('দাগ নং', 'Plot No')}</span>
                  <strong className="text-[#006A4E] font-black text-sm">
                    {toBanglaDigits(selectedDeedForModal.dag_no_bn || selectedDeedForModal.dag_no, lang)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">{t('জমির পরিমাণ', 'Area')}</span>
                  <strong className="text-[#006A4E] font-black text-sm">
                    {toBanglaDigits(selectedDeedForModal.area_decimal, lang)} {t('শতক', 'dec')}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">{t('কবলা মূল্য (টাকা)', 'Consideration Value')}</span>
                  <strong className="text-slate-900 font-mono text-sm font-bold">
                    ৳{selectedDeedForModal.price_bdt ? toBanglaDigits(Number(selectedDeedForModal.price_bdt).toLocaleString(), lang) : '—'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">{t('রেজিস্ট্রেশন তারিখ ও দপ্তর', 'Registration Date')}</span>
                  <span className="text-slate-700 font-mono">
                    {selectedDeedForModal.created_at ? new Date(selectedDeedForModal.created_at).toLocaleDateString() : '২০২৪-১১-১৭'} (সাব-রেজিস্ট্রার কার্যালয়)
                  </span>
                </div>
              </div>
            </div>

            {/* Cryptographic Proof */}
            <div className="p-4 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-300 font-sans font-bold text-xs">
                <span>{t('সার্বভৌম ডিজিটাল লেজার ও কর্মকর্তা সিল', 'Cryptographic Proof & Signature')}</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t('অখণ্ডতা প্রমাণিত', 'Integrity Verified')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">{t('কনটেন্ট হ্যাশ (SHA-256)', 'Content Hash')}</span>
                <span className="break-all text-[11px] text-slate-200">
                  {selectedDeedForModal.content_hash || '2f3c8542e1dda1d7c818025b2f132095feb04a370e1322a827920860e36d22d5'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">{t('সাব-রেজিস্ট্রার Ed25519 সিল', 'Ed25519 Officer Signature')}</span>
                <span className="break-all text-[11px] text-emerald-300">
                  {selectedDeedForModal.signature ? selectedDeedForModal.signature.slice(0, 48) + '...' : '55989fbffb79abbb3916e112101215bd...'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  const deedNo = selectedDeedForModal.deed_no;
                  setSelectedDeedForModal(null);
                  onNavigate(`qr?deed_no=${encodeURIComponent(deedNo)}`);
                }}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <ExternalLink className="w-4 h-4" />
                <span>{t('সর্বজনীন কিউআর পোর্টাল দিয়ে যাচাই করুন', 'Open Public QR Verifier')}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDeedForModal(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                {t('বন্ধ করুন', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PLOT DETAILS & PASSPORT LAUNCH */}
      {selectedPlotForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-50 text-[#006A4E] border border-emerald-100">
                  <MapPin className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    {t('দাগ নং', 'Plot')} {toBanglaDigits(selectedPlotForModal.dag_no_bn || selectedPlotForModal.dag_no, lang)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedPlotForModal.mouza_bn}, {selectedPlotForModal.upazila_bn}, {selectedPlotForModal.district_bn}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlotForModal(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">{t('খতিয়ান নম্বর', 'Khatian No')}:</span>
                <strong className="text-slate-800">
                  {selectedPlotForModal.survey_type || 'BS'} {toBanglaDigits(selectedPlotForModal.khatian_no_bn || selectedPlotForModal.khatian_no, lang)}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">{t('জমির মোট আয়তন', 'Total Area')}:</span>
                <strong className="text-slate-800">
                  {toBanglaDigits(selectedPlotForModal.total_area_decimal || selectedPlotForModal.area_decimal, lang)} {t('শতক', 'dec')}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">{t('আপনার মালিকানাধীন অংশ', 'Your Share Area')}:</span>
                <strong className="text-[#006A4E] font-black text-sm">
                  {toBanglaDigits(selectedPlotForModal.area_decimal ?? selectedPlotForModal.share_area_decimal, lang)} {t('শতক', 'dec')}
                </strong>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-bold">{t('বিক্রয় লক সুরক্ষা', 'Sale Lock Status')}:</span>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                    selectedPlotForModal.owner_sale_locked
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-emerald-100 text-[#006A4E] border border-emerald-300'
                  }`}
                >
                  {selectedPlotForModal.owner_sale_locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  {selectedPlotForModal.owner_sale_locked ? t('সক্রিয় (সম্পূর্ণ নিরাপদ)', 'Active') : t('নিষ্ক্রিয়', 'Disabled')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const p = selectedPlotForModal;
                  setSelectedPlotForModal(null);
                  setPassportPlot(p);
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{t('স্বাস্থ্য পাসপোর্ট প্রিন্ট', 'Print Health Passport')}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPlotForModal(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                {t('ঠিক আছে', 'OK')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: DISPUTE DOCKET */}
      {selectedDisputeForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                  <Scale className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    {t('মিস-কেস ও ট্রাইব্যুনাল শুনানি ডকেট', 'Tribunal Dispute Docket')}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedDisputeForModal.case_no}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDisputeForModal(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">{t('মামলার বর্তমান অবস্থা', 'Case Status')}:</span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {selectedDisputeForModal.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">{t('আপত্তির শ্রেণি', 'Category')}:</span>
                <strong className="text-slate-800">{selectedDisputeForModal.dispute_type}</strong>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 block text-[10px] font-bold mb-1">{t('আপত্তির বিবরণ ও প্রমাণক', 'Grounds')}:</span>
                <div className="p-3 rounded-xl bg-white border border-slate-200 text-slate-800 leading-relaxed">
                  {selectedDisputeForModal.description_bn}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedDisputeForModal(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                {t('বন্ধ করুন', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: DOCUMENT INSPECTION & HASH VERIFICATION */}
      {inspectingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-[#006A4E] border border-emerald-200">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm leading-tight">
                    {lang === 'bn' ? inspectingDoc.title_bn : (inspectingDoc.title_en || inspectingDoc.title_bn)}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {inspectingDoc.file_name || 'document.pdf'} · {inspectingDoc.document_type}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingDoc(null)}
                className="text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">{t('নিরাপত্তা স্তর ও মর্যাদা:', 'Security Level:')}</span>
                <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-[#006A4E] border border-emerald-200">
                  {t('🔒 সার্বভৌম ভল্ট সংরক্ষিত ও অপরিবর্তনীয়', '🔒 Secured Sovereign Record')}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">{t('স্ট্যাটাস:', 'Status:')}</span>
                <span className="font-bold text-slate-800">{inspectingDoc.status || 'VERIFIED'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">{t('ফাইলের আকার:', 'File Size:')}</span>
                <span className="font-mono text-slate-800">{Math.round((inspectingDoc.file_size_bytes || 0) / 1024)} KB</span>
              </div>
              <div className="py-1">
                <span className="text-slate-500 font-medium block mb-1">{t('ক্রিপ্টোগ্রাফিক হ্যাশ (SHA-256):', 'SHA-256 Hash:')}</span>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 font-mono text-[10px] text-slate-700 break-all select-all">
                  {inspectingDoc.file_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-[#006A4E] shrink-0" />
              <p className="text-xs text-emerald-950 leading-relaxed">
                {t(
                  'ভূমি সুরক্ষা ডিজিটাল ভল্ট: এই নথিটি স্বাধীন সার্বভৌম ক্রিপ্টোগ্রাফিক হ্যাশ দ্বারা সংরক্ষিত এবং কোনো অননুমোদিত পক্ষ বা দালাল এতে কারসাজি করতে পারবে না।',
                  'BhumiShield Sovereign Vault: This record is secured with cryptographic integrity. Unauthorized tampering is strictly blocked.'
                )}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInspectingDoc(null)}
                className="px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                {t('বন্ধ করুন', 'Close')}
              </button>
              <button
                type="button"
                onClick={() => handleDocumentDownload(inspectingDoc)}
                className="px-5 py-2.5 bg-[#006A4E] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>{t('ডিজিটাল কপি ডাউনলোড', 'Download Digital Copy')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: SMART LAND HEALTH PASSPORT */}
      {passportPlot && (
        <LandHealthPassportModal
          plot={passportPlot}
          onClose={() => setPassportPlot(null)}
          onNavigate={onNavigate}
        />
      )}

      {/* MODAL 8: PLAIN BANGLA PROBLEM FINDER & GUIDED SERVICE DESK */}
      <CitizenProblemTriageModal
        isOpen={isTriageModalOpen}
        onClose={() => setIsTriageModalOpen(false)}
        onNavigate={onNavigate}
      />
    </div>
  );
};
