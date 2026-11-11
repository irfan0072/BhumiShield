import React from 'react';
import {
  CheckSquare,
  Crosshair,
  Database,
  ExternalLink,
  FileText,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  PenTool,
  Ruler,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { toBanglaDigits } from '../../theme/tokens';

type T = (bn: string, en: string) => string;

export interface LayerToggle {
  id: string;
  label: string;
  on: boolean;
  set: (v: boolean) => void;
}

interface Props {
  t: T;
  lang: 'bn' | 'en';
  layers: LayerToggle[];
  coords: boolean;
  onCoords: (v: boolean) => void;
  measuring: boolean;
  onMeasure: () => void;
  fullScreen: boolean;
  onFullScreen: () => void;
  onSources: () => void;
  /** Officer tools — pass only what the user may use. */
  onDesign?: () => void;
  onTasks?: () => void;
  taskCount?: number;
  onManage?: () => void;
  className?: string;
}

const itemCls =
  'flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 cursor-pointer';

export const MapMoreMenu: React.FC<Props> = ({
  t,
  lang,
  layers,
  coords,
  onCoords,
  measuring,
  onMeasure,
  fullScreen,
  onFullScreen,
  onSources,
  onDesign,
  onTasks,
  taskCount = 0,
  onManage,
  className = '',
}) => {
  const officer = onDesign || onTasks || onManage;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`pointer-events-auto inline-flex h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-lg hover:bg-slate-50 cursor-pointer ${className}`}
        >
          <MoreHorizontal className="size-4" />
          <span className="hidden sm:inline">{t('আরও', 'More')}</span>
          <span className="sr-only sm:hidden">{t('আরও', 'More')}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 max-h-[70dvh] overflow-y-auto p-2">
        <p className="px-2.5 pb-1 pt-1 text-xs text-slate-500">{t('লেয়ার', 'Layers')}</p>
        {layers.map((l) => (
          <label key={l.id} className="flex h-10 items-center justify-between rounded-lg px-2.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
            {l.label}
            <Switch checked={l.on} onCheckedChange={l.set} aria-label={l.label} />
          </label>
        ))}
        <label className="flex h-10 items-center justify-between rounded-lg px-2.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
          <span className="flex items-center gap-2.5">
            <Crosshair className="size-4 text-slate-500" />
            {t('স্থানাঙ্ক', 'Coordinates')}
          </span>
          <Switch checked={coords} onCheckedChange={onCoords} aria-label={t('স্থানাঙ্ক', 'Coordinates')} />
        </label>
        <div className="my-1 border-t border-slate-100" />
        <button type="button" onClick={onMeasure} className={itemCls}>
          <Ruler className="size-4 text-slate-500" />
          {measuring ? t('মাপা বন্ধ', 'Stop measuring') : t('দূরত্ব মাপুন', 'Measure')}
        </button>
        <button type="button" onClick={onFullScreen} className={itemCls}>
          {fullScreen ? <Minimize2 className="size-4 text-slate-500" /> : <Maximize2 className="size-4 text-slate-500" />}
          {fullScreen ? t('ছোট পর্দা', 'Exit full screen') : t('পুরো পর্দা', 'Full screen')}
        </button>
        <button type="button" onClick={onSources} className={itemCls}>
          <FileText className="size-4 text-slate-500" />
          {t('তথ্যের উৎস', 'Data sources')}
        </button>
        <a href="https://map.land.gov.bd/" target="_blank" rel="noopener noreferrer" className={itemCls}>
          <ExternalLink className="size-4 text-slate-500" />
          {t('সরকারি ম্যাপ', 'Govt. map portal')}
        </a>
        {officer && (
          <>
            <div className="my-1 border-t border-slate-100" />
            <p className="px-2.5 pb-1 pt-1 text-xs text-slate-500">{t('অফিসের কাজ', 'Office tools')}</p>
            {onDesign && (
              <button type="button" onClick={onDesign} className={itemCls}>
                <PenTool className="size-4 text-[#006A4E]" />
                {t('নকশা আঁকুন', 'Draw parcels')}
              </button>
            )}
            {onTasks && (
              <button type="button" onClick={onTasks} className={itemCls}>
                <CheckSquare className="size-4 text-[#006A4E]" />
                <span className="flex-1">{t('কাজের তালিকা', 'Field tasks')}</span>
                {taskCount > 0 && (
                  <span className="rounded-full bg-red-600 px-1.5 text-xs font-medium text-white">
                    {toBanglaDigits(taskCount, lang)}
                  </span>
                )}
              </button>
            )}
            {onManage && (
              <button type="button" onClick={onManage} className={itemCls}>
                <Database className="size-4 text-[#006A4E]" />
                {t('ম্যাপ ডাটা', 'Map data')}
              </button>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};
