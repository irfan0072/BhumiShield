import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  Undo2,
  Redo2,
  Trash2,
  Plus,
  MapPin,
  Hexagon,
  Spline,
  Save,
  CheckCircle2,
  Ruler,
  AlertTriangle,
  Layers,
  ArrowLeft,
  RefreshCw,
  X,
  Compass,
  Building2,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { parcelApi, mapApi, mapError, ParcelDesign, MapLocation, MapPlot } from './mapApi';
import { OfflineGridLayer } from './OfflineGridLayer';
import { BASEMAP_CONFIGS, BasemapMode } from '../../pages/CadastralMapPage';
import {
  mapFeaturesApi,
  MapFeature,
  FeatureType,
  FeatureCategory,
  BD_LAND_CLASSES,
  FEATURE_CATEGORIES,
  CADASTRAL_CONSTANTS,
  toBnDigits,
  normalizeBnDigits,
} from '../../api/mapFeaturesApi';
import { useAppUI } from '../../i18n';
import './ParcelDesigner.css';
import { ParcelAllocationPanel } from './ParcelAllocationPanel';

export type XY = [number, number]; // [lng, lat]

export const ALLOWED_SURVEYOR_ROLES = [
  'admin',
  'system_admin',
  'ac_land',
  'land_office_assistant',
  'field_verification_officer',
  'settlement_records_officer',
  'settlement_checker',
];

interface FormFields {
  name: string;
  category: FeatureCategory | string;
  land_class: string;
  dag_no: string;
  khatian_no: string;
  jl_no: string;
  survey: 'CS' | 'SA' | 'RS' | 'BS' | 'BDS' | string;
  sheet_no: string;
  recorded_area: string;
  source_reference: string;
  plot_id: string;
  notes: string;
}

const emptyFields = (): FormFields => ({
  name: '',
  category: 'plot',
  land_class: 'নাল',
  dag_no: '',
  khatian_no: '',
  jl_no: '',
  survey: 'BS',
  sheet_no: '1',
  recorded_area: '',
  source_reference: 'সিএস/আরএস/বিএস মৌজা জরিপ নকশা অনুসারে সীমানা চিহ্নিতকরণ',
  plot_id: '',
  notes: '',
});

const actionLabels: Record<string, string> = {
  submit: 'পর্যালোচনায় পাঠান',
  return: 'সংশোধনের জন্য ফেরত',
  publish: 'নকশা প্রকাশ',
  archive: 'নকশা প্রত্যাহার',
};

const statuses: Record<string, string> = {
  DRAFT: 'খসড়া',
  SUBMITTED: 'পর্যালোচনাধীন',
  RETURNED: 'সংশোধনের জন্য ফেরত',
  PUBLISHED: 'প্রকাশিত',
  ARCHIVED: 'সংরক্ষিত ইতিহাস',
  ACTIVE: 'সক্রিয় ফিচার',
};

