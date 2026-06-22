import type {
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
