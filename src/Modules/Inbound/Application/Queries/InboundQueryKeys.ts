import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type { InboundPlanFilter } from '@modules/Inbound/Domain/Types/InboundPlanQuery';

export const inboundQueryKeys = {
  all: [QUERY_NAMESPACES.INBOUND] as const,
  lists: () => [...inboundQueryKeys.all, 'list'] as const,
  list: (filter?: InboundPlanFilter) => [...inboundQueryKeys.lists(), filter ?? {}] as const,
  detail: (id: string) => [...inboundQueryKeys.all, 'detail', id] as const,
  readiness: (id: string) => [...inboundQueryKeys.all, 'readiness', id] as const,
  operationalState: (id: string) => [...inboundQueryKeys.all, 'operational-state', id] as const,
};
