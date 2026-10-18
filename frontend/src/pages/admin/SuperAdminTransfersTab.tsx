import React, { useState } from 'react';
import {
  Layers,
  Search,
  Filter,
  Eye,
  UserCheck,
  Building2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  X,
  Edit2,
  HelpCircle,
} from 'lucide-react';
import { BhumiApi } from '../../api/client';
import { toBanglaDigits } from '../../theme/tokens';
import { useAppUI } from '../../i18n';

interface SuperAdminTransfersTabProps {
  transfers: any[];
  usersList?: any[];
  officesList?: any[];
  onRefresh: () => void;
  onOpenOverride?: (type: string, id: string | number, extra?: any) => void;
}

export const SuperAdminTransfersTab: React.FC<SuperAdminTransfersTabProps> = ({
  transfers,
  usersList = [],
  officesList = [],
  onRefresh,
  onOpenOverride,
}) => {
  const { t, lang } = useAppUI();
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);

  // Reassign Modal State
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignTarget, setReassignTarget] = useState<any | null>(null);
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [targetOfficeId, setTargetOfficeId] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('');
  const [reassignLoading, setReassignLoading] = useState(false);

  // Correction Request Modal State
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<any | null>(null);
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [correctionLoading, setCorrectionLoading] = useState(false);

  // Notification Toast
  const [toastMsg, setToastMsg] = useState<{ msg: string; err?: boolean } | null>(null);

  const filteredTransfers = transfers.filter((tItem) => {
    if (stageFilter !== 'ALL' && tItem.public_stage !== stageFilter && tItem.status !== stageFilter) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(tItem.transfer_code || '').toLowerCase().includes(q) ||
      String(tItem.created_by_nid || '').includes(q) ||
      String(tItem.assigned_to_name || '').toLowerCase().includes(q) ||
      String(tItem.assigned_office_bn || '').toLowerCase().includes(q) ||
      String(tItem.plot_id || '').includes(q)
    );
  });

  const handleOpenReassign = (tItem: any) => {
    setReassignTarget(tItem);
    setTargetUserId(tItem.assigned_to_user_id ? String(tItem.assigned_to_user_id) : '');
    setTargetOfficeId(tItem.assigned_office_id ? String(tItem.assigned_office_id) : '');
    setReassignReason('');
    setReassignModalOpen(true);
  };

  const handleOpenCorrection = (tItem: any) => {
    setCorrectionTarget(tItem);
    setCorrectionReason(tItem.correction_notes_bn || '');
    setCorrectionModalOpen(true);
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignTarget) return;

    const selectedOfficer = usersList.find((u) => String(u.id) === targetUserId);
    const selectedOffice = officesList.find((o) => String(o.id) === targetOfficeId);

    setReassignLoading(true);
    try {
      const res = await BhumiApi.reassignTransfer(reassignTarget.id, {
        assigned_to_user_id: targetUserId ? Number(targetUserId) : undefined,
        assigned_to_name: selectedOfficer ? (selectedOfficer.full_name_bn || selectedOfficer.username) : undefined,
        assigned_office_id: targetOfficeId ? Number(targetOfficeId) : undefined,
        assigned_office_bn: selectedOffice ? selectedOffice.name_bn : undefined,
        reason_bn: reassignReason.trim() || 'প্রশাসনিক প্রয়োজনে কর্মকর্তা পুনর্বণ্টন',
      });
      setToastMsg({ msg: res.message_bn || t('সফলভাবে দায়িত্ব পুনর্বণ্টন সম্পন্ন হয়েছে।', 'Successfully reassigned officer.') });
      setReassignModalOpen(false);
      onRefresh();
    } catch (err: any) {
      const resp = err.response?.data;
      setToastMsg({ msg: resp?.message_bn || err.message, err: true });
    } finally {
      setReassignLoading(false);
    }
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTarget) return;
    if (correctionReason.trim().length < 10) {
      setToastMsg({ msg: t('সংশোধন অনুরোধের সুনির্দিষ্ট কারণ কমপক্ষে ১০ অক্ষরে উল্লেখ করুন।', 'Correction notes require minimum 10 characters.'), err: true });
      return;
    }

    setCorrectionLoading(true);
    try {
      const res = await BhumiApi.requestTransferCorrection(correctionTarget.id, {
        reason_bn: correctionReason.trim(),
      });
      setToastMsg({ msg: res.message_bn || t('সংশোধন অনুরোধ পাঠানো হয়েছে।', 'Correction request submitted.') });
      setCorrectionModalOpen(false);
      onRefresh();
    } catch (err: any) {
      const resp = err.response?.data;
      setToastMsg({ msg: resp?.message_bn || err.message, err: true });
    } finally {
      setCorrectionLoading(false);
    }
  };

  const stagesList = [
    { key: 'ALL', label_bn: 'সকল আবেদন', label_en: 'All Applications' },
    { key: 'START', label_bn: '১. প্রস্তাবনা শুরু', label_en: '1. Proposal' },
    { key: 'CONSENT', label_bn: '২. ওয়ারিশ সম্মতি', label_en: '2. Heir Consent' },
    { key: 'STAGE_PAYMENT', label_bn: '৩. প্রাক-ফি পরিশোধ', label_en: '3. Pre-Fee' },
    { key: 'SUBMITTED', label_bn: '৪. দাখিলকৃত কেস', label_en: '4. Submitted' },
    { key: 'REGISTERED', label_bn: '৫. রেজিস্ট্রিকৃত দলিল', label_en: '5. Registered' },
    { key: 'APPROVED', label_bn: '৬. নামজারি অনুমোদিত', label_en: '6. Mutated' },
    { key: 'COMPLETED', label_bn: '৭. সম্পন্নকৃত হস্তান্তর', label_en: '7. Completed' },
  ];

  const getStageBadge = (stage: string, step: number) => {
    if (stage === 'COMPLETED' || step === 13) {
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-[#006A4E]">ধাপ ১৩/১৩ (সম্পন্ন)</span>;
    }
    if (stage === 'APPROVED' || step >= 11) {
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800">ধাপ {toBanglaDigits(step, lang)}/১৩ (নামজারি সম্পন্ন)</span>;
    }
    if (stage === 'REGISTERED' || step >= 8) {
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">ধাপ {toBanglaDigits(step, lang)}/১৩ (দলিল রেজিস্ট্রিকৃত)</span>;
    }
    if (stage === 'SUBMITTED' || step >= 4) {
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">ধাপ {toBanglaDigits(step, lang)}/১৩ (যাচাইাধীন)</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">ধাপ {toBanglaDigits(step, lang)}/১৩ ({stage})</span>;
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

      {/* Intro Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-[#006A4E] flex items-center justify-center shadow-2xs">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{t('নাগরিক সেবা আবেদন ও ১৩-ধাপ হস্তান্তর ট্র্যাকিং', 'Citizen Service Applications & 13-Step Transfer Tracking')}</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-[#006A4E]">
                {toBanglaDigits(filteredTransfers.length, lang)} {t('টি কেস', 'Cases')}
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                '১৩-ধাপের একক ডিজিটাল সেবা উইজার্ডের প্রতিটি আবেদনের গতিবিধি, মেকার-চেকার স্টেজ, দায়িত্বপ্রাপ্ত কর্মকর্তা ও কার্যালয় তদারকি।',
                'End-to-end monitoring of 13-step transfer wizard, stage progress, assigned officers and office jurisdiction.'
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

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={t('কেস কোড, এনআইডি, দাগ বা কর্মকর্তা দিয়ে খুঁজুন...', 'Search by transfer code, NID, dag, or officer...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-hidden"
          />
        </div>

        {/* Stage Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
          {stagesList.map((st) => (
            <button
              key={st.key}
              type="button"
              onClick={() => setStageFilter(st.key)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                stageFilter === st.key
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
                <th className="px-4 py-3">{t('আবেদন কোড', 'Transfer Code')}</th>
                <th className="px-4 py-3">{t('দাগ ও বিবরণ', 'Plot & Details')}</th>
                <th className="px-4 py-3">{t('জমির পরিমাণ ও মূল্য', 'Area & Price')}</th>
                <th className="px-4 py-3">{t('১৩-ধাপ অগ্রগতি', '13-Step Progress')}</th>
                <th className="px-4 py-3">{t('দায়িত্বপ্রাপ্ত কর্মকর্তা ও কার্যালয়', 'Assigned Officer & Office')}</th>
                <th className="px-4 py-3 text-right">{t('অ্যাকশন', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransfers.length > 0 ? (
                filteredTransfers.map((tItem) => (
                  <tr key={tItem.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#006A4E]">{tItem.transfer_code}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                        {t('দাখিলকারী এনআইডি: ', 'Applicant NID: ')}{toBanglaDigits(tItem.created_by_nid || 'N/A', lang)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">
                        {t('দাগ নং #', 'Plot Dag #')}{toBanglaDigits(tItem.plot_id, lang)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {t('দলিল ধরন: ', 'Deed Type: ')}{tItem.deed_type || 'SALE'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">
                        {toBanglaDigits(tItem.transfer_area_decimal || 0, lang)} {t('শতাংশ', 'Decimal')}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        ৳ {toBanglaDigits((tItem.proposed_price_bdt || 0).toLocaleString(), lang)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStageBadge(tItem.public_stage, tItem.current_step)}
                      {tItem.correction_notes_bn && (
                        <div className="mt-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {t('সংশোধন চাওয়া হয়েছে: ', 'Correction: ')}{tItem.correction_notes_bn}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {tItem.assigned_to_name ? (
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-[#006A4E]" />
                            <span>{tItem.assigned_to_name}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>{tItem.assigned_office_bn || 'উপজেলা ভূমি কার্যালয়'}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                          {t('অ্যাসাইন করা হয়নি', 'Unassigned')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedTransfer(tItem)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 flex items-center gap-1 cursor-pointer transition shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>{t('বিস্তারিত', 'View')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenReassign(tItem)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#006A4E] flex items-center gap-1 cursor-pointer transition shadow-2xs"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-[#006A4E]" />
                          <span>{t('পুনর্বণ্টন', 'Reassign')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenCorrection(tItem)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 flex items-center gap-1 cursor-pointer transition shadow-2xs"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                          <span>{t('সংশোধন', 'Correction')}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold">{t('কোনো সেবা আবেদন পাওয়া যায়নি।', 'No transfer applications found.')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Details Drawer / Modal */}
      {selectedTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">{selectedTransfer.transfer_code}</h3>
                  <p className="text-xs text-slate-400">{t('১৩-ধাপের সম্পূর্ণ রূপরেখা ও স্থিতি', '13-Step Comprehensive Case Profile')}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTransfer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">{t('বর্তমান ধাপ', 'Current Step')}</div>
                  <div className="font-extrabold text-sm text-slate-900 mt-0.5">ধাপ {toBanglaDigits(selectedTransfer.current_step, lang)}/১৩</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">{t('পাবলিক স্টেজ', 'Public Stage')}</div>
                  <div className="font-extrabold text-sm text-[#006A4E] mt-0.5">{selectedTransfer.public_stage}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">{t('জমির পরিমাণ', 'Land Area')}</div>
                  <div className="font-extrabold text-sm text-slate-900 mt-0.5">{toBanglaDigits(selectedTransfer.transfer_area_decimal, lang)} শতাংশ</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">{t('ঘোষিত মূল্য', 'Price')}</div>
                  <div className="font-extrabold text-sm text-slate-900 mt-0.5">৳ {toBanglaDigits((selectedTransfer.proposed_price_bdt || 0).toLocaleString(), lang)}</div>
                </div>
              </div>

              {/* 13 Steps Visual Progress */}
              <div>
                <h4 className="font-extrabold text-slate-900 mb-2">{t('১৩-ধাপ ওয়ার্কফ্লো অগ্রগতি:', '13-Step Workflow Progress:')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    '১. ক্রেতা-বিক্রেতা প্রাথমিক প্রস্তাবনা ও স্বত্ব পরীক্ষা',
                    '২. ওয়ারিশ ও সহ-মালিক সম্মতি যাচাই',
                    '৩. সরকারি ফি ও প্রাক-নিবন্ধন চালান পরিশোধ',
                    '৪. খসড়া দলিল প্রস্তুতকরণ ও ডাটা এন্ট্রি',
                    '৫. সাব-রেজিস্ট্রি অফিসে কাউন্টার উপস্থিতি নির্ধারণ',
                    '৬. বিক্রেতার বায়োমেট্রিক ও আঙুলের ছাপ যাচাই',
                    '৭. ক্রেতার বায়োমেট্রিক ও ছবি ক্যাপচার',
                    '৮. সাব-রেজিস্ট্রার কর্তৃক ক্রিপ্টোগ্রাফিক ডিজিটাল স্বাক্ষর',
                    '৯. দলিলের হ্যাশ চেইনিং ও কিউআর সিল সমন্বয়',
                    '১০. সহকারী কমিশনার (ভূমি) বরাবরে স্বয়ংক্রিয় ই-নামজারি প্রেরণ',
                    '১১. রেকর্ডরুম খতিয়ান পরীক্ষা ও শুনানি বিজ্ঞপ্তি',
                    '১২. সহকারী কমিশনার (ভূমি) কর্তৃক নামজারি ডিক্রি অনুমোদন',
                    '১৩. চূড়ান্ত রেকর্ড সমন্বয় ও নাগরিকের ভল্টে নতুন খতিয়ান জমা',
                  ].map((stepLabel, idx) => {
                    const stepNum = idx + 1;
                    const isDone = selectedTransfer.current_step > stepNum;
                    const isCurrent = selectedTransfer.current_step === stepNum;
                    return (
                      <div
                        key={stepNum}
                        className={`p-2.5 rounded-lg border flex items-center gap-2 text-[11px] ${
                          isDone
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 font-semibold'
                            : isCurrent
                            ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold shadow-2xs'
                            : 'bg-slate-50/50 border-slate-200 text-slate-400'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-[#006A4E] shrink-0" />
                        ) : isCurrent ? (
                          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                        )}
                        <span>{stepLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Assignment Box */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-extrabold text-slate-900">{t('বর্তমান দায়িত্বপ্রাপ্ত কর্মকর্তা ও অফিস:', 'Current Assigned Officer & Office:')}</div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span>{selectedTransfer.assigned_to_name ? `@${selectedTransfer.assigned_to_name}` : t('অ্যাসাইন করা হয়নি', 'Unassigned')}</span>
                  <span className="text-slate-500">{selectedTransfer.assigned_office_bn || t('অফিস নির্দিষ্ট নয়', 'Office unmapped')}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedTransfer(null)}
                className="px-4 py-2 rounded-lg font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                {t('বন্ধ করুন', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {reassignModalOpen && reassignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">{t('কর্মকর্তা ও অফিস পুনর্বণ্টন', 'Reassign Officer & Office')}</h3>
                  <p className="text-xs text-slate-400">{reassignTarget.transfer_code}</p>
                </div>
              </div>
              <button
                onClick={() => setReassignModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReassignSubmit} className="p-6 space-y-4 text-xs text-slate-700">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t('কর্মকর্তা নির্বাচন করুন (Assignee Officer)', 'Select Officer')} *
                </label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-hidden"
                  required
                >
                  <option value="">-- {t('কর্মকর্তা নির্বাচন করুন', 'Select Officer')} --</option>
                  {usersList
                    .filter((u) => ['ac_land', 'sub_registrar', 'land_office_assistant', 'field_verification_officer', 'service_point_operator'].includes(u.role))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name_bn || u.username} ({u.role}) - {u.office_bn || 'উপজেলা ভূমি কার্যালয়'}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t('কার্যকারিতা অফিস (Office)', 'Office')}
                </label>
                <select
                  value={targetOfficeId}
                  onChange={(e) => setTargetOfficeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-hidden"
                >
                  <option value="">-- {t('অফিস নির্বাচন করুন', 'Select Office')} --</option>
                  {officesList.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name_bn} ({o.office_type}) - {o.district_bn || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t('পুনর্বণ্টনের কারণ (Reason for Reassignment)', 'Reason for Reassignment')} *
                </label>
                <textarea
                  rows={2}
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder={t('কাজের চাপ সুষম বণ্টন বা বিশেষ প্রশাসনিক আদেশের কারণ উল্লেখ করুন...', 'Enter reason for reassignment...')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-hidden"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(false)}
                  disabled={reassignLoading}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold transition cursor-pointer"
                >
                  {t('বাতিল', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={reassignLoading}
                  className="px-5 py-2 rounded-lg font-bold text-white bg-[#006A4E] hover:bg-[#005a42] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {reassignLoading ? (
                    <span>{t('সংরক্ষণ হচ্ছে...', 'Saving...')}</span>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>{t('পুনর্বণ্টন সম্পন্ন করুন', 'Confirm Reassign')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Correction Request Modal */}
      {correctionModalOpen && correctionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">{t('সংশোধন অনুরোধ প্রেরণ', 'Request Transfer Correction')}</h3>
                  <p className="text-xs text-slate-400">{correctionTarget.transfer_code}</p>
                </div>
              </div>
              <button
                onClick={() => setCorrectionModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCorrectionSubmit} className="p-6 space-y-4 text-xs text-slate-700">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t('সংশোধন অনুরোধের সুনির্দিষ্ট কারণ ও বিবরণ (Correction Notes)', 'Correction Details & Required Actions')} *
                </label>
                <textarea
                  rows={4}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder={t('যেমন: খতিয়ানের দ্বিতীয় পাতার স্পষ্ট স্ক্যান কপি দাখিল করুন অথবা ওয়ারিশ সনদের মূল কপি সংযুক্তি আবশ্যক (কমপক্ষে ১০ অক্ষর)...', 'Explain clearly what documents or corrections are needed (min 10 chars)...')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-hidden"
                  required
                />
                <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                  <span>{t('ন্যূনতম ১০ অক্ষর আবশ্যক', 'Min 10 characters required')}</span>
                  <span>{correctionReason.length}/10+</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCorrectionModalOpen(false)}
                  disabled={correctionLoading}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold transition cursor-pointer"
                >
                  {t('বাতিল', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={correctionLoading}
                  className="px-5 py-2 rounded-lg font-bold text-white bg-amber-600 hover:bg-amber-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {correctionLoading ? (
                    <span>{t('প্রেরণ হচ্ছে...', 'Sending...')}</span>
                  ) : (
                    <>
                      <Edit2 className="w-4 h-4" />
                      <span>{t('সংশোধন অনুরোধ পাঠান', 'Send Request')}</span>
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
