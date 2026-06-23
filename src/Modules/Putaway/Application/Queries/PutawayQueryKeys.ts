import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type { PutawayTaskListFilter } from '@modules/Putaway/Domain/Types/PutawayTaskQuery';

export const putawayQueryKeys = {
  all: [QUERY_NAMESPACES.PUTAWAY] as const,
  lists: () => [...putawayQueryKeys.all, 'list'] as const,
  list: (filter?: PutawayTaskListFilter) => [...putawayQueryKeys.lists(), filter ?? {}] as const,
  detail: (id: string) => [...putawayQueryKeys.all, 'detail', id] as const,
};
