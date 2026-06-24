import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type { OutboundOrderListFilter } from '@modules/Outbound/Domain/Types/OutboundOrderQuery';

export const outboundQueryKeys = {
  all: [QUERY_NAMESPACES.OUTBOUND] as const,
  lists: () => [...outboundQueryKeys.all, 'list'] as const,
  list: (filter: OutboundOrderListFilter) => [...outboundQueryKeys.lists(), filter] as const,
  detail: (id: string) => [...outboundQueryKeys.all, 'detail', id] as const,
};
