import React from 'react';
import { ArrowRight, LifeBuoy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { DetailList, StatusBadge } from '../../components/admin/kit';
import { toBanglaDigits } from '../../theme/tokens';
import { plotStatus, SelectedPlot, STATUS_META } from './plotStatus';

type T = (bn: string, en: string) => string;

interface Props {
  plot: SelectedPlot;
  mouza: string;
  lang: 'bn' | 'en';
  t: T;
  onCheck: () => void;
  onHelp: () => void;
  /** Extra buttons for officers (e.g. assign a field task). */
  officerActions?: React.ReactNode;
}

const PlotBody: React.FC<Props> = ({ plot, mouza, lang, t, onCheck, onHelp, officerActions }) => {
  const st = STATUS_META[plotStatus(plot)];
  const landType = (lang === 'en' ? plot.land_type_en : plot.land_type_bn) || plot.land_type_bn || '—';
  const area = Number(plot.total_area_decimal) || 0;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-slate-500">{t('অবস্থা', 'Status')}</span>
        <StatusBadge tone={st.tone}>{lang === 'bn' ? st.bn : st.en}</StatusBadge>
      </div>
      <DetailList
        items={[
          [t('দাগ নং', 'Dag no.'), toBanglaDigits(plot.dag_no, lang)],
          [t('মৌজা', 'Mouza'), mouza || '—'],
          [t('জমির পরিমাণ', 'Area'), area ? `${toBanglaDigits(area, lang)} ${t('শতক', 'decimal')}` : '—'],
          [t('জমির ধরন', 'Land type'), landType],
        ]}
      />
      <div className="space-y-2">
        <Button
          type="button"
          onClick={onCheck}
          className="h-11 w-full gap-2 rounded-xl bg-[#006A4E] text-sm font-medium text-white hover:bg-[#00553e] cursor-pointer"
        >
          {t('এই জমি যাচাই করুন', 'Check this land')}
          <ArrowRight className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onHelp}
          className="h-11 w-full gap-2 rounded-xl border-slate-200 text-sm font-medium text-slate-700 cursor-pointer"
        >
          <LifeBuoy className="size-4 text-[#006A4E]" />
          {t('সাহায্য চাই', 'Get help')}
        </Button>
        {officerActions}
      </div>
    </div>
  );
};

const title = (plot: SelectedPlot, lang: 'bn' | 'en', t: T) => `${t('দাগ', 'Dag')} ${toBanglaDigits(plot.dag_no, lang)}`;

/** Desktop: floating card on the right of the map (map stays usable). */
export const PlotPanel: React.FC<Props & { onClose: () => void }> = ({ onClose, ...p }) => (
  <aside
    aria-label={title(p.plot, p.lang, p.t)}
    className="pointer-events-auto absolute right-3 top-3 z-20 flex max-h-[calc(100%-8rem)] w-80 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
  >
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold text-slate-900">{title(p.plot, p.lang, p.t)}</h2>
        <p className="truncate text-xs text-slate-500">{p.mouza}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={p.t('বন্ধ করুন', 'Close')}
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
      >
        <X className="size-4" />
      </button>
    </div>
    <div className="overflow-y-auto p-4">
      <PlotBody {...p} />
    </div>
  </aside>
);

/** Phone: bottom sheet. */
export const PlotDrawer: React.FC<Props & { open: boolean; onClose: () => void }> = ({ open, onClose, ...p }) => (
  <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
    <DrawerContent className="max-h-[85dvh] rounded-t-2xl">
      <DrawerHeader className="px-4 pb-2 text-left">
        <DrawerTitle className="text-base font-semibold text-slate-900">{title(p.plot, p.lang, p.t)}</DrawerTitle>
        <DrawerDescription className="text-xs text-slate-500">{p.mouza}</DrawerDescription>
      </DrawerHeader>
      <div className="overflow-y-auto px-4 pb-6">
        <PlotBody {...p} />
      </div>
    </DrawerContent>
  </Drawer>
);
