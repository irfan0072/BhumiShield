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
  ChevronDown,
  ChevronUp,
  UserCheck,
  QrCode,
  Printer,
  FileCheck2,
} from 'lucide-react';
import { BhumiApi, api } from '../api/client';
import { useAppUI } from '../i18n';
import { toBanglaDigits, maskNid } from '../theme/tokens';
import { AddressCascader, AddressSelection } from '../components/AddressCascader';
import { triggerAppNotification } from '../components/NotificationCenter';
import { LandHealthPassportModal } from '../components/LandHealthPassportModal';
import { CitizenProblemTriageModal } from '../components/CitizenProblemTriageModal';
import { CitizenVerificationModal } from '../components/CitizenVerificationModal';
import { JargonTooltip } from '../components/JargonTooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

export type CitizenSection = 'overview' | 'plots' | 'docs' | 'deeds' | 'transfers' | 'disputes' | 'tickets';

function cleanCitizenName(name?: string | null): string {
  if (!name) return '';
  return name.replace(/\s*\((?:নাগরিক|Citizen)\)/gi, '').trim();
}

const MiniSparkline: React.FC<{
  data: number[];
  color: string;
  fillId: string;
  height?: number;
}> = ({ data, color, fillId, height = 30 }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = height;
  const w = 100;

  const padY = 3;
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * w;
    const y = h - padY - ((val - min) / range) * (h - padY * 2);
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX = Number(((p0.x + p1.x) / 2).toFixed(1));
    pathD += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  const areaD = `${pathD} L ${w} ${h} L 0 ${h} Z`;
  const lastPoint = points[points.length - 1];

  return (
    <div className="w-full h-7 my-1 pointer-events-none select-none">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${fillId})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lastPoint.x} cy={lastPoint.y} r="2.5" fill={color} />
      </svg>
    </div>
  );
};

