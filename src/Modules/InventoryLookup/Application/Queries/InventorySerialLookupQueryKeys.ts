import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type { InventorySerialLookupFilter } from '@modules/InventoryLookup/Domain/Types/InventorySerialLookupQuery';

export const inventorySerialLookupQueryKeys = {
  all: [QUERY_NAMESPACES.INVENTORY_LOOKUP] as const,
  lists: () => [...inventorySerialLookupQueryKeys.all, 'list'] as const,
  list: (filter: InventorySerialLookupFilter) =>
    [...inventorySerialLookupQueryKeys.lists(), filter] as const,
};
