import React, { useEffect, useState } from 'react';
import { useAppUI } from '@/i18n';
import {
  LayoutDashboard,
  MapPin,
  FileText,
  FolderOpen,
  ArrowLeftRight,
  Scale,
  MessageSquare,
  Search,
  Globe,
  LogOut,
  ChevronsUpDown,
  Home,
  UserCog,
  Settings,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
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
} from '@/components/ui/command';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';

export type CitizenSectionId =
  | 'overview'
  | 'plots'
  | 'deeds'
  | 'docs'
  | 'transfers'
  | 'disputes'
  | 'tickets';

export interface CitizenNavItem {
  id: CitizenSectionId;
  bn: string;
  en: string;
  icon: React.ComponentType<{ className?: string }>;
  groupBn?: string;
  groupEn?: string;
  keywords?: string;
}

export const CITIZEN_NAV_ITEMS: CitizenNavItem[] = [
  {
    id: 'overview',
    bn: 'ড্যাশবোর্ড',
    en: 'Dashboard',
    icon: LayoutDashboard,
    keywords: 'home dashboard overview summary',
  },
  {
    id: 'plots',
    bn: 'জমি ও ম্যাপ',
    en: 'Land & Map',
    icon: MapPin,
    groupBn: 'আমার জমি',
    groupEn: 'My Land',
    keywords: 'plots land map satellite dag khatian lock',
  },
  {
    id: 'deeds',
    bn: 'দলিল',
    en: 'Deeds',
    icon: FileText,
    groupBn: 'আমার জমি',
    groupEn: 'My Land',
    keywords: 'deeds dolil registry kabala qr',
  },
  {
    id: 'docs',
    bn: 'কাগজপত্র',
    en: 'Documents',
    icon: FolderOpen,
    groupBn: 'আমার জমি',
    groupEn: 'My Land',
    keywords: 'docs documents porcha khatian upload vault',
  },
  {
    id: 'transfers',
    bn: 'জমি হস্তান্তর',
    en: 'Land Transfer',
    icon: ArrowLeftRight,
    groupBn: 'আবেদন',
    groupEn: 'Applications',
    keywords: 'transfer mutation namjari application sell buy',
  },
  {
    id: 'disputes',
    bn: 'আপত্তি',
    en: 'Disputes',
    icon: Scale,
    groupBn: 'আবেদন',
    groupEn: 'Applications',
    keywords: 'dispute objection case appeal',
  },
  {
    id: 'tickets',
    bn: 'অভিযোগ ও সাহায্য',
    en: 'Help & Tickets',
    icon: MessageSquare,
    groupBn: 'সহায়তা',
    groupEn: 'Support',
    keywords: 'tickets help support 16122 complaint',
  },
];

const VALID_SECTIONS = new Set<string>([
  'overview',
  'plots',
  'deeds',
  'docs',
  'transfers',
  'disputes',
  'tickets',
]);

export function normalizeCitizenSection(raw?: string | null): CitizenSectionId {
  if (!raw) return 'overview';
  const clean = raw.trim().toLowerCase();
  if (clean === 'vault') return 'plots';
  if (VALID_SECTIONS.has(clean)) return clean as CitizenSectionId;
  return 'overview';
}

export function resolveCitizenSectionFromUrl(fallbackSubTab?: string | null): CitizenSectionId {
  if (typeof window === 'undefined') return normalizeCitizenSection(fallbackSubTab);
  const path = window.location.pathname.replace(/^\/(bn|en)(?=\/|$)/, '') || '/';
  const params = new URLSearchParams(window.location.search);
  const sec = params.get('section');
  if (sec) return normalizeCitizenSection(sec);
  if (path.startsWith('/my/land')) return 'plots';
  if (path.startsWith('/my/transfers')) return 'transfers';
  if (path.startsWith('/my/tickets')) return 'tickets';
  if (fallbackSubTab) return normalizeCitizenSection(fallbackSubTab);
  return 'overview';
}

