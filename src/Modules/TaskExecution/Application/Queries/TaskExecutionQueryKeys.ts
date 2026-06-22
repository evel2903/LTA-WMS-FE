import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type { MobileTaskListFilter } from '@modules/TaskExecution/Domain/Types/MobileTaskQuery';

export const taskExecutionQueryKeys = {
  all: [QUERY_NAMESPACES.TASK_EXECUTION] as const,
  lists: () => [...taskExecutionQueryKeys.all, 'list'] as const,
  list: (filter: MobileTaskListFilter) => [...taskExecutionQueryKeys.lists(), filter] as const,
  details: () => [...taskExecutionQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskExecutionQueryKeys.details(), id] as const,
};
