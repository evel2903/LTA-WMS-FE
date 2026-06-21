import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { inventoryStatusQueryKeys } from '@modules/InventoryStatus/Application/Queries/InventoryStatusQueryKeys';
import type { InventoryStatusFilter } from '@modules/InventoryStatus/Domain/Types/InventoryStatusTypes';
import { inventoryStatusRepository } from '@modules/InventoryStatus/Infrastructure/Repositories/InventoryStatusRepositoryInstance';

export function useInventoryStatuses(filter: InventoryStatusFilter = {}) {
  return useQuery({
    queryKey: inventoryStatusQueryKeys.list(filter),
    queryFn: () => inventoryStatusRepository.list(filter),
    placeholderData: keepPreviousData, // keep rows + pager mounted during page/filter refetch
  });
}

export function useInventoryStatusDetail(id: string | null) {
  return useQuery({
    queryKey: inventoryStatusQueryKeys.detail(id ?? ''),
    queryFn: () => inventoryStatusRepository.getById(id ?? ''),
    enabled: Boolean(id),
  });
}
