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
    LOCATION_PROFILES: '/foundation/location-profiles',
    WAREHOUSE_PROFILES: '/foundation/warehouse-profiles',
    RULE_MATRIX: '/foundation/rule-matrix',
    MASTER_DATA: {
      OWNERS: '/foundation/master-data/owners',
      UOMS: '/foundation/master-data/uoms',
      SKUS: '/foundation/master-data/skus',
      PARTNERS: '/foundation/master-data/partners',
    },
    ACCESS: {
      ROLES: '/foundation/access/roles',
      USERS: '/foundation/access/users',
    },
    AUDIT: '/foundation/audit',
    EXCEPTIONS: '/foundation/exceptions',
    REASON_CODES: '/foundation/reason-codes',
    INVENTORY_STATUS: '/foundation/inventory-status',
    APPROVALS: '/foundation/approvals',
    OVERRIDES: '/foundation/overrides',
    CONTROL_CATALOG: '/foundation/control-catalog',
  },
  WAREHOUSE: { ROOT: '/warehouse' },
  INBOUND: { ROOT: '/inbound' },
  PUTAWAY: { ROOT: '/putaway' },
  REPLENISHMENT: { ROOT: '/replenishment' },
  OUTBOUND: { ROOT: '/outbound' },
  PICKING: { ROOT: '/picking' },
  PACKING: { ROOT: '/packing' },
  SHIPPING: { ROOT: '/shipping' },
  MOBILE: {
    TASKS: '/mobile/tasks',
  },
  LABELS: {
    ROOT: '/labels',
  },
  STOCK_TRANSFER: { ROOT: '/stock-transfer' },
  STOCK_ADJUSTMENT: { ROOT: '/stock-adjustment' },
  CYCLE_COUNT: { ROOT: '/cycle-count' },
  REPORTS: { ROOT: '/reports' },

  NOT_FOUND: '*',
} as const;
