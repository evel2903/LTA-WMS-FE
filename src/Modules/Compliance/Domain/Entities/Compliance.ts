import type {
  ActionCode,
  ActorType,
  AuditResult,
  ControlExceptionSeverity,
  ExceptionOutcome,
  ExceptionState,
  ExceptionSubStatus,
  ObjectType,
} from '@modules/Compliance/Domain/Enums/ComplianceEnums';

/** An immutable audit trail entry (C4). Only IDs are carried — no joined display names. */
export interface AuditLogEntry {
  id: string;
  occurredAt: string;
  actorUserId: string | null;
  actorRoleCodes: string[];
  actorType: ActorType;
  action: ActionCode;
  objectType: ObjectType;
  objectId: string | null;
  objectCode: string | null;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
  reasonCodeId: string | null;
  reasonNote: string | null;
  evidenceRefs: unknown[] | null;
  referenceType: string | null;
  referenceId: string | null;
  warehouseId: string | null;
  ownerId: string | null;
  correlationId: string | null;
  result: AuditResult;
}

/** A control exception case in the 6-state V0 lifecycle (C9). */
export interface ExceptionCase {
  id: string;
  exceptionType: string;
  state: ExceptionState;
  subStatus: ExceptionSubStatus | null;
  outcome: ExceptionOutcome | null;
  referenceType: string;
  referenceId: string;
  warehouseId: string | null;
  ownerId: string | null;
  reasonCodeId: string | null;
  assignedToUserId: string | null;
  assignedRoleId: string | null;
  detectedRuleId: string | null;
  approvalRequestId: string | null;
  severity: ControlExceptionSeverity;
  evidenceRefs: unknown[] | null;
  resolutionNote: string | null;
  openedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
