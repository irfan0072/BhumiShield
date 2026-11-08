import React from 'react';
import {
  AlertTriangle,
  BookOpen,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronRight,
  ChevronsUpDown,
  Compass,
  FileCheck2,
  FileSearch,
  FileSpreadsheet,
  FileText,
  Gavel,
  Globe,
  Landmark,
  Layers,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Minus,
  Plus,
  PlusCircle,
  QrCode,
  RefreshCcw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Timer,
  Type,
  User,
  UserCheck,
  Undo2,
} from 'lucide-react';
import { Toaster } from 'sonner';
import { useAppUI } from '@/i18n';
import { cn } from '@/lib/utils';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { AdminProfileModal } from '@/components/admin/AdminProfileModal';

export type OfficialWorkspaceType = 'registrar' | 'acland' | 'bank' | 'lawyer' | 'specialist';

/* ------------------------------------------------------------------ */
/* Menu configuration                                                  */
/* ------------------------------------------------------------------ */

interface NavItem {
  id: string;
  bn: string;
  en: string;
  icon: React.ElementType;
  /** Roles that see this item in the menu. Omit = everyone in this workspace. Admins always see all. */
  roles?: string[];
}
interface NavGroup {
  id: string;
  bn: string;
  en: string;
  items: NavItem[];
}
interface WorkspaceConfig {
  bn: string;
  en: string;
  icon: React.ElementType;
  defaultTab: string;
  groups: NavGroup[];
}

const CHECKER_REG = ['sub_registrar'];
const LAND_CORE = ['ac_land', 'land_office_assistant'];

