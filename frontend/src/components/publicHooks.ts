import { useQuery } from '@tanstack/react-query';
import { BhumiApi, unwrapList, ServiceCatalogueItem, ServiceFeeItem } from '../api/client';

export const publicQueryKeys = {
  landingStats: ['landingStats'] as const,
  locations: ['locations'] as const,
  plots: (mouzaId?: number) => ['plots', mouzaId ?? 'all'] as const,
  persons: (plotId?: number) => ['persons', plotId ?? 'all'] as const,
  publicServices: (category?: string, q?: string) =>
    ['publicServices', category ?? 'ALL', q ?? ''] as const,
  listings: (filters?: Record<string, any>) => ['listings', filters ?? {}] as const,
  notices: (query?: Record<string, any>) => ['notices', query ?? {}] as const,
  blogPosts: (category?: string) => ['blogPosts', category ?? 'ALL'] as const,
  offices: (query?: Record<string, any>) => ['offices', query ?? {}] as const,
  publicFees: ['publicFees'] as const,
  siteSettings: ['siteSettings'] as const,
};

export function useSiteSettingsQuery() {
  return useQuery({
    queryKey: publicQueryKeys.siteSettings,
    queryFn: async () => {
      return await BhumiApi.getSettings();
    },
    staleTime: 30 * 1000,
  });
}

export function useLandingStats() {
  return useQuery({
    queryKey: publicQueryKeys.landingStats,
    queryFn: async () => {
      return await BhumiApi.getStatsSummary();
    },
    staleTime: 60 * 1000,
  });
}

export function useLocationsQuery() {
  return useQuery({
    queryKey: publicQueryKeys.locations,
    queryFn: async () => {
      const data = await BhumiApi.getLocations();
      return unwrapList(data);
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function usePlotsQuery(mouzaId?: number) {
  return useQuery({
    queryKey: publicQueryKeys.plots(mouzaId),
    queryFn: async () => {
      const data = await BhumiApi.getPlots(mouzaId);
      return Array.isArray(data) ? data : [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePersonsQuery(plotId?: number) {
  return useQuery({
    queryKey: publicQueryKeys.persons(plotId),
    queryFn: async () => {
      const data = await BhumiApi.getPersons(plotId);
      return Array.isArray(data) ? data : [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicServices(category?: string, q?: string) {
  return useQuery({
    queryKey: publicQueryKeys.publicServices(category, q),
    queryFn: async () => {
      return await BhumiApi.listPublicServices(category === 'ALL' ? undefined : category, q);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useListings(filters?: Record<string, any>) {
  return useQuery({
    queryKey: publicQueryKeys.listings(filters),
    queryFn: async () => {
      return await BhumiApi.listListings(filters);
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useNotices(query?: Record<string, any>) {
  return useQuery({
    queryKey: publicQueryKeys.notices(query),
    queryFn: async () => {
      return await BhumiApi.listNotices(query);
    },
    staleTime: 3 * 60 * 1000,
  });
}

export function useBlogPosts(category?: string) {
  return useQuery({
    queryKey: publicQueryKeys.blogPosts(category),
    queryFn: async () => {
      return await BhumiApi.listBlogPosts(category === 'ALL' || !category ? undefined : category);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useOffices(query?: Record<string, any>) {
  return useQuery({
    queryKey: publicQueryKeys.offices(query),
    queryFn: async () => {
      const data = await BhumiApi.listOffices(query);
      return Array.isArray(data) ? data : (data as any)?.items || [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function usePublicFees() {
  return useQuery({
    queryKey: publicQueryKeys.publicFees,
    queryFn: async () => {
      return await BhumiApi.listPublicFees();
    },
    staleTime: 10 * 60 * 1000,
  });
}
