import React, { Suspense } from 'react';
import { useAppUI } from '@/i18n';
import {
  AdminPage,
  PageToolbar,
  Section,
  StatGrid,
  StatCard,
  StatusBadge,
  EmptyState,
} from '@/components/admin/kit';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin,
  Layers,
  ArrowLeftRight,
  MessageSquare,
  Lock,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  RotateCw,
} from 'lucide-react';
import { CitizenSectionCommonProps, useCitizenFmt } from './shared';

const LazyMyLandMap = React.lazy(() => import('@/components/citizen/MyLandMap'));

export const OverviewSection: React.FC<CitizenSectionCommonProps> = ({
  vault,
  loading,
  transfers,
  tickets,
  onRefreshAll,
  onSelectSection,
  onNavigate,
  selectedPlotId,
  setSelectedPlotId,
  onOpenVerifyIdentity,
}) => {
  const { user } = useAppUI();
  const { t, lang, fmtNum } = useCitizenFmt();

  const plots = vault.owned_plots || [];
  const totalArea = plots.reduce(
    (acc, p) => acc + (Number(p.area_decimal ?? p.share_area_decimal ?? 0) || 0),
    0
  );
  const openTransfers = transfers.filter(
    (tr) => !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(String(tr?.status || '').toUpperCase())
  );
  const openTickets = tickets.filter(
    (tk) => !['RESOLVED', 'CLOSED'].includes(String(tk?.status || '').toUpperCase())
  );

  const displayName =
    (lang === 'bn'
      ? vault.person?.name_bn || user?.full_name_bn
      : vault.person?.name_en || user?.full_name_en) ||
    user?.full_name_bn ||
    user?.username ||
    t('নাগরিক', 'Citizen');

  const isVerified =
    vault.is_verified !== false && Number(user?.is_identity_verified ?? 1) !== 0;

  // Build real urgent tasks list
  const urgentItems: {
    id: string;
    title: string;
    sub: string;
    actionLabel: string;
    onClick: () => void;
    tone: 'warn' | 'info' | 'danger';
  }[] = [];

  if (!isVerified && !vault.isOperatorNoVault) {
    urgentItems.push({
      id: 'verify-nid',
      title: t('জাতীয় পরিচয়পত্র যাচাই করুন', 'Verify National ID'),
      sub: t('জমির সুরক্ষা ও লেনদেন চালুর জন্য প্রয়োজন', 'Required for land lock and transfers'),
      actionLabel: t('যাচাই করুন', 'Verify'),
      onClick: onOpenVerifyIdentity,
      tone: 'danger',
    });
  }

  for (const p of plots) {
    if (!p.owner_sale_locked && !p.is_admin_frozen) {
      urgentItems.push({
        id: `unlock-${p.plot_id}`,
        title: `${t('দাগ', 'Plot')} ${fmtNum(p.dag_no_bn || p.dag_no)} — ${t('বিক্রয় লক বন্ধ আছে', 'Sale lock is off')}`,
        sub: `${p.mouza_bn || p.mouza_en || ''} · ${fmtNum(p.area_decimal ?? p.share_area_decimal ?? 0)} ${t('শতক', 'dec')}`,
        actionLabel: t('বিক্রয় লক', 'Sale Lock'),
        onClick: () => {
          setSelectedPlotId(Number(p.plot_id));
          onSelectSection('plots', { plotId: Number(p.plot_id) });
        },
        tone: 'warn',
      });
    }
  }

  for (const tr of openTransfers) {
    const step = Number(tr.current_step || 1);
    const code = tr.transfer_code || tr.tracking_number || `TR-${tr.id}`;
    if ([1, 2, 3, 5, 7].includes(step)) {
      urgentItems.push({
        id: `tr-${tr.id}`,
        title: `${code} — ${t('আপনার অনুমোদন প্রয়োজন', 'Waiting for your step')}`,
        sub: `${t('ধাপ', 'Step')} ${fmtNum(step)}/${fmtNum(13)}`,
        actionLabel: t('দেখুন', 'Open'),
        onClick: () => onSelectSection('transfers'),
        tone: 'info',
      });
    }
  }

  for (const tk of openTickets) {
    if (String(tk.status || '').toUpperCase() === 'WAITING_CITIZEN') {
      urgentItems.push({
        id: `tk-${tk.id || tk.ticket_code}`,
        title: `${tk.ticket_code} — ${t('উত্তর দিন', 'Reply needed')}`,
        sub: tk.title_bn || tk.title_en || '',
        actionLabel: t('উত্তর দিন', 'Reply'),
        onClick: () => onSelectSection('tickets'),
        tone: 'info',
      });
    }
  }

  return (
    <AdminPage fill>
      {/* Greeting Toolbar */}
      <PageToolbar
        filters={
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">{displayName}</h1>
            {vault.isOperatorNoVault ? (
              <StatusBadge tone="blue">
                {t('সেবাকেন্দ্র অপারেটর', 'Service Point Operator')}
              </StatusBadge>
            ) : isVerified ? (
              <StatusBadge tone="green">{t('যাচাইকৃত', 'Verified')}</StatusBadge>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onOpenVerifyIdentity}
                className="h-6 px-2 text-xs text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100"
              >
                <ShieldCheck className="size-3 mr-1" />
                {t('পরিচয় যাচাই করুন', 'Verify ID')}
              </Button>
            )}
          </div>
        }
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefreshAll}
            disabled={loading}
            className="h-8 gap-1.5 text-xs"
          >
            <RotateCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('রিফ্রেশ', 'Refresh')}
          </Button>
        }
      />

      {/* 4 KPI StatCards */}
      <StatGrid>
        <StatCard
          label={t('আমার জমি', 'My Plots')}
          value={fmtNum(plots.length)}
          hint={t('মোট দাগ', 'Recorded plots')}
          icon={MapPin}
          tone="green"
          onClick={() => onSelectSection('plots')}
        />
        <StatCard
          label={t('মোট জমি', 'Total Area')}
          value={`${fmtNum(Number(totalArea.toFixed(2)))} ${t('শতক', 'dec')}`}
          hint={t('মালিকানাধীন অংশ', 'Owned share')}
          icon={Layers}
          tone="blue"
          onClick={() => onSelectSection('plots')}
        />
        <StatCard
          label={t('চলমান আবেদন', 'Active Transfers')}
          value={fmtNum(openTransfers.length)}
          hint={t('জমি হস্তান্তর', 'Land transfer')}
          icon={ArrowLeftRight}
          tone={openTransfers.length > 0 ? 'amber' : 'slate'}
          onClick={() => onSelectSection('transfers')}
        />
        <StatCard
          label={t('খোলা অভিযোগ', 'Open Tickets')}
          value={fmtNum(openTickets.length)}
          hint={t('১৬১২২ সহায়তা', '16122 support')}
          icon={MessageSquare}
          tone={openTickets.length > 0 ? 'amber' : 'slate'}
          onClick={() => onSelectSection('tickets')}
        />
      </StatGrid>

      {/* Main Content Split: Satellite Map Card + Right Column (Urgent Tasks & Quick Actions) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left: Satellite Map of Citizen's Land */}
        <div className="lg:col-span-7 flex flex-col min-h-[240px] lg:min-h-0 relative isolate z-0">
          <Section
            title={`${t('আমার জমির স্যাটেলাইট ম্যাপ', 'My Land Satellite Map')} (${fmtNum(plots.length)})`}
            fill
            action={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSelectSection('plots')}
                className="h-7 px-2 text-xs text-primary"
              >
                {t('সব জমি ও ম্যাপ', 'Open Map')}
                <ChevronRight className="size-3.5 ml-0.5" />
              </Button>
            }
            bodyClassName="p-2 flex flex-col"
          >
            {vault.isOperatorNoVault ? (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState
                  icon={MapPin}
                  text={t(
                    'এই অ্যাকাউন্টে নিজের জমি নেই — ডান পাশের সেবাগুলো ব্যবহার করুন।',
                    'No personal land in this account — use the quick actions on the right.'
                  )}
                />
              </div>
            ) : plots.length === 0 && !loading ? (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState
                  icon={MapPin}
                  text={t('কোনো জমি যুক্ত নেই', 'No plots linked')}
                />
              </div>
            ) : (
              <div
                onClick={() => onSelectSection('plots')}
                className="flex-1 min-h-[200px] cursor-pointer"
              >
                <Suspense fallback={<Skeleton className="w-full h-full min-h-[200px] rounded-lg" />}>
                  <LazyMyLandMap
                    plots={plots}
                    selectedPlotId={selectedPlotId ?? plots[0]?.plot_id}
                    onSelect={(pid) => {
                      setSelectedPlotId(pid);
                      onSelectSection('plots', { plotId: pid });
                    }}
                    compact
                  />
                </Suspense>
              </div>
            )}
          </Section>
        </div>

        {/* Right: Urgent Tasks + 4 Quick Actions */}
        <div className="lg:col-span-5 flex flex-col gap-3 min-h-0">
          <Section
            title={`${t('জরুরি কাজ', 'Needs Attention')} (${fmtNum(urgentItems.length)})`}
            fill
            bodyClassName="p-3 overflow-y-auto space-y-2"
          >
            {urgentItems.length === 0 ? (
              <div className="flex items-center gap-2.5 rounded-md border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 text-xs text-emerald-900">
                <CheckCircle2 className="size-4 text-[#006A4E] shrink-0" />
                <span>{t('সবকিছু ঠিক আছে — কোনো জরুরি কাজ বাকি নেই।', 'Everything is up to date.')}</span>
              </div>
            ) : (
              urgentItems.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate">{item.title}</div>
                      <div className="text-muted-foreground truncate">{item.sub}</div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={item.onClick}
                    className="h-7 px-2.5 text-xs shrink-0"
                  >
                    {item.actionLabel}
                  </Button>
                </div>
              ))
            )}
          </Section>

          <Section title={t('দ্রুত কাজ', 'Quick Actions')} bodyClassName="p-2.5">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onSelectSection('plots')}
                className="h-9 justify-start gap-2 text-xs font-medium"
              >
                <Lock className="size-3.5 text-[#006A4E]" />
                <span className="truncate">{t('বিক্রয় লক', 'Sale Lock')}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onNavigate('applications?new=1')}
                className="h-9 justify-start gap-2 text-xs font-medium"
              >
                <ArrowLeftRight className="size-3.5 text-[#006A4E]" />
                <span className="truncate">{t('জমি হস্তান্তর', 'Land Transfer')}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onSelectSection('tickets', { create: true })}
                className="h-9 justify-start gap-2 text-xs font-medium"
              >
                <MessageSquare className="size-3.5 text-[#006A4E]" />
                <span className="truncate">{t('অভিযোগ দিন', 'File Ticket')}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onNavigate('qr')}
                className="h-9 justify-start gap-2 text-xs font-medium"
              >
                <QrCode className="size-3.5 text-[#006A4E]" />
                <span className="truncate">{t('দলিল যাচাই', 'Verify Deed')}</span>
              </Button>
            </div>
          </Section>
        </div>
      </div>
    </AdminPage>
  );
};
export default OverviewSection;
