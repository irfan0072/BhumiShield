import React, { useState } from 'react';
import { useAppUI } from '../../i18n';
import { BhumiApi } from '../../api/client';
import { toBanglaDigits } from '../../theme/tokens';
import {
  Scale,
  Gavel,
  FileText,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Calendar,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  BookOpen,
  Send,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';

interface SuperAdminAppealsTabProps {
  appeals: any[];
  disputes: any[];
  onRefresh: () => void;
  onOpenOverride?: (type: string, id: string | number, extra?: any) => void;
}

export const SuperAdminAppealsTab: React.FC<SuperAdminAppealsTabProps> = ({
  appeals,
  disputes,
  onRefresh,
  onOpenOverride,
}) => {
  const { lang, t, user } = useAppUI();

  const [activeSection, setActiveSection] = useState<'appeals' | 'disputes'>('appeals');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Adjudication Modal State
  const [selectedAppeal, setSelectedAppeal] = useState<any | null>(null);
  const [appealDecisionStatus, setAppealDecisionStatus] = useState('HEARING_SCHEDULED');
  const [appealDecisionNote, setAppealDecisionNote] = useState('');
  const [appealActionLoading, setAppealActionLoading] = useState(false);
  const [appealActionNotice, setAppealActionNotice] = useState<{ msg: string; err?: boolean } | null>(null);

  // Dispute Resolution Modal State
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [disputeResolutionNote, setDisputeResolutionNote] = useState('');
  const [disputeSeverity, setDisputeSeverity] = useState('RESOLVED');
  const [disputeActionLoading, setDisputeActionLoading] = useState(false);
  const [disputeActionNotice, setDisputeActionNotice] = useState<{ msg: string; err?: boolean } | null>(null);

  // Filtered Appeals
  const filteredAppeals = appeals.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      (item.appeal_code && item.appeal_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.appellant_name_bn && item.appellant_name_bn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.dag_no && String(item.dag_no).includes(searchQuery)) ||
      (item.dag_no_bn && item.dag_no_bn.includes(searchQuery)) ||
      (item.case_no && item.case_no.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered Disputes
  const filteredDisputes = disputes.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      (item.case_no && item.case_no.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.complainant_name_bn && item.complainant_name_bn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.dag_no && String(item.dag_no).includes(searchQuery)) ||
      (item.dag_no_bn && item.dag_no_bn.includes(searchQuery)) ||
      (item.dispute_type && item.dispute_type.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDecideAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppeal) return;
    if (!appealDecisionNote.trim() || appealDecisionNote.trim().length < 10) {
      setAppealActionNotice({
        msg: t('কমপক্ষে ১০ অক্ষরের শুনানির তারিখ বা আদেশের কারণ লিখুন।', 'Enter at least 10 characters for hearing date or judgment notes.'),
        err: true,
      });
      return;
    }

    setAppealActionLoading(true);
    setAppealActionNotice(null);
    try {
      await BhumiApi.decideAppeal(selectedAppeal.id || selectedAppeal.appeal_code, {
        status: appealDecisionStatus,
        decision_note_bn: appealDecisionNote.trim(),
      });
      setAppealActionNotice({
        msg: t('✔ আপিল ট্রাইব্যুনালের আদেশ সফলভাবে নথিভুক্ত হয়েছে।', '✔ Appellate Tribunal decree recorded successfully.'),
      });
      setTimeout(() => {
        setSelectedAppeal(null);
        setAppealDecisionNote('');
        setAppealActionNotice(null);
        onRefresh();
      }, 1200);
    } catch (err: any) {
      setAppealActionNotice({
        msg: err?.response?.data?.message_bn || err?.message || t('আপিল আদেশ সংরক্ষণে ব্যর্থতা', 'Failed to record appeal decree'),
        err: true,
      });
    } finally {
      setAppealActionLoading(false);
    }
  };

  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute) return;
    if (!disputeResolutionNote.trim() || disputeResolutionNote.trim().length < 10) {
      setDisputeActionNotice({
        msg: t('কমপক্ষে ১০ অক্ষরের নিষ্পত্তি আদেশ বা ডিক্রির বিবরণ লিখুন।', 'Enter at least 10 characters for decree or resolution notes.'),
        err: true,
      });
      return;
    }

    setDisputeActionLoading(true);
    setDisputeActionNotice(null);
    try {
      await BhumiApi.resolveDispute(selectedDispute.id, {
        status: 'RESOLVED',
        resolution_note_bn: disputeResolutionNote.trim(),
      });
      setDisputeActionNotice({
        msg: t('✔ বিরোধ নিষ্পত্তি ও আদালতের ডিক্রি সফলভাবে প্রয়োগ করা হয়েছে।', '✔ Dispute resolved and court decree applied successfully.'),
      });
      setTimeout(() => {
        setSelectedDispute(null);
        setDisputeResolutionNote('');
        setDisputeActionNotice(null);
        onRefresh();
      }, 1200);
    } catch (err: any) {
      setDisputeActionNotice({
        msg: err?.response?.data?.message_bn || err?.message || t('বিরোধ নিষ্পত্তিতে ব্যর্থতা', 'Failed to resolve dispute'),
        err: true,
      });
    } finally {
      setDisputeActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FILED':
      case 'OPEN':
        return <Badge variant="outline" className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border-amber-200">দাখিলকৃত / চলমান (Filed)</Badge>;
      case 'HEARING_SCHEDULED':
        return <Badge variant="outline" className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border-blue-200">শুনানি ধার্য (Hearing Scheduled)</Badge>;
      case 'STAY_ORDER_GRANTED':
        return <Badge variant="outline" className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-800 border-red-200">স্থগিতাদেশ কার্যকর (Stay Order)</Badge>;
      case 'UPHELD':
        return <Badge variant="outline" className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border-emerald-200">পূর্বের আদেশ বহাল (Upheld)</Badge>;
      case 'OVERTURNED':
        return <Badge variant="outline" className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border-purple-200">আদেশ বাতিল / সংশোধিত (Overturned)</Badge>;
      case 'RESOLVED':
        return <Badge variant="outline" className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border-emerald-200">নিষ্পত্তিকৃত (Resolved)</Badge>;
      default:
        return <Badge variant="secondary" className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border-slate-200">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-section Switcher */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                <Scale className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {t('আপিল ট্রাইব্যুনাল ও আদালত নথি ব্যবস্থাপনা', 'Appeals Tribunal & Court Records OS')}
              </h2>
            </div>
            <p className="text-sm text-slate-600">
              {t(
                'সহকারী কমিশনার (ভূমি)-এর আদেশের বিরুদ্ধে অতিরিক্ত জেলা প্রশাসক (রাজস্ব) আপিল ট্রাইব্যুনাল এবং দেওয়ানি আদালতের নথি পর্যবেক্ষণ ও নিষ্পত্তি।',
                'Supervision of ADC (Revenue) appeals tribunal cases and Civil Court disputes/injunctions across all revenue jurisdictions.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Tabs
              value={activeSection}
              onValueChange={(val) => {
                setActiveSection(val as 'appeals' | 'disputes');
                setStatusFilter('ALL');
              }}
            >
              <TabsList className="bg-slate-100 p-1 rounded-xl h-auto">
                <TabsTrigger
                  value="appeals"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-xs"
                >
                  <Gavel className="w-3.5 h-3.5" />
                  <span>{t('রাজস্ব আপিল', 'Revenue Appeals')}</span>
                  <Badge variant="secondary" className="px-1.5 py-0.2 text-[10px]">
                    {toBanglaDigits(appeals.length)}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="disputes"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-xs"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{t('আদালত বিরোধ', 'Court Disputes')}</span>
                  <Badge variant="secondary" className="px-1.5 py-0.2 text-[10px]">
                    {toBanglaDigits(disputes.length)}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              className="rounded-xl border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
              title={t('রিফ্রেশ', 'Refresh')}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeSection === 'appeals'
                  ? t('আপিল কোড, আবেদনকারী, মিউটেশন কেস বা দাগ নং দিয়ে খুঁজুন...', 'Search by appeal code, appellant, mutation case, dag...')
                  : t('মামলা নং, অভিযোগকারী, দাগ বা বিরোধের ধরন দিয়ে খুঁজুন...', 'Search by case no, complainant, dag, dispute type...')
              }
              className="w-full pl-10 pr-4 py-2 h-10 text-sm bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-bold text-slate-500 shrink-0">{t('অবস্থা:', 'Status:')}</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 h-10 text-xs font-semibold bg-white border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('সকল অবস্থা (All)', 'All Statuses')}</SelectItem>
                {activeSection === 'appeals' ? (
                  <>
                    <SelectItem value="FILED">{t('দাখিলকৃত (FILED)', 'Filed')}</SelectItem>
                    <SelectItem value="HEARING_SCHEDULED">{t('শুনানি ধার্য (HEARING_SCHEDULED)', 'Hearing Scheduled')}</SelectItem>
                    <SelectItem value="STAY_ORDER_GRANTED">{t('স্থগিতাদেশ কার্যকর (STAY_ORDER_GRANTED)', 'Stay Order')}</SelectItem>
                    <SelectItem value="UPHELD">{t('পূর্বের আদেশ বহাল (UPHELD)', 'Upheld')}</SelectItem>
                    <SelectItem value="OVERTURNED">{t('আদেশ বাতিল/সংশোধিত (OVERTURNED)', 'Overturned')}</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="OPEN">{t('চলমান আপত্তি (OPEN)', 'Open')}</SelectItem>
                    <SelectItem value="RESOLVED">{t('নিষ্পত্তিকৃত (RESOLVED)', 'Resolved')}</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* SECTION: REVENUE APPEALS */}
      {activeSection === 'appeals' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Gavel className="w-4 h-4 text-indigo-600" />
              <span>{t('রাজস্ব আপিল রেজিস্টার তালিকা', 'Revenue Appeals Register')}</span>
              <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-full font-semibold text-slate-600">
                {toBanglaDigits(filteredAppeals.length)} {t('টি কেস', 'cases')}
              </Badge>
            </h3>
          </div>

          {filteredAppeals.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Scale className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">{t('কোনো আপিল রেকর্ড খুঁজে পাওয়া যায়নি', 'No appeal records found')}</p>
              <p className="text-xs text-slate-400 mt-1">{t('ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন।', 'Change filter criteria and try again.')}</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-280px)] min-h-[300px] scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-bold">
                    <TableHead className="py-3 px-4">{t('আপিল কোড', 'Appeal Code')}</TableHead>
                    <TableHead className="py-3 px-4">{t('দাগ ও এলাকা', 'Plot & Location')}</TableHead>
                    <TableHead className="py-3 px-4">{t('আবেদনকারী', 'Appellant')}</TableHead>
                    <TableHead className="py-3 px-4">{t('আপিলের কারণ / ভিত্তি', 'Grounds for Appeal')}</TableHead>
                    <TableHead className="py-3 px-4">{t('অবস্থা', 'Status')}</TableHead>
                    <TableHead className="py-3 px-4">{t('শুনানি / আদেশ বিবরণ', 'Decree / Notes')}</TableHead>
                    <TableHead className="py-3 px-4 text-right">{t('কার্যক্রম', 'Action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {filteredAppeals.map((appeal) => (
                    <TableRow key={appeal.id} className="hover:bg-slate-50/80 transition">
                      <TableCell className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {appeal.appeal_code}
                        {appeal.case_no && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            মিউটেশন: {appeal.case_no}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <div className="font-bold text-slate-800">দাগ নং {appeal.dag_no_bn || appeal.dag_no}</div>
                        <div className="text-[11px] text-slate-500">আইডি: {appeal.plot_id}</div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <div className="font-bold text-slate-800">{appeal.appellant_name_bn}</div>
                        <div className="text-[11px] text-slate-500 font-mono">NID: {appeal.appellant_nid}</div>
                      </TableCell>
                      <TableCell className="py-3 px-4 max-w-xs">
                        <p className="text-slate-700 line-clamp-2" title={appeal.reason_bn}>
                          {appeal.reason_bn}
                        </p>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        {getStatusBadge(appeal.status)}
                      </TableCell>
                      <TableCell className="py-3 px-4 max-w-xs">
                        {appeal.decision_note_bn ? (
                          <div className="text-slate-700">
                            <span className="font-semibold text-slate-900">{appeal.reviewer_username ? `[${appeal.reviewer_username}]: ` : ''}</span>
                            <span className="line-clamp-2" title={appeal.decision_note_bn}>{appeal.decision_note_bn}</span>
                            {appeal.decided_at && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(appeal.decided_at).toLocaleDateString('bn-BD')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">{t('আদেশ অপেক্ষমাণ', 'Pending Decree')}</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAppeal(appeal);
                            setAppealDecisionStatus(appeal.status === 'FILED' ? 'HEARING_SCHEDULED' : appeal.status);
                            setAppealDecisionNote(appeal.decision_note_bn || '');
                            setAppealActionNotice(null);
                          }}
                          className="px-3 py-1.5 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200/60 font-bold text-xs inline-flex items-center gap-1"
                        >
                          <Gavel className="w-3.5 h-3.5" />
                          <span>{t('বিচার / আদেশ', 'Adjudicate')}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* SECTION: CIVIL COURT DISPUTES */}
      {activeSection === 'disputes' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>{t('দেওয়ানি বিরোধ ও আদালত ইনজাংশন রেজিস্টার', 'Civil Disputes & Injunctions Register')}</span>
              <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-full font-semibold text-slate-600">
                {toBanglaDigits(filteredDisputes.length)} {t('টি রেকর্ড', 'records')}
              </Badge>
            </h3>
          </div>

          {filteredDisputes.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">{t('কোনো বিরোধ রেকর্ড পাওয়া যায়নি', 'No dispute records found')}</p>
              <p className="text-xs text-slate-400 mt-1">{t('ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন।', 'Change filter criteria and try again.')}</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-280px)] min-h-[300px] scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-bold">
                    <TableHead className="py-3 px-4">{t('মামলা নং', 'Case No')}</TableHead>
                    <TableHead className="py-3 px-4">{t('দাগ ও মৌজা', 'Plot & Mouza')}</TableHead>
                    <TableHead className="py-3 px-4">{t('অভিযোগকারী', 'Complainant')}</TableHead>
                    <TableHead className="py-3 px-4">{t('বিরোধের ধরন ও গুরুত্ব', 'Dispute Type & Severity')}</TableHead>
                    <TableHead className="py-3 px-4">{t('অভিযোগের বিবরণ', 'Description')}</TableHead>
                    <TableHead className="py-3 px-4">{t('অবস্থা ও নিষ্পত্তি', 'Status & Resolution')}</TableHead>
                    <TableHead className="py-3 px-4 text-right">{t('কার্যক্রম', 'Action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {filteredDisputes.map((dispute) => (
                    <TableRow key={dispute.id} className="hover:bg-slate-50/80 transition">
                      <TableCell className="py-3 px-4 font-mono font-bold text-red-700">
                        {dispute.case_no}
                        <div className="text-[10px] text-slate-400 font-normal">
                          {new Date(dispute.created_at).toLocaleDateString('bn-BD')}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <div className="font-bold text-slate-800">দাগ নং {dispute.dag_no_bn || dispute.dag_no}</div>
                        <div className="text-[11px] text-slate-500">
                          {dispute.mouza_bn ? `${dispute.mouza_bn}, ${dispute.upazila_bn}` : `দাগ আইডি: ${dispute.plot_id}`}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <div className="font-bold text-slate-800">{dispute.complainant_name_bn}</div>
                        <div className="text-[11px] text-slate-500 font-mono">NID: {dispute.complainant_nid}</div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <div className="font-bold text-slate-800">{dispute.dispute_type}</div>
                        <Badge variant="outline" className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          dispute.severity === 'HIGH' || dispute.severity === 'CRITICAL'
                            ? 'bg-red-100 text-red-700 border-red-200'
                            : 'bg-amber-100 text-amber-700 border-amber-200'
                        }`}>
                          {dispute.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 max-w-xs">
                        <p className="text-slate-700 line-clamp-2" title={dispute.description_bn}>
                          {dispute.description_bn}
                        </p>
                      </TableCell>
                      <TableCell className="py-3 px-4 max-w-xs">
                        <div className="mb-1">{getStatusBadge(dispute.status)}</div>
                        {dispute.resolution_notes_bn && (
                          <div className="text-[11px] text-slate-600 line-clamp-2" title={dispute.resolution_notes_bn}>
                            {dispute.resolved_by ? `[${dispute.resolved_by}]: ` : ''}
                            {dispute.resolution_notes_bn}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {dispute.status === 'OPEN' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedDispute(dispute);
                                setDisputeResolutionNote('');
                                setDisputeSeverity('RESOLVED');
                                setDisputeActionNotice(null);
                              }}
                              className="px-3 py-1.5 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 font-bold text-xs inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{t('নিষ্পত্তি', 'Resolve')}</span>
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400 font-semibold">{t('নিষ্পন্ন', 'Closed')}</span>
                          )}
                          {onOpenOverride && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => onOpenOverride('COURT_DECREE_OVERRIDE', dispute.case_no, dispute)}
                              className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 font-bold text-xs"
                              title={t('প্রশাসনিক ওভাররাইড কনসোল', 'Administrative Override Console')}
                            >
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* DIALOG: ADJUDICATE REVENUE APPEAL */}
      <Dialog open={!!selectedAppeal} onOpenChange={(open) => !open && setSelectedAppeal(null)}>
        {selectedAppeal && (
          <DialogContent className="sm:max-w-lg p-6 rounded-2xl border border-slate-200 shadow-2xl">
            <DialogHeader className="pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                  <Gavel className="w-5 h-5" />
                </span>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900">
                    {t('আপিল ট্রাইব্যুনাল শুনানি ও আদেশ প্রদান', 'Appellate Tribunal Adjudication')}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-mono">
                    {selectedAppeal.appeal_code} (দাগ: {selectedAppeal.dag_no_bn || selectedAppeal.dag_no})
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleDecideAppeal} className="mt-4 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('আপিলকারী:', 'Appellant:')}</span>
                  <span className="font-bold text-slate-800">{selectedAppeal.appellant_name_bn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('মিউটেশন রেফারেন্স:', 'Mutation Ref:')}</span>
                  <span className="font-mono text-slate-800">{selectedAppeal.case_no || 'N/A'}</span>
                </div>
                <div className="pt-1 border-t border-slate-200 text-slate-600">
                  <span className="font-semibold text-slate-700">{t('আপিলের কারণ:', 'Grounds:')}</span> {selectedAppeal.reason_bn}
                </div>
              </div>

              <div>
                <Label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('আপিলের নতুন অবস্থা / ট্রাইব্যুনাল আদেশ *', 'Tribunal Decree / Status *')}
                </Label>
                <Select value={appealDecisionStatus} onValueChange={setAppealDecisionStatus}>
                  <SelectTrigger className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HEARING_SCHEDULED">{t('শুনানি ধার্যকরণ (HEARING_SCHEDULED)', 'Schedule Hearing')}</SelectItem>
                    <SelectItem value="STAY_ORDER_GRANTED">{t('স্থগিতাদেশ জারি (STAY_ORDER_GRANTED)', 'Grant Stay Order')}</SelectItem>
                    <SelectItem value="UPHELD">{t('পূর্বের নামজারি আদেশ বহাল (UPHELD)', 'Uphold Previous Mutation Decree')}</SelectItem>
                    <SelectItem value="OVERTURNED">{t('পূর্বের আদেশ বাতিল ও পুনঃতদন্তের নির্দেশ (OVERTURNED)', 'Overturn & Remand for Re-investigation')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('শুনানির নোটিশ / আদেশের বিস্তারিত কারণ ও নির্দেশনা * (কমপক্ষে ১০ অক্ষর)', 'Hearing Notice / Decree Grounds & Instructions * (min 10 chars)')}
                </Label>
                <Textarea
                  rows={3}
                  value={appealDecisionNote}
                  onChange={(e) => setAppealDecisionNote(e.target.value)}
                  placeholder={t('আদেশের আইনি ভিত্তি, শুনানির তারিখ এবং উভয় পক্ষকে উপস্থিতির নির্দেশ লিখুন...', 'Enter legal grounds, hearing schedule, and summons notes...')}
                  className="w-full p-3 text-xs bg-white border border-slate-200 rounded-xl focus-visible:ring-2 focus-visible:ring-indigo-500/20 resize-none"
                  required
                />
              </div>

              {appealActionNotice && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  appealActionNotice.err ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {appealActionNotice.err ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  <span>{appealActionNotice.msg}</span>
                </div>
              )}

              <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedAppeal(null)}
                  disabled={appealActionLoading}
                  className="border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t('বাতিল', 'Cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={appealActionLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  {appealActionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Gavel className="w-3.5 h-3.5" />}
                  <span>{t('আদেশ নথিভুক্ত করুন', 'Record Decree')}</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>

      {/* DIALOG: RESOLVE CIVIL DISPUTE */}
      <Dialog open={!!selectedDispute} onOpenChange={(open) => !open && setSelectedDispute(null)}>
        {selectedDispute && (
          <DialogContent className="sm:max-w-lg p-6 rounded-2xl border border-slate-200 shadow-2xl">
            <DialogHeader className="pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-red-50 text-red-700">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900">
                    {t('দেওয়ানি বিরোধ নিষ্পত্তি ও ডিক্রি প্রয়োগ', 'Resolve Dispute & Apply Court Decree')}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-mono">
                    {selectedDispute.case_no} (দাগ: {selectedDispute.dag_no_bn || selectedDispute.dag_no})
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleResolveDispute} className="mt-4 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('অভিযোগকারী:', 'Complainant:')}</span>
                  <span className="font-bold text-slate-800">{selectedDispute.complainant_name_bn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('বিরোধের ধরন:', 'Dispute Type:')}</span>
                  <span className="font-bold text-slate-800">{selectedDispute.dispute_type}</span>
                </div>
                <div className="pt-1 border-t border-slate-200 text-slate-600">
                  <span className="font-semibold text-slate-700">{t('বিবরণ:', 'Description:')}</span> {selectedDispute.description_bn}
                </div>
              </div>

              <div>
                <Label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('নিষ্পত্তি আদেশ ও আদালতের চূড়ান্ত রেফারেন্স * (কমপক্ষে ১০ অক্ষর)', 'Settlement Decree & Legal Notes * (min 10 chars)')}
                </Label>
                <Textarea
                  rows={3}
                  value={disputeResolutionNote}
                  onChange={(e) => setDisputeResolutionNote(e.target.value)}
                  placeholder={t('দেওয়ানি আদালতের রায় নং, সাব-রেজিস্ট্রার ও সহকারী কমিশনার (ভূমি)-এর করণীয় নির্দেশ লিখুন...', 'Enter court judgment no, boundaries agreed, instructions for AC Land...')}
                  className="w-full p-3 text-xs bg-white border border-slate-200 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-500/20 resize-none"
                  required
                />
              </div>

              {disputeActionNotice && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  disputeActionNotice.err ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {disputeActionNotice.err ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  <span>{disputeActionNotice.msg}</span>
                </div>
              )}

              <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedDispute(null)}
                  disabled={disputeActionLoading}
                  className="border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t('বাতিল', 'Cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={disputeActionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  {disputeActionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{t('বিরোধ নিষ্পত্তি করুন', 'Resolve Dispute')}</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};
