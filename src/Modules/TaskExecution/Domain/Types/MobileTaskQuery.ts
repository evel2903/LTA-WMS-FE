import type {
  MobileTask,
  MobileScanType,
  MobileTaskStatus,
  MobileTaskType,
} from '@modules/TaskExecution/Domain/Types/MobileTask';

export interface MobileTaskListFilter {
  page?: number;
  pageSize?: number;
  warehouseId?: string;
  taskType?: MobileTaskType;
  taskStatus?: MobileTaskStatus;
}

export interface ClaimMobileTaskInput {
  deviceCode?: string | null;
  sessionId?: string | null;
}

export interface RecordMobileScanInput {
  scanType: MobileScanType;
  rawValue: string;
  manualEntry?: boolean;
  reasonCode?: string | null;
  deviceCode?: string | null;
  sessionId?: string | null;
}

export interface ConfirmPickTaskInput {
  mobileTaskId?: string | null;
  reasonCode?: string | null;
  reasonNote?: string | null;
  evidenceRefs?: string[];
  deviceCode?: string | null;
  sessionId?: string | null;
  idempotencyKey: string;
}

export interface PickTaskScanEvidence {
  scanType: 'Location' | 'Item' | 'Quantity' | 'Lot' | 'Serial' | 'ExpiryDate';
  scanEventId: string | null;
  rawValue: string | null;
  expectedValue: string | number | null;
  actualValue: string | number | null;
  result: 'Accepted' | 'Rejected' | 'Missing';
  rejectionCode?: string | null;
}

export interface ConfirmPickTaskResult {
  pickTask: Record<string, unknown>;
  mobileTask: MobileTask | null;
  inventoryControl: Record<string, unknown> | null;
  scanEvidence: PickTaskScanEvidence[];
  outboxMessageId: string | null;
  isDuplicate: boolean;
}
