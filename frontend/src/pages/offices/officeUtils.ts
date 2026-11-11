/** Shared helpers for the public office locator. */

export interface OfficeItem {
  id: number;
  office_code: string;
  name_bn: string;
  name_en: string;
  office_type: string;
  division_bn?: string;
  division_en?: string;
  district_bn: string;
  district_en: string;
  upazila_bn: string;
  upazila_en: string;
  mouzas_served_json?: string;
  latitude: number | null;
  longitude: number | null;
  address_bn: string;
  address_en: string;
  contact_phone: string;
}

/** Office type groups used by the filter. Backend values are lower-case (registry, ac_land, …). */
export const OFFICE_TYPES: Array<{ id: string; match: string[]; bn: string; en: string }> = [
  { id: 'ac_land', match: ['ac_land'], bn: 'উপজেলা ভূমি অফিস', en: 'Upazila land office' },
  { id: 'registry', match: ['registry', 'sub_registry'], bn: 'সাব-রেজিস্ট্রি অফিস', en: 'Sub-registry office' },
  { id: 'settlement', match: ['settlement'], bn: 'জরিপ অফিস', en: 'Survey office' },
  { id: 'service_point', match: ['service_point'], bn: 'ডিজিটাল সেন্টার', en: 'Digital centre' },
  { id: 'bank', match: ['bank', 'bank_branch'], bn: 'ব্যাংক শাখা', en: 'Bank branch' },
  { id: 'admin', match: ['admin_cell', 'platform'], bn: 'প্রশাসনিক অফিস', en: 'Admin office' },
];

export const typeInfo = (code: string) => {
  const c = String(code || '').toLowerCase();
  return OFFICE_TYPES.find((x) => x.match.includes(c)) || { id: c, match: [c], bn: 'অফিস', en: 'Office' };
};

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
/** Bangla digits → ASCII digits. */
export const toAsciiDigits = (v: string) => String(v || '').replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));

/** A safe tel: href (digits and a leading + only). Returns '' if there is no usable number. */
export const telHref = (phone: string) => {
  const digits = toAsciiDigits(phone).replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '').slice(0, 16);
  return digits.length >= 3 ? `tel:${digits}` : '';
};

export const hasCoords = (o: OfficeItem) =>
  o.latitude !== null && o.longitude !== null && Number.isFinite(Number(o.latitude)) && Number.isFinite(Number(o.longitude));

/** Google Maps directions link. Coordinates when known, otherwise the office name + address. */
export const directionsUrl = (o: OfficeItem) => {
  const dest = hasCoords(o)
    ? `${Number(o.latitude)},${Number(o.longitude)}`
    : `${o.name_bn || o.name_en || ''}, ${o.address_bn || o.address_en || ''}`.trim().slice(0, 200);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
};

/** Great-circle distance in km. */
export const distanceKm = (a: [number, number], b: [number, number]) => {
  const R = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

/** Bangladesh mobile number: 01[3-9]XXXXXXXX (Bangla digits, spaces and dashes are accepted). */
export const normalizeMobile = (v: string) => toAsciiDigits(v).replace(/[\s-]/g, '');
export const isValidMobile = (v: string) => /^01[3-9]\d{8}$/.test(normalizeMobile(v));

/** Local date as YYYY-MM-DD. */
export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
