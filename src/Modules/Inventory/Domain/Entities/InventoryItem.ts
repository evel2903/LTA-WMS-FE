import type { Id, ISODateString } from '@shared/Types/Common';

export type InventoryItemId = Id<'InventoryItem'>;

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

/**
 * Domain entity for a stock-keeping unit at a location. Pure data + behaviour;
 * no framework, transport, or DTO knowledge.
 */
export interface InventoryItem {
  id: InventoryItemId;
  sku: string;
  productName: string;
  warehouseId: string;
  locationCode: string;
  quantityOnHand: number;
  quantityReserved: number;
  reorderPoint: number;
  unitOfMeasure: string;
  updatedAt: ISODateString;
}

/** Domain rule: stock physically available to allocate. */
export function availableQuantity(item: InventoryItem): number {
  return Math.max(0, item.quantityOnHand - item.quantityReserved);
}

/** Domain rule: derive stock status from quantities and reorder policy. */
export function stockStatus(item: InventoryItem): StockStatus {
  const available = availableQuantity(item);
  if (available <= 0) return 'OUT_OF_STOCK';
  if (available <= item.reorderPoint) return 'LOW_STOCK';
  return 'IN_STOCK';
}
