import axios from '@/config/axios';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ApiEndpoints } from '@/api/endpoints';
import { ApiKey } from '@/utils/enum';

interface FilterParams {
  endDate?: string;
}

const getCoverDaysBenchmark = async (params: FilterParams) => {
  return axios.get(ApiEndpoints.coverDaysBenchmark, { params });
};

export const useGetCoverDaysBenchmark = (params: FilterParams = {}) => {
  return useQuery({
    queryKey: [ApiKey.coverDaysBenchmark, params],
    queryFn: () => getCoverDaysBenchmark(params),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};
