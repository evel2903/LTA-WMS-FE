import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { overrideLogQueryKeys } from '@modules/OverrideLog/Application/Queries/OverrideLogQueryKeys';
import type { OverrideLogFilter } from '@modules/OverrideLog/Domain/Types/OverrideLogTypes';
import { overrideLogRepository } from '@modules/OverrideLog/Infrastructure/Repositories/OverrideLogRepositoryInstance';

export function useOverrideLogs(filter: OverrideLogFilter = {}) {
  return useQuery({
    queryKey: overrideLogQueryKeys.list(filter),
    queryFn: () => overrideLogRepository.list(filter),
    placeholderData: keepPreviousData, // keep rows + pager mounted during page/filter refetch
  });
}

export function useOverrideLogDetail(id: string | null) {
  return useQuery({
    queryKey: overrideLogQueryKeys.detail(id ?? ''),
    queryFn: () => overrideLogRepository.getById(id ?? ''),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });
}
