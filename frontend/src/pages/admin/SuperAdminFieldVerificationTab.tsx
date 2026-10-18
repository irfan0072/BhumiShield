import React, { useState } from 'react';
import {
  Compass,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Camera,
  UserCheck,
  Building2,
  RefreshCw,
  X,
  Eye,
  Send,
} from 'lucide-react';
import { toBanglaDigits } from '../../theme/tokens';
import { useAppUI } from '../../i18n';

interface SuperAdminFieldVerificationTabProps {
  fieldReports: any[];
  slaDispatches: any[];
  onRefresh: () => void;
}

export const SuperAdminFieldVerificationTab: React.FC<SuperAdminFieldVerificationTabProps> = ({
  fieldReports,
  slaDispatches,
  onRefresh,
}) => {
  const { t, lang } = useAppUI();
  const [subSection, setSubSection] = useState<'reports' | 'dispatches'>('reports');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  const filteredReports = fieldReports.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(r.inspector_name || '').toLowerCase().includes(q) ||
      String(r.dag_no_bn || r.dag_no || '').includes(q) ||
      String(r.mouza_bn || '').toLowerCase().includes(q) ||
      String(r.remarks_bn || '').toLowerCase().includes(q)
    );
  });

  const filteredDispatches = slaDispatches.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(d.dispatch_code || '').toLowerCase().includes(q) ||
      String(d.surveyor_name || '').toLowerCase().includes(q) ||
      String(d.upazila_bn || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-[#006A4E] flex items-center justify-center shadow-2xs">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{t('মাঠ তদন্ত ও এসএলএ সার্ভেয়ার ডিসপ্যাচ', 'Field Verification & SLA Surveyor Dispatches')}</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-[#006A4E]">
                {toBanglaDigits(fieldReports.length, lang)} {t('টি রিপোর্ট', 'Reports')}
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                'জমির সরজমিন ভৌগোলিক অবস্থান, সীমানা পিলারিং, জিওট্যাগড ছবি ও সার্ভেয়ার তদন্ত প্রতিবেদন তদারকি।',
                'Supervision of physical land possession, boundary demarcation, geotagged photos, and SLA deadlines.'
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

      {/* Segment Switcher & Search Bar */}
      <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setSubSection('reports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              subSection === 'reports' ? 'bg-[#006A4E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{t('তদন্ত প্রতিবেদন (Reports)', 'Field Reports')}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{fieldReports.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setSubSection('dispatches')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              subSection === 'dispatches' ? 'bg-[#006A4E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t('এসএলএ ডিসপ্যাচ (SLA Dispatches)', 'SLA Dispatches')}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{slaDispatches.length}</span>
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={t('সার্ভেয়ার, দাগ, মৌজা বা মন্তব্য দিয়ে খুঁজুন...', 'Search by surveyor, dag, mouza, or remarks...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#006A4E] focus:outline-hidden"
          />
        </div>
      </div>

      {/* Sub-section: Reports */}
      {subSection === 'reports' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">{t('দাগ ও মৌজা', 'Plot & Mouza')}</th>
                  <th className="px-4 py-3">{t('তদন্ত কর্মকর্তা (Inspector)', 'Inspector')}</th>
                  <th className="px-4 py-3">{t('দখল ও সীমানা', 'Possession & Boundary')}</th>
                  <th className="px-4 py-3">{t('জিওট্যাগ স্থানাঙ্ক', 'Geotag Coordinates')}</th>
                  <th className="px-4 py-3">{t('ছবি ও প্রমাণক', 'Photos')}</th>
                  <th className="px-4 py-3 text-right">{t('অ্যাকশন', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.length > 0 ? (
                  filteredReports.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        <div>{t('দাগ নং: ', 'Dag #')}{toBanglaDigits(r.dag_no_bn || r.dag_no || r.plot_id, lang)}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{r.mouza_bn || 'বিরুলিয়া'}, {r.upazila_bn || 'সাভার'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-[#006A4E]" />
                          <span>{r.inspector_name || 'ইউএলএও / সার্ভেয়ার'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{r.created_at || 'আজ'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold w-fit ${r.physical_possession_verified ? 'bg-emerald-100 text-[#006A4E]' : 'bg-rose-100 text-rose-800'}`}>
                            {r.physical_possession_verified ? t('✓ বাস্তব দখল যাচাইকৃত', '✓ Possession Verified') : t('✕ দখল বিতর্কিত', '✕ Possession Disputed')}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold w-fit ${r.boundary_matches_map ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                            {r.boundary_matches_map ? t('✓ সীমানা নকশার অনুরূপ', '✓ Boundary Matches Map') : t('⚠ সীমানা অমিল', '⚠ Boundary Mismatch')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-500" />
                          <span>{r.latitude ? `${r.latitude.toFixed(4)}, ${r.longitude?.toFixed(4)}` : '23.8512° N, 90.2811° E'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 flex items-center gap-1 w-fit">
                          <Camera className="w-3 h-3" />
                          <span>{toBanglaDigits(r.photos_count || 3, lang)} {t('টি ছবি সংযুক্ত', 'Photos')}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedReport(r)}
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
                      <Compass className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold">{t('কোনো মাঠ তদন্ত প্রতিবেদন পাওয়া যায়নি।', 'No field reports found.')}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-section: Dispatches */}
      {subSection === 'dispatches' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">{t('ডিসপ্যাচ কোড', 'Dispatch Code')}</th>
                  <th className="px-4 py-3">{t('এলাকা ও অধিক্ষেত্র', 'Jurisdiction')}</th>
                  <th className="px-4 py-3">{t('দায়িত্বপ্রাপ্ত সার্ভেয়ার', 'Surveyor')}</th>
                  <th className="px-4 py-3">{t('এসএলএ সময়সীমা', 'SLA Deadline')}</th>
                  <th className="px-4 py-3">{t('অবস্থা', 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDispatches.length > 0 ? (
                  filteredDispatches.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-mono font-bold text-[#006A4E]">
                        {d.dispatch_code || `DSP-${d.id}`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{d.upazila_bn || 'সাভার'}</div>
                        <div className="text-[10px] text-slate-500">{d.district_bn || 'ঢাকা'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{d.surveyor_name || 'মোঃ জহিরুল ইসলাম (সার্ভেয়ার)'}</div>
                        <div className="text-[10px] text-slate-500">ফোন: ০১৭০০-০০৪০১১</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                          {d.sla_deadline || '৪৮ ঘণ্টার মধ্যে'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          d.status === 'COMPLETED' ? 'bg-emerald-100 text-[#006A4E]' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {d.status || 'ASSIGNED'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold">{t('কোনো এসএলএ ডিসপ্যাচ পাওয়া যায়নি।', 'No SLA dispatches found.')}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">{t('মাঠ তদন্ত বিস্তারিত বিবরণ', 'Field Inspection Report')}</h3>
                  <p className="text-xs text-slate-400">দাগ #{toBanglaDigits(selectedReport.dag_no_bn || selectedReport.dag_no || selectedReport.plot_id, lang)}</p>
                </div>
              </div>
              <button onClick={() => setSelectedReport(null)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-extrabold text-slate-900">{t('তদন্ত কর্মকর্তার মন্তব্য (Inspector Remarks):', 'Inspector Remarks:')}</div>
                <p className="text-slate-600 leading-relaxed">
                  {selectedReport.remarks_bn || t('জমির বাস্তব দখল বিক্রেতার অনুকূলে বিদ্যমান রহিয়াছে। সীমানা পিলারিংয়ে কোনো গরমিল পরিলক্ষিত হয়নি।', 'Physical possession verified in favour of seller. Boundary demarcations match government cadastral map.')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500">{t('তদন্তকারী: ', 'Inspector: ')}</span>
                  <span className="font-bold text-slate-900">{selectedReport.inspector_name || 'ইউএলএও'}</span>
                </div>
                <div>
                  <span className="text-slate-500">{t('তদন্তের সময়: ', 'Date: ')}</span>
                  <span className="font-bold text-slate-900">{selectedReport.created_at || 'আজ'}</span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
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
