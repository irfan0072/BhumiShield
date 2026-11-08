import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, RotateCcw, Users } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { toBanglaDigits } from '@/theme/tokens';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AdminPage,
  DataTable,
  DetailList,
  DetailSheet,
  EmptyRow,
  EmptyState,
  LoadingRows,
  PageToolbar,
  Section,
  StatusBadge,
  Tone,
  notify,
} from '@/components/admin/kit';

type Lang = 'bn' | 'en';

interface RoleMeta {
  tier?: string;
  label_bn?: string;
  label_en?: string;
  description_bn?: string;
  description_en?: string;
}

interface RoleRow {
  key: string;
  tier: string;
  name: string;
  sub: string;
  description: string;
  permissions: string[];
  users: number | null;
}

/** Used only when the API has no label for a role key. */
const ROLE_LABELS: Record<string, [string, string]> = {
  guest: ['অতিথি', 'Guest'],
  citizen: ['নাগরিক', 'Citizen'],
  admin: ['অ্যাডমিন', 'Admin'],
  system_admin: ['সিস্টেম অ্যাডমিন', 'System admin'],
  auditor: ['অডিটর', 'Auditor'],
  sub_registrar: ['সাব-রেজিস্ট্রার', 'Sub-registrar'],
  ac_land: ['এসি ল্যান্ড', 'AC Land'],
  support_agent: ['সাপোর্ট এজেন্ট', 'Support agent'],
  bank_officer: ['ব্যাংক কর্মকর্তা', 'Bank officer'],
  bank_manager: ['ব্যাংক ব্যবস্থাপক', 'Bank manager'],
};

const TIERS: Record<string, { bn: string; en: string; tone: Tone }> = {
  T0: { bn: 'সবার জন্য', en: 'Public', tone: 'slate' },
  T1: { bn: 'নাগরিক', en: 'Citizen', tone: 'blue' },
  T2: { bn: 'কর্মকর্তা', en: 'Official', tone: 'green' },
  T3: { bn: 'প্রশাসক', en: 'Admin', tone: 'violet' },
};

/** Permission areas. Plural admin keys (deeds, tickets…) map to the same area as the singular ones. */
const AREA_ALIAS: Record<string, string> = {
  deeds: 'deed',
  khatians: 'khatian',
  listings: 'listing',
  tickets: 'ticket',
  notices: 'notice',
  transfers: 'transfer',
  mortgages: 'lien',
};
const AREA_LABELS: Record<string, [string, string]> = {
  ownership: ['মালিকানা', 'Ownership'],
  deed: ['দলিল', 'Deeds'],
  deed_record: ['দলিল রেকর্ড', 'Deed records'],
  transfer: ['হস্তান্তর', 'Transfers'],
  biometric: ['বায়োমেট্রিক', 'Biometrics'],
  khatian: ['খতিয়ান', 'Khatians'],
  document: ['নথি', 'Documents'],
  lien: ['বন্ধক', 'Mortgages'],
  listing: ['বিক্রয় তালিকা', 'Listings'],
  ticket: ['অভিযোগ', 'Tickets'],
  notice: ['নোটিশ', 'Notices'],
  rules: ['নিয়ম', 'Rules'],
  audit: ['অডিট', 'Audit'],
  overview: ['সারসংক্ষেপ', 'Overview'],
  users: ['ব্যবহারকারী', 'Users'],
  roles: ['পদ', 'Roles'],
  mutations: ['নামজারি', 'Mutations'],
  field_verification: ['মাঠ যাচাই', 'Field checks'],
  survey: ['জরিপ', 'Survey'],
  appeals: ['আপিল', 'Appeals'],
  disputes: ['বিরোধ', 'Disputes'],
  acquisition: ['অধিগ্রহণ', 'Acquisition'],
  offices: ['অফিস', 'Offices'],
  services: ['সেবা', 'Services'],
  integrations: ['সংযোগ', 'Integrations'],
  security: ['নিরাপত্তা', 'Security'],
};
const ACTION_LABELS: Record<string, [string, string]> = {
  view: ['দেখা', 'View'],
  manage: ['পরিচালনা', 'Manage'],
  approve: ['অনুমোদন', 'Approve'],
  register: ['নিবন্ধন', 'Register'],
  start: ['শুরু করা', 'Start'],
  capture: ['গ্রহণ', 'Capture'],
  enter: ['এন্ট্রি', 'Enter'],
  verify: ['যাচাই', 'Verify'],
  upload: ['আপলোড', 'Upload'],
  prepare: ['প্রস্তুত', 'Prepare'],
  create: ['তৈরি', 'Create'],
  moderate: ['তদারকি', 'Moderate'],
  triage: ['বাছাই', 'Triage'],
  resolve: ['নিষ্পত্তি', 'Resolve'],
  resolve_general: ['সাধারণ নিষ্পত্তি', 'Resolve general'],
  resolve_record: ['রেকর্ড নিষ্পত্তি', 'Resolve record'],
  draft: ['খসড়া', 'Draft'],
  publish: ['প্রকাশ', 'Publish'],
  configure: ['নির্ধারণ', 'Configure'],
  transfer_office: ['অফিস বদলি', 'Change office'],
  reassign: ['পুনর্বণ্টন', 'Reassign'],
  correction_request: ['সংশোধন অনুরোধ', 'Request correction'],
  hold: ['স্থগিত', 'Hold'],
  flag: ['চিহ্নিত', 'Flag'],
  reconcile: ['সমন্বয়', 'Reconcile'],
  assign: ['দায়িত্ব দেওয়া', 'Assign'],
  reply: ['উত্তর', 'Reply'],
  retry: ['পুনরায় পাঠানো', 'Retry'],
  export: ['রপ্তানি', 'Export'],
  freeze_plot: ['জমি আটকানো', 'Freeze plot'],
  override: ['বিশেষ আদেশ', 'Override'],
  backup: ['ব্যাকআপ', 'Backup'],
};

