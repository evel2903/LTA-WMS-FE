import { useQuery } from '@tanstack/react-query';
import { outboundQueryKeys } from '@modules/Outbound/Application/Queries/OutboundQueryKeys';
import type { OutboundOrderListFilter } from '@modules/Outbound/Domain/Types/OutboundOrderQuery';
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
