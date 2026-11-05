import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Eye,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi, AdminDeedItem, AdminDeedDetailResponse } from '@/api/client';
import { toBanglaDigits, maskNid } from '@/theme/tokens';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export const AdminDeedsPage: React.FC = () => {
  const { lang, t } = useAppUI();
  const [deeds, setDeeds] = useState<AdminDeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Detail Sheet state
  const [selectedDeedId, setSelectedDeedId] = useState<number | null>(null);
  const [deedDetail, setDeedDetail] = useState<AdminDeedDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const fetchDeeds = async () => {
    try {
      setLoading(true);
      const res = await BhumiApi.listAdminDeeds({
        page,
        per_page: 12,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        q: searchQuery || undefined,
      });
      setDeeds(res.items || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeeds();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDeeds();
  };

  const handleInspectDeed = async (deedId: number) => {
    try {
      setSelectedDeedId(deedId);
      setIsSheetOpen(true);
      setDetailLoading(true);
      const res = await BhumiApi.getAdminDeedDetail(deedId);
      setDeedDetail(res);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-2.5 p-3 sm:p-4 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Search & Filter Toolbar */}
      <Card className="shrink-0 border border-border/80 shadow-2xs bg-card p-2 sm:p-2.5 rounded-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('দলিল নম্বর, দাগ বা নাম দিয়ে খুঁজুন...', 'Search by deed, plot or name...')}
              className="pl-8 h-8 text-xs rounded-lg border-border"
            />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 shrink-0">
              {t('মোট:', 'Total:')} {toBanglaDigits(total, lang)} {t('টি দলিল', 'Deeds')}
            </Badge>

            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
              <SelectTrigger className="w-[170px] h-8 text-xs rounded-lg border-border">
                <SelectValue placeholder={t('সকল স্ট্যাটাস', 'All Statuses')} />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="ALL">{t('সকল দলিল (All)', 'All Deeds')}</SelectItem>
                <SelectItem value="REGISTERED">{t('নিবন্ধিত (Registered)', 'Registered')}</SelectItem>
                <SelectItem value="PENDING_MUTATION">{t('নামজারি অপেক্ষমাণ', 'Pending Mutation')}</SelectItem>
                <SelectItem value="FLAGGED">{t('চিহ্নিত/সন্দেহজনক', 'Flagged')}</SelectItem>
                <SelectItem value="HELD">{t('স্থগিত (Held)', 'Held')}</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={fetchDeeds} size="sm" className="h-8 px-3 text-xs font-bold bg-[#006A4E] hover:bg-[#00553e] text-white cursor-pointer rounded-lg shadow-2xs">
              {t('খুঁজুন', 'Search')}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchDeeds}
              className="h-8 px-2.5 gap-1 text-xs font-semibold cursor-pointer rounded-lg border-border shrink-0"
              title={t('রিফ্রেশ', 'Refresh')}
            >
              <RotateCcw className="size-3.5" />
              <span className="hidden sm:inline">{t('রিফ্রেশ', 'Refresh')}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* 3. Single-Screen Framed Deeds Data Table */}
      <Card className="flex-1 min-h-0 border border-border/80 shadow-2xs bg-card rounded-xl overflow-hidden flex flex-col">
        {/* 100% Guaranteed Fixed Table Header Row */}
        <div className="shrink-0 bg-muted/95 border-b border-border z-20">
          <table className="w-full text-xs font-bold text-foreground table-fixed">
            <thead>
              <tr className="h-9">
                <th className="py-2 px-3 text-left w-[16%] font-bold text-foreground">{t('দলিল নম্বর', 'Deed No')}</th>
                <th className="py-2 px-3 text-left w-[16%] font-bold text-foreground">{t('মৌজা ও দাগ', 'Mouza & Plot')}</th>
                <th className="py-2 px-3 text-left w-[18%] font-bold text-foreground">{t('বিক্রেতা', 'Seller')}</th>
                <th className="py-2 px-3 text-left w-[18%] font-bold text-foreground">{t('ক্রেতা', 'Buyer')}</th>
                <th className="py-2 px-3 text-left w-[14%] font-bold text-foreground">{t('পরিমাণ ও মূল্য', 'Area & Price')}</th>
                <th className="py-2 px-3 text-left w-[10%] font-bold text-foreground">{t('লেজার অবস্থা', 'Status')}</th>
                <th className="py-2 px-3 text-right w-[8%] font-bold text-foreground">{t('অ্যাকশন', 'Actions')}</th>
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
                  <td colSpan={7} className="text-center py-10 text-xs text-muted-foreground">
                    {t('দলিল ডাটা লোড হচ্ছে...', 'Loading deeds database...')}
                  </td>
                </tr>
              ) : deeds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-xs text-muted-foreground">
                    {t('কোনো দলিল পাওয়া যায়নি।', 'No deeds found.')}
                  </td>
                </tr>
              ) : (
                deeds.map((deed) => (
                  <tr key={deed.id} className="text-xs hover:bg-muted/50 transition">
                    <td className="py-2 px-3 font-medium w-[16%] align-middle">
                      <div className="font-bold text-foreground font-mono">{deed.deed_no || deed.deed_code}</div>
                      <div className="text-[10px] text-muted-foreground">{deed.deed_type || 'SALE'} • {deed.created_at?.substring(0, 10)}</div>
                    </td>

                    <td className="py-2 px-3 w-[16%] align-middle">
                      <div className="font-semibold">{deed.mouza_bn}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {t('দাগ:', 'Dag:')} {toBanglaDigits(deed.dag_no, lang)} • {deed.upazila_bn}
                      </div>
                    </td>

                    <td className="py-2 px-3 w-[18%] align-middle">
                      <div className="font-medium">{deed.seller_name_bn}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {maskNid(deed.seller_nid)} ({deed.share_fraction})
                      </div>
                    </td>

                    <td className="py-2 px-3 w-[18%] align-middle">
                      <div className="font-medium">{deed.buyer_name_bn}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {maskNid(deed.buyer_nid)}
                      </div>
                    </td>

                    <td className="py-2 px-3 w-[14%] align-middle">
                      <div className="font-bold text-foreground font-mono">
                        {toBanglaDigits(deed.area_decimal, lang)} {t('শতক', 'dec')}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        ৳{toBanglaDigits(Number(deed.price_bdt || 0).toLocaleString(), lang)}
                      </div>
                    </td>

                    <td className="py-2 px-3 w-[10%] align-middle">
                      {deed.ledger_valid !== false ? (
                        <Badge variant="outline" className="text-[10px] font-mono border-emerald-300 text-emerald-700 bg-emerald-50 px-1.5 py-0.5">
                          <CheckCircle2 className="size-3 mr-1 text-emerald-600" />
                          {t('সুরক্ষিত', 'VERIFIED')}
                        </Badge>
                      ) : (
                        <Badge variant="danger" className="text-[10px] font-mono px-1.5 py-0.5">
                          <XCircle className="size-3 mr-1" />
                          {t('বিকৃত', 'TAMPERED')}
                        </Badge>
                      )}
                    </td>

                    <td className="py-2 px-3 text-right w-[8%] align-middle">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleInspectDeed(deed.id)}
                        className="h-7 px-2 text-xs font-semibold gap-1 hover:border-[#006A4E] hover:text-[#006A4E] rounded-lg cursor-pointer"
                      >
                        <Eye className="size-3" />
                        <span>{t('দেখুন', 'View')}</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {total > 12 && (
          <div className="shrink-0 flex items-center justify-between px-3 py-2 border-t border-border/80 bg-muted/20">
            <span className="text-xs text-muted-foreground">
              {t('পৃষ্ঠা', 'Page')} {toBanglaDigits(page, lang)} • {toBanglaDigits(Math.ceil(total / 12), lang)} {t('এর মধ্যে', 'of')}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 px-2 text-xs"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 12 >= total}
                className="h-7 px-2 text-xs"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Deed Inspection Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-6">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="size-5 text-[#006A4E]" />
              <span>{t('দলিলের বিস্তারিত ও অডিট', 'Deed Details & Audit')}</span>
            </SheetTitle>
            <SheetDescription className="text-xs">
              {t('দলিল, পক্ষসমূহ ও লেজার যাচাই।', 'Deed, parties, and ledger verification.')}
            </SheetDescription>
          </SheetHeader>

          {detailLoading || !deedDetail ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              {t('অডিট ফাইল লোড হচ্ছে...', 'Loading audit records...')}
            </div>
          ) : (
            <div className="space-y-6 pt-4 text-xs">
              {/* Verification Stamp */}
              <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 text-sm">
                    {deedDetail.deed?.deed_no || deedDetail.deed?.deed_code}
                  </span>
                  <Badge className="bg-emerald-700 text-white font-mono text-[10px]">
                    {deedDetail.verification?.is_valid ? t('বৈধ ও অক্ষত', 'VERIFIED') : t('সন্দেহজনক', 'SUSPICIOUS')}
                  </Badge>
                </div>
                <p className="text-[11px] text-emerald-800">
                  {t('দলিলটি ডিজিটাল সিলযুক্ত এবং লেজার ব্লক #', 'Digitally sealed in ledger block #')}
                  {toBanglaDigits(deedDetail.verification?.chain_index ?? 1, lang)} {t('হিসেবে নিবন্ধিত।', '')}
                </p>
              </div>

              {/* Parties */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border bg-card space-y-1">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">{t('বিক্রেতা', 'Seller')}</div>
                  <div className="font-bold text-foreground text-sm">{deedDetail.seller?.name_bn || deedDetail.deed?.seller_name_bn}</div>
                  <div className="text-muted-foreground font-mono">{t('এনআইডি:', 'NID:')} {maskNid(deedDetail.seller?.nid || deedDetail.deed?.seller_nid)}</div>
                  <div className="text-muted-foreground">{t('অংশ:', 'Share:')} {deedDetail.deed?.share_fraction || '1/1'}</div>
                </div>

                <div className="p-3 rounded-lg border bg-card space-y-1">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">{t('ক্রেতা', 'Buyer')}</div>
                  <div className="font-bold text-foreground text-sm">{deedDetail.buyer?.name_bn || deedDetail.deed?.buyer_name_bn}</div>
                  <div className="text-muted-foreground font-mono">{t('এনআইডি:', 'NID:')} {maskNid(deedDetail.buyer?.nid || deedDetail.deed?.buyer_nid)}</div>
                  <div className="text-muted-foreground">{t('জমির পরিমাণ:', 'Area:')} {toBanglaDigits(deedDetail.deed?.area_decimal, lang)} {t('শতক', 'dec')}</div>
                </div>
              </div>

              {/* Cryptographic Hashes */}
              <div className="p-3 rounded-lg border bg-muted/40 space-y-2 font-mono">
                <div className="text-[10px] font-bold text-muted-foreground uppercase font-sans">
                  {t('লেজার হ্যাশ প্রমাণ', 'Ledger Proof')}
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">{t('সংরক্ষিত হ্যাশ:', 'Stored Hash:')}</span>
                  <span className="text-[11px] text-foreground break-all">{deedDetail.verification?.stored_hash || deedDetail.deed?.content_hash}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">{t('পুনঃগণনাকৃত হ্যাশ:', 'Recomputed Hash:')}</span>
                  <span className="text-[11px] text-emerald-700 break-all">{deedDetail.verification?.recomputed_hash || deedDetail.deed?.content_hash}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">{t('পূর্বের হ্যাশ:', 'Prev Hash:')}</span>
                  <span className="text-[11px] text-muted-foreground break-all">{deedDetail.verification?.prev_hash || deedDetail.deed?.prev_hash || '0000000000000000...'}</span>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
