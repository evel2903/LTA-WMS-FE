import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { OverrideLog } from '@modules/OverrideLog/Domain/Entities/OverrideLog';
import type { OverrideLogFilter } from '@modules/OverrideLog/Domain/Types/OverrideLogTypes';
import type { IOverrideLogRepository } from '@modules/OverrideLog/Application/Interfaces/IOverrideLogRepository';
import { OVERRIDE_LOG_ENDPOINTS } from '@modules/OverrideLog/Infrastructure/Api/OverrideLogEndpoints';
import type {
  OverrideLogDto,
  PagedDto,
} from '@modules/OverrideLog/Infrastructure/Dtos/OverrideLogDtos';
import { OverrideLogMapper } from '@modules/OverrideLog/Infrastructure/Mappers/OverrideLogMapper';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function isPositiveInteger(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function paging(filter: { page?: number; pageSize?: number } = {}) {
  const page = isPositiveInteger(filter.page) ? filter.page : 1;
  const pageSize = isPositiveInteger(filter.pageSize) ? filter.pageSize : DEFAULT_PAGE_SIZE;
  return {
    Page: page,
    PageSize: Math.min(pageSize, MAX_PAGE_SIZE),
  };
}

/** The single place that touches `httpClient` for the override log (read-only). */
export class OverrideLogRepository implements IOverrideLogRepository {
  constructor(private readonly http: HttpClient) {}

  async list(filter: OverrideLogFilter = {}): Promise<PaginatedResponse<OverrideLog>> {
    const dto = await this.http.get<PagedDto<OverrideLogDto>>(OVERRIDE_LOG_ENDPOINTS.OVERRIDES, {
      params: {
        ...paging(filter),
        RuleId: filter.ruleId,
        ActorUserId: filter.actorUserId,
        TargetObjectType: filter.targetObjectType,
        TargetObjectId: filter.targetObjectId,
        From: filter.from,
        To: filter.to,
      },
    });
    return OverrideLogMapper.toPaged(dto, (item) => OverrideLogMapper.toOverrideLog(item));
  }

  async getById(id: string): Promise<OverrideLog> {
    const dto = await this.http.get<OverrideLogDto>(OVERRIDE_LOG_ENDPOINTS.OVERRIDE_BY_ID(id));
    return OverrideLogMapper.toOverrideLog(dto);
  }
}
