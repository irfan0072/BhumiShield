import { api } from './client';

export type GeoJSONPosition = [number, number]; // [lng, lat]

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: GeoJSONPosition[][];
}

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: GeoJSONPosition[];
}

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: GeoJSONPosition;
}

export type GeoJSONGeometry = GeoJSONPolygon | GeoJSONLineString | GeoJSONPoint;

export type FeatureType = 'polygon' | 'line' | 'point';

export type FeatureCategory =
  | 'plot'
  | 'mouza_boundary'
  | 'road'
  | 'waterbody'
  | 'control_point'
  | 'landmark';

export interface MapFeatureAttributes {
  name?: string;
  category?: FeatureCategory | string;
  dag_no?: string;
  khatian_no?: string;
  jl_no?: string;
  land_class?: string;
  survey_type?: 'CS' | 'SA' | 'RS' | 'BS' | 'BDS' | string;
  sheet_no?: string;
  notes?: string;
  [key: string]: any;
}

export interface MapFeature {
  id: number;
  location_id: number;
  office_id?: number | null;
  plot_id?: number | null;
  feature_type: FeatureType;
  geometry: GeoJSONGeometry;
  attributes: MapFeatureAttributes;
  area_decimal?: number | null;
  area_sqm?: number | null;
  length_meters?: number | null;
  bbox_xmin: number;
  bbox_ymin: number;
  bbox_xmax: number;
  bbox_ymax: number;
  status: string;
  created_by: string;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MapFeaturesQuery {
  location_id?: number;
  feature_type?: FeatureType | string;
  plot_id?: number;
  status?: 'active' | 'archived' | 'draft' | 'all' | string;
}

export interface CreateMapFeaturePayload {
  location_id: number;
  office_id?: number | null;
  plot_id?: number | null;
  feature_type: FeatureType;
  geometry: GeoJSONGeometry;
  attributes?: MapFeatureAttributes;
  status?: string;
}

export interface UpdateMapFeaturePayload {
  feature_type?: FeatureType;
  geometry?: GeoJSONGeometry;
  attributes?: MapFeatureAttributes;
  plot_id?: number | null;
  status?: string;
}

export interface MapFeaturesListResponse {
  success: boolean;
  count: number;
  data: MapFeature[];
}

export interface MapFeatureDetailResponse {
  success: boolean;
  data: MapFeature;
}

export interface MapFeatureDeleteResponse {
  success: boolean;
  message: string;
  id: number;
}

export const mapFeaturesApi = {
  /**
   * List vector features with optional filtering by location, type, status, or plot.
   */
  list: async (query?: MapFeaturesQuery): Promise<MapFeature[]> => {
    const res = await api.get<MapFeaturesListResponse>('/map/features', {
      params: query,
    });
    return res.data?.data || [];
  },

  /**
   * Retrieve a single vector feature by ID.
   */
  get: async (id: number): Promise<MapFeature> => {
    const res = await api.get<MapFeatureDetailResponse>(`/map/features/${id}`);
    return res.data.data;
  },

  /**
   * Create a new vector feature (Polygon, LineString, or Point).
   */
  create: async (payload: CreateMapFeaturePayload): Promise<MapFeature> => {
    const res = await api.post<MapFeatureDetailResponse>('/map/features', payload);
    return res.data.data;
  },

  /**
   * Update an existing vector feature's geometry or attributes.
   */
  update: async (id: number, payload: UpdateMapFeaturePayload): Promise<MapFeature> => {
    const res = await api.put<MapFeatureDetailResponse>(`/map/features/${id}`, payload);
    return res.data.data;
  },

  /**
   * Delete a vector feature by ID.
   */
  delete: async (id: number): Promise<MapFeatureDeleteResponse> => {
    const res = await api.delete<MapFeatureDeleteResponse>(`/map/features/${id}`);
    return res.data;
  },
};

/**
 * Standard Bangladeshi Land Classifications with Bengali and English labels
 */
export const BD_LAND_CLASSES = [
  { value: 'নাল', labelBn: 'নাল (আবাদি জমি)', labelEn: 'Nal (Cultivated / Cropland)' },
  { value: 'ভিটি', labelBn: 'ভিটি / ভিটা (উঁচু জমি)', labelEn: 'Viti / Vita (Homestead / High ground)' },
  { value: 'বাড়ি', labelBn: 'বাড়ি / বসতভিটা', labelEn: 'Bari (Dwelling / Homestead)' },
  { value: 'চালা', labelBn: 'চালা (উঁচু জমি)', labelEn: 'Chala (Highland)' },
  { value: 'বাইদ', labelBn: 'বাইদ (নিচু উর্বর ধানি জমি)', labelEn: 'Baid (Lowland / Fertile paddy)' },
  { value: 'ডোবা', labelBn: 'ডোবা / নালা', labelEn: 'Doba / Nala (Ditch / Waterway)' },
  { value: 'খাল', labelBn: 'নদী / খাল / বিল', labelEn: 'River / Canal / Wetland (খাল/বিল)' },
  { value: 'বাগান', labelBn: 'বাগান (ফলজ / বনজ)', labelEn: 'Bagan (Orchard / Garden)' },
  { value: 'পতিত', labelBn: 'পতিত (অনাবাদী)', labelEn: 'Potit (Fallow land)' },
  { value: 'বাণিজ্যিক', labelBn: 'বাণিজ্যিক / কারখানা', labelEn: 'Commercial / Industrial' },
  { value: 'রাস্তা', labelBn: 'রাস্তা / পথ', labelEn: 'Road / Pathway' },
] as const;

/**
 * Vector feature categories
 */
export const FEATURE_CATEGORIES = [
  { value: 'plot', labelBn: 'দাগ / প্লট সীমানা', labelEn: 'Cadastral Plot (দাগ)' },
  { value: 'mouza_boundary', labelBn: 'মৌজা সীমানা', labelEn: 'Mouza Boundary (মৌজা সীমানা)' },
  { value: 'road', labelBn: 'রাস্তা / সড়ক', labelEn: 'Road / Highway (রাস্তা)' },
  { value: 'waterbody', labelBn: 'খাল / নদী / জলাশয়', labelEn: 'Canal / River / Waterbody (খাল/নদী)' },
  { value: 'control_point', labelBn: 'সার্ভে নিয়ন্ত্রণ পিলার / জিপিএস বেঞ্চমার্ক', labelEn: 'Survey Control Pillar / Benchmark' },
  { value: 'landmark', labelBn: 'ল্যান্ডমার্ক (মসজিদ/মন্দির/স্কুল/সেতু)', labelEn: 'Landmark (Mosque/Temple/School)' },
] as const;

/**
 * Cadastral conversion constants & helpers
 */
export const CADASTRAL_CONSTANTS = {
  DECIMAL_TO_SQM: 40.468564224,
  SQM_TO_SQFT: 10.7639104,
  ACRE_TO_DECIMAL: 100,
  KATHA_TO_DECIMAL: 1.65,
  BIGHA_TO_DECIMAL: 33,
  CHAIN_TO_METERS: 20.1168, // 1 Gunter's survey chain = 66 ft = 20.1168 m = 100 links
  CHAIN_TO_FEET: 66,
  EARTH_RADIUS_METERS: 6371008.8,
};

/**
 * Convert number to Bengali digits string
 */
export function toBnDigits(val: number | string): string {
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(val).replace(/[0-9]/g, (d) => bn[parseInt(d, 10)]);
}

/**
 * Convert Bengali digits string to ASCII digits
 */
export function normalizeBnDigits(str: string): string {
  const en: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  return str.replace(/[০-৯]/g, (d) => en[d] || d);
}
