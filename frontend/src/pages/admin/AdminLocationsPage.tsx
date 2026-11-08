import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, ChevronRight, Compass, Landmark, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi, HierarchyDivisionItem, HierarchyMouzaItem } from '@/api/client';
import { toBanglaDigits } from '@/theme/tokens';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  AdminPage,
  ConfirmDialog,
  DataTable,
  EmptyRow,
  EmptyState,
  Field,
  FormDialog,
  LoadingRows,
  PageToolbar,
  Section,
  StatCard,
  StatGrid,
  inputCls,
  notify,
  useCreateIntent,
} from '@/components/admin/kit';

type Tier = 'DIVISION' | 'DISTRICT' | 'UPAZILA';

/** A mouza together with the names of the areas it belongs to. */
type MouzaRow = HierarchyMouzaItem & {
  division_bn: string;
  division_en: string;
  district_bn: string;
  district_en: string;
  upazila_bn: string;
  upazila_en: string;
};

type Selection = { division: string; district: string; upazila: string } | null;

type MouzaForm = {
  division_bn: string;
  district_bn: string;
  upazila_bn: string;
  mouza_bn: string;
  mouza_en: string;
  jl_no: string;
  latitude: string;
  longitude: string;
};

const emptyForm: MouzaForm = {
  division_bn: '',
  district_bn: '',
  upazila_bn: '',
  mouza_bn: '',
  mouza_en: '',
  jl_no: '',
  latitude: '',
  longitude: '',
};

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
/** Lowercase and turn Bangla digits into ASCII so "১২" matches "12". */
const norm = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)))
    .trim();

const toNum = (s: string): number | undefined => {
  const v = parseFloat(norm(s));
  return Number.isFinite(v) ? v : undefined;
};

/* ------------------------------------------------------------------ */
/* Small icon button with tooltip                                      */
/* ------------------------------------------------------------------ */

