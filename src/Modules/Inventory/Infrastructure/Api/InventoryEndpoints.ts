/** Inventory endpoint paths (relative to the API prefix). */
export const INVENTORY_ENDPOINTS = {
  LIST: '/inventory',
  BY_ID: (id: string) => `/inventory/${id}`,
  ADJUST: (id: string) => `/inventory/${id}/adjust`,
} as const;
