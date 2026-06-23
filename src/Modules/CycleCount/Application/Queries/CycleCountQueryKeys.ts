import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type { CycleCountWorkListFilter } from '@modules/CycleCount/Domain/Types/CycleCountQuery';

export const cycleCountQueryKeys = {
  all: [QUERY_NAMESPACES.CYCLE_COUNT] as const,
  lists: () => [...cycleCountQueryKeys.all, 'list'] as const,
  list: (filter: CycleCountWorkListFilter) => [...cycleCountQueryKeys.lists(), filter] as const,
  detail: (id: string) => [...cycleCountQueryKeys.all, 'detail', id] as const,
};
