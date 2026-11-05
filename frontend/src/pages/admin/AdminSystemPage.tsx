import React, { useState, useEffect } from 'react';
import {
  Radio,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Lock,
  Save,
  Megaphone,
} from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi, EmergencyBroadcastState } from '@/api/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const AdminSystemPage: React.FC = () => {
  const { lang, t } = useAppUI();
  const [broadcast, setBroadcast] = useState<EmergencyBroadcastState>({
    is_active: false,
    message_bn: 'সারাদেশে জরুরি ডাটাবেজ ব্যাকআপ ও জরিপ সমন্বয় কার্যক্রম চলছে। সাময়িক বিলম্বের জন্য দুঃখিত।',
    message_en: 'Emergency maintenance underway across all sub-registries.',
    level: 'WARNING',
  });
  const [savingBroadcast, setSavingBroadcast] = useState(false);
  const [broadcastSaved, setBroadcastSaved] = useState(false);

  // Document security config
  const [qrSalt, setQrSalt] = useState('BHUMISHIELD-GOV-BD-SECRET-2026');
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [securitySaved, setSecuritySaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    BhumiApi.getEmergencyBroadcast()
      .then((res) => {
        if (mounted && res) {
          setBroadcast({
            is_active: !!res.is_active,
            message_bn: res.message_bn || broadcast.message_bn,
            message_en: res.message_en || broadcast.message_en,
            level: res.level || 'WARNING',
          });
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveBroadcast = async () => {
    try {
      setSavingBroadcast(true);
      await BhumiApi.updateEmergencyBroadcast(broadcast);
      setBroadcastSaved(true);
      setTimeout(() => setBroadcastSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingBroadcast(false);
    }
  };

  const handleSaveSecurity = async () => {
    try {
      setSavingSecurity(true);
      await BhumiApi.updateDocumentSecurityConfig({
        qr_salt: qrSalt,
        watermark_enabled: watermarkEnabled,
      });
      setSecuritySaved(true);
      setTimeout(() => setSecuritySaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingSecurity(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 p-3 sm:p-4 max-w-7xl mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        {/* 1. Emergency Broadcast Controller */}
        <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
          <CardHeader className="p-3 sm:p-3.5 pb-2 border-b border-border/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
                <Megaphone className="size-4 text-rose-600" />
                <span>{t('জরুরি বার্তা ব্যানার', 'Emergency Banner')}</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[10px] font-mono font-bold px-2 py-0.5 ${broadcast.is_active ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse' : 'bg-muted/40 text-muted-foreground'}`}>
                  {broadcast.is_active ? t('🔴 সক্রিয়', '🔴 Live') : t('⚪ নিষ্ক্রিয়', '⚪ Inactive')}
                </Badge>
                <Switch
                  checked={broadcast.is_active}
                  onCheckedChange={(checked) => setBroadcast((b) => ({ ...b, is_active: checked }))}
                />
              </div>
            </div>
            <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
              {t('নাগরিক ও কর্মকর্তাদের জন্য সাইট-ওয়াইড জরুরি সতর্কবার্তা ব্যানার।', 'Warning banner for citizens and officers.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-3.5 space-y-2.5 text-xs">
            {broadcastSaved && (
              <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900 py-1.5 px-2.5 rounded-lg">
                <CheckCircle2 className="size-3.5 text-emerald-700" />
                <AlertDescription className="text-xs font-bold">
                  {t('জরুরি বার্তা সফলভাবে আপডেট হয়েছে!', 'Emergency broadcast updated!')}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-foreground">{t('সতর্কতার স্তর:', 'Alert Level:')}</label>
              <Select
                value={broadcast.level}
                onValueChange={(val: any) => setBroadcast((b) => ({ ...b, level: val }))}
              >
                <SelectTrigger className="h-8 text-xs rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="URGENT">{t('জরুরি (লাল)', 'Urgent')}</SelectItem>
                  <SelectItem value="WARNING">{t('সতর্কতা (হলুদ)', 'Warning')}</SelectItem>
                  <SelectItem value="INFO">{t('তথ্য (নীল)', 'Info')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-foreground">{t('বার্তা (বাংলা):', 'Message (Bangla):')}</label>
              <Textarea
                rows={2}
                value={broadcast.message_bn}
                onChange={(e) => setBroadcast((b) => ({ ...b, message_bn: e.target.value }))}
                className="text-xs rounded-lg min-h-[56px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-foreground">{t('বার্তা (ইংরেজি):', 'Message (English):')}</label>
              <Textarea
                rows={2}
                value={broadcast.message_en}
                onChange={(e) => setBroadcast((b) => ({ ...b, message_en: e.target.value }))}
                className="text-xs rounded-lg min-h-[56px]"
              />
            </div>
          </CardContent>
          <CardFooter className="border-t border-border/60 p-2 sm:p-2.5 flex justify-end">
            <Button
              size="sm"
              onClick={handleSaveBroadcast}
              disabled={savingBroadcast}
              className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5 shadow-2xs"
            >
              <Save className="size-3.5" />
              <span>{savingBroadcast ? t('সংরক্ষণ হচ্ছে...', 'Saving...') : t('প্রচার করুন', 'Broadcast')}</span>
            </Button>
          </CardFooter>
        </Card>

        {/* 2. Cryptographic Security & Watermark Config */}
        <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
          <CardHeader className="p-3 sm:p-3.5 pb-2 border-b border-border/60">
            <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#006A4E]" />
              <span>{t('নিরাপত্তা ও ওয়াটারমার্ক', 'Security & Watermark')}</span>
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
              {t('পর্চা ও দলিলের নিরাপত্তা সল্ট এবং জলছাপ নিয়ন্ত্রণ।', 'Security salt and watermark for deeds.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-3.5 space-y-2.5 text-xs">
            {securitySaved && (
              <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900 py-1.5 px-2.5 rounded-lg">
                <CheckCircle2 className="size-3.5 text-emerald-700" />
                <AlertDescription className="text-xs font-bold">
                  {t('নিরাপত্তা সেটিংস সংরক্ষিত হয়েছে!', 'Security configuration saved!')}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-foreground">{t('কিউআর সিক্রেট সল্ট:', 'QR Secret Salt:')}</label>
              <Input
                type="password"
                value={qrSalt}
                onChange={(e) => setQrSalt(e.target.value)}
                className="h-8 text-xs font-mono rounded-lg"
              />
              <span className="text-[10px] text-muted-foreground">
                {t('কিউআর কোড জেনারেশন ও অফলাইন ক্রিপ্টো যাচাইয়ে ব্যবহৃত সিক্রেট।', 'Secret used for QR signing.')}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
              <div className="space-y-0.5">
                <div className="font-bold text-xs text-foreground">{t('সরকারি জলছাপ সক্রিয় রাখুন', 'Enable Watermark')}</div>
                <div className="text-[10px] text-muted-foreground">{t('ডাউনলোডকৃত সকল দলিলে স্বয়ংক্রিয় জলছাপ যুক্ত হবে।', 'Adds watermark on downloaded deeds.')}</div>
              </div>
              <Switch checked={watermarkEnabled} onCheckedChange={setWatermarkEnabled} />
            </div>

            <div className="p-2.5 rounded-lg border bg-emerald-50/70 border-emerald-200 text-emerald-900 space-y-0.5">
              <div className="font-bold text-xs flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                <span>{t('এড২২৫১৯ ডিজিটাল স্বাক্ষর ইঞ্জিন সক্রিয়', 'Ed25519 Signature Active')}</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-snug">
                {t('দলিল নিবন্ধনে সাব-রেজিস্ট্রারের ডিজিটাল সিল ব্যবহৃত হয় এবং কেন্দ্রীয় লেজারে হ্যাশ লিপিবদ্ধ থাকে।', 'Registrar key pair signs transactions before ledger.')}
              </p>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border/60 p-2 sm:p-2.5 flex justify-end">
            <Button
              size="sm"
              onClick={handleSaveSecurity}
              disabled={savingSecurity}
              className="h-8 px-3 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs gap-1.5 shadow-2xs"
            >
              <Save className="size-3.5" />
              <span>{savingSecurity ? t('সংরক্ষণ হচ্ছে...', 'Saving...') : t('সংরক্ষণ করুন', 'Save')}</span>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
