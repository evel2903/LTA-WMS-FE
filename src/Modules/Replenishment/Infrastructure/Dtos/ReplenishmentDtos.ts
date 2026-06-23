import type {
  InventoryReconciliationRetryStatus,
  ReplenishmentTaskStatus,
  ReplenishmentTriggerType,
} from '@modules/Replenishment/Domain/Types/ReplenishmentTask';

export interface ReplenishmentTaskDto {
  Id: string;
  TaskCode: string;
  TaskStatus: ReplenishmentTaskStatus;
  TriggerType: ReplenishmentTriggerType;
  SourceBalanceId: string;
  SourceDimensionId: string;
  SourceLocationId: string;
  SourceLocationCode: string | null;
  SourceInventoryStatusCode: string;
  TargetLocationId: string;
  TargetLocationCode: string | null;
  TargetLocationProfileId: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  SkuId: string;
  SkuCode: string | null;
  UomId: string | null;
  UomCode: string | null;
  Quantity: number;
  ShortPickReference: string | null;
  Priority: number | null;
  WorkPoolCode: string | null;
  AssignedUserId: string | null;
  EligibilityDecisionJson: Record<string, unknown> | null;
  OutboxMessageId: string | null;
  ConfirmTransactionId: string | null;
  ConfirmMovementId: string | null;
  ConfirmOutboxMessageId: string | null;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  ReleasedAt: string | null;
  ConfirmedAt: string | null;
  CancelledAt: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}

export interface PagedReplenishmentTaskDto {
  Items: ReplenishmentTaskDto[];
  Page: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
}

export interface InventoryTransactionDto {
  Id: string;
  TransactionCode: string;
  TransactionType: string;
  TransactionStatus: string;
  FromInventoryStatusCode: string;
  ToInventoryStatusCode: string;
  Quantity: number;
  IdempotencyKey: string;
  OutboxMessageId: string | null;
}

export interface InventoryBalanceSnapshotDto {
  BalanceId: string;
  DimensionId: string;
  QtyOnHand: number;
  QtyReserved: number;
  QtyAvailable: number;
}

export interface InventoryControlResultDto {
  InventoryTransaction: InventoryTransactionDto;
  SourceBalance: InventoryBalanceSnapshotDto;
  TargetBalance: InventoryBalanceSnapshotDto;
  EventType: 'InventoryStatusChanged' | 'InventoryMoved';
  IsDuplicate: boolean;
}

export interface ReplenishmentMutationResultDto {
  ReplenishmentTask: ReplenishmentTaskDto;
  InventoryControl?: InventoryControlResultDto | null;
  OutboxMessageId?: string | null;
  EventType?: 'ReplenishmentTaskReleased' | 'ReplenishmentTaskCancelled' | null;
  IsDuplicate: boolean;
}

export interface InventoryReconciliationFailureResultDto {
  BusinessReference: string;
  EventType: string;
  ErrorMessage: string;
  RetryStatus: InventoryReconciliationRetryStatus;
  WarehouseId: string;
  OwnerId: string | null;
  OutboxMessageId: string;
  ExceptionCaseId: string | null;
  IsDuplicate: boolean;
}