const WORKSPACES: Record<OfficialWorkspaceType, WorkspaceConfig> = {
  registrar: {
    bn: 'সাব-রেজিস্ট্রি অফিস',
    en: 'Sub-Registry Office',
    icon: FileCheck2,
    defaultTab: 'overview',
    groups: [
      {
        id: 'work',
        bn: 'দৈনিক কাজ',
        en: 'Daily work',
        items: [
          { id: 'overview', bn: 'ড্যাশবোর্ড', en: 'Dashboard', icon: LayoutDashboard },
          { id: 'wizard', bn: 'নতুন দলিল', en: 'New deed', icon: FileText },
          { id: 'held', bn: 'শুনানি', en: 'Hearings', icon: Gavel, roles: CHECKER_REG },
          { id: 'deeds', bn: 'দলিল তালিকা', en: 'Deeds', icon: BookOpen },
        ],
      },
      {
        id: 'tools',
        bn: 'সরঞ্জাম',
        en: 'Tools',
        items: [
          { id: 'khatian', bn: 'খতিয়ান খুঁজুন', en: 'Find khatian', icon: Layers },
          { id: 'verifier', bn: 'দলিল যাচাই', en: 'Verify deed', icon: QrCode },
          { id: 'fees', bn: 'ফি হিসাব', en: 'Fee calculator', icon: Calculator },
          { id: 'onboarding', bn: 'রেকর্ড অনুমোদন', en: 'Record approval', icon: ListChecks, roles: CHECKER_REG },
        ],
      },
    ],
  },
  acland: {
    bn: 'উপজেলা ভূমি অফিস',
    en: 'Upazila Land Office',
    icon: Building2,
    defaultTab: 'overview',
    groups: [
      {
        id: 'cases',
        bn: 'মামলা ও আবেদন',
        en: 'Cases',
        items: [
          { id: 'overview', bn: 'ড্যাশবোর্ড', en: 'Dashboard', icon: LayoutDashboard },
          {
            id: 'mutations',
            bn: 'নামজারি',
            en: 'Mutations',
            icon: RefreshCcw,
            roles: [...LAND_CORE, 'field_verification_officer', 'uno_supervisor', 'appellate_reviewer'],
          },
          { id: 'disputes', bn: 'বিরোধ ও শুনানি', en: 'Disputes', icon: Gavel, roles: [...LAND_CORE, 'uno_supervisor', 'appellate_reviewer'] },
          { id: 'appeals', bn: 'আপিল', en: 'Appeals', icon: Scale, roles: ['ac_land', 'uno_supervisor', 'appellate_reviewer'] },
          { id: 'khatians', bn: 'সমস্যাযুক্ত খতিয়ান', en: 'Flagged khatians', icon: AlertTriangle, roles: LAND_CORE },
        ],
      },
      {
        id: 'field',
        bn: 'মাঠ ও সময়সীমা',
        en: 'Field & deadlines',
        items: [
          {
            id: 'field_reports',
            bn: 'মাঠ প্রতিবেদন',
            en: 'Field reports',
            icon: FileSearch,
            roles: [...LAND_CORE, 'field_verification_officer', 'uno_supervisor'],
          },
          { id: 'sla_overview', bn: 'সময়সীমা তাগিদ', en: 'Deadlines', icon: Timer, roles: [...LAND_CORE, 'uno_supervisor'] },
        ],
      },
      {
        id: 'survey',
        bn: 'জরিপ রেকর্ড',
        en: 'Survey records',
        items: [
          {
            id: 'survey_batches',
            bn: 'জরিপ ব্যাচ',
            en: 'Survey batches',
            icon: Compass,
            roles: ['ac_land', 'settlement_records_officer', 'settlement_checker'],
          },
          { id: 'onboarding', bn: 'রেকর্ড অনুমোদন', en: 'Record approval', icon: CheckCircle2, roles: ['ac_land', 'settlement_checker'] },
        ],
      },
      {
        id: 'tools',
        bn: 'সরঞ্জাম',
        en: 'Tools',
        items: [
          { id: 'explorer', bn: 'খতিয়ান খুঁজুন', en: 'Find khatian', icon: Search },
          { id: 'verifier', bn: 'দলিল যাচাই', en: 'Verify deed', icon: ShieldCheck },
        ],
      },
    ],
  },
  bank: {
    bn: 'ব্যাংক ঋণ ডেস্ক',
    en: 'Bank Loan Desk',
    icon: Landmark,
    defaultTab: 'overview',
    groups: [
      {
        id: 'work',
        bn: 'বন্ধক',
        en: 'Mortgages',
        items: [
          { id: 'overview', bn: 'ড্যাশবোর্ড', en: 'Dashboard', icon: LayoutDashboard },
          { id: 'new_lien', bn: 'নতুন বন্ধক', en: 'New mortgage', icon: PlusCircle },
          { id: 'mortgages', bn: 'বন্ধক তালিকা', en: 'Mortgages', icon: FileSpreadsheet },
          { id: 'noc', bn: 'ছাড়পত্র (NOC)', en: 'Release (NOC)', icon: ShieldCheck },
        ],
      },
      {
        id: 'tools',
        bn: 'সরঞ্জাম',
        en: 'Tools',
        items: [{ id: 'khatian', bn: 'খতিয়ান খুঁজুন', en: 'Find khatian', icon: Layers }],
      },
    ],
  },
  lawyer: {
    bn: 'আইনজীবী পোর্টাল',
    en: 'Lawyer Portal',
    icon: Scale,
    defaultTab: 'overview',
    groups: [
      {
        id: 'work',
        bn: 'মামলা দাখিল',
        en: 'File a case',
        items: [
          { id: 'overview', bn: 'ড্যাশবোর্ড', en: 'Dashboard', icon: LayoutDashboard },
          { id: 'step1', bn: '১. সনদ যাচাই', en: '1. Licence check', icon: UserCheck },
          { id: 'step2', bn: '২. মামলার তথ্য', en: '2. Case details', icon: FileText },
          { id: 'step3', bn: '৩. নিষেধাজ্ঞা আবেদন', en: '3. Injunction', icon: Gavel },
        ],
      },
    ],
  },
  specialist: {
    bn: 'ভূমি অধিগ্রহণ শাখা',
    en: 'Land Acquisition',
    icon: ShieldAlert,
    defaultTab: 'overview',
    groups: [
      {
        id: 'work',
        bn: 'অধিগ্রহণ',
        en: 'Acquisition',
        items: [
          { id: 'overview', bn: 'ড্যাশবোর্ড', en: 'Dashboard', icon: LayoutDashboard },
          { id: 'la_cases', bn: 'অধিগ্রহণ মামলা', en: 'Cases', icon: Building2 },
          { id: 'title_scrutiny', bn: 'মালিকানা যাচাই', en: 'Title check', icon: FileCheck2 },
        ],
      },
    ],
  },
};

