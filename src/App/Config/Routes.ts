/**
 * Centralised route path registry. Reference these constants instead of
 * hard-coding string paths so refactors stay safe across modules.
 */
export const ROUTES = {
  ROOT: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',

  INVENTORY: {
    ROOT: '/inventory',
    DETAIL: (id = ':id') => `/inventory/${id}`,
  },
  FOUNDATION: {
    ROOT: '/foundation',
    LOCATIONS: '/foundation/locations',
  },
  WAREHOUSE: { ROOT: '/warehouse' },
  INBOUND: { ROOT: '/inbound' },
  OUTBOUND: { ROOT: '/outbound' },
  PICKING: { ROOT: '/picking' },
  PACKING: { ROOT: '/packing' },
  SHIPPING: { ROOT: '/shipping' },
  STOCK_TRANSFER: { ROOT: '/stock-transfer' },
  STOCK_ADJUSTMENT: { ROOT: '/stock-adjustment' },
  CYCLE_COUNT: { ROOT: '/cycle-count' },
  REPORTS: { ROOT: '/reports' },

  NOT_FOUND: '*',
} as const;
