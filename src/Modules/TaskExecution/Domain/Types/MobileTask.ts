import type {
  MOBILE_SCAN_RESULTS,
  MOBILE_SCAN_TYPES,
  MOBILE_TASK_STATUSES,
  MOBILE_TASK_TYPES,
} from '@modules/TaskExecution/Domain/Constants/MobileTaskConstants';

export type MobileTaskType = (typeof MOBILE_TASK_TYPES)[number];
export type MobileTaskStatus = (typeof MOBILE_TASK_STATUSES)[number];
export type MobileScanType = (typeof MOBILE_SCAN_TYPES)[number];
export type MobileScanResult = (typeof MOBILE_SCAN_RESULTS)[number];

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

export interface MobileScanEvent {
  id: string;
  taskId: string;
  taskCode: string;
  warehouseId: string;
  ownerId: string | null;
  scanType: MobileScanType;
  rawValue: string;
  normalizedValue: string | null;
  result: MobileScanResult;
  resolvedObjectType: string | null;
  resolvedObjectId: string | null;
  parsedValueJson: Record<string, unknown>;
  rejectionCode: string | null;
  rejectionMessage: string | null;
  reasonCode: string | null;
  deviceCode: string | null;
  sessionId: string | null;
  actorUserId: string;
  createdAt: string;
}
