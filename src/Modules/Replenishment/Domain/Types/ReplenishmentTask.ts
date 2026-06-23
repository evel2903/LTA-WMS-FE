import type {
  INVENTORY_RECONCILIATION_RETRY_STATUSES,
  REPLENISHMENT_TASK_STATUSES,
  REPLENISHMENT_TRIGGER_TYPES,
} from '@modules/Replenishment/Domain/Constants/ReplenishmentConstants';

export type ReplenishmentTaskStatus = (typeof REPLENISHMENT_TASK_STATUSES)[number];
export type ReplenishmentTriggerType = (typeof REPLENISHMENT_TRIGGER_TYPES)[number];
export type InventoryReconciliationRetryStatus = (typeof INVENTORY_RECONCILIATION_RETRY_STATUSES)[number];

export interface ReplenishmentTask {
  id: string;
  taskCode: string;
  taskStatus: ReplenishmentTaskStatus;
  triggerType: ReplenishmentTriggerType;
  sourceBalanceId: string;
  sourceDimensionId: string;
  sourceLocationId: string;
  sourceLocationCode: string | null;
  sourceInventoryStatusCode: string;
  targetLocationId: string;
  targetLocationCode: string | null;
  targetLocationProfileId: string | null;
  warehouseId: string;
  warehouseCode: string | null;
  ownerId: string;
  ownerCode: string | null;
  skuId: string;
  skuCode: string | null;
  uomId: string | null;
  uomCode: string | null;
  quantity: number;
  shortPickReference: string | null;
  priority: number | null;
  workPoolCode: string | null;
  assignedUserId: string | null;
  eligibilityDecision: Record<string, unknown> | null;
  outboxMessageId: string | null;
  confirmTransactionId: string | null;
  confirmMovementId: string | null;
  confirmOutboxMessageId: string | null;
  reasonCode: string | null;
  reasonCodeId: string | null;
  reasonNote: string | null;
  evidenceRefs: string[];
  releasedAt: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
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

export interface InventoryBalanceSnapshot {
  balanceId: string;
  dimensionId: string;
  qtyOnHand: number;
  qtyReserved: number;
  qtyAvailable: number;
}

export interface ReplenishmentMutationResult {
  replenishmentTask: ReplenishmentTask;
  inventoryControl?: {
    inventoryTransaction: InventoryTransactionSummary;
    sourceBalance: InventoryBalanceSnapshot;
    targetBalance: InventoryBalanceSnapshot;
    eventType: 'InventoryStatusChanged' | 'InventoryMoved';
    isDuplicate: boolean;
  } | null;
  outboxMessageId?: string | null;
  eventType?: 'ReplenishmentTaskReleased' | 'ReplenishmentTaskCancelled' | null;
  isDuplicate: boolean;
}

export interface InventoryReconciliationFailureResult {
  businessReference: string;
  eventType: string;
  errorMessage: string;
  retryStatus: InventoryReconciliationRetryStatus;
  warehouseId: string;
  ownerId: string | null;
  outboxMessageId: string;
  exceptionCaseId: string | null;
  isDuplicate: boolean;
}
