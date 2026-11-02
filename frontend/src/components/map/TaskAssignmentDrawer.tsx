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
  const [statusToUpdate, setStatusToUpdate] = useState<TaskStatus>('in_progress');

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
      // Fallback for non-officers or auth issue
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
      // Fallback default officers
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
    mapApi.workspace(formLocationId, '', 1)
      .then((res) => {
        setAvailablePlots(res.plots || []);
      })
      .catch(() => setAvailablePlots([]));
  }, [formLocationId]);

  useEffect(() => {
    if (activeLocationId) setFormLocationId(activeLocationId);
    if (activePlotId) setFormPlotId(activePlotId);
  }, [activeLocationId, activePlotId]);

  useEffect(() => {
    if (isOpen) {
      loadMyTasks();
      if (isSupervisor) {
        loadAllTasks();
        loadOfficers();
      }
    }
  }, [isOpen, isSupervisor]);

  // Handle Create Task Submission
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setError(t('কাজের শিরোনাম আবশ্যক।', 'Task title is required.'));
      return;
    }
    if (!formLocationId) {
      setError(t('মৌজা নির্বাচন আবশ্যক।', 'Location is required.'));
      return;
    }
    if (!formAssignedTo) {
      setError(t('কর্মকর্তা বরাদ্দ আবশ্যক।', 'Assigned officer is required.'));
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const created = await mapAssignmentsApi.create({
        title: formTitle.trim(),
        task_type: formTaskType,
        location_id: formLocationId,
        plot_id: formPlotId || null,
        assigned_to_user_id: formAssignedTo,
        priority: formPriority,
        due_date: formDueDate || null,
        notes: formNotes.trim() || null,
      });

      setToast(t(`কাজ (${created.task_code}) সফলভাবে বরাদ্দ করা হয়েছে।`, `Task (${created.task_code}) assigned successfully.`));
      setFormTitle('');
      setFormNotes('');
      onTaskCreated?.(created);
      loadAllTasks();
      loadMyTasks();
      setActiveTab('all_tasks');
    } catch (err: any) {
      const msg = err.response?.data?.message_bn || err.response?.data?.message_en || err.message;
      setError(msg || t('কাজ বরাদ্দ করতে সমস্যা হয়েছে।', 'Failed to assign task.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Update Status
  const handleUpdateStatus = async (taskId: number, newStatus: TaskStatus, note?: string) => {
    setLoading(true);
    setError('');
    try {
      const updated = await mapAssignmentsApi.updateStatus(taskId, {
        status: newStatus,
        completion_note: note,
      });
      setToast(
        t(
          `কাজের স্ট্যাটাস পরিবর্তিত হয়েছে: ${TASK_STATUS_CONFIG[updated.status]?.labelBn}`,
          `Task status updated to: ${TASK_STATUS_CONFIG[updated.status]?.labelEn}`
        )
      );
      setUpdatingTaskId(null);
      setCompletionNote('');
      loadMyTasks();
      if (isSupervisor) loadAllTasks();
    } catch (err: any) {
      const msg = err.response?.data?.message_bn || err.response?.data?.message_en || err.message;
      setError(msg || t('স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।', 'Failed to update status.'));
    } finally {
      setLoading(false);
    }
  };

  // Filtered Task Lists
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

  if (!isOpen) return null;

  return (
    <div className="task-assignment-overlay" onClick={onClose}>
      <div
        className="task-assignment-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-drawer-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="task-drawer-header">
          <div className="task-drawer-title-group">
            <CheckSquare className="task-header-icon" size={22} />
            <div>
              <h2 id="task-drawer-title">
                {t('মৌজা সার্ভে ও ম্যাপিং কাজ বরাদ্দ', 'Mouja Survey & Task Management')}
              </h2>
              <p className="task-drawer-subtitle">
                {t(
                  'মাঠ পর্যায়ের সীমানা জরিপ, প্লট অঙ্কন ও যাচাইকরণ কর্মপরিকল্পনা',
                  'Field boundary survey, plot vectorization & verification workflow'
                )}
              </p>
            </div>
          </div>
          <button className="task-close-btn" onClick={onClose} aria-label={t('বন্ধ করুন', 'Close')}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="task-tabs-bar">
          <button
            className={`task-tab-btn ${activeTab === 'my_tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('my_tasks')}
          >
            <UserCheck size={16} />
            <span>{t('আমার দায়িত্ব', 'My Tasks')}</span>
            {myTasks.length > 0 && <span className="task-count-badge">{myTasks.length}</span>}
          </button>

          {isSupervisor && (
            <button
              className={`task-tab-btn ${activeTab === 'assign' ? 'active' : ''}`}
              onClick={() => setActiveTab('assign')}
            >
              <PlusCircle size={16} />
              <span>{t('নতুন কাজ বরাদ্দ', 'Assign Task')}</span>
            </button>
          )}

          {isSupervisor && (
            <button
              className={`task-tab-btn ${activeTab === 'all_tasks' ? 'active' : ''}`}
              onClick={() => setActiveTab('all_tasks')}
            >
              <ListOrdered size={16} />
              <span>{t('সকল বরাদ্দ', 'All Tasks')}</span>
              {allTasks.length > 0 && <span className="task-count-badge subtle">{allTasks.length}</span>}
            </button>
          )}
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="task-alert error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button onClick={() => setError('')}><X size={14} /></button>
          </div>
        )}
        {toast && (
          <div className="task-alert success" role="status">
            <CheckCircle2 size={16} />
            <span>{toast}</span>
            <button onClick={() => setToast('')}><X size={14} /></button>
          </div>
        )}

        {/* Drawer Body Content */}
        <div className="task-drawer-body">
          {/* TAB 1: MY TASKS QUEUE */}
          {activeTab === 'my_tasks' && (
            <div className="task-queue-container">
              {/* Filter controls */}
              <div className="task-filter-row">
                <div className="task-filter-group">
                  <Filter size={14} />
                  <span>{t('ফিল্টার:', 'Filter:')}</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Filter status"
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
                  >
                    <option value="all">{t('সকল ধরন', 'All Types')}</option>
                    <option value="MOUZA_SURVEY">{t('মৌজা জরিপ', 'Mouza Survey')}</option>
                    <option value="PLOT_DRAWING">{t('প্লট অঙ্কন', 'Plot Drawing')}</option>
                    <option value="BOUNDARY_VERIFICATION">{t('সীমানা যাচাই', 'Boundary Verification')}</option>
                  </select>
                </div>

                <button
                  className="task-refresh-btn"
                  onClick={loadMyTasks}
                  disabled={loading}
                  title={t('তাজা করুন', 'Refresh')}
                >
                  <RefreshCw size={14} className={loading ? 'spin' : ''} />
                </button>
              </div>

              {/* Tasks List */}
              {loading && filteredMyTasks.length === 0 ? (
                <div className="task-empty-state">
                  <div className="task-spinner" />
                  <p>{t('দায়িত্ব লোড হচ্ছে…', 'Loading tasks…')}</p>
                </div>
              ) : filteredMyTasks.length === 0 ? (
                <div className="task-empty-state">
                  <CheckSquare size={36} className="text-emerald-500 opacity-60" />
                  <h3>{t('কোনো সক্রিয় কাজ নেই', 'No Active Tasks Assigned')}</h3>
                  <p>
                    {t(
                      'আপনার অ্যাকাউন্টে বর্তমানে কোনো ম্যাপিং বা জরিপ কাজ বরাদ্দ নেই। নতুন বরাদ্দ হলে এখানে দৃশ্যমান হবে।',
                      'You have no assigned mapping tasks matching the filter. New assignments will appear here.'
                    )}
                  </p>
                </div>
              ) : (
                <div className="task-card-list">
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
                        className={`task-item-card status-${task.status}`}
                      >
                        {/* Card Top: Code & Badges */}
                        <div className="task-card-header">
                          <div className="task-code-pill">
                            <span className="task-code">{task.task_code}</span>
                            <span
                              className="task-badge"
                              style={{ color: typeCfg.color, backgroundColor: typeCfg.bg }}
                            >
                              {lang === 'bn' ? typeCfg.labelBn : typeCfg.labelEn}
                            </span>
                          </div>

                          <div className="task-header-right-badges">
                            <span
                              className="task-badge"
                              style={{ color: prioCfg.color, backgroundColor: prioCfg.bg }}
                            >
                              {lang === 'bn' ? prioCfg.labelBn : prioCfg.labelEn}
                            </span>
                            <span
                              className="task-badge status-badge"
                              style={{ color: statCfg.color, backgroundColor: statCfg.bg }}
                            >
                              {lang === 'bn' ? statCfg.labelBn : statCfg.labelEn}
                            </span>
                          </div>
                        </div>

                        {/* Title & Notes */}
                        <h4 className="task-card-title">{task.title}</h4>
                        {task.notes && <p className="task-card-notes">{task.notes}</p>}

                        {/* Location & Plot Info */}
                        <div className="task-location-meta">
                          <div className="task-meta-item">
                            <MapPin size={14} className="text-emerald-600" />
                            <span>
                              {task.location
                                ? `${task.location.mouza_bn}, ${task.location.upazila_bn}, ${task.location.district_bn}`
                                : `Location #${task.location_id}`}
                            </span>
                          </div>

                          {task.plot && (
                            <div className="task-meta-item">
                              <FileText size={14} className="text-amber-600" />
                              <span>
                                {t('দাগ নং', 'Dag')} {lang === 'bn' ? task.plot.dag_no_bn || task.plot.dag_no : task.plot.dag_no}
                                {task.plot.total_area_decimal
                                  ? ` · ${task.plot.total_area_decimal} ${t('শতক', 'dec')}`
                                  : ''}
                              </span>
                            </div>
                          )}

                          {task.due_date && (
                            <div className="task-meta-item">
                              <Calendar size={14} className="text-slate-500" />
                              <span>{t('মেয়াদ:', 'Due:')} {task.due_date}</span>
                            </div>
                          )}
                        </div>

                        {/* Completion Details if completed */}
                        {task.status === 'completed' && task.completion_note && (
                          <div className="task-completion-banner">
                            <CheckCircle2 size={14} className="text-emerald-600" />
                            <span><strong>{t('সম্পন্ন নোট:', 'Note:')}</strong> {task.completion_note}</span>
                          </div>
                        )}

                        {/* Inline Status Updating Form */}
                        {updatingTaskId === task.id && (
                          <div className="task-inline-update-box">
                            <h5>{t('কাজের সমাপ্তি প্রতিবেদন / নোট', 'Completion Report / Notes')}</h5>
                            <textarea
                              rows={2}
                              value={completionNote}
                              onChange={(e) => setCompletionNote(e.target.value)}
                              placeholder={t('জরিপ বা অঙ্কনের বিবরণ ও ফলাফল লিখুন…', 'Enter survey or drawing observations…')}
                            />
                            <div className="task-inline-update-actions">
                              <button
                                className="task-btn-submit-complete"
                                onClick={() => handleUpdateStatus(task.id, 'completed', completionNote)}
                              >
                                <CheckCircle2 size={14} />
                                {t('চূড়ান্ত সম্পন্ন নিশ্চিত করুন', 'Confirm Complete')}
                              </button>
                              <button
                                className="task-btn-cancel"
                                onClick={() => {
                                  setUpdatingTaskId(null);
                                  setCompletionNote('');
                                }}
                              >
                                {t('বাতিল', 'Cancel')}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Card Action Footer */}
                        <div className="task-card-actions">
                          {/* Direct Map Navigation Button */}
                          {hasCoords && (
                            <button
                              className="task-btn-navigate"
                              onClick={() => {
                                onNavigateToLocation(
                                  task.location!.latitude!,
                                  task.location!.longitude!,
                                  task.location_id,
                                  task.plot_id
                                );
                                onClose();
                              }}
                              title={t('মানচিত্রে এই অবস্থানে যান', 'Navigate to this location on map')}
                            >
                              <Compass size={15} />
                              <span>{t('মানচিত্রে যান', 'Go to Map')}</span>
                            </button>
                          )}

                          {/* Status Updater Buttons */}
                          {task.status === 'pending' && (
                            <button
                              className="task-btn-status in-progress"
                              onClick={() => handleUpdateStatus(task.id, 'in_progress')}
                            >
                              <Clock size={14} />
                              <span>{t('কাজ শুরু করুন', 'Start Task')}</span>
                            </button>
                          )}

                          {task.status === 'in_progress' && updatingTaskId !== task.id && (
                            <button
                              className="task-btn-status complete"
                              onClick={() => {
                                setUpdatingTaskId(task.id);
                                setCompletionNote('');
                              }}
                            >
                              <CheckCircle2 size={14} />
                              <span>{t('কাজ সম্পন্ন করুন', 'Mark Complete')}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADMIN TASK ASSIGNMENT MODAL / FORM */}
          {activeTab === 'assign' && isSupervisor && (
            <form className="task-assign-form" onSubmit={handleCreateTask}>
              <div className="task-form-section">
                <h3>{t('নতুন ম্যাপিং বা জরিপ কাজ তৈরি', 'Create Mapping Assignment')}</h3>
                <p className="task-form-hint">
                  {t(
                    'সহকারী কমিশনার (ভূমি) বা অ্যাডমিন হিসেবে মাঠ পর্যায়ের জরিপকারী কর্মকর্তাকে নির্দিষ্ট মৌজা ও প্লট বরাদ্দ দিন।',
                    'As administrator or AC Land, assign specific mouzas, boundary surveys, or plot drawing tasks to designated field officers.'
                  )}
                </p>
              </div>

              {/* Title Input */}
              <div className="task-form-group">
                <label htmlFor="task-title">
                  {t('কাজের শিরোনাম (Title) *', 'Task Title *')}
                </label>
                <input
                  id="task-title"
                  type="text"
                  required
                  placeholder={t('উদা: বিরুলিয়া মৌজার দাগ ১০৫-১০৮ সীমানা ড্রয়িং', 'e.g., Boundary drawing for plots 105-108 in Birulia')}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              {/* Task Type & Priority Grid */}
              <div className="task-form-grid-2">
                <div className="task-form-group">
                  <label htmlFor="task-type">{t('কাজের ধরন (Task Type) *', 'Task Type *')}</label>
                  <select
                    id="task-type"
                    value={formTaskType}
                    onChange={(e) => setFormTaskType(e.target.value as TaskType)}
                  >
                    <option value="MOUZA_SURVEY">{t('মৌজা জরিপ (MOUZA_SURVEY)', 'Mouza Survey')}</option>
                    <option value="PLOT_DRAWING">{t('প্লট অঙ্কন (PLOT_DRAWING)', 'Plot Drawing')}</option>
                    <option value="BOUNDARY_VERIFICATION">{t('সীমানা যাচাই (BOUNDARY_VERIFICATION)', 'Boundary Verification')}</option>
                  </select>
                </div>

                <div className="task-form-group">
                  <label htmlFor="task-priority">{t('অগ্রাধিকার (Priority)', 'Priority')}</label>
                  <select
                    id="task-priority"
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as TaskPriority)}
                  >
                    <option value="NORMAL">{t('সাধারণ (Normal)', 'Normal')}</option>
                    <option value="HIGH">{t('জরুরি (High)', 'High')}</option>
                    <option value="URGENT">{t('সর্বোচ্চ অগ্রাধিকার (Urgent)', 'Urgent')}</option>
                    <option value="LOW">{t('নিম্ন (Low)', 'Low')}</option>
                  </select>
                </div>
              </div>

              {/* Location & Plot Grid */}
              <div className="task-form-grid-2">
                <div className="task-form-group">
                  <label htmlFor="task-location">{t('টার্গেট মৌজা (Target Mouza) *', 'Target Mouza *')}</label>
                  <select
                    id="task-location"
                    value={formLocationId}
                    onChange={(e) => {
                      setFormLocationId(Number(e.target.value));
                      setFormPlotId(undefined);
                    }}
                  >
                    <option value={0}>{t('মৌজা নির্বাচন করুন', 'Select Mouza')}</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.mouza_bn || loc.mouza_en} · JL {loc.jl_no} ({loc.upazila_bn})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="task-form-group">
                  <label htmlFor="task-plot">{t('টার্গেট প্লট / দাগ (ঐচ্ছিক)', 'Target Plot / Dag (Optional)')}</label>
                  <select
                    id="task-plot"
                    value={formPlotId || ''}
                    onChange={(e) => setFormPlotId(e.target.value ? Number(e.target.value) : undefined)}
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
              <div className="task-form-grid-2">
                <div className="task-form-group">
                  <label htmlFor="task-assignee">{t('বরাদ্দকৃত কর্মকর্তা (Assignee) *', 'Assigned Officer *')}</label>
                  <select
                    id="task-assignee"
                    required
                    value={formAssignedTo}
                    onChange={(e) => setFormAssignedTo(Number(e.target.value))}
                  >
                    <option value={0}>{t('কর্মকর্তা বাছুন…', 'Choose Officer…')}</option>
                    {officers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.full_name_bn} ({o.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="task-form-group">
                  <label htmlFor="task-due-date">{t('সম্পন্নের শেষ তারিখ (Due Date)', 'Due Date')}</label>
                  <input
                    id="task-due-date"
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Instructions / Notes */}
              <div className="task-form-group">
                <label htmlFor="task-notes">{t('বিশেষ নির্দেশনা ও নোট (Instructions / Notes)', 'Special Instructions / Notes')}</label>
                <textarea
                  id="task-notes"
                  rows={3}
                  placeholder={t(
                    'সীমানা পরিমাপকালে পার্শ্ববর্তী দাগের জিপিএস কো-অর্ডিনেট ক্রস-চেক করুন…',
                    'Cross-check adjoining parcel GPS coordinates during boundary verification…'
                  )}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>

              {/* Form Submission Button */}
              <div className="task-form-submit-row">
                <button
                  type="button"
                  className="task-btn-secondary"
                  onClick={() => setActiveTab('my_tasks')}
                >
                  {t('ফিরে যান', 'Back')}
                </button>
                <button
                  type="submit"
                  className="task-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="task-btn-spinner" />
                      <span>{t('বরাদ্দ করা হচ্ছে…', 'Assigning…')}</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>{t('দায়িত্ব বরাদ্দ নিশ্চিত করুন', 'Confirm Assignment')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: SUPERVISORY VIEW — ALL ASSIGNMENTS */}
          {activeTab === 'all_tasks' && isSupervisor && (
            <div className="task-all-container">
              <div className="task-filter-row">
                <div className="task-filter-group">
                  <Filter size={14} />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Filter status"
                  >
                    <option value="all">{t('সকল অবস্থা', 'All Statuses')}</option>
                    <option value="pending">{t('অপেক্ষমাণ (Pending)', 'Pending')}</option>
                    <option value="in_progress">{t('চলমান (In Progress)', 'In Progress')}</option>
                    <option value="completed">{t('সম্পন্ন (Completed)', 'Completed')}</option>
                  </select>
                </div>

                <button
                  className="task-refresh-btn"
                  onClick={loadAllTasks}
                  title={t('তাজা করুন', 'Refresh')}
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              <div className="task-all-table-wrapper">
                <table className="task-all-table">
                  <thead>
                    <tr>
                      <th>{t('কোড', 'Code')}</th>
                      <th>{t('শিরোনাম', 'Title')}</th>
                      <th>{t('মৌজা ও দাগ', 'Location & Plot')}</th>
                      <th>{t('বরাদ্দ কর্মকর্তা', 'Assignee')}</th>
                      <th>{t('অগ্রাধিকার', 'Priority')}</th>
                      <th>{t('অবস্থা', 'Status')}</th>
                      <th>{t('অ্যাকশন', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAllTasks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="task-table-empty">
                          {t('কোনো কাজ রেকর্ড পাওয়া যায়নি।', 'No task assignments found.')}
                        </td>
                      </tr>
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
                          <tr key={task.id}>
                            <td className="task-code-cell">{task.task_code}</td>
                            <td>
                              <strong>{task.title}</strong>
                              {task.due_date && <small className="block text-slate-500">Due: {task.due_date}</small>}
                            </td>
                            <td>
                              <div>{task.location?.mouza_bn || `#${task.location_id}`}</div>
                              {task.plot && (
                                <small className="text-emerald-700">
                                  {t('দাগ নং', 'Dag')} {task.plot.dag_no_bn || task.plot.dag_no}
                                </small>
                              )}
                            </td>
                            <td>
                              {task.assigned_to?.full_name_bn || task.assigned_to?.username || `#${task.assigned_to_user_id}`}
                            </td>
                            <td>
                              <span
                                className="task-table-badge"
                                style={{ color: prioCfg.color, backgroundColor: prioCfg.bg }}
                              >
                                {lang === 'bn' ? prioCfg.labelBn : prioCfg.labelEn}
                              </span>
                            </td>
                            <td>
                              <span
                                className="task-table-badge"
                                style={{ color: statCfg.color, backgroundColor: statCfg.bg }}
                              >
                                {lang === 'bn' ? statCfg.labelBn : statCfg.labelEn}
                              </span>
                            </td>
                            <td>
                              {hasCoords && (
                                <button
                                  className="task-table-nav-btn"
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
                                >
                                  <Compass size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
