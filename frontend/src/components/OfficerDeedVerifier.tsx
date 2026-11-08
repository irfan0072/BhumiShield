import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, SearchX, ShieldAlert } from 'lucide-react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminPage, DetailList, Section, StatusBadge, StatusCode, inputCls, notify } from '@/components/admin/kit';

interface OfficerDeedVerifierProps {
  initialCode?: string;
  onNavigateToWizard?: (plotId: number) => void;
}

type Kind = 'deed' | 'noc';
type Outcome = 'valid' | 'changed' | 'notfound';

const DEED_TYPES: Record<string, [string, string]> = {
  SALE: ['বিক্রয়', 'Sale'],
  HIBA: ['হেবা', 'Gift (Hiba)'],
  INHERITANCE: ['উত্তরাধিকার', 'Inheritance'],
  MORTGAGE: ['বন্ধক', 'Mortgage'],
};

const shortHash = (h?: string | null) => (h ? `${h.slice(0, 12)}…${h.slice(-6)}` : '—');

const readInitial = (initialCode: string) => {
  if (initialCode.trim()) return { code: initialCode.trim(), hash: null as string | null };
  try {
    const s = new URLSearchParams(window.location.search);
    const code = s.get('noc_no') || s.get('deed_no') || s.get('code') || '';
    return { code: code.trim(), hash: s.get('h')?.trim() || null };
  } catch {
    return { code: '', hash: null };
  }
};

