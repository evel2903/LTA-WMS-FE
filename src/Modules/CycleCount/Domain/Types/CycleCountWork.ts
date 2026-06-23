import type { CYCLE_COUNT_WORK_STATUSES } from '@modules/CycleCount/Domain/Constants/CycleCountConstants';

export type CycleCountWorkStatus = (typeof CYCLE_COUNT_WORK_STATUSES)[number];

export interface CycleCountWork {
  id: string;
  countCode: string;
  workStatus: CycleCountWorkStatus;
  sourceBalanceId: string;
  lockedBalanceId: string | null;
  originalInventoryStatusCode: string;
  warehouseId: string;
  warehouseCode: string | null;
  ownerId: string;
  ownerCode: string | null;
  skuId: string;
  skuCode: string | null;
  locationId: string;
  locationCode: string | null;
  uomId: string | null;
  uomCode: string | null;
  lpnCode: string | null;
  expectedQuantity: number;
  countedQuantity: number | null;
  varianceQuantity: number | null;
  toleranceQuantity: number;
  approvalRequestId: string | null;
  lockTransactionId: string | null;
  adjustmentTransactionId: string | null;
  unlockTransactionId: string | null;
  reasonCode: string | null;
  reasonCodeId: string | null;
  reasonNote: string | null;
  evidenceRefs: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface InventoryTransactionSummary {
  id: string;
  transactionCode: string;
  transactionType: string;
  transactionStatus: string;
  fromInventoryStatusCode: string;
  toInventoryStatusCode: string;
  quantity: number;
  idempotencyKey: string;
  outboxMessageId: string | null;
}

export interface InventoryMovementSummary {
  id: string;
  movementCode: string;
  movementStatus: string;
  inventoryTransactionId: string;
  fromBalanceId: string;
  toBalanceId: string;
  fromInventoryStatusCode: string;
  toInventoryStatusCode: string;
  quantity: number;
  scanEvidence: Record<string, unknown>;
}

export interface InventoryBalanceSnapshot {
  balanceId: string;
  dimensionId: string;
  qtyOnHand: number;
  qtyReserved: number;
  qtyAvailable: number;
}

export interface CycleCountMutationResult {
  cycleCountWork: CycleCountWork;
  inventoryControl?: {
    inventoryTransaction: InventoryTransactionSummary;
    sourceBalance: InventoryBalanceSnapshot;
    targetBalance: InventoryBalanceSnapshot;
    eventType: 'InventoryStatusChanged' | 'InventoryMoved';
    isDuplicate: boolean;
  } | null;
  isDuplicate: boolean;
}

export interface CycleCountAdjustmentResult {
  cycleCountWork: CycleCountWork;
  inventoryTransaction: InventoryTransactionSummary;
  inventoryMovement: InventoryMovementSummary;
  sourceBalance: InventoryBalanceSnapshot;
  targetBalance: InventoryBalanceSnapshot;
  outboxMessageId: string | null;
  eventType: 'AdjustmentPosted';
  isDuplicate: boolean;
}
