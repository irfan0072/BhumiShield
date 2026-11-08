import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Eye, FileText, MoreHorizontal, Pencil, Plus, RotateCcw, ShieldCheck, ShieldOff, Trash2, Users } from 'lucide-react';
import { BhumiApi, AuthorizedLawyerItem } from '@/api/client';
import { toBanglaDigits, maskPhone } from '@/theme/tokens';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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

type Lang = 'bn' | 'en';
type LawyerStatus = 'ACTIVE' | 'SUSPENDED';

const BARS = [
  'ঢাকা জেলা বার অ্যাসোসিয়েশন',
  'কুমিল্লা জেলা বার অ্যাসোসিয়েশন',
  'চট্টগ্রাম জেলা বার অ্যাসোসিয়েশন',
  'সিলেট জেলা বার অ্যাসোসিয়েশন',
  'রাজশাহী জেলা বার অ্যাসোসিয়েশন',
  'খুলনা জেলা বার অ্যাসোসিয়েশন',
  'বগুড়া জেলা বার অ্যাসোসিয়েশন',
  'সুপ্রিম কোর্ট বার অ্যাসোসিয়েশন',
];

const emptyForm = {
  bar_council_no: '',
  lawyer_name_bn: '',
  lawyer_name_en: '',
  district_bar: BARS[0],
  nid: '',
  phone: '',
  email: '',
  chamber_address_bn: '',
  status: 'ACTIVE' as LawyerStatus,
};

