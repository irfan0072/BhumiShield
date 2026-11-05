import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  UserPlus,
  ShieldCheck,
  Building2,
  RotateCcw,
  CheckCircle2,
  ArrowRightLeft,
  KeyRound,
  Briefcase,
} from 'lucide-react';
import { useAppUI, UserRole } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { toBanglaDigits, maskPhone } from '@/theme/tokens';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CreateCitizenDialog } from '@/components/admin/CreateCitizenDialog';
import { CreateOfficialDialog } from '@/components/admin/CreateOfficialDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const AdminUsersPage: React.FC = () => {
  const { lang, t, role: currentRole, setRole, setUser, setToken } = useAppUI();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [createCitizenOpen, setCreateCitizenOpen] = useState(false);
  const [createOfficialOpen, setCreateOfficialOpen] = useState(false);

  // Transfer Dialog
  const [transferTarget, setTransferTarget] = useState<any | null>(null);
  const [newOffice, setNewOffice] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferring, setTransferring] = useState(false);

  const handleLoginAsUser = async (u: any) => {
    let targetTab = 'home';
    if (['sub_registrar', 'joint_sub_registrar', 'district_registrar', 'registry_data_officer'].includes(u.role)) targetTab = 'registrar';
    else if (['ac_land', 'land_office_assistant', 'field_verification_officer', 'settlement_records_officer', 'settlement_checker', 'settlement_officer', 'kanungo', 'uno', 'uno_supervisor', 'adc_revenue', 'appellate_reviewer', 'divisional_commissioner', 'dlrs_officer', 'land_appeal_board', 'land_reform_board'].includes(u.role)) targetTab = 'acland';
    else if (['bank_officer', 'bank_manager'].includes(u.role)) targetTab = 'bank';
    else if (['lawyer_court_user'].includes(u.role)) targetTab = 'lawyer_case';
    else if (['dc_acquisition_officer'].includes(u.role)) targetTab = 'specialist';
    else if (['admin', 'system_admin', 'auditor', 'system_auditor'].includes(u.role)) targetTab = 'admin';

    try {
      const currentToken = localStorage.getItem('bs_token');
      const currentUser = localStorage.getItem('bs_user');
      const currentRoleVal = localStorage.getItem('bs_role');
      if (currentRoleVal === 'admin' || currentRoleVal === 'system_admin') {
        if (currentToken) localStorage.setItem('bs_admin_original_token', currentToken);
        if (currentUser) localStorage.setItem('bs_admin_original_user', currentUser);
      }
      localStorage.setItem('bs_superadmin_mode', '1');

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
      console.warn('Switch demo role fallback:', err);
      setRole(u.role as UserRole);
      window.location.href = `/${lang}/${targetTab}`;
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await BhumiApi.listUsers();
      setUsers(Array.isArray(res) ? res : res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenTransfer = (u: any) => {
    setTransferTarget(u);
    setNewOffice('উপজেলা ভূমি অফিস, ধামরাই, ঢাকা');
    setTransferReason('মন্ত্রণালয়ের বার্ষিক কর্মকর্তা বদলি ও পদায়ন আদেশ মোতাবেক');
  };

  const handleConfirmTransfer = async () => {
    if (!transferTarget) return;
    try {
      setTransferring(true);
      await BhumiApi.transferOfficer(transferTarget.id, {
        new_office_id: transferTarget.office_id || 1,
        transfer_order_ref: transferReason,
        notes: newOffice,
      });
      setTransferTarget(null);
      fetchUsers();
    } catch (e) {
      console.error(e);
    } finally {
      setTransferring(false);
    }
  };

  const filtered = users.filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const q = search.toLowerCase();
    const matchesQuery =
      !search ||
      String(u.name_bn || u.name || '').toLowerCase().includes(q) ||
      String(u.username || '').toLowerCase().includes(q) ||
      String(u.office_name || u.office_bn || '').toLowerCase().includes(q);
    return matchesRole && matchesQuery;
  });

  return (
    <div className="h-full min-h-0 flex flex-col gap-2.5 p-3 sm:p-4 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Search, Filter & Actions Toolbar */}
      <Card className="shrink-0 border border-border/80 shadow-2xs bg-card p-2 sm:p-2.5 rounded-xl">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 w-full lg:w-auto flex-1">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('কর্মকর্তার নাম, ইউজারনেম বা পদায়ন দিয়ে খুঁজুন...', 'Search by Officer Name, Username or Office...')}
                className="pl-8 h-8 text-xs rounded-lg"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px] h-8 text-xs rounded-lg shrink-0">
                <SelectValue placeholder={t('সকল ভূমিকা / পদবী', 'All Roles')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('সকল ভূমিকা', 'All Roles')}</SelectItem>
                <SelectItem value="admin">{t('জাতীয় অ্যাডমিন (admin)', 'System Admin')}</SelectItem>
                <SelectItem value="sub_registrar">{t('সাব-রেজিস্ট্রার (sub_registrar)', 'Sub-Registrar')}</SelectItem>
                <SelectItem value="ac_land">{t('এসি ল্যান্ড (ac_land)', 'AC Land')}</SelectItem>
                <SelectItem value="bank_officer">{t('ব্যাংক অফিসার (bank_officer)', 'Bank Officer')}</SelectItem>
                <SelectItem value="citizen">{t('সাধারণ নাগরিক (citizen)', 'Citizen')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 justify-end flex-wrap">
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800 shrink-0">
              {toBanglaDigits(filtered.length, lang)} {t('জন সক্রিয়', 'active')}
            </Badge>

            <Button
              size="sm"
              onClick={() => setCreateCitizenOpen(true)}
              className="h-8 px-2.5 gap-1.5 text-xs font-bold bg-[#006A4E] hover:bg-[#00553e] text-white shadow-2xs cursor-pointer rounded-lg shrink-0"
            >
              <UserPlus className="size-3.5" />
              <span>{t('নতুন নাগরিক', 'New Citizen')}</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setCreateOfficialOpen(true)}
              className="h-8 px-2.5 gap-1.5 text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white shadow-2xs cursor-pointer rounded-lg shrink-0"
            >
              <Briefcase className="size-3.5" />
              <span>{t('নতুন কর্মকর্তা', 'New Official')}</span>
            </Button>

            <Button variant="outline" size="sm" onClick={fetchUsers} className="h-8 px-2.5 gap-1 text-xs font-semibold rounded-lg border-border shrink-0">
              <RotateCcw className="size-3.5" />
              <span>{t('রিফ্রেশ', 'Refresh')}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* 3. Users Table (Single-screen scrollable) */}
      <Card className="flex-1 min-h-0 border border-border/80 shadow-2xs rounded-xl overflow-hidden bg-card flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
          <Table>
            <TableHeader className="bg-muted/95 sticky top-0 z-20 backdrop-blur-xs border-b border-border shadow-xs">
              <TableRow className="text-xs">
                <TableHead className="h-9 py-1.5 font-bold text-foreground bg-muted/95">{t('কর্মকর্তার নাম ও ইউজারনেম', 'Name & Username')}</TableHead>
                <TableHead className="h-9 py-1.5 font-bold text-foreground bg-muted/95">{t('দায়িত্বপ্রাপ্ত ভূমিকা (RBAC)', 'Role / Position')}</TableHead>
                <TableHead className="h-9 py-1.5 font-bold text-foreground bg-muted/95">{t('বর্তমান পদায়ন কার্যালয়', 'Current Assigned Office')}</TableHead>
                <TableHead className="h-9 py-1.5 font-bold text-foreground bg-muted/95">{t('এনআইডি ও যোগাযোগ', 'NID & Contact')}</TableHead>
                <TableHead className="h-9 py-1.5 font-bold text-foreground text-right bg-muted/95">{t('অ্যাকশন', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-xs text-muted-foreground">
                    {t('ব্যবহারকারী তথ্য লোড হচ্ছে...', 'Loading user directory...')}
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-xs text-muted-foreground">
                    {t('কোনো ব্যবহারকারী পাওয়া যায়নি।', 'No users found matching query.')}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => (
                  <TableRow key={u.id} className="text-xs hover:bg-muted/50 transition">
                    <TableCell className="font-medium">
                      <div className="font-bold text-foreground">{u.name_bn || u.name || u.username}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">@{u.username}</div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px] uppercase font-bold">
                        {u.role}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <Building2 className="size-3 text-muted-foreground shrink-0" />
                        <span>{u.office_name || u.office_bn || t('ভূমি মন্ত্রণালয়, ঢাকা', 'Ministry of Land')}</span>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-muted-foreground">
                      <div>{u.nid_mock || u.nid || 'N/A'}</div>
                      <div className="text-[10px]">{maskPhone(u.phone_mock || u.phone)}</div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenTransfer(u)}
                          className="h-7 px-2.5 text-xs font-semibold gap-1 text-purple-700 hover:text-purple-900 border-purple-200"
                        >
                          <ArrowRightLeft className="size-3" />
                          <span>{t('বদলি / পদায়ন', 'Transfer')}</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLoginAsUser(u)}
                          className="h-7 px-2 text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50"
                          title={t('এই ব্যবহারকারীর অ্যাকাউন্টে সরাসরি লগইন করুন', 'Login directly into this user account')}
                        >
                          <KeyRound className="size-3 mr-1 text-emerald-600" />
                          <span>{t('অ্যাকাউন্টে লগইন', 'Login as User')}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
        </Table>
        </div>
      </Card>

      {/* Transfer Officer Dialog */}
      <Dialog open={!!transferTarget} onOpenChange={(open) => !open && setTransferTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ArrowRightLeft className="size-5 text-purple-700" />
              <span>{t('কর্মকর্তা পদায়ন ও বদলি আদেশ', 'Official Office Transfer Order')}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t('সংশ্লিষ্ট কর্মকর্তার কর্মস্থল পরিবর্তনের সরকারি আদেশ নিশ্চিত করুন', 'Transfer official to a new land office with immediate credential delegation')}
            </DialogDescription>
          </DialogHeader>

          {transferTarget && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-lg border bg-muted/40 space-y-1">
                <div className="font-bold text-foreground">{transferTarget.name_bn || transferTarget.name}</div>
                <div className="text-muted-foreground font-mono">
                  {t('বর্তমান কার্যালয়:', 'Current Office:')} {transferTarget.office_name || transferTarget.office_bn || 'ভূমি মন্ত্রণালয়'}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">{t('নতুন পদায়ন কার্যালয়:', 'New Land Office:')}</label>
                <Input
                  value={newOffice}
                  onChange={(e) => setNewOffice(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">{t('বদলি আদেশের কারণ ও স্মারক:', 'Transfer Order Memo:')}</label>
                <Input
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTransferTarget(null)}>
              {t('বাতিল', 'Cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmTransfer}
              disabled={transferring}
              className="bg-purple-700 hover:bg-purple-800 text-white font-bold"
            >
              {transferring ? t('বদলি সম্পন্ন হচ্ছে...', 'Transferring...') : t('বদলি আদেশ জারি করুন', 'Confirm Transfer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Super Admin User Creation Dialogs */}
      <CreateCitizenDialog
        isOpen={createCitizenOpen}
        onClose={() => setCreateCitizenOpen(false)}
        onSuccess={fetchUsers}
      />
      <CreateOfficialDialog
        isOpen={createOfficialOpen}
        onClose={() => setCreateOfficialOpen(false)}
        onSuccess={fetchUsers}
      />
    </div>
  );
};
