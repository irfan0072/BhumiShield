import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileCheck2,
  Users,
  Bell,
  Menu,
  Globe,
  LogOut,
  Shield,
  User,
  Search,
  ChevronRight,
  ChevronsUpDown,
  Minus,
  Plus,
  UserPlus,
  BriefcaseBusiness,
  Megaphone,
  Radio,
  DatabaseBackup,
  Zap,
  Type,
} from 'lucide-react';
import { Toaster } from 'sonner';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { AdminProfileModal } from './AdminProfileModal';
import { CreateCitizenDialog } from './CreateCitizenDialog';
import { CreateOfficialDialog } from './CreateOfficialDialog';
import { adminNavGroups, adminNavItems, findAdminNavItem, findAdminNavGroup } from './adminNav';
import { ConfirmDialog, notify } from './kit';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

export type AdminSubPage =
  | 'overview'
  | 'deeds'
  | 'khatians'
  | 'mutations'
  | 'transfers'
  | 'appeals'
  | 'mortgages'
  | 'acquisitions'
  | 'lawyers'
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
  onOpenOverride?: (actionType: string, targetId?: string | number) => void;
  children: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/* Quick actions (shared by the command palette and the dashboard)     */
/* ------------------------------------------------------------------ */

export type AdminActionId = 'new-citizen' | 'new-official' | 'new-notice' | 'broadcast' | 'backup' | 'override';

export interface AdminAction {
  id: AdminActionId;
  bn: string;
  en: string;
  icon: React.ElementType;
  tone: string;
}

export const adminActions: AdminAction[] = [
  { id: 'new-citizen', bn: 'নতুন নাগরিক', en: 'New citizen', icon: UserPlus, tone: 'bg-sky-50 text-sky-700' },
  { id: 'new-official', bn: 'নতুন কর্মকর্তা', en: 'New official', icon: BriefcaseBusiness, tone: 'bg-violet-50 text-violet-700' },
  { id: 'new-notice', bn: 'নতুন নোটিশ', en: 'New notice', icon: Megaphone, tone: 'bg-amber-50 text-amber-700' },
  { id: 'broadcast', bn: 'জরুরি বার্তা', en: 'Alert banner', icon: Radio, tone: 'bg-rose-50 text-rose-700' },
  { id: 'backup', bn: 'ব্যাকআপ নিন', en: 'Back up data', icon: DatabaseBackup, tone: 'bg-emerald-50 text-emerald-700' },
  { id: 'override', bn: 'বিশেষ আদেশ', en: 'Special order', icon: Zap, tone: 'bg-slate-100 text-slate-700' },
];

interface AdminShellCtx {
  runAction: (id: AdminActionId) => void;
  openSearch: () => void;
}
const AdminShellContext = createContext<AdminShellCtx | null>(null);
export const useAdminShell = () => {
  const ctx = useContext(AdminShellContext);
  if (!ctx) throw new Error('useAdminShell must be used inside AdminWorkspaceShell');
  return ctx;
};

const aliasOf = (id: string) => (id === 'users' ? 'officials' : id === 'content' ? 'blogs' : id);

const useDisplayName = () => {
  const { user, lang } = useAppUI();
  const name = lang === 'bn' ? user?.full_name_bn || user?.full_name_en : user?.full_name_en || user?.full_name_bn;
  return name || user?.username || (lang === 'bn' ? 'অ্যাডমিন' : 'Admin');
};

const CLOSED_GROUPS_KEY = 'bs_admin_nav_closed';

/* ------------------------------------------------------------------ */
/* Account menu (shared by sidebar footer and header)                  */
/* ------------------------------------------------------------------ */