/** Short role names shown under the office name. */
const ROLE_LABELS: Record<string, [string, string]> = {
  sub_registrar: ['সাব-রেজিস্ট্রার', 'Sub-Registrar'],
  registry_data_officer: ['দলিল এন্ট্রি কর্মকর্তা', 'Deed entry officer'],
  ac_land: ['সহকারী কমিশনার (ভূমি)', 'AC Land'],
  land_office_assistant: ['ভূমি অফিস সহকারী', 'Land office assistant'],
  field_verification_officer: ['মাঠ কর্মকর্তা', 'Field officer'],
  settlement_records_officer: ['জরিপ রেকর্ড কর্মকর্তা', 'Survey records officer'],
  settlement_checker: ['জরিপ অনুমোদনকারী', 'Survey checker'],
  uno_supervisor: ['ইউএনও', 'UNO'],
  appellate_reviewer: ['আপিল কর্মকর্তা', 'Appeals officer'],
  bank_officer: ['ব্যাংক কর্মকর্তা', 'Bank officer'],
  bank_manager: ['শাখা ব্যবস্থাপক', 'Branch manager'],
  lawyer_court_user: ['আইনজীবী', 'Lawyer'],
  dc_acquisition_officer: ['অধিগ্রহণ কর্মকর্তা', 'Acquisition officer'],
  admin: ['অ্যাডমিন', 'Admin'],
  system_admin: ['অ্যাডমিন', 'Admin'],
};

const ADMIN_ROLES = ['admin', 'system_admin'];

/** Menu groups filtered for the signed-in role. */
export const visibleOfficialNav = (workspace: OfficialWorkspaceType, role: string): NavGroup[] =>
  WORKSPACES[workspace].groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => !i.roles || ADMIN_ROLES.includes(role) || i.roles.includes(role)),
    }))
    .filter((g) => g.items.length > 0);

/* URL slugs per sub-page (kept from the previous shell so old links keep working). */
const SLUGS: Record<string, string> = {
  field_reports: 'field-reports',
  survey_batches: 'survey',
  sla_overview: 'sla',
  new_lien: 'new-lien',
  la_cases: 'la-cases',
  title_scrutiny: 'scrutiny',
  step1: 'license',
  step2: 'suit',
  step3: 'injunction',
};

const resolveFromUrl = (workspaceType: OfficialWorkspaceType): string => {
  const config = WORKSPACES[workspaceType];
  if (typeof window === 'undefined') return config.defaultTab;
  const path = window.location.pathname.toLowerCase();
  const search = new URLSearchParams(window.location.search);
  // `section` is written by useAppUI().setActiveSubTab during in-app navigation.
  const tabParam = search.get('tab') || search.get('sub') || search.get('section');
  const allIds = config.groups.flatMap((g) => g.items.map((i) => i.id));
  if (tabParam && allIds.includes(tabParam)) return tabParam;

  const has = (...parts: string[]) => parts.some((p) => path.includes(p));
  switch (workspaceType) {
    case 'registrar':
      if (has('/wizard', '/new-deed')) return 'wizard';
      if (has('/deeds', '/balam')) return 'deeds';
      if (has('/fees', '/calculator')) return 'fees';
      if (has('/khatian')) return 'khatian';
      if (has('/verifier')) return 'verifier';
      if (has('/onboarding', '/batch')) return 'onboarding';
      if (has('/held', '/hearing')) return 'held';
      break;
    case 'acland':
      if (has('/mutations')) return 'mutations';
      if (has('/khatian', '/plot')) return 'khatians';
      if (has('/dispute', '/tribunal')) return 'disputes';
      if (has('/field', '/surveyor')) return 'field_reports';
      if (has('/survey', '/batch')) return 'survey_batches';
      if (has('/sla', '/metric')) return 'sla_overview';
      if (has('/appeal', '/miss')) return 'appeals';
      if (has('/explorer', '/search')) return 'explorer';
      if (has('/verifier', '/security')) return 'verifier';
      if (has('/onboarding')) return 'onboarding';
      break;
    case 'bank':
      if (has('/new', '/lien', '/create')) return 'new_lien';
      if (has('/noc', '/release')) return 'noc';
      if (has('/khatian', '/title')) return 'khatian';
      if (has('/mortgage')) return 'mortgages';
      break;
    case 'lawyer':
      if (has('/suit', '/dispute', '/step2')) return 'step2';
      if (has('/injunction', '/petition', '/docket', '/step3')) return 'step3';
      if (has('/license', '/bar', '/step1')) return 'step1';
      break;
    case 'specialist':
      if (has('/scrutiny', '/title')) return 'title_scrutiny';
      if (has('/la-cases', '/cases')) return 'la_cases';
      break;
  }
  return config.defaultTab;
};

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

