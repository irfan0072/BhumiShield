import React, { useEffect, useRef, useState } from 'react';
import { FileCheck2, FlaskConical, Landmark, Loader2, QrCode, ScanLine, ShieldCheck } from 'lucide-react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { notify } from '@/components/admin/kit';
import { PublicCard, PublicHero } from '@/components/public/PublicPage';
import { MAX_CODE, cleanCode, kindOf, qrSupported, safeHash, targetFromUrl, type Kind, type Target } from './verify/qr';
import { QrScanDialog } from './verify/QrScanDialog';
import { PRINT_ID, VerifyResultCard, type VerifyResult } from './verify/VerifyResultCard';

const EXAMPLES: Record<Kind, Array<{ code: string; bn: string; en: string }>> = {
  deed: [
    { code: 'DL-2026-1001', bn: 'সঠিক', en: 'genuine' },
    { code: 'DL-2026-1005', bn: 'পরিবর্তিত', en: 'altered' },
    { code: 'DL-2026-1002', bn: 'সাভার', en: 'Savar' },
  ],
  noc: [{ code: 'NOC-2026-8801', bn: 'সঠিক', en: 'genuine' }],
};

const PRINT_CSS = `@media print{body *{visibility:hidden!important}#${PRINT_ID},#${PRINT_ID} *{visibility:visible!important}#${PRINT_ID}{position:absolute;left:0;top:0;width:100%;border:0}}`;

/** Reads ?code= / ?deed_no= / ?noc_no= / ?h= / ?kind=noc (and /verify/<id> links) once. */
const readInitial = (): { kind: Kind; target: Target | null } => {
  try {
    const url = new URL(window.location.href);
    const target = targetFromUrl(url);
    const kind: Kind = target?.kind || (url.searchParams.get('kind') === 'noc' ? 'noc' : 'deed');
    return { kind, target };
  } catch {
    return { kind: 'deed', target: null };
  }
};

const syncUrl = (target: Target) => {
  try {
    const url = new URL(window.location.href);
    ['deed_no', 'noc_no', 'h', 'kind', 'code'].forEach((p) => url.searchParams.delete(p));
    url.searchParams.set('code', target.code);
    if (target.kind === 'noc') url.searchParams.set('kind', 'noc');
    if (target.hash) url.searchParams.set('h', target.hash);
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    /* ignore */
  }
};

