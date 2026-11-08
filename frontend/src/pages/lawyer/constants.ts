/** Short bilingual labels for lawyer case codes (dispute type / case stage). */
export type Opt = { value: string; bn: string; en: string };

export const DISPUTE_TYPES: Opt[] = [
  { value: 'INJUNCTION', bn: 'অস্থায়ী নিষেধাজ্ঞা', en: 'Temporary injunction' },
  { value: 'TITLE_DECLARATION', bn: 'স্বত্ব ঘোষণা', en: 'Title declaration' },
  { value: 'PARTITION_SUIT', bn: 'বণ্টন মোকদ্দমা', en: 'Partition suit' },
  { value: 'SPECIFIC_PERFORMANCE', bn: 'চুক্তি বলবৎকরণ', en: 'Specific performance' },
  { value: 'POSSESSION_RECOVERY', bn: 'দখল পুনরুদ্ধার', en: 'Recovery of possession' },
  { value: 'RECORD_CORRECTION', bn: 'রেকর্ড সংশোধন', en: 'Record correction' },
  { value: 'EVICTION', bn: 'উচ্ছেদ মোকদ্দমা', en: 'Eviction suit' },
];

export const CASE_STAGES: Opt[] = [
  { value: 'STATUS_QUO_ISSUED', bn: 'স্থিতাবস্থা জারি', en: 'Status quo issued' },
  { value: 'INJUNCTION_GRANTED', bn: 'নিষেধাজ্ঞা মঞ্জুর', en: 'Injunction granted' },
  { value: 'PLAINT_ADMITTED', bn: 'আরজি গৃহীত', en: 'Plaint admitted' },
  { value: 'WRITTEN_STATEMENT', bn: 'লিখিত জবাব', en: 'Written statement' },
  { value: 'TRIAL_HEARING', bn: 'শুনানি চলছে', en: 'Trial / hearing' },
  { value: 'APPEAL_PENDING', bn: 'আপিল বিচারাধীন', en: 'Appeal pending' },
];

export const optLabel = (list: Opt[], value: string | null | undefined, lang: 'bn' | 'en') => {
  if (!value) return '—';
  const hit = list.find((o) => o.value === value);
  return hit ? (lang === 'bn' ? hit.bn : hit.en) : value.replace(/_/g, ' ').toLowerCase();
};

export const fmtDate = (iso: string | null | undefined, lang: 'bn' | 'en', withTime = false) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const loc = lang === 'bn' ? 'bn-BD' : 'en-GB';
  return withTime
    ? d.toLocaleString(loc, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' });
};

export type WizardStep = 1 | 2 | 3;
export const STEP_IDS: Record<WizardStep, string> = { 1: 'step1', 2: 'step2', 3: 'step3' };
