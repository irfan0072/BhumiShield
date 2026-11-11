import React from 'react';
import { CheckCircle2, Printer, SearchX, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DetailList, StatusBadge, StatusCode } from '@/components/admin/kit';
import { maskNid } from '@/theme/tokens';
import type { Kind } from './qr';

export type Outcome = 'valid' | 'changed' | 'qr_mismatch' | 'notfound';

export interface VerifyResult {
  kind: Kind;
  code: string;
  outcome: Outcome;
  data?: any;
}

const DEED_TYPES: Record<string, [string, string]> = {
  SALE: ['বিক্রয় (সাফ কবলা)', 'Sale'],
  SAF_KABALA: ['সাফ কবলা', 'Sale'],
  HIBA: ['হেবা', 'Gift (Hiba)'],
  GIFT: ['দান', 'Gift'],
  INHERITANCE: ['উত্তরাধিকার', 'Inheritance'],
  MORTGAGE: ['বন্ধক', 'Mortgage'],
  EXCHANGE: ['বিনিময়', 'Exchange'],
};

const shortHash = (h?: string | null) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : '');

export const PRINT_ID = 'verify-print-area';

export const VerifyResultCard: React.FC<{
  result: VerifyResult;
  lang: 'bn' | 'en';
  t: (bn: string, en: string) => string;
  num: (v: any) => string;
  formatDate: (v: any) => string;
  action?: React.ReactNode;
}> = ({ result, lang, t, num, formatDate, action }) => {
  const { kind, code, outcome, data } = result;
  const L = (bn?: string, en?: string) => (lang === 'bn' ? bn || en : en || bn) || '—';

  const head = {
    valid: {
      icon: CheckCircle2,
      box: 'bg-emerald-50 text-[#006A4E]',
      text: 'text-[#006A4E]',
      label: t('সঠিক', 'Genuine'),
      line: t('সব তথ্য মূল রেকর্ডের সাথে মিলেছে', 'Matches the original record'),
    },
    changed: {
      icon: ShieldAlert,
      box: 'bg-rose-50 text-rose-600',
      text: 'text-rose-700',
      label: t('পরিবর্তিত', 'Altered'),
      line: t('রেকর্ডে পরিবর্তন ধরা পড়েছে। অফিসে যোগাযোগ করুন', 'The record was changed. Contact the office'),
    },
    qr_mismatch: {
      icon: ShieldAlert,
      box: 'bg-rose-50 text-rose-600',
      text: 'text-rose-700',
      label: t('পরিবর্তিত', 'Altered'),
      line: t('এই QR কোড দলিলের সাথে মেলে না', 'This QR code does not match the deed'),
    },
    notfound: {
      icon: SearchX,
      box: 'bg-slate-100 text-slate-500',
      text: 'text-slate-700',
      label: t('পাওয়া যায়নি', 'Not found'),
      line: t('নম্বরটি আবার দেখে লিখুন', 'Check the number and try again'),
    },
  }[outcome];
  const Icon = head.icon;

  const proof = data?.cryptographic_proof || {};
  const hash: string | undefined = proof.stored_content_hash || data?.noc_hash || data?.noc?.noc_hash;
  const qr: string | undefined = data?.qr_data_uri || data?.qr_svg_data_uri;
  const qrSafe = typeof qr === 'string' && qr.startsWith('data:image/') ? qr : undefined;

  let items: Array<[React.ReactNode, React.ReactNode] | null | false> = [];
  if (data && kind === 'deed') {
    const d = data.deed || {};
    const type = DEED_TYPES[String(d.deed_type || '').toUpperCase()];
    items = [
      [t('দলিল নং', 'Deed no'), <span className="font-mono">{d.deed_no || code}</span>],
      [t('ধরন', 'Type'), type ? (lang === 'bn' ? type[0] : type[1]) : d.deed_type || '—'],
      [t('মৌজা ও দাগ', 'Mouza & plot'), `${L(d.mouza_bn, d.mouza_en)} · ${t('দাগ', 'Dag')} ${num(d.dag_no || '—')}`],
      d.area_decimal != null && [t('জমি', 'Area'), `${num(d.area_decimal)} ${t('শতাংশ', 'decimal')}`],
      [t('বিক্রেতা', 'Seller'), d.seller_name_bn || '—'],
      [t('ক্রেতা', 'Buyer'), d.buyer_name_bn || '—'],
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
      [t('ব্যাংক', 'Bank'), `${L(n.bank_name_bn, n.bank_name_en)}${n.branch_bn && lang === 'bn' ? ` · ${n.branch_bn}` : ''}`],
      [t('ঋণগ্রহীতা', 'Borrower'), L(n.borrower_name_bn, n.borrower_name_en)],
      n.borrower_nid && [t('এনআইডি', 'NID'), <span className="font-mono">{String(n.borrower_nid).includes('*') ? n.borrower_nid : maskNid(n.borrower_nid, lang)}</span>],
      amount != null && [t('ঋণ', 'Loan'), `৳${num(Number(amount).toLocaleString('en-IN'))}`],
      (n.mouza_bn || n.dag_no) && [
        t('মৌজা ও দাগ', 'Mouza & plot'),
        `${L(n.mouza_bn, n.mouza_en)} · ${t('দাগ', 'Dag')} ${num(n.dag_no || '—')}`,
      ],
      n.released_at && [t('মুক্তির তারিখ', 'Released'), formatDate(n.released_at)],
      (n.status || data.status) && [t('অবস্থা', 'Status'), <StatusCode code={n.status || data.status} lang={lang} />],
    ];
  }

  return (
    <div id={PRINT_ID} className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
        <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', head.box)}>
          <Icon className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('text-xl font-bold leading-tight', head.text)}>{head.label}</p>
          <p className="mt-0.5 text-sm text-slate-600">{head.line}</p>
        </div>
        {data && (
          <div className="flex basis-full items-center justify-end gap-1.5 sm:basis-auto print:hidden">
            {action}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Printer className="size-4" />
              <span className="hidden sm:inline">{t('প্রিন্ট', 'Print')}</span>
            </button>
          </div>
        )}
      </div>

      {data && (
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1 space-y-2">
            <DetailList items={items} />
            {hash && (
              <p className="flex items-center justify-between gap-3 text-xs text-slate-500">
                <span>{t('নিরাপত্তা কোড', 'Security code')}</span>
                <span className="font-mono text-slate-600" title={hash}>
                  {shortHash(hash)}
                </span>
              </p>
            )}
          </div>
          {qrSafe && (
            <img
              src={qrSafe}
              alt={t('দলিলের QR', 'Deed QR')}
              className="size-28 shrink-0 self-center rounded-lg border border-slate-200 bg-white p-1.5 sm:self-start"
            />
          )}
        </div>
      )}
    </div>
  );
};
