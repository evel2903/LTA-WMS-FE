import type { PaginatedResponse } from '@shared/Types/Api';
import type { InventoryItem } from '@modules/Inventory/Domain/Entities/InventoryItem';
import type {
  AdjustQuantityInput,
  InventoryListFilter,
} from '@modules/Inventory/Domain/Types/InventoryQuery';

/**
 * Domain port for inventory persistence. The Application layer programs
 * against this; Infrastructure implements it. Dependency inversion: the
 * arrow points from outer layers inward to this contract.
 */
export interface IInventoryRepository {
  list(filter: InventoryListFilter): Promise<PaginatedResponse<InventoryItem>>;
  getById(id: string): Promise<InventoryItem>;
  adjustQuantity(input: AdjustQuantityInput): Promise<InventoryItem>;
}
