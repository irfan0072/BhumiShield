import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import {
  Bell,
  Search,
  FileText,
  Download,
  QrCode,
  Calendar,
  Eye,
  AlertCircle,
  Pin,
  CheckCircle,
  X,
  ExternalLink,
  ShieldAlert,
  Building,
  Scale,
  Volume2,
  VolumeX,
  Square,
  Play,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { useNotices } from '../components/publicHooks';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface NoticeAttachment {
  id: number;
  notice_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size_bytes: number;
  content_hash: string;
  qr_payload: string;
}

interface NoticeItem {
  id: number;
  notice_slug: string;
  category: string;
  scope: string;
  title_bn: string;
  title_en: string;
  body_bn: string;
  body_en: string;
  is_pinned: number;
  is_urgent: number;
  published_by: string;
  published_at: string;
  created_at?: string;
  view_count: number;
  download_count: number;
  attachment_count: number;
  attachments?: NoticeAttachment[];
}

export const NoticeboardPage: React.FC = () => {
  const { t, lang, formatDate } = useAppUI();
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // TanStack Query for Dynamic Notices
  const queryParams = {
    category: categoryFilter || undefined,
  };
  const noticesQuery = useNotices(queryParams);

  // Active Notice Modal State
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);

  // Attachment QR Modal State
  const [selectedAttachment, setSelectedAttachment] = useState<NoticeAttachment | null>(null);

  // Web Speech API Text-to-Speech State
  const [playingNoticeId, setPlayingNoticeId] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleAudio = (notice: NoticeItem) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert(t('আপনার ব্রাউজারে অডিও স্পিচ সুবিধা সমর্থিত নয়।', 'Text-to-speech is not supported by your browser.'));
      return;
    }

    if (playingNoticeId === notice.id) {
      window.speechSynthesis.cancel();
      setPlayingNoticeId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const titleText = lang === 'bn' ? notice.title_bn : notice.title_en;
    const bodyText = lang === 'bn' ? notice.body_bn : notice.body_en;
    const textToRead = `${titleText}। ${bodyText}`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
    utterance.rate = 0.95;

    utterance.onend = () => {
      setPlayingNoticeId(null);
    };

    utterance.onerror = () => {
      setPlayingNoticeId(null);
    };

    setPlayingNoticeId(notice.id);
    window.speechSynthesis.speak(utterance);
  };

  const rawNotices: NoticeItem[] = noticesQuery.data?.items || [];

  // Filter by search query
  const filteredNotices = rawNotices.filter((n) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      (n.title_bn || '').toLowerCase().includes(q) ||
      (n.title_en || '').toLowerCase().includes(q) ||
      (n.body_bn || '').toLowerCase().includes(q) ||
      (n.published_by || '').toLowerCase().includes(q)
    );
  });

  const pinnedNotices = filteredNotices.filter((n) => Boolean(n.is_pinned || n.is_urgent));
  const standardNotices = filteredNotices.filter((n) => !n.is_pinned && !n.is_urgent);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 pb-8 sm:pb-12 relative overflow-hidden">
      {/* Ambient background glow & subtle dot pattern */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[320px] bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent blur-3xl -z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 -z-10 pointer-events-none" />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4">
        {/* Compact Integrated Header Bar */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-3.5 shadow-xs mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-[#006A4E] flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  {t('নোটিশবোর্ড ও গেজেট', 'Noticeboard & Gazettes')}
                </h1>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {t('ভূমি মন্ত্রণালয় ও সাব-রেজিস্ট্রি', 'Ministry & Sub-Registry')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-none">
                {t('ভূমি মন্ত্রণালয় ও সাব-রেজিস্ট্রির সরকারি নোটিশ, পরিপত্র, প্রজ্ঞাপন ও আদেশ।', 'Official gazettes, circulars, and notices from land registry authorities.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
              {t(`মোট নোটিশ: ${filteredNotices.length}টি`, `Total: ${filteredNotices.length}`)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => noticesQuery.refetch()}
              className="h-8 px-2.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer text-xs flex items-center gap-1 rounded-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('রিফ্রেশ', 'Refresh')}</span>
            </Button>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <Card className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-2.5 sm:p-3 mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Category Tabs */}
            <Tabs
              value={categoryFilter || 'ALL'}
              onValueChange={(val) => setCategoryFilter(val === 'ALL' ? '' : val)}
              className="w-auto overflow-x-auto scrollbar-none"
            >
              <TabsList className="flex flex-nowrap sm:flex-wrap h-auto gap-1 bg-transparent p-0">
                {[
                  { id: 'ALL', label_bn: 'সকল নোটিশ', label_en: 'All Notices' },
                  { id: 'gazette', label_bn: 'সরকারি গেজেট', label_en: 'Gazettes' },
                  { id: 'circular', label_bn: 'পরিপত্র ও আদেশ', label_en: 'Circulars' },
                  { id: 'auction', label_bn: 'নিলাম বিজ্ঞপ্তি', label_en: 'Auctions' },
                  { id: 'urgent', label_bn: 'জরুরি বিজ্ঞপ্তি', label_en: 'Urgent' },
                ].map((cat) => (
                  <TabsTrigger
                    key={cat.id}
                    value={cat.id}
                    className="h-7 px-2.5 text-[11px] sm:text-xs rounded-full font-bold transition cursor-pointer data-[state=active]:bg-[#006A4E] data-[state=active]:text-white data-[state=inactive]:bg-slate-50 data-[state=inactive]:border data-[state=inactive]:border-slate-200 data-[state=inactive]:text-slate-700 hover:border-[#006A4E]"
                  >
                    {lang === 'bn' ? cat.label_bn : cat.label_en}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Keyword Search */}
            <div className="relative w-full sm:w-60 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('শিরোনাম বা কীওয়ার্ড খুঁজুন...', 'Search notices...')}
                className="h-8 text-xs pl-8 border-slate-300 rounded-lg focus-visible:ring-[#006A4E]"
              />
            </div>
          </div>
        </Card>

        {/* 4-State UI Coverage: Notices List with Responsive Scroll */}
        {noticesQuery.isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
                <Skeleton className="h-5 w-1/3 bg-slate-200" />
                <Skeleton className="h-3.5 w-full bg-slate-200" />
                <Skeleton className="h-3.5 w-4/5 bg-slate-200" />
              </Card>
            ))}
          </div>
        ) : noticesQuery.isError ? (
          <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-center space-y-2.5">
            <AlertCircle className="w-7 h-7 text-rose-600 mx-auto" />
            <h3 className="text-sm sm:text-base font-bold text-rose-900">
              {t('নোটিশবোর্ড লোড করতে সমস্যা হয়েছে', 'Failed to load noticeboard')}
            </h3>
            <p className="text-xs text-rose-700 max-w-md mx-auto">
              {t('ইন্টারনেট সংযোগ পরীক্ষা করে পুনরায় চেষ্টা করুন।', 'Please check your connection and retry.')}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => noticesQuery.refetch()}
              className="h-8 border-rose-300 text-rose-800 hover:bg-rose-100 cursor-pointer text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              <span>{t('পুনরায় চেষ্টা করুন', 'Retry')}</span>
            </Button>
          </div>
        ) : filteredNotices.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
            <FileText className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-sm sm:text-base font-bold text-slate-800">
              {t('কোনো নোটিশ পাওয়া যায়নি', 'No notices found')}
            </h3>
            <p className="text-xs text-slate-500">
              {t('অনুগ্রহ করে অন্য ফিল্টার বা অনুসন্ধান শব্দ ব্যবহার করুন।', 'Try searching with different terms or selecting another category.')}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCategoryFilter('');
                setSearchQuery('');
              }}
              className="h-8 cursor-pointer text-xs"
            >
              {t('সকল নোটিশ দেখুন', 'View All Notices')}
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[calc(100vh-190px)] sm:max-h-[calc(100vh-180px)] overflow-y-auto scrollbar-thin pr-1">
            {/* Pinned & Urgent Notices Section */}
            {pinnedNotices.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 px-0.5">
                  <Pin className="w-3.5 h-3.5 text-amber-700" />
                  <span>{t('গুরুত্বপূর্ণ ও পিন করা নোটিশসমূহ', 'Pinned & Urgent Notices')}</span>
                </div>

                {pinnedNotices.map((notice) => (
                  <Card
                    key={notice.id}
                    className="p-3 sm:p-3.5 rounded-xl bg-amber-50/70 border border-amber-300 shadow-2xs space-y-2 hover:shadow-xs transition"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Badge className="bg-amber-600 text-white font-bold text-[9px] sm:text-[10px] px-1.5 py-0.5">
                          {t('জরুরি', 'URGENT')}
                        </Badge>
                        <Badge variant="outline" className="border-amber-300 text-amber-900 text-[9px] sm:text-[10px] px-1.5 py-0.5">
                          {notice.category}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(notice.published_at || notice.created_at)}</span>
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      {lang === 'bn' ? notice.title_bn : notice.title_en}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {lang === 'bn' ? notice.body_bn : notice.body_en}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-amber-200/60">
                      <span className="text-[11px] text-slate-600 font-medium truncate max-w-xs">
                        {notice.published_by}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Audio Reader Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleAudio(notice)}
                          className={`h-7 px-2 text-xs font-bold border transition cursor-pointer flex items-center gap-1 rounded-lg ${
                            playingNoticeId === notice.id
                              ? 'bg-[#006A4E] text-white border-[#006A4E]'
                              : 'border-amber-300 text-amber-900 hover:bg-amber-100'
                          }`}
                        >
                          {playingNoticeId === notice.id ? (
                            <>
                              <VolumeX className="w-3 h-3" />
                              <span>{t('বন্ধ', 'Stop')}</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3 h-3" />
                              <span>{t('শুনুন', 'Listen')}</span>
                            </>
                          )}
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => setSelectedNotice(notice)}
                          className="h-7 px-2.5 text-xs font-bold bg-[#006A4E] hover:bg-[#00553e] text-white cursor-pointer rounded-lg flex items-center gap-1"
                        >
                          <span>{t('সম্পূর্ণ পড়ুন', 'Read Full')}</span>
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Standard Notices List (Responsive 2-Col Grid on Desktop) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-0.5">
              {standardNotices.map((notice) => (
                <Card
                  key={notice.id}
                  className="p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-[#006A4E]/40 hover:shadow-xs transition space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="outline" className="border-slate-300 text-slate-700 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5">
                      {notice.category}
                    </Badge>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(notice.published_at || notice.created_at)}</span>
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {lang === 'bn' ? notice.title_bn : notice.title_en}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {lang === 'bn' ? notice.body_bn : notice.body_en}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
                    <span className="text-[11px] text-slate-600 font-medium truncate max-w-xs">
                      {notice.published_by}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Audio Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleAudio(notice)}
                        className={`h-7 px-2 text-xs font-bold border transition cursor-pointer flex items-center gap-1 rounded-lg ${
                          playingNoticeId === notice.id
                            ? 'bg-[#006A4E] text-white border-[#006A4E]'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {playingNoticeId === notice.id ? (
                          <>
                            <VolumeX className="w-3 h-3" />
                            <span>{t('বন্ধ', 'Stop')}</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>{t('শুনুন', 'Listen')}</span>
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => setSelectedNotice(notice)}
                        className="h-7 px-2.5 text-xs font-bold bg-[#006A4E] hover:bg-[#00553e] text-white cursor-pointer rounded-lg flex items-center gap-1"
                      >
                        <span>{t('সম্পূর্ণ পড়ুন', 'Read Full')}</span>
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* NOTICE DETAIL MODAL */}
      <Dialog open={Boolean(selectedNotice)} onOpenChange={(open) => !open && setSelectedNotice(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto p-4 sm:p-5 border border-slate-200 rounded-2xl bg-white space-y-3">
          {selectedNotice && (
            <>
              <DialogHeader className="border-b border-slate-100 pb-3 text-left space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge className="bg-emerald-100 text-[#006A4E] border-emerald-300 font-bold text-xs">
                    {selectedNotice.category}
                  </Badge>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(selectedNotice.published_at || selectedNotice.created_at)}</span>
                  </span>
                </div>
                <DialogTitle className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                  {lang === 'bn' ? selectedNotice.title_bn : selectedNotice.title_en}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {t('প্রকাশক দপ্তর:', 'Publishing Authority:')} {selectedNotice.published_by}
                </DialogDescription>
              </DialogHeader>

              {/* TTS Audio Controls inside modal */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                <div className="flex items-center gap-2 text-[#006A4E] font-bold">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{t('দৃষ্টিপ্রতিবন্ধী ও অডিও পাঠক:', 'Text-to-Speech Audio Reader:')}</span>
                </div>
                <Button
                  size="sm"
                  variant={playingNoticeId === selectedNotice.id ? 'destructive' : 'default'}
                  onClick={() => handleToggleAudio(selectedNotice)}
                  className="h-7 px-2.5 text-xs font-bold cursor-pointer rounded-lg"
                >
                  {playingNoticeId === selectedNotice.id ? t('অডিও থামান', 'Stop Audio') : t('অডিও চালান', 'Play Audio')}
                </Button>
              </div>

              {/* Body Content */}
              <div className="text-xs sm:text-sm text-slate-800 leading-relaxed space-y-2 whitespace-pre-wrap bg-slate-50/50 p-3 rounded-lg border border-slate-200">
                {lang === 'bn' ? selectedNotice.body_bn : selectedNotice.body_en}
              </div>

              {/* Attachments */}
              {selectedNotice.attachments && selectedNotice.attachments.length > 0 && (
                <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-800 block">
                    {t('সংযুক্ত নথি ও গেজেট কপি:', 'Attached Documents:')}
                  </span>
                  <div className="space-y-1.5">
                    {selectedNotice.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-[#006A4E] shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">{att.file_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedAttachment(att)}
                            className="h-7 px-2 text-xs border-slate-300 rounded-lg"
                          >
                            <QrCode className="w-3 h-3 mr-1" />
                            <span>QR</span>
                          </Button>
                          <a
                            href={att.file_path || '#'}
                            download={att.file_name}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#006A4E] text-white font-bold text-xs hover:bg-[#00553e]"
                          >
                            <Download className="w-3 h-3" />
                            <span>{t('ডাউনলোড', 'Download')}</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter className="border-t border-slate-100 pt-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedNotice(null)}
                  className="cursor-pointer text-xs h-8 rounded-lg"
                >
                  {t('বন্ধ করুন', 'Close')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ATTACHMENT QR MODAL */}
      <Dialog open={Boolean(selectedAttachment)} onOpenChange={(open) => !open && setSelectedAttachment(null)}>
        <DialogContent className="max-w-xs p-4 text-center space-y-3 rounded-2xl bg-white">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-sm sm:text-base font-bold text-slate-900">
              {t('নথির ক্রিপ্টোগ্রাফিক QR ভেরিফিকেশন', 'Cryptographic QR Verification')}
            </DialogTitle>
            <DialogDescription className="text-[11px] text-slate-500 truncate">
              {selectedAttachment?.file_name}
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 inline-block mx-auto">
            <QrCode className="w-28 h-28 text-[#006A4E] mx-auto" />
          </div>

          <div className="font-mono text-[9px] text-slate-500 break-all bg-slate-50 p-2 rounded border border-slate-200">
            {selectedAttachment?.content_hash || '0x4f87a...hash'}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedAttachment(null)}
              className="w-full cursor-pointer h-8 text-xs rounded-lg"
            >
              {t('বন্ধ করুন', 'Close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
