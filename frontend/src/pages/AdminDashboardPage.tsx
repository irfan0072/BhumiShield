import React, { useEffect, useState } from 'react';
import {
  Shield,
  ShieldAlert,
  RotateCcw,
  ScanText,
  History,
  Play,
  Users,
  Settings,
  UserPlus,
  Trash2,
  CheckCircle2,
  Save,
} from 'lucide-react';
import { apiClient, extractErrorMessage } from '../api/client';
import { useI18n } from '../i18n';
import { getVerdictStyle } from '../theme/tokens';
import { ActiveTab } from '../components/NavbarAndLayout';

interface AdminDashboardPageProps {
  onJumpScenario: (scenario: any, targetTab: ActiveTab) => void;
  onOpenDeedVerify: (deedNo: string) => void;
  onSettingsUpdated?: (newSettings: Record<string, any>) => void;
}

type AdminSection = 'ledger' | 'users' | 'settings' | 'scenarios' | 'audit';

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  onJumpScenario,
  onOpenDeedVerify,
  onSettingsUpdated,
}) => {
  const { lang, t, n } = useI18n();
  const [section, setSection] = useState<AdminSection>('ledger');
  const [ledger, setLedger] = useState<any | null>(null);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [userSearch, setUserSearch] = useState<string>('');
  const [ocrResult, setOcrResult] = useState<any | null>(null);

  // New User Form State
  const [newUsername, setNewUsername] = useState<string>('');
  const [newNameBn, setNewNameBn] = useState<string>('');
  const [newNameEn, setNewNameEn] = useState<string>('');
  const [newRole, setNewRole] = useState<string>('sub_registrar');
  const [newOfficeBn, setNewOfficeBn] = useState<string>('সাব-রেজিস্ট্রি অফিস, সাভার');
  const [newNid, setNewNid] = useState<string>('9900007777');
  const [newPhone, setNewPhone] = useState<string>('01700-007777');
  const [newPassword, setNewPassword] = useState<string>('demo123');

  // Site Settings Form State
  const [settingsForm, setSettingsForm] = useState<Record<string, any>>({
    portal_title_bn: 'ভূমি সুরক্ষা (BhumiShield)',
    portal_title_en: 'BhumiShield — National Land Trust Layer',
    ministry_banner_bn:
      'আইন মন্ত্রণালয় (সাব-রেজিস্ট্রি) ও ভূমি মন্ত্রণালয় (এসি ল্যান্ড)-এর আন্তঃসংযোগ ট্রাস্ট লেয়ার (ডেমো)',
    helpline_number: '১৬১২২ (ভূমি সেবা হটলাইন - ডেমো)',
    office_hours_bn: 'রবিবার – বৃহস্পতিবার, সকাল ৯:০০ – বিকাল ৫:০০',
    rapid_resale_days: 30,
    require_mock_nid_check: true,
    auto_queue_emutation: true,
    public_qr_verification_enabled: true,
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ledRes, scRes, audRes, usrRes, setRes] = await Promise.all([
        apiClient.get('/ledger/verify?limit=15'),
        apiClient.get('/scenarios'),
        apiClient.get('/audit-log'),
        apiClient.get('/admin/users'),
        apiClient.get('/settings'),
      ]);
      setLedger(ledRes.data);
      setScenarios(scRes.data.items || []);
      setAuditLogs(audRes.data.items || []);
      setUsers(usrRes.data.items || []);
      if (setRes.data?.settings) {
        setSettingsForm((prev) => ({ ...prev, ...setRes.data.settings }));
      }
    } catch (err) {
      setError(extractErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleTamperOrRestore = async (deedId: number, mode: 'tamper' | 'restore') => {
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      await apiClient.post(`/ledger/${mode}/${deedId}`, {});
      await loadAll();
      setFeedback(
        mode === 'tamper'
          ? t(
              'ডেমো সিমুলেশন: ডাটাবেজে দলিলের তথ্য পরিবর্তন করা হয়েছে—হ্যাশ চেইন ব্রেক সনাক্ত!',
              'Demo Simulation: Deed content altered in DB — Hash chain break detected!'
            )
          : t(
              'ডেমো সিমুলেশন: মূল স্বাক্ষরিত দলিল পুনরুদ্ধার করা হয়েছে—লেজার পুনরায় বৈধ!',
              'Demo Simulation: Original signed deed restored — Ledger verified!'
            )
      );
    } catch (err) {
      setError(extractErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      await apiClient.post('/admin/users', {
        username: newUsername,
        password: newPassword,
        full_name_bn: newNameBn,
        full_name_en: newNameEn || newNameBn,
        role: newRole,
        office_bn: newOfficeBn,
        office_en: newOfficeBn,
        nid: newNid,
        phone_dummy: newPhone,
      });
      setNewUsername('');
      setNewNameBn('');
      setNewNameEn('');
      setFeedback(t('নতুন ব্যবহারকারী সফলভাবে তৈরি হয়েছে।', 'New user created successfully.'));
      await loadAll();
    } catch (err) {
      setError(extractErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserRoleOrStatus = async (
    uid: number,
    updates: { role?: string; is_active?: number }
  ) => {
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await apiClient.put(`/admin/users/${uid}`, updates);
      setFeedback(t(res.data.message_bn, res.data.message_en));
      await loadAll();
    } catch (err) {
      setError(extractErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (uid: number) => {
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await apiClient.delete(`/admin/users/${uid}`);
      setFeedback(t(res.data.message_bn, res.data.message_en));
      await loadAll();
    } catch (err) {
      setError(extractErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await apiClient.put('/settings', { settings: settingsForm });
      setFeedback(t(res.data.message_bn, res.data.message_en));
      if (onSettingsUpdated && res.data.settings) {
        onSettingsUpdated(res.data.settings);
      }
      await loadAll();
    } catch (err) {
      setError(extractErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  const runOcrDemo = async (presetId: string) => {
    try {
      const res = await apiClient.post('/ocr/khatian-demo', { preset_id: presetId });
      setOcrResult(res.data);
    } catch (err) {
      setError(extractErrorMessage(err, lang));
    }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (userSearch.trim()) {
      const q = userSearch.trim().toLowerCase();
      return (
        u.username.toLowerCase().includes(q) ||
        u.full_name_bn.toLowerCase().includes(q) ||
        u.full_name_en.toLowerCase().includes(q) ||
        u.nid.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Sub-Navigation Tabs for Enterprise Admin Console */}
      <div className="daisy-card p-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSection('ledger')}
          className={`daisy-btn text-xs sm:text-sm ${
            section === 'ledger' ? 'daisy-btn-primary' : 'bg-gray-100 text-[#1A1A1A]'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>{t('১. লেজার ও লাইভ টেম্পার সিমুলেটর', '1. Ledger & Live Tamper Lab')}</span>
        </button>

        <button
          type="button"
          onClick={() => setSection('users')}
          className={`daisy-btn text-xs sm:text-sm ${
            section === 'users' ? 'daisy-btn-primary' : 'bg-gray-100 text-[#1A1A1A]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>
            {t(`২. ইউজার ম্যানেজমেন্ট (${n(users.length)})`, `2. Users Management (${users.length})`)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSection('settings')}
          className={`daisy-btn text-xs sm:text-sm ${
            section === 'settings' ? 'daisy-btn-primary' : 'bg-gray-100 text-[#1A1A1A]'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>{t('৩. সাইট ও রুল ইঞ্জিন সেটিংস', '3. Site & Rules Settings')}</span>
        </button>

        <button
          type="button"
          onClick={() => setSection('scenarios')}
          className={`daisy-btn text-xs sm:text-sm ${
            section === 'scenarios' ? 'daisy-btn-primary' : 'bg-gray-100 text-[#1A1A1A]'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>{t('৪. ৮টি ডেমো সিনারিও ও বাংলা ওসিআর', '4. 8 Scenarios & Bangla OCR')}</span>
        </button>

        <button
          type="button"
          onClick={() => setSection('audit')}
          className={`daisy-btn text-xs sm:text-sm ${
            section === 'audit' ? 'daisy-btn-primary' : 'bg-gray-100 text-[#1A1A1A]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>{t('৫. হ্যাশ-চেইন অডিট লগ', '5. Audit Log')}</span>
        </button>
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-[#E6F2EE] border-2 border-[#006A4E] text-[#006A4E] font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <span>{feedback}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-[#FEECEE] border-2 border-[#F42A41] text-[#C81E32] font-bold">
          ✖ {error}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 1: LEDGER INTEGRITY & LIVE TAMPER SIMULATOR                       */}
      {/* ===================================================================== */}
      {section === 'ledger' && ledger && (
        <section
          className={`rounded-3xl border-2 p-6 shadow-sm hc-card ${
            ledger.is_valid ? 'bg-[#E6F2EE] border-[#006A4E]' : 'bg-[#FEECEE] border-[#F42A41]'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold text-white bg-[#1A1A1A]">
                <Shield className="w-4 h-4" />
                <span>
                  {t(
                    'হ্যাশ-চেইন লেজার ও ডেইলি মার্কেল রুট অডিট (P1 + P5)',
                    'Tamper-Evident Hash-Chain Ledger & Daily Merkle Root Anchor'
                  )}
                </span>
              </div>
              <h1
                className={`text-2xl sm:text-3xl font-bold ${
                  ledger.is_valid ? 'text-[#006A4E]' : 'text-[#C81E32]'
                }`}
              >
                {ledger.is_valid
                  ? `✔ ${t(ledger.message_bn, ledger.message_en)}`
                  : `✖ ${t(ledger.message_bn, ledger.message_en)}`}
              </h1>
              <div className="text-xs font-mono text-[#1A1A1A] break-all space-y-1">
                <div>
                  <strong>Daily Merkle Root (SHA-256):</strong> {ledger.merkle_root}
                </div>
                <div>
                  <strong>Registrar Ed25519 Public Key:</strong> {ledger.public_key_hex}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 shrink-0">
              {ledger.is_valid ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleTamperOrRestore(5, 'tamper')}
                  className="min-h-[52px] px-5 py-3 rounded-xl bg-[#F42A41] text-white font-bold flex items-center gap-2 hover:bg-[#D01F34] cursor-pointer shadow-sm"
                >
                  <ShieldAlert className="w-5 h-5" />
                  <span>
                    {t(
                      'Demo: দলিল #৫ টেম্পার করুন (হ্যাশ চেইন ভাঙুন)',
                      'Demo: Simulate Tampering on Deed #5'
                    )}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleTamperOrRestore(ledger.first_broken_deed_id || 5, 'restore')}
                  className="min-h-[52px] px-5 py-3 rounded-xl bg-[#006A4E] text-white font-bold flex items-center gap-2 hover:bg-[#00563F] cursor-pointer shadow-sm"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>
                    {t(
                      `Demo: দলিল (${ledger.first_broken_deed_no}) পুনরুদ্ধার করে লেজার সবুজ (✔) করুন`,
                      `Demo: Restore ${ledger.first_broken_deed_no} & Heal Hash Chain (✔)`
                    )}
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ledger.chain_sample?.slice(0, 9).map((block: any) => (
              <div
                key={block.id}
                className={`p-4 rounded-2xl border-2 bg-white flex flex-col justify-between gap-2 ${
                  block.is_valid ? 'border-[#006A4E]/40' : 'border-[#F42A41] ring-2 ring-[#F42A41]/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#1A1A1A]">
                      #{n(block.chain_index)} • {block.deed_no}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        block.is_valid ? 'bg-[#E6F2EE] text-[#006A4E]' : 'bg-[#F42A41] text-white'
                      }`}
                    >
                      {block.is_valid ? t('✔ অক্ষুণ্ণ', '✔ Intact') : t('✖ পরিবর্তিত!', '✖ Tampered!')}
                    </span>
                  </div>
                  <div className="text-xs text-[#5F6B66] mt-1">
                    {t('জমি:', 'Area:')} {n(block.area_decimal)} {t('শতাংশ', 'Dec')}
                    {!block.is_valid && (
                      <span className="text-[#C81E32] font-bold ml-1">
                        ({t(`মূল: ${n(block.original_area_decimal)}`, `Orig: ${block.original_area_decimal}`)})
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-[#5F6B66] truncate mt-1">
                    H: {block.recomputed_hash.slice(0, 20)}...
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => onOpenDeedVerify(block.deed_no)}
                    className="text-xs font-bold text-[#006A4E] hover:underline cursor-pointer"
                  >
                    {t('QR ও বিস্তারিত দেখুন →', 'Inspect Deed & QR ->')}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleTamperOrRestore(block.id, block.is_valid ? 'tamper' : 'restore')
                    }
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg cursor-pointer ${
                      block.is_valid ? 'bg-[#FEECEE] text-[#C81E32]' : 'bg-[#E6F2EE] text-[#006A4E]'
                    }`}
                  >
                    {block.is_valid ? t('টেম্পার করুন', 'Tamper') : t('পুনরুদ্ধার করুন', 'Restore')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: USERS MANAGEMENT CRUD                                          */}
      {/* ===================================================================== */}
      {section === 'users' && (
        <div className="space-y-6">
          {/* Create User Card */}
          <section className="daisy-card p-6 space-y-4">
            <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-[#006A4E]" />
              <span>
                {t('নতুন কর্মকর্তা বা নাগরিক অ্যাকাউন্ট তৈরি করুন', 'Create New Officer or Citizen Account')}
              </span>
            </h2>
            <form
              onSubmit={handleCreateUser}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
            >
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder={t('ইউজারনেম (যেমন: acland_gazipur)', 'Username *')}
                className="min-h-[46px] px-3.5 py-2 rounded-xl border border-gray-300 bg-[#FAFBFA] text-sm font-semibold"
              />
              <input
                type="text"
                required
                value={newNameBn}
                onChange={(e) => setNewNameBn(e.target.value)}
                placeholder={t('নাম বাংলায় *', 'Full Name (Bangla) *')}
                className="min-h-[46px] px-3.5 py-2 rounded-xl border border-gray-300 bg-[#FAFBFA] text-sm font-semibold"
              />
              <input
                type="text"
                required
                value={newNameEn}
                onChange={(e) => setNewNameEn(e.target.value)}
                placeholder={t('নাম ইংরেজিতে *', 'Full Name (English) *')}
                className="min-h-[46px] px-3.5 py-2 rounded-xl border border-gray-300 bg-[#FAFBFA] text-sm font-semibold"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="min-h-[46px] px-3.5 py-2 rounded-xl border border-gray-300 bg-[#FAFBFA] text-sm font-semibold"
              >
                <option value="citizen">{t('নাগরিক (citizen)', 'citizen')}</option>
                <option value="sub_registrar">{t('সাব-রেজিস্ট্রার (sub_registrar)', 'sub_registrar')}</option>
                <option value="ac_land">{t('এসি ল্যান্ড (ac_land)', 'ac_land')}</option>
                <option value="bank_officer">{t('ব্যাংক কর্মকর্তা (bank_officer)', 'bank_officer')}</option>
                <option value="admin">{t('অ্যাডমিন (admin)', 'admin')}</option>
              </select>
              <input
                type="text"
                required
                value={newOfficeBn}
                onChange={(e) => setNewOfficeBn(e.target.value)}
                placeholder={t('কার্যালয় / ঠিকানা *', 'Office / Branch *')}
                className="min-h-[46px] px-3.5 py-2 rounded-xl border border-gray-300 bg-[#FAFBFA] text-sm font-semibold"
              />
              <input
                type="text"
                required
                value={newNid}
                onChange={(e) => setNewNid(e.target.value)}
                placeholder={t('ডেমো এনআইডি নম্বর *', 'Mock NID *')}
                className="min-h-[46px] px-3.5 py-2 rounded-xl border border-gray-300 bg-[#FAFBFA] text-sm font-semibold"
              />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('প্রাথমিক পাসওয়ার্ড *', 'Initial Password *')}
                className="min-h-[46px] px-3.5 py-2 rounded-xl border border-gray-300 bg-[#FAFBFA] text-sm font-semibold"
              />
              <button type="submit" disabled={loading} className="daisy-btn daisy-btn-primary text-sm">
                <UserPlus className="w-4 h-4" />
                <span>{t('ব্যবহারকারী যুক্ত করুন', 'Add User')}</span>
              </button>
            </form>
          </section>

          {/* Users Directory Table */}
          <section className="daisy-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-[#1A1A1A]">
                {t('নিবন্ধিত ব্যবহারকারী তালিকা ও রোল গভর্ন্যান্স', 'Registered Users & Role Governance')}
              </h2>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder={t('নাম, ইউজারনেম বা এনআইডি খুঁজুন...', 'Search user or NID...')}
                  className="min-h-[42px] px-3.5 py-1.5 rounded-xl border border-gray-300 bg-[#FAFBFA] text-sm"
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="min-h-[42px] px-3 py-1.5 rounded-xl border border-gray-300 bg-[#FAFBFA] text-sm font-semibold"
                >
                  <option value="">{t('সকল ভূমিকা (All Roles)', 'All Roles')}</option>
                  <option value="citizen">citizen</option>
                  <option value="sub_registrar">sub_registrar</option>
                  <option value="ac_land">ac_land</option>
                  <option value="bank_officer">bank_officer</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="daisy-table text-sm">
                <thead>
                  <tr>
                    <th>{t('ব্যবহারকারী ও ইমেইল', 'User & Email')}</th>
                    <th>{t('পূর্ণ নাম ও এনআইডি', 'Full Name & NID')}</th>
                    <th>{t('কার্যালয়', 'Office')}</th>
                    <th>{t('ভূমিকা পরিবর্তন (Role)', 'Change Role')}</th>
                    <th>{t('স্ট্যাটাস', 'Status')}</th>
                    <th>{t('অ্যাকশন', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="font-bold text-[#006A4E]">{u.username}</div>
                        <div className="text-xs text-[#5F6B66]">{u.email}</div>
                      </td>
                      <td>
                        <div className="font-bold text-[#1A1A1A]">
                          {t(u.full_name_bn, u.full_name_en)}
                        </div>
                        <div className="text-xs text-[#5F6B66]">NID: {n(u.nid)}</div>
                      </td>
                      <td className="text-xs text-[#5F6B66]">{t(u.office_bn, u.office_en)}</td>
                      <td>
                        <select
                          aria-label={`Role for ${u.username}`}
                          value={u.role}
                          onChange={(e) =>
                            handleUpdateUserRoleOrStatus(u.id, { role: e.target.value })
                          }
                          className="min-h-[38px] px-2.5 py-1 rounded-lg border border-gray-300 bg-[#FAFBFA] font-bold text-xs"
                        >
                          <option value="citizen">citizen</option>
                          <option value="sub_registrar">sub_registrar</option>
                          <option value="ac_land">ac_land</option>
                          <option value="bank_officer">bank_officer</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateUserRoleOrStatus(u.id, {
                              is_active: u.is_active === 1 ? 0 : 1,
                            })
                          }
                          className={`daisy-badge cursor-pointer ${
                            u.is_active === 1 ? 'daisy-badge-success' : 'daisy-badge-error'
                          }`}
                        >
                          {u.is_active === 1
                            ? t('✔ সক্রিয় (Active)', '✔ Active')
                            : t('✖ স্থগিত (Suspended)', '✖ Suspended')}
                        </button>
                      </td>
                      <td>
                        {!['admin', 'citizen', 'registrar', 'acland', 'bank'].includes(
                          u.username
                        ) ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-2 rounded-lg text-[#F42A41] hover:bg-[#FEECEE] cursor-pointer"
                            title={t('মুছে ফেলুন', 'Delete User')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-xs text-[#5F6B66]">
                            {t('কোর ডেমো অ্যাকাউন্ট', 'Core Demo')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: SITE SETTINGS & FRAUD RULES ENGINE CONFIGURATION               */}
      {/* ===================================================================== */}
      {section === 'settings' && (
        <section className="daisy-card p-6 sm:p-8 space-y-6">
          <div>
            <span className="daisy-badge daisy-badge-success">
              {t('সিস্টেম কনফিগারেশন', 'System Configuration')}
            </span>
            <h2 className="text-2xl font-bold text-[#1A1A1A] mt-1">
              {t(
                'সাইট সেটিংস ও ফ্রড রুলস ইঞ্জিন প্যারামিটার নিয়ন্ত্রণ',
                'Site Settings & Fraud Rules Engine Parameters'
              )}
            </h2>
            <p className="text-sm text-[#5F6B66]">
              {t(
                'এখান থেকে পোর্টালের শিরোনাম, হেল্পলাইন নম্বর এবং রুল ইঞ্জিনের থ্রেশহোল্ড পরিবর্তন করলে তা তাৎক্ষণিক সমগ্র অ্যাপে কার্যকর হবে।',
                'Changes to portal branding, helpline, and fraud rule thresholds take effect immediately across the platform.'
              )}
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-1">
                {t('পোর্টালের বাংলা শিরোনাম (Portal Title BN)', 'Portal Title (Bangla)')}
              </label>
              <input
                type="text"
                value={settingsForm.portal_title_bn || ''}
                onChange={(e) =>
                  setSettingsForm((s) => ({ ...s, portal_title_bn: e.target.value }))
                }
                className="w-full min-h-[48px] px-4 py-2 rounded-xl border border-gray-300 bg-[#FAFBFA] font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-1">
                {t('পোর্টালের ইংরেজি শিরোনাম (Portal Title EN)', 'Portal Title (English)')}
              </label>
              <input
                type="text"
                value={settingsForm.portal_title_en || ''}
                onChange={(e) =>
                  setSettingsForm((s) => ({ ...s, portal_title_en: e.target.value }))
                }
                className="w-full min-h-[48px] px-4 py-2 rounded-xl border border-gray-300 bg-[#FAFBFA] font-semibold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-[#1A1A1A] mb-1">
                {t('আন্তঃমন্ত্রণালয় শীর্ষ ব্যানার বার্তা', 'Inter-Ministry Header Banner Text')}
              </label>
              <input
                type="text"
                value={settingsForm.ministry_banner_bn || ''}
                onChange={(e) =>
                  setSettingsForm((s) => ({ ...s, ministry_banner_bn: e.target.value }))
                }
                className="w-full min-h-[48px] px-4 py-2 rounded-xl border border-gray-300 bg-[#FAFBFA] font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-1">
                {t('নাগরিক হেল্পলাইন নম্বর (Helpline)', 'Citizen Helpline Number')}
              </label>
              <input
                type="text"
                value={settingsForm.helpline_number || ''}
                onChange={(e) =>
                  setSettingsForm((s) => ({ ...s, helpline_number: e.target.value }))
                }
                className="w-full min-h-[48px] px-4 py-2 rounded-xl border border-gray-300 bg-[#FAFBFA] font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-1">
                {t(
                  'দ্রুত হাতবদল সতর্কতা সময়সীমা (RAPID_RESALE_DAYS)',
                  'Rapid Resale Rule Threshold (Days)'
                )}
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={settingsForm.rapid_resale_days ?? 30}
                onChange={(e) =>
                  setSettingsForm((s) => ({ ...s, rapid_resale_days: Number(e.target.value) }))
                }
                className="w-full min-h-[48px] px-4 py-2 rounded-xl border border-gray-300 bg-[#FAFBFA] font-semibold"
              />
            </div>

            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <label className="p-4 rounded-2xl bg-[#FAFBFA] border border-gray-200 flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settingsForm.require_mock_nid_check)}
                  onChange={(e) =>
                    setSettingsForm((s) => ({ ...s, require_mock_nid_check: e.target.checked }))
                  }
                  className="w-5 h-5 accent-[#006A4E]"
                />
                <span className="text-sm font-bold text-[#1A1A1A]">
                  {t('মক এনআইডি যাচাই সক্রিয়', 'Enforce Mock NID Verification')}
                </span>
              </label>

              <label className="p-4 rounded-2xl bg-[#FAFBFA] border border-gray-200 flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settingsForm.auto_queue_emutation)}
                  onChange={(e) =>
                    setSettingsForm((s) => ({ ...s, auto_queue_emutation: e.target.checked }))
                  }
                  className="w-5 h-5 accent-[#006A4E]"
                />
                <span className="text-sm font-bold text-[#1A1A1A]">
                  {t('স্বয়ংক্রিয় ই-নামজারি কিউ', 'Auto-Queue AC Land e-Mutation')}
                </span>
              </label>

              <label className="p-4 rounded-2xl bg-[#FAFBFA] border border-gray-200 flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settingsForm.public_qr_verification_enabled)}
                  onChange={(e) =>
                    setSettingsForm((s) => ({
                      ...s,
                      public_qr_verification_enabled: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 accent-[#006A4E]"
                />
                <span className="text-sm font-bold text-[#1A1A1A]">
                  {t('লগইন ছাড়া পাবলিক QR যাচাই', 'Public QR Verify Without Login')}
                </span>
              </label>
            </div>

            <div className="md:col-span-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="daisy-btn daisy-btn-primary px-7 text-base"
              >
                <Save className="w-5 h-5" />
                <span>{t('সেটিংস সংরক্ষণ করুন', 'Save Site & Rule Settings')}</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: 8 HACKATHON SCENARIOS & BANGLA KHATIAN OCR                     */}
      {/* ===================================================================== */}
      {section === 'scenarios' && (
        <div className="space-y-6">
          <section className="daisy-card p-6 space-y-4">
            <h2 className="text-2xl font-bold text-[#1A1A1A]">
              {t(
                'হ্যাকাথনের ৮টি প্রাক-নির্মিত ডেমো সিনারিও সুইচার',
                '8 Hackathon Demo Scenarios Switcher (Live Verdicts)'
              )}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scenarios.map((sc) => {
                const st = getVerdictStyle(sc.live_verdict);
                return (
                  <div
                    key={sc.id}
                    className={`p-5 rounded-2xl border-2 ${st.border} ${st.softBg} flex flex-col justify-between gap-3`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-3 py-0.5 rounded-full text-xs font-bold text-white ${st.bg}`}
                        >
                          {t(sc.badge_bn, sc.badge_en)}
                        </span>
                        <span className="text-xs font-mono font-bold text-[#5F6B66]">
                          {sc.code}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg text-[#1A1A1A]">
                        {t(sc.title_bn, sc.title_en)}
                      </h3>
                      <p className="text-sm text-[#1A1A1A]/90 leading-relaxed">
                        {t(sc.description_bn, sc.description_en)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => onJumpScenario(sc, 'registrar')}
                        className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[#006A4E] text-white font-bold text-xs flex items-center gap-1.5 hover:bg-[#00563F] cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{t('সাব-রেজিস্ট্রার উইজার্ডে টেস্ট করুন', 'Test in Sub-Registrar')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onJumpScenario(sc, 'check_buy')}
                        className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-white border border-gray-300 text-[#1A1A1A] font-bold text-xs hover:bg-gray-100 cursor-pointer"
                      >
                        {t('নাগরিক রিপোর্টে দেখুন', 'Citizen Report')}
                      </button>
                      {sc.deed_id && (
                        <button
                          type="button"
                          onClick={() => onOpenDeedVerify(String(sc.deed_id))}
                          className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-white border border-[#006A4E] text-[#006A4E] font-bold text-xs hover:bg-[#E6F2EE] cursor-pointer"
                        >
                          {t('দলিলের QR যাচাই', 'Verify Deed QR')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="daisy-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="daisy-badge daisy-badge-success">
                  {t('P5 স্ট্রেচ ফিচার — বাংলা ওসিআর (Tesseract ben)', 'P5 Stretch Goal — Bangla Khatian OCR')}
                </span>
                <h2 className="text-xl font-bold text-[#1A1A1A] mt-1 flex items-center gap-2">
                  <ScanText className="w-6 h-6 text-[#006A4E]" />
                  <span>
                    {t(
                      'ডামি খতিয়ান স্ক্যান হতে স্বয়ংক্রিয় বাংলা ফিল্ড এক্সট্রাকশন (OCR)',
                      'Automated Bangla Khatian Scan OCR into Structured Fields'
                    )}
                  </span>
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => runOcrDemo('bs_4101')}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#006A4E] text-white font-bold text-xs cursor-pointer"
                >
                  {t('বিএস খতিয়ান ৪১০১ স্ক্যান ওসিআর করুন', 'Run OCR on BS Khatian 4101')}
                </button>
                <button
                  type="button"
                  onClick={() => runOcrDemo('bs_4107_mismatch')}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#B7791F] text-white font-bold text-xs cursor-pointer"
                >
                  {t('বিএস খতিয়ান ৪১০৭ (চেইন ব্রেক) ওসিআর করুন', 'Run OCR on BS Khatian 4107')}
                </button>
              </div>
            </div>

            {ocrResult && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-[#FAFBFA] border border-gray-200">
                  <div className="text-xs font-bold text-[#5F6B66] mb-1">
                    {t('ওসিআর হতে প্রাপ্ত বাংলা টেক্সট:', 'Raw Extracted Bangla OCR Text:')}
                  </div>
                  <pre className="whitespace-pre-wrap text-sm font-sans text-[#1A1A1A] leading-relaxed">
                    {ocrResult.raw_ocr_text_bn}
                  </pre>
                </div>
                <div className="p-4 rounded-2xl bg-[#E6F2EE] border border-[#006A4E]/30 space-y-1 text-sm">
                  <div className="text-xs font-bold text-[#006A4E]">
                    {t('স্ট্রাকচার্ড ডাটাবেজ ফিল্ড (Confidence: ৯৭%):', 'Structured Model Fields (Confidence: 97%):')}
                  </div>
                  <div>
                    <strong>{t('জরিপ ও খতিয়ান:', 'Survey & Khatian:')}</strong>{' '}
                    {ocrResult.extracted_fields.survey_type} #{ocrResult.extracted_fields.khatian_no_bn}
                  </div>
                  <div>
                    <strong>{t('মৌজা ও দাগ:', 'Mouza & Dag:')}</strong>{' '}
                    {ocrResult.extracted_fields.mouza_bn}, দাগ {ocrResult.extracted_fields.dag_no_bn}
                  </div>
                  <div>
                    <strong>{t('মালিক ও অংশ:', 'Owner & Share:')}</strong>{' '}
                    {ocrResult.extracted_fields.owner_name_bn} ({ocrResult.extracted_fields.share_fraction})
                  </div>
                  <div>
                    <strong>{t('জমির পরিমাণ:', 'Area:')}</strong>{' '}
                    {n(ocrResult.extracted_fields.area_decimal)} {t('শতাংশ', 'Decimals')}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: APPEND-ONLY HASH-CHAINED AUDIT LOG                             */}
      {/* ===================================================================== */}
      {section === 'audit' && (
        <section className="daisy-card p-6 space-y-4">
          <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
            <History className="w-6 h-6 text-[#006A4E]" />
            <span>
              {t(
                'অ্যাপেন্ড-অনলি হ্যাশ-চেইন অডিট লগ (Append-Only Audit Log)',
                'Append-Only Hash-Chained Audit Log'
              )}
            </span>
          </h2>
          <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl bg-[#FAFBFA] border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#006A4E]">#{n(log.chain_index)}</span>
                    <span className="px-2 py-0.5 rounded bg-gray-200 font-bold text-[#1A1A1A]">
                      {log.action}
                    </span>
                    <span className="text-[#5F6B66]">
                      {log.actor_username} ({log.actor_role})
                    </span>
                  </div>
                  <div className="text-[#1A1A1A]">
                    {log.details?.note_bn || JSON.stringify(log.details)}
                  </div>
                </div>
                <div className="font-mono text-[11px] text-[#5F6B66] shrink-0">
                  <div>Hash: {log.entry_hash.slice(0, 16)}...</div>
                  <div>Prev: {log.prev_hash.slice(0, 16)}...</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
