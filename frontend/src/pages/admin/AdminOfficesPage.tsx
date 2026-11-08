import React, { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Edit2, Eye, MapPin, MoreHorizontal, Plus, Power, RotateCcw, Users, XCircle } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { toBanglaDigits } from '@/theme/tokens';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AdminPage,
  ConfirmDialog,
  DataTable,
  DetailList,
  DetailSheet,
  EmptyRow,
  EmptyState,
  Field,
  FormDialog,
  LoadingRows,
  PageToolbar,
  Section,
  StatCard,
  StatGrid,
  StatusCode,
  inputCls,
  notify,
  useCreateIntent,
} from '@/components/admin/kit';

export interface OfficeRecord {
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
  created_at?: string;
  updated_at?: string;
}

export interface StaffRecord {
  id: number;
  user_id: number;
  office_id: number;
  designation_bn?: string;
  is_primary?: number;
  username: string;
  full_name_bn: string;
  role: string;
}

const OFFICE_TYPE_LABELS: Record<string, [string, string]> = {
  registry: ['রেজিস্ট্রি অফিস', 'Registry office'],
  sub_registry: ['সাব-রেজিস্ট্রি অফিস', 'Sub-registry office'],
  ac_land: ['উপজেলা ভূমি অফিস', 'Upazila land office'],
  settlement: ['সেটেলমেন্ট অফিস', 'Settlement office'],
  service_point: ['ডিজিটাল সেন্টার', 'Digital centre'],
  bank: ['ব্যাংক', 'Bank'],
  bank_branch: ['ব্যাংক শাখা', 'Bank branch'],
  admin_cell: ['অ্যাডমিন সেল', 'Admin cell'],
  supervision: ['তদারকি অফিস', 'Supervision office'],
  platform: ['প্ল্যাটফর্ম', 'Platform'],
};

const isActive = (o: OfficeRecord) => Number(o.is_active) === 1;

const EMPTY_CREATE = {
  office_code: '',
  name_bn: '',
  name_en: '',
  office_type: '',
  division_bn: '',
  division_en: '',
  district_bn: '',
  district_en: '',
  upazila_bn: '',
  upazila_en: '',
  address_bn: '',
  address_en: '',
  contact_phone: '',
  mouzas_served_json: '[]',
};
type CreateForm = typeof EMPTY_CREATE;

type EditForm = {
  name_bn: string;
  name_en: string;
  office_type: string;
  address_bn: string;
  address_en: string;
  contact_phone: string;
  mouzas_served_json: string;
};

/** Mouza list must be a JSON array (backend stores it as given). */
const validMouzas = (v: string) => {
  if (!v.trim()) return true;
  try {
    return Array.isArray(JSON.parse(v));
  } catch {
    return false;
  }
};

const mouzaCount = (v?: string) => {
  try {
    const a = JSON.parse(v || '[]');
    return Array.isArray(a) ? a.length : 0;
  } catch {
    return 0;
  }
};

