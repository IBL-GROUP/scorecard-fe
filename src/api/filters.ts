import axios from '@/config/axios';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ApiEndpoints } from '@/api/endpoints';
import type { QueryOptions } from '@/api/queryOptions';
import { ApiKey } from '@/utils/enum';

interface FilterParams {
  classification?: string | string[];
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

/** One SKU row from /filters (vw_items_class). */
export type FilterItemRow = {
  item_code?: string;
  item_description?: string;
  sap_code?: string;
  item_desc?: string;
  classification: string | null;
  division?: string | null;
};

/**
 * The SKU codes the reports should be filtered by.
 *
 * No report endpoint takes a division, so a Division filter is applied through
 * the SKU filter they all already support: with no SKUs picked, the divisions
 * stand for every SKU in them. SKUs picked by hand win — the SKU dropdown only
 * offers the chosen divisions' SKUs, so they are already inside them.
 *
 * Reads the same cached /filters response the filter bar's dropdowns are built
 * from, so it costs no extra request.
 */
export const useEffectiveSku = (divisions: string[], sku: string[]): string[] => {
  const { data } = useGetFilters(
    {},
    { enabled: divisions.length > 0 && sku.length === 0 }
  );
  if (sku.length > 0 || divisions.length === 0) return sku;
  const rows = (data as { data?: FilterItemRow[] } | undefined)?.data ?? [];
  const codes = new Set<string>();
  for (const row of rows) {
    const code = String(row.item_code ?? row.sap_code ?? '').trim();
    if (code && divisions.includes(String(row.division ?? ''))) codes.add(code);
  }
  return [...codes];
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
