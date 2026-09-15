import axios from '@/config/axios';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ApiEndpoints } from '@/api/endpoints';
import type { QueryOptions } from '@/api/queryOptions';
import { ApiKey } from '@/utils/enum';

interface FilterParams {
  classification?: string;
  sku?: string | string[];
}

const getTotalSku = async (params: FilterParams) => {
  return axios.get(ApiEndpoints.totalSku, { params });
};

export const useGetTotalSku = (params: FilterParams = {}, options: QueryOptions = {}) => {
  return useQuery({
    queryKey: [ApiKey.totalSku, params],
    queryFn: () => getTotalSku(params),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    enabled: options.enabled ?? true,
  });
};
