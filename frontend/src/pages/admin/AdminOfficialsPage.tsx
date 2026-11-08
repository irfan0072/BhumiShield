import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, BadgeCheck, Building2, Eye, KeyRound, MoreHorizontal, UserCheck, UserPlus, Users } from 'lucide-react';
import { useAppUI, UserRole } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { toBanglaDigits, maskNid, maskPhone } from '@/theme/tokens';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateOfficialDialog } from '@/components/admin/CreateOfficialDialog';
import {
  AdminPage,
  ConfirmDialog,
  DataTable,
  DetailList,
  DetailSheet,
  EmptyRow,
  Field,
  FormDialog,
  LoadingRows,
  PageToolbar,
  Section,
  StatCard,
  StatGrid,
  StatusBadge,
  inputCls,
  notify,
  useCreateIntent,
} from '@/components/admin/kit';

const OFFICIAL_ROLES = [
  'admin',
  'system_admin',
  'sub_registrar',
  'joint_sub_registrar',
  'district_registrar',
  'registry_data_officer',
  'ac_land',
  'land_office_assistant',
  'field_verification_officer',
  'settlement_records_officer',
  'settlement_checker',
  'settlement_officer',
  'kanungo',
  'uno',
  'uno_supervisor',
  'adc_revenue',
  'appellate_reviewer',
  'divisional_commissioner',
  'dlrs_officer',
  'land_appeal_board',
  'land_reform_board',
  'bank_officer',
  'bank_manager',
  'lawyer_court_user',
  'dc_acquisition_officer',
  'auditor',
  'system_auditor',
  'support_agent',
  'platform_moderator',
  'content_editor',
  'content_approver',
];

const ROLE_LABELS: Record<string, [string, string]> = {
  admin: ['সিস্টেম অ্যাডমিন', 'System admin'],
  system_admin: ['আইটি অ্যাডমিন', 'IT admin'],
  sub_registrar: ['সাব-রেজিস্ট্রার', 'Sub-Registrar'],
  joint_sub_registrar: ['যুগ্ম সাব-রেজিস্ট্রার', 'Joint Sub-Registrar'],
  district_registrar: ['জেলা রেজিস্ট্রার', 'District Registrar'],
  registry_data_officer: ['দলিল রেকর্ড কিপার', 'Deed record keeper'],
  ac_land: ['এসি ল্যান্ড', 'AC Land'],
  land_office_assistant: ['ভূমি সহকারী', 'Land office assistant'],
  field_verification_officer: ['সার্ভেয়ার', 'Surveyor'],
  settlement_records_officer: ['সেটেলমেন্ট রেকর্ডস অফিসার', 'Settlement records officer'],
  settlement_checker: ['সহকারী সেটেলমেন্ট অফিসার', 'Settlement checker'],
  settlement_officer: ['সেটেলমেন্ট অফিসার', 'Settlement officer'],
  kanungo: ['কানুনগো', 'Kanungo'],
  uno: ['ইউএনও', 'UNO'],
  uno_supervisor: ['ইউএনও', 'UNO'],
  adc_revenue: ['এডিসি রাজস্ব', 'ADC Revenue'],
  appellate_reviewer: ['এডিসি রাজস্ব আপিল', 'ADC appeals'],
  divisional_commissioner: ['বিভাগীয় কমিশনার', 'Divisional Commissioner'],
  dlrs_officer: ['ডিএলআরএস কর্মকর্তা', 'DLRS officer'],
  land_appeal_board: ['ভূমি আপিল বোর্ড', 'Land Appeal Board'],
  land_reform_board: ['ভূমি সংস্কার বোর্ড', 'Land Reform Board'],
  bank_officer: ['ব্যাংক কর্মকর্তা', 'Bank officer'],
  bank_manager: ['ব্যাংক ম্যানেজার', 'Bank manager'],
  lawyer_court_user: ['আইনজীবী', 'Advocate'],
  dc_acquisition_officer: ['অধিগ্রহণ কর্মকর্তা', 'Acquisition officer'],
  auditor: ['অডিটর', 'Auditor'],
  system_auditor: ['সিস্টেম অডিটর', 'System auditor'],
  support_agent: ['হেল্পলাইন কর্মকর্তা', 'Helpline agent'],
  platform_moderator: ['মডারেটর', 'Moderator'],
  content_editor: ['কনটেন্ট সম্পাদক', 'Content editor'],
  content_approver: ['কনটেন্ট অনুমোদক', 'Content approver'],
  forest_officer: ['বন কর্মকর্তা', 'Forest officer'],
  waqf_administrator: ['ওয়াকফ প্রশাসক', 'Waqf administrator'],
  karbari: ['কারবারি', 'Karbari'],
};

