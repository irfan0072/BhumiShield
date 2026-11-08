import React, { useMemo, useState } from 'react';
import { CheckCircle2, Eye, MapPin, RotateCcw, XCircle } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AddressCascader, AddressSelection } from '@/components/AddressCascader';
import { triggerAppNotification } from '@/components/NotificationCenter';
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
  StatusCode,
  notify,
} from '@/components/admin/kit';
import { BlockedNote, SectionProps, canDecideMutation, textareaCls, up, useFmt, useSectionIntent } from './shared';

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

export const MutationsSection: React.FC<SectionProps> = ({ data, loaded, reload, intent, clearIntent }) => {
  const { role } = useAppUI();
  const { lang, t, n, date, name, dec } = useFmt();
  const mutations = data.mutations;

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [area, setArea] = useState({ division: '', district: '', upazila: '', mouzaId: '' as string | number });
  const [selected, setSelected] = useState<any | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useSectionIntent('mutations', intent, clearIntent, loaded, (i) => {
    const hit = mutations.find((m) => String(m.id) === String(i.recordId));
    if (hit) setSelected(hit);
  });

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { ALL: mutations.length, PENDING: 0, APPROVED: 0, REJECTED: 0 };
    mutations.forEach((m) => {
      const s = up(m.status) as StatusFilter;
      if (s in c && s !== 'ALL') c[s] += 1;
    });
    return c;
  }, [mutations]);

  const areaActive = !!(area.division || area.district || area.upazila || area.mouzaId);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mutations.filter((m) => {
      if (status !== 'ALL' && up(m.status) !== status) return false;
      if (area.division && m.division_bn && m.division_bn !== area.division) return false;
      if (area.district && m.district_bn && m.district_bn !== area.district) return false;
      if (area.upazila && m.upazila_bn && m.upazila_bn !== area.upazila) return false;
      if (area.mouzaId && m.mouza_id && Number(m.mouza_id) !== Number(area.mouzaId)) return false;
      if (!q) return true;
      return [m.case_no, m.dag_no, m.dag_no_bn, m.applicant_name_bn, m.buyer_name_bn, m.mouza_bn, m.deed_no]
        .some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [mutations, status, area, search]);

  const onArea = (sel: AddressSelection) =>
    setArea({
      division: sel.division_bn,
      district: sel.district_bn,
      upazila: sel.upazila_bn,
      mouzaId: sel.mouza_id ? String(sel.mouza_id) : '',
    });

  const refresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const openDecision = (d: 'APPROVED' | 'REJECTED') => {
    setNote('');
    setDecision(d);
  };

  const submitDecision = async () => {
    if (!selected || !decision) return;
    setBusy(true);
    try {
      const res = await BhumiApi.decideMutation(selected.id, decision, note.trim());
      notify.ok(
        (lang === 'bn' ? res?.message_bn : res?.message_en) ||
          (decision === 'APPROVED' ? t('নামজারি অনুমোদিত', 'Mutation approved') : t('নামজারি বাতিল', 'Mutation rejected'))
      );
      triggerAppNotification({
        title_bn: decision === 'APPROVED' ? 'নামজারি অনুমোদিত' : 'নামজারি নামঞ্জুর',
        title_en: decision === 'APPROVED' ? 'Mutation approved' : 'Mutation rejected',
        message_bn: `কেস ${selected.case_no}, দাগ ${selected.dag_no_bn || selected.dag_no}`,
        message_en: `Case ${selected.case_no}, plot ${selected.dag_no}`,
        type: decision === 'APPROVED' ? 'SUCCESS' : 'ALERT',
        targetTab: 'acland',
        targetSection: 'mutations',
      });
      setDecision(null);
      setSelected(null);
      await reload();
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setBusy(false);
    }
  };

  const tabs: Array<[StatusFilter, string]> = [
    ['ALL', t('সব', 'All')],
    ['PENDING', t('অপেক্ষমাণ', 'Pending')],
    ['APPROVED', t('অনুমোদিত', 'Approved')],
    ['REJECTED', t('বাতিল', 'Rejected')],
  ];
  const canDecide = canDecideMutation(role);
  const pending = selected && up(selected.status) === 'PENDING';

  return (
    <AdminPage fill>
      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('কেস, দাগ বা নাম…', 'Case, plot or name…')}
        filters={
          <>
            <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
              <TabsList className="h-9">
                {tabs.map(([key, l]) => (
                  <TabsTrigger key={key} value={key} className="gap-1.5 px-3 text-xs">
                    {l}
                    <span className="text-slate-400">{n(counts[key])}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('h-9 gap-1.5', areaActive && 'border-[#006A4E] text-[#006A4E]')}>
                  <MapPin className="size-3.5" />
                  {t('এলাকা', 'Area')}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 space-y-3 p-3">
                <AddressCascader
                  selectedDivision={area.division}
                  selectedDistrict={area.district}
                  selectedUpazila={area.upazila}
                  selectedMouzaId={area.mouzaId}
                  onChange={onArea}
                  isFilter
                  showMouza
                  layout="stacked"
                  lang={lang}
                />
                {areaActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full text-xs"
                    onClick={() => setArea({ division: '', district: '', upazila: '', mouzaId: '' })}
                  >
                    {t('এলাকা মুছুন', 'Clear area')}
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          </>
        }
        actions={
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={refresh} disabled={refreshing}>
            <RotateCcw className={cn('size-3.5', refreshing && 'animate-spin')} />
            {t('রিফ্রেশ', 'Refresh')}
          </Button>
        }
      />

      <Section fill>
        <DataTable headers={[t('কেস', 'Case'), t('আবেদনকারী', 'Applicant'), t('জমি', 'Land'), t('অবস্থা', 'Status'), '']} alignRight={[4]}>
          {!loaded ? (
            <LoadingRows cols={5} />
          ) : rows.length === 0 ? (
            <EmptyRow cols={5} text={t('কোনো আবেদন নেই', 'No cases')} />
          ) : (
            rows.map((m) => (
              <tr key={m.id} className="cursor-pointer" onClick={() => setSelected(m)}>
                <td>
                  <div className="font-medium text-slate-900">{m.case_no || '—'}</div>
                  <div className="text-xs text-slate-500">{date(m.created_at)}</div>
                </td>
                <td>
                  <div className="text-slate-800">{name(m.applicant_name_bn || m.buyer_name_bn, m.applicant_name_en || m.buyer_name_en)}</div>
                  {m.deed_no && (
                    <div className="text-xs text-slate-500">
                      {t('দলিল', 'Deed')} {n(m.deed_no)}
                    </div>
                  )}
                </td>
                <td>
                  <div className="text-slate-800">{name(m.mouza_bn, m.mouza_en)}</div>
                  <div className="text-xs text-slate-500">
                    {t('দাগ', 'Plot')} {n(m.dag_no_bn || m.dag_no)} · {dec(m.area_decimal)}
                  </div>
                </td>
                <td>
                  <StatusCode code={m.status} lang={lang} />
                </td>
                <td className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t('বিস্তারিত', 'Details')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(m);
                    }}
                  >
                    <Eye className="size-4 text-slate-500" />
                  </Button>
                </td>
              </tr>
            ))
          )}
        </DataTable>
      </Section>

      <DetailSheet
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected?.case_no || t('নামজারি', 'Mutation')}
        subtitle={selected ? <StatusCode code={selected.status} lang={lang} /> : undefined}
        footer={
          selected &&
          pending &&
          (canDecide ? (
            <>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-rose-700" onClick={() => openDecision('REJECTED')}>
                <XCircle className="size-4" />
                {t('নামঞ্জুর', 'Reject')}
              </Button>
              <Button size="sm" className="h-9 gap-1.5" onClick={() => openDecision('APPROVED')}>
                <CheckCircle2 className="size-4" />
                {t('অনুমোদন', 'Approve')}
              </Button>
            </>
          ) : (
            <BlockedNote>{t('সিদ্ধান্ত শুধু এসি ল্যান্ড দিতে পারেন', 'Only AC Land can decide')}</BlockedNote>
          ))
        }
      >
        {selected && (
          <Tabs defaultValue="land">
            <TabsList className="h-9 w-full">
              <TabsTrigger value="land" className="flex-1 text-xs">{t('জমি', 'Land')}</TabsTrigger>
              <TabsTrigger value="parties" className="flex-1 text-xs">{t('পক্ষ', 'Parties')}</TabsTrigger>
              <TabsTrigger value="decision" className="flex-1 text-xs">{t('সিদ্ধান্ত', 'Decision')}</TabsTrigger>
            </TabsList>
            <TabsContent value="land" className="mt-3">
              <DetailList
                items={[
                  [t('মৌজা', 'Mouza'), name(selected.mouza_bn, selected.mouza_en)],
                  !!(selected.upazila_bn || selected.upazila_en) && [t('উপজেলা', 'Upazila'), name(selected.upazila_bn, selected.upazila_en)],
                  [t('দাগ', 'Plot'), n(selected.dag_no_bn || selected.dag_no)],
                  [t('জমি', 'Area'), dec(selected.area_decimal)],
                  !!selected.share_fraction && [t('অংশ', 'Share'), n(selected.share_fraction)],
                  [t('দলিল নং', 'Deed no'), selected.deed_no ? n(selected.deed_no) : '—'],
                  [t('আবেদনের তারিখ', 'Applied'), date(selected.created_at)],
                ]}
              />
            </TabsContent>
            <TabsContent value="parties" className="mt-3">
              <DetailList
                items={[
                  [
                    t('আবেদনকারী', 'Applicant'),
                    <span key="a">
                      {name(selected.applicant_name_bn || selected.buyer_name_bn, selected.applicant_name_en || selected.buyer_name_en)}
                      {(selected.applicant_nid || selected.buyer_nid) && (
                        <span className="block text-xs font-normal text-slate-500">{n(selected.applicant_nid || selected.buyer_nid)}</span>
                      )}
                    </span>,
                  ],
                  !!(selected.seller_name_bn || selected.seller_name_en) && [
                    t('বিক্রেতা', 'Seller'),
                    <span key="s">
                      {name(selected.seller_name_bn, selected.seller_name_en)}
                      {selected.seller_nid && <span className="block text-xs font-normal text-slate-500">{n(selected.seller_nid)}</span>}
                    </span>,
                  ],
                  !!(selected.applicant_phone || selected.phone) && [t('মোবাইল', 'Mobile'), n(selected.applicant_phone || selected.phone)],
                ]}
              />
            </TabsContent>
            <TabsContent value="decision" className="mt-3">
              {selected.decided_by || selected.decision_reason_bn ? (
                <DetailList
                  items={[
                    [t('সিদ্ধান্ত দিয়েছেন', 'Decided by'), selected.decided_by || '—'],
                    [t('তারিখ', 'Date'), date(selected.decided_at)],
                    [
                      t('কারণ', 'Reason'),
                      (lang === 'bn'
                        ? selected.decision_reason_bn || selected.decision_reason_en
                        : selected.decision_reason_en || selected.decision_reason_bn) || '—',
                    ],
                  ]}
                />
              ) : (
                <p className="text-sm text-slate-500">{t('এখনো সিদ্ধান্ত হয়নি', 'Not decided yet')}</p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DetailSheet>

      <FormDialog
        open={!!decision}
        onOpenChange={(o) => !o && setDecision(null)}
        title={decision === 'APPROVED' ? t('নামজারি অনুমোদন', 'Approve mutation') : t('নামজারি নামঞ্জুর', 'Reject mutation')}
        description={selected?.case_no}
        submitLabel={decision === 'APPROVED' ? t('অনুমোদন', 'Approve') : t('নামঞ্জুর', 'Reject')}
        cancelLabel={t('বাতিল', 'Cancel')}
        destructive={decision === 'REJECTED'}
        busy={busy}
        disabled={note.trim().length < 5}
        onSubmit={submitDecision}
      >
        <Field label={t('আদেশের কারণ', 'Order reason')} hint={t('অন্তত ৫ অক্ষর', 'At least 5 characters')}>
          <textarea
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              decision === 'APPROVED'
                ? t('কী যাচাই করে অনুমোদন দিচ্ছেন', 'What you checked before approving')
                : t('নামঞ্জুরের কারণ লিখুন', 'Why this is rejected')
            }
            className={textareaCls}
          />
        </Field>
      </FormDialog>
    </AdminPage>
  );
};
