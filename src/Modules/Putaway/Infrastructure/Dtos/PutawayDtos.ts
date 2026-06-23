import type { PutawayTaskStatus } from '@modules/Putaway/Domain/Types/PutawayTask';

export interface PutawayTaskDto {
  Id: string;
  TaskCode: string;
  TaskStatus: PutawayTaskStatus;
  InboundPutawayReleaseId: string;
  ReceiptId: string;
  ReceiptLineId: string;
  InboundPlanId: string;
  InboundPlanLineId: string;
  InboundLpnId: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  SkuId: string;
  SkuCode: string | null;
  UomId: string;
  UomCode: string | null;
  Quantity: number;
  LpnCode: string | null;
  SsccCode: string | null;
  InventoryStatusCode: string;
  SourceLocationId: string | null;
  SourceLocationCode: string | null;
  TargetLocationId: string;
  TargetLocationCode: string;
  TargetLocationProfileId: string | null;
  Priority: number;
  WorkPoolCode: string | null;
  AssignedUserId: string | null;
  ConstraintJson: Record<string, unknown> | null;
  EligibilityDecisionJson: Record<string, unknown> | null;
  OutboxMessageId: string | null;
  MobileTaskId: string | null;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  IdempotencyKey: string;
  ReleasedAt: string;
  ReleasedBy: string | null;
  IsDuplicate: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface PagedPutawayTaskDto {
  Items: PutawayTaskDto[];
  Meta: {
    Page: number;
    PageSize: number;
    TotalItems: number;
    TotalPages: number;
  };
}

export interface ReleasePutawayTaskRequestDto {
  InboundPutawayReleaseId: string;
  SourceLocationId?: string | null;
  SourceLocationCode?: string | null;
  TargetLocationId?: string | null;
  Priority?: number;
  WorkPoolCode?: string | null;
  AssignedUserId?: string | null;
  AttemptOverride?: boolean;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface InventoryTransactionDto {
  Id: string;
  TransactionCode: string;
  TransactionType: string;
  TransactionStatus: string;
  PutawayTaskId: string;
  PutawayTaskCode: string;
  InventoryMovementId: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  SkuId: string;
  SkuCode: string | null;
  UomId: string;
  UomCode: string | null;
  Quantity: number;
  FromInventoryStatusCode: string;
  ToInventoryStatusCode: string;
  FromLocationId: string | null;
  FromLocationCode: string | null;
  ToLocationId: string;
  ToLocationCode: string;
  LpnCode: string | null;
  SsccCode: string | null;
  IdempotencyKey: string;
  OutboxMessageId: string | null;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  PostedAt: string;
  PostedBy: string | null;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface InventoryMovementDto {
  Id: string;
  MovementCode: string;
  MovementStatus: string;
  InventoryTransactionId: string;
  PutawayTaskId: string;
  PutawayTaskCode: string;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  SkuId: string;
  SkuCode: string | null;
  UomId: string;
  UomCode: string | null;
  Quantity: number;
  FromDimensionId: string;
  FromBalanceId: string;
  FromLocationId: string | null;
  FromLocationCode: string | null;
  FromInventoryStatusCode: string;
  ToDimensionId: string;
  ToBalanceId: string;
  ToLocationId: string;
  ToLocationCode: string;
  ToInventoryStatusCode: string;
  LpnCode: string | null;
  SsccCode: string | null;
  ScanEvidenceJson: Record<string, unknown>;
  CreatedAt: string;
  CreatedBy: string | null;
}

export interface InventoryBalanceSnapshotDto {
  BalanceId: string;
  DimensionId: string;
  QtyOnHand: number;
  QtyReserved: number;
  QtyAvailable: number;
}

export interface PutawayConfirmScanDto {
  ScanType: string;
  RawValue: string;
  ExpectedValue: string | null;
  Result: string;
}

export interface ConfirmPutawayTaskRequestDto {
  SourceLocationScan: string;
  TargetLocationScan: string;
  LpnScan?: string | null;
  ConfirmedQuantity?: number | null;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  DeviceCode?: string | null;
  SessionId?: string | null;
  IdempotencyKey: string;
}

export interface ConfirmPutawayTaskResultDto {
  PutawayTask: PutawayTaskDto;
  InventoryTransaction: InventoryTransactionDto;
  InventoryMovement: InventoryMovementDto;
  SourceBalance: InventoryBalanceSnapshotDto;
  TargetBalance: InventoryBalanceSnapshotDto;
  ScanResults: PutawayConfirmScanDto[];
  OutboxMessageId: string | null;
  IsDuplicate: boolean;
}
