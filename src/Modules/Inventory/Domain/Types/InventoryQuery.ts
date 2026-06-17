import type { PaginationParams } from '@shared/Types/Api';
import type { StockStatus } from '@modules/Inventory/Domain/Entities/InventoryItem';

/** Filter criteria for listing inventory. Domain-level vocabulary, not query strings. */
export interface InventoryListFilter extends PaginationParams {
  warehouseId?: string;
  status?: StockStatus;
}

/** Payload to adjust on-hand quantity for an item. */
export interface AdjustQuantityInput {
  itemId: string;
  delta: number;
  reason: string;
}
