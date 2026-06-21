/**
 * Override-log enums mirrored verbatim from the backend wire contract (WarehouseProfile / C7).
 * Wire casing matters: RuleControlMode is UPPER_SNAKE; ActionCode/ObjectType are mixed-case.
 * Re-declared locally so the module stays self-contained (modules never import each other's enums).
 */

export type RuleControlMode =
  | 'HARD_BLOCK'
  | 'APPROVAL_REQUIRED'
  | 'SOFT_WARNING'
  | 'AUTO_SUGGESTION';

export const RULE_CONTROL_MODES: RuleControlMode[] = [
  'HARD_BLOCK',
  'APPROVAL_REQUIRED',
  'SOFT_WARNING',
  'AUTO_SUGGESTION',
];

export const RULE_CONTROL_MODE_LABELS: Record<RuleControlMode, string> = {
  HARD_BLOCK: 'Hard block',
  APPROVAL_REQUIRED: 'Approval required',
  SOFT_WARNING: 'Soft warning',
  AUTO_SUGGESTION: 'Auto suggestion',
};

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
