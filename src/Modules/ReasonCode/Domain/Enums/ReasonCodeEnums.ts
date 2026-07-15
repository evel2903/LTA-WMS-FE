/**
 * Reason-code enums mirrored verbatim from the backend wire contract (C3 AccessControl).
 * Wire casing matters: ReasonGroup/Status/RoleCode are UPPER; ActionCode/ObjectType mixed-case.
 */
import type { SystemRoleCode } from '@shared/Types/SystemRoleCode';

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
  | 'ExceptionCase'
  | 'Partner'
  | 'CoreFlow'
  | 'InboundPlan'
  | 'Receipt'
  | 'QcTask'
  | 'PutawayTask'
  | 'InventoryMovement'
  | 'CycleCount'
  | 'ReplenishmentTask'
  | 'OutboundOrder'
  | 'Allocation'
  | 'PickTask'
  | 'Package'
  | 'Shipment'
  | 'Load'
  | 'GoodsIssue'
  | 'MobileTask'
  | 'LabelTemplate'
  | 'PrintJob'
  | 'IntegrationMessage'
  | 'DeadLetterMessage'
  | 'ReconciliationRun';

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
  'Partner',
  'CoreFlow',
  'InboundPlan',
  'Receipt',
  'QcTask',
  'PutawayTask',
  'InventoryMovement',
  'CycleCount',
  'ReplenishmentTask',
  'OutboundOrder',
  'Allocation',
  'PickTask',
  'Package',
  'Shipment',
  'Load',
  'GoodsIssue',
  'MobileTask',
  'LabelTemplate',
  'PrintJob',
  'IntegrationMessage',
  'DeadLetterMessage',
  'ReconciliationRun',
];

/**
 * Type-only alias to the shared `SystemRoleCode` union (RA-03 review fix — was importing
 * AccessControl's Domain directly, a cross-module violation). Reason-code role restriction
 * is system-role-only by design (Signal 1, RATIFIED), so this stays the closed 6-code union
 * even though AccessControl's own `RoleCode` widened to `string`. Runtime `ROLE_CODES` below
 * is unchanged.
 */
export type RoleCode = SystemRoleCode;

export const ROLE_CODES: RoleCode[] = [
  'WMS_ADMIN',
  'WAREHOUSE_SUPERVISOR',
  'WAREHOUSE_COORDINATOR',
  'OPERATOR',
  'QC',
  'INVENTORY_ACCOUNTANT',
];
