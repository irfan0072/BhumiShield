import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import {
  LayoutDashboard,
  Layers,
  Lock,
  Unlock,
  FileText,
  Sparkles,
  AlertOctagon,
  Ticket,
  UserCheck,
  Search,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Clock,
  ShieldCheck,
  ArrowRight,
  Upload,
  FileCheck,
  RefreshCw,
  X,
  Printer,
  Building2,
  Phone,
  Mail,
  Eye,
  SlidersHorizontal,
  PlusCircle,
  Menu
} from 'lucide-react';
import { ProfileCompletionModal } from '../components/ProfileCompletionModal';

interface CitizenHomeProps {
  onNavigate: (tab: string) => void;
}

const TRANSFER_STAGES = [
  { id: 'START', labelBn: '১. প্রাথমিক প্রস্তুতি ও খসড়া', labelEn: '1. Start & Draft', steps: [1, 2, 3] },
  { id: 'VERIFY', labelBn: '২. স্বয়ংক্রিয় যাচাই ও কর', labelEn: '2. Verify & Fees', steps: [4, 5, 6] },
  { id: 'REGISTER', labelBn: '৩. সাব-রেজিস্ট্রি ও বায়োমেট্রিক', labelEn: '3. Registry & Biometrics', steps: [7, 8, 9] },
  { id: 'REVIEW', labelBn: '৪. এসি ল্যান্ড নামজারি', labelEn: '4. Mutation Review', steps: [10, 11] },
  { id: 'DONE', labelBn: '৫. সম্পন্ন ও ক্রিপ্টো সিল', labelEn: '5. Done & Sealed', steps: [12, 13] },
];