export const SuperAdminLawyersTab: React.FC<{
  t: (bn: string, en: string) => string;
  lang: string;
}> = ({ t, lang: langProp }) => {
  const lang: Lang = langProp === 'en' ? 'en' : 'bn';
  const n = (v: any) => toBanglaDigits(v, lang);

  const [lawyers, setLawyers] = useState<AuthorizedLawyerItem[]>([]);
  const [metrics, setMetrics] = useState<{ total: number; active: number; suspended: number; cases_filed: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LawyerStatus>('ALL');

  const [viewing, setViewing] = useState<AuthorizedLawyerItem | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<AuthorizedLawyerItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [suspendTarget, setSuspendTarget] = useState<AuthorizedLawyerItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AuthorizedLawyerItem | null>(null);

  const fetchLawyers = async () => {
    setLoading(true);
    try {
      const res = await BhumiApi.listAdminLawyers();
      setLawyers(res.items || []);
      setMetrics(res.metrics || null);
    } catch (e) {
      notify.err(e, lang, t('তালিকা লোড হয়নি', 'Could not load list'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLawyers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setForm(emptyForm);
    setEditing(null);
    setFormMode('create');
  };
  useCreateIntent(openCreate);

  const openEdit = (l: AuthorizedLawyerItem) => {
    setForm({
      bar_council_no: l.bar_council_no,
      lawyer_name_bn: l.lawyer_name_bn,
      lawyer_name_en: l.lawyer_name_en || '',
      district_bar: l.district_bar || BARS[0],
      nid: l.nid || '',
      phone: l.phone || '',
      email: l.email || '',
      chamber_address_bn: l.chamber_address_bn || '',
      status: l.status,
    });
    setEditing(l);
    setViewing(null);
    setFormMode('edit');
  };

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      lawyers.filter((l) => {
        if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
        if (!q) return true;
        return [l.bar_council_no, l.lawyer_name_bn, l.lawyer_name_en, l.district_bar, l.phone, l.email]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      }),
    [lawyers, statusFilter, q]
  );

  const save = async () => {
    setSaving(true);
    try {
      if (formMode === 'create') {
        await BhumiApi.createAdminLawyer(form);
        notify.ok(t('আইনজীবী যোগ হয়েছে', 'Lawyer added'));
      } else if (formMode === 'edit' && editing) {
        await BhumiApi.updateAdminLawyer(editing.id, form);
        notify.ok(t('সংরক্ষণ হয়েছে', 'Saved'));
      }
      setFormMode(null);
      await fetchLawyers();
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (l: AuthorizedLawyerItem, status: LawyerStatus) => {
    try {
      await BhumiApi.updateAdminLawyer(l.id, { status });
      notify.ok(status === 'SUSPENDED' ? t('সনদ স্থগিত হয়েছে', 'License suspended') : t('সনদ সক্রিয় হয়েছে', 'License activated'));
      setViewing(null);
      await fetchLawyers();
    } catch (e) {
      notify.err(e, lang);
      throw e;
    }
  };

  const remove = async (l: AuthorizedLawyerItem) => {
    try {
      await BhumiApi.deleteAdminLawyer(l.id);
      notify.ok(t('মুছে ফেলা হয়েছে', 'Deleted'));
      setViewing(null);
      await fetchLawyers();
    } catch (e) {
      notify.err(e, lang);
      throw e;
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify.ok(t('কপি হয়েছে', 'Copied'));
    } catch {
      /* clipboard not available */
    }
  };

  const set = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: k === 'bar_council_no' ? e.target.value.toUpperCase() : e.target.value }));
  const formValid = !!form.bar_council_no.trim() && !!form.lawyer_name_bn.trim() && !!form.district_bar.trim();

  const renderActions = (l: AuthorizedLawyerItem) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-slate-500" aria-label={t('আরও', 'More')}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => setViewing(l)}>
          <Eye className="size-4" />
          {t('বিস্তারিত', 'Details')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openEdit(l)}>
          <Pencil className="size-4" />
          {t('সম্পাদনা', 'Edit')}
        </DropdownMenuItem>
        {l.status === 'ACTIVE' ? (
          <DropdownMenuItem onClick={() => setSuspendTarget(l)}>
            <ShieldOff className="size-4" />
            {t('স্থগিত করুন', 'Suspend')}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => setStatus(l, 'ACTIVE').catch(() => {})}>
            <ShieldCheck className="size-4" />
            {t('সক্রিয় করুন', 'Activate')}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => setDeleteTarget(l)}>
          <Trash2 className="size-4" />
          {t('মুছুন', 'Delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <AdminPage fill>
      <StatGrid>
        <StatCard label={t('মোট আইনজীবী', 'Lawyers')} value={metrics ? n(metrics.total) : '—'} icon={Users} tone="blue" />
        <StatCard
          label={t('সক্রিয়', 'Active')}
          value={metrics ? n(metrics.active) : '—'}
          icon={ShieldCheck}
          tone="green"
          onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
          active={statusFilter === 'ACTIVE'}
        />
        <StatCard
          label={t('স্থগিত', 'Suspended')}
          value={metrics ? n(metrics.suspended) : '—'}
          icon={ShieldOff}
          tone="red"
          onClick={() => setStatusFilter(statusFilter === 'SUSPENDED' ? 'ALL' : 'SUSPENDED')}
          active={statusFilter === 'SUSPENDED'}
        />
        <StatCard label={t('দাখিল মামলা', 'Cases filed')} value={metrics ? n(metrics.cases_filed) : '—'} icon={FileText} tone="violet" />
      </StatGrid>

      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('নাম, সনদ নং বা বার…', 'Name, licence or bar…')}
        filters={
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'ALL' | LawyerStatus)}>
            <SelectTrigger className="h-9 w-36 rounded-lg text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('সব', 'All')}</SelectItem>
              <SelectItem value="ACTIVE">{t('সক্রিয়', 'Active')}</SelectItem>
              <SelectItem value="SUSPENDED">{t('স্থগিত', 'Suspended')}</SelectItem>
            </SelectContent>
          </Select>
        }
        actions={
          <>
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={fetchLawyers} disabled={loading}>
              <RotateCcw className={cn('size-3.5', loading && 'animate-spin')} />
              {t('রিফ্রেশ', 'Refresh')}
            </Button>
            <Button size="sm" className="h-9 gap-1.5" onClick={openCreate}>
              <Plus className="size-4" />
              {t('নতুন আইনজীবী', 'New lawyer')}
            </Button>
          </>
        }
      />

      <Section fill>
        <DataTable
          headers={[t('আইনজীবী', 'Lawyer'), t('সনদ নং', 'Licence'), t('বার', 'Bar'), t('অবস্থা', 'Status'), '']}
          alignRight={[4]}
        >
          {loading && lawyers.length === 0 ? (
            <LoadingRows cols={5} />
          ) : filtered.length === 0 ? (
            <EmptyRow cols={5} text={t('কোনো আইনজীবী নেই', 'No lawyers')} />
          ) : (
            filtered.map((l) => (
              <tr key={l.id} className="cursor-pointer" onClick={() => setViewing(l)}>
                <td>
                  <span className="block font-medium text-slate-900">{lang === 'bn' ? l.lawyer_name_bn : l.lawyer_name_en || l.lawyer_name_bn}</span>
                  {l.phone && <span className="block text-xs text-slate-500">{maskPhone(l.phone, lang)}</span>}
                </td>
                <td>
                  <span className="font-mono text-xs text-slate-700">{l.bar_council_no}</span>
                </td>
                <td>
                  <span className="text-slate-700">{l.district_bar || '—'}</span>
                </td>
                <td>
                  <StatusCode code={l.status} lang={lang} />
                </td>
                <td className="text-right" onClick={(e) => e.stopPropagation()}>
                  {renderActions(l)}
                </td>
              </tr>
            ))
          )}
        </DataTable>
      </Section>

      {/* Details */}
      <DetailSheet
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        title={viewing ? (lang === 'bn' ? viewing.lawyer_name_bn : viewing.lawyer_name_en || viewing.lawyer_name_bn) : ''}
        subtitle={viewing?.district_bar}
        footer={
          viewing && (
            <>
              {viewing.status === 'ACTIVE' ? (
                <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setSuspendTarget(viewing)}>
                  <ShieldOff className="size-4" />
                  {t('স্থগিত', 'Suspend')}
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setStatus(viewing, 'ACTIVE').catch(() => {})}>
                  <ShieldCheck className="size-4" />
                  {t('সক্রিয় করুন', 'Activate')}
                </Button>
              )}
              <Button size="sm" className="h-9 gap-1.5" onClick={() => openEdit(viewing)}>
                <Pencil className="size-4" />
                {t('সম্পাদনা', 'Edit')}
              </Button>
            </>
          )
        }
      >
        {viewing && (
          <DetailList
            items={[
              [t('অবস্থা', 'Status'), <StatusCode code={viewing.status} lang={lang} />],
              [
                t('সনদ নং', 'Licence'),
                <span className="inline-flex items-center gap-1">
                  <span className="font-mono">{viewing.bar_council_no}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-slate-400 hover:text-slate-700"
                    aria-label={t('কপি', 'Copy')}
                    onClick={() => copy(viewing.bar_council_no)}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </span>,
              ],
              [t('নাম', 'Name'), viewing.lawyer_name_bn],
              !!viewing.lawyer_name_en && [t('ইংরেজি নাম', 'English name'), viewing.lawyer_name_en],
              [t('মোবাইল', 'Phone'), viewing.phone ? maskPhone(viewing.phone, lang) : '—'],
              [t('ইমেইল', 'Email'), viewing.email || '—'],
              [t('চেম্বার', 'Chamber'), viewing.chamber_address_bn || '—'],
            ]}
          />
        )}
      </DetailSheet>

      {/* Create / edit */}
      <FormDialog
        open={!!formMode}
        onOpenChange={(o) => !o && setFormMode(null)}
        title={formMode === 'edit' ? t('আইনজীবী সম্পাদনা', 'Edit lawyer') : t('নতুন আইনজীবী', 'New lawyer')}
        submitLabel={t('সংরক্ষণ', 'Save')}
        cancelLabel={t('বাতিল', 'Cancel')}
        busy={saving}
        disabled={!formValid}
        onSubmit={save}
      >
        <div className="-mx-5 -my-1 max-h-[65vh] space-y-3 overflow-y-auto px-5 py-1">
        <Field label={t('বার কাউন্সিল সনদ নং *', 'Bar Council no *')}>
          <input
            className={cn(inputCls, 'font-mono uppercase')}
            value={form.bar_council_no}
            onChange={set('bar_council_no')}
            disabled={formMode === 'edit'}
            placeholder="BC-DH-14285"
          />
        </Field>
        <Field label={t('নাম *', 'Name *')}>
          <input className={inputCls} value={form.lawyer_name_bn} onChange={set('lawyer_name_bn')} />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('জেলা বার *', 'District bar *')}>
            <Select value={form.district_bar} onValueChange={(v) => setForm((f) => ({ ...f, district_bar: v }))}>
              <SelectTrigger className="h-9 w-full rounded-lg text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(BARS.includes(form.district_bar) ? BARS : [form.district_bar, ...BARS]).map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('মোবাইল', 'Phone')}>
            <input className={inputCls} value={form.phone} onChange={set('phone')} inputMode="tel" placeholder="01XXXXXXXXX" />
          </Field>
        </div>

        <Accordion type="single" collapsible className="rounded-lg border border-slate-200 px-3">
          <AccordionItem value="more" className="border-b-0">
            <AccordionTrigger className="min-h-0 py-2.5 text-sm font-medium text-slate-700 hover:no-underline hover:text-slate-900">
              {t('আরও তথ্য', 'More details')}
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-3 pt-1 text-slate-700">
              <Field label={t('ইংরেজি নাম', 'English name')}>
                <input className={inputCls} value={form.lawyer_name_en} onChange={set('lawyer_name_en')} />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t('ইমেইল', 'Email')}>
                  <input type="email" className={inputCls} value={form.email} onChange={set('email')} />
                </Field>
                <Field label={t('এনআইডি', 'NID')}>
                  <input className={inputCls} value={form.nid} onChange={set('nid')} inputMode="numeric" />
                </Field>
              </div>
              <Field label={t('চেম্বারের ঠিকানা', 'Chamber address')}>
                <input className={inputCls} value={form.chamber_address_bn} onChange={set('chamber_address_bn')} />
              </Field>
              <Field label={t('অবস্থা', 'Status')}>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as LawyerStatus }))}>
                  <SelectTrigger className="h-9 w-full rounded-lg text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">{t('সক্রিয়', 'Active')}</SelectItem>
                    <SelectItem value="SUSPENDED">{t('স্থগিত', 'Suspended')}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!suspendTarget}
        onOpenChange={(o) => !o && setSuspendTarget(null)}
        title={t('সনদ স্থগিত করবেন?', 'Suspend licence?')}
        description={suspendTarget ? `${suspendTarget.lawyer_name_bn} · ${suspendTarget.bar_council_no}` : undefined}
        confirmLabel={t('স্থগিত', 'Suspend')}
        cancelLabel={t('বাতিল', 'Cancel')}
        destructive
        onConfirm={async () => {
          if (suspendTarget) await setStatus(suspendTarget, 'SUSPENDED');
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t('আইনজীবী মুছবেন?', 'Delete lawyer?')}
        description={deleteTarget ? `${deleteTarget.lawyer_name_bn} · ${deleteTarget.bar_council_no}` : undefined}
        confirmLabel={t('মুছুন', 'Delete')}
        cancelLabel={t('বাতিল', 'Cancel')}
        destructive
        onConfirm={async () => {
          if (deleteTarget) await remove(deleteTarget);
        }}
      />
    </AdminPage>
  );
};
