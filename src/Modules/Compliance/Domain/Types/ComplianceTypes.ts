import type {
  ActionCode,
  ControlExceptionSeverity,
  ExceptionState,
  ObjectType,
} from '@modules/Compliance/Domain/Enums/ComplianceEnums';

interface PageFilter {
  page?: number;
  pageSize?: number;
}

/** Whitelisted query filter for `GET /audit-logs`. */
export interface AuditLogFilter extends PageFilter {
  actorUserId?: string;
  action?: ActionCode;
  objectType?: ObjectType;
  objectId?: string;
  reasonCodeId?: string;
  from?: string;
  to?: string;
}

/** Whitelisted query filter for `GET /exceptions`. */
export interface ExceptionListFilter extends PageFilter {
  state?: ExceptionState;
  exceptionType?: string;
  referenceType?: string;
  referenceId?: string;
  warehouseId?: string;
  ownerId?: string;
  assignedToUserId?: string;
  severity?: ControlExceptionSeverity;
}

// ── Lifecycle action inputs (camelCase) ───────────────────────────────────────

export interface LogExceptionInput {
  hardBlock?: boolean;
}

export interface AssignExceptionInput {
  assignedToUserId?: string;
  assignedRoleId?: string;
  ownerId?: string;
}

export interface SubmitExceptionInput {
  requireApproval?: boolean;
  reasonCode?: string;
  reasonNote?: string;
}

export interface ResolveExceptionInput {
  reasonCode?: string;
  resolutionNote?: string;
  evidenceRefs?: unknown[];
}
