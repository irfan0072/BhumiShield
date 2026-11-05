import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  Compass,
  UserCheck,
  Send,
  PlusCircle,
  ListOrdered,
  Calendar,
  FileText,
  RefreshCw,
  Search,
  Filter,
  CheckSquare,
} from 'lucide-react';
import {
  mapAssignmentsApi,
  MapTaskAssignment,
  TaskType,
  TaskPriority,
  TaskStatus,
  TASK_TYPES_CONFIG,
  TASK_PRIORITIES_CONFIG,
  TASK_STATUS_CONFIG,
} from '../../api/mapAssignmentsApi';
import { MapLocation, mapApi, MapPlot } from './mapApi';
import { useAppUI } from '../../i18n';
import { api } from '../../api/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

interface TaskAssignmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  locations: MapLocation[];
  activeLocationId?: number;
  activePlotId?: number;
  onNavigateToLocation: (lat: number, lng: number, locationId: number, plotId?: number | null) => void;
  onTaskCreated?: (task: MapTaskAssignment) => void;
}

interface OfficerUser {
  id: number;
  username: string;
  full_name_bn: string;
  role: string;
  is_active: number;
}

export const TaskAssignmentDrawer: React.FC<TaskAssignmentDrawerProps> = ({
  isOpen,
  onClose,
  locations,
  activeLocationId,
  activePlotId,
  onNavigateToLocation,
  onTaskCreated,
}) => {
  const { t, lang, user } = useAppUI();

  const isSupervisor = !!user && ['admin', 'system_admin', 'ac_land'].includes(user.role);
  const isAuthenticated = !!user;

  const [activeTab, setActiveTab] = useState<'my_tasks' | 'assign' | 'all_tasks'>('my_tasks');
  const [myTasks, setMyTasks] = useState<MapTaskAssignment[]>([]);
  const [allTasks, setAllTasks] = useState<MapTaskAssignment[]>([]);
  const [officers, setOfficers] = useState<OfficerUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Status Filter
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Form State for Admin Task Creation
  const [formTitle, setFormTitle] = useState('');
  const [formTaskType, setFormTaskType] = useState<TaskType>('MOUZA_SURVEY');
  const [formLocationId, setFormLocationId] = useState<number>(activeLocationId || (locations[0]?.id || 0));
  const [formPlotId, setFormPlotId] = useState<number | undefined>(activePlotId || undefined);
  const [formAssignedTo, setFormAssignedTo] = useState<number>(0);
  const [formPriority, setFormPriority] = useState<TaskPriority>('NORMAL');
  const [formDueDate, setFormDueDate] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [availablePlots, setAvailablePlots] = useState<MapPlot[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Status update modal / inline prompt state
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);
  const [completionNote, setCompletionNote] = useState<string>('');

  // Load My Tasks
  const loadMyTasks = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    try {
      const data = await mapAssignmentsApi.myAssignments();
      setMyTasks(data);
    } catch (e: any) {
      console.error('Failed to load my assignments', e);
      setMyTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Load All Tasks (Supervisor view)
  const loadAllTasks = async () => {
    if (!isSupervisor) return;
    try {
      const data = await mapAssignmentsApi.list();
      setAllTasks(data);
    } catch (e: any) {
      console.error('Failed to load all assignments', e);
    }
  };

  // Load Officers List for Task Assignment dropdown
  const loadOfficers = async () => {
    if (!isSupervisor) return;
    try {
      const res = await api.get('/admin/users');
      const users: OfficerUser[] = res.data?.items || res.data || [];
      const officerRoles = [
        'settlement_records_officer',
        'field_verification_officer',
        'land_office_assistant',
        'settlement_checker',
        'ac_land',
        'admin',
        'system_admin',
      ];
      const valid = users.filter((u) => officerRoles.includes(u.role) && u.is_active !== 0);
      setOfficers(valid.length > 0 ? valid : users);
      if (valid.length > 0 && !formAssignedTo) {
        setFormAssignedTo(valid[0].id);
      }
    } catch (e: any) {
      const fallbackOfficers: OfficerUser[] = [
        { id: 10, username: 'sro_dhaka', full_name_bn: 'মো. দেলোয়ার হোসেন (সেটেলমেন্ট রেকর্ডস অফিসার)', role: 'settlement_records_officer', is_active: 1 },
        { id: 9, username: 'fvo_savar', full_name_bn: 'মো. জাহাঙ্গীর আলম (ফিল্ড ভেরিফিকেশন অফিসার)', role: 'field_verification_officer', is_active: 1 },
        { id: 8, username: 'loa_savar', full_name_bn: 'সালমা আক্তার (ভূমি অফিস সহকারী)', role: 'land_office_assistant', is_active: 1 },
        { id: 11, username: 'aso_dhaka', full_name_bn: 'নাজনীন সুলতানা (সহকারী সেটেলমেন্ট অফিসার)', role: 'settlement_checker', is_active: 1 },
      ];
      setOfficers(fallbackOfficers);
      if (!formAssignedTo) setFormAssignedTo(fallbackOfficers[0].id);
    }
  };

  // Load plots for selected mouza in assignment form
  useEffect(() => {
    if (!formLocationId) {
      setAvailablePlots([]);
      return;
    }
    mapApi
      .workspace(formLocationId, '', 1)
      .then((ws) => {
        setAvailablePlots(ws.plots || []);
      })
      .catch(() => setAvailablePlots([]));
  }, [formLocationId]);

  // Initial Load on drawer open
  useEffect(() => {
    if (isOpen) {
      loadMyTasks();
      if (isSupervisor) {
        loadAllTasks();
        loadOfficers();
      }
      if (activeLocationId) {
        setFormLocationId(activeLocationId);
      }
      if (activePlotId) {
        setFormPlotId(activePlotId);
      }
    }
  }, [isOpen]);

  // Handle task status change
  const handleUpdateStatus = async (taskId: number, newStatus: TaskStatus, note?: string) => {
    try {
      const updated = await mapAssignmentsApi.updateStatus(taskId, {
        status: newStatus,
        completion_note: note,
      });
      setToast(t('কাজের অবস্থা সফলভাবে হালনাগাদ করা হয়েছে!', 'Task status updated successfully!'));
      setUpdatingTaskId(null);
      setCompletionNote('');
      loadMyTasks();
      if (isSupervisor) loadAllTasks();
      setTimeout(() => setToast(''), 4000);
    } catch (e: any) {
      setError(e?.response?.data?.error || t('অবস্থা হালনাগাদ করা সম্ভব হয়নি।', 'Failed to update task status.'));
    }
  };

  // Handle Task Creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setError(t('কাজের শিরোনাম আবশ্যক।', 'Task title is required.'));
      return;
    }
    if (!formLocationId) {
      setError(t('নির্দিষ্ট মৌজা নির্বাচন করুন।', 'Target location is required.'));
      return;
    }
    if (!formAssignedTo) {
      setError(t('কর্মকর্তা নির্বাচন আবশ্যক।', 'Please assign to an officer.'));
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const created = await mapAssignmentsApi.create({
        location_id: formLocationId,
        plot_id: formPlotId,
        assigned_to_user_id: formAssignedTo,
        task_type: formTaskType,
        priority: formPriority,
        title: formTitle.trim(),
        notes: formNotes.trim() || undefined,
        due_date: formDueDate || undefined,
      });

      setToast(t(`কাজ বরাদ্দ সম্পন্ন! কোড: ${created.task_code}`, `Task assigned successfully! Code: ${created.task_code}`));
      setFormTitle('');
      setFormNotes('');
      setFormDueDate('');
      setSubmitting(false);

      if (onTaskCreated) onTaskCreated(created);

      loadAllTasks();
      loadMyTasks();
      setActiveTab('all_tasks');
      setTimeout(() => setToast(''), 4000);
    } catch (e: any) {
      setError(e?.response?.data?.error || t('কাজ বরাদ্দ করতে ব্যর্থ হয়েছে।', 'Failed to create task assignment.'));
      setSubmitting(false);
    }
  };

  const filteredMyTasks = useMemo(() => {
    return myTasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (typeFilter !== 'all' && t.task_type !== typeFilter) return false;
      return true;
    });
  }, [myTasks, statusFilter, typeFilter]);

  const filteredAllTasks = useMemo(() => {
    return allTasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (typeFilter !== 'all' && t.task_type !== typeFilter) return false;
      return true;
    });
  }, [allTasks, statusFilter, typeFilter]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="sm:max-w-2xl w-full flex flex-col p-6 overflow-hidden bg-white shadow-2xl border-l border-slate-200"
      >
        {/* Drawer Header */}
        <SheetHeader className="pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#006A4E] shrink-0 shadow-xs">
              <CheckSquare className="w-5 h-5 text-[#006A4E]" />
            </div>
            <div>
              <SheetTitle className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                {t('মৌজা সার্ভে ও ম্যাপিং কাজ বরাদ্দ', 'Mouja Survey & Task Management')}
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500 font-sans mt-0.5">
                {t(
                  'মাঠ পর্যায়ের সীমানা জরিপ, প্লট অঙ্কন ও যাচাইকরণ কর্মপরিকল্পনা',
                  'Field boundary survey, plot vectorization & verification workflow'
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Tab Navigation with shadcn Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as any)}
          className="flex-1 flex flex-col overflow-hidden mt-3"
        >
          <TabsList className="bg-slate-100 p-1 rounded-xl h-auto shrink-0 w-full justify-start">
            <TabsTrigger
              value="my_tasks"
              className="text-xs font-bold px-3 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#006A4E] data-[state=active]:shadow-xs min-h-[38px] flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4 text-[#006A4E]" />
              <span>{t('আমার দায়িত্ব', 'My Tasks')}</span>
              {myTasks.length > 0 && (
                <Badge variant="safe" className="text-[10px] px-1.5 py-0 font-bold ml-1">
                  {myTasks.length}
                </Badge>
              )}
            </TabsTrigger>

            {isSupervisor && (
              <TabsTrigger
                value="assign"
                className="text-xs font-bold px-3 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#006A4E] data-[state=active]:shadow-xs min-h-[38px] flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span>{t('নতুন কাজ বরাদ্দ', 'Assign Task')}</span>
              </TabsTrigger>
            )}

            {isSupervisor && (
              <TabsTrigger
                value="all_tasks"
                className="text-xs font-bold px-3 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#006A4E] data-[state=active]:shadow-xs min-h-[38px] flex items-center gap-1.5"
              >
                <ListOrdered className="w-4 h-4 text-slate-600" />
                <span>{t('সকল বরাদ্দ', 'All Tasks')}</span>
                {allTasks.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold ml-1">
                    {allTasks.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Feedback Messages */}
          {error && (
            <Alert variant="destructive" className="mt-2 shrink-0 py-2">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-xs flex items-center justify-between w-full">
                <span>{error}</span>
                <button onClick={() => setError('')} className="cursor-pointer ml-2">
                  <X className="w-3.5 h-3.5" />
                </button>
              </AlertDescription>
            </Alert>
          )}
          {toast && (
            <Alert variant="success" className="mt-2 shrink-0 py-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <AlertDescription className="text-xs flex items-center justify-between w-full text-emerald-900">
                <span>{toast}</span>
                <button onClick={() => setToast('')} className="cursor-pointer ml-2">
                  <X className="w-3.5 h-3.5" />
                </button>
              </AlertDescription>
            </Alert>
          )}

          {/* TAB 1: MY TASKS QUEUE */}
          <TabsContent value="my_tasks" className="flex-1 overflow-y-auto space-y-3 pr-1 pt-3">
            {/* Filter controls */}
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="flex items-center gap-1 font-bold text-slate-600">
                  <Filter className="w-3.5 h-3.5 text-[#006A4E]" />
                  <span>{t('ফিল্টার:', 'Filter:')}</span>
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter status"
                  className="text-xs font-medium px-2 py-1 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="all">{t('সকল অবস্থা', 'All Statuses')}</option>
                  <option value="pending">{t('অপেক্ষমাণ (Pending)', 'Pending')}</option>
                  <option value="in_progress">{t('চলমান (In Progress)', 'In Progress')}</option>
                  <option value="completed">{t('সম্পন্ন (Completed)', 'Completed')}</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  aria-label="Filter type"
                  className="text-xs font-medium px-2 py-1 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="all">{t('সকল ধরন', 'All Types')}</option>
                  <option value="MOUZA_SURVEY">{t('মৌজা জরিপ', 'Mouza Survey')}</option>
                  <option value="PLOT_DRAWING">{t('প্লট অঙ্কন', 'Plot Drawing')}</option>
                  <option value="BOUNDARY_VERIFICATION">{t('সীমানা যাচাই', 'Boundary Verification')}</option>
                </select>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadMyTasks}
                disabled={loading}
                title={t('তাজা করুন', 'Refresh')}
                className="h-8 w-8 p-0 rounded-lg shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#006A4E]' : ''}`} />
              </Button>
            </div>

            {/* Tasks List */}
            {loading && filteredMyTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#006A4E]" />
                <p>{t('দায়িত্ব লোড হচ্ছে…', 'Loading tasks…')}</p>
              </div>
            ) : filteredMyTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6 space-y-2">
                <CheckSquare className="w-10 h-10 text-emerald-500/60 mx-auto" />
                <h3 className="font-bold text-sm text-slate-800">{t('কোনো সক্রিয় কাজ নেই', 'No Active Tasks Assigned')}</h3>
                <p className="max-w-xs mx-auto text-slate-400">
                  {t(
                    'আপনার অ্যাকাউন্টে বর্তমানে কোনো ম্যাপিং বা জরিপ কাজ বরাদ্দ নেই। নতুন বরাদ্দ হলে এখানে দৃশ্যমান হবে।',
                    'You have no assigned mapping tasks matching the filter. New assignments will appear here.'
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMyTasks.map((task) => {
                  const typeCfg = TASK_TYPES_CONFIG[task.task_type] || TASK_TYPES_CONFIG.MOUZA_SURVEY;
                  const prioCfg = TASK_PRIORITIES_CONFIG[task.priority] || TASK_PRIORITIES_CONFIG.NORMAL;
                  const statCfg = TASK_STATUS_CONFIG[task.status] || TASK_STATUS_CONFIG.pending;

                  const hasCoords =
                    task.location?.latitude !== null &&
                    task.location?.latitude !== undefined &&
                    task.location?.longitude !== null &&
                    task.location?.longitude !== undefined;

                  return (
                    <div
                      key={task.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#006A4E]/30 hover:shadow-sm transition-all space-y-2.5"
                    >
                      {/* Card Top: Code & Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                            {task.task_code}
                          </span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ color: typeCfg.color, backgroundColor: typeCfg.bg }}
                          >
                            {lang === 'bn' ? typeCfg.labelBn : typeCfg.labelEn}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ color: prioCfg.color, backgroundColor: prioCfg.bg }}
                          >
                            {lang === 'bn' ? prioCfg.labelBn : prioCfg.labelEn}
                          </span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ color: statCfg.color, backgroundColor: statCfg.bg }}
                          >
                            {lang === 'bn' ? statCfg.labelBn : statCfg.labelEn}
                          </span>
                        </div>
                      </div>

                      {/* Title & Notes */}
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{task.title}</h4>
                        {task.notes && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{task.notes}</p>}
                      </div>

                      {/* Location & Plot Info */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#006A4E]" />
                          <span>
                            {task.location
                              ? `${task.location.mouza_bn}, ${task.location.upazila_bn}`
                              : `Location #${task.location_id}`}
                          </span>
                        </div>

                        {task.plot && (
                          <div className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-amber-600" />
                            <span>
                              {t('দাগ নং', 'Dag')} {lang === 'bn' ? task.plot.dag_no_bn || task.plot.dag_no : task.plot.dag_no}
                              {task.plot.total_area_decimal
                                ? ` · ${task.plot.total_area_decimal} ${t('শতক', 'dec')}`
                                : ''}
                            </span>
                          </div>
                        )}

                        {task.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t('মেয়াদ:', 'Due:')} {task.due_date}</span>
                          </div>
                        )}
                      </div>

                      {/* Completion Details if completed */}
                      {task.status === 'completed' && task.completion_note && (
                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span><strong>{t('সম্পন্ন নোট:', 'Note:')}</strong> {task.completion_note}</span>
                        </div>
                      )}

                      {/* Inline Status Updating Form */}
                      {updatingTaskId === task.id && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                          <Label className="text-xs font-bold text-slate-800">
                            {t('কাজের সমাপ্তি প্রতিবেদন / নোট', 'Completion Report / Notes')}
                          </Label>
                          <Textarea
                            rows={2}
                            value={completionNote}
                            onChange={(e) => setCompletionNote(e.target.value)}
                            placeholder={t('জরিপ বা অঙ্কনের বিবরণ ও ফলাফল লিখুন…', 'Enter survey or drawing observations…')}
                            className="text-xs bg-white"
                          />
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setUpdatingTaskId(null);
                                setCompletionNote('');
                              }}
                              className="text-xs h-8"
                            >
                              {t('বাতিল', 'Cancel')}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleUpdateStatus(task.id, 'completed', completionNote)}
                              className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{t('চূড়ান্ত সম্পন্ন নিশ্চিত করুন', 'Confirm Complete')}</span>
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Card Action Footer */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        {hasCoords && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              onNavigateToLocation(
                                task.location!.latitude!,
                                task.location!.longitude!,
                                task.location_id,
                                task.plot_id
                              );
                              onClose();
                            }}
                            className="text-xs h-8 rounded-lg flex items-center gap-1 text-[#006A4E] hover:text-[#00553e]"
                          >
                            <Compass className="w-3.5 h-3.5" />
                            <span>{t('মানচিত্রে যান', 'Go to Map')}</span>
                          </Button>
                        )}

                        {task.status === 'pending' && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleUpdateStatus(task.id, 'in_progress')}
                            className="text-xs h-8 rounded-lg bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>{t('কাজ শুরু করুন', 'Start Task')}</span>
                          </Button>
                        )}

                        {task.status === 'in_progress' && updatingTaskId !== task.id && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setUpdatingTaskId(task.id);
                              setCompletionNote('');
                            }}
                            className="text-xs h-8 rounded-lg bg-[#006A4E] hover:bg-emerald-800 text-white flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t('কাজ সম্পন্ন করুন', 'Mark Complete')}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: ADMIN TASK ASSIGNMENT FORM */}
          {isSupervisor && (
            <TabsContent value="assign" className="flex-1 overflow-y-auto space-y-4 pr-1 pt-3">
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                  <h3 className="font-bold text-xs text-[#074f38]">{t('নতুন ম্যাপিং বা জরিপ কাজ তৈরি', 'Create Mapping Assignment')}</h3>
                  <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                    {t(
                      'সহকারী কমিশনার (ভূমি) বা অ্যাডমিন হিসেবে মাঠ পর্যায়ের জরিপকারী কর্মকর্তাকে নির্দিষ্ট মৌজা ও প্লট বরাদ্দ দিন।',
                      'As administrator or AC Land, assign specific mouzas, boundary surveys, or plot drawing tasks to designated field officers.'
                    )}
                  </p>
                </div>

                {/* Title Input */}
                <div className="space-y-1.5">
                  <Label htmlFor="task-title" className="text-xs font-bold text-slate-700">
                    {t('কাজের শিরোনাম (Title) *', 'Task Title *')}
                  </Label>
                  <Input
                    id="task-title"
                    type="text"
                    required
                    placeholder={t('উদা: বিরুলিয়া মৌজার দাগ ১০৫-১০৮ সীমানা ড্রয়িং', 'e.g., Boundary drawing for plots 105-108 in Birulia')}
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                {/* Task Type & Priority Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="task-type" className="text-xs font-bold text-slate-700">{t('কাজের ধরন (Task Type) *', 'Task Type *')}</Label>
                    <select
                      id="task-type"
                      value={formTaskType}
                      onChange={(e) => setFormTaskType(e.target.value as TaskType)}
                      className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 bg-white h-9"
                    >
                      <option value="MOUZA_SURVEY">{t('মৌজা জরিপ (MOUZA_SURVEY)', 'Mouza Survey')}</option>
                      <option value="PLOT_DRAWING">{t('প্লট অঙ্কন (PLOT_DRAWING)', 'Plot Drawing')}</option>
                      <option value="BOUNDARY_VERIFICATION">{t('সীমানা যাচাই (BOUNDARY_VERIFICATION)', 'Boundary Verification')}</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="task-priority" className="text-xs font-bold text-slate-700">{t('অগ্রাধিকার (Priority)', 'Priority')}</Label>
                    <select
                      id="task-priority"
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as TaskPriority)}
                      className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 bg-white h-9"
                    >
                      <option value="NORMAL">{t('সাধারণ (Normal)', 'Normal')}</option>
                      <option value="HIGH">{t('জরুরি (High)', 'High')}</option>
                      <option value="URGENT">{t('সর্বোচ্চ অগ্রাধিকার (Urgent)', 'Urgent')}</option>
                      <option value="LOW">{t('নিম্ন (Low)', 'Low')}</option>
                    </select>
                  </div>
                </div>

                {/* Location & Plot Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="task-location" className="text-xs font-bold text-slate-700">{t('টার্গেট মৌজা (Target Mouza) *', 'Target Mouza *')}</Label>
                    <select
                      id="task-location"
                      value={formLocationId}
                      onChange={(e) => {
                        setFormLocationId(Number(e.target.value));
                        setFormPlotId(undefined);
                      }}
                      className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 bg-white h-9"
                    >
                      <option value={0}>{t('মৌজা নির্বাচন করুন', 'Select Mouza')}</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.mouza_bn || loc.mouza_en} · JL {loc.jl_no} ({loc.upazila_bn})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="task-plot" className="text-xs font-bold text-slate-700">{t('টার্গেট প্লট / দাগ (ঐচ্ছিক)', 'Target Plot / Dag (Optional)')}</Label>
                    <select
                      id="task-plot"
                      value={formPlotId || ''}
                      onChange={(e) => setFormPlotId(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 bg-white h-9"
                    >
                      <option value="">{t('সমগ্র মৌজা / কোনো নির্দিষ্ট প্লট নেই', 'Entire Mouza / No specific plot')}</option>
                      {availablePlots.map((p) => (
                        <option key={p.id} value={p.id}>
                          {t('দাগ নং', 'Dag')} {p.dag_no_bn || p.dag_no} · {p.total_area_decimal} {t('শতক', 'dec')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Assignee Officer & Due Date Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="task-assignee" className="text-xs font-bold text-slate-700">{t('বরাদ্দকৃত কর্মকর্তা (Assignee) *', 'Assigned Officer *')}</Label>
                    <select
                      id="task-assignee"
                      required
                      value={formAssignedTo}
                      onChange={(e) => setFormAssignedTo(Number(e.target.value))}
                      className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 bg-white h-9"
                    >
                      <option value={0}>{t('কর্মকর্তা বাছুন…', 'Choose Officer…')}</option>
                      {officers.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.full_name_bn} ({o.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="task-due-date" className="text-xs font-bold text-slate-700">{t('সম্পন্নের শেষ তারিখ (Due Date)', 'Due Date')}</Label>
                    <Input
                      id="task-due-date"
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="text-xs h-9 bg-white"
                    />
                  </div>
                </div>

                {/* Instructions / Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="task-notes" className="text-xs font-bold text-slate-700">{t('বিশেষ নির্দেশনা ও নোট (Instructions / Notes)', 'Special Instructions / Notes')}</Label>
                  <Textarea
                    id="task-notes"
                    rows={3}
                    placeholder={t(
                      'সীমানা পরিমাপকালে পার্শ্ববর্তী দাগের জিপিএস কো-অর্ডিনেট ক্রস-চেক করুন…',
                      'Cross-check adjoining parcel GPS coordinates during boundary verification…'
                    )}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>

                {/* Form Submission Button */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('my_tasks')}
                    className="text-xs font-bold h-9"
                  >
                    {t('ফিরে যান', 'Back')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-[#006A4E] hover:bg-emerald-800 text-white text-xs font-bold h-9 flex items-center gap-1.5 shadow-md"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{t('বরাদ্দ করা হচ্ছে…', 'Assigning…')}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>{t('দায়িত্ব বরাদ্দ নিশ্চিত করুন', 'Confirm Assignment')}</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
          )}

          {/* TAB 3: SUPERVISORY VIEW — ALL ASSIGNMENTS */}
          {isSupervisor && (
            <TabsContent value="all_tasks" className="flex-1 overflow-y-auto space-y-3 pr-1 pt-3">
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 font-bold text-slate-600">
                    <Filter className="w-3.5 h-3.5 text-[#006A4E]" />
                    <span>{t('অবস্থা:', 'Status:')}</span>
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Filter status"
                    className="text-xs font-medium px-2 py-1 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="all">{t('সকল অবস্থা', 'All Statuses')}</option>
                    <option value="pending">{t('অপেক্ষমাণ (Pending)', 'Pending')}</option>
                    <option value="in_progress">{t('চলমান (In Progress)', 'In Progress')}</option>
                    <option value="completed">{t('সম্পন্ন (Completed)', 'Completed')}</option>
                  </select>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadAllTasks}
                  title={t('তাজা করুন', 'Refresh')}
                  className="h-8 w-8 p-0 rounded-lg shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-auto max-h-[380px] scrollbar-thin">
                <Table>
                  <TableHeader className="bg-slate-100">
                    <TableRow>
                      <TableHead className="font-bold text-xs">{t('কোড', 'Code')}</TableHead>
                      <TableHead className="font-bold text-xs">{t('শিরোনাম', 'Title')}</TableHead>
                      <TableHead className="font-bold text-xs">{t('মৌজা ও দাগ', 'Location & Plot')}</TableHead>
                      <TableHead className="font-bold text-xs">{t('বরাদ্দ কর্মকর্তা', 'Assignee')}</TableHead>
                      <TableHead className="font-bold text-xs">{t('অগ্রাধিকার', 'Priority')}</TableHead>
                      <TableHead className="font-bold text-xs">{t('অবস্থা', 'Status')}</TableHead>
                      <TableHead className="font-bold text-xs text-right">{t('অ্যাকশন', 'Action')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAllTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-xs text-slate-400">
                          {t('কোনো কাজ রেকর্ড পাওয়া যায়নি।', 'No task assignments found.')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAllTasks.map((task) => {
                        const prioCfg = TASK_PRIORITIES_CONFIG[task.priority] || TASK_PRIORITIES_CONFIG.NORMAL;
                        const statCfg = TASK_STATUS_CONFIG[task.status] || TASK_STATUS_CONFIG.pending;
                        const hasCoords =
                          task.location?.latitude !== null &&
                          task.location?.latitude !== undefined &&
                          task.location?.longitude !== null &&
                          task.location?.longitude !== undefined;

                        return (
                          <TableRow key={task.id} className="hover:bg-slate-50/80 transition">
                            <TableCell className="font-mono font-bold text-xs text-slate-800">
                              {task.task_code}
                            </TableCell>
                            <TableCell className="text-xs">
                              <span className="font-bold text-slate-900 block">{task.title}</span>
                              {task.due_date && <span className="text-[10px] text-slate-500">Due: {task.due_date}</span>}
                            </TableCell>
                            <TableCell className="text-xs">
                              <div>{task.location?.mouza_bn || `#${task.location_id}`}</div>
                              {task.plot && (
                                <span className="text-[10px] text-emerald-700 font-medium">
                                  {t('দাগ নং', 'Dag')} {task.plot.dag_no_bn || task.plot.dag_no}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-slate-700">
                              {task.assigned_to?.full_name_bn || task.assigned_to?.username || `#${task.assigned_to_user_id}`}
                            </TableCell>
                            <TableCell>
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block"
                                style={{ color: prioCfg.color, backgroundColor: prioCfg.bg }}
                              >
                                {lang === 'bn' ? prioCfg.labelBn : prioCfg.labelEn}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block"
                                style={{ color: statCfg.color, backgroundColor: statCfg.bg }}
                              >
                                {lang === 'bn' ? statCfg.labelBn : statCfg.labelEn}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {hasCoords && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    onNavigateToLocation(
                                      task.location!.latitude!,
                                      task.location!.longitude!,
                                      task.location_id,
                                      task.plot_id
                                    );
                                    onClose();
                                  }}
                                  title={t('মানচিত্রে দেখুন', 'View on map')}
                                  className="h-8 w-8 p-0 text-[#006A4E] hover:text-[#00553e]"
                                >
                                  <Compass className="w-4 h-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
