export type InventoryControlEventType = 'InventoryStatusChanged' | 'InventoryMoved';

export interface InventoryTransaction {
  id: string;
  transactionCode: string;
  transactionType: string;
  transactionStatus: string;
  putawayTaskId: string | null;
  putawayTaskCode: string | null;
  inventoryMovementId: string | null;
  ownerId: string;
  ownerCode: string | null;
  warehouseId: string;
  warehouseCode: string | null;
  skuId: string;
  skuCode: string | null;
  uomId: string | null;
  uomCode: string | null;
  quantity: number;
  fromInventoryStatusCode: string;
  toInventoryStatusCode: string;
  fromLocationId: string | null;
  fromLocationCode: string | null;
  toLocationId: string;
  toLocationCode: string;
  lpnCode: string | null;
  ssccCode: string | null;
  idempotencyKey: string;
  outboxMessageId: string | null;
  reasonCode: string | null;
  reasonCodeId: string | null;
  reasonNote: string | null;
  evidenceRefs: string[];
  postedAt: string;
  postedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  movementCode: string;
  movementStatus: string;
  inventoryTransactionId: string;
  putawayTaskId: string | null;
  putawayTaskCode: string | null;
  ownerId: string;
  ownerCode: string | null;
  warehouseId: string;
  warehouseCode: string | null;
  skuId: string;
  skuCode: string | null;
  uomId: string | null;
  uomCode: string | null;
  quantity: number;
  fromDimensionId: string;
  fromBalanceId: string;
  fromLocationId: string | null;
  fromLocationCode: string | null;
  fromInventoryStatusCode: string;
  toDimensionId: string;
  toBalanceId: string;
  toLocationId: string;
  toLocationCode: string;
  toInventoryStatusCode: string;
  lpnCode: string | null;
  ssccCode: string | null;
  scanEvidenceJson: Record<string, unknown>;
  createdAt: string;
  createdBy: string | null;
}

export interface InventoryBalanceSnapshot {
  balanceId: string;
  dimensionId: string;
  qtyOnHand: number;
  qtyReserved: number;
  qtyAvailable: number;
}

export interface InventoryControlResult {
  inventoryTransaction: InventoryTransaction;
  inventoryMovement: InventoryMovement;
  sourceBalance: InventoryBalanceSnapshot;
  targetBalance: InventoryBalanceSnapshot;
  outboxMessageId: string | null;
  eventType: InventoryControlEventType;
  isDuplicate: boolean;
}

export interface ChangeInventoryStatusInput {
  sourceBalanceId: string;
  targetInventoryStatusCode: string;
  quantity: number;
  reasonCode: string;
  reasonNote?: string | null;
  evidenceRefs?: string[];
  idempotencyKey: string;
}

export interface MoveInventoryInternalInput {
  sourceBalanceId: string;
  targetLocationId: string;
  quantity: number;
  reasonCode: string;
  reasonNote?: string | null;
  evidenceRefs?: string[];
  idempotencyKey: string;
}
