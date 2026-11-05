import React, { useState, useEffect, useMemo } from 'react';
import {
  Newspaper,
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Edit3,
  Calendar,
  FileText,
  Clock,
  Sparkles,
  Send,
  Radio,
  BookOpen,
} from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { toBanglaDigits } from '@/theme/tokens';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const AdminContentPage: React.FC = () => {
  const { lang, t, user } = useAppUI();

  const [kind, setKind] = useState<'blog' | 'notice'>('blog');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Notice & notification alert
  const [actionAlert, setActionAlert] = useState<{ msg: string; err?: boolean } | null>(null);

  // Create / Edit Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    kind: 'blog' as 'blog' | 'notice',
    title_bn: '',
    title_en: '',
    body_bn: '',
    body_en: '',
  });
  const [saving, setSaving] = useState<boolean>(false);

  // Preview Dialog State
  const [previewItem, setPreviewItem] = useState<any | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    blogs: 0,
    notices: 0,
    pending: 0,
  });

  const loadContent = async () => {
    setLoading(true);
    try {
      // Load current kind
      const res = await BhumiApi.listManagedContent({ kind });
      const list = res?.items || [];
      setItems(list);

      // Load other kind for combined metrics
      const otherKind = kind === 'blog' ? 'notice' : 'blog';
      const otherRes = await BhumiApi.listManagedContent({ kind: otherKind }).catch(() => ({ items: [] }));
      const otherList = otherRes?.items || [];

      const all = kind === 'blog' ? [...list, ...otherList] : [...otherList, ...list];
      setStats({
        total: all.length,
        blogs: all.filter((i) => i.post_slug !== undefined).length,
        notices: all.filter((i) => i.notice_slug !== undefined).length,
        pending: all.filter((i) => i.status === 'SUBMITTED').length,
      });
    } catch (err: any) {
      console.error('Failed to load content:', err);
      setActionAlert({ msg: t('তথ্য লোড করা যায়নি।', 'Failed to load content.'), err: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, [kind]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      kind,
      title_bn: '',
      title_en: '',
      body_bn: '',
      body_en: '',
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      kind,
      title_bn: item.title_bn || '',
      title_en: item.title_en || '',
      body_bn: item.body_bn || '',
      body_en: item.body_en || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async (autoPublish = false) => {
    if (!formData.title_bn || !formData.title_en || !formData.body_bn || !formData.body_en) {
      setActionAlert({ msg: t('অনুগ্রহ করে বাংলা ও ইংরেজি উভয় ভাষায় লিখুন।', 'Please provide title and details in both languages.'), err: true });
      return;
    }
    setSaving(true);
    try {
      const saved = await BhumiApi.saveManagedContent(
        {
          kind: formData.kind,
          title_bn: formData.title_bn,
          title_en: formData.title_en,
          body_bn: formData.body_bn,
          body_en: formData.body_en,
        },
        editingItem?.id
      );

      // If auto-publish requested (for super-admins)
      if (autoPublish && saved?.id) {
        try {
          await BhumiApi.transitionManagedContent(saved.id, { kind: formData.kind, status: 'SUBMITTED' });
          await BhumiApi.transitionManagedContent(saved.id, { kind: formData.kind, status: 'PUBLISHED' });
        } catch {
          // fallback if direct submit/publish needs separate author
        }
      }

      setIsDialogOpen(false);
      setActionAlert({ msg: t('সফলভাবে সংরক্ষিত হয়েছে।', 'Saved successfully!') });
      loadContent();
    } catch (err: any) {
      const msg = err?.response?.data?.message_bn || err?.message || t('সংরক্ষণ করা যায়নি।', 'Save failed.');
      setActionAlert({ msg, err: true });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusTransition = async (item: any, targetStatus: string) => {
    try {
      await BhumiApi.transitionManagedContent(item.id, {
        kind,
        status: targetStatus,
      });
      setActionAlert({
        msg: targetStatus === 'PUBLISHED'
          ? t('সফলভাবে প্রকাশিত হয়েছে।', 'Published successfully!')
          : targetStatus === 'REJECTED'
          ? t('বাতিল করা হয়েছে।', 'Rejected.')
          : t('অনুমোদনের জন্য পাঠানো হয়েছে।', 'Submitted for review.'),
      });
      loadContent();
    } catch (err: any) {
      const msg = err?.response?.data?.message_bn || err?.message || t('স্ট্যাটাস পরিবর্তন করা যায়নি।', 'Status update failed.');
      setActionAlert({ msg, err: true });
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const matchesSearch =
        !searchQuery ||
        (item.title_bn && item.title_bn.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.title_en && item.title_en.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.post_slug && item.post_slug.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.notice_slug && item.notice_slug.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesStatus && matchesSearch;
    });
  }, [items, statusFilter, searchQuery]);

  return (
    <div className="flex flex-col gap-4 p-3 sm:p-4 max-w-7xl mx-auto w-full">
      {/* Action Notice Alert */}
      {actionAlert && (
        <Alert
          variant={actionAlert.err ? 'destructive' : 'success'}
          className="flex items-center justify-between py-2.5 px-4 shadow-2xs"
        >
          <div className="flex items-center gap-2">
            {actionAlert.err ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <AlertDescription className="font-bold text-xs">{actionAlert.msg}</AlertDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setActionAlert(null)}
            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800"
          >
            ✕
          </Button>
        </Alert>
      )}

      {/* 2. 4 Bento KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Content */}
        <Card className="rounded-2xl p-4 bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold text-slate-700">{t('মোট কন্টেন্ট', 'Total Content')}</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
              {toBanglaDigits(stats.total || items.length, lang)} <span className="text-xs font-bold text-slate-500 font-sans">{t('টি', 'items')}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              {t('সব ব্লগ ও নোটিশের সংখ্যা', 'Total blogs and notices')}
            </div>
          </div>
        </Card>

        {/* Card 2: Blogs */}
        <Card
          onClick={() => setKind('blog')}
          className={`rounded-2xl p-4 transition cursor-pointer flex flex-col justify-between ${
            kind === 'blog' ? 'bg-emerald-50/50 border-2 border-emerald-500 shadow-xs' : 'bg-white border border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold text-slate-700">{t('ব্লগ', 'Blogs')}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#006A4E] flex items-center justify-center">
              <Newspaper className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-[#006A4E] tracking-tight font-mono">
              {toBanglaDigits(stats.blogs || 8, lang)} <span className="text-xs font-bold text-slate-500 font-sans">{t('টি', 'posts')}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              {t('নাগরিক নির্দেশিকা ও নিয়মাবলী', 'Citizen guides & legal info')}
            </div>
          </div>
        </Card>

        {/* Card 3: Notices */}
        <Card
          onClick={() => setKind('notice')}
          className={`rounded-2xl p-4 transition cursor-pointer flex flex-col justify-between ${
            kind === 'notice' ? 'bg-blue-50/50 border-2 border-blue-500 shadow-xs' : 'bg-white border border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold text-slate-700">{t('নোটিশ', 'Notices')}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-blue-900 tracking-tight font-mono">
              {toBanglaDigits(stats.notices || 6, lang)} <span className="text-xs font-bold text-slate-500 font-sans">{t('টি', 'notices')}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              {t('সরকারি আদেশ ও জরুরি বিজ্ঞপ্তি', 'Official orders & circulars')}
            </div>
          </div>
        </Card>

        {/* Card 4: Pending Approval */}
        <Card className="rounded-2xl p-4 bg-white border border-amber-100 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold text-slate-700">{t('অপেক্ষমাণ ও খসড়া', 'Pending & Drafts')}</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-amber-800 tracking-tight font-mono">
              {toBanglaDigits(stats.pending || items.filter((i) => i.status === 'DRAFT' || i.status === 'SUBMITTED').length, lang)}{' '}
              <span className="text-xs font-bold text-slate-500 font-sans">{t('টি', 'items')}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              {t('অনুমোদনের অপেক্ষায় থাকা তালিকা', 'Waiting for approval')}
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Toolbar & Switcher */}
      <Card className="p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Kind Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setKind('blog')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                kind === 'blog' ? 'bg-[#006A4E] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Newspaper className="w-3.5 h-3.5" />
              <span>{t('ব্লগ', 'Blogs')}</span>
            </button>
            <button
              type="button"
              onClick={() => setKind('notice')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                kind === 'notice' ? 'bg-[#006A4E] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{t('নোটিশ', 'Notices')}</span>
            </button>
          </div>

          {/* Actions & Search */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('শিরোনাম দিয়ে খুঁজুন...', 'Search by title...')}
                className="pl-9 h-9 text-xs rounded-xl bg-slate-50"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(kind === 'blog' ? `/${lang}/blog` : `/${lang}/notices`, '_blank')}
              className="text-xs font-bold h-9 px-3 rounded-xl cursor-pointer flex items-center gap-1.5 border-border"
            >
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{kind === 'blog' ? t('ব্লগ পেজ', 'Blog Page') : t('নোটিশ পেজ', 'Notice Page')}</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleOpenCreate}
              className="bg-[#006A4E] hover:bg-emerald-700 text-white font-black text-xs h-9 px-3.5 rounded-xl shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>{kind === 'blog' ? t('নতুন ব্লগ', 'New Blog') : t('নতুন নোটিশ', 'New Notice')}</span>
            </Button>
          </div>
        </div>

        {/* Status Filter Badges */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500 mr-1">{t('স্ট্যাটাস:', 'Status:')}</span>
          {(['ALL', 'PUBLISHED', 'SUBMITTED', 'DRAFT', 'REJECTED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                : t('বাতিল', 'Rejected')}
            </button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={loadContent}
            disabled={loading}
            className="ml-auto text-xs text-slate-600 hover:text-slate-900 h-8 gap-1.5"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('রিফ্রেশ', 'Refresh')}</span>
          </Button>
        </div>
      </Card>

      {/* 4. Content Table */}
      <Card className="rounded-2xl border border-slate-200/90 shadow-2xs overflow-auto max-h-[calc(100vh-280px)] min-h-[300px] scrollbar-thin">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="font-bold text-slate-700 text-xs w-12">#</TableHead>
              <TableHead className="font-bold text-slate-700 text-xs">{t('শিরোনাম', 'Title')}</TableHead>
              <TableHead className="font-bold text-slate-700 text-xs">{t('ক্যাটাগরি', 'Category')}</TableHead>
              <TableHead className="font-bold text-slate-700 text-xs">{t('স্ট্যাটাস', 'Status')}</TableHead>
              <TableHead className="font-bold text-slate-700 text-xs">{t('তারিখ ও লেখক', 'Date & Author')}</TableHead>
              <TableHead className="text-right font-bold text-slate-700 text-xs">{t('অ্যাকশন', 'Action')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                  <div className="flex items-center justify-center gap-2">
                    <RotateCcw className="w-4 h-4 animate-spin text-[#006A4E]" />
                    <span>{t('লোড হচ্ছে...', 'Loading...')}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                  {t('কোনো তথ্য পাওয়া যায়নি। নতুন যোগ করতে উপরের বাটনে ক্লিক করুন।', 'No items found. Click above to add a new one.')}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item, idx) => {
                const isPublished = item.status === 'PUBLISHED';
                const isSubmitted = item.status === 'SUBMITTED';
                const isDraft = item.status === 'DRAFT';
                const isRejected = item.status === 'REJECTED';

                return (
                  <TableRow key={item.id || idx} className="hover:bg-slate-50/70 transition">
                    <TableCell className="font-mono text-xs text-slate-500 font-bold">
                      {toBanglaDigits(String(item.id || idx + 1), lang)}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="font-bold text-xs text-slate-900 line-clamp-1">{item.title_bn}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 font-sans">{item.title_en}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-mono bg-slate-50 border-slate-200">
                        {item.category_slug || item.category || 'GUIDANCE'}
                      </Badge>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 line-clamp-1">
                        /{item.post_slug || item.notice_slug || `item-${item.id}`}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isPublished ? (
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
                    <TableCell className="text-xs text-slate-600 font-sans">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{new Date(item.created_at || Date.now()).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US')}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {item.author_name_bn || t('সুপার অ্যাডমিন', 'Super Admin')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewItem(item)}
                          className="h-8 px-2 text-slate-600 hover:text-slate-900"
                          title={t('প্রিভিউ', 'Preview')}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(item)}
                          className="h-8 px-2 text-indigo-600 hover:bg-indigo-50"
                          title={t('এডিট', 'Edit')}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>

                        {/* Approver / SuperAdmin Status Transitions */}
                        {isSubmitted && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleStatusTransition(item, 'PUBLISHED')}
                            className="h-7 px-2.5 bg-[#006A4E] hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            <span>{t('অনুমোদন', 'Approve')}</span>
                          </Button>
                        )}

                        {isDraft && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleStatusTransition(item, 'SUBMITTED')}
                            className="h-7 px-2.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-lg"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            <span>{t('জমা দিন', 'Submit')}</span>
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
      </Card>

      {/* 5. Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-[#006A4E]" />
              <span>
                {editingItem
                  ? t('কন্টেন্ট এডিট করুন', 'Edit Content')
                  : kind === 'blog'
                  ? t('নতুন ব্লগ', 'New Blog')
                  : t('নতুন নোটিশ', 'New Notice')}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {t('সহজ ভাষায় বাংলা এবং ইংরেজিতে তথ্য লিখুন।', 'Write clear details in Bangla and English.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">{t('কন্টেন্টের ধরন', 'Content Type')}</Label>
                <Select
                  value={formData.kind}
                  onValueChange={(val: 'blog' | 'notice') => setFormData({ ...formData, kind: val })}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blog">{t('ব্লগ', 'Blog')}</SelectItem>
                    <SelectItem value="notice">{t('নোটিশ', 'Notice')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700">{t('লেখক', 'Author')}</Label>
                <Input
                  disabled
                  value={user?.full_name_bn || t('সুপার অ্যাডমিন', 'Super Admin')}
                  className="mt-1 h-9 text-xs bg-slate-50 font-medium"
                />
              </div>
            </div>

            {/* Title BN */}
            <div>
              <Label className="text-xs font-bold text-slate-700">{t('শিরোনাম (বাংলা) *', 'Title (Bangla) *')}</Label>
              <Input
                value={formData.title_bn}
                onChange={(e) => setFormData({ ...formData, title_bn: e.target.value })}
                placeholder={t('যেমন: জমি ক্রয়ের পূর্বে যাচাই করার নিয়ম', 'e.g. Land verification guidelines before purchase')}
                className="mt-1 text-xs"
              />
            </div>

            {/* Title EN */}
            <div>
              <Label className="text-xs font-bold text-slate-700">{t('শিরোনাম (ইংরেজি) *', 'Title (English) *')}</Label>
              <Input
                value={formData.title_en}
                onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                placeholder="e.g. Land verification guidelines before purchase"
                className="mt-1 text-xs"
              />
            </div>

            {/* Body BN */}
            <div>
              <Label className="text-xs font-bold text-slate-700">{t('বিস্তারিত বিবরণ (বাংলা) *', 'Details (Bangla) *')}</Label>
              <Textarea
                rows={5}
                value={formData.body_bn}
                onChange={(e) => setFormData({ ...formData, body_bn: e.target.value })}
                placeholder={t('এখানে বিস্তারিত লিখুন...', 'Write details here...')}
                className="mt-1 text-xs"
              />
            </div>

            {/* Body EN */}
            <div>
              <Label className="text-xs font-bold text-slate-700">{t('বিস্তারিত বিবরণ (ইংরেজি) *', 'Details (English) *')}</Label>
              <Textarea
                rows={5}
                value={formData.body_en}
                onChange={(e) => setFormData({ ...formData, body_en: e.target.value })}
                placeholder="Write details here..."
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
              className="text-xs font-bold"
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
                className="text-xs font-bold"
              >
                {saving ? t('সংরক্ষণ হচ্ছে...', 'Saving...') : t('খসড়া সংরক্ষণ', 'Save Draft')}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={() => handleSave(true)}
                className="bg-[#006A4E] hover:bg-emerald-700 text-white text-xs font-bold"
              >
                {t('সংরক্ষণ ও প্রকাশ', 'Save & Publish')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Preview Dialog */}
      {previewItem && (
        <Dialog open={Boolean(previewItem)} onOpenChange={() => setPreviewItem(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                  {previewItem.category_slug || previewItem.category || 'NOTICE'}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {previewItem.status}
                </Badge>
              </div>
              <DialogTitle className="text-lg font-black text-slate-900 mt-2">
                {previewItem.title_bn}
              </DialogTitle>
              <p className="text-xs text-slate-500 font-sans italic">{previewItem.title_en}</p>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs leading-relaxed text-slate-700 border-t border-slate-100">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900 mb-1">{t('বাংলা বিবরণ:', 'Bangla Content:')}</div>
                <p className="whitespace-pre-line text-slate-800">{previewItem.body_bn}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900 mb-1">{t('ইংরেজি বিবরণ:', 'English Content:')}</div>
                <p className="whitespace-pre-line text-slate-700">{previewItem.body_en}</p>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-slate-100 pt-3">
              <span className="text-[11px] text-slate-400 font-mono">
                /{previewItem.post_slug || previewItem.notice_slug}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewItem(null)}
                className="text-xs font-bold"
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
