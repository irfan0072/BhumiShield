import React, { useState, useEffect } from 'react';
import {
  Flame,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Calendar,
  FileCheck2,
  Scale,
} from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { toBanglaDigits } from '@/theme/tokens';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const AdminMutationsPage: React.FC = () => {
  const { lang, t } = useAppUI();
  const [mutations, setMutations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchMutations = async () => {
    try {
      setLoading(true);
      const res = await BhumiApi.getMutations();
      setMutations(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMutations();
  }, []);

  const filtered = mutations.filter((m) => {
    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
    const q = search.toLowerCase();
    const matchesQuery =
      !search ||
      String(m.case_no || '').toLowerCase().includes(q) ||
      String(m.applicant_name_bn || '').toLowerCase().includes(q) ||
      String(m.mouza_bn || '').toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
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
              placeholder={t('কেস নম্বর, নাম বা মৌজা দিয়ে খুঁজুন...', 'Search by case, name or mouza...')}
              className="pl-8 h-8 text-xs rounded-lg border-border"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 shrink-0">
              {t('মোট:', 'Total:')} {toBanglaDigits(filtered.length, lang)} {t('টি কেস', 'Cases')}
            </Badge>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[170px] h-8 text-xs rounded-lg border-border">
                <SelectValue placeholder={t('সকল স্ট্যাটাস', 'All Statuses')} />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="ALL">{t('সকল আবেদন (All)', 'All Applications')}</SelectItem>
                <SelectItem value="PENDING">{t('বিচারাধীন (Pending)', 'Pending')}</SelectItem>
                <SelectItem value="APPROVED">{t('অনুমোদিত (Approved)', 'Approved')}</SelectItem>
                <SelectItem value="REJECTED">{t('খারিজ (Rejected)', 'Rejected')}</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={fetchMutations} className="h-8 px-2.5 gap-1 text-xs font-semibold cursor-pointer rounded-lg border-border">
              <RotateCcw className="size-3.5" />
              <span>{t('রিফ্রেশ', 'Refresh')}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* 3. Mutations 100% Fixed Header & Single-Screen Table */}
      <Card className="flex-1 min-h-0 border border-border/80 shadow-2xs bg-card rounded-xl overflow-hidden flex flex-col">
        {/* 100% Guaranteed Fixed Table Header Row */}
        <div className="shrink-0 bg-muted/95 border-b border-border z-20">
          <table className="w-full text-xs font-bold text-foreground table-fixed">
            <thead>
              <tr className="h-9">
                <th className="py-2 px-3 text-left w-[18%] font-bold text-foreground">{t('কেস ও তারিখ', 'Case & Date')}</th>
                <th className="py-2 px-3 text-left w-[20%] font-bold text-foreground">{t('আবেদনকারী', 'Applicant')}</th>
                <th className="py-2 px-3 text-left w-[18%] font-bold text-foreground">{t('মৌজা ও দাগ', 'Mouza & Plot')}</th>
                <th className="py-2 px-3 text-left w-[14%] font-bold text-foreground">{t('জমির পরিমাণ', 'Area')}</th>
                <th className="py-2 px-3 text-left w-[12%] font-bold text-foreground">{t('স্ট্যাটাস', 'Status')}</th>
                <th className="py-2 px-3 text-left w-[18%] font-bold text-foreground">{t('সিদ্ধান্ত', 'Decision')}</th>
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
                    {t('নামজারি তথ্য লোড হচ্ছে...', 'Loading mutations database...')}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                    {t('কোনো আবেদন পাওয়া যায়নি।', 'No applications found.')}
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.id} className="text-xs hover:bg-muted/50 transition">
                    <td className="py-2 px-3 font-medium w-[18%] align-middle">
                      <div className="font-bold text-foreground font-mono">{m.case_no}</div>
                      <div className="text-[10px] text-muted-foreground">{m.created_at?.substring(0, 10)}</div>
                    </td>

                    <td className="py-2 px-3 w-[20%] align-middle">
                      <div className="font-semibold text-foreground">{m.applicant_name_bn}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{m.applicant_phone || m.applicant_nid}</div>
                    </td>

                    <td className="py-2 px-3 w-[18%] align-middle">
                      <div className="font-medium">{m.mouza_bn}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{t('দাগ:', 'Dag:')} {toBanglaDigits(m.dag_no, lang)}</div>
                    </td>

                    <td className="py-2 px-3 font-mono font-bold text-foreground w-[14%] align-middle">
                      {toBanglaDigits(m.area_decimal, lang)} {t('শতক', 'dec')}
                    </td>

                    <td className="py-2 px-3 w-[12%] align-middle">
                      {m.status === 'APPROVED' ? (
                        <Badge variant="outline" className="text-[10px] font-mono border-emerald-300 text-emerald-700 bg-emerald-50 px-1.5 py-0.5">
                          <CheckCircle2 className="size-3 mr-1 text-emerald-600" />
                          {t('অনুমোদিত', 'APPROVED')}
                        </Badge>
                      ) : m.status === 'REJECTED' ? (
                        <Badge variant="danger" className="text-[10px] font-mono px-1.5 py-0.5">
                          <XCircle className="size-3 mr-1" />
                          {t('খারিজ', 'REJECTED')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-mono border-amber-300 text-amber-800 bg-amber-50 px-1.5 py-0.5">
                          <Clock className="size-3 mr-1 text-amber-600" />
                          {t('বিচারাধীন', 'PENDING')}
                        </Badge>
                      )}
                    </td>

                    <td className="py-2 px-3 text-muted-foreground w-[18%] align-middle">
                      {m.order_notes_bn || t('তদন্ত ও শুনানি প্রক্রিয়াধীন', 'Under hearing')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