const readable = (s: string) => {
  const r = s.replace(/[._]/g, ' ').trim();
  return r.charAt(0).toUpperCase() + r.slice(1);
};

/** "নাম (বিস্তারিত)" → ["নাম", "বিস্তারিত"] */
const splitLabel = (label: string): [string, string] => {
  const m = label.match(/^(.*?)\s*\((.*)\)\s*$/);
  return m ? [m[1].trim(), m[2].trim()] : [label.trim(), ''];
};

const parsePermission = (perm: string, lang: Lang) => {
  const parts = perm.split('.');
  const isPanel = parts[0] === 'admin' && parts.length >= 3;
  const rawArea = isPanel ? parts[1] : parts[0];
  const action = parts.slice(isPanel ? 2 : 1).join('.') || rawArea;
  const area = AREA_ALIAS[rawArea] || rawArea;
  const areaLabel = AREA_LABELS[area]?.[lang === 'bn' ? 0 : 1] || readable(area);
  const actionLabel = ACTION_LABELS[action]?.[lang === 'bn' ? 0 : 1] || readable(action);
  return { area, areaLabel, actionLabel, isPanel };
};

export const AdminRolesPage: React.FC<{ onNavigateToUsers?: (roleFilter: string) => void }> = ({
  onNavigateToUsers,
}) => {
  const { lang, t } = useAppUI();
  const n = (v: number) => toBanglaDigits(v, lang);

  const [loading, setLoading] = useState(true);
  const [roleMeta, setRoleMeta] = useState<Record<string, RoleMeta>>({});
  const [matrix, setMatrix] = useState<Record<string, string[]>>({});
  const [userCounts, setUserCounts] = useState<Record<string, number> | null>(null);
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('ALL');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [perms, users] = await Promise.allSettled([BhumiApi.getPermissions(), BhumiApi.listUsers()]);
    if (perms.status === 'fulfilled') {
      setRoleMeta(perms.value?.roles || {});
      setMatrix(perms.value?.matrix || {});
    } else {
      notify.err(perms.reason, lang, t('পদের তালিকা আনা যায়নি', 'Could not load roles'));
    }
    if (users.status === 'fulfilled') {
      const counts: Record<string, number> = {};
      (Array.isArray(users.value) ? users.value : []).forEach((u: any) => {
        const r = u.role || 'citizen';
        counts[r] = (counts[r] || 0) + 1;
      });
      setUserCounts(counts);
    } else {
      setUserCounts(null);
      notify.err(users.reason, lang, t('ব্যবহারকারী গণনা আনা যায়নি', 'Could not load user counts'));
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** matrix is permission → roles; invert to role → permissions. */
  const roles: RoleRow[] = useMemo(() => {
    const byRole: Record<string, string[]> = {};
    Object.entries(matrix).forEach(([perm, list]) => {
      (Array.isArray(list) ? list : []).forEach((r) => {
        (byRole[r] = byRole[r] || []).push(perm);
      });
    });
    const keys = Array.from(new Set([...Object.keys(roleMeta), ...Object.keys(byRole)]));
    return keys.map((key) => {
      const meta = roleMeta[key] || {};
      const apiLabel = lang === 'bn' ? meta.label_bn : meta.label_en || meta.label_bn;
      const fallback = ROLE_LABELS[key]?.[lang === 'bn' ? 0 : 1] || readable(key);
      const [name, sub] = apiLabel ? splitLabel(apiLabel) : [fallback, ''];
      return {
        key,
        tier: meta.tier || '',
        name,
        sub,
        description: (lang === 'bn' ? meta.description_bn : meta.description_en || meta.description_bn) || '',
        permissions: byRole[key] || [],
        users: userCounts ? userCounts[key] || 0 : null,
      };
    });
  }, [matrix, roleMeta, userCounts, lang]);

  const filtered = roles.filter((r) => {
    if (tier !== 'ALL' && r.tier !== tier) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [r.key, r.name, r.sub].some((v) => v.toLowerCase().includes(q));
  });

  const selected = roles.find((r) => r.key === selectedKey) || null;

  const groups = useMemo(() => {
    if (!selected) return [];
    const map = new Map<string, { label: string; items: { perm: string; label: string; panel: boolean }[] }>();
    selected.permissions.forEach((perm) => {
      const p = parsePermission(perm, lang);
      if (!map.has(p.area)) map.set(p.area, { label: p.areaLabel, items: [] });
      map.get(p.area)!.items.push({ perm, label: p.actionLabel, panel: p.isPanel });
    });
    return Array.from(map.entries()).map(([area, g]) => ({ area, ...g }));
  }, [selected, lang]);

  const tierBadge = (code: string) => {
    const info = TIERS[code];
    return info ? <StatusBadge tone={info.tone}>{lang === 'bn' ? info.bn : info.en}</StatusBadge> : <span className="text-slate-400">—</span>;
  };

  const cols = 5;

  return (
    <AdminPage fill>
      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('পদ খুঁজুন…', 'Search roles…')}
        filters={
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger className="h-9 w-40 rounded-lg text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('সব স্তর', 'All levels')}</SelectItem>
              {Object.entries(TIERS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {lang === 'bn' ? v.bn : v.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        actions={
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={load} disabled={loading}>
            <RotateCcw className={cn('size-4', loading && 'animate-spin')} />
            {t('রিফ্রেশ', 'Refresh')}
          </Button>
        }
      />

      <Section fill
        title={t('পদসমূহ', 'Roles')}
        action={!loading && <span className="text-xs text-slate-500">{n(filtered.length)}</span>}
      >
        <TooltipProvider delayDuration={200}>
          <DataTable
            headers={[t('পদ', 'Role'), t('স্তর', 'Level'), t('ব্যবহারকারী', 'Users'), t('অনুমতি', 'Permissions'), '']}
            alignRight={[2, 3, 4]}
          >
            {loading ? (
              <LoadingRows cols={cols} />
            ) : filtered.length === 0 ? (
              <EmptyRow cols={cols} text={t('কোনো পদ পাওয়া যায়নি', 'No roles found')} />
            ) : (
              filtered.map((r) => (
                <tr key={r.key} className="cursor-pointer" onClick={() => setSelectedKey(r.key)}>
                  <td className="max-w-md">
                    <div className="truncate font-medium text-slate-800">{r.name}</div>
                    {r.sub && <div className="truncate text-xs text-slate-500">{r.sub}</div>}
                  </td>
                  <td>{tierBadge(r.tier)}</td>
                  <td className="text-right tabular-nums text-slate-700">{r.users === null ? '—' : n(r.users)}</td>
                  <td className="text-right tabular-nums text-slate-700">{n(r.permissions.length)}</td>
                  <td className="text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label={t('বিস্তারিত', 'Details')}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedKey(r.key);
                          }}
                        >
                          <Eye className="size-4 text-slate-500" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('বিস্তারিত', 'Details')}</TooltipContent>
                    </Tooltip>
                  </td>
                </tr>
              ))
            )}
          </DataTable>
        </TooltipProvider>
      </Section>

      <DetailSheet
        open={!!selected}
        onOpenChange={(o) => !o && setSelectedKey(null)}
        title={selected?.name || ''}
        subtitle={selected?.sub || undefined}
        footer={
          selected &&
          onNavigateToUsers &&
          selected.key !== 'guest' && (
            <Button
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => {
                const key = selected.key;
                setSelectedKey(null);
                onNavigateToUsers(key);
              }}
            >
              <Users className="size-4" />
              {t('ব্যবহারকারী দেখুন', 'View users')}
            </Button>
          )
        }
      >
        {selected && (
          <>
            <DetailList
              items={[
                [t('স্তর', 'Level'), tierBadge(selected.tier)],
                [t('ব্যবহারকারী', 'Users'), selected.users === null ? '—' : n(selected.users)],
                [t('অনুমতি', 'Permissions'), n(selected.permissions.length)],
                [t('কোড', 'Code'), <span className="font-mono text-xs">{selected.key}</span>],
              ]}
            />
            {selected.description && <p className="text-xs text-slate-500">{selected.description}</p>}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-800">{t('অনুমতি', 'Permissions')}</h3>
              {groups.length === 0 ? (
                <EmptyState text={t('কোনো বিশেষ অনুমতি নেই', 'No special permissions')} />
              ) : (
                <Accordion
                  type="multiple"
                  defaultValue={groups.length <= 3 ? groups.map((g) => g.area) : []}
                  className="rounded-lg border border-slate-200 px-3"
                >
                  {groups.map((g) => (
                    <AccordionItem key={g.area} value={g.area} className="last:border-b-0">
                      <AccordionTrigger className="py-2.5 text-sm font-medium text-slate-800 hover:no-underline">
                        <span className="flex items-center gap-2">
                          {g.label}
                          <span className="rounded-full bg-slate-100 px-1.5 text-xs font-normal text-slate-500">{n(g.items.length)}</span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-2.5">
                        <ul className="space-y-1.5">
                          {g.items.map((it) => (
                            <li key={it.perm} className="flex items-center gap-2 text-sm text-slate-700" title={it.perm}>
                              <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                              <span>{it.label}</span>
                              {it.panel && <span className="text-xs text-slate-400">{t('প্যানেল', 'Panel')}</span>}
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          </>
        )}
      </DetailSheet>
    </AdminPage>
  );
};