const IconAction: React.FC<{
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  danger?: boolean;
  className?: string;
}> = ({ label, icon: Icon, onClick, danger, className }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={cn('size-7 rounded-md text-slate-500', danger ? 'hover:bg-rose-50 hover:text-rose-600' : 'hover:text-slate-900', className)}
      >
        <Icon className="size-3.5" />
      </Button>
    </TooltipTrigger>
    <TooltipContent className="rounded-md px-2 py-1">{label}</TooltipContent>
  </Tooltip>
);

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export const AdminLocationsPage: React.FC<{
  onNavigateSubPage?: (subPage: string) => void;
}> = ({ onNavigateSubPage }) => {
  const { lang, t } = useAppUI();
  const n = (v: number | string) => toBanglaDigits(v, lang);
  const pick = (bn?: string, en?: string) => (lang === 'bn' ? bn || en : en || bn) || '—';

  const [tree, setTree] = useState<HierarchyDivisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Selection>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());

  // Mouza create/edit
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MouzaRow | null>(null);
  const [form, setForm] = useState<MouzaForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleting, setDeleting] = useState<MouzaRow | null>(null);

  // Rename division / district / upazila
  const [rename, setRename] = useState<{ tier: Tier; old_bn: string; new_bn: string; new_en: string } | null>(null);
  const [renaming, setRenaming] = useState(false);

  const fetchTree = useCallback(async () => {
    try {
      const data = await BhumiApi.getHierarchyTree();
      setTree(Array.isArray(data) ? data : []);
    } catch (e) {
      setTree([]);
      notify.err(e, lang);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchTree();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Flat list of all mouzas with their area names. */
  const allMouzas = useMemo<MouzaRow[]>(
    () =>
      tree.flatMap((dv) =>
        (dv.districts || []).flatMap((ds) =>
          (ds.upazilas || []).flatMap((up) =>
            (up.mouzas || []).map((m) => ({
              ...m,
              division_bn: dv.division_bn,
              division_en: dv.division_en,
              district_bn: ds.district_bn,
              district_en: ds.district_en,
              upazila_bn: up.upazila_bn,
              upazila_en: up.upazila_en,
            }))
          )
        )
      ),
    [tree]
  );

  const counts = useMemo(() => {
    let districts = 0;
    let upazilas = 0;
    tree.forEach((dv) => {
      districts += (dv.districts || []).length;
      (dv.districts || []).forEach((ds) => (upazilas += (ds.upazilas || []).length));
    });
    return { divisions: tree.length, districts, upazilas, mouzas: allMouzas.length };
  }, [tree, allMouzas]);

  /* Pick the first upazila once the tree arrives, and keep the selection valid after changes. */
  useEffect(() => {
    if (!tree.length) {
      setSelected(null);
      return;
    }
    const exists =
      selected &&
      tree
        .find((d) => d.division_bn === selected.division)
        ?.districts?.find((d) => d.district_bn === selected.district)
        ?.upazilas?.some((u) => u.upazila_bn === selected.upazila);
    if (exists) return;
    const dv = tree[0];
    const ds = dv?.districts?.[0];
    const up = ds?.upazilas?.[0];
    if (dv && ds && up) {
      setSelected({ division: dv.division_bn, district: ds.district_bn, upazila: up.upazila_bn });
      setOpen((prev) => new Set([...prev, `d:${dv.division_bn}`, `s:${dv.division_bn}/${ds.district_bn}`]));
    } else {
      setSelected(null);
    }
  }, [tree]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const q = norm(search);
  const searching = q.length > 0;

  const rows = useMemo<MouzaRow[]>(() => {
    if (searching) {
      return allMouzas.filter(
        (m) => norm(m.mouza_bn).includes(q) || norm(m.mouza_en).includes(q) || norm(m.jl_no).includes(q)
      );
    }
    if (!selected) return [];
    return allMouzas.filter(
      (m) => m.division_bn === selected.division && m.district_bn === selected.district && m.upazila_bn === selected.upazila
    );
  }, [allMouzas, searching, q, selected]);

  const selectedNames = useMemo(() => {
    if (!selected) return null;
    const dv = tree.find((d) => d.division_bn === selected.division);
    const ds = dv?.districts?.find((d) => d.district_bn === selected.district);
    const up = ds?.upazilas?.find((u) => u.upazila_bn === selected.upazila);
    if (!dv || !ds || !up) return null;
    return [pick(dv.division_bn, dv.division_en), pick(ds.district_bn, ds.district_en), pick(up.upazila_bn, up.upazila_en)];
  }, [selected, tree, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------------- Mouza form ---------------- */

  const formDivision = tree.find((d) => d.division_bn === form.division_bn.trim());
  const formDistrict = formDivision?.districts?.find((d) => d.district_bn === form.district_bn.trim());
  const formUpazila = formDistrict?.upazilas?.find((u) => u.upazila_bn === form.upazila_bn.trim());

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      division_bn: selected?.division || '',
      district_bn: selected?.district || '',
      upazila_bn: selected?.upazila || '',
    });
    setFormOpen(true);
  };
  useCreateIntent(() => openCreate());

  const openEdit = (m: MouzaRow) => {
    setEditing(m);
    setForm({
      division_bn: m.division_bn,
      district_bn: m.district_bn,
      upazila_bn: m.upazila_bn,
      mouza_bn: m.mouza_bn || '',
      mouza_en: m.mouza_en || '',
      jl_no: m.jl_no || '',
      latitude: m.latitude != null ? String(m.latitude) : '',
      longitude: m.longitude != null ? String(m.longitude) : '',
    });
    setFormOpen(true);
  };

  const setF = (k: keyof MouzaForm, v: string) =>
    setForm((f) => {
      const next = { ...f, [k]: v };
      // Changing a higher level clears the levels below it.
      if (k === 'division_bn') {
        next.district_bn = '';
        next.upazila_bn = '';
      }
      if (k === 'district_bn') next.upazila_bn = '';
      return next;
    });

  const formValid =
    !!form.division_bn.trim() &&
    !!form.district_bn.trim() &&
    !!form.upazila_bn.trim() &&
    !!form.mouza_bn.trim() &&
    !!form.jl_no.trim();

  const saveMouza = async () => {
    const division_bn = form.division_bn.trim();
    const district_bn = form.district_bn.trim();
    const upazila_bn = form.upazila_bn.trim();
    const mouza_bn = form.mouza_bn.trim();
    const payload = {
      division_bn,
      division_en: formDivision?.division_en || division_bn,
      district_bn,
      district_en: formDistrict?.district_en || district_bn,
      upazila_bn,
      upazila_en: formUpazila?.upazila_en || upazila_bn,
      mouza_bn,
      mouza_en: form.mouza_en.trim() || mouza_bn,
      jl_no: form.jl_no.trim(),
      latitude: toNum(form.latitude),
      longitude: toNum(form.longitude),
    };
    setSaving(true);
    try {
      const res = editing
        ? await BhumiApi.updateHierarchyMouza(editing.id, payload)
        : await BhumiApi.createHierarchyMouza(payload);
      notify.ok(
        (lang === 'bn' ? res?.message_bn : res?.message_en) ||
          (editing ? t('সংরক্ষণ হয়েছে', 'Saved') : t('মৌজা যোগ হয়েছে', 'Mouza added'))
      );
      setFormOpen(false);
      setSelected({ division: division_bn, district: district_bn, upazila: upazila_bn });
      setOpen((prev) => new Set([...prev, `d:${division_bn}`, `s:${division_bn}/${district_bn}`]));
      await fetchTree();
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      const res = await BhumiApi.deleteHierarchyMouza(deleting.id);
      notify.ok((lang === 'bn' ? res?.message_bn : res?.message_en) || t('মুছে ফেলা হয়েছে', 'Deleted'));
      await fetchTree();
    } catch (e) {
      notify.err(e, lang);
      throw e;
    }
  };

  /* ---------------- Rename ---------------- */

  const openRename = (tier: Tier, bn: string, en?: string) =>
    setRename({ tier, old_bn: bn, new_bn: bn, new_en: en || '' });

  const saveRename = async () => {
    if (!rename) return;
    const new_bn = rename.new_bn.trim();
    setRenaming(true);
    try {
      const res = await BhumiApi.renameHierarchyTier({
        tier: rename.tier,
        old_bn: rename.old_bn,
        new_bn,
        new_en: rename.new_en.trim() || new_bn,
      });
      notify.ok((lang === 'bn' ? res?.message_bn : res?.message_en) || t('নাম বদলানো হয়েছে', 'Renamed'));
      if (selected) {
        const s = { ...selected };
        if (rename.tier === 'DIVISION' && s.division === rename.old_bn) s.division = new_bn;
        if (rename.tier === 'DISTRICT' && s.district === rename.old_bn) s.district = new_bn;
        if (rename.tier === 'UPAZILA' && s.upazila === rename.old_bn) s.upazila = new_bn;
        setSelected(s);
      }
      setOpen((prev) => {
        const next = new Set<string>();
        prev.forEach((k) => {
          if (rename.tier === 'DIVISION') next.add(k.replace(`d:${rename.old_bn}`, `d:${new_bn}`).replace(`s:${rename.old_bn}/`, `s:${new_bn}/`));
          else if (rename.tier === 'DISTRICT') next.add(k.endsWith(`/${rename.old_bn}`) ? k.slice(0, -rename.old_bn.length) + new_bn : k);
          else next.add(k);
        });
        return next;
      });
      setRename(null);
      await fetchTree();
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setRenaming(false);
    }
  };

  const tierLabel = (tier: Tier) =>
    tier === 'DIVISION' ? t('বিভাগ', 'Division') : tier === 'DISTRICT' ? t('জেলা', 'District') : t('উপজেলা', 'Upazila');

  /* ---------------- Render ---------------- */

  const rowClass =
    'group flex items-center gap-1 rounded-lg pr-1 text-sm transition hover:bg-slate-50';

  const renameBtn = (tier: Tier, bn: string, en?: string) => (
    <IconAction
      label={t('নাম বদলান', 'Rename')}
      icon={Pencil}
      onClick={() => openRename(tier, bn, en)}
      className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
    />
  );

  const areaTree = (
    <div className="max-h-[32rem] overflow-y-auto p-2 scrollbar-thin md:max-h-none md:min-h-0 md:flex-1">
      {tree.map((dv) => {
        const dKey = `d:${dv.division_bn}`;
        const dOpen = open.has(dKey);
        return (
          <Collapsible key={dKey} open={dOpen} onOpenChange={() => toggle(dKey)}>
            <div className={rowClass}>
              <CollapsibleTrigger className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-2 py-1.5 text-left">
                <ChevronRight className={cn('size-3.5 shrink-0 text-slate-400 transition-transform', dOpen && 'rotate-90')} />
                <span className="truncate font-medium text-slate-800">{pick(dv.division_bn, dv.division_en)}</span>
                <span className="ml-auto shrink-0 text-xs text-slate-400">{n((dv.districts || []).length)}</span>
              </CollapsibleTrigger>
              {renameBtn('DIVISION', dv.division_bn, dv.division_en)}
            </div>
            <CollapsibleContent className="ml-3 border-l border-slate-100 pl-1">
              {(dv.districts || []).map((ds) => {
                const sKey = `s:${dv.division_bn}/${ds.district_bn}`;
                const sOpen = open.has(sKey);
                return (
                  <Collapsible key={sKey} open={sOpen} onOpenChange={() => toggle(sKey)}>
                    <div className={rowClass}>
                      <CollapsibleTrigger className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-2 py-1.5 text-left">
                        <ChevronRight className={cn('size-3.5 shrink-0 text-slate-400 transition-transform', sOpen && 'rotate-90')} />
                        <span className="truncate text-slate-700">{pick(ds.district_bn, ds.district_en)}</span>
                        <span className="ml-auto shrink-0 text-xs text-slate-400">{n((ds.upazilas || []).length)}</span>
                      </CollapsibleTrigger>
                      {renameBtn('DISTRICT', ds.district_bn, ds.district_en)}
                    </div>
                    <CollapsibleContent className="ml-3 border-l border-slate-100 pl-1">
                      {(ds.upazilas || []).map((up) => {
                        const active =
                          !searching &&
                          selected?.division === dv.division_bn &&
                          selected?.district === ds.district_bn &&
                          selected?.upazila === up.upazila_bn;
                        return (
                          <div
                            key={up.upazila_bn}
                            className={cn(rowClass, active && 'bg-[#006A4E]/8 hover:bg-[#006A4E]/10')}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSearch('');
                                setSelected({ division: dv.division_bn, district: ds.district_bn, upazila: up.upazila_bn });
                              }}
                              className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-2 py-1.5 text-left"
                            >
                              <MapPin className={cn('size-3.5 shrink-0', active ? 'text-[#006A4E]' : 'text-slate-300')} />
                              <span className={cn('truncate', active ? 'font-medium text-[#006A4E]' : 'text-slate-600')}>
                                {pick(up.upazila_bn, up.upazila_en)}
                              </span>
                              <span className="ml-auto shrink-0 text-xs text-slate-400">{n((up.mouzas || []).length)}</span>
                            </button>
                            {renameBtn('UPAZILA', up.upazila_bn, up.upazila_en)}
                          </div>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );

  const tableTitle = searching ? (
    <span className="flex items-center gap-2">
      {t('খোঁজার ফল', 'Search results')}
      <span className="text-xs font-normal text-slate-400">{n(rows.length)}</span>
    </span>
  ) : selectedNames ? (
    <span className="flex min-w-0 items-center gap-1 text-slate-500">
      <span className="truncate font-normal">{selectedNames[0]}</span>
      <ChevronRight className="size-3.5 shrink-0 text-slate-300" />
      <span className="truncate font-normal">{selectedNames[1]}</span>
      <ChevronRight className="size-3.5 shrink-0 text-slate-300" />
      <span className="truncate text-slate-800">{selectedNames[2]}</span>
    </span>
  ) : (
    t('মৌজা', 'Mouzas')
  );

  return (
    <TooltipProvider delayDuration={200}>
      <AdminPage fill>
        <StatGrid>
          <StatCard label={t('বিভাগ', 'Divisions')} value={loading ? '—' : n(counts.divisions)} icon={Landmark} tone="green" />
          <StatCard label={t('জেলা', 'Districts')} value={loading ? '—' : n(counts.districts)} icon={Building2} tone="blue" />
          <StatCard label={t('উপজেলা', 'Upazilas')} value={loading ? '—' : n(counts.upazilas)} icon={Compass} tone="violet" />
          <StatCard label={t('মৌজা', 'Mouzas')} value={loading ? '—' : n(counts.mouzas)} icon={MapPin} tone="amber" />
        </StatGrid>

        <PageToolbar
          search={search}
          onSearch={setSearch}
          placeholder={t('মৌজা বা জে.এল. নং খুঁজুন', 'Search mouza or JL no')}
          actions={
            <Button size="sm" className="h-9" onClick={openCreate}>
              <Plus className="size-4" />
              {t('নতুন মৌজা', 'New mouza')}
            </Button>
          }
        />

        <div className="grid gap-4 md:min-h-0 md:flex-1 md:grid-cols-[15rem_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)] lg:grid-cols-[17rem_minmax(0,1fr)]">
          <Section fill title={t('এলাকা', 'Areas')} >
            {loading ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-7 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : tree.length === 0 ? (
              <EmptyState text={t('কোনো এলাকা নেই', 'No areas yet')} />
            ) : (
              areaTree
            )}
          </Section>

          <Section fill title={tableTitle}>
            <DataTable
              headers={[t('মৌজা', 'Mouza'), t('জে.এল. নং', 'JL no'), t('প্লট', 'Plots'), '']}
              alignRight={[3]}
            >
              {loading ? (
                <LoadingRows cols={4} />
              ) : rows.length === 0 ? (
                <EmptyRow
                  cols={4}
                  text={searching ? t('কিছু পাওয়া যায়নি', 'Nothing found') : t('কোনো মৌজা নেই', 'No mouzas')}
                  action={
                    !searching && selected ? (
                      <Button variant="outline" size="sm" className="h-8" onClick={openCreate}>
                        <Plus className="size-3.5" />
                        {t('মৌজা যোগ করুন', 'Add mouza')}
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                rows.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className="block font-medium text-slate-800">{pick(m.mouza_bn, m.mouza_en)}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {searching
                          ? `${pick(m.upazila_bn, m.upazila_en)}, ${pick(m.district_bn, m.district_en)}`
                          : lang === 'bn'
                            ? m.mouza_en
                            : m.mouza_bn}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-slate-700">{m.jl_no ? n(m.jl_no) : '—'}</td>
                    <td className="whitespace-nowrap">
                      {Number(m.plots_count) > 0 && onNavigateSubPage ? (
                        <button
                          type="button"
                          onClick={() => onNavigateSubPage('khatians')}
                          className="cursor-pointer text-slate-700 hover:text-[#006A4E] hover:underline"
                        >
                          {n(Number(m.plots_count))}
                        </button>
                      ) : (
                        <span className="text-slate-500">{n(Number(m.plots_count) || 0)}</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="inline-flex items-center gap-0.5">
                        <IconAction label={t('সম্পাদনা', 'Edit')} icon={Pencil} onClick={() => openEdit(m)} />
                        <IconAction label={t('মুছুন', 'Delete')} icon={Trash2} danger onClick={() => setDeleting(m)} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </DataTable>
          </Section>
        </div>

        {/* Create / edit mouza */}
        <FormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          title={editing ? t('মৌজা সম্পাদনা', 'Edit mouza') : t('নতুন মৌজা', 'New mouza')}
          submitLabel={editing ? t('সংরক্ষণ', 'Save') : t('যোগ করুন', 'Add')}
          onSubmit={saveMouza}
          busy={saving}
          disabled={!formValid}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t('বিভাগ', 'Division')}>
              <input
                list="loc-divisions"
                value={form.division_bn}
                onChange={(e) => setF('division_bn', e.target.value)}
                placeholder={t('বাছুন বা লিখুন', 'Pick or type')}
                className={inputCls}
              />
            </Field>
            <Field label={t('জেলা', 'District')}>
              <input
                list="loc-districts"
                value={form.district_bn}
                onChange={(e) => setF('district_bn', e.target.value)}
                placeholder={t('বাছুন বা লিখুন', 'Pick or type')}
                disabled={!form.division_bn.trim()}
                className={inputCls}
              />
            </Field>
            <Field label={t('উপজেলা', 'Upazila')}>
              <input
                list="loc-upazilas"
                value={form.upazila_bn}
                onChange={(e) => setF('upazila_bn', e.target.value)}
                placeholder={t('বাছুন বা লিখুন', 'Pick or type')}
                disabled={!form.district_bn.trim()}
                className={inputCls}
              />
            </Field>
          </div>
          <datalist id="loc-divisions">
            {tree.map((d) => (
              <option key={d.division_bn} value={d.division_bn}>
                {d.division_en}
              </option>
            ))}
          </datalist>
          <datalist id="loc-districts">
            {(formDivision?.districts || []).map((d) => (
              <option key={d.district_bn} value={d.district_bn}>
                {d.district_en}
              </option>
            ))}
          </datalist>
          <datalist id="loc-upazilas">
            {(formDistrict?.upazilas || []).map((u) => (
              <option key={u.upazila_bn} value={u.upazila_bn}>
                {u.upazila_en}
              </option>
            ))}
          </datalist>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('মৌজার নাম', 'Mouza name')}>
              <input
                value={form.mouza_bn}
                onChange={(e) => setF('mouza_bn', e.target.value)}
                placeholder={t('বাংলায়', 'In Bangla')}
                className={inputCls}
              />
            </Field>
            <Field label={t('ইংরেজি নাম', 'English name')}>
              <input
                value={form.mouza_en}
                onChange={(e) => setF('mouza_en', e.target.value)}
                placeholder="Mouza"
                className={inputCls}
              />
            </Field>
          </div>
          <Field label={t('জে.এল. নং', 'JL no')} className="sm:w-1/2 sm:pr-1.5">
            <input
              value={form.jl_no}
              onChange={(e) => setF('jl_no', e.target.value)}
              inputMode="numeric"
              className={inputCls}
            />
          </Field>

          <Accordion type="single" collapsible className="rounded-lg border border-slate-200">
            <AccordionItem value="more" className="border-0">
              <AccordionTrigger className="min-h-0 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:no-underline [&>svg]:size-4 [&>svg]:text-slate-400">
                {t('আরও তথ্য', 'More details')}
              </AccordionTrigger>
              <AccordionContent className="grid gap-3 px-3 pb-3 pt-1 text-slate-700 sm:grid-cols-2">
                <Field label={t('অক্ষাংশ', 'Latitude')}>
                  <input
                    value={form.latitude}
                    onChange={(e) => setF('latitude', e.target.value)}
                    inputMode="decimal"
                    placeholder="23.8103"
                    className={inputCls}
                  />
                </Field>
                <Field label={t('দ্রাঘিমাংশ', 'Longitude')}>
                  <input
                    value={form.longitude}
                    onChange={(e) => setF('longitude', e.target.value)}
                    inputMode="decimal"
                    placeholder="90.4125"
                    className={inputCls}
                  />
                </Field>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </FormDialog>

        {/* Rename division / district / upazila */}
        <FormDialog
          open={!!rename}
          onOpenChange={(o) => !o && setRename(null)}
          title={rename ? t(`${tierLabel(rename.tier)}র নাম বদলান`, `Rename ${tierLabel(rename.tier).toLowerCase()}`) : ''}
          description={rename?.old_bn}
          submitLabel={t('সংরক্ষণ', 'Save')}
          onSubmit={saveRename}
          busy={renaming}
          disabled={!rename?.new_bn.trim()}
          size="sm"
        >
          {rename && (
            <>
              <Field label={t('বাংলা নাম', 'Bangla name')}>
                <input
                  value={rename.new_bn}
                  onChange={(e) => setRename({ ...rename, new_bn: e.target.value })}
                  className={inputCls}
                  autoFocus
                />
              </Field>
              <Field label={t('ইংরেজি নাম', 'English name')}>
                <input
                  value={rename.new_en}
                  onChange={(e) => setRename({ ...rename, new_en: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </>
          )}
        </FormDialog>

        {/* Delete mouza */}
        <ConfirmDialog
          open={!!deleting}
          onOpenChange={(o) => !o && setDeleting(null)}
          title={t('মৌজা মুছবেন?', 'Delete mouza?')}
          description={deleting ? `${pick(deleting.mouza_bn, deleting.mouza_en)} · ${t('জে.এল.', 'JL')} ${n(deleting.jl_no || '—')}` : undefined}
          confirmLabel={t('মুছুন', 'Delete')}
          destructive
          onConfirm={confirmDelete}
        />
      </AdminPage>
    </TooltipProvider>
  );
};
