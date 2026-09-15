import axios from '@/config/axios';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ApiEndpoints } from '@/api/endpoints';
import type { QueryOptions } from '@/api/queryOptions';
import { ApiKey } from '@/utils/enum';

const getServiceMeasure = async (params?: Record<string, unknown>) => {
  return axios.get(ApiEndpoints.serviceMeasure, { params });
};

export const useGetServiceMeasure = (params?: Record<string, unknown>, options: QueryOptions = {}) => {
  return useQuery({
    queryKey: [ApiKey.serviceMeasure, params],
    queryFn: () => getServiceMeasure(params),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    enabled: options.enabled ?? true,
  });
};
