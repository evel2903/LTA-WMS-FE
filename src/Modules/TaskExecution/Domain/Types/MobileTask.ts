import type {
  MOBILE_TASK_STATUSES,
  MOBILE_TASK_TYPES,
} from '@modules/TaskExecution/Domain/Constants/MobileTaskConstants';

export type MobileTaskType = (typeof MOBILE_TASK_TYPES)[number];
export type MobileTaskStatus = (typeof MOBILE_TASK_STATUSES)[number];

export interface MobileTask {
  id: string;
  taskCode: string;
  taskType: MobileTaskType;
  taskStatus: MobileTaskStatus;
  warehouseId: string;
  warehouseCode: string;
  ownerId: string | null;
  ownerCode: string | null;
  sourceDocumentType: string | null;
  sourceDocumentId: string | null;
  sourceDocumentCode: string | null;
  priority: number;
  assignedUserId: string | null;
  claimedAt: string | null;
  releasedAt: string | null;
  dueAt: string | null;
  deviceCode: string | null;
  sessionId: string | null;
  taskPayload: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
