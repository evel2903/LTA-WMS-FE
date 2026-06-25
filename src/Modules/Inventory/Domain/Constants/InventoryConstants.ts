import type { StockStatus } from '@modules/Inventory/Domain/Entities/InventoryItem';

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  IN_STOCK: 'Khả dụng',
  LOW_STOCK: 'Sắp hết',
  OUT_OF_STOCK: 'Hết hàng',
};

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;
