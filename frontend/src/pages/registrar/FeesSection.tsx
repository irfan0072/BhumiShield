import React, { useState } from 'react';
import { Calculator, Loader2, Printer } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AdminPage, DetailList, EmptyState, Field, Section, inputCls, notify } from '@/components/admin/kit';
import { DEED_TYPES, deedTypeLabel, feeLines, fmtDate, fmtMoney } from './shared';

/** Fee calculator with a printable estimate. */
export const FeesSection: React.FC = () => {
  const { lang, t } = useAppUI();
  const [value, setValue] = useState('');
  const [deedType, setDeedType] = useState('SALE');
  const [fees, setFees] = useState<any | null>(null);
  const [calcFor, setCalcFor] = useState<{ value: number; type: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const calculate = async () => {
    const v = Number(value);
    if (!(v > 0)) return;
    setBusy(true);
    try {
      const res = await BhumiApi.calculateFees(v, deedType);
      setFees(res);
      setCalcFor({ value: v, type: deedType });
    } catch (e) {
      setFees(null);
      notify.err(e, lang, t('ফি হিসাব করা যাচ্ছে না', 'Fee calculation unavailable'));
    } finally {
      setBusy(false);
    }
  };

  const lines = fees ? feeLines(fees, t) : [];

  return (
    <AdminPage>
      <div className="grid gap-4 lg:grid-cols-3">
        <Section title={t('তথ্য দিন', 'Details')}>
          <form
            className="space-y-3 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              calculate();
            }}
          >
            <Field label={t('ঘোষিত মূল্য (টাকা)', 'Declared value (BDT)')}>
              <input type="number" min="0" className={inputCls} value={value} onChange={(e) => setValue(e.target.value)} />
            </Field>
            <Field label={t('দলিলের ধরন', 'Deed type')}>
              <select className={inputCls} value={deedType} onChange={(e) => setDeedType(e.target.value)}>
                {DEED_TYPES.map(([code, bn, en]) => (
                  <option key={code} value={code}>
                    {lang === 'bn' ? bn : en}
                  </option>
                ))}
              </select>
            </Field>
            <Button type="submit" size="sm" className="h-9 w-full gap-1.5" disabled={busy || !(Number(value) > 0)}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Calculator className="size-4" />}
              {t('হিসাব করুন', 'Calculate')}
            </Button>
          </form>
        </Section>

        <Section
          className="lg:col-span-2"
          title={t('ফি হিসাব', 'Fee estimate')}
          action={
            fees ? (
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setPrintOpen(true)}>
                <Printer className="size-3.5" />
                {t('চালান', 'Challan')}
              </Button>
            ) : undefined
          }
        >
          {fees && calcFor ? (
            <div className="space-y-3 p-4">
              <DetailList
                items={[
                  [t('ঘোষিত মূল্য', 'Declared value'), fmtMoney(calcFor.value, lang)],
                  [t('ধরন', 'Type'), deedTypeLabel(calcFor.type, lang)],
                  ...lines.map(([label, amt]) => [label, fmtMoney(amt, lang)] as [string, string]),
                ]}
              />
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
                <span className="text-slate-600">{t('মোট সরকারি ফি', 'Total govt fees')}</span>
                <span className="text-base font-semibold text-slate-900">{fmtMoney(fees.total_payable_bdt, lang)}</span>
              </div>
            </div>
          ) : (
            <EmptyState icon={Calculator} text={t('মূল্য দিয়ে হিসাব করুন', 'Enter a value to calculate')} />
          )}
        </Section>
      </div>

      <Dialog open={printOpen && !!fees} onOpenChange={setPrintOpen}>
        <DialogContent className="max-w-lg gap-0 p-0">
          <DialogHeader className="border-b border-slate-100 px-5 py-4 pr-14 text-left print:hidden">
            <DialogTitle className="text-base font-semibold text-slate-900">{t('ফি প্রাক্কলন', 'Fee estimate')}</DialogTitle>
            <DialogDescription className="sr-only">{t('ফি প্রাক্কলন', 'Fee estimate')}</DialogDescription>
          </DialogHeader>
          {fees && calcFor && (
            <div className="space-y-3 px-5 py-4 text-sm text-slate-800">
              <div className="space-y-0.5 border-b border-slate-100 pb-3 text-center">
                <p className="font-semibold">{t('গণপ্রজাতন্ত্রী বাংলাদেশ সরকার', "Government of the People's Republic of Bangladesh")}</p>
                <p className="text-xs text-slate-500">{t('নিবন্ধন অধিদপ্তর · ফি প্রাক্কলন', 'Directorate of Registration · Fee estimate')}</p>
                <p className="text-xs text-slate-500">{fmtDate(new Date().toISOString(), lang)}</p>
              </div>
              <DetailList
                items={[
                  [t('ঘোষিত মূল্য', 'Declared value'), fmtMoney(calcFor.value, lang)],
                  [t('ধরন', 'Type'), deedTypeLabel(calcFor.type, lang)],
                  ...lines.map(([label, amt]) => [label, fmtMoney(amt, lang)] as [string, string]),
                  [t('মোট', 'Total'), fmtMoney(fees.total_payable_bdt, lang)],
                ]}
              />
              <p className="text-xs text-slate-500">{t('চূড়ান্ত ফি অফিস নির্ধারণ করবে', 'Final fees are set by the office')}</p>
            </div>
          )}
          <DialogFooter className="mt-0 border-t border-slate-100 px-5 py-3 print:hidden">
            <Button size="sm" className="h-9 gap-1.5" onClick={() => window.print()}>
              <Printer className="size-4" />
              {t('প্রিন্ট', 'Print')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
};