export function ParcelDesigner({ onExit }: { onExit: (location?: number) => void }) {
  const { t, lang, user } = useAppUI();

  // RBAC checks
  const canDraw = useMemo(() => {
    return !!user && ALLOWED_SURVEYOR_ROLES.includes(user.role);
  }, [user]);

  // Context & workspace states
  const [context, setContext] = useState<any>(null);
  const [location, setLocation] = useState<number>(0);
  const [items, setItems] = useState<ParcelDesign[]>([]);
  const [features, setFeatures] = useState<MapFeature[]>([]);
  const [plots, setPlots] = useState<MapPlot[]>([]);
  const [recordQuery, setRecordQuery] = useState('');

  // Active drawing & editing states
  const [drawMode, setDrawMode] = useState<FeatureType>('polygon');
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState<XY[]>([]);
  const [historyStack, setHistoryStack] = useState<XY[][]>([]);
  const [futureStack, setFutureStack] = useState<XY[][]>([]);

  // Selection & form
  const [editingDesign, setEditingDesign] = useState<ParcelDesign | null>(null);
  const [editingFeature, setEditingFeature] = useState<MapFeature | null>(null);
  const [parent, setParent] = useState<number | null>(null);
  const [fields, setFields] = useState<FormFields>(emptyFields);
  const [activeTab, setActiveTab] = useState<'features' | 'parcels'>('features');
  const [basemapMode, setBasemapMode] = useState<BasemapMode>('carto');

  // UI status
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [snappedNotice, setSnappedNotice] = useState(false);

  // Administrative office allocation & review decision
  const [allocationTarget, setAllocationTarget] = useState(0);
  const [office, setOffice] = useState('');
  const [assignReason, setAssignReason] = useState('');
  const [decision, setDecision] = useState<{ item: ParcelDesign; action: string } | null>(null);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  // DOM and Map refs
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const baseTiles = useRef<L.Layer | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const drawingRef = useRef(false);
  const drawModeRef = useRef<FeatureType>('polygon');
  const pointsRef = useRef<XY[]>([]);
  const verticesRef = useRef<XY[]>([]);
  const addingRef = useRef(false);

  drawingRef.current = drawing;
  drawModeRef.current = drawMode;
  pointsRef.current = points;

  const loc: (MapLocation & { office_id: number; office_name_bn: string; can_edit: boolean }) | undefined =
    context?.locations?.find((l: any) => Number(l.id) === location);

  const readonly = !canDraw || !!(loc && !loc.can_edit) || (!!editingDesign && !['DRAFT', 'RETURNED'].includes(editingDesign.status));

  // Cadastral Measurements Engine
  const measurements = useMemo(() => {
    if (drawMode === 'polygon' && points.length >= 3) {
      const n = points.length;
      let sum = 0;
      for (let i = 0; i < n; i++) {
        const q = points[(i + 1) % n];
        sum += points[i][0] * q[1] - q[0] * points[i][1];
      }
      const latAvg = points.reduce((s, p) => s + p[1], 0) / n;
      const areaSqm =
        (Math.abs(sum) / 2) *
        Math.pow((Math.PI / 180) * CADASTRAL_CONSTANTS.EARTH_RADIUS_METERS, 2) *
        Math.cos((latAvg * Math.PI) / 180);
      const decimals = areaSqm / CADASTRAL_CONSTANTS.DECIMAL_TO_SQM;
      const acres = decimals / CADASTRAL_CONSTANTS.ACRE_TO_DECIMAL;
      const katha = decimals / CADASTRAL_CONSTANTS.KATHA_TO_DECIMAL;
      const bigha = decimals / CADASTRAL_CONSTANTS.BIGHA_TO_DECIMAL;
      const sqft = areaSqm * CADASTRAL_CONSTANTS.SQM_TO_SQFT;

      // Perimeter
      let perimeterMeters = 0;
      for (let i = 0; i < n; i++) {
        const p1 = L.latLng(points[i][1], points[i][0]);
        const p2 = L.latLng(points[(i + 1) % n][1], points[(i + 1) % n][0]);
        perimeterMeters += p1.distanceTo(p2);
      }
      const perimeterFeet = perimeterMeters * 3.28084;
      const perimeterChains = perimeterMeters / CADASTRAL_CONSTANTS.CHAIN_TO_METERS;

      return {
        type: 'polygon' as const,
        areaSqm,
        decimals,
        acres,
        katha,
        bigha,
        sqft,
        perimeterMeters,
        perimeterFeet,
        perimeterChains,
      };
    } else if (drawMode === 'line' && points.length >= 2) {
      let lengthMeters = 0;
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = L.latLng(points[i][1], points[i][0]);
        const p2 = L.latLng(points[i + 1][1], points[i + 1][0]);
        lengthMeters += p1.distanceTo(p2);
      }
      const lengthFeet = lengthMeters * 3.28084;
      const lengthChains = lengthMeters / CADASTRAL_CONSTANTS.CHAIN_TO_METERS;

      return {
        type: 'line' as const,
        lengthMeters,
        lengthFeet,
        lengthChains,
      };
    } else if (drawMode === 'point' && points.length >= 1) {
      return {
        type: 'point' as const,
        lng: points[0][0],
        lat: points[0][1],
      };
    }
    return null;
  }, [points, drawMode]);

  // Aggregate snap candidate vertices from existing parcel designs and vector features
  useEffect(() => {
    const snapCoords: XY[] = [];
    items
      .filter((r) => r.id !== editingDesign?.id)
      .forEach((r) => {
        if (r.geometry?.coordinates?.[0]) {
          r.geometry.coordinates[0].forEach((pt: any) => snapCoords.push([pt[0], pt[1]]));
        }
      });

    features
      .filter((f) => f.id !== editingFeature?.id)
      .forEach((f) => {
        if (f.geometry?.type === 'Polygon' && (f.geometry as any).coordinates?.[0]) {
          (f.geometry as any).coordinates[0].forEach((pt: any) => snapCoords.push([pt[0], pt[1]]));
        } else if (f.geometry?.type === 'LineString' && (f.geometry as any).coordinates) {
          (f.geometry as any).coordinates.forEach((pt: any) => snapCoords.push([pt[0], pt[1]]));
        } else if (f.geometry?.type === 'Point' && (f.geometry as any).coordinates) {
          const pt = (f.geometry as any).coordinates;
          snapCoords.push([pt[0], pt[1]]);
        }
      });

    verticesRef.current = snapCoords;
  }, [items, features, editingDesign?.id, editingFeature?.id]);

  // Refresh context & lists
  const refresh = async () => {
    const c = await parcelApi.context();
    setContext(c);
    return c;
  };

  const loadLocationData = useCallback(async (locId: number) => {
    if (!locId) {
      setItems([]);
      setFeatures([]);
      setPlots([]);
      return;
    }
    try {
      const [designs, featureList] = await Promise.all([
        parcelApi.list(locId),
        mapFeaturesApi.list({ location_id: locId }),
      ]);
      setItems(designs);
      setFeatures(featureList);
    } catch (e) {
      setError(mapError(e));
    }
  }, []);

  useEffect(() => {
    refresh().catch((e) => setError(mapError(e)));
  }, []);

  useEffect(() => {
    if (location) {
      loadLocationData(location);
    }
  }, [location, loadLocationData]);

  // Load plots for record linking
  useEffect(() => {
    if (!location) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      mapApi
        .workspace(location, recordQuery, 1, controller.signal)
        .then((r) => setPlots(r.plots))
        .catch((e) => {
          if (e.code !== 'ERR_CANCELED') setError(mapError(e));
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [location, recordQuery]);

  // Unsaved changes browser guard
  useEffect(() => {
    if (!dirty) return;
    const f = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', f);
    return () => window.removeEventListener('beforeunload', f);
  }, [dirty]);

  // Geometry Undo / Redo helpers
  const pushState = useCallback(
    (newPts: XY[]) => {
      setHistoryStack((prev) => [...prev.slice(-30), points]);
      setFutureStack([]);
      setPoints(newPts);
      setDirty(true);
    },
    [points]
  );

  const undo = useCallback(() => {
    if (historyStack.length === 0) return;
    const prev = historyStack[historyStack.length - 1];
    setFutureStack((f) => [...f, points]);
    setHistoryStack((h) => h.slice(0, -1));
    setPoints(prev);
    setDirty(true);
  }, [historyStack, points]);

  const redo = useCallback(() => {
    if (futureStack.length === 0) return;
    const next = futureStack[futureStack.length - 1];
    setHistoryStack((h) => [...h, points]);
    setFutureStack((f) => f.slice(0, -1));
    setPoints(next);
    setDirty(true);
  }, [futureStack, points]);

  // Keyboard shortcut listeners for Undo / Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Initialize Map
  useEffect(() => {
    if (!host.current) return;
    const m = L.map(host.current, {
      center: [23.72, 90.15],
      zoom: 7,
      minZoom: 6,
      maxZoom: 21,
      preferCanvas: true,
      zoomControl: false,
    });
    map.current = m;

    L.control.zoom({ position: 'bottomright' }).addTo(m);
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(m);

    layer.current = L.layerGroup().addTo(m);

    // Interactive Map Click Handler with 12px Snapping Engine
    m.on('click', (e: L.LeafletMouseEvent) => {
      if (!drawingRef.current || addingRef.current) return;

      let p: XY = [Number(e.latlng.lng.toFixed(8)), Number(e.latlng.lat.toFixed(8))];
      const pixel = m.latLngToContainerPoint(e.latlng);
      let bestDist = 12; // 12-pixel snapping threshold
      let snapped = false;

      verticesRef.current.forEach((v) => {
        const dist = m.latLngToContainerPoint([v[1], v[0]]).distanceTo(pixel);
        if (dist < bestDist) {
          p = [v[0], v[1]];
          bestDist = dist;
          snapped = true;
        }
      });

      if (snapped) {
        setSnappedNotice(true);
        setTimeout(() => setSnappedNotice(false), 2000);
      }

      const curMode = drawModeRef.current;
      const currentPoints = pointsRef.current;

      if (curMode === 'point') {
        // Point / Marker mode: single click places point and finishes
        setHistoryStack((prev) => [...prev.slice(-30), currentPoints]);
        setFutureStack([]);
        setPoints([p]);
        setDrawing(false);
        setDirty(true);
      } else if (curMode === 'polygon') {
        // If clicking on first vertex with at least 3 points, close polygon
        if (currentPoints.length >= 3) {
          const firstPix = m.latLngToContainerPoint([currentPoints[0][1], currentPoints[0][0]]);
          if (pixel.distanceTo(firstPix) <= 15) {
            setDrawing(false);
            setDirty(true);
            return;
          }
        }
        if (currentPoints.length < 200) {
          setHistoryStack((prev) => [...prev.slice(-30), currentPoints]);
          setFutureStack([]);
          setPoints((prev) => [...prev, p]);
          setDirty(true);
        }
      } else if (curMode === 'line') {
        if (currentPoints.length < 500) {
          setHistoryStack((prev) => [...prev.slice(-30), currentPoints]);
          setFutureStack([]);
          setPoints((prev) => [...prev, p]);
          setDirty(true);
        }
      }
    });

    const o = new ResizeObserver(() => m.invalidateSize());
    o.observe(host.current);

    return () => {
      o.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);

  // Switch Basemap Layer (Carto, Satellite, Road Map, Offline Grid, Dark)
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    if (baseTiles.current) {
      m.removeLayer(baseTiles.current);
      baseTiles.current = null;
    }

    const cfg = BASEMAP_CONFIGS[basemapMode];
    if (basemapMode === 'offline_grid' || !cfg.url) {
      const offlineTiles = new OfflineGridLayer({ theme: 'cadastral' }).addTo(m);
      baseTiles.current = offlineTiles;
    } else {
      const tile = L.tileLayer(cfg.url, {
        maxZoom: cfg.maxZoom || 20,
        subdomains: (cfg.subdomains || ['a', 'b', 'c']).join(''),
        attribution: cfg.attribution || '',
      });
      tile.on('tileerror', () => {
        if (!baseTiles.current) {
          const fallback = new OfflineGridLayer({ theme: 'cadastral' }).addTo(m);
          baseTiles.current = fallback;
        }
      });
      tile.addTo(m);
      baseTiles.current = tile;
    }
  }, [basemapMode]);

  // Update map view when location changes
  useEffect(() => {
    if (loc?.latitude && loc?.longitude) {
      map.current?.setView([Number(loc.latitude), Number(loc.longitude)], 17);
    }
  }, [location, loc]);

  // Render Map Layers: Existing features, drawn geometry, draggable vertex badges, and midpoint handles
  useEffect(() => {
    const group = layer.current;
    if (!group) return;
    group.clearLayers();

    // 1. Render Existing Parcel Designs
    items
      .filter((r) => r.id !== editingDesign?.id && r.status !== 'ARCHIVED')
      .forEach((r) => {
        const l = L.geoJSON(r.geometry, {
          style: {
            color: r.status === 'PUBLISHED' ? '#087f5b' : '#849187',
            weight: 2,
            fillOpacity: 0.12,
          },
        });
        const label = document.createElement('span');
        label.textContent = `${r.survey} · দাগ ${toBnDigits(r.dag_no)} · ${statuses[r.status]}`;
        l.bindTooltip(label);
        l.on('click', () => {
          if (!drawing) selectDesign(r);
        });
        l.addTo(group);
      });

    // 2. Render Existing Vector Features (Polygon, Line, Point)
    features
      .filter((f) => f.id !== editingFeature?.id && f.status !== 'DELETED')
      .forEach((f) => {
        let featureColor = '#087f5b';
        if (f.attributes?.category === 'road') featureColor = '#d97706';
        else if (f.attributes?.category === 'waterbody') featureColor = '#0284c7';
        else if (f.attributes?.category === 'mouza_boundary') featureColor = '#7c3aed';
        else if (f.attributes?.category === 'control_point') featureColor = '#dc2626';
        else if (f.attributes?.category === 'landmark') featureColor = '#059669';

        const fl = L.geoJSON(f.geometry as any, {
          style: {
            color: featureColor,
            weight: f.feature_type === 'line' ? 3.5 : 2,
            fillColor: featureColor,
            fillOpacity: 0.15,
            dashArray: f.attributes?.category === 'mouza_boundary' ? '6 4' : undefined,
          },
          pointToLayer: (_geoJsonPoint, latlng) => {
            const markerIcon = L.divIcon({
              className: 'parcel-feature-point',
              html: `<span style="background:${featureColor};color:white;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);font-size:10px;">★</span>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            });
            return L.marker(latlng, { icon: markerIcon });
          },
        });

        const label = document.createElement('span');
        const catLabel = FEATURE_CATEGORIES.find((c) => c.value === f.attributes?.category)?.labelBn || f.feature_type;
        label.textContent = `${f.attributes?.name || catLabel} ${f.attributes?.dag_no ? `· দাগ ${toBnDigits(f.attributes.dag_no)}` : ''}`;
        fl.bindTooltip(label);
        fl.on('click', () => {
          if (!drawing) selectFeature(f);
        });
        fl.addTo(group);
      });

    // 3. Render In-Progress / Active Geometry
    if (drawMode === 'polygon') {
      if (points.length > 1) {
        L.polyline(
          [
            ...points.map((p) => [p[1], p[0]] as L.LatLngTuple),
            ...(!drawing && points.length >= 3 ? [[points[0][1], points[0][0]] as L.LatLngTuple] : []),
          ],
          { color: '#c77920', weight: 3, dashArray: drawing ? '6 6' : undefined }
        ).addTo(group);
      }
      if (points.length >= 3 && !drawing) {
        L.polygon(
          points.map((p) => [p[1], p[0]]),
          { color: '#b46c16', fillOpacity: 0.18, weight: 2.5 }
        ).addTo(group);
      }
    } else if (drawMode === 'line') {
      if (points.length > 1) {
        L.polyline(
          points.map((p) => [p[1], p[0]] as L.LatLngTuple),
          { color: '#0284c7', weight: 4, dashArray: drawing ? '5 5' : undefined }
        ).addTo(group);
      }
    } else if (drawMode === 'point') {
      if (points.length >= 1) {
        const pointIcon = L.divIcon({
          className: 'parcel-active-point',
          html: `<span style="background:#dc2626;color:white;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);font-size:14px;font-weight:bold;">📍</span>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        const ptMarker = L.marker([points[0][1], points[0][0]], {
          icon: pointIcon,
          draggable: !readonly,
          title: t('কন্ট্রোল পয়েন্ট / মার্কার', 'Control Point / Marker'),
        }).addTo(group);

        ptMarker.on('dragstart', () => {
          addingRef.current = true;
        });
        ptMarker.on('dragend', () => {
          addingRef.current = false;
          const pos = ptMarker.getLatLng();
          const newPt: XY = [Number(pos.lng.toFixed(8)), Number(pos.lat.toFixed(8))];
          pushState([newPt]);
        });
      }
    }

    // 4. Render Draggable Vertex Markers with Numbered Badges
    if (drawMode !== 'point') {
      points.forEach((p, i) => {
        const icon = L.divIcon({
          className: 'parcel-vertex',
          html: `<span>${i + 1}</span>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
        const marker = L.marker([p[1], p[0]], {
          icon,
          draggable: !readonly,
          keyboard: true,
          title: `কোণ ${i + 1} (ডান-ক্লিক করে ডিলিট করুন)`,
        }).addTo(group);

        marker.on('mousedown', () => {
          addingRef.current = true;
        });
        marker.on('mouseup', () => {
          addingRef.current = false;
        });
        marker.on('dragstart', () => {
          addingRef.current = true;
        });
        marker.on('dragend', () => {
          addingRef.current = false;
          const v = marker.getLatLng();
          const newCoord: XY = [Number(v.lng.toFixed(8)), Number(v.lat.toFixed(8))];
          const updated = points.map((xy, j) => (j === i ? newCoord : xy));
          pushState(updated);
        });

        // Vertex Deletion: Right-click removes vertex
        marker.on('contextmenu', (e) => {
          e.originalEvent?.preventDefault();
          if (readonly) return;
          if (drawMode === 'polygon' && points.length <= 3) {
            setError(t('বহুভুজে কমপক্ষে ৩টি কোণ থাকতে হবে।', 'Polygon requires at least 3 vertices.'));
            return;
          }
          if (drawMode === 'line' && points.length <= 2) {
            setError(t('রেখায় কমপক্ষে ২টি বিন্দু থাকতে হবে।', 'Line requires at least 2 points.'));
            return;
          }
          const filtered = points.filter((_, j) => j !== i);
          pushState(filtered);
          setNotice(t(`কোণ ${i + 1} মুছে ফেলা হয়েছে।`, `Vertex ${i + 1} deleted.`));
        });
      });

      // 5. Render Midpoint Insertion Ghost Handles
      if (!drawing && !readonly) {
        if (drawMode === 'polygon' && points.length >= 3) {
          const n = points.length;
          for (let i = 0; i < n; i++) {
            const nextIdx = (i + 1) % n;
            const midLng = Number(((points[i][0] + points[nextIdx][0]) / 2).toFixed(8));
            const midLat = Number(((points[i][1] + points[nextIdx][1]) / 2).toFixed(8));

            const ghostIcon = L.divIcon({
              className: 'parcel-midpoint-handle',
              html: `<span>+</span>`,
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            });

            const ghostMarker = L.marker([midLat, midLng], {
              icon: ghostIcon,
              title: t('ক্লিক করে নতুন কোণ যোগ করুন', 'Click to insert a new corner'),
            }).addTo(group);

            ghostMarker.on('click', () => {
              const newPts = [...points.slice(0, i + 1), [midLng, midLat] as XY, ...points.slice(i + 1)];
              pushState(newPts);
              setNotice(t('নতুন কোণ যুক্ত হয়েছে।', 'New corner inserted.'));
            });
          }
        } else if (drawMode === 'line' && points.length >= 2) {
          for (let i = 0; i < points.length - 1; i++) {
            const nextIdx = i + 1;
            const midLng = Number(((points[i][0] + points[nextIdx][0]) / 2).toFixed(8));
            const midLat = Number(((points[i][1] + points[nextIdx][1]) / 2).toFixed(8));

            const ghostIcon = L.divIcon({
              className: 'parcel-midpoint-handle',
              html: `<span>+</span>`,
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            });

            const ghostMarker = L.marker([midLat, midLng], {
              icon: ghostIcon,
              title: t('ক্লিক করে নতুন বিন্দু যোগ করুন', 'Click to insert a new line vertex'),
            }).addTo(group);

            ghostMarker.on('click', () => {
              const newPts = [...points.slice(0, i + 1), [midLng, midLat] as XY, ...points.slice(i + 1)];
              pushState(newPts);
              setNotice(t('নতুন বিন্দু যুক্ত হয়েছে।', 'New vertex inserted.'));
            });
          }
        }
      }
    }
  }, [points, items, features, drawing, drawMode, editingDesign?.id, editingFeature?.id, readonly, t, pushState]);

  // Form management helpers
  function safeChange(): boolean {
    return !dirty || window.confirm(t('অসংরক্ষিত পরিবর্তন বাদ দেবেন?', 'Discard unsaved changes?'));
  }

  function clear() {
    setEditingDesign(null);
    setEditingFeature(null);
    setParent(null);
    setFields(emptyFields());
    setPoints([]);
    setHistoryStack([]);
    setFutureStack([]);
    setDrawing(false);
    setDirty(false);
    setError('');
  }

  function selectDesign(item: ParcelDesign, revision = false) {
    if (!safeChange()) return;
    setEditingDesign(revision ? null : item);
    setEditingFeature(null);
    setParent(revision ? item.id : item.supersedes_id);
    setDrawMode('polygon');
    setFields({
      name: `দাগ ${item.dag_no}`,
      category: 'plot',
      land_class: item.land_use || 'নাল',
      dag_no: item.dag_no,
      khatian_no: '',
      jl_no: String(loc?.jl_no || ''),
      survey: item.survey as any,
      sheet_no: item.sheet_no,
      recorded_area: String(item.recorded_area),
      source_reference: item.source_reference,
      plot_id: item.plot_id ? String(item.plot_id) : '',
      notes: '',
    });
    setPoints(item.geometry.coordinates[0].slice(0, -1));
    setHistoryStack([]);
    setFutureStack([]);
    setDrawing(false);
    setDirty(revision);
    setError('');
    map.current?.fitBounds(L.geoJSON(item.geometry).getBounds(), { padding: [50, 50], maxZoom: 20 });
  }

  function selectFeature(feature: MapFeature) {
    if (!safeChange()) return;
    setEditingFeature(feature);
    setEditingDesign(null);
    setParent(null);
    setDrawMode(feature.feature_type);
    const attr = feature.attributes || {};
    setFields({
      name: attr.name || '',
      category: attr.category || (feature.feature_type === 'line' ? 'road' : feature.feature_type === 'point' ? 'control_point' : 'plot'),
      land_class: attr.land_class || 'নাল',
      dag_no: attr.dag_no || '',
      khatian_no: attr.khatian_no || '',
      jl_no: attr.jl_no || String(loc?.jl_no || ''),
      survey: (attr.survey_type as any) || 'BS',
      sheet_no: attr.sheet_no || '1',
      recorded_area: feature.area_decimal ? String(feature.area_decimal) : '',
      source_reference: attr.notes || '',
      plot_id: feature.plot_id ? String(feature.plot_id) : '',
      notes: attr.notes || '',
    });

    if (feature.feature_type === 'polygon') {
      const ring = (feature.geometry as any).coordinates[0];
      setPoints(ring.slice(0, -1));
    } else if (feature.feature_type === 'line') {
      setPoints((feature.geometry as any).coordinates);
    } else if (feature.feature_type === 'point') {
      setPoints([(feature.geometry as any).coordinates]);
    }

    setHistoryStack([]);
    setFutureStack([]);
    setDrawing(false);
    setDirty(false);
    setError('');
    map.current?.fitBounds(L.geoJSON(feature.geometry as any).getBounds(), { padding: [50, 50], maxZoom: 20 });
  }

  function field<K extends keyof FormFields>(k: K, v: FormFields[K]) {
    setFields((p) => ({ ...p, [k]: v }));
    setDirty(true);
  }

  // Save Feature (Polygon, Line, Point) to Backend Persistence API
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canDraw) {
      setError(t('নকশা সম্পাদনার অনুমতি নেই। শুধুমাত্র অনুমোদিত সার্ভেয়ারগণ সংরক্ষণ করতে পারেন।', 'You do not have permission to edit map features.'));
      return;
    }

    if (drawMode === 'polygon' && (points.length < 3 || drawing)) {
      setError(t('প্রথমে অন্তত তিন কোণের বন্ধ সীমানা সম্পূর্ণ করুন।', 'Complete a boundary with at least three corners.'));
      return;
    }
    if (drawMode === 'line' && (points.length < 2 || drawing)) {
      setError(t('রেখায় কমপক্ষে ২টি বিন্দু থাকতে হবে।', 'Line must have at least 2 points.'));
      return;
    }
    if (drawMode === 'point' && points.length < 1) {
      setError(t('ম্যাপে ক্লিক করে বিন্দু বা মার্কার নির্ধারণ করুন।', 'Click on the map to place a point.'));
      return;
    }

    setBusy(true);
    setError('');

    try {
      const normalizedDag = normalizeBnDigits(fields.dag_no.trim());
      const normalizedKhatian = normalizeBnDigits(fields.khatian_no.trim());
      const normalizedJL = normalizeBnDigits(fields.jl_no.trim());

      let geometryPayload: any;
      if (drawMode === 'polygon') {
        geometryPayload = {
          type: 'Polygon',
          coordinates: [[...points, points[0]]],
        };
      } else if (drawMode === 'line') {
        geometryPayload = {
          type: 'LineString',
          coordinates: points,
        };
      } else {
        geometryPayload = {
          type: 'Point',
          coordinates: points[0],
        };
      }

      const attributesPayload = {
        name: fields.name.trim() || `${fields.category} - দাগ ${normalizedDag || 'নম্বরহীন'}`,
        category: fields.category,
        land_class: fields.land_class,
        dag_no: normalizedDag,
        khatian_no: normalizedKhatian,
        jl_no: normalizedJL,
        survey_type: fields.survey,
        sheet_no: fields.sheet_no,
        notes: fields.notes || fields.source_reference,
      };

      // 1. Persist to Vector Features REST API (/api/v1/map/features)
      if (editingFeature) {
        await mapFeaturesApi.update(editingFeature.id, {
          feature_type: drawMode,
          geometry: geometryPayload,
          attributes: attributesPayload,
          plot_id: Number(fields.plot_id) || null,
        });
      } else {
        await mapFeaturesApi.create({
          location_id: location,
          office_id: loc?.office_id || null,
          plot_id: Number(fields.plot_id) || null,
          feature_type: drawMode,
          geometry: geometryPayload,
          attributes: attributesPayload,
        });
      }

      // 2. If drawing a plot boundary polygon, also synchronize with legacy parcel_designs table
      if (drawMode === 'polygon' && fields.category === 'plot') {
        await parcelApi.save({
          dag_no: normalizedDag || '1',
          survey: fields.survey,
          sheet_no: fields.sheet_no || '1',
          land_use: fields.land_class,
          recorded_area: Number(fields.recorded_area) || (measurements?.type === 'polygon' ? Number(measurements.decimals.toFixed(3)) : 1),
          source_reference: fields.source_reference,
          location_id: location,
          office_id: loc?.office_id,
          id: editingDesign?.id,
          version: editingDesign?.version,
          supersedes_id: parent,
          plot_id: Number(fields.plot_id) || null,
          geometry: geometryPayload,
        });
      }

      await loadLocationData(location);
      setDirty(false);
      setNotice(t('ভেক্টর ফিচার ও দাগের তথ্য সফলভাবে সংরক্ষিত হয়েছে।', 'Vector feature and parcel attributes saved successfully.'));
    } catch (e) {
      setError(mapError(e));
    } finally {
      setBusy(false);
    }
  }

  // Delete Vector Feature
  async function deleteCurrentFeature() {
    if (!editingFeature) return;
    if (!window.confirm(t('এই ভেক্টর ফিচারটি মুছে ফেলতে চান?', 'Delete this vector feature?'))) return;

    setBusy(true);
    setError('');
    try {
      await mapFeaturesApi.delete(editingFeature.id);
      await loadLocationData(location);
      clear();
      setNotice(t('ফিচারটি মুছে ফেলা হয়েছে।', 'Feature deleted.'));
    } catch (e) {
      setError(mapError(e));
    } finally {
      setBusy(false);
    }
  }

  // Office assignment
  async function assign(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await parcelApi.assign({ location_id: location, office_id: Number(office), reason: assignReason });
      await refresh();
      await loadLocationData(location);
      setNotice(t('মৌজার দায়িত্বপ্রাপ্ত অফিস বরাদ্দ হয়েছে।', 'Responsible office allocated.'));
      setAssignReason('');
      clear();
    } catch (e) {
      setError(mapError(e));
    } finally {
      setBusy(false);
    }
  }

  // Decision review (publish, return, submit)
  async function decide() {
    if (!decision) return;
    setBusy(true);
    setError('');
    try {
      await parcelApi.decide(decision.item.id, {
        action: decision.action,
        version: decision.item.version,
        reason,
        review_confirmed: confirmed,
      });
      await loadLocationData(location);
      setDecision(null);
      clear();
      setNotice(t('সিদ্ধান্ত সংরক্ষিত। নাগরিক ম্যাপে কেবল প্রকাশিত দাগ দেখা যাবে।', 'Decision saved. Only published parcels appear on public map.'));
    } catch (e) {
      setError(mapError(e));
      setDecision(null);
    } finally {
      setBusy(false);
    }
  }

  function action(item: ParcelDesign, a: string) {
    if (dirty) {
      setError(t('আগে নকশার পরিবর্তন সংরক্ষণ করুন।', 'Save your changes first.'));
      return;
    }
    setDecision({ item, action: a });
    setReason('');
    setConfirmed(false);
  }

  const offices = (context?.offices || []).filter(
    (o: any) =>
      !loc || (o.district_en === loc.district_en && (['settlement', 'admin_cell'].includes(o.office_type) || o.upazila_en === loc.upazila_en))
  );

  return (
    <section className="parcel-designer">
      {/* Header */}
      <header className="parcel-heading">
        <div>
          <p className="map-eyebrow">BHUMISHIELD / CADASTRAL VECTOR WORKSPACE</p>
          <h1>{t('ইন-ম্যাপ ভেক্টর ড্রয়িং ও দাগ ডিজাইন', 'In-Map Vector Drawing & Parcel Designer')}</h1>
          <p>
            {t(
              'বহুভুজ, রেখা ও সার্ভে মার্কার আঁকুন → ভূমি শ্রেণি ও খতিয়ান ট্যাগ করুন → ক্যাডাস্ট্রাল আয়তন রূপান্তর → সংরক্ষণ',
              'Draw polygons, lines & survey markers → tag land categories & dag → calculate cadastral units → persist to database'
            )}
          </p>
        </div>
        <button
          className="map-secondary"
          onClick={() => {
            if (safeChange()) onExit(location);
          }}
        >
          <ArrowLeft size={16} />
          {t('নাগরিকের ম্যাপে ফিরুন', 'Back to public map')}
        </button>
      </header>

      {/* RBAC Warning Banner for Unauthorized Users */}
      {!canDraw && (
        <div className="parcel-rbac-banner" role="alert">
          <ShieldAlert size={20} />
          <div>
            <strong>{t('পঠনযোগ্য মোড (Read-Only Mode):', 'Read-Only Mode:')}</strong>{' '}
            {t(
              'শুধুমাত্র অনুমোদিত ভূমি/জরিপ কর্মকর্তা এবং অ্যাডমিনগণ নকশা আঁকতে ও সম্পাদনা করতে পারেন। নাগরিক ও অননুমোদিত ব্যবহারকারীরা শুধুমাত্র প্রস্তুতকৃত ফিচারসমূহ পর্যবেক্ষণ করতে পারবেন।',
              'Only authorized land/survey officers and administrators can draw and edit vector features. Citizens and viewers can only inspect existing features.'
            )}
          </div>
        </div>
      )}

      {/* Error & Success Notices */}
      {error && (
        <div className="map-error" role="alert">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}
      {notice && (
        <div className="map-success" role="status">
          <CheckCircle2 size={16} />
          {notice}
          <button onClick={() => setNotice('')}>×</button>
        </div>
      )}

      {/* Mouza Jurisdiction Scope Selector */}
      <div className="parcel-scope map-card">
        <label>
          {t('কাজের মৌজা / অফিসের অধিক্ষেত্র', 'Work mouza / office jurisdiction')}
          <select
            aria-label="কাজের মৌজা"
            value={location || ''}
            onChange={(e) => {
              if (safeChange()) {
                clear();
                setLocation(Number(e.target.value));
                setOffice('');
                setRecordQuery('');
              }
            }}
          >
            <option value="">{t('মৌজা নির্বাচন করুন', 'Choose mouza')}</option>
            {context?.locations.map((l: any) => (
              <option key={l.id} value={l.id}>
                {l.district_bn} / {l.upazila_bn} / {l.mouza_bn} · JL {toBnDigits(l.jl_no)}
                {!l.office_id ? ' — অফিস বরাদ্দ বাকি' : ''}
              </option>
            ))}
          </select>
        </label>
        <p>
          {loc?.office_id
            ? t('দায়িত্বপ্রাপ্ত অফিস: ', 'Responsible office: ') + (loc.office_name_bn || loc.office_id)
            : t('Admin আগে মৌজার দায়িত্বপ্রাপ্ত ভূমি/জরিপ অফিস বরাদ্দ করবেন।', 'Admin must first assign the responsible land/survey office.')}
        </p>
      </div>

      {/* Admin Office Allocation Form */}
      {context?.is_admin && location > 0 && (
        <form className="parcel-assignment map-card" onSubmit={assign}>
          <h2>{t('এই মৌজার দায়িত্বপ্রাপ্ত অফিস', 'Responsible office for this mouza')}</h2>
          <label>
            {t('ভূমি / জরিপ অফিস', 'Land / survey office')}
            <select required value={office} onChange={(e) => setOffice(e.target.value)}>
              <option value="">{t('অফিস নির্বাচন করুন', 'Choose office')}</option>
              {offices.map((o: any) => (
                <option key={o.id} value={o.id}>
                  {o.name_bn} · {o.office_type}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('বরাদ্দ বা বদলির কারণ', 'Allocation / reassignment reason')}
            <input required minLength={12} value={assignReason} onChange={(e) => setAssignReason(e.target.value)} />
          </label>
          <button disabled={busy} className="map-secondary">
            {t('এই অফিসে মৌজা বরাদ্দ করুন', 'Allocate mouza to this office')}
          </button>
        </form>
      )}

      {/* Main Workspace Editor Grid */}
      <div className="parcel-editor-grid">
        {/* Interactive Map Shell */}
        <div className="parcel-map-shell">
          <div className="parcel-map" ref={host} />

          {/* In-Map Drawing & Vector Toolstrip */}
          <div className="parcel-draw-tools">
            {/* Primitives Selector */}
            <div className="parcel-tool-group">
              <button
                type="button"
                className={drawMode === 'polygon' ? 'active' : ''}
                disabled={readonly || busy}
                title={t('বহুভুজ / দাগ / মৌজা সীমানা', 'Polygon / Plot Boundary')}
                onClick={() => {
                  setDrawMode('polygon');
                  if (fields.category === 'road' || fields.category === 'control_point') {
                    setFields((f) => ({ ...f, category: 'plot' }));
                  }
                }}
              >
                <Hexagon size={14} />
                {t('বহুভুজ (Polygon)', 'Polygon')}
              </button>
              <button
                type="button"
                className={drawMode === 'line' ? 'active' : ''}
                disabled={readonly || busy}
                title={t('রেখা / রাস্তা / খাল / নদী', 'LineString / Road / Canal')}
                onClick={() => {
                  setDrawMode('line');
                  if (fields.category === 'plot' || fields.category === 'control_point') {
                    setFields((f) => ({ ...f, category: 'road' }));
                  }
                }}
              >
                <Spline size={14} />
                {t('রেখা (Line)', 'Line')}
              </button>
              <button
                type="button"
                className={drawMode === 'point' ? 'active' : ''}
                disabled={readonly || busy}
                title={t('বিন্দু / সার্ভে পিলার / বেঞ্চমার্ক / ল্যান্ডমার্ক', 'Point / Benchmark')}
                onClick={() => {
                  setDrawMode('point');
                  if (fields.category === 'plot' || fields.category === 'road') {
                    setFields((f) => ({ ...f, category: 'control_point' }));
                  }
                }}
              >
                <MapPin size={14} />
                {t('বিন্দু (Point)', 'Point')}
              </button>
            </div>

            <div className="parcel-tool-divider" />

            {/* Drawing Actions */}
            <div className="parcel-tool-group">
              <button
                type="button"
                className={`map-primary ${drawing ? 'active' : ''}`}
                disabled={!loc?.office_id || readonly || busy}
                onClick={() => {
                  setDrawing(!drawing);
                  setDirty(true);
                }}
              >
                <Plus size={14} />
                {drawing ? t('ক্লিক করে বিন্দু যোগ করুন…', 'Click on map…') : t('অঙ্কন শুরু', 'Start Drawing')}
              </button>

              {drawing && (
                <button
                  type="button"
                  className="map-secondary"
                  disabled={
                    (drawMode === 'polygon' && points.length < 3) ||
                    (drawMode === 'line' && points.length < 2) ||
                    (drawMode === 'point' && points.length < 1)
                  }
                  onClick={() => {
                    setDrawing(false);
                    setDirty(true);
                  }}
                >
                  <CheckCircle2 size={14} />
                  {t('সম্পূর্ণ', 'Finish')}
                </button>
              )}
            </div>

            <div className="parcel-tool-divider" />

            {/* Undo / Redo & Vertex Controls */}
            <div className="parcel-tool-group">
              <button
                type="button"
                disabled={historyStack.length === 0 || readonly}
                onClick={undo}
                title={t('পূর্বাবস্থা (Ctrl+Z)', 'Undo (Ctrl+Z)')}
              >
                <Undo2 size={14} />
                {t('পূর্বাবস্থা', 'Undo')}
              </button>
              <button
                type="button"
                disabled={futureStack.length === 0 || readonly}
                onClick={redo}
                title={t('পুনরাবৃত্তি (Ctrl+Y)', 'Redo (Ctrl+Y)')}
              >
                <Redo2 size={14} />
                {t('পুনরাবৃত্তি', 'Redo')}
              </button>
              <button
                type="button"
                className="tool-btn-danger"
                disabled={!points.length || readonly}
                onClick={() => {
                  pushState(points.slice(0, -1));
                }}
                title={t('শেষ বিন্দু বাতিল', 'Remove last point')}
              >
                <Trash2 size={14} />
                {t('শেষ বিন্দু বাদ', 'Delete Point')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (safeChange()) clear();
                }}
              >
                <RefreshCw size={14} />
                {t('নতুন', 'New')}
              </button>
            </div>

            {/* Snapping Feedback */}
            {snappedNotice && (
              <span className="parcel-snap-badge">
                <Compass size={12} />
                {t('কোণে স্ন্যাপ হয়েছে (12px)', 'Snapped to vertex')}
              </span>
            )}
          </div>

          {/* Interactive Help HUD */}
          <p className="parcel-map-help">
            {drawing ? (
              <span>
                {drawMode === 'polygon' && t('ম্যাপে ক্লিক করে কোণ বসান। ৩ বা ততোধিক কোণ বসিয়ে প্রথম বিন্দুতে ক্লিক করুন বা "সম্পূর্ণ" চাপুন। ১২ পিক্সেলে স্বয়ংক্রিয় স্ন্যাপ কাজ করবে।', 'Click on map to place polygon corners. 12px vertex snapping active.')}
                {drawMode === 'line' && t('ম্যাপে ক্লিক করে রেখার বিন্দু যোগ করুন। কমপক্ষে ২টি বিন্দু দিয়ে "সম্পূর্ণ" চাপুন।', 'Click on map to trace polyline. Minimum 2 vertices.')}
                {drawMode === 'point' && t('ম্যাপে ক্লিক করে সার্ভে কন্ট্রোল পিলার বা ল্যান্ডমার্কের অবস্থান চিহ্নিত করুন।', 'Click to place survey control point or landmark.')}
              </span>
            ) : (
              <span>
                {t('কমলা নম্বরের কোণ ধরে টেনে সরান। দুটি কোণের মাঝখানের (+) হ্যান্ডেলে ক্লিক করে নতুন কোণ যোগ করুন। কোণের ওপর ডান-ক্লিক করে মুছুন।', 'Drag numbered handles to reshape. Click (+) midpoint handles to insert vertices. Right-click vertex to delete.')}
              </span>
            )}
            <span>
              {drawMode === 'polygon' && `${toBnDigits(points.length)} টি কোণ`}
              {drawMode === 'line' && `${toBnDigits(points.length)} টি বিন্দু`}
              {drawMode === 'point' && points.length > 0 && `জিপিএস স্থানাঙ্ক যুক্ত`}
            </span>
          </p>

          {/* FLOATING BASEMAP SWITCHER FOR SURVEYOR */}
          <div className="floating-basemap-widget" aria-label="Basemap Selector" style={{ bottom: 20, left: 16 }}>
            {(Object.keys(BASEMAP_CONFIGS) as BasemapMode[]).map((mode) => {
              const item = BASEMAP_CONFIGS[mode];
              return (
                <button
                  key={mode}
                  type="button"
                  className={`basemap-opt-btn ${basemapMode === mode ? 'active' : ''}`}
                  onClick={() => setBasemapMode(mode)}
                  title={item.name_en}
                >
                  <span className="opt-icon">{item.icon}</span>
                  <span className="opt-text">{lang === 'bn' ? item.name_bn : item.name_en}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Cadastral Measurements Engine & Attribute Form */}
        <form className="map-card parcel-form" onSubmit={save}>
          <h2>
            {editingFeature
              ? `${editingFeature.attributes?.name || editingFeature.feature_type} · #${editingFeature.id}`
              : editingDesign
              ? `${statuses[editingDesign.status]} · #${editingDesign.id}`
              : parent
              ? t('প্রকাশিত দাগের নতুন সংশোধন', 'Revision of published parcel')
              : t('নতুন ভেক্টর ড্রয়িং ও বৈশিষ্ট্য', 'New Vector Feature & Attributes')}
          </h2>

          {/* Real-time Cadastral Measurements Engine HUD */}
          {measurements && (
            <div className="parcel-measurements-panel">
              <h4>
                <span>
                  <Ruler size={14} style={{ display: 'inline', marginRight: 4 }} />
                  {t('ক্যাডাস্ট্রাল পরিমাপ ইঞ্জিন', 'Cadastral Measurements Engine')}
                </span>
                <small>{t('রিয়েল-টাইম হিসাব', 'Real-time calculation')}</small>
              </h4>

              {measurements.type === 'polygon' && (
                <div className="measurement-grid">
                  <div className="measurement-item">
                    <span>{t('শতক / ডেসিমাল', 'Decimals')}</span>
                    <strong>{toBnDigits(measurements.decimals.toFixed(3))} শতক</strong>
                    <small>{measurements.decimals.toFixed(3)} decimals</small>
                  </div>
                  <div className="measurement-item">
                    <span>{t('একর', 'Acres')}</span>
                    <strong>{toBnDigits(measurements.acres.toFixed(4))} একর</strong>
                    <small>{measurements.acres.toFixed(4)} acres</small>
                  </div>
                  <div className="measurement-item">
                    <span>{t('কাঠা', 'Katha')}</span>
                    <strong>{toBnDigits(measurements.katha.toFixed(3))} কাঠা</strong>
                    <small>{measurements.katha.toFixed(3)} katha</small>
                  </div>
                  <div className="measurement-item">
                    <span>{t('বিঘা', 'Bigha')}</span>
                    <strong>{toBnDigits(measurements.bigha.toFixed(3))} বিঘা</strong>
                    <small>{measurements.bigha.toFixed(3)} bigha</small>
                  </div>
                  <div className="measurement-item">
                    <span>{t('বর্গমিটার', 'Square Meters')}</span>
                    <strong>{toBnDigits(measurements.areaSqm.toFixed(1))} m²</strong>
                    <small>{measurements.areaSqm.toFixed(1)} sqm</small>
                  </div>
                  <div className="measurement-item">
                    <span>{t('বর্গফুট', 'Square Feet')}</span>
                    <strong>{toBnDigits(measurements.sqft.toFixed(1))} ft²</strong>
                    <small>{measurements.sqft.toFixed(1)} sq ft</small>
                  </div>
                  <div className="measurement-item measurement-full-row">
                    <span>{t('সীমানার দৈর্ঘ্য / পরিসীমা', 'Perimeter')}</span>
                    <strong>
                      {toBnDigits(measurements.perimeterMeters.toFixed(1))} মিটার ·{' '}
                      {toBnDigits(measurements.perimeterFeet.toFixed(1))} ফুট ·{' '}
                      {toBnDigits(measurements.perimeterChains.toFixed(2))} শিকল (Chains)
                    </strong>
                    <small>১ শিকল = ৬৬ ফুট = ১০০ লিংক = ২০.১১৮ মিটার</small>
                  </div>
                </div>
              )}

              {measurements.type === 'line' && (
                <div className="measurement-grid">
                  <div className="measurement-item">
                    <span>{t('দৈর্ঘ্য (মিটার)', 'Length (Meters)')}</span>
                    <strong>{toBnDigits(measurements.lengthMeters.toFixed(1))} মিটার</strong>
                    <small>{measurements.lengthMeters.toFixed(1)} m</small>
                  </div>
                  <div className="measurement-item">
                    <span>{t('দৈর্ঘ্য (ফুট)', 'Length (Feet)')}</span>
                    <strong>{toBnDigits(measurements.lengthFeet.toFixed(1))} ফুট</strong>
                    <small>{measurements.lengthFeet.toFixed(1)} ft</small>
                  </div>
                  <div className="measurement-item measurement-full-row">
                    <span>{t('শিকল / চেইন পরিমাপ (Gunter Chain)', 'Chains & Links')}</span>
                    <strong>{toBnDigits(measurements.lengthChains.toFixed(2))} শিকল ({toBnDigits((measurements.lengthChains * 100).toFixed(0))} লিংক)</strong>
                    <small>১ জরিপ শিকল = ৬৬ ফুট = ১০০ লিংক</small>
                  </div>
                </div>
              )}

              {measurements.type === 'point' && (
                <div className="measurement-grid">
                  <div className="measurement-item">
                    <span>{t('অক্ষাংশ (Latitude)', 'Latitude')}</span>
                    <strong>{measurements.lat.toFixed(7)}° N</strong>
                  </div>
                  <div className="measurement-item">
                    <span>{t('দ্রাঘিমাংশ (Longitude)', 'Longitude')}</span>
                    <strong>{measurements.lng.toFixed(7)}° E</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Area Discrepancy Reconciliation Warning */}
          {Number(fields.recorded_area) > 0 &&
            measurements?.type === 'polygon' &&
            Math.abs(measurements.decimals - Number(fields.recorded_area)) / Number(fields.recorded_area) > 0.1 && (
              <p className="parcel-review-note">
                {t(
                  'আঁকা সীমানা ও রেকর্ডের আয়তনে ১০%-এর বেশি পার্থক্য রয়েছে। সিএস/আরএস/বিএস নকশা মিলিয়ে সীমানা পুনর্নিরূপণ করুন।',
                  'Drawn and recorded areas differ by >10%. Reconcile against source survey.'
                )}
              </p>
            )}

          {dirty && <p className="parcel-unsaved">{t('● অসংরক্ষিত পরিবর্তন আছে', '● Unsaved changes')}</p>}

          <fieldset disabled={!loc?.office_id || readonly || busy}>
            <div className="parcel-field-grid">
              {/* Feature Category */}
              <label>
                {t('ফিচার শ্রেণি', 'Feature Category')}
                <select
                  value={fields.category}
                  onChange={(e) => {
                    const cat = e.target.value;
                    field('category', cat);
                    if (cat === 'road' || cat === 'waterbody') {
                      if (drawMode === 'point') setDrawMode('line');
                    } else if (cat === 'control_point' || cat === 'landmark') {
                      if (drawMode === 'line') setDrawMode('point');
                    }
                  }}
                >
                  {FEATURE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {lang === 'bn' ? c.labelBn : c.labelEn}
                    </option>
                  ))}
                </select>
              </label>

              {/* Official Bangladesh Land Classification */}
              <label>
                {t('জমির সরকারি শ্রেণি', 'Land Class (Official BD)')}
                <select value={fields.land_class} onChange={(e) => field('land_class', e.target.value)}>
                  {BD_LAND_CLASSES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {lang === 'bn' ? c.labelBn : c.labelEn}
                    </option>
                  ))}
                </select>
              </label>

              {/* Dag Number */}
              <label>
                {t('দাগ নম্বর', 'Dag Number')}
                <input
                  required={fields.category === 'plot'}
                  value={fields.dag_no}
                  onChange={(e) => field('dag_no', e.target.value)}
                  placeholder="যেমন: ১০২"
                />
              </label>

              {/* Survey Type */}
              <label>
                {t('জরিপ', 'Survey Type')}
                <select value={fields.survey} onChange={(e) => field('survey', e.target.value)}>
                  {['CS', 'SA', 'RS', 'BS', 'BDS'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              {/* Khatian Number */}
              <label>
                {t('খতিয়ান নম্বর', 'Khatian Number')}
                <input
                  value={fields.khatian_no}
                  onChange={(e) => field('khatian_no', e.target.value)}
                  placeholder="যেমন: ৪৫"
                />
              </label>

              {/* Sheet Number */}
              <label>
                {t('নকশা শিট নম্বর', 'Sheet Number')}
                <input
                  required
                  value={fields.sheet_no}
                  onChange={(e) => field('sheet_no', e.target.value)}
                  placeholder="যেমন: ১"
                />
              </label>
            </div>

            {/* Feature Name / Title */}
            <label>
              {t('ফিচারের শিরোনাম / বিবরণ', 'Feature Title / Label')}
              <input
                value={fields.name}
                onChange={(e) => field('name', e.target.value)}
                placeholder={t('যেমন: উত্তর পাশের সরকারি খাল বা প্লট ১০২', 'e.g. North Side Public Canal')}
              />
            </label>

            {/* Recorded Area */}
            {drawMode === 'polygon' && (
              <label>
                {t('রেকর্ড অনুযায়ী আয়তন (শতক)', 'Recorded area (decimals)')}
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={fields.recorded_area}
                  onChange={(e) => field('recorded_area', e.target.value)}
                  placeholder="যেমন: ১২.৫০"
                />
              </label>
            )}

            {/* Link Existing Land Record */}
            <label>
              {t('আগের জমির রেকর্ড থাকলে যুক্ত করুন', 'Link an existing land record (optional)')}
              <select
                value={fields.plot_id}
                onChange={(e) => {
                  const p = plots.find((p) => p.id === Number(e.target.value));
                  setFields((f) => ({
                    ...f,
                    plot_id: e.target.value,
                    ...(p ? { dag_no: p.dag_no, recorded_area: String(p.total_area_decimal), land_class: p.land_type_bn } : {}),
                  }));
                  setDirty(true);
                }}
              >
                <option value="">নতুন দাগ — মালিকানা পরে যুক্ত করব</option>
                {fields.plot_id && !plots.some((p) => p.id === Number(fields.plot_id)) && (
                  <option value={fields.plot_id}>সংযুক্ত রেকর্ড #{fields.plot_id}</option>
                )}
                {plots.map((p) => (
                  <option key={p.id} value={p.id}>
                    দাগ {toBnDigits(p.dag_no)} · {p.plot_code}
                  </option>
                ))}
              </select>
            </label>

            {/* Surveyor Notes / Inspection Remarks */}
            <label>
              {t('সার্ভেয়ারের মন্তব্য / জরিপের ভিত্তি', 'Surveyor Notes / Basis')}
              <textarea
                required
                maxLength={500}
                value={fields.notes || fields.source_reference}
                onChange={(e) => {
                  field('notes', e.target.value);
                  field('source_reference', e.target.value);
                }}
                placeholder={t('জরিপ রেফারেন্স, পিলারের বিবরণ বা পরিদর্শনের মন্তব্য লিখুন…', 'Inspection remarks or survey reference…')}
              />
            </label>

            {/* Detailed Coordinates Editor Collapsible */}
            <details>
              <summary>
                {t('কোণের স্থানাঙ্ক সূক্ষ্ম সম্পাদনা', 'Fine Coordinate Editor')} · {toBnDigits(points.length)} টি পয়েন্ট
              </summary>
              {points.map((p, i) => (
                <div key={i} className="parcel-coordinates">
                  <span>{i + 1}</span>
                  <input
                    aria-label={`কোণ ${i + 1} longitude`}
                    type="number"
                    step="0.00000001"
                    value={p[0]}
                    onChange={(e) => {
                      const newPts = points.map((v, j) => (j === i ? ([Number(e.target.value), v[1]] as XY) : v));
                      pushState(newPts);
                    }}
                  />
                  <input
                    aria-label={`কোণ ${i + 1} latitude`}
                    type="number"
                    step="0.00000001"
                    value={p[1]}
                    onChange={(e) => {
                      const newPts = points.map((v, j) => (j === i ? ([v[0], Number(e.target.value)] as XY) : v));
                      pushState(newPts);
                    }}
                  />
                  {points.length > (drawMode === 'polygon' ? 3 : 2) && (
                    <button
                      type="button"
                      style={{ padding: '2px 6px', fontSize: 10, background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 4 }}
                      onClick={() => pushState(points.filter((_, j) => j !== i))}
                      title={t('কোণ মুছুন', 'Delete point')}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </details>

            {/* Action Buttons */}
            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <button
                className="map-primary map-wide"
                disabled={
                  busy ||
                  drawing ||
                  (drawMode === 'polygon' && points.length < 3) ||
                  (drawMode === 'line' && points.length < 2) ||
                  (drawMode === 'point' && points.length < 1)
                }
              >
                <Save size={16} />
                {busy ? t('সংরক্ষণ হচ্ছে…', 'Saving…') : t('ডাটাবেজে সংরক্ষণ করুন', 'Save to Database')}
              </button>

              {editingFeature && (
                <button
                  type="button"
                  className="map-secondary"
                  style={{ color: '#b91c1c', borderColor: '#fca5a5' }}
                  disabled={busy}
                  onClick={deleteCurrentFeature}
                >
                  <Trash2 size={16} />
                  {t('মুছুন', 'Delete')}
                </button>
              )}
            </div>
          </fieldset>
        </form>
      </div>

      {/* Register & Feature Registry Tabs */}
      <section className="map-card parcel-register">
        <div className="parcel-tab-bar">
          <button
            type="button"
            className={`parcel-tab-btn ${activeTab === 'features' ? 'active' : ''}`}
            onClick={() => setActiveTab('features')}
          >
            <Layers size={16} />
            {t('ভেক্টর ফিচার তালিকা (Polygon, Line, Point)', 'Vector Features')} ({toBnDigits(features.length)})
          </button>
          <button
            type="button"
            className={`parcel-tab-btn ${activeTab === 'parcels' ? 'active' : ''}`}
            onClick={() => setActiveTab('parcels')}
          >
            <Hexagon size={16} />
            {t('মৌজার দাগ ও পর্যালোচনা তালিকা', 'Mouza Parcels & Review')} ({toBnDigits(items.length)})
          </button>
        </div>

        {/* Tab 1: Vector Features Registry */}
        {activeTab === 'features' && (
          <div className="parcel-register-grid">
            {!features.length && (
              <p>{t('এই মৌজায় এখনো কোনো ভেক্টর ফিচার সংরক্ষিত হয়নি। টুলবার থেকে বহুভুজ, রেখা বা পয়েন্ট আঁকুন।', 'No vector features drawn in this mouza yet.')}</p>
            )}
            {features.map((f) => (
              <article key={f.id} style={{ borderLeft: `4px solid ${f.feature_type === 'polygon' ? '#087f5b' : f.feature_type === 'line' ? '#d97706' : '#dc2626'}` }}>
                <div className="map-row">
                  <strong>{f.attributes?.name || `${f.feature_type.toUpperCase()} #${f.id}`}</strong>
                  <span className="map-badge">
                    {f.feature_type === 'polygon' ? 'বহুভুজ' : f.feature_type === 'line' ? 'রেখা' : 'পয়েন্ট'}
                  </span>
                </div>
                <p>
                  {f.attributes?.category && `শ্রেণি: ${f.attributes.category} · `}
                  {f.attributes?.land_class && `জমি: ${f.attributes.land_class} · `}
                  {f.attributes?.dag_no && `দাগ ${toBnDigits(f.attributes.dag_no)}`}
                </p>
                {f.area_decimal && (
                  <p>
                    <strong>{toBnDigits(f.area_decimal.toFixed(3))} {t('শতক', 'decimals')}</strong> ({f.area_sqm?.toFixed(1)} m²)
                  </p>
                )}
                {f.length_meters && (
                  <p>
                    <strong>{toBnDigits(f.length_meters.toFixed(1))} {t('মিটার', 'meters')}</strong> ({(f.length_meters / 20.1168).toFixed(2)} শিকল)
                  </p>
                )}
                <div className="map-row parcel-actions">
                  <button type="button" className="map-secondary" onClick={() => selectFeature(f)}>
                    {t('সম্পাদনা / দেখুন', 'View / Edit')}
                  </button>
                  {canDraw && (
                    <button
                      type="button"
                      className="map-secondary"
                      style={{ color: '#b91c1c' }}
                      onClick={async () => {
                        if (window.confirm(t('মুছে ফেলতে নিশ্চিত?', 'Confirm delete?'))) {
                          await mapFeaturesApi.delete(f.id);
                          await loadLocationData(location);
                        }
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Tab 2: Mouza Parcels & Review Registry */}
        {activeTab === 'parcels' && (
          <div className="parcel-register-grid">
            {!items.length && (
              <p>{t('এই মৌজায় কোনো দাগের নকশা নেই। প্রথম সীমানা আঁকুন।', 'No parcel designs yet. Draw the first boundary.')}</p>
            )}
            {items.map((r) => (
              <article key={r.id}>
                <div className="map-row">
                  <strong>
                    {r.survey} · {t('দাগ', 'Dag')} {toBnDigits(r.dag_no)}
                  </strong>
                  <span className={`map-badge ${r.status === 'PUBLISHED' ? 'published' : ''}`}>
                    {statuses[r.status]}
                  </span>
                </div>
                <p>
                  Sheet {toBnDigits(r.sheet_no)} · {toBnDigits(r.recorded_area)} {t('শতক', 'decimals')} · v{r.version}
                </p>
                <p>{r.plot_id ? `রেকর্ড #${r.plot_id}` : t('মালিকানার রেকর্ড যুক্ত হয়নি', 'Ownership record not linked')}</p>
                {r.review_note && <p className="parcel-review-note">{r.review_note}</p>}
                <div className="map-row parcel-actions">
                  <button type="button" className="map-secondary" onClick={() => selectDesign(r)}>
                    {['DRAFT', 'RETURNED'].includes(r.status) ? t('খুলুন / সংশোধন', 'Open / edit') : t('নকশা দেখুন', 'View')}
                  </button>
                  {['DRAFT', 'RETURNED'].includes(r.status) && loc?.can_edit && canDraw && (
                    <button type="button" className="map-primary" disabled={busy || dirty} onClick={() => action(r, 'submit')}>
                      {t('পর্যালোচনায় পাঠান', 'Submit')}
                    </button>
                  )}
                  {r.status === 'SUBMITTED' && context?.can_review && loc?.can_edit && canDraw && (
                    <>
                      <button type="button" className="map-primary" disabled={busy || dirty} onClick={() => action(r, 'publish')}>
                        {t('পর্যালোচনা ও প্রকাশ', 'Review & publish')}
                      </button>
                      <button type="button" className="map-secondary" disabled={busy || dirty} onClick={() => action(r, 'return')}>
                        {t('ফেরত দিন', 'Return')}
                      </button>
                    </>
                  )}
                  {r.status === 'PUBLISHED' && loc?.can_edit && canDraw && (
                    <>
                      {context?.can_allocate && !r.plot_id && (
                        <button
                          type="button"
                          className="map-primary"
                          onClick={() => {
                            setAllocationTarget(r.id);
                            document.getElementById('parcel-ownership-allocation')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                        >
                          {t('এই দাগে মালিক যুক্ত করুন', 'Allocate owners to this parcel')}
                        </button>
                      )}
                      <button type="button" className="map-secondary" onClick={() => selectDesign(r, true)}>
                        {t('নতুন সংশোধন', 'Create revision')}
                      </button>
                      {context?.can_review && (
                        <button type="button" className="map-secondary" disabled={busy || dirty} onClick={() => action(r, 'archive')}>
                          {t('প্রত্যাহার', 'Withdraw')}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Parcel Owner Allocation Panel */}
      {location > 0 && (
        <ParcelAllocationPanel
          targetId={allocationTarget}
          location={location}
          items={items}
          canCreate={!!context?.can_allocate && !!loc?.can_edit && canDraw}
          canReview={!!context?.can_allocate_review && canDraw}
          onChanged={() => {
            loadLocationData(location);
          }}
        />
      )}

      {/* Review Decision Modal */}
      {decision && (
        <div className="map-modal-backdrop">
          <section className="map-card map-review" role="dialog" aria-modal="true" aria-label="দাগের সিদ্ধান্ত">
            <h2>
              {decision.item.survey} · দাগ {toBnDigits(decision.item.dag_no)} · {actionLabels[decision.action]}
            </h2>
            <label>
              {t('সিদ্ধান্তের কারণ', 'Decision reason')}
              <textarea autoFocus value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            {decision.action === 'publish' && (
              <label className="map-check">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                {t(
                  'মৌজা, দায়িত্বপ্রাপ্ত অফিস, দাগের উৎস, সীমানা ও রেকর্ডের সংযোগ পর্যালোচনা করেছি।',
                  'I reviewed the mouza, office, source, boundaries and record link.'
                )}
              </label>
            )}
            <div className="map-row">
              <button className="map-secondary" onClick={() => setDecision(null)}>
                {t('বাতিল', 'Cancel')}
              </button>
              <button
                className="map-primary"
                disabled={busy || reason.trim().length < 12 || (decision.action === 'publish' && !confirmed)}
                onClick={decide}
              >
                {t('সিদ্ধান্ত সংরক্ষণ', 'Save decision')}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
