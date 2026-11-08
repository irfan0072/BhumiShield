import React, { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Eye, KeyRound, MoreHorizontal, Store, UserCheck, UserPlus, Users } from 'lucide-react';
import { useAppUI, UserRole } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { toBanglaDigits, maskNid, maskPhone } from '@/theme/tokens';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateCitizenDialog } from '@/components/admin/CreateCitizenDialog';
import {
  AdminPage,
  ConfirmDialog,
  DataTable,
  DetailList,
  DetailSheet,
  EmptyRow,
  LoadingRows,
  PageToolbar,
  Section,
  StatCard,
  StatGrid,
  StatusBadge,
  notify,
  useCreateIntent,
} from '@/components/admin/kit';

const CITIZEN_ROLES = ['citizen', 'service_point_operator', 'applicant', 'guest'];

const displayName = (u: any) => u.full_name_bn || u.name_bn || u.name || u.full_name_en || u.username;
const isVerified = (u: any) => Number(u.is_identity_verified) === 1 || u.nid_verified === true;
const isActive = (u: any) => u.is_active === undefined || Number(u.is_active) === 1;

const formatDate = (iso: string | null | undefined, lang: 'bn' | 'en') => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const AdminCitizensPage: React.FC = () => {
  const { lang, t, setRole, setUser, setToken } = useAppUI();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [kycFilter, setKycFilter] = useState('ALL');
  const [selected, setSelected] = useState<any | null>(null);
  const [loginTarget, setLoginTarget] = useState<any | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const n = (v: number) => toBanglaDigits(v, lang);

  useCreateIntent(() => setCreateOpen(true));

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res: any = await BhumiApi.listUsers();
      const rawList = Array.isArray(res) ? res : res.items || [];
      setUsers(rawList.filter((u: any) => CITIZEN_ROLES.includes(u.role)));
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoginAsCitizen = async (u: any) => {
    try {
      const res = await BhumiApi.switchDemoRole(u.role || 'citizen', u.username, u.id);
      if (res?.access_token && res?.user) {
        setToken(res.access_token);
        setUser(res.user);
        setRole(u.role as UserRole);
      } else {
        setRole('citizen');
      }
      window.location.href = `/${lang}/home`;
    } catch (err) {
      notify.err(err, lang);
      throw err;
    }
  };

  const roleLabel = (r: string) =>
    r === 'service_point_operator' ? t('ইউডিসি উদ্যোক্তা', 'UDC operator') : t('নাগরিক', 'Citizen');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter === 'UDC' && u.role !== 'service_point_operator') return false;
      if (roleFilter === 'CITIZEN' && u.role === 'service_point_operator') return false;
      if (kycFilter === 'VERIFIED' && !isVerified(u)) return false;
      if (kycFilter === 'PENDING' && isVerified(u)) return false;
      if (!q) return true;
      return [
        u.full_name_bn,
        u.name_bn,
        u.name,
        u.full_name_en,
        u.username,
        u.nid_mock,
        u.nid,
        u.phone_mock,
        u.phone,
        u.present_address_bn,
        u.address_bn,
        u.address,
      ].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [users, search, roleFilter, kycFilter]);

  const total = users.length;
  const activeCount = users.filter(isActive).length;
  const verifiedCount = users.filter(isVerified).length;
  const udcCount = users.filter((u) => u.role === 'service_point_operator').length;
  const dash = (v: number) => (loading ? '—' : n(v));

  const statusBadge = (u: any) =>
    !isActive(u) ? (
      <StatusBadge tone="slate">{t('বন্ধ', 'Inactive')}</StatusBadge>
    ) : isVerified(u) ? (
      <StatusBadge tone="green">{t('যাচাইকৃত', 'Verified')}</StatusBadge>
    ) : (
      <StatusBadge tone="amber">{t('অপেক্ষমাণ', 'Pending')}</StatusBadge>
    );

  const address = (u: any) => u.present_address_bn || u.address_bn || u.address || '';

  return (
    <AdminPage fill>
      <StatGrid>
        <StatCard label={t('মোট নাগরিক', 'Citizens')} value={dash(total)} icon={Users} tone="blue" />
        <StatCard label={t('সক্রিয়', 'Active')} value={dash(activeCount)} icon={UserCheck} tone="green" />
        <StatCard
          label={t('যাচাইকৃত', 'Verified')}
          value={dash(verifiedCount)}
          icon={BadgeCheck}
          tone="violet"
          active={kycFilter === 'VERIFIED'}
          onClick={() => setKycFilter(kycFilter === 'VERIFIED' ? 'ALL' : 'VERIFIED')}
        />
        <StatCard
          label={t('ইউডিসি', 'UDC')}
          value={dash(udcCount)}
          icon={Store}
          tone="amber"
          active={roleFilter === 'UDC'}
          onClick={() => setRoleFilter(roleFilter === 'UDC' ? 'ALL' : 'UDC')}
        />
      </StatGrid>

      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('নাম, এনআইডি, মোবাইল…', 'Name, NID, mobile…')}
        filters={
          <>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-9 w-36 rounded-lg bg-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('সব ধরন', 'All types')}</SelectItem>
                <SelectItem value="CITIZEN">{t('নাগরিক', 'Citizen')}</SelectItem>
                <SelectItem value="UDC">{t('ইউডিসি', 'UDC')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={kycFilter} onValueChange={setKycFilter}>
              <SelectTrigger className="h-9 w-36 rounded-lg bg-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('সব অবস্থা', 'All status')}</SelectItem>
                <SelectItem value="VERIFIED">{t('যাচাইকৃত', 'Verified')}</SelectItem>
                <SelectItem value="PENDING">{t('অপেক্ষমাণ', 'Pending')}</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        actions={
          <Button size="sm" className="h-9" onClick={() => setCreateOpen(true)}>
            <UserPlus className="size-4" />
            {t('নতুন নাগরিক', 'New citizen')}
          </Button>
        }
      />

      <Section fill
        title={t('নাগরিক তালিকা', 'Citizens')}
        action={!loading && <span className="text-xs text-slate-500">{n(filtered.length)}{t(' জন', '')}</span>}
      >
        <DataTable
          headers={[t('নাম', 'Name'), t('ধরন', 'Type'), t('অবস্থা', 'Status'), '']}
          alignRight={[3]}
        >
          {loading ? (
            <LoadingRows cols={4} />
          ) : filtered.length === 0 ? (
            <EmptyRow cols={4} text={t('কোনো নাগরিক নেই', 'No citizens found')} />
          ) : (
            filtered.map((u) => (
              <tr key={u.id} className="cursor-pointer" onClick={() => setSelected(u)}>
                <td className="max-w-0 w-[40%]">
                  <div className="truncate font-medium text-slate-900">{displayName(u)}</div>
                  <div className="truncate text-xs text-slate-500">
                    @{u.username}
                    {(u.phone_mock || u.phone) && ` · ${maskPhone(u.phone_mock || u.phone, lang)}`}
                  </div>
                </td>
                <td className="max-w-0">
                  <div className="truncate text-slate-700">{roleLabel(u.role)}</div>
                  {address(u) && <div className="truncate text-xs text-slate-500">{address(u)}</div>}
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
        subtitle={selected ? `@${selected.username}` : undefined}
        footer={
          selected && (
            <>
              <Button variant="outline" size="sm" className="h-9" onClick={() => setSelected(null)}>
                {t('বন্ধ', 'Close')}
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
            <div className="flex flex-wrap items-center gap-2">
              {statusBadge(selected)}
              <StatusBadge tone="blue">{roleLabel(selected.role)}</StatusBadge>
            </div>
            <DetailList
              items={[
                [t('ইউজারনেম', 'Username'), `@${selected.username}`],
                [t('এনআইডি', 'NID'), maskNid(selected.nid_mock || selected.nid, lang)],
                [t('মোবাইল', 'Mobile'), maskPhone(selected.phone_mock || selected.phone, lang)],
                !!selected.email && [t('ইমেইল', 'Email'), selected.email],
                !!address(selected) && [t('ঠিকানা', 'Address'), address(selected)],
                [t('শেষ লগইন', 'Last login'), formatDate(selected.last_login_at, lang)],
                [t('যোগদান', 'Joined'), formatDate(selected.created_at, lang)],
              ]}
            />
          </>
        )}
      </DetailSheet>

      <ConfirmDialog
        open={!!loginTarget}
        onOpenChange={(o) => !o && setLoginTarget(null)}
        title={t('এই ব্যবহারকারী হিসেবে ঢুকবেন?', 'Log in as this user?')}
        description={loginTarget ? `${displayName(loginTarget)} · @${loginTarget.username}` : undefined}
        confirmLabel={t('ঢুকুন', 'Log in')}
        cancelLabel={t('বাতিল', 'Cancel')}
        onConfirm={() => handleLoginAsCitizen(loginTarget)}
      />

      <CreateCitizenDialog
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          notify.ok(t('নাগরিক যোগ হয়েছে', 'Citizen added'));
          fetchUsers();
        }}
      />
    </AdminPage>
  );
};
