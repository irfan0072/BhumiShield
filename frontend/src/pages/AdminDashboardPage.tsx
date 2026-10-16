import React, { useState, useEffect } from 'react';
import { useAppUI, UserRole } from '../i18n';
import { BhumiApi, RiskReportResponse } from '../api/client';
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

  // Users Management state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newNameBn, setNewNameBn] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('sub_registrar');
  const [newNid, setNewNid] = useState('1988123456888');
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
    ])
      .then(([ldg, scns, logs, ocr, usrs, stgs, perms]) => {
        setLedgerState(ldg);
        setScenarios(scns);
        setAuditLogs(logs);
        setOcrSample(ocr);
        setUsersList(usrs);
        setSettingsList(stgs.items || []);
        setSettingsMap(stgs.map || {});
        setPermissionsData(perms);
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
    await BhumiApi.tamperDeedDemo('DEED-2026-0001', 99.0);
    refreshAll();
  };

  const handleRestore = async () => {
    await BhumiApi.restoreDeedDemo('DEED-2026-0001');
    await BhumiApi.restoreDeedDemo('DEED-2026-0005');
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
      nid_mock: newNid,
      phone_mock: '01711000111',
      office_name: newOffice,
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
      office_name: u.office_name,
    });
    refreshAll();
  };

  const handleChangeUserRole = async (u: any, updatedRole: string) => {
    await BhumiApi.updateUser(u.id, {
      role: updatedRole,
      is_active: u.is_active,
      office_name: u.office_name,
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
    setSaveMsg(t('সাইট ও রুল ইঞ্জিন সেটিংস সফলভাবে সংরক্ষিত হয়েছে!', 'Site settings saved!'));
    refreshAll();
    setTimeout(() => setSaveMsg(''), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Sub-navigation Tabs */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-[#E6F2EE] text-[#006A4E]">
            {t('অ্যাডমিন, RBAC মিডলওয়্যার ও সিস্টেম কন্ট্রোল', 'System Admin, RBAC Middleware & Governance')}
          </span>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1A1A1A] mt-1">
            {t(
              'RBAC পারমিশন ম্যাট্রিক্স, ইউজার ম্যানেজমেন্ট, সাইট সেটিংস ও হ্যাশ লেজার',
              'RBAC Permission Matrix, Users CRUD, Site Settings & Hash Ledger'
            )}
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSubTab('rbac')}
            className={`px-3.5 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 cursor-pointer ${
              subTab === 'rbac' ? 'bg-[#006A4E] text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>{t('RBAC মিডলওয়্যার', 'RBAC Matrix')}</span>
          </button>
          <button
            onClick={() => setSubTab('ledger')}
            className={`px-3.5 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 cursor-pointer ${
              subTab === 'ledger' ? 'bg-[#006A4E] text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>{t('হ্যাশ লেজার', 'Hash Ledger')}</span>
          </button>
          <button
            onClick={() => setSubTab('scenarios')}
            className={`px-3.5 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 cursor-pointer ${
              subTab === 'scenarios' ? 'bg-[#006A4E] text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <FileSearch className="w-4 h-4" />
            <span>{t('৮টি ডেমো ও OCR', '8 Demos & OCR')}</span>
          </button>
          <button
            onClick={() => setSubTab('users')}
            className={`px-3.5 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 cursor-pointer ${
              subTab === 'users' ? 'bg-[#006A4E] text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t('ইউজার ম্যানেজমেন্ট', 'Users CRUD')}</span>
          </button>
          <button
            onClick={() => setSubTab('settings')}
            className={`px-3.5 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 cursor-pointer ${
              subTab === 'settings' ? 'bg-[#006A4E] text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>{t('সাইট সেটিংস', 'Site Settings')}</span>
          </button>
          <button
            onClick={() => setSubTab('audit')}
            className={`px-3.5 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 cursor-pointer ${
              subTab === 'audit' ? 'bg-[#006A4E] text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <History className="w-4 h-4" />
            <span>{t('অডিট লগ', 'Audit Log')}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: RBAC Middleware Permission Matrix */}
      {subTab === 'rbac' && permissionsData && (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-[#006A4E] flex items-center gap-2">
                <KeyRound className="w-6 h-6" />
                <span>
                  {t(
                    'রোল-ভিত্তিক মিডলওয়্যার ও কন্ট্রোলিং ম্যাট্রিক্স (RoleMiddleware.php)',
                    'Role-Based Access Control (RBAC) Middleware Matrix'
                  )}
                </span>
              </h2>
              <p className="text-sm text-[#5F6B66]">
                {t(
                  'প্রতিটি রোলের জন্য নির্ধারিত ড্যাশবোর্ড রুট এবং অনুমোদিত কন্ট্রোলিং ক্ষমতা:',
                  'Dedicated dashboards and granular capabilities enforced by Laravel RoleMiddleware:'
                )}
              </p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-[#E6F2EE] text-[#006A4E] font-extrabold text-sm">
              {t('সক্রিয় রোল:', 'Current Active Role:')} {role.toUpperCase()}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(permissionsData.matrix || {}).map(([rKey, rData]: [string, any]) => {
              const isCurrent = rKey === role;
              return (
                <div
                  key={rKey}
                  className={`p-5 rounded-2xl border-2 flex flex-col justify-between ${
                    isCurrent
                      ? 'border-[#006A4E] bg-[#E6F2EE]/40'
                      : 'border-gray-200 bg-[#FAFBFA]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-extrabold text-xs px-2.5 py-1 rounded bg-[#006A4E] text-white">
                        {rKey}
                      </span>
                      {isCurrent && (
                        <span className="text-xs font-extrabold text-[#006A4E]">
                          ● {t('সক্রিয় সেশন', 'ACTIVE SESSION')}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-extrabold text-[#1A1A1A]">
                      {lang === 'bn' ? rData.label_bn : rData.label_en}
                    </h3>
                    <div className="mt-3 space-y-1.5">
                      <div className="text-xs font-bold text-gray-500">
                        {t('অনুমোদিত কন্ট্রোলিং ফিচারসমূহ:', 'Allowed Controlling Capabilities:')}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(rData.capabilities || []).map((cap: string) => (
                          <span
                            key={cap}
                            className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-gray-300 text-gray-800"
                          >
                            ✔ {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-xs font-mono text-gray-500">
                      Tab: {rData.dashboard_route}
                    </span>
                    <button
                      onClick={() => switchToAdminRole(rKey as UserRole)}
                      className="px-3 py-1.5 rounded-lg bg-[#006A4E] text-white text-xs font-extrabold cursor-pointer"
                    >
                      {t('এই রোলে টেস্ট করুন', 'Switch & Test Role')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Live Hash-Chain & Tamper Detection Simulator */}
      {subTab === 'ledger' && (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-[#1A1A1A] flex items-center gap-2">
                <Lock className="w-7 h-7 text-[#006A4E]" />
                <span>
                  {t(
                    'লাইভ হ্যাশ-চেইন লেজার ও টেম্পার সিমুলেটর (Tamper Demo)',
                    'Live Hash-Chain Ledger & Tamper Detection Simulator'
                  )}
                </span>
              </h2>
              <p className="text-[#5F6B66] mt-1">
                {t(
                  'হ্যাকাথন বিচারকদের দেখান: ডাটাবেজে সরাসরি জমির পরিমাণ পরিবর্তন করলে কীভাবে SHA-256 হ্যাশ-চেইন তা সাথে সাথে ধরে ফেলে।',
                  'Show hackathon judges how mutating a deed in the database immediately breaks the SHA-256 hash chain.'
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleTamper}
                className="px-4 py-2.5 rounded-xl bg-[#F42A41] hover:bg-red-700 text-white font-bold flex items-center gap-2 cursor-pointer"
              >
                <Flame className="w-4 h-4" />
                <span>
                  {t(
                    'DEED-2026-0001 জালিয়াতি করুন (Tamper DB)',
                    'Tamper DEED-2026-0001 in DB'
                  )}
                </span>
              </button>
              <button
                onClick={handleRestore}
                className="px-4 py-2.5 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>
                  {t('সব দলিল আসল অবস্থায় ফিরিয়ে আনুন', 'Restore All Deeds to Authentic')}
                </span>
              </button>
            </div>
          </div>

          {ledgerState && (
            <div
              className={`p-5 rounded-2xl border-2 ${
                ledgerState.chain_intact
                  ? 'bg-[#E6F2EE] border-[#006A4E]'
                  : 'bg-[#FEECEE] border-[#F42A41]'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="font-extrabold text-xl flex items-center gap-2">
                  {ledgerState.chain_intact ? (
                    <CheckCircle2 className="w-7 h-7 text-[#006A4E]" />
                  ) : (
                    <XOctagon className="w-7 h-7 text-[#F42A41]" />
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
                <span className="font-mono text-xs bg-white px-3 py-1 rounded-lg border">
                  DAILY_MERKLE_ROOT: {ledgerState.daily_merkle_root?.slice(0, 28)}...
                </span>
              </div>

              {ledgerState.broken_blocks.length > 0 && (
                <div className="mt-4 space-y-2">
                  {ledgerState.broken_blocks.map((b: any) => (
                    <div
                      key={b.deed_no}
                      className="p-3 rounded-xl bg-white border border-[#F42A41] font-mono text-xs"
                    >
                      <div className="font-bold text-[#F42A41]">
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

      {/* TAB 3: 8 Demo Scenarios & OCR Assist */}
      {subTab === 'scenarios' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
            <h2 className="text-xl font-bold text-[#1A1A1A]">
              {t(
                'হ্যাকাথনের ৮টি নির্ধারিত ডেমো সিনারিও (১-ক্লিকে পরীক্ষা করুন)',
                'All 8 Mandatory Hackathon Demo Scenarios (1-Click Runner)'
              )}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scenarios.map((sc) => (
                <div
                  key={sc.code}
                  className="p-4 rounded-xl bg-[#FAFBFA] border border-gray-200 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[#1A1A1A]">
                        #{toBanglaDigits(sc.code, lang)}{' '}
                        {lang === 'bn' ? sc.title_bn : sc.title_en}
                      </span>
                      <span
                        className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                          sc.badge_type === 'SAFE'
                            ? 'bg-[#E6F2EE] text-[#006A4E]'
                            : sc.badge_type === 'WARNING'
                            ? 'bg-[#FEF3C7] text-[#B7791F]'
                            : 'bg-[#FEECEE] text-[#F42A41]'
                        }`}
                      >
                        {sc.badge_type}
                      </span>
                    </div>
                    <p className="text-sm text-[#5F6B66] mt-1">
                      {lang === 'bn' ? sc.description_bn : sc.description_en}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRunScenario(sc.code)}
                    className="self-start px-4 py-2 rounded-lg bg-[#006A4E] text-white text-xs font-bold cursor-pointer"
                  >
                    {t('এই সিনারিও রান করুন →', 'Run Scenario →')}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {activeScenarioReport && <ResultHeroBanner report={activeScenarioReport} />}

          {ocrSample && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
              <div className="flex items-center gap-2">
                <FileSearch className="w-6 h-6 text-[#006A4E]" />
                <h2 className="text-xl font-bold text-[#1A1A1A]">
                  {t(
                    'পুরাতন স্ক্যানকৃত খতিয়ান ডিজিটাইজেশন সহায়ক (OCR Assist + মানব যাচাই)',
                    'Legacy Khatian Digitization Assist (OCR + Human Confirmation)'
                  )}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(ocrSample.extracted_fields).map(([key, val]: [string, any]) => (
                  <div
                    key={key}
                    className={`p-3 rounded-xl border ${
                      val.low_confidence
                        ? 'bg-[#FEF3C7] border-[#B7791F]'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase text-gray-500">{key}</div>
                    <input
                      type="text"
                      defaultValue={val.value}
                      className="w-full mt-1 p-2 rounded bg-white border border-gray-300 font-bold"
                    />
                    <div className="text-xs mt-1 font-semibold">
                      Confidence: {Math.round(val.confidence * 100)}%{' '}
                      {val.low_confidence && t('⚠ মানব যাচাই প্রয়োজন', '⚠ Needs Human Review')}
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
          <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
            <h2 className="text-xl font-bold text-[#006A4E] flex items-center gap-2">
              <UserPlus className="w-6 h-6" />
              <span>
                {t('নতুন কর্মকর্তা / ব্যবহারকারী যুক্ত করুন', 'Create New Officer / System User')}
              </span>
            </h2>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder={t('ইউজারনেম (যেমন: registrar_dhamrai)', 'Username')}
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="p-3 rounded-xl border-2 border-gray-300"
                required
              />
              <input
                type="text"
                placeholder={t('পূর্ণ নাম (বাংলা)', 'Full Name (Bangla)')}
                value={newNameBn}
                onChange={(e) => setNewNameBn(e.target.value)}
                className="p-3 rounded-xl border-2 border-gray-300"
                required
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="p-3 rounded-xl border-2 border-gray-300 bg-white font-bold"
              >
                <option value="citizen">Citizen (নাগরিক)</option>
                <option value="sub_registrar">Sub-Registrar (সাব-রেজিস্ট্রার)</option>
                <option value="ac_land">AC Land (এসি ল্যান্ড)</option>
                <option value="bank_officer">Bank Officer (ব্যাংক কর্মকর্তা)</option>
                <option value="admin">Admin (অ্যাডমিন)</option>
              </select>
              <input
                type="text"
                placeholder={t('মক এনআইডি', 'Mock NID')}
                value={newNid}
                onChange={(e) => setNewNid(e.target.value)}
                className="p-3 rounded-xl border-2 border-gray-300 font-mono"
                required
              />
              <input
                type="text"
                placeholder={t('অফিসের নাম', 'Office Name')}
                value={newOffice}
                onChange={(e) => setNewOffice(e.target.value)}
                className="p-3 rounded-xl border-2 border-gray-300"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-[#006A4E] text-white font-extrabold cursor-pointer"
              >
                + {t('ব্যবহারকারী তৈরি করুন', 'Add User')}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
            <h2 className="text-xl font-bold text-[#1A1A1A]">
              {t('সকল নিবন্ধিত ব্যবহারকারী ও রোল নিয়ন্ত্রণ তালিকা', 'All System Users & Role Assignment Table')} (
              {toBanglaDigits(usersList.length, lang)})
            </h2>
            <div className="space-y-3">
              {usersList.map((u) => (
                <div
                  key={u.id}
                  className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-bold text-lg text-[#1A1A1A] flex items-center gap-2">
                      <span>{lang === 'bn' ? u.full_name_bn : u.full_name_en}</span>
                      <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#E6F2EE] text-[#006A4E] font-bold">
                        {u.role}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          u.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {u.is_active ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 font-mono mt-1">
                      @{u.username} • NID: {u.nid_mock} • Office: {u.office_name}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeUserRole(u, e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-bold min-h-[36px]"
                    >
                      <option value="citizen">citizen</option>
                      <option value="sub_registrar">sub_registrar</option>
                      <option value="ac_land">ac_land</option>
                      <option value="bank_officer">bank_officer</option>
                      <option value="admin">admin</option>
                    </select>
                    <button
                      onClick={() => handleToggleUserStatus(u)}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-bold hover:bg-gray-200 cursor-pointer min-h-[36px]"
                    >
                      {u.is_active
                        ? t('নিষ্ক্রিয় করুন', 'Disable')
                        : t('সক্রিয় করুন', 'Enable')}
                    </button>
                    {u.id > 5 && (
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-2 rounded-lg text-[#F42A41] hover:bg-red-50 cursor-pointer min-h-[36px]"
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
        <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[#006A4E] flex items-center gap-2">
              <Settings className="w-6 h-6" />
              <span>
                {t(
                  'সিস্টেম কনফিগারেশন, RBAC এনফোর্সমেন্ট ও জালিয়াতি রুল ইঞ্জিন সেটিংস',
                  'Site Configuration, RBAC Enforcement & Fraud Rules Engine Thresholds'
                )}
              </span>
            </h2>
            <p className="text-sm text-[#5F6B66]">
              {t(
                'এখান থেকে RBAC মিডলওয়্যার মোড, দ্রুত পুনঃবিক্রয় সতর্কতার দিন সংখ্যা, স্বয়ংক্রিয় হোল্ড এবং সিস্টেম ব্যানার নিয়ন্ত্রণ করুন।',
                'Configure RBAC strict mode, rapid-resale warning days, auto-hold rules, and site banners.'
              )}
            </p>
          </div>

          {saveMsg && (
            <div className="p-4 rounded-xl bg-[#E6F2EE] text-[#006A4E] font-bold">{saveMsg}</div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {settingsList.map((st) => (
                <div key={st.setting_key} className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <label className="block font-bold text-sm text-[#1A1A1A] mb-1">
                    {lang === 'bn' ? st.label_bn : st.label_en}
                  </label>
                  <div className="text-xs font-mono text-gray-500 mb-2">{st.setting_key}</div>
                  <input
                    type="text"
                    value={settingsMap[st.setting_key] ?? st.setting_value}
                    onChange={(e) =>
                      setSettingsMap({ ...settingsMap, [st.setting_key]: e.target.value })
                    }
                    className="w-full p-2.5 rounded-lg bg-white border border-gray-300 font-semibold"
                  />
                </div>
              ))}
            </div>
            <button
              type="submit"
              className="px-8 py-3.5 rounded-xl bg-[#006A4E] text-white font-extrabold cursor-pointer"
            >
              {t('সেটিংস সংরক্ষণ করুন', 'Save Site Settings')}
            </button>
          </form>
        </div>
      )}

      {/* TAB 6: Append-Only Hash-Chained Audit Log */}
      {subTab === 'audit' && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-[#006A4E]" />
            <h2 className="text-xl font-bold text-[#1A1A1A]">
              {t('অপরিবর্তনীয় হ্যাশ-চেইন অডিট লগ (Append-Only Audit Log)', 'Append-Only Hash-Chained Audit Log')}
            </h2>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto font-mono text-xs">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-2"
              >
                <div>
                  <span className="font-bold text-[#006A4E]">[{log.action}]</span>{' '}
                  <span className="text-gray-800">{log.actor_role}</span> — {log.target_ref} (
                  {log.detail})
                </div>
                <div className="text-gray-500 truncate max-w-xs">HASH: {log.entry_hash}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
