import type { PaginatedResponse } from '@shared/Types/Api';
import type { InventoryItem } from '@modules/Inventory/Domain/Entities/InventoryItem';
import type {
  ChangeInventoryStatusInput,
  InventoryControlResult,
  MoveInventoryInternalInput,
} from '@modules/Inventory/Domain/Types/InventoryControl';
import type {
  AdjustQuantityInput,
  InventoryListFilter,
} from '@modules/Inventory/Domain/Types/InventoryQuery';

/**
 * Application port for inventory persistence. Use cases program against this
 * abstraction; Infrastructure implements it. Placed in Application/Interfaces
 * to mirror the backend's Clean Architecture per module (ports live with the
 * use cases that consume them). Dependency inversion: Infrastructure depends
 * inward on this contract.
 */
export interface IInventoryRepository {
  list(filter: InventoryListFilter): Promise<PaginatedResponse<InventoryItem>>;
  getById(id: string): Promise<InventoryItem>;
  adjustQuantity(input: AdjustQuantityInput): Promise<InventoryItem>;
  changeStatus(input: ChangeInventoryStatusInput): Promise<InventoryControlResult>;
  moveInternal(input: MoveInventoryInternalInput): Promise<InventoryControlResult>;
}
