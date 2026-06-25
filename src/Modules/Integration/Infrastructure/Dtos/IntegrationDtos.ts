import type {
  DeadLetterActionType,
  IntegrationFailureCategory,
  OutboxMessageStatus,
  ReconciliationItemStatus,
  ReconciliationRunStatus,
  ReconciliationSeverity,
} from '@modules/Integration/Domain/Types/Integration';

export interface OutboxMessageDto {
  Id: string;
  SourceMessageId: string | null;
  MessageId: string;
  EventType: string;
  Version: string;
  BusinessReference: string;
  SourceSystem: string;
  TargetSystem: string;
  WarehouseContext: string;
  OwnerContext: string | null;
  EventTime: string;
  CorrelationId: string | null;
  CausationId: string | null;
  Payload: Record<string, unknown>;
  Status: OutboxMessageStatus;
  AttemptCount: number;
  MaxAttempts: number;
  NextRetryAt: string | null;
  LastError: string | null;
  FailureCategory: IntegrationFailureCategory | null;
  DeadLetterReason: string | null;
  DeadLetteredAt: string | null;
  ResolutionAction: DeadLetterActionType | null;
  ActionIdempotencyKey: string | null;
  ResolvedAt: string | null;
  ResolvedBy: string | null;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  CreatedAt: string;
  CreatedBy: string | null;
  UpdatedAt: string;
  IsDuplicate: boolean;
}

export interface PagedOutboxMessageDto {
  Items: OutboxMessageDto[];
  Page?: number;
  PageSize?: number;
  TotalItems?: number;
  TotalPages?: number;
  Meta?: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
}

export interface ReconciliationRunDto {
  Id: string;
  BusinessReference: string;
  WarehouseId: string;
  OwnerId: string | null;
  RunStatus: ReconciliationRunStatus;
  SourceCounts: Record<string, number>;
  ItemCount: number;
  MismatchCount: number;
  ExceptionCount: number;
  IdempotencyKey: string;
  ReasonCode: string;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  ResolvedAt: string | null;
  ResolvedBy: string | null;
  CreatedAt: string;
  CreatedBy: string | null;
  UpdatedAt: string;
  IsDuplicate: boolean;
}

export interface ReconciliationItemDto {
  Id: string;
  RunId: string;
  ItemStatus: ReconciliationItemStatus;
  Severity: ReconciliationSeverity;
  MismatchType: string;
  SourceType: string;
  SourceId: string | null;
  ExpectedSummary: Record<string, unknown> | null;
  ActualSummary: Record<string, unknown> | null;
  ExceptionCaseId: string | null;
  OutboxMessageId: string | null;
  DeadLetterMessageId: string | null;
  ResolutionNote: string | null;
  ApprovalRequestId: string | null;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  ResolvedAt: string | null;
  ResolvedBy: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  IsDuplicate: boolean;
}

export interface ReconciliationRunCreatedDto {
  Run: ReconciliationRunDto;
  Items: ReconciliationItemDto[];
}

export interface PagedReconciliationRunDto {
  Items: ReconciliationRunDto[];
  Page?: number;
  PageSize?: number;
  TotalItems?: number;
  TotalPages?: number;
  Meta?: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
}

export interface PagedReconciliationItemDto {
  Items: ReconciliationItemDto[];
  Page?: number;
  PageSize?: number;
  TotalItems?: number;
  TotalPages?: number;
  Meta?: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
}
