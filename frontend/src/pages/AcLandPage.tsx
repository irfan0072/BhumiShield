import React, { useEffect, useState } from 'react';
import { Landmark, CheckCircle2, XCircle, QrCode } from 'lucide-react';
import { apiClient, extractErrorMessage } from '../api/client';
import { useI18n } from '../i18n';
import { getVerdictStyle } from '../theme/tokens';

interface AcLandPageProps {
  onOpenDeedVerify: (deedNo: string) => void;
}

export const AcLandPage: React.FC<AcLandPageProps> = ({ onOpenDeedVerify }) => {
  const { lang, t, n } = useI18n();
  const [mutations, setMutations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reasonInputs, setReasonInputs] = useState<Record<number, string>>({});

  const loadMutations = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/mutations');
      setMutations(res.data.items || []);
    } catch (err) {
      setError(extractErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMutations();
  }, []);

  const handleDecision = async (mutId: number, decision: 'APPROVED' | 'REJECTED') => {
    const defaultReasonBn =
      decision === 'APPROVED'
        ? 'সাব-রেজিস্ট্রি লেজারের ডিজিটাল স্বাক্ষর ও মালিকানা অংশ সঠিক থাকায় ই-নামজারি অনুমোদিত।'
        : 'দলিলের হ্যাশ অমিল বা মালিকানা ঝুঁকির কারণে ই-নামজারি আবেদন না-মঞ্জুর করা হলো।';
    const reasonBn = reasonInputs[mutId]?.trim() || defaultReasonBn;

    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await apiClient.post(`/mutations/${mutId}/decide`, {
        decision,
        reason_bn: reasonBn,
      });
      setFeedback(t(res.data.message_bn, res.data.message_en));
      await loadMutations();
    } catch (err) {
      setError(extractErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white border border-gray-200 p-6 shadow-xs hc-card">
        <span className="text-xs font-bold uppercase px-3 py-1 rounded-full bg-[#E6F2EE] text-[#006A4E]">
          {t('সহকারী কমিশনার (ভূমি) — ভূমি মন্ত্রণালয়', 'AC Land Office — Ministry of Land')}
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mt-2 flex items-center gap-2.5">
          <Landmark className="w-8 h-8 text-[#006A4E]" />
          <span>
            {t(
              'ই-নামজারি (মিউটেশন) কিউ ও স্বয়ংক্রিয় দলিল সত্যতা যাচাই',
              'e-Mutation Queue with Live Deed Ledger & Fraud Verification'
            )}
          </span>
        </h1>
        <p className="text-sm text-[#5F6B66] mt-1">
          {t(
            'সাব-রেজিস্ট্রি অফিস হতে আগত প্রতিটি দলিলের ডিজিটাল স্বাক্ষর ও ঝুঁকি ফ্ল্যাগ দেখে নামজারি অনুমোদন বা বাতিল করুন। অনুমোদন করলে স্বয়ংক্রিয়ভাবে বিএস খতিয়ান ও হ্যাশ-চেইন অডিট লগ হালনাগাদ হবে।',
            'Review incoming registered deeds with live SHA-256 verification and risk flags. Approving updates BS Khatian ownership and appends to the hash-chained audit log.'
          )}
        </p>
      </section>

      {feedback && (
        <div className="p-4 rounded-2xl bg-[#E6F2EE] border-2 border-[#006A4E] text-[#006A4E] font-bold">
          ✔ {feedback}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-[#FEECEE] border-2 border-[#F42A41] text-[#C81E32] font-bold">
          ✖ {error}
        </div>
      )}

      <div className="space-y-4">
        {mutations.map((item) => {
          const deedValid = item.deed_verification?.is_valid;
          const riskVerdict = deedValid ? item.risk_report?.verdict : 'HIGH_RISK';
          const st = getVerdictStyle(riskVerdict);

          return (
            <section
              key={item.id}
              className={`rounded-2xl bg-white border-2 ${st.border} p-5 sm:p-6 shadow-xs space-y-4 hc-card`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold text-[#1A1A1A]">{item.case_no}</span>
                    <span className={`px-3 py-0.5 rounded-full text-xs font-bold text-white ${st.bg}`}>
                      {deedValid
                        ? t('✔ দলিলের হ্যাশ ও স্বাক্ষর সঠিক', '✔ Deed Hash & Signature Valid')
                        : t('✖ দলিল টেম্পারড (হ্যাশ অমিল)!', '✖ DEED TAMPERED (HASH MISMATCH)!')}
                    </span>
                    <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-[#1A1A1A]">
                      {item.status === 'PENDING'
                        ? t('⏳ সিদ্ধান্তের অপেক্ষায়', '⏳ PENDING')
                        : item.status === 'APPROVED'
                        ? t('✔ নামজারি অনুমোদিত', '✔ APPROVED')
                        : t('✖ না-মঞ্জুর', '✖ REJECTED')}
                    </span>
                  </div>
                  <div className="text-sm text-[#5F6B66] mt-1">
                    {t('দলিল নং:', 'Deed No:')} <strong>{item.deed_no}</strong> •{' '}
                    {t('মৌজা:', 'Mouza:')} {t(item.mouza_bn, item.mouza_en)} •{' '}
                    {t('দাগ নং:', 'Dag:')} {n(item.dag_no)} •{' '}
                    {t('জমির পরিমাণ:', 'Area:')} {n(item.area_decimal)} {t('শতাংশ', 'Decimals')}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenDeedVerify(item.deed_no)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#006A4E] text-[#006A4E] font-bold text-xs flex items-center gap-1.5 hover:bg-[#E6F2EE] cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{t('দলিলের হ্যাশ যাচাই দেখুন', 'Inspect Deed Ledger')}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-3.5 rounded-xl bg-[#FAFBFA] border border-gray-200">
                  <span className="text-xs font-bold text-[#5F6B66]">
                    {t('দাতা / বিক্রেতা:', 'Seller:')}
                  </span>
                  <div className="font-bold text-[#1A1A1A]">
                    {t(item.seller_name_bn, item.seller_name_en)} (NID: {n(item.seller_nid)})
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAFBFA] border border-gray-200">
                  <span className="text-xs font-bold text-[#5F6B66]">
                    {t('গ্রহীতা / ক্রেতা (নামজারি আবেদনকারী):', 'Buyer (Mutation Applicant):')}
                  </span>
                  <div className="font-bold text-[#1A1A1A]">
                    {t(item.buyer_name_bn, item.buyer_name_en)} (NID: {n(item.buyer_nid)})
                  </div>
                </div>
              </div>

              {/* Show Any Risk Flags */}
              {(!deedValid || (item.risk_report?.flags && item.risk_report.flags.length > 0)) && (
                <div className="p-4 rounded-xl bg-[#FEECEE] border border-[#F42A41]/40 space-y-1.5">
                  <div className="font-bold text-sm text-[#C81E32]">
                    {t('শনাক্তকৃত ঝুঁকি ও সতর্কবার্তা:', 'Detected Risk Flags:')}
                  </div>
                  {!deedValid && (
                    <p className="text-sm text-[#C81E32] font-semibold">
                      ✖ {t(item.deed_verification.message_bn, item.deed_verification.message_en)}
                    </p>
                  )}
                  {item.risk_report?.flags?.map((fl: any, i: number) => (
                    <p key={i} className="text-sm text-[#1A1A1A]">
                      • <strong>{t(fl.title_bn, fl.title_en)}:</strong> {t(fl.message_bn, fl.message_en)}
                    </p>
                  ))}
                </div>
              )}

              {/* Decision Controls for Pending Cases */}
              {item.status === 'PENDING' ? (
                <div className="pt-2 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <input
                    type="text"
                    value={reasonInputs[item.id] || ''}
                    onChange={(e) =>
                      setReasonInputs((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    placeholder={t(
                      'এসি ল্যান্ডের মন্তব্য / আদেশের কারণ লিখুন (ঐচ্ছিক)...',
                      'Enter AC Land order reason (optional)...'
                    )}
                    className="flex-1 min-h-[48px] px-4 py-2 rounded-xl border border-gray-300 bg-[#FAFBFA] text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleDecision(item.id, 'REJECTED')}
                      className="min-h-[48px] px-4 py-2 rounded-xl bg-[#F42A41] text-white font-bold text-sm flex items-center gap-1.5 hover:bg-[#D01F34] cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{t('না-মঞ্জুর করুন', 'Reject Mutation')}</span>
                    </button>
                    <button
                      type="button"
                      disabled={loading || !deedValid}
                      onClick={() => handleDecision(item.id, 'APPROVED')}
                      className="min-h-[48px] px-5 py-2 rounded-xl bg-[#006A4E] disabled:bg-gray-400 text-white font-bold text-sm flex items-center gap-1.5 hover:bg-[#00563F] cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t('নামজারি অনুমোদন করুন', 'Approve & Update Khatian')}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-[#5F6B66] bg-[#FAFBFA] p-3 rounded-xl border border-gray-200">
                  <strong>{t('এসি ল্যান্ডের আদেশ:', 'AC Land Order:')}</strong>{' '}
                  {t(item.decision_reason_bn || '', item.decision_reason_en || '')}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};
