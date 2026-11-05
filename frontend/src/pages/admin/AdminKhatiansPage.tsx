import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Lock,
  Unlock,
  Scale,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { toBanglaDigits } from '@/theme/tokens';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export const AdminKhatiansPage: React.FC = () => {
  const { lang, t } = useAppUI();
  const [khatians, setKhatians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Reconcile Modal
  const [reconcileTarget, setReconcileTarget] = useState<any | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [updatedArea, setUpdatedArea] = useState<string>('');
  const [reconciling, setReconciling] = useState(false);

  // Plot freeze state
  const [freezeActionId, setFreezeActionId] = useState<number | null>(null);

  const fetchKhatians = async () => {
    try {
      setLoading(true);
      const res = await BhumiApi.listFlaggedKhatians();
      setKhatians(res || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKhatians();
  }, []);

  const handleOpenReconcile = (k: any) => {
    setReconcileTarget(k);
    setResolutionNote(`অনুসন্ধান ও ফিল্ড তদন্ত সাপেক্ষে খতিয়ান নং ${k.khatian_no || ''} এর দাগীয় রেকর্ড সমন্বয় করা হলো।`);
    setUpdatedArea(String(k.recorded_area_decimal || k.area_decimal || ''));
  };

  const handleConfirmReconcile = async () => {
    if (!reconcileTarget) return;
    try {
      setReconciling(true);
      await BhumiApi.reconcileKhatian(reconcileTarget.plot_id || reconcileTarget.id, {
        resolution_note_bn: resolutionNote,
        updated_area_decimal: updatedArea ? parseFloat(updatedArea) : undefined,
      });
      setReconcileTarget(null);
      fetchKhatians();
    } catch (e) {
      console.error(e);
    } finally {
      setReconciling(false);
    }
  };

  const handleToggleFreeze = async (plotId: number, currentlyLocked: boolean) => {
    try {
      setFreezeActionId(plotId);
      await BhumiApi.toggleAdminPlotFreeze(plotId, {
        is_frozen: !currentlyLocked,
        reason: currentlyLocked ? 'Unfrozen by Sovereign Admin' : 'Admin Sovereign Freeze: Lineage Discrepancy under investigation',
      });
      fetchKhatians();
    } catch (e) {
      console.error(e);
    } finally {
      setFreezeActionId(null);
    }
  };

  const filtered = khatians.filter((k) => {
    const q = search.toLowerCase();
    return (
      !search ||
      String(k.dag_no || '').includes(q) ||
      String(k.khatian_no || '').includes(q) ||
      String(k.mouza_bn || '').toLowerCase().includes(q) ||
      String(k.remarks_bn || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-full min-h-0 flex flex-col gap-2.5 p-3 sm:p-4 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Search & Filter toolbar */}
      <Card className="shrink-0 border border-border/80 shadow-2xs bg-card p-2 sm:p-2.5 rounded-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('দাগ, খতিয়ান বা মৌজা দিয়ে খুঁজুন...', 'Search plot, khatian or mouza...')}
              className="pl-8 h-8 text-xs rounded-lg border-border"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 shrink-0">
              {toBanglaDigits(filtered.length, lang)} {t('টি রেকর্ড', 'Records')}
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchKhatians}
              className="h-8 px-2.5 gap-1 text-xs font-semibold cursor-pointer rounded-lg border-border"
            >
              <RotateCcw className="size-3.5" />
              <span>{t('রিফ্রেশ', 'Refresh')}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* 3. Flagged Khatians Table with 100% Fixed Header & Single-Screen Scroll */}
      <Card className="flex-1 min-h-0 border border-border/80 shadow-2xs bg-card rounded-xl overflow-hidden flex flex-col">
        {/* 100% Guaranteed Fixed Table Header Row */}
        <div className="shrink-0 bg-muted/95 border-b border-border z-20">
          <table className="w-full text-xs font-bold text-foreground table-fixed">
            <thead>
              <tr className="h-9">
                <th className="py-2 px-3 text-left w-[18%] font-bold text-foreground">{t('মৌজা ও দাগ', 'Mouza & Plot')}</th>
                <th className="py-2 px-3 text-left w-[15%] font-bold text-foreground">{t('জরিপ ও খতিয়ান', 'Survey & Khatian')}</th>
                <th className="py-2 px-3 text-left w-[14%] font-bold text-foreground">{t('জমির পরিমাণ', 'Recorded Area')}</th>
                <th className="py-2 px-3 text-left w-[25%] font-bold text-foreground">{t('আইনি অবস্থা / বিরোধ', 'Legal Status')}</th>
                <th className="py-2 px-3 text-left w-[12%] font-bold text-foreground">{t('স্ট্যাটাস', 'Status')}</th>
                <th className="py-2 px-3 text-right w-[16%] font-bold text-foreground">{t('অ্যাকশন', 'Actions')}</th>
              </tr>
            </thead>
          </table>
        </div>

        {/* Scrollable Table Items Body */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          <table className="w-full text-xs table-fixed">
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                    {t('খতিয়ান ডাটা লোড হচ্ছে...', 'Loading flagged khatians...')}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                    {t('কোনো অসঙ্গতিপূর্ণ খতিয়ান নেই।', 'No flagged khatians found.')}
                  </td>
                </tr>
              ) : (
                filtered.map((k) => (
                  <tr key={k.id} className="text-xs hover:bg-muted/50 transition">
                    <td className="py-2 px-3 font-medium w-[18%] align-middle">
                      <div className="font-bold text-foreground">{k.mouza_bn}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {t('দাগ নং:', 'Dag No:')} {toBanglaDigits(k.dag_no, lang)}
                      </div>
                    </td>

                    <td className="py-2 px-3 w-[15%] align-middle">
                      <Badge variant="outline" className="font-mono text-[9px] mr-1 px-1.5 py-0.5">
                        {k.survey_type || 'BS'}
                      </Badge>
                      <span className="font-mono font-bold text-foreground">
                        {toBanglaDigits(k.khatian_no, lang)}
                      </span>
                    </td>

                    <td className="py-2 px-3 font-mono font-bold text-foreground w-[14%] align-middle">
                      {toBanglaDigits(k.recorded_area_decimal || k.total_area_decimal || 0, lang)} {t('শতক', 'dec')}
                    </td>

                    <td className="py-2 px-3 max-w-xs w-[25%] align-middle">
                      <div className="text-amber-800 dark:text-amber-400 font-medium leading-snug truncate">
                        {k.anomaly_note_bn || k.remarks_bn || t('সিএস ও বিএস রেকর্ড সীমানায় ক্ষেত্রফল পার্থক্য', 'Area variance between CS and BS')}
                      </div>
                    </td>

                    <td className="py-2 px-3 w-[12%] align-middle">
                      {k.is_admin_frozen || k.owner_sale_locked ? (
                        <Badge variant="danger" className="text-[10px] gap-1 font-mono px-1.5 py-0.5">
                          <Lock className="size-2.5" />
                          {t('লক করা', 'FROZEN')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] gap-1 font-mono text-emerald-700 border-emerald-300 bg-emerald-50 px-1.5 py-0.5">
                          <Unlock className="size-2.5" />
                          {t('সচল', 'ACTIVE')}
                        </Badge>
                      )}
                    </td>

                    <td className="py-2 px-3 text-right w-[16%] align-middle">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleFreeze(k.plot_id || k.id, !!(k.is_admin_frozen || k.owner_sale_locked))}
                          disabled={freezeActionId === (k.plot_id || k.id)}
                          className="h-7 px-2 text-xs font-semibold text-rose-700 hover:text-rose-900 border-rose-200"
                        >
                          {k.is_admin_frozen || k.owner_sale_locked ? (
                            <>
                              <Unlock className="size-3 mr-1" />
                              <span>{t('আনলক', 'Unfreeze')}</span>
                            </>
                          ) : (
                            <>
                              <Lock className="size-3 mr-1" />
                              <span>{t('ফ্রিজ', 'Freeze')}</span>
                            </>
                          )}
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleOpenReconcile(k)}
                          className="h-7 px-2.5 text-xs font-bold bg-[#006A4E] hover:bg-[#00553e] text-white"
                        >
                          <Scale className="size-3 mr-1" />
                          <span>{t('সমন্বয়', 'Reconcile')}</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Reconcile Dialog */}
      <Dialog open={!!reconcileTarget} onOpenChange={(open) => !open && setReconcileTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Scale className="size-5 text-[#006A4E]" />
              <span>{t('খতিয়ান সমন্বয়', 'Khatian Reconciliation')}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t('খতিয়ানের ত্রুটি সমাধান ও সংশোধিত রেকর্ড সংরক্ষণ।', 'Correct survey record and issue order.')}
            </DialogDescription>
          </DialogHeader>

          {reconcileTarget && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-lg border bg-muted/40 space-y-1">
                <div className="font-bold text-foreground">
                  {reconcileTarget.mouza_bn} • {t('দাগ নং', 'Dag No:')} {toBanglaDigits(reconcileTarget.dag_no, lang)}
                </div>
                <div className="text-muted-foreground font-mono">
                  {t('খতিয়ান নং:', 'Khatian No:')} {toBanglaDigits(reconcileTarget.khatian_no, lang)} ({reconcileTarget.survey_type || 'BS'})
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">{t('সংশোধিত পরিমাণ (শতক):', 'Corrected Area (Decimals):')}</label>
                <Input
                  type="number"
                  step="0.01"
                  value={updatedArea}
                  onChange={(e) => setUpdatedArea(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">{t('আদেশের বিবরণ:', 'Order Notes:')}</label>
                <Textarea
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReconcileTarget(null)}>
              {t('বাতিল', 'Cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmReconcile}
              disabled={reconciling}
              className="bg-[#006A4E] hover:bg-[#00553e] text-white font-bold"
            >
              {reconciling ? t('সংরক্ষণ হচ্ছে...', 'Saving...') : t('সংরক্ষণ করুন', 'Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
