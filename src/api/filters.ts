import axios from '@/config/axios';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ApiEndpoints } from '@/api/endpoints';
import type { QueryOptions } from '@/api/queryOptions';
import { ApiKey } from '@/utils/enum';

interface FilterParams {
  classification?: string;
  sku?: string;
}

const getFilters = async (params: FilterParams) => {
  return axios.get(ApiEndpoints.filters, { params });
};

export const useGetFilters = (params: FilterParams = {}, options: QueryOptions = {}) => {
  return useQuery({
    queryKey: [ApiKey.filters, params],
    queryFn: () => getFilters(params),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    enabled: options.enabled ?? true,
  });
};

const getFilterBranches = async (params: FilterParams) => {
  return axios.get(ApiEndpoints.filterBranches, { params });
};

export const useGetFilterBranches = (params: FilterParams = {}, options: QueryOptions = {}) => {
  return useQuery({
    queryKey: [ApiKey.filters, 'branches', params],
    queryFn: () => getFilterBranches(params),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    enabled: options.enabled ?? true,
  });
};
