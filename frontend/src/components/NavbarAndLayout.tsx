import React, { useState, useEffect } from 'react';
import { useAppUI, UserRole, AuthUser } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { NotificationCenter } from './NotificationCenter';
import { FaraizCalculatorModal } from './FaraizCalculatorModal';
import { BengaliPorchaOcrModal } from './BengaliPorchaOcrModal';
import { CitizenProblemTriageModal } from './CitizenProblemTriageModal';
import { CitizenProductTour } from './CitizenProductTour';
import { PublicShell } from './public/PublicShell';
import {
  ShieldCheck,
  QrCode,
  Search,
  HelpCircle,
  Globe,
  Building2,
  Landmark,
  LogOut,
  LogIn,
  Home,
  Menu,
  X,
  PhoneCall,
  LayoutDashboard,
  Calculator,
  ScanLine,
  FileCheck2,
  ChevronRight,
  ChevronDown,
  User,
  ArrowLeft,
  Compass,
  FileText,
  Scale,
  Sparkles,
  ExternalLink,
  FolderOpen,
  FileCheck,
  Settings,
  ChevronsUpDown,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSiteSettingsQuery } from './publicHooks';

export interface LayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

export const ROLE_DASHBOARD_MAP: Record<UserRole, string> = {
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
  dc_acquisition_officer: 'specialist',
  lawyer_court_user: 'specialist',
  admin: 'admin',
};

export const ROLE_META: Record<
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
    titleBn: 'উপজেলা নির্বাহী অফিসার (ইউএনও)',
    titleEn: 'Upazila Nirbahi Officer (UNO)',
    deptBn: 'উপজেলা প্রশাসন • রাজস্ব তত্ত্বাবধান উইং',
    deptEn: 'Upazila Administration • Revenue Supervision',
  },
  appellate_reviewer: {
    titleBn: 'অতিরিক্ত জেলা প্রশাসক (রাজস্ব)',
    titleEn: 'ADC Revenue (Appellate Reviewer)',
    deptBn: 'জেলা রাজস্ব ট্রাইব্যুনাল • আপিল শাখা',
    deptEn: 'District Revenue Tribunal • Appellate Division',
  },
  bank_officer: {
    titleBn: 'ব্যাংক ক্রেডিট ও মর্টগেজ সেল',
    titleEn: 'Bank Mortgage Credit Desk',
    deptBn: 'সোনালী ব্যাংক পিএলসি • সাভার শাখা',
    deptEn: 'Sonali Bank PLC • Savar Branch',
  },
  bank_manager: {
    titleBn: 'ব্যাংক শাখা ব্যবস্থাপক (লিয়েন রিলিজ)',
    titleEn: 'Bank Branch Manager (Lien Release)',
    deptBn: 'সোনালী ব্যাংক পিএলসি • প্রধান ঋণ শাখা',
    deptEn: 'Sonali Bank PLC • Credit Division',
  },
  support_agent: {
    titleBn: 'নাগরিক সহায়তা হেল্পডেস্ক',
    titleEn: 'Citizen Support Helpdesk',
    deptBn: '১৬১২২ সেন্ট্রাল কলসেন্টার সহায়তা ডেস্ক',
    deptEn: '16122 Central Call Center Support',
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
  dc_acquisition_officer: {
    titleBn: 'জেলা প্রশাসক কার্যালয় — ভূমি অধিগ্রহণ (LA) শাখা',
    titleEn: 'DC Land Acquisition Division',
    deptBn: 'জেলা প্রশাসন • ভূমি অধিগ্রহণ ও গেজেট উইং',
    deptEn: 'District Administration • Land Acquisition & Gazette Wing',
  },
  lawyer_court_user: {
    titleBn: 'দেওয়ানি আদালত ও আইনজীবী লিগ্যাল ডেস্ক',
    titleEn: 'Civil Court & Legal Counsel Portal',
    deptBn: 'বাংলাদেশ বার কাউন্সিল ও দেওয়ানি আদালত সহায়তা',
    deptEn: 'Bangladesh Bar Council & Civil Court Title Verification',
  },
};

export interface JudgePersona {
  role: UserRole;
  username: string;
  badgeBn: string;
  badgeEn: string;
  nameBn: string;
  nameEn: string;
  icon: string;
  route: string;
  color: string;
  userData: AuthUser;
}

