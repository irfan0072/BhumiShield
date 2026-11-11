import React, { useCallback, useEffect, useState } from 'react';
import { Square, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

/**
 * Detail panel for public pages: right Sheet on desktop, bottom Drawer on phones.
 * Shared by notices, land guide and sale pages.
 */
export const ResponsivePanel: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  meta?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}> = ({ open, onOpenChange, title, meta, children, footer, wide }) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
        <DrawerContent className="max-h-[88dvh] bg-white">
          <DrawerHeader className="border-b border-slate-100 px-4 pb-3 pt-2 text-left">
            <DrawerTitle className="text-base font-semibold leading-snug text-slate-900">{title}</DrawerTitle>
            <DrawerDescription asChild={!!meta} className={cn('text-xs text-slate-500', !meta && 'sr-only')}>
              {meta ? <div>{meta}</div> : title}
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
          {footer && <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3">{footer}</div>}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={cn('flex w-full flex-col gap-0 p-0', wide ? 'sm:max-w-xl' : 'sm:max-w-md')}>
        <SheetHeader className="border-b border-slate-100 px-5 py-4 pr-16 text-left">
          <SheetTitle className="text-lg font-semibold leading-snug text-slate-900">{title}</SheetTitle>
          <SheetDescription asChild={!!meta} className={cn('text-xs text-slate-500', !meta && 'sr-only')}>
            {meta ? <div>{meta}</div> : title}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
};

/** Browser read-aloud (Web Speech API). One utterance at a time; stops on unmount. */
export const useSpeech = (lang: 'bn' | 'en') => {
  const [playing, setPlaying] = useState<string | number | null>(null);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setPlaying(null);
  }, [supported]);

  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  const toggle = useCallback(
    (id: string | number, text: string) => {
      if (!supported) return false;
      window.speechSynthesis.cancel();
      if (playing === id) {
        setPlaying(null);
        return true;
      }
      const u = new SpeechSynthesisUtterance(text.slice(0, 6000));
      u.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
      u.rate = 0.95;
      u.onend = () => setPlaying(null);
      u.onerror = () => setPlaying(null);
      setPlaying(id);
      window.speechSynthesis.speak(u);
      return true;
    },
    [lang, playing, supported]
  );

  return { playing, toggle, stop, supported };
};

/** Small "Listen" button for the reader panel. */
export const ListenButton: React.FC<{ active: boolean; onClick: () => void; labels: [string, string] }> = ({
  active,
  onClick,
  labels,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition cursor-pointer',
      active ? 'border-[#006A4E] bg-[#006A4E] text-white' : 'border-slate-200 text-slate-700 hover:border-[#006A4E]/40 hover:text-[#006A4E]'
    )}
  >
    {active ? <Square className="size-3.5" /> : <Volume2 className="size-4" />}
    {active ? labels[1] : labels[0]}
  </button>
);

export type FontSize = 0 | 1 | 2;
export const fontCls: Record<FontSize, string> = { 0: 'text-[15px] leading-7', 1: 'text-[17px] leading-8', 2: 'text-[20px] leading-9' };

/** অ / অ+ / অ++ text size switch. */
export const FontSizeToggle: React.FC<{ value: FontSize; onChange: (v: FontSize) => void; label: string; glyph?: string }> = ({
  value,
  onChange,
  label,
  glyph = 'অ',
}) => (
  <div role="group" aria-label={label} className="inline-flex h-9 items-center rounded-lg border border-slate-200 p-0.5">
    {([0, 1, 2] as FontSize[]).map((s) => (
      <button
        key={s}
        type="button"
        onClick={() => onChange(s)}
        aria-pressed={value === s}
        className={cn(
          'h-full min-w-9 rounded-md px-2 font-medium transition cursor-pointer',
          s === 0 ? 'text-xs' : s === 1 ? 'text-sm' : 'text-base',
          value === s ? 'bg-emerald-50 text-[#006A4E]' : 'text-slate-500 hover:text-slate-800'
        )}
      >
        {glyph}
      </button>
    ))}
  </div>
);
