import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapWorkspace.css';
import { LocateFixed, Minus, Plus, Ruler, X } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { SourceCards } from '../components/sources/SourceCards';
import { useAppUI } from '../i18n';
import { mapApi, MapLocation, MapPlot, MapWorkspace, parcelApi, ParcelDesign } from '../components/map/mapApi';
import { MapDataManager } from '../components/map/MapDataManager';
import { ParcelDesigner } from '../components/map/ParcelDesigner';
import { OfflineGridLayer } from '../components/map/OfflineGridLayer';
import { TaskAssignmentDrawer } from '../components/map/TaskAssignmentDrawer';
import { mapAssignmentsApi, MapTaskAssignment } from '../api/mapAssignmentsApi';
import { mapFeaturesApi, MapFeature, normalizeBnDigits } from '../api/mapFeaturesApi';
import { BANGLADESH_DIVISIONS, BANGLADESH_RIVERS, ALL_MOUZA_CADASTRAL_PLOTS } from '../data/bangladeshGeo';
import { notify } from '../components/admin/kit';
import { toBanglaDigits } from '../theme/tokens';
import { BASEMAP_CONFIGS, BasemapMode, PUBLIC_BASEMAPS } from './map/basemaps';
import { LEGEND, SelectedPlot, STATUS_META } from './map/plotStatus';
import { MapSearchCard, DAG_MAX } from './map/MapSearchCard';
import { PlotDrawer, PlotPanel } from './map/PlotDetails';
import { MapMoreMenu } from './map/MapMoreMenu';
import { CoordHud } from './map/CoordHud';

// Re-exported for ParcelDesigner, which imports them from this module.
export { BASEMAP_CONFIGS };
export type { BasemapMode };

const DEFAULT_CENTER: L.LatLngTuple = [23.858, 90.318]; // Birulia, Savar
const DESIGN_ROLES = [
  'admin',
  'system_admin',
  'ac_land',
  'land_office_assistant',
  'field_verification_officer',
  'settlement_records_officer',
  'settlement_checker',
];

/** Build a tooltip element with textContent (API strings never go through innerHTML). */
const tipEl = (lines: string[]) => {
  const el = document.createElement('div');
  lines.filter(Boolean).forEach((line, i) => {
    const row = document.createElement(i === 0 ? 'strong' : 'div');
    row.textContent = line;
    if (i === 0) row.style.display = 'block';
    el.appendChild(row);
  });
  return el;
};

