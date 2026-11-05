import React, { useState, useEffect } from 'react';
import {
  Scale,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  Copy,
  ShieldCheck,
  ShieldAlert,
  FileText,
  UserCheck,
  Building,
} from 'lucide-react';
import { BhumiApi, AuthorizedLawyerItem } from '../../api/client';
import { toBanglaDigits, maskPhone } from '../../theme/tokens';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';

export const SuperAdminLawyersTab: React.FC<{
  t: (bn: string, en: string) => string;
  lang: string;
}> = ({ t }) => {
  const [lawyers, setLawyers] = useState<AuthorizedLawyerItem[]>([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    cases_filed: 0,
  });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ msg: string; err?: boolean } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [copiedBar, setCopiedBar] = useState<string | null>(null);

  // Create / Edit Modal
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [activeLawyer, setActiveLawyer] = useState<AuthorizedLawyerItem | null>(null);
  const [form, setForm] = useState({
    bar_council_no: '',
    lawyer_name_bn: '',
    lawyer_name_en: '',
    district_bar: 'ঢাকা জেলা বার অ্যাসোসিয়েশন',
    nid: '',
    phone: '',
    email: '',
    chamber_address_bn: '',
    status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED',
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<AuthorizedLawyerItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchLawyers = async () => {
    setLoading(true);
    try {
      const res = await BhumiApi.listAdminLawyers({
        search: searchQuery,
        status: statusFilter,
      });
      setLawyers(res.items || []);
      if (res.metrics) {
        setMetrics(res.metrics);
      }
    } catch (err: any) {
      setNotice({
        msg: err.response?.data?.message_bn || t('আইনজীবী তালিকা লোড করতে ব্যর্থ হয়েছে।', 'Failed to load lawyer directory.'),
        err: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLawyers();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLawyers();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBar(text);
    setTimeout(() => setCopiedBar(null), 2000);
  };

  const openCreateModal = () => {
    setForm({
      bar_council_no: '',
      lawyer_name_bn: '',
      lawyer_name_en: '',
      district_bar: 'ঢাকা জেলা বার অ্যাসোসিয়েশন',
      nid: '',
      phone: '',
      email: '',
      chamber_address_bn: '',
      status: 'ACTIVE',
    });
    setActiveLawyer(null);
    setModalMode('create');
  };

  const openEditModal = (lawyer: AuthorizedLawyerItem) => {
    setForm({
      bar_council_no: lawyer.bar_council_no,
      lawyer_name_bn: lawyer.lawyer_name_bn,
      lawyer_name_en: lawyer.lawyer_name_en || '',
      district_bar: lawyer.district_bar,
      nid: lawyer.nid || '',
      phone: lawyer.phone || '',
      email: lawyer.email || '',
      chamber_address_bn: lawyer.chamber_address_bn || '',
      status: lawyer.status,
    });
    setActiveLawyer(lawyer);
    setModalMode('edit');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setNotice(null);

    try {
      if (modalMode === 'create') {
        const res = await BhumiApi.createAdminLawyer(form);
        setNotice({ msg: res.message_bn });
      } else if (modalMode === 'edit' && activeLawyer) {
        const res = await BhumiApi.updateAdminLawyer(activeLawyer.id, form);
        setNotice({ msg: res.message_bn });
      }
      setModalMode(null);
      fetchLawyers();
    } catch (err: any) {
      setNotice({
        msg: err.response?.data?.message_bn || t('অপারেশন সম্পন্ন করতে সমস্যা হয়েছে।', 'Failed to save lawyer data.'),
        err: true,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (lawyer: AuthorizedLawyerItem) => {
    const nextStatus = lawyer.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await BhumiApi.updateAdminLawyer(lawyer.id, { status: nextStatus });
      setNotice({ msg: res.message_bn });
      fetchLawyers();
    } catch (err: any) {
      setNotice({
        msg: err.response?.data?.message_bn || t('স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।', 'Failed to change license status.'),
        err: true,
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await BhumiApi.deleteAdminLawyer(deleteTarget.id);
      setNotice({ msg: res.message_bn });
      setDeleteTarget(null);
      fetchLawyers();
    } catch (err: any) {
      setNotice({
        msg: err.response?.data?.message_bn || t('রেকর্ড মুছতে ব্যর্থ হয়েছে।', 'Failed to delete lawyer record.'),
        err: true,
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      {notice && (
        <Alert
          className={`flex items-center justify-between text-xs font-bold rounded-xl border ${
            notice.err ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.err ? <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            <AlertDescription className="text-xs font-bold">{notice.msg}</AlertDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setNotice(null)} className="h-6 w-6 p-0 text-slate-500 hover:text-slate-800">
            <X className="w-4 h-4" />
          </Button>
        </Alert>
      )}

      {/* Header & Metrics */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                {t('অনুমোদিত আইনজীবী রেজিস্ট্রি ও কেস ফিলিং ম্যানেজমেন্ট', 'Authorized Advocate Registry & Case Filing Hub')}
                <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-800 font-bold text-[11px]">
                  বাংলাদেশ বার কাউন্সিল
                </Badge>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t(
                  'পেশাদার আইনজীবীদের সনদ যাচাইকরণ, কেস দাখিল অনুমোদন এবং লাইসেন্স নিয়ন্ত্রণ প্যানেল',
                  'Bar Council advocate license verification, case filing authority, and regulatory controls'
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchLawyers}
              disabled={loading}
              className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600 shadow-2xs"
              title={t('তাজা করুন', 'Refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </Button>
            <Button
              onClick={openCreateModal}
              className="rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t('নতুন আইনজীবী নিবন্ধন', 'Register Advocate')}</span>
            </Button>
          </div>
        </div>

        {/* 4 Metric Badges */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {t('মোট নিবন্ধিত আইনজীবী', 'Total Registered')}
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {toBanglaDigits(metrics.total)} <span className="text-xs font-semibold text-slate-500">জন</span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t('সক্রিয় সনদপ্রাপ্ত', 'Active Licenses')}
            </div>
            <div className="text-2xl font-black text-emerald-800 mt-1">
              {toBanglaDigits(metrics.active)} <span className="text-xs font-semibold text-emerald-600">জন</span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200">
            <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              {t('স্থগিত / নিষিদ্ধ সনদ', 'Suspended Licenses')}
            </div>
            <div className="text-2xl font-black text-rose-800 mt-1">
              {toBanglaDigits(metrics.suspended)} <span className="text-xs font-semibold text-rose-600">জন</span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200">
            <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              {t('দাখিলকৃত মোকদ্দমা', 'Court Cases Filed')}
            </div>
            <div className="text-2xl font-black text-indigo-800 mt-1">
              {toBanglaDigits(metrics.cases_filed)} <span className="text-xs font-semibold text-indigo-600">টি</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 z-10" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(
              'বার কাউন্সিল নং (যেমন BC-DH-14285), নাম অথবা জেলা বার দিয়ে খুঁজুন...',
              'Search by Bar Council No (e.g. BC-DH-14285), Advocate Name, or Bar...'
            )}
            className="w-full pl-10 pr-4 py-2.5 h-10 bg-slate-50 border-slate-200 rounded-xl text-xs font-medium focus-visible:ring-2 focus-visible:ring-indigo-500/20"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <Button
              type="button"
              variant={statusFilter === 'ALL' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 h-8 rounded-lg ${
                statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs hover:bg-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t('সকল', 'All')}
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'ACTIVE' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 h-8 rounded-lg flex items-center gap-1 ${
                statusFilter === 'ACTIVE' ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-600' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              {t('সক্রিয়', 'Active')}
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'SUSPENDED' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('SUSPENDED')}
              className={`px-3 py-1.5 h-8 rounded-lg flex items-center gap-1 ${
                statusFilter === 'SUSPENDED' ? 'bg-rose-600 text-white shadow-xs hover:bg-rose-600' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <XCircle className="w-3 h-3" />
              {t('স্থগিত', 'Suspended')}
            </Button>
          </div>
        </div>
      </div>

      {/* Lawyer Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-280px)] min-h-[300px] scrollbar-thin">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow>
                <TableHead className="py-3 px-4 uppercase tracking-wider text-[10px] font-bold text-slate-500">{t('বার কাউন্সিল লাইসেন্স নং', 'Bar Council License')}</TableHead>
                <TableHead className="py-3 px-4 uppercase tracking-wider text-[10px] font-bold text-slate-500">{t('আইনজীবীর নাম ও চেম্বার', 'Advocate & Chamber')}</TableHead>
                <TableHead className="py-3 px-4 uppercase tracking-wider text-[10px] font-bold text-slate-500">{t('জেলা বার অ্যাসোসিয়েশন', 'District Bar')}</TableHead>
                <TableHead className="py-3 px-4 uppercase tracking-wider text-[10px] font-bold text-slate-500">{t('যোগাযোগের তথ্য', 'Contact Details')}</TableHead>
                <TableHead className="py-3 px-4 uppercase tracking-wider text-[10px] font-bold text-slate-500 text-center">{t('সনদ স্ট্যাটাস', 'License Status')}</TableHead>
                <TableHead className="py-3 px-4 uppercase tracking-wider text-[10px] font-bold text-slate-500 text-right">{t('অ্যাকশন', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>{t('আইনজীবী তথ্য লোড হচ্ছে...', 'Loading lawyer directory...')}</span>
                  </TableCell>
                </TableRow>
              ) : lawyers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-slate-400">
                    <Scale className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">{t('কোনো আইনজীবী রেকর্ড পাওয়া যায়নি', 'No advocates found')}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{t('অনুসন্ধান ফিল্টার পরিবর্তন করুন অথবা নতুন যোগ করুন।', 'Adjust filters or add a new record.')}</p>
                  </TableCell>
                </TableRow>
              ) : (
                lawyers.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/80 transition group">
                    <TableCell className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-indigo-900 font-mono text-[11px]">
                          {item.bar_council_no}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(item.bar_council_no)}
                          className="h-6 w-6 text-slate-400 hover:text-indigo-600 p-0"
                          title={t('কপি করুন', 'Copy')}
                        >
                          {copiedBar === item.bar_council_no ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-indigo-600" />
                        <span>{item.lawyer_name_bn}</span>
                      </div>
                      {item.lawyer_name_en && (
                        <div className="text-[11px] text-slate-500 font-medium">{item.lawyer_name_en}</div>
                      )}
                      {item.chamber_address_bn && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-xs">{item.chamber_address_bn}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5 px-4">
                      <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.district_bar}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-[11px]">
                      {item.phone && (
                        <div className="text-slate-700 flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{maskPhone(item.phone)}</span>
                        </div>
                      )}
                      {item.email && (
                        <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{item.email}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-center">
                      {item.status === 'ACTIVE' ? (
                        <Badge variant="outline" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                          {t('সক্রিয় সনদ', 'ACTIVE')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                          {t('স্থগিত / নিষিদ্ধ', 'SUSPENDED')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleToggleStatus(item)}
                          className={`h-7 w-7 rounded-lg text-xs font-bold ${
                            item.status === 'ACTIVE'
                              ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                          title={
                            item.status === 'ACTIVE'
                              ? t('সনদ স্থগিত করুন (Suspend License)', 'Suspend License')
                              : t('সনদ সক্রিয় করুন (Activate License)', 'Activate License')
                          }
                        >
                          {item.status === 'ACTIVE' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditModal(item)}
                          className="h-7 w-7 rounded-lg border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:border-indigo-300"
                          title={t('তথ্য সংশোধন করুন', 'Edit')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setDeleteTarget(item)}
                          className="h-7 w-7 rounded-lg border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:border-rose-300"
                          title={t('মুছে ফেলুন', 'Delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={!!modalMode} onOpenChange={(open) => !open && setModalMode(null)}>
        {modalMode && (
          <DialogContent className="sm:max-w-lg p-0 overflow-hidden border border-slate-200 rounded-2xl shadow-xl">
            <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-indigo-600" />
                <DialogTitle className="font-bold text-slate-900 text-base">
                  {modalMode === 'create'
                    ? t('নতুন অনুমোদিত আইনজীবী নিবন্ধন', 'Register Authorized Advocate')
                    : t('আইনজীবীর তথ্য সম্পাদনা', 'Edit Advocate Details')}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500">
                {t('বার কাউন্সিল সনদপত্র ও পরিচিতি বিবরণ দিন', 'Enter bar council registration and practice credentials')}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <Label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('বার কাউন্সিল লাইসেন্স / সনদ নম্বর *', 'Bar Council License No *')}
                </Label>
                <Input
                  type="text"
                  required
                  disabled={modalMode === 'edit'}
                  value={form.bar_council_no}
                  onChange={(e) => setForm({ ...form, bar_council_no: e.target.value.toUpperCase() })}
                  placeholder="যেমন: BC-DH-14285"
                  className="w-full text-xs font-mono font-bold uppercase disabled:bg-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('আইনজীবীর নাম (বাংলায়) *', 'Advocate Name (Bengali) *')}
                  </Label>
                  <Input
                    type="text"
                    required
                    value={form.lawyer_name_bn}
                    onChange={(e) => setForm({ ...form, lawyer_name_bn: e.target.value })}
                    placeholder="ব্যারিস্টার মো. নাজমুল হুদা"
                    className="w-full text-xs font-medium"
                  />
                </div>
                <div>
                  <Label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('আইনজীবীর নাম (ইংরেজিতে)', 'Advocate Name (English)')}
                  </Label>
                  <Input
                    type="text"
                    value={form.lawyer_name_en}
                    onChange={(e) => setForm({ ...form, lawyer_name_en: e.target.value })}
                    placeholder="Barrister Md. Nazmul Huda"
                    className="w-full text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('জেলা বার অ্যাসোসিয়েশন *', 'District Bar Association *')}
                  </Label>
                  <Select value={form.district_bar} onValueChange={(val) => setForm({ ...form, district_bar: val })}>
                    <SelectTrigger className="w-full text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ঢাকা জেলা বার অ্যাসোসিয়েশন">ঢাকা জেলা বার অ্যাসোসিয়েশন</SelectItem>
                      <SelectItem value="কুমিল্লা জেলা বার অ্যাসোসিয়েশন">কুমিল্লা জেলা বার অ্যাসোসিয়েশন</SelectItem>
                      <SelectItem value="চট্টগ্রাম জেলা বার অ্যাসোসিয়েশন">চট্টগ্রাম জেলা বার অ্যাসোসিয়েশন</SelectItem>
                      <SelectItem value="সিলেট জেলা বার অ্যাসোসিয়েশন">সিলেট জেলা বার অ্যাসোসিয়েশন</SelectItem>
                      <SelectItem value="রাজশাহী জেলা বার অ্যাসোসিয়েশন">রাজশাহী জেলা বার অ্যাসোসিয়েশন</SelectItem>
                      <SelectItem value="খুলনা জেলা বার অ্যাসোসিয়েশন">খুলনা জেলা বার অ্যাসোসিয়েশন</SelectItem>
                      <SelectItem value="বগুড়া জেলা বার অ্যাসোসিয়েশন">বগুড়া জেলা বার অ্যাসোসিয়েশন</SelectItem>
                      <SelectItem value="সুপ্রিম কোর্ট বার অ্যাসোসিয়েশন">সুপ্রিম কোর্ট বার অ্যাসোসিয়েশন</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('লাইসেন্স স্ট্যাটাস', 'License Status')}
                  </Label>
                  <Select value={form.status} onValueChange={(val: any) => setForm({ ...form, status: val })}>
                    <SelectTrigger className="w-full text-xs font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">সক্রিয় (ACTIVE - মামলা দাখিলের অনুমতিপ্রাপ্ত)</SelectItem>
                      <SelectItem value="SUSPENDED">স্থগিত (SUSPENDED - নিষিদ্ধ/তদন্তাধীন)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('মোবাইল নম্বর', 'Mobile Phone')}
                  </Label>
                  <Input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="01711-XXXXXX"
                    className="w-full text-xs font-mono font-medium"
                  />
                </div>
                <div>
                  <Label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('ইমেইল', 'Email')}
                  </Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="advocate@dhakabar.org.bd"
                    className="w-full text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <Label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('চেম্বার ও কার্যালয়ের ঠিকানা (বাংলায়)', 'Chamber Address (Bengali)')}
                </Label>
                <Input
                  type="text"
                  value={form.chamber_address_bn}
                  onChange={(e) => setForm({ ...form, chamber_address_bn: e.target.value })}
                  placeholder="কক্ষ নং ২০৪, আইনজীবী সমিতি ভবন, ঢাকা জজ কোর্ট"
                  className="w-full text-xs font-medium"
                />
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalMode(null)}
                  className="border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  {t('বাতিল', 'Cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{modalMode === 'create' ? t('সংরক্ষণ করুন', 'Save Lawyer') : t('হালনাগাদ করুন', 'Update Lawyer')}</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        {deleteTarget && (
          <DialogContent className="sm:max-w-md p-6 text-center rounded-2xl border-rose-200 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <DialogHeader className="text-center sm:text-center">
              <DialogTitle className="font-bold text-slate-900 text-base text-center">
                {t('আইনজীবী রেকর্ড স্থায়ীভাবে মুছে ফেলতে চান?', 'Delete Advocate Record?')}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-2 leading-relaxed text-center">
                আইনজীবী <span className="font-bold text-slate-800">{deleteTarget.lawyer_name_bn}</span> (লাইসেন্স নং:{' '}
                <span className="font-mono font-bold text-slate-800">{deleteTarget.bar_council_no}</span>) এর তথ্য
                রেজিস্টার থেকে স্থায়ীভাবে অপসারিত হবে।
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6 flex sm:justify-center items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                className="border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                {t('না, বাতিল', 'No, Cancel')}
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                {deleteLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{t('হ্যাঁ, মুছে ফেলুন', 'Yes, Delete')}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};
