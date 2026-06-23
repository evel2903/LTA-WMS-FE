import type {
  InventoryReconciliationRetryStatus,
  ReplenishmentTaskStatus,
  ReplenishmentTriggerType,
} from '@modules/Replenishment/Domain/Types/ReplenishmentTask';

export interface ReplenishmentTaskListFilter {
  page?: number;
  pageSize?: number;
  warehouseId?: string;
  ownerId?: string;
  taskStatus?: ReplenishmentTaskStatus;
  triggerType?: ReplenishmentTriggerType;
}

export interface ReleaseReplenishmentTaskInput {
  triggerType: ReplenishmentTriggerType;
  sourceBalanceId: string;
  targetLocationId: string;
  quantity: number;
  shortPickReference?: string;
  priority?: number;
  workPoolCode?: string;
  assignedUserId?: string;
  reasonCode: string;
  reasonNote?: string;
  evidenceRefs?: string[];
  idempotencyKey: string;
}

export interface ReplenishmentReasonedInput {
  reasonCode: string;
  reasonNote?: string;
  evidenceRefs?: string[];
  idempotencyKey: string;
}

export interface RecordInventoryReconciliationFailureInput {
  businessReference: string;
  eventType: string;
  warehouseId: string;
  ownerId?: string;
  errorMessage: string;
  retryStatus: InventoryReconciliationRetryStatus;
  reasonCode?: string;
  evidenceRefs?: string[];
  idempotencyKey: string;
  payload?: Record<string, unknown>;
}
