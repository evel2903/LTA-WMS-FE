import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  ConfirmPutawayTaskResult,
  PutawayTask,
} from '@modules/Putaway/Domain/Types/PutawayTask';
import type {
  ConfirmPutawayTaskInput,
  PutawayTaskListFilter,
  ReleasePutawayTaskInput,
} from '@modules/Putaway/Domain/Types/PutawayTaskQuery';

export interface IPutawayRepository {
  list(filter?: PutawayTaskListFilter): Promise<PaginatedResponse<PutawayTask>>;
  getById(id: string): Promise<PutawayTask>;
  release(input: ReleasePutawayTaskInput): Promise<PutawayTask>;
  confirm(taskId: string, input: ConfirmPutawayTaskInput): Promise<ConfirmPutawayTaskResult>;
}
