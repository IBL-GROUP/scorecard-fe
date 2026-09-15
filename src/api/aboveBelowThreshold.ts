import axios from '@/config/axios';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ApiEndpoints } from '@/api/endpoints';
import type { QueryOptions } from '@/api/queryOptions';
import { ApiKey } from '@/utils/enum';

const getAboveBelowThreshold = async (params?: Record<string, unknown>) => {
  return axios.get(ApiEndpoints.aboveBelowThreshold, { params });
};

export const useGetAboveBelowThreshold = (params?: Record<string, unknown>, options: QueryOptions = {}) => {
  return useQuery({
    queryKey: [ApiKey.aboveBelowThreshold, params],
    queryFn: () => getAboveBelowThreshold(params),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    enabled: options.enabled ?? true,
  });
};
