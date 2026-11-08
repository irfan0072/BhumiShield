import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Info, Loader2, Megaphone, Save, ShieldAlert } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi, EmergencyBroadcastState } from '@/api/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AdminPage, Field, Section, StatusBadge, inputCls, notify } from '@/components/admin/kit';

type Level = EmergencyBroadcastState['level'];
type Broadcast = Pick<EmergencyBroadcastState, 'is_active' | 'message_bn' | 'message_en' | 'level'>;

const EMPTY_BROADCAST: Broadcast = { is_active: false, message_bn: '', message_en: '', level: 'WARNING' };

const LEVELS: Array<{ id: Level; bn: string; en: string; strip: string; icon: React.ElementType }> = [
  { id: 'URGENT', bn: 'জরুরি', en: 'Urgent', strip: 'border-rose-200 bg-rose-50 text-rose-800', icon: ShieldAlert },
  { id: 'WARNING', bn: 'সতর্কতা', en: 'Warning', strip: 'border-amber-200 bg-amber-50 text-amber-800', icon: AlertTriangle },
  { id: 'INFO', bn: 'তথ্য', en: 'Info', strip: 'border-sky-200 bg-sky-50 text-sky-800', icon: Info },
];

/** Boolean switches of the document security config (backend: dcr_porcha_watermark_config). */
const SECURITY_KEYS: Array<{ key: string; bn: string; en: string }> = [
  { key: 'enable_custom_watermark', bn: 'সরকারি জলছাপ', en: 'Official watermark' },
  { key: 'enable_qr_validation_seal', bn: 'কিউআর সিল', en: 'QR seal' },
  { key: 'show_cryptographic_hash', bn: 'হ্যাশ কোড দেখান', en: 'Show hash code' },
  { key: 'show_tamper_warning_text', bn: 'জালিয়াতি সতর্কবার্তা', en: 'Tamper warning' },
];

type SecurityFlags = Record<string, boolean>;

const same = (a: object | null, b: object | null) => JSON.stringify(a) === JSON.stringify(b);

