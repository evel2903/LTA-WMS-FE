import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { reasonCodeQueryKeys } from '@modules/ReasonCode/Application/Queries/ReasonCodeQueryKeys';
import type { ReasonCodeFilter } from '@modules/ReasonCode/Domain/Types/ReasonCodeTypes';
import { reasonCodeRepository } from '@modules/ReasonCode/Infrastructure/Repositories/ReasonCodeRepositoryInstance';

export function useReasonCodes(filter: ReasonCodeFilter = {}) {
  return useQuery({
    queryKey: reasonCodeQueryKeys.list(filter),
    queryFn: () => reasonCodeRepository.list(filter),
    placeholderData: keepPreviousData, // keep rows + pager mounted during page/filter refetch
  });
}

export function useReasonCodeDetail(id: string | null) {
  return useQuery({
    queryKey: reasonCodeQueryKeys.detail(id ?? ''),
    queryFn: () => reasonCodeRepository.getById(id ?? ''),
    enabled: Boolean(id),
  });
}
