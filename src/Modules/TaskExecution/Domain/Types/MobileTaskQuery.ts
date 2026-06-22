import type {
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
