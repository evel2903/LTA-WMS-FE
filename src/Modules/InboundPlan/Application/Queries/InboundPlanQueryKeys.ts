import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type { InboundPlanFilter } from '@modules/InboundPlan/Domain/Types/InboundPlanQuery';

export const inboundPlanQueryKeys = {
  all: [QUERY_NAMESPACES.INBOUND_PLAN] as const,
  lists: () => [...inboundPlanQueryKeys.all, 'list'] as const,
  list: (filter?: InboundPlanFilter) => [...inboundPlanQueryKeys.lists(), filter ?? {}] as const,
  detail: (id: string) => [...inboundPlanQueryKeys.all, 'detail', id] as const,
};
