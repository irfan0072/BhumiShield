import React, { useState, useEffect, useMemo } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { OfficerKhatianExplorer } from '../components/OfficerKhatianExplorer';
import { OfficerDeedVerifier } from '../components/OfficerDeedVerifier';
import {
  Landmark,
  CheckCircle2,
  XCircle,
  Clock,
  GitCompareArrows,
  AlertOctagon,
  KeyRound,
  Search,
  Filter,
  FileText,
  ShieldCheck,
  Scale,
  ArrowRight,
  Eye,
  X,
  QrCode
} from 'lucide-react';

export type AcLandTab = 'mutations' | 'khatians' | 'disputes' | 'explorer' | 'verifier';

export const AcLandPage: React.FC = () => {
  const { lang, role, setRole, setUser, setToken, activeSubTab, setActiveSubTab, t } = useAppUI();
  const [subTab, setSubTab] = useState<AcLandTab>(() => {
    if (activeSubTab && ['mutations', 'khatians', 'disputes', 'explorer', 'verifier'].includes(activeSubTab)) {
      return activeSubTab as AcLandTab;
    }
    return 'mutations';
  });

  const [mutations, setMutations] = useState<any[]>([]);
  const [flaggedKhatians, setFlaggedKhatians] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  // Filtering states
  const [mutationSearch, setMutationSearch] = useState('');
  const [mutationFilter, setMutationFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // Case details modal
  const [selectedMutation, setSelectedMutation] = useState<any | null>(null);

  const loadAcLandData = () => {
    setLoading(true);
    Promise.all([
      BhumiApi.getMutations(),
      BhumiApi.listFlaggedKhatians(),
      BhumiApi.listDisputes(),
      BhumiApi.getStatsSummary(),
    ])
      .then(([muts, khats, dsps, st]) => {
        setMutations(muts);
        setFlaggedKhatians(khats);
        setDisputes(dsps);
        setStats(st);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAcLandData();
  }, []);

  useEffect(() => {
    if (activeSubTab && ['mutations', 'khatians', 'disputes', 'explorer', 'verifier'].includes(activeSubTab)) {
      setSubTab(activeSubTab as AcLandTab);
    }
  }, [activeSubTab]);

  const handleTabChange = (target: AcLandTab) => {
    setSubTab(target);
    setActiveSubTab(target);
  };

  const switchToAcLandRole = async () => {
    const res = await BhumiApi.switchDemoRole('ac_land');
    if (res?.access_token && res?.user) {
      setToken(res.access_token);
      setUser(res.user);
    } else {
      setRole('ac_land');
    }
  };

  const handleDecision = async (mutationId: number, status: 'APPROVED' | 'REJECTED') => {
    const note =
      status === 'APPROVED'
        ? 'এসি ল্যান্ড কর্তৃক অনুমোদিত এবং বিএস খতিয়ান স্বয়ংক্রিয়ভাবে হালনাগাদ করা হয়েছে।'
        : 'এসি ল্যান্ড কর্তৃক কাগজপত্রের অসামঞ্জস্যতার কারণে নামজারি না-মঞ্জুর।';
    const res = await BhumiApi.decideMutation(mutationId, status, note);
    setActionMsg(lang === 'bn' ? res.message_bn : res.message_en);
    if (selectedMutation && selectedMutation.id === mutationId) {
      setSelectedMutation(null);
    }
    loadAcLandData();
  };

  const handleReconcileKhatian = async (plotId: number, currentArea: number) => {
    const res = await BhumiApi.reconcileKhatian(plotId, {
      resolution_note_bn:
        'এসি ল্যান্ড শুনানি ও মাঠ জরিপের মাধ্যমে আরএস-বিএস খতিয়ান চেইন ও ওয়ারিশ অংশ সমন্বয় করা হলো।',
      updated_area_decimal: currentArea,
    });
    setActionMsg(lang === 'bn' ? res.message_bn : res.message_en);
    loadAcLandData();
  };

  const handleResolveDispute = async (
    disputeId: number,
    status: 'RESOLVED_DISMISSED' | 'UPHELD_FROZEN'
  ) => {
    const note =
      status === 'UPHELD_FROZEN'
        ? 'অভিযোগের প্রাথমিক সত্যতা পাওয়ায় আদালতের চূড়ান্ত নিষ্পত্তি না হওয়া পর্যন্ত এই দাগের সকল হস্তান্তর স্থগিত (Frozen) করা হলো।'
        : 'উভয় পক্ষের শুনানি শেষে অভিযোগের ভিত্তি না থাকায় তা নিষ্পত্তি ও খারিজ করা হলো।';
    const res = await BhumiApi.resolveDispute(disputeId, {
      status,
      resolution_note_bn: note,
    });
    setActionMsg(lang === 'bn' ? res.message_bn : res.message_en);
    loadAcLandData();
  };

  // Filtered mutations
  const filteredMutations = useMemo(() => {
    return mutations.filter((m) => {
      if (mutationFilter !== 'ALL' && m.status !== mutationFilter) {
        return false;
      }
      if (!mutationSearch.trim()) return true;
      const q = mutationSearch.toLowerCase();
      return (
        m.case_no?.toLowerCase().includes(q) ||
        m.deed_no?.toLowerCase().includes(q) ||
        m.dag_no?.toString().includes(q) ||
        m.mouza_bn?.toLowerCase().includes(q) ||
        m.mouza_en?.toLowerCase().includes(q) ||
        m.seller_name_bn?.toLowerCase().includes(q) ||
        m.buyer_name_bn?.toLowerCase().includes(q)
      );
    });
  }, [mutations, mutationFilter, mutationSearch]);

  return (
    <div className="space-y-6">
      <header className="page-intro animate-rise">
        <h1>{t('এসি ল্যান্ড কনসোল', 'AC Land Console')}</h1>
        <p>{t('ই-মিউটেশন অনুমোদন, খতিয়ান সমন্বয় ও নাগরিক বিরোধ ট্রাইব্যুনাল।', 'Approve e-mutations, reconcile khatians, and hear citizen dispute cases.')}</p>
      </header>
      {/* RBAC Guard Notice if not logged in as ac_land or admin */}
      {role !== 'ac_land' && role !== 'admin' && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0A1F1C]">
            <KeyRound className="w-4 h-4 text-[#C4891A]" />
            <span>
              {t(
                'দাপ্তরিক অ্যাক্সেস নোটিশ: এসি ল্যান্ড মিউটেশন ও খতিয়ান কন্ট্রোল ব্যবহার করতে এসি ল্যান্ড সেশনে প্রবেশ করুন।',
                'Access Notice: Switch to the AC Land Officer session for mutation, khatian, and tribunal controls.'
              )}
            </span>
          </div>
          <button
            onClick={switchToAcLandRole}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#074f38] hover:bg-[#053b2a] text-white font-bold text-xs cursor-pointer min-h-[36px] transition-colors"
          >
            {t('এসি ল্যান্ড প্যানেলে প্রবেশ করুন →', 'Activate AC Land Session →')}
          </button>
        </div>
      )}

      {/* AC Land Operational KPI Strip (Role-Specific) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-rise">
        <div className="panel p-4 border border-[#006A4E]/15 bg-white shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
              {t('অপেক্ষমাণ ই-নামজারি', 'Pending e-Mutations')}
            </div>
            <div className="text-2xl font-extrabold text-[#006A4E] mt-1">
              {toBanglaDigits(mutations.filter((m) => m.status === 'PENDING').length, lang)}
            </div>
            <button
              onClick={() => handleTabChange('mutations')}
              className="text-xs text-[#006A4E] font-semibold hover:underline mt-1 block cursor-pointer"
            >
              {t('মিউটেশন কিউ দেখুন →', 'Review Mutation Queue →')}
            </button>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#006A4E] flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="panel p-4 border border-[#006A4E]/15 bg-white shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
              {t('খতিয়ান ও ওয়ারিশ সমন্বয়', 'Khatian Discrepancies')}
            </div>
            <div className="text-2xl font-extrabold text-[#C4891A] mt-1">
              {toBanglaDigits(flaggedKhatians.length, lang)}
            </div>
            <button
              onClick={() => handleTabChange('khatians')}
              className="text-xs text-[#C4891A] font-semibold hover:underline mt-1 block cursor-pointer"
            >
              {t('সমন্বয় শুনানি কিউ →', 'Resolve Discrepancies →')}
            </button>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-[#C4891A] flex items-center justify-center">
            <GitCompareArrows className="w-6 h-6" />
          </div>
        </div>

        <div className="panel p-4 border border-[#006A4E]/15 bg-white shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
              {t('নাগরিক বিরোধ ও আপত্তি', 'Dispute Tribunal')}
            </div>
            <div className="text-2xl font-extrabold text-rose-600 mt-1">
              {toBanglaDigits(disputes.length, lang)}
            </div>
            <button
              onClick={() => handleTabChange('disputes')}
              className="text-xs text-rose-600 font-semibold hover:underline mt-1 block cursor-pointer"
            >
              {t('ট্রাইব্যুনাল শুনানি দেখুন →', 'Review Disputes →')}
            </button>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Scale className="w-6 h-6" />
          </div>
        </div>

        <div className="panel p-4 border border-[#006A4E]/15 bg-white shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#5F7A74]">
              {t('খতিয়ান ও দলিল সত্যতা', 'Khatian & Deed Trust')}
            </div>
            <div className="text-2xl font-extrabold text-[#006A4E] mt-1">
              {toBanglaDigits(stats?.kpis?.ledger_integrity_pct ?? 100, lang)}%
            </div>
            <button
              onClick={() => handleTabChange('verifier')}
              className="text-xs text-[#006A4E] font-semibold hover:underline mt-1 block cursor-pointer"
            >
              {t('দলিল ও লেজার যাচাই →', 'Verify Deed & Ledger →')}
            </button>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#006A4E] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Operational Controlling Section */}
      <div className="panel p-6 space-y-6 animate-rise-delay">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#006A4E]/10 pb-4">
          <div>
            <h2 className="font-bold text-lg md:text-xl text-[#074f38] flex items-center gap-2">
              <Landmark className="w-5 h-5 text-[#006A4E]" />
              <span>
                {t(
                  'ই-মিউটেশন কিউ, খতিয়ান চেইন সমন্বয় ও বিরোধ নিষ্পত্তি ট্রাইব্যুনাল',
                  'e-Mutation Queue, Khatian Chain Reconciliation & Dispute Tribunal'
                )}
              </span>
            </h2>
            <p className="text-xs text-[#5F7A74] mt-0.5">
              {t(
                'নিবন্ধিত দলিল হতে স্বয়ংক্রিয়ভাবে আগত নামজারি অনুমোদন এবং বিএস খতিয়ান হস্তান্তর সম্পন্ন:',
                'Approve e-Mutation cases queued from Sub-Registry and update BS Khatian owner shares:'
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleTabChange('mutations')}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                subTab === 'mutations'
                  ? 'bg-[#006A4E] text-white shadow-xs'
                  : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>
                {t('ই-মিউটেশন কিউ', 'e-Mutation Queue')} ({toBanglaDigits(mutations.length, lang)})
              </span>
            </button>
            <button
              onClick={() => handleTabChange('khatians')}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                subTab === 'khatians'
                  ? 'bg-[#006A4E] text-white shadow-xs'
                  : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
              }`}
            >
              <GitCompareArrows className="w-4 h-4" />
              <span>
                {t('খতিয়ান ও ওয়ারিশ সমন্বয়', 'Khatian & Heirs')} (
                {toBanglaDigits(flaggedKhatians.length, lang)})
              </span>
            </button>
            <button
              onClick={() => handleTabChange('disputes')}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                subTab === 'disputes'
                  ? 'bg-[#006A4E] text-white shadow-xs'
                  : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>
                {t('বিরোধ ট্রাইব্যুনাল', 'Dispute Tribunal')} (
                {toBanglaDigits(disputes.length, lang)})
              </span>
            </button>
            <button
              onClick={() => handleTabChange('explorer')}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                subTab === 'explorer'
                  ? 'bg-[#006A4E] text-white shadow-xs'
                  : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>{t('খতিয়ান ও দাগ অনুসন্ধান', 'Khatian Explorer')}</span>
            </button>
            <button
              onClick={() => handleTabChange('verifier')}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] transition-colors ${
                subTab === 'verifier'
                  ? 'bg-[#006A4E] text-white shadow-xs'
                  : 'bg-[#EDF7F4] text-[#0A1F1C]/90 hover:bg-[#E4EFEA]'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>{t('দলিল সত্যতা যাচাই', 'Verify Deed')}</span>
            </button>
          </div>
        </div>

        {actionMsg && (
          <div className="p-4 rounded-xl bg-[#EDF7F4] border-l-4 border-[#006A4E] text-[#006A4E] font-bold text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionMsg}</span>
          </div>
        )}

        {/* TAB 1: e-Mutation Queue Table */}
        {subTab === 'mutations' && (
          <div className="space-y-4">
            {/* Search and Status Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#EDF7F4]/80 p-3 rounded-xl border border-[#006A4E]/12">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-[#5F7A74]/80 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={mutationSearch}
                  onChange={(e) => setMutationSearch(e.target.value)}
                  placeholder={t('কেস নং, দলিল নং বা নাম খুঁজুন...', 'Search case, deed or party...')}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#006A4E]/20 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#006A4E]/30"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setMutationFilter(st)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer min-h-[32px] ${
                      mutationFilter === st
                        ? 'bg-[#006A4E] text-white shadow-xs'
                        : 'bg-white text-[#5F7A74] border border-[#006A4E]/12 hover:bg-[#EDF7F4]'
                    }`}
                  >
                    {st === 'ALL'
                      ? t('সকল (All)', 'All')
                      : st === 'PENDING'
                      ? t('অপেক্ষমান (PENDING)', 'Pending')
                      : st === 'APPROVED'
                      ? t('অনুমোদিত (APPROVED)', 'Approved')
                      : t('বাতিল (REJECTED)', 'Rejected')}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-[#006A4E]/12">
              <table className="table-modern text-xs">
                <thead>
                  <tr className="">
                    <th className="py-3 px-3 font-bold">{t('কেস ও দলিল নং', 'Case & Deed')}</th>
                    <th className="py-3 px-3 font-bold">{t('মৌজা ও দাগ', 'Mouza & Dag')}</th>
                    <th className="py-3 px-3 font-bold">{t('হস্তান্তরকারী → গ্রহীতা', 'Parties')}</th>
                    <th className="py-3 px-3 font-bold">{t('পরিমাণ', 'Area')}</th>
                    <th className="py-3 px-3 font-bold">{t('স্ট্যাটাস', 'Status')}</th>
                    <th className="py-3 px-3 font-bold text-right">
                      {t('এসি ল্যান্ড সিদ্ধান্ত', 'AC Land Decision')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#006A4E]/10 bg-white">
                  {filteredMutations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#5F7A74]">
                        {loading
                          ? t('লোড হচ্ছে...', 'Loading...')
                          : t('কোনো মিউটেশন কেস পাওয়া যায়নি।', 'No mutation cases found.')}
                      </td>
                    </tr>
                  ) : (
                    filteredMutations.map((m) => (
                      <tr key={m.id} className="hover:bg-[#EDF7F4]/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-[#074f38]">
                          <div className="flex items-center gap-1.5">
                            <span>{m.case_no || `MUT-#${m.id}`}</span>
                          </div>
                          <div className="text-[10px] text-[#006A4E] font-sans">
                            {t('দলিল:', 'Deed:')} {m.deed_no}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#0A1F1C]/90">
                          {lang === 'bn' ? m.mouza_bn : m.mouza_en} — {t('দাগ নং', 'Dag')}{' '}
                          {toBanglaDigits(m.dag_no, lang)}
                        </td>
                        <td className="py-3 px-3 text-[#5F7A74]">
                          <div>
                            <span className="text-[#5F7A74]/80 text-[10px] mr-1">{t('বিক্রেতা:', 'From:')}</span>
                            {m.seller_name_bn}
                          </div>
                          <div>
                            <span className="text-[#5F7A74]/80 text-[10px] mr-1">{t('নামজারি:', 'To:')}</span>
                            <strong>{m.buyer_name_bn}</strong>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-bold text-[#0A1F1C]/90">
                          {toBanglaDigits(m.area_decimal, lang)} {t('শতাংশ', 'Decimal')}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold inline-block ${
                              m.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : m.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedMutation(m)}
                              className="px-2 py-1 rounded bg-[#EDF7F4] hover:bg-[#E4EFEA] text-[#0A1F1C]/90 font-bold text-[11px] flex items-center gap-1 cursor-pointer min-h-[30px]"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{t('শুনানি', 'Details')}</span>
                            </button>

                            {m.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleDecision(m.id, 'APPROVED')}
                                  className="px-2.5 py-1 rounded bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer min-h-[30px] transition-colors"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{t('অনুমোদন', 'Approve')}</span>
                                </button>
                                <button
                                  onClick={() => handleDecision(m.id, 'REJECTED')}
                                  className="px-2.5 py-1 rounded bg-[#FF3B4A] hover:bg-[#E02E3C] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer min-h-[30px] transition-colors"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>{t('না-মঞ্জুর', 'Reject')}</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Khatian Chain & Heirs Reconciliation Control */}
        {subTab === 'khatians' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#EDF7F4]/60 border border-[#006A4E]/20 text-xs text-[#074f38] flex items-start gap-3">
              <GitCompareArrows className="w-5 h-5 text-[#006A4E] shrink-0 mt-0.5" />
              <div>
                <strong>{t('খতিয়ান চেইন অডিট প্রটোকল:', 'Khatian Lineage Audit Protocol:')}</strong>{' '}
                {t(
                  'সিএস (১৯৪০), এসএ (১৯৬২), আরএস (১৯৮৫) এবং বিএস (২০১২) খতিয়ানের মোট জমি ও ওয়ারিশ অংশের ফারায়েজ গণনা অসামঞ্জস্য হলে এসি ল্যান্ড শুনানির মাধ্যমে তা সংশোধন করতে পারেন।',
                  'When total plot area or inherited shares diverge between CS, SA, RS and BS surveys, the AC Land conducts a formal hearing to reconcile records.'
                )}
              </div>
            </div>

            {flaggedKhatians.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#EDF7F4] text-[#006A4E] font-bold text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>{t('সকল ত্রুটিপূর্ণ খতিয়ান সমন্বয় সম্পন্ন হয়েছে!', 'All flagged khatians have been reconciled!')}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {flaggedKhatians.map((fk) => (
                  <div
                    key={fk.id}
                    className="p-5 rounded-xl bg-amber-50/70 border border-amber-300 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-[#0A1F1C]">
                          {lang === 'bn' ? fk.mouza_bn : fk.mouza_en} — {t('দাগ নং', 'Dag')}{' '}
                          {toBanglaDigits(fk.dag_no, lang)}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-white font-mono">
                          খতিয়ান #{fk.khatian_no}
                        </span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-lg bg-amber-600 text-white font-extrabold">
                          {fk.reconcile_status}
                        </span>
                      </div>
                      <p className="text-xs text-[#0A1F1C]/90 leading-relaxed">
                        {lang === 'bn' ? fk.anomaly_note_bn : fk.anomaly_note_en}
                      </p>
                      <div className="text-[11px] text-[#5F7A74] font-mono pt-1">
                        নথিভুক্ত পরিমাণ: {fk.total_area_decimal} শতাংশ
                      </div>
                    </div>

                    <button
                      onClick={() => handleReconcileKhatian(fk.plot_id, Number(fk.total_area_decimal))}
                      className="px-4 py-2.5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-extrabold text-xs shrink-0 cursor-pointer min-h-[38px] flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t('শুনানি ও জরিপের মাধ্যমে সমন্বয় করুন', 'Reconcile Khatian Lineage')}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Citizen Dispute Resolution Control */}
        {subTab === 'disputes' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#EDF7F4]/80 border border-[#006A4E]/12 text-xs text-[#0A1F1C]/90 flex items-start gap-3">
              <Scale className="w-5 h-5 text-[#006A4E] shrink-0 mt-0.5" />
              <div>
                <strong>{t('এসি ল্যান্ড ট্রাইব্যুনাল এক্তিয়ার:', 'AC Land Dispute Tribunal Jurisdiction:')}</strong>{' '}
                {t(
                  'নাগরিক কর্তৃক দায়েরকৃত ওয়ারিশ জালিয়াতি বা সীমা বিরোধের ক্ষেত্রে এসি ল্যান্ড দাগের জমি ফ্রিজ (হস্তান্তর নিষিদ্ধ) করতে পারেন অথবা শুনানি শেষে নিষ্পত্তি করতে পারেন।',
                  'Under State Acquisition & Tenancy Act, AC Land can place an emergency hold (freeze) on disputed plots or dismiss fraudulent complaints.'
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {disputes.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#EDF7F4]/80 text-[#5F7A74] text-xs text-center border border-[#006A4E]/12">
                  {t('কোনো অমীমাংসিত অভিযোগ নেই।', 'No pending citizen disputes.')}
                </div>
              ) : (
                disputes.map((dsp) => (
                  <div
                    key={dsp.id}
                    className={`p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs ${
                      dsp.status === 'OPEN'
                        ? 'bg-amber-50/60 border-amber-300'
                        : 'bg-white border-[#006A4E]/12'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-[#0A1F1C]">
                          {lang === 'bn' ? dsp.mouza_bn : dsp.mouza_en} — {t('দাগ নং', 'Dag')} {dsp.dag_no}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#074f38] text-white font-mono font-bold">
                          {dsp.dispute_type}
                        </span>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-lg font-extrabold ${
                            dsp.status === 'OPEN'
                              ? 'bg-amber-500 text-white'
                              : dsp.status === 'UPHELD_FROZEN'
                              ? 'bg-rose-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {dsp.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#0A1F1C]/90 leading-relaxed">{dsp.description_bn}</p>
                      {dsp.complainant_name_bn && (
                        <div className="text-[11px] text-[#5F7A74]">
                          {t('অভিযোগকারী:', 'Complainant:')} <strong>{dsp.complainant_name_bn}</strong>{' '}
                          {dsp.complainant_nid && `(NID: ${dsp.complainant_nid})`}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      {dsp.status === 'OPEN' && (
                        <>
                          <button
                            onClick={() => handleResolveDispute(dsp.id, 'UPHELD_FROZEN')}
                            className="px-3.5 py-2 rounded-lg bg-[#FF3B4A] hover:bg-[#E02E3C] text-white font-bold text-xs cursor-pointer min-h-[36px] flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <span>🔒 {t('দাগ ফ্রিজ (Freeze Plot)', 'Uphold & Freeze')}</span>
                          </button>
                          <button
                            onClick={() => handleResolveDispute(dsp.id, 'RESOLVED_DISMISSED')}
                            className="px-3.5 py-2 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs cursor-pointer min-h-[36px] flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t('নিষ্পত্তি ও খারিজ (Dismiss)', 'Resolve & Dismiss')}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: In-Panel Officer Khatian Explorer */}
        {subTab === 'explorer' && (
          <OfficerKhatianExplorer
            onSelectPlotForAction={(plotId) => {
              handleTabChange('khatians');
            }}
            actionLabel={t('খতিয়ান রেকর্ড সমন্বয়', 'Reconcile Khatian')}
            actionType="reconcile"
          />
        )}

        {/* TAB 5: In-Panel Officer Deed Verifier */}
        {subTab === 'verifier' && <OfficerDeedVerifier />}
      </div>

      {/* Hearing / Case Details Modal */}
      {selectedMutation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-[#006A4E]/12 space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-[#006A4E]" />
                <h3 className="font-extrabold text-[#0A1F1C] text-sm">
                  {t('ই-মিউটেশন কেস শুনানি বিবরণী', 'e-Mutation Hearing Record')}
                </h3>
              </div>
              <button
                onClick={() => setSelectedMutation(null)}
                className="p-1 rounded text-[#5F7A74]/80 hover:text-[#5F7A74] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#0A1F1C]/90">
              <div className="p-3 bg-[#EDF7F4]/80 rounded-lg space-y-1 font-mono">
                <div><strong>CASE NO:</strong> {selectedMutation.case_no || `MUT-#${selectedMutation.id}`}</div>
                <div><strong>REGISTERED DEED NO:</strong> {selectedMutation.deed_no}</div>
                <div><strong>MOUZA & DAG:</strong> {selectedMutation.mouza_bn} — দাগ নং {selectedMutation.dag_no}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#EDF7F4]/80 rounded-lg">
                  <span className="text-[10px] text-[#5F7A74] block">{t('মূল মালিক (Seller):', 'Seller:')}</span>
                  <strong>{selectedMutation.seller_name_bn}</strong>
                </div>
                <div className="p-3 bg-[#EDF7F4]/80 rounded-lg">
                  <span className="text-[10px] text-[#5F7A74] block">{t('নতুন খতিয়ান গ্রহীতা (Buyer):', 'Buyer:')}</span>
                  <strong>{selectedMutation.buyer_name_bn}</strong>
                </div>
              </div>

              <div className="p-3 bg-[#EDF7F4] border border-[#006A4E]/30 rounded-lg text-[#006A4E]">
                <span className="text-[10px] font-bold block">{t('হস্তান্তরিত জমির পরিমাণ:', 'Mutation Area:')}</span>
                <span className="text-base font-extrabold">
                  {toBanglaDigits(selectedMutation.area_decimal, lang)} {t('শতাংশ', 'Decimal')}
                </span>
                <p className="text-[11px] mt-1">
                  {t(
                    'অনুমোদন দিলে বিক্রেতার বিএস খতিয়ান হতে স্বয়ংক্রিয়ভাবে এই অংশ বিয়োগ হয়ে ক্রেতার নামে নতুন বিএস খতিয়ান সৃষ্টি হবে।',
                    'Approving will deduct area from seller and mint new BS khatian entry for buyer.'
                  )}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              {selectedMutation.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => handleDecision(selectedMutation.id, 'REJECTED')}
                    className="px-4 py-2 rounded-lg bg-[#FF3B4A] text-white text-xs font-bold cursor-pointer"
                  >
                    {t('না-মঞ্জুর করুন', 'Reject')}
                  </button>
                  <button
                    onClick={() => handleDecision(selectedMutation.id, 'APPROVED')}
                    className="px-4 py-2 rounded-lg bg-[#006A4E] text-white text-xs font-bold cursor-pointer"
                  >
                    {t('শুনানি মঞ্জুর ও খতিয়ান হালনাগাদ', 'Approve & Mutate')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
