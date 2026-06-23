/** Backend wire shapes for inventory. Infrastructure-only — never imported by Domain/Presentation. */
export interface InventoryItemDto {
  id: string;
  sku: string;
  product_name: string;
  warehouse_id: string;
  location_code: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  reorder_point: number;
  unit_of_measure: string;
  updated_at: string;
}

export interface InventoryListResponseDto {
  items: InventoryItemDto[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface AdjustQuantityRequestDto {
  delta: number;
  reason: string;
}

export interface InventoryTransactionDto {
  Id: string;
  TransactionCode: string;
  TransactionType: string;
  TransactionStatus: string;
  PutawayTaskId: string | null;
  PutawayTaskCode: string | null;
  InventoryMovementId: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  SkuId: string;
  SkuCode: string | null;
  UomId: string | null;
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
  PutawayTaskId: string | null;
  PutawayTaskCode: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  SkuId: string;
  SkuCode: string | null;
  UomId: string | null;
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

export interface InventoryControlResultDto {
  InventoryTransaction: InventoryTransactionDto;
  InventoryMovement: InventoryMovementDto;
  SourceBalance: InventoryBalanceSnapshotDto;
  TargetBalance: InventoryBalanceSnapshotDto;
  OutboxMessageId: string | null;
  EventType: 'InventoryStatusChanged' | 'InventoryMoved';
  IsDuplicate: boolean;
}

export interface ChangeInventoryStatusRequestDto {
  SourceBalanceId: string;
  TargetInventoryStatusCode: string;
  Quantity: number;
  ReasonCode: string;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface MoveInventoryInternalRequestDto {
  SourceBalanceId: string;
  TargetLocationId: string;
  Quantity: number;
  ReasonCode: string;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}