const useDisplayName = () => {
  const { user, lang } = useAppUI();
  const name = lang === 'bn' ? user?.full_name_bn || user?.full_name_en : user?.full_name_en || user?.full_name_bn;
  return (name || user?.username || '—').replace(/\s*\(.*\)\s*$/, '');
};

const AccountMenu: React.FC<{ onOpenProfile: () => void; onNavigateMainTab: (tab: string) => void }> = ({
  onOpenProfile,
  onNavigateMainTab,
}) => {
  const { t, logout, fontStep, increaseFont, decreaseFont } = useAppUI();
  return (
    <>
      <DropdownMenuItem onClick={onOpenProfile} className="cursor-pointer gap-2">
        <User className="size-4" />
        {t('আমার প্রোফাইল', 'My profile')}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onNavigateMainTab('landing')} className="cursor-pointer gap-2">
        <Globe className="size-4" />
        {t('ওয়েবসাইট দেখুন', 'Open website')}
      </DropdownMenuItem>
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
        <Type className="size-4 text-slate-500" />
        <span className="flex-1 text-slate-700">{t('লেখার আকার', 'Text size')}</span>
        <button
          type="button"
          onClick={decreaseFont}
          disabled={fontStep === 0}
          aria-label={t('ছোট', 'Smaller')}
          className="flex size-7 items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
        >
          <Minus className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={increaseFont}
          disabled={fontStep === 2}
          aria-label={t('বড়', 'Larger')}
          className="flex size-7 items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => {
          logout();
          onNavigateMainTab('auth');
        }}
        className="cursor-pointer gap-2 text-rose-600 focus:bg-rose-50 focus:text-rose-700"
      >
        <LogOut className="size-4" />
        {t('লগআউট', 'Sign out')}
      </DropdownMenuItem>
    </>
  );
};

