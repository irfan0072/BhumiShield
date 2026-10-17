import React, { useState, useEffect } from 'react';
import { useAppUI, UserRole } from '../i18n';
import { BhumiApi, RiskReportResponse, ServiceCatalogueItem, ServiceFeeItem, FeeComponent } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { ResultHeroBanner } from '../components/ResultHeroBanner';
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
  Clock
} from 'lucide-react';

const ROLE_DASHBOARD_MAP: Record<UserRole, string> = {
  citizen: 'home',
  sub_registrar: 'registrar',
  ac_land: 'acland',
  bank_officer: 'bank',
  admin: 'admin',
};

export type AdminTab =
  | 'ledger'
  | 'users'
  | 'audit'
  | 'settings'
  | 'rbac'
  | 'catalogue'
  | 'scenarios'
  | 'direct_access'
  | 'onboarding_appeals';

export const AdminDashboardPage: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { lang, role, setRole, user, setUser, token, setToken, activeSubTab, setActiveSubTab, t } = useAppUI();

  const roleAllowedTabs: Record<string, AdminTab[]> = {
    auditor: ['ledger', 'audit', 'rbac'],
    support_agent: ['users', 'audit'],
    platform_moderator: ['onboarding_appeals', 'catalogue', 'audit'],
    content_editor: ['catalogue', 'settings', 'audit'],
    content_approver: ['settings', 'catalogue', 'audit'],
    system_admin: ['ledger', 'users', 'audit', 'settings', 'rbac', 'catalogue', 'onboarding_appeals', 'scenarios', 'direct_access'],
    admin: ['ledger', 'users', 'audit', 'settings', 'rbac', 'catalogue', 'onboarding_appeals', 'scenarios', 'direct_access'],
  };
  const allowedTabs: AdminTab[] = roleAllowedTabs[role] || [
    'ledger',
    'users',
    'audit',
    'settings',
    'rbac',
    'catalogue',
    'onboarding_appeals',
    'scenarios',
    'direct_access',
  ];

  const [subTab, setSubTab] = useState<AdminTab>(() => {
    if (
      activeSubTab &&
      ['ledger', 'users', 'audit', 'settings', 'rbac', 'catalogue', 'scenarios', 'direct_access', 'onboarding_appeals'].includes(
        activeSubTab
      )
    ) {
      return activeSubTab as AdminTab;
    }
    if (role === 'support_agent') return 'users';
    if (role === 'platform_moderator') return 'onboarding_appeals';
    if (role === 'content_editor') return 'catalogue';
    if (role === 'content_approver') return 'settings';
    if (role === 'auditor') return 'ledger';
    return 'ledger';
  });

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
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [ocrSample, setOcrSample] = useState<any | null>(null);
  const [activeScenarioReport, setActiveScenarioReport] = useState<RiskReportResponse | null>(null);
  const [permissionsData, setPermissionsData] = useState<any | null>(null);
  const [stats, setStats] = useState<any>(null);

  // Users Management state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newNameBn, setNewNameBn] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('sub_registrar');
  const [newNid, setNewNid] = useState('9900008888');
  const [newOffice, setNewOffice] = useState('সাভার সাব-রেজিস্ট্রি অফিস');

  // Service Catalogue & Fees State (Phase 2)
  const [adminServices, setAdminServices] = useState<ServiceCatalogueItem[]>([]);
  const [adminFees, setAdminFees] = useState<ServiceFeeItem[]>([]);
  const [catalogueSubTab, setCatalogueSubTab] = useState<'services' | 'fees'>('services');
  const [selectedFeeHistory, setSelectedFeeHistory] = useState<ServiceFeeItem | null>(null);
  const [editingService, setEditingService] = useState<Partial<ServiceCatalogueItem> | null>(null);
  const [editingFee, setEditingFee] = useState<Partial<ServiceFeeItem> | null>(null);
  const [catalogueNotice, setCatalogueNotice] = useState<{ msg: string; err?: boolean } | null>(null);
  const [adminServiceCatFilter, setAdminServiceCatFilter] = useState<string>('ALL');

  // Site Settings state
  const [settingsList, setSettingsList] = useState<any[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [saveMsg, setSaveMsg] = useState('');
  const [loadError, setLoadError] = useState('');

  const refreshAll = async () => {
    const results = await Promise.allSettled([
      BhumiApi.getLedgerState(),
      import.meta.env.DEV ? BhumiApi.getDemoScenarios() : Promise.resolve([]),
      BhumiApi.getAuditLogs(),
      import.meta.env.DEV ? BhumiApi.getOcrSample() : Promise.resolve(null),
      BhumiApi.listUsers(), BhumiApi.getSettings(), BhumiApi.getPermissions(),
      BhumiApi.getStatsSummary(), BhumiApi.listAdminServices(), BhumiApi.listAdminFees(),
      BhumiApi.listOnboardingBatches().catch(() => ({ items: [] })),
      BhumiApi.listAppeals().catch(() => ({ items: [] })),
    ]);
    const setters: ((value: any) => void)[] = [
      setLedgerState, setScenarios, setAuditLogs, setOcrSample, setUsersList,
      (value) => { setSettingsList(value.items || []); setSettingsMap(value.map || value.settings || {}); },
      setPermissionsData, setStats, (value) => setAdminServices(value?.items || []),
      (value) => setAdminFees(value?.items || []),
      (value) => setOnboardingBatches(value?.items || []),
      (value) => setAppealsList(value?.items || []),
    ];
    results.forEach((result, i) => { if (result.status === 'fulfilled') setters[i](result.value); });
    setLoadError(results.some((result) => result.status === 'rejected')
      ? t('কিছু তথ্য লোড হয়নি। আবার চেষ্টা করুন।', 'Some records could not be loaded. Please retry.') : '');
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (
      activeSubTab &&
      ['ledger', 'users', 'audit', 'settings', 'rbac', 'catalogue', 'scenarios', 'direct_access', 'onboarding_appeals'].includes(
        activeSubTab
      )
    ) {
      setSubTab(activeSubTab as AdminTab);
    }
  }, [activeSubTab]);

  const handleTabChange = (target: AdminTab) => {
    setSubTab(target);
    setActiveSubTab(target);
  };

  const switchToAdminRole = async (targetRole: UserRole = 'admin') => {
    if (!localStorage.getItem('bs_superadmin_mode') && token) {
      localStorage.setItem('bs_admin_original_token', token);
    }
    const res = await BhumiApi.switchDemoRole(targetRole);
    if (res?.access_token && res?.user) {
      localStorage.setItem('bs_superadmin_mode', '1');
      setToken(res.access_token);
      setUser(res.user);
      setRole(targetRole);
      onNavigate?.(ROLE_DASHBOARD_MAP[targetRole] || 'home');
    } else {
      setRole(targetRole);
      onNavigate?.(ROLE_DASHBOARD_MAP[targetRole] || 'home');
    }
    refreshAll();
  };

  const handleTamper = async () => {
    await BhumiApi.tamperDeedDemo('DL-2026-1005', 25.0);
    refreshAll();
  };

  const handleRestore = async () => {
    await BhumiApi.restoreDeedDemo('DL-2026-1005');
    refreshAll();
  };

  const handleRunScenario = async (code: string) => {
    const res = await BhumiApi.runDemoScenario(code);
    setActiveScenarioReport(res.report);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await BhumiApi.createUser({
      username: newUsername,
      password: 'demo123',
      full_name_bn: newNameBn,
      full_name_en: newNameEn || newNameBn,
      role: newRole,
      nid: newNid,
      phone_dummy: '01711-000111',
      office_bn: newOffice,
      office_en: newOffice,
    });
    setNewUsername('');
    setNewNameBn('');
    setNewNameEn('');
    refreshAll();
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
      refreshAll();
    } catch {}
  };

  const handleVerifyCitizen = async (userId: number) => {
    try {
      const res = await BhumiApi.verifyCitizenIdentity(userId);
      setCatalogueNotice({ msg: res.message_bn || 'নাগরিক আইডি সফলভাবে যাচাইকৃত হয়েছে।' });
      refreshAll();
      setTimeout(() => setCatalogueNotice(null), 4000);
    } catch (err: any) {
      setCatalogueNotice({ msg: err?.response?.data?.message_bn || 'আইডি যাচাইকরণে ব্যর্থ হয়েছে।', err: true });
      setTimeout(() => setCatalogueNotice(null), 4000);
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

  return (
    <div className="space-y-6">
      <header className="page-intro animate-rise">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1>
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
                : t('কেন্দ্রীয় গভর্ন্যান্স ও অ্যাডমিন কনসোল', 'Central Governance & Admin Console')}
            </h1>
            <p>
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
                : t('RBAC, হ্যাশ লেজার ল্যাব, ইউজার ডিরেক্টরি ও অপরিবর্তনীয় অডিট ট্রেইল।', 'RBAC, hash ledger lab, officers directory, and append-only audit trail.')}
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-300 bg-emerald-50 text-emerald-900">
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
      </header>
      {loadError && <div role="alert" className="panel p-4 text-red-700">{loadError}<button onClick={refreshAll} className="ml-3 underline">{t('আবার চেষ্টা', 'Retry')}</button></div>}
      {/* Admin Operational KPI Strip (Role-Specific) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-rise">
        <div className="panel p-4 border border-[#006A4E]/15 bg-white shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
              {t('ব্লকচেইন লেজার অখণ্ডতা', 'Ledger Hash Integrity')}
            </div>
            <div className="text-2xl font-extrabold text-[#006A4E] mt-1">
              {toBanglaDigits(stats?.kpis?.ledger_integrity_pct ?? 100, lang)}%
            </div>
            <button
              onClick={() => handleTabChange('ledger')}
              className="text-xs text-[#006A4E] font-semibold hover:underline mt-1 block cursor-pointer"
            >
              {t('হ্যাশ লেজার ল্যাব দেখুন →', 'Inspect Hash Lab →')}
            </button>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#006A4E] flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
        </div>

        <div className="panel p-4 border border-[#006A4E]/15 bg-white shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
              {t('কর্মকর্তা ও ইউজার সংখ্যা', 'Registered Officers')}
            </div>
            <div className="text-2xl font-extrabold text-[#0A1F1C] mt-1">
              {toBanglaDigits(usersList.length || stats?.kpis?.total_users || 0, lang)}
            </div>
            <button
              onClick={() => handleTabChange('users')}
              className="text-xs text-[#006A4E] font-semibold hover:underline mt-1 block cursor-pointer"
            >
              {t('ইউজার ডিরেক্টরি দেখুন →', 'View User Directory →')}
            </button>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#006A4E] flex items-center justify-center">
            <Users className="w-6 h-6" />
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
            <button
              onClick={() => handleTabChange('audit')}
              className="text-xs text-[#006A4E] font-semibold hover:underline mt-1 block cursor-pointer"
            >
              {t('অডিট লগ পর্যালোচনা →', 'Review Audit Logs →')}
            </button>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#006A4E] flex items-center justify-center">
            <History className="w-6 h-6" />
          </div>
        </div>

        <div className="panel p-4 border border-[#006A4E]/15 bg-white shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
              {t('সুপার অ্যাডমিন নজরদারি', 'Role Oversight')}
            </div>
            <div className="text-2xl font-extrabold text-amber-600 mt-1">
              ৫টি {t('রোল উন্মুক্ত', 'Roles')}
            </div>
            <button
              onClick={() => handleTabChange('direct_access')}
              className="text-xs text-amber-700 font-semibold hover:underline mt-1 block cursor-pointer"
            >
              {t('সরাসরি রোল অ্যাক্সেস →', 'Direct Role Access →')}
            </button>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Governance Sub-navigation Tabs */}
      <div className="panel p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-base md:text-lg text-[#074f38]">
            {t(
              'কেন্দ্রীয় গভর্ন্যান্স, RBAC ম্যাট্রিক্স, ইউজার ডিরেক্টরি ও ক্রিপ্টোগ্রাফিক অডিট',
              'Central Governance, RBAC Matrix, Officers Directory & Cryptographic Audit'
            )}
          </h2>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {allowedTabs.includes('ledger') && (
            <button
              onClick={() => handleTabChange('ledger')}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                subTab === 'ledger'
                  ? 'bg-[#006A4E] text-white'
                  : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{t('হ্যাশ লেজার ল্যাব', 'Hash Ledger Lab')}</span>
            </button>
          )}
          {allowedTabs.includes('users') && (
            <button
              onClick={() => handleTabChange('users')}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                subTab === 'users'
                  ? 'bg-[#006A4E] text-white'
                  : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{role === 'support_agent' ? t('নাগরিক ও অফিসার ডিরেক্টরি', 'Citizen & Officer Lookup') : t('ইউজার ডিরেক্টরি', 'Officers CRUD')}</span>
            </button>
          )}
          {allowedTabs.includes('audit') && (
            <button
              onClick={() => handleTabChange('audit')}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                subTab === 'audit'
                  ? 'bg-[#006A4E] text-white'
                  : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>{t('অডিট লগ', 'Audit Trail')}</span>
            </button>
          )}
          {allowedTabs.includes('settings') && (
            <button
              onClick={() => handleTabChange('settings')}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                subTab === 'settings'
                  ? 'bg-[#006A4E] text-white'
                  : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{t('সিস্টেম পলিসি ও নোটিশ', 'Policy Settings')}</span>
            </button>
          )}
          {allowedTabs.includes('rbac') && (
            <button
              onClick={() => handleTabChange('rbac')}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                subTab === 'rbac'
                  ? 'bg-[#006A4E] text-white'
                  : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{t('RBAC ম্যাট্রিক্স', 'RBAC Matrix')}</span>
            </button>
          )}
          {allowedTabs.includes('catalogue') && (
            <button
              onClick={() => handleTabChange('catalogue')}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                subTab === 'catalogue'
                  ? 'bg-[#006A4E] text-white'
                  : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t('সার্ভিস ও ফি ডিরেক্টরি', 'Service & Fees')}</span>
            </button>
          )}
          {allowedTabs.includes('onboarding_appeals') && (
            <button
              onClick={() => handleTabChange('onboarding_appeals')}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                subTab === 'onboarding_appeals'
                  ? 'bg-[#006A4E] text-white shadow-xs'
                  : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t('অনবোর্ডিং ও আপিল', 'Onboarding & Appeals')}</span>
            </button>
          )}
          {import.meta.env.DEV && allowedTabs.includes('scenarios') && (
            <button
              onClick={() => handleTabChange('scenarios')}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                subTab === 'scenarios'
                  ? 'bg-[#006A4E] text-white'
                  : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E2EFE9]'
              }`}
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span>{t('যাচাই কেস ও OCR', 'Case Library & OCR')}</span>
            </button>
          )}
          {allowedTabs.includes('direct_access') && (
            <button
              onClick={() => handleTabChange('direct_access')}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                subTab === 'direct_access'
                  ? 'bg-[#C4891A] text-white shadow-xs'
                  : 'bg-[#FBF3E0] text-[#7A540E] hover:bg-[#F5E6BE]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{t('রোল তত্ত্বাবধান', 'Direct Role Access')}</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: RBAC Middleware Permission Matrix */}
      {subTab === 'rbac' && permissionsData && (
        <div className="panel p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#006A4E]/10 pb-4">
            <div>
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
                    {import.meta.env.DEV && (<button
                      onClick={() => switchToAdminRole(rKey as UserRole)}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer min-h-[32px] shadow-xs"
                      title={t('পাসওয়ার্ড ছাড়া সরাসরি লগইন করুন', 'Direct Login Without Password')}
                    >
                      <KeyRound className="w-3.5 h-3.5 text-slate-950" />
                      <span>{t('পাসওয়ার্ডহীন সরাসরি এক্সেস', 'Direct Login (No Password)')}</span>
                    </button>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Live Hash-Chain & Tamper Detection Lab */}
      {subTab === 'ledger' && (
        <div className="panel p-6 space-y-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
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
                  'ডাটাবেজে সরাসরি জমির পরিমাণ পরিবর্তন করলে কীভাবে SHA-256 হ্যাশ-চেইন তা সাথে সাথে সনাক্ত করে তার পরীক্ষা:',
                  'Verify how mutating a deed record in storage immediately invalidates the SHA-256 hash chain:'
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {import.meta.env.DEV && (<button
                onClick={handleTamper}
                className="btn-danger text-xs flex items-center gap-1.5 cursor-pointer min-h-[38px]"
              >
                <Flame className="w-4 h-4" />
                <span>
                  {t(
                    'DL-2026-1005 আন-অথরাইজড মিউটেশন টেস্ট',
                    'Simulate Storage Tamper (DL-2026-1005)'
                  )}
                </span>
              </button>)}
              {import.meta.env.DEV && (<button
                onClick={handleRestore}
                className="px-4 py-2 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer min-h-[38px]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>
                  {t('মূল স্বাক্ষরিত তথ্য পুনরুদ্ধার করুন', 'Restore Signed Ledger State')}
                </span>
              </button>)}
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

      {/* TAB 3: Verification Case Library & OCR Assist */}
      {import.meta.env.DEV && subTab === 'scenarios' && (
        <div className="space-y-6">
          <div className="panel p-6 space-y-4">
            <h2 className="text-lg font-extrabold text-[#0A1F1C]">
              {t(
                'প্রাক-নিবন্ধন যাচাই কেস লাইব্রেরি (৮টি স্ট্যান্ডার্ড ভেরিফিকেশন কেস)',
                'Pre-Registration Verification Case Library (8 Reference Scenarios)'
              )}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scenarios.map((sc) => (
                <div
                  key={sc.code}
                  className="p-4 rounded-xl bg-[#EDF7F4]/80 border border-[#006A4E]/12 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-[#0A1F1C]">
                        #{toBanglaDigits(sc.code, lang)}{' '}
                        {lang === 'bn' ? sc.title_bn : sc.title_en}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          sc.badge_type === 'SAFE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sc.badge_type === 'WARNING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {sc.badge_type}
                      </span>
                    </div>
                    <p className="text-xs text-[#5F7A74] mt-1">
                      {lang === 'bn' ? sc.description_bn : sc.description_en}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRunScenario(sc.code)}
                    className="self-start px-3.5 py-1.5 rounded-lg bg-[#074f38] hover:bg-[#006A4E] text-white text-xs font-bold cursor-pointer min-h-[34px]"
                  >
                    {t('কেস বিশ্লেষণ দেখুন →', 'Inspect Case Report →')}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {activeScenarioReport && <ResultHeroBanner report={activeScenarioReport} />}

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

              {/* Demo Prototype Disclaimer Banner (F20) */}
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-medium">
                <strong>{t('নমুনা OCR ড্রাফট সহায়ক:', 'DEMO OCR ASSIST COPY:')}</strong>{' '}
                {t(
                  'এটি ঐতিহাসিক হস্তলিখিত খতিয়ানের নমুনা ডিজিটাল ড্রাফট। সকল ফিল্ড ভূমি কর্মকর্তা দ্বারা ম্যানুয়াল নিরীক্ষা সাপেক্ষ।',
                  'This is a demo digital draft from simulated historical khatian scans. All fields require human officer verification before legal acceptance.'
                )}
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

      {/* TAB 4: Users CRUD Management */}
      {subTab === 'users' && (
        <div className="space-y-6">
          <div className="panel p-6 space-y-4">
            <h2 className="font-bold text-lg text-[#074f38] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#006A4E]" />
              <span>
                {t('নতুন কর্মকর্তা / ব্যবহারকারী যুক্ত করুন', 'Add New Officer / System Account')}
              </span>
            </h2>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder={t('ইউজারনেম (যেমন: registrar_dhamrai)', 'Username')}
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="field text-xs"
                required
              />
              <input
                type="text"
                placeholder={t('পূর্ণ নাম (বাংলা)', 'Full Name (Bangla)')}
                value={newNameBn}
                onChange={(e) => setNewNameBn(e.target.value)}
                className="field text-xs"
                required
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="field text-xs font-bold"
              >
                <option value="citizen">Citizen (নাগরিক)</option>
                <option value="sub_registrar">Sub-Registrar (সাব-রেজিস্ট্রার)</option>
                <option value="ac_land">AC Land (এসি ল্যান্ড)</option>
                <option value="bank_officer">Bank Officer (ব্যাংক কর্মকর্তা)</option>
                <option value="admin">Admin (অ্যাডমিন)</option>
              </select>
              <input
                type="text"
                placeholder={t('এনআইডি নম্বর', 'NID Number')}
                value={newNid}
                onChange={(e) => setNewNid(e.target.value)}
                className="field font-mono text-xs"
                required
              />
              <input
                type="text"
                placeholder={t('অফিসের নাম', 'Office Name')}
                value={newOffice}
                onChange={(e) => setNewOffice(e.target.value)}
                className="field text-xs"
              />
              <button
                type="submit"
                className="btn-primary text-xs cursor-pointer min-h-[40px]"
              >
                + {t('ব্যবহারকারী তৈরি করুন', 'Create Officer Account')}
              </button>
            </form>
          </div>

          <div className="panel p-6 space-y-4">
            <h2 className="font-bold text-base text-[#074f38]">
              {t('সকল নিবন্ধিত কর্মকর্তা ও রোল নিয়ন্ত্রণ ডিরেক্টরি', 'Registered Officers & Role Assignment Directory')}{' '}
              ({toBanglaDigits(usersList.length, lang)})
            </h2>
            <div className="space-y-2.5">
              {usersList.map((u) => (
                <div
                  key={u.id}
                  className="p-4 rounded-xl bg-[#EDF7F4]/80 border border-[#006A4E]/12 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-bold text-sm text-[#0A1F1C] flex items-center gap-2">
                      <span>{lang === 'bn' ? u.full_name_bn : u.full_name_en}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#074f38] text-white font-bold">
                        {u.role}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${
                          u.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {u.is_active ? 'ACTIVE' : 'DISABLED'}
                      </span>
                      {u.role === 'citizen' && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${
                            Number(u.is_identity_verified) === 1
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {Number(u.is_identity_verified) === 1
                            ? t('আইডি যাচাইকৃত', 'ID Verified')
                            : t('আইডি যাচাই পেন্ডিং', 'ID Pending')}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#5F7A74] font-mono mt-1">
                      @{u.username} • NID: {u.nid_mock} • Office: {u.office_name}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {u.role === 'citizen' && Number(u.is_identity_verified) !== 1 && (
                      <button
                        onClick={() => handleVerifyCitizen(u.id)}
                        className="px-2.5 py-1 rounded bg-[#006A4E] text-white text-xs font-bold hover:bg-[#00553e] cursor-pointer min-h-[34px] flex items-center gap-1 shadow-2xs"
                        title={t('নাগরিকের জাতীয় পরিচয়পত্র যাচাই ও স্বত্ব সক্রিয়করণ', 'Verify Citizen NID and activate vault')}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{t('আইডি যাচাই করুন', 'Verify Citizen')}</span>
                      </button>
                    )}
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeUserRole(u, e.target.value)}
                      className="px-2.5 py-1 rounded border border-[#006A4E]/20 bg-white text-xs font-bold min-h-[34px]"
                    >
                      <option value="citizen">citizen</option>
                      <option value="sub_registrar">sub_registrar</option>
                      <option value="ac_land">ac_land</option>
                      <option value="bank_officer">bank_officer</option>
                      <option value="admin">admin</option>
                    </select>
                    <button
                      onClick={() => handleToggleUserStatus(u)}
                      className="px-3 py-1 rounded border border-[#006A4E]/20 text-xs font-bold hover:bg-[#E2EFE9] cursor-pointer min-h-[34px]"
                    >
                      {u.is_active
                        ? t('নিষ্ক্রিয় করুন', 'Disable')
                        : t('সক্রিয় করুন', 'Enable')}
                    </button>
                    {u.id > 5 && (
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 rounded text-[#FF3B4A] hover:bg-rose-50 cursor-pointer min-h-[34px]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4.5: Service Catalogue & Fee Registry (Phase 2) */}
      {subTab === 'catalogue' && (
        <div className="space-y-6">
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
                                {t('(আনুমানিক প্রাক্কলন)', '(demo estimate)')}
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
      {subTab === 'audit' && (
        <div className="panel p-6 space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#006A4E]" />
            <h2 className="text-lg font-extrabold text-[#0A1F1C]">
              {t(
                'অপরিবর্তনীয় হ্যাশ-চেইন অডিট লগ (Append-Only Cryptographic Audit Trail)',
                'Append-Only Hash-Chained Audit Trail'
              )}
            </h2>
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
      )}

      {/* TAB 8: Super Admin Direct Role Access & Oversight */}
      {subTab === 'direct_access' && (
        <div className="panel p-6 space-y-6">
          <div className="border-b border-[#006A4E]/10 pb-4">
            <h2 className="font-bold text-lg text-[#074f38] flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <span>
                {t(
                  'সুপার অ্যাডমিন সরাসরি রোল নজরদারি ও পাসওয়ার্ডহীন প্রবেশাধিকার',
                  'Super Admin Direct Role Inspection & Passwordless Access'
                )}
              </span>
            </h2>
            <p className="text-xs text-[#5F7A74] mt-0.5">
              {t(
                'সুপার অ্যাডমিন হিসেবে আপনি যেকোনো দাপ্তরিক বা নাগরিক ড্যাশবোর্ডে পাসওয়ার্ড ছাড়াই সরাসরি প্রবেশ করে নিরীক্ষা সম্পন্ন করতে পারবেন:',
                'As Super Admin, directly inspect any government agency or citizen portal dashboard without passwords:'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                r: 'sub_registrar' as UserRole,
                title: t('সাব-রেজিস্ট্রার কনসোল', 'Sub-Registrar Console'),
                dept: t('নিবন্ধন অধিদপ্তর • আইন মন্ত্রণালয়', 'Directorate of Registration • Law Ministry'),
                icon: <FileSpreadsheet className="w-6 h-6 text-[#006A4E]" />,
                iconBg: 'bg-emerald-50',
                desc: t('দলিল প্রাক-যাচাই, ১১টি জালিয়াতি রুলস গেটকিপার, HELD কিউ ও রেজিস্ট্রি অডিট।', 'Pre-reg gatekeeper, 11 fraud rules, held queue & registry audit.'),
              },
              {
                r: 'ac_land' as UserRole,
                title: t('এসি ল্যান্ড কনসোল', 'AC Land Console'),
                dept: t('উপজেলা ভূমি অফিস • ভূমি মন্ত্রণালয়', 'Upazila Land Office • Ministry of Land'),
                icon: <Landmark className="w-6 h-6 text-[#006A4E]" />,
                iconBg: 'bg-emerald-50',
                desc: t('ই-মিউটেশন অনুমোদন, খতিয়ান চেইন সমন্বয়, ওয়ারিশ হিস্যা ও বিরোধ ট্রাইব্যুনাল।', 'e-Mutation approval, khatian reconciliation & dispute tribunal.'),
              },
              {
                r: 'bank_officer' as UserRole,
                title: t('ব্যাংক মর্টগেজ কনসোল', 'Bank Mortgage Console'),
                dept: t('তফসিলি ব্যাংক জামানত ও লিয়েন বিভাগ', 'Scheduled Commercial Bank Collateral'),
                icon: <Building2 className="w-6 h-6 text-[#006A4E]" />,
                iconBg: 'bg-emerald-50',
                desc: t('জামানত যাচাই, দ্বৈত বন্ধক প্রতিরোধে প্লট লক এবং ডিজিটাল NOC সনদ ইস্যু।', 'Collateral check, double-mortgage plot lock & digital NOC release.'),
              },
              {
                r: 'citizen' as UserRole,
                title: t('নাগরিক ভূমি পোর্টাল', 'Citizen Land Portal'),
                dept: t('নাগরিক সেবা ও ভূমি সুরক্ষা ভল্ট', 'Public Consumer Property Vault'),
                icon: <ShieldCheck className="w-6 h-6 text-[#006A4E]" />,
                iconBg: 'bg-emerald-50',
                desc: t('মালিকানা যাচাই, বায়োমেট্রিক বিক্রয় লক ও নাগরিক আপত্তি দাখিল।', 'Property vault, biometric sale locks & objection filings.'),
              },
            ].map((card) => (
              <div key={card.r} className="p-5 rounded-xl border border-[#006A4E]/15 bg-white flex flex-col justify-between shadow-xs hover:shadow-md transition">
                <div>
                  <div className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center mb-3`}>
                    {card.icon}
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">{card.title}</h3>
                  <div className="text-[11px] font-medium text-emerald-800 mt-0.5">{card.dept}</div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{card.desc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => switchToAdminRole(card.r)}
                    className="w-full py-2 px-3 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <span>{t('সরাসরি লগইন করুন →', 'Direct Login →')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 9: Maker-Checker Staging Onboarding & Appellate Review Mirror (Tier C Sections 8.7 & 8.8) */}
      {subTab === 'onboarding_appeals' && (
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
      )}
    </div>
  );
};
