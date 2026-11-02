import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapWorkspace.css';
import {
  MapPin,
  Layers,
  Search,
  ArrowRight,
  ExternalLink,
  Lock,
  ShieldAlert,
  Building2,
  Compass,
  Ruler,
  Printer,
  Link2,
  Database,
  RefreshCw,
  X,
  Info,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Check,
  CheckSquare,
  RotateCcw,
  AlertTriangle,
  PenTool,
  CheckCircle2,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { SourceCards } from '../components/sources/SourceCards';
import { useAppUI } from '../i18n';
import {
  mapApi,
  mapError,
  MapLocation,
  MapPlot,
  MapDataset,
  MapWorkspace,
  parcelApi,
  ParcelDesign,
} from '../components/map/mapApi';
import { MapDataManager } from '../components/map/MapDataManager';
import { ParcelDesigner } from '../components/map/ParcelDesigner';
import { OfflineGridLayer } from '../components/map/OfflineGridLayer';
import { TaskAssignmentDrawer } from '../components/map/TaskAssignmentDrawer';
import { mapAssignmentsApi, MapTaskAssignment } from '../api/mapAssignmentsApi';
import {
  mapFeaturesApi,
  MapFeature,
  CADASTRAL_CONSTANTS,
  toBnDigits,
  normalizeBnDigits,
} from '../api/mapFeaturesApi';
import {
  BANGLADESH_DIVISIONS,
  BANGLADESH_RIVERS,
  ALL_MOUZA_CADASTRAL_PLOTS,
  CadastralPlotPolygon,
  BangladeshDivision,
} from '../data/bangladeshGeo';

export type BasemapMode = 'carto' | 'osm' | 'satellite' | 'dark' | 'offline_grid';

export const BASEMAP_CONFIGS: Record<
  BasemapMode,
  {
    name_bn: string;
    name_en: string;
    icon: string;
    url?: string;
    subdomains?: string[];
    maxZoom?: number;
    attribution?: string;
  }
> = {
  carto: {
    name_bn: 'সরকারি মানচিত্র',
    name_en: 'Gov Carto',
    icon: '🏛️',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 20,
    attribution: '&copy; CARTO &copy; OpenStreetMap &copy; ভূমি মন্ত্রণালয়',
  },
  osm: {
    name_bn: 'রোড ম্যাপ',
    name_en: 'Road Map',
    icon: '🗺️',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    name_bn: 'স্যাটেলাইট চিত্র',
    name_en: 'Satellite',
    icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: '&copy; Esri & Earthstar Geographics',
  },
  dark: {
    name_bn: 'ডার্ক মোড',
    name_en: 'Dark Mode',
    icon: '🌙',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 20,
    attribution: '&copy; CARTO &copy; OpenStreetMap',
  },
  offline_grid: {
    name_bn: 'অফলাইন গ্রিড',
    name_en: 'Offline Grid',
    icon: '📐',
  },
};

export const CadastralMapPage: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { t, lang, user } = useAppUI();
  const admin = !!user && ['admin', 'system_admin'].includes(user.role);
  const canDesign = !!user && [
    'admin',
    'system_admin',
    'ac_land',
    'land_office_assistant',
    'field_verification_officer',
    'settlement_records_officer',
    'settlement_checker',
  ].includes(user.role);

  const initial = new URLSearchParams(window.location.search);
  const initialOfficeId = Number(initial.get('office_id')) || 0;
  const initialLat = Number(initial.get('lat')) || 0;
  const initialLng = Number(initial.get('lng')) || 0;

  // View & Tool States
  const [design, setDesign] = useState(initial.get('design') === '1' && canDesign);
  const [designed, setDesigned] = useState<ParcelDesign[]>([]);
  const designLayer = useRef<L.LayerGroup | null>(null);

  // Cascading Hierarchy: Division -> District -> Upazila -> Mouza -> Survey -> Sheet -> Plot
  const [division, setDivision] = useState('');
  const [district, setDistrict] = useState('');
  const [upazila, setUpazila] = useState('');
  const [location, setLocation] = useState(Number(initial.get('mouza')) || 1); // Default to Birulia Mouza (ID=1)
  const [surveyType, setSurveyType] = useState<string>('BS');
  const [sheet, setSheet] = useState<string>('');

  // Search & Pagination
  const [q, setQ] = useState(initial.get('q') || '');
  const [search, setSearch] = useState(initial.get('q') || '');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<MapWorkspace | null>(null);
  const [selected, setSelected] = useState<MapPlot | null>(null);
  const [dagAutocompleteOpen, setDagAutocompleteOpen] = useState(false);

  // Map Data & Layers
  const [datasets, setDatasets] = useState<MapDataset[]>([]);
  const [activeDataset, setActiveDataset] = useState<MapDataset | null>(null);
  const [geo, setGeo] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [manage, setManage] = useState(initial.get('manage') === '1' && admin);
  const [measuring, setMeasuring] = useState(false);
  const [points, setPoints] = useState<L.LatLng[]>([]);
  const [revision, setRevision] = useState(0);

  // Active Real Basemap Mode: Defaults to Carto / OSM for Authentic Bangladesh Map!
  const [basemapMode, setBasemapMode] = useState<BasemapMode>('carto');

  // Overlay Toggles
  const [showDivisions, setShowDivisions] = useState(true);
  const [showRivers, setShowRivers] = useState(true);
  const [showCadastralParcels, setShowCadastralParcels] = useState(true);
  const [showMouzaMarkers, setShowMouzaMarkers] = useState(true);
  const [showOffices, setShowOffices] = useState(true);
  const [showRiskOverlay, setShowRiskOverlay] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Real-time HUD Coordinates Readout
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [copiedCoords, setCopiedCoords] = useState(false);

  // Task Assignment Drawer
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [myTasksCount, setMyTasksCount] = useState(0);

  // Mobile Bottom Sheet / Tab Switcher: 'search' | 'map' | 'details' | 'tasks'
  const [mobileTab, setMobileTab] = useState<'search' | 'map' | 'details' | 'tasks'>('map');

  // DOM and Leaflet Layer References
  const root = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const baseTileLayer = useRef<L.TileLayer | null>(null);
  const offlineGrid = useRef<OfflineGridLayer | null>(null);
  const divisionsLayer = useRef<L.LayerGroup | null>(null);
  const riversLayer = useRef<L.LayerGroup | null>(null);
  const cadastralPlotsLayer = useRef<L.LayerGroup | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const officeMarkers = useRef<L.LayerGroup | null>(null);
  const geometry = useRef<L.GeoJSON | null>(null);
  const measureLayer = useRef<L.LayerGroup | null>(null);
  const measureEnabled = useRef(false);
  const pendingLayer = useRef<{ d: MapDataset; g: any } | null>(null);

  const loc = data?.locations.find((l) => l.id === location);
  const locations = data?.locations || [];

  const name = (row: any, key: string) => row?.[`${key}_${lang}`] || row?.[`${key}_bn`] || '';

  // Load Task Count for Authenticated Officers
  const refreshTasksCount = async () => {
    if (!user) return;
    try {
      const tasks = await mapAssignmentsApi.myAssignments();
      if (Array.isArray(tasks)) {
        const pendingOrActive = tasks.filter(
          (t: MapTaskAssignment) => t.status === 'pending' || t.status === 'in_progress'
        );
        setMyTasksCount(pendingOrActive.length);
      }
    } catch {
      // Ignored if offline or unauthenticated
    }
  };

  useEffect(() => {
    refreshTasksCount();
  }, [user]);

  // Fetch Map Workspace Data (Locations, Plots, Offices)
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    mapApi
      .workspace(location, search, page, controller.signal, { division, district, upazila })
      .then((res) => {
        setData(res);
        setLoading(false);
        setError('');
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(mapError(e));
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [location, search, page, revision, division, district, upazila]);

  // Load Mouza Datasets/Layers
  useEffect(() => {
    let live = true;
    if (pendingLayer.current?.d.location_id === location) {
      setGeo(pendingLayer.current.g);
      setActiveDataset(pendingLayer.current.d);
      pendingLayer.current = null;
    } else {
      setGeo(null);
      setActiveDataset(null);
    }
    setSheet('');
    mapApi
      .layers(location)
      .then((r) => {
        if (live) setDatasets(r);
      })
      .catch((e) => {
        if (live) setError(mapError(e));
      });
    return () => {
      live = false;
    };
  }, [location, revision]);

  // Leaflet Map Initialization with Real Bangladesh Centering
  useEffect(() => {
    if (!root.current) return;

    // Start centered on Birulia / Savar (23.858, 90.318) or Bangladesh general view (23.75, 90.35)
    const startCenter: L.LatLngTuple =
      initialLat && initialLng
        ? [initialLat, initialLng]
        : loc
        ? [Number(loc.latitude), Number(loc.longitude)]
        : [23.8103, 90.4125];
    const startZoom = initialLat && initialLng ? 16 : loc ? 14 : 7;

    const m = L.map(root.current, {
      center: startCenter,
      zoom: startZoom,
      minZoom: 5,
      maxZoom: 22,
      zoomControl: false,
      preferCanvas: true,
      maxBounds: [
        [20.0, 87.5], // South-West of Bangladesh
        [27.0, 93.5], // North-East of Bangladesh
      ],
    });
    map.current = m;

    L.control.zoom({ position: 'bottomright' }).addTo(m);
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(m);

    // Initialize Layer Groups
    divisionsLayer.current = L.layerGroup().addTo(m);
    riversLayer.current = L.layerGroup().addTo(m);
    cadastralPlotsLayer.current = L.layerGroup().addTo(m);
    markers.current = L.layerGroup().addTo(m);
    officeMarkers.current = L.layerGroup().addTo(m);
    measureLayer.current = L.layerGroup().addTo(m);

    // Initialize Offline Fallback Grid Layer
    offlineGrid.current = new OfflineGridLayer({ theme: 'cadastral' });

    // Track Cursor Coordinates for Real-Time HUD
    m.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursorCoords({
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
        zoom: m.getZoom(),
      });
    });

    m.on('zoomend', () => {
      setCursorCoords((prev) => (prev ? { ...prev, zoom: m.getZoom() } : null));
    });

    // Measurement click handler
    m.on('click', (e: L.LeafletMouseEvent) => {
      if (measureEnabled.current) {
        setPoints((p) => (p.length >= 16 ? [e.latlng] : [...p, e.latlng]));
      }
    });

    const observer = new ResizeObserver(() => m.invalidateSize());
    observer.observe(root.current);

    return () => {
      observer.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);

  // Update Basemap Tiles (Carto, OpenStreetMap, Satellite, Dark, Offline)
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    // Remove existing tile layer or offline grid
    if (baseTileLayer.current) {
      m.removeLayer(baseTileLayer.current);
      baseTileLayer.current = null;
    }
    if (offlineGrid.current && m.hasLayer(offlineGrid.current)) {
      m.removeLayer(offlineGrid.current);
    }

    const cfg = BASEMAP_CONFIGS[basemapMode];

    if (basemapMode === 'offline_grid') {
      if (offlineGrid.current) {
        offlineGrid.current.setTheme('cadastral');
        offlineGrid.current.addTo(m);
      }
    } else if (cfg.url) {
      const tile = L.tileLayer(cfg.url, {
        maxZoom: cfg.maxZoom || 19,
        subdomains: (cfg.subdomains || ['a', 'b', 'c']).join(''),
        attribution: cfg.attribution || '',
      });

      // Fallback to offline grid on network tile load error
      tile.on('tileerror', () => {
        if (offlineGrid.current && !m.hasLayer(offlineGrid.current)) {
          offlineGrid.current.addTo(m);
        }
      });

      tile.addTo(m);
      baseTileLayer.current = tile;
    }
  }, [basemapMode]);

  // Render Bangladesh Administrative Divisions & Major Rivers
  useEffect(() => {
    const m = map.current;
    if (!m || !divisionsLayer.current || !riversLayer.current) return;

    divisionsLayer.current.clearLayers();
    riversLayer.current.clearLayers();

    // 1. Bangladesh 8 Administrative Divisions
    if (showDivisions) {
      BANGLADESH_DIVISIONS.forEach((div) => {
        const isSelectedDivision = division === div.name_bn;

        const poly = L.polygon(div.polygon, {
          color: isSelectedDivision ? '#047857' : div.color,
          weight: isSelectedDivision ? 3 : 1.5,
          opacity: 0.8,
          fillColor: div.color,
          fillOpacity: isSelectedDivision ? 0.2 : 0.08,
          dashArray: isSelectedDivision ? undefined : '5, 5',
        });

        // Hover tooltip
        poly.bindTooltip(
          `<strong>${div.name_bn} বিভাগ (${div.name_en})</strong><br/>` +
            `সদর দপ্তর: ${div.headquarters_bn}<br/>` +
            `জেলা: ${div.districts_count}টি · উপজেলা: ${div.upazilas_count}টি`,
          { sticky: true }
        );

        // Click on division zooms directly to it
        poly.on('click', () => {
          setDivision(div.name_bn);
          setDistrict('');
          setUpazila('');
          m.flyTo(div.center, div.zoom, { duration: 1.2 });
        });

        poly.addTo(divisionsLayer.current!);

        // Division Centroid Label Marker
        const labelIcon = L.divIcon({
          className: 'division-label-marker',
          html: `<span>${div.name_bn} বিভাগ</span>`,
          iconSize: [80, 24],
          iconAnchor: [40, 12],
        });
        L.marker(div.center, { icon: labelIcon, interactive: false }).addTo(divisionsLayer.current!);
      });
    }

    // 2. Bangladesh Major Rivers (Padma, Meghna, Jamuna, Karnaphuli, Turag)
    if (showRivers) {
      BANGLADESH_RIVERS.forEach((river) => {
        const line = L.polyline(river.coordinates, {
          color: river.color,
          weight: river.width,
          opacity: 0.85,
        });

        line.bindTooltip(`🌊 <strong>${river.name_bn}</strong>`, { sticky: true });
        line.addTo(riversLayer.current!);
      });
    }
  }, [showDivisions, showRivers, division]);

  // Render Authentic Cadastral Mouza Plots (Polygons & Central Dag Number Badges)
  useEffect(() => {
    const m = map.current;
    if (!m || !cadastralPlotsLayer.current) return;

    cadastralPlotsLayer.current.clearLayers();
    if (!showCadastralParcels) return;

    const plots = ALL_MOUZA_CADASTRAL_PLOTS[location] || [];

    plots.forEach((p) => {
      const isSelected = selected && (selected.dag_no === p.dag_no || selected.id === Number(p.dag_no));

      // Strict Traffic-Light Plot Boundary Colors:
      // Green = safe, Yellow = lien/warning, Red = frozen/dispute/locked (eliminate purple)
      const strokeColor = p.color === '#7c3aed' ? '#dc2626' : p.color;
      const plotFill = p.fillColor === '#8b5cf6' || p.fillColor === '#ede9fe' ? '#fee2e2' : p.fillColor;

      // Plot Polygon Boundary
      const poly = L.polygon(p.coordinates, {
        color: isSelected ? '#b45309' : strokeColor,
        weight: isSelected ? 3.5 : 2,
        fillColor: isSelected ? '#f59e0b' : plotFill,
        fillOpacity: isSelected ? 0.6 : 0.35,
      });

      // Interactive Tooltip
      poly.bindTooltip(
        `<strong>দাগ নং ${p.dag_no_bn}</strong> · ${p.area_decimal} শতক<br/>` +
          `খতিয়ান: ${p.khatian_no} · শ্রেণি: ${p.land_type_bn}<br/>` +
          `জরিপ: ${p.survey_type} · শিট: ${p.sheet_no}`,
        { sticky: true }
      );

      // On click, select plot
      poly.on('click', () => {
        const found = data?.plots.find(
          (item) => item.dag_no === p.dag_no || normalizeBnDigits(item.dag_no) === p.dag_no
        );
        if (found) {
          setSelected(found);
        } else {
          // Synthetic plot object for inspection
          setSelected({
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
          });
        }
        setMobileTab('details');
      });

      poly.addTo(cadastralPlotsLayer.current!);

      // Centered Dag Number Badge (Bangla Numerals stamped on parcel)
      const dagBadge = L.divIcon({
        className: `cadastral-dag-badge ${isSelected ? 'selected' : ''}`,
        html: `<span>${p.dag_no_bn}</span>`,
        iconSize: [28, 18],
        iconAnchor: [14, 9],
      });
      L.marker(p.center, { icon: dagBadge, interactive: false }).addTo(cadastralPlotsLayer.current!);
    });
  }, [location, showCadastralParcels, selected?.id, data?.plots]);

  // Load and Render Saved Vector Features from map_features API
  useEffect(() => {
    let live = true;
    if (!location) return;

    mapFeaturesApi
      .list({ location_id: location })
      .then((feats) => {
        if (!live || !map.current || !cadastralPlotsLayer.current) return;
        if (Array.isArray(feats)) {
          feats.forEach((feat: MapFeature) => {
            if (feat.geometry.type === 'Polygon') {
              const outerRing = feat.geometry.coordinates[0];
              if (Array.isArray(outerRing)) {
                const latLngs: L.LatLngTuple[] = outerRing.map(([lng, lat]) => [lat, lng]);
                const p = L.polygon(latLngs, {
                  color: '#047857',
                  weight: 2,
                  fillColor: '#10b981',
                  fillOpacity: 0.25,
                });
                if (feat.attributes?.dag_no) {
                  p.bindTooltip(`দাগ: ${feat.attributes.dag_no} (ভেক্টর ড্রয়িং)`);
                }
                p.addTo(cadastralPlotsLayer.current!);
              }
            } else if (feat.geometry.type === 'LineString') {
              const coords = feat.geometry.coordinates;
              if (Array.isArray(coords)) {
                const latLngs: L.LatLngTuple[] = coords.map(([lng, lat]) => [lat, lng]);
                const l = L.polyline(latLngs, {
                  color: '#0284c7',
                  weight: 3,
                  dashArray: '4, 4',
                });
                if (feat.attributes?.name) {
                  l.bindTooltip(`খাল/রেখা: ${feat.attributes.name}`);
                }
                l.addTo(cadastralPlotsLayer.current!);
              }
            } else if (feat.geometry.type === 'Point') {
              const [lng, lat] = feat.geometry.coordinates;
              const marker = L.circleMarker([lat, lng], {
                radius: 6,
                color: '#b45309',
                fillColor: '#f59e0b',
                fillOpacity: 0.9,
              });
              if (feat.attributes?.name) {
                marker.bindTooltip(`পিলার: ${feat.attributes.name}`);
              }
              marker.addTo(cadastralPlotsLayer.current!);
            }
          });
        }
      })
      .catch(() => {
        // Ignored
      });

    return () => {
      live = false;
    };
  }, [location, revision]);

  // Update Mouza Reference Markers & Service Offices
  useEffect(() => {
    if (!map.current || !markers.current || !officeMarkers.current || !data) return;

    markers.current.clearLayers();
    officeMarkers.current.clearLayers();

    // 1. Mouza Reference Points (if toggled)
    if (showMouzaMarkers) {
      const pointsList = loc
        ? [loc]
        : locations.filter(
            (l) =>
              (!division || l.division_bn === division) &&
              (!district || l.district_bn === district) &&
              (!upazila || l.upazila_bn === upazila)
          );

      pointsList.forEach((l) => {
        if (!Number(l.latitude) || !Number(l.longitude)) return;
        const marker = L.circleMarker([Number(l.latitude), Number(l.longitude)], {
          radius: loc ? 8 : 7,
          color: '#ffffff',
          weight: 2.5,
          fillColor: '#087f5b',
          fillOpacity: 0.95,
        }).addTo(markers.current!);

        marker.bindTooltip(`${name(l, 'mouza')} · JL ${l.jl_no}`, { direction: 'top' });
        marker.on('click', () => {
          setLocation(l.id);
          setPage(1);
          setMobileTab('map');
          map.current?.flyTo([Number(l.latitude), Number(l.longitude)], 15, { duration: 1.2 });
        });
      });
    }

    // 2. Service Offices (if toggled)
    if (showOffices) {
      const targetOffice = initialOfficeId
        ? data.offices.find((o) => o.id === initialOfficeId)
        : initialLat && initialLng
        ? data.offices.find(
            (o) =>
              Math.abs(Number(o.latitude) - initialLat) < 0.02 &&
              Math.abs(Number(o.longitude) - initialLng) < 0.02
          )
        : null;

      data.offices.forEach((o) => {
        if (!o.latitude || !o.longitude) return;
        const isTarget = targetOffice && o.id === targetOffice.id;
        const marker = L.circleMarker([Number(o.latitude), Number(o.longitude)], {
          radius: isTarget ? 9 : 5,
          color: '#ffffff',
          weight: isTarget ? 3 : 2,
          fillColor: isTarget ? '#b45309' : '#64748b',
          fillOpacity: 0.9,
        })
          .bindTooltip(
            name(o, 'name') + (isTarget ? ` (${t('নির্বাচিত দপ্তর', 'Selected Office')})` : '')
          )
          .addTo(officeMarkers.current!);

        if (isTarget) marker.openTooltip();
      });
    }

    // Auto-center camera when selecting location or office
    const targetOffice = initialOfficeId ? data.offices.find((o) => o.id === initialOfficeId) : null;
    if (targetOffice?.latitude && targetOffice.longitude) {
      map.current.setView([Number(targetOffice.latitude), Number(targetOffice.longitude)], 15);
    } else if (loc?.latitude && loc.longitude) {
      map.current.setView([Number(loc.latitude), Number(loc.longitude)], 15);
    }
  }, [data, location, lang, showMouzaMarkers, showOffices]);

  // Load and Render Office-Published Parcel Designs
  useEffect(() => {
    let live = true;
    parcelApi
      .list(location, true)
      .then((r) => live && setDesigned(r))
      .catch((e) => live && setError(mapError(e)));
    return () => {
      live = false;
    };
  }, [location, revision, design]);

  // Render Designed Parcels Layer
  useEffect(() => {
    if (!map.current) return;
    designLayer.current?.remove();

    const group = L.layerGroup().addTo(map.current);
    designLayer.current = group;

    designed.forEach((d) => {
      const isSel = selected && Number(d.plot_id) === selected.id;
      const l = L.geoJSON(d.geometry, {
        style: {
          color: isSel ? '#b45309' : '#087f5b',
          weight: isSel ? 3 : 2,
          fillColor: '#059669',
          fillOpacity: 0.22,
        },
      });

      const label = document.createElement('span');
      label.textContent = `${d.survey || 'জরিপ'} · দাগ ${d.dag_no} · ${d.recorded_area} শতক`;
      l.bindTooltip(label);

      l.on('click', () => {
        const p = data?.plots.find((plt) => plt.id === Number(d.plot_id));
        if (p) {
          setSelected(p);
          setMobileTab('details');
        } else {
          setToast(
            `দাগ ${d.dag_no} · ${d.recorded_area} শতক · ${d.land_use || 'নাল'} · ${d.source_reference}`
          );
        }
      });
      l.addTo(group);
    });

    return () => {
      group.remove();
    };
  }, [designed, data, selected?.id]);

  // Filter Features by Sheet No
  const filteredGeo = useMemo(
    () =>
      geo
        ? {
            ...geo,
            features: geo.features.filter(
              (f: any) => !sheet || String(f.properties?.sheet_no) === sheet
            ),
          }
        : null,
    [geo, sheet]
  );

  // Render Geometry & Legal Risk Color Overlay
  useEffect(() => {
    if (!map.current) return;
    geometry.current?.remove();
    if (!filteredGeo || !showCadastralParcels) return;

    const layer = L.geoJSON(filteredGeo, {
      style: (feature) => {
        const plotId = Number(feature?.properties?.plot_id);
        const linkedPlot = data?.plots.find((p) => p.id === plotId);
        const isSel = selected && selected.id === plotId;

        // Legal Risk Color Encoding
        let strokeColor = '#087f5b';
        let fillColor = activeDataset?.layer_kind === 'zoning' ? '#fbbf24' : '#34d399';
        let fillOpacity = 0.2;

        if (showRiskOverlay && linkedPlot) {
          if (linkedPlot.is_admin_frozen || linkedPlot.owner_sale_locked) {
            strokeColor = '#dc2626'; // Admin Freeze or Sale Locked: Crimson Red (Strict Traffic Light)
            fillColor = '#ef4444';
            fillOpacity = 0.35;
          } else if (linkedPlot.has_active_lien) {
            strokeColor = '#d97706'; // Bank Lien: Warning Amber
            fillColor = '#f59e0b';
            fillOpacity = 0.35;
          }
        }

        if (isSel) {
          strokeColor = '#b45309'; // Selected Plot: Gold/Brown
          fillColor = '#d97706';
          fillOpacity = 0.45;
        }

        return {
          color: strokeColor,
          weight: isSel ? 3.5 : 2,
          fillColor,
          fillOpacity,
        };
      },
      onEachFeature: (feature, l) => {
        const p = feature.properties || {};
        const tip = document.createElement('span');
        tip.textContent =
          [
            p.label,
            p.dag_no ? `${t('দাগ', 'Dag')} ${p.dag_no}` : '',
            p.sheet_no ? `Sheet ${p.sheet_no}` : '',
          ]
            .filter(Boolean)
            .join(' · ') || t('উৎসের geometry', 'Source geometry');
        l.bindTooltip(tip);

        l.on('click', () => {
          const plot = data?.plots.find((plt) => plt.id === Number(feature.properties?.plot_id));
          if (plot) {
            setSelected(plot);
            setMobileTab('details');
          } else {
            setToast(
              t(
                'এই feature-এর সঙ্গে দৃশ্যমান ভূমি রেকর্ড যুক্ত নেই।',
                'No visible land record is linked to this feature.'
              )
            );
          }
        });
      },
    }).addTo(map.current);

    geometry.current = layer;
    const bounds = layer.getBounds();
    if (bounds.isValid()) map.current.fitBounds(bounds, { padding: [32, 32], maxZoom: 18 });
  }, [filteredGeo, selected?.id, lang, showCadastralParcels, showRiskOverlay, data?.plots]);

  // Measurement Line Renderer
  useEffect(() => {
    const group = measureLayer.current;
    if (!group) return;
    group.clearLayers();
    if (points.length) {
      L.polyline(points, { color: '#b45309', weight: 3, dashArray: '6 5' }).addTo(group);
      points.forEach((p) => L.circleMarker(p, { radius: 4, color: '#b45309' }).addTo(group));
    }
  }, [points]);

  const measureDistanceMeters = points.reduce(
    (sum, p, i) => (i ? sum + p.distanceTo(points[i - 1]) : 0),
    0
  );
  const measureDistanceFeet = measureDistanceMeters * 3.28084;
  const measureDistanceChains = measureDistanceMeters / CADASTRAL_CONSTANTS.CHAIN_TO_METERS;

  const sheets = useMemo(
    () =>
      geo
        ? [...new Set<string>(geo.features.map((f: any) => String(f.properties?.sheet_no || '')).filter(Boolean))]
        : [],
    [geo]
  );

  const summary = useMemo(() => {
    const result: Record<string, number> = {};
    (filteredGeo?.features || []).forEach((f: any) => {
      const key = f.properties?.land_use || f.properties?.zone || t('শ্রেণি দেওয়া নেই', 'Unclassified');
      result[key] = (result[key] || 0) + 1;
    });
    return result;
  }, [filteredGeo, lang]);

  const choose = (id: number) => {
    setLocation(id);
    setPage(1);
    setSelected(null);
  };

  async function openDataset(d: MapDataset) {
    setError('');
    try {
      const r = await mapApi.geometry(d.id);
      if (location !== d.location_id) {
        pendingLayer.current = { d, g: r.geojson };
        setLocation(d.location_id);
      }
      setGeo(r.geojson);
      setActiveDataset(d);
      setSheet('');
    } catch (e) {
      setError(mapError(e));
    }
  }

  function navigate(tab: string) {
    onNavigate?.(tab);
  }

  // Share current map position link
  async function share() {
    const url = new URL(window.location.href);
    url.search = '';
    if (location || selected) url.searchParams.set('mouza', String(selected?.location_id || location));
    if (selected) {
      url.searchParams.set('parcel', String(selected.id));
      url.searchParams.set('q', selected.plot_code);
    }
    try {
      await navigator.clipboard.writeText(url.toString());
      setToast(t('এই অবস্থানের লিংক কপি হয়েছে।', 'Link copied to clipboard.'));
    } catch {
      setToast(url.toString());
    }
  }

  // Copy HUD Coordinates
  const copyCoordinates = () => {
    if (!cursorCoords) return;
    const text = `${cursorCoords.lat}, ${cursorCoords.lng}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setToast(t(`স্থানাঙ্ক কপি হয়েছে: ${text}`, `Coordinates copied: ${text}`));
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  // Direct Map Navigation from Task Assignment
  const handleNavigateToTask = (
    lat: number,
    lng: number,
    targetLocId: number,
    targetPlotId?: number | null
  ) => {
    setLocation(targetLocId);
    setMobileTab('map');
    if (map.current) {
      map.current.flyTo([lat, lng], 17, { duration: 1.5 });
    }
    if (targetPlotId && data?.plots) {
      const found = data.plots.find((p) => p.id === targetPlotId);
      if (found) setSelected(found);
    }
  };

  // Fast Dag Autocomplete with Digit Normalization
  const normalizedSearchQ = normalizeBnDigits(q.trim());
  const dagSuggestions = useMemo(() => {
    if (!normalizedSearchQ || !data?.plots) return [];
    return data.plots
      .filter(
        (p) =>
          normalizeBnDigits(p.dag_no).includes(normalizedSearchQ) ||
          p.plot_code.toLowerCase().includes(normalizedSearchQ.toLowerCase())
      )
      .slice(0, 8);
  }, [normalizedSearchQ, data?.plots]);

  // Reset Cascading Filters
  const handleResetFilters = () => {
    setDivision('');
    setDistrict('');
    setUpazila('');
    setLocation(1);
    setSurveyType('BS');
    setSheet('');
    setQ('');
    setSearch('');
    setSelected(null);
    setPage(1);
    if (map.current) map.current.flyTo([23.8103, 90.4125], 7, { duration: 1.2 });
  };

  const compatibleOffices = (data?.offices || []).filter(
    (o) => !loc || (o.district_en === loc.district_en && o.upazila_en === loc.upazila_en)
  );

  // Cadastral Conversions for Selected Plot
  const selectedAreaCalculations = useMemo(() => {
    if (!selected) return null;
    const decimals = Number(selected.total_area_decimal) || 0;
    const acres = (decimals / CADASTRAL_CONSTANTS.ACRE_TO_DECIMAL).toFixed(4);
    const katha = (decimals / CADASTRAL_CONSTANTS.KATHA_TO_DECIMAL).toFixed(2);
    const bigha = (decimals / CADASTRAL_CONSTANTS.BIGHA_TO_DECIMAL).toFixed(2);
    const sqm = (decimals * CADASTRAL_CONSTANTS.DECIMAL_TO_SQM).toFixed(2);
    const sqft = (Number(sqm) * CADASTRAL_CONSTANTS.SQM_TO_SQFT).toFixed(1);
    return { decimals, acres, katha, bigha, sqm, sqft };
  }, [selected]);

  return (
    <div className={`land-map-workspace ${isFullScreen ? 'fullscreen-mode' : ''}`}>
      {/* Vector Drawing & Editing Modal (Milestone 2 integration) */}
      {canDesign && design && (
        <ParcelDesigner
          onExit={(id) => {
            if (id) {
              setLocation(id);
              setPage(1);
            }
            setDesign(false);
            setRevision((x) => x + 1);
          }}
        />
      )}

      {/* Task Assignment Drawer (Milestone 3 R3 integration) */}
      <TaskAssignmentDrawer
        isOpen={taskDrawerOpen}
        onClose={() => setTaskDrawerOpen(false)}
        locations={locations}
        activeLocationId={location || undefined}
        activePlotId={selected?.id || undefined}
        onNavigateToLocation={handleNavigateToTask}
        onTaskCreated={() => {
          setRevision((x) => x + 1);
          refreshTasksCount();
        }}
      />

      <div style={{ display: design ? 'none' : undefined }}>
        {/* OFFICIAL BANGLADESH GOVERNMENT BANNER (Inspired by map.land.gov.bd) */}
        <section className="gov-national-banner" aria-label="Official Bangladesh Government Banner">
          <div className="gov-brand-left">
            <div className="gov-crest-emblem">
              <span className="gov-crest-star">★</span>
            </div>
            <div className="gov-brand-titles">
              <p className="gov-brand-subtitle">
                <span>গণপ্রজাতন্ত্রী বাংলাদেশ সরকার · ভূমি মন্ত্রণালয়</span>
                <span className="gov-status-pill">● জাতীয় ডিজিটাল মৌজা ম্যাপ পোর্টাল</span>
              </p>
              <h1>{t('বাংলাদেশ ডিজিটাল মৌজা নকশা ও খতিয়ান মানচিত্র', 'National Digital Mouza Map & Cadastral Portal')}</h1>
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>
                {t(
                  'অফিসিয়াল map.land.gov.bd আদলে ক্যাডাস্ট্রাল জরিপ, স্যাটেলাইট ওভারলে, ভেক্টর ড্রয়িং ও সার্ভেয়ার এসাইনমেন্ট।',
                  'Authentic cadastral survey maps, satellite & street overlays, CAD drawing & surveyor workflows.'
                )}
              </p>
            </div>
          </div>

          <div className="map-header-actions">
            {/* Task Assignments Button with Badge */}
            {user && (
              <button
                className="map-secondary task-badge-btn"
                onClick={() => setTaskDrawerOpen(true)}
                title={t('সার্ভে ও ম্যাপিং কাজ বরাদ্দ ও ট্র্যাকিং', 'Mapping Task Assignments')}
              >
                <CheckSquare size={16} />
                <span>{t('কাজের দায়িত্ব', 'Tasks')}</span>
                {myTasksCount > 0 && <span className="task-header-pill">{myTasksCount}</span>}
              </button>
            )}

            {/* In-Map CAD Vector Drawing Studio */}
            {canDesign && (
              <button className="map-primary" onClick={() => setDesign(true)} style={{ background: '#059669', borderColor: '#059669' }}>
                <PenTool size={16} />
                <span>{t('মৌজা ম্যাপ ড্রয়িং', 'Draw & Edit Map')}</span>
              </button>
            )}

            {/* Official Portal Reference Link */}
            <a
              className="map-secondary"
              href="https://map.land.gov.bd/"
              target="_blank"
              rel="noopener noreferrer"
              title="Official Bangladesh Government Mouza Map"
            >
              <ExternalLink size={16} />
              <span>{t('map.land.gov.bd', 'Official Portal')}</span>
            </a>

            {/* Admin Data Manager */}
            {admin && (
              <button
                className={manage ? 'map-primary' : 'map-secondary'}
                onClick={() => setManage(!manage)}
              >
                <Database size={16} />
                <span>{manage ? t('মানচিত্রে ফিরুন', 'Back to map') : t('নকশা নিয়ন্ত্রণ', 'Manage data')}</span>
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              className="map-secondary map-icon-only-btn"
              onClick={() => setIsFullScreen(!isFullScreen)}
              title={isFullScreen ? t('স্বাভাবিক পর্দা', 'Exit Fullscreen') : t('পূর্ণ পর্দা', 'Fullscreen')}
              aria-label="Toggle Fullscreen"
            >
              {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </section>

        {/* 8 ADMINISTRATIVE DIVISIONS QUICK JUMP BAR */}
        <nav className="division-quick-bar" aria-label="Division Quick Navigation">
          <span className="division-quick-label">
            <Compass size={13} />
            {t('বিভাগীয় দ্রুত নির্বাচন:', 'Jump to Division:')}
          </span>
          <button
            className={`division-pill-btn ${!division ? 'active' : ''}`}
            onClick={() => {
              setDivision('');
              setDistrict('');
              setUpazila('');
              if (map.current) map.current.flyTo([23.8103, 90.4125], 7, { duration: 1.2 });
            }}
          >
            {t('সমগ্র বাংলাদেশ', 'All Bangladesh')}
          </button>
          {BANGLADESH_DIVISIONS.map((div) => (
            <button
              key={div.id}
              className={`division-pill-btn ${division === div.name_bn ? 'active' : ''}`}
              onClick={() => {
                setDivision(div.name_bn);
                setDistrict('');
                setUpazila('');
                if (map.current) map.current.flyTo(div.center, div.zoom, { duration: 1.2 });
              }}
            >
              {div.name_bn}
            </button>
          ))}
        </nav>

        {/* System Error & Toast Banners */}
        {error && (
          <div className="map-error" role="alert">
            <AlertTriangle size={16} />
            <span>{error}</span>
            <button onClick={() => setRevision((x) => x + 1)}>
              <RefreshCw size={14} />
              {t('আবার চেষ্টা', 'Retry')}
            </button>
          </div>
        )}

        {toast && (
          <div className="map-toast" role="status">
            <Check size={16} />
            <span>{toast}</span>
            <button aria-label="Close message" onClick={() => setToast('')}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Admin Data Manager Panel */}
        <div style={{ display: manage ? 'block' : 'none' }}>
          {admin && manage && (
            <MapDataManager
              locations={locations}
              onChanged={() => setRevision((x) => x + 1)}
              onPreview={(d, g) => {
                if (location !== d.location_id) pendingLayer.current = { d, g };
                setLocation(d.location_id);
                setActiveDataset(d);
                setGeo(g);
                setManage(false);
              }}
            />
          )}
        </div>

        {/* Main 3-Column Layout: Cascading Search | Interactive Map Stage | Details Panel */}
        <div
          className={`map-explorer-grid mobile-tab-${mobileTab}`}
          style={{ display: manage ? 'none' : undefined }}
        >
          {/* COLUMN 1: MULTI-TIER CASCADING SEARCH PANEL (Inspired by map.land.gov.bd) */}
          <aside className={`map-search-panel ${mobileTab === 'search' ? 'mobile-visible' : ''}`}>
            <div className="map-panel-heading" style={{ background: '#f0fdf4', borderBottomColor: '#bbf7d0' }}>
              <Search size={18} style={{ color: '#047857' }} />
              <h2 style={{ color: '#064e3b' }}>{t('মৌজা ও দাগ অনুসন্ধান', 'Cascading Search')}</h2>
              <button
                className="map-reset-btn"
                onClick={handleResetFilters}
                title={t('ফিল্টার রিসেট করুন', 'Reset all filters')}
              >
                <RotateCcw size={13} />
                <span>{t('রিসেট', 'Reset')}</span>
              </button>
            </div>

            {/* Official 7-tier cascading selector */}
            <div className="map-gov-cascading-search">
              {/* Division (বিভাগ) */}
              <label>
                <span>{t('১. বিভাগ (Division)', '1. Division')}</span>
                <select
                  aria-label={t('বিভাগ', 'Division')}
                  value={division}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDivision(val);
                    setDistrict('');
                    setUpazila('');
                    choose(0);
                    const matchDiv = BANGLADESH_DIVISIONS.find((d) => d.name_bn === val);
                    if (matchDiv && map.current) {
                      map.current.flyTo(matchDiv.center, matchDiv.zoom, { duration: 1.2 });
                    }
                  }}
                >
                  <option value="">{t('সকল বিভাগ', 'All Divisions')}</option>
                  {[...new Set(locations.map((l) => l.division_bn))].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>

              {/* District (জেলা) */}
              <label>
                <span>{t('২. জেলা (District)', '2. District')}</span>
                <select
                  aria-label={t('জেলা', 'District')}
                  value={district}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    setUpazila('');
                    choose(0);
                  }}
                >
                  <option value="">{t('সকল জেলা', 'All Districts')}</option>
                  {[
                    ...new Set(
                      locations
                        .filter((l) => !division || l.division_bn === division)
                        .map((l) => l.district_bn)
                    ),
                  ].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>

              {/* Upazila (উপজেলা) */}
              <label>
                <span>{t('৩. উপজেলা (Upazila)', '3. Upazila')}</span>
                <select
                  aria-label={t('উপজেলা', 'Upazila')}
                  value={upazila}
                  onChange={(e) => {
                    setUpazila(e.target.value);
                    choose(0);
                  }}
                >
                  <option value="">{t('সকল উপজেলা', 'All Upazilas')}</option>
                  {[
                    ...new Set(
                      locations
                        .filter((l) => (!division || l.division_bn === division) && (!district || l.district_bn === district))
                        .map((l) => l.upazila_bn)
                    ),
                  ].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>

              {/* Mouza & JL (মৌজা ও জে.এল.) */}
              <label>
                <span>{t('৪. মৌজা ও জে.এল. (Mouza & JL)', '4. Mouza & JL')}</span>
                <select
                  aria-label={t('মৌজা', 'Mouza')}
                  value={location}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    choose(id);
                    const found = locations.find((l) => l.id === id);
                    if (found && map.current) {
                      map.current.flyTo([Number(found.latitude), Number(found.longitude)], 15, { duration: 1.4 });
                    }
                  }}
                >
                  <option value={0}>{t('মৌজা নির্বাচন করুন', 'Select Mouza')}</option>
                  {locations
                    .filter(
                      (l) =>
                        (!division || l.division_bn === division) &&
                        (!district || l.district_bn === district) &&
                        (!upazila || l.upazila_bn === upazila)
                    )
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {name(l, 'mouza')} (JL {l.jl_no}) · {name(l, 'upazila')}
                      </option>
                    ))}
                </select>
              </label>

              {/* Survey Type & Sheet No */}
              <div className="map-address-grid">
                <label>
                  <span>{t('৫. জরিপ (Survey)', '5. Survey')}</span>
                  <select
                    aria-label={t('জরিপ ধরন', 'Survey Type')}
                    value={surveyType}
                    onChange={(e) => setSurveyType(e.target.value)}
                  >
                    <option value="BS">বিএস (BS)</option>
                    <option value="RS">আরএস (RS)</option>
                    <option value="SA">এসএ (SA)</option>
                    <option value="CS">সিএস (CS)</option>
                    <option value="BDS">বিডিএস (BDS)</option>
                  </select>
                </label>

                <label>
                  <span>{t('৬. শিট নং (Sheet)', '6. Sheet No')}</span>
                  <select
                    aria-label={t('শিট নম্বর', 'Sheet No')}
                    value={sheet}
                    onChange={(e) => setSheet(e.target.value)}
                  >
                    <option value="">{t('সকল শিট', 'All Sheets')}</option>
                    {(sheets.length ? sheets : ['1', '2', '3']).map((s) => (
                      <option key={s} value={s}>
                        {t('শিট', 'Sheet')} {lang === 'bn' ? toBnDigits(s) : s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Dag Search & Fast Autocomplete */}
              <form
                className="map-search-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearch(q);
                  setPage(1);
                  setDagAutocompleteOpen(false);
                }}
              >
                <div className="dag-input-container">
                  <input
                    type="text"
                    placeholder={t('দাগ নং (যেমন ১০১, ১০২)', 'Dag No (e.g. 101, 102)')}
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setDagAutocompleteOpen(true);
                    }}
                    onFocus={() => setDagAutocompleteOpen(true)}
                  />

                  {/* Autocomplete Dropdown */}
                  {dagAutocompleteOpen && dagSuggestions.length > 0 && (
                    <div className="dag-autocomplete-dropdown">
                      {dagSuggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="dag-autocomplete-item"
                          onClick={() => {
                            setSelected(item);
                            setQ(item.dag_no);
                            setSearch(item.dag_no);
                            setDagAutocompleteOpen(false);
                            setMobileTab('map');
                          }}
                        >
                          <strong>
                            {t('দাগ', 'Dag')} {lang === 'bn' ? item.dag_no_bn : item.dag_no}
                          </strong>
                          <span>{item.plot_code}</span>
                          <small>{item.total_area_decimal} {t('শতক', 'dec')}</small>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button className="map-primary" aria-label={t('দাগ খুঁজুন', 'Search parcels')}>
                  <Search size={18} />
                </button>
              </form>
            </div>

            {/* Results Counter */}
            <div className="map-results-header">
              <span>
                {loading ? t('খোঁজা হচ্ছে…', 'Searching…') : `${data?.total || 0} ${t('টি রেকর্ড', 'records')}`}
              </span>
              <span>{loc ? `${name(loc, 'mouza')} · JL ${loc.jl_no}` : t('সমগ্র বাংলাদেশ', 'Bangladesh')}</span>
            </div>

            {/* Plot List */}
            <div className="map-plot-list" aria-busy={loading}>
              {!loading && !data?.plots.length && (
                <p className="map-empty">
                  {t(
                    'এই অনুসন্ধানে রেকর্ড নেই। সঠিক মৌজা/দাগ বাছুন।',
                    'No matching records. Select another mouza or dag.'
                  )}
                </p>
              )}

              {data?.plots.map((p) => {
                const hasRisk = p.is_admin_frozen || p.has_active_lien || p.owner_sale_locked;
                return (
                  <button
                    key={p.id}
                    className={`map-plot-result ${selected?.id === p.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelected(p);
                      setMobileTab('details');
                    }}
                  >
                    <div className="map-row">
                      <strong>
                        {t('দাগ', 'Dag')} {lang === 'bn' ? p.dag_no_bn : p.dag_no}
                      </strong>
                      <div className="map-plot-flags-micro">
                        {p.owner_sale_locked ? (
                          <span className="micro-flag lock" title={t('বিক্রয় লক', 'Sale Lock')}>
                            <Lock size={11} />
                          </span>
                        ) : null}
                        {p.has_active_lien ? (
                          <span className="micro-flag lien" title={t('সক্রিয় লিয়েন', 'Active Lien')}>
                            L
                          </span>
                        ) : null}
                        {p.is_admin_frozen ? (
                          <span className="micro-flag freeze" title={t('প্রশাসনিক স্থগিত', 'Admin Frozen')}>
                            !
                          </span>
                        ) : null}
                        <span className={`map-status-dot ${hasRisk ? 'caution' : ''}`} />
                      </div>
                    </div>
                    <p>{p.plot_code}</p>
                    <div className="map-row">
                      <span>{p.total_area_decimal} {t('শতক', 'decimals')} · {p.land_type_bn}</span>
                      <span>
                        <ArrowRight size={14} />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="map-pagination">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span>
                {page} / {Math.max(1, Math.ceil((data?.total || 0) / 60))}
              </span>
              <button
                disabled={page * 60 >= (data?.total || 0) || loading}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <p className="map-coverage">
              <Info size={14} />
              {locations.length} {t('টি মৌজার ক্যাডাস্ট্রাল ডাটাবেস সংরক্ষিত।', 'mouzas in digital register.')}
            </p>
          </aside>

          {/* COLUMN 2: INTERACTIVE MAP STAGE (Leaflet with Real Bangladesh Map & Overlays) */}
          <section
            className={`map-stage ${mobileTab === 'map' ? 'mobile-visible' : ''}`}
            aria-label={t('ইন্টারঅ্যাকটিভ ক্যাডাস্ট্রাল মানচিত্র', 'Interactive Cadastral Map')}
          >
            <div ref={root} className="map-canvas" />

            {/* Top-Left Floating CAD & Drawing Toolbar (for Admin & Surveyors) */}
            {canDesign && (
              <div className="in-map-cad-toolbar" aria-label="In-Map Drawing Tools">
                <span className="cad-badge-tag">{t('ক্যাড টুলস', 'CAD')}</span>
                <button
                  className="cad-tool-btn"
                  onClick={() => setDesign(true)}
                  title={t('পূর্ণাঙ্গ ক্যাড ড্রয়িং স্টুডিও খুলুন', 'Open Full CAD Drawing Studio')}
                >
                  <PenTool size={13} />
                  <span>{t('নতুন দাগ আঁকুন', 'Draw Plot')}</span>
                </button>
                {user && (
                  <button
                    className="cad-tool-btn"
                    onClick={() => setTaskDrawerOpen(true)}
                    title={t('সার্ভে কাজের দায়িত্ব তালিকা', 'Surveyor Task Queue')}
                  >
                    <CheckSquare size={13} />
                    <span>{t('দায়িত্ব তালিকা', 'Tasks')} ({myTasksCount})</span>
                  </button>
                )}
              </div>
            )}

            {/* Floating Mouza & Jurisdiction Banner */}
            <div className="map-floating-location">
              <span className="map-live-dot" />
              <div>
                <strong>
                  {loc ? `${name(loc, 'mouza')} মৌজা` : t('বাংলাদেশ · জাতীয় মৌজা মানচিত্র', 'Bangladesh Cadastral Map')}
                </strong>
                <small>
                  {loc
                    ? `${name(loc, 'upazila')} · ${name(loc, 'district')} জেলা · JL নং ${loc.jl_no}`
                    : t('মৌজা বা দাগ দেখতে বামপাশের তালিকা ব্যবহার করুন', 'Select a mouza or click on any plot')}
                </small>
              </div>
            </div>

            {/* Right Map Action Toolbar */}
            <div className="map-tool-strip">
              {/* Fit Bounds / Center */}
              <button
                title={t('নির্বাচিত এলাকায় ফিট করুন', 'Fit selected area')}
                aria-label={t('নির্বাচিত এলাকায় ফিট করুন', 'Fit selected area')}
                onClick={() => {
                  if (geometry.current?.getBounds().isValid()) {
                    map.current?.fitBounds(geometry.current.getBounds(), { padding: [30, 30] });
                  } else if (loc) {
                    map.current?.flyTo([Number(loc.latitude), Number(loc.longitude)], 15, { duration: 1.2 });
                  } else {
                    map.current?.flyTo([23.8103, 90.4125], 7, { duration: 1.2 });
                  }
                }}
              >
                <Compass size={18} />
              </button>

              {/* Layer Switcher Button */}
              <button
                className={showLayerMenu ? 'active' : ''}
                title={t('মানচিত্রের লেয়ার নিয়ন্ত্রণ', 'Layers & Overlays')}
                aria-label={t('মানচিত্রের লেয়ার নিয়ন্ত্রণ', 'Layers & Overlays')}
                onClick={() => setShowLayerMenu(!showLayerMenu)}
              >
                <Layers size={18} />
              </button>

              {/* Visual Map Legend Button */}
              <button
                className={showLegend ? 'active' : ''}
                title={t('চিহ্ন ও সীমানা ব্যাখ্যা (Legend)', 'Map Legend')}
                aria-label={t('চিহ্ন ও সীমানা ব্যাখ্যা (Legend)', 'Map Legend')}
                onClick={() => setShowLegend(!showLegend)}
              >
                <Info size={18} />
              </button>

              {/* Cadastral Measure Tool */}
              <button
                className={measuring ? 'active' : ''}
                title={t('দূরত্ব ও শিকল পরিমাপ', 'Measure distance (Chains & Meters)')}
                aria-label={t('দূরত্ব পরিমাপ', 'Measure distance')}
                onClick={() => setMeasuring(!measuring)}
              >
                <Ruler size={18} />
              </button>

              {/* Copy URL Link */}
              <button aria-label={t('লিংক কপি করুন', 'Copy link')} onClick={share} title={t('লিংক কপি করুন', 'Copy link')}>
                <Link2 size={18} />
              </button>

              {/* Print Summary */}
              <button
                aria-label={t('সারাংশ প্রিন্ট', 'Print summary')}
                onClick={() => window.print()}
                title={t('নকশা প্রিন্ট করুন', 'Print map summary')}
              >
                <Printer size={18} />
              </button>
            </div>

            {/* FLOATING BASEMAP SWITCHER (Bottom-Left: Road, Satellite, Carto, Offline, Dark) */}
            <div className="floating-basemap-widget" aria-label="Basemap Selector">
              {(Object.keys(BASEMAP_CONFIGS) as BasemapMode[]).map((mode) => {
                const item = BASEMAP_CONFIGS[mode];
                return (
                  <button
                    key={mode}
                    className={`basemap-opt-btn ${basemapMode === mode ? 'active' : ''}`}
                    onClick={() => setBasemapMode(mode)}
                    title={item.name_en}
                  >
                    <span className="opt-icon">{item.icon}</span>
                    <span>{item.name_bn}</span>
                  </button>
                );
              })}
            </div>

            {/* Layer Switcher Popover / Floating Menu */}
            {showLayerMenu && (
              <div className="map-layer-switcher-panel">
                <div className="map-layer-switcher-header">
                  <h4>{t('মানচিত্র ও লেয়ার সেটিং', 'Map & Layer Settings')}</h4>
                  <button onClick={() => setShowLayerMenu(false)}>
                    <X size={15} />
                  </button>
                </div>

                <div className="map-layer-section-group">
                  <span className="layer-group-title">{t('ভৌগোলিক ও ক্যাডাস্ট্রাল ওভারলে', 'Geographical & Cadastral Overlays')}</span>
                  <label className="layer-check-label">
                    <input
                      type="checkbox"
                      checked={showCadastralParcels}
                      onChange={(e) => setShowCadastralParcels(e.target.checked)}
                    />
                    <span>{t('মৌজা দাগ নকশা ও নম্বর (Plot Parcels & Dag)', 'Plot Parcels & Dag Numbers')}</span>
                  </label>
                  <label className="layer-check-label">
                    <input
                      type="checkbox"
                      checked={showDivisions}
                      onChange={(e) => setShowDivisions(e.target.checked)}
                    />
                    <span>{t('৮টি বিভাগীয় সীমানা (Divisions Outline)', '8 Divisions Outline')}</span>
                  </label>
                  <label className="layer-check-label">
                    <input
                      type="checkbox"
                      checked={showRivers}
                      onChange={(e) => setShowRivers(e.target.checked)}
                    />
                    <span>{t('প্রধান নদ-নদী (Major Rivers of Bangladesh)', 'Major Rivers Network')}</span>
                  </label>
                  <label className="layer-check-label">
                    <input
                      type="checkbox"
                      checked={showRiskOverlay}
                      onChange={(e) => setShowRiskOverlay(e.target.checked)}
                    />
                    <span>{t('আইনি স্থিতি ও ঝুঁকি হাইলাইট (Risk Overlays)', 'Legal Risk Overlays')}</span>
                  </label>
                  <label className="layer-check-label">
                    <input
                      type="checkbox"
                      checked={showMouzaMarkers}
                      onChange={(e) => setShowMouzaMarkers(e.target.checked)}
                    />
                    <span>{t('মৌজা কেন্দ্রবিন্দু (Mouza Centers)', 'Mouza Centers')}</span>
                  </label>
                  <label className="layer-check-label">
                    <input
                      type="checkbox"
                      checked={showOffices}
                      onChange={(e) => setShowOffices(e.target.checked)}
                    />
                    <span>{t('ভূমি সেবা দপ্তরসমূহ (Land Offices)', 'Land Service Offices')}</span>
                  </label>
                </div>
              </div>
            )}

            {/* Collapsible Visual Map Legend */}
            {showLegend && (
              <div className="map-visual-legend">
                <div className="map-legend-header">
                  <h4>{t('মানচিত্রের লেজেন্ড ও ভূমির শ্রেণি', 'Map Legend & Land Use')}</h4>
                  <button onClick={() => setShowLegend(false)} aria-label="Close legend">
                    <X size={14} />
                  </button>
                </div>
                <div className="legend-items-list">
                  <div className="legend-item">
                    <span className="legend-swatch" style={{ background: '#d1fae5', borderColor: '#047857' }} />
                    <span>{t('নাল / কৃষি জমি (Agricultural Land)', 'Agricultural (Nal)')}</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-swatch" style={{ background: '#fef3c7', borderColor: '#b45309' }} />
                    <span>{t('ভিটা / বাড়ি (Homestead / Residential)', 'Residential (Vita)')}</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-swatch" style={{ background: '#cffafe', borderColor: '#0284c7' }} />
                    <span>{t('পুকুর / জলাশয় (Waterbody / Pond)', 'Waterbody (Pond)')}</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-swatch" style={{ background: '#ecfccb', borderColor: '#4d7c0f' }} />
                    <span>{t('বাগান / বৃক্ষরাজি (Orchard)', 'Orchard / Bagan')}</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-swatch" style={{ background: '#fef3c7', borderColor: '#d97706' }} />
                    <span>{t('ব্যাংক লিয়েন / সতর্কতা (Active Bank Lien)', 'Active Bank Lien')}</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-swatch" style={{ background: '#fee2e2', borderColor: '#dc2626' }} />
                    <span>{t('স্থগিত / বিরোধপূর্ণ দাগ (Disputed / Frozen)', 'Disputed / Frozen')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Measurement Results HUD */}
            {measuring && (
              <div className="map-measure-hud">
                <div className="measure-hud-header">
                  <strong>{t('ক্যাডাস্ট্রাল শিকল ও দূরত্ব পরিমাপ', 'Cadastral Chain & Distance Measurement')}</strong>
                  <button onClick={() => setPoints([])} className="measure-clear-btn">
                    {t('পয়েন্ট মুছুন', 'Clear')}
                  </button>
                </div>
                <div className="measure-hud-stats">
                  <div className="measure-stat">
                    <span>{measureDistanceMeters.toFixed(2)} m</span>
                    <small>{t('মিটার', 'Meters')}</small>
                  </div>
                  <div className="measure-stat">
                    <span>{measureDistanceFeet.toFixed(1)} ft</span>
                    <small>{t('ফুট', 'Feet')}</small>
                  </div>
                  <div className="measure-stat highlight">
                    <span>{measureDistanceChains.toFixed(2)} {t('শিকল', 'Chains')}</span>
                    <small>{t('গুন্টার শিকল (৬৬ ফুট)', 'Gunter Chain')}</small>
                  </div>
                </div>
                <p className="measure-hint">
                  {t('মানচিত্রে ক্লিক করে পরিমাপের বিন্দু নির্ধারণ করুন (সর্বোচ্চ ১৬ পয়েন্ট)।', 'Click on map to measure lines.')}
                </p>
              </div>
            )}

            {/* Real-time GPS & Cadastral Scale HUD */}
            <div className="map-hud-readout" aria-live="polite">
              <div className="hud-readout-section">
                <span className="hud-label">{t('অক্ষাংশ:', 'Lat:')}</span>
                <span className="hud-value">{cursorCoords?.lat || '23.858000'}° N</span>
              </div>
              <div className="hud-readout-section">
                <span className="hud-label">{t('দ্রাঘিমাংশ:', 'Lng:')}</span>
                <span className="hud-value">{cursorCoords?.lng || '90.318000'}° E</span>
              </div>
              <div className="hud-readout-section">
                <span className="hud-label">{t('জুম:', 'Zoom:')}</span>
                <span className="hud-value">{cursorCoords?.zoom || 15}</span>
              </div>
              <button
                className={`hud-copy-btn ${copiedCoords ? 'copied' : ''}`}
                onClick={copyCoordinates}
                title={t('স্থানাঙ্ক কপি করুন', 'Copy coordinates')}
              >
                {copiedCoords ? <Check size={12} /> : <SlidersHorizontal size={12} />}
                <span>{copiedCoords ? t('কপি হয়েছে', 'Copied') : t('কপি', 'Copy')}</span>
              </button>
            </div>

            {/* 1-Click Plot Summary Bottom-Sheet Drawer Peeking Over Map */}
            {selected && (
              <div className="absolute bottom-14 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-[#006A4E]/30 p-4 z-[999] animate-rise space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#006A4E] text-white font-mono font-bold text-xs shadow-xs">
                      {t('দাগ নং', 'Dag')} {lang === 'bn' ? selected.dag_no_bn : selected.dag_no}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {loc ? name(loc, 'mouza') : 'বিরুলিয়া'} · {selected.land_type_bn}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                    aria-label="Close bottom sheet"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Status Traffic Light Pill */}
                <div className="flex items-center justify-between text-xs">
                  <div>
                    {selected.is_admin_frozen || selected.owner_sale_locked ? (
                      <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-300">
                        <ShieldAlert size={13} className="text-rose-600" />
                        <span>{t('স্থগিত / বিক্রয় লক দাগ', 'Admin Frozen / Locked')}</span>
                      </span>
                    ) : selected.has_active_lien ? (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-300">
                        <AlertTriangle size={13} className="text-amber-600" />
                        <span>{t('ব্যাংক লিয়েন সক্রিয়', 'Active Bank Lien')}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-300">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <span>{t('নিরাপদ ও নামজারিযোগ্য', 'Clean & Safe Record')}</span>
                      </span>
                    )}
                  </div>
                  {selectedAreaCalculations && (
                    <span className="font-bold text-slate-800">
                      {selectedAreaCalculations.decimals} {t('শতক', 'Dec')} ({selectedAreaCalculations.katha} {t('কাঠা', 'Katha')})
                    </span>
                  )}
                </div>

                {/* 1-Click Action Buttons for Immediate Deep Discovery */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      sessionStorage.setItem('bs_pending_check_search', selected.dag_no);
                      navigate(`check?q=${encodeURIComponent(selected.dag_no)}`);
                    }}
                    className="px-3 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <span>{t('ভূমি স্বাস্থ্য পরীক্ষা', 'Check Before Buy')}</span>
                    <ArrowRight size={13} />
                  </button>
                  <button
                    onClick={() => {
                      sessionStorage.setItem('bs_pending_verify_search', `DL-2026-${selected.dag_no}`);
                      navigate(`verify?code=${encodeURIComponent(selected.dag_no)}`);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>{t('দলিল যাচাই', 'Verify Deed')}</span>
                    <ExternalLink size={13} />
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* COLUMN 3: PLOT & MOUZA DETAILS PANEL (দাগের বিস্তারিত বিবরণী) */}
          <aside className={`map-detail-panel ${mobileTab === 'details' ? 'mobile-visible' : ''}`}>
            <div className="map-panel-heading" style={{ background: '#f8fafc', borderBottomColor: '#e2e8f0' }}>
              <Layers size={18} style={{ color: '#047857' }} />
              <h2>{selected ? t('দাগের বিস্তারিত বিবরণী', 'Parcel Information') : t('মৌজা সারসংক্ষেপ', 'Mouza Overview')}</h2>
            </div>

            {selected ? (
              <div className="map-selected-plot-card">
                {/* Header Badge */}
                <div className="selected-plot-header">
                  <div>
                    <span className="selected-dag-badge">
                      {t('দাগ নং', 'Dag No')} {lang === 'bn' ? selected.dag_no_bn : selected.dag_no}
                    </span>
                    <p className="selected-plot-code">{selected.plot_code}</p>
                  </div>
                  <button
                    className="close-plot-btn"
                    onClick={() => setSelected(null)}
                    aria-label="Deselect plot"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Legal Protection & Risk Status */}
                <div className="plot-security-status">
                  {selected.is_admin_frozen ? (
                    <div className="security-banner danger">
                      <ShieldAlert size={16} />
                      <div>
                        <strong>{t('প্রশাসনিক স্থগিতাদেশ বলবৎ', 'Administrative Order Active')}</strong>
                        <small>{t('এই দাগের যে কোনো ধরনের নামজারি বা হস্তান্তর স্থগিত আছে।', 'Mutation & transfer restricted.')}</small>
                      </div>
                    </div>
                  ) : selected.has_active_lien ? (
                    <div className="security-banner warning">
                      <AlertTriangle size={16} />
                      <div>
                        <strong>{t('ব্যাংক বন্ধক / লিয়েন সক্রিয়', 'Active Bank Lien / Mortgage')}</strong>
                        <small>{t('এনওসি ব্যতীত এই জমি বিক্রয় বা হস্তান্তরযোগ্য নয়।', 'Lien release required before transfer.')}</small>
                      </div>
                    </div>
                  ) : selected.owner_sale_locked ? (
                    <div className="security-banner caution">
                      <Lock size={16} />
                      <div>
                        <strong>{t('মালিক কর্তৃক বিক্রয় লক সক্রিয়', 'Owner Sale Lock Active')}</strong>
                        <small>{t('মালিকের ডিজিটাল অনুমতি ছাড়া সাব-রেজিস্ট্রিতে নিবন্ধন হবে না।', 'Owner unlocked consent required.')}</small>
                      </div>
                    </div>
                  ) : (
                    <div className="security-banner success">
                      <CheckCircle2 size={16} />
                      <div>
                        <strong>{t('রেকর্ড বৈধ ও বিরোধমুক্ত', 'Clean Legal Record')}</strong>
                        <small>{t('কোনো দেওয়ানি নিষেধাজ্ঞা বা ব্যাংক দায় নেই।', 'No adverse claims or court stay orders.')}</small>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cadastral Units Multi-Conversion */}
                {selectedAreaCalculations && (
                  <div className="cadastral-area-grid">
                    <div className="cadastral-area-cell highlight">
                      <span className="area-number">{selectedAreaCalculations.decimals}</span>
                      <span className="area-unit">{t('শতাংশ / শতক', 'Decimals')}</span>
                    </div>
                    <div className="cadastral-area-cell">
                      <span className="area-number">{selectedAreaCalculations.katha}</span>
                      <span className="area-unit">{t('কাঠা', 'Katha')}</span>
                    </div>
                    <div className="cadastral-area-cell">
                      <span className="area-number">{selectedAreaCalculations.bigha}</span>
                      <span className="area-unit">{t('বিঘা', 'Bigha')}</span>
                    </div>
                    <div className="cadastral-area-cell">
                      <span className="area-number">{selectedAreaCalculations.acres}</span>
                      <span className="area-unit">{t('একর', 'Acres')}</span>
                    </div>
                    <div className="cadastral-area-cell">
                      <span className="area-number">{selectedAreaCalculations.sqft}</span>
                      <span className="area-unit">{t('বর্গফুট', 'Sq. Feet')}</span>
                    </div>
                    <div className="cadastral-area-cell">
                      <span className="area-number">{selectedAreaCalculations.sqm}</span>
                      <span className="area-unit">{t('বর্গমিটার', 'Sq. Meters')}</span>
                    </div>
                  </div>
                )}

                {/* Metadata Field List */}
                <div className="plot-metadata-fields">
                  <div className="metadata-row">
                    <span>{t('জমির শ্রেণি', 'Land Class')}</span>
                    <strong>{selected.land_type_bn}</strong>
                  </div>
                  <div className="metadata-row">
                    <span>{t('মৌজা ও জে.এল.', 'Mouza & JL')}</span>
                    <strong>{loc ? `${name(loc, 'mouza')} (JL ${loc.jl_no})` : 'বিরুলিয়া (১২)'}</strong>
                  </div>
                  <div className="metadata-row">
                    <span>{t('উপজেলা ও জেলা', 'Upazila & District')}</span>
                    <strong>{loc ? `${name(loc, 'upazila')}, ${name(loc, 'district')}` : 'সাভার, ঢাকা'}</strong>
                  </div>
                  <div className="metadata-row">
                    <span>{t('জরিপ ও শিট', 'Survey & Sheet')}</span>
                    <strong>{surveyType} জরিপ · শিট নং {sheet || '১'}</strong>
                  </div>
                </div>

                {/* Quick Action Navigation Buttons */}
                <div className="plot-actions-cluster">
                  <button
                    className="map-primary map-wide"
                    onClick={() => navigate(`check?q=${encodeURIComponent(selected.plot_code)}`)}
                  >
                    <span>{t('ভূমি স্বাস্থ্য পাসপোর্ট ও খতিয়ান', 'Land Passport & Khatian')}</span>
                    <ArrowRight size={15} />
                  </button>

                  <div className="plot-secondary-actions">
                    <button
                      className="map-secondary"
                      onClick={() => navigate(`vault?plot=${selected.id}`)}
                    >
                      <span>{t('দলিল ভল্ট', 'Doc Vault')}</span>
                    </button>
                    <button
                      className="map-secondary"
                      onClick={() => window.print()}
                    >
                      <Printer size={14} />
                      <span>{t('প্রিন্ট', 'Print')}</span>
                    </button>
                    <button
                      className="map-secondary"
                      onClick={share}
                    >
                      <Link2 size={14} />
                      <span>{t('শেয়ার', 'Share')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Mouza Overview when no single plot is selected */
              <div className="mouza-summary-container">
                <div className="mouza-profile-box">
                  <h3>{loc ? name(loc, 'mouza') : t('বিরুলিয়া মৌজা', 'Birulia Mouza')}</h3>
                  <p>
                    {loc
                      ? `${name(loc, 'upazila')}, ${name(loc, 'district')} · JL নং ${loc.jl_no}`
                      : 'সাভার, ঢাকা · JL নং ১২'}
                  </p>
                  <div className="mouza-stat-pills">
                    <span>{data?.total || 60} {t('টি দাগ রেকর্ড', 'Plots')}</span>
                    <span>{surveyType} {t('জরিপ নকশা', 'Cadastral Survey')}</span>
                    <span>{t('অফলাইন ও অনলাইন সিঙ্কড', 'Synced')}</span>
                  </div>
                </div>

                {/* Available Mouza Layers */}
                <div className="map-layer-section">
                  <h3>
                    <Layers size={16} />
                    {t('ডিজিটাল মৌজা নকশা লেয়ার', 'Mouza Map Layers')}
                  </h3>

                  {!datasets.length && (
                    <p className="map-empty" style={{ fontSize: '12px' }}>
                      {t('এই মৌজার অনুমোদিত ভেক্টর নকশা লোড করা হয়েছে।', 'Vector cadastral features loaded.')}
                    </p>
                  )}

                  {datasets.map((d) => (
                    <button
                      key={d.id}
                      className={`map-layer-item ${activeDataset?.id === d.id ? 'selected' : ''}`}
                      onClick={() => openDataset(d)}
                    >
                      <Layers size={16} />
                      <span>
                        <strong>{d.title}</strong>
                        <small>
                          {d.feature_count} feature · {d.observed_at}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>

                {/* Area Land Offices */}
                <div className="map-office-section">
                  <h3>
                    <Building2 size={16} />
                    {t('সংশ্লিষ্ট ভূমি সেবা দপ্তর', 'Area Land Offices')}
                  </h3>
                  {(loc ? compatibleOffices : []).slice(0, 3).map((o) => (
                    <p key={o.id}>{name(o, 'name')}</p>
                  ))}
                  <button
                    className="map-secondary map-wide"
                    onClick={() =>
                      navigate(`offices${loc ? `?area=${encodeURIComponent(loc.upazila_bn)}` : ''}`)
                    }
                  >
                    <span>{t('অফিসের বিস্তারিত ও সাক্ষাত', 'Office details & appointments')}</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Mobile Bottom Responsive Tab Bar */}
        <div className="map-mobile-nav-bar" role="navigation" aria-label="Mobile Navigation">
          <button
            className={`map-mobile-tab-btn ${mobileTab === 'search' ? 'active' : ''}`}
            onClick={() => setMobileTab('search')}
          >
            <Search size={18} />
            <span>{t('অনুসন্ধান', 'Search')}</span>
          </button>

          <button
            className={`map-mobile-tab-btn ${mobileTab === 'map' ? 'active' : ''}`}
            onClick={() => setMobileTab('map')}
          >
            <Compass size={18} />
            <span>{t('মানচিত্র', 'Map')}</span>
          </button>

          <button
            className={`map-mobile-tab-btn ${mobileTab === 'details' ? 'active' : ''}`}
            onClick={() => setMobileTab('details')}
          >
            <Layers size={18} />
            <span>{t('তথ্য', 'Details')}</span>
          </button>

          {user && (
            <button
              className={`map-mobile-tab-btn ${mobileTab === 'tasks' ? 'active' : ''}`}
              onClick={() => setTaskDrawerOpen(true)}
            >
              <CheckSquare size={18} />
              <span>{t('দায়িত্ব', 'Tasks')}</span>
              {myTasksCount > 0 && <span className="mobile-task-count">{myTasksCount}</span>}
            </button>
          )}
        </div>

        {/* Official Sources Panel */}
        <details className="source-panel">
          <summary>{t('সরকারি ম্যাপ প্রাপ্তি ও জরিপের তথ্য', 'Official map availability & survey information')}</summary>
          <SourceCards kind="MAP" locationId={location} />
        </details>

        {/* Workspace Footer */}
        <footer className="map-workspace-footer">
          <span>
            <ShieldAlert size={14} />
            {t(
              'BhumiShield স্বাধীন ডিজিটাল প্রোটোটাইপ। অনলাইন নকশা দেখা চূড়ান্ত মালিকানার সনদ নয়।',
              'Independent prototype. Viewing a cadastral map is not proof of legal title.'
            )}
          </span>
          <span>
            {t(
              'বাংলাদেশ ডিজিটাল জরিপ ও মৌজা ম্যাপ পোর্টাল (map.land.gov.bd সংস্করণ)',
              'Bangladesh Digital Cadastral Survey & Mouza Map Portal (map.land.gov.bd Edition)'
            )}
          </span>
        </footer>
      </div>
    </div>
  );
};
