import axios from '@/config/axios';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ApiEndpoints } from '@/api/endpoints';
import type { QueryOptions } from '@/api/queryOptions';
import { ApiKey } from '@/utils/enum';

const getDispatchVsOrder = async (params?: Record<string, unknown>) => {
  return axios.get(ApiEndpoints.dispatchVsOrder, { params });
};

export const useGetDispatchVsOrder = (params?: Record<string, unknown>, options: QueryOptions = {}) => {
  return useQuery({
    queryKey: [ApiKey.dispatchVsOrder, params],
    queryFn: () => getDispatchVsOrder(params),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    enabled: options.enabled ?? true,
  });
};
