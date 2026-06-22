/**
 * Root namespaces for TanStack Query keys. Each module composes its own keys
 * under its namespace (see `Modules/<Name>/Application/Queries/*Keys.ts`),
 * keeping cache invalidation collision-free across modules.
 */
export const QUERY_NAMESPACES = {
  AUTH: 'auth',
  INVENTORY: 'inventory',
  MASTER_DATA: 'masterData',
  PARTNER_MASTER: 'partnerMaster',
  FOUNDATION_OVERVIEW: 'foundationOverview',
  ACCESS_CONTROL: 'accessControl',
  COMPLIANCE: 'compliance',
  REASON_CODE: 'reasonCode',
  INVENTORY_STATUS: 'inventoryStatus',
  APPROVAL: 'approval',
  OVERRIDE_LOG: 'overrideLog',
  CONTROL_VALIDATION_CATALOG: 'controlValidationCatalog',
  TASK_EXECUTION: 'taskExecution',
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
