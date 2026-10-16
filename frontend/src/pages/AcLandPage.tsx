import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
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
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const loadAcLandData = () => {
    setLoading(true);
    Promise.all([
      BhumiApi.getMutations(),
      BhumiApi.listFlaggedKhatians(),
      BhumiApi.listDisputes(),
    ])
      .then(([muts, khats, dsps]) => {
        setMutations(muts);
        setFlaggedKhatians(khats);
        setDisputes(dsps);
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
        <div className="p-4 rounded-2xl bg-[#FEF3C7] border-2 border-[#B7791F] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold text-[#1A1A1A]">
            <KeyRound className="w-5 h-5 text-[#B7791F]" />
            <span>
              {t(
                'RBAC মিডলওয়্যার বিজ্ঞপ্তি: এসি ল্যান্ড কন্ট্রোল ব্যবহার করতে এসি ল্যান্ড রোলে সুইচ করুন।',
                'RBAC Middleware Notice: Switch to AC Land role for mutation & khatian controls.'
              )}
            </span>
          </div>
          <button
            onClick={switchToAcLandRole}
            className="px-4 py-2 rounded-xl bg-[#006A4E] text-white font-extrabold text-xs cursor-pointer"
          >
            {t('এসি ল্যান্ড রোলে সুইচ করুন →', 'Switch to AC Land Role →')}
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-[#E6F2EE] text-[#006A4E]">
              {t('এসি ল্যান্ড কন্ট্রোল ড্যাশবোর্ড (ভূমি মন্ত্রণালয়)', 'AC Land Control Console (Ministry of Land)')}
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#1A1A1A] mt-2 flex items-center gap-2">
              <Landmark className="w-7 h-7 text-[#006A4E]" />
              <span>
                {t(
                  'ই-মিউটেশন কিউ, খতিয়ান চেইন সমন্বয় ও বিরোধ নিষ্পত্তি সিস্টেম',
                  'e-Mutation Queue, Khatian Chain Reconciliation & Dispute Resolution'
                )}
              </span>
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSubTab('mutations')}
              className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 cursor-pointer ${
                subTab === 'mutations' ? 'bg-[#006A4E] text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{t('ই-মিউটেশন কিউ', 'e-Mutation Queue')}</span>
            </button>
            <button
              onClick={() => setSubTab('khatians')}
              className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 cursor-pointer ${
                subTab === 'khatians' ? 'bg-[#006A4E] text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <GitCompareArrows className="w-4 h-4" />
              <span>
                {t('খতিয়ান চেইন ও ওয়ারিশ সমন্বয়', 'Khatian & Heirs Reconcile')} ({flaggedKhatians.length})
              </span>
            </button>
            <button
              onClick={() => setSubTab('disputes')}
              className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 cursor-pointer ${
                subTab === 'disputes' ? 'bg-[#006A4E] text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <AlertOctagon className="w-4 h-4" />
              <span>
                {t('নাগরিক অভিযোগ নিষ্পত্তি', 'Citizen Disputes')} ({disputes.length})
              </span>
            </button>
          </div>
        </div>

        {actionMsg && (
          <div className="p-4 rounded-xl bg-[#E6F2EE] border-l-8 border-[#006A4E] text-[#006A4E] font-bold">
            {actionMsg}
          </div>
        )}

        {loading && <p>{t('লোড হচ্ছে...', 'Loading...')}</p>}

        {/* TAB 1: e-Mutation Queue */}
        {subTab === 'mutations' && (
          <div className="space-y-4 pt-2">
            {mutations.map((m) => (
              <div
                key={m.id}
                className="bg-gray-50 rounded-2xl p-5 border border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm px-2.5 py-0.5 rounded bg-gray-100">
                      Mutation #{toBanglaDigits(m.id, lang)}
                    </span>
                    <span className="font-bold text-[#006A4E]">{m.deed_no}</span>
                    <span
                      className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                        m.status === 'APPROVED'
                          ? 'bg-[#E6F2EE] text-[#006A4E]'
                          : m.status === 'REJECTED'
                          ? 'bg-[#FEECEE] text-[#F42A41]'
                          : 'bg-[#FEF3C7] text-[#B7791F]'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>

                  <p className="font-bold text-lg text-[#1A1A1A]">
                    {lang === 'bn' ? m.mouza_bn : m.mouza_en} — {t('দাগ নং', 'Dag')}{' '}
                    {toBanglaDigits(m.dag_no, lang)} ({toBanglaDigits(m.area_decimal, lang)}{' '}
                    {t('শতাংশ', 'Decimal')})
                  </p>
                  <p className="text-sm text-[#5F6B66]">
                    {t('হস্তান্তর:', 'Transfer:')} {m.seller_name_bn} →{' '}
                    <strong>{m.buyer_name_bn}</strong> ({t('অংশ:', 'Share:')} {m.share_fraction})
                  </p>
                  <p className="text-xs font-semibold text-gray-600">{m.decision_note_bn}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {m.status === 'PENDING' ? (
                    <>
                      <button
                        onClick={() => handleDecision(m.id, 'APPROVED')}
                        className="px-4 py-2.5 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t('অনুমোদন ও খতিয়ান আপডেট', 'Approve & Update Khatian')}</span>
                      </button>
                      <button
                        onClick={() => handleDecision(m.id, 'REJECTED')}
                        className="px-4 py-2.5 rounded-xl bg-[#F42A41] hover:bg-red-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>{t('না-মঞ্জুর', 'Reject')}</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-sm font-bold text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{t('সিদ্ধান্ত সম্পন্ন', 'Decision Recorded')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: Khatian Chain & Heirs Reconciliation Control */}
        {subTab === 'khatians' && (
          <div className="space-y-4 pt-2">
            <h2 className="text-lg font-extrabold text-[#1A1A1A]">
              {t(
                'ত্রুটিপূর্ণ বিএস খতিয়ান চেইন (CHAIN_BREAK) ও অমীমাংসিত ওয়ারিশ (UNRESOLVED_HEIRS) সমন্বয় প্যানেল',
                'Flagged BS Khatian Chain Break & Unresolved Heirs Reconciliation'
              )}
            </h2>
            {flaggedKhatians.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#E6F2EE] text-[#006A4E] font-bold">
                ✔ {t('সকল ত্রুটিপূর্ণ খতিয়ান সমন্বয় সম্পন্ন হয়েছে!', 'All flagged khatians have been reconciled!')}
              </div>
            ) : (
              <div className="space-y-3">
                {flaggedKhatians.map((fk) => (
                  <div
                    key={fk.id}
                    className="p-4 rounded-xl bg-[#FEF3C7]/60 border-2 border-[#B7791F] flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[#1A1A1A]">
                          {lang === 'bn' ? fk.mouza_bn : fk.mouza_en} — {t('দাগ নং', 'Dag')}{' '}
                          {toBanglaDigits(fk.dag_no, lang)} ({fk.khatian_no})
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#B7791F] text-white font-extrabold">
                          {fk.reconcile_status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 mt-1">
                        {lang === 'bn' ? fk.anomaly_note_bn : fk.anomaly_note_en}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {t('বিএস রেকর্ডকৃত এরিয়া:', 'BS Recorded Area:')}{' '}
                        {toBanglaDigits(fk.recorded_area_decimal, lang)} {t('শতাংশ', 'dec')} |{' '}
                        {t('দাগের মূল এরিয়া:', 'Plot Total Area:')}{' '}
                        {toBanglaDigits(fk.total_area_decimal, lang)} {t('শতাংশ', 'dec')}
                      </p>
                    </div>

                    <button
                      onClick={() => handleReconcileKhatian(fk.plot_id, Number(fk.total_area_decimal))}
                      className="px-4 py-2.5 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-extrabold text-xs shrink-0 cursor-pointer"
                    >
                      ✔ {t('শুনানি ও জরিপের মাধ্যমে চেইন সমন্বয় করুন', 'Reconcile Khatian Chain')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Citizen Dispute Resolution Control */}
        {subTab === 'disputes' && (
          <div className="space-y-4 pt-2">
            <h2 className="text-lg font-extrabold text-[#1A1A1A]">
              {t(
                'নাগরিকদের দাখিলকৃত অভিযোগ ও আপত্তি নিষ্পত্তি (AC Land Dispute Tribunal)',
                'Citizen Land Objections & Dispute Resolution Controls'
              )}
            </h2>
            <div className="space-y-3">
              {disputes.map((dsp) => (
                <div
                  key={dsp.id}
                  className={`p-4 rounded-xl border-2 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    dsp.status === 'OPEN'
                      ? 'bg-[#FEF3C7]/50 border-[#B7791F]'
                      : dsp.status === 'UPHELD_FROZEN'
                      ? 'bg-[#FEECEE]/50 border-[#F42A41]'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#1A1A1A]">
                        {lang === 'bn' ? dsp.mouza_bn : dsp.mouza_en} — {t('দাগ নং', 'Dag')} {dsp.dag_no}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-white font-mono">
                        {dsp.dispute_type}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold ${
                          dsp.status === 'OPEN'
                            ? 'bg-[#B7791F] text-white'
                            : dsp.status === 'UPHELD_FROZEN'
                            ? 'bg-[#F42A41] text-white'
                            : 'bg-[#006A4E] text-white'
                        }`}
                      >
                        {dsp.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mt-1">{dsp.description_bn}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {t('অভিযোগকারী:', 'Complainant:')} {dsp.complainant_name_bn} (NID: {dsp.complainant_nid})
                    </p>
                    {dsp.resolution_note_bn && (
                      <p className="text-xs font-bold text-[#006A4E] mt-1">
                        {t('সিদ্ধান্ত নোট:', 'Resolution:')} {dsp.resolution_note_bn}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    {dsp.status === 'OPEN' && (
                      <>
                        <button
                          onClick={() => handleResolveDispute(dsp.id, 'UPHELD_FROZEN')}
                          className="px-3.5 py-2 rounded-xl bg-[#F42A41] text-white font-extrabold text-xs cursor-pointer"
                        >
                          🔒 {t('অভিযোগ বহাল ও দাগ ফ্রিজ (Freeze Plot)', 'Uphold & Freeze Plot')}
                        </button>
                        <button
                          onClick={() => handleResolveDispute(dsp.id, 'RESOLVED_DISMISSED')}
                          className="px-3.5 py-2 rounded-xl bg-[#006A4E] text-white font-extrabold text-xs cursor-pointer"
                        >
                          ✔ {t('নিষ্পত্তি ও খারিজ (Dismiss)', 'Resolve & Dismiss')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