export const AdminOfficesPage: React.FC = () => {
  const { lang, t } = useAppUI();
  const n = (v: number) => toBanglaDigits(v, lang);
  const typeLabel = (k: string) => OFFICE_TYPE_LABELS[k]?.[lang === 'bn' ? 0 : 1] || k.replace(/_/g, ' ');

  const [offices, setOffices] = useState<OfficeRecord[]>([]);
  const [validTypes, setValidTypes] = useState<string[]>([]);
  const [rolesMap, setRolesMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Detail sheet
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState('info');
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [creating, setCreating] = useState(false);

  // Edit
  const [editOffice, setEditOffice] = useState<OfficeRecord | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  // Toggle
  const [toggleOffice, setToggleOffice] = useState<OfficeRecord | null>(null);

  const fetchOffices = async () => {
    setLoading(true);
    try {
      const res = await BhumiApi.listSetupOffices();
      setOffices(res.offices || []);
      setValidTypes(res.valid_office_types || []);
      setRolesMap(res.roles || {});
    } catch (err) {
      notify.err(err, lang, t('অফিসের তালিকা আনা যায়নি', 'Could not load offices'));
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async (id: number) => {
    setStaffLoading(true);
    try {
      const res = await BhumiApi.getSetupOffice(id);
      setStaff(res.staff || []);
      if (res.office) setOffices((prev) => prev.map((o) => (o.id === id ? res.office : o)));
    } catch (err) {
      setStaff([]);
      notify.err(err, lang, t('কর্মীর তালিকা আনা যায়নি', 'Could not load staff'));
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    fetchOffices();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setCreateForm({ ...EMPTY_CREATE, office_type: validTypes[0] || '' });
    setCreateOpen(true);
  };
  useCreateIntent(openCreate);

  // valid_office_types may arrive after the dialog opened from a quick action.
  useEffect(() => {
    if (createOpen && !createForm.office_type && validTypes[0]) {
      setCreateForm((f) => ({ ...f, office_type: validTypes[0] }));
    }
  }, [createOpen, validTypes, createForm.office_type]);

  const openDetail = (o: OfficeRecord, tab = 'info') => {
    setDetailId(o.id);
    setDetailTab(tab);
    setStaff([]);
    loadStaff(o.id);
  };

  const openEdit = (o: OfficeRecord) => {
    setEditOffice(o);
    setEditForm({
      name_bn: o.name_bn || '',
      name_en: o.name_en || '',
      office_type: validTypes.includes(o.office_type) ? o.office_type : validTypes[0] || o.office_type,
      address_bn: o.address_bn || '',
      address_en: o.address_en || '',
      contact_phone: o.contact_phone || '',
      mouzas_served_json: o.mouzas_served_json || '[]',
    });
  };

  const submitCreate = async () => {
    setCreating(true);
    try {
      const payload = Object.fromEntries(Object.entries(createForm).map(([k, v]) => [k, v.trim()])) as CreateForm;
      if (!payload.mouzas_served_json) payload.mouzas_served_json = '[]';
      const res = await BhumiApi.createSetupOffice(payload);
      notify.ok(t(res.message_bn || 'অফিস যোগ হয়েছে', 'Office created'));
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
      await fetchOffices();
    } catch (err) {
      notify.err(err, lang);
    } finally {
      setCreating(false);
    }
  };

  const submitEdit = async () => {
    if (!editOffice || !editForm) return;
    setSaving(true);
    try {
      const res = await BhumiApi.updateSetupOffice(editOffice.id, {
        ...editForm,
        mouzas_served_json: editForm.mouzas_served_json.trim() || '[]',
      });
      notify.ok(t(res.message_bn || 'সংরক্ষণ হয়েছে', 'Saved'));
      setEditOffice(null);
      await fetchOffices();
      if (detailId === editOffice.id) loadStaff(editOffice.id);
    } catch (err) {
      notify.err(err, lang);
    } finally {
      setSaving(false);
    }
  };

  const confirmToggle = async () => {
    if (!toggleOffice) return;
    try {
      const res = await BhumiApi.toggleSetupOfficeActive(toggleOffice.id);
      const nowActive = Number(res.is_active) === 1;
      notify.ok(t(res.message_bn || (nowActive ? 'চালু হয়েছে' : 'বন্ধ হয়েছে'), nowActive ? 'Office enabled' : 'Office disabled'));
      await fetchOffices();
    } catch (err) {
      notify.err(err, lang);
      throw err;
    }
  };

  const districts = useMemo(
    () => Array.from(new Set(offices.map((o) => o.district_bn).filter(Boolean))).sort(),
    [offices]
  );
  const activeCount = offices.filter(isActive).length;

  const filtered = offices.filter((o) => {
    if (typeFilter !== 'ALL' && o.office_type !== typeFilter) return false;
    if (districtFilter !== 'ALL' && o.district_bn !== districtFilter) return false;
    if (statusFilter === 'ACTIVE' && !isActive(o)) return false;
    if (statusFilter === 'INACTIVE' && isActive(o)) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [o.office_code, o.name_bn, o.name_en, o.upazila_bn, o.upazila_en, o.district_bn, o.district_en].some((v) =>
      (v || '').toLowerCase().includes(q)
    );
  });

  const detail = offices.find((o) => o.id === detailId) || null;
  const cols = 5;

  const setC = (k: keyof CreateForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCreateForm((f) => ({ ...f, [k]: e.target.value }));
  const setE = (k: keyof EditForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  const typeSelect = (value: string, onChange: (v: string) => void) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-full rounded-lg text-sm">
        <SelectValue placeholder={t('ধরন বাছুন', 'Choose type')} />
      </SelectTrigger>
      <SelectContent>
        {validTypes.map((vt) => (
          <SelectItem key={vt} value={vt}>
            {typeLabel(vt)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const createRequiredMissing =
    ['office_code', 'name_bn', 'name_en', 'office_type', 'division_bn', 'division_en', 'district_bn', 'district_en', 'upazila_bn', 'upazila_en'].some(
      (k) => !createForm[k as keyof CreateForm].trim()
    ) || !validMouzas(createForm.mouzas_served_json);

  const editInvalid = !editForm || !editForm.name_bn.trim() || !editForm.name_en.trim() || !editForm.office_type || !validMouzas(editForm.mouzas_served_json);

  return (
    <AdminPage fill>
      <StatGrid>
        <StatCard
          label={t('মোট অফিস', 'Offices')}
          value={loading ? '—' : n(offices.length)}
          icon={Building2}
          tone="slate"
          onClick={() => setStatusFilter('ALL')}
          active={statusFilter === 'ALL'}
        />
        <StatCard
          label={t('চালু', 'Active')}
          value={loading ? '—' : n(activeCount)}
          icon={CheckCircle2}
          tone="green"
          onClick={() => setStatusFilter('ACTIVE')}
          active={statusFilter === 'ACTIVE'}
        />
        <StatCard
          label={t('বন্ধ', 'Inactive')}
          value={loading ? '—' : n(offices.length - activeCount)}
          icon={XCircle}
          tone="red"
          onClick={() => setStatusFilter('INACTIVE')}
          active={statusFilter === 'INACTIVE'}
        />
        <StatCard label={t('জেলা', 'Districts')} value={loading ? '—' : n(districts.length)} icon={MapPin} tone="blue" />
      </StatGrid>

      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('নাম বা কোড…', 'Name or code…')}
        filters={
          <>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-44 rounded-lg text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('সব ধরন', 'All types')}</SelectItem>
                {validTypes.map((vt) => (
                  <SelectItem key={vt} value={vt}>
                    {typeLabel(vt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger className="h-9 w-36 rounded-lg text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('সব জেলা', 'All districts')}</SelectItem>
                {districts.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={fetchOffices} disabled={loading}>
              <RotateCcw className={cn('size-4', loading && 'animate-spin')} />
              {t('রিফ্রেশ', 'Refresh')}
            </Button>
            <Button size="sm" className="h-9 gap-1.5" onClick={openCreate}>
              <Plus className="size-4" />
              {t('নতুন অফিস', 'New office')}
            </Button>
          </>
        }
      />

      <Section fill
        title={t('অফিসসমূহ', 'Offices')}
        action={!loading && <span className="text-xs text-slate-500">{n(filtered.length)}</span>}
      >
        <DataTable
          headers={[t('অফিস', 'Office'), t('ধরন', 'Type'), t('এলাকা', 'Area'), t('অবস্থা', 'Status'), '']}
          alignRight={[4]}
        >
          {loading ? (
            <LoadingRows cols={cols} />
          ) : filtered.length === 0 ? (
            <EmptyRow
              cols={cols}
              text={t('কোনো অফিস পাওয়া যায়নি', 'No offices found')}
              action={
                offices.length === 0 ? (
                  <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={openCreate}>
                    <Plus className="size-4" />
                    {t('নতুন অফিস', 'New office')}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            filtered.map((o) => (
              <tr key={o.id} className="cursor-pointer" onClick={() => openDetail(o)}>
                <td className="max-w-xs">
                  <div className="truncate font-medium text-slate-800">{lang === 'bn' ? o.name_bn : o.name_en || o.name_bn}</div>
                  <div className="truncate font-mono text-xs text-slate-500">{o.office_code}</div>
                </td>
                <td className="whitespace-nowrap text-slate-700">{typeLabel(o.office_type)}</td>
                <td>
                  <div className="text-slate-700">
                    {lang === 'bn' ? [o.upazila_bn, o.district_bn].filter(Boolean).join(', ') : [o.upazila_en, o.district_en].filter(Boolean).join(', ')}
                  </div>
                  <div className="text-xs text-slate-500">{lang === 'bn' ? o.division_bn : o.division_en}</div>
                </td>
                <td>
                  <StatusCode code={isActive(o) ? 'ACTIVE' : 'INACTIVE'} lang={lang} />
                </td>
                <td className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8" aria-label={t('আরও', 'More')}>
                        <MoreHorizontal className="size-4 text-slate-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => openDetail(o)}>
                        <Eye className="size-4" />
                        {t('বিস্তারিত', 'Details')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDetail(o, 'staff')}>
                        <Users className="size-4" />
                        {t('কর্মী', 'Staff')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(o)}>
                        <Edit2 className="size-4" />
                        {t('সম্পাদনা', 'Edit')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setToggleOffice(o)}
                        className={isActive(o) ? 'text-rose-600 focus:text-rose-700' : 'text-emerald-700 focus:text-emerald-800'}
                      >
                        <Power className="size-4" />
                        {isActive(o) ? t('বন্ধ করুন', 'Disable') : t('চালু করুন', 'Enable')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))
          )}
        </DataTable>
      </Section>

      {/* Office detail */}
      <DetailSheet
        open={!!detail}
        onOpenChange={(o) => !o && setDetailId(null)}
        title={detail ? (lang === 'bn' ? detail.name_bn : detail.name_en || detail.name_bn) : ''}
        subtitle={detail ? typeLabel(detail.office_type) : undefined}
        footer={
          detail && (
            <>
              <Button
                variant="outline"
                size="sm"
                className={cn('h-9 gap-1.5', isActive(detail) ? 'text-rose-600 hover:text-rose-700' : 'text-emerald-700')}
                onClick={() => setToggleOffice(detail)}
              >
                <Power className="size-4" />
                {isActive(detail) ? t('বন্ধ করুন', 'Disable') : t('চালু করুন', 'Enable')}
              </Button>
              <Button size="sm" className="h-9 gap-1.5" onClick={() => openEdit(detail)}>
                <Edit2 className="size-4" />
                {t('সম্পাদনা', 'Edit')}
              </Button>
            </>
          )
        }
      >
        {detail && (
          <Tabs value={detailTab} onValueChange={setDetailTab}>
            <TabsList className="h-9 w-full">
              <TabsTrigger value="info" className="flex-1">
                {t('তথ্য', 'Info')}
              </TabsTrigger>
              <TabsTrigger value="staff" className="flex-1">
                {t('কর্মী', 'Staff')}
                {!staffLoading && staff.length > 0 && <span className="ml-1 text-xs text-slate-500">{n(staff.length)}</span>}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="mt-3">
              <DetailList
                items={[
                  [t('কোড', 'Code'), <span className="font-mono text-xs">{detail.office_code}</span>],
                  [t('অবস্থা', 'Status'), <StatusCode code={isActive(detail) ? 'ACTIVE' : 'INACTIVE'} lang={lang} />],
                  [t('ধরন', 'Type'), typeLabel(detail.office_type)],
                  [t('বাংলা নাম', 'Bangla name'), detail.name_bn || '—'],
                  [t('ইংরেজি নাম', 'English name'), detail.name_en || '—'],
                  [t('বিভাগ', 'Division'), (lang === 'bn' ? detail.division_bn : detail.division_en) || '—'],
                  [t('জেলা', 'District'), (lang === 'bn' ? detail.district_bn : detail.district_en) || '—'],
                  [t('উপজেলা', 'Upazila'), (lang === 'bn' ? detail.upazila_bn : detail.upazila_en) || '—'],
                  [t('ফোন', 'Phone'), detail.contact_phone || '—'],
                  [t('ঠিকানা', 'Address'), (lang === 'bn' ? detail.address_bn || detail.address_en : detail.address_en || detail.address_bn) || '—'],
                  [t('মৌজা', 'Mouzas'), n(mouzaCount(detail.mouzas_served_json))],
                ]}
              />
            </TabsContent>
            <TabsContent value="staff" className="mt-3">
              {staffLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
                  ))}
                </div>
              ) : staff.length === 0 ? (
                <EmptyState icon={Users} text={t('কোনো কর্মী নেই', 'No staff yet')} />
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {staff.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-800">{s.full_name_bn || s.username}</div>
                        <div className="truncate text-xs text-slate-500">
                          @{s.username}
                          {s.designation_bn ? ` · ${s.designation_bn}` : ''}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {(() => {
                          const r = rolesMap[s.role];
                          const label = (lang === 'bn' ? r?.label_bn : r?.label_en || r?.label_bn) || s.role;
                          return String(label).replace(/\s*\(.*\)\s*$/, '');
                        })()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DetailSheet>

      {/* Create */}
      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t('নতুন অফিস', 'New office')}
        submitLabel={t('যোগ করুন', 'Create')}
        cancelLabel={t('বাতিল', 'Cancel')}
        onSubmit={submitCreate}
        busy={creating}
        disabled={createRequiredMissing}
        size="lg"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('অফিস কোড', 'Office code')}>
            <input className={cn(inputCls, 'font-mono')} value={createForm.office_code} onChange={setC('office_code')} placeholder="OFF-ACL-CUM-01" required />
          </Field>
          <Field label={t('ধরন', 'Type')}>{typeSelect(createForm.office_type, (v) => setCreateForm((f) => ({ ...f, office_type: v })))}</Field>
          <Field label={t('বাংলা নাম', 'Bangla name')}>
            <input className={inputCls} value={createForm.name_bn} onChange={setC('name_bn')} required />
          </Field>
          <Field label={t('ইংরেজি নাম', 'English name')}>
            <input className={inputCls} value={createForm.name_en} onChange={setC('name_en')} required />
          </Field>
          <Field label={t('বিভাগ (বাংলা)', 'Division (Bangla)')}>
            <input className={inputCls} value={createForm.division_bn} onChange={setC('division_bn')} placeholder="ঢাকা" required />
          </Field>
          <Field label={t('বিভাগ (ইংরেজি)', 'Division (English)')}>
            <input className={inputCls} value={createForm.division_en} onChange={setC('division_en')} placeholder="Dhaka" required />
          </Field>
          <Field label={t('জেলা (বাংলা)', 'District (Bangla)')}>
            <input className={inputCls} value={createForm.district_bn} onChange={setC('district_bn')} required />
          </Field>
          <Field label={t('জেলা (ইংরেজি)', 'District (English)')}>
            <input className={inputCls} value={createForm.district_en} onChange={setC('district_en')} required />
          </Field>
          <Field label={t('উপজেলা (বাংলা)', 'Upazila (Bangla)')}>
            <input className={inputCls} value={createForm.upazila_bn} onChange={setC('upazila_bn')} required />
          </Field>
          <Field label={t('উপজেলা (ইংরেজি)', 'Upazila (English)')}>
            <input className={inputCls} value={createForm.upazila_en} onChange={setC('upazila_en')} required />
          </Field>
        </div>
        <Accordion type="single" collapsible>
          <AccordionItem value="more" className="border-b-0">
            <AccordionTrigger className="py-2 text-sm text-slate-600 hover:no-underline">{t('আরও তথ্য', 'More details')}</AccordionTrigger>
            <AccordionContent className="pb-1">
              <div className="grid gap-3 px-0.5 pt-1 sm:grid-cols-2">
                <Field label={t('ফোন', 'Phone')}>
                  <input className={inputCls} value={createForm.contact_phone} onChange={setC('contact_phone')} />
                </Field>
                <Field label={t('মৌজা আইডি', 'Mouza IDs')} hint={validMouzas(createForm.mouzas_served_json) ? undefined : t('যেমন [42, 101]', 'e.g. [42, 101]')}>
                  <input className={cn(inputCls, 'font-mono')} value={createForm.mouzas_served_json} onChange={setC('mouzas_served_json')} placeholder="[42, 101]" />
                </Field>
                <Field label={t('ঠিকানা (বাংলা)', 'Address (Bangla)')}>
                  <input className={inputCls} value={createForm.address_bn} onChange={setC('address_bn')} />
                </Field>
                <Field label={t('ঠিকানা (ইংরেজি)', 'Address (English)')}>
                  <input className={inputCls} value={createForm.address_en} onChange={setC('address_en')} />
                </Field>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </FormDialog>

      {/* Edit */}
      <FormDialog
        open={!!editOffice}
        onOpenChange={(o) => !o && setEditOffice(null)}
        title={t('অফিস সম্পাদনা', 'Edit office')}
        description={editOffice?.office_code}
        submitLabel={t('সংরক্ষণ', 'Save')}
        cancelLabel={t('বাতিল', 'Cancel')}
        onSubmit={submitEdit}
        busy={saving}
        disabled={editInvalid}
      >
        {editForm && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('বাংলা নাম', 'Bangla name')}>
                <input className={inputCls} value={editForm.name_bn} onChange={setE('name_bn')} required />
              </Field>
              <Field label={t('ইংরেজি নাম', 'English name')}>
                <input className={inputCls} value={editForm.name_en} onChange={setE('name_en')} required />
              </Field>
              <Field label={t('ধরন', 'Type')}>{typeSelect(editForm.office_type, (v) => setEditForm((f) => (f ? { ...f, office_type: v } : f)))}</Field>
              <Field label={t('ফোন', 'Phone')}>
                <input className={inputCls} value={editForm.contact_phone} onChange={setE('contact_phone')} />
              </Field>
            </div>
            <Accordion type="single" collapsible>
              <AccordionItem value="more" className="border-b-0">
                <AccordionTrigger className="py-2 text-sm text-slate-600 hover:no-underline">{t('আরও তথ্য', 'More details')}</AccordionTrigger>
                <AccordionContent className="pb-1">
                  <div className="space-y-3 px-0.5 pt-1">
                    <Field label={t('ঠিকানা (বাংলা)', 'Address (Bangla)')}>
                      <input className={inputCls} value={editForm.address_bn} onChange={setE('address_bn')} />
                    </Field>
                    <Field label={t('ঠিকানা (ইংরেজি)', 'Address (English)')}>
                      <input className={inputCls} value={editForm.address_en} onChange={setE('address_en')} />
                    </Field>
                    <Field label={t('মৌজা আইডি', 'Mouza IDs')} hint={validMouzas(editForm.mouzas_served_json) ? undefined : t('যেমন [42, 101]', 'e.g. [42, 101]')}>
                      <input className={cn(inputCls, 'font-mono')} value={editForm.mouzas_served_json} onChange={setE('mouzas_served_json')} placeholder="[42, 101]" />
                    </Field>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}
      </FormDialog>

      {/* Activate / deactivate */}
      <ConfirmDialog
        open={!!toggleOffice}
        onOpenChange={(o) => !o && setToggleOffice(null)}
        title={toggleOffice && isActive(toggleOffice) ? t('অফিস বন্ধ করবেন?', 'Disable office?') : t('অফিস চালু করবেন?', 'Enable office?')}
        description={toggleOffice ? (lang === 'bn' ? toggleOffice.name_bn : toggleOffice.name_en || toggleOffice.name_bn) : ''}
        confirmLabel={toggleOffice && isActive(toggleOffice) ? t('বন্ধ করুন', 'Disable') : t('চালু করুন', 'Enable')}
        cancelLabel={t('বাতিল', 'Cancel')}
        destructive={!!toggleOffice && isActive(toggleOffice)}
        onConfirm={confirmToggle}
      />
    </AdminPage>
  );
};
