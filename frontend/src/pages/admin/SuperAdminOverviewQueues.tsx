import React, { useState } from 'react';
import { useAppUI } from '../../i18n';
import { toBanglaDigits } from '../../theme/tokens';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  FileText,
  Gavel,
  ShieldAlert,
  ArrowRight,
  UserCheck,
  Building2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Flame,
  Scale,
  Landmark,
  Compass,
  MessageSquare,
  Megaphone,
  Layers,
  Filter,
} from 'lucide-react';

interface SuperAdminOverviewQueuesProps {
  stats: any;
  onNavigateTab: (tab: any) => void;
  onRefresh: () => void;
  onOpenReassign?: (item: any) => void;
  onOpenCorrection?: (item: any) => void;
  onOpenOverride?: (type: string, id: string | number, extra?: any) => void;
}

export const SuperAdminOverviewQueues: React.FC<SuperAdminOverviewQueuesProps> = ({
  stats,
  onNavigateTab,
  onRefresh,
  onOpenReassign,
  onOpenCorrection,
  onOpenOverride,
}) => {
  const { lang, t } = useAppUI();

  const [activeQueueTab, setActiveQueueTab] = useState<'my_tasks' | 'unassigned' | 'pending_approval' | 'problematic'>('my_tasks');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  const rawQueues = stats?.queues || {};
  const queues = {
    my_tasks: rawQueues.my_tasks || rawQueues.my_actions || { count: 0, items: [] },
    unassigned: rawQueues.unassigned || { count: 0, items: [] },
    pending_approval: rawQueues.pending_approval || { count: 0, items: [] },
    problematic: rawQueues.problematic || rawQueues.problematic_risky || { count: 0, items: [] },
  };

  const workload = stats?.department_workload || stats?.counts || {};
  const overdue = stats?.overdue_sla || {
    overdue_count: stats?.counts?.overdue_cases ?? (stats?.department_workload?.overdue_cases ?? 0),
    cases: [],
  };

  const activeQueueData = queues[activeQueueTab] || { count: 0, items: [] };
  const safeItems = Array.isArray(activeQueueData?.items) ? activeQueueData.items : [];

  // Filter items if department filter is active
  const filteredQueueItems = safeItems.filter((item: any) => {
    if (departmentFilter === 'ALL') return true;
    const dept = (item.department || item.dept || '').toLowerCase();
    return dept.includes(departmentFilter.toLowerCase());
  });

  return (
    <div className="space-y-3">
      {/* SLA Alert Banner if Overdue Cases Exist */}
      {overdue.overdue_count > 0 && (
        <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700 shrink-0">
              <Flame className="w-4 h-4 animate-pulse" />
            </span>
            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-rose-900 text-xs">
                {t('জরুরি সতর্কতা: নির্ধারিত সেবা সময়সীমা (SLA) উত্তীর্ণ কেস বিদ্যমান', 'Urgent Alert: Overdue SLA Cases Detected')}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[11px] font-black font-mono shrink-0">
                {toBanglaDigits(overdue.overdue_count)} {t('টি কেস', 'cases')}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveQueueTab('problematic');
            }}
            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
          >
            <span>{t('ঝুঁকিপূর্ণ কিউ দেখুন', 'View Queue')}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Department Workload Summary Grid */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
          <h3 className="font-black text-slate-800 text-xs flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#006A4E]" />
            <span>{t('বিভাগভিত্তিক লাইভ কাজের চাপ ও নিয়ন্ত্রণ কেন্দ্র', 'Departmental Workload & Command Matrix')}</span>
          </h3>
          <button
            type="button"
            onClick={onRefresh}
            className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{t('রিফ্রেশ', 'Refresh')}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {/* Card 1: Citizen Transfers */}
          <div
            onClick={() => onNavigateTab('transfers')}
            className="px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-300 transition cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <FileText className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="text-[11px] font-bold text-slate-800 group-hover:text-emerald-900 truncate">{t('নাগরিক হস্তান্তর', 'Transfers')}</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-black font-mono bg-emerald-100 text-emerald-900 shrink-0">
              {toBanglaDigits(workload.transfers_pending || 0)}
            </span>
          </div>

          {/* Card 2: Deeds */}
          <div
            onClick={() => onNavigateTab('deeds')}
            className="px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-300 transition cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Building2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="text-[11px] font-bold text-slate-800 group-hover:text-emerald-900 truncate">{t('দলিল নিবন্ধন', 'Deeds')}</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-black font-mono bg-emerald-100 text-emerald-900 shrink-0">
              {toBanglaDigits(workload.deeds_pending || 0)}
            </span>
          </div>

          {/* Card 3: Mutations */}
          <div
            onClick={() => onNavigateTab('mutations')}
            className="px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-300 transition cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Scale className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="text-[11px] font-bold text-slate-800 group-hover:text-emerald-900 truncate">{t('ই-নামজারি', 'e-Mutations')}</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-black font-mono bg-emerald-100 text-emerald-900 shrink-0">
              {toBanglaDigits(workload.mutations_pending || 0)}
            </span>
          </div>

          {/* Card 4: Field Verification */}
          <div
            onClick={() => onNavigateTab('field_verification')}
            className="px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-300 transition cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Compass className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="text-[11px] font-bold text-slate-800 group-hover:text-emerald-900 truncate">{t('মাঠ তদন্ত', 'Field Verify')}</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-black font-mono bg-emerald-100 text-emerald-900 shrink-0">
              {toBanglaDigits(workload.field_reports_pending || 0)}
            </span>
          </div>

          {/* Card 5: Survey Records */}
          <div
            onClick={() => onNavigateTab('survey_records')}
            className="px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-300 transition cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Layers className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="text-[11px] font-bold text-slate-800 group-hover:text-emerald-900 truncate">{t('জরিপ ব্যাচ', 'Survey Batches')}</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-black font-mono bg-emerald-100 text-emerald-900 shrink-0">
              {toBanglaDigits(workload.survey_batches_pending || 0)}
            </span>
          </div>

          {/* Card 6: Bank Mortgages */}
          <div
            onClick={() => onNavigateTab('bank_liens')}
            className="px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-300 transition cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Landmark className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="text-[11px] font-bold text-slate-800 group-hover:text-emerald-900 truncate">{t('ব্যাংক লিয়েন', 'Bank Liens')}</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-black font-mono bg-emerald-100 text-emerald-900 shrink-0">
              {toBanglaDigits(workload.mortgages_active || 0)}
            </span>
          </div>

          {/* Card 7: Appeals */}
          <div
            onClick={() => onNavigateTab('appeals')}
            className="px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-300 transition cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Gavel className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="text-[11px] font-bold text-slate-800 group-hover:text-emerald-900 truncate">{t('আপিল ট্রাইব্যুনাল', 'Appeals')}</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-black font-mono bg-emerald-100 text-emerald-900 shrink-0">
              {toBanglaDigits(workload.appeals_pending || 0)}
            </span>
          </div>

          {/* Card 8: Acquisition Cases */}
          <div
            onClick={() => onNavigateTab('acquisitions')}
            className="px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-300 transition cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Building2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="text-[11px] font-bold text-slate-800 group-hover:text-emerald-900 truncate">{t('ভূমি অধিগ্রহণ', 'Acquisitions')}</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-black font-mono bg-emerald-100 text-emerald-900 shrink-0">
              {toBanglaDigits(workload.acquisitions_active || 0)}
            </span>
          </div>

          {/* Card 9: Support Tickets */}
          <div
            onClick={() => onNavigateTab('tickets')}
            className="px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-300 transition cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="text-[11px] font-bold text-slate-800 group-hover:text-emerald-900 truncate">{t('হেল্পলাইন ডেস্ক', '16122 Tickets')}</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-black font-mono bg-emerald-100 text-emerald-900 shrink-0">
              {toBanglaDigits(workload.tickets_open || 0)}
            </span>
          </div>

          {/* Card 10: Notices */}
          <div
            onClick={() => onNavigateTab('notices')}
            className="px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-300 transition cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Megaphone className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="text-[11px] font-bold text-slate-800 group-hover:text-emerald-900 truncate">{t('বিজ্ঞপ্তি ও প্রকাশনা', 'Notices')}</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-black font-mono bg-emerald-100 text-emerald-900 shrink-0">
              {toBanglaDigits(workload.notices_draft || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* The 4 Operational Queues */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Queue Selector Tabs & Department Filter */}
        <div className="p-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 rounded-lg overflow-x-auto">
            {/* Queue 1: My Tasks */}
            <button
              type="button"
              onClick={() => setActiveQueueTab('my_tasks')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                activeQueueTab === 'my_tasks'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3 h-3" />
              <span>{t('আমার করণীয়', 'My Tasks')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-mono">
                {toBanglaDigits(queues.my_tasks?.count ?? 0)}
              </span>
            </button>

            {/* Queue 2: Unassigned */}
            <button
              type="button"
              onClick={() => setActiveQueueTab('unassigned')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                activeQueueTab === 'unassigned'
                  ? 'bg-white text-indigo-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>{t('অ্যাসাইন করা হয়নি', 'Unassigned')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-mono">
                {toBanglaDigits(queues.unassigned?.count ?? 0)}
              </span>
            </button>

            {/* Queue 3: Pending Approval */}
            <button
              type="button"
              onClick={() => setActiveQueueTab('pending_approval')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                activeQueueTab === 'pending_approval'
                  ? 'bg-white text-amber-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>{t('অনুমোদনের অপেক্ষায়', 'Pending Approval')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-mono">
                {toBanglaDigits(queues.pending_approval?.count ?? 0)}
              </span>
            </button>

            {/* Queue 4: Problematic & High Risk */}
            <button
              type="button"
              onClick={() => setActiveQueueTab('problematic')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                activeQueueTab === 'problematic'
                  ? 'bg-white text-red-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              <span>{t('ঝুঁকিপূর্ণ / সমস্যাযুক্ত', 'Problematic')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-100 text-red-800 font-mono">
                {toBanglaDigits(queues.problematic?.count ?? 0)}
              </span>
            </button>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-2 py-1 text-[11px] font-semibold bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#006A4E]/30"
            >
              <option value="ALL">{t('সকল বিভাগ', 'All Departments')}</option>
              <option value="transfer">{t('হস্তান্তর', 'Transfers')}</option>
              <option value="deed">{t('দলিল', 'Deeds')}</option>
              <option value="mutation">{t('ই-নামজারি', 'e-Mutations')}</option>
              <option value="survey">{t('জরিপ', 'Survey')}</option>
              <option value="appeal">{t('আপিল', 'Appeals')}</option>
              <option value="ticket">{t('হেল্পলাইন', 'Support')}</option>
            </select>
          </div>
        </div>

        {/* Queue Items List */}
        {filteredQueueItems.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-xs text-slate-700">{t('এই কিউতে কোনো অপেক্ষমাণ কেস নেই', 'No pending cases in this queue')}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{t('সকল দায়িত্বপ্রাপ্ত কাজ সুষ্ঠুভাবে চলমান রয়েছে।', 'All departmental workflows are operating within normal SLA.')}</p>
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100" style={{ scrollbarWidth: 'thin' }}>
            {filteredQueueItems.map((item: any) => (
              <div key={`${item.type}-${item.id}`} className="p-4 hover:bg-slate-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-slate-100 text-slate-700 border border-slate-200">
                      {item.department || item.type}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">{item.title_bn || item.title}</h4>
                    {item.is_overdue && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                        SLA উত্তীর্ণ
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                    <span className="font-mono text-slate-500">আইডি/কোড: {item.identifier || item.id}</span>
                    {item.assigned_to_name && (
                      <span className="flex items-center gap-1 text-slate-700">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {item.assigned_to_name}
                      </span>
                    )}
                    {item.office_bn && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {item.office_bn}
                      </span>
                    )}
                    {item.notes_bn && (
                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200/60">
                        {item.notes_bn}
                      </span>
                    )}
                  </div>
                </div>

                {/* Queue Item Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {/* Action 1: If Unassigned Transfer, open Reassign Modal */}
                  {item.type === 'TRANSFER' && !item.assigned_to_user_id && onOpenReassign && (
                    <button
                      type="button"
                      onClick={() => onOpenReassign(item)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{t('কর্মকর্তা অ্যাসাইন করুন', 'Assign Officer')}</span>
                    </button>
                  )}

                  {/* Action 2: If Problematic / High-Risk, open Override Console */}
                  {item.severity === 'HIGH' || item.severity === 'CRITICAL' || activeQueueTab === 'problematic' ? (
                    onOpenOverride && (
                      <button
                        type="button"
                        onClick={() => onOpenOverride(item.override_type || 'ADMINISTRATIVE_OVERRIDE', item.identifier || item.id, item)}
                        className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition cursor-pointer flex items-center gap-1 border border-amber-200"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                        <span>{t('প্রশাসনিক ওভাররাইড', 'Admin Override')}</span>
                      </button>
                    )
                  ) : null}

                  {/* Action 3: Jump to Department Tab */}
                  <button
                    type="button"
                    onClick={() => {
                      if (item.type === 'TRANSFER') onNavigateTab('transfers');
                      else if (item.type === 'DEED') onNavigateTab('deeds');
                      else if (item.type === 'MUTATION') onNavigateTab('mutations');
                      else if (item.type === 'SURVEY') onNavigateTab('survey_records');
                      else if (item.type === 'APPEAL') onNavigateTab('appeals');
                      else if (item.type === 'TICKET') onNavigateTab('tickets');
                      else onNavigateTab('transfers');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <span>{t('কেস দেখুন', 'Open Case')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
