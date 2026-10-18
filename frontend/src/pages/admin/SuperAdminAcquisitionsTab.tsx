import React, { useState } from 'react';
import {
  Building2,
  Search,
  Filter,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  MapPin,
  RefreshCw,
  X,
  Send,
  ExternalLink,
} from 'lucide-react';
import { toBanglaDigits } from '../../theme/tokens';
import { useAppUI } from '../../i18n';
import { BhumiApi } from '../../api/client';

interface SuperAdminAcquisitionsTabProps {
  acquisitionCases: any[];
  onRefresh: () => void;
  onOpenOverride?: (type: string, id: string | number, extra?: any) => void;
}

export const SuperAdminAcquisitionsTab: React.FC<SuperAdminAcquisitionsTabProps> = ({
  acquisitionCases,
  onRefresh,
  onOpenOverride,
}) => {
  const { t, lang } = useAppUI();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedCase, setSelectedCase] = useState<any | null>(null);

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [caseNo, setCaseNo] = useState('');
  const [projectNameBn, setProjectNameBn] = useState('');
  const [projectNameEn, setProjectNameEn] = useState('');
  const [agencyBn, setAgencyBn] = useState('');
  const [sectionType, setSectionType] = useState('SECTION_4');
  const [districtBn, setDistrictBn] = useState('ঢাকা');
  const [upazilaBn, setUpazilaBn] = useState('সাভার');
  const [mouzaBn, setMouzaBn] = useState('বিরুলিয়া');
  const [totalLand, setTotalLand] = useState('25.5');
  const [compensationBdt, setCompensationBdt] = useState('35000000');
  const [status, setStatus] = useState('PRELIMINARY_NOTICE');
  const [createLoading, setCreateLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ msg: string; err?: boolean } | null>(null);

  const filteredCases = acquisitionCases.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(c.case_no || '').toLowerCase().includes(q) ||
      String(c.project_name_bn || '').toLowerCase().includes(q) ||
      String(c.project_name_en || '').toLowerCase().includes(q) ||
      String(c.acquiring_agency_bn || '').toLowerCase().includes(q) ||
      String(c.mouza_bn || '').toLowerCase().includes(q)
    );
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectNameBn.trim()) {
      setToastMsg({ msg: t('প্রকল্পের নাম (বাংলায়) আবশ্যক।', 'Project name (BN) is required.'), err: true });
      return;
    }

    setCreateLoading(true);
    try {
      const res = await BhumiApi.createAcquisitionCase({
        case_no: caseNo.trim() || undefined,
        project_name_bn: projectNameBn.trim(),
        project_name_en: projectNameEn.trim() || projectNameBn.trim(),
        acquiring_agency_bn: agencyBn.trim() || 'জেলা প্রশাসন ভূমি অধিগ্রহণ শাখা',
        section_type: sectionType,
        district_bn: districtBn,
        upazila_bn: upazilaBn,
        mouza_bn: mouzaBn,
        total_land_decimal: Number(totalLand) || 10,
        estimated_compensation_bdt: Number(compensationBdt) || 10000000,
        status: status,
      });
      setToastMsg({ msg: res.message_bn || t('ভূমি অধিগ্রহণ কেস সফলভাবে নথিভুক্ত হয়েছে।', 'Acquisition case registered.') });
      setCreateModalOpen(false);
      // Reset form
      setProjectNameBn('');
      setProjectNameEn('');
      setCaseNo('');
      onRefresh();
    } catch (err: any) {
      const resp = err.response?.data;
      setToastMsg({ msg: resp?.message_bn || err.message, err: true });
    } finally {
      setCreateLoading(false);
    }
  };

  const getSectionBadge = (type: string) => {
    if (type === 'SECTION_4') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">ধারা ৪ (প্রাথমিক নোটিশ)</span>;
    }
    if (type === 'SECTION_7') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900">ধারা ৭ (যৌথ তদন্ত)</span>;
    }
    if (type === 'SECTION_8') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#006A4E]">ধারা ৮ (রোয়েদাদ ও গেজেট)</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">{type}</span>;
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
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{t('জেলা প্রশাসক কার্যালয় — ভূমি অধিগ্রহণ (LA) কেস তদারকি', 'DC Office — Land Acquisition (LA) Division')}</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-[#006A4E]">
                {toBanglaDigits(filteredCases.length, lang)} {t('টি কেস', 'Cases')}
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                'সরকারি উন্নয়ন প্রকল্প ও জাতীয় অবকাঠামোতে ভূমি অধিগ্রহণ, ধারা ৪/৭/৮ গেজেট ট্র্যাকিং ও ক্ষতিপূরণ বাজেট তদারকি।',
                'Public infrastructure acquisition projects, Section 4/7/8 gazette decrees, and compensation budgets.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#006A4E] hover:bg-[#005a42] flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t('নতুন এলএ কেস', 'New LA Case')}</span>
          </button>
          <button
            onClick={onRefresh}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#006A4E]" />
            <span>{t('রিফ্রেশ', 'Refresh')}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={t('কেস নং, প্রকল্প, সংস্থা বা মৌজা দিয়ে খুঁজুন...', 'Search by case no, project, agency, or mouza...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {[
            { key: 'ALL', label_bn: 'সকল কেস', label_en: 'All' },
            { key: 'PRELIMINARY_NOTICE', label_bn: 'প্রাথমিক নোটিশ', label_en: 'Preliminary' },
            { key: 'JOINT_VERIFICATION', label_bn: 'যৌথ তদন্তাধীন', label_en: 'Joint Verification' },
            { key: 'OBJECTIONS_HEARING', label_bn: 'আপত্তি শুনানি', label_en: 'Hearings' },
            { key: 'AWARD_DECREED', label_bn: 'রোয়েদাদ ডিক্রি', label_en: 'Award Decreed' },
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
                <th className="px-4 py-3">{t('এলএ কেস নং ও গেজেট', 'LA Case No & Gazette')}</th>
                <th className="px-4 py-3">{t('প্রকল্পের নাম ও সংস্থা', 'Project & Agency')}</th>
                <th className="px-4 py-3">{t('এলাকা ও অধিক্ষেত্র', 'Location')}</th>
                <th className="px-4 py-3">{t('জমির পরিমাণ ও বাজেট', 'Land & Budget')}</th>
                <th className="px-4 py-3">{t('আইনি ধারা ও অবস্থা', 'Section & Status')}</th>
                <th className="px-4 py-3 text-right">{t('অ্যাকশন', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCases.length > 0 ? (
                filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      <span className="text-[#006A4E]">{c.case_no}</span>
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                        গেজেট: {c.gazette_no || 'বিজি-২০২৬/' + c.id} ({c.gazette_published_at || '২০২৬'})
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-extrabold text-slate-900 line-clamp-1">{c.project_name_bn}</div>
                      <div className="text-[10px] text-slate-500">{c.acquiring_agency_bn}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{c.mouza_bn}, {c.upazila_bn}</div>
                      <div className="text-[10px] text-slate-500">{c.district_bn} জেলা</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">
                        {toBanglaDigits(c.total_land_decimal, lang)} {t('শতাংশ', 'Decimal')}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        ৳ {toBanglaDigits((c.estimated_compensation_bdt || 0).toLocaleString(), lang)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div>{getSectionBadge(c.section_type)}</div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 inline-block">
                          {c.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedCase(c)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 inline-flex items-center gap-1 cursor-pointer transition shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>{t('বিস্তারিত', 'View')}</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold">{t('কোনো ভূমি অধিগ্রহণ কেস পাওয়া যায়নি।', 'No acquisition cases found.')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Details Drawer */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">{selectedCase.case_no}</h3>
                  <p className="text-xs text-slate-400">{selectedCase.project_name_bn}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCase(null)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs text-slate-700 overflow-y-auto">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">{t('প্রকল্প ও সংস্থা', 'Project & Agency')}</div>
                <div className="text-sm font-extrabold text-slate-900">{selectedCase.project_name_bn}</div>
                <div className="text-slate-500">{selectedCase.project_name_en}</div>
                <div className="text-[11px] font-bold text-[#006A4E] mt-1">{selectedCase.acquiring_agency_bn}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500">{t('আইনি ধারা: ', 'Section: ')}</span>
                  <span className="font-bold text-slate-900">{selectedCase.section_type}</span>
                </div>
                <div>
                  <span className="text-slate-500">{t('মোট জমি: ', 'Total Land: ')}</span>
                  <span className="font-bold text-slate-900">{toBanglaDigits(selectedCase.total_land_decimal, lang)} শতাংশ</span>
                </div>
                <div>
                  <span className="text-slate-500">{t('ক্ষতিপূরণ প্রাক্কলন: ', 'Compensation Budget: ')}</span>
                  <span className="font-bold text-slate-900">৳ {toBanglaDigits((selectedCase.estimated_compensation_bdt || 0).toLocaleString(), lang)}</span>
                </div>
                <div>
                  <span className="text-slate-500">{t('গেজেট নম্বর: ', 'Gazette Ref: ')}</span>
                  <span className="font-bold text-slate-900">{selectedCase.gazette_no || 'বিজি-২০২৬/০৮৮১'}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">{t('অধিগ্রহণকৃত দাগসমূহ (Affected Plots):', 'Affected Plots:')}</div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(selectedCase.plot_ids || [1, 2]).map((pid: number) => (
                    <span key={pid} className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-[#006A4E] font-bold text-[11px]">
                      দাগ #{toBanglaDigits(pid, lang)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCase(null)}
                className="px-4 py-2 rounded-lg font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                {t('বন্ধ করুন', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">{t('নতুন ভূমি অধিগ্রহণ কেস এন্ট্রি', 'Register New LA Case')}</h3>
                  <p className="text-xs text-slate-400">ডিসি কার্যালয় এলএ শাখা</p>
                </div>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-3.5 text-xs text-slate-700 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">{t('কেস নম্বর (Case No)', 'Case No')}</label>
                <input
                  type="text"
                  placeholder="LA-2026-XXXX (ফাঁকা রাখলে স্বয়ংক্রিয় জেনারেট হবে)"
                  value={caseNo}
                  onChange={(e) => setCaseNo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">{t('প্রকল্পের নাম (বাংলায়)', 'Project Name (BN)')} *</label>
                <input
                  type="text"
                  placeholder="যেমন: ঢাকা-আশুলিয়া এলিভেটেড এক্সপ্রেসওয়ে প্রকল্প"
                  value={projectNameBn}
                  onChange={(e) => setProjectNameBn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">{t('প্রকল্পের নাম (ইংরেজিতে)', 'Project Name (EN)')}</label>
                <input
                  type="text"
                  placeholder="e.g. Dhaka-Ashulia Elevated Expressway"
                  value={projectNameEn}
                  onChange={(e) => setProjectNameEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">{t('প্রত্যাশী সংস্থা', 'Acquiring Agency')}</label>
                  <input
                    type="text"
                    value={agencyBn}
                    onChange={(e) => setAgencyBn(e.target.value)}
                    placeholder="যেমন: বাংলাদেশ সেতু কর্তৃপক্ষ"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">{t('আইনি ধারা', 'Section Type')}</label>
                  <select
                    value={sectionType}
                    onChange={(e) => setSectionType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold focus:ring-2 focus:ring-[#006A4E] focus:outline-hidden"
                  >
                    <option value="SECTION_4">ধারা ৪ (প্রাথমিক নোটিশ)</option>
                    <option value="SECTION_7">ধারা ৭ (যৌথ তদন্ত)</option>
                    <option value="SECTION_8">ধারা ৮ (রোয়েদাদ ও গেজেট)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">জেলা</label>
                  <input type="text" value={districtBn} onChange={(e) => setDistrictBn(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">উপজেলা</label>
                  <input type="text" value={upazilaBn} onChange={(e) => setUpazilaBn(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">মৌজা</label>
                  <input type="text" value={mouzaBn} onChange={(e) => setMouzaBn(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">মোট জমি (শতাংশ)</label>
                  <input type="number" step="0.1" value={totalLand} onChange={(e) => setTotalLand(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">প্রাক্কলিত বাজেট (৳)</label>
                  <input type="number" value={compensationBdt} onChange={(e) => setCompensationBdt(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={createLoading}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold transition cursor-pointer"
                >
                  {t('বাতিল', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2 rounded-lg font-bold text-white bg-[#006A4E] hover:bg-[#005a42] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {createLoading ? <span>{t('দাখিল হচ্ছে...', 'Saving...')}</span> : <span>{t('কেস নথিভুক্ত করুন', 'Register Case')}</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
