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
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';

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
        <Alert className="bg-rose-50 border-rose-300 text-rose-900 shadow-2xs flex items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700 shrink-0">
              <Flame className="w-4 h-4 animate-pulse" />
            </span>
            <AlertDescription className="flex items-center gap-2 truncate font-bold text-rose-900 text-xs">
              <span>{t('জরুরি সতর্কতা: নির্ধারিত সেবা সময়সীমা (SLA) উত্তীর্ণ কেস বিদ্যমান', 'Urgent Alert: Overdue SLA Cases Detected')}</span>
              <Badge variant="danger" className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 hover:bg-rose-200 text-[11px] font-black font-mono shrink-0">
                {toBanglaDigits(overdue.overdue_count)} {t('টি কেস', 'cases')}
              </Badge>
            </AlertDescription>
          </div>

          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => setActiveQueueTab('problematic')}
            className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 shrink-0 shadow-2xs"
          >
            <span>{t('ঝুঁকিপূর্ণ কিউ দেখুন', 'View Queue')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Alert>
      )}

      {/* Department Workload Summary Grid */}
      <Card className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
          <h3 className="font-black text-slate-800 text-xs flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#006A4E]" />
            <span>{t('বিভাগভিত্তিক লাইভ কাজের চাপ ও নিয়ন্ত্রণ কেন্দ্র', 'Departmental Workload & Command Matrix')}</span>
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="h-7 px-2.5 rounded-md text-[10px] font-bold border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{t('রিফ্রেশ', 'Refresh')}</span>
          </Button>
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
            <Badge variant="outline" className="px-1.5 py-0.5 rounded text-[11px] font-black font-mono bg-emerald-100 text-emerald-900 border-emerald-200 shrink-0">
              {toBanglaDigits(workload.transfers_pending || 0)}
            </Badge>
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
            <Badge variant="outline" className="px-1.5 py-0.5 rounded text-[11px] font-black font-mono bg-emerald-100 text-emerald-900 border-emerald-200 shrink-0">
              {toBanglaDigits(workload.deeds_pending || 0)}
            </Badge>
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
            <Badge variant="outline" className="px-1.5 py-0.5 rounded text-[11px] font-black font-mono bg-emerald-100 text-emerald-900 border-emerald-200 shrink-0">
              {toBanglaDigits(workload.mutations_pending || 0)}
            </Badge>
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
            <Badge variant="outline" className="px-1.5 py-0.5 rounded text-[11px] font-black font-mono bg-emerald-100 text-emerald-900 border-emerald-200 shrink-0">
              {toBanglaDigits(workload.field_reports_pending || 0)}
            </Badge>
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
            <Badge variant="outline" className="px-1.5 py-0.5 rounded text-[11px] font-black font-mono bg-emerald-100 text-emerald-900 border-emerald-200 shrink-0">
              {toBanglaDigits(workload.survey_batches_pending || 0)}
            </Badge>
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
            <Badge variant="outline" className="px-1.5 py-0.5 rounded text-[11px] font-black font-mono bg-emerald-100 text-emerald-900 border-emerald-200 shrink-0">
              {toBanglaDigits(workload.mortgages_active || 0)}
            </Badge>
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
            <Badge variant="outline" className="px-1.5 py-0.5 rounded text-[11px] font-black font-mono bg-emerald-100 text-emerald-900 border-emerald-200 shrink-0">
              {toBanglaDigits(workload.appeals_pending || 0)}
            </Badge>
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
            <Badge variant="outline" className="px-1.5 py-0.5 rounded text-[11px] font-black font-mono bg-emerald-100 text-emerald-900 border-emerald-200 shrink-0">
              {toBanglaDigits(workload.acquisitions_active || 0)}
            </Badge>
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
            <Badge variant="outline" className="px-1.5 py-0.5 rounded text-[11px] font-black font-mono bg-emerald-100 text-emerald-900 border-emerald-200 shrink-0">
              {toBanglaDigits(workload.tickets_open || 0)}
            </Badge>
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
            <Badge variant="outline" className="px-1.5 py-0.5 rounded text-[11px] font-black font-mono bg-emerald-100 text-emerald-900 border-emerald-200 shrink-0">
              {toBanglaDigits(workload.notices_draft || 0)}
            </Badge>
          </div>
        </div>
      </Card>

      {/* The 4 Operational Queues */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Queue Selector Tabs & Department Filter */}
        <div className="p-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <Tabs
            value={activeQueueTab}
            onValueChange={(val) => setActiveQueueTab(val as any)}
            className="w-full md:w-auto"
          >
            <TabsList className="bg-slate-200/70 p-0.5 h-auto flex flex-wrap gap-1">
              {/* Queue 1: My Tasks */}
              <TabsTrigger
                value="my_tasks"
                className="px-2.5 py-1 text-[11px] font-bold flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-2xs"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{t('আমার করণীয়', 'My Tasks')}</span>
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-emerald-100 text-emerald-800 font-mono">
                  {toBanglaDigits(queues.my_tasks?.count ?? 0)}
                </Badge>
              </TabsTrigger>

              {/* Queue 2: Unassigned */}
              <TabsTrigger
                value="unassigned"
                className="px-2.5 py-1 text-[11px] font-bold flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-indigo-800 data-[state=active]:shadow-2xs"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{t('অ্যাসাইন করা হয়নি', 'Unassigned')}</span>
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-indigo-100 text-indigo-800 font-mono">
                  {toBanglaDigits(queues.unassigned?.count ?? 0)}
                </Badge>
              </TabsTrigger>

              {/* Queue 3: Pending Approval */}
              <TabsTrigger
                value="pending_approval"
                className="px-2.5 py-1 text-[11px] font-bold flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-amber-800 data-[state=active]:shadow-2xs"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{t('অনুমোদনের অপেক্ষায়', 'Pending Approval')}</span>
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-amber-100 text-amber-800 font-mono">
                  {toBanglaDigits(queues.pending_approval?.count ?? 0)}
                </Badge>
              </TabsTrigger>

              {/* Queue 4: Problematic & High Risk */}
              <TabsTrigger
                value="problematic"
                className="px-2.5 py-1 text-[11px] font-bold flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-red-800 data-[state=active]:shadow-2xs"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{t('ঝুঁকিপূর্ণ / সমস্যাযুক্ত', 'Problematic')}</span>
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-red-100 text-red-800 font-mono">
                  {toBanglaDigits(queues.problematic?.count ?? 0)}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Department Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="h-8 text-[11px] font-semibold bg-white w-[160px]">
                <SelectValue placeholder={t('সকল বিভাগ', 'All Departments')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">{t('সকল বিভাগ', 'All Departments')}</SelectItem>
                <SelectItem value="transfer" className="text-xs">{t('হস্তান্তর', 'Transfers')}</SelectItem>
                <SelectItem value="deed" className="text-xs">{t('দলিল', 'Deeds')}</SelectItem>
                <SelectItem value="mutation" className="text-xs">{t('ই-নামজারি', 'e-Mutations')}</SelectItem>
                <SelectItem value="survey" className="text-xs">{t('জরিপ', 'Survey')}</SelectItem>
                <SelectItem value="appeal" className="text-xs">{t('আপিল', 'Appeals')}</SelectItem>
                <SelectItem value="ticket" className="text-xs">{t('হেল্পলাইন', 'Support')}</SelectItem>
              </SelectContent>
            </Select>
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
                    <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-bold font-mono uppercase bg-slate-100 text-slate-700 border-slate-200">
                      {item.department || item.type}
                    </Badge>
                    <h4 className="font-bold text-slate-900 text-sm">{item.title_bn || item.title}</h4>
                    {item.is_overdue && (
                      <Badge variant="danger" className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 border-red-200">
                        SLA উত্তীর্ণ
                      </Badge>
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
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenReassign(item)}
                      className="h-8 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 font-bold text-xs flex items-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{t('কর্মকর্তা অ্যাসাইন করুন', 'Assign Officer')}</span>
                    </Button>
                  )}

                  {/* Action 2: If Problematic / High-Risk, open Override Console */}
                  {item.severity === 'HIGH' || item.severity === 'CRITICAL' || activeQueueTab === 'problematic' ? (
                    onOpenOverride && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenOverride(item.override_type || 'ADMINISTRATIVE_OVERRIDE', item.identifier || item.id, item)}
                        className="h-8 px-3 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs flex items-center gap-1 border-amber-200"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                        <span>{t('প্রশাসনিক ওভাররাইড', 'Admin Override')}</span>
                      </Button>
                    )
                  ) : null}

                  {/* Action 3: Jump to Department Tab */}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (item.type === 'TRANSFER') onNavigateTab('transfers');
                      else if (item.type === 'DEED') onNavigateTab('deeds');
                      else if (item.type === 'MUTATION') onNavigateTab('mutations');
                      else if (item.type === 'SURVEY') onNavigateTab('survey_records');
                      else if (item.type === 'APPEAL') onNavigateTab('appeals');
                      else if (item.type === 'TICKET') onNavigateTab('tickets');
                      else onNavigateTab('transfers');
                    }}
                    className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 border-slate-200"
                  >
                    <span>{t('কেস দেখুন', 'Open Case')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