export const JUDGE_PERSONAS: JudgePersona[] = [
  {
    role: 'citizen',
    username: 'citizen',
    badgeBn: 'নাগরিক',
    badgeEn: 'Citizen',
    nameBn: 'মো. রফিকুল ইসলাম',
    nameEn: 'Md. Rafiqul Islam',
    icon: '👤',
    route: 'home',
    color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    userData: {
      id: 1,
      username: 'citizen',
      full_name_bn: 'মো. রফিকুল ইসলাম',
      full_name_en: 'Md. Rafiqul Islam',
      role: 'citizen',
      nid: '9900001001',
      office_bn: 'নাগরিক পোর্টাল — সাভার, ঢাকা',
      is_active: 1,
      is_identity_verified: 1,
      is_profile_complete: 1,
    },
  },
  {
    role: 'sub_registrar',
    username: 'registrar',
    badgeBn: 'সাব-রেজিস্ট্রার',
    badgeEn: 'Sub-Registrar',
    nameBn: 'ফারহানা ইয়াসমিন',
    nameEn: 'Farhana Yasmin',
    icon: '📜',
    route: 'registrar',
    color: 'bg-blue-600 hover:bg-blue-700 text-white',
    userData: {
      id: 4,
      username: 'registrar',
      full_name_bn: 'ফারহানা ইয়াসমিন',
      full_name_en: 'Farhana Yasmin',
      role: 'sub_registrar',
      office_name: 'সাব-রেজিস্ট্রি কার্যালয়, সাভার',
      office_bn: 'সাব-রেজিস্ট্রি কার্যালয়, সাভার, ঢাকা',
      is_active: 1,
      is_identity_verified: 1,
    },
  },
  {
    role: 'ac_land',
    username: 'acland',
    badgeBn: 'এসি ল্যান্ড',
    badgeEn: 'AC Land',
    nameBn: 'তানভীর আহমেদ',
    nameEn: 'Tanvir Ahmed',
    icon: '🏛️',
    route: 'acland',
    color: 'bg-amber-600 hover:bg-amber-700 text-white',
    userData: {
      id: 6,
      username: 'acland',
      full_name_bn: 'তানভীর আহমেদ',
      full_name_en: 'Tanvir Ahmed',
      role: 'ac_land',
      office_name: 'উপজেলা ভূমি অফিস, সাভার',
      office_bn: 'উপজেলা ভূমি অফিস, সাভার, ঢাকা',
      is_active: 1,
      is_identity_verified: 1,
    },
  },
  {
    role: 'bank_officer',
    username: 'bank',
    badgeBn: 'ব্যাংক অফিসার',
    badgeEn: 'Bank Officer',
    nameBn: 'নাজমুল হাসান',
    nameEn: 'Nazmul Hasan',
    icon: '🏦',
    route: 'bank',
    color: 'bg-rose-600 hover:bg-rose-700 text-white',
    userData: {
      id: 13,
      username: 'bank',
      full_name_bn: 'নাজমুল হাসান',
      full_name_en: 'Nazmul Hasan',
      role: 'bank_officer',
      office_name: 'সোনালী ব্যাংক পিএলসি, সাভার শাখা',
      office_bn: 'সোনালী ব্যাংক পিএলসি, সাভার শাখা',
      is_active: 1,
      is_identity_verified: 1,
    },
  },
  {
    role: 'land_office_assistant',
    username: 'assistant',
    badgeBn: 'তহশিলদার',
    badgeEn: 'Tahsildar',
    nameBn: 'আবুল কালাম আজাদ',
    nameEn: 'Abul Kalam Azad',
    icon: '🌾',
    route: 'acland',
    color: 'bg-emerald-700 hover:bg-emerald-800 text-white',
    userData: {
      id: 7,
      username: 'assistant',
      full_name_bn: 'আবুল কালাম আজাদ',
      full_name_en: 'Abul Kalam Azad',
      role: 'land_office_assistant',
      office_name: 'বিরুলিয়া ইউনিয়ন ভূমি সহকারী কার্যালয়',
      office_bn: 'বিরুলিয়া ইউনিয়ন ভূমি সহকারী কার্যালয়, সাভার',
      is_active: 1,
      is_identity_verified: 1,
    },
  },
  {
    role: 'field_verification_officer',
    username: 'surveyor',
    badgeBn: 'ফিল্ড সার্ভেয়ার',
    badgeEn: 'Field Surveyor',
    nameBn: 'মো. রোকনুজ্জামান',
    nameEn: 'Md. Roknuzzaman',
    icon: '📐',
    route: 'acland',
    color: 'bg-teal-600 hover:bg-teal-700 text-white',
    userData: {
      id: 8,
      username: 'surveyor',
      full_name_bn: 'মো. রোকনুজ্জামান',
      full_name_en: 'Md. Roknuzzaman',
      role: 'field_verification_officer',
      office_name: 'উপজেলা সার্ভে ও ফিল্ড ইন্সপেকশন সেল',
      office_bn: 'উপজেলা সার্ভে ও ফিল্ড ইন্সপেকশন সেল, সাভার',
      is_active: 1,
      is_identity_verified: 1,
    },
  },
  {
    role: 'uno_supervisor',
    username: 'uno',
    badgeBn: 'ইউএনও (তদারককারী)',
    badgeEn: 'UNO Supervisor',
    nameBn: 'রাশেদুল হক চৌধুরী',
    nameEn: 'Rashedul Haque Chowdhury',
    icon: '⭐',
    route: 'acland',
    color: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    userData: {
      id: 11,
      username: 'uno',
      full_name_bn: 'রাশেদুল হক চৌধুরী',
      full_name_en: 'Rashedul Haque Chowdhury',
      role: 'uno_supervisor',
      office_name: 'উপজেলা নির্বাহী অফিসারের কার্যালয়, সাভার',
      office_bn: 'উপজেলা নির্বাহী অফিসারের কার্যালয়, সাভার, ঢাকা',
      is_active: 1,
      is_identity_verified: 1,
    },
  },
  {
    role: 'appellate_reviewer',
    username: 'adc',
    badgeBn: 'এডিসি রাজস্ব',
    badgeEn: 'ADC Revenue',
    nameBn: 'কাজী মাহমুদ হাসান',
    nameEn: 'Kazi Mahmud Hasan',
    icon: '⚖️',
    route: 'acland',
    color: 'bg-violet-600 hover:bg-violet-700 text-white',
    userData: {
      id: 12,
      username: 'adc',
      full_name_bn: 'কাজী মাহমুদ হাসান',
      full_name_en: 'Kazi Mahmud Hasan',
      role: 'appellate_reviewer',
      office_name: 'জেলা রাজস্ব ট্রাইব্যুনাল • জেলা প্রশাসন',
      office_bn: 'জেলা রাজস্ব ট্রাইব্যুনাল • জেলা প্রশাসকের কার্যালয়, ঢাকা',
      is_active: 1,
      is_identity_verified: 1,
    },
  },
  {
    role: 'dc_acquisition_officer',
    username: 'dc_la',
    badgeBn: 'ভূমি অধিগ্রহণ (LA)',
    badgeEn: 'LA Officer',
    nameBn: 'মো. আনিসুর রহমান',
    nameEn: 'Md. Anisur Rahman',
    icon: '🏗️',
    route: 'specialist',
    color: 'bg-cyan-700 hover:bg-cyan-800 text-white',
    userData: {
      id: 17,
      username: 'dc_la',
      full_name_bn: 'মো. আনিসুর রহমান',
      full_name_en: 'Md. Anisur Rahman',
      role: 'dc_acquisition_officer',
      office_name: 'জেলা প্রশাসন — ভূমি অধিগ্রহণ শাখা, ঢাকা',
      office_bn: 'জেলা প্রশাসন — ভূমি অধিগ্রহণ শাখা, ঢাকা',
      is_active: 1,
      is_identity_verified: 1,
    },
  },
  {
    role: 'lawyer_court_user',
    username: 'advocate',
    badgeBn: 'আইনজীবী (দেওয়ানি)',
    badgeEn: 'Advocate',
    nameBn: 'ব্যারিস্টার মাহবুবুল আলম',
    nameEn: 'Barrister Mahbubul Alam',
    icon: '⚖️',
    route: 'lawyer',
    color: 'bg-slate-700 hover:bg-slate-800 text-white',
    userData: {
      id: 18,
      username: 'advocate',
      full_name_bn: 'ব্যারিস্টার মাহবুবুল আলম',
      full_name_en: 'Barrister Mahbubul Alam',
      role: 'lawyer_court_user',
      office_name: 'ঢাকা জেলা জজ কোর্ট বার অ্যাসোসিয়েশন',
      office_bn: 'ঢাকা জেলা জজ কোর্ট বার অ্যাসোসিয়েশন',
      is_active: 1,
      is_identity_verified: 1,
    },
  },
  {
    role: 'admin',
    username: 'admin',
    badgeBn: 'সুপার অ্যাডমিন',
    badgeEn: 'Super Admin',
    nameBn: 'ভূমি সুরক্ষা অ্যাডমিন',
    nameEn: 'BhumiShield System Admin',
    icon: '🛡️',
    route: 'admin',
    color: 'bg-purple-600 hover:bg-purple-700 text-white',
    userData: {
      id: 19,
      username: 'admin',
      full_name_bn: 'ভূমি সুরক্ষা অ্যাডমিন',
      full_name_en: 'BhumiShield System Admin',
      role: 'admin',
      office_name: 'কেন্দ্রীয় সিস্টেম গভর্ন্যান্স ও কনফিগারেশন সেল',
      office_bn: 'জাতীয় ডেটা সেন্টার • ভূমি মন্ত্রণালয়',
      is_active: 1,
      is_identity_verified: 1,
    },
  },
];

