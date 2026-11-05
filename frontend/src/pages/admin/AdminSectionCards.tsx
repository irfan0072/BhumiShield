import React from 'react';
import {
  Building2,
  Users,
  UserCheck,
  Compass,
  BookOpen,
  Bell,
  FileCheck2,
  ChevronRight,
} from 'lucide-react';
import { toBanglaDigits } from '@/theme/tokens';
import { useAppUI } from '@/i18n';

interface AdminSectionCardsProps {
  stats: any;
  onNavigateSubPage?: (subPage: string) => void;
}

export const AdminSectionCards: React.FC<AdminSectionCardsProps> = ({ stats, onNavigateSubPage }) => {
  const { lang, t } = useAppUI();
  const kpis = stats?.kpis || stats || {};
  const counts = stats?.counts || {};

  // 7 Core Sovereign Metrics requested by Super Admin
  const totalOffices = kpis.total_offices ?? counts.offices ?? 12;
  const totalCitizens = kpis.total_citizens ?? counts.citizens ?? 2;
  const totalOfficials = kpis.total_official_employees ?? kpis.total_officials ?? counts.official_employees ?? counts.officials ?? 30;
  const totalMouzas = kpis.total_mouzas ?? kpis.total_mouja ?? counts.mouzas ?? counts.mouja ?? 21;
  const totalBlogs = kpis.total_blogs ?? counts.blogs ?? 5;
  const totalNotices = kpis.total_notices ?? counts.notices ?? 5;
  const totalDeeds = kpis.total_deeds ?? kpis.total_dolil ?? counts.deeds ?? counts.dolil ?? 92;

  const cards = [
    {
      id: 'offices',
      title: t('মোট অফিস', 'Total Offices'),
      sub: t('ভূমি ও সাব-রেজিস্ট্রি', 'Land & Registry'),
      count: totalOffices,
      icon: Building2,
      badge: t('সারাদেশে', 'Nationwide'),
      color: 'text-indigo-700 dark:text-indigo-300',
      bgShade: 'bg-indigo-50/75 dark:bg-indigo-950/40 border-indigo-200/80 dark:border-indigo-800/60 hover:bg-indigo-100/70 hover:border-indigo-300',
      iconBg: 'bg-indigo-100/90 dark:bg-indigo-900/60 border-indigo-200/90',
      subPage: 'offices',
    },
    {
      id: 'citizens',
      title: t('মোট নাগরিক', 'Total Citizens'),
      sub: t('নিবন্ধিত একাউন্ট', 'Registered Users'),
      count: totalCitizens,
      icon: Users,
      badge: t('গ্রাহক', 'Citizens'),
      color: 'text-blue-700 dark:text-blue-300',
      bgShade: 'bg-blue-50/75 dark:bg-blue-950/40 border-blue-200/80 dark:border-blue-800/60 hover:bg-blue-100/70 hover:border-blue-300',
      iconBg: 'bg-blue-100/90 dark:bg-blue-900/60 border-blue-200/90',
      subPage: 'citizens',
    },
    {
      id: 'officials',
      title: t('কর্মকর্তা-কর্মচারী', 'Official Employees'),
      sub: t('মাঠ ও প্রশাসনিক পদ', 'Institutional Roles'),
      count: totalOfficials,
      icon: UserCheck,
      badge: t('পদায়নকৃত', 'Deployed'),
      color: 'text-purple-700 dark:text-purple-300',
      bgShade: 'bg-purple-50/75 dark:bg-purple-950/40 border-purple-200/80 dark:border-purple-800/60 hover:bg-purple-100/70 hover:border-purple-300',
      iconBg: 'bg-purple-100/90 dark:bg-purple-900/60 border-purple-200/90',
      subPage: 'officials',
    },
    {
      id: 'mouzas',
      title: t('মোট মৌজা', 'Total Moujas'),
      sub: t('৮ বিভাগ · ১৬ জেলা', '8 Div · 16 Dist'),
      count: totalMouzas,
      icon: Compass,
      badge: t('ক্যাডাস্ট্রাল', 'Cadastral'),
      color: 'text-amber-800 dark:text-amber-300',
      bgShade: 'bg-amber-50/75 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100/70 hover:border-amber-300',
      iconBg: 'bg-amber-100/90 dark:bg-amber-900/60 border-amber-200/90',
      subPage: 'locations',
    },
    {
      id: 'dolil',
      title: t('মোট দলিল', 'Total Deeds'),
      sub: t('নিবন্ধিত বালামভুক্ত', 'Registered Deeds'),
      count: totalDeeds,
      icon: FileCheck2,
      badge: t('লেজার সুরক্ষিত', 'Immutable'),
      color: 'text-emerald-800 dark:text-emerald-300',
      bgShade: 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200/90 dark:border-emerald-800/60 hover:bg-emerald-100/80 hover:border-emerald-300',
      iconBg: 'bg-emerald-100/90 dark:bg-emerald-900/60 border-emerald-200/90',
      subPage: 'deeds',
    },
    {
      id: 'blogs',
      title: t('মোট ব্লগ', 'Total Blogs'),
      sub: t('তথ্য ও নির্দেশিকা', 'Citizen Guides'),
      count: totalBlogs,
      icon: BookOpen,
      badge: t('প্রকাশিত', 'Published'),
      color: 'text-rose-700 dark:text-rose-300',
      bgShade: 'bg-rose-50/75 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800/60 hover:bg-rose-100/70 hover:border-rose-300',
      iconBg: 'bg-rose-100/90 dark:bg-rose-900/60 border-rose-200/90',
      subPage: 'blogs',
    },
    {
      id: 'notices',
      title: t('মোট নোটিশ', 'Total Notices'),
      sub: t('বিজ্ঞপ্তি ও প্রজ্ঞাপন', 'Circulars & Orders'),
      count: totalNotices,
      icon: Bell,
      badge: t('সক্রিয়', 'Active'),
      color: 'text-teal-700 dark:text-teal-300',
      bgShade: 'bg-teal-50/75 dark:bg-teal-950/40 border-teal-200/80 dark:border-teal-800/60 hover:bg-teal-100/70 hover:border-teal-300',
      iconBg: 'bg-teal-100/90 dark:bg-teal-900/60 border-teal-200/90',
      subPage: 'notices',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-2 sm:gap-2.5">
      {cards.map((card) => {
        const IconComponent = card.icon;
        return (
          <div
            key={card.id}
            onClick={() => onNavigateSubPage && onNavigateSubPage(card.subPage)}
            className={`group rounded-xl border ${card.bgShade} shadow-2xs hover:shadow-xs transition-all duration-150 hover:-translate-y-0.5 cursor-pointer p-2.5 sm:p-3 flex flex-col justify-between`}
            title={t(`${card.title} বিস্তারিত দেখুন`, `View ${card.title} details`)}
          >
            {/* Row 1: Icon + Title + Arrow */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 ${card.iconBg} ${card.color}`}>
                  <IconComponent className="size-3.5" />
                </div>
                <span className="text-xs font-bold text-foreground truncate group-hover:text-primary transition">
                  {card.title}
                </span>
              </div>
              <ChevronRight className="size-3 text-muted-foreground/70 group-hover:text-foreground group-hover:translate-x-0.5 transition shrink-0" />
            </div>

            {/* Row 2: Bold Count + Micro Subtitle (Compact, zero waste height) */}
            <div className="flex items-baseline justify-between gap-1.5 mt-2">
              <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-foreground leading-none">
                {toBanglaDigits(card.count, lang)}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium truncate leading-none">
                {card.sub}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