export const OfficerDeedVerifier: React.FC<OfficerDeedVerifierProps> = ({ initialCode = '' }) => {
  const { lang, t, formatDate } = useAppUI();
  const num = (v: any) => toBanglaDigits(v ?? '—', lang);

  const [init] = useState(() => readInitial(initialCode));
  const [kind, setKind] = useState<Kind>(init.code.toUpperCase().startsWith('NOC-') ? 'noc' : 'deed');
  const [codes, setCodes] = useState<Record<Kind, string>>({
    deed: init.code && !init.code.toUpperCase().startsWith('NOC-') ? init.code : '',
    noc: init.code.toUpperCase().startsWith('NOC-') ? init.code : '',
  });
  // Hash prefix from a QR proof link (?h=...). Only applies to the code it came with.
  const [hashParam, setHashParam] = useState<string | null>(init.hash);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ kind: Kind; code: string; outcome: Outcome; data?: any } | null>(null);

  // Only `?code=` is written: App.tsx routes any URL with deed_no / noc_no / h to the public QR page,
  // so writing those here would send the officer out of the workspace on reload.
  const syncUrl = (_k: Kind, code: string, _hash: string | null) => {
    try {
      const url = new URL(window.location.href);
      ['deed_no', 'noc_no', 'h'].forEach((p) => url.searchParams.delete(p));
      url.searchParams.set('code', code);
      window.history.replaceState(window.history.state, '', url.toString());
    } catch {
      /* ignore */
    }
  };

  const verify = async (k: Kind, raw: string, hash: string | null, updateUrl = true) => {
    const code = raw.trim();
    if (!code) return;
    setLoading(true);
    if (updateUrl) syncUrl(k, code, hash);
    try {
      if (k === 'noc') {
        const res = await BhumiApi.verifyNocByCode(code, hash);
        const ok = Boolean(res.valid || res.verified || res.is_valid);
        setResult({ kind: k, code, outcome: ok ? 'valid' : 'changed', data: res });
      } else {
        const res = await BhumiApi.verifyDeedByCode(code, hash);
        setResult({ kind: k, code, outcome: res.verified ? 'valid' : 'changed', data: res });
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setResult({ kind: k, code, outcome: 'notfound' });
      } else {
        setResult(null);
        notify.err(err, lang, t('সার্ভারে যোগাযোগ হয়নি', 'Server not reachable'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (init.code) verify(kind, init.code, init.hash, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = codes[kind];
    // A typed (different) code drops the QR hash that belonged to the original link.
    const hash = code.trim() === init.code ? hashParam : null;
    if (!hash && hashParam) setHashParam(null);
    verify(kind, code, hash);
  };

  const shown = result && result.kind === kind ? result : null;

  return (
    <AdminPage>
      <Section bodyClassName="space-y-3 p-4">
        <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)}>
          <TabsList className="h-9">
            <TabsTrigger value="deed" className="px-3 text-xs">
              {t('দলিল', 'Deed')}
            </TabsTrigger>
            <TabsTrigger value="noc" className="px-3 text-xs">
              {t('ছাড়পত্র (NOC)', 'NOC')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <input
            value={codes[kind]}
            onChange={(e) => setCodes((c) => ({ ...c, [kind]: e.target.value }))}
            placeholder={kind === 'noc' ? 'NOC-2026-0001' : 'DL-2024-0001'}
            aria-label={kind === 'noc' ? t('ছাড়পত্র নম্বর', 'NOC number') : t('দলিল নম্বর', 'Deed number')}
            className={cn(inputCls, 'font-mono sm:max-w-sm')}
          />
          <Button type="submit" size="sm" className="h-9 min-w-28" disabled={loading || !codes[kind].trim()}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {t('যাচাই করুন', 'Verify')}
          </Button>
        </form>
      </Section>

      {shown && <ResultCard result={shown} lang={lang} t={t} num={num} formatDate={formatDate} />}
    </AdminPage>
  );
};

const ResultCard: React.FC<{
  result: { kind: Kind; code: string; outcome: Outcome; data?: any };
  lang: 'bn' | 'en';
  t: (bn: string, en: string) => string;
  num: (v: any) => string;
  formatDate: (v: any) => string;
}> = ({ result, lang, t, num, formatDate }) => {
  const { kind, code, outcome, data } = result;
  const L = (bn?: string, en?: string) => (lang === 'bn' ? bn || en : en || bn) || '—';

  const head = {
    valid: { tone: 'green' as const, icon: CheckCircle2, box: 'bg-emerald-50 text-emerald-700', label: t('সঠিক', 'Valid') },
    changed: { tone: 'red' as const, icon: ShieldAlert, box: 'bg-rose-50 text-rose-700', label: t('পরিবর্তিত', 'Altered') },
    notfound: { tone: 'slate' as const, icon: SearchX, box: 'bg-slate-100 text-slate-500', label: t('পাওয়া যায়নি', 'Not found') },
  }[outcome];
  const Icon = head.icon;

  const proof = data?.cryptographic_proof || {};
  const hash = proof.stored_content_hash || data?.noc_hash || data?.noc?.noc_hash;
  const qr = data?.qr_data_uri || data?.qr_svg_data_uri;
  const message = data ? L(data.message_bn, data.message_en) : t('এই নম্বরে কোনো রেকর্ড নেই', 'No record for this number');

  let items: Array<[React.ReactNode, React.ReactNode] | null | false> = [];
  if (data && kind === 'deed') {
    const d = data.deed || {};
    const type = DEED_TYPES[String(d.deed_type || '').toUpperCase()];
    items = [
      [t('দলিল নং', 'Deed no'), <span className="font-mono">{d.deed_no || code}</span>],
      [t('ধরন', 'Type'), type ? (lang === 'bn' ? type[0] : type[1]) : d.deed_type || '—'],
      [t('মৌজা ও দাগ', 'Mouza & dag'), `${L(d.mouza_bn, d.mouza_en)} · ${num(d.dag_no)}`],
      [t('জমি', 'Area'), d.area_decimal != null ? `${num(d.area_decimal)} ${t('শতাংশ', 'dec')}` : '—'],
      [t('বিক্রেতা', 'Seller'), d.seller_name_bn || '—'],
      [t('ক্রেতা', 'Buyer'), d.buyer_name_bn || '—'],
      (d.price_bdt ?? d.declared_value_bdt) != null && [
        t('মূল্য', 'Value'),
        `৳${num(Number(d.price_bdt ?? d.declared_value_bdt).toLocaleString('en-IN'))}`,
      ],
      d.created_at && [t('তারিখ', 'Date'), formatDate(d.created_at)],
      d.status && [
        t('অবস্থা', 'Status'),
        String(d.status).toUpperCase() === 'MUTATED' ? (
          <StatusBadge tone="green">{t('নামজারি সম্পন্ন', 'Mutated')}</StatusBadge>
        ) : (
          <StatusCode code={d.status} lang={lang} />
        ),
      ],
    ];
  } else if (data && kind === 'noc') {
    const n = data.noc || {};
    const amount = n.amount_bdt ?? n.loan_amount_bdt;
    items = [
      [t('ছাড়পত্র নং', 'NOC no'), <span className="font-mono">{n.noc_no || code}</span>],
      [t('ব্যাংক', 'Bank'), `${L(n.bank_name_bn, n.bank_name_en)}${n.branch_bn ? ` · ${n.branch_bn}` : ''}`],
      [t('ঋণগ্রহীতা', 'Borrower'), L(n.borrower_name_bn, n.borrower_name_en)],
      amount != null && [t('ঋণ', 'Loan'), `৳${num(Number(amount).toLocaleString('en-IN'))}`],
      (n.mouza_bn || n.dag_no) && [t('মৌজা ও দাগ', 'Mouza & dag'), `${L(n.mouza_bn, n.mouza_en)} · ${num(n.dag_no)}`],
      n.released_at && [t('মুক্তির তারিখ', 'Released'), formatDate(n.released_at)],
      (n.status || data.status) && [t('অবস্থা', 'Status'), <StatusCode code={n.status || data.status} lang={lang} />],
    ];
  }

  return (
    <Section>
      <div className="flex items-center gap-3 border-b border-slate-100 p-4">
        <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', head.box)}>
          <Icon className="size-6" />
        </span>
        <div className="min-w-0">
          <StatusBadge tone={head.tone} className="px-3 py-1 text-sm">
            {head.label}
          </StatusBadge>
          <p className="mt-1 truncate text-sm text-slate-600">{message}</p>
        </div>
      </div>
      {data && (
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1 space-y-3">
            <DetailList items={items} />
            {hash && (
              <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                <span>{t('হ্যাশ', 'Hash')}</span>
                <span className="font-mono text-slate-700" title={hash}>
                  {shortHash(hash)}
                </span>
              </div>
            )}
            {outcome === 'changed' && (
              <p className="text-xs text-rose-600">{t('মূল বালাম বহি মিলিয়ে নিন', 'Check the original volume')}</p>
            )}
          </div>
          {qr && (
            <img
              src={qr}
              alt="QR"
              className="size-28 shrink-0 self-center rounded-lg border border-slate-200 bg-white p-1.5 sm:self-start"
            />
          )}
        </div>
      )}
    </Section>
  );
};
