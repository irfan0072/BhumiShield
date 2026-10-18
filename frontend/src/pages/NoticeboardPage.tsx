import {SourceCards} from '../components/sources/SourceCards';
import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
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
  Scale
} from 'lucide-react';

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
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // QR Modal
  const [selectedAttachment, setSelectedAttachment] = useState<NoticeAttachment | null>(null);

  const fetchNotices = () => {
    setLoading(true);
    const params: any = {};
    if (categoryFilter) params.category = categoryFilter;
    if (scopeFilter) params.scope = scopeFilter;
    if (searchQuery) params.q = searchQuery;

    BhumiApi.listNotices(params)
      .then((res) => {
        setNotices(res.items || []);
      })
      .catch((err) => {
        console.error('Failed to load notices', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotices();
  }, [categoryFilter, scopeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNotices();
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'CIRCULAR_POLICY':
        return {
          bg: 'bg-emerald-50 text-[#006A4E] border-emerald-200',
          labelBn: 'পরিপত্র ও নীতিমালার নির্দেশ',
          labelEn: 'Policy Circular',
        };
      case 'OFFICE_NOTICE':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          labelBn: 'অফিস নোটিশ',
          labelEn: 'Office Notice',
        };
      case 'PUBLIC_HEARING':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          labelBn: 'গণশুনানী ও ক্যাম্প',
          labelEn: 'Public Hearing',
        };
      case 'FRAUD_WARNING':
        return {
          bg: 'bg-rose-50 text-[#F42A41] border-rose-200',
          labelBn: 'সতর্কবার্তা ও জালিয়াতি প্রতিরোধ',
          labelEn: 'Fraud Alert',
        };
      case 'GAZETTE':
        return {
          bg: 'bg-purple-50 text-purple-800 border-purple-200',
          labelBn: 'অফিসিয়াল গেজেট',
          labelEn: 'Official Gazette',
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          labelBn: 'সাধারণ বিজ্ঞপ্তি',
          labelEn: 'Notice',
        };
    }
  };

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [verifyState, setVerifyState] = useState<{ ok: boolean; hash: string } | null>(null);

  const handleDownloadNoticeDocument = async (att: NoticeAttachment) => {
    const notice = notices.find((n) => n.id === att.notice_id);
    if (!notice) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      // F09: real government-signed PDF. The backend hashes the canonical
      // envelope and signs the SHA-256 with Ed25519; the PDF body embeds
      // both so a human reader (or verifier) can re-derive and check.
      const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000';
      const url = `${apiBase}/api/v1/notices/${encodeURIComponent(notice.notice_slug)}/attachments/${att.id}/download`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) {
        throw new Error(`Download failed: HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `bhumi_notice_${notice.notice_slug}_${att.id}.sealed.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (e: any) {
      setDownloadError(e?.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleVerifySeal = async (att: NoticeAttachment) => {
    const notice = notices.find((n) => n.id === att.notice_id);
    if (!notice) return;
    try {
      const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000';
      const url = `${apiBase}/api/v1/notices/${encodeURIComponent(notice.notice_slug)}/attachments/${att.id}/download?verify=1`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) throw new Error(`Verify failed: HTTP ${res.status}`);
      const data = await res.json();
      setVerifyState({ ok: !!data.verified, hash: data.content_hash || '' });
    } catch {
      setVerifyState({ ok: false, hash: '' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <SourceCards kind="NOTICE" title={t('সরকারি উৎসের প্রকাশ্য নোটিশ','Reviewed official updates')} />
        {/* Banner */}
        <div className="bg-[#006A4E] text-white rounded-2xl p-6 sm:p-8 shadow-sm space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/60 border border-emerald-600/40 text-emerald-100 text-xs font-semibold">
            <Bell className="w-4 h-4 text-emerald-300" />
            <span>{t('ডিজিটাল নীতি ও নির্দেশনামূলক নোটিশবোর্ড', 'Digital Policy & Guidance Notices')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t('ভূমি সুরক্ষা নীতি ও গণবিজ্ঞপ্তি কেন্দ্র', 'BhumiShield Land Policy & Notice Center')}
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base max-w-3xl leading-relaxed">
            {t(
              'ভূমি হস্তান্তর, নামজারি সময়সীমা, সাব-রেজিস্ট্রি ফি নির্দেশিকা এবং হয়রানি প্রতিরোধে স্বাধীন ডিজিটাল প্ল্যাটফর্মের নীতিমালা ও গণবিজ্ঞপ্তি। প্রতিটি নোটিশ ক্রিপ্টোগ্রাফিক কিউআর সিলমোহর দ্বারা সুরক্ষিত।',
              'Operational policies, mutation guidelines, statutory fee guidance, and citizen notices published on the independent BhumiShield platform, sealed with verifiable Ed25519 QR codes.'
            )}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('শিরোনাম বা বিবরণে অনুসন্ধান...', 'Search by title or keyword...')}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[40px]"
            />
          </form>

          <div className="flex flex-wrap gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[40px]"
            >
              <option value="">{t('সকল ক্যাটাগরি', 'All Categories')}</option>
              <option value="CIRCULAR_POLICY">{t('পরিপত্র ও নীতি', 'Circulars')}</option>
              <option value="OFFICE_NOTICE">{t('অফিস নোটিশ', 'Office Notices')}</option>
              <option value="PUBLIC_HEARING">{t('গণশুনানী', 'Public Hearings')}</option>
              <option value="FRAUD_WARNING">{t('জালিয়াতি সতর্কতা', 'Fraud Warnings')}</option>
              <option value="GAZETTE">{t('অফিসিয়াল গেজেট', 'Gazettes')}</option>
            </select>

            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[40px]"
            >
              <option value="">{t('সকল আওতা', 'All Scopes')}</option>
              <option value="NATIONAL">{t('জাতীয় পর্যায়', 'National')}</option>
              <option value="UPAZILA">{t('উপজেলা/স্থানীয়', 'Upazila / Local')}</option>
            </select>
          </div>
        </div>

        {/* Notices List */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-[#006A4E] mb-3" />
            <p className="font-semibold">{t('বিজ্ঞপ্তি লোড হচ্ছে...', 'Loading notices...')}</p>
          </div>
        ) : notices.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            <Bell className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-semibold text-slate-800">
              {t('কোনো বিজ্ঞপ্তি পাওয়া যায়নি।', 'No notices found matching your criteria.')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notices.map((n) => {
              const badge = getCategoryBadge(n.category);
              return (
                <div
                  key={n.id}
                  className={`bg-white rounded-xl border shadow-sm transition-all overflow-hidden p-5 sm:p-6 ${
                    n.is_pinned ? 'border-emerald-300 ring-1 ring-emerald-100 bg-emerald-50/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {Boolean(n.is_pinned) && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-[#006A4E]">
                            <Pin className="w-3 h-3 rotate-45" />
                            {t('পিন করা', 'Pinned')}
                          </span>
                        )}
                        {Boolean(n.is_urgent) && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-[#F42A41]">
                            <AlertCircle className="w-3 h-3" />
                            {t('জরুরি', 'Urgent')}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg}`}
                        >
                          {lang === 'bn' ? badge.labelBn : badge.labelEn}
                        </span>
                        <span className="text-xs text-slate-400">
                          {n.scope === 'NATIONAL' ? t('জাতীয় আওতা', 'National') : t('স্থানীয় আওতা', 'Local')}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                        {lang === 'bn' ? n.title_bn : n.title_en}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {lang === 'bn' ? n.body_bn : n.body_en}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(n.published_at || n.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {n.view_count} {t('বার পঠিত', 'views')}
                        </span>
                      </div>
                    </div>

                    {/* Attachments / QR Download Pill */}
                    {n.attachments && n.attachments.length > 0 && (
                      <div className="sm:text-right shrink-0 flex flex-col gap-2">
                        {n.attachments.map((att) => (
                          <button
                            key={att.id}
                            type="button"
                            onClick={() => { setSelectedAttachment(att); setVerifyState(null); setDownloadError(null); }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#006A4E] bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer min-h-[44px]"
                          >
                            <FileText className="w-4 h-4 text-emerald-700" />
                            <span>{t('পিডিএফ ও QR সিল', 'PDF & QR Seal')}</span>
                            <QrCode className="w-4 h-4 text-emerald-800 ml-1" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Attachment QR & Cryptographic Seal Modal */}
        {selectedAttachment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-[#006A4E]" />
                  <h3 className="font-bold text-slate-900 text-base">
                    {t('ডিজিটাল বিজ্ঞপ্তি ও কিউআর সিল', 'Digital Notice QR Seal')}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedAttachment(null)}
                  className="text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-center space-y-3">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl inline-block mx-auto">
                  <div className="w-48 h-48 bg-white border border-slate-300 rounded-lg flex flex-col items-center justify-center p-2 text-center">
                    <QrCode className="w-32 h-32 text-slate-800" />
                    <span className="text-[10px] font-mono text-slate-500 break-all truncate max-w-full">
                      {selectedAttachment.qr_payload}
                    </span>
                  </div>
                </div>

                <div className="text-left text-xs bg-emerald-50 p-3 rounded-xl border border-emerald-200 space-y-1.5 text-emerald-950">
                  <p>
                    <strong>{t('নথির নাম:', 'File Name:')}</strong> {selectedAttachment.file_name}
                  </p>
                  <p>
                    <strong>{t('আকার:', 'File Size:')}</strong>{' '}
                    {Math.round(selectedAttachment.file_size_bytes / 1024)} KB (original)
                  </p>
                  <p className="font-mono text-[10px] text-slate-600 break-all">
                    <strong>SHA-256:</strong> {selectedAttachment.content_hash}
                  </p>
                  <p className="text-[11px] text-emerald-800">
                    ✔ {t('সরকারি-স্বাক্ষরিত পিডিএফ (SHA-256 + Ed25519) — ডাউনলোড করে যাচাই করুন।',
                         'Government-signed PDF (SHA-256 + Ed25519) — download to verify.')}
                  </p>
                  {verifyState && (
                    <p className={`text-[11px] font-semibold ${verifyState.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {verifyState.ok
                        ? t('✔ সিল যাচাই সফল — SHA-256 ও Ed25519 মিলেছে।',
                             '✔ Seal verified — SHA-256 and Ed25519 match.')
                        : t('✖ সিল যাচাই ব্যর্থ — স্বাক্ষর অমিল।',
                             '✖ Seal verification FAILED — signature mismatch.')}
                    </p>
                  )}
                  {downloadError && (
                    <p className="text-[11px] font-semibold text-rose-700">
                      {t('ত্রুটি:', 'Error:')} {downloadError}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleVerifySeal(selectedAttachment)}
                  className="px-4 py-2 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold hover:bg-emerald-50 transition cursor-pointer min-h-[44px]"
                >
                  {t('সিল যাচাই করুন', 'Verify Seal')}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAttachment(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer min-h-[44px]"
                >
                  {t('বন্ধ করুন', 'Close')}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadNoticeDocument(selectedAttachment)}
                  disabled={downloading}
                  className="px-5 py-2 bg-[#006A4E] hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {downloading
                      ? t('ডাউনলোড হচ্ছে...', 'Downloading...')
                      : t('সরকারি-স্বাক্ষরিত পিডিএফ ডাউনলোড', 'Download Signed PDF')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
