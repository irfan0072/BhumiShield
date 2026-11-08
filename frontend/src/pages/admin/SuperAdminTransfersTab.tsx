import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Clock, Eye, FilePen, MoreHorizontal, RotateCcw, UserCheck } from 'lucide-react';
import { BhumiApi } from '@/api/client';
import { toBanglaDigits } from '@/theme/tokens';
import { useAppUI } from '@/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AdminPage,
  DataTable,
  DetailList,
  DetailSheet,
  EmptyRow,
  Field,
  FormDialog,
  LoadingRows,
  PageToolbar,
  Section,
  StatusBadge,
  Tone,
  notify,
} from '@/components/admin/kit';

interface SuperAdminTransfersTabProps {
  transfers: any[];
  usersList?: any[];
  officesList?: any[];
  onRefresh: () => void;
  onOpenOverride?: (type: string, id: string | number, extra?: any) => void;
}

const TOTAL_STEPS = 13;

/** Public stages used by the backend transfer state machine. */
const STAGES: Record<string, { tone: Tone; bn: string; en: string }> = {
  START: { tone: 'slate', bn: 'শুরু', en: 'Started' },
  VERIFY: { tone: 'amber', bn: 'যাচাই', en: 'Verifying' },
  REGISTER: { tone: 'blue', bn: 'নিবন্ধন', en: 'Registry' },
  REVIEW: { tone: 'violet', bn: 'নামজারি', en: 'Mutation' },
  DONE: { tone: 'green', bn: 'সম্পন্ন', en: 'Done' },
};

/** Step names, same as backend TransferStateMachine::STAGES. */
const STEP_NAMES: Array<[string, string]> = [
  ['আবেদনের খসড়া সংরক্ষিত', 'Application draft saved'],
  ['বিক্রেতা আবেদন নিশ্চিত করেছেন', 'Seller confirmed application'],
  ['পক্ষগুলোর তথ্য নিশ্চিত', 'Parties information confirmed'],
  ['ক্রেতা পরিমাণ ও শর্ত নিশ্চিত করেছেন', 'Buyer confirmed area and terms'],
  ['রেকর্ড পর্যালোচনার ধাপ', 'Record review recorded'],
  ['নিবন্ধনের প্রস্তুতি পর্যালোচিত', 'Registration requirements reviewed'],
  ['নিবন্ধনের জন্য প্রস্তুত', 'Ready for registry review'],
  ['রেজিস্ট্রি অফিসে পাঠানো হয়েছে', 'Sent to registry office'],
  ['কাউন্টারে পরিচয় যাচাই সম্পন্ন', 'Counter identity check recorded'],
  ['দলিল নিবন্ধিত ও নামজারি অপেক্ষমাণ', 'Deed registered; mutation pending'],
  ['নামজারি পর্যালোচনায় পাঠানো হয়েছে', 'Sent for mutation review'],
  ['শুনানির পর্যালোচনা সংরক্ষিত', 'Hearing review recorded'],
  ['স্থানীয় মালিকানা রেকর্ড হালনাগাদ', 'Local ownership record updated'],
];

const OFFICER_ROLES: Record<string, [string, string]> = {
  ac_land: ['এসি ল্যান্ড', 'AC Land'],
  sub_registrar: ['সাব-রেজিস্ট্রার', 'Sub-registrar'],
  land_office_assistant: ['ভূমি সহকারী', 'Land assistant'],
  field_verification_officer: ['মাঠ যাচাই', 'Field officer'],
  service_point_operator: ['সেবা কেন্দ্র', 'Service point'],
};

const DEED_TYPES: Record<string, [string, string]> = {
  SALE: ['বিক্রয়', 'Sale'],
  HIBA: ['হেবা', 'Gift'],
  GIFT: ['হেবা', 'Gift'],
  INHERITANCE: ['উত্তরাধিকার', 'Inheritance'],
  EXCHANGE: ['বিনিময়', 'Exchange'],
};

const MIN_CORRECTION = 10;

