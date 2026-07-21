import type { PUTAWAY_TASK_STATUSES } from '@modules/Putaway/Domain/Constants/PutawayConstants';

export type PutawayTaskStatus = (typeof PUTAWAY_TASK_STATUSES)[number];

export interface PutawayTask {
  id: string;
  taskCode: string;
  taskStatus: PutawayTaskStatus;
  inboundPutawayReleaseId: string;
  receiptId: string;
  receiptLineId: string;
  inboundPlanId: string | null;
  inboundPlanLineId: string | null;
  inboundLpnId: string | null;
  ownerId: string;
  ownerCode: string | null;
  warehouseId: string;
  warehouseCode: string | null;
  skuId: string;
  skuCode: string | null;
  uomId: string;
  uomCode: string | null;
  quantity: number;
  lpnCode: string | null;
  ssccCode: string | null;
  inventoryStatusCode: string;
  sourceLocationId: string | null;
  sourceLocationCode: string | null;
  targetLocationId: string;
  targetLocationCode: string;
  targetLocationProfileId: string | null;
  priority: number;
  workPoolCode: string | null;
  assignedUserId: string | null;
  constraintJson: Record<string, unknown> | null;
  eligibilityDecisionJson: Record<string, unknown> | null;
  outboxMessageId: string | null;
  mobileTaskId: string | null;
  reasonCode: string | null;
  reasonCodeId: string | null;
  reasonNote: string | null;
  evidenceRefs: string[];
  idempotencyKey: string;
  releasedAt: string;
  releasedBy: string | null;
  isDuplicate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTransaction {
  id: string;
  transactionCode: string;
  transactionType: string;
  transactionStatus: string;
  putawayTaskId: string;
  putawayTaskCode: string;
  inventoryMovementId: string | null;
  ownerId: string;
  ownerCode: string | null;
  warehouseId: string;
  warehouseCode: string | null;
  skuId: string;
  skuCode: string | null;
  uomId: string;
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
  putawayTaskId: string;
  putawayTaskCode: string;
  ownerId: string;
  ownerCode: string | null;
  warehouseId: string;
  warehouseCode: string | null;
  skuId: string;
  skuCode: string | null;
  uomId: string;
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

export interface PutawayConfirmScan {
  scanType: string;
  rawValue: string;
  expectedValue: string | null;
  result: string;
}

export interface ConfirmPutawayTaskResult {
  putawayTask: PutawayTask;
  inventoryTransaction: InventoryTransaction;
  inventoryMovement: InventoryMovement;
  sourceBalance: InventoryBalanceSnapshot;
  targetBalance: InventoryBalanceSnapshot;
  scanResults: PutawayConfirmScan[];
  outboxMessageId: string | null;
  isDuplicate: boolean;
}
