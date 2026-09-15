import axios from '@/config/axios';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ApiEndpoints } from '@/api/endpoints';
import type { QueryOptions } from '@/api/queryOptions';
import { ApiKey } from '@/utils/enum';

const getTgtVsActual = async (params?: Record<string, unknown>) => {
  return axios.get(ApiEndpoints.tgtVsActual, { params });
};

export const useGetTgtVsActual = (params?: Record<string, unknown>, options: QueryOptions = {}) => {
  return useQuery({
    queryKey: [ApiKey.tgtVsActual, params],
    queryFn: () => getTgtVsActual(params),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    enabled: options.enabled ?? true,
  });
};
