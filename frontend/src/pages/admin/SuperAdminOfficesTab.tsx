import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Users,
  MapPin,
  Phone,
  Layers,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  ExternalLink,
  Shield,
  ShieldAlert,
} from 'lucide-react';
import { BhumiApi } from '../../api/client';
import { toBanglaDigits } from '../../theme/tokens';

interface OfficeRecord {
  id: number;
  office_code: string;
  name_bn: string;
  name_en: string;
  office_type: string;
  division_bn: string;
  division_en: string;
  district_bn: string;
  district_en: string;
  upazila_bn: string;
  upazila_en: string;
  mouzas_served_json?: string;
  address_bn?: string;
  address_en?: string;
  contact_phone?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface StaffRecord {
  id: number;
  user_id: number;
  office_id: number;
  designation_bn?: string;
  is_primary?: number;
  username: string;
  full_name_bn: string;
  role: string;
}

export const SuperAdminOfficesTab: React.FC<{
  t: (bn: string, en: string) => string;
  lang: string;
}> = ({ t, lang }) => {
  const [offices, setOffices] = useState<OfficeRecord[]>([]);
  const [validTypes, setValidTypes] = useState<string[]>([]);
  const [rolesMap, setRolesMap] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ msg: string; err?: boolean } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Staff Modal
  const [inspectOffice, setInspectOffice] = useState<OfficeRecord | null>(null);
  const [inspectStaff, setInspectStaff] = useState<StaffRecord[]>([]);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Edit Modal
  const [editOffice, setEditOffice] = useState<OfficeRecord | null>(null);
  const [editForm, setEditForm] = useState({
    name_bn: '',
    name_en: '',
    office_type: '',
    address_bn: '',
    address_en: '',
    contact_phone: '',
    mouzas_served_json: '',
  });
  const [editLoading, setEditLoading] = useState(false);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    office_code: '',
    name_bn: '',
    name_en: '',
    office_type: 'registry',
    division_bn: 'ঢাকা',
    division_en: 'Dhaka',
    district_bn: 'ঢাকা',
    district_en: 'Dhaka',
    upazila_bn: '',
    upazila_en: '',
    address_bn: '',
    address_en: '',
    contact_phone: '',
    mouzas_served_json: '[]',
  });
  const [createLoading, setCreateLoading] = useState(false);

  // Load Offices
  const fetchOffices = async () => {
    setLoading(true);
    try {
      const res = await BhumiApi.listSetupOffices();
      setOffices(res.offices || []);
      setValidTypes(res.valid_office_types || []);
      setRolesMap(res.roles || {});
    } catch (err: any) {
      setNotice({
        msg: err?.response?.data?.message_bn || err?.message || 'অফিস তালিকা লোড করতে ব্যর্থ হয়েছে।',
        err: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffices();
  }, []);

  // Inspect Staff
  const handleInspectStaff = async (off: OfficeRecord) => {
    setInspectOffice(off);
    setInspectLoading(true);
    try {
      const res = await BhumiApi.getSetupOffice(off.id);
      setInspectStaff(res.staff || []);
    } catch (err: any) {
      setNotice({
        msg: err?.response?.data?.message_bn || 'কর্মকর্তা বিবরণী পাওয়া যায়নি।',
        err: true,
      });
    } finally {
      setInspectLoading(false);
    }
  };

  // Toggle Active
  const handleToggleActive = async (off: OfficeRecord) => {
    const isAct = Number(off.is_active) === 1;
    const confirmMsg = isAct
      ? `আপনি কি নিশ্চিতভাবে "${off.name_bn}" কার্যালয়টি নিষ্ক্রিয় করতে চান? (ইতিহাস সুরক্ষিত থাকবে)`
      : `আপনি কি "${off.name_bn}" কার্যালয়টি পুনরায় সক্রিয় করতে চান?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await BhumiApi.toggleSetupOfficeActive(off.id);
      setNotice({ msg: res.message_bn || 'স্ট্যাটাস পরিবর্তিত হয়েছে।', err: false });
      setOffices((prev) =>
        prev.map((o) => (o.id === off.id ? { ...o, is_active: res.is_active } : o))
      );
    } catch (err: any) {
      setNotice({
        msg: err?.response?.data?.message_bn || 'স্ট্যাটাস পরিবর্তনে ত্রুটি হয়েছে।',
        err: true,
      });
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (off: OfficeRecord) => {
    setEditOffice(off);
    setEditForm({
      name_bn: off.name_bn || '',
      name_en: off.name_en || '',
      office_type: off.office_type || 'registry',
      address_bn: off.address_bn || '',
      address_en: off.address_en || '',
      contact_phone: off.contact_phone || '',
      mouzas_served_json: off.mouzas_served_json || '[]',
    });
  };

  // Submit Edit
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOffice) return;
    setEditLoading(true);
    try {
      const res = await BhumiApi.updateSetupOffice(editOffice.id, editForm);
      setNotice({ msg: res.message_bn || 'কার্যালয়ের তথ্য সংরক্ষিত হয়েছে।', err: false });
      setOffices((prev) => prev.map((o) => (o.id === editOffice.id ? res.office : o)));
      setEditOffice(null);
    } catch (err: any) {
      setNotice({
        msg: err?.response?.data?.message_bn || err?.message || 'তথ্য হালনাগাদে ব্যর্থ হয়েছে।',
        err: true,
      });
    } finally {
      setEditLoading(false);
    }
  };

  // Submit Create
  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await BhumiApi.createSetupOffice(createForm);
      setNotice({ msg: res.message_bn || 'নতুন কার্যালয় নিবন্ধিত হয়েছে।', err: false });
      setOffices((prev) => [...prev, res.office]);
      setCreateModalOpen(false);
      setCreateForm({
        office_code: '',
        name_bn: '',
        name_en: '',
        office_type: 'registry',
        division_bn: 'ঢাকা',
        division_en: 'Dhaka',
        district_bn: 'ঢাকা',
        district_en: 'Dhaka',
        upazila_bn: '',
        upazila_en: '',
        address_bn: '',
        address_en: '',
        contact_phone: '',
        mouzas_served_json: '[]',
      });
    } catch (err: any) {
      setNotice({
        msg: err?.response?.data?.message_bn || err?.message || 'নতুন অফিস যুক্ত করতে ব্যর্থ।',
        err: true,
      });
    } finally {
      setCreateLoading(false);
    }
  };

  // Filtered Offices
  const filteredOffices = offices.filter((off) => {
    if (typeFilter !== 'ALL' && off.office_type !== typeFilter) return false;
    if (districtFilter !== 'ALL' && off.district_bn !== districtFilter && off.district_en !== districtFilter)
      return false;
    if (statusFilter === 'ACTIVE' && Number(off.is_active) !== 1) return false;
    if (statusFilter === 'INACTIVE' && Number(off.is_active) === 1) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        off.office_code.toLowerCase().includes(q) ||
        off.name_bn.toLowerCase().includes(q) ||
        off.name_en.toLowerCase().includes(q) ||
        (off.upazila_bn && off.upazila_bn.toLowerCase().includes(q)) ||
        (off.district_bn && off.district_bn.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const uniqueDistricts = Array.from(new Set(offices.map((o) => o.district_bn))).filter(Boolean);
  const activeCount = offices.filter((o) => Number(o.is_active) === 1).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Notice Banner */}
      {notice && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${
            notice.err
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.err ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{notice.msg}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="text-slate-500 hover:text-slate-800 cursor-pointer ml-3 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Stats Banner */}
      <div className="bg-white border border-[#006A4E]/20 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#006A4E]/10 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#006A4E]/10 text-[#006A4E] flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {t('সারাদেশীয় কার্যালয় ও অধিক্ষেত্র লাইফসাইকেল', 'Nationwide Offices & Jurisdiction Lifecycle')}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t(
                    'সাব-রেজিস্ট্রি, এসি ল্যান্ড, সেটেলমেন্ট ও ডিজিটাল সেবা কেন্দ্রের অফিস কোড, স্থিতি ও দায়িত্বশীল কর্মকর্তা নিয়ন্ত্রণ',
                    'Manage office codes, active state, staff and jurisdictions across Registry, AC Land, Settlement and Service Points'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchOffices}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 hover:bg-slate-50 text-slate-700 transition flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#006A4E]' : ''}`} />
              <span>{t('রিফ্রেশ', 'Refresh')}</span>
            </button>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#006A4E] hover:bg-[#005a42] text-white shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('নতুন অফিস যুক্ত করুন', 'Add New Office')}</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <span className="text-[11px] font-semibold text-slate-500 block">
              {t('মোট নিবন্ধিত কার্যালয়', 'Total Offices')}
            </span>
            <span className="text-2xl font-black text-slate-800 mt-1 block">
              {toBanglaDigits(offices.length)}
            </span>
          </div>
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3">
            <span className="text-[11px] font-semibold text-emerald-700 block">
              {t('সক্রিয় সেবা কেন্দ্র', 'Active Offices')}
            </span>
            <span className="text-2xl font-black text-emerald-800 mt-1 block">
              {toBanglaDigits(activeCount)}
            </span>
          </div>
          <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3">
            <span className="text-[11px] font-semibold text-blue-700 block">
              {t('আওতাভুক্ত জেলা', 'Covered Districts')}
            </span>
            <span className="text-2xl font-black text-blue-800 mt-1 block">
              {toBanglaDigits(uniqueDistricts.length)}
            </span>
          </div>
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3">
            <span className="text-[11px] font-semibold text-amber-700 block">
              {t('অফিসের ধরণসমূহ', 'Office Types')}
            </span>
            <span className="text-2xl font-black text-amber-800 mt-1 block">
              {toBanglaDigits(validTypes.length)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('নাম, কোড, বা উপজেলা খুঁজুন...', 'Search name, code, upazila...')}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#006A4E]/20 focus:border-[#006A4E]"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#006A4E]/20 focus:border-[#006A4E]"
            >
              <option value="ALL">{t('সকল অফিস ধরণ', 'All Office Types')}</option>
              {validTypes.map((vt) => (
                <option key={vt} value={vt}>
                  {vt.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* District Filter */}
          <div>
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#006A4E]/20 focus:border-[#006A4E]"
            >
              <option value="ALL">{t('সকল জেলা', 'All Districts')}</option>
              {uniqueDistricts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#006A4E]/20 focus:border-[#006A4E]"
            >
              <option value="ALL">{t('সকল স্থিতি', 'All Statuses')}</option>
              <option value="ACTIVE">{t('সক্রিয় (Active)', 'Active Only')}</option>
              <option value="INACTIVE">{t('নিষ্ক্রিয় (Inactive)', 'Inactive Only')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Offices Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5">{t('কোড ও নাম', 'Code & Name')}</th>
                <th className="px-4 py-3.5">{t('ধরণ', 'Type')}</th>
                <th className="px-4 py-3.5">{t('অধিক্ষেত্র (জেলা/উপজেলা)', 'Jurisdiction')}</th>
                <th className="px-4 py-3.5">{t('মৌজা কাভারেজ', 'Mouzas')}</th>
                <th className="px-4 py-3.5">{t('স্থিতি', 'Status')}</th>
                <th className="px-4 py-3.5 text-right">{t('অ্যাকশন', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredOffices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    {t('কোনো কার্যালয় পাওয়া যায়নি।', 'No offices found matching your criteria.')}
                  </td>
                </tr>
              ) : (
                filteredOffices.map((off) => {
                  let mouzaCount = 0;
                  try {
                    const parsed = JSON.parse(off.mouzas_served_json || '[]');
                    mouzaCount = Array.isArray(parsed) ? parsed.length : 0;
                  } catch {
                    mouzaCount = 0;
                  }
                  const isAct = Number(off.is_active) === 1;

                  return (
                    <tr key={off.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-bold border border-slate-200">
                            {off.office_code}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 mt-1">{off.name_bn}</div>
                        <div className="text-[11px] text-slate-400">{off.name_en}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            off.office_type === 'registry' || off.office_type === 'sub_registry'
                              ? 'bg-purple-100 text-purple-800'
                              : off.office_type === 'ac_land'
                              ? 'bg-emerald-100 text-emerald-800'
                              : off.office_type === 'settlement'
                              ? 'bg-blue-100 text-blue-800'
                              : off.office_type === 'service_point'
                              ? 'bg-amber-100 text-amber-800'
                              : off.office_type === 'bank' || off.office_type === 'bank_branch'
                              ? 'bg-cyan-100 text-cyan-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {off.office_type.toUpperCase()}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="text-slate-800 font-bold">
                          {off.district_bn}, {off.upazila_bn}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {off.district_en}, {off.upazila_en}
                        </div>
                        {off.contact_phone && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{off.contact_phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          <Layers className="w-3 h-3 text-slate-400" />
                          <span>
                            {mouzaCount > 0
                              ? `${toBanglaDigits(mouzaCount)} টি মৌজা`
                              : t('উপজেলা-ব্যাপী', 'Upazila-wide')}
                          </span>
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isAct
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isAct ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          />
                          {isAct ? t('সক্রিয়', 'Active') : t('নিষ্ক্রিয়', 'Inactive')}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleInspectStaff(off)}
                          title={t('কর্মকর্তা তালিকা', 'View Staff')}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>{t('স্টাফ', 'Staff')}</span>
                        </button>

                        <button
                          onClick={() => handleOpenEdit(off)}
                          title={t('সম্পাদনা', 'Edit Office')}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>{t('সম্পাদনা', 'Edit')}</span>
                        </button>

                        <button
                          onClick={() => handleToggleActive(off)}
                          title={isAct ? t('নিষ্ক্রিয় করুন', 'Deactivate') : t('সক্রিয় করুন', 'Activate')}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition ${
                            isAct
                              ? 'border border-rose-200 text-rose-700 hover:bg-rose-50'
                              : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {isAct ? (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>{t('বন্ধ', 'Disable')}</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{t('চালু', 'Enable')}</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Inspect Staff */}
      {inspectOffice && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#006A4E]" />
                <h3 className="font-bold text-slate-800 text-sm">
                  {inspectOffice.name_bn} - {t('কর্মকর্তা ও কর্মচারী তালিকা', 'Staff Roster')}
                </h3>
              </div>
              <button
                onClick={() => setInspectOffice(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {inspectLoading ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#006A4E] mb-2" />
                {t('লোড হচ্ছে...', 'Loading staff...')}
              </div>
            ) : inspectStaff.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                {t(
                  'এই কার্যালয়ে এখনো কোনো কর্মকর্তা বা কর্মচারীকে পদায়ন করা হয়নি।',
                  'No staff members assigned to this office yet.'
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {inspectStaff.map((st) => (
                  <div
                    key={st.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{st.full_name_bn}</div>
                      <div className="text-[11px] text-slate-400 font-mono">@{st.username}</div>
                      {st.designation_bn && (
                        <div className="text-[11px] text-[#006A4E] font-medium">{st.designation_bn}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
                        {rolesMap[st.role]?.label_bn || st.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectOffice(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                {t('বন্ধ করুন', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Office */}
      {editOffice && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#006A4E]" />
                <h3 className="font-bold text-slate-800 text-sm">
                  {t('কার্যালয় সম্পাদনা', 'Edit Office')} ({editOffice.office_code})
                </h3>
              </div>
              <button
                onClick={() => setEditOffice(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {t('কার্যালয়ের নাম (বাংলা)', 'Name (Bangla)')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name_bn}
                    onChange={(e) => setEditForm({ ...editForm, name_bn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#006A4E]/20"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {t('কার্যালয়ের নাম (ইংরেজি)', 'Name (English)')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name_en}
                    onChange={(e) => setEditForm({ ...editForm, name_en: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#006A4E]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {t('অফিসের ধরণ', 'Office Type')} *
                  </label>
                  <select
                    value={editForm.office_type}
                    onChange={(e) => setEditForm({ ...editForm, office_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#006A4E]/20"
                  >
                    {validTypes.map((vt) => (
                      <option key={vt} value={vt}>
                        {vt.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {t('যোগাযোগের নম্বর', 'Contact Phone')}
                  </label>
                  <input
                    type="text"
                    value={editForm.contact_phone}
                    onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#006A4E]/20"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {t('ঠিকানা (বাংলা)', 'Address (Bangla)')}
                </label>
                <input
                  type="text"
                  value={editForm.address_bn}
                  onChange={(e) => setEditForm({ ...editForm, address_bn: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#006A4E]/20"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {t('আওতাভুক্ত মৌজা আইডি (JSON Array)', 'Mouzas Served (JSON Array)')}
                </label>
                <input
                  type="text"
                  value={editForm.mouzas_served_json}
                  onChange={(e) => setEditForm({ ...editForm, mouzas_served_json: e.target.value })}
                  placeholder="[42, 101, 102]"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-[#006A4E]/20"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditOffice(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  {t('বাতিল', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-[#006A4E] hover:bg-[#005a42] text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {editLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t('হালনাগাদ করুন', 'Save Changes')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create Office */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#006A4E]" />
                <h3 className="font-bold text-slate-800 text-sm">
                  {t('নতুন কার্যালয় নিবন্ধন', 'Register New Office')}
                </h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {t('কার্যালয় কোড (Unique)', 'Office Code')} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="OFF-ACL-CUM-CHANDINA"
                    value={createForm.office_code}
                    onChange={(e) => setCreateForm({ ...createForm, office_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-[#006A4E]/20"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {t('অফিসের ধরণ', 'Office Type')} *
                  </label>
                  <select
                    value={createForm.office_type}
                    onChange={(e) => setCreateForm({ ...createForm, office_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#006A4E]/20"
                  >
                    {validTypes.map((vt) => (
                      <option key={vt} value={vt}>
                        {vt.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {t('কার্যালয়ের নাম (বাংলা)', 'Name (Bangla)')} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="উপজেলা ভূমি অফিস..."
                    value={createForm.name_bn}
                    onChange={(e) => setCreateForm({ ...createForm, name_bn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#006A4E]/20"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {t('কার্যালয়ের নাম (ইংরেজি)', 'Name (English)')} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Upazila Land Office..."
                    value={createForm.name_en}
                    onChange={(e) => setCreateForm({ ...createForm, name_en: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#006A4E]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {t('জেলা (বাংলা)', 'District (Bangla)')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.district_bn}
                    onChange={(e) => setCreateForm({ ...createForm, district_bn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#006A4E]/20"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {t('উপজেলা (বাংলা)', 'Upazila (Bangla)')} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="দাউদকান্দি"
                    value={createForm.upazila_bn}
                    onChange={(e) => setCreateForm({ ...createForm, upazila_bn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#006A4E]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {t('যোগাযোগের নম্বর', 'Contact Phone')}
                  </label>
                  <input
                    type="text"
                    value={createForm.contact_phone}
                    onChange={(e) => setCreateForm({ ...createForm, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#006A4E]/20"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {t('আওতাভুক্ত মৌজা আইডি (JSON)', 'Mouzas Served (JSON)')}
                  </label>
                  <input
                    type="text"
                    value={createForm.mouzas_served_json}
                    onChange={(e) => setCreateForm({ ...createForm, mouzas_served_json: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-[#006A4E]/20"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {t('ঠিকানা (বাংলা)', 'Address (Bangla)')}
                </label>
                <input
                  type="text"
                  value={createForm.address_bn}
                  onChange={(e) => setCreateForm({ ...createForm, address_bn: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#006A4E]/20"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  {t('বাতিল', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-[#006A4E] hover:bg-[#005a42] text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {createLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t('অফিস সংরক্ষণ করুন', 'Create Office')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
