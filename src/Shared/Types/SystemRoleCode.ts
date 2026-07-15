/**
 * Closed union of the six seeded WMS system role codes (BE RoleCode). Shared
 * across AccessControl (source of truth for RBAC) and ReasonCode (role-scoped
 * reason-code restriction) so neither module imports the other's Domain internals.
 */
export type SystemRoleCode =
  | 'WMS_ADMIN'
  | 'WAREHOUSE_SUPERVISOR'
  | 'WAREHOUSE_COORDINATOR'
  | 'OPERATOR'
  | 'QC'
  | 'INVENTORY_ACCOUNTANT';
