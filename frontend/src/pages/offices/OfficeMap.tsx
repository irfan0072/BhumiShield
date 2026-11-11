import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';
import { hasCoords, OfficeItem } from './officeUtils';

const GREEN = '#006A4E';

/**
 * Small Leaflet map with one circle marker per office (plain Leaflet, same tiles as MyLandMap).
 * Popups are built with DOM nodes + textContent, never HTML strings.
 */
export const OfficeMap: React.FC<{
  offices: OfficeItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  userPos: [number, number] | null;
  lang: 'bn' | 'en';
  className?: string;
}> = ({ offices, selectedId, onSelect, userPos, lang, className }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const groupRef = useRef<L.LayerGroup | null>(null);
  const userRef = useRef<L.CircleMarker | null>(null);
  const markersRef = useRef<Map<number, L.CircleMarker>>(new Map());
  /** Last view to show; re-applied when the map becomes visible (phone list/map switch). */
  const viewRef = useRef<{ bounds?: L.LatLngBounds; center?: L.LatLngTuple }>({});
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const fitView = (m: L.Map) => {
    const el = boxRef.current;
    if (!el || el.clientWidth === 0) return; // hidden: applied later by the ResizeObserver
    const v = viewRef.current;
    if (v.center) m.setView(v.center, 13);
    else if (v.bounds) m.fitBounds(v.bounds, { padding: [28, 28], maxZoom: 13 });
  };

  // Create once, destroy on unmount.
  useEffect(() => {
    if (!boxRef.current || mapRef.current) return;
    const m = L.map(boxRef.current, { center: [23.75, 90.4], zoom: 8, minZoom: 6, maxZoom: 18, scrollWheelZoom: false });
    // Same tile host as MyLandMap (Esri). The CARTO voyager tiles now return "API key required".
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: '© Esri',
    }).addTo(m);
    groupRef.current = L.layerGroup().addTo(m);
    mapRef.current = m;
    let wasHidden = boxRef.current.clientWidth === 0;
    const ro = new ResizeObserver(() => {
      const el = boxRef.current;
      const hidden = !el || el.clientWidth === 0 || el.clientHeight === 0;
      m.invalidateSize();
      if (wasHidden && !hidden) fitView(m);
      wasHidden = hidden;
    });
    ro.observe(boxRef.current);
    return () => {
      ro.disconnect();
      m.remove();
      mapRef.current = null;
      groupRef.current = null;
      userRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // Office markers.
  useEffect(() => {
    const m = mapRef.current;
    const g = groupRef.current;
    if (!m || !g) return;
    g.clearLayers();
    markersRef.current.clear();
    const pts: L.LatLngTuple[] = [];
    offices.filter(hasCoords).forEach((o) => {
      const ll: L.LatLngTuple = [Number(o.latitude), Number(o.longitude)];
      pts.push(ll);
      const box = document.createElement('div');
      const name = document.createElement('div');
      name.style.fontWeight = '600';
      name.textContent = (lang === 'bn' ? o.name_bn : o.name_en) || o.name_bn;
      const addr = document.createElement('div');
      addr.style.color = '#64748b';
      addr.textContent = (lang === 'bn' ? o.address_bn : o.address_en) || o.address_bn || '';
      box.append(name, addr);
      const mk = L.circleMarker(ll, { radius: 8, color: '#fff', weight: 2, fillColor: GREEN, fillOpacity: 0.95 })
        .bindPopup(box)
        .on('click', () => onSelectRef.current(o.id));
      mk.addTo(g);
      markersRef.current.set(o.id, mk);
    });
    if (userRef.current) pts.push([userRef.current.getLatLng().lat, userRef.current.getLatLng().lng]);
    viewRef.current = pts.length === 1 ? { center: pts[0] } : pts.length > 1 ? { bounds: L.latLngBounds(pts) } : {};
    fitView(m);
  }, [offices, lang]);

  // Highlight + pan to the selected office.
  useEffect(() => {
    const m = mapRef.current;
    markersRef.current.forEach((mk, id) => {
      const on = id === selectedId;
      mk.setStyle({ radius: on ? 11 : 8, fillColor: on ? '#C2410C' : GREEN } as L.CircleMarkerOptions);
      if (on) {
        mk.bringToFront();
        if (m) {
          m.flyTo(mk.getLatLng(), Math.max(m.getZoom(), 13), { duration: 0.5 });
          mk.openPopup();
        }
      }
    });
  }, [selectedId, offices]);

  // "Near me" position.
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    userRef.current?.remove();
    userRef.current = null;
    if (!userPos) return;
    userRef.current = L.circleMarker(userPos, { radius: 7, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(m);
    const near = offices.filter(hasCoords).slice(0, 3).map((o) => [Number(o.latitude), Number(o.longitude)] as L.LatLngTuple);
    viewRef.current = { bounds: L.latLngBounds([userPos, ...near]) };
    fitView(m);
  }, [userPos]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={boxRef} className={cn('z-0 h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100', className)} />;
};

export default OfficeMap;