const useIsDesktop = () => {
  const query = '(min-width: 1024px)';
  const [ok, setOk] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setOk(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return ok;
};

const readParams = () => {
  const p = new URLSearchParams(window.location.search);
  const num = (k: string) => {
    const n = Number(p.get(k));
    return Number.isFinite(n) ? n : 0;
  };
  const lat = num('lat');
  const lng = num('lng');
  const inBd = lat >= 20 && lat <= 27 && lng >= 87.5 && lng <= 93.5;
  return {
    mouza: Math.max(0, Math.floor(num('mouza'))) || 1,
    q: (p.get('q') || '').trim().slice(0, DAG_MAX),
    lat: inBd ? lat : 0,
    lng: inBd ? lng : 0,
    focus: p.get('focus') === '1',
    design: p.get('design') === '1',
    manage: p.get('manage') === '1',
  };
};

export const CadastralMapPage: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { t, lang, user } = useAppUI();
  const admin = !!user && ['admin', 'system_admin'].includes(user.role);
  const canDesign = !!user && DESIGN_ROLES.includes(user.role);
  const isDesktop = useIsDesktop();

  const initial = useRef(readParams()).current;

  // Officer tools
  const [design, setDesign] = useState(initial.design && canDesign);
  const [manage, setManage] = useState(initial.manage && admin);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [myTasksCount, setMyTasksCount] = useState(0);

  // Search
  const [location, setLocation] = useState(initial.mouza);
  const [q, setQ] = useState(initial.q);
  const [search, setSearch] = useState(initial.q);
  const [data, setData] = useState<MapWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SelectedPlot | null>(null);
  const [revision, setRevision] = useState(0);
  const focusNext = useRef(initial.focus && !!initial.q);

  // Layers & display
  const [designed, setDesigned] = useState<ParcelDesign[]>([]);
  const [geo, setGeo] = useState<any>(null);
  const [basemapMode, setBasemapMode] = useState<BasemapMode>('satellite');
  const [division, setDivision] = useState('');
  const [showDivisions, setShowDivisions] = useState(false);
  const [showRivers, setShowRivers] = useState(false);
  const [showParcels, setShowParcels] = useState(true);
  const [showOffices, setShowOffices] = useState(true);
  const [showCoords, setShowCoords] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [points, setPoints] = useState<L.LatLng[]>([]);
  const [locating, setLocating] = useState(false);
  const [mapReady, setMapReady] = useState<L.Map | null>(null);

  // Leaflet refs
  const root = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const baseTileLayer = useRef<L.TileLayer | null>(null);
  const offlineGrid = useRef<OfflineGridLayer | null>(null);
  const divisionsLayer = useRef<L.LayerGroup | null>(null);
  const riversLayer = useRef<L.LayerGroup | null>(null);
  const cadastralPlotsLayer = useRef<L.LayerGroup | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const officeMarkers = useRef<L.LayerGroup | null>(null);
  const meLayer = useRef<L.LayerGroup | null>(null);
  const designLayer = useRef<L.LayerGroup | null>(null);
  const geometry = useRef<L.GeoJSON | null>(null);
  const lastFitGeo = useRef<any>(null);
  const measureLayer = useRef<L.LayerGroup | null>(null);
  const measureEnabled = useRef(false);
  const pendingLayer = useRef<{ d: { location_id: number }; g: any } | null>(null);
  const isDesktopRef = useRef(isDesktop);
  isDesktopRef.current = isDesktop;
  const designedRef = useRef<ParcelDesign[]>([]);
  designedRef.current = designed;

  const locations = data?.locations || [];
  const loc = locations.find((l) => l.id === location);
  const name = (row: any, key: string) => row?.[`${key}_${lang}`] || row?.[`${key}_bn`] || '';

  // ---------------------------------------------------------------- tasks
  const refreshTasksCount = useCallback(async () => {
    if (!canDesign) return;
    try {
      const tasks = await mapAssignmentsApi.myAssignments();
      if (Array.isArray(tasks)) {
        setMyTasksCount(
          tasks.filter((x: MapTaskAssignment) => x.status === 'pending' || x.status === 'in_progress').length
        );
      }
    } catch {
      // offline or no access
    }
  }, [canDesign]);
  useEffect(() => {
    refreshTasksCount();
  }, [refreshTasksCount, user?.id]);

  // ---------------------------------------------------------------- focus helpers
  /** Fly to a plot; keeps it clear of the side panel (desktop) or bottom sheet (phone). */
  const flyToPlot = useCallback((plot: MapPlot, locs: MapLocation[]) => {
    const m = map.current;
    if (!m) return;
    const pad = isDesktopRef.current
      ? { paddingTopLeft: [400, 48] as L.PointTuple, paddingBottomRight: [360, 48] as L.PointTuple }
      : { paddingTopLeft: [24, 150] as L.PointTuple, paddingBottomRight: [24, 380] as L.PointTuple };
    const cad = (ALL_MOUZA_CADASTRAL_PLOTS[Number(plot.location_id)] || []).find(
      (c) => String(c.dag_no) === String(plot.dag_no)
    );
    let bounds: L.LatLngBounds | null = null;
    if (cad) bounds = L.polygon(cad.coordinates).getBounds();
    if (!bounds?.isValid()) {
      const d = designedRef.current.find((x) => Number(x.plot_id) === plot.id);
      if (d?.geometry) bounds = L.geoJSON(d.geometry).getBounds();
    }
    if (bounds?.isValid()) {
      m.flyToBounds(bounds, { ...pad, maxZoom: 18, duration: 0.8 });
      return;
    }
    const l = locs.find((x) => Number(x.id) === Number(plot.location_id));
    if (l && Number(l.latitude) && Number(l.longitude)) {
      m.flyTo([Number(l.latitude), Number(l.longitude)], 17, { duration: 0.8 });
    }
  }, []);

  const pickPlot = useCallback(
    (plot: SelectedPlot, locs: MapLocation[] = locations, fly = true) => {
      setSelected(plot);
      if (fly) flyToPlot(plot, locs);
    },
    [flyToPlot, locations]
  );

  /** After a search (or ?focus=1): select the exact match, or the only result. */
  const applyFocus = useCallback(
    (res: MapWorkspace, term: string) => {
      const plots = Array.isArray(res.plots) ? res.plots : [];
      const norm = normalizeBnDigits(term.trim());
      const match =
        plots.find((p) => normalizeBnDigits(String(p.dag_no)) === norm) || (plots.length === 1 ? plots[0] : null);
      if (match) pickPlot(match, res.locations || []);
      else if (plots.length === 0) toast(t('এই দাগ পাওয়া যায়নি', 'Plot not found'));
    },
    [pickPlot, t]
  );

  // ---------------------------------------------------------------- data
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    mapApi
      .workspace(location, search, 1, controller.signal)
      .then((res) => {
        setData(res);
        setLoading(false);
        if (focusNext.current) {
          focusNext.current = false;
          applyFocus(res, search);
        }
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        focusNext.current = false;
        notify.err(e, lang, t('ম্যাপের তথ্য আনা যায়নি', 'Could not load map data'));
      });
    return () => controller.abort();
  }, [location, search, revision]); // eslint-disable-line react-hooks/exhaustive-deps

  // Admin preview from MapDataManager
  useEffect(() => {
    if (pendingLayer.current?.d.location_id === location) {
      setGeo(pendingLayer.current.g);
      pendingLayer.current = null;
    } else {
      setGeo(null);
    }
  }, [location]);

  // ---------------------------------------------------------------- map init (once)
  useEffect(() => {
    if (!root.current || map.current) return;
    const startCenter: L.LatLngTuple = initial.lat && initial.lng ? [initial.lat, initial.lng] : DEFAULT_CENTER;
    const m = L.map(root.current, {
      center: startCenter,
      zoom: initial.lat && initial.lng ? 16 : 15,
      minZoom: 5,
      maxZoom: 22,
      zoomControl: false,
      preferCanvas: true,
      maxBounds: [
        [20.0, 87.5],
        [27.0, 93.5],
      ],
    });
    map.current = m;
    m.attributionControl.setPrefix(false);
    m.attributionControl.setPosition('topright');

    divisionsLayer.current = L.layerGroup().addTo(m);
    riversLayer.current = L.layerGroup().addTo(m);
    cadastralPlotsLayer.current = L.layerGroup().addTo(m);
    markers.current = L.layerGroup().addTo(m);
    officeMarkers.current = L.layerGroup().addTo(m);
    measureLayer.current = L.layerGroup().addTo(m);
    meLayer.current = L.layerGroup().addTo(m);
    offlineGrid.current = new OfflineGridLayer({ theme: 'cadastral' });

    m.on('click', (e: L.LeafletMouseEvent) => {
      if (measureEnabled.current) setPoints((p) => (p.length >= 16 ? [e.latlng] : [...p, e.latlng]));
    });

    const observer = new ResizeObserver(() => m.invalidateSize());
    observer.observe(root.current);
    setMapReady(m);

    return () => {
      observer.disconnect();
      m.remove();
      map.current = null;
      setMapReady(null);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fly to mouza once its location is known (unless lat/lng or a focused plot drives the view)
  const flewToMouza = useRef(false);
  useEffect(() => {
    if (flewToMouza.current || !loc || !map.current) return;
    flewToMouza.current = true;
    if (initial.lat && initial.lng) return;
    if (selected) return;
    if (Number(loc.latitude) && Number(loc.longitude)) {
      map.current.setView([Number(loc.latitude), Number(loc.longitude)], 15);
    }
  }, [loc]); // eslint-disable-line react-hooks/exhaustive-deps

  // Basemap
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (baseTileLayer.current) {
      m.removeLayer(baseTileLayer.current);
      baseTileLayer.current = null;
    }
    if (offlineGrid.current && m.hasLayer(offlineGrid.current)) m.removeLayer(offlineGrid.current);
    const cfg = BASEMAP_CONFIGS[basemapMode];
    if (basemapMode === 'offline_grid' || !cfg.url) {
      offlineGrid.current?.setTheme('cadastral');
      offlineGrid.current?.addTo(m);
      return;
    }
    // Offline grid sits *under* the real tiles, so it only fills gaps where tiles fail.
    offlineGrid.current?.setZIndex(0);
    const tile = L.tileLayer(cfg.url, {
      maxNativeZoom: cfg.maxZoom || 19,
      maxZoom: 22,
      zIndex: 1,
      subdomains: (cfg.subdomains || ['a', 'b', 'c']).join(''),
      attribution: cfg.attribution || '',
    });
    tile.on('tileerror', () => {
      if (offlineGrid.current && !m.hasLayer(offlineGrid.current)) offlineGrid.current.addTo(m);
    });
    tile.addTo(m);
    baseTileLayer.current = tile;
  }, [basemapMode]);

  // Divisions & rivers
  useEffect(() => {
    const m = map.current;
    if (!m || !divisionsLayer.current || !riversLayer.current) return;
    divisionsLayer.current.clearLayers();
    riversLayer.current.clearLayers();
    if (showDivisions) {
      BANGLADESH_DIVISIONS.forEach((div) => {
        const sel = division === div.name_bn;
        const poly = L.polygon(div.polygon, {
          color: sel ? '#006A4E' : div.color,
          weight: sel ? 3 : 1.5,
          opacity: 0.85,
          fillColor: div.color,
          fillOpacity: sel ? 0.2 : 0.06,
          dashArray: sel ? undefined : '5, 5',
        });
        poly.bindTooltip(
          tipEl([
            lang === 'bn' ? `${div.name_bn} বিভাগ` : `${div.name_en} Division`,
            `${t('সদর', 'HQ')}: ${div.headquarters_bn}`,
          ]),
          { sticky: true }
        );
        poly.on('click', () => {
          setDivision(div.name_bn);
          m.flyTo(div.center, div.zoom, { duration: 1 });
        });
        poly.addTo(divisionsLayer.current!);
      });
    }
    if (showRivers) {
      BANGLADESH_RIVERS.forEach((river) => {
        L.polyline(river.coordinates, { color: river.color, weight: river.width, opacity: 0.85 })
          .bindTooltip(tipEl([river.name_bn]), { sticky: true })
          .addTo(riversLayer.current!);
      });
    }
  }, [showDivisions, showRivers, division, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bundled mouza sketch plots
  useEffect(() => {
    const group = cadastralPlotsLayer.current;
    if (!map.current || !group) return;
    group.clearLayers();
    if (!showParcels) return;
    (ALL_MOUZA_CADASTRAL_PLOTS[location] || []).forEach((p) => {
      const isSel = !!selected && String(selected.dag_no) === String(p.dag_no);
      const stroke = p.color === '#7c3aed' ? '#dc2626' : p.color;
      const fill = p.fillColor === '#8b5cf6' || p.fillColor === '#ede9fe' ? '#fee2e2' : p.fillColor;
      const poly = L.polygon(p.coordinates, {
        color: isSel ? '#f59e0b' : stroke,
        weight: isSel ? 3.5 : 2,
        fillColor: isSel ? '#f59e0b' : fill,
        fillOpacity: isSel ? 0.55 : 0.3,
      });
      poly.bindTooltip(
        tipEl([
          `${t('দাগ', 'Dag')} ${toBanglaDigits(p.dag_no, lang)}`,
          `${toBanglaDigits(p.area_decimal, lang)} ${t('শতক', 'decimal')} · ${lang === 'bn' ? p.land_type_bn : p.land_type_en || p.land_type_bn}`,
        ]),
        { sticky: true }
      );
      poly.on('click', () => {
        const found = data?.plots.find(
          (item) => String(item.dag_no) === String(p.dag_no) || normalizeBnDigits(item.dag_no) === String(p.dag_no)
        );
        setSelected(
          found || {
            id: Number(p.dag_no) || 9999,
            location_id: p.location_id,
            plot_code: `PLT-MOUZA-${p.dag_no}`,
            dag_no: p.dag_no,
            dag_no_bn: p.dag_no_bn,
            total_area_decimal: p.area_decimal,
            land_type_bn: p.land_type_bn,
            land_type_en: p.land_type_en,
            owner_sale_locked: 0,
            is_admin_frozen: 0,
            has_active_lien: 0,
            local: true,
          }
        );
      });
      poly.addTo(group);
      L.marker(p.center, {
        icon: L.divIcon({
          className: `cadastral-dag-badge ${isSel ? 'selected' : ''}`,
          html: `<span>${toBanglaDigits(String(p.dag_no).replace(/[^0-9A-Za-z\-/]/g, ''), lang)}</span>`,
          iconSize: [28, 18],
          iconAnchor: [14, 9],
        }),
        interactive: false,
      }).addTo(group);
    });
  }, [location, showParcels, selected?.dag_no, data?.plots, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // Saved vector features (map_features API)
  useEffect(() => {
    let live = true;
    if (!location) return;
    mapFeaturesApi
      .list({ location_id: location })
      .then((feats) => {
        const group = cadastralPlotsLayer.current;
        if (!live || !map.current || !group || !Array.isArray(feats)) return;
        // The API can return many copies of the same shape; stacked fills turn opaque, so draw each once.
        const seen = new Set<string>();
        feats.forEach((feat: MapFeature) => {
          const g = feat.geometry;
          if (!g) return;
          const key = `${g.type}:${JSON.stringify(g.coordinates)}`;
          if (seen.has(key)) return;
          seen.add(key);
          if (g.type === 'Polygon' && Array.isArray(g.coordinates[0])) {
            const ll: L.LatLngTuple[] = (g.coordinates[0] as any[]).map(([lng, lat]) => [lat, lng]);
            const p = L.polygon(ll, { color: '#10b981', weight: 2, fillColor: '#10b981', fillOpacity: 0.2 });
            if (feat.attributes?.dag_no) p.bindTooltip(tipEl([`${t('দাগ', 'Dag')} ${feat.attributes.dag_no}`]));
            p.addTo(group);
          } else if (g.type === 'LineString' && Array.isArray(g.coordinates)) {
            const ll: L.LatLngTuple[] = (g.coordinates as any[]).map(([lng, lat]) => [lat, lng]);
            const l = L.polyline(ll, { color: '#0284c7', weight: 3, dashArray: '4, 4' });
            if (feat.attributes?.name) l.bindTooltip(tipEl([String(feat.attributes.name)]));
            l.addTo(group);
          } else if (g.type === 'Point') {
            const [lng, lat] = g.coordinates as any;
            const mk = L.circleMarker([lat, lng], { radius: 6, color: '#b45309', fillColor: '#f59e0b', fillOpacity: 0.9 });
            if (feat.attributes?.name) mk.bindTooltip(tipEl([String(feat.attributes.name)]));
            mk.addTo(group);
          }
        });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [location, revision, showParcels]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mouza marker & service offices
  useEffect(() => {
    if (!map.current || !markers.current || !officeMarkers.current || !data) return;
    markers.current.clearLayers();
    officeMarkers.current.clearLayers();
    const list = loc ? [loc] : locations;
    list.forEach((l) => {
      if (!Number(l.latitude) || !Number(l.longitude)) return;
      const mk = L.circleMarker([Number(l.latitude), Number(l.longitude)], {
        radius: 7,
        color: '#ffffff',
        weight: 2.5,
        fillColor: '#006A4E',
        fillOpacity: 0.95,
      }).addTo(markers.current!);
      mk.bindTooltip(tipEl([`${name(l, 'mouza')} ${t('মৌজা', 'Mouza')}`, `${name(l, 'upazila')}, ${name(l, 'district')}`]), {
        direction: 'top',
        offset: [0, -6],
      });
    });
    if (showOffices && Array.isArray(data.offices)) {
      data.offices.forEach((o) => {
        if (!Number(o.latitude) || !Number(o.longitude)) return;
        const mk = L.marker([Number(o.latitude), Number(o.longitude)], {
          icon: L.divIcon({
            className: 'map-office-pin',
            html: '<span style="display:block;width:16px;height:16px;border-radius:9999px;background:#1d4ed8;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)"></span>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        }).addTo(officeMarkers.current!);
        mk.bindTooltip(tipEl([name(o, 'name'), name(o, 'upazila'), o.contact_phone ? String(o.contact_phone) : '']), {
          direction: 'top',
          offset: [0, -8],
        });
      });
    }
  }, [data, location, lang, showOffices]); // eslint-disable-line react-hooks/exhaustive-deps

  // Office-published parcel designs
  useEffect(() => {
    let live = true;
    parcelApi
      .list(location, true)
      .then((r) => live && setDesigned(Array.isArray(r) ? r : []))
      .catch(() => live && setDesigned([]));
    return () => {
      live = false;
    };
  }, [location, revision, design]);

  useEffect(() => {
    if (!map.current) return;
    designLayer.current?.remove();
    const group = L.layerGroup().addTo(map.current);
    designLayer.current = group;
    if (showParcels) {
      designed.forEach((d) => {
        const isSel = !!selected && Number(d.plot_id) === selected.id;
        const l = L.geoJSON(d.geometry, {
          style: { color: isSel ? '#b45309' : '#087f5b', weight: isSel ? 3 : 2, fillColor: '#059669', fillOpacity: 0.2 },
        });
        l.bindTooltip(tipEl([`${t('দাগ', 'Dag')} ${d.dag_no}`, `${d.recorded_area} ${t('শতক', 'decimal')}`]));
        l.on('click', () => {
          const p = data?.plots.find((x) => x.id === Number(d.plot_id));
          if (p) setSelected(p);
          else toast(`${t('দাগ', 'Dag')} ${d.dag_no} · ${d.recorded_area} ${t('শতক', 'decimal')}`);
        });
        l.addTo(group);
      });
    }
    return () => {
      group.remove();
    };
  }, [designed, data, selected?.id, showParcels, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // Admin-previewed dataset geometry, coloured by legal status
  useEffect(() => {
    if (!map.current) return;
    geometry.current?.remove();
    geometry.current = null;
    if (!geo || !showParcels) return;
    const layer = L.geoJSON(geo, {
      style: (feature) => {
        const plotId = Number(feature?.properties?.plot_id);
        const linked = data?.plots.find((p) => p.id === plotId);
        let color = '#087f5b';
        let fillColor = '#34d399';
        if (linked?.is_admin_frozen || linked?.owner_sale_locked) {
          color = '#dc2626';
          fillColor = '#ef4444';
        } else if (linked?.has_active_lien) {
          color = '#d97706';
          fillColor = '#f59e0b';
        }
        const isSel = !!selected && selected.id === plotId;
        return {
          color: isSel ? '#b45309' : color,
          weight: isSel ? 3.5 : 2,
          fillColor: isSel ? '#d97706' : fillColor,
          fillOpacity: isSel ? 0.45 : 0.3,
        };
      },
      onEachFeature: (feature, l) => {
        const p = feature.properties || {};
        l.bindTooltip(tipEl([p.label || '', p.dag_no ? `${t('দাগ', 'Dag')} ${p.dag_no}` : '']));
        l.on('click', () => {
          const plot = data?.plots.find((x) => x.id === Number(p.plot_id));
          if (plot) setSelected(plot);
          else toast(t('এই অংশের রেকর্ড পাওয়া যায়নি', 'No record linked to this area'));
        });
      },
    }).addTo(map.current);
    geometry.current = layer;
    if (lastFitGeo.current !== geo) {
      lastFitGeo.current = geo;
      const b = layer.getBounds();
      if (b.isValid()) map.current.fitBounds(b, { padding: [32, 32], maxZoom: 18 });
    }
  }, [geo, selected?.id, lang, showParcels, data?.plots]); // eslint-disable-line react-hooks/exhaustive-deps

  // Measurement
  useEffect(() => {
    const group = measureLayer.current;
    if (!group) return;
    group.clearLayers();
    if (points.length) {
      L.polyline(points, { color: '#f59e0b', weight: 3, dashArray: '6 5' }).addTo(group);
      points.forEach((p) => L.circleMarker(p, { radius: 4, color: '#f59e0b' }).addTo(group));
    }
  }, [points]);
  const measureMeters = points.reduce((s, p, i) => (i ? s + p.distanceTo(points[i - 1]) : 0), 0);
  const toggleMeasurement = () => {
    const next = !measuring;
    setMeasuring(next);
    measureEnabled.current = next;
    if (!next) setPoints([]);
  };

  // Escape leaves full screen
  useEffect(() => {
    if (!fullScreen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFullScreen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullScreen]);

  // ---------------------------------------------------------------- actions
  const locateMe = () => {
    if (locating) return;
    if (!navigator.geolocation) {
      toast.error(t('এই ডিভাইসে অবস্থান পাওয়া যায় না', 'Location is not available on this device'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        const inBd = latitude >= 20 && latitude <= 27 && longitude >= 87.5 && longitude <= 93.5;
        if (!inBd) {
          toast(t('আপনার অবস্থান বাংলাদেশের বাইরে', 'You are outside Bangladesh'));
          return;
        }
        meLayer.current?.clearLayers();
        L.circle([latitude, longitude], { radius: Math.min(accuracy || 30, 500), color: '#2563eb', weight: 1, fillOpacity: 0.12 }).addTo(meLayer.current!);
        L.circleMarker([latitude, longitude], { radius: 7, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(meLayer.current!);
        map.current?.flyTo([latitude, longitude], 17, { duration: 0.8 });
      },
      () => {
        setLocating(false);
        toast.error(t('অবস্থান পাওয়া যায়নি', 'Could not get your location'));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const changeMouza = (id: number) => {
    setLocation(id);
    setSelected(null);
    const target = locations.find((l) => l.id === id);
    if (target && map.current && Number(target.latitude)) {
      map.current.flyTo([Number(target.latitude), Number(target.longitude)], 15, { duration: 1 });
    }
  };

  const runSearch = () => {
    const term = q.trim().slice(0, DAG_MAX);
    if (!term) return;
    if (term === search && data && !loading) {
      applyFocus(data, term);
      return;
    }
    focusNext.current = true;
    setSearch(term);
  };

  const clearSearch = () => {
    setQ('');
    setSearch('');
    setSelected(null);
  };

  const normQ = normalizeBnDigits(q.trim());
  const suggestions = useMemo(() => {
    if (!normQ || !data?.plots) return [];
    return data.plots.filter((p) => normalizeBnDigits(String(p.dag_no)).includes(normQ)).slice(0, 8);
  }, [normQ, data?.plots]);

  const handleNavigateToTask = (lat: number, lng: number, targetLocId: number, targetPlotId?: number | null) => {
    setLocation(targetLocId);
    map.current?.flyTo([lat, lng], 17, { duration: 1.2 });
    const found = targetPlotId ? data?.plots.find((p) => p.id === targetPlotId) : null;
    if (found) setSelected(found);
  };

  const selMouza = selected
    ? (() => {
        const l = locations.find((x) => Number(x.id) === Number(selected.location_id)) || loc;
        return l ? `${name(l, 'mouza')}, ${name(l, 'upazila')}` : '';
      })()
    : '';

  const detailProps = selected
    ? {
        plot: selected,
        mouza: selMouza,
        lang,
        t,
        onCheck: () => {
          const dag = String(selected.dag_no).trim().slice(0, DAG_MAX);
          const mouzaId = Number(selected.location_id) || location;
          onNavigate?.(`check?dag=${encodeURIComponent(dag)}&mouza=${encodeURIComponent(String(mouzaId))}`);
        },
        onHelp: () => onNavigate?.('help?section=triage'),
        officerActions: canDesign ? (
          <button
            type="button"
            onClick={() => setTaskDrawerOpen(true)}
            className="h-10 w-full rounded-xl text-sm text-[#006A4E] hover:bg-emerald-50 cursor-pointer"
          >
            {t('মাঠের কাজ দিন', 'Assign field task')}
          </button>
        ) : undefined,
      }
    : null;

  const ctrlBtn =
    'flex size-11 items-center justify-center text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer';

  return (
    <div
      className={cn(
        'relative h-full min-h-[420px] w-full overflow-hidden bg-slate-200 font-sans',
        fullScreen && 'fixed inset-0 z-[1000] h-dvh'
      )}
    >
      <div ref={root} className="absolute inset-0" aria-label={t('জমির ম্যাপ', 'Land map')} role="region" />

      {/* Officer tools (rendered only for allowed roles) */}
      {canDesign && design && (
        <ParcelDesigner
          onExit={(id) => {
            if (id) setLocation(id);
            setDesign(false);
            setRevision((x) => x + 1);
          }}
        />
      )}
      {canDesign && (
        <TaskAssignmentDrawer
          isOpen={taskDrawerOpen}
          onClose={() => setTaskDrawerOpen(false)}
          locations={locations}
          activeLocationId={location || undefined}
          activePlotId={selected && !selected.local ? selected.id : undefined}
          onNavigateToLocation={handleNavigateToTask}
          onTaskCreated={() => {
            setRevision((x) => x + 1);
            refreshTasksCount();
          }}
        />
      )}
      {admin && (
        <Dialog open={manage} onOpenChange={setManage}>
          <DialogContent className="max-w-4xl p-6">
            <DialogHeader>
              <DialogTitle>{t('ম্যাপ ডাটা', 'Map data')}</DialogTitle>
              <DialogDescription>{t('মৌজার লেয়ার আপলোড ও যাচাই', 'Upload and review mouza layers')}</DialogDescription>
            </DialogHeader>
            <MapDataManager
              locations={locations}
              onChanged={() => setRevision((x) => x + 1)}
              onPreview={(d, g) => {
                if (location !== d.location_id) pendingLayer.current = { d, g };
                setLocation(d.location_id);
                setGeo(g);
                setManage(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showSources} onOpenChange={setShowSources}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('তথ্যের উৎস', 'Data sources')}</DialogTitle>
            <DialogDescription>{t('এই ম্যাপের সরকারি উৎস', 'Official sources for this map')}</DialogDescription>
          </DialogHeader>
          {showSources && <SourceCards locationId={location} />}
        </DialogContent>
      </Dialog>

      {/* Floating UI */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {/* Top-left: search (+ More) */}
        <div className="absolute inset-x-3 top-3 flex items-start gap-2">
          <MapSearchCard
            t={t}
            lang={lang}
            locations={locations}
            location={location}
            onLocation={changeMouza}
            q={q}
            onQ={setQ}
            onSearch={runSearch}
            onClear={clearSearch}
            suggestions={suggestions}
            onPick={(p) => {
              setQ(String(p.dag_no));
              pickPlot(p);
            }}
            busy={loading && focusNext.current}
            className="min-w-0 flex-1 sm:w-[22rem] sm:flex-none"
          />
          <MapMoreMenu
            t={t}
            lang={lang}
            layers={[
              { id: 'parcels', label: t('দাগের সীমা', 'Plot lines'), on: showParcels, set: setShowParcels },
              { id: 'offices', label: t('ভূমি অফিস', 'Land offices'), on: showOffices, set: setShowOffices },
              { id: 'rivers', label: t('নদী', 'Rivers'), on: showRivers, set: setShowRivers },
              { id: 'divisions', label: t('বিভাগের সীমা', 'Divisions'), on: showDivisions, set: setShowDivisions },
            ]}
            coords={showCoords}
            onCoords={setShowCoords}
            measuring={measuring}
            onMeasure={toggleMeasurement}
            fullScreen={fullScreen}
            onFullScreen={() => setFullScreen((v) => !v)}
            onSources={() => setShowSources(true)}
            onDesign={canDesign ? () => setDesign(true) : undefined}
            onTasks={canDesign ? () => setTaskDrawerOpen(true) : undefined}
            taskCount={myTasksCount}
            onManage={admin ? () => setManage(true) : undefined}
            className="shrink-0"
          />
        </div>

        {/* Bottom-left: measure, coordinates, basemap, legend */}
        <div className="absolute bottom-3 left-3 flex flex-col items-start gap-2">
          {measuring && (
            <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-lg">
              <Ruler className="size-4 text-amber-600" />
              <span className="font-medium">
                {toBanglaDigits(measureMeters.toFixed(1), lang)} {t('মিটার', 'm')}
              </span>
              <span className="hidden text-xs text-slate-500 sm:inline">{t('ম্যাপে ক্লিক করুন', 'Click on the map')}</span>
              <button
                type="button"
                onClick={toggleMeasurement}
                aria-label={t('মাপা বন্ধ', 'Stop measuring')}
                className="ml-1 flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
          )}
          {showCoords && mapReady && <CoordHud map={mapReady} t={t} lang={lang} />}
          <div
            role="radiogroup"
            aria-label={t('ম্যাপের ধরন', 'Map type')}
            className="pointer-events-auto flex rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
          >
            {PUBLIC_BASEMAPS.map((mode) => {
              const active = basemapMode === mode;
              const cfg = BASEMAP_CONFIGS[mode];
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setBasemapMode(mode)}
                  className={cn(
                    'h-9 rounded-lg px-3 text-sm font-medium cursor-pointer',
                    active ? 'bg-[#006A4E] text-white' : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {lang === 'bn' ? cfg.name_bn : cfg.name_en}
                </button>
              );
            })}
          </div>
          <ul
            aria-label={t('রঙের মানে', 'Legend')}
            className="pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-slate-200 bg-white/95 px-3 py-1.5 text-xs text-slate-700 shadow-sm"
          >
            {LEGEND.map((k) => (
              <li key={k} className="flex items-center gap-1.5">
                <span className={cn('size-2.5 rounded-full', STATUS_META[k].dot)} />
                {lang === 'bn' ? STATUS_META[k].bn : STATUS_META[k].en}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom-right: zoom + my location (kept clear of the floating help button) */}
        <div
          className={cn(
            'absolute bottom-[9.5rem] right-3 flex flex-col gap-2 lg:bottom-28',
            selected && isDesktop && 'lg:right-[21.5rem]'
          )}
        >
          <div className="pointer-events-auto flex flex-col divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <button type="button" onClick={() => map.current?.zoomIn()} aria-label={t('বড় করুন', 'Zoom in')} className={ctrlBtn}>
              <Plus className="size-5" />
            </button>
            <button type="button" onClick={() => map.current?.zoomOut()} aria-label={t('ছোট করুন', 'Zoom out')} className={ctrlBtn}>
              <Minus className="size-5" />
            </button>
          </div>
          <button
            type="button"
            onClick={locateMe}
            disabled={locating}
            title={t('আমার অবস্থান', 'My location')}
            aria-label={t('আমার অবস্থান', 'My location')}
            className={cn(ctrlBtn, 'pointer-events-auto rounded-xl border border-slate-200 bg-white shadow-lg')}
          >
            <LocateFixed className={cn('size-5 text-[#006A4E]', locating && 'animate-pulse')} />
          </button>
        </div>

        {/* Selected plot — desktop panel */}
        {detailProps && isDesktop && <PlotPanel {...detailProps} onClose={() => setSelected(null)} />}
      </div>

      {/* Selected plot — phone bottom sheet */}
      {detailProps && !isDesktop && <PlotDrawer {...detailProps} open onClose={() => setSelected(null)} />}
    </div>
  );
};