const OfficialSidebar: React.FC<{
  workspaceType: OfficialWorkspaceType;
  groups: NavGroup[];
  current: string;
  onSelect: (id: string) => void;
  onOpenSearch: () => void;
  onOpenProfile: () => void;
  onNavigateMainTab: (tab: string) => void;
}> = ({ workspaceType, groups, current, onSelect, onOpenSearch, onOpenProfile, onNavigateMainTab }) => {
  const { lang, t, role } = useAppUI();
  const { isMobile, setOpenMobile } = useSidebar();
  const config = WORKSPACES[workspaceType];
  const OrgIcon = config.icon;
  const displayName = useDisplayName();
  const roleLabel = ROLE_LABELS[role]?.[lang === 'bn' ? 0 : 1] || role;

  const go = (id: string) => {
    onSelect(id);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200">
      <SidebarHeader className="gap-2 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={() => go(config.defaultTab)} className="cursor-pointer">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#006A4E] text-white">
                <OrgIcon className="size-4" />
              </span>
              <span className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate text-sm font-semibold text-slate-900">{lang === 'bn' ? config.bn : config.en}</span>
                <span className="truncate text-xs text-slate-500">{roleLabel}</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onOpenSearch}
              tooltip={t('খুঁজুন', 'Search')}
              className="h-8 cursor-pointer border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            >
              <Search className="size-4" />
              <span className="flex-1">{t('খুঁজুন…', 'Search…')}</span>
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1 text-[10px] text-slate-400 group-data-[collapsible=icon]:hidden">
                Ctrl K
              </kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0 scrollbar-thin">
        {groups.map((group, gi) => (
          <SidebarGroup key={group.id} className="py-1">
            {(gi > 0 || groups.length > 1) && (
              <SidebarGroupLabel className="text-xs text-slate-500">{lang === 'bn' ? group.bn : group.en}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const title = lang === 'bn' ? item.bn : item.en;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={current === item.id}
                        tooltip={title}
                        onClick={() => go(item.id)}
                        className="cursor-pointer text-slate-700 data-[active=true]:bg-emerald-50 data-[active=true]:font-medium data-[active=true]:text-[#006A4E]"
                      >
                        <Icon className="size-4" />
                        <span>{title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-100 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="cursor-pointer data-[state=open]:bg-slate-100">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-[#006A4E] text-xs font-semibold text-white">
                      {displayName.substring(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="grid min-w-0 flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-medium text-slate-800">{displayName}</span>
                    <span className="truncate text-xs text-slate-500">{roleLabel}</span>
                  </span>
                  <ChevronsUpDown className="size-4 text-slate-400" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side={isMobile ? 'top' : 'right'} align="end" sideOffset={8} className="w-60">
                <DropdownMenuLabel className="truncate text-sm font-medium">{displayName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <AccountMenu onOpenProfile={onOpenProfile} onNavigateMainTab={onNavigateMainTab} />
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

const MobileDock: React.FC<{ groups: NavGroup[]; current: string; onSelect: (id: string) => void }> = ({
  groups,
  current,
  onSelect,
}) => {
  const { lang } = useAppUI();
  const { setOpenMobile, openMobile } = useSidebar();
  const items = groups.flatMap((g) => g.items).slice(0, 4);
  const inDock = items.some((i) => i.id === current);
  const btn = (active: boolean) =>
    cn('flex flex-col items-center justify-center gap-0.5 px-1 text-[11px] cursor-pointer', active ? 'font-medium text-[#006A4E]' : 'text-slate-500');
  return (
    <nav className="grid h-14 shrink-0 grid-cols-5 border-t border-slate-200 bg-white md:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button key={item.id} type="button" onClick={() => onSelect(item.id)} className={btn(current === item.id)}>
            <Icon className="size-5" />
            <span className="max-w-full truncate">{(lang === 'bn' ? item.bn : item.en).replace(/^\S+\.\s/, '')}</span>
          </button>
        );
      })}
      <button type="button" onClick={() => setOpenMobile(!openMobile)} className={btn(!inDock)}>
        <Menu className="size-5" />
        {lang === 'bn' ? 'মেনু' : 'Menu'}
      </button>
    </nav>
  );
};

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

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
  const { lang, setLang, role, user, setActiveSubTab, t } = useAppUI();
  const config = WORKSPACES[workspaceType];
  const groups = React.useMemo(() => visibleOfficialNav(workspaceType, role), [workspaceType, role]);
  const allItems = React.useMemo(() => config.groups.flatMap((g) => g.items), [config]);

  const [subPage, setSubPage] = React.useState<string>(() => currentSubPage || resolveFromUrl(workspaceType));
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const navigatingRef = React.useRef(false);

  React.useEffect(() => {
    if (currentSubPage && currentSubPage !== subPage) setSubPage(currentSubPage);
  }, [currentSubPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Browser back/forward.
  React.useEffect(() => {
    const onPop = () => {
      const next = resolveFromUrl(workspaceType);
      setSubPage(next);
      setActiveSubTab(next);
      // Drop the helper "?section=" param left by setActiveSubTab so the address bar stays clean
      // (skipped while select() is mid-navigation; it replaces the URL itself).
      const url = new URL(window.location.href);
      if (!navigatingRef.current && url.searchParams.has('section')) {
        url.searchParams.delete('section');
        window.history.replaceState(window.history.state, '', url.pathname + url.search);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [workspaceType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compact admin-style density (index.css `body.admin-mode`), also for dialogs in portals.
  React.useEffect(() => {
    document.body.classList.add('admin-mode');
    return () => document.body.classList.remove('admin-mode');
  }, []);

  // Ctrl/⌘ + K opens search.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const select = (tabId: string) => {
    setSubPage(tabId);
    navigatingRef.current = true;
    // setActiveSubTab pushes "?section=<id>" and fires popstate; resolveFromUrl reads that param,
    // so the shell stays on the new page. We then replace that entry with the clean URL (one history step).
    setActiveSubTab(tabId);
    const base = workspaceType === 'lawyer' ? 'lawyer-case' : workspaceType;
    const url = tabId === config.defaultTab ? `/${lang}/${base}` : `/${lang}/${base}/${SLUGS[tabId] || tabId}`;
    const pushedSection = new URLSearchParams(window.location.search).get('section') === tabId;
    if (pushedSection) window.history.replaceState({ officialSubPage: tabId }, '', url);
    else if (window.location.pathname !== url) window.history.pushState({ officialSubPage: tabId }, '', url);
    navigatingRef.current = false;
    onNavigateSubPage?.(tabId);
  };

  const current = allItems.find((i) => i.id === subPage) || allItems[0];
  const currentGroup = config.groups.find((g) => g.items.some((i) => i.id === current.id));
  const isHome = current.id === config.defaultTab;

  const isImpersonating = typeof window !== 'undefined' && localStorage.getItem('bs_superadmin_mode') === '1';
  const returnToAdmin = () => {
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
    <SidebarProvider
      defaultOpen
      className="admin-ui h-screen max-h-screen w-full overflow-hidden bg-slate-50 font-sans text-slate-900 antialiased"
    >
      <OfficialSidebar
        workspaceType={workspaceType}
        groups={groups}
        current={current.id}
        onSelect={select}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenProfile={() => setProfileOpen(true)}
        onNavigateMainTab={onNavigateMainTab}
      />

      <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-50">
        <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 sm:px-4">
          <SidebarTrigger className="-ml-1 size-8 text-slate-500" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <nav aria-label="breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
            {!isHome && (
              <>
                <button
                  type="button"
                  onClick={() => select(config.defaultTab)}
                  className="hidden shrink-0 text-slate-500 hover:text-slate-900 sm:block cursor-pointer"
                >
                  {t('ড্যাশবোর্ড', 'Dashboard')}
                </button>
                <ChevronRight className="hidden size-3.5 shrink-0 text-slate-300 sm:block" />
                {currentGroup && config.groups.length > 1 && (
                  <>
                    <span className="hidden shrink-0 text-slate-500 md:block">{lang === 'bn' ? currentGroup.bn : currentGroup.en}</span>
                    <ChevronRight className="hidden size-3.5 shrink-0 text-slate-300 md:block" />
                  </>
                )}
              </>
            )}
            <span className="truncate font-medium text-slate-900">{lang === 'bn' ? current.bn : current.en}</span>
          </nav>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-2 text-sm text-slate-500 hover:bg-slate-50 md:w-52 cursor-pointer"
            aria-label={t('খুঁজুন', 'Search')}
          >
            <Search className="size-4" />
            <span className="hidden flex-1 text-left md:block">{t('পাতা খুঁজুন…', 'Find a page…')}</span>
            <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1 text-[10px] text-slate-400 md:block">Ctrl K</kbd>
          </button>
          <button
            type="button"
            onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
            className="h-8 rounded-lg border border-slate-200 px-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            title={t('ভাষা বদলান', 'Change language')}
          >
            {lang === 'bn' ? 'EN' : 'বাং'}
          </button>
        </header>

        {isImpersonating && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-violet-200 bg-violet-50 px-4 py-1.5 text-xs text-violet-900">
            <span className="truncate">
              {t('অ্যাডমিন হিসেবে দেখছেন:', 'Viewing as admin:')} <b className="font-medium">{user?.full_name_bn || user?.username}</b>
            </span>
            <button
              type="button"
              onClick={returnToAdmin}
              className="flex shrink-0 items-center gap-1 rounded-md bg-white px-2 py-1 font-medium text-violet-800 ring-1 ring-violet-200 hover:bg-violet-100 cursor-pointer"
            >
              <Undo2 className="size-3.5" />
              {t('অ্যাডমিনে ফিরুন', 'Back to admin')}
            </button>
          </div>
        )}

        {/* Pages that use <AdminPage fill> fit one screen; older content still scrolls here. */}
        <main className="admin-content min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
          {React.isValidElement(children)
            ? React.cloneElement(children as React.ReactElement<any>, { currentSubPage: subPage, onNavigateSubPage: select })
            : children}
        </main>

        <MobileDock groups={groups} current={current.id} onSelect={select} />
      </SidebarInset>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen} title={t('খুঁজুন', 'Search')}>
        <CommandInput placeholder={t('কী খুঁজছেন?', 'What are you looking for?')} />
        <CommandList>
          <CommandEmpty>{t('কিছু পাওয়া যায়নি', 'Nothing found')}</CommandEmpty>
          {groups.map((g) => (
            <CommandGroup key={g.id} heading={lang === 'bn' ? g.bn : g.en}>
              {g.items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.bn} ${item.en} ${item.id}`}
                    onSelect={() => {
                      setSearchOpen(false);
                      select(item.id);
                    }}
                  >
                    <Icon />
                    {lang === 'bn' ? item.bn : item.en}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading={t('অন্যান্য', 'Other')}>
            <CommandItem value="profile প্রোফাইল" onSelect={() => (setSearchOpen(false), setProfileOpen(true))}>
              <User />
              {t('আমার প্রোফাইল', 'My profile')}
            </CommandItem>
            <CommandItem value="website ওয়েবসাইট" onSelect={() => (setSearchOpen(false), onNavigateMainTab('landing'))}>
              <Globe />
              {t('ওয়েবসাইট দেখুন', 'Open website')}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <AdminProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
      <Toaster position="top-center" richColors closeButton theme="light" />
    </SidebarProvider>
  );
};
