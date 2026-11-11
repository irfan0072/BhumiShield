export type BasemapMode = 'satellite' | 'carto' | 'osm' | 'dark' | 'offline_grid';

/**
 * Tile sources shared by the public map and the officer ParcelDesigner.
 * `icon` is kept (empty) because ParcelDesigner still renders it.
 */
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
    name_bn: 'স্যাটেলাইট',
    name_en: 'Satellite',
    icon: '',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: '&copy; Esri & Earthstar Geographics',
  },
  carto: {
    name_bn: 'মানচিত্র',
    name_en: 'Map',
    icon: '',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 20,
    attribution: '&copy; CARTO &copy; OpenStreetMap',
  },
  osm: {
    name_bn: 'রাস্তা',
    name_en: 'Roads',
    icon: '',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  },
  dark: {
    name_bn: 'গাঢ়',
    name_en: 'Dark',
    icon: '',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 20,
    attribution: '&copy; CARTO &copy; OpenStreetMap',
  },
  offline_grid: {
    name_bn: 'অফলাইন গ্রিড',
    name_en: 'Offline grid',
    icon: '',
  },
};

/** Basemaps offered on the public map switch. */
export const PUBLIC_BASEMAPS: BasemapMode[] = ['satellite', 'carto'];
