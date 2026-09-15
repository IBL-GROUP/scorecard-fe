import axios from '@/config/axios';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ApiEndpoints } from '@/api/endpoints';
import type { QueryOptions } from '@/api/queryOptions';
import { ApiKey } from '@/utils/enum';

const getForecastAccuracyMonthly = async (params?: Record<string, unknown>) => {
  return axios.get(ApiEndpoints.forecastAccuracyMonthly, { params });
};

export const useGetForecastAccuracyMonthly = (params?: Record<string, unknown>, options: QueryOptions = {}) => {
  return useQuery({
    queryKey: [ApiKey.forecastAccuracyMonthly, params],
    queryFn: () => getForecastAccuracyMonthly(params),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    enabled: options.enabled ?? true,
  });
};

const getForecastAccuracyMonthlyDaysGone = async (
  params?: Record<string, unknown>
) => {
  return axios.get(ApiEndpoints.forecastAccuracyMonthlyDaysGone, { params });
};

export const useGetForecastAccuracyMonthlyDaysGone = (params?: Record<string, unknown>, options: QueryOptions = {}) => {
  return useQuery({
    queryKey: [ApiKey.forecastAccuracyMonthlyDaysGone, params],
    queryFn: () => getForecastAccuracyMonthlyDaysGone(params),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    enabled: options.enabled ?? true,
  });
};
