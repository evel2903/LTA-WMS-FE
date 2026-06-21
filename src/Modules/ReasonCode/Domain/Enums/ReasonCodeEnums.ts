/**
 * Reason-code enums mirrored verbatim from the backend wire contract (C3 AccessControl).
 * Wire casing matters: ReasonGroup/Status/RoleCode are UPPER; ActionCode/ObjectType mixed-case.
 */

export type ReasonGroup =
  | 'RULE_OVERRIDE'
  | 'MASTER_DATA_CONFIG_CHANGE'
  | 'HOLD_RELEASE'
  | 'INVENTORY_ADJUSTMENT'
  | 'INTEGRATION'
  | 'MANUAL_FIX';

export const REASON_GROUPS: ReasonGroup[] = [
  'RULE_OVERRIDE',
  'MASTER_DATA_CONFIG_CHANGE',
  'HOLD_RELEASE',
  'INVENTORY_ADJUSTMENT',
  'INTEGRATION',
  'MANUAL_FIX',
];

export const REASON_GROUP_LABELS: Record<ReasonGroup, string> = {
  RULE_OVERRIDE: 'Rule Override',
  MASTER_DATA_CONFIG_CHANGE: 'Master Data / Config Change',
  HOLD_RELEASE: 'Hold / Release',
  INVENTORY_ADJUSTMENT: 'Inventory Adjustment',
  INTEGRATION: 'Integration',
  MANUAL_FIX: 'Manual Fix',
};

export type ReasonCodeStatus = 'ACTIVE' | 'INACTIVE';
export const REASON_CODE_STATUSES: ReasonCodeStatus[] = ['ACTIVE', 'INACTIVE'];

export type ActionCode =
  | 'Create'
  | 'Read'
  | 'Update'
  | 'DeleteCancel'
  | 'Approve'
  | 'Override'
  | 'Unlock'
  | 'Reprint'
  | 'Adjust';

export const ACTION_CODES: ActionCode[] = [
  'Create',
  'Read',
  'Update',
  'DeleteCancel',
  'Approve',
  'Override',
  'Unlock',
  'Reprint',
  'Adjust',
];

export type ObjectType =
  | 'Site'
  | 'Warehouse'
  | 'Zone'
  | 'Location'
  | 'LocationProfile'
  | 'Owner'
  | 'SKU'
  | 'UOM'
  | 'ItemCoverage'
  | 'InventoryStatus'
  | 'WarehouseProfile'
  | 'Rule'
  | 'Role'
  | 'Permission'
  | 'UserAssignment'
  | 'ReasonCode'
  | 'ApprovalRequest'
  | 'OverrideLog'
  | 'AuditLog'
  | 'ExceptionCase';

export const OBJECT_TYPES: ObjectType[] = [
  'Site',
  'Warehouse',
  'Zone',
  'Location',
  'LocationProfile',
  'Owner',
  'SKU',
  'UOM',
  'ItemCoverage',
  'InventoryStatus',
  'WarehouseProfile',
  'Rule',
  'Role',
  'Permission',
  'UserAssignment',
  'ReasonCode',
  'ApprovalRequest',
  'OverrideLog',
  'AuditLog',
  'ExceptionCase',
];

export type RoleCode =
  | 'WMS_ADMIN'
  | 'WAREHOUSE_SUPERVISOR'
  | 'WAREHOUSE_COORDINATOR'
  | 'OPERATOR'
  | 'QC'
  | 'INVENTORY_ACCOUNTANT';

export const ROLE_CODES: RoleCode[] = [
  'WMS_ADMIN',
  'WAREHOUSE_SUPERVISOR',
  'WAREHOUSE_COORDINATOR',
  'OPERATOR',
  'QC',
  'INVENTORY_ACCOUNTANT',
];
