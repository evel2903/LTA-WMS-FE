import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type { ReplenishmentTaskListFilter } from '@modules/Replenishment/Domain/Types/ReplenishmentQuery';

export const replenishmentQueryKeys = {
  all: [QUERY_NAMESPACES.REPLENISHMENT] as const,
  lists: () => [...replenishmentQueryKeys.all, 'list'] as const,
  list: (filter: ReplenishmentTaskListFilter) => [...replenishmentQueryKeys.lists(), filter] as const,
  detail: (id: string) => [...replenishmentQueryKeys.all, 'detail', id] as const,
};
