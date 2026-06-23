import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IPutawayRepository } from '@modules/Putaway/Application/Interfaces/IPutawayRepository';
import {
  PUTAWAY_DEFAULT_PAGE_SIZE,
  PUTAWAY_MAX_PAGE_SIZE,
} from '@modules/Putaway/Domain/Constants/PutawayConstants';
import type { PutawayTask } from '@modules/Putaway/Domain/Types/PutawayTask';
import type {
  ConfirmPutawayTaskInput,
  PutawayTaskListFilter,
  ReleasePutawayTaskInput,
} from '@modules/Putaway/Domain/Types/PutawayTaskQuery';
import { PUTAWAY_ENDPOINTS } from '@modules/Putaway/Infrastructure/Api/PutawayEndpoints';
import type {
  ConfirmPutawayTaskResultDto,
  PagedPutawayTaskDto,
  PutawayTaskDto,
} from '@modules/Putaway/Infrastructure/Dtos/PutawayDtos';
import { PutawayMapper } from '@modules/Putaway/Infrastructure/Mappers/PutawayMapper';

function pageSize(value?: number): number {
  if (!value || value < 1) return PUTAWAY_DEFAULT_PAGE_SIZE;
  return Math.min(value, PUTAWAY_MAX_PAGE_SIZE);
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export class PutawayRepository implements IPutawayRepository {
  constructor(private readonly http: HttpClient) {}

  async list(filter: PutawayTaskListFilter = {}): Promise<PaginatedResponse<PutawayTask>> {
    const dto = await this.http.get<PagedPutawayTaskDto>(PUTAWAY_ENDPOINTS.TASKS, {
      params: removeUndefined({
        Page: filter.page ?? 1,
        PageSize: pageSize(filter.pageSize),
        WarehouseId: filter.warehouseId,
        OwnerId: filter.ownerId,
        TaskStatus: filter.taskStatus,
        InboundPutawayReleaseId: filter.inboundPutawayReleaseId,
      }),
    });
    return PutawayMapper.toPaged(dto);
  }

  async getById(id: string): Promise<PutawayTask> {
    const dto = await this.http.get<PutawayTaskDto>(PUTAWAY_ENDPOINTS.TASK_BY_ID(id));
    return PutawayMapper.toTask(dto);
  }

  async release(input: ReleasePutawayTaskInput): Promise<PutawayTask> {
    const dto = await this.http.post<PutawayTaskDto>(
      PUTAWAY_ENDPOINTS.RELEASE,
      PutawayMapper.toReleaseRequest(input),
    );
    return PutawayMapper.toTask(dto);
  }

  async confirm(taskId: string, input: ConfirmPutawayTaskInput) {
    const dto = await this.http.post<ConfirmPutawayTaskResultDto>(
      PUTAWAY_ENDPOINTS.CONFIRM_TASK(taskId),
      PutawayMapper.toConfirmRequest(input),
    );
    return PutawayMapper.toConfirmResult(dto);
  }
}
