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

/** Paginated list envelope `{ Items, Meta }` (shared BE list shape). */
export interface PagedDto<TItem> {
  Items: TItem[];
  Meta: {
    Page: number;
    PageSize: number;
    TotalItems: number;
    TotalPages: number;
  };
}

export interface AuditLogDto {
  Id: string;
  OccurredAt: string;
  ActorUserId: string | null;
  ActorRoleCodes: string[];
  ActorType: ActorType;
  Action: ActionCode;
  ObjectType: ObjectType;
  ObjectId: string | null;
  ObjectCode: string | null;
  BeforeJson: Record<string, unknown> | null;
  AfterJson: Record<string, unknown> | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: unknown[] | null;
  ReferenceType: string | null;
  ReferenceId: string | null;
  WarehouseId: string | null;
  OwnerId: string | null;
  CorrelationId: string | null;
  Result: AuditResult;
}

export interface ExceptionCaseDto {
  Id: string;
  ExceptionType: string;
  State: ExceptionState;
  SubStatus: ExceptionSubStatus | null;
  Outcome: ExceptionOutcome | null;
  ReferenceType: string;
  ReferenceId: string;
  WarehouseId: string | null;
  OwnerId: string | null;
  ReasonCodeId: string | null;
  AssignedToUserId: string | null;
  AssignedRoleId: string | null;
  DetectedRuleId: string | null;
  ApprovalRequestId: string | null;
  Severity: ControlExceptionSeverity;
  EvidenceRefs: unknown[] | null;
  ResolutionNote: string | null;
  OpenedAt: string;
  ResolvedAt: string | null;
  ClosedAt: string | null;
  CreatedAt: string;
  UpdatedAt: string;
}

// ── Request DTOs (PascalCase) ─────────────────────────────────────────────────

export interface LogExceptionRequestDto {
  HardBlock?: boolean;
}

export interface AssignExceptionRequestDto {
  AssignedToUserId?: string;
  AssignedRoleId?: string;
  OwnerId?: string;
}

export interface SubmitExceptionRequestDto {
  RequireApproval?: boolean;
  ReasonCode?: string;
  ReasonNote?: string;
}

export interface ResolveExceptionRequestDto {
  ReasonCode?: string;
  ResolutionNote?: string;
  EvidenceRefs?: unknown[];
}
