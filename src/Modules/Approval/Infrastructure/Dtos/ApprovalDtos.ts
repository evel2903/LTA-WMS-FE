import type {
  ActionCode,
  ApprovalDecision,
  ObjectType,
} from '@modules/Approval/Domain/Enums/ApprovalEnums';

export interface PagedDto<TItem> {
  Items: TItem[];
  Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
}

export interface ApprovalRequestDto {
  Id: string;
  RequesterUserId: string;
  Action: ActionCode;
  TargetObjectType: ObjectType;
  TargetObjectId: string;
  TargetObjectCode: string | null;
  Scope: Record<string, unknown> | null;
  RequestReasonCodeId: string | null;
  RequestReasonNote: string | null;
  EvidenceRefs: unknown[] | null;
  Decision: ApprovalDecision;
  DecidedByUserId: string | null;
  DecisionReasonCodeId: string | null;
  DecisionNote: string | null;
  DecidedAt: string | null;
  ReferenceType: string | null;
  ReferenceId: string | null;
  CreatedAt: string;
  UpdatedAt: string;
}

/**
 * `POST /approval-requests/:id/approve` and `/:id/reject` share this body. The decision value
 * (APPROVED vs REJECTED) is determined by the endpoint, not a body field. All fields optional;
 * `forbidNonWhitelisted` rejects any non-listed key.
 */
export interface DecideApprovalRequestDto {
  ReasonCode?: string;
  ReasonNote?: string;
  EvidenceRefs?: unknown[];
}
