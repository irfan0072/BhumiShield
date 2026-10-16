import React, { useState, useEffect } from 'react';
import { useAppUI, UserRole } from '../i18n';
import { BhumiApi, RiskReportResponse } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { ResultHeroBanner } from '../components/ResultHeroBanner';
import { VelzonOverviewSection } from '../components/VelzonOverviewSection';
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
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { lang, role, setRole, setUser, setToken, t } = useAppUI();
  const [subTab, setSubTab] = useState<
    'rbac' | 'ledger' | 'scenarios' | 'users' | 'settings' | 'audit'
  >('rbac');

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

  // Site Settings state
  const [settingsList, setSettingsList] = useState<any[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [saveMsg, setSaveMsg] = useState('');

  const refreshAll = () => {
    Promise.all([
      BhumiApi.getLedgerState(),
      BhumiApi.getDemoScenarios(),
      BhumiApi.getAuditLogs(),
      BhumiApi.getOcrSample(),
      BhumiApi.listUsers(),
      BhumiApi.getSettings(),
      BhumiApi.getPermissions(),
      BhumiApi.getStatsSummary(),
    ])
      .then(([ldg, scns, logs, ocr, usrs, stgs, perms, st]) => {
        setLedgerState(ldg);
        setScenarios(scns);
        setAuditLogs(logs);
        setOcrSample(ocr);
        setUsersList(usrs);
        setSettingsList(stgs.items || []);
        setSettingsMap(stgs.map || stgs.settings || {});
        setPermissionsData(perms);
        setStats(st);
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const switchToAdminRole = async (targetRole: UserRole = 'admin') => {
    const res = await BhumiApi.switchDemoRole(targetRole);
    if (res?.access_token && res?.user) {
      setToken(res.access_token);
      setUser(res.user);
    } else {
      setRole(targetRole);
    }
    refreshAll();
  };

  const handleTamper = async () => {
    await BhumiApi.tamperDeedDemo('DL-2026-1001', 99.0);
    refreshAll();
  };

  const handleRestore = async () => {
    await BhumiApi.restoreDeedDemo('DL-2026-1001');
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
        <h1>{t('কেন্দ্রীয় গভর্ন্যান্স', 'Central Governance')}</h1>
        <p>{t('RBAC, হ্যাশ লেজার ল্যাব, ইউজার ডিরেক্টরি ও অপরিবর্তনীয় অডিট ট্রেইল।', 'RBAC, hash ledger lab, officers directory, and append-only audit trail.')}</p>
      </header>
      {/* Registry overview */}
      <VelzonOverviewSection
        role="admin"
        stats={stats}
        onQuickAction={() => setSubTab('ledger')}
      />

      {/* Governance Sub-navigation Tabs */}
      <div className="panel p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base md:text-lg text-[#062823]">
            {t(
              'কেন্দ্রীয় গভর্ন্যান্স, RBAC ম্যাট্রিক্স, ইউজার ডিরেক্টরি ও ক্রিপ্টোগ্রাফিক অডিট',
              'Central Governance, RBAC Matrix, Officers Directory & Cryptographic Audit'
            )}
          </h2>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSubTab('rbac')}
            className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
              subTab === 'rbac'
                ? 'bg-[#0D6B5C] text-white'
                : 'bg-[#EDF4F1] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{t('RBAC ম্যাট্রিক্স', 'RBAC Matrix')}</span>
          </button>
          <button
            onClick={() => setSubTab('ledger')}
            className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
              subTab === 'ledger'
                ? 'bg-[#0D6B5C] text-white'
                : 'bg-[#EDF4F1] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{t('হ্যাশ লেজার ল্যাব', 'Hash Ledger Lab')}</span>
          </button>
          <button
            onClick={() => setSubTab('scenarios')}
            className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
              subTab === 'scenarios'
                ? 'bg-[#0D6B5C] text-white'
                : 'bg-[#EDF4F1] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
            }`}
          >
            <FileSearch className="w-3.5 h-3.5" />
            <span>{t('যাচাই কেস ও OCR', 'Case Library & OCR')}</span>
          </button>
          <button
            onClick={() => setSubTab('users')}
            className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
              subTab === 'users'
                ? 'bg-[#0D6B5C] text-white'
                : 'bg-[#EDF4F1] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t('ইউজার ডিরেক্টরি', 'Officers CRUD')}</span>
          </button>
          <button
            onClick={() => setSubTab('settings')}
            className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
              subTab === 'settings'
                ? 'bg-[#0D6B5C] text-white'
                : 'bg-[#EDF4F1] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{t('সিস্টেম পলিসি', 'Policy Settings')}</span>
          </button>
          <button
            onClick={() => setSubTab('audit')}
            className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
              subTab === 'audit'
                ? 'bg-[#0D6B5C] text-white'
                : 'bg-[#EDF4F1] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{t('অডিট লগ', 'Audit Trail')}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: RBAC Middleware Permission Matrix */}
      {subTab === 'rbac' && permissionsData && (
        <div className="panel p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#0D6B5C]/10 pb-4">
            <div>
              <h2 className="font-display text-lg text-[#062823] flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#0D6B5C]" />
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
                      ? 'border-[#0D6B5C] bg-[#E8F5F1]/30'
                      : 'border-[#0D6B5C]/12 bg-[#EDF4F1]/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-extrabold text-[11px] px-2.5 py-0.5 rounded bg-[#062823] text-white">
                        {rKey}
                      </span>
                      {isCurrent && (
                        <span className="text-[11px] font-extrabold text-[#0D6B5C]">
                          ● {t('সক্রিয় সেশন', 'ACTIVE')}
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-base text-[#062823]">
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
                            className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white border border-[#0D6B5C]/12 text-[#0A1F1C]/90"
                          >
                            ✔ {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#0D6B5C]/12 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[#5F7A74]">
                      Panel: {rData.dashboard_tab || rData.dashboard_route || rKey}
                    </span>
                    <button
                      onClick={() => switchToAdminRole(rKey as UserRole)}
                      className="px-3 py-1.5 rounded-lg bg-[#062823] hover:bg-[#0D6B5C] text-white text-xs font-bold cursor-pointer min-h-[32px]"
                    >
                      {t('এই প্যানেলে সুইচ করুন', 'Switch Session')}
                    </button>
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
              <h2 className="font-display text-lg text-[#062823] flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#0D6B5C]" />
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
              <button
                onClick={handleTamper}
                className="btn-danger text-xs flex items-center gap-1.5 cursor-pointer min-h-[38px]"
              >
                <Flame className="w-4 h-4" />
                <span>
                  {t(
                    'DL-2026-1001 আন-অথরাইজড মিউটেশন টেস্ট',
                    'Simulate Storage Tamper (DL-2026-1001)'
                  )}
                </span>
              </button>
              <button
                onClick={handleRestore}
                className="px-4 py-2 rounded-lg bg-[#0D6B5C] hover:bg-[#0A5549] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer min-h-[38px]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>
                  {t('মূল স্বাক্ষরিত তথ্য পুনরুদ্ধার করুন', 'Restore Signed Ledger State')}
                </span>
              </button>
            </div>
          </div>

          {ledgerState && (
            <div
              className={`p-5 rounded-xl border-2 ${
                ledgerState.chain_intact
                  ? 'bg-[#E8F5F1] border-[#0D6B5C]'
                  : 'bg-[#FFF0F1] border-[#FF3B4A]'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="font-extrabold text-base flex items-center gap-2">
                  {ledgerState.chain_intact ? (
                    <CheckCircle2 className="w-6 h-6 text-[#0D6B5C]" />
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
      {subTab === 'scenarios' && (
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
                  className="p-4 rounded-xl bg-[#EDF4F1]/80 border border-[#0D6B5C]/12 flex flex-col justify-between gap-3"
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
                    className="self-start px-3.5 py-1.5 rounded-lg bg-[#062823] hover:bg-[#0D6B5C] text-white text-xs font-bold cursor-pointer min-h-[34px]"
                  >
                    {t('কেস বিশ্লেষণ দেখুন →', 'Inspect Case Report →')}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {activeScenarioReport && <ResultHeroBanner report={activeScenarioReport} />}

          {ocrSample && (
            <div className="panel p-6 space-y-4">
              <div className="flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-[#0D6B5C]" />
                <h2 className="text-lg font-extrabold text-[#0A1F1C]">
                  {t(
                    'পুরাতন স্ক্যানকৃত খতিয়ান ডিজিটাইজেশন সহায়ক (Bangla OCR Assist + মানব যাচাই)',
                    'Legacy Khatian Digitization Assist (Bangla OCR + Officer Review)'
                  )}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(ocrSample.extracted_fields).map(([key, val]: [string, any]) => (
                  <div
                    key={key}
                    className={`p-3 rounded-xl border ${
                      val.low_confidence
                        ? 'bg-amber-50 border-amber-300'
                        : 'bg-[#EDF4F1]/80 border-[#0D6B5C]/12'
                    }`}
                  >
                    <div className="text-[11px] font-bold uppercase text-[#5F7A74]">{key}</div>
                    <input
                      type="text"
                      defaultValue={val.value}
                      className="w-full mt-1 p-2 rounded bg-white border border-[#0D6B5C]/20 text-xs font-bold"
                    />
                    <div className="text-[11px] mt-1 font-semibold">
                      Confidence: {Math.round(val.confidence * 100)}%{' '}
                      {val.low_confidence && t('⚠ মানব যাচাই প্রয়োজন', '⚠ Officer Review Needed')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Users CRUD Management */}
      {subTab === 'users' && (
        <div className="space-y-6">
          <div className="panel p-6 space-y-4">
            <h2 className="font-display text-lg text-[#062823] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#0D6B5C]" />
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
            <h2 className="font-display text-base text-[#062823]">
              {t('সকল নিবন্ধিত কর্মকর্তা ও রোল নিয়ন্ত্রণ ডিরেক্টরি', 'Registered Officers & Role Assignment Directory')}{' '}
              ({toBanglaDigits(usersList.length, lang)})
            </h2>
            <div className="space-y-2.5">
              {usersList.map((u) => (
                <div
                  key={u.id}
                  className="p-4 rounded-xl bg-[#EDF4F1]/80 border border-[#0D6B5C]/12 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-bold text-sm text-[#0A1F1C] flex items-center gap-2">
                      <span>{lang === 'bn' ? u.full_name_bn : u.full_name_en}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#062823] text-white font-bold">
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
                    </div>
                    <div className="text-xs text-[#5F7A74] font-mono mt-1">
                      @{u.username} • NID: {u.nid_mock} • Office: {u.office_name}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeUserRole(u, e.target.value)}
                      className="px-2.5 py-1 rounded border border-[#0D6B5C]/20 bg-white text-xs font-bold min-h-[34px]"
                    >
                      <option value="citizen">citizen</option>
                      <option value="sub_registrar">sub_registrar</option>
                      <option value="ac_land">ac_land</option>
                      <option value="bank_officer">bank_officer</option>
                      <option value="admin">admin</option>
                    </select>
                    <button
                      onClick={() => handleToggleUserStatus(u)}
                      className="px-3 py-1 rounded border border-[#0D6B5C]/20 text-xs font-bold hover:bg-[#E4EFEA] cursor-pointer min-h-[34px]"
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

      {/* TAB 5: Site Settings & Rules Engine Configuration */}
      {subTab === 'settings' && (
        <div className="panel p-6 space-y-5">
          <div>
            <h2 className="font-display text-lg text-[#062823] flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#0D6B5C]" />
              <span>
                {t(
                  'সিস্টেম কনফিগারেশন, RBAC পলিসি ও জালিয়াতি রুল ইঞ্জিন থ্রেশহোল্ড',
                  'System Policy Configuration, RBAC Enforcement & Rules Engine Thresholds'
                )}
              </span>
            </h2>
          </div>

          {saveMsg && (
            <div className="p-4 rounded-xl bg-[#E8F5F1] text-[#0D6B5C] font-bold text-xs">
              {saveMsg}
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {settingsList.map((st) => (
                <div
                  key={st.setting_key || st.key}
                  className="p-4 rounded-xl bg-[#EDF4F1]/80 border border-[#0D6B5C]/12"
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
                    className="w-full p-2 rounded-lg bg-white border border-[#0D6B5C]/20 text-xs font-semibold"
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
            <History className="w-5 h-5 text-[#0D6B5C]" />
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
                className="p-3 rounded-lg bg-[#EDF4F1]/80 border border-[#0D6B5C]/12 flex flex-col md:flex-row md:items-center justify-between gap-2"
              >
                <div>
                  <span className="font-bold text-[#0D6B5C]">[{log.action}]</span>{' '}
                  <span className="text-[#0A1F1C]">{log.actor_role}</span> — {log.target_ref} (
                  {log.detail})
                </div>
                <div className="text-[#5F7A74]/80 truncate max-w-xs">HASH: {log.entry_hash}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
