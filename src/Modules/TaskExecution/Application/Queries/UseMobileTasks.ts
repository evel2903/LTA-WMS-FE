import { useQuery } from '@tanstack/react-query';

import { taskExecutionQueryKeys } from '@modules/TaskExecution/Application/Queries/TaskExecutionQueryKeys';
import type { MobileTaskListFilter } from '@modules/TaskExecution/Domain/Types/MobileTaskQuery';
import { taskExecutionRepository } from '@modules/TaskExecution/Infrastructure/Repositories/TaskExecutionRepositoryInstance';

export function useMobileTasks(filter: MobileTaskListFilter = {}) {
  return useQuery({
    queryKey: taskExecutionQueryKeys.list(filter),
    queryFn: () => taskExecutionRepository.list(filter),
  });
}

export function useMobileTask(id: string | null) {
  return useQuery({
    queryKey: taskExecutionQueryKeys.detail(id ?? ''),
    queryFn: () => taskExecutionRepository.getById(id as string),
    enabled: Boolean(id),
  });
}
