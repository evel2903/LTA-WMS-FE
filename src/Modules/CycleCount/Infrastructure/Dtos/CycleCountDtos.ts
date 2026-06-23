import type { CycleCountWorkStatus } from '@modules/CycleCount/Domain/Types/CycleCountWork';

export interface CycleCountWorkDto {
  Id: string;
  CountCode: string;
  WorkStatus: CycleCountWorkStatus;
  SourceBalanceId: string;
  LockedBalanceId: string | null;
  OriginalInventoryStatusCode: string;
  WarehouseId: string;
  WarehouseCode: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  SkuId: string;
  SkuCode: string | null;
  LocationId: string;
  LocationCode: string | null;
  UomId: string | null;
  UomCode: string | null;
  LpnCode: string | null;
  ExpectedQuantity: number;
  CountedQuantity: number | null;
  VarianceQuantity: number | null;
  ToleranceQuantity: number;
  ApprovalRequestId: string | null;
  LockTransactionId: string | null;
  AdjustmentTransactionId: string | null;
  UnlockTransactionId: string | null;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  CreatedAt: string;
  UpdatedAt: string;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}

export interface PagedCycleCountWorkDto {
  Items: CycleCountWorkDto[];
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

export interface InventoryMovementDto {
  Id: string;
  MovementCode: string;
  MovementStatus: string;
  InventoryTransactionId: string;
  FromBalanceId: string;
  ToBalanceId: string;
  FromInventoryStatusCode: string;
  ToInventoryStatusCode: string;
  Quantity: number;
  ScanEvidenceJson: Record<string, unknown>;
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

export interface CycleCountMutationResultDto {
  CycleCountWork: CycleCountWorkDto;
  InventoryControl?: InventoryControlResultDto | null;
  IsDuplicate: boolean;
}

export interface CycleCountAdjustmentResultDto {
  CycleCountWork: CycleCountWorkDto;
  InventoryTransaction: InventoryTransactionDto;
  InventoryMovement: InventoryMovementDto;
  SourceBalance: InventoryBalanceSnapshotDto;
  TargetBalance: InventoryBalanceSnapshotDto;
  OutboxMessageId: string | null;
  EventType: 'AdjustmentPosted';
  IsDuplicate: boolean;
}
