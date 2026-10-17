import React, { useState, useEffect } from 'react';
import { useAppUI, UserRole, AuthUser } from '../i18n';
import { BhumiApi } from '../api/client';
import {
  ShieldCheck,
  QrCode,
  Search,
  HelpCircle,
  Contrast,
  Globe,
  WifiOff,
  Building2,
  Landmark,
  FileSpreadsheet,
  Lock,
  UserCheck,
  LogOut,
  LogIn,
  Home,
  Menu,
  Bell,
  ChevronRight,
  PhoneCall,
  Layers,
  LayoutDashboard,
  X,
  FileText,
  ShieldAlert,
  ArrowLeft,
  User,
  ChevronDown,
  Clock,
  GitCompareArrows,
  Scale,
  ListChecks,
  Calculator,
  KeyRound,
  CheckCircle2,
  Settings,
  AlertOctagon,
  Sparkles
} from 'lucide-react';

interface LayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

const ROLE_DASHBOARD_MAP: Record<UserRole, string> = {
  citizen: 'home',
  service_point_operator: 'home',
  sub_registrar: 'registrar',
  registry_data_officer: 'registrar',
  ac_land: 'acland',
  land_office_assistant: 'acland',
  field_verification_officer: 'acland',
  settlement_records_officer: 'acland',
  settlement_checker: 'acland',
  uno_supervisor: 'acland',
  appellate_reviewer: 'acland',
  bank_officer: 'bank',
  bank_manager: 'bank',
  support_agent: 'admin',
  platform_moderator: 'admin',
  content_editor: 'admin',
  content_approver: 'admin',
  system_admin: 'admin',
  auditor: 'admin',
  admin: 'admin',
};

const ROLE_META: Record<
  UserRole,
  { titleBn: string; titleEn: string; deptBn: string; deptEn: string }
> = {
  citizen: {
    titleBn: 'নাগরিক ভূমি পোর্টাল',
    titleEn: 'Citizen Land Portal',
    deptBn: 'নাগরিক সেবা ও ভূমি সুরক্ষা ভল্ট',
    deptEn: 'Citizen Property Vault & Verification',
  },
  service_point_operator: {
    titleBn: 'সার্ভিস পয়েন্ট অপারেটর (ইউডিসি)',
    titleEn: 'Service Point Operator (UDC)',
    deptBn: 'ইউনিয়ন ডিজিটাল সেন্টার • নাগরিক সহায়তা ডেস্ক',
    deptEn: 'Union Digital Center • Citizen Assistance Desk',
  },
  sub_registrar: {
    titleBn: 'সাব-রেজিস্ট্রার প্যানেল',
    titleEn: 'Sub-Registrar Panel',
    deptBn: 'নিবন্ধন অধিদপ্তর • আইন মন্ত্রণালয়',
    deptEn: 'Directorate of Registration • Ministry of Law',
  },
  registry_data_officer: {
    titleBn: 'রেজিস্ট্রি ডাটা এন্ট্রি অফিসার',
    titleEn: 'Registry Data Entry Officer',
    deptBn: 'সাব-রেজিস্ট্রি রেকর্ড প্রস্তুতকরণ সেল',
    deptEn: 'Sub-Registry Record Staging Cell',
  },
  ac_land: {
    titleBn: 'সহকারী কমিশনার (ভূমি) প্যানেল',
    titleEn: 'AC Land Panel',
    deptBn: 'উপজেলা ভূমি অফিস • ভূমি মন্ত্রণালয়',
    deptEn: 'Upazila Land Office • Ministry of Land',
  },
  land_office_assistant: {
    titleBn: 'উপজেলা ভূমি সহকারী (মেকার)',
    titleEn: 'Land Office Assistant',
    deptBn: 'উপজেলা ভূমি অফিস • নামজারি প্রক্রিয়াকরণ সেল',
    deptEn: 'Upazila Land Office • Mutation Processing Cell',
  },
  field_verification_officer: {
    titleBn: 'ফিল্ড ভেরিফিকেশন অফিসার (সার্ভেয়ার)',
    titleEn: 'Field Verification Officer',
    deptBn: 'ইউনিয়ন ভূমি অফিস • দখল ও এলডি ট্যাক্স যাচাই',
    deptEn: 'Union Land Office • Possession & LD Tax Verification',
  },
  settlement_records_officer: {
    titleBn: 'সেটেলমেন্ট রেকর্ডস অফিসার',
    titleEn: 'Settlement Records Officer',
    deptBn: 'ভূমি রেকর্ড ও জরিপ অধিদপ্তর (ডিএলআরএস)',
    deptEn: 'Directorate of Land Records & Surveys (DLRS)',
  },
  settlement_checker: {
    titleBn: 'সহকারী সেটেলমেন্ট অফিসার (জরিপ চেকার)',
    titleEn: 'Assistant Settlement Officer',
    deptBn: 'ভূমি রেকর্ড ও জরিপ অধিদপ্তর • গেজেট প্রকাশ অনুমোদন',
    deptEn: 'DLRS • Survey Gazette Verification',
  },
  uno_supervisor: {
    titleBn: 'উপজেলা নির্বাহী কর্মকর্তা (তদারককারী)',
    titleEn: 'UNO Supervisor',
    deptBn: 'উপজেলা প্রশাসন • এসএলএ ও এসকেলেশন মনিটরিং',
    deptEn: 'Upazila Administration • SLA & Escalation Monitoring',
  },
  appellate_reviewer: {
    titleBn: 'আপিল কর্তৃপক্ষ (এডিসি রাজস্ব)',
    titleEn: 'Appellate Reviewer (ADC Rev)',
    deptBn: 'জেলা প্রশাসকের কার্যালয় • রাজস্ব আপিল শাখা',
    deptEn: 'Deputy Commissioner Office • Revenue Appeals Division',
  },
  bank_officer: {
    titleBn: 'ব্যাংক মর্টগেজ প্যানেল',
    titleEn: 'Bank Mortgage Panel',
    deptBn: 'তফসিলি বাণিজ্যিক ব্যাংক জামানত ও লিয়েন শাখা',
    deptEn: 'Commercial Bank Collateral & Lien Division',
  },
  bank_manager: {
    titleBn: 'ব্যাংক শাখা ব্যবস্থাপক',
    titleEn: 'Bank Branch Manager',
    deptBn: 'তফসিলি ব্যাংক ঋণ অবমুক্তকরণ ও এনওসি অনুমোদন',
    deptEn: 'Scheduled Bank Lien Release & Final NOC Approval',
  },
  support_agent: {
    titleBn: 'সাপোর্ট এজেন্ট (১৬১২২ হেল্পলাইন)',
    titleEn: 'Support Agent (16122 Helpline)',
    deptBn: 'জাতীয় কল সেন্টার ও নাগরিক অভিযোগ ট্রায়াজ',
    deptEn: 'National Call Center & GRS Citizen Support',
  },
  platform_moderator: {
    titleBn: 'প্ল্যাটফর্ম মডারেটর',
    titleEn: 'Platform Moderator',
    deptBn: 'ভূমি ক্রয়-বিক্রয় তালিকা ও ফ্রড মনিটরিং',
    deptEn: 'Public Land Marketplace & Fraud Oversight',
  },
  content_editor: {
    titleBn: 'কনটেন্ট এডিটর',
    titleEn: 'Content Editor',
    deptBn: 'আইনি ও সচেতনতামূলক প্রকাশনা ডেস্ক',
    deptEn: 'Legal & Educational Content Publishing Desk',
  },
  content_approver: {
    titleBn: 'কনটেন্ট অ্যাপ্রুভার',
    titleEn: 'Content Approver',
    deptBn: 'ভূমি তথ্য ও গণযোগাযোগ উইং',
    deptEn: 'Land Information & Public Communications Wing',
  },
  system_admin: {
    titleBn: 'সিস্টেম অ্যাডমিন প্যানেল',
    titleEn: 'System Admin Panel',
    deptBn: 'আইটি অবকাঠামো ও ক্রিপ্টোগ্রাফিক কী গভর্নেন্স',
    deptEn: 'IT Infrastructure & Key Governance',
  },
  auditor: {
    titleBn: 'জাতীয় অডিট ও লেজার নিরীক্ষক',
    titleEn: 'National Ledger Auditor',
    deptBn: 'ক্রিপ্টোগ্রাফিক লেজার নিরীক্ষা ও ব্রেক-গ্লাস অডিট',
    deptEn: 'Cryptographic Ledger Audit & Break-Glass Inspection',
  },
  admin: {
    titleBn: 'জাতীয় অ্যাডমিন ও গভর্ন্যান্স প্যানেল',
    titleEn: 'National Admin & Governance Panel',
    deptBn: 'কেন্দ্রীয় ক্রিপ্টোগ্রাফিক লেজার ও সিস্টেম গভর্ন্যান্স',
    deptEn: 'Central Cryptographic Ledger Governance & Security',
  },
};


