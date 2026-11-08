import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Calculator,
  Compass,
  FileText,
  HelpCircle,
  ImageOff,
  Loader2,
  MapPin,
  PhoneCall,
  Plus,
  QrCode,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { publicQueryKeys } from '@/components/publicHooks';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminPage, Field, Section, inputCls, notify } from '@/components/admin/kit';
import {
  AVAILABLE_FLOATING_ICONS,
  DEFAULT_FLOATING_BUTTONS,
  FloatingActionButtonConfig,
  PRESET_FLOATING_COLORS,
  getFloatingButtons,
  saveFloatingButtons,
} from '@/lib/floatingButtons';

/* ------------------------------------------------------------------ */
/* Settings schema (only keys the backend actually stores)             */
/* ------------------------------------------------------------------ */

type TextKey =
  | 'govt_logo_url'
  | 'govt_title_bn'
  | 'govt_title_en'
  | 'ministry_title_bn'
  | 'ministry_title_en'
  | 'portal_title_bn'
  | 'portal_title_en'
  | 'ministry_banner_bn'
  | 'helpline_number'
  | 'office_hours_bn'
  | 'rapid_resale_days';
type FlagKey = 'require_mock_nid_check' | 'auto_queue_emutation' | 'public_qr_verification_enabled';
type SettingKey = TextKey | FlagKey;

const TEXT_KEYS: TextKey[] = [
  'govt_logo_url',
  'govt_title_bn',
  'govt_title_en',
  'ministry_title_bn',
  'ministry_title_en',
  'portal_title_bn',
  'portal_title_en',
  'ministry_banner_bn',
  'helpline_number',
  'office_hours_bn',
  'rapid_resale_days',
];
const FLAG_KEYS: FlagKey[] = ['require_mock_nid_check', 'auto_queue_emutation', 'public_qr_verification_enabled'];
const ALL_KEYS: SettingKey[] = [...TEXT_KEYS, ...FLAG_KEYS];

/** Form values are always strings; flags are 'true' / 'false'. */
type FormValues = Record<SettingKey, string>;

const EMPTY_FORM = ALL_KEYS.reduce((acc, k) => ({ ...acc, [k]: '' }), {} as FormValues);

const toText = (v: unknown) => (v === null || v === undefined ? '' : typeof v === 'string' ? v : String(v));
const toFlag = (v: unknown) => (v === true || v === 1 || v === 'true' || v === '1' ? 'true' : 'false');

const FLAG_LABELS: Record<FlagKey, [string, string]> = {
  require_mock_nid_check: ['এনআইডি যাচাই বাধ্যতামূলক', 'NID check required'],
  auto_queue_emutation: ['স্বয়ংক্রিয় নামজারি', 'Auto mutation'],
  public_qr_verification_enabled: ['খোলা কিউআর যাচাই', 'Public QR check'],
};

const LOGO_PRESETS: Array<{ url: string; bn: string; en: string }> = [
  { url: '/assets/bd-govt-seal.svg', bn: 'সরকারি সিল', en: 'Govt seal' },
  { url: '/assets/bhumishield-emblem.svg', bn: 'ভূমি সুরক্ষা সিল', en: 'BhumiShield seal' },
];

/* ------------------------------------------------------------------ */
/* Floating buttons (stored in this browser)                           */
/* ------------------------------------------------------------------ */

const FLOAT_ICONS: Record<string, React.ElementType> = {
  PhoneCall,
  BookOpen,
  Compass,
  HelpCircle,
  Sparkles,
  Calculator,
  QrCode,
  ShieldCheck,
  MapPin,
  FileText,
};

const FLOAT_ACTIONS: Array<{ id: FloatingActionButtonConfig['action']; bn: string; en: string }> = [
  { id: 'support_modal', bn: 'সহায়তা', en: 'Support' },
  { id: 'product_tour', bn: 'গাইড', en: 'Guide' },
  { id: 'faraiz_calculator', bn: 'ফারায়েজ হিসাব', en: 'Inheritance calc' },
  { id: 'verify_qr', bn: 'কিউআর যাচাই', en: 'QR check' },
  { id: 'navigate_map', bn: 'মানচিত্র', en: 'Map' },
];