export const CitizenHome: React.FC<CitizenHomeProps> = ({ onNavigate }) => {
  const { lang, user, setUser, logout, t, formatNumber } = useAppUI();

  const [refreshingApprovalStatus, setRefreshingApprovalStatus] = useState<boolean>(false);
  const handleRefreshApprovalStatus = async () => {
    setRefreshingApprovalStatus(true);
    try {
      const res = await BhumiApi.getMe();
      if (res?.user) {
        setUser(res.user);
      }
    } catch {
      // ignore
    } finally {
      setRefreshingApprovalStatus(false);
    }
  };

  // Active navigation section state
  const [activeSection, setActiveSection] = useState<
    'overview' | 'plots' | 'docs' | 'deeds' | 'transfers' | 'disputes' | 'tickets' | 'profile'
  >(() => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/my/transfers')) return 'transfers';
    if (path.includes('/my/tickets')) return 'tickets';
    if (path.includes('/my/land') || path.includes('/vault')) return 'plots';
    return 'overview';
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Core Data States
  const [vault, setVault] = useState<any>(null);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [actionMsg, setActionMsg] = useState('');

  // NID Switcher State
  const [activeNid, setActiveNid] = useState<string>(user?.nid_mock || '9900001001');
  const [nidInput, setNidInput] = useState<string>(user?.nid_mock || '9900001001');

  // Filter States for Plots & Deeds
  const [plotSearchQuery, setPlotSearchQuery] = useState<string>('');
  const [plotFilterStatus, setPlotFilterStatus] = useState<'all' | 'locked' | 'unlocked'>('all');

  // Document Vault (L0-L3) State
  const [selectedPlotForDocs, setSelectedPlotForDocs] = useState<any | null>(null);
  const [plotDocsData, setPlotDocsData] = useState<any | null>(null);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(false);

  // 2-Tap Ticket State
  const [ticketModalDoc, setTicketModalDoc] = useState<any | null>(null);
  const [ticketNotes, setTicketNotes] = useState<string>('');
  const [submittingTicket, setSubmittingTicket] = useState<boolean>(false);
  const [ticketAlert, setTicketAlert] = useState<any | null>(null);

  // Upload L1 State
  const [uploadModalDoc, setUploadModalDoc] = useState<any | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [uploadNotes, setUploadNotes] = useState<string>('');
  const [submittingUpload, setSubmittingUpload] = useState<boolean>(false);

  // 13-Step Transfer State Machine State
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState<boolean>(false);
  const [advancingTransferCode, setAdvancingTransferCode] = useState<string | null>(null);
  const [creatingTransfer, setCreatingTransfer] = useState<boolean>(false);

  // Deed Proof Modal State
  const [selectedDeedModal, setSelectedDeedModal] = useState<any | null>(null);
  const [loadingDeedModal, setLoadingDeedModal] = useState<boolean>(false);

  // Citizen Dispute Form State
  const [disputePlotId, setDisputePlotId] = useState<number>(1);
  const [disputeType, setDisputeType] = useState('FORGERY_CLAIM');
  const [disputeDesc, setDisputeDesc] = useState(
    'আমার অজান্তে জাল আমমোক্তারনামা তৈরি করে এই দাগের জমি বিক্রির চেষ্টা চলছে।'
  );
  const [submittingDispute, setSubmittingDispute] = useState(false);

  // Load Transfers
  const loadTransfers = () => {
    setLoadingTransfers(true);
    BhumiApi.listTransfers()
      .then((res) => setTransfers(res.items || res || []))
      .catch(() => setTransfers([]))
      .finally(() => setLoadingTransfers(false));
  };

  // Load Tickets
  const loadTickets = () => {
    BhumiApi.listTickets()
      .then((res) => setTickets(res.items || []))
      .catch(() => setTickets([]));
  };

  // Load Plot Documents
  const loadPlotDocuments = async (plotCodeOrId: string | number) => {
    setLoadingDocs(true);
    try {
      const res = await BhumiApi.getPlotDocuments(plotCodeOrId);
      setPlotDocsData(res);
    } catch {
      setPlotDocsData(null);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Load All Citizen Data
  const loadCitizenData = (nidToUse = activeNid) => {
    setLoadingData(true);
    BhumiApi.getMyVault(nidToUse)
      .then((res) => {
        setVault(res);
        if (res.owned_plots && res.owned_plots.length > 0) {
          const firstPlot = res.owned_plots[0];
          setSelectedPlotForDocs(firstPlot);
          loadPlotDocuments(firstPlot.plot_code || firstPlot.plot_id);
        }
      })
      .catch(() => setVault({ found: false, person: null, owned_plots: [], deeds: [] }))
      .finally(() => setLoadingData(false));

    BhumiApi.listDisputes()
      .then((res) => setDisputes(res))
      .catch(() => {});

    BhumiApi.getPlots()
      .then((res) => {
        setPlots(res);
        if (res.length > 0 && !disputePlotId) setDisputePlotId(res[0].id);
      })
      .catch(() => {});

    BhumiApi.getStatsSummary()
      .then((res) => setStats(res))
      .catch(() => {});

    loadTransfers();
    loadTickets();
  };

  useEffect(() => {
    const targetNid = user?.nid_mock || '9900001001';
    setActiveNid(targetNid);
    setNidInput(targetNid);
    loadCitizenData(targetNid);
  }, [user]);

  const handleNidSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNid = nidInput.trim();
    if (!cleanNid) return;
    setActiveNid(cleanNid);
    loadCitizenData(cleanNid);
  };

  const handleSelectPresetNid = (presetNid: string) => {
    setNidInput(presetNid);
    setActiveNid(presetNid);
    loadCitizenData(presetNid);
  };

  const handleToggleLock = async (plotId: number) => {
    setActionMsg('');
    try {
      const res = await BhumiApi.togglePlotSaleLock(
        plotId,
        'নাগরিক পোর্টাল থেকে মালিক কর্তৃক বিক্রয় লক সক্রিয় করা হয়েছে'
      );
      setActionMsg(lang === 'bn' ? res.message_bn : res.message_en);
      loadCitizenData();
    } catch {
      setActionMsg(t('লক পরিবর্তন করতে সমস্যা হয়েছে।', 'Failed to toggle lock.'));
    }
  };

  const handleOpenDeedModal = async (deedNo: string) => {
    setLoadingDeedModal(true);
    try {
      const res = await BhumiApi.verifyDeedByCode(deedNo);
      setSelectedDeedModal(res);
    } catch {
      // fallback
    } finally {
      setLoadingDeedModal(false);
    }
  };

  const handleAdvanceTransfer = async (transferCode: string, nextStep: number) => {
    setAdvancingTransferCode(transferCode);
    try {
      await BhumiApi.advanceTransfer(transferCode, {
        step: nextStep,
        biometric_verified: true,
        liveness_passed: true,
      });
      loadTransfers();
    } catch (err: any) {
      const msg = err?.response?.data?.message_bn || err?.response?.data?.detail?.message_bn;
      alert(msg || t('ধাপ পরিবর্তন ব্যর্থ হয়েছে।', 'Failed to advance transfer step.'));
    } finally {
      setAdvancingTransferCode(null);
    }
  };

  const handleCreateNewTransfer = async (plotId: number) => {
    setCreatingTransfer(true);
    try {
      await BhumiApi.createTransfer({
        plot_id: plotId,
        transfer_area_decimal: 5.0,
        proposed_price_bdt: 850000,
        deed_type: 'SALE',
      });
      loadTransfers();
      setActiveSection('transfers');
      setActionMsg(t('নতুন স্থানান্তর আবেদন (ধাপ ১) সফলভাবে দাখিল করা হয়েছে!', 'New transfer case initialized at Step 1!'));
    } catch {
      alert(t('স্থানান্তর আবেদন তৈরি ব্যর্থ হয়েছে।', 'Failed to initialize transfer case.'));
    } finally {
      setCreatingTransfer(false);
    }
  };

  const handleFileDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDispute(true);
    setActionMsg('');
    try {
      const res = await BhumiApi.fileDispute({
        plot_id: disputePlotId,
        complainant_name_bn: user?.full_name_bn || vault?.person?.name_bn || 'মোঃ আব্দুর রহিম শেখ',
        complainant_nid: user?.nid_mock || activeNid || '9900001001',
        dispute_type: disputeType,
        description_bn: disputeDesc,
      });
      setActionMsg(lang === 'bn' ? res.message_bn : res.message_en);
      loadCitizenData();
    } catch {
      setActionMsg(t('অভিযোগ জমা দিতে সমস্যা হয়েছে।', 'Failed to file dispute.'));
    } finally {
      setSubmittingDispute(false);
    }
  };

  const handleConfirmTicket = async () => {
    if (!ticketModalDoc || !plotDocsData?.plot) return;
    setSubmittingTicket(true);
    try {
      const plotTarget = plotDocsData.plot.plot_code || plotDocsData.plot.id;
      const res = await BhumiApi.requestMissingDocument(plotTarget, {
        doc_type: ticketModalDoc.document_type,
        notes_bn: ticketNotes || undefined,
      });
      setTicketAlert(res);
      setTicketModalDoc(null);
      await loadPlotDocuments(plotTarget);
      loadTickets();
    } catch {
      alert(t('টিকেট তৈরিতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।', 'Failed to generate ticket. Please try again.'));
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!uploadModalDoc || !plotDocsData?.plot) return;
    setSubmittingUpload(true);
    try {
      const plotTarget = plotDocsData.plot.plot_code || plotDocsData.plot.id;
      await BhumiApi.uploadPlotDocument(plotTarget, {
        doc_type: uploadModalDoc.document_type,
        file_name: uploadFileName || 'citizen_declaration.pdf',
        notes_bn: uploadNotes || undefined,
      });
      setUploadModalDoc(null);
      await loadPlotDocuments(plotTarget);
      setActionMsg(t('দলিল সফলভাবে আপলোড ও হ্যাশ সংরক্ষিত হয়েছে।', 'Document uploaded successfully with hash stored.'));
    } catch {
      alert(t('দলিল আপলোড ব্যর্থ হয়েছে।', 'Failed to upload document.'));
    } finally {
      setSubmittingUpload(false);
    }
  };

  // Filtered plots
  const filteredPlots = (vault?.owned_plots || []).filter((p: any) => {
    const matchesSearch =
      plotSearchQuery === '' ||
      (p.dag_no && p.dag_no.toString().includes(plotSearchQuery)) ||
      (p.khatian_no && p.khatian_no.toString().includes(plotSearchQuery)) ||
      (p.mouza_bn && p.mouza_bn.includes(plotSearchQuery));

    if (plotFilterStatus === 'locked') return matchesSearch && Number(p.owner_sale_locked) === 1;
    if (plotFilterStatus === 'unlocked') return matchesSearch && Number(p.owner_sale_locked) === 0;
    return matchesSearch;
  });

  // Sidebar Menu Items
  const navMenuItems = [
    {
      id: 'overview' as const,
      labelBn: 'সারসংক্ষেপ ও পরিসংখ্যান',
      labelEn: 'Overview & KPIs',
      icon: <LayoutDashboard className="w-4 h-4" />,
      badge: null,
    },
    {
      id: 'plots' as const,
      labelBn: 'আমার জমি ও খতিয়ান ভল্ট',
      labelEn: 'My Land & Plots',
      icon: <Layers className="w-4 h-4" />,
      badge: vault?.owned_plots?.length ?? 0,
    },
    {
      id: 'docs' as const,
      labelBn: 'প্রামাণ্য সনদ ভল্ট (L0–L3)',
      labelEn: 'Document Vault (L0-L3)',
      icon: <ShieldCheck className="w-4 h-4" />,
      badge: plotDocsData?.verified_count ? `✔ ${plotDocsData.verified_count}` : null,
    },
    {
      id: 'deeds' as const,
      labelBn: 'নিবন্ধিত দলিল রেজিস্টার',
      labelEn: 'My Registered Deeds',
      icon: <FileText className="w-4 h-4" />,
      badge: vault?.deeds?.length ?? 0,
    },
    {
      id: 'transfers' as const,
      labelBn: '১৩-ধাপের হস্তান্তর ট্র্যাকার',
      labelEn: '13-Step Transfer Pipeline',
      icon: <Sparkles className="w-4 h-4" />,
      badge: transfers.length > 0 ? transfers.length : null,
    },
    {
      id: 'disputes' as const,
      labelBn: 'আপত্তি ও বিরোধ ট্রাইব্যুনাল',
      labelEn: 'Disputes & Objections',
      icon: <AlertOctagon className="w-4 h-4" />,
      badge: disputes.length > 0 ? disputes.length : null,
    },
    {
      id: 'tickets' as const,
      labelBn: 'সহায়তা টিকিট ও রেকর্ডরুম',
      labelEn: 'Support Tickets & Helpdesk',
      icon: <Ticket className="w-4 h-4" />,
      badge: tickets.length > 0 ? tickets.length : null,
    },
    {
      id: 'profile' as const,
      labelBn: 'প্রোফাইল ও এনআইডি সুইচ',
      labelEn: 'Profile & Demo Switcher',
      icon: <UserCheck className="w-4 h-4" />,
      badge: null,
    },
  ];

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-slate-50 flex flex-col md:flex-row text-slate-800">
      {/* =====================================================================
          1. INTEGRATED DASHBOARD SIDEBAR MENU (Left Column)
          ===================================================================== */}
      <aside
        className={`bg-white border-r border-slate-200 transition-all duration-300 flex flex-col justify-between shrink-0 z-30 ${
          sidebarCollapsed ? 'w-18' : 'w-72'
        } ${mobileSidebarOpen ? 'fixed inset-y-0 left-0 shadow-2xl block' : 'hidden md:flex'}`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Sidebar Header & Citizen Profile Chip */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#006A4E] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                  {vault?.person?.name_bn ? vault.person.name_bn[0] : 'না'}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black text-slate-900 truncate">
                    {lang === 'bn'
                      ? vault?.person?.name_bn || user?.full_name_bn || 'মোঃ রফিকুল ইসলাম'
                      : vault?.person?.name_en || user?.full_name_en || 'Md. Rafiqul Islam'}
                  </h3>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>NID: {vault?.person?.nid_mock ? `****${vault.person.nid_mock.slice(-4)}` : '****৫৮৯১'}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer hidden md:block"
              title={sidebarCollapsed ? t('মেনু প্রসারিত করুন', 'Expand Menu') : t('মেনু সংক্ষেপ করুন', 'Collapse Menu')}
            >
              {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>

            {/* Mobile close button */}
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 md:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 flex-1">
            <span className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block ${sidebarCollapsed ? 'hidden' : 'block'}`}>
              {t('নাগরিক সার্ভিস কনসোল', 'Citizen Services')}
            </span>

            {navMenuItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[42px] ${
                    isActive
                      ? 'bg-[#006A4E] text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-[#006A4E]'
                  }`}
                  title={lang === 'bn' ? item.labelBn : item.labelEn}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={isActive ? 'text-white' : 'text-[#006A4E]'}>{item.icon}</span>
                    {!sidebarCollapsed && <span className="truncate">{lang === 'bn' ? item.labelBn : item.labelEn}</span>}
                  </div>

                  {!sidebarCollapsed && item.badge !== null && item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {typeof item.badge === 'number' ? toBanglaDigits(item.badge, lang) : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Shortcuts & Hotline Card at Sidebar Footer */}
          {!sidebarCollapsed && (
            <div className="p-3 m-3 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-[#006A4E] font-bold">
                <Phone className="w-3.5 h-3.5 animate-pulse text-amber-500" />
                <span>{t('ভূমি সেবা হটলাইন: ১৬১২২', 'Land Hotline: 16122')}</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-tight">
                {t('দিন-রাত ২৪ ঘণ্টা যে কোনো ভূমি সেবা ও খতিয়ান সংক্রান্ত সহায়তার জন্য কল করুন।', 'Call toll-free for land and khatian inquiries.')}
              </p>
              <div className="pt-1 flex gap-1.5">
                <button
                  onClick={() => onNavigate('check')}
                  className="flex-1 py-1.5 px-2 bg-[#006A4E] text-white rounded-lg text-[10px] font-bold hover:bg-emerald-800 transition cursor-pointer text-center"
                >
                  {t('জমি যাচাই', 'Check Plot')}
                </button>
                <button
                  onClick={() => onNavigate('qr')}
                  className="flex-1 py-1.5 px-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-[10px] font-bold hover:bg-slate-50 transition cursor-pointer text-center"
                >
                  {t('QR দলিল', 'QR Deed')}
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* =====================================================================
          2. MAIN CONTENT PANE (Switching smoothly on the same screen)
          ===================================================================== */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
        {/* Top Breadcrumb & Action Header */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-lg border border-slate-200 md:hidden text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                <span>{t('নাগরিক পোর্টাল', 'Citizen Portal')}</span>
                <span>/</span>
                <span className="text-[#006A4E] font-bold">
                  {navMenuItems.find((m) => m.id === activeSection)?.labelBn}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                {lang === 'bn'
                  ? navMenuItems.find((m) => m.id === activeSection)?.labelBn
                  : navMenuItems.find((m) => m.id === activeSection)?.labelEn}
              </h2>
            </div>
          </div>

          {/* Citizen Identity & Verification Status Pill */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
              <ShieldCheck className="w-4 h-4 text-[#006A4E]" />
              <span className="font-bold">{user?.full_name_bn || 'নাগরিক সেবা প্রোফাইল'}</span>
              <span className="font-mono text-emerald-700 font-semibold">(NID: {activeNid ? `****${activeNid.slice(-4)}` : '****৫৮৯১'})</span>
            </div>

            <button
              onClick={() => loadCitizenData()}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition min-h-[38px] min-w-[38px] flex items-center justify-center"
              title={t('ডাটা রিফ্রেশ করুন', 'Refresh Data')}
            >
              <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin text-[#006A4E]' : ''}`} />
            </button>

            <button
              onClick={() => onNavigate('check')}
              className="px-3.5 py-2 bg-[#006A4E] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs min-h-[38px]"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{t('জমি যাচাই করুন', 'Check Before Buying')}</span>
            </button>
          </div>
        </div>

        {/* Global Action Message Banner */}
        {actionMsg && (
          <div className="mx-4 sm:mx-6 mt-4 p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-600 text-emerald-950 font-bold flex items-center justify-between text-xs animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#006A4E] shrink-0" />
              <span>{actionMsg}</span>
            </div>
            <button onClick={() => setActionMsg('')} className="text-slate-500 hover:text-slate-900 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* =====================================================================
            3. SECTION VIEWS (Rendered selectively based on activeSection)
            ===================================================================== */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Gated Pending Verification View for Self-Registered Citizens */}
          {user?.role === 'citizen' && Number(user?.is_identity_verified) === 0 ? (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-6 sm:p-10 shadow-lg text-amber-950 space-y-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-amber-200">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Clock className="w-8 h-8 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-200 text-amber-900 border border-amber-300">
                          {t('অ্যাকাউন্ট ভেরিফিকেশন পেন্ডিং', 'ACCOUNT VERIFICATION PENDING')}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          {t('সেবাসমূহ স্থগিত', 'Services Locked')}
                        </span>
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-black text-amber-950 tracking-tight">
                        {t('আপনার নাগরিক অ্যাকাউন্টটি সুপার অ্যাডমিনের অনুমোদনের অপেক্ষায় রয়েছে', 'Your Citizen Account is Pending Super Admin Approval')}
                      </h1>
                      <p className="text-xs sm:text-sm text-amber-900 leading-relaxed max-w-3xl font-medium">
                        {t(
                          'জাতীয় ভূমি সেবা ও ডিজিটাল ল্যান্ড ভল্টের সর্বোচ্চ নিরাপত্তা বিধানে নতুন নাগরিক অ্যাকাউন্টসমূহ কেন্দ্রীয় সুপার অ্যাডমিন কর্তৃক ম্যানুয়ালি যাচাই ও অনুমোদন করা হয়। অ্যাডমিন অনুমোদন সম্পন্ন করলে আপনার ড্যাশবোর্ড সেবাগুলো আনলক হবে।',
                          'To safeguard national land records, all self-registered citizen accounts are audited and verified by the Super Admin before property vault services are unlocked.'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
                    <button
                      onClick={handleRefreshApprovalStatus}
                      disabled={refreshingApprovalStatus}
                      className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshingApprovalStatus ? 'animate-spin' : ''}`} />
                      <span>{refreshingApprovalStatus ? t('যাচাই করা হচ্ছে...', 'Checking Status...') : t('স্ট্যাটাস রিফ্রেশ করুন', 'Refresh Approval Status')}</span>
                    </button>
                    <button
                      onClick={logout}
                      className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 font-bold text-xs transition cursor-pointer"
                    >
                      {t('লগআউট করুন', 'Sign Out')}
                    </button>
                  </div>
                </div>

                {/* Citizen Registration Summary Dossier */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs">
                    <span className="text-[11px] font-bold text-slate-400 block">{t('নাগরিকের নাম', 'Citizen Name')}</span>
                    <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">{user?.full_name_bn || 'নাগরিক'}</span>
                    <span className="text-[11px] text-slate-500 font-mono">{user?.full_name_en}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs">
                    <span className="text-[11px] font-bold text-slate-400 block">{t('ইউজারনেম', 'Username')}</span>
                    <span className="text-sm font-extrabold text-[#006A4E] font-mono mt-0.5 block">@{user?.username}</span>
                    <span className="text-[11px] text-slate-500">{t('নাগরিক আইডি', 'Citizen ID')}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs">
                    <span className="text-[11px] font-bold text-slate-400 block">{t('নিবন্ধিত মাধ্যম', 'Registration Channel')}</span>
                    <span className="text-sm font-extrabold text-slate-900 capitalize mt-0.5 flex items-center gap-1.5">
                      {user?.registration_channel === 'email' ? <Mail className="w-4 h-4 text-blue-600" /> : <Phone className="w-4 h-4 text-emerald-600" />}
                      {user?.registration_channel === 'email' ? t('ইমেইল (Email)', 'Email') : t('মোবাইল নম্বর (Phone)', 'Mobile')}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono truncate block">
                      {user?.registration_channel === 'email' ? user?.email : user?.phone_dummy}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs">
                    <span className="text-[11px] font-bold text-slate-400 block">{t('অনুমোদন স্থিতি', 'Approval State')}</span>
                    <span className="text-sm font-extrabold text-amber-700 mt-0.5 block">
                      {t('অপেক্ষমাণ (PENDING)', 'Pending Official Review')}
                    </span>
                    <span className="text-[11px] text-slate-500">{t('সুপার অ্যাডমিন পর্যালোচনায়', 'Under Super Admin Audit')}</span>
                  </div>
                </div>

                {/* Step-by-Step Guidance */}
                <div className="p-5 rounded-2xl bg-white/90 border border-amber-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                    <ShieldCheck className="w-5 h-5 text-[#006A4E]" />
                    <span>{t('অনুমোদনের পর পরবর্তী ধাপ কী?', 'What happens after Super Admin Approval?')}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                      <span className="font-bold text-amber-900 block mb-1">১. অ্যাডমিন ভেরিফিকেশন</span>
                      <p>সুপার অ্যাডমিন তাঁর অ্যাডমিন প্যানেল থেকে আপনার তথ্য যাচাই করে "অনুমোদন ও যাচাই" সম্পন্ন করবেন।</p>
                    </div>
                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                      <span className="font-bold text-amber-900 block mb-1">২. প্রোফাইল সম্পন্নকরণ পপ-আপ</span>
                      <p>অনুমোদনের পর আপনার স্ক্রিনে একটি ফর্ম আসবে যেখানে ছবি, অভিভাবকের নাম ও ঠিকানা প্রদান করতে হবে।</p>
                    </div>
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                      <span className="font-bold text-emerald-900 block mb-1">৩. পূর্ণ সেবা আনলক</span>
                      <p>প্রোফাইল সংরক্ষণের সাথে সাথেই আপনার ল্যান্ড ভল্ট, দাগ, খতিয়ান, নামজারি ও সকল সেবা চালু হবে।</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
          {/* VIEW 1: 📊 সারসংক্ষেপ ও পরিসংখ্যান (OVERVIEW) */}
          {activeSection === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Welcome Banner */}
              <div className="bg-gradient-to-r from-[#006A4E] via-[#075f24] to-[#0a481e] text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/60 border border-emerald-500/40 text-emerald-100 text-xs font-semibold">
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span>{t('জাতীয় পরিচয়পত্র যাচাইকৃত নাগরিক ভল্ট', 'NID-Verified Citizen Vault')}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    {t(
                      `স্বাগতম, ${vault?.person?.name_bn || user?.full_name_bn || 'মোঃ রফিকুল ইসলাম'}!`,
                      `Welcome, ${vault?.person?.name_en || user?.full_name_en || 'Md. Rafiqul Islam'}!`
                    )}
                  </h1>
                  <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed">
                    {t(
                      'আপনার বিএস খতিয়ানভুক্ত সকল দাগের মালিকানা, স্বত্বাধিকার দলিল, মালিকানা বিক্রয় লক ও হস্তান্তর অগ্রগতি এখন একক সুরক্ষিত কনসোলে সংরক্ষিত।',
                      'Your registered land parcels, cryptographic deeds, owner sale locks, and mutation transfers are fully secured.'
                    )}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  <button
                    onClick={() => setActiveSection('plots')}
                    className="px-4 py-2.5 rounded-xl bg-white text-[#006A4E] hover:bg-emerald-50 font-bold text-xs transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
                  >
                    <Layers className="w-4 h-4" />
                    <span>{t('আমার জমি দেখুন', 'View My Land')}</span>
                  </button>
                  <button
                    onClick={() => handleCreateNewTransfer(vault?.owned_plots?.[0]?.plot_id || 1)}
                    disabled={creatingTransfer}
                    className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-emerald-950 font-bold text-xs transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{creatingTransfer ? t('প্রস্তুত হচ্ছে...', 'Preparing...') : t('+ নতুন হস্তান্তর শুরু', '+ Start Transfer')}</span>
                  </button>
                </div>
              </div>

              {/* 4 Citizen Metric KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Owned Plots */}
                <div
                  onClick={() => setActiveSection('plots')}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-[#006A4E] hover:shadow-md transition cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      {t('মালিকানাধীন দাগ (বিএস)', 'MY PLOTS (BS)')}
                    </span>
                    <strong className="text-2xl font-black text-slate-900 mt-1 block">
                      {toBanglaDigits(vault?.owned_plots?.length ?? 0, lang)} টি দাগ
                    </strong>
                    <span className="text-xs text-[#006A4E] font-bold flex items-center gap-1 mt-1">
                      <span>{t('বিস্তারিত ভল্ট দেখুন', 'View in Vault')}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#006A4E] flex items-center justify-center shrink-0">
                    <Layers className="w-6 h-6" />
                  </div>
                </div>

                {/* 2. Sale Locked Plots */}
                <div
                  onClick={() => setActiveSection('plots')}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-400 hover:shadow-md transition cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      {t('বিক্রয় লক সুরক্ষিত', 'SALE-LOCKED')}
                    </span>
                    <strong className="text-2xl font-black text-rose-600 mt-1 block">
                      {toBanglaDigits(
                        vault?.owned_plots?.filter((p: any) => Number(p.owner_sale_locked) === 1).length ?? 0,
                        lang
                      )} টি সুরক্ষিত
                    </strong>
                    <span className="text-xs text-rose-700 font-semibold mt-1 block">
                      {t('🔒 জালিয়াতি প্রতিরোধে সক্রিয়', 'Fraud Protection Active')}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <Lock className="w-6 h-6" />
                  </div>
                </div>

                {/* 3. Registered Deeds */}
                <div
                  onClick={() => setActiveSection('deeds')}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      {t('রেজিস্ট্রিকৃত দলিল', 'LINKED DEEDS')}
                    </span>
                    <strong className="text-2xl font-black text-slate-900 mt-1 block">
                      {toBanglaDigits(vault?.deeds?.length ?? 0, lang)} টি দলিল
                    </strong>
                    <span className="text-xs text-amber-700 font-semibold mt-1 block">
                      {t('Ed25519 ক্রিপ্টো স্বাক্ষরিত', 'Ed25519 Verified')}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                </div>

                {/* 4. Active Transfers & Disputes */}
                <div
                  onClick={() => setActiveSection('transfers')}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      {t('চলমান হস্তান্তর প্রক্রিয়া', 'ACTIVE TRANSFERS')}
                    </span>
                    <strong className="text-2xl font-black text-slate-900 mt-1 block">
                      {toBanglaDigits(transfers.length, lang)} টি কেস
                    </strong>
                    <span className="text-xs text-indigo-700 font-semibold mt-1 block">
                      {t('১৩-ধাপের পাইপলাইনে', '13-Step Machine')}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* 2-Column Overview Summary: Quick Plots & Active Transfers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* My Plots Quick Preview */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-[#006A4E]" />
                      <h3 className="font-extrabold text-base text-slate-900">
                        {t('আমার জমি ও বিএস রেকর্ডসমূহ', 'My Land Parcels (BS Record)')}
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveSection('plots')}
                      className="text-xs font-bold text-[#006A4E] hover:underline"
                    >
                      {t('সবগুলো দেখুন →', 'View All →')}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(vault?.owned_plots || []).slice(0, 3).map((p: any, idx: number) => {
                      const isLocked = Number(p.owner_sale_locked) === 1;
                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            isLocked ? 'bg-rose-50/40 border-rose-200' : 'bg-slate-50/70 border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                              <span>
                                {p.mouza_bn} — দাগ {toBanglaDigits(p.dag_no, lang)}
                              </span>
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  isLocked ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-[#006A4E]'
                                }`}
                              >
                                {isLocked ? '🔒 লক সক্রিয়' : '🔓 উন্মুক্ত'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {t('খতিয়ান:', 'Khatian:')} {toBanglaDigits(p.khatian_no, lang)} • {t('পরিমাণ:', 'Area:')}{' '}
                              <strong>{toBanglaDigits(p.share_area_decimal, lang)} শতক</strong>
                            </div>
                          </div>

                          <button
                            onClick={() => handleToggleLock(p.plot_id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[36px] flex items-center gap-1 ${
                              isLocked
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-rose-600 hover:bg-rose-700 text-white'
                            }`}
                          >
                            {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            <span>{isLocked ? t('আনলক', 'Unlock') : t('লক করুন', 'Lock')}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Transfer Pipeline Quick Preview */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      <h3 className="font-extrabold text-base text-slate-900">
                        {t('হস্তান্তর ট্র্যাকার অগ্রগতি', 'Transfer Pipeline In-Progress')}
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveSection('transfers')}
                      className="text-xs font-bold text-[#006A4E] hover:underline"
                    >
                      {t('ট্র্যাকার খুলুন →', 'Open Tracker →')}
                    </button>
                  </div>

                  {transfers.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 space-y-2">
                      <Sparkles className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-xs font-semibold">{t('বর্তমানে কোনো হস্তান্তর আবেদন চলমান নেই।', 'No active transfers in progress.')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transfers.slice(0, 2).map((tr: any) => {
                        const currentStep = Number(tr.current_step || 1);
                        return (
                          <div key={tr.id} className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-200 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-black text-indigo-900">{tr.transfer_code}</span>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                                {tr.status}
                              </span>
                            </div>

                            <div className="text-xs text-slate-700">
                              <strong>{tr.mouza_bn}</strong> — দাগ {toBanglaDigits(tr.dag_no, lang)} ({toBanglaDigits(tr.transfer_area_decimal, lang)} শতক)
                            </div>

                            {/* Mini Progress Bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] font-bold text-slate-600">
                                <span>ধাপ {toBanglaDigits(currentStep, lang)} / ১৩</span>
                                <span>{Math.round((currentStep / 13) * 100)}% সম্পন্ন</span>
                              </div>
                              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-600 rounded-full transition-all"
                                  style={{ width: `${(currentStep / 13) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: 🏠 আমার জমি ও খতিয়ান ভল্ট (MY PLOTS) */}
          {activeSection === 'plots' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Search & Filter Controls */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={plotSearchQuery}
                    onChange={(e) => setPlotSearchQuery(e.target.value)}
                    placeholder={t('দাগ নং, খতিয়ান বা মৌজা দিয়ে খুঁজুন...', 'Filter by dag, khatian, or mouza...')}
                    className="w-full text-xs font-medium bg-transparent focus:outline-none"
                  />
                  {plotSearchQuery && (
                    <button onClick={() => setPlotSearchQuery('')} className="text-slate-400 hover:text-slate-700">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    onClick={() => setPlotFilterStatus('all')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                      plotFilterStatus === 'all' ? 'bg-[#006A4E] text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {t('সকল', 'All')}
                  </button>
                  <button
                    onClick={() => setPlotFilterStatus('locked')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                      plotFilterStatus === 'locked' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {t('🔒 বিক্রয় লককৃত', 'Sale Locked')}
                  </button>
                  <button
                    onClick={() => setPlotFilterStatus('unlocked')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                      plotFilterStatus === 'unlocked' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {t('🔓 উন্মুক্ত', 'Unlocked')}
                  </button>
                </div>
              </div>

              {/* Plots Grid */}
              {filteredPlots.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
                  <Layers className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="font-extrabold text-base text-slate-800">{t('কোনো জমি রেকর্ড পাওয়া যায়নি', 'No Plots Found')}</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {t('অনুসন্ধান ফিল্টারের সাথে কোনো দাগ মেলেনি। ফিল্টার রিসেট করে আবার চেষ্টা করুন।', 'No plots match the current filter.')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {filteredPlots.map((plot: any, idx: number) => {
                    const isLocked = Number(plot.owner_sale_locked) === 1;

                    return (
                      <div
                        key={idx}
                        className={`bg-white rounded-3xl border-2 transition-all p-6 space-y-4 shadow-xs ${
                          isLocked ? 'border-rose-300 ring-4 ring-rose-50/60' : 'border-slate-200 hover:border-[#006A4E]'
                        }`}
                      >
                        {/* Plot Card Header */}
                        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                          <div>
                            <span className="text-[11px] font-mono text-slate-500 block font-semibold">
                              {plot.plot_code || `PLT-DHK-SAV-00${plot.plot_id}`}
                            </span>
                            <h3 className="text-lg font-black text-slate-900 leading-tight">
                              দাগ {toBanglaDigits(plot.dag_no, lang)} — {plot.mouza_bn} মৌজা
                            </h3>
                            <span className="text-xs text-slate-500 font-medium">
                              {t('উপজেলা:', 'Upazila:')} সাভার • {t('জেলা:', 'District:')} ঢাকা
                            </span>
                          </div>

                          <div className="text-right">
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${
                                isLocked ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-[#006A4E]'
                              }`}
                            >
                              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                              <span>{isLocked ? t('🔒 বিক্রয় লক সক্রিয়', 'Sale Locked') : t('🔓 লেনদেন উন্মুক্ত', 'Unlocked')}</span>
                            </span>
                          </div>
                        </div>

                        {/* Plot Details Attributes Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                          <div>
                            <span className="text-slate-500 block text-[11px]">{t('বিএস খতিয়ান:', 'BS Khatian:')}</span>
                            <strong className="text-slate-900 font-bold">{toBanglaDigits(plot.khatian_no, lang)}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[11px]">{t('মালিকের অংশ (হিস্যা):', 'Share:')}</span>
                            <strong className="text-slate-900 font-bold">{toBanglaDigits(plot.share_fraction, lang)}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[11px]">{t('জমির পরিমাণ:', 'Area:')}</span>
                            <strong className="text-[#006A4E] font-black">{toBanglaDigits(plot.share_area_decimal, lang)} শতক</strong>
                          </div>
                        </div>

                        {/* Action Buttons Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                          <button
                            onClick={() => handleToggleLock(plot.plot_id)}
                            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs min-h-[38px] ${
                              isLocked
                                ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                                : 'bg-rose-600 hover:bg-rose-700 text-white'
                            }`}
                          >
                            {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            <span>{isLocked ? t('আনলক করুন', 'Unlock') : t('🔒 বিক্রয় লক', 'Lock Plot')}</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedPlotForDocs(plot);
                              loadPlotDocuments(plot.plot_code || plot.plot_id);
                              setActiveSection('docs');
                            }}
                            className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px]"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-[#006A4E]" />
                            <span>{t('সনদ ভল্ট (L0-L3)', 'Docs Vault')}</span>
                          </button>

                          <button
                            onClick={() => handleCreateNewTransfer(plot.plot_id)}
                            className="py-2 px-3 rounded-xl bg-[#006A4E] hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px]"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{t('হস্তান্তর শুরু', 'Transfer')}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: 📜 প্রামাণ্য সনদ ভল্ট (L0–L3 DOCUMENT VAULT) */}
          {activeSection === 'docs' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Plot Selector Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#006A4E]" />
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                      {t('প্রামাণ্য সনদ ও ডিজিটাল ভল্ট (L0–L3)', 'Property Document Vault (L0-L3 Trust Levels)')}
                    </h3>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {t('সরকারি ডাটাবেজ, ক্রিপ্টোগ্রাফিক হ্যাশ ও নাগরিক সংযুক্তির ভিত্তিতে শ্রেণিকৃত সনদ তালিকা', 'Verified checklist of required property deeds and mutation records')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-600">{t('দাগ নির্বাচন:', 'Select Plot:')}</label>
                  <select
                    value={selectedPlotForDocs?.plot_id || ''}
                    onChange={(e) => {
                      const p = (vault?.owned_plots || []).find((x: any) => x.plot_id === Number(e.target.value));
                      if (p) {
                        setSelectedPlotForDocs(p);
                        loadPlotDocuments(p.plot_code || p.plot_id);
                      }
                    }}
                    className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 cursor-pointer focus:ring-2 focus:ring-[#006A4E]"
                  >
                    {(vault?.owned_plots || []).map((p: any) => (
                      <option key={p.plot_id} value={p.plot_id}>
                        {p.mouza_bn} — দাগ {p.dag_no}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Trust Level Counts Banner */}
              {plotDocsData && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                    <span className="text-[10px] font-black uppercase text-emerald-800">L3 • অফিশিয়াল রেকর্ড</span>
                    <strong className="text-lg font-black text-[#006A4E] block mt-0.5">
                      {plotDocsData.items?.filter((d: any) => d.trust_level === 'L3').length || 0} টি
                    </strong>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-center">
                    <span className="text-[10px] font-black uppercase text-teal-800">L2 • সত্যায়িত অনুলিপি</span>
                    <strong className="text-lg font-black text-teal-700 block mt-0.5">
                      {plotDocsData.items?.filter((d: any) => d.trust_level === 'L2').length || 0} টি
                    </strong>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                    <span className="text-[10px] font-black uppercase text-amber-800">L1 • নাগরিক সংযুক্ত</span>
                    <strong className="text-lg font-black text-amber-700 block mt-0.5">
                      {plotDocsData.items?.filter((d: any) => d.trust_level === 'L1').length || 0} টি
                    </strong>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-center">
                    <span className="text-[10px] font-black uppercase text-rose-800">L0 • অনুপস্থিত রেকর্ড</span>
                    <strong className="text-lg font-black text-rose-600 block mt-0.5">
                      {plotDocsData.missing_count || 0} টি
                    </strong>
                  </div>
                </div>
              )}

              {/* Documents Checklist List */}
              {loadingDocs ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
                  <div className="w-8 h-8 border-4 border-[#006A4E] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-500">{t('সনদসমূহ যাচাই করা হচ্ছে...', 'Verifying records...')}</p>
                </div>
              ) : plotDocsData?.items ? (
                <div className="space-y-3">
                  {plotDocsData.items.map((doc: any, dIdx: number) => {
                    const isOfficial = doc.trust_level === 'L3';
                    const isVerified = doc.trust_level === 'L2';
                    const isCitizen = doc.trust_level === 'L1';
                    const isMissing = doc.trust_level === 'L0';

                    return (
                      <div
                        key={dIdx}
                        className={`p-4 rounded-2xl border transition-all ${
                          isOfficial
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : isVerified
                            ? 'bg-teal-50/40 border-teal-200'
                            : isCitizen
                            ? 'bg-amber-50/40 border-amber-200'
                            : 'bg-rose-50/60 border-rose-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-sm text-slate-900">
                                {lang === 'bn' ? doc.title_bn : doc.title_en}
                              </h4>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  doc.is_required ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {doc.is_required ? t('আবশ্যক', 'Required') : t('ঐচ্ছিক', 'Optional')}
                              </span>
                            </div>

                            {doc.file_name && (
                              <div className="text-[11px] text-slate-600 flex items-center gap-1 font-mono">
                                <FileCheck className="w-3.5 h-3.5 text-[#006A4E]" />
                                <span>{doc.file_name}</span>
                                {doc.file_hash && (
                                  <span className="text-[10px] text-slate-400">
                                    (SHA-256: {doc.file_hash.substring(0, 14)}...)
                                  </span>
                                )}
                              </div>
                            )}

                            {doc.verified_by && (
                              <div className="text-[11px] text-[#006A4E] font-medium">
                                {t('কর্তৃপক্ষ:', 'Authority:')} {doc.verified_by}
                              </div>
                            )}
                          </div>

                          {/* Trust Badge */}
                          <div className="flex items-center gap-2 shrink-0">
                            {isOfficial && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#006A4E] text-white">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>L3 • {t('সরকারি অফিশিয়াল', 'Official')}</span>
                              </span>
                            )}
                            {isVerified && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-teal-700 text-white">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>L2 • {t('সত্যায়িত অনুলিপি', 'Verified')}</span>
                              </span>
                            )}
                            {isCitizen && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-600 text-white">
                                <Upload className="w-3.5 h-3.5" />
                                <span>L1 • {t('নাগরিক-সংযুক্ত', 'Citizen Scan')}</span>
                              </span>
                            )}
                            {isMissing && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-600 text-white">
                                <AlertOctagon className="w-3.5 h-3.5" />
                                <span>L0 • {t('অনুপস্থিত', 'Missing')}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons if L0 Missing */}
                        {isMissing && (
                          <div className="mt-3 pt-3 border-t border-rose-200 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs text-rose-800 font-medium">
                              {t('অনুপস্থিত রেকর্ডের জন্য দ্রুত টিকেট ইস্যু বা স্ক্যান আপলোড করুন:', 'Request record search or upload your scan:')}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setUploadModalDoc(doc);
                                  setUploadFileName(`${doc.document_type.toLowerCase()}_scan.pdf`);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                              >
                                {t('অনুলিপি আপলোড', 'Upload Scan')}
                              </button>
                              <button
                                onClick={() => {
                                  setTicketModalDoc(doc);
                                  setTicketNotes('');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shadow-xs flex items-center gap-1"
                              >
                                <Ticket className="w-3.5 h-3.5" />
                                <span>{t('২-ট্যাপ টিকেট তৈরি', '2-Tap Ticket')}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}

          {/* VIEW 4: 📑 নিবন্ধিত দলিল রেজিস্টার (MY DEEDS) */}
          {activeSection === 'deeds' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                    {t('হ্যাশ লেজারে নিবন্ধিত দলিলের তালিকা', 'Registered Deeds in Hash Ledger')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t('Ed25519 ক্রিপ্টোগ্রাফিক অ্যালগরিদম দ্বারা সুরক্ষিত সাব-রেজিস্ট্রি দলিল', 'Cryptographically sealed and signed by Sub-Registrar')}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#006A4E] text-xs font-bold">
                  {vault?.deeds?.length || 0} টি দলিল প্রাপ্ত
                </span>
              </div>

              {vault?.deeds?.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="font-bold text-base text-slate-800">{t('কোনো নিবন্ধিত দলিল মেলেনি', 'No Deeds Found')}</h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {vault.deeds.map((d: any) => (
                    <div
                      key={d.id}
                      className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 hover:border-[#006A4E] shadow-xs transition"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#006A4E] flex items-center justify-center">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <strong className="text-sm font-black text-slate-900">{d.deed_no}</strong>
                            <span className="text-[11px] text-slate-500 block">
                              {d.mouza_bn} • দাগ {toBanglaDigits(d.dag_no, lang)}
                            </span>
                          </div>
                        </div>

                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#006A4E]">
                          {d.status || 'REGISTERED'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3 rounded-xl">
                        <div>
                          <span className="text-slate-500 block text-[11px]">{t('জমির পরিমাণ:', 'Area:')}</span>
                          <strong className="text-slate-900">{toBanglaDigits(d.area_decimal, lang)} শতক</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">{t('দলিল মূল্য:', 'Deed Value:')}</span>
                          <strong className="text-[#006A4E]">৳ {formatNumber(d.price_bdt || 4500000)}</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-500 font-mono">
                          Ed25519 Signed: <strong className="text-[#006A4E]">VALID</strong>
                        </span>

                        <button
                          onClick={() => handleOpenDeedModal(d.deed_no)}
                          className="px-3.5 py-2 rounded-xl bg-[#006A4E] hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>{t('QR কোড ও প্রমাণপত্র', 'View Deed QR & Proof')}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW 5: 🚀 ১৩-ধাপের হস্তান্তর ট্র্যাকার (TRANSFERS) */}
          {activeSection === 'transfers' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                    {t('জমির হস্তান্তর ও মালিকানা স্থানান্তর ট্র্যাকার (13-Step Transfer Machine)', 'Land Transfer & Ownership Mutation Tracker')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t('খসড়া আবেদন থেকে সাব-রেজিস্ট্রার বায়োমেট্রিক ও এসি ল্যান্ড নামজারি — ৫টি স্তর ও ১৩টি নিরাপত্তা চেক', '5 Citizen Stages & 13 State Machine Security Steps')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCreateNewTransfer(vault?.owned_plots?.[0]?.plot_id || 1)}
                    disabled={creatingTransfer}
                    className="px-3.5 py-2 bg-[#006A4E] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{creatingTransfer ? t('তৈরি হচ্ছে...', 'Creating...') : t('নতুন হস্তান্তর শুরু করুন', '+ New Transfer Intent')}</span>
                  </button>
                </div>
              </div>

              {transfers.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
                  <Sparkles className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="font-bold text-base text-slate-800">{t('কোনো সক্রিয় হস্তান্তর আবেদন নেই', 'No Active Transfers')}</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {t('উপরের "+ নতুন হস্তান্তর শুরু করুন" বোতামে ক্লিক করে নতুন হস্তান্তর আবেদন দাখিল করুন।', 'Click above to create a new transfer case.')}
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {transfers.map((tr: any) => {
                    const currentStep = Number(tr.current_step || 1);
                    const hasBiometric = currentStep >= 8;

                    return (
                      <div key={tr.id} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <strong className="font-mono text-base font-black text-[#006A4E]">{tr.transfer_code}</strong>
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#006A4E] text-white">
                                {tr.status}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">
                                {tr.deed_type || 'SALE'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-700 mt-1">
                              <strong>{tr.mouza_bn} মৌজা</strong> • দাগ নং: {toBanglaDigits(tr.dag_no, lang)} • {toBanglaDigits(tr.transfer_area_decimal, lang)} শতক • ৳ {formatNumber(tr.proposed_price_bdt || 850000)}
                            </div>
                          </div>

                          {currentStep < 13 && (
                            <button
                              onClick={() => handleAdvanceTransfer(tr.transfer_code, currentStep + 1)}
                              disabled={advancingTransferCode === tr.transfer_code}
                              className="px-4 py-2 bg-[#006A4E] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs min-h-[38px]"
                            >
                              {advancingTransferCode === tr.transfer_code ? (
                                <span>{t('অগ্রগতি হচ্ছে...', 'Advancing...')}</span>
                              ) : (
                                <>
                                  <span>{t(`পরবর্তী ধাপে অগ্রগতি (ধাপ ${toBanglaDigits(currentStep + 1, lang)})`, `Advance to Step ${currentStep + 1}`)}</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {/* 5-Stage Stepper Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {TRANSFER_STAGES.map((stg, sIdx) => {
                            const isComplete = currentStep > Math.max(...stg.steps);
                            const isActive = stg.steps.includes(currentStep);

                            return (
                              <div
                                key={sIdx}
                                className={`p-3 rounded-2xl border text-center transition-all ${
                                  isComplete
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                    : isActive
                                    ? 'bg-white border-[#006A4E] text-[#006A4E] font-black ring-2 ring-[#006A4E]/30 shadow-xs'
                                    : 'bg-slate-50 border-slate-200 text-slate-400'
                                }`}
                              >
                                <div className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                                  {isComplete && <CheckCircle2 className="w-3.5 h-3.5 text-[#006A4E]" />}
                                  {isActive && <span className="w-2 h-2 rounded-full bg-[#006A4E] animate-ping inline-block" />}
                                  <span>Stage {sIdx + 1}</span>
                                </div>
                                <div className="text-xs truncate">{lang === 'bn' ? stg.labelBn : stg.labelEn}</div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Step Details & Biometrics */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="text-slate-500 block text-[11px] font-semibold">{t('বর্তমান সক্রিয় ধাপ:', 'Current Step:')}</span>
                            <strong className="text-sm text-[#006A4E]">
                              {t(`ধাপ ${toBanglaDigits(currentStep, lang)} / ১৩:`, `Step ${currentStep} of 13:`)}{' '}
                              {lang === 'bn' ? tr.step_name_bn : tr.step_name_en}
                            </strong>
                          </div>

                          <div>
                            {hasBiometric ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                                <ShieldCheck className="w-4 h-4 text-[#006A4E]" />
                                <span>{t('✔ কাউন্টার বায়োমেট্রিক ও ফেস লাইভনেস: যাচাইকৃত (Passed)', 'Biometrics: Verified')}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs">
                                <Clock className="w-4 h-4 text-amber-700" />
                                <span>{t('কাউন্টার বায়োমেট্রিক: রেজিস্ট্রেশন ধাপে (ধাপ ৮) যাচাই করা হবে', 'Biometrics: Scheduled Step 8')}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW 6: ⚖️ আপত্তি ও বিরোধ ট্রাইব্যুনাল (DISPUTES) */}
          {activeSection === 'disputes' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
              {/* Objection Form (6 cols) */}
              <form onSubmit={handleFileDispute} className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <AlertOctagon className="w-5 h-5 text-rose-600" />
                  <h3 className="font-extrabold text-base text-slate-900">
                    {t('জালিয়াতি বা ওয়ারিশ বঞ্চনার আপত্তি দাখিল', 'File Land Fraud / Ownership Objection')}
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t(
                    'কোনো দাগে জাল দলিল বা ওয়ারিশ বাদ দিয়ে বিক্রির চেষ্টা হলে তাৎক্ষণিক আপত্তি দিন। এটি সাব-রেজিস্ট্রার ও এসি ল্যান্ড প্যানেলে লাল সতর্কতা জারি করবে।',
                    'Filing an objection flags the plot across Sub-Registrar and AC Land consoles.'
                  )}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {t('সংশ্লিষ্ট দাগ নির্বাচন:', 'Select Plot (Dag):')}
                    </label>
                    <select
                      value={disputePlotId}
                      onChange={(e) => setDisputePlotId(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#006A4E] cursor-pointer"
                    >
                      {plots.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.mouza_bn} — দাগ নং {p.dag_no}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {t('অভিযোগের ধরন:', 'Objection Category:')}
                    </label>
                    <select
                      value={disputeType}
                      onChange={(e) => setDisputeType(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#006A4E] cursor-pointer"
                    >
                      <option value="FORGERY_CLAIM">{t('জাল দলিল / ভুয়া আমমোক্তারনামা', 'Fake Deed / Forged POA')}</option>
                      <option value="INHERITANCE_EXCLUSION">{t('ওয়ারিশ বঞ্চিত করে বিক্রির চেষ্টা', 'Heir Exclusion Dispute')}</option>
                      <option value="COURT_INJUNCTION">{t('আদালতের নিষেধাজ্ঞা / দেওয়ানি মামলা', 'Court Injunction')}</option>
                      <option value="BOUNDARY_GRAB">{t('সীমানা বা অতিরিক্ত অংশ দখল', 'Boundary Grab')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t('অভিযোগের বিস্তারিত বিবরণ:', 'Objection Details:')}
                  </label>
                  <textarea
                    value={disputeDesc}
                    onChange={(e) => setDisputeDesc(e.target.value)}
                    rows={3}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#006A4E]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingDispute}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs min-h-[44px]"
                >
                  <AlertOctagon className="w-4 h-4" />
                  <span>{submittingDispute ? t('দাখিল হচ্ছে...', 'Submitting...') : t('আপত্তি ও অভিযোগ নিবন্ধন করুন', 'Submit Official Objection')}</span>
                </button>
              </form>

              {/* Filed Objections List (6 cols) */}
              <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-base text-slate-900">
                    {t('দাখিলকৃত আপত্তি ও ট্রাইব্যুনাল স্ট্যাটাস', 'Filed Objections & Status')}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                    {disputes.length} টি রেকর্ড
                  </span>
                </div>

                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {disputes.map((dsp) => (
                    <div
                      key={dsp.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        dsp.status === 'OPEN'
                          ? 'bg-amber-50/50 border-amber-300'
                          : dsp.status === 'UPHELD_FROZEN'
                          ? 'bg-rose-50/50 border-rose-300'
                          : 'bg-emerald-50/50 border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">
                          {dsp.mouza_bn} — দাগ {dsp.dag_no} ({dsp.dispute_type})
                        </span>
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                            dsp.status === 'OPEN'
                              ? 'bg-amber-500 text-white'
                              : dsp.status === 'UPHELD_FROZEN'
                              ? 'bg-rose-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {dsp.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">{dsp.description_bn}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 7: 🎫 সহায়তা টিকেট ও রেকর্ডরুম ট্র্যাকিং (TICKETS) */}
          {activeSection === 'tickets' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                    {t('আমার সহায়তা টিকিট ও রেকর্ডরুম ট্র্যাকিং', 'Support Tickets & Recordroom Tracking')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t('অনুপস্থিত দলিল সংগ্রহ ও রেকর্ড সংশোধনের জন্য ইস্যুকৃত টিকেটসমূহের লাইভ স্ট্যাটাস', 'Live SLA tracking of requested document searches')}
                  </p>
                </div>
                <button
                  onClick={loadTickets}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {tickets.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
                  <Ticket className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="font-bold text-base text-slate-800">{t('কোনো সক্রিয় সহায়তা টিকিট নেই', 'No Active Tickets')}</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {t('প্রামাণ্য সনদ ভল্টে কোনো দলিল অনুপস্থিত থাকলে "২-ট্যাপ টিকেট তৈরি" করে সরাসরি রেকর্ডরুমে অনুসন্ধানের অনুরোধ জানাতে পারেন।', 'Generate a 2-tap ticket from the Document Vault to request missing records.')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tickets.map((tkt: any) => (
                    <div key={tkt.id} className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <span className="font-mono text-xs font-black text-[#006A4E]">{tkt.ticket_code}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                          {tkt.status || 'NEW'}
                        </span>
                      </div>

                      <h4 className="font-bold text-xs text-slate-900">{tkt.title_bn}</h4>
                      <p className="text-xs text-slate-500">{tkt.description_bn}</p>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 font-mono">
                        <span>Category: {tkt.category}</span>
                        <span>Priority: <strong>{tkt.priority || 'HIGH'}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW 8: 👤 নাগরিক প্রোফাইল ও এনআইডি সুইচ (PROFILE & DEMO SWITCHER) */}
          {activeSection === 'profile' && (
            <div className="max-w-3xl space-y-6 animate-fadeIn">
              {/* Citizen Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#006A4E] text-white flex items-center justify-center font-black text-2xl shadow-sm">
                    {vault?.person?.name_bn ? vault.person.name_bn[0] : 'না'}
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#006A4E] text-[11px] font-bold mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t('জাতীয় পরিচয়পত্র যাচাইকৃত নাগরিক (EC Verified)', 'NID Verified Citizen')}</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900">
                      {vault?.person?.name_bn || user?.full_name_bn || 'মোঃ রফিকুল ইসলাম'}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      {vault?.person?.name_en || user?.full_name_en || 'Md. Rafiqul Islam'} • NID: {activeNid}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-slate-500 block">{t('মোবাইল নম্বর (ওটিপি সংযুক্ত):', 'Mobile Number:')}</span>
                    <strong className="text-slate-900 font-mono">০১৭****৫৮৯১</strong>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-slate-500 block">{t('স্থায়ী ঠিকানা:', 'Permanent Address:')}</span>
                    <strong className="text-slate-900">বিরুলিয়া, সাভার, ঢাকা</strong>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-slate-500 block">{t('নিরাপত্তা প্রমাণীকরণ:', 'Auth Protocol:')}</span>
                    <strong className="text-slate-900 font-mono">Laravel Sanctum + Ed25519 Token</strong>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-slate-500 block">{t('ভল্টে মালিকানাধীন দাগ:', 'Vault Plots:')}</span>
                    <strong className="text-[#006A4E]">{vault?.owned_plots?.length || 0} টি রেকর্ড</strong>
                  </div>
                </div>
              </div>

              {/* Official Citizen Identity & Land Holding Verification Docket */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-[#006A4E]" />
                    <h4 className="font-extrabold text-sm text-slate-900">
                      {t('জাতীয় স্মার্ট কার্ড ও নাগরিক ভূমি হোল্ডিং ভেরিফিকেশন', 'National Smart Card & Land Holding Verification')}
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-[#006A4E] border border-emerald-200 flex items-center gap-1.5 self-start sm:self-auto">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{t('এনআইডি সার্ভার: সংযুক্ত ও সক্রিয়', 'NID Server: Connected & Active')}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t(
                    'বাংলাদেশ নির্বাচন কমিশন (EC) স্মার্ট এনআইডি ডাটাবেজ ও জাতীয় ভূমি ব্যবস্থাপনা নেটওয়ার্ক। যেকোনো নিবন্ধিত এনআইডি নম্বর অনুসন্ধান করে নাগরিকের ডিজিটাল খতিয়ান, মালিকানাধীন দাগ ও বিক্রয় সুরক্ষার অবস্থা যাচাই করুন:',
                    'Bangladesh Election Commission Smart NID Database & National Land Network. Search verified citizen NID to inspect official khatian records, owned plots, and protection status:'
                  )}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => handleSelectPresetNid('9900001001')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      activeNid === '9900001001'
                        ? 'border-[#006A4E] bg-emerald-50/70 ring-2 ring-[#006A4E]/30'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <strong className="block text-xs font-bold text-slate-900">মোঃ রফিকুল ইসলাম</strong>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">যাচাইকৃত</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-600 block mt-1">NID: 9900001001</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">দাগ ১০১ • বিরুলিয়া • নিষ্কণ্টক রেকর্ড</span>
                  </button>

                  <button
                    onClick={() => handleSelectPresetNid('9900001002')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      activeNid === '9900001002'
                        ? 'border-[#006A4E] bg-emerald-50/70 ring-2 ring-[#006A4E]/30'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <strong className="block text-xs font-bold text-slate-900">মোসাঃ রাবেয়া খাতুন</strong>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">লক সক্রিয়</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-600 block mt-1">NID: 9900001002</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">দাগ ১০২ • বিরুলিয়া • বিক্রয় লক সক্রিয়</span>
                  </button>

                  <button
                    onClick={() => handleSelectPresetNid('9900001003')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      activeNid === '9900001003'
                        ? 'border-[#006A4E] bg-emerald-50/70 ring-2 ring-[#006A4E]/30'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <strong className="block text-xs font-bold text-slate-900">মোঃ আব্দুল করিম</strong>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">ব্যাংক বন্ধক</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-600 block mt-1">NID: 9900001003</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">দাগ ১০৩ • বিরুলিয়া • ব্যাংক বন্ধকযুক্ত</span>
                  </button>
                </div>

                {/* Direct NID Search Input */}
                <form onSubmit={handleNidSearch} className="flex flex-col sm:flex-row gap-2 pt-2">
                  <input
                    type="text"
                    value={nidInput}
                    onChange={(e) => setNidInput(e.target.value)}
                    placeholder={t('নাগরিকের ১০-১৭ ডিজিট জাতীয় পরিচয়পত্র (NID) নম্বর লিখুন...', 'Enter 10-17 digit Citizen NID...')}
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#006A4E]"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#006A4E] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{t('হোল্ডিং অনুসন্ধান করুন', 'Search Land Holdings')}</span>
                  </button>
                </form>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </main>

      {/* =====================================================================
          4. INTERACTIVE MODALS
          ===================================================================== */}

      {/* Deed Proof & QR Modal */}
      {(selectedDeedModal || loadingDeedModal) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto relative animate-fadeIn">
            <button
              onClick={() => setSelectedDeedModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {loadingDeedModal ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-[#006A4E] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-500">{t('দলিল রেকর্ড লোড হচ্ছে...', 'Loading deed proof...')}</p>
              </div>
            ) : selectedDeedModal ? (
              <>
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#006A4E] text-white flex items-center justify-center font-black">
                    দলিল
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                      <span>{selectedDeedModal.deed?.deed_no}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                        ✔ VERIFIED & SEALED
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      {t('সাব-রেজিস্ট্রি রেকর্ড ও ক্রিপ্টোগ্রাফিক সনদপত্র', 'Sub-Registry Record & Cryptographic Certificate')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200">
                    {selectedDeedModal.qr_data_uri ? (
                      <img src={selectedDeedModal.qr_data_uri} alt="Deed QR" className="w-36 h-36 object-contain" />
                    ) : (
                      <QrCode className="w-28 h-28 text-[#006A4E]" />
                    )}
                    <span className="text-[10px] font-mono text-slate-400 mt-1">Ed25519 Signed QR</span>
                  </div>

                  <div className="sm:col-span-7 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 block text-[11px]">{t('মৌজা:', 'Mouza:')}</span>
                        <strong className="text-slate-900">{selectedDeedModal.deed?.mouza_bn}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">{t('দাগ নং:', 'Dag No:')}</span>
                        <strong className="text-slate-900">{toBanglaDigits(selectedDeedModal.deed?.dag_no, lang)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">{t('জমির পরিমাণ:', 'Area:')}</span>
                        <strong className="text-slate-900">{toBanglaDigits(selectedDeedModal.deed?.area_decimal, lang)} শতক</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">{t('স্ট্যাটাস:', 'Status:')}</span>
                        <span className="text-emerald-700 font-bold">{selectedDeedModal.deed?.status}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-900 text-slate-200 rounded-2xl text-xs space-y-1 font-mono">
                  <div className="text-emerald-400 text-[10px] uppercase font-bold">Cryptographic Ledger Proof</div>
                  <div className="truncate text-slate-300">Hash: {selectedDeedModal.cryptographic_proof?.stored_content_hash}</div>
                  <div className="truncate text-slate-400">Ed25519 Signature: VALID</div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{t('প্রিন্ট সনদ', 'Print Certificate')}</span>
                  </button>

                  <button
                    onClick={() => setSelectedDeedModal(null)}
                    className="px-4 py-2 bg-[#006A4E] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    {t('বন্ধ করুন', 'Close')}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* 2-Tap Ticket Modal */}
      {ticketModalDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-rose-600" />
                <h3 className="font-extrabold text-base text-slate-900">{t('২-ট্যাপ টিকেট তৈরি', '2-Tap Ticket Request')}</h3>
              </div>
              <button onClick={() => setTicketModalDoc(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {t(
                `দাগ নং ${plotDocsData?.plot?.dag_no_bn || ''}-এর জন্য অনুপস্থিত "${ticketModalDoc.title_bn}" দলিলটি রেকর্ডরুম হতে অনুসন্ধান ও স্ক্যানের অনুরোধ দাখিল করা হবে।`,
                `Request recordroom retrieval for missing document.`
              )}
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">{t('মন্তব্য / অতিরিক্ত বিবরণ (ঐচ্ছিক):', 'Notes (Optional):')}</label>
              <textarea
                value={ticketNotes}
                onChange={(e) => setTicketNotes(e.target.value)}
                placeholder={t('কোনো বিশেষ খতিয়ান বা দলিলের সূত্র থাকলে লিখুন...', 'Additional details...')}
                rows={2}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#006A4E]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setTicketModalDoc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                {t('বাতিল', 'Cancel')}
              </button>
              <button
                onClick={handleConfirmTicket}
                disabled={submittingTicket}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Ticket className="w-4 h-4" />
                <span>{submittingTicket ? t('ইস্যু হচ্ছে...', 'Submitting...') : t('টিকেট নিশ্চিত করুন', 'Confirm Ticket')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload L1 Document Modal */}
      {uploadModalDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#006A4E]" />
                <h3 className="font-extrabold text-base text-slate-900">{t('অনুলিপি স্ক্যান আপলোড (L1)', 'Upload Scan (L1)')}</h3>
              </div>
              <button onClick={() => setUploadModalDoc(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {t(
                `"${uploadModalDoc.title_bn}" দলিলের স্ক্যান আপলোড করে ক্রিপ্টোগ্রাফিক হ্যাশ তৈরি করা হবে।`,
                `Upload document copy to generate cryptographic hash.`
              )}
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">{t('ফাইলের নাম:', 'File Name:')}</label>
              <input
                type="text"
                value={uploadFileName}
                onChange={(e) => setUploadFileName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">{t('মন্তব্য / সূত্র:', 'Notes:')}</label>
              <textarea
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                rows={2}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setUploadModalDoc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                {t('বাতিল', 'Cancel')}
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={submittingUpload}
                className="px-4 py-2 bg-[#006A4E] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Upload className="w-4 h-4" />
                <span>{submittingUpload ? t('আপলোড হচ্ছে...', 'Uploading...') : t('আপলোড সম্পন্ন করুন', 'Complete Upload')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Post-Approval Citizen Profile Completion Modal */}
      {user?.role === 'citizen' && Number(user?.is_identity_verified) === 1 && Number(user?.is_profile_complete) === 0 && (
        <ProfileCompletionModal
          isOpen={true}
          user={user}
          onComplete={(updatedUser) => {
            setUser(updatedUser);
            loadCitizenData();
            setActionMsg(
              lang === 'bn'
                ? 'আপনার প্রোফাইল সফলভাবে সম্পূর্ণ হয়েছে! সকল সেবা এখন সক্রিয়।'
                : 'Profile completed successfully! All services are now fully active.'
            );
          }}
        />
      )}
    </div>
  );
};

export default CitizenHome;
