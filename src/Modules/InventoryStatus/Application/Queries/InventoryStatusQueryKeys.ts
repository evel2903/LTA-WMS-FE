import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type { InventoryStatusFilter } from '@modules/InventoryStatus/Domain/Types/InventoryStatusTypes';

export const inventoryStatusQueryKeys = {
  all: [QUERY_NAMESPACES.INVENTORY_STATUS] as const,
  list: (filter?: InventoryStatusFilter) =>
    [...inventoryStatusQueryKeys.all, 'list', filter ?? {}] as const,
  detail: (id: string) => [...inventoryStatusQueryKeys.all, 'detail', id] as const,
};
