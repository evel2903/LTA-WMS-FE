import type { PaginatedResponse } from '@shared/Types/Api';
import type { InventoryStatus } from '@modules/InventoryStatus/Domain/Entities/InventoryStatus';
import type {
  InventoryStatusFilter,
  UpdateInventoryStatusInput,
} from '@modules/InventoryStatus/Domain/Types/InventoryStatusTypes';

/**
 * Application port for the inventory-status catalog (C14). Read + controlled update only —
 * there is no create/delete (a status in use must not be removed).
 */
export interface IInventoryStatusRepository {
  list(filter?: InventoryStatusFilter): Promise<PaginatedResponse<InventoryStatus>>;
  getById(id: string): Promise<InventoryStatus>;
  update(id: string, input: UpdateInventoryStatusInput): Promise<InventoryStatus>;
}
