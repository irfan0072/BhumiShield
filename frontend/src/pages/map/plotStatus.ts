import type { MapPlot } from '../../components/map/mapApi';
import type { Tone } from '../../components/admin/kit';

/** A plot picked on the map. `local` = drawn from the bundled mouza sketch, no linked land record. */
export type SelectedPlot = MapPlot & { local?: boolean };

export type PlotStatusKey = 'safe' | 'lien' | 'locked' | 'unknown';

export const plotStatus = (p: SelectedPlot): PlotStatusKey => {
  if (p.local) return 'unknown';
  if (p.is_admin_frozen || p.owner_sale_locked) return 'locked';
  if (p.has_active_lien) return 'lien';
  return 'safe';
};

export const STATUS_META: Record<PlotStatusKey, { bn: string; en: string; tone: Tone; dot: string }> = {
  safe: { bn: 'নিরাপদ', en: 'Safe', tone: 'green', dot: 'bg-emerald-500' },
  lien: { bn: 'বন্ধক', en: 'Mortgaged', tone: 'amber', dot: 'bg-amber-500' },
  locked: { bn: 'লক বা স্থগিত', en: 'Locked or frozen', tone: 'red', dot: 'bg-red-500' },
  unknown: { bn: 'যাচাই করুন', en: 'Not checked', tone: 'slate', dot: 'bg-slate-400' },
};

/** Legend shown on the map (unknown is not a map colour). */
export const LEGEND: PlotStatusKey[] = ['safe', 'lien', 'locked'];
