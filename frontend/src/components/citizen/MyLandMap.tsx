import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppUI } from '@/i18n';
import { toBanglaDigits } from '@/theme/tokens';
import { mapApi, parcelApi, MapLocation, MapPlot, ParcelDesign } from '@/components/map/mapApi';
import { ALL_MOUZA_CADASTRAL_PLOTS, CadastralPlotPolygon } from '@/data/bangladeshGeo';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { Maximize2, LocateFixed, RotateCw, AlertCircle } from 'lucide-react';

export interface CitizenOwnedPlot {
  plot_id: number;
  id?: number;
  location_id?: number;
  dag_no: string;
  dag_no_bn?: string;
  khatian_no?: string;
  khatian_no_bn?: string;
  survey_type?: string;
  land_type_bn?: string;
  land_type_en?: string;
  area_decimal?: number;
  share_area_decimal?: number;
  total_area_decimal?: number;
  share_fraction?: string;
  owner_sale_locked?: number | boolean;
  is_admin_frozen?: number | boolean;
  has_active_lien?: number | boolean;
  mortgage_status?: string;
  mouza_bn?: string;
  mouza_en?: string;
  upazila_bn?: string;
  upazila_en?: string;
  district_bn?: string;
  district_en?: string;
  jl_no?: string | number;
}

export interface MyLandMapProps {
  plots: CitizenOwnedPlot[];
  selectedPlotId?: number | string | null;
  onSelect?: (plotId: number) => void;
  compact?: boolean;
  className?: string;
}

interface CachedMouzaData {
  location?: MapLocation;
  workspacePlots: MapPlot[];
  geoFeatures: any[];
  parcelDesigns: ParcelDesign[];
  fallbackPolygons: CadastralPlotPolygon[];
}

let cachedWorkspacePromise: Promise<{ locations: MapLocation[]; plots: MapPlot[] }> | null = null;
const mouzaCache = new Map<number, Promise<CachedMouzaData>>();

function getGlobalWorkspace() {
  if (!cachedWorkspacePromise) {
    cachedWorkspacePromise = mapApi
      .workspace(0, '', 1)
      .then((res) => ({
        locations: res.locations || [],
        plots: res.plots || [],
      }))
      .catch(() => ({ locations: [], plots: [] }));
  }
  return cachedWorkspacePromise;
}

function getMouzaBundle(locationId: number, knownLoc?: MapLocation): Promise<CachedMouzaData> {
  const existing = mouzaCache.get(locationId);
  if (existing) return existing;

  const p = (async (): Promise<CachedMouzaData> => {
    const [wsRes, layersRes, designsRes] = await Promise.all([
      mapApi.workspace(locationId, '', 1).catch(() => null),
      mapApi.layers(locationId).catch(() => []),
      parcelApi.list(locationId, true).catch(() => []),
    ]);

    const geoFeatures: any[] = [];
    if (Array.isArray(layersRes) && layersRes.length > 0) {
      const geomList = await Promise.all(
        layersRes.slice(0, 3).map((l) => mapApi.geometry(l.id).catch(() => null))
      );
      for (const g of geomList) {
        if (g?.geojson?.features && Array.isArray(g.geojson.features)) {
          geoFeatures.push(...g.geojson.features);
        }
      }
    }

    const loc =
      knownLoc ||
      wsRes?.locations?.find((l) => Number(l.id) === Number(locationId)) ||
      undefined;

    return {
      location: loc,
      workspacePlots: wsRes?.plots || [],
      geoFeatures,
      parcelDesigns: Array.isArray(designsRes) ? designsRes : [],
      fallbackPolygons: ALL_MOUZA_CADASTRAL_PLOTS[locationId] || [],
    };
  })();

  mouzaCache.set(locationId, p);
  return p;
}

function getPlotColor(plot: CitizenOwnedPlot): { stroke: string; fill: string } {
  if (plot.owner_sale_locked || plot.is_admin_frozen) {
    return { stroke: '#dc2626', fill: '#ef4444' };
  }
  if (
    plot.has_active_lien ||
    (plot.mortgage_status && ['ACTIVE', 'MORTGAGED', 'LIEN_ACTIVE'].includes(String(plot.mortgage_status).toUpperCase()))
  ) {
    return { stroke: '#d97706', fill: '#f59e0b' };
  }
  return { stroke: '#006A4E', fill: '#10b981' };
}

