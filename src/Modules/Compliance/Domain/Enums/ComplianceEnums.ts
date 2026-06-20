/**
 * Audit + Exception enums mirrored verbatim from the backend wire contract
 * (AccessControl module). Wire casing matters: ActionCode/ObjectType are mixed-case;
 * AuditResult/ActorType/ExceptionState/SubStatus/Outcome/Severity are UPPER.
 */

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

export type AuditResult = 'SUCCESS' | 'FAILED' | 'BLOCKED';
export type ActorType = 'USER' | 'SYSTEM';

export type ExceptionState =
  | 'DETECTED'
  | 'LOGGED'
  | 'ASSIGNED'
  | 'IN_REVIEW_PENDING_APPROVAL'
  | 'RESOLVED'
  | 'CLOSED';

export const EXCEPTION_STATES: ExceptionState[] = [
  'DETECTED',
  'LOGGED',
  'ASSIGNED',
  'IN_REVIEW_PENDING_APPROVAL',
  'RESOLVED',
  'CLOSED',
];

export const EXCEPTION_STATE_LABELS: Record<ExceptionState, string> = {
  DETECTED: 'Detected',
  LOGGED: 'Logged',
  ASSIGNED: 'Assigned',
  IN_REVIEW_PENDING_APPROVAL: 'In Review / Pending Approval',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export type ExceptionSubStatus =
  | 'AUTO_BLOCKED'
  | 'REJECTED'
  | 'REASSIGNED'
  | 'ESCALATED'
  | 'REWORK';

export type ExceptionOutcome = 'AUTO_CLOSED' | 'CANCELLED' | 'DUPLICATE';

export type ControlExceptionSeverity = 'HIGH' | 'MEDIUM' | 'LOW';
export const SEVERITIES: ControlExceptionSeverity[] = ['HIGH', 'MEDIUM', 'LOW'];

/** The single legal lifecycle action available from each state (state machine is linear). */
export type ExceptionAction = 'Log' | 'Assign' | 'Submit' | 'Resolve' | 'Close';

export const EXCEPTION_NEXT_ACTION: Record<ExceptionState, ExceptionAction | null> = {
  DETECTED: 'Log',
  LOGGED: 'Assign',
  ASSIGNED: 'Submit',
  IN_REVIEW_PENDING_APPROVAL: 'Resolve',
  RESOLVED: 'Close',
  CLOSED: null,
};
