import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  RotateCcw,
  Building2,
  ArrowRightLeft,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Briefcase,
  MapPin,
  ExternalLink,
  Award,
  UserPlus,
} from 'lucide-react';
import { useAppUI, UserRole } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { toBanglaDigits, maskPhone } from '@/theme/tokens';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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

export const AdminOfficialsPage: React.FC = () => {
  const { lang, t, role: currentRole, setRole, setUser, setToken } = useAppUI();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [createOfficialModalOpen, setCreateOfficialModalOpen] = useState(false);

  // Transfer Dialog
  const [transferTarget, setTransferTarget] = useState<any | null>(null);
  const [newOffice, setNewOffice] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferring, setTransferring] = useState(false);

  const handleLoginAsOfficial = async (u: any) => {
    const targetTab = getOfficerTargetTab(u.role);
    try {
      // 1. Preserve current admin session for supervisor privileges & return path
      const currentToken = localStorage.getItem('bs_token');
      const currentUser = localStorage.getItem('bs_user');
      const currentRoleVal = localStorage.getItem('bs_role');
      if (currentRoleVal === 'admin' || currentRoleVal === 'system_admin') {
        if (currentToken) localStorage.setItem('bs_admin_original_token', currentToken);
        if (currentUser) localStorage.setItem('bs_admin_original_user', currentUser);
      }
      localStorage.setItem('bs_superadmin_mode', '1');

      // 2. Switch role via backend API
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
      // Fallback: set officer role and target official workspace (NEVER /home!)
      setRole(u.role as UserRole);
      window.location.href = `/${lang}/${targetTab}`;
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await BhumiApi.listUsers();
      const rawList = Array.isArray(res) ? res : res.items || [];
      // Filter only institutional officials
      const officialList = rawList.filter((u: any) =>
        OFFICIAL_ROLES.includes(u.role) || !['citizen', 'service_point_operator'].includes(u.role)
      );
      setUsers(officialList);
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

  const totalOfficials = users.length;
  const uniqueOffices = new Set(users.map((u) => u.office_name || u.office_bn || 'ভূমি মন্ত্রণালয়, ঢাকা')).size;

  return (
    <div className="h-full min-h-0 flex flex-col gap-2.5 p-3 sm:p-4 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Search, Filter & Actions Toolbar */}
      <Card className="shrink-0 border border-border/80 shadow-2xs bg-card p-2 sm:p-2.5 rounded-xl">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 w-full lg:w-auto flex-1">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('নাম, ইউজার বা অফিস দিয়ে খুঁজুন...', 'Search by name, user or office...')}
                className="pl-8 h-8 text-xs rounded-lg border-border"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px] h-8 text-xs rounded-lg border-border shrink-0">
                <SelectValue placeholder={t('সকল পদবী', 'All Roles')} />
              </SelectTrigger>
              <SelectContent className="max-h-60 text-xs">
                <SelectItem value="ALL">{t('সকল পদবী (All Roles)', 'All Roles')}</SelectItem>
                <SelectItem value="admin">{t('জাতীয় অ্যাডমিন (admin)', 'System Admin')}</SelectItem>
                <SelectItem value="sub_registrar">{t('সাব-রেজিস্ট্রার (sub_registrar)', 'Sub-Registrar')}</SelectItem>
                <SelectItem value="registry_data_officer">{t('দলিল রেকর্ড কিপার (registry_data_officer)', 'Deed Record Keeper')}</SelectItem>
                <SelectItem value="ac_land">{t('এসি ল্যান্ড (ac_land)', 'AC Land')}</SelectItem>
                <SelectItem value="land_office_assistant">{t('সহকারী নায়েব (land_office_assistant)', 'Office Assistant')}</SelectItem>
                <SelectItem value="field_verification_officer">{t('সার্ভেয়ার / আমিন (field_verification_officer)', 'Surveyor / Amin')}</SelectItem>
                <SelectItem value="settlement_records_officer">{t('সেটেলমেন্ট রেকর্ডস অফিসার (settlement_records_officer)', 'Settlement Checker')}</SelectItem>
                <SelectItem value="bank_officer">{t('ব্যাংক লিয়েন অফিসার (bank_officer)', 'Bank Officer')}</SelectItem>
                <SelectItem value="bank_manager">{t('ব্যাংক শাখা ব্যবস্থাপক (bank_manager)', 'Bank Manager')}</SelectItem>
                <SelectItem value="uno_supervisor">{t('উপজেলা নির্বাহী অফিসার (uno_supervisor)', 'UNO')}</SelectItem>
                <SelectItem value="appellate_reviewer">{t('অতিরিক্ত জেলা প্রশাসক (appellate_reviewer)', 'ADC Revenue')}</SelectItem>
                <SelectItem value="district_registrar">{t('জেলা রেজিস্ট্রার (district_registrar)', 'District Registrar')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 justify-end flex-wrap">
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800 shrink-0">
              {t('মোট:', 'Total:')} {toBanglaDigits(filtered.length, lang)} {t('জন কর্মকর্তা', 'Officials')}
            </Badge>

            <Button
              size="sm"
              onClick={() => setCreateOfficialModalOpen(true)}
              className="h-8 gap-1.5 px-3 text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white shadow-2xs cursor-pointer rounded-lg shrink-0"
            >
              <UserPlus className="size-3.5" />
              <span>{t('নতুন কর্মকর্তা', 'New Official')}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              className="h-8 px-2.5 gap-1 text-xs font-semibold cursor-pointer rounded-lg border-border shrink-0"
            >
              <RotateCcw className="size-3.5" />
              <span>{t('রিফ্রেশ', 'Refresh')}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* 3. Single-Screen Framed Table Container with Viewport Scroll */}
      <Card className="flex-1 min-h-0 border border-border/80 shadow-2xs bg-card rounded-xl overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-xs z-20 border-b border-border shadow-xs">
              <TableRow className="text-xs hover:bg-transparent">
                <TableHead className="h-9 py-1.5 font-bold text-foreground bg-muted/95">{t('কর্মকর্তা ও ইউজার', 'Officer & User')}</TableHead>
                <TableHead className="h-9 py-1.5 font-bold text-foreground bg-muted/95">{t('পদবী ও রোল', 'Designation & Role')}</TableHead>
                <TableHead className="h-9 py-1.5 font-bold text-foreground bg-muted/95">{t('কার্যালয় ও কর্মস্থল', 'Office & Posting')}</TableHead>
                <TableHead className="h-9 py-1.5 font-bold text-foreground bg-muted/95">{t('এনআইডি ও যোগাযোগ', 'Contact & NID')}</TableHead>
                <TableHead className="h-9 py-1.5 font-bold text-foreground text-right bg-muted/95">{t('অ্যাকশন ও একাউন্ট অ্যাক্সেস', 'Actions & Access')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-xs text-muted-foreground">
                    {t('কর্মকর্তা তথ্য লোড হচ্ছে...', 'Loading officer directory...')}
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-xs text-muted-foreground">
                    {t('কোনো কর্মকর্তা পাওয়া যায়নি।', 'No officials found matching query.')}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => (
                  <TableRow key={u.id} className="text-xs hover:bg-muted/50 transition">
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                          {String(u.name_bn || u.name || u.username || 'ক').charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground truncate">{u.name_bn || u.name || u.username}</div>
                          <div className="text-[10px] text-muted-foreground font-mono leading-none">@{u.username}</div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-2">
                      <Badge variant="outline" className="font-mono text-[9px] uppercase font-bold bg-muted/40 px-1.5 py-0.5">
                        {u.role}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-2">
                      <div className="font-medium text-foreground flex items-center gap-1 text-[11px] truncate max-w-xs">
                        <Building2 className="size-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{u.office_name || u.office_bn || t('ভূমি মন্ত্রণালয়, ঢাকা', 'Ministry of Land')}</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-2 font-mono text-muted-foreground text-[11px]">
                      <div>{u.nid_mock || u.nid || 'N/A'}</div>
                      <div className="text-[10px]">{maskPhone(u.phone_mock || u.phone)}</div>
                    </TableCell>

                    <TableCell className="py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenTransfer(u)}
                          className="h-7 px-2 text-xs font-semibold gap-1 text-purple-700 hover:text-purple-900 border-purple-200 dark:border-purple-800 rounded-lg"
                        >
                          <ArrowRightLeft className="size-3" />
                          <span>{t('বদলি', 'Transfer')}</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLoginAsOfficial(u)}
                          className="h-7 px-2 text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg"
                          title={t('এই কর্মকর্তার অ্যাকাউন্টে সরাসরি লগইন করুন', 'Login directly into this officer account')}
                        >
                          <KeyRound className="size-3 mr-1 text-emerald-600" />
                          <span>{t('লগইন', 'Login')}</span>
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
              <span>{t('কর্মকর্তা বদলি', 'Transfer Officer')}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t('কর্মকর্তার নতুন কর্মস্থলে বদলি নিশ্চিত করুন।', 'Transfer official to a new office.')}
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

      {/* Super Admin Create Official Modal */}
      <CreateOfficialDialog
        isOpen={createOfficialModalOpen}
        onClose={() => setCreateOfficialModalOpen(false)}
        onSuccess={fetchUsers}
      />
    </div>
  );
};
