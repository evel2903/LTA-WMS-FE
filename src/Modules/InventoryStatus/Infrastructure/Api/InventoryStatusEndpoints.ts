/** Root-path endpoint constants for the inventory-status catalog (no /api/v1 prefix). */
export const INVENTORY_STATUS_ENDPOINTS = {
  INVENTORY_STATUSES: '/inventory-statuses',
  INVENTORY_STATUS_BY_ID: (id: string) => `/inventory-statuses/${id}`,
} as const;
