import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Plus,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Edit3,
  Calendar,
  Clock,
  Send,
  Trash2,
  ArchiveRestore,
  Pin,
  Flame,
  Building2,
  FileText,
  Radio,
} from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { toBanglaDigits } from '@/theme/tokens';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const AdminNoticePage: React.FC = () => {
  const { lang, t, user } = useAppUI();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [scopeFilter, setScopeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Notifications
  const [actionAlert, setActionAlert] = useState<{ msg: string; err?: boolean } | null>(null);

  // Create / Edit Modal State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    title_bn: '',
    title_en: '',
    category: 'COMMUNITY',
    scope: 'NATIONAL',
    is_urgent: false,
    is_pinned: false,
    body_bn: '',
    body_en: '',
  });
  const [saving, setSaving] = useState<boolean>(false);

  // Soft Delete Confirmation Dialog State
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Preview Dialog State
  const [previewItem, setPreviewItem] = useState<any | null>(null);

  const loadNotices = async () => {
    setLoading(true);
    try {
      const res = await BhumiApi.listManagedContent({ kind: 'notice' });
      setItems(res?.items || []);
    } catch (err: any) {
      console.error('Failed to load notices:', err);
      setActionAlert({ msg: t('নোটিশ লোড করা যায়নি।', 'Failed to load notices.'), err: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  // Stats calculation
  const stats = useMemo(() => {
    const total = items.length;
    const published = items.filter((i) => i.status === 'PUBLISHED').length;
    const urgentPinned = items.filter((i) => i.is_urgent || i.is_pinned).length;
    const draftAndDeleted = items.filter((i) => i.status === 'DRAFT' || i.status === 'DELETED').length;
    return { total, published, urgentPinned, draftAndDeleted };
  }, [items]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      title_bn: '',
      title_en: '',
      category: 'COMMUNITY',
      scope: 'NATIONAL',
      is_urgent: false,
      is_pinned: false,
      body_bn: '',
      body_en: '',
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      title_bn: item.title_bn || '',
      title_en: item.title_en || '',
      category: item.category || 'COMMUNITY',
      scope: item.scope || 'NATIONAL',
      is_urgent: Boolean(item.is_urgent),
      is_pinned: Boolean(item.is_pinned),
      body_bn: item.body_bn || '',
      body_en: item.body_en || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async (autoPublish = false) => {
    if (!formData.title_bn || !formData.title_en || !formData.body_bn || !formData.body_en) {
      setActionAlert({
        msg: t('অনুগ্রহ করে বাংলা ও ইংরেজি উভয় ভাষায় শিরোনাম এবং নোটিশের বিবরণ লিখুন।', 'Please fill in title and body in both languages.'),
        err: true,
      });
      return;
    }
    setSaving(true);
    try {
      const saved = await BhumiApi.saveManagedContent(
        {
          kind: 'notice',
          title_bn: formData.title_bn,
          title_en: formData.title_en,
          category: formData.category,
          scope: formData.scope,
          is_urgent: formData.is_urgent ? 1 : 0,
          is_pinned: formData.is_pinned ? 1 : 0,
          body_bn: formData.body_bn,
          body_en: formData.body_en,
        },
        editingItem?.id
      );

      if (autoPublish && saved?.id) {
        try {
          await BhumiApi.transitionManagedContent(saved.id, { kind: 'notice', status: 'SUBMITTED' });
          await BhumiApi.transitionManagedContent(saved.id, { kind: 'notice', status: 'PUBLISHED' });
        } catch {
          // fallback
        }
      }

      setIsDialogOpen(false);
      setActionAlert({ msg: t('নোটিশ সফলভাবে সংরক্ষিত হয়েছে।', 'Notice saved successfully!') });
      loadNotices();
    } catch (err: any) {
      const msg = err?.response?.data?.message_bn || err?.message || t('সংরক্ষণ করা যায়নি।', 'Failed to save.');
      setActionAlert({ msg, err: true });
    } finally {
      setSaving(false);
    }
  };

  // Status transition (Submit, Publish, Reject, Restore)
  const handleStatusTransition = async (item: any, targetStatus: string) => {
    try {
      await BhumiApi.transitionManagedContent(item.id, {
        kind: 'notice',
        status: targetStatus,
      });
      setActionAlert({
        msg: targetStatus === 'PUBLISHED'
          ? t('নোটিশটি সফলভাবে জারি ও প্রকাশিত হয়েছে।', 'Notice published successfully!')
          : targetStatus === 'REJECTED'
          ? t('নোটিশটি বাতিল করা হয়েছে।', 'Notice rejected.')
          : targetStatus === 'DRAFT'
          ? t('নোটিশটি সফলভাবে পুনরুদ্ধার (Restore) করা হয়েছে।', 'Notice restored to draft successfully!')
          : t('নোটিশটি পর্যালোচনার জন্য পাঠানো হয়েছে।', 'Notice submitted for review.'),
      });
      loadNotices();
    } catch (err: any) {
      const msg = err?.response?.data?.message_bn || err?.message || t('স্ট্যাটাস পরিবর্তন করা যায়নি।', 'Status update failed.');
      setActionAlert({ msg, err: true });
    }
  };

  // Soft Delete Handler (Marks status='DELETED', never destroys row)
  const handleConfirmSoftDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await BhumiApi.deleteManagedContent(deleteTarget.id, { kind: 'notice' });
      setActionAlert({
        msg: t('নোটিশটি সফট ডিলিট করা হয়েছে (আর্কাইভে সংরক্ষিত)।', 'Notice soft deleted (archived safely).'),
      });
      setDeleteTarget(null);
      loadNotices();
    } catch (err: any) {
      const msg = err?.response?.data?.message_bn || err?.message || t('মুছে ফেলা যায়নি।', 'Delete failed.');
      setActionAlert({ msg, err: true });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const matchesScope = scopeFilter === 'ALL' || item.scope === scopeFilter;
      const matchesSearch =
        !searchQuery ||
        (item.title_bn && item.title_bn.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.title_en && item.title_en.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.notice_slug && item.notice_slug.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesStatus && matchesScope && matchesSearch;
    });
  }, [items, statusFilter, scopeFilter, searchQuery]);

  return (
    <div className="h-full min-h-0 flex flex-col gap-2.5 p-3 sm:p-4 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Action Notification Alert */}
      {actionAlert && (
        <Alert
          variant={actionAlert.err ? 'destructive' : 'default'}
          className="flex items-center justify-between py-2 px-3 shadow-2xs border-blue-200 bg-blue-50/80 text-blue-900 rounded-xl shrink-0"
        >
          <div className="flex items-center gap-2">
            {actionAlert.err ? <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
            <AlertDescription className="font-bold text-xs">{actionAlert.msg}</AlertDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setActionAlert(null)}
            className="h-6 w-6 p-0 text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            ✕
          </Button>
        </Alert>
      )}

      {/* Search, Scope, Status & Actions Toolbar */}
      <Card className="p-2 sm:p-2.5 rounded-xl border border-border/80 shadow-2xs space-y-2 bg-card shrink-0">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-2">
          {/* Search Box */}
          <div className="relative flex-1 w-full lg:max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('শিরোনাম বা স্মারক দিয়ে খুঁজুন...', 'Search by title or memo...')}
              className="pl-8 h-8 text-xs rounded-lg bg-background w-full"
            />
          </div>

          {/* Scope Filter */}
          <div className="flex items-center gap-1.5 shrink-0 w-full lg:w-auto">
            <span className="text-xs font-semibold text-muted-foreground">{t('পরিধি:', 'Scope:')}</span>
            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger className="h-8 text-xs w-full sm:w-40 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('সকল পরিধি', 'All Scopes')}</SelectItem>
                <SelectItem value="NATIONAL">{t('জাতীয় (National)', 'National')}</SelectItem>
                <SelectItem value="DIVISIONAL">{t('বিভাগীয় (Divisional)', 'Divisional')}</SelectItem>
                <SelectItem value="DISTRICT">{t('জেলা (District)', 'District')}</SelectItem>
                <SelectItem value="UPAZILA">{t('উপজেলা (Upazila)', 'Upazila')}</SelectItem>
                <SelectItem value="CITIZEN">{t('নাগরিক (Citizen)', 'Citizen')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 justify-end flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(`/${lang}/notices`, '_blank')}
              className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1 border-border shrink-0 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">{t('নোটিশ পেজ', 'Notice Page')}</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleOpenCreate}
              className="h-8 px-3 rounded-lg bg-[#006A4E] hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs gap-1 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>{t('নতুন নোটিশ', 'New Notice')}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadNotices}
              className="h-8 px-2.5 rounded-lg text-xs font-semibold border-border shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Status Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-border/50">
          <span className="text-xs font-semibold text-muted-foreground mr-1">{t('স্ট্যাটাস:', 'Status:')}</span>
          {(['ALL', 'PUBLISHED', 'SUBMITTED', 'DRAFT', 'DELETED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-0.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-blue-900 text-white dark:bg-blue-600 dark:text-white shadow-2xs'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {st === 'ALL'
                ? t('সকল', 'All')
                : st === 'PUBLISHED'
                ? t('প্রকাশিত', 'Published')
                : st === 'SUBMITTED'
                ? t('অপেক্ষমাণ', 'Pending')
                : st === 'DRAFT'
                ? t('খসড়া', 'Draft')
                : t('মুছে ফেলা', 'Deleted')}
            </button>
          ))}
        </div>
      </Card>

      {/* 3. Notice Data Table (Single-screen scrollable) */}
      <Card className="rounded-xl border border-border/80 shadow-2xs overflow-hidden bg-card flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-xs z-20 border-b border-border shadow-xs">
              <TableRow>
              <TableHead className="font-bold text-xs w-12 bg-muted/95">#</TableHead>
              <TableHead className="font-bold text-xs bg-muted/95">{t('শিরোনাম', 'Title')}</TableHead>
              <TableHead className="font-bold text-xs bg-muted/95">{t('ধরন ও পরিধি', 'Category & Scope')}</TableHead>
              <TableHead className="font-bold text-xs bg-muted/95">{t('অগ্রাধিকার', 'Priority')}</TableHead>
              <TableHead className="font-bold text-xs bg-muted/95">{t('স্ট্যাটাস', 'Status')}</TableHead>
              <TableHead className="font-bold text-xs bg-muted/95">{t('জারিকারী ও তারিখ', 'Authority & Date')}</TableHead>
              <TableHead className="text-right font-bold text-xs bg-muted/95">{t('অ্যাকশন', 'Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-xs">
                  <div className="flex items-center justify-center gap-2">
                    <RotateCcw className="w-4 h-4 animate-spin text-blue-600" />
                    <span>{t('নোটিশ লোড হচ্ছে...', 'Loading notices...')}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-xs">
                  {t('কোনো সরকারি নোটিশ পাওয়া যায়নি। নতুন নোটিশ জারি করতে উপরের বাটনে ক্লিক করুন।', 'No notices found. Click New Notice to issue one.')}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item, idx) => {
                const isPublished = item.status === 'PUBLISHED';
                const isSubmitted = item.status === 'SUBMITTED';
                const isDraft = item.status === 'DRAFT';
                const isDeleted = item.status === 'DELETED';
                const isRejected = item.status === 'REJECTED';

                return (
                  <TableRow key={item.id || idx} className="hover:bg-muted/40 transition">
                    <TableCell className="font-mono text-xs font-bold text-muted-foreground">
                      {toBanglaDigits(String(item.id || idx + 1), lang)}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="font-bold text-xs text-foreground line-clamp-1">{item.title_bn}</div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1 font-sans">{item.title_en}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] font-mono bg-muted/30">
                          {item.category || 'COMMUNITY'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-800 border-blue-200">
                          {item.scope || 'NATIONAL'}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5 line-clamp-1">
                        /{item.notice_slug || `notice-${item.id}`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {Boolean(item.is_urgent) && (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 text-[10px] font-bold">
                            <Flame className="w-3 h-3 mr-0.5" />
                            {t('জরুরি', 'Urgent')}
                          </Badge>
                        )}
                        {Boolean(item.is_pinned) && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] font-bold">
                            <Pin className="w-3 h-3 mr-0.5" />
                            {t('পিন', 'Pinned')}
                          </Badge>
                        )}
                        {!item.is_urgent && !item.is_pinned && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isDeleted ? (
                        <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-300 text-[10px] font-bold">
                          🗑 {t('মুছে ফেলা', 'Soft Deleted')}
                        </Badge>
                      ) : isPublished ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                          ✓ {t('প্রকাশিত', 'Published')}
                        </Badge>
                      ) : isSubmitted ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-bold">
                          ⏳ {t('অপেক্ষমাণ', 'Pending')}
                        </Badge>
                      ) : isRejected ? (
                        <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-300 text-[10px] font-bold">
                          ✕ {t('বাতিল', 'Rejected')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 text-[10px] font-bold">
                          ✎ {t('খসড়া', 'Draft')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span>{new Date(item.created_at || Date.now()).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US')}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span>{item.published_by || t('ভূমি মন্ত্রণালয়', 'Ministry of Land')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewItem(item)}
                          className="h-8 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                          title={t('প্রিভিউ', 'Preview')}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        {!isDeleted && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(item)}
                            className="h-8 px-2 text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                            title={t('এডিট', 'Edit')}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {isSubmitted && !isDeleted && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleStatusTransition(item, 'PUBLISHED')}
                            className="h-7 px-2.5 bg-blue-700 hover:bg-blue-800 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            <span>{t('অনুমোদন', 'Approve')}</span>
                          </Button>
                        )}

                        {isDraft && !isDeleted && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleStatusTransition(item, 'SUBMITTED')}
                            className="h-7 px-2.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            <span>{t('জমা দিন', 'Submit')}</span>
                          </Button>
                        )}

                        {/* Soft Delete Option */}
                        {!isDeleted ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(item)}
                            className="h-8 px-2 text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title={t('সফট ডিলিট', 'Soft Delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleStatusTransition(item, 'DRAFT')}
                            className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                            title={t('পুনরুদ্ধার করুন', 'Restore')}
                          >
                            <ArchiveRestore className="w-3 h-3 mr-1" />
                            <span>{t('পুনরুদ্ধার', 'Restore')}</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        </div>
      </Card>

      {/* 5. Create / Edit Notice Dedicated Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-foreground flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-700" />
              <span>
                {editingItem ? t('নোটিশ সম্পাদনা করুন', 'Edit Official Notice') : t('নতুন সরকারি নোটিশ জারি', 'Issue New Official Notice')}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t('সরকারি আদেশ ও জরুরি বিজ্ঞপ্তির বিবরণ বাংলা এবং ইংরেজিতে লিখুন।', 'Issue official public notice and government order.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">{t('নোটিশের ধরন', 'Notice Category')}</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMMUNITY">{t('গণবিজ্ঞপ্তি (Public Notice)', 'Public Notice')}</SelectItem>
                    <SelectItem value="OFFICIAL">{t('প্রশাসনিক আদেশ (Official Order)', 'Official Order')}</SelectItem>
                    <SelectItem value="GAZETTE">{t('গেজেট ও পরিপত্র (Gazette/Circular)', 'Gazette/Circular')}</SelectItem>
                    <SelectItem value="TENDER">{t('টেন্ডার ও নিলাম (Tender/Auction)', 'Tender/Auction')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold">{t('কার্যকর এলাকা / পরিধি', 'Scope of Notice')}</Label>
                <Select
                  value={formData.scope}
                  onValueChange={(val) => setFormData({ ...formData, scope: val })}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NATIONAL">{t('জাতীয় (National)', 'National')}</SelectItem>
                    <SelectItem value="DIVISIONAL">{t('বিভাগীয় (Divisional)', 'Divisional')}</SelectItem>
                    <SelectItem value="DISTRICT">{t('জেলা (District)', 'District')}</SelectItem>
                    <SelectItem value="UPAZILA">{t('উপজেলা (Upazila)', 'Upazila')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Urgent & Pinned Flags */}
            <div className="flex items-center gap-6 p-3 rounded-xl bg-muted/40 border border-border/80">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_urgent}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_urgent: checked })}
                  id="urgent-switch"
                />
                <Label htmlFor="urgent-switch" className="text-xs font-bold cursor-pointer">
                  {t('জরুরি নোটিশ হিসেবে চিহ্নিত করুন', 'Mark as Urgent Notice')}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_pinned}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_pinned: checked })}
                  id="pinned-switch"
                />
                <Label htmlFor="pinned-switch" className="text-xs font-bold cursor-pointer">
                  {t('নোটিশবোর্ডের শীর্ষে পিন রাখুন', 'Pin to Top of Noticeboard')}
                </Label>
              </div>
            </div>

            {/* Issuing Authority */}
            <div>
              <Label className="text-xs font-bold">{t('জারিকারী কার্যালয় / কর্তৃপক্ষ', 'Issuing Authority')}</Label>
              <Input
                disabled
                value={user?.office_bn || t('ভূমি মন্ত্রণালয় • জাতীয় প্রশাসন', 'Ministry of Land')}
                className="mt-1 h-9 text-xs bg-muted font-medium"
              />
            </div>

            {/* Title BN */}
            <div>
              <Label className="text-xs font-bold">{t('নোটিশের শিরোনাম (বাংলা) *', 'Notice Title (Bangla) *')}</Label>
              <Input
                value={formData.title_bn}
                onChange={(e) => setFormData({ ...formData, title_bn: e.target.value })}
                placeholder={t('যেমন: সাভার উপজেলার নামজারি ফি পরিশোধের নতুন সরকারি প্রজ্ঞাপন', 'e.g. Official circular on mutation fee payment')}
                className="mt-1 text-xs"
              />
            </div>

            {/* Title EN */}
            <div>
              <Label className="text-xs font-bold">{t('নোটিশের শিরোনাম (ইংরেজি) *', 'Notice Title (English) *')}</Label>
              <Input
                value={formData.title_en}
                onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                placeholder="e.g. Official Government Notice Regarding Digital Land Mutation Fees"
                className="mt-1 text-xs"
              />
            </div>

            {/* Body BN */}
            <div>
              <Label className="text-xs font-bold">{t('নোটিশের পূর্ণাঙ্গ বিবরণ ও আদেশ (বাংলা) *', 'Notice Order Body (Bangla) *')}</Label>
              <Textarea
                rows={6}
                value={formData.body_bn}
                onChange={(e) => setFormData({ ...formData, body_bn: e.target.value })}
                placeholder={t('সরকারি নোটিশ বা আদেশের বিস্তারিত টেক্সট লিখুন...', 'Write notice text in Bangla...')}
                className="mt-1 text-xs"
              />
            </div>

            {/* Body EN */}
            <div>
              <Label className="text-xs font-bold">{t('নোটিশের পূর্ণাঙ্গ বিবরণ ও আদেশ (ইংরেজি) *', 'Notice Order Body (English) *')}</Label>
              <Textarea
                rows={6}
                value={formData.body_en}
                onChange={(e) => setFormData({ ...formData, body_en: e.target.value })}
                placeholder="Write notice text in English..."
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 border-t border-border/50 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
              className="text-xs font-bold cursor-pointer"
            >
              {t('বাতিল', 'Cancel')}
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => handleSave(false)}
                className="text-xs font-bold cursor-pointer"
              >
                {saving ? t('সংরক্ষণ হচ্ছে...', 'Saving...') : t('খসড়া সংরক্ষণ', 'Save Draft')}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={() => handleSave(true)}
                className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold cursor-pointer"
              >
                {t('সংরক্ষণ ও জারি করুন', 'Save & Publish')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Soft Delete Confirmation Modal */}
      {deleteTarget && (
        <Dialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <DialogTitle className="text-base font-black">
                  {t('নোটিশ মুছে ফেলা নিশ্চিত করুন', 'Confirm Delete')}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground pt-2 leading-relaxed">
                {t(
                  'আপনি কি নিশ্চিত যে এই নোটিশটি মুছে ফেলতে চান? এটি নোটিশবোর্ড থেকে প্রত্যাহার করা হবে এবং অডিটে সংরক্ষিত থাকবে।',
                  'Are you sure you want to delete this notice? It will be removed from the public board and preserved in audit records.'
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="p-3 my-2 rounded-xl bg-muted/50 border border-border/80 text-xs">
              <div className="font-bold text-foreground line-clamp-1">{deleteTarget.title_bn}</div>
              <div className="text-[11px] text-muted-foreground line-clamp-1">{deleteTarget.title_en}</div>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                className="text-xs font-bold cursor-pointer"
              >
                {t('বাতিল', 'Cancel')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                onClick={handleConfirmSoftDelete}
                className="text-xs font-bold cursor-pointer"
              >
                {isDeleting ? t('মুছে ফেলা হচ্ছে...', 'Deleting...') : t('হ্যাঁ, মুছে ফেলুন', 'Yes, Delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 7. Notice Preview Modal */}
      {previewItem && (
        <Dialog open={Boolean(previewItem)} onOpenChange={() => setPreviewItem(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-bold">
                  {previewItem.category || 'COMMUNITY'}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {previewItem.scope || 'NATIONAL'}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {previewItem.status}
                </Badge>
              </div>
              <DialogTitle className="text-lg font-black text-foreground mt-2">
                {previewItem.title_bn}
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-sans italic">{previewItem.title_en}</p>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs leading-relaxed text-foreground border-t border-border/60">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80">
                <div className="font-bold text-foreground mb-1.5">{t('বাংলা বিবরণ ও আদেশ:', 'Bangla Notice Text:')}</div>
                <p className="whitespace-pre-line text-foreground/90">{previewItem.body_bn}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80">
                <div className="font-bold text-foreground mb-1.5">{t('ইংরেজি বিবরণ ও আদেশ:', 'English Notice Text:')}</div>
                <p className="whitespace-pre-line text-muted-foreground">{previewItem.body_en}</p>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-border/60 pt-3">
              <span className="text-[11px] text-muted-foreground font-mono">
                /{previewItem.notice_slug}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewItem(null)}
                className="text-xs font-bold cursor-pointer"
              >
                {t('বন্ধ করুন', 'Close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