/** Office types the backend accepts for each role on transfer (mirrors SystemAdminController::transferOfficer). */
const ROLE_OFFICE_TYPES: Record<string, string[]> = {
  sub_registrar: ['registry', 'sub_registry'],
  registry_data_officer: ['registry', 'sub_registry'],
  ac_land: ['ac_land'],
  land_office_assistant: ['ac_land'],
  field_verification_officer: ['ac_land'],
  settlement_records_officer: ['settlement'],
  settlement_checker: ['settlement'],
  bank_officer: ['bank_branch', 'bank'],
  bank_manager: ['bank_branch', 'bank'],
};

export const getOfficerTargetTab = (role: string): string => {
  switch (role) {
    case 'sub_registrar':
    case 'joint_sub_registrar':
    case 'district_registrar':
    case 'registry_data_officer':
      return 'registrar';

    case 'ac_land':
    case 'land_office_assistant':
    case 'field_verification_officer':
    case 'settlement_records_officer':
    case 'settlement_checker':
    case 'settlement_officer':
    case 'kanungo':
    case 'uno':
    case 'uno_supervisor':
    case 'adc_revenue':
    case 'appellate_reviewer':
    case 'divisional_commissioner':
    case 'dlrs_officer':
    case 'land_appeal_board':
    case 'land_reform_board':
      return 'acland';

    case 'bank_officer':
    case 'bank_manager':
      return 'bank';

    case 'lawyer_court_user':
      return 'lawyer_case';

    case 'dc_acquisition_officer':
      return 'specialist';

    case 'admin':
    case 'system_admin':
    case 'auditor':
    case 'system_auditor':
    case 'support_agent':
    case 'platform_moderator':
    case 'content_editor':
    case 'content_approver':
      return 'admin';

    default:
      return 'acland';
  }
};

const displayName = (u: any) => u.full_name_bn || u.name_bn || u.name || u.full_name_en || u.username;
const officeOf = (u: any) => u.office_name || u.office_bn || u.office_en || '';
const isActive = (u: any) => u.is_active === undefined || Number(u.is_active) === 1;
const isVerified = (u: any) => Number(u.is_identity_verified) === 1 || u.nid_verified === true;

