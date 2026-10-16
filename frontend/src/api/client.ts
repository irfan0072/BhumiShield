import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bs_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Finding {
  rule_code: string;
  severity: 'SAFE' | 'WARNING' | 'HIGH';
  title_bn: string;
  title_en: string;
  detail_bn: string;
  detail_en: string;
  action_bn: string;
  action_en: string;
}

export interface RiskReportResponse {
  status: 'SAFE' | 'WARNING' | 'HIGH_RISK';
  badge_bn: string;
  badge_en: string;
  summary_bn: string;
  summary_en: string;
  next_step_bn: string;
  next_step_en: string;
  findings: Finding[];
  plot?: {
    id: number;
    dag_no: string;
    land_type: string;
    total_area_decimal: number;
    mouza_bn: string;
    mouza_en: string;
    upazila_bn: string;
    district_bn: string;
    owner_sale_locked?: number;
    locked_by_nid?: string;
    lock_reason_bn?: string;
  };
  khatian_chain?: Array<{
    id: number;
    survey_type: string;
    khatian_no: string;
    recorded_area_decimal: number;
    survey_year: number;
    reconcile_status: string;
    anomaly_note_bn: string;
    anomaly_note_en: string;
    owners: Array<{
      person_id: number;
      name_bn: string;
      name_en: string;
      father_name_bn: string;
      nid_mock: string;
      share_fraction: string;
      share_area_decimal: number;
    }>;
  }>;
  active_mortgages?: Array<{
    id: number;
    bank_name_bn: string;
    bank_name_en: string;
    branch_name: string;
    loan_amount_bdt: number;
    status: string;
    created_at: string;
  }>;
  active_disputes?: Array<{
    id: number;
    plot_id: number;
    complainant_name_bn: string;
    complainant_nid: string;
    dispute_type: string;
    description_bn: string;
    status: string;
    created_at: string;
  }>;
  deed_history?: Array<{
    id: number;
    deed_no: string;
    deed_type: string;
    seller_name_bn: string;
    buyer_name_bn: string;
    area_decimal: number;
    share_fraction: string;
    declared_value_bdt: number;
    status: string;
    content_hash: string;
    prev_hash: string;
    chain_index: number;
    is_tampered_demo: number;
    created_at: string;
  }>;
  disclaimer_bn: string;
  disclaimer_en: string;
}

