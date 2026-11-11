import {
  BadgeCheck,
  BookOpen,
  Building2,
  Calculator,
  FileCheck2,
  FileSearch,
  FileText,
  Gavel,
  HandCoins,
  Home,
  Landmark,
  Lock,
  Map,
  Megaphone,
  PhoneCall,
  Receipt,
  RefreshCcw,
  Scale,
  ScrollText,
  ShieldCheck,
  Store,
  Trees,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * Single catalogue of land services shown on public pages
 * (menu, landing grid, search, mobile sheet). Edit services here only.
 *
 * `target` is an App tab (optionally with query), `login` = needs sign-in,
 * `soon` = planned service (shown as "শীঘ্রই", not clickable).
 */
export interface LandService {
  id: string;
  bn: string;
  en: string;
  /** one short line, max ~6 words */
  descBn: string;
  descEn: string;
  icon: LucideIcon;
  target?: string;
  login?: boolean;
  soon?: boolean;
  /** shown in the hero quick row */
  featured?: boolean;
}

export interface ServiceGroup {
  id: string;
  bn: string;
  en: string;
  items: LandService[];
}

export const SERVICE_GROUPS: ServiceGroup[] = [
  {
    id: 'verify',
    bn: 'যাচাই ও তথ্য',
    en: 'Verify & records',
    items: [
      { id: 'check', bn: 'জমি যাচাই', en: 'Check land', descBn: 'কেনার আগে ঝুঁকি দেখুন', descEn: 'See risks before buying', icon: ShieldCheck, target: 'check', featured: true },
      { id: 'deed', bn: 'দলিল যাচাই', en: 'Verify deed', descBn: 'দলিল আসল কিনা দেখুন', descEn: 'Is the deed genuine', icon: FileCheck2, target: 'qr', featured: true },
      { id: 'map', bn: 'মৌজা ম্যাপ', en: 'Mouza map', descBn: 'স্যাটেলাইটে দাগ দেখুন', descEn: 'See plots on satellite', icon: Map, target: 'map', featured: true },
      { id: 'khatian', bn: 'খতিয়ান খুঁজুন', en: 'Find khatian', descBn: 'দাগ ও মালিকানা ধারা', descEn: 'Plot and ownership chain', icon: FileSearch, target: 'check', featured: true },
      { id: 'noc', bn: 'ব্যাংক ছাড়পত্র যাচাই', en: 'Verify bank NOC', descBn: 'বন্ধক মুক্তির সনদ', descEn: 'Mortgage release proof', icon: BadgeCheck, target: 'qr?kind=noc' },
    ],
  },
  {
    id: 'apply',
    bn: 'আবেদন ও হস্তান্তর',
    en: 'Apply & transfer',
    items: [
      { id: 'transfer', bn: 'জমি হস্তান্তর', en: 'Land transfer', descBn: 'ধাপে ধাপে অনলাইনে', descEn: 'Step by step online', icon: RefreshCcw, target: 'applications', login: true, featured: true },
      { id: 'mutation', bn: 'নামজারি', en: 'Mutation', descBn: 'নিজের নামে খতিয়ান', descEn: 'Khatian in your name', icon: ScrollText, target: 'applications', login: true },
      { id: 'my-land', bn: 'আমার জমি', en: 'My land', descBn: 'নিজের সব জমি এক জায়গায়', descEn: 'All your plots in one place', icon: Home, target: 'home', login: true, featured: true },
      { id: 'sale-lock', bn: 'বিক্রয় লক', en: 'Sale lock', descBn: 'জালিয়াতি থেকে জমি রক্ষা', descEn: 'Protect land from fraud', icon: Lock, target: 'home?section=plots', login: true },
      { id: 'dispute', bn: 'আপত্তি দাখিল', en: 'File objection', descBn: 'জমি নিয়ে অভিযোগ', descEn: 'Complain about a plot', icon: Gavel, target: 'home?section=disputes', login: true },
    ],
  },
  {
    id: 'fees',
    bn: 'কর, ফি ও হিসাব',
    en: 'Tax, fees & tools',
    items: [
      { id: 'fees', bn: 'রেজিস্ট্রি ফি হিসাব', en: 'Registry fee', descBn: 'খরচ আগে জানুন', descEn: 'Know the cost first', icon: Calculator, target: 'help?tab=fees', featured: true },
      { id: 'faraiz', bn: 'উত্তরাধিকার হিসাব', en: 'Inheritance share', descBn: 'ফারায়েজ অনুযায়ী অংশ', descEn: 'Shares by Faraiz', icon: Scale, target: 'blog?tool=faraiz' },
      { id: 'ldtax', bn: 'ভূমি উন্নয়ন কর', en: 'Land tax', descBn: 'অনলাইনে কর পরিশোধ', descEn: 'Pay land tax online', icon: Receipt, soon: true },
      { id: 'compensation', bn: 'অধিগ্রহণ ক্ষতিপূরণ', en: 'Acquisition payment', descBn: 'ক্ষতিপূরণের অবস্থা', descEn: 'Compensation status', icon: HandCoins, soon: true },
    ],
  },
  {
    id: 'records',
    bn: 'কপি ও সনদ',
    en: 'Copies & certificates',
    items: [
      { id: 'porcha', bn: 'খতিয়ান/পর্চার কপি', en: 'Khatian copy', descBn: 'সার্টিফায়েড কপি', descEn: 'Certified copy', icon: FileText, soon: true },
      { id: 'map-copy', bn: 'মৌজা ম্যাপের কপি', en: 'Map copy', descBn: 'নকশার সার্টিফায়েড কপি', descEn: 'Certified map copy', icon: Map, soon: true },
      { id: 'khas', bn: 'খাস জমি বন্দোবস্ত', en: 'Khas land lease', descBn: 'ভূমিহীনদের আবেদন', descEn: 'For landless families', icon: Trees, soon: true },
      { id: 'class-change', bn: 'জমির শ্রেণি পরিবর্তন', en: 'Land class change', descBn: 'কৃষি থেকে বাসস্থান ইত্যাদি', descEn: 'e.g. farm to housing', icon: Landmark, soon: true },
    ],
  },
  {
    id: 'help',
    bn: 'তথ্য ও সহায়তা',
    en: 'Info & help',
    items: [
      { id: 'offices', bn: 'ভূমি অফিস', en: 'Land offices', descBn: 'কাছের অফিস ও সাক্ষাৎ', descEn: 'Nearby office & visit', icon: Building2, target: 'offices', featured: true },
      { id: 'notices', bn: 'নোটিশ', en: 'Notices', descBn: 'সর্বশেষ সরকারি নোটিশ', descEn: 'Latest notices', icon: Megaphone, target: 'notices' },
      { id: 'guide', bn: 'ভূমি সহায়িকা', en: 'Land guide', descBn: 'সহজ ভাষায় নিয়মকানুন', descEn: 'Rules in simple words', icon: BookOpen, target: 'blog' },
      { id: 'market', bn: 'যাচাইকৃত বিক্রয়', en: 'Verified listings', descBn: 'যাচাই করা জমির বিজ্ঞাপন', descEn: 'Checked land for sale', icon: Store, target: 'sale' },
      { id: 'helpline', bn: 'হেল্পলাইন ১৬১২২', en: 'Helpline 16122', descBn: 'ফোনে সাহায্য নিন', descEn: 'Get help by phone', icon: PhoneCall, target: 'help' },
      { id: 'officers', bn: 'কর্মকর্তা লগইন', en: 'Officer login', descBn: 'দাপ্তরিক কাজের জন্য', descEn: 'For official work', icon: Users, target: 'auth' },
    ],
  },
];

export const ALL_SERVICES: LandService[] = SERVICE_GROUPS.flatMap((g) => g.items);
export const FEATURED_SERVICES: LandService[] = ALL_SERVICES.filter((s) => s.featured);
export const LIVE_COUNT = ALL_SERVICES.filter((s) => !s.soon).length;
export const SOON_COUNT = ALL_SERVICES.filter((s) => s.soon).length;

/** Primary nav (desktop top bar). Keep it to 4 items + "সেবাসমূহ". */
export const PRIMARY_NAV: Array<{ id: string; bn: string; en: string; target: string }> = [
  { id: 'check', bn: 'জমি যাচাই', en: 'Check land', target: 'check' },
  { id: 'map', bn: 'ম্যাপ', en: 'Map', target: 'map' },
  { id: 'qr', bn: 'দলিল যাচাই', en: 'Verify deed', target: 'qr' },
  { id: 'help', bn: 'সহায়তা', en: 'Help', target: 'help' },
];
