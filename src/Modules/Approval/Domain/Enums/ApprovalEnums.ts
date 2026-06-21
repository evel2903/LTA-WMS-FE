/**
 * Approval enums mirrored verbatim from the backend wire contract (AccessControl / C6).
 * Wire casing matters: ApprovalDecision is UPPER; ActionCode/ObjectType are mixed-case.
 * Re-declared locally so the module stays self-contained (modules never import each other's enums).
 */

export type ApprovalDecision = 'PENDING' | 'APPROVED' | 'REJECTED';

export const APPROVAL_DECISIONS: ApprovalDecision[] = ['PENDING', 'APPROVED', 'REJECTED'];

export const APPROVAL_DECISION_LABELS: Record<ApprovalDecision, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
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
