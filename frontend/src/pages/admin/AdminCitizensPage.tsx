import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  RotateCcw,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Building2,
  FileText,
  BadgeCheck,
  AlertCircle,
  ExternalLink,
  Eye,
  Lock,
  Phone,
  CreditCard,
  MapPin,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { useAppUI, UserRole } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { toBanglaDigits, maskPhone } from '@/theme/tokens';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CreateCitizenDialog } from '@/components/admin/CreateCitizenDialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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

export const AdminCitizensPage: React.FC = () => {
  const { lang, t, role: currentRole, setRole, setUser, setToken } = useAppUI();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('ALL');
  const [selectedCitizen, setSelectedCitizen] = useState<any | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await BhumiApi.listUsers();
      const rawList = Array.isArray(res) ? res : res.items || [];
      // Citizen roles only
      const citizenList = rawList.filter((u: any) =>
        ['citizen', 'service_point_operator', 'applicant', 'guest'].includes(u.role)
      );
      setUsers(citizenList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleLoginAsCitizen = async (u: any) => {
    try {
      const res = await BhumiApi.switchDemoRole(u.role || 'citizen');
      if (res?.access_token && res?.user) {
        setToken(res.access_token);
        setUser(res.user);
        setRole(u.role as UserRole);
      } else {
        setRole('citizen');
      }
      window.location.href = `/${lang}/home`;
    } catch (err) {
      console.warn('Switch demo role fallback:', err);
      setRole('citizen');
      window.location.href = `/${lang}/home`;
    }
  };

  const filtered = users.filter((u) => {
    const isVerified = Boolean(u.nid_verified ?? true);
    if (kycFilter === 'VERIFIED' && !isVerified) return false;
    if (kycFilter === 'PENDING' && isVerified) return false;

    const q = search.toLowerCase();
    const matchesQuery =
      !search ||
      String(u.name_bn || u.name || '').toLowerCase().includes(q) ||
      String(u.username || '').toLowerCase().includes(q) ||
      String(u.nid_mock || u.nid || '').toLowerCase().includes(q) ||
      String(u.phone_mock || u.phone || '').toLowerCase().includes(q) ||
      String(u.address_bn || u.address || '').toLowerCase().includes(q);

    return matchesQuery;
  });

  const totalCitizens = users.length;
  const verifiedCount = users.filter((u) => Boolean(u.nid_verified ?? true)).length;
  const udcCount = users.filter((u) => u.role === 'service_point_operator').length;

  return (
    <div className="h-full min-h-0 flex flex-col gap-2.5 p-3 sm:p-4 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Search & Filter Toolbar */}
      <Card className="shrink-0 border border-border/80 shadow-2xs bg-card p-2 sm:p-2.5 rounded-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('নাম, এনআইডি, ফোন বা এলাকা দিয়ে খুঁজুন...', 'Search name, NID, phone or area...')}
              className="pl-8 h-8 text-xs rounded-lg border-border"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 shrink-0">
              {t('মোট:', 'Total:')} {toBanglaDigits(filtered.length, lang)} {t('নাগরিক', 'Citizens')}
            </Badge>

            <Select value={kycFilter} onValueChange={setKycFilter}>
              <SelectTrigger className="w-[150px] h-8 text-xs rounded-lg border-border">
                <SelectValue placeholder={t('ভেরিফিকেশন', 'Status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('সকল নাগরিক (All)', 'All Citizens')}</SelectItem>
                <SelectItem value="VERIFIED">{t('ভেরিফাইড (Verified)', 'Verified')}</SelectItem>
                <SelectItem value="PENDING">{t('অপেক্ষমাণ (Pending)', 'Pending')}</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="h-8 gap-1 px-3 text-xs font-bold bg-[#006A4E] hover:bg-[#00553e] text-white cursor-pointer rounded-lg shadow-2xs shrink-0"
            >
              <UserPlus className="size-3.5" />
              <span>{t('নতুন নাগরিক', 'New Citizen')}</span>
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

      {/* 3. Citizens Table with 100% Fixed Header & Single-Screen Scroll */}
      <Card className="flex-1 min-h-0 border border-border/80 shadow-2xs bg-card rounded-xl overflow-hidden flex flex-col">
        {/* 100% Guaranteed Fixed Table Header Row */}
        <div className="shrink-0 bg-muted/95 border-b border-border z-20">
          <table className="w-full text-xs font-bold text-foreground table-fixed">
            <thead>
              <tr className="h-9">
                <th className="py-2 px-3 text-left w-[20%] font-bold text-foreground">{t('নাম ও ইউজার', 'Name & User')}</th>
                <th className="py-2 px-3 text-left w-[16%] font-bold text-foreground">{t('এনআইডি', 'NID')}</th>
                <th className="py-2 px-3 text-left w-[18%] font-bold text-foreground">{t('যোগাযোগ', 'Contact')}</th>
                <th className="py-2 px-3 text-left w-[20%] font-bold text-foreground">{t('ঠিকানা', 'Address')}</th>
                <th className="py-2 px-3 text-left w-[14%] font-bold text-foreground">{t('জমি / খতিয়ান', 'Land')}</th>
                <th className="py-2 px-3 text-right w-[12%] font-bold text-foreground">{t('অ্যাকশন', 'Actions')}</th>
              </tr>
            </thead>
          </table>
        </div>

        {/* Scrollable Table Items Body */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          <table className="w-full text-xs table-fixed">
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                    {t('নাগরিক তালিকা লোড হচ্ছে...', 'Loading citizen directory...')}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                    {t('কোনো নাগরিক অ্যাকাউন্ট পাওয়া যায়নি।', 'No citizens found matching criteria.')}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const isVerified = Boolean(u.nid_verified ?? true);
                  const isUdc = u.role === 'service_point_operator';
                  return (
                    <tr key={u.id} className="text-xs hover:bg-muted/50 transition">
                      <td className="py-2 px-3 font-medium w-[20%] align-middle">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <span className="truncate">{u.name_bn || u.name || u.username}</span>
                          {isUdc && (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 border-blue-300 text-[9px] px-1.5 py-0">
                              {t('ইউডিসি', 'UDC')}
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">@{u.username}</div>
                      </td>

                      <td className="py-2 px-3 w-[16%] align-middle">
                        <div className="font-mono text-xs font-semibold text-foreground">
                          {u.nid_mock ? `${u.nid_mock.substring(0, 4)}••••${u.nid_mock.slice(-4)}` : '১৯৮৭••••৩৪৫৬'}
                        </div>
                        <div className="mt-0.5">
                          {isVerified ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] gap-1 py-0">
                              <CheckCircle2 className="size-2.5 text-emerald-600" />
                              <span>{t('ভেরিফাইড', 'Verified')}</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] gap-1 py-0">
                              <AlertCircle className="size-2.5 text-amber-600" />
                              <span>{t('অপেক্ষমাণ', 'Pending')}</span>
                            </Badge>
                          )}
                        </div>
                      </td>

                      <td className="py-2 px-3 font-mono text-muted-foreground w-[18%] align-middle">
                        <div className="flex items-center gap-1">
                          <Phone className="size-3 text-muted-foreground shrink-0" />
                          <span>{maskPhone(u.phone_mock || u.phone || '01712345678')}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">{u.email || `${u.username}@citizen.gov.bd`}</div>
                      </td>

                      <td className="py-2 px-3 text-muted-foreground w-[20%] align-middle">
                        <div className="flex items-center gap-1 text-[11px]">
                          <MapPin className="size-3 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[160px]">
                            {u.address_bn || u.address || t('সাভার, ঢাকা', 'Savar, Dhaka')}
                          </span>
                        </div>
                      </td>

                      <td className="py-2 px-3 w-[14%] align-middle">
                        <div className="flex items-center gap-1.5">
                          <FileText className="size-3.5 text-emerald-700 shrink-0" />
                          <span className="font-bold text-foreground">
                            {toBanglaDigits(u.plots_count || 2, lang)}
                          </span>
                          <span className="text-muted-foreground text-[11px]">{t('টি জমি', 'plots')}</span>
                        </div>
                      </td>

                      <td className="py-2 px-3 text-right w-[12%] align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCitizen(u)}
                            className="h-7 px-2 text-xs font-semibold gap-1 text-slate-700 hover:text-slate-900 border-slate-300"
                            title={t('নাগরিকের বিস্তারিত তথ্য দেখুন', 'View Citizen Profile')}
                          >
                            <Eye className="size-3" />
                            <span>{t('প্রোফাইল', 'View')}</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLoginAsCitizen(u)}
                            className="h-7 px-2 text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50"
                            title={t('এই নাগরিকের অ্যাকাউন্টে লগইন করে সেবা প্রদান করুন', 'Login into this citizen account')}
                          >
                            <KeyRound className="size-3 mr-1 text-emerald-600" />
                            <span>{t('লগইন', 'Login')}</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Citizen Profile Dialog */}
      <Dialog open={!!selectedCitizen} onOpenChange={(open) => !open && setSelectedCitizen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <BadgeCheck className="size-5 text-emerald-700" />
              <span>{t('নাগরিক প্রোফাইল ও ডিজিটাল ভল্ট বিবরণী', 'Citizen Profile & Digital Vault')}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t('জাতীয় নির্বাচন কমিশন ও ভূমি রেকর্ড যাচাইকৃত পরিচিতি', 'Verified by Election Commission and Land Records Bureau')}
            </DialogDescription>
          </DialogHeader>

          {selectedCitizen && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3.5 rounded-lg border bg-muted/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground">
                    {selectedCitizen.name_bn || selectedCitizen.name || selectedCitizen.username}
                  </span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
                    {t('এনআইডি ভেরিফাইড', 'NID KYC OK')}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                  <div>
                    <span className="font-semibold text-foreground">{t('ইউজারনেম:', 'Username:')}</span> @{selectedCitizen.username}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">{t('রোল:', 'Role:')}</span> {selectedCitizen.role}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">{t('স্মার্ট এনআইডি:', 'Smart NID:')}</span> {selectedCitizen.nid_mock || '১৯৮৭••••৩৪৫৬'}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">{t('মোবাইল:', 'Phone:')}</span> {selectedCitizen.phone_mock || '০১৭••••১২৩৪'}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border space-y-2">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <FileText className="size-4 text-emerald-700" />
                  <span>{t('ডিজিটাল ভূমি ভল্টে সংরক্ষিত তথ্য', 'Protected Land Vault Records')}</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
                    <div className="text-[10px] text-emerald-700 font-bold">{t('মালিকানাধীন খতিয়ান', 'Owned Khatians')}</div>
                    <div className="text-lg font-black text-emerald-900">{toBanglaDigits(2, lang)} {t('টি', '')}</div>
                  </div>
                  <div className="p-2 bg-blue-50 rounded border border-blue-200">
                    <div className="text-[10px] text-blue-700 font-bold">{t('নিবন্ধিত দলিল', 'Registered Deeds')}</div>
                    <div className="text-lg font-black text-blue-900">{toBanglaDigits(1, lang)} {t('টি', '')}</div>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border bg-muted/20 text-[11px] text-muted-foreground flex items-center gap-2">
                <Lock className="size-4 text-emerald-700 shrink-0" />
                <span>
                  {t('নাগরিকের বায়োমেট্রিক ও ব্যক্তিগত তথ্য এনক্রিপ্ট অবস্থায় ডিজিটাল ভল্টে সংরক্ষিত।', 'Citizen biometric and identity records are cryptographically secured.')}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedCitizen(null)}>
              {t('বন্ধ করুন', 'Close')}
            </Button>
            {selectedCitizen && (
              <Button
                size="sm"
                onClick={() => handleLoginAsCitizen(selectedCitizen)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold gap-1"
              >
                <KeyRound className="size-3.5" />
                <span>{t('নাগরিক অ্যাকাউন্টে প্রবেশ করুন', 'Login to Citizen Account')}</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Super Admin Create Citizen Modal */}
      <CreateCitizenDialog
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchUsers}
      />
    </div>
  );
};
