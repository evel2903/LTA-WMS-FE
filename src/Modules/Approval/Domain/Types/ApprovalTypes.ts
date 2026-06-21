import type {
  ActionCode,
  ApprovalDecision,
  ObjectType,
} from '@modules/Approval/Domain/Enums/ApprovalEnums';

/** Whitelisted query filter for `GET /approval-requests` (PascalCase on the wire). */
export interface ApprovalFilter {
  page?: number;
  pageSize?: number;
  decision?: ApprovalDecision;
  requesterUserId?: string;
  targetObjectType?: ObjectType;
  targetObjectId?: string;
  action?: ActionCode;
}

/**
 * Decision body for `POST /approval-requests/:id/approve` and `/:id/reject` (same shape).
 * All fields optional: a reason code, when given, is validated server-side against the C3
 * catalog for (Approve, ApprovalRequest); evidence is required only if that code demands it.
 */
export interface DecideApprovalInput {
  reasonCode?: string;
  reasonNote?: string;
  evidenceRefs?: unknown[];
}
