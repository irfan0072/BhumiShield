export interface FloatingActionButtonConfig {
  id: string;
  isActive: boolean;
  icon: string; // Key corresponding to Lucide icon
  bgColor: string; // Hex color code
  labelBn: string; // Text shown on hover in Bangla
  labelEn: string; // Text shown on hover in English
  action: 'support_modal' | 'product_tour' | 'faraiz_calculator' | 'verify_qr' | 'navigate_map';
}

export const DEFAULT_FLOATING_BUTTONS: FloatingActionButtonConfig[] = [
  {
    id: 'support',
    isActive: true,
    icon: 'PhoneCall',
    bgColor: '#006A4E', // Classic government emerald
    labelBn: 'সহায়তা ও ১৬১২২ হটলাইন',
    labelEn: 'Support & 16122 Helpline',
    action: 'support_modal',
  },
  {
    id: 'guide',
    isActive: true,
    icon: 'BookOpen',
    bgColor: '#1d4ed8', // Royal blue
    labelBn: 'ইন্টারেক্টিভ প্রোডাক্ট ট্যুর ও গাইড',
    labelEn: 'Interactive Product Tour & Guide',
    action: 'product_tour',
  },
];

export const AVAILABLE_FLOATING_ICONS = [
  { key: 'PhoneCall', label: 'ফোন / হেল্পলাইন' },
  { key: 'BookOpen', label: 'বই / নির্দেশিকা' },
  { key: 'Compass', label: 'কম্পাস / দিকনির্দেশনা' },
  { key: 'HelpCircle', label: 'প্রশ্নচিহ্ন / সাহায্য' },
  { key: 'Sparkles', label: 'উইজার্ড / সেবা' },
  { key: 'Calculator', label: 'ক্যালকুলেটর' },
  { key: 'QrCode', label: 'কিউআর কোড' },
  { key: 'ShieldCheck', label: 'নিরাপত্তা / সুরক্ষা' },
  { key: 'MapPin', label: 'ম্যাপ / অবস্থান' },
  { key: 'FileText', label: 'কাগজপত্র / রেকর্ড' },
];

export const PRESET_FLOATING_COLORS = [
  { name: 'গাঢ় সবুজ (Emerald)', hex: '#006A4E' },
  { name: 'রয়েল ব্লু (Blue)', hex: '#1d4ed8' },
  { name: 'বেগুনী (Purple)', hex: '#7c3aed' },
  { name: 'লাল (Rose)', hex: '#e11d48' },
  { name: 'কমলা (Amber)', hex: '#d97706' },
  { name: 'গাঢ় স্লেট (Slate)', hex: '#0f172a' },
  { name: 'টিল (Teal)', hex: '#0d9488' },
];

const STORAGE_KEY = 'bs_floating_action_buttons';

export function getFloatingButtons(): FloatingActionButtonConfig[] {
  if (typeof window === 'undefined') return DEFAULT_FLOATING_BUTTONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FLOATING_BUTTONS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to parse floating buttons config:', err);
  }
  return DEFAULT_FLOATING_BUTTONS;
}

export function saveFloatingButtons(buttons: FloatingActionButtonConfig[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buttons));
    window.dispatchEvent(new CustomEvent('bs-floating-buttons-updated', { detail: buttons }));
  } catch (err) {
    console.error('Failed to save floating buttons config:', err);
  }
}
