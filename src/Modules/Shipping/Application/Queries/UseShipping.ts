import { useQuery } from '@tanstack/react-query';
import { shippingQueryKeys } from '@modules/Shipping/Application/Queries/ShippingQueryKeys';
import type { ShippingStagingListFilter } from '@modules/Shipping/Domain/Types/ShippingQuery';
import { shippingRepository } from '@modules/Shipping/Infrastructure/Repositories/ShippingRepositoryInstance';

export function useShippingStagingList(filter: ShippingStagingListFilter = {}) {
  return useQuery({
    queryKey: shippingQueryKeys.list(filter),
    queryFn: () => shippingRepository.list(filter),
  });
}

export function useShippingStaging(id: string | null) {
  return useQuery({
    queryKey: shippingQueryKeys.detail(id ?? ''),
    queryFn: () => shippingRepository.getById(id as string),
    enabled: Boolean(id),
  });
}