const MobileMenuTrigger: React.FC<{ label: string }> = ({ label }) => {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className="flex flex-col items-center justify-center gap-0.5 flex-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
    >
      <ChevronsUpDown className="size-4" />
      <span className="truncate max-w-[68px]">{label}</span>
    </button>
  );
};

export interface CitizenShellProps {
  activeTab: 'home' | 'applications' | 'profile' | 'settings';
  onNavigate: (target: string) => void;
  counts?: Partial<Record<CitizenSectionId, number>>;
  children: React.ReactNode;
}

export const CitizenShell: React.FC<CitizenShellProps> = ({
  activeTab,
  onNavigate,
  counts = {},
  children,
}) => {
  const {
    lang,
    setLang,
    t,
    user,
    logout,
    activeSubTab,
    setActiveSubTab,
    fontStep,
    increaseFont,
    decreaseFont,
  } = useAppUI();

  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add('admin-mode');
    return () => {
      document.body.classList.remove('admin-mode');
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const syncFromLocation = () => {
      if (activeTab === 'home') {
        const resolved = resolveCitizenSectionFromUrl(null);
        setActiveSubTab(resolved === 'overview' ? '' : resolved);
      }
    };
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, [activeTab, setActiveSubTab]);

  const currentSection: CitizenSectionId =
    activeTab === 'home' ? resolveCitizenSectionFromUrl(activeSubTab) : 'overview';

  const selectSection = (id: CitizenSectionId) => {
    setCmdOpen(false);
    if (activeTab !== 'home') {
      setActiveSubTab(id === 'overview' ? '' : id);
      onNavigate(id === 'overview' ? 'home' : `home?section=${id}`);
      return;
    }
    setActiveSubTab(id === 'overview' ? '' : id);
    if (typeof window !== 'undefined') {
      const target = id === 'overview' ? `/${lang}/home` : `/${lang}/home?section=${id}`;
      const current = `${window.location.pathname}${window.location.search}`;
      if (current !== target) {
        window.history.pushState({ tab: 'home', section: id, lang }, '', target);
      }
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  };

  const displayName =
    (lang === 'bn' ? user?.full_name_bn : user?.full_name_en) ||
    user?.full_name_bn ||
    user?.username ||
    t('নাগরিক', 'Citizen');
  const initials = (displayName || 'C').trim().slice(0, 2).toUpperCase();

  const currentPageLabel = (() => {
    if (activeTab === 'applications') return t('জমি হস্তান্তর আবেদন', 'Transfer Application');
    if (activeTab === 'profile') return t('আমার প্রোফাইল', 'My Profile');
    if (activeTab === 'settings') return t('সেটিংস', 'Settings');
    const found = CITIZEN_NAV_ITEMS.find((i) => i.id === currentSection);
    return found ? t(found.bn, found.en) : t('ড্যাশবোর্ড', 'Dashboard');
  })();

  const groups: { labelBn?: string; labelEn?: string; items: CitizenNavItem[] }[] = [
    {
      items: CITIZEN_NAV_ITEMS.filter((i) => !i.groupBn),
    },
    {
      labelBn: 'আমার জমি',
      labelEn: 'My Land',
      items: CITIZEN_NAV_ITEMS.filter((i) => i.groupEn === 'My Land'),
    },
    {
      labelBn: 'আবেদন',
      labelEn: 'Applications',
      items: CITIZEN_NAV_ITEMS.filter((i) => i.groupEn === 'Applications'),
    },
    {
      labelBn: 'সহায়তা',
      labelEn: 'Support',
      items: CITIZEN_NAV_ITEMS.filter((i) => i.groupEn === 'Support'),
    },
  ];

  const isSectionActive = (id: CitizenSectionId) => {
    if (activeTab === 'applications') return id === 'transfers';
    if (activeTab !== 'home') return false;
    return currentSection === id;
  };

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="border-b border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                onClick={() => selectSection('overview')}
                tooltip={t('ভূমি সুরক্ষা', 'BhumiSuraksha')}
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#006A4E] text-white font-semibold text-sm shrink-0">
                  ভূ
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{t('ভূমি সুরক্ষা', 'BhumiSuraksha')}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {t('নাগরিক পোর্টাল', 'Citizen Portal')}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {groups.map((g, gIdx) => (
            <SidebarGroup key={g.labelEn || `top-${gIdx}`} className="py-1.5">
              {g.labelBn && (
                <SidebarGroupLabel>{t(g.labelBn, g.labelEn || g.labelBn)}</SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {g.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isSectionActive(item.id);
                    const count = counts[item.id];
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => selectSection(item.id)}
                          tooltip={t(item.bn, item.en)}
                        >
                          <Icon className="size-4" />
                          <span>{t(item.bn, item.en)}</span>
                        </SidebarMenuButton>
                        {count !== undefined && count > 0 && (
                          <SidebarMenuBadge className="tabular-nums text-[11px] text-muted-foreground">
                            {count}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-7 w-7 rounded-md">
                      <AvatarFallback className="rounded-md bg-[#006A4E] text-white text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-xs leading-tight">
                      <span className="truncate font-semibold">{displayName}</span>
                      <span className="truncate text-muted-foreground">
                        {user?.role === 'service_point_operator'
                          ? t('সেবাকেন্দ্র অপারেটর', 'Service Point Operator')
                          : t('নাগরিক অ্যাকাউন্ট', 'Citizen Account')}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="top"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-left text-xs">
                      <Avatar className="h-7 w-7 rounded-md">
                        <AvatarFallback className="rounded-md bg-[#006A4E] text-white text-xs font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left leading-tight">
                        <span className="truncate font-semibold">{displayName}</span>
                        <span className="truncate text-muted-foreground">
                          @{user?.username || 'citizen'}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onNavigate('profile')}>
                    <UserCog className="size-4 mr-2" />
                    {t('আমার প্রোফাইল', 'My Profile')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNavigate('settings')}>
                    <Settings className="size-4 mr-2" />
                    {t('সেটিংস', 'Settings')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNavigate('landing')}>
                    <Home className="size-4 mr-2" />
                    {t('ওয়েবসাইট দেখুন', 'Public site')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t('লেখার আকার', 'Text size')}</span>
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 text-xs"
                        onClick={decreaseFont}
                        disabled={fontStep <= -1}
                      >
                        −
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 text-xs"
                        onClick={increaseFont}
                        disabled={fontStep >= 3}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      logout();
                      onNavigate('landing');
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="size-4 mr-2" />
                    {t('লগআউট', 'Sign out')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="h-svh overflow-hidden">
        <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b bg-background px-3">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden sm:block">
                  <BreadcrumbLink
                    onClick={() => selectSection('overview')}
                    className="cursor-pointer text-xs"
                  >
                    {t('ড্যাশবোর্ড', 'Dashboard')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-xs font-medium truncate">
                    {currentPageLabel}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCmdOpen(true)}
              className="h-7 gap-2 px-2.5 text-xs text-muted-foreground font-normal"
            >
              <Search className="size-3.5" />
              <span className="hidden md:inline">{t('খুঁজুন...', 'Search...')}</span>
              <kbd className="pointer-events-none hidden h-4 select-none items-center gap-0.5 rounded border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
                ⌘K
              </kbd>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
              className="h-7 px-2 text-xs font-medium"
            >
              <Globe className="size-3.5 mr-1" />
              {lang === 'bn' ? 'EN' : 'বাং'}
            </Button>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden flex flex-col bg-muted/20 p-3 md:p-4 pb-16 md:pb-4">
          <div className="mx-auto w-full max-w-[1440px] flex-1 min-h-0 flex flex-col">
            {children}
          </div>
        </main>

        {/* Mobile bottom bar (5 items: হোম, আমার জমি, আবেদন, সাহায্য, মেনু) */}
        <nav
          aria-label={t('মোবাইল নেভিগেশন', 'Mobile navigation')}
          className="md:hidden fixed inset-x-0 bottom-0 z-30 h-14 border-t border-border bg-card/95 backdrop-blur flex items-stretch justify-around px-1"
        >
          {[
            { id: 'overview' as CitizenSectionId, bn: 'হোম', en: 'Home', icon: LayoutDashboard },
            { id: 'plots' as CitizenSectionId, bn: 'আমার জমি', en: 'My Land', icon: MapPin },
            { id: 'transfers' as CitizenSectionId, bn: 'আবেদন', en: 'Apply', icon: ArrowLeftRight },
            { id: 'tickets' as CitizenSectionId, bn: 'সাহায্য', en: 'Help', icon: MessageSquare },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = isSectionActive(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectSection(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 text-[11px] font-medium transition-colors cursor-pointer ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="size-4" />
                <span className="truncate max-w-[68px]">{t(item.bn, item.en)}</span>
              </button>
            );
          })}
          <MobileMenuTrigger label={t('মেনু', 'Menu')} />
        </nav>
      </SidebarInset>

      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder={t('পাতা বা সেবা খুঁজুন...', 'Jump to section...')} />
        <CommandList>
          <CommandEmpty>{t('কিছু পাওয়া যায়নি', 'No results found.')}</CommandEmpty>
          <CommandGroup heading={t('আমার পোর্টাল', 'My Portal')}>
            {CITIZEN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.id}
                  value={`${item.bn} ${item.en} ${item.keywords || ''}`}
                  onSelect={() => selectSection(item.id)}
                >
                  <Icon className="size-4 mr-2" />
                  <span>{t(item.bn, item.en)}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
          <CommandGroup heading={t('অন্যান্য সেবা', 'Other Tools')}>
            <CommandItem
              value="নতুন হস্তান্তর আবেদন new transfer application"
              onSelect={() => {
                setCmdOpen(false);
                onNavigate('applications?new=1');
              }}
            >
              <ArrowLeftRight className="size-4 mr-2" />
              <span>{t('নতুন হস্তান্তর আবেদন', 'New Transfer Application')}</span>
            </CommandItem>
            <CommandItem
              value="জমি যাচাই check land before buy"
              onSelect={() => {
                setCmdOpen(false);
                onNavigate('check');
              }}
            >
              <ShieldCheck className="size-4 mr-2" />
              <span>{t('জমি যাচাই', 'Check Land')}</span>
            </CommandItem>
            <CommandItem
              value="দলিল যাচাই verify deed qr"
              onSelect={() => {
                setCmdOpen(false);
                onNavigate('qr');
              }}
            >
              <QrCode className="size-4 mr-2" />
              <span>{t('দলিল যাচাই', 'Verify Deed')}</span>
            </CommandItem>
            <CommandItem
              value="আমার প্রোফাইল profile"
              onSelect={() => {
                setCmdOpen(false);
                onNavigate('profile');
              }}
            >
              <UserCog className="size-4 mr-2" />
              <span>{t('আমার প্রোফাইল', 'My Profile')}</span>
            </CommandItem>
            <CommandItem
              value="সেটিংস settings"
              onSelect={() => {
                setCmdOpen(false);
                onNavigate('settings');
              }}
            >
              <Settings className="size-4 mr-2" />
              <span>{t('সেটিংস', 'Settings')}</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <Toaster
        position="bottom-right"
        richColors
        closeButton
        expand={false}
        visibleToasts={3}
        offset={16}
        toastOptions={{
          className: 'text-xs font-sans shadow-lg border border-border rounded-lg py-2.5 px-3.5 max-w-sm',
        }}
      />
    </SidebarProvider>
  );
};
export default CitizenShell;
