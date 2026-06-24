import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { ReasonCode } from '@modules/ReasonCode/Domain/Entities/ReasonCode';
import type {
  CreateReasonCodeInput,
  ReasonCodeFilter,
  UpdateReasonCodeInput,
} from '@modules/ReasonCode/Domain/Types/ReasonCodeTypes';
import type { IReasonCodeRepository } from '@modules/ReasonCode/Application/Interfaces/IReasonCodeRepository';
import { REASON_CODE_ENDPOINTS } from '@modules/ReasonCode/Infrastructure/Api/ReasonCodeEndpoints';
import type { PagedDto, ReasonCodeDto } from '@modules/ReasonCode/Infrastructure/Dtos/ReasonCodeDtos';
import { ReasonCodeMapper } from '@modules/ReasonCode/Infrastructure/Mappers/ReasonCodeMapper';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function page(value?: number): number {
  return !value || value < 1 ? 1 : value;
}

function pageSize(value?: number): number {
  if (!value || value < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(value, MAX_PAGE_SIZE);
}

/** The single place that touches `httpClient` for the reason-code catalog. */
export class ReasonCodeRepository implements IReasonCodeRepository {
  constructor(private readonly http: HttpClient) {}

  async list(filter: ReasonCodeFilter = {}): Promise<PaginatedResponse<ReasonCode>> {
    const dto = await this.http.get<PagedDto<ReasonCodeDto>>(REASON_CODE_ENDPOINTS.REASON_CODES, {
      params: {
        Page: page(filter.page),
        PageSize: pageSize(filter.pageSize),
        ReasonGroup: filter.reasonGroup,
        Status: filter.status,
        Action: filter.action,
      },
    });
    return ReasonCodeMapper.toPaged(dto, (item) => ReasonCodeMapper.toReasonCode(item));
  }

  async getById(id: string): Promise<ReasonCode> {
    const dto = await this.http.get<ReasonCodeDto>(REASON_CODE_ENDPOINTS.REASON_CODE_BY_ID(id));
    return ReasonCodeMapper.toReasonCode(dto);
  }

  async create(input: CreateReasonCodeInput): Promise<ReasonCode> {
    const dto = await this.http.post<ReasonCodeDto>(
      REASON_CODE_ENDPOINTS.REASON_CODES,
      ReasonCodeMapper.toCreateRequest(input),
    );
    return ReasonCodeMapper.toReasonCode(dto);
  }

  async update(id: string, input: UpdateReasonCodeInput): Promise<ReasonCode> {
    const dto = await this.http.patch<ReasonCodeDto>(
      REASON_CODE_ENDPOINTS.REASON_CODE_BY_ID(id),
      ReasonCodeMapper.toUpdateRequest(input),
    );
    return ReasonCodeMapper.toReasonCode(dto);
  }
}
