/**
 * RBAC enums mirrored verbatim from the backend wire contract (AccessControl module).
 * Kept as string-literal unions so the FE never invents a permission model — the
 * backend is the source of truth (deny-by-default, 403 on over-permission).
 */

/** The six core V0 roles (BE RoleCode). */
export type RoleCode =
  | 'WMS_ADMIN'
  | 'WAREHOUSE_SUPERVISOR'
  | 'WAREHOUSE_COORDINATOR'
  | 'OPERATOR'
  | 'QC'
  | 'INVENTORY_ACCOUNTANT';

/** Display order + labels for the matrix columns and assignment selects. */
export const CORE_ROLE_CODES: RoleCode[] = [
  'WMS_ADMIN',
  'WAREHOUSE_SUPERVISOR',
  'WAREHOUSE_COORDINATOR',
  'OPERATOR',
  'QC',
  'INVENTORY_ACCOUNTANT',
];

export const ROLE_LABELS: Record<RoleCode, string> = {
  WMS_ADMIN: 'WMS Admin',
  WAREHOUSE_SUPERVISOR: 'Giám sát kho',
  WAREHOUSE_COORDINATOR: 'Điều phối kho',
  OPERATOR: 'Nhân viên vận hành',
  QC: 'QC',
  INVENTORY_ACCOUNTANT: 'Kế toán kho',
};

/** The four data-scope dimensions (BE DataScopeType). */
export type DataScopeType = 'WAREHOUSE' | 'ZONE' | 'OWNER' | 'CUSTOMER';

export const DATA_SCOPE_TYPES: DataScopeType[] = ['WAREHOUSE', 'ZONE', 'OWNER', 'CUSTOMER'];

export const DATA_SCOPE_LABELS: Record<DataScopeType, string> = {
  WAREHOUSE: 'Warehouse',
  ZONE: 'Zone',
  OWNER: 'Owner',
  CUSTOMER: 'Customer',
};