interface UserProfileMenuProps {
  user: AuthUser;
  role: UserRole;
  isSuperAdminMode?: boolean;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  onReturnToSuperAdmin?: () => void;
  t: (bn: string, en: string) => string;
  lang: 'bn' | 'en';
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  user,
  role,
  isSuperAdminMode,
  onNavigate,
  onLogout,
  onReturnToSuperAdmin,
  t,
  lang,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const avatarChar = React.useMemo(() => {
    if (user.full_name_bn && user.full_name_bn.trim().length > 0) {
      return user.full_name_bn.trim().charAt(0);
    }
    if (user.full_name_en && user.full_name_en.trim().length > 0) {
      return user.full_name_en.trim().charAt(0).toUpperCase();
    }
    return user.username ? user.username.charAt(0).toUpperCase() : 'U';
  }, [user]);

  const roleMeta = ROLE_META[user.role] || ROLE_META['citizen'];
  const roleTitle = lang === 'bn' ? roleMeta.titleBn : roleMeta.titleEn;

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-9 pl-1.5 pr-2.5 rounded-full border transition-all flex items-center gap-2 cursor-pointer shadow-2xs select-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
          isOpen
            ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-400'
        }`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={t('ব্যবহারকারী প্রোফাইল ও সেটিংস মেনু', 'User profile and settings menu')}
      >
        {/* Avatar Circle with Online Dot */}
        <div className="relative flex items-center justify-center shrink-0">
          <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-tr from-[#006A4E] to-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
            {avatarChar}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
        </div>

        {/* User Info (hidden on mobile, visible on sm+) */}
        <div className="hidden sm:flex flex-col text-left leading-none max-w-[110px] md:max-w-[140px]">
          <span className="text-xs font-bold text-slate-800 truncate">
            {user.full_name_bn || user.username}
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold truncate mt-0.5">
            {roleTitle}
          </span>
        </div>

        {/* Animated Chevron */}
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-700' : ''
          }`}
        />
      </button>

      {/* Profile Dropdown Menu Widget */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150"
          role="menu"
          aria-orientation="vertical"
        >
          {/* User Header Profile Card */}
          <div className="bg-gradient-to-br from-emerald-50/90 via-slate-50 to-white p-4 border-b border-slate-100">
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full bg-[#006A4E] text-white flex items-center justify-center font-bold text-base shadow-sm ring-2 ring-emerald-200/60">
                  {avatarChar}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-slate-900 truncate">
                  {user.full_name_bn || user.full_name_en || user.username}
                </h4>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {roleTitle}
                  </span>
                  {user.username && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      @{user.username}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Identity & Office Metadata */}
            {(user.nid_mock || user.office_name) && (
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 space-y-1 text-[11px] text-slate-600">
                {user.nid_mock && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{t('এনআইডি নম্বর', 'NID Number')}:</span>
                    <span className="font-mono font-semibold text-slate-700">{user.nid_mock}</span>
                  </div>
                )}
                {user.office_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{t('দপ্তর / অফিস', 'Office')}:</span>
                    <span className="font-medium text-slate-700 truncate max-w-[160px]">{user.office_name}</span>
                  </div>
                )}
              </div>
            )}

            {/* Cryptographic Session Badge */}
            <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/70">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{t('জাতীয় লেজার অনুমোদিত সুরক্ষিত সেশন', 'National Ledger Verified Session')}</span>
            </div>
          </div>

          {/* Quick Navigation Items */}
          <div className="p-1.5 space-y-1 text-xs">
            {/* 1. Workspace / Role Dashboard */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate(ROLE_DASHBOARD_MAP[user.role] || 'home');
              }}
              className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left hover:bg-emerald-50/70 text-slate-800 hover:text-emerald-900 transition group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#006A4E] flex items-center justify-center shrink-0 group-hover:bg-[#006A4E] group-hover:text-white transition">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-800 group-hover:text-emerald-900">
                  {t('আমার ওয়ার্কস্পেস', 'My Workspace')}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {roleTitle}
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition" />
            </button>

            {/* 2. Profile Settings */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate('profile');
              }}
              className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left hover:bg-slate-50 text-slate-800 transition group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-800">
                  {t('প্রোফাইল সেটিংস', 'Profile Settings')}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {t('ব্যক্তিগত তথ্য ও নিরাপত্তা', 'Personal info & security')}
                </div>
              </div>
            </button>

            {/* 3. Public Services / Citizen Portal */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate('landing');
              }}
              className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left hover:bg-slate-50 text-slate-800 transition group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition">
                <Home className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-800">
                  {t('পাবলিক পোর্টাল', 'Public Portal')}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {t('সার্ভিস হোম ও তথ্য ভল্ট', 'Home & Public Services')}
                </div>
              </div>
            </button>

            {/* 4. If in Super Admin Oversight, Return button */}
            {isSuperAdminMode && onReturnToSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onReturnToSuperAdmin();
                }}
                className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left bg-amber-50 hover:bg-amber-100 text-amber-900 transition group cursor-pointer border border-amber-200/60"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-amber-950">
                    {t('সুপার অ্যাডমিনে ফিরুন', 'Return to Super Admin')}
                  </div>
                  <div className="text-[10px] text-amber-700 truncate">
                    {t('পর্যবেক্ষণ সমাপ্ত করুন', 'Exit oversight mode')}
                  </div>
                </div>
              </button>
            )}

            {/* 5. Help & Guidelines */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate('help');
              }}
              className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left hover:bg-slate-50 text-slate-800 transition group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-800">
                  {t('সহায়িকা ও এফএকিউ', 'Help & FAQ')}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {t('ভূমি সুরক্ষা নির্দেশিকা', 'BhumiShield Guidelines')}
                </div>
              </div>
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Sign Out Action */}
          <div className="p-1.5">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onLogout();
                onNavigate('landing');
              }}
              className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left hover:bg-red-50 text-red-600 hover:text-red-700 transition group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition">
                <LogOut className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm">
                  {t('লগআউট করুন', 'Sign Out')}
                </div>
                <div className="text-[10px] text-red-500/80">
                  {t('সেশন সমাপ্ত করে প্রস্থান করুন', 'Safely end active session')}
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface DropdownItemConfig {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  badge?: string;
  onClick: () => void;
  isActive?: boolean;
}

interface PublicNavDropdownProps {
  id: string;
  label: string;
  icon?: React.ReactNode;
  activeChildIds: string[];
  activeTab: string;
  items: DropdownItemConfig[];
  openDropdown: string | null;
  setOpenDropdown: (id: string | null) => void;
  navTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  t: (bn: string, en: string) => string;
}

