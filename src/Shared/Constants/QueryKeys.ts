/**
 * Root namespaces for TanStack Query keys. Each module composes its own keys
 * under its namespace (see `Modules/<Name>/Application/Queries/*Keys.ts`),
 * keeping cache invalidation collision-free across modules.
 */
export const QUERY_NAMESPACES = {
  AUTH: 'auth',
  INVENTORY: 'inventory',
  MASTER_DATA: 'masterData',
  ACCESS_CONTROL: 'accessControl',
  COMPLIANCE: 'compliance',
  REASON_CODE: 'reasonCode',
  INVENTORY_STATUS: 'inventoryStatus',
  WAREHOUSE_PROFILE: 'warehouseProfile',
  WAREHOUSE: 'warehouse',
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
  PICKING: 'picking',
  PACKING: 'packing',
  SHIPPING: 'shipping',
  STOCK_TRANSFER: 'stockTransfer',
  STOCK_ADJUSTMENT: 'stockAdjustment',
  CYCLE_COUNT: 'cycleCount',
  REPORTS: 'reports',
} as const;