export const BhumiApi = {
  // Auth & RBAC Middleware Endpoints
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }).then((r) => r.data),
  register: (payload: {
    username: string;
    password: string;
    full_name_bn: string;
    full_name_en?: string;
    role: string;
    nid_mock: string;
    phone_mock?: string;
    office_name?: string;
  }) => api.post('/auth/register', payload).then((r) => r.data),
  getMe: () => api.get('/auth/me').then((r) => r.data),
  updateProfile: (payload: {
    full_name_bn: string;
    full_name_en: string;
    phone_mock: string;
    office_name: string;
    new_password?: string;
  }) => api.put('/auth/profile', payload).then((r) => r.data),
  switchDemoRole: (role: string) =>
    api.post('/auth/switch-demo-role', { role }).then((r) => r.data),
  getPermissions: () =>
    api.get('/auth/permissions').then((r) => r.data),

  // Users CRUD (Admin)
  listUsers: () => api.get('/users').then((r) => r.data),
  createUser: (payload: any) => api.post('/users', payload).then((r) => r.data),
  updateUser: (id: number, payload: any) => api.put(`/users/${id}`, payload).then((r) => r.data),
  deleteUser: (id: number) => api.delete(`/users/${id}`).then((r) => r.data),

  // Site Settings & Stats
  getSettings: () => api.get('/settings').then((r) => r.data),
  updateSettings: (settings: Record<string, string>) =>
    api.put('/settings', { settings }).then((r) => r.data),
  getStatsSummary: () => api.get('/stats/summary').then((r) => r.data),
  getMyVault: (nid?: string) =>
    api.get('/citizen/my-vault', { params: nid ? { nid } : {} }).then((r) => r.data),

  // Citizen Role Controlling Endpoints
  togglePlotSaleLock: (plotId: number, reason_bn?: string) =>
    api.post(`/citizen/plots/${plotId}/toggle-lock`, { reason_bn }).then((r) => r.data),
  listDisputes: (plotId?: number) =>
    api.get('/citizen/disputes', { params: plotId ? { plot_id: plotId } : {} }).then((r) => r.data),
  fileDispute: (payload: {
    plot_id: number;
    complainant_name_bn?: string;
    complainant_nid?: string;
    dispute_type: string;
    description_bn: string;
  }) => api.post('/citizen/disputes', payload).then((r) => r.data),

  // Sub-Registrar Role Controlling Endpoints
  listRegistrarDeeds: (status?: string) =>
    api.get('/registrar/deeds', { params: status ? { status } : {} }).then((r) => r.data),
  updateRegistrarDeedStatus: (deedId: number, payload: { status: 'REGISTERED' | 'HELD' | 'REJECTED'; officer_note?: string }) =>
    api.post(`/registrar/deeds/${deedId}/status`, payload).then((r) => r.data),
  calculateFees: (declared_value_bdt: number, deed_type = 'SALE') =>
    api.get('/registrar/calculate-fees', { params: { declared_value_bdt, deed_type } }).then((r) => r.data),

  // AC Land Role Controlling Endpoints
  listFlaggedKhatians: () =>
    api.get('/acland/flagged-khatians').then((r) => r.data),
  reconcileKhatian: (plotId: number, payload: { resolution_note_bn: string; updated_area_decimal?: number }) =>
    api.post(`/acland/khatians/${plotId}/reconcile`, payload).then((r) => r.data),
  resolveDispute: (disputeId: number, payload: { status: 'RESOLVED_DISMISSED' | 'UPHELD_FROZEN'; resolution_note_bn: string }) =>
    api.post(`/acland/disputes/${disputeId}/resolve`, payload).then((r) => r.data),

  // Bank Officer Role Controlling Endpoints
  getMortgageNoc: (lienId: number) =>
    api.get(`/mortgages/${lienId}/noc`).then((r) => r.data),

  // Core Domain Endpoints
  getLocations: () => api.get('/locations').then((r) => r.data),
  getPlots: (mouza_id?: number) =>
    api.get('/plots', { params: mouza_id ? { mouza_id } : {} }).then((r) => r.data),
  getPlotLineage: (plotId: number) =>
    api.get(`/plots/${plotId}/lineage`).then((r) => r.data),
  getPersons: () => api.get('/persons').then((r) => r.data),
  verifyNid: (nid: string, name?: string) =>
    api.get(`/mock-nid/${nid}`, { params: name ? { name } : {} }).then((r) => r.data),
  checkBeforeBuy: (payload: {
    plot_id: number;
    seller_nid?: string;
    proposed_area_decimal?: number;
    deed_type?: string;
  }): Promise<RiskReportResponse> =>
    api.post('/verify/check-before-buy', payload).then((r) => r.data),
  verifyDeedByCode: (deedNo: string) =>
    api.get(`/deeds/verify/${encodeURIComponent(deedNo)}`).then((r) => r.data),
  createDeed: (payload: {
    deed_no?: string;
    deed_type: string;
    plot_id: number;
    seller_id: number;
    buyer_id: number;
    area_decimal: number;
    share_fraction: string;
    declared_value_bdt: number;
    force_hold_override?: boolean;
    officer_note?: string;
  }) => api.post('/deeds', payload).then((r) => r.data),
  tamperDeedDemo: (deedNo: string, newArea: number) =>
    api.post(`/deeds/${encodeURIComponent(deedNo)}/tamper-demo`, { new_area_decimal: newArea }).then((r) => r.data),
  restoreDeedDemo: (deedNo: string) =>
    api.post(`/deeds/${encodeURIComponent(deedNo)}/restore-demo`).then((r) => r.data),
  getLedgerState: () => api.get('/ledger/verify-chain').then((r) => r.data),
  getMutations: () => api.get('/mutations').then((r) => r.data),
  decideMutation: (mutationId: number, status: 'APPROVED' | 'REJECTED', decision_note_bn: string) =>
    api.post(`/mutations/${mutationId}/decision`, { status, decision_note_bn }).then((r) => r.data),
  getMortgages: (plot_id?: number) =>
    api.get('/mortgages', { params: plot_id ? { plot_id } : {} }).then((r) => r.data),
  createMortgage: (payload: {
    plot_id: number;
    borrower_id: number;
    bank_name_bn: string;
    bank_name_en: string;
    branch_name: string;
    loan_amount_bdt: number;
  }) => api.post('/mortgages', payload).then((r) => r.data),
  releaseMortgage: (lienId: number) =>
    api.post(`/mortgages/${lienId}/release`).then((r) => r.data),
  getDemoScenarios: () => api.get('/demo-scenarios').then((r) => r.data),
  runDemoScenario: (code: string) => api.post(`/demo-scenarios/${code}/run`).then((r) => r.data),
  getAuditLogs: () => api.get('/audit-logs').then((r) => r.data),
  getOcrSample: () => api.get('/ocr-assist/sample').then((r) => r.data),
};
