import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type { InventoryListFilter } from '@modules/Inventory/Domain/Types/InventoryQuery';

/** Hierarchical, module-scoped query keys for cache invalidation. */
export const inventoryQueryKeys = {
  all: [QUERY_NAMESPACES.INVENTORY] as const,
  lists: () => [...inventoryQueryKeys.all, 'list'] as const,
  list: (filter: InventoryListFilter) => [...inventoryQueryKeys.lists(), filter] as const,
  details: () => [...inventoryQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...inventoryQueryKeys.details(), id] as const,
};
