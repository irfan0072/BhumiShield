import {
  LayoutDashboard,
  FileCheck2,
  Layers,
  RefreshCcw,
  ArrowLeftRight,
  Scale,
  Landmark,
  FolderKanban,
  Gavel,
  Users,
  Briefcase,
  Building2,
  MapPin,
  KeyRound,
  Bell,
  BookOpen,
  Radio,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

/**
 * Single source of truth for the super admin menu.
 * The sidebar, the mobile menu, the page header and the dashboard tiles all read from here,
 * so a page name or description only has to be changed in one place.
 */

export interface AdminNavItem {
  id: string;
  titleBn: string;
  titleEn: string;
  /** One short, plain sentence explaining what the page is for. */
  descBn: string;
  descEn: string;
  icon: LucideIcon;
  /** Tailwind classes for the coloured icon box on dashboard tiles. */
  tone: string;
  /** Extra search words (Bangla + English) for the menu search box. */
  keywords?: string;
}

export interface AdminNavGroup {
  id: string;
  labelBn: string;
  labelEn: string;
  items: AdminNavItem[];
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    id: 'home',
    labelBn: 'শুরু',
    labelEn: 'Start',
    items: [
      {
        id: 'overview',
        titleBn: 'ড্যাশবোর্ড',
        titleEn: 'Dashboard',
        descBn: 'সব কাজের সারসংক্ষেপ এক জায়গায়',
        descEn: 'A summary of everything in one place',
        icon: LayoutDashboard,
        tone: 'bg-emerald-100 text-emerald-700',
        keywords: 'home হোম',
      },
    ],
  },
  {
    id: 'land',
    labelBn: 'জমির কাগজপত্র',
    labelEn: 'Land records',
    items: [
      {
        id: 'deeds',
        titleBn: 'দলিল',
        titleEn: 'Deeds',
        descBn: 'সব রেজিস্ট্রি করা দলিল দেখুন ও খুঁজুন',
        descEn: 'See and search all registered deeds',
        icon: FileCheck2,
        tone: 'bg-emerald-100 text-emerald-700',
        keywords: 'registry রেজিস্ট্রি dolil',
      },
      {
        id: 'khatians',
        titleBn: 'খতিয়ান ও দাগ',
        titleEn: 'Khatians & plots',
        descBn: 'সমস্যাযুক্ত খতিয়ান ঠিক করুন বা জমি আটকে রাখুন',
        descEn: 'Fix problem khatians or freeze a plot',
        icon: Layers,
        tone: 'bg-cyan-100 text-cyan-700',
        keywords: 'plot dag দাগ freeze',
      },
      {
        id: 'mutations',
        titleBn: 'নামজারি',
        titleEn: 'Mutations',
        descBn: 'নামজারি আবেদনের অবস্থা দেখুন',
        descEn: 'Check mutation applications',
        icon: RefreshCcw,
        tone: 'bg-orange-100 text-orange-700',
        keywords: 'mutation namjari',
      },
      {
        id: 'transfers',
        titleBn: 'জমি হস্তান্তর',
        titleEn: 'Land transfers',
        descBn: 'জমি বিক্রি ও হস্তান্তরের আবেদন দেখুন',
        descEn: 'Track land sale and transfer requests',
        icon: ArrowLeftRight,
        tone: 'bg-violet-100 text-violet-700',
        keywords: 'transfer sale বিক্রি',
      },
    ],
  },
  {
    id: 'legal',
    labelBn: 'মামলা ও ব্যাংক',
    labelEn: 'Cases & banks',
    items: [
      {
        id: 'appeals',
        titleBn: 'বিরোধ ও আপিল',
        titleEn: 'Disputes & appeals',
        descBn: 'জমির বিরোধ ও আপিলের সিদ্ধান্ত দিন',
        descEn: 'Decide land disputes and appeals',
        icon: Scale,
        tone: 'bg-rose-100 text-rose-700',
        keywords: 'dispute appeal মামলা',
      },
      {
        id: 'mortgages',
        titleBn: 'ব্যাংক ঋণ',
        titleEn: 'Bank loans',
        descBn: 'কোন জমি ব্যাংকে বন্ধক আছে দেখুন',
        descEn: 'See which land is mortgaged to a bank',
        icon: Landmark,
        tone: 'bg-sky-100 text-sky-700',
        keywords: 'mortgage lien bank ব্যাংক',
      },
      {
        id: 'acquisitions',
        titleBn: 'ভূমি অধিগ্রহণ',
        titleEn: 'Land acquisition',
        descBn: 'সরকারি কাজে জমি নেওয়ার মামলা',
        descEn: 'Government land acquisition cases',
        icon: FolderKanban,
        tone: 'bg-amber-100 text-amber-700',
        keywords: 'acquisition',
      },
      {
        id: 'lawyers',
        titleBn: 'আইনজীবী',
        titleEn: 'Lawyers',
        descBn: 'অনুমোদিত আইনজীবীর তালিকা',
        descEn: 'List of approved lawyers',
        icon: Gavel,
        tone: 'bg-slate-200 text-slate-700',
        keywords: 'lawyer উকিল',
      },
    ],
  },
  {
    id: 'people',
    labelBn: 'মানুষ ও অফিস',
    labelEn: 'People & offices',
    items: [
      {
        id: 'citizens',
        titleBn: 'নাগরিক',
        titleEn: 'Citizens',
        descBn: 'নাগরিকদের অ্যাকাউন্ট দেখুন ও নতুন যোগ করুন',
        descEn: 'View citizen accounts and add new ones',
        icon: Users,
        tone: 'bg-blue-100 text-blue-700',
        keywords: 'citizen user জনগণ',
      },
      {
        id: 'officials',
        titleBn: 'কর্মকর্তা',
        titleEn: 'Officials',
        descBn: 'সরকারি কর্মকর্তা যোগ করুন বা বদলি করুন',
        descEn: 'Add or transfer government officials',
        icon: Briefcase,
        tone: 'bg-purple-100 text-purple-700',
        keywords: 'official officer staff user',
      },
      {
        id: 'offices',
        titleBn: 'ভূমি অফিস',
        titleEn: 'Land offices',
        descBn: 'ভূমি অফিস যোগ, সম্পাদনা বা বন্ধ করুন',
        descEn: 'Add, edit or close land offices',
        icon: Building2,
        tone: 'bg-indigo-100 text-indigo-700',
        keywords: 'office অফিস',
      },
      {
        id: 'locations',
        titleBn: 'এলাকা ও মৌজা',
        titleEn: 'Areas & mouzas',
        descBn: 'বিভাগ, জেলা, উপজেলা ও মৌজার তালিকা',
        descEn: 'Divisions, districts, upazilas and mouzas',
        icon: MapPin,
        tone: 'bg-amber-100 text-amber-700',
        keywords: 'mouza division district upazila জেলা উপজেলা',
      },
      {
        id: 'roles',
        titleBn: 'পদবী ও অনুমতি',
        titleEn: 'Roles & access',
        descBn: 'কে কোন কাজ করতে পারবে তা দেখুন',
        descEn: 'See who is allowed to do what',
        icon: KeyRound,
        tone: 'bg-slate-200 text-slate-700',
        keywords: 'role permission ক্ষমতা',
      },
    ],
  },
  {
    id: 'website',
    labelBn: 'ওয়েবসাইট',
    labelEn: 'Website',
    items: [
      {
        id: 'notices',
        titleBn: 'নোটিশ বোর্ড',
        titleEn: 'Notices',
        descBn: 'ওয়েবসাইটে নতুন নোটিশ দিন',
        descEn: 'Post a new notice on the website',
        icon: Bell,
        tone: 'bg-rose-100 text-rose-700',
        keywords: 'notice বিজ্ঞপ্তি',
      },
      {
        id: 'blogs',
        titleBn: 'ব্লগ ও লেখা',
        titleEn: 'Blog posts',
        descBn: 'সাহায্যকারী লেখা লিখুন ও প্রকাশ করুন',
        descEn: 'Write and publish helpful articles',
        icon: BookOpen,
        tone: 'bg-teal-100 text-teal-700',
        keywords: 'blog article content',
      },
      {
        id: 'system',
        titleBn: 'জরুরি বার্তা',
        titleEn: 'Alert banner',
        descBn: 'সবার স্ক্রিনের উপরে জরুরি বার্তা দেখান',
        descEn: 'Show an urgent message at the top for everyone',
        icon: Radio,
        tone: 'bg-red-100 text-red-700',
        keywords: 'broadcast alert banner',
      },
      {
        id: 'settings',
        titleBn: 'লোগো ও সেটিংস',
        titleEn: 'Logo & settings',
        descBn: 'লোগো, নাম ও যোগাযোগের তথ্য বদলান',
        descEn: 'Change logo, name and contact details',
        icon: Settings,
        tone: 'bg-slate-200 text-slate-700',
        keywords: 'settings logo সেটিং',
      },
      {
        id: 'ledger',
        titleBn: 'নিরাপত্তা ও ব্যাকআপ',
        titleEn: 'Security & backup',
        descBn: 'তথ্য কেউ বদলেছে কিনা যাচাই করুন ও কপি রাখুন',
        descEn: 'Check records were not tampered with and save a copy',
        icon: ShieldCheck,
        tone: 'bg-emerald-100 text-emerald-700',
        keywords: 'ledger security backup নিরাপত্তা ব্যাকআপ',
      },
    ],
  },
];

export const adminNavItems: AdminNavItem[] = adminNavGroups.flatMap((g) => g.items);

/** Sub-pages that reuse another page's menu entry. */
const aliases: Record<string, string> = { users: 'officials', content: 'blogs' };

export const findAdminNavItem = (id: string): AdminNavItem =>
  adminNavItems.find((i) => i.id === (aliases[id] || id)) || adminNavItems[0];

export const findAdminNavGroup = (id: string): AdminNavGroup | undefined =>
  adminNavGroups.find((g) => g.items.some((i) => i.id === (aliases[id] || id)));
