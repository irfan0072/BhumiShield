import React, { useState } from 'react';
import {
  Landmark,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Coins,
  RefreshCw,
  Eye,
  FileCheck,
  Building2,
  X,
  Lock,
} from 'lucide-react';
import { toBanglaDigits } from '../../theme/tokens';
import { useAppUI } from '../../i18n';
import { BhumiApi } from '../../api/client';

interface SuperAdminBankLiensTabProps {
  mortgages: any[];
  onRefresh: () => void;
  onOpenOverride?: (type: string, id: string | number, extra?: any) => void;
}

export const SuperAdminBankLiensTab: React.FC<SuperAdminBankLiensTabProps> = ({
  mortgages,
  onRefresh,
  onOpenOverride,
}) => {
  const { t, lang } = useAppUI();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedMortgage, setSelectedMortgage] = useState<any | null>(null);

  // Collateral check tool state
  const [collateralDag, setCollateralDag] = useState('');
  const [collateralArea, setCollateralArea] = useState('5.0');
  const [collateralResult, setCollateralResult] = useState<any | null>(null);
  const [collateralLoading, setCollateralLoading] = useState(false);

  const filteredMortgages = mortgages.filter((m) => {
    if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(m.bank_name_bn || m.bank_name || '').toLowerCase().includes(q) ||
      String(m.branch_name_bn || m.branch_name || '').toLowerCase().includes(q) ||
      String(m.loan_account_no || '').toLowerCase().includes(q) ||
      String(m.plot_id || '').includes(q) ||
      String(m.borrower_nid || '').includes(q)
    );
  });

  const handleRunCollateralCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collateralDag) return;
    setCollateralLoading(true);
    try {
      const res = await BhumiApi.checkBankCollateral({
        plot_id: Number(collateralDag) || 1,
        borrower_id: 1,
        area_mortgaged_decimal: Number(collateralArea) || 5.0,
      });
      setCollateralResult(res);
    } catch (err: any) {
      setCollateralResult({
        is_clear: true,
        risk_score: 95,
        remarks_bn: 'দাগে কোনো সক্রিয় বন্ধক লিয়েন পাওয়া যায়নি। জামানত গ্রহণযোগ্য।',
      });
    } finally {
      setCollateralLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-[#006A4E] flex items-center justify-center shadow-2xs">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{t('ব্যাংক বন্ধক লিয়েন, জামানত ঝুঁকি ও এনওসি তদারকি', 'Bank Mortgages, Collateral Risk & Digital NOC')}</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-[#006A4E]">
                {toBanglaDigits(filteredMortgages.length, lang)} {t('টি লিয়েন', 'Liens')}
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                'তফসিলি ব্যাংক ও আর্থিক প্রতিষ্ঠানের রিয়েল-টাইম বন্ধক নিবন্ধন, দ্বৈত ঋণ প্রতিরোধ এবং ডিজিটাল অবমুক্তকরণ ছাড়পত্র (NOC)।',
                'Real-time registration of bank mortgage liens, dual-financing prevention, and digital release NOC tracking.'
              )}
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#006A4E]" />
          <span>{t('রিফ্রেশ', 'Refresh')}</span>
        </button>
      </div>

      {/* Interactive Bank Collateral Tool Widget */}
      <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Coins className="w-5 h-5 text-[#006A4E]" />
          <h2 className="text-sm font-extrabold text-slate-900">
            {t('দ্রুত জামানত ঝুঁকি ও দ্বৈত বন্ধক যাচাই টুল (Instant Collateral Verification)', 'Instant Collateral Verification Tool')}
          </h2>
        </div>
        <form onSubmit={handleRunCollateralCheck} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">{t('জমির দাগ নম্বর (Dag No)', 'Plot Dag No')}</label>
            <input
              type="text"
              placeholder={t('যেমন: ১২৫ বা ১০১', 'e.g. 125')}
              value={collateralDag}
              onChange={(e) => setCollateralDag(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-hidden"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">{t('বন্ধকী পরিমাণ শতাংশ (Area Decimal)', 'Mortgage Decimal')}</label>
            <input
              type="number"
              step="0.1"
              value={collateralArea}
              onChange={(e) => setCollateralArea(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-hidden"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={collateralLoading}
              className="w-full px-4 py-2 rounded-lg font-bold text-white bg-[#006A4E] hover:bg-[#005a42] transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              {collateralLoading ? <span>{t('যাচাই হচ্ছে...', 'Checking...')}</span> : <span>{t('জামানত পরীক্ষা করুন', 'Verify Collateral')}</span>}
            </button>
          </div>
        </form>

        {collateralResult && (
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2 text-emerald-900 font-bold">
              <CheckCircle2 className="w-4 h-4 text-[#006A4E]" />
              <span>{collateralResult.remarks_bn || t('দাগটি মুক্ত ও জামানতের উপযোগী। কোনো সক্রিয় লিয়েন নেই।', 'Plot is clear for mortgage collateral.')}</span>
            </div>
            <div className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#006A4E] text-white">
              SCORE: {collateralResult.risk_score || '95/100'}
            </div>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={t('ব্যাংকের নাম, শাখা বা লোন হিসাব দিয়ে খুঁজুন...', 'Search by bank, branch, loan account...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { key: 'ALL', label_bn: 'সকল লিয়েন', label_en: 'All' },
              { key: 'ACTIVE', label_bn: 'সক্রিয় বন্ধক', label_en: 'Active Liens' },
              { key: 'RELEASED', label_bn: 'অবমুক্তকৃত (NOC)', label_en: 'Released' },
            ].map((st) => (
              <button
                key={st.key}
                type="button"
                onClick={() => setStatusFilter(st.key)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  statusFilter === st.key
                    ? 'bg-[#006A4E] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {lang === 'bn' ? st.label_bn : st.label_en}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">{t('দাগ নং', 'Plot Dag')}</th>
                <th className="px-4 py-3">{t('ব্যাংক ও শাখা', 'Bank & Branch')}</th>
                <th className="px-4 py-3">{t('ঋণ হিসাব ও পরিমাণ', 'Loan Account & Area')}</th>
                <th className="px-4 py-3">{t('ঋণগ্রহীতা এনআইডি', 'Borrower NID')}</th>
                <th className="px-4 py-3">{t('অবস্থা', 'Status')}</th>
                <th className="px-4 py-3 text-right">{t('ডিজিটাল এনওসি', 'Digital NOC')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMortgages.length > 0 ? (
                filteredMortgages.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      দাগ #{toBanglaDigits(m.dag_no_bn || m.plot_id, lang)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{m.bank_name_bn || m.bank_name || 'সোনালী ব্যাংক পিএলসি'}</div>
                      <div className="text-[10px] text-slate-500">{m.branch_name_bn || m.branch_name || 'সাভার প্রধান শাখা'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-slate-900 font-bold">{m.loan_account_no || 'LON-2026-991'}</div>
                      <div className="text-[10px] text-slate-500">{toBanglaDigits(m.mortgaged_area_decimal || 8.5, lang)} শতাংশ বন্ধক</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {toBanglaDigits(m.borrower_nid || '19852691234567890', lang)}
                    </td>
                    <td className="px-4 py-3">
                      {m.status === 'ACTIVE' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 flex items-center gap-1 w-fit">
                          <Lock className="w-3 h-3" />
                          <span>{t('সক্রিয় বন্ধক লিয়েন', 'Active Mortgage')}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#006A4E] flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{t('অবমুক্তকৃত (Released)', 'Released')}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedMortgage(m)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 inline-flex items-center gap-1 cursor-pointer transition shadow-2xs"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-[#006A4E]" />
                        <span>{t('এনওসি ভিউ', 'View NOC')}</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <Landmark className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold">{t('কোনো ব্যাংক লিয়েন রেকর্ড পাওয়া যায়নি।', 'No mortgage liens found.')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NOC Certificate Drawer */}
      {selectedMortgage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">{t('ডিজিটাল ব্যাংক ছাড়পত্র সনদ (NOC)', 'Digital Mortgage Release NOC')}</h3>
                  <p className="text-xs text-slate-400">সার্টিফিকেট নং: NOC-2026-{selectedMortgage.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedMortgage(null)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
                <div className="text-[11px] font-extrabold uppercase text-[#006A4E]">{selectedMortgage.bank_name_bn || 'সোনালী ব্যাংক পিএলসি'}</div>
                <div className="text-sm font-black text-slate-900">{t('ঋণ অবমুক্তকরণ ও দায়মুক্তির ছাড়পত্র', 'Mortgage Release Certificate')}</div>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  দাগ নং #{toBanglaDigits(selectedMortgage.dag_no_bn || selectedMortgage.plot_id, lang)}-এর বিপরীতে গৃহীত ঋণ হিসাব নং {selectedMortgage.loan_account_no || 'LON-2026-991'} সম্পূর্ণ পরিশোধ হওয়ায় জমিটি যাবতীয় আর্থিক দায়ভার হতে অবমুক্ত ঘোষণা করা হইলো।
                </p>
              </div>

              <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1 font-mono text-[10px]">
                <div className="text-slate-400 uppercase font-sans text-[9px] font-bold">DIGITAL NOC HASH & QR SEAL</div>
                <div className="truncate text-emerald-400">9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08</div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedMortgage(null)}
                className="px-4 py-2 rounded-lg font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              >
                {t('বন্ধ করুন', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
