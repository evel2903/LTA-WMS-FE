import type { PUTAWAY_TASK_STATUSES } from '@modules/Putaway/Domain/Constants/PutawayConstants';

export type PutawayTaskStatus = (typeof PUTAWAY_TASK_STATUSES)[number];

export interface PutawayTask {
  id: string;
  taskCode: string;
  taskStatus: PutawayTaskStatus;
  inboundPutawayReleaseId: string;
  receiptId: string;
  receiptLineId: string;
  inboundPlanId: string;
  inboundPlanLineId: string;
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