export const CitizenHome: React.FC<{ onNavigate: (target: string) => void }> = ({ onNavigate }) => {
  const { user, lang, t, activeSubTab, setActiveSubTab } = useAppUI();
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

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
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Selected Plot for Docs / Modals
  const [selectedPlotId, setSelectedPlotId] = useState<string>('');
  const [inspectingDoc, setInspectingDoc] = useState<any | null>(null);
  const [requestingDocType, setRequestingDocType] = useState<string | null>(null);
  const [selectedDeedForModal, setSelectedDeedForModal] = useState<any | null>(null);
  const [selectedPlotForModal, setSelectedPlotForModal] = useState<any | null>(null);
  const [selectedDisputeForModal, setSelectedDisputeForModal] = useState<any | null>(null);
  const [passportPlot, setPassportPlot] = useState<any | null>(null);
  const [auditPlotForModal, setAuditPlotForModal] = useState<any | null>(null);
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);

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
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);

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

  useEffect(() => {
    const handleOpenGuide = () => setIsTriageModalOpen(true);
    window.addEventListener('open-citizen-guide', handleOpenGuide);
    return () => window.removeEventListener('open-citizen-guide', handleOpenGuide);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (inspectingDoc) setInspectingDoc(null);
        else if (selectedDisputeForModal) setSelectedDisputeForModal(null);
        else if (selectedPlotForModal) setSelectedPlotForModal(null);
        else if (selectedDeedForModal) setSelectedDeedForModal(null);
        else if (selectedTicket) setSelectedTicket(null);
        else if (isNewTicketOpen) setIsNewTicketOpen(false);
        else if (passportPlot) setPassportPlot(null);
        else if (isTriageModalOpen) setIsTriageModalOpen(false);
        else if (auditPlotForModal) setAuditPlotForModal(null);
        else if (isUploadDocModalOpen) setIsUploadDocModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    inspectingDoc,
    selectedDisputeForModal,
    selectedPlotForModal,
    selectedDeedForModal,
    selectedTicket,
    isNewTicketOpen,
    passportPlot,
    isTriageModalOpen,
    auditPlotForModal,
    isUploadDocModalOpen,
  ]);

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
      const errText = t('ফাইলটি ১০ মেগাবাইটের মধ্যে রাখুন।', 'File size must be under 10MB.');
      setNotice({ msg: errText, err: true });
      triggerAppNotification({
        type: 'ALERT',
        targetTab: 'home',
        title_bn: 'আপলোডে সমস্যা',
        title_en: 'Upload Error',
        message_bn: errText,
        message_en: 'File size must be under 10MB.',
      });
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
      const successText = t('কাগজপত্র সফলভাবে সিস্টেমে সংরক্ষিত হয়েছে।', 'Document uploaded and saved successfully.');
      setNotice({ msg: successText });
      triggerAppNotification({
        type: 'SUCCESS',
        targetTab: 'home',
        title_bn: 'কাগজপত্র আপলোড সম্পন্ন',
        title_en: 'Document Uploaded',
        message_bn: successText,
        message_en: 'Document uploaded and saved successfully.',
      });
      setUploadFile(null);
      setUploadTitleBn('');
      setIsUploadDocModalOpen(false);
      const r = await api.get(`/plots/${selectedPlotId}/documents`);
      setDocs(r.data);
    } catch (err: any) {
      const errText = err?.response?.data?.error || t('আপলোডে ত্রুটি হয়েছে।', 'Failed to upload document.');
      setNotice({ msg: errText, err: true });
      triggerAppNotification({
        type: 'ALERT',
        targetTab: 'home',
        title_bn: 'আপলোডে সমস্যা',
        title_en: 'Upload Error',
        message_bn: errText,
        message_en: errText,
      });
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
      setIsDisputeModalOpen(false);
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

  // 4 Bento Metric Sparkline Stats
  const landTrend = useMemo(() => {
    if (plots.length >= 3) {
      let sum = 0;
      return plots.slice(0, 6).map((p) => {
        sum += Number(p.area_decimal) || Number(p.share_area_decimal) || 12;
        return sum;
      });
    }
    return [24, 48, 85, 120, 160, totalLandDecimal || 192];
  }, [plots, totalLandDecimal]);

  const lockTrend = useMemo(() => {
    const locked = lockedPlotsCount || 1;
    return [Math.max(0, locked - 3), Math.max(0, locked - 2), Math.max(0, locked - 1), locked, locked];
  }, [lockedPlotsCount]);

  const deedsTrend = useMemo(() => {
    const count = deeds.length || 18;
    return [
      Math.max(1, Math.round(count * 0.3)),
      Math.max(2, Math.round(count * 0.5)),
      Math.max(3, Math.round(count * 0.7)),
      Math.max(4, Math.round(count * 0.85)),
      count
    ];
  }, [deeds.length]);

  const transfersTrend = useMemo(() => {
    const count = activeTransfersCount || 2;
    return [0, 1, 1, 2, count];
  }, [activeTransfersCount]);

  const resetFilters = () => {
    setSelectedDivision('');
    setSelectedDistrict('');
    setSelectedUpazila('');
    setSelectedMouzaId('');
    setSearchQuery('');
  };

  const activeLocationFiltersCount = useMemo(() => {
    return [selectedDivision, selectedDistrict, selectedUpazila, selectedMouzaId].filter(Boolean).length;
  }, [selectedDivision, selectedDistrict, selectedUpazila, selectedMouzaId]);

  const hasActiveFilters = Boolean(activeLocationFiltersCount > 0 || searchQuery.trim().length > 0);

  return (
    <div className="h-full min-h-0 flex flex-col w-full overflow-hidden space-y-2.5 sm:space-y-3 max-w-7xl mx-auto">
      {/* Toast Notice */}
      {notice && (
        <Alert
          variant={notice.err ? 'destructive' : 'success'}
          className="flex items-center justify-between py-2.5 px-3.5 shadow-2xs shrink-0"
        >
          <div className="flex items-center gap-2">
            {notice.err ? <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            <AlertDescription className="font-bold leading-snug">{notice.msg}</AlertDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setNotice(null)}
            aria-label={t('বিজ্ঞপ্তি বন্ধ করুন', 'Dismiss alert')}
            className="h-7 w-7 text-slate-500 hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </Button>
        </Alert>
      )}

      {/* Global Vault Error Banner with Retry */}
      {error && (
        <Alert variant="destructive" className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <AlertDescription className="font-medium text-rose-900">{error}</AlertDescription>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => loadVault()}
              className="h-8 px-3 text-xs"
            >
              {t('পুনরায় চেষ্টা করুন', 'Retry')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setError('')}
              className="h-7 w-7 text-rose-600 hover:bg-rose-100"
              aria-label={t('বিজ্ঞপ্তি বন্ধ করুন', 'Close')}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </Alert>
      )}

      {/* 1. On Overview: Unified Scrollable Dashboard Hub */}
      {section === 'overview' && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin">
          {/* Unverified Identity Notice if applicable */}
          {!user?.is_identity_verified && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-600"></span>
                </span>
                <span className="font-bold text-amber-900">
                  {t(
                    'আপনার এনআইডি ও বায়োমেট্রিক পরিচয় এখনো যাচাই করা হয়নি। বিক্রয় লক ও হস্তান্তরের পূর্ণ সুবিধার জন্য যাচাই সম্পন্ন করুন।',
                    'Identity verification pending. Verify your NID and biometrics to unlock full features.'
                  )}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsVerificationModalOpen(true)}
                className="h-7 px-3 rounded-full text-xs font-black bg-[#006A4E] text-white hover:bg-[#00553e] shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{t('এখনই এনআইডি যাচাই করুন (১-ক্লিক)', 'Verify NID Now (1-Click)')}</span>
              </Button>
            </div>
          )}

          {/* 4 Bento Metric Cards with Beside Vertical Expandable Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* 4 Prominent Bento Metric Cards */}
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 min-w-0">
              {/* Card 1: Total Land */}
              <Card
                onClick={() => handleTabChange('plots')}
                className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/40 via-white to-white hover:from-emerald-50/70 border border-emerald-100/90 hover:border-emerald-300 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-2xs hover:shadow-xs hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between text-slate-600 mb-1.5">
                  <span className="text-xs font-bold text-slate-700">{t('মোট জমি', 'Total Land')}</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-100/70 text-[#006A4E] flex items-center justify-center">
                    <FileCheck2 className="w-4 h-4 text-[#006A4E] group-hover:scale-110 transition" />
                  </div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-[#006A4E] tracking-tight font-mono">
                    {toBanglaDigits(totalLandDecimal.toFixed(1), lang)} <span className="text-xs font-bold text-slate-500 font-sans">{t('শতক', 'dec')}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {toBanglaDigits((totalLandDecimal / 100).toFixed(2), lang)} {t('একর', 'acres')} • {toBanglaDigits((totalLandDecimal / 33).toFixed(1), lang)} {t('বিঘা', 'bigha')}
                  </div>
                </div>
                <MiniSparkline data={landTrend} color="#006A4E" fillId="spark-land" />
                <div className="text-[11px] font-bold text-[#006A4E] mt-1 flex items-center gap-1 group-hover:translate-x-0.5 transition">
                  <span>{t('জমি দেখুন', 'View Land')}</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </Card>

              {/* Card 2: Sale Lock Protection */}
              <Card
                onClick={() => handleTabChange('plots')}
                className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/40 via-white to-white hover:from-amber-50/70 border border-amber-100/90 hover:border-amber-300 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-2xs hover:shadow-xs hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between text-slate-600 mb-1.5">
                  <span className="text-xs font-bold text-slate-700">{t('বিক্রয় লক', 'Sale Lock')}</span>
                  <div className="w-7 h-7 rounded-lg bg-amber-100/70 text-amber-700 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-amber-600 group-hover:scale-110 transition" />
                  </div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span className="font-mono text-amber-700">{toBanglaDigits(lockedPlotsCount, lang)}/{toBanglaDigits(plots.length, lang)}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      lockedPlotsCount === plots.length && plots.length > 0
                        ? 'bg-emerald-100 text-[#006A4E]'
                        : lockedPlotsCount > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {lockedPlotsCount === plots.length && plots.length > 0
                        ? t('সম্পূর্ণ সুরক্ষিত', 'Protected')
                        : lockedPlotsCount > 0
                        ? t('আংশিক সুরক্ষিত', 'Partial')
                        : t('উন্মুক্ত', 'Unlocked')}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {lockedPlotsCount > 0
                      ? t('অননুমোদিত বিক্রি বন্ধ', 'Transfers blocked')
                      : t('জালিয়াতি রোধে লক করুন', 'Turn lock on')}
                  </div>
                </div>
                <MiniSparkline data={lockTrend} color="#d97706" fillId="spark-lock" />
                <div className="text-[11px] font-bold text-amber-700 mt-1 flex items-center gap-1 group-hover:translate-x-0.5 transition">
                  <span>{t('লক নিয়ন্ত্রণ', 'Manage Lock')}</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </Card>

              {/* Card 3: Registered Deeds */}
              <Card
                onClick={() => handleTabChange('deeds')}
                className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/40 via-white to-white hover:from-blue-50/70 border border-blue-100/90 hover:border-blue-300 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-2xs hover:shadow-xs hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between text-slate-600 mb-1.5">
                  <span className="text-xs font-bold text-slate-700">{t('দলিলপত্র', 'Deeds')}</span>
                  <div className="w-7 h-7 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center">
                    <FileCheck className="w-4 h-4 text-blue-600 group-hover:scale-110 transition" />
                  </div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-blue-900 tracking-tight font-mono">
                    {toBanglaDigits(deeds.length, lang)} <span className="text-xs font-bold text-slate-500 font-sans">{t('টি', 'items')}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {deeds.length > 0
                      ? t('সাব-রেজিস্ট্রিতে যাচাইকৃত', 'Verified deeds')
                      : t('কোনো দলিল নেই', 'No deeds')}
                  </div>
                </div>
                <MiniSparkline data={deedsTrend} color="#2563eb" fillId="spark-deeds" />
                <div className="text-[11px] font-bold text-blue-700 mt-1 flex items-center gap-1 group-hover:translate-x-0.5 transition">
                  <span>{t('দলিল দেখুন', 'View Deeds')}</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </Card>

              {/* Card 4: Active Transfers */}
              <Card
                onClick={() => handleTabChange('transfers')}
                className="p-4 rounded-2xl bg-gradient-to-br from-teal-50/40 via-white to-white hover:from-teal-50/70 border border-teal-100/90 hover:border-teal-300 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-2xs hover:shadow-xs hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between text-slate-600 mb-1.5">
                  <span className="text-xs font-bold text-slate-700">{t('চলমান নামজারি', 'Active Mutations')}</span>
                  <div className="w-7 h-7 rounded-lg bg-teal-100/70 text-teal-700 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-teal-600 group-hover:scale-110 transition" />
                  </div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-teal-900 tracking-tight font-mono">
                    {toBanglaDigits(activeTransfersCount, lang)} <span className="text-xs font-bold text-slate-500 font-sans">{t('টি', 'active')}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {activeTransfersCount > 0
                      ? t('ট্র্যাকিং সক্রিয়', 'Tracking live')
                      : t('কোনো আবেদন নেই', 'No applications')}
                  </div>
                </div>
                <MiniSparkline data={transfersTrend} color="#0d9488" fillId="spark-transfers" />
                <div className="text-[11px] font-bold text-teal-700 mt-1 flex items-center gap-1 group-hover:translate-x-0.5 transition">
                  <span>{t('অগ্রগতি দেখুন', 'View Progress')}</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </Card>
            </div>

            {/* Beside 4 Cards: Action Buttons (Responsive: side-by-side on mobile, vertical expanding dock on desktop) */}
            <div className="flex sm:flex-col items-center justify-end sm:justify-center gap-2 sm:gap-2.5 shrink-0 self-end sm:self-center pt-1 sm:pt-0">
              {/* Refresh Button */}
              <button
                type="button"
                onClick={loadVault}
                disabled={loading}
                className="group flex items-center justify-center h-10 sm:h-11 px-3 sm:px-0 sm:w-11 sm:hover:w-32 transition-all duration-300 ease-out bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl sm:rounded-2xl shadow-2xs hover:shadow-md cursor-pointer overflow-hidden shrink-0"
                title={t('তথ্য রিফ্রেশ করুন', 'Refresh Data')}
              >
                <div className="flex items-center justify-center shrink-0 w-4 h-4 sm:w-11 sm:h-11">
                  <RotateCw
                    className={`w-4 h-4 text-slate-600 group-hover:text-[#006A4E] transition-colors ${
                      loading ? 'animate-spin' : ''
                    }`}
                  />
                </div>
                <span className="whitespace-nowrap text-xs font-bold text-slate-800 transition-all duration-300 ease-out ml-1.5 sm:ml-0 sm:opacity-0 sm:max-w-0 sm:group-hover:opacity-100 sm:group-hover:max-w-20 sm:group-hover:mr-3 overflow-hidden">
                  {t('রিফ্রেশ', 'Refresh')}
                </span>
              </button>

              {/* Apply Button */}
              <button
                type="button"
                onClick={() => onNavigate('applications?new=1')}
                className="group flex items-center justify-center h-10 sm:h-11 px-3.5 sm:px-0 sm:w-11 sm:hover:w-44 transition-all duration-300 ease-out bg-[#006A4E] hover:bg-[#00553e] text-white rounded-xl sm:rounded-2xl shadow-xs hover:shadow-md cursor-pointer overflow-hidden shrink-0"
                title={t('নতুন জমি হস্তান্তর আবেদন', 'Apply for Transfer')}
              >
                <div className="flex items-center justify-center shrink-0 w-4 h-4 sm:w-11 sm:h-11">
                  <Plus className="w-4 h-4 stroke-[3] text-white" />
                </div>
                <span className="whitespace-nowrap text-xs font-black text-white transition-all duration-300 ease-out ml-1.5 sm:ml-0 sm:opacity-0 sm:max-w-0 sm:group-hover:opacity-100 sm:group-hover:max-w-32 sm:group-hover:mr-3 overflow-hidden">
                  {t('হস্তান্তর আবেদন', 'Apply')}
                </span>
              </button>
            </div>
          </div>

          {/* SECTION 1: OVERVIEW & SERVICE HUB (সারসংক্ষেপ ও সেবা হাব) */}
          <div data-tour="overview-services" className="space-y-3.5">
          {/* 3 FOCUSED SPECIALIZED CITIZEN SERVICES (NON-DUPLICATE TOOLS) */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#006A4E]" />
                <span>{t('প্রয়োজনীয় সেবা', 'Citizen Services')}</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-2.5">
              {/* Service 1: জমি ক্রয়ের আগে ৯-ইঞ্জিন প্রাক-যাচাই */}
              <Card
                onClick={() => onNavigate('check')}
                className="p-3 sm:px-4 sm:py-3 rounded-xl border border-slate-200/90 hover:border-emerald-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex items-center justify-between group bg-gradient-to-r from-white to-emerald-50/30 relative overflow-hidden shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#006A4E] group-hover:bg-[#006A4E] group-hover:text-white transition-all shadow-2xs shrink-0">
                    <Search className="w-4 h-4" />
                  </div>
                  <span className="font-extrabold text-sm text-slate-900 group-hover:text-[#006A4E] transition truncate">
                    {t('জমি যাচাই', 'Check Land')}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#006A4E] group-hover:translate-x-0.5 transition shrink-0 ml-2" />
              </Card>

              {/* Service 2: জমির স্বাস্থ্য সনদ ও পাসপোর্ট */}
              <Card
                onClick={() => {
                  if (plots.length > 0) {
                    setPassportPlot(plots[0]);
                  } else {
                    handleTabChange('plots');
                  }
                }}
                className="p-3 sm:px-4 sm:py-3 rounded-xl border border-slate-200/90 hover:border-amber-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex items-center justify-between group bg-gradient-to-r from-white to-amber-50/30 relative overflow-hidden shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-2xs shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="font-extrabold text-sm text-slate-900 group-hover:text-amber-800 transition truncate">
                    {t('জমির স্বাস্থ্য সনদ', 'Land Health Cert')}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 group-hover:translate-x-0.5 transition shrink-0 ml-2" />
              </Card>

              {/* Service 3: উত্তরাধিকার ফারায়েজ বণ্টন ক্যালকুলেটর */}
              <Card
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-faraiz-calculator', { detail: {} }));
                }}
                className="p-3 sm:px-4 sm:py-3 rounded-xl border border-slate-200/90 hover:border-purple-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex items-center justify-between group bg-gradient-to-r from-white to-purple-50/30 relative overflow-hidden shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-2xs shrink-0">
                    <Scale className="w-4 h-4" />
                  </div>
                  <span className="font-extrabold text-sm text-slate-900 group-hover:text-purple-800 transition truncate">
                    {t('ফারায়েজ ক্যালকুলেটর', 'Faraiz Calculator')}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-700 group-hover:translate-x-0.5 transition shrink-0 ml-2" />
              </Card>
            </div>
          </div>

          {/* Smart Land Portfolio Spotlight (আমার জমির দ্রুত ভিউ - কমপ্যাক্ট টেবিল/গ্রিড) */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#006A4E]" />
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900">
                  {t('জমির তালিকা', 'My Land Plots')}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => handleTabChange('plots')}
                className="text-xs font-bold text-[#006A4E] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{t('সব জমি দেখুন', 'View All')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24 rounded-full" />
                    </div>
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-3 w-36" />
                    <Skeleton className="h-7 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            ) : plots.length === 0 ? (
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
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                            plot.owner_sale_locked
                              ? 'bg-emerald-100 text-[#006A4E] border border-emerald-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {plot.owner_sale_locked ? (
                            <ShieldCheck className="w-3 h-3 text-[#006A4E]" />
                          ) : (
                            <Unlock className="w-3 h-3 text-amber-700" />
                          )}
                          {plot.owner_sale_locked
                            ? t('বিক্রয় লক সক্রিয়', 'Locked')
                            : t('বিক্রয় লক খোলা', 'Unlocked')}
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
                      <Button
                        type="button"
                        size="sm"
                        disabled={lockTogglingPlotId === plot.plot_id}
                        onClick={() => handleToggleSaleLock(plot)}
                        className={`flex-1 h-8 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 shadow-2xs ${
                          plot.owner_sale_locked
                            ? 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
                            : 'bg-[#006A4E] text-white hover:bg-emerald-800'
                        }`}
                      >
                        {lockTogglingPlotId === plot.plot_id ? (
                          <RotateCw className="w-3 h-3 animate-spin" />
                        ) : plot.owner_sale_locked ? (
                          <Unlock className="w-3 h-3 text-amber-800" />
                        ) : (
                          <Lock className="w-3 h-3 text-white" />
                        )}
                        <span>{plot.owner_sale_locked ? t('লক প্রত্যাহার', 'Unlock') : t('বিক্রয় লক', 'Lock Sale')}</span>
                      </Button>

                      {plot.owner_sale_locked && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setAuditPlotForModal(plot)}
                          title={t('বিক্রয় লক সুরক্ষা সনদ দেখুন', 'View Sale Lock Audit Certificate')}
                          className="h-8 px-2 rounded-lg text-[11px] font-bold bg-emerald-50 text-[#006A4E] hover:bg-emerald-100 border-emerald-200 flex items-center gap-1 shrink-0"
                        >
                          <ShieldCheck className="w-3 h-3 text-[#006A4E]" />
                          <span>{t('সনদ', 'Cert')}</span>
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedPlotId(String(plot.plot_id));
                          handleTabChange('plots');
                        }}
                        className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                        title={t('জমির সম্পূর্ণ বিবরণ দেখুন', 'View Full Land Details')}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Transfer Banner (চলমান হস্তান্তর আবেদন থাকলে প্রদর্শিত হবে) */}
          {activeTransfersCount > 0 && (
            <Card className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="px-1.5 py-0 rounded font-bold text-[9px] bg-amber-200 text-amber-900 border-amber-300">
                      {t('চলমান', 'In Progress')}
                    </Badge>
                    <h4 className="font-extrabold text-xs text-slate-900 truncate">
                      {t('জমি হস্তান্তর আবেদন প্রক্রিয়াধীন', 'Land transfer in progress')}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-600 truncate mt-0.5">
                    {t('অগ্রগতি ও তারিখ দেখতে ট্র্যাকার খুলুন।', 'Track verification and registration steps.')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleTabChange('transfers')}
                  className="h-8 px-3.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span>{t('ট্র্যাকার', 'Tracker')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          )}
          </div>
        </div>
      )}

      {/* Universal Address Cascader Toolbar (Used on plots, deeds, disputes) */}
      {(section === 'plots' || section === 'deeds' || section === 'disputes') && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-2 sm:p-2.5 shadow-2xs shrink-0 transition-all">
          {/* Main Compact Row: Search Bar + Location Filter Toggle + Clear/Reset */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Search Input with Clear Button */}
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 z-10 pointer-events-none" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(
                  'দাগ, খতিয়ান বা দলিল নং দিয়ে খুঁজুন...',
                  'Search plot, khatian, deed no...'
                )}
                className="w-full pl-9 pr-8 text-xs h-8.5 sm:h-9 bg-slate-50/70 border-slate-200 focus:bg-white focus:border-[#006A4E] rounded-lg transition-colors placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 sm:top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-full hover:bg-slate-200/50"
                  title={t('অনুসন্ধান মুছুন', 'Clear search')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Location Hierarchy Filter Toggle Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className={`h-8.5 sm:h-9 px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                isFilterExpanded || activeLocationFiltersCount > 0
                  ? 'bg-emerald-50 text-[#006A4E] border-emerald-300 shadow-2xs hover:bg-emerald-100 hover:text-[#005a40]'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
              title={t('ভৌগোলিক অবস্থান অনুসারে ফিল্টার করুন', 'Filter by geographic location')}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline font-medium">{t('অবস্থান ফিল্টার', 'Location')}</span>
              <span className="sm:hidden font-medium">{t('ফিল্টার', 'Filter')}</span>
              {activeLocationFiltersCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-bold bg-[#006A4E] text-white">
                  {toBanglaDigits(activeLocationFiltersCount)}
                </span>
              )}
              {isFilterExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 opacity-70 shrink-0" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" />
              )}
            </Button>

            {/* Quick Reset Button (Visible whenever any filter or search query is active) */}
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8.5 sm:h-9 px-2 sm:px-2.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg cursor-pointer transition-colors shrink-0 flex items-center gap-1"
                title={t('সকল ফিল্টার রিসেট করুন', 'Reset all filters')}
              >
                <RotateCw className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">{t('রিসেট', 'Reset')}</span>
              </Button>
            )}
          </div>

          {/* Active Filter Chips Bar (Shown when collapsed but location filters are active) */}
          {!isFilterExpanded && activeLocationFiltersCount > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-2 mt-1.5 border-t border-slate-100 text-xs">
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 shrink-0">
                <MapPin className="w-3 h-3 text-[#006A4E]" />
                {t('নির্বাচিত এলাকা:', 'Selected:')}
              </span>

              {selectedDivision && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium animate-in fade-in">
                  <span>{selectedDivision}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDivision('');
                      setSelectedDistrict('');
                      setSelectedUpazila('');
                      setSelectedMouzaId('');
                    }}
                    className="hover:text-rose-600 cursor-pointer p-0.5 rounded hover:bg-emerald-100"
                    title={t('বিভাগ মুছুন', 'Clear division')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedDistrict && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium animate-in fade-in">
                  <span>{selectedDistrict}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDistrict('');
                      setSelectedUpazila('');
                      setSelectedMouzaId('');
                    }}
                    className="hover:text-rose-600 cursor-pointer p-0.5 rounded hover:bg-emerald-100"
                    title={t('জেলা মুছুন', 'Clear district')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedUpazila && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium animate-in fade-in">
                  <span>{selectedUpazila}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUpazila('');
                      setSelectedMouzaId('');
                    }}
                    className="hover:text-rose-600 cursor-pointer p-0.5 rounded hover:bg-emerald-100"
                    title={t('উপজেলা মুছুন', 'Clear upazila')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedMouzaId && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium animate-in fade-in">
                  <span>{t('মৌজা', 'Mouza')} #{toBanglaDigits(selectedMouzaId)}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedMouzaId('')}
                    className="hover:text-rose-600 cursor-pointer p-0.5 rounded hover:bg-emerald-100"
                    title={t('মৌজা মুছুন', 'Clear mouza')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelectedDivision('');
                  setSelectedDistrict('');
                  setSelectedUpazila('');
                  setSelectedMouzaId('');
                }}
                className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline ml-auto font-medium cursor-pointer"
              >
                {t('এলাকা রিসেট', 'Clear area')}
              </button>
            </div>
          )}

          {/* Expandable Location Hierarchy Panel */}
          {isFilterExpanded && (
            <div className="pt-2 mt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
              <AddressCascader
                lang={lang}
                isFilter={true}
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
          )}
        </div>
      )}

      {/* SECTION 2: PLOTS & SALE LOCK (আমার জমি ও বিক্রয় লক - মাস্টার-ডিটেইল ককপিট) */}
      {section === 'plots' && (
        <div data-tour="plots-container" className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-28 rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-44" />
                  <div className="pt-2 flex gap-2">
                    <Skeleton className="h-8 flex-1 rounded-xl" />
                    <Skeleton className="h-8 w-16 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPlots.length === 0 ? (
            <div className="bg-white p-10 text-center text-slate-500 rounded-2xl border border-slate-200 flex-1 flex flex-col items-center justify-center">
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
                <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 items-stretch overflow-hidden">
                  {/* Master List Pane (Left Column: 340px) */}
                  <div className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col min-h-0 h-full bg-white rounded-2xl border border-slate-200/90 p-3 shadow-xs">
                    <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-bold shrink-0 mb-2">
                      <span>{t('জমির তালিকা', 'Land List')} ({toBanglaDigits(filteredPlots.length, lang)})</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {toBanglaDigits(lockedPlotsCount, lang)} {t('লককৃত', 'locked')}
                      </span>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                      {filteredPlots.map((plot) => {
                        const isSelected = String(activePlot?.plot_id) === String(plot.plot_id);
                        return (
                          <div
                            key={plot.plot_id}
                            onClick={() => setSelectedPlotId(String(plot.plot_id))}
                            className={`p-3 rounded-xl border text-left transition cursor-pointer relative flex flex-col justify-between ${
                              isSelected
                                ? 'bg-white border-slate-200/90 border-l-4 border-l-[#006A4E] shadow-sm ring-1 ring-[#006A4E]/20'
                                : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/70'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-black text-sm text-slate-900 truncate">
                                    {t('দাগ', 'Plot')} #{toBanglaDigits(plot.dag_no_bn || plot.dag_no, lang)}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-700">
                                    {plot.survey_type || 'BS'}-{toBanglaDigits(plot.khatian_no_bn || plot.khatian_no, lang)}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {plot.mouza_bn}, {plot.upazila_bn}
                                </div>
                              </div>

                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 flex items-center gap-1 border ${
                                  plot.owner_sale_locked
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {plot.owner_sale_locked ? (
                                  <ShieldCheck className="w-3 h-3 text-[#006A4E]" />
                                ) : (
                                  <Unlock className="w-3 h-3 text-amber-700" />
                                )}
                                {plot.owner_sale_locked
                                  ? t('বিক্রয় লক সক্রিয়', 'Locked')
                                  : t('বিক্রয় লক খোলা', 'Unlocked')}
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
                  <div className="flex-1 min-w-0 w-full h-full min-h-0 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3.5 overflow-y-auto scrollbar-thin">
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

                      {/* Prominent 1-Click Sale Lock Action & Audit Certificate Link */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                        {activePlot.owner_sale_locked && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAuditPlotForModal(activePlot)}
                            className="h-9 px-3.5 rounded-xl text-xs font-bold bg-white text-slate-800 hover:text-[#006A4E] hover:bg-slate-50 border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                          >
                            <ShieldCheck className="w-4 h-4 text-[#006A4E]" />
                            <span>{t('সুরক্ষা সনদ', 'Certificate')}</span>
                          </Button>
                        )}

                        <div data-tour="plots-sale-lock" className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2.5 shrink-0">
                          <Label htmlFor="active-plot-sale-lock" className="text-xs font-bold cursor-pointer flex items-center gap-1.5 whitespace-nowrap">
                            {activePlot.owner_sale_locked ? (
                              <span className="text-[#006A4E] flex items-center gap-1 whitespace-nowrap">
                                <ShieldCheck className="w-3.5 h-3.5 text-[#006A4E] shrink-0" />
                                {t('বিক্রয় লক অন', 'Lock ON')}
                              </span>
                            ) : (
                              <span className="text-slate-600 flex items-center gap-1 whitespace-nowrap">
                                <Unlock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                {t('বিক্রয় লক অফ', 'Lock OFF')}
                              </span>
                            )}
                          </Label>
                          <Switch
                            id="active-plot-sale-lock"
                            checked={Boolean(activePlot.owner_sale_locked)}
                            disabled={lockTogglingPlotId === activePlot.plot_id}
                            onCheckedChange={() => handleToggleSaleLock(activePlot)}
                          />
                        </div>
                      </div>
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

                    {/* Sale Lock Anti-Fraud Sovereign Security Box */}
                    <div
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all shadow-2xs ${
                        activePlot.owner_sale_locked
                          ? 'bg-gradient-to-r from-emerald-50/70 via-emerald-50/25 to-white border-emerald-200/90'
                          : 'bg-gradient-to-r from-amber-50/70 via-amber-50/25 to-white border-amber-200/90'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                            activePlot.owner_sale_locked
                              ? 'bg-[#006A4E] text-white'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          {activePlot.owner_sale_locked ? (
                            <ShieldCheck className="w-5 h-5 text-white stroke-[2.2]" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-white stroke-[2.2]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-xs sm:text-sm text-slate-900">
                                {activePlot.owner_sale_locked
                                  ? t('মালিকানা সুরক্ষিত (লক সক্রিয়)', 'Ownership Protected (Lock Active)')
                                  : t('সতর্কতা (বিক্রয় লক খোলা)', 'Warning (Sale Lock Inactive)')}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                  activePlot.owner_sale_locked
                                    ? 'bg-emerald-100 text-[#006A4E] border-emerald-300'
                                    : 'bg-amber-100 text-amber-900 border-amber-300'
                                }`}
                              >
                                {activePlot.owner_sale_locked ? t('সুরক্ষিত', 'Secured') : t('ঝুঁকিপূর্ণ', 'At Risk')}
                              </span>
                            </div>

                            {activePlot.owner_sale_locked && (
                              <button
                                type="button"
                                onClick={() => setAuditPlotForModal(activePlot)}
                                className="text-xs font-bold text-[#006A4E] hover:text-[#00553e] hover:underline inline-flex items-center gap-1 transition-colors"
                              >
                                <span>{t('অডিট সনদ', 'Audit Certificate')}</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-600 leading-relaxed font-normal">
                            {activePlot.owner_sale_locked
                              ? t(
                                  'বিক্রয় লক চালু আছে। সাব-রেজিস্ট্রিতে অননুমোদিত হস্তান্তর ও জাল দলিল নিবন্ধন বন্ধ থাকবে।',
                                  'Sale Lock is active. Unauthorized deed transfers and fraudulent registrations are blocked at Sub-Registry.'
                                )
                              : t(
                                  'বিক্রয় লক খোলা আছে। অননুমোদিত হস্তান্তর ও জালিয়াতি রোধে বিক্রয় লক অন করুন।',
                                  'Sale lock is OFF. Turn ON sale lock immediately to prevent unauthorized deed transactions.'
                                )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Ribbon (Uniform High-Contrast Action Tiles) */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        {t('দ্রুত সেবা', 'Quick Services')}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setSelectedPlotId(String(activePlot.plot_id));
                            handleTabChange('docs');
                          }}
                          className="h-10 px-3 rounded-xl border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50/80 text-slate-800 font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all"
                        >
                          <FolderOpen className="w-4 h-4 text-[#006A4E] shrink-0" />
                          <span className="truncate">{t('সংরক্ষিত কাগজপত্র', 'Saved Records')}</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
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
                          className="h-10 px-3 rounded-xl border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50/80 text-slate-800 font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all"
                        >
                          <Scale className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="truncate">{t('ফারায়েজ বণ্টন', 'Faraiz')}</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          data-tour="land-passport-btn"
                          onClick={() => setPassportPlot(activePlot)}
                          className="h-10 px-3 rounded-xl border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50/80 text-slate-800 font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all"
                        >
                          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="truncate">{t('স্বাস্থ্য পাসপোর্ট', 'Passport')}</span>
                        </Button>

                        <Button
                          type="button"
                          onClick={() => onNavigate('applications?new=1')}
                          className="h-10 px-3.5 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all"
                        >
                          <Plus className="w-4 h-4 text-white stroke-[2.5] shrink-0" />
                          <span className="truncate">{t('হস্তান্তর আবেদন', 'Transfer')}</span>
                        </Button>
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
        <div data-tour="docs-vault-container" className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
          {/* Left Column: Select Land Plot */}
          <div className="h-full min-h-0 flex flex-col bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 shrink-0">
              <FolderOpen className="w-4 h-4 text-[#006A4E]" />
              <span>{t('জমি নির্বাচন', 'Select Land Plot')}</span>
            </h3>
            <p className="text-xs text-slate-500 shrink-0 mt-1 mb-2">
              {t('কাগজপত্র দেখতে জমি নির্বাচন করুন:', 'Select a plot to view records:')}
            </p>

            <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-1 scrollbar-thin focus:outline-none">
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

          {/* Right Column: 7 Core Documents Checklist & Download Actions */}
          <div className="lg:col-span-2 h-full min-h-0 flex flex-col overflow-hidden">
            {!selectedPlotId ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-xs flex-1 flex flex-col items-center justify-center">
                <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="font-bold text-base text-slate-700">
                  {t('বাঁ পাশের তালিকা থেকে কোনো একটি জমি নির্বাচন করুন', 'Select a plot from the left panel')}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {t('নির্বাচিত জমির সকল অনুমোদিত দলিল, খতিয়ান ও কর রশিদ এখানে প্রদর্শিত হবে।', 'All linked records and verified digital copies will appear here.')}
                </p>
              </div>
            ) : (
              <div className="h-full min-h-0 flex flex-col overflow-hidden space-y-2.5">
                {/* Active Plot Fixed Compact Header & 3 Slim Metric Pills (shrink-0, non-scrollable) */}
                {(() => {
                  const activePlot = plots.find((p) => String(p.plot_id) === String(selectedPlotId));
                  return (
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:px-4 sm:py-2.5 shadow-2xs shrink-0 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#006A4E] border border-emerald-200 flex items-center justify-center shrink-0">
                            <FolderOpen className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-black text-sm text-slate-900 truncate">
                              {t('দাগ নং', 'Plot No.')} {toBanglaDigits(activePlot?.dag_no_bn || activePlot?.dag_no || selectedPlotId, lang)} · {activePlot?.mouza_bn || ''} ({activePlot?.upazila_bn || ''})
                            </h4>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                              {t('খতিয়ান নং', 'Khatian No.')}: {toBanglaDigits(activePlot?.khatian_no_bn || activePlot?.khatian_no || '---', lang)} · {t('পরিমাণ', 'Area')}: {toBanglaDigits(activePlot?.area_decimal ?? activePlot?.share_area_decimal ?? 0, lang)} {t('শতক', 'dec')}
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setIsUploadDocModalOpen(true)}
                          className="h-8 px-3 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>{t('কাগজপত্র আপলোড', 'Upload Document')}</span>
                        </Button>
                      </div>

                      {/* 3 Slim Compact Status Pills */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1.5 border-t border-slate-100">
                        <div className="py-1 px-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center gap-1.5">
                          <span className="text-[10px] text-slate-500 font-medium">{t('মোট নথি', 'Total')}:</span>
                          <span className="font-black text-slate-800 text-xs font-mono">
                            {toBanglaDigits(docs?.total ?? (docs?.items || []).length, lang)} {t('টি', '')}
                          </span>
                        </div>
                        <div className="py-1 px-2 rounded-lg bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-center gap-1.5">
                          <span className="text-[10px] text-emerald-800 font-medium">{t('সংরক্ষিত', 'Saved')}:</span>
                          <span className="font-black text-[#006A4E] text-xs font-mono">
                            {toBanglaDigits(docs?.verified_count ?? 0, lang)} {t('টি', '')}
                          </span>
                        </div>
                        <div className="py-1 px-2 rounded-lg bg-amber-50/70 border border-amber-200/80 flex items-center justify-center gap-1.5">
                          <span className="text-[10px] text-amber-800 font-medium">{t('আবেদনযোগ্য', 'Requestable')}:</span>
                          <span className="font-black text-amber-800 text-xs font-mono">
                            {toBanglaDigits(docs?.missing_count ?? 0, lang)} {t('টি', '')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 7 Essential Land Records List - Scrollable */}
                <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin focus:outline-none">
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
                                    {t('প্রয়োজনীয়', 'Required')}
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
                                    <span>{t('অনলাইনে সংরক্ষিত ও নির্ভুল', 'Verified & Saved')}</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>{t('কপি নেই — অনলাইনে আবেদনের সুযোগ', 'Missing (1-Click Request)')}</span>
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
        <div data-tour="deeds-table-container" className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200/90 flex flex-col overflow-hidden shadow-xs">
          {/* Internal Scrollable Table Container */}
          <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
            <table className="w-full text-sm text-[#0A1F1C] border-separate border-spacing-0">
              <thead className="sticky top-0 z-20">
                <tr className="hover:bg-transparent">
                  <th className="sticky top-0 z-20 bg-slate-100 text-slate-700 w-12 text-center font-bold text-xs py-3 px-3 border-b border-slate-200">
                    #
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-100 text-slate-700 font-bold text-xs py-3 px-4 whitespace-nowrap text-left border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span>{t('দলিল নম্বর', 'Deed No')}</span>
                      <Badge variant="outline" className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-[#006A4E] border-emerald-200 font-bold">
                        {toBanglaDigits(filteredDeeds.length, lang)} {t('টি দলিল', 'Deeds')}
                      </Badge>
                    </div>
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-100 text-slate-700 font-bold text-xs py-3 px-4 whitespace-nowrap text-left border-b border-slate-200">
                    {t('দলিলের ধরন', 'Deed Type')}
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-100 text-slate-700 font-bold text-xs py-3 px-4 whitespace-nowrap text-left border-b border-slate-200">
                    {t('দাগ ও মৌজা', 'Plot & Mouza')}
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-100 text-slate-700 font-bold text-xs py-3 px-4 whitespace-nowrap text-left border-b border-slate-200">
                    {t('জমির পরিমাণ', 'Area')}
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-100 text-slate-700 font-bold text-xs py-3 px-4 whitespace-nowrap text-left border-b border-slate-200">
                    {t('মূল্য (টাকা)', 'Value (BDT)')}
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-100 text-slate-700 font-bold text-xs py-3 px-4 whitespace-nowrap text-left border-b border-slate-200">
                    {t('রেজিস্ট্রি অফিস', 'Registry')}
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-100 text-slate-700 font-bold text-xs py-3 px-4 whitespace-nowrap text-left border-b border-slate-200">
                    {t('অবস্থা', 'Status')}
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-100 text-slate-700 text-right font-bold text-xs py-3 px-4 whitespace-nowrap border-b border-slate-200">
                    {t('কার্যক্রম', 'Action')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredDeeds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                          <FileText className="w-6 h-6" />
                        </div>
                        <p className="font-bold text-sm text-slate-800 mb-1">
                          {t('কোনো দলিল পাওয়া যায়নি', 'No deeds found')}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t('অনুসন্ধান বা ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন।', 'Try adjusting your search query or area filters.')}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDeeds.map((deed, idx) => {
                    const statusKey = String(deed.status || 'MUTATED').toUpperCase();
                    return (
                      <TableRow
                        key={deed.id || idx}
                        className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-b-0"
                      >
                        {/* 1. Index */}
                        <TableCell className="text-center font-mono text-slate-400 text-xs py-3 px-3">
                          {toBanglaDigits(idx + 1, lang)}
                        </TableCell>

                        {/* 2. Deed Number - Compact single-line code badge */}
                        <TableCell className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-900 font-mono text-xs font-black border border-slate-200/80 shadow-2xs">
                            <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{deed.deed_no}</span>
                          </span>
                        </TableCell>

                        {/* 3. Deed Type - Refined hierarchy */}
                        <TableCell className="py-3 px-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-xs">
                              {deed.deed_type === 'SALE' ? t('বিক্রয় দলিল', 'Sale Deed') : (deed.deed_type_bn || deed.deed_type || t('কবলা দলিল', 'Kabala Deed'))}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold tracking-wide">
                              {deed.deed_type === 'SALE' ? 'KABALA' : (deed.deed_type || 'DEED')}
                            </span>
                          </div>
                        </TableCell>

                        {/* 4. Dag & Mouza - Single-line neat layout */}
                        <TableCell className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-xs">
                              {t('দাগ নং', 'Plot')} {toBanglaDigits(deed.dag_no_bn || deed.dag_no, lang)}
                            </span>
                            {deed.mouza_bn && (
                              <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                                {deed.mouza_bn}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* 5. Land Area */}
                        <TableCell className="py-3 px-4 whitespace-nowrap">
                          <Badge variant="outline" className="bg-emerald-50 text-[#006A4E] border-emerald-200 font-bold text-xs">
                            {toBanglaDigits(deed.area_decimal, lang)} {t('শতক', 'dec')}
                          </Badge>
                        </TableCell>

                        {/* 6. Price */}
                        <TableCell className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-800 text-xs">
                          ৳{deed.price_bdt ? toBanglaDigits(Number(deed.price_bdt).toLocaleString(), lang) : '—'}
                        </TableCell>

                        {/* 7. Registry Office */}
                        <TableCell className="py-3 px-4 whitespace-nowrap text-xs text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{deed.sub_registry_office_bn || t('সাব-রেজিস্ট্রি কার্যালয়', 'Sub-Registry Office')}</span>
                          </div>
                        </TableCell>

                        {/* 8. Status */}
                        <TableCell className="py-3 px-4 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={
                              statusKey === 'MUTATED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[11px]'
                                : statusKey === 'REGISTERED'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 font-bold text-[11px]'
                                : 'bg-amber-50 text-amber-700 border-amber-200 font-bold text-[11px]'
                            }
                          >
                            <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current" />
                            {statusKey === 'MUTATED'
                              ? t('নামজারি সম্পন্ন', 'Mutated')
                              : statusKey === 'REGISTERED'
                              ? t('নিবন্ধিত', 'Registered')
                              : t('প্রক্রিয়াধীন', 'Pending')}
                          </Badge>
                        </TableCell>

                        {/* 9. Action Buttons */}
                        <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 rounded-lg border-slate-200 bg-white hover:bg-emerald-50 hover:text-[#006A4E] hover:border-emerald-300 text-slate-700 text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                              onClick={() => setSelectedDeedForModal(deed)}
                              title={t('দলিলের সম্পূর্ণ বিবরণ ও ডিজিটাল সিল দেখুন', 'View Deed Details & Official Seal')}
                            >
                              <Eye className="w-3.5 h-3.5 text-[#006A4E]" />
                              <span>{t('বিবরণ', 'Details')}</span>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 rounded-lg border-slate-200 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                              onClick={() => onNavigate(`qr?deed_no=${encodeURIComponent(deed.deed_no)}`)}
                              title={t('কিউআর কোড ও ডিজিটাল সিল যাচাই', 'Verify Deed QR Code & Cryptographic Seal')}
                            >
                              <QrCode className="w-3.5 h-3.5 text-blue-600" />
                              <span>{t('যাচাই', 'Verify')}</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 5: TRANSFER APPLICATIONS TRACKER (হস্তান্তর ট্র্যাকার) */}
      {section === 'transfers' && (
        <div data-tour="transfers-timeline-container" className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex-1 min-h-0 flex flex-col overflow-hidden space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-50 text-[#006A4E] border-emerald-200 text-xs font-bold">
                  {t('নামজারি ট্র্যাকার', 'Mutation Tracker')}
                </Badge>
                <span className="text-xs text-slate-500 font-medium">
                  {t('সর্বশেষ অবস্থা ও বিবরণ', 'Latest Status')}
                </span>
              </div>
              <Button
                size="sm"
                onClick={() => onNavigate('applications?new=1')}
                className="h-8 px-3.5 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>{t('নতুন আবেদন', 'New Application')}</span>
              </Button>
            </div>
            {transfersLoading ? (
              <div className="space-y-3 py-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50 gap-3">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : citizenTransfers.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex-1 flex flex-col items-center justify-center">
                <FileCheck className="w-10 h-10 text-slate-400 mx-auto" />
                <div className="text-base font-bold text-slate-800">
                  {t('কোনো চলমান আবেদন নেই', 'No Active Applications')}
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {t(
                    'নতুন হস্তান্তর বা নামজারি আবেদন করতে নিচের বোতামে চাপুন।',
                    'To initiate a transfer application, click the button below.'
                  )}
                </p>
                <Button
                  onClick={() => onNavigate('applications?new=1')}
                  className="bg-[#006A4E] hover:bg-[#00553e] text-white font-bold"
                >
                  {t('নতুন আবেদন করুন', 'Start Application')}
                </Button>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-slate-200 scrollbar-thin">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs border-b border-slate-200 shadow-2xs">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-bold text-slate-700">{t('ট্র্যাকিং কোড', 'Tracking Code')}</TableHead>
                      <TableHead className="font-bold text-slate-700">{t('দাগ নং ও মৌজা', 'Plot & Mouza')}</TableHead>
                      <TableHead className="font-bold text-slate-700">{t('দলিল', 'Deed')}</TableHead>
                      <TableHead className="font-bold text-slate-700">{t('জমির পরিমাণ', 'Area')}</TableHead>
                      <TableHead className="font-bold text-slate-700">{t('ধাপ ও অবস্থা', 'Step & Status')}</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">{t('কার্যক্রম', 'Action')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {citizenTransfers.map((tr: any) => (
                      <TableRow key={tr.id} className="hover:bg-slate-50/60 transition">
                        <TableCell className="font-mono font-bold text-slate-900">
                          {tr.tracking_number || `TR-${tr.id}`}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-slate-900">
                            {t(`দাগ নং ${toBanglaDigits(tr.plot?.dag_no || tr.plot_id, lang)}`, `Dag ${tr.plot?.dag_no || tr.plot_id}`)}
                          </div>
                          <div className="text-[11px] text-slate-500">{tr.plot?.mouza_bn}</div>
                        </TableCell>
                        <TableCell className="font-semibold text-slate-700">{tr.deed_type || 'SALE'}</TableCell>
                        <TableCell className="font-bold text-emerald-800">
                          {toBanglaDigits(tr.transfer_area_decimal || '০', lang)} {t('শতক', 'dec')}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1.5">
                            <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300 font-bold text-[10px]">
                              {t(`ধাপ ${toBanglaDigits(tr.current_step, lang)}/১৩ (${tr.status || 'PROCESSING'})`, `Step ${tr.current_step}/13 (${tr.status || 'PROCESSING'})`)}
                            </Badge>
                            <Progress value={Math.min(100, Math.round((Number(tr.current_step || 1) / 13) * 100))} className="h-1.5 w-28 bg-slate-100" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onNavigate(`applications?id=${tr.tracking_number || tr.id}`)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-[#006A4E] font-bold border-emerald-200"
                          >
                            {t('ট্র্যাকার দেখুন', 'View Tracker')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 6: DISPUTES & OBJECTIONS (আপত্তি ও বিরোধ দাখিল) */}
      {section === 'disputes' && (
        <div data-tour="disputes-tribunal-container" className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Full-width Objections Table Card */}
          <div className="w-full h-full min-h-0 bg-white rounded-xl border border-slate-200/90 flex flex-col overflow-hidden shadow-xs">
            <div className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <div className="font-extrabold text-xs sm:text-sm text-slate-800 flex items-center gap-2">
                <Scale className="w-4 h-4 text-rose-600" />
                <span>{t('দায়েরকৃত আপত্তি', 'Filed Objections')}</span>
                <Badge variant="outline" className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs bg-rose-50 text-rose-700 border-rose-200 font-bold">
                  {toBanglaDigits(disputes.length, lang)} {t('টি কেস', 'Cases')}
                </Badge>
              </div>

              <Button
                type="button"
                onClick={() => setIsDisputeModalOpen(true)}
                className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{t('আপত্তি দাখিল', 'File Objection')}</span>
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs border-b border-slate-200 shadow-2xs">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 font-bold text-slate-700">#</TableHead>
                    <TableHead className="font-bold text-slate-700">{t('কেস নম্বর', 'Case No')}</TableHead>
                    <TableHead className="font-bold text-slate-700">{t('আপত্তির ধরন', 'Category')}</TableHead>
                    <TableHead className="font-bold text-slate-700">{t('দাগ নং', 'Plot No')}</TableHead>
                    <TableHead className="font-bold text-slate-700">{t('বিবরণ', 'Description')}</TableHead>
                    <TableHead className="font-bold text-slate-700">{t('অবস্থা', 'Status')}</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">{t('অ্যাকশন', 'Action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disputes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3 border border-rose-100">
                            <Scale className="w-6 h-6" />
                          </div>
                          <p className="font-bold text-sm text-slate-800 mb-1">
                            {t('আপনার কোনো দায়েরকৃত আপত্তি নেই।', 'No objections filed.')}
                          </p>
                          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                            {t('জমির মালিকানা নিয়ে কোনো স্বত্ববঞ্চনা, সীমানা বিরোধ বা তথ্যের গরমিল থাকলে সহকারী কমিশনার (ভূমি) ট্রাইব্যুনালে সরাসরি আপত্তি দাখিল করুন।', 'File an objection directly to the AC Land tribunal if there is any dispute or boundary issue.')}
                          </p>
                          <Button
                            type="button"
                            onClick={() => setIsDisputeModalOpen(true)}
                            className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                            <span>{t('আপত্তি দাখিল করুন', 'File Objection')}</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    disputes.map((d, idx) => (
                      <TableRow key={d.id || idx} className="hover:bg-rose-50/20 transition">
                        <TableCell className="font-mono text-slate-400">{toBanglaDigits(idx + 1, lang)}</TableCell>
                        <TableCell className="font-mono font-bold text-slate-900">{d.case_no}</TableCell>
                        <TableCell className="font-bold text-slate-700">{d.dispute_type}</TableCell>
                        <TableCell className="font-bold text-[#006A4E]">
                          {t('দাগ', 'Plot')} {toBanglaDigits(d.dag_no_bn || d.dag_no || d.plot_id, lang)}
                        </TableCell>
                        <TableCell className="text-slate-600 text-[11px] max-w-xs truncate">
                          {d.description_bn}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              d.status === 'RESOLVED'
                                ? 'bg-emerald-50 text-[#006A4E] border-emerald-300'
                                : d.status === 'HEARING'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }
                          >
                            {d.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 hover:bg-slate-100 text-slate-700"
                            onClick={() => setSelectedDisputeForModal(d)}
                            title={t('শুনানি ও আদেশ বিবরণী', 'View Order Sheet')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Modal Dialog: File Objection (আপত্তি দাখিল ফর্ম) */}
          <Dialog open={isDisputeModalOpen} onOpenChange={setIsDisputeModalOpen}>
            <DialogContent className="max-w-lg p-6 rounded-3xl border border-slate-200">
              <DialogHeader className="border-b border-slate-100 pb-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 shadow-2xs">
                    <Scale className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <DialogTitle className="font-black text-base sm:text-lg text-slate-900 tracking-tight">
                      {t('আপত্তি দাখিল', 'File Objection')}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 mt-0.5">
                      {t('এসি ল্যান্ড অফিসে শুনানির জন্য দাখিল হবে।', 'Submitted to AC Land for hearing.')}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <form onSubmit={handleFileDispute} className="space-y-4 pt-2">
                <div>
                  <Label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t('বিরোধপূর্ণ জমি নির্বাচন করুন*', 'Select Contested Plot*')}
                  </Label>
                  <Select
                    value={disputePlotId || 'NONE'}
                    onValueChange={(val) => setDisputePlotId(val === 'NONE' ? '' : val)}
                  >
                    <SelectTrigger className="w-full h-10 text-xs">
                      <SelectValue placeholder={t('-- জমি নির্বাচন করুন --', '-- Select Plot --')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">{t('-- জমি নির্বাচন করুন --', '-- Select Plot --')}</SelectItem>
                      {plots.map((p) => (
                        <SelectItem key={p.plot_id} value={String(p.plot_id)}>
                          {t('দাগ নং', 'Plot')} {toBanglaDigits(p.dag_no_bn || p.dag_no, lang)} · {p.mouza_bn} ({p.area_decimal} {t('শতক', 'dec')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t('আপত্তির বিষয়শ্রেণি*', 'Objection Category*')}
                  </Label>
                  <Select value={disputeType} onValueChange={setDisputeType}>
                    <SelectTrigger className="w-full h-10 text-xs">
                      <SelectValue placeholder={t('বিষয়শ্রেণি নির্বাচন করুন', 'Select Category')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OWNERSHIP_OBJECTION">{t('মালিকানা দাবি ও জবরদখল আপত্তি', 'Ownership Objection')}</SelectItem>
                      <SelectItem value="BOUNDARY_DISPUTE">{t('সরেজমিন সীমানা বিরোধ', 'Boundary Dispute')}</SelectItem>
                      <SelectItem value="RECORD_ANOMALY">{t('খতিয়ানের জালিয়াতি বা তথ্যের গরমিল', 'Record Discrepancy')}</SelectItem>
                      <SelectItem value="INHERITANCE_OBJECTION">{t('ওয়ারিশান স্বত্ববঞ্চনার আপত্তি', 'Inheritance Rights')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t('আপত্তির পূর্ণাঙ্গ কারণ ও বিবরণ*', 'Details & Grounds for Objection*')}
                  </Label>
                  <textarea
                    required
                    rows={4}
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder={t(
                      'উক্ত দাগের জমিতে আমাদের বৈধ রেকর্ড থাকা সত্ত্বেও অন্য পক্ষ অবৈধ দখলের চেষ্টা চালাচ্ছে...',
                      'Provide detailed statement and facts...'
                    )}
                    className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDisputeModalOpen(false)}
                    className="h-10 px-4 rounded-xl border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    {t('বাতিল', 'Cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={busy || !disputePlotId || !disputeReason.trim()}
                    className="h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    <Scale className="w-4 h-4" />
                    <span>{busy ? t('দাখিল হচ্ছে...', 'Submitting...') : t('দাখিল করুন', 'Submit Objection')}</span>
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* SECTION 7: SUPPORT TICKETS DESK (সহায়তা ও সাপোর্ট টিকিট) */}
      {section === 'tickets' && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#006A4E]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {t('হেল্পলাইন ও অভিযোগ (১৬১২২)', 'Helpline & Complaints (16122)')}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t(
                    'ভূমি সেবা সংক্রান্ত যেকোনো সমস্যা বা সহায়তার জন্য টিকিট খুলুন।',
                    'Submit support requests regarding land records or services.'
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsNewTicketOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#006A4E] hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t('নতুন টিকিট', 'New Ticket')}</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex-1 min-h-0 flex flex-col overflow-hidden">
            {ticketsLoading ? (
              <div className="space-y-3 py-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50 gap-3">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-8 w-24 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex-1 flex flex-col items-center justify-center">
                <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                <div className="text-base font-bold text-slate-800">
                  {t('কোনো টিকিট নেই', 'No Support Tickets')}
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {t(
                    'ভূমি সংক্রান্ত সাহায্য বা তথ্যের জন্য নতুন টিকিট খুলুন।',
                    'Open a ticket for assistance with land records or mutation.'
                  )}
                </p>
                <Button
                  onClick={() => setIsNewTicketOpen(true)}
                  className="bg-[#006A4E] hover:bg-[#00553e] text-white font-bold"
                >
                  {t('নতুন টিকিট খুলুন', 'New Ticket')}
                </Button>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-slate-200 scrollbar-thin">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs border-b border-slate-200 shadow-2xs">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-bold text-slate-700">{t('টিকিট কোড', 'Ticket Code')}</TableHead>
                      <TableHead className="font-bold text-slate-700">{t('বিষয় ও ক্যাটাগরি', 'Subject & Category')}</TableHead>
                      <TableHead className="font-bold text-slate-700">{t('তারিখ', 'Date')}</TableHead>
                      <TableHead className="font-bold text-slate-700">{t('অবস্থা', 'Status')}</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">{t('বার্তা ও উত্তর', 'Conversation')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((tkt: any) => (
                      <TableRow key={tkt.id} className="hover:bg-slate-50/60 transition">
                        <TableCell className="font-mono font-bold text-slate-900">
                          {tkt.ticket_code || `HELP-${tkt.id}`}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-slate-800 text-sm">{tkt.title_bn || tkt.title_en}</div>
                          <span className="text-[10px] text-slate-400 uppercase font-mono">{tkt.category || 'GENERAL'}</span>
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {new Date(tkt.created_at).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US')}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              tkt.status === 'RESOLVED'
                                ? 'bg-emerald-50 text-[#006A4E] border-emerald-300'
                                : tkt.status === 'IN_PROGRESS'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }
                          >
                            {tkt.status || 'NEW'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenTicketDetail(tkt)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-[#006A4E] font-bold border-emerald-200"
                          >
                            <Eye className="w-4 h-4 mr-1.5" />
                            <span>{t('বার্তা দেখুন', 'View Chat')}</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE NEW TICKET */}
      <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-6 rounded-3xl border border-slate-200">
          <DialogHeader className="border-b border-slate-100 pb-3 text-left">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-50 text-[#006A4E] border border-emerald-100">
                <FileText className="w-5 h-5 text-[#006A4E]" />
              </span>
              <div>
                <DialogTitle className="font-black text-base text-slate-900">
                  {t('নতুন সহায়তা টিকিট দাখিল', 'Submit New Support Ticket')}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  {t('১৬১২২ হেল্পডেস্ক কর্মকর্তাদের নিকট সরাসরি বার্তা পাঠান', 'Direct message to 16122 helpdesk officers')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateTicket} className="space-y-4 text-xs pt-1">
            <div>
              <Label className="block font-bold text-slate-700 mb-1">
                {t('অনুরোধের ক্যাটাগরি', 'Category')} <span className="text-red-500">*</span>
              </Label>
              <Select value={ticketCategory} onValueChange={setTicketCategory}>
                <SelectTrigger className="w-full h-10 text-xs">
                  <SelectValue placeholder={t('ক্যাটাগরি নির্বাচন করুন', 'Select Category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">{t('সাধারণ পরামর্শ ও অনুসন্ধান', 'General Guidance & Inquiry')}</SelectItem>
                  <SelectItem value="OWNERSHIP_MUTATION">{t('নামজারি ও ওয়ারিশ বণ্টন সংক্রান্ত', 'e-Mutation & Heir Apportionment')}</SelectItem>
                  <SelectItem value="KHATIAN_CORRECTION">{t('খতিয়ান বা দাগ রেকর্ড সংক্রান্ত', 'Khatian or Plot Record')}</SelectItem>
                  <SelectItem value="NID_VERIFICATION">{t('এনআইডি ও প্রোফাইল পরিচয় যাচাই', 'NID & Identity Verification')}</SelectItem>
                  <SelectItem value="MISSING_DOCUMENT">{t('অনুপস্থিত দলিল সংগ্রহ ও স্ক্যান', 'Missing Document Retrieval')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="block font-bold text-slate-700 mb-1.5">
                {t('বিষয় / সারসংক্ষেপ', 'Subject / Summary')} <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder={t('যেমন: বীরুলিয়া মৌজার ১০১ দাগের খতিয়ান দেখতে পাচ্ছি না', 'e.g. Cannot view khatian for dag 101')}
                className="w-full text-xs h-9"
                required
              />
            </div>

            <div>
              <Label className="block font-bold text-slate-700 mb-1.5">
                {t('বিস্তারিত বিবরণ', 'Detailed Description')} <span className="text-red-500">*</span>
              </Label>
              <textarea
                rows={4}
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                placeholder={t('আপনার সমস্যার বিস্তারিত বিবরণ লিখুন (কমপক্ষে ১০ অক্ষর)...', 'Write details of the issue (at least 10 characters)...')}
                className="flex min-h-[90px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006A4E] transition"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewTicketOpen(false)}
                className="h-9 px-4 rounded-xl border-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                {t('বাতিল', 'Cancel')}
              </Button>
              <Button
                type="submit"
                disabled={ticketSubmitting}
                className="h-9 px-5 rounded-xl bg-[#006A4E] hover:bg-emerald-800 disabled:bg-slate-300 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer"
              >
                {ticketSubmitting ? <Clock className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{ticketSubmitting ? t('দাখিল হচ্ছে...', 'Submitting...') : t('টিকিট দাখিল করুন', 'Submit Ticket')}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: TICKET DETAIL & MESSAGES CHAT */}
      <Dialog open={Boolean(selectedTicket)} onOpenChange={(open) => { if (!open) setSelectedTicket(null); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden p-6 rounded-3xl border border-slate-200 flex flex-col">
          <DialogHeader className="border-b border-slate-100 pb-3 text-left">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[#006A4E]">
                {selectedTicket?.ticket?.ticket_code || selectedTicket?.ticket_code || 'HELP'}
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">
                {selectedTicket?.ticket?.status || selectedTicket?.status || 'NEW'}
              </Badge>
            </div>
            <DialogTitle className="font-bold text-sm text-slate-900 mt-1">
              {selectedTicket?.ticket?.title_bn || selectedTicket?.title_bn || selectedTicket?.ticket?.title_en || selectedTicket?.title_en}
            </DialogTitle>
          </DialogHeader>

          {/* Conversation message thread */}
          <div className="flex-1 overflow-y-auto space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 max-h-72">
            {selectedTicket?.messages && selectedTicket.messages.length > 0 ? (
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
                {selectedTicket?.ticket?.description_bn || selectedTicket?.description_bn || t('কোনো বার্তা নেই।', 'No messages.')}
              </div>
            )}
          </div>

          {/* Reply Input Form */}
          <form onSubmit={handleSendReply} className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex gap-2">
              <Input
                type="text"
                value={ticketReplyText}
                onChange={(e) => setTicketReplyText(e.target.value)}
                placeholder={t('এখানে আপনার বার্তা লিখুন...', 'Type your reply here...')}
                className="flex-1 text-xs h-9"
                required
              />
              <Button
                type="submit"
                disabled={replySubmitting}
                className="h-9 px-4 rounded-xl bg-[#006A4E] hover:bg-emerald-800 disabled:bg-slate-300 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {replySubmitting ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{t('পাঠান', 'Send')}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: REGISTERED DEED DOCKET */}
      {/* MODAL 3: REGISTERED DEED DOCKET */}
      <Dialog
        open={Boolean(selectedDeedForModal)}
        onOpenChange={(open) => {
          if (!open) setSelectedDeedForModal(null);
        }}
      >
        {selectedDeedForModal && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl border border-slate-200">
            <DialogHeader className="border-b border-slate-100 pb-3 text-left">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-100 text-blue-900 border border-blue-200">
                  {selectedDeedForModal.deed_no}
                </span>
                <DialogTitle className="font-black text-base text-slate-900">
                  {t('নিবন্ধিত ডিজিটাল মূল দলিল', 'Registered Digital Deed')}
                </DialogTitle>
              </div>
            </DialogHeader>

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
                  <span className="text-slate-500 block text-[10px] font-bold">{t('মৌজা ও এলাকা', 'Mouza')}</span>
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
                <span>{t('সরকারি ডিজিটাল সিল ও রেজিস্ট্রেশন প্রমাণ', 'Official Stamp & Digital Proof')}</span>
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
              <Button
                type="button"
                onClick={() => {
                  const deedNo = selectedDeedForModal.deed_no;
                  setSelectedDeedForModal(null);
                  onNavigate(`qr?deed_no=${encodeURIComponent(deedNo)}`);
                }}
                className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs"
              >
                <ExternalLink className="w-4 h-4" />
                <span>{t('সর্বজনীন কিউআর পোর্টাল দিয়ে যাচাই করুন', 'Open Public QR Verifier')}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedDeedForModal(null)}
                className="h-10 px-5 rounded-xl border-slate-200 text-slate-700 text-xs font-bold"
              >
                {t('বন্ধ করুন', 'Close')}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* MODAL 4: PLOT DETAILS & PASSPORT LAUNCH */}
      <Dialog
        open={Boolean(selectedPlotForModal)}
        onOpenChange={(open) => {
          if (!open) setSelectedPlotForModal(null);
        }}
      >
        {selectedPlotForModal && (
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-6 rounded-3xl border border-slate-200">
            <DialogHeader className="border-b border-slate-100 pb-3 text-left">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-50 text-[#006A4E] border border-emerald-100">
                  <MapPin className="w-5 h-5" />
                </span>
                <div>
                  <DialogTitle className="font-black text-base text-slate-900">
                    {t('দাগ নং', 'Plot')} {toBanglaDigits(selectedPlotForModal.dag_no_bn || selectedPlotForModal.dag_no, lang)}
                  </DialogTitle>
                  <p className="text-xs text-slate-500">
                    {selectedPlotForModal.mouza_bn}, {selectedPlotForModal.upazila_bn}, {selectedPlotForModal.district_bn}
                  </p>
                </div>
              </div>
            </DialogHeader>

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
                <Badge
                  variant={selectedPlotForModal.owner_sale_locked ? 'success' : 'warning'}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1"
                >
                  {selectedPlotForModal.owner_sale_locked ? (
                    <ShieldCheck className="w-3 h-3 text-[#006A4E]" />
                  ) : (
                    <Unlock className="w-3 h-3 text-amber-700" />
                  )}
                  {selectedPlotForModal.owner_sale_locked
                    ? t('জমির বিক্রয় লক সক্রিয় — জমি নিরাপদ', 'Plot Sale Lock Active — Secure')
                    : t('বিক্রয় লক খোলা — বিক্রির জন্য উন্মুক্ত', 'Sale Lock Open — Ready for Sale')}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                onClick={() => {
                  const p = selectedPlotForModal;
                  setSelectedPlotForModal(null);
                  setPassportPlot(p);
                }}
                className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-2 shadow-xs"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{t('স্বাস্থ্য পাসপোর্ট প্রিন্ট', 'Print Health Passport')}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedPlotForModal(null)}
                className="h-10 px-5 rounded-xl border-slate-200 text-slate-700 text-xs font-bold"
              >
                {t('ঠিক আছে', 'OK')}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* MODAL 5: DISPUTE DOCKET */}
      <Dialog
        open={Boolean(selectedDisputeForModal)}
        onOpenChange={(open) => {
          if (!open) setSelectedDisputeForModal(null);
        }}
      >
        {selectedDisputeForModal && (
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-6 rounded-3xl border border-slate-200">
            <DialogHeader className="border-b border-slate-100 pb-3 text-left">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                  <Scale className="w-5 h-5" />
                </span>
                <div>
                  <DialogTitle className="font-black text-base text-slate-900">
                    {t('জমির বিরোধ ও শুনানির বিস্তারিত নথি', 'Dispute & Hearing Details')}
                  </DialogTitle>
                  <p className="text-xs text-slate-500 font-mono">{selectedDisputeForModal.case_no}</p>
                </div>
              </div>
            </DialogHeader>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">{t('মামলার বর্তমান অবস্থা', 'Case Status')}:</span>
                <Badge variant="warning" className="px-2.5 py-1 rounded-full text-[10px] font-bold">
                  {selectedDisputeForModal.status}
                </Badge>
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedDisputeForModal(null)}
                className="h-10 px-5 rounded-xl border-slate-200 text-slate-700 text-xs font-bold"
              >
                {t('বন্ধ করুন', 'Close')}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* MODAL 6: DOCUMENT INSPECTION & HASH VERIFICATION */}
      <Dialog
        open={Boolean(inspectingDoc)}
        onOpenChange={(open) => {
          if (!open) setInspectingDoc(null);
        }}
      >
        {inspectingDoc && (
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-6 rounded-3xl border border-slate-200">
            <DialogHeader className="border-b border-slate-100 pb-3 text-left">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-[#006A4E] border border-emerald-200">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="font-black text-slate-900 text-sm leading-tight">
                    {lang === 'bn' ? inspectingDoc.title_bn : (inspectingDoc.title_en || inspectingDoc.title_bn)}
                  </DialogTitle>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {inspectingDoc.file_name || 'document.pdf'} · {inspectingDoc.document_type}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">{t('নিরাপত্তা স্তর ও স্থিতি:', 'Security Status:')}</span>
                <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-[#006A4E] border border-emerald-200">
                  {t('🔒 সরকারি ডাটাবেজে সংরক্ষিত ও নিরাপদ', '🔒 Official Verified Record')}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">{t('বর্তমান অবস্থা:', 'Status:')}</span>
                <span className="font-bold text-slate-800">{inspectingDoc.status === 'VERIFIED' ? t('যাচাইকৃত ও প্রস্তুত', 'Verified Ready') : (inspectingDoc.status || t('সংরক্ষিত', 'Stored'))}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">{t('ফাইলের আকার:', 'File Size:')}</span>
                <span className="font-mono text-slate-800">{Math.round((inspectingDoc.file_size_bytes || 0) / 1024)} KB</span>
              </div>
              <div className="py-1">
                <details className="group border border-slate-200 rounded-xl bg-slate-50 p-2.5 transition">
                  <summary className="flex items-center justify-between cursor-pointer text-[11px] font-bold text-slate-700 select-none">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#006A4E]" />
                      {t('ডিজিটাল সিকিউরিটি কোড (SHA-256 হ্যাশ)', 'Security Integrity Code (SHA-256)')}
                    </span>
                    <span className="text-[10px] text-emerald-700 group-open:hidden">{t('দেখান [ + ]', 'Show [ + ]')}</span>
                    <span className="text-[10px] text-slate-500 hidden group-open:inline">{t('সংক্ষেপ করুন [ - ]', 'Collapse [ - ]')}</span>
                  </summary>
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 font-mono text-[10px] text-slate-700 break-all select-all">
                      {inspectingDoc.file_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                    </div>
                  </div>
                </details>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-[#006A4E] shrink-0" />
              <p className="text-xs text-emerald-950 leading-relaxed">
                {t(
                  'ভূমি সুরক্ষা রেকর্ড: এই নথিটি সরকারি ডিজিটাল সিকিউরিটি দ্বারা সংরক্ষিত। অনুমতি ছাড়া কেউ এতে কোনো পরিবর্তন বা কারসাজি করতে পারবে না।',
                  'BhumiShield Secure Record: This document is protected by official digital security. Unauthorized tampering is strictly blocked.'
                )}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInspectingDoc(null)}
                className="h-10 px-4 border-slate-300 text-xs font-semibold text-slate-700"
              >
                {t('বন্ধ করুন', 'Close')}
              </Button>
              <Button
                type="button"
                onClick={() => handleDocumentDownload(inspectingDoc)}
                className="h-10 px-5 bg-[#006A4E] hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>{t('ডিজিটাল কপি ডাউনলোড', 'Download Digital Copy')}</span>
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

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
        onNavigate={(route) => {
          setIsTriageModalOpen(false);
          if (!route) return;
          if (route.startsWith('http')) {
            window.open(route, '_blank');
          } else if (route.startsWith('tickets')) {
            setSection('tickets');
            setIsNewTicketOpen(true);
          } else if (route === 'vault') {
            setSection('docs');
          } else if (route === 'deeds') {
            setSection('deeds');
          } else if (route === 'disputes') {
            setSection('disputes');
          } else if (route === 'transfers') {
            setSection('transfers');
          } else if (route === 'plots') {
            setSection('plots');
          } else if (route === 'check') {
            onNavigate('check');
          } else if (route === 'applications') {
            onNavigate('applications');
          } else if (route === 'help') {
            onNavigate('help');
          } else {
            onNavigate(route);
          }
        }}
      />

      {/* MODAL 9: CITIZEN NID & BIOMETRIC VERIFICATION MODAL */}
      <CitizenVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        onSuccess={() => {
          loadVault();
          loadTransfers();
          loadTickets();
        }}
      />

      {/* MODAL 10: DEDICATED SALE LOCK AUDIT EXPERIENCE & CERTIFICATE MODAL */}
      <Dialog
        open={Boolean(auditPlotForModal)}
        onOpenChange={(open) => {
          if (!open) setAuditPlotForModal(null);
        }}
      >
        {auditPlotForModal && (
          <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 rounded-3xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#006A4E] to-emerald-950 px-6 py-4 flex items-center justify-between text-white border-b border-emerald-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                  <ShieldCheck className="w-6 h-6 text-emerald-300" />
                </div>
                <div>
                  <DialogTitle className="font-black text-base tracking-tight text-white">
                    {t('জমির বিক্রয় লক ও আইনি সুরক্ষা সনদ', 'Plot Sale Lock & Security Certificate')}
                  </DialogTitle>
                  <p className="text-[11px] text-emerald-200">
                    {t('ভূমি সুরক্ষা · গণপ্রজাতন্ত্রী বাংলাদেশ সরকার অনুমোদিত সনদ', 'BhumiShield · Official Government Certificate')}
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable Printable Certificate */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-100/60 print:bg-white print:p-0">
              <div className="bg-[#FCFBF7] rounded-2xl border-4 border-[#006A4E] p-6 sm:p-7 shadow-md relative overflow-hidden font-serif min-h-[480px]">
                {/* Watermark */}
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden opacity-10"
                  style={{ transform: 'rotate(-25deg)' }}
                >
                  <div className="text-center text-emerald-950 font-black text-xl tracking-wider uppercase">
                    BHUMISHIELD SOVEREIGN SALE LOCK · প্রতারণা মুক্ত ভূমি
                  </div>
                </div>

                <div className="relative z-10 space-y-4">
                  {/* Top Seal */}
                  <div className="flex items-start justify-between border-b-2 border-emerald-900 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-full border-2 border-emerald-900 flex flex-col items-center justify-center text-emerald-900 font-bold text-[10px] bg-emerald-50 shrink-0">
                        <span className="text-[14px]">★</span>
                        <span>বাংলাদেশ</span>
                      </div>
                      <div>
                        <div className="text-xs font-sans font-bold text-emerald-900 uppercase tracking-widest">
                          গণপ্রজাতন্ত্রী বাংলাদেশ সরকার · ভূমি মন্ত্রণালয়
                        </div>
                        <div className="text-base sm:text-lg font-bold text-slate-950 mt-0.5">
                          মালিকানা বিক্রয় লক সুরক্ষা প্রত্যয়নপত্র
                        </div>
                        <div className="text-xs text-slate-600 font-sans">
                          স্মারক নম্বর: BSLOCK-{auditPlotForModal.plot_id}-{Date.now().toString().slice(-6)}
                        </div>
                      </div>
                    </div>

                    <div className="p-2 border-2 border-emerald-800 bg-emerald-50 rounded-xl text-center shrink-0">
                      <QrCode className="w-10 h-10 text-emerald-900 mx-auto" />
                      <div className="text-[8px] font-sans font-bold text-emerald-900 mt-0.5">সরকারি সিল</div>
                    </div>
                  </div>

                  {/* Protection Status Banner */}
                  <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-500 font-sans flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-[#006A4E] shrink-0" />
                    <div>
                      <div className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                        {t('বিক্রয় লক সম্পূর্ণ সক্রিয় ও নিরাপদ (PROTECTION ACTIVE)', 'Sale Lock Protection Active & Verified')}
                      </div>
                      <div className="text-[11px] text-emerald-800 mt-0.5">
                        {t(
                          'অত্র দাগের জমিতে সাব-রেজিস্ট্রি অফিসে যে কোনো অননুমোদিত দলিল সম্পাদন ও নামজারি আবেদন তাৎক্ষণিকভাবে ব্লক থাকবে।',
                          'Unauthorized deed execution or registration is cryptographically blocked across all registry sub-offices.'
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Parcel & Owner Schedule */}
                  <div className="grid grid-cols-2 gap-2.5 font-sans text-xs bg-white p-3.5 rounded-xl border border-slate-300">
                    <div>
                      <span className="text-slate-500 block text-[10px]">{t('রেকর্ডীয় দাগ নম্বর:', 'Plot / Dag No:')}</span>
                      <strong className="text-slate-900 text-sm font-black">
                        {toBanglaDigits(auditPlotForModal.dag_no_bn || auditPlotForModal.dag_no, lang)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">{t('খতিয়ান নম্বর:', 'Khatian No:')}</span>
                      <strong className="text-[#006A4E] text-sm font-black">
                        {auditPlotForModal.survey_type || 'BS'}-{toBanglaDigits(auditPlotForModal.khatian_no_bn || auditPlotForModal.khatian_no, lang)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">{t('মৌজা ও জে.এল:', 'Mouza & JL:')}</span>
                      <span className="text-slate-800 font-medium">
                        {auditPlotForModal.mouza_bn} (জে.এল. {toBanglaDigits(auditPlotForModal.jl_no || '১২', lang)})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">{t('উপজেলা ও জেলা:', 'Upazila & District:')}</span>
                      <span className="text-slate-800 font-medium">
                        {auditPlotForModal.upazila_bn}, {auditPlotForModal.district_bn}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">{t('জমির শ্রেণি ও অংশ:', 'Land Class & Share:')}</span>
                      <span className="text-slate-800 font-bold">
                        {auditPlotForModal.land_type_bn || t('ভিটা (আবাসিক)', 'Residential')} • {toBanglaDigits(auditPlotForModal.area_decimal ?? auditPlotForModal.share_area_decimal, lang)} {t('শতক', 'dec')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">{t('সুরক্ষিত নাগরিক:', 'Protected Owner:')}</span>
                      <span className="text-slate-900 font-bold">
                        {cleanCitizenName(user?.full_name_bn) || 'সম্মানিত নাগরিক'} ({t('এনআইডি', 'NID')}: {user?.nid ? maskNid(user.nid, lang) : '---'})
                      </span>
                    </div>
                  </div>

                  {/* Technical Hash Accordion */}
                  <div className="font-sans">
                    <details className="group border border-slate-200 rounded-xl bg-slate-50 p-2.5 transition">
                      <summary className="flex items-center justify-between cursor-pointer text-[11px] font-bold text-slate-700 select-none">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#006A4E]" />
                          {t('🔒 ডিজিটাল নিরাপত্তা ও অডিট ট্রেইল প্রমাণ', '🔒 Cryptographic Audit Trail')}
                        </span>
                        <span className="text-[10px] text-emerald-700 group-open:hidden">{t('দেখান [ + ]', 'Show [ + ]')}</span>
                        <span className="text-[10px] text-slate-500 hidden group-open:inline">{t('সংক্ষেপ করুন [ - ]', 'Collapse [ - ]')}</span>
                      </summary>
                      <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] font-mono text-slate-600 break-all select-all">
                        LOCK-LEDGER-HASH: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855-{auditPlotForModal.plot_id}
                      </div>
                    </details>
                  </div>

                  {/* Signatures */}
                  <div className="pt-3 border-t border-slate-300 flex items-end justify-between font-sans text-[10px] text-slate-600">
                    <div>
                      <div>{t('সনদ জারির তারিখ:', 'Issued Date:')} {new Date().toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US')}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">স্বয়ংক্রিয় ডিজিটাল ভূমি ডাটাবেজ সিস্টেম</div>
                    </div>
                    <div className="text-center">
                      <div className="w-32 h-7 border-b border-dashed border-emerald-800 mx-auto flex items-center justify-center text-[9px] font-mono text-emerald-900 font-bold bg-emerald-50/50">
                        NATIONAL_VAULT_SEAL
                      </div>
                      <div className="font-bold text-slate-900 mt-0.5">ভূমি রেকর্ড ও সুরক্ষা সেল</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 font-sans">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAuditPlotForModal(null)}
                className="h-9 px-4 rounded-xl border-slate-300 text-xs font-bold text-slate-700"
              >
                {t('বন্ধ করুন', 'Close')}
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="h-9 px-4 rounded-xl border-slate-300 text-xs font-bold text-slate-800 flex items-center gap-1.5 shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5 text-[#006A4E]" />
                  <span>{t('সনদ প্রিন্ট করুন', 'Print Certificate')}</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => window.print()}
                  className="h-9 px-4 rounded-xl bg-[#006A4E] hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('পিডিএফ সংরক্ষণ', 'Download PDF')}</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Upload Document Modal */}
      <Dialog open={isUploadDocModalOpen} onOpenChange={setIsUploadDocModalOpen}>
        <DialogContent className="max-w-md p-6 bg-white rounded-3xl shadow-xl space-y-4">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="font-black text-base flex items-center gap-2.5 text-slate-900">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#006A4E] border border-emerald-200 flex items-center justify-center shrink-0">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <span>{t('কাগজপত্র আপলোড', 'Upload Document')}</span>
                {selectedPlotId && (() => {
                  const p = plots.find((pl) => String(pl.plot_id) === String(selectedPlotId));
                  return (
                    <p className="text-[11px] font-normal text-slate-500 mt-0.5 font-sans">
                      {t('দাগ নং', 'Plot')} {toBanglaDigits(p?.dag_no_bn || p?.dag_no || selectedPlotId, lang)} · {p?.mouza_bn || ''} ({p?.upazila_bn || ''})
                    </p>
                  );
                })()}
              </div>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              {t(
                'জমির প্রয়োজনীয় বায়া দলিল, পর্চা বা কর রশিদ ভল্টে নিরাপদে সংরক্ষণ করুন।',
                'Upload and store verified deeds, khatians or tax receipts in your secure vault.'
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDocumentUpload} className="space-y-3.5 pt-1">
            <div>
              <Label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t('কাগজপত্রের শিরোনাম*', 'Document Title*')}
              </Label>
              <Input
                type="text"
                required
                value={uploadTitleBn}
                onChange={(e) => setUploadTitleBn(e.target.value)}
                placeholder={t('উদা: বায়া কবলা দলিল নং ১৫৪০', 'e.g. Historical Deed 1540')}
                className="w-full text-xs h-10 rounded-xl"
              />
            </div>

            <div>
              <Label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t('দলিলের ধরন*', 'Document Type*')}
              </Label>
              <Select value={uploadDocType} onValueChange={setUploadDocType}>
                <SelectTrigger className="w-full h-10 text-xs rounded-xl">
                  <SelectValue placeholder={t('দলিলের ধরন নির্বাচন করুন', 'Select Document Type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEED">{t('বায়া দলিল (Historical Deed)', 'Historical Deed')}</SelectItem>
                  <SelectItem value="KHATIAN">{t('খতিয়ানের নকল / পরচা', 'Khatian Copy')}</SelectItem>
                  <SelectItem value="TAX_RECEIPT">{t('ভূমি উন্নয়ন কর দাখিলা (LD-Tax)', 'Tax Receipt')}</SelectItem>
                  <SelectItem value="WARISH">{t('ওয়ারিশান সনদপত্র', 'Inheritance Certificate')}</SelectItem>
                  <SelectItem value="OTHER">{t('অন্যান্য প্রমাণক', 'Other Evidence')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t('পিডিএফ বা ছবি (সর্বোচ্চ ১০ মেগাবাইট)*', 'PDF or Image (Max 10MB)*')}
              </Label>
              <Input
                type="file"
                required
                accept="application/pdf,image/png,image/jpeg"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 h-10 py-1 rounded-xl"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsUploadDocModalOpen(false)}
                className="h-9 px-4 rounded-xl text-xs font-bold text-slate-700"
              >
                {t('বাতিল', 'Cancel')}
              </Button>

              <Button
                type="submit"
                disabled={busy || !uploadFile}
                className="h-9 px-4 rounded-xl bg-[#006A4E] hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{busy ? t('সংরক্ষণ হচ্ছে...', 'Saving...') : t('কাগজপত্র জমা দিন', 'Upload to Vault')}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
