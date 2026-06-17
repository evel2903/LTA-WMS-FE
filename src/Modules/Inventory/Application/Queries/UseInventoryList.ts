import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { InventoryListFilter } from '@modules/Inventory/Domain/Types/InventoryQuery';
import { GetInventoryListUseCase } from '@modules/Inventory/Application/UseCases/GetInventoryListUseCase';
import { inventoryQueryKeys } from '@modules/Inventory/Application/Queries/InventoryQueryKeys';
import { inventoryRepository } from '@modules/Inventory/Infrastructure/Repositories/InventoryRepository';

const getInventoryList = new GetInventoryListUseCase(inventoryRepository);

/**
 * Server-state hook (TanStack Query) wrapping the list use case. Components
 * consume this and stay declarative — no fetching, no repository wiring.
 */
export function useInventoryList(filter: InventoryListFilter) {
  return useQuery({
    queryKey: inventoryQueryKeys.list(filter),
    queryFn: () => getInventoryList.execute(filter),
    placeholderData: keepPreviousData, // smooth pagination — no flash of empty state
  });
}