export const VerifyDeedQrPage: React.FC = () => {
  const { lang, t, formatDate } = useAppUI();
  const num = (v: any) => toBanglaDigits(v ?? '—', lang);

  const [init] = useState(readInitial);
  const [kind, setKind] = useState<Kind>(init.kind);
  const [codes, setCodes] = useState<Record<Kind, string>>({
    deed: init.target?.kind === 'deed' ? init.target.code : '',
    noc: init.target?.kind === 'noc' ? init.target.code : '',
  });
  // Hash prefix from a QR link (?h=). Only valid together with the code it came with.
  const [linkHash, setLinkHash] = useState<{ code: string; hash: string } | null>(
    init.target?.hash ? { code: init.target.code, hash: init.target.hash } : null
  );
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [canScan, setCanScan] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    qrSupported().then((ok) => alive && setCanScan(ok));
    return () => {
      alive = false;
    };
  }, []);

  const verify = async (target: Target, updateUrl = true): Promise<VerifyResult | null> => {
    if (!target.code || busy.current) return null;
    busy.current = true;
    setLoading(true);
    if (updateUrl) syncUrl(target);
    let next: VerifyResult | null = null;
    try {
      if (target.kind === 'noc') {
        const res = await BhumiApi.verifyNocByCode(target.code, target.hash);
        const ok = Boolean(res?.valid || res?.verified || res?.is_valid);
        next = { kind: 'noc', code: target.code, outcome: ok ? 'valid' : 'changed', data: res };
      } else {
        const res = await BhumiApi.verifyDeedByCode(target.code, target.hash);
        const p = res?.cryptographic_proof || {};
        const outcome = res?.verified
          ? 'valid'
          : target.hash && p.hash_matches && p.signature_valid
          ? 'qr_mismatch'
          : 'changed';
        next = { kind: 'deed', code: target.code, outcome, data: res };
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        next = { kind: target.kind, code: target.code, outcome: 'notfound' };
      } else {
        notify.err(err, lang, t('সার্ভারে যোগাযোগ হয়নি। আবার চেষ্টা করুন', 'Server not reachable. Try again'));
      }
    } finally {
      busy.current = false;
      setLoading(false);
    }
    setResult(next);
    return next;
  };

  useEffect(() => {
    if (init.target) verify(init.target, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = (k: Kind, raw: string, hash: string | null = null) => {
    const code = cleanCode(raw);
    if (!code) return;
    // A different code drops the hash that belonged to the original QR link.
    const h = hash || (linkHash && linkHash.code === code ? linkHash.hash : null);
    if (!h && linkHash) setLinkHash(null);
    verify({ kind: k, code, hash: h });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run(kind, codes[kind]);
  };

  const onScanned = (target: Target) => {
    const k = target.kind;
    setKind(k);
    setCodes((c) => ({ ...c, [k]: target.code }));
    const h = safeHash(target.hash);
    setLinkHash(h ? { code: target.code, hash: h } : null);
    verify({ kind: k, code: target.code, hash: h });
  };

  const runDemo = async (mode: 'tamper' | 'restore') => {
    if (!result || result.kind !== 'deed' || !result.data || demoBusy || loading) return;
    const deedNo = cleanCode(result.data?.deed?.deed_no || result.code);
    setDemoBusy(true);
    try {
      if (mode === 'tamper') await BhumiApi.tamperDeedDemo(deedNo, 99.99);
      else await BhumiApi.restoreDeedDemo(deedNo);
      const r = await verify({ kind: 'deed', code: result.code, hash: null });
      if (r) {
        const ok = r.outcome === 'valid';
        (ok ? notify.ok : (m: string) => notify.err(null, lang, m))(
          ok
            ? t('দলিল আগের অবস্থায় ফিরেছে, এখন সঠিক', 'Deed restored, now genuine')
            : t('জমির পরিমাণ বদলানো হয়েছে, পরিবর্তন ধরা পড়েছে', 'Area changed, alteration detected')
        );
      }
    } catch (err) {
      notify.err(err, lang, t('ডেমো চালানো যায়নি', 'Demo failed'));
    } finally {
      setDemoBusy(false);
    }
  };

  const shown = result && result.kind === kind ? result : null;
  const code = codes[kind];

  const demoButton =
    shown && shown.kind === 'deed' && shown.data ? (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            <FlaskConical className="size-4" />
            {t('ডেমো', 'Demo')}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 space-y-3 p-3">
          <p className="text-sm text-slate-600">
            {t('রেকর্ড বদলালে সিস্টেম কীভাবে ধরে, তা দেখুন', 'See how the system catches a changed record')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={demoBusy || loading}
              onClick={() => runDemo('tamper')}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60 cursor-pointer"
            >
              {demoBusy && <Loader2 className="size-4 animate-spin" />}
              {t('বদলান', 'Alter')}
            </button>
            <button
              type="button"
              disabled={demoBusy || loading}
              onClick={() => runDemo('restore')}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#006A4E] text-sm font-medium text-white hover:bg-[#00553e] disabled:opacity-60 cursor-pointer"
            >
              {demoBusy && <Loader2 className="size-4 animate-spin" />}
              {t('ঠিক করুন', 'Restore')}
            </button>
          </div>
        </PopoverContent>
      </Popover>
    ) : null;

  return (
    <div className="bg-slate-50/60">
      <style>{PRINT_CSS}</style>
      <PublicHero
        image="digital-mouza-map"
        tone="dark"
        icon={QrCode}
        title={t('দলিল যাচাই', 'Verify deed')}
        subtitle={t('দলিল আসল কিনা এক মিনিটে দেখুন', 'Check if a deed is genuine')}
      >
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <PublicCard className="print:hidden">
            <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)}>
              <TabsList className="mb-3 h-10 w-full sm:w-auto">
                <TabsTrigger value="deed" className="flex-1 gap-1.5 px-3 text-sm sm:flex-none">
                  <FileCheck2 className="size-4" />
                  {t('দলিল', 'Deed')}
                </TabsTrigger>
                <TabsTrigger value="noc" className="flex-1 gap-1.5 px-3 text-sm sm:flex-none">
                  <Landmark className="size-4" />
                  {t('ব্যাংক ছাড়পত্র (NOC)', 'Bank NOC')}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={submit} className="space-y-2">
              <label htmlFor="verify-code" className="text-sm font-medium text-slate-700">
                {kind === 'noc' ? t('ছাড়পত্র নম্বর', 'NOC number') : t('দলিল নম্বর', 'Deed number')}
              </label>
              <input
                id="verify-code"
                value={code}
                onChange={(e) => setCodes((c) => ({ ...c, [kind]: e.target.value.toUpperCase().slice(0, MAX_CODE) }))}
                maxLength={MAX_CODE}
                autoComplete="off"
                spellCheck={false}
                placeholder={kind === 'noc' ? 'NOC-2026-8801' : 'DL-2026-1001'}
                className="h-12 w-full rounded-xl border border-slate-200 px-3 font-mono text-base uppercase outline-none placeholder:normal-case placeholder:text-slate-400 focus:border-[#006A4E] focus:ring-2 focus:ring-[#006A4E]/15"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#006A4E] px-5 text-sm font-medium text-white hover:bg-[#00553e] disabled:opacity-60 cursor-pointer"
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                  {t('যাচাই করুন', 'Verify')}
                </button>
                {canScan && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setScanOpen(true)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                  >
                    <ScanLine className="size-4 text-[#006A4E]" />
                    {t('QR স্ক্যান', 'Scan QR')}
                  </button>
                )}
              </div>
            </form>

            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <span>{t('উদাহরণ:', 'Examples:')}</span>
              {EXAMPLES[kind].map((ex) => (
                <button
                  key={ex.code}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setCodes((c) => ({ ...c, [kind]: ex.code }));
                    run(kindOf(ex.code, kind), ex.code);
                  }}
                  className={cn(
                    'rounded-full border px-2 py-0.5 font-mono transition cursor-pointer disabled:opacity-60',
                    code === ex.code
                      ? 'border-[#006A4E] bg-emerald-50 text-[#006A4E]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-[#006A4E]/40'
                  )}
                  title={lang === 'bn' ? ex.bn : ex.en}
                >
                  {ex.code}
                </button>
              ))}
            </div>
          </PublicCard>

          <div aria-live="polite">
            {loading && !demoBusy ? (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-56" />
                  </div>
                </div>
                <Skeleton className="h-56 w-full rounded-lg" />
              </div>
            ) : shown ? (
              <VerifyResultCard result={shown} lang={lang} t={t} num={num} formatDate={formatDate} action={demoButton} />
            ) : (
              <div className="hidden h-full min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 p-6 text-center text-white backdrop-blur-sm lg:flex">
                <ShieldCheck className="size-8 text-emerald-100" />
                <p className="text-base font-medium">{t('ফলাফল এখানে দেখাবে', 'The result will show here')}</p>
                <p className="text-sm text-emerald-50/80">
                  {t('নম্বর লিখুন বা QR স্ক্যান করুন', 'Type the number or scan the QR')}
                </p>
              </div>
            )}
          </div>
        </div>
      </PublicHero>

      {canScan && <QrScanDialog open={scanOpen} onOpenChange={setScanOpen} onResult={onScanned} t={t} />}
    </div>
  );
};
