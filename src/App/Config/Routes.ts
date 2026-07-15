function routeParam(value: string): string {
  return value === ':id' ? value : encodeURIComponent(value);
}

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
  INVENTORY_LOOKUP: {
    ROOT: '/inventory-lookup',
  },
  FOUNDATION: {
    ROOT: '/foundation',
    SITES: '/foundation/sites',
    LOCATIONS: '/foundation/locations',
    LOCATION_MAP: (warehouseId = ':warehouseId') =>
      warehouseId === ':warehouseId'
        ? '/foundation/locations/:warehouseId/map'
        : `/foundation/locations/${encodeURIComponent(warehouseId)}/map`,
    ZONES: '/foundation/zones',
    PHYSICAL_LOCATIONS: '/foundation/physical-locations',
    WAREHOUSE_TYPES: '/foundation/warehouse-types',
    LOCATION_PROFILES: '/foundation/location-profiles',
    LOCATION_PROFILE_NEW: '/foundation/location-profiles/new',
    LOCATION_PROFILE_DETAIL: (id = ':id') => `/foundation/location-profiles/${id}`,
    LOCATION_PROFILE_EDIT: (id = ':id') => `/foundation/location-profiles/${id}/edit`,
    WAREHOUSE_PROFILES: '/foundation/warehouse-profiles',
    WAREHOUSE_PROFILE_NEW: '/foundation/warehouse-profiles/new',
    WAREHOUSE_PROFILE_DETAIL: (id = ':id') => `/foundation/warehouse-profiles/${id}`,
    WAREHOUSE_PROFILE_EDIT: (id = ':id') => `/foundation/warehouse-profiles/${id}/edit`,
    RULE_MATRIX: '/foundation/rule-matrix',
    RULE_MATRIX_PREVIEW: '/foundation/rule-matrix/preview',
    MASTER_DATA: {
      OWNERS: '/foundation/master-data/owners',
      OWNER_NEW: '/foundation/master-data/owners/new',
      OWNER_DETAIL: (id = ':id') => `/foundation/master-data/owners/${id}`,
      OWNER_EDIT: (id = ':id') => `/foundation/master-data/owners/${id}/edit`,
      UOMS: '/foundation/master-data/uoms',
      SKUS: '/foundation/master-data/skus',
      SKU_NEW: '/foundation/master-data/skus/new',
      SKU_DETAIL: (id = ':id') => `/foundation/master-data/skus/${id}`,
      SKU_EDIT: (id = ':id') => `/foundation/master-data/skus/${id}/edit`,
      PARTNERS: '/foundation/master-data/partners',
      PARTNER_NEW: '/foundation/master-data/partners/new',
      PARTNER_DETAIL: (id = ':id') => `/foundation/master-data/partners/${id}`,
      PARTNER_EDIT: (id = ':id') => `/foundation/master-data/partners/${id}/edit`,
    },
    ACCESS: {
      ROLES: '/foundation/access/roles',
      ROLE_DETAIL: (id = ':id') => `/foundation/access/roles/${id}`,
      PERMISSION_MATRIX: '/foundation/access/permission-matrix',
      USERS: '/foundation/access/users',
      USER_DETAIL: (id = ':id') => `/foundation/access/users/${id}`,
      USER_EDIT: (id = ':id') => `/foundation/access/users/${id}/edit`,
    },
    AUDIT: '/foundation/audit',
    AUDIT_DETAIL: (id = ':id') => `/foundation/audit/${routeParam(id)}`,
    EXCEPTIONS: '/foundation/exceptions',
    REASON_CODES: '/foundation/reason-codes',
    REASON_CODE_NEW: '/foundation/reason-codes/new',
    REASON_CODE_DETAIL: (id = ':id') => `/foundation/reason-codes/${id}`,
    REASON_CODE_EDIT: (id = ':id') => `/foundation/reason-codes/${id}/edit`,
    INVENTORY_STATUS: '/foundation/inventory-status',
    INVENTORY_STATUS_DETAIL: (id = ':id') => `/foundation/inventory-status/${id}`,
    INVENTORY_STATUS_EDIT: (id = ':id') => `/foundation/inventory-status/${id}/edit`,
    APPROVALS: '/foundation/approvals',
    APPROVAL_DETAIL: (id = ':id') => `/foundation/approvals/${id}`,
    APPROVAL_ACTION: (id = ':id') => `/foundation/approvals/${id}/action`,
    OVERRIDES: '/foundation/overrides',
    OVERRIDE_DETAIL: (id = ':id') => `/foundation/overrides/${routeParam(id)}`,
    CONTROL_CATALOG: '/foundation/control-catalog',
    EXCEPTION_DETAIL: (id = ':id') => `/foundation/exceptions/${id}`,
    EXCEPTION_ACTION: (id = ':id') => `/foundation/exceptions/${id}/action`,
  },
  WAREHOUSE: { ROOT: '/warehouse' },
  INBOUND: {
    ROOT: '/inbound',
    NEW: '/inbound/new',
    DETAIL: (id = ':id') => `/inbound/${id}`,
    ACTION: (id = ':id', action = ':action') => `/inbound/${id}/${action}`,
    DISCREPANCY: (id = ':id', lineId = ':lineId') => `/inbound/${id}/discrepancy/${lineId}`,
  },
  PUTAWAY: {
    ROOT: '/putaway',
    DETAIL: (id = ':id') => `/putaway/${id}`,
    ACTION: (id = ':id', action = ':action') => `/putaway/${id}/${action}`,
  },
  REPLENISHMENT: {
    ROOT: '/replenishment',
    NEW: '/replenishment/new',
    DETAIL: (id = ':id') => `/replenishment/${id}`,
    ACTION: (id = ':id', action = ':action') => `/replenishment/${id}/${action}`,
  },
  OUTBOUND: {
    ROOT: '/outbound',
    NEW: '/outbound/new',
    DETAIL: (id = ':id') => `/outbound/${id}`,
    ACTION: (id = ':id', action = ':action') => `/outbound/${id}/${action}`,
  },
  PICKING: { ROOT: '/picking' },
  PACKING: {
    ROOT: '/packing',
    NEW: '/packing/new',
    DETAIL: (id = ':id') => `/packing/${id}`,
    ACTION: (id = ':id', action = ':action') => `/packing/${id}/${action}`,
  },
  SHIPPING: {
    ROOT: '/shipping',
    NEW: '/shipping/new',
    DETAIL: (id = ':id') => `/shipping/${id}`,
    ACTION: (id = ':id', action = ':action') => `/shipping/${id}/${action}`,
  },
  INTEGRATION: {
    ROOT: '/integration',
    DEAD_LETTER_DETAIL: (id = ':id') => `/integration/dead-letters/${id}`,
    DEAD_LETTER_ACTION: (id = ':id', action = ':action') => `/integration/dead-letters/${id}/${action}`,
    RECONCILIATION: '/integration/reconciliation',
    RECONCILIATION_DETAIL: (id = ':id') => `/integration/reconciliation/${id}`,
    RECONCILIATION_ACTION: (id = ':id', action = ':action') => `/integration/reconciliation/${id}/${action}`,
  },
  MOBILE: {
    TASKS: '/mobile/tasks',
    TASK_DETAIL: (id = ':id') => `/mobile/tasks/${id}`,
    TASK_ACTION: (id = ':id', action = ':action') => `/mobile/tasks/${id}/${action}`,
  },
  LABELS: {
    ROOT: '/labels',
    NEW: '/labels/new',
    TEMPLATE_DETAIL: (templateId = ':templateId') => `/labels/templates/${templateId}`,
    TEMPLATE_ACTION: (templateId = ':templateId', action = ':action') =>
      `/labels/templates/${templateId}/${action}`,
    PRINT_JOB_DETAIL: (printJobId = ':printJobId') => `/labels/print-jobs/${printJobId}`,
    PRINT_JOB_ACTION: (printJobId = ':printJobId', action = ':action') =>
      `/labels/print-jobs/${printJobId}/${action}`,
  },
  STOCK_TRANSFER: { ROOT: '/stock-transfer' },
  STOCK_ADJUSTMENT: { ROOT: '/stock-adjustment' },
  CYCLE_COUNT: {
    ROOT: '/cycle-count',
    NEW: '/cycle-count/new',
    DETAIL: (id = ':id') => `/cycle-count/${id}`,
    ACTION: (id = ':id', action = ':action') => `/cycle-count/${id}/${action}`,
  },
  REPORTS: { ROOT: '/reports' },

  NOT_FOUND: '*',
} as const;
