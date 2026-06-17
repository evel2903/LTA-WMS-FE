import { useQuery } from '@tanstack/react-query';

import { inventoryQueryKeys } from '@modules/Inventory/Application/Queries/InventoryQueryKeys';
import { inventoryRepository } from '@modules/Inventory/Infrastructure/Repositories/InventoryRepository';

/** Fetch a single inventory item by id. */
export function useInventoryItem(id: string) {
  return useQuery({
    queryKey: inventoryQueryKeys.detail(id),
    queryFn: () => inventoryRepository.getById(id),
    enabled: Boolean(id),
  });
}
