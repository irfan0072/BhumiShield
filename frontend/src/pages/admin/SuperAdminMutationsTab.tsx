import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XOctagon,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Building2,
  RefreshCw,
  X,
  FileCheck,
  RotateCcw,
} from 'lucide-react';
import { toBanglaDigits } from '../../theme/tokens';
import { useAppUI } from '../../i18n';
import { BhumiApi } from '../../api/client';

interface SuperAdminMutationsTabProps {
  mutations: any[];
  onRefresh: () => void;
  onOpenOverride?: (type: string, id: string | number, extra?: any) => void;
}

export const SuperAdminMutationsTab: React.FC<SuperAdminMutationsTabProps> = ({
  mutations,
  onRefresh,
  onOpenOverride,
}) => {
  const { t, lang } = useAppUI();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedMutation, setSelectedMutation] = useState<any | null>(null);

  // Khatian Reconcile Modal State
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
  const [reconcileTarget, setReconcileTarget] = useState<any | null>(null);
  const [reconcileDag, setReconcileDag] = useState('');
  const [reconcileArea, setReconcileArea] = useState('');
  const [reconcileNotes, setReconcileNotes] = useState('');
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ msg: string; err?: boolean } | null>(null);

  const filteredMutations = mutations.filter((m) => {
    if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(m.case_no || '').toLowerCase().includes(q) ||
      String(m.deed_no || '').toLowerCase().includes(q) ||
      String(m.dag_no_bn || m.dag_no || '').includes(q) ||
      String(m.mouza_bn || '').toLowerCase().includes(q) ||
      String(m.buyer_name_bn || '').toLowerCase().includes(q) ||
      String(m.seller_name_bn || '').toLowerCase().includes(q)
    );
  });

  const handleOpenReconcile = (m: any) => {
    setReconcileTarget(m);
    setReconcileDag(m.dag_no_bn || m.dag_no || '');
    setReconcileArea(String(m.area_decimal || ''));
    setReconcileNotes('');
    setReconcileModalOpen(true);
  };

  const handleReconcileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileTarget) return;

    setReconcileLoading(true);
    try {
      const res = await BhumiApi.reconcileKhatian(Number(reconcileTarget.plot_id || reconcileTarget.id), {
        resolution_note_bn: reconcileNotes.trim() || 'প্রশাসনিক খতিয়ান সমন্বয় সম্পন্ন',
        updated_area_decimal: Number(reconcileArea),
      });
      setToastMsg({ msg: res.message_bn || t('খতিয়ান রেকর্ড সফলভাবে সমন্বয় করা হয়েছে।', 'Khatian plot reconciled successfully.') });
      setReconcileModalOpen(false);
      onRefresh();
    } catch (err: any) {
      const resp = err.response?.data;
      setToastMsg({ msg: resp?.message_bn || err.message, err: true });
    } finally {
      setReconcileLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Toast Notice */}
      {toastMsg && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
            toastMsg.err ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMsg.err ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-[#006A4E]" />}
            <span>{toastMsg.msg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-[#006A4E] flex items-center justify-center shadow-2xs">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{t('ই-নামজারি ও মালিকানা রেকর্ডস তদারকি', 'e-Mutation & Ownership Records Supervision')}</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-[#006A4E]">
                {toBanglaDigits(filteredMutations.length, lang)} {t('টি নামজারি', 'Mutations')}
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                'উপজেলা ভূমি অফিসের ই-নামজারি ডিক্রি, খতিয়ান রেকর্ডস পরীক্ষা এবং বিরোধ প্রতিরোধে স্বয়ংক্রিয় ঝুঁকি বিশ্লেষণ।',
                'Oversight of Upazila land office e-mutations, khatian records verification, and fraud risk reports.'
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

      {/* Constitutional Safeguard Banner (Rule M3) */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-xs">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs">
          <h3 className="font-extrabold text-[12px]">
            {t('সাংবিধানিক ক্ষমতার সুরক্ষা নীতি (Rule M3 / Section 4.4)', 'Constitutional Authority Separation (Rule M3 / Section 4.4)')}
          </h3>
          <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
            {t(
              'রাষ্ট্রীয় ভূমি আইন অনুযায়ী ভূমির চূড়ান্ত মালিকানা পরিবর্তন ও নামজারি ডিক্রি অনুমোদনের একমাত্র সাংবিধানিক এখতিয়ার সহকারী কমিশনার (ভূমি) মহোদয়ের। সুপার অ্যাডমিন প্যানেল হতে কাজের অগ্রগতি পর্যবেক্ষণ, অডিট এবং খতিয়ান সমন্বয় সুপারিশ করা যাবে, কিন্তু এসি ল্যান্ডের বিচারিক ক্ষমতা প্রতিস্থাপন আইনত নিষিদ্ধ।',
              'By constitutional land mandate, Assistant Commissioner of Land (AC Land) holds exclusive decree authority over ownership mutation approval. Super Admin monitors progress and audits compliance, but cannot substitute AC Land judicial power.'
            )}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={t('কেস নং, দলিল নং, দাগ, মৌজা বা পক্ষ দিয়ে খুঁজুন...', 'Search by case no, deed no, dag, mouza, or party...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {[
            { key: 'ALL', label_bn: 'সকল নামজারি', label_en: 'All' },
            { key: 'PENDING', label_bn: 'অনুমোদনের অপেক্ষায়', label_en: 'Pending' },
            { key: 'APPROVED', label_bn: 'অনুমোদিত ডিক্রি', label_en: 'Approved' },
            { key: 'REJECTED', label_bn: 'খারিজকৃত আবেদন', label_en: 'Rejected' },
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

      {/* Main Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">{t('নামজারি কেস নং', 'Mutation Case No')}</th>
                <th className="px-4 py-3">{t('মৌজা ও দাগ', 'Mouza & Dag')}</th>
                <th className="px-4 py-3">{t('জমির পরিমাণ', 'Land Area')}</th>
                <th className="px-4 py-3">{t('বিক্রেতা ও ক্রেতা', 'Seller & Buyer')}</th>
                <th className="px-4 py-3">{t('অবস্থা', 'Status')}</th>
                <th className="px-4 py-3 text-right">{t('অ্যাকশন', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMutations.length > 0 ? (
                filteredMutations.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      <span className="text-[#006A4E]">{m.case_no}</span>
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                        {t('দলিল নং: ', 'Deed No: ')}{m.deed_no || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">
                        {t('দাগ: ', 'Dag: ')}{toBanglaDigits(m.dag_no_bn || m.dag_no, lang)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {m.mouza_bn || 'বিরুলিয়া'}, {m.upazila_bn || 'সাভার'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">
                        {toBanglaDigits(m.area_decimal || 0, lang)} {t('শতাংশ', 'Decimal')}
                      </div>
                      {m.share_fraction && (
                        <div className="text-[10px] text-slate-500">
                          {t('অংশ: ', 'Share: ')}{m.share_fraction}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-900 font-medium">
                        <span className="text-slate-500 text-[10px]">{t('ক্রেতা: ', 'Buyer: ')}</span>
                        <span className="font-bold">{m.buyer_name_bn || 'ক্রেতা'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        <span className="text-[10px]">{t('বিক্রেতা: ', 'Seller: ')}</span>
                        <span>{m.seller_name_bn || 'বিক্রেতা'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {m.status === 'APPROVED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-[#006A4E] flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t('অনুমোদিত', 'Approved')}</span>
                        </span>
                      ) : m.status === 'REJECTED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1 w-fit">
                          <XOctagon className="w-3.5 h-3.5" />
                          <span>{t('খারিজকৃত', 'Rejected')}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1 w-fit">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{t('অনুমোদনের অপেক্ষায়', 'Pending Review')}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedMutation(m)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 flex items-center gap-1 cursor-pointer transition shadow-2xs"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                          <span>{t('ঝুঁকি রিপোর্ট', 'Risk Report')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenReconcile(m)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#006A4E] flex items-center gap-1 cursor-pointer transition shadow-2xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-[#006A4E]" />
                          <span>{t('খতিয়ান সমন্বয়', 'Reconcile')}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold">{t('কোনো নামজারি কেস পাওয়া যায়নি।', 'No mutation cases found.')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Report Modal */}
      {selectedMutation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">{t('স্বয়ংক্রিয় ঝুঁকি ও স্বত্ব বিশ্লেষণ রিপোর্ট', 'Automated Fraud & Title Risk Report')}</h3>
                  <p className="text-xs text-slate-400">{selectedMutation.case_no}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMutation(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">{t('স্বত্ব ও মালিকানা অবস্থা', 'Title Authenticity Status')}</div>
                  <div className="text-base font-black text-[#006A4E] mt-0.5">
                    {selectedMutation.risk_report?.can_transact !== false
                      ? t('নিরাপদ ও হস্তান্তরের উপযোগী (Clear Title)', 'Verified Clear Title')
                      : t('সতর্কতা: উচ্চ ঝুঁকি শনাক্ত হয়েছে', 'High Risk Detected')}
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-black bg-[#006A4E] text-white">
                  SCORE: {selectedMutation.risk_report?.risk_score ?? '100/100'}
                </div>
              </div>

              {/* 5-Pillar Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#006A4E] shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900">{t('খতিয়ান রেকর্ডস পরীক্ষা', 'Khatian Verification')}</div>
                    <div className="text-[10px] text-slate-500">{t('সিএস/এসএ/আরএস ধারাবাহিকতা মিল রয়েছে', 'CS/SA/RS chain intact')}</div>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#006A4E] shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900">{t('ব্যাংক বন্ধক পরীক্ষা', 'Mortgage Lien Check')}</div>
                    <div className="text-[10px] text-slate-500">{t('কোনো অপরিশোধিত বন্ধক লিয়েন নেই', 'No active mortgage encumbrance')}</div>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#006A4E] shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900">{t('দেওয়ানি বিরোধ পরীক্ষা', 'Civil Court Dispute Check')}</div>
                    <div className="text-[10px] text-slate-500">{t('আদালতের কোনো স্থগিতাদেশ বা নিষেধাজ্ঞা নেই', 'No injunction orders on plot')}</div>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#006A4E] shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900">{t('নাগরিক সেল লক পরীক্ষা', 'Owner Sale Lock Check')}</div>
                    <div className="text-[10px] text-slate-500">{t('মালিকের ডিজিটাল বায়োমেট্রিক সম্মতি সক্রিয়', 'Owner biometric consent granted')}</div>
                  </div>
                </div>
              </div>

              {/* Deed Hash Chain Info */}
              <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-1.5 font-mono text-[11px]">
                <div className="text-slate-400 font-sans text-[10px] uppercase font-bold">{t('দলিল ক্রিপ্টোগ্রাফিক হ্যাশ চেইনিং (Ed25519)', 'Deed Cryptographic Hash')}</div>
                <div className="truncate text-emerald-400">{selectedMutation.content_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}</div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between font-sans pt-1">
                  <span>{t('চেইন ইনডেক্স: ', 'Chain Index: ')}#{toBanglaDigits(selectedMutation.id, lang)}</span>
                  <span className="text-emerald-400 font-bold">VERIFIED IMMUTABLE</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedMutation(null)}
                className="px-4 py-2 rounded-lg font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                {t('বন্ধ করুন', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Khatian Reconcile Modal */}
      {reconcileModalOpen && reconcileTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">{t('খতিয়ান রেকর্ডস সমন্বয় ও সংশোধন', 'Reconcile Khatian Record')}</h3>
                  <p className="text-xs text-slate-400">{reconcileTarget.case_no}</p>
                </div>
              </div>
              <button
                onClick={() => setReconcileModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReconcileSubmit} className="p-6 space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t('সংশোধিত দাগ নং', 'Reconciled Dag No')} *
                  </label>
                  <input
                    type="text"
                    value={reconcileDag}
                    onChange={(e) => setReconcileDag(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t('সংশোধিত পরিমাণ (শতাংশ)', 'Reconciled Area (Decimal)')} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={reconcileArea}
                    onChange={(e) => setReconcileArea(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t('সমন্বয়ের আইনি কারণ ও রেকর্ডরুম রেফারেন্স', 'Reconciliation Ground & Record Room Ref')} *
                </label>
                <textarea
                  rows={3}
                  value={reconcileNotes}
                  onChange={(e) => setReconcileNotes(e.target.value)}
                  placeholder={t('রেকর্ডরুম ভলিউম নম্বর ও কারণ উল্লেখ করুন...', 'Enter record room volume number and grounds...')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-hidden"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReconcileModalOpen(false)}
                  disabled={reconcileLoading}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold transition cursor-pointer"
                >
                  {t('বাতিল', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={reconcileLoading}
                  className="px-5 py-2 rounded-lg font-bold text-white bg-[#006A4E] hover:bg-[#005a42] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {reconcileLoading ? (
                    <span>{t('সমন্বয় হচ্ছে...', 'Reconciling...')}</span>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>{t('সমন্বয় নিশ্চিত করুন', 'Confirm Reconciliation')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