export const AdminSystemPage: React.FC = () => {
  const { lang, t } = useAppUI();

  const [broadcast, setBroadcast] = useState<Broadcast>(EMPTY_BROADCAST);
  const [savedBroadcast, setSavedBroadcast] = useState<Broadcast | null>(null);
  const [savingBroadcast, setSavingBroadcast] = useState(false);

  const [security, setSecurity] = useState<SecurityFlags | null>(null);
  const [savedSecurity, setSavedSecurity] = useState<SecurityFlags | null>(null);
  const [savingSecurity, setSavingSecurity] = useState(false);

  useEffect(() => {
    let mounted = true;
    BhumiApi.getEmergencyBroadcast()
      .then((res) => {
        if (!mounted) return;
        const next: Broadcast = {
          is_active: !!res?.is_active,
          message_bn: res?.message_bn || '',
          message_en: res?.message_en || '',
          level: (['URGENT', 'WARNING', 'INFO'] as Level[]).includes(res?.level as Level) ? (res.level as Level) : 'WARNING',
        };
        setBroadcast(next);
        setSavedBroadcast(next);
      })
      .catch((e) => mounted && notify.err(e, lang));

    BhumiApi.getDocumentSecurityConfig()
      .then((res: any) => {
        if (!mounted) return;
        const cfg = res?.config || {};
        const flags: SecurityFlags = {};
        SECURITY_KEYS.forEach(({ key }) => {
          flags[key] = cfg[key] === true || cfg[key] === 'true' || cfg[key] === 1;
        });
        setSecurity(flags);
        setSavedSecurity(flags);
      })
      .catch((e) => mounted && notify.err(e, lang));

    return () => {
      mounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const broadcastDirty = useMemo(() => savedBroadcast !== null && !same(broadcast, savedBroadcast), [broadcast, savedBroadcast]);
  const securityDirty = useMemo(() => security !== null && !same(security, savedSecurity), [security, savedSecurity]);
  const missingMessage = broadcast.is_active && !broadcast.message_bn.trim();

  const saveBroadcast = async () => {
    setSavingBroadcast(true);
    try {
      const payload: Broadcast = {
        ...broadcast,
        message_bn: broadcast.message_bn.trim(),
        message_en: broadcast.message_en.trim(),
      };
      await BhumiApi.updateEmergencyBroadcast(payload);
      setBroadcast(payload);
      setSavedBroadcast(payload);
      notify.ok(t('সংরক্ষণ হয়েছে', 'Saved'));
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setSavingBroadcast(false);
    }
  };

  const saveSecurity = async () => {
    if (!security) return;
    setSavingSecurity(true);
    try {
      await BhumiApi.updateDocumentSecurityConfig(security);
      setSavedSecurity(security);
      notify.ok(t('সংরক্ষণ হয়েছে', 'Saved'));
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setSavingSecurity(false);
    }
  };

  const level = LEVELS.find((l) => l.id === broadcast.level) || LEVELS[1];
  const LevelIcon = level.icon;
  const previewText = (lang === 'bn' ? broadcast.message_bn : broadcast.message_en || broadcast.message_bn).trim();

  return (
    <AdminPage className="max-w-4xl">
      <Section
        title={
          <span className="flex items-center gap-2">
            <Megaphone className="size-4 text-slate-500" />
            {t('জরুরি বার্তা', 'Emergency notice')}
          </span>
        }
        action={
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <StatusBadge tone={broadcast.is_active ? 'red' : 'slate'}>
              {broadcast.is_active ? t('চালু', 'On') : t('বন্ধ', 'Off')}
            </StatusBadge>
            <Switch
              checked={broadcast.is_active}
              disabled={savedBroadcast === null}
              onCheckedChange={(checked) => setBroadcast((b) => ({ ...b, is_active: checked }))}
              aria-label={t('জরুরি বার্তা চালু', 'Emergency notice on')}
            />
          </label>
        }
        bodyClassName="space-y-3 p-4"
      >
        <Field label={t('ধরন', 'Level')}>
          <ToggleGroup
            type="single"
            variant="outline"
            value={broadcast.level}
            onValueChange={(v) => v && setBroadcast((b) => ({ ...b, level: v as Level }))}
            className="w-full justify-start sm:w-auto"
          >
            {LEVELS.map((l) => {
              const Icon = l.icon;
              return (
                <ToggleGroupItem
                  key={l.id}
                  value={l.id}
                  className="h-9 flex-1 gap-1.5 px-3 text-sm data-[state=on]:bg-slate-900 data-[state=on]:text-white sm:flex-none"
                >
                  <Icon className="size-3.5" />
                  {t(l.bn, l.en)}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('বার্তা (বাংলা)', 'Message (Bangla)')}>
            <input
              className={inputCls}
              value={broadcast.message_bn}
              onChange={(e) => setBroadcast((b) => ({ ...b, message_bn: e.target.value }))}
              placeholder={t('বার্তা লিখুন', 'Write message')}
            />
          </Field>
          <Field label={t('বার্তা (ইংরেজি)', 'Message (English)')}>
            <input
              className={inputCls}
              value={broadcast.message_en}
              onChange={(e) => setBroadcast((b) => ({ ...b, message_en: e.target.value }))}
              placeholder="Write message"
            />
          </Field>
        </div>

        <div className="space-y-1">
          <span className="block text-xs font-medium text-slate-600">{t('প্রিভিউ', 'Preview')}</span>
          <div
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
              level.strip,
              !broadcast.is_active && 'opacity-60'
            )}
          >
            <LevelIcon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{previewText || '—'}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          {missingMessage && <span className="text-xs text-rose-600">{t('বাংলা বার্তা দিন', 'Add Bangla message')}</span>}
          <Button
            size="sm"
            className="h-9 gap-1.5"
            onClick={saveBroadcast}
            disabled={!broadcastDirty || savingBroadcast || missingMessage}
          >
            {savingBroadcast ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {t('সংরক্ষণ', 'Save')}
          </Button>
        </div>
      </Section>

      <Section title={t('দলিলের নিরাপত্তা', 'Document security')} bodyClassName="p-4">
        {security === null ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {SECURITY_KEYS.map((s) => (
              <div key={s.key} className="h-11 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {SECURITY_KEYS.map((s) => (
              <label
                key={s.key}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5"
              >
                <span className="text-sm text-slate-700">{t(s.bn, s.en)}</span>
                <Switch
                  checked={!!security[s.key]}
                  onCheckedChange={(checked) => setSecurity((prev) => ({ ...(prev || {}), [s.key]: checked }))}
                />
              </label>
            ))}
          </div>
        )}
        <div className="flex justify-end pt-3">
          <Button size="sm" className="h-9 gap-1.5" onClick={saveSecurity} disabled={!securityDirty || savingSecurity}>
            {savingSecurity ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {t('সংরক্ষণ', 'Save')}
          </Button>
        </div>
      </Section>
    </AdminPage>
  );
};
