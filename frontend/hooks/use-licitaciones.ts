'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { LicitacionesFilters } from '@/types'

// Inline fetch helpers (api.ts only exports the axios instance, not named functions)
const fetchDashboardKPIs = async () => {
    const res = await api.get('/api/dashboard/kpis');
    return res.data;
};

const fetchLicitaciones = async (filters: LicitacionesFilters) => {
    const res = await api.get('/api/licitaciones', { params: filters });
    return res.data;
};

const fetchLicitacionDetail = async (id: number) => {
    const res = await api.get(`/api/licitaciones/${id}`);
    return res.data;
};

/**
 * Hook to fetch dashboard KPIs
 */
export function useDashboardKPIs() {
    return useQuery({
        queryKey: ['dashboard', 'kpis'],
        queryFn: fetchDashboardKPIs,
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
    })
}

/**
 * Hook to fetch paginated licitaciones with filters
 */
export function useLicitaciones(filters: LicitacionesFilters = {}) {
    return useQuery({
        queryKey: ['licitaciones', filters],
        queryFn: () => fetchLicitaciones(filters),
        staleTime: 2 * 60 * 1000, // 2 minutes
        placeholderData: (prev: any) => prev, // TanStack Query v5: replaces keepPreviousData
    })
}

/**
 * Hook to fetch single licitacion detail
 */
export function useLicitacionDetail(id: number) {
    return useQuery({
        queryKey: ['licitacion', id],
        queryFn: () => fetchLicitacionDetail(id),
        staleTime: 5 * 60 * 1000,
        enabled: !!id,
    })
}