const formatDate = (iso: string | null | undefined, lang: 'bn' | 'en') => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const AdminOfficialsPage: React.FC = () => {
  const { lang, t, setRole, setUser, setToken } = useAppUI();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [loginTarget, setLoginTarget] = useState<any | null>(null);

  // Transfer
  const [transferTarget, setTransferTarget] = useState<any | null>(null);
  const [offices, setOffices] = useState<any[]>([]);
  const [officesLoaded, setOfficesLoaded] = useState(false);
  const [newOfficeId, setNewOfficeId] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [transferring, setTransferring] = useState(false);

  const n = (v: number) => toBanglaDigits(v, lang);
  const roleLabel = (r: string) => {
    const hit = ROLE_LABELS[r];
    if (hit) return lang === 'bn' ? hit[0] : hit[1];
    return String(r || '').replace(/_/g, ' ');
  };

  useCreateIntent(() => setCreateOpen(true));

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res: any = await BhumiApi.listUsers();
      const rawList = Array.isArray(res) ? res : res.items || [];
      setUsers(
        rawList.filter(
          (u: any) => OFFICIAL_ROLES.includes(u.role) || !['citizen', 'service_point_operator'].includes(u.role)
        )
      );
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoginAsOfficial = async (u: any) => {
    const targetTab = getOfficerTargetTab(u.role);
    // Preserve the current admin session for supervisor privileges and the return path.
    const prev = {
      orig: localStorage.getItem('bs_admin_original_token'),
      origUser: localStorage.getItem('bs_admin_original_user'),
      mode: localStorage.getItem('bs_superadmin_mode'),
    };
    const currentToken = localStorage.getItem('bs_token');
    const currentUser = localStorage.getItem('bs_user');
    const currentRoleVal = localStorage.getItem('bs_role');
    if (currentRoleVal === 'admin' || currentRoleVal === 'system_admin') {
      if (currentToken) localStorage.setItem('bs_admin_original_token', currentToken);
      if (currentUser) localStorage.setItem('bs_admin_original_user', currentUser);
    }
    localStorage.setItem('bs_superadmin_mode', '1');

    try {
      const res = await BhumiApi.switchDemoRole(u.role, u.username, u.id);
      if (res?.access_token && res?.user) {
        setToken(res.access_token);
        setUser(res.user);
        setRole(res.user.role as UserRole);
      } else {
        setRole(u.role as UserRole);
      }
      window.location.href = `/${lang}/${targetTab}`;
    } catch (err) {
      // Roll back the impersonation flags so the admin session stays clean.
      const restore = (k: string, v: string | null) => (v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v));
      restore('bs_admin_original_token', prev.orig);
      restore('bs_admin_original_user', prev.origUser);
      restore('bs_superadmin_mode', prev.mode);
      notify.err(err, lang);
      throw err;
    }
  };

  const openTransfer = (u: any) => {
    setSelected(null);
    setTransferTarget(u);
    setNewOfficeId('');
    setOrderRef('');
    if (!officesLoaded) {
      BhumiApi.listOffices()
        .then((items: any) => {
          setOffices(Array.isArray(items) ? items : items?.items || []);
          setOfficesLoaded(true);
        })
        .catch((e) => notify.err(e, lang, t('অফিস তালিকা আসেনি', 'Could not load offices')));
    }
  };

  const transferOffices = useMemo(() => {
    const types = transferTarget ? ROLE_OFFICE_TYPES[transferTarget.role] : undefined;
    return types ? offices.filter((o) => types.includes(o.office_type)) : offices;
  }, [offices, transferTarget]);

  const handleConfirmTransfer = async () => {
    if (!transferTarget || !newOfficeId) return;
    try {
      setTransferring(true);
      const res = await BhumiApi.transferOfficer(transferTarget.id, {
        new_office_id: Number(newOfficeId),
        transfer_order_ref: orderRef.trim() || undefined,
      });
      notify.ok((lang === 'bn' ? res?.message_bn : res?.message_en) || t('বদলি হয়েছে', 'Transferred'));
      setTransferTarget(null);
      fetchUsers();
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setTransferring(false);
    }
  };

  const roleOptions = useMemo(
    () => Array.from(new Set(users.map((u) => u.role))).sort((a, b) => roleLabel(a).localeCompare(roleLabel(b))),
    [users, lang] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (!q) return true;
      return [u.full_name_bn, u.name_bn, u.name, u.full_name_en, u.username, u.office_bn, u.office_name, u.office_en, roleLabel(u.role)].some(
        (v) => String(v || '').toLowerCase().includes(q)
      );
    });
  }, [users, search, roleFilter, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = users.length;
  const activeCount = users.filter(isActive).length;
  const verifiedCount = users.filter(isVerified).length;
  const officeCount = new Set(users.map(officeOf).filter(Boolean)).size;
  const dash = (v: number) => (loading ? '—' : n(v));

  const statusBadge = (u: any) =>
    isActive(u) ? (
      <StatusBadge tone="green">{t('সক্রিয়', 'Active')}</StatusBadge>
    ) : (
      <StatusBadge tone="slate">{t('বন্ধ', 'Inactive')}</StatusBadge>
    );

  return (
    <AdminPage fill>
      <StatGrid>
        <StatCard label={t('মোট কর্মকর্তা', 'Officials')} value={dash(total)} icon={Users} tone="blue" />
        <StatCard label={t('সক্রিয়', 'Active')} value={dash(activeCount)} icon={UserCheck} tone="green" />
        <StatCard label={t('যাচাইকৃত', 'Verified')} value={dash(verifiedCount)} icon={BadgeCheck} tone="violet" />
        <StatCard label={t('অফিস', 'Offices')} value={dash(officeCount)} icon={Building2} tone="amber" />
      </StatGrid>

      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('নাম, ইউজার, অফিস…', 'Name, user, office…')}
        filters={
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-9 w-48 rounded-lg bg-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="ALL">{t('সব পদবী', 'All roles')}</SelectItem>
              {roleOptions.map((r) => (
                <SelectItem key={r} value={r}>
                  {roleLabel(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        actions={
          <Button size="sm" className="h-9" onClick={() => setCreateOpen(true)}>
            <UserPlus className="size-4" />
            {t('নতুন কর্মকর্তা', 'New official')}
          </Button>
        }
      />

      <Section fill
        title={t('কর্মকর্তা তালিকা', 'Officials')}
        action={!loading && <span className="text-xs text-slate-500">{n(filtered.length)}{t(' জন', '')}</span>}
      >
        <DataTable headers={[t('নাম', 'Name'), t('পদবী', 'Role'), t('অফিস', 'Office'), t('অবস্থা', 'Status'), '']} alignRight={[4]}>
          {loading ? (
            <LoadingRows cols={5} />
          ) : filtered.length === 0 ? (
            <EmptyRow cols={5} text={t('কোনো কর্মকর্তা নেই', 'No officials found')} />
          ) : (
            filtered.map((u) => (
              <tr key={u.id} className="cursor-pointer" onClick={() => setSelected(u)}>
                <td className="max-w-0 w-[30%]">
                  <div className="truncate font-medium text-slate-900">{displayName(u)}</div>
                  <div className="truncate text-xs text-slate-500">@{u.username}</div>
                </td>
                <td className="max-w-0 w-[20%]">
                  <div className="truncate text-slate-700">{roleLabel(u.role)}</div>
                </td>
                <td className="max-w-0">
                  <div className="truncate text-slate-600">{officeOf(u) || '—'}</div>
                </td>
                <td>{statusBadge(u)}</td>
                <td className="w-12 text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8" aria-label={t('আরও', 'More')}>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onClick={() => setSelected(u)}>
                        <Eye className="size-4" />
                        {t('বিস্তারিত', 'View')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLoginTarget(u)}>
                        <KeyRound className="size-4" />
                        {t('এই ব্যবহারকারী হিসেবে ঢুকুন', 'Log in as user')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => openTransfer(u)}>
                        <ArrowRightLeft className="size-4" />
                        {t('অফিস বদলি', 'Transfer office')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))
          )}
        </DataTable>
      </Section>

      <DetailSheet
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected ? displayName(selected) : ''}
        subtitle={selected ? roleLabel(selected.role) : undefined}
        footer={
          selected && (
            <>
              <Button variant="outline" size="sm" className="h-9" onClick={() => openTransfer(selected)}>
                <ArrowRightLeft className="size-4" />
                {t('অফিস বদলি', 'Transfer')}
              </Button>
              <Button size="sm" className="h-9" onClick={() => setLoginTarget(selected)}>
                <KeyRound className="size-4" />
                {t('এই ব্যবহারকারী হিসেবে ঢুকুন', 'Log in as user')}
              </Button>
            </>
          )
        }
      >
        {selected && (
          <>
            <div className="flex flex-wrap items-center gap-2">{statusBadge(selected)}</div>
            <DetailList
              items={[
                [t('ইউজারনেম', 'Username'), `@${selected.username}`],
                [t('পদবী', 'Role'), roleLabel(selected.role)],
                [t('অফিস', 'Office'), officeOf(selected) || '—'],
                [t('মোবাইল', 'Mobile'), maskPhone(selected.phone_mock || selected.phone, lang)],
                [t('এনআইডি', 'NID'), maskNid(selected.nid_mock || selected.nid, lang)],
                !!selected.email && [t('ইমেইল', 'Email'), selected.email],
                [t('শেষ লগইন', 'Last login'), formatDate(selected.last_login_at, lang)],
              ]}
            />
          </>
        )}
      </DetailSheet>

      <ConfirmDialog
        open={!!loginTarget}
        onOpenChange={(o) => !o && setLoginTarget(null)}
        title={t('এই ব্যবহারকারী হিসেবে ঢুকবেন?', 'Log in as this user?')}
        description={loginTarget ? `${displayName(loginTarget)} · ${roleLabel(loginTarget.role)}` : undefined}
        confirmLabel={t('ঢুকুন', 'Log in')}
        cancelLabel={t('বাতিল', 'Cancel')}
        onConfirm={() => handleLoginAsOfficial(loginTarget)}
      />

      <FormDialog
        open={!!transferTarget}
        onOpenChange={(o) => !o && setTransferTarget(null)}
        title={t('অফিস বদলি', 'Transfer office')}
        description={transferTarget ? `${displayName(transferTarget)} · ${officeOf(transferTarget) || '—'}` : undefined}
        submitLabel={t('বদলি করুন', 'Transfer')}
        cancelLabel={t('বাতিল', 'Cancel')}
        onSubmit={handleConfirmTransfer}
        busy={transferring}
        disabled={!newOfficeId}
        size="sm"
      >
        <Field label={t('নতুন অফিস', 'New office')}>
          <Select value={newOfficeId} onValueChange={setNewOfficeId}>
            <SelectTrigger className="h-9 w-full rounded-lg text-sm">
              <SelectValue placeholder={officesLoaded ? t('অফিস বাছুন', 'Choose office') : t('লোড হচ্ছে…', 'Loading…')} />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {transferOffices.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>
                  {lang === 'bn' ? o.name_bn || o.name_en : o.name_en || o.name_bn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {officesLoaded && transferOffices.length === 0 && (
            <span className="block text-xs text-slate-500">{t('মানানসই অফিস নেই', 'No matching office')}</span>
          )}
        </Field>
        <Field label={t('আদেশ নম্বর', 'Order ref')}>
          <input
            value={orderRef}
            onChange={(e) => setOrderRef(e.target.value)}
            placeholder={t('স্মারক নং', 'Memo no.')}
            className={inputCls}
          />
        </Field>
      </FormDialog>

      <CreateOfficialDialog
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          notify.ok(t('কর্মকর্তা যোগ হয়েছে', 'Official added'));
          fetchUsers();
        }}
      />
    </AdminPage>
  );
};
