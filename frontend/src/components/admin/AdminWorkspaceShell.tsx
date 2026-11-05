import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileCheck2,
  Layers,
  Flame,
  ShieldCheck,
  Users,
  Building2,
  Radio,
  Settings,
  Globe,
  HelpCircle,
  LogOut,
  ChevronRight,
  Shield,
  Search,
  ExternalLink,
  Sparkles,
  ArrowRight,
  UserCheck,
  Briefcase,
  KeyRound,
  Newspaper,
  BookOpen,
  Bell,
  User,
  ChevronDown,
  MapPin,
} from 'lucide-react';
import { useAppUI, UserRole } from '@/i18n';
import { toBanglaDigits } from '@/theme/tokens';
import { AdminProfileModal } from './AdminProfileModal';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export type AdminSubPage =
  | 'overview'
  | 'deeds'
  | 'khatians'
  | 'mutations'
  | 'mortgages'
  | 'ledger'
  | 'officials'
  | 'citizens'
  | 'roles'
  | 'users'
  | 'offices'
  | 'locations'
  | 'blogs'
  | 'notices'
  | 'content'
  | 'system'
  | 'settings';

interface AdminWorkspaceShellProps {
  currentSubPage: AdminSubPage;
  onNavigateSubPage: (subPage: string) => void;
  onNavigateMainTab: (tab: string) => void;
  children: React.ReactNode;
}

