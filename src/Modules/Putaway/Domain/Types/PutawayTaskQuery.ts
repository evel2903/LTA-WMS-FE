import type { PutawayTaskStatus } from '@modules/Putaway/Domain/Types/PutawayTask';

export interface PutawayTaskListFilter {
  page?: number;
  pageSize?: number;
  warehouseId?: string;
  ownerId?: string;
  taskStatus?: PutawayTaskStatus;
  inboundPutawayReleaseId?: string;
}

export interface ReleasePutawayTaskInput {
  inboundPutawayReleaseId: string;
  sourceLocationId?: string | null;
  sourceLocationCode?: string | null;
  targetLocationId?: string | null;
  priority?: number;
  workPoolCode?: string | null;
  assignedUserId?: string | null;
  attemptOverride?: boolean;
  reasonCode?: string | null;
  reasonNote?: string | null;
  evidenceRefs?: string[];
  idempotencyKey: string;
}
