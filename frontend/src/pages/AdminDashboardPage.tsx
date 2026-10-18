import {SourceReviewPanel} from '../components/sources/SourceReviewPanel';
import React, { useState, useEffect } from 'react';
import { useAppUI, UserRole } from '../i18n';
import {
  BhumiApi,
  RiskReportResponse,
  ServiceCatalogueItem,
  ServiceFeeItem,
  FeeComponent,
  AdminDeedItem,
  AdminDeedsResponse,
  AdminDeedDetailResponse,
  HierarchyDivisionItem,
  HierarchyDistrictItem,
  HierarchyUpazilaItem,
  HierarchyMouzaItem,
  AdminAnomalyItem,
  AdminAnomaliesResponse,
  EmergencyBroadcastState,
  DatabaseBackupResponse,
  LedgerHealthCheckResponse,
  TogglePlotFreezeResponse,
  TransferOfficerResponse,
} from '../api/client';
import { AddressCascader } from '../components/AddressCascader';
import { toBanglaDigits } from '../theme/tokens';
import { ResultHeroBanner } from '../components/ResultHeroBanner';
import { SuperAdminTransfersTab } from './admin/SuperAdminTransfersTab';
import { SuperAdminMutationsTab } from './admin/SuperAdminMutationsTab';
import { SuperAdminFieldVerificationTab } from './admin/SuperAdminFieldVerificationTab';
import { SuperAdminAcquisitionsTab } from './admin/SuperAdminAcquisitionsTab';
import { SuperAdminBankLiensTab } from './admin/SuperAdminBankLiensTab';
import { SuperAdminAppealsTab } from './admin/SuperAdminAppealsTab';
import { SuperAdminOverviewQueues } from './admin/SuperAdminOverviewQueues';
import { SuperAdminOverrideModal } from './admin/SuperAdminOverrideModal';
import { SuperAdminDocumentSecurityTab } from './admin/SuperAdminDocumentSecurityTab';
import { SuperAdminOfficesTab } from './admin/SuperAdminOfficesTab';
import { SuperAdminLawyersTab } from './admin/SuperAdminLawyersTab';
import {
  Lock,
  Flame,
  RotateCcw,
  FileSearch,
  History,
  CheckCircle2,
  XOctagon,
  Users,
  Settings,
  UserPlus,
  Trash2,
  KeyRound,
  BookOpen,
  Plus,
  Edit2,
  Archive,
  Globe,
  Coins,
  ExternalLink,
  ArrowRight,
  Eye,
  RefreshCw,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Landmark,
  FileSpreadsheet,
  Layers,
  Scale,
  Gavel,
  FileText,
  AlertCircle,
  Clock,
  Compass,
  MapPin,
  Search,
  Filter,
  AlertTriangle,
  Shield,
  Check,
  X,
  Smartphone,
  Copy,
  Send,
  Phone,
  Mail,
  LayoutDashboard,
  Ban,
  MessageSquare,
  HelpCircle,
  FilePlus,
  ThumbsUp,
  ThumbsDown,
  Newspaper,
  Megaphone,
  Download,
  Radio,
  Activity,
  CheckCheck,
} from 'lucide-react';

const ROLE_DASHBOARD_MAP: Record<string, string> = {
  citizen: 'home',
  sub_registrar: 'registrar',
  ac_land: 'acland',
  bank_officer: 'bank',
  admin: 'admin',
};

export type AdminTab =
  | 'overview'
  | 'users'
  | 'transfers'
  | 'deeds'
  | 'mutations'
  | 'field_verification'
  | 'survey_records'
  | 'bank_liens'
  | 'appeals'
  | 'acquisitions'
  | 'marketplace'
  | 'tickets'
  | 'notices'
  | 'offices_config'
  | 'integrations'
  | 'audit_reports'
  // Legacy / Role-specific tabs for backward compatibility:
  | 'hierarchy'
  | 'ledger'
  | 'plots_control'
  | 'audit'
  | 'settings'
  | 'rbac'
  | 'catalogue'
  | 'risk_protocols'
  | 'onboarding_appeals'
  | 'dev_outbox'
  | 'content_editor'
  | 'content_approver'
  | 'marketplace_moderation';

export const AdminDashboardPage: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { lang, role, setRole, user, setUser, token, setToken, activeSubTab, setActiveSubTab, adminUserRoleFilter, setAdminUserRoleFilter, t } = useAppUI();

  const roleAllowedTabs: Record<string, AdminTab[]> = {
    auditor: ['audit_reports', 'deeds', 'ledger', 'audit'],
    support_agent: ['tickets', 'audit_reports', 'audit'],
    platform_moderator: ['marketplace', 'audit_reports', 'audit', 'marketplace_moderation'],
    content_editor: ['content_editor', 'audit'],
    content_approver: ['content_approver', 'notices', 'audit'],
    system_admin: [
      'overview',
      'transfers',
      'mutations',
      'deeds',
      'field_verification',
      'survey_records',
      'bank_liens',
      'appeals',
      'acquisitions',
      'users',
      'plots_control',
      'ledger',
      'settings',
      'tickets',
      'notices',
      'offices_config',
      'integrations',
      'audit_reports',
      'marketplace',
      'catalogue',
    ],
    admin: [
      'overview',
      'transfers',
      'mutations',
      'deeds',
      'field_verification',
      'survey_records',
      'bank_liens',
      'appeals',
      'acquisitions',
      'users',
      'plots_control',
      'ledger',
      'settings',
      'tickets',
      'notices',
      'offices_config',
      'integrations',
      'audit_reports',
      'marketplace',
      'catalogue',
    ],
  };
  const allowedTabs: AdminTab[] = roleAllowedTabs[role] || [
    'overview',
    'transfers',
    'mutations',
    'deeds',
    'field_verification',
    'survey_records',
    'bank_liens',
    'appeals',
    'acquisitions',
    'users',
    'plots_control',
    'ledger',
    'settings',
    'tickets',
    'notices',
    'offices_config',
    'integrations',
    'audit_reports',
  ];

  const mapLegacyToPillar = (requested?: string | null): { pillar: AdminTab; segment?: string } => {
    if (!requested) {
      if (role === 'support_agent') return { pillar: 'tickets' };
      if (role === 'content_editor') return { pillar: 'content_editor' };
      if (role === 'content_approver') return { pillar: 'content_approver' };
      if (role === 'platform_moderator') return { pillar: 'marketplace' };
      if (role === 'auditor') return { pillar: 'audit_reports' };
      return { pillar: 'overview' };
    }
    if (requested === 'transfers') return { pillar: 'transfers' };
    if (requested === 'mutations') return { pillar: 'mutations' };
    if (requested === 'field_verification') return { pillar: 'field_verification' };
    if (requested === 'survey_records') return { pillar: 'survey_records' };
    if (requested === 'bank_liens') return { pillar: 'bank_liens' };
    if (requested === 'appeals') return { pillar: 'appeals' };
    if (requested === 'acquisitions') return { pillar: 'acquisitions' };
    if (requested === 'marketplace' || requested === 'marketplace_moderation') return { pillar: 'marketplace' };
    if (requested === 'content_editor') return { pillar: 'content_editor' };
    if (requested === 'content_approver') return { pillar: 'content_approver' };
    if (requested === 'notices') return { pillar: role === 'content_editor' ? 'content_editor' : 'notices' };
    if (requested === 'offices_config') return { pillar: 'offices_config' };
    if (requested === 'hierarchy') return { pillar: 'hierarchy' };
    if (requested === 'catalogue') return { pillar: 'catalogue' };
    if (requested === 'settings') return { pillar: 'settings' };
    if (requested === 'integrations' || requested === 'dev_outbox') return { pillar: 'integrations' };
    if (requested === 'audit_reports' || requested === 'audit') return { pillar: 'audit_reports' };
    if (requested === 'ledger') return { pillar: 'ledger' };
    if (requested === 'deeds') return { pillar: 'deeds' };
    if (requested === 'plots_control') return { pillar: 'plots_control' };
    if (requested === 'rbac') return { pillar: 'users', segment: 'rbac' };
    if (requested === 'onboarding_appeals') return { pillar: 'survey_records' };
    if (requested === 'users') return { pillar: 'users', segment: 'directory' };
    if (requested === 'tickets') return { pillar: 'tickets' };
    if (requested === 'risk_protocols') return { pillar: 'settings', segment: 'fraud_policy' };
    const fallbackTab = allowedTabs[0] || 'overview';
    return { pillar: (allowedTabs.includes(requested as AdminTab) ? (requested as AdminTab) : fallbackTab) };
  };

  const initialMapped = mapLegacyToPillar(activeSubTab);
  const [subTab, setSubTab] = useState<AdminTab>(initialMapped.pillar);

  // 5 Core Pillars Sub-segment State
  const [usersSubSegment, setUsersSubSegment] = useState<'directory' | 'transfer' | 'onboarding_appeals' | 'rbac'>('directory');
  const [plotsSubSegment, setPlotsSubSegment] = useState<'plots' | 'deeds' | 'hierarchy'>('plots');
  const [ledgerSubSegment, setLedgerSubSegment] = useState<'ledger_lab' | 'audit_trail' | 'database_backup'>('ledger_lab');
  const [settingsSubSegment, setSettingsSubSegment] = useState<'fraud_policy' | 'catalogue' | 'tickets' | 'diagnostics'>('fraud_policy');

  // Master Administrative Plot Freeze State
  const [freezeModalPlot, setFreezeModalPlot] = useState<any | null>(null);
  const [freezeReason, setFreezeReason] = useState<string>('উচ্চ আদালতের স্থগিতাদেশ (High Court Stay Order)');
  const [freezeCustomReason, setFreezeCustomReason] = useState<string>('');
  const [freezeLoading, setFreezeLoading] = useState(false);

  // Officer Transfer State
  const [transferOfficerUser, setTransferOfficerUser] = useState<any | null>(null);
  const [transferTargetOfficeId, setTransferTargetOfficeId] = useState<number>(0);
  const [transferOrderRef, setTransferOrderRef] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState<string>('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferNotice, setTransferNotice] = useState<{ msg: string; err?: boolean } | null>(null);

  // Live Anomaly & Security Stream State
  const [anomaliesData, setAnomaliesData] = useState<AdminAnomaliesResponse | null>(null);
  const [anomaliesLoading, setAnomaliesLoading] = useState(false);

  // 1-Click Cryptographic Ledger Health Check State
  const [healthCheckData, setHealthCheckData] = useState<LedgerHealthCheckResponse | null>(null);
  const [healthCheckLoading, setHealthCheckLoading] = useState(false);

  // 1-Click Sovereign Database Backup State
  const [backupData, setBackupData] = useState<DatabaseBackupResponse | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);

  // Emergency Platform Broadcast Controller State
  const [broadcastForm, setBroadcastForm] = useState<EmergencyBroadcastState>({
    is_active: false,
    message_bn: '',
    message_en: '',
    level: 'INFO',
  });
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastNotice, setBroadcastNotice] = useState<{ msg: string; err?: boolean } | null>(null);

  // Maker-Checker & Appeals state (Tier C Sections 8.7 & 8.8)
  const [onboardingBatches, setOnboardingBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [appealsList, setAppealsList] = useState<any[]>([]);
  const [onbAppealsSubTab, setOnbAppealsSubTab] = useState<'batches' | 'appeals'>('batches');
  const [onbNotice, setOnbNotice] = useState<{ msg: string; err?: boolean } | null>(null);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [isCreatingAppeal, setIsCreatingAppeal] = useState(false);
  const [batchForm, setBatchForm] = useState({
    record_type: 'DEED_DRAFT',
    dag_no: '125',
    mouza: 'Birulia',
    seller_name: 'আব্দুল কাদের',
    buyer_name: 'মো. রফিকুল ইসলাম',
    area_decimal: '8.5',
    declared_value_bdt: '1850000',
  });
  const [appealForm, setAppealForm] = useState({
    plot_id: 8,
    mutation_id: 1,
    appellant_name_bn: 'মোসা. রাবেয়া খাতুন',
    appellant_nid: '9900001002',
    reason_bn: 'সহকারী কমিশনার (ভূমি) কর্তৃক নামজারি স্থগিতাদেশের বিরুদ্ধে অতিরিক্ত জেলা প্রশাসক (রাজস্ব) মহোদয় সমীপে আপিল।',
  });
  const [appealDecisionModal, setAppealDecisionModal] = useState<{
    appeal: any;
    status: string;
    note: string;
  } | null>(null);

  const [ledgerState, setLedgerState] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [ocrSample, setOcrSample] = useState<any | null>(null);
  const [permissionsData, setPermissionsData] = useState<any | null>(null);
  const [stats, setStats] = useState<any>(null);

  // Simulated SMS / OTP Outbox Viewer state (Prompt v3 Section 5)
  const [outboxItems, setOutboxItems] = useState<any[]>([]);
  const [outboxLoading, setOutboxLoading] = useState(false);
  const [outboxFilterPhone, setOutboxFilterPhone] = useState('');
  const [outboxEnvironment, setOutboxEnvironment] = useState('development');
  const [outboxCopiedId, setOutboxCopiedId] = useState<number | null>(null);

  // Users Management state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'pending' | 'verified' | 'disabled'>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userJoinDateFilter, setUserJoinDateFilter] = useState<'all' | 'today' | '7days' | '30days' | 'custom'>('all');
  const [userDateFrom, setUserDateFrom] = useState('');
  const [userDateTo, setUserDateTo] = useState('');
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newNameBn, setNewNameBn] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('sub_registrar');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNid, setNewNid] = useState('');
  const [newOffice, setNewOffice] = useState('');
  const [newOfficeId, setNewOfficeId] = useState<number>(0);
  const [officesList, setOfficesList] = useState<any[]>([]);
  const [userActionNotice, setUserActionNotice] = useState<{ msg: string; err?: boolean } | null>(null);

  // Dedicated Role Workspaces State (R08)
  // 1. Tickets Desk (support_agent)
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketFilter, setTicketFilter] = useState<'ALL' | 'NEW' | 'IN_PROGRESS' | 'WAITING_CITIZEN' | 'RESOLVED'>('ALL');
  const [ticketSearch, setTicketSearch] = useState('');
  const [selectedTicketCode, setSelectedTicketCode] = useState<string | null>(null);
  const [selectedTicketDetail, setSelectedTicketDetail] = useState<any | null>(null);
  const [ticketDetailLoading, setTicketDetailLoading] = useState(false);
  const [ticketReplyMsg, setTicketReplyMsg] = useState('');
  const [ticketReplyStatus, setTicketReplyStatus] = useState<'IN_PROGRESS' | 'WAITING_CITIZEN' | 'RESOLVED'>('IN_PROGRESS');
  const [ticketIsInternal, setTicketIsInternal] = useState(false);
  const [ticketActionNotice, setTicketActionNotice] = useState<{ msg: string; err?: boolean } | null>(null);

  // 2. Content Workflow (content_editor & content_approver)
  const [managedContent, setManagedContent] = useState<any[]>([]);
  const [managedContentLoading, setManagedContentLoading] = useState(false);
  const [contentKind, setContentKind] = useState<'blog' | 'notice'>('blog');
  const [contentStatusFilter, setContentStatusFilter] = useState<'ALL' | 'DRAFT' | 'SUBMITTED' | 'PUBLISHED' | 'REJECTED'>('ALL');
  const [isCreateContentOpen, setIsCreateContentOpen] = useState(false);
  const [contentForm, setContentForm] = useState<{ id?: number; kind: 'blog' | 'notice'; title_bn: string; title_en: string; body_bn: string; body_en: string }>({
    kind: 'blog',
    title_bn: '',
    title_en: '',
    body_bn: '',
    body_en: '',
  });
  const [selectedContentPreview, setSelectedContentPreview] = useState<any | null>(null);
  const [contentActionNotice, setContentActionNotice] = useState<{ msg: string; err?: boolean } | null>(null);

  // 3. Marketplace Moderation (platform_moderator)
  const [moderationList, setModerationList] = useState<any[]>([]);
  const [moderationLoading, setModerationLoading] = useState(false);
  const [moderationFilter, setModerationFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [moderationActionNotice, setModerationActionNotice] = useState<{ msg: string; err?: boolean } | null>(null);

  // Service Catalogue & Fees State (Phase 2)
  const [adminServices, setAdminServices] = useState<ServiceCatalogueItem[]>([]);
  const [adminFees, setAdminFees] = useState<ServiceFeeItem[]>([]);
  const [catalogueSubTab, setCatalogueSubTab] = useState<'services' | 'fees'>('services');
  const [selectedFeeHistory, setSelectedFeeHistory] = useState<ServiceFeeItem | null>(null);
  const [editingService, setEditingService] = useState<Partial<ServiceCatalogueItem> | null>(null);
  const [editingFee, setEditingFee] = useState<Partial<ServiceFeeItem> | null>(null);
  const [catalogueNotice, setCatalogueNotice] = useState<{ msg: string; err?: boolean } | null>(null);
  const [adminServiceCatFilter, setAdminServiceCatFilter] = useState<string>('ALL');

  // Plots & Land Control Management State
  const [plotsList, setPlotsList] = useState<any[]>([]);
  const [plotsLoading, setPlotsLoading] = useState(false);
  const [plotFilter, setPlotFilter] = useState<'ALL' | 'LOCKED' | 'UNLOCKED' | 'MORTGAGED' | 'DISPUTED' | 'FROZEN'>('ALL');
  const [plotSearchQuery, setPlotSearchQuery] = useState('');
  const [selectedPlotDetail, setSelectedPlotDetail] = useState<any | null>(null);
  const [plotDetailLoading, setPlotDetailLoading] = useState(false);
  const [allDisputes, setAllDisputes] = useState<any[]>([]);
  const [allMortgages, setAllMortgages] = useState<any[]>([]);
  const [plotActionNotice, setPlotActionNotice] = useState<{ msg: string; err?: boolean } | null>(null);

  // Super Admin Deeds Supervision State
  const [deedsData, setDeedsData] = useState<AdminDeedsResponse>({
    items: [],
    total: 0,
    page: 1,
    per_page: 15,
    kpis: {
      total_deeds: 0,
      total_volume_bdt: 0,
      mutated_deeds: 0,
      flagged_deeds: 0,
      registered_deeds: 0,
    },
  });
  const [deedsLoading, setDeedsLoading] = useState(false);
  const [deedSearchQuery, setDeedSearchQuery] = useState('');
  const [deedStatusFilter, setDeedStatusFilter] = useState('ALL');
  const [deedTypeFilter, setDeedTypeFilter] = useState('ALL');
  const [deedDateFrom, setDeedDateFrom] = useState('');
  const [deedDateTo, setDeedDateTo] = useState('');
  const [deedDivision, setDeedDivision] = useState('');
  const [deedDistrict, setDeedDistrict] = useState('');
  const [deedUpazila, setDeedUpazila] = useState('');
  const [deedMouzaId, setDeedMouzaId] = useState<number | string>('');
  const [deedPage, setDeedPage] = useState(1);
  const [selectedDeedDocket, setSelectedDeedDocket] = useState<AdminDeedDetailResponse | null>(null);
  const [deedDocketLoading, setDeedDocketLoading] = useState(false);
  const [flagDeedModal, setFlagDeedModal] = useState<{ deed: AdminDeedItem; action: 'HOLD' | 'CLEAR'; reason: string } | null>(null);
  const [deedActionNotice, setDeedActionNotice] = useState<{ msg: string; err?: boolean } | null>(null);

  // Administrative Address Hierarchy CRUD State
  const [hierarchyTree, setHierarchyTree] = useState<HierarchyDivisionItem[]>([]);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [activeHierarchyTier, setActiveHierarchyTier] = useState<'MOUZAS' | 'UPAZILAS' | 'DISTRICTS' | 'DIVISIONS'>('MOUZAS');
  const [hierarchySearch, setHierarchySearch] = useState('');
  const [hierarchyDivisionFilter, setHierarchyDivisionFilter] = useState('');
  const [hierarchyDistrictFilter, setHierarchyDistrictFilter] = useState('');
  const [hierarchyUpazilaFilter, setHierarchyUpazilaFilter] = useState('');
  const [isAddMouzaOpen, setIsAddMouzaOpen] = useState(false);
  const [editingMouza, setEditingMouza] = useState<any | null>(null);
  const [mouzaForm, setMouzaForm] = useState({
    division_bn: 'ঢাকা',
    division_en: 'Dhaka',
    district_bn: 'ঢাকা',
    district_en: 'Dhaka',
    upazila_bn: 'সাভার',
    upazila_en: 'Savar',
    mouza_bn: '',
    mouza_en: '',
    jl_no: '',
    latitude: '',
    longitude: '',
  });
  const [renamingTierModal, setRenamingTierModal] = useState<{ tier: 'DIVISION' | 'DISTRICT' | 'UPAZILA'; old_bn: string; new_bn: string; new_en: string } | null>(null);
  const [hierarchyNotice, setHierarchyNotice] = useState<{ msg: string; err?: boolean } | null>(null);

  // Site Settings state
  const [settingsList, setSettingsList] = useState<any[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [saveMsg, setSaveMsg] = useState('');
  const [loadError, setLoadError] = useState('');

  // Super Admin OS Workspace State
  const [superAdminStats, setSuperAdminStats] = useState<any | null>(null);
  const [transfersList, setTransfersList] = useState<any[]>([]);
  const [mutationsList, setMutationsList] = useState<any[]>([]);
  const [fieldReportsList, setFieldReportsList] = useState<any[]>([]);
  const [slaDispatchesList, setSlaDispatchesList] = useState<any[]>([]);
  const [acquisitionCasesList, setAcquisitionCasesList] = useState<any[]>([]);
  const [officesSubSegment, setOfficesSubSegment] = useState<'offices' | 'hierarchy' | 'document_security' | 'lawyers'>('offices');
  const [overrideModal, setOverrideModal] = useState<{
    isOpen: boolean;
    actionType: string;
    targetId: string | number;
    extraContext?: any;
  }>({
    isOpen: false,
    actionType: 'ADMINISTRATIVE_OVERRIDE',
    targetId: '',
    extraContext: null,
  });

  const refreshAll = async () => {
    let hadCriticalError = false;
    const results = await Promise.allSettled([
      BhumiApi.getLedgerState().catch((err) => {
        console.error('Ledger state fetch failed:', err);
        hadCriticalError = true;
        return null;
      }),
      BhumiApi.getAuditLogs().catch(() => ({ items: [], total: 0 })),
      BhumiApi.getOcrSample().catch(() => null),
      BhumiApi.listUsers().catch(() => ({ items: [], total: 0 })),
      BhumiApi.getSettings().catch(() => ({ items: [], map: {}, settings: {} })),
      BhumiApi.getPermissions().catch(() => ({ roles: [], permissions: [] })),
      BhumiApi.getStatsSummary().catch(() => null),
      BhumiApi.listAdminServices().catch(() => ({ items: [], total: 0 })),
      BhumiApi.listAdminFees().catch(() => ({ items: [], total: 0 })),
      BhumiApi.listOnboardingBatches().catch(() => ({ items: [] })),
      BhumiApi.listAppeals().catch(() => ({ items: [] })),
      BhumiApi.getPlots().catch(() => []),
      BhumiApi.listDisputes().catch(() => []),
      BhumiApi.getMortgages().catch(() => []),
      BhumiApi.listAdminDeeds().catch(() => ({ items: [], total: 0, page: 1, per_page: 15, kpis: { total_deeds: 0, total_volume_bdt: 0, mutated_deeds: 0, flagged_deeds: 0, registered_deeds: 0 } })),
      BhumiApi.getHierarchyTree().catch(() => []),
      BhumiApi.listOffices().catch(() => []),
      BhumiApi.listTickets().catch(() => ({ items: [] })),
      BhumiApi.getLiveAnomalies().catch(() => null),
      BhumiApi.getEmergencyBroadcast().catch(() => null),
      BhumiApi.getSuperAdminDashboardStats().catch(() => null),
      BhumiApi.listTransfers().catch(() => ({ transfers: [] })),
      BhumiApi.getMutations().catch(() => []),
      BhumiApi.listFieldReports().catch(() => []),
      BhumiApi.listSlaDispatches().catch(() => []),
      BhumiApi.listAcquisitionCases().catch(() => ({ cases: [] })),
    ]);
    const setters: ((value: any) => void)[] = [
      (val) => val && setLedgerState(val),
      setAuditLogs,
      setOcrSample,
      setUsersList,
      (value) => { setSettingsList(value?.items || []); setSettingsMap(value?.map || value?.settings || {}); },
      setPermissionsData,
      (val) => val && setStats(val),
      (value) => setAdminServices(value?.items || []),
      (value) => setAdminFees(value?.items || []),
      (value) => setOnboardingBatches(value?.items || []),
      (value) => setAppealsList(value?.items || []),
      (value) => setPlotsList(Array.isArray(value) ? value : (value?.items || [])),
      (value) => setAllDisputes(Array.isArray(value) ? value : (value?.items || [])),
      (value) => setAllMortgages(Array.isArray(value) ? value : (value?.mortgages || value?.items || [])),
      (value) => setDeedsData(value || { items: [], total: 0, page: 1, per_page: 15, kpis: { total_deeds: 0, total_volume_bdt: 0, mutated_deeds: 0, flagged_deeds: 0, registered_deeds: 0 } }),
      (value) => setHierarchyTree(Array.isArray(value) ? value : (value?.items || [])),
      (value) => setOfficesList(Array.isArray(value) ? value : (value?.items || [])),
      (value) => setTicketsList(Array.isArray(value) ? value : (value?.items || [])),
      (value) => value && setAnomaliesData(value),
      (value) => value && setBroadcastForm(value),
      (val) => val && setSuperAdminStats(val),
      (val) => setTransfersList(Array.isArray(val) ? val : (val?.transfers || val?.items || [])),
      (val) => setMutationsList(Array.isArray(val) ? val : (val?.mutations || val?.items || [])),
      (val) => setFieldReportsList(Array.isArray(val) ? val : (val?.reports || val?.items || [])),
      (val) => setSlaDispatchesList(Array.isArray(val) ? val : (val?.dispatches || val?.items || [])),
      (val) => setAcquisitionCasesList(Array.isArray(val) ? val : (val?.cases || val?.items || [])),
    ];
    results.forEach((result, i) => { if (result.status === 'fulfilled') setters[i](result.value); });
    setLoadError(hadCriticalError
      ? t('কিছু তথ্য লোড হয়নি। আবার চেষ্টা করুন।', 'Some records could not be loaded. Please retry.') : '');
  };

  const handleAdminToggleSaleLock = async (plot: any) => {
    try {
      setPlotsLoading(true);
      const isLocked = Number(plot.owner_sale_locked) === 1;
      const targetState = !isLocked;
      const reason = targetState
        ? (lang === 'bn' ? 'ভূমি ব্যবস্থাপনা কর্তৃপক্ষ কর্তৃক বিক্রয় সুরক্ষা লক সক্রিয়' : 'Sale protection lock activated by system administrator')
        : (lang === 'bn' ? 'ভূমি ব্যবস্থাপনা কর্তৃপক্ষ কর্তৃক বিক্রয় সুরক্ষা লক উন্মুক্তকরণ' : 'Sale protection lock released by system administrator');
      await BhumiApi.togglePlotSaleLock(plot.id, reason);
      setPlotActionNotice({
        msg: lang === 'bn'
          ? `দাগ নং ${plot.dag_no_bn || plot.dag_no}-এর বিক্রয় সুরক্ষা ${targetState ? 'সফলভাবে সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে।`
          : `Sale protection for Plot ${plot.dag_no} was successfully ${targetState ? 'locked' : 'unlocked'}.`,
        err: false,
      });
      refreshAll();
    } catch {
      setPlotActionNotice({
        msg: lang === 'bn' ? 'বিক্রয় লক পরিবর্তনে ত্রুটি হয়েছে।' : 'Failed to toggle sale lock.',
        err: true,
      });
    } finally {
      setPlotsLoading(false);
    }
  };

  const handleInspectPlot = async (plotId: number) => {
    try {
      setPlotDetailLoading(true);
      const detail = await BhumiApi.getPlotDetail(plotId);
      setSelectedPlotDetail(detail);
    } catch (e) {
      console.error('Failed to load plot detail', e);
    } finally {
      setPlotDetailLoading(false);
    }
  };

  const fetchOutbox = async () => {
    setOutboxLoading(true);
    try {
      const res = await BhumiApi.listSmsOutbox({ phone: outboxFilterPhone || undefined, limit: 100 });
      setOutboxItems(res.items || []);
      setOutboxEnvironment(res.environment || 'development');
    } catch (e: any) {
      console.error('Failed to load SMS outbox', e);
    } finally {
      setOutboxLoading(false);
    }
  };

  const fetchDeeds = async (overrides?: any) => {
    setDeedsLoading(true);
    try {
      const q = overrides?.q !== undefined ? overrides.q : deedSearchQuery;
      const status = overrides?.status !== undefined ? overrides.status : deedStatusFilter;
      const deed_type = overrides?.deed_type !== undefined ? overrides.deed_type : deedTypeFilter;
      const division_bn = overrides?.division_bn !== undefined ? overrides.division_bn : deedDivision;
      const district_bn = overrides?.district_bn !== undefined ? overrides.district_bn : deedDistrict;
      const upazila_bn = overrides?.upazila_bn !== undefined ? overrides.upazila_bn : deedUpazila;
      const mouza_id = overrides?.mouza_id !== undefined ? overrides.mouza_id : deedMouzaId;
      const date_from = overrides?.date_from !== undefined ? overrides.date_from : deedDateFrom;
      const date_to = overrides?.date_to !== undefined ? overrides.date_to : deedDateTo;
      const page = overrides?.page !== undefined ? overrides.page : deedPage;

      const params: any = { page };
      if (q) params.q = q;
      if (status && status !== 'ALL') params.status = status;
      if (deed_type && deed_type !== 'ALL') params.deed_type = deed_type;
      if (division_bn) params.division_bn = division_bn;
      if (district_bn) params.district_bn = district_bn;
      if (upazila_bn) params.upazila_bn = upazila_bn;
      if (mouza_id) params.mouza_id = mouza_id;
      if (date_from) params.date_from = date_from;
      if (date_to) params.date_to = date_to;

      const res = await BhumiApi.listAdminDeeds(params);
      setDeedsData(res);
    } catch (err: any) {
      console.error('Failed to list admin deeds', err);
    } finally {
      setDeedsLoading(false);
    }
  };

  const fetchHierarchyTree = async () => {
    setHierarchyLoading(true);
    try {
      const tree = await BhumiApi.getHierarchyTree();
      setHierarchyTree(tree || []);
    } catch (err: any) {
      console.error('Failed to load hierarchy tree', err);
    } finally {
      setHierarchyLoading(false);
    }
  };

  const handleInspectDeed = async (deedId: number) => {
    setDeedDocketLoading(true);
    try {
      const docket = await BhumiApi.getAdminDeedDetail(deedId);
      setSelectedDeedDocket(docket);
    } catch (err: any) {
      setDeedActionNotice({ msg: err?.response?.data?.error || 'দলিল বিস্তারিত লোড করতে ব্যর্থ হয়েছে।', err: true });
    } finally {
      setDeedDocketLoading(false);
    }
  };

  const handleConfirmFlagDeed = async () => {
    if (!flagDeedModal) return;
    try {
      const res = await BhumiApi.flagAdminDeed(flagDeedModal.deed.id, {
        action: flagDeedModal.action,
        flag_reason_bn: flagDeedModal.reason || (flagDeedModal.action === 'HOLD' ? 'প্রশাসনিক তদন্তের স্বার্থে সাময়িক স্থগিতাদেশ জারি।' : 'স্থগিতাদেশ প্রত্যাহার ও রেকর্ড অবমুক্তকরণ।'),
      });
      setDeedActionNotice({ msg: res.message_bn });
      setFlagDeedModal(null);
      fetchDeeds();
      if (selectedDeedDocket && Number(selectedDeedDocket.deed?.id) === Number(flagDeedModal.deed.id)) {
        handleInspectDeed(flagDeedModal.deed.id);
      }
      setTimeout(() => setDeedActionNotice(null), 4000);
    } catch (err: any) {
      setDeedActionNotice({ msg: err?.response?.data?.error || 'অ্যাকশন সম্পন্ন করতে ব্যর্থ হয়েছে।', err: true });
    }
  };

  const handleSaveMouza = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        division_bn: mouzaForm.division_bn,
        division_en: mouzaForm.division_en,
        district_bn: mouzaForm.district_bn,
        district_en: mouzaForm.district_en,
        upazila_bn: mouzaForm.upazila_bn,
        upazila_en: mouzaForm.upazila_en,
        mouza_bn: mouzaForm.mouza_bn,
        mouza_en: mouzaForm.mouza_en,
        jl_no: mouzaForm.jl_no,
        latitude: mouzaForm.latitude ? Number(mouzaForm.latitude) : null,
        longitude: mouzaForm.longitude ? Number(mouzaForm.longitude) : null,
      };
      if (editingMouza && editingMouza.id) {
        const res = await BhumiApi.updateHierarchyMouza(editingMouza.id, payload);
        setHierarchyNotice({ msg: res.message_bn });
      } else {
        const res = await BhumiApi.createHierarchyMouza(payload);
        setHierarchyNotice({ msg: res.message_bn });
      }
      setIsAddMouzaOpen(false);
      setEditingMouza(null);
      fetchHierarchyTree();
      setTimeout(() => setHierarchyNotice(null), 4000);
    } catch (err: any) {
      setHierarchyNotice({ msg: err?.response?.data?.error || 'মৌজা সংরক্ষণে ব্যর্থ হয়েছে।', err: true });
    }
  };

  const handleDeleteMouza = async (mouza: HierarchyMouzaItem) => {
    if (mouza.plots_count > 0) {
      alert(
        lang === 'bn'
          ? `সতর্কতা: এই মৌজায় (${mouza.mouza_bn}) ${mouza.plots_count}টি সক্রিয় প্লট বা দাগ সংযুক্ত রয়েছে! কোনো দাগ বা দলিল সংযুক্ত থাকলে মৌজা মুছে ফেলা সম্পূর্ণ নিষিদ্ধ।`
          : `Forbidden: Mouza has ${mouza.plots_count} active plots attached. Deletion is blocked.`
      );
      return;
    }
    const confirmMsg =
      lang === 'bn'
        ? `আপনি কি নিশ্চিতভাবে "${mouza.mouza_bn}" মৌজাটি ডিলিট করতে চান?`
        : `Are you sure you want to delete mouza "${mouza.mouza_bn}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await BhumiApi.deleteHierarchyMouza(mouza.id);
      setHierarchyNotice({ msg: res.message_bn });
      fetchHierarchyTree();
      setTimeout(() => setHierarchyNotice(null), 4000);
    } catch (err: any) {
      setHierarchyNotice({ msg: err?.response?.data?.error || 'মুছে ফেলতে ব্যর্থ হয়েছে।', err: true });
    }
  };

  const handleSaveRenameTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingTierModal) return;
    try {
      const res = await BhumiApi.renameHierarchyTier({
        tier: renamingTierModal.tier,
        old_bn: renamingTierModal.old_bn,
        new_bn: renamingTierModal.new_bn,
        new_en: renamingTierModal.new_en,
      });
      setHierarchyNotice({ msg: res.message_bn });
      setRenamingTierModal(null);
      fetchHierarchyTree();
      setTimeout(() => setHierarchyNotice(null), 4000);
    } catch (err: any) {
      setHierarchyNotice({ msg: err?.response?.data?.error || 'নাম পরিবর্তনে ত্রুটি হয়েছে।', err: true });
    }
  };

  // 1. Run Complete Cryptographic Ledger Health Check
  const handleRunLedgerHealthCheck = async () => {
    try {
      setHealthCheckLoading(true);
      const res = await BhumiApi.runLedgerHealthCheck();
      setHealthCheckData(res);
    } catch (e: any) {
      console.error(e);
    } finally {
      setHealthCheckLoading(false);
    }
  };

  // 2. 1-Click Sovereign Database Backup Exporter
  const handleExportDatabaseBackup = async () => {
    try {
      setBackupLoading(true);
      const res = await BhumiApi.exportDatabaseBackup();
      setBackupData(res);
    } catch (e: any) {
      console.error(e);
    } finally {
      setBackupLoading(false);
    }
  };

  // 3. Emergency Platform Broadcast Save & Publish
  const handleSaveBroadcast = async () => {
    try {
      setBroadcastLoading(true);
      const res = await BhumiApi.updateEmergencyBroadcast(broadcastForm);
      setBroadcastForm(res);
      setBroadcastNotice({ msg: res.message_bn || 'জরুরি ব্রডকাস্ট সফলভাবে প্রচার করা হয়েছে।' });
      window.dispatchEvent(new CustomEvent('emergency-broadcast-updated', { detail: res }));
      setTimeout(() => setBroadcastNotice(null), 4000);
    } catch (e: any) {
      setBroadcastNotice({ msg: e.message || 'ব্রডকাস্ট সংরক্ষণ ব্যর্থ হয়েছে।', err: true });
    } finally {
      setBroadcastLoading(false);
    }
  };

  // 4. Officer Transfer & Office Re-assignment
  const handleExecuteTransfer = async () => {
    if (!transferOfficerUser || !transferTargetOfficeId) return;
    try {
      setTransferLoading(true);
      const res = await BhumiApi.transferOfficer(transferOfficerUser.id, {
        new_office_id: transferTargetOfficeId,
        transfer_order_ref: transferOrderRef || undefined,
        notes: transferNotes || undefined,
      });
      setTransferNotice({ msg: res.message_bn });
      setUsersList((prev) =>
        prev.map((u) =>
          u.id === transferOfficerUser.id
            ? { ...u, office_bn: res.new_office, office_name: res.new_office }
            : u
        )
      );
      setTransferOfficerUser(null);
      setTransferTargetOfficeId(0);
      setTransferOrderRef('');
      setTransferNotes('');
      setTimeout(() => setTransferNotice(null), 4000);
    } catch (e: any) {
      setTransferNotice({ msg: e.message || 'বদলি সম্পন্ন করা সম্ভব হয়নি।', err: true });
    } finally {
      setTransferLoading(false);
    }
  };

  // 5. Master Administrative Plot Freeze / Hold
  const handleExecutePlotFreeze = async () => {
    if (!freezeModalPlot) return;
    try {
      setFreezeLoading(true);
      const targetIsFrozen = !(Number(freezeModalPlot.is_admin_frozen) === 1);
      const finalReason = freezeCustomReason.trim() ? freezeCustomReason.trim() : freezeReason;
      const res = await BhumiApi.toggleAdminPlotFreeze(freezeModalPlot.id, {
        is_frozen: targetIsFrozen,
        reason: finalReason,
      });
      setPlotActionNotice({ msg: res.message_bn });
      setPlotsList((prev) =>
        prev.map((p) =>
          p.id === freezeModalPlot.id
            ? {
                ...p,
                is_admin_frozen: res.is_admin_frozen ? 1 : 0,
                admin_freeze_reason: res.admin_freeze_reason,
              }
            : p
        )
      );
      setFreezeModalPlot(null);
      setFreezeCustomReason('');
      BhumiApi.getLiveAnomalies().then((a) => a && setAnomaliesData(a)).catch(() => {});
      setTimeout(() => setPlotActionNotice(null), 4000);
    } catch (e: any) {
      setPlotActionNotice({ msg: e.message || 'স্থগিতাদেশ কার্যকর করা সম্ভব হয়নি।', err: true });
    } finally {
      setFreezeLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    const timer = setInterval(() => {
      refreshAll();
    }, 8000);
    const onFocus = () => refreshAll();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    if (subTab === 'dev_outbox' || (subTab === 'settings' && settingsSubSegment === 'diagnostics')) {
      fetchOutbox();
    }
    if (subTab === 'deeds' || (subTab === 'plots_control' && plotsSubSegment === 'deeds')) {
      fetchDeeds();
    }
    if (subTab === 'hierarchy' || (subTab === 'plots_control' && plotsSubSegment === 'hierarchy')) {
      fetchHierarchyTree();
    }
    if (subTab === 'tickets' || (subTab === 'settings' && settingsSubSegment === 'tickets')) {
      fetchTickets();
    }
    if (subTab === 'content_editor' || subTab === 'content_approver') {
      fetchManagedContent(contentKind);
    }
    if (subTab === 'marketplace_moderation') {
      fetchModerationList();
    }
  }, [subTab, plotsSubSegment, settingsSubSegment, contentKind]);

  useEffect(() => {
    const { pillar, segment } = mapLegacyToPillar(activeSubTab);
    setSubTab(pillar);
    if (pillar === 'users' && segment) setUsersSubSegment(segment as any);
    if (pillar === 'plots_control' && segment) setPlotsSubSegment(segment as any);
    if (pillar === 'ledger' && segment) setLedgerSubSegment(segment as any);
    if (pillar === 'settings' && segment) setSettingsSubSegment(segment as any);
  }, [activeSubTab, role]);

  useEffect(() => {
    if (adminUserRoleFilter && adminUserRoleFilter !== userRoleFilter) {
      setUserRoleFilter(adminUserRoleFilter);
    }
  }, [adminUserRoleFilter]);

  const handleRoleSelectChange = (newRoleVal: string) => {
    setUserRoleFilter(newRoleVal);
    if (setAdminUserRoleFilter) {
      setAdminUserRoleFilter(newRoleVal);
    }
  };

  const formatUserDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const formatted = `${day}/${month}/${year}`;
      return lang === 'bn' ? toBanglaDigits(formatted, 'bn') : formatted;
    } catch {
      return dateStr;
    }
  };

  const handleTabChange = (target: AdminTab) => {
    setSubTab(target);
    setActiveSubTab(target);
  };

  const fetchTickets = async () => {
    setTicketsLoading(true);
    try {
      const res = await BhumiApi.listTickets();
      const items = Array.isArray(res) ? res : (res?.items || []);
      setTicketsList(items);
      if (items.length > 0 && !selectedTicketCode) {
        setSelectedTicketCode(items[0].ticket_code || items[0].id);
      }
    } catch (e) {
      console.error('Failed to list tickets', e);
    } finally {
      setTicketsLoading(false);
    }
  };

  const fetchTicketDetail = async (code: string | number) => {
    setTicketDetailLoading(true);
    try {
      const res = await BhumiApi.getTicket(code);
      setSelectedTicketDetail(res);
    } catch (e) {
      console.error('Failed to get ticket detail', e);
    } finally {
      setTicketDetailLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTicketCode) {
      fetchTicketDetail(selectedTicketCode);
    }
  }, [selectedTicketCode]);

  const handleSendTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketCode || !ticketReplyMsg.trim()) return;
    try {
      const updated = await BhumiApi.replyTicket(selectedTicketCode, {
        message: ticketReplyMsg.trim(),
        status: ticketReplyStatus,
        internal_note: ticketIsInternal,
      });
      setSelectedTicketDetail(updated);
      setTicketReplyMsg('');
      setTicketIsInternal(false);
      setTicketActionNotice({
        msg: lang === 'bn' ? 'উত্তর ও স্ট্যাটাস সফলভাবে আপডেট করা হয়েছে।' : 'Reply and status updated successfully.',
      });
      fetchTickets();
      setTimeout(() => setTicketActionNotice(null), 4000);
    } catch (err: any) {
      setTicketActionNotice({
        msg: err?.response?.data?.message_bn || err?.message || 'টিকেট উত্তর পাঠাতে ত্রুটি হয়েছে।',
        err: true,
      });
      setTimeout(() => setTicketActionNotice(null), 4000);
    }
  };

  const fetchManagedContent = async (kind: 'blog' | 'notice' = contentKind) => {
    setManagedContentLoading(true);
    try {
      const res = await BhumiApi.listManagedContent({ kind });
      setManagedContent(res?.items || []);
    } catch (e) {
      console.error('Failed to list managed content', e);
    } finally {
      setManagedContentLoading(false);
    }
  };

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await BhumiApi.saveManagedContent(contentForm, contentForm.id);
      setIsCreateContentOpen(false);
      setContentForm({ kind: contentKind, title_bn: '', title_en: '', body_bn: '', body_en: '' });
      setContentActionNotice({
        msg: lang === 'bn' ? 'খসড়া সফলভাবে সংরক্ষিত হয়েছে।' : 'Draft saved successfully.',
      });
      fetchManagedContent(contentKind);
      setTimeout(() => setContentActionNotice(null), 4000);
    } catch (err: any) {
      setContentActionNotice({
        msg: err?.response?.data?.message_bn || err?.message || 'খসড়া সংরক্ষণে ত্রুটি হয়েছে।',
        err: true,
      });
      setTimeout(() => setContentActionNotice(null), 4000);
    }
  };

  const handleTransitionContent = async (id: number, kind: 'blog' | 'notice', status: string) => {
    try {
      await BhumiApi.transitionManagedContent(id, { kind, status });
      setContentActionNotice({
        msg: lang === 'bn'
          ? (status === 'SUBMITTED' ? 'পর্যালোচনার জন্য দাখিল করা হয়েছে।' : status === 'PUBLISHED' ? 'সফলভাবে প্রকাশিত হয়েছে।' : 'প্রত্যাখ্যাত হয়েছে।')
          : `Status changed to ${status}.`,
      });
      fetchManagedContent(kind);
      setSelectedContentPreview(null);
      setTimeout(() => setContentActionNotice(null), 4000);
    } catch (err: any) {
      setContentActionNotice({
        msg: err?.response?.data?.message_bn || err?.message || 'স্ট্যাটাস পরিবর্তনে ত্রুটি হয়েছে।',
        err: true,
      });
      setTimeout(() => setContentActionNotice(null), 5000);
    }
  };

  const fetchModerationList = async () => {
    setModerationLoading(true);
    try {
      const res = await BhumiApi.listManagedContent({ kind: 'listing' });
      setModerationList(res?.items || []);
    } catch (e) {
      console.error('Failed to list listings for moderation', e);
    } finally {
      setModerationLoading(false);
    }
  };

  const handleTransitionListing = async (id: number, status: 'ACTIVE' | 'SUSPENDED') => {
    try {
      await BhumiApi.transitionManagedContent(id, { kind: 'listing', status });
      setModerationActionNotice({
        msg: lang === 'bn'
          ? (status === 'ACTIVE' ? 'লিস্টিংটি সফলভাবে সক্রিয় করা হয়েছে।' : 'লিস্টিংটি সাময়িক স্থগিত করা হয়েছে।')
          : `Listing status updated to ${status}.`,
      });
      fetchModerationList();
      setTimeout(() => setModerationActionNotice(null), 4000);
    } catch (err: any) {
      setModerationActionNotice({
        msg: err?.response?.data?.message_bn || err?.message || 'লিস্টিং স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।',
        err: true,
      });
      setTimeout(() => setModerationActionNotice(null), 4000);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const officeRequired = !['citizen', 'admin', 'system_admin', 'auditor', 'support_agent', 'content_editor', 'content_approver', 'platform_moderator'].includes(newRole);
      if (officeRequired && (!newOfficeId || newOfficeId <= 0)) {
        setUserActionNotice({
          msg: lang === 'bn' ? 'কর্মকর্তার কার্যালয় নির্বাচন করুন।' : 'Please select an active office for this officer.',
          err: true,
        });
        return;
      }

      const selOffice = officesList.find((o) => Number(o.id) === Number(newOfficeId));
      const officeBn = selOffice ? selOffice.name_bn : newOffice.trim();
      const officeEn = selOffice ? (selOffice.name_en || selOffice.name_bn) : newOffice.trim();

      await BhumiApi.createUser({
        username: newUsername.trim(),
        password: newPassword,
        full_name_bn: newNameBn.trim(),
        full_name_en: newNameEn.trim() || newNameBn.trim(),
        role: newRole,
        nid: newNid.trim(),
        phone_dummy: newPhone.trim(),
        email: newEmail.trim() || undefined,
        office_id: officeRequired && newOfficeId > 0 ? Number(newOfficeId) : undefined,
        office_bn: officeBn,
        office_en: officeEn,
      });
      setUserActionNotice({
        msg: lang === 'bn'
          ? `নতুন ব্যবহারকারী @${newUsername} (${newRole}) সফলভাবে তৈরি ও সক্রিয় করা হয়েছে।`
          : `User @${newUsername} (${newRole}) created and activated successfully.`,
      });
      setNewUsername('');
      setNewNameBn('');
      setNewNameEn('');
      setNewEmail('');
      setNewPhone('');
      setNewNid('');
      setNewPassword('');
      setIsCreateUserOpen(false);
      refreshAll();
      setTimeout(() => setUserActionNotice(null), 5000);
    } catch (err: any) {
      setUserActionNotice({
        msg: err?.response?.data?.detail?.message_bn || err?.response?.data?.message_bn || err?.message || 'ব্যবহারকারী তৈরি করতে ত্রুটি হয়েছে।',
        err: true,
      });
      setTimeout(() => setUserActionNotice(null), 5000);
    }
  };

  const handleToggleUserStatus = async (u: any) => {
    await BhumiApi.updateUser(u.id, {
      role: u.role,
      is_active: u.is_active ? 0 : 1,
      office_bn: u.office_name,
    });
    refreshAll();
  };

  const handleChangeUserRole = async (u: any, updatedRole: string) => {
    await BhumiApi.updateUser(u.id, {
      role: updatedRole,
      is_active: u.is_active,
      office_bn: u.office_name,
    });
    refreshAll();
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await BhumiApi.deleteUser(id);
      setUserActionNotice({
        msg: lang === 'bn' ? 'ব্যবহারকারী সফলভাবে অপসারণ করা হয়েছে।' : 'User removed successfully.',
      });
      refreshAll();
      setTimeout(() => setUserActionNotice(null), 4000);
    } catch {
      setUserActionNotice({
        msg: lang === 'bn' ? 'ব্যবহারকারী অপসারণ করা সম্ভব হয়নি।' : 'Failed to remove user.',
        err: true,
      });
      setTimeout(() => setUserActionNotice(null), 4000);
    }
  };

  const handleVerifyCitizen = async (userId: number) => {
    try {
      const res = await BhumiApi.verifyCitizenIdentity(userId);
      setUserActionNotice({
        msg: res.message_bn || 'নাগরিকের জাতীয় পরিচয়পত্র ও প্রোফাইল সফলভাবে যাচাই ও অনুমোদন করা হয়েছে।',
      });
      refreshAll();
      setTimeout(() => setUserActionNotice(null), 4000);
    } catch (err: any) {
      setUserActionNotice({
        msg: err?.response?.data?.message_bn || 'আইডি যাচাইকরণে ত্রুটি হয়েছে।',
        err: true,
      });
      setTimeout(() => setUserActionNotice(null), 4000);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        record_type: batchForm.record_type,
        items: [
          {
            deed_type: 'SALE',
            dag_no: batchForm.dag_no,
            mouza: batchForm.mouza,
            seller_name: batchForm.seller_name,
            buyer_name: batchForm.buyer_name,
            area_decimal: parseFloat(batchForm.area_decimal) || 1.0,
            declared_value_bdt: parseInt(batchForm.declared_value_bdt, 10) || 500000,
          },
        ],
      };
      const res = await BhumiApi.createOnboardingBatch(payload);
      setOnbNotice({ msg: t(`নতুন ব্যাচ ${res.batch.batch_no} সফলভাবে সাবমিট হয়েছে।`, `Batch ${res.batch.batch_no} submitted successfully.`) });
      setIsCreatingBatch(false);
      refreshAll();
      setTimeout(() => setOnbNotice(null), 4000);
    } catch (err: any) {
      setOnbNotice({ msg: err?.response?.data?.message_bn || err?.message || 'ব্যাচ সাবমিট ব্যর্থ হয়েছে', err: true });
      setTimeout(() => setOnbNotice(null), 4000);
    }
  };

  const handleDecideBatch = async (batchId: number, decision: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await BhumiApi.decideOnboardingBatch(batchId, decision);
      setOnbNotice({ msg: res.message_bn || (decision === 'APPROVED' ? 'ব্যাচ অনুমোদিত হয়েছে।' : 'ব্যাচ প্রত্যাখ্যাত হয়েছে।') });
      setSelectedBatch(null);
      refreshAll();
      setTimeout(() => setOnbNotice(null), 4000);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message_bn || err?.message || 'অনুমোদন কার্যক্রমে ত্রুটি হয়েছে।';
      setOnbNotice({ msg: errMsg, err: true });
      setTimeout(() => setOnbNotice(null), 5000);
    }
  };

  const handleCreateAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await BhumiApi.createAppeal(appealForm);
      setOnbNotice({ msg: t(`আপিল ${res.appeal.appeal_code} সফলভাবে দাখিল করা হয়েছে।`, `Appeal ${res.appeal.appeal_code} filed successfully.`) });
      setIsCreatingAppeal(false);
      refreshAll();
      setTimeout(() => setOnbNotice(null), 4000);
    } catch (err: any) {
      setOnbNotice({ msg: err?.response?.data?.message_bn || err?.message || 'আপিল দাখিলে ত্রুটি হয়েছে।', err: true });
      setTimeout(() => setOnbNotice(null), 4000);
    }
  };

  const handleDecideAppeal = async () => {
    if (!appealDecisionModal) return;
    try {
      const res = await BhumiApi.decideAppeal(appealDecisionModal.appeal.id, {
        status: appealDecisionModal.status,
        decision_note_bn: appealDecisionModal.note,
      });
      setOnbNotice({ msg: res.message_bn || 'আপিল সিদ্ধান্ত সফলভাবে রেকর্ড করা হয়েছে।' });
      setAppealDecisionModal(null);
      refreshAll();
      setTimeout(() => setOnbNotice(null), 4000);
    } catch (err: any) {
      setOnbNotice({ msg: err?.response?.data?.message_bn || err?.message || 'আপিল সিদ্ধান্তে ত্রুটি হয়েছে।', err: true });
      setTimeout(() => setOnbNotice(null), 4000);
    }
  };

  const handleTogglePublishService = async (id: number) => {
    try {
      const item = adminServices.find((service) => service.id === id);
      if (!item) return;
      const res = Number(item.is_published) === 1 ? await BhumiApi.archiveService(id) : await BhumiApi.updateService(id, { is_published: 1 });
      setCatalogueNotice({ msg: res.message_bn });
      refreshAll();
      setTimeout(() => setCatalogueNotice(null), 3000);
    } catch (err: any) {
      setCatalogueNotice({ msg: err?.response?.data?.message_bn || 'প্রকাশনা পরিবর্তনে ত্রুটি হয়েছে।', err: true });
    }
  };

  const handleArchiveService = async (id: number) => {
    try {
      const res = await BhumiApi.archiveService(id);
      setCatalogueNotice({ msg: res.message_bn });
      refreshAll();
      setTimeout(() => setCatalogueNotice(null), 3000);
    } catch (err: any) {
      setCatalogueNotice({ msg: err?.response?.data?.message_bn || 'আর্কাইভে ব্যর্থ হয়েছে।', err: true });
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    try {
      if (editingService.id) {
        const res = await BhumiApi.updateService(editingService.id, editingService);
        setCatalogueNotice({ msg: res.message_bn });
      } else {
        const res = await BhumiApi.createService(editingService);
        setCatalogueNotice({ msg: res.message_bn });
      }
      setEditingService(null);
      refreshAll();
      setTimeout(() => setCatalogueNotice(null), 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.message_bn || err?.response?.data?.error || 'সেবা সংরক্ষণে ব্যর্থ হয়েছে। HTTPS URL নিশ্চিত করুন।';
      setCatalogueNotice({ msg, err: true });
      setTimeout(() => setCatalogueNotice(null), 5000);
    }
  };

  const handleSaveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFee || !editingFee.id) return;
    try {
      const res = await BhumiApi.updateFee(editingFee.id, editingFee);
      setCatalogueNotice({ msg: res.message_bn });
      setEditingFee(null);
      refreshAll();
      setTimeout(() => setCatalogueNotice(null), 4000);
    } catch (err: any) {
      const msg = err?.response?.data?.message_bn || err?.response?.data?.error || 'ফি তথ্য সংরক্ষণে ত্রুটি হয়েছে।';
      setCatalogueNotice({ msg, err: true });
      setTimeout(() => setCatalogueNotice(null), 5000);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await BhumiApi.updateSettings(settingsMap);
    setSaveMsg(t('সিস্টেম ও রুল ইঞ্জিন পলিসি সফলভাবে সংরক্ষিত হয়েছে!', 'System policy settings saved!'));
    refreshAll();
    setTimeout(() => setSaveMsg(''), 3000);
  };

  // Computed administrative hierarchy data
  const allDivisions = Array.isArray(hierarchyTree) ? hierarchyTree : [];
  const allDistricts = allDivisions.flatMap((div) =>
    (div.districts || []).map((d) => ({ ...d, division_bn: div.division_bn, division_en: div.division_en }))
  );
  const allUpazilas = allDistricts.flatMap((dist) =>
    (dist.upazilas || []).map((u) => ({
      ...u,
      district_bn: dist.district_bn,
      district_en: dist.district_en,
      division_bn: dist.division_bn,
      division_en: dist.division_en,
    }))
  );
  const allMouzas = allUpazilas.flatMap((up) =>
    (up.mouzas || []).map((m) => ({
      ...m,
      upazila_bn: up.upazila_bn,
      upazila_en: up.upazila_en,
      district_bn: up.district_bn,
      district_en: up.district_en,
      division_bn: up.division_bn,
      division_en: up.division_en,
    }))
  );
  const totalPlotsInHierarchy = allMouzas.reduce((sum, m) => sum + (Number(m.plots_count) || 0), 0);

  const filteredMouzas = allMouzas.filter((m) => {
    if (hierarchyDivisionFilter && m.division_bn !== hierarchyDivisionFilter) return false;
    if (hierarchyDistrictFilter && m.district_bn !== hierarchyDistrictFilter) return false;
    if (hierarchyUpazilaFilter && m.upazila_bn !== hierarchyUpazilaFilter) return false;
    if (hierarchySearch.trim()) {
      const q = hierarchySearch.toLowerCase();
      const matchNameBn = (m.mouza_bn || '').toLowerCase().includes(q);
      const matchNameEn = (m.mouza_en || '').toLowerCase().includes(q);
      const matchJl = (m.jl_no || '').toLowerCase().includes(q);
      if (!matchNameBn && !matchNameEn && !matchJl) return false;
    }
    return true;
  });

  const filteredUpazilas = allUpazilas.filter((u) => {
    if (hierarchyDivisionFilter && u.division_bn !== hierarchyDivisionFilter) return false;
    if (hierarchyDistrictFilter && u.district_bn !== hierarchyDistrictFilter) return false;
    if (hierarchySearch.trim()) {
      const q = hierarchySearch.toLowerCase();
      const matchBn = (u.upazila_bn || '').toLowerCase().includes(q);
      const matchEn = (u.upazila_en || '').toLowerCase().includes(q);
      if (!matchBn && !matchEn) return false;
    }
    return true;
  });

  const filteredDistricts = allDistricts.filter((d) => {
    if (hierarchyDivisionFilter && d.division_bn !== hierarchyDivisionFilter) return false;
    if (hierarchySearch.trim()) {
      const q = hierarchySearch.toLowerCase();
      const matchBn = (d.district_bn || '').toLowerCase().includes(q);
      const matchEn = (d.district_en || '').toLowerCase().includes(q);
      if (!matchBn && !matchEn) return false;
    }
    return true;
  });

  const filteredDivisions = allDivisions.filter((v) => {
    if (hierarchySearch.trim()) {
      const q = hierarchySearch.toLowerCase();
      const matchBn = (v.division_bn || '').toLowerCase().includes(q);
      const matchEn = (v.division_en || '').toLowerCase().includes(q);
      if (!matchBn && !matchEn) return false;
    }
    return true;
  });

  const handleOpenAddMouza = () => {
    setEditingMouza(null);
    setMouzaForm({
      division_bn: hierarchyDivisionFilter || 'ঢাকা',
      division_en: 'Dhaka',
      district_bn: hierarchyDistrictFilter || 'ঢাকা',
      district_en: 'Dhaka',
      upazila_bn: hierarchyUpazilaFilter || 'সাভার',
      upazila_en: 'Savar',
      mouza_bn: '',
      mouza_en: '',
      jl_no: '',
      latitude: '',
      longitude: '',
    });
    setIsAddMouzaOpen(true);
  };

  const handleOpenEditMouza = (mouza: HierarchyMouzaItem) => {
    setEditingMouza(mouza);
    setMouzaForm({
      division_bn: mouza.division_bn || '',
      division_en: mouza.division_en || '',
      district_bn: mouza.district_bn || '',
      district_en: mouza.district_en || '',
      upazila_bn: mouza.upazila_bn || '',
      upazila_en: mouza.upazila_en || '',
      mouza_bn: mouza.mouza_bn,
      mouza_en: mouza.mouza_en || '',
      jl_no: mouza.jl_no || '',
      latitude: mouza.latitude != null ? String(mouza.latitude) : '',
      longitude: mouza.longitude != null ? String(mouza.longitude) : '',
    });
    setIsAddMouzaOpen(true);
  };


  // =========================================================================
  // PILLAR 2: IDENTITY & ACCESS GOVERNANCE (নাগরিক ও কর্মকর্তা প্রশাসন)
  // =========================================================================
  const renderPillar2Nav = () => (
    <div className="panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 bg-white border border-slate-200 rounded-xl shadow-xs">
      <div>
        <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1">
          <button onClick={() => handleTabChange('overview')} className="hover:text-[#006A4E] transition cursor-pointer">
            {t('কন্ট্রোল প্যানেল', 'Control Panel')}
          </button>
          <span>/</span>
          <span className="text-[#006A4E] font-extrabold">{t('পিলার ২: নাগরিক ও এক্সেস প্রশাসন', 'Pillar 2: Identity & Governance')}</span>
        </div>
        <h2 className="font-bold text-lg text-[#074f38] flex items-center gap-2">
          <Users className="w-5 h-5 text-[#006A4E]" />
          <span>{t('নাগরিক, কর্মকর্তা ও এক্সেস নিয়ন্ত্রণ কেন্দ্র', 'Identity & Access Governance Center')}</span>
        </h2>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
        <button
          onClick={() => { setSubTab('users'); setUsersSubSegment('directory'); }}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            subTab === 'users' && usersSubSegment === 'directory'
              ? 'bg-[#006A4E] text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t('ইউজার ডিরেক্টরি', 'User Directory')}</span>
        </button>

        <button
          onClick={() => { setSubTab('users'); setUsersSubSegment('transfer'); }}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            subTab === 'users' && usersSubSegment === 'transfer'
              ? 'bg-[#006A4E] text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>{t('কর্মকর্তা বদলি ডেস্ক', 'Officer Transfer Desk')}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-slate-900">POWER</span>
        </button>

        <button
          onClick={() => { setSubTab('users'); setUsersSubSegment('onboarding_appeals'); }}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            (subTab === 'onboarding_appeals' || (subTab === 'users' && usersSubSegment === 'onboarding_appeals'))
              ? 'bg-[#006A4E] text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>{t('অনবোর্ডিং ও আপিল', 'Onboarding & Appeals')}</span>
        </button>

        <button
          onClick={() => { setSubTab('users'); setUsersSubSegment('rbac'); }}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            (subTab === 'rbac' || (subTab === 'users' && usersSubSegment === 'rbac'))
              ? 'bg-[#006A4E] text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>{t('অনুমতি ও আরবিক (RBAC)', 'RBAC & Permissions')}</span>
        </button>
      </div>
    </div>
  );

  const renderOfficerTransferDesk = () => {
    const officers = usersList.filter((u) =>
      ['sub_registrar', 'ac_land', 'bank_officer', 'field_verification_officer', 'support_agent', 'admin', 'system_admin'].includes(u.role)
    );
    const selectedOfficer = transferOfficerUser || officers[0] || null;

    return (
      <div className="space-y-6">
        {transferNotice && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold animate-fadeIn ${
              transferNotice.err
                ? 'bg-rose-50 border-rose-300 text-rose-800'
                : 'bg-emerald-50 border-emerald-300 text-emerald-800'
            }`}
          >
            <span>{transferNotice.msg}</span>
            <button onClick={() => setTransferNotice(null)} className="text-slate-500 hover:text-slate-800 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Select Officer & Current Profile */}
          <div className="lg:col-span-5 panel p-5 space-y-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="border-b border-slate-200 pb-3">
              <span className="text-xs font-black text-[#006A4E] uppercase tracking-wider">১. বদলির জন্য কর্মকর্তা নির্বাচন</span>
              <h3 className="font-extrabold text-base text-slate-900 mt-0.5">কর্মকর্তার বর্তমান পদায়ন ও তথ্য</h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">কর্মকর্তা নির্বাচন করুন:</label>
              <select
                value={selectedOfficer?.id || ''}
                onChange={(e) => {
                  const found = usersList.find((u) => String(u.id) === e.target.value);
                  setTransferOfficerUser(found || null);
                }}
                className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-[#006A4E] focus:outline-none"
              >
                <option value="">-- কর্মকর্তা বাছাই করুন ({officers.length} জন সক্রিয়) --</option>
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name_bn || o.name_en || o.username} ({o.role}) — {o.office?.title_bn || o.office?.title_en || o.office_name || 'অফিস তথ্য নেই'}
                  </option>
                ))}
              </select>
            </div>

            {selectedOfficer && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500">নাম:</span>
                  <span className="font-extrabold text-slate-900">{selectedOfficer.name_bn || selectedOfficer.name_en || selectedOfficer.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500">ইউজারনেম:</span>
                  <span className="font-mono text-slate-700">{selectedOfficer.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500">বর্তমান ভূমিকা (Role):</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 uppercase">
                    {selectedOfficer.role}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500">ফোন নম্বর:</span>
                  <span className="font-mono text-slate-700">{selectedOfficer.phone || 'N/A'}</span>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <span className="block text-[11px] font-bold text-slate-500 mb-1">বর্তমান কর্মস্থল / অফিস:</span>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold">
                    <Building2 className="w-4 h-4 inline-block mr-1 text-[#006A4E]" />
                    {selectedOfficer.office?.title_bn || selectedOfficer.office?.title_en || selectedOfficer.office_name || 'কেন্দ্রীয় কার্যালয় / কোনো অফিস নির্ধারিত নেই'}
                  </div>
                </div>
              </div>
            )}

            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>নিরাপত্তা নীতি:</strong> বদলি আদেশ কার্যকর করার সাথে সাথে কর্মকর্তার বর্তমান অ্যাক্টিভ সেশন ও Bearer টোকেন অবিলম্বে বাতিল হয়ে যাবে। নতুন কর্মস্থলে যোগদানের জন্য পুনরায় লগইন করতে হবে।
              </span>
            </div>
          </div>

          {/* Right Column: Destination Office & Order Memo */}
          <div className="lg:col-span-7 panel p-5 space-y-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="border-b border-slate-200 pb-3">
              <span className="text-xs font-black text-[#006A4E] uppercase tracking-wider">২. নতুন পদায়ন ও সরকারি আদেশ</span>
              <h3 className="font-extrabold text-base text-slate-900 mt-0.5">গন্তব্য কার্যালয় ও বদলি স্মারক</h3>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  নতুন গন্তব্য কার্যালয় নির্বাচন করুন <span className="text-rose-500">*</span>:
                </label>
                <select
                  value={transferTargetOfficeId}
                  onChange={(e) => setTransferTargetOfficeId(Number(e.target.value))}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-[#006A4E] focus:outline-none"
                >
                  <option value={0}>-- গন্তব্য অফিস নির্বাচন করুন ({officesList.length} টি উপলব্ধ) --</option>
                  {officesList.map((off) => (
                    <option key={off.id} value={off.id}>
                      {off.title_bn || off.title_en} — {off.upazila_bn || off.upazila_en}, {off.district_bn || off.district_en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  সরকারি বদলি আদেশ স্মারক নম্বর (Order Reference / Memo No.) <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  value={transferOrderRef}
                  onChange={(e) => setTransferOrderRef(e.target.value)}
                  placeholder="উদাঃ স্মারক নং-ভম/প্রশা-১/বদলি-২০২৬/১০৯"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-[#006A4E] focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  প্রশাসনিক নির্দেশনা ও বিশেষ নোট (ঐচ্ছিক):
                </label>
                <textarea
                  rows={3}
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="উদাঃ জনস্বার্থে অবিলম্বে বর্তমান দায়িত্ব হস্তান্তর করে নতুন কর্মস্থলে যোগদানের নির্দেশ প্রদান করা হলো..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-[#006A4E] focus:outline-none font-medium"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    if (!transferOfficerUser && selectedOfficer) {
                      setTransferOfficerUser(selectedOfficer);
                    }
                    handleExecuteTransfer();
                  }}
                  disabled={transferLoading || (!transferOfficerUser && !selectedOfficer) || !transferTargetOfficeId || !transferOrderRef.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-[#006A4E] hover:bg-[#074f38] text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {transferLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Building2 className="w-4 h-4" />
                  )}
                  <span>
                    {transferLoading
                      ? t('বদলি আদেশ জারি হচ্ছে...', 'Issuing Transfer Order...')
                      : t('সরকারি বদলি আদেশ কার্যকর করুন (Execute Transfer)', 'Execute Official Transfer Order')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Table: Active Field Officers Overview */}
        <div className="panel p-5 space-y-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">কর্মরত কর্মকর্তাদের তালিকা ও বর্তমান কর্মস্থল</h3>
              <p className="text-xs text-slate-500 mt-0.5">তালিকা থেকে সরাসরি যে কোনো কর্মকর্তাকে বদলির জন্য নির্বাচন করুন</p>
            </div>
            <span className="text-xs font-bold text-[#006A4E] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              মোট {toBanglaDigits(officers.length, lang)} জন কর্মকর্তা
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="p-3">কর্মকর্তার নাম</th>
                  <th className="p-3">ইউজারনেম</th>
                  <th className="p-3">ভূমিকা (Role)</th>
                  <th className="p-3">বর্তমান কর্মস্থল (Office)</th>
                  <th className="p-3">যোগাযোগ</th>
                  <th className="p-3 text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {officers.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-bold text-slate-900">
                      {o.name_bn || o.name_en || o.username}
                    </td>
                    <td className="p-3 font-mono text-slate-600">{o.username}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 uppercase">
                        {o.role}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700">
                      <span className="font-semibold text-[#006A4E]">
                        {o.office?.title_bn || o.office?.title_en || o.office_name || 'অফিস নির্ধারিত নেই'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-600">{o.phone || o.email || 'N/A'}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setTransferOfficerUser(o);
                          setTransferTargetOfficeId(0);
                          window.scrollTo({ top: 300, behavior: 'smooth' });
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#006A4E] font-bold text-[11px] border border-[#006A4E]/30 inline-flex items-center gap-1 cursor-pointer transition"
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>বদলি করুন</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // PILLAR 3: PLOTS & LAND GOVERNANCE (ভূমি রেকর্ডস ও দাগ নিয়ন্ত্রণ)
  // =========================================================================
  const renderPillar3Nav = () => (
    <div className="panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 bg-white border border-slate-200 rounded-xl shadow-xs">
      <div>
        <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1">
          <button onClick={() => handleTabChange('overview')} className="hover:text-[#006A4E] transition cursor-pointer">
            {t('কন্ট্রোল প্যানেল', 'Control Panel')}
          </button>
          <span>/</span>
          <span className="text-[#006A4E] font-extrabold">{t('পিলার ৩: ভূমি ও খতিয়ান শাসন', 'Pillar 3: Plots & Land Governance')}</span>
        </div>
        <h2 className="font-bold text-lg text-[#074f38] flex items-center gap-2">
          <Compass className="w-5 h-5 text-[#006A4E]" />
          <span>{t('ভূমি রেকর্ডস ও দাগ নিয়ন্ত্রণ কেন্দ্র', 'Land Records & Plot Governance')}</span>
        </h2>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
        <button
          onClick={() => { setSubTab('plots_control'); setPlotsSubSegment('plots'); }}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            subTab === 'plots_control' && plotsSubSegment === 'plots'
              ? 'bg-[#006A4E] text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>{t('দাগ ডিরেক্টরি ও স্থগিতাদেশ', 'Plots & Admin Freeze')}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-slate-900">POWER</span>
        </button>

        <button
          onClick={() => { setSubTab('plots_control'); setPlotsSubSegment('deeds'); }}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            (subTab === 'deeds' || (subTab === 'plots_control' && plotsSubSegment === 'deeds'))
              ? 'bg-[#006A4E] text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{t('দলিল রেজিস্ট্রি ও তদারকি', 'Deeds Supervision')}</span>
        </button>

        <button
          onClick={() => { setSubTab('plots_control'); setPlotsSubSegment('hierarchy'); }}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            (subTab === 'hierarchy' || (subTab === 'plots_control' && plotsSubSegment === 'hierarchy'))
              ? 'bg-[#006A4E] text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{t('ভৌগোলিক এলাকা কাঠামো', 'Cadastral Hierarchy')}</span>
        </button>
      </div>
    </div>
  );

  const renderMasterFreezeModal = () => {
    if (!freezeModalPlot) return null;
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${Number(freezeModalPlot.is_admin_frozen) === 1 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {Number(freezeModalPlot.is_admin_frozen) === 1
                    ? t('প্রশাসনিক স্থগিতাদেশ প্রত্যাহারের আদেশ', 'Revoke Administrative Plot Freeze')
                    : t('কেন্দ্রীয় প্রশাসনিক স্থগিতাদেশ (Freeze/Hold) জারি', 'Issue Master Administrative Plot Freeze')}
                </h3>
                <p className="text-xs text-slate-500">
                  দাগ নং: {freezeModalPlot.dag_no_bn || freezeModalPlot.dag_no} • খতিয়ান: {freezeModalPlot.khatian_no_bn || freezeModalPlot.khatian_no || 'N/A'} • মৌজা: {freezeModalPlot.mouza_bn || freezeModalPlot.mouza}
                </p>
              </div>
            </div>
            <button
              onClick={() => setFreezeModalPlot(null)}
              className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">মালিকের নাম:</span>
              <span className="font-bold text-slate-900">{freezeModalPlot.owner_name_bn || freezeModalPlot.owner_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">জমির মোট পরিমাণ:</span>
              <span className="font-bold text-slate-900">{freezeModalPlot.total_area_decimal} শতাংশ</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">বর্তমান অবস্থা:</span>
              <span className={`font-bold ${Number(freezeModalPlot.is_admin_frozen) === 1 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {Number(freezeModalPlot.is_admin_frozen) === 1 ? 'স্থগিতাদেশ কার্যকর (FROZEN)' : 'সাধারণ সক্রিয় (ACTIVE)'}
              </span>
            </div>
          </div>

          {Number(freezeModalPlot.is_admin_frozen) !== 1 ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  স্থগিতাদেশ জারির কারণ নির্বাচন করুন <span className="text-rose-500">*</span>:
                </label>
                <select
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-[#006A4E] focus:outline-none"
                >
                  <option value="উচ্চ আদালতের স্থগিতাদেশ (High Court Stay Order)">উচ্চ আদালতের স্থগিতাদেশ (High Court Stay Order)</option>
                  <option value="দুর্নীতি দমন কমিশন অনুসন্ধান (Anti-Corruption Commission Inquiry)">দুর্নীতি দমন কমিশন অনুসন্ধান (ACC Inquiry)</option>
                  <option value="মালিকানা ও ওয়ারিশ সংক্রান্ত দেওয়ানি মোকদ্দমা (Title Dispute)">মালিকানা ও ওয়ারিশ সংক্রান্ত দেওয়ানি মোকদ্দমা</option>
                  <option value="প্রতারণামূলক নামজারি অভিযোগ তদন্তাধীন (Fraudulent Mutation Probe)">প্রতারণামূলক নামজারি অভিযোগ তদন্তাধীন</option>
                  <option value="বিশেষ প্রশাসনিক আদেশ (Special Administrative Directive)">বিশেষ প্রশাসনিক আদেশ (Special Order)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  মামলা / স্মারক নম্বর ও বিস্তারিত নির্দেশ (ঐচ্ছিক):
                </label>
                <textarea
                  rows={3}
                  value={freezeCustomReason}
                  onChange={(e) => setFreezeCustomReason(e.target.value)}
                  placeholder="উদাঃ রিট পিটিশন নং-১২০৯/২০২৬ আদেশ মোতাবেক আগামী নির্দেশ না দেয়া পর্যন্ত দাগের সকল প্রকার হস্তান্তর নিষিদ্ধ থাকবে..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-[#006A4E] focus:outline-none font-medium"
                />
              </div>

              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800">
                <strong>গুরুত্বপূর্ণ:</strong> এই স্থগিতাদেশ জারির পর কোনো নাগরিক বিক্রয় লক খুলতে পারবেন না এবং কোনো কর্মকর্তা এই দাগে নামজারি বা দলিল রেজিস্ট্রি সম্পাদন করতে পারবেন না।
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold text-amber-950">বর্তমান স্থগিতাদেশের বিবরণ:</div>
                <div>{freezeModalPlot.admin_freeze_reason || 'বিশেষ কারণ উল্লেখিত নেই'}</div>
                {freezeModalPlot.admin_frozen_at && (
                  <div className="text-[10px] text-amber-700 font-mono mt-1">
                    স্থগিতাদেশ জারির তারিখ: {new Date(freezeModalPlot.admin_frozen_at).toLocaleString('bn-BD')}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-600">
                আপনি কি নিশ্চিত যে এই দাগের ওপর আরোপিত সকল প্রশাসনিক নিষেধাজ্ঞা প্রত্যাহার করে স্বাভাবিক রেকর্ডে ফিরিয়ে নিতে চান?
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              onClick={() => setFreezeModalPlot(null)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              {t('বাতিল', 'Cancel')}
            </button>
            <button
              onClick={handleExecutePlotFreeze}
              disabled={freezeLoading}
              className={`px-4 py-2 rounded-lg text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 ${
                Number(freezeModalPlot.is_admin_frozen) === 1
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {freezeLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5" />
              )}
              <span>
                {Number(freezeModalPlot.is_admin_frozen) === 1
                  ? t('স্থগিতাদেশ প্রত্যাহার নিশ্চিত করুন', 'Confirm Unfreeze')
                  : t('স্থগিতাদেশ কার্যকর করুন', 'Confirm Freeze')}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // PILLAR 4: LEDGER & SECURITY AUDIT (লেজার ও সার্বভৌম অডিট ল্যাব)
  // =========================================================================
  const renderPillar4Nav = () => (
    <div className="panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 bg-white border border-slate-200 rounded-xl shadow-xs">
      <div>
        <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1">
          <button onClick={() => handleTabChange('overview')} className="hover:text-[#006A4E] transition cursor-pointer">
            {t('কন্ট্রোল প্যানেল', 'Control Panel')}
          </button>
          <span>/</span>
          <span className="text-[#006A4E] font-extrabold">{t('পিলার ৪: লেজার ও সার্বভৌম অডিট', 'Pillar 4: Ledger & Security Audit')}</span>
        </div>
        <h2 className="font-bold text-lg text-[#074f38] flex items-center gap-2">
          <Lock className="w-5 h-5 text-[#006A4E]" />
          <span>{t('ক্রিপ্টোগ্রাফিক লেজার ও নিরাপত্তা নিরীক্ষা', 'Ledger Integrity & Security Audit')}</span>
        </h2>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
        <button
          onClick={() => { setSubTab('ledger'); setLedgerSubSegment('ledger_lab'); }}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            subTab === 'ledger' && ledgerSubSegment === 'ledger_lab'
              ? 'bg-[#006A4E] text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>{t('হ্যাশ-চেইন ও ইন্টিগ্রিটি ল্যাব', 'Ledger Integrity Lab')}</span>
        </button>

        <button
          onClick={() => { setSubTab('ledger'); setLedgerSubSegment('audit_trail'); }}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            (subTab === 'audit' || (subTab === 'ledger' && ledgerSubSegment === 'audit_trail'))
              ? 'bg-[#006A4E] text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>{t('সার্বভৌম অডিট ট্রেইল', 'Sovereign Audit Log')}</span>
        </button>

        <button
          onClick={() => { setSubTab('ledger'); setLedgerSubSegment('database_backup'); }}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            subTab === 'ledger' && ledgerSubSegment === 'database_backup'
              ? 'bg-[#006A4E] text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>{t('ডাটাবেজ ব্যাকআপ ও হ্যাশ এক্সপোর্টার', 'Database Backup & Hash')}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-slate-900">POWER</span>
        </button>
      </div>
    </div>
  );

  const renderDatabaseBackupCard = () => (
    <div className="panel p-6 space-y-5 bg-white border border-slate-200 rounded-xl shadow-xs animate-fadeIn">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-[#006A4E]">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-[#074f38]">
                {t('সার্বভৌম ডেটাবেজ স্ন্যাপশট ও ক্রিপ্টোগ্রাফিক ব্যাকআপ', 'Sovereign Database Backup & SHA-256 Exporter')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t(
                  'কোনো ক্লাউড বা থার্ড পার্টি নির্ভরতা ছাড়া সার্বভৌম স্থানীয় সার্ভার ফাইলসিস্টেমে সম্পূর্ণ বাইনারি ব্যাকআপ ও SHA-256 চেকসাম জেনারেট করুন',
                  'Generate complete sovereign binary database snapshots with SHA-256 integrity checksum directly on local storage'
                )}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleExportDatabaseBackup}
          disabled={backupLoading}
          className="px-5 py-2.5 rounded-xl bg-[#006A4E] hover:bg-[#074f38] text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer transition shadow-md disabled:opacity-50"
        >
          {backupLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>{backupLoading ? t('ব্যাকআপ তৈরি হচ্ছে...', 'Generating Backup...') : t('নতুন ব্যাকআপ তৈরি করুন (1-Click)', 'Generate Sovereign Backup')}</span>
        </button>
      </div>

      {backupData ? (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#006A4E]" />
              <span className="font-bold text-xs text-[#006A4E]">
                {lang === 'bn' ? backupData.message_bn : backupData.message_en}
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-500">
              {new Date(backupData.generated_at).toLocaleString('bn-BD')}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500">{t('ফাইল সাইজ', 'File Size')}</div>
              <div className="text-xl font-black text-slate-900 mt-1">{backupData.file_size_kb} KB</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{backupData.file_size_bytes.toLocaleString()} bytes</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500">{t('মোট রেকর্ডকৃত দাগ', 'Total Plots')}</div>
              <div className="text-xl font-black text-slate-900 mt-1">{toBanglaDigits(backupData.plots_count, lang)}</div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">১০০% অক্ষত</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500">{t('মোট রেজিস্ট্রিকৃত দলিল', 'Total Deeds')}</div>
              <div className="text-xl font-black text-slate-900 mt-1">{toBanglaDigits(backupData.deeds_count, lang)}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">লেজার সিঙ্কড</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500">{t('ব্যবহারকারী অ্যাকাউন্ট', 'User Accounts')}</div>
              <div className="text-xl font-black text-slate-900 mt-1">{toBanglaDigits(backupData.users_count, lang)}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">সকল রোল সমন্বিত</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 text-white font-mono text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px] font-bold">SHA-256 CRYPTOGRAPHIC CHECKSUM:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-800">
                VERIFIED HASH
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-950 text-emerald-400 font-mono text-[11px] break-all border border-slate-800 select-all">
              {backupData.sha256_checksum}
            </div>
            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
              <span>ফাইল নাম: <strong className="text-slate-200">{backupData.backup_filename}</strong></span>
              <span>পাথ: <strong className="text-slate-200 font-mono">{backupData.backup_path}</strong></span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-3">
          <Download className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="font-bold text-slate-700 text-sm">
            {t('কোনো সাম্প্রতিক ব্যাকআপ রেকর্ড ক্যাশে নেই', 'No recent database backup in current session')}
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {t(
              'সরাসরি স্থানীয় সার্ভারে সম্পূর্ণ ভূমি রেকর্ড ডেটাবেজের ব্যাকআপ ফাইল তৈরি করতে উপরের "নতুন ব্যাকআপ তৈরি করুন" বাটনে ক্লিক করুন।',
              'Click the "Generate Sovereign Backup" button above to generate a secure local binary snapshot and cryptographic hash.'
            )}
          </p>
        </div>
      )}
    </div>
  );

  // =========================================================================
  // PILLAR 5: PLATFORM POLICY & CONTROLS (প্ল্যাটফর্ম পলিসি ও নিয়ন্ত্রণ)
  // =========================================================================
  const renderPillar5Nav = () => (
    <div className="panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 bg-white border border-slate-200 rounded-xl shadow-xs">
      <div>
        <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1">
          <button onClick={() => handleTabChange('overview')} className="hover:text-[#006A4E] transition cursor-pointer">
            {t('কন্ট্রোল প্যানেল', 'Control Panel')}
          </button>
          <span>/</span>
          <span className="text-[#006A4E] font-extrabold">{t('পিলার ৫: প্ল্যাটফর্ম পলিসি ও কন্ট্রোল', 'Pillar 5: Platform Policy & Controls')}</span>
        </div>
        <h2 className="font-bold text-lg text-[#074f38] flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#006A4E]" />
          <span>{t('প্ল্যাটফর্ম পলিসি, সার্ভিস ক্যাটালগ ও সিস্টেম কন্ট্রোল', 'Platform Policy & System Controls')}</span>
        </h2>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
        <button
          onClick={() => { setSubTab('settings'); setSettingsSubSegment('fraud_policy'); }}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            (subTab === 'risk_protocols' || (subTab === 'settings' && settingsSubSegment === 'fraud_policy'))
              ? 'bg-[#006A4E] text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{t('জালিয়াতি প্রতিরোধ ও ঝুঁকি নীতি', 'Fraud Policy')}</span>
        </button>

        <button
          onClick={() => { setSubTab('settings'); setSettingsSubSegment('catalogue'); }}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            (subTab === 'catalogue' || (subTab === 'settings' && settingsSubSegment === 'catalogue'))
              ? 'bg-[#006A4E] text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>{t('সার্ভিস ও ফি ক্যাটালগ', 'Service Catalogue & Fees')}</span>
        </button>

        <button
          onClick={() => { setSubTab('settings'); setSettingsSubSegment('tickets'); }}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            (subTab === 'tickets' || (subTab === 'settings' && settingsSubSegment === 'tickets'))
              ? 'bg-[#006A4E] text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{t('সাপোর্ট ও বিরোধ টিকিট', 'Dispute Tickets')}</span>
        </button>

        <button
          onClick={() => { setSubTab('settings'); setSettingsSubSegment('diagnostics'); }}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            (subTab === 'dev_outbox' || (subTab === 'settings' && settingsSubSegment === 'diagnostics'))
              ? 'bg-[#006A4E] text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>{t('সিস্টেম ডায়াগনস্টিকস ও আউটবক্স', 'Diagnostics & Outbox')}</span>
        </button>
      </div>
    </div>
  );

  // =========================================================================
  // ADMIN NAV: compact grouped tab definitions
  // =========================================================================
  const NAV_GROUPS = [
    {
      id: 'core',
      label: { bn: 'ওভারভিউ', en: 'Overview' },
      items: [
        { tab: 'overview' as AdminTab, icon: <LayoutDashboard className="w-3.5 h-3.5" />, bn: 'ড্যাশবোর্ড', en: 'Dashboard' },
      ],
    },
    {
      id: 'land',
      label: { bn: 'ভূমি কার্যক্রম', en: 'Land' },
      items: [
        { tab: 'transfers' as AdminTab, icon: <ArrowRight className="w-3.5 h-3.5" />, bn: 'হস্তান্তর', en: 'Transfers' },
        { tab: 'mutations' as AdminTab, icon: <RefreshCw className="w-3.5 h-3.5" />, bn: 'নামজারি', en: 'Mutations' },
        { tab: 'field_verification' as AdminTab, icon: <MapPin className="w-3.5 h-3.5" />, bn: 'মাঠ তদন্ত', en: 'Field Verify' },
        { tab: 'acquisitions' as AdminTab, icon: <Landmark className="w-3.5 h-3.5" />, bn: 'অধিগ্রহণ', en: 'Acquisitions' },
        { tab: 'survey_records' as AdminTab, icon: <FileSpreadsheet className="w-3.5 h-3.5" />, bn: 'জরিপ', en: 'Survey' },
      ],
    },
    {
      id: 'legal',
      label: { bn: 'আইনি', en: 'Legal' },
      items: [
        { tab: 'bank_liens' as AdminTab, icon: <Coins className="w-3.5 h-3.5" />, bn: 'ব্যাংক লিয়েন', en: 'Bank Liens' },
        { tab: 'appeals' as AdminTab, icon: <Gavel className="w-3.5 h-3.5" />, bn: 'আপিল', en: 'Appeals' },
      ],
    },
    {
      id: 'registry',
      label: { bn: 'রেজিস্ট্রি', en: 'Registry' },
      items: [
        { tab: 'plots_control' as AdminTab, icon: <Compass className="w-3.5 h-3.5" />, bn: 'দাগ ও ভূমি', en: 'Plots' },
        { tab: 'deeds' as AdminTab, icon: <FileText className="w-3.5 h-3.5" />, bn: 'দলিল', en: 'Deeds' },
        { tab: 'ledger' as AdminTab, icon: <ShieldCheck className="w-3.5 h-3.5" />, bn: 'লেজার', en: 'Ledger' },
      ],
    },
    {
      id: 'system',
      label: { bn: 'সিস্টেম', en: 'System' },
      items: [
        { tab: 'users' as AdminTab, icon: <Users className="w-3.5 h-3.5" />, bn: 'ইউজার', en: 'Users' },
        { tab: 'offices_config' as AdminTab, icon: <Building2 className="w-3.5 h-3.5" />, bn: 'অফিস', en: 'Offices' },
        { tab: 'catalogue' as AdminTab, icon: <BookOpen className="w-3.5 h-3.5" />, bn: 'ক্যাটালগ', en: 'Catalogue' },
        { tab: 'settings' as AdminTab, icon: <Settings className="w-3.5 h-3.5" />, bn: 'পলিসি', en: 'Policy' },
        { tab: 'integrations' as AdminTab, icon: <Globe className="w-3.5 h-3.5" />, bn: 'ইন্টিগ্রেশন', en: 'Integrations' },
        { tab: 'audit_reports' as AdminTab, icon: <FileSearch className="w-3.5 h-3.5" />, bn: 'অডিট', en: 'Audit' },
      ],
    },
    {
      id: 'citizen',
      label: { bn: 'নাগরিক', en: 'Citizen' },
      items: [
        { tab: 'tickets' as AdminTab, icon: <MessageSquare className="w-3.5 h-3.5" />, bn: 'টিকেট', en: 'Tickets' },
        { tab: 'notices' as AdminTab, icon: <Newspaper className="w-3.5 h-3.5" />, bn: 'বিজ্ঞপ্তি', en: 'Notices' },
        { tab: 'marketplace' as AdminTab, icon: <Globe className="w-3.5 h-3.5" />, bn: 'মার্কেট', en: 'Market' },
      ],
    },
  ];

  // Filter to only tabs allowed for this role
  const visibleNavGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => allowedTabs.includes(i.tab)),
  })).filter((g) => g.items.length > 0);

  // Extra specialist tabs for admin/system_admin
  const specialistTabs: { tab: AdminTab; bn: string; en: string }[] = ['admin', 'system_admin'].includes(role)
    ? [
        { tab: 'content_editor', bn: 'এডিটর', en: 'Editor' },
        { tab: 'content_approver', bn: 'অনুমোদন', en: 'Approver' },
        { tab: 'marketplace_moderation', bn: 'মডারেশন', en: 'Moderation' },
      ]
    : [];

  return (
    <div className="space-y-0">

      {/* ── EXECUTIVE COMMAND & KPI STATUS RIBBON ─────────────────────────── */}
      {(role === 'admin' || role === 'system_admin') && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Live KPI Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1">
              {/* Metric 1: Users */}
              <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                    {t('নিবন্ধিত ইউজার', 'Active Users')}
                  </div>
                  <div className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    {toBanglaDigits(usersList.length || 0, lang)}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
              </div>

              {/* Metric 2: Ledger Integrity */}
              <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                    {t('লেজার অখণ্ডতা', 'Ledger Integrity')}
                  </div>
                  <div className="text-base sm:text-lg font-black text-[#006A4E] leading-tight flex items-center gap-1">
                    <span>{toBanglaDigits(stats?.kpis?.ledger_integrity_pct ?? 100, lang)}%</span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#006A4E] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>

              {/* Metric 3: Security Anomalies */}
              <div className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 ${
                anomaliesData && Number(anomaliesData.total_anomalies) > 0
                  ? 'bg-rose-50 border-rose-300'
                  : 'bg-slate-50 border-slate-200/80'
              }`}>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                    {t('নিরাপত্তা অসংগতি', 'Anomalies')}
                  </div>
                  <div className={`text-base sm:text-lg font-black leading-tight ${
                    anomaliesData && Number(anomaliesData.total_anomalies) > 0 ? 'text-rose-700' : 'text-slate-900'
                  }`}>
                    {toBanglaDigits(anomaliesData?.total_anomalies ?? 0, lang)}
                  </div>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  anomaliesData && Number(anomaliesData.total_anomalies) > 0 ? 'bg-rose-200 text-rose-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>

              {/* Metric 4: SLA & Overdue */}
              <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                    {t('এসএলএ স্থিতি', 'SLA Health')}
                  </div>
                  <div className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    {toBanglaDigits(stats?.counts?.overdue_cases ?? (stats?.department_workload?.overdue_cases ?? 0), lang)}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <Flame className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Quick Command Actions */}
            <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
              {loadError && (
                <button
                  type="button"
                  onClick={refreshAll}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold hover:bg-rose-100 transition cursor-pointer"
                >
                  {t('পুনরায় চেষ্টা', 'Retry')}
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigate?.('map?design=1')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                title={t('ক্যাডাস্ট্রাল ম্যাপ ও দাগ ডিজাইন ভিউয়ার', 'Open Cadastral Map & Parcel Designer')}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{t('দাগ ডিজাইন ও জিআইএস', 'Parcel Design & GIS')}</span>
              </button>
              <button
                type="button"
                onClick={refreshAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer border border-slate-200/90 shadow-2xs"
                title={t('সকল ড্যাশবোর্ড ডাটা লাইভ রিফ্রেশ করুন', 'Refresh Dashboard Data')}
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                <span>{t('রিফ্রেশ', 'Refresh')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GROUPED EXECUTIVE NAVIGATION HUB ──────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-1.5 overflow-hidden">
        <div className="flex items-stretch overflow-x-auto gap-2" style={{ scrollbarWidth: 'none' }}>
          {visibleNavGroups.map((group, gi) => (
            <div
              key={group.id}
              className={`flex flex-col flex-shrink-0 ${gi < visibleNavGroups.length - 1 ? 'border-r border-slate-200/80 pr-2' : ''}`}
            >
              {/* Group category header */}
              <div className="px-2 pt-1 pb-1 flex items-center gap-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">
                  {lang === 'bn' ? group.label.bn : group.label.en}
                </span>
              </div>
              {/* Group Tab Buttons */}
              <div className="flex items-center gap-1 px-1 pb-1">
                {group.items.map((item) => {
                  const isActive = subTab === item.tab ||
                    (item.tab === 'plots_control' && ['hierarchy'].includes(subTab)) ||
                    (item.tab === 'ledger' && subTab === 'ledger') ||
                    (item.tab === 'settings' && subTab === 'settings') ||
                    (item.tab === 'catalogue' && subTab === 'catalogue') ||
                    (item.tab === 'offices_config' && subTab === 'offices_config');
                  return (
                    <button
                      key={item.tab}
                      type="button"
                      onClick={() => handleTabChange(item.tab)}
                      title={lang === 'bn' ? item.bn : item.en}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer whitespace-nowrap select-none ${
                        isActive
                          ? 'bg-[#006A4E] text-white shadow-xs scale-100 ring-2 ring-[#006A4E]/20'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                      <span className="leading-snug">{lang === 'bn' ? item.bn : item.en}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Specialist tools for Admin */}
          {specialistTabs.length > 0 && (
            <div className="flex flex-col flex-shrink-0 border-l border-dashed border-slate-300 pl-2">
              <div className="px-2 pt-1 pb-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 whitespace-nowrap">
                  {t('বিশেষ টুলস', 'Specialist Tools')}
                </span>
              </div>
              <div className="flex items-center gap-1 px-1 pb-1">
                {specialistTabs.map((item) => (
                  <button
                    key={item.tab}
                    type="button"
                    onClick={() => handleTabChange(item.tab)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap select-none ${
                      subTab === item.tab
                        ? 'bg-slate-900 text-white shadow-xs ring-2 ring-slate-900/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span>{lang === 'bn' ? item.bn : item.en}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CONTENT AREA ───────────────────────────────────────────────────── */}
      {loadError && !['admin', 'system_admin'].includes(role) && (
        <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold flex items-center justify-between">
          <span>{loadError}</span>
          <button onClick={refreshAll} className="ml-3 underline font-bold cursor-pointer">{t('আবার চেষ্টা', 'Retry')}</button>
        </div>
      )}

      {/* SUBTAB: OVERVIEW (গভর্ন্যান্স সারসংক্ষেপ ও ড্যাশবোর্ড) */}
      {/* SUBTAB: OVERVIEW (গভর্ন্যান্স সারসংক্ষেপ ও ড্যাশবোর্ড) */}
      {subTab === 'overview' && (
        <div className="space-y-4 animate-rise">
          {/* Executive Header Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#006A4E] flex items-center justify-center font-bold shrink-0">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>
                    {role === 'support_agent'
                      ? t('নাগরিক সহায়তা ও হেল্পলাইন ডেস্ক (১৬১২২)', 'Citizen Support & Helpline Desk (16122)')
                      : role === 'platform_moderator'
                      ? t('প্ল্যাটফর্ম মডারেশন ও সার্ভিস ওভারসাইট', 'Platform Moderation & Oversight')
                      : role === 'content_editor'
                      ? t('কন্টেন্ট এডিটর ও সেবা নির্দেশিকা কনসোল', 'Content Editor & Service Guidelines Console')
                      : role === 'content_approver'
                      ? t('কন্টেন্ট অ্যাপ্রুভার ও প্রকাশনা কর্তৃপক্ষ', 'Content Approver & Publishing Authority')
                      : role === 'auditor'
                      ? t('স্বাধীন নিরাপত্তা ও সম্মতি নিরীক্ষক কনসোল', 'Independent Security & Compliance Auditor')
                      : t('সার্বভৌম ভূমি প্রশাসন ও কেন্দ্রীয় গভর্ন্যান্স ককপিট', 'National Land Governance & Executive Cockpit')}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-[#006A4E] border border-emerald-300">
                    Live
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500 line-clamp-1">
                  {role === 'support_agent'
                    ? t('নাগরিক একাউন্ট অনুসন্ধান, অভিযোগ ট্রায়াজ এবং সাধারণ সহায়তা অডিট।', 'Citizen account search, ticket triage, and support audit logs.')
                    : role === 'platform_moderator'
                    ? t('অনবোর্ডিং ব্যাচ পর্যবেক্ষণ, আপিল নিরীক্ষা এবং সার্ভিস ক্যাটালগ পর্যালোচনা।', 'Onboarding batch monitoring, appeals review, and service directory oversight.')
                    : role === 'content_editor'
                    ? t('নাগরিক সেবা ক্যাটালগ ও ফি চার্ট খসড়া প্রণয়ন ও আপডেট।', 'Draft and edit service directory, guidelines, and fee schedules.')
                    : role === 'content_approver'
                    ? t('খসড়া সেবা ও ফি নির্দেশিকা চূড়ান্ত অনুমোদন এবং আইনি বিজ্ঞপ্তি প্রকাশনা।', 'Approve and publish draft service catalogues, fees, and policy notices.')
                    : role === 'auditor'
                    ? t('ক্রিপ্টোগ্রাফিক লেজার অখণ্ডতা, ব্রেক-গ্লাস অডিট ট্রেইল এবং রোল এক্সেস সম্মতি যাচাই।', 'Cryptographic hash ledger integrity, break-glass security logs, and RBAC compliance.')
                    : t('১৬টি প্রশাসনিক দপ্তর, রিয়েল-টাইম কিউ ট্রায়াজ, লাইভ অ্যানোমালি এবং সার্বভৌম হ্যাশ লেজার।', '16 departments, real-time workload queues, live anomalies, and SHA-256 ledger integrity.')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-emerald-300 bg-emerald-50 text-emerald-900">
                {role === 'support_agent'
                  ? t('সাপোর্ট এজেন্ট (১৬১২২)', 'Support Agent (16122)')
                  : role === 'platform_moderator'
                  ? t('প্ল্যাটফর্ম মডারেটর', 'Platform Moderator')
                  : role === 'content_editor'
                  ? t('কন্টেন্ট এডিটর (মেকার)', 'Content Editor (Maker)')
                  : role === 'content_approver'
                  ? t('কন্টেন্ট অ্যাপ্রুভার (চেকার)', 'Content Approver (Checker)')
                  : role === 'auditor'
                  ? t('স্বাধীন নিরীক্ষক', 'Independent Auditor')
                  : t('সিস্টেম অ্যাডমিনিস্ট্রেটর', 'System Administrator')}
              </span>
            </div>
          </div>

          {/* Super Admin OS Two-Column Split Cockpit (7 : 5) */}
          {(role === 'admin' || role === 'system_admin') ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
              {/* Left Column: Queues & Micro-Hub (7 cols) */}
              <div className="xl:col-span-7 space-y-3.5">
                <SuperAdminOverviewQueues
                  stats={superAdminStats}
                  onNavigateTab={handleTabChange}
                  onRefresh={refreshAll}
                  onOpenReassign={() => {
                    handleTabChange('transfers');
                  }}
                  onOpenOverride={(type, id, extra) => {
                    setOverrideModal({
                      isOpen: true,
                      actionType: type,
                      targetId: id,
                      extraContext: extra,
                    });
                  }}
                />
              </div>

              {/* Right Column: Security & Control Hub (5 cols) */}
              <div className="xl:col-span-5 space-y-3.5">
                {/* 1. Sovereign Cryptographic Ledger Hub */}
                <div className="panel p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#006A4E] flex items-center justify-center font-bold">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-xs text-slate-900">
                          {t('সার্বভৌম লেজার অখণ্ডতা ও নিরাপত্তা', 'Sovereign Ledger & Security Hub')}
                        </h3>
                        <p className="text-[10px] text-slate-500">
                          {t('দলিলের SHA-256 ও জেনেসিস চেইন রিয়েল-টাইম নিরীক্ষা', 'Real-time deed hash-chains & genesis integrity')}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-[#006A4E] border border-emerald-200">
                      {toBanglaDigits(stats?.kpis?.ledger_integrity_pct ?? 100, lang)}% {t('অক্ষুণ্ণ', 'Intact')}
                    </span>
                  </div>

                  {/* Ledger Metrics Strip */}
                  <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-slate-50 border border-slate-150 text-[11px]">
                    <div>
                      <span className="text-[9px] font-bold uppercase text-slate-400 block">{t('মোট ব্লক', 'Blocks')}</span>
                      <span className="font-extrabold text-slate-800">
                        {toBanglaDigits(healthCheckData?.total_blocks_checked || 1420, lang)} {t('টি', '')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase text-slate-400 block">{t('গতি', 'Speed')}</span>
                      <span className="font-mono font-bold text-slate-700">
                        {toBanglaDigits(healthCheckData?.verification_time_ms || 18, lang)} ms
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase text-slate-400 block">{t('প্রটোকল', 'Protocol')}</span>
                      <span className="font-mono font-bold text-[#006A4E]">SHA-256</span>
                    </div>
                  </div>

                  {/* 1-Click Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleRunLedgerHealthCheck}
                      disabled={healthCheckLoading}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#006A4E] hover:bg-[#005a42] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Activity className={`w-3.5 h-3.5 ${healthCheckLoading ? 'animate-spin' : ''}`} />
                      <span>{healthCheckLoading ? t('যাচাই চলছে...', 'Checking...') : t('লেজার স্বাস্থ্য পরীক্ষা', 'Run Health Check')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportDatabaseBackup}
                      disabled={backupLoading}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Download className={`w-3.5 h-3.5 text-[#006A4E] ${backupLoading ? 'animate-spin' : ''}`} />
                      <span>{backupLoading ? t('ব্যাকআপ...', 'Exporting...') : t('ডাটা ব্যাকআপ', 'DB Backup')}</span>
                    </button>
                  </div>

                  {/* Health Check Live Result Banner */}
                  {healthCheckData && (
                    <div className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                      healthCheckData.is_valid ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold">
                        {healthCheckData.is_valid ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                        <span>{lang === 'bn' ? healthCheckData.message_bn : healthCheckData.message_en}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold opacity-75">{healthCheckData.verification_time_ms}ms</span>
                    </div>
                  )}

                  {/* Backup Result Banner */}
                  {backupData && (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{t('ব্যাকআপ সম্পন্ন: ', 'Backup Ready: ')}{backupData.filename}</span>
                      </div>
                      {backupData.download_url && (
                        <a href={backupData.download_url} download className="text-[#006A4E] underline font-extrabold text-[11px]">
                          {t('ডাউনলোড', 'Download')}
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Live Security & Anomaly Stream */}
                <div className="panel p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                          <span>{t('লাইভ নিরাপত্তা ও অসঙ্গতি স্ট্রিম', 'Live Security & Anomaly Stream')}</span>
                          {anomaliesData && anomaliesData.total_anomalies > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-600 text-white animate-pulse">
                              {toBanglaDigits(anomaliesData.total_anomalies, lang)} {t('টি শনাক্ত', 'detected')}
                            </span>
                          )}
                        </h3>
                        <p className="text-[10px] text-slate-500">
                          {t('দ্বৈত ব্যাংক লিয়েন, স্থগিত দাগ ও দলিল অসংগতি ট্র্যাকার', 'Real-time liens, frozen plots & dispute detector')}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAnomaliesLoading(true);
                        BhumiApi.getLiveAnomalies()
                          .then((a) => setAnomaliesData(a))
                          .finally(() => setAnomaliesLoading(false));
                      }}
                      disabled={anomaliesLoading}
                      className="px-2 py-1 rounded border border-slate-200 text-[10px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 text-[#006A4E] ${anomaliesLoading ? 'animate-spin' : ''}`} />
                      <span>{t('পুনরায় স্ক্যান', 'Rescan')}</span>
                    </button>
                  </div>

                  {anomaliesData && anomaliesData.items && anomaliesData.items.length > 0 ? (
                    <div className="max-h-[190px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100" style={{ scrollbarWidth: 'thin' }}>
                      {anomaliesData.items.map((anom) => (
                        <div
                          key={anom.id}
                          className={`p-2.5 rounded-lg border flex items-center justify-between gap-2.5 ${
                            anom.severity === 'CRITICAL'
                              ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                              : anom.severity === 'HIGH'
                              ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                              : 'bg-blue-50/70 border-blue-200 text-blue-950'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                                anom.severity === 'CRITICAL' ? 'bg-rose-600 text-white' : anom.severity === 'HIGH' ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white'
                              }`}>
                                {anom.severity}
                              </span>
                              <span className="font-extrabold text-xs truncate">
                                {lang === 'bn' ? anom.title_bn : anom.title_en}
                              </span>
                            </div>
                            <p className="text-[11px] opacity-85 mt-0.5 line-clamp-1">{anom.description_bn}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {anom.plot_id && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPlotsSubSegment('plots');
                                  handleTabChange('plots_control');
                                  handleInspectPlot(anom.plot_id!);
                                }}
                                className="px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-300 text-[10px] font-bold hover:bg-slate-50 cursor-pointer shadow-2xs"
                              >
                                {t('দাগ পরীক্ষা', 'Inspect Plot')}
                              </button>
                            )}
                            {anom.deed_id && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPlotsSubSegment('deeds');
                                  handleTabChange('plots_control');
                                  handleInspectDeed(anom.deed_id!);
                                }}
                                className="px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-300 text-[10px] font-bold hover:bg-slate-50 cursor-pointer shadow-2xs"
                              >
                                {t('দলিল অডিট', 'Audit Deed')}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 text-center space-y-0.5">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-950">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{t('কোনো সক্রিয় নিরাপত্তা অসঙ্গতি নেই', 'No Active Security Anomalies Detected')}</span>
                      </div>
                      <p className="text-[10px] text-emerald-800">
                        {t('জাতীয় লেজার, দাগ ও ব্যাংক লিয়েন সম্পূর্ণ সংগতিপূর্ণ ও নিরাপদ।', 'All ledger hash blocks, plots, and mortgage records are intact and healthy.')}
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. Emergency Platform Broadcast Controller */}
                <div className="panel p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                        <Megaphone className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-xs text-slate-900">
                          {t('জরুরি ব্রডকাস্ট কন্ট্রোলার', 'Emergency Platform Broadcast Banner')}
                        </h3>
                        <p className="text-[10px] text-slate-500">
                          {t('সারাদেশের কর্মকর্তা ও নাগরিক পোর্টালে লাল/হলুদ সতর্কবার্তা', 'Publish emergency alerts across portals')}
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <span className="text-[10px] font-bold text-slate-600">
                        {broadcastForm.is_active ? t('সক্রিয়', 'Active') : t('নিষ্ক্রিয়', 'Disabled')}
                      </span>
                      <input
                        type="checkbox"
                        checked={broadcastForm.is_active}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, is_active: e.target.checked })}
                        className="w-3.5 h-3.5 accent-[#006A4E] cursor-pointer"
                      />
                    </label>
                  </div>

                  {broadcastNotice && (
                    <div className={`p-1.5 rounded text-[11px] font-bold ${
                      broadcastNotice.err ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}>
                      {broadcastNotice.msg}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 shrink-0">{t('মাত্রা:', 'Severity:')}</span>
                    <div className="flex gap-1">
                      {(['INFO', 'WARNING', 'URGENT'] as const).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setBroadcastForm({ ...broadcastForm, level: lvl })}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                            broadcastForm.level === lvl
                              ? lvl === 'URGENT'
                                ? 'bg-rose-600 text-white'
                                : lvl === 'WARNING'
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-[#006A4E] text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {lvl === 'URGENT' ? t('জরুরি (লাল)', 'URGENT') : lvl === 'WARNING' ? t('সতর্কতা (হলুদ)', 'WARN') : t('সাধারণ (সবুজ)', 'INFO')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={broadcastForm.message_bn}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, message_bn: e.target.value })}
                      placeholder={t('জরুরি বার্তা বাংলায় লিখুন...', 'Enter emergency alert message in Bengali...')}
                      className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#006A4E] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveBroadcast}
                      disabled={broadcastLoading}
                      className="px-3 py-1 rounded-lg bg-[#006A4E] hover:bg-[#005a42] text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" />
                      <span>{broadcastLoading ? '...' : t('প্রচার', 'Send')}</span>
                    </button>
                  </div>
                </div>

                {/* 4. Recent Security Audit Preview */}
                <div className="panel p-3 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-[#006A4E]" />
                      <span>{t('সাম্প্রতিক সিকিউরিটি অডিট ইভেন্ট', 'Recent Security Audit Events')}</span>
                    </h3>
                    <button
                      onClick={() => handleTabChange('audit')}
                      className="text-[10px] font-bold text-[#006A4E] hover:underline cursor-pointer"
                    >
                      {t('সকল লগ →', 'All Logs →')}
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {auditLogs.slice(0, 3).map((log: any, idx: number) => (
                      <div key={log.id || idx} className="py-1.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="font-mono font-bold text-[11px] text-slate-800 shrink-0">{log.action || log.event}</span>
                          <span className="text-slate-500 text-[11px] truncate">{log.details || log.description || log.entity_type}</span>
                        </div>
                        <div className="text-slate-400 font-mono text-[10px] shrink-0">
                          {log.created_at ? new Date(log.created_at).toLocaleTimeString() : '—'}
                        </div>
                      </div>
                    ))}
                    {auditLogs.length === 0 && (
                      <div className="py-2 text-center text-slate-400 text-xs">{t('কোনো সাম্প্রতিক অডিট ইভেন্ট নেই।', 'No audit events found.')}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Non-Admin Role Overview Layout */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="panel p-4 border border-[#006A4E]/15 bg-white shadow-xs flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
                      {t('ব্লকচেইন লেজার অখণ্ডতা', 'Ledger Hash Integrity')}
                    </div>
                    <div className="text-2xl font-extrabold text-[#006A4E] mt-1">
                      {toBanglaDigits(stats?.kpis?.ledger_integrity_pct ?? 100, lang)}%
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#006A4E] flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                </div>
                <div className="panel p-4 border border-[#006A4E]/15 bg-white shadow-xs flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
                      {t('সিকিউরিটি অডিট ট্রেইল', 'Security Audit Events')}
                    </div>
                    <div className="text-2xl font-extrabold text-[#0A1F1C] mt-1">
                      {toBanglaDigits(auditLogs.length, lang)}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#006A4E] flex items-center justify-center">
                    <History className="w-5 h-5" />
                  </div>
                </div>
                <div className="panel p-4 border border-[#006A4E]/15 bg-white shadow-xs flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
                      {t('স্বয়ংক্রিয় ঝুঁকি ইঞ্জিন', 'Fraud Verification Engines')}
                    </div>
                    <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                      {t('৯টি ইঞ্জিন সক্রিয়', '9 Engines Active')}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>
                <div className="panel p-4 border border-[#006A4E]/15 bg-white shadow-xs flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
                      {t('মোট সেবা তালিকা', 'Services Catalogue')}
                    </div>
                    <div className="text-2xl font-extrabold text-[#0A1F1C] mt-1">
                      {toBanglaDigits(adminServices.length, lang)} {t('টি', '')}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#006A4E] flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Recent Security Audit preview */}
              <div className="panel p-4 space-y-3 bg-white border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-[#006A4E]" />
                    <span>{t('সাম্প্রতিক সিকিউরিটি অডিট ইভেন্ট', 'Recent Security Audit Events')}</span>
                  </h3>
                  <button
                    onClick={() => handleTabChange('audit')}
                    className="text-xs font-bold text-[#006A4E] hover:underline cursor-pointer"
                  >
                    {t('সকল অডিট লগ দেখুন →', 'View All Logs →')}
                  </button>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {auditLogs.slice(0, 5).map((log: any, idx: number) => (
                    <div key={log.id || idx} className="py-2 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-mono font-bold text-slate-800 shrink-0">{log.action || log.event}</span>
                        <span className="text-slate-500 truncate">{log.details || log.description || log.entity_type}</span>
                      </div>
                      <div className="text-slate-400 font-mono text-[11px] shrink-0">
                        {log.created_at ? new Date(log.created_at).toLocaleTimeString() : '—'}
                      </div>
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <div className="py-4 text-center text-slate-400">{t('কোনো সাম্প্রতিক অডিট ইভেন্ট নেই।', 'No audit events found.')}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: RBAC Middleware Permission Matrix */}
      {(subTab === 'rbac' || (subTab === 'users' && usersSubSegment === 'rbac')) && permissionsData && (
        <div className="space-y-6 animate-fadeIn">
          {renderPillar2Nav()}
          <div className="panel p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#006A4E]/10 pb-4">
            <div>
              <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1.5">
                <button onClick={() => handleTabChange('overview')} className="hover:text-[#006A4E] transition cursor-pointer">
                  {t('কন্ট্রোল প্যানেল', 'Control Panel')}
                </button>
                <span>/</span>
                <span className="text-[#006A4E] font-extrabold">{t('ভূমিকাভিত্তিক প্রবেশাধিকার (RBAC)', 'RBAC Permission Matrix')}</span>
              </div>
              <h2 className="font-bold text-lg text-[#074f38] flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#006A4E]" />
                <span>
                  {t(
                    'রোল-ভিত্তিক অ্যাক্সেস কন্ট্রোল ও কন্ট্রোলিং ম্যাট্রিক্স (RoleMiddleware.php)',
                    'Role-Based Access Control (RBAC) Middleware Matrix'
                  )}
                </span>
              </h2>
              <p className="text-xs text-[#5F7A74] mt-0.5">
                {t(
                  'প্রতিটি দাপ্তরিক ও নাগরিক রোলের জন্য নির্ধারিত প্যানেল এবং অনুমোদিত কন্ট্রোলিং ক্ষমতা:',
                  'Dedicated workspaces and granular permissions enforced by Laravel RoleMiddleware:'
                )}
              </p>
            </div>
            <div className="chip status-safe">
              {t('সক্রিয় রোল:', 'Active Session Role:')} {role.toUpperCase()}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(permissionsData.matrix || {}).map(([rKey, rData]: [string, any]) => {
              const isCurrent = rKey === role;
              const permsList = rData.permissions || rData.capabilities || [];
              return (
                <div
                  key={rKey}
                  className={`p-5 rounded-xl border flex flex-col justify-between ${
                    isCurrent
                      ? 'border-[#006A4E] bg-[#EDF7F4]/30'
                      : 'border-[#006A4E]/12 bg-[#EDF7F4]/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-extrabold text-[11px] px-2.5 py-0.5 rounded bg-[#074f38] text-white">
                        {rKey}
                      </span>
                      {isCurrent && (
                        <span className="text-[11px] font-extrabold text-[#006A4E]">
                          ● {t('সক্রিয় সেশন', 'ACTIVE')}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-base text-[#074f38]">
                      {lang === 'bn'
                        ? rData.title_bn || rData.label_bn
                        : rData.title_en || rData.label_en}
                    </h3>
                    <div className="mt-3 space-y-1.5">
                      <div className="text-[11px] font-bold text-[#5F7A74]">
                        {t('অনুমোদিত কন্ট্রোলিং ক্ষমতা:', 'Authorized Capabilities:')}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {permsList.map((cap: string) => (
                          <span
                            key={cap}
                            className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white border border-[#006A4E]/12 text-[#0A1F1C]/90"
                          >
                            ✔ {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#006A4E]/12 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[#5F7A74]">
                      Panel: {rData.dashboard_tab || rData.dashboard_route || rKey}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-[#006A4E] border border-emerald-200">
                      RBAC PROTECTED
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>
      )}

      {/* TAB 2: Live Hash-Chain & Tamper Detection Lab */}
      {subTab === 'ledger' && (ledgerSubSegment === 'ledger_lab' || ledgerSubSegment === 'database_backup') && (
        <div className="space-y-6 animate-fadeIn">
          {renderPillar4Nav()}

          {ledgerSubSegment === 'database_backup' && renderDatabaseBackupCard()}

          {ledgerSubSegment === 'ledger_lab' && (
            <div className="panel p-6 space-y-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1.5">
                <button onClick={() => handleTabChange('overview')} className="hover:text-[#006A4E] transition cursor-pointer">
                  {t('কন্ট্রোল প্যানেল', 'Control Panel')}
                </button>
                <span>/</span>
                <span className="text-[#006A4E] font-extrabold">{t('ক্রিপ্টোগ্রাফিক লেজার ও অখণ্ডতা', 'Ledger Integrity Lab')}</span>
              </div>
              <h2 className="font-bold text-lg text-[#074f38] flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#006A4E]" />
                <span>
                  {t(
                    'ক্রিপ্টোগ্রাফিক হ্যাশ-চেইন লেজার ও ইন্টিগ্রিটি অডিট ল্যাব',
                    'Cryptographic Hash-Chain Ledger & Integrity Audit Lab'
                  )}
                </span>
              </h2>
              <p className="text-xs text-[#5F7A74] mt-0.5">
                {t(
                  'ক্রিপ্টোগ্রাফিক হ্যাশ-চেইনের মাধ্যমে প্রতিটি খতিয়ান ও দলিলের অখণ্ডতা রিয়েল-টাইমে পর্যবেক্ষণ। স্টোরেজ অখণ্ডতা ড্রিল অপারেটর কমান্ড: php artisan bhumi:drill:tamper {deed_code} --confirm',
                  'Real-time cryptographic hash-chain integrity monitoring. Storage integrity drill operator command: php artisan bhumi:drill:tamper {deed_code} --confirm'
                )}
              </p>
            </div>
          </div>

          {ledgerState && (
            <div
              className={`p-5 rounded-xl border-2 ${
                ledgerState.chain_intact
                  ? 'bg-[#EDF7F4] border-[#006A4E]'
                  : 'bg-[#FFF0F1] border-[#FF3B4A]'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="font-extrabold text-base flex items-center gap-2">
                  {ledgerState.chain_intact ? (
                    <CheckCircle2 className="w-6 h-6 text-[#006A4E]" />
                  ) : (
                    <XOctagon className="w-6 h-6 text-[#FF3B4A]" />
                  )}
                  <span>
                    {ledgerState.chain_intact
                      ? t(
                          '✔ সম্পূর্ণ হ্যাশ-চেইন অক্ষত আছে (All Blocks Verified)',
                          '✔ Entire Hash-Chain Intact'
                        )
                      : t(
                          `✖ সতর্কতা: ${toBanglaDigits(
                            ledgerState.broken_blocks.length,
                            lang
                          )}টি ব্লকে জালিয়াতি বা পরিবর্তন ধরা পড়েছে!`,
                          `✖ ALERT: ${ledgerState.broken_blocks.length} Tampered Block(s) Detected in Chain!`
                        )}
                  </span>
                </div>
                <span className="font-mono text-[11px] bg-white px-3 py-1 rounded border">
                  DAILY_MERKLE_ROOT: {ledgerState.daily_merkle_root?.slice(0, 28)}...
                </span>
              </div>

              {ledgerState.broken_blocks.length > 0 && (
                <div className="mt-4 space-y-2">
                  {ledgerState.broken_blocks.map((b: any) => (
                    <div
                      key={b.deed_no}
                      className="p-3 rounded-lg bg-white border border-[#FF3B4A] font-mono text-xs"
                    >
                      <div className="font-bold text-[#FF3B4A]">
                        ✖ BLOCK #{b.chain_index} ({b.deed_no}) — HASH_MISMATCH
                      </div>
                      <div className="truncate">STORED_HASH: {b.stored_hash}</div>
                      <div className="truncate">ACTUAL_HASH: {b.recomputed_hash}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
            </div>
          )}
        </div>
      )}

      {/* TAB: Full Land Records & Plots Control Management System */}
      {subTab === 'plots_control' && plotsSubSegment === 'plots' && (
        <div className="space-y-6 animate-fadeIn">
          {renderPillar3Nav()}
          {/* Header Card */}
          <div className="panel p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#006A4E]/10 pb-4">
              <div>
                <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1.5">
                  <button onClick={() => handleTabChange('overview')} className="hover:text-[#006A4E] transition cursor-pointer">
                    {t('কন্ট্রোল প্যানেল', 'Control Panel')}
                  </button>
                  <span>/</span>
                  <span className="text-[#006A4E] font-extrabold">{t('ভূমি ও দাগ নিয়ন্ত্রণ কেন্দ্র', 'Plots & Land Control')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-[#006A4E]" />
                  <h2 className="font-bold text-lg text-[#074f38]">
                    {t(
                      'ভূমি ও দাগ নিয়ন্ত্রণ কেন্দ্র (Land Records & Plots Control Management)',
                      'Land Records & Plots Control Management System'
                    )}
                  </h2>
                </div>
                <p className="text-xs text-[#5F7A74] mt-1">
                  {t(
                    'সকল নিবন্ধিত দাগের লাইভ স্থিতি, বিক্রয় সুরক্ষা লক ব্যবস্থাপনা, ব্যাংক মর্টগেজ স্থিতি ও খতিয়ান নিরীক্ষা',
                    'Direct administrative oversight of all registered plots, sale-lock states, bank mortgages, and khatian lineages'
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <button
                  onClick={() => refreshAll()}
                  disabled={plotsLoading}
                  className="px-3.5 py-2 rounded-lg bg-[#EDF7F4] hover:bg-[#E2EFE9] text-[#006A4E] text-xs font-bold border border-[#006A4E]/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${plotsLoading ? 'animate-spin' : ''}`} />
                  <span>{t('রিফ্রেশ', 'Refresh Records')}</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500">
                  {t('মোট নিবন্ধিত দাগ', 'Total Registered Plots')}
                </div>
                <div className="text-xl font-extrabold text-slate-900 mt-1">
                  {toBanglaDigits(plotsList.length, lang)} {t('টি', '')}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                <div className="text-[11px] font-semibold text-rose-700 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>{t('বিক্রয় সুরক্ষিত (লক সক্রিয়)', 'Sale Protection Locked')}</span>
                </div>
                <div className="text-xl font-extrabold text-rose-900 mt-1">
                  {toBanglaDigits(plotsList.filter((p) => Number(p.owner_sale_locked) === 1).length, lang)} {t('টি', '')}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-[11px] font-semibold text-emerald-700">
                  {t('উন্মুক্ত / হস্তান্তরযোগ্য', 'Unlocked / Available')}
                </div>
                <div className="text-xl font-extrabold text-emerald-900 mt-1">
                  {toBanglaDigits(plotsList.filter((p) => Number(p.owner_sale_locked) === 0).length, lang)} {t('টি', '')}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                <div className="text-[11px] font-semibold text-blue-700 flex items-center gap-1">
                  <Landmark className="w-3 h-3" />
                  <span>{t('ব্যাংক বন্ধক ও লিয়েন', 'Bank Liens & Mortgages')}</span>
                </div>
                <div className="text-xl font-extrabold text-blue-900 mt-1">
                  {toBanglaDigits(allMortgages.length, lang)} {t('টি', '')}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200">
                <div className="text-[11px] font-semibold text-purple-700 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  <span>{t('প্রশাসনিক স্থগিতাদেশ', 'Admin Frozen')}</span>
                </div>
                <div className="text-xl font-extrabold text-purple-900 mt-1">
                  {toBanglaDigits(plotsList.filter((p) => Number(p.is_admin_frozen) === 1).length, lang)} {t('টি', '')}
                </div>
              </div>
            </div>

            {/* Action Notice */}
            {plotActionNotice && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                  plotActionNotice.err
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{plotActionNotice.msg}</span>
                </div>
                <button
                  onClick={() => setPlotActionNotice(null)}
                  className="font-bold text-xs hover:underline cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={plotSearchQuery}
                  onChange={(e) => setPlotSearchQuery(e.target.value)}
                  placeholder={t('দাগ নং, মৌজা, উপজেলা বা প্লট কোড দিয়ে খুঁজুন...', 'Search by Dag No, Mouza, Upazila or Plot Code...')}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { key: 'ALL', labelBn: 'সকল দাগ', labelEn: 'All Plots' },
                    { key: 'LOCKED', labelBn: 'সুরক্ষিত লক', labelEn: 'Locked' },
                    { key: 'UNLOCKED', labelBn: 'উন্মুক্ত', labelEn: 'Unlocked' },
                    { key: 'MORTGAGED', labelBn: 'ব্যাংক বন্ধক', labelEn: 'Mortgaged' },
                    { key: 'DISPUTED', labelBn: 'বিরোধযুক্ত', labelEn: 'Disputed' },
                    { key: 'FROZEN', labelBn: 'স্থগিতাদেশ', labelEn: 'Admin Frozen' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setPlotFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      plotFilter === f.key
                        ? 'bg-[#006A4E] text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {lang === 'bn' ? f.labelBn : f.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Plots Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">{t('দাগ নং ও কোড', 'Dag No & Code')}</th>
                    <th className="py-2.5 px-3 font-bold">{t('মৌজা ও এলাকা', 'Mouza & Location')}</th>
                    <th className="py-2.5 px-3 font-bold">{t('শ্রেণি ও পরিমাণ', 'Type & Area')}</th>
                    <th className="py-2.5 px-3 font-bold">{t('বিক্রয় সুরক্ষা লক', 'Sale Lock Status')}</th>
                    <th className="py-2.5 px-3 font-bold">{t('আইনি অবস্থা / বন্ধক', 'Legal / Encumbrance')}</th>
                    <th className="py-2.5 px-3 font-bold text-right">{t('অ্যাডমিন অ্যাকশন', 'Admin Controls')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plotsList
                    .filter((p) => {
                      const q = plotSearchQuery.toLowerCase().trim();
                      if (q) {
                        const matchDag = String(p.dag_no || '').includes(q) || String(p.dag_no_bn || '').includes(q);
                        const matchCode = String(p.plot_code || '').toLowerCase().includes(q);
                        const matchMouza = String(p.mouza_bn || '').toLowerCase().includes(q) || String(p.mouza_en || '').toLowerCase().includes(q);
                        const matchUpazila = String(p.upazila_bn || '').toLowerCase().includes(q) || String(p.upazila_en || '').toLowerCase().includes(q);
                        if (!matchDag && !matchCode && !matchMouza && !matchUpazila) return false;
                      }

                      const isLocked = Number(p.owner_sale_locked) === 1;
                      const hasMortgage = allMortgages.some((m: any) => m.plot_id === p.id && Number(m.is_active) === 1);
                      const hasDispute = allDisputes.some((d: any) => d.plot_id === p.id && d.status !== 'RESOLVED');

                      if (plotFilter === 'LOCKED') return isLocked;
                      if (plotFilter === 'UNLOCKED') return !isLocked;
                      if (plotFilter === 'MORTGAGED') return hasMortgage;
                      if (plotFilter === 'DISPUTED') return hasDispute;
                      if (plotFilter === 'FROZEN') return Number(p.is_admin_frozen) === 1;
                      return true;
                    })
                    .map((plot) => {
                      const isLocked = Number(plot.owner_sale_locked) === 1;
                      const hasMortgage = allMortgages.some((m: any) => m.plot_id === plot.id && Number(m.is_active) === 1);
                      const hasDispute = allDisputes.some((d: any) => d.plot_id === plot.id && d.status !== 'RESOLVED');

                      return (
                        <tr key={plot.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="font-extrabold text-sm text-[#006A4E] block">
                              দাগ #{lang === 'bn' ? plot.dag_no_bn || plot.dag_no : plot.dag_no}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 block">
                              {plot.plot_code}
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-900 block">
                              {lang === 'bn' ? plot.mouza_bn : plot.mouza_en}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {lang === 'bn' ? `${plot.upazila_bn}, ${plot.district_bn}` : `${plot.upazila_en}, ${plot.district_en}`}
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="font-medium text-slate-700 block">
                              {lang === 'bn' ? plot.land_type_bn : plot.land_type_en}
                            </span>
                            <span className="font-bold text-[#0A1F1C] text-[11px] block">
                              {toBanglaDigits(plot.total_area_decimal, lang)} {t('শতাংশ', 'decimals')}
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            {isLocked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                                <Lock className="w-3 h-3" />
                                <span>{t('বিক্রয় লক সক্রিয়', 'Sale Locked')}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <Check className="w-3 h-3" />
                                <span>{t('উন্মুক্ত / সক্রিয়', 'Unlocked')}</span>
                              </span>
                            )}
                            {plot.locked_by_nid && (
                              <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                                by NID: {plot.locked_by_nid}
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="flex flex-col gap-1">
                              {Number(plot.is_admin_frozen) === 1 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white animate-pulse" title={plot.admin_freeze_reason || 'প্রশাসনিক স্থগিতাদেশ'}>
                                  <ShieldAlert className="w-2.5 h-2.5" />
                                  <span>{t('স্থগিতাদেশ (FROZEN)', 'FROZEN')}</span>
                                </span>
                              )}
                              {hasMortgage && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <Landmark className="w-2.5 h-2.5" />
                                  <span>{t('ব্যাংক বন্ধকযুক্ত', 'Bank Lien')}</span>
                                </span>
                              )}
                              {hasDispute && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  <span>{t('সক্রিয় বিবাদ', 'Disputed')}</span>
                                </span>
                              )}
                              {!hasMortgage && !hasDispute && (
                                <span className="text-[11px] font-semibold text-emerald-700">
                                  {t('নিষ্কণ্টক রেকর্ড', 'Clean Title')}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setFreezeModalPlot(plot);
                                  setFreezeReason(plot.admin_freeze_reason || 'উচ্চ আদালতের স্থগিতাদেশ (High Court Stay Order)');
                                  setFreezeCustomReason('');
                                }}
                                disabled={plotsLoading}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold border transition cursor-pointer min-h-[30px] flex items-center gap-1 ${
                                  Number(plot.is_admin_frozen) === 1
                                    ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                                    : 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200'
                                }`}
                                title={t('সার্বভৌম প্রশাসনিক স্থগিতাদেশ নিয়ন্ত্রণ', 'Super Admin Plot Freeze Control')}
                              >
                                <ShieldAlert className="w-3 h-3" />
                                <span>
                                  {Number(plot.is_admin_frozen) === 1
                                    ? t('স্থগিতাদেশ প্রত্যাহার', 'Release Freeze')
                                    : t('প্রশাসনিক ফ্রিজ', 'Admin Freeze')}
                                </span>
                              </button>

                              <button
                                onClick={() => handleAdminToggleSaleLock(plot)}
                                disabled={plotsLoading}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold border transition cursor-pointer min-h-[30px] flex items-center gap-1 ${
                                  isLocked
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                    : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                                }`}
                              >
                                <Lock className="w-3 h-3" />
                                <span>
                                  {isLocked
                                    ? t('আনলক করুন', 'Unlock')
                                    : t('লক করুন', 'Lock Sale')}
                                </span>
                              </button>

                              <button
                                onClick={() => handleInspectPlot(plot.id)}
                                disabled={plotDetailLoading}
                                className="px-2.5 py-1 rounded bg-[#EDF7F4] hover:bg-[#E2EFE9] text-[#006A4E] border border-[#006A4E]/20 text-[11px] font-bold transition cursor-pointer min-h-[30px] flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>{t('তদন্ত ও বিবরণ', 'Inspect')}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Plot Details Modal */}
          {selectedPlotDetail && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in duration-150">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                      {selectedPlotDetail.plot_code || 'PLOT-RECORD'}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">
                      {t('দাগ নং', 'Plot Dag No')}: {selectedPlotDetail.dag_no_bn || selectedPlotDetail.dag_no} • {selectedPlotDetail.mouza_bn || selectedPlotDetail.mouza}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {t('জমির শ্রেণি:', 'Land Type:')} {selectedPlotDetail.land_type_bn || selectedPlotDetail.land_type} • {t('মোট আয়তন:', 'Total Area:')} {selectedPlotDetail.total_area_decimal} {t('শতাংশ', 'decimals')}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPlotDetail(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Owners Section */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#006A4E]" />
                    <span>{t('রেকর্ডকৃত বর্তমান মালিকগণ (Recorded Owners)', 'Recorded Legal Owners')}</span>
                  </h4>
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold">
                        <tr>
                          <th className="p-2.5">মালিকের নাম</th>
                          <th className="p-2.5">পিতা/স্বামীর নাম</th>
                          <th className="p-2.5">জাতীয় পরিচয়পত্র (NID)</th>
                          <th className="p-2.5 text-right">মালিকানার অংশ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(selectedPlotDetail.owners || []).map((o: any, idx: number) => (
                          <tr key={idx} className="bg-white">
                            <td className="p-2.5 font-bold text-slate-900">{o.name_bn || o.name_en}</td>
                            <td className="p-2.5 text-slate-600">{o.father_name_bn || o.father_name || '—'}</td>
                            <td className="p-2.5 font-mono text-slate-700">{o.nid || o.nid_mock}</td>
                            <td className="p-2.5 text-right font-bold text-[#006A4E]">
                              {toBanglaDigits(o.area_decimal, lang)} শতাংশ
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Khatian Chain Lineage */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#006A4E]" />
                    <span>{t('ঐতিহাসিক খতিয়ান ধারাবাহিকতা (CS → SA → RS → BS)', 'Historical Khatian Chain')}</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['CS', 'SA', 'RS', 'BS'].map((type) => {
                      const rec = (selectedPlotDetail.khatian_chain || []).find((k: any) => k.type === type || k.survey_type === type);
                      return (
                        <div key={type} className="p-3 rounded-xl border border-slate-200 bg-white">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-xs text-[#006A4E]">{type} খতিয়ান</span>
                            <span className="text-[10px] font-mono text-slate-400">#{rec?.khatian_no || '—'}</span>
                          </div>
                          <div className="text-[11px] text-slate-700 font-bold mt-1">
                            {rec?.owner_name_bn || rec?.owner_name || 'রেকর্ডপ্রাপ্ত'}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            আয়তন: {rec?.area_decimal ?? selectedPlotDetail.total_area_decimal} শতাংশ
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Protection Lock Status & Direct Action */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-xs text-slate-900">
                      {t('বর্তমান বিক্রয় সুরক্ষা স্থিতি:', 'Current Sale Protection Status:')}{' '}
                      <span className={Number(selectedPlotDetail.owner_sale_locked) === 1 ? 'text-rose-700 font-extrabold' : 'text-emerald-700 font-extrabold'}>
                        {Number(selectedPlotDetail.owner_sale_locked) === 1 ? t('সুরক্ষিত (লক সক্রিয়)', 'Locked') : t('উন্মুক্ত', 'Unlocked')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t('সরাসরি অ্যাডমিন কন্ট্রোল থেকে দাগের বিক্রয় অনুমতি পরিচালনা করুন।', 'Manage sale permission directly from administrative control.')}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      handleAdminToggleSaleLock(selectedPlotDetail);
                      setSelectedPlotDetail(null);
                    }}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer min-h-[36px] flex items-center gap-1.5 self-start sm:self-auto ${
                      Number(selectedPlotDetail.owner_sale_locked) === 1
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-rose-600 hover:bg-rose-700 text-white'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      {Number(selectedPlotDetail.owner_sale_locked) === 1
                        ? t('বিক্রয় লক নিষ্ক্রিয় করুন', 'Unlock Plot')
                        : t('বিক্রয় লক সক্রিয় করুন', 'Lock Plot for Sale Protection')}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {renderMasterFreezeModal()}
        </div>
      )}

      {/* TAB 3: Automated Risk Protocols & OCR Assist */}
      {(subTab === 'risk_protocols' || (subTab === 'settings' && settingsSubSegment === 'fraud_policy')) && (
        <div className="space-y-6 animate-fadeIn">
          {renderPillar5Nav()}
          <div className="panel p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1.5">
                  <button onClick={() => handleTabChange('overview')} className="hover:text-[#006A4E] transition cursor-pointer">
                    {t('কন্ট্রোল প্যানেল', 'Control Panel')}
                  </button>
                  <span>/</span>
                  <span className="text-[#006A4E] font-extrabold">{t('ঝুঁকি প্রটোকল ও OCR', 'Risk Protocols & OCR')}</span>
                </div>
                <h2 className="text-lg font-extrabold text-[#0A1F1C]">
                  {t(
                    'ভূমি ঝুঁকি ও অখণ্ডতা যাচাই প্রটোকল (৯টি স্বয়ংক্রিয় ভেরিফিকেশন ইঞ্জিন)',
                    'Automated Land Risk & Integrity Protocols (9 Real-Time Verification Engines)'
                  )}
                </h2>
                <p className="text-xs text-[#5F7A74] mt-0.5">
                  {t(
                    'কোনো কৃত্রিম বা পূর্ব-নির্ধারিত সিনারিও নয় — প্রতিটি দলিল ও মিউটেশন আবেদন ডাটাবেজের বাস্তব তথ্যের উপর ভিত্তি করে এই ইঞ্জিনগুলোর মাধ্যমে রিয়েল-টাইমে যাচাই হয়:',
                    'No pre-decided outcomes — every deed and mutation request is evaluated at request time against real database rows:'
                  )}
                </p>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                {t('সকল ইঞ্জিন সক্রিয় (Active)', 'All Engines Active')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  code: 'RULE-1',
                  rule_id: 'DOUBLE_SALE',
                  title_bn: 'দ্বৈত বিক্রয় ও সাব-রেজিস্ট্রি বিরোধ প্রতিরোধ',
                  title_en: 'Double-Sale & Pending Registration Conflict',
                  desc_bn: 'একই দাগে সাব-রেজিস্ট্রিতে অনিষ্পন্ন দলিল বা সদ্য নিবন্ধিত দলিল মিউটেশন সম্পন্ন হওয়ার পূর্বে নতুন দলিল সম্পাদন সম্পূর্ণ নিষিদ্ধ করে।',
                  desc_en: 'Detects concurrent un-mutated registered deeds or active transfer requests on the same parcel before accepting new deeds.',
                  severity: 'HIGH_RISK',
                },
                {
                  code: 'RULE-2',
                  rule_id: 'OVER_SELLING',
                  title_bn: 'হিস্যা ও খতিয়ান শতাংশের অতিরিক্ত বিক্রয় রোধ',
                  title_en: 'Cumulative Share & Area Overflow Protection',
                  desc_bn: 'খতিয়ানে লিপিবদ্ধ হিস্যার অতিরিক্ত বা দাগের অবশিষ্ট বৈধ পরিমাণের চেয়ে বেশি জমি হস্তান্তরের চেষ্টা স্বয়ংক্রিয়ভাবে প্রতিহত করে।',
                  desc_en: 'Calculates cumulative historical transfers against khatian fractional share (hissya) to prevent overselling.',
                  severity: 'HIGH_RISK',
                },
                {
                  code: 'RULE-3',
                  rule_id: 'CO_OWNER_CONFLICT',
                  title_bn: 'সহ-মালিক বা ওয়ারিশানদের প্রি-এম্পশন অধিকার সুরক্ষা',
                  title_en: 'Co-Owner Preemption & Farayez Inheritance Rights',
                  desc_bn: 'অংশীদার ও ওয়ারিশানদের নোটিশ ও রেজিস্ট্রিকৃত আপস বণ্টননামা ব্যতীত একক অংশ হস্তান্তরের ক্ষেত্রে সতর্কতা জারি।',
                  desc_en: 'Flags unpartitioned co-heir estates where mandatory preemption notice or mutual partition is missing.',
                  severity: 'WARNING',
                },
                {
                  code: 'RULE-4',
                  rule_id: 'LITIGATION_PENDING',
                  title_bn: 'আদালতের দেওয়ানি নিষেধাজ্ঞা ও মামলা ফিল্টার',
                  title_en: 'Civil Court Injunction & Active Litigation Filter',
                  desc_bn: 'বিজ্ঞ আদালত কর্তৃক স্থিতাবস্থা বা নিষেধাজ্ঞার আদেশ কার্যকর থাকা অবস্থায় জমির যে-কোনো প্রকার নামজারি বা দলিল রেজিস্ট্রি সাময়িক স্থগিতকরণ।',
                  desc_en: 'Enforces immediate transaction freeze upon active injunction or title dispute reported in land records.',
                  severity: 'HIGH_RISK',
                },
                {
                  code: 'RULE-5',
                  rule_id: 'DEED_TAMPERED',
                  title_bn: 'ক্রিপ্টোগ্রাফিক হ্যাশ-চেইন ও লেজার অখণ্ডতা যাচাই',
                  title_en: 'Cryptographic Hash-Chain & Record Tampering Defense',
                  desc_bn: 'SHA-256 চেইন ও Ed25519 ডিজিটাল স্বাক্ষরের সাথে ডাটাবেজ কন্টেন্টের মিল না থাকলে সাথে সাথে অখণ্ডতা লঙ্ঘন লাল সতর্কতা জারি।',
                  desc_en: 'Mathematically verifies digital record hash against immutable ledger chain to expose unauthorized database changes.',
                  severity: 'HIGH_RISK',
                },
                {
                  code: 'RULE-6',
                  rule_id: 'KHATIAN_CHAIN_BROKEN',
                  title_bn: 'ঐতিহাসিক খতিয়ান ধারাবাহিকতা (CS → SA → RS → BS)',
                  title_en: 'Historical Survey Chain Continuity (CS → SA → RS → BS)',
                  desc_bn: 'সিএস হতে বিএস পর্যন্ত জরিপ খতিয়ান ও মধ্যবর্তী হস্তান্তরের বৈধ বায়া দলিল অনুপস্থিত থাকলে লিগ্যাসি চেইন বিচ্যুতি চিহ্নিতকরণ।',
                  desc_en: 'Traces unbroken genealogical lineage through all four survey settlements before allowing mutation endorsement.',
                  severity: 'WARNING',
                },
                {
                  code: 'RULE-7',
                  rule_id: 'GOVT_KHAS_ENCROACHMENT',
                  title_bn: 'সরকারি ১নং খাস, অর্পিত ও পরিত্যক্ত সম্পত্তি সুরক্ষা',
                  title_en: 'Government Khas & Vested Property Safeguard',
                  desc_bn: 'সরকারি ১নং খাস খতিয়ান, অর্পিত সম্পত্তি (ক/খ তফসিল) ও নদীভাঙন জমি ব্যক্তিমালিকানায় রেজিস্ট্রি কঠোরভাবে প্রতিহতকরণ।',
                  desc_en: 'Strict gatekeeper disallowing registration or mutation of parcels classified under government Gazette or Schedule Ka/Kha.',
                  severity: 'HIGH_RISK',
                },
                {
                  code: 'RULE-8',
                  rule_id: 'UNPARTITIONED_INHERITANCE',
                  title_bn: 'অসম্পূর্ণ বণ্টননামা ও অপ্রাপ্তবয়স্ক স্বার্থ সংরক্ষণ',
                  title_en: 'Unpartitioned Inheritance & Minor Heir Protection',
                  desc_bn: 'ওয়ারিশানদের মধ্যে অপ্রাপ্তবয়স্ক ব্যক্তি থাকলে উপযুক্ত অভিভাবক সনদ ও আদালতের অনুমতি ছাড়া হস্তান্তর প্রতিরোধ।',
                  desc_en: 'Requires court guardian certification before accepting transfers affecting minors in undivided estates.',
                  severity: 'WARNING',
                },
                {
                  code: 'RULE-9',
                  rule_id: 'MORTGAGE_LIEN_ACTIVE',
                  title_bn: 'তফসিলি ব্যাংক বন্ধক ও আর্থিক দায়মুক্তি যাচাই',
                  title_en: 'Institutional Bank Mortgage & Lien Clearance',
                  desc_bn: 'আর্থিক প্রতিষ্ঠানে বন্ধকী জমিতে ব্যাংকের বৈধ নো-অবজেকশন সার্টিফিকেট (NOC) বা দায়মুক্তি দলিল ব্যতীত যেকোনো হস্তান্তর ব্লক।',
                  desc_en: 'Queries institutional lien registry and requires cryptographic NOC before deed registration can proceed.',
                  severity: 'HIGH_RISK',
                },
              ].map((rule) => (
                <div
                  key={rule.code}
                  className="p-4 rounded-xl bg-[#EDF7F4]/80 border border-[#006A4E]/12 flex flex-col justify-between gap-3 shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-extrabold text-xs text-[#006A4E] font-mono">
                        {rule.code}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          rule.severity === 'HIGH_RISK'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rule.rule_id}
                      </span>
                    </div>
                    <h3 className="font-bold text-xs text-[#0A1F1C]">
                      {lang === 'bn' ? rule.title_bn : rule.title_en}
                    </h3>
                    <p className="text-[11px] text-[#5F7A74] mt-1.5 leading-relaxed">
                      {lang === 'bn' ? rule.desc_bn : rule.desc_en}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#006A4E]/10 flex items-center justify-between text-[10px] font-bold text-[#006A4E]">
                    <span>{t('স্বয়ংক্রিয় ইঞ্জিন ভেরিফিকেশন', 'Automated Verification')}</span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {t('সক্রিয়', 'ONLINE')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {ocrSample && ocrSample.extracted_fields && (
            <div className="panel p-6 space-y-4">
              <div className="flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-[#006A4E]" />
                <h2 className="text-lg font-extrabold text-[#0A1F1C]">
                  {t(
                    'পুরাতন স্ক্যানকৃত খতিয়ান ডিজিটাইজেশন সহায়ক (Bangla OCR Assist + মানব যাচাই)',
                    'Legacy Khatian Digitization Assist (Bangla OCR + Officer Review)'
                  )}
                </h2>
              </div>

              {/* Official OCR Digitization Assist Notice */}
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#006A4E] shrink-0" />
                <span>
                  <strong>{t('ঐতিহাসিক খতিয়ান ডিজিটাইজেশন ড্রাফট:', 'HISTORICAL KHATIAN OCR DRAFT:')}</strong>{' '}
                  {t(
                    'ঐতিহাসিক হস্তলিখিত খতিয়ানের ডিজিটাল ড্রাফট ও মেশিন কনফিডেন্স স্কোর। আইনি স্বীকৃতির পূর্বে সংশ্লিষ্ট সহকারী কমিশনার (ভূমি) বা কানুনগো দ্বারা যাচাই সাপেক্ষ।',
                    'Digital draft and machine confidence scores for historical handwritten khatians. Requires human officer review before final legal acceptance.'
                  )}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(ocrSample.extracted_fields).map(([key, val]: [string, any]) => {
                  const confNum =
                    typeof val?.confidence === 'number' && !isNaN(val.confidence)
                      ? Math.round(val.confidence * 100)
                      : 95;
                  return (
                    <div
                      key={key}
                      className={`p-3 rounded-xl border ${
                        val.low_confidence
                          ? 'bg-amber-50 border-amber-300'
                          : 'bg-[#EDF7F4]/80 border-[#006A4E]/12'
                      }`}
                    >
                      <div className="text-[11px] font-bold uppercase text-[#5F7A74]">{key}</div>
                      <input
                        type="text"
                        defaultValue={val.value}
                        className="w-full mt-1 p-2 rounded bg-white border border-[#006A4E]/20 text-xs font-bold"
                      />
                      <div className="text-[11px] mt-1 font-semibold">
                        Confidence: {confNum}%{' '}
                        {val.low_confidence && t('⚠ মানব যাচাই প্রয়োজন', '⚠ Officer Review Needed')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Users CRUD Management & Role Filter Control System */}
      {subTab === 'users' && (usersSubSegment === 'directory' || usersSubSegment === 'transfer') && (
        <div className="space-y-6 animate-fadeIn">
          {renderPillar2Nav()}

          {usersSubSegment === 'transfer' && renderOfficerTransferDesk()}

          {usersSubSegment === 'directory' && (
            <>
              {/* Notification Banner */}
          {userActionNotice && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold animate-fadeIn ${
                userActionNotice.err
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800'
              }`}
            >
              <span>{userActionNotice.msg}</span>
              <button
                onClick={() => setUserActionNotice(null)}
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Top KPI Metrics Overview */}
          {(() => {
            const totalUsers = usersList.length;
            const citizenUsers = usersList.filter((u) => u.role === 'citizen');
            const pendingCitizens = citizenUsers.filter((u) => Number(u.is_identity_verified) !== 1);
            const officerUsers = usersList.filter((u) =>
              ['sub_registrar', 'ac_land', 'bank_officer', 'field_verification_officer'].includes(u.role)
            );
            const adminUsers = usersList.filter((u) => u.role === 'admin' || u.role === 'system_admin');

            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div
                  onClick={() => {
                    handleRoleSelectChange('all');
                    setUserStatusFilter('all');
                  }}
                  className="panel p-4 bg-white border border-slate-200 shadow-2xs cursor-pointer hover:border-[#006A4E] transition"
                >
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">{t('মোট অ্যাকাউন্ট', 'Total Accounts')}</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{toBanglaDigits(totalUsers, lang)}</div>
                  <span className="text-[10px] text-slate-400">{t('প্ল্যাটফর্মে নিবন্ধিত', 'Registered in system')}</span>
                </div>

                <div
                  onClick={() => {
                    handleRoleSelectChange('citizen');
                    setUserStatusFilter('all');
                  }}
                  className="panel p-4 bg-white border border-slate-200 shadow-2xs cursor-pointer hover:border-blue-500 transition"
                >
                  <span className="text-[11px] font-bold text-blue-600 uppercase block">{t('সাধারণ নাগরিক', 'Citizens')}</span>
                  <div className="text-2xl font-black text-blue-900 mt-1">{toBanglaDigits(citizenUsers.length, lang)}</div>
                  <span className="text-[10px] text-slate-400">{t('ভূমি মালিক ও আবেদনকারী', 'Landholders & Public')}</span>
                </div>

                <div
                  onClick={() => {
                    handleRoleSelectChange('citizen');
                    setUserStatusFilter('pending');
                  }}
                  className={`panel p-4 cursor-pointer transition border shadow-2xs ${
                    pendingCitizens.length > 0
                      ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/30'
                      : 'bg-white border-slate-200 hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-800 uppercase">{t('অপেক্ষমাণ অনুমোদন', 'Pending Approval')}</span>
                    {pendingCitizens.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    )}
                  </div>
                  <div className="text-2xl font-black text-amber-900 mt-1">{toBanglaDigits(pendingCitizens.length, lang)}</div>
                  <span className="text-[10px] text-amber-700 font-semibold">{t('যাচাই ও অনুমোদন প্রয়োজন', 'Awaiting Verification')}</span>
                </div>

                <div
                  onClick={() => {
                    handleRoleSelectChange('sub_registrar');
                    setUserStatusFilter('all');
                  }}
                  className="panel p-4 bg-white border border-slate-200 shadow-2xs cursor-pointer hover:border-emerald-500 transition"
                >
                  <span className="text-[11px] font-bold text-[#006A4E] uppercase block">{t('কর্মকর্তাবৃন্দ', 'Officers')}</span>
                  <div className="text-2xl font-black text-[#074f38] mt-1">{toBanglaDigits(officerUsers.length, lang)}</div>
                  <span className="text-[10px] text-slate-400">{t('সাব-রেজিস্ট্রার, এসি ল্যান্ড ও ব্যাংক', 'Registry, Land & Bank')}</span>
                </div>

                <div
                  onClick={() => {
                    handleRoleSelectChange('admin');
                    setUserStatusFilter('all');
                  }}
                  className="panel p-4 bg-white border border-slate-200 shadow-2xs cursor-pointer hover:border-purple-500 transition"
                >
                  <span className="text-[11px] font-bold text-purple-600 uppercase block">{t('অ্যাডমিনিস্ট্রেটর', 'Administrators')}</span>
                  <div className="text-2xl font-black text-purple-900 mt-1">{toBanglaDigits(adminUsers.length, lang)}</div>
                  <span className="text-[10px] text-slate-400">{t('সুপার অ্যাডমিন ও অডিটর', 'Security & Governance')}</span>
                </div>
              </div>
            );
          })()}

          {/* Filter & Action Toolbar */}
          <div className="panel p-4 bg-white border border-slate-200 space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder={t(
                    'ইউজারনেম, নাম, এনআইডি, মোবাইল, ইমেইল বা অফিস দিয়ে খুঁজুন...',
                    'Search by username, name, NID, phone, email, or office...'
                  )}
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-[#006A4E] focus:ring-1 focus:ring-[#006A4E] bg-white"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                {userSearchQuery && (
                  <button
                    onClick={() => setUserSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Add New User Button (Opens Center Popup Modal) */}
              <button
                onClick={() => setIsCreateUserOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs cursor-pointer shadow-xs transition flex items-center justify-center gap-2 shrink-0 min-h-[40px]"
              >
                <UserPlus className="w-4 h-4" />
                <span>{t('+ নতুন ব্যবহারকারী / কর্মকর্তা যুক্ত করুন', '+ Add New Officer / User')}</span>
              </button>
            </div>

            {/* Dropdown Filters Row */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 font-bold shrink-0">
                <Filter className="w-3.5 h-3.5 text-[#006A4E]" />
                <span>{t('ফিল্টারিং:', 'Filter:')}</span>
              </div>

              {/* Role Dropdown */}
              <select
                value={userRoleFilter}
                onChange={(e) => handleRoleSelectChange(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-xs text-slate-700 focus:border-[#006A4E] focus:ring-1 focus:ring-[#006A4E]"
              >
                <option value="all">{t('সকল ভূমিকা (All Roles)', 'All Roles')}</option>
                <option value="citizen">{t('নাগরিক (Citizen)', 'Citizen')}</option>
                <option value="sub_registrar">{t('সাব-রেজিস্ট্রার (Sub-Registrar)', 'Sub-Registrar')}</option>
                <option value="ac_land">{t('এসি ল্যান্ড (AC Land)', 'AC Land')}</option>
                <option value="bank_officer">{t('ব্যাংক কর্মকর্তা (Bank Officer)', 'Bank Officer')}</option>
                <option value="field_verification_officer">{t('ফিল্ড অফিসার (Field Officer)', 'Field Officer')}</option>
                <option value="registry_data_officer">{t('রেজিস্ট্রি ডেটা অফিসার (Registry Data)', 'Registry Data Officer')}</option>
                <option value="settlement_officer">{t('সার্ভেয়ার / সেটেলমেন্ট অফিসার (Settlement)', 'Settlement Officer')}</option>
                <option value="uno_supervisor">{t('ইউএনও / এডিসি সুপারভাইজার (UNO/ADC)', 'UNO Supervisor')}</option>
                <option value="udc_operator">{t('ইউডিসি উদ্যোক্তা (UDC)', 'UDC Operator')}</option>
                <option value="support_agent">{t('সাপোর্ট এজেন্ট (Support)', 'Support Agent')}</option>
                <option value="admin">{t('সিস্টেম অ্যাডমিন (Admin)', 'System Admin')}</option>
              </select>

              {/* Status Dropdown */}
              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-xs text-slate-700 focus:border-[#006A4E] focus:ring-1 focus:ring-[#006A4E]"
              >
                <option value="all">{t('সকল স্ট্যাটাস (All Status)', 'All Status')}</option>
                <option value="pending">{t('⚠️ অপেক্ষমাণ অনুমোদন (Pending Approval)', '⚠️ Pending Approval')}</option>
                <option value="verified">{t('✓ সক্রিয় ও যাচাইকৃত (Active & Verified)', '✓ Active & Verified')}</option>
                <option value="disabled">{t('⛔ নিষ্ক্রিয় / স্থগিত (Suspended)', '⛔ Suspended')}</option>
              </select>

              {/* Join Date Filter Dropdown */}
              <select
                value={userJoinDateFilter}
                onChange={(e) => setUserJoinDateFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-xs text-slate-700 focus:border-[#006A4E] focus:ring-1 focus:ring-[#006A4E]"
              >
                <option value="all">{t('যোগদানের তারিখ: সকল সময়', 'Join Date: All Time')}</option>
                <option value="today">{t('আজকে নিবন্ধিত (Registered Today)', 'Registered Today')}</option>
                <option value="7days">{t('গত ৭ দিন (Last 7 Days)', 'Last 7 Days')}</option>
                <option value="30days">{t('গত ৩০ দিন (Last 30 Days)', 'Last 30 Days')}</option>
                <option value="custom">{t('কাস্টম তারিখ পরিসীমা (Custom Range)', 'Custom Date Range')}</option>
              </select>

              {/* Custom Date Range Inputs */}
              {userJoinDateFilter === 'custom' && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={userDateFrom}
                    onChange={(e) => setUserDateFrom(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono"
                    title={t('শুরুর তারিখ', 'Start Date')}
                  />
                  <span className="text-slate-400 text-xs">-</span>
                  <input
                    type="date"
                    value={userDateTo}
                    onChange={(e) => setUserDateTo(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono"
                    title={t('শেষের তারিখ', 'End Date')}
                  />
                </div>
              )}

              {/* Reset Filters button if any filter applied */}
              {(userRoleFilter !== 'all' || userStatusFilter !== 'all' || userJoinDateFilter !== 'all' || userSearchQuery || userDateFrom || userDateTo) && (
                <button
                  onClick={() => {
                    handleRoleSelectChange('all');
                    setUserStatusFilter('all');
                    setUserJoinDateFilter('all');
                    setUserSearchQuery('');
                    setUserDateFrom('');
                    setUserDateTo('');
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 font-bold text-xs cursor-pointer transition flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t('রিসেট', 'Reset')}</span>
                </button>
              )}
            </div>
          </div>

          {/* User Directory Table with Horizontal Scroll */}
          {(() => {
            const matchDate = (createdAtStr?: string) => {
              if (userJoinDateFilter === 'all') return true;
              if (!createdAtStr) return false;
              const createdDate = new Date(createdAtStr);
              if (isNaN(createdDate.getTime())) return true;

              const now = new Date();
              if (userJoinDateFilter === 'today') {
                return createdDate.toDateString() === now.toDateString();
              }
              if (userJoinDateFilter === '7days') {
                const diffDays = (now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24);
                return diffDays >= 0 && diffDays <= 7;
              }
              if (userJoinDateFilter === '30days') {
                const diffDays = (now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24);
                return diffDays >= 0 && diffDays <= 30;
              }
              if (userJoinDateFilter === 'custom') {
                if (userDateFrom) {
                  const from = new Date(userDateFrom);
                  from.setHours(0, 0, 0, 0);
                  if (createdDate < from) return false;
                }
                if (userDateTo) {
                  const to = new Date(userDateTo);
                  to.setHours(23, 59, 59, 999);
                  if (createdDate > to) return false;
                }
                return true;
              }
              return true;
            };

            const filteredUsers = usersList.filter((u: any) => {
              if (userRoleFilter !== 'all') {
                if (userRoleFilter === 'admin') {
                  if (u.role !== 'admin' && u.role !== 'system_admin') return false;
                } else if (userRoleFilter === 'service_point_operator' || userRoleFilter === 'udc_operator') {
                  if (u.role !== 'service_point_operator' && u.role !== 'udc_operator') return false;
                } else if (userRoleFilter === 'settlement_records_officer' || userRoleFilter === 'settlement_officer') {
                  if (u.role !== 'settlement_records_officer' && u.role !== 'settlement_officer') return false;
                } else if (u.role !== userRoleFilter) {
                  return false;
                }
              }
              if (userStatusFilter === 'pending') {
                if (u.role !== 'citizen' || Number(u.is_identity_verified) === 1) return false;
              } else if (userStatusFilter === 'verified') {
                if (Number(u.is_active) !== 1) return false;
                if (u.role === 'citizen' && Number(u.is_identity_verified) !== 1) return false;
              } else if (userStatusFilter === 'disabled') {
                if (Number(u.is_active) !== 0) return false;
              }
              if (!matchDate(u.created_at)) return false;
              if (userSearchQuery.trim()) {
                const q = userSearchQuery.toLowerCase();
                const match =
                  (u.username || '').toLowerCase().includes(q) ||
                  (u.full_name_bn || '').toLowerCase().includes(q) ||
                  (u.full_name_en || '').toLowerCase().includes(q) ||
                  (u.email || '').toLowerCase().includes(q) ||
                  (u.phone_mock || u.phone_dummy || '').includes(q) ||
                  (u.nid_mock || u.nid || '').includes(q) ||
                  (u.office_name || u.office_bn || '').toLowerCase().includes(q);
                if (!match) return false;
              }
              return true;
            });

            return (
              <div className="panel p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#006A4E]" />
                    <h2 className="font-bold text-base text-slate-900">
                      {t('ব্যবহারকারী ও কর্মকর্তা তালিকা', 'Users & Officers List')}
                    </h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EDF7F4] text-[#006A4E] font-bold">
                      {toBanglaDigits(filteredUsers.length, lang)} {t('জন প্রদর্শিত', 'shown')}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 font-medium">
                    {t('মোট নিবন্ধিত: ', 'Total Registered: ')} {toBanglaDigits(usersList.length, lang)} {t('জন', 'users')}
                  </div>
                </div>

                {filteredUsers.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <Users className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-500 font-bold">
                      {t('কোনো ব্যবহারকারী খুঁজে পাওয়া যায়নি।', 'No users matched the selected filters.')}
                    </p>
                    <button
                      onClick={() => {
                        handleRoleSelectChange('all');
                        setUserStatusFilter('all');
                        setUserJoinDateFilter('all');
                        setUserSearchQuery('');
                        setUserDateFrom('');
                        setUserDateTo('');
                      }}
                      className="text-xs text-[#006A4E] font-bold hover:underline cursor-pointer"
                    >
                      {t('সকল ফিল্টার রিসেট করুন', 'Reset all filters')}
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs whitespace-nowrap min-w-[950px]">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-3 w-12 text-center">#</th>
                          <th className="py-3 px-4">{t('নাম ও ইউজারনেম', 'Name & Username')}</th>
                          <th className="py-3 px-3">{t('ভূমিকা', 'Role')}</th>
                          <th className="py-3 px-3">{t('যোগাযোগ', 'Contact')}</th>
                          <th className="py-3 px-3">{t('অফিস / এলাকা', 'Office / Area')}</th>
                          <th className="py-3 px-3">{t('যোগদানের তারিখ', 'Join Date')}</th>
                          <th className="py-3 px-3">{t('স্ট্যাটাস', 'Status')}</th>
                          <th className="py-3 px-3 text-right">{t('অ্যাকশন', 'Actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredUsers.map((u: any, idx: number) => {
                          const isPendingCitizen = u.role === 'citizen' && Number(u.is_identity_verified) !== 1;
                          const isVerifiedCitizen = u.role === 'citizen' && Number(u.is_identity_verified) === 1;

                          return (
                            <tr
                              key={u.id}
                              className={`hover:bg-slate-50/80 transition ${
                                isPendingCitizen ? 'bg-amber-50/50' : ''
                              }`}
                            >
                              <td className="py-3 px-3 text-center font-mono text-slate-400">
                                {toBanglaDigits(idx + 1, lang)}
                              </td>

                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0 overflow-hidden">
                                    {u.avatar_url ? (
                                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <span>{(u.full_name_bn || u.username || 'ব')[0]}</span>
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900">
                                      {lang === 'bn' ? u.full_name_bn : (u.full_name_en || u.full_name_bn)}
                                    </div>
                                    <div className="text-[11px] font-mono text-[#006A4E]">
                                      @{u.username}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                  u.role === 'citizen'
                                    ? 'bg-blue-100 text-blue-800'
                                    : ['sub_registrar', 'ac_land', 'field_verification_officer'].includes(u.role)
                                    ? 'bg-emerald-100 text-[#006A4E]'
                                    : u.role === 'bank_officer'
                                    ? 'bg-amber-100 text-amber-800'
                                    : ['admin', 'system_admin'].includes(u.role)
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-slate-100 text-slate-800'
                                }`}>
                                  {u.role}
                                </span>
                              </td>

                              <td className="py-3 px-3 text-slate-600 font-mono">
                                <div className="flex items-center gap-1 text-[11px]">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{u.phone_mock || u.phone_dummy || '—'}</span>
                                </div>
                                {u.email && (
                                  <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate max-w-[140px]">
                                    <Mail className="w-3 h-3 text-slate-400" />
                                    <span>{u.email}</span>
                                  </div>
                                )}
                              </td>

                              <td className="py-3 px-3 text-slate-700 max-w-[160px] truncate" title={u.office_name || u.office_bn}>
                                {u.office_name || u.office_bn || '—'}
                              </td>

                              <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                                {formatUserDate(u.created_at)}
                              </td>

                              <td className="py-3 px-3">
                                <div className="flex flex-col gap-1 items-start">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                    u.is_active ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                                  }`}>
                                    {u.is_active ? 'ACTIVE' : 'DISABLED'}
                                  </span>
                                  {u.role === 'citizen' && (
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                      isVerifiedCitizen
                                        ? 'text-blue-700 bg-blue-50'
                                        : 'text-amber-700 bg-amber-100 animate-pulse font-bold'
                                    }`}>
                                      {isVerifiedCitizen ? t('আইডি যাচাইকৃত', 'Verified') : t('⚠️ পেন্ডিং', 'Pending')}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Eye Button for Full Details Modal */}
                                  <button
                                    onClick={() => setSelectedUserDetail(u)}
                                    className="p-1.5 rounded-lg bg-[#EDF7F4] hover:bg-[#006A4E] text-[#006A4E] hover:text-white transition cursor-pointer"
                                    title={t('ইউজারের সম্পূর্ণ বিবরণ ও নিয়ন্ত্রণ দেখুন', 'View Full Details & Controls')}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>

                                  {/* Quick Approve Button if Citizen Pending */}
                                  {isPendingCitizen && (
                                    <button
                                      onClick={() => handleVerifyCitizen(u.id)}
                                      className="p-1.5 rounded-lg bg-amber-100 hover:bg-emerald-600 text-amber-800 hover:text-white transition cursor-pointer"
                                      title={t('আইডি ও প্রোফাইল অনুমোদন করুন', 'Approve Citizen')}
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                  )}

                                  {/* Officer Transfer Quick Button */}
                                  {u.role !== 'citizen' && (
                                    <button
                                      onClick={() => {
                                        setTransferOfficerUser(u);
                                        setTransferTargetOfficeId(0);
                                        setUsersSubSegment('transfer');
                                      }}
                                      className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition cursor-pointer"
                                      title={t('কর্মকর্তা বদলি ও অফিস পরিবর্তন করুন', 'Transfer Officer')}
                                    >
                                      <Building2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* Quick Toggle Active / Disabled */}
                                  <button
                                    onClick={() => handleToggleUserStatus(u)}
                                    className={`px-2 py-1 rounded text-[11px] font-bold border cursor-pointer transition ${
                                      u.is_active
                                        ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                        : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                    }`}
                                    title={u.is_active ? t('নিষ্ক্রিয় করুন', 'Disable') : t('সক্রিয় করুন', 'Enable')}
                                  >
                                    {u.is_active ? t('স্থগিত', 'Disable') : t('সক্রিয়', 'Enable')}
                                  </button>

                                  {/* Quick Delete if Non-Root User */}
                                  {u.id > 5 && u.username !== 'admin' && (
                                    <button
                                      onClick={() => {
                                        if (window.confirm(lang === 'bn' ? 'ব্যবহারকারী অপসারণ করতে চান?' : 'Delete user?')) {
                                          handleDeleteUser(u.id);
                                        }
                                      }}
                                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                                      title={t('অপসারণ', 'Delete')}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
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
            );
          })()}

          {/* CENTER POPUP MODAL: Create New User / Officer */}
          {isCreateUserOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
              <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#006A4E] flex items-center justify-center">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <span>{t('নতুন কর্মকর্তা বা ব্যবহারকারী অ্যাকাউন্ট তৈরি করুন', 'Create New Officer or User Account')}</span>
                  </h3>
                  <button
                    onClick={() => setIsCreateUserOpen(false)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition text-sm"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">{t('ভূমিকা (Role):', 'Role:')} *</label>
                      <select
                        value={newRole}
                        onChange={(e) => {
                          const r = e.target.value as UserRole;
                          setNewRole(r);
                          const req = !['citizen', 'admin', 'system_admin', 'auditor', 'support_agent', 'content_editor', 'content_approver', 'platform_moderator'].includes(r);
                          if (req && newOfficeId === 0 && officesList.length > 0) {
                            setNewOfficeId(officesList[0].id);
                            setNewOffice(lang === 'bn' ? officesList[0].name_bn : (officesList[0].name_en || officesList[0].name_bn));
                          }
                        }}
                        className="w-full p-2.5 rounded-lg border border-slate-300 font-bold bg-white text-xs"
                      >
                        <optgroup label={t('নাগরিক ও সার্ভিস পয়েন্ট', 'Citizen & Service Point')}>
                          <option value="citizen">Citizen (সাধারণ নাগরিক)</option>
                          <option value="service_point_operator">Service Point Operator (UDC / ডিজিটাল সেন্টার)</option>
                        </optgroup>
                        <optgroup label={t('নিবন্ধন অধিদপ্তর (সাব-রেজিস্ট্রি)', 'Sub-Registry Department')}>
                          <option value="sub_registrar">Sub-Registrar (সাব-রেজিস্ট্রার)</option>
                          <option value="registry_data_officer">Registry Data Officer (রেজিস্ট্রি ডাটা মেকার)</option>
                        </optgroup>
                        <optgroup label={t('ভূমি প্রশাসন ও এসি ল্যান্ড', 'Land Administration & AC Land')}>
                          <option value="ac_land">AC Land (সহকারী কমিশনার ভূমি)</option>
                          <option value="land_office_assistant">Land Office Assistant (উপজেলা ভূমি সহকারী)</option>
                          <option value="field_verification_officer">Field Verification Officer (মাঠ তদন্ত কর্মকর্তা)</option>
                          <option value="settlement_records_officer">Settlement Records Officer (জরিপ মেকার)</option>
                          <option value="settlement_checker">Assistant Settlement Officer (জরিপ চেকার)</option>
                          <option value="uno_supervisor">UNO Supervisor (উপজেলা নির্বাহী কর্মকর্তা)</option>
                          <option value="appellate_reviewer">Appellate Reviewer (এডিসি রাজস্ব / আপিল কর্তৃপক্ষ)</option>
                        </optgroup>
                        <optgroup label={t('ব্যাংক ও আর্থিক প্রতিষ্ঠান', 'Banks & Financial Institutions')}>
                          <option value="bank_officer">Bank Officer (ঋণ ও জামানত মেকার)</option>
                          <option value="bank_manager">Bank Manager (শাখা ব্যবস্থাপক - চেকার)</option>
                        </optgroup>
                        <optgroup label={t('প্ল্যাটফর্ম সাপোর্ট ও মডারেশন', 'Platform Support & Moderation')}>
                          <option value="support_agent">Support Agent (১৬১২২ হেল্পলাইন / জিআরএস)</option>
                          <option value="platform_moderator">Platform Moderator (মার্কেটপ্লেস মডারেটর)</option>
                          <option value="content_editor">Content Editor (নোটিশ ও কন্টেন্ট এডিটর)</option>
                          <option value="content_approver">Content Approver (কন্টেন্ট ও নোটিশ অ্যাপ্রুভার)</option>
                        </optgroup>
                        <optgroup label={t('সিস্টেম ও অডিট', 'System & Audit')}>
                          <option value="system_admin">System Admin (সিস্টেম অ্যাডমিনিস্ট্রেটর)</option>
                          <option value="admin">Admin (অ্যাডমিন)</option>
                          <option value="auditor">National Auditor (জাতীয় অডিটর)</option>
                          <option value="dc_acquisition_officer">DC Acquisition Officer (এলএ কর্মকর্তা)</option>
                          <option value="lawyer_court_user">Lawyer / Court User (আদালত প্রতিনিধি)</option>
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">{t('ইউজারনেম (Username):', 'Username:')} *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">@</span>
                        <input
                          type="text"
                          placeholder="officer_savar"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-300 font-mono bg-white text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">{t('পূর্ণ নাম (বাংলায়):', 'Full Name (Bangla):')} *</label>
                      <input
                        type="text"
                        placeholder="মোঃ আবদুর রহমান"
                        value={newNameBn}
                        onChange={(e) => setNewNameBn(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">{t('পূর্ণ নাম (ইংরেজিতে):', 'Full Name (English):')}</label>
                      <input
                        type="text"
                        placeholder="Md. Abdur Rahman"
                        value={newNameEn}
                        onChange={(e) => setNewNameEn(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">{t('মোবাইল নম্বর:', 'Phone:')} *</label>
                      <input
                        type="text"
                        placeholder="01711-000111"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-300 font-mono bg-white text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">{t('ইমেইল ঠিকানা:', 'Email:')}</label>
                      <input
                        type="email"
                        placeholder="officer@bhumishield.gov.bd"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-300 font-mono bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">{t('জাতীয় পরিচয়পত্র (NID):', 'NID:')} *</label>
                      <input
                        type="text"
                        placeholder="9900008888"
                        value={newNid}
                        onChange={(e) => setNewNid(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-300 font-mono bg-white text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {t('অফিস / অধিক্ষেত্র:', 'Office / Jurisdiction:')}{!['citizen', 'admin', 'system_admin', 'auditor', 'support_agent', 'content_editor', 'content_approver', 'platform_moderator'].includes(newRole) && ' *'}
                      </label>
                      {!['citizen', 'admin', 'system_admin', 'auditor', 'support_agent', 'content_editor', 'content_approver', 'platform_moderator'].includes(newRole) ? (
                        <select
                          value={newOfficeId}
                          onChange={(e) => {
                            const id = Number(e.target.value);
                            setNewOfficeId(id);
                            const match = officesList.find((o) => Number(o.id) === id);
                            if (match) setNewOffice(lang === 'bn' ? match.name_bn : (match.name_en || match.name_bn));
                          }}
                          className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                          required
                        >
                          <option value={0}>{t('-- সক্রিয় কার্যালয় নির্বাচন করুন --', '-- Select Active Office --')}</option>
                          {officesList.map((off: any) => (
                            <option key={off.id} value={off.id}>
                              {lang === 'bn' ? off.name_bn : (off.name_en || off.name_bn)} — {off.district_bn || off.district_en} ({off.office_type || 'OFFICE'})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder={t('কেন্দ্রীয় দপ্তর / প্রযোজ্য নয়', 'Central Headquarters / Not applicable')}
                          value={newOffice}
                          onChange={(e) => setNewOffice(e.target.value)}
                          className="w-full p-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-500 text-xs"
                        />
                      )}
                    </div>
                  </div>

                  <label htmlFor="new-officer-password">{t('প্রাথমিক পাসওয়ার্ড (অন্তত ৮ অক্ষর)','Initial password (at least 8 characters)')}<input id="new-officer-password" type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="w-full p-2 rounded-lg border border-slate-300"/></label>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      {t(
                        'এই অ্যাকাউন্টের জন্য পৃথক পাসওয়ার্ড দিন। সবার জন্য একই পাসওয়ার্ড ব্যবহার করবেন না।',
                        'Set an individual password for this account. Never reuse a shared password.'
                      )}
                    </span>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsCreateUserOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer transition text-xs"
                    >
                      {t('বাতিল', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold cursor-pointer shadow-xs transition text-xs flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{t('অ্যাকাউন্ট তৈরি ও সক্রিয় করুন', 'Create & Activate Account')}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* CENTER POPUP MODAL: View User Details & Permissions */}
          {selectedUserDetail && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
              <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#006A4E] to-[#074f38] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                      {selectedUserDetail.avatar_url ? (
                        <img src={selectedUserDetail.avatar_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <span>{(selectedUserDetail.full_name_bn || selectedUserDetail.username || 'ব')[0]}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-base text-slate-900">
                          {lang === 'bn' ? selectedUserDetail.full_name_bn : (selectedUserDetail.full_name_en || selectedUserDetail.full_name_bn)}
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-[#074f38] text-white">
                          {selectedUserDetail.role}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          selectedUserDetail.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {selectedUserDetail.is_active ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        @{selectedUserDetail.username} • ID #{selectedUserDetail.id}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedUserDetail(null)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition"
                  >
                    ✕
                  </button>
                </div>

                {/* Pending Citizen Verification Alert */}
                {selectedUserDetail.role === 'citizen' && Number(selectedUserDetail.is_identity_verified) !== 1 && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <div className="font-bold text-amber-900">{t('নাগরিকের অ্যাকাউন্ট অনুমোদন অপেক্ষমাণ', 'Citizen Account Approval Pending')}</div>
                        <div className="text-amber-700 text-[11px] mt-0.5">
                          {t('এনআইডি ও পরিচয়পত্রের সত্যতা যাচাই করে সিস্টেমে প্রবেশাধিকার প্রদান করুন।', 'Verify NID and enable system access for this citizen.')}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        await handleVerifyCitizen(selectedUserDetail.id);
                        setSelectedUserDetail({ ...selectedUserDetail, is_identity_verified: 1 });
                      }}
                      className="px-3.5 py-2 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold cursor-pointer shadow-sm transition flex items-center gap-1.5 shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>{t('অনুমোদন ও যাচাই সম্পন্ন করুন', 'Approve & Verify')}</span>
                    </button>
                  </div>
                )}

                {/* Detail Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <h4 className="font-bold text-slate-700 uppercase text-[11px] tracking-wide border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-[#006A4E]" />
                      <span>{t('ব্যক্তিগত বিবরণ', 'Personal Information')}</span>
                    </h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t('পূর্ণ নাম (বাংলা):', 'Full Name (BN):')}</span>
                        <span className="font-bold text-slate-800">{selectedUserDetail.full_name_bn || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t('পূর্ণ নাম (ইংরেজি):', 'Full Name (EN):')}</span>
                        <span className="font-semibold text-slate-800">{selectedUserDetail.full_name_en || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t('জাতীয় পরিচয়পত্র (NID):', 'NID Number:')}</span>
                        <span className="font-mono font-bold text-slate-800">{selectedUserDetail.nid_mock || selectedUserDetail.nid || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t('জন্ম তারিখ:', 'Date of Birth:')}</span>
                        <span className="font-mono text-slate-800">{selectedUserDetail.date_of_birth || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t('লিঙ্গ:', 'Gender:')}</span>
                        <span className="text-slate-800">{selectedUserDetail.gender || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <h4 className="font-bold text-slate-700 uppercase text-[11px] tracking-wide border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#006A4E]" />
                      <span>{t('যোগাযোগ ও অধিক্ষেত্র', 'Contact & Office')}</span>
                    </h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">{t('মোবাইল নম্বর:', 'Phone:')}</span>
                        <span className="font-mono font-bold text-slate-800">{selectedUserDetail.phone_mock || selectedUserDetail.phone_dummy || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">{t('ইমেইল:', 'Email:')}</span>
                        <span className="font-mono text-slate-800 truncate max-w-[170px]">{selectedUserDetail.email || '—'}</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-slate-500">{t('অফিস / অধিক্ষেত্র:', 'Office / Location:')}</span>
                        <span className="font-semibold text-slate-800 text-right max-w-[170px]">{selectedUserDetail.office_name || selectedUserDetail.office_bn || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t('যোগদানের তারিখ:', 'Join Date:')}</span>
                        <span className="font-mono text-slate-800">{formatUserDate(selectedUserDetail.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Access & Role Controls */}
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-3 text-xs">
                  <h4 className="font-bold text-[#074f38] uppercase text-[11px] tracking-wide border-b border-emerald-200/60 pb-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#006A4E]" />
                    <span>{t('অ্যাক্সেস ও ভূমিকা নিয়ন্ত্রণ (Role & Access Control)', 'Role & Access Control')}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">{t('ভূমিকা পরিবর্তন করুন:', 'Change Role:')}</label>
                      <select
                        value={selectedUserDetail.role}
                        onChange={async (e) => {
                          const updatedRole = e.target.value;
                          await handleChangeUserRole(selectedUserDetail, updatedRole);
                          setSelectedUserDetail({ ...selectedUserDetail, role: updatedRole });
                        }}
                        className="w-full p-2 rounded-lg border border-slate-300 font-bold bg-white text-xs"
                      >
                        <option value="citizen">citizen (সাধারণ নাগরিক)</option>
                        <option value="sub_registrar">sub_registrar (সাব-রেজিস্ট্রার)</option>
                        <option value="ac_land">ac_land (সহকারী কমিশনার ভূমি)</option>
                        <option value="bank_officer">bank_officer (ব্যাংক কর্মকর্তা)</option>
                        <option value="field_verification_officer">field_verification_officer (ফিল্ড অফিসার)</option>
                        <option value="registry_data_officer">registry_data_officer (রেজিস্ট্রি ডেটা অফিসার)</option>
                        <option value="settlement_officer">settlement_officer (সার্ভেয়ার / সেটেলমেন্ট অফিসার)</option>
                        <option value="uno_supervisor">uno_supervisor (ইউএনও / এডিসি)</option>
                        <option value="udc_operator">udc_operator (ইউডিসি উদ্যোক্তা)</option>
                        <option value="support_agent">support_agent (সাপোর্ট ডেস্ক)</option>
                        <option value="admin">admin (সিস্টেম অ্যাডমিন)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">{t('অ্যাকাউন্ট স্থিতি (Status):', 'Account Status:')}</label>
                      <button
                        onClick={async () => {
                          await handleToggleUserStatus(selectedUserDetail);
                          setSelectedUserDetail({ ...selectedUserDetail, is_active: selectedUserDetail.is_active ? 0 : 1 });
                        }}
                        className={`w-full py-2 px-3 rounded-lg font-bold text-xs cursor-pointer border transition flex items-center justify-center gap-2 ${
                          selectedUserDetail.is_active
                            ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                        }`}
                      >
                        {selectedUserDetail.is_active ? t('⛔ অ্যাকাউন্ট নিষ্ক্রিয় / স্থগিত করুন', '⛔ Suspend Account') : t('✓ অ্যাকাউন্ট পুনরায় সক্রিয় করুন', '✓ Activate Account')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  {selectedUserDetail.id > 5 && selectedUserDetail.username !== 'admin' ? (
                    <button
                      onClick={async () => {
                        if (window.confirm(lang === 'bn' ? 'আপনি কি নিশ্চিত যে এই ব্যবহারকারী অপসারণ করতে চান?' : 'Are you sure you want to delete this user?')) {
                          await handleDeleteUser(selectedUserDetail.id);
                          setSelectedUserDetail(null);
                        }
                      }}
                      className="px-3.5 py-2 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-bold cursor-pointer transition flex items-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{t('ব্যবহারকারী অপসারণ করুন', 'Delete User')}</span>
                    </button>
                  ) : <div />}

                  <button
                    onClick={() => setSelectedUserDetail(null)}
                    className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition"
                  >
                    {t('বন্ধ করুন', 'Close')}
                  </button>
                </div>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      )}

      {/* SUBTAB: DEEDS SUPERVISION & AUDIT (জমির দলিল ও অডিট) */}
      {(subTab === 'deeds' || (subTab === 'plots_control' && plotsSubSegment === 'deeds')) && (
        <div className="space-y-6 animate-fadeIn">
          {renderPillar3Nav()}
          {/* Notification Banner */}
          {deedActionNotice && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold animate-fadeIn ${
                deedActionNotice.err
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800'
              }`}
            >
              <span>{deedActionNotice.msg}</span>
              <button
                onClick={() => setDeedActionNotice(null)}
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Page Intro Header */}
          <header className="page-intro">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1.5">
                  <button onClick={() => handleTabChange('overview')} className="hover:text-[#006A4E] transition cursor-pointer">
                    {t('কন্ট্রোল প্যানেল', 'Control Panel')}
                  </button>
                  <span>/</span>
                  <span className="text-[#006A4E] font-extrabold">{t('জমির দলিল ও লেজার অডিট', 'Deeds Ledger & Supervision')}</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <FileText className="w-6 h-6 text-[#006A4E]" />
                  <span>{t('কেন্দ্রীয় দলিল রেজিস্ট্রি ও অ্যাকশনেবল সুপারভিশন কনসোল', 'Central Land Deeds Supervision Console')}</span>
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  {t(
                    'সকল নিবন্ধিত দলিল, খতিয়ান বায়া রেকর্ড, ক্রিপ্টোগ্রাফিক হ্যাশ চেইন ও সুপার অ্যাডমিন স্থগিতাদেশ (Admin Hold) নিয়ন্ত্রণ।',
                    'Supervise all registered deeds, title lineage, Ed25519 signatures, and administrative hold flags.'
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchDeeds()}
                  disabled={deedsLoading}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${deedsLoading ? 'animate-spin' : ''}`} />
                  <span>{t('রিফ্রেশ', 'Refresh')}</span>
                </button>
              </div>
            </div>
          </header>

          {/* Top KPI Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="panel p-4 bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase">{t('মোট সম্পাদিত দলিল', 'Total Deeds')}</span>
                <FileText className="w-4 h-4 text-[#006A4E]" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {toBanglaDigits(deedsData.kpis?.total_deeds ?? deedsData.total, lang)}
              </div>
              <span className="text-[10px] text-slate-400">{t('সকল সাব-রেজিস্ট্রি কার্যালয়', 'Across all registries')}</span>
            </div>

            <div className="panel p-4 bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-blue-600 mb-1">
                <span className="text-[11px] font-bold uppercase">{t('মোট হস্তান্তরিত মূল্য', 'Total Deed Volume')}</span>
                <Landmark className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-blue-900 mt-1 font-mono">
                ৳{toBanglaDigits(Number(deedsData.kpis?.total_volume_bdt || 0).toLocaleString(), lang)}
              </div>
              <span className="text-[10px] text-slate-400">{t('ঘোষিত সরকারি রেজিস্ট্রি মূল্য', 'Total declared BDT')}</span>
            </div>

            <div className="panel p-4 bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-emerald-600 mb-1">
                <span className="text-[11px] font-bold uppercase">{t('নামজারি সম্পন্ন দলিল', 'Mutated Deeds')}</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-emerald-800 mt-1">
                {toBanglaDigits(deedsData.kpis?.mutated_deeds ?? 0, lang)}
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold">{t('খতিয়ানে নাম জারি কার্যকর', 'Recorded in Khatian')}</span>
            </div>

            <div className="panel p-4 bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-rose-600 mb-1">
                <span className="text-[11px] font-bold uppercase">{t('স্থগিত / হোল্ডকৃত দলিল', 'Admin Held Deeds')}</span>
                <Ban className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-rose-800 mt-1">
                {toBanglaDigits(deedsData.kpis?.flagged_deeds ?? 0, lang)}
              </div>
              <span className="text-[10px] text-rose-600 font-semibold">{t('প্রশাসনিক স্থগিতাদেশ সক্রিয়', 'Under administrative hold')}</span>
            </div>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="panel p-5 bg-white border border-slate-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              {/* Search text */}
              <div className="md:col-span-5 relative">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t('অনুসন্ধান (দাগ নং, দলিল নং, পক্ষ বা এনআইডি):', 'Search Deed, Plot, Party or NID:')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={deedSearchQuery}
                    onChange={(e) => setDeedSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchDeeds()}
                    placeholder={t('দলিল নং, দাগ নং, ক্রেতা/বিক্রেতার নাম বা এনআইডি...', 'Search by deed no, dag no, party, or NID...')}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:border-[#006A4E] focus:ring-1 focus:ring-[#006A4E] bg-white font-medium"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Status Select */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">{t('স্ট্যাটাস:', 'Status:')}</label>
                <select
                  value={deedStatusFilter}
                  onChange={(e) => {
                    setDeedStatusFilter(e.target.value);
                    fetchDeeds({ status: e.target.value, page: 1 });
                  }}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-xs text-slate-700 focus:border-[#006A4E]"
                >
                  <option value="ALL">{t('সকল স্ট্যাটাস', 'All Status')}</option>
                  <option value="REGISTERED">{t('নিবন্ধিত (REGISTERED)', 'Registered')}</option>
                  <option value="PENDING_MUTATION">{t('নামজারি অপেক্ষমান', 'Pending Mutation')}</option>
                  <option value="MUTATED">{t('নামজারি সম্পন্ন (MUTATED)', 'Mutated')}</option>
                  <option value="CANCELLED">{t('বাতিলকৃত (CANCELLED)', 'Cancelled')}</option>
                  <option value="FLAGGED">{t('⛔ স্থগিতাদেশ জারি (HOLD)', 'Admin Hold')}</option>
                </select>
              </div>

              {/* Deed Type Select */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">{t('দলিলের ধরন:', 'Deed Type:')}</label>
                <select
                  value={deedTypeFilter}
                  onChange={(e) => {
                    setDeedTypeFilter(e.target.value);
                    fetchDeeds({ deed_type: e.target.value, page: 1 });
                  }}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-xs text-slate-700 focus:border-[#006A4E]"
                >
                  <option value="ALL">{t('সকল দলিলের ধরন', 'All Deed Types')}</option>
                  <option value="SALE">{t('বিক্রয় সাফ-কবলা (SALE)', 'Sale Deed')}</option>
                  <option value="HEIR">{t('ওয়ারিশান বণ্টন (HEIR)', 'Inheritance')}</option>
                  <option value="GIFT">{t('হেবা / দানপত্র (GIFT)', 'Gift / Heba')}</option>
                  <option value="LEASE">{t('লিজ / ইজারা (LEASE)', 'Lease')}</option>
                </select>
              </div>

              {/* Date Filters */}
              <div className="md:col-span-3 flex items-center gap-1.5">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">{t('তারিখ হতে:', 'From:')}</label>
                  <input
                    type="date"
                    value={deedDateFrom}
                    onChange={(e) => setDeedDateFrom(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">{t('তারিখ পর্যন্ত:', 'To:')}</label>
                  <input
                    type="date"
                    value={deedDateTo}
                    onChange={(e) => setDeedDateTo(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Universal Cascading Address Selector row */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#006A4E]" />
                  <span>{t('সার্বজনীন অধিক্ষেত্র ফিল্টারিং (বিভাগ → জেলা → উপজেলা → মৌজা):', 'Universal Address Cascader (Division → District → Upazila → Mouza):')}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchDeeds({ page: 1 })}
                    className="px-3 py-1.5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold cursor-pointer transition flex items-center gap-1 shadow-2xs"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>{t('ফিল্টার প্রয়োগ করুন', 'Apply Filter')}</span>
                  </button>
                  <button
                    onClick={() => {
                      setDeedSearchQuery('');
                      setDeedStatusFilter('ALL');
                      setDeedTypeFilter('ALL');
                      setDeedDateFrom('');
                      setDeedDateTo('');
                      setDeedDivision('');
                      setDeedDistrict('');
                      setDeedUpazila('');
                      setDeedMouzaId('');
                      fetchDeeds({
                        q: '',
                        status: 'ALL',
                        deed_type: 'ALL',
                        date_from: '',
                        date_to: '',
                        division_bn: '',
                        district_bn: '',
                        upazila_bn: '',
                        mouza_id: '',
                        page: 1,
                      });
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-bold cursor-pointer transition flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('রিসেট', 'Reset')}</span>
                  </button>
                </div>
              </div>

              <AddressCascader
                selectedDivision={deedDivision}
                selectedDistrict={deedDistrict}
                selectedUpazila={deedUpazila}
                selectedMouzaId={deedMouzaId}
                isFilter={true}
                showMouza={true}
                lang={lang}
                onChange={(addr) => {
                  setDeedDivision(addr.division_bn);
                  setDeedDistrict(addr.district_bn);
                  setDeedUpazila(addr.upazila_bn);
                  setDeedMouzaId(addr.mouza_id || '');
                  fetchDeeds({
                    division_bn: addr.division_bn || undefined,
                    district_bn: addr.district_bn || undefined,
                    upazila_bn: addr.upazila_bn || undefined,
                    mouza_id: addr.mouza_id || undefined,
                    page: 1,
                  });
                }}
              />
            </div>
          </div>

          {/* Deeds Table with Horizontal Scroll */}
          <div className="panel p-5 bg-white border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#006A4E]" />
                <span>{t('নিবন্ধিত দলিলের তালিকা', 'Registered Deeds List')} ({toBanglaDigits(deedsData.total || deedsData.items.length, lang)} {t('টি দলিল পাওয়া গেছে', 'deeds found')})</span>
              </span>
              {deedsLoading && (
                <span className="text-[#006A4E] flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>{t('লোড হচ্ছে...', 'Loading...')}</span>
                </span>
              )}
            </div>

            {deedsData.items.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="font-semibold">{t('কোনো দলিল পাওয়া যায়নি।', 'No deeds found matching criteria.')}</p>
                <p className="text-[11px] text-slate-400">
                  {t('সার্চ কুয়েরি পরিবর্তন করুন অথবা ফিল্টার রিসেট করুন।', 'Try adjusting your search filters.')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs whitespace-nowrap min-w-[1050px]">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 w-12 text-center">#</th>
                      <th className="py-3 px-4">{t('দলিল নং ও কোড', 'Deed No & Code')}</th>
                      <th className="py-3 px-3">{t('দলিলের ধরন', 'Type')}</th>
                      <th className="py-3 px-3">{t('মৌজা ও দাগ নং', 'Mouza & Dag')}</th>
                      <th className="py-3 px-3">{t('হস্তান্তরকারী (বিক্রেতা)', 'Seller / Donor')}</th>
                      <th className="py-3 px-3">{t('গ্রহীতা (ক্রেতা)', 'Buyer / Heir')}</th>
                      <th className="py-3 px-3">{t('জমির পরিমাণ ও মূল্য', 'Area & Value')}</th>
                      <th className="py-3 px-3">{t('রেজিস্ট্রি তারিখ', 'Reg Date')}</th>
                      <th className="py-3 px-3">{t('লেজার ও স্ট্যাটাস', 'Ledger & Status')}</th>
                      <th className="py-3 px-3 text-right">{t('অ্যাকশন', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {deedsData.items.map((deed, idx) => {
                      const isFlagged = Number(deed.is_flagged_admin) === 1;
                      const isMutated = deed.is_mutated || deed.status === 'MUTATED';

                      return (
                        <tr
                          key={deed.id}
                          className={`hover:bg-slate-50/80 transition ${
                            isFlagged ? 'bg-rose-50/60' : ''
                          }`}
                        >
                          <td className="py-3 px-3 text-center font-mono text-slate-400">
                            {toBanglaDigits((deedsData.page - 1) * deedsData.per_page + idx + 1, lang)}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{deed.deed_no}</span>
                              {isFlagged && (
                                <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0 animate-ping" title="Under Administrative Hold" />
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {deed.deed_code}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                                deed.deed_type === 'SALE'
                                  ? 'bg-emerald-50 text-[#006A4E] border border-emerald-200'
                                  : deed.deed_type === 'HEIR'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : deed.deed_type === 'GIFT'
                                  ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {deed.deed_type === 'SALE'
                                ? t('বিক্রয় কবলা', 'SALE')
                                : deed.deed_type === 'HEIR'
                                ? t('ওয়ারিশ বণ্টন', 'HEIR')
                                : deed.deed_type === 'GIFT'
                                ? t('হেবা / দান', 'GIFT')
                                : deed.deed_type}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-800">
                              {t('দাগ নং:', 'Dag:')} {toBanglaDigits(deed.dag_no, lang)}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate max-w-[170px]" title={`${deed.mouza_bn}, ${deed.upazila_bn}`}>
                              {lang === 'bn' ? deed.mouza_bn : (deed.mouza_en || deed.mouza_bn)}
                              {deed.jl_no ? ` (জে.এল. ${toBanglaDigits(deed.jl_no, lang)})` : ''} • {deed.upazila_bn}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-slate-700">
                            <div className="font-bold text-slate-900">{deed.seller_name_bn || '—'}</div>
                            <div className="text-[10px] font-mono text-slate-500">NID: {deed.seller_nid || '—'}</div>
                          </td>

                          <td className="py-3 px-3 text-slate-700">
                            <div className="font-bold text-slate-900">{deed.buyer_name_bn || '—'}</div>
                            <div className="text-[10px] font-mono text-slate-500">NID: {deed.buyer_nid || '—'}</div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-bold text-[#006A4E]">
                              {toBanglaDigits(deed.area_decimal, lang)} {t('শতক', 'decimals')}
                            </div>
                            <div className="text-[11px] font-mono font-semibold text-slate-600">
                              ৳{toBanglaDigits(Number(deed.price_bdt).toLocaleString(), lang)}
                            </div>
                          </td>

                          <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                            {deed.created_at ? formatUserDate(deed.created_at) : '—'}
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex flex-col gap-1 items-start">
                              {isFlagged ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                                  <Ban className="w-3 h-3" />
                                  <span>{t('স্থগিত (HOLD)', 'HOLD')}</span>
                                </span>
                              ) : isMutated ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <Check className="w-3 h-3" />
                                  <span>{t('নামজারি সম্পন্ন', 'Mutated')}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                                  {deed.status}
                                </span>
                              )}

                              <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Chain #{deed.chain_index}</span>
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Eye Icon for Deed Docket Modal */}
                              <button
                                onClick={() => handleInspectDeed(deed.id)}
                                className="p-1.5 rounded-lg bg-[#EDF7F4] hover:bg-[#006A4E] text-[#006A4E] hover:text-white transition cursor-pointer"
                                title={t('দলিলের সম্পূর্ণ ডকেট ও অডিট বিবরণ দেখুন', 'Inspect Deed Docket')}
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Flag / Hold Button */}
                              <button
                                onClick={() =>
                                  setFlagDeedModal({
                                    deed,
                                    action: isFlagged ? 'CLEAR' : 'HOLD',
                                    reason: isFlagged ? '' : 'তদন্ত ও সত্যতা যাচাই না হওয়া পর্যন্ত সাময়িক স্থগিতাদেশ জারি।',
                                  })
                                }
                                className={`px-2 py-1 rounded text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                                  isFlagged
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                    : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                                }`}
                                title={isFlagged ? t('স্থগিতাদেশ প্রত্যাহার করুন', 'Clear Hold') : t('প্রশাসনিক স্থগিতাদেশ জারি করুন', 'Place Hold')}
                              >
                                {isFlagged ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>{t('হোল্ড মুক্ত', 'Unhold')}</span>
                                  </>
                                ) : (
                                  <>
                                    <Ban className="w-3 h-3" />
                                    <span>{t('হোল্ড', 'Hold')}</span>
                                  </>
                                )}
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

          {/* CENTER POPUP MODAL: Centered Full Deed Docket Modal */}
          {selectedDeedDocket && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
              <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                        {selectedDeedDocket.deed?.deed_no}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {selectedDeedDocket.deed?.deed_code}
                      </span>
                      {Number(selectedDeedDocket.deed?.is_flagged_admin) === 1 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                          ⛔ স্থগিতাদেশ (Admin Hold)
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-lg text-slate-900 mt-1 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#006A4E]" />
                      <span>{t('ডিজিটাল দলিল ডকেট ও ক্রিপ্টোগ্রাফিক ভেরিফিকেশন প্রুফ', 'Digital Deed Docket & Cryptographic Proof')}</span>
                    </h3>
                  </div>

                  <button
                    onClick={() => setSelectedDeedDocket(null)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition text-sm"
                  >
                    ✕
                  </button>
                </div>

                {/* If Flagged Alert */}
                {Number(selectedDeedDocket.deed?.is_flagged_admin) === 1 && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs space-y-1">
                    <div className="font-extrabold flex items-center gap-1.5">
                      <Ban className="w-4 h-4 text-rose-600" />
                      <span>{t('প্রশাসনিক স্থগিতাদেশ কার্যকর রয়েছে (ADMIN HOLD ACTIVE)', 'ADMINISTRATIVE HOLD ACTIVE')}</span>
                    </div>
                    <p className="text-[11px] text-rose-800">
                      <strong>{t('স্থগিতের কারণ:', 'Reason:')}</strong> {selectedDeedDocket.deed?.flag_reason_bn || 'তদন্তের স্বার্থে স্থগিত রাখা হয়েছে।'}
                    </p>
                  </div>
                )}

                {/* Grid 1: Parties (Seller & Buyer) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Seller */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-700 uppercase text-[11px] border-b pb-1.5 text-rose-800 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{t('হস্তান্তরকারী / দাতা (বিক্রেতা)', 'Transferor / Seller')}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-base text-slate-900">{selectedDeedDocket.seller?.name_bn || '—'}</div>
                      <div className="text-slate-600"><strong>পিতার নাম:</strong> {selectedDeedDocket.seller?.father_name_bn || '—'}</div>
                      <div className="font-mono text-slate-700"><strong>NID:</strong> {selectedDeedDocket.seller?.nid || '—'}</div>
                      <div className="font-mono text-slate-700"><strong>মোবাইল:</strong> {selectedDeedDocket.seller?.phone_mock || selectedDeedDocket.seller?.phone || '—'}</div>
                      <div className="text-slate-500 text-[11px]"><strong>ঠিকানা:</strong> {selectedDeedDocket.seller?.address_bn || '—'}</div>
                    </div>
                  </div>

                  {/* Buyer */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-700 uppercase text-[11px] border-b pb-1.5 text-emerald-800 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{t('গ্রহীতা / ক্রেতা', 'Transferee / Buyer')}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-base text-slate-900">{selectedDeedDocket.buyer?.name_bn || '—'}</div>
                      <div className="text-slate-600"><strong>পিতার নাম:</strong> {selectedDeedDocket.buyer?.father_name_bn || '—'}</div>
                      <div className="font-mono text-slate-700"><strong>NID:</strong> {selectedDeedDocket.buyer?.nid || '—'}</div>
                      <div className="font-mono text-slate-700"><strong>মোবাইল:</strong> {selectedDeedDocket.buyer?.phone_mock || selectedDeedDocket.buyer?.phone || '—'}</div>
                      <div className="text-slate-500 text-[11px]"><strong>ঠিকানা:</strong> {selectedDeedDocket.buyer?.address_bn || '—'}</div>
                    </div>
                  </div>
                </div>

                {/* Grid 2: Parcel & Land Attributes */}
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-3 text-xs">
                  <div className="font-bold text-[#006A4E] uppercase text-[11px] flex items-center gap-1.5 border-b border-emerald-200/60 pb-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{t('জমির তফসিল ও তফসিলভুক্ত বিবরণ (Universal Hierarchy Location)', 'Land Parcel & Location Attributes')}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-slate-500 block text-[10px]">{t('বিভাগ', 'Division')}</span>
                      <span className="font-bold text-slate-800">{selectedDeedDocket.location?.division_bn || 'ঢাকা'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">{t('জেলা', 'District')}</span>
                      <span className="font-bold text-slate-800">{selectedDeedDocket.location?.district_bn || 'ঢাকা'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">{t('উপজেলা / থানা', 'Upazila')}</span>
                      <span className="font-bold text-slate-800">{selectedDeedDocket.location?.upazila_bn || 'সাভার'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">{t('মৌজা ও জে.এল.', 'Mouza & JL')}</span>
                      <span className="font-bold text-slate-800">
                        {selectedDeedDocket.location?.mouza_bn} (জে.এল. {toBanglaDigits(selectedDeedDocket.location?.jl_no, lang)})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">{t('দাগ নম্বর', 'Dag No')}</span>
                      <span className="font-extrabold text-[#006A4E] font-mono text-sm">
                        {toBanglaDigits(selectedDeedDocket.plot?.dag_no, lang)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">{t('জমির শ্রেণি', 'Land Type')}</span>
                      <span className="font-semibold text-slate-800">{selectedDeedDocket.plot?.land_type_bn || selectedDeedDocket.plot?.land_type || 'ভিটা'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">{t('হস্তান্তরিত অংশ ও আয়তন', 'Transferred Area')}</span>
                      <span className="font-extrabold text-slate-900 font-mono">
                        {toBanglaDigits(selectedDeedDocket.deed?.area_decimal, lang)} {t('শতক', 'dec')} ({selectedDeedDocket.deed?.share_fraction || '১/১'})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">{t('দলিল মূল্য (টাকা)', 'Deed Value (BDT)')}</span>
                      <span className="font-extrabold text-blue-900 font-mono">
                        ৳{toBanglaDigits(Number(selectedDeedDocket.deed?.price_bdt).toLocaleString(), lang)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grid 3: Cryptographic Ledger Proof */}
                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>{t('ক্রিপ্টোগ্রাফিক লেজার অখণ্ডতা প্রুফ (Block #' + selectedDeedDocket.verification?.chain_index + ')', 'Ledger Proof')}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                      ✔ Ed25519 Verified
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-slate-400">Content Hash (SHA-256):</span>
                      <span className="text-white truncate max-w-sm">{selectedDeedDocket.verification?.stored_hash}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-slate-400">Previous Block Hash:</span>
                      <span className="text-slate-300 truncate max-w-sm">{selectedDeedDocket.verification?.prev_hash}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-slate-400">Ed25519 Digital Signature:</span>
                      <span className="text-emerald-300 truncate max-w-sm">{selectedDeedDocket.deed?.signature}</span>
                    </div>
                  </div>
                </div>

                {/* Grid 4: Connected History (Mutations, Khatians, Mortgages, Disputes) */}
                <div className="space-y-3 text-xs">
                  <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wide flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[#006A4E]" />
                    <span>{t('সম্পর্কিত রেকর্ড ও আইনি ইতিহাস', 'Connected Records & Legal History')}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Mutations */}
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="font-bold text-slate-700 block mb-1">{t('নামজারি আদেশ', 'Mutation Status')}</span>
                      {selectedDeedDocket.history?.mutations?.length > 0 ? (
                        <div className="space-y-1 text-[11px]">
                          {selectedDeedDocket.history.mutations.map((m: any, i: number) => (
                            <div key={i} className="text-slate-700 font-mono">
                              কেস: {m.case_no} ({m.status})
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">{t('কোনো নামজারি কেস নেই', 'No mutation yet')}</span>
                      )}
                    </div>

                    {/* Mortgages */}
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="font-bold text-slate-700 block mb-1">{t('ব্যাংক বন্ধক / লিয়েন', 'Bank Mortgages')}</span>
                      {selectedDeedDocket.history?.mortgages?.length > 0 ? (
                        <div className="space-y-1 text-[11px] text-blue-800">
                          {selectedDeedDocket.history.mortgages.map((m: any, i: number) => (
                            <div key={i}>
                              {m.bank_name_bn} (৳{Number(m.amount_bdt).toLocaleString()})
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-emerald-700 font-semibold text-[11px]">✔ {t('দায়মুক্ত রেকর্ড', 'No Active Liens')}</span>
                      )}
                    </div>

                    {/* Disputes */}
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="font-bold text-slate-700 block mb-1">{t('আদালতের মামলা / বিরোধ', 'Litigation / Disputes')}</span>
                      {selectedDeedDocket.history?.disputes?.length > 0 ? (
                        <div className="space-y-1 text-[11px] text-amber-800">
                          {selectedDeedDocket.history.disputes.map((d: any, i: number) => (
                            <div key={i}>
                              {d.dispute_type} ({d.status})
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-emerald-700 font-semibold text-[11px]">✔ {t('নিষ্কণ্টক মালিকানা', 'No Active Disputes')}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      const isFlagged = Number(selectedDeedDocket.deed?.is_flagged_admin) === 1;
                      setFlagDeedModal({
                        deed: selectedDeedDocket.deed,
                        action: isFlagged ? 'CLEAR' : 'HOLD',
                        reason: isFlagged ? '' : 'তদন্তের স্বার্থে সাময়িক স্থগিতাদেশ জারি।',
                      });
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 ${
                      Number(selectedDeedDocket.deed?.is_flagged_admin) === 1
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                    }`}
                  >
                    {Number(selectedDeedDocket.deed?.is_flagged_admin) === 1 ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{t('স্থগিতাদেশ প্রত্যাহার করুন (Clear Hold)', 'Clear Hold')}</span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-4 h-4" />
                        <span>{t('প্রশাসনিক স্থগিতাদেশ জারি করুন (Admin Hold)', 'Place Hold')}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setSelectedDeedDocket(null)}
                    className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition"
                  >
                    {t('বন্ধ করুন', 'Close')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CENTER POPUP MODAL: Flag/Hold Confirmation Modal */}
          {flagDeedModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <Ban className={`w-5 h-5 ${flagDeedModal.action === 'HOLD' ? 'text-rose-600' : 'text-emerald-600'}`} />
                    <span>
                      {flagDeedModal.action === 'HOLD'
                        ? t('দলিল স্থগিতাদেশ (Admin Hold) জারি', 'Place Administrative Hold')
                        : t('স্থগিতাদেশ প্রত্যাহার ও রেকর্ড অবমুক্তকরণ', 'Clear Administrative Hold')}
                    </span>
                  </h3>
                  <button
                    onClick={() => setFlagDeedModal(null)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div><strong>দলিল নং:</strong> {flagDeedModal.deed.deed_no}</div>
                  <div><strong>দাগ নং:</strong> {flagDeedModal.deed.dag_no} • {flagDeedModal.deed.mouza_bn}</div>
                  <div><strong>ক্রেতা:</strong> {flagDeedModal.deed.buyer_name_bn}</div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {flagDeedModal.action === 'HOLD'
                      ? t('স্থগিতাদেশের কারণ ও আইনি ব্যাখ্যা:', 'Reason for Administrative Hold:')
                      : t('স্থগিতাদেশ প্রত্যাহারের কারণ / মন্তব্য:', 'Reason for Clearing Hold:')}
                  </label>
                  <textarea
                    rows={3}
                    value={flagDeedModal.reason}
                    onChange={(e) => setFlagDeedModal({ ...flagDeedModal, reason: e.target.value })}
                    placeholder={
                      flagDeedModal.action === 'HOLD'
                        ? 'জালিয়াতি বা ওয়ারিশান আপত্তির কারণে সহকারী কমিশনার (ভূমি) এর নির্দেশক্রমে স্থগিত...'
                        : 'তদন্ত সম্পন্ন ও উপযুক্ত বায়া রেকর্ড নিশ্চিত হওয়ায় হোল্ড প্রত্যাহার...'
                    }
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setFlagDeedModal(null)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    {t('বাতিল', 'Cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmFlagDeed}
                    className={`px-4 py-2 rounded-lg text-white text-xs font-bold cursor-pointer transition shadow-xs ${
                      flagDeedModal.action === 'HOLD'
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {flagDeedModal.action === 'HOLD'
                      ? t('স্থগিতাদেশ কার্যকর করুন', 'Confirm Hold')
                      : t('হোল্ড প্রত্যাহার সম্পন্ন করুন', 'Confirm Release')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Administrative Address Hierarchy CRUD (Universal Cascader Management) */}
      {(subTab === 'offices_config' || subTab === 'hierarchy' || (subTab === 'plots_control' && plotsSubSegment === 'hierarchy')) && (
        <div className="space-y-6 animate-fadeIn">
          {renderPillar3Nav()}

          {/* Sub-Segment Switcher for Offices & Service Config */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOfficesSubSegment('offices')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                  officesSubSegment === 'offices'
                    ? 'bg-white text-[#006A4E] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>{t('সারাদেশীয় কার্যালয় ও দায়িত্ব', 'Nationwide Offices & Lifecycle')}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-[#006A4E] font-extrabold">NEW</span>
              </button>
              <button
                type="button"
                onClick={() => setOfficesSubSegment('hierarchy')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                  officesSubSegment === 'hierarchy'
                    ? 'bg-white text-[#006A4E] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>{t('প্রশাসনিক অধিক্ষেত্র ও মৌজা স্তর', 'Administrative Hierarchy & Mouzas')}</span>
              </button>
              <button
                type="button"
                onClick={() => setOfficesSubSegment('document_security')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                  officesSubSegment === 'document_security'
                    ? 'bg-white text-[#006A4E] shadow-xs ring-2 ring-emerald-500/20'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-[#006A4E]" />
                <span>{t('ডিজিটাল ডিসিআর ও পর্চা ওয়াটারমার্ক ও কিউআর কনফিগ', 'Digital DCR & Porcha Watermark/QR Config')}</span>
              </button>
              <button
                type="button"
                onClick={() => setOfficesSubSegment('lawyers')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                  officesSubSegment === 'lawyers'
                    ? 'bg-white text-indigo-700 shadow-xs ring-2 ring-indigo-500/20'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Scale className="w-4 h-4 text-indigo-600" />
                <span>{t('আইনজীবী রেজিস্ট্রি (বার কাউন্সিল)', 'Lawyer Registry (Bar Council)')}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-extrabold">LEGAL</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-500 pr-2 hidden sm:block">
              {officesSubSegment === 'offices'
                ? t('সারাদেশের সকল অফিস, কোড ও স্টাফ ব্যবস্থাপনা', 'Manage nationwide offices, codes and staff')
                : officesSubSegment === 'document_security'
                ? t('নাগরিক ডকুমেন্টে কাস্টম জলছাপ ও কিউআর সিল নিয়ন্ত্রণ', 'Citizen document watermark and QR seal control')
                : officesSubSegment === 'lawyers'
                ? t('বাংলাদেশ বার কাউন্সিল অনুমোদিত আইনজীবী নিবন্ধন ও কেস ফিলিং অনুমোদন', 'Bangladesh Bar Council advocate registry & case filing control')
                : t('৪-স্তরীয় ভৌগোলিক ম্যাপিং ও জে.এল. নিয়ন্ত্রণ', '4-tier administrative boundary governance')}
            </div>
          </div>

          {officesSubSegment === 'offices' ? (
            <SuperAdminOfficesTab t={t} lang={lang} />
          ) : officesSubSegment === 'document_security' ? (
            <SuperAdminDocumentSecurityTab t={t} lang={lang} />
          ) : officesSubSegment === 'lawyers' ? (
            <SuperAdminLawyersTab t={t} lang={lang} />
          ) : (
            <>
          {/* Notification Banner */}
          {hierarchyNotice && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${
                hierarchyNotice.err
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800'
              }`}
            >
              <span>{hierarchyNotice.msg}</span>
              <button
                onClick={() => setHierarchyNotice(null)}
                className="text-slate-500 hover:text-slate-800 cursor-pointer ml-3 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Header Panel */}
          <div className="panel p-6 bg-white border border-[#006A4E]/20 space-y-4 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#006A4E]/10 pb-4">
              <div>
                <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1.5">
                  <button
                    onClick={() => handleTabChange('overview')}
                    className="hover:text-[#006A4E] transition cursor-pointer"
                  >
                    {t('কন্ট্রোল প্যানেল', 'Control Panel')}
                  </button>
                  <span>/</span>
                  <span className="text-[#006A4E] font-extrabold">
                    {t('প্রশাসনিক অধিক্ষেত্র ও ঠিকানা', 'Administrative Hierarchy & Addresses')}
                  </span>
                </div>
                <h2 className="font-bold text-xl text-[#074f38] flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-[#006A4E]" />
                  <span>
                    {t(
                      'প্রশাসনিক অধিক্ষেত্র ও ভৌগোলিক স্তর বিন্যাস (Division -> District -> Upazila -> Mouza)',
                      'Administrative Hierarchy & Geographic Boundary Governance'
                    )}
                  </span>
                </h2>
                <p className="text-xs text-[#5F7A74] mt-1">
                  {t(
                    'সমগ্র ভূমি ব্যবস্থার প্রমিত ঠিকানা অনুক্রম (বিভাগ -> জেলা -> উপজেলা -> মৌজা / জে.এল. নং) নিয়ন্ত্রণ, নতুন মৌজা অন্তর্ভুক্তি ও প্লট সুরক্ষা বিধি।',
                    'Maintain canonical 4-tier geographic relations, J.L. number indexes, and relational integrity safeguards.'
                  )}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={fetchHierarchyTree}
                  disabled={hierarchyLoading}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${hierarchyLoading ? 'animate-spin' : ''}`} />
                  <span>{t('রিফ্রেশ', 'Refresh')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddMouza}
                  className="px-4 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00523C] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('নতুন মৌজা নিবন্ধন', 'Add New Mouza')}</span>
                </button>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  {t('মোট প্রশাসনিক বিভাগ', 'Total Divisions')}
                </div>
                <div className="text-xl font-extrabold text-slate-800 mt-0.5">
                  {toBanglaDigits(allDivisions.length, lang)}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  {t('মোট জেলা প্রশাসন', 'Total Districts')}
                </div>
                <div className="text-xl font-extrabold text-slate-800 mt-0.5">
                  {toBanglaDigits(allDistricts.length, lang)}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  {t('মোট উপজেলা / থানা', 'Total Upazilas')}
                </div>
                <div className="text-xl font-extrabold text-slate-800 mt-0.5">
                  {toBanglaDigits(allUpazilas.length, lang)}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-[10px] font-bold uppercase text-emerald-800">
                  {t('মোট নিবন্ধিত মৌজা (জে.এল.)', 'Total Mouzas (J.L.)')}
                </div>
                <div className="text-xl font-extrabold text-[#006A4E] mt-0.5">
                  {toBanglaDigits(allMouzas.length, lang)}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 col-span-2 sm:col-span-1">
                <div className="text-[10px] font-bold uppercase text-blue-800">
                  {t('সংযুক্ত খতিয়ান/প্লট', 'Attached Plots')}
                </div>
                <div className="text-xl font-extrabold text-blue-900 mt-0.5">
                  {toBanglaDigits(totalPlotsInHierarchy, lang)}
                </div>
              </div>
            </div>
          </div>

          {/* Tier Switcher Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveHierarchyTier('MOUZAS')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeHierarchyTier === 'MOUZAS'
                    ? 'bg-white text-[#006A4E] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{t('মৌজা ও জে.এল. সূচি', 'Mouzas & J.L.')}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-[#006A4E]">
                  {toBanglaDigits(filteredMouzas.length, lang)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveHierarchyTier('UPAZILAS')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeHierarchyTier === 'UPAZILAS'
                    ? 'bg-white text-[#006A4E] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{t('উপজেলা / থানা', 'Upazilas')}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                  {toBanglaDigits(filteredUpazilas.length, lang)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveHierarchyTier('DISTRICTS')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeHierarchyTier === 'DISTRICTS'
                    ? 'bg-white text-[#006A4E] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{t('জেলা প্রশাসন', 'Districts')}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                  {toBanglaDigits(filteredDistricts.length, lang)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveHierarchyTier('DIVISIONS')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeHierarchyTier === 'DIVISIONS'
                    ? 'bg-white text-[#006A4E] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{t('বিভাগীয় স্তর', 'Divisions')}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                  {toBanglaDigits(filteredDivisions.length, lang)}
                </span>
              </button>
            </div>

            {/* Universal Filter Reset */}
            {(hierarchyDivisionFilter || hierarchyDistrictFilter || hierarchyUpazilaFilter || hierarchySearch) && (
              <button
                type="button"
                onClick={() => {
                  setHierarchyDivisionFilter('');
                  setHierarchyDistrictFilter('');
                  setHierarchyUpazilaFilter('');
                  setHierarchySearch('');
                }}
                className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('ফিল্টার রিসেট করুন', 'Reset Filters')}</span>
              </button>
            )}
          </div>

          {/* Cascading Filter Toolbar */}
          <div className="panel p-4 bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#006A4E]" />
              <span>{t('প্রমিত ফিল্টারিং ও অনুসন্ধান (বিভাগ -> জেলা -> উপজেলা)', 'Cascading Filter & Search Toolbar')}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Division Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {t('বিভাগ (Division)', 'Division')}
                </label>
                <select
                  value={hierarchyDivisionFilter}
                  onChange={(e) => {
                    setHierarchyDivisionFilter(e.target.value);
                    setHierarchyDistrictFilter('');
                    setHierarchyUpazilaFilter('');
                  }}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                >
                  <option value="">{t('-- সকল বিভাগ --', '-- All Divisions --')}</option>
                  {allDivisions.map((div) => (
                    <option key={div.division_bn} value={div.division_bn}>
                      {div.division_bn} ({div.division_en})
                    </option>
                  ))}
                </select>
              </div>

              {/* District Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {t('জেলা (District)', 'District')}
                </label>
                <select
                  value={hierarchyDistrictFilter}
                  onChange={(e) => {
                    setHierarchyDistrictFilter(e.target.value);
                    setHierarchyUpazilaFilter('');
                  }}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                >
                  <option value="">{t('-- সকল জেলা --', '-- All Districts --')}</option>
                  {allDistricts
                    .filter((d) => !hierarchyDivisionFilter || d.division_bn === hierarchyDivisionFilter)
                    .map((d, i) => (
                      <option key={`${d.district_bn}-${i}`} value={d.district_bn}>
                        {d.district_bn} ({d.district_en})
                      </option>
                    ))}
                </select>
              </div>

              {/* Upazila Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {t('উপজেলা / থানা (Upazila)', 'Upazila')}
                </label>
                <select
                  value={hierarchyUpazilaFilter}
                  onChange={(e) => setHierarchyUpazilaFilter(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                >
                  <option value="">{t('-- সকল উপজেলা --', '-- All Upazilas --')}</option>
                  {allUpazilas
                    .filter(
                      (u) =>
                        (!hierarchyDivisionFilter || u.division_bn === hierarchyDivisionFilter) &&
                        (!hierarchyDistrictFilter || u.district_bn === hierarchyDistrictFilter)
                    )
                    .map((u, i) => (
                      <option key={`${u.upazila_bn}-${i}`} value={u.upazila_bn}>
                        {u.upazila_bn} ({u.upazila_en})
                      </option>
                    ))}
                </select>
              </div>

              {/* Keyword / J.L. Search */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {t('মৌজা নাম বা জে.এল. নম্বর খুঁজুন', 'Search Mouza / J.L. No')}
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={hierarchySearch}
                    onChange={(e) => setHierarchySearch(e.target.value)}
                    placeholder={t('মৌজা নাম বা জে.এল. নং...', 'Search mouza name or J.L...')}
                    className="w-full text-xs pl-8 pr-2.5 py-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* DATA VIEW ACCORDING TO TIER */}
          {activeHierarchyTier === 'MOUZAS' && (
            <div className="panel p-0 bg-white border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#006A4E]" />
                  <span>{t('নিবন্ধিত মৌজা ও জে.এল. সূচি তালিকা', 'Registered Mouza & J.L. Index Table')}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-[#006A4E] font-bold">
                    {toBanglaDigits(filteredMouzas.length, lang)} {t('টি রেকর্ড', 'Records')}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-medium hidden sm:block">
                  {t('প্লট বা দাগ সংযুক্ত মৌজা মুছে ফেলা সম্পূর্ণ সুরক্ষিত ও নিষিদ্ধ', 'Plots attached to mouzas are safeguarded against deletion')}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
                      <th className="p-3">#</th>
                      <th className="p-3">{t('মৌজার নাম (বাংলা ও ইংরেজি)', 'Mouza Name')}</th>
                      <th className="p-3">{t('জে.এল. নম্বর', 'J.L. No')}</th>
                      <th className="p-3">{t('উপজেলা / থানা', 'Upazila')}</th>
                      <th className="p-3">{t('জেলা ও বিভাগ', 'District & Division')}</th>
                      <th className="p-3 text-center">{t('সংযুক্ত প্লট / দাগ', 'Attached Plots')}</th>
                      <th className="p-3">{t('ভৌগোলিক স্থানাঙ্ক (GPS)', 'GPS Coordinates')}</th>
                      <th className="p-3 text-right">{t('অ্যাকশন', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMouzas.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          {t('কোনো মৌজা খুঁজে পাওয়া যায়নি। অনুসন্ধান ফিল্টার পরিবর্তন করুন।', 'No mouzas match your search criteria.')}
                        </td>
                      </tr>
                    ) : (
                      filteredMouzas.map((m, idx) => (
                        <tr key={m.id} className="hover:bg-emerald-50/30 transition">
                          <td className="p-3 font-mono text-slate-400">
                            {toBanglaDigits(idx + 1, lang)}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{m.mouza_bn}</div>
                            {m.mouza_en && <div className="text-[11px] text-slate-500 font-mono">{m.mouza_en}</div>}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              {toBanglaDigits(m.jl_no, lang)}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-slate-800">
                            {m.upazila_bn}
                          </td>
                          <td className="p-3 text-slate-600">
                            <div>{m.district_bn}</div>
                            <div className="text-[10px] text-slate-400">{m.division_bn}</div>
                          </td>
                          <td className="p-3 text-center">
                            {Number(m.plots_count) > 0 ? (
                              <span
                                title={t('সক্রিয় প্লট সংযুক্ত রয়েছে', 'Active plots attached')}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
                              >
                                <Lock className="w-3 h-3 text-emerald-700" />
                                <span>{toBanglaDigits(m.plots_count, lang)} {t('টি প্লট', 'Plots')}</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                                {t('০ প্লট', '0 Plots')}
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-500">
                            {m.latitude && m.longitude ? (
                              <span>{m.latitude.toFixed(4)}, {m.longitude.toFixed(4)}</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditMouza(m)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                                title={t('সম্পাদনা', 'Edit Mouza')}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMouza(m)}
                                className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                  m.plots_count > 0
                                    ? 'border-slate-200 text-slate-300 hover:bg-slate-50 hover:text-rose-500'
                                    : 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                }`}
                                title={
                                  m.plots_count > 0
                                    ? t('সংযুক্ত দাগ থাকায় ডিলিট নিষিদ্ধ', 'Attached plots prevent deletion')
                                    : t('মৌজা অপসারণ', 'Delete Mouza')
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

          {activeHierarchyTier === 'UPAZILAS' && (
            <div className="panel p-0 bg-white border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#006A4E]" />
                  <span>{t('উপজেলা / থানা অধিক্ষেত্র তালিকা', 'Upazila / Thana Jurisdictions')}</span>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {toBanglaDigits(filteredUpazilas.length, lang)} {t('টি উপজেলা', 'Upazilas')}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
                      <th className="p-3">#</th>
                      <th className="p-3">{t('উপজেলা / থানা নাম', 'Upazila Name')}</th>
                      <th className="p-3">{t('সংশ্লিষ্ট জেলা', 'District')}</th>
                      <th className="p-3">{t('বিভাগ', 'Division')}</th>
                      <th className="p-3 text-center">{t('অধীনস্থ মৌজা সংখ্যা', 'Subordinate Mouzas')}</th>
                      <th className="p-3 text-right">{t('অ্যাকশন', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUpazilas.map((u, idx) => (
                      <tr key={`${u.upazila_bn}-${idx}`} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-mono text-slate-400">{toBanglaDigits(idx + 1, lang)}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{u.upazila_bn}</div>
                          {u.upazila_en && <div className="text-[11px] text-slate-500 font-mono">{u.upazila_en}</div>}
                        </td>
                        <td className="p-3 font-medium text-slate-700">{u.district_bn}</td>
                        <td className="p-3 text-slate-600">{u.division_bn}</td>
                        <td className="p-3 text-center font-bold text-[#006A4E]">
                          {toBanglaDigits(u.mouzas?.length || 0, lang)}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setRenamingTierModal({
                                tier: 'UPAZILA',
                                old_bn: u.upazila_bn,
                                new_bn: u.upazila_bn,
                                new_en: u.upazila_en || '',
                              })
                            }
                            className="px-2.5 py-1 rounded-md text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                          >
                            {t('পুনঃনামকরণ', 'Rename')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeHierarchyTier === 'DISTRICTS' && (
            <div className="panel p-0 bg-white border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-[#006A4E]" />
                  <span>{t('জেলা প্রশাসন কাঠামো তালিকা', 'District Administrative Structures')}</span>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {toBanglaDigits(filteredDistricts.length, lang)} {t('টি জেলা', 'Districts')}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
                      <th className="p-3">#</th>
                      <th className="p-3">{t('জেলা নাম', 'District Name')}</th>
                      <th className="p-3">{t('অন্তর্ভুক্ত বিভাগ', 'Division')}</th>
                      <th className="p-3 text-center">{t('উপজেলা সংখ্যা', 'Upazilas Count')}</th>
                      <th className="p-3 text-center">{t('মোট মৌজা সংখ্যা', 'Total Mouzas')}</th>
                      <th className="p-3 text-right">{t('অ্যাকশন', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDistricts.map((d, idx) => (
                      <tr key={`${d.district_bn}-${idx}`} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-mono text-slate-400">{toBanglaDigits(idx + 1, lang)}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{d.district_bn}</div>
                          {d.district_en && <div className="text-[11px] text-slate-500 font-mono">{d.district_en}</div>}
                        </td>
                        <td className="p-3 font-medium text-slate-700">{d.division_bn}</td>
                        <td className="p-3 text-center font-bold text-slate-700">
                          {toBanglaDigits(d.upazilas?.length || 0, lang)}
                        </td>
                        <td className="p-3 text-center font-bold text-[#006A4E]">
                          {toBanglaDigits(
                            d.upazilas?.reduce((acc, u) => acc + (u.mouzas?.length || 0), 0) || 0,
                            lang
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setRenamingTierModal({
                                tier: 'DISTRICT',
                                old_bn: d.district_bn,
                                new_bn: d.district_bn,
                                new_en: d.district_en || '',
                              })
                            }
                            className="px-2.5 py-1 rounded-md text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                          >
                            {t('পুনঃনামকরণ', 'Rename')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeHierarchyTier === 'DIVISIONS' && (
            <div className="panel p-0 bg-white border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#006A4E]" />
                  <span>{t('বিভাগীয় প্রশাসন স্তর তালিকা', 'Divisional Level Architecture')}</span>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {toBanglaDigits(filteredDivisions.length, lang)} {t('টি বিভাগ', 'Divisions')}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
                      <th className="p-3">#</th>
                      <th className="p-3">{t('বিভাগ নাম', 'Division Name')}</th>
                      <th className="p-3 text-center">{t('জেলা সংখ্যা', 'Districts Count')}</th>
                      <th className="p-3 text-center">{t('উপজেলা সংখ্যা', 'Upazilas Count')}</th>
                      <th className="p-3 text-center">{t('মোট মৌজা', 'Total Mouzas')}</th>
                      <th className="p-3 text-right">{t('অ্যাকশন', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDivisions.map((v, idx) => (
                      <tr key={`${v.division_bn}-${idx}`} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-mono text-slate-400">{toBanglaDigits(idx + 1, lang)}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{v.division_bn}</div>
                          {v.division_en && <div className="text-[11px] text-slate-500 font-mono">{v.division_en}</div>}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700">
                          {toBanglaDigits(v.districts?.length || 0, lang)}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700">
                          {toBanglaDigits(
                            v.districts?.reduce((acc, d) => acc + (d.upazilas?.length || 0), 0) || 0,
                            lang
                          )}
                        </td>
                        <td className="p-3 text-center font-bold text-[#006A4E]">
                          {toBanglaDigits(
                            v.districts?.reduce(
                              (acc, d) =>
                                acc + (d.upazilas?.reduce((a2, u) => a2 + (u.mouzas?.length || 0), 0) || 0),
                              0
                            ) || 0,
                            lang
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setRenamingTierModal({
                                tier: 'DIVISION',
                                old_bn: v.division_bn,
                                new_bn: v.division_bn,
                                new_en: v.division_en || '',
                              })
                            }
                            className="px-2.5 py-1 rounded-md text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                          >
                            {t('পুনঃনামকরণ', 'Rename')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CENTER POPUP MODAL: Add / Edit Mouza Modal */}
          {isAddMouzaOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#006A4E]" />
                    <span>
                      {editingMouza
                        ? t('মৌজা তথ্য সম্পাদনা ও জে.এল. সংশোধন', 'Edit Mouza & J.L. Record')
                        : t('নতুন মৌজা নিবন্ধন (New Mouza Onboarding)', 'Register New Mouza')}
                    </span>
                  </h3>
                  <button
                    onClick={() => setIsAddMouzaOpen(false)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer text-xs"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveMouza} className="space-y-4 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed">
                    {t(
                      'নির্দেশনা: বিভাগ -> জেলা -> উপজেলা প্রমিত অনুক্রমে সঠিক তথ্য নির্বাচন করুন। জে.এল. নম্বর মৌজার জন্য অনন্য হওয়া আবশ্যক।',
                      'Guidelines: Specify Division -> District -> Upazila correctly. J.L. number must be valid for land deeds matching.'
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {t('বিভাগ (বাংলা)*', 'Division (Bangla)*')}
                      </label>
                      <input
                        type="text"
                        required
                        value={mouzaForm.division_bn}
                        onChange={(e) => setMouzaForm({ ...mouzaForm, division_bn: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {t('Division (English)', 'Division (English)')}
                      </label>
                      <input
                        type="text"
                        value={mouzaForm.division_en}
                        onChange={(e) => setMouzaForm({ ...mouzaForm, division_en: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {t('জেলা (বাংলা)*', 'District (Bangla)*')}
                      </label>
                      <input
                        type="text"
                        required
                        value={mouzaForm.district_bn}
                        onChange={(e) => setMouzaForm({ ...mouzaForm, district_bn: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {t('District (English)', 'District (English)')}
                      </label>
                      <input
                        type="text"
                        value={mouzaForm.district_en}
                        onChange={(e) => setMouzaForm({ ...mouzaForm, district_en: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {t('উপজেলা / থানা (বাংলা)*', 'Upazila (Bangla)*')}
                      </label>
                      <input
                        type="text"
                        required
                        value={mouzaForm.upazila_bn}
                        onChange={(e) => setMouzaForm({ ...mouzaForm, upazila_bn: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {t('Upazila (English)', 'Upazila (English)')}
                      </label>
                      <input
                        type="text"
                        value={mouzaForm.upazila_en}
                        onChange={(e) => setMouzaForm({ ...mouzaForm, upazila_en: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        {t('মৌজার নাম (বাংলা)*', 'Mouza Name (Bangla)*')}
                      </label>
                      <input
                        type="text"
                        required
                        value={mouzaForm.mouza_bn}
                        onChange={(e) => setMouzaForm({ ...mouzaForm, mouza_bn: e.target.value })}
                        placeholder="যেমন: সাভার মৌজা, বাড্ডা, তেজগাঁও..."
                        className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {t('জে.এল. নম্বর*', 'J.L. Number*')}
                      </label>
                      <input
                        type="text"
                        required
                        value={mouzaForm.jl_no}
                        onChange={(e) => setMouzaForm({ ...mouzaForm, jl_no: e.target.value })}
                        placeholder="যেমন: ১২, ৪৭..."
                        className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {t('অক্ষাংশ (Latitude - ঐচ্ছিক)', 'Latitude (Optional)')}
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={mouzaForm.latitude}
                        onChange={(e) => setMouzaForm({ ...mouzaForm, latitude: e.target.value })}
                        placeholder="23.8510"
                        className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {t('দ্রাঘিমাংশ (Longitude - ঐচ্ছিক)', 'Longitude (Optional)')}
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={mouzaForm.longitude}
                        onChange={(e) => setMouzaForm({ ...mouzaForm, longitude: e.target.value })}
                        placeholder="90.2600"
                        className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsAddMouzaOpen(false)}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      {t('বাতিল', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-[#006A4E] hover:bg-[#00523C] text-white font-bold transition shadow-xs cursor-pointer"
                    >
                      {editingMouza ? t('হালনাগাদ সংরক্ষণ করুন', 'Save Changes') : t('মৌজা যুক্ত করুন', 'Create Mouza')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* CENTER POPUP MODAL: Rename Tier Modal */}
          {renamingTierModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-[#006A4E]" />
                    <span>{t('প্রশাসনিক স্তরের নাম পরিবর্তন', 'Rename Administrative Tier')}</span>
                  </h3>
                  <button
                    onClick={() => setRenamingTierModal(null)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="text-xs text-slate-600 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                  <strong>{t('সতর্কতা:', 'Notice:')}</strong>{' '}
                  {t(
                    'নাম পরিবর্তনের সাথে সাথে এই স্তরের অধীনস্থ সকল জেলা, উপজেলা ও মৌজার রেকর্ড স্বয়ংক্রিয়ভাবে নতুন নামে হালনাগাদ হবে।',
                    'Renaming cascades automatically to all subordinate entities in the hierarchy.'
                  )}
                </div>

                <form onSubmit={handleSaveRenameTier} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">
                      {t('বর্তমান নাম:', 'Current Name:')}
                    </label>
                    <div className="font-bold text-slate-800 p-2 bg-slate-100 rounded-lg">
                      {renamingTierModal.old_bn} ({renamingTierModal.tier})
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {t('নতুন নাম (বাংলা)*', 'New Name (Bangla)*')}
                    </label>
                    <input
                      type="text"
                      required
                      value={renamingTierModal.new_bn}
                      onChange={(e) => setRenamingTierModal({ ...renamingTierModal, new_bn: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {t('নতুন নাম (English)', 'New Name (English)')}
                    </label>
                    <input
                      type="text"
                      value={renamingTierModal.new_en}
                      onChange={(e) => setRenamingTierModal({ ...renamingTierModal, new_en: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-[#006A4E] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setRenamingTierModal(null)}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      {t('বাতিল', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-[#006A4E] hover:bg-[#00523C] text-white font-bold transition shadow-xs cursor-pointer"
                    >
                      {t('পরিবর্তন সংরক্ষণ করুন', 'Confirm Rename')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      )}

      {/* TAB 4.5: Service Catalogue & Fee Registry (Phase 2) */}
      {(subTab === 'catalogue' || (subTab === 'settings' && settingsSubSegment === 'catalogue')) && (
        <div className="space-y-6 animate-fadeIn">
          {renderPillar5Nav()}
          {/* Notification Banner */}
          {catalogueNotice && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${
                catalogueNotice.err
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800'
              }`}
            >
              <span>{catalogueNotice.msg}</span>
              <button
                onClick={() => setCatalogueNotice(null)}
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Sub-Header & Sub-Navigation */}
          <div className="panel p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#006A4E]/10 pb-4">
              <div>
                <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1.5">
                  <button onClick={() => handleTabChange('overview')} className="hover:text-[#006A4E] transition cursor-pointer">
                    {t('কন্ট্রোল প্যানেল', 'Control Panel')}
                  </button>
                  <span>/</span>
                  <span className="text-[#006A4E] font-extrabold">{t('সার্ভিস ও ফি ডিরেক্টরি', 'Service & Fee Directory')}</span>
                </div>
                <h2 className="font-bold text-lg text-[#074f38] flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#006A4E]" />
                  <span>
                    {t(
                      'সার্ভিস ক্যাটালগ ও অফিসিয়াল ফি রেজিস্ট্রি গভর্ন্যান্স',
                      'Service Catalogue & Official Fee Registry Governance'
                    )}
                  </span>
                </h2>
                <p className="text-xs text-[#5F7A74] mt-0.5">
                  {t(
                    'ভূমি মন্ত্রণালয় ও নিবন্ধন অধিদপ্তরের অফিসিয়াল সেবা পরিচালনা, ইউআরএল উৎস এবং ১৭ ফেব্রুয়ারি ২০২৬ সার্কুলার ফি ভার্সনিং।',
                    'Manage public-facing service catalogue, official HTTPS endpoints, and 17 Feb 2026 circular fee schedules.'
                  )}
                </p>
              </div>

              {/* Sub-Tab Switcher */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCatalogueSubTab('services')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[34px] ${
                    catalogueSubTab === 'services'
                      ? 'bg-[#006A4E] text-white'
                      : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
                  }`}
                >
                  {t('সেবা ক্যাটালগ', 'Service Catalogue')} ({toBanglaDigits(adminServices.length, lang)})
                </button>
                <button
                  onClick={() => setCatalogueSubTab('fees')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[34px] ${
                    catalogueSubTab === 'fees'
                      ? 'bg-[#006A4E] text-white'
                      : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5 inline mr-1" />
                  {t('ফি রেজিস্ট্রি ও ভার্সনিং', 'Fee Registry & Versions')} ({toBanglaDigits(adminFees.length, lang)})
                </button>
              </div>
            </div>

            {/* SUB-VIEW 1: SERVICES CATALOGUE CRUD */}
            {catalogueSubTab === 'services' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Category Filter Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'ALL', name_bn: 'সকল সেবা', name_en: 'All' },
                      { id: 'REVENUE_MUTATION', name_bn: 'নামজারি ও রাজস্ব', name_en: 'Mutation' },
                      { id: 'RECORD_MAPS', name_bn: 'খতিয়ান ও ম্যাপ', name_en: 'Records/Maps' },
                      { id: 'LAND_REGISTRATION', name_bn: 'দলিল ও নিবন্ধন', name_en: 'Deed/Registry' },
                      { id: 'FINANCE_MORTGAGE', name_bn: 'ব্যাংক বন্ধক', name_en: 'Mortgage' },
                      { id: 'HELPLINE_INFO', name_bn: 'সহায়িকা ও হেল্পলাইন', name_en: 'Helpline' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setAdminServiceCatFilter(cat.id)}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer min-h-[30px] ${
                          adminServiceCatFilter === cat.id
                            ? 'bg-[#074f38] text-white'
                            : 'bg-white border border-[#006A4E]/20 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {lang === 'bn' ? cat.name_bn : cat.name_en}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() =>
                      setEditingService({
                        service_code: '',
                        title_bn: '',
                        title_en: '',
                        category: 'REVENUE_MUTATION',
                        description_bn: '',
                        description_en: '',
                        service_type: 'INTERNAL_FEATURE',
                        internal_route: 'check',
                        external_url: '',
                        source_url: 'https://land.gov.bd',
                        authority_name_bn: 'ভূমি মন্ত্রণালয়',
                        authority_name_en: 'Ministry of Land',
                        badge_bn: 'নির্দেশিকা',
                        badge_en: 'Guidance',
                        is_published: 0,
                        display_order: (adminServices.length + 1) * 10,
                        last_reviewed_date: new Date().toISOString().slice(0, 10),
                      })
                    }
                    className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto min-h-[34px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t('নতুন সেবা যুক্ত করুন', 'Add New Service')}</span>
                  </button>
                </div>

                {/* Services Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 font-bold">ক্রম</th>
                        <th className="py-2.5 px-3 font-bold">কোড ও শিরোনাম</th>
                        <th className="py-2.5 px-3 font-bold">ক্যাটাগরি</th>
                        <th className="py-2.5 px-3 font-bold">সেবা ধরন ও রুট</th>
                        <th className="py-2.5 px-3 font-bold">কর্তৃপক্ষ</th>
                        <th className="py-2.5 px-3 font-bold">অবস্থা</th>
                        <th className="py-2.5 px-3 font-bold text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminServices
                        .filter(
                          (s) =>
                            adminServiceCatFilter === 'ALL' || s.category === adminServiceCatFilter
                        )
                        .map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-400">
                              #{s.display_order}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-slate-900 block">
                                {lang === 'bn' ? s.title_bn : s.title_en}
                              </span>
                              <span className="text-[10px] font-mono text-[#006A4E] block">
                                {s.service_code}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                {s.category}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                                  s.service_type === 'EXTERNAL_OFFICIAL'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {s.service_type}
                              </span>
                              {s.external_url && (
                                <a
                                  href={s.external_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-blue-600 hover:underline block truncate max-w-[180px] mt-0.5"
                                >
                                  {s.external_url} ↗
                                </a>
                              )}
                              {s.internal_route && (
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  route: /{s.internal_route}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-medium">
                              {lang === 'bn' ? s.authority_name_bn : s.authority_name_en}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  Number(s.is_published) === 1
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {Number(s.is_published) === 1
                                  ? t('প্রকাশিত', 'PUBLISHED')
                                  : t('আর্কাইভ', 'ARCHIVED')}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setEditingService(s)}
                                  className="px-2 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-[11px] cursor-pointer"
                                  title="সম্পাদনা করুন"
                                >
                                  <Edit2 className="w-3 h-3 inline mr-1" />
                                  {t('সম্পাদনা', 'Edit')}
                                </button>
                                <button
                                  onClick={() => handleTogglePublishService(s.id)}
                                  className="px-2 py-1 rounded border border-[#006A4E]/20 text-[#006A4E] hover:bg-[#E2EFE9] font-bold text-[11px] cursor-pointer"
                                >
                                  {Number(s.is_published) === 1
                                    ? t('আর্কাইভ', 'Archive')
                                    : t('প্রকাশ করুন', 'Publish')}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-VIEW 2: FEES REGISTRY & VERSIONING */}
            {catalogueSubTab === 'fees' && (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      {t(
                        'ভূমি রেকর্ড ও মৌজা ম্যাপ ফি ভূমি মন্ত্রণালয়ের ১৭ ফেব্রুয়ারি ২০২৬ তারিখের স্মারক সার্কুলার (স্মারক: ৩১.০০.০০০০.০৪২.৬৮.০১২.২২.৫২) অনুযায়ী কার্যকর।',
                        'Fees reflect signed Ministry of Land Circular dated 17 February 2026. Every edit produces an immutable versioned history snapshot.'
                      )}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {adminFees.map((f) => {
                    const isEst = Boolean(f.is_estimate);
                    const comps = f.components || [];
                    const hist = f.history || [];

                    return (
                      <div
                        key={f.id}
                        className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-3 shadow-2xs hover:border-[#006A4E]/30 transition-colors"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                                {f.service_code}
                              </span>
                              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                                {lang === 'bn' ? f.title_bn : f.title_en}
                              </h3>
                            </div>
                            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#E6F2EE] text-[#006A4E] border border-[#006A4E]/20">
                              v{f.version}
                            </span>
                          </div>

                          <div className="mt-2.5 flex items-baseline gap-2">
                            <span className="text-2xl font-extrabold text-[#006A4E] font-mono">
                              {isEst ? `~${f.total_bdt}%` : `${toBanglaDigits(f.total_bdt, lang)} ৳`}
                            </span>
                            {isEst && (
                              <span className="text-xs text-slate-500">
                                {t('(প্রাক্কলিত হার)', '(circular estimated rate)')}
                              </span>
                            )}
                          </div>

                          {/* Components */}
                          {comps.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                {t('ফি বিভাজন ও উপাদানসমূহ:', 'Fee Components:')}
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {comps.map((c, i) => (
                                  <span
                                    key={i}
                                    className="text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-medium"
                                  >
                                    {lang === 'bn' ? c.name_bn : c.name_en}:{' '}
                                    <strong className="text-slate-900 font-mono">
                                      {isEst ? `${c.amount_bdt}%` : `${toBanglaDigits(c.amount_bdt, lang)} ৳`}
                                    </strong>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="mt-3 text-xs text-slate-500 space-y-1">
                            <div>
                              <strong>{t('সার্কুলার:', 'Circular:')}</strong>{' '}
                              <span className="font-mono text-slate-700">{f.circular_no}</span>
                            </div>
                            <div>
                              <strong>{t('কার্যকর তারিখ:', 'Effective:')}</strong>{' '}
                              <span className="font-mono">{f.effective_date}</span>
                            </div>
                            <div>
                              <strong>{t('আইনি ভিত্তি:', 'Legal Basis:')}</strong>{' '}
                              <span>{lang === 'bn' ? f.legal_basis_bn : f.legal_basis_en}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            onClick={() => setSelectedFeeHistory(f)}
                            className="px-2.5 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>
                              {t('হিস্ট্রি স্ন্যাপশট', 'Version History')} ({toBanglaDigits(hist.length, lang)})
                            </span>
                          </button>

                          <button
                            onClick={() => setEditingFee(JSON.parse(JSON.stringify(f)))}
                            className="px-3 py-1 rounded bg-[#006A4E] text-white hover:bg-[#00553e] text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>{t('ফি হালনাগাদ ও ভার্সনিং', 'Edit & Archive Version')}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* MODAL 1: EDIT / CREATE SERVICE */}
          {editingService && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-base text-[#074f38] flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#006A4E]" />
                    <span>
                      {editingService.id
                        ? t('সেবা তথ্য সম্পাদনা করুন', 'Edit Service Information')
                        : t('নতুন সেবা যুক্তকরণ', 'Add New Official Service')}
                    </span>
                  </h3>
                  <button
                    onClick={() => setEditingService(null)}
                    className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveService} className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        সার্ভিস কোড (Service Code) *
                      </label>
                      <input
                        type="text"
                        disabled={Boolean(editingService.id)}
                        value={editingService.service_code || ''}
                        onChange={(e) =>
                          setEditingService({ ...editingService, service_code: e.target.value.toUpperCase() })
                        }
                        placeholder="MUTATION_ACLAND"
                        className="field font-mono font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        ক্যাটাগরি (Category) *
                      </label>
                      <select
                        value={editingService.category || 'REVENUE_MUTATION'}
                        onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                        className="field font-bold"
                      >
                        <option value="REVENUE_MUTATION">নামজারি ও রাজস্ব (REVENUE_MUTATION)</option>
                        <option value="RECORD_MAPS">খতিয়ান ও মৌজা ম্যাপ (RECORD_MAPS)</option>
                        <option value="LAND_REGISTRATION">দলিল ও রেজিস্ট্রি (LAND_REGISTRATION)</option>
                        <option value="FINANCE_MORTGAGE">ব্যাংক বন্ধক (FINANCE_MORTGAGE)</option>
                        <option value="DISPUTE_CITIZEN">নাগরিক বিরোধ (DISPUTE_CITIZEN)</option>
                        <option value="HELPLINE_INFO">সহায়িকা ও হেল্পলাইন (HELPLINE_INFO)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        শিরোনাম (বাংলা) *
                      </label>
                      <input
                        type="text"
                        value={editingService.title_bn || ''}
                        onChange={(e) => setEditingService({ ...editingService, title_bn: e.target.value })}
                        placeholder="ই-নামজারি আবেদন"
                        className="field"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        শিরোনাম (ইংরেজি)
                      </label>
                      <input
                        type="text"
                        value={editingService.title_en || ''}
                        onChange={(e) => setEditingService({ ...editingService, title_en: e.target.value })}
                        placeholder="Online e-Mutation"
                        className="field"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      সংক্ষিপ্ত বিবরণী (বাংলা)
                    </label>
                    <textarea
                      rows={2}
                      value={editingService.description_bn || ''}
                      onChange={(e) => setEditingService({ ...editingService, description_bn: e.target.value })}
                      placeholder="সেবার সারসংক্ষেপ ও নির্দেশিকা..."
                      className="field"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        সেবার ধরন (Type)
                      </label>
                      <select
                        value={editingService.service_type || 'EXTERNAL_OFFICIAL'}
                        onChange={(e) =>
                          setEditingService({ ...editingService, service_type: e.target.value as any })
                        }
                        className="field font-bold"
                      >
                        <option value="EXTERNAL_OFFICIAL">বহিস্থ সরকারি পোর্টাল (EXTERNAL_OFFICIAL)</option>
                        <option value="INTERNAL_FEATURE">অভ্যন্তরীণ ফিচার (INTERNAL_FEATURE)</option>
                        <option value="HYBRID_GUIDANCE">গাইডেন্স ও নির্দেশিকা (HYBRID_GUIDANCE)</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        অভ্যন্তরীণ রুট (যদি থাকে)
                      </label>
                      <input
                        type="text"
                        value={editingService.internal_route || ''}
                        onChange={(e) => setEditingService({ ...editingService, internal_route: e.target.value })}
                        placeholder="check, qr, home"
                        className="field font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        প্রদর্শন ক্রম (Order)
                      </label>
                      <input
                        type="number"
                        value={editingService.display_order ?? 10}
                        onChange={(e) =>
                          setEditingService({ ...editingService, display_order: Number(e.target.value) })
                        }
                        className="field font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        বহিস্থ সরকারি URL (HTTPS বাধ্যতামূলক)
                      </label>
                      <input
                        type="url"
                        value={editingService.external_url || ''}
                        onChange={(e) => setEditingService({ ...editingService, external_url: e.target.value })}
                        placeholder="https://mutation.land.gov.bd"
                        className="field font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        উৎস / গেজেট URL (HTTPS বাধ্যতামূলক)
                      </label>
                      <input
                        type="url"
                        value={editingService.source_url || ''}
                        onChange={(e) => setEditingService({ ...editingService, source_url: e.target.value })}
                        placeholder="https://minland.gov.bd"
                        className="field font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        কর্তৃপক্ষের নাম (বাংলা)
                      </label>
                      <input
                        type="text"
                        value={editingService.authority_name_bn || ''}
                        onChange={(e) =>
                          setEditingService({ ...editingService, authority_name_bn: e.target.value })
                        }
                        placeholder="উপজেলা ভূমি অফিস (এসি ল্যান্ড)"
                        className="field"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        কর্তৃপক্ষের নাম (ইংরেজি)
                      </label>
                      <input
                        type="text"
                        value={editingService.authority_name_en || ''}
                        onChange={(e) =>
                          setEditingService({ ...editingService, authority_name_en: e.target.value })
                        }
                        placeholder="Upazila Land Office"
                        className="field"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingService(null)}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer min-h-[36px]"
                    >
                      {t('বাতিল', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      className="btn-primary text-xs font-bold cursor-pointer min-h-[36px]"
                    >
                      {t('সংরক্ষণ করুন', 'Save Service Record')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL 2: EDIT FEE & SNAPSHOT VERSION */}
          {editingFee && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-base text-[#074f38] flex items-center gap-2">
                      <Coins className="w-5 h-5 text-[#006A4E]" />
                      <span>{t('সরকারি ফি হালনাগাদ ও ভার্সন সংরক্ষণ', 'Update Fee & Snapshot Version')}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      সার্ভিস কোড: <strong className="font-mono">{editingFee.service_code}</strong> • বর্তমান ভার্সন: v{editingFee.version} → পরবর্তী: v{((editingFee.version || 1) + 1)}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingFee(null)}
                    className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveFee} className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        ফি এর শিরোনাম (বাংলা) *
                      </label>
                      <input
                        type="text"
                        value={editingFee.title_bn || ''}
                        onChange={(e) => setEditingFee({ ...editingFee, title_bn: e.target.value })}
                        className="field"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        মোট পরিমাণ (BDT বা শতাংশ) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={editingFee.total_bdt ?? 0}
                        onChange={(e) => setEditingFee({ ...editingFee, total_bdt: Number(e.target.value) })}
                        className="field font-mono font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        স্মারক সার্কুলার নম্বর
                      </label>
                      <input
                        type="text"
                        value={editingFee.circular_no || ''}
                        onChange={(e) => setEditingFee({ ...editingFee, circular_no: e.target.value })}
                        placeholder="৩১.০০.০০০০.০৪২.৬৮.০১২.২২.৫২"
                        className="field font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        কার্যকর তারিখ (YYYY-MM-DD)
                      </label>
                      <input
                        type="date"
                        value={editingFee.effective_date || ''}
                        onChange={(e) => setEditingFee({ ...editingFee, effective_date: e.target.value })}
                        className="field font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      সরকারি সার্কুলার / পোর্টাল URL (HTTPS)
                    </label>
                    <input
                      type="url"
                      value={editingFee.source_url || ''}
                      onChange={(e) => setEditingFee({ ...editingFee, source_url: e.target.value })}
                      placeholder="https://minland.gov.bd"
                      className="field font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      আইনি ভিত্তি (Legal Basis)
                    </label>
                    <input
                      type="text"
                      value={editingFee.legal_basis_bn || ''}
                      onChange={(e) => setEditingFee({ ...editingFee, legal_basis_bn: e.target.value })}
                      className="field"
                    />
                  </div>

                  {/* Components Breakdown Editor */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        ফি এর বিভাজন উপাদানসমূহ (Components)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const currentComps = editingFee.components || [];
                          setEditingFee({
                            ...editingFee,
                            components: [
                              ...currentComps,
                              { name_bn: 'নতুন উপাদান', name_en: 'New Component', amount_bdt: 0, type: 'FEE' },
                            ],
                          });
                        }}
                        className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer"
                      >
                        + উপাদান যুক্ত করুন
                      </button>
                    </div>

                    {(editingFee.components || []).map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={c.name_bn}
                          onChange={(e) => {
                            const newComps = [...(editingFee.components || [])];
                            newComps[i] = { ...newComps[i], name_bn: e.target.value };
                            setEditingFee({ ...editingFee, components: newComps });
                          }}
                          placeholder="উপাদানের নাম"
                          className="field flex-1"
                        />
                        <input
                          type="number"
                          step="any"
                          value={c.amount_bdt}
                          onChange={(e) => {
                            const newComps = [...(editingFee.components || [])];
                            newComps[i] = { ...newComps[i], amount_bdt: Number(e.target.value) };
                            setEditingFee({ ...editingFee, components: newComps });
                          }}
                          placeholder="পরিমাণ"
                          className="field w-24 font-mono font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newComps = (editingFee.components || []).filter((_, idx) => idx !== i);
                            setEditingFee({ ...editingFee, components: newComps });
                          }}
                          className="text-rose-600 hover:text-rose-800 font-bold p-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 leading-relaxed">
                    ⓘ <strong>অপরিবর্তনীয় অডিট ট্রেইল:</strong> ফি হালনাগাদ করার সাথে সাথে পূর্ববর্তী তথ্য ভার্সন <strong>v{editingFee.version}</strong> হিসেবে স্থায়ীভাবে স্ন্যাপশট আর্কাইভে সংরক্ষিত হবে এবং সিস্টেমে নতুন ভার্সন <strong>v{((editingFee.version || 1) + 1)}</strong> তৈরি হবে।
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingFee(null)}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer min-h-[36px]"
                    >
                      {t('বাতিল', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      className="btn-primary text-xs font-bold cursor-pointer min-h-[36px]"
                    >
                      {t('হালনাগাদ ও ভার্সন সংরক্ষণ করুন', 'Update & Archive Version Snapshot')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL 3: VIEW FEE VERSION HISTORY SNAPSHOTS */}
          {selectedFeeHistory && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-base text-[#074f38] flex items-center gap-2">
                      <History className="w-5 h-5 text-[#006A4E]" />
                      <span>{t('ফি ভার্সন ইতিহাস ও অডিট স্ন্যাপশট', 'Fee Version History & Audit Snapshots')}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {selectedFeeHistory.title_bn} ({selectedFeeHistory.service_code})
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedFeeHistory(null)}
                    className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Current Active Version Card */}
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>{t('বর্তমান সক্রিয় ভার্সন', 'Current Active Version')}</span>
                      </span>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-700 text-white">
                        v{selectedFeeHistory.version}
                      </span>
                    </div>
                    <div className="text-lg font-mono font-bold text-[#006A4E]">
                      {selectedFeeHistory.is_estimate
                        ? `~${selectedFeeHistory.total_bdt}%`
                        : `${toBanglaDigits(selectedFeeHistory.total_bdt, lang)} ৳`}
                    </div>
                    <div className="text-xs text-slate-600">
                      সার্কুলার: <span className="font-mono">{selectedFeeHistory.circular_no}</span> • কার্যকর:{' '}
                      <span className="font-mono">{selectedFeeHistory.effective_date}</span>
                    </div>
                  </div>

                  {/* Previous Historical Version Snapshots */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      {t('পূর্ববর্তী সংরক্ষিত সংস্করণসমূহ (Snapshots):', 'Previous Version Snapshots:')}
                    </h4>
                    {(!selectedFeeHistory.history || selectedFeeHistory.history.length === 0) ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                        {t('কোনো পূর্ববর্তী সংস্করণ নেই (এটিই মূল প্রাথমিক সংস্করণ)।', 'No previous versions archived yet (this is the initial release version).')}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {selectedFeeHistory.history.map((h, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-800">
                                সংস্করণ v{h.version}
                              </span>
                              <span className="font-mono text-[11px] text-slate-500">
                                {h.updated_at ? new Date(h.updated_at).toLocaleString() : ''}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-base font-bold font-mono text-slate-800">
                                {toBanglaDigits(h.total_bdt, lang)} ৳
                              </span>
                              <span className="text-[11px] text-slate-500">
                                • আপডেট করেছেন: @{h.updated_by}
                              </span>
                            </div>
                            {h.circular_no && (
                              <div className="text-[11px] font-mono text-slate-500">
                                সার্কুলার: {h.circular_no}
                              </div>
                            )}
                            {h.components && h.components.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {h.components.map((c, cIdx) => (
                                  <span
                                    key={cIdx}
                                    className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 font-medium"
                                  >
                                    {c.name_bn}: {c.amount_bdt} ৳
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-right">
                  <button
                    onClick={() => setSelectedFeeHistory(null)}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer min-h-[36px]"
                  >
                    {t('বন্ধ করুন', 'Close')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Site Settings & Rules Engine Configuration */}
      {subTab === 'settings' && (
        <div className="panel p-6 space-y-5">
          <div>
            <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1.5">
              <button onClick={() => handleTabChange('overview')} className="hover:text-[#006A4E] transition cursor-pointer">
                {t('কন্ট্রোল প্যানেল', 'Control Panel')}
              </button>
              <span>/</span>
              <span className="text-[#006A4E] font-extrabold">{t('সিস্টেম পলিসি ও নোটিশ', 'System Policy Settings')}</span>
            </div>
            <h2 className="font-bold text-lg text-[#074f38] flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#006A4E]" />
              <span>
                {t(
                  'সিস্টেম কনফিগারেশন, RBAC পলিসি ও জালিয়াতি রুল ইঞ্জিন থ্রেশহোল্ড',
                  'System Policy Configuration, RBAC Enforcement & Rules Engine Thresholds'
                )}
              </span>
            </h2>
          </div>

          {saveMsg && (
            <div className="p-4 rounded-xl bg-[#EDF7F4] text-[#006A4E] font-bold text-xs">
              {saveMsg}
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {settingsList.map((st) => (
                <div
                  key={st.setting_key || st.key}
                  className="p-4 rounded-xl bg-[#EDF7F4]/80 border border-[#006A4E]/12"
                >
                  <label className="block font-bold text-xs text-[#0A1F1C] mb-1">
                    {lang === 'bn' ? st.label_bn || st.description_bn : st.label_en || st.description_en}
                  </label>
                  <div className="text-[11px] font-mono text-[#5F7A74]/80 mb-2">
                    {st.setting_key || st.key}
                  </div>
                  <input
                    type="text"
                    value={
                      settingsMap[st.setting_key || st.key] ??
                      st.setting_value ??
                      String(st.value ?? '')
                    }
                    onChange={(e) =>
                      setSettingsMap({
                        ...settingsMap,
                        [st.setting_key || st.key]: e.target.value,
                      })
                    }
                    className="w-full p-2 rounded-lg bg-white border border-[#006A4E]/20 text-xs font-semibold"
                  />
                </div>
              ))}
            </div>
            <button
              type="submit"
              className="btn-primary text-xs cursor-pointer min-h-[40px]"
            >
              {t('পলিসি সংরক্ষণ করুন', 'Save System Policies')}
            </button>
          </form>
        </div>
      )}

      {/* TAB 6: Append-Only Hash-Chained Audit Log */}
      {(subTab === 'audit_reports' || subTab === 'audit' || (subTab === 'ledger' && ledgerSubSegment === 'audit_trail')) && (
        <div className="space-y-6 animate-fadeIn">
          {renderPillar4Nav()}
          <div className="panel p-6 space-y-4">
          <div>
            <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1.5">
              <button onClick={() => handleTabChange('overview')} className="hover:text-[#006A4E] transition cursor-pointer">
                {t('কন্ট্রোল প্যানেল', 'Control Panel')}
              </button>
              <span>/</span>
              <span className="text-[#006A4E] font-extrabold">{t('সিকিউরিটি অডিট ট্রেইল ও রিপোর্ট', 'Security Audit Trail & Reports')}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#006A4E]" />
                <h2 className="text-lg font-extrabold text-[#0A1F1C]">
                  {t(
                    'অপরিবর্তনীয় হ্যাশ-চেইন অডিট লগ (Append-Only Cryptographic Audit Trail)',
                    'Append-Only Hash-Chained Audit Trail'
                  )}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOverrideModal({ isOpen: true, actionType: 'ADMINISTRATIVE_OVERRIDE', targetId: 'SYSTEM' })}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>{t('প্রশাসনিক ওভাররাইড কনসোল', 'Admin Override Console')}</span>
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto font-mono text-xs">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg bg-[#EDF7F4]/80 border border-[#006A4E]/12 flex flex-col md:flex-row md:items-center justify-between gap-2"
              >
                <div>
                  <span className="font-bold text-[#006A4E]">[{log.action}]</span>{' '}
                  <span className="text-[#0A1F1C]">{log.actor_role}</span> — {log.target_ref} (
                  {log.detail})
                </div>
                <div className="text-[#5F7A74]/80 truncate max-w-xs">HASH: {log.entry_hash}</div>
              </div>
            ))}
          </div>
        </div>
        </div>
      )}

      {/* TAB 9: Maker-Checker Staging Onboarding & Appellate Review Mirror (Tier C Sections 8.7 & 8.8) */}
      {(subTab === 'survey_records' || subTab === 'onboarding_appeals' || (subTab === 'users' && usersSubSegment === 'onboarding_appeals')) && (
        <div className="space-y-6 animate-fadeIn">
          {renderPillar2Nav()}
          <div className="panel p-6 space-y-6">
          {onbNotice && (
            <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-semibold animate-rise ${
              onbNotice.err ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-[#006A4E]'
            }`}>
              {onbNotice.err ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
              <span>{onbNotice.msg}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#006A4E]/10 pb-4">
            <div>
              <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1.5">
                <button onClick={() => handleTabChange('overview')} className="hover:text-[#006A4E] transition cursor-pointer">
                  {t('কন্ট্রোল প্যানেল', 'Control Panel')}
                </button>
                <span>/</span>
                <span className="text-[#006A4E] font-extrabold">{t('অনবোর্ডিং ও আপিল ওভারসাইট', 'Onboarding & Appeals Oversight')}</span>
              </div>
              <h2 className="font-bold text-lg text-[#074f38] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#006A4E]" />
                <span>{t('মেকার-চেকার অনবোর্ডিং ও আপিল রিভিউ ট্রাইব্যুনাল', 'Maker-Checker Onboarding & Appellate Review Tribunal')}</span>
              </h2>
              <p className="text-xs text-[#5F7A74] mt-0.5">
                {t(
                  'ডিজিটালাইজেশন ড্রাফট যাচাইয়ে মেকার-চেকার চার-চোখের নীতি (Four-Eyes Principle) এবং আপিল আদালতের স্থগিতাদেশ ট্রাইব্যুনাল।',
                  'Maker-Checker staging data verification with cryptographic proof packages and legal appellate stay orders.'
                )}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setOnbAppealsSubTab('batches')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                  onbAppealsSubTab === 'batches'
                    ? 'bg-[#006A4E] text-white shadow-xs'
                    : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{t('মেকার-চেকার ব্যাচ', 'Staging Batches')} ({toBanglaDigits(onboardingBatches.length, lang)})</span>
              </button>
              <button
                onClick={() => setOnbAppealsSubTab('appeals')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                  onbAppealsSubTab === 'appeals'
                    ? 'bg-[#006A4E] text-white shadow-xs'
                    : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>{t('আপিল ট্রাইব্যুনাল', 'Appeals Mirror')} ({toBanglaDigits(appealsList.length, lang)})</span>
              </button>
            </div>
          </div>

          {/* Sub-tab 1: Maker-Checker Staging Batches */}
          {onbAppealsSubTab === 'batches' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F4F9F6] p-4 rounded-xl border border-[#006A4E]/10">
                <div className="text-xs text-[#33554B] leading-relaxed max-w-2xl">
                  <strong>{t('চার-চোখের নীতি (Four-Eyes Principle):', 'Four-Eyes Principle:')}</strong>{' '}
                  {t(
                    'রেজিস্ট্রি ডাটা অফিসার বা সহকারী কর্মকর্তা ড্রাফট প্রস্তুত করেন (Maker)। সাব-রেজিস্ট্রার বা এসি ল্যান্ড তা যাচাই ও হ্যাশ অখণ্ডতা মিলিয়ে অনুমোদন করেন (Checker)। প্রস্তুতকারী কর্মকর্তা নিজ ব্যাচ অনুমোদন করতে পারেন না।',
                    'Makers stage draft entries. Checkers verify payloads and cryptographic hash chains before granting approval. Makers cannot check their own batches.'
                  )}
                </div>
                <button
                  onClick={() => setIsCreatingBatch(!isCreatingBatch)}
                  className="px-4 py-2 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreatingBatch ? t('ফর্ম বন্ধ করুন', 'Close Form') : t('নতুন স্ট্যাজিং ব্যাচ তৈরি', 'New Staging Batch')}</span>
                </button>
              </div>

              {isCreatingBatch && (
                <form onSubmit={handleCreateBatch} className="p-5 rounded-xl border border-[#006A4E]/20 bg-white shadow-xs space-y-4 animate-rise">
                  <h3 className="font-bold text-sm text-[#074f38] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#006A4E]" />
                    <span>{t('নতুন অনবোর্ডিং ড্রাফট ব্যাচ দাখিল', 'Submit New Staging Onboarding Batch')}</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">{t('রেকর্ড ধরন', 'Record Type')}</label>
                      <select
                        value={batchForm.record_type}
                        onChange={(e) => setBatchForm({ ...batchForm, record_type: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="DEED_DRAFT">{t('সাফ-কবলা দলিল ড্রাফট (DEED_DRAFT)', 'Sale Deed Draft')}</option>
                        <option value="KHATIAN_RECONCILIATION">{t('খতিয়ান সমন্বয় ড্রাফট (KHATIAN_RECONCILIATION)', 'Khatian Reconciliation Draft')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">{t('দাগ নং', 'Dag No')}</label>
                      <input
                        type="text"
                        value={batchForm.dag_no}
                        onChange={(e) => setBatchForm({ ...batchForm, dag_no: e.target.value })}
                        required
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                        placeholder="১২২"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">{t('মৌজা', 'Mouza')}</label>
                      <input
                        type="text"
                        value={batchForm.mouza}
                        onChange={(e) => setBatchForm({ ...batchForm, mouza: e.target.value })}
                        required
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                        placeholder="বিরুলিয়া"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">{t('দাতা / বর্তমান মালিকের নাম', 'Seller / Current Owner')}</label>
                      <input
                        type="text"
                        value={batchForm.seller_name}
                        onChange={(e) => setBatchForm({ ...batchForm, seller_name: e.target.value })}
                        required
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                        placeholder="মো. আব্দুল কাদের"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">{t('গ্রহীতা / ক্রেতার নাম', 'Buyer / Beneficiary')}</label>
                      <input
                        type="text"
                        value={batchForm.buyer_name}
                        onChange={(e) => setBatchForm({ ...batchForm, buyer_name: e.target.value })}
                        required
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                        placeholder="মো. রফিকুল ইসলাম"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">{t('জমির পরিমাণ (শতাংশ)', 'Area (Decimal)')}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={batchForm.area_decimal}
                        onChange={(e) => setBatchForm({ ...batchForm, area_decimal: e.target.value })}
                        required
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                        placeholder="৮.৫০"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingBatch(false)}
                      className="px-3 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      {t('বাতিল', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#006A4E] text-white text-xs font-bold hover:bg-[#00553e] shadow-xs"
                    >
                      {t('ব্যাচ তৈরি ও হ্যাশ সিল সহ দাখিল', 'Submit Batch with SHA-256 Proof')}
                    </button>
                  </div>
                </form>
              )}

              {/* Batches Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {onboardingBatches.map((batch) => {
                  const isSubmitted = batch.status === 'SUBMITTED';
                  const isApproved = batch.status === 'APPROVED';
                  const isMaker = user && Number(user.id) === Number(batch.maker_user_id);

                  return (
                    <div
                      key={batch.id}
                      className="p-5 rounded-xl border border-[#006A4E]/15 bg-white shadow-xs flex flex-col justify-between hover:border-[#006A4E]/30 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs font-extrabold text-[#006A4E] bg-emerald-50 px-2.5 py-1 rounded-md">
                            {batch.batch_no}
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                              isApproved
                                ? 'bg-emerald-100 text-emerald-800'
                                : isSubmitted
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {isApproved ? <CheckCircle2 className="w-3.5 h-3.5" /> : isSubmitted ? <Clock className="w-3.5 h-3.5" /> : <XOctagon className="w-3.5 h-3.5" />}
                            <span>{batch.status}</span>
                          </span>
                        </div>

                        <h3 className="font-bold text-sm text-slate-900 mb-1">
                          {batch.record_type === 'DEED_DRAFT' ? t('দলিল প্রাক-যাচাই ড্রাফট ব্যাচ', 'Sale Deed Draft Batch') : t('খতিয়ান সমন্বয় ড্রাফট ব্যাচ', 'Khatian Reconciliation Batch')}
                        </h3>

                        <div className="space-y-1.5 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
                          <div className="flex justify-between">
                            <span className="text-slate-500">{t('প্রস্তুতকারী (Maker):', 'Maker:')}</span>
                            <span className="font-medium text-slate-800">{batch.maker_name_bn || 'মেকার অফিসার'} ({batch.maker_role})</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">{t('অনুমোদনকারী (Checker):', 'Checker:')}</span>
                            <span className="font-medium text-slate-800">{batch.checker_name_bn || (isSubmitted ? t('অপেক্ষমান...', 'Pending Review...') : '—')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">{t('আইটেম সংখ্যা:', 'Items Count:')}</span>
                            <span className="font-bold text-[#006A4E]">{toBanglaDigits(batch.item_count || 1, lang)} টি</span>
                          </div>
                          <div className="pt-1">
                            <span className="text-[11px] text-slate-400 block">{t('SHA-256 প্রুফ হ্যাশ:', 'Proof Hash:')}</span>
                            <span className="font-mono text-[10px] text-slate-600 truncate block bg-slate-50 p-1 rounded">
                              {batch.batch_hash}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <button
                          onClick={async () => {
                            const res = await BhumiApi.getOnboardingBatch(batch.id);
                            setSelectedBatch(res);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                        >
                          {t('আইটেম বিস্তারিত দেখুন →', 'Inspect Payload →')}
                        </button>

                        {isSubmitted && (
                          <div className="flex gap-1.5 items-center">
                            {isMaker ? (
                              <span className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded font-medium">
                                {t('🔒 প্রস্তুতকারী (মেকার লক)', '🔒 Maker Locked')}
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleDecideBatch(batch.id, 'APPROVED')}
                                  className="px-3 py-1.5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold cursor-pointer transition shadow-xs"
                                >
                                  {t('✔ অনুমোদন', '✔ Approve')}
                                </button>
                                <button
                                  onClick={() => handleDecideBatch(batch.id, 'REJECTED')}
                                  className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer transition shadow-xs"
                                >
                                  {t('✕ বাতিল', '✕ Reject')}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Batch Inspector Modal */}
              {selectedBatch && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-xl animate-rise">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <h3 className="font-bold text-base text-[#074f38]">
                          {t('ব্যাচ বিস্তারিত ও আইটেম পেলোড:', 'Batch Details & Canonical Items:')} {selectedBatch.batch.batch_no}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          Hash: {selectedBatch.batch.batch_hash}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedBatch(null)}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-3">
                      {selectedBatch.items.map((item: any, idx: number) => (
                        <div key={item.id || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
                          <div className="flex items-center justify-between font-bold text-slate-800">
                            <span>#{toBanglaDigits(idx + 1, lang)} | দাগ নং: {toBanglaDigits(item.payload.dag_no || item.payload.dag_no_bn || '১২২', lang)}</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                              {item.validation_status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-slate-600">
                            <div><strong>{t('মৌজা:', 'Mouza:')}</strong> {item.payload.mouza || 'বিরুলিয়া'}</div>
                            <div><strong>{t('জমির পরিমাণ:', 'Area:')}</strong> {toBanglaDigits(item.payload.area_decimal || '০.০০', lang)} শতক</div>
                            <div><strong>{t('হস্তান্তরকারী / দাতা:', 'Transferor:')}</strong> {item.payload.seller_name || item.payload.donor_name || 'আবুল কাশেম'}</div>
                            <div><strong>{t('গ্রহীতা / ক্রেতা:', 'Transferee:')}</strong> {item.payload.buyer_name || item.payload.donee_name || 'মো. ফখরুল ইসলাম'}</div>
                          </div>
                          {item.payload.declared_value_bdt && (
                            <div className="text-slate-600 pt-1 border-t border-slate-200">
                              <strong>{t('ঘোষিত মূল্য:', 'Declared Value:')}</strong> ৳{toBanglaDigits(Number(item.payload.declared_value_bdt).toLocaleString(), lang)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => setSelectedBatch(null)}
                        className="px-4 py-2 rounded-lg bg-[#006A4E] text-white text-xs font-bold hover:bg-[#00553e]"
                      >
                        {t('বন্ধ করুন', 'Close')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 2: Appeals Mirror & Legal Review Tribunal */}
          {onbAppealsSubTab === 'appeals' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F4F9F6] p-4 rounded-xl border border-[#006A4E]/10">
                <div className="text-xs text-[#33554B] leading-relaxed max-w-2xl">
                  <strong>{t('আপিল আদালতের এখতিয়ার (Section 8.8):', 'Appellate Tribunal Jurisdiction:')}</strong>{' '}
                  {t(
                    'সহকারী কমিশনার (ভূমি) কর্তৃক নামজারি আদেশ বা খারিজের বিরুদ্ধে অতিরিক্ত জেলা প্রশাসক (রাজস্ব) বা ইউএনও রিভিউ ট্রাইব্যুনালে শুনানি অনুষ্ঠিত হয়। স্থগিতাদেশ (Stay Order) জারির সাথে সাথে সংশ্লিষ্ট দাগে যেকোনো বিক্রয় বা নামজারি স্বয়ংক্রিয়ভাবে ব্লক হয়।',
                    'Appeals against mutation decisions before ADC (Revenue) or UNO. Granting a stay order automatically locks the plot against any deed registrations or mutation transfers.'
                  )}
                </div>
                <button
                  onClick={() => setIsCreatingAppeal(!isCreatingAppeal)}
                  className="px-4 py-2 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreatingAppeal ? t('ফর্ম বন্ধ করুন', 'Close Form') : t('নতুন আপিল দায়ের', 'File New Appeal')}</span>
                </button>
              </div>

              {isCreatingAppeal && (
                <form onSubmit={handleCreateAppeal} className="p-5 rounded-xl border border-[#006A4E]/20 bg-white shadow-xs space-y-4 animate-rise">
                  <h3 className="font-bold text-sm text-[#074f38] flex items-center gap-2">
                    <Scale className="w-4 h-4 text-[#006A4E]" />
                    <span>{t('নতুন ভূমি আপিল আবেদন দাখিল', 'File New Land Mutation Appeal')}</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">{t('আপিলকারীর নাম', 'Appellant Name')}</label>
                      <input
                        type="text"
                        value={appealForm.appellant_name_bn}
                        onChange={(e) => setAppealForm({ ...appealForm, appellant_name_bn: e.target.value })}
                        required
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                        placeholder="মোসা. রাবেয়া খাতুন"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">{t('আপিলকারীর জাতীয় পরিচয়পত্র (NID)', 'Appellant NID')}</label>
                      <input
                        type="text"
                        value={appealForm.appellant_nid}
                        onChange={(e) => setAppealForm({ ...appealForm, appellant_nid: e.target.value })}
                        required
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                        placeholder="9900001002"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">{t('আপিলের কারণ ও প্রার্থিত প্রতিকার', 'Grounds for Appeal & Remedy Sought')}</label>
                      <textarea
                        rows={3}
                        value={appealForm.reason_bn}
                        onChange={(e) => setAppealForm({ ...appealForm, reason_bn: e.target.value })}
                        required
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                        placeholder="সহকারী কমিশনার (ভূমি) কর্তৃক নামজারি স্থগিতাদেশের বিরুদ্ধে অতিরিক্ত জেলা প্রশাসক (রাজস্ব) মহোদয় সমীপে আপিল..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingAppeal(false)}
                      className="px-3 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      {t('বাতিল', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#006A4E] text-white text-xs font-bold hover:bg-[#00553e] shadow-xs"
                    >
                      {t('আপিল পিটিশন দাখিল করুন', 'Submit Appeal Petition')}
                    </button>
                  </div>
                </form>
              )}

              {/* Appeals List */}
              <div className="space-y-4">
                {appealsList.map((appeal) => {
                  const isStay = appeal.status === 'STAY_ORDER_GRANTED';
                  const isHearing = appeal.status === 'HEARING_SCHEDULED';
                  const isUpheld = appeal.status === 'UPHELD';

                  return (
                    <div
                      key={appeal.id}
                      className="p-5 rounded-xl border border-[#006A4E]/15 bg-white shadow-xs space-y-3 hover:border-[#006A4E]/30 transition"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-[#006A4E] bg-emerald-50 px-2.5 py-1 rounded-md">
                            {appeal.appeal_code}
                          </span>
                          <span className="font-semibold text-xs text-slate-700">
                            দাগ নং: {toBanglaDigits(appeal.dag_no || appeal.dag_no_bn || '১০৮', lang)}
                          </span>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                            isStay
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : isHearing
                              ? 'bg-amber-100 text-amber-800'
                              : isUpheld
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isStay ? <Lock className="w-3.5 h-3.5" /> : <Gavel className="w-3.5 h-3.5" />}
                          <span>
                            {isStay
                              ? t('হস্তান্তর স্থগিতাদেশ কার্যকর (বিক্রয় লক)', 'Stay Order Active (Sale Locked)')
                              : isHearing
                              ? t('শুনানি নির্ধারিত', 'Hearing Scheduled')
                              : appeal.status}
                          </span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 block mb-0.5">{t('আপিলকারী:', 'Appellant:')}</span>
                          <span className="font-bold text-slate-800">{appeal.appellant_name_bn}</span>{' '}
                          <span className="text-slate-500 font-mono">
                            (NID: {appeal.appellant_nid_masked || appeal.appellant_nid})
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-0.5">{t('পর্যালোচনাকারী কর্মকর্তা:', 'Appellate Reviewer:')}</span>
                          <span className="font-medium text-slate-800">{appeal.reviewer_username || t('শুনানি কর্মকর্তা নির্ধারিত হননি', 'Unassigned')}</span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 leading-relaxed border border-slate-100">
                        <strong className="text-slate-900 block mb-1">{t('আপিলের কারণ:', 'Appeal Grounds:')}</strong>
                        {appeal.reason_bn}
                      </div>

                      {appeal.decision_note_bn && (
                        <div className="p-3 bg-emerald-50/60 rounded-lg text-xs text-[#006A4E] leading-relaxed border border-emerald-100">
                          <strong className="block mb-0.5 font-bold">{t('ট্রাইব্যুনালের আদেশ / শুনানির সিদ্ধান্ত:', 'Tribunal Order:')}</strong>
                          {appeal.decision_note_bn}
                        </div>
                      )}

                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => setAppealDecisionModal({ appeal, status: appeal.status, note: appeal.decision_note_bn || '' })}
                          className="px-4 py-2 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                        >
                          <Gavel className="w-3.5 h-3.5" />
                          <span>{t('আদালতের আদেশ / শুনানি নির্ধারণ করুন', 'Render Order / Schedule Hearing')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Appeal Decision Modal */}
              {appealDecisionModal && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl animate-rise">
                    <div className="flex items-center justify-between border-b pb-3">
                      <h3 className="font-bold text-base text-[#074f38] flex items-center gap-2">
                        <Gavel className="w-5 h-5 text-[#006A4E]" />
                        <span>{t('আপিল আদালতের সিদ্ধান্ত প্রদান:', 'Appellate Tribunal Decision:')} {appealDecisionModal.appeal.appeal_code}</span>
                      </h3>
                      <button
                        onClick={() => setAppealDecisionModal(null)}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t('আদালতের আদেশ স্ট্যাটাস', 'Decision Status')}</label>
                        <select
                          value={appealDecisionModal.status}
                          onChange={(e) => setAppealDecisionModal({ ...appealDecisionModal, status: e.target.value })}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="HEARING_SCHEDULED">{t('শুনানির দিন ধার্য (HEARING_SCHEDULED)', 'Schedule Hearing')}</option>
                          <option value="STAY_ORDER_GRANTED">{t('হস্তান্তর স্থগিতাদেশ জারি - প্লট বিক্রয় লক (STAY_ORDER_GRANTED)', 'Grant Stay Order (Lock Plot)')}</option>
                          <option value="UPHELD">{t('পূর্বের সহকারী কমিশনারের আদেশ বহাল (UPHELD)', 'Upheld Order')}</option>
                          <option value="OVERTURNED">{t('আদেশ বাতিল ও নতুন নামজারি নির্দেশ (OVERTURNED)', 'Overturn Decision')}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t('আদেশের বিবরণ ও নোটিশ', 'Order Decision Notes')}</label>
                        <textarea
                          rows={3}
                          value={appealDecisionModal.note}
                          onChange={(e) => setAppealDecisionModal({ ...appealDecisionModal, note: e.target.value })}
                          required
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                          placeholder="আগামী ২৫ অক্টোবর সকাল ১১টায় শুনানীর দিন ধার্য করা হলো..."
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <button
                        onClick={() => setAppealDecisionModal(null)}
                        className="px-3 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100"
                      >
                        {t('বাতিল', 'Cancel')}
                      </button>
                      <button
                        onClick={handleDecideAppeal}
                        className="px-4 py-2 rounded-lg bg-[#006A4E] text-white text-xs font-bold hover:bg-[#00553e] shadow-xs"
                      >
                        {t('আদেশ কার্যকর করুন', 'Execute Order')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        </div>
      )}

      {/* TAB: Simulated SMS & OTP Outbox Viewer (Prompt v3 Section 5 Boundary Simulator) */}
      {(subTab === 'integrations' || subTab === 'dev_outbox' || (subTab === 'settings' && settingsSubSegment === 'diagnostics')) && (
        <div className="space-y-6 animate-fadeIn">
          {renderPillar5Nav()}
          {user && ['admin','system_admin'].includes(user.role) && <SourceReviewPanel />}
          <div className="panel p-6 space-y-5 animate-rise">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#006A4E]/10 pb-4">
            <div>
              <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1.5">
                <button onClick={() => handleTabChange('overview')} className="hover:text-[#006A4E] transition cursor-pointer">
                  {t('কন্ট্রোল প্যানেল', 'Control Panel')}
                </button>
                <span>/</span>
                <span className="text-[#006A4E] font-extrabold">{t('ইন্টিগ্রেশন ও এসএমএস আউটবক্স', 'Integrations & Outbox')}</span>
              </div>
              <h2 className="font-bold text-lg text-[#074f38] flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#006A4E]" />
                <span>
                  {t(
                    'ইন্টিগ্রেশন, নোটিফিকেশন ও এসএমএস আউটবক্স ভিউয়ার (/admin/dev/outbox)',
                    'Integrations, Notifications & SMS Outbox (/admin/dev/outbox)'
                  )}
                </span>
              </h2>
              <p className="text-xs text-[#5F7A74] mt-1">
                {t(
                  'নন-প্রোডাকশন টেস্ট ও পাইলট পরিবেশে প্রেরিত সকল লেনদেন ওটিপি (OTP), সহকারী কমিশনারের নোটিশ ও কো-ওনার সম্মতি বার্তা এখানে দৃশ্যমান।',
                  'Inspect all real-time OTPs, transfer consents, and co-owner authorization SMS dispatched by the simulated boundary driver.'
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-[#006A4E] border border-[#006A4E]/20">
                ENV: {outboxEnvironment.toUpperCase()}
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await BhumiApi.retryFailedDeliveries();
                    alert(res.message_bn || 'ব্যর্থ ডেলিভারি সফলভাবে পুনরায় প্রসেস করা হয়েছে।');
                    fetchOutbox();
                  } catch (e: any) {
                    alert(e?.message || 'ব্যর্থ ডেলিভারি প্রক্রিয়াকরণে সমস্যা');
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('ব্যর্থ ডেলিভারি পুনঃচেষ্টা', 'Retry Failed Deliveries')}</span>
              </button>
              <button
                onClick={fetchOutbox}
                disabled={outboxLoading}
                className="px-3 py-1.5 rounded-lg bg-[#006A4E] text-white text-xs font-bold hover:bg-[#00553e] flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${outboxLoading ? 'animate-spin' : ''}`} />
                <span>{t('রিফ্রেশ', 'Refresh')}</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-[#EDF7F4] p-3 rounded-xl border border-[#006A4E]/15">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={outboxFilterPhone}
                  onChange={(e) => setOutboxFilterPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchOutbox()}
                  placeholder={t('ফোন নম্বর দিয়ে ফিল্টার করুন (যেমন: 01711...)', 'Filter by recipient phone...')}
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#006A4E]"
                />
              </div>
            </div>
            <button
              onClick={fetchOutbox}
              className="px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('ফিল্টার প্রয়োগ', 'Apply Filter')}</span>
            </button>
            {outboxFilterPhone && (
              <button
                onClick={() => {
                  setOutboxFilterPhone('');
                  setTimeout(fetchOutbox, 50);
                }}
                className="text-xs text-red-600 hover:underline cursor-pointer"
              >
                {t('রিসেট', 'Clear')}
              </button>
            )}
          </div>

          {/* Outbox Table */}
          {outboxLoading && outboxItems.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#006A4E]" />
              <span>{t('আউটবক্স ডাটা লোড হচ্ছে...', 'Loading outbox messages...')}</span>
            </div>
          ) : outboxItems.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <Smartphone className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="font-semibold">{t('কোনো এসএমএস বা ওটিপি বার্তা পাওয়া যায়নি।', 'No SMS or OTP messages found in outbox.')}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {t('পাইলট ডাটাবেজ সীডিং বা নতুন কোনো ট্রান্সফার শুরু করলে এখানে বার্তা জমা হবে।', 'Dispatches from transfers, logins, or world seeding appear here.')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#006A4E]/5 text-[#074f38] border-b border-[#006A4E]/10">
                    <th className="p-3 font-bold">#</th>
                    <th className="p-3 font-bold">{t('প্রাপক ফোন', 'Recipient')}</th>
                    <th className="p-3 font-bold">{t('ওটিপি কোড', 'OTP Code')}</th>
                    <th className="p-3 font-bold">{t('উদ্দেশ্য', 'Purpose')}</th>
                    <th className="p-3 font-bold">{t('বার্তার বিবরণ', 'Message Body')}</th>
                    <th className="p-3 font-bold">{t('স্ট্যাটাস', 'Status')}</th>
                    <th className="p-3 font-bold">{t('সময়', 'Dispatched At')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {outboxItems.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="p-3 font-mono text-[11px] text-slate-400">{item.id}</td>
                      <td className="p-3 font-mono font-semibold text-slate-800">
                        {toBanglaDigits(item.recipient_phone, lang)}
                      </td>
                      <td className="p-3">
                        {item.otp_code ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-extrabold text-sm px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 tracking-wider">
                              {toBanglaDigits(item.otp_code, lang)}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(String(item.otp_code));
                                setOutboxCopiedId(item.id);
                                setTimeout(() => setOutboxCopiedId(null), 1500);
                              }}
                              title="Copy OTP"
                              className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
                            >
                              {outboxCopiedId === item.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {item.purpose || 'NOTIFICATION'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 max-w-[320px] truncate" title={item.message}>
                        {item.message}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3 h-3" />
                          {item.status || 'DELIVERED'}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-500 whitespace-nowrap">
                        {item.created_at ? toBanglaDigits(item.created_at.substring(0, 19).replace('T', ' '), lang) : '—'}
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

      {/* ========================================================================= */}
      {/* SUBTAB: TICKETS & SUPPORT DESK (support_agent, admin, system_admin)      */}
      {/* ========================================================================= */}
      {(subTab === 'tickets' || (subTab === 'settings' && settingsSubSegment === 'tickets')) && (
        <div className="space-y-6 animate-fadeIn">
          {(role === 'admin' || role === 'system_admin') && renderPillar5Nav()}
          {ticketActionNotice && (
            <div
              role="alert"
              className={`p-3.5 rounded-xl text-xs font-bold border flex items-center justify-between ${
                ticketActionNotice.err ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
              }`}
            >
              <span>{ticketActionNotice.msg}</span>
              <button onClick={() => setTicketActionNotice(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
          )}

          <header className="page-intro">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <MessageSquare className="w-6 h-6 text-[#006A4E]" />
                  <span>{t('নাগরিক সহায়তা ও জিআরএস টিকিট ট্রায়াজ (১৬১২২)', 'Citizen Support & GRS Ticket Desk (16122)')}</span>
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  {t(
                    'অনুপস্থিত দলিল পুনরুদ্ধার, জমি সংক্রান্ত জিজ্ঞাসা ও নাগরিক সাপোর্ট টিকেটের ট্রায়াজ ও দ্রুত সমাধান।',
                    'Triage and resolve missing document retrieval requests, inquiries, and citizen support tickets.'
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-300 bg-emerald-50 text-emerald-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#006A4E]" />
                  <span>{t('SLA: ৭২ ঘণ্টায় প্রথম প্রতিক্রিয়া', 'SLA: 72h First Reply')}</span>
                </span>
              </div>
            </div>
          </header>

          {/* Ticket Operational KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="panel p-3.5 border border-[#006A4E]/15 bg-white shadow-xs">
              <div className="text-[10px] font-bold uppercase text-slate-500">{t('মোট টিকিট', 'Total Tickets')}</div>
              <div className="text-xl font-extrabold text-[#0A1F1C] mt-1">{toBanglaDigits(ticketsList.length, lang)}</div>
            </div>
            <div className="panel p-3.5 border border-amber-200 bg-amber-50/50 shadow-xs">
              <div className="text-[10px] font-bold uppercase text-amber-800">{t('নতুন দাখিল', 'New Tickets')}</div>
              <div className="text-xl font-extrabold text-amber-900 mt-1">
                {toBanglaDigits(ticketsList.filter((x) => x.status === 'NEW').length, lang)}
              </div>
            </div>
            <div className="panel p-3.5 border border-blue-200 bg-blue-50/50 shadow-xs">
              <div className="text-[10px] font-bold uppercase text-blue-800">{t('প্রক্রিয়াধীন', 'In Progress')}</div>
              <div className="text-xl font-extrabold text-blue-900 mt-1">
                {toBanglaDigits(ticketsList.filter((x) => x.status === 'IN_PROGRESS').length, lang)}
              </div>
            </div>
            <div className="panel p-3.5 border border-purple-200 bg-purple-50/50 shadow-xs">
              <div className="text-[10px] font-bold uppercase text-purple-800">{t('নাগরিকের অপেক্ষা', 'Waiting Citizen')}</div>
              <div className="text-xl font-extrabold text-purple-900 mt-1">
                {toBanglaDigits(ticketsList.filter((x) => x.status === 'WAITING_CITIZEN').length, lang)}
              </div>
            </div>
            <div className="panel p-3.5 border border-emerald-200 bg-emerald-50/50 shadow-xs">
              <div className="text-[10px] font-bold uppercase text-emerald-800">{t('সমাধানকৃত', 'Resolved')}</div>
              <div className="text-xl font-extrabold text-[#006A4E] mt-1">
                {toBanglaDigits(ticketsList.filter((x) => x.status === 'RESOLVED').length, lang)}
              </div>
            </div>
          </div>

          {/* Main Grid: Ticket List + Conversation Thread */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 5 Cols: Filter + Ticket List */}
            <div className="lg:col-span-5 space-y-3">
              <div className="panel p-3 bg-white border border-slate-200 shadow-xs space-y-2.5">
                <div className="flex flex-wrap gap-1">
                  {(['ALL', 'NEW', 'IN_PROGRESS', 'WAITING_CITIZEN', 'RESOLVED'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTicketFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        ticketFilter === st
                          ? 'bg-[#006A4E] text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st === 'ALL'
                        ? t('সকল', 'All')
                        : st === 'NEW'
                        ? t('নতুন', 'New')
                        : st === 'IN_PROGRESS'
                        ? t('চলমান', 'Active')
                        : st === 'WAITING_CITIZEN'
                        ? t('নাগরিক', 'Citizen')
                        : t('সমাধান', 'Done')}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                    placeholder={t('টিকেট কোড, শিরোনাম বা এনআইডি...', 'Search by code, title, or NID...')}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-xs focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
                {ticketsLoading ? (
                  <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#006A4E]" />
                    <span>{t('টিকেট লোড হচ্ছে...', 'Loading tickets...')}</span>
                  </div>
                ) : ticketsList.filter((tkt) => {
                    if (ticketFilter !== 'ALL' && tkt.status !== ticketFilter) return false;
                    if (ticketSearch.trim()) {
                      const q = ticketSearch.toLowerCase();
                      const matchCode = (tkt.ticket_code || '').toLowerCase().includes(q);
                      const matchTitle = (tkt.title_bn || tkt.title_en || '').toLowerCase().includes(q);
                      const matchNid = (tkt.complainant_nid || '').toLowerCase().includes(q);
                      if (!matchCode && !matchTitle && !matchNid) return false;
                    }
                    return true;
                  }).length === 0 ? (
                  <div className="panel p-8 text-center text-slate-500 text-xs bg-white border border-slate-200">
                    {t('কোনো টিকিট পাওয়া যায়নি।', 'No tickets found matching criteria.')}
                  </div>
                ) : (
                  ticketsList
                    .filter((tkt) => {
                      if (ticketFilter !== 'ALL' && tkt.status !== ticketFilter) return false;
                      if (ticketSearch.trim()) {
                        const q = ticketSearch.toLowerCase();
                        const matchCode = (tkt.ticket_code || '').toLowerCase().includes(q);
                        const matchTitle = (tkt.title_bn || tkt.title_en || '').toLowerCase().includes(q);
                        const matchNid = (tkt.complainant_nid || '').toLowerCase().includes(q);
                        if (!matchCode && !matchTitle && !matchNid) return false;
                      }
                      return true;
                    })
                    .map((tkt) => {
                      const isSelected = selectedTicketCode === (tkt.ticket_code || tkt.id);
                      return (
                        <div
                          key={tkt.id}
                          onClick={() => setSelectedTicketCode(tkt.ticket_code || tkt.id)}
                          className={`panel p-3.5 rounded-xl border transition cursor-pointer text-left space-y-2 ${
                            isSelected
                              ? 'bg-emerald-50/70 border-[#006A4E] shadow-xs'
                              : 'bg-white border-slate-200 hover:border-[#006A4E]/40 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[11px] font-extrabold text-[#006A4E]">
                              {tkt.ticket_code || `#${tkt.id}`}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                tkt.status === 'NEW'
                                  ? 'bg-amber-100 text-amber-800'
                                  : tkt.status === 'IN_PROGRESS'
                                  ? 'bg-blue-100 text-blue-800'
                                  : tkt.status === 'WAITING_CITIZEN'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {tkt.status}
                            </span>
                          </div>
                          <div className="font-bold text-xs text-slate-900 line-clamp-1">
                            {lang === 'bn' ? tkt.title_bn : tkt.title_en || tkt.title_bn}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                            <span className="font-mono">
                              {tkt.dag_no ? `${t('দাগ', 'Plot')} ${toBanglaDigits(tkt.dag_no, lang)}` : tkt.category || 'SUPPORT'}
                            </span>
                            <span>{tkt.created_at ? toBanglaDigits(tkt.created_at.substring(0, 10), lang) : ''}</span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Right 7 Cols: Ticket Details Thread & Reply */}
            <div className="lg:col-span-7 space-y-4">
              {!selectedTicketCode ? (
                <div className="panel p-16 bg-white border border-slate-200 rounded-2xl text-center text-slate-400">
                  <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-sm text-slate-600">{t('বাম পাশের তালিকা থেকে একটি টিকিট নির্বাচন করুন', 'Select a ticket from the left panel')}</p>
                </div>
              ) : ticketDetailLoading && !selectedTicketDetail ? (
                <div className="panel p-16 bg-white border border-slate-200 rounded-2xl text-center text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#006A4E] mb-2" />
                  <p className="text-xs font-bold">{t('টিকেটের বিবরণ লোড হচ্ছে...', 'Loading ticket thread...')}</p>
                </div>
              ) : (
                <div className="panel p-5 bg-white border border-slate-200 rounded-2xl space-y-5 shadow-xs">
                  {/* Selected Ticket Header */}
                  <div className="border-b border-slate-100 pb-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-extrabold px-2.5 py-0.5 rounded-lg bg-emerald-50 text-[#006A4E] border border-emerald-200">
                          {selectedTicketDetail?.ticket?.ticket_code || selectedTicketCode}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {selectedTicketDetail?.ticket?.category || 'SUPPORT'}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                          selectedTicketDetail?.ticket?.status === 'NEW'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : selectedTicketDetail?.ticket?.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : selectedTicketDetail?.ticket?.status === 'WAITING_CITIZEN'
                            ? 'bg-purple-100 text-purple-900 border border-purple-300'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}
                      >
                        {selectedTicketDetail?.ticket?.status || 'OPEN'}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-base text-slate-900">
                      {lang === 'bn' ? selectedTicketDetail?.ticket?.title_bn : selectedTicketDetail?.ticket?.title_en || selectedTicketDetail?.ticket?.title_bn}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1">
                      <div>
                        <span className="text-slate-400">{t('নাগরিক এনআইডি: ', 'Complainant NID: ')}</span>
                        <span className="font-mono font-bold text-slate-800">{selectedTicketDetail?.ticket?.complainant_nid || '—'}</span>
                      </div>
                      {selectedTicketDetail?.plot && (
                        <div>
                          <span className="text-slate-400">{t('দাগ ও মৌজা: ', 'Plot & Mouza: ')}</span>
                          <span className="font-bold text-slate-800">
                            {selectedTicketDetail.plot.dag_no} ({selectedTicketDetail.plot.mouza_bn})
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-400">{t('দাখিলের সময়: ', 'Submitted: ')}</span>
                        <span className="font-mono text-slate-800">
                          {selectedTicketDetail?.ticket?.created_at?.substring(0, 16).replace('T', ' ') || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Conversation & Internal Notes Thread */}
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {(selectedTicketDetail?.messages || []).map((msg: any) => {
                      const isInternal = Boolean(msg.is_internal_note);
                      const isStaff = msg.sender_role && msg.sender_role !== 'citizen';
                      return (
                        <div
                          key={msg.id}
                          className={`p-3.5 rounded-xl text-xs space-y-1.5 transition ${
                            isInternal
                              ? 'bg-amber-50/90 border-2 border-amber-300 text-amber-950 shadow-2xs'
                              : isStaff
                              ? 'bg-emerald-50/80 border border-emerald-200 text-emerald-950 ml-4'
                              : 'bg-slate-50 border border-slate-200 text-slate-800 mr-4'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] border-b pb-1 border-current/10">
                            <div className="flex items-center gap-1.5 font-bold">
                              {isInternal && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-200 text-amber-900 uppercase tracking-wide">
                                  {t('🔒 অভ্যন্তরীণ স্টাফ নোট', '🔒 Internal Staff Note')}
                                </span>
                              )}
                              <span>@{msg.sender_username || 'user'}</span>
                              <span className="font-normal opacity-70">({msg.sender_role || 'staff'})</span>
                            </div>
                            <span className="font-mono text-[10px] opacity-70">
                              {msg.created_at ? toBanglaDigits(msg.created_at.substring(0, 16).replace('T', ' '), lang) : ''}
                            </span>
                          </div>
                          <div className="whitespace-pre-wrap leading-relaxed">
                            {lang === 'bn' ? msg.message_bn || msg.message_en : msg.message_en || msg.message_bn}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reply Form with Internal Note Checkbox */}
                  <form onSubmit={handleSendTicketReply} className="border-t border-slate-100 pt-4 space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {t('প্রত্যুত্তর বা অফিস আদেশ নথিভুক্ত করুন:', 'Enter Response or Officer Note:')}
                      </label>
                      <textarea
                        rows={3}
                        value={ticketReplyMsg}
                        onChange={(e) => setTicketReplyMsg(e.target.value)}
                        placeholder={t('নাগরিকের প্রশ্নের উত্তর অথবা দাপ্তরিক অগ্রগতির বিবরণ লিখুন...', 'Write your reply to the citizen or internal staff note...')}
                        className="w-full p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-[#006A4E]/20 focus:border-[#006A4E] text-xs"
                        required
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-0.5">{t('পরবর্তী স্ট্যাটাস:', 'Update Status:')}</label>
                          <select
                            value={ticketReplyStatus}
                            onChange={(e) => setTicketReplyStatus(e.target.value as any)}
                            className="p-1.5 rounded-lg border border-slate-300 bg-white font-bold text-xs"
                          >
                            <option value="IN_PROGRESS">{t('চলমান (In Progress)', 'In Progress')}</option>
                            <option value="WAITING_CITIZEN">{t('নাগরিকের উত্তর আবশ্যক (Waiting Citizen)', 'Waiting Citizen')}</option>
                            <option value="RESOLVED">{t('নিষ্পন্ন / সমাধানকৃত (Resolved)', 'Resolved')}</option>
                          </select>
                        </div>

                        <label className="flex items-center gap-1.5 cursor-pointer pt-3">
                          <input
                            type="checkbox"
                            checked={ticketIsInternal}
                            onChange={(e) => setTicketIsInternal(e.target.checked)}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="font-bold text-amber-900 text-xs">
                            {t('গোপন অভ্যন্তরীণ নোট (নাগরিক দেখতে পারবে না)', 'Internal Staff Note (Hidden from citizen)')}
                          </span>
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{t('উত্তর প্রেরণ ও আপডেট', 'Send Reply & Update')}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB: CONTENT EDITOR (content_editor, admin, system_admin)              */}
      {/* ========================================================================= */}
      {subTab === 'content_editor' && (
        <div className="space-y-6 animate-rise">
          {contentActionNotice && (
            <div
              role="alert"
              className={`p-3.5 rounded-xl text-xs font-bold border flex items-center justify-between ${
                contentActionNotice.err ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
              }`}
            >
              <span>{contentActionNotice.msg}</span>
              <button onClick={() => setContentActionNotice(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
          )}

          <header className="page-intro">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Newspaper className="w-6 h-6 text-[#006A4E]" />
                  <span>{t('কন্টেন্ট এডিটর ও সচেতনতামূলক নির্দেশিকা ওয়ার্কবেঞ্চ', 'Content Editor & Guidelines Workbench')}</span>
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  {t(
                    'নাগরিক সচেতনতা নির্দেশিকা, আইনি ব্যাখ্যা ও অফিস নোটিশের খসড়া তৈরি এবং পর্যালোচনার জন্য দাখিল।',
                    'Draft public legal explainers, guidance blogs, and official notices for editorial approval.'
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setContentForm({ kind: contentKind, title_bn: '', title_en: '', body_bn: '', body_en: '' });
                    setIsCreateContentOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('নতুন খসড়া লিখুন', 'Draft New Content')}</span>
                </button>
              </div>
            </div>
          </header>

          {/* Sub Navigation Bar for Editor: Kind Switch & Status Filter */}
          <div className="panel p-4 bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">{t('কন্টেন্ট ধরন:', 'Kind:')}</span>
              <div className="flex items-center p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setContentKind('blog')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                    contentKind === 'blog' ? 'bg-[#006A4E] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('সচেতনতামূলক ব্লগ ও নির্দেশিকা', 'Guidance Blog')}
                </button>
                <button
                  type="button"
                  onClick={() => setContentKind('notice')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                    contentKind === 'notice' ? 'bg-[#006A4E] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('অফিসিয়াল নোটিশ ও আদেশ', 'Official Notice')}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {(['ALL', 'DRAFT', 'SUBMITTED', 'PUBLISHED', 'REJECTED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setContentStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    contentStatusFilter === st
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL'
                    ? t('সকল', 'All')
                    : st === 'DRAFT'
                    ? t('খসড়া', 'Draft')
                    : st === 'SUBMITTED'
                    ? t('বিচারাধীন', 'Submitted')
                    : st === 'PUBLISHED'
                    ? t('প্রকাশিত', 'Published')
                    : t('প্রত্যাখ্যাত', 'Rejected')}
                </button>
              ))}
            </div>
          </div>

          {/* Managed Content Table */}
          <div className="panel p-0 bg-white border border-slate-200 overflow-hidden shadow-xs">
            {managedContentLoading ? (
              <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#006A4E]" />
                <span>{t('লোড হচ্ছে...', 'Loading content...')}</span>
              </div>
            ) : managedContent.filter((c) => contentStatusFilter === 'ALL' || c.status === contentStatusFilter).length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                {t('কোনো কন্টেন্ট খসড়া পাওয়া যায়নি। নতুন খসড়া লিখতে উপরের বোতামে ক্লিক করুন।', 'No drafts found. Click Draft New Content to begin.')}
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <th className="p-3 font-bold">#</th>
                    <th className="p-3 font-bold">{t('শিরোনাম (বাংলা / ইংরেজি)', 'Title')}</th>
                    <th className="p-3 font-bold">{t('ধরন', 'Kind')}</th>
                    <th className="p-3 font-bold">{t('স্ট্যাটাস', 'Status')}</th>
                    <th className="p-3 font-bold">{t('তারিখ', 'Date')}</th>
                    <th className="p-3 font-bold text-right">{t('কার্যক্রম', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {managedContent
                    .filter((c) => contentStatusFilter === 'ALL' || c.status === contentStatusFilter)
                    .map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/70 transition">
                        <td className="p-3 font-mono text-[11px] text-slate-400">#{item.id}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{item.title_bn}</div>
                          <div className="text-[11px] text-slate-500 font-normal">{item.title_en}</div>
                        </td>
                        <td className="p-3 font-semibold text-slate-600">
                          {contentKind === 'blog' ? t('ব্লগ / গাইড', 'Blog / Guide') : t('নোটিশ', 'Notice')}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              item.status === 'PUBLISHED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'SUBMITTED'
                                ? 'bg-amber-100 text-amber-800'
                                : item.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">
                          {item.created_at ? toBanglaDigits(item.created_at.substring(0, 10), lang) : '—'}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(item.status === 'DRAFT' || item.status === 'REJECTED') && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setContentForm({
                                      id: item.id,
                                      kind: contentKind,
                                      title_bn: item.title_bn || '',
                                      title_en: item.title_en || '',
                                      body_bn: item.body_bn || '',
                                      body_en: item.body_en || '',
                                    });
                                    setIsCreateContentOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                                >
                                  {t('সম্পাদনা', 'Edit')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTransitionContent(item.id, contentKind, 'SUBMITTED')}
                                  className="px-2.5 py-1 rounded bg-[#006A4E] hover:bg-[#00553e] text-white font-bold transition cursor-pointer flex items-center gap-1"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>{t('দাখিল করুন', 'Submit')}</span>
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedContentPreview(item)}
                              className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition cursor-pointer"
                            >
                              {t('প্রিভিউ', 'Preview')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Modal: Create or Edit Draft */}
          {isCreateContentOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
              <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <FilePlus className="w-5 h-5 text-[#006A4E]" />
                    <span>
                      {contentForm.id
                        ? t('খসড়া কন্টেন্ট সম্পাদনা করুন', 'Edit Draft Content')
                        : t('নতুন নির্দেশিকা বা নোটিশের খসড়া তৈরি', 'Draft New Guidance or Notice')}
                    </span>
                  </h3>
                  <button
                    onClick={() => setIsCreateContentOpen(false)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition text-sm"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveContent} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">{t('শিরোনাম (বাংলায়):', 'Title (Bangla):')} *</label>
                      <input
                        type="text"
                        required
                        value={contentForm.title_bn}
                        onChange={(e) => setContentForm({ ...contentForm, title_bn: e.target.value })}
                        placeholder={t('উদা: ই-নামজারির সহজ ৫টি ধাপ', 'e.g. 5 Simple Steps to e-Mutation')}
                        className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">{t('শিরোনাম (ইংরেজিতে):', 'Title (English):')} *</label>
                      <input
                        type="text"
                        required
                        value={contentForm.title_en}
                        onChange={(e) => setContentForm({ ...contentForm, title_en: e.target.value })}
                        placeholder="e.g. 5 Easy Steps of e-Mutation Process"
                        className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{t('বিস্তারিত বিষয়বস্তু (বাংলায়):', 'Body Content (Bangla):')} *</label>
                    <textarea
                      rows={5}
                      required
                      value={contentForm.body_bn}
                      onChange={(e) => setContentForm({ ...contentForm, body_bn: e.target.value })}
                      placeholder={t('নাগরিকদের জন্য পূর্ণাঙ্গ নির্দেশিকা ও আইনি ধাপসমূহ লিখুন...', 'Enter comprehensive details in Bangla...')}
                      className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{t('বিস্তারিত বিষয়বস্তু (ইংরেজিতে):', 'Body Content (English):')} *</label>
                    <textarea
                      rows={5}
                      required
                      value={contentForm.body_en}
                      onChange={(e) => setContentForm({ ...contentForm, body_en: e.target.value })}
                      placeholder="Enter comprehensive details in English..."
                      className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsCreateContentOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer transition text-xs"
                    >
                      {t('বাতিল', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold cursor-pointer shadow-xs transition text-xs flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>{t('খসড়া সংরক্ষণ করুন', 'Save Draft')}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: Preview Content */}
          {selectedContentPreview && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
              <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-base text-slate-900">{t('কন্টেন্ট প্রিভিউ', 'Content Preview')}</h3>
                  <button onClick={() => setSelectedContentPreview(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 space-y-1">
                    <div className="font-extrabold text-sm text-slate-900">{selectedContentPreview.title_bn}</div>
                    <div className="text-slate-500 font-medium">{selectedContentPreview.title_en}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-slate-700">{t('বাংলা বিবরণ:', 'Bangla Content:')}</div>
                    <p className="whitespace-pre-wrap text-slate-800 leading-relaxed bg-white p-3 rounded-lg border border-slate-100">
                      {selectedContentPreview.body_bn}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-slate-700">{t('ইংরেজি বিবরণ:', 'English Content:')}</div>
                    <p className="whitespace-pre-wrap text-slate-800 leading-relaxed bg-white p-3 rounded-lg border border-slate-100">
                      {selectedContentPreview.body_en}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedContentPreview(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
                  >
                    {t('বন্ধ করুন', 'Close')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB: CONTENT APPROVER & NOTICES (content_approver, admin, system_admin) */}
      {/* ========================================================================= */}
      {(subTab === 'content_approver' || (subTab === 'notices' && role !== 'content_editor')) && (
        <div className="space-y-6 animate-rise">
          {contentActionNotice && (
            <div
              role="alert"
              className={`p-3.5 rounded-xl text-xs font-bold border flex items-center justify-between ${
                contentActionNotice.err ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
              }`}
            >
              <span>{contentActionNotice.msg}</span>
              <button onClick={() => setContentActionNotice(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
          )}

          <header className="page-intro">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-[#006A4E]" />
                  <span>{t('কন্টেন্ট ও নোটিশ প্রকাশনা কর্তৃপক্ষ (চেকার)', 'Content & Notice Approval Authority (Checker)')}</span>
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  {t(
                    'কন্টেন্ট এডিটর কর্তৃক প্রস্তুতকৃত খসড়া পর্যালোচনা, নিরপেক্ষ নিরীক্ষা এবং ডিজিটাল কিউআর সিলসহ গেজেট প্রকাশ।',
                    'Review submitted guidance and notices, enforce separation of duties, and publish officially.'
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-300 bg-emerald-50 text-emerald-900">
                  {t('নিরপেক্ষ নিরীক্ষা সক্রিয় (Maker != Checker)', 'Independent Review Active')}
                </span>
              </div>
            </div>
          </header>

          {/* Sub Navigation Bar for Approver */}
          <div className="panel p-4 bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">{t('কন্টেন্ট ধরন:', 'Kind:')}</span>
              <div className="flex items-center p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setContentKind('blog')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                    contentKind === 'blog' ? 'bg-[#006A4E] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('সচেতনতামূলক ব্লগ ও নির্দেশিকা', 'Guidance Blog')}
                </button>
                <button
                  type="button"
                  onClick={() => setContentKind('notice')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                    contentKind === 'notice' ? 'bg-[#006A4E] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('অফিসিয়াল নোটিশ ও আদেশ', 'Official Notice')}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {(['SUBMITTED', 'PUBLISHED', 'REJECTED', 'ALL'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setContentStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    contentStatusFilter === st
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'SUBMITTED'
                    ? t('বিচারাধীন (Awaiting)', 'Awaiting Approval')
                    : st === 'PUBLISHED'
                    ? t('প্রকাশিত', 'Published')
                    : st === 'REJECTED'
                    ? t('প্রত্যাখ্যাত', 'Rejected')
                    : t('সকল', 'All')}
                </button>
              ))}
            </div>
          </div>

          {/* Reviewable Items Table */}
          <div className="panel p-0 bg-white border border-slate-200 overflow-hidden shadow-xs">
            {managedContentLoading ? (
              <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#006A4E]" />
                <span>{t('লোড হচ্ছে...', 'Loading review queue...')}</span>
              </div>
            ) : managedContent.filter((c) => (contentStatusFilter === 'ALL' ? true : c.status === contentStatusFilter)).length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                {t('বর্তমানে অনুমোদনের জন্য কোনো বিচারাধীন খসড়া নেই।', 'No submitted content awaiting approval.')}
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <th className="p-3 font-bold">#</th>
                    <th className="p-3 font-bold">{t('শিরোনাম (বাংলা / ইংরেজি)', 'Title')}</th>
                    <th className="p-3 font-bold">{t('প্রণয়নকারী', 'Author')}</th>
                    <th className="p-3 font-bold">{t('স্ট্যাটাস', 'Status')}</th>
                    <th className="p-3 font-bold">{t('তারিখ', 'Date')}</th>
                    <th className="p-3 font-bold text-right">{t('অনুমোদন কার্যক্রম', 'Decision')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {managedContent
                    .filter((c) => (contentStatusFilter === 'ALL' ? true : c.status === contentStatusFilter))
                    .map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/70 transition">
                        <td className="p-3 font-mono text-[11px] text-slate-400">#{item.id}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{item.title_bn}</div>
                          <div className="text-[11px] text-slate-500 font-normal">{item.title_en}</div>
                        </td>
                        <td className="p-3 text-slate-700 font-medium">
                          {item.author_name_bn || `User #${item.created_by_user_id || '1'}`}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              item.status === 'PUBLISHED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'SUBMITTED'
                                ? 'bg-amber-100 text-amber-800'
                                : item.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">
                          {item.created_at ? toBanglaDigits(item.created_at.substring(0, 10), lang) : '—'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedContentPreview(item)}
                            className="px-3 py-1.5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold transition cursor-pointer flex items-center gap-1.5 ml-auto text-xs shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{t('পর্যালোচনা ও সিদ্ধান্ত', 'Review & Decide')}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Decision & Inspection Modal */}
          {selectedContentPreview && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
              <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#006A4E]" />
                    <span>{t('খসড়া পর্যালোচনা ও প্রকাশনা সিদ্ধান্ত', 'Content Review & Publication Decision')}</span>
                  </h3>
                  <button onClick={() => setSelectedContentPreview(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                {/* Self-approval Warning if Author is current user */}
                {Number(selectedContentPreview.created_by_user_id) === Number(user?.id) && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      {t(
                        'স্ব-অনুমোদন নীতি লঙ্ঘন: আপনি নিজে এই কন্টেন্টের প্রণয়নকারী হওয়ায় এটি অনুমোদন করতে পারবেন না। অন্য কোনো অ্যাপ্রুভার এটি সিদ্ধান্ত নিবেন।',
                        'Maker cannot check own work. You drafted this item, so another authorized approver must decide.'
                      )}
                    </span>
                  </div>
                )}

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 space-y-1">
                    <div className="font-extrabold text-base text-slate-900">{selectedContentPreview.title_bn}</div>
                    <div className="text-slate-600 font-semibold">{selectedContentPreview.title_en}</div>
                    <div className="text-[11px] text-slate-400 pt-1 font-mono">
                      {t('প্রণয়নকারী: ', 'Author: ')} {selectedContentPreview.author_name_bn || `@user_${selectedContentPreview.created_by_user_id}`} · {selectedContentPreview.status}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="font-bold text-slate-700">{t('বিস্তারিত বাংলা বিবরণ:', 'Bangla Content:')}</div>
                    <p className="whitespace-pre-wrap text-slate-800 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                      {selectedContentPreview.body_bn}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="font-bold text-slate-700">{t('বিস্তারিত ইংরেজি বিবরণ:', 'English Content:')}</div>
                    <p className="whitespace-pre-wrap text-slate-800 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                      {selectedContentPreview.body_en}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedContentPreview(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
                  >
                    {t('বন্ধ করুন', 'Close')}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTransitionContent(selectedContentPreview.id, contentKind, 'REJECTED')}
                      className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      <span>{t('প্রত্যাখ্যান / সংশোধন ফেরত', 'Reject & Remand')}</span>
                    </button>
                    <button
                      type="button"
                      disabled={Number(selectedContentPreview.created_by_user_id) === Number(user?.id)}
                      onClick={() => handleTransitionContent(selectedContentPreview.id, contentKind, 'PUBLISHED')}
                      className="px-5 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center gap-1.5"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{t('অনুমোদন ও গেজেট প্রকাশ', 'Approve & Publish')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB: MARKETPLACE MODERATION (platform_moderator, admin, system_admin) */}
      {/* ========================================================================= */}
      {(subTab === 'marketplace' || subTab === 'marketplace_moderation') && (
        <div className="space-y-6 animate-rise">
          {moderationActionNotice && (
            <div
              role="alert"
              className={`p-3.5 rounded-xl text-xs font-bold border flex items-center justify-between ${
                moderationActionNotice.err ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
              }`}
            >
              <span>{moderationActionNotice.msg}</span>
              <button onClick={() => setModerationActionNotice(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
          )}

          <header className="page-intro">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Megaphone className="w-6 h-6 text-[#006A4E]" />
                  <span>{t('জমি বিক্রয় মার্কেটপ্লেস ও লিস্টিং মডারেশন', 'Land Marketplace & Listing Moderation')}</span>
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  {t(
                    'নাগরিকদের প্রস্তাবিত জমি বিক্রয় তালিকার সত্যতা নিরীক্ষা, প্রতারণামূলক বিজ্ঞাপন আনলিস্ট ও মার্কেটপ্লেস সুরক্ষা।',
                    'Moderate public land sale listings, prevent fraudulent advertisements, and control platform visibility.'
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-300 bg-emerald-50 text-emerald-900">
                  {toBanglaDigits(moderationList.length, lang)} {t('টি তালিকাভুক্ত বিজ্ঞাপন', 'Active Listings')}
                </span>
              </div>
            </div>
          </header>

          {/* Filter Bar */}
          <div className="panel p-3 bg-white border border-slate-200 shadow-xs flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">{t('স্ট্যাটাস ফিল্টার:', 'Status:')}</span>
            {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setModerationFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  moderationFilter === st
                    ? 'bg-[#006A4E] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? t('সকল', 'All') : st === 'ACTIVE' ? t('সক্রিয় (Active)', 'Active') : t('স্থগিত (Suspended)', 'Suspended')}
              </button>
            ))}
          </div>

          {/* Listings Table */}
          <div className="panel p-0 bg-white border border-slate-200 overflow-hidden shadow-xs">
            {moderationLoading ? (
              <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#006A4E]" />
                <span>{t('লিস্টিং লোড হচ্ছে...', 'Loading listings...')}</span>
              </div>
            ) : moderationList.filter((l) => moderationFilter === 'ALL' || l.status === moderationFilter).length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                {t('কোনো বিজ্ঞাপন পাওয়া যায়নি।', 'No listings found.')}
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <th className="p-3 font-bold">#</th>
                    <th className="p-3 font-bold">{t('লিস্টিং কোড', 'Listing Code')}</th>
                    <th className="p-3 font-bold">{t('দাগ নং', 'Plot Dag')}</th>
                    <th className="p-3 font-bold">{t('প্রস্তাবিত মূল্য (টাকা)', 'Asking Price (BDT)')}</th>
                    <th className="p-3 font-bold">{t('বিবরণ', 'Description')}</th>
                    <th className="p-3 font-bold">{t('স্ট্যাটাস', 'Status')}</th>
                    <th className="p-3 font-bold text-right">{t('মডারেশন সিদ্ধান্ত', 'Action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {moderationList
                    .filter((l) => moderationFilter === 'ALL' || l.status === moderationFilter)
                    .map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/70 transition">
                        <td className="p-3 font-mono text-[11px] text-slate-400">{item.id}</td>
                        <td className="p-3 font-mono font-bold text-[#006A4E]">{item.listing_code}</td>
                        <td className="p-3 font-bold text-slate-800">{toBanglaDigits(item.dag_no, lang)}</td>
                        <td className="p-3 font-extrabold text-slate-900">
                          ৳ {toBanglaDigits(Number(item.asking_price_bdt || 0).toLocaleString(), lang)}
                        </td>
                        <td className="p-3 text-slate-600 max-w-[260px] truncate" title={item.description_bn || item.description_en}>
                          {item.description_bn || item.description_en || '—'}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              item.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {item.status === 'ACTIVE' ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(lang === 'bn' ? 'বিজ্ঞাপনটি সাময়িক স্থগিত করতে চান?' : 'Suspend listing?')) {
                                  handleTransitionListing(item.id, 'SUSPENDED');
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold transition cursor-pointer text-xs flex items-center gap-1 ml-auto"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>{t('স্থগিত করুন', 'Suspend')}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleTransitionListing(item.id, 'ACTIVE')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#006A4E] border border-emerald-300 font-bold transition cursor-pointer text-xs flex items-center gap-1 ml-auto"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{t('সক্রিয় করুন', 'Activate')}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUPER ADMIN WORKSPACE: CITIZEN SERVICE APPLICATIONS (TRANSFERS)           */}
      {/* ========================================================================= */}
      {subTab === 'transfers' && (
        <SuperAdminTransfersTab
          transfers={transfersList}
          usersList={usersList}
          officesList={officesList}
          onRefresh={refreshAll}
          onOpenOverride={(type: string, id: string | number, extra?: any) => {
            setOverrideModal({
              isOpen: true,
              actionType: type,
              targetId: id,
              extraContext: extra,
            });
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* SUPER ADMIN WORKSPACE: e-MUTATION & RECORD RECONCILIATION                 */}
      {/* ========================================================================= */}
      {subTab === 'mutations' && (
        <SuperAdminMutationsTab
          mutations={mutationsList}
          onRefresh={refreshAll}
          onOpenOverride={(type: string, id: string | number, extra?: any) => {
            setOverrideModal({
              isOpen: true,
              actionType: type,
              targetId: id,
              extraContext: extra,
            });
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* SUPER ADMIN WORKSPACE: FIELD VERIFICATION & SURVEYOR SLA                  */}
      {/* ========================================================================= */}
      {subTab === 'field_verification' && (
        <SuperAdminFieldVerificationTab
          fieldReports={fieldReportsList}
          slaDispatches={slaDispatchesList}
          onRefresh={refreshAll}
        />
      )}

      {/* ========================================================================= */}
      {/* SUPER ADMIN WORKSPACE: BANK LIENS, RELEASES & NOC                         */}
      {/* ========================================================================= */}
      {subTab === 'bank_liens' && (
        <SuperAdminBankLiensTab
          mortgages={allMortgages}
          onRefresh={refreshAll}
          onOpenOverride={(type: string, id: string | number, extra?: any) => {
            setOverrideModal({
              isOpen: true,
              actionType: type,
              targetId: id,
              extraContext: extra,
            });
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* SUPER ADMIN WORKSPACE: APPEALS & CIVIL COURT DOCUMENTS                    */}
      {/* ========================================================================= */}
      {subTab === 'appeals' && (
        <SuperAdminAppealsTab
          appeals={appealsList}
          disputes={allDisputes}
          onRefresh={refreshAll}
          onOpenOverride={(type: string, id: string | number, extra?: any) => {
            setOverrideModal({
              isOpen: true,
              actionType: type,
              targetId: id,
              extraContext: extra,
            });
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* SUPER ADMIN WORKSPACE: DC LAND ACQUISITION (LA)                           */}
      {/* ========================================================================= */}
      {subTab === 'acquisitions' && (
        <SuperAdminAcquisitionsTab
          acquisitionCases={acquisitionCasesList}
          onRefresh={refreshAll}
          onOpenOverride={(type: string, id: string | number, extra?: any) => {
            setOverrideModal({
              isOpen: true,
              actionType: type,
              targetId: id,
              extraContext: extra,
            });
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MASTER ADMINISTRATIVE OVERRIDE CONSOLE MODAL                             */}
      {/* ========================================================================= */}
      <SuperAdminOverrideModal
        isOpen={overrideModal.isOpen}
        actionType={overrideModal.actionType}
        targetId={overrideModal.targetId}
        extraContext={overrideModal.extraContext}
        onClose={() => setOverrideModal((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={() => {
          refreshAll();
        }}
      />
    </div>
  );
};
