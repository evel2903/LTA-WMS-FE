import type { PaginatedResponse } from '@shared/Types/Api';
import type { MobileTask } from '@modules/TaskExecution/Domain/Types/MobileTask';
import type {
  ClaimMobileTaskInput,
  MobileTaskListFilter,
} from '@modules/TaskExecution/Domain/Types/MobileTaskQuery';

export interface ITaskExecutionRepository {
  list(filter?: MobileTaskListFilter): Promise<PaginatedResponse<MobileTask>>;
  getById(id: string): Promise<MobileTask>;
  claim(id: string, input?: ClaimMobileTaskInput): Promise<MobileTask>;
  release(id: string): Promise<MobileTask>;
}
