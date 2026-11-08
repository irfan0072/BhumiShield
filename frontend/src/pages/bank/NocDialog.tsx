import React from 'react';
import { Printer } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DetailList, StatusCode } from '@/components/admin/kit';
import { day, num, taka } from './shared';

const esc = (v: any) =>
  String(v ?? '—').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** Opens a clean print window with only the certificate (not the whole app). */
const printNoc = (noc: any) => {
  const l = noc?.lien || {};
  const qr = typeof noc?.qr_data_uri === 'string' && noc.qr_data_uri.startsWith('data:image/') ? noc.qr_data_uri : '';
  const rows: Array<[string, any]> = [
    ['ঋণগ্রহীতা', l.borrower_name_bn],
    ['এনআইডি', l.borrower_nid],
    ['মৌজা ও দাগ', `${l.mouza_bn ?? '—'}, দাগ ${l.dag_no ?? '—'}`],
    ['পরিশোধিত ঋণ', `৳${Number(l.loan_amount_bdt || 0).toLocaleString('en-IN')}`],
    ['অবমুক্তির তারিখ', noc?.issued_at ? String(noc.issued_at).slice(0, 10) : '—'],
    ['অবস্থা', l.status],
  ];
  const w = window.open('', '_blank', 'width=760,height=900');
  if (!w) {
    window.print();
    return;
  }
  w.document.write(`<!doctype html><html lang="bn"><head><meta charset="utf-8"><title>NOC ${esc(noc?.noc_no)}</title>
<style>
body{font-family:system-ui,'Noto Sans Bengali',sans-serif;color:#0f172a;margin:40px}
.box{border:2px solid #006A4E;border-radius:12px;padding:28px;max-width:640px;margin:auto}
h1{font-size:18px;margin:0;text-align:center}h2{font-size:13px;font-weight:500;color:#475569;text-align:center;margin:4px 0 0}
.no{font-family:monospace;font-size:12px;text-align:center;margin:8px 0 18px;color:#006A4E}
p.note{font-size:13px;text-align:center;background:#ecfdf5;border-radius:8px;padding:8px}
table{width:100%;border-collapse:collapse;font-size:13px;margin:16px 0}td{padding:6px 4px;border-bottom:1px solid #e2e8f0}td:first-child{color:#64748b;width:40%}
.foot{display:flex;justify-content:space-between;align-items:flex-end;margin-top:20px;font-size:12px;color:#475569}
.hash{font-family:monospace;font-size:10px;word-break:break-all;color:#64748b;margin-top:12px}
</style></head><body><div class="box">
<h1>${esc(l.bank_name_bn)}</h1><h2>${esc(l.branch_name)}</h2>
<div class="no">অনাপত্তি সনদ নং: ${esc(noc?.noc_no)}</div>
<p class="note">বর্ণিত দাগের জমির বিরুদ্ধে ব্যাংকের কোনো দাবি বা বন্ধক অবশিষ্ট নেই।</p>
<table>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
<div class="foot"><div>${qr ? `<img src="${esc(qr)}" width="96" height="96" alt="QR">` : ''}<div>QR স্ক্যান করে যাচাই করুন</div></div>
<div style="text-align:right"><div style="border-top:1px dashed #94a3b8;padding-top:4px">শাখা ব্যবস্থাপক / অনুমোদিত কর্মকর্তা</div><div>${esc(l.bank_name_bn)}</div></div></div>
<div class="hash">SHA-256: ${esc(noc?.noc_hash)}${noc?.signature ? `<br>Signature: ${esc(noc.signature)}` : ''}</div>
</div><script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
};

/** Compact NOC certificate view: QR, number, key facts, hash and a print button. */
export const NocDialog: React.FC<{ noc: any | null; onClose: () => void }> = ({ noc, onClose }) => {
  const { lang, t } = useAppUI();
  const l = noc?.lien || {};
  return (
    <Dialog open={!!noc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="border-b border-slate-100 px-5 py-4 pr-14 text-left">
          <DialogTitle className="text-base font-semibold text-slate-900">{t('অনাপত্তি সনদ', 'Release NOC')}</DialogTitle>
          <DialogDescription className="font-mono text-xs text-slate-500">{noc?.noc_no || '—'}</DialogDescription>
        </DialogHeader>
        {noc && (
          <div className="max-h-[70vh] space-y-3 overflow-y-auto px-5 py-4">
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              {noc.qr_data_uri ? (
                <img src={noc.qr_data_uri} alt="NOC QR" className="size-20 shrink-0 rounded border border-slate-200 bg-white p-1" />
              ) : (
                <div className="flex size-20 shrink-0 items-center justify-center rounded border border-dashed border-slate-200 text-xs text-slate-400">
                  QR —
                </div>
              )}
              <div className="min-w-0 space-y-1">
                <div className="truncate text-sm font-medium text-slate-900">{lang === 'bn' ? l.bank_name_bn : l.bank_name_en || l.bank_name_bn}</div>
                <div className="truncate text-xs text-slate-500">{l.branch_name || '—'}</div>
                <StatusCode code={l.status} lang={lang} />
              </div>
            </div>
            <DetailList
              items={[
                [t('ঋণগ্রহীতা', 'Borrower'), l.borrower_name_bn],
                [t('এনআইডি', 'NID'), l.borrower_nid ? num(l.borrower_nid, lang) : '—'],
                [t('জমি', 'Land'), `${l.mouza_bn || '—'} · ${t('দাগ', 'Plot')} ${num(l.dag_no, lang)}`],
                [t('পরিশোধিত ঋণ', 'Loan cleared'), taka(l.loan_amount_bdt, lang)],
                [t('অবমুক্তি', 'Released'), day(noc.issued_at, lang)],
              ]}
            />
            {noc.noc_hash && (
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <div className="text-xs text-slate-500">{t('হ্যাশ', 'Hash')}</div>
                <div className="select-all break-all font-mono text-xs text-slate-700">{noc.noc_hash}</div>
              </div>
            )}
          </div>
        )}
        <DialogFooter className="mt-0 border-t border-slate-100 px-5 py-3">
          <Button type="button" variant="outline" size="sm" className="h-9" onClick={onClose}>
            {t('বন্ধ', 'Close')}
          </Button>
          <Button type="button" size="sm" className="h-9 gap-1.5" onClick={() => printNoc(noc)} disabled={!noc}>
            <Printer className="size-4" />
            {t('প্রিন্ট', 'Print')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
