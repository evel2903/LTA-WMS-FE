import type { DeadLetterActionType, IntegrationFailureCategory, OutboxMessageStatus } from '@modules/Integration/Domain/Types/Integration';

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
  Page: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
}
