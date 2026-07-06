import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { inventorySerialLookupQueryKeys } from '@modules/InventoryLookup/Application/Queries/InventorySerialLookupQueryKeys';
import type { InventorySerialLookupFilter } from '@modules/InventoryLookup/Domain/Types/InventorySerialLookupQuery';
import { inventorySerialLookupRepository } from '@modules/InventoryLookup/Infrastructure/Repositories/InventorySerialLookupRepositoryInstance';

/**
 * Disabled until a SKU is chosen — the endpoint scopes every lookup to a SKU,
 * so an unscoped call would just be the whole warehouse's inventory.
 */
export function useInventorySerialLookup(filter: InventorySerialLookupFilter) {
  return useQuery({
    queryKey: inventorySerialLookupQueryKeys.list(filter),
    queryFn: () => inventorySerialLookupRepository.list(filter),
    enabled: Boolean(filter.skuId),
    placeholderData: keepPreviousData,
  });
}
