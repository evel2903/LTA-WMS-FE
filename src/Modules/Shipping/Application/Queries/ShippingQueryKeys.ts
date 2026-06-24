import type { ShippingStagingListFilter } from '@modules/Shipping/Domain/Types/ShippingQuery';

export const shippingQueryKeys = {
  all: ['shipping'] as const,
  lists: () => [...shippingQueryKeys.all, 'list'] as const,
  list: (filter: ShippingStagingListFilter) => [...shippingQueryKeys.lists(), filter] as const,
  detail: (id: string) => [...shippingQueryKeys.all, 'detail', id] as const,
};

