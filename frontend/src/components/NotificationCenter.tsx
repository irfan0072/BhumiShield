import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Clock,
  ArrowRight,
  Sparkles,
  Layers,
  FileText,
  Building2,
  Trash2,
  CheckCheck,
} from 'lucide-react';
import { useAppUI, UserRole } from '../i18n';
import { toBanglaDigits } from '../theme/tokens';

export interface AppNotification {
  id: string;
  title_bn: string;
  title_en: string;
  message_bn: string;
  message_en: string;
  timestamp: string;
  type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  targetTab: string;
  targetSection?: string;
  read: boolean;
}

// Global Toast Event Dispatcher
type ToastCallback = (notification: AppNotification) => void;
const toastListeners: Set<ToastCallback> = new Set();

export const triggerAppNotification = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
  const fullNotif: AppNotification = {
    ...notif,
    id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
    read: false,
  };

  // Save to user-namespaced storage
  try {
    const rawUser = localStorage.getItem('bs_user');
    const u = rawUser ? JSON.parse(rawUser) : null;
    const userKey = u?.username || (u?.id ? `uid_${u.id}` : null);
    if (userKey) {
      const storageKey = `bs_notifications_${userKey}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updated = [fullNotif, ...existing].slice(0, 30);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }
  } catch {}

  // Trigger all active toast listeners
  toastListeners.forEach((cb) => cb(fullNotif));
};

const getInitialRoleNotifications = (role?: UserRole): AppNotification[] => {
  if (!role) return [];
  if (['admin', 'system_admin'].includes(role)) {
    return [
      {
        id: 'init_sys_1',
        title_bn: 'সিস্টেম লেজার অখণ্ডতা ১০০% সুরক্ষিত',
        title_en: 'Cryptographic Ledger Integrity Verified',
        message_bn: 'Ed25519 ক্রিপ্টোগ্রাফিক হ্যাশ চেইন সম্পূর্ণ অখণ্ড রয়েছে।',
        message_en: 'Ed25519 cryptographic hash chains verified 100% integral.',
        timestamp: new Date().toISOString(),
        type: 'SUCCESS',
        targetTab: 'admin',
        targetSection: 'ledger',
        read: false,
      },
    ];
  }
  if (['ac_land', 'land_office_assistant'].includes(role)) {
    return [
      {
        id: 'init_ac_1',
        title_bn: 'ই-নামজারি এলটি নোটিশ অপেক্ষমাণ',
        title_en: 'e-Mutation LT Notice Ready',
        message_bn: 'সাব-রেজিস্ট্রি অফিস হতে স্বয়ংক্রিয় এলটি নোটিশে নতুন নামজারি কেস ডকেটে জমা হয়েছে।',
        message_en: 'Automated LT Notice generated from Sub-Registry deed is ready in tribunal bench.',
        timestamp: new Date().toISOString(),
        type: 'INFO',
        targetTab: 'acland',
        targetSection: 'mutations',
        read: false,
      },
    ];
  }
  if (['sub_registrar', 'registry_data_officer'].includes(role)) {
    return [
      {
        id: 'init_sr_1',
        title_bn: 'দলিল প্রি-রেজিস্ট্রেশন গেটকিপার কিউ',
        title_en: 'Pre-Registration Gatekeeper Queue',
        message_bn: 'নতুন দলিলের ই-চালান ও স্ট্যাম্প সত্যতা যাচাই সম্পন্ন হয়েছে।',
        message_en: 'New deed e-challan and stamp authenticity verification completed.',
        timestamp: new Date().toISOString(),
        type: 'INFO',
        targetTab: 'registrar',
        targetSection: 'deeds',
        read: false,
      },
    ];
  }
  if (['bank_officer', 'bank_manager'].includes(role)) {
    return [
      {
        id: 'init_bank_1',
        title_bn: 'দ্বৈত বন্ধক সুরক্ষা কার্যকর',
        title_en: 'Double Mortgage Protection Active',
        message_bn: 'কেন্দ্রীয় ডিজিটাল লিয়েন রেজিস্টারে জামানত যাচাই সেবা সক্রিয়।',
        message_en: 'Collateral verification active on central lien register.',
        timestamp: new Date().toISOString(),
        type: 'INFO',
        targetTab: 'bank',
        targetSection: 'mortgages',
        read: false,
      },
    ];
  }
  if (role === 'citizen') {
    return [
      {
        id: 'init_cit_1',
        title_bn: 'নাগরিক ভূমি সুরক্ষা ভল্ট সক্রিয়',
        title_en: 'Citizen Land Vault Active',
        message_bn: 'আপনার খতিয়ান ও দাগে ডিজিটাল বিক্রয় লক সুরক্ষা সক্ষম রয়েছে।',
        message_en: 'Digital sale lock protection enabled for your registered plots.',
        timestamp: new Date().toISOString(),
        type: 'SUCCESS',
        targetTab: 'home',
        targetSection: 'plots',
        read: false,
      },
    ];
  }
  return [];
};

interface NotificationCenterProps {
  onNavigate: (tab: string, section?: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNavigate }) => {
  const { lang, t, role, user, token } = useAppUI();
  const [isOpen, setIsOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'ALERT' | 'SUCCESS'>('ALL');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const userKey = user ? (user.username || `uid_${user.id}`) : null;
  const storageKey = userKey ? `bs_notifications_${userKey}` : null;

  // Clean legacy global unnamespaced key
  useEffect(() => {
    try {
      localStorage.removeItem('bs_notifications');
    } catch {}
  }, []);

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    if (!userKey || !storageKey) return [];
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return getInitialRoleNotifications(role);
  });

  // Sync notifications when user session or storageKey updates
  useEffect(() => {
    if (!storageKey) {
      setNotifications([]);
      return;
    }
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setNotifications(JSON.parse(stored));
      } else {
        const initial = getInitialRoleNotifications(role);
        setNotifications(initial);
        localStorage.setItem(storageKey, JSON.stringify(initial));
      }
    } catch {
      setNotifications([]);
    }
  }, [storageKey, role]);

  // Save changes to user storage
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(notifications));
    } catch {}
  }, [notifications, storageKey]);

  // Subscribe to live toast notifications
  useEffect(() => {
    const handleNewNotification: ToastCallback = (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setActiveToast(newNotif);
    };

    toastListeners.add(handleNewNotification);
    return () => {
      toastListeners.delete(handleNewNotification);
    };
  }, []);

  // Auto-dismiss toast after 6 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (filterType === 'ALL') return notifications;
    return notifications.filter((n) => n.type === filterType);
  }, [notifications, filterType]);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleItemClick = (n: AppNotification) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
    );
    setIsOpen(false);
    onNavigate(n.targetTab, n.targetSection);
  };

  const formatTimeAgo = (isoStr: string) => {
    try {
      const diffMs = Date.now() - new Date(isoStr).getTime();
      const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      if (mins < 60) {
        return lang === 'bn' ? `${toBanglaDigits(mins, 'bn')} মি. আগে` : `${mins}m ago`;
      }
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) {
        return lang === 'bn' ? `${toBanglaDigits(hrs, 'bn')} ঘণ্টা আগে` : `${hrs}h ago`;
      }
      const days = Math.floor(hrs / 24);
      return lang === 'bn' ? `${toBanglaDigits(days, 'bn')} দিন আগে` : `${days}d ago`;
    } catch {
      return '';
    }
  };

  // Guard: NEVER render notification center bell for unauthenticated public visitors
  if (!user || !token) {
    return null;
  }

  return (
    <>
      {/* 1. Header Bell Icon with Animated Unread Badge */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          aria-label={t('বিজ্ঞপ্তি ও নোটিফিকেশন', 'Live Notifications')}
          title={t('বিজ্ঞপ্তি ও নোটিফিকেশন', 'Live Notifications')}
        >
          <Bell className="w-4 h-4 text-slate-700" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-extrabold text-white shadow-xs animate-pulse">
              {lang === 'bn' ? toBanglaDigits(unreadCount) : unreadCount}
            </span>
          )}
        </button>

        {/* 2. Slide-Down / Dropdown Notification Center */}
        {isOpen && (
          <div className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#006A4E]/10 text-[#006A4E]">
                  <Bell className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {t('লাইভ নোটিফিকেশন হাব', 'Live Notification Hub')}
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    {unreadCount > 0
                      ? t(
                          `${toBanglaDigits(unreadCount)}টি অপঠিত বিজ্ঞপ্তি`,
                          `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}`
                        )
                      : t('সবগুলো বিজ্ঞপ্তি পঠিত', 'All alerts caught up')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="p-1 rounded-md text-slate-500 hover:bg-slate-200 hover:text-slate-800 text-[10px] font-bold transition cursor-pointer"
                    title={t('সবগুলো পঠিত হিসেবে চিহ্নিত করুন', 'Mark all read')}
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 bg-white text-[11px]">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`px-2.5 py-0.5 rounded-full font-bold transition cursor-pointer ${
                  filterType === 'ALL'
                    ? 'bg-[#006A4E] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t('সকল', 'All')} ({lang === 'bn' ? toBanglaDigits(notifications.length) : notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('ALERT')}
                className={`px-2.5 py-0.5 rounded-full font-bold transition cursor-pointer ${
                  filterType === 'ALERT'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t('জরুরি', 'Alerts')}
              </button>
              <button
                type="button"
                onClick={() => setFilterType('SUCCESS')}
                className={`px-2.5 py-0.5 rounded-full font-bold transition cursor-pointer ${
                  filterType === 'SUCCESS'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t('সফল বার্তা', 'Success')}
              </button>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {filteredNotifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <Bell className="w-8 h-8 mx-auto text-slate-300 mb-1.5 opacity-60" />
                  <p>{t('কোনো নতুন বিজ্ঞপ্তি নেই।', 'No notifications found.')}</p>
                </div>
              ) : (
                filteredNotifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`p-3.5 hover:bg-slate-50 transition cursor-pointer flex items-start gap-3 ${
                      !n.read ? 'bg-emerald-50/40' : ''
                    }`}
                  >
                    <span
                      className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        n.type === 'ALERT'
                          ? 'bg-rose-100 text-rose-700'
                          : n.type === 'WARNING'
                          ? 'bg-amber-100 text-amber-700'
                          : n.type === 'SUCCESS'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {n.type === 'ALERT' ? (
                        <ShieldAlert className="w-3.5 h-3.5" />
                      ) : n.type === 'WARNING' ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      ) : n.type === 'SUCCESS' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h5
                          className={`text-xs truncate ${
                            !n.read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'
                          }`}
                        >
                          {lang === 'bn' ? n.title_bn : n.title_en}
                        </h5>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                          {formatTimeAgo(n.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                        {lang === 'bn' ? n.message_bn : n.message_en}
                      </p>
                    </div>

                    {!n.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-2" />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 text-[10px]">
                {t('রিয়েল-টাইম লেজার ট্র্যাকার', 'Real-time Ledger Sync')}
              </span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-slate-500 hover:text-rose-600 font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>{t('সব মুছুন', 'Clear all')}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Floating In-App Toast Alert (Pops up on live events) */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl bg-white shadow-2xl border border-[#006A4E]/20 p-4 animate-in slide-in-from-bottom-5 duration-200 text-slate-800">
          <div className="flex items-start gap-3">
            <span
              className={`p-2 rounded-xl shrink-0 ${
                activeToast.type === 'ALERT'
                  ? 'bg-rose-100 text-rose-700'
                  : activeToast.type === 'WARNING'
                  ? 'bg-amber-100 text-amber-700'
                  : activeToast.type === 'SUCCESS'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-[#006A4E]/10 text-[#006A4E]'
              }`}
            >
              {activeToast.type === 'ALERT' ? (
                <ShieldAlert className="w-5 h-5" />
              ) : activeToast.type === 'WARNING' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : activeToast.type === 'SUCCESS' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                  {t('লাইভ নোটিফিকেশন', 'Live Alert')}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveToast(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <h4 className="font-extrabold text-xs text-slate-900 mt-1">
                {lang === 'bn' ? activeToast.title_bn : activeToast.title_en}
              </h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                {lang === 'bn' ? activeToast.message_bn : activeToast.message_en}
              </p>

              <div className="mt-2.5 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const tTab = activeToast.targetTab;
                    const tSec = activeToast.targetSection;
                    setActiveToast(null);
                    onNavigate(tTab, tSec);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#006A4E] hover:underline cursor-pointer"
                >
                  <span>{t('এখনই দেখুন', 'View now')}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
