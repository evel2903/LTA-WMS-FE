import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  InventoryReconciliationFailureResult,
  ReplenishmentMutationResult,
  ReplenishmentTask,
} from '@modules/Replenishment/Domain/Types/ReplenishmentTask';
import type {
  RecordInventoryReconciliationFailureInput,
  ReleaseReplenishmentTaskInput,
  ReplenishmentReasonedInput,
  ReplenishmentTaskListFilter,
} from '@modules/Replenishment/Domain/Types/ReplenishmentQuery';

export interface IReplenishmentRepository {
  list(filter?: ReplenishmentTaskListFilter): Promise<PaginatedResponse<ReplenishmentTask>>;
  getById(id: string): Promise<ReplenishmentMutationResult>;
  release(input: ReleaseReplenishmentTaskInput): Promise<ReplenishmentMutationResult>;
  confirm(id: string, input: ReplenishmentReasonedInput): Promise<ReplenishmentMutationResult>;
  cancel(id: string, input: ReplenishmentReasonedInput): Promise<ReplenishmentMutationResult>;
  recordReconciliationFailure(
    input: RecordInventoryReconciliationFailureInput,
  ): Promise<InventoryReconciliationFailureResult>;
}
