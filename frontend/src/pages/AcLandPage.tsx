import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { VelzonOverviewSection } from '../components/VelzonOverviewSection';
import {
  Landmark,
  CheckCircle2,
  XCircle,
  Clock,
  GitCompareArrows,
  AlertOctagon,
  KeyRound,
} from 'lucide-react';

export const AcLandPage: React.FC = () => {
  const { lang, role, setRole, setUser, setToken, t } = useAppUI();
  const [subTab, setSubTab] = useState<'mutations' | 'khatians' | 'disputes'>('mutations');

  const [mutations, setMutations] = useState<any[]>([]);
  const [flaggedKhatians, setFlaggedKhatians] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

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

  return (
    <div className="space-y-6">
      {role !== 'ac_land' && role !== 'admin' && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <KeyRound className="w-4 h-4 text-[#B7791F]" />
            <span>
              {t(
                'দাপ্তরিক অ্যাক্সেস নোটিশ: এসি ল্যান্ড মিউটেশন ও খতিয়ান কন্ট্রোল ব্যবহার করতে এসি ল্যান্ড সেশনে প্রবেশ করুন।',
                'Access Notice: Switch to the AC Land Officer session for mutation, khatian, and tribunal controls.'
              )}
            </span>
          </div>
          <button
            onClick={switchToAcLandRole}
            className="px-3.5 py-1.5 rounded-lg bg-[#253656] text-white font-bold text-xs cursor-pointer min-h-[34px]"
          >
            {t('এসি ল্যান্ড প্যানেলে প্রবেশ করুন →', 'Activate AC Land Session →')}
          </button>
        </div>
      )}

      {/* Velzon Executive Overview Grid for AC Land */}
      <VelzonOverviewSection
        role="ac_land"
        stats={stats}
        onQuickAction={() => setSubTab('khatians')}
      />

      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg md:text-xl font-extrabold text-slate-800 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-[#006A4E]" />
              <span>
                {t(
                  'ই-মিউটেশন কিউ, খতিয়ান চেইন সমন্বয় ও বিরোধ নিষ্পত্তি সিস্টেম',
                  'e-Mutation Queue, Khatian Chain Reconciliation & Dispute Tribunal'
                )}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                'নিবন্ধিত দলিল হতে স্বয়ংক্রিয়ভাবে আগত নামজারি অনুমোদন এবং বিএস খতিয়ান হালনাগাদ:',
                'Approve e-Mutation cases queued from Sub-Registry and automatically update BS Khatian shares:'
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSubTab('mutations')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[38px] ${
                subTab === 'mutations'
                  ? 'bg-[#253656] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>
                {t('ই-মিউটেশন কিউ', 'e-Mutation Queue')} ({toBanglaDigits(mutations.length, lang)})
              </span>
            </button>
            <button
              onClick={() => setSubTab('khatians')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[38px] ${
                subTab === 'khatians'
                  ? 'bg-[#253656] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <GitCompareArrows className="w-4 h-4" />
              <span>
                {t('খতিয়ান ও ওয়ারিশ সমন্বয়', 'Khatian & Heirs Reconcile')} (
                {toBanglaDigits(flaggedKhatians.length, lang)})
              </span>
            </button>
            <button
              onClick={() => setSubTab('disputes')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[38px] ${
                subTab === 'disputes'
                  ? 'bg-[#253656] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <AlertOctagon className="w-4 h-4" />
              <span>
                {t('নাগরিক বিরোধ নিষ্পত্তি', 'Citizen Disputes')} (
                {toBanglaDigits(disputes.length, lang)})
              </span>
            </button>
          </div>
        </div>

        {actionMsg && (
          <div className="p-4 rounded-xl bg-[#E6F2EE] border-l-8 border-[#006A4E] text-[#006A4E] font-bold text-xs">
            {actionMsg}
          </div>
        )}

        {loading && <p className="text-xs text-slate-500">{t('লোড হচ্ছে...', 'Loading...')}</p>}

        {/* TAB 1: e-Mutation Queue Table */}
        {subTab === 'mutations' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-500 uppercase">
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
              <tbody className="divide-y divide-slate-100">
                {mutations.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 font-mono font-bold text-[#253656]">
                      <div>{m.case_no || `MUT-#${m.id}`}</div>
                      <div className="text-[10px] text-[#006A4E]">{m.deed_no}</div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">
                      {lang === 'bn' ? m.mouza_bn : m.mouza_en} — {t('দাগ নং', 'Dag')}{' '}
                      {toBanglaDigits(m.dag_no, lang)}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {m.seller_name_bn} → <strong>{m.buyer_name_bn}</strong>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-700">
                      {toBanglaDigits(m.area_decimal, lang)} {t('শতাংশ', 'Decimal')}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          m.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {m.status === 'PENDING' ? (
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => handleDecision(m.id, 'APPROVED')}
                            className="px-2.5 py-1 rounded bg-[#006A4E] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer min-h-[30px]"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t('অনুমোদন', 'Approve')}</span>
                          </button>
                          <button
                            onClick={() => handleDecision(m.id, 'REJECTED')}
                            className="px-2.5 py-1 rounded bg-[#F42A41] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer min-h-[30px]"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{t('না-মঞ্জুর', 'Reject')}</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-semibold">
                          {t('নিষ্পত্তিকৃত', 'Completed')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: Khatian Chain & Heirs Reconciliation Control */}
        {subTab === 'khatians' && (
          <div className="space-y-3">
            {flaggedKhatians.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#E6F2EE] text-[#006A4E] font-bold text-xs">
                ✔ {t('সকল ত্রুটিপূর্ণ খতিয়ান সমন্বয় সম্পন্ন হয়েছে!', 'All flagged khatians have been reconciled!')}
              </div>
            ) : (
              flaggedKhatians.map((fk) => (
                <div
                  key={fk.id}
                  className="p-4 rounded-xl bg-amber-50/60 border border-amber-300 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-800">
                        {lang === 'bn' ? fk.mouza_bn : fk.mouza_en} — {t('দাগ নং', 'Dag')}{' '}
                        {toBanglaDigits(fk.dag_no, lang)} ({fk.khatian_no})
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#B7791F] text-white font-extrabold">
                        {fk.reconcile_status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1">
                      {lang === 'bn' ? fk.anomaly_note_bn : fk.anomaly_note_en}
                    </p>
                  </div>

                  <button
                    onClick={() => handleReconcileKhatian(fk.plot_id, Number(fk.total_area_decimal))}
                    className="px-4 py-2 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-extrabold text-xs shrink-0 cursor-pointer min-h-[36px]"
                  >
                    ✔ {t('শুনানি ও জরিপের মাধ্যমে চেইন সমন্বয় করুন', 'Reconcile Khatian Chain')}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: Citizen Dispute Resolution Control */}
        {subTab === 'disputes' && (
          <div className="space-y-3">
            {disputes.map((dsp) => (
              <div
                key={dsp.id}
                className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  dsp.status === 'OPEN'
                    ? 'bg-amber-50/50 border-amber-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-800">
                      {lang === 'bn' ? dsp.mouza_bn : dsp.mouza_en} — {t('দাগ নং', 'Dag')} {dsp.dag_no}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-white font-mono">
                      {dsp.dispute_type}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-[#B7791F] text-white">
                      {dsp.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1">{dsp.description_bn}</p>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                  {dsp.status === 'OPEN' && (
                    <>
                      <button
                        onClick={() => handleResolveDispute(dsp.id, 'UPHELD_FROZEN')}
                        className="px-3 py-1.5 rounded-lg bg-[#F42A41] text-white font-bold text-xs cursor-pointer min-h-[34px]"
                      >
                        🔒 {t('দাগ ফ্রিজ (Freeze Plot)', 'Uphold & Freeze Plot')}
                      </button>
                      <button
                        onClick={() => handleResolveDispute(dsp.id, 'RESOLVED_DISMISSED')}
                        className="px-3 py-1.5 rounded-lg bg-[#006A4E] text-white font-bold text-xs cursor-pointer min-h-[34px]"
                      >
                        ✔ {t('নিষ্পত্তি ও খারিজ (Dismiss)', 'Resolve & Dismiss')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