export const PublicNavDropdown: React.FC<PublicNavDropdownProps> = ({
  id,
  label,
  icon,
  activeChildIds,
  activeTab,
  items,
  openDropdown,
  setOpenDropdown,
  navTimerRef,
  t,
}) => {
  const isOpen = openDropdown === id;
  const isGroupActive = activeChildIds.includes(activeTab);

  const handleMouseEnter = () => {
    if (navTimerRef.current) {
      clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }
    setOpenDropdown(id);
  };

  const handleMouseLeave = () => {
    if (navTimerRef.current) {
      clearTimeout(navTimerRef.current);
    }
    navTimerRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 180);
  };

  const handleClickToggle = () => {
    if (navTimerRef.current) {
      clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }
    setOpenDropdown(isOpen ? null : id);
  };

  return (
    <div
      data-nav-dropdown={id}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleClickToggle}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer min-h-[38px] select-none ${
          isGroupActive
            ? 'text-[#006A4E] bg-emerald-50 font-bold border border-emerald-200/80 shadow-2xs'
            : isOpen
            ? 'text-slate-900 bg-slate-100 font-bold'
            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80'
        }`}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${
            isOpen
              ? 'rotate-180 text-emerald-700'
              : isGroupActive
              ? 'text-emerald-700'
              : 'text-slate-400 group-hover:text-slate-600'
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1.5 w-80 sm:w-[340px] bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150 ring-1 ring-slate-900/5 text-slate-800"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="space-y-1">
            {items.map((item) => {
              const active = item.isActive;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    item.onClick();
                    setOpenDropdown(null);
                  }}
                  className={`group w-full p-2 rounded-xl text-left flex items-start gap-3 transition-colors cursor-pointer select-none ${
                    active
                      ? 'bg-emerald-50 text-emerald-950 font-semibold ring-1 ring-emerald-500/20'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                  role="menuitem"
                >
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${item.iconBg}`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-xs font-bold truncate ${
                          active ? 'text-[#006A4E]' : 'text-slate-800 group-hover:text-slate-900'
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/60 leading-none">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5 line-clamp-1">
                      {item.subtitle}
                    </p>
                  </div>
                  <ChevronRight
                    className={`w-3.5 h-3.5 shrink-0 self-center transition-transform ${
                      active
                        ? 'text-emerald-600 translate-x-0.5'
                        : 'text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const NavbarAndLayout: React.FC<LayoutProps> = ({
  activeTab,
  setActiveTab,
  children,
}) => {
  const {
    lang,
    setLang,
    increaseFont,
    decreaseFont,
    highContrast,
    toggleHighContrast,
    role,
    setRole,
    user,
    setUser,
    token,
    setToken,
    activeSubTab,
    setActiveSubTab,
    logout,
    t,
  } = useAppUI();

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const drawerCloseBtnRef = React.useRef<HTMLButtonElement>(null);
  const previousFocusedElementRef = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (mobileDrawerOpen) {
      previousFocusedElementRef.current = document.activeElement as HTMLElement;
      setTimeout(() => {
        drawerCloseBtnRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setMobileDrawerOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else if (previousFocusedElementRef.current) {
      previousFocusedElementRef.current.focus?.();
    }
  }, [mobileDrawerOpen]);

  useEffect(() => {
    const onOffline = () => setIsOffline(true);
    const onOnline = () => setIsOffline(false);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const [openNavDropdown, setOpenNavDropdown] = useState<string | null>(null);
  const navDropdownTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setOpenNavDropdown(null);
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (openNavDropdown) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-nav-dropdown]')) {
          setOpenNavDropdown(null);
        }
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenNavDropdown(null);
      }
    };
    if (openNavDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openNavDropdown]);

  const [isSuperAdminMode, setIsSuperAdminMode] = useState<boolean>(
    () => import.meta.env.DEV && localStorage.getItem('bs_superadmin_mode') === '1'
  );

  const handleSuperAdminDirectLogin = async (targetRole: UserRole) => {
    if (!import.meta.env.DEV) return;
    // Only permit if currently admin or in super admin oversight mode
    if (user?.role !== 'admin' && !isSuperAdminMode && role !== 'admin') {
      return;
    }
    const currentAdminToken = !isSuperAdminMode ? token : localStorage.getItem('bs_admin_original_token');
    try {
      const res = await BhumiApi.switchDemoRole(targetRole);
      if (res?.access_token && res?.user) {
        if (currentAdminToken) {
          localStorage.setItem('bs_admin_original_token', currentAdminToken);
        }
        localStorage.setItem('bs_superadmin_mode', '1');
        setIsSuperAdminMode(true);
        setToken(res.access_token);
        setUser(res.user);
        setRole(targetRole);
        setActiveTab(ROLE_DASHBOARD_MAP[targetRole] || 'home');
      }
    } catch (err: any) {
      console.error('Super Admin direct login failed', err);
      if (!isSuperAdminMode) {
        localStorage.removeItem('bs_admin_original_token');
        localStorage.removeItem('bs_superadmin_mode');
      }
      alert(lang === 'bn' ? 'সুপারভাইজার তত্ত্বাবধান রোল পরিবর্তনে ত্রুটি হয়েছে।' : 'Failed to switch supervisor oversight role.');
    }
  };

  const handleReturnToSuperAdmin = async () => {
    const originalAdminToken = localStorage.getItem('bs_admin_original_token');
    try {
      const res = await BhumiApi.switchDemoRole('admin');
      if (res?.access_token && res?.user) {
        setToken(res.access_token);
        setUser(res.user);
        setRole('admin');
      }
    } catch {
      if (originalAdminToken) {
        setToken(originalAdminToken);
      }
    } finally {
      localStorage.removeItem('bs_superadmin_mode');
      localStorage.removeItem('bs_admin_original_token');
      setIsSuperAdminMode(false);
      setRole('admin');
      setActiveTab('admin');
    }
  };

  const handleRoleChange = (newRole: UserRole, navigateToRole = true) => {
    if (user?.role === 'admin' || isSuperAdminMode) {
      handleSuperAdminDirectLogin(newRole);
      return;
    }
    if (navigateToRole) {
      setActiveTab(ROLE_DASHBOARD_MAP[newRole] || 'home');
    }
  };

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = globalSearch.trim().toUpperCase();
    if (!q) return;
    if (q.startsWith('DL-') || q.startsWith('DEED-') || q.startsWith('NOC-')) {
      sessionStorage.setItem('bs_pending_verify_search', q);
      setActiveTab('qr');
    } else {
      sessionStorage.setItem('bs_pending_check_search', q);
      setActiveTab('check');
    }
  };

  // Public pages accessible directly without officer sidebar layout
  const isPublicPage = ['landing', 'home', 'check', 'qr', 'help', 'auth', 'sale', 'notices', 'blog', 'map', 'offices'].includes(activeTab);
  const currentRoleMeta = ROLE_META[role] || ROLE_META['citizen'];

  const getRoleSidebarItems = () => {
    // 1. Citizen (Owner / Buyer / Heir)
    if (role === 'citizen') {
      return [
        { id: 'vault', label: t('আমার জমির ভল্ট (L0-L3)', 'My Land Vault (L0-L3)'), icon: <ShieldCheck className="w-4 h-4" /> },
        { id: 'transfers', label: t('১৩-ধাপের হস্তান্তর ট্র্যাকার', '13-Step Transfers'), icon: <Sparkles className="w-4 h-4" /> },
        { id: 'disputes', label: t('আপত্তি ও বিরোধ দাখিল', 'Dispute Objections'), icon: <AlertOctagon className="w-4 h-4" /> },
        { id: 'tickets', label: t('আমার সহায়তা টিকিট', 'Support Tickets'), icon: <FileText className="w-4 h-4" /> },
        { id: 'profile', label: t('প্রোফাইল সেটিংস', 'Profile Settings'), icon: <UserCheck className="w-4 h-4" /> },
      ];
    }
    // 2. Service Point Operator (UDC)
    if (role === 'service_point_operator') {
      return [
        { id: 'vault', label: t('নাগরিক সেবা ও ভল্ট ডেস্ক', 'Citizen Vault Desk'), icon: <ShieldCheck className="w-4 h-4" /> },
        { id: 'transfers', label: t('নাগরিকের পক্ষে হস্তান্তর', 'File Transfer on Behalf'), icon: <Sparkles className="w-4 h-4" /> },
        { id: 'tickets', label: t('নাগরিক টিকিট ডেস্ক', 'Citizen Ticket Desk'), icon: <FileText className="w-4 h-4" /> },
        { id: 'profile', label: t('অপারেটর প্রোফাইল', 'Operator Profile'), icon: <UserCheck className="w-4 h-4" /> },
      ];
    }
    // 3. Registry Data Officer (Maker)
    if (role === 'registry_data_officer') {
      return [
        { id: 'wizard', label: t('নতুন দলিল ড্রাফট এন্ট্রি (মেকার)', 'Draft Deed Entry (Maker)'), icon: <FileSpreadsheet className="w-4 h-4" /> },
        { id: 'fees', label: t('স্ট্যাম্প ডিউটি ও চালান হিসাব', 'Stamp Duty & Fees'), icon: <Calculator className="w-4 h-4" /> },
        { id: 'khatian', label: t('খতিয়ান ও দাগ অনুসন্ধান', 'Khatian & Dag Lookup'), icon: <Search className="w-4 h-4" /> },
        { id: 'deeds', label: t('জমা দেওয়া ড্রাফট কিউ', 'Submitted Drafts Queue'), icon: <ListChecks className="w-4 h-4" /> },
        { id: 'verifier', label: t('দলিল লেজার যাচাই', 'Deed Ledger Verifier'), icon: <QrCode className="w-4 h-4" /> },
      ];
    }
    // 4. Sub-Registrar (Checker Authority)
    if (role === 'sub_registrar') {
      return [
        { id: 'held', label: t('স্থগিত দলিল (HELD) কিউ', 'Held Deeds Queue'), icon: <ShieldAlert className="w-4 h-4" /> },
        { id: 'wizard', label: t('প্রাক-নিবন্ধন গেটকিপার', 'Pre-Reg Gatekeeper'), icon: <FileSpreadsheet className="w-4 h-4" /> },
        { id: 'deeds', label: t('দলিল রেজিস্টার রেকর্ড', 'Deeds Register'), icon: <ListChecks className="w-4 h-4" /> },
        { id: 'onboarding', label: t('অনবোর্ডিং ব্যাচ অনুমোদন', 'Approve Staging Batches'), icon: <Layers className="w-4 h-4" /> },
        { id: 'khatian', label: t('খতিয়ান পরম্পরা ও রেকর্ড', 'Khatian Lineage'), icon: <Search className="w-4 h-4" /> },
        { id: 'verifier', label: t('দলিল লেজার যাচাই', 'Deed Ledger Verifier'), icon: <QrCode className="w-4 h-4" /> },
        { id: 'fees', label: t('সরকারি শুল্ক ও ফি', 'Stamp Duty & Fees'), icon: <Calculator className="w-4 h-4" /> },
      ];
    }
    // 5. Land Office Assistant (Maker)
    if (role === 'land_office_assistant') {
      return [
        { id: 'mutations', label: t('নামজারি আবেদন কিউ (মেকার)', 'Process Mutation Queue (Maker)'), icon: <Clock className="w-4 h-4" /> },
        { id: 'khatians', label: t('ওয়ারিশ ও হিস্যা যাচাই', 'Heir & Share Verification'), icon: <GitCompareArrows className="w-4 h-4" /> },
        { id: 'explorer', label: t('খতিয়ান ও দাগ অনুসন্ধান', 'Khatian Explorer'), icon: <Search className="w-4 h-4" /> },
        { id: 'verifier', label: t('দলিল সত্যতা যাচাই', 'Verify Deed'), icon: <QrCode className="w-4 h-4" /> },
      ];
    }
    // 6. Field Verification Officer / Surveyor
    if (role === 'field_verification_officer') {
      return [
        { id: 'field_reports', label: t('মাঠ তদন্ত ও দখল যাচাই', 'Field Possession Inspection'), icon: <Search className="w-4 h-4" /> },
        { id: 'mutations', label: t('তদন্তাধীন নামজারি কিউ', 'Pending Verification Cases'), icon: <Clock className="w-4 h-4" /> },
        { id: 'explorer', label: t('মৌজা ও সীমানা নকশা', 'Cadastral Boundary Lookup'), icon: <Layers className="w-4 h-4" /> },
        { id: 'verifier', label: t('দলিল সত্যতা যাচাই', 'Verify Deed'), icon: <QrCode className="w-4 h-4" /> },
      ];
    }
    // 7. Settlement Records Officer (Maker)
    if (role === 'settlement_records_officer') {
      return [
        { id: 'survey_batches', label: t('জরিপ ব্যাচ এন্ট্রি (মেকার)', 'Survey Batch Entry (Maker)'), icon: <FileSpreadsheet className="w-4 h-4" /> },
        { id: 'khatians', label: t('সিএস-এসএ-আরএস-বিএস রূপান্তর', 'Survey Lineage Ingestion'), icon: <GitCompareArrows className="w-4 h-4" /> },
        { id: 'explorer', label: t('খতিয়ান ও দাগ অনুসন্ধান', 'Khatian Explorer'), icon: <Search className="w-4 h-4" /> },
        { id: 'verifier', label: t('দলিল সত্যতা যাচাই', 'Verify Deed'), icon: <QrCode className="w-4 h-4" /> },
      ];
    }
    // 8. Settlement Checker (Assistant Settlement Officer)
    if (role === 'settlement_checker') {
      return [
        { id: 'onboarding', label: t('জরিপ ব্যাচ অনুমোদন (চেকার)', 'Approve Survey Batches (Checker)'), icon: <CheckCircle2 className="w-4 h-4" /> },
        { id: 'khatians', label: t('খতিয়ান অখণ্ডতা ও গেজেট', 'Khatian Integrity & Gazette'), icon: <GitCompareArrows className="w-4 h-4" /> },
        { id: 'explorer', label: t('খতিয়ান ও দাগ অনুসন্ধান', 'Khatian Explorer'), icon: <Search className="w-4 h-4" /> },
        { id: 'verifier', label: t('দলিল সত্যতা যাচাই', 'Verify Deed'), icon: <QrCode className="w-4 h-4" /> },
      ];
    }
    // 9. UNO Supervisor
    if (role === 'uno_supervisor') {
      return [
        { id: 'sla_overview', label: t('উপজেলা এসএলএ পারফরম্যান্স', 'Upazila SLA Performance'), icon: <Clock className="w-4 h-4" /> },
        { id: 'mutations', label: t('নামজারি তদারকি কিউ', 'Mutation Oversight Queue'), icon: <ListChecks className="w-4 h-4" /> },
        { id: 'appeals', label: t('আপিল ও অভিযোগ মনিটরিং', 'Appeals & Dispute Monitoring'), icon: <Scale className="w-4 h-4" /> },
        { id: 'explorer', label: t('খতিয়ান ও দাগ অনুসন্ধান', 'Khatian Explorer'), icon: <Search className="w-4 h-4" /> },
      ];
    }
    // 10. Appellate Reviewer (ADC Revenue)
    if (role === 'appellate_reviewer') {
      return [
        { id: 'appeals', label: t('রাজস্ব আপিল ও ট্রাইব্যুনাল শুনানি', 'Revenue Appeals & Hearings'), icon: <Scale className="w-4 h-4" /> },
        { id: 'disputes', label: t('বিরোধ ট্রাইব্যুনাল রেকর্ডস', 'Dispute Tribunal Records'), icon: <AlertOctagon className="w-4 h-4" /> },
        { id: 'mutations', label: t('বিরোধপূর্ণ নামজারি রেকর্ড', 'Contested Mutations'), icon: <Clock className="w-4 h-4" /> },
        { id: 'explorer', label: t('খতিয়ান ও দাগ অনুসন্ধান', 'Khatian Explorer'), icon: <Search className="w-4 h-4" /> },
      ];
    }
    // 11. AC Land (Sole Mutation Decider Authority)
    if (role === 'ac_land') {
      return [
        { id: 'mutations', label: t('ই-মিউটেশন কিউ (অনুমোদন)', 'e-Mutation Queue (Approval)'), icon: <Clock className="w-4 h-4" /> },
        { id: 'khatians', label: t('খতিয়ান ও ওয়ারিশ সমন্বয়', 'Khatian Reconciliation'), icon: <GitCompareArrows className="w-4 h-4" /> },
        { id: 'disputes', label: t('বিরোধ ট্রাইব্যুনাল', 'Dispute Tribunal'), icon: <Scale className="w-4 h-4" /> },
        { id: 'onboarding', label: t('অনবোর্ডিং ব্যাচ অনুমোদন (চেকার)', 'Approve Staging Batches'), icon: <CheckCircle2 className="w-4 h-4" /> },
        { id: 'explorer', label: t('খতিয়ান ও দাগ অনুসন্ধান', 'Khatian Explorer'), icon: <Search className="w-4 h-4" /> },
        { id: 'verifier', label: t('দলিল সত্যতা যাচাই', 'Verify Deed'), icon: <QrCode className="w-4 h-4" /> },
      ];
    }
    // 12. Bank Officer (Lien Maker)
    if (role === 'bank_officer') {
      return [
        { id: 'new_lien', label: t('নতুন লিয়েন আবেদন (মেকার)', 'Prepare Loan Lien (Maker)'), icon: <Lock className="w-4 h-4" /> },
        { id: 'mortgages', label: t('লিয়েন ও জামানত রেজিস্টার', 'Active Mortgages'), icon: <Building2 className="w-4 h-4" /> },
        { id: 'khatian', label: t('জামানত খতিয়ান যাচাই', 'Collateral Khatian Check'), icon: <Search className="w-4 h-4" /> },
      ];
    }
    // 13. Bank Manager (Lien Checker & NOC Authority)
    if (role === 'bank_manager') {
      return [
        { id: 'mortgages', label: t('লিয়েন অনুমোদন কিউ (চেকার)', 'Approve Liens (Checker)'), icon: <Building2 className="w-4 h-4" /> },
        { id: 'noc', label: t('এনওসি (NOC) সনদপত্র জারি', 'Issue Release NOC Certificate'), icon: <FileText className="w-4 h-4" /> },
        { id: 'new_lien', label: t('নতুন লিয়েন অন্তর্ভুক্তি', 'Register New Lien'), icon: <Lock className="w-4 h-4" /> },
        { id: 'khatian', label: t('জামানত খতিয়ান যাচাই', 'Collateral Khatian Check'), icon: <Search className="w-4 h-4" /> },
      ];
    }
    // 14. Support Agent (Helpline 16122)
    if (role === 'support_agent') {
      return [
        { id: 'tickets', label: t('নাগরিক টিকিট কিউ ও ট্রায়াজ', 'Citizen Support Tickets'), icon: <FileText className="w-4 h-4" /> },
        { id: 'users', label: t('নাগরিক একাউন্ট অনুসন্ধান', 'Citizen Account Lookup'), icon: <UserCheck className="w-4 h-4" /> },
        { id: 'audit', label: t('সাপোর্ট অডিট ট্রেইল', 'Support Audit Log'), icon: <FileSpreadsheet className="w-4 h-4" /> },
      ];
    }
    // 15. Platform Moderator (Marketplace & Listings)
    if (role === 'platform_moderator') {
      return [
        { id: 'onboarding_appeals', label: t('অনবোর্ডিং ও আপিল ওভারসাইট', 'Onboarding & Appeals'), icon: <Scale className="w-4 h-4" /> },
        { id: 'catalogue', label: t('সার্ভিস ক্যাটালগ ও ফি', 'Service Directory & Fees'), icon: <Layers className="w-4 h-4" /> },
        { id: 'audit', label: t('মডারেশন অডিট লগ', 'Moderation Audit Trail'), icon: <FileSpreadsheet className="w-4 h-4" /> },
      ];
    }
    // 16. Content Editor
    if (role === 'content_editor') {
      return [
        { id: 'catalogue', label: t('সার্ভিস নির্দেশিকা ও তথ্য', 'Service Catalogue & Guides'), icon: <Layers className="w-4 h-4" /> },
        { id: 'settings', label: t('আইনি বিজ্ঞপ্তি ও কনফিগারেশন', 'Policy & Notice Settings'), icon: <Settings className="w-4 h-4" /> },
        { id: 'audit', label: t('পাবলিশিং অডিট লগ', 'Publishing Audit Log'), icon: <FileSpreadsheet className="w-4 h-4" /> },
      ];
    }
    // 17. Content Approver
    if (role === 'content_approver') {
      return [
        { id: 'settings', label: t('বিজ্ঞপ্তি প্রকাশনা অনুমোদন (সিল)', 'Approve Notices (QR Seal)'), icon: <CheckCircle2 className="w-4 h-4" /> },
        { id: 'catalogue', label: t('সার্ভিস ডিরেক্টরি প্রকাশনা', 'Publish Service Catalogue'), icon: <Layers className="w-4 h-4" /> },
        { id: 'audit', label: t('অনুমোদন অডিট লগ', 'Approver Audit Trail'), icon: <FileSpreadsheet className="w-4 h-4" /> },
      ];
    }
    // 18. Auditor
    if (role === 'auditor') {
      return [
        { id: 'ledger', label: t('ক্রিপ্টোগ্রাফিক লেজার অখণ্ডতা', 'Cryptographic Ledger Integrity'), icon: <ShieldCheck className="w-4 h-4" /> },
        { id: 'audit', label: t('ব্রেক-গ্লাস ও পিআইআই অডিট লগ', 'Security & Break-Glass Audit'), icon: <FileSpreadsheet className="w-4 h-4" /> },
        { id: 'rbac', label: t('রোল এখতিয়ার ম্যাট্রিক্স', 'Jurisdiction & Access Matrix'), icon: <KeyRound className="w-4 h-4" /> },
      ];
    }
    // 19. System Admin / Admin
    return [
      { id: 'ledger', label: t('ক্রিপ্টোগ্রাফিক লেজার ও অখণ্ডতা', 'Cryptographic Ledger'), icon: <ShieldCheck className="w-4 h-4" /> },
      { id: 'users', label: t('ইউজার ও রোল ব্যবস্থাপনা', 'Users & Access Control'), icon: <UserCheck className="w-4 h-4" /> },
      { id: 'audit', label: t('সিকিউরিটি অডিট ট্রেইল', 'Security Audit Trail'), icon: <FileSpreadsheet className="w-4 h-4" /> },
      { id: 'settings', label: t('জালিয়াতি প্রতিরোধ সেটিংস', 'Fraud Engine Policy'), icon: <Settings className="w-4 h-4" /> },
      { id: 'rbac', label: t('রোল পারমিশন ম্যাট্রিক্স', 'RBAC Matrix'), icon: <KeyRound className="w-4 h-4" /> },
      { id: 'onboarding_appeals', label: t('অনবোর্ডিং ও আপিল ওভারসাইট', 'Onboarding & Appeals'), icon: <Scale className="w-4 h-4" /> },
      { id: 'catalogue', label: t('সার্ভিস ও ফি ডিরেক্টরি', 'Service & Fees'), icon: <Layers className="w-4 h-4" /> },
      { id: 'direct_access', label: t('সুপার অ্যাডমিন তত্ত্বাবধান', 'Direct Role Oversight'), icon: <ShieldAlert className="w-4 h-4" /> },
    ];
  };

  const sidebarItems = getRoleSidebarItems();

  const superAdminOversightBanner = isSuperAdminMode ? (
    <div className="sticky top-0 z-50 bg-amber-400 text-slate-950 px-4 py-2 shadow-md flex flex-wrap items-center justify-between gap-2 border-b-2 border-amber-600">
      <div className="flex items-center gap-2 text-xs font-black">
        <span className="flex h-2.5 w-2.5 rounded-full bg-red-600 animate-ping" />
        <ShieldAlert className="w-4 h-4 text-slate-950 shrink-0" />
        <span>
          {t(
            `সুপার অ্যাডমিন নিরীক্ষা মোড: আপনি পাসওয়ার্ড ছাড়াই সরাসরি '${currentRoleMeta.titleBn}' ড্যাশবোর্ড পর্যবেক্ষণে রয়েছেন।`,
            `Super Admin Oversight Mode: Directly inspecting '${currentRoleMeta.titleEn}' without password.`
          )}
        </span>
      </div>
      <button
        onClick={handleReturnToSuperAdmin}
        className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-amber-300 text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs border border-amber-400/40"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>{t('সুপার অ্যাডমিনে ফিরুন ↩', 'Return to Super Admin ↩')}</span>
      </button>
    </div>
  ) : null;

  const roleSwitcher = (
    <div className="space-y-1">
      {(
        [
          { r: 'citizen' as UserRole, tab: 'home', label: t('নাগরিক ভল্ট (Citizen)', 'Citizen Vault') },
          { r: 'sub_registrar' as UserRole, tab: 'registrar', label: t('সাব-রেজিস্ট্রার (Law)', 'Sub-Registrar') },
          { r: 'ac_land' as UserRole, tab: 'acland', label: t('এসি ল্যান্ড (Land)', 'AC Land') },
          { r: 'bank_officer' as UserRole, tab: 'bank', label: t('ব্যাংক অফিসার (Bank)', 'Bank Officer') },
          { r: 'admin' as UserRole, tab: 'admin', label: t('সুপার অ্যাডমিন (Admin)', 'Super Admin') },
        ] as const
      ).map((rp) => {
        const active = role === rp.r && activeTab === rp.tab;
        return (
          <button
            key={rp.r}
            onClick={() => {
              setMobileDrawerOpen(false);
              handleSuperAdminDirectLogin(rp.r);
            }}
            className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer min-h-[38px] transition-colors ${
              active
                ? 'bg-amber-500/20 text-amber-300 border-l-2 border-amber-400 font-bold'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
            title={t('পাসওয়ার্ড ছাড়া সরাসরি লগইন করুন', 'Direct Login Without Password')}
          >
            <span className="truncate">{rp.label}</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>
        );
      })}
    </div>
  );

  // Clean Public Header & Layout (Modeled after bcc.zohirrayhan.com)
  if (isPublicPage) {
    const landServicesItems: DropdownItemConfig[] = [
      {
        id: 'check',
        label: t('জমি কেনার আগে যাচাই', 'Check Before Buy'),
        subtitle: t('মালিকানা, খতিয়ান চেইন ও লিয়েন ঝুঁকি বিশ্লেষণ', 'Title chain, ownership & legal liens'),
        icon: <Search className="w-4 h-4 text-emerald-700" />,
        iconBg: 'bg-emerald-100',
        badge: t('যাচাই', 'Verify'),
        onClick: () => setActiveTab('check'),
        isActive: activeTab === 'check',
      },
      {
        id: 'qr',
        label: t('দলিল QR কোড যাচাই', 'Verify Deed QR'),
        subtitle: t('Ed25519 ক্রিপ্টোগ্রাফিক ডিজিটাল সিল পরীক্ষা', 'Ed25519 cryptographic deed authenticity'),
        icon: <QrCode className="w-4 h-4 text-cyan-700" />,
        iconBg: 'bg-cyan-100',
        badge: t('নিবন্ধন', 'Secure'),
        onClick: () => setActiveTab('qr'),
        isActive: activeTab === 'qr',
      },
      {
        id: 'map',
        label: t('মৌজা ম্যাপ ও ডিজিটাল দাগ', 'Cadastral Mouza Map'),
        subtitle: t('ডিএলআরএস সিএস/এসএ/আরএস ও স্যাটেলাইট নকশা ভিউ', 'Interactive plot polygons & DLRS map view'),
        icon: <Layers className="w-4 h-4 text-indigo-700" />,
        iconBg: 'bg-indigo-100',
        badge: t('লাইভ নকশা', 'Live GIS'),
        onClick: () => setActiveTab('map'),
        isActive: activeTab === 'map',
      },
      {
        id: 'sale',
        label: t('জমির হাট (নিরাপদ বাজার)', 'Land Marketplace (Sale)'),
        subtitle: t('যাচাইকৃত ভেটিং সম্পন্ন সুরক্ষিত জমি ক্রয়-বিক্রয়', 'Verified fraud-free property listings'),
        icon: <Building2 className="w-4 h-4 text-amber-700" />,
        iconBg: 'bg-amber-100',
        onClick: () => setActiveTab('sale'),
        isActive: activeTab === 'sale',
      },
      {
        id: 'home',
        label: t('নাগরিক ভল্ট ও ড্যাশবোর্ড', 'Citizen Property Vault'),
        subtitle: t('আমার জমি, খতিয়ান ভল্ট ও ১৩-ধাপের হস্তান্তর ট্র্যাকার', 'My landholdings, khatians & 13-step tracker'),
        icon: <ShieldCheck className="w-4 h-4 text-[#006A4E]" />,
        iconBg: 'bg-emerald-100',
        badge: t('পোর্টাল', 'Portal'),
        onClick: () => setActiveTab('home'),
        isActive: activeTab === 'home',
      },
    ];

    const infoNoticesItems: DropdownItemConfig[] = [
      {
        id: 'notices',
        label: t('পাবলিক নোটিশ ও গেজেট', 'Public Notices & Gazettes'),
        subtitle: t('সরকারি ভূমি বিজ্ঞপ্তি, নিলাম ও আপত্তি আদেশ', 'Government land orders, auctions & notices'),
        icon: <Bell className="w-4 h-4 text-amber-700" />,
        iconBg: 'bg-amber-100',
        badge: t('গেজেট', 'Gazette'),
        onClick: () => setActiveTab('notices'),
        isActive: activeTab === 'notices',
      },
      {
        id: 'offices',
        label: t('দপ্তরসমূহ ও সেবা কেন্দ্র', 'Offices & Service Points'),
        subtitle: t('উপজেলা ভূমি অফিস ও সাব-রেজিস্ট্রি তালিকা', 'AC Land, Sub-Registry & UDC locator'),
        icon: <Landmark className="w-4 h-4 text-purple-700" />,
        iconBg: 'bg-purple-100',
        onClick: () => setActiveTab('offices'),
        isActive: activeTab === 'offices',
      },
      {
        id: 'blog',
        label: t('ভূমি আইন ও সচেতনতা ব্লগ', 'Land Legal Guide & Blog'),
        subtitle: t('নামজারি, রেজিস্ট্রেশন ও উত্তরাধিকার আইন গাইড', 'Mutation, inheritance laws & citizen guides'),
        icon: <FileText className="w-4 h-4 text-blue-700" />,
        iconBg: 'bg-blue-100',
        onClick: () => setActiveTab('blog'),
        isActive: activeTab === 'blog',
      },
    ];

    const helpSupportItems: DropdownItemConfig[] = [
      {
        id: 'help',
        label: t('ব্যবহারকারী সহায়িকা ও FAQ', 'Help Guide & FAQs'),
        subtitle: t('সচরাচর জিজ্ঞাসা, ভিডিও গাইড ও পরিভাষা কোষ', 'Frequently asked questions & land terminology'),
        icon: <HelpCircle className="w-4 h-4 text-emerald-700" />,
        iconBg: 'bg-emerald-100',
        badge: t('সহায়িকা', 'Guide'),
        onClick: () => setActiveTab('help'),
        isActive: activeTab === 'help',
      },
      {
        id: 'hotline',
        label: t('জাতীয় হেল্পলাইন ১৬১২২', 'National Hotline 16122'),
        subtitle: t('ভূমি সেবা ও নাগরিক সহায়তা সংক্রান্ত সার্বক্ষণিক কল সেন্টার', '24/7 Citizen land support toll-free hotline'),
        icon: <PhoneCall className="w-4 h-4 text-rose-700" />,
        iconBg: 'bg-rose-100',
        badge: t('টোল-ফ্রি', 'Toll-Free'),
        onClick: () => {
          window.location.href = 'tel:16122';
        },
        isActive: false,
      },
    ];

    return (
      <div className="min-h-screen flex flex-col bg-white text-slate-800 pb-28 lg:pb-0">
        {/* Top Accent Gradient Bar — Exactly like bcc.zohirrayhan.com */}
        <div className="h-1 bg-gradient-to-r from-emerald-700 via-emerald-600 to-amber-500" />

        {superAdminOversightBanner}

        {/* Clean Header Bar */}
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl xl:max-w-[1400px] items-center justify-between gap-2 px-4 sm:gap-4">
            {/* Logo and Brand Title (bcc.zohirrayhan.com style) */}
            <button
              onClick={() => setActiveTab('landing')}
              className="flex min-w-0 items-center gap-2.5 text-left cursor-pointer min-h-0 bg-transparent border-0 p-0"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#006A4E] text-sm font-bold text-white ring-4 ring-emerald-100">
                <span className="relative">
                  ভূ
                  <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-amber-400" />
                </span>
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm sm:text-base font-bold text-slate-900">
                  {t('ভূমি সুরক্ষা', 'BhumiShield')}
                </span>
                <span className="hidden truncate text-xs text-slate-500 xl:block">
                  {t('জাতীয় জমি ও দলিল নিরাপত্তা প্ল্যাটফর্ম', 'National Land & Deed Trust Platform')}
                </span>
              </span>
            </button>

            {/* Desktop Navigation Links with Dropdown Menus */}
            <nav className="hidden items-center justify-center gap-1 xl:gap-1.5 lg:flex flex-nowrap whitespace-nowrap" aria-label="প্রধান মেনু">
              {/* 1. All Services (Home) */}
              <button
                type="button"
                onClick={() => setActiveTab('landing')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer min-h-[38px] select-none ${
                  activeTab === 'landing'
                    ? 'text-[#006A4E] bg-emerald-50 font-bold border border-emerald-200/80 shadow-2xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Home className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{t('সকল সেবা', 'All Services')}</span>
              </button>

              {/* 2. Land & Deed Services Dropdown */}
              <PublicNavDropdown
                id="services"
                label={t('ভূমি ও দলিল সেবা', 'Land & Deed Services')}
                icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                activeChildIds={['check', 'qr', 'map', 'sale', 'home']}
                activeTab={activeTab}
                items={landServicesItems}
                openDropdown={openNavDropdown}
                setOpenDropdown={setOpenNavDropdown}
                navTimerRef={navDropdownTimerRef}
                t={t}
              />

              {/* 3. Information & Notices Dropdown */}
              <PublicNavDropdown
                id="info"
                label={t('তথ্য ও নোটিশ', 'Notices & Info')}
                icon={<Bell className="w-3.5 h-3.5 text-amber-600" />}
                activeChildIds={['notices', 'offices', 'blog']}
                activeTab={activeTab}
                items={infoNoticesItems}
                openDropdown={openNavDropdown}
                setOpenDropdown={setOpenNavDropdown}
                navTimerRef={navDropdownTimerRef}
                t={t}
              />

              {/* 4. Help & Support Dropdown */}
              <PublicNavDropdown
                id="help"
                label={t('সহায়িকা ও হেল্পলাইন', 'Help & Hotline')}
                icon={<HelpCircle className="w-3.5 h-3.5 text-emerald-600" />}
                activeChildIds={['help']}
                activeTab={activeTab}
                items={helpSupportItems}
                openDropdown={openNavDropdown}
                setOpenDropdown={setOpenNavDropdown}
                navTimerRef={navDropdownTimerRef}
                t={t}
              />

              {/* Quick Verify CTA Button */}
              <button
                type="button"
                onClick={() => setActiveTab('check')}
                className="hidden xl:inline-flex items-center gap-1.5 ml-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#006A4E] text-xs font-bold border border-emerald-200/90 transition-all cursor-pointer shadow-2xs"
                title={t('জমি কেনার আগে তাৎক্ষণিক যাচাই', 'Instant Plot Verification')}
              >
                <Search className="w-3.5 h-3.5 text-emerald-700" />
                <span>{t('জমি যাচাই', 'Verify Plot')}</span>
              </button>
            </nav>

            {/* Actions: Lang toggle, Contrast, Role Portal, Auth */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
                className="h-9 rounded-lg border border-gray-300 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                aria-label="Switch Language"
              >
                {lang === 'bn' ? 'EN' : 'বাং'}
              </button>

              <button
                onClick={toggleHighContrast}
                className="flex h-9 items-center justify-center rounded-lg border border-gray-300 px-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                title={t('উচ্চ কনট্রাস্ট', 'High Contrast')}
                aria-label={t('উচ্চ কনট্রাস্ট', 'High Contrast')}
              >
                <Contrast className="w-4 h-4" />
              </button>

              {user && token ? (
                <UserProfileMenu
                  user={user}
                  role={role}
                  isSuperAdminMode={isSuperAdminMode}
                  onNavigate={setActiveTab}
                  onLogout={logout}
                  onReturnToSuperAdmin={handleReturnToSuperAdmin}
                  t={t}
                  lang={lang}
                />
              ) : (
                <button
                  onClick={() => setActiveTab('auth')}
                  className="h-9 px-3.5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t('লগইন করুন', 'Sign In')}</span>
                </button>
              )}

              {/* Mobile Menu Hamburger */}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 hover:bg-slate-100 lg:hidden cursor-pointer"
                aria-label="Menu"
              >
                <Menu className="h-5 w-5 text-slate-700" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className={`flex-1 w-full ${activeTab === 'landing' || activeTab === 'map' || activeTab === 'home' ? '' : 'py-8 px-4 max-w-7xl mx-auto'}`}>{children}</main>

        {/* Clean Footer (bcc.zohirrayhan.com style, suppressed on map page which has its own map.land.gov.bd institutional footer) */}
        {activeTab !== 'map' && <InstitutionalFooter t={t} onNavigate={setActiveTab} />}

        {/* Mobile Slide-Over Drawer */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setMobileDrawerOpen(false)} />
            <aside className="relative w-72 max-w-[85vw] bg-slate-900 text-white flex flex-col h-full z-10 overflow-y-auto">
              <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#006A4E] text-xs font-bold text-white">
                    ভূ
                  </span>
                  <span className="font-bold text-sm">ভূমি সুরক্ষা</span>
                </div>
                <button
                  ref={drawerCloseBtnRef}
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label={t('মেনু বন্ধ করুন', 'Close navigation menu')}
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 py-4 px-3 space-y-4 overflow-y-auto">
                {/* 1. Primary Service */}
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      setActiveTab('landing');
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold text-left flex items-center gap-2.5 transition ${
                      activeTab === 'landing' ? 'bg-[#006A4E] text-white shadow-xs' : 'text-white/80 hover:bg-white/10'
                    }`}
                  >
                    <Home className="w-4 h-4 text-emerald-400" />
                    <span>{t('সকল সেবা ও হোম', 'All Services / Home')}</span>
                  </button>
                </div>

                {/* 2. Land & Deed Services Group */}
                <div className="pt-2 border-t border-white/10">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 px-3 mb-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t('ভূমি ও দলিল সেবা', 'Land & Deed Services')}</span>
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        setActiveTab('check');
                      }}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-semibold text-left flex items-center justify-between transition ${
                        activeTab === 'check' ? 'bg-white/15 text-white font-bold' : 'text-white/80 hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-emerald-400" />
                        <span>{t('জমি কেনার আগে যাচাই', 'Check Before Buy')}</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                    </button>
                    <button
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        setActiveTab('qr');
                      }}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-semibold text-left flex items-center justify-between transition ${
                        activeTab === 'qr' ? 'bg-white/15 text-white font-bold' : 'text-white/80 hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-cyan-400" />
                        <span>{t('দলিল QR কোড যাচাই', 'Verify Deed QR')}</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                    </button>
                    <button
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        setActiveTab('map');
                      }}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-semibold text-left flex items-center justify-between transition ${
                        activeTab === 'map' ? 'bg-white/15 text-white font-bold' : 'text-white/80 hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-400" />
                        <span>{t('মৌজা ম্যাপ ও ডিজিটাল দাগ', 'Cadastral Map')}</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                    </button>
                    <button
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        setActiveTab('sale');
                      }}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-semibold text-left flex items-center justify-between transition ${
                        activeTab === 'sale' ? 'bg-white/15 text-white font-bold' : 'text-white/80 hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-amber-400" />
                        <span>{t('জমির হাট (নিরাপদ বাজার)', 'Land Marketplace')}</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                    </button>
                    <button
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        setActiveTab('home');
                      }}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-semibold text-left flex items-center justify-between transition ${
                        activeTab === 'home' ? 'bg-white/15 text-white font-bold' : 'text-white/80 hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-emerald-400" />
                        <span>{t('নাগরিক ভল্ট ও ড্যাশবোর্ড', 'Citizen Vault & Transfers')}</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                    </button>
                  </div>
                </div>

                {/* 3. Information & Notices Group */}
                <div className="pt-2 border-t border-white/10">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 px-3 mb-1.5 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('তথ্য ও নোটিশ', 'Information & Notices')}</span>
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        setActiveTab('notices');
                      }}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-semibold text-left flex items-center justify-between transition ${
                        activeTab === 'notices' ? 'bg-white/15 text-white font-bold' : 'text-white/80 hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-amber-400" />
                        <span>{t('পাবলিক নোটিশ ও গেজেট', 'Public Notices & Gazettes')}</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                    </button>
                    <button
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        setActiveTab('offices');
                      }}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-semibold text-left flex items-center justify-between transition ${
                        activeTab === 'offices' ? 'bg-white/15 text-white font-bold' : 'text-white/80 hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-purple-400" />
                        <span>{t('দপ্তরসমূহ ও সেবা কেন্দ্র', 'Offices & Service Points')}</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                    </button>
                    <button
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        setActiveTab('blog');
                      }}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-semibold text-left flex items-center justify-between transition ${
                        activeTab === 'blog' ? 'bg-white/15 text-white font-bold' : 'text-white/80 hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <span>{t('ভূমি আইন ও সচেতনতা ব্লগ', 'Land Legal Guide & Blog')}</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                    </button>
                  </div>
                </div>

                {/* 4. Help & Support Group */}
                <div className="pt-2 border-t border-white/10">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 px-3 mb-1.5 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t('সহায়িকা ও যোগাযোগ', 'Help & Contact')}</span>
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        setActiveTab('help');
                      }}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-semibold text-left flex items-center justify-between transition ${
                        activeTab === 'help' ? 'bg-white/15 text-white font-bold' : 'text-white/80 hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-emerald-400" />
                        <span>{t('সহায়িকা ও পরিভাষা কোষ (FAQ)', 'Help & Glossary')}</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                    </button>
                    <a
                      href="tel:16122"
                      className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-left flex items-center justify-between text-white/80 hover:bg-white/5 transition"
                    >
                      <span className="flex items-center gap-2">
                        <PhoneCall className="w-4 h-4 text-rose-400" />
                        <span>{t('ভূমি হটলাইন ১৬১২২', 'Land Hotline 16122')}</span>
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                        {t('টোল-ফ্রি', 'Toll-Free')}
                      </span>
                    </a>
                    <button
                      type="button"
                      onClick={toggleHighContrast}
                      className="w-full px-3 py-2.5 rounded-lg text-xs font-semibold text-left flex items-center justify-between text-white/80 hover:bg-white/5 border border-white/10"
                    >
                      <span className="flex items-center gap-2">
                        <Contrast className="w-4 h-4 text-emerald-400" />
                        <span>{t('উচ্চ কনট্রাস্ট মোড', 'High Contrast Mode')}</span>
                      </span>
                      <span className="text-[10px] uppercase font-bold text-emerald-400">
                        {highContrast ? t('চালু', 'ON') : t('বন্ধ', 'OFF')}
                      </span>
                    </button>
                  </div>
                </div>

                {import.meta.env.DEV && (user?.role === 'admin' || isSuperAdminMode) && (
                  <div className="border-t border-white/10 pt-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 px-3 mb-2 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      {t('সুপার অ্যাডমিন ডাইরেক্ট এক্সেস', 'Super Admin Direct Access')}
                    </div>
                    {roleSwitcher}
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}

        {/* Mobile Bottom Dock (bcc.zohirrayhan.com style) */}
        <MobileBottomDock activeTab={activeTab} setActiveTab={setActiveTab} role={role} t={t} />
      </div>
    );
  }

  // Authenticated Role Portal Layout with Sidebar
  const renderSidebarNav = (onNavigate?: () => void) => (
    <>
      <div>
        {sidebarOpen && (
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
            {t('মেনু', 'Menu')}
          </div>
        )}
        <div className="space-y-1">
          {sidebarItems.map((item, idx) => {
            const isOfficerRole = role !== 'citizen';
            const isActive = isOfficerRole
              ? (activeSubTab ? activeSubTab === item.id : idx === 0)
              : activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate?.();
                  if (role === 'citizen') {
                    if (item.id === 'profile') {
                      setActiveTab('profile');
                    } else {
                      setActiveSubTab(item.id);
                      if (activeTab !== 'home') {
                        setActiveTab('home');
                      }
                    }
                  } else if (isOfficerRole) {
                    setActiveSubTab(item.id);
                    const expectedTab = ROLE_DASHBOARD_MAP[role] || 'home';
                    if (activeTab !== expectedTab) {
                      setActiveTab(expectedTab);
                    }
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={`w-full px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer min-h-[40px] ${
                  isActive
                    ? 'bg-[#006A4E] text-white shadow-xs'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.icon}
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>
      </div>
      {import.meta.env.DEV && (user?.role === 'admin' || isSuperAdminMode) && (
        <div className="pt-2 border-t border-slate-800">
          {sidebarOpen && (
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              {t('সুপার অ্যাডমিন ডাইরেক্ট এক্সেস', 'Super Admin Direct Access')}
            </div>
          )}
          {sidebarOpen && roleSwitcher}
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 pb-28 lg:pb-0">
      {/* Top Accent Gradient Line */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-700 via-emerald-600 to-amber-500 z-50" />

      {/* Desktop Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-[4.5rem]'
        } hidden md:flex flex-col bg-slate-900 text-white transition-all duration-200 shrink-0 z-30 border-r border-slate-800 pt-1`}
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800">
          <button
            onClick={() => setActiveTab('landing')}
            className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer min-h-0 bg-transparent border-0 p-0"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#006A4E] text-xs font-bold text-white ring-2 ring-emerald-500/30">
              ভূ
            </span>
            {sidebarOpen && (
              <div className="min-w-0">
                <div className="font-bold text-sm text-white truncate">ভূমি সুরক্ষা</div>
                <div className="text-[10px] text-slate-400 font-mono">BCC LandTech</div>
              </div>
            )}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
            title="Toggle Sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {sidebarOpen && (
          <div className="px-4 py-2.5 bg-slate-800/60 border-b border-slate-800 text-[11px]">
            <div className="font-bold text-emerald-400 truncate">
              {lang === 'bn' ? currentRoleMeta.titleBn : currentRoleMeta.titleEn}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {lang === 'bn' ? currentRoleMeta.deptBn : currentRoleMeta.deptEn}
            </div>
          </div>
        )}

        <nav aria-label="Sidebar Navigation" className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
          {renderSidebarNav()}
        </nav>

        {/* Footer in sidebar */}
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          {sidebarOpen ? (
            <>
              <button
                onClick={() => setActiveTab('landing')}
                className="hover:text-white flex items-center gap-1 cursor-pointer font-bold"
              >
                <Home className="w-3.5 h-3.5" />
                <span>{t('পাবলিক পোর্টাল', 'Public Portal')}</span>
              </button>
              {user && token ? (
                <button
                  onClick={() => {
                    logout();
                    setActiveTab('landing');
                  }}
                  className="hover:text-red-400 text-red-300 flex items-center gap-1 cursor-pointer font-bold"
                  title={t('লগআউট', 'Sign Out')}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t('লগআউট', 'Sign Out')}</span>
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab('auth')}
                  className="hover:text-emerald-300 text-emerald-400 flex items-center gap-1 cursor-pointer font-bold"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t('লগইন', 'Sign In')}</span>
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => setActiveTab('landing')}
              className="mx-auto hover:text-white cursor-pointer"
              title="Home"
            >
              <Home className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 pt-1">
        {superAdminOversightBanner}
        {/* Top Navbar */}
        <header className="sticky top-1 z-20 h-16 bg-white/95 backdrop-blur border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="p-1.5 rounded-lg border border-slate-200 md:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>
            <button
              onClick={() => setActiveTab('landing')}
              className="text-xs font-bold text-[#006A4E] hover:underline flex items-center gap-1"
            >
              <Home className="w-3.5 h-3.5" />
              <span>{t('হোম', 'Home')}</span>
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-extrabold text-slate-800 truncate min-w-0">
              {lang === 'bn' ? currentRoleMeta.titleBn : currentRoleMeta.titleEn}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <form onSubmit={handleGlobalSearchSubmit} className="hidden sm:block relative">
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder={t('দাগ নং বা দলিল খুঁজুন...', 'Search plot or deed...')}
                className="w-48 lg:w-64 pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#006A4E]/30"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </form>

            <button
              onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
              className="h-8 px-2.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {lang === 'bn' ? 'EN' : 'বাং'}
            </button>

            <button
              onClick={toggleHighContrast}
              className="h-8 px-2 rounded-lg border border-slate-300 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
              title="Contrast"
            >
              <Contrast className="w-3.5 h-3.5" />
            </button>

            {user && token ? (
              <UserProfileMenu
                user={user}
                role={role}
                isSuperAdminMode={isSuperAdminMode}
                onNavigate={setActiveTab}
                onLogout={logout}
                onReturnToSuperAdmin={handleReturnToSuperAdmin}
                t={t}
                lang={lang}
              />
            ) : (
              <button
                onClick={() => setActiveTab('auth')}
                className="h-8 px-3 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t('লগইন', 'Sign In')}</span>
              </button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>

        {/* Clean Footer */}
        <InstitutionalFooter t={t} onNavigate={setActiveTab} />
      </div>

      {/* Mobile Slide-Over Drawer for Authenticated View */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setMobileDrawerOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-slate-900 text-white flex flex-col h-full z-10 overflow-y-auto">
            <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#006A4E] text-xs font-bold text-white">
                  ভূ
                </span>
                <span className="font-bold text-sm">ভূমি সুরক্ষা</span>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
              {renderSidebarNav(() => setMobileDrawerOpen(false))}
            </div>
          </aside>
        </div>
      )}

      {/* Mobile Bottom Navigation Dock */}
      <MobileBottomDock activeTab={activeTab} setActiveTab={setActiveTab} role={role} t={t} />
    </div>
  );
};

// Clean 4-Column Footer Matching bcc.zohirrayhan.com
const InstitutionalFooter: React.FC<{
  t: (bn: string, en: string) => string;
  onNavigate: (tab: string) => void;
}> = ({ t, onNavigate }) => (
  <footer className="mt-16 border-t border-gray-200 bg-white text-slate-700">
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
      {/* Col 1: Brand Info & Location */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#006A4E] text-sm font-bold text-white ring-4 ring-emerald-100">
            ভূ
          </span>
          <div>
            <span className="block font-bold text-slate-900 text-base">
              {t('ভূমি সুরক্ষা', 'BhumiShield')}
            </span>
            <span className="block text-xs text-slate-500">
              {t('ভূমি নিরাপত্তা ও ট্রাস্ট প্রোটোটাইপ', 'Land Registry Trust & Verification Prototype')}
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          {t(
            'ভূমি সুরক্ষা একটি স্বাধীন উদ্ভাবনী প্রোটোটাইপ (LandTech Hackathon 2026)। সরকারি সেবাসমূহ সংশ্লিষ্ট ভূমি অফিস ও নিবন্ধন অধিদপ্তরের অফিসিয়াল পোর্টালের আওতাধীন।',
            'BhumiShield is an independent LandTech 2026 innovation prototype. Official land services are governed by respective government portals.'
          )}
        </p>
        <div className="pt-1">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
            Ed25519 • SHA-256 Hash Chain
          </span>
        </div>
      </div>

      {/* Col 2: Services */}
      <div>
        <p className="mb-3 text-sm font-bold text-slate-900">{t('নাগরিক সেবাসমূহ', 'Services')}</p>
        <ul className="space-y-2 text-xs">
          <li>
            <button
              onClick={() => onNavigate('check')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('জমি কেনার আগে যাচাই', 'Check Before Buy')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate('sale')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('জমির হাট (নিরাপদ বিক্রয়)', 'Land Sale Marketplace')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate('map')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('ক্যাডাস্ট্রাল মৌজা ম্যাপ', 'Cadastral Mouza Map')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate('qr')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('দলিল QR কোড যাচাই', 'Verify Deed QR Code')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate('notices')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('অফিসিয়াল নোটিশবোর্ড', 'Official Noticeboard')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate('blog')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('ভূমি সাক্ষরতা ও আইন ব্লগ', 'Land Literacy Blog')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate('offices')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('দপ্তর ও সেবা কেন্দ্রসমূহ', 'Offices & Service Points')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate('home')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('নাগরিক ভল্ট ও বিক্রয় লক', 'Citizen Sale Lock Vault')}
            </button>
          </li>
        </ul>
      </div>

      {/* Col 3: Workspaces */}
      <div>
        <p className="mb-3 text-sm font-bold text-slate-900">{t('দাপ্তরিক প্যানেল', 'Workspaces')}</p>
        <ul className="space-y-2 text-xs">
          <li>
            <button
              onClick={() => onNavigate('registrar')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('সাব-রেজিস্ট্রার কনসোল', 'Sub-Registrar Panel')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate('acland')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('এসি ল্যান্ড ট্রাইব্যুনাল', 'AC Land Tribunal')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate('bank')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('ব্যাংক জামানত ও ডিজিটাল NOC', 'Bank Lien & NOC')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate('admin')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('জাতীয় লেজার ও RBAC অডিট', 'National Ledger & Audit')}
            </button>
          </li>
        </ul>
      </div>

      {/* Col 4: Support & Helpline */}
      <div>
        <p className="mb-3 text-sm font-bold text-slate-900">{t('সহায়তা ও যোগাযোগ', 'Support & Helpline')}</p>
        <ul className="space-y-2 text-xs">
          <li>
            <span className="font-bold text-[#006A4E]">
              {t('ভূমি সেবা কল সেন্টার: ১৬১২২', 'Land Service Call Center: 16122')}
            </span>
          </li>
          <li>
            <span className="text-slate-500 text-[11px] block">
              {t('ভূমি মন্ত্রণালয় (সরকারি সময়সূচী অনুযায়ী)', 'Ministry of Land (Official service hours)')}
            </span>
          </li>
          <li>
            <span className="text-slate-500">
              {t('অফিসিয়াল সেবার সময়সূচি দেখুন', 'Check official service hours')}
            </span>
          </li>
          <li>
            <button
              onClick={() => onNavigate('help')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('সাধারণ জিজ্ঞাসাসমূহ (FAQ)', 'Frequently Asked Questions')}
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate('help')}
              className="text-slate-600 hover:text-[#006A4E] cursor-pointer text-left"
            >
              {t('ভূমি ও জরিপ পরিভাষা কোষ', 'Bangladeshi Land Glossary')}
            </button>
          </li>
        </ul>
      </div>
    </div>

    {/* Bottom Copyright Bar */}
    <div className="border-t border-gray-100 py-4 text-center text-xs text-slate-500">
      {t(
        '© ২০২৬ ভূমি সুরক্ষা (BhumiShield) · LandTech Hackathon Innovation. সর্বস্বত্ব সংরক্ষিত।',
        '© 2026 BhumiShield · LandTech Hackathon Innovation. All rights reserved.'
      )}
    </div>
  </footer>
);

// Mobile Floating Bottom Dock Matching bcc.zohirrayhan.com
const MobileBottomDock: React.FC<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: UserRole;
  t: (bn: string, en: string) => string;
}> = ({ activeTab, setActiveTab, role, t }) => (
  <nav
    aria-label="দ্রুত নেভিগেশন"
    className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden print:hidden"
  >
    <div className="mx-auto flex max-w-lg items-stretch">
      <button
        onClick={() => setActiveTab('landing')}
        className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-bold cursor-pointer transition-colors ${
          activeTab === 'landing' ? 'text-[#006A4E]' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Home className="h-5 w-5" />
        <span className="truncate">{t('সেবাসমূহ', 'Home')}</span>
      </button>

      <button
        onClick={() => setActiveTab('check')}
        className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-bold cursor-pointer transition-colors ${
          activeTab === 'check' ? 'text-[#006A4E]' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Search className="h-5 w-5" />
        <span className="truncate">{t('যাচাই', 'Check')}</span>
      </button>

      {/* Center Floating Action Button (like bcc.zohirrayhan.com camera button) */}
      <div className="flex flex-1 justify-center">
        <button
          onClick={() => setActiveTab('qr')}
          className="relative -mt-5 flex flex-col items-center cursor-pointer group"
          title="QR Verify"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#006A4E] text-white shadow-lg ring-4 ring-white transition-transform group-hover:scale-105 active:scale-95">
            <QrCode className="h-6 w-6" />
          </span>
          <span className="text-[10px] font-bold text-slate-700 mt-1">{t('দলিল QR', 'QR Scan')}</span>
        </button>
      </div>

      <button
        onClick={() => setActiveTab(ROLE_DASHBOARD_MAP[role])}
        className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-bold cursor-pointer transition-colors ${
          activeTab === ROLE_DASHBOARD_MAP[role] ? 'text-[#006A4E]' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <LayoutDashboard className="h-5 w-5" />
        <span className="truncate">{t('ভল্ট / প্যানেল', 'Panel')}</span>
      </button>

      <button
        onClick={() => setActiveTab('help')}
        className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-bold cursor-pointer transition-colors ${
          activeTab === 'help' ? 'text-[#006A4E]' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <HelpCircle className="h-5 w-5" />
        <span className="truncate">{t('সহায়তা', 'Help')}</span>
      </button>
    </div>
  </nav>
);
