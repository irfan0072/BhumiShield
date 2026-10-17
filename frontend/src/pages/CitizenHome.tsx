import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import {
  CheckCircle2,
  FileText,
  Lock,
  Unlock,
  AlertOctagon,
  Send,
  QrCode,
  Search,
  X,
  Printer,
  UserCheck,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldCheck,
  ArrowRight,
  Upload,
  Ticket,
  FileCheck,
  RefreshCw,
  Sparkles,
  Check,
} from 'lucide-react';

const TRANSFER_STAGES = [
  { id: 'START', labelBn: '১. প্রাথমিক প্রস্তুতি ও খসড়া', labelEn: '1. Start & Draft', steps: [1, 2, 3] },
  { id: 'VERIFY', labelBn: '২. স্বয়ংক্রিয় যাচাই ও কর', labelEn: '2. Verify & Fees', steps: [4, 5, 6] },
  { id: 'REGISTER', labelBn: '৩. সাব-রেজিস্ট্রি ও বায়োমেট্রিক', labelEn: '3. Registry & Biometrics', steps: [7, 8, 9] },
  { id: 'REVIEW', labelBn: '৪. এসি ল্যান্ড নামজারি', labelEn: '4. Mutation Review', steps: [10, 11] },
  { id: 'DONE', labelBn: '৫. সম্পন্ন ও ক্রিপ্টো সিল', labelEn: '5. Done & Sealed', steps: [12, 13] },
];

