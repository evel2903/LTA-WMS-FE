import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { approvalQueryKeys } from '@modules/Approval/Application/Queries/ApprovalQueryKeys';
import type { ApprovalFilter } from '@modules/Approval/Domain/Types/ApprovalTypes';
import { approvalRepository } from '@modules/Approval/Infrastructure/Repositories/ApprovalRepositoryInstance';

export function useApprovalRequests(filter: ApprovalFilter = {}) {
  return useQuery({
    queryKey: approvalQueryKeys.list(filter),
    queryFn: () => approvalRepository.list(filter),
    placeholderData: keepPreviousData, // keep rows + pager mounted during page/filter refetch
  });
}

export function useApprovalRequestDetail(id: string | null) {
  return useQuery({
    queryKey: approvalQueryKeys.detail(id ?? ''),
    queryFn: () => approvalRepository.getById(id ?? ''),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });
}