const FloatIcon: React.FC<{ name: string; className?: string }> = ({ name, className = 'size-4' }) => {
  const Icon = FLOAT_ICONS[name] || HelpCircle;
  return <Icon className={className} />;
};

/* ------------------------------------------------------------------ */

const LogoThumb: React.FC<{ src: string }> = ({ src }) => {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  return (
    <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-1.5">
      {src && !broken ? (
        <img src={src} alt="" className="size-full object-contain" onError={() => setBroken(true)} />
      ) : (
        <ImageOff className="size-5 text-slate-300" />
      )}
    </span>
  );
};

export const AdminSettingsPage: React.FC = () => {
  const { lang, t } = useAppUI();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('brand');

  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [saved, setSaved] = useState<FormValues>(EMPTY_FORM);

  const [buttons, setButtons] = useState<FloatingActionButtonConfig[]>(getFloatingButtons);
  const [savedButtons, setSavedButtons] = useState<FloatingActionButtonConfig[]>(getFloatingButtons);

  const load = async () => {
    setLoading(true);
    try {
      const res = await BhumiApi.getSettings();
      const s = res?.settings || {};
      const next = { ...EMPTY_FORM };
      TEXT_KEYS.forEach((k) => (next[k] = toText(s[k])));
      FLAG_KEYS.forEach((k) => (next[k] = toFlag(s[k])));
      setForm(next);
      setSaved(next);
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const changedKeys = useMemo(() => ALL_KEYS.filter((k) => form[k] !== saved[k]), [form, saved]);
  const buttonsChanged = useMemo(() => JSON.stringify(buttons) !== JSON.stringify(savedButtons), [buttons, savedButtons]);
  const dirty = changedKeys.length > 0 || buttonsChanged;

  const set = (key: SettingKey, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const setFlag = (key: FlagKey, on: boolean) => set(key, on ? 'true' : 'false');

  const resetAll = () => {
    setForm(saved);
    setButtons(savedButtons);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      if (changedKeys.length > 0) {
        const payload: Record<string, string> = {};
        changedKeys.forEach((k) => {
          payload[k] = form[k].trim();
        });
        await BhumiApi.updateSettings(payload);
        queryClient.invalidateQueries({ queryKey: publicQueryKeys.siteSettings });
        setSaved((prev) => ({ ...prev, ...payload }));
        setForm((prev) => ({ ...prev, ...payload }));
      }
      if (buttonsChanged) {
        saveFloatingButtons(buttons);
        setSavedButtons(buttons);
      }
      notify.ok(t('সংরক্ষণ হয়েছে', 'Saved'));
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setSaving(false);
    }
  };

  const onLogoFile = (file?: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      notify.err(null, lang, t('ফাইল ২ মেগাবাইটের বেশি', 'File is over 2 MB'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' && set('govt_logo_url', reader.result);
    reader.onerror = () => notify.err(null, lang, t('ফাইল পড়া যায়নি', 'Could not read file'));
    reader.readAsDataURL(file);
  };

  const updateButton = (idx: number, patch: Partial<FloatingActionButtonConfig>) =>
    setButtons((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));

  const addButton = () =>
    setButtons((prev) => [
      ...prev,
      {
        id: `btn_${Date.now()}`,
        isActive: true,
        icon: 'Sparkles',
        bgColor: '#006A4E',
        labelBn: '',
        labelEn: '',
        action: 'support_modal',
      },
    ]);

  const text = (key: TextKey, label: string, opts: { placeholder?: string; className?: string; type?: string } = {}) => (
    <Field label={label} className={opts.className}>
      <input
        type={opts.type || 'text'}
        className={inputCls}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={opts.placeholder}
        disabled={loading}
      />
    </Field>
  );

  const logo = form.govt_logo_url;
  const logoIsData = logo.startsWith('data:');

  return (
    <AdminPage className="max-w-4xl">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-9">
          <TabsTrigger value="brand">{t('লোগো ও নাম', 'Logo & name')}</TabsTrigger>
          <TabsTrigger value="contact">{t('যোগাযোগ', 'Contact')}</TabsTrigger>
          <TabsTrigger value="rules">{t('নিয়ম', 'Rules')}</TabsTrigger>
          <TabsTrigger value="buttons">{t('সহায়তা বাটন', 'Help buttons')}</TabsTrigger>
        </TabsList>

        <TabsContent value="brand" className="space-y-4">
          <Section title={t('লোগো', 'Logo')} bodyClassName="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <LogoThumb src={logo} />
              <div className="min-w-0 flex-1 space-y-2">
                <Field label={t('লোগোর ঠিকানা', 'Logo address')}>
                  <input
                    className={cn(inputCls, 'font-mono text-xs')}
                    value={logoIsData ? t('আপলোড করা ছবি', 'Uploaded image') : logo}
                    readOnly={logoIsData}
                    onChange={(e) => set('govt_logo_url', e.target.value)}
                    placeholder="/assets/…"
                    disabled={loading}
                  />
                </Field>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      onLogoFile(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => fileRef.current?.click()}
                    disabled={loading}
                  >
                    <Upload className="size-3.5" />
                    {t('আপলোড', 'Upload')}
                  </Button>
                  {LOGO_PRESETS.map((p) => (
                    <Button
                      key={p.url}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn('h-8', logo === p.url && 'border-[#006A4E] text-[#006A4E]')}
                      onClick={() => set('govt_logo_url', p.url)}
                      disabled={loading}
                    >
                      {t(p.bn, p.en)}
                    </Button>
                  ))}
                  {logoIsData && (
                    <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => set('govt_logo_url', saved.govt_logo_url)}>
                      {t('আগেরটি', 'Previous')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Section>

          <Section title={t('নাম', 'Names')} bodyClassName="grid gap-3 p-4 sm:grid-cols-2">
            {text('govt_title_bn', t('সরকার (বাংলা)', 'Government (Bangla)'))}
            {text('govt_title_en', t('সরকার (ইংরেজি)', 'Government (English)'))}
            {text('ministry_title_bn', t('মন্ত্রণালয় (বাংলা)', 'Ministry (Bangla)'))}
            {text('ministry_title_en', t('মন্ত্রণালয় (ইংরেজি)', 'Ministry (English)'))}
            {text('portal_title_bn', t('পোর্টাল (বাংলা)', 'Portal (Bangla)'))}
            {text('portal_title_en', t('পোর্টাল (ইংরেজি)', 'Portal (English)'))}
            {text('ministry_banner_bn', t('ব্যানার লেখা', 'Banner text'), { className: 'sm:col-span-2' })}
          </Section>
        </TabsContent>

        <TabsContent value="contact">
          <Section title={t('যোগাযোগ', 'Contact')} bodyClassName="grid gap-3 p-4 sm:grid-cols-2">
            {text('helpline_number', t('হটলাইন', 'Helpline'), { placeholder: '১৬১২২' })}
            {text('office_hours_bn', t('অফিস সময়', 'Office hours'))}
          </Section>
        </TabsContent>

        <TabsContent value="rules">
          <Section title={t('নিয়ম', 'Rules')} bodyClassName="space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('দ্রুত বিক্রি সতর্কতা (দিন)', 'Quick resale alert (days)')}>
                <input
                  type="number"
                  min={1}
                  max={3650}
                  className={inputCls}
                  value={form.rapid_resale_days}
                  onChange={(e) => set('rapid_resale_days', e.target.value)}
                  disabled={loading}
                />
              </Field>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {FLAG_KEYS.map((k) => (
                <label
                  key={k}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5"
                >
                  <span className="text-sm text-slate-700">{t(FLAG_LABELS[k][0], FLAG_LABELS[k][1])}</span>
                  <Switch checked={form[k] === 'true'} onCheckedChange={(on) => setFlag(k, on)} disabled={loading} />
                </label>
              ))}
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="buttons">
          <Section
            title={t('সহায়তা বাটন', 'Help buttons')}
            action={
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => setButtons(DEFAULT_FLOATING_BUTTONS)}
                >
                  <RotateCcw className="size-3.5" />
                  {t('আগের মতো', 'Default')}
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={addButton}>
                  <Plus className="size-3.5" />
                  {t('যোগ করুন', 'Add')}
                </Button>
              </div>
            }
            bodyClassName="divide-y divide-slate-100"
          >
            {buttons.map((b, idx) => (
              <div key={b.id} className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: b.bgColor }}
                  >
                    <FloatIcon name={b.icon} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                    {(lang === 'bn' ? b.labelBn : b.labelEn) || '—'}
                  </span>
                  <Switch checked={b.isActive} onCheckedChange={(on) => updateButton(idx, { isActive: on })} />
                  {buttons.length > 1 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-slate-400 hover:text-rose-600"
                          onClick={() => setButtons((prev) => prev.filter((_, i) => i !== idx))}
                          aria-label={t('মুছুন', 'Remove')}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('মুছুন', 'Remove')}</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t('লেখা (বাংলা)', 'Label (Bangla)')}>
                    <input className={inputCls} value={b.labelBn} onChange={(e) => updateButton(idx, { labelBn: e.target.value })} />
                  </Field>
                  <Field label={t('লেখা (ইংরেজি)', 'Label (English)')}>
                    <input className={inputCls} value={b.labelEn} onChange={(e) => updateButton(idx, { labelEn: e.target.value })} />
                  </Field>
                  <Field label={t('আইকন', 'Icon')}>
                    <Select value={b.icon} onValueChange={(v) => updateButton(idx, { icon: v })}>
                      <SelectTrigger className="h-9 w-full rounded-lg text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_FLOATING_ICONS.map((ico) => (
                          <SelectItem key={ico.key} value={ico.key} className="text-sm">
                            <span className="flex items-center gap-2">
                              <FloatIcon name={ico.key} className="size-3.5" />
                              {ico.label.split(' / ')[0]}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={t('কাজ', 'Action')}>
                    <Select
                      value={b.action}
                      onValueChange={(v) => updateButton(idx, { action: v as FloatingActionButtonConfig['action'] })}
                    >
                      <SelectTrigger className="h-9 w-full rounded-lg text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FLOAT_ACTIONS.map((a) => (
                          <SelectItem key={a.id} value={a.id} className="text-sm">
                            {t(a.bn, a.en)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">{t('রং', 'Colour')}</span>
                  {PRESET_FLOATING_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => updateButton(idx, { bgColor: c.hex })}
                      style={{ backgroundColor: c.hex }}
                      aria-label={c.hex}
                      className={cn(
                        'size-6 cursor-pointer rounded-full ring-offset-2 transition',
                        b.bgColor.toLowerCase() === c.hex.toLowerCase() ? 'ring-2 ring-slate-900' : 'hover:ring-2 hover:ring-slate-300'
                      )}
                    />
                  ))}
                  <input
                    type="color"
                    value={b.bgColor}
                    onChange={(e) => updateButton(idx, { bgColor: e.target.value })}
                    className="h-6 w-8 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                    aria-label={t('অন্য রং', 'Custom colour')}
                  />
                </div>
              </div>
            ))}
          </Section>
        </TabsContent>
      </Tabs>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 z-10 rounded-xl border border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center justify-end gap-2">
          <span className={cn('mr-auto text-xs', dirty ? 'text-amber-700' : 'text-slate-400')}>
            {dirty ? t('পরিবর্তন সংরক্ষণ হয়নি', 'Unsaved changes') : t('সব সংরক্ষিত', 'All saved')}
          </span>
          <Button variant="outline" size="sm" className="h-9" onClick={resetAll} disabled={!dirty || saving}>
            {t('বাতিল', 'Discard')}
          </Button>
          <Button size="sm" className="h-9 min-w-24 gap-1.5" onClick={saveAll} disabled={!dirty || saving || loading}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {t('সংরক্ষণ', 'Save')}
          </Button>
        </div>
      </div>
    </AdminPage>
  );
};
