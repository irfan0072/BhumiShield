import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { BhumiApi } from '@/api/client';
import {
  AdminPage,
  PageToolbar,
  Section,
  DataTable,
  LoadingRows,
  EmptyRow,
  EmptyState,
  DetailList,
  DetailSheet,
  ConfirmDialog,
  StatusBadge,
  StatusCode,
  notify,
  apiMessage,
  inputCls,
} from '@/components/admin/kit';
import { TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  MapPin,
  Lock,
  Unlock,
  FolderOpen,
  ArrowLeftRight,
  Scale,
  ExternalLink,
  ShieldCheck,
  Eye,
  RotateCw,
} from 'lucide-react';
import type { CitizenOwnedPlot } from '@/components/citizen/MyLandMap';
import { CitizenSectionCommonProps, useCitizenFmt, plotStatusBadge } from './shared';

const LazyMyLandMap = React.lazy(() => import('@/components/citizen/MyLandMap'));

const SURVEY_ORDER = ['CS', 'SA', 'RS', 'BS'] as const;

export const PlotsSection: React.FC<CitizenSectionCommonProps> = ({
  vault,
  loading,
  disputes,
  onRefreshAll,
  onSelectSection,
  onNavigate,
  selectedPlotId,
  setSelectedPlotId,
  onOpenPassport,
}) => {
  const { t, lang, fmtNum, pick } = useCitizenFmt();
  const [search, setSearch] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Full plot bundle for khatian chain & co-owners
  const [plotBundle, setPlotBundle] = useState<any | null>(null);
  const [bundleLoading, setBundleLoading] = useState(false);

  // ConfirmDialog state for Sale Lock toggle
  const [lockConfirmOpen, setLockConfirmOpen] = useState(false);
  const [lockTargetPlot, setLockTargetPlot] = useState<CitizenOwnedPlot | null>(null);
  const [lockBusy, setLockBusy] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const plots = vault.owned_plots || [];

  const filteredPlots = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return plots;
    return plots.filter(
      (p) =>
        String(p.dag_no || '').toLowerCase().includes(q) ||
        String(p.dag_no_bn || '').toLowerCase().includes(q) ||
        String(p.khatian_no || '').toLowerCase().includes(q) ||
        String(p.khatian_no_bn || '').toLowerCase().includes(q) ||
        String(p.mouza_bn || '').toLowerCase().includes(q) ||
        String(p.mouza_en || '').toLowerCase().includes(q) ||
        String(p.upazila_bn || '').toLowerCase().includes(q)
    );
  }, [plots, search]);

  const activePlot = useMemo(() => {
    if (selectedPlotId !== null) {
      const m = plots.find((p) => Number(p.plot_id) === Number(selectedPlotId));
      if (m) return m;
    }
    return filteredPlots[0] || null;
  }, [plots, filteredPlots, selectedPlotId]);

  useEffect(() => {
    let live = true;
    if (!activePlot?.plot_id) {
      setPlotBundle(null);
      return;
    }
    setBundleLoading(true);
    BhumiApi.getPlotDetail(activePlot.plot_id)
      .then((res: any) => {
        if (live) setPlotBundle(res);
      })
      .catch(() => {
        if (live) setPlotBundle(null);
      })
      .finally(() => {
        if (live) setBundleLoading(false);
      });
    return () => {
      live = false;
    };
  }, [activePlot?.plot_id]);

  const openPlotDetail = (plot: CitizenOwnedPlot) => {
    setSelectedPlotId(Number(plot.plot_id));
    setDetailOpen(true);
  };

  const handleConfirmToggleLock = async (reason?: string) => {
    if (!lockTargetPlot) return;
    setLockBusy(true);
    try {
      const res = await BhumiApi.togglePlotSaleLock(lockTargetPlot.plot_id, reason);
      notify.ok(
        lang === 'bn'
          ? res?.message_bn || t('বিক্রয় লক পরিবর্তন সম্পন্ন হয়েছে।', 'Sale lock updated.')
          : res?.message_en || t('বিক্রয় লক পরিবর্তন সম্পন্ন হয়েছে।', 'Sale lock updated.')
      );
      setLockConfirmOpen(false);
      onRefreshAll();
    } catch (e: any) {
      notify.err(e, lang, t('বিক্রয় লক পরিবর্তন করা যায়নি।', 'Failed to update sale lock.'));
    } finally {
      setLockBusy(false);
    }
  };

  // Build khatian chain for activePlot
  const khatianBySurvey = useMemo(() => {
    const map: Record<string, any> = {};
    for (const k of plotBundle?.khatians || []) {
      map[String(k.survey_type || '').toUpperCase()] = k;
    }
    return map;
  }, [plotBundle]);

  const coOwners = plotBundle?.latest_ownerships || [];
  const resolvedLocationId = Number(
    activePlot?.location_id || plotBundle?.plot?.location_id || plotBundle?.location?.id || 1
  );
  const resolvedJlNo = activePlot?.jl_no || plotBundle?.location?.jl_no || '—';

  const renderDetailBody = (plot: CitizenOwnedPlot) => {
    const hasDispute = disputes.some(
      (d) =>
        Number(d.plot_id) === Number(plot.plot_id) &&
        !['RESOLVED', 'REJECTED'].includes(String(d.status || '').toUpperCase())
    );
    const areaVal = plot.area_decimal ?? plot.share_area_decimal ?? 0;

    return (
      <div className="space-y-4">
        <DetailList
          items={[
            [
              t('মৌজা ও উপজেলা', 'Mouza & Upazila'),
              `${pick(plot, 'mouza')} · ${pick(plot, 'upazila')}`,
            ],
            [t('জেএল নং', 'JL No'), fmtNum(resolvedJlNo)],
            [
              t('দাগ নম্বর', 'Plot / Dag No'),
              <span className="font-mono text-xs">{fmtNum(plot.dag_no_bn || plot.dag_no)}</span>,
            ],
            [
              t('জমির ধরন', 'Land Class'),
              pick(plot, 'land_type') || t('আবাসিক', 'Residential'),
            ],
            [
              t('আমার অংশ', 'My Share'),
              `${fmtNum(areaVal)} ${t('শতক', 'dec')} (${plot.share_fraction || '1/1'})`,
            ],
            [
              t('মোট জমি', 'Total Plot Area'),
              `${fmtNum(plot.total_area_decimal ?? areaVal)} ${t('শতক', 'dec')}`,
            ],
            [t('অবস্থা', 'Status'), plotStatusBadge(plot, t, hasDispute)],
          ]}
        />

        {/* CS -> SA -> RS -> BS Khatian Chain Timeline */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-foreground">
            {t('খতিয়ান চেইন (CS → SA → RS → BS)', 'Khatian Chain (CS → SA → RS → BS)')}
          </div>
          {bundleLoading ? (
            <div className="grid grid-cols-4 gap-2">
              {SURVEY_ORDER.map((s) => (
                <Skeleton key={s} className="h-14 rounded-md" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SURVEY_ORDER.map((st) => {
                const k = khatianBySurvey[st];
                const ok = k?.status === 'VALID';
                return (
                  <div
                    key={st}
                    className={`rounded-md border p-2 text-xs ${
                      k ? 'border-border bg-card' : 'border-dashed border-border bg-muted/20 text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-foreground">{st}</span>
                      {k ? (
                        <StatusBadge tone={ok ? 'green' : 'amber'}>
                          {k.khatian_no_bn || k.khatian_no}
                        </StatusBadge>
                      ) : (
                        <span>—</span>
                      )}
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {k
                        ? `${fmtNum(k.recorded_area_decimal)} ${t('শতক', 'dec')}`
                        : t('নেই', 'None')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Co-owners */}
        {coOwners.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-foreground">
              {t('মালিকগণ', 'Recorded Owners')} ({fmtNum(coOwners.length)})
            </div>
            <div className="rounded-md border border-border divide-y divide-border/60">
              {coOwners.map((o: any, idx: number) => (
                <div
                  key={o.id || idx}
                  className="px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs"
                >
                  <span className="font-medium text-foreground truncate">
                    {lang === 'bn' ? o.owner_name_bn || o.owner_name_en : o.owner_name_en || o.owner_name_bn}
                  </span>
                  <span className="text-muted-foreground tabular-nums shrink-0">
                    {fmtNum(o.area_decimal)} {t('শতক', 'dec')} ({o.share_fraction || '1/1'})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions inside Detail */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            type="button"
            variant={plot.owner_sale_locked ? 'outline' : 'default'}
            size="sm"
            onClick={() => {
              setLockTargetPlot(plot);
              setLockConfirmOpen(true);
            }}
            className="h-8 gap-1.5 text-xs justify-start"
          >
            {plot.owner_sale_locked ? (
              <Unlock className="size-3.5 text-amber-600" />
            ) : (
              <Lock className="size-3.5" />
            )}
            <span>
              {plot.owner_sale_locked
                ? t('বিক্রয় লক বন্ধ', 'Unlock Sale')
                : t('বিক্রয় লক চালু', 'Lock Sale')}
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDetailOpen(false);
              onSelectSection('docs', { plotId: Number(plot.plot_id) });
            }}
            className="h-8 gap-1.5 text-xs justify-start"
          >
            <FolderOpen className="size-3.5 text-[#006A4E]" />
            <span>{t('কাগজপত্র', 'Documents')}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDetailOpen(false);
              onNavigate(`applications?new=1&plot=${plot.plot_id}`);
            }}
            className="h-8 gap-1.5 text-xs justify-start"
          >
            <ArrowLeftRight className="size-3.5 text-[#006A4E]" />
            <span>{t('জমি হস্তান্তর', 'Land Transfer')}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDetailOpen(false);
              onSelectSection('disputes', { plotId: Number(plot.plot_id), create: true });
            }}
            className="h-8 gap-1.5 text-xs justify-start"
          >
            <Scale className="size-3.5 text-[#006A4E]" />
            <span>{t('আপত্তি দিন', 'File Dispute')}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDetailOpen(false);
              onNavigate(
                `map?mouza=${resolvedLocationId}&q=${encodeURIComponent(String(plot.dag_no))}&focus=1`
              );
            }}
            className="h-8 gap-1.5 text-xs justify-start"
          >
            <ExternalLink className="size-3.5 text-[#006A4E]" />
            <span>{t('বড় ম্যাপে দেখুন', 'Open Full Map')}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDetailOpen(false);
              onOpenPassport(plot);
            }}
            className="h-8 gap-1.5 text-xs justify-start"
          >
            <ShieldCheck className="size-3.5 text-[#006A4E]" />
            <span>{t('ল্যান্ড পাসপোর্ট', 'Land Passport')}</span>
          </Button>
        </div>
      </div>
    );
  };

  if (vault.isOperatorNoVault) {
    return (
      <AdminPage fill>
        <Section title={t('জমি ও ম্যাপ', 'Land & Map')} fill bodyClassName="flex items-center justify-center">
          <EmptyState
            icon={MapPin}
            text={t(
              'এই অ্যাকাউন্টে নিজের জমি নেই — সেবাকেন্দ্র অপারেটর অ্যাকাউন্ট থেকে নাগরিকদের আবেদন ও সহায়তা প্রদান করুন।',
              'No personal land in this account — use this operator account to assist citizens.'
            )}
          />
        </Section>
      </AdminPage>
    );
  }

  return (
    <AdminPage fill>
      <PageToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t('দাগ, খতিয়ান বা মৌজা খুঁজুন...', 'Search plot, khatian, mouza...')}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefreshAll}
            disabled={loading}
            className="h-8 gap-1.5 text-xs"
          >
            <RotateCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('রিফ্রেশ', 'Refresh')}
          </Button>
        }
      />

      {/* Responsive Split: Mobile has Map on Top (~45vh) + List Below; Desktop has 2-Column Grid */}
      <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-3">
        {/* Map Column (Top on mobile, Right on desktop) */}
        <div className="order-1 lg:order-2 lg:col-span-7 h-[42vh] min-h-[220px] lg:h-auto lg:min-h-0 flex flex-col relative isolate z-0">
          <Section
            title={t('স্যাটেলাইট ম্যাপ', 'Satellite Map')}
            fill
            action={
              activePlot ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onNavigate(
                      `map?mouza=${resolvedLocationId}&q=${encodeURIComponent(String(activePlot.dag_no))}&focus=1`
                    )
                  }
                  className="h-7 px-2 text-xs text-primary"
                >
                  <ExternalLink className="size-3.5 mr-1" />
                  {t('বড় ম্যাপে দেখুন', 'Full Map')}
                </Button>
              ) : null
            }
            bodyClassName="p-2 flex flex-col"
          >
            <div className="flex-1 min-h-[180px]">
              <Suspense fallback={<Skeleton className="w-full h-full min-h-[180px] rounded-lg" />}>
                <LazyMyLandMap
                  plots={filteredPlots}
                  selectedPlotId={activePlot?.plot_id}
                  onSelect={(pid) => {
                    const found = plots.find((p) => Number(p.plot_id) === Number(pid));
                    if (found) openPlotDetail(found);
                  }}
                />
              </Suspense>
            </div>
          </Section>
        </div>

        {/* List Column (Bottom on mobile, Left on desktop) */}
        <div className="order-2 lg:order-1 lg:col-span-5 flex-1 min-h-[240px] lg:min-h-0 flex flex-col">
          <Section
            title={`${t('আমার জমির তালিকা', 'My Plots')} (${fmtNum(filteredPlots.length)})`}
            fill
          >
            <DataTable
              headers={[
                t('দাগ ও মৌজা', 'Plot & Mouza'),
                t('খতিয়ান', 'Khatian'),
                t('আমার অংশ', 'My Share'),
                t('অবস্থা', 'Status'),
                t('দেখুন', 'View'),
              ]}
              alignRight={[4]}
            >
              {loading ? (
                <LoadingRows cols={5} rows={4} />
              ) : filteredPlots.length === 0 ? (
                <EmptyRow cols={5} text={t('কোনো জমি পাওয়া যায়নি', 'No plots found')} />
              ) : (
                filteredPlots.map((plot) => {
                  const isSelected = Number(activePlot?.plot_id) === Number(plot.plot_id);
                  const hasDispute = disputes.some(
                    (d) =>
                      Number(d.plot_id) === Number(plot.plot_id) &&
                      !['RESOLVED', 'REJECTED'].includes(String(d.status || '').toUpperCase())
                  );
                  const areaVal = plot.area_decimal ?? plot.share_area_decimal ?? 0;

                  return (
                    <tr
                      key={plot.plot_id}
                      data-state={isSelected ? 'selected' : undefined}
                      onClick={() => openPlotDetail(plot)}
                      className={`cursor-pointer ${isSelected ? 'bg-emerald-50/50' : ''}`}
                    >
                      <td>
                        <div className="font-semibold text-foreground">
                          {t('দাগ', 'Plot')} {fmtNum(plot.dag_no_bn || plot.dag_no)}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[140px]">
                          {pick(plot, 'mouza')}
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-xs text-slate-600">
                          {plot.survey_type || 'BS'} {fmtNum(plot.khatian_no_bn || plot.khatian_no)}
                        </span>
                      </td>
                      <td>
                        <div className="font-medium text-foreground tabular-nums">
                          {fmtNum(areaVal)} {t('শতক', 'dec')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {plot.share_fraction || '1/1'}
                        </div>
                      </td>
                      <td>{plotStatusBadge(plot, t, hasDispute)}</td>
                      <td className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPlotDetail(plot);
                          }}
                          className="h-7 px-2 text-xs"
                        >
                          <Eye className="size-3.5 mr-1" />
                          {t('দেখুন', 'View')}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </DataTable>
          </Section>
        </div>
      </div>

      {/* Desktop DetailSheet */}
      {!isMobile && activePlot && (
        <DetailSheet
          open={detailOpen}
          onOpenChange={setDetailOpen}
          title={`${t('দাগ', 'Plot')} ${fmtNum(activePlot.dag_no_bn || activePlot.dag_no)} · ${pick(activePlot, 'mouza')}`}
          subtitle={`${activePlot.survey_type || 'BS'} ${t('খতিয়ান', 'Khatian')} ${fmtNum(activePlot.khatian_no_bn || activePlot.khatian_no)}`}
        >
          {renderDetailBody(activePlot)}
        </DetailSheet>
      )}

      {/* Mobile Bottom Sheet Drawer */}
      {isMobile && activePlot && (
        <Drawer open={detailOpen} onOpenChange={setDetailOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="text-left border-b border-border pb-2.5">
              <DrawerTitle className="text-sm font-semibold">
                {t('দাগ', 'Plot')} {fmtNum(activePlot.dag_no_bn || activePlot.dag_no)} · {pick(activePlot, 'mouza')}
              </DrawerTitle>
              <DrawerDescription className="text-xs">
                {activePlot.survey_type || 'BS'} {t('খতিয়ান', 'Khatian')}{' '}
                {fmtNum(activePlot.khatian_no_bn || activePlot.khatian_no)}
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4 overflow-y-auto flex-1">{renderDetailBody(activePlot)}</div>
            <DrawerFooter className="border-t border-border pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDetailOpen(false)}
                className="h-8 text-xs"
              >
                {t('বন্ধ করুন', 'Close')}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}

      {/* Sale Lock ConfirmDialog with optional reason */}
      <ConfirmDialog
        open={lockConfirmOpen}
        onOpenChange={setLockConfirmOpen}
        title={
          lockTargetPlot?.owner_sale_locked
            ? t('বিক্রয় লক বন্ধ করবেন?', 'Disable Sale Lock?')
            : t('বিক্রয় লক চালু করবেন?', 'Enable Sale Lock?')
        }
        description={
          lockTargetPlot?.owner_sale_locked
            ? t(
                'লক বন্ধ করলে এই দাগে বৈধ দলিল নিবন্ধন ও হস্তান্তর করা যাবে।',
                'Unlocking allows valid deed registration and transfer on this plot.'
              )
            : t(
                'লক চালু করলে আপনার অনুমতি ছাড়া সাব-রেজিস্ট্রি অফিসে কোনো দলিল নিবন্ধন হবে না।',
                'Locking blocks unauthorized deed registration at the Sub-Registry office.'
              )
        }
        confirmLabel={
          lockTargetPlot?.owner_sale_locked
            ? t('লক বন্ধ করুন', 'Unlock Plot')
            : t('লক চালু করুন', 'Lock Plot')
        }
        cancelLabel={t('বাতিল', 'Cancel')}
        askReason={{
          label: t('কারণ (ঐচ্ছিক)', 'Reason (optional)'),
          placeholder: t('কারণ লিখুন (ঐচ্ছিক)...', 'Reason (optional)...'),
          minLength: 0,
        }}
        onConfirm={handleConfirmToggleLock}
      />
    </AdminPage>
  );
};
export default PlotsSection;
