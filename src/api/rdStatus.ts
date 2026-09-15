import axios from '@/config/axios';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ApiEndpoints } from '@/api/endpoints';
import type { QueryOptions } from '@/api/queryOptions';
import { ApiKey } from '@/utils/enum';

// Row shape returned by GET /rd-status — mirrors the franchise stock query.
export interface RdStatusApiRow {
  ibl_distributor_code: string | number;
  distributor_desc: string | null;
  branch_code: string | number | null;
  branch_desc: string | null;
  stock_qty: string | number;
  stock_value: string | number;
  last_stock_qty: string | number;
  last_stock_value: string | number;
  last_stock_date: string | null;
  day_diff: string | number;
}

interface RdStatusParams {
  date?: string;
}

// The query takes a single as-of date: the filter bar's "To" date, never in
// the future. Shared so the dashboard and the filter bar produce the same
// query key and hit the same cache entry instead of firing twice.
export const rdStatusDate = (dateTo?: string) => {
  const today = new Date().toISOString().slice(0, 10);
  return !dateTo || dateTo > today ? today : dateTo;
};

const getRdStatus = async (params: RdStatusParams) => {
  return axios.get(ApiEndpoints.rdStatus, { params });
};

// Fires on mount, not on tab switch: the underlying query takes ~12s, so it
// is prefetched while the user is on another tab and the RD Status tab opens
// against a warm cache.
export const useGetRdStatus = (params: RdStatusParams = {}, options: QueryOptions = {}) => {
  return useQuery({
    queryKey: [ApiKey.rdStatus, params],
    queryFn: () => getRdStatus(params),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    enabled: options.enabled ?? true,
  });
};
