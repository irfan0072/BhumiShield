import { useState, useEffect } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { api, BhumiApi, unwrapList, type RiskReportResponse } from './client';
import { type AuthUser } from '../i18n';

/**
 * Global QueryClient configured with standard 5-minute stale-time caching
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Do not retry 401/403/404 errors
        const status = error?.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
    },
  },
});

export const queryKeys = {
  health: ['health'] as const,
  currentUser: ['currentUser'] as const,
  citizenPlots: (userId?: number | string, nid?: string) =>
    ['citizenPlots', userId ?? 'current', nid ?? 'all'] as const,
  checkBeforeBuy: (filters: Record<string, any>) =>
    ['checkBeforeBuy', filters] as const,
  deedDetails: (deedNo: string) => ['deedDetails', deedNo] as const,
  registeredDeeds: (filters?: Record<string, any>) =>
    ['registeredDeeds', filters ?? {}] as const,
  mutations: (filters?: Record<string, any>) =>
    ['mutations', filters ?? {}] as const,
  bankMortgages: (filters?: Record<string, any>) =>
    ['bankMortgages', filters ?? {}] as const,
  hierarchy: (params?: Record<string, any>) =>
    ['hierarchy', params ?? {}] as const,
};

export interface HealthResponse {
  status: string;
  ready?: boolean;
  database?: string;
  framework?: string;
  service?: string;
  mode?: string;
  disclaimer_en?: string;
  isColdStarting?: boolean;
  coldStartMessage?: string;
}

/**
 * 1. useHealth Hook
 * Detects server availability and Render free-tier cold-start latency.
 * If response takes > 3.0s, triggers cold-start alert in plain Bengali.
 */
