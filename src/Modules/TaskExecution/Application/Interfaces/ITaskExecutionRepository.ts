import type { PaginatedResponse } from '@shared/Types/Api';
import type { MobileScanEvent, MobileTask } from '@modules/TaskExecution/Domain/Types/MobileTask';
import type {
  ClaimMobileTaskInput,
  ConfirmPickTaskInput,
  ConfirmPickTaskResult,
  MobileTaskListFilter,
  PickExceptionResult,
  RecordMobileScanInput,
  ReportPickExceptionInput,
  RequestPickSubstitutionInput,
} from '@modules/TaskExecution/Domain/Types/MobileTaskQuery';

export interface ITaskExecutionRepository {
  list(filter?: MobileTaskListFilter): Promise<PaginatedResponse<MobileTask>>;
  getById(id: string): Promise<MobileTask>;
  claim(id: string, input?: ClaimMobileTaskInput): Promise<MobileTask>;
  release(id: string): Promise<MobileTask>;
  recordScan(id: string, input: RecordMobileScanInput): Promise<MobileScanEvent>;
  confirmPickTask(
    mobileTaskId: string,
    input: ConfirmPickTaskInput,
  ): Promise<ConfirmPickTaskResult>;
  reportPickException(
    mobileTaskId: string,
    input: ReportPickExceptionInput,
  ): Promise<PickExceptionResult>;
  requestPickSubstitution(
    mobileTaskId: string,
    input: RequestPickSubstitutionInput,
  ): Promise<PickExceptionResult>;
}
