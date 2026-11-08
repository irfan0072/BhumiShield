import React, { useState, useEffect } from 'react';
import { useAppUI } from '@/i18n';
import { AdminPage, Section, notify } from '@/components/admin/kit';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Globe, Type, Bell } from 'lucide-react';

export const CitizenSettingsPage: React.FC<{ onNavigate?: (target: string) => void }> = () => {
  const {
    lang,
    setLang,
    t,
    fontStep,
    increaseFont,
    decreaseFont,
  } = useAppUI();

  const handleResetFont = () => {
    if (fontStep < 0) {
      increaseFont();
    } else if (fontStep > 0) {
      for (let i = 0; i < fontStep; i++) {
        decreaseFont();
      }
    }
  };

  const [mutationSms, setMutationSms] = useState<boolean>(() => {
    const saved = localStorage.getItem('bs_pref_mutationsms');
    return saved !== null ? saved === '1' : true;
  });

  const [weeklyDigest, setWeeklyDigest] = useState<boolean>(() => {
    const saved = localStorage.getItem('bs_pref_weeklydigest');
    return saved !== null ? saved === '1' : false;
  });

  useEffect(() => {
    localStorage.setItem('bs_pref_mutationsms', mutationSms ? '1' : '0');
  }, [mutationSms]);

  useEffect(() => {
    localStorage.setItem('bs_pref_weeklydigest', weeklyDigest ? '1' : '0');
  }, [weeklyDigest]);

  return (
    <AdminPage fill>
      <div className="max-w-xl w-full space-y-3">
        {/* 1. Language */}
        <Section title={t('ভাষা', 'Language')} bodyClassName="p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs">
              <Globe className="size-4 text-[#006A4E]" />
              <div>
                <div className="font-medium text-foreground">
                  {t('পোর্টালের ভাষা', 'Portal Language')}
                </div>
                <div className="text-muted-foreground">
                  {t('বাংলা অথবা ইংরেজি নির্বাচন করুন', 'Choose Bangla or English')}
                </div>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={lang === 'bn' ? 'default' : 'outline'}
                onClick={() => {
                  setLang('bn');
                  notify.ok('ভাষা বাংলা করা হয়েছে।');
                }}
                className="h-8 px-3 text-xs"
              >
                বাংলা
              </Button>
              <Button
                type="button"
                size="sm"
                variant={lang === 'en' ? 'default' : 'outline'}
                onClick={() => {
                  setLang('en');
                  notify.ok('Language set to English.');
                }}
                className="h-8 px-3 text-xs"
              >
                English
              </Button>
            </div>
          </div>
        </Section>

        {/* 2. Text Size */}
        <Section title={t('লেখার আকার', 'Text Size')} bodyClassName="p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs">
              <Type className="size-4 text-[#006A4E]" />
              <div>
                <div className="font-medium text-foreground">
                  {t('ফন্টের আকার', 'Font Size')}
                </div>
                <div className="text-muted-foreground">
                  {t('পড়ার সুবিধার জন্য ছোট বা বড় করুন', 'Adjust text size for comfort')}
                </div>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={decreaseFont}
                disabled={fontStep <= -1}
                className="h-8 px-2.5 text-xs"
              >
                A−
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetFont}
                className="h-8 px-2.5 text-xs"
              >
                {t('স্বাভাবিক', 'Default')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={increaseFont}
                disabled={fontStep >= 3}
                className="h-8 px-2.5 text-xs"
              >
                A+
              </Button>
            </div>
          </div>
        </Section>

        {/* 3. Notifications */}
        <Section title={t('বার্তা ও নোটিফিকেশন', 'Notifications')} bodyClassName="p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Bell className="size-4 text-[#006A4E]" />
              <div>
                <div className="font-medium text-foreground">
                  {t('নামজারি ও হস্তান্তর এসএমএস', 'Transfer & Mutation SMS')}
                </div>
                <div className="text-muted-foreground">
                  {t('আবেদনের ধাপ পরিবর্তন হলে বার্তা পাঠান', 'Notify when transfer step updates')}
                </div>
              </div>
            </div>
            <Switch
              checked={mutationSms}
              onCheckedChange={(v) => {
                setMutationSms(v);
                notify.ok(t('সেটিংস সংরক্ষিত হয়েছে।', 'Preference saved.'));
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-border text-xs">
            <div>
              <div className="font-medium text-foreground">
                {t('সাপ্তাহিক সারসংক্ষেপ', 'Weekly Digest')}
              </div>
              <div className="text-muted-foreground">
                {t('সাপ্তাহিক ইমেইল আপডেট', 'Weekly summary email')}
              </div>
            </div>
            <Switch
              checked={weeklyDigest}
              onCheckedChange={(v) => {
                setWeeklyDigest(v);
                notify.ok(t('সেটিংস সংরক্ষিত হয়েছে।', 'Preference saved.'));
              }}
            />
          </div>
        </Section>
      </div>
    </AdminPage>
  );
};

export default CitizenSettingsPage;
