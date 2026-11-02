import { api } from './client';

export type TaskType = 'MOUZA_SURVEY' | 'PLOT_DRAWING' | 'BOUNDARY_VERIFICATION';

export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface TaskLocation {
  id: number;
  mouza_bn: string;
  mouza_en?: string;
  upazila_bn: string;
  upazila_en?: string;
  district_bn: string;
  district_en?: string;
  division_bn: string;
  latitude: number | null;
  longitude: number | null;
}

export interface TaskPlot {
  id: number;
  plot_code: string;
  dag_no: string;
  dag_no_bn?: string;
  total_area_decimal?: number | null;
}

export interface TaskUserRef {
  id: number;
  username: string;
  full_name_bn?: string;
  full_name_en?: string;
  role: string;
  office_bn?: string;
}

export interface MapTaskAssignment {
  id: number;
  task_code: string;
  title: string;
  task_type: TaskType;
  location_id: number;
  plot_id?: number | null;
  assigned_by_user_id: number;
  assigned_to_user_id: number;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string | null;
  notes?: string | null;
  completion_note?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  location?: TaskLocation;
  plot?: TaskPlot;
  assigned_to?: TaskUserRef;
  assigned_by?: TaskUserRef;
}

export interface CreateTaskAssignmentPayload {
  title: string;
  task_type: TaskType;
  location_id: number;
  plot_id?: number | null;
  assigned_to_user_id: number;
  priority?: TaskPriority;
  due_date?: string | null;
  notes?: string | null;
}

export interface UpdateTaskStatusPayload {
  status: TaskStatus;
  completion_note?: string;
}

export interface TaskAssignmentsQuery {
  location_id?: number;
  assigned_to_user_id?: number;
  status?: string;
  task_type?: string;
  priority?: string;
}

export interface TaskAssignmentResponse {
  success: boolean;
  data: MapTaskAssignment;
}

export interface TaskAssignmentsListResponse {
  success: boolean;
  count: number;
  data: MapTaskAssignment[];
}

export const TASK_TYPES_CONFIG: Record<
  TaskType,
  { labelBn: string; labelEn: string; color: string; bg: string }
> = {
  MOUZA_SURVEY: {
    labelBn: 'মৌজা জরিপ',
    labelEn: 'Mouza Survey',
    color: '#0284c7',
    bg: '#e0f2fe',
  },
  PLOT_DRAWING: {
    labelBn: 'প্লট নকশা অঙ্কন',
    labelEn: 'Plot Drawing',
    color: '#059669',
    bg: '#d1fae5',
  },
  BOUNDARY_VERIFICATION: {
    labelBn: 'সীমানা যাচাই',
    labelEn: 'Boundary Verification',
    color: '#d97706',
    bg: '#fef3c7',
  },
};

export const TASK_PRIORITIES_CONFIG: Record<
  TaskPriority,
  { labelBn: string; labelEn: string; color: string; bg: string }
> = {
  LOW: {
    labelBn: 'নিম্ন',
    labelEn: 'Low',
    color: '#64748b',
    bg: '#f1f5f9',
  },
  NORMAL: {
    labelBn: 'সাধারণ',
    labelEn: 'Normal',
    color: '#087f5b',
    bg: '#e6fcf5',
  },
  HIGH: {
    labelBn: 'জরুরি',
    labelEn: 'High',
    color: '#d97706',
    bg: '#fef3c7',
  },
  URGENT: {
    labelBn: 'সর্বোচ্চ অগ্রাধিকার',
    labelEn: 'Urgent',
    color: '#dc2626',
    bg: '#fee2e2',
  },
};

export const TASK_STATUS_CONFIG: Record<
  TaskStatus,
  { labelBn: string; labelEn: string; color: string; bg: string }
> = {
  pending: {
    labelBn: 'অপেক্ষমাণ',
    labelEn: 'Pending',
    color: '#b45309',
    bg: '#fffbeb',
  },
  in_progress: {
    labelBn: 'চলমান',
    labelEn: 'In Progress',
    color: '#0284c7',
    bg: '#f0f9ff',
  },
  completed: {
    labelBn: 'সম্পন্ন',
    labelEn: 'Completed',
    color: '#059669',
    bg: '#ecfdf5',
  },
};

export const mapAssignmentsApi = {
  /**
   * Create and assign a mapping task (Admin/AC Land only).
   */
  create: async (payload: CreateTaskAssignmentPayload): Promise<MapTaskAssignment> => {
    const res = await api.post<TaskAssignmentResponse>('/map/assignments', payload);
    return res.data.data;
  },

  /**
   * List all task assignments with optional filtering (Supervisory view).
   */
  list: async (query?: TaskAssignmentsQuery): Promise<MapTaskAssignment[]> => {
    const res = await api.get<TaskAssignmentsListResponse>('/map/assignments', {
      params: query,
    });
    return res.data?.data || [];
  },

  /**
   * Get personal task assignments for the authenticated officer ("My Tasks" queue).
   */
  myAssignments: async (query?: { status?: string }): Promise<MapTaskAssignment[]> => {
    const res = await api.get<TaskAssignmentsListResponse>('/map/my-assignments', {
      params: query,
    });
    return res.data?.data || [];
  },

  /**
   * Update task status (e.g. pending -> in_progress -> completed with notes).
   */
  updateStatus: async (
    id: number,
    payload: UpdateTaskStatusPayload
  ): Promise<MapTaskAssignment> => {
    const res = await api.patch<TaskAssignmentResponse>(
      `/map/assignments/${id}/status`,
      payload
    );
    return res.data.data;
  },
};
