import type { StockStatus } from '@modules/Inventory/Domain/Entities/InventoryItem';

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  IN_STOCK: 'In stock',
  LOW_STOCK: 'Low stock',
  OUT_OF_STOCK: 'Out of stock',
};

export const DEFAULT_PAGE_SIZE = 20;
