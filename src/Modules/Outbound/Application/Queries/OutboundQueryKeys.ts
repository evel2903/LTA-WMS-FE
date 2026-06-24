import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type {
  AllocationListFilter,
  OutboundOrderListFilter,
  PickReleaseListFilter,
} from '@modules/Outbound/Domain/Types/OutboundOrderQuery';

export const outboundQueryKeys = {
  all: [QUERY_NAMESPACES.OUTBOUND] as const,
  lists: () => [...outboundQueryKeys.all, 'list'] as const,
  list: (filter: OutboundOrderListFilter) => [...outboundQueryKeys.lists(), filter] as const,
  detail: (id: string) => [...outboundQueryKeys.all, 'detail', id] as const,
  allocationLists: (orderId: string) => [...outboundQueryKeys.all, 'allocation-list', orderId] as const,
  allocationList: (orderId: string, filter: AllocationListFilter) =>
    [...outboundQueryKeys.allocationLists(orderId), filter] as const,
  allocationDetail: (id: string) => [...outboundQueryKeys.all, 'allocation-detail', id] as const,
  releaseLists: (orderId: string) => [...outboundQueryKeys.all, 'release-list', orderId] as const,
  releaseList: (orderId: string, filter: PickReleaseListFilter) =>
    [...outboundQueryKeys.releaseLists(orderId), filter] as const,
  releaseDetail: (id: string) => [...outboundQueryKeys.all, 'release-detail', id] as const,
};
