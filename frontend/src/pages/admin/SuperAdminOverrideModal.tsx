import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  X,
  CheckCircle2,
  Lock,
  FileText,
  Building2,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { BhumiApi } from '../../api/client';
import { useAppUI } from '../../i18n';

interface SuperAdminOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
  actionType?: string;
  targetId?: string | number;
  extraContext?: any;
  defaultTargetType?: string;
  defaultTargetId?: string;
}

export const SuperAdminOverrideModal: React.FC<SuperAdminOverrideModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionType,
  targetId: propTargetId,
  extraContext,
  defaultTargetType = 'TRANSFER_STAGE_ADVANCE',
  defaultTargetId = '',
}) => {
  const { t, lang, user } = useAppUI();
  const [targetType, setTargetType] = useState<string>(actionType || defaultTargetType);
  const [targetId, setTargetId] = useState<string>(propTargetId !== undefined ? String(propTargetId) : defaultTargetId);

  useEffect(() => {
    if (actionType) setTargetType(actionType);
    if (propTargetId !== undefined) setTargetId(String(propTargetId));
  }, [actionType, propTargetId]);
  const [reasonBn, setReasonBn] = useState<string>('');
  const [evidenceRef, setEvidenceRef] = useState<string>('');
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!targetId.trim()) {
      setErrorMsg(t('লক্ষ্যবস্তুর কোড বা আইডি প্রদান করুন।', 'Please provide a Target Code or ID.'));
      return;
    }
    if (reasonBn.trim().length < 15) {
      setErrorMsg(t('ওভাররাইডের জন্য বিস্তারিত কারণ উল্লেখ আবশ্যক (কমপক্ষে ১৫ অক্ষর)।', 'Detailed reason required (minimum 15 characters).'));
      return;
    }
    if (evidenceRef.trim().length < 5) {
      setErrorMsg(t('আইনগত নথি বা সরকারি আদেশ নম্বর (Evidence) উল্লেখ আবশ্যক (কমপক্ষে ৫ অক্ষর)।', 'Official order reference or legal evidence required (minimum 5 characters).'));
      return;
    }
    if (!confirmed) {
      setErrorMsg(t('সংবেদনশীল প্রশাসনিক ওভাররাইডের জন্য সুস্পষ্ট সম্মতি বক্সে টিক দিন।', 'Please check the confirmation box to proceed with sensitive override.'));
      return;
    }

    setLoading(true);
    try {
      const res = await BhumiApi.performAdminOverride({
        target_type: targetType,
        target_id: targetId.trim(),
        reason_bn: reasonBn.trim(),
        evidence_reference: evidenceRef.trim(),
        confirmation: confirmed,
      });
      onSuccess(res);
      onClose();
    } catch (err: any) {
      const resp = err.response?.data;
      setErrorMsg(resp?.message_bn || resp?.message_en || err.message || t('ওভাররাইড কার্যকর করতে ব্যর্থ হয়েছে।', 'Failed to execute administrative override.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-[#0A1F1C] px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                <span>{t('প্রশাসনিক ওভাররাইড কনসোল', 'Administrative Override Console')}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-900">
                  SUPER ADMIN
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {t('অডিট ট্রেইলে স্থায়ীভাবে নথিভুক্ত নিয়ন্ত্রিত প্রশাসনিক হস্তক্ষেপ', 'Audit-chained controlled administrative intervention')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-slate-800 text-xs">
          {/* Statutory Guardrail Alert */}
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-extrabold text-[12px]">
                {t('আইনি ও সাংবিধানিক সীমাবদ্ধতা (Rule M3/T3)', 'Statutory Governance Boundary (Rule M3/T3)')}
              </h3>
              <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                {t(
                  'প্রশাসনিক ওভাররাইড দ্বারা সহকারী কমিশনার (ভূমি)-এর সাংবিধানিক নামজারি ডিক্রি বা সাব-রেজিস্ট্রারের বায়োমেট্রিক দলিল নিবন্ধন প্রতিস্থাপন আইনত নিষিদ্ধ। ওভাররাইড কোনো অনুপস্থিত প্রমাণপত্র তৈরি করতে পারে না। প্রতিটি পদক্ষেপের পূর্বাপর অবস্থা এবং আপনার প্রকৃত পরিচয় অপরিবর্তনীয় অডিট লেজারে রেকর্ড হবে।',
                  'Administrative overrides cannot supersede AC Land statutory mutation decrees or Sub-Registrar biometric registration. It cannot fabricate absent evidence. Before/after states and your true identity will be logged in the immutable audit ledger.'
                )}
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-100 border border-rose-300 text-rose-900 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* Target Type & Target ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t('ওভাররাইডের ক্ষেত্র (Target Type)', 'Override Target Type')} *
              </label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-hidden"
              >
                <option value="TRANSFER_STAGE_ADVANCE">সেবা আবেদন ধাপ অগ্রগতি (Transfer Advance)</option>
                <option value="TICKET_ESCALATE">জরুরি সাপোর্ট টিকিট এসকেলেশন (Ticket Escalate)</option>
                <option value="PLOT_UNFREEZE_ADMIN">প্রশাসনিক স্থগিতাদেশ অবমুক্ত (Plot Unfreeze)</option>
                <option value="GENERAL_ADMIN_NOTE">সার্বভৌম প্রশাসনিক নোট (General Override)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t('কেস কোড বা আইডি (Target ID)', 'Case Code / Target ID')} *
              </label>
              <input
                type="text"
                placeholder={t('যেমন: TR-2026-000101 বা টিকিট নং', 'e.g. TR-2026-000101 or Ticket ID')}
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-hidden"
                required
              />
            </div>
          </div>

          {/* Reason BN (Mandatory min 15 chars) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {t('প্রশাসনিক ওভাররাইডের সুনির্দিষ্ট কারণ (Reason BN)', 'Administrative Reason (BN)')} *
            </label>
            <textarea
              rows={3}
              placeholder={t('ওভাররাইড কেন প্রয়োজন তা আইনগত ও পরিচালনাগত প্রেক্ষাপটসহ বিস্তারিত লিখুন (কমপক্ষে ১৫ অক্ষর)...', 'Explain why this override is necessary with operational and legal context (min 15 chars)...')}
              value={reasonBn}
              onChange={(e) => setReasonBn(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-hidden"
              required
            />
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-0.5">
              <span>{t('ন্যূনতম ১৫ অক্ষর আবশ্যক', 'Min 15 chars required')}</span>
              <span>{reasonBn.length}/15+</span>
            </div>
          </div>

          {/* Evidence Reference (Mandatory min 5 chars) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {t('সংশ্লিষ্ট নথি / সরকারি স্মারক নম্বর (Evidence Reference)', 'Official Order / Evidence Reference')} *
            </label>
            <input
              type="text"
              placeholder={t('যেমন: স্মারক নং-ভুমিসেবা/প্রশাসন/২০২৬-০৮৯ বা আদালতের আদেশ নং', 'e.g. Order Memo No. / Court Decree Ref')}
              value={evidenceRef}
              onChange={(e) => setEvidenceRef(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-hidden"
              required
            />
          </div>

          {/* Audit Identity Notice */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] flex items-center justify-between">
            <span className="font-semibold">
              {t('অ্যাক্টর পরিচয় (Actor Identity):', 'Actor Identity:')}{' '}
              <span className="font-bold text-slate-900">@{user?.username || 'admin'}</span> ({user?.role || 'system_admin'})
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#006A4E] text-[10px] font-extrabold">
              Ed25519 CHAINED
            </span>
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded-sm border-slate-300 text-[#006A4E] focus:ring-[#006A4E]"
            />
            <span className="text-[11px] text-slate-800 font-medium leading-relaxed">
              {t(
                'আমি নিশ্চিত করছি যে এই প্রশাসনিক পদক্ষেপটি যথাযথ তদন্ত ও অনুমোদিত সরকারি আদেশের ভিত্তিতে নেওয়া হচ্ছে এবং এর সম্পূর্ণ দায়ভার ও ফলাফল ক্রিপ্টোগ্রাফিক অডিট লগে আমার পরিচয়ে স্থায়ীভাবে নথিভুক্ত থাকবে।',
                'I confirm this administrative action is taken based on approved official orders, and full accountability is permanently recorded under my identity in the cryptographic audit ledger.'
              )}
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold transition cursor-pointer"
            >
              {t('বাতিল', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !confirmed}
              className={`px-5 py-2 rounded-lg font-bold text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                confirmed && !loading
                  ? 'bg-rose-700 hover:bg-rose-800'
                  : 'bg-slate-400 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <span>{t('কার্যকর হচ্ছে...', 'Executing...')}</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t('ওভাররাইড কার্যকর করুন', 'Execute Override')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
