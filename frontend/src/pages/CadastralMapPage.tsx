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
  Share2,
  Copy,
  Sparkles,
  ChevronDown,
  Navigation,
  Plus,
  Minus,
  Globe2,
  FileCheck2,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

export type BasemapMode = 'satellite' | 'carto' | 'osm' | 'dark' | 'offline_grid';

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
  satellite: {
    name_bn: 'স্যাটেলাইট চিত্র',
    name_en: 'Satellite',
    icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: '&copy; Esri & Earthstar Geographics',
  },
  carto: {
    name_bn: 'সরকারি মানচিত্র',
    name_en: 'Gov Carto',
    icon: '🏛️',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 20,
    attribution: '&copy; CARTO &copy; OpenStreetMap',
  },
  osm: {
    name_bn: 'রোড ম্যাপ',
    name_en: 'Road Map',
    icon: '🗺️',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SAFE' | 'LOCKED' | 'DISPUTED'>('ALL');

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

  // DEFAULT BASEMAP IS NOW SATELLITE (satellite by default!)
  const [basemapMode, setBasemapMode] = useState<BasemapMode>('satellite');

  // Collapsible Search Dock
  const [searchDockOpen, setSearchDockOpen] = useState(true);

  // Overlay Toggles
  const [showDivisions, setShowDivisions] = useState(true);
  const [showRivers, setShowRivers] = useState(true);
  const [showCadastralParcels, setShowCadastralParcels] = useState(true);
  const [showMouzaMarkers, setShowMouzaMarkers] = useState(true);
  const [showOffices, setShowOffices] = useState(true);
  const [showRiskOverlay, setShowRiskOverlay] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Real-time HUD Coordinates Readout
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [copiedCoords, setCopiedCoords] = useState(false);

  // Task Assignment Drawer
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [myTasksCount, setMyTasksCount] = useState(0);

  // Mobile Bottom Sheet toggle
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

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

  const autoFocusedRef = useRef(false);

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
        if (!autoFocusedRef.current && initial.get('focus') === '1' && Array.isArray(res.plots) && res.plots.length > 0) {
          autoFocusedRef.current = true;
          const qNorm = normalizeBnDigits(search.trim());
          const match =
            res.plots.find((p) => normalizeBnDigits(String(p.dag_no)) === qNorm) ||
            res.plots[0];
          if (match) {
            setSelected(match);
            const cadList = ALL_MOUZA_CADASTRAL_PLOTS[Number(match.location_id)] || [];
            const cad = cadList.find((c) => String(c.dag_no) === String(match.dag_no));
            if (cad && map.current) {
              const polyBounds = L.polygon(cad.coordinates).getBounds();
              if (polyBounds.isValid()) {
                map.current.flyToBounds(polyBounds, { padding: [48, 48], maxZoom: 18, duration: 0.9 });
              }
            } else {
              const matchLoc = res.locations?.find((l) => Number(l.id) === Number(match.location_id));
              if (matchLoc && Number(matchLoc.latitude) && Number(matchLoc.longitude) && map.current) {
                map.current.flyTo([Number(matchLoc.latitude), Number(matchLoc.longitude)], 17, { duration: 0.9 });
              }
            }
          }
        }
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

  // Initialize Leaflet Map (Edge-to-Edge full background)
  useEffect(() => {
    if (!root.current || map.current) return;

    const startCenter: L.LatLngTuple =
      initialLat && initialLng
        ? [initialLat, initialLng]
        : loc
        ? [Number(loc.latitude), Number(loc.longitude)]
        : [23.858, 90.318]; // Birulia / Savar
    const startZoom = initialLat && initialLng ? 16 : loc ? 15 : 14;

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

  // Update Basemap Tiles (Default Satellite)
  useEffect(() => {
    const m = map.current;
    if (!m) return;

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

    if (showDivisions) {
      BANGLADESH_DIVISIONS.forEach((div) => {
        const isSelectedDivision = division === div.name_bn;

        const poly = L.polygon(div.polygon, {
          color: isSelectedDivision ? '#10b981' : div.color,
          weight: isSelectedDivision ? 3 : 1.5,
          opacity: 0.85,
          fillColor: div.color,
          fillOpacity: isSelectedDivision ? 0.25 : 0.08,
          dashArray: isSelectedDivision ? undefined : '5, 5',
        });

        poly.bindTooltip(
          `<strong>${div.name_bn} বিভাগ (${div.name_en})</strong><br/>` +
            `সদর দপ্তর: ${div.headquarters_bn}<br/>` +
            `জেলা: ${div.districts_count}টি · উপজেলা: ${div.upazilas_count}টি`,
          { sticky: true }
        );

        poly.on('click', () => {
          setDivision(div.name_bn);
          setDistrict('');
          setUpazila('');
          m.flyTo(div.center, div.zoom, { duration: 1.2 });
        });

        poly.addTo(divisionsLayer.current!);

        const labelIcon = L.divIcon({
          className: 'division-label-marker',
          html: `<span>${div.name_bn} বিভাগ</span>`,
          iconSize: [80, 24],
          iconAnchor: [40, 12],
        });
        L.marker(div.center, { icon: labelIcon, interactive: false }).addTo(divisionsLayer.current!);
      });
    }

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

  // Render Authentic Cadastral Mouza Plots
  useEffect(() => {
    const m = map.current;
    if (!m || !cadastralPlotsLayer.current) return;

    cadastralPlotsLayer.current.clearLayers();
    if (!showCadastralParcels) return;

    const plots = ALL_MOUZA_CADASTRAL_PLOTS[location] || [];

    plots.forEach((p) => {
      const isSelected = selected && (selected.dag_no === p.dag_no || selected.id === Number(p.dag_no));

      // Strict Traffic-Light Plot Boundary Colors:
      const strokeColor = p.color === '#7c3aed' ? '#dc2626' : p.color;
      const plotFill = p.fillColor === '#8b5cf6' || p.fillColor === '#ede9fe' ? '#fee2e2' : p.fillColor;

      const poly = L.polygon(p.coordinates, {
        color: isSelected ? '#f59e0b' : strokeColor,
        weight: isSelected ? 3.5 : 2,
        fillColor: isSelected ? '#f59e0b' : plotFill,
        fillOpacity: isSelected ? 0.6 : 0.35,
      });

      poly.bindTooltip(
        `<strong>দাগ নং ${p.dag_no_bn}</strong> · ${p.area_decimal} শতক<br/>` +
          `খতিয়ান: ${p.khatian_no} · শ্রেণি: ${p.land_type_bn}<br/>` +
          `জরিপ: ${p.survey_type} · শিট: ${p.sheet_no}`,
        { sticky: true }
      );

      poly.on('click', () => {
        const found = data?.plots.find(
          (item) => item.dag_no === p.dag_no || normalizeBnDigits(item.dag_no) === p.dag_no
        );
        if (found) {
          setSelected(found);
        } else {
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
        setMobileDetailsOpen(true);
      });

      poly.addTo(cadastralPlotsLayer.current!);

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
                  color: '#10b981',
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
      .catch(() => {});

    return () => {
      live = false;
    };
  }, [location, revision]);

  // Update Mouza Reference Markers & Service Offices
  useEffect(() => {
    if (!map.current || !markers.current || !officeMarkers.current || !data) return;

    markers.current.clearLayers();
    officeMarkers.current.clearLayers();

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
          fillColor: '#10b981',
          fillOpacity: 0.95,
        }).addTo(markers.current!);

        marker.bindTooltip(
          `📍 <strong>${name(l, 'mouza')} মৌজা</strong><br/>` +
            `${name(l, 'upazila')}, ${name(l, 'district')}<br/>` +
            `JL নং: ${l.jl_no}`,
          { direction: 'top', offset: [0, -6] }
        );

        marker.on('click', () => {
          setLocation(l.id);
          setPage(1);
          map.current?.flyTo([Number(l.latitude), Number(l.longitude)], 15, { duration: 1.2 });
        });
      });
    }

    if (showOffices && Array.isArray(data.offices)) {
      data.offices.forEach((o) => {
        if (!o.latitude || !o.longitude) return;
        const officeIcon = L.divIcon({
          className: 'map-office-marker-pin',
          html: `<div class="office-pin-inner ${o.office_type}">🏛️</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
        const marker = L.marker([Number(o.latitude), Number(o.longitude)], {
          icon: officeIcon,
        }).addTo(officeMarkers.current!);

        marker.bindTooltip(
          `🏢 <strong>${name(o, 'name')}</strong><br/>` +
            `<small>${o.office_type.toUpperCase()} · ${name(o, 'upazila')}</small><br/>` +
            `${o.contact_phone ? `📞 ${o.contact_phone}` : ''}`,
          { direction: 'top', offset: [0, -10] }
        );
      });
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
          setMobileDetailsOpen(true);
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

        let strokeColor = '#087f5b';
        let fillColor = activeDataset?.layer_kind === 'zoning' ? '#fbbf24' : '#34d399';
        let fillOpacity = 0.2;

        if (showRiskOverlay && linkedPlot) {
          if (linkedPlot.is_admin_frozen || linkedPlot.owner_sale_locked) {
            strokeColor = '#dc2626';
            fillColor = '#ef4444';
            fillOpacity = 0.35;
          } else if (linkedPlot.has_active_lien) {
            strokeColor = '#d97706';
            fillColor = '#f59e0b';
            fillOpacity = 0.35;
          }
        }

        if (isSel) {
          strokeColor = '#b45309';
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
            setMobileDetailsOpen(true);
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
      L.polyline(points, { color: '#f59e0b', weight: 3, dashArray: '6 5' }).addTo(group);
      points.forEach((p) => L.circleMarker(p, { radius: 4, color: '#f59e0b' }).addTo(group));
    }
  }, [points]);

  const measureDistanceMeters = points.reduce(
    (sum, p, i) => (i ? sum + p.distanceTo(points[i - 1]) : 0),
    0
  );
  const measureDistanceFeet = measureDistanceMeters * 3.28084;
  const measureDistanceChains = measureDistanceMeters / CADASTRAL_CONSTANTS.CHAIN_TO_METERS;

  // Toggle Measurement Mode
  const toggleMeasurement = () => {
    const next = !measuring;
    setMeasuring(next);
    measureEnabled.current = next;
    if (!next) {
      setPoints([]);
    }
  };

  const copyCoordinates = () => {
    if (!cursorCoords) return;
    const text = `${cursorCoords.lat}, ${cursorCoords.lng}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setToast(t(`স্থানাঙ্ক কপি হয়েছে: ${text}`, `Coordinates copied: ${text}`));
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const handleNavigateToTask = (
    lat: number,
    lng: number,
    targetLocId: number,
    targetPlotId?: number | null
  ) => {
    setLocation(targetLocId);
    if (map.current) {
      map.current.flyTo([lat, lng], 17, { duration: 1.5 });
    }
    if (targetPlotId && data?.plots) {
      const found = data.plots.find((p) => p.id === targetPlotId);
      if (found) {
        setSelected(found);
        setMobileDetailsOpen(true);
      }
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
    setStatusFilter('ALL');
    setQ('');
    setSearch('');
    setSelected(null);
    setPage(1);
    if (map.current) map.current.flyTo([23.858, 90.318], 15, { duration: 1.2 });
  };

  const filteredPlotsList = useMemo(() => {
    if (!data?.plots) return [];
    if (statusFilter === 'SAFE') {
      return data.plots.filter((p) => !p.is_admin_frozen && !p.has_active_lien && !p.owner_sale_locked);
    }
    if (statusFilter === 'LOCKED') {
      return data.plots.filter((p) => Boolean(p.owner_sale_locked));
    }
    if (statusFilter === 'DISPUTED') {
      return data.plots.filter((p) => Boolean(p.is_admin_frozen || p.has_active_lien));
    }
    return data.plots;
  }, [data?.plots, statusFilter]);

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
    <div
      className={`relative w-full h-[calc(100vh-4.25rem)] overflow-hidden font-sans select-none bg-slate-950 ${
        isFullScreen ? 'fixed inset-0 z-50 h-screen' : ''
      }`}
    >
      {/* 1. FULL BACKGROUND LEAFLET MAP CANVAS (SATELLITE VIEW BY DEFAULT) */}
      <div
        ref={root}
        className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing"
        style={{ background: '#03140e' }}
      />

      {/* Vector Drawing Modal */}
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

      {/* Task Assignment Drawer */}
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

      {/* Admin Data Manager */}
      <Dialog open={manage} onOpenChange={setManage}>
        <DialogContent className="max-w-4xl p-6">
          <DialogHeader>
            <DialogTitle>{t('মৌজা ম্যাপ ডাটা ও লেয়ার ম্যানেজার', 'Mouza Map Data Manager')}</DialogTitle>
            <DialogDescription>
              {t('ক্যাডাস্ট্রাল জিওজেসন ফাইল আপলোড ও নিয়ন্ত্রণ করুন', 'Upload and configure GeoJSON cadastral layers')}
            </DialogDescription>
          </DialogHeader>
          {admin && (
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
        </DialogContent>
      </Dialog>

      {/* 2. TOP FLOATING BRAND & NAVIGATION BAR (Glassmorphic Card) */}
      <div className="absolute top-3 inset-x-3 sm:inset-x-4 z-20 pointer-events-none flex flex-wrap items-center justify-between gap-2">
        {/* Left Brand Badge */}
        <div className="pointer-events-auto flex items-center gap-2">
          <Card className="bg-background/85 backdrop-blur-md border border-border/80 shadow-lg px-3 py-1.5 rounded-2xl flex items-center gap-2.5">
            <div className="size-7 rounded-xl bg-[#006A4E] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              ভূ
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-tight text-foreground flex items-center gap-1.5">
                {t('বাংলাদেশ ডিজিটাল মৌজা নকশা ও খতিয়ান ম্যাপ', 'National Digital Mouza Map')}
                <Badge variant="outline" className="text-[9px] font-mono border-emerald-400 text-emerald-700 bg-emerald-500/10 py-0 px-1">
                  v2.6
                </Badge>
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                {loc
                  ? `${name(loc, 'mouza')} মৌজা · ${name(loc, 'upazila')} · ${name(loc, 'district')} · JL নং ${loc.jl_no}`
                  : t('সমগ্র বাংলাদেশ ক্যাডাস্ট্রাল নেটওয়ার্ক', 'All Bangladesh Cadastral Network')}
              </span>
            </div>
          </Card>
        </div>

        {/* Center / Division Quick Jump Selector */}
        <div className="pointer-events-auto hidden md:flex items-center gap-1 bg-background/80 backdrop-blur-md border border-border/70 p-1 rounded-2xl shadow-lg">
          <Button
            variant={!division ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setDivision('');
              setDistrict('');
              setUpazila('');
              if (map.current) map.current.flyTo([23.8103, 90.4125], 7, { duration: 1.2 });
            }}
            className={`h-7 px-2.5 rounded-xl text-[11px] font-bold ${
              !division ? 'bg-[#006A4E] text-white hover:bg-[#00553e]' : 'text-muted-foreground'
            }`}
          >
            {t('সমগ্র দেশ', 'All BD')}
          </Button>

          {BANGLADESH_DIVISIONS.map((div) => (
            <Button
              key={div.id}
              variant={division === div.name_bn ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setDivision(div.name_bn);
                setDistrict('');
                setUpazila('');
                if (map.current) map.current.flyTo(div.center, div.zoom, { duration: 1.2 });
              }}
              className={`h-7 px-2.5 rounded-xl text-[11px] font-bold ${
                division === div.name_bn
                  ? 'bg-[#006A4E] text-white hover:bg-[#00553e]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {div.name_bn}
            </Button>
          ))}
        </div>

        {/* Right Action Icons Group */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {/* Surveyor Tasks Queue Button */}
          {user && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTaskDrawerOpen(true)}
              className="h-8 gap-1.5 text-xs font-bold rounded-xl bg-background/85 backdrop-blur-md border-border/80 shadow-md hover:bg-background"
            >
              <CheckSquare className="size-3.5 text-emerald-600" />
              <span className="hidden sm:inline">{t('কাজের দায়িত্ব', 'Tasks')}</span>
              {myTasksCount > 0 && (
                <span className="size-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {myTasksCount}
                </span>
              )}
            </Button>
          )}

          {/* CAD Vector Drawing Studio Button (for Surveyors / Officers) */}
          {canDesign && (
            <Button
              size="sm"
              onClick={() => setDesign(true)}
              className="h-8 gap-1.5 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-md cursor-pointer"
            >
              <PenTool className="size-3.5" />
              <span className="hidden sm:inline">{t('ম্যাপ ড্রয়িং', 'CAD Studio')}</span>
            </Button>
          )}

          {/* Official map.land.gov.bd external link */}
          <a
            href="https://map.land.gov.bd/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xl text-xs font-bold bg-background/85 backdrop-blur-md border border-border/80 text-foreground shadow-md hover:bg-background"
          >
            <ExternalLink className="size-3.5 text-emerald-600" />
            <span className="hidden sm:inline">map.land.gov.bd</span>
          </a>

          {/* Admin Data Manager */}
          {admin && (
            <Button
              variant={manage ? 'default' : 'outline'}
              size="sm"
              onClick={() => setManage(!manage)}
              className="h-8 px-2.5 rounded-xl text-xs font-bold bg-background/85 backdrop-blur-md border-border/80 shadow-md"
            >
              <Database className="size-3.5 text-emerald-600" />
            </Button>
          )}

          {/* Fullscreen Toggle Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="h-8 px-2.5 rounded-xl bg-background/85 backdrop-blur-md border-border/80 text-foreground shadow-md"
          >
            {isFullScreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </Button>
        </div>
      </div>

      {/* 3. LEFT FLOATING CASCADING SEARCH & HIERARCHY DOCK */}
      <div className="absolute top-16 left-3 sm:left-4 bottom-14 z-20 w-80 sm:w-92 flex flex-col pointer-events-none">
        {/* Toggle Dock Button when closed */}
        {!searchDockOpen && (
          <Button
            onClick={() => setSearchDockOpen(true)}
            className="pointer-events-auto self-start h-10 px-3.5 rounded-2xl bg-background/90 backdrop-blur-md border border-border/80 text-foreground font-bold text-xs shadow-xl hover:bg-background flex items-center gap-2"
          >
            <Search className="size-4 text-emerald-600" />
            <span>{t('মৌজা ও দাগ অনুসন্ধান', 'Search & Plots')}</span>
            <ChevronRight className="size-3.5 text-muted-foreground" />
          </Button>
        )}

        {/* Full Search Dock when open */}
        {searchDockOpen && (
          <Card className="pointer-events-auto bg-card/90 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-left-4 duration-200">
            {/* Dock Header */}
            <CardHeader className="p-3.5 pb-2.5 border-b border-border/60 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-lg bg-[#006A4E]/15 text-[#006A4E] flex items-center justify-center font-bold text-xs">
                    <Search className="size-3.5" />
                  </div>
                  <CardTitle className="text-xs font-extrabold text-foreground">
                    {t('মৌজা ও দাগ অনুসন্ধান', 'Mouza & Plot Search')}
                  </CardTitle>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    title={t('ফিল্টার রিসেট করুন', 'Reset Filters')}
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="size-3 mr-1" />
                    <span>{t('রিসেট', 'Reset')}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchDockOpen(false)}
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Scrollable Dock Content */}
            <CardContent className="p-3.5 overflow-y-auto space-y-3 flex-1 text-xs">
              {/* 4-Tier Cascading Jurisdiction Selectors */}
              <div className="grid grid-cols-2 gap-2">
                {/* Division */}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                    {t('বিভাগ', 'Division')}
                  </label>
                  <Select
                    value={division || 'ALL'}
                    onValueChange={(val) => {
                      const sel = val === 'ALL' ? '' : val;
                      setDivision(sel);
                      setDistrict('');
                      setUpazila('');
                      if (sel && map.current) {
                        const targetDiv = BANGLADESH_DIVISIONS.find((d) => d.name_bn === sel);
                        if (targetDiv) map.current.flyTo(targetDiv.center, targetDiv.zoom, { duration: 1.2 });
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background/60">
                      <SelectValue placeholder={t('সকল বিভাগ', 'All Divisions')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL" className="text-xs">{t('সকল বিভাগ', 'All Divisions')}</SelectItem>
                      {BANGLADESH_DIVISIONS.map((d) => (
                        <SelectItem key={d.id} value={d.name_bn} className="text-xs">
                          {d.name_bn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* District */}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                    {t('জেলা', 'District')}
                  </label>
                  <Select
                    value={district || 'ALL'}
                    onValueChange={(val) => {
                      setDistrict(val === 'ALL' ? '' : val);
                      setUpazila('');
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background/60">
                      <SelectValue placeholder={t('সকল জেলা', 'All Districts')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL" className="text-xs">{t('সকল জেলা', 'All Districts')}</SelectItem>
                      {Array.from(new Set(locations.map((l) => l.district_bn)))
                        .filter(Boolean)
                        .map((dist) => (
                          <SelectItem key={dist} value={dist} className="text-xs">
                            {dist}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Upazila */}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                    {t('উপজেলা', 'Upazila')}
                  </label>
                  <Select
                    value={upazila || 'ALL'}
                    onValueChange={(val) => setUpazila(val === 'ALL' ? '' : val)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background/60">
                      <SelectValue placeholder={t('সকল উপজেলা', 'All Upazilas')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL" className="text-xs">{t('সকল উপজেলা', 'All Upazilas')}</SelectItem>
                      {Array.from(
                        new Set(
                          locations
                            .filter((l) => !district || l.district_bn === district)
                            .map((l) => l.upazila_bn)
                        )
                      )
                        .filter(Boolean)
                        .map((upz) => (
                          <SelectItem key={upz} value={upz} className="text-xs">
                            {upz}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Mouza Selection */}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                    {t('মৌজা', 'Mouza')}
                  </label>
                  <Select
                    value={String(location)}
                    onValueChange={(val) => {
                      const id = Number(val);
                      setLocation(id);
                      setPage(1);
                      const target = locations.find((l) => l.id === id);
                      if (target && map.current && Number(target.latitude)) {
                        map.current.flyTo([Number(target.latitude), Number(target.longitude)], 15, { duration: 1.2 });
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {locations
                        .filter((l) => !upazila || l.upazila_bn === upazila)
                        .map((l) => (
                          <SelectItem key={l.id} value={String(l.id)} className="text-xs">
                            {name(l, 'mouza')} (JL {l.jl_no})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Survey Epoch Selector (BS, RS, SA, CS) */}
              <div className="flex items-center justify-between gap-1 pt-1">
                <span className="text-[10px] font-bold text-muted-foreground">{t('জরিপ রেকর্ড:', 'Survey:')}</span>
                <div className="flex items-center gap-1">
                  {['BS', 'RS', 'SA', 'CS'].map((srv) => (
                    <Button
                      key={srv}
                      variant={surveyType === srv ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSurveyType(srv)}
                      className={`h-6 px-2 text-[10px] font-mono font-bold rounded-lg ${
                        surveyType === srv
                          ? 'bg-[#006A4E] hover:bg-[#00553e] text-white'
                          : 'bg-background/50 text-muted-foreground'
                      }`}
                    >
                      {srv}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Fast Dag Search Input with Clear Button */}
              <div className="relative">
                <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-2.5 z-10" />
                <Input
                  type="text"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setDagAutocompleteOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSearch(q.trim());
                      setPage(1);
                      setDagAutocompleteOpen(false);
                    }
                  }}
                  placeholder={t('দাগ নং লিখুন (যেমন: ২৩৪, ৫৬৭)...', 'Type dag no (e.g. 234)...')}
                  className="pl-8 pr-7 h-8 text-xs bg-background/80 rounded-xl"
                />
                {q && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setQ('');
                      setSearch('');
                      setDagAutocompleteOpen(false);
                    }}
                    className="size-6 absolute right-1 top-1 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </Button>
                )}

                {/* Instant Autocomplete Suggestions Dropdown */}
                {dagAutocompleteOpen && dagSuggestions.length > 0 && (
                  <div className="absolute top-full mt-1 inset-x-0 bg-popover/95 backdrop-blur-md border border-border shadow-xl rounded-xl z-50 max-h-48 overflow-y-auto p-1">
                    {dagSuggestions.map((sug) => (
                      <button
                        key={sug.id}
                        type="button"
                        onClick={() => {
                          setSelected(sug);
                          setDagAutocompleteOpen(false);
                          setQ(sug.dag_no);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-muted flex items-center justify-between transition cursor-pointer"
                      >
                        <span className="font-bold text-foreground">
                          {t('দাগ নং', 'Dag')} {lang === 'bn' ? sug.dag_no_bn : sug.dag_no}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {sug.total_area_decimal} {t('শতক', 'dec')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 pt-0.5">
                {[
                  { id: 'ALL', labelBn: 'সকল', labelEn: 'All' },
                  { id: 'SAFE', labelBn: 'নিরাপদ', labelEn: 'Safe', color: 'bg-emerald-500' },
                  { id: 'LOCKED', labelBn: 'লকড', labelEn: 'Locked', color: 'bg-amber-500' },
                  { id: 'DISPUTED', labelBn: 'বিরোধ', labelEn: 'Disputed', color: 'bg-rose-500' },
                ].map((item) => (
                  <Button
                    key={item.id}
                    variant={statusFilter === item.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(item.id as any)}
                    className={`h-6 px-2 rounded-lg text-[10px] font-bold ${
                      statusFilter === item.id
                        ? 'bg-[#006A4E] hover:bg-[#00553e] text-white'
                        : 'bg-background/50 text-muted-foreground'
                    }`}
                  >
                    {item.color && <span className={`size-1.5 rounded-full mr-1 ${item.color}`} />}
                    <span>{lang === 'bn' ? item.labelBn : item.labelEn}</span>
                  </Button>
                ))}
              </div>

              {/* Plots List Count & Header */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                <span>{t('মৌজার দাগ তালিকা', 'Plots in Mouza')}</span>
                <span className="font-mono font-bold text-foreground">
                  {toBnDigits(filteredPlotsList.length)} {t('টি দাগ', 'plots')}
                </span>
              </div>

              {/* Plots Results List (Click to fly & inspect) */}
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {filteredPlotsList.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground text-xs">
                    {t('কোনো দাগ পাওয়া যায়নি।', 'No plots found matching criteria.')}
                  </div>
                ) : (
                  filteredPlotsList.map((plot) => {
                    const isSel = selected?.id === plot.id;
                    const isFrozen = plot.is_admin_frozen || plot.owner_sale_locked;
                    const isLien = plot.has_active_lien;

                    return (
                      <button
                        key={plot.id}
                        type="button"
                        onClick={() => {
                          setSelected(plot);
                          setMobileDetailsOpen(true);
                        }}
                        className={`w-full text-left p-2 rounded-xl border text-xs transition cursor-pointer flex items-center justify-between ${
                          isSel
                            ? 'bg-amber-500/15 border-amber-500/50 shadow-xs ring-1 ring-amber-500'
                            : 'bg-background/60 hover:bg-background border-border/60'
                        }`}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground">
                              {t('দাগ', 'Dag')} {lang === 'bn' ? plot.dag_no_bn : plot.dag_no}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[9px] font-normal px-1 py-0 bg-muted/50 border-muted"
                            >
                              {plot.land_type_bn}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {plot.total_area_decimal} {t('শতক', 'decimals')}
                          </span>
                        </div>

                        <div>
                          {isFrozen ? (
                            <Badge variant="destructive" className="text-[9px] px-1 py-0 font-bold">
                              {t('লকড', 'LOCKED')}
                            </Badge>
                          ) : isLien ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] px-1 py-0 font-bold">
                              {t('লিয়েন', 'LIEN')}
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] px-1 py-0 font-bold">
                              {t('নিরাপদ', 'SAFE')}
                            </Badge>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>

            {/* Dock Footer with Pagination */}
            {data && (data as any).total_pages > 1 && (
              <CardFooter className="p-2.5 border-t border-border/60 bg-muted/20 flex items-center justify-between text-xs shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-7 px-2 text-[11px]"
                >
                  {t('পূর্ববর্তী', 'Prev')}
                </Button>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {toBnDigits(page)} / {toBnDigits((data as any).total_pages)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= (data as any).total_pages}
                  onClick={() => setPage((p) => Math.min((data as any).total_pages, p + 1))}
                  className="h-7 px-2 text-[11px]"
                >
                  {t('পরবর্তী', 'Next')}
                </Button>
              </CardFooter>
            )}
          </Card>
        )}
      </div>

      {/* 4. RIGHT FLOATING PLOT DETAILS CARD (When a plot is clicked) */}
      {selected && (
        <div className="hidden lg:flex absolute top-16 right-3 sm:right-4 bottom-14 z-20 w-84 sm:w-92 flex-col pointer-events-none">
          <Card className="pointer-events-auto bg-card/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
            {/* Header */}
            <CardHeader className="p-3.5 pb-2.5 border-b border-border/60 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#006A4E] text-white font-mono font-bold text-xs">
                    {t('দাগ নং', 'Dag')} {lang === 'bn' ? selected.dag_no_bn : selected.dag_no}
                  </Badge>
                  <span className="text-xs font-semibold text-foreground">
                    {selected.land_type_bn}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelected(null)}
                  className="size-7 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </Button>
              </div>
              <CardTitle className="text-sm font-black text-foreground mt-1">
                {t('প্লট বিস্তারিত ও আইনি সনদ স্থিতি', 'Plot Information & Risk Status')}
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground">
                {loc ? name(loc, 'mouza') : 'মৌজা'} · {loc ? name(loc, 'upazila') : ''} · {selected.plot_code}
              </CardDescription>
            </CardHeader>

            {/* Content */}
            <CardContent className="p-3.5 overflow-y-auto space-y-3 flex-1 text-xs">
              {/* Traffic-Light Status Alert Banner */}
              <div>
                {selected.is_admin_frozen || selected.owner_sale_locked ? (
                  <Alert className="border-rose-300 bg-rose-50/80 text-rose-900 p-2.5">
                    <ShieldAlert className="size-4 text-rose-600 shrink-0" />
                    <AlertDescription className="text-xs">
                      <strong className="block font-bold">{t('স্থগিত / বিক্রয় লক দাগ', 'Frozen / Sale Locked')}</strong>
                      <span className="text-[10px] text-rose-800">
                        {t('প্রশাসনিক আদেশ বা মালিকের লক বলবৎ থাকায় হস্তান্তর স্থগিত।', 'Transfers restricted by administrative injunction.')}
                      </span>
                    </AlertDescription>
                  </Alert>
                ) : selected.has_active_lien ? (
                  <Alert className="border-amber-300 bg-amber-50/80 text-amber-900 p-2.5">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                    <AlertDescription className="text-xs">
                      <strong className="block font-bold">{t('ব্যাংক মর্টগেজ / লিয়েন সক্রিয়', 'Active Mortgage Lien')}</strong>
                      <span className="text-[10px] text-amber-800">
                        {t('তফসিলি ব্যাংক এনওসি ব্যতিরেকে বিক্রয় করা যাবে না।', 'Lien clearance required before registration.')}
                      </span>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-emerald-300 bg-emerald-50/80 text-emerald-900 p-2.5">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <AlertDescription className="text-xs">
                      <strong className="block font-bold">{t('নিরাপদ ও নামজারিযোগ্য', 'Clean & Valid Title')}</strong>
                      <span className="text-[10px] text-emerald-800">
                        {t('কোনো দেওয়ানি নিষেধাজ্ঞা বা ব্যাংক দায় নেই। হস্তান্তরযোগ্য।', 'No adverse encumbrances recorded. Safe for purchase.')}
                      </span>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Area Conversions Grid */}
              {selectedAreaCalculations && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    {t('জমির পরিমাপ ও রূপান্তর', 'Cadastral Area Conversions')}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-xl bg-background/60 border border-border/80">
                      <span className="text-[10px] text-muted-foreground block">{t('রেকর্ডকৃত শতাংশ', 'Decimals')}</span>
                      <span className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-400">
                        {selectedAreaCalculations.decimals} {t('শতক', 'Dec')}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-background/60 border border-border/80">
                      <span className="text-[10px] text-muted-foreground block">{t('কাঠা রূপান্তর', 'Katha')}</span>
                      <span className="text-sm font-black font-mono text-foreground">
                        {selectedAreaCalculations.katha} {t('কাঠা', 'Katha')}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-background/60 border border-border/80">
                      <span className="text-[10px] text-muted-foreground block">{t('বর্গফুট', 'Square Feet')}</span>
                      <span className="text-xs font-bold font-mono text-foreground">
                        {selectedAreaCalculations.sqft} {t('বর্গফুট', 'sq.ft')}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-background/60 border border-border/80">
                      <span className="text-[10px] text-muted-foreground block">{t('একর', 'Acres')}</span>
                      <span className="text-xs font-bold font-mono text-foreground">
                        {selectedAreaCalculations.acres} {t('একর', 'Acre')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Plot Technical Details */}
              <div className="space-y-1.5 p-2.5 rounded-xl bg-muted/30 border border-border/60 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('খতিয়ান নম্বর:', 'Khatian No:')}</span>
                  <span className="font-mono font-bold text-foreground">{(selected as any).khatian_no || '১০২/বিএস'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('জরিপ সংস্করণ:', 'Survey Version:')}</span>
                  <span className="font-bold text-foreground">বাংলাদেশ ডিজিটাল সার্ভে (BDS)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('নকশা শিট নং:', 'Map Sheet:')}</span>
                  <span className="font-mono text-foreground">{sheet || '০১'}</span>
                </div>
              </div>

              {/* 1-Click Action Buttons */}
              <div className="space-y-2 pt-1">
                <Button
                  onClick={() => {
                    sessionStorage.setItem('bs_pending_check_search', selected.dag_no);
                    onNavigate?.(`check?q=${encodeURIComponent(selected.dag_no)}`);
                  }}
                  className="w-full bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs h-9 gap-1.5 cursor-pointer shadow-sm"
                >
                  <Sparkles className="size-3.5" />
                  <span>{t('জমি স্বাস্থ্য পরীক্ষা করুন', 'Check Before Buy')}</span>
                  <ArrowRight className="size-3.5 ml-auto" />
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    sessionStorage.setItem('bs_pending_verify_search', `DL-2026-${selected.dag_no}`);
                    onNavigate?.(`verify?code=${encodeURIComponent(selected.dag_no)}`);
                  }}
                  className="w-full font-bold text-xs h-9 gap-1.5 cursor-pointer"
                >
                  <FileCheck2 className="size-3.5 text-emerald-600" />
                  <span>{t('দলিল যাচাই উইজার্ড', 'Verify Deed & Balam')}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mobile Plot Details Bottom Sheet */}
      <Sheet open={mobileDetailsOpen && Boolean(selected)} onOpenChange={setMobileDetailsOpen}>
        <SheetContent side="bottom" className="max-w-lg mx-auto rounded-t-3xl border-t-2 border-[#006A4E] bg-background/95 backdrop-blur-md p-5 shadow-2xl z-[999] space-y-3">
          {selected && (
            <>
              <SheetHeader className="text-left border-b border-border/60 pb-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#006A4E] text-white font-mono font-bold text-xs">
                      {t('দাগ নং', 'Dag')} {lang === 'bn' ? selected.dag_no_bn : selected.dag_no}
                    </Badge>
                    <span className="text-xs font-bold text-foreground">
                      {selected.land_type_bn}
                    </span>
                  </div>
                  {selectedAreaCalculations && (
                    <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {selectedAreaCalculations.decimals} {t('শতক', 'Dec')}
                    </span>
                  )}
                </div>
                <SheetTitle className="text-base font-black text-foreground mt-1">
                  {t('প্লট সারসংক্ষেপ ও যাচাই', 'Plot Summary & Verification')}
                </SheetTitle>
              </SheetHeader>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <Button
                  onClick={() => {
                    sessionStorage.setItem('bs_pending_check_search', selected.dag_no);
                    onNavigate?.(`check?q=${encodeURIComponent(selected.dag_no)}`);
                  }}
                  className="bg-[#006A4E] text-white font-bold text-xs h-10"
                >
                  {t('ভূমি পরীক্ষা', 'Check Before Buy')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    onNavigate?.(`verify?code=${encodeURIComponent(selected.dag_no)}`);
                  }}
                  className="font-bold text-xs h-10"
                >
                  {t('দলিল যাচাই', 'Verify Deed')}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* 5. FLOATING BASEMAP SWITCHER WIDGET (Bottom-Left) */}
      <div className="absolute bottom-12 left-3 sm:left-4 z-20 pointer-events-none">
        <Card className="pointer-events-auto bg-background/85 backdrop-blur-md border border-border/80 shadow-xl p-1 rounded-2xl flex items-center gap-1">
          {(Object.keys(BASEMAP_CONFIGS) as BasemapMode[]).map((mode) => {
            const item = BASEMAP_CONFIGS[mode];
            const isActive = basemapMode === mode;
            return (
              <Button
                key={mode}
                variant={isActive ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setBasemapMode(mode)}
                title={item.name_en}
                className={`h-7 px-2.5 rounded-xl text-xs font-bold gap-1 transition ${
                  isActive
                    ? 'bg-[#006A4E] text-white hover:bg-[#00553e] shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{item.icon}</span>
                <span className="hidden sm:inline">{item.name_bn}</span>
              </Button>
            );
          })}
        </Card>
      </div>

      {/* 6. RIGHT FLOATING MAP TOOL STRIP */}
      <div className="absolute top-16 right-3 sm:right-4 z-20 pointer-events-none flex flex-col gap-1.5">
        <Card className="pointer-events-auto bg-background/85 backdrop-blur-md border border-border/80 shadow-xl p-1 rounded-2xl flex flex-col gap-1">
          {/* Zoom In */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => map.current?.zoomIn()}
            title={t('জুম ইন', 'Zoom In')}
            className="size-8 rounded-xl text-foreground hover:bg-muted"
          >
            <Plus className="size-4" />
          </Button>

          {/* Zoom Out */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => map.current?.zoomOut()}
            title={t('জুম আউট', 'Zoom Out')}
            className="size-8 rounded-xl text-foreground hover:bg-muted"
          >
            <Minus className="size-4" />
          </Button>

          <Separator className="my-0.5" />

          {/* Fit to Selected Bounds */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (geometry.current?.getBounds().isValid()) {
                map.current?.fitBounds(geometry.current.getBounds(), { padding: [30, 30] });
              } else if (loc) {
                map.current?.flyTo([Number(loc.latitude), Number(loc.longitude)], 15, { duration: 1.2 });
              } else {
                map.current?.flyTo([23.858, 90.318], 15, { duration: 1.2 });
              }
            }}
            title={t('এলাকা ফিট করুন', 'Fit Area')}
            className="size-8 rounded-xl text-foreground hover:bg-muted"
          >
            <Compass className="size-4 text-emerald-600" />
          </Button>

          {/* Distance & Area Measurement Tool */}
          <Button
            variant={measuring ? 'default' : 'ghost'}
            size="icon"
            onClick={toggleMeasurement}
            title={t('দূরত্ব পরিমাপ স্কেল', 'Measure Distance')}
            className={`size-8 rounded-xl ${
              measuring
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <Ruler className="size-4" />
          </Button>

          {/* Overlays & Layers Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                title={t('লেয়ার কন্ট্রোল', 'Layers')}
                className="size-8 rounded-xl text-foreground hover:bg-muted"
              >
                <Layers className="size-4 text-teal-600" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="left" className="w-56 p-3 rounded-2xl shadow-xl">
              <span className="text-xs font-black text-foreground block mb-2">
                {t('মানচিত্রের লেয়ারসমূহ', 'Map Overlays')}
              </span>
              <div className="space-y-1.5 text-xs">
                {[
                  { label: t('বিভাগীয় সীমানা', 'Divisions'), state: showDivisions, set: setShowDivisions },
                  { label: t('নদীনালা ও খাল', 'Rivers & Waters'), state: showRivers, set: setShowRivers },
                  { label: t('দাগ ও নকশা প্লট', 'Cadastral Plots'), state: showCadastralParcels, set: setShowCadastralParcels },
                  { label: t('রেজিস্ট্রি ও ভূমি অফিস', 'Gov Offices'), state: showOffices, set: setShowOffices },
                  { label: t('ঝুঁকি কালার ইন্ডিকেটর', 'Risk Sentinel'), state: showRiskOverlay, set: setShowRiskOverlay },
                ].map((lyr, i) => (
                  <label key={i} className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-foreground">{lyr.label}</span>
                    <input
                      type="checkbox"
                      checked={lyr.state}
                      onChange={(e) => lyr.set(e.target.checked)}
                      className="rounded accent-[#006A4E]"
                    />
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Map Color Legend Dialog Trigger */}
          <Dialog open={showLegend} onOpenChange={setShowLegend}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowLegend(true)}
                    className="size-8 rounded-xl text-foreground hover:bg-muted"
                  >
                    <Info className="size-4 text-blue-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <span>{t('মানচিত্রের লেজেন্ড', 'Legend')}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DialogContent className="max-w-sm p-5 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold flex items-center gap-2">
                  <Info className="size-4 text-[#006A4E]" />
                  <span>{t('ক্যাডাস্ট্রাল ম্যাপ কালার লেজেন্ড', 'Cadastral Color Legend')}</span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {t('মানচিত্রে ব্যবহৃত সীমানা ও রং সংকেতসমূহ', 'Color codes and layer semantics')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2 text-xs pt-1">
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200">
                  <span className="size-3.5 rounded bg-emerald-500 shrink-0" />
                  <span>{t('সবুজ: বিরোধমুক্ত ও নামজারিযোগ্য বৈধ রেকর্ড', 'Green: Clean & Mutation Safe')}</span>
                </div>
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200">
                  <span className="size-3.5 rounded bg-amber-500 shrink-0" />
                  <span>{t('হলুদ: ব্যাংক বন্ধক / মর্টগেজ লিয়েন সক্রিয়', 'Amber: Bank Mortgage / Active Lien')}</span>
                </div>
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-rose-50 text-rose-900 border border-rose-200">
                  <span className="size-3.5 rounded bg-rose-500 shrink-0" />
                  <span>{t('লাল: প্রশাসনিক স্থগিতাদেশ / বিক্রয় লক বলবৎ', 'Red: Admin Freeze / Sale Locked')}</span>
                </div>
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-blue-50 text-blue-900 border border-blue-200">
                  <span className="size-3.5 rounded bg-blue-500 shrink-0" />
                  <span>{t('নীল রেখা: জাতীয় নদীনালা ও জলমহাল', 'Blue: Rivers, Water bodies')}</span>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Print Map View Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.print()}
            title={t('ম্যাপ প্রিন্ট করুন', 'Print Map View')}
            className="size-8 rounded-xl text-foreground hover:bg-muted"
          >
            <Printer className="size-4" />
          </Button>
        </Card>
      </div>

      {/* 7. MEASUREMENT FLOATING BANNER (When Ruler is Active) */}
      {measuring && (
        <div className="absolute top-16 inset-x-0 mx-auto z-30 max-w-md px-3 pointer-events-none">
          <Alert className="pointer-events-auto border-amber-400 bg-amber-50/95 backdrop-blur-md text-amber-950 p-3 shadow-2xl rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Ruler className="size-4 text-amber-600 shrink-0" />
              <div>
                <strong className="text-xs font-bold block">
                  {t('দূরত্ব পরিমাপ সক্রিয়:', 'Measuring Active:')}{' '}
                  {measureDistanceMeters.toFixed(1)} {t('মিটার', 'm')} ({measureDistanceFeet.toFixed(0)} {t('ফুট', 'ft')})
                </strong>
                <span className="text-[10px] text-amber-800">
                  {t('মানচিত্রে যেকোনো পয়েন্টে ক্লিক করে রেখা আঁকুন', 'Click points on map to measure path distance')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPoints([])}
                className="h-7 px-2 text-[11px] border-amber-300 hover:bg-amber-100"
              >
                {t('মুছুন', 'Clear')}
              </Button>
              <Button
                size="sm"
                onClick={toggleMeasurement}
                className="h-7 px-2 text-[11px] bg-amber-600 hover:bg-amber-700 text-white"
              >
                {t('সম্পন্ন', 'Done')}
              </Button>
            </div>
          </Alert>
        </div>
      )}

      {/* 8. BOTTOM FLOATING HUD (Coordinates & Scale Pill) */}
      <div className="absolute bottom-3 inset-x-3 sm:inset-x-4 z-10 pointer-events-none flex items-center justify-between gap-2">
        {/* Left Live Status */}
        <div className="pointer-events-auto">
          <Badge
            variant="outline"
            className="bg-background/80 backdrop-blur-md border-border/80 text-foreground text-[10px] font-medium py-1 px-2.5 rounded-xl shadow-md gap-1.5 flex items-center"
          >
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {loc
                ? `${name(loc, 'mouza')} · ${name(loc, 'upazila')} · JL ${loc.jl_no}`
                : t('বাংলাদেশ ক্যাডাস্ট্রাল নেটওয়ার্ক', 'Bangladesh Cadastral Network')}
            </span>
          </Badge>
        </div>

        {/* Right Live Coordinates Readout with 1-Click Copy */}
        <div className="pointer-events-auto">
          {cursorCoords && (
            <button
              type="button"
              onClick={copyCoordinates}
              title={t('স্থানাঙ্ক কপি করতে ক্লিক করুন', 'Click to copy coordinates')}
              className="bg-background/80 backdrop-blur-md border border-border/80 text-foreground text-[10px] font-mono py-1 px-2.5 rounded-xl shadow-md hover:bg-background transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>
                {cursorCoords.lat.toFixed(5)}° N, {cursorCoords.lng.toFixed(5)}° E · Z{cursorCoords.zoom}
              </span>
              {copiedCoords ? (
                <Check className="size-3 text-emerald-600" />
              ) : (
                <Copy className="size-3 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