export function useHealth() {
  const [isColdStarting, setIsColdStarting] = useState(false);

  const query = useQuery<HealthResponse>({
    queryKey: queryKeys.health,
    queryFn: async () => {
      const res = await api.get('/health', { timeout: 18000 });
      return res.data;
    },
    staleTime: 60 * 1000, // 1 minute
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
  });

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (query.isLoading) {
      timer = setTimeout(() => {
        setIsColdStarting(true);
      }, 3000);
    } else {
      setIsColdStarting(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [query.isLoading]);

  const coldStartMessageBn =
    'সার্ভার জেগে উঠছে, অনুগ্রহ করে কয়েক সেকেন্ড অপেক্ষা করুন...';
  const coldStartMessageEn =
    'Server is waking up, please wait a few seconds...';

  return {
    ...query,
    isColdStarting,
    coldStartMessage: coldStartMessageBn,
    coldStartMessageBn,
    coldStartMessageEn,
  };
}

/**
 * 2. useCurrentUser Hook
 * Queries authenticated profile (`/auth/me`). Returns null if unauthenticated.
 */
export function useCurrentUser() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('bs_token') : null;

  return useQuery<AuthUser | null>({
    queryKey: queryKeys.currentUser,
    queryFn: async () => {
      if (!token) return null;
      try {
        const res = await BhumiApi.getMe();
        return res.user || res.data || res;
      } catch (err: any) {
        if (err?.response?.status === 401) {
          localStorage.removeItem('bs_token');
          localStorage.removeItem('bs_user');
          return null;
        }
        throw err;
      }
    },
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 3. useCitizenPlots Hook
 * Queries plots / vault properties for the specified user or current citizen.
 */
export function useCitizenPlots(userId?: number | string, nid?: string) {
  return useQuery({
    queryKey: queryKeys.citizenPlots(userId, nid),
    queryFn: async () => {
      const data = await BhumiApi.getMyVault(nid);
      return data;
    },
    staleTime: 3 * 60 * 1000,
  });
}

export interface CheckBeforeBuyFilters {
  plot_id?: number | string;
  division?: string;
  district?: string;
  upazila?: string;
  mouza?: string;
  dag_no?: string;
  khatian_no?: string;
  seller_nid?: string;
  seller_id?: number;
  proposed_area_decimal?: number;
}

/**
 * 4. useCheckBeforeBuy Hook
 * Runs pre-purchase due diligence check with risk scoring and encumbrance timeline.
 */
export function useCheckBeforeBuy(
  filters: CheckBeforeBuyFilters,
  options?: { enabled?: boolean }
) {
  const hasIdentifier = Boolean(
    filters.plot_id ||
      (filters.mouza && (filters.dag_no || filters.khatian_no))
  );

  return useQuery<RiskReportResponse | any>({
    queryKey: queryKeys.checkBeforeBuy(filters),
    queryFn: async () => {
      if (filters.plot_id) {
        const plotIdNum = Number(filters.plot_id);
        if (!isNaN(plotIdNum) && plotIdNum > 0) {
          return await BhumiApi.checkBeforeBuy({
            plot_id: plotIdNum,
            seller_nid: filters.seller_nid,
            seller_id: filters.seller_id,
            proposed_area_decimal: filters.proposed_area_decimal,
          });
        }
        return await BhumiApi.citizenCheckBeforeYouBuy(filters.plot_id);
      }

      // Query by mouza + dag/khatian
      const res = await api.get('/verification/check-before-buy', {
        params: filters,
      });
      return res.data;
    },
    enabled: options?.enabled !== undefined ? options.enabled : hasIdentifier,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 5. useDeedDetails Hook
 * Queries cryptographic deed details by deed number (e.g. DL-2026-1001).
 */
export function useDeedDetails(
  deedNo?: string,
  options?: { enabled?: boolean; hashPrefix?: string | null }
) {
  const cleanDeedNo = deedNo?.trim() || '';

  return useQuery({
    queryKey: queryKeys.deedDetails(cleanDeedNo),
    queryFn: async () => {
      if (!cleanDeedNo) return null;
      return await BhumiApi.verifyDeedByCode(cleanDeedNo, options?.hashPrefix);
    },
    enabled:
      options?.enabled !== undefined ? options.enabled : Boolean(cleanDeedNo),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 6. useRegisteredDeeds Hook
 * Queries deeds list for Sub-Registrar and Registry Data Officers.
 */
export function useRegisteredDeeds(filters?: { status?: string }) {
  return useQuery({
    queryKey: queryKeys.registeredDeeds(filters),
    queryFn: async () => {
      const data = await BhumiApi.listRegistrarDeeds(filters?.status);
      return unwrapList(data);
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * 7. useMutations Hook
 * Queries e-mutation docket list for AC Land, LOA, FVO, SRO, and appellate reviewers.
 */
export function useMutations(filters?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.mutations(filters),
    queryFn: async () => {
      const data = await BhumiApi.getMutations();
      return unwrapList(data);
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * 8. useBankMortgages Hook
 * Queries active bank mortgages, collateral encumbrances, and NOC requests.
 */
export function useBankMortgages(filters?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.bankMortgages(filters),
    queryFn: async () => {
      const data = await BhumiApi.getMortgages();
      return unwrapList(data);
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * 9. useHierarchy Hook
 * Queries administrative tree (Division > District > Upazila > Mouza).
 */
export function useHierarchy(params?: {
  division?: string;
  district?: string;
  upazila?: string;
}) {
  return useQuery({
    queryKey: queryKeys.hierarchy(params),
    queryFn: async () => {
      if (params?.upazila) {
        const res = await BhumiApi.getHierarchyMouzas(
          params.division,
          params.district,
          params.upazila
        );
        return unwrapList(res);
      }
      if (params?.district) {
        const res = await BhumiApi.getHierarchyUpazilas(
          params.division,
          params.district
        );
        return unwrapList(res);
      }
      if (params?.division) {
        const res = await BhumiApi.getHierarchyDistricts(params.division);
        return unwrapList(res);
      }
      const tree = await BhumiApi.getHierarchyTree();
      return unwrapList(tree);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes cache for administrative geography
  });
}

/**
 * 10. Mutation Hooks for Cache Invalidation & Refetching
 */

export function useApplyMutationAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof BhumiApi.applyMutation>[0]) =>
      BhumiApi.applyMutation(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mutations'] });
      qc.invalidateQueries({ queryKey: ['citizenPlots'] });
    },
  });
}

export function useDecideMutationAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      mutationId,
      status,
      decision_note_bn,
    }: {
      mutationId: number;
      status: 'APPROVED' | 'REJECTED';
      decision_note_bn: string;
    }) => BhumiApi.decideMutation(mutationId, status, decision_note_bn),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mutations'] });
    },
  });
}

export function useUpdateDeedStatusAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      deedId,
      payload,
    }: {
      deedId: number;
      payload: { status: string; officer_note?: string };
    }) => BhumiApi.updateRegistrarDeedStatus(deedId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registeredDeeds'] });
    },
  });
}