const AccountMenuItems: React.FC<{ onOpenProfile: () => void; onNavigateMainTab: (tab: string) => void }> = ({
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

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */

const AdminSidebarPanel: React.FC<{
  currentSubPage: AdminSubPage;
  onNavigateSubPage: (subPage: string) => void;
  onNavigateMainTab: (tab: string) => void;
  onOpenProfile: () => void;
}> = ({ currentSubPage, onNavigateSubPage, onNavigateMainTab, onOpenProfile }) => {
  const { lang, t, user } = useAppUI();
  const { isMobile, setOpenMobile } = useSidebar();
  const { openSearch } = useAdminShell();
  const displayName = useDisplayName();
  const active = aliasOf(currentSubPage);

  const [closed, setClosed] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(CLOSED_GROUPS_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const toggleGroup = (id: string, open: boolean) => {
    const next = open ? closed.filter((g) => g !== id) : [...closed, id];
    setClosed(next);
    localStorage.setItem(CLOSED_GROUPS_KEY, JSON.stringify(next));
  };

  const go = (id: string) => {
    onNavigateSubPage(id);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200">
      <SidebarHeader className="gap-2 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={() => go('overview')} className="cursor-pointer">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#006A4E] text-white">
                <Shield className="size-4" />
              </span>
              <span className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate text-sm font-semibold text-slate-900">{t('ভূমি সেবা', 'Bhumi Seba')}</span>
                <span className="truncate text-xs text-slate-500">{t('অ্যাডমিন প্যানেল', 'Admin panel')}</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={openSearch}
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
        {adminNavGroups.map((group) => {
          const hasActive = group.items.some((i) => i.id === active);
          const isOpen = hasActive || !closed.includes(group.id);
          const label = lang === 'bn' ? group.labelBn : group.labelEn;

          const items = (
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon;
                const title = lang === 'bn' ? item.titleBn : item.titleEn;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={active === item.id}
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
          );

          if (group.id === 'home') {
            return (
              <SidebarGroup key={group.id} className="py-1">
                <SidebarGroupContent>{items}</SidebarGroupContent>
              </SidebarGroup>
            );
          }

          return (
            <Collapsible
              key={group.id}
              open={isOpen}
              onOpenChange={(o) => toggleGroup(group.id, o)}
              className="group/collapsible"
            >
              <SidebarGroup className="py-1">
                <SidebarGroupLabel asChild className="cursor-pointer text-xs text-slate-500 hover:text-slate-800">
                  <CollapsibleTrigger>
                    {label}
                    <ChevronRight className="ml-auto size-3.5 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>{items}</SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
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
                    <span className="truncate text-xs text-slate-500">{user?.username}</span>
                  </span>
                  <ChevronsUpDown className="size-4 text-slate-400" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side={isMobile ? 'top' : 'right'} align="end" sideOffset={8} className="w-60">
                <DropdownMenuLabel className="truncate text-sm font-medium">{displayName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <AccountMenuItems onOpenProfile={onOpenProfile} onNavigateMainTab={onNavigateMainTab} />
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

const AdminHeader: React.FC<{
  currentSubPage: AdminSubPage;
  onNavigateSubPage: (subPage: string) => void;
}> = ({ currentSubPage, onNavigateSubPage }) => {
  const { lang, setLang, t } = useAppUI();
  const { openSearch } = useAdminShell();
  const item = findAdminNavItem(currentSubPage);
  const group = findAdminNavGroup(currentSubPage);
  const isHome = item.id === 'overview';

  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 sm:px-4">
      <SidebarTrigger className="-ml-1 size-8 text-slate-500" />
      <Separator orientation="vertical" className="mr-1 h-4" />

      <nav aria-label="breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
        {!isHome && (
          <>
            <button
              type="button"
              onClick={() => onNavigateSubPage('overview')}
              className="hidden shrink-0 text-slate-500 hover:text-slate-900 sm:block cursor-pointer"
            >
              {t('ড্যাশবোর্ড', 'Dashboard')}
            </button>
            {group && (
              <>
                <ChevronRight className="hidden size-3.5 shrink-0 text-slate-300 sm:block" />
                <span className="hidden shrink-0 text-slate-500 md:block">
                  {lang === 'bn' ? group.labelBn : group.labelEn}
                </span>
                <ChevronRight className="hidden size-3.5 shrink-0 text-slate-300 md:block" />
              </>
            )}
          </>
        )}
        <span className="truncate font-medium text-slate-900">{lang === 'bn' ? item.titleBn : item.titleEn}</span>
      </nav>

      <button
        type="button"
        onClick={openSearch}
        className="flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-2 text-sm text-slate-500 hover:bg-slate-50 md:w-56 cursor-pointer"
        aria-label={t('খুঁজুন', 'Search')}
      >
        <Search className="size-4" />
        <span className="hidden flex-1 text-left md:block">{t('পাতা বা কাজ খুঁজুন…', 'Find page or action…')}</span>
        <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1 text-[10px] text-slate-400 md:block">
          Ctrl K
        </kbd>
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
  );
};

/* ------------------------------------------------------------------ */
/* Command palette                                                     */
/* ------------------------------------------------------------------ */

const AdminCommandPalette: React.FC<{
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onNavigateSubPage: (subPage: string) => void;
  onNavigateMainTab: (tab: string) => void;
  canOverride: boolean;
}> = ({ open, onOpenChange, onNavigateSubPage, onNavigateMainTab, canOverride }) => {
  const { lang, t } = useAppUI();
  const { runAction } = useAdminShell();
  const close = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title={t('খুঁজুন', 'Search')}>
      <CommandInput placeholder={t('কী খুঁজছেন? যেমন: দলিল, নোটিশ…', 'What are you looking for?')} />
      <CommandList>
        <CommandEmpty>{t('কিছু পাওয়া যায়নি', 'Nothing found')}</CommandEmpty>
        <CommandGroup heading={t('দ্রুত কাজ', 'Quick actions')}>
          {adminActions
            .filter((a) => a.id !== 'override' || canOverride)
            .map((a) => {
              const Icon = a.icon;
              return (
                <CommandItem key={a.id} value={`${a.bn} ${a.en}`} onSelect={() => close(() => runAction(a.id))}>
                  <Icon />
                  {lang === 'bn' ? a.bn : a.en}
                </CommandItem>
              );
            })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={t('পাতা', 'Pages')}>
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.id}
                value={`${item.titleBn} ${item.titleEn} ${item.keywords || ''}`}
                onSelect={() => close(() => onNavigateSubPage(item.id))}
              >
                <Icon />
                {lang === 'bn' ? item.titleBn : item.titleEn}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={t('অন্যান্য', 'Other')}>
          <CommandItem value="website ওয়েবসাইট" onSelect={() => close(() => onNavigateMainTab('landing'))}>
            <Globe />
            {t('ওয়েবসাইট দেখুন', 'Open website')}
            <CommandShortcut>↗</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

/* ------------------------------------------------------------------ */
/* Mobile bottom bar                                                   */
/* ------------------------------------------------------------------ */

const MobileDock: React.FC<{ currentSubPage: AdminSubPage; onNavigateSubPage: (subPage: string) => void }> = ({
  currentSubPage,
  onNavigateSubPage,
}) => {
  const { lang } = useAppUI();
  const { setOpenMobile, openMobile } = useSidebar();
  const active = aliasOf(currentSubPage);
  const tabs = [
    { id: 'overview', bn: 'হোম', en: 'Home', icon: LayoutDashboard },
    { id: 'deeds', bn: 'দলিল', en: 'Deeds', icon: FileCheck2 },
    { id: 'citizens', bn: 'নাগরিক', en: 'Citizens', icon: Users },
    { id: 'notices', bn: 'নোটিশ', en: 'Notices', icon: Bell },
  ];
  const inTabs = tabs.some((tab) => tab.id === active);
  const btn = (isActive: boolean) =>
    cn(
      'flex flex-col items-center justify-center gap-0.5 text-[11px] cursor-pointer',
      isActive ? 'font-medium text-[#006A4E]' : 'text-slate-500'
    );

  return (
    <nav className="grid h-14 shrink-0 grid-cols-5 border-t border-slate-200 bg-white md:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button key={tab.id} type="button" onClick={() => onNavigateSubPage(tab.id)} className={btn(active === tab.id)}>
            <Icon className="size-5" />
            {lang === 'bn' ? tab.bn : tab.en}
          </button>
        );
      })}
      <button type="button" onClick={() => setOpenMobile(!openMobile)} className={btn(!inTabs)}>
        <Menu className="size-5" />
        {lang === 'bn' ? 'মেনু' : 'Menu'}
      </button>
    </nav>
  );
};

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

export const AdminWorkspaceShell: React.FC<AdminWorkspaceShellProps> = ({
  currentSubPage,
  onNavigateSubPage,
  onNavigateMainTab,
  onOpenOverride,
  children,
}) => {
  const { lang, t } = useAppUI();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dialog, setDialog] = useState<null | 'new-citizen' | 'new-official' | 'backup'>(null);

  // Admin-only sizing rules in index.css (also apply to dialogs rendered in portals).
  useEffect(() => {
    document.body.classList.add('admin-mode');
    return () => document.body.classList.remove('admin-mode');
  }, []);

  // Ctrl/⌘ + K opens search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /** Navigate and ask the target page to open its "create" form (pages read ?new=1). */
  const openCreateOn = useCallback(
    (page: string) => {
      onNavigateSubPage(page);
      window.history.replaceState(window.history.state, '', `${window.location.pathname}?new=1`);
      window.dispatchEvent(new Event('admin:new'));
    },
    [onNavigateSubPage]
  );

  const runAction = useCallback(
    (id: AdminActionId) => {
      switch (id) {
        case 'new-citizen':
        case 'new-official':
        case 'backup':
          setDialog(id);
          break;
        case 'new-notice':
          openCreateOn('notices');
          break;
        case 'broadcast':
          onNavigateSubPage('system');
          break;
        case 'override':
          onOpenOverride?.('MUTATION_OVERRIDE');
          break;
      }
    },
    [openCreateOn, onNavigateSubPage, onOpenOverride]
  );

  const ctx = useMemo(() => ({ runAction, openSearch: () => setSearchOpen(true) }), [runAction]);

  return (
    <AdminShellContext.Provider value={ctx}>
      <SidebarProvider
        defaultOpen
        className="admin-ui h-screen max-h-screen w-full overflow-hidden bg-slate-50 font-sans text-slate-900 antialiased"
      >
        <AdminSidebarPanel
          currentSubPage={currentSubPage}
          onNavigateSubPage={onNavigateSubPage}
          onNavigateMainTab={onNavigateMainTab}
          onOpenProfile={() => setProfileOpen(true)}
        />

        <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-50">
          <AdminHeader currentSubPage={currentSubPage} onNavigateSubPage={onNavigateSubPage} />
          <main className="admin-content flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
          <MobileDock currentSubPage={currentSubPage} onNavigateSubPage={onNavigateSubPage} />
        </SidebarInset>

        <AdminCommandPalette
          open={searchOpen}
          onOpenChange={setSearchOpen}
          onNavigateSubPage={onNavigateSubPage}
          onNavigateMainTab={onNavigateMainTab}
          canOverride={!!onOpenOverride}
        />

        <CreateCitizenDialog
          isOpen={dialog === 'new-citizen'}
          onClose={() => setDialog(null)}
          onSuccess={() => {
            setDialog(null);
            notify.ok(t('নাগরিক যোগ হয়েছে', 'Citizen added'));
            onNavigateSubPage('citizens');
          }}
        />
        <CreateOfficialDialog
          isOpen={dialog === 'new-official'}
          onClose={() => setDialog(null)}
          onSuccess={() => {
            setDialog(null);
            notify.ok(t('কর্মকর্তা যোগ হয়েছে', 'Official added'));
            onNavigateSubPage('officials');
          }}
        />
        <ConfirmDialog
          open={dialog === 'backup'}
          onOpenChange={(o) => !o && setDialog(null)}
          title={t('ব্যাকআপ নেবেন?', 'Create a backup?')}
          description={t('সব তথ্যের একটি কপি সার্ভারে রাখা হবে।', 'A copy of all data will be saved on the server.')}
          confirmLabel={t('ব্যাকআপ নিন', 'Back up')}
          onConfirm={async () => {
            try {
              const res = await BhumiApi.exportDatabaseBackup();
              notify.ok(`${t('ব্যাকআপ হয়েছে', 'Backup saved')}: ${res.backup_filename}`);
            } catch (e) {
              notify.err(e, lang);
              throw e;
            }
          }}
        />
        <AdminProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
        <Toaster position="top-center" richColors closeButton theme="light" />
      </SidebarProvider>
    </AdminShellContext.Provider>
  );
};
