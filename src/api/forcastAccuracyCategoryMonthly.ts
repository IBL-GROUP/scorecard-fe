import axios from '@/config/axios';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ApiEndpoints } from '@/api/endpoints';
import type { QueryOptions } from '@/api/queryOptions';
import { ApiKey } from '@/utils/enum';

const getForecastAccuracyCategoryMonthly = async (
  params?: Record<string, unknown>
) => {
  return axios.get(ApiEndpoints.forecastAccuracyCategoryMonthly, { params });
};

export const useGetForecastAccuracyCategoryMonthly = (params?: Record<string, unknown>, options: QueryOptions = {}) => {
  return useQuery({
    queryKey: [ApiKey.forecastAccuracyCategoryMonthly, params],
    queryFn: () => getForecastAccuracyCategoryMonthly(params),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    enabled: options.enabled ?? true,
  });
};