// Helper to check if current tab is a public discovery page
export const isPublicTab = (tab: string): boolean => {
  const publicTabs = [
    'landing',
    'check',
    'qr',
    'map',
    'cadastral',
    'sale',
    'notices',
    'blog',
    'offices',
    'help',
    'auth',
    'notfound',
  ];
  return publicTabs.includes(tab);
};

export const NavbarAndLayout: React.FC<LayoutProps> = ({
  activeTab,
  setActiveTab,
  children,
}) => {
  const { user, role, setUser, setRole, lang, setLang, logout, t, activeSubTab, setActiveSubTab } = useAppUI();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [faraizOpen, setFaraizOpen] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  // Global listener for opening citizen service guide & interactive tour
  useEffect(() => {
    const handleOpenGuide = () => setTourOpen(true);
    const handleStartTour = () => setTourOpen(true);
    window.addEventListener('open-citizen-guide', handleOpenGuide);
    window.addEventListener('start-citizen-tour', handleStartTour);
    return () => {
      window.removeEventListener('open-citizen-guide', handleOpenGuide);
      window.removeEventListener('start-citizen-tour', handleStartTour);
    };
  }, []);

  // Dynamic Public Navigation Links from Admin Settings
  const settingsQuery = useSiteSettingsQuery();
  const rawQuickLinks = settingsQuery.data?.settings?.quick_links_menu || settingsQuery.data?.map?.quick_links_menu;

  const publicQuickLinks = React.useMemo(() => {
    let list: any[] = [];
    if (Array.isArray(rawQuickLinks)) {
      list = rawQuickLinks;
    } else if (typeof rawQuickLinks === 'string') {
      try {
        const parsed = JSON.parse(rawQuickLinks);
        if (Array.isArray(parsed)) list = parsed;
      } catch {}
    }

    if (list.length > 0) {
      return list.filter((l: any) => l.is_active !== false);
    }

    // Default fallback to all 10 public pages
    return [
      { id: 'landing', label_bn: 'হোম', label_en: 'Home', target: 'landing' },
      { id: 'check', label_bn: 'জমি যাচাই', label_en: 'Check Land', target: 'check' },
      { id: 'qr', label_bn: 'দলিল স্ক্যান', label_en: 'Scan Deed', target: 'qr' },
      { id: 'map', label_bn: 'মৌজা নকশা', label_en: 'Mouza Map', target: 'map' },
      { id: 'sale', label_bn: 'নিরাপদ বাজার', label_en: 'Marketplace', target: 'sale' },
      { id: 'notices', label_bn: 'নোটিশবোর্ড', label_en: 'Noticeboard', target: 'notices' },
      { id: 'blog', label_bn: 'ভূমি সহায়িকা', label_en: 'Land Guides', target: 'blog' },
      { id: 'offices', label_bn: 'অফিস সন্ধান', label_en: 'Office Locator', target: 'offices' },
      { id: 'help', label_bn: 'সহায়তা (১৬১২২)', label_en: 'Help (16122)', target: 'help' },
      { id: 'auth', label_bn: 'লগইন / নিবন্ধন', label_en: 'Login / Register', target: 'auth' },
    ];
  }, [rawQuickLinks]);

  // Close mobile menu on tab change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeTab]);

  const handleLogout = () => {
    logout();
    setActiveTab('landing');
  };

  const isPublic = isPublicTab(activeTab);
  const userRoleMeta = role ? ROLE_META[role] || ROLE_META.citizen : ROLE_META.citizen;
  const isCitizenUser = role === 'citizen' || role === 'service_point_operator';
  const isCitizenPortalTab = ['home', 'applications', 'profile', 'settings'].includes(activeTab);
  const isFixedCitizenPortal = isCitizenUser || isCitizenPortalTab;

  const [cmdOpen, setCmdOpen] = useState(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // 1. PUBLIC VIEW LAYOUT: government-style public shell (components/public/PublicShell.tsx)
  if (isPublic) {
    return (
      <PublicShell activeTab={activeTab} setActiveTab={setActiveTab}>
        {children}
      </PublicShell>
    );
  }

  // 2. DASHBOARD VIEW LAYOUT: Modern shadcn / Linear-style Collapsible Sidebar + Header
  return (
    <div
      className={cn(
        "flex bg-slate-50/50 text-slate-900 font-sans",
        isFixedCitizenPortal
          ? "h-screen max-h-screen h-[100dvh] max-h-[100dvh] overflow-hidden"
          : "min-h-screen"
      )}
    >
      {/* Sleek Modern Left Sidebar */}
      <aside
        className={cn(
          sidebarCollapsed ? 'w-20' : 'w-64',
          'hidden md:flex flex-col bg-white border-r border-slate-200/80 transition-all duration-300 shrink-0 z-30',
          isFixedCitizenPortal ? 'h-full max-h-full overflow-hidden' : 'sticky top-0 h-screen'
        )}
      >
        {/* Brand Bar */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200/80 shrink-0">
          <button
            onClick={() => setActiveTab('landing')}
            className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#006A4E] to-emerald-600 flex items-center justify-center text-white font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
              ভূ
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <div className="font-black text-sm text-slate-900 truncate">ভূমি সুরক্ষা</div>
                <div className="text-[10px] text-emerald-700 font-semibold truncate flex items-center gap-1">
                  <span>{userRoleMeta.titleBn}</span>
                </div>
              </div>
            )}
          </button>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition"
            title={sidebarCollapsed ? t('প্রসারিত করুন', 'Expand') : t('সংকুচিত করুন', 'Collapse')}
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
          {/* Citizen Multi-Page Control Panel Navigation */}
          {role === 'citizen' || role === 'service_point_operator' ? (
            <div className="space-y-3.5">
              {/* Group 1: ভূমিসেবা */}
              <div>
                {!sidebarCollapsed && (
                  <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    {t('ভূমিসেবা', 'Services')}
                  </div>
                )}
                <div className="space-y-1">
                  {/* Overview */}
                  <button
                    onClick={() => {
                      setActiveTab('home');
                      setActiveSubTab('overview');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeTab === 'home' && (activeSubTab === 'overview' || !activeSubTab)
                        ? 'bg-emerald-50 text-[#006A4E] shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-emerald-700 shrink-0" />
                    {!sidebarCollapsed && <span>{t('ড্যাশবোর্ড', 'Dashboard')}</span>}
                  </button>

                  {/* My Land & Sale Lock */}
                  <button
                    onClick={() => {
                      setActiveTab('home');
                      setActiveSubTab('plots');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeTab === 'home' && (activeSubTab === 'plots' || activeSubTab === 'vault')
                        ? 'bg-emerald-50 text-[#006A4E] shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                    {!sidebarCollapsed && <span>{t('আমার জমি', 'My Land')}</span>}
                  </button>

                  {/* Documents & Porcha */}
                  <button
                    onClick={() => {
                      setActiveTab('home');
                      setActiveSubTab('docs');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeTab === 'home' && activeSubTab === 'docs'
                        ? 'bg-emerald-50 text-[#006A4E] shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <FolderOpen className="w-4 h-4 text-blue-600 shrink-0" />
                    {!sidebarCollapsed && <span>{t('কাগজপত্র ও পর্চা', 'Records & Porcha')}</span>}
                  </button>

                  {/* Registered Deeds */}
                  <button
                    onClick={() => {
                      setActiveTab('home');
                      setActiveSubTab('deeds');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeTab === 'home' && activeSubTab === 'deeds'
                        ? 'bg-emerald-50 text-[#006A4E] shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    {!sidebarCollapsed && <span>{t('দলিলপত্র', 'Deeds')}</span>}
                  </button>

                  {/* Transfers & Mutation Tracker */}
                  <button
                    onClick={() => {
                      setActiveTab('home');
                      setActiveSubTab('transfers');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeTab === 'home' && activeSubTab === 'transfers'
                        ? 'bg-emerald-50 text-[#006A4E] shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                    {!sidebarCollapsed && <span>{t('নামজারি ট্র্যাকার', 'Mutation Tracker')}</span>}
                  </button>
                </div>
              </div>

              {/* Group 2: আইন ও বিরোধ */}
              <div>
                {!sidebarCollapsed && (
                  <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    {t('আইন ও বিরোধ', 'Legal & Disputes')}
                  </div>
                )}
                <div className="space-y-1">
                  {/* Disputes & Revenue Tribunal */}
                  <button
                    onClick={() => {
                      setActiveTab('home');
                      setActiveSubTab('disputes');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeTab === 'home' && activeSubTab === 'disputes'
                        ? 'bg-emerald-50 text-[#006A4E] shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Scale className="w-4 h-4 text-rose-600 shrink-0" />
                    {!sidebarCollapsed && <span>{t('বিরোধ ও আপত্তি', 'Disputes & Objections')}</span>}
                  </button>

                  {/* Cadastral Mouza Map */}
                  <button
                    onClick={() => setActiveTab('map')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeTab === 'map' || activeTab === 'cadastral'
                        ? 'bg-emerald-50 text-[#006A4E] shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Compass className="w-4 h-4 text-indigo-600 shrink-0" />
                    {!sidebarCollapsed && <span>{t('মৌজা নকশা', 'Mouza Map')}</span>}
                  </button>

                  {/* Faraiz Calculator */}
                  <button
                    onClick={() => setFaraizOpen(true)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                    title={t('উত্তরাধিকার সম্পত্তি বণ্টন (ফারায়েজ ক্যালকুলেটর)', 'Inheritance Faraiz Calculator')}
                  >
                    <Calculator className="w-4 h-4 text-purple-600 shrink-0" />
                    {!sidebarCollapsed && <span>{t('ফারায়েজ', 'Faraiz')}</span>}
                  </button>
                </div>
              </div>

              {/* Group 3: সহায়তা */}
              <div>
                {!sidebarCollapsed && (
                  <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    {t('সহায়তা', 'Support')}
                  </div>
                )}
                <div className="space-y-1">
                  {/* Support Tickets */}
                  <button
                    onClick={() => {
                      setActiveTab('home');
                      setActiveSubTab('tickets');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeTab === 'home' && activeSubTab === 'tickets'
                        ? 'bg-emerald-50 text-[#006A4E] shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4 text-[#006A4E] shrink-0" />
                    {!sidebarCollapsed && <span>{t('হেল্পলাইন ও অভিযোগ', 'Helpline & Tickets')}</span>}
                  </button>

                  {/* Full Mutation Applications view */}
                  <button
                    onClick={() => setActiveTab('applications')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeTab === 'applications'
                        ? 'bg-emerald-50 text-[#006A4E] shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                    {!sidebarCollapsed && <span>{t('আবেদনসমূহ', 'Applications')}</span>}
                  </button>

                  {/* Citizen Service Guide & Interactive Product Tour */}
                  <button
                    onClick={() => setTourOpen(true)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      tourOpen
                        ? 'bg-emerald-50 text-[#006A4E] shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title={t('নাগরিক পোর্টাল ইন্টারেক্টিভ প্রোডাক্ট ট্যুর ও গাইড', 'Citizen Portal Interactive Tour & Feature Guide')}
                  >
                    <BookOpen className="w-4 h-4 text-emerald-700 shrink-0" />
                    {!sidebarCollapsed && <span>{t('সেবা গাইড', 'Service Guide')}</span>}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* DEFAULT/OFFICER SIDEBAR ITEMS */
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab(ROLE_DASHBOARD_MAP[role] || 'home')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  activeTab === (ROLE_DASHBOARD_MAP[role] || 'home')
                    ? 'bg-emerald-50 text-[#006A4E] font-bold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-700 shrink-0" />
                {!sidebarCollapsed && <span>{t('ড্যাশবোর্ড', 'Dashboard')}</span>}
              </button>

              <button
                onClick={() => setActiveTab('applications')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  activeTab === 'applications'
                    ? 'bg-emerald-50 text-[#006A4E] font-bold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                {!sidebarCollapsed && <span>{t('আবেদন ও নথি', 'Applications')}</span>}
              </button>

              <button
                onClick={() => setActiveTab('map')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  activeTab === 'map' || activeTab === 'cadastral'
                    ? 'bg-emerald-50 text-[#006A4E] font-bold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Compass className="w-4 h-4 text-emerald-700 shrink-0" />
                {!sidebarCollapsed && <span>{t('ক্যাডাস্ট্রাল ম্যাপ', 'Cadastral Map')}</span>}
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="my-2 border-t border-slate-200" />

          {/* Return to Public Portal */}
          <button
            onClick={() => setActiveTab('landing')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400 shrink-0" />
            {!sidebarCollapsed && <span>{t('পাবলিক পোর্টালে যান', 'Public Portal')}</span>}
          </button>
        </nav>

        {/* Bottom Sidebar Profile Card & Interactive Expandable Menu */}
        {user ? (
          <div className="p-2 border-t border-slate-200/80 bg-slate-50/80">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-tour="sidebar-user-profile"
                  className={cn(
                    "w-full flex items-center gap-2.5 p-2.5 rounded-2xl transition cursor-pointer text-left group",
                    "bg-white shadow-2xs border border-slate-200/90 hover:border-emerald-300 hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20",
                    sidebarCollapsed ? "justify-center px-1 py-2" : "justify-between"
                  )}
                  title={t('নাগরিক প্রোফাইল ও সেটিংস মেনু', 'Profile & Settings Menu')}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 text-[#006A4E] shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                      <AvatarFallback className="bg-emerald-100 text-[#006A4E] text-xs font-black">
                        {user.full_name_bn?.charAt(0) || user.username?.charAt(0).toUpperCase() || 'ম'}
                      </AvatarFallback>
                    </Avatar>
                    {!sidebarCollapsed && (
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {user.full_name_bn || user.username}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium truncate">
                          {user.office_bn || userRoleMeta.deptBn}
                        </p>
                      </div>
                    )}
                  </div>
                  {!sidebarCollapsed && (
                    <ChevronsUpDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
                  )}
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side={sidebarCollapsed ? "right" : "top"}
                align={sidebarCollapsed ? "start" : "center"}
                sideOffset={8}
                className="w-58 p-1.5 rounded-2xl border border-slate-200 bg-white shadow-xl z-50 font-sans"
              >
                <DropdownMenuLabel className="px-3 py-2 border-b border-slate-100 mb-1">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-200 text-[#006A4E] shrink-0">
                      <AvatarFallback className="text-[11px] font-black">
                        {user.full_name_bn?.charAt(0) || 'ম'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {(user.full_name_bn || user.username || '').replace(/\s*\((?:নাগরিক|Citizen)\)/gi, '')}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono truncate">
                        {user.nid ? `NID: ${user.nid}` : (user.email || user.username)}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuItem
                  onClick={() => setActiveTab('profile')}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 cursor-pointer"
                >
                  <User className="w-4 h-4 text-[#006A4E]" />
                  <span>{t('আমার প্রোফাইল', 'My Profile')}</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setActiveTab('settings')}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-[#006A4E]" />
                  <span>{t('সেটিংস', 'Settings')}</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 border-slate-100" />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>{t('লগআউট', 'Sign Out')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="p-3 border-t border-slate-200/80">
            <button
              onClick={() => setActiveTab('auth')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#006A4E] hover:bg-emerald-50 transition cursor-pointer"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>{t('লগইন করুন', 'Sign In')}</span>}
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Drawer Sheet for Dashboard Navigation (< md) */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-[320px] p-0 flex flex-col bg-white border-r border-slate-200 z-50">
          <SheetHeader className="h-16 px-4 flex flex-row items-center justify-between border-b border-slate-200/80 shrink-0 space-y-0 text-left">
            <button
              type="button"
              onClick={() => {
                setActiveTab('landing');
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#006A4E] to-emerald-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
                ভূ
              </div>
              <div className="min-w-0">
                <SheetTitle className="font-black text-sm text-slate-900 truncate m-0 p-0">ভূমি সুরক্ষা</SheetTitle>
                <div className="text-[10px] text-emerald-700 font-semibold truncate">
                  {userRoleMeta.titleBn}
                </div>
              </div>
            </button>
          </SheetHeader>

          {/* Navigation Items */}
          <nav className="flex-1 p-3 space-y-3 overflow-y-auto font-sans">
            {role === 'citizen' || role === 'service_point_operator' ? (
              <div className="space-y-3.5">
                {/* Group 1: ভূমিসেবা */}
                <div>
                  <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    {t('ভূমিসেবা', 'Services')}
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setActiveTab('home');
                        setActiveSubTab('overview');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        activeTab === 'home' && (activeSubTab === 'overview' || !activeSubTab)
                          ? 'bg-emerald-50 text-[#006A4E] shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>{t('ড্যাশবোর্ড', 'Dashboard')}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('home');
                        setActiveSubTab('plots');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        activeTab === 'home' && (activeSubTab === 'plots' || activeSubTab === 'vault')
                          ? 'bg-emerald-50 text-[#006A4E] shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>{t('আমার জমি', 'My Land')}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('home');
                        setActiveSubTab('docs');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        activeTab === 'home' && activeSubTab === 'docs'
                          ? 'bg-emerald-50 text-[#006A4E] shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <FolderOpen className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{t('কাগজপত্র ও পর্চা', 'Records & Porcha')}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('home');
                        setActiveSubTab('deeds');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        activeTab === 'home' && activeSubTab === 'deeds'
                          ? 'bg-emerald-50 text-[#006A4E] shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{t('দলিলপত্র', 'Deeds')}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('home');
                        setActiveSubTab('transfers');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        activeTab === 'home' && activeSubTab === 'transfers'
                          ? 'bg-emerald-50 text-[#006A4E] shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>{t('নামজারি ট্র্যাকার', 'Mutation Tracker')}</span>
                    </button>
                  </div>
                </div>

                {/* Group 2: আইন ও বিরোধ */}
                <div>
                  <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    {t('আইন ও বিরোধ', 'Legal & Disputes')}
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setActiveTab('home');
                        setActiveSubTab('disputes');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        activeTab === 'home' && activeSubTab === 'disputes'
                          ? 'bg-emerald-50 text-[#006A4E] shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Scale className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{t('বিরোধ ও আপত্তি', 'Disputes & Objections')}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('map');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        activeTab === 'map' || activeTab === 'cadastral'
                          ? 'bg-emerald-50 text-[#006A4E] shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Compass className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>{t('মৌজা নকশা', 'Mouza Map')}</span>
                    </button>

                    <button
                      onClick={() => {
                        setFaraizOpen(true);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                      title={t('উত্তরাধিকার সম্পত্তি বণ্টন (ফারায়েজ ক্যালকুলেটর)', 'Inheritance Faraiz Calculator')}
                    >
                      <Calculator className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>{t('ফারায়েজ', 'Faraiz')}</span>
                    </button>
                  </div>
                </div>

                {/* Group 3: সহায়তা */}
                <div>
                  <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    {t('সহায়তা', 'Support')}
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setActiveTab('home');
                        setActiveSubTab('tickets');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        activeTab === 'home' && activeSubTab === 'tickets'
                          ? 'bg-emerald-50 text-[#006A4E] shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <HelpCircle className="w-4 h-4 text-[#006A4E] shrink-0" />
                      <span>{t('হেল্পলাইন ও অভিযোগ', 'Helpline & Tickets')}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('applications');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        activeTab === 'applications'
                          ? 'bg-emerald-50 text-[#006A4E] shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>{t('আবেদনসমূহ', 'Applications')}</span>
                    </button>

                    <button
                      onClick={() => {
                        setTourOpen(true);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        tourOpen
                          ? 'bg-emerald-50 text-[#006A4E] shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <BookOpen className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>{t('সেবা গাইড', 'Service Guide')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setActiveTab(ROLE_DASHBOARD_MAP[role] || 'home');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                    activeTab === (ROLE_DASHBOARD_MAP[role] || 'home')
                      ? 'bg-emerald-50 text-[#006A4E] font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{t('ড্যাশবোর্ড', 'Dashboard')}</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('applications');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                    activeTab === 'applications'
                      ? 'bg-emerald-50 text-[#006A4E] font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{t('আবেদন ও নথি', 'Applications')}</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('map');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                    activeTab === 'map' || activeTab === 'cadastral'
                      ? 'bg-emerald-50 text-[#006A4E] font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Compass className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{t('ক্যাডাস্ট্রাল ম্যাপ', 'Cadastral Map')}</span>
                </button>
              </div>
            )}

            <div className="my-2 border-t border-slate-200" />

            <button
              onClick={() => {
                setActiveTab('landing');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{t('পাবলিক পোর্টালে যান', 'Public Portal')}</span>
            </button>
          </nav>

          {/* Bottom Profile Area in Mobile Drawer */}
          {user && (
            <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                <Avatar className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 text-[#006A4E] shrink-0 font-black">
                  <AvatarFallback className="bg-emerald-100 text-[#006A4E] text-xs font-black">
                    {user.full_name_bn?.charAt(0) || 'ম'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {user.full_name_bn || user.username}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium truncate">
                    {user.office_bn || userRoleMeta.deptBn}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveTab('profile');
                    setMobileMenuOpen(false);
                  }}
                  className="h-8 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-emerald-50 hover:text-[#006A4E] border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-[#006A4E]" />
                  <span>{t('প্রোফাইল', 'Profile')}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveTab('settings');
                    setMobileMenuOpen(false);
                  }}
                  className="h-8 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-emerald-50 hover:text-[#006A4E] border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-600" />
                  <span>{t('সেটিংস', 'Settings')}</span>
                </Button>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span>{t('লগআউট', 'Sign Out')}</span>
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Main Column */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0",
          isFixedCitizenPortal ? "h-full max-h-full overflow-hidden" : ""
        )}
      >
        {/* Modern Top Header in Dashboard */}
        <header className="h-16 shrink-0 px-3 sm:px-6 bg-white border-b border-slate-200/80 flex items-center justify-between gap-3 sm:gap-4 sticky top-0 z-20 shadow-xs">
          {/* Breadcrumb / Title with Mobile Hamburger Toggle */}
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-600 overflow-x-auto no-scrollbar py-1">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 cursor-pointer shrink-0 border border-slate-200 shadow-2xs flex items-center justify-center transition active:scale-95"
              aria-label={t('মেনু খুলুন', 'Open Menu')}
              title={t('মেনু খুলুন', 'Open Menu')}
            >
              <Menu className="w-4.5 h-4.5 text-[#006A4E]" />
            </button>

            <button
              onClick={() => setActiveTab('landing')}
              className="hover:text-emerald-700 flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Home className="w-3.5 h-3.5 text-slate-400" />
              <span>{t('হোম', 'Home')}</span>
            </button>
            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
            <button
              onClick={() => {
                setActiveTab('home');
                setActiveSubTab('overview');
              }}
              className="hover:text-emerald-700 cursor-pointer shrink-0 font-bold text-slate-700"
            >
              {userRoleMeta.titleBn}
            </button>
            {activeTab === 'home' && activeSubTab && activeSubTab !== 'overview' && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                <span className="font-extrabold text-[#006A4E] shrink-0">
                  {activeSubTab === 'plots' ? t('আমার জমি ও বিক্রয় লক', 'My Land & Sale Lock') :
                   activeSubTab === 'docs' ? t('সংরক্ষিত কাগজপত্র ও পর্চা', 'Saved Records & Porcha') :
                   activeSubTab === 'deeds' ? t('রেজিস্ট্রিকৃত দলিলপত্র', 'Registered Deeds') :
                   activeSubTab === 'transfers' ? t('জমি হস্তান্তর ও নামজারি', 'Transfer & Mutation') :
                   activeSubTab === 'disputes' ? t('বিরোধ ও আইনি আপত্তি', 'Disputes & Objections') :
                   activeSubTab === 'tickets' ? t('১৬১২২ হেল্পলাইন ও অভিযোগ', '16122 Helpline & Inquiries') : activeSubTab}
                </span>
              </>
            )}
            {activeTab === 'applications' && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                <span className="font-extrabold text-[#006A4E] shrink-0">
                  {t('ই-নামজারি আবেদনপত্র', 'e-Mutation Applications')}
                </span>
              </>
            )}
            {(activeTab === 'map' || activeTab === 'cadastral') && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                <span className="font-extrabold text-[#006A4E] shrink-0">
                  {t('জমির মৌজা নকশা (ম্যাপ)', 'Mouza Map')}
                </span>
              </>
            )}
            {activeTab === 'profile' && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                <span className="font-extrabold text-[#006A4E] shrink-0">
                  {t('আমার প্রোফাইল ও পরিচিতি', 'My Profile & Identity')}
                </span>
              </>
            )}
            {activeTab === 'settings' && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                <span className="font-extrabold text-[#006A4E] shrink-0">
                  {t('নাগরিক সেটিংস ও নিরাপত্তা', 'Settings & Security')}
                </span>
              </>
            )}
            {activeTab === 'help' && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                <span className="font-extrabold text-[#006A4E] shrink-0">
                  {t('সহায়তা ও সেবা গাইড', 'Help & Service Guide')}
                </span>
              </>
            )}
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTourOpen(true)}
              className="flex items-center gap-1.5 text-xs h-8 px-2.5 rounded-xl border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold shadow-2xs cursor-pointer"
              title={t('ইন্টারেক্টিভ প্রোডাক্ট ট্যুর ও গাইড', 'Interactive Product Tour & Guide')}
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#006A4E]" />
              <span className="hidden sm:inline">{t('ট্যুর ও গাইড', 'Tour & Guide')}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setFaraizOpen(true)}
              className="hidden sm:flex items-center gap-1.5 text-xs h-8 px-2.5"
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('ফারায়েজ', 'Faraiz')}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setOcrOpen(true)}
              className="hidden sm:flex items-center gap-1.5 text-xs h-8 px-2.5"
            >
              <ScanLine className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('পর্চা OCR', 'OCR')}</span>
            </Button>

            {/* Notification Center Trigger */}
            <NotificationCenter onNavigate={(tab) => setActiveTab(tab)} />

            {/* Language Switch */}
            <button
              onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
              className="px-2.5 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              {lang === 'bn' ? 'EN' : 'বাং'}
            </button>
          </div>
        </header>

        {/* Super Admin Impersonation Notice & Quick Return */}
        {typeof window !== 'undefined' && localStorage.getItem('bs_superadmin_mode') === '1' && (
          <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white px-4 py-2.5 border-b border-purple-700/60 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping shrink-0" />
              <span className="font-bold text-purple-200">
                {t('সুপার অ্যাডমিন ইমপার্সোনেশন মোড:', 'Super Admin Impersonation Mode:')}
              </span>
              <span className="text-white font-medium">
                {t(
                  `আপনি বর্তমানে "${user?.full_name_bn || user?.username}" (${userRoleMeta.titleBn})-এর দাপ্তরিক ডেস্কে কর্মরত আছেন।`,
                  `You are currently working in the official workspace of "${user?.full_name_en || user?.username}" (${userRoleMeta.titleEn}).`
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const origToken = localStorage.getItem('bs_admin_original_token');
                const origUser = localStorage.getItem('bs_admin_original_user');
                if (origToken) {
                  localStorage.setItem('bs_token', origToken);
                  localStorage.removeItem('bs_superadmin_mode');
                  if (origUser) localStorage.setItem('bs_user', origUser);
                  localStorage.setItem('bs_role', 'admin');
                }
                window.location.href = `/${lang}/admin/officials`;
              }}
              className="bg-white text-purple-950 hover:bg-purple-50 font-bold text-xs px-3.5 py-1.5 rounded-lg transition shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>{t('অ্যাডমিন কনসোলে ফিরে যান →', 'Return to Admin Console →')}</span>
            </button>
          </div>
        )}

        {/* Dashboard Main Workspace */}
        <main
          className={cn(
            "w-full mx-auto",
            isFixedCitizenPortal
              ? "flex-1 min-h-0 overflow-hidden flex flex-col p-2.5 sm:p-4 lg:p-5 max-w-7xl"
              : "flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl pb-24"
          )}
        >
          {children}
        </main>
      </div>

      {/* Global Modals */}
      <FaraizCalculatorModal isOpen={faraizOpen} onClose={() => setFaraizOpen(false)} />
      <BengaliPorchaOcrModal isOpen={ocrOpen} onClose={() => setOcrOpen(false)} onNavigate={(r) => setActiveTab(r)} />
      <CitizenProblemTriageModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        onNavigate={(route) => {
          setGuideOpen(false);
          if (!route) return;
          if (route.startsWith('http')) {
            window.open(route, '_blank');
          } else if (route.startsWith('tickets')) {
            setActiveTab('home');
            setActiveSubTab('tickets');
          } else if (['plots', 'vault', 'deeds', 'transfers', 'disputes'].includes(route)) {
            setActiveTab('home');
            setActiveSubTab(route);
          } else {
            setActiveTab(route);
          }
        }}
      />
      <CitizenProductTour
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setActiveSubTab={setActiveSubTab}
        onNavigateHelpCenter={() => setActiveTab('help')}
      />
    </div>
  );
};
