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
    <div className="space-y-6">
      {/* SLA Alert Banner if Overdue Cases Exist */}
      {overdue.overdue_count > 0 && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-red-100 text-red-700 shrink-0">
              <Flame className="w-6 h-6 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-red-900 text-sm">
                  {t('জরুরি সতর্কতা: নির্ধারিত সেবা সময়সীমা (SLA) উত্তীর্ণ কেস বিদ্যমান', 'Urgent Alert: Overdue SLA Cases Detected')}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-red-200 text-red-800 text-xs font-bold font-mono">
                  {toBanglaDigits(overdue.overdue_count)} {t('টি কেস', 'cases')}
                </span>
              </div>
              <p className="text-xs text-red-700 mt-0.5">
                {t(
                  'নাগরিক সেবা সনদ (Citizen Charter) অনুযায়ী নির্ধারিত কার্যদিবস অতিক্রম করেছে। জরুরি ভিত্তিতে পুনঃঅ্যাসাইন বা ব্যবস্থা গ্রহণ প্রয়োজন।',
                  'Citizen service deadline breached. Urgent reassignment or supervisory action required.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveQueueTab('problematic');
              }}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <span>{t('ঝুঁকিপূর্ণ কিউ দেখুন', 'View High-Risk Queue')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Department Workload Summary Grid */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-100">
          <div>
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#006A4E]" />
              <span>{t('বিভাগভিত্তিক কাজের চাপ ও নিয়ন্ত্রণ কেন্দ্র', 'Departmental Workload & Command Matrix')}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                'প্রতিটি ভূমি ব্যবস্থাপনা বিভাগের সরাসরি কাজের পরিসংখ্যান। সংশ্লিষ্ট মডিউলে প্রবেশ করতে ক্লিক করুন।',
                'Live caseload across all land governance verticals. Click any card to navigate directly.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="self-start md:self-auto px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('রিফ্রেশ', 'Refresh')}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
          {/* Card 1: Citizen Transfers */}
          <div
            onClick={() => onNavigateTab('transfers')}
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/70 hover:border-emerald-300 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 group-hover:text-emerald-700 mb-2">
              <span className="text-[11px] font-bold">{t('নাগরিক হস্তান্তর', 'Transfers')}</span>
              <FileText className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-900 group-hover:text-emerald-800 font-mono">
              {toBanglaDigits(workload.transfers_pending || 0)}
            </div>
            <div className="text-[10px] text-slate-500 group-hover:text-emerald-700 mt-1 flex items-center justify-between">
              <span>{t('অপেক্ষমাণ আবেদন', 'Pending')}</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 2: Deeds */}
          <div
            onClick={() => onNavigateTab('deeds')}
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/70 hover:border-emerald-300 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 group-hover:text-emerald-700 mb-2">
              <span className="text-[11px] font-bold">{t('দলিল নিবন্ধন', 'Deeds')}</span>
              <Building2 className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-900 group-hover:text-emerald-800 font-mono">
              {toBanglaDigits(workload.deeds_pending || 0)}
            </div>
            <div className="text-[10px] text-slate-500 group-hover:text-emerald-700 mt-1 flex items-center justify-between">
              <span>{t('সাব-রেজিস্ট্রি কিউ', 'Sub-Registry')}</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 3: Mutations */}
          <div
            onClick={() => onNavigateTab('mutations')}
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/70 hover:border-emerald-300 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 group-hover:text-emerald-700 mb-2">
              <span className="text-[11px] font-bold">{t('ই-নামজারি', 'e-Mutations')}</span>
              <Scale className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-900 group-hover:text-emerald-800 font-mono">
              {toBanglaDigits(workload.mutations_pending || 0)}
            </div>
            <div className="text-[10px] text-slate-500 group-hover:text-emerald-700 mt-1 flex items-center justify-between">
              <span>{t('এসি ল্যান্ড পর্যালোচনা', 'AC Land Queue')}</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 4: Field Verification */}
          <div
            onClick={() => onNavigateTab('field_verification')}
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/70 hover:border-emerald-300 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 group-hover:text-emerald-700 mb-2">
              <span className="text-[11px] font-bold">{t('মাঠ তদন্ত', 'Field Verification')}</span>
              <Compass className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-900 group-hover:text-emerald-800 font-mono">
              {toBanglaDigits(workload.field_reports_pending || 0)}
            </div>
            <div className="text-[10px] text-slate-500 group-hover:text-emerald-700 mt-1 flex items-center justify-between">
              <span>{t('সার্ভেয়ার রিপোর্ট', 'Surveyor SLA')}</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 5: Survey Records */}
          <div
            onClick={() => onNavigateTab('survey_records')}
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/70 hover:border-emerald-300 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 group-hover:text-emerald-700 mb-2">
              <span className="text-[11px] font-bold">{t('জরিপ ব্যাচ', 'Survey Batches')}</span>
              <Layers className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-900 group-hover:text-emerald-800 font-mono">
              {toBanglaDigits(workload.survey_batches_pending || 0)}
            </div>
            <div className="text-[10px] text-slate-500 group-hover:text-emerald-700 mt-1 flex items-center justify-between">
              <span>{t('মেকার-চেকার কিউ', 'Maker-Checker')}</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 6: Bank Mortgages */}
          <div
            onClick={() => onNavigateTab('bank_liens')}
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/70 hover:border-emerald-300 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 group-hover:text-emerald-700 mb-2">
              <span className="text-[11px] font-bold">{t('ব্যাংক লিয়েন', 'Bank Mortgages')}</span>
              <Landmark className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-900 group-hover:text-emerald-800 font-mono">
              {toBanglaDigits(workload.mortgages_active || 0)}
            </div>
            <div className="text-[10px] text-slate-500 group-hover:text-emerald-700 mt-1 flex items-center justify-between">
              <span>{t('সক্রিয় বন্ধক', 'Active Liens')}</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 7: Appeals */}
          <div
            onClick={() => onNavigateTab('appeals')}
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/70 hover:border-emerald-300 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 group-hover:text-emerald-700 mb-2">
              <span className="text-[11px] font-bold">{t('আপিল ট্রাইব্যুনাল', 'Appeals')}</span>
              <Gavel className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-900 group-hover:text-emerald-800 font-mono">
              {toBanglaDigits(workload.appeals_pending || 0)}
            </div>
            <div className="text-[10px] text-slate-500 group-hover:text-emerald-700 mt-1 flex items-center justify-between">
              <span>{t('এডিসি রাজস্ব কিউ', 'ADC Revenue')}</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 8: Acquisition Cases */}
          <div
            onClick={() => onNavigateTab('acquisitions')}
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/70 hover:border-emerald-300 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 group-hover:text-emerald-700 mb-2">
              <span className="text-[11px] font-bold">{t('ভূমি অধিগ্রহণ', 'Acquisitions')}</span>
              <Building2 className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-900 group-hover:text-emerald-800 font-mono">
              {toBanglaDigits(workload.acquisitions_active || 0)}
            </div>
            <div className="text-[10px] text-slate-500 group-hover:text-emerald-700 mt-1 flex items-center justify-between">
              <span>{t('ডিসি এলএ কেস', 'DC LA Cases')}</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 9: Support Tickets */}
          <div
            onClick={() => onNavigateTab('tickets')}
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/70 hover:border-emerald-300 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 group-hover:text-emerald-700 mb-2">
              <span className="text-[11px] font-bold">{t('হেল্পলাইন ডেস্ক', '16122 Tickets')}</span>
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-900 group-hover:text-emerald-800 font-mono">
              {toBanglaDigits(workload.tickets_open || 0)}
            </div>
            <div className="text-[10px] text-slate-500 group-hover:text-emerald-700 mt-1 flex items-center justify-between">
              <span>{t('উন্মুক্ত অভিযোগ', 'Open Tickets')}</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 10: Notices */}
          <div
            onClick={() => onNavigateTab('notices')}
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/70 hover:border-emerald-300 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 group-hover:text-emerald-700 mb-2">
              <span className="text-[11px] font-bold">{t('বিজ্ঞপ্তি ও প্রকাশনা', 'Notices')}</span>
              <Megaphone className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-900 group-hover:text-emerald-800 font-mono">
              {toBanglaDigits(workload.notices_draft || 0)}
            </div>
            <div className="text-[10px] text-slate-500 group-hover:text-emerald-700 mt-1 flex items-center justify-between">
              <span>{t('অনুমোদন অপেক্ষমাণ', 'Pending Approval')}</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* The 4 Operational Queues */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Queue Selector Tabs & Department Filter */}
        <div className="p-4 bg-slate-50/75 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl overflow-x-auto">
            {/* Queue 1: My Tasks */}
            <button
              type="button"
              onClick={() => setActiveQueueTab('my_tasks')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeQueueTab === 'my_tasks'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{t('আমার করণীয়', 'My Tasks')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-mono">
                {toBanglaDigits(queues.my_tasks?.count ?? 0)}
              </span>
            </button>

            {/* Queue 2: Unassigned */}
            <button
              type="button"
              onClick={() => setActiveQueueTab('unassigned')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeQueueTab === 'unassigned'
                  ? 'bg-white text-indigo-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{t('অ্যাসাইন করা হয়নি', 'Unassigned')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-mono">
                {toBanglaDigits(queues.unassigned?.count ?? 0)}
              </span>
            </button>

            {/* Queue 3: Pending Approval */}
            <button
              type="button"
              onClick={() => setActiveQueueTab('pending_approval')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeQueueTab === 'pending_approval'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{t('অনুমোদনের অপেক্ষায়', 'Pending Approval')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-mono">
                {toBanglaDigits(queues.pending_approval?.count ?? 0)}
              </span>
            </button>

            {/* Queue 4: Problematic & High Risk */}
            <button
              type="button"
              onClick={() => setActiveQueueTab('problematic')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeQueueTab === 'problematic'
                  ? 'bg-white text-red-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{t('সমস্যাযুক্ত / ঝুঁকিপূর্ণ', 'Problematic / High Risk')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-100 text-red-800 font-mono">
                {toBanglaDigits(queues.problematic?.count ?? 0)}
              </span>
            </button>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#006A4E]/20"
            >
              <option value="ALL">{t('সকল বিভাগ (All Departments)', 'All Departments')}</option>
              <option value="transfer">{t('হস্তান্তর ও নাগরিক সেবা', 'Citizen Transfers')}</option>
              <option value="deed">{t('সাব-রেজিস্ট্রি ও দলিল', 'Sub-Registry & Deeds')}</option>
              <option value="mutation">{t('ই-নামজারি ও খতিয়ান', 'e-Mutations')}</option>
              <option value="survey">{t('জরিপ ও রেকর্ড', 'Survey Records')}</option>
              <option value="appeal">{t('আপিল ও বিরোধ', 'Appeals & Disputes')}</option>
              <option value="ticket">{t('হেল্পলাইন ও সাপোর্ট', 'Support Tickets')}</option>
            </select>
          </div>
        </div>

        {/* Queue Items List */}
        {filteredQueueItems.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">{t('এই কিউতে কোনো অপেক্ষমাণ কেস নেই', 'No pending cases in this queue')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('সকল দায়িত্বপ্রাপ্ত কাজ সুষ্ঠুভাবে চলমান রয়েছে।', 'All departmental workflows are operating within normal SLA.')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
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
