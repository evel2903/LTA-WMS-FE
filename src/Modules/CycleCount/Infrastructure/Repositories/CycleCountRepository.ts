import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { ICycleCountRepository } from '@modules/CycleCount/Application/Interfaces/ICycleCountRepository';
import {
  CYCLE_COUNT_DEFAULT_PAGE_SIZE,
  CYCLE_COUNT_MAX_PAGE_SIZE,
} from '@modules/CycleCount/Domain/Constants/CycleCountConstants';
import type {
  CycleCountAdjustmentResult,
  CycleCountMutationResult,
  CycleCountWork,
} from '@modules/CycleCount/Domain/Types/CycleCountWork';
import type {
  CreateCycleCountWorkInput,
  CycleCountReasonedInput,
  CycleCountWorkListFilter,
  PostCycleCountAdjustmentInput,
  SubmitCycleCountWorkInput,
} from '@modules/CycleCount/Domain/Types/CycleCountQuery';
import { CYCLE_COUNT_ENDPOINTS } from '@modules/CycleCount/Infrastructure/Api/CycleCountEndpoints';
import type {
  CycleCountAdjustmentResultDto,
  CycleCountMutationResultDto,
  PagedCycleCountWorkDto,
} from '@modules/CycleCount/Infrastructure/Dtos/CycleCountDtos';
import { CycleCountMapper } from '@modules/CycleCount/Infrastructure/Mappers/CycleCountMapper';

function pageSize(value?: number): number {
  if (!value || value < 1) return CYCLE_COUNT_DEFAULT_PAGE_SIZE;
  return Math.min(value, CYCLE_COUNT_MAX_PAGE_SIZE);
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export class CycleCountRepository implements ICycleCountRepository {
  constructor(private readonly http: HttpClient) {}

  async list(filter: CycleCountWorkListFilter = {}): Promise<PaginatedResponse<CycleCountWork>> {
    const dto = await this.http.get<PagedCycleCountWorkDto>(CYCLE_COUNT_ENDPOINTS.WORKS, {
      params: removeUndefined({
        Page: filter.page ?? 1,
        PageSize: pageSize(filter.pageSize),
        WarehouseId: filter.warehouseId,
        OwnerId: filter.ownerId,
        WorkStatus: filter.workStatus,
      }),
    });
    return CycleCountMapper.toPaged(dto);
  }

  async getById(id: string): Promise<CycleCountMutationResult> {
    const dto = await this.http.get<CycleCountMutationResultDto>(CYCLE_COUNT_ENDPOINTS.WORK_BY_ID(id));
    return CycleCountMapper.toMutationResult(dto);
  }

  async create(input: CreateCycleCountWorkInput): Promise<CycleCountMutationResult> {
    const dto = await this.http.post<CycleCountMutationResultDto>(
      CYCLE_COUNT_ENDPOINTS.WORKS,
      CycleCountMapper.toCreateRequest(input),
    );
    return CycleCountMapper.toMutationResult(dto);
  }

  async submit(id: string, input: SubmitCycleCountWorkInput): Promise<CycleCountMutationResult> {
    const dto = await this.http.post<CycleCountMutationResultDto>(
      CYCLE_COUNT_ENDPOINTS.SUBMIT(id),
      CycleCountMapper.toSubmitRequest(input),
    );
    return CycleCountMapper.toMutationResult(dto);
  }

  async recount(id: string, input: CycleCountReasonedInput): Promise<CycleCountMutationResult> {
    const dto = await this.http.post<CycleCountMutationResultDto>(
      CYCLE_COUNT_ENDPOINTS.RECOUNT(id),
      CycleCountMapper.toReasonedRequest(input),
    );
    return CycleCountMapper.toMutationResult(dto);
  }

  async postAdjustment(id: string, input: PostCycleCountAdjustmentInput): Promise<CycleCountAdjustmentResult> {
    const dto = await this.http.post<CycleCountAdjustmentResultDto>(
      CYCLE_COUNT_ENDPOINTS.ADJUSTMENT(id),
      CycleCountMapper.toAdjustmentRequest(input),
    );
    return CycleCountMapper.toAdjustmentResult(dto);
  }

  async unlock(id: string, input: CycleCountReasonedInput): Promise<CycleCountMutationResult> {
    const dto = await this.http.post<CycleCountMutationResultDto>(
      CYCLE_COUNT_ENDPOINTS.UNLOCK(id),
      CycleCountMapper.toReasonedRequest(input),
    );
    return CycleCountMapper.toMutationResult(dto);
  }
}
