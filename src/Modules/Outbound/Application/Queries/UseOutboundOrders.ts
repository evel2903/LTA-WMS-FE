import { useQuery } from '@tanstack/react-query';
import { outboundQueryKeys } from '@modules/Outbound/Application/Queries/OutboundQueryKeys';
import type {
  AllocationListFilter,
  OutboundOrderListFilter,
  PickReleaseListFilter,
} from '@modules/Outbound/Domain/Types/OutboundOrderQuery';
import { outboundRepository } from '@modules/Outbound/Infrastructure/Repositories/OutboundRepositoryInstance';

export function useOutboundOrders(
  filter: OutboundOrderListFilter = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: outboundQueryKeys.list(filter),
    queryFn: () => outboundRepository.list(filter),
    enabled: options.enabled ?? true,
  });
}

export function useOutboundOrder(id: string | null) {
  return useQuery({
    queryKey: outboundQueryKeys.detail(id ?? ''),
    queryFn: () => outboundRepository.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useOutboundAllocations(
  orderId: string | null,
  filter: AllocationListFilter = {},
) {
  return useQuery({
    queryKey: outboundQueryKeys.allocationList(orderId ?? '', filter),
    queryFn: () => outboundRepository.listAllocations(orderId as string, filter),
    enabled: Boolean(orderId),
  });
}

export function useOutboundPickReleases(
  orderId: string | null,
  filter: PickReleaseListFilter = {},
) {
  return useQuery({
    queryKey: outboundQueryKeys.releaseList(orderId ?? '', filter),
    queryFn: () => outboundRepository.listReleases(orderId as string, filter),
    enabled: Boolean(orderId),
  });
}
