import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IReplenishmentRepository } from '@modules/Replenishment/Application/Interfaces/IReplenishmentRepository';
import {
  REPLENISHMENT_DEFAULT_PAGE_SIZE,
  REPLENISHMENT_MAX_PAGE_SIZE,
} from '@modules/Replenishment/Domain/Constants/ReplenishmentConstants';
import type {
  RecordInventoryReconciliationFailureInput,
  ReleaseReplenishmentTaskInput,
  ReplenishmentReasonedInput,
  ReplenishmentTaskListFilter,
} from '@modules/Replenishment/Domain/Types/ReplenishmentQuery';
import type {
  InventoryReconciliationFailureResult,
  ReplenishmentMutationResult,
  ReplenishmentTask,
} from '@modules/Replenishment/Domain/Types/ReplenishmentTask';
import { REPLENISHMENT_ENDPOINTS } from '@modules/Replenishment/Infrastructure/Api/ReplenishmentEndpoints';
import type {
  InventoryReconciliationFailureResultDto,
  PagedReplenishmentTaskDto,
  ReplenishmentMutationResultDto,
} from '@modules/Replenishment/Infrastructure/Dtos/ReplenishmentDtos';
import { ReplenishmentMapper } from '@modules/Replenishment/Infrastructure/Mappers/ReplenishmentMapper';

function pageSize(value?: number): number {
  if (!value || value < 1) return REPLENISHMENT_DEFAULT_PAGE_SIZE;
  return Math.min(value, REPLENISHMENT_MAX_PAGE_SIZE);
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export class ReplenishmentRepository implements IReplenishmentRepository {
  constructor(private readonly http: HttpClient) {}

  async list(filter: ReplenishmentTaskListFilter = {}): Promise<PaginatedResponse<ReplenishmentTask>> {
    const dto = await this.http.get<PagedReplenishmentTaskDto>(REPLENISHMENT_ENDPOINTS.TASKS, {
      params: removeUndefined({
        Page: filter.page ?? 1,
        PageSize: pageSize(filter.pageSize),
        WarehouseId: filter.warehouseId,
        OwnerId: filter.ownerId,
        TaskStatus: filter.taskStatus,
        TriggerType: filter.triggerType,
      }),
    });
    return ReplenishmentMapper.toPaged(dto);
  }

  async getById(id: string): Promise<ReplenishmentMutationResult> {
    const dto = await this.http.get<ReplenishmentMutationResultDto>(REPLENISHMENT_ENDPOINTS.TASK_BY_ID(id));
    return ReplenishmentMapper.toMutationResult(dto);
  }

  async release(input: ReleaseReplenishmentTaskInput): Promise<ReplenishmentMutationResult> {
    const dto = await this.http.post<ReplenishmentMutationResultDto>(
      REPLENISHMENT_ENDPOINTS.RELEASE,
      ReplenishmentMapper.toReleaseRequest(input),
    );
    return ReplenishmentMapper.toMutationResult(dto);
  }

  async confirm(id: string, input: ReplenishmentReasonedInput): Promise<ReplenishmentMutationResult> {
    const dto = await this.http.post<ReplenishmentMutationResultDto>(
      REPLENISHMENT_ENDPOINTS.CONFIRM(id),
      ReplenishmentMapper.toReasonedRequest(input),
    );
    return ReplenishmentMapper.toMutationResult(dto);
  }

  async cancel(id: string, input: ReplenishmentReasonedInput): Promise<ReplenishmentMutationResult> {
    const dto = await this.http.post<ReplenishmentMutationResultDto>(
      REPLENISHMENT_ENDPOINTS.CANCEL(id),
      ReplenishmentMapper.toReasonedRequest(input),
    );
    return ReplenishmentMapper.toMutationResult(dto);
  }

  async recordReconciliationFailure(
    input: RecordInventoryReconciliationFailureInput,
  ): Promise<InventoryReconciliationFailureResult> {
    const dto = await this.http.post<InventoryReconciliationFailureResultDto>(
      REPLENISHMENT_ENDPOINTS.RECONCILIATION_FAILURES,
      ReplenishmentMapper.toReconciliationFailureRequest(input),
    );
    return ReplenishmentMapper.toReconciliationFailureResult(dto);
  }
}