export const AdminWorkspaceShell: React.FC<AdminWorkspaceShellProps> = ({
  currentSubPage,
  onNavigateSubPage,
  onNavigateMainTab,
  children,
}) => {
  const { lang, setLang, role, user, logout, t } = useAppUI();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const subPageTitles: Record<AdminSubPage, { bn: string; en: string }> = {
    overview: { bn: 'ড্যাশবোর্ড', en: 'Dashboard' },
    deeds: { bn: 'দলিলপত্র', en: 'Deeds' },
    khatians: { bn: 'খতিয়ান ও দাগ', en: 'Khatians & Plots' },
    mutations: { bn: 'নামজারি', en: 'Mutations' },
    mortgages: { bn: 'ব্যাংক মর্টগেজ', en: 'Mortgages' },
    ledger: { bn: 'লেজার ও অডিট', en: 'Ledger Audit' },
    officials: { bn: 'কর্মকর্তাবৃন্দ', en: 'Officials' },
    citizens: { bn: 'নাগরিকবৃন্দ', en: 'Citizens' },
    roles: { bn: 'রোল ও অনুমতি', en: 'Roles & RBAC' },
    users: { bn: 'কর্মকর্তাবৃন্দ', en: 'Officials' },
    offices: { bn: 'ভূমি অফিস', en: 'Land Offices' },
    locations: { bn: 'ভৌগোলিক এলাকা ও স্তর', en: 'Geo Locations' },
    blogs: { bn: 'ব্লগ', en: 'Blogs' },
    notices: { bn: 'নোটিশ', en: 'Notices' },
    content: { bn: 'ব্লগ ও নোটিশ', en: 'Blog & Notices' },
    system: { bn: 'সিস্টেম ব্রডকাস্ট', en: 'Broadcast' },
    settings: { bn: 'সেটিংস', en: 'Settings' },
  };

  const navItems = [
    { id: 'overview', titleBn: 'ড্যাশবোর্ড', titleEn: 'Dashboard', icon: LayoutDashboard },
    { id: 'deeds', titleBn: 'দলিলপত্র', titleEn: 'Deeds', icon: FileCheck2 },
    { id: 'khatians', titleBn: 'খতিয়ান ও দাগ', titleEn: 'Khatians & Plots', icon: Layers },
    { id: 'mutations', titleBn: 'নামজারি', titleEn: 'Mutations', icon: Flame },
    { id: 'ledger', titleBn: 'লেজার ও অডিট', titleEn: 'Ledger Audit', icon: ShieldCheck },
    { id: 'officials', titleBn: 'কর্মকর্তাবৃন্দ', titleEn: 'Officials', icon: Briefcase },
    { id: 'citizens', titleBn: 'নাগরিকবৃন্দ', titleEn: 'Citizens', icon: UserCheck },
    { id: 'offices', titleBn: 'ভূমি অফিস', titleEn: 'Land Offices', icon: Building2 },
    { id: 'locations', titleBn: 'ভৌগোলিক এলাকা', titleEn: 'Geo Locations', icon: MapPin },
    { id: 'roles', titleBn: 'রোল ও অনুমতি', titleEn: 'Roles & RBAC', icon: KeyRound },
    { id: 'blogs', titleBn: 'ব্লগ', titleEn: 'Blogs', icon: BookOpen },
    { id: 'notices', titleBn: 'নোটিশ', titleEn: 'Notices', icon: Bell },
    { id: 'system', titleBn: 'সিস্টেম ব্রডকাস্ট', titleEn: 'Broadcast', icon: Radio },
    { id: 'settings', titleBn: 'সেটিংস', titleEn: 'Settings', icon: Settings },
  ];

  return (
    <SidebarProvider defaultOpen={true} className="h-screen max-h-screen overflow-hidden w-full bg-background text-foreground antialiased font-sans">
      {/* Modern Enterprise Sidebar */}
      <Sidebar collapsible="icon" className="border-r border-border/80 bg-card">
          <SidebarHeader className="border-b border-border/60 pb-3">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  className="data-[slot=sidebar-menu-button]:!p-2 hover:bg-muted/60"
                  onClick={() => onNavigateSubPage('overview')}
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#006A4E] text-white">
                    <Shield className="size-5" />
                  </div>
                  <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-black text-sm text-[#006A4E] dark:text-emerald-400">
                      ভূমি সুরক্ষা ২.০
                    </span>
                    <span className="truncate text-[11px] font-semibold text-muted-foreground">
                      {t('জাতীয় প্রশাসন কনসোল', 'National Admin Console')}
                    </span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent className="px-2 py-3">
            {/* Core Administrative Pages */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2">
                {t('প্রশাসন ও সেবা', 'Administration')}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentSubPage === item.id;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={isActive}
                          tooltip={lang === 'bn' ? item.titleBn : item.titleEn}
                          onClick={() => onNavigateSubPage(item.id)}
                          className={isActive ? 'bg-[#006A4E] text-white font-bold hover:bg-[#00553e] hover:text-white' : 'font-medium'}
                        >
                          <Icon className="size-4" />
                          <span>{lang === 'bn' ? item.titleBn : item.titleEn}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Quick Escape to Citizen Portal */}
            <SidebarGroup className="mt-auto">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip={t('নাগরিক পোর্টালে ফিরে যান', 'Exit to Citizen Portal')}
                      onClick={() => onNavigateMainTab('landing')}
                      className="font-semibold text-xs border border-border/60 hover:bg-muted"
                    >
                      <Globe className="size-4 text-emerald-600" />
                      <span>{t('নাগরিক পোর্টাল', 'Citizen Portal')}</span>
                      <ExternalLink className="size-3 ml-auto text-muted-foreground" />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          {/* Footer User Profile */}
          <SidebarFooter className="border-t border-border/60 p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    >
                      <Avatar className="h-8 w-8 rounded-lg bg-emerald-700 text-white font-bold text-xs">
                        <AvatarFallback>
                          {user?.username?.substring(0, 2)?.toUpperCase() || 'AD'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-xs leading-tight">
                        <span className="truncate font-bold text-foreground">
                          {t('প্রোফাইল', 'Profile')}
                        </span>
                      </div>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" side="right" sideOffset={8}>
                    <DropdownMenuLabel className="text-xs font-bold">
                      {t('অ্যাডমিন অ্যাকাউন্ট কনসোল', 'Admin Account Console')}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)} className="cursor-pointer">
                        <User className="size-4 mr-2 text-emerald-700" />
                        <span className="font-bold text-foreground">{t('প্রোফাইল বিবরণ', 'Profile Details')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onNavigateSubPage('officials')}>
                        <Briefcase className="size-4 mr-2 text-muted-foreground" />
                        <span>{t('কর্মকর্তাবৃন্দ', 'Officials')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onNavigateSubPage('citizens')}>
                        <UserCheck className="size-4 mr-2 text-muted-foreground" />
                        <span>{t('নাগরিকবৃন্দ', 'Citizens')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onNavigateSubPage('roles')}>
                        <KeyRound className="size-4 mr-2 text-muted-foreground" />
                        <span>{t('রোল ও অনুমতি', 'Roles & RBAC')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onNavigateSubPage('blogs')}>
                        <BookOpen className="size-4 mr-2 text-muted-foreground" />
                        <span>{t('ব্লগ', 'Blogs')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onNavigateSubPage('notices')}>
                        <Bell className="size-4 mr-2 text-muted-foreground" />
                        <span>{t('নোটিশ', 'Notices')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onNavigateSubPage('system')}>
                        <Radio className="size-4 mr-2 text-muted-foreground" />
                        <span>{t('সিস্টেম ব্রডকাস্ট', 'Broadcast & Security')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onNavigateSubPage('settings')}>
                        <Settings className="size-4 mr-2 text-muted-foreground" />
                        <span>{t('সেটিংস', 'Settings')}</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onNavigateMainTab('landing')}>
                      <Globe className="size-4 mr-2 text-emerald-600" />
                      <span>{t('নাগরিক পোর্টালে যান', 'Exit to Citizen Portal')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        logout();
                        onNavigateMainTab('auth');
                      }}
                      className="text-rose-600 focus:text-rose-700"
                    >
                      <LogOut className="size-4 mr-2" />
                      <span>{t('লগআউট', 'Sign Out')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Inset Main Container */}
        <SidebarInset className="flex flex-col flex-1 min-w-0 min-h-0 bg-background overflow-hidden">
          {/* Top Site Header */}
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-6 shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground shrink-0" />
              <Separator orientation="vertical" className="h-4 mx-1 shrink-0" />
              <Breadcrumb className="truncate min-w-0">
                <BreadcrumbList className="text-xs flex-nowrap truncate">
                  <BreadcrumbItem className="shrink-0">
                    <BreadcrumbLink
                      onClick={() => onNavigateMainTab('landing')}
                      className="cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                      {t('হোম', 'Home')}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="shrink-0" />
                  <BreadcrumbItem className="shrink-0">
                    <BreadcrumbLink
                      onClick={() => onNavigateSubPage('overview')}
                      className="cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                      {t('প্রশাসন কনসোল', 'Admin Console')}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="shrink-0" />
                  <BreadcrumbItem className="truncate min-w-0">
                    <BreadcrumbPage className="font-bold text-foreground truncate">
                      {lang === 'bn'
                        ? subPageTitles[currentSubPage]?.bn
                        : subPageTitles[currentSubPage]?.en}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Live Ledger Status Badge */}
              <Badge variant="outline" className="hidden md:inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 text-xs font-mono border-emerald-300 text-emerald-800 bg-emerald-50">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{toBanglaDigits('97.8', lang)}% {t('অক্ষত লেজার', 'Intact')}</span>
              </Badge>

              {/* Language Switcher */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
                className="h-8 px-2.5 text-xs font-bold shrink-0"
              >
                {lang === 'bn' ? 'English' : 'বাংলা'}
              </Button>

              {/* Super Admin Profile Menu in Header */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 px-2.5 text-xs font-bold text-foreground border-border/80 hover:bg-accent shrink-0 rounded-lg cursor-pointer"
                  >
                    <User className="size-3.5 text-emerald-700" />
                    <span>{t('প্রোফাইল', 'Profile')}</span>
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 p-1.5 shadow-lg">
                  <DropdownMenuItem
                    onClick={() => setIsProfileModalOpen(true)}
                    className="cursor-pointer text-xs font-semibold py-1.5"
                  >
                    <User className="size-4 mr-2 text-emerald-700" />
                    <span>{t('প্রোফাইল বিবরণ', 'Profile Details')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onNavigateSubPage('settings')}
                    className="cursor-pointer text-xs font-medium py-1.5"
                  >
                    <Settings className="size-4 mr-2 text-muted-foreground" />
                    <span>{t('সেটিংস', 'Settings')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      logout();
                      onNavigateMainTab('auth');
                    }}
                    className="text-rose-600 focus:text-rose-700 cursor-pointer text-xs font-medium py-1.5"
                  >
                    <LogOut className="size-4 mr-2" />
                    <span>{t('লগআউট', 'Sign Out')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Subpage Content Area */}
          <div
            className={cn(
              "flex-1 min-h-0 min-w-0 flex flex-col",
              ['deeds', 'khatians', 'mutations', 'citizens', 'offices', 'locations', 'roles', 'officials', 'users', 'blogs', 'notices'].includes(currentSubPage)
                ? "overflow-hidden"
                : "overflow-y-auto overflow-x-hidden"
            )}
          >
            {children}
          </div>
        </SidebarInset>

        {/* Super Admin Dedicated Profile Modal */}
        <AdminProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
    </SidebarProvider>
  );
};
