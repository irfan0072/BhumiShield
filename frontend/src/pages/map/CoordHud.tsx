import React, { useEffect, useState } from 'react';
import type L from 'leaflet';
import { Copy } from 'lucide-react';
import { notify } from '../../components/admin/kit';
import { toBanglaDigits } from '../../theme/tokens';

type T = (bn: string, en: string) => string;

/**
 * Cursor coordinate readout. Subscribes to the map itself so mouse moves
 * only re-render this pill, not the whole page.
 */
export const CoordHud: React.FC<{ map: L.Map | null; t: T; lang: 'bn' | 'en'; className?: string }> = ({
  map,
  t,
  lang,
  className = '',
}) => {
  const [c, setC] = useState<{ lat: number; lng: number; z: number } | null>(() => {
    if (!map) return null;
    const ctr = map.getCenter();
    return { lat: ctr.lat, lng: ctr.lng, z: map.getZoom() };
  });
  useEffect(() => {
    if (!map) return;
    let raf = 0;
    const onMove = (e: L.LeafletMouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setC({ lat: e.latlng.lat, lng: e.latlng.lng, z: map.getZoom() }));
    };
    const onZoom = () => setC((p) => (p ? { ...p, z: map.getZoom() } : p));
    map.on('mousemove', onMove);
    map.on('zoomend', onZoom);
    return () => {
      cancelAnimationFrame(raf);
      map.off('mousemove', onMove);
      map.off('zoomend', onZoom);
    };
  }, [map]);
  if (!c) return null;
  const text = `${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}`;
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard
          ?.writeText(text)
          .then(() => notify.ok(t('স্থানাঙ্ক কপি হয়েছে', 'Coordinates copied')))
          .catch(() => undefined);
      }}
      title={t('কপি করুন', 'Copy')}
      className={`pointer-events-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-2.5 font-mono text-xs text-slate-700 shadow-sm hover:bg-white cursor-pointer ${className}`}
    >
      {toBanglaDigits(c.lat.toFixed(5), lang)}, {toBanglaDigits(c.lng.toFixed(5), lang)} · Z{toBanglaDigits(c.z, lang)}
      <Copy className="size-3 text-slate-400" />
    </button>
  );
};
