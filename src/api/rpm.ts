import axios from '@/config/axios';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ApiEndpoints } from '@/api/endpoints';
import type { QueryOptions } from '@/api/queryOptions';
import { ApiKey } from '@/utils/enum';

const getRpm = async (params?: Record<string, unknown>) => {
  return axios.get(ApiEndpoints.rpm, { params });
};

export const useGetRpm = (params?: Record<string, unknown>, options: QueryOptions = {}) => {
  return useQuery({
    queryKey: [ApiKey.rpm, params],
    queryFn: () => getRpm(params),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    enabled: options.enabled ?? true,
  });
};