export const CitizenHome: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { lang, user, t } = useAppUI();
  const [vault, setVault] = useState<any>(null);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [actionMsg, setActionMsg] = useState('');

  // NID Switcher State
  const [activeNid, setActiveNid] = useState<string>(user?.nid_mock || '9900001001');
  const [nidInput, setNidInput] = useState<string>(user?.nid_mock || '9900001001');
  const [selectedDeedModal, setSelectedDeedModal] = useState<any | null>(null);
  const [loadingDeedModal, setLoadingDeedModal] = useState(false);

  // Document Vault (L0-L3) State
  const [expandedPlotId, setExpandedPlotId] = useState<number | null>(null);
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

  // Citizen Dispute Form State
  const [disputePlotId, setDisputePlotId] = useState<number>(1);
  const [disputeType, setDisputeType] = useState('FORGERY_CLAIM');
  const [disputeDesc, setDisputeDesc] = useState(
    'আমার অজান্তে জাল আমমোক্তারনামা তৈরি করে এই দাগের জমি বিক্রির চেষ্টা চলছে।'
  );
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [activeSection, setActiveSection] = useState<'all' | 'vault' | 'transfers' | 'disputes'>(() => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/my/transfers')) return 'transfers';
    if (path.includes('/my/tickets') || path.includes('/my/land')) return 'vault';
    return 'all';
  });

  const loadTransfers = () => {
    setLoadingTransfers(true);
    BhumiApi.listTransfers()
      .then((res) => setTransfers(res.items || res || []))
      .catch(() => setTransfers([]))
      .finally(() => setLoadingTransfers(false));
  };

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

  const handleTogglePlotDocs = (plotId: number, plotCode?: string) => {
    if (expandedPlotId === plotId) {
      setExpandedPlotId(null);
      setPlotDocsData(null);
    } else {
      setExpandedPlotId(plotId);
      loadPlotDocuments(plotCode || plotId);
    }
  };

  const handleOpenTicketModal = (doc: any) => {
    setTicketModalDoc(doc);
    setTicketNotes('');
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
    } catch {
      alert(t('টিকেট তৈরিতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।', 'Failed to generate ticket. Please try again.'));
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleOpenUploadModal = (doc: any) => {
    setUploadModalDoc(doc);
    setUploadFileName(doc.document_type ? `${doc.document_type.toLowerCase()}_user_scan.pdf` : 'citizen_doc.pdf');
    setUploadNotes('');
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
    } catch {
      alert(t('দলিল আপলোড ব্যর্থ হয়েছে।', 'Failed to upload document.'));
    } finally {
      setSubmittingUpload(false);
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
      alert(t('নতুন স্থানান্তর আবেদন (ধাপ ১) সফলভাবে দাখিল করা হয়েছে!', 'New transfer case initialized at Step 1!'));
    } catch {
      alert(t('স্থানান্তর আবেদন তৈরি ব্যর্থ হয়েছে।', 'Failed to initialize transfer case.'));
    } finally {
      setCreatingTransfer(false);
    }
  };

  const loadCitizenData = (nidToUse = activeNid) => {
    BhumiApi.getMyVault(nidToUse)
      .then((res) => setVault(res))
      .catch(() => setVault({ found: false, person: null, owned_plots: [], deeds: [] }));
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedDeedModal(null);
      }
    };
    if (selectedDeedModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedDeedModal]);

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

  const handleFileDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDispute(true);
    setActionMsg('');
    try {
      const res = await BhumiApi.fileDispute({
        plot_id: disputePlotId,
        complainant_name_bn: user?.full_name_bn || 'মোঃ আব্দুর রহিম শেখ',
        complainant_nid: user?.nid_mock || '9900001001',
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

  return (
    <div className="space-y-6">
      <header className="page-intro animate-rise">
        <h1>{t('নাগরিক জমি ভল্ট', 'Citizen Land Vault')}</h1>
        <p>{t('মালিকানা, বিক্রয় লক ও অভিযোগ দাখিল — আপনার বিএস খতিয়ান রেকর্ড এক কনসোলে।', 'Ownership, sale locks, and objections — your BS khatian records in one console.')}</p>
      </header>
      {/* Citizen Personal KPI & Quick Action Header */}
      <div className="panel p-5 bg-gradient-to-r from-[#006A4E]/5 via-[#EDF7F4] to-white border border-[#006A4E]/15 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#006A4E]/10 text-[#006A4E] text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-[#006A4E] animate-pulse" />
              {t('নাগরিক সেবা পোর্টাল', 'Citizen Public Portal')}
            </div>
            <h2 className="text-xl md:text-2xl font-black text-[#0A1F1C]">
              {t(
                `স্বাগতম, ${user?.full_name_bn || 'নাগরিক'}!`,
                `Welcome, ${user?.full_name_en || 'Citizen'}!`
              )}
            </h2>
            <p className="text-xs text-[#5F7A74]">
              {t(
                'আপনার ব্যক্তিগত ডিজিটাল জমি ভল্ট ও মালিকানা সুরক্ষা কনসোল — বিএস খতিয়ান, দলিল ও বিক্রয় লক নিয়ন্ত্রণ।',
                'Your personal digital land vault & ownership protection console — BS khatian, deeds, and sale locks.'
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('check')}
              className="btn-primary text-xs !min-h-[38px] py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
            >
              <Search className="w-4 h-4" />
              <span>{t('কেনার আগে জমি যাচাই', 'Check Before Buying')}</span>
            </button>
            <button
              onClick={() => onNavigate('qr')}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#EDF7F4] text-[#006A4E] border border-[#006A4E]/20 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer min-h-[38px]"
            >
              <QrCode className="w-4 h-4" />
              <span>{t('QR দলিল যাচাই', 'Verify QR Deed')}</span>
            </button>
          </div>
        </div>

        {/* 4 Citizen KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#006A4E]/10">
          <div className="p-3.5 rounded-xl bg-white border border-[#006A4E]/10 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
                {t('মালিকাধীন দাগ (বিএস)', 'MY PLOTS (BS)')}
              </span>
              <div className="text-xl font-extrabold text-[#0A1F1C] mt-1">
                {toBanglaDigits(vault?.owned_plots?.length ?? 0, lang)}
              </div>
              <button
                onClick={() => document.getElementById('citizen-vault')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-[11px] text-[#006A4E] font-bold hover:underline mt-0.5 inline-block cursor-pointer"
              >
                {t('ভল্টে দেখুন ↓', 'View in Vault ↓')}
              </button>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#EDF7F4] text-[#006A4E] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-[#006A4E]/10 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
                {t('বিক্রয় লককৃত দাগ', 'SALE-LOCKED')}
              </span>
              <div className="text-xl font-extrabold text-[#FF3B4A] mt-1">
                {toBanglaDigits(
                  vault?.owned_plots?.filter((p: any) => Number(p.owner_sale_locked) === 1).length ?? 0,
                  lang
                )}
              </div>
              <span className="text-[11px] text-[#5F7A74] mt-0.5 inline-block">
                {t('🔒 বিক্রয়ে সুরক্ষা', '🔒 Protected')}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#FFF0F1] text-[#FF3B4A] flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-[#006A4E]/10 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
                {t('সংশ্লিষ্ট রেজিস্ট্রিকৃত দলিল', 'LINKED DEEDS')}
              </span>
              <div className="text-xl font-extrabold text-[#0A1F1C] mt-1">
                {toBanglaDigits(vault?.deeds?.length ?? 0, lang)}
              </div>
              <span className="text-[11px] text-[#006A4E] font-medium mt-0.5 inline-block">
                {t('Ed25519 স্বাক্ষরিত', 'Ed25519 Signed')}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#FBF3E0] text-[#C4891A] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-[#006A4E]/10 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
                {t('দাখিলকৃত অভিযোগ / বিরোধ', 'DISPUTES FILED')}
              </span>
              <div className="text-xl font-extrabold text-[#0A1F1C] mt-1">
                {toBanglaDigits(disputes?.length ?? 0, lang)}
              </div>
              <span className="text-[11px] text-[#5F7A74] mt-0.5 inline-block">
                {t('এসি ল্যান্ড ট্রাইব্যুনাল', 'AC Land Tribunal')}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#EDF7F4] text-[#006A4E] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {actionMsg && (
        <div className="p-4 rounded-xl bg-[#EDF7F4] border-l-8 border-[#006A4E] text-[#006A4E] font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* NID Search & Demo Citizen Switcher Bar */}
      <div className="panel p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#006A4E]" />
            <div>
              <span className="text-xs font-bold text-[#0A1F1C]">
                {t('নাগরিক এনআইডি অনুসন্ধান ও ভল্ট নির্বাচন:', 'Citizen NID Lookup & Vault Switcher:')}
              </span>
              <div className="text-[11px] text-[#5F7A74]">
                {t('এনআইডি নম্বর দিয়ে যেকারো বিএস খতিয়ান মালিকানা, বিক্রয় লক ও রেজিস্ট্রিকৃত দলিল দেখুন:', 'Enter an NID to load registered plots, sale locks, and signed deeds:')}
              </div>
            </div>
          </div>
          <form onSubmit={handleNidSearch} className="flex gap-2">
            <input
              type="text"
              value={nidInput}
              onChange={(e) => setNidInput(e.target.value)}
              placeholder="9900001001"
              className="field font-mono text-xs font-bold w-36 !min-h-[36px] py-2"
            />
            <button
              type="submit"
              className="btn-primary text-xs !min-h-[36px] py-2 px-3.5"
            >
              {t('খুঁজুন', 'Lookup')}
            </button>
          </form>
        </div>

        {/* Quick Demo NID Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#006A4E]/10 text-xs">
          <span className="text-[#5F7A74] font-medium text-[11px] mr-1">{t('ডেমো প্রোফাইল:', 'Demo Profiles:')}</span>
          <button
            onClick={() => handleSelectPresetNid('9900001001')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer min-h-[28px] ${
              activeNid === '9900001001'
                ? 'bg-[#006A4E] text-white'
                : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
            }`}
          >
            {t('মোঃ রফিকুল ইসলাম (দাগ ১০১, খতিয়ান ৪১০১)', 'Md. Rafiqul Islam (Plot 101, Kh 4101)')}
          </button>
          <button
            onClick={() => handleSelectPresetNid('9900001002')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer min-h-[28px] ${
              activeNid === '9900001002'
                ? 'bg-[#006A4E] text-white'
                : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
            }`}
          >
            {t('মোসাঃ রাবেয়া খাতুন (দাগ ১০২, খতিয়ান ৪১০২)', 'Mst. Rabeya Khatun (Plot 102, Kh 4102)')}
          </button>
          <button
            onClick={() => handleSelectPresetNid('9900001003')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer min-h-[28px] ${
              activeNid === '9900001003'
                ? 'bg-[#006A4E] text-white'
                : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
            }`}
          >
            {t('মোঃ আব্দুল করিম (দাগ ১০৩, খতিয়ান ৪১০৩)', 'Md. Abdul Karim (Plot 103, Kh 4103)')}
          </button>
        </div>
      </div>

      {/* Citizen Sub-Navigation Strip (Vault, Transfers, Disputes) */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveSection('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer min-h-[38px] ${
            activeSection === 'all'
              ? 'bg-[#006A4E] text-white shadow-xs'
              : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{t('সকল বিবরণ', 'All Overview')}</span>
        </button>
        <button
          onClick={() => setActiveSection('vault')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer min-h-[38px] ${
            activeSection === 'vault'
              ? 'bg-[#006A4E] text-white shadow-xs'
              : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>{t('জমির ভল্ট ও প্রামাণ্য সনদ (L0–L3)', 'Land Vault & Docs (L0-L3)')}</span>
        </button>
        <button
          onClick={() => setActiveSection('transfers')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer min-h-[38px] ${
            activeSection === 'transfers'
              ? 'bg-[#006A4E] text-white shadow-xs'
              : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('১৩-ধাপের হস্তান্তর ট্র্যাকার', '13-Step Transfers')} ({toBanglaDigits(transfers.length, lang)})</span>
        </button>
        <button
          onClick={() => setActiveSection('disputes')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer min-h-[38px] ${
            activeSection === 'disputes'
              ? 'bg-[#006A4E] text-white shadow-xs'
              : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>{t('আপত্তি ও বিরোধ দাখিল', 'Dispute Objections')}</span>
        </button>
      </div>

      {/* Citizen Control 1: My Land Vault + Plot Sale Protection Lock (🔒 বিক্রয় লক) */}
      {(activeSection === 'all' || activeSection === 'vault') && (
        vault?.found && vault.person ? (
        <div className="panel p-6 space-y-5 animate-rise-delay">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#006A4E]/10 pb-4">
            <div>
              <h2 id="citizen-vault" className="font-bold text-lg md:text-xl text-[#074f38] flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#006A4E]" />
                <span>
                  {t(
                    'আমার জমির ভল্ট ও মালিকানা বিক্রয় লক কন্ট্রোল (Owner Sale Protection Lock)',
                    'My Land Vault & Owner Sale Protection Lock'
                  )}
                </span>
              </h2>
              <p className="text-xs text-[#5F7A74] mt-0.5">
                {t('মালিকের নাম:', 'Recorded Owner:')}{' '}
                <strong>{lang === 'bn' ? vault.person.name_bn : vault.person.name_en}</strong> •{' '}
                {t('এনআইডি:', 'NID:')} <span className="font-mono">{vault.person.nid_mock}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('check')}
                className="btn-ghost text-xs !min-h-[36px] py-2 px-3.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{t('নতুন জমি যাচাই', 'Check Plot')}</span>
              </button>
              <button
                onClick={() => onNavigate('qr')}
                className="px-3.5 py-2 rounded-lg bg-[#EDF7F4] text-[#0A1F1C]/90 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer min-h-[36px]"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{t('QR সনদ যাচাই', 'Verify QR')}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Owned Plots Table / Cards (7 cols) */}
            <div className="lg:col-span-7">
              <h3 className="text-sm font-bold text-[#0A1F1C]/90 mb-3">
                {t(
                  'সর্বশেষ বিএস খতিয়ান অনুযায়ী আপনার মালিকাধীন দাগসমূহ:',
                  'Your Recorded Plots (Latest BS Khatian):'
                )}
              </h3>
              {vault.owned_plots.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#EDF7F4]/80 border border-[#006A4E]/12 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-[#5F7A74] flex items-center justify-center mx-auto">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-xs text-[#0A1F1C]">
                    {t('কোনো বিএস খতিয়ান দাগ রেকর্ড পাওয়া যায়নি', 'No Recorded Plots Found for this NID')}
                  </div>
                  <p className="text-[11px] text-[#5F7A74] max-w-sm mx-auto">
                    {t(
                      'যদি সম্প্রতি জমি ক্রয় বা ওয়ারিশসূত্রে প্রাপ্ত হয়ে থাকেন, তবে এসি ল্যান্ড অফিসে নামজারির আবেদন জমা দিন।',
                      'If you recently purchased land or inherited shares, submit an e-mutation application to AC Land.'
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vault.owned_plots.map((op: any, i: number) => {
                    const isLocked = Number(op.owner_sale_locked) === 1;
                    const isExpanded = expandedPlotId === op.plot_id;

                    return (
                      <div
                        key={i}
                        className={`p-4 rounded-xl border flex flex-col gap-3 transition-all ${
                          isLocked
                            ? 'bg-rose-50/50 border-rose-200'
                            : 'bg-[#EDF7F4]/70 border-[#006A4E]/12'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="font-bold text-sm text-[#0A1F1C] flex items-center gap-2">
                              <span>
                                {lang === 'bn' ? op.mouza_bn : op.mouza_en} — {t('দাগ নং', 'Dag')}{' '}
                                {toBanglaDigits(op.dag_no, lang)}
                              </span>
                              <span
                                className={`text-[11px] px-2 py-0.5 rounded-lg font-extrabold ${
                                  isLocked
                                    ? 'bg-[#FF3B4A] text-white'
                                    : 'bg-[#006A4E] text-white'
                                }`}
                              >
                                {isLocked
                                  ? t('🔒 বিক্রয় লক সক্রিয়', '🔒 SALE LOCKED')
                                  : t('🔓 লেনদেন খোলা', '🔓 UNLOCKED')}
                              </span>
                            </div>
                            <div className="text-xs text-[#5F7A74] mt-1">
                              {t('বিএস খতিয়ান:', 'BS Khatian:')} {toBanglaDigits(op.khatian_no, lang)} •{' '}
                              {t('অংশ:', 'Share:')} {toBanglaDigits(op.share_fraction, lang)} (
                              {toBanglaDigits(op.share_area_decimal, lang)} {t('শতাংশ', 'dec')})
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleTogglePlotDocs(op.plot_id, op.plot_code)}
                              className="px-3 py-1.5 rounded-lg bg-white border border-[#006A4E]/20 text-[#006A4E] hover:bg-[#EDF7F4] text-xs font-bold flex items-center gap-1 cursor-pointer min-h-[38px]"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>{isExpanded ? t('ভল্ট লুকান ▲', 'Hide Vault ▲') : t('সনদ ও ভল্ট ▼', 'Vault & Docs ▼')}</span>
                            </button>

                            <button
                              onClick={() => handleToggleLock(op.plot_id)}
                              className={`px-3.5 py-2 rounded-lg font-extrabold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer min-h-[38px] ${
                                isLocked
                                  ? 'bg-[#006A4E] text-white hover:bg-[#00553e]'
                                  : 'bg-[#FF3B4A] text-white hover:bg-red-700'
                              }`}
                            >
                              {isLocked ? (
                                <>
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span>{t('আনলক করুন', 'Unlock Plot')}</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>{t('🔒 বিক্রয় লক করুন', '🔒 Lock Against Sale')}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Expandable Document Vault with L0-L3 Trust Levels & 2-Tap Tickets */}
                        {isExpanded && (
                          <div className="mt-2 pt-3 border-t border-[#006A4E]/15 space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                              <div>
                                <h4 className="font-bold text-xs md:text-sm text-[#074f38] flex items-center gap-1.5">
                                  <Layers className="w-4 h-4 text-[#006A4E]" />
                                  <span>{t('জমির ডিজিটাল রেকর্ড ও প্রামাণ্য ভল্ট (L0–L3 Check)', 'Property Document Vault (L0-L3 Trust Levels)')}</span>
                                </h4>
                                <p className="text-[11px] text-[#5F7A74]">
                                  {t('সরকারি ডাটাবেজ, ক্রিপ্টোগ্রাফিক হ্যাশ ও নাগরিক সংযুক্তির ভিত্তিতে শ্রেণিকৃত সনদ তালিকা', 'Verified checklist categorized by official government records vs missing documents')}
                                </p>
                              </div>
                              {plotDocsData && (
                                <div className="flex items-center gap-1.5 text-xs">
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                                    ✔ {toBanglaDigits(plotDocsData.verified_count ?? 0, lang)} {t('যাচাইকৃত', 'Verified')}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                                    ✖ {toBanglaDigits(plotDocsData.missing_count ?? 0, lang)} {t('অনুপস্থিত', 'Missing')}
                                  </span>
                                </div>
                              )}
                            </div>

                            {loadingDocs ? (
                              <div className="py-6 text-center space-y-2">
                                <div className="w-6 h-6 border-2 border-[#006A4E] border-t-transparent rounded-full animate-spin mx-auto" />
                                <span className="text-xs text-[#5F7A74]">{t('রেকর্ডসমূহ যাচাই করা হচ্ছে...', 'Verifying records...')}</span>
                              </div>
                            ) : plotDocsData?.items ? (
                              <div className="space-y-2.5">
                                {plotDocsData.items.map((doc: any, dIdx: number) => {
                                  const isOfficial = doc.trust_level === 'L3';
                                  const isVerified = doc.trust_level === 'L2';
                                  const isCitizen = doc.trust_level === 'L1';
                                  const isMissing = doc.trust_level === 'L0';

                                  return (
                                    <div
                                      key={dIdx}
                                      className={`p-3 rounded-xl border transition-all ${
                                        isOfficial
                                          ? 'bg-emerald-50/50 border-emerald-200'
                                          : isVerified
                                          ? 'bg-teal-50/50 border-teal-200'
                                          : isCitizen
                                          ? 'bg-amber-50/50 border-amber-200'
                                          : 'bg-rose-50/60 border-rose-200'
                                      }`}
                                    >
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="space-y-0.5">
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-xs text-[#0A1F1C]">
                                              {lang === 'bn' ? doc.title_bn : doc.title_en}
                                            </span>
                                            <span
                                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                doc.is_required
                                                  ? 'bg-slate-200 text-slate-800'
                                                  : 'bg-slate-100 text-slate-500'
                                              }`}
                                            >
                                              {doc.is_required ? t('আবশ্যক', 'Mandatory') : t('ঐচ্ছিক', 'Optional')}
                                            </span>
                                          </div>
                                          {doc.file_name && (
                                            <div className="text-[11px] text-[#5F7A74] flex items-center gap-1 font-mono">
                                              <FileCheck className="w-3 h-3 text-[#006A4E]" />
                                              <span>{doc.file_name}</span>
                                              {doc.file_hash && (
                                                <span className="text-[10px] text-slate-400">
                                                  ({doc.file_hash.substring(0, 12)}...)
                                                </span>
                                              )}
                                            </div>
                                          )}
                                          {doc.verified_by && (
                                            <div className="text-[10px] text-[#006A4E] font-medium">
                                              {t('যাচাইকারী কর্তৃপক্ষ:', 'Verified by:')} {doc.verified_by}
                                            </div>
                                          )}
                                        </div>

                                        {/* Trust Badge */}
                                        <div className="flex items-center gap-2 shrink-0">
                                          {isOfficial && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#006A4E] text-white">
                                              <ShieldCheck className="w-3.5 h-3.5" />
                                              <span>L3 • {t('সরকারি অফিশিয়াল', 'Official')}</span>
                                            </span>
                                          )}
                                          {isVerified && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-700 text-white">
                                              <CheckCircle2 className="w-3.5 h-3.5" />
                                              <span>L2 • {t('সত্যায়িত অনুলিপি', 'Verified Copy')}</span>
                                            </span>
                                          )}
                                          {isCitizen && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#C4891A] text-white">
                                              <Upload className="w-3.5 h-3.5" />
                                              <span>L1 • {t('নাগরিক-সংযুক্ত', 'Citizen')}</span>
                                            </span>
                                          )}
                                          {isMissing && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F42A41] text-white">
                                              <AlertOctagon className="w-3.5 h-3.5" />
                                              <span>L0 • {t('অনুপস্থিত', 'Missing')}</span>
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* If L0: 2-Tap Ticket Bar & Citizen Upload */}
                                      {isMissing && (
                                        <div className="mt-2.5 pt-2 border-t border-rose-200/80 flex flex-wrap items-center justify-between gap-2">
                                          <span className="text-[11px] text-rose-800 font-medium flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-[#F42A41]" />
                                            <span>{t('রেকর্ডরুমে অনুসন্ধানের জন্য টিকেট ইস্যু করুন:', 'Request recordroom search:')}</span>
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => handleOpenUploadModal(doc)}
                                              className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-[11px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer min-h-[30px]"
                                            >
                                              <Upload className="w-3 h-3" />
                                              <span>{t('অনুলিপি আপলোড', 'Upload')}</span>
                                            </button>
                                            <button
                                              onClick={() => handleOpenTicketModal(doc)}
                                              className="btn-danger text-[11px] !min-h-[30px] py-1 px-3 flex items-center gap-1 shadow-xs cursor-pointer"
                                            >
                                              <Ticket className="w-3 h-3" />
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Citizen Deed History (5 cols) */}
            <div className="lg:col-span-5">
              <h3 className="text-sm font-bold text-[#0A1F1C]/90 mb-3">
                {t('হ্যাশ লেজারে নিবন্ধিত দলিলের তালিকা:', 'Registered Deeds in Hash Ledger:')}
              </h3>
              <div className="space-y-2.5">
                {vault.deeds.length === 0 ? (
                  <p className="text-xs text-[#5F7A74] p-4 bg-[#EDF7F4]/80 rounded-xl border">
                    {t('কোনো নিবন্ধিত দলিল পাওয়া যায়নি।', 'No deeds found for this citizen.')}
                  </p>
                ) : (
                  vault.deeds.map((d: any) => (
                    <div
                      key={d.id}
                      className="p-3.5 rounded-xl bg-[#EDF7F4]/80 border border-[#006A4E]/12 flex items-center justify-between hover:bg-[#EDF7F4]/70 transition-colors"
                    >
                      <div>
                        <div className="font-bold text-xs text-[#0A1F1C] flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-[#006A4E]" />
                          <span>{d.deed_no}</span>
                        </div>
                        <div className="text-[11px] text-[#5F7A74] mt-0.5">
                          {t('দাগ:', 'Dag:')} {toBanglaDigits(d.dag_no, lang)} •{' '}
                          {toBanglaDigits(d.area_decimal, lang)} {t('শতাংশ', 'dec')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg bg-[#EDF7F4] text-[#006A4E]">
                          {d.status}
                        </span>
                        <button
                          onClick={() => handleOpenDeedModal(d.deed_no)}
                          title={t('QR কোড ও প্রমাণ দেখুন', 'View Deed QR & Proof')}
                          className="p-1.5 rounded-lg bg-white border border-[#006A4E]/12 hover:bg-[#EDF7F4] text-[#0A1F1C]/90 hover:text-[#006A4E] cursor-pointer min-h-[30px]"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="panel p-8 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="font-bold text-base text-[#074f38]">
            {t('এনআইডি নম্বর পাওয়া যায়নি', 'NID Profile Not Found')}
          </h3>
          <p className="text-xs text-[#5F7A74] max-w-md mx-auto">
            {t(
              'অনুসন্ধানকৃত এনআইডি নম্বরের বিপরীতে কোনো নাগরিক রেকর্ড মেলেনি। উপরের ডেমো প্রোফাইলগুলো থেকে নির্বাচন করে পরীক্ষা করুন।',
              'No citizen record matches this NID. Please select one of the demo profiles above.'
            )}
          </p>
        </div>
      )
      )}

      {/* Ticket Success Alert Banner */}
      {ticketAlert && (
        <div className="p-4 rounded-xl bg-emerald-50 border-2 border-[#006A4E] text-[#006A4E] space-y-2 animate-rise">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-[#006A4E] shrink-0" />
              <span>{lang === 'bn' ? ticketAlert.message_bn : ticketAlert.message_en}</span>
            </div>
            <button
              onClick={() => setTicketAlert(null)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              ✕
            </button>
          </div>
          <div className="text-xs text-[#5F7A74] flex flex-wrap items-center gap-3 font-mono">
            <span>Ticket: <strong>{ticketAlert.ticket_code}</strong></span>
            <span>SLA Target: <strong>{ticketAlert.sla_target_hours || 168}h</strong></span>
            <span>Status: <strong>{ticketAlert.status || 'NEW'}</strong></span>
          </div>
        </div>
      )}

      {/* Citizen Control: 13-Step Transfer State Machine Stepper with 5 Citizen Stages */}
      {(activeSection === 'all' || activeSection === 'transfers') && (
      <div className="panel p-6 space-y-5 animate-rise">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#006A4E]/10 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#006A4E]/10 text-[#006A4E] text-xs font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('এন্ড-টু-এন্ড রূপরেখা • ৫টি নাগরিক স্তর ও ১৩টি ধাপ', 'End-to-End Pipeline • 5 Stages & 13 Steps')}</span>
            </div>
            <h3 className="font-bold text-lg md:text-xl text-[#074f38] flex items-center gap-2">
              <span>{t('জমির হস্তান্তর ও মালিকানা স্থানান্তর ট্র্যাকার (13-Step Transfer Machine)', 'Land Transfer & Ownership Mutation Tracker')}</span>
            </h3>
            <p className="text-xs text-[#5F7A74]">
              {t(
                'খসড়া আবেদন থেকে সাব-রেজিস্ট্রার বায়োমেট্রিক ও এসি ল্যান্ড নামজারি — ৫টি নাগরিক স্তর ও ১৩টি অভ্যন্তরীণ নিরাপত্তা চেক।',
                'From draft intent to counter biometrics and AC Land mutation — 5 citizen stages and 13 system security steps.'
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCreateNewTransfer(vault?.owned_plots?.[0]?.plot_id || 1)}
              disabled={creatingTransfer}
              className="btn-primary text-xs !min-h-[36px] py-1.5 px-3.5 flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{creatingTransfer ? t('তৈরি হচ্ছে...', 'Creating...') : t('নতুন হস্তান্তর শুরু করুন', '+ New Transfer')}</span>
            </button>
            <button
              onClick={loadTransfers}
              title={t('রিফ্রেশ', 'Refresh')}
              className="p-2 rounded-lg bg-white border border-[#006A4E]/20 text-[#006A4E] hover:bg-[#EDF7F4] cursor-pointer min-h-[36px]"
            >
              <RefreshCw className={`w-4 h-4 ${loadingTransfers ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Transfers List */}
        {transfers.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#EDF7F4]/60 border border-[#006A4E]/12 text-center space-y-2">
            <p className="text-xs text-[#5F7A74]">{t('কোনো সক্রিয় স্থানান্তর প্রক্রিয়া চলমান নেই। উপরের বোতামে ক্লিক করে নতুন হস্তান্তর খসড়া শুরু করুন।', 'No active transfers in progress. Click above to start a new transfer case.')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transfers.map((tr: any) => {
              const currentStep = Number(tr.current_step || 1);
              const isFinished = currentStep === 13;
              const hasBiometric = currentStep >= 8;

              return (
                <div key={tr.id} className="p-5 rounded-2xl bg-[#EDF7F4]/40 border border-[#006A4E]/15 space-y-4">
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-[#006A4E]">{tr.transfer_code}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#006A4E] text-white">
                          {tr.status}
                        </span>
                        <span className="text-xs text-[#5F7A74] font-medium">
                          {tr.deed_type || 'SALE'}
                        </span>
                      </div>
                      <div className="text-xs text-[#0A1F1C] mt-1 font-semibold">
                        {lang === 'bn' ? tr.mouza_bn : tr.mouza_en} • {t('দাগ নং:', 'Dag:')} {toBanglaDigits(tr.dag_no, lang)} ({tr.plot_code}) • {toBanglaDigits(tr.transfer_area_decimal, lang)} {t('শতাংশ', 'dec')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {currentStep < 13 && (
                        <button
                          onClick={() => handleAdvanceTransfer(tr.transfer_code, currentStep + 1)}
                          disabled={advancingTransferCode === tr.transfer_code}
                          className="btn-primary text-xs !min-h-[36px] py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-xs"
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
                  </div>

                  {/* 5-Stage Visual Stepper */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-2">
                    {TRANSFER_STAGES.map((stg, sIdx) => {
                      const isComplete = currentStep > Math.max(...stg.steps);
                      const isActive = stg.steps.includes(currentStep);

                      return (
                        <div
                          key={sIdx}
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            isComplete
                              ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900 font-bold'
                              : isActive
                              ? 'bg-white border-[#006A4E] text-[#006A4E] font-black ring-2 ring-[#006A4E]/20 shadow-xs'
                              : 'bg-white/60 border-slate-200 text-slate-400'
                          }`}
                        >
                          <div className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                            {isComplete && <CheckCircle2 className="w-3 h-3 text-[#006A4E]" />}
                            {isActive && <span className="w-2 h-2 rounded-full bg-[#006A4E] animate-ping inline-block" />}
                            <span>Stage {sIdx + 1}</span>
                          </div>
                          <div className="text-xs truncate">{lang === 'bn' ? stg.labelBn : stg.labelEn}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Step Detail Banner & Biometric Badge */}
                  <div className="p-3 bg-white rounded-xl border border-[#006A4E]/12 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-[#5F7A74] block text-[11px] font-medium">
                        {t('বর্তমান সক্রিয় ধাপ:', 'Current Active Step:')}
                      </span>
                      <strong className="text-sm text-[#074f38]">
                        {t(`ধাপ ${toBanglaDigits(currentStep, lang)} / ১৩:`, `Step ${currentStep} of 13:`)}{' '}
                        {lang === 'bn' ? tr.step_name_bn : tr.step_name_en}
                      </strong>
                    </div>

                    {/* Biometric Verification Badge */}
                    <div className="flex items-center gap-2">
                      {hasBiometric ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                          <ShieldCheck className="w-4 h-4 text-[#006A4E]" />
                          <span>{t('✔ কাউন্টার বায়োমেট্রিক ও ফেস লাইভনেস: যাচাইকৃত (Passed)', '✔ Counter Biometrics & Liveness: Passed')}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs">
                          <Clock className="w-4 h-4 text-[#C4891A]" />
                          <span>{t('কাউন্টার বায়োমেট্রিক: রেজিস্ট্রেশন ধাপে (ধাপ ৮) যাচাই করা হবে', 'Biometrics: Scheduled for Step 8')}</span>
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

      {/* Citizen Control 2: File Land Fraud / Ownership Dispute (অভিযোগ ও আপত্তি দাখিল) */}
      {(activeSection === 'all' || activeSection === 'disputes') && (
      <div className="panel p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleFileDispute} className="lg:col-span-6 space-y-4">
          <h3 className="font-bold text-lg text-[#074f38] flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-[#FF3B4A]" />
            <span>
              {t(
                'জালিয়াতি বা ওয়ারিশ বঞ্চনার আপত্তি দাখিল (File Land Objection)',
                'File Land Fraud / Ownership Objection Alert'
              )}
            </span>
          </h3>
          <p className="text-xs text-[#5F7A74]">
            {t(
              'কোনো দাগে জাল দলিল বা ওয়ারিশ বাদ দিয়ে বিক্রির চেষ্টা হলে এখানে অভিযোগ দিন। এটি তাৎক্ষণিকভাবে সাব-রেজিস্ট্রার ও এসি ল্যান্ড প্যানেলে সতর্কবার্তা পাঠাবে।',
              'Filing an objection immediately flags the plot in the Sub-Registrar and AC Land panels.'
            )}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">
                {t('সংশ্লিষ্ট দাগ নির্বাচন করুন:', 'Select Plot (Dag):')}
              </label>
              <select
                value={disputePlotId}
                onChange={(e) => setDisputePlotId(Number(e.target.value))}
                className="field text-xs font-semibold"
              >
                {plots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {lang === 'bn' ? p.mouza_bn : p.mouza_en} — {t('দাগ নং', 'Dag')} {p.dag_no}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                {t('অভিযোগের ধরন:', 'Objection Category:')}
              </label>
              <select
                value={disputeType}
                onChange={(e) => setDisputeType(e.target.value)}
                className="field text-xs font-semibold"
              >
                <option value="FORGERY_CLAIM">{t('জাল দলিল / ভুয়া আমমোক্তারনামা', 'Fake Deed / Forged POA')}</option>
                <option value="INHERITANCE_EXCLUSION">{t('ওয়ারিশ বঞ্চিত করে বিক্রির চেষ্টা', 'Heir Exclusion Dispute')}</option>
                <option value="COURT_INJUNCTION">{t('আদালতের নিষেধাজ্ঞা / দেওয়ানি মামলা', 'Court Injunction / Civil Suit')}</option>
                <option value="BOUNDARY_GRAB">{t('সীমানা বা অতিরিক্ত অংশ দখল', 'Boundary / Area Encroachment')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">
              {t('অভিযোগের বিবরণ:', 'Objection Details:')}
            </label>
            <textarea
              value={disputeDesc}
              onChange={(e) => setDisputeDesc(e.target.value)}
              rows={2}
              className="field text-xs"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submittingDispute}
            className="btn-danger text-xs"
          >
            <Send className="w-4 h-4" />
            <span>
              {submittingDispute
                ? t('জমা হচ্ছে...', 'Submitting...')
                : t('আপত্তি ও অভিযোগ নিবন্ধন করুন', 'Submit Official Objection')}
            </span>
          </button>
        </form>

        <div className="lg:col-span-6 space-y-3">
          <h3 className="text-sm font-extrabold text-[#0A1F1C]">
            {t('দাখিলকৃত অভিযোগ ও ট্রাইব্যুনাল স্ট্যাটাস:', 'Filed Objections & Tribunal Status:')}
          </h3>
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {disputes.map((dsp) => (
              <div
                key={dsp.id}
                className={`p-3.5 rounded-xl border ${
                  dsp.status === 'OPEN'
                    ? 'bg-amber-50/60 border-amber-300'
                    : 'bg-[#EDF7F4]/80 border-[#006A4E]/12'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#0A1F1C]">
                    {lang === 'bn' ? dsp.mouza_bn : dsp.mouza_en} — {t('দাগ', 'Dag')} {dsp.dag_no} ({dsp.dispute_type})
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      dsp.status === 'OPEN'
                        ? 'bg-[#C4891A] text-white'
                        : dsp.status === 'UPHELD_FROZEN'
                        ? 'bg-[#FF3B4A] text-white'
                        : 'bg-[#006A4E] text-white'
                    }`}
                  >
                    {dsp.status}
                  </span>
                </div>
                <p className="text-xs text-[#5F7A74] mt-1">{dsp.description_bn}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Deed Proof Modal (F19) */}
      {(selectedDeedModal || loadingDeedModal) && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="deed-modal-title"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border-2 border-[#006A4E] space-y-4 max-h-[90vh] overflow-y-auto relative animate-rise">
            <button
              onClick={() => setSelectedDeedModal(null)}
              aria-label="Close"
              className="absolute top-4 right-4 p-2 rounded-full bg-[#EDF7F4] hover:bg-[#E2EFE9] text-[#0A1F1C] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {loadingDeedModal ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-[#006A4E] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-[#5F7A74]">
                  {t('দলিলের ক্রিপ্টোগ্রাফিক রেকর্ড লোড হচ্ছে...', 'Loading cryptographic deed record...')}
                </p>
              </div>
            ) : selectedDeedModal ? (
              <>
                <div className="flex items-center gap-3 border-b border-[#006A4E]/15 pb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#006A4E] text-white flex items-center justify-center font-black">
                    দলিল
                  </div>
                  <div>
                    <h3 id="deed-modal-title" className="font-bold text-lg text-[#074f38] flex items-center gap-2">
                      <span>{selectedDeedModal.deed?.deed_no}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                          selectedDeedModal.verified
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {selectedDeedModal.verified ? '✔ VERIFIED' : '✖ TAMPERED'}
                      </span>
                    </h3>
                    <p className="text-xs text-[#5F7A74]">
                      {t('নিবন্ধিত দলিল ও ক্রিপ্টোগ্রাফিক প্রমাণপত্র', 'Registered Deed & Cryptographic Proof')}
                    </p>
                  </div>
                </div>

                {/* QR Code and Key Details */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-[#EDF7F4]/60 p-4 rounded-xl border border-[#006A4E]/12">
                  <div className="md:col-span-4 flex flex-col items-center justify-center p-2 bg-white rounded-xl border border-[#006A4E]/20 shadow-xs">
                    {selectedDeedModal.qr_data_uri ? (
                      <img
                        src={selectedDeedModal.qr_data_uri}
                        alt="Deed QR"
                        className="w-36 h-36 object-contain"
                      />
                    ) : (
                      <QrCode className="w-28 h-28 text-[#006A4E]" />
                    )}
                    <span className="text-[10px] font-mono text-[#5F7A74] mt-1">
                      Ed25519 Verified QR
                    </span>
                  </div>

                  <div className="md:col-span-8 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[#5F7A74] block">{t('মৌজা:', 'Mouza:')}</span>
                        <strong>{lang === 'bn' ? selectedDeedModal.deed?.mouza_bn : selectedDeedModal.deed?.mouza_en}</strong>
                      </div>
                      <div>
                        <span className="text-[#5F7A74] block">{t('দাগ নং:', 'Dag No:')}</span>
                        <strong>{toBanglaDigits(selectedDeedModal.deed?.dag_no, lang)}</strong>
                      </div>
                      <div>
                        <span className="text-[#5F7A74] block">{t('জমির পরিমাণ:', 'Area:')}</span>
                        <strong>{toBanglaDigits(selectedDeedModal.deed?.area_decimal, lang)} {t('শতাংশ', 'dec')}</strong>
                      </div>
                      <div>
                        <span className="text-[#5F7A74] block">{t('স্ট্যাটাস:', 'Status:')}</span>
                        <span className="badge-status">{selectedDeedModal.deed?.status}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#006A4E]/10 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#5F7A74]">{t('বিক্রেতা:', 'Seller:')}</span>
                        <span>{selectedDeedModal.deed?.seller_name_bn} ({selectedDeedModal.deed?.seller_nid})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#5F7A74]">{t('ক্রেতা:', 'Buyer:')}</span>
                        <span>{selectedDeedModal.deed?.buyer_name_bn} ({selectedDeedModal.deed?.buyer_nid})</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cryptographic Ledger Block Info */}
                <div className="p-3.5 bg-slate-900 text-slate-200 rounded-xl text-xs space-y-1.5 font-mono">
                  <div className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider flex items-center justify-between">
                    <span>Cryptographic Ledger Proof</span>
                    <span>Ed25519: {selectedDeedModal.cryptographic_proof?.signature_valid ? 'VALID' : 'INVALID'}</span>
                  </div>
                  <div className="truncate">
                    <span className="text-slate-400">Content Hash: </span>
                    <span className="text-white">{selectedDeedModal.cryptographic_proof?.stored_content_hash}</span>
                  </div>
                  <div className="truncate">
                    <span className="text-slate-400">Recomputed: </span>
                    <span className={selectedDeedModal.cryptographic_proof?.hash_matches ? 'text-emerald-400' : 'text-rose-400'}>
                      {selectedDeedModal.cryptographic_proof?.recomputed_content_hash}
                    </span>
                  </div>
                  <div className="truncate">
                    <span className="text-slate-400">Previous Hash: </span>
                    <span className="text-slate-300">{selectedDeedModal.cryptographic_proof?.prev_hash}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#006A4E]/15">
                  <button
                    onClick={() => {
                      sessionStorage.setItem('bs_pending_verify_search', selectedDeedModal.deed?.deed_no);
                      setSelectedDeedModal(null);
                      onNavigate('qr');
                    }}
                    className="btn-primary text-xs !min-h-[36px] py-2 px-3.5 flex items-center gap-1.5"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>{t('ভেরিফাই পোর্টালে বিস্তারিত দেখুন →', 'Open in Verify Portal →')}</span>
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => window.print()}
                      className="btn-ghost text-xs !min-h-[36px] py-2 px-3.5 flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{t('প্রিন্ট', 'Print')}</span>
                    </button>
                    <button
                      onClick={() => setSelectedDeedModal(null)}
                      className="px-3.5 py-2 rounded-lg bg-[#EDF7F4] hover:bg-[#E2EFE9] text-xs font-bold text-[#0A1F1C]"
                    >
                      {t('বন্ধ করুন', 'Close')}
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* 2-Tap Missing Document Request Confirmation Modal */}
      {ticketModalDoc && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border-2 border-[#006A4E] space-y-4 animate-rise relative">
            <button
              onClick={() => setTicketModalDoc(null)}
              aria-label="Close"
              className="absolute top-4 right-4 p-2 rounded-full bg-[#EDF7F4] hover:bg-[#E2EFE9] text-[#0A1F1C] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#006A4E]/15 pb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-[#F42A41] flex items-center justify-center font-black">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#074f38]">
                  {t('অনুপস্থিত দলিলের সরকারি অনুসন্ধান টিকেট (২-ট্যাপ)', 'Missing Document Official Ticket (2-Tap)')}
                </h3>
                <p className="text-xs text-[#5F7A74]">
                  {t('রেকর্ডরুম হতে দলিল উত্তোলন ও ডিজিটাইজ করার দাপ্তরিক অনুরোধ', 'Official request to retrieve and digitize record from government archives')}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-[#EDF7F4]/60 rounded-xl border border-[#006A4E]/12 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#5F7A74]">{t('অনুরোধকৃত দলিল:', 'Requested Document:')}</span>
                <strong className="text-[#0A1F1C]">{lang === 'bn' ? ticketModalDoc.title_bn : ticketModalDoc.title_en}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F7A74]">{t('সংশ্লিষ্ট দাগ / খতিয়ান:', 'Plot / Dag:')}</span>
                <span className="font-mono font-bold">{plotDocsData?.plot?.dag_no_bn || plotDocsData?.plot?.dag_no} ({plotDocsData?.plot?.plot_code})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F7A74]">{t('এসএলএ সময়সীমা (SLA Target):', 'SLA Target Time:')}</span>
                <span className="font-bold text-[#006A4E]">{t('৭ কার্যদিবস (১৬৮ ঘণ্টা)', '7 Working Days (168h)')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F7A74]">{t('আবেদনকারী এনআইডি:', 'Applicant NID:')}</span>
                <span className="font-mono">{user?.nid_mock || activeNid}</span>
              </div>
            </div>

            <div>
              <label className="label text-xs">
                {t('অতিরিক্ত মন্তব্য বা নির্দেশিকা (ঐচ্ছিক):', 'Additional Note / Clue (Optional):')}
              </label>
              <textarea
                value={ticketNotes}
                onChange={(e) => setTicketNotes(e.target.value)}
                placeholder={t('যেমন: ১৯৭৮ সালের সাব-রেজিস্ট্রি ভলিউম নং ৪ এ নথিভুক্ত হতে পারে...', 'e.g. May be located in Volume 4 of Savar Sub-Registry 1978...')}
                rows={2}
                className="field text-xs w-full"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTicketModalDoc(null)}
                className="btn-ghost text-xs !min-h-[36px] py-1.5 px-4"
              >
                {t('বাতিল', 'Cancel')}
              </button>
              <button
                type="button"
                disabled={submittingTicket}
                onClick={handleConfirmTicket}
                className="btn-primary text-xs !min-h-[36px] py-1.5 px-5 flex items-center gap-1.5"
              >
                {submittingTicket ? (
                  <span>{t('টিকেট তৈরি হচ্ছে...', 'Creating Ticket...')}</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{t('নিশ্চিত করুন ও টিকিট তৈরি করুন (Tap 2)', 'Confirm & Create Ticket (Tap 2)')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Citizen Upload Modal */}
      {uploadModalDoc && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-[#006A4E] space-y-4 animate-rise relative">
            <button
              onClick={() => setUploadModalDoc(null)}
              aria-label="Close"
              className="absolute top-4 right-4 p-2 rounded-full bg-[#EDF7F4] hover:bg-[#E2EFE9] text-[#0A1F1C] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#006A4E]/15 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-[#C4891A] flex items-center justify-center font-black">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#074f38]">
                  {t('নাগরিক অনুলিপি আপলোড (L1)', 'Citizen Document Upload (L1)')}
                </h3>
                <p className="text-xs text-[#5F7A74]">
                  {lang === 'bn' ? uploadModalDoc.title_bn : uploadModalDoc.title_en}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label text-xs">{t('ফাইলের নাম (File Name):', 'File Name:')}</label>
                <input
                  type="text"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  className="field text-xs w-full"
                  placeholder="warishan_scan_2026.pdf"
                />
              </div>

              <div>
                <label className="label text-xs">{t('নোট বা দলিলের বিবরণ:', 'Document Note / Details:')}</label>
                <textarea
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  rows={2}
                  className="field text-xs w-full"
                  placeholder={t('ইউনিয়ন পরিষদ চেয়ারম্যান কর্তৃক ইস্যুকৃত অনুলিপি...', 'Succession certificate issued by UP Chairman...')}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUploadModalDoc(null)}
                className="btn-ghost text-xs !min-h-[36px] py-1.5 px-4"
              >
                {t('বাতিল', 'Cancel')}
              </button>
              <button
                type="button"
                disabled={submittingUpload}
                onClick={handleConfirmUpload}
                className="btn-primary text-xs !min-h-[36px] py-1.5 px-5 flex items-center gap-1.5"
              >
                {submittingUpload ? (
                  <span>{t('আপলোড হচ্ছে...', 'Uploading...')}</span>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>{t('সংযুক্ত করুন (L1)', 'Upload as L1')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
