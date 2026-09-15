import axios from '@/config/axios';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ApiEndpoints } from '@/api/endpoints';
import type { QueryOptions } from '@/api/queryOptions';
import { ApiKey } from '@/utils/enum';

const getCoverDays = async (params?: Record<string, unknown>) => {
  return axios.get(ApiEndpoints.coverDays, { params });
};

const getCoverDaysTotal = async (params?: Record<string, unknown>) => {
  return axios.get(ApiEndpoints.coverDaysTotal, { params });
};

const getCoverDaysClosingInv = async () => {
  return axios.get(ApiEndpoints.coverDaysClosingInv);
};

export const useGetCoverDays = (params?: Record<string, unknown>, options: QueryOptions = {}) => {
  return useQuery({
    queryKey: [ApiKey.coverDays, params],
    queryFn: () => getCoverDays(params),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    enabled: options.enabled ?? true,
  });
};

export const useGetCoverDaysTotal = (params?: Record<string, unknown>, options: QueryOptions = {}) => {
  return useQuery({
    queryKey: [ApiKey.coverDaysTotal, params],
    queryFn: () => getCoverDaysTotal(params),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    enabled: options.enabled ?? true,
  });
};

export const useGetCoverDaysClosingInv = (options: QueryOptions = {}) => {
  return useQuery({
    queryKey: [ApiKey.coverDaysClosingInv],
    queryFn: getCoverDaysClosingInv,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    enabled: options.enabled ?? true,
  });
};

/** One classification's benchmarks, as GET /cover-days/benchmarks returns it. */
export interface CoverDaysBenchmarkRow {
  classification: string;
  /** The Benchmark card's cover days. */
  days: number | null;
  /** The Inventory Days Threshold (Service Measure). */
  threshold: number | null;
  effective_date: string;
}

const getCoverDaysBenchmarks = async (params?: Record<string, unknown>) => {
  return axios.get(ApiEndpoints.coverDaysBenchmarks, { params });
};

/**
 * The Benchmark cover days and the Inventory Days Threshold per classification,
 * from the cover_days table as of `endDate` — the latest row in force then.
 */
export const useGetCoverDaysBenchmarks = (params?: Record<string, unknown>, options: QueryOptions = {}) => {
  return useQuery({
    queryKey: [ApiKey.coverDaysBenchmarks, params],
    queryFn: () => getCoverDaysBenchmarks(params),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    enabled: options.enabled ?? true,
  });
};
