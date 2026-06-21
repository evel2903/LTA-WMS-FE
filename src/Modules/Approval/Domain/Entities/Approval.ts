import type {
  ActionCode,
  ApprovalDecision,
  ObjectType,
} from '@modules/Approval/Domain/Enums/ApprovalEnums';

/**
 * An approval request (C6). A PENDING request is decided exactly once into APPROVED or
 * REJECTED by a non-requester reviewer. The decision (reason/note/decidedBy) and the audited
 * before/after image are recorded server-side; the FE only reads the request and posts the
 * approve/reject decision.
 */
export interface ApprovalRequest {
  id: string;
  requesterUserId: string;
  action: ActionCode;
  targetObjectType: ObjectType;
  targetObjectId: string;
  targetObjectCode: string | null;
  scope: Record<string, unknown> | null;
  requestReasonCodeId: string | null;
  requestReasonNote: string | null;
  evidenceRefs: unknown[] | null;
  decision: ApprovalDecision;
  decidedByUserId: string | null;
  decisionReasonCodeId: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
  updatedAt: string;
}