export const SuperAdminTransfersTab: React.FC<SuperAdminTransfersTabProps> = ({
  transfers,
  usersList = [],
  officesList = [],
  onRefresh,
}) => {
  const { t, lang } = useAppUI();
  const n = (v: any) => toBanglaDigits(v ?? '', lang);
  const pick = (bn?: string, en?: string) => (lang === 'bn' ? bn || en : en || bn) || '';

  const [local, setLocal] = useState<any[]>(transfers || []);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('ALL');
  const [selected, setSelected] = useState<any | null>(null);

  // Reassign dialog
  const [reassignTarget, setReassignTarget] = useState<any | null>(null);
  const [userId, setUserId] = useState('');
  const [officeId, setOfficeId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassignBusy, setReassignBusy] = useState(false);

  // Correction dialog
  const [correctionTarget, setCorrectionTarget] = useState<any | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionBusy, setCorrectionBusy] = useState(false);

  const fetchOwn = async () => {
    setLoading(true);
    try {
      const res: any = await BhumiApi.listTransfers();
      setLocal(res?.items || (Array.isArray(res) ? res : []));
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (transfers && transfers.length > 0) setLocal(transfers);
  }, [transfers]);

  useEffect(() => {
    if (!transfers || transfers.length === 0) fetchOwn();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshAll = () => {
    onRefresh();
    fetchOwn();
  };

  const list = local.length > 0 ? local : transfers || [];

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((x) => {
      if (stage !== 'ALL' && String(x.public_stage || '').toUpperCase() !== stage) return false;
      if (!q) return true;
      return [x.transfer_code, x.created_by_nid, x.assigned_to_name, x.assigned_office_bn, x.plot_id, x.dag_no_bn, x.dag_no, x.mouza_bn]
        .some((v) => String(v ?? '').toLowerCase().includes(q));
    });
  }, [list, search, stage]);

  // Keep the open detail panel in sync with refreshed data.
  useEffect(() => {
    if (!selected) return;
    const fresh = list.find((x) => x.id === selected.id);
    if (fresh && fresh !== selected) setSelected(fresh);
  }, [list]); // eslint-disable-line react-hooks/exhaustive-deps

  const officers = useMemo(() => usersList.filter((u) => OFFICER_ROLES[u.role]), [usersList]);
  const roleLabel = (r: string) => {
    const hit = OFFICER_ROLES[r];
    return hit ? (lang === 'bn' ? hit[0] : hit[1]) : r;
  };
  const deedType = (v?: string) => {
    const hit = DEED_TYPES[String(v || '').toUpperCase()];
    return hit ? (lang === 'bn' ? hit[0] : hit[1]) : v || '—';
  };
  const stageBadge = (code?: string) => {
    const s = STAGES[String(code || '').toUpperCase()];
    return <StatusBadge tone={s?.tone || 'slate'}>{s ? (lang === 'bn' ? s.bn : s.en) : code || '—'}</StatusBadge>;
  };
  const stepName = (x: any) => {
    const step = Number(x?.current_step) || 0;
    return pick(x?.step_name_bn, x?.step_name_en) || (STEP_NAMES[step - 1] ? pick(...STEP_NAMES[step - 1]) : '—');
  };
  const money = (v: any) => `৳ ${n(Number(v || 0).toLocaleString('en-IN'))}`;

  const openReassign = (x: any) => {
    setReassignTarget(x);
    setUserId(x.assigned_to_user_id ? String(x.assigned_to_user_id) : '');
    setOfficeId(x.assigned_office_id ? String(x.assigned_office_id) : '');
    setReassignReason('');
  };

  const openCorrection = (x: any) => {
    setCorrectionTarget(x);
    setCorrectionReason(x.correction_notes_bn || '');
  };

  const submitReassign = async () => {
    if (!reassignTarget) return;
    const officer = usersList.find((u) => String(u.id) === userId);
    const office = officesList.find((o) => String(o.id) === officeId);
    setReassignBusy(true);
    try {
      const res = await BhumiApi.reassignTransfer(reassignTarget.id, {
        assigned_to_user_id: userId ? Number(userId) : undefined,
        assigned_to_name: officer ? officer.full_name_bn || officer.username : undefined,
        assigned_office_id: officeId ? Number(officeId) : undefined,
        assigned_office_bn: office ? office.name_bn : undefined,
        reason_bn: reassignReason.trim(),
      });
      notify.ok(pick(res?.message_bn, res?.message_en) || t('দায়িত্ব বদলানো হয়েছে', 'Reassigned'));
      setReassignTarget(null);
      refreshAll();
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setReassignBusy(false);
    }
  };

  const submitCorrection = async () => {
    if (!correctionTarget) return;
    if (correctionReason.trim().length < MIN_CORRECTION) {
      notify.err(null, lang, t('কমপক্ষে ১০ অক্ষর লিখুন', 'Write at least 10 characters'));
      return;
    }
    setCorrectionBusy(true);
    try {
      const res = await BhumiApi.requestTransferCorrection(correctionTarget.id, { reason_bn: correctionReason.trim() });
      notify.ok(pick(res?.message_bn, res?.message_en) || t('সংশোধন চাওয়া হয়েছে', 'Correction requested'));
      setCorrectionTarget(null);
      refreshAll();
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setCorrectionBusy(false);
    }
  };

  const correctionLen = correctionReason.trim().length;
  const curStep = Number(selected?.current_step) || 0;

  return (
    <AdminPage fill>
      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('কোড, দাগ, এনআইডি বা কর্মকর্তা…', 'Code, plot, NID or officer…')}
        filters={
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="h-9 w-36 rounded-lg text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('সব ধাপ', 'All stages')}</SelectItem>
              {Object.entries(STAGES).map(([k, s]) => (
                <SelectItem key={k} value={k}>
                  {lang === 'bn' ? s.bn : s.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        actions={
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={refreshAll} disabled={loading}>
            <RotateCcw className={cn('size-3.5', loading && 'animate-spin')} />
            {t('রিফ্রেশ', 'Refresh')}
          </Button>
        }
      />

      <Section fill>
        <DataTable
          headers={[t('আবেদন', 'Application'), t('জমি', 'Land'), t('অগ্রগতি', 'Progress'), t('কর্মকর্তা', 'Officer'), '']}
          alignRight={[4]}
        >
          {loading && list.length === 0 ? (
            <LoadingRows cols={5} />
          ) : rows.length === 0 ? (
            <EmptyRow cols={5} text={t('কোনো আবেদন নেই', 'No applications')} />
          ) : (
            rows.map((x) => (
              <tr key={x.id} className="cursor-pointer" onClick={() => setSelected(x)}>
                <td>
                  <div className="font-mono text-sm font-medium text-slate-900">{x.transfer_code}</div>
                  <div className="text-xs text-slate-500">
                    {deedType(x.deed_type)} · {n(String(x.created_at || '').slice(0, 10)) || '—'}
                  </div>
                </td>
                <td>
                  <div className="text-slate-800">
                    {pick(x.mouza_bn, x.mouza_en) || '—'} · {t('দাগ', 'Plot')} {n(x.dag_no_bn || x.dag_no || x.plot_id)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {n(x.transfer_area_decimal || 0)} {t('শতক', 'dec')} · {money(x.proposed_price_bdt)}
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    {stageBadge(x.public_stage)}
                    <span className="text-xs text-slate-500">
                      {n(x.current_step || 0)}/{n(TOTAL_STEPS)}
                    </span>
                    {x.correction_notes_bn && <StatusBadge tone="amber">{t('সংশোধন', 'Correction')}</StatusBadge>}
                  </div>
                  <div className="mt-0.5 max-w-56 truncate text-xs text-slate-500">{stepName(x)}</div>
                </td>
                <td>
                  {x.assigned_to_name ? (
                    <>
                      <div className="text-slate-800">{x.assigned_to_name}</div>
                      <div className="max-w-48 truncate text-xs text-slate-500">{x.assigned_office_bn || '—'}</div>
                    </>
                  ) : (
                    <StatusBadge tone="amber">{t('দেওয়া হয়নি', 'Unassigned')}</StatusBadge>
                  )}
                </td>
                <td className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8" aria-label={t('কাজ', 'Actions')}>
                        <MoreHorizontal className="size-4 text-slate-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => setSelected(x)}>
                        <Eye className="size-4" />
                        {t('বিস্তারিত', 'Details')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => openReassign(x)}>
                        <UserCheck className="size-4" />
                        {t('দায়িত্ব বদল', 'Reassign')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openCorrection(x)}>
                        <FilePen className="size-4" />
                        {t('সংশোধন চান', 'Ask correction')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))
          )}
        </DataTable>
      </Section>

      {/* Details */}
      <DetailSheet
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={<span className="font-mono">{selected?.transfer_code}</span>}
        subtitle={selected ? `${t('ধাপ', 'Step')} ${n(curStep)}/${n(TOTAL_STEPS)} · ${stepName(selected)}` : undefined}
        footer={
          selected && (
            <>
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => openCorrection(selected)}>
                <FilePen className="size-4" />
                {t('সংশোধন চান', 'Ask correction')}
              </Button>
              <Button size="sm" className="h-9 gap-1.5" onClick={() => openReassign(selected)}>
                <UserCheck className="size-4" />
                {t('দায়িত্ব বদল', 'Reassign')}
              </Button>
            </>
          )
        }
      >
        {selected && (
          <>
            <DetailList
              items={[
                [t('ধাপ', 'Stage'), stageBadge(selected.public_stage)],
                [t('দলিলের ধরন', 'Deed type'), deedType(selected.deed_type)],
                [t('মৌজা', 'Mouza'), pick(selected.mouza_bn, selected.mouza_en) || '—'],
                [t('দাগ', 'Plot'), n(selected.dag_no_bn || selected.dag_no || selected.plot_id)],
                [t('জমি', 'Land'), `${n(selected.transfer_area_decimal || 0)} ${t('শতক', 'dec')}`],
                [t('মূল্য', 'Price'), money(selected.proposed_price_bdt)],
                [t('আবেদনকারী', 'Applicant'), selected.created_by_nid ? n(selected.created_by_nid) : '—'],
                [t('কর্মকর্তা', 'Officer'), selected.assigned_to_name || t('দেওয়া হয়নি', 'Unassigned')],
                [t('অফিস', 'Office'), selected.assigned_office_bn || '—'],
              ]}
            />

            {selected.correction_notes_bn && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-500">{t('সংশোধনের অনুরোধ', 'Correction request')}</div>
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{selected.correction_notes_bn}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="text-xs font-medium text-slate-500">{t('ধাপসমূহ', 'Steps')}</div>
              <ol className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {STEP_NAMES.map((s, i) => {
                  const num = i + 1;
                  const done = curStep > num || (String(selected.public_stage).toUpperCase() === 'DONE' && curStep >= num);
                  const current = !done && curStep === num;
                  return (
                    <li
                      key={num}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-1.5 text-sm',
                        done ? 'text-slate-700' : current ? 'bg-amber-50/60 font-medium text-amber-900' : 'text-slate-400'
                      )}
                    >
                      {done ? (
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                      ) : current ? (
                        <Clock className="size-4 shrink-0 text-amber-600" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-slate-300" />
                      )}
                      <span className="w-5 shrink-0 text-xs text-slate-400">{n(num)}</span>
                      <span className="min-w-0 truncate">{pick(s[0], s[1])}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </>
        )}
      </DetailSheet>

      {/* Reassign */}
      <FormDialog
        open={!!reassignTarget}
        onOpenChange={(o) => !o && setReassignTarget(null)}
        title={t('দায়িত্ব বদল', 'Reassign')}
        description={reassignTarget?.transfer_code}
        submitLabel={t('সংরক্ষণ', 'Save')}
        cancelLabel={t('বাতিল', 'Cancel')}
        busy={reassignBusy}
        disabled={(!userId && !officeId) || !reassignReason.trim()}
        onSubmit={submitReassign}
      >
        <Field label={t('কর্মকর্তা', 'Officer')}>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger className="h-9 w-full rounded-lg text-sm">
              <SelectValue placeholder={t('বাছাই করুন', 'Choose')} />
            </SelectTrigger>
            <SelectContent>
              {officers.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-slate-500">{t('কোনো কর্মকর্তা নেই', 'No officers')}</div>
              ) : (
                officers.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {pick(u.full_name_bn, u.full_name_en) || u.username} · {roleLabel(u.role)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t('অফিস', 'Office')}>
          <Select value={officeId} onValueChange={setOfficeId}>
            <SelectTrigger className="h-9 w-full rounded-lg text-sm">
              <SelectValue placeholder={t('বাছাই করুন', 'Choose')} />
            </SelectTrigger>
            <SelectContent>
              {officesList.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-slate-500">{t('কোনো অফিস নেই', 'No offices')}</div>
              ) : (
                officesList.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {pick(o.name_bn, o.name_en)}
                    {o.district_bn ? ` · ${pick(o.district_bn, o.district_en)}` : ''}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t('কারণ', 'Reason')}>
          <Textarea
            rows={2}
            value={reassignReason}
            onChange={(e) => setReassignReason(e.target.value)}
            placeholder={t('যেমন: কাজের চাপ', 'e.g. workload')}
            className="min-h-0 rounded-lg text-sm"
          />
        </Field>
      </FormDialog>

      {/* Correction request */}
      <FormDialog
        open={!!correctionTarget}
        onOpenChange={(o) => !o && setCorrectionTarget(null)}
        title={t('সংশোধন চান', 'Ask correction')}
        description={correctionTarget?.transfer_code}
        submitLabel={t('পাঠান', 'Send')}
        cancelLabel={t('বাতিল', 'Cancel')}
        busy={correctionBusy}
        disabled={correctionLen < MIN_CORRECTION}
        onSubmit={submitCorrection}
      >
        <Field
          label={t('কী ঠিক করতে হবে', 'What to fix')}
          hint={
            correctionLen < MIN_CORRECTION
              ? t(`কমপক্ষে ${n(MIN_CORRECTION)} অক্ষর · ${n(correctionLen)}`, `At least ${MIN_CORRECTION} characters · ${correctionLen}`)
              : undefined
          }
        >
          <Textarea
            rows={4}
            value={correctionReason}
            onChange={(e) => setCorrectionReason(e.target.value)}
            placeholder={t('যেমন: খতিয়ানের স্পষ্ট কপি দিন', 'e.g. upload a clear khatian copy')}
            className="min-h-0 rounded-lg text-sm"
          />
        </Field>
      </FormDialog>
    </AdminPage>
  );
};