export const MyLandMap: React.FC<MyLandMapProps> = ({
  plots,
  selectedPlotId,
  onSelect,
  compact = false,
  className = '',
}) => {
  const { t, lang } = useAppUI();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const parcelsGroupRef = useRef<L.LayerGroup | null>(null);
  const userLocMarkerRef = useRef<L.CircleMarker | null>(null);

  const [basemap, setBasemap] = useState<'satellite' | 'street'>('satellite');
  const [tileError, setTileError] = useState(false);
  const [missingDesignNote, setMissingDesignNote] = useState(false);
  const [locating, setLocating] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  const plotBoundsMapRef = useRef<Map<number, L.LatLngBounds>>(new Map());
  const allMyBoundsRef = useRef<L.LatLngBounds | null>(null);
  const hasInitialFitRef = useRef(false);

  const fmtNum = useCallback(
    (v: number | string | null | undefined) => {
      if (v === null || v === undefined || v === '') return '০';
      return lang === 'bn' ? toBanglaDigits(v) : String(v);
    },
    [lang]
  );

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const m = L.map(containerRef.current, {
      center: [23.8583, 90.318],
      zoom: compact ? 15 : 16,
      minZoom: 6,
      maxZoom: 19,
      zoomControl: !compact,
      attributionControl: !compact,
      preferCanvas: false,
    });

    if (!compact) {
      L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(m);
    }

    parcelsGroupRef.current = L.layerGroup().addTo(m);
    mapRef.current = m;

    const ro = new ResizeObserver(() => {
      m.invalidateSize();
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      m.remove();
      mapRef.current = null;
    };
  }, [compact]);

  // 2. Manage Basemap & Labels Overlay
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;

    if (baseLayerRef.current) {
      m.removeLayer(baseLayerRef.current);
      baseLayerRef.current = null;
    }
    if (labelsLayerRef.current) {
      m.removeLayer(labelsLayerRef.current);
      labelsLayerRef.current = null;
    }

    setTileError(false);

    if (basemap === 'satellite') {
      const sat = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: '© Esri & Earthstar Geographics',
        }
      );
      let errCount = 0;
      sat.on('tileerror', () => {
        errCount += 1;
        if (errCount >= 4) setTileError(true);
      });
      sat.on('tileload', () => {
        setTileError(false);
      });
      sat.addTo(m);
      baseLayerRef.current = sat;

      const labels = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          opacity: 0.85,
        }
      );
      labels.addTo(m);
      labelsLayerRef.current = labels;
    } else {
      const street = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          subdomains: 'abcd',
          maxZoom: 19,
          attribution: '© OpenStreetMap · © CARTO',
        }
      );
      let errCount = 0;
      street.on('tileerror', () => {
        errCount += 1;
        if (errCount >= 4) setTileError(true);
      });
      street.on('tileload', () => {
        setTileError(false);
      });
      street.addTo(m);
      baseLayerRef.current = street;
    }
  }, [basemap, retryTick]);

  // 3. Load and Render Citizen Parcels + Context Parcels
  useEffect(() => {
    let active = true;
    const m = mapRef.current;
    const group = parcelsGroupRef.current;
    if (!m || !group) return;

    (async () => {
      group.clearLayers();
      plotBoundsMapRef.current.clear();
      setMissingDesignNote(false);

      if (!plots || plots.length === 0) return;

      const globalWs = await getGlobalWorkspace();
      if (!active) return;

      // Resolve location_id and enrichment for each owned plot
      const enrichedPlots: (CitizenOwnedPlot & { resolvedLocationId: number })[] = plots.map((p) => {
        const pid = Number(p.plot_id || p.id);
        const wsPlot = globalWs.plots.find((wp) => Number(wp.id) === pid);
        const locByMouza = globalWs.locations.find(
          (l) =>
            (p.mouza_bn && l.mouza_bn === p.mouza_bn) ||
            (p.mouza_en && l.mouza_en?.toLowerCase() === p.mouza_en?.toLowerCase())
        );
        const resolvedLocationId = Number(
          p.location_id || wsPlot?.location_id || locByMouza?.id || 1
        );
        return {
          ...p,
          plot_id: pid,
          resolvedLocationId,
          is_admin_frozen: p.is_admin_frozen ?? wsPlot?.is_admin_frozen ?? 0,
          has_active_lien: p.has_active_lien ?? wsPlot?.has_active_lien ?? 0,
        };
      });

      const uniqueLocIds = Array.from(new Set(enrichedPlots.map((p) => p.resolvedLocationId)));
      const bundlesByLoc = new Map<number, CachedMouzaData>();

      await Promise.all(
        uniqueLocIds.map(async (locId) => {
          const knownLoc = globalWs.locations.find((l) => Number(l.id) === locId);
          const b = await getMouzaBundle(locId, knownLoc);
          bundlesByLoc.set(locId, b);
        })
      );

      if (!active || !mapRef.current || !parcelsGroupRef.current) return;

      const myPlotIds = new Set(enrichedPlots.map((p) => Number(p.plot_id)));
      const myDagsByLoc = new Map<number, Set<string>>();
      for (const p of enrichedPlots) {
        if (!myDagsByLoc.has(p.resolvedLocationId)) {
          myDagsByLoc.set(p.resolvedLocationId, new Set());
        }
        myDagsByLoc.get(p.resolvedLocationId)!.add(String(p.dag_no));
      }

      // First render faint grey context parcels in the same mouzas
      for (const [locId, bundle] of bundlesByLoc.entries()) {
        const myDags = myDagsByLoc.get(locId) || new Set();
        for (const poly of bundle.fallbackPolygons) {
          if (myDags.has(String(poly.dag_no))) continue;
          const ctxLayer = L.polygon(poly.coordinates, {
            color: '#94a3b8',
            weight: 1,
            dashArray: '3, 3',
            fillColor: '#cbd5e1',
            fillOpacity: 0.12,
            interactive: false,
          });
          ctxLayer.addTo(group);
        }
      }

      const combinedBounds = L.latLngBounds([]);
      let anyMissingGeometry = false;

      // Now render the citizen's own plots in priority order:
      // 1) mapApi.layers -> mapApi.geometry
      // 2) parcelApi.list(location_id, true)
      // 3) ALL_MOUZA_CADASTRAL_PLOTS[location_id]
      // 4) Mouza lat/lng fallback marker
      for (const plot of enrichedPlots) {
        const pid = Number(plot.plot_id);
        const isSelected =
          selectedPlotId !== null &&
          selectedPlotId !== undefined &&
          Number(selectedPlotId) === pid;
        const bundle = bundlesByLoc.get(plot.resolvedLocationId);
        const colors = getPlotColor(plot);
        const areaVal = plot.area_decimal ?? plot.share_area_decimal ?? plot.total_area_decimal ?? 0;
        const tooltipText = `${t('দাগ', 'Plot')} ${fmtNum(plot.dag_no_bn || plot.dag_no)} · ${fmtNum(areaVal)} ${t('শতক', 'dec')}`;

        let matchedLayer: L.Layer | null = null;
        let layerBounds: L.LatLngBounds | null = null;

        // Priority 1: Published GeoJSON layer feature
        if (bundle && bundle.geoFeatures.length > 0) {
          const feat = bundle.geoFeatures.find(
            (f) =>
              Number(f?.properties?.plot_id) === pid ||
              String(f?.properties?.dag_no) === String(plot.dag_no)
          );
          if (feat) {
            const gj = L.geoJSON(feat, {
              style: {
                color: isSelected ? '#ffffff' : colors.stroke,
                weight: isSelected ? 3.5 : 2.5,
                fillColor: colors.fill,
                fillOpacity: isSelected ? 0.48 : 0.32,
              },
            });
            matchedLayer = gj;
            layerBounds = gj.getBounds();
          }
        }

        // Priority 2: Office parcel design
        if (!matchedLayer && bundle && bundle.parcelDesigns.length > 0) {
          const design =
            bundle.parcelDesigns.find((d) => Number(d.plot_id) === pid) ||
            bundle.parcelDesigns.find((d) => String(d.dag_no) === String(plot.dag_no));
          if (design?.geometry) {
            const gj = L.geoJSON(design.geometry as any, {
              style: {
                color: isSelected ? '#ffffff' : colors.stroke,
                weight: isSelected ? 3.5 : 2.5,
                fillColor: colors.fill,
                fillOpacity: isSelected ? 0.48 : 0.32,
              },
            });
            matchedLayer = gj;
            layerBounds = gj.getBounds();
          }
        }

        // Priority 3: ALL_MOUZA_CADASTRAL_PLOTS fallback polygon
        if (!matchedLayer && bundle && bundle.fallbackPolygons.length > 0) {
          const cad = bundle.fallbackPolygons.find(
            (c) => String(c.dag_no) === String(plot.dag_no)
          );
          if (cad && Array.isArray(cad.coordinates) && cad.coordinates.length >= 3) {
            if (isSelected) {
              // Outer soft pulse ring for selected parcel
              L.polygon(cad.coordinates, {
                color: colors.stroke,
                weight: 6,
                opacity: 0.45,
                fillOpacity: 0,
                interactive: false,
              }).addTo(group);
            }
            const poly = L.polygon(cad.coordinates, {
              color: isSelected ? '#ffffff' : colors.stroke,
              weight: isSelected ? 3 : 2.5,
              fillColor: colors.fill,
              fillOpacity: isSelected ? 0.48 : 0.32,
            });
            matchedLayer = poly;
            layerBounds = poly.getBounds();
          }
        }

        // Priority 4: Mouza lat/lng marker fallback
        if (!matchedLayer) {
          anyMissingGeometry = true;
          const lat = Number(bundle?.location?.latitude) || 23.8583;
          const lng = Number(bundle?.location?.longitude) || 90.318;
          const marker = L.circleMarker([lat, lng], {
            radius: isSelected ? 10 : 8,
            color: '#ffffff',
            weight: isSelected ? 3 : 2,
            fillColor: colors.fill,
            fillOpacity: 0.9,
          });
          matchedLayer = marker;
          layerBounds = L.latLngBounds(
            [lat - 0.0012, lng - 0.0012],
            [lat + 0.0012, lng + 0.0012]
          );
        }

        if (matchedLayer) {
          (matchedLayer as any).bindTooltip(tooltipText, {
            direction: 'top',
            sticky: true,
          });
          matchedLayer.on('click', () => {
            onSelect?.(pid);
          });
          matchedLayer.addTo(group);

          if (layerBounds && layerBounds.isValid()) {
            plotBoundsMapRef.current.set(pid, layerBounds);
            combinedBounds.extend(layerBounds);

            // Add compact Dag number label at parcel center
            const center = layerBounds.getCenter();
            const labelIcon = L.divIcon({
              className: 'citizen-dag-pin',
              html: `<div style="background:${colors.stroke};color:#fff;font-size:11px;font-weight:600;padding:1px 6px;border-radius:4px;border:1px solid rgba(255,255,255,0.85);white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.3);">${fmtNum(plot.dag_no_bn || plot.dag_no)}</div>`,
              iconSize: [36, 20],
              iconAnchor: [18, 10],
            });
            const lbl = L.marker(center, { icon: labelIcon, interactive: true });
            lbl.on('click', () => onSelect?.(pid));
            lbl.addTo(group);
          }
        }
      }

      setMissingDesignNote(anyMissingGeometry);

      if (combinedBounds.isValid()) {
        allMyBoundsRef.current = combinedBounds;
        if (!hasInitialFitRef.current) {
          hasInitialFitRef.current = true;
          m.fitBounds(combinedBounds, { padding: [28, 28], maxZoom: 17 });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [plots, selectedPlotId, fmtNum, t, onSelect]);

  // 4. Fly to selected parcel when selectedPlotId changes
  useEffect(() => {
    const m = mapRef.current;
    if (!m || selectedPlotId === null || selectedPlotId === undefined) return;
    const pid = Number(selectedPlotId);
    const b = plotBoundsMapRef.current.get(pid);
    if (b && b.isValid()) {
      m.flyToBounds(b, { padding: [36, 36], maxZoom: 18, duration: 0.65 });
    }
  }, [selectedPlotId]);

  const handleFitAllMyLand = () => {
    const m = mapRef.current;
    const b = allMyBoundsRef.current;
    if (m && b && b.isValid()) {
      m.fitBounds(b, { padding: [28, 28], maxZoom: 17 });
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const m = mapRef.current;
        if (!m) return;
        const latlng: L.LatLngTuple = [pos.coords.latitude, pos.coords.longitude];
        if (userLocMarkerRef.current) {
          m.removeLayer(userLocMarkerRef.current);
        }
        userLocMarkerRef.current = L.circleMarker(latlng, {
          radius: 7,
          color: '#ffffff',
          weight: 2,
          fillColor: '#2563eb',
          fillOpacity: 0.95,
        })
          .bindTooltip(t('আমার অবস্থান', 'My Location'))
          .addTo(m);
        m.flyTo(latlng, 16, { duration: 0.8 });
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 6000 }
    );
  };

  return (
    <div
      className={`relative isolate z-0 w-full h-full min-h-[180px] rounded-lg overflow-hidden bg-slate-900 border border-border select-none ${className}`}
    >
      <div ref={containerRef} className="w-full h-full relative isolate z-0" />

      {/* Top-left: Basemap Switcher */}
      <div className="absolute top-2.5 left-2.5 z-[400] flex items-center gap-1.5">
        <ToggleGroup
          type="single"
          value={basemap}
          onValueChange={(val) => {
            if (val === 'satellite' || val === 'street') setBasemap(val);
          }}
          className="bg-background/95 backdrop-blur border border-border rounded-md p-0.5 shadow-sm"
        >
          <ToggleGroupItem
            value="satellite"
            className="h-7 px-2.5 text-xs font-medium data-[state=on]:bg-[#006A4E] data-[state=on]:text-white rounded-sm"
          >
            {t('স্যাটেলাইট', 'Satellite')}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="street"
            className="h-7 px-2.5 text-xs font-medium data-[state=on]:bg-[#006A4E] data-[state=on]:text-white rounded-sm"
          >
            {t('মানচিত্র', 'Map')}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Top-right: Fit all my land + Locate me */}
      <div className="absolute top-2.5 right-2.5 z-[400] flex items-center gap-1.5">
        {plots.length > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleFitAllMyLand();
            }}
            className="h-7 px-2.5 text-xs font-medium bg-background/95 hover:bg-background text-foreground border border-border shadow-sm"
          >
            <Maximize2 className="size-3.5 mr-1 text-primary" />
            {t('আমার সব জমি', 'All my land')}
          </Button>
        )}

        {!compact && typeof navigator !== 'undefined' && 'geolocation' in navigator && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleLocateMe();
            }}
            disabled={locating}
            title={t('আমার অবস্থান', 'My location')}
            className="h-7 w-7 bg-background/95 hover:bg-background text-foreground border border-border shadow-sm"
          >
            <LocateFixed className={`size-3.5 ${locating ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>

      {/* Bottom Legend & Missing Geometry Note */}
      {!compact && (
        <div className="absolute bottom-2.5 right-2.5 z-[400] flex flex-wrap items-center gap-2 bg-background/95 backdrop-blur px-2.5 py-1 rounded-md border border-border text-xs shadow-sm">
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-full bg-[#10b981]" />
            {t('নিরাপদ', 'Safe')}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-full bg-[#ef4444]" />
            {t('বিক্রয় লক', 'Locked')}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-full bg-[#f59e0b]" />
            {t('বন্ধক', 'Mortgaged')}
          </span>
          {missingDesignNote && (
            <span className="text-muted-foreground pl-1 border-l border-border">
              {t('নকশা পাওয়া যায়নি', 'Design unavailable')}
            </span>
          )}
        </div>
      )}

      {/* Tile Error Inline Fallback */}
      {tileError && (
        <div className="absolute bottom-2.5 left-2.5 z-[400] flex items-center gap-2 bg-background/95 backdrop-blur px-2.5 py-1.5 rounded-md border border-border text-xs shadow-sm">
          <AlertCircle className="size-3.5 text-amber-600 shrink-0" />
          <span>{t('ম্যাপ লোড হয়নি', 'Map failed to load')}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setRetryTick((x) => x + 1);
            }}
            className="h-6 px-2 text-xs"
          >
            <RotateCw className="size-3 mr-1" />
            {t('আবার চেষ্টা করুন', 'Retry')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default MyLandMap;
