import React, { useEffect, useRef, useState } from 'react';
import { ImageUp, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { notify } from '@/components/admin/kit';
import { makeDetector, parseScanned, type Target } from './qr';

/**
 * Camera QR scanner using the browser BarcodeDetector. Falls back to picking a photo.
 * The camera stream is stopped whenever the dialog closes or the component unmounts.
 */
export const QrScanDialog: React.FC<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onResult: (t: Target) => void;
  t: (bn: string, en: string) => string;
}> = ({ open, onOpenChange, onResult, t }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [camera, setCamera] = useState<'starting' | 'on' | 'off'>('starting');
  const [reading, setReading] = useState(false);
  const doneRef = useRef(false);

  const finish = (raw: string) => {
    if (doneRef.current) return true;
    const target = parseScanned(raw);
    if (!target) return false;
    doneRef.current = true;
    onOpenChange(false);
    onResult(target);
    return true;
  };

  useEffect(() => {
    if (!open) return;
    doneRef.current = false;
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let cancelled = false;
    let warned = false;
    const detector = makeDetector();
    setCamera('starting');

    const start = async () => {
      if (!detector || !navigator.mediaDevices?.getUserMedia) {
        setCamera('off');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play().catch(() => undefined);
        setCamera('on');
        const tick = async () => {
          if (cancelled || doneRef.current) return;
          try {
            if (v.readyState >= 2) {
              const codes = await detector.detect(v);
              for (const c of codes) {
                if (finish(c.rawValue)) return;
                if (!warned) {
                  warned = true;
                  notify.err(null, 'bn', t('এই QR দলিলের নয়', 'This QR is not a deed code'));
                }
              }
            }
          } catch {
            /* frame not ready */
          }
          timer = window.setTimeout(tick, 300);
        };
        tick();
      } catch {
        if (!cancelled) setCamera('off');
      }
    };
    start();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      stream?.getTracks().forEach((tr) => tr.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const fromFile = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
      notify.err(null, 'bn', t('ছবি ফাইল দিন (১০ MB-এর কম)', 'Choose an image under 10 MB'));
      return;
    }
    const detector = makeDetector();
    if (!detector) return;
    setReading(true);
    try {
      const bmp = await createImageBitmap(file);
      const codes = await detector.detect(bmp);
      bmp.close?.();
      if (!codes.some((c) => finish(c.rawValue))) {
        notify.err(null, 'bn', t('ছবিতে দলিলের QR পাওয়া যায়নি', 'No deed QR found in the image'));
      }
    } catch {
      notify.err(null, 'bn', t('ছবি পড়া যায়নি', 'Could not read the image'));
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>{t('QR স্ক্যান', 'Scan QR')}</DialogTitle>
          <DialogDescription>{t('দলিলের QR ফ্রেমের মাঝে ধরুন', 'Hold the deed QR inside the frame')}</DialogDescription>
        </DialogHeader>

        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-900">
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
          {camera === 'on' && (
            <div className="pointer-events-none absolute inset-[15%] rounded-xl border-2 border-white/80" />
          )}
          {camera !== 'on' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-slate-200">
              {camera === 'starting' ? (
                <Loader2 className="size-6 animate-spin" />
              ) : (
                <span>{t('ক্যামেরা চালু হয়নি। ছবি থেকে দিন', 'Camera not available. Use a photo')}</span>
              )}
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => fromFile(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={reading}
          onClick={() => fileRef.current?.click()}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
        >
          {reading ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4 text-[#006A4E]" />}
          {t('ছবি থেকে', 'From photo')}
        </button>
      </DialogContent>
    </Dialog>
  );
};
