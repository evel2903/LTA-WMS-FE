import type { PaginatedResponse } from '@shared/Types/Api';
import type { MobileScanEvent, MobileTask } from '@modules/TaskExecution/Domain/Types/MobileTask';
import type {
  ClaimMobileTaskInput,
  MobileTaskListFilter,
  RecordMobileScanInput,
} from '@modules/TaskExecution/Domain/Types/MobileTaskQuery';

export interface ITaskExecutionRepository {
  list(filter?: MobileTaskListFilter): Promise<PaginatedResponse<MobileTask>>;
  getById(id: string): Promise<MobileTask>;
  claim(id: string, input?: ClaimMobileTaskInput): Promise<MobileTask>;
  release(id: string): Promise<MobileTask>;
  recordScan(id: string, input: RecordMobileScanInput): Promise<MobileScanEvent>;
}
