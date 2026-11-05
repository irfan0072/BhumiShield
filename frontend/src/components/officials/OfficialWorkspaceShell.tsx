import React from 'react';
import {
  FileCheck2,
  Building2,
  Landmark,
  Scale,
  ShieldAlert,
  Shield,
  Gavel,
  FileText,
  BookOpen,
  Layers,
  QrCode,
  Calculator,
  ListChecks,
  Flame,
  FileSearch,
  Compass,
  LayoutDashboard,
  Search,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  PlusCircle,
  UserCheck,
  AlertTriangle,
  Globe,
  ExternalLink,
  LogOut,
  ArrowRight,
  Briefcase,
  KeyRound,
  User,
} from 'lucide-react';
import { useAppUI, UserRole } from '@/i18n';
import { toBanglaDigits } from '@/theme/tokens';
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

export type OfficialWorkspaceType = 'registrar' | 'acland' | 'bank' | 'lawyer' | 'specialist';

interface NavItemConfig {
  id: string;
  titleBn: string;
  titleEn: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface WorkspaceConfig {
  titleBn: string;
  titleEn: string;
  deptBn: string;
  deptEn: string;
  groupBn: string;
  groupEn: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultTab: string;
  navItems: NavItemConfig[];
}

const WORKSPACE_CONFIGS: Record<OfficialWorkspaceType, WorkspaceConfig> = {
  registrar: {
    titleBn: 'সাব-রেজিস্ট্রি',
    titleEn: 'Sub-Registry',
    deptBn: 'আইন ও বিচার বিভাগ',
    deptEn: 'Ministry of Law',
    groupBn: 'কার্যক্রম ও সেবা',
    groupEn: 'Services & Modules',
    icon: FileCheck2,
    defaultTab: 'overview',
    navItems: [
      { id: 'overview', titleBn: 'ড্যাশবোর্ড', titleEn: 'Dashboard', icon: LayoutDashboard },
      { id: 'held', titleBn: 'এজলাস শুনানি', titleEn: 'Hearings', icon: Gavel },
      { id: 'wizard', titleBn: 'নতুন দলিল', titleEn: 'New Deed', icon: FileText },
      { id: 'deeds', titleBn: 'দলিলপত্র', titleEn: 'Deeds', icon: BookOpen },
      { id: 'khatian', titleBn: 'খতিয়ান ও দাগ', titleEn: 'Khatian & Dag', icon: Layers },
      { id: 'verifier', titleBn: 'দলিল যাচাই', titleEn: 'Verify Deed', icon: QrCode },
      { id: 'fees', titleBn: 'ফি ক্যালকুলেটর', titleEn: 'Fee Calculator', icon: Calculator },
      { id: 'onboarding', titleBn: 'অনবোর্ডিং', titleEn: 'Onboarding', icon: ListChecks },
    ],
  },
  acland: {
    titleBn: 'সহকারী কমিশনার (ভূমি)',
    titleEn: 'AC Land Court',
    deptBn: 'ভূমি মন্ত্রণালয়',
    deptEn: 'Ministry of Land',
    groupBn: 'কার্যক্রম ও সেবা',
    groupEn: 'Services & Modules',
    icon: Building2,
    defaultTab: 'overview',
    navItems: [
      { id: 'overview', titleBn: 'ড্যাশবোর্ড', titleEn: 'Dashboard', icon: LayoutDashboard },
      { id: 'mutations', titleBn: 'নামজারি কেস', titleEn: 'Mutations', icon: Flame },
      { id: 'khatians', titleBn: 'খতিয়ান ও দাগ', titleEn: 'Khatian & Dag', icon: Layers },
      { id: 'disputes', titleBn: 'বিরোধ ও শুনানি', titleEn: 'Disputes & Hearings', icon: Gavel },
      { id: 'field_reports', titleBn: 'ফিল্ড রিপোর্ট', titleEn: 'Field Reports', icon: FileSearch },
      { id: 'survey_batches', titleBn: 'জরিপ গেজেট', titleEn: 'Survey Batches', icon: Compass },
      { id: 'sla_overview', titleBn: 'এসএলএ মনিটর', titleEn: 'SLA Monitor', icon: LayoutDashboard },
      { id: 'appeals', titleBn: 'মিস কেস ও আপিল', titleEn: 'Appeals', icon: Scale },
      { id: 'explorer', titleBn: 'খতিয়ান তল্লাশি', titleEn: 'Search Khatian', icon: Search },
      { id: 'verifier', titleBn: 'দলিল নিরাপত্তা', titleEn: 'Deed Security', icon: ShieldCheck },
      { id: 'onboarding', titleBn: 'অনবোর্ডিং', titleEn: 'Onboarding', icon: CheckCircle2 },
    ],
  },
  bank: {
    titleBn: 'ব্যাংক জামানত ডেস্ক',
    titleEn: 'Bank Mortgage Desk',
    deptBn: 'জামানত ও ঋণ শাখা',
    deptEn: 'Credit & Collateral',
    groupBn: 'কার্যক্রম ও সেবা',
    groupEn: 'Services & Modules',
    icon: Landmark,
    defaultTab: 'overview',
    navItems: [
      { id: 'overview', titleBn: 'ড্যাশবোর্ড', titleEn: 'Dashboard', icon: LayoutDashboard },
      { id: 'mortgages', titleBn: 'বন্ধকী জমি', titleEn: 'Mortgages', icon: FileSpreadsheet },
      { id: 'new_lien', titleBn: 'নতুন বন্ধক', titleEn: 'New Lien', icon: PlusCircle },
      { id: 'noc', titleBn: 'অনাপত্তি সনদ (NOC)', titleEn: 'NOC Releases', icon: ShieldCheck },
      { id: 'khatian', titleBn: 'খতিয়ান তল্লাশি', titleEn: 'Title Search', icon: Layers },
    ],
  },
  lawyer: {
    titleBn: 'আইনজীবী পোর্টাল',
    titleEn: 'Legal Counsel Portal',
    deptBn: 'দেওয়ানি আদালত ডেস্ক',
    deptEn: 'Civil Court Desk',
    groupBn: 'কার্যক্রম ও সেবা',
    groupEn: 'Services & Modules',
    icon: Scale,
    defaultTab: 'overview',
    navItems: [
      { id: 'overview', titleBn: 'ড্যাশবোর্ড', titleEn: 'Dashboard', icon: LayoutDashboard },
      { id: 'step1', titleBn: 'বার সনদ যাচাই', titleEn: 'Bar License', icon: UserCheck },
      { id: 'step2', titleBn: 'মামলার তথ্য', titleEn: 'Suit Details', icon: AlertTriangle },
      { id: 'step3', titleBn: 'নিষেধাজ্ঞা আরজি', titleEn: 'Injunction Petition', icon: Gavel },
    ],
  },
  specialist: {
    titleBn: 'ভূমি অধিগ্রহণ শাখা',
    titleEn: 'Land Acquisition Wing',
    deptBn: 'জেলা প্রশাসন',
    deptEn: 'DC Office',
    groupBn: 'কার্যক্রম ও সেবা',
    groupEn: 'Services & Modules',
    icon: ShieldAlert,
    defaultTab: 'overview',
    navItems: [
      { id: 'overview', titleBn: 'ড্যাশবোর্ড', titleEn: 'Dashboard', icon: LayoutDashboard },
      { id: 'la_cases', titleBn: 'অধিগ্রহণ কেস', titleEn: 'LA Cases', icon: Building2 },
      { id: 'title_scrutiny', titleBn: 'টাইটেল যাচাই', titleEn: 'Title Scrutiny', icon: FileCheck2 },
    ],
  },
};

interface OfficialWorkspaceShellProps {
  workspaceType: OfficialWorkspaceType;
  currentSubPage?: string;
  onNavigateSubPage?: (subPage: string) => void;
  onNavigateMainTab: (tab: string) => void;
  children: React.ReactNode;
}

export const OfficialWorkspaceShell: React.FC<OfficialWorkspaceShellProps> = ({
  workspaceType,
  currentSubPage,
  onNavigateSubPage,
  onNavigateMainTab,
  children,
}) => {
  const { lang, setLang, role, user, logout, activeSubTab, setActiveSubTab, t } = useAppUI();
  const config = WORKSPACE_CONFIGS[workspaceType];

  // Resolve initial sub-page from URL if not explicitly provided
  const getInitialSubPage = (): string => {
    if (typeof window === 'undefined') return config.defaultTab;
    const path = window.location.pathname.toLowerCase();
    const search = new URLSearchParams(window.location.search);
    const tabParam = search.get('tab') || search.get('sub');

    // 1. Check if explicit tabParam matches any configured nav item (including 'overview')
    if (tabParam && config.navItems.some((item) => item.id === tabParam)) {
      return tabParam;
    }

    if (workspaceType === 'registrar') {
      if (path.includes('/wizard') || path.includes('/new-deed')) return 'wizard';
      if (path.includes('/deeds') || path.includes('/balam')) return 'deeds';
      if (path.includes('/fees') || path.includes('/calculator')) return 'fees';
      if (path.includes('/khatian')) return 'khatian';
      if (path.includes('/verifier')) return 'verifier';
      if (path.includes('/onboarding') || path.includes('/batch')) return 'onboarding';
      if (path.includes('/held') || path.includes('/hearing')) return 'held';
      return config.defaultTab;
    }

    if (workspaceType === 'acland') {
      if (path.includes('/mutations')) return 'mutations';
      if (path.includes('/khatian') || path.includes('/plot')) return 'khatians';
      if (path.includes('/dispute') || path.includes('/tribunal')) return 'disputes';
      if (path.includes('/field') || path.includes('/surveyor')) return 'field_reports';
      if (path.includes('/survey') || path.includes('/batch')) return 'survey_batches';
      if (path.includes('/sla') || path.includes('/metric')) return 'sla_overview';
      if (path.includes('/appeal') || path.includes('/miss')) return 'appeals';
      if (path.includes('/explorer') || path.includes('/search')) return 'explorer';
      if (path.includes('/verifier') || path.includes('/security')) return 'verifier';
      if (path.includes('/onboarding')) return 'onboarding';
      return config.defaultTab;
    }

    if (workspaceType === 'bank') {
      if (path.includes('/new') || path.includes('/lien') || path.includes('/create')) return 'new_lien';
      if (path.includes('/noc') || path.includes('/release')) return 'noc';
      if (path.includes('/khatian') || path.includes('/title')) return 'khatian';
      if (path.includes('/mortgage')) return 'mortgages';
      return config.defaultTab;
    }

    if (workspaceType === 'lawyer') {
      if (path.includes('/suit') || path.includes('/dispute') || path.includes('/step2')) return 'step2';
      if (path.includes('/injunction') || path.includes('/petition') || path.includes('/docket') || path.includes('/step3')) return 'step3';
      if (path.includes('/license') || path.includes('/bar') || path.includes('/step1')) return 'step1';
      return config.defaultTab;
    }

    if (workspaceType === 'specialist') {
      if (path.includes('/scrutiny') || path.includes('/title')) return 'title_scrutiny';
      if (path.includes('/la') || path.includes('/cases')) return 'la_cases';
      return config.defaultTab;
    }

    return config.defaultTab;
  };

  const [subPage, setSubPage] = React.useState<string>(() => currentSubPage || getInitialSubPage());

  React.useEffect(() => {
    if (currentSubPage && currentSubPage !== subPage) {
      setSubPage(currentSubPage);
    }
  }, [currentSubPage]);

  // Keep subPage in sync with browser back/forward buttons
  React.useEffect(() => {
    const handlePop = () => {
      const initial = getInitialSubPage();
      setSubPage(initial);
      setActiveSubTab(initial);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [workspaceType]);

  const currentTab = subPage;
  const currentItem = config.navItems.find((item) => item.id === currentTab) || config.navItems[0];
  const OrgIcon = config.icon;

  const handleSubTabClick = (tabId: string) => {
    setSubPage(tabId);
    setActiveSubTab(tabId);

    // Push new subpage URL into browser history for genuine multi-page experience
    const baseSegment = workspaceType === 'lawyer' ? 'lawyer-case' : workspaceType;
    let slug = tabId;
    if (tabId === 'field_reports') slug = 'field-reports';
    if (tabId === 'survey_batches') slug = 'survey';
    if (tabId === 'sla_overview') slug = 'sla';
    if (tabId === 'new_lien') slug = 'new-lien';
    if (tabId === 'la_cases') slug = 'la-cases';
    if (tabId === 'title_scrutiny') slug = 'scrutiny';
    if (tabId === 'step1') slug = 'license';
    if (tabId === 'step2') slug = 'suit';
    if (tabId === 'step3') slug = 'injunction';

    const newUrl = tabId === config.defaultTab ? `/${lang}/${baseSegment}` : `/${lang}/${baseSegment}/${slug}`;
    if (window.location.pathname !== newUrl) {
      window.history.pushState({ officialSubPage: tabId }, '', newUrl);
    }

    if (onNavigateSubPage) {
      onNavigateSubPage(tabId);
    }
  };

  const isSuperAdminMode = typeof window !== 'undefined' && localStorage.getItem('bs_superadmin_mode') === '1';

  const handleReturnToAdmin = () => {
    const origToken = localStorage.getItem('bs_admin_original_token');
    const origUser = localStorage.getItem('bs_admin_original_user');
    if (origToken) {
      localStorage.setItem('bs_token', origToken);
      localStorage.removeItem('bs_superadmin_mode');
      if (origUser) localStorage.setItem('bs_user', origUser);
      localStorage.setItem('bs_role', 'admin');
    }
    window.location.href = `/${lang}/admin/officials`;
  };

  return (
    <SidebarProvider defaultOpen={true} className="min-h-screen w-full bg-background text-foreground antialiased font-sans">
      {/* Official Enterprise Sidebar */}
      <Sidebar collapsible="icon" className="border-r border-border/80 bg-card">
        {/* Header with Institutional Branding */}
        <SidebarHeader className="border-b border-border/60 pb-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="data-[slot=sidebar-menu-button]:!p-2 hover:bg-muted/60"
                onClick={() => handleSubTabClick(config.defaultTab)}
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#006A4E] text-white shrink-0">
                  <OrgIcon className="size-5" />
                </div>
                <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-black text-sm text-[#006A4E] dark:text-emerald-400">
                    {lang === 'bn' ? config.titleBn : config.titleEn}
                  </span>
                  <span className="truncate text-[10px] font-semibold text-muted-foreground">
                    {lang === 'bn' ? config.deptBn : config.deptEn}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* Content with Grouped Statutory Modules */}
        <SidebarContent className="px-2 py-3">
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2">
              {lang === 'bn' ? config.groupBn : config.groupEn}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {config.navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={lang === 'bn' ? item.titleBn : item.titleEn}
                        onClick={() => handleSubTabClick(item.id)}
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

          {/* Quick Exit to Citizen Portal */}
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={t('নাগরিক পোর্টালে যান', 'Exit to Citizen Portal')}
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

        {/* Footer Official Profile */}
        <SidebarFooter className="border-t border-border/60 p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-8 w-8 rounded-lg bg-emerald-700 text-white font-bold text-xs flex items-center justify-center">
                      <AvatarFallback>
                        <User className="size-4 text-white" />
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
                    {lang === 'bn' ? config.titleBn : config.titleEn}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    {config.navItems.map((item) => (
                      <DropdownMenuItem key={item.id} onClick={() => handleSubTabClick(item.id)}>
                        <item.icon className="size-4 mr-2 text-muted-foreground" />
                        <span>{lang === 'bn' ? item.titleBn : item.titleEn}</span>
                      </DropdownMenuItem>
                    ))}
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

      {/* Main Content Inset */}
      <SidebarInset className="flex flex-col flex-1 min-w-0 bg-background">
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
                    onClick={() => handleSubTabClick(config.defaultTab)}
                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    {lang === 'bn' ? config.titleBn : config.titleEn}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="shrink-0" />
                <BreadcrumbItem className="truncate min-w-0">
                  <BreadcrumbPage className="font-bold text-foreground truncate">
                    {lang === 'bn' ? currentItem?.titleBn : currentItem?.titleEn}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Live Operational Status */}
            <Badge variant="outline" className="hidden sm:inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 text-xs font-mono border-emerald-300 text-emerald-800 bg-emerald-50">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t('সক্রিয় সেশন', 'Active')}</span>
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

            {/* Exit to Citizen Portal Button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onNavigateMainTab('landing')}
              className="h-8 gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 shrink-0"
            >
              <span>{t('নাগরিক পোর্টাল', 'Citizen View')}</span>
              <ArrowRight className="size-3" />
            </Button>
          </div>
        </header>

        {/* Super Admin Impersonation Notice Bar */}
        {isSuperAdminMode && (
          <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white px-4 py-2.5 border-b border-purple-700/60 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping shrink-0" />
              <span className="font-bold text-purple-200">
                {t('সুপার অ্যাডমিন ইমপার্সোনেশন মোড:', 'Super Admin Impersonation Mode:')}
              </span>
              <span className="text-white font-medium">
                {t(
                  `আপনি বর্তমানে "${user?.full_name_bn || user?.username}" (${lang === 'bn' ? config.titleBn : config.titleEn})-এর দাপ্তরিক ডেস্কে কর্মরত আছেন।`,
                  `You are currently working in the official workspace of "${user?.full_name_en || user?.username}" (${config.titleEn}).`
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={handleReturnToAdmin}
              className="bg-white text-purple-950 hover:bg-purple-50 font-bold text-xs px-3.5 py-1.5 rounded-lg transition shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>{t('অ্যাডমিন কনসোলে ফিরে যান →', 'Return to Admin Console →')}</span>
            </button>
          </div>
        )}

        {/* Subpage Content Area - Streamlined Single-Screen Viewport */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 p-3 sm:p-4 lg:p-5 max-w-7xl w-full mx-auto pb-6">
          {React.isValidElement(children)
            ? React.cloneElement(children as React.ReactElement<any>, {
                currentSubPage: subPage,
                onNavigateSubPage: handleSubTabClick,
              })
            : children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};
