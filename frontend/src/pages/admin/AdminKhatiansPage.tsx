import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Lock, RotateCcw, Unlock } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { toBanglaDigits } from '@/theme/tokens';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AdminPage,
  ConfirmDialog,
  DataTable,
  DetailList,
  DetailSheet,
  EmptyRow,
  LoadingRows,
  PageToolbar,
  Section,
  StatusBadge,
  Tone,
  notify,
  statusInfo,
} from '@/components/admin/kit';

/** Short labels for khatian problem codes not covered by the shared status map. */
const ISSUE_LABELS: Record<string, { tone: Tone; bn: string; en: string }> = {
  CHAIN_BREAK: { tone: 'red', bn: 'মালিকানা ছিন্ন', en: 'Chain break' },
  UNRESOLVED_HEIRS: { tone: 'amber', bn: 'ওয়ারিশ অমীমাংসিত', en: 'Heirs unresolved' },
  DISPUTED: { tone: 'red', bn: 'বিরোধ', en: 'Disputed' },
  FLAGGED: { tone: 'red', bn: 'সমস্যা', en: 'Flagged' },
};

const plotIdOf = (k: any): number => Number(k?.plot_id ?? k?.id);

const IconAction: React.FC<{ label: string; onClick: () => void; children: React.ReactNode; className?: string }> = ({
  label,
  onClick,
  children,
  className,
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        className={cn('size-8', className)}
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent className="rounded-md px-2 py-1">{label}</TooltipContent>
  </Tooltip>
);

export const AdminKhatiansPage: React.FC = () => {
  const { lang, t } = useAppUI();
  const n = (v: any) => toBanglaDigits(v ?? '', lang);
  const [items, setItems] = useState<any[]>([]);
  const [frozenMap, setFrozenMap] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [freezeTarget, setFreezeTarget] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, adminList] = await Promise.all([
        BhumiApi.listFlaggedKhatians(),
        // Only used to read each plot's current admin-freeze state.
        BhumiApi.listAdminKhatians({ status: 'FLAGGED' }).catch(() => null),
      ]);
      setItems(Array.isArray(list) ? list : []);
      const map: Record<number, boolean> = {};
      (adminList?.items || []).forEach((r: any) => {
        map[Number(r.plot_id)] = Number(r.is_admin_frozen) === 1;
      });
      setFrozenMap(map);
    } catch (e) {
      notify.err(e, lang);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isFrozen = (k: any) => frozenMap[plotIdOf(k)] ?? Number(k?.is_admin_frozen) === 1;
  const isOwnerLocked = (k: any) => Number(k?.owner_sale_locked) === 1;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((k) =>
      [k.khatian_no, k.khatian_no_bn, k.dag_no, k.dag_no_bn, k.mouza_bn, k.mouza_en].some((v) =>
        String(v || '').toLowerCase().includes(q)
      )
    );
  }, [items, search]);

  const issue = (code?: string) => {
    const hit = ISSUE_LABELS[String(code || '').toUpperCase()];
    return hit ? { tone: hit.tone, label: lang === 'bn' ? hit.bn : hit.en } : statusInfo(code, lang);
  };

  const lockBadge = (k: any) =>
    isFrozen(k) ? (
      <StatusBadge tone="red">{t('আটকানো', 'Frozen')}</StatusBadge>
    ) : isOwnerLocked(k) ? (
      <StatusBadge tone="amber">{t('মালিক লক', 'Owner lock')}</StatusBadge>
    ) : (
      <StatusBadge tone="green">{t('খোলা', 'Open')}</StatusBadge>
    );

  const handleFreeze = async (reason: string) => {
    if (!freezeTarget) return;
    const plotId = plotIdOf(freezeTarget);
    const next = !isFrozen(freezeTarget);
    try {
      const res = await BhumiApi.toggleAdminPlotFreeze(plotId, { is_frozen: next, reason });
      notify.ok(
        (lang === 'bn' ? res?.message_bn || res?.message_en : res?.message_en || res?.message_bn) ||
          (next ? t('জমি আটকানো হয়েছে', 'Plot frozen') : t('জমি খুলে দেওয়া হয়েছে', 'Plot unfrozen'))
      );
      setFrozenMap((m) => ({ ...m, [plotId]: !!(res?.is_admin_frozen ?? next) }));
      await load();
    } catch (e) {
      notify.err(e, lang);
      throw e;
    }
  };

  const area = (k: any) => k.recorded_area_decimal ?? k.total_area_decimal;
  const name = (bn?: string, en?: string) => (lang === 'bn' ? bn || en : en || bn) || '—';
  const targetFrozen = freezeTarget ? isFrozen(freezeTarget) : false;

  return (
    <TooltipProvider delayDuration={200}>
      <AdminPage fill>
        <PageToolbar
          search={search}
          onSearch={setSearch}
          placeholder={t('দাগ, খতিয়ান বা মৌজা…', 'Plot, khatian or mouza…')}
          actions={
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={load} disabled={loading}>
              <RotateCcw className={cn('size-3.5', loading && 'animate-spin')} />
              {t('রিফ্রেশ', 'Refresh')}
            </Button>
          }
        />

        <Section fill title={t('সমস্যাযুক্ত খতিয়ান', 'Flagged khatians')} action={!loading && <span className="text-xs text-slate-500">{n(rows.length)}</span>}>
          <DataTable
            headers={[t('জমি', 'Plot'), t('খতিয়ান', 'Khatian'), t('সমস্যা', 'Issue'), t('লক', 'Lock'), '']}
            alignRight={[4]}
          >
            {loading ? (
              <LoadingRows cols={5} />
            ) : rows.length === 0 ? (
              <EmptyRow cols={5} text={t('কোনো সমস্যা নেই', 'No flagged records')} />
            ) : (
              rows.map((k) => {
                const s = issue(k.status);
                const frozen = isFrozen(k);
                return (
                  <tr key={k.id} className="cursor-pointer" onClick={() => setSelected(k)}>
                    <td>
                      <div className="text-slate-900">{name(k.mouza_bn, k.mouza_en)}</div>
                      <div className="text-xs text-slate-500">
                        {t('দাগ', 'Plot')} {n(k.dag_no_bn || k.dag_no)}
                        {k.upazila_bn && ` · ${name(k.upazila_bn, k.upazila_en)}`}
                      </div>
                    </td>
                    <td>
                      <div className="text-slate-800">
                        {k.survey_type || '—'} {n(k.khatian_no_bn || k.khatian_no)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {area(k) !== undefined && area(k) !== null ? `${n(area(k))} ${t('শতক', 'dec')}` : '—'}
                      </div>
                    </td>
                    <td>
                      <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                    </td>
                    <td>{lockBadge(k)}</td>
                    <td className="text-right whitespace-nowrap">
                      <IconAction label={t('বিস্তারিত', 'Details')} onClick={() => setSelected(k)}>
                        <Eye className="size-4 text-slate-500" />
                      </IconAction>
                      <IconAction
                        label={frozen ? t('খুলে দিন', 'Unfreeze') : t('আটকান', 'Freeze')}
                        onClick={() => setFreezeTarget(k)}
                      >
                        {frozen ? <Unlock className="size-4 text-emerald-600" /> : <Lock className="size-4 text-rose-600" />}
                      </IconAction>
                    </td>
                  </tr>
                );
              })
            )}
          </DataTable>
        </Section>

        <DetailSheet
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          title={
            selected
              ? `${t('খতিয়ান', 'Khatian')} ${n(selected.khatian_no_bn || selected.khatian_no)}`
              : t('খতিয়ান', 'Khatian')
          }
          subtitle={selected ? `${name(selected.mouza_bn, selected.mouza_en)} · ${t('দাগ', 'Plot')} ${n(selected.dag_no_bn || selected.dag_no)}` : undefined}
          footer={
            selected && (
              <Button
                size="sm"
                variant={isFrozen(selected) ? 'outline' : 'destructive'}
                className="h-9 gap-1.5"
                onClick={() => setFreezeTarget(selected)}
              >
                {isFrozen(selected) ? <Unlock className="size-4" /> : <Lock className="size-4" />}
                {isFrozen(selected) ? t('খুলে দিন', 'Unfreeze') : t('জমি আটকান', 'Freeze plot')}
              </Button>
            )
          }
        >
          {selected && (
            <>
              <DetailList
                items={[
                  [t('সমস্যা', 'Issue'), <StatusBadge key="i" tone={issue(selected.status).tone}>{issue(selected.status).label}</StatusBadge>],
                  [t('লক', 'Lock'), <span key="l">{lockBadge(selected)}</span>],
                  [t('জরিপ', 'Survey'), selected.survey_type || '—'],
                  !!selected.survey_year && [t('জরিপের বছর', 'Survey year'), n(selected.survey_year)],
                  [t('রেকর্ডকৃত জমি', 'Recorded area'), selected.recorded_area_decimal != null ? `${n(selected.recorded_area_decimal)} ${t('শতক', 'dec')}` : '—'],
                  [t('দাগের মোট জমি', 'Plot area'), selected.total_area_decimal != null ? `${n(selected.total_area_decimal)} ${t('শতক', 'dec')}` : '—'],
                  !!selected.parent_khatian_no && [t('আগের খতিয়ান', 'Parent khatian'), n(selected.parent_khatian_no)],
                  [t('উপজেলা', 'Upazila'), name(selected.upazila_bn, selected.upazila_en)],
                ]}
              />
              {(selected.remarks_bn || selected.remarks_en) && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-500">{t('মন্তব্য', 'Note')}</div>
                  <p className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    {name(selected.remarks_bn, selected.remarks_en)}
                  </p>
                </div>
              )}
              <p className="text-xs text-slate-500">{t('সংশোধন শুধু এসি ল্যান্ড করতে পারেন', 'Only AC Land can correct records')}</p>
            </>
          )}
        </DetailSheet>

        <ConfirmDialog
          open={!!freezeTarget}
          onOpenChange={(o) => !o && setFreezeTarget(null)}
          title={targetFrozen ? t('জমি খুলে দেবেন?', 'Unfreeze plot?') : t('জমি আটকাবেন?', 'Freeze plot?')}
          description={
            freezeTarget
              ? `${name(freezeTarget.mouza_bn, freezeTarget.mouza_en)} · ${t('দাগ', 'Plot')} ${n(freezeTarget.dag_no_bn || freezeTarget.dag_no)}`
              : undefined
          }
          confirmLabel={targetFrozen ? t('খুলে দিন', 'Unfreeze') : t('আটকান', 'Freeze')}
          cancelLabel={t('বাতিল', 'Cancel')}
          destructive={!targetFrozen}
          askReason={{
            label: t('কারণ', 'Reason'),
            placeholder: targetFrozen ? t('যাচাই শেষ', 'Review complete') : t('যেমন: মালিকানা বিরোধ', 'e.g. ownership dispute'),
            minLength: 3,
          }}
          onConfirm={handleFreeze}
        />
      </AdminPage>
    </TooltipProvider>
  );
};
